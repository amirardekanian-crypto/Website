# The athlete app (`program.html`) — how its programme features work

Moved out of `CLAUDE.md` on 2026-09-26: that file loads into every session, and this part is only
needed when changing the programme app or the pipeline. `CLAUDE.md` keeps a one-line tripwire for
each thing here that must never break; this file keeps the full account of what was built, why,
and the traps found on the way. Data shapes are in `SCHEMA.md`; the coaching rules are the rule
index at the top of `.claude/COACHING-PRINCIPLES.md`. The text is as it stood in `CLAUDE.md`, with
athlete ids replaced by plain descriptions (the repo is public).


**This file is the index now.** Every word it ever had is still here, one file per section, listed below. Open the one section you need; nothing reads the whole reference. The rules that must never break are in [`docs/rules/`](docs/README.md).

## The sections — open the one you need, never the whole reference

| # | Section | Size |
|---|---|---|
| 01 | [⚖️ Body weight lives in `program.html` now — and is still NOT scored](docs/ref/program-app/01-body-weight-lives-in-programhtml-now-and-is-still-no.md) | 1 KB |
| 02 | [📋 A PRESCRIPTION IS DATA NOW — `rx`, not `chips[]` (2026-09-20)](docs/ref/program-app/02-a-prescription-is-data-now-rx-not-chips.md) | 8 KB |
| 03 | [🗓️ Week notes are DATA, for any week of a cycle — `cycles[n].weekNotes` (2026-09-26; any week 2026-10-11)](docs/ref/program-app/03-week-notes-are-data-for-any-week-of-a-cycle-cyclesnw.md) | 8 KB |
| 04 | [🌡️ Today's targets — the check-in changes the DAY, never the programme (2026-09-26)](docs/ref/program-app/04-todays-targets-the-check-in-changes-the-day-never-th.md) | 5 KB |
| 05 | [🕘 The Card Remembers — last time on every exercise (2026-09-24)](docs/ref/program-app/05-the-card-remembers-last-time-on-every-exercise.md) | 2 KB |
| 06 | [🦴 The Spine — one record per exercise (2026-09-24)](docs/ref/program-app/06-the-spine-one-record-per-exercise.md) | 17 KB |
| 07 | [🗺️ The Quality Map — what each day builds (2026-09-24)](docs/ref/program-app/07-the-quality-map-what-each-day-builds.md) | 4 KB |
| 08 | [🎯 Because — why THIS athlete has this exercise (2026-09-24)](docs/ref/program-app/08-because-why-this-athlete-has-this-exercise.md) | 1 KB |
| 09 | [✍️ The set log is COUNTERSIGNED, and the note belongs to ONE session (2026-09-24)](docs/ref/program-app/09-the-set-log-is-countersigned-and-the-note-belongs-to.md) | 18 KB |
| 10 | [💬 No in-app chat: Amir answers only on WhatsApp (2026-09-26)](docs/ref/program-app/10-no-in-app-chat-amir-answers-only-on-whatsapp.md) | 3 KB |
| 11 | [📶 No signal — the plan saved on the phone (REL-01, 2026-09-26)](docs/ref/program-app/11-no-signal-the-plan-saved-on-the-phone-rel-01-2026-09.md) | 10 KB |
| 12 | [🔄 A new version is ready: the app asks for the reload itself (2026-10-19)](docs/ref/program-app/12-a-new-version-is-ready-the-app-asks-for-the-reload-i.md) | 5 KB |
| 13 | [🌙 Midnight is not the end of a session (DATA-02, 2026-09-26)](docs/ref/program-app/13-midnight-is-not-the-end-of-a-session-data-02-2026-09.md) | 2 KB |
| 14 | [📊 Home and Progress in the Centre Court look (2026-10-12)](docs/ref/program-app/14-home-and-progress-in-the-centre-court-look.md) | 8 KB |
| 15 | [🧩 Every other screen in the Centre Court look (2026-10-13, continuing)](docs/ref/program-app/15-every-other-screen-in-the-centre-court-look.md) | 17 KB |
| 16 | [🏠 Home, led by the training (HOME-02, 2026-09-26)](docs/ref/program-app/16-home-led-by-the-training-home-02-2026-09-26.md) | 2 KB |
| 17 | [🏆 This cycle: where it is, and the wins (PROG-01, 2026-09-27)](docs/ref/program-app/17-this-cycle-where-it-is-and-the-wins-prog-01-2026-09-.md) | 2 KB |
| 18 | [🏁 When the cycle is over: Home between cycles (PROG-02, 2026-10-10)](docs/ref/program-app/18-when-the-cycle-is-over-home-between-cycles-prog-02-2.md) | 3 KB |
| 19 | [🎬 Highlight Reel: a share card for each win, and a moment for each (2026-10-17)](docs/ref/program-app/19-highlight-reel-a-share-card-for-each-win-and-a-momen.md) | 6 KB |
| 20 | [🎾 Hold Serve on Home: the weeks held in a row (Career Mode, 2026-10-17)](docs/ref/program-app/20-hold-serve-on-home-the-weeks-held-in-a-row-career-mo.md) | 4 KB |
| 21 | [🪜 Career on Home, and what a session earns (Career Mode phase 2, 2026-10-17)](docs/ref/program-app/21-career-on-home-and-what-a-session-earns-career-mode-.md) | 6 KB |
| 22 | [🏅 Rewards on the finish card, the bands and the row (Career Mode phase 3, 2026-10-18)](docs/ref/program-app/22-rewards-on-the-finish-card-the-bands-and-the-row-car.md) | 11 KB |
| 23 | [🎯 Career, the lightest version: Your numbers and Your moments (Career Mode round 5, step 3, 2026-10-19)](docs/ref/program-app/23-career-the-lightest-version-your-numbers-and-your-mo.md) | 9 KB |
| 24 | [🔔 Crew and the Bell (Career Mode round 5, step 5, 2026-10-19)](docs/ref/program-app/24-crew-and-the-bell-career-mode-round-5-step-5-2026-10.md) | 8 KB |
| 25 | [📅 This Week is built from the session history (HOME-01, 2026-09-26)](docs/ref/program-app/25-this-week-is-built-from-the-session-history-home-01-.md) | 1 KB |
| 26 | [↩️ Back closes the top layer (NAV-01, 2026-09-26)](docs/ref/program-app/26-back-closes-the-top-layer-nav-01-2026-09-26.md) | 3 KB |
| 27 | [🔍 Readable in both themes (A11Y-01, 2026-09-26)](docs/ref/program-app/27-readable-in-both-themes-a11y-01-2026-09-26.md) | 1 KB |
| 28 | [🎨 Clay means "look here" (DS-01, 2026-09-27)](docs/ref/program-app/28-clay-means-look-here-ds-01-2026-09-27.md) | 2 KB |
| 29 | [🔠 One type scale (DS-03, 2026-09-27)](docs/ref/program-app/29-one-type-scale-ds-03-2026-09-27.md) | 3 KB |
| 30 | [🎾 Centre Court: the training day, re-skinned (2026-10-12)](docs/ref/program-app/30-centre-court-the-training-day-re-skinned.md) | 21 KB |
| 31 | [⏱️ The session bar and "In progress" (WK-03, 2026-09-26 and 2026-09-27)](docs/ref/program-app/31-the-session-bar-and-in-progress-wk-03-2026-09-26-and.md) | 3 KB |
| 32 | [⏲️ The rest timer keeps time in a pocket (WK-02, 2026-09-27)](docs/ref/program-app/32-the-rest-timer-keeps-time-in-a-pocket-wk-02-2026-09-.md) | 1 KB |
| 33 | [🏓 Off the Glass: a game for the rest (2026-10-17)](docs/ref/program-app/33-off-the-glass-a-game-for-the-rest/INDEX.md) | 27 KB · 3 parts |
| 34 | [🎾 Split Step: a reaction game for the rest (2026-10-18)](docs/ref/program-app/34-split-step-a-reaction-game-for-the-rest.md) | 3 KB |
| 35 | [🎾 Between Sets: a tennis game for the rest (2026-10-18)](docs/ref/program-app/35-between-sets-a-tennis-game-for-the-rest.md) | 2 KB |
| 36 | [🧾 The working card (CARD-01/02/03, 2026-09-27)](docs/ref/program-app/36-the-working-card-card-010203-2026-09-27.md) | 7 KB |
| 37 | [🧭 Guided Mode's layout (WK-01, second part, 2026-09-27)](docs/ref/program-app/37-guided-modes-layout-wk-01-second-part-2026-09-27.md) | 2 KB |
| 38 | [✅ One finish: rate, then Done (WK-04, 2026-09-27)](docs/ref/program-app/38-one-finish-rate-then-done-wk-04-2026-09-27.md) | 4 KB |
| 39 | [💡 First-session hints (ONB-01, 2026-09-27)](docs/ref/program-app/39-first-session-hints-onb-01-2026-09-27.md) | 2 KB |
| 40 | [🔥 Warm-ups are a list, and a circuit's rest is never invented (WK-05, 2026-09-27)](docs/ref/program-app/40-warm-ups-are-a-list-and-a-circuits-rest-is-never-inv.md) | 2 KB |
| 41 | [👤 Your account, and Sign out (NAV-02, 2026-09-27)](docs/ref/program-app/41-your-account-and-sign-out-nav-02-2026-09-27.md) | 1 KB |
| 42 | [❓ The guide in the sheet, and the jargon is the link (COACH-02, 2026-09-27)](docs/ref/program-app/42-the-guide-in-the-sheet-and-the-jargon-is-the-link-co.md) | 1 KB |
| 43 | [📲 The install ask waits for a finished session (HOME-03, 2026-09-26)](docs/ref/program-app/43-the-install-ask-waits-for-a-finished-session-home-03.md) | 0 KB |
| 44 | [🗑️ Anything that deletes takes two taps (LOG-02, 2026-09-26)](docs/ref/program-app/44-anything-that-deletes-takes-two-taps-log-02-2026-09-.md) | 0 KB |
| 45 | [📖 The in-app guide names real controls (CNT-01, 2026-09-26)](docs/ref/program-app/45-the-in-app-guide-names-real-controls-cnt-01-2026-09-.md) | 1 KB |
| 46 | [📚 The Library's Sessions: a list, and a session at the right moment (LIB-01, 2026-09-27)](docs/ref/program-app/46-the-librarys-sessions-a-list-and-a-session-at-the-ri.md) | 3 KB |
| 47 | [🏋️ Personal Records — two write doors (a finished session, + Log a max), and what to keep in step](docs/ref/program-app/47-personal-records-two-write-doors-a-finished-session-.md) | 3 KB |
| 48 | [Body weight — the 2026-09-03 design, built in AA Proof](docs/ref/program-app/48-body-weight-the-2026-09-03-design-built-in-aa-proof.md) | 6 KB |
| 49 | [🧭 First-timer fixes (2026-10-11, found by walking the app: `docs/record/CLIENT-APP-MAP.md`)](docs/ref/program-app/49-first-timer-fixes.md) | 4 KB |
| 50 | [🖼️ The share cards' design pass (2026-10-19)](docs/ref/program-app/50-the-share-cards-design-pass.md) | 6 KB |
| 51 | [🧮 The Scoreboard: Progress cut to one screen (2026-10-19)](docs/ref/program-app/51-the-scoreboard.md) | 9 KB |

---

*51 sections. The first 50 were split out of this file on 2026-10-19, every word where it was; only the file changed. A reference written "`PROGRAM-APP.md` → *Section*" is the row with that name.*
