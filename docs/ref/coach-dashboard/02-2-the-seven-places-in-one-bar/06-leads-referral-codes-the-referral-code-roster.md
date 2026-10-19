### Leads → Referral codes — the referral-code roster

Coaches who refer clients apply through `partner-fa.html` (Farsi only); the application
arrives as a Web3Forms email — search Gmail for `subject:(Affiliate)`, and check Trash
too, one has landed there. **This view is the one list of codes.** `form.html` and
`form-fa.html` ask the database whether a typed code is live (`check_discount()`), so a
code added here works on **both** forms the moment you save it, and a retired one stops
just as fast. Until 2026-09-13 the codes were hand-copied into both form files and the
roster lived in a public markdown file; two accepted coaches' codes never reached either
form.

**The deal** (as `partner-fa.html` puts it to the coach): the client gets the code's % off
(10% on every code so far); the coach earns **10% of what the client actually pays**,
after the discount, on the first payment **and every renewal** while that client stays on
the code. No cap. Payout normally within 7 working days of the client's payment clearing.
It is a referral partnership, not employment — the coach handles their own tax. Either side
can end it with notice; commission on already-active clients is kept. Every applicant is
screened, and code misuse (fake codes, spam, promises that can't be kept) ends it.

**Adding a coach:** accept the application → **+ Add code**. The convention is `NAME10`
(uppercase letters and digits, no spaces); if they asked for something different, say so in
the notes. Fill in their name (English and Farsi), Instagram, WhatsApp, email and — if they
also train with you — their athlete id, which links the card to their file.

- **Retire code** — it stops working on both forms immediately. The row stays under
  *Retired*, so its history and the intakes that used it still add up. **Reactivate**
  brings it back.
- A code **can't be renamed** — it is the key. Retire it and add the new one.
- Each card counts the **applications that used the code** (typed, or approved on the form;
  archived ones left out; a code typed with spaces or Persian digits still matches) and names
  them, each marked new or handled. ⚠ These are applications, not payments: nothing in the
  dashboard knows who became a paying client, so check that before paying commission. (Until
  2026-10-10 this was called the "who do I owe commission" list.)
- **Unattributed** marks a live code with no owner on file: it discounts every sale it
  touches with nobody to pay. Settle who it belongs to, or retire it.

⚠️ **Never put payout or card details in this table.** They stay in the application email.
The table is coach-only, but every **⤓ Backup** file carries the whole of it, and that file
sits on your PC.

**In the code:** `affiliatesViewHtml()` returns the view (`#affView`), `wireAffiliates(root)` wires it, and `renderAffiliates()` is the thin wrapper
that redraws `#affView` in place (Add, Edit, Cancel, and a demo-mode save); it does nothing if the coach has gone to another screen. The `affiliates`
scenario drives it through the old `#affiliates` address, `nav-seven` through `#leads/codes`.

Backend: [`supabase/stage29_affiliates.sql`](../../../../supabase/stage29_affiliates.sql). Coach-only
RLS, and anon has no privileges on the table at all; the forms' only door is
`check_discount()`, which returns the percent for one exact live code — never the list,
never an owner. Probing that with guesses is possible, but strictly less than before, when
every code sat in the forms' page source.

---

---
*One section of the reference. The index is [`COACH_DASHBOARD.md`](../../../../COACH_DASHBOARD.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
