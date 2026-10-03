# The Motion Menu and /cut: how they are connected

Amir's **Motion Menu** is an artifact he made for himself: one place for all his motion graphics, to see, to drop, to add and to edit.
`https://claude.ai/artifact/REg9vwGxmf4pddShMtZemA` (private, his). On 2026-10-01 he asked for `/cut` to be **actually connected** to it ("these are all ingredients, the simplest
form to exist, so you understand and find them quickly and use them quickly to edit videos"), and then for a **tidy-up**: same job, same place; remove what will not be used on his
talking videos or for his business; fix duplicates; know when and how to use each one. The menu went from 224 items to **78 cards** (version 7).

**The numbers clash with the showreels** (menu 41 was Spring Lab, showreel 41 is the diagram chain): always say "menu N" or "showreel N". A removed number is never used again;
the next new card is **226** (the ledger is `Content/motion/numbers.json`, see "One source").

## How it is built
| Where | What |
|---|---|
| `menu/menu.json` (version 2) | **The source of the whole menu.** `groups` (display order), `items` (every card, in display order) and `retired` (everything that left: number, name, and `why` or `into`). Edit this. |
| the page (artifact) | Generated from the manifest by `tools/menu_patch.py`. Never edit its data by hand. |
| the page's database | `marks` (his Keep / Maybe / Drop, his rename and note: one doc per card id) and `adds` (ideas he adds with + Add). Only he writes marks. |
| `kit/sfx/` + `kit.py` | Every sound card is a file here. `kit.py` reads the sound cards of `menu.json` into the `SFX` table, so `sfx=[(E(t), "thump")]` plays the card called Thump. The 11 old names (pop, ding, thock, hit, stamp, step, rise, tick, roll, swipe, whoosh) still work. |
| `Content/motion/numbers.json` (in the website repo) | The one ledger of menu numbers. It is the only file left in `Content/motion/`: the lab that used to sit there was deleted on 2026-10-02. |
| `menu/archive/` | The /cut-only manifest this started from and the page as it was before the tidy (version 6). |
| `menu/tidy_2026-10-01.py` | The record of the tidy: every one of the 224 old items, what was decided and why. Do not run it again. |

**A card** (fields in `menu.json`): `id`, `no`, `group`, `kind` (visual, sound, feel, look, rule), `name`, `label` (what it is, in plain words), **`when`** (when you would use it),
**`how`** (the call to copy, or "Not built."), `takes` (what can change), `farsi` (yes: works as it is, words: whole words only, none), `used`, `pairs` (sounds that go with it),
`like` ("Close to"), `cut` (`K.block`, `plan` for the cut plan, `sfx` for a sound, empty for an idea not built), `aka` ("Also called": the old cards it swallowed, with their numbers),
`alts` (the forms of one card: `[{k: clip key, l: button label}]`, for example On your video | Full card), `said` (his verdict in his words), `mark` (the mark his words implied),
`sample` (`{showreel, t0, t1, poster}`: where its clip comes from). A sound card also has `file`, `dur`, `vol` and `track` (what `kit.py` plays) and `page_audio` when the page
must play a different file from the kit's (the Whoosh). The page shows "Ready in /cut" for every card with a `cut`.

## One source (decided by Amir on 2026-10-01: "one source")
The website repo's `Content/motion/` was the page's FIRST builder (the "lab": `catalog.json` with 183 pieces, canvas pieces in `kit/`, `lab.html`, `tools/clips.js`, `tools/sounds.py`,
`tools/build_menu.py`, the menu samples). It made items 1-183 and their samples on 2026-10-01. It was settled the same night, and on **2026-10-02 Amir had the lab deleted** (the Reels folder's
`menu-samples`, `kit-showreel`..`kit-showreel6`, `hctv3230`, `raw` and `_tests` went too). It is not committed: `git restore Content/motion` in the repo brings the lab back.
- **The live page is built ONLY from `kit/menu/menu.json` by `tools/menu_patch.py`.** Nothing else publishes it.
- **One ledger of numbers: `Content/motion/numbers.json`**, the only file left in that folder (id to number, never reused; 1 to 225 are taken, `next` is 226). A card's `no` in `menu.json` must be the ledger's number for its id, and `menu_patch.py`
  stops with a PROBLEM if it is not. A new card: take `next` from the ledger, add the id and number there, use the same number in `menu.json`, raise `next`. `catalog.py`, which used to number lab pieces, is gone: nothing else writes to the ledger.
- **"Not built." on a card means not built as a /cut block** (Hyperframes). Several of those ideas (Range, Stat Chart, Cross Out, Pivot, Heartbeat, Dial) were canvas pieces in the old lab; they are
  gone from disk (they remain in the repo's git history). Port the idea to a /cut block when a reel needs it. A card's sample now comes only from a showreel (`tools\menu_samples.py`, step 3 below).
  The clips already live on the page stay as they are: `menu_patch.py` only needs `--samples` for a card whose clip is new or is being republished.

## 1. Before a reel: read the menu (creative director, step one)
```
Artifact   action:"read"  url:https://claude.ai/artifact/REg9vwGxmf4pddShMtZemA          -> saves the page, prints the path
ArtifactData action:"list" url:<same> collection:"marks" query:{"limit":1000} out_dir:<scratch>\db
ArtifactData action:"list" url:<same> collection:"adds"  query:{"limit":1000} out_dir:<scratch>\db
python C:\Users\Amir\.claude\skills\cut\tools\menu_read.py <saved page> --marks <scratch>\db\marks --adds <scratch>\db\adds
```
The digest prints Keep (use first), Maybe (ask him), Drop (see below), his names and notes, the ideas he added, and what is built in /cut by group.
- **Keep**: use it first. **Maybe**: put it in the plan as a question. **No mark**: fine to use when the cue table says so.
- **Drop**: never use it, and it leaves the menu at the next tidy-up (section 3).
- **His name for it** (`alias`) is what we call it in the plan. **His note** is an instruction. **An idea he added** (`adds`, status `new`) is a request: build it (section 2).
- To look a card up without the network: `python tools\menu_find.py <word>` (name, what it is, When, How, old names, his verdict), `menu_find.py 206` for a number or an
  old number (it says where a removed card went), `--all` for the whole menu by group, `--retired` for what left.

## 2. Something is missing: build it, then add the card
1. **Build the block** in the kit as always (`kit.js` / `kit.css`, a demo in a showreel build script, a `BLOCKS.md` row with "do NOT use it when", the cue table). `USAGE.md` rules stand.
2. **Add a card to `menu.json`**: the group it belongs to (same job, same place: look at the group before you make a new one), the next free `no` from the ledger (`Content/motion/numbers.json`: add the id there too and raise its `next`), `label`, `when`, `how` (a real call),
   `takes`, `farsi`, `pairs` (sound ids that exist), `like`, `cut`. If it is only a new form of an existing card, add an `alts` entry instead of a new card.
3. **Make its sample** from the showreel: `python tools\menu_samples.py prepare` (once per showreel), `render <N>`, then `cut <id>` (a form's key works too). 450x800, no sound, no burned-in label.
   `prepare` re-creates `C:\Users\Amir\Videos\Reels\menu-samples\` (deleted on 2026-10-02, about 1.8 GB when full) and needs the showreel folders it copies from, which were deleted too: rebuild the showreel first, and delete `menu-samples` again after publishing.
4. **A new sound**: put the file in `kit/sfx/`, add a sound card with `file`, `dur` (the audible part), `vol` (set against the old sounds: effective peak around -9 for a hit, -14 for a tick, -20 for a bed), `track` (the next free number). The patch tool builds its page audio and waveform.
   **Then measure it: `python tools\sfx_lead.py --write`** (adds the file to `kit/sfx/timing.json`: when it really starts, hits, peaks and ends). A swell, a riser or a build-up needs `"align": "peak"` in that file and the odometer roll `"end"` (the tool's `ALIGN` table has the known ones; everything else is a sharp hit, `"onset"`).
   Without it a new reel (`sfx_align=True`) places the sound on its start, late by the file's own lead (the menu's mp3 files start 0.12 s in). `python tools\sfx_proof.py` renders a test reel and proves every hit lands on its frame.
5. **Build the page**: `python tools\menu_patch.py <saved live page> --out <scratch>\menu\patched.html --stage <scratch>\menu\stage --samples C:\Users\Amir\Videos\Reels\menu-samples\out > patch.log` (leave `--samples` out when no card has a new clip).
   It stops (and writes nothing) when the page has a card the manifest does not know, and prints PROBLEMS for every bad reference. Fix them. It prints FILES TO PUBLISH and FILES TO REMOVE.
6. **Test it locally**: `python tools\menu_test_site.py <patched> <scratch>\menu\site --seed-add`, `python -m http.server 8766 --bind 127.0.0.1` in that folder, look at it in Playwright (a card, a form button, search, + Add, a sound, a reload, the console for a TypeError; the 404s for posters not copied into the test folder are noise). **Stop the server afterwards.**
7. **Publish** with `Artifact` (`url`, `file_path` = the patched page, `root` = the stage folder, `files` = a map: each file to add as `"path": "path"`, each file to remove as `"path": null`). Omit `capabilities`. Never `force`.
   `root` must sit under the working directory or the scratchpad. At most 255 entries per publish. **Read the live page first with `Artifact read` WITHOUT `path`** (a read of `index.html` alone does not count for a republish).
8. **Marks his words imply**: `python tools\menu_patch.py marks --existing <ids that already have a mark>` prints an `ArtifactData` batch. Write only for cards with no mark. Tell him you did it.
9. **Close an add**: `ArtifactData update` on `adds/<id>` with `{status:"built", builtAs:<card number>}` (pin it with the `version` the list showed). The idea leaves "Yours".
10. **Check**: `Artifact read` again, run the digest, and say what changed in plain words.

## 3. A tidy-up (what he asked on 2026-10-01; do it again when the menu fills up)
1. Read the marks (section 1). **Anything he marked Drop leaves. Anything he marked Keep stays**, even if you would have merged it. Look at what nobody has judged.
2. For every card ask three things. Is it the same job as another card? (Merge: the survivor gets an `aka` entry with the old name and number, or an `alts` form.) Will it be used on a talking
   video or for his business? (If not, retire it.) Can you say **when** you would use it and **how**? (If you cannot, it is not an ingredient yet: write it or retire it.)
3. In `menu.json` move each leaver into `retired` (`{id, no, name, why}` or `{id, no, name, into, intoName}`) and delete its card. Regroup what is left: same job, same place.
4. Build, test, publish (section 2, steps 5 to 7). The files of every card that left are in FILES TO REMOVE.
5. **Delete the marks of the cards that left** (`ArtifactData batch`, op `delete`, `if_version` from the list). The page also drops them from a phone, so they do not come back.
6. Tell him in plain words: how many cards, what left (by group, with numbers), what was merged into what, and that any number can be brought back (it is in `retired`).

## Traps (learned 2026-10-01)
- **The page's script is strict mode and the database hands back FROZEN snapshots.** Never write onto a `d.data()` (copy it with `Object.assign({}, v)` first). Version 5 did and an added
  idea would not have shown on his other device. The test copy freezes its snapshots too, so a mistake like that shows up there.
- **Changing the page's code later:** edit `JS*`/`CSS*` in `menu_patch.py` for new pages AND add a pair to `FIXES`, so a page patched by an older version gets the change (the tool does not
  re-patch a page that already has its marker: `cut-menu:1`, `cut-menu:2`).
- **He marks while you work** (he marked three cards Drop between two of my publishes). Read the marks again right before you publish.
- `kit.py` reads `menu.json` for the sounds, so `menu.json` must stay valid JSON, and a sound card needs its file in `kit/sfx/`.
- A `Remove-Item` in the repo's `.playwright-mcp` folder once deleted three tracked August logs: look with `git status` / `git clean -n` first and remove only untracked files.
- The mirror in the website repo (`.claude/skills/cut/`) is updated by `tools\sync_to_repo.py` and committed only when he says "go live".
