# -*- coding: utf-8 -*-
# Instagram story: «تغذیه‌ی روز مسابقه», Farsi, two frames, 1080x1920, same look as the carousel.
#   Frame 1: the hook and the three numbers, link sticker -> the Farsi lesson on the website.
#   Frame 2: the real lesson inside the app, link sticker -> the lesson in the app.
# Instagram's link sticker takes one URL, hence one frame per link. The sticker is added in
# Instagram, so each frame leaves an empty band for it (y 1400-1640).
# Instagram covers about the top 250 px and the bottom 250 px of a story: nothing that matters sits there.
# Run:  python Content/build_story_match_day_fuel.py
import re
import base64
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
KIT = REPO / 'Content' / 'Carousel-Kit.html'
OUT = REPO / 'Content' / 'story-match-day-fuel.html'
APP_SHOT = REPO / 'Content' / 'match-day-fuel' / 'app-lesson.jpg'

URL_SITE = 'https://www.amirardekani.com/fa/articles/match-day-nutrition.html'
URL_APP = 'https://www.amirardekani.com/program.html?article=match-day-nutrition'

kit = KIT.read_text(encoding='utf-8')
tb = re.search(r'(<symbol id="tennis-ball".*?</symbol>)', kit, re.DOTALL).group(1)
ball_png = re.search(r'(data:image/png;base64,[^"\']+)', tb).group(1)


def b64(path, mime):
    return f'data:{mime};base64,' + base64.b64encode(Path(path).read_bytes()).decode('ascii')


court = b64(REPO / 'court-sessions.jpg', 'image/jpeg')
shot = b64(APP_SHOT, 'image/jpeg')

FA = str.maketrans('0123456789', '۰۱۲۳۴۵۶۷۸۹')
fa = lambda n: str(n).translate(FA)


def ball(cx, cy, sz=70, rot=0):
    return (f'<img class="ball-img" src="{ball_png}" alt="" style="left:{int(cx - sz / 2)}px;top:{int(cy - sz / 2)}px;'
            f'width:{sz}px;height:{sz}px;transform:rotate({rot}deg);">')


HEADER = '<div class="post-header"><div class="who"><span class="dot"></span><span class="handle">AMIRARDEKANI.COM</span></div></div>'
SLOT = '<div class="slot" aria-hidden="true"></div>'

frames = []

frames.append(f'''
  {ball(120, 430, 74, -15)}
  {HEADER}
  <div class="body-wrap">
    <div class="stamp-tag">تغذیه‌ی روز مسابقه</div>
    <h1>روز مسابقه چی <span class="hl">بخوری؟</span></h1>
  </div>
  <div class="rows">
    <div class="row"><div class="k">قبل</div><div class="v">{fa(1)}&nbsp;تا&nbsp;{fa(4)} گرم کربوهیدرات به ازای هر کیلو<div class="s">{fa(1)}&nbsp;تا&nbsp;{fa(4)} ساعت قبل از بازی</div></div></div>
    <div class="row"><div class="k">حین</div><div class="v">{fa(30)}&nbsp;تا&nbsp;{fa(60)} گرم کربوهیدرات در ساعت<div class="s">وقتی بازی از {fa(90)} دقیقه بیشتر می‌شه</div></div></div>
    <div class="row"><div class="k">بعد</div><div class="v">{fa(1)}&nbsp;تا&nbsp;{fa('1.2')} گرم به ازای هر کیلو، هر ساعت<div class="s">اگه تا {fa(8)} ساعت دیگه بازی داری</div></div></div>
  </div>
  <div class="cue">درسِ کامل، با منبع‌ها ↓</div>
  {SLOT}''')

frames.append(f'''
  {ball(120, 1330, 66, 14)}
  {HEADER}
  <div class="body-wrap">
    <div class="stamp-tag">توی اپ هم هست</div>
    <h1 class="one">درسِ کامل، توی <span class="hl">اپ</span></h1>
  </div>
  <div class="phone"><img src="{shot}" alt="Match-Day Fuel in the app"></div>
  <div class="cue">بخونش توی اپ (انگلیسی) ↓</div>
  {SLOT}''')

CSS = """
:root{--accent:#C7552F;--clay:#C7552F;--clay-2:#E06B43;--green:#0E4A36;--ink:#0E4A36;--paper:#FAF7F2;
  --fa:'Vazirmatn',system-ui,sans-serif;--latin:'Barlow Condensed',system-ui,sans-serif;--pad-edge:72px;}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body{background:#16161a;color:var(--paper);font-family:var(--fa);}
.topbar{max-width:1080px;margin:0 auto;padding:26px 20px 6px;color:#cfc9bf;font-size:15px;line-height:1.9;}
.topbar h1{font-size:24px;font-weight:700;margin-bottom:8px;}
.topbar b{color:#fff;} .topbar code{background:#26262c;padding:2px 8px;border-radius:6px;color:#fff;word-break:break-all;}
.deck{display:flex;flex-direction:column;align-items:center;gap:26px;padding:18px 12px 80px;}
.shot{position:relative;width:1080px;max-width:100%;}
.dl{position:absolute;top:12px;left:12px;z-index:10;cursor:pointer;background:rgba(0,0,0,.55);color:#fff;border:none;border-radius:9px;padding:9px 14px;font-family:var(--latin);font-size:14px;font-weight:600;}
.dl:hover{background:#000;}

.story{width:1080px;height:1920px;position:relative;overflow:hidden;color:var(--paper);direction:rtl;text-align:right;
  background-color:var(--ink);background-size:cover;background-position:center;
  background-image:linear-gradient(to bottom,rgba(10,10,10,.30) 0%,rgba(10,10,10,.88) 100%),url("@@COURT@@");}
.story::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:6;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.9'/%3E%3C/svg%3E");background-size:220px 220px;opacity:.06;}
.story, .story *, .story *::before, .story *::after{font-family:var(--fa) !important;letter-spacing:0 !important;text-transform:none !important;}
.ball-img{position:absolute;z-index:1;pointer-events:none;filter:drop-shadow(0 6px 14px rgba(0,0,0,.35));}

.post-header{position:absolute;top:256px;left:var(--pad-edge);right:var(--pad-edge);display:flex;align-items:center;justify-content:space-between;z-index:4;font-size:28px;font-weight:500;}
.post-header .who{display:flex;align-items:center;gap:14px;}
.post-header .dot{width:16px;height:16px;border-radius:50%;background:var(--accent);}
.post-header .handle{direction:ltr;unicode-bidi:embed;}

.body-wrap{position:absolute;left:var(--pad-edge);right:var(--pad-edge);top:360px;z-index:3;}
.stamp-tag{display:inline-block;background:var(--paper);color:#0A0A0A;font-size:34px;font-weight:800;padding:14px 30px;margin-bottom:34px;}
h1.one{font-size:106px;}
h1{font-size:128px;font-weight:800;line-height:1.3 !important;}
.hl{display:inline-block;background:var(--clay);color:#fff;padding:0 .14em;line-height:1.18 !important;}

/* frame 1: the three numbers */
.rows{position:absolute;left:var(--pad-edge);right:var(--pad-edge);top:830px;z-index:3;display:flex;flex-direction:column;gap:22px;}
.row{display:flex;align-items:center;gap:30px;background:rgba(14,74,54,.92);border:1px solid rgba(255,255,255,.14);border-radius:20px;padding:22px 34px;}
.row .k{flex:0 0 150px;font-size:56px;font-weight:800;color:var(--clay-2);}
.row .v{font-size:42px;font-weight:700;line-height:1.4 !important;}
.row .s{font-size:32px;font-weight:600;color:rgba(244,244,240,.78);margin-top:4px;}

/* frame 2: the app, in a phone */
.phone{position:absolute;left:290px;top:660px;width:500px;height:661px;border-radius:44px;overflow:hidden;z-index:3;
  border:12px solid #0b0b0d;background:#0b0b0d;box-shadow:0 30px 80px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.12);}
.phone img{width:100%;display:block;}

/* the link sticker goes here (added in Instagram) */
.cue{position:absolute;left:var(--pad-edge);right:var(--pad-edge);top:1385px;z-index:3;font-size:44px;font-weight:700;color:var(--clay-2);}
.slot{position:absolute;left:150px;right:150px;top:1460px;height:180px;border:3px dashed rgba(244,244,240,.30);border-radius:90px;z-index:2;}
"""
CSS = CSS.replace('@@COURT@@', court)

shots = []
for i, inner in enumerate(frames, 1):
    shots.append(f'<div class="shot"><button class="dl">⬇ PNG</button>\n<div class="story" id="f{i}">{inner}\n</div></div>')

html = f"""<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>تغذیه‌ی روز مسابقه · استوری</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<style>{CSS}</style>
</head>
<body>

<div class="topbar" dir="ltr">
  <h1>Match-Day Fuel · Instagram story, 2 frames (1080×1920)</h1>
  Export each frame with <b>⬇ PNG</b>, post them as two story slides, and add a <b>link sticker</b> over the dashed band on each (the dashed line is only a guide and is covered by the sticker).<br>
  Frame 1 sticker, the Farsi lesson on the website: <code>{URL_SITE}</code><br>
  Frame 2 sticker, the lesson in the app (opens in English, no login): <code>{URL_APP}</code><br>
  Instagram's link sticker takes one URL, which is why there is one frame per link.
</div>

<div class="deck">

{chr(10).join(shots)}

</div>

<script>
  function initExport(){{
    document.querySelectorAll('.dl').forEach(function(btn){{
      btn.addEventListener('click', async function(){{
        var slide = btn.parentElement.querySelector('.story');
        var label = btn.textContent; btn.textContent = '…';
        try{{
          var canvas = await html2canvas(slide,{{scale:1,useCORS:true,backgroundColor:null,logging:false}});
          var a=document.createElement('a'); a.href=canvas.toDataURL('image/png');
          a.download='match-day-fuel-story-'+slide.id+'.png'; a.click();
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
