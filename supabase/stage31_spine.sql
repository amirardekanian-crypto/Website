-- ═══════════════════════════════════════════════════════════════════════════
-- STAGE 31 — THE SPINE: one record per exercise Amir programmes
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Idea #1 of "The Coaching Graph" (brief: claude.ai/artifact/WymDKxk58nkCy5eSgodSrU),
-- approved 2026-09-24. Amir: "I love the exercise database … I just dont want to
-- make my exercise cards busier … the cues should be there so we dont write the
-- cues for each exercise everytime."
--
-- Before this, an exercise was only its NAME: exercise_library.json maps 319 names
-- to a video and nothing else, and the same cues were re-typed into every
-- programme that used a lift (891 exercise slots, 298 names, 33 athletes).
--
-- ── Two tables, two audiences ──────────────────────────────────────────────
-- exercises       what an athlete may read: purpose, pattern, cues, regressions /
--                 progressions / alternatives (easier / harder / alts, as ids),
--                 what it loads, video.
-- exercise_coach  what only the coach reads: SFR rank within its pattern, and
--                 the restriction flags the pipeline filters on (loaded-knee-
--                 flexion, axial-load, free-hinge, high-impact, overhead …).
-- A separate TABLE, not a hidden column: no bug in a query that serves athletes
-- can send a flag to a phone, because that query never touches this table.
--
-- ── Nothing reaches an athlete until Amir approves it ──────────────────────
-- Claude drafts entries (status 'draft'); get_exercises() returns 'approved'
-- rows only. A draft is invisible, so the cards simply look as they do today.
--
-- ── Names are never rewritten ──────────────────────────────────────────────
-- Programmes keep their exercise NAMES. The app resolves name -> id at read
-- time through `name` and `aliases` (plus its existing variant matcher), the
-- same rule Personal Records follows (CLAUDE.md). New cycles may also carry
-- `exId` on the exercise, which wins over the name.
--
-- Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.exercises (
  id          text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null,
  aliases     text[] not null default '{}',
  pattern     text,
  qualities   text[] not null default '{}',      -- filled by idea #2 (Quality Map)
  purpose     text,                               -- one athlete-facing sentence
  tennis      text,                               -- where it shows up on court
  cues        jsonb,                              -- { good: [..], bad: [..] }, same shape as a programme card
  equipment   text[] not null default '{}',
  loads       text[] not null default '{}',       -- body regions it loads (for #8 Body Check)
  easier      text[] not null default '{}',       -- regressions: the same movement made easier
  harder      text[] not null default '{}',       -- progressions: the same movement made harder
  alts        text[] not null default '{}',       -- alternatives: same movement, other equipment
  video       text,
  status      text not null default 'draft' check (status in ('draft', 'approved')),
  updated_at  timestamptz not null default now(),
  updated_by  text
);

create table if not exists public.exercise_coach (
  id     text primary key references public.exercises(id) on delete cascade,
  sfr    integer,                                 -- 1 = best stimulus-to-fatigue in its pattern
  flags  text[] not null default '{}',
  notes  text
);

alter table public.exercises      enable row level security;
alter table public.exercise_coach enable row level security;

drop policy if exists "coach all exercises" on public.exercises;
create policy "coach all exercises" on public.exercises
  for all using (public.is_coach()) with check (public.is_coach());

drop policy if exists "coach all exercise_coach" on public.exercise_coach;
create policy "coach all exercise_coach" on public.exercise_coach
  for all using (public.is_coach()) with check (public.is_coach());

-- The athlete door: approved entries only, and never exercise_coach. Anyone may
-- call it (Amir chose "anyone": the English catalogue is not private, and the
-- public demo reads it too).
create or replace function public.get_exercises()
 returns jsonb
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', e.id, 'name', e.name, 'aliases', e.aliases, 'pattern', e.pattern,
           'qualities', e.qualities, 'purpose', e.purpose, 'tennis', e.tennis,
           'cues', e.cues, 'equipment', e.equipment, 'loads', e.loads,
           'easier', e.easier, 'harder', e.harder, 'alts', e.alts, 'video', e.video
         ) order by e.name), '[]'::jsonb)
  from public.exercises e
  where e.status = 'approved';
$function$;

revoke all on function public.get_exercises() from public;
grant execute on function public.get_exercises() to anon, authenticated;
