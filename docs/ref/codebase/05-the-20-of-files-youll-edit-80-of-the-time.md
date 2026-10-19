## The 20% of Files You'll Edit 80% of the Time

In rough order of how often you'll touch them:

1. **coach.html → Athletes** (the inline editor) and `/program-assemble` — Every programme change; programmes are rows in `public.programs`. This is your daily work.
2. **`articles/<category>/<slug>.json` + `articles/index.json`** — Every new article (`/article`), then coach.html → Library → + Publish article.
3. **`workouts/<category>/*.json` + `workouts/index.json`** — Every time you add a shared workout session. Create the file, register it in the manifest.
4. **`index.html`** — When you reword your pitch, update the FAQ, swap a testimonial, or change a CTA.
5. **`form.html`** — When you want to add or tweak an application question.
6. **`partials/nav.html`** and **`partials/footer.html`** — When you add a new page, rename a menu item, or add a social link.
7. **`assets/css/tokens.css`** — If you ever rebrand (new accent colour, new font).

Everything else you can usually leave alone. If an AI assistant tells you to edit something outside this list, ask it to explain why first.

---

---
*One section of the reference. The index is [`CODEBASE.md`](../../../CODEBASE.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
