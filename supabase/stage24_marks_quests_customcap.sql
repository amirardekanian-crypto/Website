-- ═══════════════════════════════════════════════════════════════════════════
-- STAGE 24 — the custom-habit ceiling the server never had, overlapping quest
-- runs no longer double-paying, and the twelve new milestone rungs
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Three separate things, one migration, because all three are "change both
-- scorers or they disagree" and shipping them apart widens that window.
--
-- ── 1. hab_xp(): a CEILING ON UNRECOGNISED KEYS ────────────────────────────
-- Amir, 2026-08-02, on the custom-habit hole: "i dont think we can do anything
-- about this. people can lie and or create stupid habits, we can just limit
-- them, unless you have a different suggestion." There is a different
-- suggestion, and this is it.
--
-- hab_xp() pays `customXp` for EVERY key in a day it does not recognise, with
-- no cap of any kind. The client caps creation at MAX_CUSTOM = 3, but the
-- client's cap is a UI rule — the log is just JSON in a row, so a tampered or
-- hand-edited copy with fifty junk keys was paid fifty times, ~1,500 XP a day,
-- straight onto the shared leaderboard. XP_SYSTEM.md §1 said it outright:
-- "there is no server-side check".
--
-- Now there is. `maxCustom` (default 3, mirroring MAX_CUSTOM) is the most
-- unrecognised keys any single day will be paid for. This is NOT the same as
-- excluding customs from the board — an honest athlete with three custom
-- habits is paid for all three exactly as before, and sees no change at all.
-- It only removes the unbounded tail.
--
-- ⚠️ Deliberately a CEILING and not a rejection: an athlete legitimately at the
-- cap who then has the coach retune something must not lose a day's score, and
-- a day that happens to hold a stale key from a removed habit should degrade
-- by one payment rather than error.
--
-- jsonb stores object keys in a deterministic order (length, then bytewise),
-- so `jsonb_each` walks them the same way every call and "the first N" is
-- stable across runs. It does not need to match the client's choice of WHICH
-- three, because an honest log never has more than three to choose from.
--
-- ── 2. hab_bonus_xp(): overlapping quest runs are CLIPPED ──────────────────
-- set_quests() takes any start date and only replaces a run starting on the
-- same one, so announcing "new quests from today" mid-week left two runs
-- covering the same days. Both this function and the client walked every run
-- independently, so a quest id present in both paid TWICE off one stretch of
-- logging — and because both scorers did it identically, the board and the
-- phone agreed and were both wrong, which is the hardest kind of error to
-- catch here. A run's window now ends the day before the next run starts.
-- Mirrors runEndKey() in habits.html.
--
-- ── 3. The twelve new milestone rungs ──────────────────────────────────────
-- Amir, 2026-08-02: "as ive seen in call of duty you can unlock achievements
-- again but next levels of them. so like some milestones can have different
-- levels." Each rung is an ordinary independent row on the existing rail —
-- own code, own need, own xp — so no scoring machinery changes, but every one
-- has to exist HERE as well as in ACHIEVEMENTS or the board underpays.
-- The `mark` (I/II/III) is display-only and is not stored server-side.
--
-- Also: CN THE CENTURION 500 → 1,200. CLEAN SWEEP III pays 600 for thirty
-- perfect days, so a hundred of them had to outpay it by a distance.
--
-- ── ORDER ───────────────────────────────────────────────────────────────────
-- The function changes are no-ops until their keys exist (`maxCustom` absent =
-- unlimited, exactly as today; quest clipping only ever bites when runs
-- actually overlap, which none currently do). The milestone rows DO pay
-- immediately. So: apply this file, deploy the client, then write maxCustom.
--
-- SAFE TO RE-RUN.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ── 1. hab_xp with the unrecognised-key ceiling ────────────────────────────
create or replace function public.hab_xp(p_log jsonb, p_from date, p_to date, p_rules jsonb)
returns bigint language plpgsql immutable as $function$
declare
  r record; r2 record;
  d date; v numeric; tgt numeric; w numeric;
  bonus numeric := coalesce((p_rules ->> 'completionBonus')::numeric, 1.2);
  custom numeric := coalesce((p_rules ->> 'customXp')::numeric, 25);
  -- Absent => unlimited, which is the pre-stage24 behaviour exactly.
  maxcustom int := coalesce((p_rules ->> 'maxCustom')::int, 2147483647);
  ncustom int;
  total numeric := 0;
begin
  if p_log is null or jsonb_typeof(p_log) <> 'object' then return 0; end if;
  for r in select key, value from jsonb_each(p_log) loop
    if jsonb_typeof(r.value) <> 'object' then continue; end if;
    begin
      d := r.key::date;
    exception when others then
      continue;
    end;
    if p_from is not null and d < p_from then continue; end if;
    if p_to   is not null and d > p_to   then continue; end if;
    ncustom := 0;                      -- per DAY, not per log
    for r2 in select key, value from jsonb_each(r.value) loop
      if jsonb_typeof(r2.value) <> 'number' then continue; end if;
      v := (r2.value #>> '{}')::numeric;
      if v <= 0 then continue; end if;
      tgt := coalesce((p_rules -> 'targets' ->> r2.key)::numeric, 1);
      if tgt <= 0 then tgt := 1; end if;
      -- An unrecognised key is a custom habit. Count them, and stop paying
      -- past the ceiling. A key WITH a weight is a built-in and is never
      -- counted or capped here.
      if (p_rules -> 'weights' ->> r2.key) is null then
        ncustom := ncustom + 1;
        if ncustom > maxcustom then continue; end if;
        w := custom;
      else
        w := (p_rules -> 'weights' ->> r2.key)::numeric;
      end if;
      if v >= tgt then
        total := total + round(w * bonus);
      else
        total := total + round(w * (v / tgt));
      end if;
    end loop;
  end loop;
  return total::bigint;
end; $function$;

-- ── 2. hab_bonus_xp with clipped quest runs ────────────────────────────────
-- Identical to stage22 in every other respect; only the `qruns` CTE changes.
create or replace function public.hab_bonus_xp(
  p_log jsonb, p_cfg jsonb, p_season_start date, p_from date, p_to date, p_rules jsonb)
returns bigint language sql immutable as $fn$
with
  bonusmult as (
    select coalesce((p_rules ->> 'completionBonus')::numeric, 1.2) as cb,
           coalesce((p_rules ->> 'customXp')::numeric, 25) as cx,
           coalesce((p_rules ->> 'streakQualifyPct')::numeric, 80) as qpct,
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
           coalesce(sum(
             case when jsonb_typeof(dl.vals -> dv.hid) = 'number'
                        and (dl.vals ->> dv.hid)::numeric >= dv.tgt
                  then dv.w
                  when dv.lockd then 0
                  when dv.tgt > 0 and jsonb_typeof(dl.vals -> dv.hid) = 'number'
                       and (dl.vals ->> dv.hid)::numeric > 0
                  then dv.w * least((dl.vals ->> dv.hid)::numeric / dv.tgt, 1)
                  else 0 end), 0) as gpart,
           count(dv.hid) filter (
             where not (jsonb_typeof(dl.vals -> dv.hid) = 'number'
                        and (dl.vals ->> dv.hid)::numeric >= dv.tgt)
               and not dv.lockd)::int as gmiss
    from dl left join daylive dv on dv.d = dl.d
    group by dl.d, dl.vals
  ),

  qualday as (
    select p.d
    from perday p, bonusmult b
    where case when b.gate2
               then (p.glive > 0 and round(p.gpart / p.glive * 100) >= b.qpct)
                     or (p.gmiss <= 1 and p.gpart > 0)
               else p.glive > 0 and round(p.wdone / p.glive * 100) >= b.qpct
          end
  ),

  qgap as (
    select d, (d - lag(d) over (order by d) - 1) as gone from qualday
  ),
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
    union all
    select m.code, m.xp, min(cr.d) from ms m join cb_run_no cr on m.measure = 'comebackRun' and cr.n >= m.need group by m.code, m.xp
    union all
    select m.code, m.xp, min(cs.d) from ms m join cb_stuck_no cs on m.measure = 'comebacksStuck' and cs.n >= m.need group by m.code, m.xp
  ),
  ms_paid as (
    select sum(xp) as xp from ms_cross
    where (p_from is null or crossed >= p_from) and (p_to is null or crossed <= p_to)
  ),

  -- ── Quest runs, CLIPPED so two runs never score the same day ─────────────
  qruns as (
    select rstart,
           least(rstart + 6, coalesce(next_start - 1, rstart + 6)) as rend,
           ids
    from (
      select (r.val ->> 'start')::date as rstart,
             r.val -> 'ids' as ids,
             lead((r.val ->> 'start')::date) over (order by (r.val ->> 'start')::date) as next_start
      from jsonb_array_elements(coalesce(p_rules -> 'questRuns', '[]'::jsonb)) r(val)
      where r.val ->> 'start' ~ '^\d{4}-\d{2}-\d{2}$'
    ) q
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

-- ── 3. The twelve new rungs, and THE CENTURION's retune ────────────────────
-- Appended only if absent, so this file stays re-runnable.
update public.xp_rules set rules = jsonb_set(rules, '{milestones}',
    (rules -> 'milestones') || '[
      {"code":"GO", "name":"DAWN PATROL I",       "xp":40,  "need":1,   "measure":"daysWith3"},
      {"code":"HS2","name":"HUMAN SPRINKLER II",  "xp":250, "need":20,  "measure":"streak:water"},
      {"code":"FF2","name":"FULLY FUELLED II",    "xp":300, "need":25,  "measure":"daysHit:fuel"},
      {"code":"CS2","name":"CLEAN SWEEP II",      "xp":300, "need":10,  "measure":"perfectDays"},
      {"code":"ZM2","name":"ZEN MACHINE II",      "xp":280, "need":30,  "measure":"streak:breathe"},
      {"code":"DP3","name":"DAWN PATROL III",     "xp":250, "need":50,  "measure":"daysWith3"},
      {"code":"BA2","name":"BLACKOUT ARTIST II",  "xp":350, "need":30,  "measure":"streak:sleep"},
      {"code":"HM3","name":"HEAVY METAL III",     "xp":350, "need":30,  "measure":"streak:strength"},
      {"code":"RB2","name":"RUBBER BAND II",      "xp":350, "need":40,  "measure":"streak:mobility"},
      {"code":"IM2","name":"IRON MONK II",        "xp":380, "need":45,  "measure":"streak:supps"},
      {"code":"CS3","name":"CLEAN SWEEP III",     "xp":600, "need":30,  "measure":"perfectDays"},
      {"code":"SW3","name":"GROUND COVERED III",  "xp":500, "need":100, "measure":"daysHit:steps"}
    ]'::jsonb),
    updated_at = now()
where id = 1
  and not (rules -> 'milestones') @> '[{"code":"GO"}]'::jsonb;

-- THE CENTURION 500 -> 1,200. Rewrites in place rather than appending.
update public.xp_rules set rules = jsonb_set(rules, '{milestones}',
    (select jsonb_agg(case when m ->> 'code' = 'CN' then m || '{"xp":1200}'::jsonb else m end)
       from jsonb_array_elements(rules -> 'milestones') m)),
    updated_at = now()
where id = 1;

-- ── 4. Tidy: drop the fossil object still sitting at passTrack[0] ──────────
-- stage20 appended an ARRAY onto what was then an OBJECT, and Postgres wrapped
-- the object up as element 0 rather than erroring — which is what broke
-- hab_mint_titles until stage23, and what leaves this `{t_23:4, ...}` map
-- loitering in the array with no `id`. stage23's readers already filter it out
-- by `kind`; this just removes the confusion for whoever reads the row next.
update public.xp_rules set rules = jsonb_set(rules, '{passTrack}',
    (select jsonb_agg(t) from jsonb_array_elements(rules -> 'passTrack') t where t ? 'id')),
    updated_at = now()
where id = 1
  and exists (select 1 from jsonb_array_elements(rules -> 'passTrack') t where not (t ? 'id'));

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- AFTER THE CLIENT IS DEPLOYED — turn the custom ceiling on
-- ═══════════════════════════════════════════════════════════════════════════
-- update public.xp_rules set rules = rules || '{"maxCustom":3}'::jsonb where id = 1;
--
-- Check first who (if anyone) it would actually change — expect zero rows:
--   select a.athlete_id, k.day, count(*) as custom_keys_that_day
--     from public.athlete_progress a,
--          lateral jsonb_each((a.data ->> (a.athlete_id || '_hab_log'))::jsonb) k(day, vals),
--          lateral jsonb_object_keys(k.vals) hk
--    where a.data ? (a.athlete_id || '_hab_log')
--      and ((select rules -> 'weights' from public.xp_rules where id = 1) ->> hk) is null
--    group by 1,2 having count(*) > 3;
