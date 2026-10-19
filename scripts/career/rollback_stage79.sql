-- rollback_stage79.sql — takes supabase/stage79_career_achievements.sql off: the three functions as stage78 left them (made from
-- supabase/schema_snapshot.sql as it was before stage79), career_rewards_batch() with it. On Amir's word only.
--
-- With the functions back, an entry with one of the three tests (total, best_run, month_held) is decided by nothing: it mints nothing more,
-- and every award already minted stays with its XP (GAME-1: a mint is never taken back). To take the new entries off the screens as well,
-- seed a version without them (a seed cannot go back a version, D20: rulebook.toml version 6, starts_on the day). Then remake the schema
-- snapshot. Note: career_rewards_batch() goes back to reading backup.career_catalogue_before statically, so after that copy is dropped
-- (2026-11-01) a silent pass mints nothing.

CREATE OR REPLACE FUNCTION public.career_entry_keys(p_kind text, p_body jsonb, p_ctx jsonb)
 RETURNS text[]
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
declare v_counts text[]; v_t text; v_out text[] := '{}'::text[];
begin
  v_counts := case jsonb_typeof(p_body -> 'counts')
                when 'array' then array(select x from jsonb_array_elements_text(p_body -> 'counts') x order by x)
                when 'string' then array[p_body ->> 'counts']
                else '{}'::text[] end;
  if p_kind = 'badge' then
    case p_body ->> 'kind'
      when 'best_run' then
        return case public.career_badge_run(p_body)
                 when 'plan_weeks' then array['weeks']
                 when 'days' then array['run:' || coalesce(p_body ->> 'habit', '')]
                 else array['iso:' || coalesce(v_counts[1], '')] end;
      when 'total' then return array['count:' || array_to_string(v_counts, ',')];
      when 'best_value' then return array[public.career_maxpct_key(p_body)];
      when 'per_habit_best_run' then
        return array(select 'run:' || t.key from jsonb_each(coalesce(p_ctx -> 'targets', '{}'::jsonb)) t
                     union
                     select 'run:' || c.value from jsonb_array_elements_text(coalesce(p_ctx -> 'custom', '[]'::jsonb)) c);
      when 'proof' then return array[public.career_proof_key(p_body ->> 'proof_measure')];
      else return '{}'::text[];
    end case;
  end if;
  v_t := public.career_achievement_test(p_body);
  if v_t = 'proof' then
    return array[public.career_proof_key(p_body ->> 'proof_measure')];
  elsif v_t = 'goals' then
    select coalesce(array_agg(distinct public.career_proof_key(g ->> 'kind')), '{}'::text[]) into v_out
      from jsonb_array_elements(case when jsonb_typeof(p_body -> 'goals') = 'array' then p_body -> 'goals' else '[]'::jsonb end) g
     where public.career_proof_key(g ->> 'kind') is not null and g ->> 'kind' is not null;
    return v_out;
  elsif v_t = 'best_value' then
    return array[public.career_maxpct_key(p_body)];
  elsif v_t = 'run_regained' then
    return array['weeks'];
  end if;
  return '{}'::text[];
end $function$;
revoke all on function public.career_entry_keys(p_kind text, p_body jsonb, p_ctx jsonb) from public, anon, authenticated, service_role;
grant execute on function public.career_entry_keys(p_kind text, p_body jsonb, p_ctx jsonb) to service_role;

CREATE OR REPLACE FUNCTION public.career_entry_kinds(p_kind text, p_body jsonb)
 RETURNS text[]
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
declare v_counts text[]; v_m text; v_t text;
begin
  v_counts := case jsonb_typeof(p_body -> 'counts')
                when 'array' then array(select jsonb_array_elements_text(p_body -> 'counts'))
                when 'string' then array[p_body ->> 'counts']
                else '{}'::text[] end;
  if p_kind = 'badge' then
    case p_body ->> 'kind'
      when 'best_run' then
        return case public.career_badge_run(p_body)
                 when 'plan_weeks' then array['week_held', 'week_broken']
                 when 'days' then array['habit_done']
                 else v_counts end;
      when 'total' then return v_counts;
      when 'best_value' then return array['lift_gain'];
      when 'per_habit_best_run' then return array['habit_done'];
      when 'proof' then v_m := p_body ->> 'proof_measure';
      else return v_counts;
    end case;
  else
    v_t := public.career_achievement_test(p_body);
    case v_t
      when 'first' then return array[p_body ->> 'reads'];
      when 'proof' then v_m := p_body ->> 'proof_measure';
      when 'goals' then return array['habit_done', 'habit_day', 'day_on_target', 'perfect_day', 'comeback', 'comeback_stuck'];
      when 'cycle_all_held', 'cycle_by_the_book', 'cycle_with_broken' then
        return array['cycle_finished', 'week_held', 'week_by_the_book', 'week_broken'];
      when 'runs_together' then return array['habit_done'];
      when 'patterns_in_cycle' then return array['personal_best'];
      when 'best_value' then return array['lift_gain'];
      when 'cycle_proving' then return array['personal_best', 'retest_beaten', 'week_held', 'week_broken'];
      when 'run_regained' then return array['week_held', 'week_broken'];
      else return '{}'::text[];
    end case;
  end if;
  -- a Proof measure
  return case when v_m is null then array['day_on_target']
              when v_m like 'streak:%' or v_m like 'daysHit:%' or v_m like 'total:%' then array['habit_done']
              when v_m = 'daysWith3' then array['habit_done', 'habit_day']
              when v_m in ('perfectDays', 'perfect') then array['perfect_day']
              when v_m = 'qualify' then array['day_on_target']
              when v_m = 'comebackRun' then array['comeback', 'day_on_target']
              when v_m = 'comebacksStuck' then array['comeback_stuck']
              else '{}'::text[] end;
end $function$;
revoke all on function public.career_entry_kinds(p_kind text, p_body jsonb) from public, anon, authenticated, service_role;
grant execute on function public.career_entry_kinds(p_kind text, p_body jsonb) to service_role;

CREATE OR REPLACE FUNCTION public.career_achievement_eval(p_athlete text, p_id text, p_body jsonb, p_m jsonb, p_ctx jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare
  v_test text := public.career_achievement_test(p_body); v_k text; v_need numeric; s jsonb; g jsonb; v_day date; v_ev jsonb;
  v_facts jsonb := '[]'::jsonb; v_n integer := 0; v_num integer; v_ref text; v_kind text;
  v_best integer := 0; v_run integer := 0; v_away integer := 0; v_armed boolean := false; v_old integer := 0; v_aw integer;
  v_bests integer; v_rets integer;
  c_none constant jsonb := '{"crossed": []}'::jsonb;
begin
  if v_test is null then return c_none; end if;

  if v_test = 'first' then
    select f.day, f.kind, f.ref into v_day, v_kind, v_ref from public.career_facts f
     where f.athlete_id = p_athlete and f.kind = p_body ->> 'reads' and f.void_at is null
     order by f.day, f.ref limit 1;
    v_ev := jsonb_build_object('via', 'first', 'n', 1, 'facts', jsonb_build_array(jsonb_build_object('kind', v_kind, 'ref', v_ref)));

  elsif v_test in ('proof', 'best_value') then
    v_k := case when v_test = 'proof' then public.career_proof_key(p_body ->> 'proof_measure') else public.career_maxpct_key(p_body) end;
    v_need := public.career_num(case when v_test = 'proof' then p_body -> 'proof_need' else p_body -> 'at' end);
    select x.s into s from jsonb_array_elements(coalesce(p_m -> v_k -> 'steps', '[]'::jsonb)) with ordinality x(s, o)
     where public.career_num(x.s -> 1) >= v_need order by x.o limit 1;
    if s is not null then
      v_day := (s ->> 0)::date;
      v_ev := jsonb_build_object('via', v_k, 'n', s -> 1,
                                 'facts', case when s ->> 3 is not null then jsonb_build_array(jsonb_build_object('kind', s ->> 2, 'ref', s ->> 3))
                                               else '[]'::jsonb end);
    end if;

  elsif v_test = 'goals' then
    -- every goal met; the day the last of them was
    if jsonb_typeof(p_body -> 'goals') is distinct from 'array' or jsonb_array_length(p_body -> 'goals') = 0 then return c_none; end if;
    for g in select e from jsonb_array_elements(p_body -> 'goals') e loop
      v_k := public.career_proof_key(g ->> 'kind');
      v_need := public.career_num(g -> 'need');
      if g ->> 'kind' is null or v_k is null or v_need is null then return c_none; end if;
      s := null;
      select x.s into s from jsonb_array_elements(coalesce(p_m -> v_k -> 'steps', '[]'::jsonb)) with ordinality x(s, o)
       where public.career_num(x.s -> 1) >= v_need order by x.o limit 1;
      if s is null then return c_none; end if;
      v_day := greatest(v_day, (s ->> 0)::date);
      v_n := v_n + 1;
      if s ->> 3 is not null and jsonb_array_length(v_facts) < 5 then
        v_facts := v_facts || jsonb_build_array(jsonb_build_object('kind', s ->> 2, 'ref', s ->> 3));
      end if;
    end loop;
    v_ev := jsonb_build_object('via', 'goals', 'n', v_n, 'facts', v_facts);

  elsif v_test in ('cycle_all_held', 'cycle_by_the_book', 'cycle_with_broken') then
    -- a finished cycle judged by the week facts of that cycle (refs c<n>|w<k>, so two cycles' weeks never mix); a week before the first
    -- session, or one Amir paused, has no fact and does not count (D9)
    select c.day, c.ref into v_day, v_ref from public.career_facts c
     where c.athlete_id = p_athlete and c.kind = 'cycle_finished' and c.void_at is null
       and case when v_test = 'cycle_with_broken' then
                  exists (select 1 from public.career_facts w where w.athlete_id = p_athlete and w.kind = 'week_broken' and w.void_at is null
                             and w.value ->> 'cycle' = c.value ->> 'cycle')
                else
                  exists (select 1 from public.career_facts w where w.athlete_id = p_athlete and w.kind = 'week_held' and w.void_at is null
                             and w.value ->> 'cycle' = c.value ->> 'cycle')
                  and not exists (select 1 from public.career_facts w where w.athlete_id = p_athlete and w.kind = 'week_broken' and w.void_at is null
                                     and w.value ->> 'cycle' = c.value ->> 'cycle')
                  and (v_test = 'cycle_all_held'
                       or not exists (select 1 from public.career_facts w
                                       where w.athlete_id = p_athlete and w.kind = 'week_held' and w.void_at is null
                                         and w.value ->> 'cycle' = c.value ->> 'cycle'
                                         and not exists (select 1 from public.career_facts b
                                                          where b.athlete_id = p_athlete and b.kind = 'week_by_the_book' and b.void_at is null
                                                            and b.ref = w.ref)))
           end
     order by c.day, c.ref limit 1;
    v_ev := jsonb_build_object('via', v_test, 'n', 1, 'facts', jsonb_build_array(jsonb_build_object('kind', 'cycle_finished', 'ref', v_ref)));

  elsif v_test = 'runs_together' then
    -- the first day every listed habit's run reaches `run` at once
    v_need := public.career_num(p_body -> 'run');
    with hs as (select distinct x as h from jsonb_array_elements_text(case when jsonb_typeof(p_body -> 'habits') = 'array' then p_body -> 'habits' else '[]'::jsonb end) x),
    tg as (select hs.h, coalesce(public.career_num(p_ctx -> 'targets' -> hs.h),
                                 case when coalesce(p_ctx -> 'custom', '[]'::jsonb) ? hs.h then 1 end) as tgt from hs),
    dn as (
      select tg.h, f.day as d from public.career_facts f join tg on substr(f.ref, 12) = tg.h
       where f.athlete_id = p_athlete and f.kind = 'habit_done' and f.void_at is null
         and jsonb_typeof(f.value -> 'v') = 'number' and (f.value ->> 'v')::numeric >= tg.tgt
    ),
    isl as (select dn.h, dn.d, dn.d - (row_number() over (partition by dn.h order by dn.d))::int as grp from dn),
    rl as (select isl.h, isl.d, (row_number() over (partition by isl.h, isl.grp order by isl.d))::int as run from isl)
    select min(z.d) into v_day from (
      select rl.d from rl where rl.run >= v_need group by rl.d
      having count(distinct rl.h) = (select count(*) from hs)
    ) z
    where (select count(*) from hs) > 0 and (select count(*) from tg where tg.tgt is not null) = (select count(*) from hs);
    v_ev := jsonb_build_object('via', 'runs_together', 'n', v_need, 'facts', '[]'::jsonb);

  elsif v_test = 'patterns_in_cycle' then
    -- a personal best in every group of movement patterns within one cycle; a lift is placed by the Spine (an approved entry whose name or
    -- alias it is, compared as career_norm() compares lifts); one the Spine cannot place counts for nothing
    with cyc as (select (e ->> 'num')::int as num, (e ->> 'cstart')::date as cs, (e ->> 'cend')::date as ce
                   from jsonb_array_elements(coalesce(p_ctx -> 'cycles', '[]'::jsonb)) e),
    grp as (select g2.key as gname, pv.value #>> '{}' as pat
              from jsonb_each(case when jsonb_typeof(p_body -> 'groups') = 'object' then p_body -> 'groups' else '{}'::jsonb end) g2,
                   jsonb_array_elements(case when jsonb_typeof(g2.value) = 'array' then g2.value else '[]'::jsonb end) pv),
    ng as (select count(distinct grp.gname) as n from grp),
    sp as (select public.career_norm(e.name) as nm, e.pattern from public.exercises e where e.status = 'approved' and e.pattern is not null
           union
           select public.career_norm(a.x), e.pattern from public.exercises e cross join unnest(e.aliases) a(x)
            where e.status = 'approved' and e.pattern is not null),
    pb as (select f.day, f.ref, public.career_norm(f.value ->> 'lift') as lift from public.career_facts f
            where f.athlete_id = p_athlete and f.kind = 'personal_best' and f.void_at is null),
    hit as (select c.num, gr.gname, min(pb.day) as d
              from cyc c join pb on pb.day between c.cs and c.ce join sp on sp.nm = pb.lift join grp gr on gr.pat = sp.pattern
             group by c.num, gr.gname),
    got as (select hit.num, max(hit.d) as d from hit group by hit.num
             having count(*) = (select ng.n from ng) and (select ng.n from ng) > 0)
    select got.d, got.num into v_day, v_num from got order by got.d, got.num limit 1;
    if v_day is not null then
      select coalesce(jsonb_agg(jsonb_build_object('kind', 'personal_best', 'ref', z.ref)), '[]'::jsonb) into v_facts
        from (select f.ref from public.career_facts f where f.athlete_id = p_athlete and f.kind = 'personal_best' and f.void_at is null
                 and f.day = v_day order by f.ref limit 5) z;
      v_ev := jsonb_build_object('via', 'patterns_in_cycle', 'n', v_num, 'facts', v_facts);
    end if;

  elsif v_test = 'cycle_proving' then
    -- one cycle with `bests` personal bests in its dates, `retests` retests beaten, at least one week held and none broken
    v_bests := greatest(coalesce(public.career_num(p_body -> 'bests'), 1), 1)::int;
    v_rets := greatest(coalesce(public.career_num(p_body -> 'retests'), 0), 0)::int;
    with cyc as (select (e ->> 'num')::int as num, (e ->> 'cstart')::date as cs, (e ->> 'cend')::date as ce
                   from jsonb_array_elements(coalesce(p_ctx -> 'cycles', '[]'::jsonb)) e),
    x as (
      select c.num,
             (select f.day from public.career_facts f where f.athlete_id = p_athlete and f.kind = 'personal_best' and f.void_at is null
                 and f.day between c.cs and c.ce order by f.day, f.ref offset v_bests - 1 limit 1) as b_day,
             case when v_rets > 0 then
               (select f.day from public.career_facts f where f.athlete_id = p_athlete and f.kind = 'retest_beaten' and f.void_at is null
                   and f.value ->> 'cycle' = c.num::text order by f.day, f.ref offset v_rets - 1 limit 1) end as r_day,
             (select min(f.day) from public.career_facts f where f.athlete_id = p_athlete and f.kind = 'week_held' and f.void_at is null
                 and f.value ->> 'cycle' = c.num::text) as h_day,
             exists (select 1 from public.career_facts f where f.athlete_id = p_athlete and f.kind = 'week_broken' and f.void_at is null
                        and f.value ->> 'cycle' = c.num::text) as broken
        from cyc c
    )
    select greatest(x.b_day, x.r_day, x.h_day), x.num into v_day, v_num from x
     where x.b_day is not null and x.h_day is not null and not x.broken and (v_rets = 0 or x.r_day is not null)
     order by greatest(x.b_day, x.r_day, x.h_day), x.num limit 1;
    v_ev := jsonb_build_object('via', 'cycle_proving', 'n', v_num, 'facts', '[]'::jsonb);

  elsif v_test = 'run_regained' then
    -- after `away_weeks` or more broken weeks in a row with no session at all, the held-weeks run reaches the best run before the gap
    v_aw := greatest(coalesce(public.career_num(p_body -> 'away_weeks'), 4), 1)::int;
    for s in select e from jsonb_array_elements(coalesce(p_m -> 'weeks' -> 'walk', '[]'::jsonb)) e loop
      if s ->> 1 = 'h' then
        v_run := v_run + 1; v_away := 0;
        if v_armed and v_run >= v_old then
          v_day := (s ->> 0)::date;
          v_ev := jsonb_build_object('via', 'run_regained', 'n', v_run,
                                     'facts', jsonb_build_array(jsonb_build_object('kind', 'week_held', 'ref', s ->> 3)));
          exit;
        end if;
        v_best := greatest(v_best, v_run);
      else
        v_run := 0;
        if coalesce(public.career_num(s -> 2), 0) = 0 then v_away := v_away + 1; else v_away := 0; end if;
        if not v_armed and v_away >= v_aw and v_best > 0 then v_armed := true; v_old := v_best; end if;
      end if;
    end loop;
  end if;

  if v_day is null then return c_none; end if;
  return jsonb_build_object('crossed', jsonb_build_array(jsonb_build_object('day', v_day, 'evidence', coalesce(v_ev, '{}'::jsonb))));
end $function$;
revoke all on function public.career_achievement_eval(p_athlete text, p_id text, p_body jsonb, p_m jsonb, p_ctx jsonb) from public, anon, authenticated, service_role;
grant execute on function public.career_achievement_eval(p_athlete text, p_id text, p_body jsonb, p_m jsonb, p_ctx jsonb) to service_role;

CREATE OR REPLACE FUNCTION public.career_rewards_batch(p_offset integer, p_limit integer, p_how text DEFAULT 'baseline'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_id text; v_lines jsonb := '[]'::jsonb; v_before jsonb; v_after jsonb; v_line jsonb; v_ok boolean := true;
begin
  if not public.career_catalogue_on() then
    raise exception 'career_rewards_batch: the catalogue switch is off (rulebook.toml → [switch] catalogue)';
  end if;
  if p_how is null or p_how not in ('baseline', 'silent') then
    raise exception 'career_rewards_batch: p_how is baseline or silent, not %', p_how;
  end if;
  for v_id in select x from public.career_rewards_athletes(p_offset, p_limit) x loop
    begin
      perform public.career_evaluate(v_id, null, p_how);
      v_after := public.career_scored(v_id);
      select b.score into v_before from backup.career_catalogue_before b where b.athlete_id = v_id;
      v_line := public.career_rewards_line(v_id, coalesce(v_before, v_after), v_after);
    exception when others then
      v_line := jsonb_build_object('athlete_id', v_id, 'ok', false, 'error', sqlerrm);
    end;
    v_ok := v_ok and coalesce((v_line ->> 'ok')::boolean, false);
    v_lines := v_lines || jsonb_build_array(v_line);
  end loop;
  return jsonb_build_object('n', jsonb_array_length(v_lines), 'ok', v_ok, 'lines', v_lines);
end $function$;
revoke all on function public.career_rewards_batch(p_offset integer, p_limit integer, p_how text) from public, anon, authenticated, service_role;
grant execute on function public.career_rewards_batch(p_offset integer, p_limit integer, p_how text) to service_role;

