"""Kit showreel 5 (2026-10-01, after his verdict on showreel 4: loved 39, 40 good): the families he asked for. Numbers 41-49 continue showreels 1-4.

  python build_showreel5.py              all demos
  python build_showreel5.py diagram      only 41-43   (K.diagram: a chain that builds itself)
  python build_showreel5.py curve        only 44-45   (K.curve: the force-time curve)
  python build_showreel5.py chapter      only 46-47   (K.chapter: chapter labels on the clay wipe)
  python build_showreel5.py body         only 48-49   (K.bodymap: the app's traced body, lit as he says it; a joints chain)
Silent on purpose (his voice would say something else): only the kit's sound effects play. Every word and number on screen is a demo
placeholder, not a claim, and the curves are a drawn idea, never data. Idea generation: he is not editing this video.
None of these needs the cut-out: they are cards or sit on the footage.
"""
import os
import shutil
import sys

sys.path.insert(0, r"C:\Users\Amir\.claude\skills\cut\kit")
import kit  # noqa: E402

W = r"C:\Users\Amir\Videos\Reels\kit-showreel5"
PUB = os.path.join(W, "public")
V1 = r"C:\Users\Amir\Videos\Reels\hctv3230\v1\public"
TR = r"C:\Users\Amir\Videos\Reels\hctv3230\transcript.json"
which = sys.argv[1] if len(sys.argv) > 1 else "all"

os.makedirs(PUB, exist_ok=True)
kit.scaffold(PUB)
if not os.path.exists(os.path.join(PUB, "input-video.mp4")):
    shutil.copy2(os.path.join(V1, "input-video.mp4"), os.path.join(PUB, "input-video.mp4"))

# (key, source in, source out, group). His hands are low in 1-19 s, so the on-footage demos use those seconds.
DEMOS = [
    ("dg_chain", 22.0, 31.0, "diagram"),
    ("dg_cycle", 33.0, 42.0, "diagram"),
    ("dg_video", 11.0, 19.5, "diagram"),
    ("curve_one", 44.0, 54.0, "curve"),
    ("curve_two", 56.0, 66.0, "curve"),
    ("chap_card", 67.0, 79.0, "chapter"),
    ("chap_band", 1.0, 9.5, "chapter"),
    ("bodymap", 46.0, 58.0, "body"),
    ("bodychain", 27.0, 36.0, "body"),
]
if which != "all":
    DEMOS = [d for d in DEMOS if d[3] == which]

SEGS, START, IDX = [], {}, {}
t = 0.0
for i, (key, a, b, _g) in enumerate(DEMOS):
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
    """A JS array of edited-clock times from demo-relative seconds."""
    return "[" + ", ".join(str(T(key, x)) for x in xs) + "]"


js('const L = (n, name, t0, t1) => K.label(n + "  " + name, t0, t1);')

if "dg_chain" in IDX:
    k = "dg_chain"
    nodes = [1.7, 3.1, 4.5, 5.9]
    js('L("41", "diagram · a chain builds itself, a pulse runs along it", %s, %s);' % (T(k, 0.1), T(k, dur(k) - 0.1)))
    js('K.diagram(["نیرو", "شتاب", "سرعت", "توان"], { mode: "card", at: %s, nodeAt: %s, out: %s, layout: "chain" });' % (T(k, 0.4), tl(k, nodes), T(k, 7.7)))
    ev(k, 0.4, "whoosh")
    for i, x in enumerate(nodes):
        ev(k, x, "thock")
        if i:
            ev(k, x - 0.5, "swipe")
    ev(k, nodes[-1] + 0.05, "hit")
    ev(k, nodes[-1] + 0.15, "ding")
    ev(k, 7.7, "whoosh")

if "dg_cycle" in IDX:
    k = "dg_cycle"
    nodes = [1.6, 2.9, 4.2, 5.5]
    js('L("42", "diagram · a cycle, the last arrow runs back to the first", %s, %s);' % (T(k, 0.1), T(k, dur(k) - 0.1)))
    js('K.diagram(["تمرین", "استراحت", "سازگاری", "قوی\u200cتر"], { mode: "card", at: %s, nodeAt: %s, loopAt: %s, out: %s, layout: "cycle" });' % (
        T(k, 0.4), tl(k, nodes), T(k, 6.5), T(k, 8.3)))
    ev(k, 0.4, "whoosh")
    for i, x in enumerate(nodes):
        ev(k, x, "thock")
        if i:
            ev(k, x - 0.5, "swipe")
    ev(k, 6.5, "swipe")
    ev(k, 7.05, "hit")
    ev(k, 7.15, "ding")
    ev(k, 8.3, "whoosh")

if "dg_video" in IDX:
    k = "dg_video"
    nodes = [1.5, 3.0, 4.5]
    js('L("43", "diagram · on his own video (chest zone), like the drum", %s, %s);' % (T(k, 0.1), T(k, dur(k) - 0.1)))
    js('K.diagram(["نیرو", "سرعت", "توان"], { mode: "video", layout: "row", at: %s, nodeAt: %s, out: %s });' % (T(k, 0.4), tl(k, nodes), T(k, 7.0)))
    ev(k, 0.4, "whoosh")
    for i, x in enumerate(nodes):
        ev(k, x, "thock")
        if i:
            ev(k, x - 0.5, "tick")
    ev(k, nodes[-1] + 0.1, "ding")
    ev(k, 7.0, "whoosh")

if "curve_one" in IDX:
    k = "curve_one"
    js('L("44", "force-time curve · one curve, its slope marked", %s, %s);' % (T(k, 0.1), T(k, dur(k) - 0.1)))
    js('K.curve({ at: %s, out: %s, yLabel: "نیرو", xLabel: "زمان", curves: [{ at: %s, dur: 1.5, tone: "clay", x0: 0.4, k: 9 }],'
       ' slope: { at: %s, curve: 0, label: "شیب" } });' % (T(k, 0.4), T(k, 8.4), T(k, 2.4), T(k, 4.6)))
    ev(k, 0.4, "whoosh")
    ev(k, 0.95, "swipe")
    ev(k, 1.05, "swipe")
    ev(k, 2.4, "rise")
    ev(k, 3.9, "hit")
    ev(k, 4.6, "swipe")
    ev(k, 5.0, "stamp")
    ev(k, 8.4, "whoosh")

if "curve_two" in IDX:
    k = "curve_two"
    js('L("45", "force-time curve · two curves, the time saved", %s, %s);' % (T(k, 0.1), T(k, dur(k) - 0.1)))
    js('K.curve({ at: %s, out: %s, yLabel: "نیرو", xLabel: "زمان", curves: ['
       '{ at: %s, dur: 1.7, tone: "paper", x0: 0.62, k: 5.2, label: "قبل" }, { at: %s, dur: 1.2, tone: "clay", x0: 0.3, k: 15, label: "بعد" }],'
       ' gap: { at: %s, level: 0.8, label: "زمان کمتر" } });' % (T(k, 0.4), T(k, 8.6), T(k, 2.0), T(k, 4.0), T(k, 5.8)))
    ev(k, 0.4, "whoosh")
    ev(k, 0.95, "swipe")
    ev(k, 1.05, "swipe")
    ev(k, 2.0, "rise")
    ev(k, 4.0, "rise")
    ev(k, 5.2, "hit")
    ev(k, 5.8, "swipe")
    ev(k, 6.5, "thock")
    ev(k, 6.8, "stamp")
    ev(k, 8.6, "whoosh")

if "chap_card" in IDX:
    k = "chap_card"
    js('L("46", "chapter label · on the clay wipe, an odometer rolls to the number", %s, %s);' % (T(k, 0.1), T(k, dur(k) - 0.1)))
    for n, (a, title) in enumerate(((0.5, "نیرو"), (4.4, "سرعت"), (8.3, "توان")), 1):
        js('K.chapter(%d, "%s", { variant: "card", at: %s, landAt: %s, titleAt: %s, out: %s, total: 3 });' % (n, title, T(k, a), T(k, a + 1.0), T(k, a + 1.05), T(k, a + 2.5)))
        ev(k, a, "whoosh")
        ev(k, a + 1.0 - 0.98, "roll")
        ev(k, a + 1.0, "hit")
        ev(k, a + 1.05, "stamp")
        ev(k, a + 2.5, "whoosh")

if "chap_band" in IDX:
    k = "chap_band"
    js('L("47", "chapter label · a clay band on his own video, his face stays", %s, %s);' % (T(k, 0.1), T(k, dur(k) - 0.1)))
    for n, (a, title) in enumerate(((0.6, "نیرو"), (4.4, "سرعت")), 1):
        js('K.chapter(%d, "%s", { variant: "band", at: %s, landAt: %s, titleAt: %s, out: %s, total: 3 });' % (n, title, T(k, a), T(k, a + 0.8), T(k, a + 0.85), T(k, a + 2.8)))
        ev(k, a, "whoosh")
        ev(k, a + 0.8 - 0.98, "roll")
        ev(k, a + 0.8, "hit")
        ev(k, a + 0.85, "stamp")
        ev(k, a + 2.8, "whoosh")

if "bodymap" in IDX:
    k = "bodymap"
    steps = [(2.6, "quads", "ران", "front", "r"), (5.6, "glutes", "باسن", "back", "l"), (7.0, "hamstrings", "پشت ران", "back", "r"),
             (8.4, "calves", "ساق", "back", "l")]
    js('L("48", "body map · the app\'s body, muscles lit as he says them, it turns round", %s, %s);' % (T(k, 0.1), T(k, dur(k) - 0.1)))
    js('K.bodymap([%s], { at: %s, out: %s });' % (
        ", ".join('{ m: "%s", label: "%s", at: %s, view: "%s", side: "%s" }' % (m, lab, T(k, a), v, s) for a, m, lab, v, s in steps), T(k, 0.4), T(k, 10.9)))
    ev(k, 0.4, "whoosh")
    ev(k, 0.95, "swipe")
    for a, *_ in steps:
        ev(k, a, "thock")
        ev(k, a - 0.05, "tick")
    ev(k, 5.6 - 1.05, "whoosh")
    ev(k, 8.6, "ding")
    ev(k, 10.9, "whoosh")

if "bodychain" in IDX:
    k = "bodychain"
    joints = [(2.4, "ring:hip", "لگن"), (3.9, "ring:knee", "زانو"), (5.4, "ring:ankle", "مچ پا")]
    js('L("49", "body map · a joints chain, a pulse runs down the leg", %s, %s);' % (T(k, 0.1), T(k, dur(k) - 0.1)))
    js('K.bodymap([%s], { at: %s, out: %s, chain: true });' % (
        ", ".join('{ m: "%s", label: "%s", at: %s, side: "r" }' % (m, lab, T(k, a)) for a, m, lab in joints), T(k, 0.4), T(k, 7.7)))
    ev(k, 0.4, "whoosh")
    ev(k, 0.95, "swipe")
    for i, (a, *_r) in enumerate(joints):
        ev(k, a, "thock")
        if i:
            ev(k, a - 0.5, "swipe")
    ev(k, joints[-1][0] + 0.15, "ding")
    ev(k, 7.7, "whoosh")

kit.build(W, "showreel5", SEGS, "\n".join(JS), sfx=EV, transcript=TR, audio=None)
