"""Tests for scripts/check_skill_headers.py: python scripts/test_check_skill_headers.py

The guard keeps every .claude/skills/*/SKILL.md and .claude/agents/*.md header parseable as YAML. Unquoted ": " in a
description broke seven of them on 2026-10-17 and nothing errored: the desktop app just showed the first heading.

When PyYAML happens to be importable (it is not required, and the hook's python does not have it) the cases marked
`yaml` are also checked against it, so the guard's idea of "parses" is the real parser's.
"""
import importlib.util
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPT = os.environ.get('HEADER_SCRIPT') or os.path.join(HERE, 'check_skill_headers.py')   # HEADER_SCRIPT: prove the tests fail on an older copy
spec = importlib.util.spec_from_file_location('check_skill_headers', SCRIPT)
guard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guard)

try:
    import yaml
except ImportError:
    yaml = None

fails = []


def check(name, ok, detail=''):
    print(('ok   ' if ok else 'FAIL ') + name + ('' if ok else '   ' + str(detail)[:300]))
    if not ok:
        fails.append(name)


def doc(*header, body='# Heading\n'):
    return '---\n' + '\n'.join(header) + '\n---\n\n' + body


def yaml_parses(text):
    """True when PyYAML reads the header into a dict whose name and description are non-empty strings."""
    parts = text.replace('\r\n', '\n').lstrip('﻿').split('---\n', 2)
    try:
        d = yaml.safe_load(parts[1])
    except Exception:
        return False
    return isinstance(d, dict) and all(isinstance(d.get(k), str) and d.get(k) for k in ('name', 'description'))


# (label, text, should pass, also cross-check with PyYAML)
CASES = [
    # --- headers that must pass
    ('plain description', doc('name: x', 'description: Turn a thing into another thing. Use when asked.'), True, True),
    ('plain description with a colon not followed by a space (a time, a URL)', doc('name: x', 'description: Opens at 10:30 and reads https://example.com/a:b'), True, True),
    ('plain description with # inside a word (C#, issue #5 without a space before it)', doc('name: x', 'description: Reviews C# and F# code'), True, True),
    ('plain description starting with a dash that is not an indicator', doc('name: x', 'description: -5 kg is the floor'), True, True),
    ('double-quoted, inner quotes escaped', doc('name: x', 'description: "Use when Amir says \\"write a blog\\": it does the whole chain."'), True, True),
    ('double-quoted with a colon and a space inside', doc('name: x', 'description: "Two engines: the HTML one and the kit."'), True, True),
    ('double-quoted with an escaped backslash', doc('name: x', 'description: "a \\\\ b"'), True, True),
    ('single-quoted, apostrophe doubled', doc('name: x', "description: 'It''s two engines: one and two.'"), True, True),
    ('block scalar >', doc('name: x', 'description: >', '  Two engines: one and two.', '  Second line.'), True, True),
    ('extra keys are left alone (a tools list, a flow sequence)', doc('name: x', 'description: Fine.', 'tools: Read, Grep', 'argument-hint: [name]'), True, True),
    ('CRLF line endings', doc('name: x', 'description: "Two engines: one."').replace('\n', '\r\n'), True, True),
    ('a BOM before the opening ---', '﻿' + doc('name: x', 'description: Fine.'), True, False),
    ('a --- line in the body is not the header', doc('name: x', 'description: Fine.', body='# H\n\n---\n\nmore: stuff\n'), True, True),
    # --- headers that must fail
    ('plain description with ": " inside (the 2026-10-17 fault)', doc('name: x', 'description: Two engines: the HTML one and the kit.'), False, True),
    ('the same fault with quotes in the text, as in the real files', doc('name: x', 'description: Use when Amir says "write a blog": it does the whole chain.'), False, True),
    ('plain description ending with a colon', doc('name: x', 'description: What it does:'), False, True),
    ('plain description with " #" (a comment would eat the rest)', doc('name: x', 'description: Reviews code # and then more text'), False, False),
    ('plain description starting with [', doc('name: x', 'description: [draft] the next batch'), False, True),
    ('plain description starting with *', doc('name: x', 'description: *Bold* start'), False, True),
    ('plain description starting with &', doc('name: x', 'description: & more'), False, False),
    ('plain description starting with !', doc('name: x', 'description: !Important thing'), False, True),
    ('plain description starting with %', doc('name: x', 'description: %done'), False, True),
    ('plain description starting with @', doc('name: x', 'description: @amir does it'), False, True),
    ('plain description starting with a backtick', doc('name: x', 'description: `code` first'), False, True),
    ('plain description starting with "- "', doc('name: x', 'description: - a list item'), False, True),
    ('plain description starting with "? "', doc('name: x', 'description: ? a question'), False, False),
    ('plain description, ": " on a continuation line', doc('name: x', 'description: First line', '  second line: here'), False, True),
    ('double-quoted, never closed', doc('name: x', 'description: "Two engines: one.'), False, True),
    ('double-quoted, text after the closing quote', doc('name: x', 'description: "One." and more'), False, True),
    ('double-quoted with an unescaped inner quote', doc('name: x', 'description: "Says "write" now."'), False, True),
    ('double-quoted with an escape YAML does not know (\\d)', doc('name: x', 'description: "digits \\d+ here"'), False, True),
    ('single-quoted with a lone apostrophe inside', doc('name: x', "description: 'It's two engines.'"), False, True),
    ('empty description', doc('name: x', 'description:'), False, True),
    ('no description line', doc('name: x', 'model: sonnet'), False, True),
    ('no name line', doc('description: Fine.'), False, True),
    ('does not open with ---', 'name: x\ndescription: Fine.\n---\n', False, False),
    ('the header is never closed', '---\nname: x\ndescription: Fine.\n\n# Heading\n', False, False),
    ('an empty file', '', False, False),
]

for label, text, should_pass, x in CASES:
    got = guard.check_text(text)
    check(('passes: ' if should_pass else 'fails: ') + label, (not got) == should_pass, got)
    if yaml and x:
        check('PyYAML agrees: ' + label, yaml_parses(text) == should_pass, 'PyYAML says %s' % yaml_parses(text))

if not yaml:
    print('note: PyYAML is not installed, so the cross-check against it was skipped (not needed for the guard)')

# The command line: exit codes, the message names the file, and the real repo passes.
with tempfile.TemporaryDirectory() as d:
    good = os.path.join(d, 'good.md')
    bad = os.path.join(d, 'bad.md')
    with open(good, 'w', encoding='utf-8', newline='') as f:
        f.write(doc('name: x', 'description: "Fine: really."'))
    with open(bad, 'w', encoding='utf-8', newline='') as f:
        f.write(doc('name: x', 'description: Not fine: really.'))

    def run(*paths):
        p = subprocess.run([sys.executable, SCRIPT, *paths], capture_output=True, text=True, encoding='utf-8')
        return p.returncode, p.stdout + p.stderr

    rc, out = run(good)
    check('cli: a good file exits 0', rc == 0, out)
    rc, out = run(bad)
    check('cli: a bad file exits 1 and names the file and the cause', rc == 1 and 'bad.md' in out and '": "' in out, out)
    rc, out = run(good, bad)
    check('cli: one bad file among good ones exits 1 and counts it', rc == 1 and '1 of 2' in out, out)
    rc, out = run(os.path.join(d, 'missing.md'))
    check('cli: a file that cannot be read exits 1', rc == 1 and 'cannot be read' in out, out)

proc = subprocess.run([sys.executable, SCRIPT], capture_output=True, text=True, encoding='utf-8')
check('every skill and agent header in this repo parses', proc.returncode == 0, proc.stdout + proc.stderr)

print('\n%s' % ('all passed' if not fails else '%d FAILED: %s' % (len(fails), ', '.join(fails))))
sys.exit(1 if fails else 0)
