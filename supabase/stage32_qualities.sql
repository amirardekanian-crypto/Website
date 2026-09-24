-- ═══════════════════════════════════════════════════════════════════════════
-- stage32 — The Quality Map (idea #2 of /ideas round 1, 2026-09-24)
--
-- Ten physical qualities, named the way the app already names its cycles:
-- the plain word an athlete reads (Strength, Brakes …) and the cycle-picture
-- family it belongs to (iron, brakes …). Exercises carry them in the Spine's
-- existing `exercises.qualities` column (stage31) — FIRST ITEM IS THE PRIMARY,
-- up to two more are secondary. Nothing is tagged on a programme: every day's
-- mix is worked out from the exercises in it, on the phone.
--
-- Amir's calls (2026-09-24): the ten, in his own words; shown on the day cards
-- on Home for every athlete (tennis and not); athletes see words, never set
-- counts; a cycle's headline quality is read from its existing `art` word.
--
-- Same rules as the Spine:
--   • Claude drafts (status 'draft'), only Amir approves, in coach.html.
--   • get_qualities() serves APPROVED rows only, to anyone (the text is public
--     coaching copy, like an approved exercise's purpose).
--   • The table itself is coach-only.
--
-- Safe to re-run: the seed inserts on conflict do nothing, so an approved or
-- edited row is never overwritten.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.qualities (
  id          text primary key check (id ~ '^[a-z]+$'),
  name        text not null,                 -- the word on the chip: "Brakes"
  family      text,                          -- cycle-picture family: "brakes" (null for speed, rotation)
  line        text not null,                 -- one plain sentence, for every athlete
  tennis      text,                          -- shown only when the programme's sport is tennis/padel
  tests       text[] not null default '{}',  -- plain test names: "505 test", "spider drill"
  sort        int not null default 0,
  status      text not null default 'draft' check (status in ('draft','approved')),
  updated_at  timestamptz not null default now(),
  updated_by  text
);

alter table public.qualities enable row level security;
drop policy if exists "coach all qualities" on public.qualities;
create policy "coach all qualities" on public.qualities
  for all using (public.is_coach()) with check (public.is_coach());

create or replace function public.get_qualities()
 returns jsonb
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', q.id, 'name', q.name, 'family', q.family, 'line', q.line,
           'tennis', q.tennis, 'tests', q.tests, 'sort', q.sort
         ) order by q.sort), '[]'::jsonb)
  from public.qualities q
  where q.status = 'approved';
$function$;

revoke all on function public.get_qualities() from public;
grant execute on function public.get_qualities() to anon, authenticated;

insert into public.qualities (id, name, family, line, tennis, tests, sort, updated_by) values
 ('strength','Strength','iron',
  'How much force you can make. The base every other quality is built on.',
  'The push behind your first step and your serve.',
  array['Strength check (5 rep max)','Your Personal Records'], 1, 'claude-draft'),
 ('muscle','Muscle','build',
  'Building size where you need it, like your weaker side or your upper back.',
  'The muscle that protects you through a long season.',
  array['Body measures'], 2, 'claude-draft'),
 ('power','Power','voltage',
  'Force, fast. Jumps and throws done with everything you have.',
  'Explosive first steps and a faster serve.',
  array['Vertical jump','Broad jump','Med-ball throw'], 3, 'claude-draft'),
 ('spring','Spring','spring',
  'Bouncing off the ground quickly, with stiff ankles and short contacts.',
  'The split step, and quick feet between shots.',
  array['Lateral hop'], 4, 'claude-draft'),
 ('speed','Speed',null,
  'Your first steps: getting from standing still to fast.',
  'Getting to the drop shot and the wide ball in time.',
  array['20 m sprint'], 5, 'claude-draft'),
 ('brakes','Brakes','brakes',
  'Stopping and changing direction without losing balance or hurting a knee.',
  'The wide ball you have to stop on, then push back from.',
  array['505 test','Spider drill'], 6, 'claude-draft'),
 ('rotation','Rotation',null,
  'Turning force from your legs through your trunk into your arms.',
  'Every forehand, backhand and serve.',
  array['Med-ball throw'], 7, 'claude-draft'),
 ('engine','Engine','engine',
  'Fitness for long efforts and repeated ones, and recovering between them.',
  'Playing the third set as well as the first.',
  array['Cooper run','Yo-Yo test','Repeat sprints'], 8, 'claude-draft'),
 ('armour','Armour','armour',
  'Tendons, joints and trunk that can take the load: shoulder, elbow, knee and Achilles.',
  'Staying healthy through thousands of serves and stops.',
  array['Body check'], 9, 'claude-draft'),
 ('movement','Movement','bedrock',
  'Good positions and range, so everything else is built on clean patterns.',
  'Getting low and wide without losing your shape.',
  array['Body check','Your filmed sets'], 10, 'claude-draft')
on conflict (id) do nothing;

-- ── stage32b (applied the same day) ─────────────────────────────────────────
-- Amir was approving Spine entries while the first tags were drafted, and an
-- APPROVED entry is his: Claude never changes it. So Claude's suggestion for an
-- approved entry lives in the coach-only half, and coach.html pre-fills the tag
-- editor with it. It reaches exercises.qualities only when Amir saves.
alter table public.exercise_coach add column if not exists suggested_qualities text[] not null default '{}';
