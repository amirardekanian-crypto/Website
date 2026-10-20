-- stage95: a season counts what was DONE in it (2026-10-20)
--
-- Amir, on the Crew board: Ehsan A. had 3,507 season points and Elmira A. 3,280 two days into Season 1. Almost none of it was
-- training. Of Elmira's 3,280, 2,910 was 15 achievements and 370 her habits; of Ehsan's 3,507, 1,770 was achievements, and none
-- of those 24 achievements had been done in the season. His words: "every achievement from past season is theirs, its not gotten
-- back from them, and its xp is once given to them. why did you give the xp to them again this season? it should be deducted, and
-- the xp should only be counted from the activity in this season. if they finish an unfinished achievement now, they should get xp."
--
-- WHAT HAPPENED. When a new rulebook version brings achievements (versions 5, 9 and 10, on 19 and 20 October), everyone who had
-- already earned one is paid at once. Stage76 (D20, forward only) dates such a reward "no earlier than that version's start day",
-- so a 60-day sleep run that ended in September was dated 20 October, and 20 October is inside Season 1. The XP was paid ONCE and
-- is in the career, where it belongs; but the season board adds up every award dated inside the season, so the same XP showed
-- again as a season score for what was done before the season began.
--
-- WHAT CHANGES. An award now remembers the day its activity was done (`earned_on`, the unclamped day the test crossed on), and an
-- award dated inside a season whose activity was done BEFORE that season began is career-only: it stays in the career (the XP,
-- the level, Your moments, the awards list) and is left out of every season and week window. That is the flag
-- `career_facts_paid()` already carries for exactly this ("counts toward the career, never toward a window"); this stage is the
-- first award it is set on. An achievement finished in the season has `earned_on` inside it and counts, which is the second half
-- of what Amir asked for. Nothing is taken from anyone: no award is removed, no career XP or level moves.
--
-- ⚠️ Applying it re-reads every award that has no `earned_on` yet (career_earned_days(), the evaluator run without minting), sets
-- the day, empties the stamp of every cached score and works every score out again, so the board is right the moment it
-- returns. Baseline and live awards were never clamped, so for them earned_on = day.
--
-- The way back: scripts/career/rollback_stage95.sql (puts stage90's career_facts_paid() and stage92's career_mint() back, and
-- drops the column). Safe to re-run.

-- ── 1. The day an award's activity was done ─────────────────────────────────────────────────────────────────────────────────
alter table public.career_awards add column if not exists earned_on date;
comment on column public.career_awards.earned_on is
  'stage95: the day the activity behind the award was done (the day the test crossed on). `day` is where the award sits in time and can be later (D20 dates a reward a rule change reveals no earlier than that version''s start day); a season counts an award only when this day is inside it.';

-- the season a day belongs to (the newest season that had started by then); null before the first
create or replace function public.season_start_of(p_day date) returns date
language sql stable set search_path to 'public' as $function$
  select s.starts_on from public.seasons s where s.starts_on <= p_day order by s.starts_on desc, s.id desc limit 1
$function$;

-- ── 2. New awards write it ──────────────────────────────────────────────────────────────────────────────────────────────────
-- career_mint() word for word (stage70 / stage76) with ONE change: v_earned keeps the day the test crossed on before stage76's
-- clamp moves p_day, and the insert writes it.
create or replace function public.career_mint(p_athlete text, p_kind text, p_item text, p_tier integer, p_subject text, p_day date, p_body jsonb, p_tier_body jsonb, p_evidence jsonb, p_how text, p_ctx jsonb)
returns boolean
language plpgsql
set search_path to 'public'
as $function$
declare
  v_S date := (p_ctx ->> 'S')::date; v_hist boolean; v_pays boolean; v_xp integer; v_how text; v_size text; v_id text; v_n integer;
  v_earned date := p_day;   -- stage95
begin
  if p_athlete is null or p_day is null or v_S is null then return false; end if;
  -- stage76 (D20): a reward a rule change reveals for an earlier day is dated no earlier than that version's start day (forward only)
  if (select r.starts_on from public.career_rules r order by r.version desc limit 1) > p_day then p_day := (select r.starts_on from public.career_rules r order by r.version desc limit 1); end if;
  v_hist := p_day <= v_S;
  if coalesce(p_body, '{}'::jsonb) ? 'retire_at' and not v_hist then return false; end if;   -- never earned after the switch
  v_id := public.career_award_id(p_kind, p_item, p_tier, coalesce(p_subject, ''));
  v_pays := p_kind <> 'title' and public.career_award_pays(p_athlete, p_body, p_tier_body, p_day, p_ctx);
  v_xp := case when v_pays then greatest(coalesce(public.career_award_xp(p_kind, p_tier, coalesce(p_subject, ''), p_body, p_ctx -> 'hr'), 0), 0) else 0 end;
  v_how := case when v_hist then 'baseline' else p_how end;
  v_size := coalesce(p_tier_body ->> 'size', p_body ->> 'size', 'win');
  if v_size not in ('tick', 'win', 'highlight', 'milestone', 'legend') then v_size := 'win'; end if;
  insert into public.career_awards (athlete_id, award_id, kind, item, tier, subject, day, pays, xp, size, meaning, evidence, how, rules_version, earned_on)
  values (p_athlete, v_id, p_kind, p_item, p_tier, coalesce(p_subject, ''), p_day, v_pays, v_xp, v_size,
          coalesce(p_body ->> 'meaning', ''), coalesce(p_evidence, '{}'::jsonb), v_how, coalesce((p_ctx ->> 'version')::int, 0), least(v_earned, p_day))
  on conflict (athlete_id, award_id) do nothing;
  get diagnostics v_n = row_count;
  if v_n = 0 then return false; end if;
  if v_how = 'live' and v_size <> 'tick' and (p_kind <> 'title' or p_item = 'grand_slam') then
    insert into public.career_recognition (athlete_id, award_id, audience, size) values (p_athlete, v_id, 'athlete', v_size)
    on conflict (athlete_id, award_id, audience) do nothing;
  end if;
  -- stage78: no title is minted any more (round 5, L5), so no hab_titles row
  return true;
end $function$;

-- ── 3. The season, the week and the month leave out what was done before them ───────────────────────────────────────────────
-- career_facts_paid() word for word (stage90) with ONE change, the last column of the award branch: an award dated inside a season
-- whose activity was done before that season began is career-only.
create or replace function public.career_facts_paid(p_athlete text)
returns table(kind text, ref text, day date, xp numeric, career_only boolean)
language sql
stable
set search_path to 'public'
as $function$
  with v as (select r.version, r.starts_on, r.rules as j from public.career_rules r),   -- stage76
  f as (
    select f.kind, f.ref, f.day, f.value from public.career_facts f
     where f.athlete_id = p_athlete and f.void_at is null
       and f.kind not in ('habit_done', 'habit_day', 'workout_tick', 'comeback', 'award_kept')   -- stage78, stage90
  ),
  priced as (
    select f.*,
           case when r.j -> 'fact' -> f.kind ->> 'xp_from' = 'value' then coalesce(public.career_num(f.value -> 'xp'), 0)
                else coalesce(public.career_num(r.j -> 'fact' -> f.kind -> 'xp'), 0) end as xp,
           coalesce(r.j -> 'fact' -> f.kind -> 'career_only' = 'true'::jsonb, false) as conly,
           r.j -> 'fact' -> f.kind ->> 'limit_per' as per,
           coalesce(public.career_num(r.j -> 'fact' -> f.kind -> 'limit'), 0) as lim
      from f cross join lateral (select v.j from v where v.starts_on is null or v.starts_on <= f.day order by v.version desc limit 1) r   -- stage76
  ),
  weeks as (select * from public.career_weeks(p_athlete)),
  keyed as (
    select p.*,
           case p.per
             when 'plan_day_week' then
               coalesce((select 'c' || w.cycle_num || '|w' || w.week from weeks w
                          where p.day between w.wfrom and w.wto and (p.value ->> 'plan_day') = any (w.plan)
                          order by w.cstart desc limit 1),
                        'iso:' || to_char(p.day, 'IYYY-IW')) || '|d' || coalesce(p.value ->> 'plan_day', '')
             when 'week' then 'iso:' || to_char(p.day, 'IYYY-IW')
             when 'cycle' then split_part(p.ref, '|', 1)
           end as grp
      from priced p
  ),
  ranked as (
    select k.*, row_number() over (partition by case when k.per = 'plan_day_week' then 'session' else k.kind end, k.grp
                                   order by k.xp desc, k.day, k.ref) as rn
      from keyed k
  )
  select ranked.kind, ranked.ref, ranked.day, ranked.xp, ranked.conly
    from ranked
   where ranked.grp is null or ranked.rn <= ranked.lim
  union all
  -- stage76: the minted XP (D20, D12 reversed). stage95: career-only when its activity was done before the season its day sits in
  select 'award'::text, a.award_id, a.day, (case when not a.pays then 0 else a.xp end)::numeric,
         coalesce(a.earned_on < public.season_start_of(a.day), false)
    from public.career_awards a
   where a.athlete_id = p_athlete and public.career_catalogue_on()
  union all
  -- stage78: an award that left with the cut, paid as it was (its own XP, its own day, never career-only, only with the catalogue on)
  select 'award_kept'::text, k.ref, k.day, coalesce(public.career_num(k.value -> 'xp'), 0), false
    from public.career_facts k
   where k.athlete_id = p_athlete and k.kind = 'award_kept' and k.void_at is null and public.career_catalogue_on()
$function$;

-- ── 4. Where the awards already minted were really earned ──────────────────────────────────────────────────────────────────
-- The evaluator of career_evaluate() with nothing owned and nothing minted: for each badge tier and achievement the athlete has
-- crossed, the day the test crossed on. Read-only; the stage uses it once.
create or replace function public.career_earned_days(p_athlete text)
returns table(award_id text, earned date)
language plpgsql
set search_path to 'public'
as $function$
declare
  v_rules jsonb := public.career_rules_now(); v_S date; v_hr jsonb; v_ctx jsonb; v_commended boolean; v_cycles boolean := false;
  c record; t record; x jsonb; r jsonb; v_woken jsonb := '[]'::jsonb; v_keys text[] := '{}'::text[]; v_m jsonb;
begin
  if p_athlete is null or v_rules is null or not public.career_catalogue_on() then return; end if;
  v_S := public.career_switch_day(v_rules, 'catalogue');
  v_hr := public.career_habit_rules();
  v_ctx := jsonb_build_object(
    'S', v_S, 'hr', v_hr, 'targets', coalesce(v_hr -> 'targets', '{}'::jsonb),
    'custom', coalesce((select f.value -> 'custom' from public.career_facts f
                         where f.athlete_id = p_athlete and f.kind = 'habit_day' and f.void_at is null and jsonb_typeof(f.value -> 'custom') = 'array'
                         order by f.day desc limit 1), '[]'::jsonb),
    'weights', v_hr -> 'weights', 'cb', v_hr -> 'completionBonus', 'cx', v_hr -> 'customXp',
    'version', (select max(rr.version) from public.career_rules rr), 'owned', '{}'::jsonb);
  v_commended := exists (select 1 from public.career_facts f where f.athlete_id = p_athlete and f.kind = 'commendation' and f.void_at is null);
  for c in select cc.kind, cc.id, cc.body from public.career_catalogue cc where cc.kind in ('badge', 'achievement')
            order by (cc.kind = 'badge') desc, cc.id loop
    if c.body ->> 'meaning' = 'chosen' and not v_commended then continue; end if;
    if c.body ? 'retire_at' then continue; end if;
    if c.kind = 'achievement' and public.career_achievement_test(c.body) in ('patterns_in_cycle', 'cycle_proving') then v_cycles := true; end if;
    v_woken := v_woken || jsonb_build_array(jsonb_build_object('kind', c.kind, 'id', c.id, 'body', c.body));
    v_keys := v_keys || public.career_entry_keys(c.kind, c.body, v_ctx);
  end loop;
  if v_cycles then
    v_ctx := v_ctx || jsonb_build_object('cycles', coalesce((
      select jsonb_agg(jsonb_build_object('num', z.cycle_num, 'cstart', z.cstart, 'cend', z.cend) order by z.cycle_index)
        from (select distinct on (w.cycle_index) w.cycle_index, w.cycle_num, w.cstart, w.cend
                from public.career_weeks(p_athlete) w order by w.cycle_index) z), '[]'::jsonb));
  end if;
  v_m := public.career_measures(p_athlete, v_ctx, v_keys);
  for x in select e from jsonb_array_elements(v_woken) e loop
    if x ->> 'kind' = 'badge' then
      r := public.career_badge_eval(x ->> 'id', x -> 'body', v_m, v_ctx);
    else
      r := public.career_achievement_eval(p_athlete, x ->> 'id', x -> 'body', v_m, v_ctx);
    end if;
    for t in select e from jsonb_array_elements(coalesce(r -> 'crossed', '[]'::jsonb)) e loop
      award_id := public.career_award_id(x ->> 'kind', x ->> 'id', (t.e ->> 'tier')::int, coalesce(t.e ->> 'subject', ''));
      earned := (t.e ->> 'day')::date;
      return next;
    end loop;
  end loop;
end $function$;

revoke all on function public.career_earned_days(text) from public, anon, authenticated;
grant execute on function public.career_earned_days(text) to service_role;

-- ── 5. Backfill, then work every score out again ─────────────────────────────────────────────────────────────────────────────
do $stage95$
declare a record; v_id text;
begin
  -- baseline awards are dated on the day they were earned (the go-day kept each one's own day), and live ones on the day of the save
  update public.career_awards set earned_on = day where earned_on is null and how in ('baseline', 'live');
  -- silent awards (a rule change revealed them): the day the test really crossed on
  for a in select distinct x.athlete_id from public.career_awards x where x.earned_on is null order by 1 loop
    update public.career_awards w set earned_on = least(e.earned, w.day)
      from public.career_earned_days(a.athlete_id) e
     where w.athlete_id = a.athlete_id and w.earned_on is null and w.award_id = e.award_id;
  end loop;
  -- anything the evaluator no longer reaches keeps its own day, which counts exactly as it did before this stage
  update public.career_awards set earned_on = day where earned_on is null;
  -- the cached scores were worked out under the old rule: empty their stamps and work every one out again now
  update public.career_scores set stamp = 'stage95';
  for v_id in select s.athlete_id from public.career_scores s order by 1 loop
    perform public.career_scored(v_id, true);
  end loop;
end $stage95$;
