-- ═══════════════════════════════════════════════════════════════════════════
-- STAGE 23 — fix hab_mint_titles() and set_title(): passTrack drifted from an
-- OBJECT to an ARRAY and nobody updated the two functions that read it
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Found 2026-08-02 while verifying stage22 landed cleanly. Not caused by
-- stage22 — `rules -> 'passTrack'` on the live xp_rules row was ALREADY a
-- JSONB ARRAY of `{id, lv, kind, name}` objects (mirroring PASS_TRACK in
-- habits.html, plus the four EVENT titles at lv:0) before stage22 touched it.
-- stage22 only appended one more well-formed element (`t_unbowed`) to an
-- array that was already the wrong shape for its two readers.
--
-- hab_mint_titles() was written against stage17's ORIGINAL shape — a plain
-- object mapping `{title_id: required_level}` — and calls
-- `jsonb_each_text(v_rules -> 'passTrack')`, which requires a JSONB OBJECT.
-- Tested directly against the live database:
--
--   select jsonb_each_text('[{"a":1}]'::jsonb);
--   -- ERROR: 22023: cannot call jsonb_each_text on a non-object
--
-- set_title() reads it the same wrong way — `(v_rules -> 'passTrack' ->> v_title)`
-- — which on an array returns NULL for every title, so it always raised
-- 'unknown title', for every title, level-gated or event.
--
-- ── BLAST RADIUS ─────────────────────────────────────────────────────────
-- hab_mint_titles() is called with NO exception handling from both
-- claim_titles() (which the client calls at EVERY boot, via syncTitles()) and
-- set_title() (called when an athlete equips/unequips a title, via
-- pushTitle()). So both paths have been hard-failing since whatever commit
-- reshaped passTrack into an array — `select max(earned_on) from hab_titles`
-- is 2026-07-29, four days of silence before this fix, despite ongoing
-- athlete activity in that window. Checked and confirmed with a live preview
-- query: 10 real athletes are owed a title right now (see the backfill at the
-- bottom of this file).
--
-- The client itself never breaks — `pushTitle()`'s catch block already treats
-- a server refusal as "not published yet", so an athlete's OWN app still shows
-- whatever they picked (CFG.pass.owned is the client's own record, read
-- independently — see passTitle() in habits.html). What breaks is durability:
-- nothing unminted here exists on the SERVER, so (a) it never shows on the
-- leaderboard or wall for anyone else, and (b) if a season resets before this
-- is fixed, an athlete's earned-but-unminted title has nothing protecting it
-- — the exact promise "nothing may ever revoke a reward" depends on.
--
-- ── THE FIX, and one trap worth naming out loud ────────────────────────────
-- The tempting fast fix — "just read the array the same way, mint anything
-- where level >= lv" — is WRONG. The four event titles (t_sunforged,
-- t_bedrock, t_coldforged, t_stillhere) and stage22's new t_unbowed sit in
-- that same array at `lv: 0` (or, for t_unbowed until this file runs, no `lv`
-- key at all). An athlete's level is always >= 0. Naively levelling-gate the
-- whole array would auto-award all five event titles to EVERY athlete on
-- their next boot, whether they did the work or not — the app's biggest
-- rewards, for free, silently, to everyone at once.
--
-- So the two kinds of title need two different treatments, and the ORIGINAL
-- stage17 map already told us which titles were ever meant to auto-mint by
-- level: it only ever contained the ten titles from PASS_TRACK (t_signed
-- through t_proof) — no cards, no event titles. That is preserved exactly:
--
--   hab_mint_titles()  — mints ONLY entries with kind:'title' and a real
--                         lv > 0, gated on hab_season_level() >= lv. Cards
--                         were never auto-minted before (excluded from the
--                         original map on purpose — see CLAUDE.md, "cards
--                         deliberately do not [show], because a card is
--                         drawn on the athlete's own phone") and still
--                         aren't. Event titles (lv 0 or missing) are simply
--                         invisible to this function's filter — not zero
--                         XP required, EXCLUDED entirely.
--
--   set_title()        — looks the id up in the array (not a key lookup).
--                         If it finds a real `lv > 0`, it defers to
--                         hab_mint_titles()'s own independent level check,
--                         exactly as before. If `lv` is 0 or absent (an
--                         event title), there is no level to check — event
--                         completion is computed client-side only, the same
--                         trust boundary the rest of this app already runs
--                         on (XP itself is self-reported and only
--                         cross-checked by the log, never independently
--                         re-derived server-side for "did you finish this
--                         four-week event"). So it records the title
--                         directly, append-only, exactly like a mint.
--                         An unrecognised id is still rejected — that half
--                         of the promise ("the server refuses a title it
--                         doesn't know") is unchanged.
--
-- ── ALSO: t_unbowed gets its lv:0, for consistency ─────────────────────────
-- Stage22 appended `{"kind":"title","id":"t_unbowed","name":"UNBOWED"}` with
-- no `lv` key, unlike its four event-title siblings which all explicitly
-- carry `"lv":0`. Functionally this file's fix treats "missing" and "0" the
-- same way, so nothing was ever broken by the omission — this is a pure
-- consistency fix so every event title in the array reads the same shape.
--
-- SAFE TO RE-RUN. Idempotent: the mint is a plain insert ... on conflict do
-- nothing, and this file changes no other data.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create or replace function public.hab_mint_titles(p_athlete_id text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_rules jsonb; v_level int;
begin
  select rules into v_rules from public.xp_rules where id = 1;
  if v_rules is null or v_rules -> 'passTrack' is null then return; end if;
  v_level := public.hab_season_level(p_athlete_id);
  insert into public.hab_titles (athlete_id, title)
  select p_athlete_id, t ->> 'id'
  from jsonb_array_elements(v_rules -> 'passTrack') t
  -- The legacy map-object element (index 0 on the live row today) has none
  -- of these keys, so it reads as NULL on every branch and is excluded here
  -- with no special-casing needed.
  where t ->> 'kind' = 'title'
    and (t ->> 'lv') is not null
    and (t ->> 'lv')::int > 0
    and v_level >= (t ->> 'lv')::int
  on conflict (athlete_id, title) do nothing;
end; $function$;

create or replace function public.set_title(p_athlete_id text, p_title text, p_key text default null::text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare v_expected text; v_rules jsonb; v_entry jsonb; v_need int; v_title text;
begin
  select secret_key into v_expected from public.athlete_keys where athlete_id = p_athlete_id;
  if v_expected is not null and (p_key is distinct from v_expected) then
    raise exception 'invalid athlete key';
  end if;

  v_title := nullif(btrim(coalesce(p_title, '')), '');

  if v_title is not null then
    select rules into v_rules from public.xp_rules where id = 1;
    select t into v_entry
      from jsonb_array_elements(coalesce(v_rules -> 'passTrack', '[]'::jsonb)) t
      where t ->> 'id' = v_title and t ->> 'kind' = 'title'
      limit 1;
    if v_entry is null then raise exception 'unknown title'; end if;

    v_need := nullif(v_entry ->> 'lv', '')::int;

    if v_need is not null and v_need > 0 then
      -- Level-gated: verified independently by hab_mint_titles' own check,
      -- exactly as before this file.
      perform public.hab_mint_titles(p_athlete_id);
      if not exists (select 1 from public.hab_titles t
                     where t.athlete_id = p_athlete_id and t.title = v_title) then
        raise exception 'title not earned: % needs level %', v_title, v_need;
      end if;
    else
      -- An event title. No independent server check exists for event
      -- completion (see the file header) — record it the same way a level
      -- title gets recorded, append-only.
      insert into public.hab_titles (athlete_id, title)
      values (p_athlete_id, v_title)
      on conflict (athlete_id, title) do nothing;
    end if;
  end if;

  update public.leaderboard_optin set title = v_title, updated_at = now()
  where athlete_id = p_athlete_id;
  if not found then raise exception 'join the board first'; end if;
end; $function$;

-- Consistency only — see the header. Functionally inert either way.
update public.xp_rules
set rules = jsonb_set(
  rules, '{passTrack}',
  (select jsonb_agg(case when t ->> 'id' = 't_unbowed' and not (t ? 'lv')
                         then t || '{"lv":0}'::jsonb
                         else t end)
     from jsonb_array_elements(rules -> 'passTrack') t))
where id = 1;

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- BACKFILL — run once, after committing. hab_mint_titles() only runs when an
-- athlete's own app calls it; this catches everyone up right now rather than
-- waiting for each of them to next open the app.
-- ═══════════════════════════════════════════════════════════════════════════
-- select public.hab_mint_titles(athlete_id)
--   from public.athlete_progress
--  where data ? (athlete_id || '_hab_log');
--
-- Verify: every real athlete's hab_titles now matches what hab_season_level
-- says they should have.
--   with base as (select rules from public.xp_rules where id = 1),
--        entries as (
--          select t ->> 'id' as title, (t ->> 'lv')::int as lv
--          from base, jsonb_array_elements(rules -> 'passTrack') t
--          where t ->> 'kind' = 'title' and (t ->> 'lv') is not null and (t ->> 'lv')::int > 0
--        )
--   select a.athlete_id, public.hab_season_level(a.athlete_id) as level,
--          array_agg(e.title order by e.lv) filter (
--            where public.hab_season_level(a.athlete_id) >= e.lv
--              and not exists (select 1 from public.hab_titles h
--                               where h.athlete_id = a.athlete_id and h.title = e.title)
--          ) as still_missing
--     from public.athlete_progress a cross join entries e
--    where a.data ? (a.athlete_id || '_hab_log')
--    group by a.athlete_id;
--   -- still_missing must be NULL for every row.
