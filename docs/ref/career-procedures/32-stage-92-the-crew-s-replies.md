## Stage 92: the crew's replies, as built (2026-10-20)

Applied to the live project on 2026-10-20 in three migrations (`stage92_crew_replies_part01`, `…_part02_post_key`,
`…_part03_patches`). The file is `supabase/stage92_crew_replies.sql`, safe to re-run. The way back is
`scripts/career/rollback_stage92.sql`, on Amir's word only — **it loses the replies**, which are 7-day rows and are in no
backup, on purpose.

**Why.** Amir, asked replies or likes only (the audit *The Empty Room*): **"replies and likes like instagram"**. He had
chosen likes only, and the first week produced Ehsan posting *"what's the meaning of Kudos?"* into a room with no way to
answer. Asked again the same day whether a reply should be likeable too: **"dont need the likes on replies."** So a reply
is text, and the Like stays where it was, on the post.

**What it is.** One level, text only, **140 characters**, gone with the post at 7 days, your own taken back with two taps
(`armedTap`), and Amir can remove any. Nothing here pays XP (GAME-6).

- `crew_replies` — `id, post_id (references crew_posts on delete cascade), athlete_id, body, created_at`. The cascade is
  why `crew_sweep()` needs no new line: when a post goes at 7 days its replies go in the same statement.
- `crew_reply_rows(p_post, p_viewer)` — one post's replies, oldest first. A reply from somebody no longer in the crew (a
  no, a former athlete) is not shown, exactly as their Like is not counted.
- `crew_reply(p_post, p_body)` — writes one. The post must be one the athlete can actually see (a crew member's or Amir's,
  inside the 7 days). Two caps under one advisory lock so two taps cannot both pass: **30 a day** per athlete, and **50
  per post** counting everybody's, so a thread cannot be driven past reading length.
- `crew_reply_delete(p_id)` — your own. `coach_crew_remove_reply(p_id)` — any, for Amir, as he can remove any post.
- `get_bell()` carries `replies` on each post item.

**The post written once, however slow the line.** `crew_posts.client_key` plus a unique index on
`(athlete_id, client_key)`, and `crew_post()` / `crew_write_post()` take `p_key`. The same key again returns the id that
was written the first time with `"again": true` and writes nothing; the check runs once before the daily-cap lock and
again inside it, because the race this exists to stop is two taps a second apart. This is the **complete** fix for the
double post that stage91's app half could only narrow: a 200 KB photo on Iran's connection could outlast the composer's
timeout, the server wrote the post, the athlete tapped Post again and it was written twice — two posts, and two of their
three photos for the day gone.

**Two things worth knowing before touching this stage again.**

**Two long functions are patched, not retyped.** `get_bell()` and `coach_erase_person()` each needed one line changed, so
the stage reads the live definition with `pg_get_functiondef()`, string-replaces that line and executes the result. Each
patch checks its anchor is present, does nothing if the change is already in, and raises rather than half-applying. A
fresh database is built from `supabase/schema_snapshot.sql`, which holds the final definitions, so none of this is needed
on a restore.

**A new table under an athlete id MUST join `coach_erase_person()` in the same stage.** That function ends by scanning
every `public` table with an `athlete_id` column and refusing to erase anybody while rows are left behind — so a
`crew_replies` it did not know about would have stopped the next erasure dead, with a message naming the table. It goes
first among the crew tables in the list, so its count is the athlete's own replies and not whatever the cascade from their
own posts already took. It is deliberately **not** in `BACKUP_TABLES`: like every other crew table it dies at 7 days, and
a 12-week backup of it would break the 7-day promise in `privacy.html`. It is in `SHORT_LIVED` in
`scripts/restore/restore_backup.py` and in the snapshot instead, both in the same commit.

**The app half.** `crewRepsHTML()` draws the thread under the Like and the names, `openCrewReply()` is the sheet (which
quotes the post and counts to 140 and keeps no draft — a reply is one line and its post is on the screen behind it),
`crewReplySend()` / `crewReplyDelete()` write, and `crewPutReplies()` puts the server's answer on the phone's copy and
repaints that one post, never the whole feed. A non-member's Reply is not dead: it offers to join, exactly as their Like
does (Amir's rule of 2026-10-19). An athlete ticked under 13 reads the replies and is offered nothing. A server without
stage92 sends no `replies` key at all, and then there is no Reply door anywhere — the card is exactly as it was.

**To apply.** Run `supabase/stage92_crew_replies.sql`; it guards on stage81, on `crew_write_post()` and on
`coach_erase_person()`, and ends with a block that raises unless all four changes are in. Then check it on the live crew
with a transaction that rolls back (a reply, a 141-character body, an empty body, the same post key twice, and a delete),
as it was checked on the day. The snapshot goes from 66 tables and 263 functions to **67 and 267**, and
`scripts/test_restore_backup.py`'s table count moves with it.

Tests: `scripts/headless/crew.js` sections 17 and 18 (161 checks in all); the stub answers `crew_reply` and
`crew_reply_delete` against the post in `bell`, and `noReplies` makes it say the function is missing.

---
*One section of the reference. The index is [`career/PROCEDURES.md`](../../../career/PROCEDURES.md).*
