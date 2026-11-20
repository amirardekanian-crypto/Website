## 🗳️ Vote to See, Caught Up, Show Your Face (2026-11-20): the Toss waits for your vote, the feed says what is new, a cheer asks for your face

Amir, 2026-11-20: *"build 116, 117 and 119"*, three of round 10's ideas. All in `program.html` and its tests, plus one server field, `weekly.last` from `supabase/stage114_toss_last.sql`.
Nothing here pays XP (GAME-6). The rules, short, are in `docs/rules/crew-feed.md` → *Vote to See, Caught Up and Show Your Face*. Section 60 is the step before this one.

### What it does

- **116, Vote to See.** `crewTossHTML()` sets `hidden = open && !kid && !w.mine`. A hidden half is `.cr-half.is-hidden` and holds only `span.l`, and its aria-label is the words, plus
  "Tap to vote and see the answers". A shown half is `.is-shown` with `span.bar[style="--p:NN%"]`, up to three faces and `.n` (the rounded share), and its aria-label is
  "<label>. N votes, NN%". The foot is "Amir's question. Vote to see the answers. Closes <Day>." while hidden, "N votes. Closes <Day>." once shown, "Closed" after the week.
  `crewVote()` is unchanged: its optimistic move sets `w.mine`, so the next `crewTossPaint()` reveals the bars.
- **116, last week.** `weekly.last = { q, a, b, na, nb, mine }` draws `p.cr-tosslast` under the card: "Last week <q> <a> <na> · <b> <nb>". No `last`, or one without a `q`, draws nothing.
- **117, Caught Up.** `openCrew()` sets `_crewVisitFrom = crewSeenAt()` (localStorage `<id>_crewseen_at`) before anything renders. `crewIsNew(i)` is true for a post or a moment
  from someone else whose `at` is later than that. 0 means never, so a first visit has nothing new. Your own items and the day's `sess` line are never new. `renderCrew()` adds
  `is-new` to those items (a clay dot, `::before`), `span.cr-newdot` and `span.cr-dayn` (" · N new") to the day heading, and one `p.cr-caught` ("You're all caught up") before
  the first item that is not new, after at least one that was. Amir's pinned post is left out of the count.
- **119, Show Your Face.** `crewFaceAskWanted()` needs `crewPagesOn()`, `crewCanLike()`, not under 13, your own face version null (`crewPersonOf({ me: true }).fv`) and
  `localStorage <id>_faceask` not "done". `crewFaceAskHTML(who)` draws `div.cr-faceask` with "Add your face" (`openFacePhoto()`) and "Not now" (`crewFaceAskNo()`, which writes
  "done" and removes every card on screen). It is drawn at the top of the Inbox by `renderInbox()` from the newest `cheer` row (Amir's reads "Amir"), and under "Cheers this
  week" by `playerCheersHTML()` on your own page only, from the newest cheer row that is not yours.

### The server field

`get_bell()`'s `weekly` gains `last` (stage114). It is the previous week's question, its two answers and their counts, and `mine`. Until Amir applies the stage the server sends no `last`, so the app must keep working without it (no line).

### The traps

- **The seen time is read before the render writes it.** `renderCrew()` ends with `crewSeenAt(true)`, which stores now. `_crewVisitFrom` is therefore read in `openCrew()`, once per
  visit, and a second render in the same visit marks the same items. Reading it inside `renderCrew()` would clear every dot on the first paint.
- **A face ask only while `fv` is null.** The check is on the live face version, so saving a face removes the ask by itself. Do not cache the answer, and do not draw it from the
  cheer row's own `fv`, which is the cheerer's.
- **The Toss counts are still sent before a vote.** `get_bell()` returns `votes` and the faces whatever the viewer did. The hiding is only on screen. It is a nudge to vote, not a
  secret, and a test or a person reading the Bell cache can see the numbers. Do not rely on it for anything that must stay private.
- **Under 13 and a closed week are shown, not hidden.** `hidden` is false for them, so they read the numbers and have no tap. A non-member is hidden and can tap, to be offered the join.
- **The copy on the phone is drawn too.** The Bell cache holds `mine`, so a vote made before closing the app is still shown after it opens.
- **The tests.** `crew.js` section 22 (116, 117, and 119 on your page) and `inbox.js` section 13 (119 in the Inbox) check all of this, and `inbox.js` section 5 reads the Toss before and after a vote.
