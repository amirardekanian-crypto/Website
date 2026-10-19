#### `form.html` — Application form
- **What it does:** The intake questionnaire new athletes fill in. Eight sections (00 Your Programme to 07 Equipment), a progress bar, and a success screen. On submit it writes **straight to Supabase** (the `submit_intake` RPC → the `hab_intake` table, read in `coach.html` → Intake) **and** fires Web3Forms for the email — in parallel, counting as sent if *either* succeeds, so a Web3Forms outage no longer loses the submission. `form-fa.html` is the Farsi twin and does the same. Backend: [`supabase/stage27_intake.sql`](../../../../../supabase/stage27_intake.sql).
- **If deleted:** No one can apply. Every "Apply Now" button on the site breaks.
- **Depends on:** `assets/css/*.css`, `assets/js/shared.js`, `partials/nav.html`, `partials/footer.html`, **Supabase** (`submit_intake` RPC, via a plain `fetch` — no library), and Web3Forms (external, for the email).
- **Edit this when:** Adding, removing, or rewording form questions. Changing which options appear in dropdowns.
- **Don't touch:** The Web3Forms `access_key` value (breaks submissions). The `<script>` at the bottom that runs the progress bar, unless you're ready to test it carefully.


---
*One section of the reference. The index is [`CODEBASE.md`](../../../../../CODEBASE.md); the rules are in [`docs/rules/`](../../../../../docs/README.md).*
