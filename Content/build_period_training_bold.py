# -*- coding: utf-8 -*-
# BOLD/EDITORIAL variant — same content as carousel-period-training.html, a much
# more aggressive visual system: hard edges, huge scale contrast, ghost numerals,
# a full-clay canvas, a hard 50/50 split instead of rounded cards, a manifesto-style
# rules list, a rubber-stamp badge. Brand non-negotiables kept (palette, fonts,
# header/pagination chrome, frame) — everything else pushed hard.
import re
import base64

REPO = '/home/user/Website'
KIT = f'{REPO}/Content/Carousel-Kit.html'
OUT = f'{REPO}/Content/carousel-period-training-bold.html'

with open(KIT, 'r', encoding='utf-8') as f:
    kit = f.read()

grey_m = re.search(r'\.progress-bar span\s*\{[^}]*?background-image:\s*url\("(data:[^"]+)"\)', kit, re.DOTALL)
orange_m = re.search(r'\.progress-bar span\.on\s*\{[^}]*?background-image:\s*url\("(data:[^"]+)"\)', kit, re.DOTALL)
tb_m = re.search(r'(<symbol id="tennis-ball".*?</symbol>)', kit, re.DOTALL)
grey = grey_m.group(1)
orange = orange_m.group(1)
tb = tb_m.group(1)
tb_img_m = re.search(r'(data:image/png;base64,[^"\']+)', tb)
tb_img = tb_img_m.group(1) if tb_img_m else ''

with open(f'{REPO}/court-sessions.jpg', 'rb') as cf:
    court = 'data:image/jpeg;base64,' + base64.b64encode(cf.read()).decode('ascii')
with open(f'{REPO}/court-playbook.jpg', 'rb') as cf:
    court_clay = 'data:image/jpeg;base64,' + base64.b64encode(cf.read()).decode('ascii')
with open('/tmp/claude-0/-home-user-Website/e6aade57-d976-5942-8746-511ef5135eda/scratchpad/playbook-crop.png', 'rb') as af:
    playbook_img = 'data:image/png;base64,' + base64.b64encode(af.read()).decode('ascii')

print(f"grey={len(grey)} orange={len(orange)} tb={len(tb)} court={len(court)} clay_court={len(court_clay)} playbook={len(playbook_img)}")

def ball(cx, cy, sz=64):
    return f'<img class="ball-img" src="{tb_img}" style="left:{int(cx-sz/2)}px;top:{int(cy-sz/2)}px;width:{sz}px;height:{sz}px;">'

def ghost(n, x, y, size=560):
    return f'<div class="ghost-num" style="left:{x}px;top:{y}px;font-size:{size}px;">{n:02d}</div>'

def bars(n, k):
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

# 1 · COVER — high-contrast duotone court, ghost "01", stamped eyebrow, huge headline
slides.append(('b1', f'''
  {ghost(1, -70, 96, 640)}
  {ball(966, 244, 66)}
  {HEADER}
  <div class="body-wrap">
    <div class="stamp-tag">Period-Week Protocol</div>
    <h1 class="huge">Your period<br>doesn't cancel<br><span class="hl-hard">training.</span></h1>
    <div class="sub-bold">A modified week isn't a missed week — here's exactly what to do.</div>
  </div>
  <div class="post-footer">
    <div class="progress-bar">{bars(7,1)}</div>
    <div class="swipe">Swipe <span class="arrow"></span></div>
  </div>''', court))

# 2 · FULL-CLAY STATEMENT — the loud myth-kill, canvas flips to solid clay
slides.append(('b2', f'''
  {ghost(2, 640, 900, 560)}
  {HEADER}
  <div class="body-wrap">
    <div class="stamp-tag stamp-tag-dark">No Phasing</div>
    <h1 class="huge huge-clay">This isn't about<br>phasing your<br><span class="strike-hard">cycle.</span></h1>
  </div>
  <div class="footnote-bold">No performance tracking. No timing lifts to your cycle. Just protecting the habit through a hard week.</div>
  <div class="post-footer"><div class="progress-bar">{bars(7,2)}</div></div>''', None))

# 3 · HARD SPLIT — edge-to-edge halves, no cards, no rounded corners
slides.append(('b3', f'''
  {HEADER}
  <div class="split-head">What stays.<br>What <span class="hl-hard">backs off.</span></div>
  <div class="split-wrap">
    <div class="split-half bad">
      <div class="split-tag">— Backs off</div>
      <div class="split-item">Heavier main lifts</div>
      <div class="split-item">Weighted ab-bracing work</div>
      <div class="split-item">Pushing through sharp pain</div>
    </div>
    <div class="split-half good">
      <div class="split-tag">→ Stays full</div>
      <div class="split-item">Cardio &amp; mobility</div>
      <div class="split-item">Light hip &amp; glute work</div>
      <div class="split-item">Full duration, easy effort</div>
    </div>
  </div>
  <div class="post-footer" style="z-index:7;"><div class="progress-bar">{bars(7,3)}</div></div>''', None))

# 4 · MANIFESTO — no cards, huge bleeding numerals, thick rules, a rotated SKIP stamp
slides.append(('b4', f'''
  {HEADER}
  <div class="body-wrap manifesto-head">
    <div class="stamp-tag">The protocol</div>
    <h1 class="huge huge-dark">Run this <span class="hl-hard">version</span> of the week.</h1>
  </div>
  <div class="manifesto">
    <div class="manifesto-row do">
      <div class="m-num">01</div>
      <div class="m-body"><div class="m-ttl">Cardio &amp; mobility</div><div class="m-cue">Full sets — don't cut it short</div></div>
    </div>
    <div class="manifesto-row do">
      <div class="m-num">02</div>
      <div class="m-body"><div class="m-ttl">Main lifts</div><div class="m-cue">~2 sets, lighter load &amp; RPE</div></div>
    </div>
    <div class="manifesto-row avoid">
      <div class="m-num">03</div>
      <div class="m-body"><div class="m-ttl">Ab-bracing work</div><div class="m-cue">Zero for the week</div></div>
      <div class="stamp-skip"><span>Skip</span></div>
    </div>
  </div>
  <div class="post-footer"><div class="progress-bar">{bars(7,4)}</div></div>''', None))

# 5 · FULL-CLAY MINDSET STATEMENT — same loud treatment as slide 2, closes the reframe
slides.append(('b5', f'''
  {ghost(5, 620, -60, 620)}
  {ball(70, 1120, 60)}
  {HEADER}
  <div class="body-wrap">
    <h1 class="huge huge-clay">A lighter session<br>isn't <span class="strike-hard">inconsistency.</span></h1>
  </div>
  <div class="footnote-bold footnote-clay">It's the correct response to what your body is doing that week.</div>
  <div class="post-footer"><div class="progress-bar">{bars(7,5)}</div></div>''', None))

# 6 · PLAYBOOK FEATURE — tilted phone card, ribbon badge, ghost numeral
slides.append(('b6', f'''
  {ghost(6, -80, 860, 560)}
  {HEADER}
  <div class="body-wrap">
    <div class="stamp-tag">Added to the Playbook</div>
    <h1 class="huge" style="font-size:104px;">Read the full <span class="hl-hard">breakdown.</span></h1>
  </div>
  <div class="ribbon">Free · No login</div>
  <div class="app-screen-bold"><img src="{playbook_img}" alt="Training On Your Period in the app Playbook"></div>
  <div class="post-footer"><div class="progress-bar">{bars(7,6)}</div></div>''', court_clay))

# 7 · CTA — huge word close, minimal, one button
slides.append(('b7', f'''
  {ghost(7, 660, 40, 620)}
  {ball(962, 210, 64)}
  {HEADER}
  <div class="body-wrap cta-wrap">
    <div class="stamp-tag">Your move</div>
    <h1 class="huge">A <span class="hl-hard">coach</span><br>in your pocket.</h1>
    <div class="sub-bold">Want customised coaching — with attention to every need? Send me a DM to start.</div>
    <div class="actions-bold">
      <div class="cta-btn-bold primary">DM to start</div>
      <div class="cta-btn-bold ghost">Follow</div>
    </div>
  </div>
  <div class="post-footer"><div class="progress-bar">{bars(7,7)}</div></div>''', court))

# ===================== ASSEMBLE =====================
shots = []
for i, (cls, inner, bg) in enumerate(slides, 1):
    shots.append(f'''<div class="shot"><button class="dl">⬇ PNG</button>
<div class="post-canvas {cls}" id="{cls}">{inner}
</div></div>''')
deck = "\n\n".join(shots)

html = f"""<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Training On Your Period — BOLD variant — AA Performance</title>
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
.post-canvas::before{{content:"";position:absolute;inset:0;pointer-events:none;z-index:5;
  border:3px solid rgba(255,255,255,.34);margin:24px;}}
.post-canvas::after{{content:"";position:absolute;inset:0;pointer-events:none;z-index:6;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
  background-size:220px 220px;opacity:.07;}}

/* Per-slide backgrounds */
.b1{{background-image:linear-gradient(to bottom, rgba(10,10,10,.28) 0%, rgba(10,10,10,.90) 78%), url("{court}");}}
.b2{{background-color:var(--clay);}}
.b3{{background-color:var(--ink);}}
.b4{{background-color:var(--paper);color:var(--body-ink);}}
.b4 .post-canvas::before{{border-color:rgba(0,0,0,.22);}}
.b5{{background-color:var(--ink);}}
.b6{{background-image:linear-gradient(to bottom, rgba(199,85,47,.42) 0%, rgba(10,10,10,.86) 100%), url("{court_clay}");}}
.b7{{background-image:linear-gradient(to bottom, rgba(10,10,10,.30) 0%, rgba(10,10,10,.88) 100%), url("{court}");}}
.b4::before{{border-color:rgba(0,0,0,.22);}}

/* ===== CHROME (header/footer/pagination — brand non-negotiables, kept) ===== */
.post-header{{position:absolute;top:var(--pad-edge);left:var(--pad-edge);right:var(--pad-edge);
  display:flex;align-items:center;justify-content:space-between;z-index:8;
  font-family:var(--mono);font-size:24px;font-weight:500;letter-spacing:.06em;}}
.post-header .who{{display:flex;align-items:center;gap:14px;}}
.post-header .dot{{width:14px;height:14px;border-radius:50%;background:var(--accent);}}
.b4 .post-header{{color:var(--body-ink);}}
.post-footer{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);bottom:var(--pad-edge);
  display:flex;align-items:flex-end;justify-content:space-between;gap:24px;z-index:8;}}
.b4 .post-footer{{color:var(--body-ink);}}

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

.ball-img{{position:absolute;z-index:3;pointer-events:none;filter:drop-shadow(0 6px 14px rgba(0,0,0,.35));}}

/* ===== GHOST NUMERAL — huge translucent background numeral, no transform ===== */
.ghost-num{{position:absolute;font-family:var(--display);font-weight:900;line-height:1;
  letter-spacing:-0.05em;color:rgba(255,255,255,.08);z-index:0;pointer-events:none;}}
.b4 .ghost-num{{color:rgba(14,74,54,.07);}}
.b2 .ghost-num,.b6 .ghost-num{{color:rgba(255,255,255,.14);}}

/* ===== STAMP TAG — solid hard-edge eyebrow block ===== */
.stamp-tag{{display:inline-block;background:var(--paper);color:#0A0A0A;font-family:var(--mono);
  font-size:28px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;
  padding:14px 26px;margin-bottom:36px;}}
.stamp-tag-dark{{background:#0A0A0A;color:var(--paper);}}
.b4 .stamp-tag{{background:var(--ink);color:var(--paper);}}

/* ===== TYPE ===== */
.body-wrap{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);bottom:250px;z-index:2;}}
.huge{{font-size:126px;font-weight:900;letter-spacing:-0.045em;line-height:.94;}}
.huge-clay{{color:#fff;}}
.huge-dark{{color:var(--body-ink);}}
.hl-hard{{background:#0A0A0A;color:#fff;padding:0 .14em;box-decoration-break:clone;-webkit-box-decoration-break:clone;}}
.b2 .hl-hard,.b5 .hl-hard{{background:var(--paper);color:#0A0A0A;}}
.strike-hard{{position:relative;display:inline-block;color:rgba(255,255,255,.55);}}
.strike-hard::after{{content:"";position:absolute;left:-4%;right:-4%;top:52px;height:14px;
  background:#0A0A0A;}}
.sub-bold{{font-size:52px;font-weight:700;font-family:var(--latin);color:rgba(244,244,240,.85);
  margin-top:32px;letter-spacing:0;line-height:1.28;max-width:900px;}}
.footnote-bold{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);bottom:250px;z-index:2;
  font-family:var(--mono);font-size:42px;font-weight:700;color:rgba(10,10,10,.72);letter-spacing:.01em;
  text-transform:uppercase;line-height:1.3;max-width:920px;}}
.footnote-clay{{color:rgba(244,244,240,.82);}}

/* ===== SLIDE 1 ===== */
.b1 .body-wrap .huge{{font-size:128px;}}

/* ===== SLIDE 2 / 5 — full-clay & full-green statements: headline grows down from
   the top so the footnote (anchored to the bottom) never collides with it ===== */
.b2 .body-wrap,.b5 .body-wrap{{bottom:auto;top:230px;}}

/* ===== SLIDE 3 — hard split ===== */
.split-head{{position:absolute;top:190px;left:var(--pad-edge);right:var(--pad-edge);z-index:3;
  font-size:92px;font-weight:900;letter-spacing:-0.03em;line-height:1.02;}}
.split-wrap{{position:absolute;left:0;right:0;bottom:0;top:610px;display:grid;grid-template-columns:1fr 1fr;z-index:2;}}
.split-half{{padding:56px 48px;display:flex;flex-direction:column;gap:26px;}}
.split-tag{{font-family:var(--mono);font-size:32px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;margin-bottom:10px;}}
.split-item{{font-size:38px;font-weight:700;letter-spacing:-0.01em;line-height:1.22;padding-left:0;}}
.split-half.bad{{background:#0A0A0A;color:rgba(244,244,240,.45);border-right:3px solid rgba(255,255,255,.14);}}
.split-half.bad .split-tag{{color:rgba(244,244,240,.85);}}
.split-half.bad .split-item{{text-decoration:line-through;text-decoration-color:rgba(244,244,240,.3);text-decoration-thickness:3px;}}
.split-half.good{{background:var(--accent);color:#fff;}}
.split-half.good .split-tag{{color:#fff;}}

/* ===== SLIDE 4 — manifesto ===== */
.b4 .body-wrap{{bottom:auto;top:190px;}}
.b4 .huge{{font-size:96px;}}
.manifesto{{position:absolute;left:0;right:0;bottom:64px;top:560px;display:flex;flex-direction:column;}}
.manifesto-row{{position:relative;flex:1;display:flex;align-items:center;gap:36px;
  border-top:4px solid rgba(10,10,10,.85);padding:0 var(--pad-edge) 0 190px;}}
.manifesto-row:last-child{{border-bottom:4px solid rgba(10,10,10,.85);}}
.m-num{{position:absolute;left:-26px;top:0;bottom:0;display:flex;align-items:center;
  font-size:190px;font-weight:900;letter-spacing:-0.06em;color:rgba(10,10,10,.92);line-height:1;}}
.manifesto-row.avoid .m-num{{color:rgba(10,10,10,.28);}}
.m-ttl{{font-size:62px;font-weight:800;letter-spacing:-0.02em;line-height:1.15;}}
.m-cue{{font-family:var(--mono);font-size:28px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;
  color:rgba(10,10,10,.6);margin-top:20px;}}
.manifesto-row.avoid .m-ttl{{color:rgba(10,10,10,.45);font-weight:700;}}
.manifesto-row.avoid .m-cue{{color:rgba(10,10,10,.4);}}
.stamp-skip{{position:absolute;right:64px;top:0;bottom:0;display:flex;align-items:center;}}
.stamp-skip span{{display:inline-block;transform:rotate(-9deg);
  border:5px solid var(--accent);color:var(--accent);font-family:var(--mono);font-weight:900;
  font-size:34px;letter-spacing:.12em;text-transform:uppercase;padding:8px 22px;}}

/* ===== SLIDE 6 — feature ===== */
.b6 .body-wrap{{bottom:auto;top:170px;}}
.app-screen-bold{{position:absolute;left:365px;top:520px;width:350px;
  border:4px solid #fff;box-shadow:0 30px 80px rgba(0,0,0,.55);z-index:2;}}
.app-screen-bold img{{width:100%;display:block;}}
.ribbon{{position:absolute;top:456px;right:64px;background:#0A0A0A;color:#fff;z-index:3;
  font-family:var(--mono);font-weight:800;font-size:24px;letter-spacing:.1em;text-transform:uppercase;
  padding:12px 22px;}}

/* ===== SLIDE 7 — CTA ===== */
.cta-wrap{{bottom:230px;}}
.actions-bold{{display:flex;gap:16px;margin-top:44px;flex-wrap:wrap;}}
.cta-btn-bold{{display:inline-flex;align-items:center;padding:26px 40px;
  font-family:var(--mono);font-size:28px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;}}
.cta-btn-bold.primary{{background:#fff;color:#0A0A0A;}}
.cta-btn-bold.ghost{{border:3px solid rgba(244,244,240,.5);color:var(--paper);}}
</style>
</head>
<body>

<div class="topbar">
  <h1>Training On Your Period — BOLD variant — 7 slides</h1>
  <p>1080×1350px · Same content, more aggressive editorial system: hard edges, ghost numerals, a full-clay statement slide, a manifesto-style protocol list. Click <b>⬇ PNG</b> to export. Serve via <b>python -m http.server 8000</b> for correct font rendering.</p>
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

</body>
</html>"""

with open(OUT, 'w', encoding='utf-8') as f:
    f.write(html)
print(f"Written: {len(html)} chars")
