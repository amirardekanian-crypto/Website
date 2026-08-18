-- ============================================================================
--  STAGE 27 — INTAKE (the apply form lands in Amir's own database, not just email)
--  Project: bvipfipbdcyqnbczjmaq (eu-west-2). Run AFTER stage1–stage26.
--  Safe to re-run: every statement is guarded.
--
--  WHY THIS TABLE EXISTS
--
--  form.html and form-fa.html are the coaching apply forms. They POST to
--  Web3Forms, a third-party relay that turns a form into an email. When that
--  relay is unreachable — and it has been, intermittently — the fetch throws,
--  the athlete sees "something went wrong", and their answers are gone. Nobody
--  finds out: the form politely says "I'll get back to you", and Amir never got
--  anything to get back to.
--
--  This table is the fix. The form now writes here FIRST — into the same
--  Supabase project the whole app already runs on — and fires Web3Forms second,
--  for the email. A submission is a success if EITHER lands, so a Web3Forms
--  outage can no longer swallow a lead. The durable copy shows up in
--  coach.html → Intake; the email is now a convenience, not the only record.
--
--  SHAPE: one JSONB `payload` holds the whole form verbatim, so the form can
--  gain or lose questions without a migration. A few fields are lifted into
--  real columns (name/email/contact/programme/lang) purely so the list view in
--  coach.html can render and sort without cracking open every blob.
-- ============================================================================

begin;

create table if not exists public.hab_intake (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  -- 'en' from form.html, 'fa' from form-fa.html. Lets the coach see at a glance
  -- which audience a lead came from, and which language to answer in.
  lang        text not null default 'en',
  -- Lifted out of the payload for the list view. All nullable: a half-filled
  -- form should still be captured, not rejected on a missing field.
  name        text,
  email       text,
  contact     text,           -- Instagram / WhatsApp handle from the form
  programme   text,           -- which tier they picked (EN form only; NULL on FA)
  -- The whole form, key => value, minus the Web3Forms plumbing (access_key,
  -- botcheck, from_name, subject, redirect) which the client strips before send.
  payload     jsonb not null default '{}'::jsonb,
  -- 'new' until the coach acts, then 'handled' (replied / converted) or
  -- 'archived' (spam / not a fit). Drives the unread badge on the Intake tab.
  status      text not null default 'new',
  handled_at  timestamptz
);
alter table public.hab_intake enable row level security;

create index if not exists hab_intake_created_idx on public.hab_intake (created_at desc);
create index if not exists hab_intake_status_idx  on public.hab_intake (status);

-- Coach only, same gate as every other coach-owned table (stage16). Athletes
-- are `anon`; they never read this table directly — they only reach it through
-- submit_intake() below, which is SECURITY DEFINER and inserts on their behalf.
drop policy if exists "coach manage intake" on public.hab_intake;
create policy "coach manage intake" on public.hab_intake
  for all to authenticated
  using      ( (auth.jwt() ->> 'email') = 'amirardekanian@gmail.com' )
  with check ( (auth.jwt() ->> 'email') = 'amirardekanian@gmail.com' );

-- ── The public form's one call ─────────────────────────────────────────────
-- Called by an anonymous visitor with the publishable key, so there is NO coach
-- guard here — this is the one door `anon` is meant to walk through. It is
-- SECURITY DEFINER, so the insert happens as the function owner and RLS on the
-- table above does not block it.
--
-- Guards, because anyone can call it:
--   • payload must be a JSON object (not a string / array / null)
--   • payload is capped at 60 KB of text, so nobody can stuff the table
--   • the lifted-out columns are trimmed and length-clamped
-- This matches the trust boundary the rest of the app already runs on: the
-- client is not trusted for scoring, but it IS the only validator of form
-- content, exactly as Web3Forms was.
--
--   select public.submit_intake('{"First Name":"Sara"}'::jsonb,'en','Sara','s@x.com','@sara','Game');
create or replace function public.submit_intake(
  p_payload   jsonb,
  p_lang      text default 'en',
  p_name      text default null,
  p_email     text default null,
  p_contact   text default null,
  p_programme text default null)
returns uuid language plpgsql security definer set search_path = public as $fn$
declare v_id uuid;
begin
  if p_payload is null or jsonb_typeof(p_payload) is distinct from 'object'
     or p_payload = '{}'::jsonb then
    raise exception 'intake payload must be a non-empty object';
  end if;
  if char_length(p_payload::text) > 60000 then
    raise exception 'intake payload too large';
  end if;

  insert into public.hab_intake (lang, name, email, contact, programme, payload)
  values (
    coalesce(nullif(lower(btrim(p_lang)), ''), 'en'),
    nullif(left(btrim(coalesce(p_name, '')),     200), ''),
    nullif(left(btrim(coalesce(p_email, '')),    200), ''),
    nullif(left(btrim(coalesce(p_contact, '')),  200), ''),
    nullif(left(btrim(coalesce(p_programme, '')),200), ''),
    p_payload)
  returning id into v_id;

  return v_id;
end; $fn$;
revoke all on function public.submit_intake(jsonb, text, text, text, text, text) from public;
grant execute on function public.submit_intake(jsonb, text, text, text, text, text) to anon, authenticated;

-- ── The coach's read ───────────────────────────────────────────────────────
-- Every submission, newest first, full payload included so the detail view can
-- render the whole form. Coach only.
--   select * from public.intake_list();
drop function if exists public.intake_list();
create function public.intake_list()
returns table (
  id uuid, created_at timestamptz, lang text, name text, email text,
  contact text, programme text, status text, handled_at timestamptz, payload jsonb)
language plpgsql security definer set search_path = public as $fn$
begin
  if auth.jwt() is not null
     and (auth.jwt() ->> 'email') is distinct from 'amirardekanian@gmail.com' then
    raise exception 'coach only';
  end if;
  return query
  select i.id, i.created_at, i.lang, i.name, i.email, i.contact,
         i.programme, i.status, i.handled_at, i.payload
  from public.hab_intake i
  order by i.created_at desc;
end; $fn$;
revoke all on function public.intake_list() from public;
revoke all on function public.intake_list()               from anon;          -- Supabase default-grants anon EXECUTE on every new function; take it back
grant execute on function public.intake_list() to authenticated;

-- ── Marking one done ───────────────────────────────────────────────────────
-- 'new' -> 'handled' (replied / converted) or 'archived' (spam / not a fit),
-- or back to 'new'. handled_at is stamped the first time it leaves 'new' and
-- cleared if it returns. Coach only.
--   select public.set_intake_status('<id>', 'handled');
create or replace function public.set_intake_status(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if auth.jwt() is not null
     and (auth.jwt() ->> 'email') is distinct from 'amirardekanian@gmail.com' then
    raise exception 'coach only';
  end if;
  if p_status not in ('new', 'handled', 'archived') then
    raise exception 'bad intake status: %', p_status;
  end if;
  update public.hab_intake
     set status     = p_status,
         handled_at = case when p_status = 'new' then null
                           else coalesce(handled_at, now()) end
   where id = p_id;
end; $fn$;
revoke all on function public.set_intake_status(uuid, text) from public;
revoke all on function public.set_intake_status(uuid, text) from anon;
grant execute on function public.set_intake_status(uuid, text) to authenticated;

-- ── Erasing one ────────────────────────────────────────────────────────────
-- The thing to run when someone asks to be deleted, or to clear obvious spam
-- for good rather than just archiving it. Coach only.
--   select public.delete_intake('<id>');
create or replace function public.delete_intake(p_id uuid)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if auth.jwt() is not null
     and (auth.jwt() ->> 'email') is distinct from 'amirardekanian@gmail.com' then
    raise exception 'coach only';
  end if;
  delete from public.hab_intake where id = p_id;
end; $fn$;
revoke all on function public.delete_intake(uuid) from public;
revoke all on function public.delete_intake(uuid)          from anon;
grant execute on function public.delete_intake(uuid) to authenticated;

commit;
