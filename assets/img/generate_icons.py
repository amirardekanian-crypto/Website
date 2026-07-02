"""
Generate AA Performance app icons, favicons + social-share (OG) image from the
brand logo (green/clay on cream).

Sources (committed):  assets/img/source/aa-mark.png  (monogram only, for icons)
                      assets/img/source/aa-logo.png  (full lockup, for OG)
Run:  python assets/img/generate_icons.py
Outputs: icon-192.png, icon-512.png, apple-touch-icon.png, favicon-32.png,
         favicon.svg, ../../favicon.ico, og-image.jpg
"""
import base64
from io import BytesIO
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageChops

HERE = Path(__file__).parent
ROOT = HERE.parent.parent
SRC = HERE / "source"

GREEN = (14, 74, 54)      # #0E4A36
CLAY = (199, 85, 47)      # #C7552F
CREAM = (250, 247, 242)   # #FAF7F2
MUTE = (122, 122, 122)


def find_font(size, weight="bold"):
    bold = ["C:\\Windows\\Fonts\\arialbd.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf"]
    black = ["C:\\Windows\\Fonts\\ariblk.ttf",
             "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
             "/System/Library/Fonts/Supplemental/Arial Black.ttf"]
    for p in (black if weight == "black" else bold):
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def draw_tracked(d, pos, text, font, fill, tracking=0):
    x, y = pos
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill)
        x += d.textlength(ch, font=font) + tracking
    return x


def load_trimmed(name):
    """Load a source PNG and crop away its flat cream border. Returns (img, bg)."""
    im = Image.open(SRC / name).convert("RGB")
    bg = im.getpixel((4, 4))                       # sampled background colour
    diff = ImageChops.difference(im, Image.new("RGB", im.size, bg))
    mask = diff.convert("L").point(lambda p: 255 if p > 22 else 0)
    bbox = mask.getbbox()
    return (im.crop(bbox) if bbox else im), bg


def icon(size, content_ratio=0.78):
    """Square icon: trimmed mark centred on a cream field (maskable-safe)."""
    mark, bg = load_trimmed("aa-mark.png")
    canvas = Image.new("RGB", (size, size), bg)
    target = int(size * content_ratio)
    scale = target / max(mark.size)
    mw, mh = int(mark.size[0] * scale), int(mark.size[1] * scale)
    m = mark.resize((mw, mh), Image.LANCZOS)
    canvas.paste(m, ((size - mw) // 2, (size - mh) // 2))
    return canvas


def save(img, name, root=False):
    out = (ROOT if root else HERE) / name
    img.save(out, "PNG", optimize=True)
    print(f"wrote {out.relative_to(ROOT)}  ({img.size[0]}x{img.size[1]})")


def make_favicon_svg():
    """SVG favicon = a crisp 128px raster of the icon embedded as base64."""
    buf = BytesIO()
    icon(128, content_ratio=0.84).save(buf, "PNG", optimize=True)
    b64 = base64.b64encode(buf.getvalue()).decode()
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" '
           'role="img" aria-label="AA Performance">'
           f'<image width="64" height="64" href="data:image/png;base64,{b64}"/></svg>\n')
    (HERE / "favicon.svg").write_text(svg, encoding="utf-8")
    print("wrote assets/img/favicon.svg")


def make_og(w=1200, h=630):
    """OG share image = the designed brand banner, fitted to the 1200x630 OG box.
    Source AR (~1.90) matches OG (1.905), so this is a clean resize with a
    centre-crop safety net if the source ratio ever drifts."""
    im = Image.open(SRC / "og-source.png").convert("RGB")
    sw, sh = im.size
    scale = max(w / sw, h / sh)               # cover
    rw, rh = round(sw * scale), round(sh * scale)
    im = im.resize((rw, rh), Image.LANCZOS)
    left, top = (rw - w) // 2, (rh - h) // 2
    return im.crop((left, top, left + w, top + h))


if __name__ == "__main__":
    save(icon(192), "icon-192.png")
    save(icon(512), "icon-512.png")
    save(icon(180, content_ratio=0.82), "apple-touch-icon.png")
    save(icon(32, content_ratio=0.88), "favicon-32.png")
    make_favicon_svg()
    # favicon.ico — multi-resolution from the 64px render
    icon(64, content_ratio=0.88).save(ROOT / "favicon.ico",
                                      sizes=[(16, 16), (32, 32), (48, 48)])
    print("wrote favicon.ico")
    # OG ships as JPEG: the banner's grain/gradients bloat PNG past the
    # <100 KB share-image budget (548 KB); q85 progressive lands ~52 KB.
    make_og().save(HERE / "og-image.jpg", "JPEG",
                   quality=85, optimize=True, progressive=True)
    print("wrote assets/img/og-image.jpg  (1200x630)")
    print("done")
