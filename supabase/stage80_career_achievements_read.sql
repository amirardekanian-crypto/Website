-- stage80_career_achievements_read.sql — what the Four Courts section reads: every achievement, earned or how close (Career Mode round 5;
-- career/CAREER_MODE.md → "Achievements get a big section"; Amir, 2026-10-19: "Achievements: go with your picks", look A, Four Courts)
--
-- Why: get_awards() answers only what an athlete has EARNED. Four Courts (on Progress in AA Performance) shows the four kinds as four tiles, each with
-- how many of its achievements are earned and the newest, opens a kind to list every one (earned with its day, the rest with what earns them), and
-- leads with ONE "Next up" line, the achievement the athlete is closest to. So the app needs one read of the whole list with each one's progress.
--
-- What it adds, and nothing else:
--   · get_achievements(p_athlete_id): the signed-in athlete's own (or, for the coach's preview, the athlete named; get_awards()'s identity rule).
--     Every achievement in the catalogue except one with nothing left to earn it by (retired, a mission's, a commendation's) that the athlete does not
--     hold; a free athlete sees only the free ones. Each: id, name, meaning, test, reads, caption, rule, size, xp, origin, the day it was earned, and,
--     when not earned, have and need from the same measures career_evaluate() reads (career_measures(), in one pass):
--       total: the count (a capped kind as paid) of `at` · best_run: the CURRENT run of held weeks of `at` · proof: Proof's measure of proof_need ·
--       best_value: the best lift gain of `at` (percent) · goals: goals met of goals · month_held: this calendar month's held training weeks of the
--       weeks ending in it (at least `weeks`), 0 and spoilt once one of them has ended unheld · any other test: 0 of 1.
--     `next` is the unearned one to show as Next up: the furthest along (have of need) among those with some progress, then the nearest to done;
--     with no progress anywhere, never a resilience one, then by kind, size and XP (the easiest first step). `month` is this month's {weeks, held, spoilt}.
-- No table, no XP, no write, no change to the scorer: it only reads. Rehearsed in scripts/career/rehearse_achievements.mjs (section 8). The way back:
-- scripts/career/rollback_stage80.sql (drops the function). Safe to re-run.
-- APPLIED to the live project 2026-10-19 on Amir's word ("yes, go live with Four Courts"), as the migration stage80_career_achievements_read;
-- the body read back equal to this file's, anon cannot run it, authenticated can; supabase/schema_snapshot.sql remade in the same commit (198 functions).

do $stage80_guard$
begin
  if position('month_held' in pg_get_functiondef('public.career_achievement_eval(text,text,jsonb,jsonb,jsonb)'::regprocedure)) = 0 then
    raise exception 'stage80: stage79 (the new achievements) is not live. Nothing was changed.';
  end if;
end
$stage80_guard$;

create or replace function public.get_achievements(p_athlete_id text default null) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_me text := public.current_athlete_id();
  v_id text := coalesce(nullif(btrim(coalesce(p_athlete_id, '')), ''), v_me);
  v_rules jsonb; v_S date; v_hr jsonb; v_ctx jsonb; v_owned jsonb; v_free boolean;
  v_keys text[] := '{}'::text[]; v_m jsonb := '{}'::jsonb; c record; g jsonb; v_items jsonb := '[]'::jsonb; v_next jsonb;
  v_test text; v_k text; v_have numeric; v_need numeric; v_day date; v_met integer; v_n integer;
  v_mw integer; v_mh integer; v_spoilt boolean;
begin
  if v_id is null then
    raise exception 'not signed in';
  end if;
  if not (public.is_coach() or v_id is not distinct from v_me or coalesce(auth.jwt() ->> 'role', '') in ('', 'service_role')) then
    raise exception 'not your profile';
  end if;
  v_rules := public.career_rules_now();
  v_S := case when v_rules is not null then public.career_switch_day(v_rules, 'catalogue') end;
  if v_S is null then
    return jsonb_build_object('athlete_id', v_id, 'ready', false, 'items', '[]'::jsonb, 'next', null);
  end if;
  v_hr := public.career_habit_rules();
  v_ctx := jsonb_build_object(        -- as career_evaluate() builds it, for the measures a Proof goal reads
    'S', v_S, 'hr', v_hr, 'targets', coalesce(v_hr -> 'targets', '{}'::jsonb),
    'custom', coalesce((select f.value -> 'custom' from public.career_facts f
                         where f.athlete_id = v_id and f.kind = 'habit_day' and f.void_at is null and jsonb_typeof(f.value -> 'custom') = 'array'
                         order by f.day desc limit 1), '[]'::jsonb));
  select coalesce(jsonb_object_agg(a.item, a.day), '{}'::jsonb) into v_owned
    from public.career_awards a where a.athlete_id = v_id and a.kind = 'achievement';
  v_free := coalesce((select p.data #>> '{athlete,tier}' = 'free' from public.programs p where p.athlete_id = v_id), false);

  -- the measures the unearned ones read, in one pass
  for c in select cc.id, cc.body from public.career_catalogue cc where cc.kind = 'achievement' loop
    if not (v_owned ? c.id) and public.career_achievement_test(c.body) in ('total', 'best_run', 'proof', 'goals', 'best_value') then
      v_keys := v_keys || public.career_entry_keys('achievement', c.body, v_ctx);
    end if;
  end loop;
  if cardinality(v_keys) > 0 then
    v_m := public.career_measures(v_id, v_ctx, v_keys);
  end if;

  -- this calendar month's training weeks (Full Month, stage79's rule): those ending in it; spoilt once one has ended unheld
  select count(*)::int, count(*) filter (where h.held)::int, coalesce(bool_or(not h.held and h.wto < current_date), false)
    into v_mw, v_mh, v_spoilt
    from (select w.wto,
                 exists (select 1 from public.career_facts f where f.athlete_id = v_id and f.kind = 'week_held' and f.void_at is null
                           and f.ref = 'c' || w.cycle_num || '|w' || w.week) as held
            from public.career_weeks(v_id) w
           where w.wto is not null and coalesce(array_length(w.plan, 1), 0) > 0
             and date_trunc('month', w.wto) = date_trunc('month', current_date::timestamp)) h;

  for c in select cc.id, cc.body from public.career_catalogue cc where cc.kind = 'achievement' order by cc.id loop
    v_day := (v_owned ->> c.id)::date;
    if v_day is null and (c.body ? 'retire_at' or c.body ->> 'reads' = 'mission_sweep' or c.body ->> 'meaning' = 'chosen') then
      continue;                                       -- nothing left to earn it by
    end if;
    if v_day is null and v_free and coalesce(c.body ->> 'free', 'false') <> 'true' then continue; end if;
    v_test := public.career_achievement_test(c.body);
    v_have := null; v_need := null;
    if v_day is null then
      if v_test in ('total', 'proof', 'best_value') then
        v_k := (public.career_entry_keys('achievement', c.body, v_ctx))[1];
        v_have := coalesce(public.career_num(v_m -> v_k -> 'have'), 0);
        v_need := public.career_num(case when v_test = 'proof' then c.body -> 'proof_need' else c.body -> 'at' end);
      elsif v_test = 'best_run' then
        v_have := coalesce(public.career_num(v_m -> 'weeks' -> 'now'), 0);
        v_need := public.career_num(c.body -> 'at');
      elsif v_test = 'goals' then
        v_met := 0; v_n := 0;
        for g in select e from jsonb_array_elements(case when jsonb_typeof(c.body -> 'goals') = 'array' then c.body -> 'goals' else '[]'::jsonb end) e loop
          v_n := v_n + 1;
          if coalesce(public.career_num(v_m -> public.career_proof_key(g ->> 'kind') -> 'have'), 0) >= coalesce(public.career_num(g -> 'need'), 1) then
            v_met := v_met + 1;
          end if;
        end loop;
        v_have := v_met; v_need := v_n;
      elsif v_test = 'month_held' then
        v_need := greatest(coalesce(public.career_num(c.body -> 'weeks'), 4), v_mw);
        v_have := case when v_spoilt then 0 else v_mh end;
      else
        v_have := 0; v_need := 1;
      end if;
      if v_need is null or v_need <= 0 then v_need := 1; end if;
      v_have := least(greatest(v_have, 0), v_need);
    end if;
    v_items := v_items || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'id', c.id, 'name', coalesce(c.body ->> 'name', c.id), 'meaning', c.body ->> 'meaning', 'test', v_test, 'reads', c.body ->> 'reads',
      'caption', c.body ->> 'caption', 'rule', c.body ->> 'rule', 'size', c.body ->> 'size', 'xp', c.body -> 'xp', 'origin', c.body ->> 'origin',
      'day', v_day, 'have', v_have, 'need', v_need,
      'spoilt', case when v_day is null and v_test = 'month_held' and v_spoilt then true end)));
  end loop;

  -- Next up: with some progress, the furthest along, then the nearest to done; with none, never a resilience one (nobody aims to miss a week),
  -- then consistency, commitment, progress, the smallest size, the least XP (the easiest first step: Held, Back to Back, Every Rep Counted)
  select z.e into v_next from (
    select e, (e ->> 'have')::numeric as h, (e ->> 'need')::numeric as n from jsonb_array_elements(v_items) e
     where e ->> 'day' is null and not coalesce((e ->> 'spoilt')::boolean, false)) z
   where z.h > 0 or z.e ->> 'meaning' is distinct from 'resilience'
   order by case when z.h > 0 then 0 else 1 end,
            case when z.h > 0 then z.h / z.n end desc nulls last,
            case when z.h > 0 then z.n - z.h end,
            array_position(array['consistency', 'commitment', 'progress', 'resilience'], z.e ->> 'meaning'),
            array_position(array['tick', 'win', 'highlight', 'milestone', 'legend'], z.e ->> 'size'),
            coalesce(public.career_num(z.e -> 'xp'), 0), z.e ->> 'id'
   limit 1;

  return jsonb_build_object('athlete_id', v_id, 'ready', true, 'items', v_items, 'next', v_next,
                            'month', jsonb_build_object('weeks', v_mw, 'held', v_mh, 'spoilt', v_spoilt));
end $function$;
revoke all on function public.get_achievements(p_athlete_id text) from public, anon, authenticated, service_role;
grant execute on function public.get_achievements(p_athlete_id text) to authenticated, service_role;
