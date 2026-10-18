-- stage72 — a lift's numbers in its own measure (2026-10-18; Amir: "personal records can be in all measures, and it's only an achievement if
-- you go higher than your previous record in the same measure"; program.html → "A MEASURE: kg, lb or plates"). Safe to re-run.
-- Two functions change and seven small ones are new. No table, no trigger.
--
-- THE RULE, from the athlete's app: a lift's record, win and best are each kept IN ITS OWN MEASURE (kg, lb or plates) and never compared with
-- another; the first record in a measure beats nothing. Nothing is converted any more: 225 lb is not "higher" than 100 kg, a stack at 9
-- plates is not a weight in kilograms, and a lift switched from kg to lb is a new series, not a huge jump. Stage71 had made career_kg() turn
-- pounds into kilograms and plates into no weight at all, so that the old maths would not misread them; the rule above replaces that stopgap.
-- Nothing reads career_kg() after this stage (it stays, as stage71 left it).
--
-- What changes
--   · New helpers. career_w(p) reads a free-text weight the way program.html's weightOf() does and answers its number IN ITS OWN MEASURE and
--     its unit ('kg' | 'lb' | 'plates'; 'kg' when there is no number); career_wn() and career_wu() are the two halves. career_lift_key(name,
--     unit) is the key a lift's series is kept under: the plain normalised name for kilograms (every key that exists today) and name|lb or
--     name|plates for the others; career_lift_base() and career_lift_unit() take a key apart; career_rec_unit() is a Personal Records entry's
--     measure (program.html's uKey(e.u)).
--   · career_entry_sets(): per exercise, the measure is the unit of the FIRST logged set (a weight, an RPE or a tick) that holds a weight
--     number, else kilograms (setsMeasure()); a set whose weight is in another measure is ignored for that exercise (cycleBestSet() and
--     histBestSet() skip it); b_w is the typed number in the measure, best_est is rounded to the measure's step (ONE_RM_ROUND: 2.5 kg, 5 lb,
--     0.5 plate); `lift` is career_lift_key(name, measure). The estimate of a pound or plates lift is worked out in doubles, operation for
--     operation as estimateOneRM() does, because an estimate can land exactly on half a step (225 lb × 5 @8 is 277.5, half way between 275 and
--     280) and the app rounds it up where exact numbers (1/30 cut at 20 digits) round it down; kilograms are left in exact numbers, as stage66
--     had them, so that no kilogram fact moves (the same tie in kilograms, 37.5 kg × 5 @8 = 46.25, is 47.5 in the app and 45 here, as it
--     was in stage66: declared in scripts/career/rehearse_measures.mjs, not changed). The signature is the same. career_cycle_wins(), career_lift_gains() and
--     career_win_gain() are NOT redefined: they group by `lift`, so a win, a lift_gain and their refs are one series per lift AND measure by
--     themselves, and a plates set is now a LOADED set (a number in its own measure), so a plates win is a normal weight win. Their half-unit
--     rounding, round((b_w - a_w) * 2) / 2, is winText()'s Math.round(... * 2) / 2 for all three measures (they differ only for a negative
--     half, where both say "not up").
--   · career_derive(): (a) personal_best keys on lift AND measure: the day's newest write is per lift, day and measure, the first number in a
--     measure is not a best, and the fact's ref and value carry the measure (…|lb, …|plates; value.u) so two measures on one day are two
--     facts; (b) retests: the evidence from the sessions joins the flagged lift by its plain name but is grouped and compared per full key,
--     so the retest_done and retest_beaten refs are unique per measure (back squat|c2, back squat|lb|c2), the evidence from the records
--     array and the earlier test and best it is judged against are the same lift in the same measure, and a retest in pounds is judged
--     against pounds only.
--
-- Existing data does not move. For an athlete whose weights are all kilograms (every athlete today) every key, ref, value and number is what
-- the stage66, 69, 70 and 71 functions produce: kilograms keep the plain key, no `u` is added, the rounding step is 2.5. The rehearsals prove
-- it: scripts/career/rehearse_measures.mjs (the numbers, row by row, against the old functions and against program.html's JavaScript) and
-- scripts/career/rehearse.mjs (the facts of a whole athlete, old functions against new, and made-up athletes in pounds and plates).
-- The way back is scripts/career/rollback_stage72.sql, on Amir's word only.

-- ── 1. helpers ───────────────────────────────────────────────────────────────────────────────────────────────────────────

-- program.html's weightOf(): the first number of a free-text weight ("62,5", "60kg", "۲۵"), "2×20" read as one implement's 20 (only a count
-- of 1 to 4 counts as a pair), and the unit written in it: pounds first, then plates, else kilograms. The number is NOT converted: it is in
-- its own measure. No number (or 0) is n null and u 'kg', as weightOf() answers { n: null, unit: 'kg' }.
create or replace function public.career_w(p jsonb, out n numeric, out u text)
language plpgsql immutable set search_path to 'public' as $function$
declare t text; m text[];
begin
  n := null; u := 'kg';
  if p is null or jsonb_typeof(p) not in ('string', 'number') then return; end if;
  if not public.career_truthy(p) then return; end if;               -- String(v || ''): 0 and '' read as nothing
  t := regexp_replace(public.career_digits(p #>> '{}'), ',', '.');   -- the first comma only, as String.replace does
  m := regexp_match(t, '^\s*([1-4])\s*[×xX*]\s*([0-9]+(?:\.[0-9]+)?)');
  if m is not null then
    n := m[2]::numeric;
  else
    m := regexp_match(t, '[0-9]+(?:\.[0-9]+)?');
    if m is null then return; end if;
    n := m[1]::numeric;
  end if;
  if not (n > 0) then n := null; return; end if;
  if t ~* '[0-9]\s*(lbs?|pounds?)([^a-z]|$)' then u := 'lb';
  elsif t ~* '[0-9]\s*plates?([^a-z]|$)' then u := 'plates';
  end if;
end $function$;

create or replace function public.career_wn(p jsonb) returns numeric
language sql immutable set search_path to 'public' as $function$ select (public.career_w(p)).n $function$;

create or replace function public.career_wu(p jsonb) returns text
language sql immutable set search_path to 'public' as $function$ select (public.career_w(p)).u $function$;

-- The key a lift's series is kept under: the normalised name for kilograms (the key every fact has today), name|lb or name|plates for the
-- other measures (program.html's cycleWins(): histNorm(name) + '|' + unit). Anything that is not 'lb' or 'plates' is kilograms.
create or replace function public.career_lift_key(p_name text, p_unit text) returns text
language sql immutable set search_path to 'public' as $function$
  select public.career_norm(p_name) || case when p_unit in ('lb', 'plates') then '|' || p_unit else '' end
$function$;

-- A key taken apart: the plain normalised name, and the measure.
create or replace function public.career_lift_base(p_key text) returns text
language sql immutable set search_path to 'public' as $function$ select regexp_replace(p_key, '\|(lb|plates)$', '') $function$;

create or replace function public.career_lift_unit(p_key text) returns text
language sql immutable set search_path to 'public' as $function$
  select case when p_key ~ '\|lb$' then 'lb' when p_key ~ '\|plates$' then 'plates' else 'kg' end
$function$;

-- A Personal Records entry's measure: its `u` when that is exactly 'lb' or 'plates', else kilograms (program.html's uKey(e.u)).
create or replace function public.career_rec_unit(p jsonb) returns text
language sql immutable set search_path to 'public' as $function$
  select case when jsonb_typeof(p -> 'u') = 'string' and (p ->> 'u') in ('lb', 'plates') then p ->> 'u' else 'kg' end
$function$;

-- ── 2. the two functions that change ─────────────────────────────────────────────────────────────────────────────────────

-- Every exercise of every structured session log in a window, with its best set by cycleBestSet() (the effort-adjusted index: Epley on
-- reps to failure, reps + 10 − RPE) and its best estimate of a max by histBestSet() (estimateOneRM(): RPE needed, at most 10 effective
-- reps, rounded to a step of the exercise's measure: 2.5 kg, 5 lb, 0.5 plate). Both are program.html's maths, mirrored: a change there
-- changes here (CLAUDE.md, things that exist twice). Sessions saved before the structured log existed (only the text summary) are not read.
-- THE MEASURE (stage72): an exercise is lifted in one measure, the unit of its first logged set that holds a weight, else kilograms
-- (setsMeasure()); a set typed in another measure is left out, so two measures never meet. b_w and best_est are numbers IN that measure
-- (pounds are no longer turned into kilograms, plates are a weight like any other), and `lift` is the plain name for kilograms and
-- name|lb or name|plates for the others, so everything that groups by `lift` keeps the measures apart without knowing about them.
create or replace function public.career_entry_sets(p_athlete text, p_from date, p_to date, p_plan text[])
returns table (d date, plan_day integer, ord integer, name text, lift text,
               b_w numeric, b_n numeric, b_n_given boolean, b_r numeric, b_idx numeric, best_est numeric)
language plpgsql stable set search_path to 'public' as $function$
declare
  s record; e jsonb; eo integer; st jsonb;
  w numeric; n numeric; n_given boolean; r numeric; rir numeric; idx numeric; rpe numeric; eff numeric; est numeric;
  has_best boolean; bw numeric; bn numeric; bng boolean; br numeric; bidx numeric; best numeric;
  sets jsonb; wu text; v_m text; v_step numeric; wr record;
begin
  for s in
    select sh.completed_on, sh.day, sh.log from public.session_history sh
     where sh.athlete_id = p_athlete and sh.hidden_at is null and jsonb_typeof(sh.log) = 'array'
       and sh.completed_on between coalesce(p_from, '-infinity'::date) and coalesce(p_to, 'infinity'::date)
       and (p_plan is null or sh.day::text = any (p_plan))
     order by sh.completed_on, sh.day
  loop
    eo := 0;
    for e in select x.value from jsonb_array_elements(s.log) x loop
      eo := eo + 1;
      if jsonb_typeof(e) <> 'object' or public.career_truthy(e -> 'circuit') or not public.career_truthy(e -> 'ex') then continue; end if;
      has_best := false; bw := null; bn := null; bng := false; br := null; bidx := null; best := null;
      sets := case when jsonb_typeof(e -> 'sets') = 'array' then e -> 'sets' else '[]'::jsonb end;
      -- setsMeasure(): the measure of an exercise is the unit of the first logged set that holds a weight, else kilograms
      v_m := 'kg';
      for st in select y.value from jsonb_array_elements(sets) y loop
        if jsonb_typeof(st) = 'object'
           and (public.career_truthy(st -> 'w') or public.career_truthy(st -> 'r') or public.career_truthy(st -> 'd')) then
          wr := public.career_w(st -> 'w');
          if wr.n is not null then v_m := wr.u; exit; end if;
        end if;
      end loop;
      v_step := case v_m when 'lb' then 5 when 'plates' then 0.5 else 2.5 end;      -- ONE_RM_ROUND
      for st in select y.value from jsonb_array_elements(sets) y loop
        -- histSetLogged(): a weight, an RPE or a tick
        if jsonb_typeof(st) <> 'object'
           or not (public.career_truthy(st -> 'w') or public.career_truthy(st -> 'r') or public.career_truthy(st -> 'd')) then
          continue;
        end if;
        wr := public.career_w(st -> 'w'); w := wr.n; wu := wr.u;          -- the number as typed, in its own measure
        if w is not null and wu <> v_m then continue; end if;          -- a set in another measure is left out (cycleBestSet(), histBestSet())
        if st ? 'n' and jsonb_typeof(st -> 'n') <> 'null' and not (jsonb_typeof(st -> 'n') = 'string' and st ->> 'n' = '') then
          n_given := true; n := public.career_js_num(st -> 'n');
        elsif public.career_truthy(e -> 'reps') then
          n_given := true; n := public.career_js_num(e -> 'reps');
        else
          n_given := false; n := null;
        end if;
        r := case when public.career_truthy(st -> 'r') then public.career_js_num(st -> 'r') end;
        rir := case when r >= 6 and r <= 10 then 10 - r else 0 end;
        idx := case when n is not null and n <> 0 then case when w is not null then w * (1 + (n + rir) / 30) else n + rir end end;
        if not has_best
           or (idx is not null and (bidx is null or idx > bidx))
           or (idx is null and bidx is null and r is not null and (br is null or r < br)) then
          has_best := true; bw := w; bn := n; bng := n_given; br := r; bidx := idx;
        end if;
        rpe := public.career_js_num(st -> 'r');
        est := null;
        if w is not null and n is not null and n > 0 and rpe > 0 then
          eff := n + greatest(0, 10 - rpe);
          if eff <= 10 then
            if v_m = 'kg' then
              est := round((case when eff <= 1 then w else w * (1 + eff / 30) end) / v_step) * v_step;        -- exact numbers, as stage66 had it
            else
              -- pounds and plates in DOUBLES, operation for operation as estimateOneRM() computes them: an estimate that lands exactly on
              -- half a step (225 lb x 5 @8 is 277.5) is rounded up there, and exact numbers (1/30 cut at 20 digits) would round it down
              est := (floor((case when eff <= 1 then w::float8 else w::float8 * (1 + eff::float8 / 30) end) / v_step::float8 + 0.5) * v_step::float8)::numeric;
            end if;
          end if;
        end if;
        if est is not null and (best is null or est > best) then best := est; end if;
      end loop;
      if has_best then
        d := s.completed_on; plan_day := s.day; ord := eo; name := e ->> 'ex'; lift := public.career_lift_key(e ->> 'ex', v_m);
        b_w := bw; b_n := bn; b_n_given := bng; b_r := br; b_idx := bidx; best_est := best;
        return next;
      end if;
    end loop;
  end loop;
end $function$;

-- P2 for the training, as stage66 wrote it but for the Personal Records and the retests, which are kept per lift AND measure (above).
create or replace function public.career_derive(p_athlete text) returns void
language plpgsql set search_path to 'public' as $function$
declare
  v_rules jsonb := public.career_rules_now();
  v_close integer; v_share numeric; v_away integer; v_window integer;
  v_paused date; v_want jsonb := '[]'::jsonb; w record; c record; x record;
  v_ref text; v_closed boolean; v_run integer := 0; v_armed boolean := false; v_prev_broken boolean := false; v_prev_to date;
  v_done integer; v_planned integer; v_recs jsonb; v_raw text; v_first date; v_status text;
begin
  if v_rules is null or p_athlete is null then return; end if;
  perform pg_advisory_xact_lock(hashtext('career:' || p_athlete));
  v_close := coalesce(public.career_num(v_rules #> '{week,close_after_days}')::int, 1);
  v_share := coalesce(public.career_num(v_rules #> '{fact,cycle_finished,min_share}'), 0.8);
  v_away := coalesce(public.career_num(v_rules #> '{fact,training_return,weeks_away}')::int, 2);
  v_window := coalesce(public.career_num(v_rules #> '{fact,retest_done,window_days}')::int, 7);
  select s.since, s.status into v_paused, v_status from public.athlete_status s where s.athlete_id = p_athlete;
  select min(sh.completed_on) into v_first from public.session_history sh where sh.athlete_id = p_athlete and sh.hidden_at is null;

  -- ── weeks, in the order they happened, from the week of the athlete's first session ──
  for w in
    with wk as (select * from public.career_weeks(p_athlete)),
    s as (select sh.day::text as pday, sh.completed_on as d, 'd' || sh.day || '|' || sh.completed_on::text as ref
            from public.session_history sh where sh.athlete_id = p_athlete and sh.hidden_at is null)
    select wk.*,
           (select count(*) from s where s.d between wk.wfrom and wk.wto and s.pday = any (wk.plan))::int as nsess,
           (select bool_and(exists (select 1 from s where s.d between wk.wfrom and wk.wto and s.pday = pd)) from unnest(wk.plan) pd) as held,
           (select max(z.fd) from (select min(s.d) as fd from s where s.d between wk.wfrom and wk.wto and s.pday = any (wk.plan)
                                    group by s.pday) z) as held_on,
           (select bool_and(exists (select 1 from public.career_facts f where f.athlete_id = p_athlete and f.kind = 'full_log'
                                       and f.ref = s.ref and f.void_at is null)
                            and exists (select 1 from public.career_facts f where f.athlete_id = p_athlete and f.kind = 'checkin_done'
                                           and f.ref = s.ref and f.void_at is null))
              from s where s.d between wk.wfrom and wk.wto and s.pday = any (wk.plan)) as by_book
      from wk
     order by wk.wfrom, wk.cycle_index
  loop
    if v_first is null or w.wto < v_first then
      continue;              -- before their first session: a week they never started is neither held nor broken
    end if;
    v_ref := 'c' || w.cycle_num || '|w' || w.week;
    v_closed := current_date > w.wto + v_close;
    if w.held then
      if v_armed then
        v_want := v_want || jsonb_build_array(jsonb_build_object('kind', 'training_return', 'ref', v_ref, 'day', w.held_on,
                    'value', jsonb_build_object('cycle', w.cycle_num, 'week', w.week)));
        v_armed := false;
      end if;
      if v_prev_broken and w.wfrom - v_prev_to <= 8 then
        v_want := v_want || jsonb_build_array(jsonb_build_object('kind', 'bounce_back', 'ref', v_ref, 'day', w.held_on,
                    'value', jsonb_build_object('cycle', w.cycle_num, 'week', w.week)));
      end if;
      v_want := v_want || jsonb_build_array(jsonb_build_object('kind', 'week_held', 'ref', v_ref, 'day', w.held_on,
                  'value', jsonb_build_object('cycle', w.cycle_num, 'week', w.week, 'sessions', w.nsess, 'plan', cardinality(w.plan))));
      if w.by_book then         -- every session that week fully logged and checked in first
        v_want := v_want || jsonb_build_array(jsonb_build_object('kind', 'week_by_the_book', 'ref', v_ref, 'day', w.held_on,
                    'value', jsonb_build_object('cycle', w.cycle_num, 'week', w.week)));
      end if;
      v_run := 0; v_prev_broken := false; v_prev_to := w.wto;
    elsif v_closed then
      if v_paused is not null and w.wto >= v_paused then
        continue;            -- a week Amir paused the athlete for (or one after they left) is neither broken nor away (P2)
      end if;
      v_want := v_want || jsonb_build_array(jsonb_build_object('kind', 'week_broken', 'ref', v_ref, 'day', w.wto,
                  'value', jsonb_build_object('cycle', w.cycle_num, 'week', w.week, 'sessions', w.nsess, 'plan', cardinality(w.plan))));
      if w.nsess = 0 then
        v_run := v_run + 1;
        if v_run >= v_away then v_armed := true; end if;
      else
        v_run := 0;
      end if;
      v_prev_broken := true; v_prev_to := w.wto;
    end if;
    -- a week still running and not yet held: nothing yet
  end loop;

  -- ── cycles that have ended: finished, the roadmap, the effort wins ──
  for c in
    select distinct on (cw.cycle_index) cw.cycle_index, cw.cycle_num, cw.weeks, cw.cstart, cw.cend, cw.plan, cw.is_last
      from public.career_weeks(p_athlete) cw
     order by cw.cycle_index
  loop
    if current_date <= c.cend + v_close then continue; end if;
    select count(*) into v_done from public.session_history s
     where s.athlete_id = p_athlete and s.hidden_at is null and s.completed_on between c.cstart and c.cend and s.day::text = any (c.plan);
    v_planned := cardinality(c.plan) * c.weeks;
    if v_planned > 0 and v_done::numeric / v_planned >= v_share then
      v_want := v_want || jsonb_build_array(jsonb_build_object('kind', 'cycle_finished', 'ref', 'c' || c.cycle_num, 'day', c.cend + 1,
                  'value', jsonb_build_object('cycle', c.cycle_num, 'done', v_done, 'planned', v_planned)));
      if c.is_last then
        v_want := v_want || jsonb_build_array(jsonb_build_object('kind', 'roadmap_finished', 'ref', 'roadmap', 'day', c.cend + 1,
                    'value', jsonb_build_object('cycle', c.cycle_num)));
      end if;
    end if;
    for x in select * from public.career_cycle_wins(p_athlete, c.cstart, c.cend, c.plan, v_rules) loop
      v_want := v_want || jsonb_build_array(jsonb_build_object('kind', 'effort_win', 'ref', 'c' || c.cycle_num || '|' || x.lift,
                  'day', c.cend + 1, 'value', jsonb_build_object('cycle', c.cycle_num, 'lift', x.name, 'gain', round(x.gain, 4))));
    end loop;
  end loop;

  -- ── every whole month since the first session (month_with_amir); none while a former athlete ──
  if v_first is not null then
    for x in
      select g as n, (v_first + make_interval(months => g))::date as on_day
        from generate_series(1, 1200) g
       where (v_first + make_interval(months => g))::date <= case when v_status = 'former' then least(current_date, v_paused) else current_date end
    loop
      v_want := v_want || jsonb_build_array(jsonb_build_object('kind', 'month_with_amir', 'ref', x.n::text, 'day', x.on_day,
                  'value', jsonb_build_object('month', x.n)));
    end loop;
  end if;

  -- ── each lift's best gain over its first session (lift_gain) ──
  for x in select * from public.career_lift_gains(p_athlete) loop
    v_want := v_want || jsonb_build_array(jsonb_build_object('kind', 'lift_gain', 'ref', x.lift, 'day', x.d,
                'value', jsonb_build_object('lift', x.name, 'pct', x.pct)));
  end loop;

  -- ── the Personal Records: a new best (personal_best), a retest (retest_done, retest_beaten) ──
  select a.data -> (p_athlete || '_1rm') into v_recs from public.athlete_progress a where a.athlete_id = p_athlete;
  if jsonb_typeof(v_recs) = 'string' then
    v_raw := v_recs #>> '{}';
    begin
      v_recs := v_raw::jsonb;
    exception when others then
      v_recs := '[]'::jsonb;
    end;
  end if;
  if jsonb_typeof(v_recs) is distinct from 'array' then v_recs := '[]'::jsonb; end if;

  -- A Personal Records entry says its measure in `u` ('lb' or 'plates'; absent = kg), and its `kg` is the estimate in THAT measure (program.html:
  -- saveCeilingEntry(), fillRecords()). A lift's records are kept per measure, never compared across: one entry speaks for each day of a lift
  -- IN A MEASURE, and a lift's first number in a measure is not a best (the bar to beat is that measure's own).
  with rec as (
    select r0.e ->> 'lift' as lift, public.career_rec_unit(r0.e) as u, public.career_day(r0.e ->> 'd') as d, r0.e, r0.ord,
           coalesce(public.career_js_num(r0.e -> 't'), 0) as t
      from jsonb_array_elements(v_recs) with ordinality r0(e, ord)
     where jsonb_typeof(r0.e) = 'object' and public.career_truthy(r0.e -> 'lift') and public.career_truthy(r0.e -> 'd')
  ),
  eff as (     -- one entry speaks for each day of a lift and measure: the newest write (ceilingLifts(), fillRecords())
    select distinct on (rec.lift, rec.d, rec.u) rec.* from rec where rec.d is not null order by rec.lift, rec.d, rec.u, rec.t desc, rec.ord
  ),
  kept as (select eff.* from eff where not public.career_truthy(eff.e -> 'del') and coalesce(public.career_num(eff.e -> 'kg'), 0) > 0)
  select v_want || coalesce(jsonb_agg(jsonb_build_object('kind', 'personal_best',
                                                         'ref', k.lift || '|' || k.d::text || case when k.u = 'kg' then '' else '|' || k.u end, 'day', k.d,
                                                         'value', jsonb_build_object('lift', k.lift, 'kg', public.career_num(k.e -> 'kg'))
                                                                  || case when k.u = 'kg' then '{}'::jsonb else jsonb_build_object('u', k.u) end)), '[]'::jsonb)
    into v_want
    from kept k
   where public.career_truthy(k.e -> 'auto')
     and exists (select 1 from kept k2 where k2.lift = k.lift and k2.u = k.u and k2.d < k.d);   -- a lift's first number in a measure is not a best: nothing to beat

  -- retests: a test-flagged lift (exTestSpec(): true, or "<n>RM" up to 10) logged in its cycle's test week, the last [fact.retest_done]
  -- window_days of the cycle (inRetestWindow()) and after its end while it is still the current cycle, judged on its best estimate that
  -- week; beaten when that tops the lift's previous test, or its best earlier record when there was none. All of it per lift AND measure
  -- (kg, lb, plates): a retest in pounds is judged against pounds only, and the first one in a measure beats nothing.
  for x in
    with cyc as (select distinct on (cw.cycle_index) cw.* from public.career_weeks(p_athlete) cw order by cw.cycle_index),
    src as (
      select cyc.cycle_index, cyc.cycle_num, cyc.cend, cyc.is_current, cyc.plan,
             case when cyc.is_current then (select pr.data from public.programs pr where pr.athlete_id = p_athlete)
                  else (select v.data from public.program_versions v
                         where v.athlete_id = p_athlete and jsonb_typeof(v.data -> 'currentCycleIndex') = 'number'
                           and public.career_num(v.data -> 'currentCycleIndex') = cyc.cycle_index
                         order by v.saved_at desc limit 1) end as data
        from cyc
    ),
    flagged as (
      select distinct src.cycle_index, src.cycle_num, src.cend, src.is_current, ex.v ->> 'name' as name,
             public.career_norm(ex.v ->> 'name') as lift
        from src,
             jsonb_array_elements(case when jsonb_typeof(src.data -> 'workouts' -> 'days') = 'array'
                                       then src.data -> 'workouts' -> 'days' else '[]'::jsonb end) as dd(v),
             jsonb_array_elements(case when jsonb_typeof(dd.v -> 'blocks') = 'array' then dd.v -> 'blocks' else '[]'::jsonb end) as bb(v),
             jsonb_array_elements(case when jsonb_typeof(bb.v -> 'exercises') = 'array' then bb.v -> 'exercises' else '[]'::jsonb end) as ex(v)
       where ex.v ->> 'type' = 'standard' and public.career_truthy(ex.v -> 'name')
         and (ex.v -> 'test' = 'true'::jsonb
              or ((ex.v ->> 'test') ~* '^\d+\s*rm$' and (substring(ex.v ->> 'test' from '^(\d+)'))::int between 1 and 10))
    ),
    evidence as (
      select f.cycle_index, f.cycle_num, f.name, es.lift, public.career_lift_unit(es.lift) as u, es.d, es.best_est as est
        from flagged f
        join lateral public.career_entry_sets(p_athlete, f.cend - v_window, case when f.is_current then current_date else f.cend end, null) es
          on public.career_lift_base(es.lift) = f.lift
      union all
      select f.cycle_index, f.cycle_num, f.name, public.career_lift_key(r.e ->> 'lift', public.career_rec_unit(r.e)), public.career_rec_unit(r.e),
             public.career_day(r.e ->> 'd'), public.career_num(r.e -> 'kg')
        from flagged f, jsonb_array_elements(v_recs) r(e)
       where jsonb_typeof(r.e) = 'object' and public.career_truthy(r.e -> 'test') and not public.career_truthy(r.e -> 'del')
         and public.career_norm(r.e ->> 'lift') = f.lift
         and public.career_day(r.e ->> 'd') between f.cend - v_window and case when f.is_current then current_date else f.cend end
    )
    select distinct on (ev.lift, ev.cycle_index) ev.*
      from evidence ev
     order by ev.lift, ev.cycle_index, ev.est desc nulls last, ev.d
  loop
    v_want := v_want || jsonb_build_array(jsonb_build_object('kind', 'retest_done', 'ref', x.lift || '|c' || x.cycle_num, 'day', x.d,
                'value', jsonb_strip_nulls(jsonb_build_object('lift', x.name, 'cycle', x.cycle_num, 'est', x.est)
                                           || case when x.u = 'kg' then '{}'::jsonb else jsonb_build_object('u', x.u) end)));
  end loop;
  -- beaten: against this lift's previous retest, else its best record before the retest day
  with t as (
    select (e.v ->> 'ref') as ref, (e.v ->> 'day')::date as d, e.v -> 'value' as v,
           public.career_lift_key(e.v #>> '{value,lift}', e.v #>> '{value,u}') as lift,
           (e.v #>> '{value,cycle}')::int as cyc, public.career_num(e.v #> '{value,est}') as est
      from jsonb_array_elements(v_want) as e(v) where e.v ->> 'kind' = 'retest_done'
  ),
  recs as (
    select public.career_lift_key(r1.e ->> 'lift', public.career_rec_unit(r1.e)) as lift, public.career_day(r1.e ->> 'd') as d,
           public.career_num(r1.e -> 'kg') as kg
      from jsonb_array_elements(v_recs) r1(e)
     where jsonb_typeof(r1.e) = 'object' and not public.career_truthy(r1.e -> 'del') and coalesce(public.career_num(r1.e -> 'kg'), 0) > 0
  ),
  judged as (
    select t.*,
           (select t2.est from t t2 where t2.lift = t.lift and t2.cyc < t.cyc and t2.est is not null order by t2.cyc desc limit 1) as prev_test,
           (select max(r.kg) from recs r where r.lift = t.lift and r.d < t.d) as prev_best
      from t
  )
  select v_want || coalesce(jsonb_agg(jsonb_build_object('kind', 'retest_beaten', 'ref', j.ref, 'day', j.d,
                                                         'value', j.v || jsonb_build_object('beat', coalesce(j.prev_test, j.prev_best)))), '[]'::jsonb)
    into v_want
    from judged j
   where j.est is not null and coalesce(j.prev_test, j.prev_best) is not null and j.est > coalesce(j.prev_test, j.prev_best);

  perform public.career_sync(p_athlete, array['week_held', 'week_broken', 'bounce_back', 'training_return', 'week_by_the_book',
                                              'cycle_finished', 'roadmap_finished', 'effort_win', 'month_with_amir', 'lift_gain',
                                              'personal_best', 'retest_beaten'], v_want, 'server');
  perform public.career_sync(p_athlete, array['retest_done'], v_want, 'training');
end $function$;
-- ── 3. who may run what ──────────────────────────────────────────────────────────────────────────────────────────────────

-- As stage66, 69 and 70: every career_ function runs inside the server or from the service role. (A new function in the public schema is
-- executable by anon and authenticated until this says otherwise; the two that changed keep the grants they had.)
do $stage72_grants$
declare f text;
begin
  for f in
    select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('career_w', 'career_wn', 'career_wu', 'career_lift_key', 'career_lift_base', 'career_lift_unit', 'career_rec_unit')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $stage72_grants$;
