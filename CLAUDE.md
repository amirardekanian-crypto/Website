# Working notes — Amir Ardekani's site & coaching system

**This is the door.** It is the whole of what every session reads before its first message.
Everything else is opened on purpose: find your job in the READ-LIST below and open only
what it names. The layers are explained in [`docs/README.md`](docs/README.md); the atlas
across the repo is [`MAP.md`](MAP.md).

## Who / what this is
- **Amir Ardekani** — online **strength & conditioning coach** (MSc S&C + MSc Applied
  Exercise Physiology; 1000+ tennis & padel players). Sells premium individualised
  programmes (USD tiers: $70/1mo · $180/3mo · $300/6mo — see `Content/PRODUCT.md`)
  delivered through a private web app (`program.html`, a PWA), backed by Supabase.
- **The free habit tracker is the top of the funnel.** `habits.html` (AA Proof) is offered
  free to non-clients via `proof.html` (Instagram bio link, deliberately not in the nav).
  They give a name, email and WhatsApp; Amir runs **`/proof-signup`** and they are live in
  under two minutes. Free and coached athletes share **one board** (`HABITS.md` → *Two kinds of user*).
- **Two audiences, deliberately different** (don't force them identical — match *facts &
  features*, not wording):
  - **English** site = competitive **tennis/padel** players. Voice: sharp, athletic, evidence-based.
  - **Farsi** site = **tennis & padel** players in Iran (Amir, 2026-09-13 — it was general
    fitness until then). Voice: warm, colloquial. See [`docs/rules/seo.md`](docs/rules/seo.md).

## The non-negotiables

Each line is the short form. The file beside it holds the full wording, which is the rule.

- **Programmes live on the SERVER, not in files.** `data/*.json` is deleted, gitignored and
  404 on the live site; never commit one. → [`docs/rules/server-and-data.md`](docs/rules/server-and-data.md)
- **There are NO automatic backups.** The one copy of 378 session logs is the Supabase free
  plan. A new public table goes into `BACKUP_TABLES`, the snapshot and
  `coach_erase_person()` the same day. → [`docs/rules/server-and-data.md`](docs/rules/server-and-data.md)
- **Things that exist more than once: change every copy**, or the coach and the athlete see
  different numbers and nothing errors. → [`docs/rules/program-app.md`](docs/rules/program-app.md)
- **No finished session is ever lost on the way to the server.**
  → [`docs/rules/program-app.md`](docs/rules/program-app.md)
- **Never touch the app while writing, correcting or delivering a programme** (PRC-1), a
  newly prescribed exercise goes into the library in full (NAM-9, CUE-5), and a correction
  changes only what Amir named (PRC-2). → [`docs/rules/server-and-data.md`](docs/rules/server-and-data.md)
- **The index line is the rule** (PRC-23): where anything restates a coaching rule, the rule
  index in [`.claude/COACHING-PRINCIPLES.md`](.claude/COACHING-PRINCIPLES.md) wins, and new
  text cites the ID instead of restating it. → [`docs/rules/coaching.md`](docs/rules/coaching.md)
- **Clay `#C7552F` is the only accent. No yellow, gold, ochre or amber, ever**, in either app
  or any design. → [`docs/rules/design.md`](docs/rules/design.md) ·
  [`docs/rules/program-app-look.md`](docs/rules/program-app-look.md)
- **Everything an athlete reads sounds like Amir typed it** (COM-3): plain words, short
  sentences. → [`docs/rules/coaching.md`](docs/rules/coaching.md)
- **Ship it live, straight to `main`**, one push at a time, `git push origin main` by itself.
  → [`docs/rules/working-with-amir.md`](docs/rules/working-with-amir.md)
- **A change of Career Mode rules applies forward only** (D20). An award keeps the XP it was
  minted with. → [`docs/rules/career.md`](docs/rules/career.md)
- **One notification permission per website, and only one chance** — a "Don't allow" takes
  both apps with it. → [`docs/rules/push.md`](docs/rules/push.md)
- **A doc move never changes a rule's wording or its ID.** New narration goes in
  [`docs/record/`](docs/record/INDEX.md), never in a rules file. → [`docs/README.md`](docs/README.md)
- **Run the hooks.** `git config core.hooksPath .githooks`, once per clone; a habits.html or
  sw.js commit that skips them has reached the live site before.
  → [`docs/rules/working-with-amir.md`](docs/rules/working-with-amir.md)

## THE READ-LIST — what to open for the job in front of you

Open the row's files and nothing else. Each rules file is 2–17 KB; each reference file is one
section. A reference `INDEX.md` is one line per section — read the index, open the section.

| The job | Open |
|---|---|
| **Find where anything lives in the app code** | [`docs/ref/line-map/`](docs/ref/line-map/program-app.md) — every top-level function with its line number, grouped by area, for `program.html`, `habits.html`, `coach.html` and `sw.js`, plus the named style blocks and the screens. Generated from the files themselves: jump by line, never grep-and-guess. Open this BEFORE any app change. |
| **Change an exercise card** (the card, its ⓘ, cues, pill, note) | [`docs/rules/program-app-look.md`](docs/rules/program-app-look.md) + [`docs/rules/program-app.md`](docs/rules/program-app.md) → the twins rule + rows 36 (*The working card*), 06 (*The Spine*) and 15 (*Every other screen in the Centre Court look*, which holds the About sheet) of [`PROGRAM-APP.md`](PROGRAM-APP.md) — about 45 KB in all, against 391 KB before |
| **Change any other screen of the athlete app** | [`docs/rules/program-app-look.md`](docs/rules/program-app-look.md) + that screen's section from [`PROGRAM-APP.md`](PROGRAM-APP.md) |
| **Change how a session is logged, saved or synced** | [`docs/rules/program-app.md`](docs/rules/program-app.md) + the set-log and session-queue sections from [`PROGRAM-APP.md`](PROGRAM-APP.md) |
| **Change AA Proof** (habits.html) | [`docs/rules/habits.md`](docs/rules/habits.md) + the tab or feature's section from [`HABITS.md`](HABITS.md); an XP number also means [`XP_SYSTEM.md`](XP_SYSTEM.md) |
| **Change the coach dashboard** | [`docs/rules/coach-dashboard.md`](docs/rules/coach-dashboard.md) + the section from [`COACH_DASHBOARD.md`](COACH_DASHBOARD.md); then `node scripts/headless/coach/run.js` |
| **Change a rule both the coach and the athlete copy** | [`docs/rules/program-app.md`](docs/rules/program-app.md) → *Things that exist more than once*, then `scripts/check_twins.js` |
| **Write or edit a programme** | the skill (`/program-design`, `/program-assemble`, `/program-edit`) + the RULE INDEX in [`.claude/COACHING-PRINCIPLES.md`](.claude/COACHING-PRINCIPLES.md) + [`docs/rules/coaching.md`](docs/rules/coaching.md). Never touch app code in the same run (PRC-1). |
| **Add or change an exercise in the Spine** | `/spine` + [`docs/rules/program-app.md`](docs/rules/program-app.md) → *The Spine*, *Seven pieces, seven jobs* in [`docs/rules/program-app-look.md`](docs/rules/program-app-look.md) |
| **Apply a database stage** | [`docs/rules/server-and-data.md`](docs/rules/server-and-data.md) + that stage's procedure from [`career/PROCEDURES.md`](career/PROCEDURES.md) (Career Mode) or the file's own header; then the snapshot rule in [`scripts/restore/README.md`](scripts/restore/README.md) |
| **Anything Career Mode** | [`docs/rules/career.md`](docs/rules/career.md), then [`career/CAREER_MODE.md`](career/CAREER_MODE.md) for the rule GAME-n and [`career/PROCEDURES.md`](career/PROCEDURES.md) for the function |
| **Reminders / push** | [`docs/rules/push.md`](docs/rules/push.md) |
| **Change a public page's design or copy** | [`docs/rules/site.md`](docs/rules/site.md) (the style guard is in it) + the page review in [`Content/site-audit/`](Content/site-audit/) if there is one |
| **Write or change an article** | `/article` + [`docs/rules/seo.md`](docs/rules/seo.md) + [`.claude/SEO-SOP.md`](.claude/SEO-SOP.md) → *The SEO gate* + [`Content/CONTENT-PARITY.md`](Content/CONTENT-PARITY.md) |
| **The Farsi course or testing app** | [`docs/rules/site.md`](docs/rules/site.md) + [`FARSI-PRODUCTS.md`](FARSI-PRODUCTS.md) |
| **Teach the website chatbot a fact** | `/chat-facts` + [`docs/rules/site.md`](docs/rules/site.md) → the chatbot lines |
| **A carousel, reel, ad or image** | [`docs/rules/design.md`](docs/rules/design.md) + [`Content/DESIGN-ATLAS.md`](Content/DESIGN-ATLAS.md) + the skill (`/carousel`, `/reel`, `/ad`, `/image`, `/video`, `/cut`) |
| **A JSON field's shape** | [`SCHEMA.md`](SCHEMA.md) only |
| **Find a file, or what a file does** | [`MAP.md`](MAP.md), then [`CODEBASE.md`](CODEBASE.md) |
| **Commit, push, verify the live site** | [`docs/rules/working-with-amir.md`](docs/rules/working-with-amir.md) |
| **Pick up an audit item** (`REL-01`, `CARD-01`, a COACH-AUDIT §12 item) | the record: [`docs/record/INDEX.md`](docs/record/INDEX.md) |
| **Restructure or add to the docs themselves** | [`docs/README.md`](docs/README.md) |

If your job is not in that table, the nearest row plus [`MAP.md`](MAP.md) will get you
there — and add the row once you know what it should have said.
