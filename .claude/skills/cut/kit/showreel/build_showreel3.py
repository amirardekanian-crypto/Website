"""Kit showreel 3: the statement cards and the new wipes, on Amir's footage (HCTV3230). Numbers 27-38 continue showreels 1 and 2.
It doubles as the regression test for those blocks: rebuild and render it after any change to kit.js / kit.css, and look at the sheet.

  python build_showreel3.py            all demos
  python build_showreel3.py cards      only 27-33
  python build_showreel3.py wipes      only 34-38
Silent on purpose (his voice would say something else): only the kit's sound effects play. The words and numbers are demo
placeholders, not claims. Idea generation: he is not editing this video.

Uses the whole-clip cut-out from showreel 2 for 29 (the number behind him): tools/cutout.py, then full_cut_t.webm.
"""
import os
import shutil
import sys

sys.path.insert(0, r"C:\Users\Amir\.claude\skills\cut\kit")
import kit  # noqa: E402

W = r"C:\Users\Amir\Videos\Reels\kit-showreel3"
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

# (key, source in, source out, extra plan fields, group)
DEMOS = [
    ("num_clay", 2.0, 8.0, {}, "cards"),
    ("num_paper", 9.0, 15.0, {}, "cards"),
    ("num_behind", 16.0, 23.0, {"depth": True}, "cards"),
    ("versus", 24.0, 31.0, {}, "cards"),
    ("versus_win", 32.0, 40.0, {}, "cards"),
    ("drum", 41.0, 50.0, {}, "cards"),
    ("quote", 51.0, 60.0, {}, "cards"),
    ("wipes", 61.0, 71.0, {}, "wipes"),
    ("cut_a", 72.0, 75.0, {}, "wipes"),
    ("cut_b", 77.0, 80.0, {}, "wipes"),
    ("cut_c", 81.5, 84.5, {}, "wipes"),
]
if which in ("cards", "wipes"):
    DEMOS = [d for d in DEMOS if d[4] == which]

SEGS, START, IDX = [], {}, {}
t = 0.0
for i, (key, a, b, extra, _g) in enumerate(DEMOS):
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

if "num_clay" in IDX:
    k = "num_clay"
    js('L("27", "number slam · clay, an odometer lands", %s, %s);' % (T(k, 0.1), T(k, dur(k) - 0.1)))
    js('K.number("۳", { at: %s, landAt: %s, roll: 1.25, unit: "ثانیه", unitAt: %s, pre: "فقط", preAt: %s, out: %s, look: "clay" });' % (
        T(k, 0.3), T(k, 2.3), T(k, 2.5), T(k, 0.9), T(k, 5.1)))
    ev(k, 0.3, "whoosh")
    ev(k, 2.3 - 0.98, "roll")
    ev(k, 2.3, "hit")
    ev(k, 2.5, "stamp")
    ev(k, 5.1, "whoosh")

if "num_paper" in IDX:
    k = "num_paper"
    js('L("28", "number slam · paper, a decimal, push wipe", %s, %s);' % (T(k, 0.1), T(k, dur(k) - 0.1)))
    js('K.number("۴٫۵", { at: %s, landAt: %s, roll: 1.4, unit: "ثانیه", unitAt: %s, out: %s, look: "paper", wipeVariant: "push" });' % (
        T(k, 0.3), T(k, 2.6), T(k, 2.8), T(k, 5.1)))
    ev(k, 0.3, "whoosh")
    ev(k, 2.6 - 0.98, "roll")
    ev(k, 2.6, "hit")
    ev(k, 2.8, "stamp")
    ev(k, 5.1, "whoosh")

if "num_behind" in IDX:
    k, i = "num_behind", IDX["num_behind"]
    js('L("29", "number behind him · dark studio, he sinks", %s, %s);' % (T(k, 0.1), T(k, dur(k) - 0.1)))
    js('K.backdrop(%d, { at: %s, out: %s, tone: "ink", variant: "iris", rim: "224,107,67" });' % (i, T(k, 0.3), T(k, 6.3)))
    js('K.slamBehind(%d, "۳", { at: %s, landAt: %s, out: %s, size: 560, top: 500, dim: 0 });' % (i, T(k, 1.2), T(k, 2.7), T(k, 5.8)))
    js('K.tag("ثانیه", { at: %s, x: 640, y: 1330, out: %s });' % (T(k, 2.9), T(k, 5.8)))
    ev(k, 0.3, "whoosh")
    ev(k, 2.7 - 0.98, "roll")
    ev(k, 2.7, "hit")
    ev(k, 2.9, "stamp")
    ev(k, 6.3, "whoosh")

if "versus" in IDX:
    k = "versus"
    js('L("30", "versus · the split", %s, %s);' % (T(k, 0.1), T(k, dur(k) - 0.1)))
    js('K.versus("قدرت", "سرعت", { at: %s, vs: "در برابر", vsAt: %s, out: %s });' % (T(k, 0.3), T(k, 2.2), T(k, 6.1)))
    ev(k, 0.3, "whoosh")
    ev(k, 0.7, "whoosh")
    ev(k, 2.2, "stamp")
    ev(k, 6.1, "whoosh")

if "versus_win" in IDX:
    k = "versus_win"
    js('L("31", "versus · wrong against right, the seam moves, a verdict", %s, %s);' % (T(k, 0.1), T(k, dur(k) - 0.1)))
    js('K.versus("کار اشتباه", "کار درست", { at: %s, vs: "یا", vsAt: %s, win: "b", winAt: %s, colors: ["ink2", "clay"], out: %s });' % (
        T(k, 0.3), T(k, 2.1), T(k, 3.9), T(k, 7.1)))
    ev(k, 0.3, "whoosh")
    ev(k, 0.7, "whoosh")
    ev(k, 2.1, "stamp")
    ev(k, 3.9, "thock")
    ev(k, 4.4, "ding")
    ev(k, 7.1, "whoosh")

if "drum" in IDX:
    k = "drum"
    js('L("32", "list · a drum turns, then unrolls", %s, %s);' % (T(k, 0.1), T(k, dur(k) - 0.1)))
    js('K.list(["نیروی زیاد · زمان کوتاه", "سرعت بالا · تماس کوتاه", "هماهنگی عصبی‌عضلانی"], { at: %s, itemAt: [%s, %s, %s], flatAt: %s, out: %s });' % (
        T(k, 0.3), T(k, 1.6), T(k, 3.2), T(k, 4.8), T(k, 6.2), T(k, 8.2)))
    ev(k, 0.3, "whoosh")
    for x in (1.6, 3.2, 4.8):
        ev(k, x, "tick")
        ev(k, x + 0.2, "thock")
    ev(k, 6.2, "whoosh")
    ev(k, 8.2, "whoosh")

if "quote" in IDX:
    k = "quote"
    js('L("33", "quote · a page, a highlighter, a zoom onto the line", %s, %s);' % (T(k, 0.1), T(k, dur(k) - 0.1)))
    js('K.quote(["از یه تمرین انفجاری", "چی می‌خواید؟", { t: "نیروی زیاد · زمان کوتاه", hl: true }, "سرعت بالا · تماس کوتاه"],'
       ' { at: %s, lineAt: [%s, %s, %s, %s], hlAt: %s, zoomAt: %s, out: %s });' % (
           T(k, 0.3), T(k, 1.6), T(k, 2.2), T(k, 2.8), T(k, 3.4), T(k, 4.4), T(k, 5.8), T(k, 8.1)))
    ev(k, 0.3, "whoosh")
    ev(k, 0.55, "thock")
    for x in (1.6, 2.2, 2.8, 3.4):
        ev(k, x, "tick")
    ev(k, 4.4, "swipe")
    ev(k, 5.8, "whoosh")
    ev(k, 8.1, "whoosh")

if "wipes" in IDX:
    k = "wipes"
    js('L("34", "wipe · slice (six bars)", %s, %s);' % (T(k, 0.05), T(k, 3.3)))
    js('K.question(["شتاب", { t: "بیشتر", em: true }], { at: %s, lineAt: [%s, %s], out: %s, look: "clay", wipeVariant: "slice", tops: [600, 820] });' % (
        T(k, 0.2), T(k, 0.9), T(k, 1.4), T(k, 2.8)))
    js('L("35", "wipe · whip (a fast slide with blur)", %s, %s);' % (T(k, 3.35), T(k, 6.6)))
    js('K.question(["شتاب", { t: "بیشتر", em: true }], { at: %s, lineAt: [%s, %s], out: %s, look: "ink", wipeVariant: "whip", tops: [600, 820] });' % (
        T(k, 3.5), T(k, 4.2), T(k, 4.7), T(k, 6.1)))
    js('L("36", "wipe · zoom (a circle opens, the card rushes in)", %s, %s);' % (T(k, 6.65), T(k, 9.9)))
    js('K.question(["شتاب", { t: "بیشتر", em: true }], { at: %s, lineAt: [%s, %s], out: %s, look: "court", court: "green", wipeVariant: "zoom", tops: [600, 820] });' % (
        T(k, 6.8), T(k, 7.5), T(k, 8.0), T(k, 9.4)))
    for x, y in ((0.2, 2.8), (3.5, 6.1), (6.8, 9.4)):
        ev(k, x, "whoosh")
        ev(k, y, "whoosh")
    for x in (1.4, 4.7, 8.0):
        ev(k, x, "stamp")

if "cut_a" in IDX:
    js('L("37", "cut · whip (blur and slide hide the jump)", %s, %s);' % (T("cut_a", 0.1), T("cut_b", 2.9)))
    js('K.whip(%s, { out: %d, in: %d, style: "whip" });' % (T("cut_b", 0), IDX["cut_a"], IDX["cut_b"]))
    js('L("38", "cut · zoom (a push through the cut)", %s, %s);' % (T("cut_c", 0.1) - 0.0, T("cut_c", 2.9)))
    js('K.whip(%s, { out: %d, in: %d, style: "zoom" });' % (T("cut_c", 0), IDX["cut_b"], IDX["cut_c"]))
    ev("cut_b", -0.05, "whoosh")
    ev("cut_c", -0.05, "whoosh")

kit.build(W, "showreel3", SEGS, "\n".join(JS), sfx=EV, transcript=TR, audio=None)
