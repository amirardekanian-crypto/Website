"""Writes bodymap.js (window.BODYMAP) from the app's traced drawing, so a reel shows the SAME body as program.html's muscle map.

  python make_bodymap.py

Source: the website repo's .claude/skills/image/bodymap/bodymap.json (traced once, never hand-edited; see that folder's README).
Run it again only if that drawing changes. The knee and ankle rings are the ones the app draws (inject.py's RINGS), in each view's own
coordinates. K.bodymap (kit.js) reads window.BODYMAP; kit.scaffold copies this folder into a reel's public/data/.
"""
import json
import os

SRC = r"C:\Users\Amir\OneDrive\Документы\GitHub\Website\.claude\skills\image\bodymap\bodymap.json"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bodymap.js")

bm = json.load(open(SRC, encoding="utf-8"))
fx, bx = bm["place"]["front"]["x"], bm["place"]["back"]["x"]
HIPX, HIPY = (305, 492), 765   # the hip joints on the front figure
bm["rings"] = {  # [cx, cy, rx, ry] in the drawing's own coordinates. Knee and ankle are the app's; the hip ring is the reel kit's own (the
    # app has no hip ring), placed by eye on the front figure so a hip -> knee -> ankle chain can run down the leg
    "front": {"hip": [[fx + HIPX[0], HIPY, 52, 58], [fx + HIPX[1], HIPY, 52, 58]],
              "knee": [[fx + 282, 1099, 40, 50], [fx + 521, 1099, 40, 50]],
              "ankle": [[fx + 250, 1494, 40, 34], [fx + 553, 1494, 40, 34]]},
    "back": {"ankle": [[bx + 284, 1494, 40, 34], [bx + 529, 1494, 40, 34]]},
}
js = "/* the app's traced body (program.html muscle map), made by make_bodymap.py: do not edit */\nwindow.BODYMAP = " + json.dumps(
    bm, separators=(",", ":")) + ";\n"
open(OUT, "w", encoding="utf-8", newline="\n").write(js)
print("wrote %s (%d bytes); groups front: %s | back: %s" % (OUT, len(js), ",".join(bm["groups"]["front"]), ",".join(bm["groups"]["back"])))
