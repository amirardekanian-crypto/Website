## The leaderboard

- **Everyone is on it — joined automatically, once, after a first finished workout**
  (2026-09-12; it was opt-in until then). The rule is below. A row in
  `leaderboard_optin` is still what makes someone visible: no row, invisible.
- The display name is `athlete.boardName` if the programme record has one (the name a
  free signup typed), else first name + last initial — `defaultDisplayName()`. The
  athlete can rename or leave at any time from Crew → Leaderboard.
- Others see **that name, their points, level and rank, and the title they chose to
  show** — nothing else.
  Once Career Mode's XP switch is on the level and rank are the career's, and the points count the training too.
- **Two boards**: *this season* (the default — every point since the season opened) and
  *past week* (a **rolling** seven days: today and the six before it, so a strong week
  always shows instead of emptying every Monday). Neither ever counts a day from before
  the season started.
- **Scored in Postgres** from the log already stored server-side. The app submits no
  number, so editing local storage cannot buy a place.
  Once the XP switch is on it is worked out from the facts (the log turned into facts by the server, plus the training) and kept
  in the `career_scores` copy. `leaderboard_top()` reads that copy, works out the stale rows it has time for and serves the rest
  as they were.
- **No athlete ids are ever returned.** An id is the athlete's sign-in username (and it
  used to be enough to fetch `/data/<id>.json`, which is 404 since 2026-09-07).
- **Reading the board needs a signed-in athlete.** Since 2026-09-07 the RPCs check
  identity server-side (`current_athlete_id()`); the old key path fails closed while
  `public.athlete_keys` is empty. Names never reach the open internet.

### Who is on it — the sweep (2026-09-12)

⚠️ **REVERSED.** This used to say signing someone up *must never* join them to the board.
Amir decided the opposite, with the consequences on the table: the board is shared by
coached clients **and** free signups, so every athlete's display name, level and rank are
visible to everyone on it. He also chose to include athletes who had **previously left** —
in the data they look identical to athletes who never decided — so the sweep puts everyone
on once.

`autoJoinBoard()` runs on every boot, after the first render, and never in demo or coach
preview:

1. `CFG.boardSwept` already set → nothing to do. That includes an athlete who tapped
   **Keep me off the board** before their first session (below).
2. Already on the board (`CFG.onBoard`) → stamp `boardSwept` and stop.
3. **No finished workout yet → stop, and look again next boot.** `hasFinishedAWorkout()`
   asks whether the locked WORKOUT habit is ticked on any logged day — which only the
   server can do, from a session finished in `program.html` or a Library workout marked
   done there that counts as a session. Both consequences are wanted: an athlete who has
   stopped using the app never qualifies and is left off rather than dragged back on, and
   nobody lands on the board at 0 XP with nothing to show.
4. Otherwise join as `CFG.boardName || defaultDisplayName()`. `joinBoard()` swallows its
   own errors and sets `onBoard` only on success, so only a join that actually worked
   stamps `boardSwept` — and sets `boardNoticed` false, which arms the Today banner. A
   first boot on a train with no signal is retried, not marked done.

**They are told before it happens, by name, and can say no first** (PRIV-01, Amir,
2026-09-26). Until then the tour told a new coached athlete "Nobody can see you until you
join", days before the sweep listed them. `boardState()` sorts every athlete into `'on'`,
`'coming'` (coached, not on, sweep not settled: exactly the athletes `autoJoinBoard()` will
list) or `'off'` (free, left, or kept off), and all three places that talk about the board
read it: the tour's Crew step, the Crew card and the Settings → Crew board row. In
`'coming'` they say "Finish your first session and you appear here as <name>", the Crew card
takes a different name (**Use this name** stores `CFG.boardName`, which the sweep joins
under; the server cleans a name rather than refusing it, so this cannot make the sweep fail)
and offers **Keep me off the board**: `keepOffBoard()` stamps `boardSwept` with no server
call, exactly what *Leave* settles after a join, and a Join from Crew still works any time.
⚠️ `boardState()` mirrors the sweep's gate: change one, change the other.

**`CFG.boardSwept` makes it a ONE-TIME sweep — do not remove it.** Re-joining on every boot
would mean an athlete could tap *Leave the leaderboard*, watch it succeed, and be back on
the board next launch with no way out. **If they leave, they left.**

**The phone follows the server's answer, and never argues with it** (2026-09-26).
`applyServerJoined()` takes the `joined` flag `leaderboard_top` returns: from `fetchBoard()`
whenever Crew loads, and from `checkBoardStatus()` once per boot, after the sweep, only
when `CFG.onBoard` is true (not in demo, preview or embed). Joined on the server → on here.
Off on the server while this phone had them on (the coach removed them) → off here, and
`boardSwept` is stamped so the sweep never puts them back: removed counts as settled, the
same as leaving. A "not joined" answer for someone already off changes nothing and stamps
nothing, or a new athlete who opened Crew before their first workout would lose the sweep.
An empty answer is ignored. It saves with `saveCfgQuiet()` (server news, not a change the
athlete made) and never calls `set_leaderboard_optin`.

**The free tier, honestly:** a free athlete's WORKOUT is locked for life and free mode
points every route to `program.html` at `/form.html`, so in practice the sweep never
reaches a free signup. They are on the board only if they **join by hand** from Crew —
`renderBoardJoin()` has no tier check, and the box is pre-filled with their `boardName`.

**Because it is automatic, it cannot be consent.** `privacy.html` §2.3 rests the board entry
on **legitimate interests (Art. 6(1)(f))**, with leaving as the objection route — the same
reasoning body weight uses. **Roll Call stays consent** (Art. 6(1)(a)), because nothing
appears unless the athlete writes it. `renderBoardNotice()` is the standing banner that
makes the athlete *meet* this on the day screen instead of finding it in a policy — see
*01 · TODAY*.

The name typed on the signup form still goes in the programme record as
`athlete.boardName`, and it is what the athlete is joined under, by the sweep or by hand.

**SQL — the Proof stages, every one applied and live** (the files are a changelog, not a
schema: see the box below):

| Stage | What it added |
|---|---|
| 9 | the board: `leaderboard_optin`, `hab_xp()`, `hab_level()`, `hab_rank_label()`, `leaderboard_top()` (live since 26 July 2026) |
| 10 | `get_workout_days()` — WORKOUT fed from `session_history` |
| 11 | seasons: `public.seasons`, `start_season()`, `current_season()` |
| 12 | the badges pay (`hab_bonus_xp()`); the weekly board becomes a rolling week |
| 14 | quest runs: `set_quests()` / `clear_quests()`, `questRuns` (it superseded stage 13's auto-picked weekly quests, which were applied but never kept as a file) |
| 15 | roll call: `hab_notes`, `set_day_note()`, `roll_call()`, `hab_clean_note()` |
| 16 | contacts: `hab_contacts`, `add_contact()`, `contact_list()`, `forget_contact()` |
| 17 | titles on the board: `hab_titles`, `hab_mint_titles()`, `claim_titles()`, `set_title()` |
| 18 | per-day rosters in `hab_bonus_xp()` |
| 19 | the weighted day score and the `unearnable` gate |
| 20 | milestone tiers and event titles (data only) |
| 21 | roll-call retention: `purge_old_notes()` and its trigger |
| 22 | the two-door gate and the comeback: `gateV2`, `lapseDays`, `comebackXp`, `comebackStick` |
| 23 | the title-mint fix (see *Titles on the board*) |
| 24 | `maxCustom`, quest runs clipped, the milestone marks (applied as 24a/b/c) |
| 25 | the season record, the `start_season()` guard, `undo_season()` |
| 55 | `end_quests()` and the `end` day of a quest run: ending a run keeps the XP already earned (see `XP_SYSTEM.md` §8.5); `hab_bonus_xp()` patched in place |

Stages 18 and 20 have no entry in the database's migration history, but both are live: 18's
per-day roster is inside every later `hab_bonus_xp()`, and 20's event titles are on the row.

Career Mode's stages are not in this table. Stage 66 (the fact ledger, live in shadow since 2026-10-17) and stage 69 (the XP
switch, applied 2026-10-17 and switched on 2026-10-18) are described under *Career Mode (phase 2, the XP switch)*.

> Because scoring happens on the server, the XP rules exist in **two places**:
> `XP_RULES` (and its sibling constants) in `habits.html` and the `xp_rules` row in
> Supabase. Change both together — the full key-by-key table is `XP_SYSTEM.md` §8.

> ⛔ **The `supabase/` folder is a changelog, not a schema.** Later stages redefine
> functions from earlier ones and the earlier file keeps its stale copy, so a
> "safe to re-run" banner is only true if nothing after it touched the same
> function. `stage12_bonus_xp.sql` is the live example: its `leaderboard_top` calls
> a `hab_bonus_xp` overload that no longer exists, and re-running it would point
> the board at rules the athletes' own screens do not use — silently, with no
> error. Where the latest definitions sit today: `hab_bonus_xp()` and `hab_xp()` —
> the latest definition, currently `stage24_marks_quests_customcap.sql` plus the `qruns` patch in `stage55_end_quests.sql`;
> `leaderboard_top()` and `roll_call()` — `stage17_titles.sql`; `set_title()` —
> `stage25_season_record.sql`. Since stage69 was applied (2026-10-17), `leaderboard_top()`, `hab_season_level()`, `coach_season_levels()` and
> `hab_close_season()` are stage69's (each is Proof's own scorer until the XP switch is on). ⚠️ **And no file holds the live board RPCs exactly:**
> since 2026-09-07 `leaderboard_top`, `roll_call`, `set_day_note`, `set_leaderboard_optin`,
> `set_title`, `claim_titles`, `get_workout_days` and `season_record` carry a sign-in
> identity check (`current_athlete_id()`) that was added outside these files. Before
> running or trusting any of them, read the live definition first:
> `select pg_get_functiondef(oid) from pg_proc where proname = '…' and pronamespace = 'public'::regnamespace;`

---

---
*One section of the reference. The index is [`HABITS.md`](../../../HABITS.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
