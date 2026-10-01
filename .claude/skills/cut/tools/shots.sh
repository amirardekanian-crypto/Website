#!/bin/bash
# Look at the work: (re)build, lint, snapshot at chosen times, labelled contact sheets.
#   bash shots.sh <reel dir> "<t1,t2,...>" [build script]     (times are on the EDITED clock)
# The contact sheets land in <reel dir>/sheet_1.png, sheet_2.png ... (5 across, 2 rows). Look at every one.
export PATH="/c/Users/Amir/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin:$PATH"
TOOLS="$(cd "$(dirname "$0")" && pwd)"
cd "$1" || exit 1
[ -n "$3" ] && PYTHONIOENCODING=utf-8 python "$3" 2>&1 | tail -2
hyperframes lint public 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E "✗|⚠|◇" | cut -c1-230
rm -rf public/snapshots sheet_*.png
hyperframes snapshot public --at "$2" 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E "rror|saved" | head -3
python "$TOOLS/sheet.py" public/snapshots
