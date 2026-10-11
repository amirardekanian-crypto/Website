-- Assertions for stage45 (forget_contact), stage48 (coach_delete_training_history, coach_save_spine), stage49 (spine_versions)
-- stage50 (the coach reads the testing app's tables) and stage51 (used first passwords are cleared) on the
-- local replica. Run through scripts/test_spine_sql.sh, which loads replica_schema.sql and both stage files first.
-- Every check writes a row to t_res; the runner prints the failures and exits non-zero if there are any.
-- Test rows are all 'zz…' ids. Made-up data only.
\set ON_ERROR_STOP on

create temp table t_res (n text, ok boolean, v text);
create function pg_temp.rec(n text, ok boolean, v text) returns void language sql as $$ insert into t_res values (n, coalesce(ok, false), v) $$;
create function pg_temp.coach() returns void language plpgsql as $$ begin perform set_config('request.jwt.claims', '{"email":"amirardekanian@gmail.com","role":"authenticated"}', false); end $$;
create function pg_temp.other() returns void language plpgsql as $$ begin perform set_config('request.jwt.claims', '{"email":"someone.else@example.com","role":"authenticated"}', false); end $$;
create function pg_temp.nobody() returns void language plpgsql as $$ begin perform set_config('request.jwt.claims', '', false); end $$;

select pg_temp.coach() \g /dev/null
select pg_temp.rec('is_coach() is true under the coach claim', public.is_coach(), '');
select pg_temp.other() \g /dev/null
select pg_temp.rec('is_coach() is false for anyone else', not public.is_coach(), '');
select pg_temp.coach() \g /dev/null

-- ═════════════════════ A. coach_delete_training_history ═════════════════════
insert into public.session_history (athlete_id, day, completed_on) values ('zz_test', 1, '2026-01-01'), ('zz_test', 2, '2026-01-02'), ('zz_other', 1, '2026-01-01');
insert into public.athlete_progress (athlete_id, data) values ('zz_test', '{"a":1}'), ('zz_other', '{"a":2}');

do $t$
declare r jsonb; n int;
begin
  r := public.coach_delete_training_history('zz_test');
  perform pg_temp.rec('delete: counts come back', r = '{"sessions":2,"progress":1}'::jsonb, r::text);
  select count(*) into n from public.session_history where athlete_id = 'zz_test';
  perform pg_temp.rec('delete: that athlete has no sessions left', n = 0, n::text);
  select count(*) into n from public.athlete_progress where athlete_id = 'zz_test';
  perform pg_temp.rec('delete: ...and no progress snapshot', n = 0, n::text);
  select count(*) into n from public.session_history where athlete_id = 'zz_other';
  perform pg_temp.rec('delete: another athlete keeps their sessions', n = 1, n::text);
  select count(*) into n from public.athlete_progress where athlete_id = 'zz_other';
  perform pg_temp.rec('delete: ...and their progress', n = 1, n::text);
  r := public.coach_delete_training_history('zz_nobody');
  perform pg_temp.rec('delete: an athlete with nothing returns zeros', r = '{"sessions":0,"progress":0}'::jsonb, r::text);
end $t$;

-- one transaction: a failure on the second delete must take the first with it
insert into public.session_history (athlete_id, day, completed_on) values ('zz_atomic', 1, '2026-01-01');
insert into public.athlete_progress (athlete_id, data) values ('zz_atomic', '{}');
create function pg_temp.boom() returns trigger language plpgsql as $$ begin raise exception 'fixture: progress delete refused'; end $$;
create trigger zz_boom before delete on public.athlete_progress for each row when (old.athlete_id = 'zz_atomic') execute function pg_temp.boom();
do $t$
declare n int;
begin
  begin
    perform public.coach_delete_training_history('zz_atomic');
    perform pg_temp.rec('delete: a failure on the second delete raises', false, 'no error');
  exception when others then
    perform pg_temp.rec('delete: a failure on the second delete raises', sqlerrm like '%fixture: progress delete refused%', sqlerrm);
  end;
  select count(*) into n from public.session_history where athlete_id = 'zz_atomic';
  perform pg_temp.rec('delete: ...and the sessions delete was undone with it (one transaction)', n = 1, n::text);
end $t$;
drop trigger zz_boom on public.athlete_progress;

do $t$
begin
  begin perform public.coach_delete_training_history('   ');
    perform pg_temp.rec('delete: a blank id is refused', false, 'no error');
  exception when others then perform pg_temp.rec('delete: a blank id is refused', sqlerrm = 'which athlete?', sqlerrm); end;
  begin perform public.coach_delete_training_history(null);
    perform pg_temp.rec('delete: a null id is refused', false, 'no error');
  exception when others then perform pg_temp.rec('delete: a null id is refused', sqlerrm = 'which athlete?', sqlerrm); end;
end $t$;

select pg_temp.other() \g /dev/null
do $t$
declare n int;
begin
  begin perform public.coach_delete_training_history('zz_other');
    perform pg_temp.rec('delete: someone who is not the coach is refused', false, 'no error');
  exception when others then perform pg_temp.rec('delete: someone who is not the coach is refused', sqlerrm = 'coach only', sqlerrm); end;
  select count(*) into n from public.session_history where athlete_id = 'zz_other';
  perform pg_temp.rec('delete: ...and nothing was removed', n = 1, n::text);
  begin
    execute 'set local role anon';
    perform public.coach_delete_training_history('zz_other');
    execute 'reset role';
    perform pg_temp.rec('delete: anon cannot even call it', false, 'no error');
  exception when insufficient_privilege then perform pg_temp.rec('delete: anon cannot even call it', true, sqlerrm); end;
end $t$;
select pg_temp.coach() \g /dev/null

-- ═════════════════════ B. coach_save_spine ═════════════════════
insert into public.exercises (id, name, status, updated_by) values ('zz-test-entry', 'ZZ Test Entry', 'draft', 'claude'), ('zz-no-coach', 'ZZ No Coach Row', 'draft', 'claude');
insert into public.exercise_coach (id, sfr) values ('zz-test-entry', 3);

do $t$
declare r jsonb; e jsonb; n int; c jsonb; before_ts timestamptz;
begin
  select updated_at into before_ts from public.exercises where id = 'zz-test-entry';
  perform pg_sleep(0.01);
  -- 1. a plain save: text, jsonb and text[] columns, typed from the JSON
  r := public.coach_save_spine('zz-test-entry',
         '{"video":"https://example.invalid/v","cues":{"good":["a"],"bad":[]},"aliases":["zz alias"]}',
         '{"video":null,"cues":null,"aliases":[]}', '{}', '{}');
  select to_jsonb(x) into e from public.exercises x where id = 'zz-test-entry';
  perform pg_temp.rec('save: ok', r ->> 'ok' = 'true', r::text);
  perform pg_temp.rec('save: columns written, typed (text, jsonb, text[])', e ->> 'video' = 'https://example.invalid/v' and e -> 'cues' = '{"good":["a"],"bad":[]}'::jsonb and e -> 'aliases' = '["zz alias"]'::jsonb, e::text);
  perform pg_temp.rec('save: updated_by is the coach and updated_at moved', e ->> 'updated_by' = 'coach' and (e ->> 'updated_at')::timestamptz > before_ts, e ->> 'updated_by');
  perform pg_temp.rec('save: the returned entry is the saved row; the coach half was not sent', r -> 'entry' = e and r -> 'coach' = 'null'::jsonb, '');
  perform pg_temp.rec('save: columns not sent are untouched', e ->> 'name' = 'ZZ Test Entry' and e ->> 'status' = 'draft' and e -> 'equipment' = '[]'::jsonb, e::text);

  -- 2. Claude changes purpose by SQL after the page read; the coach changes purpose and tennis AND the coach half
  perform pg_temp.nobody();
  update public.exercises set purpose = 'Claude purpose', updated_by = 'claude-pipeline' where id = 'zz-test-entry';
  perform pg_temp.coach();
  r := public.coach_save_spine('zz-test-entry', '{"purpose":"Amir purpose","tennis":"Amir court"}', '{"purpose":null,"tennis":null}', '{"sfr":5,"notes":"n"}', '{"sfr":3,"notes":null}');
  perform pg_temp.rec('clash: refused', r ->> 'ok' = 'false', r::text);
  perform pg_temp.rec('clash: names only the clashing column and carries the live row', (r -> 'entry' -> 'cols') = '["purpose"]'::jsonb and (r -> 'entry' -> 'live' ->> 'purpose') = 'Claude purpose' and not (r ? 'coach'), r::text);
  perform pg_temp.rec('clash: the live row keeps its null columns (not stripped)', (r -> 'entry' -> 'live') ? 'video' and (r -> 'entry' -> 'live') ? 'muscles' and jsonb_typeof(r -> 'entry' -> 'live' -> 'muscles') = 'null', '');
  select to_jsonb(x) into e from public.exercises x where id = 'zz-test-entry';
  perform pg_temp.rec('clash: nothing written to the entry, not even the column that did not clash', e ->> 'purpose' = 'Claude purpose' and e -> 'tennis' = 'null'::jsonb, e::text);
  select sfr into n from public.exercise_coach where id = 'zz-test-entry';
  perform pg_temp.rec('clash: nothing written to the coach-only half either (atomic)', n = 3, n::text);

  -- 3. saving again with the snapshot refreshed to what is live goes through, both halves
  r := public.coach_save_spine('zz-test-entry', '{"purpose":"Amir purpose","tennis":"Amir court"}', '{"purpose":"Claude purpose","tennis":null}', '{"sfr":5,"notes":"n"}', '{"sfr":3,"notes":null}');
  perform pg_temp.rec('save again after the snapshot is refreshed: ok, both halves', r ->> 'ok' = 'true' and (r -> 'entry' ->> 'purpose') = 'Amir purpose' and (r -> 'coach' ->> 'sfr') = '5' and (r -> 'coach' ->> 'notes') = 'n', r::text);

  -- 4. live already equals what the coach writes: not a clash
  perform pg_temp.nobody();
  update public.exercises set tennis = 'Same court' where id = 'zz-test-entry';
  perform pg_temp.coach();
  r := public.coach_save_spine('zz-test-entry', '{"tennis":"Same court"}', '{"tennis":"Amir court"}', '{}', '{}');
  perform pg_temp.rec('live already equal to the new value is not a clash', r ->> 'ok' = 'true', r::text);

  -- 5. the coach half alone: arrays and jsonb
  r := public.coach_save_spine('zz-test-entry', '{}', '{}', '{"flags":["axial-load"],"credits":{"quads":1,"glutes":0.5},"cost":"heavy"}', '{"flags":[],"credits":null,"cost":null}');
  perform pg_temp.rec('coach half only: ok, the entry half reads null', r ->> 'ok' = 'true' and r -> 'entry' = 'null'::jsonb, r::text);
  perform pg_temp.rec('coach half: text[] and jsonb typed', (r -> 'coach' -> 'flags') = '["axial-load"]'::jsonb and (r -> 'coach' -> 'credits') = '{"quads":1,"glutes":0.5}'::jsonb and (r -> 'coach' ->> 'cost') = 'heavy', (r -> 'coach')::text);

  -- 6. JSON null clears a jsonb column to SQL NULL
  r := public.coach_save_spine('zz-test-entry', '{"cues":null,"muscles":null}', '{"cues":{"good":["a"],"bad":[]},"muscles":null}', '{"credits":null}', '{"credits":{"quads":1,"glutes":0.5}}');
  perform pg_temp.rec('null clears a jsonb column to SQL NULL (entry and coach half)',
    r ->> 'ok' = 'true' and (select cues is null from public.exercises where id = 'zz-test-entry') and (select credits is null from public.exercise_coach where id = 'zz-test-entry'), r::text);

  -- 7. a column the coach clears to an empty array / empty object
  r := public.coach_save_spine('zz-test-entry', '{"qualities":["strength","muscle"],"loads":["knee"],"easier":[],"muscles":{"calves":1}}', '{"qualities":[],"loads":[],"easier":[],"muscles":null}', '{"credits":{}}', '{"credits":null}');
  perform pg_temp.rec('arrays and {} round-trip', r ->> 'ok' = 'true' and (r -> 'entry' -> 'qualities') = '["strength","muscle"]'::jsonb and (r -> 'coach' -> 'credits') = '{}'::jsonb, r::text);

  -- 8. a missing snapshot key counts as null
  r := public.coach_save_spine('zz-test-entry', '{"impact":"landing"}', '{}', '{}', '{}');
  perform pg_temp.rec('a missing snapshot key counts as null (impact was null: no clash)', r ->> 'ok' = 'true', r::text);
  r := public.coach_save_spine('zz-test-entry', '{"impact":"none"}', '{}', '{}', '{}');
  perform pg_temp.rec('...but it is a clash when the live value is not null', r ->> 'ok' = 'false' and (r -> 'entry' -> 'cols') = '["impact"]'::jsonb, r::text);

  -- 9. empty payloads write nothing
  r := public.coach_save_spine('zz-test-entry', '{}', '{}', '{}', '{}');
  perform pg_temp.rec('empty payloads: ok, nothing returned', r = '{"ok":true,"entry":null,"coach":null}'::jsonb, r::text);
  r := public.coach_save_spine('zz-test-entry', null, null, null, null);
  perform pg_temp.rec('null payloads behave as empty', r = '{"ok":true,"entry":null,"coach":null}'::jsonb, r::text);

  -- 10. the coach half has no row yet: created with only the columns sent, the rest default
  r := public.coach_save_spine('zz-no-coach', '{}', '{}', '{"sfr":2,"credits":{"quads":1}}', '{}');
  select to_jsonb(x) into c from public.exercise_coach x where id = 'zz-no-coach';
  perform pg_temp.rec('a missing coach-only row is created', r ->> 'ok' = 'true' and (c ->> 'sfr') = '2' and (c -> 'credits') = '{"quads":1}'::jsonb, c::text);
  perform pg_temp.rec('...with the table defaults for the columns not sent', c -> 'flags' = '[]'::jsonb and c -> 'suggested_qualities' = '[]'::jsonb and c -> 'links_history' = '[]'::jsonb and c -> 'suggested_changes' = '[]'::jsonb, c::text);
  -- the page thought there was no row, but one has appeared since: that is a clash
  r := public.coach_save_spine('zz-no-coach', '{}', '{}', '{"sfr":4}', '{}');
  perform pg_temp.rec('a coach-only row that appeared since the page read is a clash', r ->> 'ok' = 'false' and (r -> 'coach' -> 'cols') = '["sfr"]'::jsonb and not (r ? 'entry'), r::text);

  -- 11. a clash on the coach half only holds the entry half back too
  perform pg_temp.nobody();
  update public.exercise_coach set notes = 'Claude note' where id = 'zz-test-entry';
  perform pg_temp.coach();
  r := public.coach_save_spine('zz-test-entry', '{"video":"https://example.invalid/new"}', '{"video":"https://example.invalid/v"}', '{"notes":"Amir note"}', '{"notes":"n"}');
  perform pg_temp.rec('coach-half clash: refused, names the coach column', r ->> 'ok' = 'false' and (r -> 'coach' -> 'cols') = '["notes"]'::jsonb and not (r ? 'entry'), r::text);
  perform pg_temp.rec('...and the entry half (which did not clash) was not written', (select video from public.exercises where id = 'zz-test-entry') = 'https://example.invalid/v', (select video from public.exercises where id = 'zz-test-entry'));
  -- both halves clash
  perform pg_temp.nobody();
  update public.exercises set video = 'https://example.invalid/claude' where id = 'zz-test-entry';
  perform pg_temp.coach();
  r := public.coach_save_spine('zz-test-entry', '{"video":"https://example.invalid/new"}', '{"video":"https://example.invalid/v"}', '{"notes":"Amir note"}', '{"notes":"n"}');
  perform pg_temp.rec('both halves clash: both are reported', r ->> 'ok' = 'false' and (r -> 'entry' -> 'cols') = '["video"]'::jsonb and (r -> 'coach' -> 'cols') = '["notes"]'::jsonb, r::text);
end $t$;

-- refusals and failures
do $t$
declare r jsonb; n int; v text; s int;
begin
  begin perform public.coach_save_spine('zz-test-entry', '{"id":"other"}', '{}', '{}', '{}');
    perform pg_temp.rec('refused: the id column', false, 'no error');
  exception when others then perform pg_temp.rec('refused: the id column', sqlerrm like 'exercises.id cannot be written%', sqlerrm); end;
  begin perform public.coach_save_spine('zz-test-entry', '{"updated_at":"2020-01-01"}', '{}', '{}', '{}');
    perform pg_temp.rec('refused: updated_at', false, 'no error');
  exception when others then perform pg_temp.rec('refused: updated_at', sqlerrm like 'exercises.updated_at cannot be written%', sqlerrm); end;
  begin perform public.coach_save_spine('zz-test-entry', '{}', '{}', '{"links_history":[]}', '{}');
    perform pg_temp.rec('refused: a coach-only bookkeeping column', false, 'no error');
  exception when others then perform pg_temp.rec('refused: a coach-only bookkeeping column', sqlerrm like 'exercise_coach.links_history cannot be written%', sqlerrm); end;
  begin perform public.coach_save_spine('zz-gone', '{"video":"x"}', '{}', '{}', '{}');
    perform pg_temp.rec('refused: an entry that is not on the server', false, 'no error');
  exception when others then perform pg_temp.rec('refused: an entry that is not on the server', sqlerrm like 'this entry is no longer on the server (zz-gone)%', sqlerrm); end;

  -- a payload that is not a JSON object is an error, never a silent "saved" (a double-encoded payload used to read as ok)
  begin perform public.coach_save_spine('zz-test-entry', '[1,2]', '{}', '{}', '{}');
    perform pg_temp.rec('refused: an entry payload that is an array', false, 'no error');
  exception when others then perform pg_temp.rec('refused: an entry payload that is an array', sqlerrm like '%must each be a JSON object%', sqlerrm); end;
  begin perform public.coach_save_spine('zz-test-entry', '{}', '{}', '"{\"notes\":\"x\"}"', '{}');
    perform pg_temp.rec('refused: a coach payload that is a double-encoded string', false, 'no error');
  exception when others then perform pg_temp.rec('refused: a coach payload that is a double-encoded string', sqlerrm like '%must each be a JSON object%', sqlerrm); end;
  begin perform public.coach_save_spine('zz-test-entry', '{}', '1', '{}', '{}');
    perform pg_temp.rec('refused: a snapshot that is a number', false, 'no error');
  exception when others then perform pg_temp.rec('refused: a snapshot that is a number', sqlerrm like '%must each be a JSON object%', sqlerrm); end;
  begin perform public.coach_save_spine('zz-test-entry', '{}', '{}', '{}', 'true');
    perform pg_temp.rec('refused: a snapshot that is a boolean', false, 'no error');
  exception when others then perform pg_temp.rec('refused: a snapshot that is a boolean', sqlerrm like '%must each be a JSON object%', sqlerrm); end;
  -- SQL NULL and JSON null both mean "nothing for that half": an ok that wrote nothing
  select count(*) into n from public.spine_versions where row_id = 'zz-test-entry';
  r := public.coach_save_spine('zz-test-entry', null, null, 'null'::jsonb, null);
  perform pg_temp.rec('null and JSON null arguments mean nothing to write', r = '{"ok":true,"entry":null,"coach":null}'::jsonb, r::text);
  perform pg_temp.rec('...and leave no history row', (select count(*) from public.spine_versions where row_id = 'zz-test-entry') = n, '');

  -- atomic: a valid entry half with an invalid coach half writes neither
  select video into v from public.exercises where id = 'zz-test-entry';
  begin
    perform public.coach_save_spine('zz-test-entry', '{"video":"https://example.invalid/atomic"}', '{"video":"https://example.invalid/claude"}', '{"cost":"bogus"}', '{"cost":"heavy"}');
    perform pg_temp.rec('atomic: an invalid coach half raises', false, 'no error');
  exception when check_violation then perform pg_temp.rec('atomic: an invalid coach half raises', true, sqlerrm); end;
  perform pg_temp.rec('atomic: ...and the entry half was undone with it', (select video from public.exercises where id = 'zz-test-entry') = v, (select video from public.exercises where id = 'zz-test-entry'));
  begin
    perform public.coach_save_spine('zz-test-entry', '{"status":"bogus"}', '{"status":"draft"}', '{"notes":"should not land"}', '{"notes":"Claude note"}');
    perform pg_temp.rec('atomic: an invalid entry half raises', false, 'no error');
  exception when check_violation then perform pg_temp.rec('atomic: an invalid entry half raises', true, sqlerrm); end;
  perform pg_temp.rec('atomic: ...and the coach half was not written', (select notes from public.exercise_coach where id = 'zz-test-entry') = 'Claude note', (select notes from public.exercise_coach where id = 'zz-test-entry'));
  begin
    perform public.coach_save_spine('zz-test-entry', '{"name":null}', '{"name":"ZZ Test Entry"}', '{}', '{}');
    perform pg_temp.rec('a required column cannot be cleared', false, 'no error');
  exception when not_null_violation then perform pg_temp.rec('a required column cannot be cleared', true, sqlerrm); end;
  begin
    perform public.coach_save_spine('zz-test-entry', '{"muscles":{"quads":3}}', '{"muscles":{"calves":1}}', '{}', '{}');
    perform pg_temp.rec('the credits rule still applies (a muscle at 3)', false, 'no error');
  exception when check_violation then perform pg_temp.rec('the credits rule still applies (a muscle at 3)', true, sqlerrm); end;
end $t$;

select pg_temp.other() \g /dev/null
do $t$
begin
  begin perform public.coach_save_spine('zz-test-entry', '{"video":"x"}', '{}', '{}', '{}');
    perform pg_temp.rec('save: someone who is not the coach is refused', false, 'no error');
  exception when others then perform pg_temp.rec('save: someone who is not the coach is refused', sqlerrm = 'coach only', sqlerrm); end;
  begin perform public.coach_save_spine('zz-test-entry', '[1]', '{}', '{}', '{}');
    perform pg_temp.rec('save: ...and is told "coach only" before anything about the payload', false, 'no error');
  exception when others then perform pg_temp.rec('save: ...and is told "coach only" before anything about the payload', sqlerrm = 'coach only', sqlerrm); end;
  begin
    execute 'set local role anon';
    perform public.coach_save_spine('zz-test-entry', '{"video":"x"}', '{}', '{}', '{}');
    execute 'reset role';
    perform pg_temp.rec('save: anon cannot even call it', false, 'no error');
  exception when insufficient_privilege then perform pg_temp.rec('save: anon cannot even call it', true, sqlerrm); end;
end $t$;
select pg_temp.coach() \g /dev/null

-- ═════════════════════ C. spine_versions ═════════════════════
do $t$
declare n int; v record; r jsonb;
begin
  -- the writes above (dashboard = coach claim, SQL = no claim) each left a version of what they replaced
  select count(*) into n from public.spine_versions where tbl = 'exercises' and row_id = 'zz-test-entry' and op = 'update';
  perform pg_temp.rec('versions: every real change to the entry left one', n >= 8, n::text);

  -- the first save: video/cues/aliases, by the coach
  select * into v from public.spine_versions where tbl = 'exercises' and row_id = 'zz-test-entry' order by id limit 1;
  perform pg_temp.rec('versions: the first one holds the row as it was', v.data ->> 'video' is null and v.data ->> 'name' = 'ZZ Test Entry' and v.data ->> 'updated_by' = 'claude', v.data::text);
  perform pg_temp.rec('versions: changed lists exactly the columns that changed, with their new values',
    (select array_agg(k order by k) from jsonb_object_keys(v.changed) k) = array['aliases','cues','video']
    and v.changed ->> 'video' = 'https://example.invalid/v' and v.changed -> 'aliases' = '["zz alias"]'::jsonb, v.changed::text);
  perform pg_temp.rec('versions: updated_at/updated_by are never listed as changed', not (v.changed ? 'updated_at') and not (v.changed ? 'updated_by'), '');
  perform pg_temp.rec('versions: saved_by is the signed-in email for a dashboard save', v.saved_by = 'amirardekanian@gmail.com', v.saved_by);
  perform pg_temp.rec('versions: was_updated_at is the replaced row''s own stamp', v.was_updated_at is not null, v.was_updated_at::text);

  -- Claude's SQL (no claim) is recorded as 'sql'
  select * into v from public.spine_versions where tbl = 'exercises' and row_id = 'zz-test-entry' and changed ? 'purpose' and changed ->> 'purpose' = 'Claude purpose';
  perform pg_temp.rec('versions: a write with no signed-in user is saved_by sql', v.saved_by = 'sql', v.saved_by);

  -- a save that changes nothing leaves no version
  select count(*) into n from public.spine_versions where tbl = 'exercises' and row_id = 'zz-test-entry';
  update public.exercises set updated_at = now(), updated_by = 'coach' where id = 'zz-test-entry';
  update public.exercises set purpose = purpose where id = 'zz-test-entry';
  perform pg_temp.rec('versions: touching updated_at or rewriting a value to itself leaves no version', (select count(*) from public.spine_versions where tbl = 'exercises' and row_id = 'zz-test-entry') = n, '');

  -- the coach-only half is versioned in its own table label (it has no updated_at)
  select * into v from public.spine_versions where tbl = 'exercise_coach' and row_id = 'zz-test-entry' and changed ? 'notes' order by id limit 1;
  perform pg_temp.rec('versions: the coach-only half is recorded under exercise_coach', v.id is not null and v.was_updated_at is null and v.data ? 'sfr', coalesce(v.changed::text, 'none'));

  -- qualities
  insert into public.qualities (id, name, line) values ('zzq', 'ZZ Quality', 'a line');
  update public.qualities set line = 'a better line' where id = 'zzq';
  select * into v from public.spine_versions where tbl = 'qualities' and row_id = 'zzq';
  perform pg_temp.rec('versions: qualities are recorded too', v.id is not null and v.changed = '{"line":"a better line"}'::jsonb and v.data ->> 'line' = 'a line', coalesce(v.changed::text, 'none'));

  -- putting a field back goes through the same guarded function, and is itself recorded
  select * into v from public.spine_versions where tbl = 'exercises' and row_id = 'zz-test-entry' and changed ? 'purpose' and changed ->> 'purpose' = 'Amir purpose';
  r := public.coach_save_spine('zz-test-entry', jsonb_build_object('purpose', v.data -> 'purpose'), jsonb_build_object('purpose', (select purpose from public.exercises where id = 'zz-test-entry')), '{}', '{}');
  perform pg_temp.rec('put back: the old purpose returns through coach_save_spine', r ->> 'ok' = 'true' and (r -> 'entry' ->> 'purpose') = 'Claude purpose', r::text);
  perform pg_temp.rec('put back: ...and the put-back is itself a version', exists (select 1 from public.spine_versions where tbl = 'exercises' and row_id = 'zz-test-entry' and changed ->> 'purpose' = 'Claude purpose' and data ->> 'purpose' = 'Amir purpose'), '');

  -- deleting an entry keeps it: the exercise and, through the cascade, its coach-only row
  delete from public.exercises where id = 'zz-test-entry';
  select * into v from public.spine_versions where tbl = 'exercises' and row_id = 'zz-test-entry' and op = 'delete';
  perform pg_temp.rec('versions: a deleted entry is kept whole', v.id is not null and v.changed is null and v.data ->> 'name' = 'ZZ Test Entry', coalesce(v.data::text, 'none'));
  select * into v from public.spine_versions where tbl = 'exercise_coach' and row_id = 'zz-test-entry' and op = 'delete';
  perform pg_temp.rec('versions: ...and so is its coach-only row (cascade)', v.id is not null and v.data ? 'sfr', coalesce(v.data::text, 'none'));
  -- and can be put back from the version
  insert into public.exercises select * from jsonb_populate_record(null::public.exercises, (select data from public.spine_versions where tbl = 'exercises' and row_id = 'zz-test-entry' and op = 'delete' order by id desc limit 1));
  perform pg_temp.rec('versions: a deleted entry can be put back from its version', exists (select 1 from public.exercises where id = 'zz-test-entry' and name = 'ZZ Test Entry'), '');
  -- the recipe in stage49's header has a second insert for the coach-only row, which is a version of its own
  insert into public.exercise_coach select r.* from jsonb_populate_record(null::public.exercise_coach, (select data from public.spine_versions where tbl = 'exercise_coach' and row_id = 'zz-test-entry' and op = 'delete' order by id desc limit 1)) r where r.id is not null;
  perform pg_temp.rec('versions: ...and its coach-only row comes back identical (the recipe has two inserts)',
    (select to_jsonb(c) from public.exercise_coach c where c.id = 'zz-test-entry') = (select data from public.spine_versions where tbl = 'exercise_coach' and row_id = 'zz-test-entry' and op = 'delete' order by id desc limit 1), '');
  -- an entry that never had a coach-only row: the second insert of the recipe adds nothing and does not fail
  insert into public.exercises (id, name) values ('zz-nocoach', 'ZZ No Coach Row');
  delete from public.exercises where id = 'zz-nocoach';
  insert into public.exercises select * from jsonb_populate_record(null::public.exercises, (select data from public.spine_versions where tbl = 'exercises' and row_id = 'zz-nocoach' and op = 'delete' order by id desc limit 1));
  insert into public.exercise_coach select r.* from jsonb_populate_record(null::public.exercise_coach, (select data from public.spine_versions where tbl = 'exercise_coach' and row_id = 'zz-nocoach' and op = 'delete' order by id desc limit 1)) r where r.id is not null;
  perform pg_temp.rec('versions: restoring an entry that had no coach-only row adds none and does not fail',
    exists (select 1 from public.exercises where id = 'zz-nocoach') and not exists (select 1 from public.exercise_coach where id = 'zz-nocoach'), '');
end $t$;

-- who may read the history
select pg_temp.coach() \g /dev/null
do $t$
declare n int; total int;
begin
  select count(*) into total from public.spine_versions;
  execute 'set local role authenticated';
  select count(*) into n from public.spine_versions;
  execute 'reset role';
  perform pg_temp.rec('rls: the coach reads every version', n = total and n > 0, n || ' of ' || total);
  begin
    execute 'set local role authenticated';
    insert into public.spine_versions (tbl, row_id, op, data) values ('exercises', 'zz-forged', 'update', '{}');
    execute 'reset role';
    perform pg_temp.rec('rls: not even the coach can write a version from the client', false, 'no error');
  exception when insufficient_privilege then perform pg_temp.rec('rls: not even the coach can write a version from the client', true, sqlerrm); end;
end $t$;
select pg_temp.other() \g /dev/null
do $t$
declare n int;
begin
  execute 'set local role authenticated';
  select count(*) into n from public.spine_versions;
  execute 'reset role';
  perform pg_temp.rec('rls: a signed-in athlete or buyer reads none', n = 0, n::text);
end $t$;
do $t$
begin
  begin
    execute 'set local role anon';
    perform count(*) from public.spine_versions;
    execute 'reset role';
    perform pg_temp.rec('rls: anon has no access at all', false, 'no error');
  exception when insufficient_privilege then perform pg_temp.rec('rls: anon has no access at all', true, sqlerrm); end;
  begin
    execute 'set local role authenticated';
    perform public.spine_keep_version();
    execute 'reset role';
    perform pg_temp.rec('the trigger function cannot be called as a function', false, 'no error');
  exception when insufficient_privilege then perform pg_temp.rec('the trigger function cannot be called as a function', true, sqlerrm); end;
end $t$;
select pg_temp.coach() \g /dev/null

-- ═════════════════════ D. stage45: forget_contact() refuses a coached athlete ═════════════════════
-- A free Proof signup is forgotten exactly as before; an athlete whose programme is not tier 'free' is refused and
-- NOTHING is deleted (their progress row is also their training app's cloud copy). A Proof-only contact (no programme
-- row) is forgotten. Someone who is not the coach is refused.
select pg_temp.coach() \g /dev/null
insert into public.programs (athlete_id, data) values
  ('zz_free',    '{"athlete":{"tier":"free","name":"Zed Free"}}'),
  ('zz_free2',   '{"tier":"free"}'),
  ('zz_coached', '{"athlete":{"tier":"3mo","name":"Zed Coached"}}'),
  ('zz_notier',  '{"athlete":{"name":"No Tier"}}');
insert into public.hab_contacts (athlete_id, email, source, tier) values
  ('zz_free', 'free@example.invalid', 'proof', 'free'), ('zz_free2', 'free2@example.invalid', 'proof', 'free'),
  ('zz_coached', 'coached@example.invalid', 'proof', 'coached'), ('zz_notier', 'notier@example.invalid', 'proof', 'free'),
  ('zz_proofonly', 'proofonly@example.invalid', 'proof', 'free');
insert into public.athlete_progress (athlete_id, data) values
  ('zz_free', '{"habits":1}'), ('zz_free2', '{"habits":2}'), ('zz_coached', '{"records":"precious"}'), ('zz_notier', '{"x":1}'), ('zz_proofonly', '{"habits":3}');
insert into public.leaderboard_optin (athlete_id, display_name) values ('zz_free', 'Zed'), ('zz_coached', 'Zed C');
insert into public.hab_notes (athlete_id, day, body) values ('zz_free', '2026-01-01', 'hi'), ('zz_coached', '2026-01-01', 'hi');
insert into public.athlete_keys (athlete_id, secret_key) values ('zz_free', 'k1'), ('zz_coached', 'k2');

do $t$
declare n int;
begin
  perform public.forget_contact('zz_free');
  select count(*) into n from (
    select 1 from public.hab_contacts where athlete_id = 'zz_free' union all select 1 from public.athlete_progress where athlete_id = 'zz_free'
    union all select 1 from public.leaderboard_optin where athlete_id = 'zz_free' union all select 1 from public.hab_notes where athlete_id = 'zz_free'
    union all select 1 from public.athlete_keys where athlete_id = 'zz_free') x;
  perform pg_temp.rec('forget: a free signup is forgotten (contact, habit data, board entry, notes, key)', n = 0, n::text);
  perform pg_temp.rec('forget: ...their programme row stays (Forget is not an erasure)', exists (select 1 from public.programs where athlete_id = 'zz_free'), '');
  perform public.forget_contact('zz_free2');
  perform pg_temp.rec('forget: a programme whose tier sits at the top level (not under athlete) counts as free too', not exists (select 1 from public.hab_contacts where athlete_id = 'zz_free2'), '');
  perform public.forget_contact('zz_proofonly');
  perform pg_temp.rec('forget: a Proof-only contact (no programme row) is forgotten', not exists (select 1 from public.hab_contacts where athlete_id = 'zz_proofonly') and not exists (select 1 from public.athlete_progress where athlete_id = 'zz_proofonly'), '');
  begin perform public.forget_contact('zz_coached');
    perform pg_temp.rec('forget: a coached athlete is refused', false, 'no error');
  exception when others then perform pg_temp.rec('forget: a coached athlete is refused', sqlerrm like 'coached athlete: forget would delete their training app data%', sqlerrm); end;
  select count(*) into n from (
    select 1 from public.hab_contacts where athlete_id = 'zz_coached' union all select 1 from public.athlete_progress where athlete_id = 'zz_coached'
    union all select 1 from public.leaderboard_optin where athlete_id = 'zz_coached' union all select 1 from public.hab_notes where athlete_id = 'zz_coached'
    union all select 1 from public.athlete_keys where athlete_id = 'zz_coached') x;
  perform pg_temp.rec('forget: ...and not one of their rows was deleted', n = 5, n::text);
  begin perform public.forget_contact('zz_notier');
    perform pg_temp.rec('forget: a programme with no tier at all is treated as coached (refused)', false, 'no error');
  exception when others then perform pg_temp.rec('forget: a programme with no tier at all is treated as coached (refused)', sqlerrm like 'coached athlete:%', sqlerrm); end;
end $t$;

select pg_temp.other() \g /dev/null
do $t$
begin
  begin perform public.forget_contact('zz_coached');
    perform pg_temp.rec('forget: someone who is not the coach is refused', false, 'no error');
  exception when others then perform pg_temp.rec('forget: someone who is not the coach is refused', sqlerrm = 'coach only', sqlerrm); end;
  begin
    execute 'set local role anon';
    perform public.forget_contact('zz_coached');
    execute 'reset role';
    perform pg_temp.rec('forget: anon cannot even call it', false, 'no error');
  exception when insufficient_privilege then perform pg_temp.rec('forget: anon cannot even call it', true, sqlerrm); end;
end $t$;
select pg_temp.coach() \g /dev/null

-- ═════════════════════ E. stage50: the coach READS the testing app's players, notes and results ═════════════════════
-- A buyer sees only their own rows (their policies are untouched), the coach reads every buyer's rows and cannot change
-- one, someone who is neither sees nothing, anon has no access at all.
create function pg_temp.buyer(u uuid) returns void language plpgsql as $$ begin
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated', 'email', 'buyer@example.invalid')::text, false);
end $$;
select pg_temp.nobody() \g /dev/null
insert into public.assess_accounts (user_id, username) values
  ('00000000-0000-0000-0000-0000000000a1', 'zz_buyer_a'), ('00000000-0000-0000-0000-0000000000a2', 'zz_buyer_b');
insert into public.assess_players (id, account_id, name) values
  ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000a1', 'Zed One'),
  ('00000000-0000-0000-0000-00000000b002', '00000000-0000-0000-0000-0000000000a1', 'Zed Two'),
  ('00000000-0000-0000-0000-00000000b003', '00000000-0000-0000-0000-0000000000a2', 'Zed Three');
insert into public.assess_notes (player_id, account_id, body) values
  ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000a1', 'note a'),
  ('00000000-0000-0000-0000-00000000b003', '00000000-0000-0000-0000-0000000000a2', 'note b');
insert into public.assess_results (player_id, test, day, account_id, value, deleted_at) values
  ('00000000-0000-0000-0000-00000000b001', 'sprint', '2026-01-01', '00000000-0000-0000-0000-0000000000a1', 5.1, null),
  ('00000000-0000-0000-0000-00000000b001', 'sprint', '2026-02-01', '00000000-0000-0000-0000-0000000000a1', 5.0, now()),
  ('00000000-0000-0000-0000-00000000b003', 'sprint', '2026-01-01', '00000000-0000-0000-0000-0000000000a2', 6.0, null);

do $t$
declare p int; n int; r int; k int;
begin
  -- the coach reads everything, soft-deleted rows included (a backup must be complete)
  perform pg_temp.coach();
  execute 'set local role authenticated';
  select count(*) into p from public.assess_players; select count(*) into n from public.assess_notes; select count(*) into r from public.assess_results;
  execute 'reset role';
  perform pg_temp.rec('testing app: the coach reads every buyer''s players, notes and results (soft-deleted rows too)', p = 3 and n = 2 and r = 3, format('%s/%s/%s', p, n, r));

  -- ...and cannot change one: read only
  begin
    execute 'set local role authenticated';
    insert into public.assess_players (account_id, name) values ('00000000-0000-0000-0000-0000000000a1', 'Injected');
    execute 'reset role';
    perform pg_temp.rec('testing app: the coach cannot add a player', false, 'no error');
  exception when insufficient_privilege then perform pg_temp.rec('testing app: the coach cannot add a player', true, sqlerrm); end;
  execute 'set local role authenticated';
  with u as (update public.assess_players set name = 'Changed' returning 1) select count(*) into k from u;
  execute 'reset role';
  perform pg_temp.rec('testing app: the coach cannot rename a player (no row is touched)', k = 0, k::text);
  execute 'set local role authenticated';
  with d as (delete from public.assess_notes returning 1) select count(*) into k from d;
  execute 'reset role';
  perform pg_temp.rec('testing app: the coach cannot delete a note (no row is touched)', k = 0, k::text);
  execute 'set local role authenticated';
  with u as (update public.assess_results set value = 0 returning 1) select count(*) into k from u;
  execute 'reset role';
  perform pg_temp.rec('testing app: the coach cannot change a result (no row is touched)', k = 0, k::text);

  -- a buyer sees only their own
  perform pg_temp.buyer('00000000-0000-0000-0000-0000000000a1');
  execute 'set local role authenticated';
  select count(*) into p from public.assess_players; select count(*) into n from public.assess_notes; select count(*) into r from public.assess_results;
  execute 'reset role';
  perform pg_temp.rec('testing app: a buyer still reads only their own players, notes and results', p = 2 and n = 1 and r = 2, format('%s/%s/%s', p, n, r));
  execute 'set local role authenticated';
  with u as (update public.assess_players set name = 'Renamed by owner' where account_id = '00000000-0000-0000-0000-0000000000a1' returning 1) select count(*) into k from u;
  execute 'reset role';
  perform pg_temp.rec('testing app: ...and can still change their own', k = 2, k::text);

  -- someone who is neither a buyer nor the coach sees nothing
  perform pg_temp.other();
  execute 'set local role authenticated';
  select count(*) into p from public.assess_players; select count(*) into n from public.assess_notes; select count(*) into r from public.assess_results;
  execute 'reset role';
  perform pg_temp.rec('testing app: a signed-in user who is neither buyer nor coach reads none', p = 0 and n = 0 and r = 0, format('%s/%s/%s', p, n, r));

  -- anon has no access at all
  begin
    execute 'set local role anon';
    perform count(*) from public.assess_players;
    execute 'reset role';
    perform pg_temp.rec('testing app: anon has no access', false, 'no error');
  exception when insufficient_privilege then perform pg_temp.rec('testing app: anon has no access', true, sqlerrm); end;
end $t$;
select pg_temp.coach() \g /dev/null

-- ═════════════════════ F. stage51: a stored first password is cleared once the person has signed in with it ═════════════════════
-- The rule is the one coach_login_use() always used for "signed in with it": last_sign_in_at later than password_set_at.
-- It must never get in the way of a sign-in, and a reset (a newer password_set_at) is cleared by the NEXT sign-in.
select pg_temp.nobody() \g /dev/null
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'c1@example.invalid'), ('00000000-0000-0000-0000-0000000000c2', 'c2@example.invalid'),
  ('00000000-0000-0000-0000-0000000000c3', 'c3@example.invalid'), ('00000000-0000-0000-0000-0000000000c4', 'c4@example.invalid'),
  ('00000000-0000-0000-0000-0000000000c5', 'c5@example.invalid'), ('00000000-0000-0000-0000-0000000000c6', 'c6@example.invalid');
insert into public.athlete_identities (user_id, athlete_id, initial_password, password_set_at) values
  ('00000000-0000-0000-0000-0000000000c1', 'zz_p1', 'pw-1', now() - interval '2 hours'),
  ('00000000-0000-0000-0000-0000000000c2', 'zz_p2', 'pw-2', now() - interval '2 hours'),
  ('00000000-0000-0000-0000-0000000000c3', 'zz_p3', 'pw-3', now() - interval '1 hour');
insert into public.tps_accounts (user_id, username, initial_password, password_set_at) values
  ('00000000-0000-0000-0000-0000000000c4', 'zz_course', 'pw-4', now() - interval '2 hours');
insert into public.assess_accounts (user_id, username, initial_password, password_set_at, sent_at) values
  ('00000000-0000-0000-0000-0000000000c5', 'zz_test5', 'pw-5', now() - interval '2 hours', null),
  ('00000000-0000-0000-0000-0000000000c6', 'zz_test6', 'pw-6', now() - interval '2 hours', '2020-01-01');
create function pg_temp.pw(t text, k text) returns text language plpgsql as $$ declare r text; begin
  if t = 'a' then select coalesce(initial_password, '(cleared)') into r from public.athlete_identities where athlete_id = k;
  elsif t = 'c' then select coalesce(initial_password, '(cleared)') into r from public.tps_accounts where username = k;
  else select coalesce(initial_password, '(cleared)') into r from public.assess_accounts where username = k; end if;
  return r; end $$;

do $t$
declare sent timestamptz; ls timestamptz;
begin
  -- nothing happens until someone signs in
  update auth.users set email = 'c1b@example.invalid' where id = '00000000-0000-0000-0000-0000000000c1';
  perform pg_temp.rec('passwords: a change to anything but the sign-in time leaves the password alone', pg_temp.pw('a', 'zz_p1') = 'pw-1', pg_temp.pw('a', 'zz_p1'));
  update auth.users set last_sign_in_at = null where id = '00000000-0000-0000-0000-0000000000c1';
  perform pg_temp.rec('passwords: a sign-in time that did not change fires nothing', pg_temp.pw('a', 'zz_p1') = 'pw-1', '');

  -- an athlete signs in after the password was set: cleared, and sent_at says when it reached them
  update auth.users set last_sign_in_at = now() where id = '00000000-0000-0000-0000-0000000000c2';
  select sent_at into sent from public.athlete_identities where athlete_id = 'zz_p2';
  select last_sign_in_at into ls from auth.users where id = '00000000-0000-0000-0000-0000000000c2';
  perform pg_temp.rec('passwords: an athlete who signs in with it has it cleared', pg_temp.pw('a', 'zz_p2') = '(cleared)', pg_temp.pw('a', 'zz_p2'));
  perform pg_temp.rec('passwords: ...and sent_at is the sign-in time (they drop out of "Logins to send")', sent is not distinct from ls and sent is not null, coalesce(sent::text, 'null'));
  perform pg_temp.rec('passwords: ...while nobody else is touched', pg_temp.pw('a', 'zz_p1') = 'pw-1' and pg_temp.pw('a', 'zz_p3') = 'pw-3', '');

  -- a reset after the last sign-in: the old sign-in does not clear the new password; the next one does
  update auth.users set last_sign_in_at = now() - interval '3 hours' where id = '00000000-0000-0000-0000-0000000000c3';
  perform pg_temp.rec('passwords: a sign-in from BEFORE the password was set (a reset since) does not clear it', pg_temp.pw('a', 'zz_p3') = 'pw-3', pg_temp.pw('a', 'zz_p3'));
  update auth.users set last_sign_in_at = now() where id = '00000000-0000-0000-0000-0000000000c3';
  perform pg_temp.rec('passwords: ...the next sign-in clears it', pg_temp.pw('a', 'zz_p3') = '(cleared)', pg_temp.pw('a', 'zz_p3'));

  -- the course and the testing app are the same; a sent_at that was already set is kept
  update auth.users set last_sign_in_at = now() where id in ('00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-0000000000c5', '00000000-0000-0000-0000-0000000000c6');
  perform pg_temp.rec('passwords: a course buyer who signs in has it cleared', pg_temp.pw('c', 'zz_course') = '(cleared)', pg_temp.pw('c', 'zz_course'));
  perform pg_temp.rec('passwords: a testing-app buyer who signs in has it cleared', pg_temp.pw('t', 'zz_test5') = '(cleared)' and pg_temp.pw('t', 'zz_test6') = '(cleared)', pg_temp.pw('t', 'zz_test5'));
  perform pg_temp.rec('passwords: ...and an existing sent_at is kept, not overwritten', (select sent_at from public.assess_accounts where username = 'zz_test6') = '2020-01-01', (select sent_at::text from public.assess_accounts where username = 'zz_test6'));
end $t$;

-- it must never block a sign-in: a failure inside the bookkeeping is swallowed and the sign-in time still lands
create function pg_temp.refuse() returns trigger language plpgsql as $$ begin raise exception 'fixture: the login table is locked down'; end $$;
create trigger zz_refuse before update on public.athlete_identities for each row execute function pg_temp.refuse();
do $t$
declare ls timestamptz;
begin
  update auth.users set last_sign_in_at = now() where id = '00000000-0000-0000-0000-0000000000c1';
  select last_sign_in_at into ls from auth.users where id = '00000000-0000-0000-0000-0000000000c1';
  perform pg_temp.rec('passwords: if clearing fails, the sign-in still goes through', ls is not null, coalesce(ls::text, 'null'));
  perform pg_temp.rec('passwords: ...and the password stays, as before (nothing half-done)', pg_temp.pw('a', 'zz_p1') = 'pw-1', pg_temp.pw('a', 'zz_p1'));
end $t$;
drop trigger zz_refuse on public.athlete_identities;
do $t$
begin
  update auth.users set last_sign_in_at = now() + interval '1 second' where id = '00000000-0000-0000-0000-0000000000c1';
  perform pg_temp.rec('passwords: ...and once the table works again the next sign-in clears it', pg_temp.pw('a', 'zz_p1') = '(cleared)', pg_temp.pw('a', 'zz_p1'));
end $t$;

-- the backfill (the end of the stage file) clears passwords whose person already signed in before the trigger existed
insert into auth.users (id, email, last_sign_in_at) values
  ('00000000-0000-0000-0000-0000000000d1', 'd1@example.invalid', now() - interval '1 hour'),
  ('00000000-0000-0000-0000-0000000000d2', 'd2@example.invalid', now() - interval '3 hours'),
  ('00000000-0000-0000-0000-0000000000d3', 'd3@example.invalid', null);
insert into public.athlete_identities (user_id, athlete_id, initial_password, password_set_at) values
  ('00000000-0000-0000-0000-0000000000d1', 'zz_old_used', 'pw-d1', now() - interval '2 hours'),
  ('00000000-0000-0000-0000-0000000000d2', 'zz_old_reset', 'pw-d2', now() - interval '2 hours'),
  ('00000000-0000-0000-0000-0000000000d3', 'zz_old_never', 'pw-d3', now() - interval '2 hours');
-- (d1 signed in an hour ago, after the password was set 2 hours ago: used. d2 signed in 3 hours ago, before: not used. d3 never.)
\i supabase/stage51_clear_used_passwords.sql
do $t$
begin
  perform pg_temp.rec('passwords: the backfill clears one already used', pg_temp.pw('a', 'zz_old_used') = '(cleared)', pg_temp.pw('a', 'zz_old_used'));
  perform pg_temp.rec('passwords: ...and leaves one from before a reset and one never used', pg_temp.pw('a', 'zz_old_reset') = 'pw-d2' and pg_temp.pw('a', 'zz_old_never') = 'pw-d3', '');
end $t$;

select pg_temp.other() \g /dev/null
do $t$
begin
  begin
    execute 'set local role authenticated';
    perform public.clear_used_first_passwords();
    execute 'reset role';
    perform pg_temp.rec('passwords: the trigger function cannot be called by a signed-in user', false, 'no error');
  exception when insufficient_privilege then perform pg_temp.rec('passwords: the trigger function cannot be called by a signed-in user', true, sqlerrm); end;
  begin
    execute 'set local role anon';
    perform public.clear_used_first_passwords();
    execute 'reset role';
    perform pg_temp.rec('passwords: ...nor by anon', false, 'no error');
  exception when insufficient_privilege then perform pg_temp.rec('passwords: ...nor by anon', true, sqlerrm); end;
end $t$;
select pg_temp.coach() \g /dev/null

-- ═════════════════════ report ═════════════════════
select count(*) filter (where ok) as passed, count(*) filter (where not ok) as failed, (count(*) filter (where not ok) > 0) as anyfail from t_res \gset
\echo
\echo === :passed passed, :failed failed ===
select n || '   [' || coalesce(left(v, 300), '') || ']' as failure from t_res where not ok;
\if :anyfail
do $$ begin raise exception 'SQL TESTS FAILED'; end $$;
\endif
