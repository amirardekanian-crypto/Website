### Shared "Look and Feel" (CSS)

#### `assets/css/tokens.css` — The brand palette
- **What it does:** The single place where colours, fonts, spacing, and sizes are defined. Change a colour here and it updates across every page.
- **If deleted:** Every page loses its colours, fonts, and spacing. Everything looks broken.
- **Depends on:** Nothing. It's the foundation.
- **Edit this when:** You want to change a brand colour (like the green accent or the clay second accent), swap fonts, or adjust the site's base spacing.
- **Don't touch:** The variable names (the part before the colon). Only change the values after the colon.

#### `assets/css/base.css` — Basic styling rules
- **What it does:** Sets up typography, headings, buttons, containers, and the subtle film grain effect. Every page uses these styles.
- **If deleted:** Headings, buttons, and body text lose their styling.
- **Depends on:** `tokens.css`.
- **Edit this when:** You want to change how headings, buttons, or body text look everywhere.
- **Don't touch:** Unless you're deliberately restyling the whole site.

#### `assets/css/components.css` — Reusable pieces
- **What it does:** Styles for the navigation bar, footer, cards, form fields, video pop-up, and the "install app" prompt.
- **If deleted:** The menu, footer, cards, and form inputs lose their styling.
- **Depends on:** `tokens.css` and `base.css`.
- **Edit this when:** You want to restyle the nav, footer, cards, or form inputs.

---

---
*One section of the reference. The index is [`CODEBASE.md`](../../../../CODEBASE.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
