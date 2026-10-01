"""Kit showreel 4 (2026-10-01, after his verdict on showreel 3): the drum ON HIS FOOTAGE (his idea: "32 ... can be on the video it self
as well, very creative"), and a second poster-number variant (29 was his favourite). Numbers 39-40 continue showreels 1-3.

  python build_showreel4.py
Silent on purpose: only the kit's sound effects play. The words and numbers are demo placeholders, not claims. Idea generation: he is
not editing this video. Needs the whole-clip cut-out for 40 (tools/cutout.py, then full_cut_t.webm).
"""
import os
import shutil
import sys

sys.path.insert(0, r"C:\Users\Amir\.claude\skills\cut\kit")
import kit  # noqa: E402

W = r"C:\Users\Amir\Videos\Reels\kit-showreel4"
PUB = os.path.join(W, "public")
V1 = r"C:\Users\Amir\Videos\Reels\hctv3230\v1\public"
CUT = r"C:\Users\Amir\Videos\Reels\hctv3230\cutout\full_cut_t.webm"
TR = r"C:\Users\Amir\Videos\Reels\hctv3230\transcript.json"

os.makedirs(PUB, exist_ok=True)
kit.scaffold(PUB)
if not os.path.exists(os.path.join(PUB, "input-video.mp4")):
    shutil.copy2(os.path.join(V1, "input-video.mp4"), os.path.join(PUB, "input-video.mp4"))
if not os.path.exists(os.path.join(PUB, "full_cut_t.webm")):
    shutil.copy2(CUT, os.path.join(PUB, "full_cut_t.webm"))

# (key, source in, source out, extra plan fields)
DEMOS = [
    ("drum_video", 4.0, 13.0, {}),
    ("num_clay", 15.0, 22.0, {"depth": True}),
]
SEGS, START, IDX = [], {}, {}
t = 0.0
for i, (key, a, b, extra) in enumerate(DEMOS):
    seg = {"in": a, "out": b, "rate": 1.0, "zoom": 1.0}
    if extra.get("depth"):
        seg["inner_html"] = kit.behind_video("full_cut_t.webm", a, id="cut%d" % i)
    SEGS.append(seg)
    START[key], IDX[key] = t, i
    t += b - a


def T(key, x):
    """Seconds on the edited clock, x seconds into the demo `key`."""
    return round(START[key] + x, 3)


def dur(key):
    d = DEMOS[IDX[key]]
    return d[2] - d[1]


JS, EV = [], []


def js(s):
    JS.append(s)


def ev(key, x, name):
    """A sound cue x seconds into the demo `key`. kit.build maps SOURCE seconds to the edited clock, so give it source time."""
    EV.append((DEMOS[IDX[key]][1] + x, name))


js('const L = (n, name, t0, t1) => K.label(n + "  " + name, t0, t1);')

k = "drum_video"
js('L("39", "list · the drum on his own video", %s, %s);' % (T(k, 0.1), T(k, dur(k) - 0.1)))
js('K.list(["نیروی زیاد · زمان کوتاه", "سرعت بالا · تماس کوتاه", "هماهنگی عصبی‌عضلانی"], { mode: "video", at: %s, itemAt: [%s, %s, %s], flatAt: %s, out: %s });' % (
    T(k, 0.4), T(k, 1.5), T(k, 3.1), T(k, 4.7), T(k, 6.1), T(k, 8.2)))
ev(k, 0.4, "whoosh")
for x in (1.5, 3.1, 4.7):
    ev(k, x, "tick")
    ev(k, x + 0.2, "thock")
ev(k, 6.1, "whoosh")
ev(k, 8.2, "whoosh")

k, i = "num_clay", IDX["num_clay"]
js('L("40", "number behind him · clay studio, two digits", %s, %s);' % (T(k, 0.1), T(k, dur(k) - 0.1)))
js('K.backdrop(%d, { at: %s, out: %s, tone: "clay", variant: "drop" });' % (i, T(k, 0.3), T(k, 6.2)))
js('K.slamBehind(%d, "۱۲", { at: %s, landAt: %s, out: %s, size: 470, top: 500, dim: 0 });' % (i, T(k, 1.2), T(k, 2.7), T(k, 5.8)))
js('K.tag("متر", { at: %s, x: 640, y: 1330, out: %s });' % (T(k, 2.9), T(k, 5.8)))
ev(k, 0.3, "whoosh")
ev(k, 2.7 - 0.98, "roll")
ev(k, 2.7, "hit")
ev(k, 2.9, "stamp")
ev(k, 6.2, "whoosh")

kit.build(W, "showreel4", SEGS, "\n".join(JS), sfx=EV, transcript=TR, audio=None)
