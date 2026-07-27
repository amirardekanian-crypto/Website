-- ============================================================================
--  STAGE 16 — CONTACTS (email + WhatsApp for people who signed up from proof.html)
--  Project: bvipfipbdcyqnbczjmaq (eu-west-2). Run AFTER stage1–stage15.
--  Safe to re-run: every statement is guarded.
--
--  WHY THIS TABLE EXISTS AT ALL, rather than the obvious place:
--
--  `data/<athlete_id>.json` is a STATIC FILE served by GitHub Pages. Anyone who
--  can guess an athlete id can fetch it — there is no auth in front of it. It is
--  fine for a display name the athlete chose; it is not fine for an email
--  address or a phone number. So contact details live here, behind RLS, and
--  never in the repo.
--
--  Nothing in the athlete-facing app reads this table. It exists for the coach:
--  who signed up, how to reach them, where they came from.
-- ============================================================================

begin;

create table if not exists public.hab_contacts (
  athlete_id text primary key,
  email      text,
  whatsapp   text,
  -- 'proof' = signed up from the public habit-tracker page. 'coaching' = came
  -- in through the apply form. Room for whatever else sends people later.
  source     text not null default 'proof',
  -- Free tracker user, or a paying coached athlete. Kept here rather than
  -- inferred from "do they have a programme file", so the answer survives an
  -- athlete being between cycles.
  tier       text not null default 'free',
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.hab_contacts enable row level security;

create index if not exists hab_contacts_created_idx on public.hab_contacts (created_at desc);

-- Coach only. Athletes are `anon` and get nothing here — not even their own row,
-- because the app has no reason to read it and every reason not to.
drop policy if exists "coach manage contacts" on public.hab_contacts;
create policy "coach manage contacts" on public.hab_contacts
  for all to authenticated
  using      ( (auth.jwt() ->> 'email') = 'amirardekanian@gmail.com' )
  with check ( (auth.jwt() ->> 'email') = 'amirardekanian@gmail.com' );

-- ── Signing someone up ────────────────────────────────────────────────────
-- One call does the whole job: mints the key if they do not have one, records
-- the contact, and hands back the key so the link can be built. Coach only.
--
-- The SQL editor carries no JWT, so `auth.jwt()` is NULL there — guarding on
-- `is distinct from` alone would reject the coach at his own console (the bug
-- fixed in stage14). Guard on "signed in AND not him" instead.
--
--   select * from public.add_contact('sara_k1', 'Sara K.', 'sara@x.com', '+98...');
-- Re-running it is safe: an existing key is reused, never rotated, so a link
-- someone already has on their phone keeps working.
create or replace function public.add_contact(
  p_athlete_id text,
  p_display_name text default null,
  p_email text default null,
  p_whatsapp text default null,
  p_source text default 'proof',
  p_tier text default 'free')
-- OUT params are aid/akey, NOT athlete_id/secret_key: those collide with the
-- columns of the tables this writes to, and `on conflict (athlete_id)` cannot
-- then tell the parameter from the column.
returns table (aid text, akey text) language plpgsql
security definer set search_path = public as $fn$
declare v_key text;
begin
  if auth.jwt() is not null
     and (auth.jwt() ->> 'email') is distinct from 'amirardekanian@gmail.com' then
    raise exception 'coach only';
  end if;
  if p_athlete_id is null or btrim(p_athlete_id) = '' then
    raise exception 'athlete id required';
  end if;

  -- Reuse an existing key rather than rotating it; re-running this must never
  -- break a link someone already has on their phone.
  select k.secret_key into v_key from public.athlete_keys k where k.athlete_id = p_athlete_id;
  if v_key is null then
    -- gen_random_bytes is pgcrypto, which is not on this search_path.
    -- gen_random_uuid() is in pg_catalog; 32 hex chars matches the key strength
    -- coach.html generates client-side.
    v_key := replace(gen_random_uuid()::text, '-', '');
    insert into public.athlete_keys (athlete_id, secret_key) values (p_athlete_id, v_key);
  end if;

  insert into public.hab_contacts (athlete_id, email, whatsapp, source, tier)
  values (p_athlete_id, nullif(btrim(coalesce(p_email, '')), ''),
                        nullif(btrim(coalesce(p_whatsapp, '')), ''),
                        coalesce(p_source, 'proof'), coalesce(p_tier, 'free'))
  on conflict (athlete_id) do update
    set email    = coalesce(excluded.email, hab_contacts.email),
        whatsapp = coalesce(excluded.whatsapp, hab_contacts.whatsapp),
        source   = excluded.source,
        tier     = excluded.tier,
        updated_at = now();

  -- Put them on the board straight away under the name they asked for. Joining
  -- is what unlocks roll call, and someone who filled in a form asking to be on
  -- a board should not have to find the join button.
  if p_display_name is not null and btrim(p_display_name) <> '' then
    perform public.set_leaderboard_optin(p_athlete_id, p_display_name, true, v_key);
  end if;

  return query select p_athlete_id, v_key;
end; $fn$;
revoke all on function public.add_contact(text, text, text, text, text, text) from public;
grant execute on function public.add_contact(text, text, text, text, text, text) to authenticated;

-- Who has signed up, newest first, with how much they have actually logged.
-- Adherence is the qualifying signal — far better than an email address.
--   select * from public.contact_list();
create or replace function public.contact_list()
returns table (
  athlete_id text, email text, whatsapp text, source text, tier text,
  display_name text, days_logged int, signed_up timestamptz)
language plpgsql security definer set search_path = public as $fn$
begin
  if auth.jwt() is not null
     and (auth.jwt() ->> 'email') is distinct from 'amirardekanian@gmail.com' then
    raise exception 'coach only';
  end if;
  return query
  select c.athlete_id, c.email, c.whatsapp, c.source, c.tier,
         o.display_name,
         coalesce((
           select count(*)::int
           from jsonb_each(public.hab_log_of(ap.data, c.athlete_id)) d
           where jsonb_typeof(d.value) = 'object' and d.value <> '{}'::jsonb
         ), 0),
         c.created_at
  from public.hab_contacts c
  left join public.leaderboard_optin o on o.athlete_id = c.athlete_id
  left join public.athlete_progress  ap on ap.athlete_id = c.athlete_id
  order by c.created_at desc;
end; $fn$;
revoke all on function public.contact_list() from public;
grant execute on function public.contact_list() to authenticated;

-- Remove someone entirely — the thing to run when they ask to be deleted.
--   select public.forget_contact('sara_k1');
create or replace function public.forget_contact(p_athlete_id text)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if auth.jwt() is not null
     and (auth.jwt() ->> 'email') is distinct from 'amirardekanian@gmail.com' then
    raise exception 'coach only';
  end if;
  delete from public.hab_notes         where athlete_id = p_athlete_id;
  delete from public.leaderboard_optin where athlete_id = p_athlete_id;
  delete from public.athlete_progress  where athlete_id = p_athlete_id;
  delete from public.hab_contacts      where athlete_id = p_athlete_id;
  delete from public.athlete_keys      where athlete_id = p_athlete_id;
end; $fn$;
revoke all on function public.forget_contact(text) from public;
grant execute on function public.forget_contact(text) to authenticated;

commit;
