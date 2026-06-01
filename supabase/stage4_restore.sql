-- ============================================================================
--  STAGE 4 — restore progress on a new device / reinstall
--  Project: bvipfipbdcyqnbczjmaq (eu-west-2). Run AFTER stage1 + stage2.
--  Safe to re-run.
--
--  Problem: localStorage is the app's source of truth, but it's wiped when the
--  athlete deletes / reinstalls the PWA or opens their link on a new phone — so
--  they lose their in-progress data even though the cloud already has a mirror
--  (athlete_progress, written by save_progress()).
--
--  Fix: a key-checked, read-only function that hands the athlete back THEIR OWN
--  saved blob. Mirrors the security of save_progress() / save_session():
--   - anon (the athlete app) may EXECUTE it, but only for their own id+key;
--   - they still get no direct SELECT on athlete_progress (coach-only).
--  program.html calls this on load and, ONLY when localStorage is empty for that
--  athlete, repopulates it from the returned blob (never clobbers live data).
-- ============================================================================

create or replace function public.get_progress(p_athlete_id text, p_key text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_expected text;
  v_data     jsonb;
begin
  select secret_key into v_expected from public.athlete_keys where athlete_id = p_athlete_id;
  if v_expected is not null and (p_key is distinct from v_expected) then
    raise exception 'invalid athlete key';
  end if;
  select data into v_data from public.athlete_progress where athlete_id = p_athlete_id;
  return coalesce(v_data, '{}'::jsonb);
end;
$fn$;

revoke all on function public.get_progress(text, text) from public;
grant execute on function public.get_progress(text, text) to anon, authenticated;
