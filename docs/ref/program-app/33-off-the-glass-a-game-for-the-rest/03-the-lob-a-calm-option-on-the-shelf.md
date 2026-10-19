### The Lob: a calm option on the shelf (2026-10-18)

Idea #44 of the round-4 page (https://claude.ai/artifact/1qn7D8shTUmKrYDHo9UT9W), built on Amir's *"Go with your picks on all nine decisions"*. The
shelf's fourth row, **The Lob** (*Breathe with the ball · in 4, out 6*), is for a rest when an athlete would rather breathe than play. It is not a
game: it is a **mode of `rally.js`** (`Rally.open({ ..., mode: 'lob' })`), so every hook the games have (the clock, ✕, Back through `topLayer()`,
`timeUp()`, `handBack()`, `closeRestGames()`) works with no new code in program.html.

- **What the screen is.** The same green court with its lines dimmed, the rest clock pill and ✕ as in the game, and in the middle a soft white ball that
  **grows for 4 s (breathe in) and shrinks for 6 s (breathe out)**, eased (a cosine, so it slows at each turn), for as long as the rest lasts (`LOB`,
  `lobAt()`). Under it one word, *Breathe in* / *Breathe out* (34 px, it fades in at each turn). Seen from above a ball that rises looks bigger and its
  shadow slides away, so *in as it rises, out as it falls* is literally what it does. **No breath hold, no counts, no number but the rest clock, no health
  claim anywhere on the screen.** On the first open on this phone only (`lob_seen`, no athlete prefix, never synced; set at the open, so leaving early
  still counts) one line sits under the word for the first two breaths, then fades: *Breathe in as the ball rises. Breathe out as it falls.*
- **Sound only with the timer's sound on** (`rest_sound`): one very soft low tone at each turn (a sine, gain 0.05, 262 Hz going in, 196 Hz going out),
  never a buzz (no `navigator.vibrate` anywhere in it) and no tick at 3, 2, 1. **Reduced motion keeps the ball's size change** (it is the pacer) and drops
  the glow's pulse (and the word's fade-in).
- **The hooks.** `handBack(done)`: the ball settles to its resting size over 0.6 s (`LOB.settleS`), the word fades, then `done()` and program.html closes it;
  `timeUp()`: stops at once where it is, *Time. Next set.*; both idempotent (the first `done()` stands). The state has **none of the match's fields**
  (`Rally._state().mode === 'lob'`, no `score`, `ball` or rackets), writes nothing to `rally_stats`, and `close()` is the game's own. While it is open
  `Rally.timeUp`, `.handBack` and `._tick` route to the lob (three one-line wrappers at the end of the file); the layer's `aria-label` reads *The Lob*
  and `close()` puts *Off the Glass* back.
- **The Lob and Full Time (the two builds met 2026-10-18).** The Lob never reads or changes the parked match (`M`): opening it, closing it with ✕ or Back, the hand-back and the rest running out leave the score, the best rally, the played seconds and Amir's form as they were, and `rally_stats` unmoved. **Off the Glass then picks the match up**: after The Lob in the same session (by the row, or straight across with `openRestGame('rally')`) it shows *Play resumes · You 6, Amir 4* with the numbers it had, and the other way round (the game mid-match swapped for The Lob) parks the match first. The shelf row's small line keeps reading *play resumes* while a lob is open. One trap met in the merge: `close()` is shared and calls `saveBest()`, which reads the match's best rally; a lob has none, so `saveBest()` returns at once for `S.mode === 'lob'` (without it ✕ on a lob threw and left the layer open). Checks: the last section of `full-time.js`.
- **In program.html:** `REST_GAMES.lob = { src: '/assets/js/rally.js', global: 'Rally', root: 'rallyOverlay', mode: 'lob' }` (`openRestGame()` passes
  `mode` to `G.open`; the other games ignore it), `restGamesOpen()` lists a global **once** (a `Set`: two keys share `Rally`, and `timeUp()` / `handBack()`
  would run twice), `restGameLib()` keys its in-flight load by the script's global (two rows, one file), the shelf row `data-game="lob"`
  (`rest_game_last` may be `lob`), and the guide's *Built-in tools* card says it in one sentence (CNT-01).
- **Why a calm option.** The round's rule is *a calm option beside the game*. The round-4 write-up cites Buxton 2024 and Jones 2026 for slow, paced breathing
  between sets giving a faster heart-rate recovery with no harm to the next set (**not re-checked in this build**; before anything is said about it, read
  the papers). The screen claims nothing of the kind: it offers a slow ball, nothing more.
- Test: `node scripts/headless/lob.js` (86 checks: the row, lob mode with the match untouched, the word and the ball at 0, 2, 3.9, 4.1, 7, 9.9, 10.1 s by
  `Rally._tick` and once in real time, ±0.2 s, the one-time line and `lob_seen`, the tone at each turn and none with the sound off, no buzz, reduced motion,
  ✕ and Back, the hand-back by the clock closing it in about 0.6 s with the get-set line showing, `timeUp()`, Off the Glass after The Lob and the reverse,
  `restGamesOpen()` once, light and dark at 390 and 320 x 568, the demo banner). `splitstep.js` and `between-sets.js` now expect four shelf rows.

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
