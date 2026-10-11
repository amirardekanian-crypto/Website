-- stage52 — How to do it: plain steps on every Spine entry (2026-10-11, the exercise card blueprint; Amir: "all
-- recommended, go ahead"). Safe to re-run. Test it with scripts/test_spine_sql.sh BEFORE it goes near the project.
--
-- Why: 141 of the 320 approved entries have no video, and 194 live cards sit on one. With no video an athlete got three
-- short cues and nothing else: nothing said where to stand, how the rep ends or how to put the weight down. The fix is one
-- new thing on the entry, written once for anyone (CUE-6), and each part of the card gets one job (CUE-7): the steps say
-- how, the three cues the key point, a feel or check and the one fault, the card's pill what this athlete changes, the
-- Coach's Note what only this athlete needs.
--
-- 1. public.exercises.steps  text[] not null default '{}'
--    0 to 6 steps, each non-empty and at most 140 characters, held by public.spine_steps_ok() (immutable, like
--    spine_credits_ok()). The writing rules (3 to 5 one-phase steps, under about 90 characters, no dose, no side for one
--    athlete) are /spine's and draft_sql.py's: the database refuses only what can never be right.
--
-- 2. get_exercises() sends 'steps' ([] when none), for approved entries only, like everything else it sends.
--    Re-created from the live definition (read 2026-10-11 with pg_get_functiondef) with that one key added. A phone
--    with an older spinecache has no 'steps' and reads it as [].
--
-- 3. coach_save_spine() may write 'steps' (the entry half) and 'suggested_changes' (the coach-only half).
--    Claude's draft steps, cues or purpose for an APPROVED entry wait in exercise_coach.suggested_changes (stage43's
--    items: {field, old, new, why, from, at}). coach.html pre-fills the editor's boxes from an item whose "old" still
--    equals the live value, and Amir's Save is the approval: the same call writes the entry and the list without the
--    items he decided (applied or discarded). So the two go in ONE guarded transaction, with stage48's rules unchanged:
--    is_coach(), both rows locked (exercises first), and nothing written when someone else changed a column this save
--    also changes. A draft Claude adds while the page is open changes suggested_changes, so that save is refused and the
--    page shows the new list; Save again goes through. Re-created from the live definition (2026-10-11); only the two
--    whitelists changed.
--
-- Nothing else changes: spine_versions (stage49) records every column already, so a steps change is in an entry's
-- History and can be undone; the backup (BACKUP_TABLES) reads whole rows; the grants are as they were.
--
-- Apply with the Supabase MCP apply_migration (project bvipfipbdcyqnbczjmaq), name stage52_spine_steps.
-- Check after applying:
--   select column_name, data_type, column_default from information_schema.columns
--    where table_schema = 'public' and table_name = 'exercises' and column_name = 'steps';
--   select count(*) filter (where cardinality(steps) = 0) no_steps, count(*) from public.exercises where status = 'approved';
--   select jsonb_typeof((public.get_exercises()) -> 0 -> 'steps');   -- 'array'

-- ── 1. The column and its check ───────────────────────────────────────────────
create or replace function public.spine_steps_ok(s text[])
returns boolean
language sql
immutable
set search_path to ''
as $function$
  -- One list, 0 to 6 lines, none blank (only spaces, tabs or line breaks count as blank), none over 140 characters.
  select s is null or (coalesce(array_ndims(s), 1) = 1 and coalesce(cardinality(s), 0) <= 6 and not exists (
    select 1 from unnest(s) x where x is null or x !~ '\S' or char_length(x) > 140))
$function$;

alter table public.exercises add column if not exists steps text[] not null default '{}';
alter table public.exercises drop constraint if exists exercises_steps_ok;
alter table public.exercises add constraint exercises_steps_ok check (public.spine_steps_ok(steps));
comment on column public.exercises.steps is
  'How to do it (stage52, CUE-6): 0 to 6 plain steps for anyone, setup to a safe finish, each at most 140 characters. Never a dose or a side. Sent to phones by get_exercises() for approved entries.';

-- ── 2. What a phone reads ─────────────────────────────────────────────────────
create or replace function public.get_exercises()
 returns jsonb
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', e.id, 'name', e.name, 'aliases', e.aliases, 'pattern', e.pattern,
           'qualities', e.qualities, 'purpose', e.purpose, 'tennis', e.tennis,
           'cues', e.cues, 'equipment', e.equipment, 'loads', e.loads, 'impact', e.impact,
           'easier', e.easier, 'harder', e.harder, 'alts', e.alts, 'video', e.video,
           -- stage52: How to do it, [] when none
           'steps', to_jsonb(coalesce(e.steps, '{}'::text[])),
           -- stage42: muscle names and 1/0.5 only. Never cost, sfr or flags.
           'muscles', coalesce(nullif(c.credits, '{}'::jsonb), e.muscles)
         ) order by e.name), '[]'::jsonb)
  from public.exercises e
  left join public.exercise_coach c on c.id = e.id
  where e.status = 'approved';
$function$;
revoke all on function public.get_exercises() from public;
grant execute on function public.get_exercises() to anon, authenticated;

-- ── 3. The editor's save ──────────────────────────────────────────────────────
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
  -- stage52: steps (How to do it), and suggested_changes, so a Save that approves or discards Claude's drafts
  -- takes them off the list in the same transaction.
  c_entry text[] := array['name','aliases','pattern','qualities','purpose','tennis','cues','equipment','loads',
                          'easier','harder','alts','video','status','impact','muscles','steps'];
  c_coach text[] := array['sfr','flags','notes','credits','cost','suggested_changes'];
  -- SQL NULL and JSON null both mean "nothing for that half"; anything else that is not an object is refused below.
  v_entry   jsonb := coalesce(nullif(p_entry, 'null'::jsonb), '{}'::jsonb);
  v_coach   jsonb := coalesce(nullif(p_coach, 'null'::jsonb), '{}'::jsonb);
  v_esnap   jsonb := coalesce(nullif(p_entry_snap, 'null'::jsonb), '{}'::jsonb);
  v_csnap   jsonb := coalesce(nullif(p_coach_snap, 'null'::jsonb), '{}'::jsonb);
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
  -- A double-encoded or otherwise malformed payload must fail loudly: read as "{}" it came back ok:true having
  -- written nothing, and the page would have said Saved.
  if jsonb_typeof(v_entry) <> 'object' or jsonb_typeof(v_coach) <> 'object'
     or jsonb_typeof(v_esnap) <> 'object' or jsonb_typeof(v_csnap) <> 'object' then
    raise exception 'the entry, the coach-only part and their two snapshots must each be a JSON object';
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
