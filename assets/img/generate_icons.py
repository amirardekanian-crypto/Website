"""
Generate placeholder PNG icons + OG image from the AA monogram.
Run once; outputs: icon-192.png, icon-512.png, apple-touch-icon.png, og-image.png
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

HERE = Path(__file__).parent
BG = (10, 10, 10)
ACCENT = (212, 255, 0)
TEXT = (232, 232, 232)


def find_font(size, bold=True):
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "C:\\Windows\\Fonts\\arialbd.ttf",
    ]
    for p in candidates:
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def make_monogram(size: int, corner_radius_ratio: float = 0.19) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(size * corner_radius_ratio)
    # Rounded rect
    d.rounded_rectangle([(0, 0), (size - 1, size - 1)], radius=r, fill=BG)
    # Accent corner flag
    flag = int(size * 0.18)
    d.polygon([(0, 0), (flag, 0), (flag, flag // 2), (flag // 2, flag // 2),
               (flag // 2, flag), (0, flag)], fill=ACCENT)
    # AA text
    font_size = int(size * 0.55)
    font = find_font(font_size)
    text = "AA"
    # Centre the text
    bbox = d.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = (size - tw) / 2 - bbox[0]
    y = (size - th) / 2 - bbox[1] - size * 0.02
    d.text((x, y), text, fill=ACCENT, font=font)
    return img


def save(img: Image.Image, name: str):
    out = HERE / name
    img.save(out, "PNG", optimize=True)
    print(f"wrote {out}  ({img.size[0]}x{img.size[1]})")


def make_og(w: int = 1200, h: int = 630) -> Image.Image:
    # Base dark canvas
    img = Image.new("RGBA", (w, h), BG + (255,))

    # Very subtle grid — composited on a separate RGBA layer so alpha is respected
    grid = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grid)
    for x in range(0, w, 80):
        gd.line([(x, 0), (x, h)], fill=(212, 255, 0, 14), width=1)
    for y in range(0, h, 80):
        gd.line([(0, y), (w, y)], fill=(212, 255, 0, 14), width=1)
    img = Image.alpha_composite(img, grid)

    # Soft accent glow top-right
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ggd = ImageDraw.Draw(glow)
    for r in range(500, 0, -4):
        a = int(30 * (1 - r / 500))
        if a <= 0: continue
        ggd.ellipse([w - 200 - r, -200 - r, w - 200 + r, -200 + r], fill=(212, 255, 0, a))
    img = Image.alpha_composite(img, glow)

    d = ImageDraw.Draw(img)

    # Left monogram (paste with its own alpha)
    mono = make_monogram(140)
    img.paste(mono, (96, 96), mono)

    # Eyebrow
    eyebrow_font = find_font(22)
    d.text((96, 310), "TENNIS STRENGTH & CONDITIONING", fill=ACCENT, font=eyebrow_font)

    # Headline
    headline_font = find_font(80)
    d.text((96, 348), "Move Better.", fill=TEXT, font=headline_font)
    d.text((96, 430), "Hit Harder.", fill=TEXT, font=headline_font)
    d.text((96, 512), "Last Longer.", fill=ACCENT, font=headline_font)

    # Right vertical rule
    rule = ImageDraw.Draw(img)
    rule.rectangle([(w - 6, 0), (w, h)], fill=ACCENT)

    # URL/footer
    footer_font = find_font(16)
    d.text((w - 220, h - 40), "amirardekani.com", fill=(136, 136, 136), font=footer_font)

    return img.convert("RGB")


if __name__ == "__main__":
    save(make_monogram(192), "icon-192.png")
    save(make_monogram(512), "icon-512.png")
    # Apple touch icon prefers a rounded-square with no inner padding (iOS adds chrome)
    save(make_monogram(180, corner_radius_ratio=0.22), "apple-touch-icon.png")
    save(make_og(), "og-image.png")
    print("done")
