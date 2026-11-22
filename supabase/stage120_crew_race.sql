-- stage120_crew_race.sql — the Race on Crew: last 7 days, last 30 days and the season (2026-11-22)
--
-- Amir: "the aim of having leaderboard was for people in the community to be able to challenge themselves against other people and see
-- how consistent they are, how much point they got, in the past 7 days, in the past month and in the whole season / but the leaderbord is
-- too far down". He picked direction A, the race card: under the crew's week, three tabs, the top three, you, and the person to catch.
--
-- What this does:
--   1. career_board_periods(): the two things the card needs that the score did not hold, worked out from the SAME pieces career_compute()
--      already has in hand (the log, the habit rules, the paid facts), so there is still one formula for points:
--        month  = the last 30 days, clamped to the season's start the way the week is: { from, points, days }
--        active = the days a person earned anything, a habit ticked or a fact paid in the season: { wk: '0110101' (the last 7 days,
--                 oldest first, today last), week, month, season } (counts of active days in each window)
--   2. career_compute() appends it to the score by a guarded textual patch (one anchor, raises rather than rewrite a scorer that has moved
--      on). The week, the season and the career are untouched: the same numbers, the same keys.
--   3. Every cached score is worked out again (docs/rules/career.md: a change to how a score is worked out must empty the stamp).
--   4. crew_board(p_limit, p_scope): 'week' | 'month' | 'season' (the default, so a phone that never sends it gets what it always got).
--      It adds `days` (active days in that window) and `wk` (the 7-day string), and always sends the row just above you, so the card can
--      say who to catch even when you are below the limit. Still the crew only (stage91); leaderboard_top() is not touched.
-- No new table. Nothing pays (GAME-6): the board only reads. Safe to re-run.
--
-- The way back: scripts/career/rollback_stage120.sql.

do $stage120_guard$
begin
  if to_regprocedure('public.career_compute(text)') is null or to_regprocedure('public.crew_board(integer)') is null
     and to_regprocedure('public.crew_board(integer, text)') is null or to_regprocedure('public.career_facts_paid(text)') is null
     or to_regprocedure('public.hab_bonus_xp(jsonb, jsonb, date, date, date, jsonb)') is null then
    raise exception 'stage120: career_compute(), crew_board(), career_facts_paid() or hab_bonus_xp() is missing. Nothing was changed.';
  end if;
end $stage120_guard$;

-- ── 1. The month and the active days ────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.career_board_periods(p_athlete text, p_log jsonb, p_cfg jsonb, p_paid jsonb, p_hb jsonb,
                                                       p_season date, p_today date)
returns jsonb
language plpgsql
stable
set search_path to 'public'
as $function$
declare
  v_mfrom date := greatest(p_today - 29, p_season);
  v_wfrom date := greatest(p_today - 6, p_season);
  v_days date[] := '{}';
  r record; d date;
  m_d bigint; m_b bigint; m_r numeric; v_wk text; v_wn int; v_mn int; v_sn int;
begin
  m_d := public.hab_xp(p_log, v_mfrom, p_today, p_paid);
  m_b := public.hab_bonus_xp(p_log, p_cfg, p_season, v_mfrom, p_today, p_hb);
  -- a habit day counts when anything on it is above zero (what hab_xp() pays for); a key that is not a real date is skipped as hab_xp() skips it
  if p_log is not null and jsonb_typeof(p_log) = 'object' then
    for r in select key, value from jsonb_each(p_log) loop
      if jsonb_typeof(r.value) <> 'object' then continue; end if;
      begin d := r.key::date; exception when others then continue; end;
      if d < p_season or d > p_today then continue; end if;
      if exists (select 1 from jsonb_each(r.value) v where jsonb_typeof(v.value) = 'number' and (v.value #>> '{}')::numeric > 0) then
        v_days := v_days || d;
      end if;
    end loop;
  end if;
  with fp as (
    select x.day, x.xp, x.career_only from public.career_facts_paid(p_athlete) x where x.day between p_season and p_today
  ),
  ad as (
    select distinct z.d from (select unnest(v_days) as d union all select fp.day from fp where fp.xp > 0 and not fp.career_only) z
  )
  select coalesce((select sum(fp.xp) from fp where fp.day >= v_mfrom and not fp.career_only), 0),
         (select string_agg(case when exists (select 1 from ad where ad.d = g.d::date) then '1' else '0' end, '' order by g.d)
            from generate_series(p_today - 6, p_today, interval '1 day') as g(d)),
         (select count(*) from ad where ad.d >= v_wfrom)::int,
         (select count(*) from ad where ad.d >= v_mfrom)::int,
         (select count(*) from ad)::int
    into m_r, v_wk, v_wn, v_mn, v_sn;
  return jsonb_build_object(
    'month', jsonb_build_object('from', v_mfrom, 'points', (m_d + m_b + round(m_r))::bigint, 'days', v_mn),
    'active', jsonb_build_object('wk', v_wk, 'week', v_wn, 'month', v_mn, 'season', v_sn));
end $function$;

revoke all on function public.career_board_periods(text, jsonb, jsonb, jsonb, jsonb, date, date) from public, anon, authenticated;
grant execute on function public.career_board_periods(text, jsonb, jsonb, jsonb, jsonb, date, date) to service_role;

-- ── 2. career_compute() carries it ──────────────────────────────────────────────────────────────────────────────────────────────
do $stage120_patch$
declare v_def text; v_old text; v_new text; v_hits int;
begin
  v_old := $a$'week', jsonb_build_object('from', v_wfrom, 'points', (w_d + w_b + round(w_r))::bigint));$a$;
  v_new := $a$'week', jsonb_build_object('from', v_wfrom, 'points', (w_d + w_b + round(w_r))::bigint))
    || public.career_board_periods(p_athlete, v_log, v_cfg, v_paid, v_hb, v_s, v_today);   -- stage120: month and active days$a$;
  select pg_get_functiondef(p.oid) into v_def
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'career_compute';
  if v_def is null then raise exception 'stage120: public.career_compute() not found'; end if;
  if position('career_board_periods' in v_def) > 0 then raise notice 'stage120: career_compute already carries the month'; return; end if;
  v_hits := (length(v_def) - length(replace(v_def, v_old, ''))) / length(v_old);
  if v_hits <> 1 then raise exception 'stage120: the week anchor in career_compute matched % times, expected 1', v_hits; end if;
  execute replace(v_def, v_old, v_new);
end $stage120_patch$;

-- ── 3. Every cached score again ─────────────────────────────────────────────────────────────────────────────────────────────────
do $stage120_rescore$
declare v_id text;
begin
  update public.career_scores set stamp = 'stage120';
  for v_id in select s.athlete_id from public.career_scores s order by 1 loop
    perform public.career_scored(v_id, true);
  end loop;
end $stage120_rescore$;

-- ── 4. crew_board() by period ───────────────────────────────────────────────────────────────────────────────────────────────────
-- The old one-argument function goes: with both, crew_board(p_limit => 25) would be ambiguous.
drop function if exists public.crew_board(integer);

create or replace function public.crew_board(p_limit integer default 25, p_scope text default 'season')
returns table(pos integer, who text, points bigint, level integer, is_me boolean, ck uuid, fv bigint, days integer, wk text)
language plpgsql
security definer
set search_path to 'public'
as $function$
-- stage96: ck and fv. stage120: p_scope, days, wk and the row above you.
declare
  v_me text := public.current_athlete_id();
  v_coach boolean := public.is_coach();
  v_report boolean := coalesce(auth.jwt() ->> 'role', '') in ('', 'service_role');
  v_scope text := case when p_scope in ('week', 'month') then p_scope else 'season' end;
begin
  if v_me is null and not (v_coach or v_report) then
    raise exception 'not signed in';
  end if;
  return query
  with mem as (select * from public.crew_members()),
  sc as (
    select s.athlete_id as aid, s.score
      from public.career_scores_for((select array_agg(m.athlete_id) from mem m), interval '2.5 seconds') s
  ),
  scored as (
    select m.athlete_id as aid, m.name, m.crew_key as ckey,
           coalesce((sc.score #>> array[v_scope, 'points'])::bigint, 0) as x,
           coalesce((sc.score #>> '{career,level}')::int, 1) as lv,
           (sc.score #>> array['active', v_scope])::int as dn,
           sc.score #>> '{active,wk}' as w
      from mem m left join sc on sc.aid = m.athlete_id
  ),
  ranked as (
    select row_number() over (order by s.x desc, lower(s.name) asc) as rn, s.*
      from scored s
  ),
  mine as (select r.rn from ranked r where r.aid is not distinct from v_me)
  select r.rn::int, r.name, r.x, r.lv, (r.aid is not distinct from v_me), r.ckey, public.crew_face_v(r.aid), r.dn, r.w
    from ranked r
   where r.rn <= greatest(1, p_limit) or r.aid is not distinct from v_me or r.rn = (select m.rn - 1 from mine m)
   order by r.rn;
end $function$;

revoke all on function public.crew_board(integer, text) from public, anon, authenticated, service_role;
grant execute on function public.crew_board(integer, text) to authenticated, service_role;
