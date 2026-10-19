-- stage78_career_cut.sql — the cut: rank names, titles, the Grand Slam, card skins and every badge but the four marks leave the server
-- (Career Mode round 5, step 4; career/CAREER_MODE.md → L5, L6; Amir, 2026-10-20: "Just remove names and titles and badges", "removed means
-- removed from the server too", "Do not change people xp and level")
--
-- Why: the light screens (step 3) are live, and no app reads a rank name, a title, a skin, the Grand Slam or any badge but the four numbers'
-- marks. So they leave the server. Nobody's XP, level or season points move: each award that leaves becomes a NAMELESS XP fact on the same day
-- with the same XP (kind `award_kept`, its value only {"xp": n}, plus "proof": true when it was one of AA Proof's own badges, so career_compare()
-- still adds up), paid exactly as the award was (the same day, so the same season and week; never career-only; only while the catalogue switch is on).
--
-- What it does, in order (one transaction):
--   0. A guard: the functions it patches are as stage76/77 left them.
--   1. Safety copies in the `backup` schema (backup.cut78_*): every row it deletes, the board's worn titles, the whole catalogue and the
--      rulebook versions. They are emptied for a person by coach_erase_person() like every backup table, and dropped on 2026-11-03.
--   2. The nameless XP facts, one per paying award that leaves (a title never paid: none for those).
--   3. career_facts_paid() pays an `award_kept` fact its own XP (never priced by a rulebook), beside the awards; career_compare() counts the ones
--      that were Proof's in its carried-over check.
--   4. The rows leave: the awards of every badge but held_weeks, century, bests and comebacks, every title award, the moments waiting for them in
--      career_recognition, every row of hab_titles (the season titles and the road's), and the title worn on the board (leaderboard_optin.title).
--   5. Nothing mints a title again: hab_mint_titles() does nothing, claim_titles() answers no rows, set_title() clears the worn title whatever
--      it is given, hab_close_season() archives the season with no title, career_mint() writes no hab_titles row.
--   6. The answers lose the rank NAME (the level stays) and every title: career_compute() (the cached score) and get_profile() drop `rank`,
--      get_profile() drops titles_owned, title_worn, slam, the rank names and the season title threshold from its rules, and leaderboard_top()
--      and roll_call() answer their title and rank_label columns as null (the columns stay, so an old phone's call still works).
--   The catalogue itself (every other badge, every title, every skin, the achievements' and the marks' titles) leaves when rulebook version 4 is
--   seeded, IN THE SAME CALL, right after this file: python scripts/career_seed.py prints the statement (career/PROCEDURES.md → Stage 78 → To apply).
--   A rank name stays only inside career_level() and rulebook.toml [level] ranks: D20 refuses a change to the level curve's rules by seed, and the
--   name goes nowhere from there.
-- Nothing here changes a price. Rehearsed in scripts/career/rehearse_cut.mjs (PGlite). The way back: scripts/career/rollback_stage78.sql (the
-- copies in backup.cut78_* come back, the functions as stage77 left them).
-- APPLIED to the live project 2026-10-19 on Amir's word ("yes, go live with the cut"), as the migration stage78_career_cut with the seed of rulebook
-- version 4 (starts_on 2026-10-19) in the same call; supabase/schema_snapshot.sql remade in the same commit. 35 of 35 athletes: the same XP, level,
-- season and week points (338,964 XP before and after); 240 badge awards and 2 title awards out, 181 nameless facts (32,535 XP, 107 of them Proof's),
-- 77 hab_titles rows and 13 worn titles out; career_compare() ok. backup.cut78_* and backup.cut78_scores_before are dropped on 2026-11-03.

do $stage78_guard$
begin
  if to_regprocedure('public.career_facts_paid(text)') is null or to_regprocedure('public.get_profile(text)') is null
     or to_regprocedure('public.career_mint(text, text, text, integer, text, date, jsonb, jsonb, jsonb, text, jsonb)') is null
     or to_regprocedure('public.career_compute(text)') is null or to_regclass('public.career_notes') is null then
    raise exception 'stage78: Career Mode''s stages 66 to 77 come first. Nothing was changed.';
  end if;
  if position('stage76' in pg_get_functiondef('public.career_facts_paid(text)'::regprocedure)) = 0 then
    raise exception 'stage78: career_facts_paid() is not the one stage76 made. Nothing was changed.';
  end if;
end
$stage78_guard$;

-- ── 1. Safety copies ─────────────────────────────────────────────────────────────────────────────────────────────────────────
create schema if not exists backup;
create table if not exists backup.cut78_career_awards as
  select a.* from public.career_awards a
   where a.kind = 'title' or (a.kind = 'badge' and a.item not in ('held_weeks', 'century', 'bests', 'comebacks'));
create table if not exists backup.cut78_career_recognition as
  select r.* from public.career_recognition r
   where r.award_id like 'title:%'
      or (r.award_id like 'badge:%' and split_part(r.award_id, ':', 2) not in ('held_weeks', 'century', 'bests', 'comebacks'));
create table if not exists backup.cut78_hab_titles as select t.* from public.hab_titles t;
create table if not exists backup.cut78_board_titles as
  select o.athlete_id, o.title from public.leaderboard_optin o where o.title is not null;
create table if not exists backup.cut78_career_catalogue as select c.* from public.career_catalogue c;
create table if not exists backup.cut78_rules as select r.* from public.career_rules r;
revoke all on backup.cut78_career_awards, backup.cut78_career_recognition, backup.cut78_hab_titles, backup.cut78_board_titles,
              backup.cut78_career_catalogue, backup.cut78_rules from public, anon, authenticated;

-- ── 2. The nameless XP facts ─────────────────────────────────────────────────────────────────────────────────────────────────
-- One per paying award that leaves, on its day, with the XP it was minted with (D20). The ref says nothing of what it was.
-- One flag, `proof`, says the award was one of AA Proof's own (its catalogue entry's origin): career_compare() still holds the XP Proof paid for
-- its tiers and milestones up to the catalogue switch against what was carried over, and those badges are exactly what leaves.
insert into public.career_facts (athlete_id, kind, ref, day, value, source)
select a.athlete_id, 'award_kept',
       'kept|' || a.day || '|' || lpad((row_number() over (partition by a.athlete_id, a.day order by a.award_id))::text, 3, '0'),
       a.day,
       jsonb_build_object('xp', a.xp) || case when c.body ->> 'origin' = 'proof' then '{"proof": true}'::jsonb else '{}'::jsonb end,
       'server'
  from public.career_awards a left join public.career_catalogue c on c.kind = a.kind and c.id = a.item
 where a.pays and a.xp > 0
   and (a.kind = 'title' or (a.kind = 'badge' and a.item not in ('held_weeks', 'century', 'bests', 'comebacks')))
on conflict (athlete_id, kind, ref) do nothing;

-- ── 3. career_facts_paid() pays them ─────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.career_facts_paid(p_athlete text)
returns table(kind text, ref text, day date, xp numeric, career_only boolean)
language sql stable set search_path to 'public' as $function$
  with v as (select r.version, r.starts_on, r.rules as j from public.career_rules r),   -- stage76
  f as (
    select f.kind, f.ref, f.day, f.value from public.career_facts f
     where f.athlete_id = p_athlete and f.void_at is null
       and f.kind not in ('habit_done', 'habit_day', 'day_on_target', 'perfect_day', 'workout_tick', 'comeback', 'award_kept')   -- stage78
  ),
  priced as (
    select f.*,
           case when r.j -> 'fact' -> f.kind ->> 'xp_from' = 'value' then coalesce(public.career_num(f.value -> 'xp'), 0)
                else coalesce(public.career_num(r.j -> 'fact' -> f.kind -> 'xp'), 0) end as xp,
           coalesce(r.j -> 'fact' -> f.kind -> 'career_only' = 'true'::jsonb, false) as conly,
           r.j -> 'fact' -> f.kind ->> 'limit_per' as per,
           coalesce(public.career_num(r.j -> 'fact' -> f.kind -> 'limit'), 0) as lim
      from f cross join lateral (select v.j from v where v.starts_on is null or v.starts_on <= f.day order by v.version desc limit 1) r   -- stage76
  ),
  weeks as (select * from public.career_weeks(p_athlete)),
  keyed as (
    select p.*,
           case p.per
             when 'plan_day_week' then
               coalesce((select 'c' || w.cycle_num || '|w' || w.week from weeks w
                          where p.day between w.wfrom and w.wto and (p.value ->> 'plan_day') = any (w.plan)
                          order by w.cstart desc limit 1),
                        'iso:' || to_char(p.day, 'IYYY-IW')) || '|d' || coalesce(p.value ->> 'plan_day', '')
             when 'week' then 'iso:' || to_char(p.day, 'IYYY-IW')
             when 'cycle' then split_part(p.ref, '|', 1)
           end as grp
      from priced p
  ),
  ranked as (
    select k.*, row_number() over (partition by case when k.per = 'plan_day_week' then 'session' else k.kind end, k.grp
                                   order by k.xp desc, k.day, k.ref) as rn
      from keyed k
  )
  select ranked.kind, ranked.ref, ranked.day, ranked.xp, ranked.conly
    from ranked
   where ranked.grp is null or ranked.rn <= ranked.lim
  union all
  select 'award'::text, a.award_id, a.day, (case when not a.pays then 0 else a.xp end)::numeric, false   -- stage76: the minted XP (D20, D12 reversed)
    from public.career_awards a
   where a.athlete_id = p_athlete and public.career_catalogue_on()
  union all
  -- stage78: an award that left with the cut, paid as it was (its own XP, its own day, never career-only, only with the catalogue on)
  select 'award_kept'::text, k.ref, k.day, coalesce(public.career_num(k.value -> 'xp'), 0), false
    from public.career_facts k
   where k.athlete_id = p_athlete and k.kind = 'award_kept' and k.void_at is null and public.career_catalogue_on()
$function$;

-- career_compare(): the carried-over awards check counts the nameless facts that were Proof's (`proof`), on the same days.
do $stage78_compare$
declare v_def text;
        v_old text := E'       where aw.athlete_id = a.athlete_id and aw.day <= v_cat and c.body ->> ''origin'' = ''proof'';\n';
        v_new text := E'       where aw.athlete_id = a.athlete_id and aw.day <= v_cat and c.body ->> ''origin'' = ''proof'';\n'
                   || E'      c_aw := c_aw + (select coalesce(sum(public.career_num(k.value -> ''xp'')), 0)::bigint from public.career_facts k\n'
                   || E'                       where k.athlete_id = a.athlete_id and k.kind = ''award_kept'' and k.void_at is null\n'
                   || E'                         and k.day <= v_cat and k.value ->> ''proof'' = ''true'');   -- stage78: the Proof awards that left with the cut\n';
begin
  v_def := pg_get_functiondef('public.career_compare(date)'::regprocedure);
  if position('stage78' in v_def) > 0 then return; end if;
  if (length(v_def) - length(replace(v_def, v_old, ''))) / length(v_old) <> 1 then
    raise exception 'stage78: career_compare() is not as stage76 left it (the carried-over awards line was not found once). Nothing was changed.';
  end if;
  execute replace(v_def, v_old, v_new);
end
$stage78_compare$;

-- ── 4. The rows leave ────────────────────────────────────────────────────────────────────────────────────────────────────────
delete from public.career_recognition r
 where r.award_id like 'title:%'
    or (r.award_id like 'badge:%' and split_part(r.award_id, ':', 2) not in ('held_weeks', 'century', 'bests', 'comebacks'));
delete from public.career_awards a
 where a.kind = 'title' or (a.kind = 'badge' and a.item not in ('held_weeks', 'century', 'bests', 'comebacks'));
delete from public.hab_titles;
update public.leaderboard_optin set title = null, updated_at = now() where title is not null;

-- ── 5. Nothing mints a title again ───────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.hab_mint_titles(p_athlete_id text) returns void
language plpgsql security definer set search_path to 'public' as $function$
begin
  return;   -- stage78: titles are gone (Career Mode round 5, L5); nothing is minted
end; $function$;

create or replace function public.claim_titles(p_athlete_id text, p_key text default null::text)
returns table(title text, earned_on date)
language plpgsql security definer set search_path to 'public' as $function$
declare v_expected text;
begin
  select secret_key into v_expected from public.athlete_keys where athlete_id = p_athlete_id;
  if not public.is_coach() and p_athlete_id is distinct from public.current_athlete_id() and (v_expected is null or p_key is null or p_key is distinct from v_expected) then
    raise exception 'invalid athlete key';
  end if;
  return;   -- stage78: titles are gone (round 5, L5): no rows
end; $function$;

create or replace function public.set_title(p_athlete_id text, p_title text, p_key text default null::text) returns void
language plpgsql security definer set search_path to 'public' as $function$
declare v_expected text;
begin
  select secret_key into v_expected from public.athlete_keys where athlete_id = p_athlete_id;
  if not public.is_coach() and p_athlete_id is distinct from public.current_athlete_id() and (v_expected is null or p_key is null or p_key is distinct from v_expected) then
    raise exception 'invalid athlete key';
  end if;
  -- stage78: titles are gone (round 5, L5). Whatever an old phone asks for, the board shows no title.
  update public.leaderboard_optin set title = null, updated_at = now() where athlete_id = p_athlete_id;
  if not found then raise exception 'join the board first'; end if;
end; $function$;

create or replace function public.hab_close_season(p_ended_on date) returns integer
language plpgsql security definer set search_path to 'public' as $function$
declare v_name text; v_start date; v_rules jsonb; v_n integer := 0;
begin
  if not public.is_coach() then
    raise exception 'coach only';
  end if;

  select name, starts_on into v_name, v_start from public.current_season();
  if v_start is null then return 0; end if;
  if p_ended_on < v_start then
    raise exception 'a season cannot end (%) before it started (%)', p_ended_on, v_start;
  end if;
  if p_ended_on > current_date then
    raise exception 'cannot archive a season that has not finished yet (ends %, today is %)',
                    p_ended_on, current_date;
  end if;
  -- stage78: the season is archived with no title (titles are gone, round 5, L5)

  if public.career_xp_on() then
    v_rules := public.career_rules_now();
    with who as (
      select distinct f.athlete_id as id from public.career_facts f where f.void_at is null
    ),
    scored as (
      select w.id,
             (public.career_score(w.id, v_start, v_start, p_ended_on) ->> 'xp')::bigint as pts,
             (public.career_score(w.id, null, null, p_ended_on) ->> 'xp')::bigint as cxp
        from who w
    )
    insert into public.hab_season_results (athlete_id, starts_on, season_name, ended_on, level, xp)
    select s.id, v_start, v_name, p_ended_on, (public.career_level(s.cxp, v_rules) ->> 'level')::int, s.pts
      from scored s
     where s.pts > 0
    on conflict (athlete_id, starts_on) do nothing;
    get diagnostics v_n = row_count;
    return v_n;
  end if;

  select rules into v_rules from public.xp_rules where id = 1;

  with scored as (
    select a.athlete_id,
           public.hab_xp(public.hab_log_of(a.data, a.athlete_id), v_start, p_ended_on, v_rules)
         + public.hab_bonus_xp(public.hab_log_of(a.data, a.athlete_id),
                               public.hab_cfg_of(a.data, a.athlete_id),
                               v_start, v_start, p_ended_on, v_rules) as xp
    from public.athlete_progress a
    where a.data ? (a.athlete_id || '_hab_log')
  )
  insert into public.hab_season_results (athlete_id, starts_on, season_name, ended_on, level, xp)
  select s.athlete_id, v_start, v_name, p_ended_on,
         public.hab_level(s.xp::bigint, v_rules), s.xp
  from scored s
  where s.xp > 0
  on conflict (athlete_id, starts_on) do nothing;
  get diagnostics v_n = row_count;

  return v_n;
end $function$;

-- career_mint(): no hab_titles row (a title is never in the catalogue again, so this only takes the dead branch out).
do $stage78_mint$
declare v_def text; v_old text := E'  if p_kind = ''title'' then\n    insert into public.hab_titles (athlete_id, title, earned_on) values (p_athlete, coalesce(p_body ->> ''proof_id'', p_item), p_day)\n    on conflict (athlete_id, title) do nothing;\n  end if;\n';
begin
  v_def := pg_get_functiondef('public.career_mint(text, text, text, integer, text, date, jsonb, jsonb, jsonb, text, jsonb)'::regprocedure);
  if position('stage78' in v_def) > 0 then return; end if;   -- already patched
  if (length(v_def) - length(replace(v_def, v_old, ''))) / length(v_old) <> 1 then
    raise exception 'stage78: career_mint() is not as stage76 left it (its title branch was not found once). Nothing was changed.';
  end if;
  execute replace(v_def, v_old, E'  -- stage78: no title is minted any more (round 5, L5), so no hab_titles row\n');
end
$stage78_mint$;

-- ── 6. The answers lose rank names and titles ────────────────────────────────────────────────────────────────────────────────
-- career_compute(): the cached score's career object keeps the level and loses the rank name.
do $stage78_compute$
declare v_def text; v_old text := E'              || public.career_level(v_cxp, v_rules),';
begin
  v_def := pg_get_functiondef('public.career_compute(text)'::regprocedure);
  if position('stage78' in v_def) > 0 then return; end if;
  if (length(v_def) - length(replace(v_def, v_old, ''))) / length(v_old) <> 1 then
    raise exception 'stage78: career_compute() is not as expected (the level line was not found once). Nothing was changed.';
  end if;
  execute replace(v_def, v_old, E'              || (public.career_level(v_cxp, v_rules) - ''rank''),   -- stage78: the level, no rank name');
end
$stage78_compute$;

-- get_profile(): no rank name, no titles, no Grand Slam, no season title threshold, no rank names in its rules.
do $stage78_profile$
declare v_def text; v_new text; p record;
begin
  v_def := pg_get_functiondef('public.get_profile(text)'::regprocedure);
  if position('stage78' in v_def) > 0 then return; end if;
  v_new := v_def;
  for p in select * from (values
      (E'    ''career'', v_score -> ''career'',', E'    ''career'', (v_score -> ''career'') - ''rank'',   -- stage78: no rank name'),
      (E'    ''titles_owned'', coalesce((select jsonb_agg(t.title order by t.earned_on, t.title) from public.hab_titles t where t.athlete_id = v_id), ''[]''::jsonb),\n', ''),
      (E'                                  ''ranks'', v_rules #> ''{level,ranks}'', ''levels_per_rank'', v_rules #> ''{level,levels_per_rank}'',\n                                  ''prestige_after'', v_rules #> ''{level,prestige_after}''),',
       E'                                  ''levels_per_rank'', v_rules #> ''{level,levels_per_rank}'', ''prestige_after'', v_rules #> ''{level,prestige_after}''),   -- stage78: no rank names'),
      (E'      ''season'', jsonb_build_object(''title_points'', v_rules #> ''{season,title_points}''),', E'      ''season'', ''{}''::jsonb,   -- stage78: no season title'),
      (E'  return v_out || (v_rp - ''numbers'')', E'  return v_out || (v_rp - ''numbers'' - ''slam'' - ''title_worn'' - ''titles_owned'')   -- stage78')
    ) as x(a, b) loop
    if (length(v_new) - length(replace(v_new, p.a, ''))) / length(p.a) <> 1 then
      raise exception 'stage78: get_profile() is not as stage76 left it (% was not found once). Nothing was changed.', left(p.a, 60);
    end if;
    v_new := replace(v_new, p.a, p.b);
  end loop;
  execute v_new;
end
$stage78_profile$;

-- leaderboard_top() and roll_call(): the title and rank_label columns stay (an old phone's call keeps working) and answer null.
create or replace function public.leaderboard_top(p_athlete_id text, p_key text default null::text, p_scope text default 'season'::text, p_limit integer default 10)
returns table(pos integer, display_name text, title text, xp bigint, level integer, rank_label text, is_me boolean, joined boolean)
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_expected text; v_rules jsonb; v_from date; v_to date; v_joined boolean;
  v_season_start date;
begin
  select secret_key into v_expected from public.athlete_keys where athlete_id = p_athlete_id;
  if not public.is_coach() and p_athlete_id is distinct from public.current_athlete_id() and (v_expected is null or p_key is null or p_key is distinct from v_expected) then
    raise exception 'invalid athlete key';
  end if;

  select exists (select 1 from public.leaderboard_optin o where o.athlete_id = p_athlete_id)
    into v_joined;

  -- stage78: no title and no rank name on the board (round 5, L5, L8: the board keeps its order, only the names go)
  if public.career_xp_on() then
    return query
    with board as (
      select o.athlete_id as aid, o.display_name as dname from public.leaderboard_optin o
    ),
    sc as (
      select s.athlete_id as aid, s.score
        from public.career_scores_for((select array_agg(b.aid) from board b), interval '2.5 seconds') s
    ),
    scored as (
      select b.aid, b.dname,
             coalesce(case when p_scope = 'week' then (sc.score #>> '{week,points}')::bigint
                           else (sc.score #>> '{season,points}')::bigint end, 0) as x,
             coalesce((sc.score #>> '{career,level}')::int, 1) as lv
        from board b left join sc on sc.aid = b.aid
    ),
    ranked as (
      select row_number() over (order by s.x desc, lower(s.dname) asc) as rn, s.*
        from scored s
    )
    select r.rn::int, r.dname, null::text, r.x, r.lv, null::text, (r.aid = p_athlete_id), v_joined
      from ranked r
     where r.rn <= greatest(1, p_limit) or r.aid = p_athlete_id
     order by r.rn;
    return;
  end if;

  select rules into v_rules from public.xp_rules where id = 1;
  if v_rules is null then return; end if;

  select s.starts_on into v_season_start from public.current_season() s;
  v_season_start := coalesce(v_season_start, '1970-01-01'::date);
  v_to := current_date;

  if p_scope = 'week' then
    v_from := greatest(current_date - 6, v_season_start);
  else
    v_from := v_season_start;
  end if;

  return query
  with scored as (
    select o.athlete_id as aid,
           o.display_name as dname,
           ( public.hab_xp(public.hab_log_of(ap.data, o.athlete_id), v_from, v_to, v_rules)
           + public.hab_bonus_xp(public.hab_log_of(ap.data, o.athlete_id),
                                 public.hab_cfg_of(ap.data, o.athlete_id),
                                 v_season_start, v_from, v_to, v_rules) ) as x
    from public.leaderboard_optin o
    left join public.athlete_progress ap on ap.athlete_id = o.athlete_id
  ),
  ranked as (
    select row_number() over (order by s.x desc, lower(s.dname) asc) as rn, s.*
    from scored s
  )
  select r.rn::int,
         r.dname,
         null::text,
         r.x,
         public.hab_level(r.x, v_rules),
         null::text,
         (r.aid = p_athlete_id),
         v_joined
  from ranked r
  where r.rn <= greatest(1, p_limit) or r.aid = p_athlete_id
  order by r.rn;
end $function$;

create or replace function public.roll_call(p_athlete_id text, p_key text default null::text, p_days integer default 7)
returns table(day date, display_name text, title text, body text, pct smallint, rank_label text, is_me boolean, is_coach boolean)
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_expected text; v_from date;
begin
  select secret_key into v_expected from public.athlete_keys where athlete_id = p_athlete_id;
  if not public.is_coach() and p_athlete_id is distinct from public.current_athlete_id() and (v_expected is null or p_key is null or p_key is distinct from v_expected) then
    raise exception 'invalid athlete key';
  end if;

  v_from := current_date - greatest(1, least(60, coalesce(p_days, 7)));

  -- stage78: no title and no rank name beside a line (round 5, L5)
  return query
  with visible as (
    select n.athlete_id as aid, n.day as d, o.display_name as dname,
           n.body as b, n.pct as p, n.updated_at as ua, false as coach
    from public.hab_notes n
    join public.leaderboard_optin o on o.athlete_id = n.athlete_id
    where not n.hidden and n.day >= v_from and n.day <= current_date + 1
    union all
    select n.athlete_id, n.day, 'AMIR'::text,
           n.body, n.pct, n.updated_at, true
    from public.hab_notes n
    where n.athlete_id = public.coach_note_id()
      and not n.hidden and n.day >= v_from and n.day <= current_date + 1
  )
  select vi.d, vi.dname, null::text, vi.b, vi.p,
         null::text, (vi.aid = p_athlete_id), vi.coach
  from visible vi
  order by vi.d desc, vi.coach desc, vi.ua desc;
end; $function$;
