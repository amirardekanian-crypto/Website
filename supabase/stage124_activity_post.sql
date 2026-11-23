-- stage124_activity_post.sql — Court Told: an activity told to the crew, with its kind on the post (2026-11-22)
-- (Applied to the live project on 2026-11-22 under the migration name stage123_activity_post; renumbered 124 because
-- stage123_coach_doorbell took that number the same day. The marker inside crew_write_post() stays "stage123", as it is on the live project.)
--
-- Amir: "build 130 and 131, a cool thing would be to create an icon for people who played padel / tennis to be able to tell it apart from
-- training in the gym". #131 (round 12 'On the Move'): after an activity is added, Tell the crew posts it, and the post carries the
-- activity's kind and minutes so the feed can draw a court icon instead of the gym one.
--
-- What this does (guarded textual patches of crew_write_post(), as stage118 patched the crew functions; safe to re-run):
--   1. A plain post (kind 'post') may carry p_session = { act, mins }: act one of public.activity_kinds() (stage121), mins 1 to 600.
--      Anything else in it is dropped. Never how hard it was: effort stays between the athlete and Amir (stage118's rule).
--   2. A post with an activity on it may have no words and no photo: the activity is the content.
--   3. The table's check `crew_posts_something` (stage81: words or a photo) also accepts a plain post with an activity on it.
-- A session post (kind 'session') is unchanged: it still needs its photo. No new table or column, no grant, no backup or erase list
-- (crew_posts.session already exists and is already in all of them).

do $stage123_guard$
begin
  if to_regprocedure('public.crew_write_post(text,text,text,integer,integer,text,jsonb,boolean,uuid)') is null
     or to_regprocedure('public.activity_kinds()') is null then
    raise exception 'stage123: crew_write_post() or activity_kinds() (stage121) is missing. Nothing was changed.';
  end if;
end $stage123_guard$;

-- 2b. the table's own rule says the same: words, a photo, or (now) the activity it tells
alter table public.crew_posts drop constraint if exists crew_posts_something;
alter table public.crew_posts add constraint crew_posts_something
  check (char_length(btrim(body)) > 0 or has_photo or (kind = 'post' and jsonb_typeof(session) = 'object' and session ? 'act'));

do $stage123_patch$
declare p record; d text; n int;
begin
  for p in select * from (values
    -- 1. the activity on a plain post, worked out before the empty check below needs it
    ($a$  if v_bytes is null and v_body = '' then raise exception 'crew:empty'; end if;$a$,
     $a$  -- stage123: a plain post may carry the activity it tells (Court Told): its kind and minutes, nothing else
  if v_kind = 'post' and jsonb_typeof(p_session) = 'object' and (p_session ->> 'act') = any (public.activity_kinds()) then
    v_ses := jsonb_strip_nulls(jsonb_build_object(
      'act', p_session ->> 'act',
      'mins', case when (p_session ->> 'mins') ~ '^\d{1,3}$' and (p_session ->> 'mins')::int between 1 and 600 then (p_session ->> 'mins')::int end));
  end if;
  if v_bytes is null and v_body = '' and v_ses is null then raise exception 'crew:empty'; end if;$a$)
  ) v(s_old, s_new)
  loop
    d := pg_get_functiondef('public.crew_write_post(text,text,text,integer,integer,text,jsonb,boolean,uuid)'::regprocedure);
    if position('stage123' in d) > 0 then continue; end if;   -- already patched (a re-run)
    n := (length(d) - length(replace(d, p.s_old, ''))) / length(p.s_old);
    if n <> 1 then
      raise exception 'stage123: crew_write_post() is not what this patch expects (its line found % times, not once). Nothing was changed.', n;
    end if;
    execute replace(d, p.s_old, p.s_new);
  end loop;
end $stage123_patch$;

do $stage123_check$
begin
  if position('stage123' in pg_get_functiondef('public.crew_write_post(text,text,text,integer,integer,text,jsonb,boolean,uuid)'::regprocedure)) = 0 then
    raise exception 'stage123: crew_write_post() is not the new text';
  end if;
  raise notice 'stage123: applied';
end
$stage123_check$;
