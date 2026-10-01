"""Make a local test copy of the (patched) Motion Menu page, so the new UI can be checked in a browser BEFORE anything is published.

  python menu_test_site.py <patched page.html> <folder> [--clips <samples out dir>] [--seed-add]

Writes <folder>\\index.html with a stand-in for the page's database (window.claude.use('db'): an in-memory collection that behaves like the real one, seeded with the
marks his showreel verdicts imply) and copies the new clips and posters next to it. Then serve the folder (python -m http.server 8766 --bind 127.0.0.1) and open
http://127.0.0.1:8766/ in the Browser pane or Playwright. It is a test copy: nothing here touches the real artifact. STOP THE SERVER when you are done.

The stand-in behaves like the real runtime where it matters: the page's script is strict mode and a snapshot's data() is FROZEN, so code that writes onto it throws
here too (this caught a real bug on 2026-10-01 that a plain object would have hidden). --seed-add puts one idea in the `adds` collection before the page loads, the way
an idea added on his other device arrives.
"""
import json
import os
import shutil
import sys

KIT = r"C:\Users\Amir\.claude\skills\cut\kit"

STUB = """<script>
(function () {
  var store = { marks: {}, adds: {} }, listeners = {};
  var seed = __SEED__, seedAdds = __ADDS__;
  seed.forEach(function (s) { store.marks[s.id] = s.data; });
  seedAdds.forEach(function (s) { store.adds[s.id] = s.data; });
  // like the real runtime: a snapshot's data() is FROZEN (a write onto it throws in strict mode), so a bug that mutates it shows up here
  function snap(col) { return { docs: Object.keys(store[col] || {}).map(function (id) { var d = Object.freeze(JSON.parse(JSON.stringify(store[col][id]))); return { id: id, exists: true, data: function () { return d; } }; }) }; }
  function notify(col) { (listeners[col] || []).forEach(function (cb) { cb(snap(col)); }); }
  window.__fakedb = store;
  window.claude = { use: function () { return Promise.resolve({ collection: function (col) {
    store[col] = store[col] || {};
    return {
      doc: function (id) { return { set: function (v) { store[col][id] = JSON.parse(JSON.stringify(v)); notify(col); return Promise.resolve(); }, delete: function () { delete store[col][id]; notify(col); return Promise.resolve(); } }; },
      onSnapshot: function (cb) { (listeners[col] = listeners[col] || []).push(cb); setTimeout(function () { cb(snap(col)); }, 0); }
    };
  } }); } };
})();
</script>
"""


def main():
    a = sys.argv[1:]
    src, folder = a[0], a[1]
    clips = a[a.index("--clips") + 1] if "--clips" in a else r"C:\Users\Amir\Videos\Reels\menu-samples\out"
    man = json.load(open(os.path.join(KIT, "menu", "menu.json"), encoding="utf-8"))
    seed = [{"id": "groove", "data": {"v": "keep", "no": 103, "name": "Groove", "t": 1790862812713}}]
    seed += [{"id": i["id"], "data": {"v": i["mark"], "no": i["no"], "name": i["name"], "t": 1}} for i in man["items"] if i.get("mark")]
    adds = [{"id": "atest", "data": {"id": "atest", "name": "Countdown", "label": "a number counts down and shakes at zero", "link": "", "t": 1790873000000, "status": "new"}}] if "--seed-add" in a else []
    html = open(src, encoding="utf-8").read()
    anchor = '<script id="data" type="application/json">'
    if anchor not in html:
        raise SystemExit("no data block")
    stub = STUB.replace("__SEED__", json.dumps(seed)).replace("__ADDS__", json.dumps(adds))
    html = html.replace(anchor, stub + anchor, 1)
    os.makedirs(folder, exist_ok=True)
    open(os.path.join(folder, "index.html"), "w", encoding="utf-8", newline="").write(html)
    n = 0
    for sub in ("clips", "posters"):
        s = os.path.join(clips, sub)
        if os.path.isdir(s):
            os.makedirs(os.path.join(folder, sub), exist_ok=True)
            for f in os.listdir(s):
                shutil.copy2(os.path.join(s, f), os.path.join(folder, sub, f))
                n += 1
    print("test site ready: %s (%d marks seeded, %d adds seeded, %d sample files copied)" % (folder, len(seed), len(adds), n))


main()
