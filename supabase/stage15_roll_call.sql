-- ============================================================================
--  STAGE 15 — ROLL CALL (one sentence a day, visible to the other athletes)
--  Project: bvipfipbdcyqnbczjmaq (eu-west-2). Run AFTER stage9–stage14.
--  Safe to re-run: every statement is guarded.
--
--  Design decisions baked in here:
--
--  1. ONE SENTENCE PER ATHLETE PER DAY. The primary key is (athlete_id, day),
--     so the shape of the table IS the rate limit — there is no counter to
--     enforce and no way to flood the wall. Re-posting edits the same row.
--
--  2. TODAY ONLY. An athlete may write and rewrite their line all day; once
--     the day closes the row can no longer be touched from the app. Nobody
--     gets to rewrite what they said about last Tuesday now that it looks bad.
--
--  3. POSTING REQUIRES BEING ON THE LEADERBOARD. leaderboard_optin already
--     means "I agree to other athletes seeing me, under this handle". Reusing
--     it means no second consent to reason about, no second display name, and
--     leaving the board takes your lines down with you (see note 5).
--
--  4. NO ATHLETE IDs ARE EVER RETURNED — same reason as the board: an id is
--     enough to fetch /data/<id>.json, which is that athlete's whole
--     programme. Reading is key-checked, so the wall is never public.
--
--  5. LEAVING THE BOARD HIDES YOUR LINES. roll_call() joins through
--     leaderboard_optin, so an athlete who leaves stops appearing immediately,
--     without deleting anything they wrote. Re-joining brings them back.
--
--  6. NOTHING HERE PAYS XP. Deliberate: the moment a sentence earns points you
--     get one character of gibberish every night at 23:58. No function in this
--     file touches scoring, and no scoring function reads this table.
--
--  7. pct IS SELF-REPORTED. The client sends the day's completion percentage
--     it has already computed. That is fine BECAUSE it is decoration on
--     self-authored text and buys nothing — it feeds no level, badge, quest or
--     board position. Mirroring dayPct() into plpgsql would add a third place
--     the scoring rules have to agree, which is the bug this codebase keeps
--     hitting. Anything that pays stays server-scored; this does not pay.
-- ============================================================================

begin;

-- ── The wall ──────────────────────────────────────────────────────────────
-- `day` is the athlete's LOCAL day, exactly as their app keys the habit log,
-- so a line always sits against the day it describes. It is not derived from
-- the server clock — see the window check in set_day_note().
create table if not exists public.hab_notes (
  athlete_id text        not null,
  day        date        not null,
  body       text        not null,
  pct        smallint,
  hidden     boolean     not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (athlete_id, day)
);
alter table public.hab_notes enable row level security;

create index if not exists hab_notes_day_idx on public.hab_notes (day desc);

-- Coach can read and moderate everything. Athletes (anon) get NO direct
-- access; they go through the key-checked functions below.
drop policy if exists "coach manage notes" on public.hab_notes;
create policy "coach manage notes" on public.hab_notes
  for all to authenticated
  using      ( (auth.jwt() ->> 'email') = 'amirardekanian@gmail.com' )
  with check ( (auth.jwt() ->> 'email') = 'amirardekanian@gmail.com' );

-- The coach's own line is stored in the same table under a reserved id, so
-- there is one wall and one read path rather than two of everything. No
-- athlete_id can collide with it: real ids come from the roster.
create or replace function public.coach_note_id() returns text
language sql immutable as $fn$ select '__coach__'::text $fn$;

-- ── Tidy one line of user text ────────────────────────────────────────────
-- Strips markup characters (same set the display-name path strips), flattens
-- newlines so one sentence cannot become a wall of text, collapses runs of
-- whitespace, and caps the length. The app escapes on render as well; this is
-- the belt to that pair of braces.
create or replace function public.hab_clean_note(p_body text, p_max int default 200)
returns text language plpgsql immutable as $fn$
declare t text;
begin
  t := coalesce(p_body, '');
  t := regexp_replace(t, '[<>"''\\]', '', 'g');
  t := regexp_replace(t, '\s+', ' ', 'g');
  t := btrim(t);
  return left(t, greatest(1, p_max));
end; $fn$;

-- ── An athlete writes, rewrites, or deletes today's line ──────────────────
-- Passing an empty body removes the line — that is how "actually, forget it"
-- works, and it keeps delete on the same key-checked path as write.
create or replace function public.set_day_note(
  p_athlete_id text, p_key text default null, p_day date default null,
  p_body text default null, p_pct int default null)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_expected text; v_body text; v_day date;
begin
  select secret_key into v_expected from public.athlete_keys where athlete_id = p_athlete_id;
  if v_expected is not null and (p_key is distinct from v_expected) then
    raise exception 'invalid athlete key';
  end if;

  if p_athlete_id = public.coach_note_id() then
    raise exception 'reserved id';
  end if;

  -- Must be on the board. Joining is where an athlete consents to being seen
  -- by the others and picks the handle this line will carry.
  if not exists (select 1 from public.leaderboard_optin o where o.athlete_id = p_athlete_id) then
    raise exception 'join the leaderboard before posting';
  end if;

  -- TODAY ONLY, but "today" is the athlete's, not the server's. Tehran is
  -- UTC+3:30 and the app keys its log in local time, so at 01:00 there the
  -- server is still on yesterday's date. A one-day tolerance either side
  -- covers every timezone on earth without letting anyone edit history.
  v_day := coalesce(p_day, current_date);
  if v_day > current_date + 1 or v_day < current_date - 1 then
    raise exception 'you can only write today''s line';
  end if;

  v_body := public.hab_clean_note(p_body);

  if v_body = '' then
    delete from public.hab_notes n where n.athlete_id = p_athlete_id and n.day = v_day;
    return;
  end if;

  insert into public.hab_notes (athlete_id, day, body, pct)
  values (p_athlete_id, v_day, v_body,
          case when p_pct is null then null
               else greatest(0, least(100, p_pct))::smallint end)
  on conflict (athlete_id, day) do update
    set body = excluded.body, pct = excluded.pct, updated_at = now();
end; $fn$;
revoke all on function public.set_day_note(text, text, date, text, int) from public;
grant execute on function public.set_day_note(text, text, date, text, int) to anon, authenticated;

-- ── Read the wall ─────────────────────────────────────────────────────────
-- Key-checked, so only a real athlete holding a valid key sees other clients'
-- handles and lines. Returns NO athlete_id — see header note 4.
--
-- rank_label is the poster's SEASON rank, computed the same way the board
-- computes it, so the two screens never disagree about who someone is. Only
-- athletes who actually posted in the window are scored, so this stays cheap.
create or replace function public.roll_call(
  p_athlete_id text, p_key text default null, p_days int default 7)
returns table (
  day date, display_name text, body text, pct smallint,
  rank_label text, is_me boolean, is_coach boolean
) language plpgsql security definer set search_path = public as $fn$
declare
  v_expected text; v_rules jsonb; v_from date; v_season_start date;
begin
  select secret_key into v_expected from public.athlete_keys where athlete_id = p_athlete_id;
  if v_expected is not null and (p_key is distinct from v_expected) then
    raise exception 'invalid athlete key';
  end if;

  select rules into v_rules from public.xp_rules where id = 1;
  select s.starts_on into v_season_start from public.current_season() s;
  v_from := current_date - greatest(1, least(60, coalesce(p_days, 7)));

  -- NOTE the abbreviated CTE column names (d, b, p, ua, said). In plpgsql a
  -- CTE column called `day`, `body` or `pct` collides with this function's OUT
  -- parameters of the same name, and the query fails to plan. Do not "tidy"
  -- them back to the obvious names.
  return query
  with visible as (
    -- Athletes: only those still on the board, only lines not hidden.
    select n.athlete_id as aid, n.day as d, o.display_name as dname,
           n.body as b, n.pct as p, n.updated_at as ua, false as coach
    from public.hab_notes n
    join public.leaderboard_optin o on o.athlete_id = n.athlete_id
    where not n.hidden and n.day >= v_from and n.day <= current_date + 1
    union all
    -- The coach, who is not on the board and does not need to be.
    select n.athlete_id, n.day, 'AMIR'::text,
           n.body, n.pct, n.updated_at, true
    from public.hab_notes n
    where n.athlete_id = public.coach_note_id()
      and not n.hidden and n.day >= v_from and n.day <= current_date + 1
  ),
  scored as (
    select v.aid as said,
           public.hab_rank_label(public.hab_level(
             ( public.hab_xp(public.hab_log_of(ap.data, v.aid),
                             v_season_start, current_date, v_rules)
             -- hab_bonus_xp takes (log, cfg, season_start, from, to, rules) as
             -- of stage14. The five-argument form in stage12 is superseded.
             + public.hab_bonus_xp(public.hab_log_of(ap.data, v.aid),
                                   public.hab_cfg_of(ap.data, v.aid),
                                   v_season_start, v_season_start, current_date, v_rules) ),
             v_rules)) as rlabel
    from (select distinct aid from visible where not coach) v
    left join public.athlete_progress ap on ap.athlete_id = v.aid
  )
  select vi.d, vi.dname, vi.b, vi.p,
         sc.rlabel, (vi.aid = p_athlete_id), vi.coach
  from visible vi
  left join scored sc on sc.said = vi.aid
  -- Newest day first; the coach's line leads its day, then most recently
  -- written. A day reads top-down as "here is the brief, here is who answered".
  order by vi.d desc, vi.coach desc, vi.ua desc;
end; $fn$;
revoke all on function public.roll_call(text, text, int) from public;
grant execute on function public.roll_call(text, text, int) to anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
--  COACH CONTROLS — run these in the Supabase SQL editor
-- ═══════════════════════════════════════════════════════════════════════════
-- The SQL editor carries no JWT, so `auth.jwt()` is NULL there. Guarding on
-- `is distinct from` alone would reject the coach at his own console — the bug
-- fixed in stage14. Guard on "signed in AND not him" instead. Nothing is
-- loosened: execute is granted to `authenticated` only, never anon.

-- Post the day's line from the coach. This is the most-read sentence in the
-- app on any day it exists, and it stops the wall looking empty at the start.
--   select public.set_coach_note('Everyone in. No excuses today.');
create or replace function public.set_coach_note(
  p_body text, p_day date default current_date)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_body text;
begin
  if auth.jwt() is not null
     and (auth.jwt() ->> 'email') is distinct from 'amirardekanian@gmail.com' then
    raise exception 'coach only';
  end if;
  v_body := public.hab_clean_note(p_body);
  if v_body = '' then
    delete from public.hab_notes n
     where n.athlete_id = public.coach_note_id() and n.day = p_day;
    return;
  end if;
  insert into public.hab_notes (athlete_id, day, body)
  values (public.coach_note_id(), p_day, v_body)
  on conflict (athlete_id, day) do update
    set body = excluded.body, updated_at = now();
end; $fn$;
revoke all on function public.set_coach_note(text, date) from public;
grant execute on function public.set_coach_note(text, date) to authenticated;

-- Take a line down. Hiding rather than deleting keeps the evidence, which is
-- what you want if you ever have to explain the decision to the athlete.
--   select public.hide_note('amir-test', '2026-07-27');
--   select public.hide_note('amir-test', '2026-07-27', false);  -- put it back
create or replace function public.hide_note(
  p_athlete_id text, p_day date, p_hidden boolean default true)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if auth.jwt() is not null
     and (auth.jwt() ->> 'email') is distinct from 'amirardekanian@gmail.com' then
    raise exception 'coach only';
  end if;
  update public.hab_notes n set hidden = p_hidden, updated_at = now()
   where n.athlete_id = p_athlete_id and n.day = p_day;
end; $fn$;
revoke all on function public.hide_note(text, date, boolean) from public;
grant execute on function public.hide_note(text, date, boolean) to authenticated;

-- Read the whole wall as the coach, hidden lines included, newest first:
--   select day, athlete_id, hidden, pct, body
--     from public.hab_notes order by day desc, updated_at desc limit 50;

commit;
