# Video archive

Every video we make or keep, in one place, with what it shows, where it came from and where it was used, so **the next ad starts
from what already exists** instead of from new credits. Started 2026-09-21, when Amir said: *"you are gonna make loads of
advertisement for me, so have an archive of all the videos I created so we may need them later."*

- **Amir:** double-click **`index.html`**. Filter by type, search by what you want to see (dust, night, sprint, hook), click a card to
  play it and read its prompt and settings.
- **Claude:** read **`INDEX.md`** (or grep it) before you generate any clip. Search by what a clip *shows*, not by its name. That is
  rule 2 of the spend protocol in `.claude/skills/video/SKILL.md`, and it is how a clip that cost 3 credits gets a second life for free.

## What is in it (35 entries on 2026-09-21)

| Folder | What | In git? |
|---|---|---|
| `clips/` | generated clips (Higgsfield) with their start pictures (`.webp`), and small overlays | yes |
| `app-clips/` | the eight app explainer clips (silent cutaways built as HTML) | yes |
| `reels/` | finished ad exports: the MP4s that get posted | **no**: big and rebuildable; OneDrive backs it up |
| `private/` | anything with a real person or a restricted likeness, and its posters | **no**: OneDrive only |
| `posters/` | one frame per video, for the gallery | yes |
| `catalog.json` | the data: the source of truth | yes |
| `INDEX.md`, `index.html` | written by `archive.py build`; never edit by hand | yes |

Kinds: `reel` (a finished ad), `generated` (a Higgsfield clip), `app-clip`, `asset` (an overlay), `footage` (our own camera video).
A cloud session only has what is in git, so `reels/` and `private/` are missing there.

## Rules

1. **Archive every clip the moment it is downloaded** (`/video` Step 7). Keep the ORIGINAL, untrimmed file with its sound track if it
   has one, its start picture and its prompt. A reel's trimmed `masters/` belong to the reel, not here.
2. **Copy each finished reel's MP4 here when it is exported** (`/reel` Step 10), into `reels/`.
3. **Real people stay private.** Footage of a real person (Amir, a client, a player), and any clip made from a photo of one, is added
   with `--private` (it goes to `private/`, which git ignores). A clip made from someone's likeness also gets `--restricted "why"`,
   and **a RESTRICTED entry is never used in an ad** without that person's permission. Four clips are marked this way today: they
   were made from an uploaded photo of a real-looking player.
4. **Never archive other people's footage** (match broadcasts, downloaded videos). It is not ours to keep or to use.
5. **Size.** Git holds about 76 MB of this now. Past roughly 500 MB tracked, ask Amir, then move the oldest unused originals to
   `private/` (OneDrive only) or set up Git LFS. Finished reels never go in git.
6. The catalogue text must be true. Describe a clip from what you SAW (a contact sheet, `clip_check.py`), say when you did not
   check it frame by frame, and write the usable range and any face, logo or person problem in `usable` and `notes`.

## Add a video

```
python Content/video-archive/archive.py add <file> --id chalk-grip --kind generated --date 2026-09-20 \
  --title "Chalked grip" --shows "what it shows, in plain words" --tags gym,chalk,slow-motion \
  --usable "0-1.55 s only" --used-in reel-8-course --notes "..." \
  --json '{"credits": 4, "higgsfield": {"job_id": "...", "model": "Cinema Studio v2", "settings": "std, slowmo, sound off, 3 s, 9:16",
           "prompt": "...", "start_image": {"job_id": "...", "file": "clips/2026-09-20_chalk-grip_start.webp"}}}'
```

`add` COPIES the file (never moves or deletes the original), probes it, cuts a poster, writes the entry into `catalog.json` and
rebuilds `INDEX.md` and `index.html`. From Python, `import archive; archive.add(path, entry)` does the same with a dict (the first
load of this archive was done that way), and `archive.store_picture(png, "clips/<date>_<id>_start.webp")` stores a start picture as
WebP. `python archive.py check` proves every catalogued file is where the catalogue says. It needs ffmpeg
(`python -m pip install --user imageio-ffmpeg`, see `.claude/skills/reel/tools/README.md`) and Pillow.

## Where each thing came from (2026-09-21)

- **Higgsfield: all 18 videos in Amir's account** (`show_generations`): the four made for Reel 8, and his own 14 from 2026-09-02, of
  which 6 were in his Downloads folder and 8 existed only online. Higgsfield still served the September clips 19 days later, but it
  is not an archive: a copy here is the copy that counts.
- The three reel exports (Reel 7, Reel 8 hooks A and B). An identical copy of Reel 7 also sits on Amir's Desktop.
- The eight app clips and two FAST FEET overlays from his Downloads folder.
- Own camera footage: a selfie (private); a 10.8 s indoor-court clip that is the same file as `coach-site/media/court.mp4`, so it is
  listed, not copied; and the two big files below.

## Not archived, and why

- **`IMG_4315.MP4` (385 MB) and `0807.mp4` (212 MB):** Amir talking to camera about the short form, raw and edited, both 4K and
  78.9 s. They are **listed** (`form-talk-raw`, `form-talk-edit`) but not copied, because copying would upload about 600 MB to his
  OneDrive. Copy them in when he says so. They are in his Downloads folder, which is not backed up.
- **`Video Project.mp4` and the whole `Video/` folder in Downloads:** other people's match footage (Dimitrov, Alcaraz). Not ours.
