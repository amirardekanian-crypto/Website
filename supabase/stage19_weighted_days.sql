-- ═══════════════════════════════════════════════════════════════════════════
-- STAGE 19 — the day score is WEIGHTED, and the streak gate is separate
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WHAT CHANGED, IN ONE LINE: a day used to be scored by counting habits, so a
-- supplement and a training session were the same day's work. It is scored by
-- WEIGHT now, exactly as XP always has been.
--
-- This is the server half. The client half is dayParts() in habits.html, and
-- the two must agree — see CLAUDE.md, "Everything in Proof that is scored TWICE".
--
-- ── Why there are two fractions and not one ────────────────────────────────
-- WORKOUT is 100 of 350 — 28.6% of the default day — against a threshold that
-- allows 25% of slack. Weight it straight into the denominator and it stops
-- being a weight and becomes a PRECONDITION: a rest day tops out at 250/350 =
-- 71% and can never qualify, so a 4x/week athlete's streak dies every rest day.
-- Worse, a free-tier athlete's WORKOUT is locked permanently — their ceiling is
-- 71% for life and they would never have a qualifying day again, while
-- proof.html promises them in Amir's own voice that only the PERFECT day is out
-- of reach.
--
-- So the gate (`wdone / glive`) drops an unearnable habit the athlete did not
-- earn that day from BOTH halves of the fraction. A rest day with the other
-- seven done is 250/250 = 100%. Earning the session can then only ever help:
-- it re-enters the denominator already complete.
--
-- ── What is deliberately NOT touched ───────────────────────────────────────
--   `ndone` / `nlive`  — still head counts, because:
--   `with3`   -> daysWith3  (DP, 75xp)   is "3 or more habits", a count.
--   `perfect` -> perfectDays (CN, 500xp) is ndone >= nlive, all of them.
-- Tidying those onto the weighted columns would silently redefine two paying
-- milestones. `done`, `runlen`, `hitno` and every tier CTE are untouched too.
--
-- ── The signature does NOT change ──────────────────────────────────────────
-- (jsonb, jsonb, date, date, date, jsonb), exactly as stage18. A 7th parameter
-- would create an OVERLOAD, and all four callers — leaderboard_top, roll_call
-- and hab_season_level in stage17_titles.sql — would keep silently resolving to
-- the old one. That is the 5-arg/6-arg trap stage12's header documents. Every
-- new tunable arrives through p_rules; here that is the `unearnable` key.
--
-- ── Why applying this is a no-op today ─────────────────────────────────────
-- The day fraction reaches XP through exactly ONE path: the `qualify` quest
-- kind, in the `qd` CTE. Verified against the live row before writing this: the
-- only quest run in the app's history is 2026-07-27 [w_supps7, w_sleep5], and
-- BOTH are `daysHit:` kind. No `qualify` quest has ever run, so `qd` has paid
-- 0 XP ever and re-judging it rescores nothing. Re-run the proof below before
-- applying. The window shuts the moment a `qualify` quest is started.
--
-- Applying this file alone changes NOTHING even so: `unearnable` is absent from
-- the rules row until the client ships, and without it `lockd` is false for
-- every habit, so `glive` equals the full weighted denominator. That is what
-- lets the SQL go first.
--
-- ── DEPLOY ORDER (matters) ─────────────────────────────────────────────────
--   1. Apply this file.                     (no-op: `unearnable` not set yet)
--   2. Merge habits.html to main, confirm Pages deployed, hard-refresh.
--   3. THEN, in one statement:
--        update public.xp_rules set rules = rules
--          || '{"unearnable":["strength"],"streakQualifyPct":75}'::jsonb,
--            updated_at = now() where id = 1;
-- Reverse 2 and 3 and the board and the phone disagree with nothing erroring.
--
-- ── streakQualifyPct 80 -> 75 ──────────────────────────────────────────────
-- The gate's denominator on a rest day is the seven daily habits (250), so the
-- worst single miss is steps at 190/250 = 76%. At 80 that fails and steps
-- quietly becomes a second precondition alongside the session. At 75 the old
-- promise — "miss any one thing and the day still counts" — survives on every
-- roster on the board. No athlete's streak gets shorter; some get longer.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

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
    select dr.d, w.hid, w.tgt, w.w,
           -- The server has no `locked` flag: p_rules carries targets and
           -- weights only. The list arrives as its own rules key, mirroring
           -- `h.locked` in habits.html. Absent => nothing is unearnable, which
           -- is the pre-stage19 behaviour exactly.
           jsonb_exists(coalesce(p_rules -> 'unearnable', '[]'::jsonb), w.hid) as lockd
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
           count(dv.hid)::int as nlive,
           -- ⚠️ coalesce is load-bearing: count() over an empty LEFT JOIN group
           -- returns 0, but sum() returns NULL, and round(NULL/NULL*100) would
           -- vanish with no error at all.
           coalesce(sum(dv.w) filter (
             where jsonb_typeof(dl.vals -> dv.hid) = 'number'
               and (dl.vals ->> dv.hid)::numeric >= dv.tgt), 0) as wdone,
           -- The GATE denominator: an unearnable habit the athlete did not earn
           -- that day is not in it, because they could not tick it. Earn it and
           -- it re-enters both halves at once. Mirrors dayParts(k,'gate').
           coalesce(sum(dv.w) filter (
             where (jsonb_typeof(dl.vals -> dv.hid) = 'number'
                    and (dl.vals ->> dv.hid)::numeric >= dv.tgt)
                or not dv.lockd), 0) as glive
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
    where p.glive > 0 and round(p.wdone / p.glive * 100) >= b.qpct
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

revoke all on function public.hab_bonus_xp(jsonb, jsonb, date, date, date, jsonb) from public, anon, authenticated;

commit;

-- ── PROOF ──────────────────────────────────────────────────────────────────
-- Run BEFORE applying (must return 0 rows) — is any `qualify` quest live?
--
--   select run ->> 'start', run -> 'ids'
--   from public.xp_rules r, jsonb_array_elements(r.rules -> 'questRuns') run,
--        jsonb_array_elements_text(run -> 'ids') qid
--   where r.id = 1
--     and exists (select 1 from jsonb_array_elements(r.rules -> 'quests') p
--                  where p.value ->> 'id' = qid and p.value ->> 'kind' = 'qualify');
--
-- Run AFTER applying — a rest day on the default roster. Under stage18 this
-- scored 250/350 = 71%; under stage19 with `unearnable` set it is 250/250 =
-- 100%, and with the key absent it is still 71%. Both arms proven in one go:
--
--   with cfg as (select '{"roster":[{"from":"2026-07-26","ids":
--          ["breathe","fuel","mobility","sleep","steps","strength","supps","water"]}]}'::jsonb c),
--        lg  as (select '{"2026-07-27":{"steps":10000,"sleep":8,"fuel":3,
--          "water":8,"mobility":1,"breathe":1,"supps":1}}'::jsonb l),
--        base as (select rules from public.xp_rules where id = 1)
--   select public.hab_bonus_xp(lg.l, cfg.c, '2026-07-26', null, null,
--            (select rules from base)) as with_key,
--          public.hab_bonus_xp(lg.l, cfg.c, '2026-07-26', null, null,
--            (select rules - 'unearnable' from base)) as without_key
--   from cfg, lg;
