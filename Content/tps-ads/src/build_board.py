# -*- coding: utf-8 -*-
import base64, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)          # Content/tps-ads/
S = os.path.join(ROOT, "assets")      # the preview crops
def b64(tag):
    with open(f"{S}/{tag}.jpg","rb") as f:
        return "data:image/jpeg;base64," + base64.b64encode(f.read()).decode()

# beat = (time, what happens on screen, farsi line, provenance)
#   V = word for word from the course / the page / the button
#   C = the course's own fact, tightened for the screen
#   D = my draft wording -- yours to change
V,C,D = "V","C","D"

ADS = [
 dict(n="01", role="Cold reach", title="One step late", fa="یک قدم دیر",
      hook=["به توپ رسیدی.","یک قدم دیر."],
      who="The player who trains tennis five days a week and never trains their body.",
      idea="You don't lose the point at the racket. You lose it at the second step — the brake, the push-off, the change of direction. That is trainable, and it is what the course is about.",
      look="The camera never leaves the ground. Clay, dust, low. Type sits in the dust.",
      beats=[("0–2s","Clip: a shoe brakes on clay, dust bursts forward.","به توپ رسیدی.",D),
             ("2–5s","The slide mark holds on screen, dust settling.","یک قدم دیر.",D),
             ("5–9s","Type only, clay on the last two words.","آن یک قدم، تکنیک نیست.",D),
             ("9–15s","Fast cuts: acceleration, braking mark, the spider-drill court.","شتاب، ترمز، تغییر جهت — تمرین می‌خواهند.",D),
             ("15–22s","The four blocks build as a ladder.","۴ بلوک. ۱۶ هفته.",C),
             ("22–28s","Button. Brand row.","هفته‌ی ۱ رو رایگان امتحان کن",V)],
      src="Lessons «سرعت، ترمز و تغییر جهت» and «تنیس از بدنت چه می‌خواهد»",
      reuse="braking-mark · full-acceleration · five-points · rally-map",
      gen="braking-mark recomposed to 9:16 (1 cr) + a 3s brake-and-dust clip (3 cr)",
      cost=4, img=b64("ad1")),

 dict(n="02", role="The differentiator", title="Stronger in the gym", fa="تو باشگاه قوی‌تر شدی",
      hook=["تو باشگاه قوی‌تر شدی.","تو زمین چی؟"],
      who="The player who already lifts — and cannot see it in their tennis.",
      idea="Strength does not turn into speed by itself. This is the one claim no generic gym program can make, and the course backs it structurally: block 4 is literally called «انتقال به زمین» — Transfer.",
      look="Hard cuts between two worlds: iron and dark, then clay and light. The cut is the ad. The rhythm accelerates until the two worlds join.",
      beats=[("0–3s","Clip: chalked hands tighten on the trap bar, chalk dust lifts.","تو باشگاه قوی‌تر شدی.",D),
             ("3–6s","Hard cut to clay. Silence, no movement.","تو زمین، هیچ فرقی نکرد.",D),
             ("6–10s","Type only.","قدرت خودش به سرعت تبدیل نمی‌شه.",D),
             ("10–20s","The four block names climb as a ladder; the fourth lights clay.","پایه‌سازی · پیشرفت · انفجار · انتقال به زمین",V),
             ("20–25s","Hold on block 4.","اسم بلوک ۴ همینه: انتقال به زمین.",D),
             ("25–30s","Button. Brand row.","هفته‌ی ۱ رو رایگان امتحان کن",V)],
      src="The four block names and goals, verbatim from the app's programme screen",
      reuse="the grip clip — 20 Sep, confirmed good by you 21 Sep · first-light · morning-load · the-row · gym-room",
      gen="Nothing.",
      cost=0, img=b64("ad2")),

 dict(n="03", role="A new audience", title="New shoes again?", fa="باز کفش نو لازم داریم؟",
      hook=["باز کفش نو لازم داریم؟"],
      who="Parents of 13–17 year olds. They pay for the tennis, and nobody is selling them this.",
      idea="The course already has a teen version (13–15), a growth-spurt lesson and a parents' guide. The hook is the course's own first sign of a growth spurt — a sentence every parent of a teenager has said out loud.",
      look="Home. Warm, still, domestic. No court, no gym, no iron. The only one of the five that does not look like a fitness ad — which is exactly why a parent stops on it.",
      beats=[("0–3s","Clip: light drifts across a door frame of pencil height marks, a racket leaning.","باز کفش نو لازم داریم؟",V),
             ("3–9s","Three of the course's own signs, one per line.","شلوارش زود کوتاه شد. سرویسش به هم ریخت. رکورد پرشش ثابت ماند.",C),
             ("9–13s","Type only.","اینها نشانه‌های رشد جهشی‌اند.",D),
             ("13–18s","The course's own callout, clay, held long.","رشد سریع سالم است و علامت خطر نیست.",V),
             ("18–25s","What is inside for them.","نسخه‌ی نوجوانان ۱۳ تا ۱۵ · درس رشد جهشی · راهنمای والدین",C),
             ("25–30s","Button. Brand row.","هفته‌ی ۱ رو رایگان امتحان کن",V)],
      src="Lesson «رشد جهشی» — the signs list and the callout",
      reuse="door-frame · against-the-wall · from-the-chair",
      gen="door-frame recomposed to 9:16 (1 cr) + a 3s light-drift clip (3 cr)",
      cost=4, img=b64("ad3"),
      warn="Tone rule: no fear-selling. The course's own line is that fast growth is healthy and not a danger sign — that line stays in the ad, in clay, held longer than anything else."),

 dict(n="04", role="Value first", title="Your own starting number", fa="عدد شروع خودت",
      hook=["عدد شروع خودت رو پیدا کن."],
      who="Anyone who trains and has never measured anything.",
      idea="Give away a whole test. The broad jump is already free in the demo, so the ad's payoff is a real page in the app, not a teaser. And the course's honest position is unusual enough to be the ad: it never tells you whether your number is good — you only ever race yourself.",
      look="Measurement. A tape measure runs down the screen and the type hangs off it like ticks. The most graphic of the five.",
      beats=[("0–3s","Clip: the coin and the tape on a hall floor, light moving.","پرش طول جفت‌پا",V),
             ("3–10s","The protocol, three lines, tape running down.","پنجه پشت خط · دست‌ها را تاب بده · با دو پا فرود بیا و ۲ ثانیه بی‌حرکت بمان",C),
             ("10–15s","The rule that makes it real.","۳ پرش، ۶۰ ثانیه استراحت. فرود که تکان بخورد، حساب نیست.",C),
             ("15–21s","How the starting number is made.","دو روز تست، با ۲ تا ۵ روز فاصله. میانگینشان عدد شروع توست.",C),
             ("21–26s","The retest rhythm, and the promise.","هفته‌های ۴، ۸، ۱۲ و ۱۶. فقط با عدد خودت مقایسه می‌کنی.",V),
             ("26–32s","Button.","همین تست، رایگان، توی نسخه‌ی نمایشی",C)],
      src="Test «پرش طول جفت‌پا» — setup, steps and tries",
      reuse="the-coin · test-day · against-the-wall",
      gen="the-coin recomposed to 9:16 (1 cr) + a 3s clip (3 cr)",
      cost=4, img=b64("ad4"),
      warn="No pass/fail number may appear. The course sets no standard — that is the point of the ad, and the line «فقط با عدد خودت مقایسه می‌کنی» is the promise."),

 dict(n="05", role="The close", title="Once, forever", fa="یک بار، برای همیشه",
      hook=["۱۷ دلار. یک بار.","بدون تاریخ انقضا."],
      who="Anyone who has already seen the demo and not bought. This is the only one of the five that asks for the sale.",
      idea="Three objections die in one ad: the price, the subscription fear, and the internet. In Iran «after the first sign-in it works offline» is a felt benefit, not a feature bullet.",
      look="No cuts at all. One dark plate, floodlights, drifting haze, and numbers landing on it. The quietest of the five on purpose — this one has to feel expensive.",
      beats=[("0–4s","Clip: the night court, haze drifting through the floodlights.","۱۶ هفته برنامه",V),
             ("4–8s","Number lands.","۱۱۴ حرکت، با نکته‌ی اجرا",V),
             ("8–12s","Numbers land.","۲۲ درس کوتاه · ۷ تست ساده",V),
             ("12–17s","The nuance kept honest.","رو گوشیت. بعد از اولین ورود، بدون اینترنت.",C),
             ("17–24s","The big one, held.","۱۷ دلار. یک بار. بدون تاریخ انقضا.",V),
             ("24–30s","The buy button, its words verbatim off the price card.","خرید از واتساپ 💬",V)],
      src="/tennis/ stats bar, the price card and its button, and the offline FAQ",
      reuse="the night-court plate clip — 20 Sep · bg-night master",
      gen="Nothing.",
      cost=0, img=b64("ad5"),
      warn="Your call, 21 Sep: this one goes straight to WhatsApp rather than the demo. It is the only ad in the set that asks for money, so it is the only one that should run to people who have already seen the demo.")
]

def esc(s): return s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")
def bidi(s): return re.sub(r"(«[^»]*»)", r'<bdi dir="rtl">\1</bdi>', esc(s))
TAG={"V":("verbatim","v"),"C":("from the course","c"),"D":("draft — change it","d")}

cards=[]
for a in ADS:
    beats=""
    for t,d,f,prov in a["beats"]:
        label,cls=TAG[prov]
        beats+=(f'<li><span class="t">{esc(t)}</span><span class="d">{esc(d)}</span>'
                f'<span class="fa" dir="rtl">{esc(f)}</span>'
                f'<span class="prov {cls}">{label}</span></li>')
    warn=f'<p class="warn">{bidi(a["warn"])}</p>' if a.get("warn") else ""
    chip=('<span class="chip free">reuses what we own · 0 credits</span>' if a["cost"]==0
          else f'<span class="chip">{a["cost"]} credits</span>')
    cards.append(f'''
<article class="ad">
  <div class="framecol">
    <div class="frame">
      <img src="{a['img']}" alt="Indicative first frame of ad {a['n']}">
      <div class="scrim"></div>
      <div class="hooklay">
        <span class="num">{a['n']}</span>
        <p class="hook" dir="rtl">{'<br>'.join(esc(h) for h in a['hook'])}</p>
      </div>
    </div>
    <p class="cap">The picture we would recompose — not the final frame.</p>
  </div>
  <div class="body">
    <header class="adhead">
      <span class="role">{esc(a['role'])}</span>
      <h2>{esc(a['title'])} <span class="fatitle" dir="rtl">{esc(a['fa'])}</span></h2>
      {chip}
    </header>
    <dl class="meta">
      <dt>Who it talks to</dt><dd>{bidi(a['who'])}</dd>
      <dt>The idea</dt><dd>{bidi(a['idea'])}</dd>
      <dt>How it looks</dt><dd>{bidi(a['look'])}</dd>
    </dl>
    <h3>The cut</h3>
    <ol class="beats">{beats}</ol>
    <dl class="meta tail">
      <dt>Copy comes from</dt><dd>{bidi(a['src'])}</dd>
      <dt>Reuses</dt><dd class="mono">{esc(a['reuse'])}</dd>
      <dt>Would generate</dt><dd class="mono">{esc(a['gen'])}</dd>
    </dl>
    {warn}
  </div>
</article>''')

total=sum(a["cost"] for a in ADS)
drafts=sum(1 for a in ADS for b in a["beats"] if b[3]=="D")
lines=sum(len(a["beats"]) for a in ADS)
html=open(os.path.join(HERE, "board.tpl.html"),encoding="utf-8").read()
html=(html.replace("<!--CARDS-->","\n".join(cards))
          .replace("{{TOTAL}}",str(total)).replace("{{AFTER}}",f"{96.76-total:.2f}")
          .replace("{{DRAFTS}}",str(drafts)).replace("{{LINES}}",str(lines)))
open(os.path.join(ROOT, "plan-board.html"),"w",encoding="utf-8").write(html)
print("written",os.path.getsize(os.path.join(ROOT, "plan-board.html"))//1024,"KB ·",drafts,"draft lines of",lines)
