-- stage77_career_my_moments.sql — what an athlete reads of Courtside: their goal, Amir's lines, "Amir saw this", their honours
-- (Career Mode round 5, step 3, the server half of the light screens; 2026-10-19)
--
-- Why: stage75 keeps the monthly goal, "From Amir", Amir's Saw it and the month's honours in coach-only tables. Amir picked (Courtside's design page,
-- 2026-10-19) that athletes see them with the light screens in AA Performance (step 3), so the app needs one read of the athlete's OWN rows and one
-- write: a line marked read. Nothing of another athlete is ever returned (the crew's honours come with step 5's consent question, GAME-9).
--
-- What it adds, and nothing else:
--   · get_my_moments(p_athlete_id): the signed-in athlete's own (or, for the coach's preview, the athlete named; the same identity rule as
--     get_awards()): this month's goal, every goal, Amir's lines (newest first, read or not), the award ids Amir saw, and their honours from frozen
--     months (a near miss is not an honour and is left out). Stable, no write.
--   · mark_note_read(p_athlete_id, p_day): the athlete themself marks one of Amir's lines read (career_notes.read_at). The coach's preview never
--     marks anything (it returns 0). Once read, Amir can no longer take the line back (coach_from_amir(), stage75).
-- No table, no XP, no change to the scorer. Rehearsed in scripts/career/rehearse_courtside.mjs (section 12). The way back:
-- scripts/career/rollback_stage77.sql (drops the two functions). Safe to re-run.
-- APPLIED to the live project 2026-10-19 (migration stage77_career_my_moments); supabase/schema_snapshot.sql remade in the same commit (197 functions).

do $stage77_guard$
begin
  if to_regclass('public.career_notes') is null or to_regclass('public.career_goals') is null then
    raise exception 'stage77: Courtside''s tables are missing (stage75 first). Nothing was changed.';
  end if;
end
$stage77_guard$;

create or replace function public.get_my_moments(p_athlete_id text default null) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_me text := public.current_athlete_id();
  v_id text := coalesce(nullif(btrim(coalesce(p_athlete_id, '')), ''), v_me);
  m0 date := date_trunc('month', current_date)::date;
begin
  if v_id is null then
    raise exception 'not signed in';
  end if;
  if not (public.is_coach() or v_id is not distinct from v_me or coalesce(auth.jwt() ->> 'role', '') in ('', 'service_role')) then
    raise exception 'not your profile';
  end if;
  return jsonb_build_object(
    'athlete_id', v_id,
    'goal', (select jsonb_build_object('month', g.month, 'line', g.line, 'done_at', g.done_at)
               from public.career_goals g where g.athlete_id = v_id and g.month = m0),
    'goals', (select coalesce(jsonb_agg(jsonb_build_object('month', g.month, 'line', g.line, 'done_at', g.done_at) order by g.month desc), '[]'::jsonb)
                from public.career_goals g where g.athlete_id = v_id),
    'notes', (select coalesce(jsonb_agg(jsonb_build_object('day', n.day, 'line', n.line, 'award_id', n.award_id, 'read', n.read_at is not null)
                                        order by n.day desc), '[]'::jsonb)
                from public.career_notes n where n.athlete_id = v_id),
    'saw', (select coalesce(jsonb_agg(m.award_id order by m.award_id), '[]'::jsonb)
              from public.courtside_marks m where m.athlete_id = v_id and m.saw_at is not null),
    'honours', (select coalesce(jsonb_agg(jsonb_build_object('month', h.month, 'honour', h.honour, 'value', h.value) order by h.month desc, h.honour), '[]'::jsonb)
                  from public.career_honours h where h.athlete_id = v_id and h.honour <> 'near'));
end $function$;

create or replace function public.mark_note_read(p_athlete_id text, p_day date) returns integer
language plpgsql volatile security definer set search_path to 'public' as $function$
declare v_n integer;
begin
  if p_athlete_id is null or p_athlete_id is distinct from public.current_athlete_id() then return 0; end if;   -- the athlete themself, never a preview
  update public.career_notes set read_at = now() where athlete_id = p_athlete_id and day = p_day and read_at is null;
  get diagnostics v_n = row_count;
  return v_n;
end $function$;

revoke all on function public.get_my_moments(text) from public, anon;
revoke all on function public.mark_note_read(text, date) from public, anon;
grant execute on function public.get_my_moments(text) to authenticated, service_role;
grant execute on function public.mark_note_read(text, date) to authenticated, service_role;
