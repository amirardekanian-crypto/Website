-- ============================================================================
--  STAGE 18 — A DAY IS SCORED AGAINST THE HABITS THAT WERE ON THAT DAY
--  Project: bvipfipbdcyqnbczjmaq (eu-west-2). Run AFTER stage1–stage17.
--  Safe to re-run: `create or replace` throughout.
--
--  THE BUG THIS FIXES
--
--  `hab_bonus_xp` decided which habits counted ONCE, from `p_cfg -> 'on'`, and
--  applied that one set to every day in the athlete's history:
--
--      livehab as (select w.* from weighted w
--                  where coalesce(p_cfg -> 'on' ->> w.hid, 'true') <> 'false'),
--      nlive   as (select count(*)::int as n from livehab),
--
--  `nlive` is the denominator for a perfect day. So the roster an athlete
--  happens to have TODAY was used to re-judge days they finished months ago,
--  and it moved in both directions:
--
--    · ADD a habit and past perfect days stop being perfect. `perfectDays` pays
--      500xp and `daysWith3` 75xp, so this DELETED XP the athlete had already
--      earned — enough to cost a level in 67 of 266 log lengths between 100 and
--      365 days (first at 105 days: level 21 → 20, which is IRONCLAD). That is
--      the measurement that forced `hab_titles` to mint rather than recompute.
--    · SWITCH one OFF and days you skipped it retroactively BECOME perfect.
--      Free XP, and possibly a free milestone, for history that never happened.
--      Nobody would ever report this one.
--
--  Base XP was never affected — `hab_xp` pays per habit per day, so a habit with
--  no history adds nothing and a paused one keeps its points. This is entirely a
--  denominator problem, and it lives in exactly three measures: perfect days,
--  days-with-3, and the two quest kinds that ask "what fraction of the day".
--
--  THE FIX
--
--  The tracked set becomes a TIMELINE carried on the athlete's own config —
--  `CFG.roster` in habits.html, one entry per change, each naming the day it
--  took effect:
--
--      [ { "from":"2026-07-26", "ids":["strength","steps","sleep"] },
--        { "from":"2026-08-01", "ids":["strength","steps","sleep","water"] } ]
--
--  A handful of entries a year, not one per day, and XP stays a pure function of
--  what is stored. It arrives here for free: `hab_cfg_of()` returns the whole
--  config blob, so `roster` rides along with `on` and `custom`.
--
--  NOBODY IS RESCORED. Two fallbacks guarantee it:
--    · no timeline at all → fall through to `p_cfg -> 'on'`, which is precisely
--      what this function did before, so an athlete who has not yet opened the
--      new build scores identically;
--    · a day older than the first entry → read the FIRST entry. The client seeds
--      its first stamp at the athlete's first logged day, so this is only
--      reachable by backfilling behind that, and reading the earliest known
--      roster beats inventing one.
--  `rosterOn()` in habits.html applies the same two rules in the same order.
-- ============================================================================

begin;

-- The whole change is the four CTEs marked below. Everything else is stage14's
-- function reproduced verbatim — the logic was confirmed byte-identical to the
-- live definition (comments stripped, whitespace collapsed) before editing, so
-- this file and the database agreed on the starting point.
create or replace function public.hab_bonus_xp(
  p_log jsonb, p_cfg jsonb, p_season_start date, p_from date, p_to date, p_rules jsonb)
returns bigint language sql immutable as $fn$
with
  bonusmult as (
    select coalesce((p_rules ->> 'completionBonus')::numeric, 1.2) as cb,
           coalesce((p_rules ->> 'customXp')::numeric, 25) as cx,
           coalesce((p_rules ->> 'streakQualifyPct')::numeric, 80) as qpct
  ),
  dl as (
    select (e.key)::date as d, e.value as vals
    from jsonb_each(coalesce(p_log, '{}'::jsonb)) e
    where e.key ~ '^\d{4}-\d{2}-\d{2}$'
      and jsonb_typeof(e.value) = 'object'
      and (p_season_start is null or (e.key)::date >= p_season_start)
  ),
  habits as (
    select t.key as hid, t.value::numeric as tgt, b.cx as fallback
    from jsonb_each_text(coalesce(p_rules -> 'targets', '{}'::jsonb)) t, bonusmult b
    union all
    select c.value ->> 'id', 1::numeric, b.cx
    from jsonb_array_elements(coalesce(p_cfg -> 'custom', '[]'::jsonb)) c, bonusmult b
    where c.value ->> 'id' is not null
  ),
  weighted as (
    select h.hid, h.tgt, coalesce((p_rules -> 'weights' ->> h.hid)::numeric, h.fallback) as w
    from habits h where h.tgt > 0
  ),

  -- ── NEW: the tracked set, dated ──────────────────────────────────────────
  -- Mirrors CFG.roster in habits.html. Junk entries are dropped rather than
  -- guessed at; if that empties the timeline, `dayroster` falls through to the
  -- old behaviour and nothing is lost.
  roster as (
    select (e.value ->> 'from')::date as from_d, e.value -> 'ids' as ids
    from jsonb_array_elements(coalesce(p_cfg -> 'roster', '[]'::jsonb)) e
    where e.value ->> 'from' ~ '^\d{4}-\d{2}-\d{2}$'
      and jsonb_typeof(e.value -> 'ids') = 'array'
  ),
  -- The entry in force on each logged day: the latest one that had started.
  -- The second coalesce arm is the "older than the timeline" case.
  dayroster as (
    select dl.d,
           coalesce(
             (select r.ids from roster r where r.from_d <= dl.d order by r.from_d desc limit 1),
             (select r.ids from roster r order by r.from_d asc limit 1)
           ) as ids
    from dl
  ),
  -- Was replaced `livehab`: the same idea, but one row per (day, habit) instead
  -- of one set for all time. `ids is null` means no usable timeline — that is
  -- the pre-stage18 path, kept exactly.
  daylive as (
    select dr.d, w.hid, w.tgt
    from dayroster dr cross join weighted w
    where case when dr.ids is null
               then coalesce(p_cfg -> 'on' ->> w.hid, 'true') <> 'false'
               else jsonb_exists(dr.ids, w.hid) end
  ),
  -- ─────────────────────────────────────────────────────────────────────────

  done as (
    select w.hid, dl.d from dl cross join weighted w
    where jsonb_typeof(dl.vals -> w.hid) = 'number' and (dl.vals ->> w.hid)::numeric >= w.tgt
  ),
  islands as (
    select hid, d, d - (row_number() over (partition by hid order by d))::int as grp from done
  ),
  runlen as (
    select hid, d, (row_number() over (partition by hid, grp order by d))::int as run from islands
  ),
  hitno as (
    select hid, d, (row_number() over (partition by hid order by d))::int as n from done
  ),
  -- NEW: `nlive` is now a COLUMN, carried per day, not a scalar for all time.
  -- One pass rather than the old pair of correlated subqueries.
  perday as (
    select dl.d, dl.vals,
           count(dv.hid) filter (
             where jsonb_typeof(dl.vals -> dv.hid) = 'number'
               and (dl.vals ->> dv.hid)::numeric >= dv.tgt)::int as ndone,
           count(dv.hid)::int as nlive
    from dl left join daylive dv on dv.d = dl.d
    group by dl.d, dl.vals
  ),
  with3 as (select d, (row_number() over (order by d))::int as n from perday where ndone >= 3),
  -- NEW: per-day denominator.
  perfect as (
    select p.d, (row_number() over (order by p.d))::int as n
    from perday p where p.nlive > 0 and p.ndone >= p.nlive
  ),
  tiers as (
    select (t.ord - 1)::int as idx, (t.val ->> 'days')::int as days, (t.val ->> 'mult')::numeric as mult
    from jsonb_array_elements(coalesce(p_rules -> 'tiers', '[]'::jsonb)) with ordinality t(val, ord)
  ),
  tier_cross as (
    select rl.hid, tr.idx, tr.mult, min(rl.d) as crossed
    from runlen rl join tiers tr on rl.run >= tr.days group by rl.hid, tr.idx, tr.mult
  ),
  tier_paid as (
    select sum(greatest(10, round(w.w * b.cb * tc.mult / 10) * 10)) as xp
    from tier_cross tc join weighted w on w.hid = tc.hid cross join bonusmult b
    where (p_from is null or tc.crossed >= p_from) and (p_to is null or tc.crossed <= p_to)
  ),
  ms as (
    select m.val ->> 'code' as code, (m.val ->> 'need')::int as need,
           (m.val ->> 'xp')::numeric as xp, m.val ->> 'measure' as measure
    from jsonb_array_elements(coalesce(p_rules -> 'milestones', '[]'::jsonb)) m(val)
  ),
  ms_cross as (
    select m.code, m.xp, min(rl.d) as crossed
    from ms m join runlen rl on m.measure = 'streak:' || rl.hid and rl.run >= m.need group by m.code, m.xp
    union all
    select m.code, m.xp, min(hn.d) from ms m join hitno hn on m.measure = 'daysHit:' || hn.hid and hn.n >= m.need group by m.code, m.xp
    union all
    select m.code, m.xp, min(w3.d) from ms m join with3 w3 on m.measure = 'daysWith3' and w3.n >= m.need group by m.code, m.xp
    union all
    select m.code, m.xp, min(pf.d) from ms m join perfect pf on m.measure = 'perfectDays' and pf.n >= m.need group by m.code, m.xp
  ),
  ms_paid as (
    select sum(xp) as xp from ms_cross
    where (p_from is null or crossed >= p_from) and (p_to is null or crossed <= p_to)
  ),

  -- ── Quest runs ──
  qruns as (
    select (r.val ->> 'start')::date as rstart,
           ((r.val ->> 'start')::date + 6) as rend,
           r.val -> 'ids' as ids
    from jsonb_array_elements(coalesce(p_rules -> 'questRuns', '[]'::jsonb)) r(val)
    where r.val ->> 'start' ~ '^\d{4}-\d{2}-\d{2}$'
  ),
  rq as (
    select qr.rstart, qr.rend, pq.val as quest
    from qruns qr
    cross join lateral jsonb_array_elements(coalesce(qr.ids, '[]'::jsonb)) i(val)
    join lateral (
      select p.val from jsonb_array_elements(coalesce(p_rules -> 'quests', '[]'::jsonb)) p(val)
      where p.val ->> 'id' = i.val #>> '{}'
    ) pq on true
  ),
  dh as (
    select qr.rstart, dn.hid, dn.d,
           (row_number() over (partition by qr.rstart, dn.hid order by dn.d))::int as n
    from qruns qr join done dn on dn.d between qr.rstart and qr.rend
  ),
  tot as (
    select qr.rstart, w.hid, dl.d,
           sum(case when jsonb_typeof(dl.vals -> w.hid) = 'number'
                    then (dl.vals ->> w.hid)::numeric else 0 end)
             over (partition by qr.rstart, w.hid order by dl.d) as acc
    from qruns qr join dl on dl.d between qr.rstart and qr.rend cross join weighted w
  ),
  -- NEW: both quest kinds that ask "what fraction of the day" now ask it of the
  -- roster that day had. A `qualify` quest run before an athlete added a habit
  -- keeps paying exactly what it paid.
  qd as (
    select qr.rstart, p.d,
           (row_number() over (partition by qr.rstart order by p.d))::int as n
    from qruns qr join perday p on p.d between qr.rstart and qr.rend, bonusmult b
    where p.nlive > 0 and round(p.ndone::numeric / p.nlive * 100) >= b.qpct
  ),
  pfw as (
    select qr.rstart, p.d,
           (row_number() over (partition by qr.rstart order by p.d))::int as n
    from qruns qr join perday p on p.d between qr.rstart and qr.rend
    where p.nlive > 0 and p.ndone >= p.nlive
  ),
  quest_cross as (
    select rq.rstart, rq.quest ->> 'id' as qid, (rq.quest ->> 'xp')::numeric as xp, min(dh.d) as crossed
    from rq join dh on dh.rstart = rq.rstart
      and rq.quest ->> 'kind' = 'daysHit:' || dh.hid and dh.n >= (rq.quest ->> 'need')::int
    group by 1,2,3
    union all
    select rq.rstart, rq.quest ->> 'id', (rq.quest ->> 'xp')::numeric, min(tot.d)
    from rq join tot on tot.rstart = rq.rstart
      and rq.quest ->> 'kind' = 'total:' || tot.hid and tot.acc >= (rq.quest ->> 'need')::numeric
    group by 1,2,3
    union all
    select rq.rstart, rq.quest ->> 'id', (rq.quest ->> 'xp')::numeric, min(qd.d)
    from rq join qd on qd.rstart = rq.rstart
      and rq.quest ->> 'kind' = 'qualify' and qd.n >= (rq.quest ->> 'need')::int
    group by 1,2,3
    union all
    select rq.rstart, rq.quest ->> 'id', (rq.quest ->> 'xp')::numeric, min(pfw.d)
    from rq join pfw on pfw.rstart = rq.rstart
      and rq.quest ->> 'kind' = 'perfect' and pfw.n >= (rq.quest ->> 'need')::int
    group by 1,2,3
  ),
  quest_paid as (
    select sum(xp) as xp from quest_cross
    where (p_from is null or crossed >= p_from) and (p_to is null or crossed <= p_to)
  )
select (coalesce((select xp from tier_paid), 0)
      + coalesce((select xp from ms_paid), 0)
      + coalesce((select xp from quest_paid), 0))::bigint;
$fn$;

revoke all on function public.hab_bonus_xp(jsonb, jsonb, date, date, date, jsonb) from public;

commit;

-- ── Proving it ────────────────────────────────────────────────────────────
-- The one thing that had to be true on the day this shipped: every athlete
-- scores exactly what they scored before. Run before and after, compare:
--
--   select o.athlete_id,
--          public.hab_bonus_xp(public.hab_log_of(ap.data, o.athlete_id),
--                              public.hab_cfg_of(ap.data, o.athlete_id),
--                              s.starts_on, s.starts_on, current_date, r.rules) as bonus
--   from public.leaderboard_optin o
--   left join public.athlete_progress ap on ap.athlete_id = o.athlete_id,
--        public.current_season() s, public.xp_rules r
--   where r.id = 1 order by 1;
--
-- And the case Amir asked for — five habits, five clean days, a sixth habit
-- added on day six. Days 1–5 keep their perfect days; only day 6 answers to the
-- new roster:
--
--   select public.hab_bonus_xp(
--     '{"2026-07-01":{"steps":10000,"sleep":7.5,"water":8,"fuel":3,"mobility":10}}'::jsonb
--     , '{"on":{},"roster":[{"from":"2026-07-01","ids":["steps","sleep","water","fuel","mobility"]}]}'::jsonb
--     , '2026-07-01', '2026-07-01', current_date, (select rules from public.xp_rules where id=1));
