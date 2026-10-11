-- stage50 — the coach can READ the testing app's players, notes and results (2026-10-11, coach.html audit
-- SERVER-2). Safe to re-run.
--
-- The testing app (tennis-testing) lets a buyer keep their own players, notes and test results. Three tables hold
-- them: assess_players (name, birth year and month, sex, hand, squad), assess_notes and assess_results. Their
-- only row-level policy is "member owns …": a buyer sees their own rows and nobody else sees any, the coach
-- included. So the coach dashboard's weekly backup read ZERO rows from all three while looking fine, and the data
-- exists nowhere else (there are no automatic backups).
--
-- Amir, 2026-10-11 (decision 5 of the audit): yes, the coach may read them. This adds one SELECT policy per table
-- for the coach, nothing else:
--   · read only: no insert, update or delete policy for the coach, so the dashboard still cannot change a buyer's data;
--   · the buyers' own policies are untouched, and no buyer can see another buyer's rows;
--   · coach.html adds the three tables to BACKUP_TABLES (the weekly Backup file).
-- The players are the BUYER'S athletes (often juniors): they hold personal data of people who are not the buyer and
-- are not Amir's clients. The privacy notices do not mention the testing app or its players yet (audit MKT-16).
--
-- (select public.is_coach()) is wrapped in a sub-select like the other coach policies, so it is evaluated once per
-- statement and not once per row. The grants a signed-in account already has on these tables (the Supabase default)
-- are what let the policy decide; anon has none.

do $$ begin
  if not exists (select 1 from pg_policy where polrelid = 'public.assess_players'::regclass and polname = 'coach reads players') then
    create policy "coach reads players" on public.assess_players
      for select to authenticated using ((select public.is_coach()));
  end if;
  if not exists (select 1 from pg_policy where polrelid = 'public.assess_notes'::regclass and polname = 'coach reads notes') then
    create policy "coach reads notes" on public.assess_notes
      for select to authenticated using ((select public.is_coach()));
  end if;
  if not exists (select 1 from pg_policy where polrelid = 'public.assess_results'::regclass and polname = 'coach reads results') then
    create policy "coach reads results" on public.assess_results
      for select to authenticated using ((select public.is_coach()));
  end if;
end $$;
