## 7. PROOF

<!-- Split by sub-heading: one file each. Open the part you need. -->


**Proof is the community's home** (round 2, 2026-10-12): everything about the crew is on this one screen, in two columns from 900 px (the left, about 1.3 to 1, is
the wider; one column below that, the left first). **Left:** **The wall**, then **The Bell** and **Who said yes** (both only once stage81 is applied), then **The Monthly Open** (only once stage85 is applied), then **The board**. **Right:** **Quest week**, **Proof pulse**, **Titles minted** and
**Season**, last. (**The funnel** was the last panel here until 2026-10-12; it is Leads → Free signups now, because the people who signed up are leads to follow, not part of running the crew.) The wall, the quest lever and the pulse used to be on Today; Today keeps a short Proof column that links here
(section 3, *Proof today*). One copy of each id is in the page at a time (`#wallPanel`, `#questPanel`, `#pulsePanel`, `#coachLineInput`: Today draws its own, `#proofToday`).
A redraw (a line posted, a line hidden, a quest week started) is drawn at once from what the page holds: the board is read once and kept, and only a real first
read (or a **Reload**) waits, inside the board's own panel as *Fetching the board…*, so the wall and the lever never blank out under your hands.

**The wall** — the full wall (`wallPanelHtml()`): the composer, every day's lines newest first, Hide / Show on the crew's, **Show the full week**. Everything in
section 3, *The wall*, applies unchanged.

**Quest week** — the full lever (`questPanelHtml()`): the live run with **End this run today**, or the picker with **Start the week**. Section 3, *Quest week*,
has the rules (ending keeps the XP already earned; never `clear_quests()` from the page).

**Proof pulse** — every Proof athlete, most silent first, seven presence dots each (section 3, *Proof pulse*).

**The board** — `leaderboard_top()`, the server's own scorer, season or week.
These are the exact rows and the exact order the crew sees in their app. It is read once and kept (so a long Proof visit does not re-score the
board on every redraw), and it says **when it was read** (*As of 14:32*) with a **Reload** button; starting or ending a quest week reads it again,
because the XP moved (audit MKT-3, 2026-10-11). When the read fails the page says why (*Couldn't fetch the board: <reason>*) and has **Try again**
(MKT-8).

**Titles minted** (GONE since the cut, stage78, 2026-10-19: titles left the server, the board shows `LV n` with no rank or title). It was the last 30 rows of `hab_titles`, newest first. A quiet
health check: if this stops moving, minting has broken (it did once, silently,
for four days — see stage23).

**Season** — which season is live and how far in. Starting or closing one stays
in the SQL editor deliberately: it resets every score, and that shouldn't be a
button on a dashboard.

**The funnel** (Leads → Free signups; `funnelPanelHtml()`, one self-contained function that returns the whole section) — everyone from `contact_list()`, newest first, with **days
logged** as the qualifying signal. A free athlete past **14 logged days** is
flagged *ready to upgrade?* — they've proven the habit, so the coaching pitch is
earned rather than cold. The headline counts **free** signups; someone who became a coached
client is listed as *coached · converted* (the tier comes from their programme). WhatsApp opens a
chat (one link builder for the whole page: Persian digits and Iranian 09… numbers handled).

**Forget** (free and Proof-only people only; since 2026-10-12 it is **not a button on the funnel row** (a permanent delete one click from WhatsApp and
copy email) but **File → Danger zone → Forget their Proof data…**, offered to the people the funnel would have offered it to: a signup who is not a
coached athlete; **it asks in a panel under the button** (round 3, 2026-10-12): the words of the old confirm, a pointer to **Erase completely…** just
above, and a final button named for the person, *Forget Cara*, beside Cancel; a coached athlete is refused in the bar before any panel opens)
calls `forget_contact()`, which PERMANENTLY deletes their
contact details, their whole progress row (habit log, body weight, records), their board place and
their roll-call lines. Their programme, login, session history, titles and season results stay.
It is not offered for coached clients: on them the progress row is their training app's cloud
copy. (Until 2026-10-10 it was offered for everyone and this manual said their logs were untouched.
`supabase/stage45_forget_contact_guard.sql`, applied 2026-10-11, makes the server refuse a coached athlete too.) It is
not a full erasure: their login still works, so a phone they still use can upload again.

**The Library tab** (`#links`) lists every workout and article, published or hidden, as **compact rows** (round 3 of the UX pass, 2026-10-12; they were
85 px cards with the whole address printed, 64 of them). A small header line gives the count (*64 items · 6 hidden*) and holds **+ Publish workout** and
**+ Publish article** as plain buttons (no primary button on the screen). Each kind is one panel; inside it each **shelf** (category) is a fold with its count, and a row
(about 44 px) is the title, its kind and meta (minutes or equipment, the updated date) in muted text, and on the right **one Copy link** and **Hide** / **Publish**.
An item with one address (a workout) copies it at once; an article opens a small choice beside the button, **App**, **Web FA**, **Web EN**, which copies the same three
addresses as before and folds away by itself a moment later. A hidden item sits in its kind's **Hidden · N** fold with a *hidden* marker. **The first time the Library is
drawn every shelf is open when the whole library is under 12 items, and every shelf is folded otherwise**; the folds you open stay open through a redraw and a visit
to another tab (`_libOpen`, a module variable, so not after a reload of the page). What publishing does is explained in a **How this works** fold at the foot (`<details class="how">`).
**Hide**
takes an item off every athlete's app at once (the file and its web page stay); **Publish** puts it
back. The list is read in pages (audit SERVER-10), so a server with a row cap still shows every item. **Publishing a file asks properly**
(audit TOOLS-6, 2026-10-11): the confirm says per item whether it is *new*, *replaces the live one* or *replaces a hidden one, which STAYS hidden*
(publish it from its row when you want it live); a file whose id is already on **another shelf** is refused, naming the shelf (hide that one first,
then publish again), so an item moved to another category is no longer published twice; a Farsi translation or a workout picked as an article is
refused as before. **Buyers** (the **Course** and the **Testing app**, two sub-tabs) list buyer logins; a failed load says so with *↻ Try again*
instead of "No logins yet", and *Mark sent* asks first (it clears the only stored copy of the password).
The **private note** typed when a login is made lives in `buyer_notes`, which only the coach can read (stage53, Amir
2026-10-11): it used to be the account row's `label`, which the buyer could read through their own account. A trigger
moves any label the Edge Functions still write into `buyer_notes` and leaves the row's label empty, so the Edge
Functions did not change; the lists read the note from `buyer_notes` (applied 2026-10-11) and still fall back to the old
column on a project that has not run stage53. **A buyer row keeps what is done every day in view and the rest behind one button**
(redesign round 1, 2026-10-12): the name, then the stored password or the state (*sent*, *created*, *revoked*), then **Copy message**
(the primary button) and **Mark sent** while a password waits, or **Restore** on a revoked row, and always **Manage**. Manage opens one line
under the row with **Change password**, **Revoke** (not on a revoked row) and **Erase…**. Which row's Manage is open lives in the tab's
state (`st.manage`, one at a time), so it survives a redraw; it is also open while that row's password form or Erase panel is open, so the
button that led there stays in view; a second tap on Manage folds it and closes what it opened (the password form, an Erase panel that has not
started); a finished action (a new password, a revoke, a restore) folds it by itself; and the *Revoked* section opens for a row whose Manage is open.
**The two buyer lists are one block** (`buyerLogins()`, audit MKT-6, 2026-10-11), built twice with their own table, Edge Function, address and
Farsi message; before that they were two copied blocks that had drifted. Since round 2 of the UX pass (2026-10-12) each draws into the container it is given
(`#buyersBody`, which says which list it is for, so a redraw that comes back after a call does nothing when you have gone to the other sub-tab), under the **Course · Testing app**
bar (`renderBuyers()`); each sub-tab's count of active logins is read in the background so both show, and follows a create, a revoke and a restore.
`#buyers` is the Course, `#buyers/testing` the Testing app. A login call runs one at a time on a buyer tab and on an athlete's
File tab (a double tap on *Save password* used to make two passwords and leave the message with the first), and after a create, reset or restore
the page keeps saying what it did (*Login created for …*) instead of "Copied" a moment later. `buyer-logins-course` and `buyer-logins-assess`
drive create, copy, mark sent, Manage, change password, revoke, restore and a failing function through both.


## The parts

- [The Bell: post to the crew, read the last 7 days, remove, who said yes (stage81, 2026-10-19)](01-the-bell-post-to-the-crew-read-the-last-7-days-remov.md)
- [The Monthly Open: set the challenge, confirm results, the board, close it (stage85, 2026-10-19)](02-the-monthly-open-set-the-challenge-confirm-results-t.md)
- [Erasing a person](03-erasing-a-person.md)

---
*One section of the reference. The index is [`COACH_DASHBOARD.md`](../../../../COACH_DASHBOARD.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
