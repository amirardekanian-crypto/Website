#!/bin/sh
# run-parallel.sh: the whole coach harness in N parallel shards (default 3) and one summary at the end.
#   sh scripts/headless/coach/run-parallel.sh [N]
# Needs what run.js needs (README: the page served on COACH_BASE, PLAYWRIGHT and CHROMIUM where they are not at the cloud's
# defaults). OUT is the parent of one folder per shard (default: a temp folder). Exit 0 = every check of every shard passed.
N=${1:-3}
here=$(cd "$(dirname "$0")" && pwd)
base=${OUT:-${TMPDIR:-/tmp}/coach-harness-out}
mkdir -p "$base"
i=0
while [ "$i" -lt "$N" ]; do
  mkdir -p "$base/shard$i"
  ( SHARD="$i/$N" OUT="$base/shard$i" node "$here/run.js" > "$base/shard$i/log.txt" 2>&1 ) &
  i=$((i + 1))
done
wait
i=0
scenarios=0
fails=0
while [ "$i" -lt "$N" ]; do
  log="$base/shard$i/log.txt"
  grep -E '^(ok|FAIL) |^ +(✗|actual)' "$log" | grep -E '^FAIL|^ +(✗|actual)' || true
  s=$(grep -Eo '^[0-9]+ scenarios' "$log" | grep -Eo '^[0-9]+')
  f=$(grep -Eo '[0-9]+ failing checks' "$log" | grep -Eo '^[0-9]+')
  if [ -z "$s" ]; then echo "shard $i did not finish: see $log"; fails=$((fails + 1)); else scenarios=$((scenarios + s)); fails=$((fails + ${f:-0})); fi
  i=$((i + 1))
done
echo
echo "$scenarios scenarios in $N shards, $fails failing checks. Logs: $base/shard*/log.txt"
[ "$fails" -eq 0 ]
