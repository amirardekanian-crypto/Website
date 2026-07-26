-- ═══════════════════════════════════════════════════════════════════════════
-- STAGE 14 — quests are a RUN the coach starts, not a standing feature
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Supersedes stage 13, which auto-picked three quests every ISO week forever.
-- That made quests background wallpaper. They are meant to be a LEVER:
--
--   · there are NONE unless Amir starts a run, and
--   · a run lasts SEVEN DAYS FROM THE DAY IT STARTS — not Monday to Sunday.
--
-- When a run ends the block disappears from the athlete's Today screen until the
-- next one. Past runs are KEPT, because the XP earned in them must keep counting;
-- clearing a finished run would retroactively take those points away.
--
-- Runs are stored as   [{ "start": "2026-07-29", "ids": ["w_water5", …] }]
--
--   select public.set_quests('2026-07-29', array['w_water5','w_steps50k']);  -- start
--   select public.clear_quests('2026-07-29');                                -- cancel
--   select rules -> 'questRuns' from public.xp_rules where id = 1;           -- inspect
--
-- Like tiers and milestones, a quest is paid ON THE DAY IT COMPLETES, so the
-- season rule and both leaderboard windows filter it with no special cases, and
-- nothing new is stored. Each quest pays once.
--
-- The log stores DAYS, not timestamps, so a run starts at the beginning of its
-- start date rather than at the hour the command was run.
--
-- ⚠️ `QUEST_POOL` in habits.html is the offline fallback for this pool and must be
--    kept in step — see XP_SYSTEM.md §8.5 and §8.
--
-- This file contains the CURRENT definitions. Applied and live. Safe to re-run.

begin;

-- ── The pool, the run list, and the qualify threshold the app uses ────────
update public.xp_rules
set rules = (rules - 'questWeeks' - 'questsPerWeek') || $add${
  "streakQualifyPct": 80,
  "questRuns": [],
  "quests": [
    { "id":"w_water5",   "title":"THE WELL RUNS DEEP", "note":"Full water on 5 days",           "kind":"daysHit:water",    "need":5,     "xp":150 },
    { "id":"w_water7",   "title":"SEVEN FOR SEVEN",    "note":"Full water every single day",    "kind":"daysHit:water",    "need":7,     "xp":220 },
    { "id":"w_steps50k", "title":"FIFTY THOUSAND",     "note":"50,000 steps across the run",    "kind":"total:steps",      "need":50000, "xp":200 },
    { "id":"w_steps70k", "title":"THE LONG WAY ROUND", "note":"70,000 steps across the run",    "kind":"total:steps",      "need":70000, "xp":280 },
    { "id":"w_sleep5",   "title":"LIGHTS OUT",         "note":"Hit your sleep target 5 nights", "kind":"daysHit:sleep",    "need":5,     "xp":180 },
    { "id":"w_mob4",     "title":"OILED HINGES",       "note":"Mobility on 4 days",             "kind":"daysHit:mobility", "need":4,     "xp":120 },
    { "id":"w_breathe4", "title":"DEAD CALM",          "note":"Breathe on 4 days",              "kind":"daysHit:breathe",  "need":4,     "xp":100 },
    { "id":"w_supps7",   "title":"NO NEGOTIATION",     "note":"Supplements every day",          "kind":"daysHit:supps",    "need":7,     "xp":140 },
    { "id":"w_fuel5",    "title":"ON THE RECORD",      "note":"Log your meals on 5 days",       "kind":"daysHit:fuel",     "need":5,     "xp":140 },
    { "id":"w_train3",   "title":"THREE HARD DAYS",    "note":"Three sessions in the run",      "kind":"daysHit:strength", "need":3,     "xp":250 },
    { "id":"w_qualify5", "title":"FIVE ON TARGET",     "note":"5 days at 80% or better",        "kind":"qualify",          "need":5,     "xp":220 },
    { "id":"w_perfect2", "title":"TWICE PERFECT",      "note":"Two clean sweeps",               "kind":"perfect",          "need":2,     "xp":300 }
  ]
}$add$::jsonb
where id = 1;

-- The stage-13 auto-pick machinery is gone.
drop function if exists public.hab_week_quests(date, jsonb);

commit;

-- ── Start a run (coach only) ──────────────────────────────────────────────
-- Replaces any run with the same start date, otherwise appends.
create or replace function public.set_quests(p_start date, p_ids text[])
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v_key text; v_runs jsonb; v_kept jsonb := '[]'::jsonb; r jsonb;
begin
  -- Reject only a signed-in SOMEBODY ELSE. A NULL jwt means a privileged database
  -- session — the Supabase SQL editor, which is where the coach actually runs
  -- this. Guarding on `is distinct from` alone locked him out of his own command,
  -- because auth.jwt() is NULL there. Nothing is loosened: execute is granted to
  -- `authenticated` only, and a service-role caller can already UPDATE the table.
  if auth.jwt() is not null
     and (auth.jwt() ->> 'email') is distinct from 'amirardekanian@gmail.com' then
    raise exception 'coach only';
  end if;
  if p_ids is null or array_length(p_ids, 1) is null then
    raise exception 'give at least one quest id, or use clear_quests()';
  end if;
  v_key := to_char(p_start, 'YYYY-MM-DD');
  select coalesce(rules -> 'questRuns', '[]'::jsonb) into v_runs from public.xp_rules where id = 1;
  for r in select value from jsonb_array_elements(v_runs) loop
    if r ->> 'start' is distinct from v_key then v_kept := v_kept || jsonb_build_array(r); end if;
  end loop;
  v_kept := v_kept || jsonb_build_array(jsonb_build_object('start', v_key, 'ids', to_jsonb(p_ids)));
  update public.xp_rules
     set rules = jsonb_set(rules, '{questRuns}', v_kept), updated_at = now()
   where id = 1;
  return v_kept;
end; $fn$;
revoke all on function public.set_quests(date, text[]) from public;
grant execute on function public.set_quests(date, text[]) to authenticated;

-- ── Cancel a run (coach only) ─────────────────────────────────────────────
create or replace function public.clear_quests(p_start date)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v_key text; v_runs jsonb; v_kept jsonb := '[]'::jsonb; r jsonb;
begin
  -- Reject only a signed-in SOMEBODY ELSE. A NULL jwt means a privileged database
  -- session — the Supabase SQL editor, which is where the coach actually runs
  -- this. Guarding on `is distinct from` alone locked him out of his own command,
  -- because auth.jwt() is NULL there. Nothing is loosened: execute is granted to
  -- `authenticated` only, and a service-role caller can already UPDATE the table.
  if auth.jwt() is not null
     and (auth.jwt() ->> 'email') is distinct from 'amirardekanian@gmail.com' then
    raise exception 'coach only';
  end if;
  v_key := to_char(p_start, 'YYYY-MM-DD');
  select coalesce(rules -> 'questRuns', '[]'::jsonb) into v_runs from public.xp_rules where id = 1;
  for r in select value from jsonb_array_elements(v_runs) loop
    if r ->> 'start' is distinct from v_key then v_kept := v_kept || jsonb_build_array(r); end if;
  end loop;
  update public.xp_rules
     set rules = jsonb_set(rules, '{questRuns}', v_kept), updated_at = now()
   where id = 1;
  return v_kept;
end; $fn$;
revoke all on function public.clear_quests(date) from public;
grant execute on function public.clear_quests(date) to authenticated;

-- ── Athletes read pool + runs ─────────────────────────────────────────────
-- xp_rules is coach-only, so this is the key-checked door onto it.
drop function if exists public.get_quests(text, text);
create or replace function public.get_quests(p_athlete_id text, p_key text default null)
returns table (pool jsonb, runs jsonb)
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
                      coalesce(v_rules -> 'questRuns', '[]'::jsonb);
end; $fn$;
revoke all on function public.get_quests(text, text) from public;
grant execute on function public.get_quests(text, text) to anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- The CURRENT hab_bonus_xp — tiers, milestones and quest runs
-- ═══════════════════════════════════════════════════════════════════════════
-- Supersedes the copies in stage12_bonus_xp.sql and stage13. Mirrors
-- bonusEvents() in habits.html: badge runs measured from the season start,
-- quest windows measured per RUN, everything credited on the day it completed.
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
  livehab as (
    select w.* from weighted w where coalesce(p_cfg -> 'on' ->> w.hid, 'true') <> 'false'
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

  -- ── Quest runs: seven days from each run's own start date ──
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
  -- round() mirrors dayPct()'s Math.round in the app
  qd as (
    select qr.rstart, p.d,
           (row_number() over (partition by qr.rstart order by p.d))::int as n
    from qruns qr join perday p on p.d between qr.rstart and qr.rend, nlive, bonusmult b
    where nlive.n > 0 and round(p.ndone::numeric / nlive.n * 100) >= b.qpct
  ),
  pfw as (
    select qr.rstart, p.d,
           (row_number() over (partition by qr.rstart order by p.d))::int as n
    from qruns qr join perday p on p.d between qr.rstart and qr.rend, nlive
    where nlive.n > 0 and p.ndone >= nlive.n
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

-- ═══════════════════════════════════════════════════════════════════════════
-- The CURRENT leaderboard_top — the caller of the function above
-- ═══════════════════════════════════════════════════════════════════════════
-- This arrived with stage 13, which was deleted when 13 was superseded — so
-- until now the live definition existed in the database and NOWHERE in the repo,
-- while `stage12_bonus_xp.sql` still held a stale copy calling the old 5-arg
-- `hab_bonus_xp`. Reproduced here verbatim from `pg_get_functiondef`, so the
-- file that owns `hab_bonus_xp` also owns its only caller and the two can never
-- drift apart again.
--
-- The one thing that matters: `v_season_start` is passed SEPARATELY from the
-- scoring window. Badge and quest runs are measured from the season start even
-- when the board is showing a rolling week, so a tier crossed inside those seven
-- days pays here. Collapsing the two arguments back into one is exactly the bug
-- the stage-12 copy would reintroduce.
--
-- Already applied and live. Re-running it is a no-op.
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
  v_season_start := coalesce(v_season_start, '1970-01-01'::date);
  v_to := current_date;

  if p_scope = 'week' then
    -- A ROLLING seven days: today and the six before it, never earlier than the
    -- season start. Badge runs are still measured from the season start, so a
    -- tier crossed inside these seven days pays here.
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
