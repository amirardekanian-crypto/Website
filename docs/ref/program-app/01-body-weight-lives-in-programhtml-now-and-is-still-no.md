## ⚖️ Body weight lives in `program.html` now — and is still NOT scored

⚠️ **MOVED OUT OF PROOF, 2026-09-12** (Amir: *"move the bodyweight tracker page from proof to
program.html and remove it from proof"*). The whole feature — card, history screen, chart,
logging, delete — is in `program.html`; `habits.html` has no weight UI at all, and its manual
section now just says where it went. **Free-tier athletes lose it**, which Amir chose knowingly:
they have no programme app.

**The data did NOT move.** The key is still `<id>_hab_wt`, so no athlete's history had to be
migrated and `coach.html`'s `weightPanel()` needed no change. What moved is *ownership*:
`program.html`'s `_snapshot()` carries one precise exception to its skip-all-`hab_`-keys rule,
and `habits.html` no longer pushes, merges or writes it. **Both apps share this origin's
localStorage, so Proof writing that key again would silently overwrite readings taken in the
programme app** — that is why `saveWt()` is a stub and the pull-side merge is gone.
`mergeStoredValue()` in `program.html` gained the union-by-date branch that used to live in Proof.

Everything below still holds — it is simply enforced in the other file now.

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
