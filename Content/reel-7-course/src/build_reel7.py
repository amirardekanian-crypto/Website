"""Assemble Content/reel-7-course.html: the template with every picture and the font embedded as base64.

    python Content/reel-7-course/src/build_reel7.py

Reads src/reel7.template.html and replaces its %%PLACEHOLDERS%%:
  FONT                 assets/fonts/Vazirmatn-Variable.woff2 (site font, so the reel needs no font network)
  BG_DAY / BG_NIGHT    assets/bg-day.webp, bg-night.webp     (run src/prep_bg.py first)
  BALL                 assets/ball.webp                       (run src/prep_ball.py first)
  PIC1..PIC4           the four block pictures, /assets/tps/{first-light,morning-load,full-acceleration,under-lights}.webp
  SCR_A/B/C/D, TABS_D  the real demo screens in assets/screens/ (see tools/capture.config.json), re-encoded lossy
The output is one self-contained file (about 1.2 MB) that opens from anywhere.
"""
import base64
import io
import pathlib

from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent
PROJ = HERE.parent
ROOT = HERE.parents[2]
OUT_HTML = ROOT / "Content" / "reel-7-course.html"


def uri(data, mime):
    return "data:%s;base64," % mime + base64.b64encode(data).decode()


def file_uri(path, mime):
    return uri(pathlib.Path(path).read_bytes(), mime)


def webp_uri(img, q=80):
    buf = io.BytesIO()
    img.convert("RGB").save(buf, "WEBP", quality=q, method=5)
    return uri(buf.getvalue(), "image/webp")


screens = PROJ / "assets" / "screens"
lesson = Image.open(screens / "lesson.webp")
subs = {
    "%%FONT%%": file_uri(ROOT / "assets/fonts/Vazirmatn-Variable.woff2", "font/woff2"),
    "%%BG_DAY%%": file_uri(PROJ / "assets/bg-day.webp", "image/webp"),
    "%%BG_NIGHT%%": file_uri(PROJ / "assets/bg-night.webp", "image/webp"),
    "%%BALL%%": file_uri(PROJ / "assets/ball.webp", "image/webp"),
    "%%PIC1%%": file_uri(ROOT / "assets/tps/first-light.webp", "image/webp"),
    "%%PIC2%%": file_uri(ROOT / "assets/tps/morning-load.webp", "image/webp"),
    "%%PIC3%%": file_uri(ROOT / "assets/tps/full-acceleration.webp", "image/webp"),
    "%%PIC4%%": file_uri(ROOT / "assets/tps/under-lights.webp", "image/webp"),
    "%%SCR_A%%": webp_uri(Image.open(screens / "sessionA.webp")),
    "%%SCR_B%%": webp_uri(Image.open(screens / "step1.webp")),
    "%%SCR_C%%": webp_uri(Image.open(screens / "test.webp")),
    "%%SCR_D%%": webp_uri(Image.open(screens / "lesson-tall.webp")),
    "%%TABS_D%%": webp_uri(lesson.crop((0, lesson.height - 140, lesson.width, lesson.height)), 88),
}
html = (HERE / "reel7.template.html").read_text(encoding="utf-8")
for k, v in subs.items():
    assert k in html, k
    html = html.replace(k, v)
assert "%%" not in html, "unreplaced placeholder"
OUT_HTML.write_text(html, encoding="utf-8")
print("wrote %s (%d KB)" % (OUT_HTML.name, len(html) // 1024))
