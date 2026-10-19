-- The way back from stage76 (D20, forward-only rule changes). On Amir's word only, after a backup (coach.html → ⚙ Tools → ⤓ Backup).
--
-- ⚠ Run it only while no rulebook version has a start day (select version, starts_on from public.career_rules). Once a version with a start day
-- is loaded, going back would price every past fact with the newest rules again, which is exactly what D20 forbids: the file refuses then.
--
-- What it does: puts career_facts_paid() back as stage73 had it (an award priced from the catalogue, D12; every fact from the newest rules), takes
-- the six in-place patches out of career_compare(), career_rewards_line(), career_rewards_profile(), get_awards(), career_mint() and career_seed(),
-- drops career_rules_on(), career_d20_prices(), career_d20_core() and career_d20_check(), and the column career_rules.starts_on.
-- Afterwards remake supabase/schema_snapshot.sql (scripts/restore/README.md) in the same commit. Safe to run twice.

begin;

do $rb76_guard$
declare v boolean := false;
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'career_rules' and column_name = 'starts_on') then
    execute 'select exists (select 1 from public.career_rules where starts_on is not null)' into v;   -- dynamic: after a first run the column is gone
  end if;
  if v then
    raise exception 'rollback_stage76: a rulebook version with a start day is loaded; going back would re-price the past (D20). Nothing was changed.';
  end if;
end $rb76_guard$;

create or replace function public.career_facts_paid(p_athlete text)
 returns table(kind text, ref text, day date, xp numeric, career_only boolean)
 language sql stable set search_path to 'public' as $function$
  with r as (select public.career_rules_now() as j),
  f as (
    select f.kind, f.ref, f.day, f.value from public.career_facts f
     where f.athlete_id = p_athlete and f.void_at is null
       and f.kind not in ('habit_done', 'habit_day', 'day_on_target', 'perfect_day', 'workout_tick', 'comeback')
  ),
  priced as (
    select f.*,
           case when r.j -> 'fact' -> f.kind ->> 'xp_from' = 'value' then coalesce(public.career_num(f.value -> 'xp'), 0)
                else coalesce(public.career_num(r.j -> 'fact' -> f.kind -> 'xp'), 0) end as xp,
           coalesce(r.j -> 'fact' -> f.kind -> 'career_only' = 'true'::jsonb, false) as conly,
           r.j -> 'fact' -> f.kind ->> 'limit_per' as per,
           coalesce(public.career_num(r.j -> 'fact' -> f.kind -> 'limit'), 0) as lim
      from f, r
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
  select 'award'::text, a.award_id, a.day,
         (case when not a.pays then 0
               else coalesce(public.career_award_xp(a.kind, a.tier, a.subject, c.body, h.hr), a.xp) end)::numeric,
         false
    from public.career_awards a
    left join public.career_catalogue c on c.kind = a.kind and c.id = a.item
    cross join (select public.career_habit_rules() as hr) h
   where a.athlete_id = p_athlete and public.career_catalogue_on()
$function$;

do $rb76_patch$
declare
  p record; d text;
begin
  for p in select * from (values
      ('public.career_compare(date)',
       'coalesce(public.career_award_xp(aw.kind, aw.tier, aw.subject, c.body, v_r), aw.xp)', 'aw.xp /* stage76: minted XP */'),
      ('public.career_rewards_line(text,jsonb,jsonb)',
       'coalesce(public.career_award_xp(a.kind, a.tier, a.subject, c.body, s.hr), a.xp)', 'a.xp /* stage76: minted XP */'),
      ('public.career_rewards_profile(text,jsonb)',
       'coalesce(public.career_award_xp(a.kind, a.tier, a.subject, c.body, v_hr), a.xp)', 'a.xp /* stage76: minted XP */'),
      ('public.get_awards(text)',
       'coalesce(public.career_award_xp(a.kind, a.tier, a.subject, c.body, v_hr), a.xp)', 'a.xp /* stage76: minted XP */'),
      ('public.career_mint(text,text,text,integer,text,date,jsonb,jsonb,jsonb,text,jsonb)',
       E'  if p_athlete is null or p_day is null or v_S is null then return false; end if;\n',
       E'  if p_athlete is null or p_day is null or v_S is null then return false; end if;\n'
       || E'  -- stage76 (D20): a reward a rule change reveals for an earlier day is dated no earlier than that version''s start day (forward only)\n'
       || E'  if (select r.starts_on from public.career_rules r order by r.version desc limit 1) > p_day then p_day := (select r.starts_on from public.career_rules r order by r.version desc limit 1); end if;\n'),
      ('public.career_seed(integer,jsonb,jsonb,text,boolean)',
       E'    raise exception ''rulebook version % is older than the one loaded (%): nothing was changed'', p_version, v_newest;\n  end if;\n',
       E'    raise exception ''rulebook version % is older than the one loaded (%): nothing was changed'', p_version, v_newest;\n  end if;\n'
       || E'  perform public.career_d20_check(p_version, p_rules, p_catalogue);   -- stage76 (D20): forward only\n'),
      ('public.career_seed(integer,jsonb,jsonb,text,boolean)',
       E'insert into public.career_rules (version, rules, source, loaded_at) values (p_version, p_rules, p_source, now())',
       E'insert into public.career_rules (version, rules, source, loaded_at, starts_on) values (p_version, p_rules, p_source, now(), case when v_newest is not null and p_version > v_newest then (p_rules ->> ''starts_on'')::date end)   /* stage76 */')
    ) as t(fn, old_text, new_text)
  loop
    d := pg_get_functiondef(p.fn::regprocedure);
    if position(p.new_text in d) > 0 then execute replace(d, p.new_text, p.old_text); end if;
  end loop;
end
$rb76_patch$;

drop function if exists public.career_d20_check(integer, jsonb, jsonb);
drop function if exists public.career_d20_core(jsonb);
drop function if exists public.career_d20_prices(jsonb);
drop function if exists public.career_rules_on(date);
alter table public.career_rules drop column if exists starts_on;

revoke all on function public.career_facts_paid(text) from public, anon, authenticated;
grant execute on function public.career_facts_paid(text) to service_role;

commit;
