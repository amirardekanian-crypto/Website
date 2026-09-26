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
       (select jsonb_agg(c->>'title') from jsonb_array_elements(data->'notes'->'cards') c) as note_cards
from p;
-- Read the note cards themselves too (data->'notes'->'cards'): they hold promises
-- ("8 to 15 cm on a broad jump"), gates ("weight doesn't go up until I've cleared the film")
-- and rules ("week five you back off") that the report must check.

-- ─── Q2 · every session in the window ───────────────────────────────────────────────────
with params as (select 'ATHLETE_ID'::text id, date 'START' - 3 s, date 'END' e)
select h.completed_on, to_char(h.completed_on, 'Dy') dow, h.day, h.status, h.session_rpe srpe,
       h.duration_min mins, h.readiness->>'composite' rdy, h.readiness->>'sleep' sleep,
       h.readiness->>'soreness' sore, nullif(h.day_note, '') day_note, h.log is not null has_log
from public.session_history h, params
where h.athlete_id = params.id and h.completed_on between params.s and params.e
order by h.completed_on, h.day;

-- ─── Q3 · every loaded exercise, one row per session: weights, reps, RPEs ───────────────
-- Reads session_history.log (stage30, 2026-09-24 on) and falls back to parsing the summary
-- text for older rows ("Set 2: 80 ×5 @8 ✓"; ✓ ticked, · logged not ticked). Persian digits
-- are normalised. Only exercises with at least one weight typed are returned.
with params as (select 'ATHLETE_ID'::text id, date 'START' - 3 s, date 'END' e),
s as (select h.completed_on, h.day, h.summary, h.log from public.session_history h, params
      where h.athlete_id = params.id and h.completed_on between params.s and params.e),
from_log as (
  select s.completed_on, s.day, e->>'block' block, e->>'ex' ex, st.ord::int set_no,
         substring(translate(st.v->>'w', '۰۱۲۳۴۵۶۷۸۹٫', '0123456789.') from '[0-9]+(?:[.,][0-9]+)?') w,
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
  -- Personal Records (The Ceiling): [{lift, d, kg, reps, rpe, est | del}]
  (select jsonb_agg(c) from public.athlete_progress ap,
          jsonb_array_elements((ap.data->>(params.id || '_1rm'))::jsonb) c
   where ap.athlete_id = params.id and not coalesce((c->>'del')::boolean, false))  ceiling,
  (select jsonb_agg(jsonb_build_object('at', m.created_at, 'from', m.sender, 'body', m.body) order by m.created_at)
   from public.messages m where m.athlete_id = params.id
     and m.created_at::date between params.s and params.e)                  messages,
  (select jsonb_agg(jsonb_build_object('date', c.call_date, 'week', c.week, 'summary', c.summary,
                                       'done', c.sessions_done, 'planned', c.sessions_planned) order by c.call_date)
   from public.call_logs c where c.athlete_id = params.id
     and c.call_date between params.s and params.e)                          calls,
  (select body from public.coaching_logs cl where cl.athlete_id = params.id) coaching_log
from params;
