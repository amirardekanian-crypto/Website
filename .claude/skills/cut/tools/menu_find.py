"""Find an ingredient fast: search Amir's Motion Menu manifest (kit\\menu\\menu.json) by any word, a menu number or an old name.

  python menu_find.py <word> [word ...]        every card that matches ALL the words (name, what it is, When, How, the kit block, the old names it swallowed, what he said)
  python menu_find.py 206                      a number: the card, or where a removed number went
  python menu_find.py --all                    every card, one line each, by group
  python menu_find.py --retired                everything that left the menu on 2026-10-01 and why

Prints the menu number, name, group, kit block, his verdict (his words), what it is, When, How and the sounds that go with it. It reads only the manifest, so it works with no
network. His live marks (he can flip them in the page any time) come from menu_read.py, which reads the page: use that before you plan a reel.
"""
import json
import sys

MANIFEST = r"C:\Users\Amir\.claude\skills\cut\kit\menu\menu.json"


def text_of(it, groups):
    parts = [str(it["no"]), "#%s" % it["no"], it["name"], it.get("label", ""), it.get("cut", ""), it.get("how", ""), it.get("when", ""), it.get("said", ""),
             groups.get(it["group"], ""), " ".join(it.get("takes", [])), " ".join(it.get("aka", [])), it.get("kind", "")]
    return " ".join(parts).lower()


def main():
    words = [w.lower().lstrip("#") if w.lstrip("#").isdigit() else w.lower() for w in sys.argv[1:] if not w.startswith("--")]
    flags = [w for w in sys.argv[1:] if w.startswith("--")]
    if not words and not flags:
        print(__doc__)
        return
    man = json.load(open(MANIFEST, encoding="utf-8"))
    groups = {g["id"]: g["name"] for g in man["groups"]}
    byid = {i["id"]: i for i in man["items"]}
    if "--retired" in flags:
        for r in man.get("retired", []):
            where = "now part of #%s %s" % (byid[r["into"]]["no"], r["intoName"]) if r.get("into") in byid else "removed: %s" % r.get("why", "")
            print("#%-3s %-18s %s" % (r["no"], r["name"], where))
        print("\n%d left the menu. Their numbers are never used again." % len(man.get("retired", [])))
        return
    if "--all" in flags:
        last = None
        for g in man["groups"]:
            for it in (i for i in man["items"] if i["group"] == g["id"]):
                if g["id"] != last:
                    print("\n%s" % g["name"].upper())
                    last = g["id"]
                print("  #%-3s %-18s %-12s he said: %s" % (it["no"], it["name"], it.get("cut", "") or "idea", it.get("said") or "-"))
        print("\n%d cards." % len(man["items"]))
        return
    hits = [it for it in man["items"] if all(w in text_of(it, groups) for w in words)]
    for it in hits:
        print("#%-3s %-18s [%s] %s%s" % (it["no"], it["name"], groups.get(it["group"], ""), it.get("cut", "") or "idea, not built", ("   he said: " + it["said"]) if it.get("said") else ""))
        print("     %s" % it.get("label", ""))
        if it.get("when"):
            print("     WHEN %s" % it["when"])
        if it.get("how"):
            print("     HOW  %s" % it["how"])
        if it.get("aka"):
            print("     also called: %s" % ", ".join(it["aka"]))
        if it.get("alts"):
            print("     forms: %s" % ", ".join(a["l"] for a in it["alts"]))
        if it.get("pairs"):
            print("     sounds: %s" % ", ".join(it["pairs"]))
    # a removed number or name
    gone = [r for r in man.get("retired", []) if all(w in ("%s #%s %s" % (r["no"], r["no"], r["name"])).lower() for w in words)]
    for r in gone:
        where = "now part of #%s %s" % (byid[r["into"]]["no"], r["intoName"]) if r.get("into") in byid else "removed: %s" % r.get("why", "")
        print("#%-3s %-18s (left the menu) %s" % (r["no"], r["name"], where))
    print("\n%d of %d cards%s. Say 'menu N' for these numbers: the showreels have their own." % (len(hits), len(man["items"]), (", %d old" % len(gone)) if gone else ""))


main()
