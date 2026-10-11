-- stage56_functions_record.sql — RECORD ONLY (audit SERVER-13, pile B3, 2026-10-11).
--
-- Eight functions that are live in the project but had no CREATE FUNCTION anywhere in this repo: they were written in
-- the SQL editor before the repo kept SQL. This file is each one exactly as the live database holds it on 2026-10-11
-- (pg_get_functiondef), so a rebuild from supabase/*.sql has them. Running it on the live project changes nothing:
-- it is `create or replace` with the same text, and the grants are what the live ACLs already are.
--
--   get_program(text, text)     the athlete programme's one door: the public demo, the coach, the signed-in athlete's own
--                               programme, otherwise a key (athlete_keys is empty, so that last branch refuses everyone)
--   current_athlete_id()        which athlete the signed-in account is (athlete_identities.user_id); security definer, and
--                               only service_role (and the other definer functions) can call it directly
--   get_course()                the course lessons and tests a signed-in athlete may read: everything for the coach and for a
--                               coached athlete, three lessons and one test for a free one, the rest as locked stubs
--   get_library(text)           the Library: categories with their published items, optionally one kind
--   hab_career_level(text)      career level from all-time XP; revoked from signed-in accounts in stage46 (the dashboard
--                               reads levels through coach_season_levels()); no caller left in the database
--   hab_hash(text)              a small string hash; no caller left in the database or in any page
--   coaching_logs_touch(), library_touch()   updated_at triggers (coaching_logs_touch_trg, library_touch_trg)
--
-- Where the coach's address is typed in the database after stage57: public.is_coach() (every policy and function asks that)
-- and coach_erase_person()'s check that the login being erased is not the coach's own. coach.html has it once (COACH_EMAIL)
-- and the three login Edge Functions once each. To change the address, change those places and nothing else.

-- ── get_program ───────────────────────────────────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_program(p_athlete_id text, p_key text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_expected text; v_data jsonb;
begin
  -- 'demo' is the public showcase (synthetic athlete), linked openly from the site
  -- and opened by people who have no key and never will.
  if p_athlete_id = 'demo'
     or public.is_coach()
     or p_athlete_id = public.current_athlete_id() then
    select data into v_data from public.programs where athlete_id = p_athlete_id;
    return v_data;
  end if;

  select secret_key into v_expected from public.athlete_keys where athlete_id = p_athlete_id;
  if v_expected is null or p_key is null or p_key is distinct from v_expected then
    raise exception 'invalid athlete key';
  end if;

  select data into v_data from public.programs where athlete_id = p_athlete_id;
  return v_data;
end $function$;
-- live ACL: PUBLIC, anon, authenticated, service_role (the Supabase defaults; nothing to change)

-- ── current_athlete_id ────────────────────────────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.current_athlete_id()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ select athlete_id from public.athlete_identities where user_id = auth.uid() $function$;
revoke all on function public.current_athlete_id() from public, anon, authenticated;
grant execute on function public.current_athlete_id() to service_role;

-- ── get_course ────────────────────────────────────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_course()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id   text;
  v_full boolean := false;
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
end $function$;
-- live ACL: anon, authenticated, service_role, but NOT PUBLIC
revoke execute on function public.get_course() from public;

-- ── get_library ───────────────────────────────────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_library(p_kind text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(jsonb_object_agg(kind, cats), '{}'::jsonb)
  from (
    select c.kind,
           jsonb_agg(
             jsonb_build_object(
               'id', c.id, 'title', c.title, 'banner', c.banner, 'icon', c.icon,
               'items', coalesce((
                 select jsonb_agg(l.data order by coalesce(l.sort_order, 2147483647), l.slug)
                 from public.library l
                 where l.kind = c.kind and l.category_id = c.id and l.published
               ), '[]'::jsonb)
             )
             order by coalesce(c.sort_order, 2147483647), c.id
           ) as cats
    from public.library_categories c
    where p_kind is null or c.kind = p_kind
    group by c.kind
  ) t;
$function$;
-- live ACL: PUBLIC, anon, authenticated, service_role (the defaults)

-- ── hab_career_level ──────────────────────────────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.hab_career_level(p_athlete_id text)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_rules jsonb; v_data jsonb; v_xp bigint;
begin
  select rules into v_rules from public.xp_rules where id = 1;
  if v_rules is null then return 1; end if;
  select data into v_data from public.athlete_progress where athlete_id = p_athlete_id;
  if v_data is null then return 1; end if;
  v_xp := public.hab_xp(public.hab_log_of(v_data, p_athlete_id),
                        '1970-01-01'::date, current_date, v_rules)
        + public.hab_bonus_xp(public.hab_log_of(v_data, p_athlete_id),
                              public.hab_cfg_of(v_data, p_athlete_id),
                              '1970-01-01'::date, '1970-01-01'::date, current_date, v_rules);
  return public.hab_level(v_xp, v_rules);
end; $function$;
revoke all on function public.hab_career_level(text) from public, anon, authenticated;
grant execute on function public.hab_career_level(text) to service_role;

-- ── hab_hash ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.hab_hash(p_s text)
 RETURNS bigint
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare h bigint := 0; i int;
begin
  for i in 1 .. length(p_s) loop
    h := (h * 31 + ascii(substr(p_s, i, 1))) % 2147483647;
  end loop;
  return h;
end; $function$;
-- live ACL: PUBLIC, anon, authenticated, service_role (the defaults)

-- ── the two updated_at triggers ───────────────────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.coaching_logs_touch()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin new.updated_at := now(); return new; end $function$;

CREATE OR REPLACE FUNCTION public.library_touch()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin new.updated_at := now(); return new; end $function$;
-- live ACL of both: PUBLIC, anon, authenticated, service_role (the defaults). The triggers that call them are
-- coaching_logs_touch_trg (on coaching_logs) and library_touch_trg (on library).
