## Stage 83: the Bell's feed only when it has changed (2026-10-19)

**APPLIED to the live project on 2026-10-19** (Amir: *"yes, apply stage83"*), as the migration `stage83_crew_if_new`. Read back: anon cannot
run it and a signed-in athlete can, the body is md5-equal to the file, and on the live feed it answered **2,318 bytes the first time and 100
bytes the second**, with a wrong hash still sending the feed.

Amir, 2026-10-19: *"irans internet is very slow, and cant download everything everytime they open the app. can we do this in a way that the
images and messages arent downloaded again? and then new images arent downloaded unless some one opens the crew?"*.
⚠️ **The Monthly Open moves to stage85.**

Three things answer him, and only the first is a stage:
1. **`supabase/stage83_crew_if_new.sql`**: `get_bell_if_new(p_athlete_id, p_etag)` **calls** `get_bell()` (so there is one copy of the rules),
   drops `at` (the clock, which would change every time), hashes what is left and answers **`{"same": true}`** when the hash matches the
   phone's. It is an ETag over the whole payload, so it is exact: a post Amir removed, a like taken back or a line that aged out all change
   the hash. `get_bell()` itself is untouched, which keeps stage82's way back matching it word for word.
2. **The app asks for nothing at an app open** (`PROGRAM-APP.md` → *Crew and the Bell*): `crewFirstLook()` asks once in a phone's life while
   it has no copy; after that the tab, the dot and *Tell the crew* come from `<id>_crewcache`, and only opening Crew asks, at most every ten
   minutes.
3. **A photo is downloaded once, ever**, into Cache Storage (`crew-photos-v1`, deliberately not an `aap-*` name, which `sw.js`'s activate
   would delete), swept after each fresh feed to whatever the feed still names. The phone also makes a photo smaller than it did:
   **1080 px, under 200 KB** — the ones already posted were landing at **312 kB** while `privacy.html` and the posting sheet both promised
   about 200 KB.

**What it cost before, measured on the live project:** the feed was 2,274 bytes for six items and was fetched 1.5 s after EVERY app open,
whether or not the athlete went to Crew; a photo averaged 312 kB stored, 415 kB on the wire as base64, and was downloaded again after every
app restart because it was only held in memory.

**Rehearsed** in `scripts/career/rehearse_crew.mjs` section 15 (the file is **309 of 309**): the stage twice, the grants, the feed with no
hash, `same` with it, the clock not moving the hash, a new post, a reaction and a REMOVED post each moving it, the answer equal to
`get_bell()`'s own, the same refusals, the coach's read, and the way back followed by the stage again. The app's side is
`scripts/headless/crew.js` (74 checks).

**The way back**: `scripts/career/rollback_stage83.sql` — the app falls back to `get_bell()` by itself, so nothing else has to change.

---
*One section of the reference. The index is [`career/PROCEDURES.md`](../../../career/PROCEDURES.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
