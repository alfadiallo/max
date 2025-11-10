-- 007_refresh_rag_submit_transcript.sql
-- Ensures rag_submit_transcript function includes character-count verification metadata.

begin;

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
  v_input_char_count integer := char_length(p_transcript_text);
  v_chunked_char_count integer := 0;
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

  <<chunking>>
  declare
    v_max_chunk_chars constant integer := 1200;
    v_min_chunk_chars constant integer := 600;
    v_buffer text := '';
    v_paragraph text;
    v_chunk text;
    v_remaining text;
    v_separator text := E'\n\n';
  begin
    for v_paragraph in
      select trim(t) as paragraph
      from regexp_split_to_table(p_transcript_text, E'\n+') as t
      where length(trim(t)) > 0
    loop
      v_remaining := v_paragraph;

      while length(v_remaining) > 0 loop
        if length(v_remaining) > v_max_chunk_chars then
          declare
            v_break_index integer := v_max_chunk_chars;
            v_min_break integer := greatest((v_max_chunk_chars * 6) / 10, 1);
            v_char text;
          begin
            for i in reverse v_min_break .. v_max_chunk_chars loop
              v_char := substring(v_remaining from i for 1);
              exit when v_char is null;
              if v_char similar to '[[:space:]]' or v_char in ('.', '!', '?', ',', ';', ':') then
                v_break_index := i;
                exit;
              end if;
            end loop;
            v_chunk := trim(substring(v_remaining from 1 for v_break_index));
            if v_chunk = '' then
              v_chunk := substring(v_remaining from 1 for v_max_chunk_chars);
              v_break_index := v_max_chunk_chars;
            end if;
            if v_break_index >= length(v_remaining) then
              v_remaining := '';
            else
              v_remaining := ltrim(substring(v_remaining from v_break_index + 1));
            end if;
          end;

          if length(v_buffer) > 0 then
            insert into transcript_segments (version_id, sequence_number, text)
            values (v_version_id, v_segment_sequence, v_buffer);
            v_chunked_char_count := v_chunked_char_count + char_length(v_buffer);
            v_segment_sequence := v_segment_sequence + 1;
            v_buffer := '';
          end if;

          insert into transcript_segments (version_id, sequence_number, text)
          values (v_version_id, v_segment_sequence, v_chunk);
          v_chunked_char_count := v_chunked_char_count + char_length(v_chunk);
          v_segment_sequence := v_segment_sequence + 1;
        else
          exit;
        end if;
      end loop;

      if length(v_remaining) > 0 then
        if length(v_buffer) = 0 then
          v_buffer := v_remaining;
        elsif length(v_buffer || v_separator || v_remaining) <= v_max_chunk_chars
          or (length(v_buffer) < v_min_chunk_chars and length(v_remaining) < v_min_chunk_chars) then
          v_buffer := v_buffer || v_separator || v_remaining;
        else
          insert into transcript_segments (version_id, sequence_number, text)
          values (v_version_id, v_segment_sequence, v_buffer);
          v_chunked_char_count := v_chunked_char_count + char_length(v_buffer);
          v_segment_sequence := v_segment_sequence + 1;
          v_buffer := v_remaining;
        end if;
      end if;
    end loop;

    if length(v_buffer) > 0 then
      insert into transcript_segments (version_id, sequence_number, text)
      values (v_version_id, v_segment_sequence, v_buffer);
      v_chunked_char_count := v_chunked_char_count + char_length(v_buffer);
      v_segment_sequence := v_segment_sequence + 1;
    end if;
  end chunking;

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
    v_segment_sequence := 2;
    v_chunked_char_count := char_length(p_transcript_text);
  end if;

  update transcript_versions
  set metadata_json = coalesce(metadata_json, '{}'::jsonb) || jsonb_build_object(
    'rag_chunk_summary',
    jsonb_build_object(
      'input_char_count', v_input_char_count,
      'chunked_char_count', v_chunked_char_count,
      'char_count_difference', v_input_char_count - v_chunked_char_count,
      'segments_created', greatest(v_segment_sequence - 1, 1)
    )
  )
  where id = v_version_id;

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
    'segments_created', greatest(v_segment_sequence - 1, 1),
    'input_char_count', v_input_char_count,
    'chunked_char_count', v_chunked_char_count,
    'char_count_difference', v_input_char_count - v_chunked_char_count
  );
end;
$$;

commit;


