"""Kit showreel 2: the depth family and the broadcast court, on Amir's footage (HCTV3230). Numbers 18-26 continue showreel 1 (01-17).
It doubles as the regression test for those blocks: rebuild and render it after any change to kit.js / kit.css, and look at the sheet.

  python build_showreel2.py            all demos
  python build_showreel2.py depth      only 18-24
  python build_showreel2.py courts     only 25-26
Silent on purpose (his voice would say something else): only the kit's sound effects play. The words and numbers are demo
placeholders, not claims.

Needs the whole-clip cut-out (made once per clip, see SKILL.md "The cut-out"): hyperframes remove-background, then the alpha trim
(2 px erosion + a light feather) so no light rim shows on dark backdrops. Path below.
"""
import os
import shutil
import sys

sys.path.insert(0, r"C:\Users\Amir\.claude\skills\cut\kit")
import kit  # noqa: E402

W = r"C:\Users\Amir\Videos\Reels\kit-showreel2"
PUB = os.path.join(W, "public")
V1 = r"C:\Users\Amir\Videos\Reels\hctv3230\v1\public"
CUT = r"C:\Users\Amir\Videos\Reels\hctv3230\cutout\full_cut_t.webm"
TR = r"C:\Users\Amir\Videos\Reels\hctv3230\transcript.json"
which = sys.argv[1] if len(sys.argv) > 1 else "all"

os.makedirs(PUB, exist_ok=True)
kit.scaffold(PUB)
if not os.path.exists(os.path.join(PUB, "input-video.mp4")):
    shutil.copy2(os.path.join(V1, "input-video.mp4"), os.path.join(PUB, "input-video.mp4"))
if not os.path.exists(os.path.join(PUB, "full_cut_t.webm")):
    shutil.copy2(CUT, os.path.join(PUB, "full_cut_t.webm"))

# (key, source in, source out, extra plan fields). `depth` ones carry the cut-out for exactly their own seconds.
DEMOS = [
    ("stack", 6.0, 11.0, {"depth": True}),
    ("outline", 14.0, 18.5, {"depth": True}),
    ("drift", 22.0, 27.5, {"depth": True}),
    ("halo", 30.0, 36.0, {"depth": True, "drift": 0.04}),
    ("studio_clay", 38.0, 44.5, {"depth": True}),
    ("studio_ink", 50.0, 56.5, {"depth": True, "drift": 0.04}),
    ("focus", 60.0, 64.5, {"depth": True}),
    ("steps", 66.0, 73.0, {}),
    ("measure", 74.0, 80.7, {}),
]
if which == "depth":
    DEMOS = [d for d in DEMOS if d[3].get("depth")]
elif which == "courts":
    DEMOS = [d for d in DEMOS if not d[3].get("depth")]

SEGS, START, IDX = [], {}, {}
t = 0.0
for i, (key, a, b, extra) in enumerate(DEMOS):
    seg = {"in": a, "out": b, "rate": 1.0, "zoom": 1.0}
    if extra.get("drift"):
        seg["drift"] = extra["drift"]
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


# the cut-out is a source-time video, so K blocks run on the edited clock directly: no E() here (no speed changes in this reel)
js('const L = (n, name, t0, t1) => K.label(n + "  " + name, t0, t1);')

if "stack" in IDX:
    k, i = "stack", IDX["stack"]
    js('L("18", "poster · green studio, he sinks, one word stacked three times", %s, %s);' % (T(k, 0.1), T(k, dur(k) - 0.1)))
    js('K.backdrop(%d, { at: %s, out: %s, tone: "green", variant: "drop", lower: true });' % (i, T(k, 0.3), T(k, 4.6)))
    js('K.stack(%d, [{ t: "قدرت", tone: "paper" }, { t: "قدرت", tone: "outline", a: 0.9 }, { t: "قدرت", tone: "outline", a: 0.5 }],'
       ' { at: [%s, %s, %s], out: %s, top: 470, size: 250, lead: 0.72, dim: 0 });' % (i, T(k, 1.5), T(k, 1.75), T(k, 2.0), T(k, 4.2)))
    ev(k, 0.3, "whoosh")
    for x in (1.5, 1.75, 2.0):
        ev(k, x, "pop")
    ev(k, 4.6, "whoosh")

if "outline" in IDX:
    k, i = "outline", IDX["outline"]
    js('L("19", "hollow giant word · draws on, then fills", %s, %s);' % (T(k, 0.1), T(k, dur(k) - 0.1)))
    js('K.outline(%d, "سرعت", { at: %s, fillAt: %s, out: %s, size: 380, top: 410 });' % (i, T(k, 0.5), T(k, 2.3), T(k, 4.0)))
    ev(k, 0.45, "whoosh")
    ev(k, 2.3, "thock")

if "drift" in IDX:
    k, i = "drift", IDX["drift"]
    js('L("20", "drifting rows · two speeds, two directions", %s, %s);' % (T(k, 0.1), T(k, dur(k) - 0.1)))
    js('K.drift(%d, "سرعت", { at: %s, out: %s });' % (i, T(k, 0.5), T(k, 5.0)))
    ev(k, 0.5, "whoosh")

if "halo" in IDX:
    k, i = "halo", IDX["halo"]
    js('L("21", "behind his head · glow, light sweep, ring, disc", %s, %s);' % (T(k, 0.1), T(k, dur(k) - 0.1)))
    js('K.halo(%d, { at: %s, out: %s, kind: "glow", tone: "clay" });' % (i, T(k, 0.4), T(k, 2.5)))
    js('K.sweep(%d, { at: %s, d: 1.1 });' % (i, T(k, 2.0)))
    js('K.halo(%d, { at: %s, out: %s, kind: "ring", tone: "paper", size: 700, y: 790 });' % (i, T(k, 2.9), T(k, 4.2)))
    js('K.halo(%d, { at: %s, out: %s, kind: "disc", tone: "clay", size: 720, y: 790 });' % (i, T(k, 4.3), T(k, 5.8)))
    ev(k, 0.4, "whoosh")
    ev(k, 2.0, "whoosh")
    ev(k, 2.9, "pop")
    ev(k, 4.3, "pop")

if "studio_clay" in IDX:
    k, i = "studio_clay", IDX["studio_clay"]
    js('L("22", "backdrop swap · clay studio, iris from his face", %s, %s);' % (T(k, 0.1), T(k, dur(k) - 0.1)))
    js('K.backdrop(%d, { at: %s, out: %s, tone: "clay", variant: "iris" });' % (i, T(k, 0.5), T(k, 5.6)))
    js('K.outline(%d, "سرعت", { at: %s, out: %s, size: 380, top: 410, dim: 0, fillAt: %s });' % (i, T(k, 1.3), T(k, 5.3), T(k, 3.4)))
    js('K.halo(%d, { at: %s, out: %s, kind: "glow", tone: "paper", size: 900, a: 0.55 });' % (i, T(k, 1.5), T(k, 5.2)))
    ev(k, 0.5, "whoosh")
    ev(k, 1.3, "pop")
    ev(k, 3.4, "thock")
    ev(k, 5.6, "whoosh")

if "studio_ink" in IDX:
    k, i = "studio_ink", IDX["studio_ink"]
    js('L("23", "backdrop swap · dark studio, drifting type, clay halo", %s, %s);' % (T(k, 0.1), T(k, dur(k) - 0.1)))
    js('K.backdrop(%d, { at: %s, out: %s, tone: "ink", variant: "wipe", rim: "224,107,67" });' % (i, T(k, 0.5), T(k, 5.6)))
    js('K.halo(%d, { at: %s, out: %s, kind: "glow", tone: "clay", size: 1000, y: 780 });' % (i, T(k, 1.0), T(k, 5.3)))
    js('K.drift(%d, "قدرت", { at: %s, out: %s, dim: 0, rows: ['
       '{ top: 455, size: 190, tone: "outline-clay", dir: -1, speed: 80, a: 0.95 },'
       '{ top: 640, size: 270, tone: "ghostfill", dir: 1, speed: 60, a: 1 }] });' % (i, T(k, 1.2), T(k, 5.2)))
    ev(k, 0.5, "whoosh")
    ev(k, 1.2, "pop")
    ev(k, 5.6, "whoosh")

if "focus" in IDX:
    k, i = "focus", IDX["focus"]
    js('L("24", "focus · the room goes soft, he stays sharp", %s, %s);' % (T(k, 0.1), T(k, dur(k) - 0.1)))
    js('K.focus(%d, { at: %s, out: %s });' % (i, T(k, 0.4), T(k, 3.9)))
    js('K.stack(%d, [{ t: "فقط یه تمرین", tone: "paper", size: 165 }], { at: [%s], out: %s, top: 480, dim: 0, enter: "blur" });' % (i, T(k, 0.9), T(k, 3.5)))
    ev(k, 0.4, "whoosh")
    ev(k, 0.9, "pop")

if "steps" in IDX:
    k = "steps"
    js('L("25", "broadcast court · steps", %s, %s);' % (T(k, 0.1), T(k, dur(k) - 0.1)))
    js('K.courtSteps3d({ at: %s, hit: %s, line1: "چند ثانیه", line1At: %s, line2: "چند قدم", line2At: %s,'
       ' steps: [%s, %s, %s, %s, %s], arrive: %s, out: %s });' % (
           T(k, 0.2), T(k, 2.3), T(k, 3.3), T(k, 3.9), T(k, 3.5), T(k, 3.75), T(k, 4.0), T(k, 4.25), T(k, 4.5), T(k, 4.65), T(k, 6.5)))
    ev(k, 0.2, "whoosh")
    ev(k, 0.95, "whoosh")
    ev(k, 2.3, "thock")
    for x in (3.5, 3.75, 4.0, 4.25, 4.5):
        ev(k, x + 0.16, "step")
    for x in (3.5, 3.75, 4.0, 4.25, 4.5):
        ev(k, x + 0.2, "rise")
    ev(k, 6.45, "whoosh")

if "measure" in IDX:
    k = "measure"
    js('L("26", "broadcast court · measure", %s, %s);' % (T(k, 0.1), T(k, dur(k) - 0.1)))
    js('K.courtMeasure3d({ at: %s, label: "چند متر", labelAt: %s, lineAt: %s, sprintAt: %s, sprintDur: 1.3, value: "۸", unit: "متر", every: 2, out: %s });' % (
        T(k, 0.2), T(k, 2.3), T(k, 2.5), T(k, 3.3), T(k, 6.0)))
    ev(k, 0.2, "whoosh")
    ev(k, 0.95, "whoosh")
    ev(k, 2.3, "stamp")
    ev(k, 3.3, "whoosh")
    for m in (2, 4, 6):
        ev(k, 3.3 + 0.2 * m, "rise")
    ev(k, 4.6, "hit")
    ev(k, 5.95, "whoosh")

kit.build(W, "showreel2", SEGS, "\n".join(JS), sfx=EV, transcript=TR, audio=None)
