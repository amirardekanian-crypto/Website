"""The checker for recovery/*.toml (2026-11-24, round 14 'The Changeover': Footprint, The Last Word, Matched Pair).

    python scripts/check_recovery.py

recovery/ holds the numbers and the words Amir edits by hand. This reads all three files and refuses what would break the
apps or the rules quietly: a number out of its range, a fact nobody defined, a line no session could ever reach, a session or
an article that does not exist, a Care loading session offered as recovery, a line with no Farsi, an em-dash or a semicolon
(COM-3), a rest day named, cold water or a "flush" promised, and built files older than the toml (build_recovery.py --check).
The pre-commit hook runs it (guard 32). Warnings (an article not published yet) never block.
"""
import json
import re
import subprocess
import sys
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "recovery"
FACTS = {"big", "normal", "easy", "late", "new", "week1", "lower", "hardsets", "court_before", "court_today"}
LEVELS = {"big", "normal", "easy"}
SLOTS = ("tonight", "tomorrow", "next")
IMPACTS = {"plyometric", "landing", "running"}
# Words an athlete must never read in these lines: a rest day is never named (athletes move their days), and recovery is sleep,
# food and spacing, never ice, cold water or "flushing" anything out.
BANNED = [r"\brest day", r"\bday off\b", r"\bice\b", r"\bcold\b", r"\bflush", r"\blactic", r"\btoxin", r"\bdetox"]

errors, warnings = [], []


def err(msg):
    errors.append(msg)


def warn(msg):
    warnings.append(msg)


def num(path, v, lo, hi, kind=(int, float)):
    if isinstance(v, bool) or not isinstance(v, kind) or not (lo <= v <= hi):
        err(f"{path} = {v!r}: must be a number from {lo} to {hi}")


def hhmm(path, v):
    if not (isinstance(v, str) and re.fullmatch(r"([01][0-9]|2[0-3]):[0-5][0-9]", v)):
        err(f"{path} = {v!r}: must be a time written HH:MM")


def words(path, en, fa):
    for lang, s in (("en", en), ("fa", fa)):
        if not isinstance(s, str) or not s.strip():
            err(f"{path}: no {lang} text (COM-1: every line in both languages)")
            continue
        if "—" in s or "–" in s:
            err(f"{path} ({lang}): an em-dash or en-dash (COM-3)")
        if ";" in s or "؛" in s:
            err(f"{path} ({lang}): a semicolon (COM-3)")
        if s != s.strip() or "  " in s:
            err(f"{path} ({lang}): stray spaces")
    if isinstance(en, str):
        for b in BANNED:
            if re.search(b, en, re.I):
                err(f"{path}: says {re.search(b, en, re.I).group(0)!r} (never a rest day, never ice or cold water, never a flush)")


def spine_regions():
    src = (ROOT / "coach.html").read_text(encoding="utf-8")
    m = re.search(r"const SPINE_REGIONS = \[(.*?)\];", src, re.S)
    return set(re.findall(r"\['([a-z-]+)',", m.group(1))) if m else set()


def prep_words_of_apps():
    coach = (ROOT / "coach.html").read_text(encoding="utf-8")
    app = (ROOT / "program.html").read_text(encoding="utf-8")
    m = re.search(r"const QM_PREP = /([^/]+)/i", coach)
    c = sorted(m.group(1).split("|")) if m else None
    m2 = re.search(r"function isPrepBlockTitle\(title\) \{(.*?)\n\}", app, re.S)
    a = sorted(re.findall(r"t\.includes\('([a-z]+)'\)", m2.group(1))) if m2 else None
    return c, a


def library_ids(kind):
    out = {}
    for f in (ROOT / kind).glob("*/*.json"):
        if f.name == "index.json" or f.name.endswith(".fa.json"):
            continue
        try:
            out[json.loads(f.read_text(encoding="utf-8")).get("id") or f.stem] = f.parent.name
        except Exception:
            pass
    return out


def main():
    try:
        fp = tomllib.loads((SRC / "footprint.toml").read_text(encoding="utf-8"))
        lw = tomllib.loads((SRC / "last-word.toml").read_text(encoding="utf-8"))
        mp = tomllib.loads((SRC / "matched-pair.toml").read_text(encoding="utf-8"))
    except Exception as e:
        print(f"x a recovery/*.toml file does not read: {e}")
        return 1
    regions = spine_regions()
    if len(regions) != 10:
        err(f"coach.html SPINE_REGIONS gave {len(regions)} areas, not 10: the checker cannot test the areas")
    sessions = library_ids("workouts")
    articles = library_ids("articles")

    # ── footprint.toml ──
    for name, t in (("footprint", fp), ("last-word", lw), ("matched-pair", mp)):
        num(f"{name}.version", t.get("version"), 1, 999, int)
    b = fp.get("big", {})
    num("big.session_rpe", b.get("session_rpe"), 5, 10, int)
    num("big.load_over_usual", b.get("load_over_usual"), 1.05, 3)
    num("big.usual_days", b.get("usual_days"), 7, 90, int)
    num("big.usual_min", b.get("usual_min"), 1, 30, int)
    num("big.hard_set_rpe", b.get("hard_set_rpe"), 7, 10, int)
    num("big.hard_sets", b.get("hard_sets"), 1, 20, int)
    num("big.impact_sets", b.get("impact_sets"), 1, 30, int)
    if not (isinstance(b.get("impact_kinds"), list) and b["impact_kinds"] and set(b["impact_kinds"]) <= IMPACTS):
        err(f"big.impact_kinds = {b.get('impact_kinds')!r}: a list from {sorted(IMPACTS)} (the Spine's impact values)")
    if not isinstance(b.get("impact_lower"), bool):
        err("big.impact_lower: true or false")
    num("easy.session_rpe", fp.get("easy", {}).get("session_rpe"), 1, 9, int)
    if isinstance(fp.get("easy", {}).get("session_rpe"), int) and isinstance(b.get("session_rpe"), int) \
            and fp["easy"]["session_rpe"] >= b["session_rpe"]:
        err("easy.session_rpe must be below big.session_rpe")
    lo = fp.get("lower", {})
    if not (isinstance(lo.get("areas"), list) and lo["areas"] and set(lo["areas"]) <= regions):
        err(f"lower.areas = {lo.get('areas')!r}: Spine body areas only ({sorted(regions)})")
    num("lower.share", lo.get("share"), 0.1, 1)
    pw = fp.get("sets", {}).get("prep_words")
    c, a = prep_words_of_apps()
    if not (isinstance(pw, list) and pw and all(isinstance(x, str) and re.fullmatch(r"[a-z]+", x) for x in pw)):
        err("sets.prep_words: a list of lower-case words")
    elif c is None or a is None:
        err("could not read coach.html QM_PREP or program.html isPrepBlockTitle() to compare sets.prep_words")
    elif sorted(pw) != c or sorted(pw) != a:
        err(f"sets.prep_words {sorted(pw)} differs from the Quality check's words (coach.html {c}, program.html {a}): change them together")
    hhmm("late.from", fp.get("late", {}).get("from"))
    hhmm("evening.from", fp.get("evening", {}).get("from"))
    num("new.days", fp.get("new", {}).get("days"), 7, 400, int)
    num("court.hard_min", fp.get("court", {}).get("hard_min"), 5, 600, int)

    # ── last-word.toml ──
    lab = lw.get("label", {})
    words("label", lab.get("en"), lab.get("fa"))
    ids, per_slot = set(), {s: 0 for s in SLOTS}
    for i, x in enumerate(lw.get("line", [])):
        p = f"line {x.get('id') or i + 1}"
        if not x.get("id") or x["id"] in ids:
            err(f"{p}: needs an id of its own")
        ids.add(x.get("id"))
        if x.get("slot") not in SLOTS:
            err(f"{p}: slot {x.get('slot')!r} is not one of {SLOTS}")
        else:
            per_slot[x["slot"]] += 1
        w = x.get("when")
        if not (isinstance(w, list) and w):
            err(f"{p}: `when` must list at least one fact")
        else:
            unknown = set(w) - FACTS
            if unknown:
                err(f"{p}: unknown fact(s) {sorted(unknown)} (the facts: {sorted(FACTS)})")
            if len(set(w) & LEVELS) > 1:
                err(f"{p}: asks for two of big / normal / easy, so it can never show")
        words(p, x.get("en"), x.get("fa"))
    for s, n in per_slot.items():
        if not n:
            warn(f"no line for the {s} slot")
    art = lw.get("article", {})
    words("article.kick", art.get("kick_en"), art.get("kick_fa"))
    says = {s.get("slug"): s for s in art.get("say", [])}
    for s in art.get("say", []):
        words(f"article.say {s.get('slug')}", s.get("en"), s.get("fa"))
    for i, r in enumerate(art.get("rule", [])):
        p = f"article.rule {i + 1}"
        if not (isinstance(r.get("when"), list) and r["when"] and set(r["when"]) <= FACTS):
            err(f"{p}: `when` must list facts from {sorted(FACTS)}")
        if not (isinstance(r.get("articles"), list) and r["articles"]):
            err(f"{p}: `articles` must list at least one slug")
            continue
        for slug in r["articles"]:
            if slug not in says:
                err(f"{p}: {slug!r} has no [[article.say]]")
            if slug not in articles:
                warn(f"{p}: {slug!r} is not in articles/ yet; the app skips it until the Library has it")
    for key in ("back_to_back", "after_match"):
        m = lw.get(key, {})
        words(key, m.get("en"), m.get("fa"))
        if not (isinstance(m.get("sessions"), list) and m["sessions"]):
            err(f"{key}.sessions: at least one Library session")

    # ── matched-pair.toml ──
    never = mp.get("never", [])
    for sid in never:
        if sessions.get(sid) != "care":
            err(f"never: {sid!r} is not a Care shelf session")
    offered = []   # (where, session id)
    picks = mp.get("pick", [])
    pick_ids = set()
    for x in picks:
        p = f"pick {x.get('id')}"
        if not x.get("id") or x["id"] in pick_ids:
            err(f"{p}: needs an id of its own")
        pick_ids.add(x.get("id"))
        if not (isinstance(x.get("areas"), list) and x["areas"] and set(x["areas"]) <= regions):
            err(f"{p}: areas must be Spine body areas ({sorted(regions)})")
        for k in ("evening", "morning"):
            if not (isinstance(x.get(k), list) and x[k]):
                err(f"{p}: `{k}` must list at least one session")
            else:
                offered += [(f"{p}.{k}", s) for s in x[k]]
        words(f"{p}.kick", x.get("kick_en"), x.get("kick_fa"))
    if mp.get("fallback") not in pick_ids:
        err(f"fallback = {mp.get('fallback')!r}: must be one of the picks {sorted(pick_ids)}")
    late = mp.get("late", {})
    offered += [("late", s) for s in late.get("sessions", [])]
    words("late.kick", late.get("kick_en"), late.get("kick_fa"))
    d2 = mp.get("day_two", {})
    for k in ("big", "new", "hard", "match", "two"):
        words(f"day_two.{k}", d2.get(k + "_en"), d2.get(k + "_fa"))
    for k in ("hard", "match", "two"):
        if not (isinstance(d2.get(k), list) and d2[k]):
            err(f"day_two.{k}: at least one Library session")
        else:
            offered += [(f"day_two.{k}", s) for s in d2[k]]
    offered += [("back_to_back", s) for s in lw.get("back_to_back", {}).get("sessions", [])]
    offered += [("after_match", s) for s in lw.get("after_match", {}).get("sessions", [])]
    msays = {s.get("session") for s in mp.get("say", [])}
    for s in mp.get("say", []):
        words(f"say {s.get('session')}", s.get("en"), s.get("fa"))
    for where, sid in offered:
        if sid in never:
            err(f"{where}: {sid!r} is a Care loading session, never offered as recovery")
        if sid not in sessions:
            err(f"{where}: {sid!r} is not a Library session (workouts/<shelf>/{sid}.json)")
        if sid not in msays:
            err(f"{where}: {sid!r} has no [[say]] in matched-pair.toml")

    # ── the built files ──
    r = subprocess.run([sys.executable, "-X", "utf8", str(ROOT / "scripts" / "build_recovery.py"), "--check"],
                       capture_output=True, text=True)
    if r.returncode != 0:
        err((r.stdout + r.stderr).strip() or "build_recovery.py --check failed")

    for w in warnings:
        print("warn  " + w)
    if errors:
        print("Errors")
        for e in errors:
            print("x  " + e)
        return 1
    print(f"ok  recovery/*.toml: {len(lw.get('line', []))} lines, {len(picks)} picks, built files fresh")
    return 0


if __name__ == "__main__":
    sys.exit(main())
