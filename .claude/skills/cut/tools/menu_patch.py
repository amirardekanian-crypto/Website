"""Build Amir's Motion Menu page (an Artifact) from the kit's manifest (kit\\menu\\menu.json, version 2: the WHOLE menu).

  python menu_patch.py <saved live page.html> --out <patched.html> --stage <folder> [--samples <dir>] [--republish-samples] [--rebuild-sounds] [--no-add]
  python menu_patch.py marks [--existing <ids...>]        print the db writes for the marks his verdicts imply (JSON, for an ArtifactData batch)

The saved page is the file the Artifact tool saves when you `read` the artifact (kit\\MENU.md says how). The manifest is the source: the page's groups and items are
REPLACED by the manifest's (in its order). Safety: if the page holds an item the manifest does not know (it is neither an item nor in `retired`), the tool stops and
writes nothing, so nothing is ever deleted by accident. A number never changes, and a retired number is never used again.

What it does
  data   groups, items (every kind), the clips map (own clip, Farsi variant and every form in `alts`) and the sounds map. A clip or sound that is not live yet is taken from
         --samples (clips/<id>.mp4, posters/<id>.jpg) or from kit/sfx (a sound whose page audio is rebuilt) and copied into --stage; the files to publish are printed.
         Files that nothing in the new data uses are printed as FILES TO REMOVE (pass each as null in `files`).
  page   marker `cut-menu:1` (once): the green /cut tag, "Close to", "You said", the "Ready in /cut" choice, and the "+ Add" button (his own ideas, saved in the page database
         collection `adds`). Marker `cut-menu:2` (once): When, How and Also called on every card, form buttons on a card with `alts` (Over your video | Full card ...), search over
         them, and the new lede, legend and footer. FIXES holds later corrections for a page an older version of this tool patched.
It checks every reference (sounds, look-alikes, groups, numbers, files).
"""
import json
import os
import re
import subprocess
import sys

KIT = r"C:\Users\Amir\.claude\skills\cut\kit"
MANIFEST = os.path.join(KIT, "menu", "menu.json")
SAMPLES = r"C:\Users\Amir\Videos\Reels\menu-samples\out"
FFPROBE = r"C:\Users\Amir\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffprobe.exe"
FFMPEG = FFPROBE.replace("ffprobe.exe", "ffmpeg.exe")
MARKER = "cut-menu:1"

CSS = r"""
.tag.cut{background:var(--green-soft);border-color:transparent;color:var(--green-ink);font:700 11px/1 'JetBrains Mono',ui-monospace,monospace}
.said{font-size:12.5px;color:var(--ink3)}
.said b{color:var(--ink2);font-weight:700}
.btns{display:flex;gap:8px;flex:none}
.card a{color:var(--clay-ink);overflow-wrap:anywhere}
"""

# helpers used by the card: the /cut tag (or "Not built yet" on an idea he added), the "Close to" row, the link he gave, the "You said" line
JS_HELPERS = r"""function cutTag(it) {
  if (it.add) return '<span class="tag">Not built yet</span>';
  return it.cut ? '<span class="tag cut" title="' + esc('Built in your /cut kit' + (it.how ? ': ' + it.how : '')) + '">/cut · ' + esc(it.cut) + '</span>' : '';
}
function likeHtml(it) {
  if (!it.like || !it.like.length) return '';
  return '<div class="line"><span class="k">Close to</span>' + it.like.map(function (id) {
    var x = byId[id]; if (!x) return '';
    return '<button class="pill" type="button" data-act="goto" data-id="' + id + '">' + esc(x.name) + '<small>' + x.no + '</small></button>';
  }).join('') + '</div>';
}
function linkHtml(it) {
  if (!it.link) return '';
  return '<div class="line"><span class="k">Where you saw it</span>' + (/^https?:\/\//.test(it.link) ? '<a href="' + esc(it.link) + '" target="_blank" rel="noopener">' + esc(it.link) + '</a>' : esc(it.link)) + '</div>';
}
function saidHtml(it) { return it.said ? '<div class="said"><b>You said:</b> ' + esc(it.said) + '</div>' : ''; }
"""

# ideas he adds himself: kept on the page (db collection 'adds') and on his phone, shown as cards in the group "Yours" until they are built
JS_ADDS = r"""/* ───────────── ideas he adds: kept on the page (db 'adds') and on this phone ───────────── */
var AKEY = 'motionmenu.adds.v1', addSig = '';
var Adds = {
  data: {}, db: null, busy: {}, dirty: {}, first: true,
  load: function () { try { this.data = JSON.parse(ls(AKEY) || '{}') || {}; } catch (e) { this.data = {}; } },
  persist: function () { ls(AKEY, JSON.stringify(this.data)); },
  put: function (a) { this.data[a.id] = a; this.persist(); this.dirty[a.id] = true; this.flush(a.id); this.sync(true); },
  flush: function (id) {
    var self = this; if (!self.db || self.busy[id] || !self.data[id]) return;
    self.busy[id] = true;
    self.db.collection('adds').doc(id).set(self.data[id]).then(function () { self.busy[id] = false; delete self.dirty[id]; }, function () { self.busy[id] = false; });
  },
  attach: function (db) {
    var self = this; self.db = db;
    db.collection('adds').onSnapshot(function (snap) {
      var seen = {};
      snap.docs.forEach(function (d) { seen[d.id] = true; if (self.busy[d.id] || self.dirty[d.id]) return; var v = d.data(); if (v) { var c = Object.assign({}, v); c.id = d.id; self.data[d.id] = c; } });
      Object.keys(self.data).forEach(function (id) {
        if (seen[id] || self.busy[id]) return;
        if (self.first || self.dirty[id]) { self.dirty[id] = true; self.flush(id); } else delete self.data[id];
      });
      self.first = false; self.persist(); self.sync(true);
    }, function () {});
  },
  sync: function (draw) {
    for (var k = ITEMS.length - 1; k >= 0; k--) if (ITEMS[k].add) { delete byId[ITEMS[k].id]; ITEMS.splice(k, 1); }
    var self = this, ids = Object.keys(self.data).filter(function (id) { return self.data[id] && self.data[id].status !== 'built'; })
      .sort(function (a, b) { return (self.data[a].t || 0) - (self.data[b].t || 0); });
    ids.forEach(function (id) {
      var a = self.data[id], it = { id: id, add: true, group: 'yours', kind: 'visual', no: 'new', name: a.name || 'Untitled', label: a.label || '', link: a.link || '', takes: [], pairs: [], farsi: '', used: '' };
      ITEMS.push(it); byId[id] = it;
    });
    var sig = ids.map(function (id) { var a = self.data[id]; return id + (a.name || '') + (a.label || '') + (a.link || ''); }).join('~');
    var changed = sig !== addSig; addSig = sig;
    if (draw && changed) { render(); paintAllMarks(); paintTally(); }
  }
};
Adds.load();
function openAdd() { $('#addSheet').hidden = false; var f = $('#addName'); if (f) f.focus(); }
function closeAdd() { $('#addSheet').hidden = true; }
function saveAdd() {
  var name = $('#addName').value.trim(), label = $('#addLabel').value.trim(), link = $('#addLink').value.trim();
  if (!name) { toast('Give it a name first.'); return; }
  var id = 'a' + Date.now().toString(36);
  Adds.put({ id: id, name: name, label: label, link: link, t: Date.now(), status: 'new' });
  $('#addName').value = ''; $('#addLabel').value = ''; $('#addLink').value = '';
  closeAdd(); toast('Added. I will build it and give it a number.');
  setTimeout(function () { goTo(id); }, 0);
}
"""

ADD_SHEET = r"""<div class="sheet" id="addSheet" hidden>
  <div class="panel" role="dialog" aria-modal="true" aria-labelledby="addTitle">
    <h3 id="addTitle">Add an idea</h3>
    <span style="color:var(--ink2);font-size:14px">Something you want in your motion graphics. I will build it, give it a number and put it here.</span>
    <div class="editor">
      <label>What is it called?<input id="addName" type="text" maxlength="40" placeholder="For example: Countdown"></label>
      <label>What does it do?<textarea id="addLabel" rows="3" maxlength="240" placeholder="For example: a number counts down and shakes at zero"></textarea></label>
      <label>Where did you see it? (optional)<input id="addLink" type="text" maxlength="200" placeholder="A link, or the name of the account"></label>
    </div>
    <div class="row">
      <button class="btn primary" id="addSave" type="button">Add to the menu</button>
      <button class="btn" id="addClose" type="button">Close</button>
    </div>
  </div>
</div>
"""

YOURS = {"id": "yours", "name": "Yours", "blurb": "Ideas you added here. I build each one and give it a number.", "tab": "reels"}

DATA_RE = re.compile(r'(<script id="data" type="application/json">)(.*?)(</script>)', re.S)


def dur_of(path):
    r = subprocess.run([FFPROBE, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path], capture_output=True, text=True)
    return round(float(r.stdout.strip()), 2)


def sub_once(html, old, new, what):
    n = html.count(old)
    if n != 1:
        raise SystemExit("page patch '%s': expected 1 match, found %d (the page changed? re-read the artifact and look)" % (what, n))
    return html.replace(old, new)


# Fixes for a page patched by an EARLIER version of this tool: (what, old text, new text). Applied once each, only where the old text is still there.
# The page's script is strict mode and the database hands back FROZEN snapshots, so nothing may be written onto a document's data().
FIXES = [
    ("copy a snapshot's data() before adding the id (it is frozen)",
     "var v = d.data(); if (v) { v.id = d.id; self.data[d.id] = v; }",
     "var v = d.data(); if (v) { var c = Object.assign({}, v); c.id = d.id; self.data[d.id] = c; }"),
]


def apply_fixes(html):
    done = []
    for what, old, new in FIXES:
        n = html.count(old)
        if n > 1:
            raise SystemExit("page fix '%s': expected 1 match, found %d" % (what, n))
        if n == 1:
            html = html.replace(old, new)
            done.append(what)
    return html, done


def patch_ui(html, with_add=True):
    if MARKER in html:
        html, done = apply_fixes(html)
        return html, ("fixed: " + "; ".join(done)) if done else False
    html = sub_once(html, "@media (prefers-reduced-motion:reduce)", "/* " + MARKER + " */" + CSS + "@media (prefers-reduced-motion:reduce)", "css")
    html = sub_once(html, "function cardHtml(it) {", JS_HELPERS + "function cardHtml(it) {", "helpers")
    html = sub_once(html, "<div class=\"line\">' + farsiTag(it) +", "<div class=\"line\">' + farsiTag(it) + cutTag(it) +", "cut tag")
    html = sub_once(html, "takesHtml(it) + pairsHtml(it) + tail + '</div>';", "takesHtml(it) + pairsHtml(it) + likeHtml(it) + linkHtml(it) + saidHtml(it) + tail + '</div>';", "like and said")
    html = sub_once(html, "  if (state.mark === 'none' && m.v) return false;\n  if (state.mark !== 'all' && state.mark !== 'none' && m.v !== state.mark) return false;\n",
                    "  if (state.mark === 'cut') { if (!it.cut) return false; }\n  else {\n    if (state.mark === 'none' && m.v) return false;\n"
                    "    if (state.mark !== 'all' && state.mark !== 'none' && m.v !== state.mark) return false;\n  }\n", "filter")
    html = sub_once(html, "(it.takes || []).join(' '), it.used || ''].join(' ')", "(it.takes || []).join(' '), it.used || '', it.cut || ''].join(' ')", "search")
    html = sub_once(html, "['drop', 'Drop (' + c.drop + ')']];",
                    "['drop', 'Drop (' + c.drop + ')'], ['cut', 'Ready in /cut (' + ITEMS.filter(function (i) { return i.cut; }).length + ')']];", "filter list")
    html = sub_once(html, "Play it, mark it, then tell me the numbers to build with.", "Play it, mark it, then tell me the numbers to build with. A green /cut tag means it is already built for your edits.", "lede")
    if with_add:
        html = sub_once(html, "<button class=\"btn primary\" id=\"picksBtn\" type=\"button\">My picks</button>",
                        "<span class=\"btns\"><button class=\"btn\" id=\"addBtn\" type=\"button\">+ Add</button><button class=\"btn primary\" id=\"picksBtn\" type=\"button\">My picks</button></span>", "buttons")
        html = sub_once(html, "rename it or leave a note</p>", "rename it or leave a note &middot; <b>+ Add</b> an idea of your own</p>", "legend")
        html = sub_once(html, "<div class=\"toast\" id=\"toast\"", ADD_SHEET + "<div class=\"toast\" id=\"toast\"", "add sheet")
        html = sub_once(html, "Marks.load();\n", "Marks.load();\n\n" + JS_ADDS, "adds code")
        html = sub_once(html, "no = '<span class=\"no\">#' + it.no + '</span>';", "no = '<span class=\"no\">' + (it.add ? 'NEW' : '#' + it.no) + '</span>';", "no label")
        html = sub_once(html, "else if (b.id === 'copyBtn') copyPicks();", "else if (b.id === 'copyBtn') copyPicks();\n  else if (b.id === 'addBtn') openAdd();\n  else if (b.id === 'addClose') closeAdd();\n  else if (b.id === 'addSave') saveAdd();", "add events")
        html = sub_once(html, "if (e.key === 'Escape') closePicks();", "if (e.key === 'Escape') { closePicks(); closeAdd(); }", "escape")
        html = sub_once(html, "$('#sheet').addEventListener('click', function (e) { if (e.target.id === 'sheet') closePicks(); });",
                        "$('#sheet').addEventListener('click', function (e) { if (e.target.id === 'sheet') closePicks(); });\n$('#addSheet').addEventListener('click', function (e) { if (e.target.id === 'addSheet') closeAdd(); });", "add backdrop")
        html = sub_once(html, "paintWhere(); paintTally(); render();\ntry {", "Adds.sync(false); paintWhere(); paintTally(); render();\ntry {", "start")
        html = sub_once(html, "if (db) { Marks.attach(db); paintWhere(); }", "if (db) { Marks.attach(db); Adds.attach(db); paintWhere(); }", "attach")
    return html, True


MARKER2 = "cut-menu:2"

# ---------------------------------------------------------------- page code, upgrade 2 (2026-10-01 tidy): When / How / Also called on every card, form buttons (alts) on the media, search over them
CSS2 = r"""
.use{display:flex;gap:8px;align-items:baseline;font-size:13.5px;color:var(--ink2)}
.use .k{flex:none;min-width:74px;font-weight:700;color:var(--ink)}
.use span:last-child,.use code{min-width:0}
.use code{font:12px/1.45 'JetBrains Mono',ui-monospace,monospace;color:var(--ink);overflow-wrap:anywhere}
.media .alts{position:absolute;left:8px;bottom:8px;display:flex;gap:4px;flex-wrap:wrap;z-index:2;max-width:calc(100% - 16px)}
.media .alt{min-height:30px;padding:0 10px;border-radius:999px;border:1px solid rgba(242,238,229,.35);background:rgba(11,11,16,.72);color:#F2EEE5;font:700 12px/1 'DM Sans',system-ui,sans-serif}
.media .alt[aria-pressed="true"]{background:#F2EEE5;color:#0B0B10;border-color:#F2EEE5}
"""

JS2 = r"""/* cut-menu:2 : what it is for (When), what to type (How), the old names it swallowed (Also called), and the forms of one ingredient (alts) */
function useHtml(it) {
  var r = '';
  if (it.when) r += '<div class="use"><span class="k">When</span><span>' + esc(it.when) + '</span></div>';
  if (it.how) r += '<div class="use"><span class="k">How</span><code>' + esc(it.how) + '</code></div>';
  if (it.aka && it.aka.length) r += '<div class="use"><span class="k">Also called</span><span>' + it.aka.map(function (a) { return esc(a); }).join(', ') + '</span></div>';
  return r;
}
function altsHtml(it) {
  if (!it.alts || it.alts.length < 2) return '';
  return '<div class="alts">' + it.alts.map(function (a, i) { return '<button class="alt" type="button" data-act="alt" data-k="' + esc(a.k) + '" aria-pressed="' + (i === 0) + '">' + esc(a.l) + '</button>'; }).join('') + '</div>';
}
function setAlt(card, k) {
  var m = $('.media', card), v = $('video', m); if (!v) return;
  $$('.alt', m).forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.k === k)); });
  v.poster = 'posters/' + k + '.jpg'; v.dataset.src = 'clips/' + k + '.mp4'; v.setAttribute('src', v.dataset.src); v.load();
  var p = v.play(); if (p && p.catch) p.catch(function () {});
}
"""


def upgrade2(html):
    """Apply the 2026-10-01 page-code upgrade once (marker cut-menu:2). Every replacement must match exactly once, or the page changed: look before forcing."""
    if MARKER2 in html:
        return html, False
    html = sub_once(html, ".card a{color:var(--clay-ink);overflow-wrap:anywhere}", ".card a{color:var(--clay-ink);overflow-wrap:anywhere}\n/* " + MARKER2 + " */" + CSS2, "css 2")
    html = sub_once(html, "function cardHtml(it) {", JS2 + "function cardHtml(it) {", "helpers 2")
    old = "<p class=\"label\">' + esc(it.label) + '</p>"
    n = html.count(old)
    if n != 6:
        raise SystemExit("page patch 'label rows': expected 6 matches, found %d (the page changed? re-read the artifact and look)" % n)
    html = html.replace(old, old + "' + useHtml(it) + '")
    html = sub_once(html, ": '') + '</div>' +\n      (fa ? '<div class=\"fanote\"", ": '') + altsHtml(it) + '</div>' +\n      (fa ? '<div class=\"fanote\"", "alts on the media")
    html = sub_once(html, "else if (act === 'lang') setLang(card, id, b.dataset.l);", "else if (act === 'lang') setLang(card, id, b.dataset.l);\n  else if (act === 'alt') setAlt(card, b.dataset.k);", "alt click")
    html = sub_once(html, "it.used || '', it.cut || ''].join(' ')", "it.used || '', it.cut || '', it.when || '', it.how || '', (it.aka || []).join(' ')].join(' ')", "search 2")
    html = sub_once(html, "Everything the showreel was made from, and the ingredients for your reels. Each move, look and sound has a number.", "Your motion graphics, one card each: what it is, when to use it and how. Each one has a number.", "lede 2")
    html = sub_once(html, "<b>Drop</b> never use it", "<b>Drop</b> never use it, and it leaves at the next tidy-up", "legend 2")
    html = sub_once(html, "If something is renamed or removed, its number stays with it, so", "A number that was removed is never used again, so", "footer 2")
    html = sub_once(html, "These are for reels, so every sample is tall (9:16).", "These are for reels, so most samples are tall (9:16).", "reels note")
    # a mark kept on a phone for an item that has left the menu is dropped, not pushed back to the database (or a tidy-up could never clear it)
    html = sub_once(html, "        if (seen[id] || self.dirty[id] || self.busy[id]) return;\n        if (self.first) { self.dirty[id] = true; self.flush(id); } else delete self.data[id];",
                    "        if (!byId[id]) { delete self.data[id]; return; }\n        if (seen[id] || self.dirty[id] || self.busy[id]) return;\n        if (self.first) { self.dirty[id] = true; self.flush(id); } else delete self.data[id];", "orphan marks")
    return html, True


def patch_page(html, with_add=True):
    html, ui1 = patch_ui(html, with_add)
    html, ui2 = upgrade2(html)
    return html, ("%s%s" % ("page code 1: %s " % ui1 if ui1 else "", "page code 2: yes" if ui2 else "")).strip() or False


# ---------------------------------------------------------------- the page data, rebuilt from the manifest
DROP_KEYS = ("sample", "mark", "file", "dur", "vol", "track", "page_audio", "new")


def page_record(it):
    rec = {k: v for k, v in it.items() if k not in DROP_KEYS}
    if it.get("alts"):
        rec["alts"] = [{k: v for k, v in a.items() if k != "sample"} for a in it["alts"]]
    if it["kind"] == "sound":
        rec["cut"] = "sfx"
    for k in ("like", "aka", "pairs", "alts", "when", "how", "said", "cut", "used"):
        if k in rec and rec[k] in ("", [], None):
            del rec[k]
    return rec


def sound_entry(path, np):
    """{dur, peaks} for the page's waveform: 48 peaks across the file, like the originals."""
    raw = subprocess.run([FFMPEG, "-v", "error", "-i", path, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True).stdout
    x = np.abs(np.frombuffer(raw, dtype=np.float32))
    n = 48
    seg = len(x) // n
    pk = [float(x[i * seg:(i + 1) * seg].max()) if seg else 0.0 for i in range(n)]
    top = max(pk) or 1.0
    return {"dur": round(len(x) / 16000.0, 2), "peaks": [round(p / top, 2) for p in pk]}


def main():
    args = sys.argv[1:]
    if args and args[0] == "marks":
        return marks(args[1:])
    if not args or args[0].startswith("--"):
        print(__doc__)
        return
    import shutil
    import numpy as np
    src = args[0]
    out = args[args.index("--out") + 1] if "--out" in args else src.replace(".html", ".patched.html")
    samples = args[args.index("--samples") + 1] if "--samples" in args else SAMPLES
    stage = args[args.index("--stage") + 1] if "--stage" in args else None
    html = open(src, encoding="utf-8").read()
    m = DATA_RE.search(html)
    if not m:
        raise SystemExit("no data block in the page")
    d = json.loads(m.group(2))
    man = json.load(open(MANIFEST, encoding="utf-8"))
    if int(man.get("version", 1)) < 2:
        raise SystemExit("menu.json is the old /cut-only manifest (version 1): this tool needs the complete one (version 2)")
    items, retired = man["items"], man.get("retired", [])
    ids = {i["id"] for i in items}
    gone = {r["id"] for r in retired}
    problems = []
    # no silent deletes: everything in the page must be in the manifest or in its retired list
    unknown = [i["id"] for i in d["items"] if i["id"] not in ids and i["id"] not in gone]
    if unknown:
        raise SystemExit("the page has items the manifest does not know: %s\nAdd them to menu.json or to its retired list, then run again. Nothing was written." % ", ".join(unknown))
    old_no = {i["id"]: i["no"] for i in d["items"]}
    for it in items:
        if it["id"] in old_no and old_no[it["id"]] != it["no"]:
            problems.append("%s: the manifest says #%s but the page has #%s" % (it["id"], it["no"], old_no[it["id"]]))
    nos = [i["no"] for i in items]
    if len(set(nos)) != len(nos):
        problems.append("duplicate numbers in the manifest")
    taken = {r["no"] for r in retired} & set(nos)
    if taken:
        problems.append("numbers of removed items are used again: %s" % sorted(taken))
    gids = {g["id"] for g in man["groups"]}
    sound_ids = {i["id"] for i in items if i["kind"] == "sound"}
    for it in items:
        if it["group"] not in gids:
            problems.append("%s: group %s is not in the manifest" % (it["id"], it["group"]))
        for k in it.get("pairs", []):
            if k not in sound_ids:
                problems.append("%s: no sound '%s'" % (it["id"], k))
        for k in it.get("like", []):
            if k not in ids:
                problems.append("%s: no item '%s' to be close to" % (it["id"], k))

    old_clips, old_sounds = d.get("clips", {}), d.get("sounds", {})
    new_clips, new_sounds, publish = {}, {}, []
    if stage:
        for sub in ("clips", "posters", "sounds"):
            os.makedirs(os.path.join(stage, sub), exist_ok=True)

    def want_clip(key, sample_folder=True):
        if key in new_clips:
            return
        c, p = os.path.join(samples, "clips", key + ".mp4"), os.path.join(samples, "posters", key + ".jpg")
        if key in old_clips and "--republish-samples" not in args:
            new_clips[key] = old_clips[key]
            return
        if os.path.exists(c) and os.path.exists(p):
            new_clips[key] = {"dur": dur_of(c), "bytes": os.path.getsize(c)}
            publish.extend(["clips/%s.mp4" % key, "posters/%s.jpg" % key])
            if stage:
                shutil.copy2(c, os.path.join(stage, "clips", key + ".mp4"))
                shutil.copy2(p, os.path.join(stage, "posters", key + ".jpg"))
        elif key in old_clips:
            new_clips[key] = old_clips[key]
        else:
            problems.append("no sample for %s (%s)" % (key, c))

    for it in items:
        if it["kind"] == "sound":
            continue
        keys = []
        if it["id"] in old_clips or it.get("sample"):
            keys.append(it["id"])
        if it.get("clip", {}).get("fa") and it["id"] + ".fa" in old_clips:
            keys.append(it["id"] + ".fa")
        for al in it.get("alts", []):
            keys.append(al["k"])
        for k in dict.fromkeys(keys):
            want_clip(k)
    for it in items:
        if it["kind"] != "sound":
            continue
        e = old_sounds.get(it["id"])
        rebuild = bool(it.get("page_audio")) and (not e or abs(e["dur"] - it.get("dur", 0)) > 0.05 or "--rebuild-sounds" in args)
        if e and not rebuild:
            new_sounds[it["id"]] = e
            continue
        srcfile = os.path.join(KIT, "sfx", it.get("page_audio") or it.get("file", ""))
        if not os.path.exists(srcfile):
            problems.append("sound %s: no file %s" % (it["id"], srcfile))
            continue
        ent = sound_entry(srcfile, np)
        ent["file"] = "sounds/%s.mp3" % it["id"]
        new_sounds[it["id"]] = ent
        publish.append("sounds/%s.mp3" % it["id"])
        if stage:
            subprocess.run([FFMPEG, "-y", "-v", "error", "-i", srcfile, "-codec:a", "libmp3lame", "-q:a", "4", os.path.join(stage, "sounds", it["id"] + ".mp3")], check=True)

    def files_of(clips, sounds):
        s = set()
        for k, c in clips.items():
            s.add("posters/%s.jpg" % k)
            if (c.get("dur") or 0) > 0:
                s.add("clips/%s.mp4" % k)
        for k in sounds:
            s.add("sounds/%s.mp3" % k)
        return s
    remove = sorted(files_of(old_clips, old_sounds) - files_of(new_clips, new_sounds))

    d["groups"] = [dict(g) for g in man["groups"]]
    d["items"] = [page_record(i) for i in items]
    d["clips"], d["sounds"] = new_clips, new_sounds
    d["version"] = int(d.get("version", 1)) + 1
    body = json.dumps(d, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    html = html[:m.start(2)] + body + html[m.end(2):]
    html, ui = patch_page(html, with_add="--no-add" not in args)
    if problems:
        print("PROBLEMS (%d), nothing written:" % len(problems))
        for q in problems:
            print("  -", q)
        raise SystemExit(1)
    open(out, "w", encoding="utf-8", newline="").write(html)
    print("patched page -> %s" % out)
    print("menu now has %d items (the page had %d) | clips %d | sounds %d | page code: %s | page data version %d" % (len(items), len(old_no), len(new_clips), len(new_sounds), ui, d["version"]))
    print("\nFILES TO PUBLISH (relative to the stage folder: %s):" % stage)
    print(json.dumps(sorted(set(publish))))
    print("\nFILES TO REMOVE (%d), pass each as null in `files`:" % len(remove))
    print(json.dumps(remove))


def marks(args):
    """The marks his showreel verdicts imply, as ArtifactData batch writes. Items that already have a mark are skipped (pass their ids with --existing)."""
    existing = set(args[args.index("--existing") + 1:]) if "--existing" in args else set()
    man = json.load(open(MANIFEST, encoding="utf-8"))
    t = int(__import__("time").time() * 1000)
    w = [{"op": "set", "collection": "marks", "doc_id": it["id"], "data": {"v": it["mark"], "no": it["no"], "name": it["name"], "t": t}}
         for it in man["items"] if it.get("mark") in ("keep", "maybe", "drop") and it["id"] not in existing]
    print(json.dumps(w, ensure_ascii=False))
    print("# %d writes (%d keep, %d drop)" % (len(w), sum(1 for x in w if x["data"]["v"] == "keep"), sum(1 for x in w if x["data"]["v"] == "drop")), file=sys.stderr)


if __name__ == "__main__":
    main()
