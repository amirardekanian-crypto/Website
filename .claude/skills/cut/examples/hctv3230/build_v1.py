"""Build the HCTV3230 reel: edit plan -> clips on one clock -> index.html (graphics + sound effects).

  python build_v1.py            writes public/index.html and out/*
"""
import argparse
import json
import os
import sys

sys.path.insert(0, r"C:\Users\Amir\.claude\skills\cut\tools")
import plan_to_clips as P

V = r"C:\Users\Amir\Videos\Reels\hctv3230\v1"
TR = r"C:\Users\Amir\Videos\Reels\hctv3230\transcript.json"
OUT = os.path.join(V, "out")
X0 = 44.6          # the cut-out file starts here (source seconds)
REV = 12           # index of the reveal segment

# source seconds. rate: 1.0 as spoken. zoom: 1.0 wide, 1.12-1.22 cut-in. punch: settle on the cut. drift: slow push-in.
# Cuts sit inside real silences (leaving 0.12-0.5 s of breath); speed changes sit on sentence or pause boundaries.
S = [
    {"in": 0.00, "out": 5.695, "rate": 1.0, "zoom": 1.0, "drift": 0.05},     # the question
    {"in": 6.075, "out": 6.985, "rate": 1.0, "zoom": 1.16, "punch": True},   # option 1
    {"in": 7.555, "out": 8.94, "rate": 1.0, "zoom": 1.0},                    # option 2
    {"in": 9.31, "out": 10.32, "rate": 1.0, "zoom": 1.16, "punch": True},    # option 3
    {"in": 10.61, "out": 15.88, "rate": 1.0, "zoom": 1.0, "drift": 0.04},    # option 4 + "what do you want from it?"
    {"in": 16.15, "out": 18.81, "rate": 1.08, "zoom": 1.18, "punch": True},  # rule 1 (faster while he explains)
    {"in": 19.14, "out": 24.51, "rate": 1.08, "zoom": 1.0},
    {"in": 24.78, "out": 28.30, "rate": 1.08, "zoom": 1.16, "punch": True},  # rule 2
    {"in": 28.30, "out": 33.98, "rate": 1.08, "zoom": 1.0},                  # rule 3
    {"in": 33.98, "out": 35.40, "rate": 1.0, "zoom": 1.15, "punch": True},   # "in tennis, when the opponent..."
    {"in": 35.40, "out": 39.38, "rate": 1.0, "zoom": 1.0},                   # court cutaway covers the picture
    {"in": 39.38, "out": 44.35, "rate": 0.94, "zoom": 1.0, "drift": 0.08},   # the question, slower
    {"in": 44.69, "out": 47.23, "rate": 1.0, "zoom": 1.0, "drift": 0.04},    # THE REVEAL (word behind him, slow push-in)
    {"in": 47.23, "out": 50.59, "rate": 1.06, "zoom": 1.16, "punch": True},  # the answer
    {"in": 50.85, "out": 54.99, "rate": 1.06, "zoom": 1.0},                  # tick 1
    {"in": 54.99, "out": 57.78, "rate": 1.06, "zoom": 1.16, "punch": True},  # tick 2
    {"in": 57.78, "out": 61.52, "rate": 0.92, "zoom": 1.22, "punch": True},  # "each step is a single-leg explosion", slower
    {"in": 61.52, "out": 67.45, "rate": 1.04, "zoom": 1.0, "drift": 0.05},   # tick 3
    {"in": 67.45, "out": 70.22, "rate": 1.0, "zoom": 1.16, "punch": True},   # "one of the strongest tools"
    {"in": 70.22, "out": 76.30, "rate": 1.0, "zoom": 1.0},
    {"in": 76.30, "out": 79.13, "rate": 1.0, "zoom": 1.0},                   # court cutaway: a few metres
    {"in": 79.13, "out": 84.667, "rate": 0.97, "zoom": 1.12, "drift": 0.05}, # the call to action
]

REVEAL_INNER = (
    '<div class="dim"></div>'
    '<div class="deep" id="deep1">اسپرینت</div>'
    '<div class="deep w2" id="deep2">استارت</div>'
    '<video id="cut0" class="clip" src="reveal_cut.webm" data-start="@START@" data-duration="@DUR@" '
    'data-media-start="%.3f" data-track-index="3" muted playsinline></video>' % (S[REV]["in"] - X0)
)

SFX = {  # kept well under the voice: he adds music in Instagram afterwards
    "pop": dict(file="pop.wav", dur=0.25, vol=0.30, track=11),
    "whoosh": dict(file="whoosh.wav", dur=0.75, vol=0.28, track=12),
    "ding": dict(file="ding.wav", dur=0.8, vol=0.40, track=13),
    "thock": dict(file="thock.wav", dur=0.3, vol=0.50, track=14),
    "hit": dict(file="hit.wav", dur=1.0, vol=0.50, track=15),
    "stamp": dict(file="stamp.wav", dur=0.5, vol=0.42, track=16),
}
EVENTS = [  # (source seconds, sound)
    (0.70, "pop"), (6.27, "pop"), (7.70, "pop"), (9.43, "pop"), (10.67, "pop"),
    (17.25, "pop"), (22.50, "pop"), (29.10, "pop"),
    (13.40, "whoosh"), (15.70, "whoosh"), (35.30, "whoosh"), (39.15, "whoosh"),
    (76.20, "whoosh"), (78.95, "whoosh"), (44.82, "whoosh"),
    (44.88, "hit"), (14.50, "stamp"),
    (35.77, "thock"),
    (54.25, "ding"), (57.70, "ding"), (67.20, "ding"),
    (60.20, "stamp"), (82.05, "stamp"),
]


def write_plan(inner=None):
    segs = [dict(s) for s in S]
    if inner:
        segs[REV]["inner_html"] = inner
    plan = {"video": "input-video.mp4", "audio": "voice.m4a", "fps": 30, "origin": "50% 45%", "segments": segs}
    path = os.path.join(V, "plan.json")
    json.dump(plan, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    return path


def run_build(path):
    P.build(argparse.Namespace(plan=path, transcript=TR, outdir=OUT))
    return json.load(open(os.path.join(OUT, "timemap.json"), encoding="utf-8"))


run_build(write_plan())                      # first pass: learn where each segment lands
tm = run_build(write_plan(REVEAL_INNER))     # second pass: the reveal layers need that segment's start and length
segs = tm["segments"]


def E(t):
    for s in segs:
        if s["in"] <= t <= s["out"]:
            return s["start"] + (t - s["in"]) / s["rate"]
    for s in segs:
        if t < s["in"]:
            return s["start"]
    return tm["total"]


sfx_html = []
for n, (t, name) in enumerate(EVENTS):
    c = SFX[name]
    sfx_html.append('<audio id="sfx%02d" class="clip" src="sfx/%s" data-start="%.3f" data-duration="%.2f" '
                    'data-track-index="%d" data-volume="%.2f"></audio>' % (n, c["file"], max(0, E(t)), c["dur"], c["track"], c["vol"]))

clips = open(os.path.join(OUT, "clips.html"), encoding="utf-8").read()
zoom = open(os.path.join(OUT, "zoom.js"), encoding="utf-8").read()
segs_json = json.dumps([{"in": s["in"], "out": s["out"], "rate": s["rate"], "start": s["start"]} for s in segs])
html = (open(os.path.join(V, "template.html"), encoding="utf-8").read()
        .replace("%%CLIPS%%", clips).replace("%%ZOOM%%", zoom).replace("%%SEGS%%", segs_json)
        .replace("%%TOTAL%%", "%.4f" % (tm["total"] + 0.05)).replace("%%REVSEG%%", str(REV))
        .replace("%%SFX%%", "\n      ".join(sfx_html)))
open(os.path.join(V, "public", "index.html"), "w", encoding="utf-8").write(html)
print("built: edited length %.2f s, %d segments, %d sound effects, reveal at edited %.2f s" %
      (tm["total"], len(segs), len(EVENTS), E(44.94)), file=sys.stderr)
