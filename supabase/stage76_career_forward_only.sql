-- stage76_career_forward_only.sql — D20: a change of rules applies forward only (Career Mode round 5, step 2; 2026-10-19)
--
-- Amir's words (D20, the go-day, 2026-10-18; career/CAREER_MODE.md → the D20 row): "after switching on, if the rules about xp changes, or rules about
-- the achievements change, the people with the achievements wont lose theirs, but from that point forward, it would be different ... to prevent from
-- calculating everyone level and achievement again and again, everytime something changes". Built on his "Yes continue untill we are finished with
-- our plan" (2026-10-19), as step 2 of plan A.
--
-- What it changes:
--   1. An award keeps the XP it was minted with (career_awards.xp). This REVERSES D12 (an award priced from the current catalogue at scoring time).
--      Five readers priced an award again; each now reads the minted XP: career_facts_paid() (the score), career_compare(), career_rewards_line(),
--      career_rewards_profile() and get_awards() (patched in place: the one expression is replaced, nothing else in them moves).
--      On the live project every award's minted XP equals its price today (322 of 322 on 2026-10-19), so no number moves on the day this goes on.
--   2. A fact is priced by the rulebook version in force on the fact's day. career_rules gets `starts_on`: null for the versions loaded before this
--      stage (they count from always), a day for every later version. The rules for a day are the newest version whose start day is null or on or
--      before it (career_rules_on()). career_facts_paid() prices each fact (its XP, career_only, its cap) from its own day's version.
--   3. career_seed() (patched in place: one call and the start day stored) refuses what would re-work the past, through career_d20_check():
--        · the same version seeded again may change only names, captions and other labels (a rename changes only the label, D20 (3));
--        · a new version needs `starts_on` = today (or yesterday, for a time zone): the catalogue is replaced at the seed, so the day it starts is the
--          day it is seeded;
--        · a new version may change a fact's XP, career_only and cap, and anything in the catalogue (a badge's tiers, an achievement's test, a price);
--          it may NOT change what cannot be applied by day: the habits (AA Proof's daily scorer), the level curve, the season, the week, the share, or
--          how a fact is worked out (min_share, weeks_away, window_days, min_gain). Those would re-work every past day, so they are a decision for Amir
--          (a bug fix: backwards or forwards, D20 (5)), never a seed.
--   4. career_mint() (patched in place: one line) dates a reward that a rule change reveals for an earlier day no earlier than that version's start
--      day, so a new rule's rewards are "from that point forward". With no version holding a start day (today), it changes nothing.
-- What it does not change: any fact, award, level, XP or season point today (the rehearsal proves every athlete's numbers equal before and after);
-- the phones (a tick's preview still uses today's rules, which is the version in force today); GAME-1 (nothing minted is ever taken back).
--
-- Rehearsed: scripts/career/rehearse_d20.mjs on PGlite (the snapshot, the backup's real facts, made-up awards; a version 4 with a start day: facts
-- before it keep their prices, facts after it get the new ones, awards keep their XP, every refusal) and a dry run on the live project inside a
-- transaction that was rolled back (every athlete's career XP, level and season points equal before and after).
-- The way back: scripts/career/rollback_stage76.sql (puts the six patched expressions back, career_facts_paid() as it was, drops the helpers and
-- the column). Safe to re-run this file.
-- APPLIED to the live project 2026-10-19 (migration stage76_career_forward_only), after the dry run. Read back: career_rules.starts_on exists (null for
-- versions 1 to 3), each of the six patches found once, career_compare() ok, 41 athletes' paid facts and awards identical, 278,395 paid XP before and
-- after. supabase/schema_snapshot.sql was remade in the same commit (195 functions) and scripts/restore/rehearse.mjs passed (49 of 49).

-- ── 0. The guard ───────────────────────────────────────────────────────────────────────────────────────────────────────
do $stage76_guard$
begin
  if to_regclass('public.career_awards') is null or to_regprocedure('public.career_seed(integer,jsonb,jsonb,text,boolean)') is null then
    raise exception 'stage76: career_awards or career_seed() is missing (stage70 first). Nothing was changed.';
  end if;
end
$stage76_guard$;

-- ── 1. The start day of a rulebook version ───────────────────────────────────────────────────────────────────────────
alter table public.career_rules add column if not exists starts_on date;   -- null: counts from always (the versions before stage76)

-- The rules in force on a day: the newest version whose start day is null or on or before it.
create or replace function public.career_rules_on(p_day date) returns jsonb
language sql stable set search_path to 'public' as $function$
  select r.rules from public.career_rules r where r.starts_on is null or r.starts_on <= p_day order by r.version desc limit 1
$function$;

-- What prices or works out a fact, the habits and the level: everything a seed must not change in place. The labels (when, cap, source,
-- pays_for, meaning) are left out.
create or replace function public.career_d20_prices(p jsonb) returns jsonb
language sql immutable set search_path to 'public' as $function$
  select jsonb_build_object('habits', p -> 'habits', 'level', p -> 'level', 'season', p -> 'season', 'week', p -> 'week', 'share', p -> 'share',
           'fact', coalesce((select jsonb_object_agg(e.key, e.value - array['when', 'cap', 'source', 'pays_for', 'meaning'])
                               from jsonb_each(case when jsonb_typeof(p -> 'fact') = 'object' then p -> 'fact' else '{}'::jsonb end) e), '{}'::jsonb))
$function$;

-- A catalogue without its labels (names, captions, prose): what earns a reward and what it pays. Messages, sizes, tools and settings are all labels.
create or replace function public.career_d20_core(p_catalogue jsonb) returns text
language sql immutable set search_path to 'public' as $function$
  select md5(coalesce(string_agg(x.kind || '|' || x.id || '|' ||
           (case when jsonb_typeof(x.body -> 'tiers') = 'array'
                 then (x.body - array['name', 'caption', 'from', 'rule', 'note', 'notes', 'origin', 'tiers'])
                      || jsonb_build_object('tiers', (select jsonb_agg(t.v - 'tier_name' order by t.o) from jsonb_array_elements(x.body -> 'tiers') with ordinality t(v, o)))
                 else x.body - array['name', 'caption', 'from', 'rule', 'note', 'notes', 'origin'] end)::text, ',' order by x.kind, x.id), ''))
    from jsonb_to_recordset(case when jsonb_typeof(p_catalogue) = 'array' then p_catalogue else '[]'::jsonb end) as x(kind text, id text, body jsonb)
   where x.kind in ('badge', 'achievement', 'title', 'mission', 'quest', 'skin')
$function$;

-- D20's door for a seed (career_seed() calls it before it writes anything). Raises with the reason, or returns.
create or replace function public.career_d20_check(p_version integer, p_rules jsonb, p_catalogue jsonb) returns void
language plpgsql stable set search_path to 'public' as $function$
declare
  v_newest integer; v_old jsonb; v_starts text := p_rules ->> 'starts_on'; v_cat jsonb; k text;
  c_by_day constant text[] := array['when', 'cap', 'source', 'pays_for', 'meaning', 'xp', 'xp_from', 'career_only', 'limit', 'limit_per'];
begin
  select max(r.version) into v_newest from public.career_rules r;
  if v_newest is null then return; end if;                                  -- the first seed (a fresh database): nothing to protect yet
  select r.rules into v_old from public.career_rules r where r.version = v_newest;
  if p_version = v_newest then
    if public.career_d20_prices(v_old) is distinct from public.career_d20_prices(p_rules) then
      raise exception 'D20: rulebook version % is loaded, and a seed of the same version may change only names and captions. A change of XP, a cap, the habits, the level curve or how a fact is worked out is a NEW version with starts_on = today (rulebook.toml → version and starts_on). Nothing was changed', p_version;
    end if;
    select coalesce(jsonb_agg(jsonb_build_object('kind', c.kind, 'id', c.id, 'body', c.body)), '[]'::jsonb) into v_cat from public.career_catalogue c;
    if public.career_d20_core(v_cat) is distinct from public.career_d20_core(p_catalogue) then
      raise exception 'D20: the catalogue changed more than its names and captions (what earns a reward, its tiers or its XP). That is a NEW rulebook version with starts_on = today; awards already minted keep theirs. Nothing was changed';
    end if;
    return;
  end if;
  -- a new version
  if v_starts is null or v_starts !~ '^\d{4}-\d{2}-\d{2}$' or v_starts::date not between current_date - 1 and current_date then
    raise exception 'D20: a new rulebook version (%) needs starts_on = today (or yesterday, for a time zone) in rulebook.toml, found %. Nothing was changed', p_version, coalesce(v_starts, 'none');
  end if;
  foreach k in array array['habits', 'level', 'season', 'week', 'share'] loop
    if (v_old -> k) is distinct from (p_rules -> k) then
      raise exception 'D20: [%] cannot change forward only (it would re-work every past day). That is Amir''s decision as a bug fix, backwards or forwards, not a seed. Nothing was changed', k;
    end if;
  end loop;
  for k in select jsonb_object_keys(case when jsonb_typeof(v_old -> 'fact') = 'object' then v_old -> 'fact' else '{}'::jsonb end) loop
    if p_rules -> 'fact' ? k and ((v_old -> 'fact' -> k) - c_by_day) is distinct from ((p_rules -> 'fact' -> k) - c_by_day) then
      raise exception 'D20: how the fact % is worked out changed (%). Only its xp, career_only and cap can change forward only; this is Amir''s decision as a bug fix. Nothing was changed',
        k, (select string_agg(x, ', ') from jsonb_object_keys(((v_old -> 'fact' -> k) - c_by_day) || ((p_rules -> 'fact' -> k) - c_by_day)) x
             where (v_old -> 'fact' -> k -> x) is distinct from (p_rules -> 'fact' -> k -> x));
    end if;
  end loop;
end $function$;

-- ── 2. The score: a fact priced by its own day's version, an award by the XP it was minted with ────────────────────────────
-- stage73's career_facts_paid() with two hunks (marked  -- stage76): the rules come from the version in force on the fact's day, and an award's
-- XP is career_awards.xp (D12 reversed). Everything else is word for word.
create or replace function public.career_facts_paid(p_athlete text)
 returns table(kind text, ref text, day date, xp numeric, career_only boolean)
 language sql stable set search_path to 'public' as $function$
  with v as (select r.version, r.starts_on, r.rules as j from public.career_rules r),   -- stage76
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
$function$;

-- ── 3. The other four readers of an award's XP, and the mint and the seed, patched in place ────────────────────────────────
-- Each patch finds its exact text once or refuses (nothing changed), and a re-run finds it already patched.
do $stage76_patch$
declare
  p record; d text; n integer;
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
    if position(p.new_text in d) > 0 then continue; end if;                   -- patched already (a re-run)
    n := (length(d) - length(replace(d, p.old_text, ''))) / length(p.old_text);
    if n <> 1 then
      raise exception 'stage76: % is not what this patch expects (its text was found % times, not once). Nothing was changed.', p.fn, n;
    end if;
    execute replace(d, p.old_text, p.new_text);
  end loop;
end
$stage76_patch$;

-- ── 4. Grants: the helpers are the service role's only (a seed runs as the service role) ──────────────────────────────────
revoke all on function public.career_rules_on(date) from public, anon, authenticated;
revoke all on function public.career_d20_prices(jsonb) from public, anon, authenticated;
revoke all on function public.career_d20_core(jsonb) from public, anon, authenticated;
revoke all on function public.career_d20_check(integer, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.career_rules_on(date) to service_role;
grant execute on function public.career_d20_prices(jsonb) to service_role;
grant execute on function public.career_d20_core(jsonb) to service_role;
grant execute on function public.career_d20_check(integer, jsonb, jsonb) to service_role;
revoke all on function public.career_facts_paid(text) from public, anon, authenticated;
grant execute on function public.career_facts_paid(text) to service_role;
