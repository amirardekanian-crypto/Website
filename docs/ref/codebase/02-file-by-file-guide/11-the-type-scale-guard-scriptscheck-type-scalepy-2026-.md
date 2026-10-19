### The type scale guard (`scripts/check_type_scale.py`, 2026-09-27)

Pre-commit guard 12, run whenever `program.html` is staged. Every font size in the training app is one of
the `--fs-` tokens in its `:root` (11 · 13 · 15 · 16 for fields · 18 · 22 · 28 · 44; Fresh Eyes DS-03): it
blocks any other px size under 32, anything under 11 px, and a token that stops being the scale. A numeral
that keeps its own size says so on its line with `/* display: … */`. The table of what each step is for:
`PROGRAM-APP.md` → *One type scale*.

---
*One section of the reference. The index is [`CODEBASE.md`](../../../../CODEBASE.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
