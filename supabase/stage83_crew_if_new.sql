-- stage83_crew_if_new.sql — the Bell's feed only when it has changed (2026-10-19)
--
-- Amir, 2026-10-19: *"irans internet is very slow, and cant download everything everytime they open the app. can we do this in a way that the
-- images and messages arent downloaded again?"*. The photos are kept on the phone by the app (Cache Storage, downloaded once ever). This is the
-- other half: the feed itself.
--
-- `get_bell_if_new(p_athlete_id, p_etag)` works the feed out exactly as `get_bell()` does — it CALLS it, so there is one copy of the rules — and
-- then hashes it. When the hash matches what the phone already holds, it answers **`{"same": true}`** and a few bytes instead of the whole feed.
-- The hash is taken over the payload with `at` (the clock) removed, so two calls a second apart over an unchanged crew give the same hash.
-- It is an ETag, and it is exact: a post Amir removed, a like taken back, a line that aged out — anything that changes the feed changes the hash,
-- so the phone is never left showing something stale.
--
-- Measured on the live project, 2026-10-19: the feed was 2,274 bytes for six items; `{"same": true, ...}` is 78. A photo is 312 kB, which is why
-- the app keeps those on the phone.
--
-- `get_bell()` is NOT touched (so stage82's way back still matches it word for word), and nothing else changes: no table, no grant on anything
-- that already existed, no XP, no scorer. The app asks for `get_bell_if_new` and falls back to `get_bell` where this stage is not applied.
--
-- ⚠️ The Monthly Open moves to stage84: this took 83.
--
-- Rehearsed on PGlite: `scripts/career/rehearse_crew.mjs` section 15.
-- The way back: `scripts/career/rollback_stage83.sql` (drops the one function; the app falls back to `get_bell`). Safe to re-run.

-- ── 0. The guard ────────────────────────────────────────────────────────────────────────────────────────────────────────
do $stage83_guard$
begin
  if to_regprocedure('public.get_bell(text)') is null then
    raise exception 'stage83: stage81 (Crew and the Bell) is not on this database. Nothing was changed.';
  end if;
end
$stage83_guard$;

-- ── 1. The feed, or one word when it has not changed ────────────────────────────────────────────────────────────────────
-- Identity is get_bell()'s own: it raises "not signed in" or "not your bell" from inside, and this adds nothing of its own.
create or replace function public.get_bell_if_new(p_athlete_id text default null, p_etag text default null) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare v jsonb; v_tag text;
begin
  v := public.get_bell(p_athlete_id) - 'at';   -- the clock is not part of what the phone is holding
  v_tag := md5(v::text);
  if p_etag is not null and p_etag = v_tag then
    return jsonb_build_object('same', true, 'etag', v_tag, 'at', now());
  end if;
  return v || jsonb_build_object('etag', v_tag, 'at', now());
end $function$;

-- ── 2. Grants: a signed-in athlete and the coach, never anon ────────────────────────────────────────────────────────────
revoke all on function public.get_bell_if_new(text, text) from public, anon, authenticated;
grant execute on function public.get_bell_if_new(text, text) to authenticated, service_role;
