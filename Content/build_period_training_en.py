# -*- coding: utf-8 -*-
import re
import base64

REPO = '/home/user/Website'
KIT = f'{REPO}/Content/Carousel-Kit.html'
OUT = f'{REPO}/Content/carousel-period-training.html'

with open(KIT, 'r', encoding='utf-8') as f:
    kit = f.read()

grey_m = re.search(r'\.progress-bar span\s*\{[^}]*?background-image:\s*url\("(data:[^"]+)"\)', kit, re.DOTALL)
orange_m = re.search(r'\.progress-bar span\.on\s*\{[^}]*?background-image:\s*url\("(data:[^"]+)"\)', kit, re.DOTALL)
tb_m = re.search(r'(<symbol id="tennis-ball".*?</symbol>)', kit, re.DOTALL)
grey = grey_m.group(1)
orange = orange_m.group(1)
tb = tb_m.group(1)
# Extract clay-ball PNG from the symbol — embed directly as SVG <image> in each arc
# so html2canvas renders it (it silently drops SVG <use>/<symbol> references)
tb_img_m = re.search(r'(data:image/png;base64,[^"\']+)', tb)
tb_img = tb_img_m.group(1) if tb_img_m else ''

with open(f'{REPO}/court-sessions.jpg', 'rb') as cf:
    court = 'data:image/jpeg;base64,' + base64.b64encode(cf.read()).decode('ascii')
with open(f'{REPO}/court-playbook.jpg', 'rb') as cf:
    court_clay = 'data:image/jpeg;base64,' + base64.b64encode(cf.read()).decode('ascii')
with open('/tmp/claude-0/-home-user-Website/e6aade57-d976-5942-8746-511ef5135eda/scratchpad/playbook-crop.png', 'rb') as af:
    playbook_img = 'data:image/png;base64,' + base64.b64encode(af.read()).decode('ascii')

print(f"grey={len(grey)} orange={len(orange)} tb={len(tb)} court={len(court)} clay_court={len(court_clay)} playbook={len(playbook_img)}")

def arc(d, cx, cy, r=12):
    sz = 52  # viewBox units; direct <image> so html2canvas renders it (no <use>/<symbol>)
    return (f'<div class="ballarc" aria-hidden="true"><svg viewBox="0 0 1080 1350"><g>'
            f'<path class="path" d="{d}"/>'
            f'<image href="{tb_img}" x="{int(cx-sz/2)}" y="{int(cy-sz/2)}" width="{sz}" height="{sz}"/>'
            f'</g></svg></div>')

def bars(n, k):  # n spans, k-th active (1-based)
    return ''.join('<span class="on"></span>' if i == k else '<span></span>' for i in range(1, n+1))

HEADER = '<div class="post-header"><div class="who"><span class="dot"></span>AMIRARDEKANI.COM</div></div>'

IG = """Your period doesn't cancel training.

Push straight through and you get a miserable, symptom-heavy session. Skip the whole week out of frustration and you feel like you've broken your own consistency — which makes the week after harder to start too. Neither is necessary.

Here's the version of the week that actually works:
↳ Cardio & mobility — full sets, don't cut it short
↳ Main lifts — about two sets, lighter load and RPE
↳ Anything with heavy ab-bracing work — skip it for the week

A quieter session isn't inconsistency. It's the correct response to what your body is doing that week.

What's the biggest myth you've heard about training on your period?

Full breakdown is now live in the app's Playbook — free for everyone to read, no login needed.

Comment "PERIOD" and I'll send you the link 👇

@amirardekanian

#periodtraining #womenshealth #femaleathlete #strengthandconditioning #tennisfitness #trainsmart #sportsscience #consistency #recoveryweek #padel"""

# ===================== SLIDES =====================
slides = []

# 1 · COVER (dark, green court) — hook
slides.append(('cover', '', f'''
  {arc("M-40 360 Q 460 170 980 510", 980, 510)}
  {HEADER}
  <div class="body-wrap">
    <div class="chip-B">Period-Week Protocol</div>
    <h1>Your period doesn't cancel <span class="hl">training.</span></h1>
    <div class="sub">A modified week isn't a missed week — here's exactly what to do.</div>
  </div>
  <div class="post-footer">
    <div class="progress-bar">{bars(7,1)}</div>
    <div class="swipe">Swipe <span class="arrow"></span></div>
  </div>''', court))

# 2 · BIG (dark, green court) — debunk the phasing myth, set up simplicity
slides.append(('big', '', f'''
  {arc("M-40 800 Q 480 650 1015 800", 1015, 800)}
  {HEADER}
  <div class="body-wrap">
    <h1>This isn't about phasing your <span class="acc">cycle.</span></h1>
  </div>
  <div class="footnote">— No performance tracking. No timing lifts to your cycle. Just protecting the habit through a hard week.</div>
  <div class="post-footer"><div class="progress-bar">{bars(7,2)}</div></div>''', court))

# 3 · COMPARE (dark, no court) — what stays vs what backs off
slides.append(('compare', '', f'''
  {arc("M300 690 Q 540 470 780 690", 780, 690)}
  {HEADER}
  <div class="body-wrap">
    <h1>What stays. What <span class="hl">backs off.</span></h1>
  </div>
  <div class="cols">
    <div class="col-card bad">
      <div class="col-tag">— Backs off</div>
      <ul class="col-list">
        <li>Heavier main lifts</li>
        <li>Weighted ab-bracing work</li>
        <li>Pushing through sharp pain</li>
      </ul>
    </div>
    <div class="col-card good">
      <div class="col-tag">→ Stays full</div>
      <ul class="col-list">
        <li>Cardio & mobility</li>
        <li>Light hip & glute work</li>
        <li>Full duration, easy effort</li>
      </ul>
    </div>
  </div>
  <div class="post-footer"><div class="progress-bar">{bars(7,3)}</div></div>''', None))

# 4 · RULES (light) — the exact protocol recap
CHK = '<div class="check"><svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-11" stroke="#0A0A0A" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></div>'
slides.append(('rules light', '', f'''
  {arc("M-40 470 Q 480 340 1010 480", 1010, 480)}
  {HEADER}
  <div class="body-wrap">
    <div class="chip-B">The protocol</div>
    <h1>Run this <span class="hl">version</span> of the week.</h1>
  </div>
  <div class="cards">
    <div class="rule-card">{CHK}<div class="body"><div class="ttl">Cardio & mobility</div><div class="sub">Full sets — don't cut it short</div></div><div class="num">01</div></div>
    <div class="rule-card">{CHK}<div class="body"><div class="ttl">Main lifts</div><div class="sub">~2 sets, lighter load &amp; RPE</div></div><div class="num">02</div></div>
    <div class="rule-card">{CHK}<div class="body"><div class="ttl">Ab-bracing work</div><div class="sub">Zero for the week</div></div><div class="num">03</div></div>
  </div>
  <div class="post-footer"><div class="progress-bar">{bars(7,4)}</div></div>''', None))

# 5 · BIG (dark, no court) — the mindset reframe
slides.append(('big', '', f'''
  {arc("M-40 800 Q 480 650 1015 800", 1015, 800)}
  {HEADER}
  <div class="body-wrap">
    <h1>A lighter session isn't <span class="acc">inconsistency.</span></h1>
  </div>
  <div class="footnote">— It's the correct response to what your body is doing that week.</div>
  <div class="post-footer"><div class="progress-bar">{bars(7,5)}</div></div>''', None))

# 6 · BIG variant w/ app-screen (clay court, ties to the Playbook's own clay branding)
# No rally arc here — the app-screen mock fills most of the clear space; an arc would
# either cross the eyebrow/headline or the phone.
slides.append(('big', '', f'''
  {HEADER}
  <div class="body-wrap">
    <div class="chip-B">Added to the Playbook</div>
    <h1>Read the full <span class="acc">breakdown.</span></h1>
  </div>
  <div class="app-screen"><img src="{playbook_img}" alt="Training On Your Period in the app Playbook"></div>
  <div class="post-footer"><div class="progress-bar">{bars(7,6)}</div></div>''', court_clay))

# 7 · CTA (dark, green court)
slides.append(('cta', '', f'''
  {arc("M 80 1080 Q 520 940 980 880", 980, 880, 13)}
  {HEADER}
  <div class="body-wrap">
    <div class="chip-B">Your move</div>
    <h1>A <span class="hl">coach</span> in your pocket.</h1>
    <div class="cta-prompt">It's already in your Playbook — comment "PERIOD" and I'll send the link. Free, no login needed.</div>
    <div class="actions">
      <div class="cta-btn primary"><svg viewBox="0 0 24 24" fill="none"><path d="M5 4h14v17l-7-4-7 4z" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/></svg>Save this post</div>
      <div class="cta-btn ghost">Follow</div>
    </div>
  </div>
  <div class="post-footer"><div class="progress-bar">{bars(7,7)}</div></div>''', court))

# ===================== ASSEMBLE =====================
shots = []
for i, (cls, _extra, inner, bg) in enumerate(slides, 1):
    shots.append(f'''<div class="shot"><button class="dl">⬇ PNG</button>
<div class="post-canvas tpl-{cls}" id="s{i}">{inner}
</div></div>''')
deck = "\n\n".join(shots)

html = f"""<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Training On Your Period — AA Performance</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700;800;900&family=Barlow:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>

<!-- IG CAPTION
{IG}
-->

<style>
:root {{
  --accent:#C7552F; --clay:#C7552F; --clay-2:#E06B43;
  --green:#0E4A36; --ink:#0E4A36; --paper:#FAF7F2; --body-ink:#1A1A1A;
  --court:rgba(255,255,255,0.16);
  --display:'Barlow Condensed',system-ui,sans-serif;
  --mono:'Barlow Condensed',system-ui,sans-serif;
  --latin:'Barlow',system-ui,sans-serif;
  --pad-edge:64px;
}}
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0;}}
html,body{{background:#16161a;color:var(--paper);font-family:var(--display);}}

.topbar{{max-width:1080px;margin:0 auto;padding:26px 20px 6px;color:#cfc9bf;}}
.topbar h1{{font-size:24px;font-weight:700;margin-bottom:8px;letter-spacing:-.01em;}}
.topbar p{{font-size:14px;line-height:1.9;color:#b8b2a6;font-family:var(--latin);}}
.topbar b{{color:#fff;}}
.deck{{display:flex;flex-direction:column;align-items:center;gap:26px;padding:18px 12px 80px;}}
.shot{{position:relative;width:1080px;max-width:100%;}}
.dl{{position:absolute;top:12px;left:12px;z-index:10;cursor:pointer;background:rgba(0,0,0,.55);color:#fff;
  border:none;border-radius:9px;padding:9px 14px;font-family:var(--mono);font-size:14px;font-weight:600;letter-spacing:.04em;}}
.dl:hover{{background:#000;}}

/* ===== CANVAS ===== */
.post-canvas{{width:1080px;height:1350px;position:relative;overflow:hidden;
  background-color:var(--ink);
  background-size:cover;background-position:center;
  color:var(--paper);font-family:var(--display);max-width:100%;}}
.post-canvas.light{{background:var(--paper);color:var(--body-ink);}}
.post-canvas::before{{content:"";position:absolute;inset:0;pointer-events:none;z-index:5;
  border:2px solid rgba(255,255,255,.30);margin:28px;border-radius:14px;}}
.post-canvas.light::before{{border-color:rgba(0,0,0,.18);}}
.post-canvas::after{{content:"";position:absolute;inset:0;pointer-events:none;z-index:6;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
  background-size:220px 220px;opacity:.06;}}
.post-canvas.light::after{{opacity:.045;}}

/* ===== Per-slide court background (green = default/general, clay = Playbook slide) ===== */
#s1{{background-image:linear-gradient(to bottom, rgba(14,74,54,0.42) 0%, rgba(14,74,54,0.72) 100%), url("{court}");}}
#s2{{background-image:linear-gradient(to bottom, rgba(14,74,54,0.42) 0%, rgba(14,74,54,0.72) 100%), url("{court}");}}
#s6{{background-image:linear-gradient(to bottom, rgba(199,85,47,0.50) 0%, rgba(20,20,20,0.80) 100%), url("{court_clay}");}}
#s7{{background-image:linear-gradient(to bottom, rgba(14,74,54,0.42) 0%, rgba(14,74,54,0.72) 100%), url("{court}");}}

/* ===== RALLY ARC ===== */
.ballarc{{position:absolute;inset:0;pointer-events:none;z-index:0;}}
.ballarc svg{{width:100%;height:100%;display:block;overflow:visible;}}
.ballarc .path{{fill:none;stroke:var(--clay);stroke-width:6;stroke-dasharray:2 26;stroke-linecap:round;opacity:.75;}}
.ballarc .dot{{fill:var(--clay);}}
.post-canvas:not(.light) .ballarc .path{{stroke:var(--clay-2);}}
.post-canvas:not(.light) .ballarc .dot{{fill:var(--clay-2);}}

/* ===== CHROME ===== */
.post-header{{position:absolute;top:var(--pad-edge);left:var(--pad-edge);right:var(--pad-edge);
  display:flex;align-items:center;justify-content:space-between;z-index:4;
  font-family:var(--mono);font-size:24px;font-weight:500;letter-spacing:.06em;}}
.post-header .who{{display:flex;align-items:center;gap:14px;}}
.post-header .dot{{width:14px;height:14px;border-radius:50%;background:var(--accent);}}
.post-footer{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);bottom:var(--pad-edge);
  display:flex;align-items:flex-end;justify-content:space-between;gap:24px;z-index:4;}}

.progress-bar{{display:flex;gap:14px;align-items:center;flex:0 1 auto;direction:ltr;}}
.progress-bar span{{width:24px;height:24px;flex:0 0 auto;background:center/contain no-repeat;
  background-image:url("{grey}");}}
.progress-bar span.on{{background-image:url("{orange}");
  transform:scale(1.14);filter:drop-shadow(0 0 5px rgba(226,112,60,.5));}}

.swipe{{font-family:var(--mono);font-size:24px;letter-spacing:.1em;text-transform:uppercase;
  display:flex;align-items:center;gap:14px;opacity:.9;}}
.swipe .arrow{{width:56px;height:1.5px;background:currentColor;position:relative;}}
.swipe .arrow::after{{content:"";position:absolute;right:0;top:-5px;width:12px;height:12px;
  border-right:1.5px solid currentColor;border-top:1.5px solid currentColor;transform:rotate(45deg);}}

/* ===== TYPE BITS ===== */
.chip-A{{display:inline-block;background:var(--accent);color:#fff;font-family:var(--mono);
  font-size:26px;font-weight:600;padding:11px 20px 9px;letter-spacing:.12em;text-transform:uppercase;}}
.chip-B{{font-family:var(--mono);font-size:26px;font-weight:500;color:var(--accent);
  display:flex;align-items:center;gap:18px;letter-spacing:.12em;text-transform:uppercase;}}
.chip-B::before{{content:"";display:block;width:64px;height:2px;background:var(--accent);flex-shrink:0;}}
.post-canvas:not(.light) .chip-B::before{{background:rgba(255,255,255,.60);}}
.post-canvas.light .chip-B{{color:var(--ink);}}
.post-canvas.light .chip-B::before{{background:var(--ink);}}
.hl{{background:var(--clay);color:#fff;padding:0 .1em;box-decoration-break:clone;-webkit-box-decoration-break:clone;}}
.acc{{color:var(--clay-2);}}
.post-canvas.light .acc{{color:var(--clay);}}

/* ===== TPL-COVER ===== */
.tpl-cover .body-wrap{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);bottom:240px;}}
.tpl-cover .chip-B{{margin-bottom:32px;}}
.tpl-cover h1{{font-size:140px;font-weight:800;letter-spacing:-0.04em;line-height:1.0;}}
.tpl-cover .sub{{font-size:46px;font-weight:500;font-family:var(--latin);color:rgba(244,244,240,.55);margin-top:28px;letter-spacing:0;}}

/* ===== TPL-BIG ===== */
.tpl-big .body-wrap{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);top:220px;}}
.tpl-big h1{{font-size:150px;font-weight:800;letter-spacing:-0.04em;line-height:.94;}}
.tpl-big .footnote{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);bottom:240px;
  font-family:var(--mono);font-size:34px;font-weight:500;color:rgba(244,244,240,.60);letter-spacing:.04em;text-transform:uppercase;line-height:1.4;}}

/* ===== TPL-COMPARE ===== */
.tpl-compare .body-wrap{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);top:200px;}}
.tpl-compare h1{{font-size:96px;font-weight:800;letter-spacing:-0.025em;line-height:1;max-width:820px;}}
.tpl-compare .cols{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);bottom:200px;
  display:grid;grid-template-columns:1fr 1fr;gap:24px;}}
.col-card{{border-radius:22px;padding:36px;min-height:380px;}}
.col-card .col-tag{{font-family:var(--mono);font-size:22px;letter-spacing:.12em;text-transform:uppercase;margin-bottom:24px;}}
.col-card .col-list{{list-style:none;display:flex;flex-direction:column;gap:16px;}}
.col-card .col-list li{{font-size:36px;font-weight:600;letter-spacing:-0.01em;line-height:1.2;padding-left:36px;position:relative;}}
.col-card .col-list li::before{{content:"";position:absolute;left:0;top:.5em;width:18px;height:2px;background:currentColor;}}
.col-card.bad{{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);color:rgba(244,244,240,.5);}}
.col-card.bad .col-tag{{color:rgba(244,244,240,.4);}}
.col-card.bad .col-list li{{text-decoration:line-through;text-decoration-color:rgba(244,244,240,.25);}}
.col-card.good{{background:var(--accent);color:#fff;}}
.col-card.good .col-tag{{color:#fff;opacity:.78;}}
.col-card.good .col-list li::before{{background:#fff;}}

/* ===== TPL-RULES (light) ===== */
.tpl-rules .body-wrap{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);top:200px;}}
.tpl-rules .chip-B{{margin-bottom:36px;}}
.tpl-rules h1{{font-size:110px;font-weight:800;letter-spacing:-0.03em;line-height:.98;}}
.tpl-rules .cards{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);bottom:220px;display:flex;flex-direction:column;gap:18px;}}
.rule-card{{background:var(--ink);color:var(--paper);border-radius:18px;padding:30px 36px;display:flex;align-items:center;gap:28px;}}
.rule-card .check{{width:80px;height:80px;border-radius:50%;background:var(--accent);display:grid;place-items:center;flex-shrink:0;}}
.rule-card .check svg{{width:38px;height:38px;}}
.rule-card .check svg path{{stroke:#fff;}}
.rule-card .body{{flex:1;color:var(--paper);}}
.rule-card .ttl{{font-size:54px;font-weight:700;letter-spacing:-0.02em;line-height:1.1;}}
.rule-card .sub{{font-family:var(--mono);font-size:22px;color:rgba(244,244,240,.55);letter-spacing:.08em;text-transform:uppercase;margin-top:6px;}}
.rule-card .num{{font-family:var(--mono);font-size:28px;color:var(--clay-2);letter-spacing:.06em;}}

/* ===== TPL-CTA ===== */
.tpl-cta .body-wrap{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);top:50%;transform:translateY(-55%);}}
.tpl-cta .chip-B{{margin-bottom:28px;}}
.tpl-cta h1{{font-size:124px;font-weight:800;letter-spacing:-0.03em;line-height:.95;}}
.tpl-cta .cta-prompt{{font-family:var(--latin);font-size:30px;color:rgba(244,244,240,.7);margin-top:36px;line-height:1.55;letter-spacing:0;max-width:820px;}}
.tpl-cta .actions{{display:flex;gap:16px;margin-top:40px;flex-wrap:wrap;}}
.cta-btn{{display:inline-flex;align-items:center;gap:12px;padding:22px 32px;border-radius:999px;
  font-family:var(--mono);font-size:26px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;}}
.cta-btn.primary{{background:var(--accent);color:#fff;}}
.cta-btn.ghost{{border:2px solid rgba(244,244,240,.3);color:var(--paper);}}
.cta-btn svg{{width:28px;height:28px;}}

/* ===== APP SCREEN PREVIEW (slide 6 — the Playbook proof) ===== */
/* left:(1080-370)/2=355px — no CSS transform (html2canvas ignores translateX) */
.app-screen{{position:absolute;left:355px;top:400px;
  width:370px;max-height:860px;border-radius:28px;overflow:hidden;
  box-shadow:0 28px 72px rgba(0,0,0,.60),0 0 0 1px rgba(255,255,255,.10);}}
.app-screen img{{width:100%;display:block;}}
#s6 .body-wrap{{top:130px;}}
#s6 h1{{font-size:104px;}}
#s6 .chip-B{{color:#fff;}}
#s5 h1{{font-size:94px;line-height:1.05;}}

/* ===== CLAY-CONTRAST FIXES ===== */
.chip-A,.col-card.good,.cta-btn.primary{{color:#fff;}}
</style>
</head>
<body>

<svg width="0" height="0" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">
  {tb}
</svg>

<div class="topbar">
  <h1>Training On Your Period — 7 slides</h1>
  <p>1080×1350px · Click <b>⬇ PNG</b> on each slide to export. Serve via <b>python -m http.server 8000</b> for correct font rendering.</p>
</div>

<div class="deck">

{deck}

</div><!-- .deck -->

<script>
  function initExport(){{
    document.querySelectorAll('.dl').forEach(function(btn){{
      btn.addEventListener('click', async function(){{
        var slide = btn.parentElement.querySelector('.post-canvas');
        var label = btn.textContent; btn.textContent = '…';
        try{{
          var canvas = await html2canvas(slide,{{scale:1,useCORS:true,backgroundColor:null,logging:false}});
          var a=document.createElement('a'); a.href=canvas.toDataURL('image/png');
          a.download=slide.id+'.png'; a.click();
        }}catch(e){{ alert('Export failed — open via a local server.'); }}
        btn.textContent=label;
      }});
    }});
  }}
  if(window.html2canvas) document.fonts.ready.then(initExport);
</script>

<!-- clay ball embedded directly as SVG <image> in each arc — no JS swap needed -->
</body>
</html>"""

with open(OUT, 'w', encoding='utf-8') as f:
    f.write(html)
print(f"Written: {len(html)} chars")
