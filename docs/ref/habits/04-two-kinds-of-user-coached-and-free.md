## Two kinds of user — coached, and free

Proof is also **the way in for people who are not clients yet**. They land on
[`proof.html`](../../../proof.html) (the Instagram bio link — deliberately not in the site nav),
read what it is, and leave a **display name, email and WhatsApp number**. Amir gets the
form by email and runs the **`/proof-signup`** skill
([`.claude/skills/proof-signup/SKILL.md`](../../../.claude/skills/proof-signup/SKILL.md)), which
has them live in under two minutes: pick an id (checked against the roster first — ids
are permanent), insert their **identity row** in `public.programs` and their **contact
row** in `public.hab_contacts`, then Amir clicks **coach.html → Athletes → the athlete →
Create login**, and coach.html writes the WhatsApp message with their username and
password. There is no link to send any more (every `?client=&key=` link died on
2026-09-07), so a signup is not finished until the login exists.

The difference between the two users is **one field** inside the `athlete` object of
their programme record — their row in `public.programs`, which every app reads through
`get_program()`:

```json
{ "athlete": { "id": "<id>", "firstName": "<first name>",
               "boardName": "<the name they typed>", "tier": "free" } }
```

A free athlete's row is only that identity; they have no programme. `boardName` is
optional and holds the name they typed on the form — `defaultDisplayName()` uses it,
falling back to first name + last initial, wherever the app needs a board name.

**Signing someone up does not put them on the leaderboard** — nothing server-side joins
anyone. The app joins an athlete itself, on their own device, the first time it opens
after they have **finished a workout** (`autoJoinBoard()`, see *The leaderboard*), and a
free athlete in practice never has: their WORKOUT is locked, only a session finished in
`program.html` ticks it, and free mode points every route to `program.html` at
`/form.html`. So a free signup **joins by hand**, from Crew, where `boardName` has already
filled in the box. `CFG.onBoard` is this phone's copy of the server's
`leaderboard_optin` row, and since 2026-09-26 it **follows the server**: every
`fetchBoard()` hands `LB.joined` to `applyServerJoined()`, and a boot check
(`checkBoardStatus()`, one `leaderboard_top` read, only for an athlete the phone thinks is
on) catches a coach removal before Crew is opened. It only ever reads; see *The
leaderboard*. Until then `LB.joined` was written and never read, so an athlete the coach
removed still saw "You are on the board".

`isFree()` is the only test in the app, and anything that is not `"free"` counts as
coached — so no existing athlete record needs touching. In free mode:

- **WORKOUT stays locked**, and says why: *"Coached athletes earn this from their
  programme. It is the biggest habit on the list."* It is the one habit they can see
  and cannot have, which is the honest version of the pitch.
- Every route that would open `program.html` goes to **`/form.html`** instead — the
  Today card, the Settings row, the habit detail button.
- The Today card reads *"Want the training too?"* rather than *"Your training
  programme"*.

**Scoring is identical.** A free user earns the same XP, levels, streaks, badges and
board position as a paying athlete, and shares **one board** with them — that is the
point. It also makes the upgrade free of migration: drop `"tier"` (or set it to
`"coached"`), let the coaching pipeline write the programme into the **same
`public.programs` row**, and their whole history, level and board place carry straight
over. **Same id, same login, same history** — the username and password that opened
Proof now open `program.html` too.
Once Career Mode's XP switch is on, a free athlete's career is their habits alone (GAME-12: one system for everyone, and a free
athlete simply has no training facts). The upgrade adds the training to the same career. Nothing resets.

**Contact details never go in the programme record** — every app the athlete signs in to
reads that row. Email and WhatsApp live in `public.hab_contacts` behind coach-only RLS
(`supabase/stage16_contacts.sql`), and all three functions around it are **coach-only**:
`is_coach()` reads the signed-in JWT's email, so they work from a signed-in coach.html and
raise `coach only` from the plain SQL editor.

- **`add_contact()`** — a signup in one call: records the contact row (name, email,
  WhatsApp, source, tier). Until stage41 (2026-09-26) it also minted an `athlete_keys` row,
  which would have re-opened the retired link path for that id; it no longer does (`akey`
  comes back null). Nothing calls it: `/proof-signup` does the two inserts directly.
- **`contact_list()`** — who signed up, whether they are on the board, and **how many
  days they have actually logged**: adherence is the qualifying signal, and a better one
  than an email address. coach.html → **Proof** → *The funnel* reads it.
- **`forget_contact('<id>')`** — the *forget* button in that same panel. It deletes their
  roll-call lines, board entry, progress blob (their whole log), contact row and any key.
  ⚠️ It does not finish the job: the `public.programs` row, the login (coach.html →
  *Revoke login*), `hab_titles` and `hab_season_results` survive it. The `/proof-signup`
  skill has the full erasure checklist.

---

---
*One section of the reference. The index is [`HABITS.md`](../../../HABITS.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
