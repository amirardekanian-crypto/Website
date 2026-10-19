### Personal records — what they can lift, and what has gone stale

Under the three numbers, one line per lift: the latest estimated one-rep max, how much it has moved
since the athlete's first entry, whether it came from a working set or a deliberate test, and how
long ago. Absent entirely when there is nothing to show, like the body-weight panel — an empty card
on every athlete's page trains you to scroll past the one that has something in it.

A lift marked **due a retest** has gone 28 days or more without a number, and the current cycle
flags it with `"test": "5RM"` (`true`, or `"<n>RM"` with n from 1 to 10: anything else is no flag, here and in the athlete's app,
and the programme checker refuses it; see `SCHEMA.md` → `test`, and `/program-design` → The Ceiling for how
to set one). A flagged lift with nothing on the record at all is listed too, with a dash — it is the
one most worth chasing. **You see this whatever week the cycle is in**; the athlete's own retest
nudge waits for the closing week so it does not nag them, but you are the one deciding when to ask.

Read-only. The athlete owns the record: they log a max from **Personal Records → + Log a max** in
their app, and they can delete any entry. A lift they have renamed between cycles reads as one lift
here and one lift there — both sides run the same name matcher, on purpose.

---
*One section of the reference. The index is [`COACH_DASHBOARD.md`](../../../../COACH_DASHBOARD.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
