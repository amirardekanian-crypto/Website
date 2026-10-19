"""Tests for scripts/check_career.py: python -X utf8 -m unittest scripts.test_check_career  (or run this file).

The checker guards Career Mode's catalogue (career/*.toml). Every test works on a fresh copy of the real career folder
in a temp dir and runs the checker as a subprocess, the way a person (or a hook) would:

  * the untouched copy must pass (exit 0), and so must a copy with one small VALID entry added to each file, so a
    broken case below differs from a good one by exactly the thing it names;
  * each broken case adds ONE fault and must exit 1 with a message that says what is wrong and where.

New entries use ids that start with zz_, so a test never depends on a real entry staying as it is.
"""
import json
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
CHECKER = HERE / "check_career.py"
CAREER = HERE.parent / "career"

# One small valid entry per file. A test breaks one thing in one of these.
GOOD_FACT = """
[fact.zz_social]
meaning = "none"
xp = 0
source = "proof"
pays_for = "nothing"
when = "A test social action."
"""
GOOD_BADGE = """
[badge.zz_good]
name = "ZZ Good"
meaning = "consistency"
kind = "total"
counts = "session_finished"
caption = "{n} test sessions."
free = true
origin = "new"
tiers = [
  { at = 1, metal = "bronze", xp = 10, size = "win" },
  { at = 5, metal = "silver", xp = 20, size = "win" },
]
"""
GOOD_TITLE = """
[title.zz_good]
name = "ZZ GOOD"
meaning = "progress"
from = "a test"
metal = "emerald"
origin = "new"
"""
GOOD_ACHIEVEMENT = """
[achievement.zz_good]
name = "ZZ Good"
meaning = "progress"
reads = "personal_best"
test = "first"
rule = "A test rule."
xp = 10
size = "win"
caption = "A test caption."
free = true
origin = "new"
"""
GOOD_MISSION = """
[mission.zz_good]
name = "ZZ Good"
slot = "stretch"
meaning = "commitment"
asks = "Do the test thing."
counts = "library_session"
measure = "count"
target = 1
picked_when = "Never."
free = true
origin = "new"
"""
GOOD_QUEST = """
[quest.zz_good]
name = "ZZ Good"
meaning = "resilience"
weeks = 4
doors = ["coach"]
free = false
size = "milestone"
caption = "A test quest."
reward_badge = "ZZ Good"
origin = "new"
steps = [
  { name = "First", closes_on = "fact", counts = "week_held", target = 1 },
  { name = "Second", closes_on = "coach_tick" },
]
"""
GOOD_MESSAGE = """
[message.zz_good]
used_for = "a test"
en = "A test line."
fa = ""
"""


def swap(block, old, new):
    """The block with `old` replaced by `new`, failing loudly if `old` is not in it (so a test cannot pass by accident)."""
    assert old in block, f"{old!r} is not in the fixture"
    return block.replace(old, new, 1)


AWARDS_TITLE = swap(GOOD_ACHIEVEMENT, "free = true\n", 'free = true\ntitle = "zz_good"\n')   # names the title in GOOD_TITLE

# The catalogue switch (Four Majors, 2026-10-17): a best_value badge, a badge that retires, and the one that takes its place.
BEST_VALUE_BADGE = swap(swap(GOOD_BADGE.replace("zz_good", "zz_value"), 'kind = "total"', 'kind = "best_value"'),
                        'counts = "session_finished"', 'counts = "lift_gain"')
RETIRING_BADGE = swap(GOOD_BADGE.replace("zz_good", "zz_old"), 'origin = "new"\n',
                      'origin = "new"\nretire_at = "catalogue"\nsuperseded_by = "zz_new"\n')
REPLACEMENT_BADGE = swap(GOOD_BADGE.replace("zz_good", "zz_new"), 'origin = "new"\n', 'origin = "new"\nstarts_at = "catalogue"\n')


LOCK = "tiers.lock.json"
SEED = HERE / "career_seed.py"


def best_run(run, counts="week_held", extra=""):
    """A valid best_run badge (zz_run) with the given run (None: no run line), counts and extra lines."""
    block = swap(GOOD_BADGE.replace("zz_good", "zz_run"), 'kind = "total"', f'kind = "best_run"\n{extra}')
    block = swap(block, 'counts = "session_finished"', f'counts = "{counts}"')
    return swap(block, 'origin = "new"\n', 'origin = "new"\n' + ("" if run is None else f'run = "{run}"\n'))


def achievement(test_lines, reads="personal_best", name="zz_a", extra=""):
    """A valid achievement whose `test = "first"` line is replaced by test_lines."""
    block = GOOD_ACHIEVEMENT.replace("zz_good", name)
    block = swap(block, 'reads = "personal_best"', f'reads = "{reads}"' + (f"\n{extra}" if extra else ""))
    return swap(block, 'test = "first"', test_lines)


# One valid achievement per test (rule 18).
VALID_TESTS = {
    "first": achievement('test = "first"', name="zz_first"),
    "proof": achievement('test = "proof"\nproof_measure = "daysHit:strength"\nproof_need = 5', reads="proof",
                         name="zz_proof", extra='proof_code = "ZZ"'),
    "goals": achievement('test = "goals"\ngoals = [{ kind = "daysHit:strength", need = 4 }, { kind = "qualify", need = 3 }]',
                         name="zz_goals"),
    "cycle_all_held": achievement('test = "cycle_all_held"', name="zz_flaw"),
    "cycle_by_the_book": achievement('test = "cycle_by_the_book"', name="zz_book"),
    "cycle_with_broken": achievement('test = "cycle_with_broken"', name="zz_broke"),
    "runs_together": achievement('test = "runs_together"\nhabits = ["steps", "sleep"]\nrun = 7', name="zz_together"),
    "best_value": achievement('test = "best_value"\nat = 100', reads="lift_gain", name="zz_value"),
    "patterns_in_cycle": achievement('test = "patterns_in_cycle"\ngroups = { squat = ["squat"], '
                                     'push = ["push-horizontal", "push-vertical"] }', name="zz_patterns"),
    "cycle_proving": achievement('test = "cycle_proving"\nbests = 3\nretests = 1', name="zz_proving"),
    "run_regained": achievement('test = "run_regained"\naway_weeks = 4', name="zz_regained"),
}


class CareerCheckerTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.dir = Path(tmp.name) / "career"
        shutil.copytree(CAREER, self.dir)

    # ── helpers ───────────────────────────────────────────────────────────────────────────────────────────────────
    def run_checker(self, folder=None):
        p = subprocess.run([sys.executable, "-X", "utf8", str(CHECKER), str(folder or self.dir)],
                           capture_output=True, text=True, encoding="utf-8", timeout=120)
        return p.returncode, p.stdout + p.stderr

    def append(self, filename, block):
        path = self.dir / filename
        path.write_text(path.read_text(encoding="utf-8") + block, encoding="utf-8", newline="\n")

    def catalogue_on(self):
        """Both switches on (the catalogue switch needs the XP switch): rule 14 no longer holds Proof's numbers."""
        self.set_key("rulebook.toml", "switch", "xp", '"2026-10-18"')
        self.set_key("rulebook.toml", "switch", "catalogue", '"2026-10-18"')

    def catalogue_off(self):
        """The state before the catalogue switch (the XP switch on, the catalogue switch off): rule 14 holds Proof's
        numbers. The real rulebook says the switch day now (2026-10-18), so a test of rule 14 puts it back to "off"
        in its own copy first."""
        self.set_key("rulebook.toml", "switch", "catalogue", '"off"')

    def set_key(self, filename, table, key, literal):
        """Set `key = literal` inside [table] (None: the keys before the first table), keeping any trailing comment.
        Whatever the key is worth today does not matter, so tuning a number in the real files never breaks a test."""
        path = self.dir / filename
        lines = path.read_text(encoding="utf-8").split("\n")
        where = None
        for i, line in enumerate(lines):
            header = re.match(r"^\[([^\]]+)\]\s*(#.*)?$", line)
            if header:
                where = header.group(1)
                continue
            m = re.match(rf"^({re.escape(key)}\s*=\s*)(.*?)(\s+#.*)?$", line)
            if where == table and m:
                lines[i] = m.group(1) + literal + (m.group(3) or "")
                path.write_text("\n".join(lines), encoding="utf-8", newline="\n")
                return
        self.fail(f"{filename} has no `{key}` in [{table}]: update this test")

    def put_key(self, filename, table, key, literal):
        """Set `key = literal` inside [table]: replaced when the key is already there, else added right under the
        table's header. A test about a gate never breaks because the real file already carries it."""
        path = self.dir / filename
        lines = path.read_text(encoding="utf-8").split("\n")
        where, header_at = None, None
        for i, line in enumerate(lines):
            header = re.match(r"^\[([^\]]+)\]\s*(#.*)?$", line)
            if header:
                where = header.group(1)
                if where == table:
                    header_at = i
                continue
            m = re.match(rf"^({re.escape(key)}\s*=\s*)(.*?)(\s+#.*)?$", line)
            if where == table and m:
                lines[i] = m.group(1) + literal + (m.group(3) or "")
                path.write_text("\n".join(lines), encoding="utf-8", newline="\n")
                return
        if header_at is None:
            self.fail(f"{filename} has no [{table}]: update this test")
        lines.insert(header_at + 1, f"{key} = {literal}")
        path.write_text("\n".join(lines), encoding="utf-8", newline="\n")

    def assertFails(self, *needles):
        rc, out = self.run_checker()
        self.assertEqual(rc, 1, "expected exit 1\n" + out)
        for needle in needles:
            self.assertIn(needle, out)
        return out

    def assertPasses(self, *needles):
        rc, out = self.run_checker()
        self.assertEqual(rc, 0, "expected exit 0\n" + out)
        for needle in needles:
            self.assertIn(needle, out)
        return out

    # ── the controls ──────────────────────────────────────────────────────────────────────────────────────────────
    def test_untouched_copy_passes(self):
        out = self.assertPasses("OK: 0 errors")
        self.assertIn("Entries per file", out)
        self.assertIn("By meaning", out)

    def test_one_valid_entry_per_file_passes(self):
        for filename, block in (("rulebook.toml", GOOD_FACT), ("badges.toml", GOOD_BADGE), ("titles.toml", GOOD_TITLE),
                                ("achievements.toml", AWARDS_TITLE), ("missions.toml", GOOD_MISSION),
                                ("quests.toml", GOOD_QUEST), ("recognition.toml", GOOD_MESSAGE)):
            self.append(filename, block)
        out = self.assertPasses("OK: 0 errors")
        self.assertNotIn("nothing awards", out)          # the achievement's title = "zz_good" counts as awarding it

    def test_a_missing_folder_exits_2(self):
        rc, out = self.run_checker(self.dir / "nowhere")
        self.assertEqual(rc, 2, out)

    # ── the eight cases the task names ────────────────────────────────────────────────────────────────────────────
    def test_badge_with_meaning_bravery(self):
        self.append("badges.toml", swap(GOOD_BADGE, 'meaning = "consistency"', 'meaning = "bravery"'))
        self.assertFails("badges.toml", "[badge.zz_good]", "meaning 'bravery' is not one of")

    def test_mission_with_its_own_xp(self):
        self.append("missions.toml", swap(GOOD_MISSION, "free = true\n", "free = true\nxp = 100\n"))
        self.assertFails("missions.toml", "[mission.zz_good]", "GAME-7")

    def test_gold_metal(self):
        self.append("badges.toml", swap(GOOD_BADGE, 'metal = "bronze"', 'metal = "gold"'))
        out = self.assertFails("[badge.zz_good]", "metal 'gold' is not one of")
        self.assertIn("brand rule", out)          # the brand rule fires too: gold is banned in any string

    def test_tier_title_that_does_not_exist(self):
        self.append("badges.toml", swap(GOOD_BADGE, 'size = "win" },\n  { at = 5',
                                        'size = "win", title = "no_such_title" },\n  { at = 5'))
        self.assertFails("[badge.zz_good]", "tier 1", "title 'no_such_title' is not in titles.toml")

    def test_tiers_out_of_order(self):
        self.append("badges.toml", swap(swap(GOOD_BADGE, "at = 1,", "at = 9,"), "at = 5,", "at = 3,"))
        self.assertFails("[badge.zz_good]", "tier 2", "strictly rising")

    def test_social_fact_with_xp(self):
        self.append("rulebook.toml", swap(GOOD_FACT, "xp = 0", "xp = 50"))
        self.assertFails("rulebook.toml", "[fact.zz_social]", "GAME-6", "xp = 50")

    def test_quest_with_one_step(self):
        self.append("quests.toml", swap(GOOD_QUEST, '  { name = "Second", closes_on = "coach_tick" },\n', ""))
        self.assertFails("quests.toml", "[quest.zz_good]", "a quest needs 2 to 5 steps: 1 step given")

    def test_mission_counting_an_unknown_fact(self):
        self.append("missions.toml", swap(GOOD_MISSION, 'counts = "library_session"', 'counts = "no_such_fact"'))
        self.assertFails("[mission.zz_good]", "counts 'no_such_fact' is not a fact in rulebook.toml")

    # ── the other rules ───────────────────────────────────────────────────────────────────────────────────────────
    def test_a_file_that_does_not_parse(self):
        self.append("badges.toml", "\n[badge.zz_broken\nname = \"unfinished\"\n")
        self.assertFails("badges.toml", "does not parse")

    def test_a_missing_file(self):
        (self.dir / "quests.toml").unlink()
        self.assertFails("quests.toml", "file not found")

    def test_rulebook_meanings_must_be_the_four(self):
        self.set_key("rulebook.toml", None, "meanings", '["consistency", "commitment", "progress", "bravery"]')
        self.assertFails("rulebook.toml", "[meanings]", "bravery")

    def test_level_curve_and_shares_are_checked(self):
        self.set_key("rulebook.toml", "level", "base", "0")
        self.set_key("rulebook.toml", "share", "mission", "1.5")
        self.set_key("rulebook.toml", "fact.cycle_finished", "min_share", "0")
        self.assertFails("[level]", "base = 0 must be above 0", "[share]", "mission = 1.5 must be 1 or less",
                         "[fact.cycle_finished]", "min_share = 0 must be above 0")

    def test_a_fact_needs_exactly_one_of_xp_and_xp_from(self):
        self.append("rulebook.toml", swap(GOOD_FACT, "xp = 0\n", "xp = 0\nxp_from = \"habits\"\n"))
        self.assertFails("[fact.zz_social]", "exactly one of xp or xp_from (it has both)")

    def test_pays_for_progress_needs_meaning_progress(self):
        self.append("rulebook.toml", swap(swap(GOOD_FACT, 'meaning = "none"', 'meaning = "commitment"'),
                                          'pays_for = "nothing"', 'pays_for = "progress"'))
        self.assertFails("[fact.zz_social]", 'pays_for "progress" needs meaning "progress"')

    def test_a_banned_colour_word_in_any_string(self):
        for word in ("golden", "Yellow", "AMBER", "ochre"):
            with self.subTest(word=word):
                self.setUp()
                self.append("achievements.toml", swap(GOOD_ACHIEVEMENT, 'caption = "A test caption."',
                                                      f'caption = "A {word} moment."'))
                self.assertFails("achievement.zz_good.caption", "brand rule")
        # a word that merely contains one is fine
        self.setUp()
        self.append("achievements.toml", swap(GOOD_ACHIEVEMENT, 'caption = "A test caption."',
                                              'caption = "Goldilocks in the chamber."'))
        self.assertPasses("OK: 0 errors")

    def test_proof_kind_badge_needs_proof_codes_and_no_counts(self):
        bad = swap(GOOD_BADGE, 'kind = "total"', 'kind = "proof"')           # still has counts, has no proof_codes
        self.append("badges.toml", bad)
        self.assertFails("[badge.zz_good]", 'needs proof_codes', 'must not have counts')

    def test_per_habit_best_run_tier_needs_mult_and_no_xp(self):
        self.append("badges.toml", swap(GOOD_BADGE, 'kind = "total"', 'kind = "per_habit_best_run"'))
        self.assertFails("[badge.zz_good]", "tier 1", "mult is missing", "carries mult, not xp")

    def test_other_kinds_need_xp_on_every_tier(self):
        self.append("badges.toml", swap(GOOD_BADGE, "xp = 10, ", ""))
        self.assertFails("[badge.zz_good]", "tier 1", "xp is missing")

    def test_chosen_is_for_the_commendation_badge_only(self):
        self.append("badges.toml", swap(GOOD_BADGE, 'meaning = "consistency"', 'meaning = "chosen"'))
        self.assertFails("[badge.zz_good]", 'meaning "chosen" is only for the commendation badge')

    def test_a_metal_may_repeat_but_not_go_down(self):
        self.append("badges.toml", swap(GOOD_BADGE, 'metal = "bronze"', 'metal = "silver"'))
        self.assertPasses("OK: 0 errors")            # silver, silver: allowed (Proof's day streak does this)
        self.setUp()
        self.append("badges.toml", swap(swap(GOOD_BADGE, 'metal = "bronze"', 'metal = "silver"'),
                                        'metal = "silver", xp = 20', 'metal = "bronze", xp = 20'))
        self.assertFails("[badge.zz_good]", "tier 2", "metal 'bronze' goes down from 'silver'")

    def test_an_achievement_that_reads_proof_needs_a_proof_code(self):
        self.append("achievements.toml", swap(GOOD_ACHIEVEMENT, 'reads = "personal_best"', 'reads = "proof"'))
        self.assertFails("[achievement.zz_good]", "proof_code")

    def test_an_achievement_that_reads_an_unknown_fact_or_title(self):
        self.append("achievements.toml", swap(swap(GOOD_ACHIEVEMENT, 'reads = "personal_best"', 'reads = "no_such_fact"'),
                                              "free = true\n", 'free = true\ntitle = "no_such_title"\n'))
        self.assertFails("[achievement.zz_good]", "reads 'no_such_fact' is not a fact", "title 'no_such_title'")

    def test_a_title_needs_a_known_meaning_and_metal(self):
        self.append("titles.toml", swap(swap(GOOD_TITLE, 'meaning = "progress"', 'meaning = "bravery"'),
                                        'metal = "emerald"', 'metal = "iron"'))
        self.assertFails("[title.zz_good]", "meaning 'bravery'", "metal 'iron'")

    def test_a_mission_needs_a_whole_target_and_a_known_habit(self):
        self.append("missions.toml", swap(swap(GOOD_MISSION, "target = 1", "target = 0"),
                                          "free = true\n", 'free = true\nhabit = "juggling"\n'))
        self.assertFails("[mission.zz_good]", "target must be a whole number above 0", "habit 'juggling' is not in")

    def test_plan_days_is_a_valid_mission_target(self):
        self.append("missions.toml", swap(GOOD_MISSION, "target = 1", 'target = "plan_days"'))
        self.assertPasses("OK: 0 errors")

    def test_a_quest_has_two_to_twelve_weeks_and_at_most_five_steps(self):
        steps = "".join(f'  {{ name = "Step {i}", closes_on = "coach_tick" }},\n' for i in range(3, 7))
        quest = swap(swap(GOOD_QUEST, "weeks = 4", "weeks = 13"), '  { name = "Second", closes_on = "coach_tick" },\n',
                     '  { name = "Second", closes_on = "coach_tick" },\n' + steps)
        self.append("quests.toml", quest)
        self.assertFails("[quest.zz_good]", "weeks = 13 must be 12 or less", "a quest needs 2 to 5 steps: 6 steps given")

    def test_a_quest_step_that_closes_on_a_fact_needs_a_known_fact_and_a_target(self):
        self.append("quests.toml", swap(GOOD_QUEST, '{ name = "First", closes_on = "fact", counts = "week_held", target = 1 }',
                                        '{ name = "First", closes_on = "fact", counts = "no_such_fact" }'))
        self.assertFails("[quest.zz_good]", "step 1", "counts 'no_such_fact' is not a fact", "target is missing")

    def test_a_quest_door_must_be_known(self):
        self.append("quests.toml", swap(GOOD_QUEST, 'doors = ["coach"]', 'doors = ["coach", "stranger"]'))
        self.assertFails("[quest.zz_good]", "doors must be a non-empty list")

    def test_a_whatsapp_line_needs_en_and_an_fa_key(self):
        self.append("recognition.toml", swap(GOOD_MESSAGE, 'fa = ""\n', ""))
        self.assertFails("recognition.toml", "[message.zz_good]", "fa is missing")
        self.setUp()
        self.append("recognition.toml", swap(GOOD_MESSAGE, 'en = "A test line."', 'en = ""'))
        self.assertFails("[message.zz_good]", "en must be non-empty text")

    def test_amirs_pick_must_name_a_real_title(self):
        self.put_key("recognition.toml", "tool.amirs_pick", "title", '"nobody_has_this"')   # it names none since the cut (stage78)
        self.assertFails("[tool.amirs_pick]", "title 'nobody_has_this' is not in titles.toml")

    def test_recognition_sizes_are_the_five(self):
        self.set_key("recognition.toml", None, "sizes", '["tick", "win", "highlight", "milestone", "mythic"]')
        self.assertFails("recognition.toml", "[sizes]", "mythic")

    def test_a_social_fact_that_still_pays_is_caught_in_the_real_rulebook_too(self):
        # the real kudos fact: give it xp and pays_for, and GAME-6 names both
        self.set_key("rulebook.toml", "fact.kudos", "xp", "25")
        self.set_key("rulebook.toml", "fact.kudos", "pays_for", '"act"')
        self.assertFails("[fact.kudos]", "xp = 25", 'pays_for = "nothing"', "GAME-6")

    def test_odd_shapes_are_reported_and_never_crash_the_checker(self):
        # Each body replaces one whole file (so a top-level `badge = 5` does not clash with the real tables) and is
        # valid TOML of the wrong shape: the checker must say what is wrong, not raise.
        odd = {
            "badges.toml": ["badge = 5\n",
                            '[badge.a]\nmeaning = ["x"]\nkind = {a = 1}\ncounts = 5\ntiers = [5, {at = "a", metal = ["x"]}]\n'],
            "achievements.toml": ["achievement = []\n", '[achievement.a]\nreads = 5\nxp = "x"\nsize = []\ntitle = ["a"]\n'],
            "titles.toml": ['[title.a]\nname = 1\nmeaning = {}\nmetal = 4\n', "skin = 1\n"],
            "missions.toml": ['[mission.a]\ntarget = true\nmeasure = []\nhabit = ["x"]\ncounts = ["a"]\n'],
            "quests.toml": ["quest = 1\n", '[quest.a]\nweeks = "x"\ndoors = "coach"\nsteps = [1, {closes_on = ["a"]}]\n'],
            "recognition.toml": ['size = 5\ntool = 3\nmessage = 2\ncourtside = 1\nbell = []\nsizes = "x"\n'],
            "rulebook.toml": ["meanings = 5\nlevel = 3\nshare = []\nhabits = 7\nfact = 4\n"],
        }
        for filename, bodies in odd.items():
            for body in bodies:
                with self.subTest(file=filename, body=body[:40]):
                    self.setUp()
                    (self.dir / filename).write_text(body, encoding="utf-8", newline="\n")
                    rc, out = self.run_checker()
                    self.assertNotIn("Traceback", out)
                    self.assertNotIn("does not parse", out)          # it is valid TOML, just the wrong shape
                    self.assertEqual(rc, 1, out)                      # and the checker says so

    # ── warnings never fail a check ───────────────────────────────────────────────────────────────────────────────
    def test_an_unused_title_is_a_warning_not_an_error(self):
        self.append("titles.toml", GOOD_TITLE)           # origin "new", no template, nothing awards it
        out = self.assertPasses("OK: 0 errors")
        self.assertIn("WARN", out)
        self.assertIn("[title.zz_good]  nothing awards this title", out)

    def test_a_template_title_and_a_proof_title_may_stand_alone(self):
        self.append("titles.toml", swap(GOOD_TITLE, 'origin = "new"', 'origin = "new"\ntemplate = true'))
        self.append("titles.toml", swap(swap(GOOD_TITLE, "zz_good", "zz_proof"), 'origin = "new"', 'origin = "proof"'))
        out = self.assertPasses("OK: 0 errors")
        self.assertNotIn("nothing awards", out)

    def test_an_unknown_key_is_a_warning_but_a_known_extra_is_not(self):
        self.append("achievements.toml", swap(GOOD_ACHIEVEMENT, "free = true\n", "free = true\nxpp = 5\nproof_id = \"x\"\n"))
        out = self.assertPasses("OK: 0 errors")
        self.assertIn("unknown key 'xpp'", out)
        self.assertNotIn("unknown key 'proof_id'", out)

    def test_a_mistyped_table_name_is_a_warning(self):
        self.append("badges.toml", GOOD_BADGE.replace("[badge.", "[badges."))
        out = self.assertPasses("OK: 0 errors")
        self.assertIn("unknown top-level key 'badges'", out)

    def test_an_id_should_be_snake_case(self):
        self.append("badges.toml", GOOD_BADGE.replace("zz_good", "Zz-Good"))
        out = self.assertPasses("OK: 0 errors")
        self.assertIn("snake_case", out)

    def test_coverage_gaps_are_warnings(self):
        # a missions file with one stretch mission: no plan, recovery or crew slot, no recovery mission for any habit
        (self.dir / "missions.toml").write_text(GOOD_MISSION, encoding="utf-8", newline="\n")
        self.catalogue_on()   # Proof's quests are gone too: parity is not this test
        out = self.assertPasses("OK: 0 errors")
        for gap in ("no mission in the 'plan' slot", "no mission in the 'recovery' slot", "no mission in the 'crew' slot",
                    "no recovery mission for the habit 'steps'", "no recovery mission for the habit 'supps'",
                    "no mission has the meaning 'consistency'"):
            self.assertIn(gap, out)
        self.assertNotIn("no mission in the 'stretch' slot", out)
        self.assertNotIn("no mission has the meaning 'progress'", out)   # no mission asks for progress, on purpose
        self.assertNotIn("no recovery mission for the habit 'strength'", out)
        self.assertNotIn("no recovery mission for the habit 'custom'", out)

    # ── rules 13 and 14: Proof's counting, and the parity with Proof until the catalogue switch ─────────────────────
    def test_in_shadow_a_habit_number_must_equal_proofs(self):
        self.catalogue_off()
        self.set_key("rulebook.toml", "habits.weights", "water", "31")
        self.assertFails("[habits.weights] water is 31 but Proof's is 30")

    def test_in_shadow_the_day_gate_must_equal_proofs(self):
        self.catalogue_off()
        self.set_key("rulebook.toml", "habits", "qualify_pct", "75")
        self.assertFails("[habits] qualify_pct is 75 but Proof's streakQualifyPct is 80")

    def test_in_shadow_a_proof_quest_must_match(self):
        self.catalogue_off()
        self.set_key("missions.toml", "mission.no_negotiation", "proof_need", "6")
        self.assertFails("Proof's quest w_supps7 (daysHit:supps, need 7, 140 XP) has no mission")

    def test_after_the_catalogue_switch_the_habit_numbers_may_move(self):
        self.catalogue_on()
        self.set_key("rulebook.toml", "habits.weights", "water", "45")
        self.assertPasses("OK: 0 errors")

    def test_the_xp_switch_alone_keeps_proofs_numbers(self):
        # phase 2: Proof's phone previews a tick with these numbers, so they stay Proof's until the catalogue switch
        self.catalogue_off()
        self.set_key("rulebook.toml", "switch", "xp", '"2026-10-18"')
        self.set_key("rulebook.toml", "habits.weights", "water", "31")
        self.assertFails("[habits.weights] water is 31 but Proof's is 30", "until the catalogue switch")

    def test_a_proof_measure_or_kind_must_be_known(self):
        # (the badge half of this case left with Proof's badges in the cut, stage78)
        self.set_key("missions.toml", "mission.dead_calm", "proof_kind", '"dayshit:breathe"')
        self.assertFails("proof_kind 'dayshit:breathe' is not one of")

    def test_the_new_rulebook_fields_are_checked(self):
        self.set_key("rulebook.toml", "habits", "one_miss_door", '"yes"')
        self.set_key("rulebook.toml", "fact.library_session", "limit_per", '"month"')
        self.set_key("rulebook.toml", "habits.targets", "sleep", "0")
        self.assertFails("one_miss_door must be true or false", "limit_per 'month' is not one of",
                         "the target of 'sleep' must be a number above 0")

    def test_a_file_that_does_not_parse_does_not_hide_the_others(self):
        self.append("titles.toml", "\n[title.zz_broken\n")
        self.append("missions.toml", swap(GOOD_MISSION, 'counts = "library_session"', 'counts = "no_such_fact"'))
        self.assertFails("titles.toml", "does not parse", "counts 'no_such_fact' is not a fact")

    # ── the switch (Four Majors, 2026-10-17): best_value, retire_at, starts_at, superseded_by, the Grand Slam ──────
    def test_a_best_value_badge_passes(self):
        self.append("badges.toml", BEST_VALUE_BADGE)
        self.assertPasses("OK: 0 errors")

    def test_game_10_patterns_on_lift_gain_entries(self):
        good = swap(BEST_VALUE_BADGE, 'counts = "lift_gain"\n', 'counts = "lift_gain"\npatterns = ["squat", "pull-vertical"]\n')
        self.append("badges.toml", good)
        self.assertPasses("OK: 0 errors")
        self.setUp()
        self.append("achievements.toml", achievement('test = "best_value"\nat = 100\npatterns = ["hinge"]',
                                                     reads="lift_gain", name="zz_value"))
        self.assertPasses("OK: 0 errors")

    def test_game_10_patterns_are_checked(self):
        bad = lambda v: swap(BEST_VALUE_BADGE, 'counts = "lift_gain"\n', f'counts = "lift_gain"\npatterns = {v}\n')
        self.append("badges.toml", bad('["squat", "no-such-pattern"]'))
        self.assertFails("[badge.zz_value]", "'no-such-pattern' is not a Spine pattern")
        self.setUp()
        self.append("badges.toml", bad("[]"))
        self.assertFails("[badge.zz_value]", "patterns must be a non-empty list")
        self.setUp()
        self.append("badges.toml", bad('"squat"'))
        self.assertFails("[badge.zz_value]", "patterns must be a non-empty list")
        self.setUp()   # not a lift-gain entry
        self.append("badges.toml", swap(GOOD_BADGE.replace("zz_good", "zz_plain"), 'origin = "new"\n',
                                        'origin = "new"\npatterns = ["squat"]\n'))
        self.assertFails("[badge.zz_plain]", "patterns is only for an entry that reads the fact lift_gain")
        self.setUp()
        self.append("achievements.toml", achievement('test = "first"\npatterns = ["squat"]', name="zz_plainach"))
        self.assertFails("[achievement.zz_plainach]", "patterns is only for an entry that reads the fact lift_gain")
        self.setUp()   # reads lift_gain but not as a best value: the server would ignore the key there
        self.append("badges.toml", swap(swap(BEST_VALUE_BADGE, 'kind = "best_value"', 'kind = "total"'),
                                        'counts = "lift_gain"\n', 'counts = "lift_gain"\npatterns = ["squat"]\n'))
        self.assertFails("[badge.zz_value]", "patterns is only for an entry that reads the fact lift_gain as its best value")
        self.setUp()
        self.append("achievements.toml", achievement('test = "first"\npatterns = ["squat"]', reads="lift_gain", name="zz_firstgain"))
        self.assertFails("[achievement.zz_firstgain]", "patterns is only for an entry that reads the fact lift_gain as its best value")

    # ── GAME-10 (Amir, 2026-10-18: accessories are out of The Upgrade and Double Up): qualities and exclude narrow `patterns` ──
    @staticmethod
    def lift_badge(extra):
        """A valid best_value lift_gain badge (zz_value) with `extra` lines right under its counts."""
        return swap(BEST_VALUE_BADGE, 'counts = "lift_gain"\n', 'counts = "lift_gain"\n' + extra)

    @staticmethod
    def lift_achievement(extra):
        """A valid best_value lift_gain achievement (zz_value) with `extra` lines under its test."""
        return achievement('test = "best_value"\nat = 100\n' + extra, reads="lift_gain", name="zz_value")

    def test_game_10_qualities_and_exclude_pass_beside_patterns(self):
        both = 'patterns = ["squat", "pull-vertical"]\nqualities = ["strength"]\nexclude = ["cable-face-pull", "back-extension-45"]\n'
        self.append("badges.toml", self.lift_badge(both))
        self.assertPasses("OK: 0 errors")
        self.setUp()
        self.append("achievements.toml", self.lift_achievement(both))
        self.assertPasses("OK: 0 errors")
        for alone in ('qualities = ["strength", "power", "muscle"]\n', 'exclude = ["machine-reverse-fly"]\n'):
            self.setUp()   # each key stands without the other
            self.append("badges.toml", self.lift_badge('patterns = ["hinge"]\n' + alone))
            self.assertPasses("OK: 0 errors")
            self.setUp()
            self.append("achievements.toml", self.lift_achievement('patterns = ["hinge"]\n' + alone))
            self.assertPasses("OK: 0 errors")

    def test_game_10_qualities_are_checked(self):
        bad = lambda v: self.lift_badge(f'patterns = ["squat"]\nqualities = {v}\n')
        self.append("badges.toml", bad('["strength", "stamina"]'))
        out = self.assertFails("[badge.zz_value]", "qualities 'stamina' is not one of the Spine's qualities", "(GAME-10)")
        self.assertNotIn("qualities 'strength'", out)
        for v in ("[]", '"strength"', "[1]", '["strength", ""]'):
            self.setUp()
            self.append("badges.toml", bad(v))
            self.assertFails("[badge.zz_value]", "qualities must be a non-empty list")
        self.setUp()
        self.append("achievements.toml", self.lift_achievement('patterns = ["hinge"]\nqualities = ["strong"]\n'))
        self.assertFails("[achievement.zz_value]", "qualities 'strong' is not one of the Spine's qualities")
        self.setUp()
        self.append("achievements.toml", self.lift_achievement('patterns = ["hinge"]\nqualities = "strength"\n'))
        self.assertFails("[achievement.zz_value]", "qualities must be a non-empty list")

    def test_game_10_exclude_is_checked(self):
        bad = lambda v: self.lift_badge(f'patterns = ["squat"]\nexclude = {v}\n')
        for v in ("[]", '"cable-face-pull"', "[1]", '["cable-face-pull", ""]'):
            self.setUp()
            self.append("badges.toml", bad(v))
            self.assertFails("[badge.zz_value]", "exclude must be a non-empty list of Spine ids")
        for v in ('Cable Face Pull', 'cable_face_pull', '-cable', 'cable--pull', 'cable-face-pull-', 'Cable-Face-Pull', 'cable face-pull'):
            self.setUp()
            self.append("badges.toml", bad(f'["back-extension-45", "{v}"]'))
            self.assertFails("[badge.zz_value]", f"exclude '{v}' is not a Spine id", "(GAME-10)")
        self.setUp()
        self.append("badges.toml", bad('["cable-face-pull", "back-extension-45", "cable-face-pull"]'))
        out = self.assertFails("[badge.zz_value]", "exclude lists 'cable-face-pull' twice", "(GAME-10)")
        self.assertNotIn("back-extension-45", out)
        self.setUp()
        self.append("achievements.toml", self.lift_achievement('patterns = ["hinge"]\nexclude = ["cable-face-pull", "cable-face-pull"]\n'))
        self.assertFails("[achievement.zz_value]", "exclude lists 'cable-face-pull' twice")
        self.setUp()
        self.append("achievements.toml", self.lift_achievement('patterns = ["hinge"]\nexclude = ["Cable Face Pull"]\n'))
        self.assertFails("[achievement.zz_value]", "exclude 'Cable Face Pull' is not a Spine id")

    def test_game_10_qualities_and_exclude_need_patterns(self):
        for key, value in (("qualities", '["strength"]'), ("exclude", '["cable-face-pull"]')):
            says = f"{key} narrows the lifts that patterns lists, so it needs patterns on the same entry"
            self.setUp()   # a best_value lift_gain entry that names no patterns
            self.append("badges.toml", self.lift_badge(f"{key} = {value}\n"))
            self.assertFails("[badge.zz_value]", says, "(GAME-10)")
            self.setUp()
            self.append("achievements.toml", self.lift_achievement(f"{key} = {value}\n"))
            self.assertFails("[achievement.zz_value]", says)
            self.setUp()   # an entry that reads no lift at all
            self.append("badges.toml", swap(GOOD_BADGE.replace("zz_good", "zz_plain"), 'origin = "new"\n',
                                            f'origin = "new"\n{key} = {value}\n'))
            self.assertFails("[badge.zz_plain]", says)
            self.setUp()
            self.append("achievements.toml", achievement(f'test = "first"\n{key} = {value}', name="zz_plainach"))
            self.assertFails("[achievement.zz_plainach]", says)
        # patterns is there but the entry is not a best value: the patterns refusal stands, so the filters never sit where the server ignores them
        self.setUp()
        self.append("badges.toml", swap(swap(BEST_VALUE_BADGE, 'kind = "best_value"', 'kind = "total"'), 'counts = "lift_gain"\n',
                                        'counts = "lift_gain"\npatterns = ["squat"]\nqualities = ["strength"]\nexclude = ["cable-face-pull"]\n'))
        self.assertFails("[badge.zz_value]", "patterns is only for an entry that reads the fact lift_gain as its best value")

    def test_game_10_the_ten_qualities_are_read_from_coach_html(self):
        """Never hand-copied: the checker is run in a scratch repo whose coach.html says what QM_IDS is."""
        repo = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, repo, True)
        (repo / "scripts").mkdir()
        (repo / "supabase").mkdir()
        shutil.copy(CHECKER, repo / "scripts" / "check_career.py")
        shutil.copy(HERE.parent / "supabase" / "xp_rules_snapshot.json", repo / "supabase" / "xp_rules_snapshot.json")
        shutil.copytree(CAREER, repo / "career")
        badges = repo / "career" / "badges.toml"
        badges.write_text(badges.read_text(encoding="utf-8") + self.lift_badge('patterns = ["squat"]\nqualities = ["movement"]\n'),
                          encoding="utf-8", newline="\n")
        real = (HERE.parent / "coach.html").read_text(encoding="utf-8")

        def run(coach_text):
            (repo / "coach.html").write_text(coach_text, encoding="utf-8", newline="\n")
            p = subprocess.run([sys.executable, "-X", "utf8", str(repo / "scripts" / "check_career.py"), str(repo / "career")],
                               capture_output=True, text=True, encoding="utf-8", timeout=120)
            return p.returncode, p.stdout + p.stderr

        rc, out = run(real)
        self.assertEqual(rc, 0, out)
        rc, out = run(re.sub(r"const QM_IDS\s*=\s*\[.*?\]", "const QM_IDS = ['strength','muscle']", real, count=1, flags=re.S))
        self.assertEqual(rc, 1, out)
        self.assertIn("qualities 'movement' is not one of the Spine's qualities in coach.html's QM_IDS", out)
        self.assertNotIn("qualities 'strength'", out)
        rc, out = run(real.replace("const QM_IDS", "const QM_IDX", 1))
        self.assertEqual(rc, 1, out)
        self.assertIn("qualities cannot be checked: QM_IDS was not found in coach.html (GAME-10)", out)

    def test_a_best_value_badge_is_checked_like_any_other_kind(self):
        # it still needs the fact it counts, an xp on every tier and tiers that rise
        self.append("badges.toml", swap(swap(BEST_VALUE_BADGE, 'counts = "lift_gain"\n', ""), "xp = 10, ", ""))
        self.assertFails("[badge.zz_value]", 'kind "best_value" needs counts', "tier 1", "xp is missing")
        self.setUp()
        self.append("badges.toml", swap(BEST_VALUE_BADGE, "at = 1,", "at = 9,"))
        self.assertFails("[badge.zz_value]", "tier 2", "strictly rising")

    def test_retire_at_with_a_valid_superseded_by_passes(self):
        self.append("badges.toml", RETIRING_BADGE)
        self.append("badges.toml", REPLACEMENT_BADGE)
        self.assertPasses("OK: 0 errors")
        # a list of ids is fine too
        self.setUp()
        self.append("badges.toml", swap(RETIRING_BADGE, 'superseded_by = "zz_new"', 'superseded_by = ["zz_new", "zz_old_two"]'))
        self.append("badges.toml", REPLACEMENT_BADGE)
        self.append("badges.toml", GOOD_BADGE.replace("zz_good", "zz_old_two"))
        self.assertPasses("OK: 0 errors")

    def test_superseded_by_must_name_an_entry_that_exists(self):
        self.append("badges.toml", RETIRING_BADGE)          # names zz_new, which is not there
        self.assertFails("[badge.zz_old]", "superseded_by 'zz_new' is not a badge in badges.toml")
        self.setUp()
        self.append("badges.toml", swap(RETIRING_BADGE, 'superseded_by = "zz_new"', 'superseded_by = ["zz_new", "zz_nobody"]'))
        self.append("badges.toml", REPLACEMENT_BADGE)       # one good id and one missing: the missing one is named
        out = self.assertFails("superseded_by 'zz_nobody' is not a badge in badges.toml")
        self.assertNotIn("superseded_by 'zz_new'", out)
        self.setUp()
        self.append("badges.toml", swap(RETIRING_BADGE, 'superseded_by = "zz_new"', 'superseded_by = "zz_old"'))
        self.assertFails("[badge.zz_old]", "superseded_by names the entry itself")
        self.setUp()
        self.append("badges.toml", swap(RETIRING_BADGE, 'superseded_by = "zz_new"', "superseded_by = []"))
        self.assertFails("[badge.zz_old]", "superseded_by must be the id of the entry that takes its place")

    def test_retire_at_and_starts_at_must_be_catalogue(self):
        self.append("badges.toml", swap(RETIRING_BADGE, 'retire_at = "catalogue"', 'retire_at = "soon"'))
        self.append("badges.toml", swap(REPLACEMENT_BADGE, 'starts_at = "catalogue"', 'starts_at = "switch"'))
        self.assertFails("[badge.zz_old]", 'retire_at must be "catalogue"', "'soon'",
                         "[badge.zz_new]", 'starts_at must be "catalogue"', "'switch'")

    # ── rule 16: the two switches, and the level kept (Amir, 2026-10-17) ───────────────────────────────────────────
    def test_a_switch_is_off_or_a_day(self):
        for bad in ('"on"', '"yes"', '"2026-13-01"', '"18 Oct 2026"', "true"):
            with self.subTest(value=bad):
                self.setUp()
                self.set_key("rulebook.toml", "switch", "xp", bad)
                self.assertFails("[switch]", 'xp must be "off" or a day written YYYY-MM-DD')
        self.setUp()
        self.set_key("rulebook.toml", "switch", "xp", '"2026-10-18"')
        self.assertPasses("OK: 0 errors")

    def test_the_catalogue_switch_needs_the_xp_switch_first(self):
        self.set_key("rulebook.toml", "switch", "xp", '"off"')      # the live rulebook has the XP switch on since 2026-10-18
        self.set_key("rulebook.toml", "switch", "catalogue", '"2026-11-01"')
        self.assertFails("[switch]", "the catalogue switch (phase 3) needs the XP switch (phase 2) on first")
        self.setUp()
        self.set_key("rulebook.toml", "switch", "xp", '"2026-11-02"')
        self.set_key("rulebook.toml", "switch", "catalogue", '"2026-11-01"')
        self.assertFails("[switch]", "cannot come before the XP switch")
        self.setUp()
        self.catalogue_on()                       # both on the same day is fine
        self.assertPasses("OK: 0 errors")

    def test_the_switch_table_must_be_there(self):
        path = self.dir / "rulebook.toml"
        text = path.read_text(encoding="utf-8")
        self.assertIn("\n[switch]\n", text)
        path.write_text(text.replace("\n[switch]\n", "\n[switches]\n", 1), encoding="utf-8", newline="\n")
        self.assertFails("[switch]", "the [switch] table is missing")

    def test_a_shadow_table_is_no_longer_known(self):
        self.append("rulebook.toml", "\n[shadow]\non = true\n")
        out = self.assertPasses("OK: 0 errors")
        self.assertIn("unknown top-level key 'shadow'", out)

    def test_a_fact_paid_from_its_value_is_carried_and_career_only(self):
        path = self.dir / "rulebook.toml"
        text = path.read_text(encoding="utf-8")
        self.assertIn("career_only = true\n", text)
        path.write_text(text.replace("career_only = true\n", "", 1), encoding="utf-8", newline="\n")
        self.assertFails("[fact.level_kept]", "needs career_only = true")
        self.setUp()
        self.set_key("rulebook.toml", "fact.level_kept", "meaning", '"consistency"')
        self.assertFails("[fact.level_kept]", 'has meaning "carried"')
        self.setUp()
        self.append("rulebook.toml", swap(swap(GOOD_FACT, 'meaning = "none"', 'meaning = "carried"'),
                                          'pays_for = "nothing"', 'pays_for = "act"'))
        self.assertFails("[fact.zz_social]", 'meaning "carried" is for a fact paid from its own value')
        self.setUp()
        self.set_key("rulebook.toml", "fact.level_kept", "career_only", '"yes"')
        self.assertFails("[fact.level_kept]", "career_only")

    def test_the_switch_keys_are_known_on_every_kind_of_entry_that_takes_them(self):
        # an achievement can be superseded by a badge (THE MACHINIST by CENTURY) or by another achievement
        old = swap(GOOD_ACHIEVEMENT.replace("zz_good", "zz_old"), "free = true\n",
                   'free = true\nretire_at = "catalogue"\nstarts_at = "catalogue"\nsuperseded_by = "zz_new"\n')
        self.append("achievements.toml", old)
        self.append("badges.toml", REPLACEMENT_BADGE)
        out = self.assertPasses("OK: 0 errors")
        self.assertNotIn("unknown key", out)
        self.setUp()
        self.append("achievements.toml", swap(old, '"zz_new"', '"zz_good"'))
        self.append("achievements.toml", GOOD_ACHIEVEMENT)
        self.assertPasses("OK: 0 errors")
        self.setUp()
        self.append("achievements.toml", swap(old, '"zz_new"', '"zz_nobody"'))
        self.assertFails("[achievement.zz_old]",
                         "superseded_by 'zz_nobody' is not an achievement in achievements.toml or a badge in badges.toml")
        # a title and a mission retire in favour of their own kind
        self.setUp()
        self.append("titles.toml", GOOD_TITLE)
        self.append("titles.toml", swap(GOOD_TITLE.replace("zz_good", "zz_old"), 'origin = "new"\n',
                                        'origin = "new"\nretire_at = "catalogue"\nsuperseded_by = "zz_good"\n'))
        self.append("missions.toml", GOOD_MISSION)
        self.append("missions.toml", swap(GOOD_MISSION.replace("zz_good", "zz_old"), "free = true\n",
                                          'free = true\nretire_at = "catalogue"\nsuperseded_by = "zz_good"\n'))
        out = self.assertPasses("OK: 0 errors")
        self.assertNotIn("unknown key", out)
        self.setUp()
        self.append("titles.toml", swap(GOOD_TITLE, 'origin = "new"\n', 'origin = "new"\nsuperseded_by = "zz_nobody"\n'))
        self.append("missions.toml", swap(GOOD_MISSION, "free = true\n", 'free = true\nsuperseded_by = "zz_nobody"\n'))
        self.assertFails("[title.zz_good]", "superseded_by 'zz_nobody' is not a title in titles.toml",
                         "[mission.zz_good]", "superseded_by 'zz_nobody' is not a mission in missions.toml")

    def test_a_title_with_meaning_all_passes(self):
        self.append("titles.toml", swap(GOOD_TITLE, 'meaning = "progress"', 'meaning = "all"'))
        out = self.assertPasses("OK: 0 errors")
        self.assertNotIn("nothing awards", out)          # the engine mints the Grand Slam: no badge, achievement or quest names it

    def test_a_badge_habit_must_be_a_habit_in_the_rulebook(self):
        self.append("badges.toml", swap(GOOD_BADGE, "free = true\n", 'free = true\nhabit = "juggling"\n'))
        self.assertFails("[badge.zz_good]", "habit 'juggling' is not in rulebook.toml [habits.weights]")
        self.setUp()
        self.append("badges.toml", swap(GOOD_BADGE, "free = true\n", 'free = true\nhabit = "custom"\n'))
        out = self.assertPasses("OK: 0 errors")          # custom is a habit with a weight (one badge for HOUSE RULES)
        self.assertNotIn("unknown key", out)

    def test_a_proof_entry_may_carry_retire_at_without_tripping_the_parity_check(self):
        # the shadow is on: Proof's own entries still equal Proof's numbers, and a retiring one may say when it stops
        # (Proof's badges left with the cut, stage78: an achievement and a mission carry the case now)
        self.put_key("achievements.toml", "achievement.first_blood", "retire_at", '"catalogue"')
        self.put_key("achievements.toml", "achievement.first_blood", "superseded_by", '"century"')
        self.put_key("missions.toml", "mission.three_hard_days", "retire_at", '"catalogue"')
        self.put_key("missions.toml", "mission.three_hard_days", "superseded_by", '"hold_your_week"')
        out = self.assertPasses("OK: 0 errors")
        self.assertNotIn("unknown key", out)

    # test_a_retiring_proof_entry_must_still_match_proofs_numbers and test_in_shadow_a_proof_milestone_must_match held Proof's milestone DP to
    # the Dawn Patrol badge while the shadow was on. Both the shadow (the catalogue switch is on since 2026-10-18) and the badge (the cut, stage78)
    # are gone, so they went with them.

    def test_a_retiring_entry_does_not_count_for_coverage(self):
        def small_files(retiring):
            # One badge and one mission in place of the real ones (and one achievement, so nothing names a badge that
            # is gone). Proof's entries are swapped out too, so the shadow is turned off: there is no parity to check.
            self.setUp()
            self.catalogue_on()
            (self.dir / "tiers.lock.json").unlink()      # the real lock names badges these small files do not have
            gate ='free = true\nretire_at = "catalogue"\n' if retiring else "free = true\n"
            for filename, block in (("badges.toml", GOOD_BADGE), ("missions.toml", GOOD_MISSION)):
                (self.dir / filename).write_text(swap(block, "free = true\n", gate), encoding="utf-8", newline="\n")
            (self.dir / "achievements.toml").write_text(GOOD_ACHIEVEMENT, encoding="utf-8", newline="\n")
            return self.assertPasses("OK: 0 errors")

        out = small_files(retiring=True)
        self.assertIn("no badge has the meaning 'consistency'", out)    # the one badge retires: nothing live covers it
        self.assertIn("no mission has the meaning 'commitment'", out)
        self.assertIn("no mission in the 'stretch' slot", out)
        out = small_files(retiring=False)                               # the same two entries, not retiring, do cover them
        self.assertNotIn("no badge has the meaning 'consistency'", out)
        self.assertNotIn("no mission has the meaning 'commitment'", out)
        self.assertNotIn("no mission in the 'stretch' slot", out)

    def test_odd_switch_keys_are_reported_and_never_crash_the_checker(self):
        # Each body replaces one whole file: valid TOML, the wrong shape for retire_at / starts_at / superseded_by.
        odd = {
            "badges.toml": '[badge.a]\nretire_at = 5\nstarts_at = ["x"]\nsuperseded_by = {a = 1}\nhabit = 3\n',
            "achievements.toml": '[achievement.a]\nretire_at = true\nsuperseded_by = [5, ["a"]]\n',
            "titles.toml": '[title.a]\nretire_at = {}\nsuperseded_by = ""\n',
            "missions.toml": '[mission.a]\nretire_at = 1.5\nsuperseded_by = []\n',
        }
        for filename, body in odd.items():
            with self.subTest(file=filename):
                self.setUp()
                (self.dir / filename).write_text(body, encoding="utf-8", newline="\n")
                rc, out = self.run_checker()
                self.assertNotIn("Traceback", out)
                self.assertNotIn("does not parse", out)          # it is valid TOML, just the wrong shape
                self.assertEqual(rc, 1, out)

    # ── phase 3: helpers ──────────────────────────────────────────────────────────────────────────────────────────
    def drop_key(self, filename, table, key):
        """Remove `key` from [table] (the key is on one line)."""
        path = self.dir / filename
        lines = path.read_text(encoding="utf-8").split("\n")
        where = None
        for i, line in enumerate(lines):
            header = re.match(r"^\[([^\]]+)\]\s*(#.*)?$", line)
            if header:
                where = header.group(1)
            elif where == table and re.match(rf"^{re.escape(key)}\s*=", line):
                del lines[i]
                path.write_text("\n".join(lines), encoding="utf-8", newline="\n")
                return
        self.fail(f"{filename} has no `{key}` in [{table}]: update this test")

    def lock(self, change=None):
        """Read the copy's tiers lock, let `change` edit it, write it back; return it."""
        path = self.dir / LOCK
        lock = json.loads(path.read_text(encoding="utf-8"))
        if change:
            change(lock)
            path.write_text(json.dumps(lock), encoding="utf-8", newline="\n")
        return lock

    # ── rule 17: a best_run badge says what a run is ──────────────────────────────────────────────────────────────
    def test_rule_17_the_real_best_run_badges_carry_a_run(self):
        text = (self.dir / "badges.toml").read_text(encoding="utf-8")
        # since the cut (stage78) the one best-run badge left is Hold Serve (held_weeks), and comebacks keeps its history twin
        self.assertIn('run = "plan_weeks"', text)
        self.assertEqual(text.count('run = "days"'), 0)
        self.assertIn('history_twin_counts = "comeback_stuck"', text)
        self.assertPasses("OK: 0 errors")

    def test_rule_17_each_run_passes_with_its_counts(self):
        self.append("badges.toml", best_run("plan_weeks"))
        self.append("badges.toml", best_run("iso_weeks", counts="mission_sweep").replace("zz_run", "zz_iso"))
        self.append("badges.toml", best_run("days", counts="habit_done", extra='habit = "water"').replace("zz_run", "zz_days"))
        self.assertPasses("OK: 0 errors")

    def test_rule_17_a_best_run_badge_without_a_run_fails(self):
        self.append("badges.toml", best_run(None))
        self.assertFails("[badge.zz_run]", "needs run = one of plan_weeks, days, iso_weeks", "rule 17")

    def test_rule_17_an_unknown_run_fails(self):
        self.append("badges.toml", best_run("weekly"))
        self.assertFails("[badge.zz_run]", "found 'weekly'", "rule 17")

    def test_rule_17_a_real_best_run_badge_losing_its_run_fails(self):
        self.drop_key("badges.toml", "badge.held_weeks", "run")
        self.assertFails("[badge.held_weeks]", "needs run", "rule 17")

    def test_rule_17_days_needs_habit_done_and_a_habit(self):
        self.append("badges.toml", best_run("days", counts="habit_done"))                    # no habit
        self.assertFails("[badge.zz_run]", 'run "days" needs habit', "rule 17")
        self.setUp()
        self.append("badges.toml", best_run("days", counts="week_held", extra='habit = "water"'))
        self.assertFails("[badge.zz_run]", 'run "days" needs counts = "habit_done"')

    def test_rule_17_plan_weeks_needs_week_held(self):
        self.append("badges.toml", best_run("plan_weeks", counts="mission_sweep"))
        self.assertFails("[badge.zz_run]", 'run "plan_weeks" needs counts = "week_held"')

    def test_rule_17_run_on_a_total_badge_fails(self):
        self.append("badges.toml", swap(GOOD_BADGE, 'origin = "new"\n', 'origin = "new"\nrun = "days"\n'))
        self.assertFails("[badge.zz_good]", 'run is for kind "best_run" only', "rule 17")

    # ── rule 18: an achievement's test and exactly its keys ───────────────────────────────────────────────────────
    def test_rule_18_all_eleven_tests_pass(self):
        self.assertEqual(len(VALID_TESTS), 11)
        for block in VALID_TESTS.values():
            self.append("achievements.toml", block)
        self.assertPasses("OK: 0 errors")

    def test_rule_18_every_real_achievement_has_a_test(self):
        text = (self.dir / "achievements.toml").read_text(encoding="utf-8")
        self.assertEqual(len(re.findall(r"(?m)^test = ", text)), 22)
        self.assertEqual(text.count('test = "goals"'), 5)

    def test_rule_18_a_missing_or_unknown_test_fails(self):
        self.append("achievements.toml", swap(GOOD_ACHIEVEMENT, 'test = "first"\n', ""))
        self.assertFails("[achievement.zz_good]", "test is missing", "rule 18")
        self.setUp()
        self.append("achievements.toml", swap(GOOD_ACHIEVEMENT, 'test = "first"', 'test = "sometimes"'))
        self.assertFails("[achievement.zz_good]", "test 'sometimes' is not one of", "rule 18")

    def test_rule_18_a_missing_param_fails_for_every_test_that_has_one(self):
        needs = {"proof": "proof_need", "goals": "goals", "runs_together": "run", "best_value": "at",
                 "patterns_in_cycle": "groups", "cycle_proving": "bests", "run_regained": "away_weeks"}
        for test, key in needs.items():
            with self.subTest(test=test):
                self.setUp()
                block = "\n".join(line for line in VALID_TESTS[test].split("\n") if not line.startswith(f"{key} = "))
                self.assertNotEqual(block, VALID_TESTS[test])
                self.append("achievements.toml", block)
                self.assertFails(f'test "{test}" needs {key}')

    def test_rule_18_a_param_of_another_test_fails(self):
        self.append("achievements.toml", achievement('test = "first"\nbests = 3', name="zz_stray"))
        self.assertFails("[achievement.zz_stray]", 'bests belongs to another test, not to test "first"', "rule 18")

    def test_rule_18_first_reads_a_known_fact_and_proof_reads_proof(self):
        self.append("achievements.toml", achievement('test = "first"', reads="no_such_fact", name="zz_ghost"))
        self.assertFails("[achievement.zz_ghost]", "no_such_fact")
        self.setUp()
        self.append("achievements.toml", achievement('test = "proof"\nproof_measure = "daysHit:strength"\nproof_need = 5',
                                                     name="zz_notproof", extra='proof_code = "ZZ"'))
        self.assertFails("[achievement.zz_notproof]", 'test "proof" needs reads = "proof"')
        self.setUp()
        self.append("achievements.toml", achievement('test = "best_value"\nat = 100', name="zz_notlift"))
        self.assertFails("[achievement.zz_notlift]", 'test "best_value" reads the fact lift_gain')

    def test_rule_18_goals_are_checked(self):
        bad = {"an empty list": "goals = []", "an unknown kind": 'goals = [{ kind = "steps", need = 5 }]',
               "a habit that is not there": 'goals = [{ kind = "daysHit:yoga", need = 5 }]',
               "a need of 0": 'goals = [{ kind = "qualify", need = 0 }]',
               "no need": 'goals = [{ kind = "qualify" }]', "custom": 'goals = [{ kind = "daysHit:custom", need = 2 }]'}
        for label, goals in bad.items():
            with self.subTest(goals=label):
                self.setUp()
                self.append("achievements.toml", achievement(f'test = "goals"\n{goals}', name="zz_goals"))
                self.assertFails("[achievement.zz_goals]", "rule 18" if label == "an empty list" else "goal 1:")

    def test_rule_18_the_events_goals_match_the_phone(self):
        # habits.html EVENTS (l.3290) is the other copy; check_twins.js §10 compares the two, this pins the shape.
        text = (self.dir / "achievements.toml").read_text(encoding="utf-8")
        self.assertIn('{ kind = "comebacksStuck", need = 2 }', text)
        self.assertIn('{ kind = "total:steps", need = 250000 }', text)

    def test_rule_18_the_other_tests_params_are_checked(self):
        cases = [("runs_together", 'habits = ["steps", "sleep"]', 'habits = ["steps", "yoga"]', "yoga"),
                 ("runs_together", 'habits = ["steps", "sleep"]', "habits = []", "habits must be a non-empty list"),
                 ("runs_together", "run = 7", "run = 0", "run = 0 must be above 0"),
                 ("best_value", "at = 100", "at = 0", "at = 0 must be above 0"),
                 ("patterns_in_cycle", '{ squat = ["squat"], ', "{ squat = [], ", "groups must be a table"),
                 ("cycle_proving", "bests = 3", "bests = 0", "bests = 0 must be 1 or more"),
                 ("cycle_proving", "retests = 1", "retests = -1", "retests = -1 must be 0 or more"),
                 ("run_regained", "away_weeks = 4", "away_weeks = 0", "away_weeks = 0 must be 1 or more")]
        for test, old, new, needle in cases:
            with self.subTest(test=test, new=new):
                self.setUp()
                self.append("achievements.toml", swap(VALID_TESTS[test], old, new))
                self.assertFails(needle)

    # ── rule 19: a title's size, and [moments] ────────────────────────────────────────────────────────────────────
    def test_rule_19_the_real_files_carry_the_moments_and_no_title(self):
        # the Grand Slam and every title left with the cut (stage78); rule 19 still holds for a title a test adds
        self.assertNotIn("[title.", (self.dir / "titles.toml").read_text(encoding="utf-8"))
        self.assertIn("[moments]", (self.dir / "recognition.toml").read_text(encoding="utf-8"))

    def test_rule_19_a_size_on_the_grand_slam_passes(self):
        self.append("titles.toml", swap(swap(GOOD_TITLE, 'meaning = "progress"', 'meaning = "all"'), 'origin = "new"\n',
                                        'origin = "new"\nsize = "milestone"\n'))
        self.assertPasses("OK: 0 errors")

    def test_rule_19_a_size_on_any_other_title_fails(self):
        self.append("titles.toml", swap(GOOD_TITLE, 'origin = "new"\n', 'origin = "new"\nsize = "legend"\n'))
        self.assertFails("[title.zz_good]", "size is for the Grand Slam", "rule 19")

    def test_rule_19_a_size_that_is_not_one_of_the_five_fails(self):
        self.append("titles.toml", swap(swap(GOOD_TITLE, 'meaning = "progress"', 'meaning = "all"'), 'origin = "new"\n',
                                        'origin = "new"\nsize = "huge"\n'))
        self.assertFails("[title.zz_good]", "size 'huge' is not one of", "rule 19")

    def test_rule_19_the_moments_keys_are_checked(self):
        for key, literal, needle in (("per_open", "0", "per_open = 0 must be 1 or more"),
                                     ("keep_days", "1.5", "keep_days must be a whole number"),
                                     ("max", "0", "max = 0 must be 1 or more"),
                                     ("full_screen", '["milestone", "epic"]', "full_screen must be a non-empty list"),
                                     ("full_screen", "[]", "full_screen must be a non-empty list")):
            with self.subTest(key=key, literal=literal):
                self.setUp()
                self.set_key("recognition.toml", "moments", key, literal)
                self.assertFails("[moments]", needle)

    def test_rule_19_a_missing_moments_table_fails(self):
        path = self.dir / "recognition.toml"
        text = path.read_text(encoding="utf-8")
        start = text.index("[moments]")
        end = text.index("[feedback]", start)
        path.write_text(text[:start] + text[end:], encoding="utf-8", newline="\n")
        self.assertFails("[moments]", "the [moments] table is missing")

    # ── rule 20: the gates agree (warnings) ───────────────────────────────────────────────────────────────────────
    def test_rule_20_the_real_files_have_no_gate_warnings(self):
        self.assertNotIn("rule 20", self.assertPasses("OK: 0 errors"))

    def test_rule_20_a_starts_at_entry_nobody_supersedes_is_a_warning(self):
        self.append("badges.toml", REPLACEMENT_BADGE)
        out = self.assertPasses("OK: 0 errors")
        self.assertIn("[badge.zz_new]", out)
        self.assertIn("no retired entry names it in superseded_by", out)
        self.setUp()
        self.append("badges.toml", RETIRING_BADGE)
        self.append("badges.toml", REPLACEMENT_BADGE)
        self.assertNotIn("no retired entry names it", self.assertPasses("OK: 0 errors"))

    def test_rule_20_a_superseding_pair_shares_a_meaning(self):
        self.append("badges.toml", RETIRING_BADGE)
        self.append("badges.toml", swap(REPLACEMENT_BADGE, 'meaning = "consistency"', 'meaning = "resilience"'))
        out = self.assertPasses("OK: 0 errors")
        self.assertIn("zz_old (consistency) is superseded by zz_new (resilience)", out)

    def test_rule_20_history_twin_counts_goes_on_a_starts_at_entry_that_counts_the_kind(self):
        twin = swap(REPLACEMENT_BADGE, 'counts = "session_finished"', 'counts = ["session_finished", "full_log"]')
        self.append("badges.toml", RETIRING_BADGE)
        self.append("badges.toml", swap(twin, 'starts_at = "catalogue"\n',
                                        'starts_at = "catalogue"\nhistory_twin_counts = "session_finished"\n'))
        self.assertNotIn("history_twin_counts", self.assertPasses("OK: 0 errors"))
        self.setUp()
        self.append("badges.toml", RETIRING_BADGE)
        self.append("badges.toml", swap(twin, 'starts_at = "catalogue"\n',
                                        'starts_at = "catalogue"\nhistory_twin_counts = "week_held"\n'))
        self.assertIn("history_twin_counts 'week_held' must be a fact its counts include", self.assertPasses("OK: 0 errors"))
        self.setUp()
        self.append("badges.toml", swap(GOOD_BADGE, 'origin = "new"\n', 'origin = "new"\nhistory_twin_counts = "session_finished"\n'))
        self.assertIn("history_twin_counts is for a starts_at entry only", self.assertPasses("OK: 0 errors"))

    # ── rule 21: tiers are append-only ────────────────────────────────────────────────────────────────────────────
    def test_rule_21_the_real_lock_matches_the_real_files(self):
        lock = self.lock()
        self.assertEqual(len(lock), 5)   # the four marks and the cut's "_removed" list (stage78)
        self.assertEqual(len(lock["_removed"]), 34)
        self.assertIn("the_upgrade", lock["_removed"])
        self.assertEqual(lock["held_weeks"], ["bronze", "silver", "emerald", "amethyst", "prismatic"])
        self.assertEqual(lock["comebacks"], ["bronze", "silver", "emerald"])
        self.assertNotIn("rule 21", self.assertPasses("OK: 0 errors"))

    def test_rule_21_an_id_the_cut_removed_never_comes_back(self):
        self.append("badges.toml", '\n[badge.the_upgrade]\nname = "Back Again"\nmeaning = "progress"\nkind = "count"\ncounts = "personal_best"\n'
                    'caption = "{n} bests."\nfree = false\norigin = "new"\ntiers = [{ at = 5, metal = "bronze", xp = 100, size = "win" }]\n')
        self.assertFails("[badge.the_upgrade]", "never comes back", "rule 21")

    def test_rule_21_appending_a_tier_passes_and_so_does_a_changed_at_or_xp(self):
        self.lock(lambda lock: lock.update(held_weeks=lock["held_weeks"][:3]))      # the files now hold two MORE than the lock
        self.assertPasses("OK: 0 errors")
        self.setUp()
        path = self.dir / "badges.toml"
        text = path.read_text(encoding="utf-8")
        start = text.index("[badge.held_weeks]")
        path.write_text(text[:start] + re.sub(r"xp = \d+", "xp = 9999", text[start:], count=1) + "", encoding="utf-8", newline="\n")
        self.assertPasses("OK: 0 errors")

    def test_rule_21_a_changed_metal_or_an_inserted_tier_fails(self):
        self.lock(lambda lock: lock["held_weeks"].__setitem__(1, "emerald"))        # the lock says tier 2 was emerald
        out = self.assertFails("[badge.held_weeks]", "tier 2 is 'silver' but the lock holds 'emerald'")
        self.assertIn("insert a tier at the end, never in the middle", out)

    def test_rule_21_a_removed_tier_fails(self):
        self.lock(lambda lock: lock["comebacks"].append("amethyst"))                # the lock holds four, the file three
        self.assertFails("[badge.comebacks]", "has 3 tier(s), the lock holds 4", "a tier is never removed")

    def test_rule_21_a_removed_badge_fails(self):
        self.lock(lambda lock: lock.update(zz_gone=["bronze"]))
        self.assertFails("[badge.zz_gone]", "an id is never removed")

    def test_rule_21_a_new_badge_is_a_warning_until_the_lock_is_written(self):
        self.append("badges.toml", GOOD_BADGE)
        out = self.assertPasses("OK: 0 errors")
        self.assertIn("[badge.zz_good]", out)
        self.assertIn("is not in the tiers lock yet", out)

    def test_rule_21_no_lock_no_rule(self):
        (self.dir / LOCK).unlink()
        self.assertNotIn("rule 21", self.assertPasses("OK: 0 errors"))

    def test_rule_21_a_broken_lock_fails(self):
        (self.dir / LOCK).write_text("[1, 2", encoding="utf-8")
        self.assertFails("tiers.lock.json", "cannot be read")
        (self.dir / LOCK).write_text('{"held_weeks": "bronze"}', encoding="utf-8")
        self.assertFails("tiers.lock.json", "must be an object of lists of metals")

    # ── rule 22: coach.html's Courtside lines (COURT_LINES, stage75) are recognition.toml's ───────────────────────────
    def test_rule_22_a_line_changed_in_the_file_only_fails(self):
        path = self.dir / "recognition.toml"
        text = path.read_text(encoding="utf-8")
        self.assertIn('en = "{n} sessions with me. Don\'t stop now."', text)
        path.write_text(text.replace('en = "{n} sessions with me. Don\'t stop now."', 'en = "{n} sessions. Keep going."', 1), encoding="utf-8", newline="\n")
        self.assertFails("[message.century]", "coach.html's COURT_LINES says", "change both (rule 22)")

    def test_rule_22_a_line_the_page_uses_must_exist(self):
        path = self.dir / "recognition.toml"
        text = path.read_text(encoding="utf-8")
        cut = re.sub(r'\[message\.honour_full_month\]\nused_for = "[^"]*"\nen = "[^"]*"\nfa = ""\n', "", text.replace("\r\n", "\n"), count=1)
        self.assertNotEqual(cut, text.replace("\r\n", "\n"))
        path.write_text(cut, encoding="utf-8", newline="\n")
        self.assertFails("[message.honour_full_month]", "recognition.toml has no [message.honour_full_month] (rule 22)")

    # ── rule 23: program.html's four marks (careerMarks(), round 5) are badges.toml's tiers ──────────────────────────
    def test_rule_23_a_tier_changed_in_the_file_only_fails(self):
        path = self.dir / "badges.toml"
        text = path.read_text(encoding="utf-8")
        old = '{ at = 8, metal = "silver", xp = 400, size = "highlight" },'
        self.assertIn(old, text)
        path.write_text(text.replace(old, '{ at = 9, metal = "silver", xp = 400, size = "highlight" },', 1), encoding="utf-8", newline="\n")
        self.assertFails("[badge.held_weeks]", "program.html's careerMarks() says the marks are", "change both (rule 23)")

    def test_rule_23_the_files_as_they_are_agree(self):
        self.assertNotIn("rule 23", self.assertPasses("OK: 0 errors"))

    # ── the seed: --write-lock and --catalogue-steps ──────────────────────────────────────────────────────────────
    def run_seed(self, *args):
        p = subprocess.run([sys.executable, "-X", "utf8", str(SEED), str(self.dir), *args], capture_output=True,
                           text=True, encoding="utf-8", timeout=120)
        return p.returncode, p.stdout, p.stderr

    def test_write_lock_makes_the_lock_again_from_the_files(self):
        before = (self.dir / LOCK).read_text(encoding="utf-8")
        rc, _, err = self.run_seed("--write-lock")
        self.assertEqual(rc, 0, err)
        self.assertEqual((self.dir / LOCK).read_text(encoding="utf-8"), before)   # the cut's "_removed" list is kept
        self.assertEqual(json.loads(before)["held_weeks"][0], "bronze")
        (self.dir / LOCK).unlink()
        rc, _, err = self.run_seed("--write-lock")
        self.assertEqual(rc, 0, err)
        again = json.loads((self.dir / LOCK).read_text(encoding="utf-8"))
        self.assertEqual(sorted(again), ["bests", "century", "comebacks", "held_weeks"])   # from the files alone: the four marks

    def test_write_lock_lets_a_tier_be_appended_and_refuses_one_that_was_removed(self):
        text = (self.dir / "badges.toml").read_text(encoding="utf-8")
        start = text.index("[badge.comebacks]")
        grown = text[:start] + text[start:].replace('{ at = 10, metal = "emerald", xp = 1200, size = "milestone" },',
                                                    '{ at = 10, metal = "emerald", xp = 1200, size = "milestone" },\n'
                                                    '  { at = 20, metal = "amethyst", xp = 2400, size = "milestone" },', 1)
        self.assertNotEqual(grown, text)
        (self.dir / "badges.toml").write_text(grown, encoding="utf-8", newline="\n")
        rc, _, err = self.run_seed("--write-lock")
        self.assertEqual(rc, 0, err)
        self.assertEqual(self.lock()["comebacks"], ["bronze", "silver", "emerald", "amethyst"])
        shrunk = grown.replace('  { at = 20, metal = "amethyst", xp = 2400, size = "milestone" },\n', "", 1)
        (self.dir / "badges.toml").write_text(shrunk, encoding="utf-8", newline="\n")
        rc, _, err = self.run_seed("--write-lock")
        self.assertNotEqual(rc, 0)
        self.assertIn("never removed", err)
        self.assertEqual(self.lock()["comebacks"], ["bronze", "silver", "emerald", "amethyst"])     # not rewritten

    def test_catalogue_steps_are_batches_of_five_from_0_to_95(self):
        rc, out, err = self.run_seed("--catalogue-steps", "--day", "2027-01-10")
        self.assertEqual(rc, 0, err)
        for name in ("career_catalogue_before", "career_rewards_batch"):
            self.assertEqual(len(re.findall(rf"select public\.{name}\(\d+", out)), 20)
        self.assertIn("select public.career_catalogue_before(0, 5);", out)
        self.assertIn("select public.career_rewards_batch(95, 5, 'baseline');", out)
        self.assertEqual(len(re.findall(r"select public\.career_catalogue_preview\(", out)), 20)
        self.assertIn("select public.career_compare();", out)
        self.assertIn('"catalogue":"2027-01-10"', out)          # the dry run's rules carry the switch day, nothing else changed
        rc, _, err = self.run_seed("--catalogue-steps", "--day", "next monday")
        self.assertNotEqual(rc, 0)

    def test_the_seed_carries_the_moments_setting_and_the_goals(self):
        rc, out, err = self.run_seed("--json")
        self.assertEqual(rc, 0, err)
        rows = json.loads(out)["catalogue"]
        self.assertIn(("setting", "moments"), {(r["kind"], r["id"]) for r in rows})
        foundry = next(r for r in rows if (r["kind"], r["id"]) == ("achievement", "the_foundry"))
        self.assertEqual(foundry["body"]["goals"][0], {"kind": "daysHit:strength", "need": 16})
        self.assertEqual(foundry["body"]["test"], "goals")


if __name__ == "__main__":
    unittest.main()
