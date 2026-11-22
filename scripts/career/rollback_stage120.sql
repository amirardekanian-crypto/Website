-- rollback_stage120.sql — takes the Race off the server (on Amir's word only)
-- The phone copes: with no `days`/`wk` it draws no dots, and with crew_board(integer) back a tab other than Season shows the season.

do $rb120$
declare v_def text; v_old text; v_new text;
begin
  v_new := $a$'week', jsonb_build_object('from', v_wfrom, 'points', (w_d + w_b + round(w_r))::bigint));$a$;
  v_old := $a$'week', jsonb_build_object('from', v_wfrom, 'points', (w_d + w_b + round(w_r))::bigint))
    || public.career_board_periods(p_athlete, v_log, v_cfg, v_paid, v_hb, v_s, v_today);   -- stage120: month and active days$a$;
  select pg_get_functiondef(p.oid) into v_def
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'career_compute';
  if position(v_old in v_def) = 0 then raise exception 'rollback120: career_compute does not carry the stage120 line as written'; end if;
  execute replace(v_def, v_old, v_new);
end $rb120$;

drop function if exists public.career_board_periods(text, jsonb, jsonb, jsonb, jsonb, date, date);
drop function if exists public.crew_board(integer, text);

create or replace function public.crew_board(p_limit integer default 25)
returns table(pos integer, who text, points bigint, level integer, is_me boolean, ck uuid, fv bigint)
language plpgsql
security definer
set search_path to 'public'
as $function$
-- stage96: ck and fv
declare
  v_me text := public.current_athlete_id();
  v_coach boolean := public.is_coach();
  v_report boolean := coalesce(auth.jwt() ->> 'role', '') in ('', 'service_role');
begin
  if v_me is null and not (v_coach or v_report) then
    raise exception 'not signed in';
  end if;
  return query
  with mem as (select * from public.crew_members()),
  sc as (
    select s.athlete_id as aid, s.score
      from public.career_scores_for((select array_agg(m.athlete_id) from mem m), interval '2.5 seconds') s
  ),
  scored as (
    select m.athlete_id as aid, m.name, m.crew_key as ckey,
           coalesce((sc.score #>> '{season,points}')::bigint, 0) as x,
           coalesce((sc.score #>> '{career,level}')::int, 1) as lv
      from mem m left join sc on sc.aid = m.athlete_id
  ),
  ranked as (
    select row_number() over (order by s.x desc, lower(s.name) asc) as rn, s.*
      from scored s
  )
  select r.rn::int, r.name, r.x, r.lv, (r.aid is not distinct from v_me), r.ckey, public.crew_face_v(r.aid)
    from ranked r
   where r.rn <= greatest(1, p_limit) or r.aid is not distinct from v_me
   order by r.rn;
end $function$;
revoke all on function public.crew_board(integer) from public, anon, authenticated, service_role;
grant execute on function public.crew_board(integer) to authenticated, service_role;

do $rb120s$
declare v_id text;
begin
  update public.career_scores set stamp = 'rollback120';
  for v_id in select s.athlete_id from public.career_scores s order by 1 loop
    perform public.career_scored(v_id, true);
  end loop;
end $rb120s$;
