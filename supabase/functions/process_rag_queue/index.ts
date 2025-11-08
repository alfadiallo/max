// @ts-ignore deno
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
// @ts-ignore deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
// @ts-ignore deno
import OpenAI from "https://esm.sh/openai@4.28.0";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const BATCH_SIZE = Number(Deno.env.get("RAG_WORKER_BATCH") ?? "5");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Supabase env vars missing. process_rag_queue will exit.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const startedAt = performance.now();
  const jobResults: any[] = [];

  const { data: jobs, error: fetchError } = await supabase
    .from("rag_ingestion_queue")
    .select("id, source_id, version_id, submitted_by, submitted_at")
    .eq("status", "queued")
    .order("submitted_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchError) {
    console.error("Failed to fetch queued jobs", fetchError);
    return new Response(JSON.stringify({ error: "Failed to load queued jobs", details: fetchError }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!jobs || jobs.length === 0) {
    return new Response(JSON.stringify({ ok: true, jobs_processed: 0 }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  for (const job of jobs) {
    const jobStart = performance.now();

    try {
      const { error: markProcessingError } = await supabase
        .from("rag_ingestion_queue")
        .update({ status: "processing", error_detail: null })
        .eq("id", job.id)
        .eq("status", "queued");

      if (markProcessingError) {
        console.error("Failed to mark job processing", job.id, markProcessingError);
        continue;
      }

      const { data: version, error: versionError } = await supabase
        .from("transcript_versions")
        .select("id, source_id, transcript_text, metadata_json, max_version_id")
        .eq("id", job.version_id)
        .maybeSingle();

      if (versionError || !version) {
        await supabase
          .from("rag_ingestion_queue")
          .update({ status: "error", error_detail: JSON.stringify(versionError ?? "Version not found") })
          .eq("id", job.id);
        continue;
      }

      const { data: segments, error: segmentError } = await supabase
        .from("transcript_segments")
        .select("id, sequence_number, start_time, end_time, text")
        .eq("version_id", version.id)
        .order("sequence_number", { ascending: true });

      if (segmentError || !segments || segments.length === 0) {
        await supabase
          .from("rag_ingestion_queue")
          .update({ status: "error", error_detail: JSON.stringify(segmentError ?? "No transcript segments") })
          .eq("id", job.id);
        continue;
      }

      let embeddings: number[][] = []
      let embeddingModel = null
      if (openai) {
        try {
          const embeddingResponse = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: segments.map((segment) => segment.text),
          });
          embeddings = embeddingResponse.data.map((item) => item.embedding as number[]);
          embeddingModel = embeddingResponse.model ?? "text-embedding-3-small";
        } catch (embeddingError) {
          console.error("process_rag_queue: embedding generation failed", embeddingError);
          embeddings = [];
        }
      } else {
        console.warn("process_rag_queue: OPENAI_API_KEY missing, skipping embedding generation");
      }

      await supabase
        .from("content_segments")
        .delete()
        .eq("version_id", version.id);

      const contentRows = segments.map((segment, idx) => ({
        source_id: version.source_id,
        version_id: version.id,
        segment_text: segment.text,
        sequence_number: segment.sequence_number,
        start_timestamp: segment.start_time,
        end_timestamp: segment.end_time,
        embedding: embeddings[idx] ?? null,
        metadata: {
          transcript_version_id: version.id,
          transcript_segment_id: segment.id,
        },
      }));

      const { error: contentError } = await supabase
        .from("content_segments")
        .insert(contentRows);

      if (contentError) {
        await supabase
          .from("rag_ingestion_queue")
          .update({ status: "error", error_detail: JSON.stringify(contentError) })
          .eq("id", job.id);
        continue;
      }

      // The insert needs segment IDs. Fetch inserted rows to align IDs.
      const { data: insertedSegments, error: fetchInsertedError } = await supabase
        .from("content_segments")
        .select("id, sequence_number")
        .eq("version_id", version.id)
        .order("sequence_number", { ascending: true });

      if (fetchInsertedError || !insertedSegments) {
        await supabase
          .from("rag_ingestion_queue")
          .update({ status: "error", error_detail: JSON.stringify(fetchInsertedError ?? "No inserted segments") })
          .eq("id", job.id);
        continue;
      }

      const relevancePayload = insertedSegments.map((segment, idx) => ({
        segment_id: segment.id,
        relevance_dentist: 0,
        relevance_dental_assistant: 0,
        relevance_hygienist: 0,
        relevance_treatment_coordinator: 0,
        relevance_align_rep: 0,
        content_type: null,
        clinical_complexity: null,
        primary_focus: null,
        topics: [],
        confidence_score: null,
      }));

      await supabase
        .from("segment_relevance")
        .upsert(relevancePayload, { onConflict: "segment_id" });

      await supabase
        .from("content_sources")
        .update({
          rag_processed_version_id: version.max_version_id ?? job.version_id,
          transcription_status: "ingested",
        })
        .eq("id", version.source_id);

      const resultSummary = {
        segments_processed: insertedSegments.length,
        entities_created: 0,
        relationships_created: 0,
        duration_ms: Math.round(performance.now() - jobStart),
        max_version_id: version.max_version_id,
        embedding_model: embeddingModel,
        notes: "Placeholder pipeline executed. TODO: integrate Claude/Gemini + KG generation.",
      };

      await supabase
        .from("rag_ingestion_queue")
        .update({
          status: "complete",
          processed_at: new Date().toISOString(),
          result_summary: resultSummary,
        })
        .eq("id", job.id);

      jobResults.push({ job_id: job.id, segments: insertedSegments.length });
    } catch (error) {
      console.error("process_rag_queue: job failed", job.id, error);
      await supabase
        .from("rag_ingestion_queue")
        .update({ status: "error", error_detail: JSON.stringify(error) })
        .eq("id", job.id);
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      jobs_processed: jobResults.length,
      summary: jobResults,
      duration_ms: Math.round(performance.now() - startedAt),
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
