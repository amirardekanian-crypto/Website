# -*- coding: utf-8 -*-
# Training With Injury — EN carousel, built on the CURRENT chrome system
# (carousel-period-training.html, 2026-07-06): plain scattered tennis-ball markers
# (no dashed arc), a huge translucent background page-number per slide (the number IS
# the pagination — no dot row), white "stamp" eyebrow boxes, clay-default highlight
# boxes, the manifesto/protocol layout, bold-clay coaching cues, and a darker/moodier
# court-photo overlay. Every green/clay slide keeps the real court photo behind it.
import re, base64, os

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KIT  = f'{REPO}/Content/Carousel-Kit.html'
OUT  = f'{REPO}/Content/carousel-training-injury.html'

with open(KIT, 'r', encoding='utf-8') as f:
    kit = f.read()

tb = re.search(r'(<symbol id="tennis-ball".*?</symbol>)', kit, re.DOTALL).group(1)
# clay-ball PNG straight out of the <symbol>, embedded as a plain <img> so html2canvas
# renders it (it silently drops SVG <use>/<symbol> references).
tb_img = re.search(r'(data:image/png;base64,[^"\']+)', tb).group(1)

with open(f'{REPO}/court-sessions.jpg', 'rb') as cf:
    court = 'data:image/jpeg;base64,' + base64.b64encode(cf.read()).decode('ascii')

print(f"tb={len(tb)} court={len(court)}")

def ball(cx, cy, sz=64, rot=0):
    return (f'<img class="ball-img" src="{tb_img}" style="left:{int(cx-sz/2)}px;top:{int(cy-sz/2)}px;'
            f'width:{sz}px;height:{sz}px;transform:rotate({rot}deg);">')

def ghost(n, x, y, size=560):
    return f'<div class="ghost-num" style="left:{x}px;top:{y}px;font-size:{size}px;">{n:02d}</div>'

HEADER = '<div class="post-header"><div class="who"><span class="dot"></span>AMIRARDEKANI.COM</div></div>'

IG = """Coming back from injury? Half the comeback isn't your coach's job. It's yours.

Your coach owns the programming — exercise choice, loading, how the week is built. But the part that actually decides how your return goes is smaller, simpler, and entirely in your control.

Your five jobs:
↳ Read pain correctly — mild and gone by morning is a green light; sharp, worsening, or still there tomorrow is a red flag
↳ Know what you're dealing with — a tear heals on a timeline; a structural trait you train around for years
↳ Report your full load — every match counts, not just gym days
↳ Protect your weak side — let the injured side set the reps, even when the strong side has more
↳ Log the truth — real weight, real effort, real pain, especially on the unflattering days

A quieter, honest session beats an impressive, dishonest one every time. Do your five jobs, and the program can finally do its.

Which one do you skip most? 👇

@amirardekanian

#injury #rehab #returntoplay #tennis #padel #strengthandconditioning #sportsinjury #tenniscoach #loadmanagement #sportscience"""

# ===================== SLIDES =====================
# each: (tpl-class, inner-html)
slides = []

# 1 · COVER (dark court, darker mood) — the split thesis
slides.append(('cover', f'''
  {ghost(1, -70, 96, 640)}
  {ball(1035, 30, 70, -15)}
  {HEADER}
  <div class="body-wrap">
    <div class="stamp-tag">Training Through Injury</div>
    <h1>The program is only <span class="hl">half.</span></h1>
    <div class="sub">The other half of your comeback has nothing to do with sets or reps. It's yours.</div>
  </div>
  <div class="post-footer">
    <div class="swipe">Swipe <span class="arrow"></span></div>
  </div>'''))

# 2 · BIG (dark court) — whose job is what
slides.append(('big', f'''
  {ghost(2, 630, 880, 560)}
  {ball(95, 1250, 60, 18)}
  {HEADER}
  <div class="body-wrap">
    <h1>Your coach programs. You <span class="acc">report.</span></h1>
  </div>
  <div class="footnote">— One job is theirs. The bigger one is yours.</div>'''))

# 3 · LIST (dark court) — the five jobs (the map)
slides.append(('list', f'''
  {ghost(3, 650, 260, 470)}
  {ball(1000, 1255, 58, 14)}
  {HEADER}
  <div class="body-wrap">
    <h1>Your <span class="acc">five jobs.</span></h1>
  </div>
  <div class="items">
    <div class="list-item"><div class="li-num">01</div><div class="li-text">Read pain correctly</div><div class="li-tag">GREEN LIGHT · RED FLAG</div></div>
    <div class="list-item"><div class="li-num">02</div><div class="li-text">Know what you're dealing with</div><div class="li-tag">HEALS · OR TRAIN AROUND</div></div>
    <div class="list-item"><div class="li-num">03</div><div class="li-text">Report your full load</div><div class="li-tag">MATCHES COUNT TOO</div></div>
    <div class="list-item"><div class="li-num">04</div><div class="li-text">Protect your weak side</div><div class="li-tag">WEAK SIDE SETS THE PACE</div></div>
    <div class="list-item"><div class="li-num">05</div><div class="li-text">Log the truth</div><div class="li-tag">REAL WEIGHT · REAL PAIN</div></div>
  </div>'''))

# 4 · COMPARE (dark court) — pain: red flag vs green light
slides.append(('compare', f'''
  {ghost(4, 655, 330, 460)}
  {ball(1010, 150, 60, -10)}
  {HEADER}
  <div class="body-wrap">
    <h1>Pain is a <span class="hl">signal.</span></h1>
  </div>
  <div class="cols">
    <div class="col-card bad">
      <div class="col-tag">— Red flag</div>
      <ul class="col-list">
        <li>Sharp, not mild</li>
        <li>Worse rep to rep</li>
        <li>Still there next morning</li>
        <li>Back off &amp; report</li>
      </ul>
    </div>
    <div class="col-card good">
      <div class="col-tag">→ Green light</div>
      <ul class="col-list">
        <li>Mild during the set</li>
        <li>Settles by morning</li>
        <li>Same each session</li>
        <li>Keep going</li>
      </ul>
    </div>
  </div>'''))

# 5 · BIG (dark court) — heals, or train around it forever (job 2)
slides.append(('big', f'''
  {ghost(5, 620, -60, 620)}
  {ball(75, 1255, 60, -18)}
  {HEADER}
  <div class="body-wrap">
    <h1>Heals — or train around it <span class="acc">forever?</span></h1>
  </div>
  <div class="footnote">— A tear heals on a timeline. A trait is architecture. Ask which one you have.</div>'''))

# 6 · MANIFESTO (light) — the reporting discipline (jobs 3, 4, 5), the loved protocol layout
slides.append(('manifesto light', f'''
  {ghost(6, 860, 8, 280)}
  {ball(1015, 470, 54, 12)}
  {HEADER}
  <div class="body-wrap">
    <div class="stamp-tag stamp-tag-dark">The part no program can do</div>
    <h1>Report the <span class="hl">truth.</span></h1>
  </div>
  <div class="manifesto">
    <div class="manifesto-row do">
      <div class="m-num">03</div>
      <div class="m-body"><div class="m-ttl">Your sport is load</div><div class="m-cue">Report every match — not just gym</div></div>
    </div>
    <div class="manifesto-row do">
      <div class="m-num">04</div>
      <div class="m-body"><div class="m-ttl">Single-limb work</div><div class="m-cue">Weak side sets the reps</div></div>
    </div>
    <div class="manifesto-row do">
      <div class="m-num">05</div>
      <div class="m-body"><div class="m-ttl">Every log</div><div class="m-cue">Real weight, real pain — always</div></div>
    </div>
  </div>'''))

# 7 · CTA (dark court)
slides.append(('cta', f'''
  {ghost(7, 660, 40, 620)}
  {ball(150, 230, 64, -10)}
  {HEADER}
  <div class="body-wrap">
    <div class="stamp-tag">Your move</div>
    <h1>A <span class="hl">coach</span> in your pocket.</h1>
    <div class="cta-prompt">Log your real load and readiness — I watch your ACWR and message you before you get hurt.</div>
    <div class="actions">
      <div class="cta-btn primary"><svg viewBox="0 0 24 24" fill="none"><path d="M4 4h16v12H8l-4 4V4z" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/></svg>DM to start</div>
      <div class="cta-btn ghost">Follow</div>
    </div>
  </div>'''))

# ===================== ASSEMBLE =====================
shots = []
for i, (cls, inner) in enumerate(slides, 1):
    shots.append(f'''<div class="shot"><button class="dl">⬇ PNG</button>
<div class="post-canvas tpl-{cls}" id="s{i}">{inner}
</div></div>''')
deck = "\n\n".join(shots)

html = f"""<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Training With Injury — AA Performance</title>
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

/* ===== Per-slide court background — every green slide keeps the real court photo,
   with a dark, moody overlay (less green-wash, more black-blend). ===== */
#s1,#s2,#s3,#s5,#s7{{background-image:linear-gradient(to bottom, rgba(10,10,10,.30) 0%, rgba(10,10,10,.88) 100%), url("{court}");}}
#s4{{background-image:linear-gradient(to bottom, rgba(10,10,10,.34) 0%, rgba(10,10,10,.90) 100%), url("{court}");}}

/* ===== GHOST NUMERAL — huge translucent background page-number = the pagination ===== */
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
/* Stamp-tag — solid hard-edge eyebrow box (replaces the old thin dash-line eyebrow).
   Default = white box / black text, for dark & photo canvases. */
.stamp-tag{{display:inline-block;background:var(--paper);color:#0A0A0A;font-family:var(--mono);
  font-size:28px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;
  padding:14px 26px;margin-bottom:36px;}}
.stamp-tag-dark{{background:var(--ink);color:var(--paper);}}
.hl{{background:var(--clay);color:#fff;padding:0 .1em;box-decoration-break:clone;-webkit-box-decoration-break:clone;}}
/* Black highlight is reserved for the manifesto slide, part of that loved layout. */
.tpl-manifesto .hl{{background:#0A0A0A;}}
.acc{{color:var(--clay-2);}}
.post-canvas.light .acc{{color:var(--clay);}}

/* ===== TPL-COVER ===== */
.tpl-cover .body-wrap{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);bottom:240px;}}
.tpl-cover .stamp-tag{{margin-bottom:32px;}}
.tpl-cover h1{{font-size:150px;font-weight:800;letter-spacing:-0.04em;line-height:1.0;}}
.tpl-cover .sub{{font-size:56px;font-weight:600;font-family:var(--latin);color:rgba(244,244,240,.78);margin-top:28px;letter-spacing:0;line-height:1.3;}}

/* ===== TPL-BIG ===== */
.tpl-big .body-wrap{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);top:220px;}}
.tpl-big h1{{font-size:150px;font-weight:800;letter-spacing:-0.04em;line-height:.94;}}
.tpl-big .footnote{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);bottom:240px;z-index:2;
  font-family:var(--mono);font-size:44px;font-weight:600;color:rgba(244,244,240,.80);letter-spacing:.02em;text-transform:uppercase;line-height:1.35;}}

/* ===== TPL-LIST ===== the five-jobs map (list mechanics, current chrome) ===== */
.tpl-list .body-wrap{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);top:180px;z-index:2;}}
.tpl-list h1{{font-size:104px;font-weight:800;letter-spacing:-0.03em;line-height:1.0;}}
.tpl-list .items{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);bottom:170px;z-index:2;display:flex;flex-direction:column;}}
.list-item{{display:grid;grid-template-columns:78px 1fr auto;gap:28px;align-items:center;padding:24px 0;border-top:2px solid rgba(244,244,240,.16);}}
.list-item:last-child{{border-bottom:2px solid rgba(244,244,240,.16);}}
.list-item .li-num{{font-family:var(--mono);font-size:34px;font-weight:800;color:var(--clay-2);letter-spacing:.04em;}}
.list-item .li-text{{font-size:46px;font-weight:800;letter-spacing:-0.02em;}}
.list-item .li-tag{{font-family:var(--mono);font-size:22px;font-weight:600;color:rgba(244,244,240,.6);letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;}}

/* ===== TPL-COMPARE ===== */
.tpl-compare .body-wrap{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);top:200px;z-index:2;}}
.tpl-compare h1{{font-size:96px;font-weight:800;letter-spacing:-0.025em;line-height:1;max-width:820px;}}
.tpl-compare .cols{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);bottom:200px;z-index:2;
  display:grid;grid-template-columns:1fr 1fr;gap:24px;}}
.col-card{{border-radius:22px;padding:36px;min-height:420px;}}
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

/* ===== TPL-MANIFESTO (light) — the protocol layout ===== */
.tpl-manifesto .body-wrap{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);top:190px;z-index:2;}}
.tpl-manifesto h1{{font-size:98px;font-weight:800;letter-spacing:-0.03em;line-height:.98;}}
.manifesto{{position:absolute;left:0;right:0;bottom:64px;top:560px;display:flex;flex-direction:column;z-index:2;}}
.manifesto-row{{position:relative;flex:1;display:flex;align-items:center;gap:36px;
  border-top:4px solid rgba(10,10,10,.85);padding:0 var(--pad-edge) 0 190px;}}
.manifesto-row:last-child{{border-bottom:4px solid rgba(10,10,10,.85);}}
.m-num{{position:absolute;left:-26px;top:0;bottom:0;display:flex;align-items:center;
  font-size:170px;font-weight:900;letter-spacing:-0.06em;color:rgba(10,10,10,.92);line-height:1;}}
.m-ttl{{font-size:62px;font-weight:800;letter-spacing:-0.02em;line-height:1.15;}}
.m-cue{{font-family:var(--mono);font-size:34px;font-weight:800;letter-spacing:.03em;text-transform:uppercase;
  color:var(--clay);margin-top:20px;}}

/* ===== TPL-CTA ===== */
/* fixed top (not top:50%;transform:translateY) — html2canvas ignores transforms */
.tpl-cta .body-wrap{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);top:360px;z-index:2;}}
.tpl-cta .stamp-tag{{margin-bottom:28px;}}
.tpl-cta h1{{font-size:124px;font-weight:800;letter-spacing:-0.03em;line-height:.95;}}
.tpl-cta .cta-prompt{{font-family:var(--latin);font-size:30px;color:rgba(244,244,240,.7);margin-top:36px;line-height:1.55;letter-spacing:0;max-width:820px;}}
.tpl-cta .actions{{display:flex;gap:16px;margin-top:40px;flex-wrap:wrap;}}
.cta-btn{{display:inline-flex;align-items:center;gap:12px;padding:22px 32px;border-radius:999px;
  font-family:var(--mono);font-size:26px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;}}
.cta-btn.primary{{background:var(--accent);color:#fff;}}
.cta-btn.ghost{{border:2px solid rgba(244,244,240,.3);color:var(--paper);}}
.cta-btn svg{{width:28px;height:28px;}}

/* ===== CLAY-CONTRAST FIXES ===== */
.col-card.good,.cta-btn.primary{{color:#fff;}}
</style>
</head>
<body>

<div class="topbar">
  <h1>Training With Injury — 7 slides</h1>
  <p>1080×1350px · Click <b>⬇ PNG</b> on each slide to export. Serve via <b>python3 -m http.server 8000</b> for correct font rendering.</p>
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
print(f"Written: {OUT} ({len(html)} chars)")
