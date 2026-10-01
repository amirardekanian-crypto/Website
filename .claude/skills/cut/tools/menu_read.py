"""A short digest of Amir's Motion Menu for planning a reel: what is built in /cut, what he kept, maybe'd and dropped, what he renamed or noted, and what he added.

  python menu_read.py <saved page.html> [--marks <folder>] [--adds <folder>] [--all]

<saved page.html>   the file the Artifact tool saves when you `read` the artifact
--marks <folder>    his marks: run ArtifactData `list` on collection `marks` with out_dir=<folder> (one JSON file per item id), then pass <folder>\\marks
--adds <folder>     the same for collection `adds` (ideas he added in the page), pass <folder>\\adds
--all               also list every item that has no /cut block and no mark (the ideas nobody has judged)

Rules it prints (his own legend in the page): KEEP = use it, MAYBE = ask him first, DROP = never use it, no mark = fine to use if the cue table says so. A /cut handle
means the block already exists in the kit; no handle means it is an idea: build it (kit\\MENU.md), then add it to the manifest so the menu says so.
"""
import glob
import json
import os
import re
import sys


def load_dir(path):
    out = {}
    if path and os.path.isdir(path):
        for f in glob.glob(os.path.join(path, "**", "*.json"), recursive=True):
            try:
                d = json.load(open(f, encoding="utf-8"))
            except Exception:
                continue
            doc = d.get("data", d) if isinstance(d, dict) else {}
            out[os.path.splitext(os.path.basename(f))[0]] = doc
    return out


def main():
    a = sys.argv[1:]
    if not a or a[0].startswith("--"):
        print(__doc__)
        return
    html = open(a[0], encoding="utf-8").read()
    d = json.loads(re.search(r'<script id="data" type="application/json">(.*?)</script>', html, re.S).group(1))
    marks = load_dir(a[a.index("--marks") + 1]) if "--marks" in a else {}
    adds = load_dir(a[a.index("--adds") + 1]) if "--adds" in a else {}
    items = d["items"]
    live = {i["id"] for i in items}
    orphans = [k for k in marks if k not in live]                      # marks on items that left the menu in a tidy-up
    marks = {k: v for k, v in marks.items() if k in live}
    groups = {g["id"]: g for g in d["groups"]}
    tabs = {"visual": "Moves", "reels": "Reels", "design": "Design", "sound": "Sounds"}
    built = [i for i in items if i.get("cut") and i.get("kind") != "sound"]      # every sound can be cued by its id, so they are not listed one by one
    print("MOTION MENU  %d items | %d built in /cut | %d marked (%d keep, %d maybe, %d drop) | %d added by him" % (
        len(items), len(built), len(marks), sum(1 for m in marks.values() if m.get("v") == "keep"), sum(1 for m in marks.values() if m.get("v") == "maybe"),
        sum(1 for m in marks.values() if m.get("v") == "drop"), len(adds)))
    if orphans:
        print("(%d marks belong to items that left the menu: %s)" % (len(orphans), ", ".join(sorted(orphans))))
    print("Say 'menu N' for these numbers and 'showreel N' for the showreels: they are different lists.\n")

    def line(i):
        m = marks.get(i["id"], {})
        nm = m.get("alias") or i["name"]
        extra = (" (his name for it; was %s)" % i["name"]) if m.get("alias") else ""
        note = ("   NOTE: " + m["note"]) if m.get("note") else ""
        return "  #%-3s %-20s %-8s %-22s%s%s" % (i["no"], nm[:20], (m.get("v") or "-").upper(), i.get("cut", ""), extra, note)

    for v, title in (("keep", "KEEP: use these first"), ("maybe", "MAYBE: ask him first"), ("drop", "DROP: never use")):
        rows = [i for i in items if marks.get(i["id"], {}).get("v") == v]
        if rows:
            print(title + " (%d)" % len(rows))
            for i in sorted(rows, key=lambda x: x["no"]):
                print(line(i))
            print()
    noted = [i for i in items if marks.get(i["id"], {}).get("note") or marks.get(i["id"], {}).get("alias")]
    if noted:
        print("HIS NOTES AND NAMES")
        for i in sorted(noted, key=lambda x: x["no"]):
            m = marks[i["id"]]
            print("  #%s %s%s%s" % (i["no"], i["name"], (" -> " + m["alias"]) if m.get("alias") else "", (": " + m["note"]) if m.get("note") else ""))
        print()
    if adds:
        print("ADDED BY HIM (build these, then put them in the manifest and set status built)")
        for k, v in sorted(adds.items(), key=lambda kv: kv[1].get("t", 0)):
            print("  %-12s %-24s %s  %s  [%s]" % (k, v.get("name", ""), v.get("label", ""), v.get("link", ""), v.get("status", "new")))
        print()
    print("BUILT IN /cut, BY GROUP")
    for gid, g in groups.items():
        rows = [i for i in built if i["group"] == gid]
        if rows:
            print("  %s / %s: %s" % (tabs.get(g["tab"], g["tab"]), g["name"], ", ".join("#%s %s [%s]" % (i["no"], i["name"], i["cut"]) for i in rows)))
    if "--all" in a:
        print("\nIDEAS NOT BUILT AND NOT JUDGED")
        for i in items:
            if not i.get("cut") and not marks.get(i["id"], {}).get("v") and i["kind"] in ("visual",):
                print("  #%-3s %-18s %s" % (i["no"], i["name"], groups[i["group"]]["name"]))


main()
