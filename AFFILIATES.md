# Affiliate Coaches — Roster & Code Registry

The source of truth for **who has a referral code and what it is**. Pairs with
`partner-fa.html` (the public sign-up page that explains the deal and collects
applications). Every value below is the real one from the code or the
application email.

> **This repo is public** (`github.com/amirardekanian-crypto/Website`).
> WhatsApp numbers, card numbers and payout details **stay out of this file** —
> they live only in the Web3Forms application email in Gmail. Search
> `subject:(Affiliate)` to pull one up.

---

## 1. The deal

From `partner-fa.html`, in Amir's own words to the coach:

| | |
|---|---|
| **Client gets** | 10% off the programme |
| **Coach gets** | 10% commission on what the client *actually pays* (after their discount) |
| **Renewals** | 10% again, every renewal, for as long as that client stays active on that code |
| **Cap** | None — no limit on referrals |
| **Payout** | Normally within 7 working days of the client's payment clearing |
| **Relationship** | Referral partnership, not employment. Coach handles their own tax. |
| **Ending it** | Either side, with notice. Commission on already-active clients is preserved. |

Amir screens every applicant and can decline. Code misuse (fake codes, spam,
baseless promises) ends the partnership.

---

## 2. Live codes

All grant **10% off**. Matched case-insensitively, so `nik10` works as well as
`NIK10`.

| Code | Coach | Instagram | Applied | Notes |
|---|---|---|---|---|
| `SIALASH10` | سیاوش شیردل — Siavash Shirdel | `Sia.__vash` | 6 Jul 2026 | Requested this exact code. Tennis coach, ~9–10 athletes. |
| `MHRN10` | مهرانه ظهوریان — Mehraneh Zohourian | `@mehraneh_zhr` | 6 Jul 2026 | Left the code field blank; Amir generated it. New coach — 1 tennis, 1 padel athlete. |
| `NAVAZI10` | **Unattributed — see §4** | — | — | Live on the site with no application on file. |
| `NIK10` | علیرضا نیکخواه — Alireza Nikkhah | `Alireza.nikkhaah` | 7 Sep 2026 | Asked for `Alireza66`; issued as `NIK10` to match the `NAME10` convention. |

All three named coaches are **also Amir's own athletes** — they have coaching
logs at `.claude/coaching-log/siavash_shirdel.md`, `mhrn_zhr2.md` and
`alireza_nikkhah.md`. They refer on top of training with him.

---

## 3. Adding, changing, or removing a code

Codes live in **two files and are not shared** — a code added to one form does
nothing on the other. Always edit both:

| File | Look for | Format |
|---|---|---|
| `form.html` (EN) | `const DISCOUNT_CODES = {` (~line 1167) | `'NIK10':     10,` — trailing comma on every line |
| `form-fa.html` (FA) | `var DISCOUNT_CODES={` (~line 517) | `'NIK10':10` — **no comma on the last line** |

Keys must be **UPPERCASE**; the form uppercases whatever the client types before
matching. The number is the percent off.

Then add a row to §2 above so this file doesn't drift from the code.

**What the client sees:** typing a good code shows `✓ Code approved — 10% off`
(FA: `✓ کد تایید شد — ۱۰٪ تخفیف`) live as they type; a bad one shows
`Code not recognised — check the spelling` only after they leave the field. The
applied code is submitted in a hidden `Discount Applied` field as
`NIK10 (10% off)`, so it lands in the intake email and you know who to pay.

---

## 4. Open question — `NAVAZI10`

`NAVAZI10` is **live on both forms but has no owner on file**: no application
email, no payout method, no contact details. The only trace of the name anywhere
is the placeholder text on the sign-up form itself —
`placeholder="مثلاً مهران نوازی"` at `partner-fa.html:233`.

So either it was agreed directly with Mehran Navazi over DM/WhatsApp and never
went through the form, or it was seeded from the placeholder and belongs to
nobody. Until that's settled, it discounts every sale it touches with no way to
route the commission.

**Decision needed:** confirm the arrangement and fill in the row in §2, or
delete the code from both forms.
