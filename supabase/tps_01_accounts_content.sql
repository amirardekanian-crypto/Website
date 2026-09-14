-- Tennis Performance System, Level 2 ("tps"): the paid Farsi handbook app at /tennis/app/.
-- Buyer logins and the handbook content behind them. Applied to the shared Supabase project with
-- the MCP as migration tps_01_accounts_content (2026-09-14). Source of the app and the content:
-- the private tps-content repo.
--
-- A buyer account is an auth user made by the tps-login Edge Function (coach only), keyed on
-- tps.<username>@amirardekani.com, the same pattern as the testing app (assess_01) and
-- program.html's athlete logins. Buyers never get an athlete_identities row: the athlete RPCs
-- trust any row there.
--
-- Nothing about the buyer is stored beyond the login itself (Amir: "we don't track anything").
-- The app keeps its offline copy of the content on the phone, in IndexedDB.
--
-- ⚠️ Public sign-up is still ON in this project, so "authenticated" proves nothing. Reading the
-- content also requires an active tps_accounts row, which only the coach can create. Revoking a
-- buyer bans the auth user and stamps revoked_at; the app deletes its offline copy when it sees that.

create table public.tps_accounts (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  username         text not null unique check (username ~ '^[a-z0-9_]{3,32}$'),
  label            text check (label is null or length(label) <= 80),
  created_at       timestamptz not null default now(),
  initial_password text,
  password_set_at  timestamptz,
  sent_at          timestamptz,
  revoked_at       timestamptz
);

-- True when the caller has an active buyer account. Invoker rights: it reads the caller's own
-- tps_accounts row through that table's RLS.
create or replace function public.tps_member() returns boolean
  language sql stable set search_path = public
as $$ select exists (select 1 from public.tps_accounts a where a.user_id = auth.uid() and a.revoked_at is null) $$;
revoke all on function public.tps_member() from public;
revoke execute on function public.tps_member() from anon;
grant execute on function public.tps_member() to authenticated;

-- One row per content file (key = file name without .json), plus "manifest" with the file order.
-- version is a hash of the body, so a phone downloads only the files that changed.
create table public.tps_content (
  key        text primary key check (key ~ '^[a-z0-9-]{1,40}$'),
  body       jsonb not null,
  version    text not null,
  updated_at timestamptz not null default now()
);

-- sha256 of the publishing secret kept only in the private content repo (never the secret).
create table public.tps_publish_keys (
  key_hash   text primary key,
  created_at timestamptz not null default now()
);

alter table public.tps_accounts     enable row level security;
alter table public.tps_content      enable row level security;
alter table public.tps_publish_keys enable row level security;

revoke all on table public.tps_accounts, public.tps_content from anon;
revoke all on table public.tps_publish_keys from anon, authenticated;

create policy "coach manages tps accounts" on public.tps_accounts
  for all to authenticated using ((select public.is_coach())) with check ((select public.is_coach()));
create policy "buyer reads own tps account" on public.tps_accounts
  for select to authenticated using (user_id = (select auth.uid()));

create policy "members read tps content" on public.tps_content
  for select to authenticated using ((select public.tps_member()) or (select public.is_coach()));
create policy "coach writes tps content" on public.tps_content
  for all to authenticated using ((select public.is_coach())) with check ((select public.is_coach()));

-- Publishing from the private content repo. The script has no user session, so anon may call
-- this; the secret is the guard, and the check fails closed.
create or replace function public.tps_publish(p_token text, p_key text, p_body jsonb, p_version text)
  returns void language plpgsql security definer set search_path = public
as $$
begin
  if p_token is null or length(p_token) < 40 or not exists (
       select 1 from public.tps_publish_keys k
       where k.key_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')) then
    raise exception 'not allowed';
  end if;
  insert into public.tps_content (key, body, version, updated_at)
  values (p_key, p_body, p_version, now())
  on conflict (key) do update set body = excluded.body, version = excluded.version, updated_at = now();
end $$;
revoke all on function public.tps_publish(text, text, jsonb, text) from public;
grant execute on function public.tps_publish(text, text, jsonb, text) to anon, authenticated;
