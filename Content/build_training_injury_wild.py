# -*- coding: utf-8 -*-
# Training With Injury — "set free" edition. Amir's brief: keep the COLORS, the
# TENNIS BALL and the TEXT; reinvent everything else. Every slide is its own poster
# with a bespoke layout — no shared template. Unified only by the brand palette
# (clay #C7552F / clay-2 #E06B43 / green #0E4A36 / paper #FAF7F2), the real clay
# tennis-ball asset, and the copy. Self-contained base64; html2canvas-safe primitives
# only (hard-px positioning, inline SVG basic shapes, <img> ball, gradients, rotate).
import re, base64, os

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KIT  = f'{REPO}/Content/Carousel-Kit.html'
OUT  = f'{REPO}/Content/carousel-training-injury-wild.html'

with open(KIT, 'r', encoding='utf-8') as f:
    kit = f.read()
tb = re.search(r'(<symbol id="tennis-ball".*?</symbol>)', kit, re.DOTALL).group(1)
tb_img = re.search(r'(data:image/png;base64,[^"\']+)', tb).group(1)  # 96x96 clay ball
with open(f'{REPO}/court-sessions.jpg', 'rb') as cf:
    court = 'data:image/jpeg;base64,' + base64.b64encode(cf.read()).decode('ascii')
print(f"tb={len(tb)} court={len(court)}")

def ball(cx, cy, sz=64, rot=0, z=3, cls=''):
    return (f'<img class="ball-img {cls}" src="{tb_img}" style="left:{cx-sz/2:.0f}px;top:{cy-sz/2:.0f}px;'
            f'width:{sz}px;height:{sz}px;transform:rotate({rot}deg);z-index:{z};">')

def handle(dark=True, x=64, y=58):
    col = '#FAF7F2' if dark else '#0E4A36'
    return (f'<div class="who" style="left:{x}px;top:{y}px;color:{col};">'
            f'<span class="dot"></span>AMIRARDEKANI.COM</div>')

IG = """Coming back from injury? Half the comeback isn't your coach's job. It's yours.

Your coach owns the programming. But the part that decides how your return goes is smaller, simpler, and entirely in your control.

Your five jobs:
↳ Read pain correctly — mild and gone by morning is a green light; sharp, worsening, or still there tomorrow is a red flag
↳ Know what you're dealing with — a tear heals on a timeline; a structural trait you train around for years
↳ Report your full load — every match counts, not just gym days
↳ Protect your weak side — let the injured side set the reps
↳ Log the truth — real weight, real effort, real pain, especially on the unflattering days

Do your five jobs, and the program can finally do its.

Which one do you skip most? 👇

@amirardekanian

#injury #rehab #returntoplay #tennis #padel #strengthandconditioning #sportsinjury #tenniscoach #loadmanagement #sportscience"""

# ============================================================ SLIDES
S = []

# ---- S1 · SPLIT "HALF" — the canvas cut in two, a ball on the seam
S.append(f'''
  <div class="s1-top"></div>
  <div class="s1-bot"></div>
  <div class="s1-seam"></div>
  {handle(True)}
  <div class="s1-stamp">Training Through Injury</div>
  <div class="s1-over">The program is only</div>
  <div class="s1-half">HALF.</div>
  <div class="s1-sub">The other half of your comeback has nothing to do with sets or reps. It's yours.</div>
  {ball(872, 675, 118, -12, z=4)}''')

# ---- S2 · SCALE OF OWNERSHIP — tiny "their job" vs monumental "YOU REPORT."
S.append(f'''
  {handle(False)}
  <div class="s2-small">Your coach programs.<span class="s2-rule"></span></div>
  <div class="s2-big">YOU<br>REPORT</div>
  {ball(1006, 712, 56, 8, z=4)}
  <div class="s2-foot">One job is theirs — the bigger one is yours.</div>''')

# ---- S3 · FIVE-BALL RALLY SPINE — the jobs bounce down a dashed trajectory
def spine_row(y, n, title, tag):
    return (f'<div class="s3-num" style="top:{y-58:.0f}px;">{n}</div>'
            f'<div class="s3-ttl" style="top:{y-46:.0f}px;">{title}</div>'
            f'<div class="s3-tag" style="top:{y+18:.0f}px;">{tag}</div>')
rows3 = [
    (360, '01', 'Read pain correctly', 'GREEN LIGHT · RED FLAG'),
    (556, '02', "Know what you're dealing with", 'HEALS · OR TRAIN AROUND'),
    (752, '03', 'Report your full load', 'MATCHES COUNT TOO'),
    (948, '04', 'Protect your weak side', 'WEAK SIDE SETS THE PACE'),
    (1144,'05', 'Log the truth', 'REAL WEIGHT · REAL PAIN'),
]
spine_svg = '<svg class="s3-svg" viewBox="0 0 1080 1350"><line x1="150" y1="330" x2="150" y2="1175" stroke="#E06B43" stroke-width="4" stroke-dasharray="2 20" stroke-linecap="round"/></svg>'
balls3 = ''.join(ball(150, y, 60, (i*17)-30, z=3) for i,(y,*_) in enumerate(rows3))
S.append(f'''
  {spine_svg}
  {handle(True)}
  <div class="s3-title">Your <span class="cl2">five</span> jobs.</div>
  {balls3}
  {''.join(spine_row(*r) for r in rows3)}''')

# ---- S4 · SIGNAL SPLIT — clay panel vs green panel, ball as the indicator
def sign(x, items, cls):
    lis = ''.join(f'<li>{t}</li>' for t in items)
    return f'<ul class="s4-list {cls}" style="left:{x}px;">{lis}</ul>'
S.append(f'''
  <div class="s4-left"></div>
  <div class="s4-right"></div>
  {handle(True, x=600)}
  <div class="s4-badge">Pain is a signal.</div>
  <div class="s4-tag s4-tag-l">— Red flag</div>
  <div class="s4-tag s4-tag-r">Green light →</div>
  {sign(72, ['Sharp, not mild','Worse rep to rep','Still there next morning','Back off &amp; report'], 'l')}
  {sign(612, ['Mild during the set','Settles by morning','Same each session','Keep going'], 'r')}
  <div class="s4-ring"></div>
  {ball(540, 812, 104, -8, z=5)}''')

# ---- S5 · LINE vs LOOP — a finite track that ends vs an endless ring
ring5 = '<svg class="s5-ring" viewBox="0 0 400 400"><circle cx="200" cy="200" r="150" fill="none" stroke="#E06B43" stroke-width="5" stroke-dasharray="3 22" stroke-linecap="round"/></svg>'
line5 = '<svg class="s5-line" viewBox="0 0 900 40"><line x1="10" y1="20" x2="720" y2="20" stroke="#E06B43" stroke-width="5" stroke-dasharray="3 22" stroke-linecap="round"/><line x1="740" y1="4" x2="740" y2="36" stroke="#E06B43" stroke-width="6" stroke-linecap="round"/></svg>'
S.append(f'''
  {handle(True)}
  <div class="s5-head">Heals — or train around it <span class="cl2">forever?</span></div>

  <div class="s5-labelA">Heals</div>
  {line5}
  {ball(795, 640, 66, 10, z=4)}
  <div class="s5-descA">A tear — on a timeline. Weeks, then done.</div>

  <div class="s5-loopwrap">{ring5}</div>
  {ball(440, 850, 62, -14, z=4)}
  <div class="s5-labelB">Train around it</div>
  <div class="s5-descB">A trait — architecture. Not a clock. For as long as you train.</div>''')

# ---- S6 · TRUTH LEDGER — a logbook page, rotated "LOGGED" stamps
def ledger(y, n, ttl, cue):
    return (f'<div class="s6-row" style="top:{y}px;">'
            f'<div class="s6-check">✓</div>'
            f'<div class="s6-n">{n}</div>'
            f'<div class="s6-ttl">{ttl}</div>'
            f'<div class="s6-cue">{cue}</div>'
            f'<div class="s6-stamp">Logged</div></div>')
rows6 = [
    (452, '03', 'Your sport is load', 'Report every match — not just gym'),
    (668, '04', 'Single-limb work', 'Weak side sets the reps'),
    (884, '05', 'Every log', 'Real weight, real pain — always'),
]
S.append(f'''
  <div class="s6-margin"></div>
  {handle(False)}
  <div class="s6-kicker">The part no program can do</div>
  <div class="s6-title">Report the <span class="cl">truth.</span></div>
  {''.join(ledger(*r) for r in rows6)}
  {ball(986, 1210, 76, 12, z=4)}''')

# ---- S7 · RADAR — the ball as a tracked point inside ACWR rings ("I'm watching")
radar = ('<svg class="s7-radar" viewBox="0 0 1080 1350">'
         '<circle cx="540" cy="378" r="286" fill="none" stroke="#E06B43" stroke-width="2" opacity=".28"/>'
         '<circle cx="540" cy="378" r="210" fill="none" stroke="#E06B43" stroke-width="2" opacity=".42"/>'
         '<circle cx="540" cy="378" r="134" fill="none" stroke="#E06B43" stroke-width="2.5" opacity=".62"/>'
         '<line x1="540" y1="378" x2="812" y2="292" stroke="#E06B43" stroke-width="3" opacity=".85" stroke-linecap="round"/>'
         '<circle cx="726" cy="214" r="7" fill="#E06B43"/>'
         '<circle cx="352" cy="470" r="6" fill="#E06B43" opacity=".7"/>'
         '<circle cx="690" cy="540" r="5" fill="#E06B43" opacity=".6"/>'
         '</svg>')
S.append(f'''
  {radar}
  {handle(True)}
  {ball(540, 378, 96, -10, z=4)}
  <div class="s7-kicker">Your move</div>
  <div class="s7-head">A <span class="cl">coach</span> in your pocket.</div>
  <div class="s7-prompt">Log your real load and readiness — I watch your ACWR and message you before you get hurt.</div>
  <div class="s7-actions">
    <div class="s7-btn primary"><svg viewBox="0 0 24 24" fill="none"><path d="M4 4h16v12H8l-4 4V4z" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/></svg>DM to start</div>
    <div class="s7-btn ghost">Follow</div>
  </div>''')

# ============================================================ ASSEMBLE
shots = ''.join(
    f'<div class="shot"><button class="dl">⬇ PNG</button><div class="post-canvas" id="s{i}">{inner}\n</div></div>\n'
    for i, inner in enumerate(S, 1))

CSS = f'''
:root{{--clay:#C7552F;--cl2:#E06B43;--green:#0E4A36;--paper:#FAF7F2;--ink:#141414;
  --disp:'Barlow Condensed',system-ui,sans-serif;--body:'Barlow',system-ui,sans-serif;}}
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0;}}
html,body{{background:#16161a;color:var(--paper);font-family:var(--disp);}}
.topbar{{max-width:1080px;margin:0 auto;padding:26px 20px 6px;color:#cfc9bf;}}
.topbar h1{{font-size:24px;font-weight:700;margin-bottom:8px;}}
.topbar p{{font-size:14px;line-height:1.9;color:#b8b2a6;font-family:var(--body);}}
.topbar b{{color:#fff;}}
.deck{{display:flex;flex-direction:column;align-items:center;gap:26px;padding:18px 12px 80px;}}
.shot{{position:relative;width:1080px;max-width:100%;}}
.dl{{position:absolute;top:12px;left:12px;z-index:20;cursor:pointer;background:rgba(0,0,0,.55);color:#fff;
  border:none;border-radius:9px;padding:9px 14px;font-family:var(--disp);font-size:14px;font-weight:600;letter-spacing:.04em;}}
.dl:hover{{background:#000;}}
.post-canvas{{width:1080px;height:1350px;position:relative;overflow:hidden;background:var(--green);
  color:var(--paper);font-family:var(--disp);max-width:100%;}}
/* film grain on every slide */
.post-canvas::after{{content:"";position:absolute;inset:0;pointer-events:none;z-index:9;opacity:.05;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");background-size:200px 200px;}}
.ball-img{{position:absolute;pointer-events:none;filter:drop-shadow(0 8px 16px rgba(0,0,0,.4));}}
.who{{position:absolute;z-index:8;display:flex;align-items:center;gap:12px;font-family:var(--disp);
  font-size:23px;font-weight:600;letter-spacing:.08em;}}
.who .dot{{width:13px;height:13px;border-radius:50%;background:var(--clay);}}
.cl{{color:var(--clay);}} .cl2{{color:var(--cl2);}}

/* ============ S1 · SPLIT HALF ============ */
#s1{{background:var(--paper);}}
.s1-top{{position:absolute;left:0;right:0;top:0;height:675px;z-index:0;
  background-image:linear-gradient(rgba(8,8,8,.36),rgba(8,8,8,.82)),url("{court}");background-size:cover;background-position:center;}}
.s1-bot{{position:absolute;left:0;right:0;top:675px;bottom:0;z-index:0;background:var(--paper);}}
.s1-seam{{position:absolute;left:0;right:0;top:672px;height:6px;background:var(--clay);z-index:2;}}
.s1-stamp{{position:absolute;left:64px;top:120px;z-index:3;background:var(--paper);color:#0A0A0A;
  font-size:26px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:12px 22px;}}
.s1-over{{position:absolute;left:70px;top:448px;width:920px;z-index:3;color:#fff;font-size:82px;font-weight:700;
  letter-spacing:-.01em;text-transform:uppercase;}}
.s1-half{{position:absolute;left:58px;top:640px;z-index:3;color:var(--clay);font-size:340px;font-weight:900;
  letter-spacing:-.05em;line-height:1;}}
.s1-sub{{position:absolute;left:72px;top:1044px;width:640px;z-index:3;color:#2b2b2b;font-family:var(--body);
  font-size:36px;font-weight:600;line-height:1.32;}}

/* ============ S2 · SCALE OF OWNERSHIP ============ */
#s2{{background:var(--paper);color:var(--ink);}}
.s2-small{{position:absolute;left:72px;top:190px;color:var(--green);font-size:66px;font-weight:700;
  letter-spacing:-.01em;text-transform:uppercase;opacity:.5;}}
.s2-rule{{display:block;width:360px;height:5px;background:var(--green);opacity:.4;margin-top:22px;}}
.s2-big{{position:absolute;left:64px;top:392px;color:var(--clay);font-size:212px;font-weight:900;
  letter-spacing:-.04em;line-height:.86;text-transform:uppercase;}}
.s2-foot{{position:absolute;left:72px;bottom:150px;width:920px;color:var(--green);font-family:var(--disp);
  font-size:44px;font-weight:700;letter-spacing:.01em;text-transform:uppercase;}}

/* ============ S3 · FIVE-BALL SPINE ============ */
#s3{{background-image:linear-gradient(rgba(8,8,8,.34),rgba(8,8,8,.9)),url("{court}");background-size:cover;background-position:center;}}
.s3-svg{{position:absolute;inset:0;width:100%;height:100%;z-index:1;}}
.s3-title{{position:absolute;left:64px;top:120px;z-index:3;font-size:100px;font-weight:800;
  letter-spacing:-.03em;text-transform:uppercase;color:#fff;}}
.s3-num{{position:absolute;left:238px;z-index:3;font-size:26px;font-weight:800;color:var(--cl2);
  letter-spacing:.1em;}}
.s3-ttl{{position:absolute;left:238px;width:760px;z-index:3;font-size:48px;font-weight:800;
  letter-spacing:-.02em;color:#fff;line-height:1;}}
.s3-tag{{position:absolute;left:238px;z-index:3;font-size:23px;font-weight:600;color:rgba(244,244,240,.6);
  letter-spacing:.07em;text-transform:uppercase;}}

/* ============ S4 · SIGNAL SPLIT ============ */
#s4{{background:var(--green);}}
.s4-left{{position:absolute;left:0;top:0;width:540px;height:100%;z-index:0;background:var(--clay);}}
.s4-right{{position:absolute;left:540px;top:0;width:540px;height:100%;z-index:0;
  background-image:linear-gradient(rgba(8,8,8,.3),rgba(8,8,8,.78)),url("{court}");background-size:cover;background-position:center;}}
.s4-badge{{position:absolute;left:170px;top:150px;width:740px;z-index:5;text-align:center;background:var(--paper);
  color:#0A0A0A;font-size:66px;font-weight:900;letter-spacing:-.02em;text-transform:uppercase;padding:24px 0;}}
.s4-tag{{position:absolute;top:388px;z-index:4;font-size:34px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#fff;}}
.s4-tag-l{{left:72px;}} .s4-tag-r{{left:612px;color:var(--cl2);}}
.s4-list{{position:absolute;top:470px;width:400px;z-index:4;list-style:none;display:flex;flex-direction:column;gap:26px;}}
.s4-list li{{font-size:37px;font-weight:600;line-height:1.15;color:#fff;padding-left:34px;position:relative;}}
.s4-list li::before{{content:"";position:absolute;left:0;top:.55em;width:18px;height:3px;background:#fff;}}
.s4-list.r li::before{{background:var(--cl2);}}
.s4-ring{{position:absolute;left:470px;top:742px;width:140px;height:140px;border-radius:50%;z-index:4;
  border:4px solid var(--cl2);}}

/* ============ S5 · LINE vs LOOP ============ */
#s5{{background-image:linear-gradient(rgba(8,8,8,.32),rgba(8,8,8,.9)),url("{court}");background-size:cover;background-position:center;}}
.s5-head{{position:absolute;left:64px;top:130px;width:840px;z-index:3;font-size:92px;font-weight:800;
  letter-spacing:-.03em;text-transform:uppercase;line-height:.96;color:#fff;}}
.s5-labelA{{position:absolute;left:70px;top:520px;z-index:3;font-size:30px;font-weight:800;color:var(--cl2);
  letter-spacing:.14em;text-transform:uppercase;}}
.s5-line{{position:absolute;left:60px;top:600px;width:820px;height:40px;z-index:2;}}
.s5-descA{{position:absolute;left:70px;top:672px;width:720px;z-index:3;font-family:var(--body);font-size:32px;
  font-weight:600;color:rgba(244,244,240,.82);}}
.s5-loopwrap{{position:absolute;left:240px;top:800px;width:400px;height:400px;z-index:2;}}
.s5-ring{{position:absolute;inset:0;width:100%;height:100%;}}
.s5-labelB{{position:absolute;left:686px;top:906px;z-index:3;font-size:30px;font-weight:800;color:var(--cl2);
  letter-spacing:.14em;text-transform:uppercase;}}
.s5-descB{{position:absolute;left:686px;top:966px;width:330px;z-index:3;font-family:var(--body);font-size:32px;
  font-weight:600;color:rgba(244,244,240,.82);line-height:1.32;}}

/* ============ S6 · TRUTH LEDGER ============ */
#s6{{background:var(--paper);color:var(--ink);}}
.s6-margin{{position:absolute;left:120px;top:0;bottom:0;width:3px;background:var(--clay);opacity:.5;z-index:1;}}
.s6-kicker{{position:absolute;left:158px;top:150px;z-index:3;font-size:26px;font-weight:800;color:var(--clay);
  letter-spacing:.12em;text-transform:uppercase;}}
.s6-title{{position:absolute;left:154px;top:198px;width:860px;z-index:3;font-size:100px;font-weight:900;
  letter-spacing:-.03em;text-transform:uppercase;color:var(--green);}}
.s6-row{{position:absolute;left:0;right:0;height:216px;z-index:3;border-top:2px solid rgba(14,74,54,.22);}}
.s6-check{{position:absolute;left:150px;top:52px;width:66px;height:66px;background:var(--clay);color:#fff;
  display:flex;align-items:center;justify-content:center;font-size:40px;font-weight:800;}}
.s6-n{{position:absolute;left:252px;top:44px;font-size:30px;font-weight:800;color:var(--cl2);letter-spacing:.06em;}}
.s6-ttl{{position:absolute;left:252px;top:76px;font-size:60px;font-weight:800;letter-spacing:-.02em;color:var(--green);}}
.s6-cue{{position:absolute;left:252px;top:150px;font-family:var(--disp);font-size:31px;font-weight:800;
  color:var(--clay);letter-spacing:.03em;text-transform:uppercase;}}
.s6-stamp{{position:absolute;right:78px;top:66px;transform:rotate(-8deg);border:5px solid var(--clay);
  color:var(--clay);font-size:34px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;padding:8px 20px;}}

/* ============ S7 · RADAR ============ */
#s7{{background-image:radial-gradient(120% 80% at 50% 26%,rgba(14,74,54,.2),rgba(8,8,8,.92)),url("{court}");background-size:cover;background-position:center;}}
.s7-radar{{position:absolute;inset:0;width:100%;height:100%;z-index:1;}}
.s7-kicker{{position:absolute;left:64px;top:706px;z-index:3;background:var(--paper);color:#0A0A0A;font-size:24px;
  font-weight:800;letter-spacing:.12em;text-transform:uppercase;padding:11px 20px;}}
.s7-head{{position:absolute;left:60px;top:790px;width:960px;z-index:3;font-size:100px;font-weight:800;
  letter-spacing:-.03em;text-transform:uppercase;line-height:.94;color:#fff;}}
.s7-prompt{{position:absolute;left:64px;top:1012px;width:840px;z-index:3;font-family:var(--body);font-size:30px;
  font-weight:500;color:rgba(244,244,240,.74);line-height:1.5;}}
.s7-actions{{position:absolute;left:64px;top:1156px;z-index:3;display:flex;gap:16px;}}
.s7-btn{{display:inline-flex;align-items:center;gap:12px;padding:22px 32px;border-radius:999px;
  font-size:26px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;}}
.s7-btn.primary{{background:var(--clay);color:#fff;}}
.s7-btn.ghost{{border:2px solid rgba(244,244,240,.3);color:var(--paper);}}
.s7-btn svg{{width:28px;height:28px;}}
'''

html = f'''<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Training With Injury — wild edition — AA Performance</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700;800;900&family=Barlow:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>

<!-- IG CAPTION
{IG}
-->

<style>{CSS}</style>
</head>
<body>
<div class="topbar">
  <h1>Training With Injury — wild edition · 7 slides</h1>
  <p>1080×1350px · every slide a different design (colors + ball + text kept). Click <b>⬇ PNG</b> per slide. Serve via <b>python3 -m http.server 8000</b> for correct fonts.</p>
</div>
<div class="deck">
{shots}
</div>
<script>
  function initExport(){{
    document.querySelectorAll('.dl').forEach(function(btn){{
      btn.addEventListener('click', async function(){{
        var slide=btn.parentElement.querySelector('.post-canvas');var label=btn.textContent;btn.textContent='…';
        try{{var canvas=await html2canvas(slide,{{scale:1,useCORS:true,backgroundColor:null,logging:false}});
          var a=document.createElement('a');a.href=canvas.toDataURL('image/png');a.download=slide.id+'.png';a.click();
        }}catch(e){{alert('Export failed — open via a local server.');}}
        btn.textContent=label;
      }});
    }});
  }}
  if(window.html2canvas) document.fonts.ready.then(initExport);
</script>
</body>
</html>'''

with open(OUT, 'w', encoding='utf-8') as f:
    f.write(html)
print(f"Written: {OUT} ({len(html)} chars)")
