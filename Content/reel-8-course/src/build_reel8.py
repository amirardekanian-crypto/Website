"""Assemble Content/reel-8-course.html: the template with the four clips, the phone screens and the font embedded as base64.

    python Content/reel-8-course/src/build_reel8.py

Reads src/reel8.template.html and replaces its %%PLACEHOLDERS%%:
  FONT                            assets/fonts/Vazirmatn-Variable.woff2 (site font, so the reel needs no font network)
  CLIP_BURST/GYM/PIVOT/PLATE      assets/clip-*.mp4 (run src/prep_clips.py embeds first)
  SCR_A / SCR_B / SCR_C           the real demo screens in assets/screens/ (see tools/capture.config.json), re-encoded lossy
The output is one self-contained file that opens from anywhere.
"""
import base64
import io
import pathlib

from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent
PROJ = HERE.parent
ROOT = HERE.parents[2]
OUT_HTML = ROOT / "Content" / "reel-8-course.html"


def uri(data, mime):
    return "data:%s;base64," % mime + base64.b64encode(data).decode()


def file_uri(path, mime):
    return uri(pathlib.Path(path).read_bytes(), mime)


def webp_uri(img, q=80):
    buf = io.BytesIO()
    img.convert("RGB").save(buf, "WEBP", quality=q, method=5)
    return uri(buf.getvalue(), "image/webp")


screens = PROJ / "assets" / "screens"
subs = {
    "%%FONT%%": file_uri(ROOT / "assets/fonts/Vazirmatn-Variable.woff2", "font/woff2"),
    "%%CLIP_BURST%%": file_uri(PROJ / "assets/clip-burst.mp4", "video/mp4"),
    "%%CLIP_GYM%%": file_uri(PROJ / "assets/clip-gym.mp4", "video/mp4"),
    "%%CLIP_PIVOT%%": file_uri(PROJ / "assets/clip-pivot.mp4", "video/mp4"),
    "%%CLIP_PLATE%%": file_uri(PROJ / "assets/clip-plate.mp4", "video/mp4"),
    "%%SCR_A%%": webp_uri(Image.open(screens / "sessionA.webp")),
    "%%SCR_B%%": webp_uri(Image.open(screens / "test.webp")),
    "%%SCR_C%%": webp_uri(Image.open(screens / "lesson.webp")),
}
html = (HERE / "reel8.template.html").read_text(encoding="utf-8")
for k, v in subs.items():
    assert k in html, k
    html = html.replace(k, v)
assert "%%" not in html, "unreplaced placeholder"
OUT_HTML.write_text(html, encoding="utf-8")
print("wrote %s (%d KB)" % (OUT_HTML.name, len(html) // 1024))
