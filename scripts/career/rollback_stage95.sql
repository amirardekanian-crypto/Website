-- Rollback of supabase/stage95_season_earned.sql, on Amir's word only.
--
-- It puts career_mint() and career_facts_paid() back as they were before stage95 (stage76 and stage90), so every award dated
-- inside a season counts in that season again, and empties the cached scores' stamps so every score is worked out again.
-- The `earned_on` column and the two helper functions are left where they are: nothing reads them once the functions below
-- are back, and a column with the days in it costs nothing. Drop them only if the whole stage is being removed:
--   alter table public.career_awards drop column earned_on;  drop function public.season_start_of(date);  drop function public.career_earned_days(text);
-- The scores as they were before stage95 are in backup.career_scores_before_stage95 (drop on 2026-11-03).
-- Safe to re-run.

create or replace function public.career_mint(p_athlete text, p_kind text, p_item text, p_tier integer, p_subject text, p_day date, p_body jsonb, p_tier_body jsonb, p_evidence jsonb, p_how text, p_ctx jsonb)
returns boolean
language plpgsql
set search_path to 'public'
as $function$
declare
  v_S date := (p_ctx ->> 'S')::date; v_hist boolean; v_pays boolean; v_xp integer; v_how text; v_size text; v_id text; v_n integer;
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
  insert into public.career_awards (athlete_id, award_id, kind, item, tier, subject, day, pays, xp, size, meaning, evidence, how, rules_version)
  values (p_athlete, v_id, p_kind, p_item, p_tier, coalesce(p_subject, ''), p_day, v_pays, v_xp, v_size,
          coalesce(p_body ->> 'meaning', ''), coalesce(p_evidence, '{}'::jsonb), v_how, coalesce((p_ctx ->> 'version')::int, 0))
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

-- stage90's career_facts_paid(), word for word
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
  select 'award'::text, a.award_id, a.day, (case when not a.pays then 0 else a.xp end)::numeric, false   -- stage76: the minted XP (D20, D12 reversed)
    from public.career_awards a
   where a.athlete_id = p_athlete and public.career_catalogue_on()
  union all
  -- stage78: an award that left with the cut, paid as it was (its own XP, its own day, never career-only, only with the catalogue on)
  select 'award_kept'::text, k.ref, k.day, coalesce(public.career_num(k.value -> 'xp'), 0), false
    from public.career_facts k
   where k.athlete_id = p_athlete and k.kind = 'award_kept' and k.void_at is null and public.career_catalogue_on()
$function$;

-- every score is worked out again under the old rule
update public.career_scores set stamp = 'rollback95';
do $rb95$
declare v_id text;
begin
  for v_id in select s.athlete_id from public.career_scores s order by 1 loop
    perform public.career_scored(v_id, true);
  end loop;
end $rb95$;
