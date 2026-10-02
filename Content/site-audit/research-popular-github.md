# Popular tools for AI-agent website review (research, 2 Oct 2026)

Method: stars, licence and last push come from GitHub's API or repo page, fetched 2 Oct 2026 (stars rounded). Weekly npm downloads (24-30 Sep) and skills.sh installs are the adoption checks. UNVERIFIED = not confirmed on a primary page. None needs a build step: the scanners take the live URL or `python -m http.server`, the code reviewers read the HTML/CSS files. Already on Amir's PC: Playwright MCP plugin, frontend-design, design:* and marketing:seo-audit skills.

## 1. Ranked top 15 (by use to this site)

**A. Design/UX skills**
1. **Impeccable** github.com/pbakaus/impeccable. 73.9k★, Apache-2.0, pushed 2 Oct (skill v4.5.0). 24 commands (audit, critique, polish) plus `npx impeccable detect <html|folder|url>`: 61 deterministic checks (touch targets, line length, skipped headings, "AI slop"), no LLM or key. Rust binary, signed bundles. Best all-rounder: use `detect`, skip hooks.
2. **addyosmani/web-quality-skills**. 2.9k★, MIT, 24 Aug. Six markdown skills (web-quality-audit, performance, core-web-vitals, accessibility, seo, best-practices); no scripts, steers the agent through Lighthouse or static inspection. Safe playbooks; accessibility has 57.9K installs.
3. **jezweb/claude-skills `design-review`**. 1.0k★, MIT, 29 Sep. Screenshots via Chrome/Playwright MCP, writes a report, edits no code. A ready prompt for the Playwright MCP he has; install `frontend@jezweb-skills`.
4. **mblode/agent-skills `ui-verification`**. 137★, MIT, 2 Oct. Nine Playwright probes (axe-scan, target-size, focus-walk, viewport-stress, locale/direction matrix, web-vitals); accepts static HTML. Best designed, but young (Jan 2026). No `ui-audit` exists; nearest are `ui-design`, `typography-audit`.
5. **vercel-labs/agent-skills `web-design-guidelines`**. 31.8k★, no licence file, 28 Aug, 691K installs. Fetches about 100 Web Interface Guidelines rules (vercel-labs/web-interface-guidelines, 918★, MIT) from raw.githubusercontent on every run, then reviews code. Useful checklist, React-flavoured; Socket flags "Warn".

**B. Accessibility**
6. **axe-core** github.com/dequelabs/axe-core. 7.6k★, MPL-2.0, v4.13.0 (5 Aug), 86.6M npm/week. Playwright's docs recommend `@axe-core/playwright` (14M/week) and warn many problems need manual testing. Inject it into the page; no install.
7. **Pa11y** github.com/pa11y/pa11y. 4.6k★, LGPL-3.0, 28 Sep. `npx pa11y <url|absolute path>`, runners axe and HTML_CodeSniffer, needs even Node 22.13+ (24 qualifies). Cheap second opinion.

**C. Visual QA**
8. **Playwright**: playwright-mcp 37.8k★, playwright-cli 13.7k★, Apache-2.0, 28 Sep; core 97k★. MCP supports `--browser msedge`; Microsoft now recommends CLI + skills as cheaper in tokens. `toHaveScreenshot` is regression against a baseline (OS-specific), not design judgement. Already installed.
9. **vercel-labs/agent-browser**. 43.5k★, Apache-2.0, 1 Oct, 2.1M npm/week. Rust CLI with built-in axe (`a11y`), `vitals`, `diff screenshot`; `install` downloads Chrome for Testing; native Windows. Strongest single tool, but duplicates the Playwright MCP.

**D. Performance**
10. **Lighthouse** github.com/GoogleChrome/lighthouse. 30.8k★, Apache-2.0, v13.5.0 (18 Sep), 5.8M npm/week. `npx lighthouse <url> --preset=desktop`; Node 22+; needs Chrome (Edge via CHROME_PATH, UNVERIFIED). The baseline.
11. **ChromeDevTools/chrome-devtools-mcp**. 52.9k★, Apache-2.0, 2 Oct, 2.5M/week. `lighthouse_audit` (a11y, SEO, best practices, "agentic browsing"; excludes performance), traces, throttling; ships a11y and LCP skills. Telemetry on by default; Chrome only officially.
12. **Unlighthouse** github.com/harlan-zw/unlighthouse. 4.9k★, MIT, 29 Sep. `npx unlighthouse --site <domain>` reads the sitemap and crawls; Node 22.18+. Whole-site Lighthouse from his generated sitemap.

**E. Conversion**
13. **coreyhaines31/marketingskills**. 52.2k★, MIT, 1 Oct. `cro` (75.9K installs), `page-cro` (58.2K), `copywriting` (213.5K): seven-factor read (value proposition, headline, CTA, hierarchy, proof, objections, friction) from copy and code, no browser. Markdown only; wants a product-context file. Widely adopted but generic; nothing popular targets coaches.

**F. RTL/Farsi**
14. **Stylelint 17** github.com/stylelint/stylelint. 11.5k★, MIT, v17.16.0 (1 Oct), Node 20.19+. Built-in `property-layout-mappings` flags `margin-left`; autofix needs `languageOptions.directionality`; it also flags `width`, so set `ignoreProperties`; inline `<style>` needs postcss-html. Supersedes csstools/stylelint-use-logical (75★, CC0, maintenance mode).
15. **W3C references**: Arabic & Persian Layout Requirements (w3.org/TR/alreq: digits U+06F0-06F9, ZWNJ, Persian ی/ک versus Arabic ي/ك), the `qa-html-dir` and inline-bidi articles (`dir` attribute, not CSS; `dir="auto"` on inputs; `<bdi>`), and the i18n Checker validator.w3.org/i18n-checker (v2.0.3, URL or upload, 2013-16 code, still online). No popular agent skill covers Farsi; registry RTL skills are tiny (UNVERIFIED). rtlstyling.com (Ahmad Shadeed) is a well-known free CSS guide (contents UNVERIFIED). alreq gives no Persian line-height number, so judge that by eye at 360 px.

## 2. Run FIRST on this site

1. **Lighthouse, mobile and desktop**, on six pages (EN home, FA home, apply, proof, a Farsi product page, an article), then Unlighthouse on the sitemap. The baseline; Node 24 is fine.
2. **axe-core through the Playwright MCP he has** (inject from a CDN, `axe.run()` at 390 px, light and dark, EN and FA; a CSP could block it, UNVERIFIED). No install; returns selectors the agent can fix.
3. **Playwright screenshot matrix** (360/390/768/1280, EN and FA, `browser_emulate_media` for dark and reduced motion) reviewed with installed `design:design-critique`, `design:accessibility-review` and DESIGN_SYSTEM.md. No install; catches RTL overflow and clipped Farsi.
4. **`npx impeccable detect`** on a few live URLs and the root HTML files. Deterministic, no key, Edge counts as the browser. Never `install`.
5. **marketingskills `cro` + `copywriting`** on the English apply and landing pages, with `Content/PRODUCT.md` as context. Markdown only; copy just those two folders.
6. **A no-package Farsi pass**: grep Farsi pages for Arabic ي/ك and ٠-٩, mixed Latin/Persian digits, `lang="fa" dir="rtl"`, physical `left/right` in shared CSS, un-isolated prices, phones and URLs (`<bdi>`, `dir="ltr"`); W3C i18n Checker per page; Stylelint rule afterwards.

## 3. Hyped, stale, unsafe or poor fit

- **Stars are not audit ability.** ui-ux-pro-max, taste-skill, open-design (99k★ in five months), gstack and the Composio list generate or style code. ui-ux-pro-max is generate-only with a premium upsell; its `design-system/MASTER.md` and Impeccable's `init` PRODUCT.md/DESIGN.md would fight `Content/PRODUCT.md` and the clay-only brand rules.
- **Unsafe or heavy:** gstack (Bun, Chromium daemon, Stop hook, auto-update); Impeccable hooks (README: `install` writes them to `.claude/settings.local.json`; site says opt-in) plus a downloaded signed binary; claude-seo (execution-policy-bypass and curl installers; use the plugin route); squirrelscan (curl|bash; use npx); accessibility-agents (hook blocks edits); chrome-devtools-mcp (usage statistics and CrUX calls on by default); playwright-skill (runs generated scripts).
- **Stale:** WebPageTest repo (Sep 2025), Lighthouse CI (27 Mar, yet 1.9M/week), travisvn list (28 Apr), rtlcss (Aug 2024), Vazirmatn (May 2023, a finished font).
- **Repo gotcha:** Pages serves every root file not in `_config.yml` exclude, so anything these tools write there (PRODUCT.md, DESIGN.md, `design-system/`) goes public. Run them in a scratch copy.
- **Still UNVERIFIED:** Edge as the browser for Lighthouse and chrome-devtools-mcp; whether a CSP blocks axe injection; WebPageTest free-plan limits (sources say 150 or 300 runs a month); any RTL-specific agent skill beyond tiny registry entries.

## 4. Also checked (stars, licence, last push, verdict)

| Candidate | Facts | Verdict |
|---|---|---|
| nextlevelbuilder/ui-ux-pro-max-skill | 132k, MIT, 27 Sep, v2.15.0 | 380K installs; generate-only, local Python |
| Leonxlnx/taste-skill; garrytan/gstack; nexu-io/open-design | 92k / 135k / 99k, MIT / MIT / Apache-2.0, 26 Sep / 1 Oct / 2 Oct | Generators or workflow suites; gstack `/design-review` is real but heavy |
| anthropics/skills | 179k, per-skill licence, 29 Sep | frontend-design (945K installs) guides creation; webapp-testing is a Python Playwright helper |
| anthropics/claude-plugins-official; knowledge-work-plugins | 37k / 26k, Apache-2.0, 2 Oct / 1 Oct | Only frontend-design and playwright here; design/marketing plugins are markdown |
| borghei/Claude-Skills `design-auditor` | 852, unrecognised licence, 27 Sep | Python tools, no browser; A-F grades computed from findings the agent supplies |
| tommyjepsen/awesome-ux-skills | 240, none, 10 Aug | Markdown heuristic prompts; harmless |
| Dammyjay93/interface-design | 5.8k, MIT, 20 Jun | README: not for marketing sites |
| ibelick/ui-skills | 9.3k, MIT, 30 Sep | Short rule sets, also a remote MCP |
| wonjyou/design-audit; aditya-ariosity/ux-ui-skills | 7 / 4, none / MIT, Mar / Sep | Screenshot-only; too new |
| travisvn / ComposioHQ / VoltAgent lists | 15k / 76k / 25k, none / Apache-2.0 (README) / MIT, Apr / Sep / Sep | Stale / promotional / generic personas |
| dequelabs/axe-accessibility + axe-mcp-server-public | 0 and 8, MIT, Sep | Needs Axe DevTools subscription and API key; page context goes to Deque |
| WAVE; Accessibility Insights for Web | n/a; 954, MIT, 15 Sep | API is paid credits; the Edge extension is free, human-driven |
| community-access/accessibility-agents | 420, MIT, 23 Sep | Edit-blocking hook |
| lackeyjb/playwright-skill; BackstopJS | 3.2k / 7.2k, MIT, 1 Oct / 8 Sep | Redundant; BackstopJS only for before/after CSS refactors |
| reg-suit; Percy; Chromatic | 1.3k, MIT; 88; n/a | Cloud, CI or accounts: poor fit |
| Lighthouse CI; WebPageTest | 7.1k, Apache-2.0, 27 Mar; 3.3k, unclear, Sep 2025 | CI gating; WebPageTest API is Pro-only |
| PageSpeed Insights API | n/a | Free; key advisable, anonymous quota shared and often 429 (UNVERIFIED officially) |
| alirezarezvani/claude-skills | 27.2k, MIT, 26 Aug | `page-cro` script UNVERIFIED |
| AgriciDaniel/claude-seo; squirrelscan | 18.2k / 270, MIT, 29 Sep / 2 Oct | hreflang and CWV audits, overlap SEO-SOP; squirrelscan is v0.0.x, 295 rules, no browser |
| persian-tools; Vazirmatn | 1.2k, MIT, 28 Sep; 3.2k, OFL-1.1 | JS library for digits and Arabic letters, no CLI; font |
