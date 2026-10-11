-- stage61 — an application records what became of it (2026-10-11, coach.html audit FLOW-17 and SPINE-11; Amir: "link an application to the athlete it
-- became, and let Handled record an outcome"). Safe to re-run.
--
-- The Intake tab was an island: a lead could not be linked to the athlete it became, and "Handled" could not say what happened.
--   · hab_intake gets athlete_id (the athlete the application became), outcome (what happened) and linked_at.
--     outcome: client (became a coached client), free (joined the free tracker), not_a_fit, no_reply, declined, other.
--   · set_intake_outcome(id, outcome, athlete_id): coach only. 'client' needs an athlete; 'client' and 'free' may name one, the others never keep one;
--     the athlete must exist (a programme row or a contact record); a new application is marked handled by it; a null outcome clears the outcome and
--     the link. set_intake_status() is unchanged.
--   · coach_erase_person() is patched in place from its live definition (three snippets, each found exactly once or the patch stops): an application
--     linked to the erased athlete keeps its answers unless the coach ticks it (the coach picks the forms to erase) and loses only the link, so the
--     check that every table with an athlete_id column is empty still passes; and a linked application is OFFERED, first, as matched_on = 'linked'
--     (the dashboard ticks it for you: it is theirs by your own hand).
-- The dashboard reads hab_intake directly now, paged (selectAll), under the existing "coach manage intake" policy; intake_list() stays as it was
-- and is no longer called by the dashboard.
--
-- Rehearsed 2026-10-11 on the live database in a transaction that was rolled back (see the audit row).

alter table public.hab_intake
  add column if not exists athlete_id text,
  add column if not exists outcome    text,
  add column if not exists linked_at  timestamptz;

do $stage61$
begin
  if not exists (select 1 from pg_constraint where conname = 'hab_intake_outcome_check' and conrelid = 'public.hab_intake'::regclass) then
    alter table public.hab_intake
      add constraint hab_intake_outcome_check
      check (outcome is null or outcome in ('client', 'free', 'not_a_fit', 'no_reply', 'declined', 'other'));
  end if;
end $stage61$;

create or replace function public.set_intake_outcome(p_id uuid, p_outcome text, p_athlete_id text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_ath text := nullif(btrim(coalesce(p_athlete_id, '')), ''); v_n integer;
begin
  if not public.is_coach() then
    raise exception 'coach only';
  end if;
  if p_outcome is not null and p_outcome not in ('client', 'free', 'not_a_fit', 'no_reply', 'declined', 'other') then
    raise exception 'bad intake outcome: %', p_outcome;
  end if;
  if p_outcome is null or p_outcome not in ('client', 'free') then
    v_ath := null;      -- only an application that became someone keeps the link
  end if;
  if p_outcome = 'client' and v_ath is null then
    raise exception 'pick the athlete this application became';
  end if;
  if v_ath is not null
     and not exists (select 1 from public.programs p where p.athlete_id = v_ath)
     and not exists (select 1 from public.hab_contacts c where c.athlete_id = v_ath) then
    raise exception 'there is no athlete called "%"', v_ath;
  end if;
  update public.hab_intake i
     set outcome    = p_outcome,
         athlete_id = v_ath,
         linked_at  = case when v_ath is null then null
                           when i.athlete_id is not distinct from v_ath then i.linked_at
                           else now() end,
         status     = case when p_outcome is not null and i.status = 'new' then 'handled' else i.status end,
         handled_at = case when p_outcome is not null and i.status = 'new' then now() else i.handled_at end
   where i.id = p_id;
  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'no such application';
  end if;
  return jsonb_build_object('outcome', p_outcome, 'athlete_id', v_ath);
end $function$;

revoke all on function public.set_intake_outcome(uuid, text, text) from public, anon, authenticated;
grant execute on function public.set_intake_outcome(uuid, text, text) to authenticated;

-- coach_erase_person(), patched from its live definition. Each snippet must be found exactly once, or nothing is changed.
do $stage61_patch$
declare
  d text := pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure);
  s1_old constant text := 'select i.id, i.created_at, i.name, i.programme, i.lang,';
  s1_new constant text := 'select i.id, i.created_at, i.name, i.programme, i.lang, (i.athlete_id is not distinct from v_key) as linked,';
  s2_old constant text := 'select f.*, case when f.em <> '''' and f.em = any (v_emails) then ''email''';
  s2_new constant text := 'select f.*, case when f.linked then ''linked'' when f.em <> '''' and f.em = any (v_emails) then ''email''';
  s3_old constant text := 'select coalesce(jsonb_agg(code order by code), ''[]''::jsonb) into v_unlinked from u;';
  s3_new constant text := 'select coalesce(jsonb_agg(code order by code), ''[]''::jsonb) into v_unlinked from u;' || chr(10)
    || '      -- An application linked to this athlete (stage61) keeps its answers unless the coach ticked it above; only the link goes.' || chr(10)
    || '      update public.hab_intake set athlete_id = null, linked_at = null where athlete_id = v_key;';
  n int;
begin
  if position('(i.athlete_id is not distinct from v_key) as linked' in d) > 0 then
    return;      -- already patched: safe to run again
  end if;
  foreach n in array array[(length(d) - length(replace(d, s1_old, ''))) / length(s1_old),
                           (length(d) - length(replace(d, s2_old, ''))) / length(s2_old),
                           (length(d) - length(replace(d, s3_old, ''))) / length(s3_old)] loop
    if n <> 1 then
      raise exception 'stage61: coach_erase_person() is not what this patch expects (a snippet was found % times, not once). Nothing was changed.', n;
    end if;
  end loop;
  execute replace(replace(replace(d, s1_old, s1_new), s2_old, s2_new), s3_old, s3_new);
end $stage61_patch$;
