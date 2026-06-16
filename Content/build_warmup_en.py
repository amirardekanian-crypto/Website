# -*- coding: utf-8 -*-
import re

KIT = r'C:\Users\Amir\OneDrive\Документы\GitHub\Website\Content\Carousel-Kit.html'
OUT = r'C:\Users\Amir\OneDrive\Документы\GitHub\Website\Content\carousel-warmup-tennis.html'

with open(KIT, 'r', encoding='utf-8') as f:
    kit = f.read()

grey_m  = re.search(r'\.progress-bar span\s*\{[^}]*?background-image:\s*url\("(data:[^"]+)"\)', kit, re.DOTALL)
orange_m= re.search(r'\.progress-bar span\.on\s*\{[^}]*?background-image:\s*url\("(data:[^"]+)"\)', kit, re.DOTALL)
tb_m    = re.search(r'(<symbol id="tennis-ball".*?</symbol>)', kit, re.DOTALL)
grey   = grey_m.group(1)
orange = orange_m.group(1)
tb     = tb_m.group(1)

# Real court photo (the kit's canvas background — court-sessions.jpg, NOT a drawn SVG court).
# Embed as base64 so PNG export + offline open keep working.
import base64
with open(r'C:\Users\Amir\OneDrive\Документы\GitHub\Website\court-sessions.jpg','rb') as cf:
    court = 'data:image/jpeg;base64,' + base64.b64encode(cf.read()).decode('ascii')
with open(r'C:\Users\Amir\OneDrive\Документы\GitHub\Website\app-warmup-preview.jpg','rb') as af:
    app_img = 'data:image/jpeg;base64,' + base64.b64encode(af.read()).decode('ascii')
print(f"grey={len(grey)} orange={len(orange)} tb={len(tb)} court={len(court)} app={len(app_img)}")

# The court is the photographic background on .post-canvas (court-sessions.jpg), exactly
# like the kit — there is NO drawn SVG court in the markup.
COURT = ''

def arc(d, cx, cy, r=12):
    return (f'<div class="ballarc" aria-hidden="true"><svg viewBox="0 0 1080 1350"><g>'
            f'<path class="path" d="{d}"/><circle class="dot" cx="{cx}" cy="{cy}" r="{r}"/>'
            f'</g></svg></div>')

def bars(n, k):  # n spans, k-th active (1-based)
    return ''.join('<span class="on"></span>' if i == k else '<span></span>' for i in range(1, n+1))

HEADER = '<div class="post-header"><div class="who"><span class="dot"></span>AMIRARDEKANI.COM</div></div>'

IG = """Stretching before tennis is making you slower.

That pre-match jog-and-hold feels like a warm-up — but the static stretching part is quietly costing you serve speed and a sharp first step.

Here's what actually works:
• Cold muscle fires slow — warm it first
• Cut the long held stretches before you play
• 4 simple steps + a 10-second trick that added 4.6 km/h to serve speed in tennis players

How long is your warm-up before a match? Tell me below 👇

Comment "warm-up" and I'll DM you a full session you can run before your next match.

@amirardekanian

#tennis #tenniscoach #padel #tennisfitness #warmup #servespeed #strengthandconditioning #tennisperformance #sportscience #tennistraining"""

# ===================== SLIDES =====================
slides = []

# 1 · COVER (dark, court) — kit arc: M-40 360 Q460 170 980 510 dot(980,510)
slides.append(('cover','', f'''
  {COURT}
  {arc("M-40 360 Q 460 170 980 510", 980, 510)}
  {HEADER}
  <div class="body-wrap">
    <div class="chip-B">Warm-Up Science</div>
    <h1>Stretching is making you <span class="hl">slower.</span></h1>
    <div class="sub">Before tennis, the classic jog-and-hold is quietly costing you pace.</div>
  </div>
  <div class="post-footer">
    <div class="progress-bar">{bars(8,1)}</div>
    <div class="swipe">Swipe <span class="arrow"></span></div>
  </div>'''))

# 2 · BIG (dark, court) — kit arc: M-40 800 Q480 650 1015 800 dot(1015,800)
slides.append(('big','', f'''
  {COURT}
  {arc("M-40 800 Q 480 650 1015 800", 1015, 800)}
  {HEADER}
  <div class="body-wrap">
    <h1>Cold muscle = <span class="acc">slow serve.</span></h1>
  </div>
  <div class="footnote">— Late first step · stiff serve · sluggish reactions</div>
  <div class="post-footer"><div class="progress-bar">{bars(8,2)}</div></div>'''))

# 3 · COMPARE (dark, NO court) — kit arc: M300 690 Q540 470 780 690 dot(780,690)
slides.append(('compare','', f'''
  {arc("M300 690 Q 540 470 780 690", 780, 690)}
  {HEADER}
  <div class="body-wrap">
    <h1>Not all stretches are <span class="hl">warm-ups.</span></h1>
  </div>
  <div class="cols">
    <div class="col-card bad">
      <div class="col-tag">— Static hold</div>
      <ul class="col-list">
        <li>Muscle goes loose</li>
        <li>Serve slows down</li>
        <li>First step is later</li>
        <li>Feels productive</li>
      </ul>
    </div>
    <div class="col-card good">
      <div class="col-tag">→ Dynamic move</div>
      <ul class="col-list">
        <li>Joints primed</li>
        <li>Serve speed up</li>
        <li>Reactions sharper</li>
        <li>Same flexibility</li>
      </ul>
    </div>
  </div>
  <div class="post-footer"><div class="progress-bar">{bars(8,3)}</div></div>'''))

# 4 · LIST (dark, NO court) — kit arc: M-40 420 Q480 280 1005 470 dot(1005,470)
slides.append(('list','', f'''
  {arc("M-40 420 Q 480 280 1005 470", 1005, 470)}
  {HEADER}
  <div class="body-wrap">
    <h1>Warm up in <span class="acc">four steps.</span></h1>
  </div>
  <div class="items">
    <div class="list-item"><div class="li-num">01</div><div class="li-text">Raise</div><div class="li-tag">JOG · SHUFFLE · 3–5 MIN</div></div>
    <div class="list-item"><div class="li-num">02</div><div class="li-text">Activate &amp; mobilise</div><div class="li-tag">SWINGS · LUNGES · 7–10 MIN</div></div>
    <div class="list-item"><div class="li-num">03</div><div class="li-text">Potentiate</div><div class="li-tag">10S PRESS × 2</div></div>
    <div class="list-item"><div class="li-num">04</div><div class="li-text">Start — don't wait</div><div class="li-tag">GO STRAIGHT IN</div></div>
  </div>
  <div class="post-footer"><div class="progress-bar">{bars(8,4)}</div></div>'''))

# 5 · STAT (dark, NO court) — kit arc: M-40 300 Q540 150 1000 320 dot(1000,320)
slides.append(('stat','', f'''
  {arc("M-40 300 Q 540 150 1000 320", 1000, 320)}
  {HEADER}
  <div class="body-wrap">
    <div class="stat-value">+4.6</div>
    <div class="stat-label">km/h on the serve, from one 10-second press before serving.</div>
  </div>
  <div class="stat-source">Source: Isometric Conditioning in Tennis Players</div>
  <div class="post-footer"><div class="progress-bar">{bars(8,5)}</div></div>'''))

# 6 · RULES (LIGHT, NO court) — kit arc: M-40 500 Q540 440 1015 510 dot(1015,510)
CHK = '<div class="check"><svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-11" stroke="#0A0A0A" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></div>'
slides.append(('rules light','', f'''
  {arc("M-40 500 Q 540 440 1015 510", 1015, 510)}
  {HEADER}
  <div class="body-wrap">
    <div class="chip-B">The one rule</div>
    <h1>Move, don't <span class="hl">hold.</span></h1>
  </div>
  <div class="cards">
    <div class="rule-card">{CHK}<div class="body"><div class="ttl">Before you play</div><div class="sub">Move — dynamic only</div></div><div class="num">01</div></div>
    <div class="rule-card">{CHK}<div class="body"><div class="ttl">After you play</div><div class="sub">Hold — static stretch</div></div><div class="num">02</div></div>
    <div class="rule-card">{CHK}<div class="body"><div class="ttl">Long break mid-match</div><div class="sub">2-min re-raise</div></div><div class="num">03</div></div>
  </div>
  <div class="post-footer"><div class="progress-bar">{bars(8,6)}</div></div>'''))

# 7 · BIG (dark, court) — app screenshot preview; arc raised so ball clears the screen
slides.append(('big','', f'''
  {COURT}
  {arc("M-40 200 Q 480 80 1015 220", 1015, 220)}
  {HEADER}
  <div class="body-wrap">
    <h1>The full routine? <span class="acc">In the app.</span></h1>
  </div>
  <div class="app-screen"><img src="{app_img}" alt="Tennis Warm-Up Routine in the app"></div>
  <div class="post-footer"><div class="progress-bar">{bars(8,7)}</div></div>'''))

# 8 · CTA (dark, court) — arc routed down the clear right third (my CTA adds a prompt
#     line the kit's CTA lacks, so the kit's diagonal would cross it); ball still lands
#     at the kit's (980,880) spot.
slides.append(('cta','', f'''
  {COURT}
  {arc("M 80 1080 Q 520 940 980 880", 980, 880, 13)}
  {HEADER}
  <div class="body-wrap">
    <div class="chip-B">Your move</div>
    <h1>A <span class="hl">coach</span> in your pocket.</h1>
    <div class="cta-prompt">Comment "warm-up" and I'll DM you a full session to run before your next match.</div>
    <div class="actions">
      <div class="cta-btn primary"><svg viewBox="0 0 24 24" fill="none"><path d="M5 4h14v17l-7-4-7 4z" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/></svg>Save this post</div>
      <div class="cta-btn ghost">Follow</div>
    </div>
  </div>
  <div class="post-footer"><div class="progress-bar">{bars(8,8)}</div></div>'''))

# ===================== ASSEMBLE =====================
shots = []
for i, (cls, _extra, inner) in enumerate(slides, 1):
    shots.append(f'''<div class="shot"><button class="dl">⬇ PNG</button>
<div class="post-canvas tpl-{cls}" id="s{i}">{inner}
</div></div>''')
deck = "\n\n".join(shots)

html = f"""<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Tennis Warm-Up Science — AA Performance</title>
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

/* ===== COURT ===== the background photo (court-sessions.jpg) IS the court — no drawn court ===== */

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
.tpl-cover h1{{font-size:150px;font-weight:800;letter-spacing:-0.04em;line-height:.92;}}
.tpl-cover .sub{{font-size:50px;font-weight:500;font-family:var(--latin);color:rgba(244,244,240,.55);margin-top:28px;letter-spacing:0;}}

/* ===== TPL-BIG ===== */
.tpl-big .body-wrap{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);top:220px;}}
.tpl-big h1{{font-size:168px;font-weight:800;letter-spacing:-0.04em;line-height:.92;}}
.tpl-big .footnote{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);bottom:240px;
  font-family:var(--mono);font-size:36px;font-weight:500;color:rgba(244,244,240,.60);letter-spacing:.06em;text-transform:uppercase;line-height:1.4;}}

/* ===== TPL-COMPARE ===== */
.tpl-compare .body-wrap{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);top:200px;}}
.tpl-compare h1{{font-size:96px;font-weight:800;letter-spacing:-0.025em;line-height:1;max-width:760px;}}
.tpl-compare .cols{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);bottom:200px;
  display:grid;grid-template-columns:1fr 1fr;gap:24px;}}
.col-card{{border-radius:22px;padding:36px;min-height:380px;}}
.col-card .col-tag{{font-family:var(--mono);font-size:22px;letter-spacing:.12em;text-transform:uppercase;margin-bottom:24px;}}
.col-card .col-list{{list-style:none;display:flex;flex-direction:column;gap:16px;}}
.col-card .col-list li{{font-size:38px;font-weight:600;letter-spacing:-0.01em;line-height:1.2;padding-left:36px;position:relative;}}
.col-card .col-list li::before{{content:"";position:absolute;left:0;top:.5em;width:18px;height:2px;background:currentColor;}}
.col-card.bad{{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);color:rgba(244,244,240,.5);}}
.col-card.bad .col-tag{{color:rgba(244,244,240,.4);}}
.col-card.bad .col-list li{{text-decoration:line-through;text-decoration-color:rgba(244,244,240,.25);}}
.col-card.good{{background:var(--accent);color:#fff;}}
.col-card.good .col-tag{{color:#fff;opacity:.78;}}
.col-card.good .col-list li::before{{background:#fff;}}

/* ===== TPL-LIST ===== */
.tpl-list .body-wrap{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);top:200px;}}
.tpl-list h1{{font-size:88px;font-weight:800;letter-spacing:-0.025em;line-height:1.05;}}
.tpl-list .items{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);bottom:240px;display:flex;flex-direction:column;gap:0;}}
.list-item{{display:grid;grid-template-columns:80px 1fr auto;gap:28px;align-items:center;padding:26px 0;border-top:1px solid rgba(244,244,240,.12);}}
.list-item:last-child{{border-bottom:1px solid rgba(244,244,240,.12);}}
.list-item .li-num{{font-family:var(--mono);font-size:28px;color:var(--accent);letter-spacing:.06em;}}
.list-item .li-text{{font-size:42px;font-weight:700;letter-spacing:-0.015em;}}
.list-item .li-tag{{font-family:var(--mono);font-size:20px;color:rgba(244,244,240,.5);letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;}}

/* ===== TPL-STAT ===== */
.tpl-stat .body-wrap{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);top:240px;}}
.tpl-stat .stat-value{{font-size:380px;font-weight:800;letter-spacing:-0.06em;line-height:.85;color:var(--accent);display:block;}}
.tpl-stat .stat-label{{font-size:72px;font-weight:700;letter-spacing:-0.02em;line-height:1.1;margin-top:28px;max-width:800px;}}
.tpl-stat .stat-source{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);bottom:170px;
  font-family:var(--latin);font-size:26px;color:rgba(244,244,240,.45);letter-spacing:.01em;}}

/* ===== TPL-RULES (light) ===== */
.tpl-rules .body-wrap{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);top:200px;}}
.tpl-rules .chip-B{{margin-bottom:36px;}}
.tpl-rules h1{{font-size:124px;font-weight:800;letter-spacing:-0.03em;line-height:.95;}}
.tpl-rules .cards{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);bottom:220px;display:flex;flex-direction:column;gap:18px;}}
.rule-card{{background:var(--ink);color:var(--paper);border-radius:18px;padding:30px 36px;display:flex;align-items:center;gap:28px;}}
.rule-card .check{{width:80px;height:80px;border-radius:50%;background:var(--accent);display:grid;place-items:center;flex-shrink:0;}}
.rule-card .check svg{{width:38px;height:38px;}}
.rule-card .check svg path{{stroke:#fff;}}
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

/* ===== APP SCREEN PREVIEW (slide 7) ===== */
.app-screen{{position:absolute;left:50%;transform:translateX(-50%);top:360px;
  width:370px;border-radius:28px;overflow:hidden;
  box-shadow:0 28px 72px rgba(0,0,0,.60),0 0 0 1px rgba(255,255,255,.10);}}
.app-screen img{{width:100%;display:block;}}
#s7 .body-wrap{{top:120px;}}
#s7 h1{{font-size:108px;}}

/* ===== CLAY-CONTRAST FIXES ===== */
.chip-A,.col-card.good,.cta-btn.primary{{color:#fff;}}
</style>
</head>
<body>

<svg width="0" height="0" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">
  {tb}
</svg>

<div class="topbar">
  <h1>Tennis Warm-Up Science — 8 slides</h1>
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

<!-- rally-arc dot -> tennis ball -->
<script>
  (function(){{
    var NS='http://www.w3.org/2000/svg',XL='http://www.w3.org/1999/xlink';
    document.querySelectorAll('.ballarc .dot').forEach(function(c){{
      var cx=parseFloat(c.getAttribute('cx')),cy=parseFloat(c.getAttribute('cy'));
      var r=parseFloat(c.getAttribute('r'))||12, d=Math.max(r,16)*2;
      var u=document.createElementNS(NS,'use');
      u.setAttribute('href','#tennis-ball'); u.setAttributeNS(XL,'href','#tennis-ball');
      u.setAttribute('x',cx-d/2); u.setAttribute('y',cy-d/2);
      u.setAttribute('width',d); u.setAttribute('height',d);
      c.replaceWith(u);
    }});
  }})();
</script>
</body>
</html>"""

with open(OUT, 'w', encoding='utf-8') as f:
    f.write(html)
print(f"Written: {len(html)} chars")
