-- stage100_pick_card.sql — Amir's Pick gets a card on Crew, with his reason (2026-10-25)
--
-- Amir, on the round 7 plan (https://claude.ai/artifact/Ap56d6pvqEfExFYsFN7P1T): "my pick of the month should have a card or something that is
-- nice, every one can see for a while. design it, and there should be a reason for it why she is my pick", then "lets go with your pick, but make
-- the card a bit smaller, and it should only stay for a week". Idea #92 in .claude/skills/ideas/BANK.md.
--
-- What this does, and nothing else:
--   1. get_bell() answers a new key, `pick`: the newest Amir's Pick made in the last 7 days, as {month, who, ck, fv, me, why, at, until}, when the
--      person picked is a crew member with the honours switch on (null otherwise). The app draws it as the Pick card. The same pick no longer
--      makes a plain moment line on the Bell (the card says it once). Everything else in get_bell() is the LIVE text (pg_get_functiondef on
--      2026-10-25, md5 000d65a61856602c565d41f5ef761252), unchanged.
--   2. coach_honours_why(month, why, not_clients): the coach writes, changes or clears the reason on a month's pick. It is kept inside the pick's
--      existing career_honours.value as `why` (140 characters at most), so no table, column, backup list or erase list changes: career_honours is
--      already in BACKUP_TABLES, the snapshot and coach_erase_person(). coach_honours() and crew_page() already return `value`, so coach.html and the
--      Player Page read the reason with no server change. coach_honours_pick() is NOT changed: a pick is made as before, the reason comes after.
--
-- What it does NOT do: no notification (writing a reason rings nobody; the pick itself still rings once, as before), no XP (GAME-6), nothing for
-- the 'near' rows or the other honours.
--
-- The guard compares the live get_bell() with the text this file was written against and REFUSES, naming it, if anybody changed it since.
-- Rehearsed on the live database inside a DO block that ends in `raise exception` (everything rolled back). The way back:
-- scripts/career/rollback_stage100.sql. Safe to re-run this file.

-- ── 0. The guard ───────────────────────────────────────────────────────────
do $stage100_guard$
declare d text;
begin
  if to_regprocedure('public.get_bell(text)') is null or to_regclass('public.career_honours') is null
     or to_regprocedure('public.coach_honours(date,text[])') is null then
    raise exception 'stage100: get_bell(), career_honours or coach_honours() is missing. Nothing was changed.';
  end if;
  d := md5(replace(pg_get_functiondef('public.get_bell(text)'::regprocedure), chr(13), ''));
  if d <> '000d65a61856602c565d41f5ef761252' and position('stage100' in pg_get_functiondef('public.get_bell(text)'::regprocedure)) = 0 then
    raise exception 'stage100: get_bell() is not the text this file was written against (md5 %). Nothing was changed.', d;
  end if;
end
$stage100_guard$;

-- ── 1. get_bell(): the pick, as a card ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_bell(p_athlete_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me text := public.current_athlete_id();
  v_coach boolean := public.is_coach();
  v_report boolean := coalesce(auth.jwt() ->> 'role', '') in ('', 'service_role');
  v_id text := coalesce(nullif(btrim(coalesce(p_athlete_id, '')), ''), v_me);
  v_from timestamptz := now() - interval '7 days';
  v_items jsonb; v_hon jsonb := null; v_m0 date := (date_trunc('month', current_date) - interval '1 month')::date;
  v_week jsonb; v_crew jsonb;
  v_pick jsonb := null;   -- stage100: Amir's Pick, the card on Crew for 7 days
begin
  if v_id is null and not (v_coach or v_report) then
    raise exception 'not signed in';
  end if;
  if v_id is distinct from v_me and not (v_coach or v_report) then
    raise exception 'not your bell';
  end if;
  perform public.crew_sweep();

  with mem as (select * from public.crew_members()),
  on_kind as (select m.athlete_id, k.kind from mem m cross join unnest(public.crew_kind_list()) k(kind)
               where coalesce((m.kinds ->> k.kind)::boolean, true)),
  wk as (
    select f.athlete_id, f.kind, f.ref, f.day, f.created_at,
           count(*) filter (where f.kind = 'week_broken') over (partition by f.athlete_id order by f.day, f.ref rows unbounded preceding) as grp
      from public.career_facts f
     where f.athlete_id in (select athlete_id from mem) and f.void_at is null and f.kind in ('week_held', 'week_broken')),
  runs as (
    select wk.*, count(*) filter (where wk.kind = 'week_held') over (partition by wk.athlete_id, wk.grp order by wk.day, wk.ref rows unbounded preceding) as run
      from wk),
  parts as (
    select r.athlete_id, r.created_at as at, 'level' as kind, jsonb_build_object('k', 'level', 'n', (r.value ->> 'n')::int) as p
      from public.crew_rings r where r.kind = 'level' and r.created_at >= v_from
    union all
    select r.athlete_id, r.created_at, 'open', r.value || jsonb_build_object('k', 'open')
      from public.crew_rings r where r.kind = 'open' and r.created_at >= v_from
    union all
    select ru.athlete_id, ru.created_at, 'week', jsonb_build_object('k', 'week', 'run', ru.run)
      from runs ru where ru.kind = 'week_held' and ru.created_at >= v_from and ru.day >= current_date - 14
    union all
    select f.athlete_id, f.created_at, 'best', jsonb_build_object('k', 'best', 'lift', f.value ->> 'lift')
      from public.career_facts f
     where f.athlete_id in (select athlete_id from mem) and f.void_at is null and f.kind = 'personal_best'
       and f.day >= current_date - 14 and f.created_at >= v_from and nullif(btrim(f.value ->> 'lift'), '') is not null
    union all
    select f.athlete_id, f.created_at, 'cycle', jsonb_build_object('k', 'cycle', 'n', (f.value ->> 'cycle')::int)
      from public.career_facts f
     where f.athlete_id in (select athlete_id from mem) and f.void_at is null and f.kind = 'cycle_finished'
       and f.day >= current_date - 14 and f.created_at >= v_from
    union all
    select a.athlete_id, a.created_at,
           case when a.kind = 'badge' then 'mark' else 'achievement' end,
           case when a.kind = 'badge'
                then jsonb_build_object('k', 'mark', 'item', a.item,
                                        'at', (select (t.v ->> 'at')::int from public.career_catalogue c
                                                cross join lateral jsonb_array_elements(c.body -> 'tiers') with ordinality t(v, i)
                                                where c.kind = 'badge' and c.id = a.item and t.i = a.tier))
                else jsonb_build_object('k', 'achievement', 'id', a.item,
                                        'name', coalesce((select c.body ->> 'name' from public.career_catalogue c where c.kind = 'achievement' and c.id = a.item), a.item))
           end
      from public.career_awards a
     where a.athlete_id in (select athlete_id from mem) and a.how = 'live' and a.created_at >= v_from
       and (a.kind = 'achievement' or (a.kind = 'badge' and a.item in ('held_weeks', 'century', 'bests', 'comebacks')))
    union all
    select h.athlete_id, h.created_at, 'honour', jsonb_build_object('k', 'honour', 'honour', h.honour, 'month', h.month)
      from public.career_honours h
     where h.athlete_id in (select athlete_id from mem) and h.honour not in ('near', 'pick') and h.created_at >= v_from   -- stage100: a pick is its card, not a line
    union all
    select m.athlete_id, m.first_yes_at, 'joined', jsonb_build_object('k', 'joined')
      from mem m where m.first_yes_at >= v_from
  ),
  kept0 as (
    select p.*, (p.at at time zone 'UTC')::date as d
      from parts p join mem m on m.athlete_id = p.athlete_id
     where p.at >= coalesce(m.yes_since, p.at)
       and (p.kind = 'joined' or exists (select 1 from on_kind o where o.athlete_id = p.athlete_id and o.kind = p.kind))),
  kept as (
    select k.*, bool_or(k.kind = 'mark' and k.p ->> 'item' = 'held_weeks') over (partition by k.athlete_id, k.d) as hw_mark
      from kept0 k),
  lines as (
    select k.athlete_id, k.d, max(k.at) as at,
           max((k.p ->> 'n')::int) filter (where k.kind = 'level') as lvl,
           jsonb_agg(k.p order by k.at) filter (where k.kind in ('joined', 'mark', 'achievement', 'honour', 'open')) as rest,
           array_agg(distinct k.p ->> 'lift') filter (where k.kind = 'best') as lifts,
           max((k.p ->> 'run')::int) filter (where k.kind = 'week' and not k.hw_mark) as run,
           max((k.p ->> 'n')::int) filter (where k.kind = 'cycle') as cyc
      from kept k group by k.athlete_id, k.d),
  line_items as (
    select l.at, jsonb_build_object(
             't', 'line', 'key', m.crew_key::text || ':' || l.d::text, 'who', m.name, 'me', l.athlete_id is not distinct from v_id,
             'at', l.at,
             'parts', case when l.lvl is not null then jsonb_build_array(jsonb_build_object('k', 'level', 'n', l.lvl)) else '[]'::jsonb end
                      || coalesce(l.rest, '[]'::jsonb)
                      || case when l.lifts is not null then jsonb_build_array(jsonb_build_object('k', 'best', 'lifts', to_jsonb(l.lifts[1:3]),
                                                                                                  'more', greatest(0, cardinality(l.lifts) - 3))) else '[]'::jsonb end
                      || case when l.run is not null then jsonb_build_array(jsonb_build_object('k', 'week', 'run', l.run)) else '[]'::jsonb end
                      || case when l.cyc is not null then jsonb_build_array(jsonb_build_object('k', 'cycle', 'n', l.cyc)) else '[]'::jsonb end,
             'kudos', public.crew_kudos_of(null, l.athlete_id, l.d, v_id), 'fv', public.crew_face_v(l.athlete_id)) as j
      from lines l join mem m on m.athlete_id = l.athlete_id),
  -- the week's attendance, ONE item a day for the whole crew, never one line each. Grouped on the session's own `day`, from
  -- the day the athlete joined, so the 17 October back-pay cannot announce 39 sessions in an afternoon.
  sess as (
    select f.day as d, m.athlete_id, m.name, count(*) as n
      from public.career_facts f
      join mem m on m.athlete_id = f.athlete_id
     where f.void_at is null
       and f.kind in ('session_finished', 'session_finished_early', 'library_session')
       and f.day >= (current_date - 7) and f.day <= current_date
       and f.day >= coalesce((m.yes_since at time zone 'UTC')::date, f.day)
       and exists (select 1 from on_kind o where o.athlete_id = m.athlete_id and o.kind = 'session')
     group by f.day, m.athlete_id, m.name),
  sess_items as (
    select least(now(), ((s.d + 1)::timestamptz)) as at,
           jsonb_build_object(
             't', 'sess', 'key', 'sess:' || s.d::text, 'day', s.d,
             'n', sum(s.n),
             'names', coalesce(jsonb_agg(s.name order by lower(s.name)) filter (where s.athlete_id is distinct from v_id), '[]'::jsonb),
             'me', bool_or(s.athlete_id is not distinct from v_id)) as j
      from sess s group by s.d),
  post_items as (
    select p.created_at as at, (p.athlete_id = public.coach_note_id() and p.created_at >= now() - interval '24 hours') as pinned,
           jsonb_build_object(
             't', 'post', 'id', p.id, 'who', case when p.athlete_id = public.coach_note_id() then 'Amir' else m.name end,
             'me', p.athlete_id is not distinct from v_id, 'amir', p.athlete_id = public.coach_note_id(),
             'kind', p.kind, 'body', p.body, 'session', p.session, 'photo', p.has_photo,
             'w', ph.w, 'h', ph.h, 'at', p.created_at,
             'pinned', (p.athlete_id = public.coach_note_id() and p.created_at >= now() - interval '24 hours'),
             'left', greatest(0, ceil(extract(epoch from (p.created_at + interval '7 days' - now())) / 86400.0))::int,
             'kudos', public.crew_kudos_of(p.id, null, null, v_id), 'replies', public.crew_reply_rows(p.id, v_id)) || case when m.athlete_id is not null then jsonb_build_object('ck', m.crew_key, 'fv', public.crew_face_v(m.athlete_id)) else '{}'::jsonb end as j
      from public.crew_posts p
      left join mem m on m.athlete_id = p.athlete_id
      left join public.crew_photos ph on ph.post_id = p.id
     where p.created_at >= v_from and (p.athlete_id = public.coach_note_id() or m.athlete_id is not null)
     order by (p.athlete_id = public.coach_note_id() and p.created_at >= now() - interval '24 hours') desc, p.created_at desc
     limit 80)
  select coalesce(jsonb_agg(x.j order by x.pinned desc, x.at desc), '[]'::jsonb) into v_items
    from (select at, pinned, j from post_items
          union all select at, false, j from line_items
          union all select at, false, j from sess_items) x;

  -- the band's three numbers: the same 7 days as the Bell, the same switches, and nobody named.
  with mem as (select * from public.crew_members())
  select jsonb_build_object(
           'members', (select count(*) from mem),
           'sessions', (select count(*) from public.career_facts f join mem m on m.athlete_id = f.athlete_id
                         where f.void_at is null and f.kind in ('session_finished', 'session_finished_early', 'library_session')
                           and f.day >= (current_date - 7) and f.day <= current_date
                           and f.day >= coalesce((m.yes_since at time zone 'UTC')::date, f.day)
                           and coalesce((m.kinds ->> 'session')::boolean, true)),
           'held', (select count(*) from public.career_facts f join mem m on m.athlete_id = f.athlete_id
                     where f.void_at is null and f.kind = 'week_held'
                       and f.day >= (current_date - 7) and f.day <= current_date
                       and f.day >= coalesce((m.yes_since at time zone 'UTC')::date, f.day)
                       and coalesce((m.kinds ->> 'week')::boolean, true)))
    into v_week;

  -- who is in the room: names only. The level sits on the board, which the app keeps on the phone.
  with mem as (select * from public.crew_members())
  select coalesce(jsonb_agg(jsonb_build_object('who', m.name, 'me', m.athlete_id is not distinct from v_id,
                                               'since', (m.first_yes_at at time zone 'UTC')::date, 'ck', m.crew_key, 'fv', public.crew_face_v(m.athlete_id)) || public.crew_extra(m.athlete_id, m.kinds, m.yes_since, m.first_yes_at, v_id)
                            order by lower(m.name)), '[]'::jsonb)
    into v_crew from mem m;

  if extract(day from current_date) <= 14 and exists (select 1 from public.career_honour_months hm where hm.month = v_m0) then
    select jsonb_build_object('month', v_m0, 'rows', coalesce(jsonb_agg(jsonb_build_object('honour', h.honour, 'who', m.name, 'me', h.athlete_id is not distinct from v_id,
                                                                                         'value', h.value - 'slot', 'ck', m.crew_key) order by h.honour, m.name), '[]'::jsonb))
      into v_hon
      from public.career_honours h join public.crew_members() m on m.athlete_id = h.athlete_id
     where h.month = v_m0 and h.honour <> 'near' and coalesce((m.kinds ->> 'honour')::boolean, true);
  end if;

  -- stage100: Amir's Pick is a card on Crew for 7 days from the moment he picks (Amir, 2026-10-25: "make the card a bit smaller, and it should
  -- only stay for a week"), with his reason (`why`, written in Courtside). Only a crew member whose honours switch is on: anybody else's pick
  -- is on their own page alone. The newest pick wins if two months were picked inside one week.
  select jsonb_build_object('month', h.month, 'who', m.name, 'ck', m.crew_key, 'fv', public.crew_face_v(m.athlete_id),
                            'me', h.athlete_id is not distinct from v_id, 'why', nullif(btrim(coalesce(h.value ->> 'why', '')), ''),
                            'at', h.created_at, 'until', h.created_at + interval '7 days')
    into v_pick
    from public.career_honours h join public.crew_members() m on m.athlete_id = h.athlete_id
   where h.honour = 'pick' and h.created_at >= now() - interval '7 days' and coalesce((m.kinds ->> 'honour')::boolean, true)
   order by h.created_at desc
   limit 1;

  return jsonb_build_object('athlete_id', v_id, 'me', public.crew_me(v_id), 'items', v_items, 'honours', v_hon, 'pick', v_pick, 'kinds', to_jsonb(public.crew_kind_list()),
                            'days', 7, 'emoji', to_jsonb(public.crew_emoji_list()), 'open', public.crew_open_now(v_id),
                            'week', v_week, 'crew', v_crew, 'lounge', 1, 'at', now());
end $function$;


-- ── 2. coach_honours_why(): the reason on a pick ───────────────────────────
CREATE OR REPLACE FUNCTION public.coach_honours_why(p_month date, p_why text, p_not_clients text[] DEFAULT '{}'::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- stage100: Amir's reason for his pick of the month, in his words, read by the crew on the Pick card and kept on the athlete's page.
-- Empty clears it. 140 characters at most (the card is small: Amir, 2026-10-25, "make the card a bit smaller").
declare
  m0 date := date_trunc('month', p_month)::date;
  v_why text := nullif(btrim(coalesce(p_why, '')), '');
  v_n int;
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  if v_why is not null and char_length(v_why) > 140 then
    raise exception 'The reason is % characters. Keep it to 140.', char_length(v_why);
  end if;
  update public.career_honours
     set value = case when v_why is null then coalesce(value, '{}'::jsonb) - 'why'
                      else coalesce(value, '{}'::jsonb) || jsonb_build_object('why', v_why) end
   where month = m0 and honour = 'pick';
  get diagnostics v_n = row_count;
  if v_n = 0 then raise exception 'There is no pick for % yet. Pick first, then write why.', to_char(m0, 'FMMonth YYYY'); end if;
  return public.coach_honours(m0, p_not_clients);
end $function$;

-- ── 3. Grants (as every coach and crew function) ───────────────────────────
do $stage100_grants$
begin
  revoke all on function public.coach_honours_why(date, text, text[]) from public, anon;
  grant execute on function public.coach_honours_why(date, text, text[]) to authenticated, service_role;
  revoke all on function public.get_bell(text) from public, anon;
  grant execute on function public.get_bell(text) to authenticated, service_role;
end
$stage100_grants$;

-- ── 4. The check ───────────────────────────────────────────────────────────
do $stage100_check$
begin
  if position('stage100' in pg_get_functiondef('public.get_bell(text)'::regprocedure)) = 0
     or position('''pick'', v_pick' in pg_get_functiondef('public.get_bell(text)'::regprocedure)) = 0 then
    raise exception 'stage100: get_bell() is not the new text';
  end if;
  if to_regprocedure('public.coach_honours_why(date,text,text[])') is null then
    raise exception 'stage100: coach_honours_why() is missing';
  end if;
  raise notice 'stage100: applied';
end
$stage100_check$;
