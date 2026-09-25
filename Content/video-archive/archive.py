"""The video archive: every video we make or keep, with a catalogue, so the next ad starts from what already exists.

    python Content/video-archive/archive.py add <file> --id <slug> --kind generated|reel|app-clip|asset|footage --title "..." --shows "..."
           [--tags a,b] [--date YYYY-MM-DD] [--used-in reel-8-course,...] [--usable "0-3.0 s"] [--notes "..."]
           [--private] [--restricted "why it must not be used in an ad"] [--json '{"higgsfield": {...}}'] [--no-build]
    python Content/video-archive/archive.py build      rewrite INDEX.md (for Claude) and index.html (for Amir)
    python Content/video-archive/archive.py show <id>  print one catalogue entry
    python Content/video-archive/archive.py check      every catalogued file and poster is where the catalogue says

`add` COPIES the file (it never moves or deletes the original), probes it with ffmpeg, cuts a poster frame and writes or updates
the entry in catalog.json (the source of truth), then rebuilds the two index files. Where a file goes:
    clips/       generated clips and small assets           (git-tracked)
    app-clips/   the app explainer clips                    (git-tracked)
    reels/       finished ad exports, big                   (git-IGNORED, backed up by OneDrive)
    private/     anything with a real person or a restricted likeness (git-IGNORED, OneDrive only)
Needs ffmpeg on PATH, in $FFMPEG, or through imageio_ffmpeg (see .claude/skills/reel/tools/README.md) and Pillow.
"""
import argparse
import html
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
ROOT = pathlib.Path(__file__).resolve().parent
CATALOG = ROOT / "catalog.json"
KIND_DIR = {"generated": "clips", "asset": "clips", "app-clip": "app-clips", "reel": "reels", "footage": "private"}
KIND_ORDER = ["reel", "generated", "app-clip", "asset", "footage"]
KIND_LABEL = {"reel": "Finished ads (reels)", "generated": "Generated clips (Higgsfield)", "app-clip": "App explainer clips",
              "asset": "Overlays and assets", "footage": "Own camera footage"}


def ffmpeg():
    if os.environ.get("FFMPEG"):
        return os.environ["FFMPEG"]
    found = shutil.which("ffmpeg")
    if found:
        return found
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def run(*args):
    return subprocess.run([ffmpeg(), "-hide_banner", *args], capture_output=True, text=True, encoding="utf-8", errors="replace")


def probe(path):
    r = run("-i", str(path)).stderr
    d = re.search(r"Duration: (\d+):(\d+):([\d.]+)", r)
    v = re.search(r"Video:.*?(\d{2,5})x(\d{2,5})", r)
    f = re.search(r"([\d.]+) fps", r)
    return {"seconds": round(int(d[1]) * 3600 + int(d[2]) * 60 + float(d[3]), 2) if d else None,
            "width": int(v[1]) if v else None, "height": int(v[2]) if v else None,
            "fps": float(f[1]) if f else None, "audio": "Audio:" in r,
            "mb": round(pathlib.Path(path).stat().st_size / 1e6, 1)}


def load():
    return json.loads(CATALOG.read_text(encoding="utf-8")) if CATALOG.exists() else {"videos": []}


def save(cat):
    CATALOG.write_text(json.dumps(cat, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def folder(entry):
    return "private" if entry.get("private") else KIND_DIR[entry["kind"]]


def make_poster(src, out, seconds, at=None):
    out.parent.mkdir(parents=True, exist_ok=True)
    at = at if at is not None else max((seconds or 1) * 0.25, 0.2)      # default: a quarter of the way in; entries can set poster_at
    run("-y", "-loglevel", "error", "-ss", f"{at:.2f}", "-i", str(src), "-frames:v", "1", "-vf", "scale=360:-2", "-q:v", "4", str(out))


def store_picture(src, dest_rel):
    """Convert a start picture to WebP (q92) inside the archive and return its relative path."""
    from PIL import Image
    out = ROOT / dest_rel
    out.parent.mkdir(parents=True, exist_ok=True)
    if not out.exists():
        Image.open(src).convert("RGB").save(out, "WEBP", quality=92, method=6)
    return dest_rel


def add(src, entry, build_after=True):
    """Copy `src` into the archive and write/update its catalogue entry. `entry` needs id, kind, title, shows."""
    src = pathlib.Path(src)
    cat = load()
    old = next((e for e in cat["videos"] if e["id"] == entry["id"]), None)
    e = dict(old or {})
    e.update({k: v for k, v in entry.items() if v is not None})
    e.setdefault("date", "")
    e.setdefault("tags", [])
    e.setdefault("used_in", [])
    dest = folder(e)
    if src is not None and str(src) not in ("", "."):
        if src.exists():
            rel = f"{dest}/{e['date']}_{e['id']}{src.suffix.lower()}"
            (ROOT / dest).mkdir(parents=True, exist_ok=True)
            if not (ROOT / rel).exists():
                shutil.copy2(src, ROOT / rel)
            e["file"] = rel
            e.update(probe(ROOT / rel))
            poster = f"{'private/posters' if e.get('private') else 'posters'}/{e['id']}.jpg"
            make_poster(ROOT / rel, ROOT / poster, e.get("seconds"), e.get("poster_at"))
            e["poster"] = poster
        else:
            raise SystemExit(f"not found: {src}")
    cat["videos"] = [x for x in cat["videos"] if x["id"] != e["id"]] + [e]
    save(cat)
    print("catalogued", e["id"], "->", e.get("file"))
    if build_after:
        build()
    return e


def register_only(entry, poster_from=None):
    """A video we list but do not copy (too big): the catalogue says where it lives. Optional poster cut from the original."""
    cat = load()
    e = dict(next((x for x in cat["videos"] if x["id"] == entry["id"]), {}))
    e.update(entry)
    e.setdefault("tags", [])
    e.setdefault("used_in", [])
    e.setdefault("file", None)          # a path relative to this folder if the file lives elsewhere in the repo, else None (not copied)
    if poster_from:
        e.update(probe(poster_from))
        poster = f"{'private/posters' if e.get('private') else 'posters'}/{e['id']}.jpg"
        make_poster(poster_from, ROOT / poster, e.get("seconds"))
        e["poster"] = poster
    cat["videos"] = [x for x in cat["videos"] if x["id"] != e["id"]] + [e]
    save(cat)
    print("listed (not copied)", e["id"])


def ordered(cat):
    return sorted(cat["videos"], key=lambda e: (KIND_ORDER.index(e["kind"]), "".join(chr(255 - ord(c)) for c in e.get("date", "")), e["id"]))


def fmt_len(e):
    if not e.get("seconds"):
        return "?"
    return f"{e['seconds']:.1f} s {e['width']}x{e['height']}" + (" +audio" if e.get("audio") else "")


def build_md(cat):
    L = ["# Video archive: index", "",
         "*Written by `archive.py build` from `catalog.json`. Do not edit by hand.* **Look here before you generate any clip** "
         "(the spend protocol in `.claude/skills/video/SKILL.md`: reuse before you generate). Search this file by what a clip "
         "SHOWS, not by its name. Amir opens `index.html` in this folder for the visual version.", "",
         "Where files live: `clips/` and `app-clips/` are in git; `reels/` and `private/` are NOT in git (OneDrive only, so a cloud "
         "session will not have them). ⚠️ An entry marked **RESTRICTED** must not be used in an ad.", ""]
    for kind in KIND_ORDER:
        rows = [e for e in ordered(cat) if e["kind"] == kind]
        if not rows:
            continue
        L += [f"## {KIND_LABEL[kind]} ({len(rows)})", ""]
        for e in rows:
            flag = f" **RESTRICTED: {e['restricted']}**" if e.get("restricted") else ""
            loc = e.get("file") or f"not copied: {e.get('location', 'see notes')}"
            L.append(f"### `{e['id']}`: {e['title']}{flag}")
            L.append(f"- **Shows:** {e['shows']}")
            L.append(f"- **File:** `{loc}` · {e.get('date', '')} · {fmt_len(e)}" + (" · private (not in git)" if e.get("private") or e['kind'] == 'reel' else ""))
            if e.get("usable"):
                L.append(f"- **Usable:** {e['usable']}")
            if e.get("tags"):
                L.append("- **Tags:** " + ", ".join(e["tags"]))
            if e.get("used_in"):
                L.append("- **Used in:** " + ", ".join(e["used_in"]))
            h = e.get("higgsfield")
            if h:
                bits = [h.get("model", ""), h.get("settings", "")]
                if e.get("credits") is not None:
                    bits.append(f"{e['credits']} credits")
                L.append(f"- **Made with:** {', '.join(b for b in bits if b)} · job `{h.get('job_id', '?')}`")
                if h.get("start_image"):
                    si = h["start_image"]
                    L.append(f"- **Start picture:** `{si.get('file') or si.get('note')}`" + (f" (job `{si['job_id']}`)" if si.get("job_id") else ""))
                if h.get("prompt"):
                    pr = " ".join(h["prompt"].split())
                    L.append("- **Prompt:** " + (pr if len(pr) <= 420 else pr[:420] + " ... (full prompt in catalog.json)"))
            if e.get("source"):
                L.append(f"- **Source:** {e['source']}")
            if e.get("notes"):
                L.append(f"- **Notes:** {e['notes']}")
            L.append("")
    (ROOT / "INDEX.md").write_text("\n".join(L), encoding="utf-8")


GALLERY = r"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AA video archive</title>
<style>
:root{--green:#0E4A36;--clay:#C7552F;--clay2:#E06B43;--paper:#FAF7F2;--cream:#F1ECE3;--ink:#16130f;--mute:#8d867a;}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0b0d0b;color:var(--cream);font-family:"Segoe UI",system-ui,sans-serif;padding:24px 20px 60px}
h1{font-size:26px;font-weight:700;letter-spacing:.3px}
h1 span{color:var(--clay2)}
.sub{color:var(--mute);font-size:14px;margin:6px 0 18px;max-width:900px;line-height:1.5}
.bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:18px}
.chip{background:#1a1f1b;border:1px solid #2a312b;color:var(--cream);border-radius:999px;padding:7px 14px;font-size:13px;cursor:pointer}
.chip.on{background:var(--clay);border-color:var(--clay2);color:#fff}
input[type=search]{background:#1a1f1b;border:1px solid #2a312b;color:var(--cream);border-radius:10px;padding:9px 14px;font-size:14px;min-width:240px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(176px,1fr));gap:14px}
.card{background:#141a15;border:1px solid #232b24;border-radius:12px;overflow:hidden;cursor:pointer;position:relative;transition:transform .15s,border-color .15s}
.card:hover{transform:translateY(-3px);border-color:var(--clay2)}
.ph{aspect-ratio:9/16;background:#050706;position:relative;overflow:hidden}
.ph img{width:100%;height:100%;object-fit:cover;display:block}
.ph .nof{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--mute);font-size:12px;text-align:center;padding:10px}
.badge{position:absolute;left:8px;bottom:8px;background:rgba(0,0,0,.7);border-radius:6px;padding:2px 7px;font-size:11px}
.kind{position:absolute;left:8px;top:8px;background:var(--green);border-radius:6px;padding:2px 8px;font-size:11px;text-transform:uppercase;letter-spacing:.6px}
.kind.reel{background:var(--clay)}
.warn{position:absolute;right:8px;top:8px;background:#a4161a;border-radius:6px;padding:2px 8px;font-size:11px;font-weight:700}
.ct{padding:10px 11px 12px}.ct b{display:block;font-size:14px;line-height:1.3}.ct small{color:var(--mute);font-size:12px}
.modal{position:fixed;inset:0;background:rgba(0,0,0,.86);display:none;align-items:center;justify-content:center;padding:18px;z-index:9}
.modal.on{display:flex}
.box{background:#101511;border:1px solid #2a312b;border-radius:14px;max-width:1080px;width:100%;max-height:94vh;overflow:auto;display:flex;gap:22px;padding:20px}
.box video{max-height:78vh;max-width:min(46vw,420px);width:auto;border-radius:10px;background:#000;flex:none}
.info{min-width:0;flex:1;font-size:14px;line-height:1.55}
.info h2{font-size:21px;margin-bottom:4px}
.info .meta{color:var(--mute);font-size:13px;margin-bottom:10px}
.info p{margin:8px 0}.info b.k{color:var(--clay2);font-weight:600}
.info code{background:#1a1f1b;border-radius:5px;padding:1px 6px;font-size:12px;word-break:break-all}
.info .pr{background:#0b0e0b;border:1px solid #232b24;border-radius:8px;padding:9px 11px;font-size:13px;color:#cfc8ba;white-space:pre-wrap}
.info .rst{background:#3a0f10;border:1px solid #a4161a;border-radius:8px;padding:8px 11px;margin:8px 0;color:#ffd9d9}
.x{position:absolute;right:26px;top:22px;background:#1a1f1b;border:1px solid #2a312b;color:#fff;border-radius:8px;padding:6px 12px;cursor:pointer;z-index:10}
.miss{color:#ffb4a8;font-size:13px;margin-top:6px;display:none}
@media(max-width:760px){.box{flex-direction:column}.box video{max-width:100%}}
</style></head><body>
<h1>AA <span>video archive</span></h1>
<p class="sub">Every video we made or kept, with what it shows, where it came from and where it was used. Click a card to play it. Files marked private or big live only in this folder (OneDrive), not on GitHub. Before making a new clip, look here first: it may already exist.</p>
<div class="bar" id="bar"></div>
<div class="grid" id="grid"></div>
<div class="modal" id="modal"><button class="x" id="close">Close</button><div class="box" id="box"></div></div>
<script>
const DATA = __DATA__;
const KINDS = __KINDS__;
const LABEL = __LABEL__;
let kind = "all", q = "";
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function bar(){
  $("#bar").innerHTML = ["all", ...KINDS].map(k => `<button class="chip ${k===kind?"on":""}" data-k="${k}">${k==="all"?"All ("+DATA.length+")":LABEL[k]+" ("+DATA.filter(e=>e.kind===k).length+")"}</button>`).join("") + `<input type="search" id="q" placeholder="Search: dust, night, sprint, hook..." value="${esc(q)}">`;
  document.querySelectorAll(".chip").forEach(b => b.onclick = () => { kind = b.dataset.k; bar(); grid(); });
  $("#q").oninput = e => { q = e.target.value.toLowerCase(); grid(); $("#q").focus(); };
}
const hay = e => [e.id,e.title,e.shows,(e.tags||[]).join(" "),(e.used_in||[]).join(" "),e.notes,(e.higgsfield||{}).prompt,e.kind].join(" ").toLowerCase();
function grid(){
  const rows = DATA.filter(e => (kind==="all"||e.kind===kind) && (!q || hay(e).includes(q)));
  $("#grid").innerHTML = rows.map(e => `<div class="card" data-id="${esc(e.id)}"><div class="ph">${e.poster?`<img src="${esc(e.poster)}" loading="lazy" onerror="this.remove()">`:""}<div class="nof">${e.poster?"":"no preview"}</div>
    <span class="kind ${e.kind}">${esc(e.kind)}</span>${e.restricted?'<span class="warn">DO NOT USE IN ADS</span>':""}<span class="badge">${e.seconds?e.seconds.toFixed(1)+" s":"?"} · ${e.width||"?"}x${e.height||"?"}</span></div>
    <div class="ct"><b>${esc(e.title)}</b><small>${esc(e.date)}${e.private?" · private":""}</small></div></div>`).join("") || '<p class="sub">Nothing matches.</p>';
  document.querySelectorAll(".card").forEach(c => c.onclick = () => open(c.dataset.id));
}
function open(id){
  const e = DATA.find(x => x.id === id), h = e.higgsfield || {};
  const row = (k, v) => v ? `<p><b class="k">${k}:</b> ${v}</p>` : "";
  $("#box").innerHTML = `<div>${e.file?`<video src="${esc(e.file)}" controls autoplay loop muted playsinline></video><div class="miss" id="miss">This file is not in this copy of the archive (private and big files live only in the OneDrive folder).</div>`:`<div class="miss" style="display:block">${esc(e.location||"Not copied into the archive.")}</div>`}</div>
   <div class="info"><h2>${esc(e.title)}</h2><div class="meta">${esc(e.kind)} · ${esc(e.date)} · ${e.seconds?e.seconds.toFixed(1)+" s":""} ${e.width||""}x${e.height||""}${e.fps?" · "+e.fps+" fps":""}${e.audio?" · has audio":" · silent"}${e.mb?" · "+e.mb+" MB":""}</div>
   ${e.restricted?`<div class="rst"><b>Do not use in an ad.</b> ${esc(e.restricted)}</div>`:""}
   <p dir="auto">${esc(e.shows)}</p>${row("Usable part", esc(e.usable))}${row("Used in", esc((e.used_in||[]).join(", ")))}${row("Tags", esc((e.tags||[]).join(", ")))}
   ${h.model?row("Made with", esc(h.model+(h.settings?" · "+h.settings:"")+(e.credits!=null?" · "+e.credits+" credits":""))):""}${h.job_id?row("Higgsfield job", "<code>"+esc(h.job_id)+"</code>"):""}
   ${h.start_image?row("Start picture", "<code>"+esc(h.start_image.file||h.start_image.note||"")+"</code>"):""}
   ${h.prompt?`<p><b class="k">Prompt:</b></p><div class="pr" dir="auto">${esc(h.prompt)}</div>`:""}
   ${row("Source", esc(e.source))}${row("Notes", esc(e.notes))}${row("File", e.file?"<code>"+esc(e.file)+"</code>":"")}</div>`;
  const v = $("#box video"); if (v) v.onerror = () => { $("#miss").style.display = "block"; };
  $("#modal").classList.add("on");
}
$("#close").onclick = () => { $("#modal").classList.remove("on"); $("#box").innerHTML = ""; };
$("#modal").onclick = ev => { if (ev.target.id === "modal") $("#close").click(); };
document.addEventListener("keydown", ev => { if (ev.key === "Escape") $("#close").click(); });
bar(); grid();
</script></body></html>
"""


def build_html(cat):
    rows = ordered(cat)
    slim = []
    for e in rows:
        e = dict(e)
        slim.append(e)
    out = (GALLERY.replace("__DATA__", json.dumps(slim, ensure_ascii=False))
                  .replace("__KINDS__", json.dumps([k for k in KIND_ORDER if any(e["kind"] == k for e in rows)]))
                  .replace("__LABEL__", json.dumps(KIND_LABEL, ensure_ascii=False)))
    (ROOT / "index.html").write_text(out, encoding="utf-8")


def build():
    cat = load()
    build_md(cat)
    build_html(cat)
    print("built INDEX.md and index.html:", len(cat["videos"]), "entries")


def check():
    cat = load()
    bad = 0
    for e in cat["videos"]:
        for key in ("file", "poster"):
            p = e.get(key)
            if p and not (ROOT / p).exists():
                print("MISSING", e["id"], key, p)
                bad += 1
        h = (e.get("higgsfield") or {}).get("start_image") or {}
        if h.get("file") and not (ROOT / h["file"]).exists():
            print("MISSING", e["id"], "start image", h["file"])
            bad += 1
    print("ok" if not bad else f"{bad} problems", "-", len(cat["videos"]), "entries")
    return bad


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("add")
    a.add_argument("file")
    a.add_argument("--id", required=True)
    a.add_argument("--kind", required=True, choices=KIND_ORDER)
    a.add_argument("--title", required=True)
    a.add_argument("--shows", required=True)
    a.add_argument("--tags", default="")
    a.add_argument("--date", required=True)
    a.add_argument("--used-in", default="")
    a.add_argument("--usable")
    a.add_argument("--notes")
    a.add_argument("--private", action="store_true")
    a.add_argument("--restricted")
    a.add_argument("--json", help="extra fields as JSON, e.g. the higgsfield block")
    a.add_argument("--no-build", action="store_true")
    s = sub.add_parser("show")
    s.add_argument("id")
    sub.add_parser("build")
    sub.add_parser("check")
    n = ap.parse_args()
    if n.cmd == "add":
        entry = {"id": n.id, "kind": n.kind, "title": n.title, "shows": n.shows, "date": n.date,
                 "tags": [t.strip() for t in n.tags.split(",") if t.strip()], "used_in": [t.strip() for t in n.used_in.split(",") if t.strip()],
                 "usable": n.usable, "notes": n.notes, "private": True if n.private else None, "restricted": n.restricted}
        if n.json:
            entry.update(json.loads(n.json))
        add(n.file, entry, build_after=not n.no_build)
    elif n.cmd == "show":
        print(json.dumps(next(e for e in load()["videos"] if e["id"] == n.id), ensure_ascii=False, indent=1))
    elif n.cmd == "build":
        build()
    else:
        sys.exit(1 if check() else 0)
