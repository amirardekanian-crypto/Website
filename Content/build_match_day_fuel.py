# -*- coding: utf-8 -*-
# Carousel: «تغذیه‌ی روز مسابقه» (Match-Day Fuel), Farsi, 8 slides, 1080x1350.
# Chrome = carousel-period-training.html (ghost page-number, stamp-tag eyebrow, plain ball,
# black-blend court scrim). Farsi rules = Carousel-Kit.html FARSI/RTL block.
# Numbers = articles/nutrition/match-day-nutrition.json (checked against the 2025 ITF/WTA/ATP
# nutrition statement, Ranchordas 2013, Kovacs 2006). Change a number there first, then here.
# Run:  python Content/build_match_day_fuel.py
import re
import base64
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
KIT = REPO / 'Content' / 'Carousel-Kit.html'
OUT = REPO / 'Content' / 'carousel-match-day-fuel.html'

kit = KIT.read_text(encoding='utf-8')
tb = re.search(r'(<symbol id="tennis-ball".*?</symbol>)', kit, re.DOTALL).group(1)
# the ball PNG is pulled out of the symbol and embedded as a plain <img>: html2canvas drops <use>
ball_png = re.search(r'(data:image/png;base64,[^"\']+)', tb).group(1)


def b64(path, mime):
    return f'data:{mime};base64,' + base64.b64encode((REPO / path).read_bytes()).decode('ascii')


court = b64('court-sessions.jpg', 'image/jpeg')
court_clay = b64('court-playbook.jpg', 'image/jpeg')

FA_DIGITS = str.maketrans('0123456789', '۰۱۲۳۴۵۶۷۸۹')


def fa(n):
    return str(n).translate(FA_DIGITS)


def ball(cx, cy, sz=64, rot=0):
    return (f'<img class="ball-img" src="{ball_png}" alt="" style="left:{int(cx - sz / 2)}px;'
            f'top:{int(cy - sz / 2)}px;width:{sz}px;height:{sz}px;transform:rotate({rot}deg);">')


def ghost(n, x, y, size=520):
    return f'<div class="ghost-num" style="left:{x}px;top:{y}px;font-size:{size}px;">{fa("%02d" % n)}</div>'


HEADER = '<div class="post-header"><div class="who"><span class="dot"></span><span class="handle">AMIRARDEKANI.COM</span></div></div>'

IG = """روز مسابقه چی بخوریم که بهتر اجرا کنیم؟

بیشترِ بازیکن‌ها وقتی به غذا فکر می‌کنن که توی ستِ سوم بی‌جون شدن. اون موقع دیره.

خلاصه‌ی برنامه، با عدد:
↳ قبل از بازی: ۱ تا ۴ گرم کربوهیدرات به ازای هر کیلو وزن، ۱ تا ۴ ساعت قبل. هیدراته وارد زمین شو.
↳ حین بازی: از ۹۰ دقیقه به بالا حدود ۳۰ تا ۶۰ گرم کربوهیدرات در ساعت. هر تعویضِ زمین یه کم آب.
↳ بعد از بازی: اگه تا ۸ ساعت دیگه بازی داری، ریکاوری رو زود شروع کن.
↳ و یه قانون: روز مسابقه جای امتحانِ چیز جدید نیست. توی تمرین تستش کن.

عددها بر پایه‌ی گزارشِ ITF و WTA و ATP دربارهٔ تغذیه در تنیس. درسِ کامل، با منبع‌ها، رایگان توی اپ و سایته. لینکش توی استوریه.

تو روز مسابقه معمولاً چی می‌خوری؟ بنویس 👇

@amirardekanian

#تغذیه_ورزشی #تغذیه_روز_مسابقه #تنیس #پدل #بدنسازی_تنیس #ریکاوری #تنیس_ایران #مربی_بدنسازی #امیر_اردکانیان"""

slides = []

# 1 · COVER
slides.append(('cover', '', f'''
  {ghost(1, 560, 70, 560)}
  {ball(70, 130, 70, -15)}
  {HEADER}
  <div class="body-wrap">
    <div class="stamp-tag">تغذیه‌ی روز مسابقه</div>
    <h1>روز مسابقه چی بخوری که بهتر <span class="hl">بازی</span>&nbsp;کنی؟</h1>
    <div class="sub">قبل، حین و بعد از بازی. با عدد.</div>
  </div>
  <div class="post-footer"><div class="swipe">بکش <span class="arrow"></span></div></div>''', 'court'))

# 2 · STAT (carbohydrate before play)
slides.append(('stat', '', f'''
  {ghost(2, -40, 860, 520)}
  {ball(130, 330, 62, 18)}
  {HEADER}
  <div class="body-wrap">
    <div class="stamp-tag">قبل از بازی</div>
    <div class="stat-value">{fa('۱')} تا {fa('۴')}</div>
    <div class="stat-label">گرم کربوهیدرات به ازای هر کیلو وزن، {fa('۱')} تا {fa('۴')} ساعت قبل از بازی</div>
  </div>
  <div class="stat-source">مثال: {fa(70)} کیلو، {fa(3)} ساعت قبل: {fa(140)} تا {fa(210)} گرم</div>''', 'court'))

# 3 · BIG (hydration)
slides.append(('big', '', f'''
  {ghost(3, 520, 880, 520)}
  {ball(1000, 40, 66, -25)}
  {HEADER}
  <div class="body-wrap">
    <div class="stamp-tag">قبل از بازی</div>
    <h1>هیدراته وارد <span class="acc">زمین&nbsp;شو.</span></h1>
  </div>
  <div class="footnote">حدود {fa(5)} تا {fa(7)} میلی‌لیتر به ازای هر کیلو وزن، توی ساعت‌های قبل از بازی. رنگ ادرارت زرد کم‌رنگ باشه.</div>''', 'clay'))

# 4 · MANIFESTO (light): carbohydrate by match length
slides.append(('manifesto light', '', f'''
  {ghost(4, -10, 8, 280)}
  {ball(60, 1010, 56, 12)}
  {HEADER}
  <div class="body-wrap">
    <div class="stamp-tag stamp-tag-dark">حین بازی: کربوهیدرات</div>
    <h1>بازی <span class="hl">چقدر</span> طول می‌کشه؟</h1>
  </div>
  <div class="manifesto">
    <div class="manifesto-row">
      <div class="m-num">{fa('۱')}</div>
      <div class="m-body"><div class="m-ttl">{fa(45)} تا {fa(75)} دقیقه</div><div class="m-cue">مقدار کم کافیه، حتی فقط یه دهان‌شویه</div></div>
    </div>
    <div class="manifesto-row">
      <div class="m-num">{fa('۲')}</div>
      <div class="m-body"><div class="m-ttl">{fa(90)} دقیقه تا {fa(3)} ساعت</div><div class="m-cue">{fa(30)} تا {fa(60)} گرم در ساعت</div></div>
    </div>
    <div class="manifesto-row">
      <div class="m-num">{fa('۳')}</div>
      <div class="m-body"><div class="m-ttl">خیلی طولانی، مثل پنج ست</div><div class="m-cue">تا {fa(60)} تا {fa(90)} گرم در ساعت</div></div>
    </div>
  </div>''', None))

# 5 · RULES (dark): fluids and sodium
slides.append(('rules', '', f'''
  {ghost(5, 560, 60, 560)}
  {ball(40, 1300, 64, -12)}
  {HEADER}
  <div class="body-wrap">
    <div class="stamp-tag">حین بازی</div>
    <h1>مایعات و <span class="hl">سدیم</span></h1>
  </div>
  <div class="cards">
    <div class="rule-card"><div class="check">{fa('۱')}</div><div class="body"><div class="ttl">هر تعویضِ زمین: حدود {fa(200)} میلی‌لیتر</div><div class="sub">بالای {fa(27)} درجه: تا {fa(400)} میلی‌لیتر</div></div></div>
    <div class="rule-card"><div class="check">{fa('۲')}</div><div class="body"><div class="ttl">بیشتر از چیزی که عرق می‌کنی نخور</div><div class="sub">زیادی نوشیدن هم خطره</div></div></div>
    <div class="rule-card"><div class="check">{fa('۳')}</div><div class="body"><div class="ttl">سدیم: {fa(300)} تا {fa(600)} میلی‌گرم در ساعت</div><div class="sub">نقطه‌ی شروعه. عددِ رسمی نداره، با آزمونِ عرق تنظیمش کن</div></div></div>
  </div>''', 'court'))

# 6 · COMPARE (dark): after play
slides.append(('compare', '', f'''
  {ghost(6, 80, 330, 480)}
  {ball(540, 1330, 64, 8)}
  {HEADER}
  <div class="body-wrap">
    <div class="stamp-tag">بعد از بازی</div>
    <h1><span class="hl">بعدش</span> چی؟</h1>
  </div>
  <div class="cols">
    <div class="col-card plain">
      <div class="col-tag">امروز دیگه بازی نداری</div>
      <ul class="col-list">
        <li>یه وعده‌ی معمولی</li>
        <li>کربوهیدرات و پروتئین</li>
        <li>مایعات و کمی نمک</li>
      </ul>
    </div>
    <div class="col-card good">
      <div class="col-tag">تا ۸ ساعت دیگه بازی داری</div>
      <ul class="col-list">
        <li>{fa(4)} ساعتِ اول: {fa(1)} تا {fa('۱.۲')} گرم کربوهیدرات به ازای هر کیلو، هر ساعت</li>
        <li>{fa(20)} تا {fa(40)} گرم پروتئین</li>
        <li>به ازای هر کیلوی کم‌شده: {fa('۱.۲۵')} تا {fa('۱.۵')} لیتر مایعات</li>
      </ul>
    </div>
  </div>''', 'court'))

# 7 · BIG (the rule)
slides.append(('big', '', f'''
  {ghost(7, 600, -40, 600)}
  {ball(90, 1270, 62, -20)}
  {HEADER}
  <div class="body-wrap">
    <h1>روز مسابقه جای امتحانِ چیزِ <span class="acc">جدید</span> نیست.</h1>
  </div>
  <div class="footnote">ژل و نوشیدنیِ ورزشی رو توی تمرین تست کن. ببین معده‌ات چی رو تحمل می‌کنه.</div>''', 'court'))

# 8 · CTA
slides.append(('cta', '', f'''
  {ghost(8, 540, 30, 620)}
  {ball(940, 1090, 64, -10)}
  {HEADER}
  <div class="body-wrap">
    <div class="stamp-tag">قدم بعدی</div>
    <div class="cta-setup">یه نقشه تا هدفت.</div>
    <h1>یه <span class="hl">مربی</span> تو جیبت.</h1>
    <div class="cta-prompt">درسِ کاملِ تغذیه‌ی روز مسابقه، با منبع‌ها، رایگان توی اپ و سایته. لینکش توی استوریه.</div>
    <div class="actions">
      <div class="cta-btn primary"><svg viewBox="0 0 24 24" fill="none"><path d="M6 3h12v18l-6-4-6 4V3z" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/></svg>ذخیره‌ش کن</div>
      <div class="cta-btn ghost">بفرست</div>
    </div>
  </div>''', 'court'))

# ===================== CSS =====================
CSS = """
:root{--accent:#C7552F;--clay:#C7552F;--clay-2:#E06B43;--green:#0E4A36;--ink:#0E4A36;--paper:#FAF7F2;--body-ink:#1A1A1A;
  --fa:'Vazirmatn',system-ui,sans-serif;--latin:'Barlow Condensed',system-ui,sans-serif;--pad-edge:64px;}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body{background:#16161a;color:var(--paper);font-family:var(--fa);}
.topbar{max-width:1080px;margin:0 auto;padding:26px 20px 6px;color:#cfc9bf;}
.topbar h1{font-size:24px;font-weight:700;margin-bottom:8px;}
.topbar p{font-size:14px;line-height:1.9;color:#b8b2a6;}
.topbar b{color:#fff;}
.deck{display:flex;flex-direction:column;align-items:center;gap:26px;padding:18px 12px 80px;}
.shot{position:relative;width:1080px;max-width:100%;}
.dl{position:absolute;top:12px;left:12px;z-index:10;cursor:pointer;background:rgba(0,0,0,.55);color:#fff;border:none;border-radius:9px;padding:9px 14px;font-family:var(--latin);font-size:14px;font-weight:600;}
.dl:hover{background:#000;}

.post-canvas{width:1080px;height:1350px;position:relative;overflow:hidden;background-color:var(--ink);background-size:cover;background-position:center;color:var(--paper);max-width:100%;}
.post-canvas.light{background:var(--paper);color:var(--body-ink);}
.post-canvas::before{content:"";position:absolute;inset:0;pointer-events:none;z-index:5;border:2px solid rgba(255,255,255,.30);margin:28px;border-radius:14px;}
.post-canvas.light::before{border-color:rgba(0,0,0,.18);}
.post-canvas::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:6;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.9'/%3E%3C/svg%3E");background-size:220px 220px;opacity:.06;}
.post-canvas.light::after{opacity:.045;}

.bg-court{background-image:linear-gradient(to bottom,rgba(10,10,10,.30) 0%,rgba(10,10,10,.88) 100%),url("@@COURT@@");}
.bg-clay{background-image:linear-gradient(to bottom,rgba(199,85,47,.45) 0%,rgba(10,10,10,.86) 100%),url("@@CLAY@@");}

/* ghost page-number: the number itself says which slide you are on */
.ghost-num{position:absolute;font-weight:900;line-height:1;color:rgba(255,255,255,.10);z-index:0;pointer-events:none;direction:ltr;}
.tpl-manifesto .ghost-num{color:rgba(14,74,54,.08);}
.ball-img{position:absolute;z-index:0;pointer-events:none;filter:drop-shadow(0 6px 14px rgba(0,0,0,.35));}

.post-header{position:absolute;top:var(--pad-edge);left:var(--pad-edge);right:var(--pad-edge);display:flex;align-items:center;justify-content:space-between;z-index:4;font-size:24px;font-weight:500;}
.post-header .who{display:flex;align-items:center;gap:14px;}
.post-header .dot{width:14px;height:14px;border-radius:50%;background:var(--accent);}
.post-header .handle{direction:ltr;unicode-bidi:embed;}
.post-footer{position:absolute;left:var(--pad-edge);right:var(--pad-edge);bottom:var(--pad-edge);display:flex;align-items:flex-end;justify-content:flex-end;gap:24px;z-index:4;}
.swipe{font-size:30px;font-weight:600;display:flex;align-items:center;gap:14px;opacity:.9;}
.swipe .arrow{width:56px;height:2px;background:currentColor;position:relative;}
.swipe .arrow::after{content:"";position:absolute;right:0;top:-5px;width:12px;height:12px;border-right:2px solid currentColor;border-top:2px solid currentColor;transform:rotate(45deg);}

.stamp-tag{display:inline-block;background:var(--paper);color:#0A0A0A;font-size:30px;font-weight:800;padding:12px 26px;margin-bottom:34px;}
.stamp-tag-dark{background:var(--ink);color:var(--paper);}
.hl{display:inline-block;background:var(--clay);color:#fff;padding:0 .14em;line-height:1.18 !important;}
.tpl-manifesto .hl{background:#0A0A0A;}
.acc{color:var(--clay-2);}
.post-canvas.light .acc{color:var(--clay);}

/* ===== FARSI / RTL (kit block): Vazirmatn only, no letter-spacing, no uppercase ===== */
.post-canvas, .post-canvas *, .post-canvas *::before, .post-canvas *::after{font-family:var(--fa) !important;letter-spacing:0 !important;text-transform:none !important;}
.post-canvas{direction:rtl;text-align:right;}
.post-canvas h1,.post-canvas .stat-label,.post-canvas .sub,.post-canvas .rule-card .ttl,.post-canvas .col-list li{line-height:1.32 !important;}
.swipe .arrow{transform:scaleX(-1);}

/* ----- cover ----- */
.tpl-cover .body-wrap{position:absolute;left:var(--pad-edge);right:var(--pad-edge);bottom:250px;}
.tpl-cover h1{font-size:112px;font-weight:800;line-height:1.34 !important;}
.tpl-cover .sub{font-size:52px;font-weight:600;color:rgba(244,244,240,.80);margin-top:28px;}

/* ----- stat ----- */
.tpl-stat .body-wrap{position:absolute;left:var(--pad-edge);right:var(--pad-edge);top:250px;}
.tpl-stat .stat-value{font-size:270px;font-weight:800;line-height:1.05 !important;color:var(--clay-2);margin-top:10px;}
.tpl-stat .stat-label{font-size:58px;font-weight:700;margin-top:26px;max-width:880px;}
.tpl-stat .stat-source{position:absolute;left:var(--pad-edge);right:var(--pad-edge);bottom:150px;font-size:38px;font-weight:600;color:rgba(244,244,240,.80);line-height:1.4;z-index:2;}

/* ----- big ----- */
.tpl-big .body-wrap{position:absolute;left:var(--pad-edge);right:var(--pad-edge);top:210px;}
.tpl-big h1{font-size:120px;font-weight:800;line-height:1.2 !important;}
.tpl-big .footnote{position:absolute;left:var(--pad-edge);right:var(--pad-edge);bottom:170px;z-index:2;font-size:46px;font-weight:600;color:rgba(244,244,240,.84);line-height:1.5;}

/* ----- manifesto (light), RTL: numerals bleed off the right edge ----- */
.tpl-manifesto .body-wrap{position:absolute;left:var(--pad-edge);right:var(--pad-edge);top:190px;z-index:2;}
.tpl-manifesto h1{font-size:92px;font-weight:800;line-height:1.2 !important;}
.manifesto{position:absolute;left:0;right:0;bottom:64px;top:560px;display:flex;flex-direction:column;z-index:2;}
.manifesto-row{position:relative;flex:1;display:flex;align-items:center;border-top:4px solid rgba(10,10,10,.85);padding:0 200px 0 var(--pad-edge);}
.manifesto-row:last-child{border-bottom:4px solid rgba(10,10,10,.85);}
.m-num{position:absolute;right:30px;top:0;bottom:0;display:flex;align-items:center;font-size:170px;font-weight:900;color:rgba(10,10,10,.92);line-height:1;}
.m-ttl{font-size:58px;font-weight:800;line-height:1.25 !important;}
.m-cue{font-size:38px;font-weight:800;color:var(--clay);margin-top:12px;line-height:1.35 !important;}

/* ----- rules (dark court) ----- */
.tpl-rules .body-wrap{position:absolute;left:var(--pad-edge);right:var(--pad-edge);top:200px;}
.tpl-rules h1{font-size:104px;font-weight:800;line-height:1.2 !important;}
.tpl-rules .cards{position:absolute;left:var(--pad-edge);right:var(--pad-edge);bottom:170px;display:flex;flex-direction:column;gap:20px;z-index:2;}
.rule-card{background:rgba(14,74,54,.92);border:1px solid rgba(255,255,255,.14);color:var(--paper);border-radius:18px;padding:28px 32px;display:flex;align-items:center;gap:28px;}
.rule-card .check{width:84px;height:84px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:48px;font-weight:800;}
.rule-card .body{flex:1;}
.rule-card .ttl{font-size:46px;font-weight:700;}
.rule-card .sub{font-size:32px;font-weight:700;color:var(--clay-2);margin-top:8px;line-height:1.35 !important;}

/* ----- compare (dark court) ----- */
.tpl-compare .body-wrap{position:absolute;left:var(--pad-edge);right:var(--pad-edge);top:200px;}
.tpl-compare h1{font-size:104px;font-weight:800;line-height:1.2 !important;}
.tpl-compare .cols{position:absolute;left:var(--pad-edge);right:var(--pad-edge);bottom:150px;z-index:2;display:grid;grid-template-columns:1fr 1fr;gap:24px;}
.col-card{border-radius:22px;padding:34px 32px;min-height:560px;}
.col-card .col-tag{font-size:38px;font-weight:800;margin-bottom:28px;line-height:1.3 !important;}
.col-card .col-list{list-style:none;display:flex;flex-direction:column;gap:20px;}
.col-card .col-list li{font-size:34px;font-weight:600;line-height:1.4 !important;padding-right:34px;position:relative;}
.col-card .col-list li::before{content:"";position:absolute;right:0;top:.7em;width:18px;height:3px;background:currentColor;}
.col-card.plain{background:rgba(0,0,0,.34);border:1px solid rgba(255,255,255,.14);color:rgba(244,244,240,.92);}
.col-card.good{background:var(--accent);color:#fff;}

/* ----- cta ----- */
.tpl-cta .body-wrap{position:absolute;left:var(--pad-edge);right:var(--pad-edge);top:330px;z-index:2;text-align:right;}
#s3 h1{font-size:160px;line-height:1.15 !important;}
#s7 h1{font-size:134px;}
.tpl-cta .cta-setup{font-size:46px;font-weight:600;color:rgba(244,244,240,.82);margin-bottom:12px;}
.tpl-cta h1{font-size:108px;font-weight:800;line-height:1.2 !important;}
.tpl-cta .cta-prompt{font-size:38px;font-weight:600;color:rgba(244,244,240,.80);margin-top:40px;line-height:1.55;max-width:880px;}
.tpl-cta .actions{display:flex;gap:16px;margin-top:80px;flex-wrap:wrap;}
.cta-btn{display:inline-flex;align-items:center;gap:12px;padding:22px 36px;border-radius:999px;font-size:34px;font-weight:700;}
.cta-btn.primary{background:var(--accent);color:#fff;}
.cta-btn.ghost{border:2px solid rgba(244,244,240,.3);color:var(--paper);}
.cta-btn svg{width:30px;height:30px;}
"""
CSS = CSS.replace('@@COURT@@', court).replace('@@CLAY@@', court_clay)

RANGE = re.compile('(?<=[۰-۹]) تا (?=[۰-۹])')
shots = []
for i, (cls, _x, inner, bg) in enumerate(slides, 1):
    inner = RANGE.sub(' تا ', inner)
    bgc = {'court': ' bg-court', 'clay': ' bg-clay', None: ''}[bg]
    light = ' light' if 'light' in cls else ''
    tpl = cls.replace(' light', '')
    shots.append(f'<div class="shot"><button class="dl">⬇ PNG</button>\n'
                 f'<div class="post-canvas tpl-{tpl}{light} fa{bgc}" id="s{i}">{inner}\n</div></div>')
deck = '\n\n'.join(shots)

html = f"""<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>تغذیه‌ی روز مسابقه · AA Performance</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>

<!-- IG CAPTION
{IG}
-->

<style>{CSS}</style>
</head>
<body>

<div class="topbar" dir="ltr">
  <h1>تغذیه‌ی روز مسابقه · 8 slides</h1>
  <p>1080×1350px · click <b>⬇ PNG</b> on each slide to export. The IG caption is in the comment at the top of this file. Numbers: articles/nutrition/match-day-nutrition.json.</p>
</div>

<div class="deck">

{deck}

</div>

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
        }}catch(e){{ alert('Export failed. Open via a local server.'); }}
        btn.textContent=label;
      }});
    }});
  }}
  if(window.html2canvas) document.fonts.ready.then(initExport);
</script>

</body>
</html>"""

OUT.write_text(html, encoding='utf-8')
print(f'Written {OUT.name}: {len(html)} chars')
