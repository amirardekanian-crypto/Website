# The coaching log: its shape, and the trim every write ends with

Amir, 2026-11-20: *"i want the skill to update the log into a new trimmed version when there is a
new change, because we read it anyway, atleast after we are done with a program or a change, trim
it so its updated."* And the same day: *"keep them how you would read fast and helps write a
program fast, i never read them."*

**The reader is the next design run, never Amir.** The log is the athlete as they are today, plus
one line per cycle of how they got here. It is not an archive: every text it ever held is kept in
`public.coaching_log_versions` (stage47, 2026-10-10), which saves the old body on every change by
itself, and coach.html backs that table up.

## The shape

````
# Coaching Log — <First Last> (<id>)

Coach-only: never shown in the app. Written for the next design run and trimmed after every write.

## Athlete profile
```profile
<PROFILE.md: aim, goals, bottleneck, days and real minutes, kit, bans, injuries, recovery>
```

## Exercise Ledger

| Exercise | Status | Last cycle | Note |
|---|---|---|---|

## Roadmap — <YYYY-MM-DD>
<each cycle's exit test, word for word; a ROADMAP DEVIATION still in force; why, one line per cycle>

## History
- C01 <Name> · <start> → <end> · <done>/<planned> sessions · <what changed in the athlete or the plan> · <what carried forward>

## Cycle NN — <Name> · <YYYY-MM-DD> · <NEW|RETURNING>
<the current cycle: program-design SKILL.md → the COACHING LOG ENTRY; a mid-cycle change folded in>

## Debrief — Cycle NN <Name> · <YYYY-MM-DD> · before C<NN+1> design
<only once the current cycle has ended: cycle-report SKILL.md → Step 5>
````

**History sits above the first `## Cycle` heading on purpose.** Design's Q1 reads everything above
that heading plus the latest cycle, so the History lines are read every time, at about 250
characters a cycle. A whole log usually comes to under 10k characters; say why when it doesn't.

## When

**Every run that writes the log trims it, straight after its write lands:**
- `/program-assemble` Part B, after `publish_cycle()`: the cycle just finished, its in-cycle edits
  and its Debrief become one History line, and the new entry stays.
- `/cycle-report`, after the Debrief: anything older than the cycle it reports on becomes History.
- `/program-edit`, after a change to a live programme: the change folds into the current cycle's
  entry instead of adding a section.

`/athlete-intake` and `/program-roadmap` create the log, so there is nothing to trim yet. A log
written in the old long form is trimmed the next time that athlete's log is written, never in a bulk
pass over every athlete.

## How

**1. Read the whole log after the write**, not the slice design reads:
```sql
select body, md5(body), length(body) from public.coaching_logs where athlete_id = '<id>';
```

**2. Move every fact that is still live to the top before anything is cut.** An injury, a ban, a
preference, a schedule or a goal goes in the profile (PROFILE.md). An exercise that hurt, was
disliked or must not come back gets its ledger row and a Note with the reason. A ban that lives
only in a section about to be cut is a ban the next design never sees.

**3. Build the new body:**
- **Header, profile, ledger:** keep, with step 2's additions.
- **Roadmap:** keep each exit test word for word and any ROADMAP DEVIATION still in force; cut the
  rest of the rationale to one line per cycle. The cycles themselves are in the programme's
  `cycles[]`.
- **History:** keep the lines already there as they are. Each finished cycle that is not the
  current one (its entry, any `## In-cycle edits` or `MID-CYCLE ADJUSTMENT` section, its Debrief)
  becomes ONE line in the shape above.
- **The current cycle's entry:** in the COACHING LOG ENTRY's shape, rewritten to it if it is in the
  old long form, the checker's tables kept as written. A mid-cycle change is folded in: the entry
  says what is true now, plus one `Changed <date>: <what> → <what>, <why>` line each. A plan a later
  change made wrong is taken out, not overridden in prose; the ledger holds the ban.
- **The current cycle's Debrief**, if there is one: in Step 5's shape, rewritten to it if long.
- **Everything else goes.** It is in `coaching_log_versions`.

**4. Write it in one update, and prove the old text was saved:**
```sql
update public.coaching_logs set body = $T$<the new body>$T$, updated_at = now()
 where athlete_id = '<id>' and md5(body) = '<md5 from step 1>'
returning length(body);
select md5(body) = '<md5 from step 1>' as old_text_saved
  from public.coaching_log_versions where athlete_id = '<id>' order by id desc limit 1;
```
No row back from the update means the log changed after step 1: read it again and start over.
`old_text_saved` must be true. Use a dollar-quote tag the body does not contain, and build a long
call with a script written by the Write tool.

**5. Report in one line:** the log's length before → after, and that the old text is saved.

## Getting an old section back

```sql
select saved_at, substring(body from position('<the ## heading>' in body) for 15000)
  from public.coaching_log_versions
 where athlete_id = '<id>' and position('<the ## heading>' in body) > 0
 order by id desc limit 1;
```
