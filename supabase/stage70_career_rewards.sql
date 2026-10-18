-- stage70 — Career Mode, phase 3: rewards with meanings, and the catalogue switch (2026-10-18; career/CAREER_MODE.md → phase 3, and
-- career/PROCEDURES.md P5, P12, P15, P16). Built from the phase 3 build spec (§2 to §7 and §13). Safe to re-run.
--
-- What it adds:
--   · career_awards: one row per badge tier, achievement or catalogue title an athlete has earned. Never updated, never deleted (GAME-1);
--     an erasure is the one exception. The award id is the one key for a reward everywhere: badge:<item>:<tier>, badge:<item>:<tier>:<habit>
--     (only the per-habit ladders of habit_tiers), achievement:<item>, title:<item> (career_award_id(); the two phones build the same).
--   · career_recognition: one row per moment to tell the athlete (audience 'athlete'; the coach, the crew and beyond are later phases), written
--     only for an award earned live, told once by either app (mark_moments_told()).
--   · career_evaluate(): works out what an athlete has earned from their facts, in one pass of measures (career_measures()), and mints what is
--     new. It runs after every save that changed a fact (the triggers pass the kinds that changed, so only the entries that read them wake up),
--     from get_profile(), and before an athlete is scored for the first time after the switch. With the catalogue switch off it does nothing.
--   · The awards pay XP through the facts' half of the score (career_facts_paid(), kind 'award'), priced from the CURRENT catalogue (D12): a
--     re-seed re-prices them like any fact; a history crossing that pays nothing (D2, D14) stays at nothing.
--   · At the catalogue switch Proof's habit tiers and milestones stop being paid by hab_bonus_xp() (career_bonus_rules()) and become awards
--     instead: every one an athlete had is minted in silence, dated the day it was crossed, at the price Proof paid, so career XP and levels
--     do not drop (conservation, spec §5.3). The retired entries stop there; the starts_at entries start (their history is minted, and pays
--     nothing unless D14 says so).
--   · get_profile() adds the CORE of the career (what Today, the Home row, the finish card, the moments and the phones' dedupe need): owned
--     (the award ids, a sorted list), title_worn, slam, ladder, near, moments, numbers.free and numbers.four, catalogue_version (additive
--     only: every phase 2 key keeps its name and meaning, so its badges and achievements stay phase 2's empty lists). Its size does not grow
--     with a career but for one id an award. Catalogue off: phase 2's answer exactly.
--   · get_awards() is the SHELF, read only when the shelf opens: every badge row with its tiers and the day of each, the achievements, the
--     full titles list and the recent awards. Same access as get_profile(). Catalogue off: the same keys, empty.
--   · career_seed() turns the catalogue switch on only alone (no other change in the same seed, never with the XP switch, the day today or
--     yesterday). Three batch functions do the rest, five athletes a call: career_catalogue_before() (each score under the old rules, kept in
--     backup.career_catalogue_before for the report), career_catalogue_preview() (the dry run: every line, then everything undone) and
--     career_rewards_batch() (the go-day baseline, and after any re-seed with 'silent').
--   · career_compare() learns the switch: both sides stop paying tiers and milestones, and each row compares Proof's own (proof_sum) with
--     what the awards carried (proof_carried).
--   · career_sync() and career_keep_levels() stamp updated_at with clock_timestamp(), so a save that waited on another athlete's lock never
--     writes a stamp older than one already stored (the stamp race, spec §3.2); career_sync() also notes the kinds it changed in the
--     transaction setting career.changed, which the triggers read.
--   · coach_erase_person() learns career_awards and career_recognition (patched in place, as stage63, 66 and 69).
--
-- The decisions D1 to D17 are not answered yet: this file builds the spec's recommendation for each (D2 back-pay dated the day earned, D3
-- resilience = comeback + training_return, D4 a free athlete's four numbers, D6 one HOUSE RULES ladder over the best custom habit, D7 one
-- full-screen moment per open with a 14-day keep, D9 the readings of the five prose rules, D12 the current price, D14 comebacks' history).
-- Rehearsed away from the live project on PGlite (the schema snapshot, this file twice, made-up athletes through observe, evaluate and
-- get_profile with the switch off and on, an erasure, the rollback). The way back: scripts/career/rollback_stage70.sql, on Amir's word only.

-- ── 1. tables ─────────────────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.career_awards (
  athlete_id    text        not null,
  award_id      text        not null check (award_id ~ '^(badge|achievement|title):[a-z][a-z0-9_]*(:[0-9]+)?(:[A-Za-z0-9_.-]+)?$'),
  kind          text        not null check (kind in ('badge', 'achievement', 'title')),
  item          text        not null check (item ~ '^[a-z][a-z0-9_]*$'),   -- catalogue id; no foreign key: every seed reloads career_catalogue
  tier          integer     check (tier is null or tier between 1 and 50),  -- 1-based, badges only
  subject       text        not null default '',                            -- the habit of habit_tiers' per-habit ladders; '' otherwise
  day           date        not null,                                       -- the athlete's own day the measure crossed (the facts' day)
  pays          boolean     not null default true,                          -- false: a history crossing that pays 0 (D2, D14), decided once
  xp            integer     not null default 0 check (xp >= 0),             -- the price at mint: display and fallback only (D12)
  size          text        not null check (size in ('tick', 'win', 'highlight', 'milestone', 'legend')),
  meaning       text        not null,                                       -- the entry's meaning at mint
  evidence      jsonb       not null default '{}'::jsonb check (jsonb_typeof(evidence) = 'object'),
  how           text        not null check (how in ('live', 'silent', 'baseline')),
  rules_version integer     not null,
  created_at    timestamptz not null default clock_timestamp(),
  primary key (athlete_id, award_id),
  check ((kind = 'badge') = (tier is not null))
);
create index if not exists career_awards_day_idx on public.career_awards (athlete_id, day);
alter table public.career_awards enable row level security;

create table if not exists public.career_recognition (
  athlete_id text        not null,
  award_id   text        not null,
  audience   text        not null check (audience in ('athlete', 'coach', 'crew', 'beyond')),
  size       text        not null check (size in ('win', 'highlight', 'milestone', 'legend')),
  due_at     timestamptz not null default now(),
  told_at    timestamptz,                                   -- null = waiting
  told_by    text        check (told_by in ('proof', 'training')),
  created_at timestamptz not null default clock_timestamp(),
  primary key (athlete_id, award_id, audience)
);
create index if not exists career_recognition_wait_idx on public.career_recognition (athlete_id) where told_at is null;
alter table public.career_recognition enable row level security;

-- career_evaluate()'s cache, beside the score it rests on: {stamp, base, have, now, at}. Nothing in it is a source.
alter table public.career_scores add column if not exists rewards jsonb
  check (rewards is null or jsonb_typeof(rewards) = 'object');
create index if not exists career_facts_kind_idx on public.career_facts (athlete_id, kind, day) where void_at is null;

-- Each athlete's score under the OLD rules, written by career_catalogue_before() on the go-day, read by the batch's report. Dropped by hand
-- 14 days after the go-day; coach_erase_person() empties every backup table with an athlete_id column.
create schema if not exists backup;
create table if not exists backup.career_catalogue_before (athlete_id text primary key, score jsonb not null, at timestamptz not null default now());

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
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'career_recognition' and policyname = 'athlete reads own career recognition') then
    create policy "athlete reads own career recognition" on public.career_recognition as permissive for select to authenticated
      using (athlete_id in (select ai.athlete_id from public.athlete_identities ai where ai.user_id = (select auth.uid())));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'career_recognition' and policyname = 'coach reads career recognition') then
    create policy "coach reads career recognition" on public.career_recognition as permissive for select to authenticated
      using ((select public.is_coach()));
  end if;
end $stage70_policies$;

revoke all on table public.career_awards from public, anon, authenticated;
grant select on table public.career_awards to authenticated;
grant all on table public.career_awards to service_role;
revoke all on table public.career_recognition from public, anon, authenticated;
grant select on table public.career_recognition to authenticated;
grant all on table public.career_recognition to service_role;

-- ── 2. helpers ────────────────────────────────────────────────────────────────────────────────────────────────────────

-- Is the catalogue switch on, by the newest rulebook (rulebook.toml → [switch] catalogue)?
create or replace function public.career_catalogue_on() returns boolean
language sql stable set search_path to 'public' as $function$
  select public.career_switch_day(public.career_rules_now(), 'catalogue') is not null
$function$;

-- The one key of a reward: badge:<item>:<tier>, badge:<item>:<tier>:<subject> (habit_tiers' per-habit ladders), achievement:<item>,
-- title:<item>. habits.html and program.html build the same (awardId()).
create or replace function public.career_award_id(p_kind text, p_item text, p_tier integer default null, p_subject text default '')
returns text
language sql immutable set search_path to 'public' as $function$
  select p_kind || ':' || p_item
         || case when p_tier is not null then ':' || p_tier::text else '' end
         || case when coalesce(p_subject, '') <> '' then ':' || p_subject else '' end
$function$;

-- Proof's habit rules as hab_bonus_xp() pays them once the catalogue switch is on: no tiers and no milestones (they are awards now, paid
-- through career_facts_paid()). The day gate, the comebacks and the quests stay. Before the switch: the rules as given.
create or replace function public.career_bonus_rules(p_habit_rules jsonb, p_rules jsonb) returns jsonb
language sql stable set search_path to 'public' as $function$
  select case when p_habit_rules is null or public.career_switch_day(p_rules, 'catalogue') is null then p_habit_rules
              else p_habit_rules || '{"tiers": [], "milestones": []}'::jsonb end
$function$;

-- A Proof measure (streak:water, daysHit:strength, total:steps, daysWith3, perfectDays, qualify, comebackRun, comebacksStuck) as the key of
-- career_measures() that answers it; null (the day streak's marks) is the day streak.
create or replace function public.career_proof_key(p_measure text) returns text
language sql immutable set search_path to 'public' as $function$
  select case when p_measure is null then 'daystreak'
              when p_measure like 'streak:%' then 'run:' || substr(p_measure, 8)
              when p_measure like 'daysHit:%' then 'hits:' || substr(p_measure, 9)
              when p_measure like 'total:%' then 'sum:' || substr(p_measure, 7)
              when p_measure = 'daysWith3' then 'with3'
              when p_measure in ('perfectDays', 'perfect') then 'perfect'
              when p_measure = 'qualify' then 'qualify'
              when p_measure = 'comebackRun' then 'cbrun'
              when p_measure = 'comebacksStuck' then 'stuck'
         end
$function$;

-- What a best_run badge runs over ([badge] run, spec §5.1): plan_weeks (held weeks), days (one habit's done days), iso_weeks (calendar weeks
-- holding a fact). A file from before the key is read by its counts.
create or replace function public.career_badge_run(p_body jsonb) returns text
language sql immutable set search_path to 'public' as $function$
  select coalesce(p_body ->> 'run',
                  case when p_body ->> 'counts' = 'week_held' then 'plan_weeks'
                       when p_body ->> 'counts' = 'habit_done' and p_body ? 'habit' then 'days'
                       else 'iso_weeks' end)
$function$;

-- An achievement's test (achievements.toml → test, spec §3.4). One from before the key is a Proof milestone when it names a measure, and
-- nothing at all otherwise (it is never guessed from its prose).
create or replace function public.career_achievement_test(p_body jsonb) returns text
language sql immutable set search_path to 'public' as $function$
  select coalesce(p_body ->> 'test', case when p_body ? 'proof_measure' then 'proof' end)
$function$;

-- The fact kinds whose change wakes an entry (spec §3.2a): a trigger's evaluate looks only at the entries that read what the save changed.
create or replace function public.career_entry_kinds(p_kind text, p_body jsonb) returns text[]
language plpgsql immutable set search_path to 'public' as $function$
declare v_counts text[]; v_m text; v_t text;
begin
  v_counts := case jsonb_typeof(p_body -> 'counts')
                when 'array' then array(select jsonb_array_elements_text(p_body -> 'counts'))
                when 'string' then array[p_body ->> 'counts']
                else '{}'::text[] end;
  if p_kind = 'badge' then
    case p_body ->> 'kind'
      when 'best_run' then
        return case public.career_badge_run(p_body)
                 when 'plan_weeks' then array['week_held', 'week_broken']
                 when 'days' then array['habit_done']
                 else v_counts end;
      when 'total' then return v_counts;
      when 'best_value' then return array['lift_gain'];
      when 'per_habit_best_run' then return array['habit_done'];
      when 'proof' then v_m := p_body ->> 'proof_measure';
      else return v_counts;
    end case;
  else
    v_t := public.career_achievement_test(p_body);
    case v_t
      when 'first' then return array[p_body ->> 'reads'];
      when 'proof' then v_m := p_body ->> 'proof_measure';
      when 'goals' then return array['habit_done', 'habit_day', 'day_on_target', 'perfect_day', 'comeback', 'comeback_stuck'];
      when 'cycle_all_held', 'cycle_by_the_book', 'cycle_with_broken' then
        return array['cycle_finished', 'week_held', 'week_by_the_book', 'week_broken'];
      when 'runs_together' then return array['habit_done'];
      when 'patterns_in_cycle' then return array['personal_best'];
      when 'best_value' then return array['lift_gain'];
      when 'cycle_proving' then return array['personal_best', 'retest_beaten', 'week_held', 'week_broken'];
      when 'run_regained' then return array['week_held', 'week_broken'];
      else return '{}'::text[];
    end case;
  end if;
  -- a Proof measure
  return case when v_m is null then array['day_on_target']
              when v_m like 'streak:%' or v_m like 'daysHit:%' or v_m like 'total:%' then array['habit_done']
              when v_m = 'daysWith3' then array['habit_done', 'habit_day']
              when v_m in ('perfectDays', 'perfect') then array['perfect_day']
              when v_m = 'qualify' then array['day_on_target']
              when v_m = 'comebackRun' then array['comeback', 'day_on_target']
              when v_m = 'comebacksStuck' then array['comeback_stuck']
              else '{}'::text[] end;
end $function$;

-- The measure keys an entry reads (career_measures(), spec §3.3). p_ctx carries the habit targets and the athlete's custom habits.
create or replace function public.career_entry_keys(p_kind text, p_body jsonb, p_ctx jsonb) returns text[]
language plpgsql immutable set search_path to 'public' as $function$
declare v_counts text[]; v_t text; v_out text[] := '{}'::text[];
begin
  v_counts := case jsonb_typeof(p_body -> 'counts')
                when 'array' then array(select x from jsonb_array_elements_text(p_body -> 'counts') x order by x)
                when 'string' then array[p_body ->> 'counts']
                else '{}'::text[] end;
  if p_kind = 'badge' then
    case p_body ->> 'kind'
      when 'best_run' then
        return case public.career_badge_run(p_body)
                 when 'plan_weeks' then array['weeks']
                 when 'days' then array['run:' || coalesce(p_body ->> 'habit', '')]
                 else array['iso:' || coalesce(v_counts[1], '')] end;
      when 'total' then return array['count:' || array_to_string(v_counts, ',')];
      when 'best_value' then return array['maxpct'];
      when 'per_habit_best_run' then
        return array(select 'run:' || t.key from jsonb_each(coalesce(p_ctx -> 'targets', '{}'::jsonb)) t
                     union
                     select 'run:' || c.value from jsonb_array_elements_text(coalesce(p_ctx -> 'custom', '[]'::jsonb)) c);
      when 'proof' then return array[public.career_proof_key(p_body ->> 'proof_measure')];
      else return '{}'::text[];
    end case;
  end if;
  v_t := public.career_achievement_test(p_body);
  if v_t = 'proof' then
    return array[public.career_proof_key(p_body ->> 'proof_measure')];
  elsif v_t = 'goals' then
    select coalesce(array_agg(distinct public.career_proof_key(g ->> 'kind')), '{}'::text[]) into v_out
      from jsonb_array_elements(case when jsonb_typeof(p_body -> 'goals') = 'array' then p_body -> 'goals' else '[]'::jsonb end) g
     where public.career_proof_key(g ->> 'kind') is not null and g ->> 'kind' is not null;
    return v_out;
  elsif v_t = 'best_value' then
    return array['maxpct'];
  elsif v_t = 'run_regained' then
    return array['weeks'];
  end if;
  return '{}'::text[];
end $function$;

-- An award's price NOW (D12): from the current catalogue, as every fact is priced from the current rulebook. A per-habit ladder pays as
-- hab_bonus_xp()'s tier_paid (the habit's weight, else the custom weight, × the completion bonus × the tier's multiplier, to the nearest 10,
-- at least 10); a badge tier its xp; an achievement its xp; a title nothing. Null when the entry or its tier is gone (then the price at mint).
create or replace function public.career_award_xp(p_kind text, p_tier integer, p_subject text, p_body jsonb, p_hr jsonb) returns integer
language plpgsql immutable set search_path to 'public' as $function$
declare v_tb jsonb; v_mult numeric;
begin
  if p_kind = 'title' then return 0; end if;
  if p_body is null then return null; end if;
  if p_kind = 'badge' then
    if p_tier is null or jsonb_typeof(p_body -> 'tiers') is distinct from 'array' or p_tier > jsonb_array_length(p_body -> 'tiers') then
      return null;
    end if;
    v_tb := p_body -> 'tiers' -> (p_tier - 1);
    if p_body ->> 'kind' = 'per_habit_best_run' then
      v_mult := public.career_num(v_tb -> 'mult');
      if v_mult is null then return null; end if;
      return greatest(10, round(coalesce(public.career_num(p_hr -> 'weights' -> p_subject), public.career_num(p_hr -> 'customXp'), 25)
                                * coalesce(public.career_num(p_hr -> 'completionBonus'), 1.2) * v_mult / 10) * 10)::int;
    end if;
    return round(public.career_num(v_tb -> 'xp'))::int;
  end if;
  return round(public.career_num(p_body -> 'xp'))::int;
end $function$;

-- Does a crossing pay (D2, D14)? A crossing after the switch always does, and so does the history of an entry that was earned before the
-- switch too. The history of a starts_at entry was already paid by the entry it takes the place of, so it pays nothing, unless its twin
-- could not have reached that tier (history_twin_counts: comebacks, whose habit comebacks alone are HARD TO KILL's).
-- A title never pays (career_mint() decides that before asking).
create or replace function public.career_award_pays(p_athlete text, p_body jsonb, p_tier_body jsonb, p_day date, p_ctx jsonb) returns boolean
language plpgsql stable set search_path to 'public' as $function$
declare v_S date := (p_ctx ->> 'S')::date;
begin
  if not (coalesce(p_body, '{}'::jsonb) ? 'starts_at') or v_S is null or p_day > v_S then
    return true;
  end if;
  if p_body ? 'history_twin_counts' then
    return (select count(*) from public.career_facts f
             where f.athlete_id = p_athlete and f.kind = p_body ->> 'history_twin_counts' and f.void_at is null and f.day <= v_S)
           < coalesce(public.career_num(p_tier_body -> 'at'), 0);
  end if;
  return false;
end $function$;

-- What a share card and a moment draw (sharecard.js's shapes): a badge, an achievement or a title, with the caption's {n} filled.
create or replace function public.career_award_spec(p_kind text, p_item text, p_tier integer, p_day date, p_evidence jsonb, p_body jsonb)
returns jsonb
language plpgsql immutable set search_path to 'public' as $function$
declare v_n numeric := round(public.career_num(p_evidence -> 'n')); v_cap text := p_body ->> 'caption';
begin
  if v_cap is not null and v_n is not null then v_cap := replace(v_cap, '{n}', v_n::text); end if;
  if p_kind = 'badge' then
    return jsonb_build_object('kind', 'badge', 'name', coalesce(p_body ->> 'name', p_item), 'meaning', p_body ->> 'meaning',
                              'metal', p_body -> 'tiers' -> (p_tier - 1) ->> 'metal', 'tier', p_tier, 'n', v_n, 'caption', v_cap,
                              'date', to_char(p_day, 'YYYY-MM-DD'));
  elsif p_kind = 'achievement' then
    return jsonb_build_object('kind', 'achievement', 'name', coalesce(p_body ->> 'name', p_item), 'meaning', p_body ->> 'meaning',
                              'caption', v_cap, 'date', to_char(p_day, 'YYYY-MM-DD'));
  end if;
  return jsonb_build_object('kind', 'title', 'name', coalesce(p_body ->> 'name', p_item), 'meaning', p_body ->> 'meaning',
                            'metal', p_body ->> 'metal', 'from', p_body ->> 'from', 'date', to_char(p_day, 'YYYY-MM-DD'));
end $function$;

-- The kinds of fact this transaction has changed so far (career_sync() notes them in career.changed): what a trigger passes to evaluate.
create or replace function public.career_changed_kinds() returns text[]
language sql stable set search_path to 'public' as $function$
  select array_agg(distinct k order by k)
    from unnest(string_to_array(nullif(current_setting('career.changed', true), ''), ',')) k
   where k <> ''
$function$;

-- ── 3. the facts, written: the stamp race, and the kinds that changed ───────────────────────────────────────────────────

-- stage66's career_sync(), word for word but two things: updated_at is clock_timestamp() (now() is when the transaction began, so a save
-- that waited on the athlete's lock behind another wrote a stamp older than the one already stored), and the kinds it changed are noted in
-- the transaction setting career.changed (career_changed_kinds()), so a trigger's evaluate wakes only the entries that read them.
create or replace function public.career_sync(p_athlete text, p_kinds text[], p_want jsonb, p_source text, p_refs text[] default null,
                                              p_settled_before date default null) returns integer
language plpgsql set search_path to 'public' as $function$
declare v_up integer; v_gone integer; v_k1 text[]; v_k2 text[];
begin
  with w as (
    select distinct on (x.kind, x.ref) x.kind, x.ref, x.day, coalesce(x.value, '{}'::jsonb) as value
      from jsonb_to_recordset(coalesce(p_want, '[]'::jsonb)) as x(kind text, ref text, day date, value jsonb)
     where x.kind = any (p_kinds) and x.ref is not null and x.day is not null
     order by x.kind, x.ref
  ), up as (
    insert into public.career_facts as f (athlete_id, kind, ref, day, value, source, updated_at)
    select p_athlete, w.kind, w.ref, w.day, w.value, p_source, clock_timestamp() from w
    on conflict (athlete_id, kind, ref) do update
       set day = excluded.day, value = excluded.value, source = excluded.source, void_at = null, updated_at = clock_timestamp()
     where (f.day is distinct from excluded.day or f.value is distinct from excluded.value
            or f.source is distinct from excluded.source or f.void_at is not null)
       and (p_settled_before is null or f.day >= p_settled_before)
    returning f.kind
  )
  select count(*), array_agg(distinct up.kind) into v_up, v_k1 from up;

  with w as (
    select x.kind, x.ref
      from jsonb_to_recordset(coalesce(p_want, '[]'::jsonb)) as x(kind text, ref text, day date, value jsonb)
     where x.kind = any (p_kinds)
  ), gone as (
    update public.career_facts f set void_at = clock_timestamp(), updated_at = clock_timestamp()
     where f.athlete_id = p_athlete and f.kind = any (p_kinds) and f.void_at is null
       and (p_refs is null or f.ref = any (p_refs))
       and (p_settled_before is null or f.day >= p_settled_before)
       and not exists (select 1 from w where w.kind = f.kind and w.ref = f.ref)
    returning f.kind
  )
  select count(*), array_agg(distinct gone.kind) into v_gone, v_k2 from gone;
  if v_up + v_gone > 0 then
    perform set_config('career.changed',
                       concat_ws(',', nullif(current_setting('career.changed', true), ''), array_to_string(coalesce(v_k1, '{}') || coalesce(v_k2, '{}'), ',')),
                       true);
  end if;
  return v_up + v_gone;
end $function$;

-- ── 4. the measures: one pass per evaluate ────────────────────────────────────────────────────────────────────────────

-- Every measure the woken entries need, worked out once, each as one statement over the athlete's facts (the CTEs are hab_bonus_xp()'s:
-- the done set is a habit_done whose value reaches the habit's target, a custom habit's target being 1). Returns
-- {key: {have, now, steps}}: steps lists the days on which the measure's best ROSE, with its new value (and the fact that did it), so a
-- threshold's crossing day is the first step at or over it. Keys: run:<habit> (run:custom = the best custom habit, D6), hits:<habit>,
-- sum:<habit>, with3, perfect, qualify, daystreak, cbrun, stuck, count:<kind>[,<kind>], weeks (with the walk), iso:<kind>, maxpct.
create or replace function public.career_measures(p_athlete text, p_ctx jsonb, p_keys text[]) returns jsonb
language plpgsql stable set search_path to 'public' as $function$
declare
  v_out jsonb := '{}'::jsonb; v_k text; v_h text; v_t numeric; v_v jsonb; v_kinds text[]; r record;
  v_best integer; v_run integer; v_steps jsonb; v_walk jsonb; v_custom text[];
  c_empty constant jsonb := '{"have": 0, "now": null, "steps": []}'::jsonb;
begin
  v_custom := array(select jsonb_array_elements_text(coalesce(p_ctx -> 'custom', '[]'::jsonb)));
  for v_k in select distinct x from unnest(coalesce(p_keys, '{}'::text[])) x where x is not null order by 1 loop
    v_v := null;
    if v_k like 'run:%' or v_k like 'hits:%' or v_k like 'sum:%' then
      v_h := substr(v_k, strpos(v_k, ':') + 1);
      v_t := coalesce(public.career_num(p_ctx -> 'targets' -> v_h), case when v_h = any (v_custom) then 1 end);
      if v_k = 'run:custom' then
        with dn as (
          select substr(f.ref, 12) as hid, f.day as d from public.career_facts f
           where f.athlete_id = p_athlete and f.kind = 'habit_done' and f.void_at is null
             and substr(f.ref, 12) = any (v_custom)
             and jsonb_typeof(f.value -> 'v') = 'number' and (f.value ->> 'v')::numeric >= 1
        ),
        isl as (select dn.hid, dn.d, dn.d - (row_number() over (partition by dn.hid order by dn.d))::int as grp from dn),
        rl as (select isl.hid, isl.d, (row_number() over (partition by isl.hid, isl.grp order by isl.d))::int as run from isl),
        lastd as (select distinct on (rl.hid) rl.hid, rl.d, rl.run from rl order by rl.hid, rl.d desc),
        perday as (select rl.d, max(rl.run) as run, (array_agg(rl.hid order by rl.run desc, rl.hid))[1] as hid from rl group by rl.d),
        mx as (select p.d, p.run, p.hid,
                      coalesce(max(p.run) over (order by p.d rows between unbounded preceding and 1 preceding), 0) as prev from perday p)
        select jsonb_build_object(
                 'have', coalesce((select max(perday.run) from perday), 0),
                 'now', coalesce((select max(l.run) from lastd l where l.d >= current_date - 1), 0),
                 'steps', coalesce((select jsonb_agg(jsonb_build_array(mx.d, mx.run, 'habit_done', mx.d::text || '|' || mx.hid) order by mx.d)
                                      from mx where mx.run > mx.prev), '[]'::jsonb))
          into v_v;
      elsif v_t is null then
        v_v := c_empty;
      elsif v_k like 'run:%' then
        with dn as (
          select f.day as d from public.career_facts f
           where f.athlete_id = p_athlete and f.kind = 'habit_done' and f.void_at is null and substr(f.ref, 12) = v_h
             and jsonb_typeof(f.value -> 'v') = 'number' and (f.value ->> 'v')::numeric >= v_t
        ),
        isl as (select dn.d, dn.d - (row_number() over (order by dn.d))::int as grp from dn),
        rl as (select isl.d, (row_number() over (partition by isl.grp order by isl.d))::int as run from isl),
        mx as (select rl.d, rl.run, coalesce(max(rl.run) over (order by rl.d rows between unbounded preceding and 1 preceding), 0) as prev from rl)
        select jsonb_build_object(
                 'have', coalesce((select max(rl.run) from rl), 0),
                 'now', coalesce((select rl.run from rl where rl.d >= current_date - 1 order by rl.d desc limit 1), 0),
                 'steps', coalesce((select jsonb_agg(jsonb_build_array(mx.d, mx.run, 'habit_done', mx.d::text || '|' || v_h) order by mx.d)
                                      from mx where mx.run > mx.prev), '[]'::jsonb))
          into v_v;
      elsif v_k like 'hits:%' then
        with dn as (
          select f.day as d, f.ref from public.career_facts f
           where f.athlete_id = p_athlete and f.kind = 'habit_done' and f.void_at is null and substr(f.ref, 12) = v_h
             and jsonb_typeof(f.value -> 'v') = 'number' and (f.value ->> 'v')::numeric >= v_t
        ),
        hn as (select dn.d, dn.ref, (row_number() over (order by dn.d))::int as n from dn)
        select jsonb_build_object('have', (select count(*) from dn), 'now', null,
                 'steps', coalesce((select jsonb_agg(jsonb_build_array(hn.d, hn.n, 'habit_done', hn.ref) order by hn.d) from hn), '[]'::jsonb))
          into v_v;
      else      -- sum: every number logged for the habit, as hab_bonus_xp()'s quest totals add them
        with x as (
          select f.day as d, f.ref, (f.value ->> 'v')::numeric as val from public.career_facts f
           where f.athlete_id = p_athlete and f.kind = 'habit_done' and f.void_at is null and substr(f.ref, 12) = v_h
             and jsonb_typeof(f.value -> 'v') = 'number'
        ),
        acc as (select x.d, x.ref, x.val, sum(x.val) over (order by x.d) as tot from x)
        select jsonb_build_object('have', coalesce((select sum(x.val) from x), 0), 'now', null,
                 'steps', coalesce((select jsonb_agg(jsonb_build_array(acc.d, acc.tot, 'habit_done', acc.ref) order by acc.d)
                                      from acc where acc.val > 0), '[]'::jsonb))
          into v_v;
      end if;
    elsif v_k = 'with3' then
      with w3 as (select hd.d, (row_number() over (order by hd.d))::int as n from public.career_habit_days(p_athlete) hd where hd.ndone >= 3)
      select jsonb_build_object('have', (select count(*) from w3), 'now', null,
               'steps', coalesce((select jsonb_agg(jsonb_build_array(w3.d, w3.n, 'habit_day', w3.d::text) order by w3.d) from w3), '[]'::jsonb))
        into v_v;
    elsif v_k in ('perfect', 'qualify', 'stuck') or v_k like 'count:%' then
      v_kinds := case v_k when 'perfect' then array['perfect_day'] when 'qualify' then array['day_on_target']
                          when 'stuck' then array['comeback_stuck'] else string_to_array(substr(v_k, 7), ',') end;
      with x as (
        select f.day as d, f.kind, f.ref, (row_number() over (order by f.day, f.ref, f.kind))::int as n from public.career_facts f
         where f.athlete_id = p_athlete and f.kind = any (v_kinds) and f.void_at is null
      )
      select jsonb_build_object('have', (select count(*) from x), 'now', null,
               'steps', coalesce((select jsonb_agg(jsonb_build_array(x.d, x.n, x.kind, x.ref) order by x.n) from x), '[]'::jsonb))
        into v_v;
    elsif v_k in ('daystreak', 'cbrun') then
      with q as (
        select f.day as d from public.career_facts f
         where f.athlete_id = p_athlete and f.kind = 'day_on_target' and f.void_at is null
      ),
      isl as (select q.d, q.d - (row_number() over (order by q.d))::int as grp from q),
      rl as (select isl.d, isl.grp, (row_number() over (partition by isl.grp order by isl.d))::int as run from isl),
      st as (select isl.grp, min(isl.d) as s from isl group by isl.grp),
      cb as (
        select f.day as c, f.ref from public.career_facts f
         where f.athlete_id = p_athlete and f.kind = 'comeback' and f.void_at is null
      ),
      pts as (    -- the day streak: every on-target day with its run; after a comeback: the days of the run that starts on it
        select rl.d, rl.run, 'day_on_target'::text as kind, rl.d::text as ref from rl where v_k = 'daystreak'
        union all
        select i.d, (i.d - cb.c + 1)::int, 'comeback', cb.ref from cb join st on st.s = cb.c join isl i on i.grp = st.grp where v_k = 'cbrun'
      ),
      mx as (select pts.*, coalesce(max(pts.run) over (order by pts.d rows between unbounded preceding and 1 preceding), 0) as prev from pts)
      select jsonb_build_object(
               'have', coalesce((select max(pts.run) from pts), 0),
               'now', case when v_k = 'daystreak'
                           then coalesce((select rl.run from rl where rl.d >= current_date - 1 order by rl.d desc limit 1), 0) end,
               'steps', coalesce((select jsonb_agg(jsonb_build_array(mx.d, mx.run, mx.kind, mx.ref) order by mx.d) from mx where mx.run > mx.prev),
                                 '[]'::jsonb))
        into v_v;
    elsif v_k = 'weeks' then
      -- held weeks in a row, walked as get_profile() walks them: a held week adds one, a broken week ends the run (a week between
      -- cycles, or one Amir paused, has no fact and is no week at all). The walk is kept for All the Way Back.
      v_best := 0; v_run := 0; v_steps := '[]'::jsonb; v_walk := '[]'::jsonb;
      for r in select f.kind, f.day, f.ref, public.career_num(f.value -> 'sessions') as sess from public.career_facts f
                where f.athlete_id = p_athlete and f.void_at is null and f.kind in ('week_held', 'week_broken')
                order by f.day, f.ref loop
        if r.kind = 'week_held' then
          v_run := v_run + 1;
          if v_run > v_best then
            v_best := v_run;
            v_steps := v_steps || jsonb_build_array(jsonb_build_array(r.day, v_run, r.kind, r.ref));
          end if;
        else
          v_run := 0;
        end if;
        v_walk := v_walk || jsonb_build_array(jsonb_build_array(r.day, case when r.kind = 'week_held' then 'h' else 'b' end, r.sess, r.ref));
      end loop;
      v_v := jsonb_build_object('have', v_best, 'now', v_run, 'steps', v_steps, 'walk', v_walk);
    elsif v_k like 'iso:%' then
      v_h := substr(v_k, 5);
      with x as (
        select f.day, f.ref from public.career_facts f
         where f.athlete_id = p_athlete and f.kind = v_h and f.void_at is null
      ),
      w as (select date_trunc('week', x.day)::date as wk, min(x.day) as fd, (array_agg(x.ref order by x.day, x.ref))[1] as ref from x group by 1),
      isl as (select w.wk, w.fd, w.ref, w.wk - (7 * row_number() over (order by w.wk))::int as grp from w),
      rl as (select isl.wk, isl.fd, isl.ref, (row_number() over (partition by isl.grp order by isl.wk))::int as run from isl),
      mx as (select rl.*, coalesce(max(rl.run) over (order by rl.wk rows between unbounded preceding and 1 preceding), 0) as prev from rl)
      select jsonb_build_object(
               'have', coalesce((select max(rl.run) from rl), 0),
               'now', coalesce((select rl.run from rl where rl.wk >= date_trunc('week', current_date)::date - 7 order by rl.wk desc limit 1), 0),
               'steps', coalesce((select jsonb_agg(jsonb_build_array(mx.fd, mx.run, v_h, mx.ref) order by mx.wk) from mx where mx.run > mx.prev),
                                 '[]'::jsonb))
        into v_v;
    elsif v_k = 'maxpct' then
      -- a lift_gain keeps only its latest high, so earlier history is lost (accepted, spec §3.3)
      with x as (
        select f.day as d, f.ref, public.career_num(f.value -> 'pct') as pct from public.career_facts f
         where f.athlete_id = p_athlete and f.kind = 'lift_gain' and f.void_at is null and public.career_num(f.value -> 'pct') is not null
      ),
      mx as (select x.*, max(x.pct) over (order by x.d, x.ref rows between unbounded preceding and 1 preceding) as prev from x)
      select jsonb_build_object('have', coalesce((select max(x.pct) from x), 0), 'now', null,
               'steps', coalesce((select jsonb_agg(jsonb_build_array(mx.d, mx.pct, 'lift_gain', mx.ref) order by mx.d, mx.ref)
                                    from mx where mx.prev is null or mx.pct > mx.prev), '[]'::jsonb))
        into v_v;
    end if;
    v_out := v_out || jsonb_build_object(v_k, coalesce(v_v, c_empty));
  end loop;
  return v_out;
end $function$;

-- One badge against the measures: its best (have), where it stands now (now, a run's current length), and every tier not yet owned that
-- the measure has reached, with the day it first did (habit_tiers: one ladder per habit, subject = the habit). Reads nothing but its inputs.
create or replace function public.career_badge_eval(p_id text, p_body jsonb, p_m jsonb, p_ctx jsonb) returns jsonb
language plpgsql immutable set search_path to 'public' as $function$
declare
  v_k text; v_meas jsonb; v_have numeric := 0; v_now numeric; v_cross jsonb := '[]'::jsonb; t record; s jsonb; v_subject text;
  v_aid text; v_per boolean := p_body ->> 'kind' = 'per_habit_best_run';
begin
  if jsonb_typeof(p_body -> 'tiers') is distinct from 'array' then
    return jsonb_build_object('have', 0, 'now', null, 'crossed', '[]'::jsonb);
  end if;
  foreach v_k in array coalesce(public.career_entry_keys('badge', p_body, p_ctx), '{}'::text[]) loop
    v_meas := coalesce(p_m -> v_k, '{"have": 0, "now": null, "steps": []}'::jsonb);
    v_have := greatest(v_have, coalesce(public.career_num(v_meas -> 'have'), 0));
    if jsonb_typeof(v_meas -> 'now') = 'number' then v_now := greatest(coalesce(v_now, 0), public.career_num(v_meas -> 'now')); end if;
    v_subject := case when v_per then substr(v_k, 5) else '' end;
    if v_per and v_subject !~ '^[A-Za-z0-9_.-]+$' then continue; end if;
    for t in select e.ord::int as tier, e.val from jsonb_array_elements(p_body -> 'tiers') with ordinality e(val, ord) loop
      v_aid := public.career_award_id('badge', p_id, t.tier, v_subject);
      if coalesce(p_ctx -> 'owned', '{}'::jsonb) ? v_aid then continue; end if;
      s := null;
      select x.s into s from jsonb_array_elements(coalesce(v_meas -> 'steps', '[]'::jsonb)) with ordinality x(s, o)
       where public.career_num(x.s -> 1) >= public.career_num(t.val -> 'at')
       order by x.o limit 1;
      if s is null then continue; end if;
      v_cross := v_cross || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
        'tier', t.tier, 'subject', nullif(v_subject, ''), 'day', s ->> 0,
        'evidence', jsonb_build_object('via', v_k, 'n', s -> 1,
                                       'facts', case when s ->> 3 is not null
                                                     then jsonb_build_array(jsonb_build_object('kind', s ->> 2, 'ref', s ->> 3))
                                                     else '[]'::jsonb end))));
    end loop;
  end loop;
  return jsonb_build_object('have', v_have, 'now', v_now, 'crossed', v_cross);
end $function$;

-- One achievement against the facts (achievements.toml → test, spec §3.4; the readings of D9): {"crossed": []} or one crossing with its day.
create or replace function public.career_achievement_eval(p_athlete text, p_id text, p_body jsonb, p_m jsonb, p_ctx jsonb) returns jsonb
language plpgsql stable set search_path to 'public' as $function$
declare
  v_test text := public.career_achievement_test(p_body); v_k text; v_need numeric; s jsonb; g jsonb; v_day date; v_ev jsonb;
  v_facts jsonb := '[]'::jsonb; v_n integer := 0; v_num integer; v_ref text; v_kind text;
  v_best integer := 0; v_run integer := 0; v_away integer := 0; v_armed boolean := false; v_old integer := 0; v_aw integer;
  v_bests integer; v_rets integer;
  c_none constant jsonb := '{"crossed": []}'::jsonb;
begin
  if v_test is null then return c_none; end if;

  if v_test = 'first' then
    select f.day, f.kind, f.ref into v_day, v_kind, v_ref from public.career_facts f
     where f.athlete_id = p_athlete and f.kind = p_body ->> 'reads' and f.void_at is null
     order by f.day, f.ref limit 1;
    v_ev := jsonb_build_object('via', 'first', 'n', 1, 'facts', jsonb_build_array(jsonb_build_object('kind', v_kind, 'ref', v_ref)));

  elsif v_test in ('proof', 'best_value') then
    v_k := case when v_test = 'proof' then public.career_proof_key(p_body ->> 'proof_measure') else 'maxpct' end;
    v_need := public.career_num(case when v_test = 'proof' then p_body -> 'proof_need' else p_body -> 'at' end);
    select x.s into s from jsonb_array_elements(coalesce(p_m -> v_k -> 'steps', '[]'::jsonb)) with ordinality x(s, o)
     where public.career_num(x.s -> 1) >= v_need order by x.o limit 1;
    if s is not null then
      v_day := (s ->> 0)::date;
      v_ev := jsonb_build_object('via', v_k, 'n', s -> 1,
                                 'facts', case when s ->> 3 is not null then jsonb_build_array(jsonb_build_object('kind', s ->> 2, 'ref', s ->> 3))
                                               else '[]'::jsonb end);
    end if;

  elsif v_test = 'goals' then
    -- every goal met; the day the last of them was
    if jsonb_typeof(p_body -> 'goals') is distinct from 'array' or jsonb_array_length(p_body -> 'goals') = 0 then return c_none; end if;
    for g in select e from jsonb_array_elements(p_body -> 'goals') e loop
      v_k := public.career_proof_key(g ->> 'kind');
      v_need := public.career_num(g -> 'need');
      if g ->> 'kind' is null or v_k is null or v_need is null then return c_none; end if;
      s := null;
      select x.s into s from jsonb_array_elements(coalesce(p_m -> v_k -> 'steps', '[]'::jsonb)) with ordinality x(s, o)
       where public.career_num(x.s -> 1) >= v_need order by x.o limit 1;
      if s is null then return c_none; end if;
      v_day := greatest(v_day, (s ->> 0)::date);
      v_n := v_n + 1;
      if s ->> 3 is not null and jsonb_array_length(v_facts) < 5 then
        v_facts := v_facts || jsonb_build_array(jsonb_build_object('kind', s ->> 2, 'ref', s ->> 3));
      end if;
    end loop;
    v_ev := jsonb_build_object('via', 'goals', 'n', v_n, 'facts', v_facts);

  elsif v_test in ('cycle_all_held', 'cycle_by_the_book', 'cycle_with_broken') then
    -- a finished cycle judged by the week facts of that cycle (refs c<n>|w<k>, so two cycles' weeks never mix); a week before the first
    -- session, or one Amir paused, has no fact and does not count (D9)
    select c.day, c.ref into v_day, v_ref from public.career_facts c
     where c.athlete_id = p_athlete and c.kind = 'cycle_finished' and c.void_at is null
       and case when v_test = 'cycle_with_broken' then
                  exists (select 1 from public.career_facts w where w.athlete_id = p_athlete and w.kind = 'week_broken' and w.void_at is null
                             and w.value ->> 'cycle' = c.value ->> 'cycle')
                else
                  exists (select 1 from public.career_facts w where w.athlete_id = p_athlete and w.kind = 'week_held' and w.void_at is null
                             and w.value ->> 'cycle' = c.value ->> 'cycle')
                  and not exists (select 1 from public.career_facts w where w.athlete_id = p_athlete and w.kind = 'week_broken' and w.void_at is null
                                     and w.value ->> 'cycle' = c.value ->> 'cycle')
                  and (v_test = 'cycle_all_held'
                       or not exists (select 1 from public.career_facts w
                                       where w.athlete_id = p_athlete and w.kind = 'week_held' and w.void_at is null
                                         and w.value ->> 'cycle' = c.value ->> 'cycle'
                                         and not exists (select 1 from public.career_facts b
                                                          where b.athlete_id = p_athlete and b.kind = 'week_by_the_book' and b.void_at is null
                                                            and b.ref = w.ref)))
           end
     order by c.day, c.ref limit 1;
    v_ev := jsonb_build_object('via', v_test, 'n', 1, 'facts', jsonb_build_array(jsonb_build_object('kind', 'cycle_finished', 'ref', v_ref)));

  elsif v_test = 'runs_together' then
    -- the first day every listed habit's run reaches `run` at once
    v_need := public.career_num(p_body -> 'run');
    with hs as (select distinct x as h from jsonb_array_elements_text(case when jsonb_typeof(p_body -> 'habits') = 'array' then p_body -> 'habits' else '[]'::jsonb end) x),
    tg as (select hs.h, coalesce(public.career_num(p_ctx -> 'targets' -> hs.h),
                                 case when coalesce(p_ctx -> 'custom', '[]'::jsonb) ? hs.h then 1 end) as tgt from hs),
    dn as (
      select tg.h, f.day as d from public.career_facts f join tg on substr(f.ref, 12) = tg.h
       where f.athlete_id = p_athlete and f.kind = 'habit_done' and f.void_at is null
         and jsonb_typeof(f.value -> 'v') = 'number' and (f.value ->> 'v')::numeric >= tg.tgt
    ),
    isl as (select dn.h, dn.d, dn.d - (row_number() over (partition by dn.h order by dn.d))::int as grp from dn),
    rl as (select isl.h, isl.d, (row_number() over (partition by isl.h, isl.grp order by isl.d))::int as run from isl)
    select min(z.d) into v_day from (
      select rl.d from rl where rl.run >= v_need group by rl.d
      having count(distinct rl.h) = (select count(*) from hs)
    ) z
    where (select count(*) from hs) > 0 and (select count(*) from tg where tg.tgt is not null) = (select count(*) from hs);
    v_ev := jsonb_build_object('via', 'runs_together', 'n', v_need, 'facts', '[]'::jsonb);

  elsif v_test = 'patterns_in_cycle' then
    -- a personal best in every group of movement patterns within one cycle; a lift is placed by the Spine (an approved entry whose name or
    -- alias it is, compared as career_norm() compares lifts); one the Spine cannot place counts for nothing
    with cyc as (select (e ->> 'num')::int as num, (e ->> 'cstart')::date as cs, (e ->> 'cend')::date as ce
                   from jsonb_array_elements(coalesce(p_ctx -> 'cycles', '[]'::jsonb)) e),
    grp as (select g2.key as gname, pv.value #>> '{}' as pat
              from jsonb_each(case when jsonb_typeof(p_body -> 'groups') = 'object' then p_body -> 'groups' else '{}'::jsonb end) g2,
                   jsonb_array_elements(case when jsonb_typeof(g2.value) = 'array' then g2.value else '[]'::jsonb end) pv),
    ng as (select count(distinct grp.gname) as n from grp),
    sp as (select public.career_norm(e.name) as nm, e.pattern from public.exercises e where e.status = 'approved' and e.pattern is not null
           union
           select public.career_norm(a.x), e.pattern from public.exercises e cross join unnest(e.aliases) a(x)
            where e.status = 'approved' and e.pattern is not null),
    pb as (select f.day, f.ref, public.career_norm(f.value ->> 'lift') as lift from public.career_facts f
            where f.athlete_id = p_athlete and f.kind = 'personal_best' and f.void_at is null),
    hit as (select c.num, gr.gname, min(pb.day) as d
              from cyc c join pb on pb.day between c.cs and c.ce join sp on sp.nm = pb.lift join grp gr on gr.pat = sp.pattern
             group by c.num, gr.gname),
    got as (select hit.num, max(hit.d) as d from hit group by hit.num
             having count(*) = (select ng.n from ng) and (select ng.n from ng) > 0)
    select got.d, got.num into v_day, v_num from got order by got.d, got.num limit 1;
    if v_day is not null then
      select coalesce(jsonb_agg(jsonb_build_object('kind', 'personal_best', 'ref', z.ref)), '[]'::jsonb) into v_facts
        from (select f.ref from public.career_facts f where f.athlete_id = p_athlete and f.kind = 'personal_best' and f.void_at is null
                 and f.day = v_day order by f.ref limit 5) z;
      v_ev := jsonb_build_object('via', 'patterns_in_cycle', 'n', v_num, 'facts', v_facts);
    end if;

  elsif v_test = 'cycle_proving' then
    -- one cycle with `bests` personal bests in its dates, `retests` retests beaten, at least one week held and none broken
    v_bests := greatest(coalesce(public.career_num(p_body -> 'bests'), 1), 1)::int;
    v_rets := greatest(coalesce(public.career_num(p_body -> 'retests'), 0), 0)::int;
    with cyc as (select (e ->> 'num')::int as num, (e ->> 'cstart')::date as cs, (e ->> 'cend')::date as ce
                   from jsonb_array_elements(coalesce(p_ctx -> 'cycles', '[]'::jsonb)) e),
    x as (
      select c.num,
             (select f.day from public.career_facts f where f.athlete_id = p_athlete and f.kind = 'personal_best' and f.void_at is null
                 and f.day between c.cs and c.ce order by f.day, f.ref offset v_bests - 1 limit 1) as b_day,
             case when v_rets > 0 then
               (select f.day from public.career_facts f where f.athlete_id = p_athlete and f.kind = 'retest_beaten' and f.void_at is null
                   and f.value ->> 'cycle' = c.num::text order by f.day, f.ref offset v_rets - 1 limit 1) end as r_day,
             (select min(f.day) from public.career_facts f where f.athlete_id = p_athlete and f.kind = 'week_held' and f.void_at is null
                 and f.value ->> 'cycle' = c.num::text) as h_day,
             exists (select 1 from public.career_facts f where f.athlete_id = p_athlete and f.kind = 'week_broken' and f.void_at is null
                        and f.value ->> 'cycle' = c.num::text) as broken
        from cyc c
    )
    select greatest(x.b_day, x.r_day, x.h_day), x.num into v_day, v_num from x
     where x.b_day is not null and x.h_day is not null and not x.broken and (v_rets = 0 or x.r_day is not null)
     order by greatest(x.b_day, x.r_day, x.h_day), x.num limit 1;
    v_ev := jsonb_build_object('via', 'cycle_proving', 'n', v_num, 'facts', '[]'::jsonb);

  elsif v_test = 'run_regained' then
    -- after `away_weeks` or more broken weeks in a row with no session at all, the held-weeks run reaches the best run before the gap
    v_aw := greatest(coalesce(public.career_num(p_body -> 'away_weeks'), 4), 1)::int;
    for s in select e from jsonb_array_elements(coalesce(p_m -> 'weeks' -> 'walk', '[]'::jsonb)) e loop
      if s ->> 1 = 'h' then
        v_run := v_run + 1; v_away := 0;
        if v_armed and v_run >= v_old then
          v_day := (s ->> 0)::date;
          v_ev := jsonb_build_object('via', 'run_regained', 'n', v_run,
                                     'facts', jsonb_build_array(jsonb_build_object('kind', 'week_held', 'ref', s ->> 3)));
          exit;
        end if;
        v_best := greatest(v_best, v_run);
      else
        v_run := 0;
        if coalesce(public.career_num(s -> 2), 0) = 0 then v_away := v_away + 1; else v_away := 0; end if;
        if not v_armed and v_away >= v_aw and v_best > 0 then v_armed := true; v_old := v_best; end if;
      end if;
    end loop;
  end if;

  if v_day is null then return c_none; end if;
  return jsonb_build_object('crossed', jsonb_build_array(jsonb_build_object('day', v_day, 'evidence', coalesce(v_ev, '{}'::jsonb))));
end $function$;

-- ── 5. minting ────────────────────────────────────────────────────────────────────────────────────────────────────────

-- One award, once (on conflict do nothing: an award is never changed). A retired entry is minted only for a day on or before the switch; a
-- crossing on or before it is history, always silent ('baseline'). A live award of a size above a tick gets the athlete's recognition row; a
-- title rides on its award's moment (none of its own), except the Grand Slam. A title also goes into hab_titles, so set_title(), claim_titles()
-- and the board work as they do.
create or replace function public.career_mint(p_athlete text, p_kind text, p_item text, p_tier integer, p_subject text, p_day date,
                                              p_body jsonb, p_tier_body jsonb, p_evidence jsonb, p_how text, p_ctx jsonb) returns boolean
language plpgsql set search_path to 'public' as $function$
declare
  v_S date := (p_ctx ->> 'S')::date; v_hist boolean; v_pays boolean; v_xp integer; v_how text; v_size text; v_id text; v_n integer;
begin
  if p_athlete is null or p_day is null or v_S is null then return false; end if;
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
  if p_kind = 'title' then
    insert into public.hab_titles (athlete_id, title, earned_on) values (p_athlete, coalesce(p_body ->> 'proof_id', p_item), p_day)
    on conflict (athlete_id, title) do nothing;
  end if;
  return true;
end $function$;

-- The Grand Slam row: for each of the four meanings the EARLIEST title the athlete owns of it (hab_titles, mapped to the catalogue by
-- proof_id or id, and the catalogue titles minted as awards; level, season, chosen and all never count), and the Grand Slam itself.
create or replace function public.career_slam(p_athlete text) returns jsonb
language sql stable set search_path to 'public' as $function$
  with owned as (
    select c.id as cid, t.earned_on as day
      from public.hab_titles t
      join lateral (select c0.id from public.career_catalogue c0
                     where c0.kind = 'title' and (c0.body ->> 'proof_id' = t.title or c0.id = t.title)
                     order by (c0.body ->> 'proof_id' = t.title) desc nulls last, c0.id limit 1) c on true
     where t.athlete_id = p_athlete
    union all
    select a.item, a.day from public.career_awards a where a.athlete_id = p_athlete and a.kind = 'title'
  ),
  m as (
    select o.cid, o.day, c.body ->> 'meaning' as meaning, c.body ->> 'name' as name
      from owned o join public.career_catalogue c on c.kind = 'title' and c.id = o.cid
  ),
  pick as (
    select distinct on (m.meaning) m.meaning, jsonb_build_object('id', m.cid, 'name', m.name, 'day', m.day) as j
      from m where m.meaning in ('consistency', 'commitment', 'progress', 'resilience')
     order by m.meaning, m.day, m.cid
  )
  select jsonb_build_object(
    'consistency', (select pick.j from pick where pick.meaning = 'consistency'),
    'commitment',  (select pick.j from pick where pick.meaning = 'commitment'),
    'progress',    (select pick.j from pick where pick.meaning = 'progress'),
    'resilience',  (select pick.j from pick where pick.meaning = 'resilience'),
    'grand', (select jsonb_build_object('day', a.day) from public.career_awards a where a.athlete_id = p_athlete and a.award_id = 'title:grand_slam'))
$function$;

-- What evaluate's cache rests on: the score's stamp (the rulebook and so a re-seed, the quest runs, the season, today, the facts, the
-- programme), the awards (a mint with no fact change), the titles in hab_titles (an event title worn through set_title() can complete the
-- Grand Slam) and the Spine's approved entries (their pattern places a personal best for All-Court).
create or replace function public.career_rewards_stamp(p_athlete text) returns text
language sql stable set search_path to 'public' as $function$
  select md5(concat_ws('|',
    public.career_stamp(p_athlete),
    (select count(*)::text || '@' || coalesce(max(a.created_at)::text, '-') from public.career_awards a where a.athlete_id = p_athlete),
    (select count(*)::text || '@' || coalesce(max(t.created_at)::text, '-') from public.hab_titles t where t.athlete_id = p_athlete),
    (select max(e.updated_at)::text from public.exercises e where e.status = 'approved')))
$function$;

-- ── 6. evaluate ───────────────────────────────────────────────────────────────────────────────────────────────────────

-- What the athlete has earned, worked out from their facts, and what is new minted (spec §3.2). p_kinds: the kinds of fact a save changed
-- (only the entries that read them wake up; null = every entry). p_how: 'live' (a moment to tell), 'silent' (a re-seed's catch-up, or the
-- first score after the switch) or 'baseline' (the go-day). With the catalogue switch off: null, and nothing written.
-- The athlete's first call after the switch is always a full one; a full call whose stamp has not moved returns the cache ("skipped").
-- A partial call merges into the cache and never moves its stamp, so the next full call (get_profile) looks at everything again.
-- Returns the cache {stamp, base, have, now, at} and the ids minted in this call.
create or replace function public.career_evaluate(p_athlete text, p_kinds text[] default null, p_how text default 'live') returns jsonb
language plpgsql set search_path to 'public' as $function$
declare
  v_rules jsonb; v_S date; v_old jsonb; v_found boolean; v_kinds text[] := p_kinds; v_stamp text; v_hr jsonb; v_ctx jsonb;
  v_backfill integer; v_commended boolean; v_cycles boolean := false; v_test text;
  c record; t record; x jsonb; r jsonb; v_woken jsonb := '[]'::jsonb; v_keys text[] := '{}'::text[]; v_m jsonb;
  v_have jsonb := '{}'::jsonb; v_now jsonb := '{}'::jsonb; v_minted text[] := '{}'::text[]; v_title boolean := false;
  v_tb jsonb; v_slam jsonb; v_rw jsonb; v_day date;
begin
  if p_athlete is null or not public.career_catalogue_on() then return null; end if;
  if p_how is null or p_how not in ('live', 'silent', 'baseline') then
    raise exception 'career_evaluate: p_how is live, silent or baseline, not %', p_how;
  end if;
  perform pg_advisory_xact_lock(hashtext('career:' || p_athlete));
  v_rules := public.career_rules_now();
  v_S := public.career_switch_day(v_rules, 'catalogue');
  select s.rewards into v_old from public.career_scores s where s.athlete_id = p_athlete;
  v_found := found;
  if not v_found then       -- no score row yet: what an earlier call in this transaction worked out (career_scored() stores it with the row)
    v_old := nullif(current_setting('career.rw_' || md5(p_athlete), true), '')::jsonb;
  end if;
  if v_old ->> 'base' is distinct from v_S::text then v_kinds := null; end if;
  v_stamp := public.career_rewards_stamp(p_athlete);
  if v_kinds is null and v_old ->> 'stamp' = v_stamp then
    return v_old || '{"skipped": true}'::jsonb;
  end if;

  v_hr := public.career_habit_rules();
  v_backfill := coalesce(public.career_num(v_rules #> '{habits,backfill_days}'), 3)::int;
  v_ctx := jsonb_build_object(
    'S', v_S, 'hr', v_hr, 'targets', coalesce(v_hr -> 'targets', '{}'::jsonb),
    'custom', coalesce((select f.value -> 'custom' from public.career_facts f
                         where f.athlete_id = p_athlete and f.kind = 'habit_day' and f.void_at is null and jsonb_typeof(f.value -> 'custom') = 'array'
                         order by f.day desc limit 1), '[]'::jsonb),
    'weights', v_hr -> 'weights', 'cb', v_hr -> 'completionBonus', 'cx', v_hr -> 'customXp',
    'version', (select max(rr.version) from public.career_rules rr),
    'owned', coalesce((select jsonb_object_agg(a.award_id, a.day) from public.career_awards a where a.athlete_id = p_athlete), '{}'::jsonb));
  v_commended := exists (select 1 from public.career_facts f where f.athlete_id = p_athlete and f.kind = 'commendation' and f.void_at is null);

  -- which entries wake, and the measures they need
  for c in select cc.kind, cc.id, cc.body from public.career_catalogue cc where cc.kind in ('badge', 'achievement')
            order by (cc.kind = 'badge') desc, cc.id loop
    if c.body ->> 'meaning' = 'chosen' and not v_commended then continue; end if;                       -- phase 4
    if v_kinds is not null and not (public.career_entry_kinds(c.kind, c.body) && v_kinds) then continue; end if;
    if c.body ? 'retire_at' and p_how <> 'baseline' and current_date > v_S + v_backfill + 1 then continue; end if;
    if c.kind = 'achievement' then
      if (v_ctx -> 'owned') ? ('achievement:' || c.id) then continue; end if;                          -- owned: nothing left to cross
      v_test := public.career_achievement_test(c.body);
      if v_test in ('patterns_in_cycle', 'cycle_proving') then v_cycles := true; end if;
    end if;
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

  -- every woken entry against the measures; what is new is minted
  for x in select e from jsonb_array_elements(v_woken) e loop
    if x ->> 'kind' = 'badge' then
      r := public.career_badge_eval(x ->> 'id', x -> 'body', v_m, v_ctx);
      v_have := v_have || jsonb_build_object(x ->> 'id', r -> 'have');
      if jsonb_typeof(r -> 'now') = 'number' then v_now := v_now || jsonb_build_object(x ->> 'id', r -> 'now'); end if;
    else
      r := public.career_achievement_eval(p_athlete, x ->> 'id', x -> 'body', v_m, v_ctx);
    end if;
    for t in select e from jsonb_array_elements(coalesce(r -> 'crossed', '[]'::jsonb)) e loop
      if public.career_mint(p_athlete, x ->> 'kind', x ->> 'id', (t.e ->> 'tier')::int, coalesce(t.e ->> 'subject', ''), (t.e ->> 'day')::date,
                            x -> 'body', case when t.e ? 'tier' then x -> 'body' -> 'tiers' -> ((t.e ->> 'tier')::int - 1) end,
                            t.e -> 'evidence', p_how, v_ctx) then
        v_minted := v_minted || public.career_award_id(x ->> 'kind', x ->> 'id', (t.e ->> 'tier')::int, coalesce(t.e ->> 'subject', ''));
      end if;
    end loop;
  end loop;

  -- titles: every owned tier or achievement whose CURRENT entry carries a title (a full call looks at all of them, so a title a re-seed
  -- added to a tier already owned, or one an earlier call missed, is minted too; a partial call only at what it just minted)
  for t in
    select a.award_id, a.day, a.size, a.how,
           case when a.kind = 'badge' then k0.body -> 'tiers' -> (a.tier - 1) ->> 'title' else k0.body ->> 'title' end as title
      from public.career_awards a join public.career_catalogue k0 on k0.kind = a.kind and k0.id = a.item
     where a.athlete_id = p_athlete and a.kind in ('badge', 'achievement')
       and (v_kinds is null or a.award_id = any (v_minted))
     order by a.day, a.award_id
  loop
    if t.title is null or exists (select 1 from public.career_awards z where z.athlete_id = p_athlete and z.award_id = 'title:' || t.title) then
      continue;
    end if;
    select k0.body into v_tb from public.career_catalogue k0 where k0.kind = 'title' and k0.id = t.title;
    if v_tb is null then continue; end if;
    if public.career_mint(p_athlete, 'title', t.title, null, '', t.day, v_tb, jsonb_build_object('size', t.size),
                          jsonb_build_object('from', t.award_id), case when t.how = 'live' then p_how else t.how end, v_ctx) then
      v_minted := v_minted || ('title:' || t.title);
      v_title := true;
    end if;
  end loop;

  -- the Grand Slam: a title of each of the four meanings
  if v_title or v_kinds is null then
    v_slam := public.career_slam(p_athlete);
    if v_slam -> 'consistency' <> 'null'::jsonb and v_slam -> 'commitment' <> 'null'::jsonb
       and v_slam -> 'progress' <> 'null'::jsonb and v_slam -> 'resilience' <> 'null'::jsonb
       and v_slam -> 'grand' = 'null'::jsonb then
      select k0.body into v_tb from public.career_catalogue k0 where k0.kind = 'title' and k0.id = 'grand_slam';
      if v_tb is not null then
        v_day := greatest((v_slam #>> '{consistency,day}')::date, (v_slam #>> '{commitment,day}')::date,
                          (v_slam #>> '{progress,day}')::date, (v_slam #>> '{resilience,day}')::date);
        if public.career_mint(p_athlete, 'title', 'grand_slam', null, '', v_day, v_tb, jsonb_build_object('size', coalesce(v_tb ->> 'size', 'legend')),
                              jsonb_build_object('titles', jsonb_build_array(v_slam #> '{consistency,id}', v_slam #> '{commitment,id}',
                                                                             v_slam #> '{progress,id}', v_slam #> '{resilience,id}')),
                              p_how, v_ctx) then
          v_minted := v_minted || 'title:grand_slam'::text;
        end if;
      end if;
    end if;
  end if;

  -- the cache: a partial call merges and keeps the stamp it found
  v_rw := jsonb_build_object(
    'have', coalesce(v_old -> 'have', '{}'::jsonb) || v_have,
    'now', coalesce(v_old -> 'now', '{}'::jsonb) || v_now,
    'at', clock_timestamp(), 'base', v_S::text,
    'stamp', case when v_kinds is null then to_jsonb(public.career_rewards_stamp(p_athlete)) else coalesce(v_old -> 'stamp', 'null'::jsonb) end);
  if v_found then
    update public.career_scores s set rewards = v_rw where s.athlete_id = p_athlete;
  else
    -- never a scoreless row (the board would serve it): kept for this transaction, and career_scored() stores it with the row it writes
    perform set_config('career.rw_' || md5(p_athlete), v_rw::text, true);
  end if;
  return v_rw || jsonb_build_object('minted', to_jsonb(v_minted));
end $function$;

-- ── 7. the scoring seams ──────────────────────────────────────────────────────────────────────────────────────────────

-- stage69's career_facts_paid(), and the awards (kind 'award', one row each, uncapped) once the catalogue switch is on, each priced from the
-- CURRENT catalogue (D12; the price at mint when its entry or tier is gone; nothing for a crossing that does not pay).
create or replace function public.career_facts_paid(p_athlete text)
returns table (kind text, ref text, day date, xp numeric, career_only boolean)
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

-- stage69's career_stamp(), and the awards: a mint with no fact change (get_profile's own evaluate, a batch) moves the score at once.
create or replace function public.career_stamp(p_athlete text) returns text
language sql stable set search_path to 'public' as $function$
  select md5(concat_ws('|',
    (select r.version::text || '@' || r.loaded_at::text from public.career_rules r order by r.version desc limit 1),
    (select md5(coalesce(x.rules -> 'questRuns', '[]'::jsonb)::text) from public.xp_rules x where x.id = 1),
    (select s.starts_on::text from public.current_season() s),
    current_date::text,
    (select count(*)::text || '@' || coalesce(max(f.updated_at)::text, '-') from public.career_facts f where f.athlete_id = p_athlete),
    (select p.updated_at::text from public.programs p where p.athlete_id = p_athlete),
    (select count(*)::text || '@' || coalesce(max(v.saved_at)::text, '-') from public.program_versions v where v.athlete_id = p_athlete),
    (select count(*)::text || '@' || coalesce(max(a.created_at)::text, '-') from public.career_awards a where a.athlete_id = p_athlete)))
$function$;

-- stage69's career_score(): hab_bonus_xp() is given career_bonus_rules() (no tiers or milestones once the catalogue switch is on).
create or replace function public.career_score(p_athlete text, p_season date, p_from date, p_to date) returns jsonb
language plpgsql stable set search_path to 'public' as $function$
declare v_rules jsonb := public.career_habit_rules(); v_paid jsonb; v_log jsonb; v_cfg jsonb; v_daily bigint := 0; v_bonus bigint := 0;
        v_facts jsonb; v_rest numeric;
begin
  if v_rules is null then return null; end if;
  v_paid := public.career_paid_rules(v_rules, public.career_rules_now());
  v_log := public.career_log(p_athlete);
  v_cfg := public.career_cfg(p_athlete);
  v_daily := public.hab_xp(v_log, p_from, p_to, v_paid);
  v_bonus := public.hab_bonus_xp(v_log, v_cfg, p_season, p_from, p_to, public.career_bonus_rules(v_rules, public.career_rules_now()));
  select coalesce(jsonb_object_agg(x.kind, jsonb_build_object('n', x.n, 'xp', x.xp)), '{}'::jsonb), coalesce(sum(x.xp), 0)
    into v_facts, v_rest
    from public.career_facts_xp(p_athlete, p_from, p_to) x;
  return jsonb_build_object('habits', jsonb_build_object('daily', v_daily, 'bonus', v_bonus, 'xp', v_daily + v_bonus),
                            'facts', v_facts, 'facts_xp', round(v_rest)::bigint,
                            'xp', (v_daily + v_bonus + round(v_rest))::bigint);
end $function$;

-- stage69's career_compute(): the three hab_bonus_xp() calls are given career_bonus_rules(); nothing else moves.
create or replace function public.career_compute(p_athlete text) returns jsonb
language plpgsql stable set search_path to 'public' as $function$
declare
  v_rules jsonb := public.career_rules_now(); v_hr jsonb; v_hb jsonb; v_paid jsonb; v_log jsonb; v_cfg jsonb;
  v_name text; v_start date; v_s date; v_wfrom date; v_today date := current_date;
  c_d bigint; c_b bigint; s_d bigint; s_b bigint; w_d bigint; w_b bigint;
  c_f jsonb; c_r numeric; s_f jsonb; s_r numeric; w_r numeric; v_cxp bigint; v_sxp bigint;
begin
  if v_rules is null or p_athlete is null then return null; end if;
  v_hr := public.career_habit_rules();
  v_hb := public.career_bonus_rules(v_hr, v_rules);
  v_paid := public.career_paid_rules(v_hr, v_rules);
  v_log := public.career_log(p_athlete);
  v_cfg := public.career_cfg(p_athlete);
  select s.name, s.starts_on into v_name, v_start from public.current_season() s;
  v_s := coalesce(v_start, '1970-01-01'::date);
  v_wfrom := greatest(v_today - 6, v_s);
  c_d := public.hab_xp(v_log, null, v_today, v_paid);
  c_b := public.hab_bonus_xp(v_log, v_cfg, null, null, v_today, v_hb);
  s_d := public.hab_xp(v_log, v_s, v_today, v_paid);
  s_b := public.hab_bonus_xp(v_log, v_cfg, v_s, v_s, v_today, v_hb);
  w_d := public.hab_xp(v_log, v_wfrom, v_today, v_paid);
  w_b := public.hab_bonus_xp(v_log, v_cfg, v_s, v_wfrom, v_today, v_hb);
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
  v_cxp := (c_d + c_b + round(c_r))::bigint;
  v_sxp := (s_d + s_b + round(s_r))::bigint;
  return jsonb_build_object(
    'career', jsonb_build_object('habits', jsonb_build_object('daily', c_d, 'bonus', c_b, 'xp', c_d + c_b),
                                 'facts', c_f, 'facts_xp', round(c_r)::bigint, 'xp', v_cxp)
              || public.career_level(v_cxp, v_rules),
    'season', jsonb_build_object('name', v_name, 'starts_on', v_start, 'points', v_sxp,
                                 'parts', jsonb_build_object('habits', jsonb_build_object('daily', s_d, 'bonus', s_b, 'xp', s_d + s_b),
                                                             'facts', s_f, 'facts_xp', round(s_r)::bigint, 'xp', v_sxp)),
    'week', jsonb_build_object('from', v_wfrom, 'points', (w_d + w_b + round(w_r))::bigint));
end $function$;

-- stage69's career_scored(), and never a score for an athlete who is not baselined while the catalogue switch is on (spec §4.4): the
-- athlete's first full evaluate runs first ('silent'), so the moment the switch seed commits no board read works out a score with the
-- tiers gone and the awards not minted yet. An evaluate that fails serves the stored score rather than a lower one.
create or replace function public.career_scored(p_athlete text, p_recompute boolean default true) returns jsonb
language plpgsql set search_path to 'public' as $function$
#variable_conflict use_column
declare v_stamp text; v_old text; v_score jsonb; v_rw jsonb; v_S date;
begin
  if p_athlete is null or public.career_rules_now() is null then return null; end if;
  v_S := public.career_switch_day(public.career_rules_now(), 'catalogue');
  if v_S is not null and (select c.rewards ->> 'base' from public.career_scores c where c.athlete_id = p_athlete) is distinct from v_S::text then
    begin
      perform public.career_evaluate(p_athlete, null, 'silent');
    exception when others then
      raise warning 'Career Mode could not work out the awards of %: % (%). The stored score is served.', p_athlete, sqlerrm, sqlstate;
      select c.score into v_score from public.career_scores c where c.athlete_id = p_athlete;
      if v_score is not null then return v_score || '{"stale": true}'::jsonb; end if;
    end;
  end if;
  v_stamp := public.career_stamp(p_athlete);
  select c.stamp, c.score into v_old, v_score from public.career_scores c where c.athlete_id = p_athlete;
  if v_old = v_stamp then return v_score; end if;
  if v_old is not null and not p_recompute then return v_score || '{"stale": true}'::jsonb; end if;
  v_score := public.career_compute(p_athlete);
  if v_score is null then return null; end if;
  v_rw := nullif(current_setting('career.rw_' || md5(p_athlete), true), '')::jsonb;
  insert into public.career_scores as c (athlete_id, stamp, score, updated_at, rewards) values (p_athlete, v_stamp, v_score, now(), v_rw)
  on conflict on constraint career_scores_pkey do update
     set stamp = excluded.stamp, score = excluded.score, updated_at = now(), rewards = coalesce(c.rewards, excluded.rewards);
  return v_score;
end $function$;

-- stage69's career_scores_for(), with the same guard (it counts against the time budget; an athlete the budget leaves out is served the
-- cached score, which by conservation differs only by back-pay).
create or replace function public.career_scores_for(p_ids text[], p_budget interval default interval '2.5 seconds')
returns table (athlete_id text, score jsonb)
language plpgsql set search_path to 'public' as $function$
#variable_conflict use_column
declare v_t0 timestamptz := clock_timestamp(); v_id text; v_stamp text; v_old text; v_cached jsonb; v_score jsonb; v_S date; v_base text;
        v_failed boolean;
begin
  if public.career_rules_now() is null then return; end if;
  v_S := public.career_switch_day(public.career_rules_now(), 'catalogue');
  for v_id in select distinct x.id from unnest(coalesce(p_ids, '{}'::text[])) as x(id) where x.id is not null order by 1 loop
    v_old := null; v_cached := null; v_base := null; v_failed := false;
    select c.stamp, c.score, c.rewards ->> 'base' into v_old, v_cached, v_base from public.career_scores c where c.athlete_id = v_id;
    if v_S is not null and v_base is distinct from v_S::text and not (v_old is not null and clock_timestamp() - v_t0 > p_budget) then
      begin
        perform public.career_evaluate(v_id, null, 'silent');
      exception when others then
        raise warning 'Career Mode could not work out the awards of %: % (%). The stored score is served.', v_id, sqlerrm, sqlstate;
        v_failed := true;
      end;
    end if;
    v_stamp := public.career_stamp(v_id);
    if v_old is not null and (v_old = v_stamp or v_failed or clock_timestamp() - v_t0 > p_budget) then
      athlete_id := v_id; score := v_cached; return next;
      continue;
    end if;
    v_score := public.career_compute(v_id);
    if v_score is null then continue; end if;
    insert into public.career_scores as c (athlete_id, stamp, score, updated_at, rewards)
    values (v_id, v_stamp, v_score, now(), nullif(current_setting('career.rw_' || md5(v_id), true), '')::jsonb)
    on conflict on constraint career_scores_pkey do update
       set stamp = excluded.stamp, score = excluded.score, updated_at = now(), rewards = coalesce(c.rewards, excluded.rewards);
    athlete_id := v_id; score := v_score; return next;
  end loop;
end $function$;

-- stage69's career_keep_levels(), with the level_kept fact stamped by clock_timestamp() (the stamp race, as career_sync()).
create or replace function public.career_keep_levels(p_day date) returns jsonb
language plpgsql set search_path to 'public' as $function$
declare
  v_rules jsonb := public.career_rules_now(); a record; v_rows jsonb := '[]'::jsonb;
  v_record integer; v_now integer; v_best integer; v_xp bigint; v_raw bigint; v_lv integer; v_kept bigint; v_had jsonb;
begin
  if v_rules is null or public.career_switch_day(v_rules, 'xp') is null then
    raise exception 'career_keep_levels: the XP switch is not on (rulebook.toml → [switch] xp)';
  end if;
  for a in
    select z.id,
           coalesce(nullif(btrim(concat_ws(' ', p.data #>> '{athlete,firstName}', p.data #>> '{athlete,lastName}')), ''), o.display_name) as name,
           exists (select 1 from public.athlete_progress ap where ap.athlete_id = z.id and ap.data ? (z.id || '_hab_log')) as has_log
      from (select ap.athlete_id as id from public.athlete_progress ap where ap.data ? (ap.athlete_id || '_hab_log')
            union select r.athlete_id from public.hab_season_results r
            union select f.athlete_id from public.career_facts f where f.void_at is null) z
      left join public.programs p on p.athlete_id = z.id
      left join public.leaderboard_optin o on o.athlete_id = z.id
     order by z.id
  loop
    v_record := (select max(r.level) from public.hab_season_results r where r.athlete_id = a.id);
    v_now := case when a.has_log then public.hab_proof_level(a.id) end;
    v_best := greatest(coalesce(v_record, 0), coalesce(v_now, 0));
    select f.value into v_had from public.career_facts f
     where f.athlete_id = a.id and f.kind = 'level_kept' and f.ref = 'xp-switch' and f.void_at is null;
    v_xp := coalesce((public.career_score(a.id, null, null, current_date) ->> 'xp')::bigint, 0);
    v_raw := v_xp - coalesce(public.career_num(v_had -> 'xp'), 0)::bigint;          -- the career without the level kept
    v_lv := (public.career_level(v_raw, v_rules) ->> 'level')::int;
    v_kept := coalesce(public.career_num(v_had -> 'xp'), 0)::bigint;
    if v_had is null and v_best > v_lv then
      v_kept := public.career_level_floor(v_best, v_rules) - v_raw;
      insert into public.career_facts (athlete_id, kind, ref, day, value, source, updated_at)
      values (a.id, 'level_kept', 'xp-switch', p_day,
              jsonb_strip_nulls(jsonb_build_object('xp', v_kept, 'level', v_best, 'was', v_lv,
                                                   'proof_record', v_record, 'proof_now', v_now)), 'server', clock_timestamp())
      on conflict (athlete_id, kind, ref) do update
         set day = excluded.day, value = excluded.value, source = excluded.source, void_at = null, updated_at = clock_timestamp();
    end if;
    v_rows := v_rows || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'athlete_id', a.id, 'name', a.name, 'proof_now', v_now, 'proof_record', v_record,
      'career_xp', v_raw, 'career_level', v_lv, 'kept_xp', nullif(v_kept, 0),
      'level', (public.career_level(v_raw + v_kept, v_rules) ->> 'level')::int)));
  end loop;
  return v_rows;
end $function$;

-- ── 8. the profile ────────────────────────────────────────────────────────────────────────────────────────────────────

-- What get_profile() adds once the catalogue switch is on (spec §6); with it off exactly {"badges": [], "achievements": [], "moments": []}.
-- p_rw is evaluate's answer; null when it failed this call (then the stored cache, and "rewards_stale": true; the ladder is never empty).
-- Only the CORE: nothing here grows with a career but `owned` (one id an award; the size budget, 14 KB on the longest career). The shelf's
-- detail (every badge row with its tiers and days, the achievements, the full titles list, recent) is get_awards()'s, read when it opens.
create or replace function public.career_rewards_profile(p_athlete text, p_rw jsonb) returns jsonb
language plpgsql stable set search_path to 'public' as $function$
declare
  v_rules jsonb := public.career_rules_now(); v_S date; v_rw jsonb := p_rw; v_stale boolean := false; v_hr jsonb;
  v_ms jsonb; v_keep integer; v_max integer; v_full jsonb; v_free boolean; f record; v_now integer := 0; v_best integer := 0;
  v_dnow integer; v_dbest integer; v_four jsonb; v_ladder jsonb; v_near jsonb; v_out jsonb; v_moments jsonb;
  c_rank constant jsonb := '{"tick": 0, "win": 1, "highlight": 2, "milestone": 3, "legend": 4}'::jsonb;
  c_session constant jsonb := '["session_finished", "session_finished_early", "full_log", "checkin_done"]'::jsonb;
  c_week constant jsonb := '["week_held", "week_by_the_book", "bounce_back", "training_return", "cycle_finished", "roadmap_finished", "effort_win"]'::jsonb;
begin
  v_S := public.career_switch_day(v_rules, 'catalogue');
  if v_S is null then
    return '{"badges": [], "achievements": [], "moments": []}'::jsonb;
  end if;
  if v_rw is null then
    select s.rewards into v_rw from public.career_scores s where s.athlete_id = p_athlete;
    v_rw := coalesce(v_rw, '{}'::jsonb);
    v_stale := true;
  end if;
  v_hr := public.career_habit_rules();
  select c.body into v_ms from public.career_catalogue c where c.kind = 'setting' and c.id = 'moments';
  v_keep := coalesce(public.career_num(v_ms -> 'keep_days'), 14)::int;
  v_max := coalesce(public.career_num(v_ms -> 'max'), 8)::int;
  v_full := coalesce(case when jsonb_typeof(v_ms -> 'full_screen') = 'array' then v_ms -> 'full_screen' end, '["milestone", "legend"]'::jsonb);
  v_free := coalesce((select p.data #>> '{athlete,tier}' = 'free' from public.programs p where p.athlete_id = p_athlete), false);

  -- the four numbers (D3, D4)
  for f in select cf.kind from public.career_facts cf
            where cf.athlete_id = p_athlete and cf.void_at is null and cf.kind in ('week_held', 'week_broken')
            order by cf.day, cf.ref loop
    if f.kind = 'week_held' then v_now := v_now + 1; v_best := greatest(v_best, v_now); else v_now := 0; end if;
  end loop;
  with q as (select cf.day as d from public.career_facts cf where cf.athlete_id = p_athlete and cf.kind = 'day_on_target' and cf.void_at is null),
  isl as (select q.d, q.d - (row_number() over (order by q.d))::int as grp from q),
  rl as (select isl.d, (row_number() over (partition by isl.grp order by isl.d))::int as run from isl)
  select coalesce((select rl.run from rl where rl.d >= current_date - 1 order by rl.d desc limit 1), 0), coalesce((select max(rl.run) from rl), 0)
    into v_dnow, v_dbest;
  select jsonb_build_object(
           'consistency', case when v_free then jsonb_build_object('key', 'day_streak', 'value', v_dnow, 'best', v_dbest)
                               else jsonb_build_object('key', 'weeks_held', 'value', v_now, 'best', v_best) end,
           'commitment', case when v_free then jsonb_build_object('key', 'perfect_days', 'value', count(*) filter (where cf.kind = 'perfect_day'))
                              else jsonb_build_object('key', 'sessions_with_amir',
                                                      'value', count(*) filter (where cf.kind in ('session_finished', 'session_finished_early'))) end,
           'progress', case when v_free then jsonb_build_object('key', 'habit_steps', 'locked', true,
                              'value', coalesce((select sum(z.t) from (select max(a.tier) as t from public.career_awards a
                                                                         join public.career_catalogue c on c.kind = 'badge' and c.id = a.item
                                                                        where a.athlete_id = p_athlete and a.kind = 'badge'
                                                                          and c.body ->> 'kind' = 'best_run' and c.body ? 'habit'
                                                                        group by a.item) z), 0))
                            else jsonb_build_object('key', 'personal_bests', 'value', count(*) filter (where cf.kind = 'personal_best')) end,
           'resilience', jsonb_build_object('key', 'comebacks', 'value', count(*) filter (where cf.kind in ('comeback', 'training_return'))))
    into v_four
    from public.career_facts cf where cf.athlete_id = p_athlete and cf.void_at is null;

  -- the ladder: every live badge (not retired, not chosen), where it stands and its next tier. The size budget (spec §6): a key whose
  -- value is null is left out (phone on a server-only badge, the next-tier keys on a top tier: both apps read absent as null), a `have`
  -- or `tier` of 0 is left out (both apps and the rehearsal read Number(x) || 0), and `counts` and `now` go only with a `phone` (the
  -- finish card, careerMoves(), reads them for those alone); so does `size_next`, once the near list below has been ordered by it.
  -- `next_tier` is always tier + 1 beside a `next`: it goes with a `phone` (the training app's award id for a tier its finish card
  -- crossed, rwCountingBands()) and past tier 5 only, because AA Proof's one other read of it, catalogueTotal() without its catalogue
  -- copy, counts max(5, next_tier) steps for a ladder not yet at its top: absent and 1 to 5 are the same 5 there.
  select coalesce(jsonb_object_agg(c.id, jsonb_strip_nulls(jsonb_build_object(
           'name', c.body ->> 'name', 'meaning', c.body ->> 'meaning', 'counts', case when z.phone is not null then z.counts end,
           'have', nullif(coalesce(public.career_num(v_rw -> 'have' -> c.id), 0), 0),
           'now', case when z.phone is not null then v_rw -> 'now' -> c.id end,
           'tier', nullif(t.tier, 0), 'next', public.career_num(t.nt -> 'at'),
           'next_tier', case when t.nt is not null and (z.phone is not null or t.tier + 1 > 5) then t.tier + 1 end,
           'metal_next', t.nt ->> 'metal', 'size_next', t.nt ->> 'size',
           'phone', z.phone))), '{}'::jsonb)
    into v_ladder
    from public.career_catalogue c
    cross join lateral (select y.counts, case when jsonb_array_length(y.counts) = 0 then null
                                              when y.counts <@ c_session then 'session' when y.counts <@ c_week then 'week' end as phone
                          from (select case jsonb_typeof(c.body -> 'counts') when 'array' then c.body -> 'counts'
                                            when 'string' then jsonb_build_array(c.body -> 'counts') else '[]'::jsonb end as counts) y) z
    cross join lateral (select y.tier, c.body -> 'tiers' -> y.tier as nt
                          from (select coalesce(max(a.tier), 0) as tier from public.career_awards a
                                 where a.athlete_id = p_athlete and a.kind = 'badge' and a.item = c.id and a.subject = '') y) t
   where c.kind = 'badge' and not (c.body ? 'retire_at') and coalesce(c.body ->> 'meaning', '') <> 'chosen'
     and coalesce(c.body ->> 'kind', '') <> 'per_habit_best_run';

  -- near: the nearest goals, an index into the ladder (its name, have, next, meaning, next_tier and metal_next are the ladder entry's,
  -- under the same id). The size budget: the first row carries id, name, have, next and pct (the training app's Home row prints near[0]
  -- alone, careerNearText()); every other row is its id only (AA Proof reads the ids and draws the rest from the ladder, catalogueShelf()).
  select coalesce(jsonb_agg(case when n.rn = 1 then n.j else jsonb_build_object('id', n.id) end order by n.rn), '[]'::jsonb) into v_near
    from (select e.key as id,
                 jsonb_build_object('id', e.key, 'name', e.value ->> 'name', 'have', e.value -> 'have', 'next', e.value -> 'next',
                                    'pct', floor(public.career_num(e.value -> 'have') * 100 / public.career_num(e.value -> 'next'))::int) as j,
                 row_number() over (order by (public.career_num(e.value -> 'next') - public.career_num(e.value -> 'have'))
                                               / public.career_num(e.value -> 'next'),
                                             coalesce(public.career_num(c_rank -> (e.value ->> 'size_next')), 0) desc, e.key) as rn
            from jsonb_each(v_ladder) e
           where public.career_num(e.value -> 'have') > 0 and public.career_num(e.value -> 'next') > 0) n
   where n.rn <= 6;

  -- size_next stays only beside a `phone`: the training app reads it for a ladder its finish card moved (rwCountingBands()), AA Proof
  -- never (the near order above has used it already). The size budget.
  select coalesce(jsonb_object_agg(e.key, case when e.value ? 'phone' then e.value else e.value - 'size_next' end), '{}'::jsonb)
    into v_ladder from jsonb_each(v_ladder) e;

  -- the moments waiting to be told: `also` (the title the award minted) only when there is one (the size budget)
  select coalesce(jsonb_agg(m.j order by m.rk desc, m.day desc, m.award_id), '[]'::jsonb) into v_moments
    from (select r.award_id, a.day, coalesce(public.career_num(c_rank -> r.size), 0) as rk,
                 jsonb_build_object(
                   'award_id', r.award_id, 'kind', a.kind, 'item', a.item, 'tier', a.tier, 'size', r.size, 'day', a.day,
                   'full', (v_full ? r.size) and r.due_at >= now() - make_interval(days => v_keep),
                   'xp', case when not a.pays then 0 else coalesce(public.career_award_xp(a.kind, a.tier, a.subject, c.body, v_hr), a.xp) end,
                   'spec', public.career_award_spec(a.kind, a.item, a.tier, a.day, a.evidence, c.body))
                 || coalesce((select jsonb_build_object('also', jsonb_agg(public.career_award_spec('title', ta.item, null, ta.day, ta.evidence, tc.body)
                                                                          order by ta.item))
                                from public.career_awards ta left join public.career_catalogue tc on tc.kind = 'title' and tc.id = ta.item
                               where ta.athlete_id = p_athlete and ta.kind = 'title' and ta.evidence ->> 'from' = r.award_id
                              having count(*) > 0), '{}'::jsonb) as j
            from public.career_recognition r
            join public.career_awards a on a.athlete_id = r.athlete_id and a.award_id = r.award_id
            left join public.career_catalogue c on c.kind = a.kind and c.id = a.item
           where r.athlete_id = p_athlete and r.audience = 'athlete' and r.told_at is null
           order by 3 desc, a.day desc, r.award_id limit greatest(v_max, 0)) m;

  v_out := jsonb_build_object(
    'catalogue_version', (select r.version::text || '@' || extract(epoch from r.loaded_at)::bigint::text
                            from public.career_rules r order by r.version desc limit 1),
    'numbers', jsonb_build_object('free', v_free, 'four', v_four),
    -- owned: every award id the athlete holds, sorted byte by byte (the phones' dedupe and the shelf's held mark; a set: no day here,
    -- get_awards() has each day). About 25 bytes an award: the one part of the core that grows with a career.
    'owned', coalesce((select jsonb_agg(a.award_id order by a.award_id collate "C") from public.career_awards a where a.athlete_id = p_athlete),
                      '[]'::jsonb),
    'title_worn', (select o.title from public.leaderboard_optin o where o.athlete_id = p_athlete),
    'slam', public.career_slam(p_athlete),
    'ladder', v_ladder,
    'near', v_near,
    'moments', v_moments);
  if v_stale then v_out := v_out || '{"rewards_stale": true}'::jsonb; end if;
  return v_out;
end $function$;

-- stage69's get_profile(), and the awards (spec §6, additive only): reading it works out what is new (career_evaluate(), 'live') before the
-- score, and the answer gains the shelf. An evaluate that fails is a warning: the answer comes from the stored cache, marked rewards_stale.
create or replace function public.get_profile(p_athlete_id text default null) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_me text := public.current_athlete_id();
  v_id text := coalesce(nullif(btrim(coalesce(p_athlete_id, '')), ''), v_me);
  v_rules jsonb; v_score jsonb; v_now integer := 0; v_best integer := 0; f record; v_xp date; v_rw jsonb; v_rp jsonb; v_out jsonb;
begin
  if v_id is null then
    raise exception 'not signed in';
  end if;
  -- the athlete reads their own, the coach anyone's, and so does the SQL editor or the service role (no sign-in claims: a report)
  if not (public.is_coach() or v_id is not distinct from v_me or coalesce(auth.jwt() ->> 'role', '') in ('', 'service_role')) then
    raise exception 'not your profile';
  end if;
  v_rules := public.career_rules_now();
  if v_rules is null then
    return jsonb_build_object('athlete_id', v_id, 'ready', false);
  end if;
  perform public.career_derive(v_id);
  begin
    v_rw := public.career_evaluate(v_id, null, 'live');
  exception when others then
    raise warning 'Career Mode could not work out the awards of %: % (%). The profile is answered from the stored cache.', v_id, sqlerrm, sqlstate;
    v_rw := null;
  end;
  v_score := coalesce(public.career_scored(v_id), '{}'::jsonb);
  v_xp := public.career_switch_day(v_rules, 'xp');
  -- weeks held in a row: only a broken week ends a run (a week between cycles, or one Amir paused, is no week at all)
  for f in select cf.kind from public.career_facts cf
            where cf.athlete_id = v_id and cf.void_at is null and cf.kind in ('week_held', 'week_broken')
            order by cf.day, cf.ref loop
    if f.kind = 'week_held' then v_now := v_now + 1; v_best := greatest(v_best, v_now); else v_now := 0; end if;
  end loop;
  v_out := jsonb_build_object(
    'athlete_id', v_id,
    'ready', true,
    'shadow', v_xp is null,
    'switch', jsonb_build_object('xp', v_xp, 'catalogue', public.career_switch_day(v_rules, 'catalogue')),
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
  v_rp := public.career_rewards_profile(v_id, v_rw);
  return v_out || (v_rp - 'numbers')
         || case when v_rp ? 'numbers' then jsonb_build_object('numbers', (v_out -> 'numbers') || (v_rp -> 'numbers')) else '{}'::jsonb end;
end $function$;

-- The shelf (spec §6, split from get_profile() for the size budget): every badge row with its tiers and the day of each, the achievements,
-- the full titles list and the recent awards. The phones call it only when the shelf opens; it works nothing out (get_profile() evaluates)
-- and writes nothing. Who may read it is get_profile()'s rule: the athlete their own, the coach anyone's, the SQL editor and the service
-- role anyone's. Catalogue off (or no rulebook yet): the same keys, empty, and catalogue null.
create or replace function public.get_awards(p_athlete_id text default null) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare
  v_me text := public.current_athlete_id();
  v_id text := coalesce(nullif(btrim(coalesce(p_athlete_id, '')), ''), v_me);
  v_rules jsonb; v_S date; v_hr jsonb;
begin
  if v_id is null then
    raise exception 'not signed in';
  end if;
  if not (public.is_coach() or v_id is not distinct from v_me or coalesce(auth.jwt() ->> 'role', '') in ('', 'service_role')) then
    raise exception 'not your profile';
  end if;
  v_rules := public.career_rules_now();
  v_S := case when v_rules is not null then public.career_switch_day(v_rules, 'catalogue') end;
  if v_S is null then
    return jsonb_build_object('athlete_id', v_id, 'catalogue', null, 'badges', '[]'::jsonb, 'achievements', '[]'::jsonb,
                              'titles', '[]'::jsonb, 'recent', '[]'::jsonb);
  end if;
  v_hr := public.career_habit_rules();
  return jsonb_build_object(
    'athlete_id', v_id,
    'catalogue', v_S,
    'catalogue_version', (select r.version::text || '@' || extract(epoch from r.loaded_at)::bigint::text
                            from public.career_rules r order by r.version desc limit 1),
    'badges', coalesce((
      -- Every badge the athlete holds, one row per badge (per habit for habit_tiers' ladders), newest first. A live badge: id, subject (only
      -- when there is one), name, meaning, tier, metal, day, caption, and `days`: the day each tier was earned, tier 1 first (null for a tier
      -- skipped). A retired badge is only ever the line "Earned before: HUMAN SPRINKLER II" under the badge that replaced it, so its row is
      -- id, subject, name, meaning, tier, of, retired, superseded_by and days, and a per-habit one (habit_tiers, with a subject) is id, subject,
      -- meaning, tier, retired and days: its successor is the subject's own badge (habitSucc() and earnedBeforeLines() in habits.html).
      select jsonb_agg(b.j order by b.day desc, b.id, b.subject)
        from (select bt.item as id, bt.subject, bt.day,
                     jsonb_strip_nulls(jsonb_build_object(
                       'id', bt.item, 'subject', nullif(bt.subject, ''), 'meaning', bt.meaning, 'tier', bt.tier))
                     || case when rt.retired and bt.subject <> '' then '{}'::jsonb
                             else jsonb_build_object('name', coalesce(c.body ->> 'name', bt.item)) end
                     || case when rt.retired
                             then jsonb_build_object('retired', true)
                                  || case when bt.subject = '' then jsonb_strip_nulls(jsonb_build_object(
                                            'of', case when jsonb_typeof(c.body -> 'tiers') = 'array' then jsonb_array_length(c.body -> 'tiers') end,
                                            'superseded_by', c.body -> 'superseded_by')) else '{}'::jsonb end
                             else jsonb_strip_nulls(jsonb_build_object(
                                    'metal', c.body -> 'tiers' -> (bt.tier - 1) ->> 'metal', 'day', bt.day,
                                    'caption', (public.career_award_spec('badge', bt.item, bt.tier, bt.day, bt.evidence, c.body)) ->> 'caption')) end
                     || jsonb_build_object('days', (select jsonb_agg(to_jsonb(d.day) order by g.t)
                                                      from generate_series(1, bt.tier) g(t)
                                                      left join public.career_awards d on d.athlete_id = bt.athlete_id and d.kind = 'badge'
                                                       and d.item = bt.item and d.subject = bt.subject and d.tier = g.t)) as j
                from (select distinct on (a.item, a.subject) a.* from public.career_awards a
                       where a.athlete_id = v_id and a.kind = 'badge' order by a.item, a.subject, a.tier desc) bt
                left join public.career_catalogue c on c.kind = 'badge' and c.id = bt.item
                cross join lateral (select coalesce(c.body ? 'retire_at', false) as retired) rt
               order by bt.day desc, bt.item, bt.subject) b), '[]'::jsonb),
    'achievements', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
               'id', a.item, 'name', coalesce(c.body ->> 'name', a.item), 'meaning', a.meaning, 'day', a.day, 'size', a.size,
               'caption', (public.career_award_spec('achievement', a.item, null, a.day, a.evidence, c.body)) ->> 'caption',
               'retired', case when c.body ? 'retire_at' then true end, 'superseded_by', c.body -> 'superseded_by')) order by a.day desc, a.item)
        from public.career_awards a left join public.career_catalogue c on c.kind = 'achievement' and c.id = a.item
       where a.athlete_id = v_id and a.kind = 'achievement'), '[]'::jsonb),
    'titles', coalesce((
      with ht as (
        select t.title as hab_id, t.earned_on as day,
               (select c0.id from public.career_catalogue c0 where c0.kind = 'title' and (c0.body ->> 'proof_id' = t.title or c0.id = t.title)
                 order by (c0.body ->> 'proof_id' = t.title) desc nulls last, c0.id limit 1) as cid
          from public.hab_titles t where t.athlete_id = v_id
        union all
        select coalesce(c1.body ->> 'proof_id', a.item), a.day, a.item
          from public.career_awards a left join public.career_catalogue c1 on c1.kind = 'title' and c1.id = a.item
         where a.athlete_id = v_id and a.kind = 'title'
           and not exists (select 1 from public.hab_titles t2 where t2.athlete_id = v_id and t2.title = coalesce(c1.body ->> 'proof_id', a.item))
      ),
      tt as (
        select ht.*, case when ht.hab_id like 't\_sn\_%' then 'season' end as season,
               coalesce(c.body, case when ht.hab_id like 't\_sn\_%' then (select s.body from public.career_catalogue s where s.kind = 'title' and s.id = 'season') end) as body
          from ht left join public.career_catalogue c on c.kind = 'title' and c.id = ht.cid
      )
      -- hab_id only when it differs from id (both apps read `hab_id || id`); empty keys left out (the size budget)
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
               'id', coalesce(tt.cid, case when tt.season is not null then 'season' end, tt.hab_id),
               'hab_id', nullif(tt.hab_id, coalesce(tt.cid, case when tt.season is not null then 'season' end, tt.hab_id)),
               'name', case when tt.season is not null
                            then coalesce((select r.season_name from public.hab_season_results r
                                            where r.athlete_id = v_id and to_char(r.starts_on, 'YYYYMMDD') = substr(tt.hab_id, 6) limit 1),
                                          tt.body ->> 'name', tt.hab_id)
                            else coalesce(tt.body ->> 'name', tt.hab_id) end,
               'meaning', case when tt.season is not null then 'season' else tt.body ->> 'meaning' end,
               'metal', tt.body ->> 'metal', 'from', tt.body ->> 'from', 'day', tt.day,
               -- source: 'award' or 'event' only, the two both apps read (syncCatalogueTitles(), catalogueTitles()); a road title
               -- (meaning 'level', or no catalogue row) and a season title (meaning 'season') say it by their meaning (the size budget)
               'source', case when tt.season is not null then null
                              when tt.body ->> 'meaning' = 'level' or tt.body is null then null
                              when tt.body ->> 'origin' = 'proof' then 'event'
                              else 'award' end)) order by tt.day, tt.hab_id)
        from tt), '[]'::jsonb),
    -- recent: the awards of the last 7 days (not the go-day's baseline), newest first, at most 10, each with its share spec; no created_at
    -- (the order is the server's)
    'recent', coalesce((
      select jsonb_agg(z.j order by z.created_at desc, z.award_id)
        from (select a.award_id, a.created_at,
                     jsonb_build_object('award_id', a.award_id, 'kind', a.kind, 'item', a.item, 'tier', a.tier, 'size', a.size, 'day', a.day,
                       'xp', case when not a.pays then 0 else coalesce(public.career_award_xp(a.kind, a.tier, a.subject, c.body, v_hr), a.xp) end)
                     || jsonb_build_object('spec', public.career_award_spec(a.kind, a.item, a.tier, a.day, a.evidence, c.body)) as j
                from public.career_awards a left join public.career_catalogue c on c.kind = a.kind and c.id = a.item
               where a.athlete_id = v_id and a.how <> 'baseline' and a.created_at >= now() - interval '7 days'
               order by a.created_at desc, a.award_id limit 10) z), '[]'::jsonb));
end $function$;

-- ── 9. the moments: told once ─────────────────────────────────────────────────────────────────────────────────────────

-- An app that showed a moment (or saw one shown by the other app) marks it told (spec §7). Only the athlete themself: the coach's preview
-- and the SQL editor mark nothing (0). p_app is proof or training.
create or replace function public.mark_moments_told(p_athlete_id text, p_award_ids text[], p_app text) returns integer
language plpgsql security definer set search_path to 'public' as $function$
declare v_n integer;
begin
  if p_app is null or p_app not in ('proof', 'training') then
    raise exception 'mark_moments_told: the app is proof or training, not %', coalesce(p_app, 'null');
  end if;
  if p_athlete_id is null or p_athlete_id is distinct from public.current_athlete_id() then
    return 0;
  end if;
  with u as (
    update public.career_recognition r set told_at = now(), told_by = p_app
     where r.athlete_id = p_athlete_id and r.audience = 'athlete' and r.told_at is null and r.award_id = any (coalesce(p_award_ids, '{}'::text[]))
    returning 1
  )
  select count(*) into v_n from u;
  return v_n;
end $function$;

-- ── 10. the seed and the go-day batches ───────────────────────────────────────────────────────────────────────────────

-- stage69's career_seed(), and the catalogue switch (spec §5.4): it is turned on by a seed that changes nothing else (seed the catalogue
-- first, then the switch alone: that seed holds no athlete's lock, as no backfill runs), never in the same seed as the XP switch, and only
-- with today's day (or yesterday's, for a time zone). The seed only flips it: the batches baseline and report.
drop function if exists public.career_seed(integer, jsonb, jsonb, text);
create or replace function public.career_seed(p_version integer, p_rules jsonb, p_catalogue jsonb, p_source text,
                                              p_dry_run boolean default false) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_newest integer; v_n integer; v_old jsonb := public.career_rules_now(); v_which text; v_was date; v_will text;
  v_xp_on date; v_turn_on boolean; v_same boolean; v_backfill jsonb; v_levels jsonb; v_out jsonb; v_cat date; v_turn_cat boolean;
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
      raise exception 'the % switch is on (since %) and is never turned back off: it would take every athlete''s level back. Nothing was changed (the way back is scripts/career/rollback_stage69.sql for xp, rollback_stage70.sql for the catalogue, on Amir''s word)', v_which, v_was;
    end if;
  end loop;
  if public.career_switch_day(p_rules, 'catalogue') is not null and public.career_switch_day(p_rules, 'xp') is null then
    raise exception 'the catalogue switch (phase 3) needs the XP switch (phase 2) on first: nothing was changed';
  end if;
  v_xp_on := public.career_switch_day(p_rules, 'xp');
  v_turn_on := v_xp_on is not null and public.career_switch_day(v_old, 'xp') is null;
  v_same := v_old is not null
        and (v_old - 'version' - 'switch' - 'shadow') = (p_rules - 'version' - 'switch' - 'shadow')
        and (select md5(coalesce(string_agg(c.kind || '|' || c.id || '|' || c.body::text, ',' order by c.kind, c.id), ''))
               from public.career_catalogue c)
          = (select md5(coalesce(string_agg(x.kind || '|' || x.id || '|' || x.body::text, ',' order by x.kind, x.id), ''))
               from jsonb_to_recordset(p_catalogue) as x(kind text, id text, body jsonb));
  v_cat := public.career_switch_day(p_rules, 'catalogue');
  v_turn_cat := v_cat is not null and public.career_switch_day(v_old, 'catalogue') is null;
  if v_turn_cat and v_turn_on then
    raise exception 'turn the XP switch and the catalogue switch on in two seeds, days apart: nothing was changed';
  end if;
  if v_turn_cat and not v_same then
    raise exception 'turn the catalogue switch on with no other change (seed the catalogue first, then the switch alone): nothing was changed';
  end if;
  if v_turn_cat and v_cat < current_date - 1 then
    raise exception 'the catalogue switch day must be today (or yesterday, for a time zone), not %: nothing was changed', v_cat;
  end if;

  begin
    insert into public.career_rules (version, rules, source, loaded_at) values (p_version, p_rules, p_source, now())
    on conflict (version) do update set rules = excluded.rules, source = excluded.source, loaded_at = now();
    delete from public.career_catalogue;
    insert into public.career_catalogue (kind, id, body, version, loaded_at)
    select x.kind, x.id, x.body, p_version, now()
      from jsonb_to_recordset(p_catalogue) as x(kind text, id text, body jsonb);
    get diagnostics v_n = row_count;
    v_backfill := case when v_same then jsonb_build_object('skipped', 'only a switch changed: no fact depends on it')
                       else public.career_backfill(null) end;
    if v_turn_on then
      v_levels := public.career_keep_levels(v_xp_on);
    end if;
    v_out := jsonb_strip_nulls(jsonb_build_object(
      'version', p_version, 'catalogue', v_n, 'backfill', v_backfill,
      'switch', jsonb_build_object('xp', coalesce(v_xp_on::text, 'off'),
                                   'catalogue', coalesce(v_cat::text, 'off')),
      'turned_on', case when v_turn_on then 'xp' when v_turn_cat then 'catalogue' end,
      'levels', v_levels,
      'next', case when v_turn_cat then 'run the career_rewards_batch() statements from scripts/career_seed.py --catalogue-steps'
                   when v_cat is not null and not v_same then 'the catalogue changed with the switch on: run career_rewards_batch(o, 5, ''silent'') from offset 0 until it answers n = 0'
              end));
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

-- The athletes every batch walks, by id: anyone with a Proof log, a season record or a fact (career_keep_levels()'s list).
create or replace function public.career_rewards_athletes(p_offset integer, p_limit integer) returns setof text
language sql stable set search_path to 'public' as $function$
  select z.id from (select ap.athlete_id as id from public.athlete_progress ap where ap.data ? (ap.athlete_id || '_hab_log')
                    union select r.athlete_id from public.hab_season_results r
                    union select f.athlete_id from public.career_facts f where f.void_at is null) z
   order by z.id
  offset greatest(coalesce(p_offset, 0), 0) limit greatest(coalesce(p_limit, 5), 0)
$function$;

-- What AA Proof itself paid an athlete in tiers and milestones up to a day: hab_bonus_xp() over Proof's own log with the xp_rules row, no
-- quests and no comebacks (spec §5.3). Null for an athlete with no Proof log.
create or replace function public.career_proof_sum(p_athlete text, p_to date) returns bigint
language sql stable set search_path to 'public' as $function$
  select public.hab_bonus_xp(public.hab_log_of(ap.data, p_athlete), public.hab_cfg_of(ap.data, p_athlete), null, null, p_to,
                             x.rules || '{"quests": [], "questRuns": [], "comebackXp": 0}'::jsonb)
    from public.athlete_progress ap, public.xp_rules x
   where ap.athlete_id = p_athlete and x.id = 1 and ap.data ? (p_athlete || '_hab_log')
$function$;

-- One athlete's line of the go-day report (README → Turning a switch on): their awards, the XP and level before and after, the season's
-- points before and after, what the awards carried over from Proof against what Proof itself paid, and the back-pay.
create or replace function public.career_rewards_line(p_athlete text, p_before jsonb, p_after jsonb) returns jsonb
language sql stable set search_path to 'public' as $function$
  with s as (select public.career_switch_day(public.career_rules_now(), 'catalogue') as d, public.career_habit_rules() as hr),
  aw as (
    select a.*, c.body,
           case when not a.pays then 0 else coalesce(public.career_award_xp(a.kind, a.tier, a.subject, c.body, s.hr), a.xp) end as px
      from public.career_awards a left join public.career_catalogue c on c.kind = a.kind and c.id = a.item cross join s
     where a.athlete_id = p_athlete
  )
  select jsonb_build_object(
    'athlete_id', p_athlete,
    'name', (select coalesce(nullif(btrim(concat_ws(' ', p.data #>> '{athlete,firstName}', p.data #>> '{athlete,lastName}')), ''),
                             (select o.display_name from public.leaderboard_optin o where o.athlete_id = p_athlete))
               from (select 1) one left join public.programs p on p.athlete_id = p_athlete),
    'awards', (select count(*) from aw where aw.kind <> 'title'),
    'by_meaning', coalesce((select jsonb_object_agg(z.meaning, z.n) from (select aw.meaning, count(*) as n from aw where aw.kind <> 'title'
                                                                           group by aw.meaning) z), '{}'::jsonb),
    'titles', coalesce((select jsonb_agg(aw.item order by aw.day, aw.item) from aw where aw.kind = 'title'), '[]'::jsonb),
    'grand_slam', exists (select 1 from aw where aw.award_id = 'title:grand_slam'),
    'xp_before', p_before #> '{career,xp}', 'xp_after', p_after #> '{career,xp}',
    'level_before', p_before #> '{career,level}', 'level_after', p_after #> '{career,level}',
    'season_before', p_before #> '{season,points}', 'season_after', p_after #> '{season,points}',
    'proof_carried', (select coalesce(sum(aw.px), 0) from aw, s where aw.body ->> 'origin' = 'proof' and aw.day <= s.d),
    'proof_sum', (select public.career_proof_sum(p_athlete, s.d) from s),
    'back_pay', (select coalesce(sum(aw.px), 0) from aw, s where coalesce(aw.body ->> 'origin', 'new') <> 'proof' and aw.day <= s.d),
    'ok', coalesce((p_after #>> '{career,level}')::int >= (p_before #>> '{career,level}')::int, true))
$function$;

-- Go-day, before the switch: each athlete's score under the OLD rules, kept for the report. Five athletes a call; n = 0 means the list ended.
create or replace function public.career_catalogue_before(p_offset integer, p_limit integer) returns jsonb
language plpgsql set search_path to 'public' as $function$
declare v_id text; v_ids jsonb := '[]'::jsonb;
begin
  if public.career_catalogue_on() then
    raise exception 'career_catalogue_before: the catalogue switch is already on; the scores before it are the ones kept in backup.career_catalogue_before';
  end if;
  for v_id in select x from public.career_rewards_athletes(p_offset, p_limit) x loop
    insert into backup.career_catalogue_before (athlete_id, score, at) values (v_id, public.career_compute(v_id), now())
    on conflict (athlete_id) do update set score = excluded.score, at = now();
    v_ids := v_ids || to_jsonb(v_id);
  end loop;
  return jsonb_build_object('n', jsonb_array_length(v_ids), 'ids', v_ids);
end $function$;

-- The dry run (spec §5.4): p_rules is the newest rulebook with [switch] catalogue set to a day and nothing else changed. For each athlete of
-- the slice, the score before; then, inside a block that is always undone, the rulebook with the switch, the baseline, and the score after:
-- the line Amir reads. Nothing is kept.
create or replace function public.career_catalogue_preview(p_rules jsonb, p_offset integer, p_limit integer) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare v_old jsonb := public.career_rules_now(); v_ver integer; v_newest integer; v_src text; v_id text; v_before jsonb; v_line jsonb;
        v_lines jsonb := '[]'::jsonb;
begin
  if v_old is null then raise exception 'career_catalogue_preview: no rulebook loaded yet'; end if;
  if public.career_catalogue_on() then raise exception 'career_catalogue_preview: the catalogue switch is already on'; end if;
  select r.version, r.source into v_newest, v_src from public.career_rules r order by r.version desc limit 1;
  v_ver := public.career_num(p_rules -> 'version')::int;
  if jsonb_typeof(p_rules) is distinct from 'object' or v_ver is null or v_ver < v_newest then
    raise exception 'career_catalogue_preview: p_rules must be a rulebook of version % or later', v_newest;
  end if;
  if ((p_rules - 'version') #- '{switch,catalogue}') is distinct from ((v_old - 'version') #- '{switch,catalogue}') then
    raise exception 'career_catalogue_preview: p_rules may differ from the newest rulebook only in [switch] catalogue (and its version)';
  end if;
  if public.career_switch_day(p_rules, 'catalogue') is null then
    raise exception 'career_catalogue_preview: p_rules has no catalogue switch day (today or before)';
  end if;
  for v_id in select x from public.career_rewards_athletes(p_offset, p_limit) x loop
    v_before := public.career_compute(v_id);
    v_line := null;
    begin
      insert into public.career_rules (version, rules, source, loaded_at) values (v_ver, p_rules, v_src, clock_timestamp())
      on conflict (version) do update set rules = excluded.rules, loaded_at = excluded.loaded_at;
      perform public.career_evaluate(v_id, null, 'baseline');
      v_line := public.career_rewards_line(v_id, v_before, public.career_compute(v_id));
      raise exception using errcode = 'P0001', message = 'career dry run';
    exception when sqlstate 'P0001' then
      if sqlerrm <> 'career dry run' then raise; end if;
    end;
    v_lines := v_lines || jsonb_build_array(v_line);
  end loop;
  return jsonb_build_object('n', jsonb_array_length(v_lines), 'dry_run', true, 'lines', v_lines);
end $function$;

-- Go-day, straight after the seed that turned the switch on ('baseline'), and after any re-seed with the switch on ('silent'): each athlete
-- of the slice evaluated in full and scored, with their line (before = backup.career_catalogue_before when kept). n = 0 means the list ended.
create or replace function public.career_rewards_batch(p_offset integer, p_limit integer, p_how text default 'baseline') returns jsonb
language plpgsql set search_path to 'public' as $function$
declare v_id text; v_lines jsonb := '[]'::jsonb; v_before jsonb; v_after jsonb; v_line jsonb; v_ok boolean := true;
begin
  if not public.career_catalogue_on() then
    raise exception 'career_rewards_batch: the catalogue switch is off (rulebook.toml → [switch] catalogue)';
  end if;
  if p_how is null or p_how not in ('baseline', 'silent') then
    raise exception 'career_rewards_batch: p_how is baseline or silent, not %', p_how;
  end if;
  for v_id in select x from public.career_rewards_athletes(p_offset, p_limit) x loop
    begin
      perform public.career_evaluate(v_id, null, p_how);
      v_after := public.career_scored(v_id);
      select b.score into v_before from backup.career_catalogue_before b where b.athlete_id = v_id;
      v_line := public.career_rewards_line(v_id, coalesce(v_before, v_after), v_after);
    exception when others then
      v_line := jsonb_build_object('athlete_id', v_id, 'ok', false, 'error', sqlerrm);
    end;
    v_ok := v_ok and coalesce((v_line ->> 'ok')::boolean, false);
    v_lines := v_lines || jsonb_build_array(v_line);
  end loop;
  return jsonb_build_object('n', jsonb_array_length(v_lines), 'ok', v_ok, 'lines', v_lines);
end $function$;

-- ── 11. the shadow check, after the catalogue switch too ──────────────────────────────────────────────────────────────

-- stage69's career_compare(). With the catalogue switch on (spec §5.5): both hab_bonus_xp() sides stop paying tiers and milestones
-- (career_bonus_rules(), Proof's xp_rules row too), so the rows keep comparing the day gate, the daily XP, the quests and the comebacks; the
-- rules are compared without tiers and milestones; each row compares what Proof itself paid in them up to the switch day with what the
-- awards carried (a row whose two differ is not ok: settled when a closed day differs); and the answer says the switch day. With it off the
-- answer is stage69's, exactly.
create or replace function public.career_compare(p_season date default null) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_x jsonb; v_r jsonb; v_xp jsonb; v_rp jsonb; v_xb jsonb; v_rb jsonb; v_now jsonb := public.career_rules_now(); v_settle date; v_cat date;
  v_s date; v_t date := current_date; v_wk date; a record;
  v_log jsonb; v_cfg jsonb; v_cl jsonb; v_cc jsonb; v_rows jsonb := '[]'::jsonb; v_bad integer := 0; v_n integer := 0; v_settled integer := 0;
  p_season_xp bigint; c_season_xp bigint; p_week bigint; c_week bigint; p_all bigint; c_all bigint; p_aw bigint; c_aw bigint;
  v_probe jsonb; v_facts jsonb; v_row_ok boolean; v_diff jsonb; v_closed integer; v_out jsonb;
begin
  select x.rules into v_x from public.xp_rules x where x.id = 1;
  v_r := public.career_habit_rules();
  if v_x is null or v_r is null then
    raise exception 'nothing to compare: xp_rules or the Career Mode rulebook is missing';
  end if;
  v_cat := public.career_switch_day(v_now, 'catalogue');
  v_xp := public.career_paid_rules(v_x, v_now);
  v_rp := public.career_paid_rules(v_r, v_now);
  v_xb := public.career_bonus_rules(v_x, v_now);
  v_rb := public.career_bonus_rules(v_r, v_now);
  v_settle := public.career_settled_before(v_now);
  v_s := coalesce(p_season, (select s.starts_on from public.current_season() s), '1970-01-01'::date);
  v_wk := greatest(v_t - 6, v_s);
  select coalesce(jsonb_agg(k.key order by k.key), '[]'::jsonb) into v_diff
    from jsonb_object_keys(v_r) as k(key)
   where k.key <> 'questRuns'
     and (v_cat is null or k.key not in ('tiers', 'milestones'))
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
    -- the closed days whose log and facts differ (only once the XP switch is on: before it, nothing settles)
    v_closed := case when v_settle is null then 0 else
      (select count(*)::int from (
         select coalesce(pl.key, cl.key) as k
           from (select e.key, e.value from jsonb_each(coalesce(v_log, '{}'::jsonb)) e
                  where e.key ~ '^\d{4}-\d{2}-\d{2}$' and jsonb_typeof(e.value) = 'object' and e.key < v_settle::text) pl
           full join (select e.key, e.value from jsonb_each(coalesce(v_cl, '{}'::jsonb)) e where e.key < v_settle::text) cl
             on cl.key = pl.key
          where pl.value is distinct from cl.value) z) end;
    v_row_ok := p_season_xp = c_season_xp and p_week = c_week and p_all = c_all and v_probe = v_facts;
    if v_cat is not null then
      -- the tiers and milestones Proof paid up to the switch, against what the awards carried over (spec §5.3)
      p_aw := public.hab_bonus_xp(v_log, v_cfg, null, null, v_cat, v_x || '{"quests": [], "questRuns": [], "comebackXp": 0}'::jsonb);
      select coalesce(sum(case when not aw.pays then 0
                               else coalesce(public.career_award_xp(aw.kind, aw.tier, aw.subject, c.body, v_r), aw.xp) end), 0)::bigint
        into c_aw
        from public.career_awards aw join public.career_catalogue c on c.kind = aw.kind and c.id = aw.item
       where aw.athlete_id = a.athlete_id and aw.day <= v_cat and c.body ->> 'origin' = 'proof';
      v_row_ok := v_row_ok and p_aw = c_aw;
    end if;
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
      'probe', jsonb_build_object('proof', v_probe, 'facts', v_facts),
      'awards', case when v_cat is not null then jsonb_build_object('proof', p_aw, 'career', c_aw) end)));
  end loop;
  v_out := jsonb_build_object('ok', v_bad = 0 and jsonb_array_length(v_diff) = 0, 'season_start', v_s, 'today', v_t,
                              'xp_switch', public.career_switch_day(v_now, 'xp'), 'settled_before', v_settle,
                              'athletes', v_n, 'matched', v_n - v_bad - v_settled, 'settled', v_settled,
                              'rules_equal', jsonb_array_length(v_diff) = 0, 'rules_differ_on', v_diff, 'rows', v_rows);
  if v_cat is not null then v_out := v_out || jsonb_build_object('catalogue_switch', v_cat); end if;
  return v_out;
end $function$;

-- ── 12. the triggers: evaluate after the facts, never on a delete ─────────────────────────────────────────────────────

-- stage66's three trigger functions, each with one more block after the existing ones: evaluate the athlete with the kinds of fact the
-- save changed (career.changed, reset at the start), only on an insert or update (an erasure deletes rows, and nothing may be minted while
-- it runs: spec §2.6), in its own block so a Career error is a warning and the save goes through. career_on_library() is unchanged: no
-- entry reads library_session.
create or replace function public.career_on_progress() returns trigger
language plpgsql security definer set search_path to 'public' as $function$
declare v_id text := coalesce(new.athlete_id, old.athlete_id); v_habits boolean := true; v_records boolean := true; v_changed text[];
begin
  if tg_op = 'UPDATE' and new.athlete_id = old.athlete_id then
    v_habits := (new.data -> (v_id || '_hab_log')) is distinct from (old.data -> (v_id || '_hab_log'))
             or (new.data -> (v_id || '_hab_cfg')) is distinct from (old.data -> (v_id || '_hab_cfg'));
    v_records := (new.data -> (v_id || '_1rm')) is distinct from (old.data -> (v_id || '_1rm'));
    if not v_habits and not v_records then return null; end if;
  end if;
  perform set_config('career.changed', '', true);
  begin
    if tg_op = 'UPDATE' and new.athlete_id is distinct from old.athlete_id then
      perform public.career_observe_proof(old.athlete_id);
    end if;
    if v_habits then perform public.career_observe_proof(v_id); end if;
  exception when others then
    raise warning 'Career Mode (shadow) could not read the Proof log of %: % (%). The save itself went through.', v_id, sqlerrm, sqlstate;
  end;
  begin
    if tg_op = 'UPDATE' and new.athlete_id is distinct from old.athlete_id then
      perform public.career_derive(old.athlete_id);
    end if;
    if v_records then perform public.career_derive(v_id); end if;
  exception when others then
    raise warning 'Career Mode (shadow) could not work out the training facts of %: % (%). The save itself went through.', v_id, sqlerrm, sqlstate;
  end;
  begin
    if tg_op <> 'DELETE' and public.career_catalogue_on() then
      v_changed := public.career_changed_kinds();
      if v_changed is not null then perform public.career_evaluate(new.athlete_id, v_changed, 'live'); end if;
    end if;
  exception when others then
    raise warning 'Career Mode could not work out the awards of %: % (%). The save itself went through.', v_id, sqlerrm, sqlstate;
  end;
  return null;
end $function$;

create or replace function public.career_on_session() returns trigger
language plpgsql security definer set search_path to 'public' as $function$
declare v_changed text[];
begin
  perform set_config('career.changed', '', true);
  begin
    if tg_op in ('UPDATE', 'DELETE') then
      perform public.career_observe_session(old.athlete_id, old.day, old.completed_on);
    end if;
    if tg_op in ('INSERT', 'UPDATE') then
      perform public.career_observe_session(new.athlete_id, new.day, new.completed_on);
    end if;
  exception when others then
    raise warning 'Career Mode (shadow) could not read a session of %: % (%). The save itself went through.',
                  coalesce(new.athlete_id, old.athlete_id), sqlerrm, sqlstate;
  end;
  begin
    if tg_op in ('INSERT', 'UPDATE') then
      perform public.career_derive(new.athlete_id);
    end if;
    if tg_op = 'DELETE' or (tg_op = 'UPDATE' and new.athlete_id is distinct from old.athlete_id) then
      perform public.career_derive(old.athlete_id);
    end if;
  exception when others then
    raise warning 'Career Mode (shadow) could not work out the training facts of %: % (%). The save itself went through.',
                  coalesce(new.athlete_id, old.athlete_id), sqlerrm, sqlstate;
  end;
  begin
    if tg_op <> 'DELETE' and public.career_catalogue_on() then     -- a hidden session is an update: still evaluated (nothing is taken back)
      v_changed := public.career_changed_kinds();
      if v_changed is not null then perform public.career_evaluate(new.athlete_id, v_changed, 'live'); end if;
    end if;
  exception when others then
    raise warning 'Career Mode could not work out the awards of %: % (%). The save itself went through.', new.athlete_id, sqlerrm, sqlstate;
  end;
  return null;
end $function$;

create or replace function public.career_on_programme() returns trigger
language plpgsql security definer set search_path to 'public' as $function$
declare v_changed text[];
begin
  perform set_config('career.changed', '', true);
  begin
    perform public.career_derive(new.athlete_id);
  exception when others then
    raise warning 'Career Mode (shadow) could not read the programme of %: % (%). The save itself went through.',
                  new.athlete_id, sqlerrm, sqlstate;
  end;
  begin
    if public.career_catalogue_on() then
      v_changed := public.career_changed_kinds();
      if v_changed is not null then perform public.career_evaluate(new.athlete_id, v_changed, 'live'); end if;
    end if;
  exception when others then
    raise warning 'Career Mode could not work out the awards of %: % (%). The save itself went through.', new.athlete_id, sqlerrm, sqlstate;
  end;
  return null;
end $function$;

-- ── 13. who may run what ──────────────────────────────────────────────────────────────────────────────────────────────

-- As stage66 and stage69: every career_ function runs inside the server or from the service role. get_profile() and get_awards() are open
-- to a signed-in athlete (their own) and the coach (anyone's); mark_moments_told() to the signed-in athlete (their own; anyone else marks
-- nothing).
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
revoke all on function public.mark_moments_told(text, text[], text) from public, anon, authenticated;
grant execute on function public.mark_moments_told(text, text[], text) to authenticated, service_role;
revoke all on function public.get_awards(text) from public, anon, authenticated;
grant execute on function public.get_awards(text) to authenticated, service_role;

-- ── 14. coach_erase_person() learns career_awards and career_recognition ──────────────────────────────────────────────
-- Patched from its live definition, as stage66 and stage69: the end of the table list must be found exactly once, or nothing is changed.
-- They are emptied after session_history and athlete_progress, and no trigger evaluates on a delete, so nothing is minted while it runs.
do $stage70_patch$
declare
  d text := pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure);
  s_old constant text := '''career_scores'']';
  s_new constant text := '''career_scores'', ''career_awards'', ''career_recognition'']';
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
