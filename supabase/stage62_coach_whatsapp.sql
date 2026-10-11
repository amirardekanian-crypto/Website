-- stage62 — a WhatsApp number on each athlete's File, set by the coach (2026-10-11, coach.html audit FLOW-8; Amir: "a WhatsApp number field on each coached
-- athlete's File, shown in the header with a WhatsApp button"). Safe to re-run.
--
-- Most coached athletes have no contact record (9 of 49 did, all made from an intake form), so "Copy message" on a new login had no WhatsApp button for
-- them and the login hand-off ended in a copy-and-paste. Contact details already live in public.hab_contacts (coach-only), so the number goes there:
--   · coach_set_whatsapp(athlete, number): coach only; the athlete must exist (a programme row or a contact record); a number is stored as typed
--     (trimmed, at most 40 characters: the dashboard checks that it can make a wa.me link from it); an empty number clears it.
--     A new row is made only when there is a number to keep (source 'coach', tier from the programme), so clearing a number never creates an empty
--     record; an existing row keeps its email, source and tier and only has whatsapp and updated_at changed.
--   · A row with source 'coach' is NOT a signup: the dashboard leaves it out of the Proof signup funnel, the "new signup" reason and the athlete's
--     last-seen date, and gives the athlete no Proof tab for it.
-- coach_erase_person() already empties hab_contacts and already matches a form by the number on this record, so a number stored here makes that match
-- better. Nothing in the erase list changes.
--
-- Rehearsed 2026-10-11 on the live database in a transaction that was rolled back (see the audit row).

create or replace function public.coach_set_whatsapp(p_athlete_id text, p_whatsapp text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_wa text := nullif(btrim(coalesce(p_whatsapp, '')), ''); v_tier text; v_n integer;
begin
  if not public.is_coach() then
    raise exception 'coach only';
  end if;
  if coalesce(btrim(p_athlete_id), '') = '' then
    raise exception 'which athlete?';
  end if;
  if v_wa is not null and length(v_wa) > 40 then
    raise exception 'that is too long for a phone number';
  end if;
  if not exists (select 1 from public.programs p where p.athlete_id = p_athlete_id)
     and not exists (select 1 from public.hab_contacts c where c.athlete_id = p_athlete_id) then
    raise exception 'there is no athlete called "%"', p_athlete_id;
  end if;
  update public.hab_contacts c set whatsapp = v_wa, updated_at = now() where c.athlete_id = p_athlete_id;
  get diagnostics v_n = row_count;
  if v_n = 0 and v_wa is not null then
    select case when p.data -> 'athlete' ->> 'tier' = 'free' then 'free' else 'coached' end
      into v_tier from public.programs p where p.athlete_id = p_athlete_id;
    insert into public.hab_contacts (athlete_id, whatsapp, source, tier)
    values (p_athlete_id, v_wa, 'coach', coalesce(v_tier, 'coached'));
  end if;
  return jsonb_build_object('athlete_id', p_athlete_id, 'whatsapp', v_wa);
end $function$;

revoke all on function public.coach_set_whatsapp(text, text) from public, anon, authenticated;
grant execute on function public.coach_set_whatsapp(text, text) to authenticated;
