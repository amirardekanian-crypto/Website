### Exercise videos (the Spine)

Since 2026-09-26 an exercise's video is its **Spine entry's `video`** (`public.exercises`), added or
changed in **coach.html → Exercises** → the entry → *Video*. `program.html`'s `getVideoUrl()` plays a
card's own `videoUrl` first, else its entry's (found by `exId`, then by name), and `coach.html` does
the same. `exercise_library.json`, `sync_notion.py` and `NOTION_SYNC.md` (the Notion-synced
name → video list) were retired that day: every video they held was already on an entry, apart from
two copied across and twelve kept as `videoUrl` on the library sessions that used them. The 28 left
over, under names no entry carries, are in `.claude/skills/spine/legacy_videos.json`, so a new draft
of one still picks its video up. `.notion_token` is no longer needed.

---

---
*One section of the reference. The index is [`CODEBASE.md`](../../../../CODEBASE.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
