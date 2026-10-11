-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
--  PASTE THIS WHOLE FILE INTO  Supabase → SQL Editor  AND PRESS RUN.   (made 2026-10-11 for Amir)
--
--  Why you have to: the database tool Claude uses asks YOU to confirm any SQL that deletes or drops, and the question never
--  reaches your screen (it timed out five times), so these four could not be applied for you. Each one was tested first on a
--  throwaway Postgres with made-up people. Nothing here touches real athletes: it adds and replaces database FUNCTIONS and one
--  TABLE; no person's data is deleted by running it (the removal of the 13 free signups is a separate file, run second).
--
--  The four parts, in order (part 4 needs part 3):
--    1  stage45  Forget refuses a coached athlete            -> Proof tab "forget" can no longer wipe a client's app data
--    2  stage52  version history keeps two cycles            -> File > Version history keeps the current + previous cycle
--    3  stage53  buyer notes are coach-only                  -> buyers can no longer read your note about them
--    4  stage54  full erasure                                -> the dashboard's "Erase completely…" and "Erase…" buttons work
--
--  Every part is safe to run again. The editor may warn that the query "contains destructive operations" (it has drop and
--  delete words in it, inside functions): that is expected, press "Run this query". The last thing it shows is a table with
--  one row per part: applied = true for all four means it worked. If you see an error instead, copy it to Claude.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════

-- ═════════════ PART 1 of 4 — stage45: Forget refuses a coached athlete (the server-side half of the Proof funnel fix) ═════════════
-- (verbatim from supabase/stage45_forget_contact_guard.sql)

-- stage45 — forget_contact() refuses a coached athlete (2026-10-10, coach.html audit MKT-1).
--
-- forget_contact() was written to remove free Proof signups, whose progress row holds only habit
-- keys. It deletes the WHOLE athlete_progress row whatever the tier, and the Proof funnel listed
-- every hab_contacts row, coached clients included. On a coached athlete that row is also their
-- training app's cloud copy: Personal Records, body weight, set logs, check-ins. The confirm said
-- "their session history stays", which read as "their training is safe".
--
-- Now: an athlete whose programme row is not tier 'free' is refused with a message, and nothing is
-- deleted. Free signups and Proof-only contacts (no programme row) are forgotten exactly as before.
-- coach.html also stops drawing "forget" for coached contacts. Applied with the Supabase MCP.

create or replace function public.forget_contact(p_athlete_id text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_coach() then
    raise exception 'coach only';
  end if;
  if exists (
    select 1 from public.programs p
     where p.athlete_id = p_athlete_id
       and coalesce(p.data->'athlete'->>'tier', p.data->>'tier', '') <> 'free'
  ) then
    raise exception 'coached athlete: forget would delete their training app data (records, body weight, check-ins). Nothing was deleted.';
  end if;
  delete from public.hab_notes         where athlete_id = p_athlete_id;
  delete from public.leaderboard_optin where athlete_id = p_athlete_id;
  delete from public.athlete_progress  where athlete_id = p_athlete_id;
  delete from public.hab_contacts      where athlete_id = p_athlete_id;
  delete from public.athlete_keys      where athlete_id = p_athlete_id;
end; $function$;
-- The grants the live function already has (create or replace keeps them): the coach's signed-in account only, never anon.
-- Stated here so a project built from these files has them too; the is_coach() check above is the second lock.
revoke execute on function public.forget_contact(text) from public, anon;
grant execute on function public.forget_contact(text) to authenticated;

-- ═════════════ PART 2 of 4 — stage52: a programme's version history keeps the current and the previous cycle ═════════════
-- (verbatim from supabase/stage52_version_history_two_cycles.sql)

-- stage52 — a programme's version history keeps the current and the previous cycle (2026-10-11, coach.html audit
-- WORK-10 / SERVER-12; Amir: "about two cycles back"). Safe to re-run.
--
-- program_versions holds the programme as it stood before each save, for File -> Version history and Restore. The
-- trigger programs_version_snapshot() (stage44 records it) kept the newest 20 per athlete and deleted the rest, so on a
-- busy week the oldest restore point could be a few days back, and one athlete was already at 20.
--
-- Now an athlete's history keeps:
--   · always the newest 20 saves (the old floor), and
--   · every save made since the PREVIOUS cycle began (the programme's own cycles[currentCycleIndex - 1].startDate; the
--     current cycle's start when there is no previous one; 70 days back when the dates are missing), and
--   · never more than 150 in all (a safety cap: each copy is the whole programme, about 14 kB, so 150 is about 2 MB
--     for one athlete on a free database of 500 MB).
-- The horizon is read from the programme being SAVED, so publishing the next cycle moves it forward: the cycle before
-- the one just finished drops out then, not before.
--
-- The programme save must never fail over bookkeeping: the horizon is worked out by a function that cannot raise on a
-- programme of any shape, and the trigger falls back to 70 days if it ever does. Nothing here changes what the
-- trigger stamps on programs (updated_at on EVERY update, updated_by) which coach.html's guarded save depends on.
--
-- Nothing to backfill: versions already deleted by the old 20-cap cannot come back.

create or replace function public.programs_keep_versions_from(p_data jsonb)
returns timestamptz
language plpgsql
stable
set search_path to 'public'
as $function$
declare
  idx int := 0;
  s   text;
  d   date;
begin
  begin idx := coalesce((p_data ->> 'currentCycleIndex')::int, 0); exception when others then idx := 0; end;
  if idx < 0 then idx := 0; end if;
  -- the previous cycle's start first, then the current cycle's
  foreach s in array array[
      case when idx >= 1 then p_data -> 'cycles' -> (idx - 1) ->> 'startDate' end,
      p_data -> 'cycles' -> idx ->> 'startDate'] loop
    if s is not null then
      begin d := s::date; exception when others then d := null; end;
      if d is not null then return d::timestamptz; end if;
    end if;
  end loop;
  return now() - interval '70 days';
end; $function$;

create or replace function public.programs_version_snapshot()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  keep_from timestamptz;
begin
  if old.data is distinct from new.data then
    insert into public.program_versions (athlete_id, data, saved_by)
    values (old.athlete_id, old.data, old.updated_by);

    begin
      keep_from := public.programs_keep_versions_from(new.data);
    exception when others then
      keep_from := now() - interval '70 days';
    end;

    delete from public.program_versions v
     where v.athlete_id = old.athlete_id
       and (
            v.id not in (
              select id from public.program_versions
               where athlete_id = old.athlete_id
               order by id desc
               limit 150)
         or (v.saved_at < keep_from
             and v.id not in (
               select id from public.program_versions
                where athlete_id = old.athlete_id
                order by id desc
                limit 20))
       );
  end if;
  new.updated_at := now();
  new.updated_by := coalesce(auth.jwt() ->> 'email', new.updated_by);
  return new;
end $function$;

-- ═════════════ PART 3 of 4 — stage53: your private note about a course or testing-app buyer moves where only you can read it ═════════════
-- (verbatim from supabase/stage53_buyer_notes.sql)

-- stage53 — the note Amir writes about a buyer moves out of the buyer's reach (2026-10-11, coach.html audit MKT-14;
-- Amir: "Yes, move it"). Safe to re-run.
--
-- A course or testing-app buyer can read their own account row (policies "buyer reads own tps account" and "buyer reads own
-- assess account"), and that row carried `label`: the private note the coach types when he makes the login ("who bought
-- it"). So a buyer who opened the browser's network tab could read what Amir wrote about them. Two course buyers had a note.
--
-- Now the note lives in public.buyer_notes, which only the coach can read or write:
--   · the notes already stored are copied over and cleared from the account rows;
--   · a trigger on both account tables moves any `label` that is written later (the tps-login and assess-login Edge
--     Functions still insert one when the coach fills in the note box) into buyer_notes and leaves the account row's
--     label empty, so the Edge Functions need no change and no deploy;
--   · coach.html reads the note from buyer_notes (and falls back to the old column while this has not been applied).
-- The `label` columns stay, always empty, so nothing that selects them breaks. A buyer's own row now carries no note.
-- The note is deleted with the buyer (ON DELETE CASCADE from the auth user).

create table if not exists public.buyer_notes (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  app         text not null check (app in ('course', 'testing')),
  note        text check (note is null or length(note) <= 80),
  updated_at  timestamptz not null default now()
);
alter table public.buyer_notes enable row level security;
drop policy if exists "coach manages buyer notes" on public.buyer_notes;
create policy "coach manages buyer notes" on public.buyer_notes
  for all to authenticated
  using ((select public.is_coach())) with check ((select public.is_coach()));
-- Stated, not assumed from the project's default grants: the signed-in role may use the table, and the policy above limits it to the
-- coach. anon has nothing.
revoke all on table public.buyer_notes from anon;
grant select, insert, update, delete on table public.buyer_notes to authenticated;

-- Moves a label written to an account row into buyer_notes. The first trigger argument says which app the row belongs to.
-- SECURITY DEFINER with an empty search_path so it works whoever writes the row (the Edge Functions use the service role,
-- the coach's own updates run as him) and cannot be redirected by a search_path. Never callable as a function.
create or replace function public.move_buyer_label()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if nullif(btrim(new.label), '') is not null then
    insert into public.buyer_notes (user_id, app, note)
    values (new.user_id, tg_argv[0], left(btrim(new.label), 80))
    on conflict (user_id) do update set note = excluded.note, updated_at = now();
  end if;
  new.label := null;
  return new;
end; $function$;
revoke execute on function public.move_buyer_label() from public, anon, authenticated;

drop trigger if exists tps_accounts_label_trg on public.tps_accounts;
create trigger tps_accounts_label_trg before insert or update of label on public.tps_accounts
  for each row execute function public.move_buyer_label('course');
drop trigger if exists assess_accounts_label_trg on public.assess_accounts;
create trigger assess_accounts_label_trg before insert or update of label on public.assess_accounts
  for each row execute function public.move_buyer_label('testing');

-- The notes already stored: copied first, then cleared (the clearing fires the trigger above, which finds nothing to move).
insert into public.buyer_notes (user_id, app, note)
select a.user_id, 'course', left(btrim(a.label), 80) from public.tps_accounts a where nullif(btrim(a.label), '') is not null
on conflict (user_id) do nothing;
insert into public.buyer_notes (user_id, app, note)
select a.user_id, 'testing', left(btrim(a.label), 80) from public.assess_accounts a where nullif(btrim(a.label), '') is not null
on conflict (user_id) do nothing;
update public.tps_accounts    set label = null where label is not null;
update public.assess_accounts set label = null where label is not null;

-- Housekeeping the security advisor flagged on 2026-10-11 (nothing to do with buyers, but it is a grant and this file is the next one to
-- be applied): coaching_logs_keep_version() and hab_notes_prune() are trigger functions. A trigger fires without anyone holding EXECUTE
-- on its function, and nobody calls one directly (the API only ever answers "trigger functions can only be called as triggers"), so
-- anon and signed-in users have no business holding it. Skipped silently where the function does not exist (the test replica).
do $$
begin
  if to_regprocedure('public.coaching_logs_keep_version()') is not null then
    revoke execute on function public.coaching_logs_keep_version() from public, anon, authenticated;
  end if;
  if to_regprocedure('public.hab_notes_prune()') is not null then
    revoke execute on function public.hab_notes_prune() from public, anon, authenticated;
  end if;
end $$;

-- ═════════════ PART 4 of 4 — stage54: one-step full erasure of an athlete or a buyer (the dashboard's "Erase completely…") ═════════════
-- (verbatim from supabase/stage54_erase_person.sql)

-- stage54 — one-step full erasure of a person (2026-10-11, coach.html audit FILE-7 / MKT-2 / SERVER-5 / MKT-16;
-- Amir: "both athletes and buyers"). Needs stage53 (buyer_notes). Safe to re-run.
--
-- Until now no button removed a whole person. "Delete training history" leaves the programme, the login, the coaching log and
-- the contact; Forget (forget_contact) is for free signups and leaves the login live; a buyer could only be revoked.
--
-- public.coach_erase_person(kind, key, confirm, intake_ids, dry_run) does it in ONE transaction, for three kinds of person:
--   'athlete'  key = the athlete id         every table below that holds that id, the login (athlete_identities) and the auth
--                                           user, plus the intake forms the coach picks. Forms that carry their email, WhatsApp number
--                                           or full name are OFFERED; any other form (most Farsi forms) is named by hand in the panel
--                                           (Amir, 2026-10-11: "pick any form in the Erase panel"), up to 10 per erasure.
--   'course'   key = the course username    the tps_accounts row, the coach's note about them, the auth user
--   'testing'  key = the testing username   the assess_accounts row, its players, notes and results (soft-deleted ones too),
--                                           the coach's note about them, the auth user
-- Deleting the auth user takes its sessions, refresh tokens and identities with it (ON DELETE CASCADE), so the person is signed
-- out everywhere and their phone cannot upload anything again.
--
-- The call is dry-run by default: it does exactly the work of a real erasure and then undoes it, so what it counts is what a
-- real run would delete (there is no second list to drift out of date). A real run needs p_dry_run => false AND p_confirm equal
-- to the athlete id or the username (the dashboard asks the coach to type it). Whatever goes wrong, nothing is half erased.
--
-- Guards (each raises, and nothing is erased):
--   · coach only (is_coach()); anon cannot even call it.
--   · p_dry_run must be true or false: NULL is refused (it used to skip every check and still delete).
--   · 'demo' (the public demo) and 'amir_ardekani' (the identity the dashboard reads the board through) are never erased.
--   · a login that is the coach's own, or the signed-in user's, is never deleted.
--   · a login shared by two accounts (an athlete who is also a buyer) is refused: sort it out by hand.
--   · nothing found under the key raises, so a typo cannot look like a success. Ids are case-sensitive: a key typed in another case
--     finds nothing (and says which id exists) instead of taking the login and leaving the data.
--   · AFTER the deletes, every table in the public and backup schemas that has an athlete_id column is checked for that id. If one
--     still holds a row (a table added after this file was written), everything is undone and the error names the table.
--     (The backup schema holds the rollback copies the pipeline makes before a one-off change to live programmes, such as
--     backup.onename_2026_10_09: any table there with an athlete_id column is emptied for the person as part of the erasure.)
--   · for every kind, any public table with a uuid column called user_id or account_id that still holds one of the deleted
--     sign-ins undoes everything the same way.
--   · the tables are emptied in the order publish_cycle() locks them (programme first), so a publish and an erasure never deadlock.
--
-- A phone that saves at the very moment of the erasure can still write one row after it (the erasure cannot see an uncommitted
-- write): the person then shows up in the roster again, and erasing them a second time removes it. The dashboard says so.
--
-- What it does NOT touch, and the dashboard says so before it asks: weekly backup files (they roll off within about three
-- months, as the privacy notice promises), emails already in Amir's inbox (Web3Forms), WhatsApp, anything on the person's own
-- phone, and affiliate partner records (an athlete who is also a partner: the record stays, only its link to the athlete is
-- cleared; Amir, 2026-10-11).
--
-- erasure_log keeps a receipt that holds no personal data: when, by whom, the kind, how many rows left each table, and a
-- SHA-256 of "kind:key" (the athlete id or the username, lower case). To ask "did I erase X?", hash "athlete:x" and look it up;
-- after restoring an old backup, hash every restored id the same way to find who must be erased again.

do $$ begin
  if to_regclass('public.buyer_notes') is null then
    raise exception 'stage54 needs stage53 first (public.buyer_notes does not exist)';
  end if;
end $$;

create table if not exists public.erasure_log (
  id            bigint generated always as identity primary key,
  erased_at     timestamptz not null default now(),
  erased_by     text,
  kind          text not null check (kind in ('athlete', 'course', 'testing')),
  subject_hash  text not null,
  counts        jsonb not null default '{}'::jsonb
);
alter table public.erasure_log enable row level security;
drop policy if exists "coach reads erasure log" on public.erasure_log;
create policy "coach reads erasure log" on public.erasure_log
  for select to authenticated using ((select public.is_coach()));
-- Written only by coach_erase_person() (it runs as the table owner); nobody can insert, change or remove a receipt.
revoke all on table public.erasure_log from anon, authenticated;
grant select on table public.erasure_log to authenticated;

create or replace function public.coach_erase_person(
  p_kind        text,
  p_key         text,
  p_confirm     text    default null,
  p_intake_ids  uuid[]  default '{}',
  p_dry_run     boolean default true)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  -- Every table that holds a row under an athlete id, in the order they are emptied. A table that is missing here but has an
  -- athlete_id column is caught by the check near the end, which undoes everything and names it.
  -- The first four are in the order publish_cycle() and the dashboard's editor lock them (programs, its versions, the coaching log,
  -- its versions): the same order means the two can wait for each other but never deadlock, and an erasure that starts while a
  -- cycle is being published waits at programs, so the publish's new version rows are committed before they are deleted.
  c_athlete_tables constant text[] := array[
    'programs', 'program_versions', 'coaching_logs', 'coaching_log_versions',
    'session_history', 'athlete_progress', 'hab_notes', 'hab_titles', 'hab_season_results', 'leaderboard_optin',
    'library_sessions', 'messages', 'call_logs', 'cycle_reports', 'athlete_keys', 'hab_contacts', 'athlete_identities'];
  -- Not clients: the public demo, and the identity coach.html reads the board through (AMIR_ATHLETE_ID there).
  c_protected constant text[] := array['demo', 'amir_ardekani'];
  -- Arabic-Indic (U+0660-0669) and Persian (U+06F0-06F9) digits, and what they fold to.
  c_digits_from constant text := U&'\0660\0661\0662\0663\0664\0665\0666\0667\0668\0669\06F0\06F1\06F2\06F3\06F4\06F5\06F6\06F7\06F8\06F9';
  c_digits_to   constant text := '01234567890123456789';
  v_kind      text    := lower(btrim(coalesce(p_kind, '')));
  v_key       text    := btrim(coalesce(p_key, ''));
  v_word      text;                         -- what the coach must type to confirm
  v_shown     text;                         -- a name for the confirmation text
  v_user      uuid;
  v_users     uuid[]  := '{}';              -- the logins that go with the person
  v_counts    jsonb   := '{}'::jsonb;
  v_total     bigint  := 0;
  v_n         bigint;
  v_emails    text[]  := '{}';
  v_phones    text[]  := '{}';              -- the last 9 digits of each WhatsApp number on their contact record
  v_fullname  text;
  v_cands     jsonb   := '[]'::jsonb;       -- intake forms that look like theirs
  v_unlinked  jsonb   := '[]'::jsonb;       -- affiliate codes whose link to this athlete was cleared
  v_ids       uuid[]  := coalesce(p_intake_ids, '{}');
  v_log_id    bigint;
  v_result    jsonb;
  v_other     text;
  t           text;
  sch         text;
  v_col       text;
begin
  if not public.is_coach() then
    raise exception 'coach only';
  end if;
  -- NULL is neither a dry run nor a real run: "not null" is null, so every test of the flag below would be skipped while the deletes
  -- still ran and committed (found in review, 2026-10-11). Only an explicit true or false is accepted.
  if p_dry_run is null then
    raise exception 'p_dry_run must be true or false, not null. Nothing was erased.';
  end if;
  if v_kind not in ('athlete', 'course', 'testing') then
    raise exception 'Unknown kind of person "%": use athlete, course or testing.', v_kind;
  end if;
  if v_key = '' then
    raise exception 'Who? The id or username is empty.';
  end if;
  -- One erasure at a time (a double tap, two tabs): the second one waits, then finds nothing.
  perform pg_advisory_xact_lock(hashtext('coach_erase_person'));

  begin   -- everything that changes data is in this block; a dry run ends by raising ZZ100, which undoes all of it
    -- ── who is this, and which logins go with them ──────────────────────────────────────────────────────────────────────
    if v_kind = 'athlete' then
      if lower(v_key) = any (c_protected) then
        raise exception '"%" is not a client (the public demo, or the identity this dashboard reads the board through). It is never erased.', v_key;
      end if;
      v_word := v_key;
      -- The identity row for exactly this id, plus a sign-in on the internal address that NO identity row claims (the row was lost
      -- earlier). Ids are case-sensitive but GoTrue lower-cases the address, so a sign-in whose identity row names another id (a key
      -- typed in another case) is never taken: before this, typing ZZ_Case_A for zz_case_a deleted the login and left the data.
      select coalesce(array_agg(distinct x.id), '{}'::uuid[]) into v_users
        from (select i.user_id as id from public.athlete_identities i where i.athlete_id = v_key
              union
              select u.id from auth.users u
               where lower(u.email) = lower('athlete.' || v_key || '@amirardekani.com')
                 and not exists (select 1 from public.athlete_identities i2 where i2.user_id = u.id)) x;
      select nullif(btrim(concat_ws(' ', p.data -> 'athlete' ->> 'firstName', p.data -> 'athlete' ->> 'lastName')), '')
        into v_shown from public.programs p where p.athlete_id = v_key;
      if v_shown is null then
        select nullif(btrim(c.display_name), '') into v_shown from public.hab_contacts c where c.athlete_id = v_key;
      end if;
      if v_shown is null then
        select nullif(btrim(a.athlete_name), '') into v_shown from public.athlete_progress a where a.athlete_id = v_key;
      end if;
      v_shown := coalesce(v_shown, v_key);
      if exists (select 1 from public.tps_accounts a where a.user_id = any (v_users))
         or exists (select 1 from public.assess_accounts a where a.user_id = any (v_users)) then
        raise exception 'This athlete''s login is also a course or testing-app login. Nothing was erased: sort that out by hand first.';
      end if;
    elsif v_kind = 'course' then
      select a.user_id, a.username into v_user, v_word from public.tps_accounts a where lower(a.username) = lower(v_key);
      if v_user is null then
        raise exception 'There is no course login called "%". Nothing was erased.', v_key;
      end if;
      v_users := array[v_user];
      select nullif(btrim(n.note), '') into v_shown from public.buyer_notes n where n.user_id = v_user;
      v_shown := coalesce(v_shown, v_word);
      if exists (select 1 from public.athlete_identities i where i.user_id = v_user)
         or exists (select 1 from public.assess_accounts a where a.user_id = v_user) then
        raise exception 'This course login is also an athlete or testing-app login. Nothing was erased: sort that out by hand first.';
      end if;
    else
      select a.user_id, a.username into v_user, v_word from public.assess_accounts a where lower(a.username) = lower(v_key);
      if v_user is null then
        raise exception 'There is no testing-app login called "%". Nothing was erased.', v_key;
      end if;
      v_users := array[v_user];
      select nullif(btrim(n.note), '') into v_shown from public.buyer_notes n where n.user_id = v_user;
      v_shown := coalesce(v_shown, v_word);
      if exists (select 1 from public.athlete_identities i where i.user_id = v_user)
         or exists (select 1 from public.tps_accounts a where a.user_id = v_user) then
        raise exception 'This testing-app login is also an athlete or course login. Nothing was erased: sort that out by hand first.';
      end if;
    end if;

    if exists (select 1 from auth.users u
                where u.id = any (v_users)
                  and (lower(coalesce(u.email, '')) = 'amirardekanian@gmail.com' or u.id = auth.uid())) then
      raise exception 'That login is yours, the coach''s. Nothing was erased.';
    end if;

    -- ── the typed confirmation: a real run only ─────────────────────────────────────────────────────────────────────────
    if not p_dry_run and lower(btrim(coalesce(p_confirm, ''))) <> lower(v_word) then
      raise exception 'The confirmation does not match. Type exactly "%" to erase. Nothing was erased.', v_word;
    end if;

    -- ── athlete: the intake forms that look like theirs, then everything under the id ───────────────────────────────────
    if v_kind = 'athlete' then
      -- What identifies them: the emails and WhatsApp numbers on their contact record, and their full name as the programme spells it.
      -- A number is compared by its last 9 digits with Persian and Arabic-Indic digits folded to 0-9, so 0912…, +98912… and ۰۹۱۲… are one.
      select coalesce(array_agg(distinct lower(btrim(c.email))) filter (where nullif(btrim(c.email), '') is not null), '{}'::text[]),
             coalesce(array_agg(distinct right(d.digits, 9)) filter (where length(d.digits) >= 9), '{}'::text[])
        into v_emails, v_phones
        from public.hab_contacts c
        cross join lateral (select regexp_replace(translate(coalesce(c.whatsapp, ''), c_digits_from, c_digits_to), '\D', '', 'g') as digits) d
       where c.athlete_id = v_key;
      select lower(regexp_replace(btrim(concat_ws(' ', p.data -> 'athlete' ->> 'firstName', p.data -> 'athlete' ->> 'lastName')), '\s+', ' ', 'g'))
        into v_fullname from public.programs p
       where p.athlete_id = v_key
         and nullif(btrim(p.data -> 'athlete' ->> 'firstName'), '') is not null
         and nullif(btrim(p.data -> 'athlete' ->> 'lastName'), '') is not null;
      -- 'shared' = the same email or number is also on ANOTHER athlete's contact record (a parent's address for two children): the
      -- dashboard never ticks such a form for you.
      with f as (
        select i.id, i.created_at, i.name, i.programme, i.lang,
               lower(btrim(coalesce(i.email, ''))) as em,
               case when length(q.digits) >= 9 then right(q.digits, 9) end as ph,
               lower(regexp_replace(btrim(coalesce(i.name, '')), '\s+', ' ', 'g')) as nm
          from public.hab_intake i
          cross join lateral (select regexp_replace(translate(coalesce(i.contact, ''), c_digits_from, c_digits_to), '\D', '', 'g') as digits) q),
      m as (
        select f.*, case when f.em <> '' and f.em = any (v_emails) then 'email'
                         when f.ph is not null and f.ph = any (v_phones) then 'whatsapp'
                         when v_fullname is not null and f.nm = v_fullname then 'name' end as how
          from f)
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', m.id, 'created_at', m.created_at, 'name', m.name, 'programme', m.programme, 'lang', m.lang,
               'matched_on', m.how,
               'shared', (m.how = 'email' and exists (select 1 from public.hab_contacts c2
                                                       where c2.athlete_id <> v_key and lower(btrim(coalesce(c2.email, ''))) = m.em))
                      or (m.how = 'whatsapp' and exists (select 1 from public.hab_contacts c2
                                                          cross join lateral (select regexp_replace(translate(coalesce(c2.whatsapp, ''), c_digits_from, c_digits_to), '\D', '', 'g') as digits) q2
                                                         where c2.athlete_id <> v_key and length(q2.digits) >= 9 and right(q2.digits, 9) = m.ph)))
               order by m.created_at), '[]'::jsonb)
        into v_cands from m where m.how is not null;
      -- The forms to erase are the coach's pick (Amir, 2026-10-11): the matches above are only offered, and a form filled in under
      -- another name or number (most Farsi forms: the programme is in Latin letters) is found by hand in the dashboard. So any
      -- form that exists may be named, but not a runaway list, and a form that is already gone stops the erasure.
      if (select count(distinct s.id) from unnest(v_ids) s(id)) > 10 then
        raise exception 'More than 10 intake forms in one erasure is almost certainly a mistake. Nothing was erased.';
      end if;
      if exists (select 1 from unnest(v_ids) s(id)
                  where s.id is null or not exists (select 1 from public.hab_intake i where i.id = s.id)) then
        raise exception 'One of the intake forms does not exist (it may already be gone). Nothing was erased.';
      end if;

      foreach t in array c_athlete_tables loop
        execute format('delete from public.%I where athlete_id = $1', t) using v_key;
        get diagnostics v_n = row_count;
        v_counts := v_counts || jsonb_build_object(t, v_n);
        v_total := v_total + v_n;
      end loop;

      -- The rollback copies the pipeline keeps before a one-off change to live programmes sit in the "backup" schema, outside the list
      -- above (backup.onename_2026_10_09 holds 17 athletes' old progress and session logs from the rename of 2026-10-09). Whatever table
      -- there has an athlete_id column is emptied for this person too, so a table added later is covered without anyone remembering it.
      for t in
        select c.relname::text
          from pg_catalog.pg_attribute a
          join pg_catalog.pg_class c on c.oid = a.attrelid
          join pg_catalog.pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'backup' and a.attname = 'athlete_id' and a.attnum > 0 and not a.attisdropped
           and c.relkind in ('r', 'p')
         order by 1
      loop
        execute format('delete from backup.%I where athlete_id::text = $1', t) using v_key;
        get diagnostics v_n = row_count;
        v_counts := v_counts || jsonb_build_object('backup.' || t, v_n);
        v_total := v_total + v_n;
      end loop;

      -- The forms are counted in v_total only AFTER the "nothing is stored" check below: a mistyped id with forms ticked must raise
      -- that error, not erase the forms and write a receipt.
      delete from public.hab_intake where id = any (v_ids);
      get diagnostics v_n = row_count;
      v_counts := v_counts || jsonb_build_object('hab_intake', v_n);

      -- A partner record is a business record and stays; only its link to the erased athlete id goes.
      with u as (update public.affiliates set athlete_id = null where athlete_id = v_key returning code)
        select coalesce(jsonb_agg(code order by code), '[]'::jsonb) into v_unlinked from u;

    elsif v_kind = 'course' then
      delete from public.buyer_notes where user_id = v_user;
      get diagnostics v_n = row_count;
      v_counts := v_counts || jsonb_build_object('buyer_notes', v_n);
      v_total := v_total + v_n;
      delete from public.tps_accounts where user_id = v_user;
      get diagnostics v_n = row_count;
      v_counts := v_counts || jsonb_build_object('tps_accounts', v_n);
      v_total := v_total + v_n;

    else
      -- children first, so each count is the real number (a cascade would delete them uncounted)
      delete from public.assess_notes where account_id = v_user;
      get diagnostics v_n = row_count;
      v_counts := v_counts || jsonb_build_object('assess_notes', v_n);
      v_total := v_total + v_n;
      delete from public.assess_results where account_id = v_user;
      get diagnostics v_n = row_count;
      v_counts := v_counts || jsonb_build_object('assess_results', v_n);
      v_total := v_total + v_n;
      delete from public.assess_players where account_id = v_user;
      get diagnostics v_n = row_count;
      v_counts := v_counts || jsonb_build_object('assess_players', v_n);
      v_total := v_total + v_n;
      delete from public.buyer_notes where user_id = v_user;
      get diagnostics v_n = row_count;
      v_counts := v_counts || jsonb_build_object('buyer_notes', v_n);
      v_total := v_total + v_n;
      delete from public.assess_accounts where user_id = v_user;
      get diagnostics v_n = row_count;
      v_counts := v_counts || jsonb_build_object('assess_accounts', v_n);
      v_total := v_total + v_n;
    end if;

    -- ── the sign-in account itself; its sessions, tokens and identities go with it ───────────────────────────────────────
    delete from auth.users where id = any (v_users);
    get diagnostics v_n = row_count;
    v_counts := v_counts || jsonb_build_object('auth_users', v_n);
    v_total := v_total + v_n;

    -- ── nothing may be left ────────────────────────────────────────────────────────────────────────────────────────────
    if exists (select 1 from public.athlete_identities x where x.user_id = any (v_users))
       or exists (select 1 from public.tps_accounts x where x.user_id = any (v_users))
       or exists (select 1 from public.assess_accounts x where x.user_id = any (v_users))
       or exists (select 1 from public.buyer_notes x where x.user_id = any (v_users)) then
      raise exception 'Stopped, nothing was erased: a login row was still there after its sign-in account was deleted.';
    end if;
    -- A table added later that keys its rows on a sign-in (a uuid column called user_id or account_id) and is not emptied by the
    -- cascade from the deleted sign-in: for a buyer this is the only check that such a table was never forgotten.
    for sch, t, v_col in
      select n.nspname::text, c.relname::text, a.attname::text
        from pg_catalog.pg_attribute a
        join pg_catalog.pg_class c on c.oid = a.attrelid
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and a.attname in ('user_id', 'account_id') and a.atttypid = 'uuid'::regtype
         and a.attnum > 0 and not a.attisdropped and c.relkind in ('r', 'p')
       order by 1, 2, 3
    loop
      execute format('select count(*) from %I.%I where %I = any ($1)', sch, t, v_col) into v_n using v_users;
      if v_n > 0 then
        raise exception 'Stopped, nothing was erased: the table %.% still holds % row(s) for their sign-in (column %). coach_erase_person does not know that table yet.', sch, t, v_n, v_col;
      end if;
    end loop;
    if v_kind = 'athlete' then
      for sch, t in
        select n.nspname::text, c.relname::text
          from pg_catalog.pg_attribute a
          join pg_catalog.pg_class c on c.oid = a.attrelid
          join pg_catalog.pg_namespace n on n.oid = c.relnamespace
         where n.nspname in ('public', 'backup') and a.attname = 'athlete_id' and a.attnum > 0 and not a.attisdropped
           and c.relkind in ('r', 'p')
         order by 1, 2
      loop
        execute format('select count(*) from %I.%I where athlete_id::text = $1', sch, t) into v_n using v_key;
        if v_n > 0 then
          raise exception 'Stopped, nothing was erased: the table %.% still holds % row(s) for "%". coach_erase_person does not know that table yet.', sch, t, v_n, v_key;
        end if;
      end loop;
    end if;
    if v_total = 0 then
      if v_kind = 'athlete' then   -- ids are case-sensitive: say so when only the case differs
        select p.athlete_id into v_other from public.programs p where lower(p.athlete_id) = lower(v_key) and p.athlete_id <> v_key limit 1;
        if v_other is null then
          select a.athlete_id into v_other from public.athlete_progress a where lower(a.athlete_id) = lower(v_key) and a.athlete_id <> v_key limit 1;
        end if;
      end if;
      raise exception 'Nothing is stored for "%". Nothing was erased.%', v_key,
        case when v_other is not null then ' (There is an athlete "' || v_other || '": ids are case-sensitive.)' else '' end;
    end if;
    v_total := v_total + coalesce((v_counts ->> 'hab_intake')::bigint, 0);

    -- ── the receipt (a real run only) and the answer ───────────────────────────────────────────────────────────────────
    if not p_dry_run then
      insert into public.erasure_log (erased_by, kind, subject_hash, counts)
      values (auth.jwt() ->> 'email', v_kind,
              encode(sha256(convert_to(v_kind || ':' || lower(v_word), 'UTF8')), 'hex'),
              v_counts || jsonb_build_object('affiliates_unlinked', jsonb_array_length(v_unlinked)))
      returning id into v_log_id;
    end if;
    v_result := jsonb_build_object(
      'ok', true, 'dry_run', p_dry_run, 'kind', v_kind, 'key', v_key, 'shown_as', v_shown, 'confirm_word', v_word,
      'counts', v_counts, 'total', v_total, 'intake_candidates', v_cands, 'intake_erased', (v_counts ->> 'hab_intake')::bigint,
      'affiliates_unlinked', v_unlinked, 'log_id', v_log_id);
    if p_dry_run then
      raise exception using errcode = 'ZZ100', message = v_result::text;
    end if;
  exception when sqlstate 'ZZ100' then
    return sqlerrm::jsonb;       -- the dry run: every change above has been undone, only the counts come back
  end;
  return v_result;
end; $function$;

revoke execute on function public.coach_erase_person(text, text, text, uuid[], boolean) from public, anon;
grant execute on function public.coach_erase_person(text, text, text, uuid[], boolean) to authenticated;

-- ═════════════ RESULT — one row per part; applied should be true on all four ═════════════
select v.part, v.applied from (values
  (1, 'stage45  Forget refuses a coached athlete',      position('coached athlete: forget' in pg_get_functiondef('public.forget_contact'::regproc)) > 0),
  (2, 'stage52  version history keeps two cycles',      to_regprocedure('public.programs_keep_versions_from(jsonb)') is not null),
  (3, 'stage53  buyer notes are coach-only',            to_regclass('public.buyer_notes') is not null
                                                       and exists (select 1 from pg_trigger where tgname = 'tps_accounts_label_trg')),
  (4, 'stage54  full erasure',                          to_regprocedure('public.coach_erase_person(text,text,text,uuid[],boolean)') is not null
                                                       and to_regclass('public.erasure_log') is not null)
) v(n, part, applied) order by v.n;
