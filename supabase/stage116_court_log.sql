-- stage116_court_log.sql — Court Log: tennis, padel, matches and other activity on Your weeks (2026-11-21)
--
-- Amir, round 11 (https://claude.ai/artifact/7yRMTQJAmuJjkLmwZ7PQo2): "go with your picks", then "Build Court Log". #123: an athlete adds
-- what the plan never sees, their court time and anything else they did, in three taps: the kind, the minutes, how hard, for today or
-- the last 3 days. It shows on Your weeks (Progress) and in coach.html's Five weeks. It pays no XP (Amir's pick: self-logged minutes are
-- easy to inflate) and it never reaches the crew.
--
-- What this does:
--   1. public.activity_log: one row per activity (id from the phone, so a retry never writes twice). COACHING DATA, kept for good:
--      in BACKUP_TABLES, the snapshot and coach_erase_person()'s list, the same day (docs/rules/server-and-data.md).
--   2. log_activity(...) and delete_activity(...): the athlete's own writes (or the coach's), checked here. A day from 3 days ago to
--      tomorrow (a phone ahead of the server's UTC day), 5 to 600 minutes, at most 8 a day.
--   3. get_five_weeks() (stage115) also returns them: k 'court' (tennis, padel, a match) or 'other' (a run, anything else), with kind,
--      minutes, effort and id. A plan day's count (`done`) is unchanged: an activity is never a plan session.
--   4. coach_erase_person() learns the table (patched in place, as stage96 did).
-- Safe to re-run.

do $stage116_guard$
begin
  if to_regprocedure('public.current_athlete_id()') is null or to_regprocedure('public.get_five_weeks(text)') is null
     or to_regprocedure('public.coach_erase_person(text,text,text,uuid[],boolean)') is null then
    raise exception 'stage116: current_athlete_id(), get_five_weeks() (stage115) or coach_erase_person() is missing. Nothing was changed.';
  end if;
end $stage116_guard$;

-- ── 1. The table ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  athlete_id text not null,
  day date not null,
  kind text not null check (kind in ('tennis', 'padel', 'match', 'run', 'other')),
  minutes integer not null check (minutes between 5 and 600),
  effort text not null check (effort in ('easy', 'normal', 'hard')),
  created_at timestamptz not null default now()
);
create index if not exists activity_log_athlete_day on public.activity_log (athlete_id, day);
alter table public.activity_log enable row level security;
drop policy if exists "coach manage activity log" on public.activity_log;
create policy "coach manage activity log" on public.activity_log for all to authenticated using (public.is_coach()) with check (public.is_coach());
revoke all on table public.activity_log from anon;
grant select, insert, update, delete on table public.activity_log to authenticated;   -- the policy decides: the coach only. Athletes write through the functions.
grant all on table public.activity_log to service_role;

-- ── 2. The athlete's writes ─────────────────────────────────────────────────────────────────────────────────────────────────────
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
  if p_kind is null or p_kind not in ('tennis', 'padel', 'match', 'run', 'other') then raise exception 'activity:kind'; end if;
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

create or replace function public.delete_activity(p_athlete_id text, p_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare n integer;
begin
  if p_athlete_id is null or (not public.is_coach() and p_athlete_id is distinct from public.current_athlete_id()) then
    raise exception 'not your athlete record';
  end if;
  delete from public.activity_log where id = p_id and athlete_id = p_athlete_id;
  get diagnostics n = row_count;
  return n > 0;
end
$function$;

-- ── 3. get_five_weeks() reads them too ──────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.get_five_weeks(p_athlete_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare v_out jsonb;
begin
  if p_athlete_id is null or (not public.is_coach() and p_athlete_id is distinct from public.current_athlete_id()) then
    raise exception 'not your athlete record';
  end if;

  with cw as (select * from public.career_weeks(p_athlete_id)),
  w as (
    select * from cw where cw.is_current
    union all
    select * from cw where not exists (select 1 from cw c2 where c2.is_current)
                       and cw.cycle_index = (select max(c3.cycle_index) from cw c3 where c3.cstart <= current_date)),
  pdays as (select p.data -> 'workouts' -> 'days' as days from public.programs p where p.athlete_id = p_athlete_id),
  f as (
    select cf.day as d, cf.ref, cf.kind,
           case when cf.kind in ('session_finished', 'session_finished_early') then nullif(btrim(cf.value ->> 'plan_day'), '') end as pday,
           case when (cf.value ->> 'minutes') ~ '^\d{1,4}$' then (cf.value ->> 'minutes')::int end as mins,
           cf.value ->> 'slug' as slug
      from public.career_facts cf
     where cf.athlete_id = p_athlete_id and cf.void_at is null
       and cf.kind in ('session_finished', 'session_finished_early', 'library_session')
       and cf.day between (select min(w1.wfrom) from w w1) and (select max(w2.wto) from w w2)),
  fw as (
    select w.week, f.*,
           (f.pday is not null and f.pday = any (w.plan)
            and row_number() over (partition by w.week, f.pday order by f.d, f.ref) = 1) as in_plan
      from f join w on f.d between w.wfrom and w.wto),
  fd as (
    select fw.week, fw.d, fw.ref as sk, fw.in_plan,
           jsonb_strip_nulls(jsonb_build_object(
             'day', fw.d, 'k', case when fw.kind = 'library_session' then 'library' else 'plan' end,
             'title', left(btrim(regexp_replace(
                case when fw.kind = 'library_session'
                     then coalesce(ls.title, 'Library session')
                     else coalesce((select coalesce(nullif(btrim(e ->> 'title'), ''), nullif(btrim(e ->> 'focusTag'), ''))
                                      from pdays pd, jsonb_array_elements(case when jsonb_typeof(pd.days) = 'array' then pd.days else '[]'::jsonb end) e
                                     where e ->> 'id' = fw.pday limit 1), case when fw.pday is not null then 'Day ' || fw.pday else 'Session' end) end,
                '\s+', ' ', 'g')), 60),
             'mins', fw.mins, 'shelf', ls.category_id,
             'extra', case when fw.kind <> 'library_session' and not fw.in_plan then true end)) as j
      from fw
      left join lateral (select l.title, l.category_id from public.library_sessions l
                          where fw.kind = 'library_session' and l.athlete_id = p_athlete_id and l.slug = fw.slug and l.completed_on = fw.d
                          limit 1) ls on true),
  -- stage116: what the athlete logged themself (Court Log). Never a plan session, so never in `done`.
  ad as (
    select w.week, a.day as d, 'z' || a.created_at::text || a.id::text as sk, false as in_plan,
           jsonb_build_object('day', a.day, 'k', case when a.kind in ('tennis', 'padel', 'match') then 'court' else 'other' end,
                              'kind', a.kind, 'title', initcap(a.kind), 'mins', a.minutes, 'effort', a.effort, 'id', a.id) as j
      from public.activity_log a join w on a.day between w.wfrom and w.wto
     where a.athlete_id = p_athlete_id),
  items as (select * from fd union all select * from ad),
  wk as (
    select it.week, count(*) filter (where it.in_plan) as done, jsonb_agg(it.j order by it.d, it.sk) as days
      from items it group by it.week)
  select jsonb_build_object(
           'n', max(w.cycle_num), 'from', max(w.cstart), 'to', max(w.cend), 'current', bool_or(w.is_current),
           'weeks', coalesce(jsonb_agg(jsonb_build_object(
                      'w', w.week, 'from', w.wfrom, 'to', w.wto, 'plan', cardinality(w.plan), 'done', coalesce(wk.done, 0),
                      'held', exists (select 1 from public.career_facts h
                                       where h.athlete_id = p_athlete_id and h.kind = 'week_held' and h.void_at is null
                                         and h.ref = 'c' || w.cycle_num || '|w' || w.week),
                      'now', current_date between w.wfrom and w.wto,
                      'days', coalesce(wk.days, '[]'::jsonb)) order by w.week), '[]'::jsonb))
    into v_out
    from w left join wk on wk.week = w.week
  having count(*) > 0;

  return v_out;
end
$function$;

-- ── 4. coach_erase_person() learns the table ────────────────────────────────────────────────────────────────────────────────────
do $stage116_erase$
declare
  d text := pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure);
  s_old constant text := '''library_sessions'', ''messages''';
  s_new constant text := '''library_sessions'', ''activity_log'', ''messages''';
  n integer;
begin
  if position('''activity_log''' in d) > 0 then
    return;   -- already patched (a re-run)
  end if;
  n := (length(d) - length(replace(d, s_old, ''))) / length(s_old);
  if n <> 1 then
    raise exception 'stage116: coach_erase_person() is not what this patch expects (its list found % times, not once). Nothing was changed.', n;
  end if;
  execute replace(d, s_old, s_new);
end $stage116_erase$;

-- ── 5. Grants ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
revoke all on function public.log_activity(text, uuid, date, text, integer, text) from public, anon;
grant execute on function public.log_activity(text, uuid, date, text, integer, text) to authenticated, service_role;
revoke all on function public.delete_activity(text, uuid) from public, anon;
grant execute on function public.delete_activity(text, uuid) to authenticated, service_role;
revoke all on function public.get_five_weeks(text) from public, anon;
grant execute on function public.get_five_weeks(text) to authenticated, service_role;

do $stage116_check$
begin
  if to_regclass('public.activity_log') is null then raise exception 'stage116: activity_log is missing'; end if;
  if position('''activity_log''' in pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure)) = 0 then
    raise exception 'stage116: coach_erase_person() does not know activity_log';
  end if;
  if position('stage116' in pg_get_functiondef('public.get_five_weeks(text)'::regprocedure)) = 0 then raise exception 'stage116: get_five_weeks() is not the new text'; end if;
  raise notice 'stage116: applied';
end
$stage116_check$;
