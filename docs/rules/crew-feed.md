# The Crew feed, round 10 (2026-11-20)

Round 10, 2026-11-20, Amir: *"go with your picks"* on the feed pass, direction B (ideas 112, 113, 114 and 120). This file holds what changed on the Crew tab's feed.
It sits beside [`program-app-look.md`](program-app-look.md), whose Crew and the Bell paragraph is unchanged. Where a line there is now out of date, that file keeps it and
points here. The build record, with the functions and the traps, is `docs/ref/program-app/59-the-feed-pass.md`.

## What replaced what

- **The reaction row under every post and moment** (the Like and four chips, or the Like and a ＋) is replaced by **one heart**. The heart is the Like. It draws the same five states
  as before and obeys the same gates; only the drawing changed.
- **The Reply… line under every post** is replaced by a **reply bubble** in the post's icon row. It opens the same half sheet.
- **"The day's attendance has no reactions"** is replaced for a day that carries `people` (stage111): its faces can be cheered. A day without `people` is the words line it always was,
  with no reactions.

## The heart (112 Quiet Lines, 113 Post Reshaped)

- **Five states, one drawing each.** Your own item: no heart at all. Under 13: a quiet heart tally, a span, never a button. Not joined: the heart offers to join (never a dead tap).
  Chosen: the heart wears your pick, a filled clay heart for the Like and the reaction's own icon in green for one of the four, and a tap takes it back. Not chosen: an empty heart,
  and a tap likes.
- **The four reactions wait behind a long-press** (a touch held about half a second, the phone's context menu, or a right click). They open in place, your pick marked, with the
  ✕ at the end. A choice or the ✕ closes them, and they never outlast a visit to Crew. A heart with no reaction list from the server has nothing to open and no long-press.
- **A line shows its count beside the heart. A post does not**: a post says who liked it under its icons, in **Liked by**, and that line is hidden while nobody has.
- **Two taps like, and never take a like back.** Two taps on a post's words, a post's photo or a line's words like it, with a small heart over the spot. A like already given
  stays. Not joined: two taps offer the join. A name, a face or a button keeps its own tap.
- **The photo viewer keeps its own row** (the Like, the four, the ＋ after a choice) on the dark ground. It is not a heart.
- **A known overlap, for Amir to decide:** the Like heart and the **Love it** reaction icon are both hearts. A chosen Love it looks like a green heart beside a clay Like heart.
  Both are kept until he says which gives way.
- **Settled 2026-11-20 (Amir: "fix heart overlap how you think is best"):** the heart is the Like alone. **Love it** is drawn as a smiling face with
  heart eyes, the 😍 it is stored as. The stored value and the word are unchanged.

## Replies fold

- With two or more replies only the newest shows, with **View all N replies** above it. One reply never folds. A tap opens the rest for this visit.
- A reply someone is sent to (the Inbox, a push) is never hidden: its thread opens first (`crewUnfoldReply()`).
- Someone who has not joined keeps **Join the crew to reply** after the replies. Under 13 reads only.

## Trained Today (114) and Add Yours (120)

- With `people` on the day's line and stage96 on, the day is a card of faces under **Trained today**, **Trained yesterday** or **Trained on** the day, with the count of sessions. Without
  either, the old words line is drawn exactly as before.
- **A face works as it does on the week band**: a double-tap is the Cheer (once a day per person, said politely the second time), a tap opens their page after a quarter of a second.
  A cheered face turns clay with a small clap, on every phone, because the server says who was cheered today.
- **Your own face comes first** when you trained. If a programme day was finished today and is not yet on the Bell as a session, it carries a **+** that opens Tell the crew for that
  day. A session still goes with a photo. Once the session is posted, the + is gone.
- Nothing here pays XP (GAME-6), and none of it changes who sees what.

## Moment cards (2026-11-20, direction A "Trophy Rows")

Amir, 2026-11-20, *"go with your picks"* on https://claude.ai/artifact/7bydrN3KFDsDhEtZuyGv4w, direction A. He had sent the Trophy Lines card back with *"i liked it"* and a
wish for the level, the records, a join and the other achievements to be shown in a more interesting way. The build record is `docs/ref/program-app/60-moment-cards.md`.

- **A moment is one card.** With stage96 (`lounge: 1`) and the emblems loaded, a Bell moment line is a card, not a slim row. A badge on the left, one big fact with a clay part,
  who it was and the day's other moments in words, then the heart on the right.
- **The badge says the kind.** A level, a held week, an achievement and a mark wear the cabinet's own emblem (no new art). A new best and a finished cycle wear a green disc
  (**NEW BEST**, **CYCLE 3**). A join wears the person's face with a small **NEW**. An honour wears its honour badge.
- **The big fact is plain words** (COM-3). Level 14. The weight and its gain, 125 kg +5. 5 weeks in a row. The achievement's name. 100 sessions with Amir. Cycle 3 done. Most sessions
  September. Welcome, Mina. The part that matters is in clay.
- **One card per line, led by rank.** A day's line can hold several moments. The biggest leads the card, in this order: honour, mark, achievement, cycle, best, week, level,
  joined. The others are words in the small line under the name.
- **The heart, or Say hello.** The card carries the same one heart as a slim row, with the same five states, the same long-press and the same two taps. On someone else's join,
  a member sees **Say hello** where the heart would be. Your own join has the heart.
- **An achievement's and a mark's badge is a button** that opens what it is, as the slim row's name did. A level, a best and a cycle have no button.
- **Cards stand on their own.** A card is never inside the white `.cr-lines` block. A line with only an `open` part, or one the card cannot draw, stays a slim row in that block.
- **The slim row is the fallback, and it is unchanged.** Without stage96, or while the emblems have not loaded, or if an emblem will not draw, the round 10 Quiet Lines row is
  drawn exactly as before. The emblems load after the page, so Crew repaints once they arrive.

2026-11-20: the Bell now shows a best's weight and its gain in kg (Amir, asked directly: "The weight, like my picture"). The card reads "125 kg +5" with the "+5" in clay, and the
small line is the name and the lift. A first best on a lift has no gain, so it reads "80 kg". The server sends `bests: { "<lift>": { "kg", "up" } }` (stage113), `up` being kg above
the same athlete's previous best on that lift, null for a first. This REPLACES the stage81 line "a best names the lift and never a weight"; that old line stays where it was.

## Vote to See, Caught Up and Show Your Face (2026-11-20, ideas 116, 117, 119)

Amir, 2026-11-20, "build 116, 117 and 119". The build record is `docs/ref/program-app/61-vote-caught-up-face.md`. Nothing here pays XP (GAME-6).

- **Vote to See (116).** While the week is open, a member who is not under 13 sees only the words of the two halves until they vote. No faces, no number, no bar. The foot says
  "Amir's question. Vote to see the answers. Closes Sunday." After a vote, once the week has closed, or for anyone under 13, the halves show the bar, up to three faces and the
  percent, and the foot says how many votes. A non-member sees the hidden halves too, and a tap offers to join.
- **Last week's answer.** One line under the card, "Last week <question> <side> <n> · <side> <n>". The server sends it as `weekly.last` (stage114). No `last`, no line.
- **Caught Up (117).** What reached the Bell since the last time Crew was on this screen wears a small clay dot. The day heading says how many ("· 2 new"). One line, "You're all
  caught up", marks where the new part ends. Your own posts and moments are never new to you. A first visit has nothing new.
- **Show Your Face (119).** When someone has cheered you and you have no face yet, a card asks for it: "<First> cheered you. Add your face so the crew sees who they are cheering."
  It sits at the top of the Inbox and under "Cheers this week" on your own page. Add your face opens the photo sheet. Not now puts it away for good on that phone. Members only,
  never under 13, and it goes by itself once a face is saved.

## Pass It On (118) and What's new (2026-11-21)

- **Pass It On** (Amir: *"lets build 118 i like it"*). Where your cheers show (the Inbox, and Cheers this week on your own page), a card names up
  to two crew mates who trained today and have no cheer from you yet, each with one Cheer button. It reads today's `people` (stage111), so it
  says only what is true: they trained, and you have not cheered them. It never claims nobody cheered them. After a cheer the card moves on.
  Not shown to a non-member or an account ticked under 13.
- **What's new reaches every athlete's Inbox** (Amir: *"after any change to program.html people should know what have changed"*). The words
  are in `assets/news.json`, English and Farsi, in Amir's voice. Each entry shows 14 days as *Amir: <title>* and opens a sheet of short
  lines. The rule and its hook are in [`working-with-amir.md`](working-with-amir.md) → *Every change athletes notice is told*. A big
  feature also gets its card in How the app works (`APP_GUIDE`), with its Farsi.
