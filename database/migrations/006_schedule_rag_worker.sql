-- 006_schedule_rag_worker.sql
-- Creates a helper function and pg_cron schedule to trigger the process_rag_queue edge function every 2 minutes

begin;

create extension if not exists pg_net;

create or replace function public.run_process_rag_queue()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base_url text;
  v_service_role_key text;
  v_functions_url text;
  v_response record;
begin
  v_base_url := current_setting('app.settings.supabase_url', true);

  if v_base_url is null then
    raise exception 'app.settings.supabase_url is not set';
  end if;

  v_service_role_key := vault.get('service_role_key');
  if v_service_role_key is null then
    raise exception 'service_role_key not found in vault';
  end if;

  v_functions_url := replace(trim(trailing '/' from v_base_url), '.supabase.co', '.functions.supabase.co');

  select *
  into v_response
  from net.http_post(
    url := v_functions_url || '/process_rag_queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := '{}'::jsonb
  );

  if coalesce(v_response.status, 500) >= 400 then
    raise exception 'process_rag_queue returned status % with body %', v_response.status, v_response.body;
  end if;
end;
$$;

do $$
declare
  v_job_id int;
begin
  select jobid into v_job_id
  from cron.job
  where jobname = 'rag_worker_every_two_minutes';

  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;
end;
$$;

select cron.schedule(
  'rag_worker_every_two_minutes',
  '*/2 * * * *',
  $$select public.run_process_rag_queue();$$
);

commit;


