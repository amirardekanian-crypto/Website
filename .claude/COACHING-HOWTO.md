# How to use the coaching pipeline

Plain-English guide. You talk normally; the skills do the work in stages; you
approve each step. Always open Claude Code **in your Website folder** (the skills
read this project's athlete data). They're saved in the project, so **every new
chat in this folder already has them** — nothing to install.

---

## The magic words (cheat sheet)

| Say this | What happens |
|---|---|
| "onboard new client [name]" | Gathers their intake (their form + asks you the gaps) |
| "build the roadmap" | Lays out their multi-cycle plan, then locks it |
| **"do prompt 1"** (or "design [name]'s program") | Designs the program — asks you on real decisions |
| **"do prompt 2"** (or "write her notes") | Writes the app message, outcomes, notes, completion text |
| "build the json" (or "ship it") | Writes/updates their `data/[id].json` file |
| "commit and push" | Puts it live on the site |

You can talk normally — "design Mehraneh's next cycle," "write her notes,"
"ship it." The slash names (`/program-design`) also work if you prefer.

---

## Returning client — next cycle (the usual job)

1. *(Best)* Paste their latest weekly/monthly check-in chat.
2. Say **"design [name]'s next program."**
3. I pull their logs (quietly, in the background), review the cycle, and **stop to
   check with you** on any real decision. Answer my questions.
4. Say **"go ahead."** → I write the full program + your coach-only reports
   (volume, progression sheet, e1RM).
5. Say **"do prompt 2."** → app message & notes.
6. Say **"build the json."** → updates their file and advances the cycle.
7. Say **"commit and push."** → live.

## New client — onboarding

1. Say **"onboard new client [name]"** → I pull their intake form and ask you
   what's missing (injuries, equipment, days/week).
2. Say **"build the roadmap."** → their cycles, locked.
3. Say **"do prompt 1."** → their first program.
4. Say **"do prompt 2."** → **"build the json."** → **"commit and push."**

---

## Where the effort goes

When I design (**prompt 1**) I pour everything into the **programming** — the analysis and
the real training decisions. Exercise **names, chips, day names, and formatting are a polish
pass *after*** the program exists, so I never spend the design on wording. If a name or chip
looks rough mid-design, I'll flag it and fix it later (or you can). Tell me anytime if you'd
rather I stop and sort a name out on the spot.

## How it gets smarter

When you make a coaching call that should apply to *all* clients, I'll ask
**"save this as a principle?"** Say yes and it's remembered forever (stored in
`.claude/COACHING-PRINCIPLES.md`). One-off, client-specific calls aren't saved —
you decide what's learned.

## How to change how it works

Just tell me: *"in program design, cap tennis sessions at 40 minutes"* or *"add
hamstring curls to the default."* Or open the files yourself in
`.claude/skills/` (they're plain text). To edit your saved philosophy, open
`.claude/COACHING-PRINCIPLES.md`.

## Using it in other chats / on another computer

- **New chat, same computer:** already works — open it in the Website folder.
- **Another computer:** `git pull` the repo there; the skills come with it.
- It only *works* inside the Website project (it needs this project's athlete
  data), so always run it from there.
