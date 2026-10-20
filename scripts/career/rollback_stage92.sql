-- The way back from stage92 (the crew's replies, and the key that stops a post being written twice). On Amir's word only.
--
-- ⚠️ THIS LOSES THE REPLIES. They are 7-day rows and exist nowhere else: they are not in any backup, on purpose
-- (SHORT_LIVED in scripts/restore/restore_backup.py). Nothing else is lost.
--
-- Safe to run twice. It puts get_bell() and coach_erase_person() back by the same patch-in-place method stage92 used, so
-- neither one's other changes are disturbed.

-- 1. get_bell(): take the replies back off the post item.
do $rb92_bell$
declare d text;
begin
  select pg_get_functiondef(p.oid) into d from pg_proc p
   where p.pronamespace = 'public'::regnamespace and p.proname = 'get_bell' and p.pronargs = 1;
  if d is null then raise exception 'rollback stage92: get_bell(text) not found. Nothing was changed.'; end if;
  if position('crew_reply_rows' in d) = 0 then
    raise notice 'rollback stage92: get_bell does not carry the replies, left alone';
  else
    d := replace(d,
      ', ''replies'', public.crew_reply_rows(p.id, v_id)) as j',
      ') as j');
    execute d;
  end if;
end
$rb92_bell$;

-- 2. coach_erase_person(): take crew_replies out of the list, since the table is about to go.
do $rb92_erase$
declare d text;
begin
  select pg_get_functiondef(p.oid) into d from pg_proc p
   where p.pronamespace = 'public'::regnamespace and p.proname = 'coach_erase_person';
  if d is null then raise exception 'rollback stage92: coach_erase_person() not found. Nothing was changed.'; end if;
  if position('''crew_replies''' in d) = 0 then
    raise notice 'rollback stage92: coach_erase_person does not know crew_replies, left alone';
  else
    d := replace(d, '''career_notes'', ''crew_replies'', ''crew_kudos''', '''career_notes'', ''crew_kudos''');
    execute d;
  end if;
end
$rb92_erase$;

-- 3. The replies themselves.
drop function if exists public.crew_reply(uuid, text);
drop function if exists public.crew_reply_delete(uuid);
drop function if exists public.coach_crew_remove_reply(uuid);
drop function if exists public.crew_reply_rows(uuid, text);
drop table if exists public.crew_replies;

-- 4. The post key. The column and its index stay (they hold no personal data and cost nothing), but the two functions go
-- back to the shapes stage81 gave them, so a phone that still sends p_key gets "no such function" and the app falls back
-- to the version it was before. Drop the 9/7-argument shapes first, for the same ambiguity reason stage92 gave.
drop function if exists public.crew_post(text, text, integer, integer, text, jsonb, uuid);
drop function if exists public.crew_write_post(text, text, text, integer, integer, text, jsonb, boolean, uuid);

create or replace function public.crew_write_post(p_who text, p_body text, p_photo text, p_w integer, p_h integer, p_kind text, p_session jsonb, p_capped boolean)
returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_body text := public.crew_clean(p_body); v_kind text := coalesce(nullif(btrim(coalesce(p_kind, '')), ''), 'post');
  v_bytes bytea; v_id uuid; v_ses jsonb := null;
begin
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
    if (select count(*) from public.crew_posts cp where cp.athlete_id = p_who and cp.created_at >= date_trunc('day', now())) >= 10 then
      raise exception 'crew:posts_today';
    end if;
    if v_bytes is not null and (select count(*) from public.crew_photos ph where ph.athlete_id = p_who and ph.created_at >= date_trunc('day', now())) >= 3 then
      raise exception 'crew:photos_today';
    end if;
  end if;
  insert into public.crew_posts (athlete_id, kind, body, session, has_photo)
  values (p_who, v_kind, v_body, v_ses, v_bytes is not null) returning id into v_id;
  if v_bytes is not null then
    insert into public.crew_photos (post_id, athlete_id, w, h, bytes)
    values (v_id, p_who, case when p_w between 1 and 4000 then p_w end, case when p_h between 1 and 4000 then p_h end, v_bytes);
  end if;
  return jsonb_build_object('id', v_id);
end $function$;

create or replace function public.crew_post(p_body text, p_photo text default null, p_w integer default null, p_h integer default null,
                                            p_kind text default 'post', p_session jsonb default null) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare v_me text := public.crew_who(); v_out jsonb;
begin
  if not exists (select 1 from public.crew_members() m where m.athlete_id = v_me) then
    raise exception 'crew:not_yes';
  end if;
  perform public.crew_sweep();
  v_out := public.crew_write_post(v_me, p_body, p_photo, p_w, p_h, p_kind, p_session, true);
  return v_out || jsonb_build_object('me', public.crew_me(v_me));
end $function$;

revoke all on function public.crew_post(text, text, integer, integer, text, jsonb) from public, anon, authenticated;
grant execute on function public.crew_post(text, text, integer, integer, text, jsonb) to authenticated, service_role;
revoke all on function public.crew_write_post(text, text, text, integer, integer, text, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.crew_write_post(text, text, text, integer, integer, text, jsonb, boolean) to service_role;
