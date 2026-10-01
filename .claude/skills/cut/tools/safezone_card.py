"""Make the safe-zone test card: a 1080x1920, 10 s, 30 fps MP4 for Amir's own phone. Nothing is published.

  python safezone_card.py [--out C:\\Users\\Amir\\Videos\\Reels\\_tests]

RESULT 2026-10-01: he sent the screenshot (it had been posted, which shows "View insights"); tools/phone_measure.py measured it, see RESEARCH-2026-10-01.md section 14.9.
He opens it in Instagram's reel editor (New reel, pick this video, do NOT post), looks at which numbers the interface covers (the caption and name at the
bottom left, the buttons down the right edge, the top bar), takes a screenshot of the editor, and sends it. The numbers that stay visible are safe.
Rulers every 100 px are printed in four columns, so what hides a label shows where the covered zone is. Clay lines mark Meta's own figures for reels
ADS (14% top = y 269, 35% bottom = free box ends at y 1248, 6% sides = x 65 and 1015), a white dashed line marks our old rule (y 1600), the shaded band is
his own caption band (y 230-470) and the dashed lines at y 240 and 1680 are where the 3:4 profile-grid thumbnail crops the picture.
"""
import argparse
import os
import subprocess

from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920
CLAY = (199, 85, 47)
PAPER = (250, 247, 242)


def font(size, bold=True):
    for f in (r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf", r"C:\Windows\Fonts\segoeuib.ttf"):
        if os.path.exists(f):
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()


def dashed(d, y, color, width=4, dash=28, gap=18):
    x = 0
    while x < W:
        d.line([(x, y), (min(x + dash, W), y)], fill=color, width=width)
        x += dash + gap


def card():
    im = Image.new("RGB", (W, H), (46, 46, 50))
    d = ImageDraw.Draw(im, "RGBA")
    d.rectangle([0, 230, W, 470], fill=CLAY + (70,))  # his caption band
    for y in range(0, H + 1, 50):  # rulers
        d.line([(0, y), (W, y)], fill=(255, 255, 255, 38 if y % 100 else 90), width=1 if y % 100 else 2)
    f = font(40)
    for y in range(100, H - 40, 100):
        for x in (46, 300, 560, 800):
            d.text((x, y - 24), "%d" % y, font=f, fill=PAPER + (235,))
    for y in (269, 1248):  # Meta's figures for reels ads
        d.line([(0, y), (W, y)], fill=CLAY, width=6)
    for x in (65, 1015):
        d.line([(x, 0), (x, H)], fill=CLAY, width=6)
    dashed(d, 1600, PAPER, 5)  # our old rule
    dashed(d, 240, (120, 200, 255), 3)  # where the 3:4 profile grid crops
    dashed(d, 1680, (120, 200, 255), 3)
    # the legend sits in the middle, where nothing is covered anyway; the left and right number columns stay visible beside it
    d.rectangle([140, 700, 770, 1050], fill=(30, 30, 34, 250))
    d.text((455, 760), "SAFE ZONE TEST", font=font(64), fill=PAPER, anchor="mm")
    for i, line in enumerate(("Reels editor, do NOT post, screenshot", "clay lines = Meta's ad limits", "y 269 and y 1248, x 65 and 1015",
                              "white dashed = our old rule y 1600", "blue dashed = grid crop y 240, 1680", "shaded band = his captions y 230-470")):
        d.text((455, 835 + i * 40), line, font=font(30), fill=PAPER if i else CLAY, anchor="mm")
    return im


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", default=r"C:\Users\Amir\Videos\Reels\_tests")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    png = os.path.join(a.out, "safezone-test-card.png")
    mp4 = os.path.join(a.out, "safezone-test-card.mp4")
    card().save(png)
    r = subprocess.run(["ffmpeg", "-y", "-v", "error", "-loop", "1", "-framerate", "30", "-i", png, "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
                        "-t", "10", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", "-r", "30", "-c:a", "aac", "-b:a", "128k",
                        "-movflags", "+faststart", "-shortest", mp4], capture_output=True, text=True)
    if r.returncode:
        raise SystemExit(r.stderr[-500:])
    print("wrote", png)
    print("wrote", mp4, "(%.0f KB)" % (os.path.getsize(mp4) / 1024))


if __name__ == "__main__":
    main()
