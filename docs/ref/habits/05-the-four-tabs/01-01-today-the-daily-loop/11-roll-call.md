#### Roll call
**One sentence a day, visible to everyone else on the board.** Deliberately not a chat:
the server's primary key is `(athlete, day)`, so the shape of the data *is* the rate
limit — nothing to moderate into a thread, and a quiet day reads as "nobody has answered
yet" rather than "this is dead".

- **Posting requires being on the leaderboard**, under the same display name — there is
  no second one. Being on the board is no longer an opt-in (see *The leaderboard*), so the
  consent for the wall is the act of writing a line: `privacy.html` rests the board entry
  on legitimate interests and Roll Call on consent. Not on the board → the box becomes an
  invitation, **with the join form itself rendered underneath it**. It used to be an
  invitation over a button reading *"Take a look at the crew"* whose handler was
  `go('crew')` — from the
  crew screen, the only place that box renders. It scrolled to the top and did nothing
  else, and the actual join form was on the *other* view of the tab, at the bottom, past
  a board of strangers. That was the single dead end a brand-new athlete hit first.
- **Today only**, even though the log itself is editable for three days. Fixing
  Saturday's steps is admin; rewriting what you *said* about Saturday is not.
- **It pays no XP.** The moment a sentence earns points you get one character of
  gibberish every night at 23:58. The reward is that your line sits next to your rank.
- **The box asks a question** rather than showing a blank field — 20 prompts in the
  `prompt` bucket of `NUDGES`, rotating daily on the same seed as every other line.
- **Leaving the board hides your lines** immediately, without deleting them. Re-joining
  brings them back.

Written and read in the **CREW** tab, under *Roll call* (Crew opens on the board since PRF-02).

**The composer is the dark card; every line is its own card** (Amir, 2026-08-01: *"each
comment has its own card … and i like how your message has a card like the dark blue
card"*). Writing and reading are the two halves of this screen and they used to be drawn
the same way, so the box you type in was the first of nine identical rows. `.rccomp` is
inverted (`--ink-card`) with a translucent field and a **`62% day rides along · 58/200`**
meter beside *Post it →* — your day travels with the line, and that is the one thing an
athlete was never told before posting. Each line is an `.rccard`: the name, the sentence,
and **achievement chips underneath**.

⚠️ **No avatars in CREW** (Amir, same day: *"in crew remove the circle with peoples
initials"*). Both the wall and the board briefly carried a tinted initial disc per
athlete; both are name-first now, and `avatar()`/`personHue()` are deleted rather than
left unused. The only initials still in the app are the athlete's **own** — the header
button and the Settings profile card — and those identify a door, not a person on a list.

---
*One section of the reference. The index is [`HABITS.md`](../../../../../HABITS.md); the rules are in [`docs/rules/`](../../../../../docs/README.md).*
