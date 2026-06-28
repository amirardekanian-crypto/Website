# 🏷️ AA Performance — Product Brief

The "what the product actually is" context doc. Pair it with **`DESIGN_SYSTEM.md`** (the look, feel & motion spec) — together they're everything needed to brief a reel, carousel, ad, or any asset. Point Claude at this `Content/` folder and start designing.

---

## The business in one breath

**Amir Ardekani** — online **Strength & Conditioning coach** (Farsi-facing title: **«مربیِ بدنسازیِ حرفه‌ای»**). MSc Strength & Conditioning · MSc Applied Exercise Physiology (Farsi: **«ارشد»**, never "MSc") · **500+ tennis & padel players coached**. He sells **premium, individualised ~6-month programmes** delivered through a private web app. The promise: ***not just a program* — a full coaching experience**: a bespoke programme **plus a coach who watches your data**. Iran price: **معادلِ ۲۵ دلار / ماه** (به تومان، با نرخِ روز); abroad → DM.

> **Farsi word choices** (the canonical list lives in `DESIGN_SYSTEM.md` §10): title = «مربیِ بدنسازیِ حرفه‌ای» · «ارشد» not "MSc" · «یه برنامه» not «فایل/PDF» · «شدت» not «سختی» · «شروع کن» not «درخواست» · «تجربه» not «پشتوانه».

**Two audiences, one product:**

| | English website | Instagram / Farsi content |
|---|---|---|
| **Who** | competitive **tennis & padel** players | broader **general-fitness** Tehrani market |
| **Line** | *Move Better. Hit Harder. Last Longer.* | «یه مربی، تو جیبت» / «هیچی بی‌دلیل نیست» |
| **Goal** | get qualified players to apply | justify the premium price & retain clients by showing the depth behind the work |
| **Voice** | sharp, athletic, evidence-based | warm, direct, colloquial Tehrani, no-BS |

---

## The website (public)

Static site on GitHub Pages → **amirardekani.com**, backed by Supabase.

- **`index.html` — Home:** the pitch. Hero (*Move Better. Hit Harder. Last Longer.*), benefits, credentials, FAQ, CTAs to apply. Speaks to competitive players.
- **`form.html` — Apply:** a 7-section intake questionnaire (progress bar + success screen); submissions email Amir via Web3Forms.
- **`privacy.html` / `terms.html`:** legal.
- **`coach.html` — Coach dashboard (private):** Amir's admin view (see below).
- **`call-log.html` — Weekly check-in log (private):** Amir's tool for logging the weekly athlete check-in calls, with AI-assisted weekly summaries and end-of-cycle reports (see below).

---

## The app (`program.html`) — "a coach in your pocket"

Each athlete opens a private link — `program.html?client=<id>&key=<key>` — and gets an **installable phone app** (PWA, "AA Performance"). This *is* the product the reels sell.

**The system — "هیچی بی‌دلیل نیست / nothing without a reason":**

```
Programme (~6 months)
└── Cycle  (~5 weeks, a "mission" with a focus, the WHY, and expected outcomes)
    └── Day  (one session, with a focus — e.g. Lower Body & Glutes)
        └── Block  (warm-up · strength · power — colour-coded)
            └── Exercise  (sets×reps · target RPE · tempo · rest · demo video · coaching cues)
```

- A programme is a **chain of ~5–6 linked cycles**, each building on the last. Example cycle library: *Foundation Forge → Strength Engine → Structural Build → Durability Build → Armour Build* (also Load Build, Rebuild & Reset, Strength Reclaim…). Cycle/day/workout banner images live in `../assets/cycles/` and `../assets/days/`.

**The app's four tabs (bottom nav):** **Home** (current cycle + progress) · **My Plan** (the training days, exercises, per-set logging) · **Coach** (two-way messaging + the personal notes + the in-app how-to guide) · **Library** (a **"two doors"** landing → **Sessions** = free on-demand workouts, drills & resets to run on your own; **Playbook** = the coach-published tennis article library — *"everything you need to know to play better tennis, in one place"* — across Pre-Competition, Recovery, Mental, Nutrition, Supplements, For Coaches). A finished cycle's "Done" card opens a read-only **Archive** of past programmes.

**What the athlete can do:**
- See **today's day**; tap an **exercise card** → demo video, stats (sets / reps / target / tempo / rest), **coaching cues** (do / don't), and a per-set **log** (weight + RPE 1–10 + tick).
- **Readiness check** before a session (sleep · energy · soreness · stress · overall, each 1–5, 5 = best) → auto-regulation; the coach sees the scores.
- **Session timer** + a full-screen **rest timer** between sets.
- **Finish session** → rate session RPE, leave a note, **send data to coach**.
- **Two-way messaging** with the coach; coach-authored **personal notes** + an in-app **guide**.
- **Library — Playbook** articles (coach-published; deep-link `?article=<id>` gives each article its own shareable URL) + **Sessions** on-demand workouts (deep-link `?workout=<id>`), **archive** of past cycles, **dark mode**, add-to-home-screen.

> A visual catalog of every card the app uses lives in **`card-preview.html`** (in this folder) — handy when you want content to mirror the real UI.

---

## The coach dashboard (`coach.html`)

Amir signs in with Google (locked to his email) and sees everything the app syncs up:
- Every athlete's progress — sessions completed, last active, their notes.
- **Training load (ACWR)**, **readiness** trend, **adherence %** charts — auto-regulation at a glance.
- **Alert triage** — red / amber flags (silent athlete, load spike, low readiness).
- Mint a secure **per-athlete link**; send messages.

This is the proof behind "the coach actually watches you" — the payoff beat in the app reel.

---

## Weekly check-ins & cycle reviews (the coaching loop)

The coaching doesn't stop at the app data. Every week Amir runs a **structured check-in** with each athlete — wellbeing, sleep, energy, soreness, training response, wins, niggles, and what they want next — logged in a private tool (**`call-log.html`**, Google-gated like the dashboard). Each weekly check-in is one of ~4–5 that make up a cycle, and it can run over a call **or WhatsApp** (the tool generates the questions in Farsi, ready to send).

At cycle-end, all of that cycle's weekly check-ins are read **together with the athlete's workout logs** to produce a cycle review: the trends that decide what the next cycle should do, plus the standout wins worth turning into content. (AI does the heavy lifting from Amir's own coaching framework; he reviews and decides.) It's available both in the check-in tool and from each athlete's card on the dashboard.

This is the human half of *"the coach actually watches you"* — the live app data **plus** a real weekly touchpoint and a data-driven decision at every cycle.

---

## Backend & plumbing (no server to run)

- **Supabase** (hosted Postgres): backs up each athlete's progress to the cloud, powers the dashboard + two-way messaging, stores the weekly **call logs** and **cycle reports**, and enforces **per-athlete secret keys**.
- **Notion sync** (`sync_notion.py`): the exercise → demo-video library is generated from a Notion database, not hand-edited.

---

## Content angles that work (for reels / carousels)

- **The depth behind a programme** — cycles have a reason; show the structure/science. *(Justifies the price.)*
- **"A coach in your pocket"** — the app IS the product → the cinematic phone reel.
- **The coach actually watches** — readiness + ACWR + the live dashboard: *"before you get injured, I message you."*
- **The weekly check-in** — it's a relationship, not a file drop: every week the coach reviews your data *and talks to you*, then the cycle's trends shape what comes next.
- **Video + cues for every move** — this is not a PDF.
- **Auto-regulation** — the readiness check adapts the session to how you walk in.
- **Proof & retention** — athlete "results" cards, the 6-month journey.
- **Free content as a funnel** — Playbook articles (`?article=<id>`) and Sessions workouts (`?workout=<id>`) are each their own URL; share them as content, they open inside the app experience, and the "try the app" demo (`?client=demo`) is one tap away.

---

## What's in this `Content/` folder

| File | What it is |
|---|---|
| `PRODUCT.md` | this file — what the product is |
| `HOW-IT-WORKS.md` | **customer-facing** explainer — the full coaching process end to end (Discovery → Analysis → Programming → Training → the weekly loop → Sessions & the Tennis Playbook). Plain-language source for a website "How it works" page, sales replies, or onboarding. |
| `DESIGN_SYSTEM.md` | brand + motion spec (colours, type, reel/phone patterns) |
| **`BUILD-MAP.md`** | **the content build map** — asset inventory, the real app/coach tokens & card anatomy, and carousel/reel recipes. Read it before building any carousel or reel. |
| `reel-1-dashboard.html` … `reel-5-how-it-works.html` | finished Instagram reels (1080×1920, self-contained) |
| `card-preview.html` | visual catalog of the app's card components, in the live brand palette |
| `instagram-carousels.html` · `Carousel-Kit.html` · `carousel-method.html` · `carousel-1-file-vs-coach.html` · `carousel-recovery-run.html` | carousels + the **23-template kit** (RALLY graphics layer: rally arc, court lines, tennis-ball pagination). New carousels are generated with the **`/carousel` Claude Code skill** — give it a script, get a finished file + caption. |
| `instagram-cards/` | exported athlete "results" card PNGs |
| `phone-links.html` | QR launcher to open any of the above on your phone over Wi-Fi |

*Images the content pulls from live one level up in `../assets/` (`cycles/`, `days/`, `img/icon-192.png`, `img/og-image.png`).*
