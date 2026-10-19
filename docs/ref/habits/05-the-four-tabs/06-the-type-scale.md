### The type scale (2026-10-12, the UX audit's last pass)

**Six font sizes and four corners.** Every `font-size` in the stylesheet and the templates is one of **12, 14, 16, 20, 28, 40 px** (it was 39 sizes in the file, 24 on screen), and every card or control corner is **12, 20, 28 px or round** (cells, pips and thin bars keep their small 3-6 px corners). Measured after the pass on every screen at 390 and 320 px: 12/14/16/20/28 on screen, no text clipped, no sideways scroll. **The label floor is now 12 px** (A11Y-01 set 11). Left alone on purpose: the takeovers and share cards (posters), the strip on the training app's Home (its own clothes), and `fitRankName()`, which still shrinks a long rank a pixel at a time to fit (15 px on a 320 px phone). Under 380 px Progress's stats go two by two and the week table drops the emoji so names fit. **A new style uses the scale**: pick the nearest step, never a new size.

---
*One section of the reference. The index is [`HABITS.md`](../../../../HABITS.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
