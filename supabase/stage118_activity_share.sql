-- stage118_activity_share.sql — the athlete chooses whether the crew sees their own activity (2026-11-21)
--
-- Amir: "let people choose if they allow other people to see their activity or no like other things in the setting". Court Log (stage116)
-- kept activity_log private: the athlete and the coach only. This adds a switch beside the others in What the crew sees, `activity`, which is
-- OFF until the athlete turns it on (every other switch is on by default; this one was promised private, so it stays private unless chosen).
--
-- What this does:
--   1. crew_kinds() accepts `activity` as well as crew_kind_list(). crew_kind_list() itself is untouched, so get_bell()'s moments, which treat a
--      missing switch as on, never meet it.
--   2. crew_me() returns kinds.activity (false unless the athlete set it true).
--   3. crew_page() carries `activity` on the page of a crew member who turned it on: their last 7 days, newest first, each { day, kind, minutes }.
--      Never how hard it was (effort never reaches the crew). Your own page carries it too while it is on, and its kinds say activity on/off.
-- No table, no column, no grant, no backup or erase list (activity_log is in both since stage116). Guarded textual patches; safe to re-run.

do $stage118_patch$
declare p record; d text; n int;
begin
  for p in select * from (values
    ('public.crew_kinds(jsonb)',
     $a$where k.key = any (public.crew_kind_list()) and jsonb_typeof(k.value) = 'boolean';$a$,
     $a$where k.key = any (public.crew_kind_list() || array['activity']) and jsonb_typeof(k.value) = 'boolean';   -- stage118: activity$a$),
    ('public.crew_me(text)',
     $a$'kinds', (select jsonb_object_agg(k.kind, coalesce((c.kinds ->> k.kind)::boolean, true)) from unnest(public.crew_kind_list()) k(kind)),$a$,
     $a$'kinds', (select jsonb_object_agg(k.kind, coalesce((c.kinds ->> k.kind)::boolean, true)) from unnest(public.crew_kind_list()) k(kind))
               || jsonb_build_object('activity', coalesce((c.kinds ->> 'activity')::boolean, false)),   -- stage118: off unless chosen$a$),
    ('public.crew_page(uuid,text)',
     $a$  return v_out || jsonb_build_object('at', now());$a$,
     $a$  -- stage118: their own activity, when they chose to show it (kind, day, minutes; never how hard)
  if v_member and coalesce((c.kinds ->> 'activity')::boolean, false) then
    v_out := v_out || jsonb_build_object('activity', (select coalesce(jsonb_agg(jsonb_build_object('day', a.day, 'kind', a.kind, 'minutes', a.minutes)
                                                                                  order by a.day desc, a.created_at desc), '[]'::jsonb)
                                                         from public.activity_log a where a.athlete_id = v_subj and a.day >= current_date - 6));
  end if;
  if v_own then
    v_out := v_out || jsonb_build_object('kinds', coalesce(v_out -> 'kinds', '{}'::jsonb) || jsonb_build_object('activity', coalesce((c.kinds ->> 'activity')::boolean, false)));
  end if;
  return v_out || jsonb_build_object('at', now());$a$)
  ) as t(fn, old_text, new_text)
  loop
    d := pg_get_functiondef(p.fn::regprocedure);
    if position('stage118' in d) > 0 then continue; end if;
    n := (length(d) - length(replace(d, p.old_text, ''))) / length(p.old_text);
    if n <> 1 then raise exception 'stage118: % is not what this patch expects (found % times). Nothing was changed.', p.fn, n; end if;
    execute replace(d, p.old_text, p.new_text);
  end loop;
end
$stage118_patch$;

do $stage118_check$
begin
  if position('stage118' in pg_get_functiondef('public.crew_kinds(jsonb)'::regprocedure)) = 0
     or position('stage118' in pg_get_functiondef('public.crew_me(text)'::regprocedure)) = 0
     or position('stage118' in pg_get_functiondef('public.crew_page(uuid,text)'::regprocedure)) = 0 then
    raise exception 'stage118: a function is not the new text';
  end if;
  raise notice 'stage118: applied';
end
$stage118_check$;
