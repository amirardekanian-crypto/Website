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
