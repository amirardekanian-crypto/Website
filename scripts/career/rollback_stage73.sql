-- The way back from stage73 (The Upgrade and Double Up on main lifts only, D18 as amended 2026-10-18: a lift on one of the seven main
-- patterns whose Spine entry is tagged strength and is not one of the four accessories Amir left out; and the paid-session counts, D19).
-- On Amir's word only (CLAUDE.md: a change to the live project waits for his yes), after a backup (coach.html → ⚙ Tools → ⤓ Backup).
--
-- It puts back stage70's career_entry_keys(), career_measures(), career_achievement_eval() and career_rewards_profile(), byte for byte as
-- stage70 wrote them (stage71 and stage72, the weight units, replace none of the four, so that is their live text before stage73), drops
-- career_maxpct_key(), and takes the stamp off the cached rewards so the next full evaluate looks again. An award minted while stage73
-- stood is kept (GAME-1: rewards are never revoked). Leave `patterns`, `qualities` and `exclude` in the catalogue or not: stage70 reads
-- none of them, so with its text back The Upgrade and Double Up count every lift again, the isolation lifts and Amir's four accessories
-- included.
-- With stage70 to come off too, run this file first: rollback_stage70.sql does not know career_maxpct_key() and would leave it behind.
-- stage71 and stage72 (the weight units) stay as they are: this file takes off stage73 alone (none of the four functions is theirs), and
-- their own way back is no part of it. stage73 calls none of their functions, so their ways back can run before this file or after it.
-- Run it as one statement batch (the Supabase tool's execute_sql, or the SQL editor). It is safe to run twice.

begin;
create or replace function public.career_entry_keys(p_kind text, p_body jsonb, p_ctx jsonb) returns text[]
language plpgsql immutable set search_path to 'public' as $function$
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
      when 'best_value' then return array['maxpct'];
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
    return array['maxpct'];
  elsif v_t = 'run_regained' then
    return array['weeks'];
  end if;
  return '{}'::text[];
end $function$;

create or replace function public.career_measures(p_athlete text, p_ctx jsonb, p_keys text[]) returns jsonb
language plpgsql stable set search_path to 'public' as $function$
declare
  v_out jsonb := '{}'::jsonb; v_k text; v_h text; v_t numeric; v_v jsonb; v_kinds text[]; r record;
  v_best integer; v_run integer; v_steps jsonb; v_walk jsonb; v_custom text[];
  c_empty constant jsonb := '{"have": 0, "now": null, "steps": []}'::jsonb;
begin
  v_custom := array(select jsonb_array_elements_text(coalesce(p_ctx -> 'custom', '[]'::jsonb)));
  for v_k in select distinct x from unnest(coalesce(p_keys, '{}'::text[])) x where x is not null order by 1 loop
    v_v := null;
    if v_k like 'run:%' or v_k like 'hits:%' or v_k like 'sum:%' then
      v_h := substr(v_k, strpos(v_k, ':') + 1);
      v_t := coalesce(public.career_num(p_ctx -> 'targets' -> v_h), case when v_h = any (v_custom) then 1 end);
      if v_k = 'run:custom' then
        with dn as (
          select substr(f.ref, 12) as hid, f.day as d from public.career_facts f
           where f.athlete_id = p_athlete and f.kind = 'habit_done' and f.void_at is null
             and substr(f.ref, 12) = any (v_custom)
             and jsonb_typeof(f.value -> 'v') = 'number' and (f.value ->> 'v')::numeric >= 1
        ),
        isl as (select dn.hid, dn.d, dn.d - (row_number() over (partition by dn.hid order by dn.d))::int as grp from dn),
        rl as (select isl.hid, isl.d, (row_number() over (partition by isl.hid, isl.grp order by isl.d))::int as run from isl),
        lastd as (select distinct on (rl.hid) rl.hid, rl.d, rl.run from rl order by rl.hid, rl.d desc),
        perday as (select rl.d, max(rl.run) as run, (array_agg(rl.hid order by rl.run desc, rl.hid))[1] as hid from rl group by rl.d),
        mx as (select p.d, p.run, p.hid,
                      coalesce(max(p.run) over (order by p.d rows between unbounded preceding and 1 preceding), 0) as prev from perday p)
        select jsonb_build_object(
                 'have', coalesce((select max(perday.run) from perday), 0),
                 'now', coalesce((select max(l.run) from lastd l where l.d >= current_date - 1), 0),
                 'steps', coalesce((select jsonb_agg(jsonb_build_array(mx.d, mx.run, 'habit_done', mx.d::text || '|' || mx.hid) order by mx.d)
                                      from mx where mx.run > mx.prev), '[]'::jsonb))
          into v_v;
      elsif v_t is null then
        v_v := c_empty;
      elsif v_k like 'run:%' then
        with dn as (
          select f.day as d from public.career_facts f
           where f.athlete_id = p_athlete and f.kind = 'habit_done' and f.void_at is null and substr(f.ref, 12) = v_h
             and jsonb_typeof(f.value -> 'v') = 'number' and (f.value ->> 'v')::numeric >= v_t
        ),
        isl as (select dn.d, dn.d - (row_number() over (order by dn.d))::int as grp from dn),
        rl as (select isl.d, (row_number() over (partition by isl.grp order by isl.d))::int as run from isl),
        mx as (select rl.d, rl.run, coalesce(max(rl.run) over (order by rl.d rows between unbounded preceding and 1 preceding), 0) as prev from rl)
        select jsonb_build_object(
                 'have', coalesce((select max(rl.run) from rl), 0),
                 'now', coalesce((select rl.run from rl where rl.d >= current_date - 1 order by rl.d desc limit 1), 0),
                 'steps', coalesce((select jsonb_agg(jsonb_build_array(mx.d, mx.run, 'habit_done', mx.d::text || '|' || v_h) order by mx.d)
                                      from mx where mx.run > mx.prev), '[]'::jsonb))
          into v_v;
      elsif v_k like 'hits:%' then
        with dn as (
          select f.day as d, f.ref from public.career_facts f
           where f.athlete_id = p_athlete and f.kind = 'habit_done' and f.void_at is null and substr(f.ref, 12) = v_h
             and jsonb_typeof(f.value -> 'v') = 'number' and (f.value ->> 'v')::numeric >= v_t
        ),
        hn as (select dn.d, dn.ref, (row_number() over (order by dn.d))::int as n from dn)
        select jsonb_build_object('have', (select count(*) from dn), 'now', null,
                 'steps', coalesce((select jsonb_agg(jsonb_build_array(hn.d, hn.n, 'habit_done', hn.ref) order by hn.d) from hn), '[]'::jsonb))
          into v_v;
      else      -- sum: every number logged for the habit, as hab_bonus_xp()'s quest totals add them
        with x as (
          select f.day as d, f.ref, (f.value ->> 'v')::numeric as val from public.career_facts f
           where f.athlete_id = p_athlete and f.kind = 'habit_done' and f.void_at is null and substr(f.ref, 12) = v_h
             and jsonb_typeof(f.value -> 'v') = 'number'
        ),
        acc as (select x.d, x.ref, x.val, sum(x.val) over (order by x.d) as tot from x)
        select jsonb_build_object('have', coalesce((select sum(x.val) from x), 0), 'now', null,
                 'steps', coalesce((select jsonb_agg(jsonb_build_array(acc.d, acc.tot, 'habit_done', acc.ref) order by acc.d)
                                      from acc where acc.val > 0), '[]'::jsonb))
          into v_v;
      end if;
    elsif v_k = 'with3' then
      with w3 as (select hd.d, (row_number() over (order by hd.d))::int as n from public.career_habit_days(p_athlete) hd where hd.ndone >= 3)
      select jsonb_build_object('have', (select count(*) from w3), 'now', null,
               'steps', coalesce((select jsonb_agg(jsonb_build_array(w3.d, w3.n, 'habit_day', w3.d::text) order by w3.d) from w3), '[]'::jsonb))
        into v_v;
    elsif v_k in ('perfect', 'qualify', 'stuck') or v_k like 'count:%' then
      v_kinds := case v_k when 'perfect' then array['perfect_day'] when 'qualify' then array['day_on_target']
                          when 'stuck' then array['comeback_stuck'] else string_to_array(substr(v_k, 7), ',') end;
      with x as (
        select f.day as d, f.kind, f.ref, (row_number() over (order by f.day, f.ref, f.kind))::int as n from public.career_facts f
         where f.athlete_id = p_athlete and f.kind = any (v_kinds) and f.void_at is null
      )
      select jsonb_build_object('have', (select count(*) from x), 'now', null,
               'steps', coalesce((select jsonb_agg(jsonb_build_array(x.d, x.n, x.kind, x.ref) order by x.n) from x), '[]'::jsonb))
        into v_v;
    elsif v_k in ('daystreak', 'cbrun') then
      with q as (
        select f.day as d from public.career_facts f
         where f.athlete_id = p_athlete and f.kind = 'day_on_target' and f.void_at is null
      ),
      isl as (select q.d, q.d - (row_number() over (order by q.d))::int as grp from q),
      rl as (select isl.d, isl.grp, (row_number() over (partition by isl.grp order by isl.d))::int as run from isl),
      st as (select isl.grp, min(isl.d) as s from isl group by isl.grp),
      cb as (
        select f.day as c, f.ref from public.career_facts f
         where f.athlete_id = p_athlete and f.kind = 'comeback' and f.void_at is null
      ),
      pts as (    -- the day streak: every on-target day with its run; after a comeback: the days of the run that starts on it
        select rl.d, rl.run, 'day_on_target'::text as kind, rl.d::text as ref from rl where v_k = 'daystreak'
        union all
        select i.d, (i.d - cb.c + 1)::int, 'comeback', cb.ref from cb join st on st.s = cb.c join isl i on i.grp = st.grp where v_k = 'cbrun'
      ),
      mx as (select pts.*, coalesce(max(pts.run) over (order by pts.d rows between unbounded preceding and 1 preceding), 0) as prev from pts)
      select jsonb_build_object(
               'have', coalesce((select max(pts.run) from pts), 0),
               'now', case when v_k = 'daystreak'
                           then coalesce((select rl.run from rl where rl.d >= current_date - 1 order by rl.d desc limit 1), 0) end,
               'steps', coalesce((select jsonb_agg(jsonb_build_array(mx.d, mx.run, mx.kind, mx.ref) order by mx.d) from mx where mx.run > mx.prev),
                                 '[]'::jsonb))
        into v_v;
    elsif v_k = 'weeks' then
      -- held weeks in a row, walked as get_profile() walks them: a held week adds one, a broken week ends the run (a week between
      -- cycles, or one Amir paused, has no fact and is no week at all). The walk is kept for All the Way Back.
      v_best := 0; v_run := 0; v_steps := '[]'::jsonb; v_walk := '[]'::jsonb;
      for r in select f.kind, f.day, f.ref, public.career_num(f.value -> 'sessions') as sess from public.career_facts f
                where f.athlete_id = p_athlete and f.void_at is null and f.kind in ('week_held', 'week_broken')
                order by f.day, f.ref loop
        if r.kind = 'week_held' then
          v_run := v_run + 1;
          if v_run > v_best then
            v_best := v_run;
            v_steps := v_steps || jsonb_build_array(jsonb_build_array(r.day, v_run, r.kind, r.ref));
          end if;
        else
          v_run := 0;
        end if;
        v_walk := v_walk || jsonb_build_array(jsonb_build_array(r.day, case when r.kind = 'week_held' then 'h' else 'b' end, r.sess, r.ref));
      end loop;
      v_v := jsonb_build_object('have', v_best, 'now', v_run, 'steps', v_steps, 'walk', v_walk);
    elsif v_k like 'iso:%' then
      v_h := substr(v_k, 5);
      with x as (
        select f.day, f.ref from public.career_facts f
         where f.athlete_id = p_athlete and f.kind = v_h and f.void_at is null
      ),
      w as (select date_trunc('week', x.day)::date as wk, min(x.day) as fd, (array_agg(x.ref order by x.day, x.ref))[1] as ref from x group by 1),
      isl as (select w.wk, w.fd, w.ref, w.wk - (7 * row_number() over (order by w.wk))::int as grp from w),
      rl as (select isl.wk, isl.fd, isl.ref, (row_number() over (partition by isl.grp order by isl.wk))::int as run from isl),
      mx as (select rl.*, coalesce(max(rl.run) over (order by rl.wk rows between unbounded preceding and 1 preceding), 0) as prev from rl)
      select jsonb_build_object(
               'have', coalesce((select max(rl.run) from rl), 0),
               'now', coalesce((select rl.run from rl where rl.wk >= date_trunc('week', current_date)::date - 7 order by rl.wk desc limit 1), 0),
               'steps', coalesce((select jsonb_agg(jsonb_build_array(mx.fd, mx.run, v_h, mx.ref) order by mx.wk) from mx where mx.run > mx.prev),
                                 '[]'::jsonb))
        into v_v;
    elsif v_k = 'maxpct' then
      -- a lift_gain keeps only its latest high, so earlier history is lost (accepted, spec §3.3)
      with x as (
        select f.day as d, f.ref, public.career_num(f.value -> 'pct') as pct from public.career_facts f
         where f.athlete_id = p_athlete and f.kind = 'lift_gain' and f.void_at is null and public.career_num(f.value -> 'pct') is not null
      ),
      mx as (select x.*, max(x.pct) over (order by x.d, x.ref rows between unbounded preceding and 1 preceding) as prev from x)
      select jsonb_build_object('have', coalesce((select max(x.pct) from x), 0), 'now', null,
               'steps', coalesce((select jsonb_agg(jsonb_build_array(mx.d, mx.pct, 'lift_gain', mx.ref) order by mx.d, mx.ref)
                                    from mx where mx.prev is null or mx.pct > mx.prev), '[]'::jsonb))
        into v_v;
    end if;
    v_out := v_out || jsonb_build_object(v_k, coalesce(v_v, c_empty));
  end loop;
  return v_out;
end $function$;

create or replace function public.career_achievement_eval(p_athlete text, p_id text, p_body jsonb, p_m jsonb, p_ctx jsonb) returns jsonb
language plpgsql stable set search_path to 'public' as $function$
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
    v_k := case when v_test = 'proof' then public.career_proof_key(p_body ->> 'proof_measure') else 'maxpct' end;
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

create or replace function public.career_rewards_profile(p_athlete text, p_rw jsonb) returns jsonb
language plpgsql stable set search_path to 'public' as $function$
declare
  v_rules jsonb := public.career_rules_now(); v_S date; v_rw jsonb := p_rw; v_stale boolean := false; v_hr jsonb;
  v_ms jsonb; v_keep integer; v_max integer; v_full jsonb; v_free boolean; f record; v_now integer := 0; v_best integer := 0;
  v_dnow integer; v_dbest integer; v_four jsonb; v_ladder jsonb; v_near jsonb; v_out jsonb; v_moments jsonb;
  c_rank constant jsonb := '{"tick": 0, "win": 1, "highlight": 2, "milestone": 3, "legend": 4}'::jsonb;
  c_session constant jsonb := '["session_finished", "session_finished_early", "full_log", "checkin_done"]'::jsonb;
  c_week constant jsonb := '["week_held", "week_by_the_book", "bounce_back", "training_return", "cycle_finished", "roadmap_finished", "effort_win"]'::jsonb;
begin
  v_S := public.career_switch_day(v_rules, 'catalogue');
  if v_S is null then
    return '{"badges": [], "achievements": [], "moments": []}'::jsonb;
  end if;
  if v_rw is null then
    select s.rewards into v_rw from public.career_scores s where s.athlete_id = p_athlete;
    v_rw := coalesce(v_rw, '{}'::jsonb);
    v_stale := true;
  end if;
  v_hr := public.career_habit_rules();
  select c.body into v_ms from public.career_catalogue c where c.kind = 'setting' and c.id = 'moments';
  v_keep := coalesce(public.career_num(v_ms -> 'keep_days'), 14)::int;
  v_max := coalesce(public.career_num(v_ms -> 'max'), 8)::int;
  v_full := coalesce(case when jsonb_typeof(v_ms -> 'full_screen') = 'array' then v_ms -> 'full_screen' end, '["milestone", "legend"]'::jsonb);
  v_free := coalesce((select p.data #>> '{athlete,tier}' = 'free' from public.programs p where p.athlete_id = p_athlete), false);

  -- the four numbers (D3, D4)
  for f in select cf.kind from public.career_facts cf
            where cf.athlete_id = p_athlete and cf.void_at is null and cf.kind in ('week_held', 'week_broken')
            order by cf.day, cf.ref loop
    if f.kind = 'week_held' then v_now := v_now + 1; v_best := greatest(v_best, v_now); else v_now := 0; end if;
  end loop;
  with q as (select cf.day as d from public.career_facts cf where cf.athlete_id = p_athlete and cf.kind = 'day_on_target' and cf.void_at is null),
  isl as (select q.d, q.d - (row_number() over (order by q.d))::int as grp from q),
  rl as (select isl.d, (row_number() over (partition by isl.grp order by isl.d))::int as run from isl)
  select coalesce((select rl.run from rl where rl.d >= current_date - 1 order by rl.d desc limit 1), 0), coalesce((select max(rl.run) from rl), 0)
    into v_dnow, v_dbest;
  select jsonb_build_object(
           'consistency', case when v_free then jsonb_build_object('key', 'day_streak', 'value', v_dnow, 'best', v_dbest)
                               else jsonb_build_object('key', 'weeks_held', 'value', v_now, 'best', v_best) end,
           'commitment', case when v_free then jsonb_build_object('key', 'perfect_days', 'value', count(*) filter (where cf.kind = 'perfect_day'))
                              else jsonb_build_object('key', 'sessions_with_amir',
                                                      'value', count(*) filter (where cf.kind in ('session_finished', 'session_finished_early'))) end,
           'progress', case when v_free then jsonb_build_object('key', 'habit_steps', 'locked', true,
                              'value', coalesce((select sum(z.t) from (select max(a.tier) as t from public.career_awards a
                                                                         join public.career_catalogue c on c.kind = 'badge' and c.id = a.item
                                                                        where a.athlete_id = p_athlete and a.kind = 'badge'
                                                                          and c.body ->> 'kind' = 'best_run' and c.body ? 'habit'
                                                                        group by a.item) z), 0))
                            else jsonb_build_object('key', 'personal_bests', 'value', count(*) filter (where cf.kind = 'personal_best')) end,
           'resilience', jsonb_build_object('key', 'comebacks', 'value', count(*) filter (where cf.kind in ('comeback', 'training_return'))))
    into v_four
    from public.career_facts cf where cf.athlete_id = p_athlete and cf.void_at is null;

  -- the ladder: every live badge (not retired, not chosen), where it stands and its next tier. The size budget (spec §6): a key whose
  -- value is null is left out (phone on a server-only badge, the next-tier keys on a top tier: both apps read absent as null), a `have`
  -- or `tier` of 0 is left out (both apps and the rehearsal read Number(x) || 0), and `counts` and `now` go only with a `phone` (the
  -- finish card, careerMoves(), reads them for those alone); so does `size_next`, once the near list below has been ordered by it.
  -- `next_tier` is always tier + 1 beside a `next`: it goes with a `phone` (the training app's award id for a tier its finish card
  -- crossed, rwCountingBands()) and past tier 5 only, because AA Proof's one other read of it, catalogueTotal() without its catalogue
  -- copy, counts max(5, next_tier) steps for a ladder not yet at its top: absent and 1 to 5 are the same 5 there.
  select coalesce(jsonb_object_agg(c.id, jsonb_strip_nulls(jsonb_build_object(
           'name', c.body ->> 'name', 'meaning', c.body ->> 'meaning', 'counts', case when z.phone is not null then z.counts end,
           'have', nullif(coalesce(public.career_num(v_rw -> 'have' -> c.id), 0), 0),
           'now', case when z.phone is not null then v_rw -> 'now' -> c.id end,
           'tier', nullif(t.tier, 0), 'next', public.career_num(t.nt -> 'at'),
           'next_tier', case when t.nt is not null and (z.phone is not null or t.tier + 1 > 5) then t.tier + 1 end,
           'metal_next', t.nt ->> 'metal', 'size_next', t.nt ->> 'size',
           'phone', z.phone))), '{}'::jsonb)
    into v_ladder
    from public.career_catalogue c
    cross join lateral (select y.counts, case when jsonb_array_length(y.counts) = 0 then null
                                              when y.counts <@ c_session then 'session' when y.counts <@ c_week then 'week' end as phone
                          from (select case jsonb_typeof(c.body -> 'counts') when 'array' then c.body -> 'counts'
                                            when 'string' then jsonb_build_array(c.body -> 'counts') else '[]'::jsonb end as counts) y) z
    cross join lateral (select y.tier, c.body -> 'tiers' -> y.tier as nt
                          from (select coalesce(max(a.tier), 0) as tier from public.career_awards a
                                 where a.athlete_id = p_athlete and a.kind = 'badge' and a.item = c.id and a.subject = '') y) t
   where c.kind = 'badge' and not (c.body ? 'retire_at') and coalesce(c.body ->> 'meaning', '') <> 'chosen'
     and coalesce(c.body ->> 'kind', '') <> 'per_habit_best_run';

  -- near: the nearest goals, an index into the ladder (its name, have, next, meaning, next_tier and metal_next are the ladder entry's,
  -- under the same id). The size budget: the first row carries id, name, have, next and pct (the training app's Home row prints near[0]
  -- alone, careerNearText()); every other row is its id only (AA Proof reads the ids and draws the rest from the ladder, catalogueShelf()).
  select coalesce(jsonb_agg(case when n.rn = 1 then n.j else jsonb_build_object('id', n.id) end order by n.rn), '[]'::jsonb) into v_near
    from (select e.key as id,
                 jsonb_build_object('id', e.key, 'name', e.value ->> 'name', 'have', e.value -> 'have', 'next', e.value -> 'next',
                                    'pct', floor(public.career_num(e.value -> 'have') * 100 / public.career_num(e.value -> 'next'))::int) as j,
                 row_number() over (order by (public.career_num(e.value -> 'next') - public.career_num(e.value -> 'have'))
                                               / public.career_num(e.value -> 'next'),
                                             coalesce(public.career_num(c_rank -> (e.value ->> 'size_next')), 0) desc, e.key) as rn
            from jsonb_each(v_ladder) e
           where public.career_num(e.value -> 'have') > 0 and public.career_num(e.value -> 'next') > 0) n
   where n.rn <= 6;

  -- size_next stays only beside a `phone`: the training app reads it for a ladder its finish card moved (rwCountingBands()), AA Proof
  -- never (the near order above has used it already). The size budget.
  select coalesce(jsonb_object_agg(e.key, case when e.value ? 'phone' then e.value else e.value - 'size_next' end), '{}'::jsonb)
    into v_ladder from jsonb_each(v_ladder) e;

  -- the moments waiting to be told: `also` (the title the award minted) only when there is one (the size budget)
  select coalesce(jsonb_agg(m.j order by m.rk desc, m.day desc, m.award_id), '[]'::jsonb) into v_moments
    from (select r.award_id, a.day, coalesce(public.career_num(c_rank -> r.size), 0) as rk,
                 jsonb_build_object(
                   'award_id', r.award_id, 'kind', a.kind, 'item', a.item, 'tier', a.tier, 'size', r.size, 'day', a.day,
                   'full', (v_full ? r.size) and r.due_at >= now() - make_interval(days => v_keep),
                   'xp', case when not a.pays then 0 else coalesce(public.career_award_xp(a.kind, a.tier, a.subject, c.body, v_hr), a.xp) end,
                   'spec', public.career_award_spec(a.kind, a.item, a.tier, a.day, a.evidence, c.body))
                 || coalesce((select jsonb_build_object('also', jsonb_agg(public.career_award_spec('title', ta.item, null, ta.day, ta.evidence, tc.body)
                                                                          order by ta.item))
                                from public.career_awards ta left join public.career_catalogue tc on tc.kind = 'title' and tc.id = ta.item
                               where ta.athlete_id = p_athlete and ta.kind = 'title' and ta.evidence ->> 'from' = r.award_id
                              having count(*) > 0), '{}'::jsonb) as j
            from public.career_recognition r
            join public.career_awards a on a.athlete_id = r.athlete_id and a.award_id = r.award_id
            left join public.career_catalogue c on c.kind = a.kind and c.id = a.item
           where r.athlete_id = p_athlete and r.audience = 'athlete' and r.told_at is null
           order by 3 desc, a.day desc, r.award_id limit greatest(v_max, 0)) m;

  v_out := jsonb_build_object(
    'catalogue_version', (select r.version::text || '@' || extract(epoch from r.loaded_at)::bigint::text
                            from public.career_rules r order by r.version desc limit 1),
    'numbers', jsonb_build_object('free', v_free, 'four', v_four),
    -- owned: every award id the athlete holds, sorted byte by byte (the phones' dedupe and the shelf's held mark; a set: no day here,
    -- get_awards() has each day). About 25 bytes an award: the one part of the core that grows with a career.
    'owned', coalesce((select jsonb_agg(a.award_id order by a.award_id collate "C") from public.career_awards a where a.athlete_id = p_athlete),
                      '[]'::jsonb),
    'title_worn', (select o.title from public.leaderboard_optin o where o.athlete_id = p_athlete),
    'slam', public.career_slam(p_athlete),
    'ladder', v_ladder,
    'near', v_near,
    'moments', v_moments);
  if v_stale then v_out := v_out || '{"rewards_stale": true}'::jsonb; end if;
  return v_out;
end $function$;

drop function if exists public.career_maxpct_key(jsonb);

update public.career_scores set rewards = rewards - 'stamp' where rewards ? 'stamp';

commit;
