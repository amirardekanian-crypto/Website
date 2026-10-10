-- A local replica of just enough of the live database to test the coach.html server functions
-- (stage48, stage49) on a real Postgres. NOT a migration: never run this on the Supabase project.
-- Column lists, defaults, checks and the two helper functions are copied from the live catalogue as
-- of 2026-10-10 (information_schema, pg_constraint, pg_get_functiondef). Loaded by scripts/test_spine_sql.sh.

-- Roles belong to the whole cluster, not one database, so a second run must not fail on them.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;

create schema auth;
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim', true), ''), nullif(current_setting('request.jwt.claims', true), ''))::jsonb
$$;
-- Supabase lets both API roles use the auth schema and the public schema; RLS policies call auth.jwt() as them.
grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;
grant execute on function auth.jwt() to anon, authenticated;

-- stage44
create or replace function public.is_coach()
returns boolean language sql stable set search_path to 'public'
as $$ select coalesce(auth.jwt() ->> 'email', '') = 'amirardekanian@gmail.com' $$;

create or replace function public.spine_credits_ok(c jsonb)
returns boolean language sql immutable set search_path to ''
as $function$
  select c is null or (jsonb_typeof(c) = 'object' and not exists (
    select 1 from jsonb_each(c) e(k, v)
    where e.k not in ('quads', 'hamstrings', 'glutes', 'adductors', 'calves', 'shins', 'peroneals', 'back',
                      'chest', 'shoulder', 'biceps', 'triceps', 'forearm', 'core', 'neck')
       or jsonb_typeof(e.v) <> 'number' or (e.v #>> '{}')::numeric not in (0.5, 1)))
$function$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path to 'public'
as $function$ begin new.updated_at := now(); return new; end; $function$;

-- stage31 + later columns
create table public.exercises (
  id          text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null,
  aliases     text[] not null default '{}',
  pattern     text,
  qualities   text[] not null default '{}',
  purpose     text,
  tennis      text,
  cues        jsonb,
  equipment   text[] not null default '{}',
  loads       text[] not null default '{}',
  easier      text[] not null default '{}',
  harder      text[] not null default '{}',
  alts        text[] not null default '{}',
  video       text,
  status      text not null default 'draft' check (status in ('draft', 'approved')),
  updated_at  timestamptz not null default now(),
  updated_by  text,
  impact      text check (impact is null or impact in ('none', 'running', 'plyometric', 'landing')),
  muscles     jsonb,
  constraint exercises_loads_check check (loads <@ array['ankle-foot','calf-achilles','knee','hip-groin','hamstring','low-back','trunk','shoulder','elbow-forearm-wrist','neck']),
  constraint exercises_muscles_ok check (public.spine_credits_ok(muscles))
);
create table public.exercise_coach (
  id                   text primary key references public.exercises(id) on delete cascade,
  sfr                  integer,
  flags                text[] not null default '{}',
  notes                text,
  suggested_qualities  text[] not null default '{}',
  links_before         jsonb,
  links_history        jsonb not null default '[]',
  credits              jsonb,
  cost                 text,
  suggested_changes    jsonb not null default '[]',
  constraint exercise_coach_cost_ok check (cost is null or cost in ('heavy', 'moderate', 'isolation', 'none')),
  constraint exercise_coach_credits_ok check (public.spine_credits_ok(credits)),
  constraint exercise_coach_suggested_changes_ok check (jsonb_typeof(suggested_changes) = 'array')
);
create table public.qualities (
  id          text primary key check (id ~ '^[a-z]+$'),
  name        text not null,
  family      text,
  line        text not null,
  tennis      text,
  tests       text[] not null default '{}',
  sort        integer not null default 0,
  status      text not null default 'draft' check (status in ('draft', 'approved')),
  updated_at  timestamptz not null default now(),
  updated_by  text
);
-- stage46 §4
create trigger exercises_touch_updated_at before update on public.exercises for each row execute function public.touch_updated_at();
create trigger qualities_touch_updated_at before update on public.qualities for each row execute function public.touch_updated_at();

-- stage1 / stage30 / stage46
create table public.session_history (
  athlete_id    text not null,
  athlete_name  text,
  day           integer not null,
  completed_on  date not null,
  status        text,
  session_rpe   integer,
  duration_min  integer,
  readiness     jsonb,
  day_note      text,
  focus         text,
  summary       text,
  updated_at    timestamptz not null default now(),
  coach_status  text not null default 'new',
  log           jsonb,
  primary key (athlete_id, day, completed_on)
);
create table public.athlete_progress (
  athlete_id    text primary key,
  athlete_name  text,
  data          jsonb not null default '{}',
  updated_at    timestamptz not null default now()
);
