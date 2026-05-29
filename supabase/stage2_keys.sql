-- ============================================================================
--  STAGE 2 (Path B) — per-athlete secret keys
--  Project: bvipfipbdcyqnbczjmaq (eu-west-2). Applied live 2026-05-29.
--  Run AFTER stage1_schema.sql. Safe to re-run.
--
--  Goal: close two gaps from Stage 1 without adding any login friction for
--  athletes. Each athlete gets a private random key baked into their link
--  (program.html?client=<id>&key=<key>). The write functions verify that key,
--  so nobody can write to an athlete's record without it, and the coach can
--  revoke/rotate a key anytime from the dashboard.
--
--  Soft enforcement: a key is required ONLY for athletes who have one
--  registered in athlete_keys. Un-keyed athletes keep working (legacy) until
--  the coach issues them a secure link — so a live system can migrate one
--  athlete at a time with zero downtime.
-- ============================================================================

create table if not exists public.athlete_keys (
  athlete_id text primary key,
  secret_key text not null,
  created_at timestamptz not null default now()
);
alter table public.athlete_keys enable row level security;

-- Coach (signed-in, allowlisted email) fully manages keys: generate, view
-- (to build links), rotate, delete. Athletes (anon) get NO direct access —
-- the save_* functions read keys internally as SECURITY DEFINER.
drop policy if exists "coach manage keys" on public.athlete_keys;
create policy "coach manage keys" on public.athlete_keys
  for all to authenticated
  using      ( (auth.jwt() ->> 'email') = 'amirardekanian@gmail.com' )
  with check ( (auth.jwt() ->> 'email') = 'amirardekanian@gmail.com' );

-- ---------------------------------------------------------------------------
-- Key-checked write functions. p_key has a DEFAULT so old cached app builds
-- (which call without a key) still resolve to this single function — no
-- "function is not unique" ambiguity. The 3-arg / 5-arg originals are dropped.
-- ---------------------------------------------------------------------------
drop function if exists public.save_progress(text, text, jsonb);
create or replace function public.save_progress(
  p_athlete_id text, p_athlete_name text, p_data jsonb, p_key text default null)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_expected text;
begin
  select secret_key into v_expected from public.athlete_keys where athlete_id = p_athlete_id;
  if v_expected is not null and (p_key is distinct from v_expected) then
    raise exception 'invalid athlete key';
  end if;
  insert into public.athlete_progress (athlete_id, athlete_name, data, updated_at)
  values (p_athlete_id, p_athlete_name, p_data, now())
  on conflict (athlete_id) do update
    set athlete_name = excluded.athlete_name,
        data         = athlete_progress.data || excluded.data,  -- accumulate
        updated_at   = now();
end; $fn$;
revoke all on function public.save_progress(text,text,jsonb,text) from public;
grant execute on function public.save_progress(text,text,jsonb,text) to anon, authenticated;

drop function if exists public.save_session(text, text, integer, date, jsonb);
create or replace function public.save_session(
  p_athlete_id text, p_athlete_name text, p_day integer,
  p_completed_on date, p_session jsonb, p_key text default null)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_expected text;
begin
  select secret_key into v_expected from public.athlete_keys where athlete_id = p_athlete_id;
  if v_expected is not null and (p_key is distinct from v_expected) then
    raise exception 'invalid athlete key';
  end if;
  insert into public.session_history
    (athlete_id, athlete_name, day, completed_on, status, session_rpe,
     duration_min, readiness, day_note, focus, summary, updated_at)
  values (
    p_athlete_id, p_athlete_name, p_day, p_completed_on,
    p_session->>'status', nullif(p_session->>'session_rpe','')::int,
    nullif(p_session->>'duration_min','')::int, p_session->'readiness',
    p_session->>'day_note', p_session->>'focus', p_session->>'summary', now())
  on conflict (athlete_id, day, completed_on) do update
    set athlete_name = excluded.athlete_name, status = excluded.status,
        session_rpe = excluded.session_rpe, duration_min = excluded.duration_min,
        readiness = excluded.readiness, day_note = excluded.day_note,
        focus = excluded.focus, summary = excluded.summary, updated_at = now();
end; $fn$;
revoke all on function public.save_session(text,text,integer,date,jsonb,text) from public;
grant execute on function public.save_session(text,text,integer,date,jsonb,text) to anon, authenticated;
