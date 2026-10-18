-- The way back from stage70 (Career Mode phase 3, rewards and the catalogue switch; spec §5.6). On Amir's word only (CLAUDE.md: a change to
-- the live project waits for his yes), after a backup (coach.html → ⚙ Tools → ⤓ Backup).
--
-- Two modes, one file. The first statement after `begin` names the mode: 'dry' (as written) does everything below inside the one transaction
-- and then raises an error that carries the report (what a real run would do, athlete by athlete), so the transaction is undone and nothing is
-- changed; change it to 'real' to keep it. (A psql `\set` cannot be used: the Supabase tool's execute_sql and the SQL editor run plain SQL.)
-- Run it as one statement batch. After a dry run in a session that keeps going (a rehearsal), send `rollback`.
--
-- What it does:
--   1. copies career_awards and career_recognition to backup.career_awards_<yyyymmdd> and backup.career_recognition_<yyyymmdd>;
--   2. works out every athlete's score WITH the awards (rb_before);
--   3. turns the catalogue switch off in the newest rulebook (career_seed() refuses that; this file is the only door) and empties
--      career_scores (every score is worked out again, no stale row served);
--   4. puts back every function stage70 replaced, as the schema snapshot had it before stage70 (stage66 and stage69 applied);
--   5. nobody's level goes down: an athlete whose career XP is now lower gets ONE level_kept fact, ref 'catalogue-rollback', worth the
--      difference ([fact.level_kept]: xp_from = "value", career_only, so it is no season's points);
--   6. drops every function stage70 added; 7. takes career_awards and career_recognition out of coach_erase_person()'s list;
--   8. drops the two tables, backup.career_catalogue_before, career_scores.rewards and career_facts_kind_idx;
--   9. leaves hab_titles as it is (a title minted from an award is owned; set_title() still accepts it);
--  10. repeats the grants; then the report. Check `select public.career_compare()` is ok afterwards.
--  11. In the same sitting, commit career/rulebook.toml with [switch] catalogue = "off" (the file must say what the server says).
-- The apps fall back by themselves: get_profile() answers switch.catalogue null and badges [], so catalogueOn() is false (and neither
-- calls get_awards(), which this file drops, while it is).
-- Safe to run twice (a second run finds nothing of stage70 and changes nothing but the switch it already turned off).

begin;
select set_config('career.rollback70', 'dry', true);   -- 'dry' or 'real'

-- ── 1. the copies ─────────────────────────────────────────────────────────────────────────────────────────────────────
create schema if not exists backup;
do $rb70_copy$
declare v_day text := to_char(current_date, 'YYYYMMDD');
begin
  if to_regclass('public.career_awards') is not null then
    execute format('drop table if exists backup.%I', 'career_awards_' || v_day);
    execute format('create table backup.%I as select * from public.career_awards', 'career_awards_' || v_day);
  end if;
  if to_regclass('public.career_recognition') is not null then
    execute format('drop table if exists backup.%I', 'career_recognition_' || v_day);
    execute format('create table backup.%I as select * from public.career_recognition', 'career_recognition_' || v_day);
  end if;
end $rb70_copy$;

-- ── 2. every athlete's score with the awards ──────────────────────────────────────────────────────────────────────────
drop table if exists pg_temp.rb_before;
create temp table rb_before as
select z.id, public.career_compute(z.id) as s
  from (select ap.athlete_id as id from public.athlete_progress ap where ap.data ? (ap.athlete_id || '_hab_log')
        union select r.athlete_id from public.hab_season_results r
        union select f.athlete_id from public.career_facts f where f.void_at is null) z;

-- ── 3. the switch off, the cache empty ────────────────────────────────────────────────────────────────────────────────
update public.career_rules set rules = jsonb_set(rules, '{switch,catalogue}', '"off"'::jsonb, true), loaded_at = now()
 where version = (select max(version) from public.career_rules) and rules ? 'switch';
truncate public.career_scores;

-- ── 4. the functions stage70 replaced, as the live project had them before it (supabase/schema_snapshot.sql) ──────────
CREATE OR REPLACE FUNCTION public.career_sync(p_athlete text, p_kinds text[], p_want jsonb, p_source text, p_refs text[] DEFAULT NULL::text[], p_settled_before date DEFAULT NULL::date)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_up integer; v_gone integer;
begin
  with w as (
    select distinct on (x.kind, x.ref) x.kind, x.ref, x.day, coalesce(x.value, '{}'::jsonb) as value
      from jsonb_to_recordset(coalesce(p_want, '[]'::jsonb)) as x(kind text, ref text, day date, value jsonb)
     where x.kind = any (p_kinds) and x.ref is not null and x.day is not null
     order by x.kind, x.ref
  ), up as (
    insert into public.career_facts as f (athlete_id, kind, ref, day, value, source)
    select p_athlete, w.kind, w.ref, w.day, w.value, p_source from w
    on conflict (athlete_id, kind, ref) do update
       set day = excluded.day, value = excluded.value, source = excluded.source, void_at = null, updated_at = now()
     where (f.day is distinct from excluded.day or f.value is distinct from excluded.value
            or f.source is distinct from excluded.source or f.void_at is not null)
       and (p_settled_before is null or f.day >= p_settled_before)
    returning 1
  )
  select count(*) into v_up from up;

  with w as (
    select x.kind, x.ref
      from jsonb_to_recordset(coalesce(p_want, '[]'::jsonb)) as x(kind text, ref text, day date, value jsonb)
     where x.kind = any (p_kinds)
  ), gone as (
    update public.career_facts f set void_at = now(), updated_at = now()
     where f.athlete_id = p_athlete and f.kind = any (p_kinds) and f.void_at is null
       and (p_refs is null or f.ref = any (p_refs))
       and (p_settled_before is null or f.day >= p_settled_before)
       and not exists (select 1 from w where w.kind = f.kind and w.ref = f.ref)
    returning 1
  )
  select count(*) into v_gone from gone;
  return v_up + v_gone;
end $function$;

CREATE OR REPLACE FUNCTION public.career_facts_paid(p_athlete text)
 RETURNS TABLE(kind text, ref text, day date, xp numeric, career_only boolean)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  with r as (select public.career_rules_now() as j),
  f as (
    select f.kind, f.ref, f.day, f.value from public.career_facts f
     where f.athlete_id = p_athlete and f.void_at is null
       and f.kind not in ('habit_done', 'habit_day', 'day_on_target', 'perfect_day', 'workout_tick', 'comeback')
  ),
  priced as (
    select f.*,
           case when r.j -> 'fact' -> f.kind ->> 'xp_from' = 'value' then coalesce(public.career_num(f.value -> 'xp'), 0)
                else coalesce(public.career_num(r.j -> 'fact' -> f.kind -> 'xp'), 0) end as xp,
           coalesce(r.j -> 'fact' -> f.kind -> 'career_only' = 'true'::jsonb, false) as conly,
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
  select ranked.kind, ranked.ref, ranked.day, ranked.xp, ranked.conly
    from ranked
   where ranked.grp is null or ranked.rn <= ranked.lim
$function$;

CREATE OR REPLACE FUNCTION public.career_stamp(p_athlete text)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select md5(concat_ws('|',
    (select r.version::text || '@' || r.loaded_at::text from public.career_rules r order by r.version desc limit 1),
    (select md5(coalesce(x.rules -> 'questRuns', '[]'::jsonb)::text) from public.xp_rules x where x.id = 1),
    (select s.starts_on::text from public.current_season() s),
    current_date::text,
    (select count(*)::text || '@' || coalesce(max(f.updated_at)::text, '-') from public.career_facts f where f.athlete_id = p_athlete),
    (select p.updated_at::text from public.programs p where p.athlete_id = p_athlete),
    (select count(*)::text || '@' || coalesce(max(v.saved_at)::text, '-') from public.program_versions v where v.athlete_id = p_athlete)))
$function$;

CREATE OR REPLACE FUNCTION public.career_score(p_athlete text, p_season date, p_from date, p_to date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare v_rules jsonb := public.career_habit_rules(); v_paid jsonb; v_log jsonb; v_cfg jsonb; v_daily bigint := 0; v_bonus bigint := 0;
        v_facts jsonb; v_rest numeric;
begin
  if v_rules is null then return null; end if;
  v_paid := public.career_paid_rules(v_rules, public.career_rules_now());
  v_log := public.career_log(p_athlete);
  v_cfg := public.career_cfg(p_athlete);
  v_daily := public.hab_xp(v_log, p_from, p_to, v_paid);
  v_bonus := public.hab_bonus_xp(v_log, v_cfg, p_season, p_from, p_to, v_rules);
  select coalesce(jsonb_object_agg(x.kind, jsonb_build_object('n', x.n, 'xp', x.xp)), '{}'::jsonb), coalesce(sum(x.xp), 0)
    into v_facts, v_rest
    from public.career_facts_xp(p_athlete, p_from, p_to) x;
  return jsonb_build_object('habits', jsonb_build_object('daily', v_daily, 'bonus', v_bonus, 'xp', v_daily + v_bonus),
                            'facts', v_facts, 'facts_xp', round(v_rest)::bigint,
                            'xp', (v_daily + v_bonus + round(v_rest))::bigint);
end $function$;

CREATE OR REPLACE FUNCTION public.career_compute(p_athlete text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare
  v_rules jsonb := public.career_rules_now(); v_hr jsonb; v_paid jsonb; v_log jsonb; v_cfg jsonb;
  v_name text; v_start date; v_s date; v_wfrom date; v_today date := current_date;
  c_d bigint; c_b bigint; s_d bigint; s_b bigint; w_d bigint; w_b bigint;
  c_f jsonb; c_r numeric; s_f jsonb; s_r numeric; w_r numeric; v_cxp bigint; v_sxp bigint;
begin
  if v_rules is null or p_athlete is null then return null; end if;
  v_hr := public.career_habit_rules();
  v_paid := public.career_paid_rules(v_hr, v_rules);
  v_log := public.career_log(p_athlete);
  v_cfg := public.career_cfg(p_athlete);
  select s.name, s.starts_on into v_name, v_start from public.current_season() s;
  v_s := coalesce(v_start, '1970-01-01'::date);
  v_wfrom := greatest(v_today - 6, v_s);
  c_d := public.hab_xp(v_log, null, v_today, v_paid);
  c_b := public.hab_bonus_xp(v_log, v_cfg, null, null, v_today, v_hr);
  s_d := public.hab_xp(v_log, v_s, v_today, v_paid);
  s_b := public.hab_bonus_xp(v_log, v_cfg, v_s, v_s, v_today, v_hr);
  w_d := public.hab_xp(v_log, v_wfrom, v_today, v_paid);
  w_b := public.hab_bonus_xp(v_log, v_cfg, v_s, v_wfrom, v_today, v_hr);
  with p as (select x.* from public.career_facts_paid(p_athlete) x where x.day <= v_today)
  select coalesce((select jsonb_object_agg(z.kind, jsonb_build_object('n', z.n, 'xp', z.xp))
                     from (select p.kind, count(*) as n, sum(p.xp) as xp from p group by p.kind) z), '{}'::jsonb),
         coalesce((select sum(p.xp) from p), 0),
         coalesce((select jsonb_object_agg(z.kind, jsonb_build_object('n', z.n, 'xp', z.xp))
                     from (select p.kind, count(*) as n, sum(p.xp) as xp from p where p.day >= v_s and not p.career_only group by p.kind) z),
                  '{}'::jsonb),
         coalesce((select sum(p.xp) from p where p.day >= v_s and not p.career_only), 0),
         coalesce((select sum(p.xp) from p where p.day >= v_wfrom and not p.career_only), 0)
    into c_f, c_r, s_f, s_r, w_r;
  v_cxp := (c_d + c_b + round(c_r))::bigint;
  v_sxp := (s_d + s_b + round(s_r))::bigint;
  return jsonb_build_object(
    'career', jsonb_build_object('habits', jsonb_build_object('daily', c_d, 'bonus', c_b, 'xp', c_d + c_b),
                                 'facts', c_f, 'facts_xp', round(c_r)::bigint, 'xp', v_cxp)
              || public.career_level(v_cxp, v_rules),
    'season', jsonb_build_object('name', v_name, 'starts_on', v_start, 'points', v_sxp,
                                 'parts', jsonb_build_object('habits', jsonb_build_object('daily', s_d, 'bonus', s_b, 'xp', s_d + s_b),
                                                             'facts', s_f, 'facts_xp', round(s_r)::bigint, 'xp', v_sxp)),
    'week', jsonb_build_object('from', v_wfrom, 'points', (w_d + w_b + round(w_r))::bigint));
end $function$;

CREATE OR REPLACE FUNCTION public.career_scored(p_athlete text, p_recompute boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
declare v_stamp text; v_old text; v_score jsonb;
begin
  if p_athlete is null or public.career_rules_now() is null then return null; end if;
  v_stamp := public.career_stamp(p_athlete);
  select c.stamp, c.score into v_old, v_score from public.career_scores c where c.athlete_id = p_athlete;
  if v_old = v_stamp then return v_score; end if;
  if v_old is not null and not p_recompute then return v_score || '{"stale": true}'::jsonb; end if;
  v_score := public.career_compute(p_athlete);
  if v_score is null then return null; end if;
  insert into public.career_scores as c (athlete_id, stamp, score, updated_at) values (p_athlete, v_stamp, v_score, now())
  on conflict on constraint career_scores_pkey do update set stamp = excluded.stamp, score = excluded.score, updated_at = now();
  return v_score;
end $function$;

CREATE OR REPLACE FUNCTION public.career_scores_for(p_ids text[], p_budget interval DEFAULT '00:00:02.5'::interval)
 RETURNS TABLE(athlete_id text, score jsonb)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
declare v_t0 timestamptz := clock_timestamp(); v_id text; v_stamp text; v_old text; v_cached jsonb; v_score jsonb;
begin
  if public.career_rules_now() is null then return; end if;
  for v_id in select distinct x.id from unnest(coalesce(p_ids, '{}'::text[])) as x(id) where x.id is not null order by 1 loop
    v_stamp := public.career_stamp(v_id);
    v_old := null; v_cached := null;
    select c.stamp, c.score into v_old, v_cached from public.career_scores c where c.athlete_id = v_id;
    if v_old is not null and (v_old = v_stamp or clock_timestamp() - v_t0 > p_budget) then
      athlete_id := v_id; score := v_cached; return next;
      continue;
    end if;
    v_score := public.career_compute(v_id);
    if v_score is null then continue; end if;
    insert into public.career_scores as c (athlete_id, stamp, score, updated_at) values (v_id, v_stamp, v_score, now())
    on conflict on constraint career_scores_pkey do update set stamp = excluded.stamp, score = excluded.score, updated_at = now();
    athlete_id := v_id; score := v_score; return next;
  end loop;
end $function$;

CREATE OR REPLACE FUNCTION public.career_keep_levels(p_day date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_rules jsonb := public.career_rules_now(); a record; v_rows jsonb := '[]'::jsonb;
  v_record integer; v_now integer; v_best integer; v_xp bigint; v_raw bigint; v_lv integer; v_kept bigint; v_had jsonb;
begin
  if v_rules is null or public.career_switch_day(v_rules, 'xp') is null then
    raise exception 'career_keep_levels: the XP switch is not on (rulebook.toml → [switch] xp)';
  end if;
  for a in
    select z.id,
           coalesce(nullif(btrim(concat_ws(' ', p.data #>> '{athlete,firstName}', p.data #>> '{athlete,lastName}')), ''), o.display_name) as name,
           exists (select 1 from public.athlete_progress ap where ap.athlete_id = z.id and ap.data ? (z.id || '_hab_log')) as has_log
      from (select ap.athlete_id as id from public.athlete_progress ap where ap.data ? (ap.athlete_id || '_hab_log')
            union select r.athlete_id from public.hab_season_results r
            union select f.athlete_id from public.career_facts f where f.void_at is null) z
      left join public.programs p on p.athlete_id = z.id
      left join public.leaderboard_optin o on o.athlete_id = z.id
     order by z.id
  loop
    v_record := (select max(r.level) from public.hab_season_results r where r.athlete_id = a.id);
    v_now := case when a.has_log then public.hab_proof_level(a.id) end;
    v_best := greatest(coalesce(v_record, 0), coalesce(v_now, 0));
    select f.value into v_had from public.career_facts f
     where f.athlete_id = a.id and f.kind = 'level_kept' and f.ref = 'xp-switch' and f.void_at is null;
    v_xp := coalesce((public.career_score(a.id, null, null, current_date) ->> 'xp')::bigint, 0);
    v_raw := v_xp - coalesce(public.career_num(v_had -> 'xp'), 0)::bigint;          -- the career without the level kept
    v_lv := (public.career_level(v_raw, v_rules) ->> 'level')::int;
    v_kept := coalesce(public.career_num(v_had -> 'xp'), 0)::bigint;
    if v_had is null and v_best > v_lv then
      v_kept := public.career_level_floor(v_best, v_rules) - v_raw;
      insert into public.career_facts (athlete_id, kind, ref, day, value, source)
      values (a.id, 'level_kept', 'xp-switch', p_day,
              jsonb_strip_nulls(jsonb_build_object('xp', v_kept, 'level', v_best, 'was', v_lv,
                                                   'proof_record', v_record, 'proof_now', v_now)), 'server')
      on conflict (athlete_id, kind, ref) do update
         set day = excluded.day, value = excluded.value, source = excluded.source, void_at = null, updated_at = now();
    end if;
    v_rows := v_rows || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'athlete_id', a.id, 'name', a.name, 'proof_now', v_now, 'proof_record', v_record,
      'career_xp', v_raw, 'career_level', v_lv, 'kept_xp', nullif(v_kept, 0),
      'level', (public.career_level(v_raw + v_kept, v_rules) ->> 'level')::int)));
  end loop;
  return v_rows;
end $function$;

CREATE OR REPLACE FUNCTION public.career_seed(p_version integer, p_rules jsonb, p_catalogue jsonb, p_source text, p_dry_run boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_newest integer; v_n integer; v_old jsonb := public.career_rules_now(); v_which text; v_was date; v_will text;
  v_xp_on date; v_turn_on boolean; v_same boolean; v_backfill jsonb; v_levels jsonb; v_out jsonb;
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
  foreach v_which in array array['xp', 'catalogue'] loop
    v_will := p_rules #>> array['switch', v_which];
    v_was := public.career_switch_day(v_old, v_which);
    if v_will is not null and v_will <> 'off' and v_will !~ '^\d{4}-\d{2}-\d{2}$' then
      raise exception 'rulebook.toml → [switch] % must be "off" or a day (YYYY-MM-DD), found %: nothing was changed', v_which, v_will;
    end if;
    if v_will ~ '^\d{4}-\d{2}-\d{2}$' and v_will::date > current_date then
      raise exception 'rulebook.toml → [switch] % is %, a day still to come: turn a switch on on the day it happens. Nothing was changed', v_which, v_will;
    end if;
    if v_was is not null and coalesce(v_will, 'off') = 'off' then
      raise exception 'the % switch is on (since %) and is never turned back off: it would take every athlete''s level back. Nothing was changed (the way back is scripts/career/rollback_stage69.sql, on Amir''s word)', v_which, v_was;
    end if;
  end loop;
  if public.career_switch_day(p_rules, 'catalogue') is not null and public.career_switch_day(p_rules, 'xp') is null then
    raise exception 'the catalogue switch (phase 3) needs the XP switch (phase 2) on first: nothing was changed';
  end if;
  v_xp_on := public.career_switch_day(p_rules, 'xp');
  v_turn_on := v_xp_on is not null and public.career_switch_day(v_old, 'xp') is null;
  v_same := v_old is not null
        and (v_old - 'version' - 'switch' - 'shadow') = (p_rules - 'version' - 'switch' - 'shadow')
        and (select md5(coalesce(string_agg(c.kind || '|' || c.id || '|' || c.body::text, ',' order by c.kind, c.id), ''))
               from public.career_catalogue c)
          = (select md5(coalesce(string_agg(x.kind || '|' || x.id || '|' || x.body::text, ',' order by x.kind, x.id), ''))
               from jsonb_to_recordset(p_catalogue) as x(kind text, id text, body jsonb));

  begin
    insert into public.career_rules (version, rules, source, loaded_at) values (p_version, p_rules, p_source, now())
    on conflict (version) do update set rules = excluded.rules, source = excluded.source, loaded_at = now();
    delete from public.career_catalogue;
    insert into public.career_catalogue (kind, id, body, version, loaded_at)
    select x.kind, x.id, x.body, p_version, now()
      from jsonb_to_recordset(p_catalogue) as x(kind text, id text, body jsonb);
    get diagnostics v_n = row_count;
    v_backfill := case when v_same then jsonb_build_object('skipped', 'only a switch changed: no fact depends on it')
                       else public.career_backfill(null) end;
    if v_turn_on then
      v_levels := public.career_keep_levels(v_xp_on);
    end if;
    v_out := jsonb_strip_nulls(jsonb_build_object(
      'version', p_version, 'catalogue', v_n, 'backfill', v_backfill,
      'switch', jsonb_build_object('xp', coalesce(v_xp_on::text, 'off'),
                                   'catalogue', coalesce(public.career_switch_day(p_rules, 'catalogue')::text, 'off')),
      'turned_on', case when v_turn_on then 'xp' end,
      'levels', v_levels));
    if p_dry_run then
      raise exception using errcode = 'P0001', message = 'career_seed: dry run';
    end if;
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'career_seed: dry run' then
      raise;
    end if;
    v_out := v_out || jsonb_build_object('dry_run', true, 'note', 'a dry run: everything above was worked out, then undone');
  end;
  return v_out;
end $function$;

CREATE OR REPLACE FUNCTION public.get_profile(p_athlete_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me text := public.current_athlete_id();
  v_id text := coalesce(nullif(btrim(coalesce(p_athlete_id, '')), ''), v_me);
  v_rules jsonb; v_score jsonb; v_now integer := 0; v_best integer := 0; f record; v_xp date;
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
  v_score := coalesce(public.career_scored(v_id), '{}'::jsonb);
  v_xp := public.career_switch_day(v_rules, 'xp');
  -- weeks held in a row: only a broken week ends a run (a week between cycles, or one Amir paused, is no week at all)
  for f in select cf.kind from public.career_facts cf
            where cf.athlete_id = v_id and cf.void_at is null and cf.kind in ('week_held', 'week_broken')
            order by cf.day, cf.ref loop
    if f.kind = 'week_held' then v_now := v_now + 1; v_best := greatest(v_best, v_now); else v_now := 0; end if;
  end loop;
  return jsonb_build_object(
    'athlete_id', v_id,
    'ready', true,
    'shadow', v_xp is null,
    'switch', jsonb_build_object('xp', v_xp, 'catalogue', public.career_switch_day(v_rules, 'catalogue')),
    'rules_version', (select max(r.version) from public.career_rules r),
    'career', v_score -> 'career',
    'season', v_score -> 'season',
    'week', v_score -> 'week',
    'since', (select min(cf.day) from public.career_facts cf
               where cf.athlete_id = v_id and cf.void_at is null
                 and cf.kind in ('habit_day', 'session_finished', 'session_finished_early', 'library_session')),
    'kept', (select cf.value from public.career_facts cf
              where cf.athlete_id = v_id and cf.kind = 'level_kept' and cf.ref = 'xp-switch' and cf.void_at is null),
    'numbers', (select jsonb_build_object(
                  'weeks_held', jsonb_build_object('now', v_now, 'best', v_best),
                  'sessions_with_amir', count(*) filter (where cf.kind in ('session_finished', 'session_finished_early')),
                  'personal_bests', count(*) filter (where cf.kind = 'personal_best'),
                  'comebacks', count(*) filter (where cf.kind = 'comeback'),
                  'days_on_target', count(*) filter (where cf.kind = 'day_on_target'),
                  'perfect_days', count(*) filter (where cf.kind = 'perfect_day'))
                  from public.career_facts cf where cf.athlete_id = v_id and cf.void_at is null),
    'titles_owned', coalesce((select jsonb_agg(t.title order by t.earned_on, t.title) from public.hab_titles t where t.athlete_id = v_id), '[]'::jsonb),
    'rules', jsonb_build_object(
      'version', (select max(r.version) from public.career_rules r),
      'level', jsonb_build_object('base', v_rules #> '{level,base}', 'growth', v_rules #> '{level,growth}',
                                  'ranks', v_rules #> '{level,ranks}', 'levels_per_rank', v_rules #> '{level,levels_per_rank}',
                                  'prestige_after', v_rules #> '{level,prestige_after}'),
      'season', jsonb_build_object('title_points', v_rules #> '{season,title_points}'),
      'prices', coalesce((select jsonb_object_agg(k.key, public.career_num(v_rules #> array['fact', k.key, 'xp']))
                            from unnest(array['session_finished', 'session_finished_early', 'full_log', 'checkin_done', 'week_held',
                                              'bounce_back', 'training_return', 'library_session', 'retest_done']) as k(key)
                           where public.career_num(v_rules #> array['fact', k.key, 'xp']) is not null), '{}'::jsonb)),
    'badges', '[]'::jsonb, 'achievements', '[]'::jsonb, 'missions', '[]'::jsonb, 'quest', null, 'moments', '[]'::jsonb
  );
end $function$;

CREATE OR REPLACE FUNCTION public.career_compare(p_season date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_x jsonb; v_r jsonb; v_xp jsonb; v_rp jsonb; v_now jsonb := public.career_rules_now(); v_settle date;
  v_s date; v_t date := current_date; v_wk date; a record;
  v_log jsonb; v_cfg jsonb; v_cl jsonb; v_cc jsonb; v_rows jsonb := '[]'::jsonb; v_bad integer := 0; v_n integer := 0; v_settled integer := 0;
  p_season_xp bigint; c_season_xp bigint; p_week bigint; c_week bigint; p_all bigint; c_all bigint;
  v_probe jsonb; v_facts jsonb; v_row_ok boolean; v_diff jsonb; v_closed integer;
begin
  select x.rules into v_x from public.xp_rules x where x.id = 1;
  v_r := public.career_habit_rules();
  if v_x is null or v_r is null then
    raise exception 'nothing to compare: xp_rules or the Career Mode rulebook is missing';
  end if;
  v_xp := public.career_paid_rules(v_x, v_now);
  v_rp := public.career_paid_rules(v_r, v_now);
  v_settle := public.career_settled_before(v_now);
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
    p_season_xp := public.hab_xp(v_log, v_s, v_t, v_xp) + public.hab_bonus_xp(v_log, v_cfg, v_s, v_s, v_t, v_x);
    c_season_xp := public.hab_xp(v_cl, v_s, v_t, v_rp) + public.hab_bonus_xp(v_cl, v_cc, v_s, v_s, v_t, v_r);
    p_week := public.hab_xp(v_log, v_wk, v_t, v_xp) + public.hab_bonus_xp(v_log, v_cfg, v_s, v_wk, v_t, v_x);
    c_week := public.hab_xp(v_cl, v_wk, v_t, v_rp) + public.hab_bonus_xp(v_cl, v_cc, v_s, v_wk, v_t, v_r);
    p_all := public.hab_xp(v_log, '1970-01-01', v_t, v_xp) + public.hab_bonus_xp(v_log, v_cfg, '1970-01-01', '1970-01-01', v_t, v_x);
    c_all := public.hab_xp(v_cl, '1970-01-01', v_t, v_rp) + public.hab_bonus_xp(v_cl, v_cc, '1970-01-01', '1970-01-01', v_t, v_r);
    v_probe := public.career_probe(v_log, v_cfg, v_s, v_t, v_x);
    select jsonb_build_object(
             'perfect', count(*) filter (where f.kind = 'perfect_day' and f.day between v_s and v_t),
             'on_target', count(*) filter (where f.kind = 'day_on_target' and f.day between v_s and v_t),
             'comebacks', count(*) filter (where f.kind = 'comeback' and f.day between v_s and v_t
                                             and public.career_day(f.value ->> 'prev') >= v_s))
      into v_facts
      from public.career_facts f where f.athlete_id = a.athlete_id and f.void_at is null;
    -- the closed days whose log and facts differ (only once the XP switch is on: before it, nothing settles)
    v_closed := case when v_settle is null then 0 else
      (select count(*)::int from (
         select coalesce(pl.key, cl.key) as k
           from (select e.key, e.value from jsonb_each(coalesce(v_log, '{}'::jsonb)) e
                  where e.key ~ '^\d{4}-\d{2}-\d{2}$' and jsonb_typeof(e.value) = 'object' and e.key < v_settle::text) pl
           full join (select e.key, e.value from jsonb_each(coalesce(v_cl, '{}'::jsonb)) e where e.key < v_settle::text) cl
             on cl.key = pl.key
          where pl.value is distinct from cl.value) z) end;
    v_row_ok := p_season_xp = c_season_xp and p_week = c_week and p_all = c_all and v_probe = v_facts;
    if not v_row_ok and v_closed > 0 then
      v_settled := v_settled + 1;
    elsif not v_row_ok then
      v_bad := v_bad + 1;
    end if;
    v_rows := v_rows || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'athlete_id', a.athlete_id, 'ok', v_row_ok,
      'settled', case when not v_row_ok and v_closed > 0 then true end, 'closed', nullif(v_closed, 0),
      'season', jsonb_build_object('proof', p_season_xp, 'career', c_season_xp),
      'week', jsonb_build_object('proof', p_week, 'career', c_week),
      'all', jsonb_build_object('proof', p_all, 'career', c_all),
      'probe', jsonb_build_object('proof', v_probe, 'facts', v_facts))));
  end loop;
  return jsonb_build_object('ok', v_bad = 0 and jsonb_array_length(v_diff) = 0, 'season_start', v_s, 'today', v_t,
                            'xp_switch', public.career_switch_day(v_now, 'xp'), 'settled_before', v_settle,
                            'athletes', v_n, 'matched', v_n - v_bad - v_settled, 'settled', v_settled,
                            'rules_equal', jsonb_array_length(v_diff) = 0, 'rules_differ_on', v_diff, 'rows', v_rows);
end $function$;

CREATE OR REPLACE FUNCTION public.career_on_progress()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id text := coalesce(new.athlete_id, old.athlete_id); v_habits boolean := true; v_records boolean := true;
begin
  if tg_op = 'UPDATE' and new.athlete_id = old.athlete_id then
    v_habits := (new.data -> (v_id || '_hab_log')) is distinct from (old.data -> (v_id || '_hab_log'))
             or (new.data -> (v_id || '_hab_cfg')) is distinct from (old.data -> (v_id || '_hab_cfg'));
    v_records := (new.data -> (v_id || '_1rm')) is distinct from (old.data -> (v_id || '_1rm'));
    if not v_habits and not v_records then return null; end if;
  end if;
  begin
    if tg_op = 'UPDATE' and new.athlete_id is distinct from old.athlete_id then
      perform public.career_observe_proof(old.athlete_id);
    end if;
    if v_habits then perform public.career_observe_proof(v_id); end if;
  exception when others then
    raise warning 'Career Mode (shadow) could not read the Proof log of %: % (%). The save itself went through.', v_id, sqlerrm, sqlstate;
  end;
  begin
    if tg_op = 'UPDATE' and new.athlete_id is distinct from old.athlete_id then
      perform public.career_derive(old.athlete_id);
    end if;
    if v_records then perform public.career_derive(v_id); end if;
  exception when others then
    raise warning 'Career Mode (shadow) could not work out the training facts of %: % (%). The save itself went through.', v_id, sqlerrm, sqlstate;
  end;
  return null;
end $function$;

CREATE OR REPLACE FUNCTION public.career_on_session()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  begin
    if tg_op in ('UPDATE', 'DELETE') then
      perform public.career_observe_session(old.athlete_id, old.day, old.completed_on);
    end if;
    if tg_op in ('INSERT', 'UPDATE') then
      perform public.career_observe_session(new.athlete_id, new.day, new.completed_on);
    end if;
  exception when others then
    raise warning 'Career Mode (shadow) could not read a session of %: % (%). The save itself went through.',
                  coalesce(new.athlete_id, old.athlete_id), sqlerrm, sqlstate;
  end;
  begin
    if tg_op in ('INSERT', 'UPDATE') then
      perform public.career_derive(new.athlete_id);
    end if;
    if tg_op = 'DELETE' or (tg_op = 'UPDATE' and new.athlete_id is distinct from old.athlete_id) then
      perform public.career_derive(old.athlete_id);
    end if;
  exception when others then
    raise warning 'Career Mode (shadow) could not work out the training facts of %: % (%). The save itself went through.',
                  coalesce(new.athlete_id, old.athlete_id), sqlerrm, sqlstate;
  end;
  return null;
end $function$;

CREATE OR REPLACE FUNCTION public.career_on_programme()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  begin
    perform public.career_derive(new.athlete_id);
  exception when others then
    raise warning 'Career Mode (shadow) could not read the programme of %: % (%). The save itself went through.',
                  new.athlete_id, sqlerrm, sqlstate;
  end;
  return null;
end $function$;



-- ── 5. nobody's level goes down ───────────────────────────────────────────────────────────────────────────────────────
drop table if exists pg_temp.rb_report;
create temp table rb_report as
select b.id as athlete_id, (b.s #>> '{career,xp}')::bigint as before_xp, (b.s #>> '{career,level}')::int as before_level,
       coalesce((public.career_score(b.id, null, null, current_date) ->> 'xp')::bigint, 0) as after_xp
  from rb_before b where b.s is not null;
insert into public.career_facts (athlete_id, kind, ref, day, value, source)
select r.athlete_id, 'level_kept', 'catalogue-rollback', current_date,
       jsonb_build_object('xp', r.before_xp - r.after_xp, 'level', r.before_level,
                          'was', (public.career_level(r.after_xp, public.career_rules_now()) ->> 'level')::int), 'server'
  from rb_report r
 where r.after_xp < r.before_xp
on conflict (athlete_id, kind, ref) do nothing;

-- ── 6. what stage70 added ─────────────────────────────────────────────────────────────────────────────────────────────
drop function if exists public.career_catalogue_on();
drop function if exists public.career_award_id(text, text, integer, text);
drop function if exists public.career_bonus_rules(jsonb, jsonb);
drop function if exists public.career_proof_key(text);
drop function if exists public.career_badge_run(jsonb);
drop function if exists public.career_achievement_test(jsonb);
drop function if exists public.career_entry_kinds(text, jsonb);
drop function if exists public.career_entry_keys(text, jsonb, jsonb);
drop function if exists public.career_award_xp(text, integer, text, jsonb, jsonb);
drop function if exists public.career_award_pays(text, jsonb, jsonb, date, jsonb);
drop function if exists public.career_award_spec(text, text, integer, date, jsonb, jsonb);
drop function if exists public.career_changed_kinds();
drop function if exists public.career_measures(text, jsonb, text[]);
drop function if exists public.career_badge_eval(text, jsonb, jsonb, jsonb);
drop function if exists public.career_achievement_eval(text, text, jsonb, jsonb, jsonb);
drop function if exists public.career_mint(text, text, text, integer, text, date, jsonb, jsonb, jsonb, text, jsonb);
drop function if exists public.career_slam(text);
drop function if exists public.career_rewards_stamp(text);
drop function if exists public.career_evaluate(text, text[], text);
drop function if exists public.career_rewards_profile(text, jsonb);
drop function if exists public.mark_moments_told(text, text[], text);
drop function if exists public.get_awards(text);
drop function if exists public.career_rewards_athletes(integer, integer);
drop function if exists public.career_proof_sum(text, date);
drop function if exists public.career_rewards_line(text, jsonb, jsonb);
drop function if exists public.career_catalogue_before(integer, integer);
drop function if exists public.career_catalogue_preview(jsonb, integer, integer);
drop function if exists public.career_rewards_batch(integer, integer, text);

-- ── 7. coach_erase_person() forgets career_awards and career_recognition ──────────────────────────────────────────────
do $rb70_patch$
declare
  d text := pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure);
  s_old constant text := '''career_scores'', ''career_awards'', ''career_recognition'']';
  s_new constant text := '''career_scores'']';
  n int;
begin
  if position(s_old in d) = 0 then
    return;      -- not patched (or already put back): nothing to do
  end if;
  n := (length(d) - length(replace(d, s_old, ''))) / length(s_old);
  if n <> 1 then
    raise exception 'rollback_stage70: coach_erase_person() is not what this file expects (its table list was found % times, not once). Nothing was changed.', n;
  end if;
  execute replace(d, s_old, s_new);
end $rb70_patch$;

-- ── 8. the tables, the column, the index ──────────────────────────────────────────────────────────────────────────────
drop table if exists public.career_recognition;
drop table if exists public.career_awards;
drop table if exists backup.career_catalogue_before;
alter table public.career_scores drop column if exists rewards;
drop index if exists public.career_facts_kind_idx;

-- ── 10. the grants stage69 gave ───────────────────────────────────────────────────────────────────────────────────────
do $rb70_grants$
declare f text;
begin
  for f in
    select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname like 'career\_%' escape '\'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $rb70_grants$;
revoke all on function public.get_profile(text) from public, anon, authenticated;
grant execute on function public.get_profile(text) to authenticated, service_role;

-- ── the report; a dry run stops here and undoes everything ────────────────────────────────────────────────────────────
do $rb70_end$
declare v_report jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object('athlete_id', r.athlete_id, 'before_xp', r.before_xp, 'after_xp', r.after_xp,
                                               'kept_xp', greatest(r.before_xp - r.after_xp, 0), 'level', r.before_level)
                            order by r.athlete_id), '[]'::jsonb)
    into v_report from rb_report r;
  if coalesce(current_setting('career.rollback70', true), 'dry') <> 'real' then
    raise exception 'rollback_stage70: DRY RUN, nothing was changed. A real run (set the mode to real) would keep: %', v_report;
  end if;
  raise notice 'rollback_stage70: done. %', v_report;
end $rb70_end$;
commit;
select r.athlete_id, r.before_xp, r.after_xp, greatest(r.before_xp - r.after_xp, 0) as kept_xp, r.before_level as level
  from rb_report r order by r.athlete_id;
