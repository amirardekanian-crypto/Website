-- ═══════════════════════════════════════════════════════════════════════════
-- STAGE 12 — the badges pay, and the weekly board really is a rolling week
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Two changes, both about the board agreeing with the athlete's own screen.
--
-- 1. BONUS XP. Consistency tiers and milestones were displayed with an XP value
--    and awarded nothing: `hab_xp` sums per-day per-habit points and stopped
--    there, and so did the client. They now pay, and each bonus is attributed to
--    THE DAY IT WAS CROSSED — which is what keeps it safe. A dated bonus is just
--    an ordinary amount inside a window, so the season rule and both board
--    windows filter it with no special cases, and nothing has to be stored.
--
--    Tier values are a MULTIPLIER on that habit's own daily completion value,
--    not a flat number. Flat values inverted the weighting the rest of the
--    system rests on: sixty straight days of SUPPS (20 XP a day) paid exactly as
--    much as sixty straight days of WORKOUT (100 a day).
--
--    Bonuses land on the OVERALL ladder only. A habit's own level has to stay a
--    pure count of how often it was done — see XP_SYSTEM.md §2.
--
-- 2. THE WEEKLY BOARD. The app was changed to say "a rolling seven days — today
--    and the six before it", but this function still scored
--    date_trunc('week', current_date) — Monday to today. The two agree only on a
--    Sunday, so the app has been overstating the window every other day of the
--    week. Now genuinely current_date - 6.
--
-- ⚠️ The XP rules live in TWO places on purpose (the app scores the athlete's own
--    screens, Postgres scores the board). `XP_RULES` + `CONSISTENCY_TIERS` +
--    `ACHIEVEMENTS` in habits.html and the `xp_rules` row below must move
--    together. See XP_SYSTEM.md §8.
--
-- Safe to re-run.

begin;

-- ── The rules row gains the two ladders ───────────────────────────────────
-- Mirrors CONSISTENCY_TIERS and ACHIEVEMENTS in habits.html at the time of
-- writing. `measure` strings are interpreted exactly as the app interprets them.
update public.xp_rules
set rules = rules || $add${
  "tiers": [
    { "days": 5,  "mult": 0.5 },
    { "days": 10, "mult": 1 },
    { "days": 20, "mult": 2 },
    { "days": 30, "mult": 3 },
    { "days": 60, "mult": 6 }
  ],
  "milestones": [
    { "code": "RR", "need": 30,  "xp": 200, "measure": "daysHit:steps" },
    { "code": "IM", "need": 16,  "xp": 150, "measure": "streak:supps" },
    { "code": "HM", "need": 12,  "xp": 150, "measure": "streak:strength" },
    { "code": "HS", "need": 5,   "xp": 100, "measure": "streak:water" },
    { "code": "DP", "need": 10,  "xp": 75,  "measure": "daysWith3" },
    { "code": "ZM", "need": 10,  "xp": 100, "measure": "streak:breathe" },
    { "code": "BA", "need": 10,  "xp": 150, "measure": "streak:sleep" },
    { "code": "RB", "need": 14,  "xp": 150, "measure": "streak:mobility" },
    { "code": "CN", "need": 100, "xp": 500, "measure": "perfectDays" }
  ]
}$add$::jsonb
where id = 1;

-- ── Reading the athlete's settings ────────────────────────────────────────
-- Which habits are TRACKED decides what counts as a perfect day and as a
-- three-habit day, and that lives in the config blob, not the log. Same
-- tolerance as hab_log_of: the app mirrors raw localStorage, so the value may be
-- a JSON string or already an object, and one malformed row must not break the
-- whole board.
create or replace function public.hab_cfg_of(p_data jsonb, p_athlete_id text)
returns jsonb language plpgsql immutable as $fn$
declare t text;
begin
  if p_data is null then return null; end if;
  t := p_data ->> (p_athlete_id || '_hab_cfg');
  if t is null or btrim(t) = '' then return null; end if;
  begin
    return t::jsonb;
  exception when others then
    return null;
  end;
end; $fn$;

-- ── Bonus XP over a window ────────────────────────────────────────────────
-- Mirrors bonusEvents() in habits.html. The walk always runs over the athlete's
-- WHOLE history — run lengths and cumulative counts need it — but only crossings
-- that fall inside [p_from, p_to] are paid. That is what makes a new season a
-- clean reset: the badge stays earned, the points belong to the season they were
-- crossed in.
create or replace function public.hab_bonus_xp(
  p_log jsonb, p_cfg jsonb, p_from date, p_to date, p_rules jsonb)
returns bigint language sql immutable as $fn$
with
  bonusmult as (
    select coalesce((p_rules ->> 'completionBonus')::numeric, 1.2) as cb,
           coalesce((p_rules ->> 'customXp')::numeric, 25) as cx
  ),
  -- Every dated entry in the log, tolerating junk keys and non-object values.
  dl as (
    select (e.key)::date as d, e.value as vals
    from jsonb_each(coalesce(p_log, '{}'::jsonb)) e
    where e.key ~ '^\d{4}-\d{2}-\d{2}$'
      and jsonb_typeof(e.value) = 'object'
  ),
  -- The habit set: the eight defaults plus anything the athlete added. Matches
  -- allHabits() — a paused habit keeps its history, so nothing is filtered here.
  habits as (
    select t.key as hid, t.value::numeric as tgt, b.cx as fallback
    from jsonb_each_text(coalesce(p_rules -> 'targets', '{}'::jsonb)) t, bonusmult b
    union all
    select c.value ->> 'id', 1::numeric, b.cx
    from jsonb_array_elements(coalesce(p_cfg -> 'custom', '[]'::jsonb)) c, bonusmult b
    where c.value ->> 'id' is not null
  ),
  weighted as (
    select h.hid, h.tgt,
           coalesce((p_rules -> 'weights' ->> h.hid)::numeric, h.fallback) as w
    from habits h
    where h.tgt > 0
  ),
  -- Only the habits still switched on count toward perfect / three-habit days.
  livehab as (
    select w.* from weighted w
    where coalesce(p_cfg -> 'on' ->> w.hid, 'true') <> 'false'
  ),
  -- Every (habit, day) where the target was met.
  done as (
    select w.hid, dl.d
    from dl cross join weighted w
    where jsonb_typeof(dl.vals -> w.hid) = 'number'
      and (dl.vals ->> w.hid)::numeric >= w.tgt
  ),
  -- Gaps-and-islands: d minus its row number is constant inside a run of
  -- consecutive days, so it groups each unbroken streak.
  islands as (
    select hid, d,
           d - (row_number() over (partition by hid order by d))::int as grp
    from done
  ),
  runlen as (
    select hid, d,
           (row_number() over (partition by hid, grp order by d))::int as run
    from islands
  ),
  hitno as (
    select hid, d, (row_number() over (partition by hid order by d))::int as n
    from done
  ),
  -- Per-day count of TRACKED habits completed, for the two whole-day measures.
  perday as (
    select dl.d,
           (select count(*) from livehab lh
             where jsonb_typeof(dl.vals -> lh.hid) = 'number'
               and (dl.vals ->> lh.hid)::numeric >= lh.tgt)::int as ndone
    from dl
  ),
  nlive as (select count(*)::int as n from livehab),
  with3 as (
    select d, (row_number() over (order by d))::int as n
    from perday where ndone >= 3
  ),
  perfect as (
    select p.d, (row_number() over (order by p.d))::int as n
    from perday p, nlive
    where nlive.n > 0 and p.ndone >= nlive.n
  ),
  -- ── Tier crossings ──
  tiers as (
    select (t.ord - 1)::int as idx,
           (t.val ->> 'days')::int as days,
           (t.val ->> 'mult')::numeric as mult
    from jsonb_array_elements(coalesce(p_rules -> 'tiers', '[]'::jsonb))
         with ordinality t(val, ord)
  ),
  tier_cross as (
    select rl.hid, tr.idx, tr.mult, min(rl.d) as crossed
    from runlen rl join tiers tr on rl.run >= tr.days
    group by rl.hid, tr.idx, tr.mult
  ),
  tier_paid as (
    select sum(greatest(10, round(w.w * b.cb * tc.mult / 10) * 10)) as xp
    from tier_cross tc
      join weighted w on w.hid = tc.hid
      cross join bonusmult b
    where (p_from is null or tc.crossed >= p_from)
      and (p_to   is null or tc.crossed <= p_to)
  ),
  -- ── Milestone crossings ──
  ms as (
    select m.val ->> 'code' as code,
           (m.val ->> 'need')::int as need,
           (m.val ->> 'xp')::numeric as xp,
           m.val ->> 'measure' as measure
    from jsonb_array_elements(coalesce(p_rules -> 'milestones', '[]'::jsonb)) m(val)
  ),
  ms_cross as (
    select m.code, m.xp, min(rl.d) as crossed
    from ms m join runlen rl on m.measure = 'streak:' || rl.hid and rl.run >= m.need
    group by m.code, m.xp
    union all
    select m.code, m.xp, min(hn.d)
    from ms m join hitno hn on m.measure = 'daysHit:' || hn.hid and hn.n >= m.need
    group by m.code, m.xp
    union all
    select m.code, m.xp, min(w3.d)
    from ms m join with3 w3 on m.measure = 'daysWith3' and w3.n >= m.need
    group by m.code, m.xp
    union all
    select m.code, m.xp, min(pf.d)
    from ms m join perfect pf on m.measure = 'perfectDays' and pf.n >= m.need
    group by m.code, m.xp
  ),
  ms_paid as (
    select sum(xp) as xp from ms_cross
    where (p_from is null or crossed >= p_from)
      and (p_to   is null or crossed <= p_to)
  )
select (coalesce((select xp from tier_paid), 0)
      + coalesce((select xp from ms_paid), 0))::bigint;
$fn$;

-- ── The board scores daily points PLUS badges, over a real rolling week ────
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
    -- A ROLLING seven days: today and the six before it. Never earlier than the
    -- season start, so a season opening mid-week does not leak the days before it.
    v_from := greatest(current_date - 6, coalesce(v_season_start, '1970-01-01'::date));
  else
    v_from := coalesce(v_season_start, '1970-01-01'::date);
  end if;

  select exists (select 1 from public.leaderboard_optin o where o.athlete_id = p_athlete_id)
    into v_joined;

  return query
  with scored as (
    select o.athlete_id as aid,
           o.display_name as dname,
           ( public.hab_xp(public.hab_log_of(ap.data, o.athlete_id), v_from, v_to, v_rules)
           + public.hab_bonus_xp(public.hab_log_of(ap.data, o.athlete_id),
                                 public.hab_cfg_of(ap.data, o.athlete_id),
                                 v_from, v_to, v_rules) ) as x
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

revoke all on function public.hab_bonus_xp(jsonb, jsonb, date, date, jsonb) from public;
revoke all on function public.leaderboard_top(text, text, text, int) from public;
grant execute on function public.leaderboard_top(text, text, text, int) to anon, authenticated;

commit;
