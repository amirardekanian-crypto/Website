-- stage74_publish_cycle_label.sql — publish_cycle() always leaves the programme a title (2026-10-18)
--
-- What happened. publish_cycle() replaces the whole `workouts` object with p_workouts (`v_data || jsonb_build_object('workouts', p_workouts, …)`).
-- Its parameter comment said p_workouts was `{"days": [...]}`, so a publish generator that followed the comment sent days only, and the
-- programme lost `workouts.label` and came back one leaf short on the fingerprint (Ghazal Pakbaten, Cycle 3, 2026-10-18; put right by hand with
-- a guarded jsonb_set). program.html titles the programme with `w.label || 'Training'`, so the athlete's Home said "Training".
-- /program-assemble Step 7 already says to send the WHOLE workouts object; the function's comment and the function itself let it slip.
--
-- What this changes (and nothing else; the body below is stage38's, line for line, with the three edits marked  -- stage74):
--   1. The parameter comment says what p_workouts is: the whole workouts object, {"label": "Program 0N · <Cycle Name>", "days": [...]}.
--   2. A p_workouts with no usable label (missing, null, empty, blank, or not a string) gets one on the server, the shape the archive entry
--      already uses for a finished cycle: 'Program ' || lpad(n, 2, '0') || ' · ' || the NEW cycle's name, read from cycles[currentCycleIndex]
--      after the roadmap patch (num defaults to index + 1, exactly as the archive's does; no name leaves 'Program 03' alone). A label the
--      generator DID send is kept as it is ('Program 03 · Month Three' on Sina's row is a label somebody chose).
--   3. The answer says which happened: "label" (what is stored) and "label_filled" (true when the server had to write it). When it is true
--      the file the call was built from has no workouts.label: the fingerprint will be one leaf more than check_program.py --fingerprint, and the
--      fix is to put that label in the file, not to resend.
--   The shape of p_workouts is still checked: an object with a days array, else the same refusal, now naming the whole shape.
--
-- Not changed: the signature (so grants stay; the revoke at the end is stage38's, re-issued), the archive, the roadmap rules, the athlete-block
-- assertion, the coaching-log splice, the fingerprint. Rehearsed on PGlite against the live function's own text: scripts/rehearse_stage74.mjs.
--
-- The guard. The first statement refuses unless the live publish_cycle() is one of the texts this was rehearsed against: stage38's, without
-- its comments (what the project holds, md5 28a678a6…, 2026-10-18), with them (LF, or CRLF if the file was sent as it sits in the Windows
-- tree), or already this stage's. Anything else means somebody changed the function after stage38: stop and read it before replacing it.
--
-- The way back: run supabase/stage38_publish_cycle.sql again (same logic, no label fill). Safe to re-run this file.
-- After it is applied to the project: remake supabase/schema_snapshot.sql in the same commit (scripts/restore/README.md, "Keeping the snapshot
-- current"; pre-commit guard 17) and run scripts/restore/rehearse.mjs.

do $stage74_guard$
declare
  s text;
begin
  select p.prosrc into s from pg_proc p
   where p.oid = to_regprocedure('public.publish_cycle(text,jsonb,jsonb,boolean,jsonb,jsonb,jsonb,text,text,text,text)');
  if s is null then
    raise exception 'stage74: public.publish_cycle(text, jsonb, jsonb, boolean, jsonb, jsonb, jsonb, text, text, text, text) does not exist (stage38 first)';
  end if;
  if position('label_filled' in s) = 0                      -- code, not a comment: the project's copy of stage38 has none
     and md5(s) not in ('28a678a6171f7a8b33b56fc48f87967d',    -- stage38 as the project holds it (no comments)
                        '1530d79866d66b90b70ed3589cc402af',    -- stage38 with its comments, LF
                        '4b36e409e512c2f42820a3ac17bec77f') then  -- stage38 with its comments, CRLF
    raise exception 'stage74: the live publish_cycle() is not the stage38 text this stage was rehearsed against (md5 %). Do not replace it blind: read it, then amend this stage.', md5(s);
  end if;
end
$stage74_guard$;

create or replace function public.publish_cycle(
  p_athlete_id  text,
  p_workouts    jsonb,                 -- the WHOLE workouts object: {"label": "Program 0N · <Cycle Name>", "days": [...]}  -- stage74
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
  v_w jsonb; v_filled boolean := false;                -- stage74: the workouts object as stored, and whether its label had to be written
begin
  if jsonb_typeof(p_workouts->'days') is distinct from 'array' then
    raise exception 'publish_cycle: p_workouts must be the whole workouts object {"label": "Program 0N · <Cycle Name>", "days": [...]}';   -- stage74
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
  v_w := p_workouts;                                                                       -- stage74 from here to the end of the if
  if jsonb_typeof(v_w->'label') is distinct from 'string' or btrim(v_w->>'label') = '' then
    v_cycle := v_data->'cycles'->v_cci;                                                    -- the NEW cycle (the archive's v_cycle was the old one)
    v_n := coalesce((v_cycle->>'num')::int, v_cci + 1);
    v_w := jsonb_set(v_w, '{label}',
             to_jsonb('Program ' || lpad(v_n::text, 2, '0') || coalesce(' · ' || nullif(v_cycle->>'name', ''), '')));
    v_filled := true;
  end if;
  v_data := v_data || jsonb_build_object('workouts', v_w, 'notes', p_notes);
  if p_sport is not null then v_data := v_data || jsonb_build_object('sport', p_sport); end if;
  if (v_data->'athlete') is distinct from v_who then
    raise exception 'publish_cycle: the athlete block would change';
  end if;
  update public.programs set data = v_data, updated_by = 'publish_cycle' where athlete_id = p_athlete_id;
  v_out := jsonb_build_object('athlete_id', p_athlete_id, 'currentCycleIndex', v_cci,
             'archived', case when p_new_cycle then v_entry->>'id' end,
             'label', v_w->>'label', 'label_filled', v_filled,                             -- stage74
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

revoke all on function public.publish_cycle(text, jsonb, jsonb, boolean, jsonb, jsonb, jsonb, text, text, text, text)
  from public, anon, authenticated;
