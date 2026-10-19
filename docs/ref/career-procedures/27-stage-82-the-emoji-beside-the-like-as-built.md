## Stage 82: the emoji beside the Like, as built (2026-10-19)

**APPLIED to the live project on 2026-10-19** (Amir: *"yes, apply stage82 and turn the emoji on"*), as the migration `stage82_crew_emoji`.
Read back: the column, the set `🔥 💪 👏 😍`, the two-argument `crew_kudos()` gone and the three-argument one there, anon unable to send one,
`authenticated` able to, `crew_emoji_list()` and `crew_kudos_of()` the service role's, and `get_bell()` carrying the list. **All three
function bodies read back md5-equal to this file.** The six reactions already on the server stayed plain Likes (`by` empty, counted under
`like`), and `get_bell()` for a real athlete came back with the list and six items. Amir, 2026-10-19, on the page
https://claude.ai/artifact/KkF7qE5yomcLdxKYF1mjo8:
*"instead of racket go with hearty eyes. but lets go with all five out style"*. So direction **A** (the Like and the four emoji all on the
card, one tap each) and the set **🔥 💪 👏 😍**, with the Like itself the fifth and the default. ⚠️ **The Monthly Open moves to stage83.**

`supabase/stage82_crew_emoji.sql` (safe to re-run; a guard refuses without stage81):
- **One nullable column**, `crew_kudos.emoji`. **Null is the plain Like**, so every row stage81 wrote stays a Like and no athlete's reaction
  moves. The table's check is loose (1 to 16 characters); the LIST is `crew_emoji_list()`, so changing the set later is a function, not a
  migration that rewrites a constraint.
- **`crew_kudos(p_target, p_on, p_emoji)`**: a third argument, and the two-argument form is DROPPED so nothing can reach the old body. One
  reaction per person per target still (the unique indexes are untouched): a different emoji **swaps in place** and is re-dated, so the names
  read newest first; `p_on => false` takes it back, whatever it was; an emoji that is not on the list is refused (`crew:emoji`).
- **`crew_kudos_of()`** gains `emoji` (the viewer's own, null when theirs is the plain Like), `like` (how many plain Likes) and `by` (how many
  of each emoji, only the ones sent). `n`, `mine` and `names` keep their meanings, so a phone that has not updated keeps working.
- **`get_bell()` returns `emoji`, the list.** That is how the app knows: with no `emoji` key program.html draws the Like alone, which is why
  the app could ship before this stage.

**Rehearsed** in `scripts/career/rehearse_crew.mjs` section 14 (the whole file is **292 of 292**): the stage twice, the grants, the list, a
Like written before the stage still counted as one, the swap, the take-back, the refusals, two people on one emoji, the names, a Bell line,
the feed's shape, and the way back followed by the stage again.

**To apply** (Amir's yes first): no backup needed (one `add column`, no backfill, no row touched). Apply the file, read back the column, the
list, that the two-argument function is gone and the three-argument one is `authenticated`'s while `crew_emoji_list()` is the service role's,
and that `get_bell()` carries the list. **The schema snapshot is remade in the same commit** (`scripts/restore/README.md`). `BACKUP_TABLES`
does not change: `crew_kudos` is one of the four short-lived tables and is not in a backup. The way back:
`scripts/career/rollback_stage82.sql`, on his word only — every reaction stays, as a plain Like.

---
*One section of the reference. The index is [`career/PROCEDURES.md`](../../../career/PROCEDURES.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
