-- stage48 — two coach.html writes become one transaction each (2026-10-10, coach.html audit
-- SERVER-9 / HARNESS-7 and SPINE-5). Safe to re-run.
--
-- 1. coach_delete_training_history(athlete)
--    "Delete training history" was two separate deletes from the page (session_history, then
--    athlete_progress). A failure between them left the sessions gone and the snapshot standing; the
--    page could say so but not undo it. Now one call: both deletes or neither, and the counts come back.
--
-- 2. coach_save_spine(id, entry, entry_snap, coach, coach_snap)
--    The Exercises editor saved in two steps (exercises, then exercise_coach), each read-compare-write
--    from the page, so a failure on the second left the entry saved and the coach-only half not, and the
--    coach half had no lock at all between its read and its write. Now one call that, inside one
--    transaction and holding both rows locked:
--      a. re-reads both rows,
--      b. refuses (writes NOTHING, to either table) when someone else changed a column the coach is also
--         changing since the page read it (the same rule the page applied: live differs from what the
--         page read AND from what the coach is writing). Returns {ok:false, entry:{cols,live}, coach:{cols,live}}
--         with the half or halves that clashed,
--      c. otherwise writes only the columns sent, and returns {ok:true, entry, coach}: the rows as saved
--         (null for a half that was not sent).
--    Claude's /spine Upkeep writes the same rows by SQL, so the lock matters: a /spine write that lands
--    between the page's read and its write is waited for and seen, not overwritten.
--    The page sends the values it read for the columns it is changing (entry_snap / coach_snap); a
--    missing key counts as null. Only the columns the editor owns can be written here.
--
-- Both are coach-only (is_coach()), SECURITY DEFINER, and not callable by anon.

-- ── 1. Delete training history ────────────────────────────────────────────────
create or replace function public.coach_delete_training_history(p_athlete_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_sessions integer; v_progress integer;
begin
  if not public.is_coach() then
    raise exception 'coach only';
  end if;
  if coalesce(btrim(p_athlete_id), '') = '' then
    raise exception 'which athlete?';
  end if;
  with d as (delete from public.session_history where athlete_id = p_athlete_id returning 1)
    select count(*) into v_sessions from d;
  with d as (delete from public.athlete_progress where athlete_id = p_athlete_id returning 1)
    select count(*) into v_progress from d;
  return jsonb_build_object('sessions', v_sessions, 'progress', v_progress);
end; $function$;
revoke execute on function public.coach_delete_training_history(text) from public, anon;
grant execute on function public.coach_delete_training_history(text) to authenticated;

-- ── 2. The Spine save ─────────────────────────────────────────────────────────
create or replace function public.coach_save_spine(
  p_id          text,
  p_entry       jsonb,
  p_entry_snap  jsonb,
  p_coach       jsonb,
  p_coach_snap  jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  -- The columns the editor owns. Anything else (id, updated_at, Claude's bookkeeping columns) is refused.
  c_entry text[] := array['name','aliases','pattern','qualities','purpose','tennis','cues','equipment','loads',
                          'easier','harder','alts','video','status','impact','muscles'];
  c_coach text[] := array['sfr','flags','notes','credits','cost'];
  v_entry   jsonb := case when jsonb_typeof(p_entry) = 'object' then p_entry else '{}'::jsonb end;
  v_coach   jsonb := case when jsonb_typeof(p_coach) = 'object' then p_coach else '{}'::jsonb end;
  v_esnap   jsonb := case when jsonb_typeof(p_entry_snap) = 'object' then p_entry_snap else '{}'::jsonb end;
  v_csnap   jsonb := case when jsonb_typeof(p_coach_snap) = 'object' then p_coach_snap else '{}'::jsonb end;
  v_live_e  jsonb;
  v_live_c  jsonb;
  v_clash_e text[];
  v_clash_c text[];
  v_k       text;
  v_set     text;
  v_cols    text;
  v_out_e   jsonb;
  v_out_c   jsonb;
  v_res     jsonb;
begin
  if not public.is_coach() then
    raise exception 'coach only';
  end if;

  for v_k in select jsonb_object_keys(v_entry) loop
    if not (v_k = any (c_entry)) then raise exception 'exercises.% cannot be written from the editor', v_k; end if;
  end loop;
  for v_k in select jsonb_object_keys(v_coach) loop
    if not (v_k = any (c_coach)) then raise exception 'exercise_coach.% cannot be written from the editor', v_k; end if;
  end loop;

  -- Lock the entry, then its coach-only row (always in this order). A concurrent writer is waited for,
  -- and READ COMMITTED hands back the row as it was committed.
  select to_jsonb(e) into v_live_e from public.exercises e where e.id = p_id for update;
  if v_live_e is null then
    raise exception 'this entry is no longer on the server (%). Refresh.', p_id;
  end if;
  select to_jsonb(c) into v_live_c from public.exercise_coach c where c.id = p_id for update;

  -- A column clashes when it differs from what the page read AND from what the coach is writing.
  select coalesce(array_agg(k order by k), '{}') into v_clash_e
    from jsonb_object_keys(v_entry) k
   where (v_live_e -> k) is distinct from coalesce(v_esnap -> k, 'null'::jsonb)
     and (v_live_e -> k) is distinct from (v_entry -> k);
  if v_live_c is null then
    -- No coach-only row yet. One that appeared since the page read is a clash on every column that
    -- differs from what is being written; a row that is still absent has nothing to clash with.
    v_clash_c := '{}';
  else
    select coalesce(array_agg(k order by k), '{}') into v_clash_c
      from jsonb_object_keys(v_coach) k
     where (v_live_c -> k) is distinct from coalesce(v_csnap -> k, 'null'::jsonb)
       and (v_live_c -> k) is distinct from (v_coach -> k);
  end if;
  if cardinality(v_clash_e) > 0 or cardinality(v_clash_c) > 0 then
    -- Nothing is written. Built key by key: jsonb_strip_nulls is recursive and would drop the live
    -- rows' own null columns, which the page needs to see.
    v_res := jsonb_build_object('ok', false);
    if cardinality(v_clash_e) > 0 then
      v_res := v_res || jsonb_build_object('entry', jsonb_build_object('cols', to_jsonb(v_clash_e), 'live', v_live_e));
    end if;
    if cardinality(v_clash_c) > 0 then
      v_res := v_res || jsonb_build_object('coach', jsonb_build_object('cols', to_jsonb(v_clash_c), 'live', v_live_c));
    end if;
    return v_res;
  end if;

  -- The entry half: only the columns sent, typed from the JSON by the table's own row type.
  if v_entry <> '{}'::jsonb then
    select string_agg(format('%I = r.%I', k, k), ', ') into v_set from jsonb_object_keys(v_entry) k;
    execute format('update public.exercises e set %s, updated_by = %L from jsonb_populate_record(null::public.exercises, $1) r where e.id = $2',
                   v_set, 'coach') using v_entry, p_id;
  end if;

  -- The coach-only half: update the row, or create it with only the columns sent (the rest take their defaults).
  if v_coach <> '{}'::jsonb then
    if v_live_c is null then
      select string_agg(format('%I', k), ', '), string_agg(format('r.%I', k), ', ')
        into v_cols, v_set from jsonb_object_keys(v_coach) k;
      execute format('insert into public.exercise_coach (id, %s) select $2, %s from jsonb_populate_record(null::public.exercise_coach, $1) r',
                     v_cols, v_set) using v_coach, p_id;
    else
      select string_agg(format('%I = r.%I', k, k), ', ') into v_set from jsonb_object_keys(v_coach) k;
      execute format('update public.exercise_coach c set %s from jsonb_populate_record(null::public.exercise_coach, $1) r where c.id = $2',
                     v_set) using v_coach, p_id;
    end if;
  end if;

  select to_jsonb(e) into v_out_e from public.exercises e where e.id = p_id;
  select to_jsonb(c) into v_out_c from public.exercise_coach c where c.id = p_id;
  return jsonb_build_object('ok', true,
    'entry', case when v_entry <> '{}'::jsonb then v_out_e end,
    'coach', case when v_coach <> '{}'::jsonb then v_out_c end);
end; $function$;
revoke execute on function public.coach_save_spine(text, jsonb, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.coach_save_spine(text, jsonb, jsonb, jsonb, jsonb) to authenticated;
