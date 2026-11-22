-- stage121_move_credit.sql — Court Log counts toward Steps (2026-11-22)
-- (Written as stage119 and applied to the live project under the migration name stage119_move_credit on 2026-11-22; renumbered 121 because
-- stage119 (names_fa_typed) and stage120 (the Race) took those numbers the same day.)
--
-- Amir: "lets do option 1 / get a good equal of padel as well, add cycling as well, and a few more options like beach tennis as well".
-- Why steps: the habit is there for how much someone moves, and steps are only one way to move. An hour of tennis is more work than an
-- hour of walking, and the athlete who played it should not lose the Steps habit for leaving the phone in the bag.
--
-- The rule (the phone holds the same table and arithmetic: program.html MOVE_MET / moveCreditOf(), held equal by scripts/check_twins.js):
--   one activity's steps = round(minutes x MET / 3.5 x 100, to the nearest 100)
--     (walking at ~100 steps a minute is ~3.5 MET, so one MET-minute is ~28.6 steps)
--   a day's credit = the sum over that day's activities, capped at 70% of the Steps target (7,000 of 10,000): a day of tennis still asks
--     for some walking, because steps also count the hours not spent sitting, and a watch worn on court already counted some of them.
--   Steps for the day = what the athlete typed + the credit. The typed number is never changed; the credit is worked out fresh each time.
-- It pays through the Steps habit only, so it is paid once: Court Log itself still pays nothing.
--
-- Forward only (D20, docs/rules/career.md): only days from 2026-11-22 carry a credit. Days settle after backfill_days (3), and Court Log
-- takes only today and the last 3 days, so a settled day never moves.
--
-- What this does:
--   1. activity_log takes the new kinds: beach_tennis, pickleball, squash, badminton, cycling, swim, football, gym (and keeps tennis, padel, match,
--      run, other). log_activity() checks the same list.
--   2. activity_met(kind, effort): the table. move_steps_credit(athlete): the credit per day. hab_log_credited(athlete, log): the log as
--      the scorers read it.
--   3. career_observe_proof() and career_compare() read the credited log (guarded textual patches), so XP, the day gate, streaks,
--      achievements and missions all see the same Steps number.
--   4. A trigger on activity_log re-reads the athlete's habit days when an activity is added or deleted, the way career_on_progress()
--      does when the log changes.
--   5. get_five_weeks() files the new racket sports as court time.
-- No new table: activity_log is already in BACKUP_TABLES, the snapshot and coach_erase_person() (stage116). Safe to re-run.

do $stage121_guard$
begin
  if to_regclass('public.activity_log') is null or to_regprocedure('public.career_observe_proof(text)') is null
     or to_regprocedure('public.career_compare(date)') is null or to_regprocedure('public.get_five_weeks(text)') is null then
    raise exception 'stage121: activity_log (stage116), career_observe_proof(), career_compare() or get_five_weeks() is missing. Nothing was changed.';
  end if;
end $stage121_guard$;

-- ── 1. The kinds ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
alter table public.activity_log drop constraint if exists activity_log_kind_check;
alter table public.activity_log add constraint activity_log_kind_check check (kind in
  ('tennis', 'match', 'padel', 'beach_tennis', 'pickleball', 'squash', 'badminton', 'run', 'cycling', 'swim', 'football', 'gym', 'other'));

create or replace function public.activity_kinds()
returns text[]
language sql
immutable
as $$ select array['tennis', 'match', 'padel', 'beach_tennis', 'pickleball', 'squash', 'badminton', 'run', 'cycling', 'swim', 'football', 'gym', 'other'] $$;

create or replace function public.log_activity(p_athlete_id text, p_id uuid, p_day date, p_kind text, p_minutes integer, p_effort text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_row public.activity_log;
begin
  if p_athlete_id is null or (not public.is_coach() and p_athlete_id is distinct from public.current_athlete_id()) then
    raise exception 'not your athlete record';
  end if;
  if p_id is null then raise exception 'activity:no_id'; end if;
  if p_day is null or p_day < current_date - 3 or p_day > current_date + 1 then raise exception 'activity:day'; end if;
  if p_kind is null or not (p_kind = any (public.activity_kinds())) then raise exception 'activity:kind'; end if;   -- stage121: the list
  if p_minutes is null or p_minutes < 5 or p_minutes > 600 then raise exception 'activity:minutes'; end if;
  if p_effort is null or p_effort not in ('easy', 'normal', 'hard') then raise exception 'activity:effort'; end if;
  select * into v_row from public.activity_log where id = p_id;
  if found then
    if v_row.athlete_id is distinct from p_athlete_id then raise exception 'not your athlete record'; end if;
    return to_jsonb(v_row);   -- a retry of a write that already landed
  end if;
  if (select count(*) from public.activity_log where athlete_id = p_athlete_id and day = p_day) >= 8 then
    raise exception 'activity:full';
  end if;
  insert into public.activity_log (id, athlete_id, day, kind, minutes, effort)
  values (p_id, p_athlete_id, p_day, p_kind, p_minutes, p_effort)
  returning * into v_row;
  return to_jsonb(v_row);
end
$function$;

-- ── 2. The table and the credit ─────────────────────────────────────────────────────────────────────────────────────────────────
-- MET by kind and effort. Sources in docs/ref/move-credit.md. ⚠️ The phone's copy is MOVE_MET in program.html: change both
-- (scripts/check_twins.js compares them).
create or replace function public.activity_met(p_kind text, p_effort text)
returns numeric
language sql
immutable
as $$
  select m.met from (values
    -- MOVE_MET_BEGIN
    ('tennis', 'easy', 5.0), ('tennis', 'normal', 6.8), ('tennis', 'hard', 8.0),
    ('match', 'easy', 6.8), ('match', 'normal', 8.0), ('match', 'hard', 8.5),
    ('padel', 'easy', 5.0), ('padel', 'normal', 6.0), ('padel', 'hard', 7.0),
    ('beach_tennis', 'easy', 5.0), ('beach_tennis', 'normal', 6.0), ('beach_tennis', 'hard', 7.5),
    ('pickleball', 'easy', 4.0), ('pickleball', 'normal', 4.5), ('pickleball', 'hard', 6.0),
    ('squash', 'easy', 6.0), ('squash', 'normal', 7.3), ('squash', 'hard', 10.0),
    ('badminton', 'easy', 5.5), ('badminton', 'normal', 7.0), ('badminton', 'hard', 9.0),
    ('run', 'easy', 7.5), ('run', 'normal', 9.3), ('run', 'hard', 11.0),
    ('cycling', 'easy', 4.0), ('cycling', 'normal', 6.8), ('cycling', 'hard', 10.0),
    ('swim', 'easy', 5.8), ('swim', 'normal', 8.0), ('swim', 'hard', 9.8),
    ('football', 'easy', 5.0), ('football', 'normal', 7.0), ('football', 'hard', 9.5),
    ('gym', 'easy', 3.5), ('gym', 'normal', 5.0), ('gym', 'hard', 6.0),
    ('other', 'easy', 3.5), ('other', 'normal', 5.0), ('other', 'hard', 7.5)
    -- MOVE_MET_END
  ) m(kind, effort, met)
  where m.kind = p_kind and m.effort = p_effort
$$;

create or replace function public.move_credit_from()
returns date
language sql
immutable
as $$ select date '2026-11-22' $$;   -- D20: forward only, from the day this stage was applied

-- One row per day with a credit: the capped steps and the uncapped sum.
create or replace function public.move_steps_credit(p_athlete text)
returns table(day date, steps integer, raw integer)
language sql
stable
security definer
set search_path to 'public'
as $$
  with tgt as (
    select coalesce(public.career_num(public.career_rules_now() #> '{habits,targets,steps}'), 10000) as t
  ),
  per as (
    select a.day,
           sum(round(a.minutes * coalesce(public.activity_met(a.kind, a.effort), 0) / 3.5) * 100)::integer as raw   -- each to the nearest 100
      from public.activity_log a
     where a.athlete_id = p_athlete and a.day >= public.move_credit_from()
     group by a.day
  )
  select per.day, least(per.raw, round(tgt.t * 0.7)::integer), per.raw
    from per, tgt
   where per.raw > 0
$$;

-- The habit log as the scorers read it: Steps on a day with a credit is the typed number plus the credit. A day the athlete never
-- opened gets an entry holding the credit alone.
create or replace function public.hab_log_credited(p_athlete text, p_log jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare v_log jsonb := case when jsonb_typeof(p_log) = 'object' then p_log else '{}'::jsonb end; c record; v_day jsonb; v_typed numeric;
begin
  if p_athlete is null then return p_log; end if;
  for c in select * from public.move_steps_credit(p_athlete) loop
    v_day := v_log -> c.day::text;
    if jsonb_typeof(v_day) is distinct from 'object' then v_day := '{}'::jsonb; end if;
    v_typed := case when jsonb_typeof(v_day -> 'steps') = 'number' then (v_day ->> 'steps')::numeric else 0 end;
    v_log := jsonb_set(v_log, array[c.day::text], v_day || jsonb_build_object('steps', v_typed + c.steps));
  end loop;
  return case when p_log is null and v_log = '{}'::jsonb then null else v_log end;
end
$function$;

-- ── 3. The scorers read the credited log ────────────────────────────────────────────────────────────────────────────────────────
do $stage121_patch$
declare p record; d text; n int;
begin
  for p in select * from (values
    ('public.career_observe_proof(text)',
     $a$  v_log := public.hab_log_of(v_data, p_athlete);$a$,
     $a$  v_log := public.hab_log_credited(p_athlete, public.hab_log_of(v_data, p_athlete));   -- stage121: Court Log counts toward Steps$a$),
    ('public.career_compare(date)',
     $a$    v_log := public.hab_log_of(a.data, a.athlete_id);$a$,
     $a$    v_log := public.hab_log_credited(a.athlete_id, public.hab_log_of(a.data, a.athlete_id));   -- stage121$a$),
    ('public.get_five_weeks(text)',
     $a$case when a.kind in ('tennis', 'padel', 'match') then 'court' else 'other' end$a$,
     $a$case when a.kind in ('tennis', 'padel', 'match', 'beach_tennis', 'pickleball', 'squash', 'badminton') then 'court' else 'other' end$a$),
    ('public.get_five_weeks(text)',
     $a$'title', initcap(a.kind)$a$,
     $a$'title', initcap(replace(a.kind, '_', ' '))$a$)
  ) v(fn, s_old, s_new)
  loop
    d := pg_get_functiondef(p.fn::regprocedure);
    if position(p.s_new in d) > 0 then continue; end if;   -- already patched (a re-run)
    n := (length(d) - length(replace(d, p.s_old, ''))) / length(p.s_old);
    if n <> 1 then
      raise exception 'stage121: % is not what this patch expects (its line found % times, not once). Nothing was changed.', p.fn, n;
    end if;
    execute replace(d, p.s_old, p.s_new);
  end loop;
end $stage121_patch$;

-- ── 4. An activity added or deleted re-reads the habit days ─────────────────────────────────────────────────────────────────────
create or replace function public.career_on_activity()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_id text := coalesce(new.athlete_id, old.athlete_id); v_changed text[];
begin
  perform set_config('career.changed', '', true);
  begin
    if tg_op = 'UPDATE' and new.athlete_id is distinct from old.athlete_id then perform public.career_observe_proof(old.athlete_id); end if;
    perform public.career_observe_proof(v_id);
  exception when others then
    raise warning 'Career Mode could not read the activity of % into Steps: % (%). The activity itself was saved.', v_id, sqlerrm, sqlstate;
  end;
  begin
    if public.career_catalogue_on() then
      v_changed := public.career_changed_kinds();
      if v_changed is not null then perform public.career_evaluate(v_id, v_changed, 'live'); end if;
    end if;
  exception when others then
    raise warning 'Career Mode could not work out the awards of %: % (%). The activity itself was saved.', v_id, sqlerrm, sqlstate;
  end;
  return null;
end
$function$;

drop trigger if exists career_activity_trg on public.activity_log;
create trigger career_activity_trg after insert or delete or update on public.activity_log
  for each row execute function public.career_on_activity();

-- ── 5. Grants ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
revoke all on function public.log_activity(text, uuid, date, text, integer, text) from public, anon;
grant execute on function public.log_activity(text, uuid, date, text, integer, text) to authenticated, service_role;
revoke all on function public.move_steps_credit(text) from public, anon, authenticated;
grant execute on function public.move_steps_credit(text) to service_role;
revoke all on function public.hab_log_credited(text, jsonb) from public, anon, authenticated;
grant execute on function public.hab_log_credited(text, jsonb) to service_role;
revoke all on function public.career_on_activity() from public, anon, authenticated;

-- ── 6. Activity logged before this stage, from the first day on: its athlete's habit days read again ────────────────────────────
-- (On the live project, 2026-11-22: one athlete had logged an activity that morning; career_compare() was not ok until this ran.)
do $stage121_reread$
declare r record; v text[];
begin
  for r in select distinct athlete_id from public.activity_log where day >= public.move_credit_from() loop
    perform set_config('career.changed', '', true);
    perform public.career_observe_proof(r.athlete_id);
    if public.career_catalogue_on() then
      v := public.career_changed_kinds();
      if v is not null then perform public.career_evaluate(r.athlete_id, v, 'live'); end if;
    end if;
  end loop;
end $stage121_reread$;

do $stage121_check$
begin
  if position('hab_log_credited' in pg_get_functiondef('public.career_observe_proof(text)'::regprocedure)) = 0 then
    raise exception 'stage121: career_observe_proof() does not read the credited log';
  end if;
  if position('hab_log_credited' in pg_get_functiondef('public.career_compare(date)'::regprocedure)) = 0 then
    raise exception 'stage121: career_compare() does not read the credited log';
  end if;
  if position('beach_tennis' in pg_get_functiondef('public.get_five_weeks(text)'::regprocedure)) = 0 then
    raise exception 'stage121: get_five_weeks() does not file the new court sports';
  end if;
  if public.activity_met('tennis', 'normal') is null or public.activity_met('cycling', 'hard') is null then
    raise exception 'stage121: activity_met() is missing a value';
  end if;
  raise notice 'stage121: applied';
end
$stage121_check$;
