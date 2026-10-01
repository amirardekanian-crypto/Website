"""Sample clips for the Motion Menu: the kit's ingredients, cut from the showreels WITHOUT the catalogue label.

The showreels burn a label with the SHOWREEL number into the corner ("41 diagram ..."), and the Motion Menu has its own numbers (menu 41 is Spring Lab), so the
samples are cut from a re-render of each showreel with the label hidden. The originals are never touched: each showreel's public/ folder is copied into
menu-samples\\sN\\ (big files are hard links, so it costs almost no disk) with one style added to index.html.

  python menu_samples.py prepare            make menu-samples\\s1..s6 (hard-linked copies, label hidden)
  python menu_samples.py render [N ...]     render them one after another (about 1.2-2.5 minutes of work per minute of video); run it DETACHED
  python menu_samples.py cut                cut every manifest entry that has a sample (kit\\menu\\menu.json) into out\\clips and out\\posters
  python menu_samples.py cut <id> [<id>]    only those entries

Everything lands under C:\\Users\\Amir\\Videos\\Reels\\menu-samples\\. Samples are 450 x 800, muted, H.264, small (the Menu's own clips are 404 x 720 at 40-60 kbit/s).
"""
import json
import os
import shutil
import subprocess
import sys

REELS = r"C:\Users\Amir\Videos\Reels"
OUT = os.path.join(REELS, "menu-samples")
KIT = r"C:\Users\Amir\.claude\skills\cut\kit"
MANIFEST = os.path.join(KIT, "menu", "menu.json")
FFBIN = r"C:\Users\Amir\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin"
SRC = {1: "kit-showreel", 2: "kit-showreel2", 3: "kit-showreel3", 4: "kit-showreel4", 5: "kit-showreel5", 6: "kit-showreel6"}
HIDE = "<style>.k-label{display:none!important}</style>"
W, H = 450, 800


def env():
    e = dict(os.environ)
    e["PATH"] = FFBIN + os.pathsep + e.get("PATH", "")
    e["PYTHONIOENCODING"] = "utf-8"
    return e


def prepare():
    for n, folder in SRC.items():
        src = os.path.join(REELS, folder, "public")
        dst = os.path.join(OUT, "s%d" % n)
        if not os.path.isdir(src):
            print("missing", src)
            continue
        made = linked = 0
        for root, dirs, files in os.walk(src):
            dirs[:] = [d for d in dirs if d != "snapshots"]
            rel = os.path.relpath(root, src)
            os.makedirs(os.path.join(dst, rel), exist_ok=True)
            for f in files:
                a, b = os.path.join(root, f), os.path.join(dst, rel, f)
                if os.path.exists(b):
                    os.remove(b)
                if rel == "." and f == "index.html":
                    html = open(a, encoding="utf-8").read()
                    if "</head>" not in html:
                        raise SystemExit("no </head> in " + a)
                    open(b, "w", encoding="utf-8", newline="").write(html.replace("</head>", HIDE + "</head>", 1))
                elif os.path.getsize(a) > 1_000_000:
                    try:
                        os.link(a, b)
                        linked += 1
                    except OSError:
                        shutil.copy2(a, b)
                else:
                    shutil.copy2(a, b)
                made += 1
        print("s%d: %d files (%d hard links) -> %s" % (n, made, linked, dst))


def render(which):
    for n in which or SRC:
        d = os.path.join(OUT, "s%d" % n)
        out = os.path.join(OUT, "s%d_raw.mp4" % n)
        if os.path.exists(out):
            os.remove(out)
        log = open(os.path.join(OUT, "render_s%d.log" % n), "w", encoding="utf-8")
        print("rendering s%d ..." % n, flush=True)
        r = subprocess.run(["hyperframes.cmd", "render", d, "-o", out, "--fps", "30"], stdout=log, stderr=subprocess.STDOUT, env=env(), shell=False)
        print("s%d done, exit %d, %s" % (n, r.returncode, "ok" if os.path.exists(out) else "NO FILE"), flush=True)


def cut(ids):
    items = json.load(open(MANIFEST, encoding="utf-8"))["items"]
    os.makedirs(os.path.join(OUT, "out", "clips"), exist_ok=True)
    os.makedirs(os.path.join(OUT, "out", "posters"), exist_ok=True)
    ff = os.path.join(FFBIN, "ffmpeg.exe")
    jobs = []                                    # (clip key, sample window): an item's own clip, and each built form of it (alts) that has a window of its own
    for it in items:
        if it.get("sample"):
            jobs.append((it["id"], it["sample"]))
        for al in it.get("alts", []):
            if al.get("sample") and al["k"] != it["id"]:
                jobs.append((al["k"], al["sample"]))
    for key, s in jobs:
        if ids and key not in ids:
            continue
        src = os.path.join(OUT, "s%d_raw.mp4" % s["showreel"])
        if not os.path.exists(src):
            print("skip %s: %s not rendered yet" % (key, os.path.basename(src)))
            continue
        clip = os.path.join(OUT, "out", "clips", key + ".mp4")
        post = os.path.join(OUT, "out", "posters", key + ".jpg")
        vf = "scale=%d:%d:flags=lanczos,fps=30,format=yuv420p" % (W, H)
        subprocess.run([ff, "-y", "-hide_banner", "-loglevel", "error", "-ss", "%.3f" % s["t0"], "-to", "%.3f" % s["t1"], "-i", src, "-an", "-vf", vf,
                        "-c:v", "libx264", "-preset", "slow", "-crf", str(s.get("crf", 27)), "-g", "30", "-movflags", "+faststart", clip], check=True)
        pt = s.get("poster", (s["t0"] + s["t1"]) / 2)
        subprocess.run([ff, "-y", "-hide_banner", "-loglevel", "error", "-ss", "%.3f" % pt, "-i", src, "-frames:v", "1", "-vf", "scale=%d:%d:flags=lanczos" % (W, H),
                        "-q:v", "4", post], check=True)
        print("%-16s %5.1f s  %6d bytes clip, %6d bytes poster" % (key, s["t1"] - s["t0"], os.path.getsize(clip), os.path.getsize(post)))


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "prepare":
        prepare()
    elif cmd == "render":
        render([int(x) for x in sys.argv[2:]])
    elif cmd == "cut":
        cut(sys.argv[2:])
    else:
        print(__doc__)
