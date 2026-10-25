-- rollback_stage99.sql — the way back from supabase/stage99_emblem_cabinet.sql (the Emblem Cabinet's server side). ON AMIR'S WORD ONLY.
--
-- What it does: puts every line stage99 patched back as it was (the same table of lines as the stage, read backwards, so the two cannot disagree),
-- drops the three helpers it made, and drops session_history.fin.
--   · After it: save_session() ignores `fin`, the session fact carries no finish time, total reads one fact again, the three tests (on_dates,
--     slam_year, clock) decide nothing (the evaluator has no branch for them), D21 is gone (an entry's paid_from is ignored: a NEW win pays the
--     catalogue XP whatever day it was done), and get_achievements() answers as stage80 left it.
--   · Awards already minted keep what they were minted with (GAME-1, D20): nothing is taken from anyone, and the 0 XP of a back-fill stays 0.
--   · To take the 33 off the screens too, seed a rulebook version 12 without them (a removed achievement stays owned by whoever won it).
--   · ⚠️ The last statement DROPS the column of finish times: the time of day of every session saved since stage99 is lost (the awards it earned
--     stay). Delete that statement to keep the column; nothing reads it once this has run.
-- Safe to re-run: a line already put back is skipped. Refuses (changing nothing) if a function has moved on and a line is not found once.

do $rollback99$
declare
  p record; d text; n integer;
begin
  for p in select * from (select t.*, row_number() over () as n from (values
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
    ) as t(fn, old_text, new_text)) z order by z.n desc   -- the lines go back in the opposite order they went on
  loop
    d := pg_get_functiondef(p.fn::regprocedure);
    if position(p.new_text in d) = 0 then continue; end if;                   -- not patched (or put back already)
    n := (length(d) - length(replace(d, p.new_text, ''))) / length(p.new_text);
    if n <> 1 then
      raise exception 'rollback99: % is not what this rollback expects (a patched line was found % times, not once): %. Nothing was changed.', p.fn, n, left(p.new_text, 80);
    end if;
    execute replace(d, p.new_text, p.old_text);
  end loop;
end
$rollback99$;

drop function if exists public.career_slam_year(text, jsonb);
drop function if exists public.career_in_windows(date, jsonb);
drop function if exists public.career_reads_kinds(jsonb);

alter table public.session_history drop column if exists fin;
