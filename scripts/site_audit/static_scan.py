"""Static source scan of the public pages: palette conformance, fonts, breakpoints, token drift."""
import re, os, sys, colorsys, collections
sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
PAGES = ['index.html', 'index-fa.html', 'links.html', 'proof.html', 'form.html', 'form-fa.html', 'partner-fa.html',
         'tennis/index.html', 'tennis-testing/index.html', 'terms.html', 'terms-fa.html', 'privacy.html', 'privacy-fa.html',
         'uts-padel.html', 'etminan-en.html', 'etminan.html', 'partials/nav.html', 'partials/footer.html',
         'assets/css/tokens.css', 'assets/css/base.css', 'assets/css/components.css', 'assets/css/fa-product.css',
         'assets/js/shared.js', 'assets/js/fa-nav.js']
BRAND = {  # hex -> name (Amir's non-negotiables, Content/DESIGN-ATLAS.md)
    '#0e4a36': 'green', '#156a4d': 'green-2', '#c7552f': 'clay', '#e06b43': 'clay-2', '#faf7f2': 'paper', '#f1ece3': 'paper-2',
    '#1a1a1a': 'ink', '#5c5c5c': 'ink-2', '#e7e2d9': 'hairline', '#1f7a4d': 'good', '#c0392b': 'bad',
    '#ffffff': 'white', '#000000': 'black', '#fff': 'white', '#000': 'black'}
def norm(h):
    h = h.lower()
    if len(h) == 4: h = '#' + ''.join(c * 2 for c in h[1:])
    return h
def rgb(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
def is_goldish(h):
    r, g, b = [v / 255 for v in rgb(h)]
    hh, l, s = colorsys.rgb_to_hls(r, g, b)
    return 30 <= hh * 360 <= 65 and s > 0.45 and 0.25 < l < 0.88
def near(h, tol=14):
    r = rgb(h)
    for k, n in BRAND.items():
        if len(k) == 7 and sum(abs(a - b) for a, b in zip(r, rgb(k))) <= tol: return n
    return None
print(f"{'file':<26}{'KB':>5} {'hexes':>5} {'off-palette (top)':<70}")
alloff = collections.Counter(); gold = {}
fontsby = {}; bps = {}; drift = {}
for rel in PAGES:
    p = os.path.join(ROOT, rel.replace('/', os.sep))
    if not os.path.exists(p): print(f'{rel:<26} MISSING'); continue
    s = open(p, encoding='utf-8', errors='replace').read()
    hexes = [norm(x) for x in re.findall(r'#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b', s) if not re.match(r'#[0-9a-fA-F]{3}$', x) or True]
    # skip obvious non-colours (anchors like #main, ids): require valid colour context
    hexes = [h for h in hexes if re.fullmatch(r'#[0-9a-f]{6}', h)]
    cnt = collections.Counter(hexes)
    off = [(h, c) for h, c in cnt.most_common() if h not in BRAND and not near(h)]
    for h, c in off: alloff[h] += c
    g = [h for h, c in cnt.items() if is_goldish(h)]
    if g: gold[rel] = g
    print(f"{rel:<26}{len(s)//1024:>5} {len(cnt):>5} {', '.join(f'{h}x{c}' for h, c in off[:7])}")
    ff = collections.Counter(m.strip().strip('"\'').split(',')[0].strip().strip('"\'') for m in re.findall(r'font-family\s*:\s*([^;}{]+)', s))
    fontsby[rel] = ff
    q = collections.Counter(re.findall(r'@media\s*\(\s*(?:max|min)-width\s*:\s*(\d+)px', s))
    bps[rel] = q
    roots = re.findall(r':root\s*\{([^}]*)\}', s)
    toks = {}
    for blk in roots:
        for n, v in re.findall(r'(--[\w-]+)\s*:\s*([^;]+);', blk):
            v = v.strip().lower()
            if re.fullmatch(r'#[0-9a-f]{3,6}', v): toks[n] = norm(v)
    drift[rel] = toks
print('\nGOLD/YELLOW-ISH hex values by file:', gold or 'none')
print('\nTop off-palette hexes overall:', alloff.most_common(18))
print('\nFONT FAMILIES (first family in each declaration) by file:')
for rel, ff in fontsby.items():
    if ff: print(f'  {rel:<26}', dict(ff.most_common(6)))
print('\nBREAKPOINTS (px: uses) by file:')
for rel, q in bps.items():
    if q: print(f'  {rel:<26}', dict(sorted(q.items(), key=lambda x: int(x[0]))))
print('\nTOKEN DRIFT: the same brand colour under different variable names:')
byhex = collections.defaultdict(lambda: collections.defaultdict(set))
for rel, toks in drift.items():
    for n, h in toks.items():
        if h in BRAND: byhex[BRAND[h]][n].add(rel)
for color, names in byhex.items():
    print(f'  {color:<9}', {n: len(f) for n, f in names.items()})
