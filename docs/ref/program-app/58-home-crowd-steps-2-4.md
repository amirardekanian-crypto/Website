## 📬 Home Crowd, steps 2 to 4 (2026-10-25): the Inbox, the weekly Toss and photo, the Mailbag and the Answer Book, a reply line, a hello

The plan Amir answered is https://claude.ai/artifact/Ap56d6pvqEfExFYsFN7P1T (ideas 81, 85-88, 90, 91 in `.claude/skills/ideas/BANK.md`, Round 7). His words: *"90A"*, *"85 amazing,
add to coach html. make sure i have month honour as well"*, *"add 87 as well"*, *"add 88 like 85, put it in coach html"*, *"81 A"*, *"86 is good"*, *"go with your picks"* and
*"go live with all the build"*. Step 1 is section 57. Server: `supabase/stage101_inbox.sql`, `stage102_weekly_crew.sql`, `stage103_coach_crew_ask.sql`, all applied to the live
project 2026-10-25 (way back: `scripts/career/rollback_stage101..103.sql`). Live as sw `aap-v235`. Nothing here pays XP (GAME-6).

### The Inbox (90 A, with 83's Cheer back)

- **The server.** `get_inbox(p_since)` reads, for the signed-in athlete only (there is no athlete argument), what other people did to them in the last 7 days: cheers, replies on
  their posts, replies naming them, likes on their posts and Bell lines (one row per post or day), likes on their achievements (one row per award), people who joined, and
  Amir's answers to their Mailbag questions. No new table: these are the Bell's own rows, swept on its own 7 days. A crew name reaches only people who said yes.
- **The tray.** `#global-inbox`, beside the initials, with a clay count from `paintInboxTray()` ("9+" past nine, nothing at 0). The count is rows newer than the phone's
  `aa.inbox.seen` (a map, one time per athlete), which opening the Inbox sets to the server's `at`. Asked by `inboxBoot()` at app open and after `refreshBell()`, at most every 20 s.
  Off in the demo.
- **The screen.** `#screen-inbox` (`openInbox()`, `goTo('inbox')`, ← is `inboxBack()`). `inboxSpec()` writes one plain sentence per row, grouped by day. Every row is a door
  (`inboxGo()`): the post or reply, lit (`inboxLight()`), your cheers, their page, the achievement, or the answer in the Answer Book. A cheer has **Cheer back** (`crewCheerBack()`,
  once a day per person, the server's rule); a join has **Say hello** (`crewSayHello()`).
- **Rows the phone makes.** `inboxScan()` compares the week note, the notes cards and the cycle with `aa.inbox.known`: "Amir wrote your week note", "A new note from Amir", "Your
  new cycle is here". A phone with no record yet only records.
- **The folded notification.** sw.js's push handler sends `#inbox` for "The crew has been busy" (and its Farsi), `#crew` for everything else; `goToInboxSoon()` opens it.
- **Cheer back on your page.** `playerCheerRow(r, own)`; hidden when `crewCheeredToday()` or the Inbox's `back:false` says so.

### The Toss and the week's photo (85 A Two Halves, 87 C On the Toss Card)

- **The bank.** `crew_weeks` (a Monday, the question, two sides, the photo theme, `closed_at`), seeded with Amir's 16 questions and 12 themes from 26 Oct 2026 (T1-T16, P1-P12 of
  the plan). `crew_toss_votes`: one vote a week per crew member, tapping the other side changes it (`crew_vote()`).
- **The card.** `crewTossHTML()`, under the green band, before the Pick card: the question, two halves with up to four faces and a count, *Amir's question. Closes Sunday.* The
  chosen half is outlined in clay. Closed: the result, no tap. A non-member reads it and is told *Join the crew to vote.* Under 13: counts only, no faces, no vote (GAME-9).
- **The photo.** The card's foot: *This week's photo: <theme>* and **Post one**, which opens the composer on *Show us: <theme>* (`openCrewPost(mode, dayId, {prompt})`).
  A week with a theme and no question shows only that row. The week itself arrives in `get_bell()` as `weekly` (`crew_weekly()`).

### The Mailbag and the Answer Book (88 A On the Coach Tab, 91)

- **Asking.** The Coach tab's row **Ask for the crew** (`crewAskRowHTML()`, under WhatsApp) opens `openCrewAsk()`: 200 characters, *You can use my first name* (never offered under
  13), *Amir answers one question a week for the crew. He reads every one.* `crew_ask()` keeps it in `crew_questions`, private to the asker and Amir; three a day; any athlete with
  a programme, crew or not.
- **Answering.** In coach.html (below). `coach_question_answer()` posts Amir's crew post with `session.ask = {q, by}` (by = the first name only if they ticked) and keeps the answer
  on the question. On the Bell `crewAskQHTML()` draws *MINA ASKED* or *SOMEONE ASKED* above his words; coach.html's `askedHtml()` draws the same (twins: same words), from
  `coach_crew()`'s `ask` key (stage103). The asker gets the Inbox row *Amir answered your question*.
- **The Answer Book.** `get_answer_book()`: every answer, newest first. The Library's Playbook pane gets the door **Asked by the crew** (`#lib-asked`, `paintAskedDoor()`), shown
  only once there is one; `openAnswerBook(q)` lands on an answer.

### Talking back (81 A, 86)

- **The reply line.** `crewRepsHTML()` draws a slim *Reply…* line under every post for members. It opens the reply sheet at half height (`cr-half`), focused. A non-member keeps
  *Join the crew to reply* (never a dead tap).
- **The hello.** A member with no post yet opens the composer on a draft built from what the app knows (`crewHelloDraft()`: first name, the sport on their page, days a week).
  Built once (`<id>_crewhello`), cleared by their first post (`<id>_crewposted`). No toast after joining: the join toast is already the notifications ask.

### coach.html: Proof becomes Crew (desk A)

The tab keeps its address `#proof` (every old link works, `#crew` is an alias) and is labelled **Crew**, with a clay count of open questions. Its first panel, **This week**
(`crewWeekHtml`, from `coach_crew_weekly()`): the Toss (votes as bars, Close early), next week (Change, Skip a week, Open the bank), the photo, the Mailbag (Answer, Drop). Every
write goes through `crewCall`, and every one that cannot be undone asks first. Its second, **This month**: the honours drawn by Courtside's own `honoursHtml(true)`, then the
Monthly Open. The Bell and the rest follow as before.

### Kept safe

The three tables are in `BACKUP_TABLES` (`TABLE_KEYS`: `crew_weeks` by week, `crew_toss_votes` by week and athlete), the schema snapshot, the made-up seed and
`coach_erase_person()`'s list, all the day they were made. privacy.html and privacy-fa.html 2.12 (`#mailbag`) say what a question and a vote show. Tests:
`scripts/headless/inbox.js`, `crew.js`, `lounge.js`, `coach-tab.js`, and coach.html's `crew-desk` scenario.
