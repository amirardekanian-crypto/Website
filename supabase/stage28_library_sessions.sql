-- ============================================================================
--  STAGE 28 — LIBRARY SESSIONS (a Library workout can be finished, and it
--             ticks the habit it actually is)
--  Project: bvipfipbdcyqnbczjmaq (eu-west-2). Run AFTER stage1–stage27.
--  Safe to re-run: every statement is guarded.
--
--  WHY THIS EXISTS
--
--  program.html's Library has ten workouts — warm-ups, mobility flows, a
--  recovery session, three strength sessions, conditioning, on-court speed.
--  Until now `openWorkout()` was a read-only viewer: it had per-exercise ticks
--  that reset at midnight into localStorage, and nothing else. Finishing one
--  left NO trace anywhere on the server.
--
--  That was fine while the Library was a bonus shelf. It stopped being fine
--  when the Etminan Tennis Academy tier started leaning on it: those players
--  get 2 programme sessions and are expected to use Library warm-ups before
--  court and Library recovery at home, and Amir sends their head coach a
--  report of what they did over the last 7–10 days. Without this table that
--  report can only ever show the 2 sessions, and silence for everything else —
--  it would under-report a player to their own coach.
--
--  WHAT A FINISHED LIBRARY WORKOUT IS WORTH  (Amir's ruling, 2026-09-12)
--
--  It ticks THE HABIT IT ACTUALLY IS. Nothing new is scored:
--
--    strength / conditioning / on-court session (25–45 min) → WORKOUT habit
--    mobility flow, recovery session (12–15 min)            → MOBILITY habit
--    warm-up (15 min, done BEFORE a session)                → nothing
--
--  A warm-up ticks nothing because a warm-up is part of a session, not a
--  session. And the rejected alternative matters more: if everything ticked
--  WORKOUT, a 12-minute foam roll would be worth the same as a 45-minute
--  session. WORKOUT is 28.6% of the default day score, so that hands every
--  athlete a daily route to the biggest habit on the list without training —
--  and would make the academy report say "trained" when they stretched.
--
--  Because both target habits already exist and already score identically on
--  both sides, THIS MIGRATION ADDS NOTHING TO THE SCORED-TWICE TABLE in
--  CLAUDE.md. No new xp_rules key, no new branch in hab_bonus_xp(), no new
--  constant in habits.html's XP_RULES. That was the point of choosing this
--  shape over a bespoke "library bonus XP".
--
--  TWO THINGS THE CLIENT IS DELIBERATELY NOT TRUSTED WITH
--
--  1. `counts_as` is resolved HERE, at write time, from the library row's own
--     `data->>'countsAs'` — never sent by the caller. Otherwise a tampered
--     client posts {slug:'reset-roll', counts_as:'strength'} and farms the
--     biggest habit off a foam roll. Same reasoning as stage24's maxCustom.
--  2. An unrecognised or missing `countsAs` resolves to NULL — counts for
--     nothing. Fail closed: a workout published tomorrow without the field
--     must not inflate anyone's score by accident.
--
--  AND `counts_as` IS FROZEN ON THE ROW, not looked up at read time. If Amir
--  later recategorises a workout, days already scored do not move. That is the
--  same "a closed day never moves again" rule the roster timeline enforces in
--  habits.html.
--
--  FREE TIER: no special case here on purpose. A free athlete's WORKOUT habit
--  is locked for life (it is the upsell), and every route that would open
--  program.html sends them to /form.html instead — so they never reach
--  openWorkout() and never call this. Adding a tier check would be dead code
--  guarding a door that does not exist.
-- ============================================================================

begin;

-- ── The record ──────────────────────────────────────────────────────────────
-- One row per (athlete, workout, day). The primary key IS the idempotency:
-- pressing Done twice on the same workout on the same day is one row, and the
-- same workout done again next week is a new one.
create table if not exists public.library_sessions (
  athlete_id   text        not null,
  slug         text        not null,   -- 'workouts/strength/full-body-power'
  completed_on date        not null default current_date,
  -- 'strength' | 'mobility' | NULL. Frozen at write time — see the header.
  counts_as    text,
  -- Denormalised from the library row so the coach's report can render without
  -- joining, and so it still reads correctly if a workout is later unpublished
  -- or retitled. The athlete did THAT workout, whatever it is called now.
  title        text,
  category_id  text,
  duration_min int,
  created_at   timestamptz not null default now(),
  primary key (athlete_id, slug, completed_on)
);
alter table public.library_sessions enable row level security;

create index if not exists library_sessions_athlete_day_idx
  on public.library_sessions (athlete_id, completed_on desc);

-- Coach only for direct reads — same gate as every other coach-owned table
-- (stage16). Athletes are `anon` and never touch the table directly; they go
-- through the two SECURITY DEFINER functions below.
drop policy if exists "coach manage library sessions" on public.library_sessions;
create policy "coach manage library sessions" on public.library_sessions
  for all to authenticated
  using      ( (auth.jwt() ->> 'email') = 'amirardekanian@gmail.com' )
  with check ( (auth.jwt() ->> 'email') = 'amirardekanian@gmail.com' );

-- ── Write: the athlete pressed Done ─────────────────────────────────────────
-- Guard is the live one: the coach, or the athlete themselves. The old
-- `p_key` arm that get_workout_days still carries is deliberately absent —
-- public.athlete_keys has been empty since logins replaced links, so that arm
-- can only ever fail, and repeating it here would suggest it still works.
create or replace function public.log_library_session(
  p_athlete_id text,
  p_slug       text,
  p_on         date default null
)
returns table (completed_on date, counts_as text, title text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item  jsonb;
  v_cat   text;
  v_when  date := coalesce(p_on, current_date);
  v_counts text;
  v_title  text;
  v_dur    int;
begin
  if not public.is_coach() and p_athlete_id is distinct from public.current_athlete_id() then
    raise exception 'not your athlete record';
  end if;
  if p_slug is null or btrim(p_slug) = '' then
    raise exception 'slug required';
  end if;

  -- No future-dating and no reaching back: a Done is a thing that happened now.
  -- The 3-day window that habits.html allows for backfilling the habit log does
  -- NOT apply here — this is a server record of an event, not an editable log.
  if v_when > current_date or v_when < current_date - 1 then
    raise exception 'completed_on must be today or yesterday';
  end if;

  select l.data, l.category_id into v_item, v_cat
  from public.library l
  where l.slug = p_slug and l.kind = 'workout' and l.published;

  if v_item is null then
    raise exception 'no published workout at that slug';
  end if;

  -- Whitelist, not a cast. Anything else — 'none', a typo, or the field missing
  -- entirely on a workout published before this shipped — counts for nothing.
  v_counts := case v_item ->> 'countsAs'
                when 'strength' then 'strength'
                when 'mobility' then 'mobility'
                else null
              end;
  v_title  := v_item ->> 'title';
  -- 'duration' is free text on the workout JSON ('45 min'), so take the digits.
  v_dur    := nullif(regexp_replace(coalesce(v_item ->> 'duration', ''), '\D', '', 'g'), '')::int;

  insert into public.library_sessions
    (athlete_id, slug, completed_on, counts_as, title, category_id, duration_min)
  values
    (p_athlete_id, p_slug, v_when, v_counts, v_title, v_cat, v_dur)
  on conflict (athlete_id, slug, completed_on) do update
    set counts_as   = excluded.counts_as,
        title       = excluded.title,
        category_id = excluded.category_id,
        duration_min= excluded.duration_min;

  return query select v_when, v_counts, v_title;
end;
$$;

-- ── Read: Proof asks which days to tick ─────────────────────────────────────
-- Mirrors get_workout_days, but returns the habit each day earned rather than
-- a bare date, because this feeds two different habits. Rows with a NULL
-- counts_as (warm-ups) are dropped here — the client should never have to know
-- the rule, and the report reads the table directly anyway.
create or replace function public.get_library_days(
  p_athlete_id text,
  p_since      date default null
)
returns table (completed_on date, counts_as text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_coach() and p_athlete_id is distinct from public.current_athlete_id() then
    raise exception 'not your athlete record';
  end if;

  return query
    select distinct s.completed_on, s.counts_as
    from public.library_sessions s
    where s.athlete_id = p_athlete_id
      and s.counts_as is not null
      and (p_since is null or s.completed_on >= p_since)
    order by 1, 2;
end;
$$;

-- ── The coach's report ──────────────────────────────────────────────────────
-- Everything one athlete did off the shelf in a window, newest first. Used for
-- the Etminan head-coach report; `counts_as` is included so the report can say
-- which of it actually scored.
create or replace function public.library_sessions_for(
  p_athlete_id text,
  p_days       int default 10
)
returns table (completed_on date, slug text, title text, category_id text,
               duration_min int, counts_as text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_coach() then
    raise exception 'coach only';
  end if;
  return query
    select s.completed_on, s.slug, s.title, s.category_id, s.duration_min, s.counts_as
    from public.library_sessions s
    where s.athlete_id = p_athlete_id
      and s.completed_on >= current_date - greatest(coalesce(p_days, 10), 1)
    order by s.completed_on desc, s.title;
end;
$$;

revoke all on function public.log_library_session(text, text, date)   from public;
revoke all on function public.get_library_days(text, date)            from public;
revoke all on function public.library_sessions_for(text, int)         from public;
grant execute on function public.log_library_session(text, text, date) to anon, authenticated;
grant execute on function public.get_library_days(text, date)          to anon, authenticated;
grant execute on function public.library_sessions_for(text, int)       to authenticated;

-- ── Backfill: what the ten existing workouts count as ───────────────────────
-- Written as an explicit map rather than a rule over category_id, because the
-- split is NOT the categories: 'on-court' holds both a 25-minute speed session
-- (WORKOUT) and a 15-minute warm-up (nothing), and 'conditioning' holds both a
-- 30-minute engine session (WORKOUT) and a run warm-up (nothing). A rule over
-- the category would get four of these wrong.
--
-- 'none' is stored rather than left absent so the two warm-ups read as a
-- decision on the record, not an oversight. Both resolve to NULL above.
update public.library l
set data = jsonb_set(l.data, '{countsAs}', to_jsonb(m.counts), true)
from (values
  ('workouts/strength/full-body-power',          'strength'),
  ('workouts/strength/bodyweight-band-strength', 'strength'),
  ('workouts/strength/push-pull-pump',           'strength'),
  ('workouts/conditioning/engine-builder',       'strength'),
  ('workouts/on-court/first-step-speed',         'strength'),
  ('workouts/mobility/daily-flow',               'mobility'),
  ('workouts/mobility/front-rack-rescue',        'mobility'),
  ('workouts/recovery/reset-roll',               'mobility'),
  ('workouts/on-court/tennis-warm-up-routine',   'none'),
  ('workouts/conditioning/run-warm-up',          'none')
) as m(slug, counts)
where l.slug = m.slug
  and l.kind = 'workout'
  and coalesce(l.data ->> 'countsAs', '') is distinct from m.counts;

commit;

-- ── Check ───────────────────────────────────────────────────────────────────
-- select slug, data->>'countsAs' as counts_as from public.library
--   where kind='workout' order by 2 nulls first, 1;
