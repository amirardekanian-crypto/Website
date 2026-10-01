#!/bin/bash
# Look at the work: (re)build, lint, snapshot at chosen times, labelled contact sheets, and (when asked) the gate.
#   bash shots.sh <reel dir> "<t1,t2,...>" [build script]     (times are on the EDITED clock)
#   GATE=1 bash shots.sh ...       also runs tools/check_gate.py once the sheets are made (his caption band, overlaps, text outside the frame: about a minute)
#   GATE=deep bash shots.sh ...    the thorough gate (a sample at every tween start and end: about 3x slower); GATE_ARGS="--bottom 1585 --rail" adds the profile-row and right-hand-button guards
#   PHONE=1 bash shots.sh ...      the contact sheets draw the parts of the picture Instagram covers on his phone (tools/phone_zones.py)
# The contact sheets land in <reel dir>/sheet_1.png, sheet_2.png ... (5 across, 2 rows). Look at every one.
# The build prints `audit:` notes above its "built" line (a block used more than he likes, too many wipe kinds ...): read them.
export PATH="/c/Users/Amir/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin:$PATH"
TOOLS="$(cd "$(dirname "$0")" && pwd)"
cd "$1" || exit 1
[ -n "$3" ] && PYTHONIOENCODING=utf-8 python "$3" 2>&1 | tail -8
hyperframes lint public 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E "✗|⚠|◇" | cut -c1-230
rm -rf public/snapshots sheet_*.png
# --describe false: snapshot would send frames to Gemini when GEMINI_API_KEY is set (it is not on this PC); never let it
hyperframes snapshot public --at "$2" --describe false 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E "rror|saved" | head -3
python "$TOOLS/sheet.py" public/snapshots
if [ -n "$GATE" ]; then
  echo "--- gate: hyperframes check with his caption band y 230-470 guarded"
  DEEP=""; [ "$GATE" = "deep" ] && DEEP="--deep"
  PYTHONIOENCODING=utf-8 python "$TOOLS/check_gate.py" public $DEEP $GATE_ARGS
fi
