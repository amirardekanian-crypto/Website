### Leads — Applications, Free signups and Referral codes

One place with three sub-tabs, styled like the athlete file's (`.subrail` / `.stab`): **Applications** (`#leads`, with a clay count of the new ones),
**Free signups** (`#leads/signups`) and **Referral codes** (`#leads/codes`). Each sub-tab is a view that returns its HTML and a function that wires it
(`intakeViewHtml()` + `wireIntake()`, `funnelPanelHtml()`, `affiliatesViewHtml()` + `wireAffiliates()`); `renderLeads()` draws the bar and the one on show.
The Leads tab's own badge counts the new applications too (`newApplications()`, the same number as Today's *N new applications* row, whose button is
**Open Leads**).

---
*One section of the reference. The index is [`COACH_DASHBOARD.md`](../../../../COACH_DASHBOARD.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
