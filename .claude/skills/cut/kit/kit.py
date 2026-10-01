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


def sfx_html(events, E, table=SFX, base="sfx/"):
    """<audio> elements for (source seconds, name) events. A sound that would overlap the previous one on its track
    moves to a free track, so rapid sequences never trip the linter's duplicate-track warning."""
    items = sorted(((max(0.0, E(t)), name) for t, name in events), key=lambda x: x[0])
    busy, out = {}, []
    for n, (t, name) in enumerate(items):
        c = table[name]
        track = c["track"]
        while busy.get(track, -1) > t:
            track += 10
        busy[track] = t + c["dur"] + 0.002
        out.append('<audio id="sfx%02d" class="clip" src="%s%s" data-start="%.3f" data-duration="%.2f" data-track-index="%d" '
                   'data-volume="%.2f"></audio>' % (n, base, c["file"], t, c["dur"], track, c["vol"]))
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


def build(reel_dir, reel_id, segments, blocks_js, sfx=(), transcript=None, audio="voice.m4a", video="input-video.mp4",
          origin="50% 45%", css="", html="", sfx_table=None):
    """Plan -> clips on one clock -> public/index.html. Returns the timemap (edited length, segment starts)."""
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
        "SFX": sfx_html(sfx, E, sfx_table or SFX)})
    print("built %s: edited length %.2f s, %d segments, %d sound cues" % (reel_id, tm["total"], len(tm["segments"]), len(sfx)),
          file=sys.stderr)
    return tm
