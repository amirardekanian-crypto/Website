### The Bell: post to the crew, read the last 7 days, remove, who said yes (stage81, 2026-10-19)

Career Mode round 5, step 5 (Amir: *"Bell: go with your picks"*; the server side is `supabase/stage81_career_crew.sql`). The athlete app's Crew tab has a feed, the
Bell: athletes post a short message and a photo, moments ring as lines (a level, a held week, the four marks, an achievement, a best, a cycle, the honours, the
Monthly Open, joining), and likes are the only reply. This is where you post to it and moderate it. **Nothing here pays XP** (GAME-6).

- **Where.** Two panels on Proof, under the wall: **The Bell** (`#bellPanel`) and **Who said yes** (`#bellPeople`). `loadBell()` reads `coach_crew()` after the
  first paint, like Courtside, on ↻ Refresh, on the panel's own **↻ Reload** (the head says *As of 14:05*) and when Proof is opened a minute or more after the last read
  (a post can be minutes old). **While the server has no `coach_crew()` (stage81 not applied) nothing is drawn and no warning is shown** (`bellMissing()`:
  `PGRST202`, a 404, or a message that names `coach_crew` as not found); any other failure shows the panel with the reason and **Try again**, and the load
  banner names *the Bell*. **Who said yes** then says the answers did not load instead of listing everyone as *Not asked yet*.
- **Your post** (the wall's composer look). A box of 280 characters with a live counter, **Add a photo**, **Post**. One hint line: *Pinned at the top of Crew for
  a day. Gone after 7 days.* **The photo is made smaller on this computer before it leaves** (`bellShrink()`): at most 1280 px on the long side, JPEG at 75 %, then 60 %,
  50 %, then the same at 1024 px, until it is at most 400 KB (the server allows 450 KB), or it is refused (*still over 400 KB*). The re-encode takes the camera's
  location data off, a transparent picture goes on white, and the camera's rotation is applied (`createImageBitmap` with `imageOrientation: 'from-image'`, else an `<img>`).
  It is sent as plain base64 with its width and height (`coach_crew_post(p_body, p_photo, p_w, p_h)`). A preview with a **×** shows it first. A photo with no words is a post.
  What you typed stays through a redraw of Proof (`_bellDraft`) and after a refusal. On success the box clears and a line says *Posted to the crew.*
  The server's refusals come back as `crew:too_long`, `crew:empty`, `crew:photo_big`, `crew:photo_bad` and are said in plain words; **no database code** (the answer never
  arrived) says so and reads the list again, because the post may have gone up.
- **The last 7 days**, newest first. Each post: who (yours is *You (Amir)*; an athlete is the name the crew sees, with the dashboard's name beside it), a *Session* chip
  for a finished session told to the crew, when (*3h*, *Yesterday*, *Mon*), the words, the likes count, and **Show photo** when it has one. A photo is asked for
  only when you tap it (`crew_photo(p_post)`), drawn inline at most 240 px tall, with **Hide photo**; a photo the server no longer has (its post just went) is said and the
  list is read again. *not shown: their answer is no* marks a post whose author the crew can no longer see (the post is dimmed; Remove is still there).
  **Remove** asks in a panel under the post (*Remove this post? It goes from every phone and the server now.*), then `coach_crew_remove(p_post)` and a re-read. There is no undo.
  Empty: *Nothing posted this week.*
- **Who said yes** (`bellPeopleHtml()`). Every coached athlete the page knows (not the demo, not your own identity, not a former athlete; free and Proof-only people have
  no Crew tab), Yes first, then *Not asked yet*, then No. Each row: the name (a link to their file), their answer, the kinds they turned off (*bests, levels off*) and an
  **Under 13** box. The head counts them (*2 yes · 1 no · 4 not asked yet*). **Under 13 is GAME-9**: they read the Bell but never post, never ring and are never named.
  **Ticking it ON asks first** (a panel under the row: their posts and photos, the likes they gave and any level moment waiting to ring go now; their answer, their
  login and the right to read stay) and the box stays unticked until you say yes; ticking it OFF needs no confirm. Both call `coach_crew_under13(p_athlete, p_on)`;
  an athlete nobody has asked can be ticked (the server makes the row; the answer stays *Not asked yet*).
- **Short-lived on purpose.** Posts, photos and likes live 7 days; the server sweeps them (`crew_sweep()`, on every read and post, and hourly where pg_cron exists). The four short-lived tables are
  **not in `BACKUP_TABLES`**, so a weekly backup kept twelve weeks never breaks the 7-day promise in `privacy.html`; only `crew_consent` (the answers and the under-13 tick) is a
  table the backup keeps, and it joins `BACKUP_TABLES` in the stage81 go-live commit, with the schema snapshot.
- **What rings, and what never does**, is in the panel's **How this works** fold (the list is `stage81_career_crew.sql`'s header). **Tests:** `bell-panel`,
  `bell-compose`, `bell-who-said-yes` and `bell-missing` in `scripts/headless/coach/run.js` (the stub answers the five stage81 functions only when the seed says
  `crew: true`; every other scenario runs against a server without them).

---
*One section of the reference. The index is [`COACH_DASHBOARD.md`](../../../../COACH_DASHBOARD.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
