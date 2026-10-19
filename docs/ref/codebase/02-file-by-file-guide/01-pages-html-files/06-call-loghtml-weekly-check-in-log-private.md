#### `call-log.html` — Weekly check-in log (private)
- **What it does:** Your tool for running and recording the **weekly athlete check-in call** — a structured 8-section script with /10 scores, wins, goals and flags. Same Google sign-in as the dashboard. Also builds **copy-and-paste AI prompts** (run in any free AI chat) for a weekly summary and an end-of-cycle report, and per-question **Farsi** prompts for running the check-in over WhatsApp.
- **If deleted:** You lose the check-in tool. Athletes and the dashboard are unaffected; saved logs stay in the database.
- **Depends on:** Supabase (`supabase-js` from a CDN, the `call_logs` / `cycle_reports` tables, plus `programs` / `athlete_progress` / `session_history` as inputs), Google sign-in. Self-contained — no shared partials.
- **Edit this when:** You want to change the check-in questions, the score fields, or the wording of the AI prompts (the `WEEKLY_PROMPT` / `CYCLE_PROMPT` constants in the page).
- **Don't touch:** The Supabase URL/key and the coach-email check. `noindex` on purpose.
- **See also:** `CALL_LOG.md` — the full user manual for this page.


---
*One section of the reference. The index is [`CODEBASE.md`](../../../../../CODEBASE.md); the rules are in [`docs/rules/`](../../../../../docs/README.md).*
