#!/usr/bin/env python3
"""Prove habits.html actually boots — not just that it parses.

Why this exists, and why check_js_syntax.py is not enough on its own: a
stray backtick inside an HTML comment that sits inside a JS template literal
does not reliably produce a SyntaxError. The backtick closes the CURRENT
template literal early, and the next real backtick anywhere later in this
very backtick-heavy file (every render function returns through one) can
resync the parser into something that is syntactically VALID but swallows
every statement in between as inert string data — including, in the two
real incidents this guards against, the final `(async () => { ... })()` boot
call at the bottom of the file. The result: the script parses cleanly, throws
nothing, and the app sits on its loading screen forever. That is exactly the
failure mode a syntax check cannot see and a human staring at a diff did not
either, twice, in one afternoon.

This is the check that actually would have caught both: serve the real repo,
load habits.html?client=demo for real, and confirm the app's own render()
call has put real content into #app — the one thing that only happens if
every statement between the top of the script and the boot call at the
bottom executed as code, not as string.

Usage:
    python scripts/check_habits_boots.py [path-to-habits.html]
Defaults to habits.html next to this repo's root if no path is given.
Exit code 0 if the app boots; 1 otherwise.
"""
import re
import shutil
import socket
import subprocess
import sys
import time
from pathlib import Path

BROWSER_CANDIDATES = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    # Linux, incl. the Playwright-managed Chromium the cloud sandboxes ship —
    # see the same list in check_js_syntax.py. Without these this guard exits 2
    # everywhere except Windows, so the boot it proves was never being proved.
    "/opt/pw-browsers/chromium/chrome-linux/chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
]
BROWSER_CANDIDATES += sorted(
    (str(p) for p in Path("/opt/pw-browsers").glob("chromium-*/chrome-linux/chrome")),
    reverse=True,
)

# Only appears in the DOM once renderApp() has actually run and replaced
# #app's initial empty markup — the single strongest "the whole script
# executed" signal available without instrumenting the app's own source.
BOOT_MARKER = 'data-k="apphd"'


def find_browser():
    for c in BROWSER_CANDIDATES:
        if Path(c).is_file():
            return c
    for name in ("msedge", "msedge.exe", "chrome", "chrome.exe", "google-chrome"):
        p = shutil.which(name)
        if p:
            return p
    return None


def free_port():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


def main(argv):
    repo_root = Path(__file__).resolve().parent.parent
    target = Path(argv[1]).resolve() if len(argv) > 1 else repo_root / "habits.html"
    if not target.is_file():
        print(f"check_habits_boots: {target} not found", file=sys.stderr)
        return 2
    if target.name != "habits.html" or target.parent != repo_root:
        print(
            "check_habits_boots: only checks habits.html served from the repo "
            "root (it needs data/demo.json et al at real relative paths) — "
            f"got {target}",
            file=sys.stderr,
        )
        return 2

    browser = find_browser()
    if not browser:
        print("check_habits_boots: no Edge or Chrome found - cannot check.", file=sys.stderr)
        return 2

    port = free_port()
    server = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(port), "--directory", str(repo_root)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        # The server binds almost instantly; this just avoids a race on a
        # loaded machine rather than polling a socket for one HTTP call.
        time.sleep(0.4)
        url = f"http://127.0.0.1:{port}/habits.html?client=demo"
        result = subprocess.run(
            [
                browser,
                "--headless=new",
                "--disable-gpu",
                "--no-sandbox",
                # Generous: demo mode still runs every network call in boot()
                # (they are all wrapped in a timeout and degrade gracefully),
                # and a loaded CI box is slower than the dev machine this was
                # tuned on.
                "--virtual-time-budget=8000",
                "--dump-dom",
                url,
            ],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=30,
        )
    finally:
        server.terminate()
        server.wait(timeout=5)

    if BOOT_MARKER in result.stdout:
        print("check_habits_boots: OK - app rendered real content into #app")
        return 0

    print("\nHABITS.HTML DID NOT BOOT\n" + "=" * 60, file=sys.stderr)
    print(
        f"Loaded {url} in headless {Path(browser).name}, waited, and #app "
        f"never received real content ({BOOT_MARKER} not found in the DOM). "
        "The script most likely parses without throwing but never reaches "
        "its own boot call - check_js_syntax.py alone would have said this "
        "file is fine. Look for a stray backtick inside an HTML comment "
        "sitting inside a JS template literal; that is what broke it both "
        "times before.",
        file=sys.stderr,
    )
    # A snippet of what #app actually contains helps distinguish "totally
    # empty" (script never ran at all) from "something rendered, but not
    # what we expected" (a different, real bug worth its own diagnosis).
    m = re.search(r'<div[^>]*id="app"[^>]*>(.*?)<div[^>]*id="tour"', result.stdout, re.DOTALL)
    if m:
        snippet = re.sub(r"\s+", " ", m.group(1)).strip()[:200]
        print(f"\n#app contents (first 200 chars): {snippet!r}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
