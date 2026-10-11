-- What every Supabase project already has, in the smallest form supabase/schema_snapshot.sql needs, for a scratch Postgres (PGlite) rehearsal.
-- scripts/restore/rehearse.mjs applies this first. NEVER run it on a real Supabase project: it would collide with the real thing.
--
--   roles       anon, authenticated, service_role (service_role skips row-level security, as the real one does)
--   auth        the sign-in table (the columns the product reads: id, email, last_sign_in_at, banned_until) and auth.uid() / auth.jwt(), which read the
--               request's claims from the settings `request.jwt.claims` (that is where Supabase's API puts them)
--   privileges  a new table, sequence or function in `public` is open to the three roles until the snapshot's own grants close it, as on Supabase
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema if not exists extensions;
create schema auth;
create table auth.users (
  id uuid primary key,
  email text,
  encrypted_password text,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  banned_until timestamptz,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim', true), ''), nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid
$$;
create function auth.role() returns text language sql stable as $$
  select nullif(auth.jwt() ->> 'role', '')
$$;

grant usage on schema public, auth to anon, authenticated, service_role;
grant all on all tables in schema auth to service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
