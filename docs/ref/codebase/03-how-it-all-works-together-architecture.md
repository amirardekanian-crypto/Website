## How It All Works Together (Architecture)

Think of it like a house:

- **`tokens.css`** is the paint palette and furniture style guide.
- **`base.css`** decides how walls, floors, and ceilings are built.
- **`components.css`** is the pre-made furniture (sofas, tables, lamps) you place in every room.
- **`shared.js`** is the handyman that, on every page, hangs the nav on the hallway wall, drops the footer into the basement, and makes sure the video pop-up works.
- **`partials/nav.html`** and **`partials/footer.html`** are the single "master" copies of the menu and footer — change them once, every page shows the change.
- The public **pages** are the rooms (welcome, apply, legal): each reuses the same paint, furniture and handyman. The training app, the habit tracker and the coach dashboard carry their own styles.
- The **`programs` table in Supabase** is the filing cabinet of athlete programmes (`data/` is only a local scratch folder).
- **Support files** (CNAME, manifest, robots, sitemap) are the street sign, doorbell plaque, and post-office forwarding instructions.

---

---
*One section of the reference. The index is [`CODEBASE.md`](../../../CODEBASE.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
