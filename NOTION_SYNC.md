# Updating `exercise_library.json` from Notion

The website (`program.html`) reads `exercise_library.json` at page load to map exercise names to video URLs. That file is **generated** — the source of truth is the Notion "Exercise Library" database. This guide covers how to regenerate it.

---

## TL;DR (every time you change videos in Notion)

```
cd C:\Users\amirf\Documents\GitHub\Website
python sync_notion.py
git add exercise_library.json
git commit -m "Sync exercise library"
git push
```

The site picks up the new file on next page load.

---

## One-time setup

You only do these steps once per machine.

### 1. Create a Notion integration

1. Go to https://www.notion.so/profile/integrations.
2. Click **+ New integration**.
3. Name it (e.g. "Website Sync"), pick your workspace, click **Save**.
4. On the next screen, copy the **Internal Integration Secret** — it starts with `ntn_…` or `secret_…`. Treat it like a password.

### 2. Save the token to a file

Save the secret as plain text in `C:\Users\amirf\Documents\GitHub\Website\.notion_token` (no quotes, no extra newline).

PowerShell one-liner — replace `PASTE_TOKEN_HERE`:

```powershell
Set-Content -NoNewline -Path "C:\Users\amirf\Documents\GitHub\Website\.notion_token" -Value "PASTE_TOKEN_HERE"
```

Or open Notepad → paste the token → Save As → "Save as type" set to **All Files** → name `.notion_token`.

`.notion_token` is already in `.gitignore`. Never commit it.

> Alternative: instead of the file, set the `NOTION_TOKEN` environment variable. The script checks the env var first, then the file.

### 3. Connect the integration to the database

This is the step people miss — without it the script returns 403/404 even with a valid token.

1. Open the Exercise Library DB in Notion.
2. Click the **…** menu in the top right of the database page.
3. **Connections** → **Connect to** → pick the integration you made in step 1.

---

## Running the sync

From the project folder:

```
cd C:\Users\amirf\Documents\GitHub\Website
python sync_notion.py
```

What it does:

- Hits the Notion API, paginates through every row of the Exercise Library DB.
- Reads each row's **Exercise Name** (title) and **Video URL** (url) properties.
- Writes a sorted `{ "Exercise Name": "video_url" }` JSON to `exercise_library.json`.
- Prints how many entries it pulled, how many have video URLs, and lists the ones still missing a URL (so you know what to fill in next).

Then commit `exercise_library.json` and push.

---

## Database ID

Hard-coded at the top of `sync_notion.py`:

```
DATABASE_ID = "7e26b3d6-cc53-466a-8ce9-2b11835fe2c0"
```

If you ever move or recreate the database, update this constant. The 32-char ID is the part of the database URL after the workspace slug and before the `?v=` query string.

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `Notion token not found` | No `.notion_token` file and no env var | Re-do setup step 2 |
| `401 Unauthorized` | Token wrong or expired | Regenerate at notion.so/profile/integrations, update `.notion_token` |
| `403 Forbidden` | Integration not connected to DB | Re-do setup step 3 |
| `404 Not Found` | `DATABASE_ID` is wrong, or DB was deleted | Update the constant in `sync_notion.py` |
| `Could not reach Notion` | Network issue | Check internet, retry |

---

## Adding a new exercise

1. In Notion: add a row to the Exercise Library DB. Set **Exercise Name** (the title) and paste the **Video URL**.
2. Run `python sync_notion.py`.
3. Commit and push `exercise_library.json`.

That's it — `program.html` automatically finds the URL by name.

---

## Bulk-importing exercises

If you have a list of exercise names you want to seed into Notion (e.g. from `exercises_for_notion.json`):

- Easiest: paste the names into Notion's table view, one per row in the Name column. Then add Video URLs as you find them.
- Programmatic alternative: write a one-off script that uses the same Notion REST API + token to POST new pages. Mirror the approach in `sync_notion.py`.

---

## Why not just edit `exercise_library.json` directly?

You can — but you'll lose the change next time you sync from Notion. Notion is the source of truth; the JSON is a snapshot. Always edit in Notion, then re-run the sync.
