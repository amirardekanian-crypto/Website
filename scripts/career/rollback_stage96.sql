-- The way back from stage96 (the Players' Lounge: a page per crew member, faces, cheers, signatures, mentions, "your game", the aimed pushes).
-- On Amir's word only (CLAUDE.md: a change to the live project waits for his yes), after a backup (coach.html -> Tools -> Backup).
--
-- WHAT IS LOST. The faces, the cheers, the cheer tally (how many cheers each person has got), the signatures on achievements and the mentions exist nowhere else: they are not in any backup, on purpose
-- (SHORT_LIVED in scripts/restore/restore_backup.py). They go. Nothing else is lost: the game (athlete_profile, coaching data) is copied to
-- backup.athlete_profile_<yyyymmdd> first. Drop that copy within the privacy notice's three months, like every other backup copy.
--
-- WHAT IT DOES, in this order (each step safe to run twice, and each only undoes what stage96 did):
--   1. copies athlete_profile to the backup schema;
--   2. drops the six triggers (the three aimed pushes, the former-athlete door, the two cheer-tally counters);
--   3. deletes the queued cheer, reply and mention rows and puts the queue's kind check back to the eleven kinds it had;
--   4. takes the six tables and the three "to them" deletes out of coach_erase_person() (the same single-line anchors and chr(10) as the stage);
--   5. takes ck, fv, lv, held and new back out of get_bell() (the same five one-line anchors);
--   6. puts every other replaced function back to the live text stage96 started from (crew_board first dropped, because its columns changed);
--   7. drops the new functions, then the six tables.
-- Afterwards: take athlete_profile out of coach.html's BACKUP_TABLES and the five others out of restore_backup.py's SHORT_LIVED and
-- rehearse.mjs, and remake supabase/schema_snapshot.sql (scripts/restore/README.md), in one commit.
-- If stage97 is on too, take IT off first (scripts/career/rollback_stage97.sql): its crew_referral() is read by crew_page().
-- If stage86 and stage96 both come off, this goes FIRST (scripts/push/rollback_stage86.sql drops the queue this puts its check back on).

begin;

create schema if not exists backup;
do $rb96_copy$
declare v_day text := to_char(current_date, 'YYYYMMDD');
begin
  if to_regclass('public.athlete_profile') is not null then
    execute format('drop table if exists backup.%I', 'athlete_profile_' || v_day);
    execute format('create table backup.%I as select * from public.athlete_profile', 'athlete_profile_' || v_day);
  end if;
end $rb96_copy$;

-- 2. the triggers, before the functions they call
drop trigger if exists crew_push_cheer on public.crew_cheers;
drop trigger if exists crew_push_reply on public.crew_replies;
drop trigger if exists crew_push_mention on public.crew_mentions;
drop trigger if exists crew_forget_former on public.athlete_status;
drop trigger if exists crew_tally_cheer on public.crew_cheers;
drop trigger if exists crew_tally_kudos on public.crew_kudos;

-- 3. the queue: nothing of the new kinds can be left behind a check that does not know them
delete from public.crew_push_q where kind in ('cheer', 'reply', 'mention');
alter table public.crew_push_q drop constraint if exists crew_push_q_kind_check;
alter table public.crew_push_q add constraint crew_push_q_kind_check
  check (kind in ('post', 'kudos', 'level', 'week', 'mark', 'achievement', 'best', 'cycle', 'honour', 'open', 'joined'));

-- 4. coach_erase_person() back to what it was before stage96
do $rb96_erase$
declare
  d text := pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure);
  s_new constant text := '''athlete_profile'', ''crew_mentions'', ''crew_replies'', ''crew_award_likes'', ''crew_cheers'', ''crew_faces'', ''crew_cheer_tally'', ''crew_kudos''';
  s_old constant text := '''crew_replies'', ''crew_kudos''';
  -- Exactly what stage96 inserted (without the comment line it was put before), built from chr(10) the same way, so neither can drift with the line
  -- endings of the file it is run from.
  a_new constant text := concat_ws(chr(10),
    '      -- stage96: what others did TO this person (the loop above deleted what they did): cheers to them, names signed on their achievements, mentions of them.',
    '      delete from public.crew_cheers where to_athlete = v_key;',
    '      get diagnostics v_n = row_count;',
    '      v_counts := v_counts || jsonb_build_object(''crew_cheers (to them)'', v_n);',
    '      v_total := v_total + v_n;',
    '      delete from public.crew_award_likes where to_athlete = v_key;',
    '      get diagnostics v_n = row_count;',
    '      v_counts := v_counts || jsonb_build_object(''crew_award_likes (to them)'', v_n);',
    '      v_total := v_total + v_n;',
    '      delete from public.crew_mentions where to_athlete = v_key;',
    '      get diagnostics v_n = row_count;',
    '      v_counts := v_counts || jsonb_build_object(''crew_mentions (to them)'', v_n);',
    '      v_total := v_total + v_n;',
    '', '');
begin
  if position(s_new in d) > 0 or position(a_new in d) > 0 then
    execute replace(replace(d, s_new, s_old), a_new, '');
  end if;
end $rb96_erase$;

-- 5. get_bell() without ck, fv, lv, held, new and the lounge mark
do $rb96_bell$
declare
  d text := pg_get_functiondef('public.get_bell(text)'::regprocedure);
  a text[] := array[
    $a1$'kudos', public.crew_kudos_of(p.id, null, null, v_id), 'replies', public.crew_reply_rows(p.id, v_id)) || case when m.athlete_id is not null then jsonb_build_object('ck', m.crew_key, 'fv', public.crew_face_v(m.athlete_id)) else '{}'::jsonb end as j$a1$,
    $a2$'kudos', public.crew_kudos_of(null, l.athlete_id, l.d, v_id), 'fv', public.crew_face_v(l.athlete_id)) as j$a2$,
    $a3$'value', h.value - 'slot', 'ck', m.crew_key) order by h.honour, m.name)$a3$,
    $a4$'since', (m.first_yes_at at time zone 'UTC')::date, 'ck', m.crew_key, 'fv', public.crew_face_v(m.athlete_id)) || public.crew_extra(m.athlete_id, m.kinds, m.yes_since, m.first_yes_at, v_id)$a4$,
    $a5$'week', v_week, 'crew', v_crew, 'lounge', 1, 'at', now());$a5$];
  b text[] := array[
    $b1$'kudos', public.crew_kudos_of(p.id, null, null, v_id), 'replies', public.crew_reply_rows(p.id, v_id)) as j$b1$,
    $b2$'kudos', public.crew_kudos_of(null, l.athlete_id, l.d, v_id)) as j$b2$,
    $b3$'value', h.value - 'slot') order by h.honour, m.name)$b3$,
    $b4$'since', (m.first_yes_at at time zone 'UTC')::date)$b4$,
    $b5$'week', v_week, 'crew', v_crew, 'at', now());$b5$];
  i integer; n integer;
begin
  if position('crew_face_v' in d) = 0 then
    return;   -- never patched, or already put back
  end if;
  for i in 1 .. array_length(a, 1) loop
    n := (length(d) - length(replace(d, a[i], ''))) / length(a[i]);
    if n <> 1 then
      raise exception 'rollback stage96: get_bell() is not what this expects (piece % found % times, not once). Nothing was changed.', i, n;
    end if;
  end loop;
  for i in 1 .. array_length(a, 1) loop
    d := replace(d, a[i], b[i]);
  end loop;
  execute d;
end $rb96_bell$;

-- 6. the other replaced functions, back to the live text. Each only if it still carries stage96's mark.
do $rb96_fns$
declare d text;
begin

  d := pg_get_functiondef(to_regprocedure('public.crew_me(text)'));
  if d is not null and position('stage96' in d) > 0 then
    execute $old$CREATE OR REPLACE FUNCTION public.crew_me(p_id text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select case when p_id is null then null else jsonb_build_object(
    'answer', c.answer,
    'kinds', (select jsonb_object_agg(k.kind, coalesce((c.kinds ->> k.kind)::boolean, true)) from unnest(public.crew_kind_list()) k(kind)),
    'name', coalesce((select nullif(btrim(o.display_name), '') from public.leaderboard_optin o where o.athlete_id = p_id), c.name, public.crew_default_name(p_id)),
    'on_board', exists (select 1 from public.leaderboard_optin o where o.athlete_id = p_id),
    'under13', coalesce(c.under13, false),
    'can_post', coalesce(c.answer = 'yes' and not c.under13, false) and p_id <> 'demo'
                and not exists (select 1 from public.athlete_status s where s.athlete_id = p_id and s.status = 'former'),
    'photos_left', greatest(0, 3 - (select count(*) from public.crew_photos ph where ph.athlete_id = p_id and ph.created_at >= date_trunc('day', now()))),
    'posts_left', greatest(0, 10 - (select count(*) from public.crew_posts cp where cp.athlete_id = p_id and cp.created_at >= date_trunc('day', now()))))
  end
  from (select 1) one left join public.crew_consent c on c.athlete_id = p_id
$function$$old$;
  end if;

  d := pg_get_functiondef(to_regprocedure('public.crew_reply_rows(uuid,text)'));
  if d is not null and position('stage96' in d) > 0 then
    execute $old$CREATE OR REPLACE FUNCTION public.crew_reply_rows(p_post uuid, p_viewer text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
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
$function$$old$;
  end if;

  d := pg_get_functiondef(to_regprocedure('public.crew_open_now(text)'));
  if d is not null and position('stage96' in d) > 0 then
    execute $old$CREATE OR REPLACE FUNCTION public.crew_open_now(p_viewer text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare o record; v_rows jsonb; v_me jsonb;
begin
  select * into o from public.crew_open where closed_at is null order by created_at desc limit 1;
  if not found then return null; end if;

  with mem as (select * from public.crew_members()),
  r as (
    select res.athlete_id, res.value, res.day, m.name
      from public.crew_open_results res join mem m on m.athlete_id = res.athlete_id
     where res.open_id = o.id),
  ranked as (
    select r.*, rank() over (order by case when o.better = 'low' then r.value else -r.value end) as place from r)
  select coalesce(jsonb_agg(jsonb_build_object('who', ranked.name, 'value', ranked.value, 'place', ranked.place,
                                               'me', ranked.athlete_id is not distinct from p_viewer)
                            order by ranked.place, ranked.name), '[]'::jsonb)
    into v_rows from ranked;

  select jsonb_build_object('value', res.value, 'day', res.day) into v_me
    from public.crew_open_results res where res.open_id = o.id and res.athlete_id is not distinct from p_viewer;

  return jsonb_build_object('id', o.id, 'title', o.title, 'how', o.how, 'unit', o.unit, 'better', o.better,
                            'opened_on', o.opened_on, 'board', v_rows, 'mine', v_me);
end $function$$old$;
  end if;

  d := pg_get_functiondef(to_regprocedure('public.crew_kudos(text,boolean,text)'));
  if d is not null and position('stage96' in d) > 0 then
    execute $old$CREATE OR REPLACE FUNCTION public.crew_kudos(p_target text, p_on boolean DEFAULT true, p_emoji text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me text := public.crew_who(); v_t text := btrim(coalesce(p_target, '')); v_post uuid; v_to text; v_day date; v_author text;
  v_em text := nullif(btrim(coalesce(p_emoji, '')), '');
begin
  if not exists (select 1 from public.crew_members() m where m.athlete_id = v_me) then raise exception 'crew:not_yes'; end if;
  if v_em is not null and not (v_em = any (public.crew_emoji_list())) then raise exception 'crew:emoji'; end if;
  if v_t ~ '^[0-9a-f-]{36}$' then
    v_post := v_t::uuid;
    select p.athlete_id into v_author from public.crew_posts p
     where p.id = v_post and p.created_at >= now() - interval '7 days'
       and (p.athlete_id = public.coach_note_id() or exists (select 1 from public.crew_members() m where m.athlete_id = p.athlete_id));
    if v_author is null then raise exception 'crew:gone'; end if;
    if v_author = v_me then raise exception 'crew:own'; end if;
    if p_on then
      insert into public.crew_kudos (athlete_id, post_id, emoji) values (v_me, v_post, v_em)
      on conflict (athlete_id, post_id) where post_id is not null
      do update set emoji = excluded.emoji, created_at = now();
    else
      delete from public.crew_kudos k where k.athlete_id = v_me and k.post_id = v_post;
    end if;
    return public.crew_kudos_of(v_post, null, null, v_me);
  end if;
  if v_t !~ '^[0-9a-f-]{36}:\d{4}-\d{2}-\d{2}$' then raise exception 'crew:target'; end if;
  begin
    v_day := split_part(v_t, ':', 2)::date;
  exception when others then raise exception 'crew:target';
  end;
  select m.athlete_id into v_to from public.crew_members() m where m.crew_key = split_part(v_t, ':', 1)::uuid;
  if v_to is null or v_day < current_date - 7 or v_day > current_date + 1 then raise exception 'crew:gone'; end if;
  if v_to = v_me then raise exception 'crew:own'; end if;
  if p_on then
    insert into public.crew_kudos (athlete_id, to_athlete, line_day, emoji) values (v_me, v_to, v_day, v_em)
    on conflict (athlete_id, to_athlete, line_day) where to_athlete is not null
    do update set emoji = excluded.emoji, created_at = now();
  else
    delete from public.crew_kudos k where k.athlete_id = v_me and k.to_athlete = v_to and k.line_day = v_day;
  end if;
  return public.crew_kudos_of(null, v_to, v_day, v_me);
end $function$$old$;
  end if;

  d := pg_get_functiondef(to_regprocedure('public.crew_reply(uuid,text)'));
  if d is not null and position('stage96' in d) > 0 then
    execute $old$CREATE OR REPLACE FUNCTION public.crew_reply(p_post uuid, p_body text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  -- Two caps under one lock, so two taps cannot both pass: what one athlete may say in a day, and how long one post's
  -- thread may get (everybody's, so a thread cannot be driven past reading length).
  perform pg_advisory_xact_lock(hashtext('crew_reply:' || v_me));
  if (select count(*) from public.crew_replies r where r.athlete_id = v_me and r.created_at >= date_trunc('day', now())) >= 30 then
    raise exception 'crew:replies_today';
  end if;
  if (select count(*) from public.crew_replies r where r.post_id = p_post) >= 50 then
    raise exception 'crew:replies_full';
  end if;
  insert into public.crew_replies (post_id, athlete_id, body) values (p_post, v_me, v_body);
  return jsonb_build_object('post', p_post, 'replies', public.crew_reply_rows(p_post, v_me));
end $function$$old$;
  end if;

  d := pg_get_functiondef(to_regprocedure('public.crew_answer(text,text)'));
  if d is not null and position('stage96' in d) > 0 then
    execute $old$CREATE OR REPLACE FUNCTION public.crew_answer(p_answer text, p_name text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_me text := public.crew_who(); v_ans text := lower(btrim(coalesce(p_answer, ''))); v_name text := left(public.crew_clean(p_name), 24);
begin
  if v_ans not in ('yes', 'no') then raise exception 'crew:answer'; end if;
  insert into public.crew_consent as c (athlete_id, answer, name, answered_at, first_yes_at, yes_since, updated_at)
  values (v_me, v_ans, nullif(v_name, ''), now(), case when v_ans = 'yes' then now() end, case when v_ans = 'yes' then now() end, now())
  on conflict (athlete_id) do update
     set answer = excluded.answer,
         name = coalesce(excluded.name, c.name),
         answered_at = now(),
         first_yes_at = coalesce(c.first_yes_at, excluded.first_yes_at),
         yes_since = case when excluded.answer = 'yes' then case when c.answer = 'yes' then c.yes_since else now() end else null end,
         updated_at = now();
  if v_ans = 'no' then
    delete from public.crew_posts where athlete_id = v_me;
    delete from public.crew_kudos where athlete_id = v_me;
    delete from public.crew_rings where athlete_id = v_me;
  end if;
  return public.crew_me(v_me);
end $function$$old$;
  end if;

  d := pg_get_functiondef(to_regprocedure('public.coach_crew_under13(text,boolean)'));
  if d is not null and position('stage96' in d) > 0 then
    execute $old$CREATE OR REPLACE FUNCTION public.coach_crew_under13(p_athlete text, p_on boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  if nullif(btrim(coalesce(p_athlete, '')), '') is null or p_on is null then raise exception 'crew:who'; end if;
  if not exists (select 1 from public.programs p where p.athlete_id = p_athlete) then raise exception 'crew:who'; end if;
  insert into public.crew_consent as c (athlete_id, under13) values (p_athlete, p_on)
  on conflict (athlete_id) do update set under13 = excluded.under13, updated_at = now();
  if p_on then
    delete from public.crew_posts where athlete_id = p_athlete;
    delete from public.crew_kudos where athlete_id = p_athlete;
    delete from public.crew_rings where athlete_id = p_athlete;
  end if;
  return p_on;
end $function$$old$;
  end if;

  d := pg_get_functiondef(to_regprocedure('public.crew_sweep()'));
  if d is not null and position('stage96' in d) > 0 then
    execute $old$CREATE OR REPLACE FUNCTION public.crew_sweep()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_n integer := 0; k integer;
begin
  delete from public.crew_posts where created_at < now() - interval '7 days';
  get diagnostics k = row_count; v_n := v_n + k;
  delete from public.crew_kudos where to_athlete is not null and line_day < current_date - 7;
  get diagnostics k = row_count; v_n := v_n + k;
  delete from public.crew_rings where created_at < now() - interval '8 days';
  get diagnostics k = row_count; v_n := v_n + k;
  return v_n;
end $function$$old$;
  end if;

  d := pg_get_functiondef(to_regprocedure('public.crew_write_post(text,text,text,integer,integer,text,jsonb,boolean,uuid)'));
  if d is not null and position('stage96' in d) > 0 then
    execute $old$CREATE OR REPLACE FUNCTION public.crew_write_post(p_who text, p_body text, p_photo text, p_w integer, p_h integer, p_kind text, p_session jsonb, p_capped boolean, p_key uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_body text := public.crew_clean(p_body); v_kind text := coalesce(nullif(btrim(coalesce(p_kind, '')), ''), 'post');
  v_bytes bytea; v_id uuid; v_ses jsonb := null; v_seen uuid;
begin
  -- The same key again is the same post: hand back what was written the first time and write nothing.
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
end $function$$old$;
  end if;

  d := pg_get_functiondef(to_regprocedure('public.crew_push_fold(timestamptz)'));
  if d is not null and position('stage96' in d) > 0 then
    execute $old$CREATE OR REPLACE FUNCTION public.crew_push_fold(p_now timestamp with time zone DEFAULT now())
 RETURNS TABLE(athlete_id text, endpoint text, p256dh text, auth text, lang text, day date, n integer, one_kind text, one_who text, one_mine boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with phone as (
    select s.endpoint, s.p256dh, s.auth, s.athlete_id, s.lang, s.kinds,
           public.push_local(p_now, s.tz_offset)::date as local_day,
           extract(hour from public.push_local(p_now, s.tz_offset))::int as local_hour
      from public.push_subs s
     where s.fails < 5
  ),
  -- Awake where they are: 08:00 to 21:59 local, so nothing lands after ten at night or before eight
  -- in the morning. What happened overnight waits in the queue and arrives at eight.
  awake as (
    select p.* from phone p
     where p.local_hour between 8 and 21 and public.push_on(p.kinds, 'crew')
  ),
  -- Only a crew member is sent the crew. A no, an under-13, a former athlete and the demo are not
  -- crew_members(), and nothing of theirs is in the Bell either.
  mine as (
    select a.*, m.crew_key
      from awake a join public.crew_members() m on m.athlete_id = a.athlete_id
  ),
  mark as (
    select mi.*, coalesce(sn.upto, (select min(s2.created_at) from public.push_subs s2 where s2.athlete_id = mi.athlete_id)) as upto
      from mine mi left join public.crew_push_seen sn on sn.athlete_id = mi.athlete_id
  ),
  -- What each of them has not been told about: never their own doing, never older than the Bell's own
  -- seven days, never a kind the subject switched off, and only while the subject is still in the crew
  -- (so a no today takes yesterday's queued moments with it, exactly as it takes them off the Bell).
  ev as (
    select mk.athlete_id as to_id, mk.endpoint, mk.p256dh, mk.auth, mk.lang, mk.local_day,
           q.created_at, q.kind,
           case when q.athlete_id = public.coach_note_id() then 'Amir' else d.name end as by_name,
           (q.target_key is not null and q.target_key = mk.crew_key) as to_me
      from mark mk
      join public.crew_push_q q
        on q.created_at > coalesce(mk.upto, q.created_at - interval '1 second')
       and q.athlete_id <> mk.athlete_id
      left join public.crew_members() d on d.athlete_id = q.athlete_id
     where q.created_at >= p_now - interval '7 days'
       and (d.athlete_id is not null or q.athlete_id = public.coach_note_id())
       and (q.kind not in ('level', 'week', 'mark', 'achievement', 'best', 'cycle', 'honour', 'open')
            or coalesce((d.kinds ->> q.kind)::boolean, true))
  ),
  -- Folded: one notification per athlete. When it is the only thing, it is named; when it is six, it
  -- is counted. The newest one is the one that gets named — which no answer depends on today, because
  -- a folded notification names nobody; it is here so that changing the folded words later needs no
  -- new thinking about which event they would be about.
  fold as (
    select e.to_id, e.endpoint, e.p256dh, e.auth, e.lang, e.local_day, count(*)::int as n,
           (array_agg(e.kind order by e.created_at desc))[1] as one_kind,
           (array_agg(coalesce(e.by_name, 'Someone') order by e.created_at desc))[1] as one_who,
           (array_agg(e.to_me order by e.created_at desc))[1] as one_mine
      from ev e
     group by e.to_id, e.endpoint, e.p256dh, e.auth, e.lang, e.local_day
  )
  select f.to_id, f.endpoint, f.p256dh, f.auth, f.lang, f.local_day, f.n, f.one_kind, f.one_who, f.one_mine
    from fold f
$function$$old$;
  end if;

  d := pg_get_functiondef(to_regprocedure('public.crew_push_words(integer,text,text,boolean,text)'));
  if d is not null and position('stage96' in d) > 0 then
    execute $old$CREATE OR REPLACE FUNCTION public.crew_push_words(p_n integer, p_kind text, p_who text, p_mine boolean, p_lang text)
 RETURNS TABLE(title text, body text)
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  with l as (select case when p_lang = 'fa' then 'fa' else 'en' end as lang),
  -- more than one thing to tell them: the count, and nothing about who or what
  many as (
    select case when l.lang = 'fa' then 'تو تیم خبر هست' else 'The crew has been busy' end as title,
           case when l.lang = 'fa' then translate(p_n::text, '0123456789', '۰۱۲۳۴۵۶۷۸۹') || ' چیز تازه.'
                else p_n::text || ' new things to see.' end as body
      from l),
  -- exactly one: who, and which kind of thing
  one as (
    select case when l.lang = 'fa' then coalesce(w.fa, 'یه خبر تو تیم') else coalesce(w.en, 'Something in the crew') end as title,
           case when l.lang = 'fa' then 'یه سر بزن.' else 'Have a look.' end as body
      from l
      left join (values
        ('post',        p_who || ' posted',                 p_who || ' پست گذاشت'),
        ('kudos_you',   p_who || ' cheered you',            p_who || ' برات دست زد'),
        ('kudos',       p_who || ' gave a cheer',           p_who || ' یه دست زد'),
        ('level',       p_who || ' reached a new level',    p_who || ' سطحش رفت بالا'),
        ('week',        p_who || ' held their week',        p_who || ' هفته‌شو کامل کرد'),
        ('mark',        p_who || ' hit a new mark',         p_who || ' یه دستاورد گرفت'),
        ('achievement', p_who || ' earned an achievement',  p_who || ' یه دستاورد گرفت'),
        ('best',        p_who || ' set a personal best',    p_who || ' رکورد زد'),
        ('cycle',       p_who || ' finished a cycle',       p_who || ' یه دوره تموم کرد'),
        ('honour',      p_who || ' took an honour',         p_who || ' یه افتخار برد'),
        ('open',        p_who || ' played the Monthly Open', p_who || ' تو مسابقهٔ ماه بازی کرد'),
        ('joined',      p_who || ' joined the crew',        p_who || ' اومد تو تیم')
      ) as w(k, en, fa)
        on w.k = case when p_kind = 'kudos' and coalesce(p_mine, false) then 'kudos_you' else p_kind end)
  select title, body from many where p_n > 1
  union all
  select title, body from one where p_n <= 1
$function$$old$;
  end if;

  d := pg_get_functiondef(to_regprocedure('public.crew_push_due(timestamptz,boolean)'));
  if d is not null and position('stage96' in d) > 0 then
    execute $old$CREATE OR REPLACE FUNCTION public.crew_push_due(p_now timestamp with time zone DEFAULT now(), p_mark boolean DEFAULT true)
 RETURNS TABLE(endpoint text, p256dh text, auth text, athlete_id text, kind text, title text, body text, tag text, ttl integer, day date)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- ⚠️ This function RETURNS a column called athlete_id, so inside it a bare `athlete_id` is both an
-- output parameter and a column of crew_push_seen, and the insert below (its column list and its
-- `on conflict`) is refused as ambiguous. The column is what is meant everywhere here. (The rehearsal
-- found this: it is an error on every call, not a wrong answer, so nothing could have shipped — but
-- the names have to stay as they are, because they are the shape push_due() already answers in and
-- the sender reads.)
#variable_conflict use_column
begin
  perform public.crew_push_sweep();

  -- The cutoff this send is covering. Written before a single push leaves, so an event that arrives
  -- while the sender is working is kept for the next tick rather than stepped over.
  if coalesce(p_mark, true) then
    insert into public.crew_push_seen (athlete_id, pending, at)
    select f.athlete_id, p_now, now() from public.crew_push_fold(p_now) f
    on conflict (athlete_id) do update set pending = p_now, at = now();
  end if;

  return query
    select f.endpoint, f.p256dh, f.auth, f.athlete_id, 'crew'::text,
           w.title, w.body, 'crew'::text, 3600, f.day
      from public.crew_push_fold(p_now) f
      cross join lateral public.crew_push_words(f.n, f.one_kind, f.one_who, f.one_mine, f.lang) w;
end $function$$old$;
  end if;

  -- crew_board: its columns changed, so the new shape is dropped and the old one made again, with the doors it had
  d := pg_get_functiondef(to_regprocedure('public.crew_board(integer)'));
  if d is not null and position('stage96' in d) > 0 then
    drop function public.crew_board(integer);
    execute $old$CREATE OR REPLACE FUNCTION public.crew_board(p_limit integer DEFAULT 25)
 RETURNS TABLE(pos integer, who text, points bigint, level integer, is_me boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me text := public.current_athlete_id();
  v_coach boolean := public.is_coach();
  v_report boolean := coalesce(auth.jwt() ->> 'role', '') in ('', 'service_role');
begin
  if v_me is null and not (v_coach or v_report) then
    raise exception 'not signed in';
  end if;
  return query
  with mem as (select * from public.crew_members()),
  sc as (
    select s.athlete_id as aid, s.score
      from public.career_scores_for((select array_agg(m.athlete_id) from mem m), interval '2.5 seconds') s
  ),
  scored as (
    select m.athlete_id as aid, m.name,
           coalesce((sc.score #>> '{season,points}')::bigint, 0) as x,
           coalesce((sc.score #>> '{career,level}')::int, 1) as lv
      from mem m left join sc on sc.aid = m.athlete_id
  ),
  ranked as (
    select row_number() over (order by s.x desc, lower(s.name) asc) as rn, s.*
      from scored s
  )
  select r.rn::int, r.name, r.x, r.lv, (r.aid is not distinct from v_me)
    from ranked r
   where r.rn <= greatest(1, p_limit) or r.aid is not distinct from v_me
   order by r.rn;
end $function$$old$;
    revoke all on function public.crew_board(integer) from public, anon, authenticated;
    grant execute on function public.crew_board(integer) to authenticated, service_role;
  end if;
end $rb96_fns$;

-- 7. the new functions, then the six tables
drop function if exists public.crew_page(uuid, text);
drop function if exists public.crew_face_set(text, integer, integer);
drop function if exists public.crew_face_clear();
drop function if exists public.crew_faces_get(uuid[]);
drop function if exists public.coach_crew_faces();
drop function if exists public.coach_crew_face_clear(text);
drop function if exists public.my_game_set(jsonb);
drop function if exists public.crew_cheer(uuid, text);
drop function if exists public.coach_cheer(text, text);
drop function if exists public.coach_cheer_word_clear(bigint);
drop function if exists public.coach_crew_cheers();
drop function if exists public.crew_push_t_cheer();
drop function if exists public.crew_push_t_reply();
drop function if exists public.crew_push_t_mention();
drop function if exists public.crew_t_forget_former();
drop function if exists public.crew_forget(text);
drop function if exists public.crew_t_tally_cheer();
drop function if exists public.crew_t_tally_kudos();
drop function if exists public.crew_tally_up(text);
drop function if exists public.crew_tally_down(text);
drop function if exists public.crew_extra(text, jsonb, timestamptz, timestamptz, text);
drop function if exists public.crew_held_now(text, date);
drop function if exists public.crew_now_week(text);
drop function if exists public.crew_cheer_count(text);
drop function if exists public.crew_season_start(text);
drop function if exists public.crew_game_of(text);
drop function if exists public.crew_lv(text);
drop function if exists public.crew_face_v(text);

drop table if exists public.crew_cheer_tally;
drop table if exists public.crew_mentions;
drop table if exists public.crew_award_likes;
drop table if exists public.crew_cheers;
drop table if exists public.crew_faces;
drop table if exists public.athlete_profile;

commit;
