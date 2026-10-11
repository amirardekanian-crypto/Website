-- Assertions for stage45 (forget_contact), stage48 (coach_delete_training_history, coach_save_spine), stage49 (spine_versions)
-- stage50 (the coach reads the testing app's tables), stage51 (used first passwords are cleared), stage52 (version history),
-- stage53 (the buyer note leaves the buyer's reach), stage54 (one-step full erasure) and stage55 (ending a quest run keeps the
-- XP already earned) on the local replica. Run through
-- scripts/test_spine_sql.sh, which loads replica_schema.sql and every stage file first.
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
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a1@example.invalid'), ('00000000-0000-0000-0000-0000000000a2', 'a2@example.invalid');
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

-- ═════════════════════ G. stage52: a programme's version history keeps the current and the previous cycle ═════════════════════
-- Always the newest 20; plus every save since the previous cycle began; never more than 150; 70 days back when the
-- programme has no dates; a programme save must never fail over this.
select pg_temp.nobody() \g /dev/null
create function pg_temp.seed(a text, n int, from_ts timestamptz, to_ts timestamptz) returns void language sql as $$
  insert into public.program_versions (athlete_id, data, saved_at, saved_by)
  select a, '{}'::jsonb, from_ts + (to_ts - from_ts) * (g - 1) / greatest(n - 1, 1), 'seed' from generate_series(1, n) g order by 4 $$;
create function pg_temp.nv(a text) returns int language sql as $$ select count(*)::int from public.program_versions where athlete_id = a $$;

-- 1. cycle 2 (index 1) began 2026-08-10, cycle 1 on 2026-07-06: the horizon is 2026-07-06
insert into public.programs (athlete_id, data) values ('zz_v1', '{"currentCycleIndex":1,"cycles":[{"startDate":"2026-07-06"},{"startDate":"2026-08-10"}],"v":0}');
select pg_temp.seed('zz_v1', 15, '2026-05-01', '2026-05-30');      -- before the previous cycle: should go
select pg_temp.seed('zz_v1', 10, '2026-07-10', '2026-08-05');      -- the previous cycle: keep
select pg_temp.seed('zz_v1', 10, '2026-08-15', '2026-09-30');      -- the current cycle: keep
do $t$
declare n int; oldest timestamptz;
begin
  update public.programs set data = jsonb_set(data, '{v}', '1') where athlete_id = 'zz_v1';
  n := pg_temp.nv('zz_v1');
  select min(saved_at) into oldest from public.program_versions where athlete_id = 'zz_v1';
  perform pg_temp.rec('versions: a save drops what is older than the previous cycle (35 + 1 new - 15 = 21 stay, more than the old 20)', n = 21, n::text);
  perform pg_temp.rec('versions: ...and the oldest left is from the previous cycle or later', oldest >= '2026-07-06', oldest::text);
end $t$;

-- 2. the floor of 20: the cycle began last week, 30 old saves, only the newest 20 stay
insert into public.programs (athlete_id, data) values ('zz_v2', '{"currentCycleIndex":0,"cycles":[{"startDate":"2026-10-05"}],"v":0}');
select pg_temp.seed('zz_v2', 30, '2026-01-01', '2026-03-01');
do $t$
declare n int; kept_old int;
begin
  update public.programs set data = jsonb_set(data, '{v}', '1') where athlete_id = 'zz_v2';
  n := pg_temp.nv('zz_v2');
  select count(*) into kept_old from public.program_versions where athlete_id = 'zz_v2' and saved_by = 'seed';
  perform pg_temp.rec('versions: however recent the cycle, the newest 20 always stay', n = 20, n::text);
  perform pg_temp.rec('versions: ...they are the new save and the 19 newest old ones', kept_old = 19, kept_old::text);
end $t$;

-- 3. the safety cap: a horizon years back, 160 saves, 150 stay (the newest)
insert into public.programs (athlete_id, data) values ('zz_v3', '{"currentCycleIndex":0,"cycles":[{"startDate":"2020-01-01"}],"v":0}');
select pg_temp.seed('zz_v3', 160, '2026-08-01', '2026-09-30');
do $t$
declare n int; lowest_seed timestamptz;
begin
  update public.programs set data = jsonb_set(data, '{v}', '1') where athlete_id = 'zz_v3';
  n := pg_temp.nv('zz_v3');
  select min(saved_at) into lowest_seed from public.program_versions where athlete_id = 'zz_v3';
  perform pg_temp.rec('versions: never more than 150', n = 150, n::text);
  perform pg_temp.rec('versions: ...the oldest 11 went, the newest stay', lowest_seed > '2026-08-01'::timestamptz and (select count(*) from public.program_versions where athlete_id = 'zz_v3' and saved_at <= '2026-08-01'::timestamptz + (interval '60 days' * 10 / 159)) = 0, lowest_seed::text);
end $t$;

-- 4. no dates in the programme: 70 days back. 5 saves 100 days old and 22 from 30 days ago: the 5 go, 22 + the new one stay
insert into public.programs (athlete_id, data) values ('zz_v4', '{"v":0}');
select pg_temp.seed('zz_v4', 5, now() - interval '100 days', now() - interval '99 days');
select pg_temp.seed('zz_v4', 22, now() - interval '31 days', now() - interval '29 days');
do $t$
declare n int;
begin
  update public.programs set data = jsonb_set(data, '{v}', '1') where athlete_id = 'zz_v4';
  n := pg_temp.nv('zz_v4');
  perform pg_temp.rec('versions: with no dates the horizon is 70 days back (the 5 older go; 22 recent + 1 new stay; the floor alone would keep 20)', n = 23, n::text);
end $t$;

-- 5. a programme of any shape can be saved
insert into public.programs (athlete_id, data) values
  ('zz_v5a', '{"currentCycleIndex":"x","cycles":"oops"}'), ('zz_v5b', '{"currentCycleIndex":5,"cycles":{"a":1}}'),
  ('zz_v5c', '{"currentCycleIndex":1,"cycles":[{"startDate":"not a date"},{"startDate":"also not"}]}'), ('zz_v5d', '[1,2,3]'),
  ('zz_v5e', '{"currentCycleIndex":-3,"cycles":[{"startDate":"2026-09-01"}]}'), ('zz_v5f', '"just a string"');
do $t$
declare a text; ok int := 0; n int;
begin
  foreach a in array array['zz_v5a','zz_v5b','zz_v5c','zz_v5d','zz_v5e','zz_v5f'] loop
    begin
      update public.programs set data = jsonb_build_object('changed', true, 'was', a) where athlete_id = a;
      if pg_temp.nv(a) = 1 then ok := ok + 1; end if;
    exception when others then null; end;
  end loop;
  perform pg_temp.rec('versions: programmes with odd shapes (a string index, cycles that is not a list, bad dates, an array, a negative index, a bare string) all save and keep their version', ok = 6, ok::text);
end $t$;

-- 6. an update that does not change the programme keeps no version and still stamps updated_at
do $t$
declare before_n int; t0 timestamptz; t1 timestamptz;
begin
  before_n := pg_temp.nv('zz_v1');
  select updated_at into t0 from public.programs where athlete_id = 'zz_v1';
  perform pg_sleep(0.02);
  update public.programs set updated_by = 'someone' where athlete_id = 'zz_v1';
  select updated_at into t1 from public.programs where athlete_id = 'zz_v1';
  perform pg_temp.rec('versions: an update that changes nothing in the programme keeps no version', pg_temp.nv('zz_v1') = before_n, '');
  perform pg_temp.rec('versions: ...and still stamps updated_at (the dashboard''s guarded save reads it)', t1 > t0, t0::text || ' -> ' || t1::text);
end $t$;

-- 7. each athlete is pruned on their own
do $t$
begin
  perform pg_temp.rec('versions: another athlete''s history is untouched by a save', pg_temp.nv('zz_v2') = 20 and pg_temp.nv('zz_v3') = 150 and pg_temp.nv('zz_v4') = 23, '');
end $t$;

-- 8. if working out the horizon ever fails, the programme still saves and falls back to 70 days
create or replace function public.programs_keep_versions_from(p_data jsonb) returns timestamptz language plpgsql as $$ begin raise exception 'fixture: the horizon function is broken'; end $$;
insert into public.programs (athlete_id, data) values ('zz_v6', '{"v":0}');
select pg_temp.seed('zz_v6', 3, now() - interval '200 days', now() - interval '190 days');
select pg_temp.seed('zz_v6', 22, now() - interval '31 days', now() - interval '29 days');
do $t$
declare saved boolean := true; n int;
begin
  begin update public.programs set data = '{"v":1}' where athlete_id = 'zz_v6'; exception when others then saved := false; end;
  n := pg_temp.nv('zz_v6');
  perform pg_temp.rec('versions: a broken horizon function does not stop the programme save', saved, '');
  perform pg_temp.rec('versions: ...and the 70-day fallback is used (3 old go, 22 + 1 stay)', n = 23, n::text);
end $t$;
\i supabase/stage52_version_history_two_cycles.sql

-- ═════════════════════ H. stage53: the coach's note about a buyer is out of the buyer's reach ═════════════════════
-- The note is typed when the login is made. The Edge Functions still insert it as `label`; a trigger moves it to buyer_notes, which
-- only the coach can read or write, and leaves the account row's label empty. A buyer reads their own account row.
select pg_temp.nobody() \g /dev/null
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000b1', 'b1@example.invalid'), ('00000000-0000-0000-0000-0000000000b2', 'b2@example.invalid'),
  ('00000000-0000-0000-0000-0000000000b3', 'b3@example.invalid'), ('00000000-0000-0000-0000-0000000000b4', 'b4@example.invalid');
-- written as the Edge Functions write it: as the table owner, with a label
insert into public.tps_accounts (user_id, username, label) values ('00000000-0000-0000-0000-0000000000b1', 'zz_note_a', '  Ali from Instagram  ');
insert into public.tps_accounts (user_id, username) values ('00000000-0000-0000-0000-0000000000b2', 'zz_note_b');
insert into public.assess_accounts (user_id, username, label) values ('00000000-0000-0000-0000-0000000000b3', 'zz_note_c', repeat('x', 85));

do $t$
declare l text; note text; app text; n int; k int;
begin
  select label into l from public.tps_accounts where user_id = '00000000-0000-0000-0000-0000000000b1';
  select b.note, b.app into note, app from public.buyer_notes b where b.user_id = '00000000-0000-0000-0000-0000000000b1';
  perform pg_temp.rec('buyer notes: a label written with the account lands in buyer_notes, trimmed, for the right app', note = 'Ali from Instagram' and app = 'course', coalesce(note, '(none)'));
  perform pg_temp.rec('buyer notes: ...and the account row itself carries no label', l is null, coalesce(l, 'null'));
  select count(*) into n from public.buyer_notes where user_id = '00000000-0000-0000-0000-0000000000b2';
  perform pg_temp.rec('buyer notes: an account made with no label gets no note row', n = 0, n::text);
  select length(b.note), b.app into k, app from public.buyer_notes b where b.user_id = '00000000-0000-0000-0000-0000000000b3';
  perform pg_temp.rec('buyer notes: a testing-app note is kept to 80 characters and filed under testing', k = 80 and app = 'testing', coalesce(k::text, '(none)'));
  select label into l from public.assess_accounts where user_id = '00000000-0000-0000-0000-0000000000b3';
  perform pg_temp.rec('buyer notes: ...the testing account row carries no label either', l is null, coalesce(l, 'null'));

  -- a later label (the coach, or an Edge Function) replaces the note
  update public.tps_accounts set label = 'Ali, the second one' where user_id = '00000000-0000-0000-0000-0000000000b1';
  select b.note into note from public.buyer_notes b where b.user_id = '00000000-0000-0000-0000-0000000000b1';
  select label into l from public.tps_accounts where user_id = '00000000-0000-0000-0000-0000000000b1';
  perform pg_temp.rec('buyer notes: a label written later replaces the note and is cleared from the row', note = 'Ali, the second one' and l is null, coalesce(note, '(none)'));
  -- the coach's other updates (Mark sent) do not touch the note
  update public.tps_accounts set initial_password = null, sent_at = now() where user_id = '00000000-0000-0000-0000-0000000000b1';
  select b.note into note from public.buyer_notes b where b.user_id = '00000000-0000-0000-0000-0000000000b1';
  perform pg_temp.rec('buyer notes: Mark sent and other updates leave the note alone', note = 'Ali, the second one', coalesce(note, '(none)'));
  -- a blank label moves nothing
  update public.tps_accounts set label = '   ' where user_id = '00000000-0000-0000-0000-0000000000b1';
  select b.note into note from public.buyer_notes b where b.user_id = '00000000-0000-0000-0000-0000000000b1';
  perform pg_temp.rec('buyer notes: a blank label leaves the note as it was', note = 'Ali, the second one', coalesce(note, '(none)'));
end $t$;

do $t$
declare l text; n int; k int;
begin
  -- the buyer: their own account row has no note, and buyer_notes is closed to them
  perform pg_temp.buyer('00000000-0000-0000-0000-0000000000b1');
  execute 'set local role authenticated';
  select count(*), max(label) into n, l from public.tps_accounts;
  select count(*) into k from public.buyer_notes;
  execute 'reset role';
  perform pg_temp.rec('buyer notes: a buyer reads their own account row and its label is empty', n = 1 and l is null, format('%s rows, label %s', n, coalesce(l, 'null')));
  perform pg_temp.rec('buyer notes: ...and reads none of the notes', k = 0, k::text);
  begin
    execute 'set local role authenticated';
    insert into public.buyer_notes (user_id, app, note) values ('00000000-0000-0000-0000-0000000000b1', 'course', 'self-written');
    execute 'reset role';
    perform pg_temp.rec('buyer notes: a buyer cannot write a note', false, 'no error');
  exception when others then perform pg_temp.rec('buyer notes: a buyer cannot write a note', sqlstate in ('42501'), sqlerrm); end;
  execute 'set local role authenticated';
  with u as (update public.buyer_notes set note = 'changed' returning 1) select count(*) into k from u;
  execute 'reset role';
  perform pg_temp.rec('buyer notes: ...or change one (no row is touched)', k = 0, k::text);
  execute 'set local role authenticated';
  with d as (delete from public.buyer_notes returning 1) select count(*) into k from d;
  execute 'reset role';
  perform pg_temp.rec('buyer notes: ...or delete one (no row is touched)', k = 0, k::text);

  -- someone who is neither: nothing
  perform pg_temp.other();
  execute 'set local role authenticated';
  select count(*) into k from public.buyer_notes;
  execute 'reset role';
  perform pg_temp.rec('buyer notes: a signed-in user who is not the coach reads none', k = 0, k::text);

  -- the coach reads, writes and deletes
  perform pg_temp.coach();
  execute 'set local role authenticated';
  select count(*) into k from public.buyer_notes where user_id in ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b3');
  execute 'reset role';
  perform pg_temp.rec('buyer notes: the coach reads every note', k = 2, k::text);
  execute 'set local role authenticated';
  update public.buyer_notes set note = 'coach edit' where user_id = '00000000-0000-0000-0000-0000000000b1';
  insert into public.buyer_notes (user_id, app, note) values ('00000000-0000-0000-0000-0000000000b2', 'course', 'coach insert');
  with d as (delete from public.buyer_notes where user_id = '00000000-0000-0000-0000-0000000000b2' returning 1) select count(*) into k from d;
  execute 'reset role';
  perform pg_temp.rec('buyer notes: ...and can edit, add and remove one', k = 1 and (select note from public.buyer_notes where user_id = '00000000-0000-0000-0000-0000000000b1') = 'coach edit', k::text);

  -- shape
  begin insert into public.buyer_notes (user_id, app, note) values ('00000000-0000-0000-0000-0000000000b2', 'elsewhere', 'x');
    perform pg_temp.rec('buyer notes: an app other than course or testing is refused', false, 'no error');
  exception when check_violation then perform pg_temp.rec('buyer notes: an app other than course or testing is refused', true, sqlerrm); end;
  begin insert into public.buyer_notes (user_id, app, note) values ('00000000-0000-0000-0000-0000000000b2', 'course', repeat('y', 81));
    perform pg_temp.rec('buyer notes: a note over 80 characters is refused', false, 'no error');
  exception when check_violation then perform pg_temp.rec('buyer notes: a note over 80 characters is refused', true, sqlerrm); end;
  perform pg_temp.rec('buyer notes: the trigger function cannot be called by a signed-in user', not has_function_privilege('authenticated', 'public.move_buyer_label()', 'execute'), '');
  perform pg_temp.rec('buyer notes: ...nor by anon', not has_function_privilege('anon', 'public.move_buyer_label()', 'execute'), '');

  -- the note goes with the buyer
  delete from auth.users where id = '00000000-0000-0000-0000-0000000000b3';
  select count(*) into k from public.buyer_notes where user_id = '00000000-0000-0000-0000-0000000000b3';
  perform pg_temp.rec('buyer notes: deleting the buyer''s sign-in account takes the note with it', k = 0, k::text);
end $t$;

-- the backfill: notes already stored (written while the trigger was off, as they were before stage53) move on a re-run
alter table public.tps_accounts disable trigger tps_accounts_label_trg;
insert into public.tps_accounts (user_id, username, label) values ('00000000-0000-0000-0000-0000000000b4', 'zz_note_old', 'Old note');
alter table public.tps_accounts enable trigger tps_accounts_label_trg;
-- what the project's default privileges hand every new table: the file must take it away from anon again
grant all on table public.buyer_notes to anon;
\i supabase/stage53_buyer_notes.sql
do $t$
declare l text; note text; keep text;
begin
  select label into l from public.tps_accounts where user_id = '00000000-0000-0000-0000-0000000000b4';
  select b.note into note from public.buyer_notes b where b.user_id = '00000000-0000-0000-0000-0000000000b4';
  select b.note into keep from public.buyer_notes b where b.user_id = '00000000-0000-0000-0000-0000000000b1';
  perform pg_temp.rec('buyer notes: re-running the file moves an old stored label into buyer_notes and clears it', note = 'Old note' and l is null, coalesce(note, '(none)'));
  perform pg_temp.rec('buyer notes: ...and leaves a note that is already there as it was', keep = 'coach edit', coalesce(keep, '(none)'));
end $t$;
do $t$
begin
  begin
    execute 'set local role anon';
    perform count(*) from public.buyer_notes;
    execute 'reset role';
    perform pg_temp.rec('buyer notes: anon has no access (the file takes back the project''s default grant)', false, 'no error');
  exception when insufficient_privilege then perform pg_temp.rec('buyer notes: anon has no access (the file takes back the project''s default grant)', true, sqlerrm); end;
end $t$;
select pg_temp.coach() \g /dev/null

-- ═════════════════════ I. stage54: one-step full erasure of an athlete or a buyer ═════════════════════
select pg_temp.nobody() \g /dev/null
-- a fingerprint of every row in the public, backup and auth tables: equal before and after means NOTHING changed
create function pg_temp.fingerprint() returns text language plpgsql as $$
declare t record; h text := ''; x text;
begin
  for t in select n.nspname, c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where c.relkind = 'r' and n.nspname in ('public', 'backup', 'auth') order by 1, 2 loop
    execute format('select coalesce(md5(string_agg(r::text, ''|'' order by r::text)), '''') from %I.%I r', t.nspname, t.relname) into x;
    h := h || t.nspname || '.' || t.relname || '=' || x || ';';
  end loop;
  return md5(h);
end $$;
-- rows left under an athlete id, in the public and backup schemas, found from the catalogue (not from the function's own list)
create function pg_temp.rows_for(p_id text) returns bigint language plpgsql as $$
declare t record; n bigint; total bigint := 0;
begin
  for t in select s.nspname::text as sch, c.relname::text as tbl from pg_attribute a join pg_class c on c.oid = a.attrelid join pg_namespace s on s.oid = c.relnamespace
            where s.nspname in ('public', 'backup') and a.attname = 'athlete_id' and a.attnum > 0 and not a.attisdropped and c.relkind = 'r' loop
    execute format('select count(*) from %I.%I where athlete_id::text = $1', t.sch, t.tbl) into n using p_id;
    total := total + n;
  end loop;
  return total;
end $$;
create function pg_temp.seed_athlete(p_id text, p_user uuid, p_first text, p_last text, p_email text, p_wa text default '+0000') returns void language plpgsql as $$
begin
  insert into auth.users (id, email) values (p_user, 'athlete.' || p_id || '@amirardekani.com');
  insert into auth.sessions (user_id) values (p_user);
  insert into auth.identities (user_id) values (p_user);
  insert into public.athlete_identities (user_id, athlete_id, email) values (p_user, p_id, 'athlete.' || p_id || '@amirardekani.com');
  insert into public.programs (athlete_id, data) values (p_id, jsonb_build_object('athlete', jsonb_build_object('firstName', p_first, 'lastName', p_last, 'tier', 'coached')));
  insert into public.program_versions (athlete_id, data) select p_id, '{"v":1}'::jsonb from generate_series(1, 4);
  insert into public.session_history (athlete_id, day, completed_on) values (p_id, 1, '2026-01-01'), (p_id, 2, '2026-01-02');
  insert into public.athlete_progress (athlete_id, data) values (p_id, '{"a":1}');
  insert into public.hab_notes (athlete_id, day, body) values (p_id, '2026-01-01', 'x'), (p_id, '2026-01-02', 'y');
  insert into public.hab_titles (athlete_id, title) values (p_id, 'T1'), (p_id, 'T2');
  insert into public.hab_season_results (athlete_id, starts_on, season_name, ended_on, level, xp) values (p_id, '2026-01-01', 'S', '2026-03-01', 3, 100);
  insert into public.leaderboard_optin (athlete_id, display_name) values (p_id, 'Board ' || p_first);
  insert into public.library_sessions (athlete_id, slug) values (p_id, 'zz-session');
  insert into public.messages (athlete_id, sender, body) values (p_id, 'athlete', 'hi'), (p_id, 'coach', 'hello');
  insert into public.call_logs (athlete_id, call_date) values (p_id, '2026-01-05');
  insert into public.cycle_reports (athlete_id, cycle, report) values (p_id, 'C1', '{}');
  insert into public.coaching_logs (athlete_id, body) values (p_id, 'log');
  insert into public.coaching_log_versions (athlete_id, body) select p_id, 'old ' || g from generate_series(1, 3) g;
  insert into public.athlete_keys (athlete_id, secret_key) values (p_id, 'k');
  insert into public.hab_contacts (athlete_id, email, whatsapp, source, tier) values (p_id, p_email, p_wa, 'proof', 'free');
  -- the rollback copy the 2026-10-09 rename left in the backup schema: an old progress blob and an old session log
  insert into backup.onename_2026_10_09 (athlete_id, kind, ref, old) values (p_id, 'progress', '{}', '{"x_note_1":"private words"}'), (p_id, 'session_log', '{"day":1}', '{}');
end $$;

select pg_temp.seed_athlete('zz_erase_a', '00000000-0000-0000-0000-0000000000e1', 'Zed', 'Erased', 'Zed.Erased@Example.Invalid', '+989120001111');
select pg_temp.seed_athlete('zz_keep_b',  '00000000-0000-0000-0000-0000000000e2', 'Kay', 'Kept', 'kay.kept@example.invalid', '+989120002222');
insert into public.affiliates (code, coach_name, athlete_id) values ('ZZAFF', 'Zed Erased', 'zz_erase_a'), ('ZZAFFB', 'Kay Kept', 'zz_keep_b');
insert into public.hab_intake (id, name, email, contact, programme) values
  ('00000000-0000-0000-0000-00000000f001', 'Zed Erased', ' ZED.erased@example.invalid ', '@zed', '3 months'),   -- the same email (case and spaces differ)
  ('00000000-0000-0000-0000-00000000f002', 'ZED   erased', 'other@example.invalid', '@someone', '1 month'),     -- the same full name
  ('00000000-0000-0000-0000-00000000f003', 'Someone Else', 'someone@example.invalid', '@else', '6 months'),    -- nobody we are erasing
  ('00000000-0000-0000-0000-00000000f004', 'Kay Kept', 'kay.kept@example.invalid', '+989120002222', '3 months'), -- the control's own form
  ('00000000-0000-0000-0000-00000000f005', 'زد', null, '۰۹۱۲۰۰۰۱۱۱۱', '6 months'),                           -- a Persian name and the same number typed with Persian digits
  ('00000000-0000-0000-0000-00000000f006', 'Short', null, '09120', '1 month');                                 -- digits, but too few to be a number
-- two course buyers and two testing-app buyers
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'tps.zz_course_c@amirardekani.com'), ('00000000-0000-0000-0000-0000000000f2', 'tps.zz_course_d@amirardekani.com'),
  ('00000000-0000-0000-0000-0000000000f3', 'assess.zz_test_t@amirardekani.com'), ('00000000-0000-0000-0000-0000000000f4', 'assess.zz_test_u@amirardekani.com');
insert into auth.sessions (user_id) values ('00000000-0000-0000-0000-0000000000f1'), ('00000000-0000-0000-0000-0000000000f3');
insert into public.tps_accounts (user_id, username, label) values
  ('00000000-0000-0000-0000-0000000000f1', 'zz_course_c', 'Course buyer C'), ('00000000-0000-0000-0000-0000000000f2', 'zz_course_d', 'Course buyer D');
insert into public.assess_accounts (user_id, username, label) values
  ('00000000-0000-0000-0000-0000000000f3', 'zz_test_t', 'Academy T'), ('00000000-0000-0000-0000-0000000000f4', 'zz_test_u', 'Academy U');
insert into public.assess_players (id, account_id, name, deleted_at) values
  ('00000000-0000-0000-0000-00000000c101', '00000000-0000-0000-0000-0000000000f3', 'T Player 1', null),
  ('00000000-0000-0000-0000-00000000c102', '00000000-0000-0000-0000-0000000000f3', 'T Player 2 (removed)', now()),
  ('00000000-0000-0000-0000-00000000c103', '00000000-0000-0000-0000-0000000000f4', 'U Player 1', null);
insert into public.assess_notes (player_id, account_id, body) values
  ('00000000-0000-0000-0000-00000000c101', '00000000-0000-0000-0000-0000000000f3', 'n1'),
  ('00000000-0000-0000-0000-00000000c102', '00000000-0000-0000-0000-0000000000f3', 'n2'),
  ('00000000-0000-0000-0000-00000000c103', '00000000-0000-0000-0000-0000000000f4', 'n3');
insert into public.assess_results (player_id, test, day, account_id, value) values
  ('00000000-0000-0000-0000-00000000c101', 'sprint', '2026-01-01', '00000000-0000-0000-0000-0000000000f3', 5.1),
  ('00000000-0000-0000-0000-00000000c101', 'sprint', '2026-02-01', '00000000-0000-0000-0000-0000000000f3', 5.0),
  ('00000000-0000-0000-0000-00000000c102', 'sprint', '2026-01-01', '00000000-0000-0000-0000-0000000000f3', 6.0),
  ('00000000-0000-0000-0000-00000000c103', 'sprint', '2026-01-01', '00000000-0000-0000-0000-0000000000f4', 7.0);

-- 1. who may call it
select pg_temp.coach() \g /dev/null
do $t$
begin
  perform pg_temp.nobody();
  begin
    execute 'set local role anon';
    perform public.coach_erase_person('athlete', 'zz_erase_a');
    execute 'reset role';
    perform pg_temp.rec('erase: anon cannot even call it', false, 'no error');
  exception when insufficient_privilege then perform pg_temp.rec('erase: anon cannot even call it', true, sqlerrm); end;
  perform pg_temp.other();
  begin
    execute 'set local role authenticated';
    perform public.coach_erase_person('athlete', 'zz_erase_a');
    execute 'reset role';
    perform pg_temp.rec('erase: a signed-in user who is not the coach is refused', false, 'no error');
  exception when others then perform pg_temp.rec('erase: a signed-in user who is not the coach is refused', sqlerrm like '%coach only%', sqlerrm); end;
  perform pg_temp.coach();
end $t$;

-- 2. the dry run: the default, exact, and it changes nothing
do $t$
declare fp0 text; r jsonb; k record; n bigint; bad text := ''; s bigint := 0;
begin
  perform pg_temp.coach();
  fp0 := pg_temp.fingerprint();
  execute 'set local role authenticated';
  r := public.coach_erase_person('athlete', 'zz_erase_a');
  execute 'reset role';
  perform pg_temp.rec('erase: with no flag the call is a dry run', (r ->> 'dry_run')::boolean, r ->> 'dry_run');
  perform pg_temp.rec('erase: ...and it changed nothing in any table (a fingerprint of every row is the same)', pg_temp.fingerprint() = fp0, '');
  perform pg_temp.rec('erase: the preview gives a name to show and the word to type', r ->> 'shown_as' = 'Zed Erased' and r ->> 'confirm_word' = 'zz_erase_a', r ->> 'shown_as');
  for k in select key as t, value::bigint as c from jsonb_each_text(r -> 'counts') where key not in ('auth_users', 'hab_intake') loop
    -- a key is a public table, or "backup.<table>" for a rollback copy in the backup schema
    execute format('select count(*) from %I.%I where athlete_id = ''zz_erase_a''', case when k.t like 'backup.%' then 'backup' else 'public' end, regexp_replace(k.t, '^backup\.', '')) into n;
    if n <> k.c then bad := bad || k.t || ' says ' || k.c || ' but has ' || n || '; '; end if;
    s := s + k.c;
  end loop;
  perform pg_temp.rec('erase: every count in the preview is the real number of rows in that table', bad = '', bad);
  perform pg_temp.rec('erase: the preview lists all 17 athlete tables, the rollback copy, the intake forms and the sign-in account',
    (select count(*) from jsonb_object_keys(r -> 'counts')) = 20 and (r -> 'counts' ->> 'backup.onename_2026_10_09')::int = 2, (select count(*) from jsonb_object_keys(r -> 'counts'))::text);
  perform pg_temp.rec('erase: the total is their sum plus the sign-in account (and no intake form was picked)',
    (r ->> 'total')::bigint = s + 1 and (r -> 'counts' ->> 'auth_users')::int = 1 and (r -> 'counts' ->> 'hab_intake')::int = 0, r ->> 'total');
  perform pg_temp.rec('erase: three intake forms look like theirs: the same email, the same full name, and the same WhatsApp number typed with Persian digits; not the stranger''s, not the other athlete''s, not a number that is too short',
    jsonb_array_length(r -> 'intake_candidates') = 3
    and (select string_agg(c ->> 'id' || ':' || (c ->> 'matched_on'), ',' order by c ->> 'id') from jsonb_array_elements(r -> 'intake_candidates') c)
        = '00000000-0000-0000-0000-00000000f001:email,00000000-0000-0000-0000-00000000f002:name,00000000-0000-0000-0000-00000000f005:whatsapp',
    (r -> 'intake_candidates')::text);
  perform pg_temp.rec('erase: ...and none of them is shared with another athlete''s contact',
    not (select bool_or((c ->> 'shared')::boolean) from jsonb_array_elements(r -> 'intake_candidates') c), (r -> 'intake_candidates')::text);
  perform pg_temp.rec('erase: the partner record that points at them is listed as unlinked (not erased)', r -> 'affiliates_unlinked' = '["ZZAFF"]'::jsonb, (r -> 'affiliates_unlinked')::text);
  -- a dry run with intake forms picked counts them
  execute 'set local role authenticated';
  r := public.coach_erase_person('athlete', 'zz_erase_a', null, array['00000000-0000-0000-0000-00000000f001']::uuid[], true);
  execute 'reset role';
  perform pg_temp.rec('erase: a dry run with an intake form picked counts it, and still changes nothing', (r -> 'counts' ->> 'hab_intake')::int = 1 and pg_temp.fingerprint() = fp0, r -> 'counts' ->> 'hab_intake');
end $t$;

-- 2b. the same email and number on ANOTHER athlete's contact (a parent's, for two children): those forms are flagged shared, so the
-- dashboard never ticks them for the coach
insert into public.hab_contacts (athlete_id, email, whatsapp, source, tier) values ('zz_sibling', ' ZED.erased@example.invalid', '989120001111', 'proof', 'free');
do $t$
declare r jsonb;
begin
  perform pg_temp.coach();
  r := public.coach_erase_person('athlete', 'zz_erase_a');
  perform pg_temp.rec('erase: a form matched by an email or number that another athlete''s contact also carries is flagged shared; a name match is not',
    (select string_agg(c ->> 'id' || ':' || (c ->> 'shared'), ',' order by c ->> 'id') from jsonb_array_elements(r -> 'intake_candidates') c)
      = '00000000-0000-0000-0000-00000000f001:true,00000000-0000-0000-0000-00000000f002:false,00000000-0000-0000-0000-00000000f005:true',
    (r -> 'intake_candidates')::text);
end $t$;
delete from public.hab_contacts where athlete_id = 'zz_sibling';

-- 3. a real run is refused without the typed word, with the wrong one, or with an intake form that is not theirs
do $t$
declare fp0 text := pg_temp.fingerprint(); r jsonb;
begin
  perform pg_temp.coach();
  begin perform public.coach_erase_person('athlete', 'zz_erase_a', null, '{}', false);
    perform pg_temp.rec('erase: a real run without the typed word is refused', false, 'no error');
  exception when others then perform pg_temp.rec('erase: a real run without the typed word is refused', sqlerrm like '%confirmation does not match%', sqlerrm); end;
  begin perform public.coach_erase_person('athlete', 'zz_erase_a', 'zz_keep_b', '{}', false);
    perform pg_temp.rec('erase: ...and with someone else''s id', false, 'no error');
  exception when others then perform pg_temp.rec('erase: ...and with someone else''s id', sqlerrm like '%confirmation does not match%', sqlerrm); end;
  begin perform public.coach_erase_person('athlete', 'zz_erase_a', 'zz_erase_a', array['00000000-0000-0000-0000-00000000ffff']::uuid[], false);
    perform pg_temp.rec('erase: an intake form that does not exist stops the erasure', false, 'no error');
  exception when others then perform pg_temp.rec('erase: an intake form that does not exist stops the erasure', sqlerrm like '%does not exist%' and sqlerrm like '%Nothing was erased%', sqlerrm); end;
  begin perform public.coach_erase_person('athlete', 'zz_erase_a', 'zz_erase_a', array['00000000-0000-0000-0000-00000000f001', null]::uuid[], false);
    perform pg_temp.rec('erase: ...and so does an empty entry in the list', false, 'no error');
  exception when others then perform pg_temp.rec('erase: ...and so does an empty entry in the list', sqlerrm like '%does not exist%', sqlerrm); end;
  begin perform public.coach_erase_person('athlete', 'zz_erase_a', 'zz_erase_a', (select array_agg(gen_random_uuid()) from generate_series(1, 11)), false);
    perform pg_temp.rec('erase: a list of more than 10 intake forms is refused as a mistake', false, 'no error');
  exception when others then perform pg_temp.rec('erase: a list of more than 10 intake forms is refused as a mistake', sqlerrm like '%More than 10 intake forms%', sqlerrm); end;
  perform pg_temp.rec('erase: none of those refusals changed anything', pg_temp.fingerprint() = fp0, '');
end $t$;

-- 4. ids and logins that are never erased
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e3', 'amirardekanian@gmail.com'),
  ('00000000-0000-0000-0000-0000000000e4', 'athlete.zz_selfdel@amirardekani.com'),
  ('00000000-0000-0000-0000-0000000000e5', 'athlete.zz_shared@amirardekani.com');
insert into public.athlete_identities (user_id, athlete_id) values
  ('00000000-0000-0000-0000-0000000000e3', 'zz_coachlogin'), ('00000000-0000-0000-0000-0000000000e4', 'zz_selfdel'), ('00000000-0000-0000-0000-0000000000e5', 'zz_shared');
insert into public.athlete_progress (athlete_id, data) values ('zz_coachlogin', '{}'), ('zz_selfdel', '{}'), ('zz_shared', '{}'), ('demo', '{}'), ('amir_ardekani', '{}');
insert into public.tps_accounts (user_id, username) values ('00000000-0000-0000-0000-0000000000e5', 'zz_shared_buyer');
do $t$
declare fp0 text := pg_temp.fingerprint();
begin
  perform pg_temp.coach();
  begin perform public.coach_erase_person('athlete', 'demo', 'demo', '{}', false);
    perform pg_temp.rec('erase: the public demo is never erased', false, 'no error');
  exception when others then perform pg_temp.rec('erase: the public demo is never erased', sqlerrm like '%never erased%', sqlerrm); end;
  begin perform public.coach_erase_person('athlete', 'AMIR_ardekani', 'AMIR_ardekani', '{}', false);
    perform pg_temp.rec('erase: ...nor the identity the dashboard reads the board through (any case)', false, 'no error');
  exception when others then perform pg_temp.rec('erase: ...nor the identity the dashboard reads the board through (any case)', sqlerrm like '%never erased%', sqlerrm); end;
  begin perform public.coach_erase_person('athlete', 'zz_coachlogin', 'zz_coachlogin', '{}', false);
    perform pg_temp.rec('erase: an athlete whose login is the coach''s own Google account is refused', false, 'no error');
  exception when others then perform pg_temp.rec('erase: an athlete whose login is the coach''s own Google account is refused', sqlerrm like '%yours%', sqlerrm); end;
  -- the signed-in user's own login
  perform set_config('request.jwt.claims', '{"email":"amirardekanian@gmail.com","sub":"00000000-0000-0000-0000-0000000000e4","role":"authenticated"}', false);
  begin perform public.coach_erase_person('athlete', 'zz_selfdel', 'zz_selfdel', '{}', false);
    perform pg_temp.rec('erase: ...and a login that is the signed-in user''s own is refused', false, 'no error');
  exception when others then perform pg_temp.rec('erase: ...and a login that is the signed-in user''s own is refused', sqlerrm like '%yours%', sqlerrm); end;
  perform pg_temp.coach();
  begin perform public.coach_erase_person('athlete', 'zz_shared', 'zz_shared', '{}', false);
    perform pg_temp.rec('erase: a login shared with a course account is refused (sort it out by hand)', false, 'no error');
  exception when others then perform pg_temp.rec('erase: a login shared with a course account is refused (sort it out by hand)', sqlerrm like '%also a course or testing-app login%', sqlerrm); end;
  begin perform public.coach_erase_person('course', 'zz_shared_buyer', 'zz_shared_buyer', '{}', false);
    perform pg_temp.rec('erase: ...from the buyer''s side too', false, 'no error');
  exception when others then perform pg_temp.rec('erase: ...from the buyer''s side too', sqlerrm like '%also an athlete or testing-app login%', sqlerrm); end;
  begin perform public.coach_erase_person('athlete', 'zz_nobody_here', 'zz_nobody_here', '{}', false);
    perform pg_temp.rec('erase: an id with nothing stored raises (a typo cannot look like a success)', false, 'no error');
  exception when others then perform pg_temp.rec('erase: an id with nothing stored raises (a typo cannot look like a success)', sqlerrm like '%Nothing is stored%', sqlerrm); end;
  begin perform public.coach_erase_person('athlete', 'zz_nobody_here', 'zz_nobody_here', array['00000000-0000-0000-0000-00000000f003']::uuid[], false);
    perform pg_temp.rec('erase: a mistyped id with an intake form ticked raises, and the form is not erased', false, 'no error');
  exception when others then perform pg_temp.rec('erase: a mistyped id with an intake form ticked raises, and the form is not erased', sqlerrm like '%Nothing is stored%', sqlerrm); end;
  begin perform public.coach_erase_person('guest', 'x');
    perform pg_temp.rec('erase: an unknown kind is refused', false, 'no error');
  exception when others then perform pg_temp.rec('erase: an unknown kind is refused', sqlerrm like '%Unknown kind%', sqlerrm); end;
  begin perform public.coach_erase_person('athlete', 'zz_erase_a', 'zz_erase_a', '{}', null);
    perform pg_temp.rec('erase: a NULL dry-run flag is refused (it used to skip the confirmation and the receipt but still delete)', false, 'no error');
  exception when others then perform pg_temp.rec('erase: a NULL dry-run flag is refused (it used to skip the confirmation and the receipt but still delete)', sqlerrm like '%must be true or false%', sqlerrm); end;
  begin perform public.coach_erase_person('athlete', 'ZZ_ERASE_A', 'ZZ_ERASE_A', '{}', false);
    perform pg_temp.rec('erase: an id typed in another case finds nothing, names the real id, and takes neither the login nor the data', false, 'no error');
  exception when others then perform pg_temp.rec('erase: an id typed in another case finds nothing, names the real id, and takes neither the login nor the data',
    sqlerrm like '%Nothing is stored for "ZZ_ERASE_A"%' and sqlerrm like '%"zz_erase_a": ids are case-sensitive%', sqlerrm); end;
  begin perform public.coach_erase_person('athlete', '   ');
    perform pg_temp.rec('erase: an empty id is refused', false, 'no error');
  exception when others then perform pg_temp.rec('erase: an empty id is refused', sqlerrm like '%Who?%', sqlerrm); end;
  begin perform public.coach_erase_person('athlete', null);
    perform pg_temp.rec('erase: ...and so is a null one', false, 'no error');
  exception when others then perform pg_temp.rec('erase: ...and so is a null one', sqlerrm like '%Who?%', sqlerrm); end;
  perform pg_temp.rec('erase: none of those changed anything', pg_temp.fingerprint() = fp0, '');
end $t$;

-- 5. a table the function does not know yet, and a failure half way: everything is undone
create table public.zz_new_thing (athlete_id text, note text);
insert into public.zz_new_thing values ('zz_erase_a', 'a table added after stage54');
create function pg_temp.boom2() returns trigger language plpgsql as $$ begin raise exception 'fixture: titles cannot be deleted'; end $$;
do $t$
declare fp0 text := pg_temp.fingerprint(); r jsonb;
begin
  perform pg_temp.coach();
  begin perform public.coach_erase_person('athlete', 'zz_erase_a', 'zz_erase_a', '{}', false);
    perform pg_temp.rec('erase: a table with an athlete_id column that the function does not know stops the erasure', false, 'no error');
  exception when others then perform pg_temp.rec('erase: a table with an athlete_id column that the function does not know stops the erasure', sqlerrm like '%zz_new_thing%does not know that table%', sqlerrm); end;
  perform pg_temp.rec('erase: ...and nothing was erased, not even the tables it did know', pg_temp.fingerprint() = fp0, '');
  begin r := public.coach_erase_person('athlete', 'zz_erase_a');
    perform pg_temp.rec('erase: the dry run stops the same way, so the dashboard shows the problem before anything is typed', false, 'no error');
  exception when others then perform pg_temp.rec('erase: the dry run stops the same way, so the dashboard shows the problem before anything is typed', sqlerrm like '%zz_new_thing%', sqlerrm); end;
end $t$;
drop table public.zz_new_thing;
create trigger zz_boom2 before delete on public.hab_titles for each row when (old.athlete_id = 'zz_erase_a') execute function pg_temp.boom2();
do $t$
declare fp0 text := pg_temp.fingerprint();
begin
  perform pg_temp.coach();
  begin perform public.coach_erase_person('athlete', 'zz_erase_a', 'zz_erase_a', '{}', false);
    perform pg_temp.rec('erase: a failure half way raises', false, 'no error');
  exception when others then perform pg_temp.rec('erase: a failure half way raises', sqlerrm like '%fixture: titles cannot be deleted%', sqlerrm); end;
  perform pg_temp.rec('erase: ...and the tables emptied before the failure are back (one transaction)', pg_temp.fingerprint() = fp0, '');
end $t$;
drop trigger zz_boom2 on public.hab_titles;

-- 5b. the backup schema: a table there with an athlete_id column is emptied for the person even though the function was never told
-- its name, and one whose rows cannot be removed stops the erasure like an unknown public table does
create table backup.zz_extra (athlete_id text, note text);
insert into backup.zz_extra values ('zz_erase_a', 'another rollback copy'), ('zz_keep_b', 'not theirs');
create table backup.zz_stubborn (athlete_id text, note text);
insert into backup.zz_stubborn values ('zz_erase_a', 'a row that refuses to go');
create function pg_temp.skip_delete() returns trigger language plpgsql as $$ begin return null; end $$;
create trigger zz_skip before delete on backup.zz_stubborn for each row execute function pg_temp.skip_delete();
do $t$
declare fp0 text := pg_temp.fingerprint(); r jsonb;
begin
  perform pg_temp.coach();
  begin perform public.coach_erase_person('athlete', 'zz_erase_a', 'zz_erase_a', '{}', false);
    perform pg_temp.rec('erase backup: a row in the backup schema that cannot be removed stops the erasure', false, 'no error');
  exception when others then perform pg_temp.rec('erase backup: a row in the backup schema that cannot be removed stops the erasure', sqlerrm like '%backup.zz_stubborn%still holds 1 row%', sqlerrm); end;
  perform pg_temp.rec('erase backup: ...and nothing was erased, not even the rollback copies it had already emptied', pg_temp.fingerprint() = fp0, '');
end $t$;
drop trigger zz_skip on backup.zz_stubborn;
drop table backup.zz_stubborn;
do $t$
declare fp0 text := pg_temp.fingerprint(); r jsonb;
begin
  perform pg_temp.coach();
  r := public.coach_erase_person('athlete', 'zz_erase_a');
  perform pg_temp.rec('erase backup: the preview counts a backup table nobody told the function about, and still changes nothing',
    (r -> 'counts' ->> 'backup.zz_extra')::int = 1 and (r -> 'counts' ->> 'backup.onename_2026_10_09')::int = 2 and pg_temp.fingerprint() = fp0, (r -> 'counts')::text);
end $t$;

-- 6. the real erasure of an athlete
select set_config('zz.b_rows', pg_temp.rows_for('zz_keep_b')::text, false) \g /dev/null
do $t$
declare r jsonb; d jsonb; n int; l record; hash text; still int;
begin
  perform pg_temp.coach();
  execute 'set local role authenticated';
  d := public.coach_erase_person('athlete', 'zz_erase_a');
  -- two forms are picked: f001 is one the function offered (the same email), f003 is a stranger's name typed in by hand: the coach decides
  r := public.coach_erase_person('athlete', 'zz_erase_a', 'ZZ_Erase_A', array['00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-00000000f003']::uuid[], false);
  execute 'reset role';
  perform pg_temp.rec('erase: the real run reports it is not a dry run, and a receipt number', (r ->> 'dry_run')::boolean = false and (r ->> 'log_id') is not null, r::text);
  perform pg_temp.rec('erase: ...with the same counts the dry run gave (plus the two intake forms picked)',
    (r -> 'counts') = (d -> 'counts') || '{"hab_intake":2}'::jsonb, (r -> 'counts')::text);
  perform pg_temp.rec('erase: nothing is left under their id in ANY table of the public or backup schema', pg_temp.rows_for('zz_erase_a') = 0, pg_temp.rows_for('zz_erase_a')::text);
  perform pg_temp.rec('erase: the rollback copies in the backup schema went too, and another athlete''s stay',
    (select count(*) from backup.onename_2026_10_09 where athlete_id = 'zz_erase_a') = 0 and (select count(*) from backup.zz_extra where athlete_id = 'zz_erase_a') = 0
    and (select count(*) from backup.onename_2026_10_09 where athlete_id = 'zz_keep_b') = 2 and (select count(*) from backup.zz_extra where athlete_id = 'zz_keep_b') = 1, '');
  select count(*) into n from auth.users where id = '00000000-0000-0000-0000-0000000000e1';
  perform pg_temp.rec('erase: their sign-in account is gone', n = 0, n::text);
  select (select count(*) from auth.sessions where user_id = '00000000-0000-0000-0000-0000000000e1')
       + (select count(*) from auth.identities where user_id = '00000000-0000-0000-0000-0000000000e1') into n;
  perform pg_temp.rec('erase: ...and its sessions and identities went with it', n = 0, n::text);
  select count(*) into n from public.hab_intake where id in ('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-00000000f003');
  perform pg_temp.rec('erase: the intake forms that were picked are gone, the offered one and the one named by hand', n = 0, n::text);
  select count(*) into n from public.hab_intake where id in ('00000000-0000-0000-0000-00000000f002', '00000000-0000-0000-0000-00000000f004',
                                                              '00000000-0000-0000-0000-00000000f005', '00000000-0000-0000-0000-00000000f006');
  perform pg_temp.rec('erase: ...and the ones that were not picked (offered or not), and the other athlete''s, are still there', n = 4, n::text);
  select count(*) into n from public.affiliates where code = 'ZZAFF' and athlete_id is null;
  perform pg_temp.rec('erase: the partner record stays; only its link to the erased athlete is cleared', n = 1, n::text);
  select count(*) into n from public.affiliates where code = 'ZZAFFB' and athlete_id = 'zz_keep_b';
  perform pg_temp.rec('erase: ...another partner''s link is untouched', n = 1, n::text);
  perform pg_temp.rec('erase: another athlete keeps every row in every table', pg_temp.rows_for('zz_keep_b') = current_setting('zz.b_rows')::bigint, pg_temp.rows_for('zz_keep_b')::text);
  select count(*) into n from auth.users where id = '00000000-0000-0000-0000-0000000000e2';
  perform pg_temp.rec('erase: ...and their sign-in account', n = 1, n::text);
  perform pg_temp.rec('erase: the buyers are untouched', (select count(*) from public.tps_accounts where username in ('zz_course_c', 'zz_course_d')) = 2
    and (select count(*) from public.assess_accounts where username in ('zz_test_t', 'zz_test_u')) = 2, '');

  -- the receipt
  select * into l from public.erasure_log order by id desc limit 1;
  hash := encode(sha256(convert_to('athlete:zz_erase_a', 'UTF8')), 'hex');
  perform pg_temp.rec('erase: the receipt holds the kind, the coach, the date and a hash of "athlete:zz_erase_a"',
    l.kind = 'athlete' and l.erased_by = 'amirardekanian@gmail.com' and l.subject_hash = hash and l.erased_at > now() - interval '1 minute', l.subject_hash);
  perform pg_temp.rec('erase: ...and no name, id or email anywhere in it', position('zz_erase_a' in lower(l::text)) = 0 and position('zed' in lower(l::text)) = 0 and position('example' in lower(l::text)) = 0, l::text);
  perform pg_temp.rec('erase: ...with the counts, and how many partner links were cleared', (l.counts ->> 'session_history')::int = 2 and (l.counts ->> 'affiliates_unlinked')::int = 1
    and (l.counts ->> 'backup.onename_2026_10_09')::int = 2, l.counts::text);

  -- run it again: there is nothing left
  begin perform public.coach_erase_person('athlete', 'zz_erase_a', 'zz_erase_a', '{}', false);
    perform pg_temp.rec('erase: running it again finds nothing and says so', false, 'no error');
  exception when others then perform pg_temp.rec('erase: running it again finds nothing and says so', sqlerrm like '%Nothing is stored%', sqlerrm); end;
end $t$;
drop table backup.zz_extra;

-- 7. a course buyer
-- first, a table added after stage54 that keys its rows on the sign-in: the function does not know it, so it must stop
create table public.zz_user_thing (user_id uuid, note text);
insert into public.zz_user_thing values ('00000000-0000-0000-0000-0000000000f1', 'a table added after stage54, keyed on the sign-in');
do $t$
declare fp0 text := pg_temp.fingerprint();
begin
  perform pg_temp.coach();
  begin perform public.coach_erase_person('course', 'zz_course_c', 'zz_course_c', '{}', false);
    perform pg_temp.rec('erase course: a table keyed on the sign-in that the function does not know stops the erasure', false, 'no error');
  exception when others then perform pg_temp.rec('erase course: a table keyed on the sign-in that the function does not know stops the erasure',
    sqlerrm like '%zz_user_thing%user_id%does not know that table%', sqlerrm); end;
  perform pg_temp.rec('erase course: ...and nothing was erased', pg_temp.fingerprint() = fp0, '');
end $t$;
drop table public.zz_user_thing;
do $t$
declare fp0 text; d jsonb; r jsonb; n int; l record;
begin
  perform pg_temp.coach();
  fp0 := pg_temp.fingerprint();
  d := public.coach_erase_person('course', 'ZZ_Course_C');
  perform pg_temp.rec('erase course: the preview names the buyer by the note and asks for the username',
    d ->> 'shown_as' = 'Course buyer C' and d ->> 'confirm_word' = 'zz_course_c' and (d ->> 'dry_run')::boolean, d::text);
  perform pg_temp.rec('erase course: ...counts the login, the note and the sign-in account, and changed nothing',
    d -> 'counts' = '{"buyer_notes":1,"tps_accounts":1,"auth_users":1}'::jsonb and (d ->> 'total')::int = 3 and pg_temp.fingerprint() = fp0, (d -> 'counts')::text);
  begin perform public.coach_erase_person('course', 'zz_course_c', 'zz_course_d', '{}', false);
    perform pg_temp.rec('erase course: the wrong username as confirmation is refused', false, 'no error');
  exception when others then perform pg_temp.rec('erase course: the wrong username as confirmation is refused', sqlerrm like '%confirmation does not match%', sqlerrm); end;
  begin perform public.coach_erase_person('course', 'zz_test_t', 'zz_test_t', '{}', false);
    perform pg_temp.rec('erase course: a testing-app username is not found among course logins', false, 'no error');
  exception when others then perform pg_temp.rec('erase course: a testing-app username is not found among course logins', sqlerrm like '%no course login%', sqlerrm); end;
  r := public.coach_erase_person('course', 'zz_course_c', 'ZZ_COURSE_C', '{}', false);
  perform pg_temp.rec('erase course: the real run deletes the login, the note and the sign-in account (and its sessions)',
    (select count(*) from public.tps_accounts where username = 'zz_course_c') = 0
    and (select count(*) from public.buyer_notes where user_id = '00000000-0000-0000-0000-0000000000f1') = 0
    and (select count(*) from auth.users where id = '00000000-0000-0000-0000-0000000000f1') = 0
    and (select count(*) from auth.sessions where user_id = '00000000-0000-0000-0000-0000000000f1') = 0, r::text);
  perform pg_temp.rec('erase course: another course buyer and their note are untouched',
    (select count(*) from public.tps_accounts where username = 'zz_course_d') = 1
    and (select count(*) from public.buyer_notes where user_id = '00000000-0000-0000-0000-0000000000f2') = 1
    and (select count(*) from auth.users where id = '00000000-0000-0000-0000-0000000000f2') = 1, '');
  select * into l from public.erasure_log order by id desc limit 1;
  perform pg_temp.rec('erase course: the receipt hashes "course:zz_course_c" and holds no username or note',
    l.kind = 'course' and l.subject_hash = encode(sha256(convert_to('course:zz_course_c', 'UTF8')), 'hex')
    and position('zz_course_c' in l::text) = 0 and position('Course buyer' in l::text) = 0, l::text);
end $t$;

-- 8. a testing-app buyer: players, notes and results, soft-deleted ones included
do $t$
declare fp0 text; d jsonb; r jsonb; l record;
begin
  perform pg_temp.coach();
  fp0 := pg_temp.fingerprint();
  d := public.coach_erase_person('testing', 'zz_test_t');
  perform pg_temp.rec('erase testing: the preview counts every player (the removed one too), note and result, and changed nothing',
    d -> 'counts' = '{"assess_notes":2,"assess_results":3,"assess_players":2,"buyer_notes":1,"assess_accounts":1,"auth_users":1}'::jsonb
    and d ->> 'shown_as' = 'Academy T' and pg_temp.fingerprint() = fp0, (d -> 'counts')::text);
  r := public.coach_erase_person('testing', 'zz_test_t', 'zz_test_t', '{}', false);
  perform pg_temp.rec('erase testing: the real run deletes them all',
    (select count(*) from public.assess_players where account_id = '00000000-0000-0000-0000-0000000000f3') = 0
    and (select count(*) from public.assess_notes where account_id = '00000000-0000-0000-0000-0000000000f3') = 0
    and (select count(*) from public.assess_results where account_id = '00000000-0000-0000-0000-0000000000f3') = 0
    and (select count(*) from public.assess_accounts where username = 'zz_test_t') = 0
    and (select count(*) from auth.users where id = '00000000-0000-0000-0000-0000000000f3') = 0, r::text);
  perform pg_temp.rec('erase testing: another academy''s player, note and result are untouched',
    (select count(*) from public.assess_players where account_id = '00000000-0000-0000-0000-0000000000f4') = 1
    and (select count(*) from public.assess_notes where account_id = '00000000-0000-0000-0000-0000000000f4') = 1
    and (select count(*) from public.assess_results where account_id = '00000000-0000-0000-0000-0000000000f4') = 1, '');
  select * into l from public.erasure_log order by id desc limit 1;
  perform pg_temp.rec('erase testing: the receipt holds the counts and no player name',
    l.kind = 'testing' and (l.counts ->> 'assess_players')::int = 2 and position('Player' in l::text) = 0 and position('Academy' in l::text) = 0, l::text);
end $t$;

-- 9. the receipts: the coach reads them, nobody changes them
-- what the project's default privileges hand every new table: the file must take it away again (re-running it is also the idempotence test)
grant all on table public.erasure_log to anon, authenticated;
\i supabase/stage54_erase_person.sql
do $t$
declare n int; k int;
begin
  perform pg_temp.coach();
  execute 'set local role authenticated';
  select count(*) into n from public.erasure_log;
  execute 'reset role';
  perform pg_temp.rec('erase log: the coach reads the three receipts', n = 3, n::text);
  perform pg_temp.other();
  execute 'set local role authenticated';
  select count(*) into n from public.erasure_log;
  execute 'reset role';
  perform pg_temp.rec('erase log: someone who is not the coach reads none', n = 0, n::text);
  begin
    execute 'set local role anon';
    perform count(*) from public.erasure_log;
    execute 'reset role';
    perform pg_temp.rec('erase log: anon has no access', false, 'no error');
  exception when insufficient_privilege then perform pg_temp.rec('erase log: anon has no access', true, sqlerrm); end;
  perform pg_temp.coach();
  begin
    execute 'set local role authenticated';
    insert into public.erasure_log (kind, subject_hash) values ('athlete', 'forged');
    execute 'reset role';
    perform pg_temp.rec('erase log: not even the coach can add a receipt by hand', false, 'no error');
  exception when insufficient_privilege then perform pg_temp.rec('erase log: not even the coach can add a receipt by hand', true, sqlerrm); end;
  begin
    execute 'set local role authenticated';
    delete from public.erasure_log;
    execute 'reset role';
    perform pg_temp.rec('erase log: ...or remove one', false, 'no error');
  exception when insufficient_privilege then perform pg_temp.rec('erase log: ...or remove one', true, sqlerrm); end;
  perform pg_temp.rec('erase: the function is closed to anon and open to the signed-in role (the coach check is the real lock)',
    not has_function_privilege('anon', 'public.coach_erase_person(text,text,text,uuid[],boolean)', 'execute')
    and has_function_privilege('authenticated', 'public.coach_erase_person(text,text,text,uuid[],boolean)', 'execute'), '');
end $t$;
select pg_temp.coach() \g /dev/null

-- ═════════════════════ J. stage55: ending a quest run keeps the XP already earned ═════════════════════
-- hab_bonus_xp() is loaded twice by the runner: as itself (stage55 patches it) and as zz_bonus_base, the untouched stage24 text the
-- tests compare with. A run with no "end" must score exactly as before; "end" must stop the run's window there.
select pg_temp.coach() \g /dev/null
create function pg_temp.qrules(p_runs jsonb) returns jsonb language sql as $$
  select jsonb_build_object(
    'targets', '{"water":8,"steps":10000}'::jsonb, 'weights', '{"water":24,"steps":30}'::jsonb, 'completionBonus', 1.2, 'customXp', 25,
    'streakQualifyPct', 80, 'tiers', '[]'::jsonb, 'milestones', '[]'::jsonb,
    'quests', '[{"id":"q_water3","kind":"daysHit:water","need":3,"xp":150},{"id":"q_steps2","kind":"daysHit:steps","need":2,"xp":100},{"id":"q_total","kind":"total:steps","need":25000,"xp":200}]'::jsonb,
    'questRuns', p_runs) $$;
-- water on 3-6 Aug; steps over the target on 4 and 5 Aug, and a short day on the 6th (counts towards the total only)
create function pg_temp.qlog() returns jsonb language sql as $$
  select '{"2026-08-03":{"water":8},"2026-08-04":{"water":8,"steps":12000},"2026-08-05":{"water":8,"steps":11000},"2026-08-06":{"water":8,"steps":3000}}'::jsonb $$;
create function pg_temp.bonus(p_runs jsonb) returns bigint language sql as $$
  select public.hab_bonus_xp(pg_temp.qlog(), '{}'::jsonb, null, null, null, pg_temp.qrules(p_runs)) $$;
create function pg_temp.bonus_base(p_runs jsonb) returns bigint language sql as $$
  select public.zz_bonus_base(pg_temp.qlog(), '{}'::jsonb, null, null, null, pg_temp.qrules(p_runs)) $$;

do $t$
declare ids jsonb := '["q_water3","q_steps2","q_total"]'::jsonb; runs jsonb; n bigint; src text;
begin
  -- 1. nothing changes for a run with no end
  runs := jsonb_build_array(jsonb_build_object('start', '2026-08-03', 'ids', ids));
  perform pg_temp.rec('quests: a run with no end pays 150 + 100 + 200 (the water and steps quests complete on 5 Aug, the total on 6 Aug)', pg_temp.bonus(runs) = 450, pg_temp.bonus(runs)::text);
  perform pg_temp.rec('quests: ...exactly what the untouched stage24 function pays', pg_temp.bonus(runs) = pg_temp.bonus_base(runs), pg_temp.bonus_base(runs)::text);
  runs := jsonb_build_array(jsonb_build_object('start', '2026-08-03', 'ids', ids), jsonb_build_object('start', '2026-08-05', 'ids', '["q_water3"]'::jsonb));
  perform pg_temp.rec('quests: two runs, the first clipped by the second, pay as before the patch', pg_temp.bonus(runs) = pg_temp.bonus_base(runs), pg_temp.bonus(runs)::text || ' vs ' || pg_temp.bonus_base(runs)::text);
  perform pg_temp.rec('quests: no runs at all pays nothing, as before', pg_temp.bonus('[]'::jsonb) = 0 and pg_temp.bonus_base('[]'::jsonb) = 0, '');

  -- 2. an end stops the window there
  runs := jsonb_build_array(jsonb_build_object('start', '2026-08-03', 'ids', ids, 'end', '2026-08-04'));
  perform pg_temp.rec('quests: ended on 4 Aug, nothing had completed yet, so nothing pays', pg_temp.bonus(runs) = 0, pg_temp.bonus(runs)::text);
  runs := jsonb_build_array(jsonb_build_object('start', '2026-08-03', 'ids', ids, 'end', '2026-08-05'));
  perform pg_temp.rec('quests: ended on 5 Aug, the two quests that completed that day keep their XP and the total (6 Aug) never pays', pg_temp.bonus(runs) = 250, pg_temp.bonus(runs)::text);
  runs := jsonb_build_array(jsonb_build_object('start', '2026-08-03', 'ids', ids, 'end', '2026-08-06'));
  perform pg_temp.rec('quests: ended on 6 Aug, all three have completed and pay', pg_temp.bonus(runs) = 450, pg_temp.bonus(runs)::text);
  runs := jsonb_build_array(jsonb_build_object('start', '2026-08-03', 'ids', ids, 'end', '2026-08-30'));
  perform pg_temp.rec('quests: an end after the natural last day changes nothing', pg_temp.bonus(runs) = 450, pg_temp.bonus(runs)::text);
  runs := jsonb_build_array(jsonb_build_object('start', '2026-08-03', 'ids', ids, 'end', '2026-08-01'));
  perform pg_temp.rec('quests: an end before the start leaves an empty window that pays nothing', pg_temp.bonus(runs) = 0, pg_temp.bonus(runs)::text);

  -- 3. a bad end is ignored, not an error
  perform pg_temp.rec('quests: an end that is not a date is ignored (the run runs its seven days)',
    pg_temp.bonus(jsonb_build_array(jsonb_build_object('start', '2026-08-03', 'ids', ids, 'end', 'tomorrow'))) = 450
    and pg_temp.bonus(jsonb_build_array(jsonb_build_object('start', '2026-08-03', 'ids', ids, 'end', null))) = 450
    and pg_temp.bonus(jsonb_build_array(jsonb_build_object('start', '2026-08-03', 'ids', ids, 'end', 20260805))) = 450, '');

  -- 4. an end inside a clipped run takes the earlier of the two bounds
  runs := jsonb_build_array(jsonb_build_object('start', '2026-08-03', 'ids', ids, 'end', '2026-08-04'), jsonb_build_object('start', '2026-08-06', 'ids', '["q_water3"]'::jsonb));
  perform pg_temp.rec('quests: the end and the next run''s start both bound a run: the earlier wins', pg_temp.bonus(runs) = 0, pg_temp.bonus(runs)::text);

  -- 5. the patch: applied once, and re-running the file changes nothing
  select md5(pg_get_functiondef('public.hab_bonus_xp(jsonb,jsonb,date,date,date,jsonb)'::regprocedure)) into src;
  perform pg_temp.rec('quests: the scoring function now reads the run''s own end', position('own_end' in pg_get_functiondef('public.hab_bonus_xp(jsonb,jsonb,date,date,date,jsonb)'::regprocedure)) > 0, '');
  perform set_config('zz.bonus_md5', src, false);
end $t$;
\i supabase/stage55_end_quests.sql
do $t$
begin
  perform pg_temp.rec('quests: re-running stage55 leaves the scoring function byte for byte the same',
    md5(pg_get_functiondef('public.hab_bonus_xp(jsonb,jsonb,date,date,date,jsonb)'::regprocedure)) = current_setting('zz.bonus_md5'), '');
  perform pg_temp.rec('quests: the function keeps its attributes (immutable, not security definer, bigint)',
    (select provolatile = 'i' and not prosecdef and prorettype = 'bigint'::regtype from pg_proc where oid = 'public.hab_bonus_xp(jsonb,jsonb,date,date,date,jsonb)'::regprocedure), '');
end $t$;

-- 6. end_quests()
insert into public.xp_rules (id, rules) values (1, pg_temp.qrules(jsonb_build_array(
  jsonb_build_object('start', '2026-07-27', 'ids', '["q_water3"]'::jsonb),
  jsonb_build_object('start', '2026-08-03', 'ids', '["q_water3","q_steps2"]'::jsonb, 'note', 'kept')))) on conflict (id) do update set rules = excluded.rules;
do $t$
declare r jsonb; run jsonb; ts0 timestamptz; ts1 timestamptz;
begin
  perform pg_temp.coach();
  select updated_at into ts0 from public.xp_rules where id = 1;
  perform pg_sleep(0.02);
  r := public.end_quests('2026-08-03', '2026-08-05');
  select updated_at into ts1 from public.xp_rules where id = 1;
  run := (select x from jsonb_array_elements(r) x where x ->> 'start' = '2026-08-03');
  perform pg_temp.rec('end_quests: the run gets an end and keeps its ids and every other key', run ->> 'end' = '2026-08-05' and run -> 'ids' = '["q_water3","q_steps2"]'::jsonb and run ->> 'note' = 'kept', run::text);
  perform pg_temp.rec('end_quests: another run is untouched, and the stored rules are what it returned',
    (select x from jsonb_array_elements(r) x where x ->> 'start' = '2026-07-27') = '{"start":"2026-07-27","ids":["q_water3"]}'::jsonb
    and (select rules -> 'questRuns' from public.xp_rules where id = 1) = r and ts1 > ts0, r::text);
  perform pg_temp.rec('end_quests: the other keys of the rules row (the quest pool, the targets) are untouched', (select rules -> 'quests' from public.xp_rules where id = 1) = pg_temp.qrules('[]'::jsonb) -> 'quests'
    and (select rules -> 'targets' from public.xp_rules where id = 1) = '{"water":8,"steps":10000}'::jsonb, '');
  r := public.end_quests('2026-08-03', '2026-09-30');
  perform pg_temp.rec('end_quests: an end after the seventh day is capped at the seventh day', (select x ->> 'end' from jsonb_array_elements(r) x where x ->> 'start' = '2026-08-03') = '2026-08-09', r::text);
  r := public.end_quests('2026-08-03', '2026-08-02');
  perform pg_temp.rec('end_quests: an end before the start (a run that had not begun) removes the run: nothing was earned in it',
    not exists (select 1 from jsonb_array_elements(r) x where x ->> 'start' = '2026-08-03') and jsonb_array_length(r) = 1, r::text);
  begin perform public.end_quests('2026-08-03', '2026-08-05');
    perform pg_temp.rec('end_quests: a start with no run is refused', false, 'no error');
  exception when others then perform pg_temp.rec('end_quests: a start with no run is refused', sqlerrm like '%no quest run starts on 2026-08-03%', sqlerrm); end;
  begin perform public.end_quests(null, '2026-08-05');
    perform pg_temp.rec('end_quests: a null start is refused', false, 'no error');
  exception when others then perform pg_temp.rec('end_quests: a null start is refused', sqlerrm like '%start day%', sqlerrm); end;
  perform pg_temp.other();
  begin perform public.end_quests('2026-07-27', '2026-07-29');
    perform pg_temp.rec('end_quests: only the coach', false, 'no error');
  exception when others then perform pg_temp.rec('end_quests: only the coach', sqlerrm like '%coach only%', sqlerrm); end;
  perform pg_temp.nobody();
  begin
    execute 'set local role anon';
    perform public.end_quests('2026-07-27', '2026-07-29');
    execute 'reset role';
    perform pg_temp.rec('end_quests: anon cannot even call it', false, 'no error');
  exception when insufficient_privilege then perform pg_temp.rec('end_quests: anon cannot even call it', true, sqlerrm); end;
  perform pg_temp.coach();
  perform pg_temp.rec('end_quests: the stored run now scores what the dashboard promised: an ended run keeps what was earned',
    public.hab_bonus_xp(pg_temp.qlog(), '{}'::jsonb, null, null, null, (select rules from public.xp_rules where id = 1)) is not null, '');
end $t$;

-- ═════════════════════ report ═════════════════════
select count(*) filter (where ok) as passed, count(*) filter (where not ok) as failed, (count(*) filter (where not ok) > 0) as anyfail from t_res \gset
\echo
\echo === :passed passed, :failed failed ===
select n || '   [' || coalesce(left(v, 300), '') || ']' as failure from t_res where not ok;
\if :anyfail
do $$ begin raise exception 'SQL TESTS FAILED'; end $$;
\endif
