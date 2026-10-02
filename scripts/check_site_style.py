"""The website's style guard (website audit package 22, Amir 2026-10-02: "stop the commit").

Runs from .githooks/pre-commit whenever a public page or its shared CSS is staged. It stops a commit that
brings back one of the faults the 2026-10-02 website audit fixed (Content/SITE-AUDIT.md):

  gold         yellow, gold or amber (a hex, a colour name or an emoji): clay #C7552F is the only accent
  tiny-text    text smaller than 12 px
  pale-grey    the two greys that fail contrast as text (#8A8A8A, #B0A99E): use #6B6B6B (--text-muted)
  fa-spacing   letter-spacing on a Farsi page: it breaks the joined letters
  google-font  a Google Fonts link: the fonts are our own files (assets/css/fonts.css)
  clay-fill    white text on the plain clay #C7552F (4.40:1): the fill under white text is
               var(--accent-2-fill) / var(--clay-fill), #C2512C (4.66:1)

It is a RATCHET, not a ban on what already exists: scripts/site_style_baseline.json holds what each page had on
2026-10-02 (the drawn mini app's small labels, the Etminan amber, the UTS page's own fonts ...). A change may keep
those or remove them (then run --update so they cannot come back) but may not ADD one. A deliberate exception
carries /* style-ok */ (or <!-- style-ok -->) on the same line.

    python scripts/check_site_style.py           the staged files (the hook)
    python scripts/check_site_style.py --all     every page, working tree
    python scripts/check_site_style.py --list    every violation there is now, with line numbers
    python scripts/check_site_style.py --update  accept the working tree as the new baseline (after a clean-up)
    python scripts/check_site_style.py --files a.html,b.css   those files, working tree (for testing)
"""
import collections, colorsys, json, os, re, subprocess, sys

sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
BASELINE = os.path.join(ROOT, 'scripts', 'site_style_baseline.json')

FILES = ['index.html', 'index-fa.html', 'links.html', 'proof.html', 'form.html', 'form-fa.html', 'partner-fa.html',
         'tennis/index.html', 'tennis-testing/index.html', 'terms.html', 'terms-fa.html', 'privacy.html', '404.html',
         'uts-padel.html', 'etminan-en.html', 'etminan.html', 'etminan-dv.html',
         'partials/nav.html', 'partials/footer.html',
         'assets/css/tokens.css', 'assets/css/base.css', 'assets/css/components.css', 'assets/css/fa-product.css',
         'assets/css/fonts.css', 'assets/js/shared.js', 'assets/js/fa-nav.js', 'assets/js/track.js']
FARSI = {'index-fa.html', 'links.html', 'form-fa.html', 'partner-fa.html', 'terms-fa.html', 'tennis/index.html',
         'tennis-testing/index.html', 'etminan.html', 'assets/css/fa-product.css', 'assets/js/fa-nav.js'}

WHY = {
    'gold': 'yellow, gold or amber. Clay #C7552F is the only accent: use clay, green or grey (a level mark is a green or clay dot).',
    'tiny-text': 'text under 12 px. Use 12 px or more (a 12 px label wants a lighter letter-spacing, not a smaller size).',
    'pale-grey': 'a grey that fails contrast as text (3.2:1). Use #6B6B6B (var(--text-muted)), about 5:1.',
    'fa-spacing': 'letter-spacing on a Farsi page: it breaks the joined letters. Remove it (Latin-only labels may keep it with /* style-ok */).',
    'google-font': 'a Google Fonts link. The fonts are our own files: <link rel="stylesheet" href="/assets/css/fonts.css">.',
    'clay-fill': 'white text on plain clay #C7552F (4.40:1). Use background: var(--accent-2-fill) (or --clay-fill on the Farsi pages), #C2512C.',
}

GOLD_EMOJI = '🟡🟨🟠🟧💛⚠⭐🌟🥇🏅'
GOLD_NAMES = re.compile(r'(?<![\w-])(?:color|background(?:-color)?|border(?:-color)?|fill|stroke)\s*:\s*(?:gold|yellow|goldenrod|orange|amber|khaki)\b', re.I)
HEX = re.compile(r'#[0-9a-fA-F]{6}\b')
SIZE = re.compile(r'font-size\s*:\s*([\d.]+)\s*(px|rem|em)\b', re.I)
SPACING = re.compile(r'letter-spacing\s*:\s*([^;}"\']+)', re.I)
PALE = ('#8a8a8a', '#b0a99e')
PALE_COLOR = re.compile(r'(?<![\w-])color\s*:\s*(#[0-9a-fA-F]{6}|var\(--[\w-]+\))', re.I)
VAR_DEF = re.compile(r'(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\b')
GOOGLE = re.compile(r'fonts\.(?:googleapis|gstatic)\.com')
RULE = re.compile(r'([^{}<>]*)\{([^{}]*)\}')
CLAY_BG = re.compile(r'background(?:-color)?\s*:\s*(?:var\(--(?:accent-2|clay)\)|#c7552f)\s*[;}!]?', re.I)
WHITE_FG = re.compile(r'(?<![\w-])color\s*:\s*(?:#fff\b|#ffffff\b|white\b|#faf7f2\b)', re.I)


def goldish(h):
    r, g, b = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    hh, l, s = colorsys.rgb_to_hls(r, g, b)
    return 30 <= hh * 360 <= 65 and s > 0.45 and 0.25 < l < 0.88


def blank_comments(text, js=False):
    """Comments out of the way (same length, so line numbers hold) so prose never trips a rule."""
    def keep_nl(m): return re.sub(r'[^\n]', ' ', m.group(0))
    text = re.sub(r'<!--.*?-->', keep_nl, text, flags=re.S)
    text = re.sub(r'/\*.*?\*/', keep_nl, text, flags=re.S)
    if js:   # a // comment (in an HTML page the same two slashes are inside a web address, so only .js files)
        text = re.sub(r'(?m)(^|[ \t])//[^\n]*', lambda m: m.group(1) + re.sub(r'[^\n]', ' ', m.group(0)[len(m.group(1)):]), text)
    return text


def scan(rel, text):
    """-> list of (rule, snippet, line). Lines marked style-ok are skipped."""
    orig_lines = text.split('\n')
    clean = blank_comments(text, rel.endswith('.js'))
    starts = [0]
    for ln in clean.split('\n')[:-1]: starts.append(starts[-1] + len(ln) + 1)
    def line_of(pos):
        lo, hi = 0, len(starts) - 1
        while lo < hi:
            mid = (lo + hi + 1) // 2
            if starts[mid] <= pos: lo = mid
            else: hi = mid - 1
        return lo + 1
    hits = []
    def add(rule, snip, pos):
        ln = line_of(pos)
        if 'style-ok' in orig_lines[ln - 1]: return
        hits.append((rule, snip, ln))
    for m in HEX.finditer(clean):
        if goldish(m.group(0)): add('gold', m.group(0).lower(), m.start())
    for m in GOLD_NAMES.finditer(clean): add('gold', re.sub(r'\s+', '', m.group(0).lower()), m.start())
    for i, ch in enumerate(clean):
        if ch in GOLD_EMOJI and (ch != '⚠' or clean[i + 1:i + 2] == '️'): add('gold', ch, i)   # the warning sign only counts in its coloured form
    for m in SIZE.finditer(clean):
        v, u = float(m.group(1)), m.group(2).lower()
        px = v if u == 'px' else v * 16
        if px < 12: add('tiny-text', 'font-size:' + m.group(1) + u, m.start())
    if rel in FARSI:
        for m in SPACING.finditer(clean):
            val = m.group(1).strip().lower()
            if val in ('0', '0px', 'normal', 'none', 'inherit', 'initial') or re.fullmatch(r'0(\.0+)?(px|em|rem)?', val): continue
            add('fa-spacing', 'letter-spacing:' + val, m.start())
    defs = {k: v.lower() for k, v in VAR_DEF.findall(clean)}
    for m in PALE_COLOR.finditer(clean):
        val = m.group(1).lower()
        if val.startswith('var('): val = defs.get(val[4:-1], '')
        if val in PALE: add('pale-grey', 'color:' + val, m.start())
    for m in GOOGLE.finditer(clean): add('google-font', m.group(0), m.start())
    for m in RULE.finditer(clean):
        body = m.group(2)
        if CLAY_BG.search(body) and WHITE_FG.search(body):
            add('clay-fill', re.sub(r'\s+', ' ', m.group(1).strip())[-60:], m.start(2))
    return hits


def counts(hits):
    return collections.Counter('%s|%s' % (r, s) for r, s, _ in hits)


def read_working(rel):
    p = os.path.join(ROOT, rel.replace('/', os.sep))
    return open(p, encoding='utf-8', errors='replace').read() if os.path.exists(p) else None


def read_staged(rel):
    r = subprocess.run(['git', 'show', ':' + rel], cwd=ROOT, capture_output=True)
    return r.stdout.decode('utf-8', errors='replace') if r.returncode == 0 else None


def staged_files():
    r = subprocess.run(['git', 'diff', '--cached', '--name-only', '--diff-filter=ACM'], cwd=ROOT, capture_output=True, text=True)
    return [f for f in r.stdout.split('\n') if f in FILES]


def main():
    args = sys.argv[1:]
    base = json.load(open(BASELINE, encoding='utf-8')) if os.path.exists(BASELINE) else {}
    if '--update' in args:
        out = {}
        for rel in FILES:
            t = read_working(rel)
            if t is not None:
                c = counts(scan(rel, t))
                if c: out[rel] = dict(sorted(c.items()))
        json.dump(out, open(BASELINE, 'w', encoding='utf-8', newline='\n'), indent=1, ensure_ascii=False)
        open(BASELINE, 'a', encoding='utf-8', newline='\n').write('\n')
        print('baseline written: %d files, %d accepted items' % (len(out), sum(sum(v.values()) for v in out.values())))
        return 0
    if '--list' in args:
        for rel in FILES:
            t = read_working(rel)
            if t is None: continue
            for r, s, ln in scan(rel, t): print('%s:%d  %-11s %s' % (rel, ln, r, s))
        return 0
    if '--all' in args: targets, reader = FILES, read_working
    elif '--files' in args: targets, reader = args[args.index('--files') + 1].split(','), read_working
    else: targets, reader = staged_files(), read_staged
    bad, better = [], 0
    for rel in targets:
        t = reader(rel)
        if t is None: continue
        hits = scan(rel, t)
        now, was = counts(hits), collections.Counter(base.get(rel, {}))
        for key, n in now.items():
            extra = n - was.get(key, 0)
            if extra > 0:
                rule, snip = key.split('|', 1)
                lines = [ln for r, s, ln in hits if '%s|%s' % (r, s) == key]
                bad.append((rel, rule, snip, extra, lines))
        better += sum(max(0, was[k] - now.get(k, 0)) for k in was)
    if bad:
        print('')
        print('style guard: BLOCKED. This change brings back something the website audit fixed:')
        for rel, rule, snip, extra, lines in bad:
            print('  %s  [%s]  %s  (%d more than before; at line%s %s)' % (rel, rule, snip, extra, 's' if len(lines) > 1 else '', ', '.join(map(str, lines[:8]))))
            print('      ' + WHY[rule])
        print('If one is deliberate, put /* style-ok */ (or <!-- style-ok -->) on that line. Rules: scripts/check_site_style.py, record: Content/SITE-AUDIT.md.')
        return 1
    if better:
        print('style guard: OK. %d old item(s) are gone: run  python scripts/check_site_style.py --update  and commit the baseline so they cannot return.' % better)
    return 0


if __name__ == '__main__':
    sys.exit(main())
