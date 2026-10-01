"""Python side of the reel kit: the pieces that must be STATIC html (the cut-out video, the sound effects) and the page assembly.

A reel's build.py is just a spec: the footage plan (segments), the block calls (JS), the sound-effect events. Example:

    import sys; sys.path.insert(0, r"C:\\Users\\Amir\\.claude\\skills\\cut\\kit")
    import kit
    kit.scaffold(public)                       # once: copies kit.css, kit.js, fonts, images, gsap and the sounds into public/
    kit.build(reel_dir, "myreel", segments, blocks_js, sfx=[(12.3, "pop")], transcript=TR)

Times in `sfx` and in the JS are SOURCE seconds when wrapped in E(...); the build maps them onto the edited clock.
"""
import argparse
import json
import os
import shutil
import sys

KIT = os.path.dirname(os.path.abspath(__file__))
TOOLS = os.path.join(os.path.dirname(KIT), "tools")
if TOOLS not in sys.path:
    sys.path.insert(0, TOOLS)
import plan_to_clips as P  # noqa: E402

SFX = {  # the eleven synthesised sounds (kit/sfx), kept well under the voice: he adds music in Instagram afterwards. The menu's sounds are added below.
    "pop": dict(file="pop.wav", dur=0.25, vol=0.30, track=11),
    "whoosh": dict(file="whoosh.wav", dur=0.75, vol=0.28, track=12),
    "ding": dict(file="ding.wav", dur=0.8, vol=0.40, track=13),
    "thock": dict(file="thock.wav", dur=0.3, vol=0.50, track=14),
    "hit": dict(file="hit.wav", dur=1.0, vol=0.50, track=15),
    "stamp": dict(file="stamp.wav", dur=0.5, vol=0.42, track=16),
    "step": dict(file="step.wav", dur=0.2, vol=0.40, track=17),  # a footfall (broadcast court)
    "rise": dict(file="rise.wav", dur=0.55, vol=0.30, track=18),  # a short upward sweep: a number standing up
    "tick": dict(file="tick.wav", dur=0.08, vol=0.35, track=19),  # one click (the drum turning)
    "roll": dict(file="roll.wav", dur=1.05, vol=0.34, track=20),  # an odometer slowing down: put it so it ENDS on the slam
    "swipe": dict(file="swipe.wav", dur=0.45, vol=0.30, track=21),  # a highlighter pass
}


def _menu_sounds():
    """Every sound in his Motion Menu (menu/menu.json, kind "sound") can be cued by its menu id: file, length, level and track come from the manifest.
    The eleven names above stay as they are, so old builds still play the same files; an id that is already above (whoosh) keeps the file above."""
    try:
        man = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "menu", "menu.json"), encoding="utf-8"))
    except Exception:
        return {}
    return {i["id"]: dict(file=i["file"], dur=i["dur"], vol=i["vol"], track=i["track"])
            for i in man.get("items", []) if i.get("kind") == "sound" and i.get("file") and i["id"] not in SFX}


SFX.update(_menu_sounds())


def scaffold(public):
    """Copy the kit's runtime files and assets into a reel's public/ folder. Each reel keeps its own frozen copy."""
    src = {"fonts": os.path.join(KIT, "assets", "fonts"), "img": os.path.join(KIT, "assets", "img"),
           "vendor": os.path.join(KIT, "assets", "vendor"), "sfx": os.path.join(KIT, "sfx"),
           "data": os.path.join(KIT, "assets", "data")}  # data/bodymap.js: the app's traced body, for K.bodymap
    for sub, d in src.items():
        os.makedirs(os.path.join(public, sub), exist_ok=True)
        for f in os.listdir(d):
            if f.endswith((".woff2", ".jpg", ".webp", ".js", ".wav", ".mp3")):
                shutil.copy2(os.path.join(d, f), os.path.join(public, sub, f))
    for f in ("kit.css", "kit.js"):
        shutil.copy2(os.path.join(KIT, f), os.path.join(public, f))


def make_E(segs, total):
    """Source seconds -> seconds on the edited clock (segs = timemap.json's segments)."""
    def E(t):
        for s in segs:
            if s["in"] <= t <= s["out"]:
                return s["start"] + (t - s["in"]) / s["rate"]
        for s in segs:
            if t < s["in"]:
                return s["start"]
        return total
    return E


def _timing():
    """kit/sfx/timing.json, written by tools/sfx_lead.py: per sound file, ms from the file's start to its onset, peak and end, and which of
    them (`align`) should land on the picture event."""
    try:
        return json.load(open(os.path.join(KIT, "sfx", "timing.json"), encoding="utf-8"))
    except Exception:
        return {}


TIMING = _timing()


def sfx_lead(file):
    """Seconds from the start of a sound file to the moment that should land on its event (None if the file has no timing yet)."""
    t = TIMING.get(file)
    return None if not t else t[t.get("align", "onset") + "_ms"] / 1000.0


def sfx_html(events, E, table=SFX, base="sfx/", align=False):
    """<audio> elements for (source seconds, name) events. A sound that would overlap the previous one on its track
    moves to a free track, so rapid sequences never trip the linter's duplicate-track warning.

    align=False (the old builds): the time is where the FILE starts.
    align=True (new reels, 2026-10-01): the time is where the HIT lands. Each sound starts early by its lead (kit/sfx/timing.json, made by
    tools/sfx_lead.py): a sharp hit lands on the event, a whoosh or a riser peaks on it, the odometer roll ends on it. The menu's mp3 files
    start 0.12 s in and the build-ups need up to 1.3 s of run-up, so without this they land late. An event too close to the start of the
    reel to fit its run-up plays from the middle of the file (data-media-start) instead of being dropped."""
    cues = []
    for t, name in events:
        c = table[name]
        t = max(0.0, E(t))
        lead = sfx_lead(c["file"]) if align else 0.0
        if lead is None:
            print("sound %s (%s) has no timing: run tools/sfx_lead.py --write; placed on its start" % (name, c["file"]), file=sys.stderr)
            lead = 0.0
        start, skip = t - lead, 0.0
        if start < 0:
            start, skip = 0.0, -start
        cues.append((start, skip, name, c))
    cues.sort(key=lambda x: x[0])
    busy, out = {}, []
    for n, (start, skip, name, c) in enumerate(cues):
        slot = c["dur"]
        if align and TIMING.get(c["file"]):  # never a slot longer than the file (`check` warns clip_media_fit: tick was 0.08 for a 0.07 s file)
            slot = min(slot, TIMING[c["file"]]["dur_ms"] / 1000.0)
        length = slot - skip
        if length < 0.05:
            print("sound %s is too close to the start of the reel to play: dropped" % name, file=sys.stderr)
            continue
        track = c["track"]
        while busy.get(track, -1) > start:
            track += 10
        busy[track] = start + length + 0.002
        media = ' data-media-start="%.3f"' % skip if skip > 0 else ""
        out.append('<audio id="sfx%02d" class="clip" src="%s%s" data-start="%.3f" data-duration="%.2f"%s data-track-index="%d" '
                   'data-volume="%.2f"></audio>' % (n, base, c["file"], start, length, media, track, c["vol"]))
    return "\n      ".join(out)


def behind_video(src, media_start=0.0, id="cut0", track=3):
    """The cut-out <video> for K.behind(): put it in the reveal segment's `inner_html`. media_start = where in the
    cut-out file this segment's first frame sits (segment `in` minus the second the cut-out file starts at)."""
    return ('<video id="%s" class="clip k-cut" src="%s" data-start="@START@" data-duration="@DUR@" data-media-start="%.3f" '
            'data-track-index="%d" muted playsinline></video>' % (id, src, media_start, track))


def page(template_path, out_path, parts):
    html = open(template_path, encoding="utf-8").read()
    for k, v in parts.items():
        html = html.replace("%%" + k + "%%", v)
    open(out_path, "w", encoding="utf-8").write(html)


# What the audit looks for. These are PROMPTS, never errors: HCTV3230 (loved) used 4 wipes and 17 sound cues a minute. The limits come from his own
# "do not use it when" column in BLOCKS.md and his rules (USAGE.md: one spine and two or three devices a reel; two or three kinds of wipe), and from the
# repos' per-reel caps (RESEARCH-2026-10-01.md section 5): slam at most 2 per piece, a flash only for the one moment that matters.
CAPS = {"number": 3, "slamBehind": 2, "versus": 2, "list": 2, "quote": 1, "question": 3, "chapter": 3, "flash": 2, "whip": 2, "behind": 3,
        "backdrop": 2, "courtSteps3d": 1, "courtMeasure3d": 1, "diagram": 3, "curve": 2, "bodymap": 2, "checklist": 2, "cta": 1}
SMALL = {"stamps", "chips", "tag", "ghost", "cta", "fa", "words", "label", "timeline", "init", "flash"}  # small things: not counted as a "device"
FULL = {"number", "versus", "question", "courtSteps3d", "courtMeasure3d", "curve", "bodymap", "quote"}  # always take the whole screen


def audit(blocks_js, sfx, total, E=None):
    """Plain-words notes on a reel's block calls and sound cues: a block used more often than he likes, a tour of the shelf, too many kinds of wipe,
    the face off screen for more than half the reel, a busy sound track. Returns a list of strings (empty = nothing to say)."""
    import collections
    import re as _re
    notes = []
    calls = list(_re.finditer(r"\bK\.([A-Za-z0-9]+)\(", blocks_js))
    names = collections.Counter(m.group(1) for m in calls)
    for name, cap in CAPS.items():
        if names.get(name, 0) > cap:
            notes.append("K.%s is used %d times (usually at most %d a reel; see its 'do not use it when' in BLOCKS.md)" % (name, names[name], cap))
    devices = [n for n in names if n not in SMALL and not n.startswith("wipe")]
    if len(devices) > 6:
        notes.append("%d different kinds of block (%s): one spine and two or three devices, not a tour of the shelf" % (len(devices), ", ".join(sorted(devices))))
    wipes = set(_re.findall(r"wipeVariant:\s*\"(\w+)\"", blocks_js)) | set(_re.findall(r"K\.wipe(?:In|Out)\([^;]*?,\s*\"(\w+)\"\)", blocks_js))
    if len(wipes) > 3:
        notes.append("%d kinds of wipe (%s): his rule is two or three kinds a reel, the same ones all the way through" % (len(wipes), ", ".join(sorted(wipes))))
    # seconds with a full-screen card up (his face off screen)
    num = r"(?:E\()?([0-9.]+)\)?"
    off = 0.0
    for m in _re.finditer(r"\bK\.([A-Za-z0-9]+)\(([^;]*?)\);", blocks_js, _re.S):
        name, body = m.group(1), m.group(2)
        card = name in FULL or (name == "list" and "video" not in body) or (name == "diagram" and '"card"' in body) or (name == "chapter" and '"card"' in body)
        if not card:
            continue
        a, b = _re.search(r"\bat:\s*" + num, body), _re.search(r"\bout:\s*" + num, body)
        if a and b:
            ta, tb = float(a.group(1)), float(b.group(1))
            if "E(" in (a.group(0) + b.group(0)) and E:
                ta, tb = E(ta), E(tb)
            off += max(0.0, tb - ta)
    if total and off > 0.5 * total:
        notes.append("full-screen cards are up for about %.0f s of %.0f s (%.0f%%): his face is off screen more than half the reel" % (off, total, 100 * off / total))
    cpm = len(sfx) / (total / 60.0) if total else 0
    if cpm > 20:
        notes.append("%d sound cues, %.0f a minute (HCTV3230 had 17 and he loved it; the repos say 6-12): check each one earns its place" % (len(sfx), cpm))
    return notes


def build(reel_dir, reel_id, segments, blocks_js, sfx=(), transcript=None, audio="voice.m4a", video="input-video.mp4",
          origin="50% 45%", css="", html="", sfx_table=None, sfx_align=False):
    """Plan -> clips on one clock -> public/index.html. Returns the timemap (edited length, segment starts).
    sfx_align=True: the times in `sfx` are where each HIT lands (see sfx_html). New reels pass True; the old showreel builds do not."""
    pub, out = os.path.join(reel_dir, "public"), os.path.join(reel_dir, "out")
    os.makedirs(out, exist_ok=True)
    plan = {"video": video, "audio": audio, "fps": 30, "origin": origin, "segments": segments}
    plan_path = os.path.join(reel_dir, "plan.json")
    json.dump(plan, open(plan_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    P.build(argparse.Namespace(plan=plan_path, transcript=transcript, outdir=out))
    tm = json.load(open(os.path.join(out, "timemap.json"), encoding="utf-8"))
    E = make_E(tm["segments"], tm["total"])
    read = lambda n: open(os.path.join(out, n), encoding="utf-8").read()
    segs_json = json.dumps([{"in": s["in"], "out": s["out"], "rate": s["rate"], "start": s["start"]} for s in tm["segments"]])
    page(os.path.join(KIT, "template.html"), os.path.join(pub, "index.html"), {
        "ID": reel_id, "CLIPS": read("clips.html"), "ZOOM": read("zoom.js"), "SEGS": segs_json,
        "TOTAL": "%.4f" % (tm["total"] + 0.05), "BESPOKE_CSS": css, "BESPOKE_HTML": html, "BLOCKS_JS": blocks_js,
        "SFX": sfx_html(sfx, E, sfx_table or SFX, align=sfx_align)})
    for note in audit(blocks_js, sfx, tm["total"], E):
        print("audit: " + note, file=sys.stderr)
    print("built %s: edited length %.2f s, %d segments, %d sound cues" % (reel_id, tm["total"], len(tm["segments"]), len(sfx)),
          file=sys.stderr)
    return tm
