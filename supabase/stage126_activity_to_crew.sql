-- stage126_activity_to_crew.sql — every activity goes to the crew as it is saved, unless the athlete turns it off (2026-11-23)
--
-- Amir: "every activity needs to be sent to crew, unless they turn it off in their settings. but after adding something, you can add
-- images to it or write with it".
--
-- Until now an activity reached the crew only when the athlete tapped Tell the crew after saving it (Court Told, stage124), and the
-- What the crew sees switch `activity` (stage118) was OFF unless chosen. Now:
--   1. The switch is ON unless the athlete turned it off (crew_me(), crew_page()). An athlete who set it off keeps it off.
--   2. log_activity() tells the crew as it saves: a plain post carrying { act, mins } (stage124's activity post, the racket or the
--      sport's icon on the feed), keyed by the activity's own id (crew_posts.client_key), so a retry never posts twice and the phone
--      finds the post again from the activity alone. Only when the athlete saves it themself (never the coach), is in the crew and
--      may post, and has the switch on. If the post cannot be written (10 posts today, anything else) the activity is still saved:
--      the answer says told = false and the phone offers Tell the crew as before. Never how hard it was (stage118's rule).
--   3. activity_post_edit(p_activity, p_body, p_photo, p_w, p_h): words and a photo added to that post afterwards. The athlete's own
--      activity post only; new words take the place of the old ones (280 at most; none sent keeps the old), a photo is added or takes
--      the place of the one there (one per post, crew_photos' key), within the 3 photos a day. Neither is crew:empty.
--   4. delete_activity() takes the activity's post with it.
--   5. get_five_weeks()'s acts say told (a post for it is on the crew), so the day's sheet offers Add a photo or Tell the crew.
-- No new table or column: crew_posts and crew_photos are in BACKUP_TABLES, the snapshot and coach_erase_person() already.
-- Guarded textual patches, as stage118 and stage124 did; safe to re-run.

do $stage126_guard$
begin
  if to_regprocedure('public.crew_write_post(text,text,text,integer,integer,text,jsonb,boolean,uuid)') is null
     or to_regprocedure('public.log_activity(text,uuid,date,text,integer,text)') is null
     or to_regprocedure('public.get_five_weeks(text)') is null
     or position('stage122' in pg_get_functiondef('public.get_five_weeks(text)'::regprocedure)) = 0
     or position('stage123' in pg_get_functiondef('public.crew_write_post(text,text,text,integer,integer,text,jsonb,boolean,uuid)'::regprocedure)) = 0 then
    raise exception 'stage126: needs stage122 (get_five_weeks acts) and stage124 (activity posts). Nothing was changed.';
  end if;
end $stage126_guard$;

-- ── 2. The crew is told: one activity, one post ─────────────────────────────────────────────────────────────────────────────────
create or replace function public.activity_tell(p_row public.activity_log)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_me jsonb;
begin
  if p_row.id is null or p_row.athlete_id is distinct from public.current_athlete_id() or p_row.athlete_id = 'demo' then return false; end if;
  if exists (select 1 from public.crew_posts cp where cp.athlete_id = p_row.athlete_id and cp.client_key = p_row.id) then return true; end if;
  if not exists (select 1 from public.crew_members() m where m.athlete_id = p_row.athlete_id) then return false; end if;
  v_me := public.crew_me(p_row.athlete_id);
  if coalesce((v_me ->> 'can_post')::boolean, false) is not true or coalesce((v_me -> 'kinds' ->> 'activity')::boolean, true) is not true then
    return false;
  end if;
  begin
    perform public.crew_write_post(p_row.athlete_id, '', null, null, null, 'post',
                                   jsonb_build_object('act', p_row.kind, 'mins', p_row.minutes), true, p_row.id);
    return true;
  exception when others then
    raise warning 'stage126: the activity % of % was saved but not told to the crew: % (%)', p_row.id, p_row.athlete_id, sqlerrm, sqlstate;
    return false;
  end;
end
$function$;
revoke all on function public.activity_tell(public.activity_log) from public, anon, authenticated;

-- ── 3. Words and a photo on it afterwards ───────────────────────────────────────────────────────────────────────────────────────
create or replace function public.activity_post_edit(p_activity uuid, p_body text, p_photo text default null, p_w integer default null, p_h integer default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_me text := public.crew_who(); v_post uuid; v_bytes bytea;
  v_body text := case when nullif(btrim(coalesce(p_body, '')), '') is null then null else public.crew_clean(p_body) end;   -- no words: the old ones stay
begin
  if not exists (select 1 from public.crew_members() m where m.athlete_id = v_me) then raise exception 'crew:not_yes'; end if;
  select cp.id into v_post from public.crew_posts cp
   where cp.athlete_id = v_me and cp.client_key = p_activity and cp.kind = 'post' and jsonb_typeof(cp.session) = 'object' and cp.session ? 'act';
  if v_post is null then raise exception 'crew:gone'; end if;
  if char_length(coalesce(v_body, '')) > 280 then raise exception 'crew:too_long'; end if;
  if v_body is null and nullif(btrim(coalesce(p_photo, '')), '') is null then raise exception 'crew:empty'; end if;
  if nullif(btrim(coalesce(p_photo, '')), '') is not null then
    begin
      v_bytes := decode(regexp_replace(regexp_replace(p_photo, '^data:[^,]*,', ''), '\s', '', 'g'), 'base64');
    exception when others then
      raise exception 'crew:photo_bad';
    end;
    if octet_length(v_bytes) > 450000 then raise exception 'crew:photo_big'; end if;
    if octet_length(v_bytes) < 100 or substring(v_bytes from 1 for 3) <> '\xffd8ff'::bytea then raise exception 'crew:photo_bad'; end if;
    perform pg_advisory_xact_lock(hashtext('crew_post:' || v_me));
    if (select count(*) from public.crew_photos ph where ph.athlete_id = v_me and ph.post_id <> v_post and ph.created_at >= date_trunc('day', now())) >= 3 then
      raise exception 'crew:photos_today';
    end if;
    insert into public.crew_photos (post_id, athlete_id, w, h, bytes)
    values (v_post, v_me, case when p_w between 1 and 4000 then p_w end, case when p_h between 1 and 4000 then p_h end, v_bytes)
    on conflict (post_id) do update set w = excluded.w, h = excluded.h, bytes = excluded.bytes, created_at = now();
  end if;
  update public.crew_posts set body = coalesce(v_body, body), has_photo = has_photo or v_bytes is not null where id = v_post;
  return jsonb_build_object('id', v_post, 'me', public.crew_me(v_me));
end
$function$;
revoke all on function public.activity_post_edit(uuid, text, text, integer, integer) from public, anon;
grant execute on function public.activity_post_edit(uuid, text, text, integer, integer) to authenticated, service_role;

-- ── 1, 2, 4, 5. The patches ─────────────────────────────────────────────────────────────────────────────────────────────────────
do $stage126_patch$
declare p record; d text; n int;
begin
  for p in select * from (values
    -- 1. the switch is on unless turned off (crew_me once, crew_page twice)
    ('public.crew_me(text)', 1,
     $a$coalesce((c.kinds ->> 'activity')::boolean, false)),   -- stage118: off unless chosen$a$,
     $a$coalesce((c.kinds ->> 'activity')::boolean, true)),   -- stage126: on unless turned off (stage118 had it off unless chosen)$a$),
    ('public.crew_page(uuid,text)', 2,
     $a$coalesce((c.kinds ->> 'activity')::boolean, false)$a$,
     $a$coalesce((c.kinds ->> 'activity')::boolean, true)$a$),
    -- 2. log_activity tells the crew; a retry says whether it was told
    ('public.log_activity(text,uuid,date,text,integer,text)', 1,
     $a$    return to_jsonb(v_row);   -- a retry of a write that already landed$a$,
     $a$    return to_jsonb(v_row) || jsonb_build_object('told', public.activity_tell(v_row));   -- a retry of a write that already landed (stage126: told)$a$),
    ('public.log_activity(text,uuid,date,text,integer,text)', 1,
     $a$  returning * into v_row;
  return to_jsonb(v_row);$a$,
     $a$  returning * into v_row;
  return to_jsonb(v_row) || jsonb_build_object('told', public.activity_tell(v_row));   -- stage126: told to the crew as it is saved$a$),
    -- 4. the activity's post goes with it
    ('public.delete_activity(text,uuid)', 1,
     $a$  get diagnostics n = row_count;
  return n > 0;$a$,
     $a$  get diagnostics n = row_count;
  if n > 0 then   -- stage126: its post on the crew goes with it
    delete from public.crew_posts cp where cp.athlete_id = p_athlete_id and cp.client_key = p_id and cp.kind = 'post' and cp.session ? 'act';
  end if;
  return n > 0;$a$),
    -- 5. acts say told
    ('public.get_five_weeks(text)', 1,
     $a$jsonb_build_object('day', a.day, 'kind', a.kind, 'mins', a.minutes, 'effort', a.effort, 'id', a.id)$a$,
     $a$jsonb_build_object('day', a.day, 'kind', a.kind, 'mins', a.minutes, 'effort', a.effort, 'id', a.id,
                                                                 'told', exists (select 1 from public.crew_posts cp where cp.athlete_id = a.athlete_id and cp.client_key = a.id))   -- stage126$a$)
  ) v(fn, want, s_old, s_new)
  loop
    d := pg_get_functiondef(p.fn::regprocedure);
    if position(p.s_new in d) > 0 then continue; end if;   -- already patched (a re-run)
    n := (length(d) - length(replace(d, p.s_old, ''))) / length(p.s_old);
    if n <> p.want then
      raise exception 'stage126: % is not what this patch expects (its line found % times, not %). Nothing was changed.', p.fn, n, p.want;
    end if;
    d := replace(d, p.s_old, p.s_new);
    execute d;
  end loop;
end $stage126_patch$;

do $stage126_check$
begin
  if position('activity_tell' in pg_get_functiondef('public.log_activity(text,uuid,date,text,integer,text)'::regprocedure)) = 0
     or position('stage126' in pg_get_functiondef('public.delete_activity(text,uuid)'::regprocedure)) = 0
     or position('stage126' in pg_get_functiondef('public.get_five_weeks(text)'::regprocedure)) = 0
     or position($q$'activity')::boolean, false)$q$ in pg_get_functiondef('public.crew_me(text)'::regprocedure)) > 0
     or position($q$'activity')::boolean, false)$q$ in pg_get_functiondef('public.crew_page(uuid,text)'::regprocedure)) > 0 then
    raise exception 'stage126: a patch did not land';
  end if;
  raise notice 'stage126: applied';
end
$stage126_check$;
