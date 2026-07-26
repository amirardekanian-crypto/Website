-- ═══════════════════════════════════════════════════════════════════════════
-- STAGE 13 — weekly quests
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Three quests a week, Monday to Sunday, worth real XP. They give the week a
-- shape instead of it being seven identical days, and they are the one part of
-- the system the COACH sets rather than the athlete earning it passively.
--
-- Like tiers and milestones, a quest is paid ON THE DAY IT COMPLETES, so the
-- season rule and both leaderboard windows filter it with no special cases and
-- nothing new is stored.
--
-- Which three are live for a week is DERIVED, never stored: either an explicit
-- prescription in `questWeeks`, or a deterministic pick from `quests` seeded on
-- that week's Monday. `habits.html` runs the identical rule (questsForWeek()),
-- including the same string hash, so the two always land on the same three.
--
-- ⚠️ `QUEST_POOL` in habits.html is the offline fallback for this pool and must
--    be kept in step — see XP_SYSTEM.md §8.5 and §8.
--
-- PRESCRIBING A WEEK (coach only):
--   select public.set_quests('2026-07-27', array['w_water5','w_steps50k','w_perfect2']);
--
-- Applied and live. Safe to re-run.

begin;

-- ── Pool, week overrides, and the qualify threshold the app uses ──────────
update public.xp_rules
set rules = rules || $add${
  "questsPerWeek": 3,
  "streakQualifyPct": 80,
  "quests": [
    { "id":"w_water5",   "title":"THE WELL RUNS DEEP", "note":"Full water on 5 days",          "kind":"daysHit:water",    "need":5,     "xp":150 },
    { "id":"w_water7",   "title":"SEVEN FOR SEVEN",    "note":"Full water every single day",   "kind":"daysHit:water",    "need":7,     "xp":220 },
    { "id":"w_steps50k", "title":"FIFTY THOUSAND",     "note":"50,000 steps across the week",  "kind":"total:steps",      "need":50000, "xp":200 },
    { "id":"w_steps70k", "title":"THE LONG WAY ROUND", "note":"70,000 steps across the week",  "kind":"total:steps",      "need":70000, "xp":280 },
    { "id":"w_sleep5",   "title":"LIGHTS OUT",         "note":"Hit your sleep target 5 nights","kind":"daysHit:sleep",    "need":5,     "xp":180 },
    { "id":"w_mob4",     "title":"OILED HINGES",       "note":"Mobility on 4 days",            "kind":"daysHit:mobility", "need":4,     "xp":120 },
    { "id":"w_breathe4", "title":"DEAD CALM",          "note":"Breathe on 4 days",             "kind":"daysHit:breathe",  "need":4,     "xp":100 },
    { "id":"w_supps7",   "title":"NO NEGOTIATION",     "note":"Supplements every day",         "kind":"daysHit:supps",    "need":7,     "xp":140 },
    { "id":"w_fuel5",    "title":"ON THE RECORD",      "note":"Log your meals on 5 days",      "kind":"daysHit:fuel",     "need":5,     "xp":140 },
    { "id":"w_train3",   "title":"THREE HARD DAYS",    "note":"Three sessions in the week",    "kind":"daysHit:strength", "need":3,     "xp":250 },
    { "id":"w_qualify5", "title":"FIVE ON TARGET",     "note":"5 days at 80% or better",       "kind":"qualify",          "need":5,     "xp":220 },
    { "id":"w_perfect2", "title":"TWICE PERFECT",      "note":"Two clean sweeps",              "kind":"perfect",          "need":2,     "xp":300 }
  ],
  "questWeeks": {}
}$add$::jsonb
where id = 1;

-- ── Athletes read the definitions through here ────────────────────────────
-- xp_rules is coach-only, so this is the key-checked door onto the pool.
create or replace function public.get_quests(p_athlete_id text, p_key text default null)
returns table (pool jsonb, weeks jsonb, per_week int)
language plpgsql security definer set search_path = public as $fn$
declare v_expected text; v_rules jsonb;
begin
  select secret_key into v_expected from public.athlete_keys where athlete_id = p_athlete_id;
  if v_expected is not null and (p_key is distinct from v_expected) then
    raise exception 'invalid athlete key';
  end if;
  select rules into v_rules from public.xp_rules where id = 1;
  if v_rules is null then return; end if;
  return query select coalesce(v_rules -> 'quests', '[]'::jsonb),
                      coalesce(v_rules -> 'questWeeks', '{}'::jsonb),
                      coalesce((v_rules ->> 'questsPerWeek')::int, 3);
end; $fn$;
revoke all on function public.get_quests(text, text) from public;
grant execute on function public.get_quests(text, text) to anon, authenticated;

-- ── Prescribing a week (coach only) ───────────────────────────────────────
-- Any day inside the target week works; it is normalised to the Monday.
create or replace function public.set_quests(p_week date, p_ids text[])
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v_key text; v_new jsonb;
begin
  if (auth.jwt() ->> 'email') is distinct from 'amirardekanian@gmail.com' then
    raise exception 'coach only';
  end if;
  v_key := to_char(date_trunc('week', p_week)::date, 'YYYY-MM-DD');
  v_new := jsonb_build_object(v_key, to_jsonb(p_ids));
  update public.xp_rules
    set rules = jsonb_set(rules, '{questWeeks}',
                          coalesce(rules -> 'questWeeks', '{}'::jsonb) || v_new),
        updated_at = now()
  where id = 1;
  return v_new;
end; $fn$;
revoke all on function public.set_quests(date, text[]) from public;
grant execute on function public.set_quests(date, text[]) to authenticated;

-- ── The app's string hash, so both sides pick the same quests ─────────────
-- h = (h * 31 + charCode) mod 2147483647. Must match hashStr() exactly.
create or replace function public.hab_hash(p_s text)
returns bigint language plpgsql immutable as $fn$
declare h bigint := 0; i int;
begin
  for i in 1 .. length(p_s) loop
    h := (h * 31 + ascii(substr(p_s, i, 1))) % 2147483647;
  end loop;
  return h;
end; $fn$;

-- Which quests are live in a given week. Mirrors questsForWeek().
create or replace function public.hab_week_quests(p_week date, p_rules jsonb)
returns jsonb language plpgsql immutable as $fn$
declare
  v_key text := to_char(p_week, 'YYYY-MM-DD');
  v_pool jsonb := coalesce(p_rules -> 'quests', '[]'::jsonb);
  v_pinned jsonb := (p_rules -> 'questWeeks') -> v_key;
  v_per int := coalesce((p_rules ->> 'questsPerWeek')::int, 3);
  v_out jsonb := '[]'::jsonb;
  n int := jsonb_array_length(v_pool);
  h bigint; pick int; used int[] := '{}'; guard int := 0; id text;
begin
  if n = 0 then return v_out; end if;
  if v_pinned is not null and jsonb_typeof(v_pinned) = 'array'
     and jsonb_array_length(v_pinned) > 0 then
    for i in 0 .. jsonb_array_length(v_pinned) - 1 loop
      id := v_pinned ->> i;
      for j in 0 .. n - 1 loop
        if (v_pool -> j) ->> 'id' = id then v_out := v_out || jsonb_build_array(v_pool -> j); end if;
      end loop;
    end loop;
    return v_out;
  end if;
  if n <= v_per then return v_pool; end if;
  h := public.hab_hash(v_key);
  while jsonb_array_length(v_out) < v_per and guard < n * 4 loop
    guard := guard + 1;
    h := (h * 31 + 17) % 2147483647;
    pick := (h % n)::int;
    if pick = any(used) then continue; end if;
    used := used || pick;
    v_out := v_out || jsonb_build_array(v_pool -> pick);
  end loop;
  return v_out;
end; $fn$;

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- STAGE 13b — quest scoring, inside hab_bonus_xp
-- ═══════════════════════════════════════════════════════════════════════════
-- Replaces the stage 12 version so quests reach the board alongside tiers and
-- milestones. This is the CURRENT definition — stage12_bonus_xp.sql's copy is
-- superseded by it. Mirrors questProgress()/questEvents() in habits.html:
-- measured inside the Monday-to-Sunday week, season-bounded, credited on the day
-- the quest completed.

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
    select h.hid, h.tgt,
           coalesce((p_rules -> 'weights' ->> h.hid)::numeric, h.fallback) as w
    from habits h where h.tgt > 0
  ),
  livehab as (
    select w.* from weighted w
    where coalesce(p_cfg -> 'on' ->> w.hid, 'true') <> 'false'
  ),
  done as (
    select w.hid, dl.d
    from dl cross join weighted w
    where jsonb_typeof(dl.vals -> w.hid) = 'number'
      and (dl.vals ->> w.hid)::numeric >= w.tgt
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
           (select count(*) from livehab lh
             where jsonb_typeof(dl.vals -> lh.hid) = 'number'
               and (dl.vals ->> lh.hid)::numeric >= lh.tgt)::int as ndone
    from dl
  ),
  nlive as (select count(*)::int as n from livehab),
  with3 as (select d, (row_number() over (order by d))::int as n from perday where ndone >= 3),
  perfect as (
    select p.d, (row_number() over (order by p.d))::int as n
    from perday p, nlive where nlive.n > 0 and p.ndone >= nlive.n
  ),
  tiers as (
    select (t.ord - 1)::int as idx, (t.val ->> 'days')::int as days, (t.val ->> 'mult')::numeric as mult
    from jsonb_array_elements(coalesce(p_rules -> 'tiers', '[]'::jsonb)) with ordinality t(val, ord)
  ),
  tier_cross as (
    select rl.hid, tr.idx, tr.mult, min(rl.d) as crossed
    from runlen rl join tiers tr on rl.run >= tr.days
    group by rl.hid, tr.idx, tr.mult
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
    from ms m join runlen rl on m.measure = 'streak:' || rl.hid and rl.run >= m.need
    group by m.code, m.xp
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

  -- ── Weekly quests ──
  weeks as (select distinct date_trunc('week', d)::date as wk from dl),
  wq as (
    select w.wk, q.val as quest
    from weeks w, lateral jsonb_array_elements(public.hab_week_quests(w.wk, p_rules)) q(val)
  ),
  dh as (
    select hid, date_trunc('week', d)::date as wk, d,
           (row_number() over (partition by hid, date_trunc('week', d) order by d))::int as n
    from done
  ),
  tot as (
    select w.hid, date_trunc('week', dl.d)::date as wk, dl.d as d,
           sum(case when jsonb_typeof(dl.vals -> w.hid) = 'number'
                    then (dl.vals ->> w.hid)::numeric else 0 end)
             over (partition by w.hid, date_trunc('week', dl.d) order by dl.d) as acc
    from dl cross join weighted w
  ),
  -- round() mirrors dayPct()'s Math.round in the app
  qd as (
    select p.d, date_trunc('week', p.d)::date as wk,
           (row_number() over (partition by date_trunc('week', p.d) order by p.d))::int as n
    from perday p, nlive, bonusmult b
    where nlive.n > 0 and round(p.ndone::numeric / nlive.n * 100) >= b.qpct
  ),
  pfw as (
    select p.d, date_trunc('week', p.d)::date as wk,
           (row_number() over (partition by date_trunc('week', p.d) order by p.d))::int as n
    from perday p, nlive where nlive.n > 0 and p.ndone >= nlive.n
  ),
  quest_cross as (
    select wq.wk, wq.quest ->> 'id' as qid, (wq.quest ->> 'xp')::numeric as xp, min(dh.d) as crossed
    from wq join dh on dh.wk = wq.wk
      and wq.quest ->> 'kind' = 'daysHit:' || dh.hid
      and dh.n >= (wq.quest ->> 'need')::int
    group by 1,2,3
    union all
    select wq.wk, wq.quest ->> 'id', (wq.quest ->> 'xp')::numeric, min(tot.d)
    from wq join tot on tot.wk = wq.wk
      and wq.quest ->> 'kind' = 'total:' || tot.hid
      and tot.acc >= (wq.quest ->> 'need')::numeric
    group by 1,2,3
    union all
    select wq.wk, wq.quest ->> 'id', (wq.quest ->> 'xp')::numeric, min(qd.d)
    from wq join qd on qd.wk = wq.wk and wq.quest ->> 'kind' = 'qualify' and qd.n >= (wq.quest ->> 'need')::int
    group by 1,2,3
    union all
    select wq.wk, wq.quest ->> 'id', (wq.quest ->> 'xp')::numeric, min(pfw.d)
    from wq join pfw on pfw.wk = wq.wk and wq.quest ->> 'kind' = 'perfect' and pfw.n >= (wq.quest ->> 'need')::int
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
