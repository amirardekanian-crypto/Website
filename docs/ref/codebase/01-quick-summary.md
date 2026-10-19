## Quick Summary

This is a small, hand-built website. It has:

- Public pages anyone can visit: **home**, **apply form**, **privacy**, **terms**
- Private pages reached only by a direct link: the **athlete programme** and the **coach dashboard**
- A shared "look and feel" system so every page matches
- A tiny bit of JavaScript that adds the menu, footer, video pop-ups, and the "install app" prompt
- A **Supabase** database (added after this site first launched) that backs up athlete progress to the cloud and powers the coach dashboard (it also carried two-way messaging until 2026-09-26, when that moved to WhatsApp)
- Exercise videos live on the Spine entries (edited in coach.html → Exercises); the old Notion sync was retired 2026-09-26
- Some support files for Google, hosting, and icons

No build step. When you edit a page, it's live the moment it's pushed to GitHub. The only "backend" is Supabase — a hosted database the pages talk to directly; there is no server of your own to run.

---

---
*One section of the reference. The index is [`CODEBASE.md`](../../../CODEBASE.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
