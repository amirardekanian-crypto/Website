"""Cut the rally ball out of assets/img/tennis-ball-clay.png as a clean circle (no baked-in glow).

    python Content/reel-7-course/src/prep_ball.py   ->   assets/ball.webp (360x360, alpha)

The master is a ball on a dark brown gradient with a glow baked in ("don't use it raw"). The ball sits at
(512, 496) in the 1024 px picture; the circle is cut 20 px inside its rim so no halo comes with it. The reel
draws its own glow (box-shadow) and shading, and rotates the circle so the seams turn.
"""
import pathlib

from PIL import Image, ImageDraw, ImageFilter

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[2]
OUT = HERE.parent / "assets"
OUT.mkdir(exist_ok=True)

im = Image.open(ROOT / "assets/img/tennis-ball-clay.png").convert("RGB")
cx, cy, rr = 512, 496, 294
crop = im.crop((cx - rr, cy - rr, cx + rr, cy + rr)).resize((360, 360), Image.LANCZOS)
m = Image.new("L", (1440, 1440), 0)
ImageDraw.Draw(m).ellipse((4, 4, 1436, 1436), fill=255)
crop.putalpha(m.resize((360, 360), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.8)))
crop.save(OUT / "ball.webp", "WEBP", quality=88, method=6)
print("wrote", OUT / "ball.webp", (OUT / "ball.webp").stat().st_size // 1024, "KB")
