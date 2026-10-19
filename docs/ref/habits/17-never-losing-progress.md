## Never losing progress

The athlete's phone is the record; the server is the mirror.

- Every change is written to localStorage **first**, then flagged unsent — and the flag
  is itself persisted, so an app killed while offline still knows there's work to send.
- Retries back off (5s → 15s → 45s → 2m → 5m) and re-fire on reconnect, on foreground,
  on `pagehide` and at every launch.
- Each push sends the **complete snapshot**, so a newer push supersedes an older one.
  Built from **memory**, not re-read from localStorage: a failed `setItem` (quota, a
  browser refusing storage) is swallowed but still marks dirty, so reading the payload
  back off disk could upload a snapshot older than what the athlete is looking at — or
  `{}`, which `save_progress` would write straight over their cloud log — and then report
  it as SYNCED.
- The cloud merge keeps the **larger** logged value per habit, so a stale device can
  never erase a real number — **except on days this device has edited and not yet
  uploaded**, which are ours outright. `max()` is a defence against a stale *other*
  device, and turning it on our own corrections meant a deliberate 0 always lost to a 1
  the cloud had not been told about: un-tick a mis-tap offline, get killed by iOS, and the
  tick came back at the next launch and was re-uploaded as the truth. Nothing in the app
  could remove a wrong tick. The unsent day keys are persisted beside the dirty flag.
- Settings shows live sync state on its *Sync* row, and tapping the row syncs now.

**Four sync bugs fixed 2026-08-02, all of them silent:**

- **A replacement phone could wipe every other device.** `defaultCfg()` had no
  `migrated3`, so `migrateOld()` ended in `saveCfg()` even having migrated nothing —
  stamping a factory-default config as newest *and* dirty before the cloud was ever read.
  Both halves of the adopt test then failed, the athlete's real config was refused, and
  the defaults were pushed up for every other device to inherit. A migration that
  migrated nothing now saves **quietly** (`saveCfgQuiet()` — writes localStorage, does not
  stamp `updatedAt`, does not mark dirty).
- **Opening Crew re-crowned a stale config.** `applyBoardDeltas()` persisted its
  leaderboard-position snapshot through `saveCfg()`, so a read-only screen promoted
  whatever config that phone held to globally-newest and deleted another device's custom
  habits. Now quiet too.
- **Nothing ever re-pulled.** The boot comment claimed `syncFromCloud` ran again on
  foreground; there was exactly one call site, at boot. A resident PWA never read the
  cloud again, so two devices ping-ponged the snapshot, each push dropping what the other
  had logged. `pullFresh()` now runs on foreground and reconnect — never concurrent, at
  most once a minute, and it pulls *before* the reconnect push.
- **Uploads could overtake the first download.** `SYNC.ready` latches false until boot's
  `get_progress` has had its turn; the 1.2s debounce could otherwise beat it and replace
  a real cloud log with an empty one. And `pushNow()` no longer clears the dirty flag
  unconditionally — a write counter means an edit made *during* the round trip is not
  reported as sent, which it was, while the badge said SYNCED.

⚠️ **Owned rewards are unioned on cloud adoption, never replaced.** Everything else in
that block is newest-device-wins, which is right for a setting and catastrophic for a
possession — a card earned on the tablet is simply absent from an older config the phone
wrote, so the phone winning deleted it. Titles limp back (`syncTitles()` re-mints from
`hab_titles`); **card skins are client-only**, and `claimRewards()` only re-grants what
the *current* level reaches, so after a season reset a lost card was gone for good. Both
sides only ever append, so the union is the truth. What they were *wearing* is a
preference, so the newer config still wins — but never into an empty slot.

Storage keys, all owned solely by Proof: `<id>_hab_cfg` (settings), `<id>_hab_log`
(the daily log), `<id>_hab_meta` (sync state, which stays on the phone) and, once Career Mode's XP switch is on,
`<id>_hab_career` (the last profile the server sent: a cache, kept on the phone and never synced) and, once the catalogue switch
is on, `<id>_hab_catalogue` (the catalogue copy, never synced), `<id>_hab_shelf` (the last `get_awards()` answer, Progress's
shelf: a cache, never synced) and `<id>_hab_awwd` (pending awards the server disagreed with, phone-local). The first two ride the
existing `save_progress` /
`get_progress` functions into the same `athlete_progress` row the programme app uses —
**no table of its own for the log** (the board, roll call, titles, contacts and seasons have
theirs: the stages under *The leaderboard*). `program.html` explicitly skips
these keys when it syncs.
`CFG.careerSeen` (the career reveal has been shown) is in `CFG`, so it does sync, and the cloud merge keeps it. So do phase 3's
`CFG.catalogueSeen` (the catalogue reveal), `CFG.heldBefore` (Proof's shelf at the switch: the first one read wins) and
`CFG.seenAwards` (every award that has had its moment: unioned, like the owned rewards above).

---

---
*One section of the reference. The index is [`HABITS.md`](../../../HABITS.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
