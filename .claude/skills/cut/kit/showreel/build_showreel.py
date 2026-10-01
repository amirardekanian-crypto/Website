"""The kit showreel: every block, in its variants, on Amir's footage (HCTV3230). It doubles as the kit's regression test:
rebuild and render it after any change to kit.js / kit.css, and look at the contact sheet.

  python build_showreel.py            (writes C:\\Users\\Amir\\Videos\\Reels\\kit-showreel\\public\\index.html)
Silent on purpose (his voice would say something else): only the kit's sound effects play.
"""
import os
import shutil
import sys

sys.path.insert(0, r"C:\Users\Amir\.claude\skills\cut\kit")
import kit  # noqa: E402

W = r"C:\Users\Amir\Videos\Reels\kit-showreel"
PUB = os.path.join(W, "public")
V1 = r"C:\Users\Amir\Videos\Reels\hctv3230\v1\public"
TR = r"C:\Users\Amir\Videos\Reels\hctv3230\transcript.json"

os.makedirs(PUB, exist_ok=True)
kit.scaffold(PUB)
for f in ("input-video.mp4", "reveal_cut.webm"):  # his footage and the cut-out of the 3 s reveal (source 44.6-47.6 s)
    if not os.path.exists(os.path.join(PUB, f)):
        shutil.copy2(os.path.join(V1, f), os.path.join(PUB, f))

# No cuts: the edited clock equals the source clock. Zoom changes between slots show the cut-in options.
SEGS = [
    {"in": 0.0, "out": 10.5, "rate": 1.0, "zoom": 1.0, "drift": 0.04},
    {"in": 10.5, "out": 21.8, "rate": 1.0, "zoom": 1.16, "punch": True},
    {"in": 21.8, "out": 35.4, "rate": 1.0, "zoom": 1.0},
    {"in": 35.4, "out": 44.6, "rate": 1.0, "zoom": 1.0, "drift": 0.05},
    {"in": 44.6, "out": 47.6, "rate": 1.0, "zoom": 1.0, "inner_html": kit.behind_video("reveal_cut.webm", 0.0)},  # index 4
    {"in": 47.6, "out": 56.0, "rate": 1.0, "zoom": 1.15, "punch": True},
    {"in": 56.0, "out": 66.6, "rate": 1.0, "zoom": 1.0},
    {"in": 66.6, "out": 75.6, "rate": 1.0, "zoom": 1.12, "drift": 0.05},
]

BLOCKS = """
const L = (n, name, t0, t1) => K.label(n + "  " + name, t0, t1);

/* stamps: one tag per spoken word, four entrances */
L("01", "stamps · pop", 0.2, 2.8);
K.stamps(["فقط", "یه", "تمرین"], { at: [0.5, 0.72, 0.94], variant: "pop", out: 2.7 });
L("02", "stamps · slide", 2.9, 5.3);
K.stamps(["قدم", "اول", "مهمه"], { at: [3.1, 3.35, 3.6], variant: "slide", out: 5.2 });
L("03", "stamps · drop", 5.4, 7.9);
K.stamps(["سرعت", "یا", "قدرت"], { at: [5.6, 5.9, 6.2], variant: "drop", out: 7.8 });
L("04", "stamps · mask, ink tone, small", 8.0, 10.4);
K.stamps(["یه", "مربی", "تو", "جیبت"], { at: [8.2, 8.45, 8.7, 8.95], variant: "mask", tone: "ink", size: "sm", out: 10.3 });

/* chips: a list of options, one per spoken word */
L("05", "chips · grid", 10.8, 14.0);
K.chips(["پرش", "اسکات سنگین", "باکس جامپ", "حرکت با کش"], { at: [11.0, 11.5, 12.0, 12.5], layout: "grid2", out: 13.9 });
L("06", "chips · stack, slide in", 14.1, 17.4);
K.chips(["قدرت", "سرعت", "هماهنگی"], { at: [14.3, 14.8, 15.3], layout: "stack", variant: "slide", y: 1180, out: 17.3 });

/* ghost numeral on the wall, and a side tag with a ring burst */
L("07", "ghost numeral + tag with ring", 17.7, 21.5);
K.ghost("۱", { at: 17.9, out: 21.3 });
K.tag("تک‌پا", { at: 18.8, out: 21.3 });

/* question cards: three looks, three wipes */
L("08", "question card · ink, clay-line wipe", 21.9, 26.0);
K.question(["از یه تمرین", { t: "انفجاری", em: true }, "چی می‌خواید؟"], { at: 22.0, lineAt: [22.5, 23.2, 23.9], out: 25.9, look: "ink", wipeVariant: "clay" });
L("09", "question card · clay, iris wipe", 26.4, 30.5);
K.question(["همه‌ی این ویژگی‌ها", { t: "با هم", em: true }, "کدوم تمرین؟"], { at: 26.5, lineAt: [27.0, 27.7, 28.4], out: 30.3, look: "clay", wipeVariant: "iris" });
L("10", "question card · court, push wipe", 30.8, 35.0);
K.question(["چند ثانیه", { t: "چند قدم", em: true }, "وقت داریم"], { at: 30.9, lineAt: [31.4, 32.1, 32.8], out: 34.8, look: "court", court: "green", wipeVariant: "push" });

/* checklist: rows arrive as he names them, pulse, then get ticked */
L("11", "checklist · paper", 35.5, 43.9);
K.checklist(["نیروی زیاد · زمان کوتاه", "سرعت بالا · تماس کوتاه", "هماهنگی عصبی‌عضلانی"],
  { at: [35.7, 36.7, 37.7], pulses: [38.6, 38.9, 39.2], ticks: [40.4, 41.7, 43.0], out: 43.8 });

/* flash + the word behind him (needs the cut-out video in segment 4) */
L("12", "flash + word behind him", 44.0, 47.7);
K.flash(44.95);
K.behind(4, [{ text: "اسپرینت" }, { text: "استارت", tone: "paper" }], { at: [44.94, 46.1], out: [46.02, 47.05] });

L("13", "checklist · dark", 48.0, 55.9);
K.checklist(["قدرت", "سرعت", "هماهنگی"], { style: "dark", at: [48.2, 49.2, 50.2], ticks: [51.8, 53.1, 54.4], out: 55.6 });

/* court cutaways */
L("14", "court cutaway · steps", 56.1, 61.2);
K.courtSteps({ at: 56.2, hit: 56.9, line1: "چند ثانیه", line1At: 57.6, line2: "چند قدم", line2At: 58.5,
  steps: [58.6, 58.85, 59.1, 59.35, 59.6], arrive: 59.7, out: 60.9 });
L("15", "court cutaway · measure", 61.5, 66.4);
K.courtMeasure({ at: 61.6, label: "چند متر", labelAt: 62.3, sprintAt: 63.1, out: 65.4, image: "green" });

/* call to action */
L("16", "call to action · stamp", 67.0, 70.9);
K.cta("شتاب", { at: 67.3, sub: "کامنت کنید", variant: "stamp", pulse: 68.7, out: 70.7 });
L("17", "call to action · bubble", 71.1, 75.4);
K.cta("شتاب", { at: 71.4, sub: "کامنت کنید", variant: "bubble", pulse: 72.8, out: 75.2 });
"""

EVENTS = [
    (0.5, "pop"), (0.72, "pop"), (0.94, "pop"), (3.1, "whoosh"), (5.75, "stamp"), (8.2, "pop"), (8.45, "pop"), (8.7, "pop"), (8.95, "pop"),
    (10.97, "pop"), (11.47, "pop"), (11.97, "pop"), (12.47, "pop"), (14.27, "pop"), (14.77, "pop"), (15.27, "pop"),
    (17.9, "whoosh"), (18.8, "stamp"),
    (21.9, "whoosh"), (23.2, "stamp"), (25.85, "whoosh"), (26.4, "whoosh"), (28.1, "stamp"), (30.15, "whoosh"), (30.8, "whoosh"),
    (32.1, "stamp"), (34.7, "whoosh"),
    (35.7, "pop"), (36.7, "pop"), (37.7, "pop"), (40.4, "ding"), (41.7, "ding"), (43.0, "ding"),
    (44.82, "whoosh"), (44.88, "hit"),
    (48.2, "pop"), (49.2, "pop"), (50.2, "pop"), (51.8, "ding"), (53.1, "ding"), (54.4, "ding"),
    (56.1, "whoosh"), (56.9, "thock"), (60.8, "whoosh"), (61.5, "whoosh"), (65.3, "whoosh"),
    (67.3, "stamp"), (71.4, "stamp"),
]

kit.build(W, "showreel", SEGS, BLOCKS, sfx=EVENTS, transcript=TR, audio=None)
