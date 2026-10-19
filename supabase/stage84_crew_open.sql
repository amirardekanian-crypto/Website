-- stage84_crew_open.sql — the Monthly Open: one challenge Amir sets, results he confirms, one board on Crew
-- (Career Mode round 5, the last step of plan A; career/CAREER_MODE.md → Round 5, L9 and the "Crew and the Open" bullets)
--
-- Amir decided all of this on the Crew and Open page (https://claude.ai/artifact/7fCYGFL6mboE3igFLUkE5E) with "for crew and the open go with your
-- picks", and changed L9 himself the same day:
--   · The Open is **a card on Crew** (direction A), under the feed.
--   · **One challenge at a time, any kind he designs** — not only the six tennis tests or the 5K ("the open can be any kind of challenge that i
--     design"). He writes it himself in coach.html → Proof → The Monthly Open.
--   · **Open in every week, the back-off week included** ("the backoff week doesnt mean anything unless the person has a competition").
--   · **A result counts only when Amir confirms it.** The athlete sends the clip on WhatsApp and nothing is stored: there is NO athlete write in
--     this file at all. The board only ever holds what he typed in.
--   · **The board is ranked by the result**, higher or lower winning as the challenge says.
--
-- Two calls that were Claude's to make, both recorded in career/PROCEDURES.md → Stage 84:
--   1. **The Open pays no XP.** GAME-6 (kudos, lines and shares pay nothing) is the nearest rule, and under D20 paying XP would mean a new
--      rulebook version. The board and the Bell line are the reward. Nothing here touches the scorer: no fact, no award, no price.
--   2. **A result outlives the feed.** A post dies at 7 days; a result does not. The challenge and its results are their own two tables, they stay,
--      and they are IN `BACKUP_TABLES` (months of results, a few rows each, and the one thing here that could not be rebuilt from anything else).
--      Only the Bell LINE about a result fades with every other line at 7 days.
--
-- What it adds, and nothing else:
--   · `crew_open` (the challenge) and `crew_open_results` (what Amir confirmed), coach-readable so the backup is complete, nobody writing directly.
--   · `crew_open_now(viewer)`: the live challenge, the board (crew members who said yes), and the viewer's own result. get_bell() gains one key,
--     `open`, patched in place, so Crew still costs ONE call on a slow connection and `get_bell_if_new()`'s etag covers the Open too.
--   · Amir's five: `coach_open()` (his panel), `coach_open_set()`, `coach_open_close()`, `coach_open_result()`, `coach_open_remove()`.
--   · A confirmed result rings the Bell once for a crew member who said yes: a `crew_rings` row of kind `open`, its `value.text` the words the app
--     already draws (stage81 left that hook and the app already has the switch). Under 13 never rings (GAME-9), and neither does a result Amir
--     records for someone who is not in the crew.
--   · `coach_erase_person()` learns `crew_open_results` (the challenge itself names nobody).
-- Rehearsed in `scripts/career/rehearse_crew.mjs` section 16 (PGlite, beside the rest of Crew). The way back: `scripts/career/rollback_stage84.sql`.
-- Safe to re-run.
-- NOT YET APPLIED.

-- ── 0. The guard ────────────────────────────────────────────────────────────────────────────────────────────────────────
do $stage84_guard$
begin
  if to_regclass('public.crew_rings') is null or to_regprocedure('public.crew_members()') is null
     or to_regprocedure('public.get_bell(text)') is null then
    raise exception 'stage84: stage81 (Crew and the Bell) is not on this database. Nothing was changed.';
  end if;
end
$stage84_guard$;

-- ── 1. Tables ──────────────────────────────────────────────────────────────────────────────────────────────────────────
-- The challenge. One is live at a time: the newest row with no `closed_at`. `better` says which way wins. Nothing here names an athlete.
create table if not exists public.crew_open (
  id         uuid        primary key default gen_random_uuid(),
  title      text        not null check (char_length(btrim(title)) between 1 and 60),
  how        text        not null default '' check (char_length(how) <= 400),     -- how to do it and what counts, Amir's words
  unit       text        not null default '' check (char_length(unit) <= 16),     -- reps, seconds, metres, kg… shown after the number
  better     text        not null default 'high' check (better in ('high', 'low')),
  opened_on  date        not null default current_date,
  closed_at  timestamptz,                                                          -- null: still open (every week, L9)
  created_at timestamptz not null default now()
);
create index if not exists crew_open_live_idx on public.crew_open (created_at desc) where closed_at is null;

-- What Amir confirmed. One result per athlete per challenge: he types a better one over it if they beat it.
create table if not exists public.crew_open_results (
  open_id    uuid        not null references public.crew_open (id) on delete cascade,
  athlete_id text        not null,
  value      numeric     not null check (value > -1000000 and value < 1000000),
  day        date        not null default current_date,                            -- the day they did it, his to set
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (open_id, athlete_id)
);
create index if not exists crew_open_results_board_idx on public.crew_open_results (open_id, value);
create index if not exists crew_open_results_who_idx on public.crew_open_results (athlete_id);

-- ── 2. Policies and grants: the coach reads (so the backup is complete); nothing else reads or writes directly ──────────
do $stage84_policies$
declare t text;
begin
  foreach t in array array['crew_open', 'crew_open_results'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('drop policy if exists %I on public.%I', t || '_coach_read', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_coach())', t || '_coach_read', t);
  end loop;
end
$stage84_policies$;

-- ── 3. The athlete's read, inside get_bell() ───────────────────────────────────────────────────────────────────────────
-- The live challenge with its board, or null when there is none. The board is **crew members who said yes** (GAME-9: a result Amir recorded for
-- someone who never joined stays with him and is never shown to anyone else), ranked by the result, `better` deciding the direction; ties share a
-- place. `me` is the viewer's own result even when they are not on the board, so they always see their own number.
create or replace function public.crew_open_now(p_viewer text default null) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare o record; v_rows jsonb; v_me jsonb;
begin
  select * into o from public.crew_open where closed_at is null order by created_at desc limit 1;
  if not found then return null; end if;

  with mem as (select * from public.crew_members()),
  r as (
    select res.athlete_id, res.value, res.day, m.name
      from public.crew_open_results res join mem m on m.athlete_id = res.athlete_id
     where res.open_id = o.id),
  ranked as (
    select r.*, rank() over (order by case when o.better = 'low' then r.value else -r.value end) as place from r)
  select coalesce(jsonb_agg(jsonb_build_object('who', ranked.name, 'value', ranked.value, 'place', ranked.place,
                                               'me', ranked.athlete_id is not distinct from p_viewer)
                            order by ranked.place, ranked.name), '[]'::jsonb)
    into v_rows from ranked;

  select jsonb_build_object('value', res.value, 'day', res.day) into v_me
    from public.crew_open_results res where res.open_id = o.id and res.athlete_id is not distinct from p_viewer;

  return jsonb_build_object('id', o.id, 'title', o.title, 'how', o.how, 'unit', o.unit, 'better', o.better,
                            'opened_on', o.opened_on, 'board', v_rows, 'mine', v_me);
end $function$;

-- get_bell() gains the one key. Patched in place (stage76's idiom), so the rest of a 140-line read is never copied and cannot drift.
do $stage84_patch$
declare d text; n integer;
  -- the anchor is the last key alone, not the whole line: stage82 already added `emoji` between `days` and `at`, and a later stage may add another
  c_old constant text := ', ''at'', now());';
  c_new constant text := ', ''open'', public.crew_open_now(v_id), ''at'', now());';
begin
  d := pg_get_functiondef('public.get_bell(text)'::regprocedure);
  if position('crew_open_now' in d) > 0 then return; end if;                 -- patched already (a re-run)
  n := (length(d) - length(replace(d, c_old, ''))) / length(c_old);
  if n <> 1 then
    raise exception 'stage84: get_bell() is not what this patch expects (its last line was found % times, not once). Nothing was changed.', n;
  end if;
  execute replace(d, c_old, c_new);
end
$stage84_patch$;

-- ── 4. Amir's panel: coach.html → Proof → The Monthly Open ─────────────────────────────────────────────────────────────
-- The live challenge, every result he has confirmed (crew member or not, so he can see what he typed), the crew to pick from, and the last five
-- challenges he has closed.
create or replace function public.coach_open() returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
declare o record; v_rows jsonb; v_past jsonb; v_crew jsonb;
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  select * into o from public.crew_open where closed_at is null order by created_at desc limit 1;

  if found then
    with mem as (select * from public.crew_members())
    select coalesce(jsonb_agg(jsonb_build_object('athlete_id', res.athlete_id, 'who', coalesce(m.name, res.athlete_id),
                                                 'in_crew', m.athlete_id is not null, 'value', res.value, 'day', res.day)
                              order by case when o.better = 'low' then res.value else -res.value end, res.athlete_id), '[]'::jsonb)
      into v_rows
      from public.crew_open_results res left join mem m on m.athlete_id = res.athlete_id
     where res.open_id = o.id;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'title', p.title, 'unit', p.unit, 'opened_on', p.opened_on,
                                               'closed_at', p.closed_at, 'n', (select count(*) from public.crew_open_results x where x.open_id = p.id))
                            order by p.closed_at desc), '[]'::jsonb)
    into v_past
    from (select * from public.crew_open where closed_at is not null order by closed_at desc limit 5) p;

  select coalesce(jsonb_agg(jsonb_build_object('athlete_id', m.athlete_id, 'who', m.name) order by m.name), '[]'::jsonb)
    into v_crew from public.crew_members() m;

  return jsonb_build_object(
    'open', case when o.id is null then null else
      jsonb_build_object('id', o.id, 'title', o.title, 'how', o.how, 'unit', o.unit, 'better', o.better, 'opened_on', o.opened_on) end,
    'results', coalesce(v_rows, '[]'::jsonb), 'past', v_past, 'crew', v_crew, 'at', now());
end $function$;

-- Set the challenge. With no `p_id` it opens a new one (and closes whatever was open, so there is never more than one); with `p_id` it corrects the
-- words of that one, which never touches its results.
create or replace function public.coach_open_set(p_title text, p_how text default '', p_unit text default '',
                                                 p_better text default 'high', p_id uuid default null) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare v_id uuid; v_title text := btrim(coalesce(p_title, '')); v_better text := lower(btrim(coalesce(p_better, 'high')));
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  if char_length(v_title) < 1 or char_length(v_title) > 60 then raise exception 'the challenge needs a name, up to 60 characters'; end if;
  if v_better not in ('high', 'low') then raise exception 'better is high or low, not %', v_better; end if;

  if p_id is not null then
    -- only the live one: a panel left open in another tab must not quietly correct a challenge that has since been closed
    update public.crew_open set title = v_title, how = left(coalesce(p_how, ''), 400), unit = left(btrim(coalesce(p_unit, '')), 16), better = v_better
     where id = p_id and closed_at is null returning id into v_id;
    if v_id is null then raise exception 'no such challenge is open'; end if;
  else
    update public.crew_open set closed_at = now() where closed_at is null;
    insert into public.crew_open (title, how, unit, better)
         values (v_title, left(coalesce(p_how, ''), 400), left(btrim(coalesce(p_unit, '')), 16), v_better)
      returning id into v_id;
  end if;
  return public.coach_open();
end $function$;

-- Close the live challenge. Its results stay, and the board leaves Crew.
create or replace function public.coach_open_close() returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  update public.crew_open set closed_at = now() where closed_at is null;
  return public.coach_open();
end $function$;

-- Confirm one athlete's result (he has seen the clip on WhatsApp). Typing it again replaces it. It rings the Bell ONCE, and only for a crew member
-- who said yes and keeps the `open` kind on and is not marked under 13; a later, better result keeps the first line's day and updates its words.
create or replace function public.coach_open_result(p_athlete text, p_value numeric, p_day date default null) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare o record; v_text text; v_rings boolean;
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  if nullif(btrim(coalesce(p_athlete, '')), '') is null then raise exception 'which athlete?'; end if;
  if p_value is null then raise exception 'what result?'; end if;
  -- an athlete, not a typed id that belongs to nobody (coach_crew_under13() guards itself the same way)
  if not exists (select 1 from public.programs p where p.athlete_id = btrim(p_athlete)) then
    raise exception 'no athlete "%"', btrim(p_athlete);
  end if;
  select * into o from public.crew_open where closed_at is null order by created_at desc limit 1;
  if not found then raise exception 'no challenge is open'; end if;

  insert into public.crew_open_results (open_id, athlete_id, value, day)
       values (o.id, btrim(p_athlete), p_value, coalesce(p_day, current_date))
  on conflict (open_id, athlete_id) do update set value = excluded.value, day = excluded.day, updated_at = now();

  -- the Bell's words, the verb phrase the app draws after the name: "posted 95 seconds in Wall Sit"
  -- FM drops the trailing zeros of a decimal but leaves its point behind, so 95 would read "95." : take the point off too
  v_text := 'posted ' || rtrim(btrim(to_char(p_value, 'FM999999990.99')), '.')
            || case when o.unit <> '' then ' ' || o.unit else '' end || ' in ' || o.title;
  -- crew_members() is the one test of who is in the crew: it already leaves out a no, an under-13 tick, the demo, Amir's own posting id and a
  -- former athlete, so a stray "yes" row cannot leave a ring behind that get_bell() would never show
  select coalesce((m.kinds ->> 'open')::boolean, true)
    into v_rings from public.crew_members() m where m.athlete_id = btrim(p_athlete);
  if coalesce(v_rings, false) then
    -- One ROW per athlete per challenge, so a month of improving never fills the feed with rows. But a result he confirms again is news the crew
    -- should see, so the row moves to today: its line leaves the old day and joins today's (get_bell() shows the last 7 days and folds an athlete's
    -- day into one line). A correction downward moves it too, which is rare and no worse than leaving a wrong number up.
    insert into public.crew_rings (athlete_id, kind, ref, day, value)
         values (btrim(p_athlete), 'open', o.id::text, current_date, jsonb_build_object('text', v_text))
    on conflict (athlete_id, kind, ref) do update
      set value = excluded.value, day = excluded.day, created_at = now()
    where public.crew_rings.value is distinct from excluded.value;   -- the same number typed again changes nothing and rings nothing
  end if;
  return public.coach_open();
end $function$;

-- Take a result off (he typed the wrong person, or they asked). Its Bell line goes with it.
create or replace function public.coach_open_remove(p_athlete text) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare o record;
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  select * into o from public.crew_open where closed_at is null order by created_at desc limit 1;
  if not found then raise exception 'no challenge is open'; end if;
  delete from public.crew_open_results where open_id = o.id and athlete_id = btrim(coalesce(p_athlete, ''));
  delete from public.crew_rings where kind = 'open' and ref = o.id::text and athlete_id = btrim(coalesce(p_athlete, ''));
  return public.coach_open();
end $function$;

-- ── 5. Grants: the coach's five are signed-in (each asks is_coach() itself); the read inside get_bell() is nobody's to call ──────
revoke all on function public.crew_open_now(text) from public, anon, authenticated;
grant execute on function public.crew_open_now(text) to service_role;
revoke all on function public.coach_open() from public, anon, authenticated;
revoke all on function public.coach_open_set(text, text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.coach_open_close() from public, anon, authenticated;
revoke all on function public.coach_open_result(text, numeric, date) from public, anon, authenticated;
revoke all on function public.coach_open_remove(text) from public, anon, authenticated;
grant execute on function public.coach_open() to authenticated, service_role;
grant execute on function public.coach_open_set(text, text, text, text, uuid) to authenticated, service_role;
grant execute on function public.coach_open_close() to authenticated, service_role;
grant execute on function public.coach_open_result(text, numeric, date) to authenticated, service_role;
grant execute on function public.coach_open_remove(text) to authenticated, service_role;

-- ── 6. coach_erase_person() learns the results table (the challenge itself names nobody) ───────────────────────────────
do $stage84_erase$
declare d text; n integer;
  c_old constant text := '''crew_rings''';
  c_new constant text := '''crew_open_results'', ''crew_rings''';
begin
  if to_regprocedure('public.coach_erase_person(text,text,text,uuid[],boolean)') is null then
    raise exception 'stage84: coach_erase_person() is missing (stage54 first). Nothing was changed.';
  end if;
  d := pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure);
  if position('crew_open_results' in d) > 0 then return; end if;              -- already learned (a re-run)
  n := (length(d) - length(replace(d, c_old, ''))) / length(c_old);
  if n <> 1 then
    raise exception 'stage84: coach_erase_person() does not name crew_rings exactly once (found %). Nothing was changed.', n;
  end if;
  execute replace(d, c_old, c_new);
end
$stage84_erase$;
