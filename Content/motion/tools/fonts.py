#!/usr/bin/env python3
"""fonts.py — fetches the brand fonts the Motion kit's samples are drawn in, into Content/motion/fonts/.

    python3 Content/motion/tools/fonts.py

Barlow Condensed (display and numerals), Barlow (app text) and Space Mono (labels) are the brand's Latin fonts
(Content/DESIGN-ATLAS.md). They come from Google Fonts as the Latin subset only, so each file is small. Farsi is
Vazirmatn, which is already in the repo at assets/fonts/Vazirmatn-Variable.woff2 and is not copied.
All three families are SIL Open Font License 1.1.
"""
import re, sys, urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'fonts'
UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
WANT = [('Barlow Condensed', [500, 600, 700, 800, 900]), ('Barlow', [400, 500, 600, 700]), ('Space Mono', [400, 700])]


def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=30).read()


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for fam, weights in WANT:
        q = 'family=' + fam.replace(' ', '+') + ':wght@' + ';'.join(str(w) for w in weights)
        css = get('https://fonts.googleapis.com/css2?' + q + '&display=swap').decode()
        blocks = re.findall(r'/\* (\S+) \*/\s*@font-face \{(.*?)\}', css, re.S)
        for name, body in blocks:
            if name != 'latin':
                continue
            w = re.search(r'font-weight:\s*(\d+)', body).group(1)
            u = re.search(r'url\((https://[^)]+\.woff2)\)', body).group(1)
            f = OUT / (fam.replace(' ', '') + '-' + w + '.woff2')
            f.write_bytes(get(u))
            print(f'{f.name:28} {f.stat().st_size:>7} bytes')
    (OUT / 'LICENSES.txt').write_text(
        'Barlow Condensed, Barlow and Space Mono, Latin subsets from Google Fonts. SIL Open Font License 1.1\n'
        '(https://openfontlicense.org). Barlow: Copyright 2017 The Barlow Project Authors (https://github.com/jpt/barlow).\n'
        'Space Mono: Copyright 2016 The Space Mono Project Authors (https://github.com/googlefonts/spacemono).\n'
        'Vazirmatn (Farsi) is used from assets/fonts/Vazirmatn-Variable.woff2 in this repository; its licence is next to it.\n',
        encoding='utf-8')


if __name__ == '__main__':
    sys.exit(main())
