-- The way back from stage70 (Career Mode phase 3, the catalogue switch): every function stage70 redefined goes back to stage69's own text,
-- every function and the table it added go, the titles it minted to be worn ('c_' in hab_titles) go, coach_erase_person() forgets
-- career_awards, and the rulebook rows that turned the catalogue switch on are deleted, so the newest rulebook left has it off and both apps
-- go back to phase 2 (they show the Trophy Room only while get_profile() says the switch is on). Made from those files by the session that
-- wrote stage70 (2026-10-18) and run by scripts/career/rehearse_catalogue.mjs against the result, so it is tested. On Amir's word only
-- (CLAUDE.md: a change to the live project waits for his yes).
--
-- What it cannot give back: an award is the athlete's record (GAME-1), and this deletes every one. If the switch is turned on again, the seed
-- mints them again from the facts (the past as it stands that day). Commit rulebook.toml with [switch] catalogue = "off" and a version above
-- the newest left loaded after it, or the next seed turns the switch on again.
--
-- Run it as one statement batch (the Supabase tool's execute_sql, or the SQL editor). It is safe to run twice.

begin;
-- ── 1. the functions stage70 redefined, as stage69 left them ─────────────────────────────────────────────────────────
create or replace function public.career_score(p_athlete text, p_season date, p_from date, p_to date) returns jsonb
language plpgsql stable set search_path to 'public' as $function$
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

create or replace function public.career_compute(p_athlete text) returns jsonb
language plpgsql stable set search_path to 'public' as $function$
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

create or replace function public.career_scored(p_athlete text, p_recompute boolean default true) returns jsonb
language plpgsql set search_path to 'public' as $function$
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

create or replace function public.career_scores_for(p_ids text[], p_budget interval default interval '2.5 seconds')
returns table (athlete_id text, score jsonb)
language plpgsql set search_path to 'public' as $function$
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

create or replace function public.career_seed(p_version integer, p_rules jsonb, p_catalogue jsonb, p_source text,
                                              p_dry_run boolean default false) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
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

create or replace function public.get_profile(p_athlete_id text default null) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
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

create or replace function public.career_compare(p_season date default null) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
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

-- ── 2. what stage70 added ───────────────────────────────────────────────────────────────────────────────────────────
drop function if exists public.career_told(text[]);
drop function if exists public.career_moments(text);
drop function if exists public.career_shelf(text, jsonb);
drop function if exists public.career_award_app(text, jsonb);
drop function if exists public.career_awards_xp(text, date, date);
drop function if exists public.career_catalogue_baseline();
drop function if exists public.career_evaluate(text, boolean);
drop function if exists public.career_all_the_way_back(text);
drop function if exists public.career_lift_counts(text, jsonb);
drop function if exists public.career_marks(jsonb, jsonb, jsonb, integer[], integer[]);
drop function if exists public.career_bonus_rules(jsonb, jsonb);
drop function if exists public.career_catalogue_day();

-- the titles it minted to be worn (a worn one comes off the board first)
update public.leaderboard_optin set title = null, updated_at = now() where title like 'c\_%' escape '\';
delete from public.hab_titles where title like 'c\_%' escape '\';

-- ── 3. coach_erase_person() forgets career_awards (patched back: found exactly once, or nothing changes) ───────────
do $rollback70_patch$
declare
  d text := pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure);
  s_old constant text := '''career_facts'', ''career_scores'', ''career_awards'']';
  s_new constant text := '''career_facts'', ''career_scores'']';
  n int;
begin
  if position(s_old in d) = 0 then
    return;      -- already forgotten: safe to run again
  end if;
  n := (length(d) - length(replace(d, s_old, ''))) / length(s_old);
  if n <> 1 then
    raise exception 'rollback70: coach_erase_person() is not what this expects (its table list was found % times, not once). Nothing was changed.', n;
  end if;
  execute replace(d, s_old, s_new);
end $rollback70_patch$;

drop table if exists public.career_awards;

-- ── 4. the rulebook rows that turned the catalogue switch on, and the scores worked out with them ──────────────────
delete from public.career_rules where (rules #>> '{switch,catalogue}') ~ '^\d{4}-\d{2}-\d{2}$';
delete from public.career_scores;

-- ── 5. grants, as stage69 left them ──────────────────────────────────────────────────────────────────────────────
do $rollback70_grants$
declare f text;
begin
  for f in
    select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname like 'career\_%' escape '\'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $rollback70_grants$;
revoke all on function public.get_profile(text) from public, anon, authenticated;
grant execute on function public.get_profile(text) to authenticated, service_role;
commit;
