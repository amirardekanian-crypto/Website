# Rules — design work

<!-- Rules for one area. The door is CLAUDE.md; the atlas is MAP.md. One rule per line, wording unchanged. -->

## Design work (Claude is Amir's visual designer)
Carousels, reels, posts, result cards, ads, web and app redesigns. **Start at
`Content/DESIGN-ATLAS.md`** (non-negotiables, current vs retired, the asset shelf, each format's
recipe) with `Content/DESIGN_SYSTEM.md` as the brand bible; build with `/carousel`, `/reel` or `/ad`,
pictures with `/image`, clips with `/video`, his own talking-head footage with `/cut` (start at `.claude/skills/cut/kit/HANDOFF.md`; no captions, he adds them), and read the skill before starting. The full notes that
sat here until 2026-09-26 live in those files and in `IMAGES.md` §0. What must never slip:
- **All new social content is Farsi** (Amir, 2026-09-21): Vazirmatn, RTL, no uppercase or
  letter-spacing, Persian numerals. English only when he asks. Barlow is for app screens and Latin numerals.
- **Clay `#C7552F` is the only accent. No yellow or gold, ever**: not in UI, prompts, props or wardrobe.
- **Never generate a picture or a clip before Amir says yes to a plan with the credit numbers in it**:
  the credits come from a pot shared with his own work. Reuse first (`/image` Step 0). Clips: `sound:
  "off"` (the default is ON), 3 seconds, the cheapest settings, and report the cost after (`/video`).
- **A replacement image ships as `-v2`** (or with `ART_V` raised in the course app), never over the
  same path: the root `sw.js` serves `/assets/` cache-first by URL.
- **Never retro-edit a shipped design**: start a new numbered file.
- **A reel draft is the HTML file** (an MP4 only when he asks); **an ad is one finished MP4**: Amir
  films himself and edits in Instagram, so Claude cuts the whole thing (`/ad`).
- **A polished animated ad with no footage of him is built on the timeline kit** (2026-10-02, reel 9, Mehraneh's website ad, which he called "amazing";
  `.claude/skills/reel/timeline/README.md`, `/reel` Step 2d, `/ad` Route C). **The reading rule** (Amir on its first 17 s cut: *"the changes are too fast, there is no time to be able to read"*):
  a block of text is fully visible for `0.8 s + 0.25 s per word` and not under the ball; `read_audit.js` must say 0 too fast before any render, and a long reel is fixed by
  making it longer, never by speeding up or cutting content (*"do not remove the content, just make it longer"*). A **client's** reel wears the client's brand, not Amir's.
- Handle in new work: **@amirardekanian** · site AMIRARDEKANI.COM.
