-- ============================================================================
--  STAGE 17 — TITLES ON THE BOARD
--  Project: bvipfipbdcyqnbczjmaq (eu-west-2). Run AFTER stage1–stage16.
--  Safe to re-run: every statement is guarded.
--
--  A title is a reward from THE LONG GAME (HABITS.md). The app already shows it
--  on Progress and prints it on the shared rank card — both of those are drawn
--  on the athlete's own device, so they cost nothing to trust.
--
--  Putting one beside a name on the LEADERBOARD is different. That name is read
--  by other people, so the claim has to be checked somewhere the athlete cannot
--  edit: `CFG.pass.owned` lives in their own localStorage, and devtools would
--  hand anyone PROOF ITSELF. This stage moves the check to the server.
--
--  WHY THE UNLOCK IS STORED AND NOT RECOMPUTED:
--
--  The obvious design is to check the title against the athlete's level every
--  time they wear it. It is wrong twice over.
--
--  1. LEVELS RESET EVERY SEASON. `claimRewards()` awards off `overallLevel()`,
--     which is scored over `seasonDays()` — the season window, same as the
--     board. So the day Amir runs `start_season('Season 1')` every athlete
--     drops to level 1, and a recomputing check would strip every title off the
--     board at once while every Progress screen still showed them. The track
--     exists precisely so levels CAN keep resetting.
--
--  2. EVEN INSIDE A SEASON, LEVEL IS NOT MONOTONIC. `hab_bonus_xp` scores two
--     milestones off `perday.ndone`, which counts only habits currently
--     switched ON: `daysWith3` (DP, 75xp) and `perfectDays` (CN, 500xp). An
--     athlete who clears three habits daily, earns CN, then ADDS a fourth habit
--     they are not doing yet stops having perfect days — and loses 500xp of
--     history they already earned. Swept across log lengths 100–365 days that
--     drops their level in 67 of 266 cases; the first is at 105 days, level 21
--     falling to 20. Level 21 is IRONCLAD. A recomputing check would take
--     IRONCLAD off the board at the exact moment the athlete added a habit.
--
--  Either one breaks the promise the feature is built on: "nothing may ever
--  revoke one — not a season reset, not a retune, not switching a habit off."
--  Rewards are the one thing in this app that is STORED rather than derived,
--  and the server has to store them for the same reason the client does.
--
--  So: MINT, then check the mint. Minting is validated against the athlete's
--  level at the moment it happens, which is what makes it unforgeable. The
--  record is then permanent, which is what makes it a reward and not a rental.
--
--  THE THRESHOLD MIRRORS THE CLIENT EXACTLY — season-scoped, because that is
--  what `overallLevel()` measures. Scoring career XP here instead would be a
--  superset: it would mint titles for an athlete whose app never awarded them,
--  which is the forgery this whole stage exists to stop.
-- ============================================================================

begin;

-- The chosen title, alongside the chosen display name. Nullable: wearing none
-- is a real option and the athlete can go back to it.
alter table public.leaderboard_optin add column if not exists title text;

-- ── The track, server-side ────────────────────────────────────────────────
-- Same pattern as the quest pool: the authority lives on the xp_rules row, and
-- habits.html carries the same list as an offline fallback. CHANGE BOTH OR THE
-- SERVER WILL REFUSE A TITLE THE APP HAS ALREADY HANDED OUT.
--
-- Only the id and the level it costs are needed here — the name, the note and
-- whether it is a title or a card are presentation, and presentation belongs in
-- the app. Cards never reach the server: they change the look of a card drawn
-- on the athlete's own phone, so there is nothing for anyone else to read.
update public.xp_rules
set rules = rules || jsonb_build_object('passTrack', jsonb_build_object(
      't_signed',    2,
      't_23',        4,
      't_early',     8,
      't_night',    11,
      't_between',  17,
      't_iron',     21,
      't_metronome',29,
      't_weather',  34,
      't_unbroken', 44,
      't_proof',    50
    ))
where id = 1;

-- ── The mint ──────────────────────────────────────────────────────────────
-- One row per title an athlete has ever been entitled to. Nothing deletes from
-- this table. `earned_on` is kept because the day you first cleared the bar is
-- worth having, and because it makes an argument about a title answerable.
create table if not exists public.hab_titles (
  athlete_id text        not null,
  title      text        not null,
  earned_on  date        not null default current_date,
  created_at timestamptz not null default now(),
  primary key (athlete_id, title)
);
alter table public.hab_titles enable row level security;
-- Athletes never touch this table directly — they reach it through the
-- security-definer functions below, exactly like every other habit table.
drop policy if exists "coach manage titles" on public.hab_titles;
create policy "coach manage titles" on public.hab_titles for all to authenticated
  using ((auth.jwt() ->> 'email') = 'amirardekanian@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'amirardekanian@gmail.com');

-- ── The athlete's level, exactly as their own app scores it ───────────────
-- The `season` scope of `leaderboard_top` for one athlete: hab_xp over the
-- season window, plus hab_bonus_xp with the season start passed separately so
-- badge runs are still measured from it. Deliberately not a new scoring rule —
-- there is nothing here that could disagree with the board.
--
-- Used ONLY at mint time. See the header for why nothing reads it afterwards.
create or replace function public.hab_season_level(p_athlete_id text)
returns integer language plpgsql stable
security definer set search_path = public as $fn$
declare v_rules jsonb; v_data jsonb; v_start date; v_xp bigint;
begin
  select rules into v_rules from public.xp_rules where id = 1;
  if v_rules is null then return 1; end if;
  select data into v_data from public.athlete_progress where athlete_id = p_athlete_id;
  if v_data is null then return 1; end if;
  select s.starts_on into v_start from public.current_season() s;
  v_start := coalesce(v_start, '1970-01-01'::date);
  v_xp := public.hab_xp(public.hab_log_of(v_data, p_athlete_id),
                        v_start, current_date, v_rules)
        + public.hab_bonus_xp(public.hab_log_of(v_data, p_athlete_id),
                              public.hab_cfg_of(v_data, p_athlete_id),
                              v_start, v_start, current_date, v_rules);
  return public.hab_level(v_xp, v_rules);
end; $fn$;

-- Records every title the athlete's level currently entitles them to and adds
-- nothing else. `on conflict do nothing` makes it idempotent, so it is safe to
-- call on every boot, and it keeps the ORIGINAL earned_on rather than stamping
-- today over it.
--
-- Called on boot, which is what closes the season-reset gap: the athlete's peak
-- is captured on the day they reach it, while their level is still there to
-- prove it. After the reset the record is all that remains, and it is enough.
create or replace function public.hab_mint_titles(p_athlete_id text)
returns void language plpgsql
security definer set search_path = public as $fn$
declare v_rules jsonb; v_level int;
begin
  select rules into v_rules from public.xp_rules where id = 1;
  if v_rules is null or v_rules -> 'passTrack' is null then return; end if;
  v_level := public.hab_season_level(p_athlete_id);
  insert into public.hab_titles (athlete_id, title)
  select p_athlete_id, t.key
  from jsonb_each_text(v_rules -> 'passTrack') t
  where v_level >= (t.value)::int
  on conflict (athlete_id, title) do nothing;
end; $fn$;

-- What the athlete owns, minting first so a title earned since the last call is
-- captured. The client calls this on boot; it is also how the app reconciles a
-- device whose localStorage was cleared.
create or replace function public.claim_titles(p_athlete_id text, p_key text default null)
returns table (title text, earned_on date)
language plpgsql security definer set search_path = public as $fn$
declare v_expected text;
begin
  select secret_key into v_expected from public.athlete_keys where athlete_id = p_athlete_id;
  if v_expected is not null and (p_key is distinct from v_expected) then
    raise exception 'invalid athlete key';
  end if;
  perform public.hab_mint_titles(p_athlete_id);
  return query
    select t.title, t.earned_on from public.hab_titles t
    where t.athlete_id = p_athlete_id order by t.earned_on, t.title;
end; $fn$;
revoke all on function public.claim_titles(text, text) from public;
grant execute on function public.claim_titles(text, text) to anon, authenticated;

-- ── Wearing a title ───────────────────────────────────────────────────────
--   select public.set_title('sara_k1', 't_iron', '<key>');
--   select public.set_title('sara_k1', null, '<key>');   -- wear nothing
-- Key-checked like every other athlete-facing call. Joining the board is a
-- prerequisite, because a title with no name beside it has nowhere to appear.
create or replace function public.set_title(
  p_athlete_id text, p_title text, p_key text default null)
returns void language plpgsql
security definer set search_path = public as $fn$
declare v_expected text; v_rules jsonb; v_need int; v_title text;
begin
  select secret_key into v_expected from public.athlete_keys where athlete_id = p_athlete_id;
  if v_expected is not null and (p_key is distinct from v_expected) then
    raise exception 'invalid athlete key';
  end if;

  v_title := nullif(btrim(coalesce(p_title, '')), '');

  if v_title is not null then
    select rules into v_rules from public.xp_rules where id = 1;
    v_need := (v_rules -> 'passTrack' ->> v_title)::int;
    -- An unknown id is refused rather than stored. Storing it would put an
    -- arbitrary string next to a name on a board other people read.
    if v_need is null then raise exception 'unknown title'; end if;

    -- Mint first: the athlete may have levelled into this title seconds ago,
    -- and refusing it because nothing had written the row yet would be a lie.
    perform public.hab_mint_titles(p_athlete_id);

    if not exists (select 1 from public.hab_titles t
                   where t.athlete_id = p_athlete_id and t.title = v_title) then
      raise exception 'title not earned: % needs level %', v_title, v_need;
    end if;
  end if;

  update public.leaderboard_optin set title = v_title, updated_at = now()
  where athlete_id = p_athlete_id;
  if not found then raise exception 'join the board first'; end if;
end; $fn$;
revoke all on function public.set_title(text, text, text) from public;
grant execute on function public.set_title(text, text, text) to anon, authenticated;

-- ── The board, now carrying titles ────────────────────────────────────────
-- Dropped and recreated because the returned columns change; `create or
-- replace` cannot alter a function's OUT list.
drop function if exists public.leaderboard_top(text, text, text, integer);
create function public.leaderboard_top(
  p_athlete_id text, p_key text default null,
  p_scope text default 'season', p_limit integer default 10)
returns table (pos integer, display_name text, title text, xp bigint,
               level integer, rank_label text, is_me boolean, joined boolean)
language plpgsql security definer set search_path = public as $fn$
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
  v_season_start := coalesce(v_season_start, '1970-01-01'::date);
  v_to := current_date;

  if p_scope = 'week' then
    v_from := greatest(current_date - 6, v_season_start);
  else
    v_from := v_season_start;
  end if;

  select exists (select 1 from public.leaderboard_optin o where o.athlete_id = p_athlete_id)
    into v_joined;

  return query
  with scored as (
    select o.athlete_id as aid,
           o.display_name as dname,
           o.title as ttl,
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
         r.ttl,
         r.x,
         public.hab_level(r.x, v_rules),
         public.hab_rank_label(public.hab_level(r.x, v_rules)),
         (r.aid = p_athlete_id),
         v_joined
  from ranked r
  where r.rn <= greatest(1, p_limit) or r.aid = p_athlete_id
  order by r.rn;
end; $fn$;
revoke all on function public.leaderboard_top(text, text, text, integer) from public;
grant execute on function public.leaderboard_top(text, text, text, integer) to anon, authenticated;

-- ── Roll call, same treatment ─────────────────────────────────────────────
-- The wall is the app's other audience, and a title that shows in one place and
-- not the other reads as a bug rather than a rule.
--
-- CTE columns stay abbreviated (d, b, p, ua, said, ttl). They collide with the
-- OUT parameter names otherwise and the function will not plan — the bug this
-- file's predecessor hit twice.
drop function if exists public.roll_call(text, text, integer);
create function public.roll_call(
  p_athlete_id text, p_key text default null, p_days integer default 7)
returns table (day date, display_name text, title text, body text, pct smallint,
               rank_label text, is_me boolean, is_coach boolean)
language plpgsql security definer set search_path = public as $fn$
declare
  v_expected text; v_rules jsonb; v_from date; v_season_start date;
begin
  select secret_key into v_expected from public.athlete_keys where athlete_id = p_athlete_id;
  if v_expected is not null and (p_key is distinct from v_expected) then
    raise exception 'invalid athlete key';
  end if;

  select rules into v_rules from public.xp_rules where id = 1;
  select s.starts_on into v_season_start from public.current_season() s;
  v_from := current_date - greatest(1, least(60, coalesce(p_days, 7)));

  return query
  with visible as (
    select n.athlete_id as aid, n.day as d, o.display_name as dname, o.title as ttl,
           n.body as b, n.pct as p, n.updated_at as ua, false as coach
    from public.hab_notes n
    join public.leaderboard_optin o on o.athlete_id = n.athlete_id
    where not n.hidden and n.day >= v_from and n.day <= current_date + 1
    union all
    -- The coach line carries no title. It is not a player on the board.
    select n.athlete_id, n.day, 'AMIR'::text, null::text,
           n.body, n.pct, n.updated_at, true
    from public.hab_notes n
    where n.athlete_id = public.coach_note_id()
      and not n.hidden and n.day >= v_from and n.day <= current_date + 1
  ),
  scored as (
    select v.aid as said,
           public.hab_rank_label(public.hab_level(
             ( public.hab_xp(public.hab_log_of(ap.data, v.aid),
                             v_season_start, current_date, v_rules)
             + public.hab_bonus_xp(public.hab_log_of(ap.data, v.aid),
                                   public.hab_cfg_of(ap.data, v.aid),
                                   v_season_start, v_season_start, current_date, v_rules) ),
             v_rules)) as rlabel
    from (select distinct aid from visible where not coach) v
    left join public.athlete_progress ap on ap.athlete_id = v.aid
  )
  select vi.d, vi.dname, vi.ttl, vi.b, vi.p,
         sc.rlabel, (vi.aid = p_athlete_id), vi.coach
  from visible vi
  left join scored sc on sc.said = vi.aid
  order by vi.d desc, vi.coach desc, vi.ua desc;
end; $fn$;
revoke all on function public.roll_call(text, text, integer) from public;
grant execute on function public.roll_call(text, text, integer) to anon, authenticated;

commit;
