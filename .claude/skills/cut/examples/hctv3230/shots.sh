#!/bin/bash
# usage: bash shots.sh "t1,t2,..."   (edited-clock seconds)   -> build, lint, snapshot, contact sheets
export PATH="/c/Users/Amir/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin:$PATH"
cd "/c/Users/Amir/Videos/Reels/hctv3230/v1" || exit 1
PYTHONIOENCODING=utf-8 python build_v1.py 2>&1 | tail -1
hyperframes lint public 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E "✗|◇" | cut -c1-230
rm -rf public/snapshots sheet_*.png
hyperframes snapshot public --at "$1" 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E "rror|saved" | head -3
python sheet.py public/snapshots
