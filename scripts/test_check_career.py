"""Tests for scripts/check_career.py: python -X utf8 -m unittest scripts.test_check_career  (or run this file).

The checker guards Career Mode's catalogue (career/*.toml). Every test works on a fresh copy of the real career folder
in a temp dir and runs the checker as a subprocess, the way a person (or a hook) would:

  * the untouched copy must pass (exit 0), and so must a copy with one small VALID entry added to each file, so a
    broken case below differs from a good one by exactly the thing it names;
  * each broken case adds ONE fault and must exit 1 with a message that says what is wrong and where.

New entries use ids that start with zz_, so a test never depends on a real entry staying as it is.
"""
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

# The switch (Four Majors, 2026-10-17): a best_value badge, a badge that retires, and the one that takes its place.
BEST_VALUE_BADGE = swap(swap(GOOD_BADGE.replace("zz_good", "zz_value"), 'kind = "total"', 'kind = "best_value"'),
                        'counts = "session_finished"', 'counts = "lift_gain"')
RETIRING_BADGE = swap(GOOD_BADGE.replace("zz_good", "zz_old"), 'origin = "new"\n',
                      'origin = "new"\nretire_at = "switch"\nsuperseded_by = "zz_new"\n')
REPLACEMENT_BADGE = swap(GOOD_BADGE.replace("zz_good", "zz_new"), 'origin = "new"\n', 'origin = "new"\nstarts_at = "switch"\n')


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
        self.set_key("recognition.toml", "tool.amirs_pick", "title", '"nobody_has_this"')
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
        self.set_key("rulebook.toml", "shadow", "on", "false")   # Proof's quests are gone too: parity is not this test
        out = self.assertPasses("OK: 0 errors")
        for gap in ("no mission in the 'plan' slot", "no mission in the 'recovery' slot", "no mission in the 'crew' slot",
                    "no recovery mission for the habit 'steps'", "no recovery mission for the habit 'supps'",
                    "no mission has the meaning 'consistency'"):
            self.assertIn(gap, out)
        self.assertNotIn("no mission in the 'stretch' slot", out)
        self.assertNotIn("no mission has the meaning 'progress'", out)   # no mission asks for progress, on purpose
        self.assertNotIn("no recovery mission for the habit 'strength'", out)
        self.assertNotIn("no recovery mission for the habit 'custom'", out)

    # ── rules 13 and 14: Proof's counting, and the shadow's parity with Proof (phase 1) ──────────────────────────
    def test_in_shadow_a_habit_number_must_equal_proofs(self):
        self.set_key("rulebook.toml", "habits.weights", "water", "31")
        self.assertFails("[habits.weights] water is 31 but Proof's is 30")

    def test_in_shadow_the_day_gate_must_equal_proofs(self):
        self.set_key("rulebook.toml", "habits", "qualify_pct", "75")
        self.assertFails("[habits] qualify_pct is 75 but Proof's streakQualifyPct is 80")

    def test_in_shadow_a_proof_milestone_must_match(self):
        path = self.dir / "badges.toml"
        text = path.read_text(encoding="utf-8")
        tier = '{ at = 10, metal = "silver", xp = 75, size = "highlight" }'
        self.assertIn(tier, text)
        path.write_text(text.replace(tier, tier.replace("xp = 75", "xp = 80"), 1), encoding="utf-8", newline="\n")
        self.assertFails("Proof pays the milestone DP (need 10, 75 XP, daysWith3)", "DP (need 10.0, 80.0 XP")

    def test_in_shadow_a_proof_quest_must_match(self):
        self.set_key("missions.toml", "mission.no_negotiation", "proof_need", "6")
        self.assertFails("Proof's quest w_supps7 (daysHit:supps, need 7, 140 XP) has no mission")

    def test_out_of_shadow_the_habit_numbers_may_move(self):
        self.set_key("rulebook.toml", "shadow", "on", "false")
        self.set_key("rulebook.toml", "habits.weights", "strength", "0")   # the switch: the session fact pays instead
        self.assertPasses("OK: 0 errors")

    def test_a_proof_measure_or_kind_must_be_known(self):
        self.set_key("badges.toml", "badge.zen_machine", "proof_measure", '"streak:nothing"')
        self.set_key("missions.toml", "mission.dead_calm", "proof_kind", '"dayshit:breathe"')
        self.assertFails("proof_measure 'streak:nothing' is not one of", "proof_kind 'dayshit:breathe' is not one of")

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

    def test_retire_at_and_starts_at_must_be_switch(self):
        self.append("badges.toml", swap(RETIRING_BADGE, 'retire_at = "switch"', 'retire_at = "soon"'))
        self.append("badges.toml", swap(REPLACEMENT_BADGE, 'starts_at = "switch"', 'starts_at = "later"'))
        self.assertFails("[badge.zz_old]", 'retire_at must be "switch"', "'soon'",
                         "[badge.zz_new]", 'starts_at must be "switch"', "'later'")

    def test_the_switch_keys_are_known_on_every_kind_of_entry_that_takes_them(self):
        # an achievement can be superseded by a badge (THE MACHINIST by CENTURY) or by another achievement
        old = swap(GOOD_ACHIEVEMENT.replace("zz_good", "zz_old"), "free = true\n",
                   'free = true\nretire_at = "switch"\nstarts_at = "switch"\nsuperseded_by = "zz_new"\n')
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
                                        'origin = "new"\nretire_at = "switch"\nsuperseded_by = "zz_good"\n'))
        self.append("missions.toml", GOOD_MISSION)
        self.append("missions.toml", swap(GOOD_MISSION.replace("zz_good", "zz_old"), "free = true\n",
                                          'free = true\nretire_at = "switch"\nsuperseded_by = "zz_good"\n'))
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
        self.put_key("badges.toml", "badge.dawn_patrol", "retire_at", '"switch"')
        self.put_key("badges.toml", "badge.dawn_patrol", "superseded_by", '"century"')
        self.put_key("achievements.toml", "achievement.first_blood", "retire_at", '"switch"')
        self.put_key("achievements.toml", "achievement.first_blood", "superseded_by", '"century"')
        self.put_key("missions.toml", "mission.three_hard_days", "retire_at", '"switch"')
        self.put_key("missions.toml", "mission.three_hard_days", "superseded_by", '"hold_your_week"')
        out = self.assertPasses("OK: 0 errors")
        self.assertNotIn("unknown key", out)

    def test_a_retiring_proof_entry_must_still_match_proofs_numbers(self):
        # retire_at is not a way round the parity check: until the switch the entry is earned exactly as Proof earns it
        self.put_key("badges.toml", "badge.dawn_patrol", "retire_at", '"switch"')
        self.put_key("badges.toml", "badge.dawn_patrol", "superseded_by", '"century"')
        path = self.dir / "badges.toml"
        text = path.read_text(encoding="utf-8")
        tier = '{ at = 10, metal = "silver", xp = 75, size = "highlight" }'
        self.assertIn(tier, text)
        path.write_text(text.replace(tier, tier.replace("xp = 75", "xp = 80"), 1), encoding="utf-8", newline="\n")
        self.assertFails("Proof pays the milestone DP (need 10, 75 XP, daysWith3)", "DP (need 10.0, 80.0 XP")

    def test_a_retiring_entry_does_not_count_for_coverage(self):
        def small_files(retiring):
            # One badge and one mission in place of the real ones (and one achievement, so nothing names a badge that
            # is gone). Proof's entries are swapped out too, so the shadow is turned off: there is no parity to check.
            self.setUp()
            self.set_key("rulebook.toml", "shadow", "on", "false")
            gate = 'free = true\nretire_at = "switch"\n' if retiring else "free = true\n"
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


if __name__ == "__main__":
    unittest.main()
