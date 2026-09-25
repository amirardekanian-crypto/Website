"""Cut the four Higgsfield clips down to the seconds the reel uses, and make the lean copies the reel embeds.

    python Content/reel-8-course/src/prep_clips.py masters <folder-with-the-downloaded-clips>
    python Content/reel-8-course/src/prep_clips.py embeds

`masters` trims each downloaded clip to its useful range at high quality (crf 14, no audio) into masters/. Those four small
files are the source of truth (the untrimmed originals are on Higgsfield, job ids in .claude/skills/video/SKILL.md, ledger).
`embeds` makes assets/clip-<name>.mp4 from the masters: crf 24, a light sharpen (the clips are 716-720 px wide and the reel
is 1080, so they are scaled 1.5x in the browser), a keyframe every half second so seeking is quick. The build embeds those.

The ranges are what Amir approved by eye (2026-09-20), not the tool's suggestion:
  burst  0-3.0 s   the foot leaves the frame at 3 s
  pivot  0-1.75 s  she runs to a dot after that
  gym    0-1.55 s  a man bends into the frame at 1.67 s: his face and a printed shirt logo break the no-face, no-logo rule
  plate  0-3.0 s   the whole clip (a quiet haze-drift plate)
"""
import os
import pathlib
import shutil
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
PROJ = HERE.parent
CLIPS = {
    # name: (downloaded file name, start, length, what it is)
    "burst": ("test1-clay-burst.mp4", 0.0, 3.0, "clay burst, Cinema Studio v2 slowmo, job 371bb4ef"),
    "pivot": ("test2-floodlit-pivot.mp4", 0.0, 1.75, "floodlit pivot, Kling 3.0, job b4e56996"),
    "gym": ("gym.mp4", 0.0, 1.55, "chalked grip, Cinema Studio v2 slowmo, job 804a5c00"),
    "plate": ("plate.mp4", 0.0, 3.0, "night court plate, Cinema Studio v2, job 0a334ef3"),
}


def ffmpeg():
    if os.environ.get("FFMPEG"):
        return os.environ["FFMPEG"]
    found = shutil.which("ffmpeg")
    if found:
        return found
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def run(*args):
    r = subprocess.run([ffmpeg(), "-y", "-hide_banner", "-loglevel", "error", *args], capture_output=True, text=True)
    if r.returncode:
        sys.exit(r.stderr)


def masters(src):
    out = PROJ / "masters"
    out.mkdir(exist_ok=True)
    for name, (fname, start, length, _) in CLIPS.items():
        run("-ss", str(start), "-i", str(pathlib.Path(src) / fname), "-t", str(length), "-an", "-c:v", "libx264", "-preset", "slow",
            "-crf", "14", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
            "-movflags", "+faststart", str(out / f"{name}.mp4"))
        print("master", name, round((out / f"{name}.mp4").stat().st_size / 1e6, 2), "MB")


def embeds():
    out = PROJ / "assets"
    out.mkdir(exist_ok=True)
    for name in CLIPS:
        run("-i", str(PROJ / "masters" / f"{name}.mp4"), "-an", "-vf", "unsharp=5:5:0.5:5:5:0.0", "-c:v", "libx264", "-preset", "slow",
            "-crf", "24", "-g", "12", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
            "-movflags", "+faststart", str(out / f"clip-{name}.mp4"))
        print("embed", name, round((out / f"clip-{name}.mp4").stat().st_size / 1e6, 2), "MB")


if len(sys.argv) >= 3 and sys.argv[1] == "masters":
    masters(sys.argv[2])
elif len(sys.argv) == 2 and sys.argv[1] == "embeds":
    embeds()
else:
    sys.exit(__doc__)
