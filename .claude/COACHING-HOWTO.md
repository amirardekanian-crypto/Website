# How to use the coaching pipeline

Plain-English guide. You talk normally; the skills do the work in stages; you
approve each step. Always open Claude Code **in your Website folder** (the skills
read this project's athlete data). They're saved in the project, so **every new
chat in this folder already has them** — nothing to install.

*(Rewritten 2026-09-26 after the pipeline audit. Programmes and coaching logs live on the
server now, so nothing here needs "commit and push" to reach an athlete.)*

---

## The magic words (cheat sheet)

| Say this | What happens |
|---|---|
| "onboard new client [name]" | Gathers their intake (their form + asks you the gaps) |
| "build the roadmap" | Lays out their 5 cycles and locks them (no sign-off needed) |
| "cycle report for [name]" | End of a cycle: their WhatsApp report + the Debrief the next design reads |
| **"do prompt 1"** (or "design [name]'s program") | Designs the cycle, asks you on real decisions, then builds it and runs every check |
| **"do prompt 2"** (or "write her notes") | Writes the app message, notes, week-1 and back-off notes, completion text, WhatsApp |
| "ship it" | Places the words, runs the full check, asks about any new library exercise, publishes |

You can talk normally — "design [name]'s next cycle," "write her notes,"
"ship it." The slash names (`/program-design`) also work if you prefer.

---

## Returning client — next cycle (the usual job)

1. In their last week, say **"cycle report for [name]."** → I read the five weeks, ask you once
   about films and calls, and hand you their WhatsApp report. It also saves a Debrief, which is
   what the next design starts from.
2. Say **"design [name]'s next program."** → I read the Debrief and *why* we built the last
   cycle the way we did (your coaching log), and **stop to check with you** on any real
   decision. Answer my questions.
3. Say **"go ahead."** → I write the programme, build it and run every check on it, before a
   word of the notes exists.
4. Say **"do prompt 2."** → app message, notes, the week-1 and back-off notes, WhatsApp.
5. Say **"ship it."** → it goes live on their phone, and this cycle's reasoning is saved to
   their coaching log.

## New client — onboarding

1. Say **"onboard new client [name]"** → I pull their intake form and ask you
   what's missing (injuries, equipment, days/week).
2. Say **"build the roadmap."** → their 5 cycles, with a second opinion from one reviewer.
3. Say **"do prompt 1."** → their first programme, built and checked (a new athlete also gets
   one independent review).
4. Say **"do prompt 2."** → **"ship it."**

---

## Where the effort goes

When I design (**prompt 1**) I pour everything into the **programming** — the analysis and
the real training decisions. Exercise names, day names and formatting are a polish pass
*after* the programme exists, so I never spend the design on wording.

## Your private coaching log

Every time you ship a cycle, I save **why** that cycle looks the way it does — the read, the
decisions and the volume tables — to that athlete's coaching log on the server. Open it in
**coach.html → the athlete → File**. It's **append-only**: each cycle adds a new entry and old
ones are never overwritten, so six months later you can see exactly how we were thinking and
why we changed something. It's **coach-only**, never shown in the athlete's app.

## How it gets smarter

When you make a coaching call that should apply to *all* clients, I'll ask
**"save this as a principle?"** Say yes and it's remembered (stored in
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
- It only *works* inside the Website project, so always run it from there.
