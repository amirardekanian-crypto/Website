## Stage 91: the week first on Crew, as built (2026-10-20)

Applied to the live project on 2026-10-20, in four migrations: `stage91_crew_week_part01` (the guard and the new kind), `part02` (the board),
`part03` (the feed) and `stage91_crew_week_consent_by_day` (the correction below). The file is `supabase/stage91_crew_week.sql`, which holds the
final state and is safe to re-run. The way back is `scripts/career/rollback_stage91.sql`, on Amir's word only.

**Why.** The audit *The Empty Room* (https://claude.ai/artifact/6VAMqcv12S9Y7rNCLEwmdM, 2026-10-20) found the Crew tab well built and almost
empty: 6 in the crew, 4 posts ever, 13 likes, and **one** moment rang in eight weeks. Six of the Bell's ten items were *joined the crew*, a line
each person gets once ever, so on 26 October the whole feed would have swept to the words *"Quiet so far this week"*. The thing athletes actually
do every week — finish a session — reached the Bell only through *Tell the crew*, and only with a photo. Amir's answer, asked whether a finished
session should ring: *"only if they want to, unless if 20 ppl train, we wil have 20 bells."*

**What it changes.** Nothing that pays: no XP, no award, no fact, no table, no row written anywhere (GAME-6 — nothing on Crew pays).

1. **`crew_kind_list()` gains `'session'`**, first in the list. Every switch defaults on wherever `kinds` is read (`coalesce(…, true)`), so the
   attendance line was on for all six members the moment it was applied — Amir's choice. `CREW_KINDS` in program.html is its twin and carries the
   words (*A session finished · One line a day, naming whoever trained*).
2. **`crew_board(p_limit integer default 25)`** is new: `pos, who, points, level, is_me`, ranked by this season's points from
   `career_scores_for()`, over `crew_members()` only. Execute to `authenticated, service_role`.
   **`leaderboard_top()` is not touched**, on purpose: coach.html and habits.html both call it and both mean the whole board. The Crew tab was
   calling that same function, which is why its board listed 23 names — six who had never been asked the crew question, and Ghazal, who chose
   *Keep it to me*, by name and level — on a screen that promises nothing of yours reaches the crew before your yes.
3. **`get_bell()`** gains three things:
   - the **attendance items** (`t: 'sess'`), one per day for the whole crew: `{ key: 'sess:<day>', day, n, names, me }`, naming only members whose
     `session` switch is on, with the viewer left out of `names` and flagged by `me` so the app writes *You* itself;
   - **`week`**: `{ members, sessions, held }` over the same 7 days the Bell covers, respecting the `session` and `week` switches, naming nobody;
   - **`crew`**: `[{ who, me, since }]`, every member, for the *In the crew* page.

**Two decisions worth keeping.**

**The board is deliberately NOT in `get_bell()`.** One call that is already cached would have been cheaper, and it would have made the board work
offline for free. But stage83 hashes `get_bell()`'s whole payload (less `at`) to answer `{"same": true}` in 78 bytes instead of the feed's few
thousand — Amir, 2026-10-19: *"irans internet is very slow"*. Season points move whenever anybody ticks a habit, so a board inside the payload would
have broken that saving every single day. The three `week` numbers and the `crew` names ARE in the payload, because each of them can only change on
the same event that already changes the feed: a session, a week held, or somebody joining. The board stays its own call, asked at most every ten
minutes, and the app keeps it on the phone under `<id>_crewboard`.

**The day, never the write — including for consent.** A session's fact carries `day` (when it was trained) and `created_at` (when the row was
written). On 17 October the career back-pay wrote 39 of Mehraneh's sessions, 26 of Ehsan's and 24 of Dela's in one afternoon, so folding on
`created_at` would have had the Bell announce *"Mehraneh trained 39 times today"*. Grouping on `day`, inside the Bell's own 7-day window, also means
a back-filled old session never rings.

The first version then got the **consent** test wrong, and it was caught on the live crew before anything shipped: it compared `created_at` to
`yes_since`. All six joined on 19 October between 14:58 and 19:16, so every session logged earlier that same afternoon was dropped — 19 October read
*"Coach trained"* when Coach, Dela, Elaheh and Nilram all had, and the week's sessions came back as 3 instead of 5. The fix
(`stage91_crew_week_consent_by_day`) compares the session's **day** to the day of the yes, which is also how a person reads it: *from the day I
joined, my sessions count*. Nothing from a day before the yes is ever named or counted. The other kinds keep `p.at >= m.yes_since`, because a moment
is an instant.

**It never rings a phone, and that needs no code.** `crew_push_queue`'s own CHECK constraint has no `'session'` kind and no trigger adds one, so the
attendance line is silent by construction. Amir chose that (*on by default, no phone buzz*). Adding a sender would take his word and a new kind in
that constraint.

**To apply.** Run `supabase/stage91_crew_week.sql`. It guards on stage81 (`get_bell`), stage85 (`crew_open_now`) and the score cache
(`career_scores_for`), and raises without changing anything if one is missing. Then check it on the live crew:

```sql
with b as (select public.get_bell('<an athlete in the crew>') as j)
select (j -> 'week'), (j -> 'crew'),
       (select jsonb_agg(x) from jsonb_array_elements(j -> 'items') x where x ->> 't' = 'sess') from b;
select * from public.crew_board(25);
```

The snapshot is regenerated in the same commit (`scripts/restore/README.md` → *Keeping the snapshot current*); stage91 adds one function, so it goes
from 262 to 263. No table, so `BACKUP_TABLES` and `coach_erase_person()` are unchanged.

**The app half** is in `PROGRAM-APP.md` → *Crew and the Bell* → *THE WEEK FIRST*, with the five bugs fixed beside it; its tests are
`scripts/headless/crew.js` section 16 (140 checks in all).

---
*One section of the reference. The index is [`career/PROCEDURES.md`](../../../career/PROCEDURES.md).*
