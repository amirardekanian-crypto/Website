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
 dict(n="01", role="The match you lost", title="His legs, not his technique", fa="تکنیکش از تو بدتر بود",
      hook=["تکنیکش از تو بدتر بود.","پاهاش نه."],
      who="P5 + P1 — the player who loses to people they out-hit. Angle A8, visual V1, ask: the demo.",
      idea="Everyone has lost that match and nobody has an explanation for it. The explanation is the third set, and the third set is legs — their own words: \u201cmy energy is low and my legs are tired.\u201d Emotionally the sharpest thing in the bank.",
      look="V1 \u2014 him talking, clay cutting under his voice. Camera never leaves the ground on the b-roll.",
      beats=[("0:00–0:04","MCU Amir, chest up, plain wall. No smile at the top.","تکنیکش از تو بدتر بود. پاهاش نه.",D),
             ("0:04–0:09","Clay, low: a shoe driving off in a burst of dust.","تو ست سوم، انرژیت کم می‌شه و پاهات می‌گیره.",C),
             ("0:09–0:16","Amir, one step wider.","اون امتیاز رو با راکت نباختی. با قدم دوم باختی.",D),
             ("0:16–0:21","Top-down clay, scuffed rally marks.","یه امتیاز تنیس پر از ترمز و تغییر جهته.",C),
             ("0:21–0:26","The spider-drill points on the lines.","اینا تمرین می‌خوان، نه فقط بازی بیشتر.",D),
             ("0:26–0:32","Amir, back to MCU.","هفته‌ی ۱ رو رایگان امتحان کن",V)],
      src="Their own words for the third set; the «تنیس از بدنت چه می‌خواهد» lesson",
      reuse="full-acceleration · rally-map · five-points",
      gen="Optional: a 3s push-off clip (P1 in PROMPTS.md) \u2014 4 credits",
      cost=4, img=b64("ad1")),

 dict(n="02", role="Which number changed?", title="Your own starting number", fa="کدوم عددت عوض شده؟",
      hook=["شش ماهه تمرین می‌کنی.","کدوم عددت عوض شده؟"],
      who="P4 — trains hard, has not improved. Angle A1 + A7, visual V3, ask: a comment.",
      idea="The house angle. His top annoyance is that nobody measures; the thing free YouTube structurally cannot give anyone is a baseline and a retest. Gives a whole test away \u2014 and the broad jump is already free in the demo, so the payoff is a real page, not a teaser.",
      look="V3 \u2014 measurement as the design language. Tape, coin, a line. He lays it out on camera.",
      beats=[("0:00–0:04","MCU Amir. A question he is about to answer.","شش ماهه تمرین می‌کنی. کدوم عددت عوض شده؟",D),
             ("0:04–0:08","Tape measure on a hall floor, coin at the zero.","پرش طول جفت‌پا.",V),
             ("0:08–0:20","Amir lays the tape, toes behind the line. ⚠ set-up only, never the jump.","پنجه پشت خط · دست‌ها را تاب بده · با دو پا فرود بیا و ۲ ثانیه بی‌حرکت بمان",C),
             ("0:20–0:27","Tape, stopwatch and cones on a dark floor.","۳ پرش، ۶۰ ثانیه استراحت. فرود که تکان بخورد، حساب نیست.",C),
             ("0:27–0:33","Amir.","دو روز تست با ۲ تا ۵ روز فاصله. میانگینشان عدد شروع توست.",C),
             ("0:33–0:38","Amir.","عددت رو بنویس",D)],
      src="The «پرش طول جفت‌پا» test protocol, verbatim",
      reuse="the-coin · test-day · against-the-wall",
      gen="Optional: a 3s coin-and-tape clip (P2) \u2014 4 credits",
      cost=4, img=b64("ad4"),
      warn="No pass/fail number may appear. The course sets no standard \u2014 «فقط با عددِ خودت مقایسه می‌کنی» is the promise."),

 dict(n="03", role="The belief that blocks everything", title="Slow and bulky", fa="باشگاه کندت می‌کنه؟",
      hook=["می‌ترسی باشگاه کندت کنه؟","حق داری — ولی نه از این تمرین."],
      who="P9 — «باشگاه منو کند و حجیم می‌کنه». Angle A12, visual V1 + V4, ask: the demo.",
      idea="New, from Amir's customers on 2026-09-21, and possibly the highest-leverage ad in the set: it is the only objection that stops them before they consider buying anything. And it is his own argument from the other side \u2014 they fear the gym because the gym they have seen is bodybuilding.",
      look="V1 then V4. One hard cut carries the whole argument: the long row of dumbbells they picture, then a single heavy bar.",
      beats=[("0:00–0:05","MCU Amir. «حق داری» has to land inside five seconds.","می‌ترسی باشگاه کندت کنه؟ حق داری.",D),
             ("0:05–0:10","A long row of dumbbells receding into shadow.","اون باشگاهی که تو ذهنته، برای بدنسازیه.",D),
             ("0:10–0:14","CUT. A single hex bar on a dark floor.","این یکی نیست: سنگین، کم‌تکرار، برای نیرو.",D),
             ("0:14–0:20","Chalked hands tighten on the bar, chalk dust lifts.","قدرت یعنی بیشتر زور بزنی، نه بزرگ‌تر بشی.",D),
             ("0:20–0:26","A medicine ball hitting a wall in a burst of dust.","و نصف کار اصلاً وزنه نیست — پرش، پرتاب، ترمز.",C),
             ("0:26–0:34","Amir.","پایه‌سازی · پیشرفت · انفجار · انتقال به زمین",V),
             ("0:34–0:39","Amir.","هفته‌ی ۱ رو رایگان امتحان کن",V)],
      src="Amir's customers, 2026-09-21; the «چرا تمرین قدرتی؟» and «پرش، فرود و توان» lessons",
      reuse="the-row · the-heavy-set · impact · grip clip 804a5c00 (already paid)",
      gen="Nothing.",
      cost=0, img=b64("ad2"),
      warn="Never argue «نه، نمی‌کنه». They have watched it happen — to bodybuilders. Agree with the fear, then move it onto the method."),

 dict(n="04", role="Teach, never frighten", title="The brake nobody taught you", fa="زانوت موقع ترمز",
      hook=["زانوت موقع ترمز درد می‌گیره؟","ترمز یه مهارته که کسی یادت نداده."],
      who="P3 — «knee pain from deceleration», their exact words. Angle A2 + A4, visual V1 + V4, ask: the demo.",
      idea="They said deceleration, not just \u201cmy knee hurts\u201d \u2014 and braking is trainable. That turns the pain problem from a referral-only topic into one with a real training answer, without a word of fear.",
      look="V1 with one picture doing the heavy lifting: the slide mark ending in a ridge of piled clay at the line.",
      beats=[("0:00–0:05","MCU Amir. ⚠ no fear, no «وگرنه».","زانوت موقع ترمز درد می‌گیره؟",D),
             ("0:05–0:11","A slide mark ending in a ridge of piled clay at a white line.","ترمز یه مهارته. کسی یادت نداده.",D),
             ("0:11–0:16","The same brake, moving: dust bursting forward.","وقتی ترمز تمرین نشده باشه، بار می‌ره روی زانو.",D),
             ("0:16–0:26","Amir.","ترمز، فرود و تغییر جهت تمرین‌پذیرن — و تو این برنامه تمرین می‌شن.",C),
             ("0:26–0:31","Orange tape and a folded knee sleeve on a bench.","مقاوم‌سازی هم کنارش هست.",C),
             ("0:31–0:36","Amir. ⚠ the referral stays in — it is what makes it trustworthy.","اگه دردی داری که باعث لنگیدن می‌شه یا شب بیدارت می‌کنه، اول پزشک. این دوره پزشکت نیست.",V),
             ("0:36–0:41","Amir.","هفته‌ی ۱ رو رایگان امتحان کن",V)],
      src="Amir's customers, 2026-09-21; the «سرعت، ترمز و تغییر جهت» and «درد یا کوفتگی؟» lessons",
      reuse="braking-mark · armour · ice-and-tape",
      gen="Optional: a 3s braking clip (P3) \u2014 4 credits. The best of the three: it is the exact thing the ad is about.",
      cost=4, img=b64("ad3"),
      warn="Refusal 3 binds hardest here. Teach the line between soreness and pain; never suggest what happens if they ignore it."),

 dict(n="05", role="The close", title="A hundred dollars or seventeen", fa="۱۰۰ دلار یا ۱۷ دلار؟",
      hook=["۱۰۰ دلار یا ۱۷ دلار؟","همون ۱۶ هفته."],
      who="The objection, priced. Angle A5 + the anchor, visual V5, ask: WhatsApp. Runs to people who already saw the demo.",
      idea="They ask the price first and hear $17 as expensive. That is a unit problem, not a price problem: the same 16 weeks with a personal programme is about $100. Quietest ad of the five on purpose \u2014 it has to feel expensive to be believed as cheap.",
      look="V5 \u2014 the app is the picture, his voice over it. Opens on the night court plate we already own.",
      beats=[("0:00–0:04","Empty floodlit clay court at night, haze drifting. Type over it.","۱۶ هفته برنامه.",V),
             ("0:04–0:10","Amir.","برنامه‌ی اختصاصی من ماهی ۲۵ دلاره. همون ۱۶ هفته می‌شه حدودِ ۱۰۰ دلار.",V),
             ("0:10–0:18","Real app screens: programme, session card, a test.","۱۱۴ حرکت با نکته‌ی اجرا · ۲۲ درس · ۷ تست",V),
             ("0:18–0:24","The app offline, status bar swapped.","بعد از اولین ورود، بدون اینترنت هم کار می‌کنه.",C),
             ("0:24–0:30","Amir.","۱۷ دلار. یه‌بار. بدونِ تاریخِ انقضا. با سرعتِ خودت.",V),
             ("0:30–0:35","Button, brand row.","خرید از واتساپ",V)],
      src="index-fa.html (۲۵ دلار در ماه), the /tennis/ stats bar, price card and offline FAQ",
      reuse="night plate clip 0a334ef3 (already paid) · bg-night · captured demo screens",
      gen="Nothing.",
      cost=0, img=b64("ad5"),
      warn="Iran prices ONLY. The $200-for-4-months and the £50 UK session are not Iran prices and never appear in a Farsi ad. Ships with WhatsApp reply T3.")
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
