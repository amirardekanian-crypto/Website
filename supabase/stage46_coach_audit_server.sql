-- stage46 — the coach.html audit, server half (2026-10-10). Applied with the Supabase MCP.
--
-- 1. save_session()
--    a. A note the athlete edits after Amir marked the session read comes back to "needs you"
--       (SERVER-4). The ON CONFLICT kept coach_status 'read' whatever the note now said, so an edit
--       like "actually my knee hurt on the last set" was never seen.
--    b. coach.html's "Add past session" over an existing one may now really replace it (SERVER-3).
--       The "never lose a log" coalesce kept the old set-by-set log under the email's text, so the
--       athlete and the coach saw different sessions while the dialog said the log was gone. Only
--       the coach, and only with p_session.replace_log = true, drops it; an athlete's re-save keeps
--       its log exactly as before.
--    c. A session RPE or duration written as 7.5 is rounded instead of refused (the app only sends
--       whole numbers; a pasted email can carry a decimal).
-- 2. hab_season_results gets the SELECT grant its coach policy needs (SERVER-2): the weekly backup
--    said INCOMPLETE every week because this one table could never be read. RLS keeps it coach-only.
-- 3. The level helpers are no longer callable by any signed-in athlete or buyer (SERVER-8): they run
--    with the owner's rights and had no access check, so any account could read any athlete's level
--    or mint their titles. Their callers (claim_titles, set_title, hab_mint_titles) run as owner and
--    are unaffected. coach.html reads every level in ONE call through coach_season_levels(), which
--    checks is_coach(); it falls back to hab_season_level only while this file is not applied.
-- 4. exercises and qualities stamp updated_at on every update (SERVER-6). coach.html's Spine save
--    writes .eq('updated_at', <what it read>), which only catches another writer that moved
--    updated_at; /spine always sets it, and now a hand-written UPDATE that forgets it is caught too.
--
-- Safe to re-run.

-- ── 1. save_session ──────────────────────────────────────────────────────────
create or replace function public.save_session(p_athlete_id text, p_athlete_name text, p_day integer,
  p_completed_on date, p_session jsonb, p_key text default null::text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_expected text;
        v_replace boolean := public.is_coach() and coalesce((p_session->>'replace_log')::boolean, false);
begin
  select secret_key into v_expected from public.athlete_keys where athlete_id = p_athlete_id;
  if not public.is_coach() and p_athlete_id is distinct from public.current_athlete_id() and (v_expected is null or p_key is null or p_key is distinct from v_expected) then
    raise exception 'invalid athlete key';
  end if;
  insert into public.session_history
    (athlete_id, athlete_name, day, completed_on, status, session_rpe,
     duration_min, readiness, day_note, focus, summary, log, updated_at)
  values (
    p_athlete_id, p_athlete_name, p_day, p_completed_on,
    p_session->>'status', round(nullif(p_session->>'session_rpe','')::numeric)::int,
    round(nullif(p_session->>'duration_min','')::numeric)::int, p_session->'readiness',
    p_session->>'day_note', p_session->>'focus', p_session->>'summary',
    case when jsonb_typeof(p_session->'log') = 'array' then p_session->'log' end,
    now())
  on conflict (athlete_id, day, completed_on) do update
    set athlete_name = excluded.athlete_name, status = excluded.status,
        session_rpe = excluded.session_rpe, duration_min = excluded.duration_min,
        readiness = excluded.readiness, day_note = excluded.day_note,
        focus = excluded.focus, summary = excluded.summary,
        log = case when v_replace then excluded.log else coalesce(excluded.log, session_history.log) end,
        coach_status = case
          when not public.is_coach()
           and coalesce(btrim(excluded.day_note), '') <> ''
           and excluded.day_note is distinct from session_history.day_note then 'new'
          else session_history.coach_status end,
        updated_at = now();
end; $function$;

-- ── 2. the backup can read season results ────────────────────────────────────
grant select on public.hab_season_results to authenticated;

-- ── 3. level helpers: coach only ─────────────────────────────────────────────
create or replace function public.coach_season_levels(p_ids text[])
returns table(athlete_id text, level integer)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_coach() then
    raise exception 'coach only';
  end if;
  return query select x.id, public.hab_season_level(x.id) from unnest(p_ids) as x(id);
end; $function$;
revoke execute on function public.coach_season_levels(text[]) from public, anon;
grant execute on function public.coach_season_levels(text[]) to authenticated;

revoke execute on function public.hab_career_level(text) from authenticated;
revoke execute on function public.hab_mint_titles(text) from authenticated;
revoke execute on function public.purge_old_notes() from authenticated;
revoke execute on function public.hab_season_level(text) from authenticated;

-- ── 4. Spine rows: updated_at moves on every update ──────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  new.updated_at := now();
  return new;
end; $function$;
create or replace trigger exercises_touch_updated_at before update on public.exercises
  for each row execute function public.touch_updated_at();
create or replace trigger qualities_touch_updated_at before update on public.qualities
  for each row execute function public.touch_updated_at();

-- ── 5. which stored passwords have already been used (SERVER-1, added the same day) ─────
-- "Logins to send" listed every stored password as waiting, including 8 of 13 that had already been
-- used to sign in. coach.html marks those "signed in with it". It reads auth.users, which only a
-- SECURITY DEFINER function can; coach only. Clearing a used password automatically is Amir's call.
create or replace function public.coach_login_use()
returns table(app text, key text, signed_in_since boolean)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_coach() then
    raise exception 'coach only';
  end if;
  return query
    select 'athlete'::text, ai.athlete_id, coalesce(u.last_sign_in_at > ai.password_set_at, false)
      from public.athlete_identities ai join auth.users u on u.id = ai.user_id
     where ai.initial_password is not null
    union all
    select 'course'::text, t.username, coalesce(u.last_sign_in_at > t.password_set_at, false)
      from public.tps_accounts t join auth.users u on u.id = t.user_id
     where t.initial_password is not null
    union all
    select 'testing'::text, a.username, coalesce(u.last_sign_in_at > a.password_set_at, false)
      from public.assess_accounts a join auth.users u on u.id = a.user_id
     where a.initial_password is not null;
end; $function$;
revoke execute on function public.coach_login_use() from public, anon;
grant execute on function public.coach_login_use() to authenticated;
