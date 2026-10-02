"""Copy audit: every line a reel shows, checked against the pages it claims to come from.

A line is "on source" when it appears in one of the source files (after folding half-spaces, Arabic/Persian letter variants, digits,
punctuation and spacing). Everything else is NEW COPY: a link line or a connector written for the video. List those for Amir to read.
(Reel 9: 24 lines were word for word on her site, 6 were new and were listed at the end.)

    python copy_audit.py <lines.json> <source> [<source> ...] [--src <reel src dir>]
    (add --no-scripts to ignore <script> blocks in the sources; by default they are read, because a site's copy often lives in JS)

lines.json: [["S1","تنیس"],["S2","سلام، من"], ...]   or   {"S1": ["..."], "S2": ["..."]}
source:     any text, html, md or json file (the live page saved to disk, a product brief, a skill file)
--src:      also scan *.html / *.js in that folder for Farsi strings that are NOT in lines.json (so the table cannot go stale)
Prints a table; always exits 0 (it is a report, not a gate).
"""
import io, json, os, re, sys


def fold(s):
    s = s.replace('‌', '').replace('ي', 'ی').replace('ك', 'ک')
    s = s.translate(str.maketrans('0123456789٠١٢٣٤٥٦٧٨٩', '۰۱۲۳۴۵۶۷۸۹۰۱۲۳۴۵۶۷۸۹'))
    s = re.sub(r'[\s·\-–—،,.؟?:!؛;«»"\'()]+', ' ', s)
    return s.strip()


def main():
    args = sys.argv[1:]
    src_dir = None
    if '--src' in args:
        i = args.index('--src'); src_dir = args[i + 1]; del args[i:i + 2]
    strip_scripts = '--no-scripts' in args
    args = [a for a in args if a != '--no-scripts']
    if len(args) < 2:
        print(__doc__); return
    raw = json.load(io.open(args[0], encoding='utf-8'))
    lines = [(k, l) for k, v in raw.items() for l in v] if isinstance(raw, dict) else [tuple(x) for x in raw]
    text = ''
    for p in args[1:]:
        t = io.open(p, encoding='utf-8', errors='replace').read()
        # scripts stay: a site often keeps its copy in a JS table (her SPORTS table); --no-scripts drops them when a page's code would only add noise
        text += ' ' + re.sub(r'<script.*?</script>|<style.*?</style>' if strip_scripts else r'<style.*?</style>', ' ', t, flags=re.S)
    text = fold(re.sub(r'<[^>]+>', ' ', text))
    ok, new = [], []
    for scene, line in lines:
        (ok if fold(line) in text else new).append((scene, line))
    print('ON SOURCE (word for word):', len(ok))
    for s, l in ok:
        print('  ', s, l)
    print('\nNEW COPY written for the video (Amir to read before it ships):', len(new))
    for s, l in new:
        print('  ', s, l)
    if src_dir:
        code = ''
        for fn in os.listdir(src_dir):
            if fn.endswith(('.html', '.js')):
                code += io.open(os.path.join(src_dir, fn), encoding='utf-8').read()
        code = re.sub(r'<style>.*?</style>', ' ', code, flags=re.S)
        code = re.sub(r'/\*.*?\*/|<!--.*?-->|//[^\n]*', ' ', code, flags=re.S)
        found = set(re.findall(r'[؀-ۿ][؀-ۿ‌ ،؟·]*[؀-ۿ؟]|[؀-ۿ]', code))
        known = fold(' '.join(l for _, l in lines))
        missing = sorted({f for f in found if fold(f) and fold(f) not in known})
        print('\nFarsi strings in the code that are not in lines.json:', len(missing))
        for m in missing:
            print('  ', m)


if __name__ == '__main__':
    main()
