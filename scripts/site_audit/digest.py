"""Compact digest of one capture record: python digest.py <key> <vp> [dir]  (dir defaults to $AUDIT_OUT or %TEMP%/site-audit/out)"""
import json, sys, os
import os, tempfile
DEFAULT_DIR = os.environ.get('AUDIT_OUT') or os.path.join(tempfile.gettempdir(), 'site-audit', 'out')
HERE = os.path.dirname(os.path.abspath(__file__))
sys.stdout.reconfigure(encoding='utf-8')
key, vp = sys.argv[1], sys.argv[2]
base = sys.argv[3] if len(sys.argv) > 3 else DEFAULT_DIR
rec = json.load(open(os.path.join(base, key, vp, 'record.json'), encoding='utf-8'))
P = rec.get('probe') or {}
L = rec.get('log') or {}
def g(*path, default=None):
    cur = P
    for k in path:
        if isinstance(cur, dict) and k in cur: cur = cur[k]
        else: return default
    return cur
def line(label, val):
    print(f'{label:<10} {val}')
print(f"=== {key} @ {vp}  status={rec.get('status')} final={rec.get('finalUrl')} load={rec.get('loadMs')}ms  error={rec.get('error')}")
h = g('head') or {}
line('HEAD', f"lang={h.get('lang')} dir={h.get('dir')} title({h.get('titleLen')})='{(h.get('title') or '')[:70]}'")
line('', f"desc({h.get('descLen')}) robots={h.get('robots')} canonical={'yes' if h.get('canonical') else 'NO'} hreflang={len(h.get('hreflang') or [])} og:img={'yes' if (h.get('og') or {}).get('image') else 'NO'} twitter={h.get('twitter')} jsonld={h.get('jsonld')}")
line('', f"viewport='{h.get('viewport')}' zoomBlocked={g('a11y','zoomBlocked')} manifest={h.get('manifest')} appleIcon={h.get('appleIcon')} preconnect={len(h.get('preconnect') or [])}")
s = g('structure') or {}
line('STRUCT', f"height={s.get('docHeight')}px = {s.get('screens')} screens | h1={s.get('h1')} | jumps={s.get('headingJumps')} | landmarks={s.get('landmarks')} skip={s.get('skipLink')}")
secs = s.get('sections') or []
line('SECTIONS', f"{len(secs)}: " + ' | '.join(f"{x['y']}+{x['h']} {x['head'][:22] or x['id'] or x['cls'][:14]}" for x in secs[:22]))
f = g('fold') or {}
line('FOLD', f"CTAs above fold={f.get('ctasAboveFold')} total CTA-like={f.get('ctaTotal')} first={[(c['t'], c['y']) for c in (f.get('ctas') or [])[:5]]}")
line('', f"first screen text: {[(t[0], t[1][:40], t[2]) for t in (f.get('firstScreenText') or [])[:8]]}")
a = g('a11y') or {}
t = a.get('tap') or {}
line('TAP', f"interactive={a.get('interactive')} total={t.get('total')} <44px={t.get('under44')} <24px={t.get('under24')}")
for w in (t.get('worst') or [])[:7]: line('', f"   {w['w']}x{w['h']} '{w['t']}' {w['p'][:60]}")
line('NAMES', f"unnamed controls={a.get('noNameCount')} {[n['html'][:70] for n in (a.get('noName') or [])[:4]]}")
for fm in (a.get('forms') or []): line('FORM', f"{fm['id'] or '(no id)'} action={fm['action']} fields={fm['fields']} types={fm['types']} unlabelled={fm['unlabelled']} noAutocomplete={fm['noAutocomplete']}")
c = a.get('css') or {}
line('CSS/A11Y', f"focusSuppressed={c.get('focusSuppressed')} focus-visible rules={c.get('focusVisibleRules')} reduced-motion rules={c.get('reduceMotionRules')} infinite-anim rules={c.get('infiniteAnimRules')} running anims={a.get('runningAnimations')} fakeButtons={a.get('fakeButtons')}")
m = a.get('media') or {}
line('MEDIA-A11Y', f"video={m.get('video')} iframes={[(i['src'][:40], i['title']) for i in (m.get('iframes') or [])]}")
fo = rec.get('focus') or []
nofocus = [x for x in fo if x['outline'] == 'none' and x['shadow'] == 'none']
line('FOCUS', f"tab stops sampled={len(fo)} with NO visible indicator={len(nofocus)} first stop='{fo[0]['t'] if fo else None}' | missing: {[x['t'][:20] for x in nofocus[:4]]}")
ty = g('type') or {}
line('TYPE', f"body={ty.get('bodySize')}/{ty.get('bodyLH')} font={ty.get('bodyFont')} distinctSizes={ty.get('distinctSizes')} tiny(<12px)={ty.get('tinyCount')} small(12-14)={ty.get('smallCount')} paraLH={ty.get('avgParaLH')} maxMeasure={ty.get('maxMeasureChars')}ch")
line('', f"families={ty.get('families')} loadedFonts={len(ty.get('loadedFonts') or [])}")
for x in (ty.get('tiny') or [])[:6]: line('', f"   tiny {x['fs']}px '{x['t']}' {x['p'][:50]}")
co = g('color') or {}
line('CONTRAST', f"checked={co.get('checked')} unknownBg={co.get('unknownBackground')} failing groups={co.get('failGroups')}")
for x in (co.get('fails') or [])[:10]: line('', f"   {x['ratio']}:1 (need {x['need']}) {x['fg']} on {x['bg']} {x['fs']}px op={x['op']} x{x['count']} '{x['sample']}'")
line('PALETTE', f"text={co.get('textPalette')[:8] if co.get('textPalette') else None} | gold/yellow suspects={co.get('goldCount')} {co.get('goldSuspects')[:3] if co.get('goldSuspects') else ''}")
md = g('media') or {}
line('IMAGES', f"total={md.get('count')} visible={md.get('visible')} noAlt={md.get('noAltCount')} emptyAlt={md.get('emptyAlt')} noDims={md.get('noDimensions')} lazyAboveFold={md.get('lazyAboveFold')} formats={md.get('formats')}")
line('', f"noAlt: {md.get('noAlt')} | oversized: {md.get('oversized')}")
lk = g('links') or {}
line('LINKS', f"total={lk.get('total')} internal={len(lk.get('internal') or [])} external={lk.get('external')} wa={lk.get('whatsapp')} bad={lk.get('bad')} vague={lk.get('vague')}")
pf = g('perf') or {}
bt = pf.get('byType') or {}
line('PERF', f"req={pf.get('requests')} " + ' '.join(f"{k}:{v['n']}/{round(v['enc']/1024)}KB" for k, v in bt.items()) + f" | DOM={pf.get('domNodes')} html={pf.get('htmlKB')}KB inlineCSS={pf.get('inlineCssKB')}KB inlineJS={pf.get('inlineJsKB')}KB blockingCSS={pf.get('blockingCss')} blockingJS={pf.get('blockingJs')}")
line('', f"ttfb={pf.get('ttfb')} dcl={pf.get('dcl')} load={pf.get('load')} fcp={pf.get('fcp')} lcp={pf.get('lcp')} cls={pf.get('cls')} longtasks={pf.get('longTasks')}/{pf.get('longTaskMs')}ms lcpEl={pf.get('lcpEl')}")
line('', f"hosts={pf.get('hosts')}")
line('', f"heaviest={pf.get('heaviest')[:6] if pf.get('heaviest') else None}")
fx = g('fixed') or {}
line('FIXED-UI', f"top bar={fx.get('topBarPx')}px bottom bar={fx.get('bottomBarPx')}px covers {fx.get('coveredPct')}% of the screen | " + ' ; '.join(f"{i['p'][:34]} {i['pos']} {i['w']}x{i['h']} '{i['t'][:18]}'" for i in (fx.get('items') or [])[:5]))
cp = g('copy') or {}
line('COPY', f"words={cp.get('words')} sentences={cp.get('sentences')} avgSentence={cp.get('avgSentenceWords')}w em-dashes={cp.get('emDash')} semicolons={cp.get('semicolons')} exclam={cp.get('exclam')} triads={cp.get('triads')} flesch={cp.get('flesch')}")
lo = g('layout') or {}
line('LAYOUT', f"overflowX={lo.get('overflowX')} scrollW={lo.get('scrollW')} innerW={lo.get('innerW')} offenders={lo.get('offenders')}")
r = g('rtl') or {}
if r.get('faElements'):
    line('RTL/FA', f"rtl={r.get('isRtl')} faElements={r.get('faElements')} digits={r.get('digits')} arabicYeh={r.get('arabicYeh')} arabicKaf={r.get('arabicKaf')} mi+space={r.get('miSpace')} ها+space={r.get('haSpace')}")
    line('', f"letterSpacedFa={r.get('letterSpacedCount')} {r.get('letterSpacedFa')[:3] if r.get('letterSpacedFa') else ''} lowLineHeight={r.get('lowLineHeightCount')} {r.get('lowLineHeight')[:3] if r.get('lowLineHeight') else ''}")
    line('', f"faFonts={r.get('faFonts')} physicalCssRules={r.get('physicalCssRules')} logicalCssRules={r.get('logicalCssRules')}")
cons = [x for x in L.get('console', []) if 'ERR_FAILED' not in x[1]]
line('LOG', f"console(non-blocked)={cons[:4]} pageerrors={L.get('errors')[:3]} failed={[x for x in L.get('failed', []) if 'plausible' not in x[0]][:3]} nonOk={L.get('nonOk')[:4]}")
line('', f"statuses={L.get('statuses')} hosts={L.get('hosts')} textNoEnc={L.get('textNoEnc')[:4]} cache-control={dict((k, L.get('noCache', []).count(k)) for k in set(L.get('noCache', [])))}")
if P.get('_errors'): line('PROBE-ERR', P['_errors'])
