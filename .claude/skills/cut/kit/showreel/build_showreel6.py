"""Kit showreel 6 (2026-10-01, after his verdict on showreel 5): he prefers the diagram ON HIS OWN VIDEO (43) "if the spacing and the size of the text allows it", and the
chapter band (47). So the video diagram now picks a layout that fits (row, grid, stack), shrinks the text to fit, and says so when it cannot. Numbers 50-52 continue.

  python build_showreel6.py
Silent on purpose: only the kit's sound effects play. The phrases in 50 are HIS words from the HCTV3230 reel ("the three checks"), the rest are placeholders.
Idea generation: he is not editing this video. Nothing here needs the cut-out.
"""
import os
import shutil
import sys

sys.path.insert(0, r"C:\Users\Amir\.claude\skills\cut\kit")
import kit  # noqa: E402

W = r"C:\Users\Amir\Videos\Reels\kit-showreel6"
PUB = os.path.join(W, "public")
V1 = r"C:\Users\Amir\Videos\Reels\hctv3230\v1\public"
TR = r"C:\Users\Amir\Videos\Reels\hctv3230\transcript.json"

os.makedirs(PUB, exist_ok=True)
kit.scaffold(PUB)
if not os.path.exists(os.path.join(PUB, "input-video.mp4")):
    shutil.copy2(os.path.join(V1, "input-video.mp4"), os.path.join(PUB, "input-video.mp4"))

# (key, source in, source out). His hands are low in 1-19 s and 43-47 s, so the chest zone is free there.
DEMOS = [
    ("dg_stack", 1.0, 9.0),
    ("dg_grid", 11.0, 20.0),
    ("chap_band", 43.0, 50.0),
]
SEGS, START, IDX = [], {}, {}
t = 0.0
for i, (key, a, b) in enumerate(DEMOS):
    SEGS.append({"in": a, "out": b, "rate": 1.0, "zoom": 1.0})
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


def tl(key, xs):
    return "[" + ", ".join(str(T(key, x)) for x in xs) + "]"


js('const L = (n, name, t0, t1) => K.label(n + "  " + name, t0, t1);')

k = "dg_stack"
nodes = [1.5, 3.1, 4.7]
js('L("50", "diagram · on his video, long phrases of his: it picks the stack", %s, %s);' % (T(k, 0.1), T(k, dur(k) - 0.1)))
js('window.__d50 = K.diagram(["نیروی زیاد · زمان کوتاه", "سرعت بالا · تماس کوتاه", "هماهنگی عصبی\u200cعضلانی"], { at: %s, nodeAt: %s, out: %s });' % (
    T(k, 0.4), tl(k, nodes), T(k, 6.9)))
ev(k, 0.4, "whoosh")
for i, x in enumerate(nodes):
    ev(k, x, "thock")
    if i:
        ev(k, x - 0.5, "tick")
ev(k, nodes[-1] + 0.1, "ding")
ev(k, 6.9, "whoosh")

k = "dg_grid"
nodes = [1.5, 2.8, 4.1, 5.4]
js('L("51", "diagram · on his video, four steps in a loop: it picks the grid", %s, %s);' % (T(k, 0.1), T(k, dur(k) - 0.1)))
js('window.__d51 = K.diagram(["تمرین", "استراحت", "سازگاری", "قوی\u200cتر"], { loop: true, at: %s, nodeAt: %s, loopAt: %s, out: %s });' % (
    T(k, 0.4), tl(k, nodes), T(k, 6.4), T(k, 8.2)))
ev(k, 0.4, "whoosh")
for i, x in enumerate(nodes):
    ev(k, x, "thock")
    if i:
        ev(k, x - 0.5, "tick")
ev(k, 6.4, "tick")
ev(k, 6.95, "hit")
ev(k, 7.05, "ding")
ev(k, 8.2, "whoosh")

k = "chap_band"
js('L("52", "chapter label · the band is the default, longer titles shrink to fit", %s, %s);' % (T(k, 0.1), T(k, dur(k) - 0.1)))
for n, (a, title, o) in enumerate(((0.5, "نیروی زیاد", 2.4), (3.4, "سرعت بالا", 2.4)), 1):
    js('K.chapter(%d, "%s", { at: %s, landAt: %s, titleAt: %s, out: %s, total: 3 });' % (n, title, T(k, a), T(k, a + 0.8), T(k, a + 0.85), T(k, a + o)))
    ev(k, a, "whoosh")
    ev(k, a + 0.8 - 0.98, "roll")
    ev(k, a + 0.8, "hit")
    ev(k, a + 0.85, "stamp")
    ev(k, a + o, "whoosh")

kit.build(W, "showreel6", SEGS, "\n".join(JS), sfx=EV, transcript=TR, audio=None)
