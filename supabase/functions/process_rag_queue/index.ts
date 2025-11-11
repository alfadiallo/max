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
const BATCH_SIZE = Number(Deno.env.get("RAG_WORKER_BATCH") ?? "1");
const SEGMENTS_PER_RUN = Number(Deno.env.get("RAG_SEGMENTS_PER_RUN") ?? "10");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const OPENAI_EMBEDDING_MODEL = Deno.env.get("RAG_EMBEDDING_MODEL") ?? "text-embedding-3-small";
const EMBEDDING_CHUNK_CHAR_LIMIT = Number(Deno.env.get("RAG_EMBEDDING_CHAR_LIMIT") ?? "3200");
const EMBEDDING_BATCH_SIZE = Number(Deno.env.get("RAG_EMBEDDING_BATCH") ?? "16");
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const FALLBACK_ANTHROPIC_MODELS = [
  "claude-3-5-sonnet-20241022",
  "claude-3-5-sonnet-20240620",
  "claude-3-opus-20240229",
  "claude-3-5-sonnet-20241005",
  "claude-3-haiku-20240307",
];
const ANTHROPIC_MODEL = Deno.env.get("RAG_CLAUDE_MODEL") ?? FALLBACK_ANTHROPIC_MODELS[0];
const CLAUDE_CONCURRENCY = Number(Deno.env.get("RAG_CLAUDE_CONCURRENCY") ?? "3");
const ENABLE_CLAUDE_ANALYSIS = Deno.env.get("RAG_ENABLE_CLAUDE_ANALYSIS") === "true";
const SLACK_WEBHOOK_URL = Deno.env.get("SLACK_WEBHOOK_URL") ?? "";
const QUEUE_ALERT_THRESHOLD = Number(Deno.env.get("RAG_ALERT_QUEUE_THRESHOLD") ?? "25");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Supabase env vars missing. process_rag_queue will exit.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;
const anthropicEnabled = Boolean(ANTHROPIC_API_KEY) && ENABLE_CLAUDE_ANALYSIS;
console.log("process_rag_queue: configuration", {
  anthropicEnabled: anthropicEnabled ? "enabled" : "disabled",
  claudeAnalysis: ENABLE_CLAUDE_ANALYSIS ? "enabled" : "disabled (fast mode)",
  segmentsPerRun: SEGMENTS_PER_RUN,
  embeddingCharLimit: EMBEDDING_CHUNK_CHAR_LIMIT,
});

type RawSegment = {
  id?: string | null;
  sequence_number: number;
  start_time?: string | null;
  end_time?: string | null;
  text: string;
};

type QueueJob = {
  id: string;
  source_id: string | null;
  version_id: string;
  submitted_by: string | null;
  submitted_at: string;
  status: string;
  result_summary: Record<string, unknown> | null;
};

function chunkTextForEmbedding(text: string, limit = EMBEDDING_CHUNK_CHAR_LIMIT): string[] {
  const cleaned = text?.trim();
  if (!cleaned) return [];
  if (cleaned.length <= limit) return [cleaned];

  const chunks: string[] = [];
  let remaining = cleaned;

  while (remaining.length > limit) {
    let cutIndex = remaining.lastIndexOf(" ", limit);
    if (cutIndex < limit * 0.6) {
      cutIndex = limit;
    }
    const chunk = remaining.slice(0, cutIndex).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    remaining = remaining.slice(cutIndex).trim();
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }

  return chunks;
}

function findChunkBreak(text: string, limit: number): number {
  if (text.length <= limit) return text.length;
  const slice = text.slice(0, limit + 1);
  const lastWhitespace = slice.lastIndexOf(" ");
  const lastPunctuation = Math.max(slice.lastIndexOf("."), slice.lastIndexOf("!"), slice.lastIndexOf("?"));
  const breakIndex = Math.max(lastWhitespace, lastPunctuation);
  if (breakIndex >= limit * 0.6) {
    return breakIndex + 1;
  }
  return limit;
}

const MAX_CHUNK_CHARS = 1200;
const MIN_CHUNK_CHARS = 600;

function chunkTranscriptText(
  text: string,
  maxChars = MAX_CHUNK_CHARS,
  minChars = MIN_CHUNK_CHARS,
): RawSegment[] {
  const cleaned = text?.trim();
  if (!cleaned) return [];

  const paragraphs = cleaned.split(/\n+/).map((para) => para.trim()).filter(Boolean);
  const units = paragraphs.length > 0 ? paragraphs : [cleaned];

  const chunks: string[] = [];
  let buffer = "";

  for (const unit of units) {
    let remaining = unit;

    if (remaining.length > maxChars) {
      while (remaining.length > maxChars) {
        const breakpoint = findChunkBreak(remaining, maxChars);
        const chunk = remaining.slice(0, breakpoint).trim();
        if (chunk.length > 0) {
          if (buffer.length > 0) {
            chunks.push(buffer);
            buffer = "";
          }
          chunks.push(chunk);
        }
        remaining = remaining.slice(breakpoint).trimStart();
      }
    }

    if (!remaining.length) continue;

    if (!buffer.length) {
      buffer = remaining;
    } else if ((buffer + "\n\n" + remaining).length <= maxChars || (buffer.length < minChars && remaining.length < minChars)) {
      buffer = buffer + "\n\n" + remaining;
    } else {
      chunks.push(buffer);
      buffer = remaining;
    }
  }

  if (buffer.length > 0) {
    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    chunks.push(cleaned);
  }

  return chunks.map((chunk, index) => ({
    sequence_number: index + 1,
    text: chunk.trim(),
  }));
}

function normalizeSegments(existing: RawSegment[], transcriptText: string): RawSegment[] {
  if (!existing || existing.length === 0) {
    return chunkTranscriptText(transcriptText);
  }

  const needsChunking =
    existing.length === 1 &&
    (!existing[0]?.text || existing[0].text.length > MAX_CHUNK_CHARS);

  if (!needsChunking) {
    return existing.map((segment, index) => ({
      id: segment.id ?? null,
      sequence_number: segment.sequence_number ?? index + 1,
      start_time: segment.start_time ?? null,
      end_time: segment.end_time ?? null,
      text: segment.text ?? "",
    }));
  }

  const sourceText = existing[0]?.text?.trim() || transcriptText;
  return chunkTranscriptText(sourceText).map((chunk, index) => ({
    sequence_number: index + 1,
    text: chunk.text,
  }));
}

function averageVectors(vectors: number[][]): number[] | null {
  if (!vectors || vectors.length === 0) return null;
  const length = vectors[0]?.length ?? 0;
  if (length === 0) return null;

  const totals = new Array<number>(length).fill(0);
  for (const vector of vectors) {
    if (!vector || vector.length !== length) {
      return null;
    }
    for (let i = 0; i < length; i += 1) {
      totals[i] += vector[i] ?? 0;
    }
  }
  const divisor = vectors.length;
  return totals.map((value) => value / divisor);
}

type RelevanceScores = {
  dentist?: number | null;
  dental_assistant?: number | null;
  hygienist?: number | null;
  treatment_coordinator?: number | null;
  align_rep?: number | null;
};

type EntityDescriptor = {
  canonical_name: string;
  entity_type: string;
  aliases?: string[];
  definition?: string | null;
  mention_type?: string | null;
  relevance_score?: number | null;
  confidence?: number | null;
};

type RelationshipDescriptor = {
  source: { canonical_name: string; entity_type: string };
  target: { canonical_name: string; entity_type: string };
  relationship_type: string;
  strength?: number | null;
  confidence?: number | null;
  context?: string | null;
};

type SegmentAnalysis = {
  relevance: RelevanceScores;
  content_type?: string | null;
  clinical_complexity?: string | null;
  primary_focus?: string | null;
  topics?: string[];
  confidence_score?: number | null;
  entities?: EntityDescriptor[];
  relationships?: RelationshipDescriptor[];
};

type SegmentAnalysisWithModel = SegmentAnalysis & { _modelId?: string | null };

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  handler: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results: R[] = new Array(items.length);
  let cursor = 0;

  const worker = async () => {
    while (true) {
      const current = cursor;
      if (current >= items.length) break;
      cursor += 1;
      results[current] = await handler(items[current], current);
    }
  };

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
async function sendSlackAlert(message: string, details?: Record<string, unknown>) {
  if (!SLACK_WEBHOOK_URL) return;
  try {
    const payload: Record<string, unknown> = { text: message };
    if (details) {
      payload.blocks = [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: message,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "```" + JSON.stringify(details, null, 2) + "```",
          },
        },
      ];
    }
    await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Failed to send Slack alert", error);
  }
}

async function callClaudeModel(model: string, prompt: string) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 800,
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });
  return response;
}

type AnthropicModelDescriptor = {
  id: string;
  display_name?: string;
  type?: string;
};

let cachedAnthropicModels: AnthropicModelDescriptor[] | null = null;

async function listAvailableAnthropicModels(): Promise<AnthropicModelDescriptor[]> {
  if (!anthropicEnabled) return [];
  if (cachedAnthropicModels) return cachedAnthropicModels;

  try {
    const response = await fetch("https://api.anthropic.com/v1/models", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn("Failed to list Anthropic models", errorText);
      return [];
    }

    const json = await response.json();
    const models = Array.isArray(json?.data) ? (json.data as AnthropicModelDescriptor[]) : [];
    cachedAnthropicModels = models;
    console.log("Available Anthropic models", models.map((model) => model.id));
    return models;
  } catch (error) {
    console.warn("Error fetching Anthropic models", error);
    return [];
  }
}

async function analyzeSegmentWithClaude(segmentText: string, metadata: { sequence: number; total: number; projectName?: string | null; audioName?: string | null }): Promise<SegmentAnalysisWithModel | null> {
  if (!anthropicEnabled) return null;

  const prompt = `
You support a dental education retrieval system. Analyze the given transcript segment and respond with strict JSON.

Return an object with:
- relevance: scores 0-100 for dentist, dental_assistant, hygienist, treatment_coordinator, align_rep.
- content_type: one of ["procedure","philosophy","case_study","troubleshooting","patient_communication","team_coordination","other"].
- clinical_complexity: one of ["beginner","intermediate","advanced"].
- primary_focus: short phrase for main topic.
- topics: array of 2-5 keywords.
- confidence_score: 0-1 numeric value.
- entities: array of objects {canonical_name, entity_type, aliases[], definition, mention_type, relevance_score, confidence}. Use entity_type from [procedure, concept, anatomy, material, tool, key_elements_term].
- relationships: array of objects {source:{canonical_name,entity_type}, target:{canonical_name,entity_type}, relationship_type, strength, confidence, context}. relationship_type from [PREREQUISITE_OF, RELATED_TO, USED_IN, PART_OF, AFFECTS, CONTRASTS_WITH, DEMONSTRATES, EXPLAINS].

If data is unavailable return empty arrays and nulls. Do not include commentary.

Segment (sequence ${metadata.sequence}/${metadata.total}):
"""${segmentText}"""
`;

  try {
    const availableModels = await listAvailableAnthropicModels();
    const availableModelIds = new Set(availableModels.map((model) => model.id));
    const desiredOrder = Array.from(new Set([ANTHROPIC_MODEL, ...FALLBACK_ANTHROPIC_MODELS]));
    const modelsToTry =
      availableModelIds.size > 0
        ? desiredOrder.filter((model) => availableModelIds.has(model)).concat(
            desiredOrder.some((model) => availableModelIds.has(model))
              ? []
              : Array.from(availableModelIds),
          )
        : desiredOrder;
    let lastError: any = null;
    for (const model of modelsToTry) {
      const response = await callClaudeModel(model, prompt);

      if (!response.ok) {
        const errorText = await response.text();
        lastError = { status: response.status, payload: errorText };
        console.error("Claude API error", errorText);

        const notFound = response.status === 404 || /not_found_error/i.test(errorText);
        if (notFound) {
          console.warn(`Claude model ${model} not found. Trying fallback if available.`);
          continue;
        }

        await sendSlackAlert(":warning: RAG worker failed to call Claude", {
          status: response.status,
          payload: errorText,
        });
        return null;
      }

      const json = await response.json();
      const text = json?.content?.[0]?.text ?? "";
      if (!text) return null;
      const cleaned = text.trim().replace(/^```json/i, "").replace(/```$/, "").trim();

      let parsed: any;
      try {
        parsed = JSON.parse(cleaned);
      } catch (parseError) {
        const preview = cleaned.slice(0, 500);
        console.error("Claude analysis JSON parse failed", {
          model,
          preview,
          error: formatErrorDetail(parseError),
        });
        await sendSlackAlert(":warning: Claude returned unparsable JSON", {
          model,
          error: formatErrorDetail(parseError),
          preview,
        });
        return null;
      }

      const analysis: SegmentAnalysisWithModel = {
        relevance: {
          dentist: parsed?.relevance?.dentist ?? null,
          dental_assistant: parsed?.relevance?.dental_assistant ?? null,
          hygienist: parsed?.relevance?.hygienist ?? null,
          treatment_coordinator: parsed?.relevance?.treatment_coordinator ?? null,
          align_rep: parsed?.relevance?.align_rep ?? null,
        },
        content_type: parsed?.content_type ?? null,
        clinical_complexity: parsed?.clinical_complexity ?? null,
        primary_focus: parsed?.primary_focus ?? null,
        topics: Array.isArray(parsed?.topics) ? parsed.topics : [],
        confidence_score: parsed?.confidence_score ?? null,
        entities: Array.isArray(parsed?.entities) ? parsed.entities : [],
        relationships: Array.isArray(parsed?.relationships) ? parsed.relationships : [],
        _modelId: model,
      };

      console.log("Claude analysis result", { model, analysis });
      return analysis;
    }

    if (lastError) {
      await sendSlackAlert(":warning: RAG worker failed to call Claude", lastError);
    }
    return null;
  } catch (error) {
    console.error("Failed to analyze segment with Claude", error);
    await sendSlackAlert(":warning: Claude analysis failed for a segment", {
      error: formatErrorDetail(error),
    });
    return null;
  }
}

function normalizeScore(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(100, value));
  }
  return null;
}

function normalizeTopics(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item.length > 0)
      .slice(0, 8);
  }
  return [];
}

function formatErrorDetail(error: unknown): string | null {
  if (!error) return null;
  if (typeof error === "string") return error;
  if (error instanceof Error) {
    return JSON.stringify({
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
  }
  if (typeof error === "object") {
    const errObj = error as Record<string, unknown>;
    const payload = {
      message: (errObj.message ?? errObj.error ?? "Unknown error") as string,
      details: errObj.details ?? null,
      hint: errObj.hint ?? null,
      code: errObj.code ?? errObj.status ?? null,
    };
    return JSON.stringify(payload);
  }
  return String(error);
}

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

  const invocationStartedAt = performance.now();
  const jobResults: any[] = [];

  const { count: queuedCount } = await supabase
    .from("rag_ingestion_queue")
    .select("*", { count: "exact", head: true })
    .eq("status", "queued");

  if ((queuedCount ?? 0) > QUEUE_ALERT_THRESHOLD) {
    await sendSlackAlert(":warning: RAG queue backlog warning", {
      queued: queuedCount,
      threshold: QUEUE_ALERT_THRESHOLD,
    });
  }

  const jobs: QueueJob[] = [];

  const { data: resumeJobs, error: resumeError } = await supabase
    .from("rag_ingestion_queue")
    .select("id, source_id, version_id, submitted_by, submitted_at, status, result_summary")
    .eq("status", "processing")
    .or("result_summary->progress->>needs_resume.eq.true,result_summary.is.null")
    .order("submitted_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (resumeError) {
    console.error("Failed to fetch in-progress jobs needing resume", resumeError);
    return new Response(JSON.stringify({ error: "Failed to load resume jobs", details: resumeError }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (resumeJobs && resumeJobs.length > 0) {
    jobs.push(...resumeJobs);
  }

  if (jobs.length < BATCH_SIZE) {
    const remaining = BATCH_SIZE - jobs.length;
    const { data: queuedJobs, error: queuedError } = await supabase
      .from("rag_ingestion_queue")
      .select("id, source_id, version_id, submitted_by, submitted_at, status, result_summary")
      .eq("status", "queued")
      .order("submitted_at", { ascending: true })
      .limit(remaining);

    if (queuedError) {
      console.error("Failed to fetch queued jobs", queuedError);
      return new Response(JSON.stringify({ error: "Failed to load queued jobs", details: queuedError }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (queuedJobs && queuedJobs.length > 0) {
      jobs.push(...queuedJobs);
    }
  }

  if (jobs.length === 0) {
    return new Response(JSON.stringify({ ok: true, jobs_processed: 0 }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const entityCache = new Map<string, string>();

  for (const job of jobs) {
    const jobStart = performance.now();

    try {
      console.log("process_rag_queue: picked job", {
        jobId: job.id,
        sourceId: job.source_id,
        versionId: job.version_id,
      });

      let summaryRecord: Record<string, any> =
        job.result_summary && typeof job.result_summary === "object" ? (job.result_summary as Record<string, any>) : {};
      let progressState: Record<string, any> =
        summaryRecord.progress && typeof summaryRecord.progress === "object" ? (summaryRecord.progress as Record<string, any>) : {};

      if (progressState.needs_resume) {
        progressState = { ...progressState, needs_resume: false };
        summaryRecord = { ...summaryRecord, progress: progressState };
      }

      const statusFilter = job.status === "processing" ? "processing" : "queued";
      const updatePayload: Record<string, unknown> = {
        status: "processing",
        error_detail: null,
      };
      if (Object.keys(summaryRecord).length > 0) {
        updatePayload.result_summary = summaryRecord;
      }

      const { error: markProcessingError } = await supabase
        .from("rag_ingestion_queue")
        .update(updatePayload)
        .eq("id", job.id)
        .eq("status", statusFilter);

      if (markProcessingError) {
        console.error("Failed to mark job processing", job.id, markProcessingError);
        continue;
      }

      const { data: version, error: versionError } = await supabase
        .from("transcript_versions")
        .select("id, source_id, transcript_text, metadata_json")
        .eq("id", job.version_id)
        .maybeSingle();

      if (versionError || !version) {
        await supabase
          .from("rag_ingestion_queue")
          .update({ status: "error", error_detail: formatErrorDetail(versionError ?? "Version not found") })
          .eq("id", job.id);
        continue;
      }

      const { data: segments, error: segmentError } = await supabase
        .from("transcript_segments")
        .select("id, sequence_number, start_time, end_time, text")
        .eq("version_id", version.id)
        .order("sequence_number", { ascending: true });
      console.log("process_rag_queue: fetched segments", {
        jobId: job.id,
        segmentCount: segments.length,
      });

      const normalizedSegments = normalizeSegments(
        (segmentError || !segments ? [] : segments) as RawSegment[],
        version.transcript_text ?? "",
      );

      if (!normalizedSegments || normalizedSegments.length === 0) {
        await supabase
          .from("rag_ingestion_queue")
          .update({ status: "error", error_detail: "No transcript content available for processing" })
          .eq("id", job.id);
        continue;
      }

      const totalSegments = normalizedSegments.length;
      const originalCharCount = (version.transcript_text ?? "").length;
      let chunkCharCount = normalizedSegments.reduce((total, seg) => total + (seg.text?.length ?? 0), 0);
      let chunkCharDiff = originalCharCount - chunkCharCount;

      let lastSequenceProcessed = Number(progressState.last_sequence_processed ?? 0);
      if (!Number.isFinite(lastSequenceProcessed) || lastSequenceProcessed < 0) lastSequenceProcessed = 0;

      let totalSegmentsProcessed = Number(progressState.segments_processed ?? 0);
      if (!Number.isFinite(totalSegmentsProcessed) || totalSegmentsProcessed < 0) totalSegmentsProcessed = 0;

      let totalEntitiesLinked = Number(progressState.entities_linked ?? 0);
      if (!Number.isFinite(totalEntitiesLinked) || totalEntitiesLinked < 0) totalEntitiesLinked = 0;

      let totalRelationshipsLinked = Number(progressState.relationships_linked ?? 0);
      if (!Number.isFinite(totalRelationshipsLinked) || totalRelationshipsLinked < 0) totalRelationshipsLinked = 0;

      let totalDurationMs = Number(progressState.total_duration_ms ?? 0);
      if (!Number.isFinite(totalDurationMs) || totalDurationMs < 0) totalDurationMs = 0;

      let embeddingsInserted = Boolean(progressState.embeddings_inserted ?? false);
      let embeddingsCreated = Number(progressState.embeddings_created ?? 0);
      if (!Number.isFinite(embeddingsCreated) || embeddingsCreated < 0) embeddingsCreated = 0;

      let embeddingChunksGenerated = Number(progressState.embedding_chunks ?? 0);
      if (!Number.isFinite(embeddingChunksGenerated) || embeddingChunksGenerated < 0) embeddingChunksGenerated = 0;

      let embeddingModel: string | null = (progressState.embedding_model ?? null) as string | null;

      if (progressState.chunk_char_count) {
        chunkCharCount = Number(progressState.chunk_char_count);
        const storedOriginal = Number(progressState.original_char_count ?? originalCharCount);
        chunkCharDiff = storedOriginal - chunkCharCount;
      }

      const claudeModels = new Set<string>(
        Array.isArray(summaryRecord.claude_models)
          ? (summaryRecord.claude_models as string[])
          : Array.isArray(progressState.claude_models)
            ? (progressState.claude_models as string[])
            : [],
      );

      const segmentBatchLimit = Math.max(1, SEGMENTS_PER_RUN);

      // Check if we already have content_segments (embeddings already generated)
      const { data: existingSegments, error: existingCheckError } = await supabase
        .from("content_segments")
        .select("id, sequence_number")
        .eq("version_id", version.id)
        .order("sequence_number", { ascending: true });

      if (existingCheckError) {
        console.error("process_rag_queue: failed to check existing segments", existingCheckError);
        await supabase
          .from("rag_ingestion_queue")
          .update({ status: "error", error_detail: formatErrorDetail(existingCheckError) })
          .eq("id", job.id);
        continue;
      }

      const hasExistingSegments = existingSegments && existingSegments.length > 0;

      if (!hasExistingSegments && openai) {
        // Generate embeddings for segments we haven't processed yet
        const segmentsToEmbed = normalizedSegments.filter(seg => seg.sequence_number > lastSequenceProcessed).slice(0, segmentBatchLimit);
        
        console.log("process_rag_queue: generating embeddings for batch", {
          jobId: job.id,
          versionId: version.id,
          batchSize: segmentsToEmbed.length,
          lastSequenceProcessed,
        });

        for (const segment of segmentsToEmbed) {
          const chunks = chunkTextForEmbedding(segment.text);
          if (chunks.length === 0) {
            console.warn("process_rag_queue: segment produced no chunks for embedding", {
              versionId: version.id,
              sequence: segment.sequence_number,
            });
            continue;
          }

          const chunkVectors: number[][] = [];
          try {
            for (let start = 0; start < chunks.length; start += EMBEDDING_BATCH_SIZE) {
              const batch = chunks.slice(start, start + EMBEDDING_BATCH_SIZE);
              const response = await openai.embeddings.create({
                model: OPENAI_EMBEDDING_MODEL,
                input: batch,
              });
              embeddingModel = response.model ?? OPENAI_EMBEDDING_MODEL;
              response.data.forEach((item) => {
                embeddingChunksGenerated += 1;
                chunkVectors.push(item.embedding as number[]);
              });
            }
          } catch (embeddingError) {
            console.error("process_rag_queue: embedding generation failed", {
              versionId: version.id,
              sequence: segment.sequence_number,
              error: embeddingError,
            });
            await sendSlackAlert(":warning: RAG embedding generation failed", {
              version_id: version.id,
              segment_sequence: segment.sequence_number,
              error: formatErrorDetail(embeddingError),
            });
            continue;
          }

          const averaged = averageVectors(chunkVectors);
          if (!averaged) {
            console.warn("process_rag_queue: failed to average embedding vectors", {
              versionId: version.id,
              sequence: segment.sequence_number,
            });
            continue;
          }

          // Insert this segment immediately
          const { error: insertError } = await supabase
            .from("content_segments")
            .insert({
              source_id: version.source_id,
              version_id: version.id,
              segment_text: segment.text,
              sequence_number: segment.sequence_number,
              start_timestamp: segment.start_time ?? null,
              end_timestamp: segment.end_time ?? null,
              embedding: averaged,
              metadata: {
                transcript_version_id: version.id,
                transcript_segment_id: segment.id ?? null,
              },
            });

          if (insertError) {
            console.error("process_rag_queue: failed to insert segment", {
              versionId: version.id,
              sequence: segment.sequence_number,
              error: insertError,
            });
            await sendSlackAlert(":warning: RAG segment insert failed", {
              version_id: version.id,
              segment_sequence: segment.sequence_number,
              error: formatErrorDetail(insertError),
            });
            continue;
          }

          embeddingsCreated += 1;
          lastSequenceProcessed = segment.sequence_number;
          totalSegmentsProcessed += 1;

          console.log("process_rag_queue: segment embedded and inserted", {
            jobId: job.id,
            sequence: segment.sequence_number,
            progress: `${totalSegmentsProcessed}/${totalSegments}`,
          });
        }

        embeddingsInserted = totalSegmentsProcessed >= totalSegments;
        chunkCharDiff = originalCharCount - chunkCharCount;

        console.log("process_rag_queue: embedding batch complete", {
          jobId: job.id,
          versionId: version.id,
          embeddingsCreated,
          embeddingChunksGenerated,
          lastSequenceProcessed,
          totalSegmentsProcessed,
          totalSegments,
        });
      } else if (hasExistingSegments) {
        console.log("process_rag_queue: embeddings already present, skipping regeneration", {
          jobId: job.id,
          versionId: version.id,
          existingCount: existingSegments.length,
        });
        embeddingsInserted = true;
        embeddingsCreated = existingSegments.length;
      } else if (!openai) {
        console.warn("process_rag_queue: OPENAI_API_KEY missing, skipping embedding generation");
      }

      const { data: insertedSegments, error: fetchInsertedError } = await supabase
        .from("content_segments")
        .select("id, sequence_number")
        .eq("version_id", version.id)
        .order("sequence_number", { ascending: true });

      if (fetchInsertedError || !insertedSegments) {
        await supabase
          .from("rag_ingestion_queue")
          .update({ status: "error", error_detail: formatErrorDetail(fetchInsertedError ?? "No inserted segments") })
          .eq("id", job.id);
        continue;
      }

      const normalizedBySequence = new Map<number, RawSegment>();
      normalizedSegments.forEach((segment) => normalizedBySequence.set(segment.sequence_number, segment));

      const segmentsToProcess = insertedSegments
        .filter((seg) => seg.sequence_number > lastSequenceProcessed)
        .sort((a, b) => a.sequence_number - b.sequence_number)
        .slice(0, segmentBatchLimit);

      console.log("process_rag_queue: batch planning", {
        jobId: job.id,
        versionId: version.id,
        lastSequenceProcessed,
        totalSegments,
        batchSize: segmentsToProcess.length,
        segmentBatchLimit,
      });

      let segmentsProcessedThisRun = segmentsToProcess.length;
      let runEntitiesLinked = 0;
      let runRelationshipsLinked = 0;

      if (segmentsProcessedThisRun > 0 && anthropicEnabled) {
        console.log("process_rag_queue: starting Claude analysis for batch", {
          jobId: job.id,
          batchSize: segmentsToProcess.length,
        });

        const claudeSummaries = await mapWithConcurrency(segmentsToProcess, CLAUDE_CONCURRENCY, async (inserted) => {
          const segment = normalizedBySequence.get(inserted.sequence_number);
          if (!segment) {
            console.warn("process_rag_queue: missing segment text", inserted);
            return { entitiesLinked: 0, relationshipsLinked: 0 };
          }

          let analysis: SegmentAnalysisWithModel | null = null;
          analysis = await analyzeSegmentWithClaude(segment.text, {
            sequence: segment.sequence_number,
            total: totalSegments,
            projectName: version.metadata_json?.project_name ?? null,
            audioName: version.metadata_json?.audio_file_name ?? null,
          });
          console.log("process_rag_queue: claude analysis", {
            jobId: job.id,
            sequence: segment.sequence_number,
            analysis,
          });

          const relevance = analysis?.relevance ?? {};

          await supabase
            .from("segment_relevance")
            .upsert(
              {
                segment_id: inserted.id,
                relevance_dentist: normalizeScore(relevance.dentist),
                relevance_dental_assistant: normalizeScore(relevance.dental_assistant),
                relevance_hygienist: normalizeScore(relevance.hygienist),
                relevance_treatment_coordinator: normalizeScore(relevance.treatment_coordinator),
                relevance_align_rep: normalizeScore(relevance.align_rep),
                content_type: analysis?.content_type ?? null,
                clinical_complexity: analysis?.clinical_complexity ?? null,
                primary_focus: analysis?.primary_focus ?? null,
                topics: normalizeTopics(analysis?.topics),
                confidence_score: analysis?.confidence_score ?? null,
              },
              { onConflict: "segment_id" },
            );

          let localEntitiesLinked = 0;
          let localRelationshipsLinked = 0;

          if (analysis?.entities && analysis.entities.length > 0) {
            for (const entity of analysis.entities) {
              if (!entity.canonical_name || !entity.entity_type) continue;
              const key = `${entity.entity_type.toLowerCase()}::${entity.canonical_name.toLowerCase()}`;

              let entityId = entityCache.get(key) ?? null;
              if (!entityId) {
                const { data: entityRow, error: entityError } = await supabase
                  .from("kg_entities")
                  .upsert(
                    {
                      entity_type: entity.entity_type,
                      canonical_name: entity.canonical_name,
                      aliases: Array.isArray(entity.aliases) ? entity.aliases : [],
                      definition: entity.definition ?? null,
                      metadata: {
                        source: "process_rag_queue",
                      },
                    },
                    { onConflict: "entity_type,canonical_name" },
                  )
                  .select("id")
                  .maybeSingle();

                if (entityError) {
                  console.error("Failed to upsert entity", entityError);
                  continue;
                }
                entityId = entityRow?.id ?? null;
                if (entityId) {
                  entityCache.set(key, entityId);
                }
              }

              if (!entityId) continue;

              const { error: segmentEntityError } = await supabase
                .from("segment_entities")
                .upsert(
                  {
                    segment_id: inserted.id,
                    entity_id: entityId,
                    mention_type: entity.mention_type ?? null,
                    relevance_score: typeof entity.relevance_score === "number" ? entity.relevance_score : null,
                    extraction_confidence: typeof entity.confidence === "number" ? entity.confidence : null,
                  },
                  { onConflict: "segment_id,entity_id" },
                );

              if (segmentEntityError) {
                console.error("Failed to link segment entity", segmentEntityError);
              } else {
                localEntitiesLinked += 1;
              }
            }
          }

          if (analysis?.relationships && analysis.relationships.length > 0) {
            for (const rel of analysis.relationships) {
              if (!rel.source?.canonical_name || !rel.target?.canonical_name) continue;
              const sourceKey = `${rel.source.entity_type.toLowerCase()}::${rel.source.canonical_name.toLowerCase()}`;
              const targetKey = `${rel.target.entity_type.toLowerCase()}::${rel.target.canonical_name.toLowerCase()}`;

              const sourceId = entityCache.get(sourceKey);
              const targetId = entityCache.get(targetKey);
              if (!sourceId || !targetId) continue;

              const { error: relationshipError } = await supabase
                .from("kg_relationships")
                .upsert(
                  {
                    source_entity_id: sourceId,
                    target_entity_id: targetId,
                    relationship_type: rel.relationship_type ?? "RELATED_TO",
                    strength: typeof rel.strength === "number" ? rel.strength : null,
                    confidence: typeof rel.confidence === "number" ? rel.confidence : null,
                    context: rel.context ?? null,
                    source_segment_id: inserted.id,
                    metadata: {
                      source: "process_rag_queue",
                    },
                  },
                  { onConflict: "source_entity_id,target_entity_id,relationship_type" },
                );

              if (relationshipError) {
                console.error("Failed to upsert relationship", relationshipError);
              } else {
                localRelationshipsLinked += 1;
              }
            }
          }

          if (analysis?._modelId) {
            claudeModels.add(analysis._modelId);
          }

          return { entitiesLinked: localEntitiesLinked, relationshipsLinked: localRelationshipsLinked };
        });

        for (const summary of claudeSummaries) {
          runEntitiesLinked += summary.entitiesLinked;
          runRelationshipsLinked += summary.relationshipsLinked;
        }
      } else if (segmentsProcessedThisRun > 0) {
        // Claude is disabled, just mark segments as processed
        console.log("process_rag_queue: Claude analysis disabled, marking segments as processed", {
          jobId: job.id,
          batchSize: segmentsToProcess.length,
        });
        
        // Insert empty segment_relevance rows so we can track progress
        for (const inserted of segmentsToProcess) {
          await supabase
            .from("segment_relevance")
            .upsert(
              {
                segment_id: inserted.id,
                relevance_dentist: null,
                relevance_dental_assistant: null,
                relevance_hygienist: null,
                relevance_treatment_coordinator: null,
                relevance_align_rep: null,
                content_type: null,
                clinical_complexity: null,
                primary_focus: null,
                topics: [],
                confidence_score: null,
              },
              { onConflict: "segment_id" },
            );
        }
      }

      totalEntitiesLinked += runEntitiesLinked;
      totalRelationshipsLinked += runRelationshipsLinked;
      totalSegmentsProcessed += segmentsProcessedThisRun;

      const updatedLastSequence =
        segmentsProcessedThisRun > 0
          ? segmentsToProcess[segmentsProcessedThisRun - 1].sequence_number
          : lastSequenceProcessed;

      lastSequenceProcessed = Math.max(lastSequenceProcessed, updatedLastSequence);

      const runDurationMs = Math.round(performance.now() - jobStart);
      totalDurationMs += runDurationMs;

      const hasCompleted = lastSequenceProcessed >= totalSegments;
      const claudeModelsArray = Array.from(claudeModels);

      if (hasCompleted) {
        await supabase
          .from("content_sources")
          .update({
            rag_processed_version_id: job.version_id,
            transcription_status: "ingested",
          })
          .eq("id", version.source_id);

      const finalSummary = {
          notes: anthropicEnabled
            ? "Segment relevance, entities, and relationships generated."
            : "Segment embeddings generated without Claude analysis.",
          segments_processed: totalSegments,
          segments_total: totalSegments,
          embeddings_created: embeddingsCreated,
          embedding_chunks: embeddingChunksGenerated,
          entities_linked: totalEntitiesLinked,
          relationships_linked: totalRelationshipsLinked,
          duration_ms: totalDurationMs,
          processed_version_id: job.version_id,
          embedding_model: embeddingModel,
          claude_model: claudeModelsArray.length > 0 ? claudeModelsArray.join(", ") : null,
          claude_models: claudeModelsArray,
          chunk_char_count: chunkCharCount,
          original_char_count: originalCharCount,
          chunk_char_difference: chunkCharDiff,
        job_id: job.id,
        version_id: version.id,
        source_id: version.source_id,
        };

        await supabase
          .from("rag_ingestion_queue")
          .update({
            status: "complete",
            processed_at: new Date().toISOString(),
            result_summary: finalSummary,
          })
          .eq("id", job.id);

        jobResults.push({ job_id: job.id, segments: totalSegments });
        console.log("process_rag_queue: job complete", {
          jobId: job.id,
          segments: totalSegments,
          durationMs: totalDurationMs,
        });
        continue;
      }

      const partialSummary = {
        notes: `Processing… ${totalSegmentsProcessed}/${totalSegments} segments`,
        status: "processing",
        segments_processed: totalSegmentsProcessed,
        segments_total: totalSegments,
        embeddings_created: embeddingsCreated,
        embedding_chunks: embeddingChunksGenerated,
        entities_linked: totalEntitiesLinked,
        relationships_linked: totalRelationshipsLinked,
        embedding_model: embeddingModel,
        claude_model: claudeModelsArray.length > 0 ? claudeModelsArray.join(", ") : null,
        claude_models: claudeModelsArray,
        chunk_char_count: chunkCharCount,
        original_char_count: originalCharCount,
        chunk_char_difference: chunkCharDiff,
        job_id: job.id,
        version_id: version.id,
        source_id: version.source_id,
        progress: {
          last_sequence_processed: lastSequenceProcessed,
          total_segments: totalSegments,
          segments_processed: totalSegmentsProcessed,
          entities_linked: totalEntitiesLinked,
          relationships_linked: totalRelationshipsLinked,
          embeddings_inserted: embeddingsInserted,
          embeddings_created: embeddingsCreated,
          embedding_chunks: embeddingChunksGenerated,
          embedding_model: embeddingModel,
          claude_models: claudeModelsArray,
          chunk_char_count: chunkCharCount,
          original_char_count: originalCharCount,
          chunk_char_difference: chunkCharDiff,
          total_duration_ms: totalDurationMs,
          needs_resume: true,
          updated_at: new Date().toISOString(),
          job_id: job.id,
          version_id: version.id,
          source_id: version.source_id,
        },
      };

      await supabase
        .from("rag_ingestion_queue")
        .update({
          status: "processing",
          processed_at: null,
          result_summary: partialSummary,
        })
        .eq("id", job.id);

      console.log("process_rag_queue: progress checkpoint", {
        jobId: job.id,
        versionId: version.id,
        lastSequenceProcessed,
        totalSegmentsProcessed,
        totalSegments,
        embeddingsCreated,
        runDurationMs,
        elapsedSinceStartMs: Math.round(performance.now() - invocationStartedAt),
      });

      jobResults.push({
        job_id: job.id,
        segments_processed: totalSegmentsProcessed,
        remaining_segments: Math.max(totalSegments - totalSegmentsProcessed, 0),
      });
      console.log("process_rag_queue: job progress", {
        jobId: job.id,
        processed: totalSegmentsProcessed,
        total: totalSegments,
      });
      continue;
    } catch (error) {
      console.error("process_rag_queue: job failed", job.id, error);
      await sendSlackAlert(":x: RAG worker job failed", {
        job_id: job.id,
        error: formatErrorDetail(error),
      });
      await supabase
        .from("rag_ingestion_queue")
        .update({ status: "error", error_detail: formatErrorDetail(error) })
        .eq("id", job.id);
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      jobs_processed: jobResults.length,
      summary: jobResults,
      duration_ms: Math.round(performance.now() - invocationStartedAt),
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
