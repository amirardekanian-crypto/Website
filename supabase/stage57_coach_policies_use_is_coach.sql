-- stage57_coach_policies_use_is_coach.sql — audit SERVER-13 (pile B3), 2026-10-11.
--
-- Eighteen row-level-security policies, written before public.is_coach() existed, spell out the coach's address:
--     ((auth.jwt() ->> 'email'::text) = 'amirardekanian@gmail.com'::text)
-- Every newer policy (24) and function (41) asks public.is_coach() instead. This moves the old ones over, so that after it the
-- address is typed in exactly two places in the database: is_coach() itself and coach_erase_person()'s check that the login
-- being erased is not the coach's own. The test is the same (is_coach() is coalesce(auth.jwt() ->> 'email', '') = the address;
-- a missing email was NULL, which a policy treats as "no", and is now false, which it also treats as "no"), and so are each
-- policy's roles and command: only the expression changes.
--
-- Rehearsed on the live project inside a transaction that was rolled back: as the coach every table read and wrote exactly as
-- before, as anyone else every table stayed empty and every write was refused, before and after.
-- Original definitions: stage1_schema.sql, stage2_keys.sql, stage3_messages.sql, stage5_call_logs.sql, stage8_cycle_reports.sql,
-- stage9_leaderboard.sql, stage11_seasons.sql, stage15_roll_call.sql, stage16_contacts.sql, stage17_titles.sql, stage25_season_record.sql,
-- stage27_intake.sql, stage28_library_sessions.sql (history; this file supersedes their policy text).

alter policy "coach manage keys" on public.athlete_keys using (public.is_coach()) with check (public.is_coach());
alter policy "coach delete progress" on public.athlete_progress using (public.is_coach());
alter policy "coach read progress" on public.athlete_progress using (public.is_coach());
alter policy "coach manage call_logs" on public.call_logs using (public.is_coach()) with check (public.is_coach());
alter policy "coach manage cycle_reports" on public.cycle_reports using (public.is_coach()) with check (public.is_coach());
alter policy "coach manage contacts" on public.hab_contacts using (public.is_coach()) with check (public.is_coach());
alter policy "coach manage intake" on public.hab_intake using (public.is_coach()) with check (public.is_coach());
alter policy "coach manage notes" on public.hab_notes using (public.is_coach()) with check (public.is_coach());
alter policy "coach manage season results" on public.hab_season_results using (public.is_coach()) with check (public.is_coach());
alter policy "coach manage titles" on public.hab_titles using (public.is_coach()) with check (public.is_coach());
alter policy "coach manage leaderboard" on public.leaderboard_optin using (public.is_coach()) with check (public.is_coach());
alter policy "coach manage library sessions" on public.library_sessions using (public.is_coach()) with check (public.is_coach());
alter policy "coach manage messages" on public.messages using (public.is_coach()) with check (public.is_coach());
alter policy "coach manage seasons" on public.seasons using (public.is_coach()) with check (public.is_coach());
alter policy "coach delete sessions" on public.session_history using (public.is_coach());
alter policy "coach read sessions" on public.session_history using (public.is_coach());
alter policy "coach update sessions" on public.session_history using (public.is_coach()) with check (public.is_coach());
alter policy "coach manage xp rules" on public.xp_rules using (public.is_coach()) with check (public.is_coach());
