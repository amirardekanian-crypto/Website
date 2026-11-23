-- stage125_steps_target.sql — Your Number: a personal Steps target the coach sets (2026-11-23)
--
-- Amir: "build 130", then his two picks: the app suggests and he approves ("App suggests, you approve"), and hitting the athlete's own
-- number pays full Steps XP ("Full XP at their number"). #130 (round 12 'On the Move'): 9 of 94 logged steps days in 28 days reached
-- 10,000, and adaptive goals beat a fixed 10,000 (Adams et al. 2017).
--
-- How it works: coach.html shows each athlete's usual and a suggested number; Amir sets it (coach_set_steps_target()). From that day on,
-- Steps is scored against it: the scorers read the habit log through hab_log_credited() (stage121), which now also scales the day's
-- Steps by global target / personal target, so hitting 8,500 of 8,500 scores as a full Steps day everywhere (XP, the day gate, streaks,
-- achievements, missions) without one scorer changing. The 70% cap on the Court Log credit follows the personal number too. The phone
-- does the same in HAB_VIEW (program.html stepsScored(); scripts/check_twins.js holds the two equal).
-- ⚠️ A consequence Amir was told: the step TOTALS (250,000 / 1,000,000 steps achievements, the team's million-steps mission) count a met
-- day at the scaled value, so a personal number below 10,000 counts a little more toward them than the raw steps walked.
-- Forward only (D20): a number starts on the day it is set and never rewrites an earlier day; days before keep the global target.
--
-- What this does:
--   1. public.steps_targets: one row per change (athlete, from_day, steps 3,000 to 20,000). COACHING DATA: in BACKUP_TABLES, the snapshot
--      and coach_erase_person()'s list the same day.
--   2. steps_target_on(athlete, day), get_steps_targets(athlete) (the athlete's own or the coach's read), coach_set_steps_target(athlete,
--      steps) (coach only; it re-reads the athlete's habit days so today's score follows at once).
--   3. hab_log_credited(): the credit capped at 70% of the day's own target, and Steps scaled to the global target.
--   4. coach_erase_person() learns the table (patched in place, as stage116 did).
-- Safe to re-run.

do $stage125_guard$
begin
  if to_regprocedure('public.hab_log_credited(text,jsonb)') is null or to_regprocedure('public.move_steps_credit(text)') is null
     or to_regprocedure('public.coach_erase_person(text,text,text,uuid[],boolean)') is null then
    raise exception 'stage125: hab_log_credited() / move_steps_credit() (stage121) or coach_erase_person() is missing. Nothing was changed.';
  end if;
end $stage125_guard$;

-- ── 1. The table ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.steps_targets (
  athlete_id text not null,
  from_day date not null,
  steps integer not null check (steps between 3000 and 20000),
  set_at timestamptz not null default now(),
  primary key (athlete_id, from_day)
);
alter table public.steps_targets enable row level security;
drop policy if exists "coach manage steps targets" on public.steps_targets;
create policy "coach manage steps targets" on public.steps_targets for all to authenticated using (public.is_coach()) with check (public.is_coach());
revoke all on table public.steps_targets from anon;
grant select, insert, update, delete on table public.steps_targets to authenticated;   -- the policy decides: the coach only
grant all on table public.steps_targets to service_role;

-- ── 2. Reading and setting it ───────────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.steps_global_target()
returns numeric
language sql
stable
set search_path to 'public'
as $$ select coalesce(public.career_num(public.career_rules_now() #> '{habits,targets,steps}'), 10000) $$;

create or replace function public.steps_target_on(p_athlete text, p_day date)
returns numeric
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce((select t.steps::numeric from public.steps_targets t
                    where t.athlete_id = p_athlete and t.from_day <= p_day order by t.from_day desc limit 1),
                  public.steps_global_target())
$$;

create or replace function public.get_steps_targets(p_athlete_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
begin
  if p_athlete_id is null or (not public.is_coach() and p_athlete_id is distinct from public.current_athlete_id()) then
    raise exception 'not your athlete record';
  end if;
  return jsonb_build_object('global', public.steps_global_target(),
    'rows', coalesce((select jsonb_agg(jsonb_build_object('from', t.from_day, 'steps', t.steps) order by t.from_day)
                        from public.steps_targets t where t.athlete_id = p_athlete_id), '[]'::jsonb));
end
$function$;

create or replace function public.coach_set_steps_target(p_athlete_id text, p_steps integer)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_changed text[];
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  if p_athlete_id is null or btrim(p_athlete_id) = '' then raise exception 'steps:athlete'; end if;
  if p_steps is null or p_steps < 3000 or p_steps > 20000 then raise exception 'steps:range'; end if;
  insert into public.steps_targets (athlete_id, from_day, steps) values (p_athlete_id, current_date, p_steps)
  on conflict (athlete_id, from_day) do update set steps = excluded.steps, set_at = now();
  -- today's score follows at once: the habit days read again, the awards worked out (as the Court Log trigger does)
  begin
    perform set_config('career.changed', '', true);
    perform public.career_observe_proof(p_athlete_id);
    if public.career_catalogue_on() then
      v_changed := public.career_changed_kinds();
      if v_changed is not null then perform public.career_evaluate(p_athlete_id, v_changed, 'live'); end if;
    end if;
  exception when others then
    raise warning 'Career Mode could not re-read the habit days of % after a new steps target: % (%)', p_athlete_id, sqlerrm, sqlstate;
  end;
  return public.get_steps_targets(p_athlete_id);
end
$function$;

-- ── 3. The log as the scorers read it ───────────────────────────────────────────────────────────────────────────────────────────
-- Steps on a day = (typed + credit capped at 70% of that day's target) x global target / that day's target. A day with no credit and the
-- global target is left as it was. The phone's twin is stepsScored() in program.html.
create or replace function public.hab_log_credited(p_athlete text, p_log jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_log jsonb := case when jsonb_typeof(p_log) = 'object' then p_log else '{}'::jsonb end;
  v_g numeric := public.steps_global_target(); v_has boolean; r record; v_day jsonb; v_typed numeric; v_t numeric; v_cr numeric;
begin
  if p_athlete is null then return p_log; end if;
  v_has := exists (select 1 from public.steps_targets t where t.athlete_id = p_athlete);
  for r in
    select d.day, max(d.raw) as raw from (
      select c.day, c.raw from public.move_steps_credit(p_athlete) c
      union all
      select k.key::date, 0 from jsonb_object_keys(v_log) k(key)
       where v_has and k.key ~ '^\d{4}-\d{2}-\d{2}$' and jsonb_typeof(v_log -> k.key -> 'steps') = 'number'
    ) d group by d.day
  loop
    v_t := case when v_has then public.steps_target_on(p_athlete, r.day) else v_g end;
    v_cr := least(coalesce(r.raw, 0), round(v_t * 0.7));
    if v_cr = 0 and v_t = v_g then continue; end if;
    v_day := v_log -> r.day::text;
    if jsonb_typeof(v_day) is distinct from 'object' then v_day := '{}'::jsonb; end if;
    v_typed := case when jsonb_typeof(v_day -> 'steps') = 'number' then (v_day ->> 'steps')::numeric else 0 end;
    v_log := jsonb_set(v_log, array[r.day::text], v_day || jsonb_build_object('steps', round((v_typed + v_cr) * v_g / v_t)));
  end loop;
  return case when p_log is null and v_log = '{}'::jsonb then null else v_log end;
end
$function$;

-- ── 4. coach_erase_person() learns the table ────────────────────────────────────────────────────────────────────────────────────
do $stage125_erase$
declare
  d text := pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure);
  s_old constant text := '''activity_log'', ';
  s_new constant text := '''activity_log'', ''steps_targets'', ';
  n integer;
begin
  if position('''steps_targets''' in d) > 0 then return; end if;   -- already patched (a re-run)
  n := (length(d) - length(replace(d, s_old, ''))) / length(s_old);
  if n <> 1 then
    raise exception 'stage125: coach_erase_person() is not what this patch expects (its list found % times, not once). Nothing was changed.', n;
  end if;
  execute replace(d, s_old, s_new);
end $stage125_erase$;

-- ── 5. Grants ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
revoke all on function public.steps_global_target() from public, anon;
grant execute on function public.steps_global_target() to authenticated, service_role;
revoke all on function public.steps_target_on(text, date) from public, anon, authenticated;
grant execute on function public.steps_target_on(text, date) to service_role;
revoke all on function public.get_steps_targets(text) from public, anon;
grant execute on function public.get_steps_targets(text) to authenticated, service_role;
revoke all on function public.coach_set_steps_target(text, integer) from public, anon;
grant execute on function public.coach_set_steps_target(text, integer) to authenticated, service_role;
revoke all on function public.hab_log_credited(text, jsonb) from public, anon, authenticated;
grant execute on function public.hab_log_credited(text, jsonb) to service_role;

do $stage125_check$
begin
  if to_regclass('public.steps_targets') is null then raise exception 'stage125: steps_targets is missing'; end if;
  if position('''steps_targets''' in pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure)) = 0 then
    raise exception 'stage125: coach_erase_person() does not know steps_targets';
  end if;
  if position('steps_target_on' in pg_get_functiondef('public.hab_log_credited(text,jsonb)'::regprocedure)) = 0 then
    raise exception 'stage125: hab_log_credited() is not the new text';
  end if;
  raise notice 'stage125: applied';
end
$stage125_check$;
