-- stage54 — one-step full erasure of a person (2026-10-11, coach.html audit FILE-7 / MKT-2 / SERVER-5 / MKT-16;
-- Amir: "both athletes and buyers"). Needs stage53 (buyer_notes). Safe to re-run.
--
-- Until now no button removed a whole person. "Delete training history" leaves the programme, the login, the coaching log and
-- the contact; Forget (forget_contact) is for free signups and leaves the login live; a buyer could only be revoked.
--
-- public.coach_erase_person(kind, key, confirm, intake_ids, dry_run) does it in ONE transaction, for three kinds of person:
--   'athlete'  key = the athlete id         every table below that holds that id, the login (athlete_identities) and the auth
--                                           user, plus the intake forms the coach picks (the ones that carry their email or full name)
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
--   · 'demo' (the public demo) and 'amir_ardekani' (the identity the dashboard reads the board through) are never erased.
--   · a login that is the coach's own, or the signed-in user's, is never deleted.
--   · a login shared by two accounts (an athlete who is also a buyer) is refused: sort it out by hand.
--   · nothing found under the key raises, so a typo cannot look like a success.
--   · AFTER the deletes, every table in the public schema that has an athlete_id column is checked for that id. If one still
--     holds a row (a table added after this file was written), everything is undone and the error names the table.
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
  c_athlete_tables constant text[] := array[
    'session_history', 'athlete_progress', 'hab_notes', 'hab_titles', 'hab_season_results', 'leaderboard_optin',
    'library_sessions', 'messages', 'call_logs', 'cycle_reports', 'coaching_log_versions', 'coaching_logs',
    'program_versions', 'programs', 'athlete_keys', 'hab_contacts', 'athlete_identities'];
  -- Not clients: the public demo, and the identity coach.html reads the board through (AMIR_ATHLETE_ID there).
  c_protected constant text[] := array['demo', 'amir_ardekani'];
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
  v_fullname  text;
  v_cands     jsonb   := '[]'::jsonb;       -- intake forms that look like theirs
  v_unlinked  jsonb   := '[]'::jsonb;       -- affiliate codes whose link to this athlete was cleared
  v_ids       uuid[]  := coalesce(p_intake_ids, '{}');
  v_log_id    bigint;
  v_result    jsonb;
  t           text;
begin
  if not public.is_coach() then
    raise exception 'coach only';
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
      -- the identity row, plus an auth user on the internal address in case the identity row was already lost
      select coalesce(array_agg(distinct x.id), '{}'::uuid[]) into v_users
        from (select i.user_id as id from public.athlete_identities i where i.athlete_id = v_key
              union
              select u.id from auth.users u where lower(u.email) = lower('athlete.' || v_key || '@amirardekani.com')) x;
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
      select coalesce(array_agg(distinct lower(btrim(c.email))) filter (where nullif(btrim(c.email), '') is not null), '{}'::text[])
        into v_emails from public.hab_contacts c where c.athlete_id = v_key;
      select lower(regexp_replace(btrim(concat_ws(' ', p.data -> 'athlete' ->> 'firstName', p.data -> 'athlete' ->> 'lastName')), '\s+', ' ', 'g'))
        into v_fullname from public.programs p
       where p.athlete_id = v_key
         and nullif(btrim(p.data -> 'athlete' ->> 'firstName'), '') is not null
         and nullif(btrim(p.data -> 'athlete' ->> 'lastName'), '') is not null;
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', i.id, 'created_at', i.created_at, 'name', i.name, 'programme', i.programme, 'lang', i.lang,
               'matched_on', case when lower(btrim(coalesce(i.email, ''))) = any (v_emails) then 'email' else 'name' end)
               order by i.created_at), '[]'::jsonb)
        into v_cands from public.hab_intake i
       where lower(btrim(coalesce(i.email, ''))) = any (v_emails)
          or (v_fullname is not null and lower(regexp_replace(btrim(coalesce(i.name, '')), '\s+', ' ', 'g')) = v_fullname);
      if exists (select 1 from unnest(v_ids) s(id)
                  where not exists (select 1 from jsonb_array_elements(v_cands) c where (c ->> 'id')::uuid = s.id)) then
        raise exception 'One of the intake forms is not a form that carries this person''s email or full name. Nothing was erased.';
      end if;

      foreach t in array c_athlete_tables loop
        execute format('delete from public.%I where athlete_id = $1', t) using v_key;
        get diagnostics v_n = row_count;
        v_counts := v_counts || jsonb_build_object(t, v_n);
        v_total := v_total + v_n;
      end loop;

      delete from public.hab_intake where id = any (v_ids);
      get diagnostics v_n = row_count;
      v_counts := v_counts || jsonb_build_object('hab_intake', v_n);
      v_total := v_total + v_n;

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
    if v_kind = 'athlete' then
      for t in
        select c.relname::text
          from pg_catalog.pg_attribute a
          join pg_catalog.pg_class c on c.oid = a.attrelid
          join pg_catalog.pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public' and a.attname = 'athlete_id' and a.attnum > 0 and not a.attisdropped
           and c.relkind in ('r', 'p')
         order by 1
      loop
        execute format('select count(*) from public.%I where athlete_id::text = $1', t) into v_n using v_key;
        if v_n > 0 then
          raise exception 'Stopped, nothing was erased: the table % still holds % row(s) for "%". coach_erase_person does not know that table yet.', t, v_n, v_key;
        end if;
      end loop;
    end if;
    if v_total = 0 then
      raise exception 'Nothing is stored for "%". Nothing was erased.', v_key;
    end if;

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
