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

**What the athlete can do:**
- See **today's day**; tap an **exercise card** → demo video, stats (sets / reps / target / tempo / rest), **coaching cues** (do / don't), and a per-set **log** (weight + RPE 1–10 + tick).
- **Readiness check** before a session (sleep · energy · soreness · stress · overall, each 1–5, 5 = best) → auto-regulation; the coach sees the scores.
- **Session timer** + a full-screen **rest timer** between sets.
- **Finish session** → rate session RPE, leave a note, **send data to coach**.
- **Two-way messaging** with the coach; coach-authored **personal notes** + an in-app **guide**.
- **Workouts library** (extra/free sessions), **archive** of past cycles, **dark mode**, add-to-home-screen.

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

## Backend & plumbing (no server to run)

- **Supabase** (hosted Postgres): backs up each athlete's progress to the cloud, powers the dashboard + two-way messaging, and enforces **per-athlete secret keys**.
- **Notion sync** (`sync_notion.py`): the exercise → demo-video library is generated from a Notion database, not hand-edited.

---

## Content angles that work (for reels / carousels)

- **The depth behind a programme** — cycles have a reason; show the structure/science. *(Justifies the price.)*
- **"A coach in your pocket"** — the app IS the product → the cinematic phone reel.
- **The coach actually watches** — readiness + ACWR + the live dashboard: *"before you get injured, I message you."*
- **Video + cues for every move** — this is not a PDF.
- **Auto-regulation** — the readiness check adapts the session to how you walk in.
- **Proof & retention** — athlete "results" cards, the 6-month journey.

---

## What's in this `Content/` folder

| File | What it is |
|---|---|
| `PRODUCT.md` | this file — what the product is |
| `DESIGN_SYSTEM.md` | brand + motion spec (colours, type, reel/phone patterns) |
| `reel-1-dashboard.html` … `reel-4-app.html` | finished Instagram reels (1080×1920, self-contained) |
| `card-preview.html` | visual catalog of the app's card components, in the live brand palette |
| `instagram-carousels.html` · `Carousel-Kit.html` · `carousel-method.html` · `carousel-1-file-vs-coach.html` | carousels + the 14-template kit |
| `instagram-cards/` | exported athlete "results" card PNGs |
| `phone-links.html` | QR launcher to open any of the above on your phone over Wi-Fi |

*Images the content pulls from live one level up in `../assets/` (`cycles/`, `days/`, `img/icon-192.png`, `img/og-image.png`).*
