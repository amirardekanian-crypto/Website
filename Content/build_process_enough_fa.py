#!/usr/bin/env python3
# Build Content/carousel-process-enough-fa.html — Farsi text-only carousel.
# Base64 assets (court photo, tennis ball) are extracted MECHANICALLY from the
# current chrome reference (carousel-period-training.html) — never retyped.
import re, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REF  = os.path.join(HERE, 'carousel-period-training.html')
OUT  = os.path.join(HERE, 'carousel-process-enough-fa.html')

src = open(REF, encoding='utf-8').read()
blobs = re.findall(r'data:image/[a-z+]+;base64,[A-Za-z0-9+/=]+', src)

# court = the 45599-char jpeg used on every dark slide; ball = the 22954-char png
court = next(b for b in blobs if b.startswith('data:image/jpeg') and len(b) == 45599)
ball  = next(b for b in blobs if b.startswith('data:image/png')  and len(b) == 22954)
assert court and ball, 'asset extraction failed'
sys.stderr.write(f'court={len(court)}  ball={len(ball)}\n')

CAPTION = """
می‌تونی هر روز تمرین کنی و بازم مسابقه رو ببازی.

می‌تونی تمامِ شب درس بخونی و بازم بیفتی.
می‌تونی همه‌کاری برای یکی بکنی و بازم ترکت کنه.

فکر می‌کنیم اگه به‌اندازه‌ی کافی تلاش کنیم، حتماً به چیزی که می‌خوایم می‌رسیم. ولی این‌طوری نیست — و پذیرفتنش سخته.

نتیجه هیچ‌وقت دستِ تو نبود. چیزی که دستِ توئه، کاریه که می‌کنی.

پس کارِ خودت رو به بهترین شکل انجام بده، و بذار همین مسیر کافی باشه.

تو کدوم موقعیت این حس رو داشتی که همه‌کاری رو درست انجام دادی ولی نتیجه‌ش اون چیزی نشد که می‌خواستی؟ 👇

@amirardekanian

#انگیزه #ذهنیت_ورزشی #مربی_بدنسازی #تلاش #پشتکار #ورزش #تناسب_اندام #آمادگی_جسمانی #امیر_اردکانی
"""

# ---------------------------------------------------------------- slides
def ghost(n, left, top, size):
    return f'<div class="ghost-num" style="left:{left}px;top:{top}px;font-size:{size}px;">{n}</div>'

def ballimg(left, top, size, rot):
    return (f'<img class="ball-img" src="{ball}" alt="" '
            f'style="left:{left}px;top:{top}px;width:{size}px;height:{size}px;'
            f'transform:rotate({rot}deg);">')

HEADER = ('<div class="post-header"><div class="who"><span class="dot"></span>'
          '<span class="handle">AMIRARDEKANI.COM</span></div></div>')

slides = []

# 01 — cover (dark)
slides.append(f'''<div class="post-canvas tpl-cover fa dark" id="s1">
  {ghost('۰۱', -40, 70, 620)}
  {ballimg(944, -18, 74, -15)}
  {HEADER}
  <div class="body-wrap">
    <div class="stamp-tag">حقیقتِ سخت</div>
    <h1>می‌تونی هر روز تمرین کنی و بازم مسابقه رو <span class="hl">ببازی</span>.</h1>
  </div>
  <div class="post-footer"><div class="swipe">بکش <span class="arrow"></span></div></div>
</div>''')

# 02 — dark
slides.append(f'''<div class="post-canvas tpl-big fa dark" id="s2">
  {ghost('۰۲', 690, 880, 560)}
  {ballimg(72, 1238, 62, 22)}
  {HEADER}
  <div class="body-wrap">
    <h1>می‌تونی تمامِ شب برای امتحان درس بخونی و بازم <span class="hl">بیفتی</span>.</h1>
  </div>
</div>''')

# 03 — dark
slides.append(f'''<div class="post-canvas tpl-big fa dark" id="s3">
  {ghost('۰۳', 60, 900, 520)}
  {ballimg(508, -22, 76, -8)}
  {HEADER}
  <div class="body-wrap">
    <h1>می‌تونی همه‌کاری برای یکی بکنی و بازم <span class="hl">ترکت</span> کنه.</h1>
  </div>
</div>''')

# 04 — light, the turn
slides.append(f'''<div class="post-canvas tpl-big fa light" id="s4">
  {ghost('۰۴', 620, 655, 400)}
  {ballimg(-16, 700, 66, 12)}
  {HEADER}
  <div class="body-wrap">
    <h1>تو کارِ خودت رو کردی.</h1>
  </div>
  <div class="footnote">ولی <span class="acc">نتیجه</span> هیچ‌وقت دستِ تو نبود.</div>
</div>''')

# 05 — light
slides.append(f'''<div class="post-canvas tpl-big fa light" id="s5">
  {ghost('۰۵', -46, 940, 460)}
  {ballimg(966, 132, 58, -22)}
  {HEADER}
  <div class="body-wrap">
    <h1>فکر می‌کنیم اگه تلاش کنیم، به چیزی که می‌خوایم <span class="hl">می‌رسیم</span>.</h1>
  </div>
  <div class="footnote">ولی این‌طوری نیست.<br>و پذیرفتنش سخته.</div>
</div>''')

# 06 — light
slides.append(f'''<div class="post-canvas tpl-big fa light" id="s6">
  {ghost('۰۶', 660, 930, 470)}
  {ballimg(300, -26, 70, 30)}
  {HEADER}
  <div class="body-wrap">
    <h1>فکر می‌کنیم فقط <span class="hl">نتیجه</span> مهمه.</h1>
  </div>
  <div class="footnote">ولی نتیجه دستِ تو نیست؛<br>فقط کاری که می‌کنی دستِ توئه.</div>
</div>''')

# 07 — dark, the resolution
slides.append(f'''<div class="post-canvas tpl-big fa dark" id="s7">
  {ghost('۰۷', 630, 60, 600)}
  {ballimg(80, 1214, 68, -12)}
  {HEADER}
  <div class="body-wrap">
    <h1>کارِ خودت رو، به <span class="hl">بهترین</span> شکل انجام بده.</h1>
  </div>
  <div class="footnote">و بذار همین مسیر، کافی باشه.</div>
</div>''')

# 08 — CTA (dark)
slides.append(f'''<div class="post-canvas tpl-cta fa dark" id="s8">
  {ghost('۰۸', 640, 30, 620)}
  {ballimg(102, 781, 62, -10)}
  {HEADER}
  <div class="body-wrap">
    <div class="stamp-tag">نوبتِ توئه</div>
    <div class="cta-setup">یه نقشه تا هدفت.</div>
    <h1>یه <span class="hl">مربی</span> تو جیبت.</h1>
    <div class="cta-prompt">مسیرت ثبت می‌شه؛ پیشرفتت معلومه.</div>
    <div class="actions">
      <div class="cta-btn primary">
        <svg viewBox="0 0 24 24" fill="none"><path d="M5 4h14v17l-7-4-7 4z" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/></svg>
        ذخیره‌ش کن
      </div>
      <div class="cta-btn ghost">
        <svg viewBox="0 0 24 24" fill="none"><path d="M4 12v7h16v-7M16 6l-4-4-4 4M12 2v14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        بفرست
      </div>
    </div>
  </div>
</div>''')

deck = '\n\n'.join(
    f'<div class="shot"><button class="dl">⬇ PNG</button>\n{s}</div>' for s in slides
)

HTML = f'''<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>بذار همین مسیر کافی باشه — AA Performance</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>

<!-- IG CAPTION
{CAPTION.strip()}
-->

<style>
:root {{
  --accent:#C7552F; --clay:#C7552F; --clay-2:#E06B43;
  --green:#0E4A36; --ink:#0E4A36; --paper:#FAF7F2; --body-ink:#1A1A1A;
  --fa:'Vazirmatn',system-ui,sans-serif;
  --display:var(--fa); --mono:var(--fa); --latin:var(--fa);
  --pad-edge:64px;
}}
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0;}}
html,body{{background:#16161a;color:var(--paper);font-family:var(--fa);}}

.topbar{{max-width:1080px;margin:0 auto;padding:26px 20px 6px;color:#cfc9bf;direction:rtl;}}
.topbar h1{{font-size:24px;font-weight:700;margin-bottom:8px;}}
.topbar p{{font-size:14px;line-height:1.9;color:#b8b2a6;}}
.topbar b{{color:#fff;}}
.deck{{display:flex;flex-direction:column;align-items:center;gap:26px;padding:18px 12px 80px;}}
.shot{{position:relative;width:1080px;max-width:100%;}}
.dl{{position:absolute;top:12px;left:12px;z-index:10;cursor:pointer;background:rgba(0,0,0,.55);color:#fff;
  border:none;border-radius:9px;padding:9px 14px;font-family:var(--fa);font-size:14px;font-weight:600;}}
.dl:hover{{background:#000;}}

/* ===== CANVAS ===== */
.post-canvas{{width:1080px;height:1350px;position:relative;overflow:hidden;
  background-color:var(--ink);background-size:cover;background-position:center;
  color:var(--paper);font-family:var(--fa);max-width:100%;}}
.post-canvas.light{{background:var(--paper);color:var(--body-ink);}}
/* dark slides carry the real court photo under a heavy dark-green wash — texture, not subject */
.post-canvas.dark{{background-image:linear-gradient(to bottom, rgba(10,10,10,.34) 0%, rgba(10,10,10,.90) 100%), url("{court}");}}
.post-canvas::before{{content:"";position:absolute;inset:0;pointer-events:none;z-index:5;
  border:2px solid rgba(255,255,255,.30);margin:28px;border-radius:14px;}}
.post-canvas.light::before{{border-color:rgba(0,0,0,.18);}}
.post-canvas::after{{content:"";position:absolute;inset:0;pointer-events:none;z-index:6;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
  background-size:220px 220px;opacity:.06;}}
.post-canvas.light::after{{opacity:.045;}}

/* ===== GHOST NUMERAL — huge translucent background page-number (pagination) ===== */
.ghost-num{{position:absolute;font-weight:900;line-height:1;direction:ltr;
  color:rgba(255,255,255,.10);z-index:0;pointer-events:none;}}
.light .ghost-num{{color:rgba(14,74,54,.09);}}

.ball-img{{position:absolute;z-index:0;pointer-events:none;filter:drop-shadow(0 6px 14px rgba(0,0,0,.35));}}

/* ===== CHROME ===== */
.post-header{{position:absolute;top:var(--pad-edge);left:var(--pad-edge);right:var(--pad-edge);
  display:flex;align-items:center;justify-content:space-between;z-index:4;
  font-size:24px;font-weight:500;}}
.post-header .who{{display:flex;align-items:center;gap:14px;}}
.post-header .dot{{width:14px;height:14px;border-radius:50%;background:var(--accent);flex:0 0 auto;}}
.post-footer{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);bottom:var(--pad-edge);
  display:flex;align-items:flex-end;justify-content:flex-end;gap:24px;z-index:4;}}

.swipe{{font-size:24px;display:flex;align-items:center;gap:14px;opacity:.9;}}
.swipe .arrow{{width:56px;height:1.5px;background:currentColor;position:relative;}}
.swipe .arrow::after{{content:"";position:absolute;right:0;top:-5px;width:12px;height:12px;
  border-right:1.5px solid currentColor;border-top:1.5px solid currentColor;transform:rotate(45deg);}}

/* ===== TYPE BITS ===== */
.stamp-tag{{display:inline-block;background:var(--paper);color:#0A0A0A;
  font-size:28px;font-weight:800;padding:14px 26px;margin-bottom:36px;}}
.light .stamp-tag{{background:var(--ink);color:var(--paper);}}
.hl{{background:var(--clay);color:#fff;padding:0 .1em;box-decoration-break:clone;-webkit-box-decoration-break:clone;}}
.acc{{color:var(--clay-2);}}
.post-canvas.light .acc{{color:var(--clay);}}

/* ===== TPL-COVER ===== */
.tpl-cover .body-wrap{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);bottom:210px;z-index:2;}}
.tpl-cover h1{{font-weight:800;letter-spacing:-0.01em;}}

/* ===== TPL-BIG ===== */
.tpl-big .body-wrap{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);top:240px;z-index:2;}}
.tpl-big h1{{font-weight:800;letter-spacing:-0.01em;}}
.tpl-big .footnote{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);bottom:170px;z-index:2;
  font-size:72px;font-weight:700;color:rgba(244,244,240,.90);line-height:1.4;letter-spacing:-0.01em;}}
.light .footnote{{color:rgba(26,26,26,.86);}}

/* ===== TPL-CTA ===== fixed top, never translateY — html2canvas ignores transforms */
.tpl-cta .body-wrap{{position:absolute;left:var(--pad-edge);right:var(--pad-edge);top:330px;z-index:2;}}
.tpl-cta .stamp-tag{{margin-bottom:28px;}}
.tpl-cta .cta-setup{{font-size:46px;font-weight:600;color:rgba(244,244,240,.85);margin-bottom:14px;}}
.tpl-cta h1{{font-weight:800;letter-spacing:-0.01em;}}
.tpl-cta .cta-prompt{{font-size:54px;font-weight:600;color:rgba(244,244,240,.88);margin-top:36px;line-height:1.45;max-width:880px;}}
.tpl-cta .actions{{display:flex;gap:16px;margin-top:96px;flex-wrap:wrap;}}
.cta-btn{{display:inline-flex;align-items:center;gap:12px;padding:22px 32px;border-radius:999px;
  font-size:26px;font-weight:600;}}
.cta-btn.primary{{background:var(--accent);color:#fff;}}
.cta-btn.ghost{{border:2px solid rgba(244,244,240,.3);color:var(--paper);}}
.cta-btn svg{{width:28px;height:28px;}}

/* ===== FARSI / RTL — hard rules: no letter-spacing, no uppercase, Vazirmatn everywhere ===== */
.post-canvas.fa, .post-canvas.fa *, .post-canvas.fa *::before, .post-canvas.fa *::after {{
  font-family: var(--fa) !important;
  letter-spacing: 0 !important;
  text-transform: none !important;
}}
.post-canvas.fa {{ direction: rtl; text-align: right; }}
.post-canvas.fa h1, .post-canvas.fa .footnote, .post-canvas.fa .cta-prompt {{ line-height: 1.34 !important; }}
.post-canvas.fa .swipe .arrow {{ transform: scaleX(-1); }}
.post-canvas.fa .ghost-num {{ direction: ltr; }}

/* ===== PER-SLIDE TYPE SIZING (Vazirmatn sits larger than Barlow — dialled per line length) ===== */
#s1 h1{{font-size:104px;}}
#s2 h1{{font-size:100px;}}
#s3 h1{{font-size:108px;}}
#s4 h1{{font-size:140px;}}
#s5 h1{{font-size:92px;}}
#s6 h1{{font-size:124px;}}
#s7 h1{{font-size:104px;}}
#s8 h1{{font-size:108px;}}
#s4 .body-wrap{{top:300px;}}
#s6 .body-wrap{{top:280px;}}

/* ===== CLAY-CONTRAST FIXES (solid clay block ⇒ #fff text) ===== */
.cta-btn.primary{{color:#fff;}}
.cta-btn.primary svg path{{stroke:#fff;}}
</style>
</head>
<body>

<div class="topbar">
  <h1>بذار همین مسیر کافی باشه — ۸ اسلاید</h1>
  <p>۱۰۸۰×۱۳۵۰ · روی هر اسلاید دکمه‌ی <b>⬇ PNG</b> رو بزن تا خروجی بگیری. برای رندرِ درستِ فونت، با <b>python3 -m http.server 8000</b> سرو کن.</p>
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
</html>
'''

open(OUT, 'w', encoding='utf-8').write(HTML)
print('wrote', OUT, len(HTML), 'bytes')
