-- stage111_trained_faces.sql — the day's "trained" line carries each person's face, so the crew can cheer them (2026-11-20)
-- NUMBER: applied to the live project on 2026-11-20 as migration `stage110_trained_faces`; renumbered 111 in the repo because stage110_my_lang.sql
-- had taken 110. The markers it writes into get_bell() say stage110, as applied.
--
-- Amir, round 10 (Crew Feed Facelift, https://claude.ai/artifact/5gPzro3bCbP93CN4vysaGr), idea 114 Trained Today, then "go with your picks"
-- on the feed pass (https://claude.ai/artifact/8kYKCuynCHXZFhhgBKoQkL, direction B). The day's session line in get_bell() names who trained
-- (`names`) and nothing else, so the app cannot draw a face or send a Cheer from it: 32 sessions a week that nobody could answer.
--
-- What this does: each `sess` item in get_bell() also carries `people`, one object per member who trained that day and is not the viewer:
--   { ck, fv, who, cheered }   ck = crew_key, fv = face version, who = the crew name, cheered = the viewer already cheered them today (UTC,
--   the same day crew_cheer() counts). The same members as `names` (session switch on, from the day they joined), in the same order.
-- `names` stays exactly as it was, so a phone that has not updated draws the words line as today.
--
-- Nothing else changes: no table, no column, no grant, no backup or erase list. One guarded textual patch, like stages 101/104: the line is
-- found exactly once or the stage refuses and changes nothing. Safe to re-run.
-- The way back: run the patch in reverse (swap old_text and new_text below).

-- ── 0. The guard ───────────────────────────────────────────────────────────
do $stage111_guard$
begin
  if to_regprocedure('public.get_bell(text)') is null or to_regclass('public.crew_cheers') is null or to_regprocedure('public.crew_face_v(text)') is null then
    raise exception 'stage111: get_bell(), crew_cheers or crew_face_v() is missing (stages 81 and 96). Nothing was changed.';
  end if;
end
$stage111_guard$;

-- ── 1. The patch ───────────────────────────────────────────────────────────
do $stage111_patch$
declare p record; d text; n int;
begin
  for p in
    select * from (values
      -- the day's people: the member list carries crew_key; the face version and today's cheer are read per person
      ('public.get_bell(text)',
       $a$    select f.day as d, m.athlete_id, m.name, count(*) as n$a$,
       $a$    select f.day as d, m.athlete_id, m.name, m.crew_key, count(*) as n   /* stage110: crew_key for the day's faces */$a$),
      ('public.get_bell(text)',
       $a$     group by f.day, m.athlete_id, m.name),$a$,
       $a$     group by f.day, m.athlete_id, m.name, m.crew_key),$a$),
      ('public.get_bell(text)',
       $a$             'me', bool_or(s.athlete_id is not distinct from v_id)) as j
      from sess s group by s.d),$a$,
       $a$             'me', bool_or(s.athlete_id is not distinct from v_id),
             'people', coalesce(jsonb_agg(jsonb_build_object('ck', s.crew_key, 'fv', public.crew_face_v(s.athlete_id), 'who', s.name,
                         'cheered', exists (select 1 from public.crew_cheers c where c.athlete_id = v_id and c.to_athlete = s.athlete_id
                                                                         and c.day = (now() at time zone 'UTC')::date))
                       order by lower(s.name)) filter (where s.athlete_id is distinct from v_id), '[]'::jsonb)) as j   -- stage110
      from sess s group by s.d),$a$)
    ) as t(fn, old_text, new_text)
  loop
    d := pg_get_functiondef(p.fn::regprocedure);
    if position(p.new_text in d) > 0 then continue; end if;                   -- patched already (a re-run)
    n := (length(d) - length(replace(d, p.old_text, ''))) / length(p.old_text);
    if n <> 1 then
      raise exception 'stage111: % is not what this patch expects (this line was found % times, not once): %. Nothing was changed.', p.fn, n, left(p.old_text, 80);
    end if;
    execute replace(d, p.old_text, p.new_text);
  end loop;
end
$stage111_patch$;

-- ── 2. The check ───────────────────────────────────────────────────────────
do $stage111_check$
begin
  if position('''people'', coalesce(jsonb_agg(jsonb_build_object(''ck'', s.crew_key' in pg_get_functiondef('public.get_bell(text)'::regprocedure)) = 0 then
    raise exception 'stage111: get_bell() is not the new text';
  end if;
  raise notice 'stage111: applied';
end
$stage111_check$;
