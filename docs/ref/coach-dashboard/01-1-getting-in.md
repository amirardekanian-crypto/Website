## 1. Getting in

Open `coach.html` and **Sign in with Google** as `amirardekanian@gmail.com`.
Any other account is rejected. The page isn't indexed and has no nav link.

> The Google check is the convenience gate; the real security is Row Level
> Security in the database — every coach-only table policy and every coach RPC
> asks `public.is_coach()`, which compares `auth.jwt() ->> 'email'` with your address.
> Reaching the page without the account gets you nothing. Since stage57 (2026-10-11)
> the address is typed in exactly two places in the database, `is_coach()` and
> `coach_erase_person()`'s check that the login being erased is not yours, plus
> `COACH_EMAIL` in this page and once in each of the three login Edge Functions.
> A new policy or function calls `is_coach()`; it never types the address.
> Public sign-up is meant to be off (Supabase → Authentication → Sign In / Providers →
> User Signups): the check trusts the email in the sign-in alone, so nobody else should be
> able to register one. Read the setting back any time: `curl -s
> https://bvipfipbdcyqnbczjmaq.supabase.co/auth/v1/settings -H "apikey: <the publishable key>"`
> and look for `"disable_signup": true`.

**Preview without signing in:** `coach.html?demo=1` renders the whole layout
against synthetic data. Nothing is fetched and every write is a no-op, so it's
safe to open anywhere — handy for screenshots or design work.

---

---
*One section of the reference. The index is [`COACH_DASHBOARD.md`](../../../COACH_DASHBOARD.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
