#!/usr/bin/env python3
"""Keep the skill and agent headers parseable: python scripts/check_skill_headers.py [file ...]

Why this exists (2026-10-17): seven SKILL.md files (six in the repo, one user-level) carried an unquoted ": " inside
their `description:` value. That is not valid YAML ("mapping values are not allowed here"), so the Claude desktop app
fell back to the file's first heading and the skill list lost its description, which is what Claude reads to decide
which skill to pick. Nothing errored anywhere, which is why six files had it. The agent file athlete-brief.md had the
same fault.

For each .claude/skills/*/SKILL.md and .claude/agents/*.md (or the files named on the command line) this checks:

  1. the file opens with a `---` line and a second `---` line closes the header
  2. the header has a `name:` line and a `description:` line, and neither is empty
  3. a QUOTED description is well formed: one line, closes with its own quote, nothing after it, and (double quotes)
     only the escapes YAML knows, so a stray backslash or an inner " cannot end it early
  4. an UNQUOTED description (the plain style) holds no ": " and does not end with ":" (both start a mapping), holds no
     " #" (a comment: the rest of the description would silently vanish) and does not start with a character YAML
     reserves ([ ] { } , & * ! | > % @ ` #, or "- " / "? " / ": "). A block scalar (| or >) is accepted as it is.

The rule for fixing a failure is always the same: wrap the whole description value in double quotes (escape any " or
backslash inside it) and change nothing else.

Standard library only (no PyYAML on the hook's python). Runs from .githooks/pre-commit when any of those files is staged.

  python scripts/check_skill_headers.py            # every skill and agent in the repo; exit 1 on any problem
  python scripts/check_skill_headers.py a.md b.md  # just these files
"""
import glob
import os
import re
import sys

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding='utf-8')
    except Exception:
        pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# What may follow a backslash inside a YAML double-quoted scalar.
DQ_ESCAPES = set('0abtnvfre "/\\N_LP\tx') | {'u', 'U'}
# A plain scalar may not start with these (reserved indicators); | and > open a block scalar and are handled apart.
PLAIN_BAD_START = set('[]{},&*!%@`#')


def header_of(text):
    """Return (lines of the header, problem). The header is what sits between the first two '---' lines."""
    lines = text.lstrip('﻿').splitlines()
    if not lines or lines[0].strip() != '---':
        return None, 'does not open with a --- line'
    for i in range(1, len(lines)):
        if lines[i].strip() == '---':
            return lines[1:i], None
    return None, 'the header is never closed by a second --- line'


def value_of(header, key):
    """Return (the value text, continuation lines) of a top-level `key:` line, or (None, None) when absent."""
    pat = re.compile(r'^' + re.escape(key) + r'[ \t]*:(.*)$')
    for i, line in enumerate(header):
        m = pat.match(line)
        if m:
            cont = []
            for nxt in header[i + 1:]:
                if nxt.startswith((' ', '\t')) or not nxt.strip():
                    cont.append(nxt)
                else:
                    break
            return m.group(1).strip(), cont
    return None, None


def quoted_problem(value):
    """Check a value that starts with a quote. Return a problem string or None."""
    q = value[0]
    i = 1
    while i < len(value):
        c = value[i]
        if q == '"' and c == '\\':
            if i + 1 >= len(value):
                return 'ends with a lone backslash'
            if value[i + 1] not in DQ_ESCAPES:
                return 'has the escape \\%s, which YAML does not know (write \\\\ for a backslash)' % value[i + 1]
            i += 2
            continue
        if c == q:
            if q == "'" and i + 1 < len(value) and value[i + 1] == "'":
                i += 2          # '' is an apostrophe inside single quotes
                continue
            rest = value[i + 1:].strip()
            if rest:
                return 'has text after the closing %s: %s' % (q, rest[:40])
            return None
        i += 1
    return 'the opening %s is never closed on the same line' % q


def plain_problem(value):
    """Check an unquoted value. Return a problem string or None."""
    if not value:
        return 'is empty'
    if re.fullmatch(r'[|>][+-]?\d*', value):
        return None             # a block scalar: its text is the indented lines below
    c = value[0]
    if c in PLAIN_BAD_START:
        return 'starts with %r, which YAML reserves; wrap the value in double quotes' % c
    if c == '|' or c == '>':
        return 'starts with %r, which opens a block scalar; wrap the value in double quotes' % c
    if re.match(r'[-?:](\s|$)', value):
        return 'starts with %r followed by a space, which YAML reads as an indicator; wrap the value in double quotes' % c
    if re.search(r':(\s|$)', value):
        return 'holds ": " (or ends with ":"), which YAML reads as a new mapping ("mapping values are not allowed here"); wrap the value in double quotes'
    if re.search(r'\s#', value):
        return 'holds " #", which YAML reads as a comment (the rest of the description is lost); wrap the value in double quotes'
    return None


def check_text(text):
    """Return a list of problems for one file's text."""
    header, bad = header_of(text)
    if bad:
        return [bad]
    problems = []
    for key in ('name', 'description'):
        value, cont = value_of(header, key)
        if value is None:
            problems.append('no `%s:` line in the header' % key)
            continue
        if value == '' and not any(l.strip() for l in cont):
            problems.append('`%s:` is empty' % key)
            continue
        if value == '':
            # key: on its own, text on the lines below: a plain multi-line scalar; each line is checked as plain text
            for l in cont:
                p = plain_problem(l.strip()) if l.strip() else None
                if p:
                    problems.append('`%s:` %s' % (key, p))
                    break
            continue
        if value[0] in '"\'':
            p = quoted_problem(value)
            if p:
                problems.append('`%s:` %s' % (key, p))
            continue
        p = plain_problem(value)
        if not p and not re.fullmatch(r'[|>][+-]?\d*', value):
            for l in cont:      # a plain value may continue on indented lines; they carry the same hazards
                p = plain_problem(l.strip()) if l.strip() else None
                if p:
                    break
        if p:
            problems.append('`%s:` %s' % (key, p))
    return problems


def default_files():
    out = glob.glob(os.path.join(ROOT, '.claude', 'skills', '*', 'SKILL.md'))
    out += glob.glob(os.path.join(ROOT, '.claude', 'agents', '*.md'))
    return sorted(out)


def main(argv):
    files = argv or default_files()
    bad = 0
    for f in files:
        try:
            with open(f, 'rb') as fh:
                text = fh.read().decode('utf-8')
        except (OSError, UnicodeDecodeError) as e:
            print('FAIL %s: cannot be read (%s)' % (f, e))
            bad += 1
            continue
        problems = check_text(text)
        for p in problems:
            print('FAIL %s: %s' % (os.path.relpath(f, ROOT) if os.path.isabs(f) else f, p))
        if problems:
            bad += 1
    if bad:
        print('\n%d of %d header(s) will not parse as YAML. Quote the description value in double quotes and change nothing else.' % (bad, len(files)))
        return 1
    print('ok: %d skill/agent header(s) parse' % len(files))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
