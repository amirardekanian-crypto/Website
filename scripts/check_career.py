#!/usr/bin/env python3
"""Check Career Mode's catalogue: python scripts/check_career.py [folder]

Career Mode (career/CAREER_MODE.md) keeps every number, badge, achievement, title, mission and quest in plain .toml
files so a detail can change without code (GAME-10). Nothing reads those files yet, which makes them easy to break by
accident: a meaning that is not one of the four, a title that was renamed, a mission given an XP of its own. This reads
the seven files (rulebook, badges, achievements, titles, missions, quests, recognition) and refuses what breaks a rule.
The folder defaults to career/ at the repo root.

ERRORS (exit 1)
   1  a file that does not parse (or is missing)
   2  the rulebook: the four meanings, the level curve, the shares, the habit weights, cycle_finished.min_share
   3  every [fact.<id>]: a meaning, exactly one of xp / xp_from, a source, pays_for, when. A social fact (meaning
      "none") pays nothing (GAME-6); pays_for "progress" needs meaning "progress"
   4  every [badge.<id>]: the required fields, a meaning (or "chosen" for the commendation badge only), a kind
      (best_value reads the largest value its fact has reached, e.g. a percent), what it counts (a fact) or reads
      (proof_codes), and tiers that rise (at), never go down a metal, and carry xp (mult for per_habit_best_run); a
      tier title must exist; a habit, when given, is one of the rulebook's habits
   5  every [achievement.<id>]: the required fields, reads a fact or "proof" (then proof_code), a title that exists
   6  every [title.<id>] and [skin.<id>] (a title's meaning is one of the four, "chosen", "season", "level", or "all"
      for the Grand Slam)
   7  every [mission.<id>]: the required fields, counts a fact, a target, and NO xp of its own (GAME-7)
   8  every [quest.<id>]: the required fields, 2 to 12 weeks, 2 to 5 steps, each step closing on a fact or Amir's tick
   9  recognition.toml: the five sizes and what each means, Courtside, the Bell, Amir's three tools, the WhatsApp lines
  10  the brand rule: no gold, golden, yellow, amber or ochre in any string, in any file
  13  the fields that carry Proof's counting (proof_measure, proof_need, proof_kind, proof_xp): a known measure or kind,
      a habit that exists, a need above 0, one Proof code per tier
  14  until the catalogue switch ([switch] catalogue = "off"): every habit number and every Proof milestone, tier and
      quest equals Proof's own, read from supabase/xp_rules_snapshot.json (in shadow Career Mode must match Proof to the
      point, PROCEDURES.md → P14; after the XP switch AA Proof's phone previews a tick with these numbers, P13).
      retire_at, starts_at and superseded_by say when an entry stops or starts, not what it pays: never compared
  15  the catalogue switch's gates (phase 3): retire_at and starts_at are "catalogue"; superseded_by (an id or a list)
      names entries that exist (a badge for a badge; an achievement or a badge for an achievement; a title; a mission),
      never itself
  16  the two switches (rulebook.toml → [switch]; Amir, 2026-10-17): xp (phase 2) and catalogue (phase 3) are each "off" or
      the day it was turned on (YYYY-MM-DD); the catalogue switch needs the XP switch, on the same day or after it. A fact
      paid from its own value (xp_from = "value": the level kept at the XP switch) has meaning "carried" and
      career_only = true, so a stored number never reaches a season's points; "carried" is for such a fact only
WARNINGS (exit 0)
   6  a title with origin "new" that nothing awards (unless it is a template, or its meaning is "all": the engine
      mints the Grand Slam)
  11  coverage: each meaning has a badge, an achievement, a title and a mission (missions skip progress, on purpose); each slot has a mission; each habit
      except strength and custom has a recovery mission. An entry with retire_at does not count: it stops at the switch
  12  an unknown key inside an entry (a typo would otherwise be silently ignored); also an id that is not snake_case
      and an unknown top-level key (a mistyped [table] would silently drop its entries from every check above)
  14  the Proof snapshot is missing or unreadable, so the parity check could not run

Standard library only. Python 3.11+ (tomllib).

  python scripts/check_career.py            # the career/ folder in this repo
  python scripts/check_career.py some/dir   # another folder (scripts/test_check_career.py checks copies of it)
"""
import argparse
import datetime
import json
import math
import pathlib
import re
import sys
import tomllib

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8")
    except Exception:
        pass

ROOT = pathlib.Path(__file__).resolve().parent.parent
DEFAULT_FOLDER = ROOT / "career"

FILES = ["rulebook", "badges", "achievements", "titles", "missions", "quests", "recognition"]

# The words the files may use.
MEANINGS = ["consistency", "commitment", "progress", "resilience"]
SIZES = ["tick", "win", "highlight", "milestone", "legend"]
METALS = ["bronze", "silver", "emerald", "amethyst", "prismatic"]      # low to high; no gold, ever
SLOTS = ["plan", "recovery", "stretch", "crew"]
DOORS = ["coach", "cycle", "athlete"]
ORIGINS = ["new", "proof"]
SOURCES = ["training", "proof", "coach", "server"]
PAYS_FOR = ["act", "progress", "nothing"]
XP_FROM = ["habits", "mission", "quest", "share.mission_sweep", "value"]   # "value": the fact's own value.xp
FACT_MEANINGS = MEANINGS + ["chosen", "quest", "none", "carried"]   # "carried": the level kept at the XP switch
TITLE_MEANINGS = MEANINGS + ["chosen", "season", "level", "all"]       # "all": the Grand Slam, a title in each of the four
BADGE_KINDS = ["best_run", "total", "per_habit_best_run", "best_value", "proof"]
MEASURES = ["count", "units", "days"]
CLOSERS = ["fact", "coach_tick"]
TOOLS = ["reaction", "commendation", "amirs_pick"]
SIZE_AUDIENCES = ["athlete", "coach", "crew", "beyond"]
LIMIT_PER = ["plan_day_week", "week", "cycle"]
# How Proof counts a milestone (hab_bonus_xp()'s measures) and a quest inside a run (its kinds). <habit> is a habit id.
PROOF_MEASURES = ["streak:<habit>", "daysHit:<habit>", "daysWith3", "perfectDays", "comebackRun", "comebacksStuck"]
PROOF_KINDS = ["daysHit:<habit>", "total:<habit>", "qualify", "perfect"]
PROOF_SNAPSHOT = ROOT / "supabase" / "xp_rules_snapshot.json"
SWITCH = "catalogue"   # the one value retire_at and starts_at may take: the catalogue switch, phase 3 ([switch] catalogue)
SWITCHES = ["xp", "catalogue"]   # rulebook.toml → [switch]: phase 2 (XP) and phase 3 (the catalogue); each "off" or a day

BANNED_WORDS = re.compile(r"\b(gold|golden|yellow|amber|ochre)\b", re.IGNORECASE)
SNAKE_CASE = re.compile(r"^[a-z][a-z0-9_]*$")

# Keys an entry may carry besides its own fields without a warning (rule 12).
EXTRA_KEYS = {"tier_name", "mult", "title", "template", "proof_id", "proof_code", "proof_codes", "proof_xp",
              "proof_measure", "proof_need", "proof_kind", "min_share", "cap", "habit", "within", "run", "line"}
# retire_at, starts_at and superseded_by are the switch gates (rule 15). A badge may also name the one habit it reads.
KNOWN_KEYS = {
    "fact": {"meaning", "xp", "xp_from", "source", "pays_for", "when", "cap", "min_share", "limit", "limit_per",
             "weeks_away", "window_days", "min_gain", "career_only"},
    "badge": {"name", "meaning", "kind", "counts", "habit", "proof_codes", "caption", "free", "origin", "tiers",
              "retire_at", "starts_at", "superseded_by", "patterns"},
    "tier": {"at", "metal", "xp", "size", "title", "mult", "tier_name"},
    "achievement": {"name", "meaning", "reads", "rule", "xp", "size", "caption", "free", "origin", "title", "proof_code",
                    "retire_at", "starts_at", "superseded_by", "patterns"},
    "title": {"name", "meaning", "from", "metal", "origin", "template", "proof_id", "retire_at", "superseded_by"},
    "skin": {"name", "from", "origin", "proof_id"},
    "mission": {"name", "slot", "meaning", "asks", "counts", "habit", "measure", "target", "picked_when", "free",
                "origin", "proof_id", "proof_xp", "retire_at", "superseded_by"},
    "quest": {"name", "meaning", "weeks", "doors", "free", "size", "caption", "reward_badge", "title", "origin", "steps"},
    "step": {"name", "closes_on", "counts", "target", "habit", "measure", "within", "run"},
    "message": {"en", "fa", "used_for"},
}
TOP_LEVEL_KEYS = {
    "rulebook": {"version", "meanings", "switch", "level", "season", "week", "share", "habits", "fact"},
    "badges": {"badge"},
    "achievements": {"achievement"},
    "titles": {"title", "skin"},
    "missions": {"mission"},
    "quests": {"quest"},
    "recognition": {"sizes", "size", "courtside", "bell", "tool", "message", "feedback"},
}


# ── Plumbing ──────────────────────────────────────────────────────────────────────────────────────────────────────

class Report:
    """Every problem found, in the order found: (level, file, id, message)."""

    def __init__(self):
        self.items = []

    def error(self, file, ident, msg):
        self.items.append(("ERROR", file, ident, msg))

    def warn(self, file, ident, msg):
        self.items.append(("WARN", file, ident, msg))

    def of(self, level):
        return [i for i in self.items if i[0] == level]


class Ctx:
    """Where a message belongs: the file, the entry and (for a tier or a step) a prefix."""

    def __init__(self, rep, file, ident, prefix=""):
        self.rep, self.file, self.ident, self.prefix = rep, file, ident, prefix

    def sub(self, prefix):
        return Ctx(self.rep, self.file, self.ident, self.prefix + prefix)

    def error(self, msg):
        self.rep.error(self.file, self.ident, self.prefix + msg)

    def warn(self, msg):
        self.rep.warn(self.file, self.ident, self.prefix + msg)


class World:
    """What the files refer to each other by: facts, habit weights, titles, and which titles something awards."""

    def __init__(self, data):
        rb, tl = data["rulebook"], data["titles"]
        self.facts = ids_of(rb, "fact") if rb is not None else None
        habits = rb.get("habits") if rb is not None else None
        weights = habits.get("weights") if isinstance(habits, dict) else None
        self.weights = list(weights) if isinstance(weights, dict) else None
        self.titles = ids_of(tl, "title") if tl is not None else None
        self.badge_ids = ids_of(data["badges"], "badge") if data["badges"] is not None else None
        self.title_entries = {}
        self.title_refs = set()


def is_num(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)


def is_int(v):
    return isinstance(v, int) and not isinstance(v, bool)


def is_text(v):
    return isinstance(v, str) and v.strip() != ""


def ids_of(data, key):
    section = data.get(key) if data is not None else None
    return set(section) if isinstance(section, dict) else set()


def entries(data, key, file, rep):
    """The {id: table} under a top-level key. Anything that is not a table is reported and left out."""
    section = data.get(key, {})
    if not isinstance(section, dict):
        rep.error(file, key, f"[{key}] must hold tables such as [{key}.some_id]")
        return {}
    out = {}
    for ident, body in section.items():
        if not isinstance(body, dict):
            rep.error(file, f"{key}.{ident}", "must be a table of settings, not a single value")
            continue
        if not SNAKE_CASE.match(ident):
            rep.warn(file, f"{key}.{ident}", "the id should be snake_case (lower case letters, digits and _): "
                                             "an id never changes once history is filed under it")
        out[ident] = body
    return out


def get_text(c, e, key):
    if key not in e:
        c.error(f"{key} is missing")
        return None
    if not is_text(e[key]):
        c.error(f"{key} must be non-empty text, found {e[key]!r}")
        return None
    return e[key]


def get_bool(c, e, key):
    if key not in e:
        c.error(f"{key} is missing")
        return None
    if not isinstance(e[key], bool):
        c.error(f"{key} must be true or false, found {e[key]!r}")
        return None
    return e[key]


def get_choice(c, e, key, allowed, note=""):
    if key not in e:
        c.error(f"{key} is missing")
        return None
    v = e[key]
    if not (isinstance(v, str) and v in allowed):
        c.error(f"{key} {v!r} is not one of {', '.join(allowed)}{note}")
        return None
    return v


def get_number(c, e, key, gt=None, ge=None, le=None, integer=False):
    if key not in e:
        c.error(f"{key} is missing")
        return None
    v = e[key]
    if not (is_int(v) if integer else is_num(v)):
        c.error(f"{key} must be {'a whole number' if integer else 'a number'}, found {v!r}")
        return None
    for ok, want in ((gt is None or v > gt, f"above {gt}"), (ge is None or v >= ge, f"{ge} or more"),
                     (le is None or v <= le, f"{le} or less")):
        if not ok:
            c.error(f"{key} = {v} must be {want}")
            return None
    return v


def warn_unknown(c, entry, kind, skip=()):
    for key in entry:
        if key not in KNOWN_KEYS[kind] and key not in EXTRA_KEYS and key not in skip:
            c.warn(f"unknown key {key!r} (a typo? it is ignored)")


def check_title_ref(c, e, w, key="title"):
    """An optional `title = "<id>"`: it must be a title in titles.toml. Remember it, so an unused title can be flagged."""
    if key not in e:
        return
    t = e[key]
    if not is_text(t):
        c.error(f"{key} must be the id of a title in titles.toml, found {t!r}")
        return
    w.title_refs.add(t)
    if w.titles is not None and t not in w.titles:
        c.error(f"{key} {t!r} is not in titles.toml")


def check_fact_ref(c, e, key, w):
    """`<key> = "<fact id>"`: required, and the fact must be in the rulebook."""
    if key not in e:
        c.error(f"{key} is missing")
        return
    fid = e[key]
    if not is_text(fid):
        c.error(f"{key} must be a fact id from rulebook.toml, found {fid!r}")
    elif w.facts is not None and fid not in w.facts:
        c.error(f"{key} {fid!r} is not a fact in rulebook.toml")


def check_habit_ref(c, e, w):
    """An optional `habit = "<key>"`: it must be a key of [habits.weights]."""
    if "habit" not in e:
        return
    h = e["habit"]
    if not is_text(h):
        c.error(f"habit must be a habit from rulebook.toml [habits.weights], found {h!r}")
    elif w.weights is not None and h not in w.weights:
        c.error(f"habit {h!r} is not in rulebook.toml [habits.weights] ({', '.join(w.weights)})")


def retires(e):
    """An entry gated to stop at the catalogue switch (it has retire_at). It is earned as Proof earns it until phase 3, but
    coverage (rule 11) does not count it: the catalogue is built on what stays."""
    return isinstance(e, dict) and "retire_at" in e


def check_gates(c, e, ident, targets):
    """Rule 15. retire_at and starts_at, when present, are "catalogue": the catalogue switch (phase 3).
    superseded_by is the id of the entry that takes this one's place, or a list of ids, and each must exist.
    `targets` is a list of (ids, label): where a name may be found (ids is None for a file that did not parse: then
    there is nothing to check against, and that file's own error says why). An entry never supersedes itself."""
    for key in ("retire_at", "starts_at"):
        if key in e and e[key] != SWITCH:
            c.error(f'{key} must be "{SWITCH}" (the entry is gated on the catalogue switch, phase 3), found {e[key]!r}')
    if "superseded_by" not in e:
        return
    raw = e["superseded_by"]
    if is_text(raw):
        names = [raw]
    elif isinstance(raw, list) and raw and all(is_text(x) for x in raw):
        names = raw
    else:
        c.error(f"superseded_by must be the id of the entry that takes its place, or a list of ids, found {raw!r}")
        return
    for name in names:
        if name == ident:
            c.error("superseded_by names the entry itself")
        elif all(ids is not None for ids, _ in targets) and not any(name in ids for ids, _ in targets):
            c.error(f"superseded_by {name!r} is not " + " or ".join(label for _, label in targets))


# ── Loading ───────────────────────────────────────────────────────────────────────────────────────────────────────

def load_all(folder, rep):
    """Rule 1. A file that fails is reported and left as None, and every check that needs it steps aside."""
    data = {}
    for stem in FILES:
        fname = f"{stem}.toml"
        try:
            with open(folder / fname, "rb") as fh:
                data[stem] = tomllib.load(fh)
        except FileNotFoundError:
            rep.error(fname, None, "file not found")
            data[stem] = None
        except tomllib.TOMLDecodeError as exc:
            rep.error(fname, None, f"does not parse: {exc}")
            data[stem] = None
        except (OSError, UnicodeDecodeError) as exc:
            rep.error(fname, None, f"cannot be read: {exc}")
            data[stem] = None
        else:
            for key in data[stem]:
                if key not in TOP_LEVEL_KEYS[stem]:
                    rep.warn(fname, key, f"unknown top-level key {key!r} (a mistyped [table]? its entries are not "
                                         f"checked). Expected: {', '.join(sorted(TOP_LEVEL_KEYS[stem]))}")
    return data


# ── Rule 2 and 3: the rulebook ────────────────────────────────────────────────────────────────────────────────────

def switch_day(v):
    """A switch's value as a date, None for "off", or False when it is neither."""
    if v == "off":
        return None
    if isinstance(v, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", v):
        try:
            return datetime.date.fromisoformat(v)
        except ValueError:
            return False
    return False


def check_switches(rb, rep, f):
    """Rule 16. [switch] holds xp (phase 2) and catalogue (phase 3), each "off" or the day it was turned on. The catalogue
    switch needs the XP switch, on the same day or after it. (The seed refuses a day still to come and a switch turned
    back off: the checker cannot know today's date or what is on the server.)"""
    c = Ctx(rep, f, "switch")
    sw = rb.get("switch")
    if not isinstance(sw, dict):
        c.error('the [switch] table is missing (xp = "off" and catalogue = "off" until each is turned on)')
        return
    days = {}
    for key in SWITCHES:
        if key not in sw:
            c.error(f'{key} is missing: "off", or the day the switch was turned on (YYYY-MM-DD)')
            continue
        d = switch_day(sw[key])
        if d is False:
            c.error(f'{key} must be "off" or a day written YYYY-MM-DD, found {sw[key]!r}')
        else:
            days[key] = d
    for key in sw:
        if key not in SWITCHES:
            c.warn(f"unknown key {key!r} (the switches are {', '.join(SWITCHES)}): a typo would be ignored")
    if "xp" in days and "catalogue" in days and days["catalogue"] is not None:
        if days["xp"] is None:
            c.error("the catalogue switch (phase 3) needs the XP switch (phase 2) on first")
        elif days["catalogue"] < days["xp"]:
            c.error(f"the catalogue switch ({days['catalogue']}) cannot come before the XP switch ({days['xp']})")


def catalogue_off(rb):
    """True until the catalogue switch: rule 14 holds Proof's numbers until then."""
    sw = rb.get("switch") if isinstance(rb, dict) else None
    return isinstance(sw, dict) and sw.get("catalogue") == "off"


def check_rulebook(rb, rep):
    f = "rulebook.toml"
    c = Ctx(rep, f, "meanings")
    if rb.get("meanings") != MEANINGS:
        c.error(f"must be exactly {MEANINGS}, found {rb.get('meanings')!r}")

    c = Ctx(rep, f, "level")
    level = rb.get("level")
    if not isinstance(level, dict):
        c.error("the [level] table is missing")
    else:
        get_number(c, level, "base", gt=0)
        get_number(c, level, "growth", gt=0)
        ranks = level.get("ranks")
        if not (isinstance(ranks, list) and ranks and all(is_text(x) for x in ranks)):
            c.error("ranks must be a non-empty list of rank names")
        get_number(c, level, "levels_per_rank", gt=0, integer=True)
        get_number(c, level, "prestige_after", gt=0, integer=True)

    c = Ctx(rep, f, "share")
    share = rb.get("share")
    if not isinstance(share, dict):
        c.error("the [share] table is missing")
    else:
        get_number(c, share, "mission", gt=0, le=1)
        get_number(c, share, "quest", gt=0, le=1)
        get_number(c, share, "mission_sweep", ge=0, integer=True)

    c = Ctx(rep, f, "habits.weights")
    habits = rb.get("habits")
    weights = habits.get("weights") if isinstance(habits, dict) else None
    if not isinstance(weights, dict) or not weights:
        c.error("the [habits.weights] table is missing or empty")
    else:
        for habit, value in weights.items():
            if not is_num(value) or value < 0:
                c.error(f"the weight of {habit!r} must be a number >= 0, found {value!r}")

    # What the server scores habits by (phase 1): Proof's own numbers, so nothing is typed into the SQL (GAME-10).
    c = Ctx(rep, f, "habits")
    if isinstance(habits, dict):
        get_number(c, habits, "completion_bonus", gt=0)
        get_number(c, habits, "max_custom", ge=0, integer=True)
        get_number(c, habits, "lapse_days", gt=0, integer=True)
        get_number(c, habits, "comeback_stick", gt=0, integer=True)
        get_number(c, habits, "qualify_pct", gt=0, le=100)
        get_bool(c, habits, "one_miss_door")
        get_number(c, habits, "backfill_days", ge=0, integer=True)
        locked = habits.get("locked")
        if not (isinstance(locked, list) and all(is_text(x) for x in locked)):
            c.error(f"locked must be a list of habit ids (it may be empty), found {locked!r}")
        elif isinstance(weights, dict):
            for h in locked:
                if h not in weights or h == "custom":
                    c.error(f"locked names {h!r}, which is not a habit in [habits.weights]")
    else:
        c.error("the [habits] table is missing")
    c = Ctx(rep, f, "habits.targets")
    targets = habits.get("targets") if isinstance(habits, dict) else None
    if not isinstance(targets, dict) or not targets:
        c.error("the [habits.targets] table is missing or empty (what \"done\" means for each habit)")
    elif isinstance(weights, dict):
        for habit, value in targets.items():
            if habit not in weights or habit == "custom":
                c.error(f"{habit!r} has a target but no weight in [habits.weights]")
            if not is_num(value) or value <= 0:
                c.error(f"the target of {habit!r} must be a number above 0, found {value!r}")
        for habit in weights:
            if habit != "custom" and habit not in targets:
                c.error(f"{habit!r} has a weight but no target (a custom habit's target is 1: it needs none)")
    c = Ctx(rep, f, "week")
    week = rb.get("week")
    if isinstance(week, dict):
        get_number(c, week, "close_after_days", ge=0, integer=True)
    else:
        c.error("the [week] table is missing")
    check_switches(rb, rep, f)

    facts = entries(rb, "fact", f, rep)
    for fid, fact in facts.items():
        c = Ctx(rep, f, f"fact.{fid}")
        get_choice(c, fact, "meaning", FACT_MEANINGS)
        has_xp, has_from = "xp" in fact, "xp_from" in fact
        if has_xp == has_from:
            c.error("needs exactly one of xp or xp_from" + (" (it has both)" if has_xp else " (it has neither)"))
        if has_xp:
            get_number(c, fact, "xp", ge=0)
        if has_from:
            get_choice(c, fact, "xp_from", XP_FROM)
        get_choice(c, fact, "source", SOURCES)
        pays_for = get_choice(c, fact, "pays_for", PAYS_FOR)
        get_text(c, fact, "when")
        if "min_share" in fact:
            get_number(c, fact, "min_share", gt=0, le=1)
        if "limit" in fact or "limit_per" in fact:
            get_number(c, fact, "limit", ge=1, integer=True)
            get_choice(c, fact, "limit_per", LIMIT_PER)
        if "weeks_away" in fact:
            get_number(c, fact, "weeks_away", ge=1, integer=True)
        if "window_days" in fact:
            get_number(c, fact, "window_days", ge=0, integer=True)
        if "min_gain" in fact:
            get_number(c, fact, "min_gain", ge=0)
        if "career_only" in fact:
            get_bool(c, fact, "career_only")
        if fact.get("xp_from") == "value":
            if fact.get("career_only") is not True:
                c.error('a fact paid from its own value (xp_from = "value") needs career_only = true: a number '
                        "worked out once must never reach a season's points (rule 16)")
            if fact.get("meaning") != "carried":
                c.error(f'a fact paid from its own value (xp_from = "value") has meaning "carried", found '
                        f'{fact.get("meaning")!r} (rule 16)')
        elif fact.get("meaning") == "carried":
            c.error('meaning "carried" is for a fact paid from its own value (xp_from = "value") only (rule 16)')
        if fact.get("meaning") == "none":
            xp = fact.get("xp")
            if not (is_num(xp) and xp == 0):
                found = f"xp = {xp!r}" if "xp" in fact else "no xp"
                c.error(f'a social fact (meaning "none") must have xp = 0, found {found} '
                        f'(GAME-6: social actions pay nothing)')
            if pays_for is not None and pays_for != "nothing":
                c.error(f'a social fact (meaning "none") must have pays_for = "nothing", found {pays_for!r} (GAME-6)')
        if pays_for == "progress" and fact.get("meaning") != "progress":
            c.error(f'pays_for "progress" needs meaning "progress", found {fact.get("meaning")!r}')
        warn_unknown(c, fact, "fact")

    cf = facts.get("cycle_finished")
    if cf is None:
        rep.error(f, "fact.cycle_finished", "the fact cycle_finished is missing")
    elif "min_share" not in cf:
        rep.error(f, "fact.cycle_finished", "min_share is missing (the share of a cycle's planned sessions that "
                                            "must be finished, above 0 and at most 1)")


# ── Rule 4: badges ────────────────────────────────────────────────────────────────────────────────────────────────

_SPINE_PATTERNS = None


def spine_patterns():
    """The Spine's movement patterns, read from coach.html's SPINE_PATTERNS (the list the editor offers), so this is no new copy."""
    global _SPINE_PATTERNS
    if _SPINE_PATTERNS is None:
        try:
            src = (pathlib.Path(__file__).resolve().parent.parent / "coach.html").read_text(encoding="utf-8")
            m = re.search(r"const SPINE_PATTERNS = \[([^\]]*)\]", src)
            _SPINE_PATTERNS = set(re.findall(r"'([a-z-]+)'", m.group(1))) if m else set()
        except OSError:
            _SPINE_PATTERNS = set()
    return _SPINE_PATTERNS


def check_patterns(c, e, reads):
    """patterns (round 4, 2026-10-18): the Spine patterns a lift must have to count. Only for an entry that reads lift_gain."""
    if "patterns" not in e:
        return
    p = e["patterns"]
    if reads != ["lift_gain"]:
        c.error("patterns is only for an entry that reads lift_gain (it narrows which lifts count)")
    if not (isinstance(p, list) and p and all(is_text(x) for x in p)):
        c.error("patterns must be a non-empty list of the Spine's movement patterns")
        return
    known = spine_patterns()
    for x in p:
        if known and x not in known:
            c.error(f"patterns {x!r} is not one of the Spine's patterns (coach.html SPINE_PATTERNS: {', '.join(sorted(known))})")


def counts_of(c, b):
    """A badge's counts as a list of fact ids; None when absent or malformed."""
    if "counts" not in b:
        return None
    raw = b["counts"]
    if is_text(raw):
        return [raw]
    if isinstance(raw, list) and raw and all(is_text(x) for x in raw):
        return list(raw)
    c.error("counts must be a fact id or a list of fact ids")
    return None


def check_tiers(c, b, kind, w):
    tiers = b.get("tiers")
    if not isinstance(tiers, list) or not tiers:
        c.error("tiers must be a non-empty list of { at, metal, xp, size } tables")
        return
    prev_at, prev_metal = None, None
    for i, t in enumerate(tiers, 1):
        if not isinstance(t, dict):
            c.error(f"tier {i} must be a table like {{ at = 5, metal = \"bronze\", xp = 100, size = \"win\" }}")
            continue
        tc = c.sub(f"tier {i}: ")
        at = get_number(tc, t, "at")
        if at is not None:
            if prev_at is not None and not at > prev_at:
                tc.error(f"at = {at} does not rise above the tier before it ({prev_at}): tiers must be strictly rising")
            prev_at = at
        metal = get_choice(tc, t, "metal", METALS, note="; no gold, ever")
        if metal is not None:
            idx = METALS.index(metal)
            if prev_metal is not None and idx < prev_metal[0]:
                tc.error(f"metal {metal!r} goes down from {prev_metal[1]!r}; metals only go up ({' < '.join(METALS)})")
            prev_metal = (idx, metal)
        get_choice(tc, t, "size", SIZES)
        if kind == "per_habit_best_run":
            get_number(tc, t, "mult", gt=0)
            if "xp" in t:
                tc.error("a per_habit_best_run tier carries mult, not xp")
        else:
            get_number(tc, t, "xp", ge=0)
        check_title_ref(tc, t, w)
        warn_unknown(tc, t, "tier")


def check_badges(data, w, rep):
    f = "badges.toml"
    badges = entries(data, "badge", f, rep)
    for bid, b in badges.items():
        c = Ctx(rep, f, f"badge.{bid}")
        get_text(c, b, "name")
        kind = get_choice(c, b, "kind", BADGE_KINDS)
        counts = counts_of(c, b)
        if b.get("meaning") == "chosen":
            if counts != ["commendation"]:
                c.error('meaning "chosen" is only for the commendation badge (counts = "commendation")')
        else:
            get_choice(c, b, "meaning", MEANINGS, note=' (or "chosen", for the commendation badge only)')
        get_text(c, b, "caption")
        get_bool(c, b, "free")
        get_choice(c, b, "origin", ORIGINS)
        if kind == "proof":
            codes = b.get("proof_codes")
            if not (isinstance(codes, list) and codes and all(is_text(x) for x in codes)):
                c.error('kind "proof" needs proof_codes: a non-empty list of Proof\'s own codes')
            if "counts" in b:
                c.error('kind "proof" must not have counts (it reads proof_codes)')
        elif kind is not None:
            if "counts" not in b:
                c.error(f'kind "{kind}" needs counts: the fact (or list of facts) it reads')
            elif counts is not None and w.facts is not None:
                for fid in counts:
                    if fid not in w.facts:
                        c.error(f"counts {fid!r} is not a fact in rulebook.toml")
        check_tiers(c, b, kind, w)
        check_patterns(c, b, counts)
        check_habit_ref(c, b, w)
        check_gates(c, b, bid, [(set(badges), "a badge in badges.toml")])
        warn_unknown(c, b, "badge")


# ── Rule 5: achievements ──────────────────────────────────────────────────────────────────────────────────────────

def check_achievements(data, w, rep):
    f = "achievements.toml"
    achievements = entries(data, "achievement", f, rep)
    for aid, a in achievements.items():
        c = Ctx(rep, f, f"achievement.{aid}")
        get_text(c, a, "name")
        get_choice(c, a, "meaning", MEANINGS)
        if "reads" not in a:
            c.error("reads is missing (a fact id, or \"proof\")")
        elif not is_text(a["reads"]):
            c.error(f"reads must be a fact id or \"proof\", found {a['reads']!r}")
        elif a["reads"] == "proof":
            if not is_text(a.get("proof_code")):
                c.error('reads "proof" needs proof_code: Proof\'s own code for it')
        elif w.facts is not None and a["reads"] not in w.facts:
            c.error(f"reads {a['reads']!r} is not a fact in rulebook.toml (or \"proof\")")
        get_text(c, a, "rule")
        get_number(c, a, "xp", ge=0)
        get_choice(c, a, "size", SIZES)
        get_text(c, a, "caption")
        get_bool(c, a, "free")
        get_choice(c, a, "origin", ORIGINS)
        check_title_ref(c, a, w)
        check_patterns(c, a, [a.get("reads")])
        check_gates(c, a, aid, [(set(achievements), "an achievement in achievements.toml"),
                                (w.badge_ids, "a badge in badges.toml")])
        warn_unknown(c, a, "achievement")


# ── Rule 6: titles and skins ──────────────────────────────────────────────────────────────────────────────────────

def check_titles(data, w, rep):
    f = "titles.toml"
    w.title_entries = entries(data, "title", f, rep)
    for tid, t in w.title_entries.items():
        c = Ctx(rep, f, f"title.{tid}")
        get_text(c, t, "name")
        get_choice(c, t, "meaning", TITLE_MEANINGS)
        get_text(c, t, "from")
        get_choice(c, t, "metal", METALS, note="; no gold, ever")
        get_choice(c, t, "origin", ORIGINS)
        check_gates(c, t, tid, [(set(w.title_entries), "a title in titles.toml")])
        warn_unknown(c, t, "title")
    for sid, s in entries(data, "skin", f, rep).items():
        c = Ctx(rep, f, f"skin.{sid}")
        get_text(c, s, "name")
        get_text(c, s, "from")
        get_choice(c, s, "origin", ORIGINS)
        warn_unknown(c, s, "skin")


def check_title_use(w, rep):
    """A title Career Mode creates (origin "new") that nothing awards is dead weight. A template is filled in later, and
    the Grand Slam (meaning "all") is minted by the engine when an athlete holds a title in each meaning, not by an entry."""
    for tid, t in w.title_entries.items():
        if (t.get("origin") == "new" and t.get("template") is not True and t.get("meaning") != "all"
                and tid not in w.title_refs):
            rep.warn("titles.toml", f"title.{tid}", "nothing awards this title: no badge tier, achievement or quest "
                                                    "names it, and it is not a template")


# ── Rule 7: missions ──────────────────────────────────────────────────────────────────────────────────────────────

def check_missions(data, w, rep):
    f = "missions.toml"
    missions = entries(data, "mission", f, rep)
    for mid, m in missions.items():
        c = Ctx(rep, f, f"mission.{mid}")
        get_text(c, m, "name")
        get_choice(c, m, "slot", SLOTS)
        get_choice(c, m, "meaning", MEANINGS)
        get_text(c, m, "asks")
        check_fact_ref(c, m, "counts", w)
        get_choice(c, m, "measure", MEASURES)
        if "target" not in m:
            c.error("target is missing")
        elif m["target"] != "plan_days" and not (is_int(m["target"]) and m["target"] > 0):
            c.error(f'target must be a whole number above 0, or "plan_days", found {m["target"]!r}')
        get_text(c, m, "picked_when")
        get_bool(c, m, "free")
        get_choice(c, m, "origin", ORIGINS)
        if "xp" in m:
            c.error("a mission never has its own xp: it pays share.mission of the work inside it (GAME-7). "
                    "Proof's old figure goes in proof_xp")
        check_habit_ref(c, m, w)
        check_gates(c, m, mid, [(set(missions), "a mission in missions.toml")])
        warn_unknown(c, m, "mission", skip=("xp",))


# ── Rule 8: quests ────────────────────────────────────────────────────────────────────────────────────────────────

def check_quests(data, w, rep):
    f = "quests.toml"
    for qid, q in entries(data, "quest", f, rep).items():
        c = Ctx(rep, f, f"quest.{qid}")
        get_text(c, q, "name")
        get_choice(c, q, "meaning", MEANINGS)
        get_number(c, q, "weeks", ge=2, le=12, integer=True)
        doors = q.get("doors")
        if not (isinstance(doors, list) and doors and all(isinstance(d, str) and d in DOORS for d in doors)):
            c.error(f"doors must be a non-empty list drawn from {', '.join(DOORS)}, found {doors!r}")
        get_bool(c, q, "free")
        get_choice(c, q, "size", SIZES)
        get_text(c, q, "caption")
        get_text(c, q, "reward_badge")
        get_choice(c, q, "origin", ORIGINS)
        check_title_ref(c, q, w)
        steps = q.get("steps")
        if not isinstance(steps, list) or not 2 <= len(steps) <= 5:
            if isinstance(steps, list):
                given = f"{len(steps)} step{'s' if len(steps) != 1 else ''} given"
            else:
                given = f"steps is {steps!r}"
            c.error(f"a quest needs 2 to 5 steps: {given}")
        for i, s in enumerate(steps if isinstance(steps, list) else [], 1):
            sc = c.sub(f"step {i}: ")
            if not isinstance(s, dict):
                sc.error("must be a table like { name = \"...\", closes_on = \"coach_tick\" }")
                continue
            get_text(sc, s, "name")
            if get_choice(sc, s, "closes_on", CLOSERS) == "fact":
                check_fact_ref(sc, s, "counts", w)
                get_number(sc, s, "target", gt=0, integer=True)
            check_habit_ref(sc, s, w)
            warn_unknown(sc, s, "step")
        warn_unknown(c, q, "quest")


# ── Rule 9: recognition ───────────────────────────────────────────────────────────────────────────────────────────

def check_recognition(rec, w, rep):
    f = "recognition.toml"
    if rec.get("sizes") != SIZES:
        rep.error(f, "sizes", f"must be exactly {SIZES}, found {rec.get('sizes')!r}")
    size_tables = rec.get("size") if isinstance(rec.get("size"), dict) else {}
    for s in SIZES:
        c = Ctx(rep, f, f"size.{s}")
        body = size_tables.get(s)
        if not isinstance(body, dict):
            c.error(f"the [size.{s}] table is missing")
            continue
        for who in SIZE_AUDIENCES:
            get_text(c, body, who)

    c = Ctx(rep, f, "courtside")
    courtside = rec.get("courtside")
    if isinstance(courtside, dict):
        get_number(c, courtside, "max_rows_per_week", ge=1, integer=True)
    else:
        c.error("the [courtside] table is missing")
    c = Ctx(rep, f, "bell")
    bell = rec.get("bell")
    if isinstance(bell, dict):
        get_number(c, bell, "keep_days", ge=1, integer=True)
    else:
        c.error("the [bell] table is missing")

    tools = rec.get("tool") if isinstance(rec.get("tool"), dict) else {}
    for name in TOOLS:
        c = Ctx(rep, f, f"tool.{name}")
        body = tools.get(name)
        if not isinstance(body, dict):
            c.error(f"the [tool.{name}] table is missing")
        elif name == "amirs_pick":
            if "title" not in body:
                c.error("title is missing (the title Amir's Pick awards)")
            check_title_ref(c, body, w)

    for mid, m in entries(rec, "message", f, rep).items():
        c = Ctx(rep, f, f"message.{mid}")
        get_text(c, m, "en")
        if "fa" not in m:
            c.error("fa is missing (it may be empty: the Farsi is Amir's to write)")
        elif not isinstance(m["fa"], str):
            c.error(f"fa must be text, found {m['fa']!r}")
        warn_unknown(c, m, "message")


# ── Rule 10: the brand rule ───────────────────────────────────────────────────────────────────────────────────────

def strings_in(node, path):
    if isinstance(node, str):
        yield path, node
    elif isinstance(node, dict):
        for k, v in node.items():
            yield from strings_in(v, f"{path}.{k}" if path else str(k))
    elif isinstance(node, list):
        for i, v in enumerate(node):
            yield from strings_in(v, f"{path}[{i}]")


def check_brand(data, rep):
    for stem in FILES:
        if data[stem] is None:
            continue
        for path, text in strings_in(data[stem], ""):
            for m in BANNED_WORDS.finditer(text):
                rep.error(f"{stem}.toml", path, f"the word {m.group(0)!r} is not allowed in any string "
                                                 f"(brand rule: no gold, yellow, amber or ochre, ever)")


# ── Rule 11: coverage ─────────────────────────────────────────────────────────────────────────────────────────────

def check_coverage(data, w, rep):
    # Missions are actions for one week, and none asks for progress on purpose: a personal best can't be ordered for a
    # week without pushing past the RPE the plan sets (CAREER_MODE.md → Weekly missions). Progress lives in badges,
    # achievements and quests, so the missions shelf is only asked to cover the other three meanings.
    shelves = [("badges", "badge", MEANINGS), ("achievements", "achievement", MEANINGS), ("titles", "title", MEANINGS),
               ("missions", "mission", [m for m in MEANINGS if m != "progress"])]
    for stem, key, wanted in shelves:
        if data[stem] is None:
            continue
        section = data[stem].get(key)
        have = {e["meaning"] for e in (section.values() if isinstance(section, dict) else [])
                if isinstance(e, dict) and not retires(e) and isinstance(e.get("meaning"), str)}
        for meaning in wanted:
            if meaning not in have:
                rep.warn(f"{stem}.toml", "coverage", f"no {key} has the meaning {meaning!r}")
    if data["missions"] is None:
        return
    section = data["missions"].get("mission")
    missions = ([m for m in section.values() if isinstance(m, dict) and not retires(m)]
                if isinstance(section, dict) else [])
    for slot in SLOTS:
        if not any(m.get("slot") == slot for m in missions):
            rep.warn("missions.toml", "coverage", f"no mission in the {slot!r} slot")
    for habit in (w.weights or []):
        if habit in ("strength", "custom"):
            continue
        if not any(m.get("slot") == "recovery" and m.get("habit") == habit for m in missions):
            rep.warn("missions.toml", "coverage", f"no recovery mission for the habit {habit!r}")


# ── Rule 13: the fields that carry Proof's counting ───────────────────────────────────────────────────────────────

def proof_rule_ok(value, allowed, habits):
    """`value` is one of `allowed`, where "x:<habit>" stands for x: followed by a habit id (never custom)."""
    if not isinstance(value, str):
        return False
    for a in allowed:
        if a.endswith(":<habit>"):
            head = a[: -len("<habit>")]
            if value.startswith(head) and value[len(head):] in habits:
                return True
        elif value == a:
            return True
    return False


def check_proof_fields(data, w, rep):
    habits = [h for h in (w.weights or []) if h != "custom"]
    for stem, key in (("badges", "badge"), ("achievements", "achievement"), ("missions", "mission")):
        if data[stem] is None:
            continue
        section = data[stem].get(key)
        for ident, e in (section.items() if isinstance(section, dict) else []):
            if not isinstance(e, dict):
                continue
            c = Ctx(rep, f"{stem}.toml", f"{key}.{ident}")
            if "proof_measure" in e:
                if not proof_rule_ok(e["proof_measure"], PROOF_MEASURES, habits):
                    c.error(f"proof_measure {e['proof_measure']!r} is not one of {', '.join(PROOF_MEASURES)} "
                            f"(<habit> is a habit in [habits.weights])")
                if key == "badge":
                    codes, tiers = e.get("proof_codes"), e.get("tiers")
                    if isinstance(codes, list) and isinstance(tiers, list) and len(codes) != len(tiers):
                        c.error(f"proof_codes has {len(codes)} code(s) for {len(tiers)} tier(s): one Proof code per "
                                f"tier, in order")
                if key == "achievement":
                    get_number(c, e, "proof_need", gt=0, integer=True)
                    if not is_text(e.get("proof_code")):
                        c.error("proof_measure needs proof_code: the code Proof pays it under")
            if "proof_kind" in e:
                if not proof_rule_ok(e["proof_kind"], PROOF_KINDS, habits):
                    c.error(f"proof_kind {e['proof_kind']!r} is not one of {', '.join(PROOF_KINDS)} "
                            f"(<habit> is a habit in [habits.weights])")
                get_number(c, e, "proof_need", gt=0)
                get_number(c, e, "proof_xp", gt=0, integer=True)
                if not is_text(e.get("proof_id")):
                    c.error("proof_kind needs proof_id: the id of Proof's quest")


# ── Rule 14: until the catalogue switch, every habit number equals Proof's ────────────────────────────────────────

def proof_numbers(data):
    """What the catalogue says Proof pays, in the shape of Proof's xp_rules row. Only numbers and codes are read: an
    origin = "proof" entry may also carry retire_at, starts_at and superseded_by (they say when it stops, not what it
    pays), and a retiring entry is still compared, because it is earned exactly as Proof earns it until the catalogue
    switch."""
    rb = data["rulebook"] or {}
    habits = rb.get("habits") if isinstance(rb.get("habits"), dict) else {}
    weights = habits.get("weights") if isinstance(habits.get("weights"), dict) else {}
    fact = rb.get("fact") if isinstance(rb.get("fact"), dict) else {}
    comeback = fact.get("comeback") if isinstance(fact.get("comeback"), dict) else {}
    out = {
        "completionBonus": habits.get("completion_bonus"), "customXp": weights.get("custom"),
        "maxCustom": habits.get("max_custom"), "streakQualifyPct": habits.get("qualify_pct"),
        "gateV2": habits.get("one_miss_door"), "lapseDays": habits.get("lapse_days"),
        "comebackStick": habits.get("comeback_stick"), "comebackXp": comeback.get("xp"),
        "weights": {k: v for k, v in weights.items() if k != "custom"},
        "targets": habits.get("targets") if isinstance(habits.get("targets"), dict) else {},
        "unearnable": sorted(x for x in (habits.get("locked") or []) if isinstance(x, str)),
        "tiers": [], "milestones": [], "quests": [],
    }
    section = (data["badges"] or {}).get("badge")
    for b in (section.values() if isinstance(section, dict) else []):
        if not isinstance(b, dict) or b.get("origin") != "proof":
            continue
        tiers = [t for t in (b.get("tiers") or []) if isinstance(t, dict)] if isinstance(b.get("tiers"), list) else []
        if b.get("kind") == "per_habit_best_run":
            out["tiers"] = [{"days": t.get("at"), "mult": t.get("mult")} for t in tiers]
        elif "proof_measure" in b and isinstance(b.get("proof_codes"), list):
            for code, t in zip(b["proof_codes"], tiers):
                out["milestones"].append((code, t.get("at"), t.get("xp"), b.get("proof_measure")))
    section = (data["achievements"] or {}).get("achievement")
    for a in (section.values() if isinstance(section, dict) else []):
        if isinstance(a, dict) and a.get("origin") == "proof" and "proof_measure" in a:
            out["milestones"].append((a.get("proof_code"), a.get("proof_need"), a.get("xp"), a.get("proof_measure")))
    section = (data["missions"] or {}).get("mission")
    for m in (section.values() if isinstance(section, dict) else []):
        if isinstance(m, dict) and m.get("origin") == "proof" and "proof_kind" in m:
            out["quests"].append((m.get("proof_id"), m.get("proof_kind"), m.get("proof_need"), m.get("proof_xp")))
    return out


def same_number(a, b):
    return is_num(a) and is_num(b) and math.isclose(a, b, rel_tol=0, abs_tol=1e-9)


def _row(code, need, xp, how):
    """A milestone or quest as a comparable tuple: numbers as floats, so 1 and 1.0 are the same."""
    num = lambda v: float(v) if is_num(v) else repr(v)  # noqa: E731
    return (str(code), num(need), num(xp), str(how))


def check_proof_parity(data, rep, snapshot=None):
    rb = data["rulebook"]
    if not catalogue_off(rb):
        return
    f = "rulebook.toml"
    snapshot = pathlib.Path(snapshot or PROOF_SNAPSHOT)
    try:
        proof = json.loads(snapshot.read_text(encoding="utf-8"))["rules"]
        if not isinstance(proof, dict):
            raise ValueError("its rules are not an object")
    except Exception as exc:  # noqa: BLE001 - any failure to read means the check could not run
        rep.warn(f, "shadow", f"could not read Proof's rules from {snapshot} ({exc}): the parity check did not run")
        return
    mine = proof_numbers(data)
    where = {"completionBonus": "[habits] completion_bonus", "customXp": "[habits.weights] custom",
             "maxCustom": "[habits] max_custom", "streakQualifyPct": "[habits] qualify_pct",
             "gateV2": "[habits] one_miss_door", "lapseDays": "[habits] lapse_days",
             "comebackStick": "[habits] comeback_stick", "comebackXp": "[fact.comeback] xp"}
    for key, label in where.items():
        a, b = mine[key], proof.get(key)
        ok = (a is b) if isinstance(a, bool) or isinstance(b, bool) else same_number(a, b)
        if not ok:
            rep.error(f, "shadow", f"{label} is {a!r} but Proof's {key} is {b!r}: until the catalogue switch they must be equal")
    for key, label in (("weights", "[habits.weights]"), ("targets", "[habits.targets]")):
        a = mine[key]
        b = proof.get(key) if isinstance(proof.get(key), dict) else {}
        for h in sorted(set(a) | set(b)):
            if not same_number(a.get(h), b.get(h)):
                rep.error(f, "shadow", f"{label} {h} is {a.get(h)!r} but Proof's is {b.get(h)!r}: until the catalogue "
                                       f"switch they must be equal")
    theirs = sorted(x for x in (proof.get("unearnable") or []) if isinstance(x, str))
    if mine["unearnable"] != theirs:
        rep.error(f, "shadow", f"[habits] locked is {mine['unearnable']!r} but Proof's unearnable is {theirs!r}: until "
                               f"the catalogue switch they must be equal")
    ptiers = [{"days": t.get("days"), "mult": t.get("mult")} for t in (proof.get("tiers") or []) if isinstance(t, dict)]
    if len(mine["tiers"]) != len(ptiers) or not all(
            same_number(x["days"], y["days"]) and same_number(x["mult"], y["mult"])
            for x, y in zip(mine["tiers"], ptiers)):
        rep.error("badges.toml", "badge.habit_tiers", f"the tiers {mine['tiers']!r} are not Proof's {ptiers!r}")
    pm = {_row(m.get("code"), m.get("need"), m.get("xp"), m.get("measure"))
          for m in (proof.get("milestones") or []) if isinstance(m, dict)}
    mm = {_row(*m) for m in mine["milestones"]}
    for row in sorted(pm - mm):
        rep.error("badges.toml", "proof milestones", f"Proof pays the milestone {row[0]} (need {row[1]:g}, {row[2]:g} "
                                                     f"XP, {row[3]}) and no proof badge tier or achievement matches it")
    for row in sorted(mm - pm):
        rep.error("badges.toml", "proof milestones", f"{row[0]} (need {row[1]}, {row[2]} XP, {row[3]}) is not a "
                                                     f"milestone Proof pays: code, need, xp and measure must all match")
    pq = {_row(q.get("id"), q.get("need"), q.get("xp"), q.get("kind"))
          for q in (proof.get("quests") or []) if isinstance(q, dict)}
    mq = {_row(q[0], q[2], q[3], q[1]) for q in mine["quests"]}
    for row in sorted(pq - mq):
        rep.error("missions.toml", "proof quests", f"Proof's quest {row[0]} ({row[3]}, need {row[1]:g}, {row[2]:g} XP) "
                                                   f"has no mission with that proof_id, proof_kind, proof_need and "
                                                   f"proof_xp")
    for row in sorted(mq - pq):
        rep.error("missions.toml", "proof quests", f"{row[0]} ({row[3]}, need {row[1]}, {row[2]} XP) is not a quest "
                                                   f"Proof has: proof_id, proof_kind, proof_need and proof_xp must "
                                                   f"all match")


# ── Rule 17: every new achievement has a rule on the server ───────────────────────────────────────────────────────

def check_server_achievements(data, folder, rep):
    """Rule 17 (phase 3, 2026-10-18). An achievement's `rule` is prose; the server judges each origin = "new" achievement by its own SQL
    (supabase/stage70_career_catalogue.sql, career_evaluate()), which lists the ids it knows in its `-- achievement:` comment lines. A new
    achievement in the file with no rule there would never be minted, silently. Checked only on the repo's own career folder."""
    root = pathlib.Path(__file__).resolve().parent.parent
    if pathlib.Path(folder).resolve() != (root / "career").resolve():
        return
    sql = root / "supabase" / "stage70_career_catalogue.sql"
    if not sql.exists():
        return
    known = set()
    for line in sql.read_text(encoding="utf-8").splitlines():
        m = re.match(r"\s*-- achievement: (.*)$", line)
        if m:
            known |= {mm.group(1) for x in m.group(1).split(",") if (mm := re.match(r"\s*([a-z][a-z0-9_]*)", x))}
    for aid, a in (data.get("achievement") or {}).items():
        if isinstance(a, dict) and a.get("origin") == "new" and aid not in known:
            rep.error("achievements.toml", f"achievement.{aid}",
                      f"the server has no rule for it: add it to career_evaluate() in {sql.name} (its '-- achievement:' list), or it is never minted (rule 17)")


# ── The run, and the summary ──────────────────────────────────────────────────────────────────────────────────────

def check_folder(folder):
    rep = Report()
    data = load_all(folder, rep)
    w = World(data)
    if data["rulebook"] is not None:
        check_rulebook(data["rulebook"], rep)
    if data["titles"] is not None:
        check_titles(data["titles"], w, rep)
    if data["badges"] is not None:
        check_badges(data["badges"], w, rep)
    if data["achievements"] is not None:
        check_achievements(data["achievements"], w, rep)
        check_server_achievements(data["achievements"], folder, rep)
    if data["missions"] is not None:
        check_missions(data["missions"], w, rep)
    if data["quests"] is not None:
        check_quests(data["quests"], w, rep)
    if data["recognition"] is not None:
        check_recognition(data["recognition"], w, rep)
    if data["titles"] is not None:
        check_title_use(w, rep)
    check_brand(data, rep)
    check_coverage(data, w, rep)
    check_proof_fields(data, w, rep)
    if all(data[stem] is not None for stem in ("rulebook", "badges", "achievements", "missions")):
        check_proof_parity(data, rep)
    return rep, data


def count_of(data, stem, key):
    section = data[stem].get(key) if data[stem] is not None else None
    return len(section) if isinstance(section, dict) else 0


def print_summary(folder, data):
    print(f"Career Mode catalogue: {folder}\n")
    print("Entries per file")
    rows = [("rulebook.toml", [("facts", "rulebook", "fact")]),
            ("badges.toml", [("badges", "badges", "badge")]),
            ("achievements.toml", [("achievements", "achievements", "achievement")]),
            ("titles.toml", [("titles", "titles", "title"), ("skins", "titles", "skin")]),
            ("missions.toml", [("missions", "missions", "mission")]),
            ("quests.toml", [("quests", "quests", "quest")]),
            ("recognition.toml", [("messages", "recognition", "message")])]
    for fname, parts in rows:
        stem = fname[:-5]
        if data[stem] is None:
            print(f"  {fname:<18} not read")
        else:
            print(f"  {fname:<18} " + ", ".join(f"{count_of(data, s, k)} {label}" for label, s, k in parts))

    columns = [("badges", "badge"), ("achievements", "achievement"), ("titles", "title"), ("missions", "mission"),
               ("quests", "quest")]
    table = {m: [0] * len(columns) for m in MEANINGS}
    other = [0] * len(columns)
    for col, (stem, key) in enumerate(columns):
        section = data[stem].get(key) if data[stem] is not None else None
        for e in (section.values() if isinstance(section, dict) else []):
            meaning = e.get("meaning") if isinstance(e, dict) else None
            (table[meaning] if isinstance(meaning, str) and meaning in table else other)[col] += 1
    print("\nBy meaning")
    print(f"  {'':<13}" + "".join(f"{stem:>14}" for stem, _ in columns))
    for m in MEANINGS:
        print(f"  {m:<13}" + "".join(f"{n:>14}" for n in table[m]))
    print(f"  {'other':<13}" + "".join(f"{n:>14}" for n in other) + "   (chosen, season, level, all)")


def print_problems(rep):
    for level, label in (("ERROR", "Errors"), ("WARN", "Warnings")):
        items = rep.of(level)
        print(f"\n{label} ({len(items)})")
        for _, file, ident, msg in items:
            print(f"  {level:<5} {file}" + (f" [{ident}]" if ident else "") + f"  {msg}")
        if not items:
            print("  none")


def main(argv=None):
    ap = argparse.ArgumentParser(description="Check Career Mode's catalogue (career/*.toml).")
    ap.add_argument("folder", nargs="?", default=str(DEFAULT_FOLDER), help="the folder to check (default: career/)")
    args = ap.parse_args(argv)
    folder = pathlib.Path(args.folder)
    if not folder.is_dir():
        print(f"{folder} is not a folder", file=sys.stderr)
        return 2
    rep, data = check_folder(folder)
    print_summary(folder, data)
    print_problems(rep)
    errors, warnings = len(rep.of("ERROR")), len(rep.of("WARN"))
    print(f"\n{'FAIL' if errors else 'OK'}: {errors} error{'s' if errors != 1 else ''}, "
          f"{warnings} warning{'s' if warnings != 1 else ''}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
