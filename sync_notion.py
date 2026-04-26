#!/usr/bin/env python3
"""
sync_notion.py
==============
Pulls every exercise from the Notion "Exercise Library" database and writes
exercise_library.json next to this script.

The website (program.html) reads exercise_library.json at page load to get
video URLs by exercise name, so this script is the ONLY thing you need to
run when Notion changes.

USAGE
-----
1.  One-time setup:
       a. Go to https://www.notion.so/profile/integrations and click
          "+ New integration". Name it whatever (e.g. "Website Sync"),
          attach it to your workspace, and copy the "Internal Integration
          Secret" (starts with "ntn_..." or "secret_...").
       b. Open your Exercise Library database in Notion. Click the "..." menu
          (top right), choose "Connections" -> "Connect to" -> pick the
          integration you just made.
       c. Either set the env var NOTION_TOKEN, or create a file `.notion_token`
          in this folder containing only the token text.
2.  Every time you update Notion:
       python3 sync_notion.py
3.  Commit the regenerated exercise_library.json with your other site files.

CONFIG
------
Database ID is hard-coded below. If you ever move the database, update
DATABASE_ID with the 32-char ID from the database URL.
"""

import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path

# ----------------------------------------------------------------------------
DATABASE_ID = "7e26b3d6-cc53-466a-8ce9-2b11835fe2c0"
NOTION_VERSION = "2022-06-28"
OUTPUT_PATH = Path(__file__).parent / "exercise_library.json"
TOKEN_FILE = Path(__file__).parent / ".notion_token"
# ----------------------------------------------------------------------------


def load_token():
    token = os.environ.get("NOTION_TOKEN", "").strip()
    if token:
        return token
    if TOKEN_FILE.exists():
        return TOKEN_FILE.read_text(encoding="utf-8").strip()
    sys.exit(
        "ERROR: Notion token not found.\n"
        "Set the NOTION_TOKEN env var, OR create a file `.notion_token` in\n"
        f"  {TOKEN_FILE.parent}\n"
        "containing only the integration secret."
    )


def post(url, token, payload):
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Notion-Version": NOTION_VERSION,
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        msg = e.read().decode("utf-8", errors="replace")
        sys.exit(
            f"ERROR: Notion API returned {e.code}.\n"
            f"  {msg}\n"
            "Common causes:\n"
            "  - Token is wrong or expired -> regenerate at notion.so/profile/integrations\n"
            "  - Database isn't shared with the integration -> '...' menu -> Connections\n"
            "  - DATABASE_ID is wrong -> check the URL of your Exercise Library"
        )
    except urllib.error.URLError as e:
        sys.exit(f"ERROR: Could not reach Notion ({e.reason}). Check your internet.")


def get_title(prop):
    """Notion title property -> plain text string."""
    items = prop.get("title", []) if prop else []
    return "".join(item.get("plain_text", "") for item in items).strip()


def get_url(prop):
    """Notion url property -> string or empty string."""
    if not prop:
        return ""
    return (prop.get("url") or "").strip()


def fetch_all_pages(token):
    url = f"https://api.notion.com/v1/databases/{DATABASE_ID}/query"
    pages = []
    payload = {"page_size": 100}
    while True:
        data = post(url, token, payload)
        pages.extend(data.get("results", []))
        if not data.get("has_more"):
            break
        payload = {"page_size": 100, "start_cursor": data["next_cursor"]}
    return pages


def main():
    token = load_token()
    print(f"Querying Notion database {DATABASE_ID}...")
    pages = fetch_all_pages(token)
    print(f"  {len(pages)} entries fetched.")

    library = {}
    blank_url = []
    duplicate_names = []

    for page in pages:
        props = page.get("properties", {})
        name = get_title(props.get("Exercise Name"))
        if not name:
            continue
        video = get_url(props.get("Video URL"))
        if name in library:
            duplicate_names.append(name)
            # Keep the entry that has a URL if one is empty
            if not library[name] and video:
                library[name] = video
            continue
        library[name] = video
        if not video:
            blank_url.append(name)

    # Sort for stable diffs in git
    library = dict(sorted(library.items(), key=lambda kv: kv[0].lower()))

    OUTPUT_PATH.write_text(
        json.dumps(library, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    with_url = sum(1 for v in library.values() if v)
    print()
    print(f"Wrote {OUTPUT_PATH.name}")
    print(f"  total entries:    {len(library)}")
    print(f"  with video URL:   {with_url}")
    print(f"  missing video:    {len(library) - with_url}")
    if duplicate_names:
        print(f"  duplicate names:  {len(duplicate_names)}  (kept the one with a URL)")
        for n in sorted(set(duplicate_names))[:10]:
            print(f"    - {n}")
    if blank_url and len(blank_url) <= 30:
        print()
        print("Entries still missing a Video URL in Notion:")
        for n in sorted(blank_url):
            print(f"  - {n}")
    elif blank_url:
        print(f"\n({len(blank_url)} entries still missing Video URL — check Notion.)")


if __name__ == "__main__":
    main()
