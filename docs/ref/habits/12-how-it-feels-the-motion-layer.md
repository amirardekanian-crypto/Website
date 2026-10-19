## How it feels — the motion layer

Proof is meant to read as a game, not a form. The mechanics of that live in a few
places, and one of them is load-bearing:

**The renderer morphs; it does not replace.** `render()` builds the same HTML string
it always did, then patches it into the live DOM node by node. **Do not reintroduce
`app.innerHTML = …`** — it silently breaks three things at once: scroll jumps to the
top on every tick, every `transition: width` becomes dead code (the bar it animates is
a new node born at its final width), and each screen's entrance fade replays on every
tap. Two attributes steer the patch:

| Attribute | Means |
|---|---|
| `data-k` | Identity. A different key in the same slot is replaced outright, not patched — that's how a screen change still fades while a check-off doesn't. Screens, habit rows, overlays and each queued celebration all carry one. |
| `data-static` | "This subtree is mine, not the template's." The `#fx` layer where XP chips are mid-flight, and any figure the counter engine owns. |

**The tick.** Figures marked `data-num` are animated by `syncNumbers()` rather than
printed (the template only says where the number should *end up*, via `data-to`);
bars marked `data-fill` grow from zero on first paint and tween on every change
after; ticking a habit sends a teal `+XP` chip arcing from the row to the level hero
via `flyXp()`, which then takes the hit; the checkmark is a stroked SVG that draws
rather than a glyph that appears; and `haptic()` fires on tick, completion, level and
rank — a no-op on iPhone, since Safari still exposes no vibration at all.

**Navigation has a direction.** `navDir()` compares the two screens against
`TAB_ORDER` and `screenAnim()` slides the new screen in from that side; a detail or
the manual always pushes in from the right and pops back out to the left. The active
tab is one `.tabslab` that *slides* between cells with the labels inverting under it,
rather than a background that teleports between buttons.

**The screen is never quite still.**

| Thing | What it does |
|---|---|
| **Streak ember** | `emberLevel()` — the 🔥 beside a habit's streak (a clay square under the old skin). On the longest streak on the screen it breathes from 3 days, faster from 14, and genuinely flickers from 30: the day-streak marks, since 2026-08-02 (it was 5/15/30). The streak stops being a fact and starts being something you don't want to lose. |
| **Idle attention** | `armIdle()` — 20s after the last tap, the circle of the most valuable *unlocked* habit still undone starts breathing. Only on Today, never over a sheet or a celebration. |
| **Streak at risk** | `atRisk()` — after 20:00, if the day doesn't qualify **and there is a real streak on the line**, a clay strip appears above the habit list and the nudge card turns clay and changes its copy. Gated on `currentDayStreak() > 0` so it threatens something real instead of nagging. |
| **Typing nudge** | `typeLines()` — the nudge card types itself out. |
| **Grid cascade** | The 35-day grid arrives row by row on an 11ms stagger. |
| **Board race** | Leaderboard rows stagger in. (Each drew a bar against the leader's score until the board became a panel on 2026-08-01; see *03 · CREW*.) |

> ⚠️ **The typing nudge is a layout trap.** It keeps the untyped remainder in the DOM
> (invisible) and uses a **zero-width caret**, so the card occupies its final height
> from the first frame. Typing into an emptied element grows the card as it goes,
> which shoves everything below it and drags the scroll position with it — that
> regression cost 25px of scroll drift per tick before it was caught. The element is
> `data-static` (the renderer must not fight the typer for its text) and keyed by the
> *situation* (`nudge().key`), so a new nudge replaces the node and retypes while an unchanged one is left
> alone.

**Phone manners.** `bindGestures()` binds once per node (the renderer keeps nodes
alive, so binding per render would stack listeners): the log sheet **drags away under
your thumb** — past 30% of its height or 120px it dismisses — and a stepper button
**repeats when held**, 420ms before it starts and ~9/sec after, so logging 10,000 steps
is not forty taps. Dragging is ignored when the gesture starts on a control inside the
sheet.

> ⚠️ **The repeat must have an exit that does not depend on the button.** It is held
> in `_repHold` / `_repTimer` at module level, not in a closure, and it is killed by
> a `pointerup`/`pointercancel`/`blur` **on the window** as well as on the button —
> plus an `isConnected` check inside the tick. As a per-button closure whose only
> exits were events on that button, missing all three (sheet dismissed under the
> thumb, pointer captured elsewhere, app backgrounded) left the interval running
> forever, clicking a control nobody was touching: the number drained 500 at a time
> while the athlete watched it.

**Sound** is off unless the athlete turns it on (Settings → App → Tick sound; it was under Appearance until 2026-10-12). It is *synthesised*,
not loaded — a short square blip through WebAudio, so it costs no bytes and cannot fail
to download. It rides inside `haptic()`, so every existing call site gets it for free.
This is also the only feedback an iPhone actually gets, since Safari exposes no
vibration API at all.

All of it is off under `prefers-reduced-motion`, which `reduced()` checks live.

---

---
*One section of the reference. The index is [`HABITS.md`](../../../HABITS.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
