-- /program-design queries (2026-09-27: moved out of SKILL.md so /program-roadmap and /program-edit can
-- open these few lines instead of the whole design skill). Replace <id> with the athlete_id.
-- All read-only. Run each with the Supabase MCP (execute_sql).

-- ─── Q1 · THE CONTEXT PULL: everything design reads from the server, in ONE call ─────────────
-- Run once per athlete and keep the result for the whole run (roadmap, design, assemble). Never look
-- these up again one at a time, and never discover the schema: every table and column is named here.
-- ctx.log is the log's head (profile, ledger, roadmap) + everything from the latest cycle's first
-- section on. It comes back WHOLE when the log has one cycle, or no finished profile yet (no ```profile
-- block, or one marked "status: partial"), because design then builds the profile from all of it.
-- No exercise catalogue (2026-10-17): until then a `spine` column carried the whole Spine, ordered by SFR,
-- and reading it before choosing anchored every pick to what the library held. Design chooses first, then
-- matches the names once (SKILL.md → STEP 3 → THE SPINE) and reads Q4.
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
                    from public.session_history where athlete_id = '<id>' and duration_min > 10 and hidden_at is null
                     and completed_on >= current_date - 42 group by day) x))
               from public.session_history where athlete_id = '<id>' and hidden_at is null),
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
  'qualities', (select jsonb_agg(id order by sort) from public.qualities where status = 'approved'),
  -- Your game (stage96, 2026-10-24): what the athlete wrote about their sport in the app (sports, hand, backhand, side,
  -- plays_at, club, training_for, working_on, ig). null until they fill it in.
  'game', (select to_jsonb(g) - 'athlete_id' - 'updated_at' - 'ig' from public.athlete_profile g where g.athlete_id = '<id>')
) as ctx;

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

-- ─── Q4 · THE MATCH: what the Spine holds for the movements design CHOSE (after choosing, never before) ──
-- The ids come from the names check (SKILL.md → STEP 3 → THE SPINE: the checker's own resolver, run on a
-- stub of the chosen names). One row per matched entry: what design checks the pick against (flags
-- against the injury picture, credits and cost for the volume, qualities for the Quality check, video for
-- the film list) and the four layers a pill or a note_flag must not repeat (CUE-7). Once per run.
select e.id, e.name, e.status, e.pattern, c.sfr, c.flags, e.qualities, e.equipment, e.loads, e.impact,
       e.easier, e.harder, e.alts, e.video is not null as has_video,
       case when c.credits = '{}'::jsonb then 'none' else
         (select string_agg(k || ':' || w, ',' order by k) from jsonb_each_text(c.credits) t(k, w)) end as credits,
       c.cost, e.steps, e.cues, e.purpose, e.tennis
from public.exercises e left join public.exercise_coach c using (id)
where e.id in (<every id the names check found>)
order by e.id;

-- ─── Q5 · optional: the entries in some patterns, for a regression, a progression or a kit swap ──
-- Only AFTER a slot's own pick is written: to find an easier, harder or other-kit version of THAT pick,
-- or the variant for a REPLACE. Never to choose the pick. Every pattern you need in ONE call (PRC-6).
-- One line per entry: id|name|status|sfr|flags|equipment|easier>harder>alts
select string_agg(concat_ws('|', e.id, e.name, e.status, coalesce(c.sfr::text, '-'),
         coalesce(array_to_string(c.flags, ','), ''), coalesce(array_to_string(e.equipment, ','), ''),
         coalesce(array_to_string(e.easier, ','), '') || '>' || coalesce(array_to_string(e.harder, ','), '') || '>' ||
         coalesce(array_to_string(e.alts, ','), '')),
         E'\n' order by e.pattern, c.sfr nulls last, e.id) as entries
from public.exercises e left join public.exercise_coach c using (id)
where e.pattern in (<'pattern', …>);
