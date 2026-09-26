-- stage38_publish_cycle.sql — publish a new cycle in ONE call (2026-09-26)
--
-- Amir, 2026-09-26: yes to "publish a cycle in one database call instead of several approval
-- prompts". /program-assemble Step 7 used about six calls: archive + bump, workouts, notes +
-- cycles, the fingerprint, and two coaching-log splices. Each was an approval prompt for Amir and
-- a place for a half-written publish to stop. publish_cycle() does all of it in one transaction,
-- all or nothing, and the version trigger keeps ONE snapshot instead of three (program_versions
-- keeps only the last 20 per athlete, so a staged publish used to spend three of them).
--
-- What it keeps from the staged publish, deliberately:
--   * the archive entry is built SERVER-SIDE from the live row, so it is provably what the athlete
--     had, never what a local file says they had;
--   * the athlete block is never touched (asserted);
--   * cycles[] changes only as the spec says (PRC-17): p_cycle_patch merges the named fields into
--     the named cycles; p_cycles (a whole roadmap) is accepted only by a row that has none;
--   * the coaching log is spliced, never retyped: the profile block and the Exercise Ledger are
--     replaced in place, the new section is appended, and nothing else in the body moves.
-- It returns the programme fingerprint (programme_fingerprint(), the same walk as
-- scripts/check_program.py --fingerprint) and the log's md5 and length, so the one call is also
-- the verification.
--
-- Callable by the pipeline's own connection only: execute is revoked from public, anon and
-- authenticated below. Safe to re-run.

-- The content fingerprint: every leaf of the six programme keys with its path, sorted bytewise.
-- JSON nulls are skipped, as check_program.py skips None, so the leaf counts agree too.
create or replace function public.programme_fingerprint(p_id text)
returns jsonb language sql stable set search_path = public as $$
  with recursive walk(path, val) as (
    select k, p.data->k from public.programs p,
           unnest(array['athlete','sport','currentCycleIndex','cycles','workouts','notes']) k
     where p.athlete_id = p_id
    union all
    select w.path || '/' || c.k, c.v from walk w cross join lateral (
      select e.key as k, e.value as v
        from jsonb_each(case when jsonb_typeof(w.val) = 'object' then w.val else '{}'::jsonb end) e
      union all
      select (a.idx - 1)::text, a.value
        from jsonb_array_elements(case when jsonb_typeof(w.val) = 'array' then w.val else '[]'::jsonb end)
             with ordinality a(value, idx)) c)
  select jsonb_build_object(
           'fp', md5(string_agg(path || '=' || (val #>> '{}'), E'\n' order by path collate "C")),
           'leaves', count(*), 'chars', coalesce(sum(length(val #>> '{}')), 0))
    from walk where jsonb_typeof(val) not in ('object', 'array', 'null');
$$;

-- One exercise's line in the archive: "4 × 6 · RPE 7", "×3 Rounds · Swing, Throw", or the old chip
-- labels joined with " · " on a card never moved to rx.
create or replace function public.history_detail(e jsonb)
returns text language sql immutable set search_path = public as $$
  select case
    when jsonb_typeof(e->'rx') = 'object' then nullif(concat_ws(' · ',
        case when coalesce(e->'rx'->>'rounds', '') <> '' then '×' || (e->'rx'->>'rounds') || ' Rounds' end,
        nullif(concat_ws(' × ', nullif(e->'rx'->>'sets', ''),
               nullif(coalesce(e->'rx'->>'reps', e->'rx'->>'time', e->'rx'->>'distance', e->'rx'->>'work', '')
                      || case when e->'rx'->'side' = 'true'::jsonb then '/side' else '' end, '')), ''),
        case when coalesce(e->'rx'->>'rpe', '') <> '' then 'RPE ' || (e->'rx'->>'rpe') end,
        case when jsonb_typeof(e->'items') = 'array' then
          (select string_agg(i->>'name', ', ' order by n) from jsonb_array_elements(e->'items') with ordinality x(i, n)) end
      ), '')
    else nullif(concat_ws(' · ',
        nullif(e->>'rounds', ''),
        case when jsonb_typeof(e->'chips') = 'array' then
          (select string_agg(coalesce(ch->>'label', ch #>> '{}'), ' · ' order by n)
             from jsonb_array_elements(e->'chips') with ordinality x(ch, n)) end,
        nullif(e->>'detail', ''),
        case when jsonb_typeof(e->'items') = 'array' then
          (select string_agg(i->>'name', ', ' order by n) from jsonb_array_elements(e->'items') with ordinality x(i, n)) end
      ), '')
  end
$$;

create or replace function public.publish_cycle(
  p_athlete_id  text,
  p_workouts    jsonb,                 -- {"days": [...]}: the new cycle's days
  p_notes       jsonb,                 -- {"greeting"?, "cards": [...]}
  p_new_cycle   boolean,               -- true: archive the live workouts and advance currentCycleIndex
  p_cycle_patch jsonb default null,    -- {"<index>": {field: value}}: merged into cycles[index]
  p_cycles      jsonb default null,    -- a whole roadmap, only for a row that has none (a new athlete)
  p_sport       jsonb default null,    -- {"badge": ...} when the spec gives one
  p_log_section text  default null,    -- the new "## Cycle NN — …" entry, appended
  p_log_profile text  default null,    -- the ```profile block, replacing the old one in place
  p_log_ledger  text  default null,    -- the whole Exercise Ledger table, replacing the old one
  p_log_new     text  default null     -- a first coaching log (header, profile, ledger, roadmap)
) returns jsonb language plpgsql set search_path = public as $$
declare
  v_data jsonb; v_who jsonb; v_cci int; v_n int; v_cycle jsonb; v_entry jsonb; v_key text; v_i int;
  v_body text; v_had_log boolean; v_s int; v_e int; v_len int; v_m text[];
  v_prof boolean := false; v_ledger boolean := false; v_out jsonb;
begin
  if jsonb_typeof(p_workouts->'days') is distinct from 'array' then
    raise exception 'publish_cycle: p_workouts must be {"days": [...]}';
  end if;
  if jsonb_typeof(p_notes) is distinct from 'object' then
    raise exception 'publish_cycle: p_notes must be an object, e.g. {"cards": [...]}';
  end if;

  select p.data into v_data from public.programs p where p.athlete_id = p_athlete_id for update;
  if not found then
    raise exception 'publish_cycle: no programme row for % (run /athlete-intake first)', p_athlete_id;
  end if;
  v_who := v_data->'athlete';
  v_cci := coalesce((v_data->>'currentCycleIndex')::int, 0);

  -- 1. The archive, built from the live row, newest FIRST, with an id (SCHEMA → programHistory).
  if p_new_cycle then
    if jsonb_typeof(v_data->'workouts'->'days') is distinct from 'array' then
      raise exception 'publish_cycle: % has no workouts to archive; a new athlete publishes with p_new_cycle = false', p_athlete_id;
    end if;
    v_cycle := v_data->'cycles'->v_cci;
    v_n := coalesce((v_cycle->>'num')::int, v_cci + 1);
    v_entry := jsonb_build_object(
      'id', 'prog' || v_n,
      'label', 'Program ' || lpad(v_n::text, 2, '0') || coalesce(' · ' || nullif(v_cycle->>'name', ''), ''),
      'subtitle', coalesce(nullif(concat_ws(' · ', nullif(v_cycle->>'name', ''), nullif(v_cycle->>'weeks', ''),
                    case when coalesce(v_cycle->>'startDate', '') <> ''
                         then (v_cycle->>'startDate') || coalesce(' → ' || nullif(v_cycle->>'endDate', ''), '') end), ''),
                    'Cycle ' || v_n),
      'days', (select coalesce(jsonb_agg(jsonb_build_object(
                  'label', 'Day ' || coalesce(dd->>'id', dn::text),
                  'focus', coalesce(dd->>'focusTag', ''),
                  'exercises', (select coalesce(jsonb_agg(jsonb_build_object(
                                    'name', ex->>'name', 'detail', coalesce(public.history_detail(ex), '')) order by bn, en), '[]'::jsonb)
                                  from jsonb_array_elements(case when jsonb_typeof(dd->'blocks') = 'array' then dd->'blocks' else '[]'::jsonb end)
                                       with ordinality bx(b, bn)
                                  cross join lateral jsonb_array_elements(case when jsonb_typeof(b->'exercises') = 'array' then b->'exercises' else '[]'::jsonb end)
                                       with ordinality exx(ex, en))
                ) order by dn), '[]'::jsonb)
               from jsonb_array_elements(v_data->'workouts'->'days') with ordinality dx(dd, dn)));
    v_data := jsonb_set(v_data, '{programHistory}', jsonb_build_array(v_entry)
              || case when jsonb_typeof(v_data->'programHistory') = 'array' then v_data->'programHistory' else '[]'::jsonb end);
    v_cci := v_cci + 1;
  end if;
  v_data := jsonb_set(v_data, '{currentCycleIndex}', to_jsonb(v_cci));

  -- 2. The roadmap: whole only when there is none; otherwise only the fields the spec names.
  if p_cycles is not null then
    if jsonb_typeof(v_data->'cycles') = 'array' and jsonb_array_length(v_data->'cycles') > 0 then
      raise exception 'publish_cycle: % already has a roadmap; change it through p_cycle_patch (a roadmap_amend: line, PRC-17)', p_athlete_id;
    end if;
    v_data := v_data || jsonb_build_object('cycles', p_cycles);
  end if;
  if p_cycle_patch is not null then
    for v_key in select jsonb_object_keys(p_cycle_patch) loop
      v_i := v_key::int;
      if jsonb_typeof(v_data->'cycles') is distinct from 'array' or v_i < 0 or v_i >= jsonb_array_length(v_data->'cycles') then
        raise exception 'publish_cycle: cycle index % is not in the roadmap', v_key;
      end if;
      if jsonb_typeof(p_cycle_patch->v_key) is distinct from 'object' then
        raise exception 'publish_cycle: the patch for cycle % must be an object of fields', v_key;
      end if;
      v_data := jsonb_set(v_data, array['cycles', v_key], (v_data->'cycles'->v_i) || (p_cycle_patch->v_key));
    end loop;
  end if;
  if jsonb_typeof(v_data->'cycles') is distinct from 'array' or v_cci >= jsonb_array_length(v_data->'cycles') then
    raise exception 'publish_cycle: currentCycleIndex % has no cycle in the roadmap', v_cci;
  end if;

  -- 3. The new cycle's days and notes, and the sport line if the spec gave one.
  v_data := v_data || jsonb_build_object('workouts', p_workouts, 'notes', p_notes);
  if p_sport is not null then v_data := v_data || jsonb_build_object('sport', p_sport); end if;
  if (v_data->'athlete') is distinct from v_who then
    raise exception 'publish_cycle: the athlete block would change';
  end if;
  update public.programs set data = v_data, updated_by = 'publish_cycle' where athlete_id = p_athlete_id;
  v_out := jsonb_build_object('athlete_id', p_athlete_id, 'currentCycleIndex', v_cci,
             'archived', case when p_new_cycle then v_entry->>'id' end,
             'fingerprint', public.programme_fingerprint(p_athlete_id));

  -- 4. The coaching log: spliced, never retyped.
  if coalesce(p_log_section, p_log_profile, p_log_ledger, p_log_new) is not null then
    select l.body into v_body from public.coaching_logs l where l.athlete_id = p_athlete_id for update;
    v_had_log := found;
    if not v_had_log then
      if p_log_new is null then
        raise exception 'publish_cycle: % has no coaching log yet; pass p_log_new', p_athlete_id;
      end if;
      v_body := p_log_new;
    elsif p_log_new is not null then
      raise exception 'publish_cycle: % already has a coaching log; p_log_new is for a first one only', p_athlete_id;
    end if;

    if p_log_profile is not null then
      v_s := strpos(v_body, '```profile');
      if v_s > 0 then                                  -- replace the block, fences included
        v_e := strpos(substr(v_body, v_s + 10), '```');
        if v_e = 0 then raise exception 'publish_cycle: the profile block in the log has no closing fence'; end if;
        v_body := substr(v_body, 1, v_s - 1) || p_log_profile || substr(v_body, v_s + v_e + 12);
      else                                             -- first profile: before the ledger, under its own heading
        v_s := coalesce(nullif(strpos(v_body, E'\n## Exercise Ledger'), 0) + 1,
                        nullif(regexp_instr(v_body, '\|\s*Exercise\s*\|\s*Status'), 0));
        if v_s is null then
          v_s := coalesce(nullif(strpos(v_body, E'\n## '), 0) + 1, length(v_body) + 1);
        end if;
        v_body := substr(v_body, 1, v_s - 1) || '## Athlete profile' || E'\n' || p_log_profile || E'\n\n' || substr(v_body, v_s);
      end if;
      v_prof := true;
    end if;

    if p_log_ledger is not null then
      v_s := regexp_instr(v_body, '\|\s*Exercise\s*\|\s*Status');
      if v_s > 0 then                                  -- replace every consecutive table line
        v_m := regexp_match(substr(v_body, v_s), '^((?:\|[^\n]*(?:\n|$))+)');
        v_len := length(v_m[1]);
        v_body := substr(v_body, 1, v_s - 1) || rtrim(p_log_ledger, E'\n') || E'\n' || substr(v_body, v_s + v_len);
      else                                             -- a log from before the ledger: before the first cycle
        v_s := coalesce(nullif(strpos(v_body, E'\n## Roadmap'), 0), nullif(strpos(v_body, E'\n## Cycle'), 0));
        if v_s is null then v_s := length(v_body) + 1; else v_s := v_s + 1; end if;
        v_body := substr(v_body, 1, v_s - 1) || '## Exercise Ledger' || E'\n\n' || rtrim(p_log_ledger, E'\n') || E'\n\n' || substr(v_body, v_s);
      end if;
      v_ledger := true;
    end if;

    if p_log_section is not null then
      v_body := rtrim(v_body, E'\n') || E'\n\n' || p_log_section;
    end if;

    if v_had_log then
      update public.coaching_logs set body = v_body where athlete_id = p_athlete_id;
    else
      insert into public.coaching_logs (athlete_id, body) values (p_athlete_id, v_body);
    end if;
    v_out := v_out || jsonb_build_object('log', jsonb_build_object(
               'md5', md5(v_body), 'length', length(v_body), 'first_log', not v_had_log,
               'profile_replaced', v_prof, 'ledger_replaced', v_ledger,
               'section_at_end', p_log_section is null or right(v_body, length(p_log_section)) = p_log_section));
  end if;
  return v_out;
end
$$;

revoke all on function public.programme_fingerprint(text) from public, anon, authenticated;
revoke all on function public.history_detail(jsonb) from public, anon, authenticated;
revoke all on function public.publish_cycle(text, jsonb, jsonb, boolean, jsonb, jsonb, jsonb, text, text, text, text)
  from public, anon, authenticated;
