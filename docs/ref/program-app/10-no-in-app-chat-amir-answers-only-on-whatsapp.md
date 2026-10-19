## 💬 No in-app chat: Amir answers only on WhatsApp (2026-09-26)

Amir: *"whatsapp first, remove in app chat from app and coach.html"*, then the same day: *"Im only
gonna reply to them when they send me a message on whatsapp. They all have my numbers. So instead
of chatting in the app, put sth there so they can whatsapp me quicker"*. The chat was a second inbox
he had to remember to open (one athlete's three messages of 9 Sep sat unread for 17 days), and every
athlete already has his number. **The app never promises an answer inside the app**; it sends the
athlete to WhatsApp from wherever the question comes up, with the context already typed.

- **The Coach tab opens on *Message me on WhatsApp*** (`coachContactHtml()`): a `wa.me` link to
  `COACH_WHATSAPP`, pre-filled with the athlete's first name, cycle and week so Amir knows who is
  writing and where they are; the demo says it is the demo. The number is printed under the button
  for a phone that will not open the link. **`COACH_WHATSAPP` must stay the number the site's own
  buy buttons use.**
- **Two more doors, each saying what the message is about** (`waInlineHtml()`, `coachWhatsAppUrl(about)`):
  *Ask me on WhatsApp* under the note at the end of every session (`sessionWaUrl()` adds the day, its
  title and whatever is typed in the note, at tap time). The About sheet had *Ask me about this exercise*
  until 2026-10-12, when Amir took it off (*"remove the whatsapp button"*). The session note's
  placeholder no longer invites swap requests: a note is read, never answered, so anything that needs
  an answer goes through the door.
- **Gone:** the thread, the composer, the unread dot on the Coach tab, the boot-time fetch of messages
  and the hero's *"Online · usually replies in a few hours"*, which was hard-coded and never true or
  false on purpose. The welcome sheet and the guide now point at WhatsApp.
- **coach.html** has no Chat sub-tab (an old `#a/<id>/chat` bookmark opens The work), no unread
  counts in *Waiting on you* or the roster reasons, and no `messages` query. A session note is
  **read**, not answered: *Mark read* is its only action and the counts say "note to read". (A *Reply
  on WhatsApp* button lived here for an hour on 2026-09-26 and went with Amir's rule above.)
- **The server is untouched**: `messages`, `get_messages()`, `send_athlete_message()` and
  `mark_athlete_read()` stay, so no past thread is lost. The shell is stale-while-revalidate, so a
  phone may run the old copy for a launch or two and could still post into the table; check it once.
- **Do not bring a chat back** without Amir asking for it.

**Today's habits on Home (Fork 1B, B2, same day).** Under the Daily Habits card the athlete ticks
today's habits in place: AA Proof itself, embedded (`habits.html?embed=1` in a frame,
`mountProofStrip()`). Proof draws the rows and does every write; this app holds no habit state.
Loaded only near the screen, shown only when Proof reports `ready`, and never in the coach's
preview. Details: `HABITS.md` → *Embedded on the training app's Home*.

**Home order (same day).** This Week and the day cards come first; the Daily Habits card follows.
It sat above them from 2026-09-12, and in the fortnight after, 5 of 40 athletes logged a habit in a
week while 16 trained. The training is why the app is opened, so it leads.

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
