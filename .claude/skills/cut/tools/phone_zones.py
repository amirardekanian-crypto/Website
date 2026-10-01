"""The parts of a reel that Instagram's own interface covers on Amir's phone, drawn over a frame.

Measured 2026-10-01 from his screenshot of the safe-zone test card (an iPhone, 19.5:9 screen, a reel opened from his profile): the card was aligned to the screenshot (correlation 0.97)
and every pixel the interface changed was listed in card coordinates (RESEARCH-2026-10-01.md section 14.9). In card pixels (1080 x 1920):
  top       the status bar, the back arrow and the camera button: y 0-195 (nothing is covered from y 200 to y 1165 anywhere across the width)
  rail      the like, comment, repost and share buttons, the menu and the audio thumbnail: x 919-992, y 1169-1766 (drawn a little wider: x 915-1080, y 1165-1775)
  bottom    the profile picture, the name and the caption: everything below y 1587 (the buttons run on beside it); below y 1840 an owner-only bar
  sides     this screen is taller than 9:16, so the picture is scaled to fill it and 54 px are cropped off EACH side
One phone, one view: a 16:9 phone crops less and shows the buttons further right, a viewer in the Reels tab has the navigation bar at the bottom. These are the worst-case-left numbers.

  from phone_zones import overlay;  im = overlay(im)     # any PIL image with 9:16 proportions
  python phone_zones.py frame.png out.png                 # one file
"""
import sys

from PIL import Image, ImageDraw

W, H = 1080, 1920
CROP = 54
ZONES = [
    ("top", (0, 0, W, 195), (255, 0, 255), 70),
    ("rail", (915, 1165, W, 1775), (255, 0, 255), 70),
    ("profile and caption", (0, 1587, W, H), (255, 0, 255), 70),
]


def overlay(im):
    w, h = im.size
    sx, sy = w / float(W), h / float(H)
    ov = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    for _, (x0, y0, x1, y1), col, alpha in ZONES:
        d.rectangle([x0 * sx, y0 * sy, x1 * sx - 1, y1 * sy - 1], fill=col + (alpha,), outline=col + (210,))
    d.rectangle([0, 0, CROP * sx, h], fill=(0, 0, 0, 150))
    d.rectangle([(W - CROP) * sx, 0, w, h], fill=(0, 0, 0, 150))
    return Image.alpha_composite(im.convert("RGBA"), ov).convert("RGB")


if __name__ == "__main__":
    overlay(Image.open(sys.argv[1])).save(sys.argv[2])
    print("wrote", sys.argv[2])
