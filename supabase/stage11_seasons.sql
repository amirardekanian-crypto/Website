-- ============================================================================
--  STAGE 11 — Seasons for Proof
--  Project: bvipfipbdcyqnbczjmaq. Run AFTER stage9. Safe to re-run.
--
--  Scoring runs in SEASONS, like ranked play in a game. Only days on or after
--  the current season's start date earn XP — for the athlete's own level and
--  for both leaderboards. Anything logged before it still shows in their
--  history, streaks and consistency badges; it just does not score.
--
--  Right now the season is PRE-SEASON, starting today. When Amir wants to
--  launch for real it is one command:
--
--      select public.start_season('Season 1');              -- starts today
--      select public.start_season('Season 1', '2026-08-01'); -- or a date
--
--  That resets every score to zero on the start date. It deletes nothing.
-- ============================================================================

create table if not exists public.seasons (
  id         serial primary key,
  name       text not null,
  starts_on  date not null default current_date,
  created_at timestamptz not null default now()
);
alter table public.seasons enable row level security;

drop policy if exists "coach manage seasons" on public.seasons;
create policy "coach manage seasons" on public.seasons
  for all to authenticated
  using      ( (auth.jwt() ->> 'email') = 'amirardekanian@gmail.com' )
  with check ( (auth.jwt() ->> 'email') = 'amirardekanian@gmail.com' );

-- Open the pre-season today, once.
insert into public.seasons (name, starts_on)
select 'Pre-Season', current_date
where not exists (select 1 from public.seasons);

-- The season in force right now: the most recent one that has already started.
create or replace function public.current_season()
returns table (name text, starts_on date)
language sql stable as $fn$
  select s.name, s.starts_on
  from public.seasons s
  where s.starts_on <= current_date
  order by s.starts_on desc, s.id desc
  limit 1;
$fn$;

-- What the app reads. Key-checked like everything else the athlete calls.
create or replace function public.get_season(p_athlete_id text, p_key text default null)
returns table (name text, starts_on date)
language plpgsql security definer set search_path = public as $fn$
declare v_expected text;
begin
  select secret_key into v_expected from public.athlete_keys where athlete_id = p_athlete_id;
  if v_expected is not null and (p_key is distinct from v_expected) then
    raise exception 'invalid athlete key';
  end if;
  return query select * from public.current_season();
end; $fn$;
revoke all on function public.get_season(text, text) from public;
grant execute on function public.get_season(text, text) to anon, authenticated;

-- Start a new season. COACH ONLY — deliberately not granted to anon, so it can
-- only be run from the Supabase SQL editor.
create or replace function public.start_season(
  p_name text, p_starts_on date default current_date)
returns table (name text, starts_on date)
language plpgsql security definer set search_path = public as $fn$
begin
  if coalesce(btrim(p_name), '') = '' then
    raise exception 'a season needs a name';
  end if;
  insert into public.seasons (name, starts_on) values (btrim(p_name), p_starts_on);
  return query select * from public.current_season();
end; $fn$;
revoke all on function public.start_season(text, date) from public;
grant execute on function public.start_season(text, date) to authenticated;

-- ── Leaderboard now scores by season ──────────────────────────────────────
-- p_scope: 'week' = Monday→today, anything else = the current season.
-- Either way it never counts a day before the season started.
create or replace function public.leaderboard_top(
  p_athlete_id text, p_key text default null,
  p_scope text default 'season', p_limit int default 10)
returns table (
  pos int, display_name text, xp bigint, level int, rank_label text,
  is_me boolean, joined boolean
) language plpgsql security definer set search_path = public as $fn$
declare
  v_expected text; v_rules jsonb; v_from date; v_to date; v_joined boolean;
  v_season_start date;
begin
  select secret_key into v_expected from public.athlete_keys where athlete_id = p_athlete_id;
  if v_expected is not null and (p_key is distinct from v_expected) then
    raise exception 'invalid athlete key';
  end if;

  select rules into v_rules from public.xp_rules where id = 1;
  if v_rules is null then return; end if;

  select s.starts_on into v_season_start from public.current_season() s;
  v_to := current_date;

  if p_scope = 'week' then
    v_from := greatest((date_trunc('week', current_date))::date,
                       coalesce(v_season_start, '1970-01-01'::date));
  else
    v_from := coalesce(v_season_start, '1970-01-01'::date);
  end if;

  select exists (select 1 from public.leaderboard_optin o where o.athlete_id = p_athlete_id)
    into v_joined;

  return query
  with scored as (
    select o.athlete_id as aid,
           o.display_name as dname,
           public.hab_xp(public.hab_log_of(ap.data, o.athlete_id), v_from, v_to, v_rules) as x
    from public.leaderboard_optin o
    left join public.athlete_progress ap on ap.athlete_id = o.athlete_id
  ),
  ranked as (
    select row_number() over (order by s.x desc, lower(s.dname) asc) as rn, s.*
    from scored s
  )
  select r.rn::int,
         r.dname,
         r.x,
         public.hab_level(r.x, v_rules),
         public.hab_rank_label(public.hab_level(r.x, v_rules)),
         (r.aid = p_athlete_id),
         v_joined
  from ranked r
  where r.rn <= greatest(1, p_limit) or r.aid = p_athlete_id
  order by r.rn;
end; $fn$;
revoke all on function public.leaderboard_top(text, text, text, int) from public;
grant execute on function public.leaderboard_top(text, text, text, int) to anon, authenticated;
