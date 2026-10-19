### Support Files (Hosting & Search Engines)

#### `CNAME`
- **What it does:** One line. Tells GitHub your custom domain is `www.amirardekani.com`.
- **If deleted:** Your site reverts to a `github.io` URL. Custom domain stops working.
- **Don't touch** unless you're moving to a different domain.

#### `manifest.json` — App install information
- **What it does:** When someone adds the training app to their phone home screen, this tells the phone the app's name, icon, and colours.
- **If deleted:** "Install app" feature stops working. Normal pages still work.
- **Edit this when:** You change the app's name or brand colour.

#### `robots.txt` — Search engine instructions
- **What it does:** Tells Google "crawl my public pages, but don't index the private training app or athlete data".
- **If deleted:** Search engines may accidentally index private athlete programmes.
- **Edit this when:** You add a new section that should or shouldn't be indexed.

#### `sitemap.xml` — Map for Google
- **What it does:** Lists the public pages so Google can find them all quickly.
- **If deleted:** Google still finds your site, just a bit slower.
- **Edit this when:** You add a new public page.

#### `favicon.ico` (root copy)
- **What it does:** A backup copy of the browser tab icon at the top of the site, for older browsers that only look here.

---

---
*One section of the reference. The index is [`CODEBASE.md`](../../../../CODEBASE.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
