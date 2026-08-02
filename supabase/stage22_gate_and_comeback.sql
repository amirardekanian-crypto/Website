-- ═══════════════════════════════════════════════════════════════════════════
-- STAGE 22 — the forgiving gate, and paying for the comeback
--
-- The server half of two changes made in habits.html on 2026-08-02. Both move
-- real XP, so until this file is applied the LEADERBOARD AND THE PHONE WILL
-- DISAGREE — the worst class of bug in this app, because nothing errors.
--
-- ── 1. THE GATE, on the roster people actually have ────────────────────────
-- stage19 tuned `streakQualifyPct: 75` against the EIGHT-habit roster: gate
-- denominator 250, worst single miss steps at 190/250 = 76%, just clear, and
-- the promise written beside it was "miss any one thing and the day still
-- counts". But defaultCfg() starts every add-on OFF, so the shipped default is
-- the five core habits and the gate denominator is 180. On that roster:
--
--     miss steps (60)   120/180 = 67%   FAILED
--     miss sleep (50)   130/180 = 72%   FAILED
--     miss fuel  (40)   140/180 = 78%   ok
--     miss water (30)   150/180 = 83%   ok
--
-- So the athletes the gate exists to protect were the only ones it did not
-- cover, while a veteran with three add-ons on got the forgiving version — and
-- since padding the denominator softens the gate, opting into the cheapest
-- self-reported habits was literally streak insurance. Backwards twice over.
--
-- Two fixes, both mirroring habits.html exactly:
--   a) PRO-RATA COUNTERS in the gate. It was all-or-nothing per habit, so 9,500
--      of 10,000 steps counted as zero and a 95%-effort day could read as a
--      dead streak. The SCORE half (`wdone`) stays binary — it answers "what
--      was the day worth", and a target you did not hit is one you did not hit.
--   b) A SECOND DOOR: clear qpct of the weight, OR leave at most one thing
--      undone. `gpart > 0` stops a one-habit roster qualifying on an empty day.
--
-- ── 2. THE COMEBACK ────────────────────────────────────────────────────────
-- Every continuation moment was priced; the RETURN AFTER A LAPSE paid nothing.
-- Now: the first qualifying day after `lapseDays` (3) consecutive
-- non-qualifying ones pays a flat `comebackXp` (50), dated on the day it
-- happens so the season and both leaderboard windows filter it for free.
--
-- It cannot be farmed, and that is arithmetic rather than a rule: three
-- non-qualifying days forfeit roughly 750 XP of ordinary habit XP to collect
-- 50. So it stays repeatable, which it must be — the fourth return matters as
-- much as the first.
--
-- ⚠️ A COMEBACK NEEDS A PREVIOUS QUALIFYING DAY. You cannot come back from
-- somewhere you have never been, so the very first qualifying day of an
-- athlete's history is a start, not a return. That is exactly what `lag()`
-- gives us below, and habits.html's `everQualified` flag mirrors it.
--
-- Two new milestone measures ride the same rail:
--   comebackRun     — the longest run of qualifying days held after any single
--                     comeback (BACK IN THE FIGHT 7, THE LONG ROAD BACK 21)
--   comebacksStuck  — how many comebacks were held for `comebackStick` (7) days
--                     or more (HARD TO KILL 3, UNSINKABLE 5)
--
-- ── NEW RULES KEYS (all optional, all defaulted to the OLD behaviour) ───────
--   lapseDays      int, default 3      0 disables comebacks entirely
--   comebackXp     numeric, default 0  ⚠️ DEFAULT 0 — applying this file alone
--                                      pays nothing new. See the order below.
--   comebackStick  int, default 7
--   gateV2         bool, default false ⚠️ the gate change is OFF until set
--
-- Applying this file is therefore a NO-OP on scores. Both behaviours switch on
-- only when the keys are written, which is what makes the rollout safe:
--
--   1. Apply this file.                          (no-op)
--   2. Deploy habits.html.                       (client now uses the new rules)
--   3. Turn both on in one statement:
--
--        update public.xp_rules set rules = rules
--          || '{"gateV2":true,"lapseDays":3,"comebackXp":50,"comebackStick":7}'::jsonb
--        where id = 1;
--
--   4. Add the four new milestones and the BACKBONE title — see the block at
--      the bottom of this file. ⚠️ `t_unbowed` MUST be in `passTrack` or the
--      server refuses to mint the title the app has already awarded.
--
-- Between 2 and 3 the phone is forgiving and the board is not, so keep that
-- window short. Doing 3 before 2 is the wrong way round for the same reason.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create or replace function public.hab_bonus_xp(
  p_log jsonb, p_cfg jsonb, p_season_start date, p_from date, p_to date, p_rules jsonb)
returns bigint language sql immutable as $fn$
with
  bonusmult as (
    select coalesce((p_rules ->> 'completionBonus')::numeric, 1.2) as cb,
           coalesce((p_rules ->> 'customXp')::numeric, 25) as cx,
           coalesce((p_rules ->> 'streakQualifyPct')::numeric, 80) as qpct,
           -- Stage 22. Every one of these defaults to the pre-stage22 behaviour.
           coalesce((p_rules ->> 'gateV2')::boolean, false) as gate2,
           coalesce((p_rules ->> 'lapseDays')::int, 3) as lapse,
           coalesce((p_rules ->> 'comebackXp')::numeric, 0) as cbxp,
           coalesce((p_rules ->> 'comebackStick')::int, 7) as stick
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
    select h.hid, h.tgt,
           coalesce((p_rules -> 'weights' ->> h.hid)::numeric, h.fallback) as w
    from habits h
  ),
  dayroster as (
    select dl.d,
           (select r.value -> 'ids'
              from jsonb_array_elements(coalesce(p_cfg -> 'roster', '[]'::jsonb)) r(value)
             where (r.value ->> 'from')::date <= dl.d
             order by (r.value ->> 'from')::date desc limit 1) as ids
    from dl
  ),
  daylive as (
    select dr.d, w.hid, w.tgt, w.w,
           jsonb_exists(coalesce(p_rules -> 'unearnable', '[]'::jsonb), w.hid) as lockd
    from dayroster dr cross join weighted w
    where case when dr.ids is null
               then coalesce(p_cfg -> 'on' ->> w.hid, 'true') <> 'false'
               else jsonb_exists(dr.ids, w.hid) end
  ),

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
  perday as (
    select dl.d, dl.vals,
           count(dv.hid) filter (
             where jsonb_typeof(dl.vals -> dv.hid) = 'number'
               and (dl.vals ->> dv.hid)::numeric >= dv.tgt)::int as ndone,
           count(dv.hid)::int as nlive,
           coalesce(sum(dv.w) filter (
             where jsonb_typeof(dl.vals -> dv.hid) = 'number'
               and (dl.vals ->> dv.hid)::numeric >= dv.tgt), 0) as wdone,
           coalesce(sum(dv.w) filter (
             where (jsonb_typeof(dl.vals -> dv.hid) = 'number'
                    and (dl.vals ->> dv.hid)::numeric >= dv.tgt)
                or not dv.lockd), 0) as glive,
           -- STAGE 22 (a): the gate's numerator with PART CREDIT on counters.
           -- least(v/tgt, 1) * w for anything in the gate scope, so 9,500 of
           -- 10,000 steps is 0.95 of the steps weight instead of nothing.
           -- Mirrors the `mode === 'gate'` branch of dayParts() in habits.html.
           coalesce(sum(
             case when jsonb_typeof(dl.vals -> dv.hid) = 'number'
                        and (dl.vals ->> dv.hid)::numeric >= dv.tgt
                  then dv.w
                  when dv.lockd then 0                       -- unearned lock: out of both halves
                  when dv.tgt > 0 and jsonb_typeof(dl.vals -> dv.hid) = 'number'
                       and (dl.vals ->> dv.hid)::numeric > 0
                  then dv.w * least((dl.vals ->> dv.hid)::numeric / dv.tgt, 1)
                  else 0 end), 0) as gpart,
           -- STAGE 22 (b): how many habits in the GATE scope are incomplete.
           count(dv.hid) filter (
             where not (jsonb_typeof(dl.vals -> dv.hid) = 'number'
                        and (dl.vals ->> dv.hid)::numeric >= dv.tgt)
               and not dv.lockd)::int as gmiss
    from dl left join daylive dv on dv.d = dl.d
    group by dl.d, dl.vals
  ),

  -- ── STAGE 22: one definition of "this day counted", used by the qualify
  -- quest AND by the comeback walk. Mirrors dayQualifies() in habits.html.
  -- With gateV2 off this is exactly the stage19 test.
  qualday as (
    select p.d
    from perday p, bonusmult b
    where case when b.gate2
               then (p.glive > 0 and round(p.gpart / p.glive * 100) >= b.qpct)
                     or (p.gmiss <= 1 and p.gpart > 0)
               else p.glive > 0 and round(p.wdone / p.glive * 100) >= b.qpct
          end
  ),

  -- ── STAGE 22: comebacks ────────────────────────────────────────────────
  -- `gone` is the number of non-qualifying days immediately before this
  -- qualifying one. lag() is null on the athlete's FIRST qualifying day, so
  -- that day can never be a comeback — you cannot return somewhere you have
  -- never been. habits.html's `everQualified` flag is the same rule.
  qgap as (
    select d, (d - lag(d) over (order by d) - 1) as gone from qualday
  ),
  -- Island grouping over qualifying days gives the run held afterwards: a
  -- comeback day always starts an island, because the day before it did not
  -- qualify.
  qisl as (
    select d, d - (row_number() over (order by d))::int as grp from qualday
  ),
  qrun as (
    select grp, min(d) as startd, count(*)::int as runlen from qisl group by grp
  ),
  comeback as (
    select g.d, g.gone, r.runlen
    from qgap g join qrun r on r.startd = g.d, bonusmult b
    where b.lapse > 0 and g.gone >= b.lapse
  ),
  comeback_paid as (
    select sum(b.cbxp) as xp
    from comeback c, bonusmult b
    where (p_from is null or c.d >= p_from) and (p_to is null or c.d <= p_to)
  ),
  -- Progress on the two comeback measures, as of each day, so the milestones
  -- below are dated on the day they were actually crossed like everything else.
  cb_run_at as (
    select c.d + i as d, i + 1 as run
    from comeback c, generate_series(0, c.runlen - 1) as i
  ),
  cb_run_no as (
    select d, max(run) over (order by d) as n from cb_run_at
  ),
  cb_stuck_no as (
    select c.d + (b.stick - 1) as d,
           (row_number() over (order by c.d))::int as n
    from comeback c, bonusmult b
    where c.runlen >= b.stick
  ),

  with3 as (select d, (row_number() over (order by d))::int as n from perday where ndone >= 3),
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
    -- STAGE 22: the two comeback measures.
    union all
    select m.code, m.xp, min(cr.d) from ms m join cb_run_no cr on m.measure = 'comebackRun' and cr.n >= m.need group by m.code, m.xp
    union all
    select m.code, m.xp, min(cs.d) from ms m join cb_stuck_no cs on m.measure = 'comebacksStuck' and cs.n >= m.need group by m.code, m.xp
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
    join jsonb_array_elements(coalesce(p_rules -> 'quests', '[]'::jsonb)) pq(val)
      on jsonb_exists(qr.ids, pq.val ->> 'id')
  ),
  dh as (
    select qr.rstart, w.hid, dl.d,
           (row_number() over (partition by qr.rstart, w.hid order by dl.d))::int as n
    from qruns qr join dl on dl.d between qr.rstart and qr.rend cross join weighted w
    where jsonb_typeof(dl.vals -> w.hid) = 'number' and (dl.vals ->> w.hid)::numeric >= w.tgt
  ),
  tot as (
    select qr.rstart, w.hid, dl.d,
           sum(case when jsonb_typeof(dl.vals -> w.hid) = 'number'
                    then (dl.vals ->> w.hid)::numeric else 0 end)
             over (partition by qr.rstart, w.hid order by dl.d) as acc
    from qruns qr join dl on dl.d between qr.rstart and qr.rend cross join weighted w
  ),
  -- STAGE 22: reads the shared `qualday` definition rather than re-testing.
  qd as (
    select qr.rstart, q.d,
           (row_number() over (partition by qr.rstart order by q.d))::int as n
    from qruns qr join qualday q on q.d between qr.rstart and qr.rend
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
      + coalesce((select xp from quest_paid), 0)
      + coalesce((select xp from comeback_paid), 0))::bigint;
$fn$;

revoke all on function public.hab_bonus_xp(jsonb, jsonb, date, date, date, jsonb) from public, anon, authenticated;

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 3 — switch both behaviours on (run AFTER habits.html is deployed)
-- ═══════════════════════════════════════════════════════════════════════════
-- update public.xp_rules set rules = rules
--   || '{"gateV2":true,"lapseDays":3,"comebackXp":50,"comebackStick":7}'::jsonb
-- where id = 1;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 4 — the four new milestones, and the BACKBONE event title
-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️ These must match ACHIEVEMENTS in habits.html EXACTLY — code, need, xp and
-- measure — or the board pays a different number to the phone.
--
-- update public.xp_rules set rules = jsonb_set(
--   rules, '{milestones}',
--   (rules -> 'milestones') || '[
--     {"code":"BF","name":"BACK IN THE FIGHT","xp":200,"need":7,"measure":"comebackRun"},
--     {"code":"LR","name":"THE LONG ROAD BACK","xp":400,"need":21,"measure":"comebackRun"},
--     {"code":"HK","name":"HARD TO KILL","xp":300,"need":3,"measure":"comebacksStuck"},
--     {"code":"US","name":"UNSINKABLE","xp":600,"need":5,"measure":"comebacksStuck"}
--   ]'::jsonb)
-- where id = 1;
--
-- ⚠️ WITHOUT THIS the server REFUSES to mint UNBOWED and the athlete keeps a
-- title on their phone that never reaches the board or the wall.
--
-- update public.xp_rules set rules = jsonb_set(
--   rules, '{passTrack}',
--   (rules -> 'passTrack') || '[{"kind":"title","id":"t_unbowed","name":"UNBOWED"}]'::jsonb)
-- where id = 1;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFY — run these after step 3 and compare against the athlete's own screen
-- ═══════════════════════════════════════════════════════════════════════════
-- Nothing changed yet? (before step 3 this must return two identical numbers)
--   with base as (select rules from public.xp_rules where id = 1),
--        a as (select data from public.athlete_progress where athlete_id = '<id>')
--   select public.hab_bonus_xp(
--            (select (data ->> '<id>_hab_log')::jsonb from a),
--            (select (data ->> '<id>_hab_cfg')::jsonb from a),
--            (select starts_on from public.seasons order by starts_on desc limit 1),
--            null, null, (select rules from base)) as with_stage22,
--          public.hab_bonus_xp(
--            (select (data ->> '<id>_hab_log')::jsonb from a),
--            (select (data ->> '<id>_hab_cfg')::jsonb from a),
--            (select starts_on from public.seasons order by starts_on desc limit 1),
--            null, null,
--            (select rules - 'gateV2' - 'comebackXp' from base)) as without_stage22;
--
-- After step 3, the athlete's total on the leaderboard must equal the total on
-- their own Progress screen. If it does not, STOP and reconcile before telling
-- anyone their score moved — a board that disagrees with the phone is worse
-- than a board that is out of date.
