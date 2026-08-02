-- ═══════════════════════════════════════════════════════════════════════════
-- STAGE 25 — THE SEASON RECORD: a season stops being an erasure
--            (and start_season stops being callable by strangers)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Closes XP_SYSTEM.md §12.1, the last open economy decision.
--
-- ⚠️ THIS FILE WAS REWRITTEN AFTER AN ADVERSARIAL REVIEW of its first draft.
-- Four independent reviewers found 20 defects in it, 2 critical. Everything
-- below is the corrected version; the traps are documented where they were,
-- because every one of them is the kind of thing that looks right in a diff.
--
-- ── The problem ────────────────────────────────────────────────────────────
-- A season reset drops every level to 1. Rewards survive (that is the point of
-- CFG.pass.owned being stored) — but a veteran opens day 1 of season 2 with
-- NOTHING NEW TO WANT: nextReward() skips what they own, so a level-21 athlete
-- re-climbs ~20,830 XP, about two months, before the track pays anything.
--
-- And underneath that: the season took their number away and left nothing.
-- Nineteen thousand XP and an OPERATOR rank, gone, no record it happened.
--
-- ── The fix ────────────────────────────────────────────────────────────────
-- 1. THE RECORD. When a season closes, archive every athlete's final standing.
--    The Locker grows a shelf of them. A reset stops deleting your history and
--    starts ARCHIVING it.
-- 2. THE TITLE. Everyone who genuinely played gets a title naming that season.
--    It can never be earned again, which is the one thing the level track
--    cannot offer, and the reason to finish a season rather than coast it.
--
-- Both free to mint, automatic, append-only.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- THE FIVE TRAPS THE REVIEW FOUND. Read these before touching this file.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ⚠️ 1. start_season() HAD NO AUTHORISATION AT ALL. Pre-existing, and nothing
--    to do with the season record — but this file gives it irreversible side
--    effects, so it is fixed here. set_quests(), clear_quests(),
--    set_coach_note() and hide_note() all carry the same coach guard; the one
--    function that resets EVERY ATHLETE'S SCORE did not. The anon key is
--    embedded in habits.html and is meant to be public, so any reader could
--    POST /rest/v1/rpc/start_season and wipe the board. The guard below is
--    copied verbatim from set_quests, including the `auth.jwt() is not null`
--    clause that deliberately lets the SQL editor (which sends no JWT) through.
--
-- ⚠️ 2. A FUTURE-DATED START SILENTLY FROZE THE ARCHIVE WEEKS EARLY.
--    current_season() filters `starts_on <= current_date`, so a row dated next
--    month is invisible to it. `start_season('Season 1','2026-09-01')` — which
--    stage11's own comment and XP_SYSTEM §7 both advertise — would archive
--    everyone at TODAY's numbers with ended_on a month in the future, then
--    return "Pre-Season" to the coach (reading as failure, inviting a re-run
--    that inserts a duplicate row), and the real 4 weeks of play would never be
--    archived at all, because `on conflict do nothing` blocks any correction.
--    Now: future dates are refused outright, and the ordering guard reads
--    max(starts_on) rather than current_season() so a scheduled row cannot be
--    stepped over.
--
-- ⚠️ 3. `level` AND `xp` WERE SCORED OVER DIFFERENT WINDOWS. hab_season_level()
--    is hard-wired to current_season() and current_date; the xp column used the
--    explicit window. On the ordinary same-day call they differ by one day — the
--    level counts today, the xp does not — so the archived pair could not both
--    be true, and the boundary day was counted in BOTH seasons. The level is now
--    derived from the very same xp value with hab_level(), so they cannot drift.
--
-- ⚠️ 4. A `lv: 0` ENTRY IN passTrack IS SELF-AWARDABLE. stage23 made set_title()
--    record lv:0 entries directly, on purpose: event completion is computed
--    client-side and there is no server check to defer to. Registering the
--    season title the same way would have made the level>=5 threshold
--    decorative — any athlete could equip a season title they never earned, and
--    it would then be unrevokable. Season titles are therefore NOT registered
--    in passTrack at all. set_title() gains a third branch: a title it does not
--    recognise is allowed only if the server has ALREADY minted it into
--    hab_titles. Owning it is the permission.
--
-- ⚠️ 5. IT REMOVED THE UNDO. Before this file, a mistaken start_season was
--    repaired with one delete from public.seasons. With an archive written and
--    titles minted, that no longer restores the previous state. undo_season()
--    below puts the undo back, explicitly and coach-only.
--
-- SAFE TO RE-RUN.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ── 0. Two seasons must never share a start date ───────────────────────────
-- public.seasons had no unique constraint, so a duplicated start collapsed two
-- archives onto one primary key and collided their title ids.
create unique index if not exists seasons_starts_on_key on public.seasons (starts_on);

-- ── 1. The archive ─────────────────────────────────────────────────────────
-- One row per athlete per season they played. The rank NAME is deliberately not
-- stored: RANKS, SUBS_PER_RANK and the prestige rule live in habits.html, and
-- duplicating them here would make the rank a third thing scored twice. The
-- client renders it with rankFor(level), the same function the hero uses.
create table if not exists public.hab_season_results (
  athlete_id  text    not null,
  starts_on   date    not null,
  season_name text    not null,
  ended_on    date    not null,
  level       int     not null,
  xp          bigint  not null,
  created_at  timestamptz not null default now(),
  primary key (athlete_id, starts_on)
);
alter table public.hab_season_results enable row level security;
revoke all on public.hab_season_results from public, anon, authenticated;

-- ── 2. Closing a season ────────────────────────────────────────────────────
-- ⚠️ Must run while the outgoing season is still current_season(). start_season
-- is the only intended caller. Coach-guarded in its own right so a stray direct
-- call from the API cannot freeze an archive early.
create or replace function public.hab_close_season(p_ended_on date)
returns integer language plpgsql security definer set search_path = public as $fn$
declare v_name text; v_start date; v_title text; v_rules jsonb; v_n integer := 0;
begin
  if auth.jwt() is not null
     and (auth.jwt() ->> 'email') is distinct from 'amirardekanian@gmail.com' then
    raise exception 'coach only';
  end if;

  select name, starts_on into v_name, v_start from public.current_season();
  if v_start is null then return 0; end if;
  if p_ended_on < v_start then
    raise exception 'a season cannot end (%) before it started (%)', p_ended_on, v_start;
  end if;
  if p_ended_on > current_date then
    raise exception 'cannot archive a season that has not finished yet (ends %, today is %)',
                    p_ended_on, current_date;
  end if;
  select rules into v_rules from public.xp_rules where id = 1;

  -- ⚠️ ONE window, ONE xp value, and the level DERIVED from it — never
  -- hab_season_level(), which scores to current_date. See trap 3.
  with scored as (
    select a.athlete_id,
           public.hab_xp(public.hab_log_of(a.data, a.athlete_id), v_start, p_ended_on, v_rules)
         + public.hab_bonus_xp(public.hab_log_of(a.data, a.athlete_id),
                               public.hab_cfg_of(a.data, a.athlete_id),
                               v_start, v_start, p_ended_on, v_rules) as xp
    from public.athlete_progress a
    where a.data ? (a.athlete_id || '_hab_log')
  )
  insert into public.hab_season_results (athlete_id, starts_on, season_name, ended_on, level, xp)
  select s.athlete_id, v_start, v_name, p_ended_on,
         public.hab_level(s.xp::bigint, v_rules), s.xp
  from scored s
  where s.xp > 0                          -- a row of zeroes is not a season anyone played
  on conflict (athlete_id, starts_on) do nothing;
  get diagnostics v_n = row_count;

  -- ── The title ───────────────────────────────────────────────────────────
  -- ⚠️ NOT registered in passTrack. See trap 4: an entry there is equippable by
  -- anyone, which would make the threshold below meaningless. set_title()
  -- instead accepts any title the server has already minted here.
  v_title := 't_sn_' || to_char(v_start, 'YYYYMMDD');
  insert into public.hab_titles (athlete_id, title)
  select r.athlete_id, v_title
  from public.hab_season_results r
  where r.starts_on = v_start and r.level >= 5
  on conflict (athlete_id, title) do nothing;

  return v_n;
end; $fn$;
revoke all on function public.hab_close_season(date) from public, anon, authenticated;

-- ── 3. start_season, guarded and ordered ───────────────────────────────────
create or replace function public.start_season(p_name text, p_starts_on date default current_date)
returns table(name text, starts_on date)
language plpgsql security definer set search_path to 'public' as $function$
declare v_latest date; v_n integer;
begin
  -- Trap 1. Same guard as set_quests(): a null JWT is the SQL editor.
  if auth.jwt() is not null
     and (auth.jwt() ->> 'email') is distinct from 'amirardekanian@gmail.com' then
    raise exception 'coach only';
  end if;

  if coalesce(btrim(p_name), '') = '' then
    raise exception 'a season needs a name';
  end if;

  -- Trap 2. No future starts: the archive is written at the moment of the call,
  -- so a season that has not ended yet cannot be honestly recorded.
  if p_starts_on > current_date then
    raise exception 'a season cannot start in the future (%) — run this on the day it begins', p_starts_on;
  end if;

  -- max(starts_on), NOT current_season(): the latter cannot see a future row.
  select max(s.starts_on) into v_latest from public.seasons s;
  if v_latest is not null and p_starts_on <= v_latest then
    raise exception 'the new season (%) must start after the latest one (%)', p_starts_on, v_latest;
  end if;

  -- Archive the outgoing season while it is still the current one.
  v_n := public.hab_close_season(p_starts_on - 1);
  raise notice 'archived % athlete season record(s)', v_n;

  insert into public.seasons (name, starts_on) values (btrim(p_name), p_starts_on);
  return query select * from public.current_season();
end; $function$;

-- ── 4. Putting the undo back ───────────────────────────────────────────────
-- Trap 5. Removes a season and everything this file wrote for the season it
-- closed, so a mistaken start_season is one command to reverse again.
-- ⚠️ It does NOT un-mint titles — nothing in this app may ever revoke a reward
-- (CLAUDE.md, "The long game"). An athlete who briefly held a season title
-- keeps it. That is the intended asymmetry, not an oversight.
create or replace function public.undo_season(p_starts_on date)
returns text language plpgsql security definer set search_path = public as $fn$
declare v_prev date; v_arch int; v_seas int;
begin
  if auth.jwt() is not null
     and (auth.jwt() ->> 'email') is distinct from 'amirardekanian@gmail.com' then
    raise exception 'coach only';
  end if;
  select max(s.starts_on) into v_prev from public.seasons s where s.starts_on < p_starts_on;
  delete from public.seasons where starts_on = p_starts_on;
  get diagnostics v_seas = row_count;
  if v_seas = 0 then return 'no season starts on ' || p_starts_on; end if;
  delete from public.hab_season_results where starts_on = v_prev;
  get diagnostics v_arch = row_count;
  return format('removed season %s and %s archived record(s) for the season starting %s; '
             || 'titles already minted are kept, by design', p_starts_on, v_arch, v_prev);
end; $fn$;
revoke all on function public.undo_season(date) from public, anon, authenticated;

-- ── 5. set_title: a third branch for server-minted titles ──────────────────
-- Trap 4. Unchanged for the level track and for event titles; the new `else`
-- is what lets a season title be worn without ever being registered in
-- passTrack, and therefore without being self-awardable.
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

    if v_entry is null then
      -- Not on the track at all. Allowed only if the SERVER already minted it
      -- — a season title. Owning it is the permission; there is no path here
      -- that creates one.
      if not exists (select 1 from public.hab_titles t
                     where t.athlete_id = p_athlete_id and t.title = v_title) then
        raise exception 'unknown title';
      end if;
    else
      v_need := nullif(v_entry ->> 'lv', '')::int;
      if v_need is not null and v_need > 0 then
        perform public.hab_mint_titles(p_athlete_id);
        if not exists (select 1 from public.hab_titles t
                       where t.athlete_id = p_athlete_id and t.title = v_title) then
          raise exception 'title not earned: % needs level %', v_title, v_need;
        end if;
      else
        -- An event title: completion is computed client-side and there is no
        -- server check to defer to, so this records on trust. Unchanged.
        insert into public.hab_titles (athlete_id, title)
        values (p_athlete_id, v_title)
        on conflict (athlete_id, title) do nothing;
      end if;
    end if;
  end if;

  update public.leaderboard_optin set title = v_title, updated_at = now()
  where athlete_id = p_athlete_id;
  if not found then raise exception 'join the board first'; end if;
end; $function$;

-- ── 6. Reading it back ─────────────────────────────────────────────────────
-- The athlete's own record. `title` is non-null ONLY where the title was
-- actually minted, so the Locker never advertises one they did not get.
create or replace function public.season_record(p_athlete_id text, p_key text default null)
returns table(starts_on date, season_name text, ended_on date, level int, xp bigint, title text)
language plpgsql security definer set search_path = public as $fn$
declare v_expected text;
begin
  select secret_key into v_expected from public.athlete_keys where athlete_id = p_athlete_id;
  if v_expected is not null and (p_key is distinct from v_expected) then
    raise exception 'invalid athlete key';
  end if;
  return query
    select r.starts_on, r.season_name, r.ended_on, r.level, r.xp,
           t.title
    from public.hab_season_results r
    left join public.hab_titles t
      on t.athlete_id = r.athlete_id
     and t.title = 't_sn_' || to_char(r.starts_on, 'YYYYMMDD')
    where r.athlete_id = p_athlete_id
    order by r.starts_on desc;
end; $fn$;
revoke all on function public.season_record(text, text) from public;
grant execute on function public.season_record(text, text) to anon, authenticated;

-- ── 7. Every season's name, so ANY athlete can resolve a t_sn_ title ───────
-- Without this a season title renders as blank on the leaderboard and the roll
-- call wall for everyone except the athlete wearing it — they are the only one
-- with that row in their own record. Season names are not secret.
create or replace function public.season_list()
returns table(starts_on date, name text)
language sql stable security definer set search_path = public as $fn$
  select s.starts_on, s.name from public.seasons s order by s.starts_on;
$fn$;
revoke all on function public.season_list() from public;
grant execute on function public.season_list() to anon, authenticated;

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- DRY RUN — the numbers start_season would ACTUALLY freeze if run today.
-- Read-only. This is the same expression hab_close_season uses, including the
-- ended_on = yesterday window, so what it prints is what gets archived.
-- ═══════════════════════════════════════════════════════════════════════════
--   with r as (select rules from public.xp_rules where id = 1),
--        s as (select name, starts_on from public.current_season())
--   select a.athlete_id,
--          public.hab_xp(public.hab_log_of(a.data, a.athlete_id),
--                        (select starts_on from s), current_date - 1, (select rules from r))
--        + public.hab_bonus_xp(public.hab_log_of(a.data, a.athlete_id),
--                              public.hab_cfg_of(a.data, a.athlete_id),
--                              (select starts_on from s), (select starts_on from s),
--                              current_date - 1, (select rules from r)) as final_xp,
--          public.hab_level(
--            (public.hab_xp(public.hab_log_of(a.data, a.athlete_id),
--                           (select starts_on from s), current_date - 1, (select rules from r))
--           + public.hab_bonus_xp(public.hab_log_of(a.data, a.athlete_id),
--                                 public.hab_cfg_of(a.data, a.athlete_id),
--                                 (select starts_on from s), (select starts_on from s),
--                                 current_date - 1, (select rules from r)))::bigint,
--            (select rules from r)) as final_level
--     from public.athlete_progress a
--    where a.data ? (a.athlete_id || '_hab_log')
--    order by 2 desc;
--
-- Then, when it is genuinely time:
--   select public.start_season('Season 1');
-- ...and if that was a mistake:
--   select public.undo_season('<the date it started>');
