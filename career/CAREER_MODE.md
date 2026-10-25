# Career Mode: the gamification system

> **Start here.** What the system is, what each part is for, and the decisions behind it. How each part is worked
> out, step by step, is in **[`PROCEDURES.md`](PROCEDURES.md)**. Every number and every badge, title, mission and quest
> lives in the `.toml` files beside this one, and **[`README.md`](README.md)** says which file to open to change what.
>
> **Status (2026-10-18): phase 1 is live, in shadow** (applied on Amir's *"yes, apply it"*). The fact ledger
> (`supabase/stage66_career_mode.sql`) turns every save into facts on the server, the rulebook and the catalogue are rows
> made from these files (`python scripts/career_seed.py`), and on the live project Career Mode's habit XP equals Proof's
> for every athlete (34 of 34). The one thing an athlete saw in phase 1 was **Hold Serve on the training app's Home** (shipped the same day):
> the weeks held in a row, read from the facts, display only (`PROGRAM-APP.md` → *Hold Serve on Home*).
>
> **Phase 2, the XP switch, is DONE: built, rehearsed, applied to the live project (2026-10-17) and switched on 2026-10-18** (`supabase/stage69_career_xp_switch.sql`,
> *The decisions, round 3*, and `PROCEDURES.md` → *Phase 2, as built*). Season 1 opened at 06:00 UK on 2026-10-18 and the switch went on
> shortly after, on Amir's yes to the dry run's list (`rulebook.toml` version 3). Nobody needed a level kept.
>
> **Phase 3, rewards with meanings and the catalogue switch, is DONE: built, rehearsed, applied to the live project and switched on (2026-10-18)** (`supabase/stage70_career_rewards.sql`,
> `scripts/career/rollback_stage70.sql`, both apps behind `catalogueOn()` / `catalogueOnT()`; *The decisions, round 4*, and `PROCEDURES.md` → *Phase 3, as built*).
> The fix round of the same day split the profile in two reads, **the core (`get_profile()`) and the shelf (`get_awards()`)**, so the profile stays inside its
> 14 KB budget however long a career is; AA Proof keeps the shelf on the phone. The three rehearsals were repaired to start from the schema snapshot
> (phase 1: 67 of 67, phase 2: 49 of 49, phase 3: 181 of 181 for stage70 alone and 249 of 249 with stage73 on top, on the real rows of 2026-10-17).
> **The catalogue switch went ON on the evening of 2026-10-18, on Amir's word in chat** ("go live", then "yes, turn on the project and give everyone their awards"), at rulebook version 3
> (`rulebook.toml` → `[switch] catalogue = "2026-10-18"`). Both apps now show the awards, the four numbers and the Grand Slam row, and Proof's habit tiers and milestones are paid once in a career,
> as awards, no longer by the daily score. **The go-day in numbers:** each athlete's score under the old rules was kept first (39 athletes, `backup.career_catalogue_before`), the dry run was read before the seed,
> the baseline batches all answered `ok`, and `career_compare()` says `ok`. **318 awards were minted for 29 athletes** (2 of them titles) and **34,200 XP was back-paid**. **13 athletes went up a level (at most 4 levels) and nobody went down.**
> The season board's points of two athletes went down a little and one athlete's went up: the old Proof badge pay that was dated inside Season 1 is replaced by awards dated on the days they were earned, which fall before the season.
> The Upgrade paid 15,800 XP, every tier on a main strength lift, and Double Up paid none. Safety copies were taken before the switch: `backup.golive_20261018_career_scores`, `backup.golive_20261018_hab_titles`,
> `backup.golive_20261018_career_rules`, `backup.golive_20261018_career_catalogue` and `backup.golive_20261018_career_facts`. They are dropped with `backup.career_catalogue_before` 14 days after the go-day, on 2026-11-01.
>
> **The decisions on the go-day** (*The decisions, round 4*, below). D1 (when) was answered by Amir: now, not with Season 2. D10 and D11 (read every new string, sign off the catalogue) were waived by his "go live":
> the names, captions and numbers went out as written and can be changed later. D19 (Century and Sessions with Amir count paid sessions) is in, because he chose to go live with it built. D18 is his.
> **D20 is new, and it changes how every later change works: after go-live a change of rules applies forward only** (Amir's words and the meaning are in the D20 row).
> **D20 is BUILT and live (2026-10-19, `supabase/stage76_career_forward_only.sql`):** an award keeps the XP it was minted with (D12 reversed), a fact is priced by the rulebook version in force on its day, and a change of rules is a new version with `starts_on` = the seed day (`PROCEDURES.md` → *Stage 76*).
> **D21 is new (Amir, 2026-10-25), built and rehearsed, NOT applied (`supabase/stage99_emblem_cabinet.sql`, rulebook version 11, the Emblem Cabinet):** an achievement that is new in a version carries `paid_from`, the seed day; if someone already did it, it is won at 0 XP (still unlocked, dated the day it was done), and only wins from `paid_from` on pay (*The decisions* → D21; `PROCEDURES.md` → *Stage 99*). It replaces the quiet back-pay of stage79 and version 10.
> The rest of this file is the design the build follows, phase by phase (*Build order*, below). Change anything here first, then build; a changed file is re-seeded (`README.md`, *How to change something*).
>
> **Stage 73, the fix of the same day, is APPLIED** (`supabase/stage73_career_main_lifts.sql`, `scripts/career/rollback_stage73.sql`; *round 4, as amended*, below). It went on the live project on 2026-10-18, **before the switch**: 8 parts, the five function bodies
> (`career_maxpct_key()` and the four it replaced) equal to the file by md5, `career_maxpct_key()` closed to anon and authenticated. The catalogue was then re-seeded at rulebook version 3 with the switch still off (its md5 equal to the files, `career_compare()` `ok`), and the switch followed.
> It applied after stage70 and after the weight units, stages 71 and 72, and replaced none of what they changed. The Upgrade and Double Up count main lifts only (D18, Amir's word), and a count over sessions counts the paid ones, so Century and Home's
> Sessions with Amir agree (D19, in).
> **D18 is answered, accessories included** (Amir, 2026-10-18, asked whether the accessories the Spine files under a main pattern should count: "Yes i want those to be exluded / You set up the rule for that").
> A lift counts toward The Upgrade and Double Up only when its Spine entry is on one of the seven main patterns, carries the strength tag and is not one of the four he named (Cable Face Pull,
> Machine Reverse Fly, 45° Back Extension, Cable Straight-Arm Pulldown). A main lift logged in pounds or plates counts too, in its own measure. The go-day confirmed the rehearsal: The Upgrade's back-pay is 15,800 XP (not 23,900), every tier on a main strength lift, and Double Up paid none (*round 4, as amended*, below).
> **The list of four fails closed, on a missing id, and that stays true now it is live:** if any of the four ids has no row in the Spine at all (a typo in the toml, the entry deleted or given a new id), The Upgrade and Double Up count no lift, for everyone, until it is put right, and the database log carries a warning that names the missing id. An entry taken back to draft does not stop them: a draft counts for nothing and keeps its place on the list. So check the four after any edit of those entries (`PROCEDURES.md` → *Stage 73* → *To apply*, step 0).
> If D19 is ever a no, `PROCEDURES.md` → *Stage 73* → *If D19 is ever a no* lists what comes out; D18 stands.

---


**This file is the index now.** Every word it ever had is still here, one file per section, listed below. Open the one section you need; nothing reads the whole reference. The rules that must never break are in [`docs/rules/`](../docs/README.md).

## The sections — open the one you need, never the whole reference

| # | Section | Size |
|---|---|---|
| 01 | [Round 5: the lightest version (decided 2026-10-20, NOT BUILT)](../docs/ref/career-mode/01-round-5-the-lightest-version-decided-2026-10-20-not-.md) | 15 KB |
| 02 | [In one breath](../docs/ref/career-mode/02-in-one-breath.md) | 0 KB |
| 03 | [Where it came from](../docs/ref/career-mode/03-where-it-came-from.md) | 1 KB |
| 04 | [The decisions (settled 2026-10-17)](../docs/ref/career-mode/04-the-decisions-settled-2026-10-17.md) | 23 KB |
| 05 | [The loop](../docs/ref/career-mode/05-the-loop.md) | 1 KB |
| 06 | [The four meanings](../docs/ref/career-mode/06-the-four-meanings.md) | 6 KB |
| 07 | [The pieces: nine mechanics, one job each](../docs/ref/career-mode/07-the-pieces-nine-mechanics-one-job-each.md) | 1 KB |
| 08 | [Recognition: who hears about it](../docs/ref/career-mode/08-recognition-who-hears-about-it.md) | 2 KB |
| 09 | [Weekly missions](../docs/ref/career-mode/09-weekly-missions.md) | 1 KB |
| 10 | [Personal quests](../docs/ref/career-mode/10-personal-quests.md) | 0 KB |
| 11 | [The engine, in short](../docs/ref/career-mode/11-the-engine-in-short.md) | 1 KB |
| 12 | [The rules](../docs/ref/career-mode/12-the-rules.md) | 3 KB |
| 13 | [What exists today, and where it goes](../docs/ref/career-mode/13-what-exists-today-and-where-it-goes.md) | 2 KB |
| 14 | [Build order](../docs/ref/career-mode/14-build-order.md) | 3 KB |
| 15 | [What could go wrong](../docs/ref/career-mode/15-what-could-go-wrong.md) | 0 KB |
| 16 | [Open questions (details for later)](../docs/ref/career-mode/16-open-questions-details-for-later.md) | 1 KB |
| 17 | [Keep in step when it is built](../docs/ref/career-mode/17-keep-in-step-when-it-is-built.md) | 5 KB |

---

*17 sections, split 2026-10-19. Every word is where it was; only the file changed. A reference written "`CAREER_MODE.md` → *Section*" is the row with that name.*
