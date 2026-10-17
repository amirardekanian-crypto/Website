-- The way back from stage69 (Career Mode phase 2, the XP switch): every function stage69 redefined goes back to what it was before (stage66's own
-- text for the career_ functions, the schema snapshot's for AA Proof's), every function and the table it added go, and coach_erase_person()
-- forgets career_scores. Made from those files by the session that wrote stage69 (2026-10-17), and run by scripts/career/rehearse_switch.mjs
-- against the result, so it is tested. On Amir's word only (CLAUDE.md: a change to the live project waits for his yes).
--
-- After it: the rulebook rows stay as they are. Phase 1's functions read a rulebook with no [shadow] table as in shadow, which is what this
-- wants: AA Proof's own scorer and board come back for every athlete. A level kept at the switch (kind level_kept) is voided, not deleted: it
-- pays nothing in phase 1, and stage69 writes it again if the switch is ever turned on again. Seed the phase 1 files after it only with a
-- version number above the newest loaded (career_seed() refuses an older one).
--
-- Run it as one statement batch (the Supabase tool's execute_sql, or the SQL editor). It is safe to run twice.

begin;
-- ── 1. the career_ functions, as stage66 left them ─────────────────────────────────────────────────────────────────
drop function if exists public.career_seed(integer, jsonb, jsonb, text, boolean);
create or replace function public.career_settled_before(p_rules jsonb) returns date
language sql stable set search_path to 'public' as $function$
  select case when coalesce((p_rules #>> '{shadow,on}')::boolean, true) then null
              else current_date - (coalesce((p_rules #>> '{habits,backfill_days}')::int, 3) + 1) end
$function$;

create or replace function public.career_facts_xp(p_athlete text, p_from date, p_to date)
returns table (kind text, n bigint, xp numeric)
language sql stable set search_path to 'public' as $function$
  with r as (select public.career_rules_now() as j),
  f as (
    select f.kind, f.ref, f.day, f.value from public.career_facts f
     where f.athlete_id = p_athlete and f.void_at is null
       and f.kind not in ('habit_done', 'habit_day', 'day_on_target', 'perfect_day', 'workout_tick', 'comeback')
  ),
  priced as (
    select f.*, coalesce(public.career_num(r.j -> 'fact' -> f.kind -> 'xp'), 0) as xp,
           r.j -> 'fact' -> f.kind ->> 'limit_per' as per,
           coalesce(public.career_num(r.j -> 'fact' -> f.kind -> 'limit'), 0) as lim
      from f, r
  ),
  weeks as (select * from public.career_weeks(p_athlete)),
  keyed as (
    select p.*,
           case p.per
             when 'plan_day_week' then
               coalesce((select 'c' || w.cycle_num || '|w' || w.week from weeks w
                          where p.day between w.wfrom and w.wto and (p.value ->> 'plan_day') = any (w.plan)
                          order by w.cstart desc limit 1),
                        'iso:' || to_char(p.day, 'IYYY-IW')) || '|d' || coalesce(p.value ->> 'plan_day', '')
             when 'week' then 'iso:' || to_char(p.day, 'IYYY-IW')
             when 'cycle' then split_part(p.ref, '|', 1)
           end as grp
      from priced p
  ),
  ranked as (
    select k.*, row_number() over (partition by case when k.per = 'plan_day_week' then 'session' else k.kind end, k.grp
                                   order by k.xp desc, k.day, k.ref) as rn
      from keyed k
  )
  select ranked.kind, count(*), sum(ranked.xp)
    from ranked
   where (ranked.grp is null or ranked.rn <= ranked.lim)
     and ranked.day between coalesce(p_from, '-infinity'::date) and coalesce(p_to, 'infinity'::date)
   group by ranked.kind
$function$;

create or replace function public.career_score(p_athlete text, p_season date, p_from date, p_to date) returns jsonb
language plpgsql stable set search_path to 'public' as $function$
declare v_rules jsonb := public.career_habit_rules(); v_log jsonb; v_cfg jsonb; v_daily bigint := 0; v_bonus bigint := 0;
        v_facts jsonb; v_rest numeric;
begin
  if v_rules is null then return null; end if;
  v_log := public.career_log(p_athlete);
  v_cfg := public.career_cfg(p_athlete);
  v_daily := public.hab_xp(v_log, p_from, p_to, v_rules);
  v_bonus := public.hab_bonus_xp(v_log, v_cfg, p_season, p_from, p_to, v_rules);
  select coalesce(jsonb_object_agg(x.kind, jsonb_build_object('n', x.n, 'xp', x.xp)), '{}'::jsonb), coalesce(sum(x.xp), 0)
    into v_facts, v_rest
    from public.career_facts_xp(p_athlete, p_from, p_to) x;
  return jsonb_build_object('habits', jsonb_build_object('daily', v_daily, 'bonus', v_bonus, 'xp', v_daily + v_bonus),
                            'facts', v_facts, 'facts_xp', round(v_rest)::bigint,
                            'xp', (v_daily + v_bonus + round(v_rest))::bigint);
end $function$;

create or replace function public.career_seed(p_version integer, p_rules jsonb, p_catalogue jsonb, p_source text) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare v_newest integer; v_n integer;
begin
  if p_version is null or p_version < 1 then
    raise exception 'the rulebook version must be a whole number from 1';
  end if;
  if jsonb_typeof(p_rules) is distinct from 'object' or public.career_num(p_rules -> 'version') is distinct from p_version then
    raise exception 'the rulebook must be an object whose version is %', p_version;
  end if;
  if jsonb_typeof(p_catalogue) is distinct from 'array' then
    raise exception 'the catalogue must be a JSON array of {kind, id, body}';
  end if;
  select max(r.version) into v_newest from public.career_rules r;
  if v_newest is not null and p_version < v_newest then
    raise exception 'rulebook version % is older than the one loaded (%): nothing was changed', p_version, v_newest;
  end if;
  insert into public.career_rules (version, rules, source, loaded_at) values (p_version, p_rules, p_source, now())
  on conflict (version) do update set rules = excluded.rules, source = excluded.source, loaded_at = now();
  delete from public.career_catalogue;
  insert into public.career_catalogue (kind, id, body, version, loaded_at)
  select x.kind, x.id, x.body, p_version, now()
    from jsonb_to_recordset(p_catalogue) as x(kind text, id text, body jsonb);
  get diagnostics v_n = row_count;
  return jsonb_build_object('version', p_version, 'catalogue', v_n, 'backfill', public.career_backfill(null));
end $function$;

create or replace function public.get_profile(p_athlete_id text default null) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_me text := public.current_athlete_id();
  v_id text := coalesce(nullif(btrim(coalesce(p_athlete_id, '')), ''), v_me);
  v_rules jsonb; v_name text; v_start date; v_career jsonb; v_season jsonb; v_now integer := 0; v_best integer := 0; f record;
begin
  if v_id is null then
    raise exception 'not signed in';
  end if;
  -- the athlete reads their own, the coach anyone's, and so does the SQL editor or the service role (no sign-in claims: a report)
  if not (public.is_coach() or v_id is not distinct from v_me or coalesce(auth.jwt() ->> 'role', '') in ('', 'service_role')) then
    raise exception 'not your profile';
  end if;
  v_rules := public.career_rules_now();
  if v_rules is null then
    return jsonb_build_object('athlete_id', v_id, 'ready', false);
  end if;
  perform public.career_derive(v_id);
  select s.name, s.starts_on into v_name, v_start from public.current_season() s;
  v_career := public.career_score(v_id, null, null, current_date);
  v_season := public.career_score(v_id, coalesce(v_start, '1970-01-01'::date), coalesce(v_start, '1970-01-01'::date), current_date);
  -- weeks held in a row: only a broken week ends a run (a week between cycles, or one Amir paused, is no week at all)
  for f in select cf.kind from public.career_facts cf
            where cf.athlete_id = v_id and cf.void_at is null and cf.kind in ('week_held', 'week_broken')
            order by cf.day, cf.ref loop
    if f.kind = 'week_held' then v_now := v_now + 1; v_best := greatest(v_best, v_now); else v_now := 0; end if;
  end loop;
  return jsonb_build_object(
    'athlete_id', v_id,
    'ready', true,
    'shadow', coalesce((v_rules #>> '{shadow,on}')::boolean, true),
    'rules_version', (select max(r.version) from public.career_rules r),
    'career', v_career || public.career_level((v_career ->> 'xp')::bigint, v_rules),
    'season', jsonb_build_object('name', v_name, 'starts_on', v_start, 'points', (v_season ->> 'xp')::bigint, 'parts', v_season),
    'numbers', (select jsonb_build_object(
                  'weeks_held', jsonb_build_object('now', v_now, 'best', v_best),
                  'sessions_with_amir', count(*) filter (where cf.kind in ('session_finished', 'session_finished_early')),
                  'personal_bests', count(*) filter (where cf.kind = 'personal_best'),
                  'comebacks', count(*) filter (where cf.kind = 'comeback'),
                  'days_on_target', count(*) filter (where cf.kind = 'day_on_target'),
                  'perfect_days', count(*) filter (where cf.kind = 'perfect_day'))
                  from public.career_facts cf where cf.athlete_id = v_id and cf.void_at is null),
    'titles_owned', coalesce((select jsonb_agg(t.title order by t.earned_on, t.title) from public.hab_titles t where t.athlete_id = v_id), '[]'::jsonb),
    'badges', '[]'::jsonb, 'achievements', '[]'::jsonb, 'missions', '[]'::jsonb, 'quest', null, 'moments', '[]'::jsonb
  );
end $function$;

create or replace function public.career_compare(p_season date default null) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_x jsonb; v_r jsonb; v_s date; v_t date := current_date; v_wk date; a record;
  v_log jsonb; v_cfg jsonb; v_cl jsonb; v_cc jsonb; v_rows jsonb := '[]'::jsonb; v_bad integer := 0; v_n integer := 0;
  p_season_xp bigint; c_season_xp bigint; p_week bigint; c_week bigint; p_all bigint; c_all bigint;
  v_probe jsonb; v_facts jsonb; v_row_ok boolean; v_diff jsonb;
begin
  select x.rules into v_x from public.xp_rules x where x.id = 1;
  v_r := public.career_habit_rules();
  if v_x is null or v_r is null then
    raise exception 'nothing to compare: xp_rules or the Career Mode rulebook is missing';
  end if;
  v_s := coalesce(p_season, (select s.starts_on from public.current_season() s), '1970-01-01'::date);
  v_wk := greatest(v_t - 6, v_s);
  select coalesce(jsonb_agg(k.key order by k.key), '[]'::jsonb) into v_diff
    from jsonb_object_keys(v_r) as k(key)
   where k.key <> 'questRuns'
     and public.career_canon(public.career_scoring(k.key, v_r -> k.key)) is distinct from public.career_canon(public.career_scoring(k.key, v_x -> k.key));
  for a in
    select ap.athlete_id, ap.data from public.athlete_progress ap
     where ap.data ? (ap.athlete_id || '_hab_log') order by ap.athlete_id
  loop
    v_n := v_n + 1;
    v_log := public.hab_log_of(a.data, a.athlete_id);
    v_cfg := public.hab_cfg_of(a.data, a.athlete_id);
    v_cl := public.career_log(a.athlete_id);
    v_cc := public.career_cfg(a.athlete_id);
    p_season_xp := public.hab_xp(v_log, v_s, v_t, v_x) + public.hab_bonus_xp(v_log, v_cfg, v_s, v_s, v_t, v_x);
    c_season_xp := public.hab_xp(v_cl, v_s, v_t, v_r) + public.hab_bonus_xp(v_cl, v_cc, v_s, v_s, v_t, v_r);
    p_week := public.hab_xp(v_log, v_wk, v_t, v_x) + public.hab_bonus_xp(v_log, v_cfg, v_s, v_wk, v_t, v_x);
    c_week := public.hab_xp(v_cl, v_wk, v_t, v_r) + public.hab_bonus_xp(v_cl, v_cc, v_s, v_wk, v_t, v_r);
    p_all := public.hab_xp(v_log, '1970-01-01', v_t, v_x) + public.hab_bonus_xp(v_log, v_cfg, '1970-01-01', '1970-01-01', v_t, v_x);
    c_all := public.hab_xp(v_cl, '1970-01-01', v_t, v_r) + public.hab_bonus_xp(v_cl, v_cc, '1970-01-01', '1970-01-01', v_t, v_r);
    v_probe := public.career_probe(v_log, v_cfg, v_s, v_t, v_x);
    select jsonb_build_object(
             'perfect', count(*) filter (where f.kind = 'perfect_day' and f.day between v_s and v_t),
             'on_target', count(*) filter (where f.kind = 'day_on_target' and f.day between v_s and v_t),
             'comebacks', count(*) filter (where f.kind = 'comeback' and f.day between v_s and v_t
                                             and public.career_day(f.value ->> 'prev') >= v_s))
      into v_facts
      from public.career_facts f where f.athlete_id = a.athlete_id and f.void_at is null;
    v_row_ok := p_season_xp = c_season_xp and p_week = c_week and p_all = c_all and v_probe = v_facts;
    if not v_row_ok then v_bad := v_bad + 1; end if;
    v_rows := v_rows || jsonb_build_array(jsonb_build_object(
      'athlete_id', a.athlete_id, 'ok', v_row_ok,
      'season', jsonb_build_object('proof', p_season_xp, 'career', c_season_xp),
      'week', jsonb_build_object('proof', p_week, 'career', c_week),
      'all', jsonb_build_object('proof', p_all, 'career', c_all),
      'probe', jsonb_build_object('proof', v_probe, 'facts', v_facts)));
  end loop;
  return jsonb_build_object('ok', v_bad = 0 and jsonb_array_length(v_diff) = 0, 'season_start', v_s, 'today', v_t,
                            'athletes', v_n, 'matched', v_n - v_bad, 'rules_equal', jsonb_array_length(v_diff) = 0,
                            'rules_differ_on', v_diff, 'rows', v_rows);
end $function$;

-- ── 2. AA Proof's functions, as the schema snapshot had them before stage69 ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.hab_season_level(p_athlete_id text)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_rules jsonb; v_data jsonb; v_start date; v_xp bigint;
begin
  select rules into v_rules from public.xp_rules where id = 1;
  if v_rules is null then return 1; end if;
  select data into v_data from public.athlete_progress where athlete_id = p_athlete_id;
  if v_data is null then return 1; end if;
  select s.starts_on into v_start from public.current_season() s;
  v_start := coalesce(v_start, '1970-01-01'::date);
  v_xp := public.hab_xp(public.hab_log_of(v_data, p_athlete_id),
                        v_start, current_date, v_rules)
        + public.hab_bonus_xp(public.hab_log_of(v_data, p_athlete_id),
                              public.hab_cfg_of(v_data, p_athlete_id),
                              v_start, v_start, current_date, v_rules);
  return public.hab_level(v_xp, v_rules);
end; $function$;

CREATE OR REPLACE FUNCTION public.coach_season_levels(p_ids text[])
 RETURNS TABLE(athlete_id text, level integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_coach() then
    raise exception 'coach only';
  end if;
  return query select x.id, public.hab_season_level(x.id) from unnest(p_ids) as x(id);
end; $function$;

CREATE OR REPLACE FUNCTION public.leaderboard_top(p_athlete_id text, p_key text DEFAULT NULL::text, p_scope text DEFAULT 'season'::text, p_limit integer DEFAULT 10)
 RETURNS TABLE(pos integer, display_name text, title text, xp bigint, level integer, rank_label text, is_me boolean, joined boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_expected text; v_rules jsonb; v_from date; v_to date; v_joined boolean;
  v_season_start date;
begin
  select secret_key into v_expected from public.athlete_keys where athlete_id = p_athlete_id;
  if not public.is_coach() and p_athlete_id is distinct from public.current_athlete_id() and (v_expected is null or p_key is null or p_key is distinct from v_expected) then
    raise exception 'invalid athlete key';
  end if;

  select rules into v_rules from public.xp_rules where id = 1;
  if v_rules is null then return; end if;

  select s.starts_on into v_season_start from public.current_season() s;
  v_season_start := coalesce(v_season_start, '1970-01-01'::date);
  v_to := current_date;

  if p_scope = 'week' then
    v_from := greatest(current_date - 6, v_season_start);
  else
    v_from := v_season_start;
  end if;

  select exists (select 1 from public.leaderboard_optin o where o.athlete_id = p_athlete_id)
    into v_joined;

  return query
  with scored as (
    select o.athlete_id as aid,
           o.display_name as dname,
           o.title as ttl,
           ( public.hab_xp(public.hab_log_of(ap.data, o.athlete_id), v_from, v_to, v_rules)
           + public.hab_bonus_xp(public.hab_log_of(ap.data, o.athlete_id),
                                 public.hab_cfg_of(ap.data, o.athlete_id),
                                 v_season_start, v_from, v_to, v_rules) ) as x
    from public.leaderboard_optin o
    left join public.athlete_progress ap on ap.athlete_id = o.athlete_id
  ),
  ranked as (
    select row_number() over (order by s.x desc, lower(s.dname) asc) as rn, s.*
    from scored s
  )
  select r.rn::int,
         r.dname,
         r.ttl,
         r.x,
         public.hab_level(r.x, v_rules),
         public.hab_rank_label(public.hab_level(r.x, v_rules)),
         (r.aid = p_athlete_id),
         v_joined
  from ranked r
  where r.rn <= greatest(1, p_limit) or r.aid = p_athlete_id
  order by r.rn;
end; $function$;

CREATE OR REPLACE FUNCTION public.hab_close_season(p_ended_on date)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_name text; v_start date; v_title text; v_rules jsonb; v_n integer := 0;
begin
  if not public.is_coach() then
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
  where s.xp > 0
  on conflict (athlete_id, starts_on) do nothing;
  get diagnostics v_n = row_count;

  v_title := 't_sn_' || to_char(v_start, 'YYYYMMDD');
  insert into public.hab_titles (athlete_id, title)
  select r.athlete_id, v_title
  from public.hab_season_results r
  where r.starts_on = v_start and r.level >= 5
  on conflict (athlete_id, title) do nothing;

  return v_n;
end; $function$;

-- ── 3. what stage69 added ──────────────────────────────────────────────────────────────────────────────────────────
drop function if exists public.career_switch_day(jsonb, text);
drop function if exists public.career_xp_on();
drop function if exists public.career_paid_rules(jsonb, jsonb);
drop function if exists public.career_facts_paid(text);
drop function if exists public.career_level_floor(integer, jsonb);
drop function if exists public.career_stamp(text);
drop function if exists public.career_compute(text);
drop function if exists public.career_scored(text, boolean);
drop function if exists public.career_scores_for(text[], interval);
drop function if exists public.hab_proof_level(text);
drop function if exists public.career_keep_levels(date);
update public.career_facts set void_at = now(), updated_at = now() where kind = 'level_kept' and void_at is null;

-- coach_erase_person() forgets career_scores (the reverse of stage69's patch: found exactly once, or nothing is changed)
do $rollback68_patch$
declare
  d text := pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure);
  s_old constant text := '''career_facts'', ''career_scores'']';
  s_new constant text := '''career_facts'']';
  n int;
begin
  if position(s_old in d) = 0 then
    return;      -- not patched: nothing to undo
  end if;
  n := (length(d) - length(replace(d, s_old, ''))) / length(s_old);
  if n <> 1 then
    raise exception 'rollback69: coach_erase_person() holds the patched list % times, not once. Nothing was changed.', n;
  end if;
  execute replace(d, s_old, s_new);
end $rollback68_patch$;

drop table if exists public.career_scores;

-- ── 4. the grants stage66 and the snapshot gave ──────────────────────────────────────────────────────────────────────────
do $rollback68_grants$
declare f text;
begin
  for f in
    select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname like 'career\_%' escape '\'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $rollback68_grants$;
revoke all on function public.get_profile(text) from public, anon, authenticated;
grant execute on function public.get_profile(text) to authenticated, service_role;
revoke all on function public.hab_season_level(p_athlete_id text) from public, anon, authenticated, service_role;
grant execute on function public.hab_season_level(p_athlete_id text) to service_role;
revoke all on function public.coach_season_levels(p_ids text[]) from public, anon, authenticated, service_role;
grant execute on function public.coach_season_levels(p_ids text[]) to authenticated, service_role;
revoke all on function public.leaderboard_top(p_athlete_id text, p_key text, p_scope text, p_limit integer) from public, anon, authenticated, service_role;
grant execute on function public.leaderboard_top(p_athlete_id text, p_key text, p_scope text, p_limit integer) to anon, authenticated, service_role;
revoke all on function public.hab_close_season(p_ended_on date) from public, anon, authenticated, service_role;
grant execute on function public.hab_close_season(p_ended_on date) to service_role;

commit;
