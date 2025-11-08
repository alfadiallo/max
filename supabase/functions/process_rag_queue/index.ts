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
const SLACK_WEBHOOK_URL = Deno.env.get("SLACK_WEBHOOK_URL") ?? "";
const QUEUE_ALERT_THRESHOLD = Number(Deno.env.get("RAG_ALERT_QUEUE_THRESHOLD") ?? "25");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Supabase env vars missing. process_rag_queue will exit.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;
const anthropicEnabled = Boolean(ANTHROPIC_API_KEY);
console.log("process_rag_queue: anthropicEnabled", anthropicEnabled ? "enabled" : "disabled");

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

async function analyzeSegmentWithClaude(segmentText: string, metadata: { sequence: number; total: number; projectName?: string | null; audioName?: string | null }): Promise<SegmentAnalysis | null> {
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
      const parsed = JSON.parse(cleaned);

      const analysis: SegmentAnalysis = {
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

  const startedAt = performance.now();
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

  const entityCache = new Map<string, string>();

  for (const job of jobs) {
    const jobStart = performance.now();

    try {
      console.log("process_rag_queue: picked job", {
        jobId: job.id,
        sourceId: job.source_id,
        versionId: job.version_id,
      });

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


      if (segmentError || !segments || segments.length === 0) {
        await supabase
          .from("rag_ingestion_queue")
          .update({ status: "error", error_detail: formatErrorDetail(segmentError ?? "No transcript segments") })
          .eq("id", job.id);
        continue;
      }

      const segmentEmbeddings: Array<number[] | null> = segments.map(() => null);
      let embeddingModel: string | null = null;
      let embeddingChunksGenerated = 0;

      if (openai) {
        for (let idx = 0; idx < segments.length; idx += 1) {
          const segment = segments[idx];
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
          }

          const averaged = averageVectors(chunkVectors);
          if (averaged) {
            segmentEmbeddings[idx] = averaged;
          }
        }
      } else {
        console.warn("process_rag_queue: OPENAI_API_KEY missing, skipping embedding generation");
      }

      const { error: deleteContentError } = await supabase
        .from("content_segments")
        .delete()
        .eq("version_id", version.id);

      if (deleteContentError) {
        console.error("process_rag_queue: failed to clear previous content segments", job.id, deleteContentError);
      }

      const contentRows = segments.map((segment, idx) => ({
        source_id: version.source_id,
        version_id: version.id,
        segment_text: segment.text,
        sequence_number: segment.sequence_number,
        start_timestamp: segment.start_time,
        end_timestamp: segment.end_time,
        embedding: segmentEmbeddings[idx] ?? null,
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
          .update({ status: "error", error_detail: formatErrorDetail(contentError) })
          .eq("id", job.id);
        continue;
      }

      console.log("process_rag_queue: inserted content segments", {
        jobId: job.id,
        inserted: contentRows.length,
      });

      // The insert needs segment IDs. Fetch inserted rows to align IDs.
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

      let entitiesLinked = 0;
      let relationshipsLinked = 0;

      for (let idx = 0; idx < insertedSegments.length; idx++) {
        const inserted = insertedSegments[idx];
        const segment = segments.find((seg) => seg.sequence_number === inserted.sequence_number);

        if (!segment) {
          console.warn("process_rag_queue: missing segment text", inserted);
          continue;
        }

        let analysis: SegmentAnalysis | null = null;
        if (anthropicEnabled) {
          analysis = await analyzeSegmentWithClaude(segment.text, {
            sequence: segment.sequence_number,
            total: segments.length,
            projectName: version.metadata_json?.project_name ?? null,
            audioName: version.metadata_json?.audio_file_name ?? null,
          });
          console.log("process_rag_queue: claude analysis", {
            jobId: job.id,
            sequence: segment.sequence_number,
            analysis,
          });
        } else {
          console.log("process_rag_queue: claude skipped (disabled)", {
            jobId: job.id,
            sequence: segment.sequence_number,
          });
        }

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
              entitiesLinked += 1;
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
              relationshipsLinked += 1;
            }
          }
        }
      }

      await supabase
        .from("content_sources")
        .update({
          rag_processed_version_id: job.version_id,
          transcription_status: "ingested",
        })
        .eq("id", version.source_id);

      const embeddingsCreated = segmentEmbeddings.filter((embedding) => Array.isArray(embedding)).length;

      const resultSummary = {
        segments_processed: insertedSegments.length,
        embeddings_created: embeddingsCreated,
        embedding_chunks: embeddingChunksGenerated,
        entities_linked: entitiesLinked,
        relationships_linked: relationshipsLinked,
        duration_ms: Math.round(performance.now() - jobStart),
        processed_version_id: job.version_id,
        embedding_model: embeddingModel,
        claude_model: anthropicEnabled ? ANTHROPIC_MODEL : null,
        notes: anthropicEnabled ? "Segment relevance, entities, and relationships generated." : "Segment embeddings generated without Claude analysis.",
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
      console.log("process_rag_queue: job complete", {
        jobId: job.id,
        segments: insertedSegments.length,
        durationMs: resultSummary.duration_ms,
      });
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
      duration_ms: Math.round(performance.now() - startedAt),
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
