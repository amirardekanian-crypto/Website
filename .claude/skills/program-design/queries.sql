-- /program-design queries (2026-09-27: moved out of SKILL.md so /program-roadmap and /program-edit can
-- open these few lines instead of the whole design skill). Replace <id> with the athlete_id.
-- All read-only. Run each with the Supabase MCP (execute_sql).

-- ─── Q1 · THE CONTEXT PULL: everything design reads from the server, in ONE call ─────────────
-- Run once per athlete and keep the result for the whole run (roadmap, design, assemble). Never look
-- these up again one at a time, and never discover the schema: every table and column is named here.
-- ctx.log is the log's head (profile, ledger, roadmap) + everything from the latest cycle's first
-- section on. It comes back WHOLE when the log has one cycle, or no finished profile yet (no ```profile
-- block, or one marked "status: partial"), because design then builds the profile from all of it.
select jsonb_build_object(
  'row', (select jsonb_build_object(
            'has_workouts', jsonb_typeof(data->'workouts'->'days') = 'array',
            'cci', coalesce((data->>'currentCycleIndex')::int, 0),
            'athlete', data->'athlete', 'sport', data->'sport', 'cycles', data->'cycles',
            'notes', (select jsonb_agg(c->'title') from jsonb_array_elements(coalesce(data->'notes'->'cards', '[]'::jsonb)) c),
            'programme', (select jsonb_agg(jsonb_build_object('day', d->'id', 'tag', d->'focusTag', 'blocks',
                (select jsonb_agg(jsonb_build_object('t', b->'title', 'x',
                   (select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('n', e->'name', 'rx', e->'rx', 'rounds', e->'rounds',
                       'note', e->'note', 'test', e->'test',
                       'chips', (select jsonb_agg(coalesce(ch->'label', ch)) from jsonb_array_elements(case when jsonb_typeof(e->'chips') = 'array' then e->'chips' else '[]'::jsonb end) ch),
                       'items', (select jsonb_agg(i->'name') from jsonb_array_elements(case when jsonb_typeof(e->'items') = 'array' then e->'items' else '[]'::jsonb end) i))))
                    from jsonb_array_elements(b->'exercises') e)))
                 from jsonb_array_elements(d->'blocks') b)))
              from jsonb_array_elements(case when jsonb_typeof(data->'workouts'->'days') = 'array' then data->'workouts'->'days' else '[]'::jsonb end) d))
          from public.programs where athlete_id = '<id>'),
  'sessions', (select jsonb_build_object('n', count(*), 'last', max(completed_on),
                 'minutes_by_day', (select jsonb_object_agg(dd, m) from (select day as dd, round(avg(duration_min)) as m
                    from public.session_history where athlete_id = '<id>' and duration_min > 10
                     and completed_on >= current_date - 42 group by day) x))
               from public.session_history where athlete_id = '<id>'),
  'log', (select case when k > 1 and body ~ '```profile' and body !~ '\nstatus:\s*partial'
             then substring(body from '^(.*?)\n## Cycle')
               || E'\n\n[Older cycle sections left out: ctx.log_index lists every heading.]\n'
               || substring(body from ('\n## Cycle 0*' || n || '\M.*'))
             else body end
          from (select body,
                  (select max(m[1]::int) from regexp_matches(body, '\n## Cycle 0*(\d+)', 'g') m) as n,
                  (select count(distinct m[1]::int) from regexp_matches(body, '\n## Cycle 0*(\d+)', 'g') m) as k
                from public.coaching_logs where athlete_id = '<id>') lg),
  'log_index', (select jsonb_agg(m[1]) from public.coaching_logs l,
                  regexp_matches(l.body, '\n(## [^\n]+)', 'g') m where l.athlete_id = '<id>'),
  'cycle_names_in_use', (select jsonb_agg(distinct c->>'name') from public.programs p,
                         jsonb_array_elements(coalesce(p.data->'cycles', '[]'::jsonb)) c),
  'qualities', (select jsonb_agg(id order by sort) from public.qualities where status = 'approved')
) as ctx,
(select string_agg(concat_ws('|', e.id, e.name, coalesce(e.pattern, ''), e.status, coalesce(c.sfr::text, '-'),
          coalesce(array_to_string(c.flags, ','), ''), coalesce(array_to_string(e.qualities, ','), ''),
          coalesce(array_to_string(e.loads, ','), ''), coalesce(e.impact, '-'),
          coalesce(array_to_string(e.easier, ','), '') || '>' || coalesce(array_to_string(e.harder, ','), '') || '>' ||
          coalesce(array_to_string(e.alts, ','), ''),
          coalesce(array_to_string(e.aliases, ';'), ''), case when e.video is null then 'novideo' else 'video' end,
          case when c.credits is null then '-' when c.credits = '{}'::jsonb then 'none' else
            (select string_agg(k || ':' || w, ',' order by k) from jsonb_each_text(c.credits) t(k, w)) end,
          coalesce(c.cost, '-')),
          E'\n' order by e.pattern, c.sfr nulls last, e.id)
 from public.exercises e left join public.exercise_coach c using (id)) as spine;

-- ─── Q2 · the coaching log slice alone (what /program-edit Step 0 reads) ─────────────────────
-- The same slice as Q1's ctx.log: the head + the latest cycle's sections, or the whole log while it
-- has one cycle or no finished profile.
select case when k > 1 and body ~ '```profile' and body !~ '\nstatus:\s*partial'
         then substring(body from '^(.*?)\n## Cycle')
           || E'\n\n[Older cycle sections left out.]\n'
           || substring(body from ('\n## Cycle 0*' || n || '\M.*'))
         else body end as log
from (select body,
        (select max(m[1]::int) from regexp_matches(body, '\n## Cycle 0*(\d+)', 'g') m) as n,
        (select count(distinct m[1]::int) from regexp_matches(body, '\n## Cycle 0*(\d+)', 'g') m) as k
      from public.coaching_logs where athlete_id = '<id>') lg;

-- ─── Q3 · one older section, by its heading (ctx.log_index lists them) ───────────────────────
-- Read it up to the next "## " heading.
select substring(body from position('<the ## heading>' in body) for 15000)
from public.coaching_logs where athlete_id = '<id>';
