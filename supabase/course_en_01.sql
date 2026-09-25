-- The Tennis Performance System's lessons and tests, in ENGLISH, for program.html's Library
-- (coached athletes). Applied to the shared Supabase project with the MCP as migrations
-- course_en_01 and course_en_02 (2026-09-24). This file is the current state of both.
--
-- Amir (2026-09-24): "my program.html is for my coached athletes only. they should have access to
-- everything, like the lessons that we have in tps and the tests, but locked in the demo version."
--
-- The Farsi original is public.tps_content (tps_01), readable only by a course buyer. This is a
-- SEPARATE, adapted English copy: course weeks, Level 2/3, buying and the U16 version were rewritten
-- for someone Amir coaches one to one. A change to one never reaches the other.
--
-- ⚠️ The content is NOT in the repo. The repo is served publicly by GitHub Pages, and this is paid
-- material, so it lives only in this table (and coach.html's ⤓ Backup). One row per item:
--   kind 'lesson'  : {id, icon, group, order, title, summary, audience, sections:[{h, p[], list[], ol[], callout, warn}]}
--   kind 'test'    : the course's test shape (see tps_content key 'tests'), in English, plus order
--   kind 'testday' : the test-day rules (id 'test-day')
-- To edit a line: update public.course_en set body = jsonb_set(body, '{...}', '"..."') where id = '...';
--
-- The lock is real, the same way tps_demo() does it: a locked item reaches the phone as its card
-- only, so there is nothing behind it to find in the network tab. Never let a stub carry a body field.

create table if not exists public.course_en (
  id         text primary key check (id ~ '^[a-z0-9-]{1,40}$'),
  kind       text not null check (kind in ('lesson', 'test', 'testday')),
  sort       numeric not null default 999,
  body       jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.course_en enable row level security;
revoke all on table public.course_en from anon;
drop policy if exists "coach manages course_en" on public.course_en;
create policy "coach manages course_en" on public.course_en
  for all to authenticated using ((select public.is_coach())) with check ((select public.is_coach()));

-- Full for the coach and for any signed-in athlete whose programme is not free tier.
-- Everyone else (the public demo, anon, a free-tier Proof user) gets the demo picks whole
-- and every other item as a locked card.
create or replace function public.get_course()
  returns jsonb
  language plpgsql
  stable
  security definer
  set search_path = public
as $$
declare
  v_id   text;
  v_full boolean := false;
  -- The demo picks: the same ones the Farsi course demo opens (tps_demo()).
  v_open_lessons text[] := array['read-your-card', 'rpe-weights', 'tennis-demands'];
  v_open_tests   text[] := array['broad-jump'];
begin
  if public.is_coach() then
    v_full := true;
  else
    v_id := public.current_athlete_id();
    if v_id is not null then
      select coalesce(p.data->'athlete'->>'tier', '') <> 'free' into v_full
      from public.programs p where p.athlete_id = v_id;
      v_full := coalesce(v_full, false);
    end if;
  end if;

  return jsonb_build_object(
    'full', v_full,
    'lessons', coalesce((
      select jsonb_agg(
        case when v_full or c.id = any(v_open_lessons) then c.body
             else jsonb_strip_nulls(jsonb_build_object('id', c.body->'id', 'order', c.body->'order', 'group', c.body->'group',
               'icon', c.body->'icon', 'title', c.body->'title', 'summary', c.body->'summary',
               'audience', c.body->'audience', 'locked', true)) end
        order by c.sort, c.id)
      from public.course_en c where c.kind = 'lesson'), '[]'::jsonb),
    'tests', coalesce((
      select jsonb_agg(
        case when v_full or c.id = any(v_open_tests) then c.body
             else jsonb_strip_nulls(jsonb_build_object('id', c.body->'id', 'order', c.body->'order', 'icon', c.body->'icon',
               'title', c.body->'title', 'badge', c.body->'badge', 'why', c.body->'why', 'optional', c.body->'optional',
               'player', c.body->'player', 'calc', c.body->'calc', 'locked', true)) end
        order by c.sort, c.id)
      from public.course_en c where c.kind = 'test'), '[]'::jsonb),
    'day', (select c.body from public.course_en c where c.kind = 'testday' limit 1)
  );
end $$;
revoke all on function public.get_course() from public;
grant execute on function public.get_course() to anon, authenticated;
