-- stage99_emblem_cabinet.sql — the server side of the Emblem Cabinet: D21, three new tests, the finish time, and what the cabinet reads
-- (Career Mode, rulebook version 11; Amir, 2026-10-25: "go with your picks", then "remember if anyone has done the achievements before, it should be
-- unlocked, their trophies should be already won, but no xp should be given to them. only from now on, the achievements will give xp")
--
-- REHEARSED (scripts/career/rehearse_emblems.mjs, PGlite) AND APPLIED to the live project 2026-10-25 (~12:15 UTC) on Amir's explicit words, by the main
-- session, as the migration stage99_emblem_cabinet (guarded by the md5 of the file as it was then, 643b10e016dc814fb62f9d6556350845; this header was
-- reworded afterwards, so today's file has another md5, the code is the same). Then the seed of rulebook version 11 (starts_on and every paid_from the seed
-- day, 2026-10-25), then one silent career_rewards_batch() pass. Result in career/PROCEDURES.md → Stage 99. The order is "To apply" there (a before-copy,
-- this file, the seed with starts_on and every paid_from set to the SEED DAY, one silent pass, the checks, the snapshot).
--
-- What it does, in the order it does it:
--   1. session_history.fin — the local clock time ("HH:MM", 24 h) at which the phone FINISHED the session. The phone sends it as p_session.fin;
--      save_session() keeps the FIRST value and never fails a save because of it (a value that is not a time is dropped, an old phone sends none).
--      WHY A COLUMN: it is the one place a time of day can live that nothing else writes (the log, the summary and the check-in are rewritten by
--      every re-save, which would move it), it is nullable so every old row and every old phone is untouched, and it costs the restore path
--      nothing (the table is already in BACKUP_TABLES and coach_erase_person() already empties it by athlete id; the snapshot is remade after the
--      apply, as after every stage). The fact the test reads is the SESSION fact: career_session_want() puts `fin` in the value of
--      session_finished / session_finished_early, so a finish time that arrives on a later save changes the fact and wakes the achievements.
--   2. Three tests the evaluator could not decide, and the list form of `total`:
--        on_dates   (windows)        a finished session whose own date (completed_on) falls in a window of month-days, inclusive, every year
--                                    (Down Under, Red Clay, The Lawns, Big Apple, Nowruz, Yalda)
--        slam_year  (of)             a session in each window of the on_dates entries named in `of`, in one calendar year (Calendar Slam)
--        clock      (finish_before | finish_from)   a finished session whose local finish time is before / from the time asked (Early Bird, Night Owl)
--        total      (reads = [a, b]) the at-th fact of the kinds listed, counted together as a badge of kind total counts them (Century's two:
--                                    a finished and an early session), so a capped kind counts only what career_facts_paid() pays (D19)
--      The windows and the times are numbers in the toml (GAME-10); nothing here types a date or a time of day.
--   3. D21 — career_mint() (one guarded change, marked /* stage99: D21 */): an award whose entry carries `paid_from` and whose activity was done
--      BEFORE that day (v_earned < paid_from, the unclamped day stage95 keeps) is minted with xp = 0. It is still won, still on the shelf, dated as
--      D20 dates it, earned_on the real day. From paid_from on it pays the catalogue XP. An entry without paid_from is untouched.
--   4. get_achievements() gives the cabinet what it needs, all optional so an old app still works: done_on (the day the work was done), xp_won
--      (what the award was minted with, 0 for a D21 back-fill), times (only 2 or more, for the entries that name a fact in `repeats`), have/need for
--      slam_year, `reads` as the list it is, and Next up never offers a calendar or clock one (nobody can work on Yalda today).
--
-- The patching style is stage76's and stage94's: every change to a function that exists is a guarded textual patch on one line of its CURRENT
-- text, found once or refused ("Nothing was changed"), and a re-run finds it already patched. Nothing is retyped from an older stage.
--
-- The way back: scripts/career/rollback_stage99.sql (puts every patched line back, drops the three helpers and the column). Safe to re-run this file.

-- ── 0. The guard ───────────────────────────────────────────────────────────────────────────────────────────────────────
do $stage99_guard$
begin
  if to_regprocedure('public.career_achievement_eval(text,text,jsonb,jsonb,jsonb)') is null
     or to_regprocedure('public.career_entry_keys(text,jsonb,jsonb)') is null
     or to_regprocedure('public.career_entry_kinds(text,jsonb)') is null
     or to_regprocedure('public.career_mint(text,text,text,integer,text,date,jsonb,jsonb,jsonb,text,jsonb)') is null
     or to_regprocedure('public.career_session_want(text,integer,date)') is null
     or to_regprocedure('public.career_day(text)') is null
     or to_regprocedure('public.get_achievements(text)') is null
     or to_regprocedure('public.save_session(text,text,integer,date,jsonb,text)') is null
     or to_regclass('public.session_history') is null or to_regclass('public.career_awards') is null then
    raise exception 'stage99: Career Mode''s stages 66 to 95 and stage80 come first. Nothing was changed.';
  end if;
  if position('v_earned' in pg_get_functiondef('public.career_mint(text,text,text,integer,text,date,jsonb,jsonb,jsonb,text,jsonb)'::regprocedure)) = 0 then
    raise exception 'stage99: career_mint() does not keep the day the work was done (stage95 is not live). Nothing was changed.';
  end if;
end
$stage99_guard$;

-- ── 1. The finish time ──────────────────────────────────────────────────────────────────────────────────────────────────
alter table public.session_history add column if not exists fin text;
comment on column public.session_history.fin is
  'stage99: the local clock time ("HH:MM", 24 h) the phone finished the session at (p_session.fin). The first value stays; null when the phone did not say (every session saved before stage99). Early Bird and Night Owl read it through the session fact.';

-- ── 2. Helpers (the service role's only, like the other career_* functions) ─────────────────────────────────────────────────
-- The facts a test reads, as a sorted list: reads = "a" or reads = ["b", "a"]. A badge of kind total sorts its `counts` the same way, so
-- the key career_entry_keys() makes (count:a,b) is the badge's key and the measure is worked out once.
create or replace function public.career_reads_kinds(p_body jsonb) returns text[]
language sql immutable set search_path to 'public' as $function$
  select case jsonb_typeof(p_body -> 'reads')
           when 'array' then array(select x from jsonb_array_elements_text(p_body -> 'reads') x order by x)
           when 'string' then array[p_body ->> 'reads']
           else '{}'::text[] end
$function$;

-- Is a day inside one of the windows [{from: "MM-DD", to: "MM-DD"}, ...] (inclusive, every year; the checker refuses a window over New Year)?
create or replace function public.career_in_windows(p_day date, p_windows jsonb) returns boolean
language sql immutable set search_path to 'public' as $function$
  select coalesce(bool_or(to_char(p_day, 'MM-DD') between (w.v ->> 'from') and (w.v ->> 'to')), false)
    from jsonb_array_elements(case when jsonb_typeof(p_windows) = 'array' then p_windows else '[]'::jsonb end) w(v)
$function$;

-- Calendar Slam: the windows of the on_dates entries named in `of` (read from the catalogue, so the four dates live once, in the toml). For each
-- calendar year, how many of them hold a finished session; need = how many windows there are, have = the most in any one year, day = the first
-- day a year held all of them (the day of the last window's first session in that year), null until one does.
create or replace function public.career_slam_year(p_athlete text, p_of jsonb) returns jsonb
language sql stable set search_path to 'public' as $function$
  with win as (
    select (row_number() over (order by c.id, w.o))::int as wi, (w.v ->> 'from') as lo, (w.v ->> 'to') as hi
      from public.career_catalogue c
           cross join lateral jsonb_array_elements(case when jsonb_typeof(c.body -> 'windows') = 'array' then c.body -> 'windows' else '[]'::jsonb end)
                      with ordinality w(v, o)
     where c.kind = 'achievement'
       and c.id in (select x from jsonb_array_elements_text(case when jsonb_typeof(p_of) = 'array' then p_of else '[]'::jsonb end) x)
  ),
  hit as (
    select extract(year from f.day)::int as y, win.wi, min(f.day) as d
      from public.career_facts f join win on to_char(f.day, 'MM-DD') between win.lo and win.hi
     where f.athlete_id = p_athlete and f.kind in ('session_finished', 'session_finished_early') and f.void_at is null
     group by 1, 2
  ),
  yr as (select hit.y, count(*)::int as n, max(hit.d) as d from hit group by hit.y)
  select jsonb_build_object(
           'need', (select count(*) from win),
           'have', coalesce((select max(yr.n) from yr), 0),
           'day', (select min(yr.d) from yr where yr.n = (select count(*) from win) and (select count(*) from win) > 0))
$function$;

revoke all on function public.career_reads_kinds(jsonb) from public, anon, authenticated, service_role;
revoke all on function public.career_in_windows(date, jsonb) from public, anon, authenticated, service_role;
revoke all on function public.career_slam_year(text, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.career_reads_kinds(jsonb) to service_role;
grant execute on function public.career_in_windows(date, jsonb) to service_role;
grant execute on function public.career_slam_year(text, jsonb) to service_role;

-- ── 3. The patches ──────────────────────────────────────────────────────────────────────────────────────────────────────
-- Each finds its one line of the function's CURRENT text exactly once, or refuses (nothing changed); a re-run finds the new text and goes on.
-- The anchors are single lines on purpose: the live text may end its lines in CR LF and may or may not carry the older stages' line comments.
do $stage99_patch$
declare
  p record; d text; n integer;
begin
  for p in select * from (values
      -- 3.1  the finish time: save_session() keeps the first, drops what is not a time, never fails
      ('public.save_session(text,text,integer,date,jsonb,text)',
       $a$day_note, focus, summary, log, updated_at)$a$,
       $a$day_note, focus, summary, log, updated_at, fin)$a$),
      ('public.save_session(text,text,integer,date,jsonb,text)',
       $a$now())$a$,
       E'now(),\n    /* stage99: the phone''s local finish time, "H:MM" or "HH:MM"; anything else is dropped */ case when (p_session->>''fin'') ~ ''^([01]?[0-9]|2[0-3]):[0-5][0-9]$'' then lpad(p_session->>''fin'', 5, ''0'') end)'),
      ('public.save_session(text,text,integer,date,jsonb,text)',
       $a$hidden_by = case when public.is_coach() then null else session_history.hidden_by end,$a$,
       E'hidden_by = case when public.is_coach() then null else session_history.hidden_by end,\n        fin = coalesce(session_history.fin, excluded.fin),   /* stage99: the first finish time stays */'),
      -- 3.2  the session fact carries it
      ('public.career_session_want(text,integer,date)',
       $a$select sh.day, sh.completed_on, sh.duration_min, sh.readiness, sh.log,$a$,
       $a$select sh.day, sh.completed_on, sh.duration_min, sh.readiness, sh.log, sh.fin,$a$),
      ('public.career_session_want(text,integer,date)',
       $a$'minutes', s.duration_min,$a$,
       $a$'minutes', s.duration_min, 'fin', s.fin /* stage99 */,$a$),
      -- 3.3  total reads a list; the three new tests wake on a finished session
      ('public.career_entry_keys(text,jsonb,jsonb)',
       $a$return array['count:' || coalesce(p_body ->> 'reads', '')];$a$,
       $a$return array['count:' || array_to_string(public.career_reads_kinds(p_body), ',')];   /* stage99: reads may be a list */$a$),
      ('public.career_entry_kinds(text,jsonb)',
       $a$when 'total' then return array[p_body ->> 'reads']$a$,
       $a$when 'total' then return public.career_reads_kinds(p_body) /* stage99: reads may be a list */$a$),
      ('public.career_entry_kinds(text,jsonb)',
       $a$when 'best_run', 'month_held' then return array['week_held', 'week_broken']$a$,
       E'when ''on_dates'', ''slam_year'', ''clock'' then return array[''session_finished'', ''session_finished_early''];   /* stage99 */\n      when ''best_run'', ''month_held'' then return array[''week_held'', ''week_broken'']'),
      -- 3.4  the evaluator decides them
      ('public.career_achievement_eval(text,text,jsonb,jsonb,jsonb)',
       $a$v_ev := jsonb_build_object('via', 'month_held', 'n', v_num, 'facts', '[]'::jsonb);$a$,
       $a$v_ev := jsonb_build_object('via', 'month_held', 'n', v_num, 'facts', '[]'::jsonb);

  elsif v_test = 'on_dates' then
    -- stage99: the first finished plan session (a full or an early finish, not voided) whose own date falls in one of the windows
    select f.day, f.kind, f.ref into v_day, v_kind, v_ref from public.career_facts f
     where f.athlete_id = p_athlete and f.kind in ('session_finished', 'session_finished_early') and f.void_at is null
       and public.career_in_windows(f.day, p_body -> 'windows')
     order by f.day, f.ref, f.kind limit 1;
    v_ev := jsonb_build_object('via', 'on_dates', 'n', 1,
                               'facts', case when v_ref is null then '[]'::jsonb else jsonb_build_array(jsonb_build_object('kind', v_kind, 'ref', v_ref)) end);

  elsif v_test = 'slam_year' then
    -- stage99: a session in each window of the on_dates entries named in `of`, in one calendar year (career_slam_year())
    s := public.career_slam_year(p_athlete, p_body -> 'of');
    v_day := (s ->> 'day')::date;
    v_ev := jsonb_build_object('via', 'slam_year', 'n', s -> 'need', 'facts', '[]'::jsonb);

  elsif v_test = 'clock' then
    -- stage99: the first finished plan session whose local finish time (the phone's `fin`, kept on the session fact) is before / from the time asked.
    -- A session saved before stage99, or by a phone that did not say, has no `fin` and counts for nothing.
    select f.day, f.kind, f.ref into v_day, v_kind, v_ref from public.career_facts f
     where f.athlete_id = p_athlete and f.kind in ('session_finished', 'session_finished_early') and f.void_at is null
       and case when (f.value ->> 'fin') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'      -- a CASE, so the cast below never meets a value that is not a time
                then (((p_body ->> 'finish_before') is not null and (f.value ->> 'fin')::time < (p_body ->> 'finish_before')::time)
                   or ((p_body ->> 'finish_from') is not null and (f.value ->> 'fin')::time >= (p_body ->> 'finish_from')::time))
                else false end
     order by f.day, f.ref, f.kind limit 1;
    v_ev := jsonb_build_object('via', 'clock', 'n', 1,
                               'facts', case when v_ref is null then '[]'::jsonb else jsonb_build_array(jsonb_build_object('kind', v_kind, 'ref', v_ref)) end);$a$),
      -- 3.5  D21
      ('public.career_mint(text,text,text,integer,text,date,jsonb,jsonb,jsonb,text,jsonb)',
       $a$v_xp := case when v_pays then greatest(coalesce(public.career_award_xp(p_kind, p_tier, coalesce(p_subject, ''), p_body, p_ctx -> 'hr'), 0), 0) else 0 end;$a$,
       $a$v_xp := case when v_pays then greatest(coalesce(public.career_award_xp(p_kind, p_tier, coalesce(p_subject, ''), p_body, p_ctx -> 'hr'), 0), 0) else 0 end;
  if v_xp > 0 and coalesce(p_body, '{}'::jsonb) ? 'paid_from' and v_earned < public.career_day(p_body ->> 'paid_from') then v_xp := 0; end if;   /* stage99: D21 */$a$),
      -- 3.6  what the cabinet reads
      ('public.get_achievements(text)',
       $a$v_mw integer; v_mh integer; v_spoilt boolean;$a$,
       $a$v_mw integer; v_mh integer; v_spoilt boolean; v_done jsonb; v_xpw jsonb; v_times integer; v_sy jsonb;   /* stage99 */$a$),
      ('public.get_achievements(text)',
       $a$from public.career_awards a where a.athlete_id = v_id and a.kind = 'achievement';$a$,
       $a$from public.career_awards a where a.athlete_id = v_id and a.kind = 'achievement';
  -- stage99: the day the work was done (earned_on) and the XP the award was minted with (0 for a D21 back-fill), by achievement
  select coalesce(jsonb_object_agg(a.item, a.earned_on), '{}'::jsonb), coalesce(jsonb_object_agg(a.item, case when a.pays then a.xp else 0 end), '{}'::jsonb)
    into v_done, v_xpw from public.career_awards a where a.athlete_id = v_id and a.kind = 'achievement';$a$),
      ('public.get_achievements(text)',
       $a$v_have := null; v_need := null;$a$,
       $a$v_have := null; v_need := null; v_times := null;
    if v_day is not null and c.body ->> 'repeats' is not null then      -- stage99: how many times it came ("Won 11 times"), display only
      select count(*)::int into v_times from public.career_facts f
       where f.athlete_id = v_id and f.kind = c.body ->> 'repeats' and f.void_at is null;
    end if;$a$),
      ('public.get_achievements(text)',
       $a$v_have := case when v_spoilt then 0 else v_mh end;$a$,
       $a$v_have := case when v_spoilt then 0 else v_mh end;
      elsif v_test = 'slam_year' then      -- stage99: windows hit in the best calendar year, of all the windows there are
        v_sy := public.career_slam_year(v_id, c.body -> 'of');
        v_have := coalesce((v_sy ->> 'have')::numeric, 0); v_need := (v_sy ->> 'need')::numeric;$a$),
      ('public.get_achievements(text)',
       $a$'reads', c.body ->> 'reads',$a$,
       $a$'reads', c.body -> 'reads',$a$),
      ('public.get_achievements(text)',
       $a$'day', v_day, 'have', v_have, 'need', v_need,$a$,
       $a$'day', v_day, 'done_on', case when v_day is not null then (v_done ->> c.id)::date end,
      'xp_won', case when v_day is not null then (v_xpw ->> c.id)::int end, 'times', case when v_times >= 2 then v_times end,
      'have', v_have, 'need', v_need,$a$),
      ('public.get_achievements(text)',
       $a$where e ->> 'day' is null and not coalesce((e ->> 'spoilt')::boolean, false)) z$a$,
       $a$where e ->> 'day' is null and not coalesce((e ->> 'spoilt')::boolean, false)
        and coalesce(e ->> 'test', '') not in ('on_dates', 'slam_year', 'clock')) z   /* stage99: nobody can work on a date or a time of day */$a$)
    ) as t(fn, old_text, new_text)
  loop
    d := pg_get_functiondef(p.fn::regprocedure);
    if position(p.new_text in d) > 0 then continue; end if;                   -- patched already (a re-run)
    n := (length(d) - length(replace(d, p.old_text, ''))) / length(p.old_text);
    if n <> 1 then
      raise exception 'stage99: % is not what this patch expects (this line was found % times, not once): %. Nothing was changed.', p.fn, n, left(p.old_text, 80);
    end if;
    execute replace(d, p.old_text, p.new_text);
  end loop;
end
$stage99_patch$;
