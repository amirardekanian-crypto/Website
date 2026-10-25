## 🏠 Home Crowd (round 7 step 1, 2026-10-25): the Crew tab made friendlier. Line icons, a smaller band, one name for the settings, tap cues, asking where they finish, Amir's Pick as a card, and Land on It

Amir asked: *"analyse the crew tab, as a community or a social page, what do you think we can do to improve? make it more user friendly, make it more fun?"* The pitch is
https://claude.ai/artifact/VQ7VRR7CvqQ4raUVSvh5gD and the plan he answered is https://claude.ai/artifact/Ap56d6pvqEfExFYsFN7P1T (the ideas, with their numbers, are in
`.claude/skills/ideas/BANK.md`, Round 7). His answers: *"go with your picks"* (76), *"77 is good"*, *"78 is good"*, *"79 A"*, *"80 is good"*, *"82 good"*, and on the Pick card
(92): *"lets go with your pick, but make the card a bit smaller, and it should only stay for a week"*. This step is all in `program.html` and `coach.html`. The only server change is
`supabase/stage100_pick_card.sql` (applied to the live project 2026-10-25). Nothing on Crew pays XP (GAME-6), and none of this changes who sees what.

### The reactions as line icons (79 A)

- **The map.** `CREW_EMOJI` holds the four stored characters, each with a word and a line icon: 🔥 is **Fire**, 💪 is **Strong**, 👏 is **Well done**, 😍 is **Love it**.
  `crewEmojiIcon(e)` gives the drawing and `crewEmojiWord(e)` the word. The drawings are Phosphor Icons (MIT licence, regular weight, 256 box, `currentColor`, nothing fetched). They are
  20 px on a chip and 16 px in the receipt that an account with reactions off sees. They take the chip's text colour: ink at rest, `--green-ink` on the chosen chip (its 2 px ring is
  as it was).
- **Why.** The phone's emoji are yellow, and nothing in this app is yellow. They also look different on every phone. Amir picked direction A, Line Icons. B (Green Glyphs) and
  C (One Like, Four Behind) stay on the board.
- **The words.** Every label says the word, never the character: *Send Fire*, *Fire sent. Tap to take it back*, *Join the crew to send Fire*. A receipt chip is `role="img"` and reads
  *Fire, 3*. The guide names the four the same way.
- **Never the clap.** 👏 is drawn as confetti. `CLAP_SVG` is the Cheer's, and the two must never look like one thing.
- **Nothing stored changed.** The server still sends the characters (`crew_emoji_list()`, stage82) and a reaction is still stored as the character. `data-em`, `by[...]`,
  `kk.emoji` and `p_emoji` are untouched, so there is no stage for this. A character the server adds later has no drawing and falls back to itself.

### The band (76 B, Beside the Numbers)

My pick was a bigger reorder (Feed First). Amir said *"go with your picks"* and the smaller version went in: only **In the crew ›** moves. Every other word is as it was.

- `crewWeekHTML()` puts the two big lines on the left and **In the crew ›** on the right, level with the second line (`.cr-bandtop`, the button is `goBtn`). The button never wraps and the
  lines give way to it, so a crew of 19 or *123 sessions* cannot push it over anything at 320 px. Its 44 px target is padding drawn by `::after`, not height in the band.
- The foot (`.cr-bandfoot`) is drawn only while the one-time hint (*Double-tap a face to cheer. Tap to see their page.*) is. `crewHintDone()` takes an empty foot away and the CSS
  hides an empty one. A band with no hint is about 50 px shorter.
- With no Players' Lounge on the server there are no face doors, and the band is the one button it always was, with **In the crew ›** inside it.

### One door, one name (78)

The sheet that holds the Yes/No and the switches (`openCrewSettings()`, `CREW_KINDS`) was called *Crew and the Bell* and reached by three rows under two names: the Profile group's
*What the crew sees of you*, a second *Crew and the Bell* row in the main list, and a foot row on the tab. It is what the crew sees about you. What rings your phone is **Reminders**.

- **One name: What the crew sees.** The sheet's title, its note (*What the crew sees about you. Turn any of them off.*, it used to say *What rings for you*), the row in the account
  sheet's Profile group (`acct-sees`), the door at the foot of your own page, the intro card's second button, the join question's last line and the crew list's note all say it.
- **One row.** The second row (`acct-crew`) is drawn only on a server with no Players' Lounge, and not for an athlete under 13, under the same name with the same eye. The foot row on the
  tab (`.cr-me-row`) is gone.
- **A no gets its own button.** The line for an athlete who kept it to themselves (*You keep your moments to yourself, so the crew does not see you here.*) no longer says *just below*.
  The same green **Join the crew** button the question has sits under it (`.cr-join`, `crewAnswer('yes')`).
- **The composer.** The sheet that posts a message has the eyebrow *Crew* and the title **Share with the crew**. A finished session's composer is unchanged (*Tell the crew*, *Day N done*).
- **The Bell's heading** reads **What's new**. It does not say *Last 7 days* any more; the band above it says the week.
- **The guide.** The card is **Crew** (it was *Crew and the Bell*), says where **What the crew sees** is, and has one new paragraph about the Pick card. Nothing in the app is
  called *Crew and the Bell* now. The section you are reading keeps the old name in the index because that is how other files point at it.

### Tap cues (80)

Things that looked tappable and were not, and things that were tappable and looked like text.

- **Pinned is a label.** `.cr-pin` is a green outline with no fill. It used to be solid clay on a post nobody had opened, which made the one thing that cannot be tapped look like the
  one thing that asks. Clay stays on what asks for something (DS-01). `.is-new` stays on the element as the record of that state and has no look.
- **Honours tiles.** A tile with one person is a whole door to their page (`crewDoor(one, 'cr-ht', …)`, labelled *Most sessions, Hal, 12 plan sessions. Opens their page*). A tile with
  two or more keeps a door per name. Someone with no door (under 13, or no key) is a plain tile.
- **The face on a moment line** is a door like the name beside it (`crewFace(pp, 'line', true)`, `.cr-fd`): drawn at 24 px, a 44 px target.
- **Board rows** that are doors wear the small **›** (`.cr-br.dr`, a fourth column), like the other door rows on Crew. A plain row has none.
- **44 px.** **Reply** (`.cr-rep-add`) and **Delete** (`.cr-del`) are 44 by 44 by padding, not by a bigger word. A face in the band is a 44 px wide target round a face drawn at 40.

### Ask where they finish (82)

Amir: *"82 good"*, both parts. The fourth notification ask is his yes (`docs/rules/push.md`, now four moments).

- **(a) The join row on the finished card.** `paintCrewTell()` showed **Tell the crew** only to someone who could already post, so an athlete who never answered the crew question never learned
  it was there. Now `crewTellInvite()` (the crew is on, no answer yet, not under 13) shows the same row with a second line, *Join the crew first. You see what they would see.*
  Its tap goes to the top of Crew, where the join question is and their own page is shown first. It is never a one-tap join from there. A member keeps today's row. Someone who said no sees nothing.
- **(b) The line under Cheers this week.** On YOUR OWN page only, `playerCheersAskHTML()` draws one plain row, **Turn on notifications so the next cheer reaches you**, when the phone can take
  notifications and they are off (`pushWorthAsking()` is the whole test: nothing when they are on, blocked or waiting for the Home Screen). Its tap is `playerCheersAsk()`, which calls
  `pushAsk('cheers', …, true)`: the same one line with the same button as First Serve's step. The phone's own box opens only inside that button's click. The heading is drawn for the
  row alone when there are no cheers yet. `pushTurnOn()` and `pushTurnOnHere()` repaint the page, so the row goes once the phone has answered.

### The Pick card (92)

Amir, before this step: *"my pick of the month should have a card or something that is nice, every one can see for a while. design it, and there should be a reason for it why she is my
pick"*. The pitch had 14 days. He took direction A (The Pick Card) and said *"lets go with your pick, but make the card a bit smaller, and it should only stay for a week"*. B (In the Band)
and C (Her Page Leads) stay on the board.

- **The server (stage100).** `get_bell()` answers a new key, `pick`: `null`, or `{ month, who, ck, fv, me, why, at, until }`. It is the newest Amir's Pick made in the last 7 days whose person is in
  the crew with the honours switch on. `at` is when the pick row was written, `until` is `at` plus 7 days, `me` is true when the person asking is the pick. A pick whose person is not in the crew
  (or has the honours switch off) is on their own page alone. The same pick no longer makes a plain line on the Bell (the card says it once). Its push is as before: it rings once. Rollback:
  `scripts/career/rollback_stage100.sql`.
- **The reason.** `coach_honours_why(month, why, not_clients)` writes, changes or clears Amir's reason on a month's pick: 140 characters at most, kept inside the pick's `career_honours.value` as
  `why`. No table, column, backup list or erase list changed (`career_honours` is in `BACKUP_TABLES`, the snapshot and `coach_erase_person()` already). `coach_honours()` and `crew_page()`
  already return `value`, so coach.html and the Player Page read it with no other server change. Writing a reason rings nobody. `coach_honours_pick()` is not changed: the pick comes first and the reason after.
- **Where and how long.** `crewPickHTML()`, in `renderCrew()` straight after the green band and before the honours tiles. It is about 190 px tall. It is drawn for 7 days from the pick. The phone's copy of the Bell
  can be old, so a card past its `until` is not drawn either. A server without stage100 sends no `pick` and nothing is drawn.
- **The look** (`.cr-pick`). A green top on the band's own ground (`--hero`): the pick's face at 44 px with a mint ring (`crewFace(p, 'pick')`), the eyebrow *Amir's pick · October*, and the name in the
  band's display type. Below it, a row: Amir's reason in ink between green quotes (with no reason it reads *Amir's pick for October*), his photo and *Amir* small, and one line of actions. Every
  colour is a token, so dark mode needs no rules of its own.
- **The one clay is Cheer.** The line is the clay **Cheer Hal** (the Player Page's own `.pl-cheer`, so `openCheer(key)`; a person who is not in the crew is offered to join, as a Like does) and a
  green link, **Hal's page ›**. After a cheer, or a refusal because it was already sent today, the button becomes **Cheered today** in place (`crewPickHTML(true)`, from `crewCheerDone()` and
  `crewCheerFail()`).
- **`me`.** The athlete who was picked sees **Your page ›** and no Cheer. An athlete under 13, or a server with no Players' Lounge, gets the card with no Cheer and no link (`crewDoorOn()`).
  `openCheer()` no longer needs a copy of their page on the phone (`crewFirstOf(key)` finds the first name), because this card can open it for someone whose page was never fetched.
  `crewNameOfCk()` reads the pick too.
- **No line on the Bell.** The card replaces the plain moment line a pick used to make. The four honours tiles from the 1st to the 14th are unchanged and still hold the pick.
- **Her page keeps it.** On the pick's own Player Page the Honours row for *Amir's Pick* shows the reason under the line, between green quotes, with *Amir* small (`playerHonRow()`, `.pl-why`, `.pl-by`).
  A row with no reason is as it was. The card goes after the week and the page keeps the reason for good.
- **First use.** October's honours are worked out from 1 November, so no pick, and no card, exists on a live phone before then.

### Land on It (77)

Amir: *"77 is good"*. A notification opens the thing it was about. The notification itself still carries only `#crew`.

- **After Post.** `crewSend()` lights the new post: on Crew it comes into view and is tinted for about 2 seconds (`crewLight(sel, 'new')`, `.cr-lit`, `crLit`). A tall post (a photo) lines up by its
  top, a short one sits in the middle. The post is on the Bell only once the ask that went with it comes back, so `crewLight()` looks for it a few times and asks again if the ask on its way missed it.
  The slow path (a timeout, then the app asks the server what it has) lights the post that landed. Someone who asked their phone for less motion gets a plain jump and the tint without the fade.
- **After a notification.** `goToCrewSoon()` reads `crewSeenAt()` before Crew opens (opening writes the new time), asks the Bell at once whatever the 20 second rule says, opens Crew, and calls
  `crewLandAimed(since)`. It waits for the fresh Bell. Then it lands on, in this order: (1) the newest reply from someone else, on one of my posts or naming me, newer than my last visit
  (a reply row carries `data-rid`, and the row is tinted where it already is); (2) a cheer from someone else on my page, on or after the UTC day of my last visit: my page opens and scrolls to
  *Cheers this week*, and the newest cheer's row is tinted; (3) nothing new: the top of Crew, as before.
- **It stands down.** Only `goToCrewSoon()` asks for a landing, so a normal tap on the Crew tab moves nobody. The landing is dropped if the athlete has scrolled, opened a sheet or left Crew
  while it waited. A session, Guided, the rest clock and the check-in still win over Crew, as they did.
- **How "since your last visit" is kept.** `<id>_crewseen_at` is the time Crew was last on this phone's screen, written by `renderCrew()` through `crewSeenAt(true)` and only while Crew is
  showing. It is this phone's own and never synced (`_snapshot()` skips it, like `crewcache` and `crewseen`; `crewseen` is the newest pinned post opened, a different thing). A phone with no
  value counts the last 24 hours, not the whole week.

### Courtside in coach.html

The coach half is in `COACH_DASHBOARD.md` → *3. TODAY* → *The month's honours*. In short: **Someone else** is a list of every client who counts, under the shortlist, with the same two taps
(`honourElse()` → `honourPick()`). The picked row has the box **Why Hal? The crew reads this.** (140 characters, `honourWhy()` → `coach_honours_why()`), and a line saying *On Crew until 2 Nov*, or that the
card is over and the page keeps it. The WhatsApp line is *You're my pick for {month}. Can I put you in my story?* in `COURT_LINES` and in `career/recognition.toml`
(`scripts/check_career.py` rule 22 keeps the two equal). A pick is always for the month that ended, so the line names the month.

### Tests

`scripts/headless/crew.js` (the icons and the words said for them, the receipt, the pin as a label, one row for the settings on a server with no Lounge, the cheers line and the fourth ask),
`scripts/headless/lounge.js` (the round 7 sections: one door one name, the join row on the finished card, the hit areas, the band, the tap cues, the Pick card, Land on It) and
`scripts/headless/coach/run.js` (the Pick's reason and Someone else).
