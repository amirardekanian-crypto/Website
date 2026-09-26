-- stage41 — add_contact() no longer mints an athlete key (2026-09-26)
--
-- Amir, 2026-09-26: yes to "remove the last way a dead key link could come back". The
-- ?client=&key= links were retired on 2026-09-07: public.athlete_keys is empty and every athlete
-- signs in with a username and password. But add_contact() (stage16) still inserted a key row for
-- any athlete it was called on, and get_program() and the board functions still accept a matching
-- key, so a single call would have reopened that athlete's old link. Nothing calls it today (the
-- signup and intake skills write their rows directly), so this only closes the door: the same
-- signature and the same contact upsert, with no key. `akey` comes back null, so a caller that
-- reads two columns still works. Safe to re-run.

create or replace function public.add_contact(
  p_athlete_id   text,
  p_display_name text default null::text,
  p_email        text default null::text,
  p_whatsapp     text default null::text,
  p_source       text default 'proof'::text,
  p_tier         text default 'free'::text)
returns table(aid text, akey text)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_coach() then
    raise exception 'coach only';
  end if;
  if p_athlete_id is null or btrim(p_athlete_id) = '' then
    raise exception 'athlete id required';
  end if;

  insert into public.hab_contacts (athlete_id, email, whatsapp, display_name, source, tier)
  values (p_athlete_id, nullif(btrim(coalesce(p_email, '')), ''),
                        nullif(btrim(coalesce(p_whatsapp, '')), ''),
                        nullif(btrim(coalesce(p_display_name, '')), ''),
                        coalesce(p_source, 'proof'), coalesce(p_tier, 'free'))
  on conflict (athlete_id) do update
    set email        = coalesce(excluded.email, hab_contacts.email),
        whatsapp     = coalesce(excluded.whatsapp, hab_contacts.whatsapp),
        display_name = coalesce(excluded.display_name, hab_contacts.display_name),
        source       = excluded.source,
        tier         = excluded.tier,
        updated_at   = now();

  return query select p_athlete_id, null::text;
end; $function$;
