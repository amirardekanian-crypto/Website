-- ============================================================================
--  STAGE 9 — Proof leaderboard (opt-in, server-scored)
--  Project: bvipfipbdcyqnbczjmaq (eu-west-2). Run AFTER stage1–stage4.
--  Safe to re-run: every statement is guarded.
--
--  Design decisions baked in here:
--
--  1. OPT-IN ONLY. An athlete appears on the board only after they join and
--     choose a display name. No row in leaderboard_optin = invisible.
--
--  2. SERVER-SCORED. XP is recomputed here from the habit log already stored
--     in athlete_progress — the app never submits a score, so editing
--     localStorage cannot buy a place on the board. The cost is that the XP
--     formula now lives in TWO places: XP_RULES in habits.html and the
--     xp_rules row below. See XP_SYSTEM.md — changing one means changing both.
--
--  3. NO ATHLETE IDs ARE EVER RETURNED. An athlete_id is enough to fetch
--     /data/<id>.json, which is that athlete's whole programme. The board
--     returns display names only, plus an is_me flag so the caller can find
--     themselves. Leaking the id here would leak everyone's programme.
--
--  4. READING THE BOARD IS KEY-CHECKED. Only a real athlete holding a valid
--     key can read it, so client names are not exposed to the open internet.
-- ============================================================================

-- ── Canonical scoring config — mirrors XP_RULES in habits.html ─────────────
create table if not exists public.xp_rules (
  id         int primary key default 1,
  rules      jsonb not null,
  updated_at timestamptz not null default now(),
  constraint xp_rules_single_row check (id = 1)
);
alter table public.xp_rules enable row level security;

drop policy if exists "coach manage xp rules" on public.xp_rules;
create policy "coach manage xp rules" on public.xp_rules
  for all to authenticated
  using      ( (auth.jwt() ->> 'email') = 'amirardekanian@gmail.com' )
  with check ( (auth.jwt() ->> 'email') = 'amirardekanian@gmail.com' );

-- Seeded to match habits.html at the time of writing. `targets` is needed so
-- the server can score partial progress on counter habits exactly as the app does.
insert into public.xp_rules (id, rules) values (1, $rules${
  "base": 300,
  "growth": 0.55,
  "completionBonus": 1.2,
  "customXp": 25,
  "weights": { "strength": 100, "steps": 60, "sleep": 50, "fuel": 40,
               "water": 30, "mobility": 30, "breathe": 20, "supps": 20 },
  "targets": { "strength": 1, "steps": 10000, "sleep": 7.5, "fuel": 3,
               "water": 8, "mobility": 1, "breathe": 1, "supps": 1 }
}$rules$::jsonb)
on conflict (id) do nothing;

-- ── Who is on the board ───────────────────────────────────────────────────
create table if not exists public.leaderboard_optin (
  athlete_id   text primary key,
  display_name text not null,
  joined_at    timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.leaderboard_optin enable row level security;

-- Coach can see and moderate the list (e.g. remove an unsuitable handle).
drop policy if exists "coach manage leaderboard" on public.leaderboard_optin;
create policy "coach manage leaderboard" on public.leaderboard_optin
  for all to authenticated
  using      ( (auth.jwt() ->> 'email') = 'amirardekanian@gmail.com' )
  with check ( (auth.jwt() ->> 'email') = 'amirardekanian@gmail.com' );
-- Athletes (anon) get NO direct access; they go through the functions below.

-- ── Helpers ───────────────────────────────────────────────────────────────
-- The habit log is stored as a JSON *string* inside the progress snapshot
-- (the app mirrors raw localStorage values). Tolerate both a string and a
-- real object, and never let one malformed row break the whole board.
create or replace function public.hab_log_of(p_data jsonb, p_athlete_id text)
returns jsonb language plpgsql immutable as $fn$
declare t text;
begin
  if p_data is null then return null; end if;
  t := p_data ->> (p_athlete_id || '_hab_log');
  if t is null or btrim(t) = '' then return null; end if;
  begin
    return t::jsonb;
  exception when others then
    return null;
  end;
end; $fn$;

-- XP over an optional date window. Mirrors xpFor() in habits.html: pro-rata
-- while part way, completionBonus once the target is met.
create or replace function public.hab_xp(
  p_log jsonb, p_from date, p_to date, p_rules jsonb)
returns bigint language plpgsql immutable as $fn$
declare
  r record; r2 record;
  d date; v numeric; tgt numeric; w numeric;
  bonus numeric := coalesce((p_rules ->> 'completionBonus')::numeric, 1.2);
  custom numeric := coalesce((p_rules ->> 'customXp')::numeric, 25);
  total numeric := 0;
begin
  if p_log is null or jsonb_typeof(p_log) <> 'object' then return 0; end if;
  for r in select key, value from jsonb_each(p_log) loop
    if jsonb_typeof(r.value) <> 'object' then continue; end if;
    begin
      d := r.key::date;
    exception when others then
      continue;                                  -- not a date key, ignore
    end;
    if p_from is not null and d < p_from then continue; end if;
    if p_to   is not null and d > p_to   then continue; end if;
    for r2 in select key, value from jsonb_each(r.value) loop
      if jsonb_typeof(r2.value) <> 'number' then continue; end if;
      v := (r2.value #>> '{}')::numeric;
      if v <= 0 then continue; end if;
      tgt := coalesce((p_rules -> 'targets' ->> r2.key)::numeric, 1);
      if tgt <= 0 then tgt := 1; end if;
      w := coalesce((p_rules -> 'weights' ->> r2.key)::numeric, custom);
      if v >= tgt then
        total := total + round(w * bonus);
      else
        total := total + round(w * (v / tgt));
      end if;
    end loop;
  end loop;
  return total::bigint;
end; $fn$;

-- Level from XP. Mirrors levelInfo() / levelCost() in habits.html:
-- cost(n) = round(base * n^growth / 10) * 10, minimum 10.
create or replace function public.hab_level(p_xp bigint, p_rules jsonb)
returns int language plpgsql immutable as $fn$
declare
  base numeric := coalesce((p_rules ->> 'base')::numeric, 300);
  growth numeric := coalesce((p_rules ->> 'growth')::numeric, 0.55);
  lv int := 1; spent numeric := 0; cost numeric;
begin
  cost := greatest(10, round(base * power(1, growth) / 10) * 10);
  while lv < 5000 and coalesce(p_xp, 0) - spent >= cost loop
    spent := spent + cost;
    lv := lv + 1;
    cost := greatest(10, round(base * power(lv, growth) / 10) * 10);
  end loop;
  return lv;
end; $fn$;

-- Rank label. Mirrors rankFor(): 10 names x 5 sub-levels, then prestige stars.
create or replace function public.hab_rank_label(p_level int)
returns text language plpgsql immutable as $fn$
declare
  names text[] := array['ROOKIE','CONTENDER','GRINDER','OPERATOR','ENFORCER',
                        'PREDATOR','MACHINE','RELENTLESS','UNTOUCHABLE','IMMORTAL'];
  subs int := 5;
  per_cycle int := 50;                            -- array_length(names,1) * subs
  i int := greatest(0, coalesce(p_level, 1) - 1);
  star int; within int; nm text; sub int;
begin
  star := i / per_cycle;
  within := i % per_cycle;
  nm := names[(within / subs) + 1];
  sub := (within % subs) + 1;
  return case when star > 0 then '★' || star || ' ' else '' end || nm || ' ' || sub;
end; $fn$;

-- ── Athlete joins / renames / leaves the board ────────────────────────────
create or replace function public.set_leaderboard_optin(
  p_athlete_id text, p_display_name text, p_opt_in boolean, p_key text default null)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_expected text; v_name text;
begin
  select secret_key into v_expected from public.athlete_keys where athlete_id = p_athlete_id;
  if v_expected is not null and (p_key is distinct from v_expected) then
    raise exception 'invalid athlete key';
  end if;

  if not p_opt_in then
    delete from public.leaderboard_optin where athlete_id = p_athlete_id;
    return;
  end if;

  -- Keep handles printable, short, and free of markup.
  v_name := btrim(regexp_replace(coalesce(p_display_name, ''), '[<>"''\\\\]', '', 'g'));
  v_name := left(v_name, 24);
  if v_name = '' then v_name := 'ATHLETE'; end if;

  insert into public.leaderboard_optin (athlete_id, display_name)
  values (p_athlete_id, v_name)
  on conflict (athlete_id) do update
    set display_name = excluded.display_name, updated_at = now();
end; $fn$;
revoke all on function public.set_leaderboard_optin(text, text, boolean, text) from public;
grant execute on function public.set_leaderboard_optin(text, text, boolean, text) to anon, authenticated;

-- ── Read the board ────────────────────────────────────────────────────────
-- Key-checked so only real athletes can see other clients' display names.
-- p_scope: 'week' (Monday to today) or 'all' (everything ever logged).
-- Returns the top N plus the caller's own row when they fall outside it.
-- NOTE: deliberately returns NO athlete_id — see header note 3.
create or replace function public.leaderboard_top(
  p_athlete_id text, p_key text default null,
  p_scope text default 'week', p_limit int default 10)
returns table (
  pos int, display_name text, xp bigint, level int, rank_label text,
  is_me boolean, joined boolean
) language plpgsql security definer set search_path = public as $fn$
declare
  v_expected text; v_rules jsonb; v_from date; v_to date;
  v_joined boolean;
begin
  select secret_key into v_expected from public.athlete_keys where athlete_id = p_athlete_id;
  if v_expected is not null and (p_key is distinct from v_expected) then
    raise exception 'invalid athlete key';
  end if;

  select rules into v_rules from public.xp_rules where id = 1;
  if v_rules is null then return; end if;

  if p_scope = 'week' then
    v_from := (date_trunc('week', current_date))::date;   -- ISO week, Monday
    v_to   := current_date;
  end if;

  select exists (select 1 from public.leaderboard_optin o where o.athlete_id = p_athlete_id)
    into v_joined;

  return query
  with scored as (
    select o.athlete_id as aid,
           o.display_name as dname,
           public.hab_xp(public.hab_log_of(ap.data, o.athlete_id), v_from, v_to, v_rules) as x
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
