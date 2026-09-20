"""Turn a folder of PNG screenshots into lossless WebP (same pixels, about a fifth of the size).

    python Content/reel-7-course/src/to_webp.py <folder-of-pngs> [<out-folder>]

Used after tools/capture.config.json is run through .claude/skills/reel/tools/capture_app_screens.js:
the PNGs go to a temp folder, the lossless WebPs go to Content/reel-7-course/assets/screens/.
"""
import pathlib
import sys

from PIL import Image

src = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else pathlib.Path(__file__).resolve().parent.parent / "assets" / "screens"
out.mkdir(parents=True, exist_ok=True)
for p in sorted(src.glob("*.png")):
    Image.open(p).convert("RGB").save(out / (p.stem + ".webp"), "WEBP", lossless=True, method=6)
    print(p.stem, (out / (p.stem + ".webp")).stat().st_size // 1024, "KB")
