"""Tests for scripts/restore/restore_backup.py: python scripts/test_restore_backup.py

The generator that turns a dashboard backup into the SQL files of a restore. These tests need no database: they build small made-up backups against the real
supabase/schema_snapshot.sql and read the files that come out. The slow, complete proof (a real PostgreSQL, the real erase function, every table compared)
is scripts/restore/rehearse.mjs; this is what pre-commit can run.

Every test below fails on a broken generator: the fixed outer dollar tag, a receipt that is not honoured, a link that is not cleared, a remap that is skipped.
"""
import hashlib
import importlib.util
import json
import os
import re
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SCRIPT = os.environ.get('RESTORE_SCRIPT') or os.path.join(ROOT, 'scripts', 'restore', 'restore_backup.py')     # RESTORE_SCRIPT: prove the tests fail on another copy
SCHEMA = os.path.join(ROOT, 'supabase', 'schema_snapshot.sql')
spec = importlib.util.spec_from_file_location('restore_backup', SCRIPT)
rb = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rb)
fails = []


def check(name, ok, detail=''):
    print(('ok   ' if ok else 'FAIL ') + name + ('' if ok else '   ' + str(detail)[:400]))
    if not ok:
        fails.append(name)


def h(kind, key):
    return hashlib.sha256((kind + ':' + key).encode('utf-8')).hexdigest()


def sql_statements(text):
    """The top-level statements of a SQL file as PostgreSQL's own lexer would cut them: ';' counts only outside quotes, comments and dollar quotes.
    Comment lines in front of a statement are dropped."""
    def clean(s):
        lines = s.strip().split('\n')
        while lines and (not lines[0].strip() or lines[0].strip().startswith('--')):
            lines.pop(0)
        return '\n'.join(lines).strip()
    out, i, start, n = [], 0, 0, len(text)
    while i < n:
        c = text[i]
        if text.startswith('--', i):
            j = text.find('\n', i); i = n if j < 0 else j + 1; continue
        if c == "'":
            i += 1
            while i < n:
                if text[i] == "'":
                    if text.startswith("''", i): i += 2; continue
                    break
                i += 1
            else:
                raise ValueError('unterminated string')
            i += 1; continue
        if c == '$':
            j = text.find('$', i + 1)
            if j > 0 and all(ch.isalnum() or ch == '_' for ch in text[i + 1:j]):
                tag = text[i:j + 1]
                k = text.find(tag, j + 1)
                if k < 0:
                    raise ValueError('unterminated dollar-quoted string ' + tag)
                i = k + len(tag); continue
        if c == ';':
            s = clean(text[start:i])
            if s:
                out.append(s)
            start = i + 1
        i += 1
    s = clean(text[start:])
    if s:
        out.append(s)
    return out


def backup(tables, **extra):
    return {'exported_at': '2026-10-11T20:00:00.000Z', 'complete': True, 'tables': tables, **extra}


def run(tables, name='aa-backup-2026-10-11.json', receipts=(), keep=(), **kw):
    """Build into a temp folder; returns (report text, folder files {name: text}). SystemExit becomes ('REFUSED: ...', {})."""
    with tempfile.TemporaryDirectory() as d:
        src = os.path.join(d, name)
        json.dump(tables if 'tables' in tables else backup(tables), open(src, 'w', encoding='utf-8'), ensure_ascii=False)
        rpaths = []
        for i, r in enumerate(receipts):
            p = os.path.join(d, f'aa-backup-newer-{i}.json')
            json.dump(r, open(p, 'w', encoding='utf-8'), ensure_ascii=False)
            rpaths.append(p)
        out = os.path.join(d, 'out')
        try:
            report = rb.build(src, SCHEMA, out, rpaths, keep, **kw)
        except SystemExit as e:
            return 'REFUSED: ' + str(e), {}
        files = {f: open(os.path.join(out, f), encoding='utf-8').read() for f in os.listdir(out)}
        return report, files


def rows_in(files, table):
    """The JSON rows inside the phase-1 files of a table."""
    rows = []
    for f, text in sorted(files.items()):
        if f.startswith('10-') and f'-{table}' in f:
            for stmt in sql_statements(text):
                a = stmt.index(':= ') + 3
                lit = stmt[a:stmt.index('::jsonb', a)]
                tag = lit[:lit.index('$', 1) + 1]
                rows += json.loads(lit[len(tag):-len(tag)])
    return rows


def ph2_rows(files, table):
    text = files['20-after-logins.sql']
    for stmt in sql_statements(text):
        if stmt.startswith('do') and f"table_name = '{table}'" in stmt:
            a = stmt.index(':= ') + 3
            lit = stmt[a:stmt.index('::jsonb', a)]
            tag = lit[:lit.index('$', 1) + 1]
            return json.loads(lit[len(tag):-len(tag)])
    return []


GONE = {'athlete_id': 'gone_test'}
KEEP = {'athlete_id': 'ava_test'}

# ── the small pure pieces ──────────────────────────────────────────────────────────────────────────────────────────────────
check('1a: a receipt is the sha256 of kind:key, in lower case, as coach_erase_person() writes it',
      rb.receipt_hash('athlete', 'ava_test') == '7a025268acc1c5ac8f623b28208e7158e49fb2bf09376915c55628f9330ce1cc'
      and rb.receipt_hash('athlete', 'Gone_Test') == 'febb8f90b984ca01e5bf07d7deb4216bb2404574231cee1616c01f89cb7d7198'
      and rb.receipt_hash('course', 'gone_learner') == '233a8501e2d5acce764696fa6ae0d6a1e44af18218c0ea13bdd1c8fd28502dd4')
for s in ['plain', '$bk$', 'ends with $bk', '$bkx$ and $bk$ and $$', '$', '', 'a$b$c', "quote ' and \\ back", '$bk', 'x$bk$bkx$']:
    q = rb.dollar_quote(s)
    tag = q[:q.index('$', 1) + 1]
    ok_ = q.startswith(tag) and q.endswith(tag) and q.find(tag, len(tag)) == len(q) - len(tag) and q[len(tag):-len(tag)] == s
    if not ok_:
        check(f'1b: dollar_quote({s!r}) cannot be ended early', False, q)
        break
else:
    check('1b: dollar_quote never lets the text end the string early, even where the text meets the closing tag', True)
check('1c: digits9 folds Persian and Arabic-Indic digits and keeps the last nine',
      rb.digits9('۰۹۱۲ ۰۰۰ ۰۰۰۱') == '120000001' and rb.digits9('+98 912 000 0001') == '120000001' and rb.digits9('٠٩١٢٠٠٠٠٠٠١') == '120000001' and rb.digits9('12345') is None and rb.digits9(None) is None)
schema_sql = open(SCHEMA, encoding='utf-8').read()
cols = rb.snapshot_tables(schema_sql)
check('1d: the snapshot parser finds the 61 tables and their columns (46 + career_awards, career_recognition, stage70 + five of stage75 + five of stage81 + three of stage84)', len(cols) == 61 and 'athlete_id' in cols['programs'] and 'steps' in cols['exercises'], len(cols))
html = open(os.path.join(ROOT, 'coach.html'), encoding='utf-8').read()
listed = re.findall(r"'([a-z_]+)'", re.search(r"const BACKUP_TABLES = \[([\s\S]*?)\];", html).group(1))
check('1h: coach.html BACKUP_TABLES lists every table of the schema snapshot except the two key-hash tables and the four short-lived Bell tables (stage81), and nothing else (a new table goes in both)',
      sorted(listed) == sorted(set(cols) - rb.SECRET_TABLES - rb.SHORT_LIVED), (sorted(set(cols) - rb.SECRET_TABLES - rb.SHORT_LIVED - set(listed)), sorted(set(listed) - set(cols))))
fks = rb.foreign_keys(schema_sql)
order = rb.table_order(cols, fks)
check('1e: parents come before children (exercises before exercise_coach, players before their notes)',
      order.index('exercises') < order.index('exercise_coach') and order.index('assess_players') < order.index('assess_notes') and order.index('assess_players') < order.index('assess_results'))
check('1f: the foreign keys that point at a sign-in or a login are exactly the ones the script knows how to remap',
      {t for t, refs in fks.items() for _, ref in refs if ref == 'auth.users' or ref in rb.ACCOUNT_TABLES} <= set(rb.ACCOUNT_TABLES) | set(rb.REMAP))
pieces = list(rb.chunks([{'k': 'x' * 50} for _ in range(10)] + [{'k': 'y' * 500}], 200))
check('1g: chunks keep every row in order, cut at the size, and give a row bigger than the limit a piece of its own',
      sum(len(p) for p in pieces) == 11 and pieces[-1] == [{'k': 'y' * 500}] and all(len(json.dumps(p)) <= 260 for p in pieces[:-1]) and len(pieces) > 2, [len(p) for p in pieces])

# ── a plain backup ─────────────────────────────────────────────────────────────────────────────────────────────────────────
base = {
    'programs': [{'athlete_id': 'ava_test', 'data': {'a': 1}, 'updated_at': '2026-10-01T08:00:00+00:00', 'updated_by': 'coach'}],
    'messages': [{'id': 4, 'athlete_id': 'ava_test', 'sender': 'coach', 'body': 'hi', 'context': None, 'created_at': '2026-10-01T08:00:00+00:00', 'read_by_coach': True, 'read_by_athlete': False}],
}
report, files = run(base)
check('2a: the files a restore needs are written', {'19-sequences.sql', '20-after-logins.sql', '90-check.sql', 'restore-report.txt'} <= set(files) and any(f.endswith('-programs.sql') for f in files), sorted(files))
check('2b: without --receipts the report warns, first, that anyone erased since comes back', report.startswith('WARNING: NO NEWER BACKUP'), report[:120])
_, f_ = run({**base, 'career_rules': [{'version': 1, 'rules': {'version': 1}, 'source': 'made up', 'loaded_at': '2026-10-17T09:00:00+00:00'}]})
tens = sorted(f for f in f_ if f.startswith('10-'))
check('2e: the Career Mode rulebook is restored after every other table, so its triggers stay quiet until every row is back (stage66)',
      len(tens) == 3 and tens[-1].endswith('-career_rules.sql'), tens)
erase_list = re.search(r"c_athlete_tables constant text\[\] := array\[([\s\S]*?)\];", schema_sql)
erased = re.findall(r"'([a-z_]+)'", erase_list.group(1)) if erase_list else []
check('2f: the Career Mode awards and recognition are in BACKUP_TABLES, the snapshot and the coach_erase_person() list (stage70)',
      all(t in listed and t in cols and t in erased for t in ('career_awards', 'career_recognition')), (sorted(set(('career_awards', 'career_recognition')) - set(listed)), erased[-4:]))
COURT = ('courtside_marks', 'career_honours', 'career_goals', 'career_notes')
check("2g: Courtside's tables are in BACKUP_TABLES and the snapshot, the four with a person in coach_erase_person()'s list too (stage75)",
      all(t in listed and t in cols for t in COURT + ('career_honour_months',)) and all(t in erased for t in COURT),
      (sorted(set(COURT + ('career_honour_months',)) - set(listed)), sorted(set(COURT) - set(erased))))
# Holds whether or not the snapshot has stage81 yet (the Bell, Crew): the four tables that live 7 days are never backed up (a 12-week backup would break the
# 7-day promise in privacy.html) but are erased with the person; crew_consent (each athlete's answer and Amir's under-13 ticks) is kept for good and backed up.
short_in = sorted(t for t in rb.SHORT_LIVED if t in cols)
bell_bad = (sorted(t for t in short_in if t in listed), sorted(t for t in short_in if t not in erased),
            [t for t in ('crew_consent',) if t in cols and (t not in listed or t not in erased)])
check("2h: the Bell (stage81): the four short-lived tables in the snapshot are not in BACKUP_TABLES but are in coach_erase_person()'s list; crew_consent, if the snapshot has it, is in both",
      rb.SHORT_LIVED >= {'crew_posts', 'crew_photos', 'crew_kudos', 'crew_rings'} and not any(bell_bad), bell_bad)

# The reminders (stage84). push_subs is KEPT: a restore without it would cost every athlete the single
# notification permission their browser gives, and that cannot be asked for twice. push_sent is only a
# ledger of what went out today, and push_config holds the VAPID private key and the sender's shared
# secret — a backup file on Amir's PC carrying those is worse than losing them, and losing them is
# recoverable (a new pair, and each app re-subscribes silently, because the permission already stands).
push_bad = ([t for t in ('push_subs',) if t in cols and (t not in listed or t not in erased)],
            [t for t in ('push_sent',) if t in cols and (t in listed or t not in erased)],
            [t for t in ('push_config',) if t in cols and t in listed])
check("2i: the reminders (stage84): push_subs is backed up and erased with the person; push_sent and push_config are never in a backup",
      'push_sent' in rb.SHORT_LIVED and 'push_config' in rb.SECRET_TABLES and not any(push_bad), push_bad)
def one_do(text):
    try:
        s = sql_statements(text)
    except ValueError:
        return False
    if len(s) != 1 or not s[0].startswith('do $'):
        return False
    tag = s[0][3:s[0].index('$', 4) + 1]
    return s[0].endswith(tag) and s[0].count(tag) == 2


check('2c: every phase-1 file is exactly one DO statement, opened and closed by the same tag', all(one_do(t) for f, t in files.items() if f.startswith('10-')))
check('2d: the table with a counter (messages) keeps its id, and 19-sequences.sql sets every counter past the biggest id',
      rows_in(files, 'messages')[0]['id'] == 4 and 'setval' in files['19-sequences.sql'] and 'overriding system value' in files['10-001-messages.sql' if '10-001-messages.sql' in files else sorted(f for f in files if 'messages' in f)[0]])

# text that tries to end a dollar quote early must come out as data
nasty = {'athlete_id': 'ava_test', 'body': "# a $restore$ b $restorex$ c $bk$ d $$ e ';-- f \\ g $ol$ h\n; select 1;", 'updated_at': '2026-10-01T08:00:00+00:00'}
report, files = run({'coaching_logs': [nasty]})
f_ = next(t for f, t in files.items() if f.endswith('-coaching_logs.sql'))
check('3a: a row full of dollar tags and quotes stays inside its one DO statement and round-trips', one_do(f_) and rows_in(files, 'coaching_logs') == [nasty], f_[:300])
c1 = {'athlete_id': 'ava_test', 'body': 'x' * 300, 'updated_at': '2026-10-01T08:00:00+00:00'}
report, files = run({'coaching_logs': [dict(c1, athlete_id=f'a{i}') for i in range(6)]}, chunk_bytes=700)
parts = sorted(f for f in files if f.startswith('10-') and 'coaching_logs' in f)
check('3b: --chunk-bytes cuts a table into parts named partXofY, and no row is lost', len(parts) > 2 and all('-part' in f and f'of{len(parts)}.sql' in f for f in parts) and len(rows_in(files, 'coaching_logs')) == 6, parts)

# ── the erased stay erased ─────────────────────────────────────────────────────────────────────────────────────────────────
tables = {
    'programs': [dict(KEEP, data={}), dict(GONE, data={})],
    'session_history': [dict(KEEP, day=1, completed_on='2026-09-08'), dict(GONE, day=1, completed_on='2026-09-09')],
    'athlete_identities': [{'user_id': '00000000-0000-4000-8000-0000000000a1', 'athlete_id': 'ava_test'}, {'user_id': '00000000-0000-4000-8000-0000000000a3', 'athlete_id': 'gone_test'}],
    'erasure_log': [{'id': 1, 'kind': 'athlete', 'subject_hash': h('athlete', 'gone_test'), 'counts': {}}],
}
report, files = run(tables)
check('4a: a receipt in the backup\'s own erasure_log leaves the erased athlete out of every table, others stay',
      [r['athlete_id'] for r in rows_in(files, 'programs')] == ['ava_test'] and [r['athlete_id'] for r in rows_in(files, 'session_history')] == ['ava_test'], report)
check('4b: the report names who was left out, and the erased athlete\'s login is not on the list to re-create',
      'LEFT OUT' in report and 'gone_test' in report.split('LEFT OUT')[1].split('\n')[0] and 'logins to re-create (athlete_identities): ava_test' in report and 'gone_test' not in report.split('logins to re-create')[1], report)
check('4c: the check query expects one login, not two', "'athlete_identities'::text as tbl, 1::bigint as expected" in files['90-check.sql'], files['90-check.sql'][-600:])
report, files = run(tables, keep=['GONE_TEST'])
check('4d: --keep restores an id although a receipt matches it (any case)', sorted(r['athlete_id'] for r in rows_in(files, 'programs')) == ['ava_test', 'gone_test'] and 'LEFT OUT' not in report, report)
t2 = {k: v for k, v in tables.items() if k != 'erasure_log'}
report, files = run(t2, receipts=[backup({'erasure_log': [{'id': 9, 'kind': 'athlete', 'subject_hash': h('athlete', 'gone_test'), 'counts': {}}]})])
check('4e: a NEWER backup\'s receipts are honoured, and added to the restored erasure_log (keeping their id)',
      [r['athlete_id'] for r in rows_in(files, 'programs')] == ['ava_test'] and rows_in(files, 'erasure_log')[0]['id'] == 9 and 'NO NEWER BACKUP' not in report, report)
report, files = run(tables, receipts=[backup({'erasure_log': [{'id': 1, 'kind': 'athlete', 'subject_hash': h('athlete', 'other_one'), 'counts': {}}]})])
ids = sorted(r['id'] for r in rows_in(files, 'erasure_log'))
check('4f: a receipt whose id is already taken by a different receipt gets the next free id', ids == [1, 2], ids)
report, files = run({'programs': [dict(KEEP, data={})]}, receipts=[backup({'programs': []})])
check('4g: a "newer" backup with no erasure_log is refused (it cannot give receipts)', report.startswith('REFUSED') and 'no erasure_log' in report, report)

# buyers: a testing login and a course login
U = lambda n: f'00000000-0000-4000-8000-{n:012d}'
buyers = {
    'assess_accounts': [{'user_id': U(1), 'username': 'buyer_one', 'revoked_at': None}, {'user_id': U(3), 'username': 'gone_buyer', 'revoked_at': None}],
    'tps_accounts': [{'user_id': U(4), 'username': 'learner_one', 'revoked_at': None}, {'user_id': U(5), 'username': 'learner_rev', 'revoked_at': '2026-10-01T00:00:00+00:00'}, {'user_id': U(6), 'username': 'gone_learner', 'revoked_at': None}],
    'assess_players': [{'id': U(11), 'account_id': U(1), 'name': 'P1'}, {'id': U(19), 'account_id': U(3), 'name': 'P9'}],
    'assess_notes': [{'id': U(21), 'player_id': U(11), 'account_id': U(1), 'body': 'n1'}, {'id': U(29), 'player_id': U(19), 'account_id': U(3), 'body': 'n9'}],
    'assess_results': [{'player_id': U(11), 'test': 'sprint10', 'day': '1405/06/20', 'account_id': U(1), 'value': 1.85}, {'player_id': U(19), 'test': 'sprint10', 'day': '1405/06/20', 'account_id': U(3), 'value': 2.1}],
    'buyer_notes': [{'user_id': U(1), 'app': 'testing', 'note': 'n'}, {'user_id': U(3), 'app': 'testing', 'note': 'gone'}, {'user_id': U(6), 'app': 'course', 'note': 'gone'}],
    'erasure_log': [{'id': 1, 'kind': 'testing', 'subject_hash': h('testing', 'gone_buyer'), 'counts': {}}, {'id': 2, 'kind': 'course', 'subject_hash': h('course', 'gone_learner'), 'counts': {}}],
}
report, files = run(buyers)
p2 = files['20-after-logins.sql']
check('5a: phase 1 holds no login and nothing that belongs to one', not [f for f in files if f.startswith('10-') and any(t in f for t in ('accounts', 'assess_players', 'assess_notes', 'assess_results', 'buyer_notes', 'athlete_identities'))], sorted(files))
check('5b: phase 2 matches logins by username, with the erased buyers left out', 'gone_buyer' not in p2 and 'gone_learner' not in p2 and 'buyer_one' in p2 and 'learner_rev' in p2, p2[:500])
check('5c: phase 2 carries each player, note, result and buyer note of the kept logins only',
      [r['name'] for r in ph2_rows(files, 'assess_players')] == ['P1'] and [r['body'] for r in ph2_rows(files, 'assess_notes')] == ['n1']
      and [r['value'] for r in ph2_rows(files, 'assess_results')] == [1.85] and [r['note'] for r in ph2_rows(files, 'buyer_notes')] == ['n'])
check('5d: the report lists the logins to re-create, and the revoked one apart', 'logins to re-create (assess_accounts): buyer_one' in report and 'logins to re-create (tps_accounts): learner_one' in report
      and 'revoked logins' in report and 'learner_rev' in report.split('revoked logins')[1] and 'gone_' not in report.split('LEFT OUT')[-1].split('\n', 1)[1], report)
check('5e: an erased buyer\'s login rows are not expected by the check query', "'assess_accounts'::text as tbl, 1::bigint as expected" in files['90-check.sql'] and "'tps_accounts'::text as tbl, 2::bigint as expected" in files['90-check.sql'])
check('5f: phase 2 is one DO statement per table plus the closing notice, and the temp tables are plain statements',
      all(s.startswith(('do', 'create temp', 'truncate', 'insert into _old_logins', 'insert into _login_map')) for s in sql_statements(p2)), [s[:40] for s in sql_statements(p2)])
check('5h: phase 2 swaps the old login id for the new one in the right column of each table',
      p2.count("jsonb_set(x, %L, to_jsonb(m.new_id::text))") == 4 and p2.count("'{account_id}'") == 3 and p2.count("'{user_id}'") == 1, p2[:200])
tricky = dict(buyers, assess_players=[{'id': U(11), 'account_id': U(1), 'name': "$ol$ $restore$ $bk$ ' \\"}])
report, files = run(tricky)
check('5g: a player name full of dollar tags stays data in phase 2', ph2_rows(files, 'assess_players')[0]['name'] == "$ol$ $restore$ $bk$ ' \\", files['20-after-logins.sql'][:300])

# ── applications, partners, notes ──────────────────────────────────────────────────────────────────────────────────────────
contacts = [
    dict(GONE, email='Gone@Example.test', whatsapp='+98 912 000 0001', source='proof'),
    dict(KEEP, email='shared@example.test', whatsapp='+44 7700 900001', source='coach'),
    {'athlete_id': 'cleo_test', 'email': 'cleo@example.test', 'whatsapp': None, 'source': 'proof'},
]
forms = [
    {'id': 'f1', 'name': 'Own email', 'email': ' gone@example.test ', 'contact': None, 'athlete_id': None},
    {'id': 'f2', 'name': 'Phone only', 'email': 'x@example.test', 'contact': '۰۹۱۲۰۰۰۰۰۰۱', 'athlete_id': None},
    {'id': 'f3', 'name': 'Unrelated', 'email': 'unrelated@example.test', 'contact': '07700 111 222', 'athlete_id': None},
    {'id': 'f4', 'name': 'Linked', 'email': 'linked@example.test', 'contact': None, 'athlete_id': 'gone_test', 'linked_at': '2026-08-05T10:00:00+00:00', 'outcome': 'client'},
    {'id': 'f5', 'name': 'Ava', 'email': 'ava@example.test', 'contact': None, 'athlete_id': 'ava_test', 'linked_at': '2026-08-06T10:00:00+00:00', 'outcome': 'client'},
]
aff = [{'code': 'GONE20', 'athlete_id': 'gone_test', 'percent': 20}, {'code': 'AVA10', 'athlete_id': 'ava_test', 'percent': 10}, {'code': 'SOLO5', 'athlete_id': None, 'percent': 5}]
report, files = run({'hab_contacts': contacts, 'hab_intake': forms, 'affiliates': aff, 'programs': [dict(GONE, data={})], 'erasure_log': [{'id': 1, 'kind': 'athlete', 'subject_hash': h('athlete', 'gone_test'), 'counts': {}}]})
kept = {r['id']: r for r in rows_in(files, 'hab_intake')}
check('6a: the application with the erased athlete\'s own email is left out (whitespace and case do not hide it)', 'f1' not in kept and 'application form(s) left out' in report, sorted(kept))
check('6b: a phone-only match (Persian digits) is kept, and named in the report for the coach', 'f2' in kept and 'f2' in report.split('may belong to an erased person')[1], report)
check('6c: an unrelated form and an unrelated link are untouched', kept['f3']['athlete_id'] is None and kept['f5']['athlete_id'] == 'ava_test' and kept['f5']['linked_at'] == '2026-08-06T10:00:00+00:00' and 'f3' not in report.split('may belong')[-1])
check('6d: a form linked to the erased athlete keeps its answers and loses only the link', kept['f4']['athlete_id'] is None and kept['f4']['linked_at'] is None and kept['f4']['outcome'] == 'client')
codes = {r['code']: r for r in rows_in(files, 'affiliates')}
check('6e: a partner record stays, its link to the erased athlete is cleared', len(codes) == 3 and codes['GONE20']['athlete_id'] is None and codes['AVA10']['athlete_id'] == 'ava_test')
check('6f: the contact record of the erased athlete is gone, the others stay', [r['athlete_id'] for r in rows_in(files, 'hab_contacts')] == ['ava_test', 'cleo_test'])
# the same email on another athlete's contact makes it shared: kept, named
contacts2 = [dict(GONE, email='sibling@example.test', whatsapp=None, source='proof'), {'athlete_id': 'sibling_test', 'email': 'sibling@example.test', 'whatsapp': None, 'source': 'proof'}]
report, files = run({'hab_contacts': contacts2, 'hab_intake': [{'id': 'g1', 'name': 'Parent', 'email': 'sibling@example.test', 'contact': None, 'athlete_id': None}],
                     'erasure_log': [{'id': 1, 'kind': 'athlete', 'subject_hash': h('athlete', 'gone_test'), 'counts': {}}]})
check('6g: an email also on another athlete\'s contact record is shared: the form is kept and named, not dropped', [r['id'] for r in rows_in(files, 'hab_intake')] == ['g1'] and 'g1' in report.split('may belong')[-1], report)

# ── the check query ────────────────────────────────────────────────────────────────────────────────────────────────────────
notes = [{'athlete_id': 'ava_test', 'day': '2026-10-09', 'body': 'a'}, {'athlete_id': 'ava_test', 'day': '2026-10-09', 'body': 'b'}, {'athlete_id': 'ava_test', 'day': '2026-10-10', 'body': 'c'}]
report, files = run({'hab_notes': [dict(n, athlete_id='ava_test' if i < 2 else 'x') for i, n in enumerate(notes)], 'programs': [dict(KEEP, data={})]})
chk = files['90-check.sql']
check('7a: the check query counts hab_notes by the table\'s own floor, not by the raw rows', "from (values (date '2026-10-09', 1), (date '2026-10-10', 1)) v(d, n) where d >= public.hab_notes_floor()" in chk or 'hab_notes_floor' in chk, chk[-900:])
check('7b: every restored table is in the check once, with a verdict', chk.count("'programs'::text as tbl") == 1 and 'MISSING ROWS' in chk and "'waiting'" in chk)
check('7c: the check query is one statement', len(sql_statements(chk)) == 1)

# ── what must be refused ───────────────────────────────────────────────────────────────────────────────────────────────────
r_, _ = run(backup(base['programs'] and {'programs': base['programs']}, complete=False, could_not_read=['x']))
check('8a: a backup marked incomplete is refused', r_.startswith('REFUSED') and 'INCOMPLETE' in r_, r_)
r_, _ = run({'programs': base['programs']}, name='aa-backup-INCOMPLETE-2026-10-11.json')
check('8b: a file named INCOMPLETE is refused even if it says complete', r_.startswith('REFUSED') and 'INCOMPLETE' in r_, r_)
r_, f_ = run({'programs': base['programs']}, name='aa-backup-INCOMPLETE-2026-10-11.json', allow_incomplete=True)
check('8c: --allow-incomplete accepts it', not r_.startswith('REFUSED') and f_, r_)
r_, _ = run({'programs': base['programs'], 'mystery_table': [{'a': 1}]})
check('8d: a table the schema does not have is refused, with the way out', r_.startswith('REFUSED') and 'mystery_table' in r_ and 'older than this backup' in r_, r_)
r_, _ = run({'programs': [dict(base['programs'][0], bogus_column=1)]})
check('8e: a column the schema does not have is refused', r_.startswith('REFUSED') and 'programs.bogus_column' in r_, r_)
r_, f_ = run({'programs': [dict(base['programs'][0], bogus_column=1)]}, drop_unknown_columns=True)
check('8f: --drop-unknown-columns restores without it and says so', 'columns left out' in r_ and f_, r_)
with tempfile.TemporaryDirectory() as d:
    p = os.path.join(d, 'aa-backup-x.json'); open(p, 'w').write('{"hello": "world"}')
    try:
        rb.build(p, SCHEMA, os.path.join(d, 'o'))
        refused = ''
    except SystemExit as e:
        refused = str(e)
    check('8g: a file that is not a backup is refused', 'not a dashboard backup' in refused, refused)
    open(p, 'w').write('not json at all')
    try:
        rb.build(p, SCHEMA, os.path.join(d, 'o'))
        refused = ''
    except SystemExit as e:
        refused = str(e)
    check('8h: a file that is not JSON is refused with a plain message', 'cannot read it as a backup' in refused, refused)

# ── the output folder ──────────────────────────────────────────────────────────────────────────────────────────────────────
with tempfile.TemporaryDirectory() as d:
    src = os.path.join(d, 'aa-backup-2026-10-11.json'); json.dump(backup(base), open(src, 'w'))
    out = os.path.join(d, 'out'); os.makedirs(out)
    open(os.path.join(out, '10-099-old.sql'), 'w').write('stale'); open(os.path.join(out, 'my-notes.txt'), 'w').write('mine')
    rb.build(src, SCHEMA, out)
    left = set(os.listdir(out))
    check('9a: a second run removes the files of the run before it, and nothing else', '10-099-old.sql' not in left and 'my-notes.txt' in left, left)
    p = subprocess.run([sys.executable, SCRIPT, src, '--out', out], capture_output=True, text=True, encoding='utf-8')
    check('9b: the command line works and prints the report', p.returncode == 0 and 'WARNING: NO NEWER BACKUP' in p.stdout, p.stderr or p.stdout[:200])
    p = subprocess.run([sys.executable, SCRIPT, src, '--out', out, '--receipts', os.path.join(d, 'missing.json')], capture_output=True, text=True, encoding='utf-8')
    check('9c: a missing receipts file is refused with a plain message, not a traceback', p.returncode != 0 and 'Traceback' not in p.stderr, p.stderr[:300])

print()
if fails:
    print(f'{len(fails)} FAILED: ' + '; '.join(fails))
    sys.exit(1)
print('all restore_backup tests passed')
