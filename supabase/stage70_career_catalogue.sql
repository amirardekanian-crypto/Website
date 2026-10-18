-- stage70 — Career Mode, phase 3: the catalogue switch (2026-10-18; Amir: "Go with your picks" on the plan page Trophy Room,
-- https://claude.ai/artifact/MxuRVfeZ7HXspgnBvieU7o; career/CAREER_MODE.md → The decisions, round 4; career/PROCEDURES.md P5, P8, P10 and
-- "Phase 3, as built"). Safe to re-run.
--
-- Amir's five calls of 2026-10-18, in the database:
--   1. Rewards from the past pay their XP: the seed that turns the catalogue switch on mints, for every athlete, every badge step and
--      achievement already reached (in silence: one reveal, never thirty) and they pay. Nobody's level goes down: the seed refuses if one would.
--   2. Proof's badges carry over, paid once: the retired entries (Proof's per-habit ladder, its seven streak families, HEAVY METAL, HARD TO
--      KILL's first form and THE MACHINIST) are minted with the XP they paid, from what was reached before the switch, and never again. Each
--      habit's new badge starts at the step its old ladder reached: that step is minted `carried`, shown, with xp 0.
--   3. WORKOUT stays in the day gate: nothing here touches the gate (career_habit_days(), hab_bonus_xp()'s qualday).
--   4. The Upgrade and Double Up count main lifts only: an entry's `patterns` narrows lift_gain to lifts whose Spine entry has one of them.
--   5. Reward names stay English on Farsi cards (the apps).
--
-- What it adds or changes:
--   · career_awards: one row per badge step, achievement or title an athlete earned, with the day it was reached and the XP it pays
--     (frozen when minted, GAME-1: a later change to a tier's XP pays new mints only, and never takes a level back). Never deleted, except by
--     an erasure. how = 'baseline' (the past, minted at the switch), 'carried' (a new badge's step the old ladder already paid: xp 0) or
--     'earned' (after the switch). told_at: when an app showed it (P8 step 6), so the two apps never celebrate it twice.
--   · career_marks(): Proof's own counting (hab_bonus_xp()'s CTEs, word for word where they overlap) returning ROWS: every ladder step, mark,
--     day streak and run with the day it was reached, so a step can be minted with its day instead of summed.
--   · career_evaluate() (P5): works out every reward the athlete has reached from the facts and the marks, and mints the ones not yet
--     minted. Run on a score's recompute (career_scored(), career_scores_for()), never in a trigger: it walks the whole log (8 s is all a
--     signed-in request gets, and a trigger must stay small). Returns each badge's measure (the n of "Paper Trail 9 of 10").
--   · With the catalogue switch on, the score (career_compute(), career_score()) pays the habit half's daily XP, quests and comebacks through
--     Proof's functions with the ladders and marks taken out (career_bonus_rules()), and every reward from career_awards. Before it, exactly
--     as stage69.
--   · get_profile() answers, once the switch is on, `shelf` (every badge with its steps, measure and next step; achievements; titles; the Grand
--     Slam), `moments` (rewards earned and not yet shown) and `reveal` (the switch's past rewards, until an app showed them).
--   · career_told(): an athlete's app marks moments shown.
--   · career_seed(): the seed that turns the catalogue switch on mints the past for everyone (career_catalogue_baseline()) and returns every
--     athlete's line, before and after; p_dry_run shows it and undoes it. A seed whose rulebook numbers did not change runs no backfill (no fact
--     depends on the catalogue).
--   · career_compare() keeps working after the switch: both sides leave out the ladders and marks, which only the awards pay now.
--   · coach_erase_person() learns career_awards (patched in place, as stage63, stage66 and stage69).
--
-- Rehearsed 2026-10-18 away from the live project: scripts/career/rehearse_catalogue.mjs (PGlite, the schema snapshot, a full backup of the
-- real rows, then this file, the switch's dry run, the switch, the refusals, made-up athletes through the real doors, an erasure, the way back).
-- The way back: scripts/career/rollback_stage70.sql.

-- ── 1. the awards ────────────────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.career_awards (
  athlete_id text not null,
  kind       text not null check (kind in ('badge', 'achievement', 'title')),
  item       text not null check (item ~ '^[a-z][a-z0-9_]*$'),     -- the catalogue id
  sub        text not null default '',                              -- the habit, for a step of a retired per-habit ladder; '' otherwise
  tier       integer not null default 0 check (tier >= 0),          -- a badge's step (1 up); 0 for an achievement or a title
  day        date not null,                                         -- the day it was reached (the athlete's own day)
  xp         integer not null default 0 check (xp >= 0),            -- what it pays, frozen when minted
  size       text not null default 'win' check (size in ('tick', 'win', 'highlight', 'milestone', 'legend')),
  how        text not null check (how in ('baseline', 'carried', 'earned')),
  evidence   jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence) = 'object'),
  minted_at  timestamptz not null default now(),
  told_at    timestamptz,                                           -- when an app showed it to the athlete (P8 step 6)
  primary key (athlete_id, kind, item, sub, tier)
);
create index if not exists career_awards_day_idx on public.career_awards (athlete_id, day);
alter table public.career_awards enable row level security;

do $stage70_policies$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'career_awards' and policyname = 'athlete reads own career awards') then
    create policy "athlete reads own career awards" on public.career_awards as permissive for select to authenticated
      using (athlete_id in (select ai.athlete_id from public.athlete_identities ai where ai.user_id = (select auth.uid())));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'career_awards' and policyname = 'coach reads career awards') then
    create policy "coach reads career awards" on public.career_awards as permissive for select to authenticated
      using ((select public.is_coach()));
  end if;
end $stage70_policies$;

revoke all on table public.career_awards from public, anon, authenticated;
grant select on table public.career_awards to authenticated;
grant all on table public.career_awards to service_role;

-- ── 2. the switch ────────────────────────────────────────────────────────────────────────────────────────────────────────

-- The day the catalogue switch went on (rulebook.toml → [switch] catalogue), or null while it is off.
create or replace function public.career_catalogue_day() returns date
language sql stable set search_path to 'public' as $function$
  select public.career_switch_day(public.career_rules_now(), 'catalogue')
$function$;

-- Proof's habit rules as hab_bonus_xp() pays them once the catalogue switch is on: the ladders and marks taken out (the awards pay them), so it
-- pays the quests and the comebacks only. The day gate, the comebacks and the day lists are untouched (Amir's call 3: WORKOUT stays in the gate).
-- Before the switch it is career_habit_rules() as it is.
create or replace function public.career_bonus_rules(p_habit_rules jsonb, p_rules jsonb) returns jsonb
language sql stable set search_path to 'public' as $function$
  select case when p_habit_rules is null or public.career_switch_day(p_rules, 'catalogue') is null then p_habit_rules
              else p_habit_rules || '{"tiers": [], "milestones": []}'::jsonb end
$function$;

-- ── 3. Proof's counting, as rows ─────────────────────────────────────────────────────────────────────────────────────────

-- Every step Proof's rules reach on a whole log, with the day it was reached: hab_bonus_xp()'s CTEs (stage24) up to the crossings, word for word
-- where they overlap, so a step is reached on the same day as Proof would pay it. p_runs: the run lengths a habit badge asks (badges.toml
-- tiers' `at`); p_streaks: the day streak marks (badge day_streak's tiers). Rows:
--   tier       habit, tier (0 up), need, crossed, xp      Proof's per-habit ladder (rules 'tiers'), xp as Proof pays it
--   milestone  code, need, crossed, xp                    Proof's marks (rules 'milestones')
--   run        habit, need, crossed                       a habit's run of `need` days in a row, first reached
--   streak     need, crossed                              days on target in a row (dayQualifies()), first reached
--   full_stack crossed                                    steps, sleep, fuel and water each on a 7-day run on the same day (Full Stack)
--   best       habit, need = the best run ever; now = the run that ends on the log's last day
--   count      code ('daysWith3', 'perfectDays', 'comebackRun', 'dayStreak', 'dayStreakNow'), need = the number
create or replace function public.career_marks(p_log jsonb, p_cfg jsonb, p_rules jsonb, p_runs integer[], p_streaks integer[])
returns table (mkind text, code text, habit text, tier integer, need integer, crossed date, xp numeric)
language sql stable set search_path to 'public' as $function$
with
  bonusmult as (
    select coalesce((p_rules ->> 'completionBonus')::numeric, 1.2) as cb,
           coalesce((p_rules ->> 'customXp')::numeric, 25) as cx,
           coalesce((p_rules ->> 'streakQualifyPct')::numeric, 80) as qpct,
           coalesce((p_rules ->> 'gateV2')::boolean, false) as gate2,
           coalesce((p_rules ->> 'lapseDays')::int, 3) as lapse,
           coalesce((p_rules ->> 'comebackStick')::int, 7) as stick
  ),
  dl as (
    select (e.key)::date as d, e.value as vals
      from jsonb_each(coalesce(p_log, '{}'::jsonb)) e
     where e.key ~ '^\d{4}-\d{2}-\d{2}$' and jsonb_typeof(e.value) = 'object'
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
    select h.hid, h.tgt, coalesce((p_rules -> 'weights' ->> h.hid)::numeric, h.fallback) as w from habits h
  ),
  dayroster as (
    select dl.d,
           (select r.value -> 'ids' from jsonb_array_elements(coalesce(p_cfg -> 'roster', '[]'::jsonb)) r(value)
             where (r.value ->> 'from')::date <= dl.d order by (r.value ->> 'from')::date desc limit 1) as ids
      from dl
  ),
  daylive as (
    select dr.d, w.hid, w.tgt, w.w, jsonb_exists(coalesce(p_rules -> 'unearnable', '[]'::jsonb), w.hid) as lockd
      from dayroster dr cross join weighted w
     where case when dr.ids is null then coalesce(p_cfg -> 'on' ->> w.hid, 'true') <> 'false' else jsonb_exists(dr.ids, w.hid) end
  ),
  done as (
    select w.hid, dl.d from dl cross join weighted w
     where jsonb_typeof(dl.vals -> w.hid) = 'number' and (dl.vals ->> w.hid)::numeric >= w.tgt
  ),
  islands as (select hid, d, d - (row_number() over (partition by hid order by d))::int as grp from done),
  runlen as (select hid, d, (row_number() over (partition by hid, grp order by d))::int as run from islands),
  hitno as (select hid, d, (row_number() over (partition by hid order by d))::int as n from done),
  perday as (
    select dl.d,
           count(dv.hid) filter (where jsonb_typeof(dl.vals -> dv.hid) = 'number' and (dl.vals ->> dv.hid)::numeric >= dv.tgt)::int as ndone,
           count(dv.hid)::int as nlive,
           coalesce(sum(dv.w) filter (where jsonb_typeof(dl.vals -> dv.hid) = 'number' and (dl.vals ->> dv.hid)::numeric >= dv.tgt), 0) as wdone,
           coalesce(sum(dv.w) filter (where (jsonb_typeof(dl.vals -> dv.hid) = 'number' and (dl.vals ->> dv.hid)::numeric >= dv.tgt)
                                         or not dv.lockd), 0) as glive,
           coalesce(sum(case when jsonb_typeof(dl.vals -> dv.hid) = 'number' and (dl.vals ->> dv.hid)::numeric >= dv.tgt then dv.w
                             when dv.lockd then 0
                             when dv.tgt > 0 and jsonb_typeof(dl.vals -> dv.hid) = 'number' and (dl.vals ->> dv.hid)::numeric > 0
                             then dv.w * least((dl.vals ->> dv.hid)::numeric / dv.tgt, 1)
                             else 0 end), 0) as gpart,
           count(dv.hid) filter (where not (jsonb_typeof(dl.vals -> dv.hid) = 'number' and (dl.vals ->> dv.hid)::numeric >= dv.tgt)
                                   and not dv.lockd)::int as gmiss
      from dl left join daylive dv on dv.d = dl.d
     group by dl.d
  ),
  qualday as (
    select p.d from perday p, bonusmult b
     where case when b.gate2 then (p.glive > 0 and round(p.gpart / p.glive * 100) >= b.qpct) or (p.gmiss <= 1 and p.gpart > 0)
                else p.glive > 0 and round(p.wdone / p.glive * 100) >= b.qpct end
  ),
  qgap as (select d, (d - lag(d) over (order by d) - 1) as gone from qualday),
  qisl as (select d, d - (row_number() over (order by d))::int as grp from qualday),
  qrun as (select grp, min(d) as startd, count(*)::int as runlen from qisl group by grp),
  qrunat as (select d, (row_number() over (partition by grp order by d))::int as run from qisl),
  comeback as (
    select g.d, g.gone, r.runlen from qgap g join qrun r on r.startd = g.d, bonusmult b
     where b.lapse > 0 and g.gone >= b.lapse
  ),
  cb_run_at as (select c.d + i as d, i + 1 as run from comeback c, generate_series(0, c.runlen - 1) as i),
  cb_run_no as (select d, max(run) over (order by d) as n from cb_run_at),
  cb_stuck_no as (
    select c.d + (b.stick - 1) as d, (row_number() over (order by c.d))::int as n
      from comeback c, bonusmult b where c.runlen >= b.stick
  ),
  with3 as (select d, (row_number() over (order by d))::int as n from perday where ndone >= 3),
  perfect as (select p.d, (row_number() over (order by p.d))::int as n from perday p where p.nlive > 0 and p.ndone >= p.nlive),
  tiers as (
    select (t.ord - 1)::int as idx, (t.val ->> 'days')::int as days, (t.val ->> 'mult')::numeric as mult
      from jsonb_array_elements(coalesce(p_rules -> 'tiers', '[]'::jsonb)) with ordinality t(val, ord)
  ),
  tier_cross as (
    select rl.hid, tr.idx, tr.days, tr.mult, min(rl.d) as crossed
      from runlen rl join tiers tr on rl.run >= tr.days group by rl.hid, tr.idx, tr.days, tr.mult
  ),
  ms as (
    select m.val ->> 'code' as code, (m.val ->> 'need')::int as need, (m.val ->> 'xp')::numeric as xp, m.val ->> 'measure' as measure
      from jsonb_array_elements(coalesce(p_rules -> 'milestones', '[]'::jsonb)) m(val)
  ),
  ms_cross as (
    select m.code, m.need, m.xp, min(rl.d) as crossed from ms m join runlen rl on m.measure = 'streak:' || rl.hid and rl.run >= m.need group by 1, 2, 3
    union all
    select m.code, m.need, m.xp, min(hn.d) from ms m join hitno hn on m.measure = 'daysHit:' || hn.hid and hn.n >= m.need group by 1, 2, 3
    union all
    select m.code, m.need, m.xp, min(w3.d) from ms m join with3 w3 on m.measure = 'daysWith3' and w3.n >= m.need group by 1, 2, 3
    union all
    select m.code, m.need, m.xp, min(pf.d) from ms m join perfect pf on m.measure = 'perfectDays' and pf.n >= m.need group by 1, 2, 3
    union all
    select m.code, m.need, m.xp, min(cr.d) from ms m join cb_run_no cr on m.measure = 'comebackRun' and cr.n >= m.need group by 1, 2, 3
    union all
    select m.code, m.need, m.xp, min(cs.d) from ms m join cb_stuck_no cs on m.measure = 'comebacksStuck' and cs.n >= m.need group by 1, 2, 3
  ),
  lastday as (select max(d) as d from dl),
  fstack as (
    select r.d from runlen r where r.hid in ('steps', 'sleep', 'fuel', 'water') and r.run >= 7
     group by r.d having count(distinct r.hid) = 4
  )
select 'tier'::text, null::text, tc.hid, tc.idx, tc.days, tc.crossed, greatest(10, round(w.w * b.cb * tc.mult / 10) * 10)
  from tier_cross tc join weighted w on w.hid = tc.hid cross join bonusmult b
union all
select 'milestone', mc.code, null, null, mc.need, mc.crossed, mc.xp from ms_cross mc
union all
select 'run', null, r.hid, null, x.need, min(r.d), null
  from runlen r join unnest(coalesce(p_runs, '{}'::integer[])) as x(need) on r.run >= x.need group by r.hid, x.need
union all
select 'streak', null, null, null, x.need, min(q.d), null
  from qrunat q join unnest(coalesce(p_streaks, '{}'::integer[])) as x(need) on q.run >= x.need group by x.need
union all
select 'full_stack', null, null, null, 7, min(f.d), null from fstack f having min(f.d) is not null
union all
select 'best', null, r.hid, null, max(r.run),
       null, max(r.run) filter (where r.d = (select d from lastday))
  from runlen r group by r.hid
union all
select 'count', 'daysWith3', null, null, (select count(*) from with3)::int, null, null
union all
select 'count', 'perfectDays', null, null, (select count(*) from perfect)::int, null, null
union all
select 'count', 'comebackRun', null, null, coalesce((select max(n) from cb_run_no), 0)::int, null, null
union all
select 'count', 'dayStreak', null, null, coalesce((select max(run) from qrunat), 0)::int, null, null
union all
select 'count', 'dayStreakNow', null, null, coalesce((select q.run from qrunat q where q.d = (select d from lastday)), 0)::int, null, null
$function$;

-- ── 4. minting (P5) ──────────────────────────────────────────────────────────────────────────────────────────────────────

-- The lifts a catalogue entry counts, by the Spine's pattern (Amir's call 4): every lift when the entry has no `patterns`, else the lifts whose
-- Spine entry (matched by name, the way a lift_gain fact names it) has one of them.
create or replace function public.career_lift_counts(p_lift text, p_patterns jsonb) returns boolean
language sql stable set search_path to 'public' as $function$
  select case when p_patterns is null or jsonb_typeof(p_patterns) <> 'array' or jsonb_array_length(p_patterns) = 0 then true
              else exists (select 1 from public.exercises e
                            where public.career_norm(e.name) = public.career_norm(p_lift)
                              and jsonb_exists(p_patterns, e.pattern)) end
$function$;

-- All the Way Back (achievements.toml): after four or more training weeks in a row with no session, the held-weeks run reaches the best run
-- held before that absence (at least two weeks) again. The day it does, or null.
create or replace function public.career_all_the_way_back(p_athlete text) returns date
language plpgsql stable set search_path to 'public' as $function$
declare f record; v_run integer := 0; v_best integer := 0; v_empty integer := 0; v_target integer;
begin
  for f in select cf.kind, cf.day, coalesce(public.career_num(cf.value -> 'sessions'), 0) as sessions
             from public.career_facts cf
            where cf.athlete_id = p_athlete and cf.void_at is null and cf.kind in ('week_held', 'week_broken')
            order by cf.day, cf.ref loop
    if f.kind = 'week_held' then
      v_run := v_run + 1; v_empty := 0;
      if v_target is not null and v_run >= v_target then return f.day; end if;
      v_best := greatest(v_best, v_run);
    else
      v_run := 0;
      v_empty := case when f.sessions = 0 then v_empty + 1 else 0 end;
      if v_empty >= 4 and v_best >= 2 and v_target is null then v_target := v_best; end if;
    end if;
  end loop;
  return null;
end $function$;

-- Every reward the athlete has reached, worked out from the facts and Proof's marks, and the ones not yet minted minted (P5). Never takes an
-- award back (GAME-1). p_baseline: the run the catalogue switch's seed makes for everyone, which also mints the retired entries from what was
-- reached before the switch day (and nothing after: a retired entry is never earned again) and marks the past as 'baseline' or 'carried'.
-- Returns each badge's measure: { "<badge>": {"n": …, "now": …} }, the numbers an app shows beside a badge ("Paper Trail 9 of 10").
-- Nothing happens while the switch is off (null).
create or replace function public.career_evaluate(p_athlete text, p_baseline boolean default false) returns jsonb
language plpgsql set search_path to 'public' as $function$
declare
  v_rules jsonb := public.career_rules_now(); v_day date; v_hr jsonb; v_log jsonb; v_cfg jsonb; v_pcfg jsonb;
  v_runs integer[]; v_streaks integer[]; v_measures jsonb := '{}'::jsonb; v_n integer; v_wk jsonb; v_wnow integer; v_wbest integer; v_f record;
begin
  v_day := public.career_switch_day(v_rules, 'catalogue');
  if v_day is null or p_athlete is null then return null; end if;
  v_hr := public.career_habit_rules();
  v_log := public.career_log(p_athlete);
  v_cfg := public.career_cfg(p_athlete);
  -- the Proof config the phone keeps (the event titles it claimed live there: CFG.pass.owned)
  select public.hab_cfg_of(ap.data, p_athlete) into v_pcfg from public.athlete_progress ap where ap.athlete_id = p_athlete;

  select coalesce(array_agg(distinct (t.v ->> 'at')::int), '{}') into v_runs
    from public.career_catalogue c, jsonb_array_elements(c.body -> 'tiers') t(v)
   where c.kind = 'badge' and c.body ->> 'habit' is not null;
  select coalesce(array_agg(distinct (t.v ->> 'at')::int), '{}') into v_streaks
    from public.career_catalogue c, jsonb_array_elements(c.body -> 'tiers') t(v)
   where c.kind = 'badge' and c.id = 'day_streak';

  create temp table if not exists career_m (mkind text, code text, habit text, tier integer, need integer, crossed date, xp numeric) on commit drop;
  create temp table if not exists career_c (kind text, item text, sub text, tier integer, day date, xp numeric, size text, carried boolean,
                                            evidence jsonb) on commit drop;
  create temp table if not exists career_f (kind text, ref text, day date, value jsonb) on commit drop;
  create temp table if not exists career_p (kind text, ref text, day date) on commit drop;
  delete from career_m; delete from career_c; delete from career_f; delete from career_p;
  insert into career_m select * from public.career_marks(v_log, v_cfg, v_hr, v_runs, v_streaks);
  insert into career_f select f.kind, f.ref, f.day, f.value from public.career_facts f where f.athlete_id = p_athlete and f.void_at is null;
  -- what a count badge counts: the facts that pay within their caps (career_facts_paid()), so a session past the plan (a plan day repeated in its
  -- week) moves Century no more than it pays (GAME-4: more never beats as written)
  insert into career_p select x.kind, x.ref, x.day from public.career_facts_paid(p_athlete) x;

  -- ── badges counted from the facts: total, best_run of weeks held, best_value ─────────────────────────────────────────────
  insert into career_c
  with b as (
    select c.id, c.body,
           case when jsonb_typeof(c.body -> 'counts') = 'array' then array(select jsonb_array_elements_text(c.body -> 'counts'))
                else array[c.body ->> 'counts'] end as counts
      from public.career_catalogue c
     where c.kind = 'badge' and c.body ->> 'kind' in ('total', 'best_run', 'best_value') and c.body ->> 'habit' is null
       and coalesce(c.body ->> 'retire_at', '') <> 'catalogue'
  ),
  tot as (
    select b.id, f.day, (row_number() over (partition by b.id order by f.day, f.ref))::int as n
      from b join career_p f on f.kind = any (b.counts) where b.body ->> 'kind' = 'total'
  ),
  wk as (
    select f.day, f.ref, f.kind, sum(case when f.kind = 'week_broken' then 1 else 0 end) over (order by f.day, f.ref) as brk
      from career_f f where f.kind in ('week_held', 'week_broken')
  ),
  wrun as (select w.day, (row_number() over (partition by w.brk order by w.day, w.ref))::int as n from wk w where w.kind = 'week_held'),
  val as (
    select b.id, f.day, public.career_num(f.value -> 'pct') as v
      from b join career_f f on f.kind = 'lift_gain' and 'lift_gain' = any (b.counts)
     where b.body ->> 'kind' = 'best_value' and public.career_lift_counts(f.value ->> 'lift', b.body -> 'patterns')
  ),
  measure as (
    select t.id, t.day, t.n::numeric as n from tot t
    union all
    select b.id, w.day, w.n from b join wrun w on b.body ->> 'kind' = 'best_run' and 'week_held' = any (b.counts)
    union all
    select v.id, v.day, v.v from val v
  ),
  steps as (
    select b.id, t.ord::int as tier, (t.v ->> 'at')::numeric as at, (t.v ->> 'xp')::numeric as xp, t.v ->> 'size' as size
      from b, jsonb_array_elements(b.body -> 'tiers') with ordinality t(v, ord)
  )
  select 'badge', s.id, '', s.tier, min(m.day), s.xp, s.size, false, jsonb_build_object('at', s.at)
    from steps s join measure m on m.id = s.id and m.n >= s.at
   group by s.id, s.tier, s.xp, s.size, s.at;

  -- ── one badge per habit (habit = …): a run of the habit's days in a row; custom = any one of the athlete's own habits ────────
  insert into career_c
  with hb as (
    select c.id, c.body ->> 'habit' as habit, t.ord::int as tier, (t.v ->> 'at')::int as at, (t.v ->> 'xp')::numeric as xp, t.v ->> 'size' as size
      from public.career_catalogue c, jsonb_array_elements(c.body -> 'tiers') with ordinality t(v, ord)
     where c.kind = 'badge' and c.body ->> 'habit' is not null and coalesce(c.body ->> 'retire_at', '') <> 'catalogue'
  ),
  runs as (
    select case when (v_hr -> 'weights' ->> m.habit) is null then 'custom' else m.habit end as habit, m.need, min(m.crossed) as crossed
      from career_m m where m.mkind = 'run' group by 1, 2
  ),
  old as (   -- the retired ladder's steps reached before the switch, per habit (custom: any one): what the baseline mints with it
    select case when (v_hr -> 'weights' ->> m.habit) is null then 'custom' else m.habit end as habit, m.need, min(m.crossed) as crossed
      from career_m m where m.mkind = 'tier' and m.crossed < v_day group by 1, 2
  )
  select 'badge', hb.id, '', hb.tier, r.crossed, hb.xp, hb.size,
         -- carried: the old ladder paid this step. At the baseline, the old ladder's steps before the switch (minted with it); after it,
         -- only a step the baseline actually minted (a past day logged late after the switch was never paid by the old ladder)
         case when p_baseline then r.crossed < v_day and exists (select 1 from old o where o.habit = hb.habit and o.need = hb.at)
              else exists (select 1 from public.career_awards w
                            where w.athlete_id = p_athlete and w.kind = 'badge' and w.item = 'habit_tiers' and (w.evidence ->> 'at')::int = hb.at
                              and case when hb.habit = 'custom' then (v_hr -> 'weights' ->> w.sub) is null else w.sub = hb.habit end) end,
         jsonb_build_object('at', hb.at, 'habit', hb.habit)
    from hb join runs r on r.habit = hb.habit and r.need = hb.at;

  -- ── Proof's marks: the kept families (and, at the baseline, the retired ones before the switch) ─────────────────────────────
  insert into career_c
  with codes as (
    select c.kind, c.id, c.body, x.code, x.ord::int as ord
      from public.career_catalogue c
     cross join lateral (select e.v #>> '{}' as code, e.ord
                           from jsonb_array_elements(case when c.body ? 'proof_codes' then c.body -> 'proof_codes'
                                                          else jsonb_build_array(c.body -> 'proof_code') end) with ordinality e(v, ord)) x
     where c.kind in ('badge', 'achievement') and c.body ->> 'origin' = 'proof' and c.body ? 'proof_measure'
  )
  select c.kind, c.id, '', case when c.kind = 'badge' then c.ord else 0 end, m.crossed, m.xp,
         coalesce(c.body -> 'tiers' -> (c.ord - 1) ->> 'size', c.body ->> 'size', 'win'), false,
         jsonb_build_object('code', c.code, 'need', m.need)
    from career_m m join codes c on c.code = m.code
   where m.mkind = 'milestone'
     and (coalesce(c.body ->> 'retire_at', '') <> 'catalogue' or (p_baseline and m.crossed < v_day));

  -- ── Day Streak (days on target in a row; it pays nothing, it is recognition) ──────────────────────────────────────────────
  insert into career_c
  select 'badge', 'day_streak', '', t.ord::int, m.crossed, coalesce((t.v ->> 'xp')::numeric, 0), t.v ->> 'size', false,
         jsonb_build_object('at', m.need)
    from public.career_catalogue c, jsonb_array_elements(c.body -> 'tiers') with ordinality t(v, ord), career_m m
   where c.kind = 'badge' and c.id = 'day_streak' and m.mkind = 'streak' and m.need = (t.v ->> 'at')::int;

  -- ── the retired per-habit ladder, at the baseline: each habit's steps before the switch, with the XP Proof paid ────────────
  if p_baseline then
    insert into career_c
    select 'badge', c.id, m.habit, m.tier + 1, m.crossed, m.xp, coalesce(c.body -> 'tiers' -> m.tier ->> 'size', 'win'), false,
           jsonb_build_object('at', m.need, 'habit', m.habit)
      from career_m m, public.career_catalogue c
     where m.mkind = 'tier' and m.crossed < v_day and c.kind = 'badge' and c.body ->> 'kind' = 'per_habit_best_run'
       and c.body ->> 'retire_at' = 'catalogue';
  end if;

  -- ── HARD TO KILL, widened: a step its first form (Proof's HK, US) already paid before the switch is carried ────────────────
  update career_c x set carried = true
   where x.kind = 'badge' and x.item = 'comebacks'
     and case when p_baseline then
                x.day < v_day
                and exists (select 1 from career_m m
                             join public.career_catalogue c on c.kind = 'badge' and c.id = 'hard_to_kill'
                             join lateral jsonb_array_elements_text(c.body -> 'proof_codes') with ordinality p(code, ord) on p.code = m.code
                            where m.mkind = 'milestone' and m.crossed < v_day
                              and (c.body -> 'tiers' -> (p.ord::int - 1) ->> 'at')::int = (x.evidence ->> 'at')::int)
              else exists (select 1 from public.career_awards w
                            where w.athlete_id = p_athlete and w.kind = 'badge' and w.item = 'hard_to_kill'
                              and (w.evidence ->> 'need')::int = (x.evidence ->> 'at')::int) end;

  -- ── achievements (origin new): each by its rule (achievements.toml), from the facts ──────────────────────────────────────
  -- achievement: held, clean_sheet, flawless, full_stack, first_cycle, by_the_book, the_distance, first_best, all_court, double_up,
  -- achievement: the_proving_ground, kept_going, back, all_the_way_back (scripts/check_career.py rule 17 holds this list to the file)
  insert into career_c
  with a as (
    select c.id, c.body from public.career_catalogue c
     where c.kind = 'achievement' and coalesce(c.body ->> 'origin', '') = 'new' and coalesce(c.body ->> 'retire_at', '') <> 'catalogue'
  ),
  wks as (select w.cycle_num, max(w.weeks) as weeks, min(w.cstart) as cstart, max(w.cend) as cend
            from public.career_weeks(p_athlete) w group by w.cycle_num),
  cyc as (
    select (f.value ->> 'cycle')::int as cyc, f.day, k.weeks, k.cstart, k.cend,
           (select count(*) from career_f h where h.kind = 'week_held' and h.value ->> 'cycle' = f.value ->> 'cycle') as held,
           (select count(*) from career_f h where h.kind = 'week_by_the_book' and h.value ->> 'cycle' = f.value ->> 'cycle') as book,
           (select count(*) from career_f h where h.kind = 'week_broken' and h.value ->> 'cycle' = f.value ->> 'cycle') as broken
      from career_f f left join wks k on k.cycle_num = (f.value ->> 'cycle')::int
     where f.kind = 'cycle_finished'
  ),
  pb as (   -- each personal best with its lift's Spine pattern, grouped the way All-Court reads them
    select f.day, f.value ->> 'lift' as lift,
           (select case when e.pattern in ('push-horizontal', 'push-vertical') then 'push'
                        when e.pattern in ('pull-horizontal', 'pull-vertical') then 'pull' else e.pattern end
              from public.exercises e where public.career_norm(e.name) = public.career_norm(f.value ->> 'lift') limit 1) as pat
      from career_f f where f.kind = 'personal_best'
  ),
  allcourt as (   -- the day a cycle's bests first cover squat, hinge, single leg, push and pull
    select min(x.day) as d from (
      select k.cycle_num, p.day,
             (select count(distinct p2.pat) from pb p2 where p2.day between k.cstart and p.day
                and p2.pat in ('squat', 'hinge', 'single-leg', 'push', 'pull')) as pats
        from wks k join pb p on p.day between k.cstart and k.cend) x
     where x.pats = 5
  ),
  proving as (   -- a cycle with three bests, a retest beaten and every week held
    select min(greatest(c.day, (select max(r.day) from career_f r where r.kind = 'retest_beaten' and r.ref like '%|c' || c.cyc))) as d
      from cyc c
     where c.weeks > 0 and c.held >= c.weeks
       and (select count(*) from pb p where p.day between c.cstart and c.cend) >= 3
       and exists (select 1 from career_f r where r.kind = 'retest_beaten' and r.ref like '%|c' || c.cyc)
  ),
  hit as (
    select 'held' as id, (select min(day) from career_f where kind = 'week_held') as d
    union all select 'clean_sheet', (select min(day) from career_f where kind = 'mission_sweep')
    union all select 'flawless', (select min(day) from cyc where weeks > 0 and held >= weeks)
    union all select 'full_stack', (select min(crossed) from career_m where mkind = 'full_stack')
    union all select 'first_cycle', (select min(day) from career_f where kind = 'cycle_finished')
    union all select 'by_the_book', (select min(day) from cyc where weeks > 0 and book >= weeks)
    union all select 'the_distance', (select min(day) from career_f where kind = 'roadmap_finished')
    union all select 'first_best', (select min(day) from career_f where kind = 'personal_best')
    union all select 'all_court', (select d from allcourt)
    union all select 'double_up', (select min(f.day) from career_f f, a
                                    where a.id = 'double_up' and f.kind = 'lift_gain' and public.career_num(f.value -> 'pct') >= 100
                                      and public.career_lift_counts(f.value ->> 'lift', a.body -> 'patterns'))
    union all select 'the_proving_ground', (select d from proving)
    union all select 'kept_going', (select min(day) from cyc where broken > 0)
    union all select 'back', (select min(day) from career_f where kind = 'training_return')
    union all select 'all_the_way_back', public.career_all_the_way_back(p_athlete)
  )
  select 'achievement', a.id, '', 0, h.d, coalesce((a.body ->> 'xp')::numeric, 0), coalesce(a.body ->> 'size', 'win'), false, '{}'::jsonb
    from hit h join a on a.id = h.id where h.d is not null;

  -- ── Proof's events (achievements whose title Proof claims on the phone): owned when the athlete owns the title ─────────────
  insert into career_c
  select 'achievement', a.id, '', 0,
         coalesce((select ht.earned_on::date from public.hab_titles ht where ht.athlete_id = p_athlete and ht.title = t.body ->> 'proof_id'),
                  case when p_baseline then v_day - 1 else current_date end),
         coalesce((a.body ->> 'xp')::numeric, 0), coalesce(a.body ->> 'size', 'milestone'), false, jsonb_build_object('title', t.body ->> 'proof_id')
    from public.career_catalogue a
    join public.career_catalogue t on t.kind = 'title' and t.id = a.body ->> 'title'
   where a.kind = 'achievement' and a.body ->> 'origin' = 'proof' and not (a.body ? 'proof_measure') and t.body ? 'proof_id'
     and (exists (select 1 from public.hab_titles ht where ht.athlete_id = p_athlete and ht.title = t.body ->> 'proof_id')
          or jsonb_exists(coalesce(v_pcfg #> '{pass,owned}', '[]'::jsonb), t.body ->> 'proof_id'));

  -- ── mint: what is not minted yet ───────────────────────────────────────────────────────────────────────────────────────────
  insert into public.career_awards (athlete_id, kind, item, sub, tier, day, xp, size, how, evidence)
  select p_athlete, x.kind, x.item, x.sub, x.tier, x.day,
         case when x.carried then 0 else round(coalesce(x.xp, 0))::int end,
         coalesce(x.size, 'win'),
         case when not p_baseline or x.day >= v_day then 'earned' when x.carried then 'carried' else 'baseline' end,
         x.evidence
    from career_c x
  on conflict (athlete_id, kind, item, sub, tier) do nothing;
  get diagnostics v_n = row_count;
  -- AA Proof celebrates these itself, the moment they happen, as it always has (a habit badge's step, its own marks, the day streak, an
  -- event's title): they are told as they are minted, so no app shows them a second time. A new achievement it does not know (Full Stack)
  -- stays a moment.
  update public.career_awards w set told_at = w.minted_at
    from public.career_catalogue c
   where w.athlete_id = p_athlete and w.told_at is null and w.how = 'earned' and c.kind = w.kind and c.id = w.item
     and (c.body ->> 'origin' = 'proof' or c.body ? 'habit');

  -- ── titles: from a badge step or an achievement that names one (new entries; Proof's own titles stay Proof's) ───────────────
  insert into public.career_awards (athlete_id, kind, item, sub, tier, day, xp, size, how, evidence)
  select p_athlete, 'title', t.id, '', 0, w.day, 0, w.size, w.how, jsonb_build_object('from', w.kind || ':' || w.item, 'tier', w.tier)
    from public.career_awards w
    join public.career_catalogue c on c.kind = w.kind and c.id = w.item
    join public.career_catalogue t on t.kind = 'title' and t.id = coalesce(
           case when w.kind = 'badge' then c.body -> 'tiers' -> (w.tier - 1) ->> 'title' else c.body ->> 'title' end, '-')
   where w.athlete_id = p_athlete and w.kind in ('badge', 'achievement') and coalesce(t.body ->> 'origin', '') = 'new'
  on conflict (athlete_id, kind, item, sub, tier) do nothing;

  -- the Grand Slam: a title in each of the four meanings (level, season and chosen titles do not count), from Career Mode's titles and the
  -- Proof titles the athlete owns (hab_titles, or claimed on the phone)
  insert into public.career_awards (athlete_id, kind, item, sub, tier, day, xp, size, how, evidence)
  select p_athlete, 'title', 'grand_slam', '', 0, current_date, 0, 'legend', case when p_baseline then 'baseline' else 'earned' end,
         jsonb_build_object('meanings', 4)
   where exists (select 1 from public.career_catalogue g where g.kind = 'title' and g.id = 'grand_slam')
     and (select count(distinct t.body ->> 'meaning') from public.career_catalogue t
           where t.kind = 'title' and t.body ->> 'meaning' in ('consistency', 'commitment', 'progress', 'resilience')
             and (exists (select 1 from public.career_awards w where w.athlete_id = p_athlete and w.kind = 'title' and w.item = t.id)
                  or (t.body ? 'proof_id' and (exists (select 1 from public.hab_titles ht where ht.athlete_id = p_athlete and ht.title = t.body ->> 'proof_id')
                                               or jsonb_exists(coalesce(v_pcfg #> '{pass,owned}', '[]'::jsonb), t.body ->> 'proof_id'))))) = 4
  on conflict (athlete_id, kind, item, sub, tier) do nothing;

  -- a Career Mode title can be worn: set_title() accepts a title the server minted into hab_titles ('c_' + its id)
  insert into public.hab_titles (athlete_id, title)
  select w.athlete_id, 'c_' || w.item from public.career_awards w where w.athlete_id = p_athlete and w.kind = 'title'
  on conflict (athlete_id, title) do nothing;

  -- ── the measures an app shows beside a badge ───────────────────────────────────────────────────────────────────────────────
  -- weeks held in a row: only a broken week ends a run (get_profile()'s count)
  v_wnow := 0; v_wbest := 0;
  for v_f in select f.kind from career_f f where f.kind in ('week_held', 'week_broken') order by f.day, f.ref loop
    if v_f.kind = 'week_held' then v_wnow := v_wnow + 1; v_wbest := greatest(v_wbest, v_wnow); else v_wnow := 0; end if;
  end loop;
  v_wk := jsonb_build_object('now', v_wnow, 'best', v_wbest);
  select coalesce(jsonb_object_agg(z.id, z.m), '{}'::jsonb) into v_measures from (
    select c.id, jsonb_strip_nulls(jsonb_build_object('n',
      case
        when c.body ->> 'kind' = 'total' then
          (select count(*) from career_p f
            where f.kind = any (case when jsonb_typeof(c.body -> 'counts') = 'array' then array(select jsonb_array_elements_text(c.body -> 'counts'))
                                     else array[c.body ->> 'counts'] end))::numeric
        when c.body ->> 'kind' = 'best_run' and c.body ->> 'counts' = 'week_held' then (v_wk ->> 'best')::numeric
        when c.body ->> 'kind' = 'best_value' then
          (select max(public.career_num(f.value -> 'pct')) from career_f f
            where f.kind = 'lift_gain' and public.career_lift_counts(f.value ->> 'lift', c.body -> 'patterns'))
        when c.body ->> 'kind' = 'best_run' and c.body ->> 'habit' is not null then
          (select max(m.need) from career_m m where m.mkind = 'best'
              and case when c.body ->> 'habit' = 'custom' then (v_hr -> 'weights' ->> m.habit) is null else m.habit = c.body ->> 'habit' end)::numeric
        when c.id = 'day_streak' then (select m.need from career_m m where m.mkind = 'count' and m.code = 'dayStreak')::numeric
        when c.body ->> 'proof_measure' = 'daysWith3' then (select m.need from career_m m where m.mkind = 'count' and m.code = 'daysWith3')::numeric
        when c.body ->> 'proof_measure' = 'perfectDays' then (select m.need from career_m m where m.mkind = 'count' and m.code = 'perfectDays')::numeric
        when c.body ->> 'proof_measure' = 'comebackRun' then (select m.need from career_m m where m.mkind = 'count' and m.code = 'comebackRun')::numeric
      end,
      'now',
      case
        when c.body ->> 'kind' = 'best_run' and c.body ->> 'habit' is not null then
          (select max(m.xp) from career_m m where m.mkind = 'best'
              and case when c.body ->> 'habit' = 'custom' then (v_hr -> 'weights' ->> m.habit) is null else m.habit = c.body ->> 'habit' end)
        when c.body ->> 'kind' = 'best_run' and c.body ->> 'counts' = 'week_held' then (v_wk ->> 'now')::numeric
        when c.id = 'day_streak' then (select m.need from career_m m where m.mkind = 'count' and m.code = 'dayStreakNow')::numeric
      end)) as m
      from public.career_catalogue c where c.kind = 'badge') z;
  return v_measures;
end $function$;

-- Runs evaluate for everyone at the catalogue switch (the seed): the past minted in silence. Returns how many awards it minted.
create or replace function public.career_catalogue_baseline() returns integer
language plpgsql set search_path to 'public' as $function$
declare a record; v_before integer; v_after integer;
begin
  select count(*) into v_before from public.career_awards;
  for a in select distinct f.athlete_id as id from public.career_facts f where f.void_at is null order by 1 loop
    perform public.career_evaluate(a.id, true);
  end loop;
  select count(*) into v_after from public.career_awards;
  return v_after - v_before;
end $function$;

-- ── 5. the score, with the awards ────────────────────────────────────────────────────────────────────────────────────────

-- What the awards pay in a window (career_only: none; an award is the work of the day it was reached).
create or replace function public.career_awards_xp(p_athlete text, p_from date, p_to date) returns bigint
language sql stable set search_path to 'public' as $function$
  select coalesce(sum(w.xp), 0)::bigint from public.career_awards w
   where w.athlete_id = p_athlete and w.day between coalesce(p_from, '-infinity'::date) and coalesce(p_to, 'infinity'::date)
$function$;

-- The score of a window (stage69), and from the catalogue switch: the ladders and marks out of the habit half, the awards in.
create or replace function public.career_score(p_athlete text, p_season date, p_from date, p_to date) returns jsonb
language plpgsql stable set search_path to 'public' as $function$
declare v_now jsonb := public.career_rules_now(); v_rules jsonb := public.career_habit_rules(); v_paid jsonb; v_bonus_rules jsonb; v_log jsonb; v_cfg jsonb;
        v_daily bigint := 0; v_bonus bigint := 0; v_facts jsonb; v_rest numeric; v_aw bigint := 0;
begin
  if v_rules is null then return null; end if;
  v_paid := public.career_paid_rules(v_rules, v_now);
  v_bonus_rules := public.career_bonus_rules(v_rules, v_now);
  v_log := public.career_log(p_athlete);
  v_cfg := public.career_cfg(p_athlete);
  v_daily := public.hab_xp(v_log, p_from, p_to, v_paid);
  v_bonus := public.hab_bonus_xp(v_log, v_cfg, p_season, p_from, p_to, v_bonus_rules);
  if public.career_switch_day(v_now, 'catalogue') is not null then
    v_aw := public.career_awards_xp(p_athlete, p_from, p_to);
  end if;
  select coalesce(jsonb_object_agg(x.kind, jsonb_build_object('n', x.n, 'xp', x.xp)), '{}'::jsonb), coalesce(sum(x.xp), 0)
    into v_facts, v_rest
    from public.career_facts_xp(p_athlete, p_from, p_to) x;
  return jsonb_build_object('habits', jsonb_build_object('daily', v_daily, 'bonus', v_bonus, 'xp', v_daily + v_bonus),
                            'facts', v_facts, 'facts_xp', round(v_rest)::bigint, 'awards_xp', v_aw,
                            'xp', (v_daily + v_bonus + round(v_rest) + v_aw)::bigint);
end $function$;

-- An athlete's whole score (stage69), and from the catalogue switch the awards: career, this season and the rolling week each count the awards
-- dated inside them, and the habit half pays the ladders and marks no more (the awards do).
create or replace function public.career_compute(p_athlete text) returns jsonb
language plpgsql stable set search_path to 'public' as $function$
declare
  v_rules jsonb := public.career_rules_now(); v_hr jsonb; v_paid jsonb; v_br jsonb; v_log jsonb; v_cfg jsonb; v_cat boolean;
  v_name text; v_start date; v_s date; v_wfrom date; v_today date := current_date;
  c_d bigint; c_b bigint; s_d bigint; s_b bigint; w_d bigint; w_b bigint; c_a bigint := 0; s_a bigint := 0; w_a bigint := 0;
  c_f jsonb; c_r numeric; s_f jsonb; s_r numeric; w_r numeric; v_cxp bigint; v_sxp bigint;
begin
  if v_rules is null or p_athlete is null then return null; end if;
  v_hr := public.career_habit_rules();
  v_paid := public.career_paid_rules(v_hr, v_rules);
  v_br := public.career_bonus_rules(v_hr, v_rules);
  v_cat := public.career_switch_day(v_rules, 'catalogue') is not null;
  v_log := public.career_log(p_athlete);
  v_cfg := public.career_cfg(p_athlete);
  select s.name, s.starts_on into v_name, v_start from public.current_season() s;
  v_s := coalesce(v_start, '1970-01-01'::date);
  v_wfrom := greatest(v_today - 6, v_s);
  c_d := public.hab_xp(v_log, null, v_today, v_paid);
  c_b := public.hab_bonus_xp(v_log, v_cfg, null, null, v_today, v_br);
  s_d := public.hab_xp(v_log, v_s, v_today, v_paid);
  s_b := public.hab_bonus_xp(v_log, v_cfg, v_s, v_s, v_today, v_br);
  w_d := public.hab_xp(v_log, v_wfrom, v_today, v_paid);
  w_b := public.hab_bonus_xp(v_log, v_cfg, v_s, v_wfrom, v_today, v_br);
  if v_cat then
    c_a := public.career_awards_xp(p_athlete, null, v_today);
    s_a := public.career_awards_xp(p_athlete, v_s, v_today);
    w_a := public.career_awards_xp(p_athlete, v_wfrom, v_today);
  end if;
  with p as (select x.* from public.career_facts_paid(p_athlete) x where x.day <= v_today)
  select coalesce((select jsonb_object_agg(z.kind, jsonb_build_object('n', z.n, 'xp', z.xp))
                     from (select p.kind, count(*) as n, sum(p.xp) as xp from p group by p.kind) z), '{}'::jsonb),
         coalesce((select sum(p.xp) from p), 0),
         coalesce((select jsonb_object_agg(z.kind, jsonb_build_object('n', z.n, 'xp', z.xp))
                     from (select p.kind, count(*) as n, sum(p.xp) as xp from p where p.day >= v_s and not p.career_only group by p.kind) z),
                  '{}'::jsonb),
         coalesce((select sum(p.xp) from p where p.day >= v_s and not p.career_only), 0),
         coalesce((select sum(p.xp) from p where p.day >= v_wfrom and not p.career_only), 0)
    into c_f, c_r, s_f, s_r, w_r;
  v_cxp := (c_d + c_b + round(c_r) + c_a)::bigint;
  v_sxp := (s_d + s_b + round(s_r) + s_a)::bigint;
  return jsonb_build_object(
    'career', jsonb_build_object('habits', jsonb_build_object('daily', c_d, 'bonus', c_b, 'xp', c_d + c_b),
                                 'facts', c_f, 'facts_xp', round(c_r)::bigint, 'awards_xp', c_a, 'xp', v_cxp)
              || public.career_level(v_cxp, v_rules),
    'season', jsonb_build_object('name', v_name, 'starts_on', v_start, 'points', v_sxp,
                                 'parts', jsonb_build_object('habits', jsonb_build_object('daily', s_d, 'bonus', s_b, 'xp', s_d + s_b),
                                                             'facts', s_f, 'facts_xp', round(s_r)::bigint, 'awards_xp', s_a, 'xp', v_sxp)),
    'week', jsonb_build_object('from', v_wfrom, 'points', (w_d + w_b + round(w_r) + w_a)::bigint));
end $function$;

-- An athlete's score from the cache (stage69). From the catalogue switch, a recompute first mints what the facts now earn (career_evaluate()),
-- and the score carries the badges' measures.
create or replace function public.career_scored(p_athlete text, p_recompute boolean default true) returns jsonb
language plpgsql set search_path to 'public' as $function$
#variable_conflict use_column
declare v_stamp text; v_old text; v_score jsonb; v_meas jsonb;
begin
  if p_athlete is null or public.career_rules_now() is null then return null; end if;
  v_stamp := public.career_stamp(p_athlete);
  select c.stamp, c.score into v_old, v_score from public.career_scores c where c.athlete_id = p_athlete;
  if v_old = v_stamp then return v_score; end if;
  if v_old is not null and not p_recompute then return v_score || '{"stale": true}'::jsonb; end if;
  v_meas := public.career_evaluate(p_athlete, false);
  v_score := public.career_compute(p_athlete);
  if v_score is null then return null; end if;
  if v_meas is not null then v_score := v_score || jsonb_build_object('measures', v_meas); end if;
  insert into public.career_scores as c (athlete_id, stamp, score, updated_at) values (p_athlete, v_stamp, v_score, now())
  on conflict on constraint career_scores_pkey do update set stamp = excluded.stamp, score = excluded.score, updated_at = now();
  return v_score;
end $function$;

-- The scores of many athletes at once (stage69), minting first from the catalogue switch, as career_scored().
create or replace function public.career_scores_for(p_ids text[], p_budget interval default interval '2.5 seconds')
returns table (athlete_id text, score jsonb)
language plpgsql set search_path to 'public' as $function$
#variable_conflict use_column
declare v_t0 timestamptz := clock_timestamp(); v_id text; v_stamp text; v_old text; v_cached jsonb; v_score jsonb; v_meas jsonb;
begin
  if public.career_rules_now() is null then return; end if;
  for v_id in select distinct x.id from unnest(coalesce(p_ids, '{}'::text[])) as x(id) where x.id is not null order by 1 loop
    v_stamp := public.career_stamp(v_id);
    v_old := null; v_cached := null;
    select c.stamp, c.score into v_old, v_cached from public.career_scores c where c.athlete_id = v_id;
    if v_old is not null and (v_old = v_stamp or clock_timestamp() - v_t0 > p_budget) then
      athlete_id := v_id; score := v_cached; return next;
      continue;
    end if;
    v_meas := public.career_evaluate(v_id, false);
    v_score := public.career_compute(v_id);
    if v_score is null then continue; end if;
    if v_meas is not null then v_score := v_score || jsonb_build_object('measures', v_meas); end if;
    insert into public.career_scores as c (athlete_id, stamp, score, updated_at) values (v_id, v_stamp, v_score, now())
    on conflict on constraint career_scores_pkey do update set stamp = excluded.stamp, score = excluded.score, updated_at = now();
    athlete_id := v_id; score := v_score; return next;
  end loop;
end $function$;

-- ── 6. the profile: the shelf, the moments, the reveal (P10, P8) ─────────────────────────────────────────────────────────

-- Which app celebrates an award: AA Proof for what the habit log earns, the training app for the rest (P8; the contract in PROCEDURES.md).
create or replace function public.career_award_app(p_kind text, p_body jsonb) returns text
language sql immutable set search_path to 'public' as $function$
  select case when p_body ->> 'origin' = 'proof' or p_body ? 'habit' or p_body ->> 'reads' = 'habit_done'
                   or p_body ->> 'counts' = 'habit_done' or p_body ->> 'kind' = 'per_habit_best_run' then 'habits'
              else 'training' end
$function$;

-- The shelf: every badge (with its steps, the athlete's measure and the next step), every achievement, the Career Mode titles owned and the
-- Grand Slam's four slots. Retired entries only when owned.
create or replace function public.career_shelf(p_athlete text, p_measures jsonb) returns jsonb
language sql stable set search_path to 'public' as $function$
  with cat as (select c.kind, c.id, c.body from public.career_catalogue c),
  aw as (select * from public.career_awards w where w.athlete_id = p_athlete),
  ord as (select c.kind, c.id, row_number() over (partition by c.kind order by c.id) as n from cat c),   -- a stable order inside a meaning
  badge_rows as (
    select c.id, coalesce(s.sub, '') as sub, c.body,
           coalesce(c.body ->> 'retire_at', '') = 'catalogue' as retired
      from cat c
      left join lateral (select distinct w.sub from aw w where w.kind = 'badge' and w.item = c.id and w.sub <> '') s on true
     where c.kind = 'badge'
  ),
  badges as (
    select b.id, b.sub, b.retired, b.body,
           (select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                     'tier', t.ord, 'at', t.v -> 'at', 'metal', t.v -> 'metal', 'xp', coalesce(w.xp::text::jsonb, t.v -> 'xp'),
                     'size', t.v -> 'size', 'tier_name', t.v -> 'tier_name', 'title', t.v -> 'title',
                     'day', w.day, 'how', w.how)) order by t.ord), '[]'::jsonb)
              from jsonb_array_elements(b.body -> 'tiers') with ordinality t(v, ord)
              left join aw w on w.kind = 'badge' and w.item = b.id and w.sub = b.sub and w.tier = t.ord) as steps,
           (select max(w.tier) from aw w where w.kind = 'badge' and w.item = b.id and w.sub = b.sub) as tier
      from badge_rows b
  ),
  badges2 as (
    select x.*, (select s from jsonb_array_elements(x.steps) s where s ? 'day' order by (s ->> 'tier')::int desc limit 1) as top,
           (select s from jsonb_array_elements(x.steps) s where not (s ? 'day') order by (s ->> 'tier')::int limit 1) as nxt
      from badges x
     where not x.retired or x.tier is not null
  ),
  achs as (
    select c.id, c.body, coalesce(c.body ->> 'retire_at', '') = 'catalogue' as retired, w.day, w.how
      from cat c left join aw w on w.kind = 'achievement' and w.item = c.id
     where c.kind = 'achievement' and (coalesce(c.body ->> 'retire_at', '') <> 'catalogue' or w.day is not null)
  ),
  slam as (
    select m.meaning,
           (select t.id from cat t
             where t.kind = 'title' and t.body ->> 'meaning' = m.meaning
               and (exists (select 1 from aw w where w.kind = 'title' and w.item = t.id)
                    or (t.body ? 'proof_id' and (exists (select 1 from public.hab_titles ht where ht.athlete_id = p_athlete and ht.title = t.body ->> 'proof_id')
                                                 or jsonb_exists(coalesce((select public.hab_cfg_of(ap.data, p_athlete) #> '{pass,owned}' from public.athlete_progress ap
                                                                            where ap.athlete_id = p_athlete), '[]'::jsonb), t.body ->> 'proof_id'))))
             order by t.id limit 1) as title
      from unnest(array['consistency', 'commitment', 'progress', 'resilience']) as m(meaning)
  )
  select jsonb_build_object(
    'badges', coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', b.id, 'name', b.body ->> 'name', 'meaning', b.body ->> 'meaning', 'kind', b.body ->> 'kind', 'habit', b.body ->> 'habit',
        'free', coalesce((b.body ->> 'free')::boolean, false), 'origin', b.body ->> 'origin', 'retired', b.retired,
        'superseded_by', b.body -> 'superseded_by', 'sub', nullif(b.sub, ''),
        'caption', replace(coalesce(b.body ->> 'caption', ''), '{n}',
                           coalesce(regexp_replace(round((p_measures -> b.id ->> 'n')::numeric, 1)::text, '\.0$', ''), '0')),
        'n', p_measures -> b.id -> 'n', 'now', p_measures -> b.id -> 'now',
        'tier', coalesce(b.tier, 0), 'metal', b.top -> 'metal',
        'steps', b.steps,
        'next', case when b.nxt is not null then jsonb_build_object('tier', b.nxt -> 'tier', 'at', b.nxt -> 'at', 'metal', b.nxt -> 'metal', 'xp', b.nxt -> 'xp') end,
        'app', public.career_award_app('badge', b.body)))
        order by b.retired, b.body ->> 'meaning', (select o.n from ord o where o.kind = 'badge' and o.id = b.id), b.sub)
        from badges2 b), '[]'::jsonb),
    'achievements', coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', a.id, 'name', a.body ->> 'name', 'meaning', a.body ->> 'meaning', 'size', a.body ->> 'size', 'xp', a.body -> 'xp',
        'caption', a.body ->> 'caption', 'rule', a.body ->> 'rule', 'free', coalesce((a.body ->> 'free')::boolean, false),
        'origin', a.body ->> 'origin', 'retired', a.retired, 'title', a.body ->> 'title', 'day', a.day, 'how', a.how,
        'app', public.career_award_app('achievement', a.body)))
        order by a.retired, a.body ->> 'meaning', a.id)
        from achs a), '[]'::jsonb),
    'titles', coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', w.item, 'name', t.body ->> 'name', 'meaning', t.body ->> 'meaning', 'metal', t.body ->> 'metal', 'from', t.body ->> 'from',
        'day', w.day)) order by w.day, w.item)
        from aw w join cat t on t.kind = 'title' and t.id = w.item where w.kind = 'title'), '[]'::jsonb),
    'grand_slam', (select jsonb_object_agg(s.meaning, s.title) from slam s)
                  || jsonb_build_object('done', (select w.day from aw w where w.kind = 'title' and w.item = 'grand_slam')))
$function$;

-- The moments waiting: rewards earned after the switch that no app has shown yet, biggest first, then newest (P8).
create or replace function public.career_moments(p_athlete text) returns jsonb
language sql stable set search_path to 'public' as $function$
  select coalesce(jsonb_agg(m.j order by m.rank desc, m.day desc, m.key), '[]'::jsonb) from (
    select w.kind || ':' || w.item || ':' || w.sub || ':' || w.tier as key, w.day,
           case w.size when 'legend' then 4 when 'milestone' then 3 when 'highlight' then 2 when 'win' then 1 else 0 end as rank,
           jsonb_strip_nulls(jsonb_build_object(
             'key', w.kind || ':' || w.item || ':' || w.sub || ':' || w.tier, 'kind', w.kind, 'id', w.item, 'tier', w.tier,
             'name', c.body ->> 'name', 'meaning', c.body ->> 'meaning',
             'metal', case when w.kind = 'badge' then c.body -> 'tiers' -> (w.tier - 1) ->> 'metal' when w.kind = 'title' then c.body ->> 'metal' end,
             'tier_name', case when w.kind = 'badge' then c.body -> 'tiers' -> (w.tier - 1) ->> 'tier_name' end,
             'size', w.size, 'xp', w.xp, 'day', w.day,
             'caption', case when w.kind = 'title' then c.body ->> 'from'
                             else replace(coalesce(c.body ->> 'caption', ''), '{n}', coalesce(c.body -> 'tiers' -> (w.tier - 1) ->> 'at', '')) end,
             'title', case when w.kind = 'badge' then c.body -> 'tiers' -> (w.tier - 1) ->> 'title' else c.body ->> 'title' end,
             'app', case when w.kind = 'title' then 'training' else public.career_award_app(w.kind, c.body) end)) as j
      from public.career_awards w
      join public.career_catalogue c on c.kind = w.kind and c.id = w.item
     where w.athlete_id = p_athlete and w.how = 'earned' and w.told_at is null and w.size <> 'tick'
     order by 3 desc, w.day desc limit 20) m
$function$;

-- The profile (stage69), with the shelf, the moments and the reveal once the catalogue switch is on.
create or replace function public.get_profile(p_athlete_id text default null) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_me text := public.current_athlete_id();
  v_id text := coalesce(nullif(btrim(coalesce(p_athlete_id, '')), ''), v_me);
  v_rules jsonb; v_score jsonb; v_now integer := 0; v_best integer := 0; f record; v_xp date; v_cat date; v_out jsonb;
begin
  if v_id is null then
    raise exception 'not signed in';
  end if;
  if not (public.is_coach() or v_id is not distinct from v_me or coalesce(auth.jwt() ->> 'role', '') in ('', 'service_role')) then
    raise exception 'not your profile';
  end if;
  v_rules := public.career_rules_now();
  if v_rules is null then
    return jsonb_build_object('athlete_id', v_id, 'ready', false);
  end if;
  perform public.career_derive(v_id);
  v_score := coalesce(public.career_scored(v_id), '{}'::jsonb);
  v_xp := public.career_switch_day(v_rules, 'xp');
  v_cat := public.career_switch_day(v_rules, 'catalogue');
  for f in select cf.kind from public.career_facts cf
            where cf.athlete_id = v_id and cf.void_at is null and cf.kind in ('week_held', 'week_broken')
            order by cf.day, cf.ref loop
    if f.kind = 'week_held' then v_now := v_now + 1; v_best := greatest(v_best, v_now); else v_now := 0; end if;
  end loop;
  v_out := jsonb_build_object(
    'athlete_id', v_id,
    'ready', true,
    'shadow', v_xp is null,
    'switch', jsonb_build_object('xp', v_xp, 'catalogue', v_cat),
    'rules_version', (select max(r.version) from public.career_rules r),
    'career', v_score -> 'career',
    'season', v_score -> 'season',
    'week', v_score -> 'week',
    'since', (select min(cf.day) from public.career_facts cf
               where cf.athlete_id = v_id and cf.void_at is null
                 and cf.kind in ('habit_day', 'session_finished', 'session_finished_early', 'library_session')),
    'kept', (select cf.value from public.career_facts cf
              where cf.athlete_id = v_id and cf.kind = 'level_kept' and cf.ref = 'xp-switch' and cf.void_at is null),
    'numbers', (select jsonb_build_object(
                  'weeks_held', jsonb_build_object('now', v_now, 'best', v_best),
                  'sessions_with_amir', count(*) filter (where cf.kind in ('session_finished', 'session_finished_early')),
                  'personal_bests', count(*) filter (where cf.kind = 'personal_best'),
                  'comebacks', count(*) filter (where cf.kind = 'comeback'),
                  'days_on_target', count(*) filter (where cf.kind = 'day_on_target'),
                  'perfect_days', count(*) filter (where cf.kind = 'perfect_day'))
                  from public.career_facts cf where cf.athlete_id = v_id and cf.void_at is null),
    'titles_owned', coalesce((select jsonb_agg(t.title order by t.earned_on, t.title) from public.hab_titles t where t.athlete_id = v_id), '[]'::jsonb),
    'rules', jsonb_build_object(
      'version', (select max(r.version) from public.career_rules r),
      'level', jsonb_build_object('base', v_rules #> '{level,base}', 'growth', v_rules #> '{level,growth}',
                                  'ranks', v_rules #> '{level,ranks}', 'levels_per_rank', v_rules #> '{level,levels_per_rank}',
                                  'prestige_after', v_rules #> '{level,prestige_after}'),
      'season', jsonb_build_object('title_points', v_rules #> '{season,title_points}'),
      'prices', coalesce((select jsonb_object_agg(k.key, public.career_num(v_rules #> array['fact', k.key, 'xp']))
                            from unnest(array['session_finished', 'session_finished_early', 'full_log', 'checkin_done', 'week_held',
                                              'bounce_back', 'training_return', 'library_session', 'retest_done']) as k(key)
                           where public.career_num(v_rules #> array['fact', k.key, 'xp']) is not null), '{}'::jsonb)),
    'badges', '[]'::jsonb, 'achievements', '[]'::jsonb, 'missions', '[]'::jsonb, 'quest', null, 'moments', '[]'::jsonb
  );
  if v_cat is not null then
    v_out := v_out || jsonb_build_object(
      'shelf', public.career_shelf(v_id, coalesce(v_score -> 'measures', '{}'::jsonb)),
      'moments', public.career_moments(v_id),
      'reveal', (select case when count(*) filter (where w.told_at is null) > 0 then jsonb_build_object(
                   'badges', count(distinct w.item || ':' || w.sub) filter (where w.kind = 'badge' and coalesce(c.body ->> 'retire_at', '') <> 'catalogue'),
                   'steps', count(*) filter (where w.kind = 'badge'),
                   'achievements', count(*) filter (where w.kind = 'achievement'),
                   'titles', count(*) filter (where w.kind = 'title'), 'xp', coalesce(sum(w.xp), 0), 'since', min(w.day)) end
                   from public.career_awards w left join public.career_catalogue c on c.kind = w.kind and c.id = w.item
                  where w.athlete_id = v_id and w.how in ('baseline', 'carried')));
  end if;
  return v_out;
end $function$;

-- An athlete's app marks moments shown (P8 step 6): the keys of get_profile()'s moments, or 'reveal' for the switch's past rewards. Only the
-- signed-in athlete, on their own awards (the coach's preview never calls it). Returns how many rows it marked.
create or replace function public.career_told(p_keys text[]) returns integer
language plpgsql security definer set search_path to 'public' as $function$
declare v_me text := public.current_athlete_id(); v_n integer := 0; v_k integer;
begin
  if v_me is null then
    raise exception 'not signed in';
  end if;
  if 'reveal' = any (coalesce(p_keys, '{}')) then
    update public.career_awards w set told_at = now()
     where w.athlete_id = v_me and w.how in ('baseline', 'carried') and w.told_at is null;
    get diagnostics v_n = row_count;
  end if;
  update public.career_awards w set told_at = now()
   where w.athlete_id = v_me and w.told_at is null
     and (w.kind || ':' || w.item || ':' || w.sub || ':' || w.tier) = any (coalesce(p_keys, '{}'));
  get diagnostics v_k = row_count;
  return v_n + v_k;
end $function$;

-- ── 7. the seed: the catalogue switch ────────────────────────────────────────────────────────────────────────────────────

-- stage69's seed, and: the seed that turns the catalogue switch on mints the past for everyone (career_catalogue_baseline()) and returns
-- every athlete's line (the career level and XP before and after, what was minted); it refuses if anyone's level would go down. A seed whose
-- rulebook numbers did not change runs no backfill: no fact depends on the catalogue or a switch. p_dry_run => true does all of it, then
-- undoes it: the list Amir reads before the switch.
create or replace function public.career_seed(p_version integer, p_rules jsonb, p_catalogue jsonb, p_source text,
                                              p_dry_run boolean default false) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_newest integer; v_n integer; v_old jsonb := public.career_rules_now(); v_which text; v_was date; v_will text;
  v_xp_on date; v_cat_on date; v_turn_on boolean; v_turn_cat boolean; v_same boolean; v_backfill jsonb; v_levels jsonb; v_out jsonb;
  v_before jsonb := '{}'::jsonb; v_cat_list jsonb; v_minted integer; v_down text;
begin
  if p_version is null or p_version < 1 then
    raise exception 'the rulebook version must be a whole number from 1';
  end if;
  if jsonb_typeof(p_rules) is distinct from 'object' or public.career_num(p_rules -> 'version') is distinct from p_version then
    raise exception 'the rulebook must be an object whose version is %', p_version;
  end if;
  if jsonb_typeof(p_catalogue) is distinct from 'array' then
    raise exception 'the catalogue must be a JSON array of {kind, id, body}';
  end if;
  select max(r.version) into v_newest from public.career_rules r;
  if v_newest is not null and p_version < v_newest then
    raise exception 'rulebook version % is older than the one loaded (%): nothing was changed', p_version, v_newest;
  end if;
  foreach v_which in array array['xp', 'catalogue'] loop
    v_will := p_rules #>> array['switch', v_which];
    v_was := public.career_switch_day(v_old, v_which);
    if v_will is not null and v_will <> 'off' and v_will !~ '^\d{4}-\d{2}-\d{2}$' then
      raise exception 'rulebook.toml → [switch] % must be "off" or a day (YYYY-MM-DD), found %: nothing was changed', v_which, v_will;
    end if;
    if v_will ~ '^\d{4}-\d{2}-\d{2}$' and v_will::date > current_date then
      raise exception 'rulebook.toml → [switch] % is %, a day still to come: turn a switch on on the day it happens. Nothing was changed', v_which, v_will;
    end if;
    if v_was is not null and coalesce(v_will, 'off') = 'off' then
      raise exception 'the % switch is on (since %) and is never turned back off: it would take every athlete''s level back. Nothing was changed (the way back is scripts/career/rollback_stage69.sql or rollback_stage70.sql, on Amir''s word)', v_which, v_was;
    end if;
    if v_was is not null and v_will ~ '^\d{4}-\d{2}-\d{2}$' and v_will::date <> v_was then
      raise exception 'the % switch went on on % and its day never moves (found %): nothing was changed', v_which, v_was, v_will;
    end if;
  end loop;
  if public.career_switch_day(p_rules, 'catalogue') is not null and public.career_switch_day(p_rules, 'xp') is null then
    raise exception 'the catalogue switch (phase 3) needs the XP switch (phase 2) on first: nothing was changed';
  end if;
  v_xp_on := public.career_switch_day(p_rules, 'xp');
  v_cat_on := public.career_switch_day(p_rules, 'catalogue');
  v_turn_on := v_xp_on is not null and public.career_switch_day(v_old, 'xp') is null;
  v_turn_cat := v_cat_on is not null and public.career_switch_day(v_old, 'catalogue') is null;
  -- no fact depends on the catalogue or a switch: only a change to the rulebook's numbers needs the facts worked out again
  v_same := v_old is not null and (v_old - 'version' - 'switch' - 'shadow') = (p_rules - 'version' - 'switch' - 'shadow');

  if v_turn_cat then   -- every athlete's career before the switch, from the rules still loaded
    select coalesce(jsonb_object_agg(z.id, jsonb_build_object('xp', z.xp, 'level', (public.career_level(z.xp, v_old) ->> 'level')::int)), '{}'::jsonb)
      into v_before
      from (select a.id, coalesce((public.career_score(a.id, null, null, current_date) ->> 'xp')::bigint, 0) as xp
              from (select distinct f.athlete_id as id from public.career_facts f where f.void_at is null) a) z;
  end if;

  begin
    insert into public.career_rules (version, rules, source, loaded_at) values (p_version, p_rules, p_source, now())
    on conflict (version) do update set rules = excluded.rules, source = excluded.source, loaded_at = now();
    delete from public.career_catalogue;
    insert into public.career_catalogue (kind, id, body, version, loaded_at)
    select x.kind, x.id, x.body, p_version, now()
      from jsonb_to_recordset(p_catalogue) as x(kind text, id text, body jsonb);
    get diagnostics v_n = row_count;
    v_backfill := case when v_same then jsonb_build_object('skipped', 'the rulebook''s numbers did not change: no fact depends on the catalogue or a switch')
                       else public.career_backfill(null) end;
    if v_turn_on then
      v_levels := public.career_keep_levels(v_xp_on);
    end if;
    if v_turn_cat then
      v_minted := public.career_catalogue_baseline();
      select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
               'athlete_id', z.id, 'name', z.name,
               'xp_before', (v_before -> z.id ->> 'xp')::bigint, 'level_before', (v_before -> z.id ->> 'level')::int,
               'xp', z.xp, 'level', (public.career_level(z.xp, p_rules) ->> 'level')::int,
               'xp_added', z.xp - coalesce((v_before -> z.id ->> 'xp')::bigint, 0),
               'badges', z.b, 'achievements', z.a, 'titles', z.t, 'carried', z.c, 'paid', z.p)) order by z.id), '[]'::jsonb)
        into v_cat_list
        from (select a.id,
                     coalesce(nullif(btrim(concat_ws(' ', p.data #>> '{athlete,firstName}', p.data #>> '{athlete,lastName}')), ''), o.display_name) as name,
                     coalesce((public.career_score(a.id, null, null, current_date) ->> 'xp')::bigint, 0) as xp,
                     (select count(*) from public.career_awards w where w.athlete_id = a.id and w.kind = 'badge') as b,
                     (select count(*) from public.career_awards w where w.athlete_id = a.id and w.kind = 'achievement') as a,
                     (select count(*) from public.career_awards w where w.athlete_id = a.id and w.kind = 'title') as t,
                     (select count(*) from public.career_awards w where w.athlete_id = a.id and w.how = 'carried') as c,
                     (select count(*) from public.career_awards w where w.athlete_id = a.id and w.how = 'baseline' and w.xp > 0) as p
                from (select distinct f.athlete_id as id from public.career_facts f where f.void_at is null) a
                left join public.programs p on p.athlete_id = a.id
                left join public.leaderboard_optin o on o.athlete_id = a.id) z;
      select string_agg(e ->> 'athlete_id' || ' ' || (e ->> 'level_before') || ' → ' || (e ->> 'level'), ', ') into v_down
        from jsonb_array_elements(v_cat_list) e where (e ->> 'level')::int < (e ->> 'level_before')::int;
      if v_down is not null then
        raise exception 'the catalogue switch would take a level down (%): nothing was changed', v_down;
      end if;
    end if;
    v_out := jsonb_strip_nulls(jsonb_build_object(
      'version', p_version, 'catalogue', v_n, 'backfill', v_backfill,
      'switch', jsonb_build_object('xp', coalesce(v_xp_on::text, 'off'), 'catalogue', coalesce(v_cat_on::text, 'off')),
      'turned_on', case when v_turn_on and v_turn_cat then 'xp, catalogue' when v_turn_on then 'xp' when v_turn_cat then 'catalogue' end,
      'levels', v_levels, 'minted', v_minted, 'athletes', v_cat_list));
    if p_dry_run then
      raise exception using errcode = 'P0001', message = 'career_seed: dry run';
    end if;
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'career_seed: dry run' then
      raise;
    end if;
    v_out := v_out || jsonb_build_object('dry_run', true, 'note', 'a dry run: everything above was worked out, then undone');
  end;
  return v_out;
end $function$;

-- ── 8. the shadow check, after the catalogue switch too ──────────────────────────────────────────────────────────────────

-- stage69's compare, and from the catalogue switch both sides leave out the ladders and the marks (only the awards pay them now: Proof's own
-- xp_rules row still carries them, for its phone's fallback), so it compares the daily XP, the quests, the comebacks and the day gate.
create or replace function public.career_compare(p_season date default null) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_x jsonb; v_r jsonb; v_xp jsonb; v_rp jsonb; v_xb jsonb; v_rb jsonb; v_now jsonb := public.career_rules_now(); v_settle date;
  v_s date; v_t date := current_date; v_wk date; a record; v_cat boolean;
  v_log jsonb; v_cfg jsonb; v_cl jsonb; v_cc jsonb; v_rows jsonb := '[]'::jsonb; v_bad integer := 0; v_n integer := 0; v_settled integer := 0;
  p_season_xp bigint; c_season_xp bigint; p_week bigint; c_week bigint; p_all bigint; c_all bigint;
  v_probe jsonb; v_facts jsonb; v_row_ok boolean; v_diff jsonb; v_closed integer;
begin
  select x.rules into v_x from public.xp_rules x where x.id = 1;
  v_r := public.career_habit_rules();
  if v_x is null or v_r is null then
    raise exception 'nothing to compare: xp_rules or the Career Mode rulebook is missing';
  end if;
  v_cat := public.career_switch_day(v_now, 'catalogue') is not null;
  v_xp := public.career_paid_rules(v_x, v_now);
  v_rp := public.career_paid_rules(v_r, v_now);
  v_xb := public.career_bonus_rules(v_x, v_now);
  v_rb := public.career_bonus_rules(v_r, v_now);
  v_settle := public.career_settled_before(v_now);
  v_s := coalesce(p_season, (select s.starts_on from public.current_season() s), '1970-01-01'::date);
  v_wk := greatest(v_t - 6, v_s);
  select coalesce(jsonb_agg(k.key order by k.key), '[]'::jsonb) into v_diff
    from jsonb_object_keys(v_r) as k(key)
   where k.key <> 'questRuns' and not (v_cat and k.key in ('tiers', 'milestones'))
     and public.career_canon(public.career_scoring(k.key, v_r -> k.key)) is distinct from public.career_canon(public.career_scoring(k.key, v_x -> k.key));
  for a in
    select ap.athlete_id, ap.data from public.athlete_progress ap
     where ap.data ? (ap.athlete_id || '_hab_log') order by ap.athlete_id
  loop
    v_n := v_n + 1;
    v_log := public.hab_log_of(a.data, a.athlete_id);
    v_cfg := public.hab_cfg_of(a.data, a.athlete_id);
    v_cl := public.career_log(a.athlete_id);
    v_cc := public.career_cfg(a.athlete_id);
    p_season_xp := public.hab_xp(v_log, v_s, v_t, v_xp) + public.hab_bonus_xp(v_log, v_cfg, v_s, v_s, v_t, v_xb);
    c_season_xp := public.hab_xp(v_cl, v_s, v_t, v_rp) + public.hab_bonus_xp(v_cl, v_cc, v_s, v_s, v_t, v_rb);
    p_week := public.hab_xp(v_log, v_wk, v_t, v_xp) + public.hab_bonus_xp(v_log, v_cfg, v_s, v_wk, v_t, v_xb);
    c_week := public.hab_xp(v_cl, v_wk, v_t, v_rp) + public.hab_bonus_xp(v_cl, v_cc, v_s, v_wk, v_t, v_rb);
    p_all := public.hab_xp(v_log, '1970-01-01', v_t, v_xp) + public.hab_bonus_xp(v_log, v_cfg, '1970-01-01', '1970-01-01', v_t, v_xb);
    c_all := public.hab_xp(v_cl, '1970-01-01', v_t, v_rp) + public.hab_bonus_xp(v_cl, v_cc, '1970-01-01', '1970-01-01', v_t, v_rb);
    v_probe := public.career_probe(v_log, v_cfg, v_s, v_t, v_x);
    select jsonb_build_object(
             'perfect', count(*) filter (where f.kind = 'perfect_day' and f.day between v_s and v_t),
             'on_target', count(*) filter (where f.kind = 'day_on_target' and f.day between v_s and v_t),
             'comebacks', count(*) filter (where f.kind = 'comeback' and f.day between v_s and v_t
                                             and public.career_day(f.value ->> 'prev') >= v_s))
      into v_facts
      from public.career_facts f where f.athlete_id = a.athlete_id and f.void_at is null;
    v_closed := case when v_settle is null then 0 else
      (select count(*)::int from (
         select coalesce(pl.key, cl.key) as k
           from (select e.key, e.value from jsonb_each(coalesce(v_log, '{}'::jsonb)) e
                  where e.key ~ '^\d{4}-\d{2}-\d{2}$' and jsonb_typeof(e.value) = 'object' and e.key < v_settle::text) pl
           full join (select e.key, e.value from jsonb_each(coalesce(v_cl, '{}'::jsonb)) e where e.key < v_settle::text) cl
             on cl.key = pl.key
          where pl.value is distinct from cl.value) z) end;
    v_row_ok := p_season_xp = c_season_xp and p_week = c_week and p_all = c_all and v_probe = v_facts;
    if not v_row_ok and v_closed > 0 then
      v_settled := v_settled + 1;
    elsif not v_row_ok then
      v_bad := v_bad + 1;
    end if;
    v_rows := v_rows || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'athlete_id', a.athlete_id, 'ok', v_row_ok,
      'settled', case when not v_row_ok and v_closed > 0 then true end, 'closed', nullif(v_closed, 0),
      'season', jsonb_build_object('proof', p_season_xp, 'career', c_season_xp),
      'week', jsonb_build_object('proof', p_week, 'career', c_week),
      'all', jsonb_build_object('proof', p_all, 'career', c_all),
      'probe', jsonb_build_object('proof', v_probe, 'facts', v_facts))));
  end loop;
  return jsonb_build_object('ok', v_bad = 0 and jsonb_array_length(v_diff) = 0, 'season_start', v_s, 'today', v_t,
                            'xp_switch', public.career_switch_day(v_now, 'xp'), 'catalogue_switch', public.career_switch_day(v_now, 'catalogue'),
                            'settled_before', v_settle,
                            'athletes', v_n, 'matched', v_n - v_bad - v_settled, 'settled', v_settled,
                            'rules_equal', jsonb_array_length(v_diff) = 0, 'rules_differ_on', v_diff, 'rows', v_rows);
end $function$;

-- ── 9. who may run what ──────────────────────────────────────────────────────────────────────────────────────────────────

-- As stage66 and stage69: every career_ function runs inside the server or from the service role; get_profile() and career_told() are open to
-- a signed-in athlete (their own; get_profile() also to the coach).
do $stage70_grants$
declare f text;
begin
  for f in
    select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname like 'career\_%' escape '\'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $stage70_grants$;
revoke all on function public.get_profile(text) from public, anon, authenticated;
grant execute on function public.get_profile(text) to authenticated, service_role;
grant execute on function public.career_told(text[]) to authenticated;

-- ── 10. coach_erase_person() learns career_awards ────────────────────────────────────────────────────────────────────────
-- Patched from its live definition, as stage69: the end of its table list must be found exactly once, or nothing is changed. The awards are
-- the athlete's own record, so an erasure takes them with the rest (P12: erasure is the one exception to "never taken back").
do $stage70_patch$
declare
  d text := pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure);
  s_old constant text := '''career_facts'', ''career_scores'']';
  s_new constant text := '''career_facts'', ''career_scores'', ''career_awards'']';
  n int;
begin
  if position(s_new in d) > 0 then
    return;      -- already patched: safe to run again
  end if;
  n := (length(d) - length(replace(d, s_old, ''))) / length(s_old);
  if n <> 1 then
    raise exception 'stage70: coach_erase_person() is not what this patch expects (the end of its table list was found % times, not once). Nothing was changed.', n;
  end if;
  execute replace(d, s_old, s_new);
end $stage70_patch$;
