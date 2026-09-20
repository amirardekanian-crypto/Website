#!/usr/bin/env python3
"""Guard program.html's circuit logging rules.

WHY THIS EXISTS
---------------
A `type: "circuit"` block (a superset, a complex, a conditioning circuit, a
prep circuit) decides whether it shows the athlete a weight field per item and
an RPE row per round. Getting that decision wrong is silent in both directions
and expensive in both:

  * logging ON where it shouldn't be — athletes are asked for kilograms and an
    RPE on a mobility drill. This was live on 13 circuits across 4 athletes
    (the demo file included) until 2026-09-15, because the old default was
    "log everything unless the JSON remembered to say warmup: true".

  * logging OFF where it should be on — a superset records nothing, and the
    next cycle, whose job is to load off those numbers, has nothing to load
    from. That cost amir_ardekani C1 the per-set baseline on 5 of 16 working
    exercises; see COACHING-PRINCIPLES.md → Session structure.

THE BUG THIS SPECIFICALLY CATCHES
---------------------------------
The block decides the default now, and the obvious way to ask "is this the
warm-up block?" is to reuse blockCategory(), which already returns
'block-warmup'. That is WRONG and it very nearly shipped. blockCategory() ends
with a positional fallback for titles it doesn't recognise:

    const fallback = ['block-warmup', 'block-strength', 'block-power'];
    return fallback[(blockIndex || 0) % fallback.length];

so a block called "Core" sitting at index 3 returns 'block-warmup' by pure
coincidence of arithmetic — and every Core circuit in the file would have
silently stopped logging. Harmless for colour, which is all that fallback was
ever for. Destructive for data.

So: prep-ness is decided by isPrepBlockTitle(title) — title alone, no
positional fallback, unrecognised titles are NOT prep (failing safe toward
logging, because a spurious weight box is visible and a missing one is not).

Usage:
    python scripts/check_circuit_logging.py [path-to-program.html]
Exit code 0 if all checks pass, 1 otherwise.
"""
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

# This script prints "→" in its results table. On Windows the console hands
# Python cp1252, which cannot encode it, so the print raised UnicodeEncodeError
# and the pre-commit hook reported a FAILED check on a program.html that had
# actually passed every case. Encoding is not what this guard is about.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

ROOT = Path(__file__).resolve().parent.parent
DEFAULT = ROOT / "program.html"

# Keywords isPrepBlockTitle must recognise. 'prime' and 'prep' matter because
# SCHEMA.md names the warm-up block "Prime" OR "Activation & Prep"; the rest
# cover the free-named prep blocks already in the wild.
REQUIRED_KEYWORDS = ["warm", "mobility", "activation", "cool", "prime", "prep"]

# (block title, block index, circuit JSON flags, expected) — expected is which
# log controls the athlete should see: none | weight | rpe | both.
CASES = [
    ("Warm-Up",           0, {},                 "none"),
    ("Activation & Prep", 0, {},                 "none"),
    ("Activation & Prep", 0, {"logWeight": True},"weight"),   # mehdi's Loaded Primers
    ("Prime",             0, {},                 "none"),
    ("Prime",             0, {"warmup": True},   "none"),
    ("Shoulder Prep",     0, {},                 "none"),
    ("Dynamic Mobility",  0, {},                 "none"),
    ("Shoulder Activation",0,{},                 "none"),
    ("Activation",        1, {},                 "none"),
    # The regression that nearly shipped: Core at index 3 hits fallback[0].
    ("Core",              3, {},                 "both"),
    ("Core",              0, {},                 "both"),
    ("Accessory",         2, {},                 "both"),
    ("Walk-Run Ladder",   1, {},                 "both"),
    ("Reactive Power",    1, {},                 "both"),
    ("Conditioning",      5, {},                 "both"),
    ("Accessory",         2, {"logWeight": False},"rpe"),
    ("Accessory",         2, {"logRPE": False},  "weight"),
    ("Accessory",         2, {"warmup": True},   "none"),
]

NODE_HARNESS = r"""
const fs = require('fs');
// CRLF folded to LF: a Windows checkout (core.autocrlf=true) has \r\n, and the
// logging-flags pattern below ends on a bare \n, so it could never match there and
// the hook blocked every commit that touched program.html. Nothing else changes.
const src = fs.readFileSync(process.argv[2], 'utf8').replace(/\r\n/g, '\n');
const cases = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));

function grab(re, what) {
  const m = src.match(re);
  if (!m) { console.error('could not find ' + what + ' in program.html'); process.exit(2); }
  return m[0];
}

eval(grab(/function isPrepBlockTitle\(title\) \{[\s\S]*?\n\}/, 'isPrepBlockTitle'));
eval(grab(/function blockCategory\(title, blockIndex\) \{[\s\S]*?\n\}/, 'blockCategory'));

const flagSrc = grab(
  /const isWarmup    = ex\.warmup === true;[\s\S]*?const logRPE[\s\S]*?: logsByDefault\);\n/,
  "renderCircuit's logging flags");
const flags = new Function('ex', 'blockTitle', 'isPrepBlockTitle',
  flagSrc + 'return { logWeight: logWeight, logRPE: logRPE };');

const label = f => (f.logWeight && f.logRPE) ? 'both'
               : f.logWeight ? 'weight' : f.logRPE ? 'rpe' : 'none';

const out = cases.map(([title, idx, json, want]) => {
  const got = label(flags(json, title, isPrepBlockTitle));
  return { title, idx, json, want, got, cls: blockCategory(title, idx), ok: got === want };
});
console.log(JSON.stringify(out));
"""


def fail(msg):
    print(f"  FAIL  {msg}")
    return 1


def main():
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT
    if not path.exists():
        print(f"check_circuit_logging: {path} not found")
        return 1
    src = path.read_text(encoding="utf-8")
    errors = 0

    print("check_circuit_logging: structural guards")

    # 1. isPrepBlockTitle must exist and know every keyword.
    m = re.search(r"function isPrepBlockTitle\(title\) \{(.*?)\n\}", src, re.S)
    if not m:
        errors += fail("isPrepBlockTitle() is missing — renderCircuit needs it "
                       "to decide prep-ness from the title alone.")
    else:
        body = m.group(1)
        missing = [k for k in REQUIRED_KEYWORDS if f"'{k}'" not in body]
        if missing:
            errors += fail(f"isPrepBlockTitle() no longer matches {missing}. "
                           "SCHEMA names the warm-up block 'Prime' or "
                           "'Activation & Prep' — dropping one makes those "
                           "blocks demand a weight and an RPE for mobility work.")
        else:
            print(f"  ok    isPrepBlockTitle() matches all {len(REQUIRED_KEYWORDS)} keywords")
        if "blockIndex" in body or "fallback" in body:
            errors += fail("isPrepBlockTitle() must not use a positional "
                           "fallback — see this file's header.")

    # 2. renderCircuit must NOT decide prep-ness from the colour class.
    rc = re.search(r"function renderCircuit\(.*?\n\}", src, re.S)
    if not rc:
        errors += fail("renderCircuit() not found")
    else:
        body = rc.group(0)
        if re.search(r"inPrepBlock\s*=\s*blockClass", body):
            errors += fail(
                "renderCircuit() derives inPrepBlock from blockClass. "
                "blockCategory() falls back to cycling classes BY INDEX, so "
                "'Core' at index 3 returns 'block-warmup' and every Core "
                "circuit silently stops logging. Use isPrepBlockTitle(blockTitle).")
        elif "isPrepBlockTitle(blockTitle)" not in body:
            errors += fail("renderCircuit() does not call isPrepBlockTitle(blockTitle)")
        else:
            print("  ok    renderCircuit() decides prep-ness from the title, not the colour class")

    # 3. blockCategory keeps its positional fallback — that is exactly why the
    #    two functions must stay separate, so assert the hazard still exists.
    bc = re.search(r"function blockCategory\(title, blockIndex\) \{.*?\n\}", src, re.S)
    if bc and "fallback[" not in bc.group(0):
        print("  note  blockCategory() no longer has an index fallback; this "
              "check's premise changed — re-read the header before relaxing it.")

    # 4. Behaviour, run against the real source.
    node = shutil.which("node")
    if not node:
        print("  skip  behaviour table (node not installed)")
    else:
        print("check_circuit_logging: behaviour")
        with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as h:
            h.write(NODE_HARNESS); harness = h.name
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as c:
            json.dump(CASES, c); casefile = c.name
        try:
            r = subprocess.run([node, harness, str(path), casefile],
                               capture_output=True, text=True)
            if r.returncode != 0:
                errors += fail(f"harness could not read program.html: {r.stderr.strip()}")
            else:
                rows = json.loads(r.stdout)
                width = max(len(x["title"]) for x in rows)
                for x in rows:
                    flagtxt = json.dumps(x["json"]) if x["json"] else "-"
                    line = (f"  {'ok  ' if x['ok'] else 'FAIL'}  "
                            f"{x['title']:<{width}} [{x['idx']}] {flagtxt:<20} "
                            f"→ {x['got']:<6} (want {x['want']})")
                    if not x["ok"]:
                        line += f"   [blockCategory said {x['cls']}]"
                        errors += 1
                    print(line)
        finally:
            Path(harness).unlink(missing_ok=True)
            Path(casefile).unlink(missing_ok=True)

    if errors:
        print(f"\ncheck_circuit_logging: {errors} problem(s).")
        return 1
    print("\ncheck_circuit_logging: OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
