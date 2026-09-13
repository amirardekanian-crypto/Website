-- ============================================================================
--  STAGE 29 — AFFILIATES (the referral-code roster, private, and the forms'
--  one question about it)
--  Project: bvipfipbdcyqnbczjmaq (eu-west-2). Safe to re-run: every statement
--  is guarded.
--
--  WHY THIS TABLE EXISTS
--
--  Coaches who refer clients get a discount code (partner-fa.html explains the
--  deal). Until now that roster lived in AFFILIATES.md — in a PUBLIC repo, and
--  until 2026-09-13 served on the live site too — and the codes themselves were
--  hand-copied into form.html AND form-fa.html. A code added to one form did
--  nothing on the other, and two accepted coaches had codes that never reached
--  either form.
--
--  Now there is one list, here. coach.html → Affiliates reads and edits it;
--  both apply forms ask check_discount() whether a typed code is live. Adding a
--  code in the dashboard makes it work on both forms immediately.
--
--  ⚠️ This file holds the SCHEMA only. The rows (names, handles, WhatsApp,
--  email) were inserted directly into the database and must never be committed:
--  this repo is public. Payout / card details are deliberately NOT stored — they
--  stay in the Web3Forms application email (Gmail, subject:(Affiliate)), so the
--  coach.html backup file never carries card numbers.
-- ============================================================================

begin;

create table if not exists public.affiliates (
  -- What the client types. Stored uppercase; the forms uppercase before asking.
  code          text primary key,
  percent       integer not null default 10,
  -- NULL only while a code has no owner on file.
  coach_name    text,
  coach_name_fa text,
  instagram     text,
  whatsapp      text,
  email         text,
  -- Set when the coach also trains with Amir, so the dashboard can link them.
  athlete_id    text,
  applied_on    date,
  -- A retired code stays as a row (commission on its existing clients is kept,
  -- per the deal), it just stops validating on the forms.
  active        boolean not null default true,
  retired_on    date,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint affiliates_code_shape    check (code ~ '^[A-Z0-9]{2,32}$'),
  constraint affiliates_percent_range check (percent between 1 and 90)
);

alter table public.affiliates enable row level security;

-- Coach only. No athlete arm and no anon arm: the forms never read this table,
-- they only reach check_discount() below.
drop policy if exists "coach manage affiliates" on public.affiliates;
create policy "coach manage affiliates" on public.affiliates
  for all to authenticated
  using      ( public.is_coach() )
  with check ( public.is_coach() );

-- RLS already refuses anon, but Supabase grants anon table privileges by
-- default. Take them back so a future policy mistake cannot open this table.
revoke all on table public.affiliates from anon;

create or replace function public.touch_affiliates_updated_at()
returns trigger language plpgsql set search_path = public as $fn$
begin
  new.updated_at = now();
  return new;
end; $fn$;
revoke all on function public.touch_affiliates_updated_at() from public;
revoke all on function public.touch_affiliates_updated_at() from anon;

drop trigger if exists affiliates_touch on public.affiliates;
create trigger affiliates_touch
  before update on public.affiliates
  for each row execute function public.touch_affiliates_updated_at();

-- ── The apply forms' one call ──────────────────────────────────────────────
-- Called by an anonymous visitor with the publishable key, so — like
-- submit_intake() — there is deliberately NO coach guard, and anon EXECUTE is
-- deliberately granted. The security advisor will list it as an anon-executable
-- SECURITY DEFINER function; that is intended.
--
-- It answers exactly one question: "is this code live, and for how much?" It
-- returns the percent for an exact, active code, or NULL. It never returns a
-- name, a handle, or the list — strictly less than the forms used to publish,
-- when every code sat in their page source.
--
--   select public.check_discount('name10');  -- its percent, if live
--   select public.check_discount('nope');    -- null
create or replace function public.check_discount(p_code text)
returns integer language sql stable security definer set search_path = public as $fn$
  select a.percent
    from public.affiliates a
   where a.active
     and a.code = upper(btrim(left(coalesce(p_code, ''), 64)))
   limit 1;
$fn$;
revoke all on function public.check_discount(text) from public;
grant execute on function public.check_discount(text) to anon, authenticated;

commit;
