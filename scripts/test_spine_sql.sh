#!/bin/sh
# test_spine_sql.sh — the server half of the coach.html audit, tested on a real Postgres before it touches the real database.
#
# Starts a THROWAWAY Postgres cluster (a temp folder, a unix socket, nothing on the network), loads a replica of the live
# tables (supabase/tests/replica_schema.sql), applies supabase/stage45_forget_contact_guard.sql, stage48_coach_one_transaction.sql,
# stage49_spine_versions.sql, stage50_assess_coach_read.sql, stage51_clear_used_passwords.sql, stage52_version_history_two_cycles.sql, stage53_buyer_notes.sql and stage54_erase_person.sql, runs
# supabase/tests/stage48_49_test.sql (about 200 assertions:
# the coach check, grants, row-level security, atomicity, malformed payloads, the version trigger, Forget's guard, the testing
# app's tables, the stored-password trigger, the version history, the buyer note, the full erasure) and then two-session tests of the row
# lock: a dashboard save must WAIT for an in-flight write by Claude's /spine and then see it, instead of overwriting it,
# and a /spine call that writes exercises first (the documented order) must never deadlock with it.
#
# Why not the Supabase project: its database tool asks for a confirmation on any SQL containing a delete, and a test
# that creates tables and deletes rows is exactly that. This is also safer: nothing here can touch real data.
#
# Needs the Postgres 14+ server binaries (a cloud session has them: /usr/lib/postgresql/*/bin). Run from anywhere:
#     sh scripts/test_spine_sql.sh
# Exit 0 = every check passed. Run it after changing either stage file, BEFORE applying the change to the project.
set -u
repo=$(cd "$(dirname "$0")/.." && pwd)
PGBIN=$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)
[ -n "$PGBIN" ] && [ -x "$PGBIN/postgres" ] || { echo "test_spine_sql: no local Postgres server found under /usr/lib/postgresql/*/bin"; exit 2; }

# Postgres refuses to run as root: a cloud session is root, so the cluster belongs to the postgres user there.
if [ "$(id -u)" = 0 ]; then
  DATA=/var/lib/postgresql/coachtest-$$
  as_pg() { su postgres -c "$*"; }
else
  DATA=$(mktemp -d)
  as_pg() { sh -c "$*"; }
fi
PORT=54000
cleanup() { as_pg "$PGBIN/pg_ctl -D $DATA -m immediate stop" >/dev/null 2>&1; rm -rf "$DATA"; }
trap cleanup EXIT INT TERM

as_pg "$PGBIN/initdb -D $DATA -A trust -U postgres --no-sync -E UTF8" >/dev/null 2>&1 || { echo "test_spine_sql: initdb failed"; exit 2; }
as_pg "$PGBIN/pg_ctl -D $DATA -o '-p $PORT -c listen_addresses= -c unix_socket_directories=$DATA -c fsync=off -c synchronous_commit=off' -l $DATA/server.log -w start" >/dev/null 2>&1 \
  || { echo "test_spine_sql: the server did not start"; tail -5 "$DATA/server.log" 2>/dev/null; exit 2; }

P="psql -h $DATA -p $PORT -U postgres -qAt -v ON_ERROR_STOP=1"
$P -d postgres -c "create database coachtest" || exit 2
# The scoring function as stage24 left it (the live one, give or take a comment), twice: as itself (stage55 patches it) and as zz_bonus_base, the untouched copy
# the tests compare with.
sed -n '/^create or replace function public.hab_bonus_xp(/,/^\$fn\$;/p' "$repo/supabase/stage24_marks_quests_customcap.sql" > "$DATA/bonus22.sql"
sed 's/public\.hab_bonus_xp(/public.zz_bonus_base(/' "$DATA/bonus22.sql" > "$DATA/bonus22_base.sql"
[ -s "$DATA/bonus22.sql" ] || { echo "test_spine_sql: could not cut hab_bonus_xp out of stage24"; exit 2; }
P="$P -d coachtest"
for f in supabase/tests/replica_schema.sql supabase/stage45_forget_contact_guard.sql supabase/stage48_coach_one_transaction.sql supabase/stage49_spine_versions.sql supabase/stage50_assess_coach_read.sql supabase/stage51_clear_used_passwords.sql supabase/stage52_version_history_two_cycles.sql supabase/stage53_buyer_notes.sql supabase/stage54_erase_person.sql $DATA/bonus22.sql $DATA/bonus22_base.sql supabase/stage55_end_quests.sql; do
  (cd "$repo" && $P -f "$f" >/dev/null) || { echo "test_spine_sql: loading $f failed"; exit 2; }
done

echo "== assertions (supabase/tests/stage48_49_test.sql)"
out=$(cd "$repo" && psql -h "$DATA" -p $PORT -U postgres -d coachtest -q -v ON_ERROR_STOP=1 -f supabase/tests/stage48_49_test.sql 2>&1)
rc=$?
echo "$out" | grep -E '^=== '
if [ $rc -ne 0 ]; then echo "$out" | tail -25; echo "test_spine_sql: FAILED (the assertions above)"; exit 1; fi

echo "== two sessions: a dashboard save waits for Claude's in-flight write, then sees it"
CL="select set_config('request.jwt.claims','{\"email\":\"amirardekanian@gmail.com\"}',false);"
$P -c "insert into public.exercises (id,name,status) values ('zz-conc','ZZ Conc','draft'),('zz-conc2','ZZ Conc 2','draft')" >/dev/null
fail=0
check() { if [ "$2" = ok ]; then echo "  ok   $1"; else echo "  FAIL $1 ($3)"; fail=1; fi; }

# 1. the SAME column: refused, with the live value, and nothing written
( $P -c "begin; update public.exercises set purpose='Claude concurrent' where id='zz-conc'; select pg_sleep(3); commit;" >/dev/null 2>&1 ) &
sleep 1
t0=$(date +%s)
out=$($P -c "$CL" -c "select public.coach_save_spine('zz-conc','{\"purpose\":\"Amir concurrent\"}','{\"purpose\":null}','{}','{}')" | tail -1)
t1=$(date +%s)
wait
[ $((t1 - t0)) -ge 1 ] && check "it waited for the other transaction ($((t1 - t0))s)" ok || check "it waited for the other transaction" no "returned after $((t1 - t0))s"
echo "$out" | grep -q '"ok": false' && echo "$out" | grep -q 'Claude concurrent' && check "same column: refused, and the live value comes back" ok || check "same column: refused, and the live value comes back" no "$out"
[ "$($P -c "select purpose from public.exercises where id='zz-conc'")" = "Claude concurrent" ] && check "same column: nothing overwritten" ok || check "same column: nothing overwritten" no "purpose changed"

# 2. a DIFFERENT column: written, and the other writer's column is kept
( $P -c "begin; update public.exercises set tennis='Claude court line' where id='zz-conc2'; select pg_sleep(3); commit;" >/dev/null 2>&1 ) &
sleep 1
out=$($P -c "$CL" -c "select public.coach_save_spine('zz-conc2','{\"video\":\"https://example.invalid/amir\"}','{\"video\":null}','{}','{}')" | tail -1)
wait
echo "$out" | grep -q '"ok": true' && check "other column: saved" ok || check "other column: saved" no "$out"
[ "$($P -c "select tennis || ' | ' || video from public.exercises where id='zz-conc2'")" = "Claude court line | https://example.invalid/amir" ] && check "other column: Claude's write is kept beside Amir's" ok || check "other column: Claude's write is kept beside Amir's" no "row differs"
[ "$($P -c "select count(*) from public.spine_versions where row_id in ('zz-conc','zz-conc2')")" = "3" ] && check "all three writes are in the history" ok || check "all three writes are in the history" no "$($P -c "select count(*) from public.spine_versions where row_id in ('zz-conc','zz-conc2')")"

# 3. the documented order (a /spine call that updates exercises FIRST, then exercise_coach, in one transaction) cannot
#    deadlock with the dashboard save: the save waits for the first lock, the other transaction finishes, the save goes on
$P -c "insert into public.exercises (id,name,status) values ('zz-conc3','ZZ Conc 3','draft')" >/dev/null
( $P -c "begin; update public.exercises set purpose='Claude A' where id='zz-conc3'; select pg_sleep(2); insert into public.exercise_coach (id, notes) values ('zz-conc3','Claude note'); commit;" >/dev/null 2>&1 ) &
sleep 1
out=$($P -c "$CL" -c "select public.coach_save_spine('zz-conc3','{\"video\":\"https://example.invalid/amir\"}','{\"video\":null}','{\"cost\":\"heavy\"}','{\"cost\":null}')" 2>&1 | tail -1)
wait
echo "$out" | grep -q 'deadlock' && check "documented order: no deadlock" no "$out" || check "documented order: no deadlock" ok
echo "$out" | grep -q '"ok": true' && check "documented order: the dashboard save went through after waiting" ok || check "documented order: the dashboard save went through after waiting" no "$out"
[ "$($P -c "select (select purpose from public.exercises where id='zz-conc3') || ' | ' || (select notes || ' | ' || cost from public.exercise_coach where id='zz-conc3')")" = "Claude A | Claude note | heavy" ] && check "documented order: both writers' columns are there" ok || check "documented order: both writers' columns are there" no "row differs"

# 4. stage55 patches the scoring function in place; given a function it does not recognise it must stop and change nothing
$P -c "create or replace function public.hab_bonus_xp(p_log jsonb, p_cfg jsonb, p_season_start date, p_from date, p_to date, p_rules jsonb) returns bigint language sql immutable as 'select 42::bigint'" >/dev/null
out=$($P -f supabase/stage55_end_quests.sql 2>&1); rc=$?
[ $rc -ne 0 ] && echo "$out" | grep -q "does not look as expected" && check "stage55 refuses a scoring function it does not recognise" ok || check "stage55 refuses a scoring function it does not recognise" no "rc=$rc $out"
[ "$($P -c "select public.hab_bonus_xp('{}','{}',null,null,null,'{}')")" = "42" ] && check "...and leaves that function exactly as it found it" ok || check "...and leaves that function exactly as it found it" no "the function changed"

# 5. the one-paste pack handed to Amir (stage45 + 52 + 53 + 54 in one file) runs in ONE go on a fresh replica, reports every part
#    applied, and runs a second time unchanged (every part is safe to re-run)
if [ -f supabase/PASTE-1-run-in-sql-editor.sql ]; then
  PK="psql -h $DATA -p $PORT -U postgres -qAt -v ON_ERROR_STOP=1"
  $PK -d postgres -c "create database packtest" >/dev/null
  (cd "$repo" && $PK -d packtest -f supabase/tests/replica_schema.sql >/dev/null) || { echo "test_spine_sql: replica did not load for the pack test"; exit 2; }
  res=$(cd "$repo" && $PK -d packtest -f supabase/PASTE-1-run-in-sql-editor.sql 2>&1 | tail -5)
  [ "$(echo "$res" | grep -c '|t$')" = "4" ] && check "the SQL pack runs in one go and every part reports applied" ok || check "the SQL pack runs in one go and every part reports applied" no "$res"
  res2=$(cd "$repo" && $PK -d packtest -f supabase/PASTE-1-run-in-sql-editor.sql 2>&1 | tail -5)
  [ "$(echo "$res2" | grep -c '|t$')" = "4" ] && check "...and runs a second time without error (safe to re-run)" ok || check "...and runs a second time without error (safe to re-run)" no "$res2"
fi

[ $fail = 0 ] && echo "test_spine_sql: all passed" || { echo "test_spine_sql: FAILED"; exit 1; }
