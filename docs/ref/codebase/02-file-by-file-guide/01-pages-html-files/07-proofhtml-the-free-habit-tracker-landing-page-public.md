#### `proof.html` — The free habit-tracker landing page (public)
- **What it does:** The page you send people who are not clients. It explains what Proof is, what they'd track, that they'd be on one board with real coaching athletes, and then asks for three things — **display name, email, WhatsApp** — which arrive in your inbox via Web3Forms, same as the apply form. It ends on a soft coaching CTA rather than a hard sell: the tracker *is* the pitch.
- **It is deliberately not in the nav.** It's the Instagram bio link and the thing you paste in DMs. Adding it to the site menu would put a free product next to the paid one on the front door.
- **Signing someone up is a skill, not a chore:** paste the signup email at Claude and run [`/proof-signup`](../../../../../.claude/skills/proof-signup/SKILL.md) — it picks an id, writes their `public.programs` identity row with `athlete.tier: "free"`, records the contact, and has you create their login in coach.html, which copies the WhatsApp message with their username and password.
- **If deleted:** No one new can sign up for the free tracker; existing free users are unaffected (their logins keep working).
- **Depends on:** `assets/css/*.css`, `assets/js/shared.js`, partials, Web3Forms (external), and — after signup — `supabase/stage16_contacts.sql`.
- **Edit this when:** You want to change the pitch, the habits shown, or which fields you ask for. If you change the fields, change the `/proof-signup` skill and `privacy.html` §2.5 with them.
- **Don't touch:** The Web3Forms `access_key` (breaks submissions). Never add a field that collects anything you would not want sitting in an email inbox.


---
*One section of the reference. The index is [`CODEBASE.md`](../../../../../CODEBASE.md); the rules are in [`docs/rules/`](../../../../../docs/README.md).*
