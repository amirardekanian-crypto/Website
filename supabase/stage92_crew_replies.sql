-- stage92_crew_replies.sql — the crew can answer each other (2026-10-20)
--
-- Amir, asked replies or likes only (the audit *The Empty Room*, https://claude.ai/artifact/6VAMqcv12S9Y7rNCLEwmdM):
-- **"replies and likes like instagram"**. He had chosen likes only, and the first week produced Ehsan posting
-- *"what's the meaning of Kudos?"* into a room with no way to answer. A crew that cannot talk is a notice board.
-- Asked again on the day: **no likes on replies** ("dont need the likes on replies"). So a reply is text, and the Like
-- stays where it was, on the post.
--
-- One level of replies, text only, 140 characters, gone with the post at 7 days, and Amir can remove any of them.
-- Nothing here pays XP (GAME-6).
--
-- It also carries the **complete** fix for the double post, which stage91's app half could only paper over: a key made on
-- the phone, which the server refuses a second time. Until now a 200 KB photo on Iran's connection could outlast the
-- composer's timeout, the server wrote the post, the athlete tapped Post again and it was written twice — two posts and two
-- of their three photos for the day.
--
-- ⚠️ TWO FUNCTIONS ARE PATCHED, NOT RETYPED. `get_bell()` and `coach_erase_person()` are long and this stage changes one
-- line of each, so it reads the live definition with `pg_get_functiondef()`, string-replaces that line and executes the
-- result. Each patch checks its anchor is there and does nothing if the change is already in, so the stage is safe to
-- re-run and refuses loudly rather than half-applying. (A fresh database is built from `supabase/schema_snapshot.sql`,
-- which holds the final definitions, so nothing here is needed on a restore.)
--
-- ⚠️ A NEW TABLE UNDER AN ATHLETE ID. `coach_erase_person()` ends by scanning every `public` table with an `athlete_id`
-- column and refusing to erase anybody while rows are left — so `crew_replies` HAD to join its list in this same stage or
-- the next erasure would have stopped dead. It is deliberately NOT in `BACKUP_TABLES`: like every other crew table it dies
-- at 7 days, and a 12-week backup of it would break the 7-day promise in privacy.html. It goes in `SHORT_LIVED` in
-- `scripts/restore/restore_backup.py` instead, and in the snapshot, in this same commit.
--
-- The way back: `scripts/career/rollback_stage92.sql` (drops the table and its functions, puts both patched functions back).

-- ── 0. The guard ────────────────────────────────────────────────────────────────────────────────────────────────────────
do $stage92_guard$
begin
  if to_regprocedure('public.get_bell(text)') is null then
    raise exception 'stage92: stage81 (Crew and the Bell) is not on this database. Nothing was changed.';
  end if;
  if to_regprocedure('public.crew_write_post(text,text,text,integer,integer,text,jsonb,boolean)') is null then
    raise exception 'stage92: crew_write_post() is not on this database. Nothing was changed.';
  end if;
  if to_regprocedure('public.coach_erase_person(text,text,text,uuid[],boolean)') is null then
    raise exception 'stage92: coach_erase_person() is not on this database, and this stage must add crew_replies to it. Nothing was changed.';
  end if;
end
$stage92_guard$;

-- ── 1. The table ────────────────────────────────────────────────────────────────────────────────────────────────────────
-- A reply belongs to a post and dies with it (on delete cascade), so `crew_sweep()` needs no new line: when a post goes at
-- 7 days its replies go in the same statement.
create table if not exists public.crew_replies (
  id         uuid        primary key default gen_random_uuid(),
  post_id    uuid        not null references public.crew_posts (id) on delete cascade,
  athlete_id text        not null,
  body       text        not null,
  created_at timestamptz not null default now()
);
create index if not exists crew_replies_post_idx on public.crew_replies (post_id, created_at);
create index if not exists crew_replies_who_idx on public.crew_replies (athlete_id, created_at);

do $stage92_policies$
begin
  execute 'alter table public.crew_replies enable row level security';
  execute 'revoke all on table public.crew_replies from public, anon, authenticated';
  execute 'grant all on table public.crew_replies to service_role';
end
$stage92_policies$;

-- ── 2. The reads and writes ─────────────────────────────────────────────────────────────────────────────────────────────
-- One post's replies, oldest first, as the viewer sees them. A reply from somebody no longer in the crew (a no, a former
-- athlete) is not shown, exactly as their Like is not counted.
create or replace function public.crew_reply_rows(p_post uuid, p_viewer text) returns jsonb
language sql stable set search_path to 'public' as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', r.id,
           'who', case when r.athlete_id = public.coach_note_id() then 'Amir' else m.name end,
           'me', r.athlete_id is not distinct from p_viewer,
           'amir', r.athlete_id = public.coach_note_id(),
           'body', r.body,
           'at', r.created_at) order by r.created_at), '[]'::jsonb)
    from public.crew_replies r
    left join public.crew_members() m on m.athlete_id = r.athlete_id
   where r.post_id = p_post
     and (r.athlete_id = public.coach_note_id() or m.athlete_id is not null)
$function$;

-- Write one. The post must be one the athlete can actually see: a crew member's or Amir's, inside the 7 days.
create or replace function public.crew_reply(p_post uuid, p_body text) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare v_me text := public.crew_who(); v_body text := public.crew_clean(p_body); v_author text;
begin
  if not exists (select 1 from public.crew_members() m where m.athlete_id = v_me) then raise exception 'crew:not_yes'; end if;
  if v_body = '' then raise exception 'crew:empty'; end if;
  if char_length(v_body) > 140 then raise exception 'crew:reply_long'; end if;
  perform public.crew_sweep();
  select p.athlete_id into v_author from public.crew_posts p
   where p.id = p_post and p.created_at >= now() - interval '7 days'
     and (p.athlete_id = public.coach_note_id() or exists (select 1 from public.crew_members() m where m.athlete_id = p.athlete_id));
  if v_author is null then raise exception 'crew:gone'; end if;
  -- Two caps, both held under one lock so two taps cannot both pass: what one athlete may say in a day, and how long one
  -- post's thread may get. The post's own cap counts everybody's, so a thread cannot be driven past reading length.
  perform pg_advisory_xact_lock(hashtext('crew_reply:' || v_me));
  if (select count(*) from public.crew_replies r where r.athlete_id = v_me and r.created_at >= date_trunc('day', now())) >= 30 then
    raise exception 'crew:replies_today';
  end if;
  if (select count(*) from public.crew_replies r where r.post_id = p_post) >= 50 then
    raise exception 'crew:replies_full';
  end if;
  insert into public.crew_replies (post_id, athlete_id, body) values (p_post, v_me, v_body);
  return jsonb_build_object('post', p_post, 'replies', public.crew_reply_rows(p_post, v_me));
end $function$;

-- Your own, taken back.
create or replace function public.crew_reply_delete(p_id uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare v_me text := public.crew_who(); v_post uuid;
begin
  select r.post_id into v_post from public.crew_replies r where r.id = p_id and r.athlete_id = v_me;
  if v_post is null then raise exception 'crew:gone'; end if;
  delete from public.crew_replies where id = p_id and athlete_id = v_me;
  return jsonb_build_object('post', v_post, 'replies', public.crew_reply_rows(v_post, v_me));
end $function$;

-- Amir removes any of them, as he can remove any post.
create or replace function public.coach_crew_remove_reply(p_id uuid) returns boolean
language plpgsql security definer set search_path to 'public' as $function$
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  delete from public.crew_replies where id = p_id;
  return found;
end $function$;

revoke all on function public.crew_reply_rows(uuid, text) from public, anon, authenticated;
revoke all on function public.crew_reply(uuid, text) from public, anon, authenticated;
revoke all on function public.crew_reply_delete(uuid) from public, anon, authenticated;
revoke all on function public.coach_crew_remove_reply(uuid) from public, anon, authenticated;
grant execute on function public.crew_reply(uuid, text) to authenticated, service_role;
grant execute on function public.crew_reply_delete(uuid) to authenticated, service_role;
grant execute on function public.coach_crew_remove_reply(uuid) to authenticated, service_role;
grant execute on function public.crew_reply_rows(uuid, text) to service_role;

-- ── 3. The post written once, however slow the line ─────────────────────────────────────────────────────────────────────
-- The phone sends a key with the post; the same key twice is the same post. A unique index does the refusing, so two taps
-- racing each other cannot both insert, and the second gets the first one's id back rather than an error.
alter table public.crew_posts add column if not exists client_key uuid;
create unique index if not exists crew_posts_client_uq on public.crew_posts (athlete_id, client_key) where client_key is not null;

-- The old shapes go FIRST. Both gain one argument with a default, so for a moment both overloads would exist and a call
-- with the old number of arguments would be refused as ambiguous ("function is not unique") rather than resolved.
-- plpgsql looks its calls up when they run, so nothing is broken in between.
drop function if exists public.crew_post(text, text, integer, integer, text, jsonb);
drop function if exists public.crew_write_post(text, text, text, integer, integer, text, jsonb, boolean);

create or replace function public.crew_write_post(p_who text, p_body text, p_photo text, p_w integer, p_h integer, p_kind text, p_session jsonb, p_capped boolean, p_key uuid default null)
returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_body text := public.crew_clean(p_body); v_kind text := coalesce(nullif(btrim(coalesce(p_kind, '')), ''), 'post');
  v_bytes bytea; v_id uuid; v_ses jsonb := null; v_seen uuid;
begin
  -- The same key again is the same post: hand back what was written the first time and write nothing (2026-10-20).
  if p_key is not null then
    select cp.id into v_seen from public.crew_posts cp where cp.athlete_id = p_who and cp.client_key = p_key;
    if v_seen is not null then return jsonb_build_object('id', v_seen, 'again', true); end if;
  end if;
  if char_length(v_body) > 280 then raise exception 'crew:too_long'; end if;
  if v_kind not in ('post', 'session') then raise exception 'crew:kind'; end if;
  if nullif(btrim(coalesce(p_photo, '')), '') is not null then
    begin
      v_bytes := decode(regexp_replace(regexp_replace(p_photo, '^data:[^,]*,', ''), '\s', '', 'g'), 'base64');
    exception when others then
      raise exception 'crew:photo_bad';
    end;
    if octet_length(v_bytes) > 450000 then raise exception 'crew:photo_big'; end if;
    if octet_length(v_bytes) < 100 or substring(v_bytes from 1 for 3) <> '\xffd8ff'::bytea then raise exception 'crew:photo_bad'; end if;
  end if;
  if v_bytes is null and v_body = '' then raise exception 'crew:empty'; end if;
  if v_kind = 'session' and v_bytes is null then raise exception 'crew:session_photo'; end if;
  if v_kind = 'session' and p_session is not null and jsonb_typeof(p_session) = 'object' then
    v_ses := jsonb_strip_nulls(jsonb_build_object(
      'day', case when (p_session ->> 'day') ~ '^\d{1,2}$' then (p_session ->> 'day')::int end,
      'n', case when (p_session ->> 'n') ~ '^\d{1,4}$' then (p_session ->> 'n')::int end));
  end if;
  if p_capped then
    perform pg_advisory_xact_lock(hashtext('crew_post:' || p_who));
    -- the key again, now under the lock: the race this is here to stop is two taps a second apart
    if p_key is not null then
      select cp.id into v_seen from public.crew_posts cp where cp.athlete_id = p_who and cp.client_key = p_key;
      if v_seen is not null then return jsonb_build_object('id', v_seen, 'again', true); end if;
    end if;
    if (select count(*) from public.crew_posts cp where cp.athlete_id = p_who and cp.created_at >= date_trunc('day', now())) >= 10 then
      raise exception 'crew:posts_today';
    end if;
    if v_bytes is not null and (select count(*) from public.crew_photos ph where ph.athlete_id = p_who and ph.created_at >= date_trunc('day', now())) >= 3 then
      raise exception 'crew:photos_today';
    end if;
  end if;
  insert into public.crew_posts (athlete_id, kind, body, session, has_photo, client_key)
  values (p_who, v_kind, v_body, v_ses, v_bytes is not null, p_key) returning id into v_id;
  if v_bytes is not null then
    insert into public.crew_photos (post_id, athlete_id, w, h, bytes)
    values (v_id, p_who, case when p_w between 1 and 4000 then p_w end, case when p_h between 1 and 4000 then p_h end, v_bytes);
  end if;
  return jsonb_build_object('id', v_id);
end $function$;

create or replace function public.crew_post(p_body text, p_photo text default null, p_w integer default null, p_h integer default null,
                                            p_kind text default 'post', p_session jsonb default null, p_key uuid default null) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare v_me text := public.crew_who(); v_out jsonb;
begin
  if not exists (select 1 from public.crew_members() m where m.athlete_id = v_me) then
    raise exception 'crew:not_yes';
  end if;
  perform public.crew_sweep();
  v_out := public.crew_write_post(v_me, p_body, p_photo, p_w, p_h, p_kind, p_session, true, p_key);
  return v_out || jsonb_build_object('me', public.crew_me(v_me));
end $function$;

revoke all on function public.crew_post(text, text, integer, integer, text, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.crew_post(text, text, integer, integer, text, jsonb, uuid) to authenticated, service_role;
revoke all on function public.crew_write_post(text, text, text, integer, integer, text, jsonb, boolean, uuid) from public, anon, authenticated;
grant execute on function public.crew_write_post(text, text, text, integer, integer, text, jsonb, boolean, uuid) to service_role;

-- ── 4. get_bell(): each post carries its replies ────────────────────────────────────────────────────────────────────────
do $stage92_bell$
declare d text;
begin
  select pg_get_functiondef(p.oid) into d from pg_proc p
   where p.pronamespace = 'public'::regnamespace and p.proname = 'get_bell' and p.pronargs = 1;
  if d is null then raise exception 'stage92: get_bell(text) not found. Nothing was changed.'; end if;
  if position('crew_reply_rows' in d) > 0 then
    raise notice 'stage92: get_bell already carries the replies, left alone';
    return;
  end if;
  if position('''kudos'', public.crew_kudos_of(p.id, null, null, v_id)) as j' in d) = 0 then
    raise exception 'stage92: get_bell() does not look as expected (the post item''s kudos line was not found). Nothing was changed.';
  end if;
  d := replace(d,
    '''kudos'', public.crew_kudos_of(p.id, null, null, v_id)) as j',
    '''kudos'', public.crew_kudos_of(p.id, null, null, v_id), ''replies'', public.crew_reply_rows(p.id, v_id)) as j');
  execute d;
end
$stage92_bell$;

-- ── 5. coach_erase_person(): crew_replies joins the list it empties ─────────────────────────────────────────────────────
-- It must, and in this same stage: the function ends by scanning every public table with an athlete_id column and refusing
-- to erase anybody while rows are left behind, so a crew_replies that it did not know about would stop the next erasure.
-- First among the crew tables, so the count is the athlete's own replies and not whatever the cascade from their posts left.
do $stage92_erase$
declare d text;
begin
  select pg_get_functiondef(p.oid) into d from pg_proc p
   where p.pronamespace = 'public'::regnamespace and p.proname = 'coach_erase_person';
  if d is null then raise exception 'stage92: coach_erase_person() not found. Nothing was changed.'; end if;
  if position('''crew_replies''' in d) > 0 then
    raise notice 'stage92: coach_erase_person already knows crew_replies, left alone';
    return;
  end if;
  if position('''career_notes'', ''crew_kudos''' in d) = 0 then
    raise exception 'stage92: coach_erase_person()''s table list does not look as expected. Nothing was changed.';
  end if;
  d := replace(d, '''career_notes'', ''crew_kudos''', '''career_notes'', ''crew_replies'', ''crew_kudos''');
  execute d;
end
$stage92_erase$;

-- ── 6. What it must look like afterwards ────────────────────────────────────────────────────────────────────────────────
do $stage92_check$
begin
  if to_regprocedure('public.crew_reply(uuid,text)') is null then raise exception 'stage92: crew_reply() is missing'; end if;
  if to_regclass('public.crew_replies') is null then raise exception 'stage92: crew_replies is missing'; end if;
  if position('crew_reply_rows' in (select pg_get_functiondef(p.oid) from pg_proc p
       where p.pronamespace = 'public'::regnamespace and p.proname = 'get_bell' and p.pronargs = 1)) = 0 then
    raise exception 'stage92: get_bell() does not carry the replies';
  end if;
  if position('''crew_replies''' in (select pg_get_functiondef(p.oid) from pg_proc p
       where p.pronamespace = 'public'::regnamespace and p.proname = 'coach_erase_person')) = 0 then
    raise exception 'stage92: coach_erase_person() does not know crew_replies';
  end if;
  raise notice 'stage92: applied';
end
$stage92_check$;
