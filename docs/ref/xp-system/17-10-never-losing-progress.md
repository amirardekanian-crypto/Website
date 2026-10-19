## 10. Never losing progress

Worth knowing, since it underpins all of the above.

- Every tick is written to the phone's local storage **first**, then queued for the server.
- The "unsent" flag is itself saved, so an app killed while offline still knows there
  is work to send next time it opens.
- Retries run on their own with backing-off delays (5s → 15s → 45s → 2m → 5m), and
  fire again the moment the phone reconnects, when the app comes back to the
  foreground, and at every launch.
- Each push sends the **complete current snapshot**, so a newer push simply supersedes
  an older one — nothing can arrive out of order or overwrite good data with stale data.
- When two devices disagree about a day, the **larger logged value wins**, so a stale
  phone can never erase a number recorded elsewhere.
- Settings has a live sync line ("SYNCED 2 MIN AGO" / "OFFLINE — SAVED ON THIS PHONE")
  and a **Sync now** button.

The athlete's phone is the record. The server is the mirror.

---

---
*One section of the reference. The index is [`XP_SYSTEM.md`](../../../XP_SYSTEM.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
