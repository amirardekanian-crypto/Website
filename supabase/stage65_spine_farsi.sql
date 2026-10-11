-- stage65 — the Farsi course reads its exercises from the Spine (2026-10-12; Amir: "now do the Farsi course exercises
-- the same way as it should be fed from spine", and "Live, one source"). Safe to re-run.
--
-- Why: the course app (/tennis/app/) kept its own Farsi copy of each exercise's cues, purpose and court line, so a fix
-- on the Spine never reached a buyer, and none of its 114 exercises had steps. Now each Spine entry also holds the Farsi
-- of the four texts it shows (CUE-7): steps_fa, cues_fa, purpose_fa, tennis_fa. The course names each exercise's entry
-- (`spine` on the exercise in tps_content) and reads them live through get_exercises_fa(), keeping a copy for offline.
-- A change to an entry's English steps, cues, purpose or On court line changes its Farsi in the same run (CUE-6's story).
--
-- 1. public.exercises: steps_fa text[] (0 to 6, as steps: spine_steps_ok), cues_fa jsonb ({good:[...], bad:[...]} or
--    null), purpose_fa text, tennis_fa text.
-- 2. get_exercises_fa(): id, name, video and the four Farsi texts of every APPROVED entry that has any. Anyone may call
--    it, like get_exercises(): the English of the same text is already public, and the course's demo needs it.
-- 3. coach_save_spine(): the four columns join the editor's list (stage64's function otherwise unchanged).
--
-- Apply with the Supabase MCP apply_migration, name stage65_spine_farsi. Check after:
--   select count(*) filter (where cardinality(steps_fa) > 0) from public.exercises;
--   select jsonb_typeof(public.get_exercises_fa());   -- 'array'

-- ── 1. The columns ────────────────────────────────────────────────────────────
alter table public.exercises add column if not exists steps_fa text[] not null default '{}';
alter table public.exercises add column if not exists cues_fa jsonb;
alter table public.exercises add column if not exists purpose_fa text;
alter table public.exercises add column if not exists tennis_fa text;
alter table public.exercises drop constraint if exists exercises_steps_fa_ok;
alter table public.exercises add constraint exercises_steps_fa_ok check (public.spine_steps_ok(steps_fa));
alter table public.exercises drop constraint if exists exercises_cues_fa_ok;
alter table public.exercises add constraint exercises_cues_fa_ok check (cues_fa is null or (jsonb_typeof(cues_fa) = 'object'
  and jsonb_typeof(coalesce(cues_fa->'good', '[]'::jsonb)) = 'array' and jsonb_typeof(coalesce(cues_fa->'bad', '[]'::jsonb)) = 'array'));
comment on column public.exercises.steps_fa is 'stage65: the Farsi of steps, for the course app (get_exercises_fa). Changed with the English, in the same run.';

-- ── 2. What the course reads ──────────────────────────────────────────────────
create or replace function public.get_exercises_fa()
 returns jsonb
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', e.id, 'name', e.name, 'video', e.video,
           'steps', to_jsonb(coalesce(e.steps_fa, '{}'::text[])), 'cues', e.cues_fa,
           'purpose', e.purpose_fa, 'tennis', e.tennis_fa) order by e.id), '[]'::jsonb)
  from public.exercises e
  where e.status = 'approved'
    and (cardinality(e.steps_fa) > 0 or e.cues_fa is not null or e.purpose_fa is not null or e.tennis_fa is not null);
$function$;
revoke all on function public.get_exercises_fa() from public;
grant execute on function public.get_exercises_fa() to anon, authenticated;

-- ── 3. The editor's save (stage64's, with the Farsi columns) ──────────────────────────────────────────────────────
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
  -- stage64: steps (How to do it), and suggested_changes, so a Save that approves or discards Claude's drafts
  -- takes them off the list in the same transaction. stage65: the Farsi of the four texts the course reads.
  c_entry text[] := array['name','aliases','pattern','qualities','purpose','tennis','cues','equipment','loads',
                          'easier','harder','alts','video','status','impact','muscles','steps',
                          'steps_fa','cues_fa','purpose_fa','tennis_fa'];
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
