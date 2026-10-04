# -*- coding: utf-8 -*-
"""Build Content/SITE-AUDIT.md and the private report page from backlog.py.
  python scripts/site_audit/build_report.py                       -> writes Content/SITE-AUDIT.md
  python scripts/site_audit/build_report.py --html out.html --images <dir with the evidence jpgs>
"""
import os, sys, html, base64, argparse
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import backlog as B
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.stdout.reconfigure(encoding='utf-8')

STATUS = {'next': 'Starting now', 'go': 'Decided: next to build', 'todo': 'Queued', 'ask': 'Waiting for you', 'other': 'Another session', 'done': 'Done'}
SEV = {'P1': 'Costs you now', 'P2': 'Worth fixing', 'P3': 'Polish'}
EFF = {'S': 'small', 'S-M': 'small to medium', 'M': 'medium', 'M-L': 'medium to large', 'L': 'large'}
PHASE_LABEL = {k: t for k, t, _ in B.PHASES}
PHASE_NOTE = {k: n for k, _, n in B.PHASES}

def counts():
    sev = {'P1': 0, 'P2': 0, 'P3': 0}
    for p in B.PK:
        for it in p['items']: sev[it[0]] += 1
    st = {}
    for p in B.PK: st[p['status']] = st.get(p['status'], 0) + 1
    return sev, st

def sorted_by_phase(phase): return [p for p in B.PK if p['phase'] == phase]

# ---------------------------------------------------------------- markdown
def cell(s): return str(s).replace('|', '\\|').replace('\n', ' ')

def build_md():
    sev, st = counts()
    o = []
    a = o.append
    a(f'# Site Audit: the website review ({B.DATE}), what is done and how to continue\n')
    a('The UX, design and usability review of the **public website** (English and Farsi, 20 pages), made on ' + B.DATE + ', and the work that follows it. '
      'The apps (`program.html`, `habits.html`, `coach.html`) come after (package 25). **A new chat picking this work up reads this file first.**\n')
    a('**This file is generated.** Edit `scripts/site_audit/backlog.py` (statuses, items, decisions) and run `python scripts/site_audit/build_report.py`. '
      'The private visual report page is built from the same file, so the two cannot disagree. '
      'The reviewers’ full reports (with file and line references) are in `Content/site-audit/`; the measuring tools and how to re-run them are in `scripts/site_audit/README.md`.\n')
    a('## How Amir wants it done\n')
    a('Same working agreement as `Content/FRESH-EYES.md` (the app audit):\n')
    for r in ['One package at a time: the next one in the order below, or the one he names. He answers with numbers (“1-5 yes, 7 no, 12 B”).',
              'Before any code: restate the problem, and for a call that is his, show the options with a picture or a real example and **mark my pick**. Never an abstract menu.',
              '**Build only after his yes on a call that is his** (a design direction, copy in his voice, a business or legal fact). Everything else, build and ship without stopping.',
              'Keep what works (the list below). Never remove a feature without saying so. Smallest change that solves it.',
              'After each package: WHAT CHANGED · WHY · FILES · PRESERVED · SIDE EFFECTS · WHAT TO TEST, briefly, then re-run the scoreboard and report the difference.',
              'Ship live: straight to `main`, one push at a time, stage only your own files (other sessions share this working tree), then confirm the deploy.',
              'Anything that touches `assets/css/*.css` or `assets/js/shared.js` bumps the `?v=` token on every marketing page that links it (`20261002f` now: index, form, proof, privacy, terms; `fonts.css` carries `20261002e`; `fa-product.css` has its own, `v=8`, on the two course pages). `sw.js` serves `/assets/` cache-first by exact URL, so a new token is a fresh copy. Do NOT bump `CACHE` in `sw.js` for that: it deletes the athletes’ offline copy of the apps. A replaced image ships under a new name.',
              'Never edit the generated pages (`en/articles/`, `fa/articles/`, `sitemap.xml`): fix `scripts/build_article_pages.py`. Keep the Search Console tag in `index.html`.',
              '“Push back, with evidence.” Check a visual defect in a real viewport (`scripts/site_audit/shot.js`) before reporting it: a frozen full-page capture once showed empty contact icons that were fine.']:
        a('- ' + r)
    a('\n## Where it stands\n')
    a(f'**{len(B.PK)} packages · {sum(sev.values())} findings** ({sev["P1"]} cost you now, {sev["P2"]} worth fixing, {sev["P3"]} polish). '
      + ' · '.join(f'{STATUS[k]}: {v}' for k, v in st.items()) + '\n')
    a('| # | Package | Phase | Status | Effort |')
    a('|---|---|---|---|---|')
    for p in B.PK:
        a(f'| {p["n"]} | {cell(p["title"])} | {PHASE_LABEL[p["phase"]]} | {STATUS[p["status"]]}{" (" + str(len(p.get("done", ""))) + " of " + str(len(p["items"])) + " items)" if p.get("done") else ""} | {EFF.get(p["effort"], p["effort"])} |')
    if getattr(B, 'NEXT_UP', None):
        a('\n### Start here next\n')
        for i, t in enumerate(B.NEXT_UP, 1): a(f'{i}. {t}')
    a('\n### Shipped\n')
    if getattr(B, 'SHIPPED', None):
        a('| Date | Packages | What changed | Commit |'); a('|---|---|---|---|')
        for d, pk, what, c in B.SHIPPED: a(f'| {d} | {pk} | {cell(what)} | {c} |')
    else:
        a('Nothing yet.')
    if getattr(B, 'NEW_WORDS', None):
        a('\n### Words I wrote, for you to read\n')
        a('Short functional lines, written to your voice rules, but they are your words on your site. Read them and tell me what to change.\n')
        for where, lines in B.NEW_WORDS:
            a(f'**{where}**\n')
            for ln in lines: a('- ' + ln)
            a('')
        a('**Calls of yours that I shipped anyway** (small, reversible or an accessibility fix; say “revert” and it goes in one commit):\n')
        for c in getattr(B, 'SHIPPED_YOUR_CALLS', []): a('- ' + c)
    a('\n## Scoreboard\n')
    a('Measured on the live site from this PC (UK) with `scripts/site_audit/`: the baseline on ' + B.DATE + ' and again after the first batches (' + getattr(B, 'AFTER_NOTE', 'later') + '). Lab numbers use a simulated slow 4G phone; they say nothing about Iran.\n')
    a('| Measure | Baseline | Now | Goal |'); a('|---|---|---|---|')
    for m, was, now, goal in B.SCORECARD: a(f'| {cell(m)} | {cell(was)} | {cell(now)} | {cell(goal)} |')
    a('\nThe baseline per-page tables are in `Content/site-audit/baseline-scoreboard.txt`.\n')
    a('## What works (keep)\n')
    for k in B.KEEP: a('- ' + k)
    for phase_key in ('now', 'call', 'base', 'next'):
        a(f'\n## {PHASE_LABEL[phase_key]}\n')
        a(PHASE_NOTE[phase_key] + '\n')
        for p in sorted_by_phase(phase_key):
            a(f'### {p["n"]}. {p["title"]}  ·  {STATUS[p["status"]]}  ·  {EFF.get(p["effort"], p["effort"])}\n')
            a(p['plain'] + '\n')
            if p.get('left'): a('**Still open.** ' + p['left'] + '\n')
            a('| ID | Shipped | Sev | Where | Problem | Fix | Effort | His call | From |')
            a('|---|---|---|---|---|---|---|---|---|')
            for i, it in enumerate(p['items']):
                sv, where, what, fix, eff, call, src = it
                done = chr(97 + i) in p.get('done', '')
                a(f'| {p["n"]}{chr(97 + i)} | {"✓" if done else ""} | {sv} | {cell(where)} | {cell(what)} | {cell(fix)} | {eff} | {"Y" if call == "Y" else ""} | {cell(src)} |')
            d = p.get('decision')
            if d:
                a(f'\n**Decision: {d["title"]}**\n')
                for k, name, text in d['options']:
                    a(f'- **{k}. {name}.** {text}' + ('  ← my pick' if k == d['pick'] else '') + ('  ← **YOUR CHOICE (2026-10-02)**' if k == d.get('chosen') else ''))
            a('')
    a('## Facts you have given me\n')
    for q in B.FACTS: a(f'- {q}')
    a('')
    a('## Questions only Amir can answer\n')
    for i, q in enumerate(B.QUESTIONS, 1): a(f'{i}. {q}')
    a('\n## Tools: what we used, what we skip\n')
    a('Research of 2026-10-02 (stars and dates verified on the repo pages; full notes in `Content/site-audit/research-*.md`).\n')
    a('| Tool | Source | What it does | Verdict | How we use it |'); a('|---|---|---|---|---|')
    for t in B.TOOLS: a('| ' + ' | '.join(cell(x) for x in t) + ' |')
    a('\n## Files\n')
    a('- `scripts/site_audit/` the measuring tools, `backlog.py` (this file’s source) and `build_report.py`.')
    a('- `Content/site-audit/review-*.md` the seven page reviews with file and line references; `research-*.md` the tool research; `baseline-scoreboard.txt` (morning), `after-scoreboard-2026-10-02.txt` (afternoon, after the first batches) and `after-scoreboard-2026-10-04.txt` (the full re-run, with the slow-phone font test). Add a new dated after-scoreboard each time the audit is re-run.')
    a('- The private report page (claude.ai artifact “Front Door”) is the reading version with pictures; rebuild it with `--html`.')
    return '\n'.join(o) + '\n'

# ---------------------------------------------------------------- html
CSS = r'''
/* Front Door: one reading column on a paper ground. Summary and scorecard first, then the numbered plan as folded cards. */
:root{
  --paper:#FAF7F2; --card:#FFFFFF; --soft:#F1ECE3; --ink:#1A1A1A; --ink-2:#4B4B4B; --line:#E4DED3;
  --green:#0E4A36; --green-2:#156A4D; --clay:#C7552F; --clay-ink:#A8431F; --clay-solid:#B03F1C; --good:#1F7A4D;
  --fd:'Barlow Condensed','Arial Narrow',system-ui,sans-serif; --fb:'Barlow',system-ui,-apple-system,'Segoe UI',sans-serif; --fm:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace;
}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){
  --paper:#111612; --card:#18201B; --soft:#1E2822; --ink:#EEF1EC; --ink-2:#B6C0B9; --line:#2A352E; --green:#7CCBA5; --green-2:#9ADBBB; --clay:#E0714A; --clay-ink:#F08C66; --clay-solid:#B03F1C; --good:#6FD0A0; color-scheme:dark}}
:root[data-theme="dark"]{
  --paper:#111612; --card:#18201B; --soft:#1E2822; --ink:#EEF1EC; --ink-2:#B6C0B9; --line:#2A352E; --green:#7CCBA5; --green-2:#9ADBBB; --clay:#E0714A; --clay-ink:#F08C66; --clay-solid:#B03F1C; --good:#6FD0A0; color-scheme:dark}
*{box-sizing:border-box}
body{background:var(--paper);color:var(--ink);font:17px/1.55 var(--fb);padding-inline:16px;-webkit-text-size-adjust:100%}
.wrap{max-width:920px;margin:0 auto;padding-block:28px 72px}
h1,h2,h3{font-family:var(--fd);text-transform:uppercase;letter-spacing:.01em;margin:0;text-wrap:balance}
h1{font-weight:900;font-size:clamp(52px,12vw,92px);line-height:.88;color:var(--green)}
h1 em{font-style:normal;color:var(--clay-ink)}
h2{font-weight:800;font-size:clamp(28px,5vw,38px);line-height:1;margin:56px 0 14px;color:var(--green)}
h3{font-weight:800;font-size:22px;line-height:1.1}
p{margin:0 0 12px;max-width:68ch}
a{color:var(--green-2)}
.kick{font:500 12px/1.2 var(--fm);letter-spacing:.14em;text-transform:uppercase;color:var(--ink-2);margin:0 0 14px}
.lede{font-size:20px;max-width:60ch;margin-top:18px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:18px 20px}
.how{margin-top:22px;background:var(--soft);border:1px solid var(--line);border-radius:12px;padding:16px 20px}
.how b{color:var(--green)}
.how code{font:500 14px var(--fm);background:var(--card);border:1px solid var(--line);border-radius:6px;padding:1px 7px}
.score{display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:12px}
.tile{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;gap:6px}
.tile .m{font-size:14.5px;color:var(--ink-2);line-height:1.3}
.tile .now{font-family:var(--fd);font-weight:800;font-size:25px;line-height:1.05;color:var(--clay-ink)}
.tile .goal{font-size:14.5px;color:var(--ink-2)}
.tile .goal b{color:var(--good);font-weight:600}
.tile .was{font-size:14px;color:var(--ink-2)}
.tile .was s{text-decoration-thickness:1.5px}
.tile .now.better{color:var(--good)}
.tag.done{border-color:var(--good);color:var(--good)}
.sev.done{background:var(--good);color:#fff}
.left{background:var(--soft);border:1px solid var(--line);border-radius:10px;padding:10px 14px;margin:6px 0 4px;font-size:16px;max-width:76ch}
.left b{color:var(--clay-ink)}
.shipped{display:grid;gap:10px;margin:0;padding:0;list-style:none}
.shipped li{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 16px}
.shipped .when{font:500 12px var(--fm);letter-spacing:.06em;text-transform:uppercase;color:var(--ink-2)}
.shipped p{margin:4px 0 0;max-width:76ch}
.keep{padding-left:0;list-style:none;display:grid;gap:8px;margin:0}
.keep li{padding-left:26px;position:relative;max-width:78ch}
.keep li::before{content:'';position:absolute;left:4px;top:.55em;width:10px;height:10px;border-radius:50%;background:var(--good)}
.figs{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:18px;align-items:start}
.fig{margin:0}.fig.wide{grid-column:1/-1}
.fig img{display:block;width:100%;height:auto;border-radius:10px;border:1px solid var(--line);background:var(--soft)}
.fig figcaption{font-size:15px;color:var(--ink-2);margin-top:8px;max-width:60ch}
.fig figcaption b{font:500 12px var(--fm);letter-spacing:.08em;text-transform:uppercase;color:var(--clay-ink);margin-right:6px}
.strip{display:flex;height:34px;border-radius:8px;overflow:hidden;border:1px solid var(--line);margin:6px 0 4px}
.strip i{display:block;min-width:2px;border-right:1px solid var(--paper)}
.strip i:nth-child(odd){background:var(--green-2)}.strip i:nth-child(even){background:var(--clay)}
.stripcap{display:flex;justify-content:space-between;font-size:14.5px;color:var(--ink-2);margin-bottom:14px;gap:12px;flex-wrap:wrap}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 16px}
.chips button{font:600 15px var(--fb);min-height:44px;padding:0 16px;border-radius:999px;border:1.5px solid var(--line);background:var(--card);color:var(--ink);cursor:pointer}
.chips button[aria-pressed="true"]{background:var(--green);border-color:var(--green);color:#fff}
:root[data-theme="dark"] .chips button[aria-pressed="true"]{color:#0b1410}
.chips button:focus-visible,summary:focus-visible,a:focus-visible{outline:3px solid var(--clay);outline-offset:2px}
.phase-note{color:var(--ink-2);margin:0 0 14px;max-width:70ch}
.pk{background:var(--card);border:1px solid var(--line);border-radius:12px;margin:0 0 10px}
.pk summary{list-style:none;cursor:pointer;display:grid;grid-template-columns:auto 1fr;gap:6px 14px;padding:14px 16px;align-items:start}
.pk summary::-webkit-details-marker{display:none}
.pk .n{font:900 28px/1 var(--fd);min-width:34px;color:var(--clay-ink);text-align:center;padding-top:2px}
.pk .t{font:800 22px/1.1 var(--fd);text-transform:uppercase;color:var(--ink)}
.pk .pl{grid-column:2;color:var(--ink-2);font-size:16px;max-width:66ch}
.tags{grid-column:2;display:flex;flex-wrap:wrap;gap:6px}
.tag{font:500 12px/1 var(--fm);letter-spacing:.06em;text-transform:uppercase;border:1px solid var(--line);border-radius:999px;padding:5px 9px;color:var(--ink-2);background:var(--paper)}
.tag.go{border-color:var(--green-2);color:var(--green)}.tag.ask{border-color:var(--clay-ink);color:var(--clay-ink)}
.pk[open] summary{border-bottom:1px solid var(--line)}
.pkb{padding:6px 16px 16px}
.item{padding:14px 0;border-top:1px solid var(--line)}.item:first-child{border-top:0}
.item .h{display:flex;flex-wrap:wrap;gap:8px 10px;align-items:center;margin-bottom:6px}
.sev{font:600 12px/1 var(--fm);letter-spacing:.04em;text-transform:uppercase;padding:5px 9px;border-radius:6px}
.sev.P1{background:var(--clay-solid);color:#fff}.sev.P2{border:1.5px solid var(--clay-ink);color:var(--clay-ink)}.sev.P3{border:1.5px solid var(--line);color:var(--ink-2)}
.item .w{font:500 12px var(--fm);color:var(--ink-2);letter-spacing:.03em}
.item p{margin:0 0 6px;font-size:16px;max-width:76ch}.item p b{color:var(--green)}
.item .m{font:500 12px var(--fm);color:var(--ink-2);letter-spacing:.03em}
.dec{margin-top:12px;background:var(--soft);border:1px solid var(--line);border-radius:12px;padding:14px 16px}
.dec h4{font:800 19px var(--fd);text-transform:uppercase;margin:0 0 10px;color:var(--green)}
.opts{display:grid;gap:8px}
.opt{background:var(--card);border:1.5px solid var(--line);border-radius:10px;padding:10px 14px;display:grid;grid-template-columns:auto 1fr;gap:2px 12px}
.opt.pick{border-color:var(--green-2)}
.opt.chosen{border-color:var(--green);border-width:2.5px}
.opt .k{font:900 22px/1.1 var(--fd);color:var(--clay-ink);grid-row:span 2;min-width:34px}
.opt .nm{font-weight:600}.opt .tx{color:var(--ink-2);font-size:16px;grid-column:2}
.opt .mine{font:600 12px var(--fm);letter-spacing:.06em;text-transform:uppercase;color:var(--good);margin-left:8px}
ol.q{padding-left:22px;display:grid;gap:8px;max-width:78ch}
.tbl{overflow-x:auto;border:1px solid var(--line);border-radius:12px;background:var(--card)}
table{border-collapse:collapse;width:100%;min-width:640px;font-size:15px}
th,td{text-align:left;vertical-align:top;padding:10px 12px;border-bottom:1px solid var(--line)}
th{font:600 12px var(--fm);letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2)}
tr:last-child td{border-bottom:0}
td:first-child{font-weight:600}
.foot{margin-top:48px;color:var(--ink-2);font-size:15px}
@media (max-width:560px){body{font-size:16px}.pk .t{font-size:20px}.lede{font-size:18px}}
@media (prefers-reduced-motion: reduce){*{scroll-behavior:auto!important}}
'''

def e(s): return html.escape(str(s), quote=True)

def img_tag(images, fname, alt):
    p = os.path.join(images, fname)
    if not os.path.exists(p): return ''
    b = base64.b64encode(open(p, 'rb').read()).decode('ascii')
    return f'<img alt="{e(alt)}" loading="lazy" src="data:image/jpeg;base64,{b}">'

STRIP_NOW = [('Hero', 844), ('Stats', 373), ('Fit check', 1678), ('Testimonials', 1572), ('Pricing', 2437), ('How it works', 1640), ('App', 2120), ('Library', 1192), ('About', 2272), ('FAQ', 977), ('Contact', 1069), ('Final CTA', 635), ('Footer', 231)]
STRIP_GOAL = [('Hero + proof', 1217), ('Testimonials', 1100), ('How it works', 1300), ('Pricing', 1900), ('Fit check', 1000), ('App', 1400), ('About', 1100), ('FAQ', 977), ('Final CTA', 635), ('Footer', 400)]

def strip(rows, total_label):
    tot = sum(h for _, h in rows)
    segs = ''.join(f'<i style="flex:{h}" title="{e(n)}: {h:,} px"></i>' for n, h in rows)
    return f'<div class="strip" role="img" aria-label="{e(total_label)}">{segs}</div>', tot

def pk_html(p):
    d = p.get('decision'); parts = []
    for i, it in enumerate(p['items']):
        sv, where, what, fix, eff, call, src = it
        done = chr(97 + i) in p.get('done', '')
        badge = '<span class="sev done">Shipped</span>' if done else ''
        parts.append(
            f'<div class="item"><div class="h">{badge}<span class="sev {sv}">{e(SEV[sv])}</span><span class="w">{p["n"]}{chr(97 + i)} · {e(where)}</span></div>'
            f'<p>{e(what)}</p><p><b>Fix.</b> {e(fix)}</p>'
            f'<span class="m">{e(EFF.get(eff, eff))}{" · your call" if call == "Y" else ""}{" · from " + e(src) if src else ""}</span></div>')
    dec = ''
    if d:
        opts = ''.join(
            f'<div class="opt{" pick" if k == d["pick"] else ""}{" chosen" if k == d.get("chosen") else ""}"><span class="k">{e(k)}</span><span class="nm">{e(nm)}'
            f'{"<span class=mine>my pick</span>" if k == d["pick"] else ""}{"<span class=mine>your choice</span>" if k == d.get("chosen") else ""}</span><span class="tx">{e(tx)}</span></div>' for k, nm, tx in d['options'])
        dec = f'<div class="dec"><h4>{e(d["title"])}</h4><div class="opts">{opts}</div></div>'
    tags = f'<span class="tag {"ask" if p["status"] == "ask" else "done" if p["status"] == "done" else "go"}">{e(STATUS[p["status"]])}</span><span class="tag">{e(EFF.get(p["effort"], p["effort"]))}</span>'
    if p['phase'] == 'call': tags += '<span class="tag ask">your call</span>'
    return (f'<details class="pk" id="pk{p["n"]}" data-phase="{p["phase"]}"><summary><span class="n">{p["n"]}</span><span class="t">{e(p["title"])}</span>'
            f'<span class="pl">{e(p["plain"])}</span><span class="tags">{tags}</span></summary><div class="pkb">{"<p class=left><b>Still open.</b> " + e(p["left"]) + "</p>" if p.get("left") else ""}{"".join(parts)}{dec}</div></details>')

def starting(kind='next'):
    ns = [p['n'] for p in B.PK if p['status'] == kind]
    if not ns: return 'none'
    runs, start, prev = [], ns[0], ns[0]
    for n in ns[1:] + [None]:
        if n is not None and n == prev + 1: prev = n; continue
        runs.append(str(start) if start == prev else f'{start} to {prev}')
        if n is not None: start = prev = n
    return 'packages ' + ', '.join(runs[:-1]) + (' and ' if len(runs) > 1 else '') + runs[-1]

def build_html(images):
    sev, st = counts()
    o = []; a = o.append
    a('<title>Front Door</title>')
    a('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>')
    a('<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@800;900&family=Barlow:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">')
    a('<style>' + CSS + '</style>')
    a('<div class="wrap">')
    a(f'<p class="kick">The website review · {B.DATE} · 20 pages · phone, tablet, desktop</p>')
    a('<h1>Front <em>Door</em></h1>')
    a('<p class="lede">The website is fast, on-brand and honest where it counts. What costs you is smaller and fixable: pale small text, a few broken buttons, forms that end in a dead end, and a Farsi hero whose phone picture is invisible. Here is what I measured, what I will fix without asking, and the calls that are yours.</p>')
    a(f'<div class="how"><b>How to answer.</b> Reply with numbers, the way you do for a showreel: <code>1-11 go</code>, <code>12 B</code>, <code>13 C</code>, <code>14 option 1</code>, <code>19 yes</code>, <code>20 later</code>. '
      f'{len(B.PK)} packages, {sum(sev.values())} findings: {sev["P1"]} cost you now, {sev["P2"]} are worth fixing, {sev["P3"]} are polish. '
      f'<b>Done:</b> {starting("done")}. <b>Waiting for you:</b> {starting("ask")}. <b>Not started:</b> {starting("todo")}. <b>Another session:</b> {starting("other")}.</div>')

    a('<h2>The scoreboard</h2><p>Measured on the live site: the baseline (struck through) and again after the first batches. Green means it moved.</p><div class="score">')
    for m, was, now, goal in B.SCORECARD:
        better = was != now
        a(f'<div class="tile"><span class="m">{e(m)}</span>' + (f'<span class="was">was <s>{e(was)}</s></span>' if better else '') +
          f'<span class="now{" better" if better else ""}">{e(now)}</span><span class="goal">goal: <b>{e(goal)}</b></span></div>')
    a('</div>')
    if getattr(B, 'SHIPPED', None):
        a('<h2>What has shipped</h2><p>Live on the site now. Each row is one commit on main.</p><ul class="shipped">')
        for d, pk, what, c in B.SHIPPED:
            a(f'<li><span class="when">{e(d)} · package {e(pk)} · {e(c)}</span><p>{e(what)}</p></li>')
        a('</ul>')
    if getattr(B, 'NEW_WORDS', None):
        a('<h2>Words I wrote</h2><p>Every new sentence a visitor can now read, in one place. They are short and follow your voice rules, but they are your words on your site: tell me what to change and it goes in one commit.</p>')
        for where, lines in B.NEW_WORDS:
            a(f'<details class="pk"><summary><span class="n">&#9998;</span><span class="t">{e(where)}</span></summary><div class="pkb">' + ''.join(f'<p>{e(ln)}</p>' for ln in lines) + '</div></details>')
        if getattr(B, 'SHIPPED_YOUR_CALLS', None):
            a('<div class="left"><b>Calls of yours that I shipped anyway.</b> Small, reversible or an accessibility fix. Say “revert” and any of them goes in one commit.<ul>' + ''.join(f'<li>{e(c)}</li>' for c in B.SHIPPED_YOUR_CALLS) + '</ul></div>')

    a('<h2>What works. Keep it.</h2><ul class="keep">' + ''.join(f'<li>{e(k)}</li>' for k in B.KEEP) + '</ul>')

    a('<h2>See it</h2><p>Real screenshots from the live site, each checked the way a visitor sees it.</p><div class="figs">')
    s1, t1 = strip(STRIP_NOW, 'English home on a phone, section heights'); s2, t2 = strip(STRIP_GOAL, 'Proposed order, estimated heights')
    a(f'<div class="fig wide"><div class="stripcap"><span>Today: {t1:,} px ≈ {t1/844:.0f} phone screens</span><span>Hero, stats, fit check, testimonials, pricing, process, app, library, about, FAQ, contact, closing</span></div>{s1}'
      f'<div class="stripcap"><span>Proposed (package 12, estimate): {t2:,} px ≈ {t2/844:.0f} screens</span><span>Proof moves up, process before price, Contact folds into the footer</span></div>{s2}'
      f'<figcaption>The English home, section by section, drawn to scale. Hover a block for its name.</figcaption></div>')
    for fname, cap, pn in B.EVIDENCE:
        im = img_tag(images, fname, cap)
        if im: a(f'<figure class="fig">{im}<figcaption><b>pkg {pn}</b>{e(cap)}</figcaption></figure>')
    a('</div>')

    a('<h2>The plan</h2>')
    a('<div class="chips" role="group" aria-label="Filter the plan"><button type="button" aria-pressed="true" data-f="all">All</button>'
      + ''.join(f'<button type="button" aria-pressed="false" data-f="{k}">{e(t)}</button>' for k, t, _ in B.PHASES) + '</div>')
    for k, title, note in B.PHASES:
        pks = sorted_by_phase(k)
        if not pks: continue
        a(f'<section data-phase="{k}"><h3 style="margin:22px 0 6px;color:var(--green)">{e(title)}</h3><p class="phase-note">{e(note)}</p>')
        for p in pks: a(pk_html(p))
        a('</section>')

    a('<h2>Facts you have given me</h2><ul class="q">' + ''.join(f'<li>{e(q)}</li>' for q in B.FACTS) + '</ul>')
    a('<h2>Questions only you can answer</h2><ol class="q">' + ''.join(f'<li>{e(q)}</li>' for q in B.QUESTIONS) + '</ol>')

    a('<h2>The tools</h2><p>Your five, and what is actually popular and useful on GitHub. Stars measure fame, not audit ability, so I checked what each one really does.</p><div class="tbl"><table><thead><tr><th>Tool</th><th>Source</th><th>What it does</th><th>Verdict</th><th>How we use it</th></tr></thead><tbody>')
    for t in B.TOOLS: a('<tr>' + ''.join(f'<td>{e(x)}</td>' for x in t) + '</tr>')
    a('</tbody></table></div>')
    a('<p class="foot">How it was measured: a real Chrome opens every public page at 390, 820 and 1440 px (and 360, 1920), cuts it into screenshots, measures text contrast, tap targets, labels, fonts, images and load time on a simulated slow phone, and seven reviewers read every page. Analytics was blocked on every run so nothing counted as a visit, and no form was submitted. '
      'The working copy is <code>Content/SITE-AUDIT.md</code>; the tools are in <code>scripts/site_audit/</code>.</p>')
    a('</div>')
    a('''<script>
(function(){
  var chips=document.querySelectorAll('.chips button'),secs=document.querySelectorAll('section[data-phase]');
  chips.forEach(function(b){b.addEventListener('click',function(){
    chips.forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false')});
    var f=b.getAttribute('data-f');
    secs.forEach(function(s){s.hidden=!(f==='all'||s.getAttribute('data-phase')===f)});
  })});
})();
</script>''')
    return '\n'.join(o)

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--md', default=os.path.join(ROOT, 'Content', 'SITE-AUDIT.md'))
    ap.add_argument('--html'); ap.add_argument('--images')
    ar = ap.parse_args()
    if ar.html:
        open(ar.html, 'w', encoding='utf-8', newline='\n').write(build_html(ar.images or ''))
        print('html', ar.html, os.path.getsize(ar.html) // 1024, 'KB')
    else:
        open(ar.md, 'w', encoding='utf-8', newline='\n').write(build_md())
        print('md', ar.md, os.path.getsize(ar.md) // 1024, 'KB')
