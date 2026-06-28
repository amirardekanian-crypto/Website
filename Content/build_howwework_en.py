# -*- coding: utf-8 -*-
# Builds the English "How We Work" carousel (1080x1350) from the Carousel-Kit.
# Mirrors build_warmup_en.py: same templates, chrome, rally-arc, film grain,
# tennis-ball pagination, and base64-embedded assets. Repo-relative paths.
import re, os, io, base64
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
KIT  = os.path.join(HERE, 'Carousel-Kit.html')
OUT  = os.path.join(HERE, 'carousel-how-we-work.html')

with open(KIT, 'r', encoding='utf-8') as f:
    kit = f.read()

grey   = re.search(r'\.progress-bar span\s*\{[^}]*?background-image:\s*url\("(data:[^"]+)"\)', kit, re.DOTALL).group(1)
orange = re.search(r'\.progress-bar span\.on\s*\{[^}]*?background-image:\s*url\("(data:[^"]+)"\)', kit, re.DOTALL).group(1)
tb     = re.search(r'(<symbol id="tennis-ball".*?</symbol>)', kit, re.DOTALL).group(1)
tb_img = re.search(r'(data:image/png;base64,[^"\']+)', tb).group(1)

def embed_jpg(path):
    with open(path, 'rb') as f:
        return 'data:image/jpeg;base64,' + base64.b64encode(f.read()).decode('ascii')

def embed_png_resized(path, target_h):
    with Image.open(path) as p:
        ratio = target_h / p.height
        p2 = p.resize((int(p.width * ratio), target_h), Image.LANCZOS)
        buf = io.BytesIO()
        p2.save(buf, 'PNG', optimize=True, compress_level=9)
        return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode('ascii')

court   = embed_jpg(os.path.join(ROOT, 'court-sessions.jpg'))
app_img = embed_jpg(os.path.join(ROOT, 'app-warmup-preview.jpg'))
print(f"grey={len(grey)} orange={len(orange)} court={len(court)} app={len(app_img)}")

def arc(d, cx, cy, r=12):
    sz = 52
    return (f'<div class="ballarc" aria-hidden="true"><svg viewBox="0 0 1080 1350"><g>'
            f'<path class="path" d="{d}"/>'
            f'<image href="{tb_img}" x="{int(cx-sz/2)}" y="{int(cy-sz/2)}" width="{sz}" height="{sz}"/>'
            f'</g></svg></div>')

def bars(n, k):
    return ''.join('<span class="on"></span>' if i == k else '<span></span>' for i in range(1, n+1))

HEADER = '<div class="post-header"><div class="who"><span class="dot"></span>AMIRARDEKANI.COM</div></div>'
N = 8

IG = """How a real coaching relationship actually works.

This isn't a PDF you download and figure out alone. It's six months built around you, delivered through your own app, and adjusted every single week based on how you're actually responding.

One rule runs through all of it: nothing without a reason.

↳ We get to know you — goals, body, life, recovery
↳ We analyse before we prescribe — and line up goals that compete
↳ We build your six months — cycle by cycle, each with a purpose
↳ You train through the app — video, cues, logging, timers
↳ We watch, talk and adjust — live data + a real weekly check-in

Before you get hurt, your coach messages you.

Comment "START" or DM me and I'll talk you through whether it's the right fit.

@amirardekanian

#tennis #tenniscoach #strengthandconditioning #padel #tennisfitness #coaching #sportscience #tennistraining #onlinecoaching #tennisperformance"""

slides = []

# 1 · COVER (dark, court)
slides.append(('cover', f'''
  {arc("M-40 360 Q 460 170 980 510", 980, 510)}
  {HEADER}
  <div class="body-wrap">
    <div class="chip-B">How We Work</div>
    <h1>Not a plan.<br>A <span class="hl">coach.</span></h1>
    <div class="sub">Built around you. Delivered in your app. Adjusted every week.</div>
  </div>
  <div class="post-footer">
    <div class="progress-bar">{bars(N,1)}</div>
    <div class="swipe">Swipe <span class="arrow"></span></div>
  </div>'''))

# 2 · BIG statement (dark, court) — the one principle
slides.append(('big', f'''
  {arc("M-40 800 Q 480 650 1015 800", 1015, 800)}
  {HEADER}
  <div class="body-wrap">
    <h1>Nothing without a <span class="acc">reason.</span></h1>
  </div>
  <div class="footnote">— Every exercise · every set · every week — chosen on purpose</div>
  <div class="post-footer"><div class="progress-bar">{bars(N,2)}</div></div>'''))

# 3 · LIST (dark) — the five steps overview
slides.append(('list', f'''
  {arc("M-40 560 Q 480 440 1005 560", 1005, 560)}
  {HEADER}
  <div class="body-wrap">
    <h1>From hello to your <span class="acc">goal.</span></h1>
  </div>
  <div class="items">
    <div class="list-item"><div class="li-num">01</div><div class="li-text">Discovery</div><div class="li-tag">WE GET TO KNOW YOU</div></div>
    <div class="list-item"><div class="li-num">02</div><div class="li-text">Analysis</div><div class="li-tag">GOALS LINED UP</div></div>
    <div class="list-item"><div class="li-num">03</div><div class="li-text">Programming</div><div class="li-tag">YOUR SIX MONTHS</div></div>
    <div class="list-item"><div class="li-num">04</div><div class="li-text">Train</div><div class="li-tag">IN THE APP</div></div>
    <div class="list-item"><div class="li-num">05</div><div class="li-text">Adjust</div><div class="li-tag">THE WEEKLY LOOP</div></div>
  </div>
  <div class="post-footer"><div class="progress-bar">{bars(N,3)}</div></div>'''))

# 4 · RULES (LIGHT) — analyse before we prescribe; player on the right
CHK = '<div class="check"><svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-11" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></div>'
slides.append(('rules light', f'''
  {arc("M-40 470 Q 480 340 1005 490", 1005, 490)}
  {HEADER}
  <div class="body-wrap">
    <div class="chip-B">Before we prescribe</div>
    <h1>We analyse <span class="hl">first.</span></h1>
  </div>
  <div class="cards">
    <div class="rule-card">{CHK}<div class="body"><div class="ttl">Line up your goals</div><div class="sub">Resolve what competes</div></div><div class="num">01</div></div>
    <div class="rule-card">{CHK}<div class="body"><div class="ttl">Health before performance</div><div class="sub">Calm it, then build</div></div><div class="num">02</div></div>
    <div class="rule-card">{CHK}<div class="body"><div class="ttl">Needs analysis</div><div class="sub">Built for your sport</div></div><div class="num">03</div></div>
  </div>
  <div class="post-footer"><div class="progress-bar">{bars(N,4)}</div></div>'''))

# 5 · LIST (dark) — six months, cycle by cycle
slides.append(('list', f'''
  {arc("M-40 300 Q 540 150 1000 320", 1000, 320)}
  {HEADER}
  <div class="body-wrap">
    <h1>Your six months, <span class="acc">cycle by cycle.</span></h1>
  </div>
  <div class="items">
    <div class="list-item"><div class="li-num">01</div><div class="li-text">Foundation</div><div class="li-tag">PREP &amp; BASE</div></div>
    <div class="list-item"><div class="li-num">02</div><div class="li-text">Strength</div><div class="li-tag">BUILD THE ENGINE</div></div>
    <div class="list-item"><div class="li-num">03</div><div class="li-text">Power</div><div class="li-tag">TURN IT EXPLOSIVE</div></div>
    <div class="list-item"><div class="li-num">04</div><div class="li-text">On court</div><div class="li-tag">TRANSFER &amp; PEAK</div></div>
  </div>
  <div class="post-footer"><div class="progress-bar">{bars(N,5)}</div></div>'''))

# 6 · BIG (dark, court) — the app
slides.append(('big', f'''
  {arc("M-40 200 Q 480 80 1015 220", 1015, 220)}
  {HEADER}
  <div class="body-wrap">
    <h1>Your program lives <span class="acc">in the app.</span></h1>
  </div>
  <div class="app-screen"><img src="{app_img}" alt="The program in the app"></div>
  <div class="post-footer"><div class="progress-bar">{bars(N,6)}</div></div>'''))

# 7 · BIG (dark, court) — the promise
slides.append(('big', f'''
  {arc("M-40 760 Q 480 620 1015 770", 1015, 770)}
  {HEADER}
  <div class="body-wrap">
    <h1>Before you get hurt,<br>I <span class="hl">message you.</span></h1>
  </div>
  <div class="footnote">— Live data · a real weekly check-in · a plan that changes as you do</div>
  <div class="post-footer"><div class="progress-bar">{bars(N,7)}</div></div>'''))

# 8 · CTA (dark, court)
slides.append(('cta', f'''
  {arc("M 80 1080 Q 520 940 980 880", 980, 880, 13)}
  {HEADER}
  <div class="body-wrap">
    <div class="chip-B">Your move</div>
    <h1>A <span class="hl">coach</span> in your pocket.</h1>
    <div class="cta-prompt">Comment "START" or DM me and I'll talk you through whether the programme is the right fit for you.</div>
    <div class="actions">
      <div class="cta-btn primary"><svg viewBox="0 0 24 24" fill="none"><path d="M5 4h14v17l-7-4-7 4z" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/></svg>Save this post</div>
      <div class="cta-btn ghost">Follow</div>
    </div>
  </div>
  <div class="post-footer"><div class="progress-bar">{bars(N,8)}</div></div>'''))

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
<title>How We Work — AA Performance</title>
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
  background-image:linear-gradient(to bottom, rgba(14,74,54,0.42) 0%, rgba(14,74,54,0.72) 100%), url("{court}");
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
.tpl-cover h1{{font-size:150px;font-weight:800;letter-spacing:-0.04em;line-height:1.0;}}
.tpl-cover .sub{{font-size:50px;font-weight:500;font-family:var(--latin);color:rgba(244,244,240,.55);margin-top:28px;letter-spacing:0;}}

/* ===== TPL-BIG ===== */
.tpl-big .body-wrap{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);top:220px;}}
.tpl-big h1{{font-size:168px;font-weight:800;letter-spacing:-0.04em;line-height:.92;}}
.tpl-big .footnote{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);bottom:240px;
  font-family:var(--mono);font-size:36px;font-weight:500;color:rgba(244,244,240,.60);letter-spacing:.06em;text-transform:uppercase;line-height:1.4;}}

/* ===== TPL-LIST ===== */
.tpl-list .body-wrap{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);top:200px;}}
.tpl-list h1{{font-size:88px;font-weight:800;letter-spacing:-0.025em;line-height:1.05;}}
.tpl-list .items{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);bottom:240px;display:flex;flex-direction:column;gap:0;}}
.list-item{{display:grid;grid-template-columns:80px 1fr auto;gap:28px;align-items:center;padding:26px 0;border-top:1px solid rgba(244,244,240,.12);}}
.list-item:last-child{{border-bottom:1px solid rgba(244,244,240,.12);}}
.list-item .li-num{{font-family:var(--mono);font-size:28px;color:var(--accent);letter-spacing:.06em;}}
.list-item .li-text{{font-size:42px;font-weight:700;letter-spacing:-0.015em;}}
.list-item .li-tag{{font-family:var(--mono);font-size:20px;color:rgba(244,244,240,.5);letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;}}

/* ===== TPL-RULES (light) ===== */
.tpl-rules .body-wrap{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);top:200px;}}
.tpl-rules .chip-B{{margin-bottom:36px;}}
.tpl-rules h1{{font-size:124px;font-weight:800;letter-spacing:-0.03em;line-height:.95;}}
.tpl-rules .cards{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);bottom:220px;display:flex;flex-direction:column;gap:18px;}}
.rule-card{{background:var(--ink);color:var(--paper);border-radius:18px;padding:30px 36px;display:flex;align-items:center;gap:28px;}}
.rule-card .check{{width:80px;height:80px;border-radius:50%;background:var(--accent);display:grid;place-items:center;flex-shrink:0;}}
.rule-card .check svg{{width:38px;height:38px;}}
.rule-card .body{{flex:1;color:var(--paper);}}
.rule-card .ttl{{font-size:56px;font-weight:700;letter-spacing:-0.02em;line-height:1.1;}}
.rule-card .sub{{font-family:var(--mono);font-size:22px;color:rgba(244,244,240,.55);letter-spacing:.1em;text-transform:uppercase;margin-top:6px;}}
.rule-card .num{{font-family:var(--mono);font-size:28px;color:var(--clay-2);letter-spacing:.06em;}}

/* ===== TPL-CTA ===== */
.tpl-cta .body-wrap{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);top:50%;transform:translateY(-55%);}}
.tpl-cta .chip-B{{margin-bottom:28px;}}
.tpl-cta h1{{font-size:124px;font-weight:800;letter-spacing:-0.03em;line-height:.95;}}
.tpl-cta .cta-prompt{{font-family:var(--latin);font-size:30px;color:rgba(244,244,240,.7);margin-top:36px;line-height:1.55;letter-spacing:0;max-width:760px;}}
.tpl-cta .actions{{display:flex;gap:16px;margin-top:40px;flex-wrap:wrap;}}
.cta-btn{{display:inline-flex;align-items:center;gap:12px;padding:22px 32px;border-radius:999px;
  font-family:var(--mono);font-size:26px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;}}
.cta-btn.primary{{background:var(--accent);color:#fff;}}
.cta-btn.ghost{{border:2px solid rgba(244,244,240,.3);color:var(--paper);}}
.cta-btn svg{{width:28px;height:28px;}}

/* ===== PROMISE (slide 7) ===== */
#s7 h1{{font-size:130px;line-height:.95;}}

/* ===== APP SCREEN PREVIEW (slide 6) ===== */
.app-screen{{position:absolute;left:355px;top:360px;
  width:370px;border-radius:28px;overflow:hidden;
  box-shadow:0 28px 72px rgba(0,0,0,.60),0 0 0 1px rgba(255,255,255,.10);}}
.app-screen img{{width:100%;display:block;}}
#s6 .body-wrap{{top:120px;}}
#s6 h1{{font-size:108px;}}

/* ===== CLAY-CONTRAST FIXES ===== */
.chip-A,.cta-btn.primary{{color:#fff;}}
</style>
</head>
<body>

<svg width="0" height="0" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">
  {tb}
</svg>

<div class="topbar">
  <h1>How We Work — {N} slides</h1>
  <p>1080×1350px · Click <b>⬇ PNG</b> on each slide to export. Serve via <b>python -m http.server</b> for correct font rendering.</p>
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
