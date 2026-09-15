-- Tennis Performance System: the demo, /tennis/app/?demo=1. Applied to the shared Supabase project with
-- the MCP as migration tps_02_demo (2026-09-15).
--
-- Amir (2026-09-15): a demo to show people what the course contains. From the programme only week 1,
-- from the tests one, from the lessons two or three; everything else locked, with a way to buy.
--
-- The lock is real. tps_content is readable only by an active buyer (tps_01), and this function is
-- the only way in for anyone else. It sends the free parts whole, and for everything else only what
-- a locked card shows (name, icon, a one-line summary) marked "locked": true. A locked item has
-- nothing behind it to find, not on the phone and not in the network tab. Never let a stub carry a
-- body field: the app would render it, and the demo would give that part of the course away.
--
-- Free (the picks, in cfg below):
--   week 1: both age versions, the core and add-on sessions, and every exercise they use (with its
--     alternative lift). The four block names and goals, and the add-on guide, stay whole.
--   the broad jump test, and the test-day rules (its standard points to that warm-up).
--   the lessons read-your-card, rpe-weights and tennis-demands.
--   the start page, and the video library (already public through get_library()).
-- To change a pick, edit cfg and re-apply the whole function. A pick that no longer exists (say a
-- lesson id was renamed) is not an error: the demo opens one item fewer and names it here:
--   select public.tps_demo()->'demo'->'missing';
--
-- It reads the live rows on every call, so a content change shows in the demo at once. The reply is
-- about 150 KB of JSON. Checked on 2026-09-15 before shipping: 1 week, 55 of 114 exercises, 3 of 22
-- lessons and 1 of 7 tests carry a body; no locked item carries a field beyond its card; every
-- exercise week 1 uses is open; nothing missing.

create or replace function public.tps_demo()
  returns jsonb
  language sql
  stable
  security definer
  set search_path = public
as $$
with cfg as (
  select array[1]::int[] as weeks,
         array['broad-jump']::text[] as tests,
         array['read-your-card', 'rpe-weights', 'tennis-demands']::text[] as lessons
),
prog_rows as (
  select r.key, r.body from public.tps_content r where r.key ~ '^programme(-[0-9]+)?$'
),
free_weeks as (
  select wk.w from prog_rows p cross join cfg
    cross join lateral jsonb_array_elements(case when jsonb_typeof(p.body->'weeks') = 'array' then p.body->'weeks' else '[]'::jsonb end) as wk(w)
  where (wk.w->>'week') ~ '^[0-9]+$' and (wk.w->>'week')::int = any(cfg.weeks)
),
prog_extra as (
  select coalesce(jsonb_object_agg(ee.key, ee.value order by p.key), '{}'::jsonb) as obj
  from prog_rows p cross join lateral jsonb_each(p.body - 'weeks' - '_notes') as ee(key, value)
),
free_sessions as (
  select ss.s from free_weeks fw
    cross join lateral jsonb_each(case when jsonb_typeof(fw.w->'plans') = 'object' then fw.w->'plans' else '{}'::jsonb end) as pl(age, plan)
    cross join lateral jsonb_array_elements(
      (case when jsonb_typeof(pl.plan->'core') = 'array' then pl.plan->'core' else '[]'::jsonb end) ||
      (case when jsonb_typeof(pl.plan->'addons') = 'array' then pl.plan->'addons' else '[]'::jsonb end)) as ss(s)
),
free_items as (
  select ii.it from free_sessions fs
    cross join lateral jsonb_array_elements(case when jsonb_typeof(fs.s->'groups') = 'array' then fs.s->'groups' else '[]'::jsonb end) as gg(g)
    cross join lateral jsonb_array_elements(case when jsonb_typeof(gg.g->'items') = 'array' then gg.g->'items' else '[]'::jsonb end) as ii(it)
),
used as (
  select fi.it->>'ex' as id from free_items fi where fi.it->>'ex' is not null
  union
  select fi.it->>'alt' from free_items fi where fi.it->>'alt' is not null
),
exercise_map as (
  select coalesce(jsonb_object_agg(ee.key,
    case when u.id is not null then ee.value
         else jsonb_strip_nulls(jsonb_build_object('name', ee.value->'name', 'nameEn', ee.value->'nameEn',
           'slot', ee.value->'slot', 'slotTitle', ee.value->'slotTitle', 'locked', true)) end
    order by r.key), '{}'::jsonb) as obj
  from public.tps_content r
    cross join lateral jsonb_each(case when jsonb_typeof(r.body->'exercises') = 'object' then r.body->'exercises' else '{}'::jsonb end) as ee(key, value)
    left join used u on u.id = ee.key
  where r.key ~ '^exercises(-[0-9]+)?$'
),
lesson_rows as (
  select r.key, ll.l, ll.n from public.tps_content r
    cross join lateral jsonb_array_elements(case when jsonb_typeof(r.body->'lessons') = 'array' then r.body->'lessons' else '[]'::jsonb end) with ordinality as ll(l, n)
  where r.key ~ '^learn(-[0-9]+)?$'
),
lesson_list as (
  select coalesce(jsonb_agg(
    case when lr.l->>'id' = any(cfg.lessons) then lr.l
         else jsonb_strip_nulls(jsonb_build_object('id', lr.l->'id', 'order', lr.l->'order', 'group', lr.l->'group',
           'icon', lr.l->'icon', 'title', lr.l->'title', 'summary', lr.l->'summary', 'audience', lr.l->'audience', 'locked', true)) end
    order by lr.key, lr.n), '[]'::jsonb) as arr
  from lesson_rows lr cross join cfg
),
test_rows as (
  select tt.t, tt.n from public.tps_content r
    cross join lateral jsonb_array_elements(case when jsonb_typeof(r.body->'tests') = 'array' then r.body->'tests' else '[]'::jsonb end) with ordinality as tt(t, n)
  where r.key = 'tests'
),
test_list as (
  select coalesce(jsonb_agg(
    case when tr.t->>'id' = any(cfg.tests) then tr.t
         else jsonb_strip_nulls(jsonb_build_object('id', tr.t->'id', 'icon', tr.t->'icon', 'title', tr.t->'title',
           'badge', tr.t->'badge', 'why', tr.t->'why', 'optional', tr.t->'optional',
           'player', tr.t->'player', 'calc', tr.t->'calc', 'locked', true)) end
    order by tr.n), '[]'::jsonb) as arr
  from test_rows tr cross join cfg
),
missing as (
  select coalesce(jsonb_agg(q.m), '[]'::jsonb) as arr from (
    select 'week ' || uw.wk as m from cfg cross join lateral unnest(cfg.weeks) as uw(wk)
      where not exists (select 1 from free_weeks fw where (fw.w->>'week')::int = uw.wk)
    union all
    select 'test ' || ut.id from cfg cross join lateral unnest(cfg.tests) as ut(id)
      where not exists (select 1 from test_rows tr where tr.t->>'id' = ut.id)
    union all
    select 'lesson ' || ul.id from cfg cross join lateral unnest(cfg.lessons) as ul(id)
      where not exists (select 1 from lesson_rows lr where lr.l->>'id' = ul.id)
  ) q
)
select jsonb_build_object(
  'demo', jsonb_build_object('weeks', to_jsonb(cfg.weeks), 'tests', to_jsonb(cfg.tests),
    'lessons', to_jsonb(cfg.lessons), 'missing', missing.arr),
  'start', (select r.body - '_notes' from public.tps_content r where r.key = 'start'),
  'programme', prog_extra.obj || jsonb_build_object('weeks',
    (select coalesce(jsonb_agg(fw.w order by (fw.w->>'week')::int), '[]'::jsonb) from free_weeks fw)),
  'exercises', jsonb_build_object('exercises', exercise_map.obj),
  'learn', jsonb_build_object('lessons', lesson_list.arr),
  'tests', jsonb_build_object('day', (select r.body->'day' from public.tps_content r where r.key = 'tests'), 'tests', test_list.arr),
  'library', (select r.body - '_notes' from public.tps_content r where r.key = 'library')
)
from cfg, prog_extra, exercise_map, lesson_list, test_list, missing
$$;

comment on function public.tps_demo() is
  'The course demo (/tennis/app/?demo=1): the free parts whole, every locked item as its card only. Picks are the cfg arrays. Source: supabase/tps_02_demo.sql.';

revoke all on function public.tps_demo() from public;
grant execute on function public.tps_demo() to anon, authenticated;
