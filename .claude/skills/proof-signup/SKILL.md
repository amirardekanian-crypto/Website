---
name: proof-signup
description: Set up a free Proof (habit tracker) user from a signup form email. Use when Amir pastes a name/email/WhatsApp from a "PROOF signup" Web3Forms email, or says "add this person to the habit app", "sign them up for Proof", "give them a habit tracker link". Does the whole job — id, key, contact record, data file, commit, push — and hands back the WhatsApp message to send.
---

# Sign someone up to Proof

Amir pastes a signup (usually straight out of the **PROOF signup — habit tracker**
Web3Forms email). You turn it into a working private link and hand him a message
to paste into WhatsApp. Target: under two minutes, no questions asked unless
something is genuinely ambiguous.

The form at [`proof.html`](../../proof.html) collects exactly three things:
**display name · email · WhatsApp**.

---

## The steps

### 1. Pick an athlete id

Lowercase, underscores, no spaces. From their real or display name:
`Sara Karimi` → `sara_karimi`. If it collides with an existing id, add a digit
(`sara_karimi2`). **Check first** — ids are permanent and a collision would hand
one person another person's data:

```sql
select athlete_id from public.athlete_keys where athlete_id like 'sara%';
```

### 2. Mint the key and record the contact

One call does the key and the contact row:

```sql
select * from public.add_contact(
  'sara_karimi',        -- athlete id
  'Sara K.',            -- the display name from the form
  'sara@example.com',   -- email
  '+98 912 000 0000'    -- WhatsApp
);
```

It returns `aid` and `akey`. **Keep the key** — it goes in the link.

Re-running it is safe: an existing key is reused, never rotated, so a link
someone already has keeps working.

> **It does not put them on the leaderboard, and it must not.** They join
> themselves, from Crew, whenever they feel like it — that is what
> `privacy.html` promises and it is the honest reading of a form field. It also
> keeps the board free of names sitting at zero because someone signed up and
> never opened the link.

### 3. Write their data file

Free users have no programme, so the file is only an identity. Create
`data/<athlete_id>.json`:

```json
{
  "athlete": {
    "id": "sara_karimi",
    "firstName": "Sara",
    "boardName": "Sara K.",
    "tier": "free"
  }
}
```

**`tier: "free"` matters.** It is what makes the app show *"Get a programme"*
instead of a link to a programme that does not exist, and what changes the
locked WORKOUT row to say it belongs to coached athletes.

**`boardName` is the name they typed on the form.** Nothing joins them with it —
it just pre-fills the join box in Crew, so saying yes to the board is one tap
instead of a decision about what to call themselves. Leave it out and the app
falls back to first name + last initial.

> ⚠️ **Never put the email or the WhatsApp number in this file.** `data/*.json`
> is a static file served by GitHub Pages — anyone who guesses an id can fetch
> it. Contact details belong in `hab_contacts`, which is behind RLS. The public
> file gets the name they chose and nothing else.

### 4. Ship it

```
git checkout -B claude/<branch> origin/main
git add data/<athlete_id>.json
git commit -m "Proof: add <name> to the habit tracker"
git push -u origin claude/<branch>
```

Then PR → merge → confirm the Pages deploy. The link is dead until the file is
live on `main`, so **do not send it before the deploy is green.**

### 5. Hand Amir the message

Give him this, ready to paste, with the real link filled in:

> Hey <first name> — here's your Proof link:
> https://www.amirardekani.com/habits.html?client=<id>&key=<key>
>
> Open it once on your phone and it stays there. Pick what you want to track and
> tick things off daily — after the first one it'll offer to sit on your home
> screen as **AA Proof**. Say yes; it opens in one tap and works
> with no signal.
>
> When you want to be on the board with everyone else, it's the CREW tab —
> your name's already in there as <display name>.
>
> Shout if anything looks wrong.

Tell him plainly: **the link is the password.** Anyone holding it is that
athlete. It should go to one person, in a private message.

---

## Checking on them later

Who has signed up and how much they have actually logged — the qualifying
signal, and far better than an email address:

```sql
select * from public.contact_list();
```

`days_logged` is the number to look at. Someone twenty days in with a long run
on sleep is a warm lead who has already shown you their adherence. Someone at
zero after three weeks never started, and a nudge is wasted on them.

`on_board` says whether they took the board up. Someone logging steadily but
still off it is worth one message — the board is the thing that keeps people
coming back, and they may simply not have found the CREW tab.

## If they ask to be deleted

```sql
select public.forget_contact('sara_karimi');
```

That clears their key, contact, progress, board entry and roll-call lines. Then
delete `data/<athlete_id>.json` in a follow-up commit — the SQL cannot reach the
repo.

---

## Turning a free user into a coached athlete

They stay the same athlete — same id, same key, same history, same link. Run
`/athlete-intake` and the rest of the coaching pipeline as normal, then:

1. `data/<id>.json` gains the real programme (the pipeline writes it)
2. Change `"tier": "free"` to `"tier": "coached"` — or drop the field, since
   anything that is not `"free"` is treated as coached
3. `select * from public.add_contact('<id>', null, null, null, 'coaching', 'coached');`
   to update the tier on their contact row (it will not touch their key, their
   name or their board entry)

Their XP, levels, runs and board position all survive, because none of it was
ever tied to having a programme. The only thing that changes is that WORKOUT
stops being locked.
