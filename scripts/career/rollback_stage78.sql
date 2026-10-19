-- The way back from stage78 (the cut). On Amir's word only. It puts back everything stage78 took, from the safety copies it made in the
-- `backup` schema (backup.cut78_*), and every function it changed as stage77 left them (the definitions below are supabase/schema_snapshot.sql's
-- as it stood before stage78, copied by the session that built it).
--   1. The functions first, so career_facts_paid() stops paying `award_kept` facts before they go.
--   2. The awards, the moments waiting for them, the titles (hab_titles), the board's worn titles come back; the `award_kept` facts go.
--   3. The catalogue as it was, and the rulebook versions seeded after stage78 go (the cut's version 4).
-- Then: revert career/*.toml and career/tiers.lock.json to the commit before the cut (git), remake supabase/schema_snapshot.sql, and run
-- python scripts/check_career.py. Nobody's XP moves either way: an award and its nameless fact pay the same, on the same day.
-- Safe to run twice (each restore is an insert that skips what is there).

do $rollback78_guard$
begin
  if to_regclass('backup.cut78_career_awards') is null or to_regclass('backup.cut78_career_catalogue') is null or to_regclass('backup.cut78_rules') is null then
    raise exception 'rollback78: the safety copies (backup.cut78_*) are gone. Restore from the weekly backup instead (scripts/restore/README.md). Nothing was changed.';
  end if;
end
$rollback78_guard$;

-- 1. The functions, as stage77 left them
CREATE OR REPLACE FUNCTION public.career_facts_paid(p_athlete text)
 RETURNS TABLE(kind text, ref text, day date, xp numeric, career_only boolean)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  with v as (select r.version, r.starts_on, r.rules as j from public.career_rules r),   -- stage76
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
      from f cross join lateral (select v.j from v where v.starts_on is null or v.starts_on <= f.day order by v.version desc limit 1) r   -- stage76
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
  union all
  select 'award'::text, a.award_id, a.day, (case when not a.pays then 0 else a.xp end)::numeric, false   -- stage76: the minted XP (D20, D12 reversed)
    from public.career_awards a
   where a.athlete_id = p_athlete and public.career_catalogue_on()
$function$;

CREATE OR REPLACE FUNCTION public.career_compute(p_athlete text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare
  v_rules jsonb := public.career_rules_now(); v_hr jsonb; v_hb jsonb; v_paid jsonb; v_log jsonb; v_cfg jsonb;
  v_name text; v_start date; v_s date; v_wfrom date; v_today date := current_date;
  c_d bigint; c_b bigint; s_d bigint; s_b bigint; w_d bigint; w_b bigint;
  c_f jsonb; c_r numeric; s_f jsonb; s_r numeric; w_r numeric; v_cxp bigint; v_sxp bigint;
begin
  if v_rules is null or p_athlete is null then return null; end if;
  v_hr := public.career_habit_rules();
  v_hb := public.career_bonus_rules(v_hr, v_rules);
  v_paid := public.career_paid_rules(v_hr, v_rules);
  v_log := public.career_log(p_athlete);
  v_cfg := public.career_cfg(p_athlete);
  select s.name, s.starts_on into v_name, v_start from public.current_season() s;
  v_s := coalesce(v_start, '1970-01-01'::date);
  v_wfrom := greatest(v_today - 6, v_s);
  c_d := public.hab_xp(v_log, null, v_today, v_paid);
  c_b := public.hab_bonus_xp(v_log, v_cfg, null, null, v_today, v_hb);
  s_d := public.hab_xp(v_log, v_s, v_today, v_paid);
  s_b := public.hab_bonus_xp(v_log, v_cfg, v_s, v_s, v_today, v_hb);
  w_d := public.hab_xp(v_log, v_wfrom, v_today, v_paid);
  w_b := public.hab_bonus_xp(v_log, v_cfg, v_s, v_wfrom, v_today, v_hb);
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

CREATE OR REPLACE FUNCTION public.career_mint(p_athlete text, p_kind text, p_item text, p_tier integer, p_subject text, p_day date, p_body jsonb, p_tier_body jsonb, p_evidence jsonb, p_how text, p_ctx jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_S date := (p_ctx ->> 'S')::date; v_hist boolean; v_pays boolean; v_xp integer; v_how text; v_size text; v_id text; v_n integer;
begin
  if p_athlete is null or p_day is null or v_S is null then return false; end if;
  -- stage76 (D20): a reward a rule change reveals for an earlier day is dated no earlier than that version's start day (forward only)
  if (select r.starts_on from public.career_rules r order by r.version desc limit 1) > p_day then p_day := (select r.starts_on from public.career_rules r order by r.version desc limit 1); end if;
  v_hist := p_day <= v_S;
  if coalesce(p_body, '{}'::jsonb) ? 'retire_at' and not v_hist then return false; end if;   -- never earned after the switch
  v_id := public.career_award_id(p_kind, p_item, p_tier, coalesce(p_subject, ''));
  v_pays := p_kind <> 'title' and public.career_award_pays(p_athlete, p_body, p_tier_body, p_day, p_ctx);
  v_xp := case when v_pays then greatest(coalesce(public.career_award_xp(p_kind, p_tier, coalesce(p_subject, ''), p_body, p_ctx -> 'hr'), 0), 0) else 0 end;
  v_how := case when v_hist then 'baseline' else p_how end;
  v_size := coalesce(p_tier_body ->> 'size', p_body ->> 'size', 'win');
  if v_size not in ('tick', 'win', 'highlight', 'milestone', 'legend') then v_size := 'win'; end if;
  insert into public.career_awards (athlete_id, award_id, kind, item, tier, subject, day, pays, xp, size, meaning, evidence, how, rules_version)
  values (p_athlete, v_id, p_kind, p_item, p_tier, coalesce(p_subject, ''), p_day, v_pays, v_xp, v_size,
          coalesce(p_body ->> 'meaning', ''), coalesce(p_evidence, '{}'::jsonb), v_how, coalesce((p_ctx ->> 'version')::int, 0))
  on conflict (athlete_id, award_id) do nothing;
  get diagnostics v_n = row_count;
  if v_n = 0 then return false; end if;
  if v_how = 'live' and v_size <> 'tick' and (p_kind <> 'title' or p_item = 'grand_slam') then
    insert into public.career_recognition (athlete_id, award_id, audience, size) values (p_athlete, v_id, 'athlete', v_size)
    on conflict (athlete_id, award_id, audience) do nothing;
  end if;
  if p_kind = 'title' then
    insert into public.hab_titles (athlete_id, title, earned_on) values (p_athlete, coalesce(p_body ->> 'proof_id', p_item), p_day)
    on conflict (athlete_id, title) do nothing;
  end if;
  return true;
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
  v_rules jsonb; v_score jsonb; v_now integer := 0; v_best integer := 0; f record; v_xp date; v_rw jsonb; v_rp jsonb; v_out jsonb;
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
  begin
    v_rw := public.career_evaluate(v_id, null, 'live');
  exception when others then
    raise warning 'Career Mode could not work out the awards of %: % (%). The profile is answered from the stored cache.', v_id, sqlerrm, sqlstate;
    v_rw := null;
  end;
  v_score := coalesce(public.career_scored(v_id), '{}'::jsonb);
  v_xp := public.career_switch_day(v_rules, 'xp');
  -- weeks held in a row: only a broken week ends a run (a week between cycles, or one Amir paused, is no week at all)
  for f in select cf.kind from public.career_facts cf
            where cf.athlete_id = v_id and cf.void_at is null and cf.kind in ('week_held', 'week_broken')
            order by cf.day, cf.ref loop
    if f.kind = 'week_held' then v_now := v_now + 1; v_best := greatest(v_best, v_now); else v_now := 0; end if;
  end loop;
  v_out := jsonb_build_object(
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
  v_rp := public.career_rewards_profile(v_id, v_rw);
  return v_out || (v_rp - 'numbers')
         || case when v_rp ? 'numbers' then jsonb_build_object('numbers', (v_out -> 'numbers') || (v_rp -> 'numbers')) else '{}'::jsonb end;
end $function$;

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

  select exists (select 1 from public.leaderboard_optin o where o.athlete_id = p_athlete_id)
    into v_joined;

  if public.career_xp_on() then
    return query
    with board as (
      select o.athlete_id as aid, o.display_name as dname, o.title as ttl from public.leaderboard_optin o
    ),
    sc as (
      select s.athlete_id as aid, s.score
        from public.career_scores_for((select array_agg(b.aid) from board b), interval '2.5 seconds') s
    ),
    scored as (
      select b.aid, b.dname, b.ttl,
             coalesce(case when p_scope = 'week' then (sc.score #>> '{week,points}')::bigint
                           else (sc.score #>> '{season,points}')::bigint end, 0) as x,
             coalesce((sc.score #>> '{career,level}')::int, 1) as lv,
             coalesce(sc.score #>> '{career,rank}', public.hab_rank_label(1)) as rk
        from board b left join sc on sc.aid = b.aid
    ),
    ranked as (
      select row_number() over (order by s.x desc, lower(s.dname) asc) as rn, s.*
        from scored s
    )
    select r.rn::int, r.dname, r.ttl, r.x, r.lv, r.rk, (r.aid = p_athlete_id), v_joined
      from ranked r
     where r.rn <= greatest(1, p_limit) or r.aid = p_athlete_id
     order by r.rn;
    return;
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
end $function$;

CREATE OR REPLACE FUNCTION public.roll_call(p_athlete_id text, p_key text DEFAULT NULL::text, p_days integer DEFAULT 7)
 RETURNS TABLE(day date, display_name text, title text, body text, pct smallint, rank_label text, is_me boolean, is_coach boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_expected text; v_rules jsonb; v_from date; v_season_start date;
begin
  select secret_key into v_expected from public.athlete_keys where athlete_id = p_athlete_id;
  if not public.is_coach() and p_athlete_id is distinct from public.current_athlete_id() and (v_expected is null or p_key is null or p_key is distinct from v_expected) then
    raise exception 'invalid athlete key';
  end if;

  select rules into v_rules from public.xp_rules where id = 1;
  select s.starts_on into v_season_start from public.current_season() s;
  v_from := current_date - greatest(1, least(60, coalesce(p_days, 7)));

  return query
  with visible as (
    select n.athlete_id as aid, n.day as d, o.display_name as dname, o.title as ttl,
           n.body as b, n.pct as p, n.updated_at as ua, false as coach
    from public.hab_notes n
    join public.leaderboard_optin o on o.athlete_id = n.athlete_id
    where not n.hidden and n.day >= v_from and n.day <= current_date + 1
    union all
    select n.athlete_id, n.day, 'AMIR'::text, null::text,
           n.body, n.pct, n.updated_at, true
    from public.hab_notes n
    where n.athlete_id = public.coach_note_id()
      and not n.hidden and n.day >= v_from and n.day <= current_date + 1
  ),
  scored as (
    select v.aid as said,
           public.hab_rank_label(public.hab_level(
             ( public.hab_xp(public.hab_log_of(ap.data, v.aid),
                             v_season_start, current_date, v_rules)
             + public.hab_bonus_xp(public.hab_log_of(ap.data, v.aid),
                                   public.hab_cfg_of(ap.data, v.aid),
                                   v_season_start, v_season_start, current_date, v_rules) ),
             v_rules)) as rlabel
    from (select distinct aid from visible where not coach) v
    left join public.athlete_progress ap on ap.athlete_id = v.aid
  )
  select vi.d, vi.dname, vi.ttl, vi.b, vi.p,
         sc.rlabel, (vi.aid = p_athlete_id), vi.coach
  from visible vi
  left join scored sc on sc.said = vi.aid
  order by vi.d desc, vi.coach desc, vi.ua desc;
end; $function$;

CREATE OR REPLACE FUNCTION public.set_title(p_athlete_id text, p_title text, p_key text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_expected text; v_rules jsonb; v_entry jsonb; v_need int; v_title text;
begin
  select secret_key into v_expected from public.athlete_keys where athlete_id = p_athlete_id;
  if not public.is_coach() and p_athlete_id is distinct from public.current_athlete_id() and (v_expected is null or p_key is null or p_key is distinct from v_expected) then
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

CREATE OR REPLACE FUNCTION public.career_compare(p_season date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_x jsonb; v_r jsonb; v_xp jsonb; v_rp jsonb; v_xb jsonb; v_rb jsonb; v_now jsonb := public.career_rules_now(); v_settle date; v_cat date;
  v_s date; v_t date := current_date; v_wk date; a record;
  v_log jsonb; v_cfg jsonb; v_cl jsonb; v_cc jsonb; v_rows jsonb := '[]'::jsonb; v_bad integer := 0; v_n integer := 0; v_settled integer := 0;
  p_season_xp bigint; c_season_xp bigint; p_week bigint; c_week bigint; p_all bigint; c_all bigint; p_aw bigint; c_aw bigint;
  v_probe jsonb; v_facts jsonb; v_row_ok boolean; v_diff jsonb; v_closed integer; v_out jsonb;
begin
  select x.rules into v_x from public.xp_rules x where x.id = 1;
  v_r := public.career_habit_rules();
  if v_x is null or v_r is null then
    raise exception 'nothing to compare: xp_rules or the Career Mode rulebook is missing';
  end if;
  v_cat := public.career_switch_day(v_now, 'catalogue');
  v_xp := public.career_paid_rules(v_x, v_now);
  v_rp := public.career_paid_rules(v_r, v_now);
  v_xb := public.career_bonus_rules(v_x, v_now);
  v_rb := public.career_bonus_rules(v_r, v_now);
  v_settle := public.career_settled_before(v_now);
  v_s := coalesce(p_season, (select s.starts_on from public.current_season() s), '1970-01-01'::date);
  v_wk := greatest(v_t - 6, v_s);
  select coalesce(jsonb_agg(k.key order by k.key), '[]'::jsonb) into v_diff
    from jsonb_object_keys(v_r) as k(key)
   where k.key <> 'questRuns'
     and (v_cat is null or k.key not in ('tiers', 'milestones'))
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
    p_season_xp := public.hab_xp(v_log, v_s, v_t, v_xp) + public.hab_bonus_xp(v_log, v_cfg, v_s, v_s, v_t, v_xb);
    c_season_xp := public.hab_xp(v_cl, v_s, v_t, v_rp) + public.hab_bonus_xp(v_cl, v_cc, v_s, v_s, v_t, v_rb);
    p_week := public.hab_xp(v_log, v_wk, v_t, v_xp) + public.hab_bonus_xp(v_log, v_cfg, v_s, v_wk, v_t, v_xb);
    c_week := public.hab_xp(v_cl, v_wk, v_t, v_rp) + public.hab_bonus_xp(v_cl, v_cc, v_s, v_wk, v_t, v_rb);
    p_all := public.hab_xp(v_log, '1970-01-01', v_t, v_xp) + public.hab_bonus_xp(v_log, v_cfg, '1970-01-01', '1970-01-01', v_t, v_xb);
    c_all := public.hab_xp(v_cl, '1970-01-01', v_t, v_rp) + public.hab_bonus_xp(v_cl, v_cc, '1970-01-01', '1970-01-01', v_t, v_rb);
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
    if v_cat is not null then
      -- the tiers and milestones Proof paid up to the switch, against what the awards carried over (spec §5.3)
      p_aw := public.hab_bonus_xp(v_log, v_cfg, null, null, v_cat, v_x || '{"quests": [], "questRuns": [], "comebackXp": 0}'::jsonb);
      select coalesce(sum(case when not aw.pays then 0
                               else aw.xp /* stage76: minted XP */ end), 0)::bigint
        into c_aw
        from public.career_awards aw join public.career_catalogue c on c.kind = aw.kind and c.id = aw.item
       where aw.athlete_id = a.athlete_id and aw.day <= v_cat and c.body ->> 'origin' = 'proof';
      v_row_ok := v_row_ok and p_aw = c_aw;
    end if;
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
      'probe', jsonb_build_object('proof', v_probe, 'facts', v_facts),
      'awards', case when v_cat is not null then jsonb_build_object('proof', p_aw, 'career', c_aw) end)));
  end loop;
  v_out := jsonb_build_object('ok', v_bad = 0 and jsonb_array_length(v_diff) = 0, 'season_start', v_s, 'today', v_t,
                              'xp_switch', public.career_switch_day(v_now, 'xp'), 'settled_before', v_settle,
                              'athletes', v_n, 'matched', v_n - v_bad - v_settled, 'settled', v_settled,
                              'rules_equal', jsonb_array_length(v_diff) = 0, 'rules_differ_on', v_diff, 'rows', v_rows);
  if v_cat is not null then v_out := v_out || jsonb_build_object('catalogue_switch', v_cat); end if;
  return v_out;
end $function$;

CREATE OR REPLACE FUNCTION public.claim_titles(p_athlete_id text, p_key text DEFAULT NULL::text)
 RETURNS TABLE(title text, earned_on date)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_expected text;
begin
  select secret_key into v_expected from public.athlete_keys where athlete_id = p_athlete_id;
  if not public.is_coach() and p_athlete_id is distinct from public.current_athlete_id() and (v_expected is null or p_key is null or p_key is distinct from v_expected) then
    raise exception 'invalid athlete key';
  end if;
  perform public.hab_mint_titles(p_athlete_id);
  return query
    select t.title, t.earned_on from public.hab_titles t
    where t.athlete_id = p_athlete_id order by t.earned_on, t.title;
end; $function$;

CREATE OR REPLACE FUNCTION public.hab_mint_titles(p_athlete_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_rules jsonb; v_level int;
begin
  select rules into v_rules from public.xp_rules where id = 1;
  if v_rules is null or v_rules -> 'passTrack' is null then return; end if;
  v_level := public.hab_season_level(p_athlete_id);
  insert into public.hab_titles (athlete_id, title)
  select p_athlete_id, t ->> 'id'
  from jsonb_array_elements(v_rules -> 'passTrack') t
  where t ->> 'kind' = 'title'
    and (t ->> 'lv') is not null
    and (t ->> 'lv')::int > 0
    and v_level >= (t ->> 'lv')::int
  on conflict (athlete_id, title) do nothing;
end; $function$;

CREATE OR REPLACE FUNCTION public.hab_close_season(p_ended_on date)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_name text; v_start date; v_title text; v_rules jsonb; v_n integer := 0; v_need numeric;
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
  v_title := 't_sn_' || to_char(v_start, 'YYYYMMDD');

  if public.career_xp_on() then
    v_rules := public.career_rules_now();
    v_need := coalesce(public.career_num(v_rules #> '{season,title_points}'), 2000);
    with who as (
      select distinct f.athlete_id as id from public.career_facts f where f.void_at is null
    ),
    scored as (
      select w.id,
             (public.career_score(w.id, v_start, v_start, p_ended_on) ->> 'xp')::bigint as pts,
             (public.career_score(w.id, null, null, p_ended_on) ->> 'xp')::bigint as cxp
        from who w
    )
    insert into public.hab_season_results (athlete_id, starts_on, season_name, ended_on, level, xp)
    select s.id, v_start, v_name, p_ended_on, (public.career_level(s.cxp, v_rules) ->> 'level')::int, s.pts
      from scored s
     where s.pts > 0
    on conflict (athlete_id, starts_on) do nothing;
    get diagnostics v_n = row_count;

    insert into public.hab_titles (athlete_id, title)
    select r.athlete_id, v_title
      from public.hab_season_results r
     where r.starts_on = v_start and r.xp >= v_need
    on conflict (athlete_id, title) do nothing;
    return v_n;
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

  insert into public.hab_titles (athlete_id, title)
  select r.athlete_id, v_title
  from public.hab_season_results r
  where r.starts_on = v_start and r.level >= 5
  on conflict (athlete_id, title) do nothing;

  return v_n;
end $function$;

-- 2. The rows
insert into public.career_awards select * from backup.cut78_career_awards on conflict do nothing;
insert into public.career_recognition select * from backup.cut78_career_recognition on conflict do nothing;
insert into public.hab_titles select * from backup.cut78_hab_titles on conflict do nothing;
update public.leaderboard_optin o set title = b.title, updated_at = now() from backup.cut78_board_titles b where o.athlete_id = b.athlete_id;
delete from public.career_facts where kind = 'award_kept';

-- 3. The catalogue and the rulebook versions
delete from public.career_catalogue;
insert into public.career_catalogue select * from backup.cut78_career_catalogue;
delete from public.career_rules r where r.version not in (select b.version from backup.cut78_rules b);
