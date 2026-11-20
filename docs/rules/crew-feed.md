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
