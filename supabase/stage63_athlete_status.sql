-- stage63 — a status for each athlete: active, paused or former (2026-10-11, coach.html audit ROSTER-7; Amir: "a status: active, paused, former"). Safe to re-run.
--
-- "Needs you" held 36 of 49 people because nobody could say "this one is on a break" or "this one has left". Now the coach can:
--   · public.athlete_status(athlete_id, status, since, note): one row per athlete who is NOT active ('paused' or 'former'). No row means active, so the
--     table stays as small as the exceptions. Coach-only through row-level security (no athlete policy at all: an athlete never sees it).
--   · coach_set_status(athlete, status, since, note): coach only; 'active' removes the row; the athlete must exist; the public demo and the dashboard's own
--     identity have no status; setting the same status again keeps its date unless a date is given; a change of status starts today unless a date is given.
--   · coach_erase_person() is patched in place from its live definition (one snippet, found exactly once or the patch stops): athlete_status joins the tables
--     it empties, so an erased athlete leaves no status behind and the check "every table with an athlete_id column is empty" still passes.
-- The dashboard reads the table (paged, in the backup list) and folds a paused or former athlete out of Needs you, Gone quiet and the totals.
--
-- Rehearsed 2026-10-11 on the live database in a transaction that was rolled back (see the audit row).

create table if not exists public.athlete_status (
  athlete_id text primary key,
  status     text not null check (status in ('paused', 'former')),
  since      date not null default current_date,
  note       text,
  updated_at timestamptz not null default now()
);

alter table public.athlete_status enable row level security;

do $stage63$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'athlete_status' and policyname = 'coach manage athlete status') then
    create policy "coach manage athlete status" on public.athlete_status
      for all to authenticated using ((select public.is_coach())) with check ((select public.is_coach()));
  end if;
end $stage63$;

revoke all on table public.athlete_status from anon;

create or replace function public.coach_set_status(p_athlete_id text, p_status text, p_since date default null, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_note text := nullif(btrim(coalesce(p_note, '')), ''); v_n integer;
begin
  if not public.is_coach() then
    raise exception 'coach only';
  end if;
  if coalesce(btrim(p_athlete_id), '') = '' then
    raise exception 'which athlete?';
  end if;
  if p_status is null or p_status not in ('active', 'paused', 'former') then
    raise exception 'bad status: %', p_status;
  end if;
  if lower(p_athlete_id) in ('demo', 'amir_ardekani') then
    raise exception '"%" is the public demo or your own identity: it has no status', p_athlete_id;
  end if;
  if not exists (select 1 from public.programs p where p.athlete_id = p_athlete_id)
     and not exists (select 1 from public.hab_contacts c where c.athlete_id = p_athlete_id)
     and not exists (select 1 from public.athlete_progress a where a.athlete_id = p_athlete_id) then
    raise exception 'there is no athlete called "%"', p_athlete_id;
  end if;
  if p_status = 'active' then
    with d as (delete from public.athlete_status where athlete_id = p_athlete_id returning 1)
      select count(*) into v_n from d;
  else
    insert into public.athlete_status as s (athlete_id, status, since, note)
    values (p_athlete_id, p_status, coalesce(p_since, current_date), v_note)
    on conflict (athlete_id) do update
      set status     = excluded.status,
          since      = coalesce(p_since, case when s.status = excluded.status then s.since else current_date end),
          note       = excluded.note,
          updated_at = now();
  end if;
  return jsonb_build_object('athlete_id', p_athlete_id, 'status', p_status);
end $function$;

revoke all on function public.coach_set_status(text, text, date, text) from public, anon, authenticated;
grant execute on function public.coach_set_status(text, text, date, text) to authenticated;

-- coach_erase_person(), patched from its live definition. The snippet must be found exactly once, or nothing is changed.
do $stage63_patch$
declare
  d text := pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure);
  s_old constant text := '''cycle_reports'', ''athlete_keys'', ''hab_contacts'', ''athlete_identities'']';
  s_new constant text := '''cycle_reports'', ''athlete_keys'', ''hab_contacts'', ''athlete_identities'', ''athlete_status'']';
  n int;
begin
  if position(s_new in d) > 0 then
    return;      -- already patched: safe to run again
  end if;
  n := (length(d) - length(replace(d, s_old, ''))) / length(s_old);
  if n <> 1 then
    raise exception 'stage63: coach_erase_person() is not what this patch expects (the table list was found % times, not once). Nothing was changed.', n;
  end if;
  execute replace(d, s_old, s_new);
end $stage63_patch$;
