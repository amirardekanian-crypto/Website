-- ═══════════════════════════════════════════════════════════════════════════
-- STAGE 21 — the wall is SEVEN DAYS, and nothing older is kept
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Amir, 2026-08-01: "only the messages from member for the last 7 days should
-- be shown, anything before that shouldnt be saved."
--
-- The SHOWN half already shipped with habits.html — `ROLL_DAYS = 7` and
-- `rollFloor()` filter the wall to today plus the six days behind it, on the
-- athlete's own clock. This file is the SAVED half, and it is the only place
-- that can make "shouldn't be saved" literally true.
--
-- ⚠️⚠️ THIS DELETES ROWS FROM public.hab_notes, PERMANENTLY. It is the only
-- destructive migration in this folder. Everything it removes is older than a
-- week and already invisible in every client, but read the count query at the
-- bottom of this header before you run it, so you know what is going.
--
-- ── Why the floor here is -8 days and not -6 ────────────────────────────────
-- `hab_notes.day` is the athlete's LOCAL day, not the server's — that is the
-- whole design of set_day_note(), which is why it accepts up to
-- `current_date + 1`. An athlete in Tehran rolls over eight and a half hours
-- before UTC does; one in Los Angeles, seven hours after. A server-side floor
-- of `current_date - 6` would therefore delete a line that is still inside
-- somebody's own seven-day window, on the far side of the date line, which is
-- the app quietly eating a post the athlete can still see.
--
-- So the two halves have different jobs and different floors, on purpose:
--   • THE CLIENT is the display authority — exactly 7 days, local clock.
--   • THE SERVER is the retention authority — 9 days, with the extra two as
--     timezone slack. Nothing survives past a week and a bit, and nothing
--     inside anybody's week is ever removed.
-- Do not "tidy" these to the same number. They are not the same number.
--
-- ── What this does NOT touch ────────────────────────────────────────────────
-- `roll_call()` is left exactly as stage17 left it. Its own window
-- (`current_date - p_days`) is now wider than what exists in the table, so it
-- can only ever return what the retention rule kept — and the client filters
-- again on top of that. Rewriting the RPC to change one date literal would mean
-- reproducing its whole body, which is how a working scoring function gets
-- broken for a cosmetic gain.
--
-- Nothing here reads or writes XP, and no scoring function reads hab_notes —
-- see stage15's note 6. Roll call still pays nothing.
--
-- SAFE TO RE-RUN.
--
-- ── Run this FIRST, to see what the cleanup will remove ────────────────────
--   select count(*) as will_be_deleted,
--          min(day)  as oldest,
--          count(distinct athlete_id) as athletes
--     from public.hab_notes
--    where day < current_date - 8;
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ── 1. The floor, in one place ─────────────────────────────────────────────
-- A function rather than a literal repeated in three statements, so the trigger,
-- the manual purge and the one-off cleanup can never drift apart.
create or replace function public.hab_notes_floor()
returns date language sql stable set search_path = public as $fn$
  select current_date - 8;
$fn$;

-- ── 2. The purge ───────────────────────────────────────────────────────────
-- Callable by the coach on demand. Returns how many it removed, so running it
-- by hand tells you something.
create or replace function public.purge_old_notes()
returns integer language plpgsql security definer set search_path = public as $fn$
declare v_n integer;
begin
  delete from public.hab_notes where day < public.hab_notes_floor();
  get diagnostics v_n = row_count;
  return v_n;
end; $fn$;
revoke all on function public.purge_old_notes() from public;
grant execute on function public.purge_old_notes() to authenticated;

-- ── 3. Keeping it purged, with no cron and no scheduler ────────────────────
-- A STATEMENT-level AFTER trigger on insert/update. The wall is written to
-- every time anybody posts or edits a line, or when the client refreshes its
-- own percentage — so the table sweeps itself on ordinary traffic, and a board
-- nobody is using has nothing worth pruning anyway.
--
-- ⚠️ FOR EACH STATEMENT, not FOR EACH ROW: set_day_note() writes one row at a
-- time, so row-level would fire the same whole-table delete once per row for no
-- gain. And the trigger is `insert or update` ONLY — its own DELETE must not be
-- able to re-enter it, which is what would turn a sweep into a recursion.
create or replace function public.hab_notes_prune()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  delete from public.hab_notes where day < public.hab_notes_floor();
  return null;
end; $fn$;

drop trigger if exists hab_notes_prune_trg on public.hab_notes;
create trigger hab_notes_prune_trg
  after insert or update on public.hab_notes
  for each statement execute function public.hab_notes_prune();

-- ── 4. The one-off cleanup for everything already there ────────────────────
-- The trigger only starts working from the next write. This is the backlog.
select public.purge_old_notes() as deleted_now;

commit;

-- ── Verify, after committing ───────────────────────────────────────────────
--   select count(*) as remaining, min(day) as oldest, max(day) as newest
--     from public.hab_notes;
--   -- oldest must be >= current_date - 8
--
-- And prove the trigger holds, on a throwaway id:
--   insert into public.hab_notes (athlete_id, day, body)
--        values ('_prune_test', current_date - 40, 'should not survive');
--   insert into public.hab_notes (athlete_id, day, body)
--        values ('_prune_test', current_date, 'this one fires the sweep');
--   select day, body from public.hab_notes where athlete_id = '_prune_test';
--   -- expect ONE row, today's. Then:
--   delete from public.hab_notes where athlete_id = '_prune_test';
