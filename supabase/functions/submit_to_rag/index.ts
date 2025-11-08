// submit_to_rag/index.ts
// Supabase Edge Function skeleton for pushing a verified transcript into the RAG ingestion queue.

// @ts-ignore deno import
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
// @ts-ignore deno import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Declare Deno global for TypeScript
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("Supabase env vars are not configured. submit_to_rag will fail until they are set.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

interface SubmitPayload {
  sourceId?: string | null;
  sourceTitle?: string | null;
  versionLabel: string;
  transcriptText: string;
  metadata?: Record<string, unknown>;
  sourceMetadata?: Record<string, unknown>;
  reviewerId: string;
}

interface ErrorResponse {
  error: string;
  details?: unknown;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" } satisfies ErrorResponse), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: SubmitPayload;
  try {
    payload = await req.json();
  } catch (error) {
    return new Response(JSON.stringify({ error: "Invalid JSON", details: error } satisfies ErrorResponse), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const {
    sourceId,
    sourceTitle,
    versionLabel,
    transcriptText,
    metadata = {},
    sourceMetadata = {},
    reviewerId,
  } = payload;

  if (!versionLabel || !transcriptText || !reviewerId) {
    return new Response(
      JSON.stringify({ error: "Missing required fields (versionLabel, transcriptText, reviewerId)" } satisfies ErrorResponse),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const client = supabase;
  const db = client;

  if (sourceId) {
    const { data: existingSource, error: fetchSourceError } = await db
      .from("content_sources")
      .select("id, transcription_status")
      .eq("id", sourceId)
      .maybeSingle();

    if (fetchSourceError) {
      console.error("Failed to verify existing content source", fetchSourceError);
      return new Response(JSON.stringify({ error: "Unable to verify content source", details: fetchSourceError } satisfies ErrorResponse), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (existingSource && existingSource.transcription_status !== "human_verified" && existingSource.transcription_status !== "queued_for_rag") {
      return new Response(JSON.stringify({ error: "Source must be human_verified before submitting to RAG" } satisfies ErrorResponse), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const now = new Date().toISOString();
  const { data: version, error: versionInsertError } = await db
    .rpc("rag_submit_transcript", {
      p_source_id: sourceId ?? null,
      p_source_title: sourceTitle ?? null,
      p_version_label: versionLabel,
      p_transcript_text: transcriptText,
      p_metadata: metadata,
      p_source_metadata: sourceMetadata,
      p_submitter_id: reviewerId,
      p_submitted_at: now,
    });

  if (versionInsertError) {
    console.error("rag_submit_transcript failed", versionInsertError);
    return new Response(JSON.stringify({ error: "Failed to submit transcript to RAG", details: versionInsertError } satisfies ErrorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, version }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

