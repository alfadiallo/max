-- rag_submit_transcript.sql
-- RPC helper used by submit_to_rag edge function.

create or replace function rag_submit_transcript(
  p_version_label text,
  p_transcript_text text,
  p_submitter_id uuid,
  p_source_id uuid default null,
  p_source_title text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_source_metadata jsonb default '{}'::jsonb,
  p_submitted_at timestamptz default now(),
  p_max_version_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source_id uuid;
  v_source_title text := coalesce(p_source_title, 'Untitled Source');
  v_source_metadata jsonb := coalesce(p_source_metadata, '{}'::jsonb);
  v_version_id uuid;
  v_segment_sequence integer := 1;
  v_segment text;
begin
  if p_version_label is null or p_transcript_text is null or p_submitter_id is null then
    raise exception 'Missing required parameters';
  end if;

  if p_source_id is null then
    insert into content_sources (
      title,
      metadata,
      transcription_status,
      rag_last_submitted_at,
      rag_processed_version_id
    ) values (
      v_source_title,
      v_source_metadata,
      'queued_for_rag',
      p_submitted_at,
      null
    )
    returning id into v_source_id;
  else
    v_source_id := p_source_id;

    insert into content_sources (
      id,
      title,
      metadata,
      transcription_status,
      rag_last_submitted_at,
      rag_processed_version_id
    ) values (
      v_source_id,
      v_source_title,
      v_source_metadata,
      'queued_for_rag',
      p_submitted_at,
      null
    )
    on conflict (id) do update
      set title = coalesce(excluded.title, content_sources.title),
          metadata = coalesce(content_sources.metadata, '{}'::jsonb) || v_source_metadata,
          transcription_status = 'queued_for_rag',
          rag_last_submitted_at = excluded.rag_last_submitted_at,
          rag_processed_version_id = null;
  end if;

  update transcript_versions
  set is_latest = false
  where source_id = v_source_id
    and is_latest = true;

  insert into transcript_versions (
    source_id,
    version_label,
    transcript_text,
    metadata_json,
    max_version_id,
    reviewer_id,
    verified_at,
    is_latest
  ) values (
    v_source_id,
    p_version_label,
    p_transcript_text,
    coalesce(p_metadata, '{}'::jsonb),
    p_max_version_id,
    p_submitter_id,
    p_submitted_at,
    true
  )
  returning id into v_version_id;

  delete from transcript_segments where version_id = v_version_id;

  for v_segment in
    select trim(t) as segment_text
    from regexp_split_to_table(p_transcript_text, E'\n{2,}') as t
    where length(trim(t)) > 0
  loop
    insert into transcript_segments (
      version_id,
      sequence_number,
      text
    ) values (
      v_version_id,
      v_segment_sequence,
      v_segment
    );
    v_segment_sequence := v_segment_sequence + 1;
  end loop;

  if v_segment_sequence = 1 then
    insert into transcript_segments (
      version_id,
      sequence_number,
      text
    ) values (
      v_version_id,
      1,
      p_transcript_text
    );
  end if;

  insert into rag_ingestion_queue (
    source_id,
    version_id,
    source_max_version_id,
    submitted_by,
    submitted_at,
    status
  ) values (
    v_source_id,
    v_version_id,
    p_max_version_id,
    p_submitter_id,
    p_submitted_at,
    'queued'
  );

  return jsonb_build_object(
    'source_id', v_source_id,
    'version_id', v_version_id,
    'max_version_id', p_max_version_id,
    'segments_created', greatest(v_segment_sequence - 1, 1)
  );
end;
$$;

