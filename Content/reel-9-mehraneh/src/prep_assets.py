"""Prepare the video's picture assets from the two sources.

  1. The live-site captures (tools/capture_site.js) -> assets/site/*.webp  (phone strips + nav + bar)
  2. Her photos (the mehraneh-site repo's media/) -> assets/photos/*.jpg  (crops, graded lightly)

usage: python prep_assets.py <captures_dir> <mehraneh_site_media_dir>
Run from anywhere; paths are absolute.
"""
import sys, os, json
from PIL import Image, ImageFilter, ImageEnhance

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, '..', 'assets')
cap_dir, media_dir = sys.argv[1], sys.argv[2]

os.makedirs(os.path.join(ASSETS, 'site'), exist_ok=True)
os.makedirs(os.path.join(ASSETS, 'photos'), exist_ok=True)

# ---- 1. site captures --------------------------------------------------------------------------------------------
for sport in ('tennis', 'padel'):
    for kind in ('tile0', 'tile1', 'tile2', 'nav-stuck', 'bar'):
        src = os.path.join(cap_dir, f'{sport}-{kind}.png')
        im = Image.open(src).convert('RGB')
        dst = os.path.join(ASSETS, 'site', f'{sport}-{kind}.webp')
        im.save(dst, 'WEBP', quality=90, method=6)
        print(dst, im.size, os.path.getsize(dst) // 1024, 'KB')
meta = json.load(open(os.path.join(cap_dir, 'meta.json'), encoding='utf-8'))
json.dump(meta, open(os.path.join(ASSETS, 'site', 'meta.json'), 'w', encoding='utf-8'), indent=1)


# ---- 2. photos ---------------------------------------------------------------------------------------------------
def crop_save(name, box, out, size=None, sharpen=True, q=92):
    im = Image.open(os.path.join(media_dir, name)).convert('RGB')
    c = im.crop(box)
    if size:
        c = c.resize(size, Image.LANCZOS)
    if sharpen:
        c = c.filter(ImageFilter.UnsharpMask(radius=1.4, percent=60, threshold=2))
    dst = os.path.join(ASSETS, 'photos', out)
    c.save(dst, 'JPEG', quality=q, optimize=True, progressive=True)
    print(dst, c.size, os.path.getsize(dst) // 1024, 'KB')

# runner-up trophy: portrait crop on her face and the plaque (4:5), upscaled ~1.4x for the card
crop_save('runnerup-tour.jpg', (400, 270, 939, 944), 'runnerup-card.jpg', size=(780, 975))
# the serve (kept whole; vertical)
crop_save('serve.jpg', (0, 0, 719, 959), 'serve.jpg')
# the covered clay court (video poster frame): a vertical card
crop_save('court-poster.jpg', (0, 0, 464, 848), 'court-poster.jpg', sharpen=False)
