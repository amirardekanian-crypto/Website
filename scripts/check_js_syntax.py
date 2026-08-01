#!/usr/bin/env python3
"""Syntax-check every inline <script> block in one or more HTML files.

Why this exists: habits.html is a single file with its whole app in one
inline <script>, and HTML comments inside its JS template literals have
twice shipped a stray backtick — which silently terminates the template
literal, breaks the entire script, and leaves the app stuck on its loading
screen with NOTHING in the browser console (see the 2026-08-01 commits that
found this the hard way, twice, in one afternoon). A syntax error like that
is invisible to grep and invisible to eyeballing a diff; it is only visible
to a JS parser. This gives every commit one.

Two checks, run in order:

  1. A deterministic regex pass for the EXACT failure pattern: a backtick
     character sitting inside an HTML comment (<!-- ... -->). This is the
     only check in this file guaranteed to catch it every time — the browser
     check below (step 2) is NOT reliable for this pattern, because a stray
     backtick does not always throw. It closes the current template literal
     early, and the next real backtick anywhere later in this backtick-heavy
     file can resync the parser into something syntactically valid but
     semantically ruined. Proven empirically: reintroducing the exact bug
     that broke the app for real, twice, into the file's CURRENT state did
     NOT reproduce a thrown error or a boot failure a third time — it
     resynced harmlessly by chance. A check that only fires "when we get
     lucky" is not a check. Comment prose must never contain a backtick;
     use plain quotes or no quoting at all for inline code mentions.

  2. A real parse check: each inline <script> (anything without a src=
     attribute) is pulled out, base64-encoded, and handed to
     `new Function(source)` inside a throwaway page run through headless
     Edge or Chrome. new Function() parses the code without executing its
     top-level body, so this reports a genuine SyntaxError without needing
     the DOM, fetch, or any of the app's real runtime to be present. This
     catches other syntax mistakes (unbalanced braces, stray quotes) that
     check 1 does not cover — but per the note above, do not rely on it
     alone for the backtick-in-comment case. No third-party dependency, no
     Node install — Edge or Chrome already ships on this machine and is
     likely on any machine that would edit this repo.

For the strongest guarantee specific to habits.html — that the app actually
boots, not just that it parses — see check_habits_boots.py, which this
script's caller (the pre-commit hook) runs alongside it.

Usage:
    python scripts/check_js_syntax.py habits.html [more.html ...]

Exit code is 0 if every inline script in every file passes both checks; 1
otherwise, with the offending file, line, and a clear message printed.
"""
import base64
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

# <!-- ... --> can itself span multiple lines, and its content is never real
# JS/HTML markup (just prose), so DOTALL + non-greedy is exactly right here.
HTML_COMMENT_RE = re.compile(r"<!--(.*?)-->", re.DOTALL)


def find_backtick_comments(js_source: str):
    """Return (line_number, snippet) for every HTML comment containing a
    backtick, with line numbers relative to the start of js_source."""
    hits = []
    for m in HTML_COMMENT_RE.finditer(js_source):
        body = m.group(1)
        if "`" not in body:
            continue
        # Line number of the backtick itself, not just the comment's start —
        # a comment can run twenty lines and "somewhere in there" is not a
        # location.
        rel_offset = body.index("`")
        line_no = js_source.count("\n", 0, m.start(1) + rel_offset) + 1
        col_start = max(0, rel_offset - 30)
        snippet = body[col_start:rel_offset + 30].replace("\n", " ")
        hits.append((line_no, snippet.strip()))
    return hits

BROWSER_CANDIDATES = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
]

SCRIPT_RE = re.compile(
    r"<script(?![^>]*\bsrc\s*=)[^>]*>(.*?)</script>", re.IGNORECASE | re.DOTALL
)

HARNESS = """<!doctype html><meta charset="utf-8"><body></body><script>
try {{
  const src = atob("{b64}");
  new Function(src);
  document.title = "OK";
}} catch (e) {{
  document.title = "ERR::" + e.name + "::" + e.message;
}}
</script>"""


def find_browser():
    for c in BROWSER_CANDIDATES:
        if Path(c).is_file():
            return c
    # PATH fallback, in case a future machine doesn't match the hardcoded list.
    for name in ("msedge", "msedge.exe", "chrome", "chrome.exe", "google-chrome"):
        p = shutil.which(name)
        if p:
            return p
    return None


def to_file_url(path: Path) -> str:
    # Headless Edge/Chrome need real backslash-free Windows paths in the URL —
    # a raw Windows path (or a POSIX-style /tmp path a Bash tool might pass
    # through unconverted) both produce a silent net::ERR and an error-page
    # DOM instead of the harness, which reads as a false failure. as_posix()
    # on a Windows Path already gives the forward-slash form file:// wants.
    return "file:///" + path.resolve().as_posix()


def check_block(browser: str, js_source: str, tmpdir: Path, idx: int):
    if not js_source.strip():
        return None  # empty inline script (e.g. a JSON-LD block) — nothing to parse
    b64 = base64.b64encode(js_source.encode("utf-8")).decode("ascii")
    harness_path = tmpdir / f"probe_{idx}.html"
    harness_path.write_text(HARNESS.format(b64=b64), encoding="utf-8")
    result = subprocess.run(
        [
            browser,
            "--headless=new",
            "--disable-gpu",
            "--no-sandbox",
            "--virtual-time-budget=4000",
            "--dump-dom",
            to_file_url(harness_path),
        ],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=30,
    )
    m = re.search(r"<title>(.*?)</title>", result.stdout, re.DOTALL)
    title = m.group(1) if m else "(no <title> in dumped DOM — browser launch itself failed)"
    if title.startswith("ERR::"):
        _, name, message = title.split("::", 2)
        return f"{name}: {message}"
    if title != "OK":
        return f"unexpected harness output: {title!r}"
    return None


def main(argv):
    if len(argv) < 2:
        print("usage: check_js_syntax.py <file.html> [more.html ...]", file=sys.stderr)
        return 2
    browser = find_browser()
    if not browser:
        print(
            "check_js_syntax: no Edge or Chrome found - cannot syntax-check. "
            "Install one of them, or extend BROWSER_CANDIDATES in this script.",
            file=sys.stderr,
        )
        return 2

    comment_failures = []
    parse_failures = []
    with tempfile.TemporaryDirectory(prefix="jscheck_") as td:
        tmpdir = Path(td)
        for filearg in argv[1:]:
            path = Path(filearg)
            if not path.is_file():
                print(f"check_js_syntax: skipping missing file {filearg}", file=sys.stderr)
                continue
            html = path.read_text(encoding="utf-8", errors="replace")
            for i, m in enumerate(SCRIPT_RE.finditer(html)):
                block = m.group(1)
                block_start_line = html.count("\n", 0, m.start(1)) + 1

                # Check 1: deterministic, catches the exact known failure
                # every time regardless of how the parser would resync.
                for local_line, snippet in find_backtick_comments(block):
                    real_line = block_start_line + local_line - 1
                    comment_failures.append((str(path), real_line, snippet))

                # Check 2: a real parser, for everything else.
                err = check_block(browser, block, tmpdir, i)
                if err:
                    parse_failures.append((str(path), i, err))

    if comment_failures or parse_failures:
        print("\nJS SYNTAX CHECK FAILED\n" + "=" * 60)
        for path, line, snippet in comment_failures:
            print(f"  {path}:{line}  backtick inside an HTML comment: ...{snippet}...")
        for path, i, err in parse_failures:
            print(f"  {path}  (inline <script> block #{i}):\n    {err}\n")
        print(
            "A syntax error in one inline <script> silently breaks the WHOLE "
            "block - the app boots to a stuck loading screen with nothing in "
            "the console. A backtick inside an HTML comment (<!-- ... -->) "
            "sitting inside a JS template literal is the known repeat cause: "
            "rewrite the comment without backticks (use plain quotes, or no "
            "quoting at all, for inline code mentions).",
            file=sys.stderr,
        )
        return 1

    print(f"check_js_syntax: OK ({len(argv) - 1} file(s) checked)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
