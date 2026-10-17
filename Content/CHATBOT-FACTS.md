# What the website chatbot knows

**Amir: this is the only thing the chatbot knows.** It answers from this file and nothing
else. If a question is not covered here, it says it does not know and offers your WhatsApp. So a
wrong line here becomes a wrong answer to a client. Read it, fix anything that is not true, and
add the questions people really ask you.

How it is used:
- Sections marked **[both]** go to the bot on both sites. **[en]** is only for the English
  site (`index.html`), **[fa]** only for the Farsi site (`index-fa.html` and the Farsi product pages).
  The Iran products (the Iran coaching price, the course, the testing app) are [both], because
  Iranians may ask in English (Amir, 2026-10-17). The English site still does not advertise them:
  the English bot answers about them only when asked, or when the visitor says they live in Iran.
- After any edit, run `python scripts/build_chat_facts.py` and redeploy `site-chat`
  (`supabase/functions/README.md`). The pre-commit check blocks a commit where this file and
  the function's copy disagree.
- How the bot behaves (tone, what it refuses, when it hands over) is not here. It is in
  `supabase/functions/site-chat/index.ts`, the `RULES` text.

Last checked against the live pages: 2026-10-17. Amir's own corrections added the same day (12 years, padel
qualification, Liverpool, any sport and level, the WhatsApp talk, 5 cycles of 5 weeks, PayPal / card-to-card,
nutrition advice but no plans).

---

## [both] Who Amir is

- Amir Ardekani, an online strength and conditioning coach. People also search for him as
  Amir Ardekanian (امیر اردکانیان).
- Two master's degrees: MSc Strength & Conditioning and MSc Applied Exercise Physiology.
  Working toward the CSCS certification.
- A coach for 12 years. 1000+ tennis and padel players coached, from club level to international,
  including national-team, ITF and FIP players, and experience with Olympic-level athletes.
- Played competitive tennis for 15 years. Qualified as a tennis coach and as a padel coach, so he
  knows both sports from both sides.
- Lives in Liverpool, UK, and coaches online.
- Tennis and padel are his specialty, but the coaching is not only for them: any athlete, from any
  sport, can get a programme.

## [both] Contact

- WhatsApp: +44 7435 363461 (https://wa.me/447435363461). This is where Amir answers.
- Instagram: @amirardekanian (DMs are answered too).
- He usually replies within 24 hours. He replies to an application within 48 hours.
- Amir answers personally. The chatbot is an assistant on the website, not Amir.

## [both] How the coaching works

1. **Apply.** Fill in the application form (about 3 to 5 minutes). It asks about goals, sport and
   level, training history, injuries, sleep, stress, nutrition, days a week, session length and
   equipment. There is no commitment until you have talked.
2. **Talk.** Amir reads every application himself and you talk on WhatsApp before he writes
   anything: whether you are a good fit, which programme suits you, and anything else you want him
   to know that the form did not ask (your history, your season, what has and hasn't worked).
3. **Build.** The programme is written from scratch for you: 5 cycles, each 5 weeks long, each
   with its own focus, its reason and a target. The whole plan is mapped up front, and each cycle's
   details are added to your app when it starts.
4. **Train in the app.** Your programme lives in a private app on your phone (it installs from the
   browser like an app; nothing to download from an app store). You sign in with a username and
   password.
5. **Check in and adjust.** Every week Amir reads your logs and readiness, checks in with you
   (a call or WhatsApp), and adjusts the load, the volume and the exercises. At the end of each
   cycle all of it is read together to decide what the next cycle does.

## [both] The app

- Before each session: a quick readiness check (sleep, energy, soreness, stress). The session
  adapts to how you walked in, and Amir sees the scores.
- Every exercise card has the sets, reps, target effort (RPE), tempo and rest, plus coaching cues
  (the key point, what to feel, the one mistake to avoid). A demo video where there is one (not
  every exercise has a video yet), and plain written steps as exercises get them.
- You log the weight and effort of each set. A session timer and a rest timer are built in. When
  you finish, you rate the session and it goes to Amir.
- A WhatsApp button in the app takes you straight to Amir, already saying which day or exercise
  you mean. There is no chat inside the app.
- Extras at no extra cost: **Sessions** (ready-to-run workouts and resets for a travel day, a busy
  week or recovery) and the **Tennis Playbook** (articles for players and coaches on competition
  prep, recovery, the mental game, nutrition and supplements).
- The app is in English. Questions to Amir can be in Farsi.
- A live demo shows a real sample programme with no sign-up: https://www.amirardekani.com/program.html?client=demo

## [both] Common questions

- **Time:** usually 2 to 4 sessions a week, 45 to 60 minutes each. It depends on your court or
  training hours, your season and how your body responds. It is planned around your sport.
- **Equipment:** a gym is ideal, but a home gym or limited equipment works. The programme is built
  around what you have.
- **Travel and tournaments:** travel is part of the plan. There are sessions for minimal
  equipment, and competition weeks are tapered so you arrive sharp, not sore.
- **Your tennis coach:** S&C is the layer under your court work, not a replacement. Amir is happy
  to share load with your tennis coach.
- **Injury:** the application asks about injuries and surgeries and the programme is written
  around them. If you get injured during the programme it changes straight away, often keeping
  the unaffected areas training. If something hurts now (pain that makes you limp, wakes you at
  night, swells or is getting worse), see a doctor or physio first.
- **Any level:** Amir works with athletes of any level and any experience, including people who
  have never been in a gym. Everything is explained, and the programme starts from your level.
- **Other sports:** the coaching is not only for tennis and padel. Any athlete can get a programme
  built around their sport.
- **Nutrition and supplements:** Amir gives advice on nutrition and supplements, but he does not
  write nutrition plans or meal plans: that is outside his scope of practice.
- **Padel:** the programme is written for padel's own movements and demands, not copied from tennis.
- **Age:** you must be 18 or over to buy. For an athlete under 18, a parent or guardian applies
  and pays.
- **Refunds:** you pay in advance. The fee is for Amir's work, so there is no refund once he has
  started writing your programme.
- **Limited places:** Amir works with a small number of athletes at a time.

## [both] AA Proof, the free habit tracker

- AA Proof is a free habit tracker for any athlete. No payment, no card, not a trial.
- You tick a few habits each day (steps, sleep, protein and water are always on; mobility,
  breathing and supplements are optional). About 20 seconds a day. Each habit has its own level,
  there are streaks, a leaderboard you can choose to join, and a wall where everyone writes one
  line a day.
- The Workout habit is for coached athletes only: it ticks itself when they finish a session.
- To get it: fill in the form on https://www.amirardekani.com/proof.html (a name for the board,
  email, WhatsApp). Amir sets each person up by hand and sends the login on WhatsApp, usually the
  same day.

---

## [en] Programmes and prices (English site)

All prices in US dollars. Three levels, named after tennis scoring. You pay in advance, after you
have talked with Amir.

**Every programme includes:** the training app and dashboard, an intake call (up to 30 min), a
programme written for your goals and assessment, weekly check-ins (4 a month), a performance
report, WhatsApp and email support, and a 10% loyalty discount when you renew.

| Programme | Price | Length | Adds |
|---|---|---|---|
| **Game** | $70 | 1 month | everything above |
| **Set** | $180 ($60 a month, saves 14%) | 3 months | the programme updated monthly |
| **Match** (best value) | $300 ($50 a month, saves 29%) | 6 months | priority WhatsApp and email support; competition services (your plan follows your tournament schedule, with competition warm-up programmes); video technique reviews |

- **Payment:** apply, talk, then pay by PayPal. Then he writes your programme.
- **Apply:** https://www.amirardekani.com/form.html
- **Email:** amirardekanian@gmail.com
- **Good fit:** you take your sport seriously (club to international), you train or play several
  times a week, you want structure and steady progress.
- **Not a fit:** you want generic templates or a fitness app, or you are not ready to follow a
  plan week after week.

---

## [both] Online coaching for players living in Iran

- The personal programme (برنامه‌ی اختصاصی), for tennis and padel players and athletes from any sport, as sold on the Farsi site. Price for people living in Iran: **the
  equivalent of $25 a month**, paid in toman at that day's rate. Amir says the exact toman amount
  in his message. No hidden costs, no long contract. 10% loyalty discount on renewal.
- Includes: a personal S&C programme for your sport, the app on your phone, cues (and video where
  there is one) for each exercise, weekly updates, readiness and load monitoring, direct messages
  and support.
- **Living outside Iran?** Send Amir a DM on Instagram or a WhatsApp message for the price.
- **Payment:** fill in the form, Amir messages you with a few questions, then you pay by
  card-to-card (کارت‌به‌کارت). People outside Iran pay by PayPal.
- **Start:** https://www.amirardekani.com/form-fa.html (the form is in Farsi; the button says «شروع کن»).

## [both] The Tennis Performance System course (سیستم آمادگی جسمانی تنیس)

- A self-guided 16-week tennis S&C programme on your phone. One payment, the equivalent of
  **$17** in toman at that day's rate, and it never expires.
- Level 2 (Advanced, پیشرفته) is available now. Level 1 (Foundation, پایه) and Level 3
  (Pro, حرفه‌ای) are coming soon.
- Inside: 4 blocks, 3 main sessions a week (2 in the gym, 1 on court, each up to about 75 min),
  optional extra sessions (on-court endurance, speed and agility, home durability and mobility,
  30 to 50 min each), 114 exercises with cues, easier and harder versions and mostly a
  no-equipment option, 22 short lessons, 7 simple tests (week zero, then every 4 weeks), and a
  version for 13 to 15 year olds.
- Works offline after the first sign-in (the first time needs internet; try a VPN if it does
  not connect).
- Age: 13 and over. 13 to 17: a parent reads the guide with the player. 13 to 15: the teen
  version, with an adult present at each session.
- Not for padel: padel players should take the personal programme.
- It does not change per person. For a programme written for you and updated every week, that is
  the online coaching.
- Free demo: week 1, the broad jump test and 3 lessons, no sign-up. A 2-minute quiz tells you if
  Level 2 suits you.
- To buy: the buy button opens WhatsApp with the message ready; pay by card-to-card; the username
  and password come on WhatsApp.
- Page (in Farsi): https://www.amirardekani.com/tennis/. The course itself is in Farsi.

## [both] The Tennis Fitness Testing app (آزمون آمادگی جسمانی تنیس)

- For tennis coaches and academies. One payment, the equivalent of **$17** in toman, for the whole
  academy: one account that every coach uses on their own phone.
- 12 tests ready now (height, weight and arm span, growth rate for under 18s, vertical jump,
  broad jump, single-leg lateral jump, 2 kg overhead medicine-ball throw, hex-bar deadlift or back
  squat, Bulgarian split squat, push-ups, bench press for 16+, one-arm dumbbell row, optional
  grip strength). 6 more (5/10/20 m sprint, 505, spider test, 6 × 20 m shuttles, Cooper 12-minute
  run, mobility and resilience) come free when ready.
- Each result is read three ways: the player's own progress, published norm tables where they
  exist, and rank within the academy (when there are at least 8 players).
- Works beside the court with no internet; it saves and sends later.
- Stores only each player's name, sex, birth year and month, results and notes, in the
  academy's own account.
- To buy: WhatsApp, card-to-card, the academy's login comes on WhatsApp.
- Page (in Farsi): https://www.amirardekani.com/tennis-testing/

## [fa] Farsi words to use

- Amir's title: «مربیِ بدنسازیِ تنیس و پدل». His degrees: «ارشد», never "MSc".
- «یه برنامه» not «فایل» or «PDF». «شدت» not «سختی». «شروع کن» not «درخواست».
- Prices are «معادلِ ۲۵ دلار در ماه» and «معادلِ ۱۷ دلار», always with «به تومان، با نرخِ روز».
