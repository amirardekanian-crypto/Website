---
name: proof-signup
description: Set up a free Proof (habit tracker) user from a signup form email. Use when Amir pastes a name/email/WhatsApp from a "PROOF signup" Web3Forms email, or says "add this person to the habit app", "sign them up for Proof", "give them a habit tracker link". Does the whole job — id, roster row, contact record — and hands back the WhatsApp message to send.
---

# Sign someone up to AA Proof

Amir pastes a signup (usually straight out of the **PROOF signup — habit tracker**
Web3Forms email). You turn it into a working account and hand him a message to
paste into WhatsApp. Target: under two minutes, no questions asked unless
something is genuinely ambiguous.

The form at [`proof.html`](../../proof.html) collects exactly three things:
**display name · email · WhatsApp**.

> ⚠️ **There are no secret links any more** (retired 2026-09-07). `public.athlete_keys`
> is empty, `get_program()` fails closed on the key path, and a
> `habits.html?client=…&key=…` URL is refused whatever key it carries. Free athletes
> sign in with a **username and password**, exactly like coached ones. See `CLAUDE.md`
> → *THE BIG ONE*.

> ⚠️ **Two RPCs you cannot call from here.** `add_contact()`, `contact_list()` and
> `forget_contact()` are all guarded by `is_coach()`, which reads the caller's JWT
> email. A plain SQL connection has no coach JWT, so every one of them raises
> `coach only`. They work from coach.html, where Amir is signed in — not from a
> pipeline run. Use the direct statements below instead. (`add_contact()` is doubly
> wrong now: it still mints a dead `athlete_keys` row as a side effect.)

---

## The steps

### 1. Pick an athlete id

Lowercase, underscores, no spaces. From their real or display name:
`Sara Karimi` → `sara_karimi`. If it collides with an existing id, add a digit
(`sara_karimi2`). **Check first** — ids are permanent and a collision would hand
one person another person's data:

```sql
select athlete_id from public.programs      where athlete_id like 'sara%'
union
select athlete_id from public.hab_contacts  where athlete_id like 'sara%';
```

`programs` is the roster now, so it is the list that matters; `hab_contacts` is
checked too in case a signup was recorded but the roster row never landed.

### 2. Create their two rows

**The identity row** — `public.programs`. Free users have no programme, so this is
only an identity, but it is what puts them on the roster and what the app reads to
know they are free:

```sql
insert into public.programs (athlete_id, data, updated_by) values (
  'sara_karimi',
  jsonb_build_object('athlete', jsonb_build_object(
    'id',        'sara_karimi',
    'firstName', 'Sara',
    'boardName', 'Sara K.',
    'tier',      'free')),
  'proof-signup')
on conflict (athlete_id) do nothing;
```

**`tier: "free"` matters, and it belongs inside `athlete`.** That is the field
`isFree()` reads in `habits.html`. It is what makes the app show *"Get a programme"*
instead of a link to a programme that does not exist, and what changes the locked
WORKOUT row to say it belongs to coached athletes.

**`boardName` is the name they typed on the form.** Nothing joins them with it — it
just pre-fills the join box in Crew, so saying yes to the board is one tap instead of
a decision about what to call themselves. Leave it out and the app falls back to
first name + last initial.

**The contact row** — `public.hab_contacts`, coach-only behind RLS:

```sql
insert into public.hab_contacts
  (athlete_id, display_name, email, whatsapp, source, tier)
values ('sara_karimi', 'Sara K.', 'sara@example.com', '+98 912 000 0000',
        'proof.html', 'free')
on conflict (athlete_id) do nothing;
```

> ⚠️ **Never put the email or the WhatsApp number in the programme record.** Contact
> details belong in `hab_contacts` and nowhere else. The programme row gets the name
> they chose and nothing else.

> **None of this puts them on the leaderboard, and it must not.** They join
> themselves, from Crew, whenever they feel like it — that is what `privacy.html`
> promises and it is the honest reading of a form field. It also keeps the board free
> of names sitting at zero because someone signed up and never opened the app.

### 3. Amir creates the login

**This part is his click, not a SQL statement** — creating an auth user needs the
service-role key, which deliberately exists nowhere a browser can read it.

**coach.html → Athletes → the athlete → Create login.** That calls the
`athlete-login` Edge Function, which creates the account on the internal address
`athlete.<id>@amirardekani.com` (it never receives mail) and writes
`public.athlete_identities`.

Without this step they have **no way in at all** — there is no link to fall back on.
Don't hand over a signup as "done" until the login exists.

### 4. Hand Amir the message

coach.html writes it for him: the password lands under **Logins to send** on the
Athletes tab, and **Copy message** puts the whole WhatsApp text on his clipboard.
For a free athlete that message points at **`habits.html`** (Proof is their whole
app), not `program.html` — `loginMessage()` picks the door off their tier, so this
only works if step 2 set `tier: "free"` correctly.

If you are drafting it by hand instead, it is:

> Hey <first name> — here's your habit tracker:
> https://www.amirardekani.com/habits.html
> Username: <id>
> Password: <password>
>
> Save it when your phone offers to. Open it once and it stays there — pick what you
> want to track and tick things off daily. After the first one it'll offer to sit on
> your home screen as **AA Proof**. Say yes; it opens in one tap and works with no
> signal.
>
> When you want to be on the board with everyone else, it's the CREW tab — your
> name's already in there as <display name>.
>
> Shout if anything looks wrong.

Tell him to **mark it sent** once it has gone out. That clears the stored password;
after that the only way to see one again is a reset.

---

## Checking on them later

Who has signed up and how much they have actually logged — the qualifying signal, and
far better than an email address. From **coach.html → Contacts** (which calls
`contact_list()` as the signed-in coach), or in SQL:

```sql
select c.athlete_id, c.display_name, c.tier, c.created_at,
       (o.athlete_id is not null) as on_board,
       coalesce((select count(*) from jsonb_each(public.hab_log_of(ap.data, c.athlete_id)) d
                 where jsonb_typeof(d.value) = 'object' and d.value <> '{}'::jsonb), 0) as days_logged
from public.hab_contacts c
left join public.leaderboard_optin o on o.athlete_id = c.athlete_id
left join public.athlete_progress  ap on ap.athlete_id = c.athlete_id
order by c.created_at desc;
```

`days_logged` is the number to look at. Someone twenty days in with a long streak on
sleep is a warm lead who has already shown you their adherence. Someone at zero after
three weeks never started, and a nudge is wasted on them — though check they were ever
given a login before writing them off.

`on_board` says whether they took the board up. Someone logging steadily but still off
it is worth one message — the board is the thing that keeps people coming back, and
they may simply not have found the CREW tab.

## If they ask to be deleted

`forget_contact()` is the main sweep, but **it is coach-only, so Amir runs it from a
signed-in coach.html session**, and ⚠️ **it does not finish the job**:

```sql
select public.forget_contact('sara_karimi');
```

That clears `hab_notes`, `leaderboard_optin`, `athlete_progress`, `hab_contacts` and
the (now vestigial) `athlete_keys` row. It leaves behind:

- **`public.programs`** — their identity row. `delete from public.programs where athlete_id = '…';`
- **their login** — `public.athlete_identities` plus the auth user itself. Revoke it
  from **coach.html → Athletes → the athlete → Revoke login**, which goes through the
  Edge Function; deleting the identity row alone leaves an orphaned auth account.
- **`public.hab_titles`** and **`public.hab_season_results`** if they ever earned one.

Do all of it, then confirm nothing is left:

```sql
select 'programs' t, count(*) from public.programs where athlete_id='sara_karimi'
union all select 'identities', count(*) from public.athlete_identities where athlete_id='sara_karimi'
union all select 'contacts',   count(*) from public.hab_contacts      where athlete_id='sara_karimi'
union all select 'progress',   count(*) from public.athlete_progress  where athlete_id='sara_karimi'
union all select 'titles',     count(*) from public.hab_titles        where athlete_id='sara_karimi';
```

---

## Turning a free user into a coached athlete

They stay the same athlete — **same id, same login, same history**. That is the whole
point: upgrading costs them nothing and they keep their level and board place. Run
`/athlete-intake` and the rest of the coaching pipeline as normal, then:

1. The programme row gains the real programme (the pipeline writes it into the same
   `public.programs` row).
2. Drop `athlete.tier` — anything that is not `"free"` is treated as coached — or set
   it to `"coached"`. This is what unlocks WORKOUT.
3. Update the tier on their contact row:
   ```sql
   update public.hab_contacts
      set tier = 'coached', source = 'coaching', updated_at = now()
    where athlete_id = 'sara_karimi';
   ```

Their XP, levels, streaks and board position all survive, because none of it was ever
tied to having a programme. Their login does not change either — the same username and
password now opens `program.html` as well.
