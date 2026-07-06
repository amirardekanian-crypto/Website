# -*- coding: utf-8 -*-
# v2 — imports the liked elements from the BOLD variant (carousel-period-training-bold.html)
# into this, the primary deck: a plain tennis ball (no dashed arc), a huge translucent
# background page-number per slide (replacing the tennis-ball pagination dots — the
# number IS the page indicator now), white "stamp" eyebrow boxes, black highlight
# boxes/text where it reads stronger, a darker moodier court-photo treatment, and
# slide 4 rebuilt entirely as the manifesto/protocol layout. Every green or clay slide
# keeps the real court photo behind it (darker overlay, but never a flat color).
import re
import base64

REPO = '/home/user/Website'
KIT = f'{REPO}/Content/Carousel-Kit.html'
OUT = f'{REPO}/Content/carousel-period-training.html'

with open(KIT, 'r', encoding='utf-8') as f:
    kit = f.read()

tb_m = re.search(r'(<symbol id="tennis-ball".*?</symbol>)', kit, re.DOTALL)
tb = tb_m.group(1)
# Extract the clay-ball PNG from inside the kit's <symbol> and embed it as a plain
# <img> — no SVG <use>/<symbol> reference, which html2canvas silently drops.
tb_img_m = re.search(r'(data:image/png;base64,[^"\']+)', tb)
tb_img = tb_img_m.group(1) if tb_img_m else ''

with open(f'{REPO}/court-sessions.jpg', 'rb') as cf:
    court = 'data:image/jpeg;base64,' + base64.b64encode(cf.read()).decode('ascii')
with open(f'{REPO}/court-playbook.jpg', 'rb') as cf:
    court_clay = 'data:image/jpeg;base64,' + base64.b64encode(cf.read()).decode('ascii')
with open('/tmp/claude-0/-home-user-Website/e6aade57-d976-5942-8746-511ef5135eda/scratchpad/playbook-crop.png', 'rb') as af:
    playbook_img = 'data:image/png;base64,' + base64.b64encode(af.read()).decode('ascii')

print(f"tb={len(tb)} court={len(court)} clay_court={len(court_clay)} playbook={len(playbook_img)}")

def ball(cx, cy, sz=64):
    return f'<img class="ball-img" src="{tb_img}" style="left:{int(cx-sz/2)}px;top:{int(cy-sz/2)}px;width:{sz}px;height:{sz}px;">'

def ghost(n, x, y, size=560):
    return f'<div class="ghost-num" style="left:{x}px;top:{y}px;font-size:{size}px;">{n:02d}</div>'

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

# 1 · COVER (dark, green court, darker mood) — hook
slides.append(('cover', '', f'''
  {ghost(1, -70, 96, 640)}
  {ball(980, 510, 66)}
  {HEADER}
  <div class="body-wrap">
    <div class="stamp-tag">Period-Week Protocol</div>
    <h1>Your period doesn't cancel <span class="hl">training.</span></h1>
    <div class="sub">A modified week isn't a missed week — here's exactly what to do.</div>
  </div>
  <div class="post-footer">
    <div class="swipe">Swipe <span class="arrow"></span></div>
  </div>''', court))

# 2 · BIG (dark, green court, darker mood) — debunk the phasing myth, set up simplicity
slides.append(('big', '', f'''
  {ghost(2, 640, 900, 560)}
  {ball(1015, 800, 64)}
  {HEADER}
  <div class="body-wrap">
    <h1>This isn't about phasing your <span class="acc">cycle.</span></h1>
  </div>
  <div class="footnote">— No performance tracking. No timing lifts to your cycle. Just protecting the habit through a hard week.</div>''', court))

# 3 · COMPARE (dark, green court, darker mood) — what stays vs what backs off
slides.append(('compare', '', f'''
  {ghost(3, 660, 360, 460)}
  {ball(780, 605, 64)}
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
  </div>''', court))

# 4 · MANIFESTO (light) — the loved layout from the bold variant, ported wholesale:
# huge bleeding row numerals, thick rules, a rotated SKIP stamp on the one exclusion.
# A small corner ghost "04" keeps the page-number-as-pagination logic consistent with
# every other slide, without competing with the row numerals for attention.
slides.append(('manifesto light', '', f'''
  {ghost(4, 860, 8, 280)}
  {ball(1010, 470, 60)}
  {HEADER}
  <div class="body-wrap">
    <div class="stamp-tag stamp-tag-dark">The protocol</div>
    <h1>Run this <span class="hl">version</span> of the week.</h1>
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
  </div>''', None))

# 5 · BIG (dark, green court, darker mood) — the mindset reframe
slides.append(('big', '', f'''
  {ghost(5, 620, -60, 620)}
  {ball(1015, 800, 64)}
  {HEADER}
  <div class="body-wrap">
    <h1>A lighter session isn't <span class="acc">inconsistency.</span></h1>
  </div>
  <div class="footnote">— It's the correct response to what your body is doing that week.</div>''', court))

# 6 · BIG variant w/ app-screen (clay court, darker mood, ties to the Playbook's own
# clay branding). No ball — the app-screen mock fills the clear space.
slides.append(('big', '', f'''
  {ghost(6, -80, 860, 560)}
  {HEADER}
  <div class="body-wrap">
    <div class="stamp-tag">Added to the Playbook</div>
    <h1>Read the full <span class="acc">breakdown.</span></h1>
  </div>
  <div class="app-screen"><img src="{playbook_img}" alt="Training On Your Period in the app Playbook"></div>''', court_clay))

# 7 · CTA (dark, green court, darker mood)
slides.append(('cta', '', f'''
  {ghost(7, 660, 40, 620)}
  {ball(980, 880, 68)}
  {HEADER}
  <div class="body-wrap">
    <div class="stamp-tag">Your move</div>
    <h1>A <span class="hl">coach</span> in your pocket.</h1>
    <div class="cta-prompt">Want customised coaching — with attention to every need? Send me a DM to start.</div>
    <div class="actions">
      <div class="cta-btn primary"><svg viewBox="0 0 24 24" fill="none"><path d="M4 4h16v12H8l-4 4V4z" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/></svg>DM to start</div>
      <div class="cta-btn ghost">Follow</div>
    </div>
  </div>''', court))

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

/* ===== Per-slide court background — every green/clay slide keeps the real court
   photo, just with a darker, moodier overlay than before (less green-wash, more
   black-blend, per the bold variant's cover treatment) ===== */
#s1{{background-image:linear-gradient(to bottom, rgba(10,10,10,.30) 0%, rgba(10,10,10,.88) 100%), url("{court}");}}
#s2{{background-image:linear-gradient(to bottom, rgba(10,10,10,.30) 0%, rgba(10,10,10,.88) 100%), url("{court}");}}
#s3{{background-image:linear-gradient(to bottom, rgba(10,10,10,.34) 0%, rgba(10,10,10,.90) 100%), url("{court}");}}
#s5{{background-image:linear-gradient(to bottom, rgba(10,10,10,.30) 0%, rgba(10,10,10,.88) 100%), url("{court}");}}
#s6{{background-image:linear-gradient(to bottom, rgba(199,85,47,.45) 0%, rgba(10,10,10,.86) 100%), url("{court_clay}");}}
#s7{{background-image:linear-gradient(to bottom, rgba(10,10,10,.30) 0%, rgba(10,10,10,.88) 100%), url("{court}");}}

/* ===== GHOST NUMERAL — huge translucent background page-number. Replaces the
   tennis-ball pagination dots: the number itself now tells you which slide you're
   on, so the dot row is gone. ===== */
.ghost-num{{position:absolute;font-family:var(--display);font-weight:900;line-height:1;
  letter-spacing:-0.05em;color:rgba(255,255,255,.10);z-index:0;pointer-events:none;}}
.tpl-manifesto .ghost-num{{color:rgba(14,74,54,.08);}}

.ball-img{{position:absolute;z-index:0;pointer-events:none;filter:drop-shadow(0 6px 14px rgba(0,0,0,.35));}}

/* ===== CHROME ===== */
.post-header{{position:absolute;top:var(--pad-edge);left:var(--pad-edge);right:var(--pad-edge);
  display:flex;align-items:center;justify-content:space-between;z-index:4;
  font-family:var(--mono);font-size:24px;font-weight:500;letter-spacing:.06em;}}
.post-header .who{{display:flex;align-items:center;gap:14px;}}
.post-header .dot{{width:14px;height:14px;border-radius:50%;background:var(--accent);}}
.post-footer{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);bottom:var(--pad-edge);
  display:flex;align-items:flex-end;justify-content:flex-end;gap:24px;z-index:4;}}

.swipe{{font-family:var(--mono);font-size:24px;letter-spacing:.1em;text-transform:uppercase;
  display:flex;align-items:center;gap:14px;opacity:.9;}}
.swipe .arrow{{width:56px;height:1.5px;background:currentColor;position:relative;}}
.swipe .arrow::after{{content:"";position:absolute;right:0;top:-5px;width:12px;height:12px;
  border-right:1.5px solid currentColor;border-top:1.5px solid currentColor;transform:rotate(45deg);}}

/* ===== TYPE BITS ===== */
/* Stamp-tag — solid hard-edge eyebrow box (replaces the old thin chip-B dash-line).
   Default = white box / black text, for dark & photo canvases. */
.stamp-tag{{display:inline-block;background:var(--paper);color:#0A0A0A;font-family:var(--mono);
  font-size:28px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;
  padding:14px 26px;margin-bottom:36px;}}
.stamp-tag-dark{{background:var(--ink);color:var(--paper);}}
.hl{{background:#0A0A0A;color:#fff;padding:0 .1em;box-decoration-break:clone;-webkit-box-decoration-break:clone;}}
.acc{{color:var(--clay-2);}}
.post-canvas.light .acc{{color:var(--clay);}}

/* ===== TPL-COVER ===== */
.tpl-cover .body-wrap{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);bottom:240px;}}
.tpl-cover .stamp-tag{{margin-bottom:32px;}}
.tpl-cover h1{{font-size:140px;font-weight:800;letter-spacing:-0.04em;line-height:1.0;}}
.tpl-cover .sub{{font-size:56px;font-weight:600;font-family:var(--latin);color:rgba(244,244,240,.78);margin-top:28px;letter-spacing:0;line-height:1.3;}}

/* ===== TPL-BIG ===== */
.tpl-big .body-wrap{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);top:220px;}}
.tpl-big h1{{font-size:150px;font-weight:800;letter-spacing:-0.04em;line-height:.94;}}
.tpl-big .footnote{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);bottom:240px;z-index:2;
  font-family:var(--mono);font-size:44px;font-weight:600;color:rgba(244,244,240,.80);letter-spacing:.02em;text-transform:uppercase;line-height:1.35;}}

/* ===== TPL-COMPARE ===== */
.tpl-compare .body-wrap{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);top:200px;}}
.tpl-compare h1{{font-size:96px;font-weight:800;letter-spacing:-0.025em;line-height:1;max-width:820px;}}
.tpl-compare .cols{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);bottom:200px;z-index:2;
  display:grid;grid-template-columns:1fr 1fr;gap:24px;}}
.col-card{{border-radius:22px;padding:36px;min-height:380px;}}
.col-card .col-tag{{font-family:var(--mono);font-size:34px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;margin-bottom:28px;}}
.col-card .col-list{{list-style:none;display:flex;flex-direction:column;gap:16px;}}
.col-card .col-list li{{font-size:36px;font-weight:600;letter-spacing:-0.01em;line-height:1.2;padding-left:36px;position:relative;}}
.col-card .col-list li::before{{content:"";position:absolute;left:0;top:.5em;width:18px;height:2px;background:currentColor;}}
.col-card.bad{{background:rgba(0,0,0,.30);border:1px solid rgba(255,255,255,.1);color:rgba(244,244,240,.5);}}
.col-card.bad .col-tag{{color:rgba(244,244,240,.92);}}
.col-card.bad .col-list li{{text-decoration:line-through;text-decoration-color:rgba(244,244,240,.25);}}
.col-card.good{{background:var(--accent);color:#fff;}}
.col-card.good .col-tag{{color:#fff;opacity:1;}}
.col-card.good .col-list li::before{{background:#fff;}}

/* ===== TPL-MANIFESTO (light) — page 4, ported from the bold variant ===== */
.tpl-manifesto .body-wrap{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);top:190px;z-index:2;}}
.tpl-manifesto h1{{font-size:98px;font-weight:800;letter-spacing:-0.03em;line-height:.98;}}
.manifesto{{position:absolute;left:0;right:0;bottom:64px;top:560px;display:flex;flex-direction:column;z-index:2;}}
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

/* ===== TPL-CTA ===== */
.tpl-cta .body-wrap{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);top:50%;transform:translateY(-55%);z-index:2;}}
.tpl-cta .stamp-tag{{margin-bottom:28px;}}
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
.app-screen{{position:absolute;left:355px;top:400px;z-index:2;
  width:370px;max-height:860px;border-radius:28px;overflow:hidden;
  box-shadow:0 28px 72px rgba(0,0,0,.60),0 0 0 1px rgba(255,255,255,.10);}}
.app-screen img{{width:100%;display:block;}}
#s6 .body-wrap{{top:130px;}}
#s6 h1{{font-size:104px;}}
#s5 h1{{font-size:94px;line-height:1.05;}}

/* ===== CLAY-CONTRAST FIXES ===== */
.col-card.good,.cta-btn.primary{{color:#fff;}}
</style>
</head>
<body>

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

</body>
</html>"""

with open(OUT, 'w', encoding='utf-8') as f:
    f.write(html)
print(f"Written: {len(html)} chars")
