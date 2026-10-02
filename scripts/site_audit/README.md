# Site audit tools

Repeatable before/after measurements for the public website (written 2026-10-02 for the website review in
`Content/SITE-AUDIT.md`). **Amir never runs these.** Ask Claude to "re-run the site audit" and compare with the
baseline numbers in that file.

What they do, in plain words: open every public page in a real Chrome at phone, tablet and desktop width,
cut a full-page screenshot into readable tiles, and measure what the eye cannot (text contrast, tap-target sizes,
unlabelled controls, tiny text, images, fonts, load times on a slow phone, Farsi typography checks, layout shift).
Nothing is sent anywhere: analytics (`plausible.io`) is blocked on every run so audit visits never count as real
visitors, and no form is ever submitted.

| File | Use |
|---|---|
| `capture.js` | The main run: screenshots (tiles) + probe + request log, per page x viewport. `--pages a,b\|all`, `--vp mobile,small,tablet,desktop,wide`, `--throttle` (slow 4G + 4x CPU, no screenshots), `--noshots` |
| `probe.js` | The in-page measurements (read-only). Loaded by `capture.js` |
| `pages.json` | The page list (add a page here when the site gets one) |
| `digest.py` | One page's facts on one screen: `python digest.py home-en mobile` |
| `scoreboard.py` | All pages in two tables (speed on slow 4G; layout / accessibility / copy) |
| `contact.py` | A contact sheet of a page's tiles: `python contact.py <dir> sheet.png 8 190` |
| `shot.js` | One REAL-viewport screenshot (scroll to a selector, click, press Tab): use it to verify a suspected visual bug before reporting it. Full `https://` URLs and `C:/` output paths only |
| `cls.js` | Which elements cause layout shift on a slow phone |
| `linkcheck.js` | Tests every internal link the probes found |
| `static_scan.py` | Source scan: palette conformance, no-gold check, fonts, breakpoints, token drift |

## Running it

```
set NODE_PATH=C:\Users\Amir\AppData\Local\npm-cache\_npx\9833c18b2d85bc59\node_modules   (the Playwright plugin's copy of playwright-core;
                                                                                          if that folder is gone: npm i playwright-core in a temp folder, see .claude/skills/reel/tools/README.md)
set AUDIT_OUT=%TEMP%\site-audit\before           (default is %TEMP%\site-audit\out; never write into the repo, OneDrive would sync it)
node scripts/site_audit/capture.js --pages all --vp mobile,tablet,desktop
node scripts/site_audit/capture.js --pages all --vp small --noshots
node scripts/site_audit/capture.js --pages all --vp mobile --throttle
python scripts/site_audit/scoreboard.py
```

- `AUDIT_BASE=http://localhost:8000` points it at a local `python -m http.server` (to check a change before it ships).
- Git Bash rewrites a leading `/` in arguments: pass full URLs, or set `MSYS_NO_PATHCONV=1`.
- Uses the installed Chrome (falls back to Edge). Python is `python`, not `python3`, on this PC.

## Lessons (so nobody repeats them)

1. **A full-page screenshot is not proof.** Scroll-driven draw-on animations (the contact-card icons) looked like empty
   circles in a frozen capture and were fine for a real visitor. `shot.js` shows what a visitor sees. Check before claiming.
2. The site uses `scroll-behavior: smooth`: scripts that scroll must switch it off first or they measure mid-scroll.
3. The probe's contrast check cannot see through a photo behind text (it can flag a false 1:1): confirm those visually.
4. Lab numbers (slow 4G + 4x CPU) are simulated, from this PC in the UK. They say nothing about Iran: `/reach/` does.
