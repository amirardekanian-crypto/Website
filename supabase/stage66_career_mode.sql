-- stage66 — Career Mode, phase 1: the fact ledger, in shadow (2026-10-17; Amir: "go with your picks"; career/CAREER_MODE.md,
-- career/PROCEDURES.md P1, P2, P3, P4, P10, P12, P14 and P15). Safe to re-run.
--
-- What it adds:
--   · Three tables. career_facts holds one row per meaningful action, made once and voided, never deleted (GAME-1): athlete, day,
--     kind, ref, value, source, void_at, unique on athlete + kind + ref. career_rules is rulebook.toml as data, one row per version;
--     career_catalogue is every badge, achievement, title, skin, mission, quest, size, WhatsApp line, tool and setting of the other
--     .toml files. scripts/career_seed.py turns the files into ONE call of career_seed(); no number is typed into this file (GAME-10).
--     Row-level security: an athlete reads their own facts, the coach reads every fact (is_coach()), anyone signed in reads the rules
--     and the catalogue, and nobody but the server writes any of the three.
--   · observe() (P1), as triggers: athlete_progress (the Proof log, its config and the Personal Records), session_history and
--     library_sessions write the base facts; derive() (P2) writes the ones worked out from them and from the programme (held and
--     broken weeks, bounce backs, returns, comebacks, personal bests, cycles finished, retests, effort wins). A hidden or deleted
--     session voids its facts and an un-hidden one brings them back (P12). ⚠️ A trigger never stops a save: an error inside Career Mode
--     is a WARNING in the database log and the save goes through exactly as before.
--   · score (P3, P4). The habit half is scored by Proof's own server functions, hab_xp() and hab_bonus_xp(), fed from the facts (the
--     log and the day lists rebuilt from them, career_log() and career_cfg()) and from the rulebook and the catalogue in xp_rules'
--     shape (career_habit_rules()), so the server keeps ONE copy of the habit rules and Career Mode cannot drift from Proof by being a
--     second one. Every other fact pays its rulebook XP within the rulebook's caps (career_facts_xp()). Levels and ranks follow the
--     rulebook's curve and never reset (career_level()). get_profile() (P10) is the one read: career XP, level, rank, season points,
--     the four numbers and the titles owned.
--   · career_backfill() works every athlete's facts out again from what the apps saved (also run by career_seed() after a rule changes,
--     P16); career_compare() is the shadow check of P14: for every athlete with a Proof log, Career Mode's habit XP against
--     hab_xp() + hab_bonus_xp() (this season, the rolling week, all time), the rules key by key, and three probes that count the days
--     on target, the perfect days and the comebacks through Proof's own CTEs against the facts.
--   · coach_erase_person() learns career_facts, patched in place from its live definition (one snippet, found exactly once, as stage63):
--     the last table it empties, so whatever the other deletes void on the way is erased with it.
--
-- What it leaves alone: nothing an athlete sees reads any of this. AA Proof's scorers, its board and the training app behave exactly
-- as before (the shadow, P14). The rulebook keeps Proof's habit numbers while [shadow] on = true (strength 100, closed days not
-- settled); the switch is phase 2.
--
-- Rehearsed 2026-10-17 away from the live project: scripts/career/rehearse.mjs (PGlite, the schema snapshot, the real rows of the
-- tables Career Mode reads, then this file, the seed, the backfill and career_compare(); it also replays saves, hides, deletes and an
-- erasure, and checks the row-level security).

-- ── 1. the tables ────────────────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.career_rules (
  version   integer primary key check (version >= 1),
  rules     jsonb not null check (jsonb_typeof(rules) = 'object'),
  source    text,                                  -- sha256 of the .toml files it was made from (scripts/career_seed.py)
  loaded_at timestamptz not null default now()
);

create table if not exists public.career_catalogue (
  kind      text not null check (kind in ('badge', 'achievement', 'title', 'skin', 'mission', 'quest', 'size', 'message', 'tool', 'setting')),
  id        text not null check (id ~ '^[a-z][a-z0-9_]*$'),
  body      jsonb not null check (jsonb_typeof(body) = 'object'),
  version   integer not null,                      -- the rulebook version it was loaded with
  loaded_at timestamptz not null default now(),
  primary key (kind, id)
);

create table if not exists public.career_facts (
  athlete_id text not null,
  kind       text not null check (kind ~ '^[a-z][a-z0-9_]*$'),
  ref        text not null,                        -- what makes it unique for the athlete: the session, the habit and day, the cycle and week
  day        date not null,                        -- the athlete's own day, the one the app files it under
  value      jsonb not null default '{}'::jsonb check (jsonb_typeof(value) = 'object'),
  source     text not null check (source in ('training', 'proof', 'coach', 'server')),
  void_at    timestamptz,                          -- set when the thing it records is gone (a hidden session); it then pays nothing
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (athlete_id, kind, ref)
);
create index if not exists career_facts_day_idx on public.career_facts (athlete_id, day);

alter table public.career_rules enable row level security;
alter table public.career_catalogue enable row level security;
alter table public.career_facts enable row level security;

do $stage66_policies$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'career_facts' and policyname = 'athlete reads own career facts') then
    create policy "athlete reads own career facts" on public.career_facts as permissive for select to authenticated
      using (athlete_id in (select ai.athlete_id from public.athlete_identities ai where ai.user_id = (select auth.uid())));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'career_facts' and policyname = 'coach reads career facts') then
    create policy "coach reads career facts" on public.career_facts as permissive for select to authenticated
      using ((select public.is_coach()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'career_rules' and policyname = 'signed in reads career rules') then
    create policy "signed in reads career rules" on public.career_rules as permissive for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'career_catalogue' and policyname = 'signed in reads career catalogue') then
    create policy "signed in reads career catalogue" on public.career_catalogue as permissive for select to authenticated using (true);
  end if;
end $stage66_policies$;

revoke all on table public.career_rules, public.career_catalogue, public.career_facts from public, anon, authenticated;
grant select on table public.career_rules, public.career_catalogue, public.career_facts to authenticated;
grant all on table public.career_rules, public.career_catalogue, public.career_facts to service_role;

-- ── 2. small helpers ─────────────────────────────────────────────────────────────────────────────────────────────────────

-- A calendar day from text that starts YYYY-MM-DD, or null (never an error: a stray value must not stop a save).
create or replace function public.career_day(p text) returns date
language plpgsql immutable set search_path to 'public' as $function$
begin
  if p is null or p !~ '^\d{4}-\d{2}-\d{2}' then return null; end if;
  return left(p, 10)::date;
exception when others then
  return null;
end $function$;

-- A JSON number, or text that is one, as numeric; anything else null.
create or replace function public.career_num(p jsonb) returns numeric
language plpgsql immutable set search_path to 'public' as $function$
declare t text;
begin
  if p is null then return null; end if;
  if jsonb_typeof(p) = 'number' then return (p #>> '{}')::numeric; end if;
  if jsonb_typeof(p) = 'string' then
    t := btrim(p #>> '{}');
    if t ~ '^[+-]?([0-9]+([.][0-9]*)?|[.][0-9]+)$' then return t::numeric; end if;
  end if;
  return null;
end $function$;

-- JavaScript's truthiness of a JSON value (the app writes the session log, so the server reads it the way the app does).
create or replace function public.career_truthy(p jsonb) returns boolean
language sql immutable set search_path to 'public' as $function$
  select case jsonb_typeof(p)
           when 'boolean' then p = 'true'::jsonb
           when 'number' then (p #>> '{}')::numeric <> 0
           when 'string' then (p #>> '{}') <> ''
           when 'object' then true
           when 'array' then true
           else false end
$function$;

-- JavaScript's Number() of a JSON value; null where it would be NaN.
create or replace function public.career_js_num(p jsonb) returns numeric
language plpgsql immutable set search_path to 'public' as $function$
declare t text;
begin
  if p is null then return null; end if;
  case jsonb_typeof(p)
    when 'number' then return (p #>> '{}')::numeric;
    when 'boolean' then return case when p = 'true'::jsonb then 1 else 0 end;
    when 'null' then return 0;
    when 'string' then
      t := btrim(p #>> '{}');
      if t = '' then return 0; end if;
      if t ~ '^[+-]?([0-9]+([.][0-9]*)?|[.][0-9]+)([eE][+-]?[0-9]+)?$' then return t::numeric; end if;
      return null;
    else return null;
  end case;
end $function$;

-- program.html's normDigits(): Persian and Arabic-Indic digits to 0-9, the Arabic decimal separator and comma to a point.
create or replace function public.career_digits(p text) returns text
language sql immutable set search_path to 'public' as $function$
  select translate(coalesce(p, ''),
                   U&'\06F0\06F1\06F2\06F3\06F4\06F5\06F6\06F7\06F8\06F9\0660\0661\0662\0663\0664\0665\0666\0667\0668\0669\066B\060C',
                   '01234567890123456789..')
$function$;

-- program.html's parseLoggedKg(): the first number of a free-text weight ("62,5", "60kg", "۲۵"), and "2×20" read as one implement's 20.
create or replace function public.career_kg(p jsonb) returns numeric
language plpgsql immutable set search_path to 'public' as $function$
declare t text; m text[]; k numeric;
begin
  if p is null or jsonb_typeof(p) not in ('string', 'number') then return null; end if;
  if not public.career_truthy(p) then return null; end if;        -- String(v || ''): 0 and '' read as nothing
  t := regexp_replace(public.career_digits(p #>> '{}'), ',', '.');  -- the first comma only, as String.replace does
  m := regexp_match(t, '^\s*([1-4])\s*[×xX*]\s*([0-9]+(?:\.[0-9]+)?)');
  if m is not null then
    k := m[2]::numeric;
    return case when k > 0 then k end;
  end if;
  m := regexp_match(t, '[0-9]+(?:\.[0-9]+)?');
  if m is null then return null; end if;
  k := m[1]::numeric;
  return case when k > 0 then k end;
end $function$;

-- program.html's histNorm(): the name a lift is matched by.
create or replace function public.career_norm(p text) returns text
language sql immutable set search_path to 'public' as $function$
  select btrim(regexp_replace(lower(coalesce(p, '')), '\s+', ' ', 'g'))
$function$;

-- A JSON value with its arrays sorted, so two lists that hold the same things compare equal (career_compare()).
create or replace function public.career_canon(p jsonb) returns jsonb
language sql immutable set search_path to 'public' as $function$
  select case when jsonb_typeof(p) = 'array'
              then coalesce((select jsonb_agg(e.v order by e.v::text) from jsonb_array_elements(p) as e(v)), '[]'::jsonb)
              else p end
$function$;

-- The part of an xp_rules list that scores (career_compare()): a milestone's code, need, xp and measure; a quest's id, kind, need and xp;
-- a tier's days and mult. Anything else is passed through as it is.
create or replace function public.career_scoring(p_key text, p jsonb) returns jsonb
language sql immutable set search_path to 'public' as $function$
  select case
    when jsonb_typeof(p) = 'array' and p_key = 'milestones' then
      (select coalesce(jsonb_agg(jsonb_build_object('code', e.v -> 'code', 'need', e.v -> 'need', 'xp', e.v -> 'xp', 'measure', e.v -> 'measure')), '[]'::jsonb)
         from jsonb_array_elements(p) as e(v))
    when jsonb_typeof(p) = 'array' and p_key = 'quests' then
      (select coalesce(jsonb_agg(jsonb_build_object('id', e.v -> 'id', 'kind', e.v -> 'kind', 'need', e.v -> 'need', 'xp', e.v -> 'xp')), '[]'::jsonb)
         from jsonb_array_elements(p) as e(v))
    when jsonb_typeof(p) = 'array' and p_key = 'tiers' then
      (select coalesce(jsonb_agg(jsonb_build_object('days', e.v -> 'days', 'mult', e.v -> 'mult')), '[]'::jsonb)
         from jsonb_array_elements(p) as e(v))
    else p end
$function$;

-- ── 3. the rules ─────────────────────────────────────────────────────────────────────────────────────────────────────────

-- The newest rulebook (career_rules), or null before the first seed: then every Career Mode step does nothing.
create or replace function public.career_rules_now() returns jsonb
language sql stable set search_path to 'public' as $function$
  select r.rules from public.career_rules r order by r.version desc limit 1
$function$;

-- The rulebook and the catalogue in the shape of Proof's xp_rules row, for hab_xp() and hab_bonus_xp(): the habit numbers from
-- [habits], the consistency tiers from badges.toml → habit_tiers, Proof's milestones from the badge tiers and achievements that carry
-- proof_measure, its quests from the missions that carry proof_kind. The quest RUNS are not a rule but the record of Amir's Quest week
-- lever, so they are read where Proof keeps them (xp_rules.questRuns) until the crew mission replaces the lever (phase 5).
create or replace function public.career_habit_rules() returns jsonb
language sql stable set search_path to 'public' as $function$
  with r as (select public.career_rules_now() as j),
  b as (select c.body from public.career_catalogue c where c.kind = 'badge' and c.body ->> 'origin' = 'proof'),
  a as (select c.body from public.career_catalogue c where c.kind = 'achievement' and c.body ->> 'origin' = 'proof'),
  m as (select c.body from public.career_catalogue c where c.kind = 'mission' and c.body ->> 'origin' = 'proof')
  select case when r.j is null then null else jsonb_build_object(
    'completionBonus',  r.j #> '{habits,completion_bonus}',
    'customXp',         r.j #> '{habits,weights,custom}',
    'maxCustom',        r.j #> '{habits,max_custom}',
    'weights',          coalesce(r.j #> '{habits,weights}', '{}'::jsonb) - 'custom',
    'targets',          coalesce(r.j #> '{habits,targets}', '{}'::jsonb),
    'streakQualifyPct', r.j #> '{habits,qualify_pct}',
    'gateV2',           r.j #> '{habits,one_miss_door}',
    'unearnable',       coalesce(r.j #> '{habits,locked}', '[]'::jsonb),
    'lapseDays',        r.j #> '{habits,lapse_days}',
    'comebackXp',       r.j #> '{fact,comeback,xp}',
    'comebackStick',    r.j #> '{habits,comeback_stick}',
    'tiers', coalesce((select jsonb_agg(jsonb_build_object('days', t.value -> 'at', 'mult', t.value -> 'mult') order by t.ord)
                         from b, jsonb_array_elements(b.body -> 'tiers') with ordinality t(value, ord)
                        where b.body ->> 'kind' = 'per_habit_best_run'), '[]'::jsonb),
    'milestones', coalesce((select jsonb_agg(x.ms) from (
                     select jsonb_build_object('code', b.body -> 'proof_codes' -> (t.ord - 1)::int, 'need', t.value -> 'at',
                                               'xp', t.value -> 'xp', 'measure', b.body -> 'proof_measure') as ms
                       from b, jsonb_array_elements(b.body -> 'tiers') with ordinality t(value, ord)
                      where b.body ? 'proof_measure'
                     union all
                     select jsonb_build_object('code', a.body -> 'proof_code', 'need', a.body -> 'proof_need',
                                               'xp', a.body -> 'xp', 'measure', a.body -> 'proof_measure')
                       from a where a.body ? 'proof_measure') x), '[]'::jsonb),
    'quests', coalesce((select jsonb_agg(jsonb_build_object('id', m.body -> 'proof_id', 'kind', m.body -> 'proof_kind',
                                                            'need', m.body -> 'proof_need', 'xp', m.body -> 'proof_xp'))
                          from m where m.body ? 'proof_kind'), '[]'::jsonb),
    'questRuns', coalesce((select x.rules -> 'questRuns' from public.xp_rules x where x.id = 1), '[]'::jsonb)
  ) end
  from r
$function$;

-- ── 4. writing facts ─────────────────────────────────────────────────────────────────────────────────────────────────────

-- Makes the athlete's facts of these kinds what `p_want` says (a JSON array of {kind, ref, day, value}): a new one is inserted, a
-- changed one updated (and un-voided), and one that is no longer wanted is VOIDED, never deleted (GAME-1). `p_refs` narrows what may be
-- voided to those refs (one session); `p_settled_before` leaves facts dated before that day alone except for a first arrival (P1 step
-- 4, a closed habit day, once the shadow ends). Returns how many rows changed.
create or replace function public.career_sync(p_athlete text, p_kinds text[], p_want jsonb, p_source text,
                                              p_refs text[] default null, p_settled_before date default null)
returns integer
language plpgsql set search_path to 'public' as $function$
declare v_up integer; v_gone integer;
begin
  with w as (
    select distinct on (x.kind, x.ref) x.kind, x.ref, x.day, coalesce(x.value, '{}'::jsonb) as value
      from jsonb_to_recordset(coalesce(p_want, '[]'::jsonb)) as x(kind text, ref text, day date, value jsonb)
     where x.kind = any (p_kinds) and x.ref is not null and x.day is not null
     order by x.kind, x.ref
  ), up as (
    insert into public.career_facts as f (athlete_id, kind, ref, day, value, source)
    select p_athlete, w.kind, w.ref, w.day, w.value, p_source from w
    on conflict (athlete_id, kind, ref) do update
       set day = excluded.day, value = excluded.value, source = excluded.source, void_at = null, updated_at = now()
     where (f.day is distinct from excluded.day or f.value is distinct from excluded.value
            or f.source is distinct from excluded.source or f.void_at is not null)
       and (p_settled_before is null or f.day >= p_settled_before)
    returning 1
  )
  select count(*) into v_up from up;

  with w as (
    select x.kind, x.ref
      from jsonb_to_recordset(coalesce(p_want, '[]'::jsonb)) as x(kind text, ref text, day date, value jsonb)
     where x.kind = any (p_kinds)
  ), gone as (
    update public.career_facts f set void_at = now(), updated_at = now()
     where f.athlete_id = p_athlete and f.kind = any (p_kinds) and f.void_at is null
       and (p_refs is null or f.ref = any (p_refs))
       and (p_settled_before is null or f.day >= p_settled_before)
       and not exists (select 1 from w where w.kind = f.kind and w.ref = f.ref)
    returning 1
  )
  select count(*) into v_gone from gone;
  return v_up + v_gone;
end $function$;

-- The first day that is still open on Proof's log once the shadow is off (today and [habits] backfill_days before it, plus one day so
-- no time zone closes a day early), or null while the shadow is on: then nothing settles and Career Mode follows the log as Proof does.
create or replace function public.career_settled_before(p_rules jsonb) returns date
language sql stable set search_path to 'public' as $function$
  select case when coalesce((p_rules #>> '{shadow,on}')::boolean, true) then null
              else current_date - (coalesce((p_rules #>> '{habits,backfill_days}')::int, 3) + 1) end
$function$;

-- ── 5. P1, the Proof log: habit_done, habit_day, workout_tick ───────────────────────────────────────────────────────────

-- The day gate from the facts: for every day on the log, how many habits on its list were done, and whether it was on target
-- (dayQualifies(): the share of the weight it could earn, or at most one thing left undone) and perfect (isPerfect()). The CTEs from
-- perday on are hab_bonus_xp()'s own, word for word, over the log rebuilt from the facts, so the two cannot judge a day differently;
-- career_compare() proves it on the real logs (its three probes).
create or replace function public.career_habit_days(p_athlete text)
returns table (d date, ndone integer, nlive integer, on_target boolean, perfect boolean)
language sql stable set search_path to 'public' as $function$
with
  rr as (select public.career_habit_rules() as p_rules),
  bonusmult as (
    select coalesce((rr.p_rules ->> 'customXp')::numeric, 25) as cx,
           coalesce((rr.p_rules ->> 'streakQualifyPct')::numeric, 80) as qpct,
           coalesce((rr.p_rules ->> 'gateV2')::boolean, false) as gate2
      from rr
  ),
  hday as (
    select f.day, f.value from public.career_facts f
     where f.athlete_id = p_athlete and f.kind = 'habit_day' and f.void_at is null
  ),
  dl as (
    select h.day as d,
           coalesce((select jsonb_object_agg(substr(x.ref, 12), x.value -> 'v') from public.career_facts x
                      where x.athlete_id = p_athlete and x.kind = 'habit_done' and x.void_at is null and x.day = h.day),
                    '{}'::jsonb) as vals,
           h.value -> 'live' as ids
      from hday h
  ),
  lastday as (select h.value from hday h order by h.day desc limit 1),
  habits as (
    select t.key as hid, t.value::numeric as tgt, b.cx as fallback
      from rr, jsonb_each_text(coalesce(rr.p_rules -> 'targets', '{}'::jsonb)) t, bonusmult b
    union all
    select c.value, 1::numeric, b.cx
      from lastday, jsonb_array_elements_text(coalesce(lastday.value -> 'custom', '[]'::jsonb)) c, bonusmult b
  ),
  weighted as (
    select h.hid, h.tgt, coalesce((rr.p_rules -> 'weights' ->> h.hid)::numeric, h.fallback) as w
      from habits h, rr
  ),
  daylive as (
    select dl.d, w.hid, w.tgt, w.w,
           jsonb_exists(coalesce(rr.p_rules -> 'unearnable', '[]'::jsonb), w.hid) as lockd
      from dl cross join weighted w cross join rr
     where jsonb_exists(dl.ids, w.hid)
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
  )
select p.d, p.ndone, p.nlive, (q.d is not null), (p.nlive > 0 and p.ndone >= p.nlive)
  from perday p left join qualday q on q.d = p.d
$function$;

-- P2 for the days: day_on_target and perfect_day (Proof's own facts, source 'proof'), comeback (a day on target after [habits]
-- lapse_days or more that were not, with an earlier one before them; source 'server': its value keeps the day on target it came back
-- from, so a season pays it Proof's way, counting it only from a day on target inside the season) and comeback_stuck (a comeback
-- followed by [habits] comeback_stick days on target in a row, dated the day it stuck).
create or replace function public.career_derive_days(p_athlete text) returns void
language plpgsql set search_path to 'public' as $function$
declare v_rules jsonb := public.career_rules_now(); v_want jsonb; v_lapse integer; v_stick integer; v_settle date;
begin
  if v_rules is null or p_athlete is null then return; end if;
  v_lapse := coalesce((v_rules #>> '{habits,lapse_days}')::int, 3);
  v_stick := coalesce((v_rules #>> '{habits,comeback_stick}')::int, 7);
  v_settle := public.career_settled_before(v_rules);
  with hd as (select * from public.career_habit_days(p_athlete)),
  q as (select hd.d, lag(hd.d) over (order by hd.d) as prev from hd where hd.on_target),
  isl as (select hd.d, hd.d - (row_number() over (order by hd.d))::int as grp from hd where hd.on_target),
  runs as (select min(isl.d) as s, count(*)::int as len from isl group by isl.grp)
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_want from (
    select jsonb_build_object('kind', 'day_on_target', 'ref', hd.d::text, 'day', hd.d,
                              'value', jsonb_build_object('done', hd.ndone, 'of', hd.nlive)) as x
      from hd where hd.on_target
    union all
    select jsonb_build_object('kind', 'perfect_day', 'ref', hd.d::text, 'day', hd.d, 'value', jsonb_build_object('of', hd.nlive))
      from hd where hd.perfect
    union all
    select jsonb_build_object('kind', 'comeback', 'ref', q.d::text, 'day', q.d,
                              'value', jsonb_build_object('prev', q.prev, 'gone', q.d - q.prev - 1))
      from q where v_lapse > 0 and q.prev is not null and q.d - q.prev - 1 >= v_lapse
    union all
    select jsonb_build_object('kind', 'comeback_stuck', 'ref', q.d::text, 'day', q.d + v_stick - 1,
                              'value', jsonb_build_object('held', r.len))
      from q join runs r on r.s = q.d
     where v_lapse > 0 and v_stick > 0 and q.prev is not null and q.d - q.prev - 1 >= v_lapse and r.len >= v_stick
  ) s;
  perform public.career_sync(p_athlete, array['day_on_target', 'perfect_day'], v_want, 'proof', null, v_settle);
  perform public.career_sync(p_athlete, array['comeback', 'comeback_stuck'], v_want, 'server', null, v_settle);
end $function$;

-- P1 for the Proof log, read the way hab_xp() reads it: every (day, habit) value of the log becomes a habit_done fact holding the value
-- as it is (a 0 included: Proof's day gate counts a habit logged at 0 as one left undone), every day a habit_day fact with the habits
-- on its list (rosterOn(): the roster entry in force that day, else every habit not switched off) and the athlete's own habits, and a
-- locked habit done (WORKOUT, ticked by a finished session) a workout_tick. Then the day facts (career_derive_days()).
create or replace function public.career_observe_proof(p_athlete text) returns void
language plpgsql set search_path to 'public' as $function$
declare
  v_rules jsonb := public.career_rules_now();
  v_data jsonb; v_log jsonb; v_cfg jsonb; v_want jsonb;
begin
  if v_rules is null or p_athlete is null then return; end if;
  perform pg_advisory_xact_lock(hashtext('career:' || p_athlete));
  select a.data into v_data from public.athlete_progress a where a.athlete_id = p_athlete;
  v_log := public.hab_log_of(v_data, p_athlete);
  if jsonb_typeof(v_log) is distinct from 'object' then v_log := '{}'::jsonb; end if;
  v_cfg := public.hab_cfg_of(v_data, p_athlete);
  if jsonb_typeof(v_cfg) is distinct from 'object' then v_cfg := '{}'::jsonb; end if;

  with dl as (
    select public.career_day(e.key) as d, e.value as vals
      from jsonb_each(v_log) e
     where e.key ~ '^\d{4}-\d{2}-\d{2}$' and jsonb_typeof(e.value) = 'object' and public.career_day(e.key) is not null
  ),
  hv as (select dl.d, h.key as hid, h.value as v from dl, jsonb_each(dl.vals) h),
  weighted as (
    select t.key as hid from jsonb_each(coalesce(v_rules #> '{habits,targets}', '{}'::jsonb)) t
    union all
    select c.value ->> 'id'
      from jsonb_array_elements(case when jsonb_typeof(v_cfg -> 'custom') = 'array' then v_cfg -> 'custom' else '[]'::jsonb end) c
     where c.value ->> 'id' is not null
  ),
  roster as (
    select r.value
      from jsonb_array_elements(case when jsonb_typeof(v_cfg -> 'roster') = 'array' then v_cfg -> 'roster' else '[]'::jsonb end) r(value)
  ),
  dayroster as (
    select dl.d,
           (select r.value -> 'ids' from roster r
             where public.career_day(r.value ->> 'from') <= dl.d
             order by public.career_day(r.value ->> 'from') desc limit 1) as ids
      from dl
  ),
  custom as (
    select coalesce(jsonb_agg(c.value ->> 'id'), '[]'::jsonb) as ids
      from jsonb_array_elements(case when jsonb_typeof(v_cfg -> 'custom') = 'array' then v_cfg -> 'custom' else '[]'::jsonb end) c
     where c.value ->> 'id' is not null
  ),
  onlist as (
    select coalesce(jsonb_agg(w.hid), '[]'::jsonb) as ids from weighted w where coalesce(v_cfg -> 'on' ->> w.hid, 'true') <> 'false'
  )
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_want from (
    select jsonb_build_object('kind', 'habit_done', 'ref', hv.d::text || '|' || hv.hid, 'day', hv.d,
                              'value', jsonb_build_object('v', hv.v)) as x
      from hv
    union all
    select jsonb_build_object('kind', 'habit_day', 'ref', dr.d::text, 'day', dr.d,
                              'value', jsonb_build_object('live', case when dr.ids is not null then dr.ids else o.ids end,
                                                          'custom', c.ids))
      from dayroster dr, onlist o, custom c
    union all
    select jsonb_build_object('kind', 'workout_tick', 'ref', hv.d::text, 'day', hv.d, 'value', jsonb_build_object('habit', hv.hid))
      from hv
     where jsonb_typeof(hv.v) = 'number'
       and jsonb_exists(coalesce(v_rules #> '{habits,locked}', '[]'::jsonb), hv.hid)
       and (hv.v #>> '{}')::numeric >= coalesce(public.career_num(v_rules #> array['habits', 'targets', hv.hid]), 1)
  ) s;
  perform public.career_sync(p_athlete, array['habit_done', 'habit_day', 'workout_tick'], v_want, 'proof', null,
                             public.career_settled_before(v_rules));
  perform public.career_derive_days(p_athlete);
end $function$;

-- ── 6. P1, the training app: sessions and Library sessions ──────────────────────────────────────────────────────────────

-- The facts of one session (p_day and p_on), or of every session of the athlete (p_day null). A plan session finished with Done
-- ('Complete') is session_finished, one finished early ('Partial (n of m …)') session_finished_early; full_log when it was finished as
-- written, every set ticked and every set rated where the card asks an RPE (see `asks`); checkin_done when the check-in was answered
-- and not skipped. The answers and the RPE numbers are never stored or paid (GAME-5). A hidden session has no facts (P12).
create or replace function public.career_session_want(p_athlete text, p_day integer default null, p_on date default null)
returns jsonb
language sql stable set search_path to 'public' as $function$
  with s as (
    select sh.day, sh.completed_on, sh.duration_min, sh.readiness, sh.log,
           'd' || sh.day || '|' || sh.completed_on::text as ref,
           regexp_match(coalesce(sh.status, ''), '^\s*partial\s*\(\s*(\d+)\s+of\s+(\d+)', 'i') as part,
           coalesce(sh.status, '') ~* '^\s*partial' as early
      from public.session_history sh
     where sh.athlete_id = p_athlete and sh.hidden_at is null
       and (p_day is null or (sh.day = p_day and sh.completed_on = p_on))
  ),
  ent as (      -- every set of every exercise of a structured log (a circuit logs rounds, not sets)
    select s.ref, e.o, st.v as st
      from s, jsonb_array_elements(case when jsonb_typeof(s.log) = 'array' then s.log else '[]'::jsonb end) with ordinality as e(v, o),
           jsonb_array_elements(case when jsonb_typeof(e.v) = 'object' and jsonb_typeof(e.v -> 'sets') = 'array'
                                     then e.v -> 'sets' else '[]'::jsonb end) as st(v)
  ),
  asks as (     -- the exercises whose card asks an RPE: the log does not carry the target, so one rated on any set asks it on all
    select ent.ref, ent.o from ent group by ent.ref, ent.o having bool_or(public.career_truthy(ent.st -> 'r'))
  ),
  logged as (
    select s.ref,
           jsonb_typeof(s.log) = 'array' and not s.early
           and exists (select 1 from ent where ent.ref = s.ref)
           and not exists (select 1 from ent where ent.ref = s.ref and not public.career_truthy(ent.st -> 'd'))
           and not exists (select 1 from ent join asks on asks.ref = ent.ref and asks.o = ent.o
                            where ent.ref = s.ref and not public.career_truthy(ent.st -> 'r')) as ok
      from s
  ),
  checkin as (
    select s.ref,
           jsonb_typeof(s.readiness) = 'object'
           and not public.career_truthy(s.readiness -> 'skipped')
           and exists (select 1 from unnest(array['composite', 'score', 'sleep', 'energy', 'soreness', 'stress', 'overall']) as k(key)
                        where jsonb_typeof(s.readiness -> k.key) = 'number') as ok
      from s
  )
  select coalesce(jsonb_agg(x), '[]'::jsonb) from (
    select jsonb_build_object('kind', case when s.early then 'session_finished_early' else 'session_finished' end,
                              'ref', s.ref, 'day', s.completed_on,
                              'value', jsonb_strip_nulls(jsonb_build_object('plan_day', s.day::text, 'minutes', s.duration_min,
                                                                            'done', (s.part)[1]::int, 'of', (s.part)[2]::int))) as x
      from s
    union all
    select jsonb_build_object('kind', 'full_log', 'ref', s.ref, 'day', s.completed_on, 'value', jsonb_build_object('plan_day', s.day::text))
      from s join logged l on l.ref = s.ref where l.ok
    union all
    select jsonb_build_object('kind', 'checkin_done', 'ref', s.ref, 'day', s.completed_on, 'value', jsonb_build_object('plan_day', s.day::text))
      from s join checkin c on c.ref = s.ref where c.ok
  ) z
$function$;

-- One session (a save, a hide, a delete), or all of them (p_day null: the backfill).
create or replace function public.career_observe_session(p_athlete text, p_day integer default null, p_on date default null) returns void
language plpgsql set search_path to 'public' as $function$
begin
  if public.career_rules_now() is null or p_athlete is null then return; end if;
  perform pg_advisory_xact_lock(hashtext('career:' || p_athlete));
  perform public.career_sync(p_athlete, array['session_finished', 'session_finished_early', 'full_log', 'checkin_done'],
                             public.career_session_want(p_athlete, p_day, p_on), 'training',
                             case when p_day is null then null else array['d' || p_day || '|' || p_on::text] end);
end $function$;

-- A Library session marked done (log_library_session()): one library_session fact. It never counts toward a held week (P2).
create or replace function public.career_observe_library(p_athlete text, p_slug text default null, p_on date default null) returns void
language plpgsql set search_path to 'public' as $function$
declare v_want jsonb;
begin
  if public.career_rules_now() is null or p_athlete is null then return; end if;
  perform pg_advisory_xact_lock(hashtext('career:' || p_athlete));
  select coalesce(jsonb_agg(jsonb_build_object('kind', 'library_session', 'ref', ls.slug || '|' || ls.completed_on::text,
                                               'day', ls.completed_on,
                                               'value', jsonb_strip_nulls(jsonb_build_object('slug', ls.slug, 'counts_as', ls.counts_as,
                                                                                             'minutes', ls.duration_min)))), '[]'::jsonb)
    into v_want
    from public.library_sessions ls
   where ls.athlete_id = p_athlete and (p_slug is null or (ls.slug = p_slug and ls.completed_on = p_on));
  perform public.career_sync(p_athlete, array['library_session'], v_want, 'training',
                             case when p_slug is null then null else array[p_slug || '|' || p_on::text] end);
end $function$;

-- ── 7. P2, the training: weeks, cycles, records, retests, effort wins ───────────────────────────────────────────────────

-- Every training week of every published cycle (index ≤ currentCycleIndex) that has its dates: cycleWeekInfo()'s weeks, 7 days from
-- startDate + (k − 1) × 7, the last one cut at endDate, max(1, round(days ÷ 7)) of them. A cycle with no dates has no training week,
-- as in the app (cycleWeekInfo() is null for it). The plan's days: the programme's own for the current cycle; for a past one, the
-- newest saved version of the programme on that cycle (program_versions), else its archive entry (programHistory, "prog<num>", else
-- by position when every past cycle has one), as days 1 to n.
create or replace function public.career_weeks(p_athlete text)
returns table (cycle_index integer, cycle_num integer, week integer, weeks integer, wfrom date, wto date,
               cstart date, cend date, plan text[], is_current boolean, is_last boolean)
language sql stable set search_path to 'public' as $function$
  with p as (select pr.data from public.programs pr where pr.athlete_id = p_athlete),
  cur as (
    select p.data,
           case when jsonb_typeof(p.data -> 'currentCycleIndex') = 'number'
                     and public.career_num(p.data -> 'currentCycleIndex') = trunc(public.career_num(p.data -> 'currentCycleIndex'))
                then public.career_num(p.data -> 'currentCycleIndex')::int else 0 end as cci,
           case when jsonb_typeof(p.data -> 'cycles') = 'array' then p.data -> 'cycles' else '[]'::jsonb end as cycles,
           case when jsonb_typeof(p.data -> 'programHistory') = 'array' then p.data -> 'programHistory' else '[]'::jsonb end as hist
      from p
  ),
  c as (
    select (x.o - 1)::int as idx,
           coalesce(case when public.career_num(x.c -> 'num') = trunc(public.career_num(x.c -> 'num'))
                         then public.career_num(x.c -> 'num')::int end, x.o::int) as num,
           public.career_day(x.c ->> 'startDate') as s, public.career_day(x.c ->> 'endDate') as e,
           cur.cci, jsonb_array_length(cur.cycles) as ncyc, cur.data, cur.hist
      from cur, jsonb_array_elements(cur.cycles) with ordinality x(c, o)
  ),
  planned as (
    select c.*,
           case when c.idx = c.cci then
             (select array_agg(coalesce(y.d ->> 'id', y.o::text) order by y.o)
                from jsonb_array_elements(case when jsonb_typeof(c.data -> 'workouts' -> 'days') = 'array'
                                               then c.data -> 'workouts' -> 'days' else '[]'::jsonb end) with ordinality y(d, o))
           else coalesce(
             (select array_agg(coalesce(y.d ->> 'id', y.o::text) order by y.o)
                from (select v.data from public.program_versions v
                       where v.athlete_id = p_athlete and jsonb_typeof(v.data -> 'currentCycleIndex') = 'number'
                         and public.career_num(v.data -> 'currentCycleIndex') = c.idx
                       order by v.saved_at desc limit 1) lv,
                     jsonb_array_elements(case when jsonb_typeof(lv.data -> 'workouts' -> 'days') = 'array'
                                               then lv.data -> 'workouts' -> 'days' else '[]'::jsonb end) with ordinality y(d, o)),
             (select array_agg(g::text order by g)
                from (select h.v as h from jsonb_array_elements(c.hist) as h(v)
                       where h.v ->> 'id' = 'prog' || c.num limit 1) hp,
                     generate_series(1, case when jsonb_typeof(hp.h -> 'days') = 'array' then jsonb_array_length(hp.h -> 'days') else 0 end) g),
             (select array_agg(g::text order by g)
                from (select c.hist -> (c.cci - 1 - c.idx) as h where jsonb_array_length(c.hist) = c.cci) hp,
                     generate_series(1, case when jsonb_typeof(hp.h -> 'days') = 'array' then jsonb_array_length(hp.h -> 'days') else 0 end) g))
           end as plan
      from c
     where c.idx <= c.cci
  )
  select pl.idx, pl.num, k::int, t.tot, pl.s + 7 * (k - 1), least(pl.s + 7 * k - 1, pl.e), pl.s, pl.e, pl.plan,
         pl.idx = pl.cci, pl.idx = pl.ncyc - 1
    from planned pl
   cross join lateral (select greatest(1, round((pl.e - pl.s) / 7.0)::int) as tot) t
   cross join lateral generate_series(1, t.tot) k
   where pl.s is not null and pl.e is not null and pl.e >= pl.s and cardinality(pl.plan) > 0
$function$;

-- Every exercise of every structured session log in a window, with its best set by cycleBestSet() (the effort-adjusted index: Epley on
-- reps to failure, reps + 10 − RPE) and its best estimate of a max by histBestSet() (estimateOneRM(): RPE needed, at most 10 effective
-- reps, rounded to 2.5 kg). Both are program.html's maths, mirrored: a change there changes here (CLAUDE.md, things that exist twice).
-- Sessions saved before the structured log existed (only the text summary) are not read.
create or replace function public.career_entry_sets(p_athlete text, p_from date, p_to date, p_plan text[])
returns table (d date, plan_day integer, ord integer, name text, lift text,
               b_w numeric, b_n numeric, b_n_given boolean, b_r numeric, b_idx numeric, best_est numeric)
language plpgsql stable set search_path to 'public' as $function$
declare
  s record; e jsonb; eo integer; st jsonb;
  w numeric; n numeric; n_given boolean; r numeric; rir numeric; idx numeric; rpe numeric; eff numeric; est numeric;
  has_best boolean; bw numeric; bn numeric; bng boolean; br numeric; bidx numeric; best numeric;
begin
  for s in
    select sh.completed_on, sh.day, sh.log from public.session_history sh
     where sh.athlete_id = p_athlete and sh.hidden_at is null and jsonb_typeof(sh.log) = 'array'
       and sh.completed_on between coalesce(p_from, '-infinity'::date) and coalesce(p_to, 'infinity'::date)
       and (p_plan is null or sh.day::text = any (p_plan))
     order by sh.completed_on, sh.day
  loop
    eo := 0;
    for e in select x.value from jsonb_array_elements(s.log) x loop
      eo := eo + 1;
      if jsonb_typeof(e) <> 'object' or public.career_truthy(e -> 'circuit') or not public.career_truthy(e -> 'ex') then continue; end if;
      has_best := false; bw := null; bn := null; bng := false; br := null; bidx := null; best := null;
      for st in select y.value from jsonb_array_elements(case when jsonb_typeof(e -> 'sets') = 'array' then e -> 'sets' else '[]'::jsonb end) y loop
        -- histSetLogged(): a weight, an RPE or a tick
        if jsonb_typeof(st) <> 'object'
           or not (public.career_truthy(st -> 'w') or public.career_truthy(st -> 'r') or public.career_truthy(st -> 'd')) then
          continue;
        end if;
        w := public.career_kg(st -> 'w');
        if st ? 'n' and jsonb_typeof(st -> 'n') <> 'null' and not (jsonb_typeof(st -> 'n') = 'string' and st ->> 'n' = '') then
          n_given := true; n := public.career_js_num(st -> 'n');
        elsif public.career_truthy(e -> 'reps') then
          n_given := true; n := public.career_js_num(e -> 'reps');
        else
          n_given := false; n := null;
        end if;
        r := case when public.career_truthy(st -> 'r') then public.career_js_num(st -> 'r') end;
        rir := case when r >= 6 and r <= 10 then 10 - r else 0 end;
        idx := case when n is not null and n <> 0 then case when w is not null then w * (1 + (n + rir) / 30) else n + rir end end;
        if not has_best
           or (idx is not null and (bidx is null or idx > bidx))
           or (idx is null and bidx is null and r is not null and (br is null or r < br)) then
          has_best := true; bw := w; bn := n; bng := n_given; br := r; bidx := idx;
        end if;
        rpe := public.career_js_num(st -> 'r');
        est := null;
        if w is not null and n is not null and n > 0 and rpe > 0 then
          eff := n + greatest(0, 10 - rpe);
          if eff <= 10 then
            est := round((case when eff <= 1 then w else w * (1 + eff / 30) end) / 2.5) * 2.5;
          end if;
        end if;
        if est is not null and (best is null or est > best) then best := est; end if;
      end loop;
      if has_best then
        d := s.completed_on; plan_day := s.day; ord := eo; name := e ->> 'ex'; lift := public.career_norm(e ->> 'ex');
        b_w := bw; b_n := bn; b_n_given := bng; b_r := br; b_idx := bidx; best_est := best;
        return next;
      end if;
    end loop;
  end loop;
end $function$;

-- winText()'s verdict on a lift: the first session of the cycle (a) against its best one since (b). The effort-adjusted gain, or null
-- when there is nothing honest to call a win: under [fact.effort_win] min_gain, one set loaded and the other not, or (GAME-5, decided
-- 2026-10-17) neither the weight nor the reps went up. A lower RPE alone, and so every hold, still shows on the This cycle card
-- (cycleWins()) and earns nothing here.
create or replace function public.career_win_gain(a_w numeric, a_n numeric, a_ng boolean, a_idx numeric,
                                                  b_w numeric, b_n numeric, b_ng boolean, b_idx numeric, p_min numeric) returns numeric
language plpgsql immutable set search_path to 'public' as $function$
declare v_g numeric; v_dw numeric := 0; v_dn numeric;
begin
  if not a_ng or not b_ng then return null; end if;            -- a hold: only its RPE can move
  v_g := case when coalesce(a_idx, 0) <> 0 and coalesce(b_idx, 0) <> 0 then b_idx / a_idx - 1 else 0 end;
  if v_g < p_min then return null; end if;
  if not (a_w is not null and b_w is not null) and (a_w is not null or b_w is not null) then return null; end if;
  if a_w is not null and b_w is not null then v_dw := round((b_w - a_w) * 2) / 2; end if;   -- winText(): to the half kilo
  v_dn := coalesce(b_n, 0) - coalesce(a_n, 0);
  if not (v_dw > 0 or v_dn > 0) then return null; end if;
  return v_g;
end $function$;

-- A cycle's effort-matched wins (cycleWins(): each lift's first session of the cycle against its best one since, the best by the
-- index, or by a lower RPE when neither has one) that career_win_gain() calls a win, the best [fact.effort_win] limit of them, a tie
-- going to the lift met first.
create or replace function public.career_cycle_wins(p_athlete text, p_from date, p_to date, p_plan text[], p_rules jsonb)
returns table (lift text, name text, gain numeric)
language plpgsql stable set search_path to 'public' as $function$
declare
  v_min numeric := coalesce(public.career_num(p_rules #> '{fact,effort_win,min_gain}'), 0.02);
  v_limit integer := coalesce(public.career_num(p_rules #> '{fact,effort_win,limit}')::int, 3);
  x record; v_cur text := null; v_out jsonb := '[]'::jsonb; v_g numeric;
  a_name text; a_w numeric; a_n numeric; a_ng boolean; a_idx numeric; a_first integer;
  has_b boolean := false; b_w numeric; b_n numeric; b_ng boolean; b_r numeric; b_idx numeric;
begin
  for x in
    select es.*, dense_rank() over (order by es.f_d, es.f_pd, es.f_o, es.lift) as met
      from (select e0.*, first_value(e0.d) over w0 as f_d, first_value(e0.plan_day) over w0 as f_pd, first_value(e0.ord) over w0 as f_o
              from public.career_entry_sets(p_athlete, p_from, p_to, p_plan) e0
             where e0.lift <> ''
            window w0 as (partition by e0.lift order by e0.d, e0.plan_day, e0.ord)) es
     order by es.lift, es.d, es.plan_day, es.ord
  loop
    if v_cur is distinct from x.lift then
      if v_cur is not null and has_b then
        v_g := public.career_win_gain(a_w, a_n, a_ng, a_idx, b_w, b_n, b_ng, b_idx, v_min);
        if v_g is not null then
          v_out := v_out || jsonb_build_array(jsonb_build_object('l', v_cur, 'nm', a_name, 'g', v_g, 'met', a_first));
        end if;
      end if;
      v_cur := x.lift; a_name := x.name; a_w := x.b_w; a_n := x.b_n; a_ng := x.b_n_given; a_idx := x.b_idx; a_first := x.met;
      has_b := false;
    elsif not has_b then
      has_b := true; b_w := x.b_w; b_n := x.b_n; b_ng := x.b_n_given; b_r := x.b_r; b_idx := x.b_idx;
    elsif (x.b_idx is not null and (b_idx is null or x.b_idx > b_idx))
       or (x.b_idx is null and b_idx is null and x.b_r is not null and (b_r is null or x.b_r < b_r)) then
      b_w := x.b_w; b_n := x.b_n; b_ng := x.b_n_given; b_r := x.b_r; b_idx := x.b_idx;
    end if;
  end loop;
  if v_cur is not null and has_b then
    v_g := public.career_win_gain(a_w, a_n, a_ng, a_idx, b_w, b_n, b_ng, b_idx, v_min);
    if v_g is not null then
      v_out := v_out || jsonb_build_array(jsonb_build_object('l', v_cur, 'nm', a_name, 'g', v_g, 'met', a_first));
    end if;
  end if;
  return query
    select y.l, y.nm, y.g from jsonb_to_recordset(v_out) as y(l text, nm text, g numeric, met integer)
     order by y.g desc, y.met
     limit v_limit;
end $function$;

-- A lift's best since its first session (lift_gain, P2): over every structured log, the highest effort-adjusted index with the weight
-- or the reps above the first session's (GAME-5: a lower RPE alone is no gain), as the percent above the first, and its day.
create or replace function public.career_lift_gains(p_athlete text)
returns table (lift text, name text, pct numeric, d date)
language plpgsql stable set search_path to 'public' as $function$
declare
  x record; v_cur text := null; v_out jsonb := '[]'::jsonb;
  a_name text; a_w numeric; a_n numeric; a_ng boolean; a_idx numeric; best_idx numeric; best_d date;
begin
  for x in
    select es.* from public.career_entry_sets(p_athlete, null, null, null) es
     where es.lift <> '' order by es.lift, es.d, es.plan_day, es.ord
  loop
    if v_cur is distinct from x.lift then
      if v_cur is not null and best_idx is not null then
        v_out := v_out || jsonb_build_array(jsonb_build_object('l', v_cur, 'nm', a_name, 'p', round((best_idx / a_idx - 1) * 100, 1), 'dd', best_d));
      end if;
      v_cur := x.lift; a_name := x.name; a_w := x.b_w; a_n := x.b_n; a_ng := x.b_n_given; a_idx := x.b_idx;
      best_idx := null; best_d := null;
    elsif a_ng and x.b_n_given and coalesce(a_idx, 0) > 0 and coalesce(x.b_idx, 0) > a_idx and x.b_idx > coalesce(best_idx, 0)
          and ((a_w is null) = (x.b_w is null))
          and ((a_w is not null and round((x.b_w - a_w) * 2) / 2 > 0) or coalesce(x.b_n, 0) > coalesce(a_n, 0)) then
      best_idx := x.b_idx; best_d := x.d;
    end if;
  end loop;
  if v_cur is not null and best_idx is not null then
    v_out := v_out || jsonb_build_array(jsonb_build_object('l', v_cur, 'nm', a_name, 'p', round((best_idx / a_idx - 1) * 100, 1), 'dd', best_d));
  end if;
  return query select y.l, y.nm, y.p, y.dd from jsonb_to_recordset(v_out) as y(l text, nm text, p numeric, dd date);
end $function$;

-- P2 for the training. Writes week_held, week_broken, bounce_back, training_return, cycle_finished, roadmap_finished, effort_win,
-- personal_best, retest_done, retest_beaten, week_by_the_book, month_with_amir and lift_gain from the sessions, the programme and the
-- Personal Records, and voids any of them that no longer holds (a hidden session, a changed programme). Runs after every save the training app makes, after a programme changes,
-- and when a profile is read, so a week that ended with no save is still judged (P2: "once at the start of each day", with no cron).
create or replace function public.career_derive(p_athlete text) returns void
language plpgsql set search_path to 'public' as $function$
declare
  v_rules jsonb := public.career_rules_now();
  v_close integer; v_share numeric; v_away integer; v_window integer;
  v_paused date; v_want jsonb := '[]'::jsonb; w record; c record; x record;
  v_ref text; v_closed boolean; v_run integer := 0; v_armed boolean := false; v_prev_broken boolean := false; v_prev_to date;
  v_done integer; v_planned integer; v_recs jsonb; v_raw text; v_first date; v_status text;
begin
  if v_rules is null or p_athlete is null then return; end if;
  perform pg_advisory_xact_lock(hashtext('career:' || p_athlete));
  v_close := coalesce(public.career_num(v_rules #> '{week,close_after_days}')::int, 1);
  v_share := coalesce(public.career_num(v_rules #> '{fact,cycle_finished,min_share}'), 0.8);
  v_away := coalesce(public.career_num(v_rules #> '{fact,training_return,weeks_away}')::int, 2);
  v_window := coalesce(public.career_num(v_rules #> '{fact,retest_done,window_days}')::int, 7);
  select s.since, s.status into v_paused, v_status from public.athlete_status s where s.athlete_id = p_athlete;
  select min(sh.completed_on) into v_first from public.session_history sh where sh.athlete_id = p_athlete and sh.hidden_at is null;

  -- ── weeks, in the order they happened, from the week of the athlete's first session ──
  for w in
    with wk as (select * from public.career_weeks(p_athlete)),
    s as (select sh.day::text as pday, sh.completed_on as d, 'd' || sh.day || '|' || sh.completed_on::text as ref
            from public.session_history sh where sh.athlete_id = p_athlete and sh.hidden_at is null)
    select wk.*,
           (select count(*) from s where s.d between wk.wfrom and wk.wto and s.pday = any (wk.plan))::int as nsess,
           (select bool_and(exists (select 1 from s where s.d between wk.wfrom and wk.wto and s.pday = pd)) from unnest(wk.plan) pd) as held,
           (select max(z.fd) from (select min(s.d) as fd from s where s.d between wk.wfrom and wk.wto and s.pday = any (wk.plan)
                                    group by s.pday) z) as held_on,
           (select bool_and(exists (select 1 from public.career_facts f where f.athlete_id = p_athlete and f.kind = 'full_log'
                                       and f.ref = s.ref and f.void_at is null)
                            and exists (select 1 from public.career_facts f where f.athlete_id = p_athlete and f.kind = 'checkin_done'
                                           and f.ref = s.ref and f.void_at is null))
              from s where s.d between wk.wfrom and wk.wto and s.pday = any (wk.plan)) as by_book
      from wk
     order by wk.wfrom, wk.cycle_index
  loop
    if v_first is null or w.wto < v_first then
      continue;              -- before their first session: a week they never started is neither held nor broken
    end if;
    v_ref := 'c' || w.cycle_num || '|w' || w.week;
    v_closed := current_date > w.wto + v_close;
    if w.held then
      if v_armed then
        v_want := v_want || jsonb_build_array(jsonb_build_object('kind', 'training_return', 'ref', v_ref, 'day', w.held_on,
                    'value', jsonb_build_object('cycle', w.cycle_num, 'week', w.week)));
        v_armed := false;
      end if;
      if v_prev_broken and w.wfrom - v_prev_to <= 8 then
        v_want := v_want || jsonb_build_array(jsonb_build_object('kind', 'bounce_back', 'ref', v_ref, 'day', w.held_on,
                    'value', jsonb_build_object('cycle', w.cycle_num, 'week', w.week)));
      end if;
      v_want := v_want || jsonb_build_array(jsonb_build_object('kind', 'week_held', 'ref', v_ref, 'day', w.held_on,
                  'value', jsonb_build_object('cycle', w.cycle_num, 'week', w.week, 'sessions', w.nsess, 'plan', cardinality(w.plan))));
      if w.by_book then         -- every session that week fully logged and checked in first
        v_want := v_want || jsonb_build_array(jsonb_build_object('kind', 'week_by_the_book', 'ref', v_ref, 'day', w.held_on,
                    'value', jsonb_build_object('cycle', w.cycle_num, 'week', w.week)));
      end if;
      v_run := 0; v_prev_broken := false; v_prev_to := w.wto;
    elsif v_closed then
      if v_paused is not null and w.wto >= v_paused then
        continue;            -- a week Amir paused the athlete for (or one after they left) is neither broken nor away (P2)
      end if;
      v_want := v_want || jsonb_build_array(jsonb_build_object('kind', 'week_broken', 'ref', v_ref, 'day', w.wto,
                  'value', jsonb_build_object('cycle', w.cycle_num, 'week', w.week, 'sessions', w.nsess, 'plan', cardinality(w.plan))));
      if w.nsess = 0 then
        v_run := v_run + 1;
        if v_run >= v_away then v_armed := true; end if;
      else
        v_run := 0;
      end if;
      v_prev_broken := true; v_prev_to := w.wto;
    end if;
    -- a week still running and not yet held: nothing yet
  end loop;

  -- ── cycles that have ended: finished, the roadmap, the effort wins ──
  for c in
    select distinct on (cw.cycle_index) cw.cycle_index, cw.cycle_num, cw.weeks, cw.cstart, cw.cend, cw.plan, cw.is_last
      from public.career_weeks(p_athlete) cw
     order by cw.cycle_index
  loop
    if current_date <= c.cend + v_close then continue; end if;
    select count(*) into v_done from public.session_history s
     where s.athlete_id = p_athlete and s.hidden_at is null and s.completed_on between c.cstart and c.cend and s.day::text = any (c.plan);
    v_planned := cardinality(c.plan) * c.weeks;
    if v_planned > 0 and v_done::numeric / v_planned >= v_share then
      v_want := v_want || jsonb_build_array(jsonb_build_object('kind', 'cycle_finished', 'ref', 'c' || c.cycle_num, 'day', c.cend + 1,
                  'value', jsonb_build_object('cycle', c.cycle_num, 'done', v_done, 'planned', v_planned)));
      if c.is_last then
        v_want := v_want || jsonb_build_array(jsonb_build_object('kind', 'roadmap_finished', 'ref', 'roadmap', 'day', c.cend + 1,
                    'value', jsonb_build_object('cycle', c.cycle_num)));
      end if;
    end if;
    for x in select * from public.career_cycle_wins(p_athlete, c.cstart, c.cend, c.plan, v_rules) loop
      v_want := v_want || jsonb_build_array(jsonb_build_object('kind', 'effort_win', 'ref', 'c' || c.cycle_num || '|' || x.lift,
                  'day', c.cend + 1, 'value', jsonb_build_object('cycle', c.cycle_num, 'lift', x.name, 'gain', round(x.gain, 4))));
    end loop;
  end loop;

  -- ── every whole month since the first session (month_with_amir); none while a former athlete ──
  if v_first is not null then
    for x in
      select g as n, (v_first + make_interval(months => g))::date as on_day
        from generate_series(1, 1200) g
       where (v_first + make_interval(months => g))::date <= case when v_status = 'former' then least(current_date, v_paused) else current_date end
    loop
      v_want := v_want || jsonb_build_array(jsonb_build_object('kind', 'month_with_amir', 'ref', x.n::text, 'day', x.on_day,
                  'value', jsonb_build_object('month', x.n)));
    end loop;
  end if;

  -- ── each lift's best gain over its first session (lift_gain) ──
  for x in select * from public.career_lift_gains(p_athlete) loop
    v_want := v_want || jsonb_build_array(jsonb_build_object('kind', 'lift_gain', 'ref', x.lift, 'day', x.d,
                'value', jsonb_build_object('lift', x.name, 'pct', x.pct)));
  end loop;

  -- ── the Personal Records: a new best (personal_best), a retest (retest_done, retest_beaten) ──
  select a.data -> (p_athlete || '_1rm') into v_recs from public.athlete_progress a where a.athlete_id = p_athlete;
  if jsonb_typeof(v_recs) = 'string' then
    v_raw := v_recs #>> '{}';
    begin
      v_recs := v_raw::jsonb;
    exception when others then
      v_recs := '[]'::jsonb;
    end;
  end if;
  if jsonb_typeof(v_recs) is distinct from 'array' then v_recs := '[]'::jsonb; end if;

  with rec as (
    select r0.e ->> 'lift' as lift, public.career_day(r0.e ->> 'd') as d, r0.e, r0.ord, coalesce(public.career_js_num(r0.e -> 't'), 0) as t
      from jsonb_array_elements(v_recs) with ordinality r0(e, ord)
     where jsonb_typeof(r0.e) = 'object' and public.career_truthy(r0.e -> 'lift') and public.career_truthy(r0.e -> 'd')
  ),
  eff as (     -- one entry speaks for each day of a lift: the newest write (ceilingLifts(), fillRecords())
    select distinct on (rec.lift, rec.d) rec.* from rec where rec.d is not null order by rec.lift, rec.d, rec.t desc, rec.ord
  ),
  kept as (select eff.* from eff where not public.career_truthy(eff.e -> 'del') and coalesce(public.career_num(eff.e -> 'kg'), 0) > 0)
  select v_want || coalesce(jsonb_agg(jsonb_build_object('kind', 'personal_best', 'ref', k.lift || '|' || k.d::text, 'day', k.d,
                                                         'value', jsonb_build_object('lift', k.lift, 'kg', public.career_num(k.e -> 'kg')))), '[]'::jsonb)
    into v_want
    from kept k
   where public.career_truthy(k.e -> 'auto')
     and exists (select 1 from kept k2 where k2.lift = k.lift and k2.d < k.d);   -- a lift's first number is not a best: nothing to beat

  -- retests: a test-flagged lift (exTestSpec(): true, or "<n>RM" up to 10) logged in its cycle's test week, the last [fact.retest_done]
  -- window_days of the cycle (inRetestWindow()) and after its end while it is still the current cycle, judged on its best estimate that
  -- week; beaten when that tops the lift's previous test, or its best earlier record when there was none.
  for x in
    with cyc as (select distinct on (cw.cycle_index) cw.* from public.career_weeks(p_athlete) cw order by cw.cycle_index),
    src as (
      select cyc.cycle_index, cyc.cycle_num, cyc.cend, cyc.is_current, cyc.plan,
             case when cyc.is_current then (select pr.data from public.programs pr where pr.athlete_id = p_athlete)
                  else (select v.data from public.program_versions v
                         where v.athlete_id = p_athlete and jsonb_typeof(v.data -> 'currentCycleIndex') = 'number'
                           and public.career_num(v.data -> 'currentCycleIndex') = cyc.cycle_index
                         order by v.saved_at desc limit 1) end as data
        from cyc
    ),
    flagged as (
      select distinct src.cycle_index, src.cycle_num, src.cend, src.is_current, ex.v ->> 'name' as name,
             public.career_norm(ex.v ->> 'name') as lift
        from src,
             jsonb_array_elements(case when jsonb_typeof(src.data -> 'workouts' -> 'days') = 'array'
                                       then src.data -> 'workouts' -> 'days' else '[]'::jsonb end) as dd(v),
             jsonb_array_elements(case when jsonb_typeof(dd.v -> 'blocks') = 'array' then dd.v -> 'blocks' else '[]'::jsonb end) as bb(v),
             jsonb_array_elements(case when jsonb_typeof(bb.v -> 'exercises') = 'array' then bb.v -> 'exercises' else '[]'::jsonb end) as ex(v)
       where ex.v ->> 'type' = 'standard' and public.career_truthy(ex.v -> 'name')
         and (ex.v -> 'test' = 'true'::jsonb
              or ((ex.v ->> 'test') ~* '^\d+\s*rm$' and (substring(ex.v ->> 'test' from '^(\d+)'))::int between 1 and 10))
    ),
    evidence as (
      select f.cycle_index, f.cycle_num, f.name, f.lift, es.d, es.best_est as est
        from flagged f
        join lateral public.career_entry_sets(p_athlete, f.cend - v_window, case when f.is_current then current_date else f.cend end, null) es
          on es.lift = f.lift
      union all
      select f.cycle_index, f.cycle_num, f.name, f.lift, public.career_day(r.e ->> 'd'), public.career_num(r.e -> 'kg')
        from flagged f, jsonb_array_elements(v_recs) r(e)
       where jsonb_typeof(r.e) = 'object' and public.career_truthy(r.e -> 'test') and not public.career_truthy(r.e -> 'del')
         and public.career_norm(r.e ->> 'lift') = f.lift
         and public.career_day(r.e ->> 'd') between f.cend - v_window and case when f.is_current then current_date else f.cend end
    )
    select distinct on (ev.lift, ev.cycle_index) ev.*
      from evidence ev
     order by ev.lift, ev.cycle_index, ev.est desc nulls last, ev.d
  loop
    v_want := v_want || jsonb_build_array(jsonb_build_object('kind', 'retest_done', 'ref', x.lift || '|c' || x.cycle_num, 'day', x.d,
                'value', jsonb_strip_nulls(jsonb_build_object('lift', x.name, 'cycle', x.cycle_num, 'est', x.est))));
  end loop;
  -- beaten: against this lift's previous retest, else its best record before the retest day
  with t as (
    select (e.v ->> 'ref') as ref, (e.v ->> 'day')::date as d, e.v -> 'value' as v, public.career_norm(e.v #>> '{value,lift}') as lift,
           (e.v #>> '{value,cycle}')::int as cyc, public.career_num(e.v #> '{value,est}') as est
      from jsonb_array_elements(v_want) as e(v) where e.v ->> 'kind' = 'retest_done'
  ),
  recs as (
    select public.career_norm(r1.e ->> 'lift') as lift, public.career_day(r1.e ->> 'd') as d, public.career_num(r1.e -> 'kg') as kg
      from jsonb_array_elements(v_recs) r1(e)
     where jsonb_typeof(r1.e) = 'object' and not public.career_truthy(r1.e -> 'del') and coalesce(public.career_num(r1.e -> 'kg'), 0) > 0
  ),
  judged as (
    select t.*,
           (select t2.est from t t2 where t2.lift = t.lift and t2.cyc < t.cyc and t2.est is not null order by t2.cyc desc limit 1) as prev_test,
           (select max(r.kg) from recs r where r.lift = t.lift and r.d < t.d) as prev_best
      from t
  )
  select v_want || coalesce(jsonb_agg(jsonb_build_object('kind', 'retest_beaten', 'ref', j.ref, 'day', j.d,
                                                         'value', j.v || jsonb_build_object('beat', coalesce(j.prev_test, j.prev_best)))), '[]'::jsonb)
    into v_want
    from judged j
   where j.est is not null and coalesce(j.prev_test, j.prev_best) is not null and j.est > coalesce(j.prev_test, j.prev_best);

  perform public.career_sync(p_athlete, array['week_held', 'week_broken', 'bounce_back', 'training_return', 'week_by_the_book',
                                              'cycle_finished', 'roadmap_finished', 'effort_win', 'month_with_amir', 'lift_gain',
                                              'personal_best', 'retest_beaten'], v_want, 'server');
  perform public.career_sync(p_athlete, array['retest_done'], v_want, 'training');
end $function$;

-- ── 8. P3 and P4, the score ──────────────────────────────────────────────────────────────────────────────────────────────

-- The athlete's Proof log, rebuilt from the facts: { "YYYY-MM-DD": { habit: value } } for hab_xp() and hab_bonus_xp().
create or replace function public.career_log(p_athlete text) returns jsonb
language sql stable set search_path to 'public' as $function$
  select coalesce(jsonb_object_agg(x.day::text, x.vals), '{}'::jsonb)
    from (select d.day,
                 coalesce((select jsonb_object_agg(substr(f.ref, 12), f.value -> 'v') from public.career_facts f
                            where f.athlete_id = p_athlete and f.kind = 'habit_done' and f.void_at is null and f.day = d.day),
                          '{}'::jsonb) as vals
            from (select distinct f.day from public.career_facts f
                   where f.athlete_id = p_athlete and f.kind in ('habit_day', 'habit_done') and f.void_at is null) d) x
$function$;

-- The athlete's Proof config as hab_bonus_xp() reads it, rebuilt from the facts: a roster entry on each day whose list differs from the
-- day before (rosterOn() reads the newest entry from that day or earlier, so every day still gets its own list) and their own habits (the
-- list on their latest day). One entry for every day gave the same numbers but made hab_bonus_xp() about eight times slower: 7.3 s
-- against 0.95 s for the longest log on the live project, 2026-10-17.
create or replace function public.career_cfg(p_athlete text) returns jsonb
language sql stable set search_path to 'public' as $function$
  with d as (
    select f.day, f.value -> 'live' as ids, lag(f.value -> 'live') over (order by f.day) as prev
      from public.career_facts f
     where f.athlete_id = p_athlete and f.kind = 'habit_day' and f.void_at is null
  )
  select jsonb_build_object(
    'roster', coalesce((select jsonb_agg(jsonb_build_object('from', d.day::text, 'ids', d.ids) order by d.day)
                          from d where d.prev is distinct from d.ids), '[]'::jsonb),
    'custom', coalesce((select jsonb_agg(jsonb_build_object('id', c.value))
                          from (select f.value -> 'custom' as cl from public.career_facts f
                                 where f.athlete_id = p_athlete and f.kind = 'habit_day' and f.void_at is null
                                 order by f.day desc limit 1) z,
                               jsonb_array_elements_text(coalesce(z.cl, '[]'::jsonb)) c), '[]'::jsonb))
$function$;

-- Every fact that is not the habit half, priced from the rulebook ([fact.<kind>] xp) within its caps ([fact.<kind>] limit and
-- limit_per: one session per plan day per training week, finished or early, the better one paying; two Library sessions a week; three
-- effort wins a cycle), dated inside the window. The habit half (habit_done, the day facts, comebacks) is paid by hab_xp() and
-- hab_bonus_xp() in career_score(), so it is left out here.
create or replace function public.career_facts_xp(p_athlete text, p_from date, p_to date)
returns table (kind text, n bigint, xp numeric)
language sql stable set search_path to 'public' as $function$
  with r as (select public.career_rules_now() as j),
  f as (
    select f.kind, f.ref, f.day, f.value from public.career_facts f
     where f.athlete_id = p_athlete and f.void_at is null
       and f.kind not in ('habit_done', 'habit_day', 'day_on_target', 'perfect_day', 'workout_tick', 'comeback')
  ),
  priced as (
    select f.*, coalesce(public.career_num(r.j -> 'fact' -> f.kind -> 'xp'), 0) as xp,
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
  select ranked.kind, count(*), sum(ranked.xp)
    from ranked
   where (ranked.grp is null or ranked.rn <= ranked.lim)
     and ranked.day between coalesce(p_from, '-infinity'::date) and coalesce(p_to, 'infinity'::date)
   group by ranked.kind
$function$;

-- The level from career XP on the rulebook's curve (the cost of level n to n+1 is base × n^growth, rounded to 10, never under 10;
-- Proof's curve), the rank and its sub-level, a star for every prestige_after levels; no ceiling and no reset (decision 1).
create or replace function public.career_level(p_xp bigint, p_rules jsonb) returns jsonb
language plpgsql immutable set search_path to 'public' as $function$
declare
  v_base numeric := coalesce(public.career_num(p_rules #> '{level,base}'), 300);
  v_growth numeric := coalesce(public.career_num(p_rules #> '{level,growth}'), 0.55);
  v_per integer := greatest(1, coalesce(public.career_num(p_rules #> '{level,levels_per_rank}')::int, 5));
  v_prestige integer := greatest(1, coalesce(public.career_num(p_rules #> '{level,prestige_after}')::int, 50));
  v_ranks jsonb := coalesce(p_rules #> '{level,ranks}', '[]'::jsonb);
  v_xp numeric := greatest(coalesce(p_xp, 0), 0);
  lv integer := 1; spent numeric := 0; cost numeric; i integer; star integer; within integer; nm text;
begin
  cost := greatest(10, round(v_base * power(1, v_growth) / 10) * 10);
  while lv < 100000 and v_xp - spent >= cost loop
    spent := spent + cost;
    lv := lv + 1;
    cost := greatest(10, round(v_base * power(lv, v_growth) / 10) * 10);
  end loop;
  i := lv - 1; star := i / v_prestige; within := i % v_prestige;
  nm := coalesce(v_ranks ->> least(within / v_per, greatest(jsonb_array_length(v_ranks) - 1, 0)), '');
  return jsonb_build_object('level', lv,
                            'rank', case when star > 0 then '★' || star || ' ' else '' end || nm || ' ' || (within % v_per + 1),
                            'xp_in_level', (v_xp - spent)::bigint, 'level_cost', cost::bigint, 'to_next', (cost - (v_xp - spent))::bigint);
end $function$;

-- The score of a window: the habit half by Proof's own functions (season start p_season, null for all of a career), the other facts
-- by career_facts_xp(), and the total. Nothing is stored (GAME-1): change the rulebook and every number follows.
create or replace function public.career_score(p_athlete text, p_season date, p_from date, p_to date) returns jsonb
language plpgsql stable set search_path to 'public' as $function$
declare v_rules jsonb := public.career_habit_rules(); v_log jsonb; v_cfg jsonb; v_daily bigint := 0; v_bonus bigint := 0;
        v_facts jsonb; v_rest numeric;
begin
  if v_rules is null then return null; end if;
  v_log := public.career_log(p_athlete);
  v_cfg := public.career_cfg(p_athlete);
  v_daily := public.hab_xp(v_log, p_from, p_to, v_rules);
  v_bonus := public.hab_bonus_xp(v_log, v_cfg, p_season, p_from, p_to, v_rules);
  select coalesce(jsonb_object_agg(x.kind, jsonb_build_object('n', x.n, 'xp', x.xp)), '{}'::jsonb), coalesce(sum(x.xp), 0)
    into v_facts, v_rest
    from public.career_facts_xp(p_athlete, p_from, p_to) x;
  return jsonb_build_object('habits', jsonb_build_object('daily', v_daily, 'bonus', v_bonus, 'xp', v_daily + v_bonus),
                            'facts', v_facts, 'facts_xp', round(v_rest)::bigint,
                            'xp', (v_daily + v_bonus + round(v_rest))::bigint);
end $function$;

-- ── 9. P10, the profile ──────────────────────────────────────────────────────────────────────────────────────────────────

-- The one read both apps will ask (phase 2): the signed-in athlete's own, or any athlete's for the coach (and for the SQL editor or the
-- service role, which carry no sign-in, for a report). Career XP, level, rank and
-- XP to the next level; this season's points; the four numbers (weeks held now and best, sessions with Amir, personal bests,
-- comebacks; a free athlete reads days on target and perfect days); the titles owned. Badges, achievements, missions and quests come
-- with their phases. Reading it first works out what time alone decides (a week that ended, a cycle's end), as P2 asks.
create or replace function public.get_profile(p_athlete_id text default null) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_me text := public.current_athlete_id();
  v_id text := coalesce(nullif(btrim(coalesce(p_athlete_id, '')), ''), v_me);
  v_rules jsonb; v_name text; v_start date; v_career jsonb; v_season jsonb; v_now integer := 0; v_best integer := 0; f record;
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
  select s.name, s.starts_on into v_name, v_start from public.current_season() s;
  v_career := public.career_score(v_id, null, null, current_date);
  v_season := public.career_score(v_id, coalesce(v_start, '1970-01-01'::date), coalesce(v_start, '1970-01-01'::date), current_date);
  -- weeks held in a row: only a broken week ends a run (a week between cycles, or one Amir paused, is no week at all)
  for f in select cf.kind from public.career_facts cf
            where cf.athlete_id = v_id and cf.void_at is null and cf.kind in ('week_held', 'week_broken')
            order by cf.day, cf.ref loop
    if f.kind = 'week_held' then v_now := v_now + 1; v_best := greatest(v_best, v_now); else v_now := 0; end if;
  end loop;
  return jsonb_build_object(
    'athlete_id', v_id,
    'ready', true,
    'shadow', coalesce((v_rules #>> '{shadow,on}')::boolean, true),
    'rules_version', (select max(r.version) from public.career_rules r),
    'career', v_career || public.career_level((v_career ->> 'xp')::bigint, v_rules),
    'season', jsonb_build_object('name', v_name, 'starts_on', v_start, 'points', (v_season ->> 'xp')::bigint, 'parts', v_season),
    'numbers', (select jsonb_build_object(
                  'weeks_held', jsonb_build_object('now', v_now, 'best', v_best),
                  'sessions_with_amir', count(*) filter (where cf.kind in ('session_finished', 'session_finished_early')),
                  'personal_bests', count(*) filter (where cf.kind = 'personal_best'),
                  'comebacks', count(*) filter (where cf.kind = 'comeback'),
                  'days_on_target', count(*) filter (where cf.kind = 'day_on_target'),
                  'perfect_days', count(*) filter (where cf.kind = 'perfect_day'))
                  from public.career_facts cf where cf.athlete_id = v_id and cf.void_at is null),
    'titles_owned', coalesce((select jsonb_agg(t.title order by t.earned_on, t.title) from public.hab_titles t where t.athlete_id = v_id), '[]'::jsonb),
    'badges', '[]'::jsonb, 'achievements', '[]'::jsonb, 'missions', '[]'::jsonb, 'quest', null, 'moments', '[]'::jsonb
  );
end $function$;

-- ── 10. the triggers: observe() on every save ───────────────────────────────────────────────────────────────────────────

-- AA Proof's log and config, and the training app's Personal Records, all live in athlete_progress. Only a change to one of those three
-- keys does anything; every other progress save returns at once.
create or replace function public.career_on_progress() returns trigger
language plpgsql security definer set search_path to 'public' as $function$
declare v_id text := coalesce(new.athlete_id, old.athlete_id); v_habits boolean := true; v_records boolean := true;
begin
  if tg_op = 'UPDATE' and new.athlete_id = old.athlete_id then
    v_habits := (new.data -> (v_id || '_hab_log')) is distinct from (old.data -> (v_id || '_hab_log'))
             or (new.data -> (v_id || '_hab_cfg')) is distinct from (old.data -> (v_id || '_hab_cfg'));
    v_records := (new.data -> (v_id || '_1rm')) is distinct from (old.data -> (v_id || '_1rm'));
    if not v_habits and not v_records then return null; end if;
  end if;
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
  return null;
end $function$;

create or replace function public.career_on_session() returns trigger
language plpgsql security definer set search_path to 'public' as $function$
begin
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
  return null;
end $function$;

create or replace function public.career_on_library() returns trigger
language plpgsql security definer set search_path to 'public' as $function$
begin
  begin
    if tg_op in ('UPDATE', 'DELETE') then
      perform public.career_observe_library(old.athlete_id, old.slug, old.completed_on);
    end if;
    if tg_op in ('INSERT', 'UPDATE') then
      perform public.career_observe_library(new.athlete_id, new.slug, new.completed_on);
    end if;
  exception when others then
    raise warning 'Career Mode (shadow) could not read a Library session of %: % (%). The save itself went through.',
                  coalesce(new.athlete_id, old.athlete_id), sqlerrm, sqlstate;
  end;
  return null;
end $function$;

-- A programme published or edited: its cycles and days decide the training weeks, so the derived training facts follow it.
create or replace function public.career_on_programme() returns trigger
language plpgsql security definer set search_path to 'public' as $function$
begin
  begin
    perform public.career_derive(new.athlete_id);
  exception when others then
    raise warning 'Career Mode (shadow) could not read the programme of %: % (%). The save itself went through.',
                  new.athlete_id, sqlerrm, sqlstate;
  end;
  return null;
end $function$;

drop trigger if exists career_progress_trg on public.athlete_progress;
create trigger career_progress_trg after insert or update or delete on public.athlete_progress
  for each row execute function public.career_on_progress();
drop trigger if exists career_session_trg on public.session_history;
create trigger career_session_trg after insert or update or delete on public.session_history
  for each row execute function public.career_on_session();
drop trigger if exists career_library_trg on public.library_sessions;
create trigger career_library_trg after insert or update or delete on public.library_sessions
  for each row execute function public.career_on_library();
drop trigger if exists career_programme_trg on public.programs;
create trigger career_programme_trg after insert or update of data on public.programs
  for each row execute function public.career_on_programme();

-- ── 11. seeding, backfill, the shadow check ─────────────────────────────────────────────────────────────────────────────

-- Every athlete's facts worked out again from what the apps saved (P14 step 2, and after a rule changes, P16). One athlete, or all.
create or replace function public.career_backfill(p_athlete text default null) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare v_id text; v_n integer := 0;
begin
  if public.career_rules_now() is null then
    raise exception 'Career Mode has no rulebook yet: run the seed first (python scripts/career_seed.py)';
  end if;
  for v_id in
    select distinct z.id from (
      select a.athlete_id as id from public.athlete_progress a
      union select s.athlete_id from public.session_history s
      union select l.athlete_id from public.library_sessions l
      union select p.athlete_id from public.programs p
      union select f.athlete_id from public.career_facts f) z
     where p_athlete is null or z.id = p_athlete
     order by 1
  loop
    perform public.career_observe_proof(v_id);
    perform public.career_observe_session(v_id);
    perform public.career_observe_library(v_id);
    perform public.career_derive(v_id);
    v_n := v_n + 1;
  end loop;
  return jsonb_build_object('athletes', v_n,
           'facts', coalesce((select jsonb_object_agg(x.kind, x.n) from (
                               select f.kind, count(*) as n from public.career_facts f
                                where f.void_at is null and (p_athlete is null or f.athlete_id = p_athlete)
                                group by f.kind order by f.kind) x), '{}'::jsonb),
           'void', (select count(*) from public.career_facts f where f.void_at is not null and (p_athlete is null or f.athlete_id = p_athlete)));
end $function$;

-- The rulebook (one version) and the whole catalogue, from scripts/career_seed.py, then every athlete's facts worked out again with
-- the new numbers (P16). A version older than the newest loaded is refused: bump `version` in rulebook.toml to move forward.
create or replace function public.career_seed(p_version integer, p_rules jsonb, p_catalogue jsonb, p_source text) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare v_newest integer; v_n integer;
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
  insert into public.career_rules (version, rules, source, loaded_at) values (p_version, p_rules, p_source, now())
  on conflict (version) do update set rules = excluded.rules, source = excluded.source, loaded_at = now();
  delete from public.career_catalogue;
  insert into public.career_catalogue (kind, id, body, version, loaded_at)
  select x.kind, x.id, x.body, p_version, now()
    from jsonb_to_recordset(p_catalogue) as x(kind text, id text, body jsonb);
  get diagnostics v_n = row_count;
  return jsonb_build_object('version', p_version, 'catalogue', v_n, 'backfill', public.career_backfill(null));
end $function$;

-- Three counts through Proof's own CTEs (hab_bonus_xp() with every other payout set to nothing): the perfect days, the days on target
-- and the comebacks of a window, measured from the season's first day as Proof measures them.
create or replace function public.career_probe(p_log jsonb, p_cfg jsonb, p_season date, p_to date, p_rules jsonb) returns jsonb
language plpgsql stable set search_path to 'public' as $function$
declare v_base jsonb; v_days integer := greatest(p_to - p_season + 1, 0); v_perfect bigint; v_on bigint; v_back bigint;
begin
  v_base := p_rules || jsonb_build_object('tiers', '[]'::jsonb, 'milestones', '[]'::jsonb, 'quests', '[]'::jsonb,
                                          'questRuns', '[]'::jsonb, 'comebackXp', 0);
  v_perfect := public.hab_bonus_xp(p_log, p_cfg, p_season, p_season, p_to,
                 v_base || jsonb_build_object('milestones', (select coalesce(jsonb_agg(jsonb_build_object('code', 'zzp' || g, 'need', g,
                                                             'xp', 1, 'measure', 'perfectDays')), '[]'::jsonb)
                                                               from generate_series(1, v_days) g)));
  v_on := public.hab_bonus_xp(p_log, p_cfg, p_season, p_season, p_to,
            v_base || jsonb_build_object(
              'quests', (select jsonb_agg(jsonb_build_object('id', 'zzq' || g, 'kind', 'qualify', 'need', g, 'xp', 1)) from generate_series(1, 7) g),
              'questRuns', (select coalesce(jsonb_agg(jsonb_build_object('start', (p_season + 7 * k)::text,
                                                                         'ids', (select jsonb_agg('zzq' || g) from generate_series(1, 7) g))), '[]'::jsonb)
                              from generate_series(0, v_days / 7) k)));
  v_back := public.hab_bonus_xp(p_log, p_cfg, p_season, p_season, p_to, v_base || jsonb_build_object('comebackXp', 1));
  return jsonb_build_object('perfect', v_perfect, 'on_target', v_on, 'comebacks', v_back);
end $function$;

-- The shadow check (P14 step 3): for every athlete with a Proof log, Career Mode's habit XP against Proof's own, hab_xp() +
-- hab_bonus_xp() with the xp_rules row, this season, the rolling week and all time. They must be equal. Also the rules key by key, and
-- the three probes against the day facts. `ok` is true only when every athlete matches on every window, the rules are Proof's and
-- every probe agrees.
create or replace function public.career_compare(p_season date default null) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_x jsonb; v_r jsonb; v_s date; v_t date := current_date; v_wk date; a record;
  v_log jsonb; v_cfg jsonb; v_cl jsonb; v_cc jsonb; v_rows jsonb := '[]'::jsonb; v_bad integer := 0; v_n integer := 0;
  p_season_xp bigint; c_season_xp bigint; p_week bigint; c_week bigint; p_all bigint; c_all bigint;
  v_probe jsonb; v_facts jsonb; v_row_ok boolean; v_diff jsonb;
begin
  select x.rules into v_x from public.xp_rules x where x.id = 1;
  v_r := public.career_habit_rules();
  if v_x is null or v_r is null then
    raise exception 'nothing to compare: xp_rules or the Career Mode rulebook is missing';
  end if;
  v_s := coalesce(p_season, (select s.starts_on from public.current_season() s), '1970-01-01'::date);
  v_wk := greatest(v_t - 6, v_s);
  select coalesce(jsonb_agg(k.key order by k.key), '[]'::jsonb) into v_diff
    from jsonb_object_keys(v_r) as k(key)
   where k.key <> 'questRuns'
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
    p_season_xp := public.hab_xp(v_log, v_s, v_t, v_x) + public.hab_bonus_xp(v_log, v_cfg, v_s, v_s, v_t, v_x);
    c_season_xp := public.hab_xp(v_cl, v_s, v_t, v_r) + public.hab_bonus_xp(v_cl, v_cc, v_s, v_s, v_t, v_r);
    p_week := public.hab_xp(v_log, v_wk, v_t, v_x) + public.hab_bonus_xp(v_log, v_cfg, v_s, v_wk, v_t, v_x);
    c_week := public.hab_xp(v_cl, v_wk, v_t, v_r) + public.hab_bonus_xp(v_cl, v_cc, v_s, v_wk, v_t, v_r);
    p_all := public.hab_xp(v_log, '1970-01-01', v_t, v_x) + public.hab_bonus_xp(v_log, v_cfg, '1970-01-01', '1970-01-01', v_t, v_x);
    c_all := public.hab_xp(v_cl, '1970-01-01', v_t, v_r) + public.hab_bonus_xp(v_cl, v_cc, '1970-01-01', '1970-01-01', v_t, v_r);
    v_probe := public.career_probe(v_log, v_cfg, v_s, v_t, v_x);
    select jsonb_build_object(
             'perfect', count(*) filter (where f.kind = 'perfect_day' and f.day between v_s and v_t),
             'on_target', count(*) filter (where f.kind = 'day_on_target' and f.day between v_s and v_t),
             'comebacks', count(*) filter (where f.kind = 'comeback' and f.day between v_s and v_t
                                             and public.career_day(f.value ->> 'prev') >= v_s))
      into v_facts
      from public.career_facts f where f.athlete_id = a.athlete_id and f.void_at is null;
    v_row_ok := p_season_xp = c_season_xp and p_week = c_week and p_all = c_all and v_probe = v_facts;
    if not v_row_ok then v_bad := v_bad + 1; end if;
    v_rows := v_rows || jsonb_build_array(jsonb_build_object(
      'athlete_id', a.athlete_id, 'ok', v_row_ok,
      'season', jsonb_build_object('proof', p_season_xp, 'career', c_season_xp),
      'week', jsonb_build_object('proof', p_week, 'career', c_week),
      'all', jsonb_build_object('proof', p_all, 'career', c_all),
      'probe', jsonb_build_object('proof', v_probe, 'facts', v_facts)));
  end loop;
  return jsonb_build_object('ok', v_bad = 0 and jsonb_array_length(v_diff) = 0, 'season_start', v_s, 'today', v_t,
                            'athletes', v_n, 'matched', v_n - v_bad, 'rules_equal', jsonb_array_length(v_diff) = 0,
                            'rules_differ_on', v_diff, 'rows', v_rows);
end $function$;

-- ── 12. who may run what ─────────────────────────────────────────────────────────────────────────────────────────────────

-- Only get_profile() is open, to a signed-in athlete (their own) and the coach (anyone's). Everything else runs inside the server (the
-- triggers, get_profile()) or from the service role (the seed, the backfill, the shadow check, through the Supabase tool).
do $stage66_grants$
declare f text;
begin
  for f in
    select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname like 'career\_%' escape '\'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $stage66_grants$;
revoke all on function public.get_profile(text) from public, anon, authenticated;
grant execute on function public.get_profile(text) to authenticated, service_role;

-- ── 13. coach_erase_person() learns career_facts ────────────────────────────────────────────────────────────────────────
-- Patched from its live definition: the table list must be found exactly once, or nothing is changed. career_facts goes LAST, so the
-- facts the earlier deletes void (sessions, the Proof log, the records) are erased with the rest, and the check that every table with
-- an athlete_id column is empty still passes. The rules and the catalogue hold nobody's data.
do $stage66_patch$
declare
  d text := pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure);
  s_old constant text := '''athlete_identities'', ''athlete_status'']';
  s_new constant text := '''athlete_identities'', ''athlete_status'', ''career_facts'']';
  n int;
begin
  if position(s_new in d) > 0 then
    return;      -- already patched: safe to run again
  end if;
  n := (length(d) - length(replace(d, s_old, ''))) / length(s_old);
  if n <> 1 then
    raise exception 'stage66: coach_erase_person() is not what this patch expects (the table list was found % times, not once). Nothing was changed.', n;
  end if;
  execute replace(d, s_old, s_new);
end $stage66_patch$;
