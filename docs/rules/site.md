# Rules — the public site, the Farsi products and the chatbot

<!-- Rules for one area. The door is CLAUDE.md; the atlas is MAP.md. One rule per line, wording unchanged. -->

## Site layout (GitHub Pages → amirardekani.com)
- **English is the default**: `/` = `index.html`. **Farsi** = `/index-fa.html`. `index-en.html` is a
  permanent redirect to `/`. Language toggles + `hreflang`/canonical are set accordingly.
- **Mehraneh Zohourian's coach site is NOT in this repo or folder** (2026-10-02): it is a separate project, repo
  `amirardekanian-crypto/mehraneh-site`, local folder `GitHub/mehraneh-site` (a sibling of `Website`), live at
  `mehranehzohourian.com`. Its own `MAP.md` and `CLAUDE.md` are there. Nothing of hers lives here any more; the old
  `/coach-site/` address no longer exists.
- Shared **nav/footer** are injected by `assets/js/shared.js` from `partials/nav.html` + `partials/footer.html`.
  CSS lives in `assets/css/` (`tokens.css` → `base.css` → `components.css`); page-specific styles are inline.
- Green hero + green nav are **homepage-only**, scoped via `body.is-home`. The nav logo mark is global.
- **`sw.js` (scope `/`) sits in front of the WHOLE origin, not just program.html** (since v7, 2026-09-13;
  the cache is `aap-v158` on 2026-10-13). It must keep leaving `/reach/` (the Iran reachability probe),
  `/tennis/` (the paid course, whose app at `/tennis/app/` ships its own worker and `tps-shell-*`
  caches) and `/tennis-testing/` untouched. Otherwise the probe reports a cached pass
  and the course gets stale files pinned. Its `activate` deletes **only `aap-*` caches**: Cache
  Storage is shared by the origin, and the old `k !== CACHE` filter would have wiped any other
  app's offline copy on every bump.
- **The Farsi products are in `FARSI-PRODUCTS.md`** (moved 2026-09-26): the paid course app
  `/tennis/app/`, its product page `/tennis/`, the testing app's page `/tennis-testing/`, and where they
  are introduced on the Farsi site. What must never break:
  - **This repo is the permanent home of the course app** (Amir, 2026-10-02): edit `tennis/app/` here, and after any
    edit run `python scripts/stamp_tps_app.py` (pre-commit blocks a stale stamp; the app's worker answers from its cache
    first). The private `tps-content` repo is retired: it is unreachable and out of date, so **never deploy or publish
    from it**; its deploy script would erase the demo and its lesson scripts would overwrite the corrected lessons.
    The lessons live ONLY in Supabase (`tps_content`, `course_en`: edit with SQL and re-hash `version`;
    `Content/CONTENT-PARITY.md` → *How to publish each surface*), readable only by an active buyer. The testing app is the same
    (Amir, 2026-10-02): `tennis-testing/app/` is edited here, its content lives only in `assess_content`, and the private
    `assess-content` repo is retired. **Both publish secrets were revoked on 2026-10-02**
    (`supabase/tps_03_revoke_publish_keys.sql`): `tps_publish()` and `assess_publish()` can no longer be called by anyone
    without the service role, so content changes are SQL through the Supabase MCP.
  - The demo's lock is server-side (`tps_demo()`): never "lock" anything in `app.js` alone.
  - **The course's exercises are fed from the Spine** (stage65, 2026-10-12; Amir: "fed from spine", one live source). Each course exercise in `tps_content` names its entry (`spine`); the entry's `steps_fa`, `cues_fa`, `purpose_fa` and `tennis_fa`, and its video, reach the course live through `get_exercises_fa()` (kept on the phone as `tps.spinefa` for offline) and replace the course's own copies; the Spine's one fault replaces the old list of common mistakes (CUE-7). **A change to an entry's English steps, cues, purpose or On court line changes its Farsi in the same run.** The course's own `easier`, `harder`, `equipment`, `noEquipment` and `u16` stay in the course. A new course exercise needs a Spine entry with its Farsi before it ships.
  - The course app's tour finds real controls by CSS selector: move a control or rename a class and it
    lies, silently, on a new buyer's first screen.
  - A new lesson or test needs its cover in `ART` by id, and a regraded picture needs `ART_V` raised.
  - The product pages share `assets/css/fa-product.css` (bump its `?v=` after any change) and
    `assets/js/fa-nav.js`. The English site deliberately does not mention the Farsi products.
- **Videos play from `www.youtube.com/embed` in BOTH apps, never `youtube-nocookie.com`** (2026-09-23; Iranian
  athletes could not watch the course videos). The nocookie player hits YouTube's sign-in wall in Iran, and many VPN apps
  there route only the `youtube.com` names. Both apps read watch, `youtu.be`, `shorts/`, `embed/` and `live/` links, give a
  Shorts link a tall 9:16 box, and play every video inside the app.
  **Every player also has an "Open in YouTube" bar under it** (Amir, 2026-10-05: *"C and red"*, after athletes in Iran said
  the embed would not play in the app while their YouTube app or browser did): a plain `https://www.youtube.com/watch?v=`
  link (a Short keeps `/shorts/`), `target="_blank"`, so the phone picks the YouTube app or the browser. In the course app it
  reads «باز کردن در یوتیوب». It is drawn only for a YouTube address, and it sits OUTSIDE the box the iframe fills (`.ex-vunit`
  + `.ex-yt`, `.vunit` + `.vyt`, `.video-modal-yt`): the iframe covers anything inside that box the moment the embed loads,
  which is exactly when it fails. The mark is YouTube's own red so it never reads as the green ▶. There is **no mark on the
  circuit rows** (beside the ▶ it pushed a superset's row 6 to 36 px past its card at 360 to 390 px); a warm-up item's pop-up
  carries the bar instead, and a working circuit's item plays in its own How to do it line (Centre Court round 2), the card's player with the bar under it. The earlier "open in the YouTube app" link (2026-09-23) was tried and removed the same day; this one
  is Amir's later call. `privacy.html` §2.7 stays true (nothing leaves until the athlete taps). Guards: `scripts/headless/youtube.js`
  (program.html, shared.js) and `youtube-course.js` (the course app).
  The three parsers must agree: `ytId()` in `tennis/app/app.js`, `ytVideoId()` in `program.html`, the modal in
  `assets/js/shared.js`. (Since 2026-09-26 the site modal in `shared.js` matches: the same link shapes, a tall
  9:16 box for a Short, and only a YouTube address embeds; any other link opens as a link.) The watch address is built from the same
  id in each: `ytWatchUrl()`, `ytWatch()` and the modal's `open()`: change all three. The course app's copy: `FARSI-PRODUCTS.md`.
- **The website chatbot** (2026-10-17; Amir: both sites, WhatsApp + Apply handoff, chats kept 90 days, Haiku): the bubble is `assets/js/site-chat.js` (`data-site="en"` on `index.html`, `"fa"` on `index-fa.html`, `/tennis/`, `/tennis-testing/`; bump its `?v=` on every page after a change), the brain is the Edge Function `site-chat`, and **what it knows is ONLY `Content/CHATBOT-FACTS.md`** (sections `[both]`, `[en]`, `[fa]`; the Iran products are `[both]` since Amir's 2026-10-17 call, *"some iranians may ask things in english"*, but the English bot raises them only when asked or when the visitor says they live in Iran). A price, tier or product fact that changes on a page changes in that file the same day, then `python scripts/build_chat_facts.py` and a redeploy of `site-chat` (pre-commit guard 21 checks the first two agree). How it behaves (no diagnosis, no programmes, no invented price, the handoff tags) is `RULES` in its `index.ts`. Chats are anonymous (`visitor` is a daily-rotating hash, no IP) and deleted after 90 days; Amir reads them in coach.html → Leads → Chats, where questions the facts could not answer are listed first under **Not answered yet** (stage68, the bot's `[[gap]]` tag). **Teaching it anything new is `/chat-facts`** (`.claude/skills/chat-facts/SKILL.md`: the gaps query, where a fact goes, rebuild, redeploy both files, test with `scripts/chat_ask.py`, delete the `/test` chats, mark handled). Privacy: `privacy.html#chat` (2.11) and `privacy-fa.html#chat`.
- **Edge Function source is in `supabase/functions/`** (since 2026-09-13; before that it existed
  only as deployments). Edit there, deploy with the Supabase MCP, never in the dashboard. See its README.
- The Farsi site is the **aesthetic reference Amir likes**: green radial-gradient hero, white text +
  clay (`--accent-2` #C7552F) accent, logo mark (white rounded square w/ `assets/img/icon-192.png`),
  and gentle section banding (`#FAF7F2` ↔ `#F1ECE3`).


- `Content/SITE-AUDIT.md` — the **website** audit (2026-10-02): 25 numbered packages (fix now / his call /
  foundations), the baseline scoreboard, the open questions and how to continue. **Read it before changing any
  public page's design or copy.** It is generated from `scripts/site_audit/backlog.py` (edit that, then run
  `python scripts/site_audit/build_report.py`); the measuring tools, `shot.js` for checking a defect in a real
  viewport and the lessons are in `scripts/site_audit/README.md`; the seven page reviews are in `Content/site-audit/`.
  **Public pages have a style guard** (2026-10-02): `scripts/check_site_style.py` (pre-commit guard 13) stops a commit that adds
  yellow, text under 12 px, a pale grey, letter-spaced Farsi, a Google font link or white text on the plain clay; it is a ratchet on
  `scripts/site_style_baseline.json` and `/* style-ok */` marks an exception. **`coach.html` is under it too since 2026-10-11** (no text under 12 px; its two coloured warning signs and its Google Fonts link are the baseline). The English fonts are our own files (`assets/css/fonts.css`,
  made by `scripts/site_audit/fetch_fonts.py`); the fill under white text is `--accent-2-fill` / `--clay-fill` (#C2512C), never #C7552F.
