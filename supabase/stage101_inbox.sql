-- stage101_inbox.sql — one Inbox for the whole app: what happened to you in the last 7 days (2026-10-25)
--
-- Amir, on the round 7 plan: "how about like a notification center? or an inbox? how people can find things quicker or in one place?", then
-- "90A" (the tray beside the initials) and "go live with all the build". Idea #90 in .claude/skills/ideas/BANK.md; 83's Cheer back lives in it.
--
-- What this does, and nothing else:
--   get_inbox(p_since) answers, for the signed-in athlete only, a list of what other people did TO them since p_since (at most 7 days back,
--   the Bell's own life): cheers sent to them, replies on their posts, replies that name them, likes on their posts and Bell lines (grouped
--   per post or day), likes on their achievements (grouped per award), people who joined the crew, and answers to their Mailbag questions
--   (stage102, when it is there). Every row says who (a crew member's name, face and crew key, or "Amir"), when, and what it points at, so
--   the app can open the thing. No new table, no write, no notification. A crew name reaches only people who said yes, as on the Bell.
--   Reading it costs nothing on the server's 7-day sweep: these are the same rows the Bell already shows.
--
-- Rehearsed on the live database inside a DO block that ended in `raise exception`. The way back: drop function public.get_inbox(timestamptz);
-- (scripts/career/rollback_stage101.sql). Safe to re-run this file.

CREATE OR REPLACE FUNCTION public.get_inbox(p_since timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- stage101 (idea #90): the signed-in athlete's own Inbox. Never anybody else's: there is no athlete argument.
declare
  v_me text := public.current_athlete_id();
  v_floor timestamptz := now() - interval '7 days';
  v_since timestamptz := greatest(coalesce(p_since, now() - interval '7 days'), now() - interval '7 days');
  v_coach text := public.coach_note_id();
  v_rows jsonb;
  v_q boolean := to_regclass('public.crew_questions') is not null;
  v_ans jsonb := '[]'::jsonb;
begin
  if v_me is null then raise exception 'not signed in'; end if;

  if v_q then
    execute $q$
      select coalesce(jsonb_agg(jsonb_build_object('k', 'answer', 'at', q.answered_at, 'who', 'Amir', 'amir', true,
                                                   'q', left(q.body, 120), 'post', q.answer_post) order by q.answered_at desc), '[]'::jsonb)
        from public.crew_questions q
       where q.athlete_id = $1 and q.answered_at is not null and q.answered_at >= $2 $q$
      into v_ans using v_me, v_floor;
  end if;

  with mem as (select * from public.crew_members()),
  who as (
    select m.athlete_id, m.name, m.crew_key, public.crew_face_v(m.athlete_id) as fv from mem m
  ),
  cheers as (
    select c.created_at as at, jsonb_build_object('k', 'cheer', 'at', c.created_at,
             'who', case when c.athlete_id = v_coach then 'Amir' else w.name end, 'amir', c.athlete_id = v_coach,
             'ck', w.crew_key, 'fv', w.fv, 'word', c.word,
             -- once a day each: whether a cheer back can still go today
             'back', c.athlete_id <> v_coach and w.crew_key is not null
                     and not exists (select 1 from public.crew_cheers b where b.athlete_id = v_me and b.to_athlete = c.athlete_id and b.day = current_date)) as j
      from public.crew_cheers c left join who w on w.athlete_id = c.athlete_id
     where c.to_athlete = v_me and c.athlete_id <> v_me and c.created_at >= v_floor
       and (c.athlete_id = v_coach or w.athlete_id is not null)),
  replies as (
    select r.created_at as at, jsonb_build_object('k', 'reply', 'at', r.created_at,
             'who', case when r.athlete_id = v_coach then 'Amir' else w.name end, 'amir', r.athlete_id = v_coach,
             'ck', w.crew_key, 'fv', w.fv, 'body', left(r.body, 90), 'post', r.post_id, 'reply', r.id) as j
      from public.crew_replies r join public.crew_posts p on p.id = r.post_id
      left join who w on w.athlete_id = r.athlete_id
     where p.athlete_id = v_me and r.athlete_id <> v_me and r.created_at >= v_floor
       and (r.athlete_id = v_coach or w.athlete_id is not null)),
  mentions as (
    select m.created_at as at, jsonb_build_object('k', 'mention', 'at', m.created_at,
             'who', case when m.athlete_id = v_coach then 'Amir' else w.name end, 'amir', m.athlete_id = v_coach,
             'ck', w.crew_key, 'fv', w.fv, 'body', left(r.body, 90), 'post', r.post_id, 'reply', r.id) as j
      from public.crew_mentions m join public.crew_replies r on r.id = m.reply_id
      join public.crew_posts p on p.id = r.post_id
      left join who w on w.athlete_id = m.athlete_id
     where m.to_athlete = v_me and m.athlete_id <> v_me and m.created_at >= v_floor
       and p.athlete_id <> v_me                         -- a reply on MY post that names me is already its reply row
       and (m.athlete_id = v_coach or w.athlete_id is not null)),
  likes as (
    select max(k.created_at) as at, jsonb_build_object('k', 'like', 'at', max(k.created_at), 'n', count(*),
             'who', to_jsonb((array_agg(case when k.athlete_id = v_coach then 'Amir' else w.name end order by k.created_at desc))[1:2]),
             'faces', coalesce(jsonb_agg(jsonb_build_object('ck', w.crew_key, 'fv', w.fv, 'who', w.name) order by k.created_at desc) filter (where w.crew_key is not null), '[]'::jsonb),
             'post', k.post_id, 'day', k.line_day,
             'body', (select left(p.body, 60) from public.crew_posts p where p.id = k.post_id)) as j
      from public.crew_kudos k left join who w on w.athlete_id = k.athlete_id
     where k.to_athlete = v_me and k.athlete_id <> v_me and k.created_at >= v_floor
       and (k.athlete_id = v_coach or w.athlete_id is not null)
     group by k.post_id, k.line_day),
  award_likes as (
    select max(a.created_at) as at, jsonb_build_object('k', 'award_like', 'at', max(a.created_at), 'n', count(*),
             'who', to_jsonb((array_agg(w.name order by a.created_at desc))[1:2]), 'award', a.award_id,
             -- an award_id is "<kind>:<catalogue id>", e.g. achievement:lights_out
             'name', (select c.body ->> 'name' from public.career_catalogue c
                       where c.kind = split_part(a.award_id, ':', 1) and c.id = split_part(a.award_id, ':', 2) limit 1)) as j
      from public.crew_award_likes a join who w on w.athlete_id = a.athlete_id
     where a.to_athlete = v_me and a.athlete_id <> v_me and a.created_at >= v_floor
     group by a.award_id),
  joins as (
    select m.first_yes_at as at, jsonb_build_object('k', 'join', 'at', m.first_yes_at, 'who', w.name, 'ck', w.crew_key, 'fv', w.fv) as j
      from mem m join who w on w.athlete_id = m.athlete_id
     where m.athlete_id <> v_me and m.first_yes_at >= v_floor)
  select coalesce(jsonb_agg(x.j order by x.at desc), '[]'::jsonb) into v_rows
    from (select at, j from cheers union all select at, j from replies union all select at, j from mentions
          union all select at, j from likes union all select at, j from award_likes union all select at, j from joins
          union all select (e ->> 'at')::timestamptz, e from jsonb_array_elements(v_ans) e
          order by 1 desc limit 60) x;

  return jsonb_build_object('since', v_since, 'rows', v_rows,
                            'new', (select count(*) from jsonb_array_elements(v_rows) r where (r ->> 'at')::timestamptz > v_since),
                            'at', now());
end $function$;

do $stage101_grants$
begin
  revoke all on function public.get_inbox(timestamptz) from public, anon;
  grant execute on function public.get_inbox(timestamptz) to authenticated, service_role;
end
$stage101_grants$;

do $stage101_check$
begin
  if to_regprocedure('public.get_inbox(timestamptz)') is null then raise exception 'stage101: get_inbox() is missing'; end if;
  raise notice 'stage101: applied';
end
$stage101_check$;
