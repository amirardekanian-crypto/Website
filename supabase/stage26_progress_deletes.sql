-- ═══════════════════════════════════════════════════════════════════════════
--  stage26 — let athlete_progress FORGET a key
--
--  WHY (the bug this closes)
--  ------------------------------------------------------------------------
--  save_progress merged with `data = athlete_progress.data || excluded.data`.
--  A shallow jsonb merge can add and overwrite, but it can NEVER remove. The row
--  was therefore an accumulator: every key an athlete's phone deleted lived on in
--  the cloud for ever.
--
--  For most keys that was harmless noise. For '<id>_completed_d<N>' it was not,
--  because that key is not data — it is a TRIGGER. autoResetStaleDays() in
--  program.html reads a completed stamp dated anything but today as "that session
--  is finished" and wipes the whole day: checks, per-exercise RPE, per-set RPE and
--  done-ticks, the running timer, the readiness check, session RPE, day note.
--
--  Since syncFromCloud() began merging on EVERY load (not just onto an empty
--  device), the sequence closed into a loop:
--
--      boot -> pull weeks-old completed_dN out of the cloud
--           -> autoResetStaleDays() sees a stale stamp
--           -> wipes the day the athlete is CURRENTLY TRAINING
--           -> pushes the wiped state back up
--
--  So reloading mid-workout destroyed the session in progress — on Android and
--  iOS alike, since nothing about it is platform-specific. Weights survived (the
--  reset keeps them on purpose), which is exactly what athletes reported.
--  Measured immediately before this migration: 51 of 52 completed stamps in the
--  table were stale, i.e. nearly every athlete was one reload from losing a
--  session, and some had not had a day survive for weeks.
--
--  WHAT THIS CHANGES
--  ------------------------------------------------------------------------
--  save_progress gains p_drop: the keys the device deleted, to be removed before
--  the new snapshot is overlaid. Deletes now travel, so nothing comes back.
--
--  Ordering inside the UPDATE is deliberate:
--      (data - v_drop) || excluded.data
--  remove first, overlay second — so a key that was deleted and immediately
--  rewritten in the same session survives.
--
--  p_drop arrives from the browser and is NOT trusted. It is filtered to this
--  athlete's own program keys: never another athlete's, and never the habit app's
--  '<id>_hab_*' keys (habits.html shares this row and syncs those itself).
--
--  The old 4-arg function is DROPPED rather than left alongside: with p_key and
--  p_drop both defaulted, a 4-key call would match both signatures and PostgREST
--  would fail the request with "could not choose the best candidate function" —
--  which would break saving for every athlete still on cached JS. Dropping it
--  means an old client's 4-key call simply binds here and takes the default.
--
--  Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

drop function if exists public.save_progress(text, text, jsonb, text);

create or replace function public.save_progress(
  p_athlete_id   text,
  p_athlete_name text,
  p_data         jsonb,
  p_key          text   default null,
  p_drop         text[] default null
) returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_expected text;
  v_drop     text[];
begin
  select secret_key into v_expected from public.athlete_keys where athlete_id = p_athlete_id;
  if v_expected is not null and (p_key is distinct from v_expected) then
    raise exception 'invalid athlete key';
  end if;

  -- Keep only keys this athlete is allowed to delete. Plain left() comparison,
  -- not LIKE: an athlete_id contains underscores, which LIKE would treat as
  -- single-character wildcards and quietly widen the match to other athletes.
  select coalesce(array_agg(k), '{}'::text[])
    into v_drop
    from unnest(coalesce(p_drop, '{}'::text[])) as k
   where left(k, length(p_athlete_id) + 1) =  p_athlete_id || '_'
     and left(k, length(p_athlete_id) + 5) <> p_athlete_id || '_hab_';

  insert into public.athlete_progress (athlete_id, athlete_name, data, updated_at)
  values (p_athlete_id, p_athlete_name, p_data, now())
  on conflict (athlete_id) do update
    set athlete_name = excluded.athlete_name,
        data         = (athlete_progress.data - v_drop) || excluded.data,
        updated_at   = now();
end;
$function$;

-- Restore the grants the dropped function had (athletes call this as `anon`).
grant execute on function public.save_progress(text, text, jsonb, text, text[])
  to anon, authenticated, service_role;
