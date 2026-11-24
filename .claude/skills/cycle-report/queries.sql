-- /cycle-report queries. Replace the three values in each `params` CTE:
--   id    = the athlete_id
--   start = the cycle's startDate, end = its endDate (from Q1).
-- The window opens 3 days early: athletes often start a cycle a day or two before its date.
-- All read-only. Run each with the Supabase MCP (execute_sql).

-- ─── Q1 · the cycle: current + next, and what was promised ──────────────────────────────
with p as (select data, coalesce((data->>'currentCycleIndex')::int, 0) i
           from public.programs where athlete_id = 'ATHLETE_ID')
select i,
       data->'athlete'                       as athlete,
       data->'sport'->>'badge'               as sport,
       data->'cycles'->i                     as cycle,       -- name, dates, art, focuses, message.outcomes
       data->'cycles'->(i + 1)               as next_cycle,  -- name, dates, focuses, teaser
       jsonb_array_length(data->'cycles')    as n_cycles,
       data->'notes'->'cards'                as note_cards   -- in full (2026-09-27: was a second query)
from p;
-- The note cards hold promises ("8 to 15 cm on a broad jump"), gates ("weight doesn't go up until
-- I've cleared the film") and rules ("week five you back off") that the report must check.

-- ─── Q2 · every session in the window ───────────────────────────────────────────────────
with params as (select 'ATHLETE_ID'::text id, date 'START' - 3 s, date 'END' e)
select h.completed_on, to_char(h.completed_on, 'Dy') dow, h.day, h.status, h.session_rpe srpe,
       h.duration_min mins, h.readiness->>'composite' rdy, h.readiness->>'sleep' sleep,
       h.readiness->>'soreness' sore, nullif(h.day_note, '') day_note, h.log is not null has_log
from public.session_history h, params
where h.athlete_id = params.id and h.completed_on between params.s and params.e and h.hidden_at is null   -- a session the coach hid (stage60) is not a session
order by h.completed_on, h.day;

-- ─── Q3 · every loaded exercise, one row per session: weights, reps, RPEs ───────────────
-- Reads session_history.log (stage30, 2026-09-24 on) and falls back to parsing the summary
-- text for older rows ("Set 2: 80 ×5 @8 ✓"; ✓ ticked, · logged not ticked). Persian digits
-- are normalised. Only exercises with at least one weight typed are returned.
-- ⚠ A weight carries its unit (2026-10-18): a bare number is kg, "45 lb" is pounds and "6 plates" is the count on a
-- machine's stack. `units` says which. Never compare or add numbers across units, and a plates number is a position on a
-- stack, never a load (5 → 6 plates is a step up on that machine, not 1 kg).
with params as (select 'ATHLETE_ID'::text id, date 'START' - 3 s, date 'END' e),
s as (select h.completed_on, h.day, h.summary, h.log from public.session_history h, params
      where h.athlete_id = params.id and h.completed_on between params.s and params.e and h.hidden_at is null),
from_log as (
  select s.completed_on, s.day, e->>'block' block, e->>'ex' ex, st.ord::int set_no,
         substring(translate(st.v->>'w', '۰۱۲۳۴۵۶۷۸۹٫', '0123456789.') from '[0-9]+(?:[.,][0-9]+)?') w,
         case when st.v->>'w' ~* '[0-9]\s*(lbs?|pounds?)([^a-z]|$)' then 'lb' when st.v->>'w' ~* '[0-9]\s*plates?([^a-z]|$)' then 'plates' else 'kg' end unit,
         nullif(st.v->>'n', '') reps, nullif(st.v->>'r', '') rpe, coalesce((st.v->>'d')::boolean, false) ticked
  from s, jsonb_array_elements(s.log) e,
       jsonb_array_elements(coalesce(e->'sets', '[]'::jsonb)) with ordinality st(v, ord)
  where jsonb_typeof(s.log) = 'array' and not coalesce((e->>'circuit')::boolean, false)),
lines as (
  select s.completed_on, s.day, l.n, translate(l.line, '۰۱۲۳۴۵۶۷۸۹٫', '0123456789.') line
  from s, unnest(string_to_array(s.summary, E'\n')) with ordinality l(line, n)
  where s.log is null or jsonb_typeof(s.log) <> 'array'),
tagged as (
  select *, max(case when line ~ '^• ' then n end) over w ex_n,
            max(case when line ~ '^\[' then n end) over w blk_n
  from lines window w as (partition by completed_on, day order by n)),
from_text as (
  select t.completed_on, t.day,
         trim(both '[]' from b.line) block,
         regexp_replace(x.line, '^•\s*(.*?)\s*(\([^()]*\))?\s*$', '\1') ex,
         substring(t.line from 'Set (\d+):')::int set_no,
         substring(t.line from 'Set \d+:\s*([0-9]+(?:[.,][0-9]+)?)') w,
         case when t.line ~* 'Set \d+:\s*[0-9]+(?:[.,][0-9]+)?\s*(lbs?|pounds?)([^a-z]|$)' then 'lb'
              when t.line ~* 'Set \d+:\s*[0-9]+(?:[.,][0-9]+)?\s*plates?([^a-z]|$)' then 'plates' else 'kg' end unit,
         substring(t.line from '×\s*([0-9]+)') reps,
         substring(t.line from '@\s*([0-9]+(?:\.[0-9])?)') rpe,
         t.line ~ '✓\s*$' ticked
  from tagged t
  join lines x on x.completed_on = t.completed_on and x.day = t.day and x.n = t.ex_n
  left join lines b on b.completed_on = t.completed_on and b.day = t.day and b.n = t.blk_n
  where t.line ~ '^\s+Set \d+:'),
sets as (select *, replace(w, ',', '.')::numeric wn
         from (select * from from_log union all select * from from_text) u),
ranked as (select *, max(wn) over (partition by completed_on, day, ex) top from sets)
select completed_on, day, block, ex,
       string_agg(coalesce(w, '–'), ' / ' order by set_no) weights,
       string_agg(distinct unit, '/') filter (where w is not null) units,   -- kg, lb or plates (2026-10-18): the numbers above are in THIS unit
       max(top) top,
       count(*) filter (where wn = top) sets_at_top,
       count(*) n_sets,
       string_agg(coalesce(reps, '·'), ' / ' order by set_no) reps,
       string_agg(coalesce(rpe, '–'), ' / ' order by set_no) rpes,
       count(*) filter (where ticked) ticked,
       -- RPE as a rep counter (2026-09-26): sum these over all rows. New athletes often tap the
       -- RPE button that matches their reps; over ~30% at 10 = the per-set RPE is not effort.
       count(rpe) n_rpe,
       count(*) filter (where rpe ~ '^10([.]0)?$') at_10
from ranked
group by completed_on, day, block, ex
having count(w) > 0
order by ex, completed_on;

-- ─── Q4 · everything else the athlete left, and the coach-only record ───────────────────
with params as (select 'ATHLETE_ID'::text id, date 'START' - 3 s, date 'END' e)
select
  -- body weight: {date: {kg, t}}; kg null = a deleted reading (tombstone)
  (select jsonb_object_agg(k, v) from public.athlete_progress ap,
          jsonb_each((ap.data->>(params.id || '_hab_wt'))::jsonb) j(k, v)
   where ap.athlete_id = params.id and k::date between params.s and params.e
     and v->>'kg' is not null)                                              weigh_ins,
  -- Personal Records ("The Ceiling" until 2026-09-26): [{lift, kg, w, r, rpe, d, t, test?, auto?}];
  -- auto = a new best the app wrote from a session's best set (t 0), test = a rep-max test
  (select jsonb_agg(c) from public.athlete_progress ap,
          jsonb_array_elements((ap.data->>(params.id || '_1rm'))::jsonb) c
   where ap.athlete_id = params.id and not coalesce((c->>'del')::boolean, false))  ceiling,
  -- (public.messages is no longer read: the in-app chat went, and Amir answers only on WhatsApp)
  (select jsonb_agg(jsonb_build_object('date', c.call_date, 'week', c.week, 'summary', c.summary,
                                       'done', c.sessions_done, 'planned', c.sessions_planned) order by c.call_date)
   from public.call_logs c where c.athlete_id = params.id
     and c.call_date between params.s and params.e)                          calls,
  -- the log's head (profile, ledger, roadmap) + the latest cycle's sections; the same slice as
  -- /program-design's queries.sql Q1. It comes back whole when the log has one cycle, or no finished
  -- profile (none yet, or one marked "status: partial"), so the Debrief can say what the profile misses.
  (select case when k > 1 and cl_body_has_profile
      then substring(body from '^(.*?)\n## Cycle')
        || E'\n\n[Older cycle sections left out.]\n'
        || substring(body from ('\n## Cycle 0*' || n || '\M.*'))
      else body end
   from (select cl.body,
           (cl.body ~ '```profile' and cl.body !~ '\nstatus:\s*partial') cl_body_has_profile,
           (select max(m[1]::int) from regexp_matches(cl.body, '\n## Cycle 0*(\d+)', 'g') m) n,
           (select count(distinct m[1]::int) from regexp_matches(cl.body, '\n## Cycle 0*(\d+)', 'g') m) k
         from public.coaching_logs cl where cl.athlete_id = params.id) lg)                coaching_log
from params;

-- ─── Q5 · Court Log (stage116): what the athlete played or did outside the plan. INFORMATION ONLY (REC-7) ──────
-- Tennis, padel and matches are court time; a run or anything else is "other". Week 0 = the 3 days before startDate.
-- It explains recovery and the training days (a hard match the night before a heavy session); it never changes a load by
-- itself: what it suggests goes to Amir as a question.
with params as (select 'ATHLETE_ID'::text id, date 'START' s, date 'END' e)
select greatest(0, (a.day - params.s) / 7 + 1)                         as week,
       case when a.kind in ('tennis', 'padel', 'match') then 'court' else 'other' end as k,
       a.kind, count(*) as n, sum(a.minutes) as minutes,
       count(*) filter (where a.effort = 'hard') as hard,
       string_agg(to_char(a.day, 'Dy DD Mon') || ' ' || a.minutes || 'm ' || a.effort, ', ' order by a.day) as days
from public.activity_log a, params
where a.athlete_id = params.id and a.day between params.s - 3 and params.e
group by 1, 2, 3 order by 1, 2, 3;

-- ─── Q6 · The monthly goal (career_goals, stage75; L10): every goal from the cycle's months to next month ──────────
-- One line Amir writes, one tick. A goal is for a CALENDAR month, so a 5-week cycle touches two or three of them.
-- `can_write` = the server still takes a write or a tick for that month (coach_set_goal: last, this or next month).
with params as (select 'ATHLETE_ID'::text id, date 'START' s, date 'END' e),
months as (select generate_series(date_trunc('month', params.s - 3), date_trunc('month', current_date) + interval '1 month', interval '1 month')::date m
           from params)
select to_char(months.m, 'FMMonth YYYY') as month, g.line, g.done_at::date as done,
       months.m between (date_trunc('month', current_date) - interval '1 month')::date
                    and (date_trunc('month', current_date) + interval '1 month')::date as can_write
from months cross join params
left join public.career_goals g on g.athlete_id = params.id and g.month = months.m
order by months.m;

-- ─── Q8 · Stacked (#144, round 14, 2026-11-24): the bundle scripts/recovery/stacked.js reads. INFORMATION ONLY (REC-7) ──────
-- The same line coach.html shows on the athlete's file (The work → Stacked): big gym days next to hard court, hard days in a row,
-- leg days with 3+ sets at RPE 9-10 followed within two days by another leg day, check-ins after big days against the rest. The
-- script runs coach.html's own functions on this bundle, so the numbers are the dashboard's. Field selection only, no rules here:
-- the sessions from 30 days before the window (the athlete's usual load) with the parts of each log the read uses, the Court Log
-- around the window, and the approved Spine entries the logs name (their body areas and impact).
with params as (select 'ATHLETE_ID'::text id, date 'START' s, date 'END' e),
ses as (
  select s.completed_on, s.day, s.session_rpe, s.duration_min, s.fin, s.readiness,
         (select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
             'ex', x->>'ex', 'block', x->>'block', 'circuit', (x->>'circuit')::boolean,
             'items', (select jsonb_agg(jsonb_build_object('name', it->>'name')) from jsonb_array_elements(coalesce(x->'items', '[]'::jsonb)) it),
             'rounds', (select jsonb_agg(jsonb_build_object('r', ro->>'r')) from jsonb_array_elements(coalesce(x->'rounds', '[]'::jsonb)) ro),
             'sets', (select jsonb_agg(jsonb_build_object('r', st->>'r', 'w', nullif(st->>'w', ''), 'd', (st->>'d')::boolean))
                      from jsonb_array_elements(coalesce(x->'sets', '[]'::jsonb)) st)))), '[]'::jsonb)
          from jsonb_array_elements(case when jsonb_typeof(s.log) = 'array' then s.log else '[]'::jsonb end) x) as log
  from public.session_history s, params
  where s.athlete_id = params.id and s.hidden_at is null and s.completed_on between params.s - 30 and params.e),
names as (
  select distinct lower(n) n from ses, jsonb_array_elements(ses.log) x,
    lateral (select x->>'ex' union all select it->>'name' from jsonb_array_elements(coalesce(x->'items', '[]'::jsonb)) it) v(n)
  where n is not null)
select jsonb_build_object(
  'from', (select s from params)::text, 'to', (select e from params)::text,
  'sessions', (select coalesce(jsonb_agg(to_jsonb(ses) order by ses.completed_on, ses.day), '[]'::jsonb) from ses),
  'acts', (select coalesce(jsonb_agg(jsonb_build_object('day', a.day, 'kind', a.kind, 'mins', a.minutes, 'effort', a.effort) order by a.day), '[]'::jsonb)
           from public.activity_log a, params where a.athlete_id = params.id and a.day between params.s - 3 and params.e + 1),
  'spine', (select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'name', e.name, 'aliases', e.aliases, 'status', e.status,
                                                          'loads', e.loads, 'impact', e.impact)), '[]'::jsonb)
            from public.exercises e
            where e.status = 'approved' and (lower(e.name) in (select n from names)
               or exists (select 1 from unnest(coalesce(e.aliases, '{}'::text[])) al where lower(al) in (select n from names))))
) as bundle;
