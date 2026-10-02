"""One-line-per-page scoreboard across all captured pages. python scoreboard.py [dir]"""
import json, os, sys
import os, tempfile
DEFAULT_DIR = os.environ.get('AUDIT_OUT') or os.path.join(tempfile.gettempdir(), 'site-audit', 'out')
HERE = os.path.dirname(os.path.abspath(__file__))
sys.stdout.reconfigure(encoding='utf-8')
base = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_DIR
pages = json.load(open(os.path.join(HERE, 'pages.json'), encoding='utf-8'))
def load(key, vp, name):
    p = os.path.join(base, key, vp, name)
    return json.load(open(p, encoding='utf-8')) if os.path.exists(p) else None
def kb(n): return f'{round((n or 0) / 1024)}'
print('SLOW-4G + 4x CPU, phone, cache off  (lab, simulated like Lighthouse mobile)')
print(f"{'page':<12}{'FCP':>6}{'LCP':>7}{'CLS':>7}{'load':>7}{'req':>5}{'KB':>6}{'DOM':>6}{'tasks':>7}  lcp element")
for pg in pages:
    t = load(pg['key'], 'mobile', 'throttled.json')
    if not t or not t.get('probe'): print(f"{pg['key']:<12} (no data)"); continue
    pf = (t['probe'].get('perf') or {})
    tot = sum(v['enc'] for v in (pf.get('byType') or {}).values())
    print(f"{pg['key']:<12}{str(pf.get('fcp')):>6}{str(pf.get('lcp')):>7}{str(pf.get('cls')):>7}{str(pf.get('load')):>7}{str(pf.get('requests')):>5}{kb(tot):>6}{str(pf.get('domNodes')):>6}{str(pf.get('longTaskMs')):>7}  {(pf.get('lcpEl') or '')[:60]}")
print()
print('LAYOUT / ACCESSIBILITY SCOREBOARD (phone 390 unless noted)')
print(f"{'page':<12}{'screens':>8}{'tap<44':>7}{'tap<24':>7}{'tiny<12':>8}{'contrast':>9}{'noAlt':>6}{'noName':>7}{'noFocus':>8}{'ovf360':>7}{'emdash':>7}{'avgSent':>8}{'flesch':>7}")
for pg in pages:
    r = load(pg['key'], 'mobile', 'record.json'); s = load(pg['key'], 'small', 'record.json')
    if not r or not r.get('probe'): print(f"{pg['key']:<12} (no data)"); continue
    P = r['probe']; a = P.get('a11y') or {}; t = a.get('tap') or {}; ty = P.get('type') or {}; co = P.get('color') or {}; md = P.get('media') or {}
    nf = len([x for x in (r.get('focus') or []) if x['outline'] == 'none' and x['shadow'] == 'none'])
    ov = ((s or {}).get('probe') or {}).get('layout', {}).get('overflowX')
    cp = P.get('copy') or {}
    print(f"{pg['key']:<12}{str((P.get('structure') or {}).get('screens')):>8}{str(t.get('under44')):>7}{str(t.get('under24')):>7}{str(ty.get('tinyCount')):>8}{str(co.get('failGroups')):>9}{str(md.get('noAltCount')):>6}{str(a.get('noNameCount')):>7}{nf:>8}{str(ov):>7}{str(cp.get('emDash')):>7}{str(cp.get('avgSentenceWords')):>8}{str(cp.get('flesch')):>7}")
