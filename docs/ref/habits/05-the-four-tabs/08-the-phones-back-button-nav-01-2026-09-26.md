### The phone's Back button (NAV-01, 2026-09-26)

Back used to leave AA Proof from any screen or sheet. Now, while anything is open over Today, there is one
guard history entry (same URL); Back pops it and `topLayer()` closes what is on top, read straight from `UI`:
a celebration, the tour (ended, as its *Skip the tour* does), the share card, the install sheet, a log sheet, then
Settings or the manual one step at a time (`overlayBack()`, exactly like its ←), a habit's detail back to where
it was opened, any other tab back to Today, and a past day being filled in back to today. `render()` ends with
`navSync()`, which arms the guard when something is open and quietly takes it back off when the last thing
closes by its own button, so Back on Today still leaves the app. ⚠️ **Never in the embedded strip**
(`?embed=1`): an iframe's history entries belong to the training app's page, so it would steal that app's Back.
Not in the coach preview, or before onboarding. A new sheet or screen goes into `topLayer()`.
**Zoom:** a pinch enlarges AA Proof up to 5x (`maximum-scale=5`, since 2026-09-26), and `touch-action:
manipulation` on `html` (2026-09-27) turns off only the double-tap zoom, which on an iPhone could fire on two
quick taps of **+**. The training app has the same since the same day (A11Y-01).

---
*One section of the reference. The index is [`HABITS.md`](../../../../HABITS.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
