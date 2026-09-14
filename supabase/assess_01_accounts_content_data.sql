-- Tennis testing app ("assess"): buyer accounts, paid content behind the login, and each
-- account's players, results and notes. Applied to the shared Supabase project with the MCP.
--
-- A buyer account is an auth user made by the assess-login Edge Function (coach only), keyed on
-- assess.<username>@amirardekani.com, the same pattern as program.html's athlete logins. Buyers
-- never get an athlete_identities row: the athlete RPCs trust any row there.
--
-- ⚠️ Public sign-up is still ON in this project, so "authenticated" proves nothing. Every buyer
-- policy below also requires an active assess_accounts row, which only the coach can create.
-- Revoking a buyer bans the auth user and stamps revoked_at; their data is kept.
-- The coach manages accounts and content but has no policy to read buyer data (Amir: "we don't
-- monitor").

create table public.assess_accounts (
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
-- assess_accounts row through that table's RLS.
create or replace function public.assess_member() returns boolean
  language sql stable set search_path = public
as $$ select exists (select 1 from public.assess_accounts a where a.user_id = auth.uid() and a.revoked_at is null) $$;
revoke all on function public.assess_member() from public;
revoke execute on function public.assess_member() from anon;
grant execute on function public.assess_member() to authenticated;

create table public.assess_content (
  key        text primary key check (key ~ '^[a-z0-9-]{1,40}$'),
  body       jsonb not null,
  version    text not null,
  updated_at timestamptz not null default now()
);

-- sha256 of the publishing secret kept only in the private content repo (never the secret).
create table public.assess_publish_keys (
  key_hash   text primary key,
  created_at timestamptz not null default now()
);

create table public.assess_players (
  id          uuid primary key,
  account_id  uuid not null default auth.uid() references public.assess_accounts(user_id) on delete cascade,
  name        text not null check (length(btrim(name)) between 1 and 60),
  birth_year  int  not null check (birth_year between 1300 and 1410),
  birth_month int  not null check (birth_month between 1 and 12),
  sex         text not null check (sex in ('m', 'f')),
  hand        text not null check (hand in ('r', 'l')),
  squad       text check (squad is null or length(squad) <= 40),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  unique (id, account_id)
);
create index assess_players_account on public.assess_players (account_id);

-- One result per player, test and day (Persian date): saving again that day replaces it.
create table public.assess_results (
  player_id  uuid not null,
  test       text not null check (test ~ '^[A-Za-z0-9-]{1,20}$'),
  day        text not null check (day ~ '^1[34][0-9]{2}/(0[1-9]|1[0-2])/(0[1-9]|[12][0-9]|3[01])$'),
  account_id uuid not null default auth.uid(),
  value      numeric not null,
  extra      jsonb check (extra is null or (jsonb_typeof(extra) = 'object' and length(extra::text) <= 500)),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (player_id, test, day),
  foreign key (player_id, account_id) references public.assess_players (id, account_id) on delete cascade
);
create index assess_results_account on public.assess_results (account_id);

create table public.assess_notes (
  id         uuid primary key,
  player_id  uuid not null,
  account_id uuid not null default auth.uid(),
  body       text not null check (length(btrim(body)) between 1 and 300),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (player_id, account_id) references public.assess_players (id, account_id) on delete cascade
);
create index assess_notes_account on public.assess_notes (account_id);

create or replace function public.assess_touch() returns trigger
  language plpgsql set search_path = public
as $$ begin new.updated_at := now(); return new; end $$;
revoke all on function public.assess_touch() from public;
revoke execute on function public.assess_touch() from anon, authenticated;
create trigger assess_players_touch before update on public.assess_players
  for each row execute function public.assess_touch();
create trigger assess_results_touch before update on public.assess_results
  for each row execute function public.assess_touch();

alter table public.assess_accounts     enable row level security;
alter table public.assess_content      enable row level security;
alter table public.assess_publish_keys enable row level security;
alter table public.assess_players      enable row level security;
alter table public.assess_results      enable row level security;
alter table public.assess_notes        enable row level security;

revoke all on table public.assess_accounts, public.assess_content, public.assess_players,
  public.assess_results, public.assess_notes from anon;
revoke all on table public.assess_publish_keys from anon, authenticated;

create policy "coach manages assess accounts" on public.assess_accounts
  for all to authenticated using ((select public.is_coach())) with check ((select public.is_coach()));
create policy "buyer reads own assess account" on public.assess_accounts
  for select to authenticated using (user_id = (select auth.uid()));

create policy "members read assess content" on public.assess_content
  for select to authenticated using ((select public.assess_member()) or (select public.is_coach()));
create policy "coach writes assess content" on public.assess_content
  for all to authenticated using ((select public.is_coach())) with check ((select public.is_coach()));

create policy "member owns players" on public.assess_players
  for all to authenticated
  using (account_id = (select auth.uid()) and (select public.assess_member()))
  with check (account_id = (select auth.uid()) and (select public.assess_member()));
create policy "member owns results" on public.assess_results
  for all to authenticated
  using (account_id = (select auth.uid()) and (select public.assess_member()))
  with check (account_id = (select auth.uid()) and (select public.assess_member()));
create policy "member owns notes" on public.assess_notes
  for all to authenticated
  using (account_id = (select auth.uid()) and (select public.assess_member()))
  with check (account_id = (select auth.uid()) and (select public.assess_member()));

-- Publishing content from the private content repo. The script has no user session, so anon may
-- call this; the secret is the guard, and the check fails closed.
create or replace function public.assess_publish(p_token text, p_key text, p_body jsonb, p_version text)
  returns void language plpgsql security definer set search_path = public
as $$
begin
  if p_token is null or length(p_token) < 40 or not exists (
       select 1 from public.assess_publish_keys k
       where k.key_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')) then
    raise exception 'not allowed';
  end if;
  insert into public.assess_content (key, body, version, updated_at)
  values (p_key, p_body, p_version, now())
  on conflict (key) do update set body = excluded.body, version = excluded.version, updated_at = now();
end $$;
revoke all on function public.assess_publish(text, text, jsonb, text) from public;
grant execute on function public.assess_publish(text, text, jsonb, text) to anon, authenticated;
