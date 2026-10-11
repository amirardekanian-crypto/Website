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

-- auth.users with only the columns the code reads, and two of the auth tables that cascade from it on a delete (stage51, stage54).
create table auth.users (id uuid primary key, email text, last_sign_in_at timestamptz);
create table auth.identities (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users (id) on delete cascade);
create table auth.sessions   (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users (id) on delete cascade);

-- The rollback copy the one-name rename left in a schema of its own on 2026-10-09: an old progress blob or session log per athlete
-- (42 rows, 17 athletes, on 2026-10-11). It is the only table outside "public" with an athlete_id column; stage54 empties it for an erased athlete.
create schema backup;
create table backup.onename_2026_10_09 (id bigint generated always as identity primary key, athlete_id text, kind text, ref jsonb, old jsonb, saved_at timestamptz not null default now());

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
-- The live get_exercises() BEFORE stage64 (read 2026-10-11 with pg_get_functiondef; stage42's). stage64 replaces it with
-- one that also sends steps, and adds exercises.steps and spine_steps_ok() itself: they are left out of this file on
-- purpose, so the runner tests the real migration (a column that is not there yet), as stage49 does for spine_versions.
create or replace function public.get_exercises()
 returns jsonb language sql stable security definer set search_path to 'public'
as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', e.id, 'name', e.name, 'aliases', e.aliases, 'pattern', e.pattern,
           'qualities', e.qualities, 'purpose', e.purpose, 'tennis', e.tennis,
           'cues', e.cues, 'equipment', e.equipment, 'loads', e.loads, 'impact', e.impact,
           'easier', e.easier, 'harder', e.harder, 'alts', e.alts, 'video', e.video,
           'muscles', coalesce(nullif(c.credits, '{}'::jsonb), e.muscles)
         ) order by e.name), '[]'::jsonb)
  from public.exercises e
  left join public.exercise_coach c on c.id = e.id
  where e.status = 'approved';
$function$;
revoke all on function public.get_exercises() from public;
grant execute on function public.get_exercises() to anon, authenticated;

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

-- stage45 (forget_contact): the programme row that says which tier someone is on, and the Proof tables Forget empties
create table public.programs (
  athlete_id  text primary key,
  data        jsonb not null default '{}',
  updated_at  timestamptz not null default now(),
  updated_by  text
);
create table public.hab_contacts (
  athlete_id    text primary key,
  email         text,
  whatsapp      text,
  source        text not null,
  tier          text not null,
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  display_name  text
);
create table public.hab_notes (
  athlete_id  text not null,
  day         date not null,
  body        text,
  pct         smallint,
  hidden      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (athlete_id, day)
);
create table public.leaderboard_optin (
  athlete_id    text primary key,
  display_name  text not null,
  joined_at     timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  title         text
);
create table public.athlete_keys (
  athlete_id  text primary key,
  secret_key  text,
  created_at  timestamptz not null default now()
);

-- stage50 (the testing app): a buyer's account, players, notes and results with the buyers' own row-level policies as they
-- are live (2026-10-11). auth.uid() is the Supabase function of that name, read here from the "sub" claim.
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(coalesce(auth.jwt() ->> 'sub', ''), '')::uuid
$$;
grant execute on function auth.uid() to anon, authenticated;
create table public.assess_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade, username text unique, label text, created_at timestamptz not null default now(),
  initial_password text, password_set_at timestamptz, sent_at timestamptz, revoked_at timestamptz
);
create function public.assess_member() returns boolean language sql stable set search_path to 'public'
as $$ select exists (select 1 from public.assess_accounts a where a.user_id = auth.uid() and a.revoked_at is null) $$;
create table public.assess_players (
  id uuid primary key default gen_random_uuid(), account_id uuid references public.assess_accounts (user_id) on delete cascade, name text, birth_year integer, birth_month integer,
  sex text, hand text, squad text, created_at timestamptz default now(), updated_at timestamptz default now(), deleted_at timestamptz,
  unique (id, account_id)
);
create table public.assess_notes (
  id uuid primary key default gen_random_uuid(), player_id uuid, account_id uuid, body text,
  created_at timestamptz default now(), deleted_at timestamptz,
  foreign key (player_id, account_id) references public.assess_players (id, account_id) on delete cascade
);
create table public.assess_results (
  player_id uuid, test text, day text, account_id uuid, value numeric, extra jsonb,
  updated_at timestamptz default now(), deleted_at timestamptz, primary key (player_id, test, day),
  foreign key (player_id, account_id) references public.assess_players (id, account_id) on delete cascade
);
alter table public.assess_accounts enable row level security;
alter table public.assess_players  enable row level security;
alter table public.assess_notes    enable row level security;
alter table public.assess_results  enable row level security;
create policy "buyer reads own assess account" on public.assess_accounts for select to authenticated using (user_id = (select auth.uid()));
create policy "coach manages assess accounts"  on public.assess_accounts for all to authenticated using ((select public.is_coach()));
create policy "member owns players" on public.assess_players for all to authenticated
  using ((account_id = (select auth.uid())) and (select public.assess_member()));
create policy "member owns notes" on public.assess_notes for all to authenticated
  using ((account_id = (select auth.uid())) and (select public.assess_member()));
create policy "member owns results" on public.assess_results for all to authenticated
  using ((account_id = (select auth.uid())) and (select public.assess_member()));
-- Supabase's default table grants for the signed-in role; row-level security is what limits them. anon has none.
grant select, insert, update, delete on public.assess_accounts, public.assess_players, public.assess_notes, public.assess_results to authenticated;

-- stage51 (stored first passwords): the other login tables (auth.users is defined near the top).
create table public.athlete_identities (
  user_id uuid primary key references auth.users (id) on delete cascade, athlete_id text not null unique, email text,
  linked_at timestamptz not null default now(), initial_password text, password_set_at timestamptz, sent_at timestamptz
);
create table public.tps_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade, username text unique, label text, created_at timestamptz not null default now(),
  initial_password text, password_set_at timestamptz, sent_at timestamptz, revoked_at timestamptz
);
alter table public.tps_accounts enable row level security;
create policy "buyer reads own tps account" on public.tps_accounts for select to authenticated using (user_id = (select auth.uid()));
create policy "coach manages tps accounts" on public.tps_accounts for all to authenticated
  using ((select public.is_coach())) with check ((select public.is_coach()));
grant select, insert, update, delete on public.tps_accounts to authenticated;

-- stage52 (programme version history): the table and the stage44 trigger as the live project had them (the newest 20 per
-- athlete). stage52 replaces the function; the trigger on programs stays.
create table public.program_versions (
  id bigserial primary key, athlete_id text not null, data jsonb not null,
  saved_at timestamptz not null default now(), saved_by text, note text
);
create function public.programs_version_snapshot()
returns trigger language plpgsql security definer set search_path to 'public'
as $function$
begin
  if old.data is distinct from new.data then
    insert into public.program_versions (athlete_id, data, saved_by) values (old.athlete_id, old.data, old.updated_by);
    delete from public.program_versions v
     where v.athlete_id = old.athlete_id
       and v.id not in (select id from public.program_versions where athlete_id = old.athlete_id order by id desc limit 20);
  end if;
  new.updated_at := now();
  new.updated_by := coalesce(auth.jwt() ->> 'email', new.updated_by);
  return new;
end $function$;
create trigger programs_version_trg before update on public.programs
  for each row execute function public.programs_version_snapshot();

-- stage54 (full erasure): the other tables that hold a row under an athlete id, columns as the live catalogue has them
-- (2026-10-11), the partner roster (stage29) and the intake forms (stage27). No policies: the function runs as the owner.
create table public.hab_titles (
  athlete_id text not null, title text not null, earned_on date not null default current_date,
  created_at timestamptz not null default now(), primary key (athlete_id, title)
);
create table public.hab_season_results (
  athlete_id text not null, starts_on date not null, season_name text not null, ended_on date not null,
  level integer not null, xp bigint not null, created_at timestamptz not null default now(), primary key (athlete_id, starts_on)
);
create table public.library_sessions (
  athlete_id text not null, slug text not null, completed_on date not null default current_date, counts_as text, title text,
  category_id text, duration_min integer, created_at timestamptz not null default now(), primary key (athlete_id, slug, completed_on)
);
create table public.messages (
  id bigint generated by default as identity primary key, athlete_id text not null, sender text not null, body text not null,
  context text, created_at timestamptz not null default now(), read_by_coach boolean not null default false,
  read_by_athlete boolean not null default false
);
create table public.call_logs (
  id uuid primary key default gen_random_uuid(), athlete_id text not null, athlete_name text, call_date date not null, week text,
  duration text, tier text, rating integer, scores jsonb not null default '{}'::jsonb, sessions_done integer, sessions_planned integer,
  win_vault text, answers jsonb not null default '{}'::jsonb, summary text, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), ai_summary jsonb, ai_model text, ai_generated_at timestamptz
);
create table public.cycle_reports (
  id uuid primary key default gen_random_uuid(), athlete_id text not null, athlete_name text, cycle text not null, report jsonb not null,
  weeks_count integer, sessions_count integer, model text, generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create table public.coaching_logs (
  athlete_id text primary key, body text not null, updated_at timestamptz not null default now()
);
create table public.coaching_log_versions (
  id bigserial primary key, athlete_id text not null, body text not null, saved_at timestamptz not null default now(),
  was_updated_at timestamptz
);
create table public.affiliates (
  code text primary key check (code ~ '^[A-Z0-9]{2,32}$'), percent integer not null default 10 check (percent between 1 and 90),
  coach_name text, coach_name_fa text, instagram text, whatsapp text, email text, athlete_id text, applied_on date,
  active boolean not null default true, retired_on date, notes text, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.hab_intake (
  id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), lang text not null default 'en',
  name text, email text, contact text, programme text, payload jsonb not null default '{}'::jsonb,
  status text not null default 'new', handled_at timestamptz
);

-- stage55 (quest runs): the one-row rules table the quest functions read and write (columns as live, 2026-10-11).
create table public.xp_rules (
  id integer primary key, rules jsonb not null, updated_at timestamptz not null default now()
);
