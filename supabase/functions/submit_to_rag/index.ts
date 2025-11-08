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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
      ...corsHeaders,
    },
  });

const emptyResponse = (status = 200) =>
  new Response(null, {
    status,
    headers: corsHeaders,
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return emptyResponse();
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  let payload: SubmitPayload;
  try {
    payload = await req.json();
  } catch (error) {
    return jsonResponse({ error: "Invalid JSON", details: error }, { status: 400 });
  }

  const {
    sourceId,
    sourceTitle,
    versionLabel,
    transcriptText,
    metadata = {},
    sourceMetadata = {},
    reviewerId,
    maxVersionId,
  } = payload;

  if (!versionLabel || !transcriptText || !reviewerId) {
    return jsonResponse({ error: "Missing required fields (versionLabel, transcriptText, reviewerId)" }, { status: 400 });
  }

  const client = supabase;
  const db = client;

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
      p_max_version_id: maxVersionId ?? null,
    });

  if (versionInsertError) {
    console.error("rag_submit_transcript failed", versionInsertError);
    return jsonResponse({ error: "Failed to submit transcript to RAG", details: versionInsertError }, { status: 500 });
  }

  return jsonResponse({ ok: true, version });
});

