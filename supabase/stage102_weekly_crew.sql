-- stage102_weekly_crew.sql — The Toss, Theme Week, the Mailbag and the Answer Book (2026-10-25)
--
-- Amir, on the round 7 plan: "85 amazing, add to coach html", "add 87 as well", "add 88 like 85, put it in coach html", then "go with your
-- picks" (the Toss card A, the photo on the Toss card C, the Mailbag on the Coach tab A, Proof becomes Crew in coach.html, the samples as my
-- picks, #91 The Answer Book) and "go live with all the build". Ideas #85, #87, #88, #91 in .claude/skills/ideas/BANK.md.
--
-- What this does:
--   1. crew_weeks: Amir's bank, one row a Monday: the week's this-or-that question and its two sides, and the week's photo theme. Seeded with
--      the 16 questions and 12 themes of the plan page (T1-T16, P1-P12; the racket-only ones last), from Monday 26 October 2026.
--   2. crew_toss_votes: who chose which side, one vote a week each, changeable. Only crew members vote (crew_members(): never a no, an
--      under-13, a former athlete or the demo), because a vote shows your face to the crew.
--   3. crew_questions: the Mailbag. An athlete with a programme asks Amir privately (200 characters, 3 a day); "You can use my first name" is
--      their yes to being named. Amir answers one for the crew: the answer goes out as his pinned post with the question quoted
--      (crew_posts.session = {"ask": {"q", "by"}}), and is kept on the question for the Answer Book (#91) after the post is swept.
--   4. Functions: crew_weekly() (this week, for get_bell), crew_vote(), crew_ask(), get_answer_book(); coach_crew_weekly(),
--      coach_crew_week_set(), coach_crew_week_close(), coach_question_answer(), coach_question_drop().
--   5. get_bell() answers `weekly` (crew_weekly): a guarded in-place patch of the stage100 text (md5 a5b3d5813dc5a405b7fc4396f8076066), one key added.
--   6. coach_erase_person() learns crew_toss_votes and crew_questions (both have athlete_id). All three tables go into BACKUP_TABLES and the
--      snapshot the same day (coach.html, schema_snapshot.sql). The coach can read all three (the backup), athletes only through the functions.
--
-- Nothing here pays XP (GAME-6) and nothing new rings a phone: an answer is Amir's post, which rings as his posts always have.
-- Rehearsed on the live database inside a DO block that ended in `raise exception`. The way back: scripts/career/rollback_stage102.sql.

-- ── 0. The guard ───────────────────────────────────────────────────────────
do $stage102_guard$
declare d text;
begin
  if to_regprocedure('public.get_bell(text)') is null or to_regprocedure('public.coach_erase_person(text,text,text,uuid[],boolean)') is null
     or to_regprocedure('public.crew_members()') is null then
    raise exception 'stage102: get_bell(), crew_members() or coach_erase_person() is missing. Nothing was changed.';
  end if;
  d := md5(replace(pg_get_functiondef('public.get_bell(text)'::regprocedure), chr(13), ''));
  if d <> 'a5b3d5813dc5a405b7fc4396f8076066' and position('stage102' in pg_get_functiondef('public.get_bell(text)'::regprocedure)) = 0 then
    raise exception 'stage102: get_bell() is not the stage100 text (md5 %). Nothing was changed.', d;
  end if;
end
$stage102_guard$;

-- ── 1. The tables ──────────────────────────────────────────────────────────
create table if not exists public.crew_weeks (
  week_start date primary key check (extract(isodow from week_start) = 1),
  toss_q text check (toss_q is null or char_length(btrim(toss_q)) between 1 and 80),
  toss_a text check (toss_a is null or char_length(btrim(toss_a)) between 1 and 30),
  toss_b text check (toss_b is null or char_length(btrim(toss_b)) between 1 and 30),
  theme text check (theme is null or char_length(btrim(theme)) between 1 and 60),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((toss_q is null) = (toss_a is null) and (toss_q is null) = (toss_b is null))
);
create table if not exists public.crew_toss_votes (
  week_start date not null references public.crew_weeks(week_start) on delete cascade,
  athlete_id text not null,
  side text not null check (side in ('a', 'b')),
  created_at timestamptz not null default now(),
  primary key (week_start, athlete_id)
);
create table if not exists public.crew_questions (
  id bigserial primary key,
  athlete_id text not null,
  body text not null check (char_length(btrim(body)) between 1 and 200),
  ok_name boolean not null default false,
  created_at timestamptz not null default now(),
  answer text check (answer is null or char_length(btrim(answer)) between 1 and 280),
  answered_at timestamptz,
  answer_post uuid
);
create index if not exists crew_questions_athlete on public.crew_questions (athlete_id, created_at desc);

alter table public.crew_weeks enable row level security;
alter table public.crew_toss_votes enable row level security;
alter table public.crew_questions enable row level security;
do $stage102_rls$
declare t text;
begin
  foreach t in array array['crew_weeks', 'crew_toss_votes', 'crew_questions'] loop
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant select on table public.%I to authenticated', t);
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'coach reads ' || t) then
      execute format('create policy %I on public.%I for select using ((select public.is_coach()))', 'coach reads ' || t, t);
    end if;
  end loop;
  grant usage, select on sequence public.crew_questions_id_seq to service_role;
end
$stage102_rls$;

-- ── 2. The bank, seeded (only weeks not already there) ─────────────────────
insert into public.crew_weeks (week_start, toss_q, toss_a, toss_b, theme) values
  (date '2026-10-26' + 0, 'Before a big day?', 'Pasta', 'Rice', 'Where you train'),
  (date '2026-10-26' + 7, 'When do you train best?', 'Morning', 'Evening', 'Your shoes after a session'),
  (date '2026-10-26' + 14, 'Where do you like to train?', 'Gym', 'Outdoors', 'What''s in your bag'),
  (date '2026-10-26' + 21, 'Music when you lift?', 'On', 'Off', 'The view from your court or your gym'),
  (date '2026-10-26' + 28, 'Which set is harder?', 'The first', 'The last', 'Your meal after training'),
  (date '2026-10-26' + 35, 'Rest day?', 'Full rest', 'A long walk', 'Your rest-day walk'),
  (date '2026-10-26' + 42, 'Coffee before training?', 'Yes', 'No', 'The one thing you can''t train without'),
  (date '2026-10-26' + 49, 'Squat or deadlift?', 'Squat', 'Deadlift', 'Your spot before anyone else arrives'),
  (date '2026-10-26' + 56, 'Train alone or with a friend?', 'Alone', 'With a friend', 'Your finished card in the app'),
  (date '2026-10-26' + 63, 'Which day do you like more?', 'Lower body', 'Upper body', 'A session at sunrise or sunset'),
  (date '2026-10-26' + 70, 'Protein?', 'A shake', 'Real food', 'Your water bottle, wherever it has been'),
  (date '2026-10-26' + 77, 'Your daily steps?', 'Easy to hit', 'A fight', 'Your racket'),
  (date '2026-10-26' + 84, 'Bed time?', 'Before 11', 'After 11', null),
  (date '2026-10-26' + 91, 'Nerves before a match?', 'They help', 'In the way', null),
  (date '2026-10-26' + 98, 'Clay or hard court?', 'Clay', 'Hard court', null),
  (date '2026-10-26' + 105, 'Tennis or padel?', 'Tennis', 'Padel', null)
on conflict (week_start) do nothing;

-- ── 3. This week, for the Bell ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.crew_weekly(p_viewer text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- stage102: this week's Toss and photo theme, with the faces of who chose each side (crew members only) and the viewer's own vote.
declare w public.crew_weeks; v jsonb;
begin
  select * into w from public.crew_weeks where week_start = date_trunc('week', current_date)::date;
  if w.week_start is null or (w.toss_q is null and w.theme is null) then return null; end if;
  with votes as (
    select t.side, t.created_at, m.athlete_id, m.name, m.crew_key
      from public.crew_toss_votes t join public.crew_members() m on m.athlete_id = t.athlete_id
     where t.week_start = w.week_start)
  select jsonb_build_object(
           'a', (select count(*) from votes where side = 'a'), 'b', (select count(*) from votes where side = 'b'),
           'fa', (select coalesce(jsonb_agg(jsonb_build_object('ck', crew_key, 'fv', public.crew_face_v(athlete_id), 'who', name,
                                                                'me', athlete_id is not distinct from p_viewer) order by created_at desc), '[]'::jsonb)
                    from votes where side = 'a'),
           'fb', (select coalesce(jsonb_agg(jsonb_build_object('ck', crew_key, 'fv', public.crew_face_v(athlete_id), 'who', name,
                                                                'me', athlete_id is not distinct from p_viewer) order by created_at desc), '[]'::jsonb)
                    from votes where side = 'b'))
    into v;
  return jsonb_build_object('week', w.week_start, 'q', w.toss_q, 'a', w.toss_a, 'b', w.toss_b, 'theme', w.theme,
                            'open', w.toss_q is not null and w.closed_at is null, 'closes', w.week_start + 6,
                            'mine', (select t.side from public.crew_toss_votes t where t.week_start = w.week_start and t.athlete_id = p_viewer),
                            'votes', v);
end $function$;

CREATE OR REPLACE FUNCTION public.crew_vote(p_side text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- stage102: one vote a week for the signed-in crew member; tapping the other side changes it.
declare v_me text := public.current_athlete_id(); w public.crew_weeks; v_side text := lower(btrim(coalesce(p_side, '')));
begin
  if v_me is null then raise exception 'crew:who'; end if;
  if not exists (select 1 from public.crew_members() m where m.athlete_id = v_me) then raise exception 'crew:join'; end if;
  if v_side not in ('a', 'b') then raise exception 'crew:side'; end if;
  select * into w from public.crew_weeks where week_start = date_trunc('week', current_date)::date;
  if w.week_start is null or w.toss_q is null or w.closed_at is not null then raise exception 'crew:closed'; end if;
  insert into public.crew_toss_votes (week_start, athlete_id, side) values (w.week_start, v_me, v_side)
    on conflict (week_start, athlete_id) do update set side = excluded.side, created_at = now();
  return public.crew_weekly(v_me);
end $function$;

CREATE OR REPLACE FUNCTION public.crew_ask(p_body text, p_ok_name boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- stage102: a question to Amir for the Mailbag. Private: only Amir reads it, and the crew sees it only if he answers it, with the first name
-- only when ok_name. Any athlete with a programme can ask (crew member or not); three a day.
declare v_me text := public.current_athlete_id(); v_body text := btrim(coalesce(p_body, '')); v_id bigint;
begin
  if v_me is null then raise exception 'crew:who'; end if;
  if not exists (select 1 from public.programs p where p.athlete_id = v_me) then raise exception 'crew:who'; end if;
  if char_length(v_body) < 1 then raise exception 'crew:empty'; end if;
  if char_length(v_body) > 200 then raise exception 'crew:too_long'; end if;
  if (select count(*) from public.crew_questions q where q.athlete_id = v_me and q.created_at > now() - interval '1 day') >= 3 then
    raise exception 'crew:enough';
  end if;
  insert into public.crew_questions (athlete_id, body, ok_name) values (v_me, v_body, coalesce(p_ok_name, false)) returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end $function$;

CREATE OR REPLACE FUNCTION public.get_answer_book()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- stage102 (#91 The Answer Book): every Mailbag answer, newest first, for anyone signed in. The asker is named by first name only when they
  -- said yes, else "Someone".
  select case when public.current_athlete_id() is null and not public.is_coach() then null else
    coalesce((select jsonb_agg(jsonb_build_object('q', q.body, 'a', q.answer, 'at', q.answered_at,
                                                  'by', case when q.ok_name then nullif(split_part(btrim(coalesce(c.name,
                                                             (select p.data -> 'athlete' ->> 'name' from public.programs p where p.athlete_id = q.athlete_id), '')), ' ', 1), '') end)
                               order by q.answered_at desc)
                from public.crew_questions q left join public.crew_consent c on c.athlete_id = q.athlete_id
               where q.answer is not null), '[]'::jsonb) end
$function$;

-- ── 4. The coach's side ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.coach_crew_weekly()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- stage102: coach.html's Crew desk: the bank (this week back 2, ahead 20), this week's votes, the Mailbag (open, and answered in 30 days).
declare v_now date := date_trunc('week', current_date)::date;
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  return jsonb_build_object(
    'week', v_now,
    'weeks', coalesce((select jsonb_agg(jsonb_build_object('week', w.week_start, 'q', w.toss_q, 'a', w.toss_a, 'b', w.toss_b, 'theme', w.theme,
                                                           'closed', w.closed_at is not null,
                                                           'va', (select count(*) from public.crew_toss_votes t where t.week_start = w.week_start and t.side = 'a'),
                                                           'vb', (select count(*) from public.crew_toss_votes t where t.week_start = w.week_start and t.side = 'b'))
                                        order by w.week_start)
                         from public.crew_weeks w where w.week_start between v_now - 14 and v_now + 140), '[]'::jsonb),
    'members', (select count(*) from public.crew_members()),
    'questions', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'athlete_id', q.athlete_id, 'body', q.body, 'ok_name', q.ok_name,
                                                               'at', q.created_at, 'answer', q.answer, 'answered_at', q.answered_at)
                                            order by (q.answered_at is null) desc, coalesce(q.answered_at, q.created_at) desc)
                             from public.crew_questions q where q.answered_at is null or q.answered_at > now() - interval '30 days'), '[]'::jsonb),
    'answered_month', (select count(*) from public.crew_questions q where q.answered_at >= date_trunc('month', now())));
end $function$;

CREATE OR REPLACE FUNCTION public.coach_crew_week_set(p_week date, p_q text, p_a text, p_b text, p_theme text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- stage102: write or change one week of the bank. Empty fields clear it (a week with nothing is skipped). A changed question keeps no
-- votes: the votes were for the old one.
declare w date := date_trunc('week', p_week)::date;
  v_q text := nullif(btrim(coalesce(p_q, '')), ''); v_a text := nullif(btrim(coalesce(p_a, '')), '');
  v_b text := nullif(btrim(coalesce(p_b, '')), ''); v_t text := nullif(btrim(coalesce(p_theme, '')), '');
  old public.crew_weeks;
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  if (v_q is null) <> (v_a is null) or (v_q is null) <> (v_b is null) then
    raise exception 'A question needs both sides, or leave all three empty.';
  end if;
  select * into old from public.crew_weeks where week_start = w;
  insert into public.crew_weeks (week_start, toss_q, toss_a, toss_b, theme) values (w, v_q, v_a, v_b, v_t)
    on conflict (week_start) do update set toss_q = excluded.toss_q, toss_a = excluded.toss_a, toss_b = excluded.toss_b,
                                           theme = excluded.theme, updated_at = now();
  if old.week_start is not null and (old.toss_q, old.toss_a, old.toss_b) is distinct from (v_q, v_a, v_b) then
    delete from public.crew_toss_votes where week_start = w;
  end if;
  return public.coach_crew_weekly();
end $function$;

CREATE OR REPLACE FUNCTION public.coach_crew_week_close(p_week date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- stage102: Close early. The card shows the result and takes no more votes.
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  update public.crew_weeks set closed_at = coalesce(closed_at, now()), updated_at = now() where week_start = date_trunc('week', p_week)::date;
  return public.coach_crew_weekly();
end $function$;

CREATE OR REPLACE FUNCTION public.coach_question_answer(p_id bigint, p_answer text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- stage102: Amir answers a Mailbag question for the crew: his pinned post (24 hours, 7 days on the Bell) with the question quoted, and the
-- answer kept on the question for the Answer Book. The asker is named by first name only if they said yes.
declare q public.crew_questions; v_a text := btrim(coalesce(p_answer, '')); v_by text; v_post uuid;
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  select * into q from public.crew_questions where id = p_id for update;
  if q.id is null then raise exception 'That question is gone.'; end if;
  if q.answered_at is not null then raise exception 'That question is already answered.'; end if;
  if char_length(v_a) < 1 then raise exception 'Write the answer first.'; end if;
  if char_length(v_a) > 280 then raise exception 'The answer is % characters. Keep it to 280.', char_length(v_a); end if;
  if q.ok_name then
    v_by := nullif(split_part(btrim(coalesce((select c.name from public.crew_consent c where c.athlete_id = q.athlete_id),
                                             (select p.data -> 'athlete' ->> 'name' from public.programs p where p.athlete_id = q.athlete_id), '')), ' ', 1), '');
  end if;
  insert into public.crew_posts (athlete_id, kind, body, session, has_photo)
       values (public.coach_note_id(), 'post', v_a, jsonb_build_object('ask', jsonb_build_object('q', q.body, 'by', v_by)), false)
    returning id into v_post;
  update public.crew_questions set answer = v_a, answered_at = now(), answer_post = v_post where id = p_id;
  return public.coach_crew_weekly();
end $function$;

CREATE OR REPLACE FUNCTION public.coach_question_drop(p_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- stage102: take a question off the Mailbag without answering it (the asker is not told).
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  delete from public.crew_questions where id = p_id and answered_at is null;
  return public.coach_crew_weekly();
end $function$;

-- ── 5. get_bell(): `weekly` (a guarded patch of the stage100 text: one key added to the answer, one comment) ──
do $stage102_bell$
declare
  d text := pg_get_functiondef('public.get_bell(text)'::regprocedure);
  r_old constant text := $s$'pick', v_pick, 'kinds'$s$;
  r_new constant text := $s$'pick', v_pick, 'weekly', public.crew_weekly(v_id), 'kinds'$s$;
  c_old constant text := $s$  v_pick jsonb := null;   -- stage100: Amir's Pick, the card on Crew for 7 days$s$;
  c_new constant text := $s$  v_pick jsonb := null;   -- stage100: Amir's Pick, the card on Crew for 7 days. stage102: the answer also carries 'weekly' (crew_weekly())$s$;
begin
  if position('stage102' in d) > 0 then return; end if;
  if (length(d) - length(replace(d, r_old, ''))) / length(r_old) <> 1 or (length(d) - length(replace(d, c_old, ''))) / length(c_old) <> 1 then
    raise exception 'stage102: get_bell() is not what this patch expects. Nothing was changed.';
  end if;
  execute replace(replace(d, r_old, r_new), c_old, c_new);
end $stage102_bell$;

-- ── 6. coach_erase_person() learns the two tables with an athlete_id ───────
do $stage102_erase$
declare
  d text := pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure);
  s_old constant text := '''referral_credits'']';
  s_new constant text := '''referral_credits'', ''crew_toss_votes'', ''crew_questions'']';
  n integer;
begin
  if position('''crew_questions''' in d) > 0 then return; end if;
  n := (length(d) - length(replace(d, s_old, ''))) / length(s_old);
  if n <> 1 then
    raise exception 'stage102: coach_erase_person() is not what this patch expects (the end of its table list found % times). Nothing was changed.', n;
  end if;
  execute replace(d, s_old, s_new);
end $stage102_erase$;

-- ── 7. Grants ──────────────────────────────────────────────────────────────
do $stage102_grants$
declare f text;
begin
  foreach f in array array['public.crew_weekly(text)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
  foreach f in array array['public.crew_vote(text)', 'public.crew_ask(text,boolean)', 'public.get_answer_book()', 'public.get_bell(text)',
                           'public.coach_crew_weekly()', 'public.coach_crew_week_set(date,text,text,text,text)', 'public.coach_crew_week_close(date)',
                           'public.coach_question_answer(bigint,text)', 'public.coach_question_drop(bigint)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end
$stage102_grants$;

-- ── 8. The check ───────────────────────────────────────────────────────────
do $stage102_check$
begin
  if position('stage102' in pg_get_functiondef('public.get_bell(text)'::regprocedure)) = 0 then raise exception 'stage102: get_bell() is not the new text'; end if;
  if position('''crew_questions''' in pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure)) = 0 then
    raise exception 'stage102: coach_erase_person() does not know crew_questions';
  end if;
  if (select count(*) from public.crew_weeks) < 16 then raise exception 'stage102: the bank is not seeded'; end if;
  raise notice 'stage102: applied';
end
$stage102_check$;
