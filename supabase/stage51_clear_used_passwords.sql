-- stage51 — a stored first password is cleared by the database once the person has signed in with it
-- (2026-10-11, coach.html audit SERVER-1 / MKT-5; Amir: "Yes, automatically"). Safe to re-run.
--
-- When the coach makes a login (or resets one) the edge functions store the generated password in
-- athlete_identities / tps_accounts / assess_accounts (initial_password, with password_set_at) so the coach can copy it
-- into a WhatsApp message. It stayed there, in plain text, until the coach tapped "Mark sent", even after the person had
-- already signed in with it (the lists could only mark those "signed in with it"; 13 were stored on 2026-10-10, 8 of
-- them already used). A password nobody needs any more should not sit in a table.
--
-- Now: when auth.users.last_sign_in_at moves, the user's stored password is cleared if it was set BEFORE that sign-in
-- (the same test coach_login_use() has always used for "signed in with it"), and sent_at is stamped with the sign-in
-- time if "Mark sent" never was (so the lists say "sent <that day>" and the person drops out of "Logins to send").
--   · A reset sets a new password_set_at, so the next sign-in clears the new password the same way.
--   · The coach can still copy a password until the person signs in or the coach marks it sent.
--   · If the coach signs in AS the person to test the login before sending the password, that clears it too: reset the
--     login to get a new one. (The server cannot tell a test from the real thing.)
--
-- It must never get in the way of a sign-in. The trigger is AFTER UPDATE, only fires when last_sign_in_at changes,
-- touches three tables by primary key, and swallows any error of its own (the password then simply stays, as before).
-- SECURITY DEFINER with an empty search_path; not executable by anyone (a trigger needs no execute privilege to fire).
--
-- The backfill at the end applies the same rule to the passwords already stored and already used.

create or replace function public.clear_used_first_passwords()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  begin
    update public.athlete_identities
       set initial_password = null, sent_at = coalesce(sent_at, new.last_sign_in_at)
     where user_id = new.id and initial_password is not null
       and password_set_at is not null and new.last_sign_in_at > password_set_at;
    update public.tps_accounts
       set initial_password = null, sent_at = coalesce(sent_at, new.last_sign_in_at)
     where user_id = new.id and initial_password is not null
       and password_set_at is not null and new.last_sign_in_at > password_set_at;
    update public.assess_accounts
       set initial_password = null, sent_at = coalesce(sent_at, new.last_sign_in_at)
     where user_id = new.id and initial_password is not null
       and password_set_at is not null and new.last_sign_in_at > password_set_at;
  exception when others then
    null;   -- never block a sign-in over bookkeeping
  end;
  return new;
end; $function$;
revoke execute on function public.clear_used_first_passwords() from public, anon, authenticated;

create or replace trigger clear_used_first_passwords_trg
  after update of last_sign_in_at on auth.users
  for each row
  when (new.last_sign_in_at is distinct from old.last_sign_in_at)
  execute function public.clear_used_first_passwords();

-- Backfill: the stored passwords whose person has already signed in with them.
update public.athlete_identities t
   set initial_password = null, sent_at = coalesce(t.sent_at, u.last_sign_in_at)
  from auth.users u
 where u.id = t.user_id and t.initial_password is not null
   and t.password_set_at is not null and u.last_sign_in_at > t.password_set_at;
update public.tps_accounts t
   set initial_password = null, sent_at = coalesce(t.sent_at, u.last_sign_in_at)
  from auth.users u
 where u.id = t.user_id and t.initial_password is not null
   and t.password_set_at is not null and u.last_sign_in_at > t.password_set_at;
update public.assess_accounts t
   set initial_password = null, sent_at = coalesce(t.sent_at, u.last_sign_in_at)
  from auth.users u
 where u.id = t.user_id and t.initial_password is not null
   and t.password_set_at is not null and u.last_sign_in_at > t.password_set_at;
