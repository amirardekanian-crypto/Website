#!/usr/bin/env python
"""Turn a dashboard backup (aa-backup-<date>.json: coach.html -> Athletes -> Coach tools -> Backup) into SQL files that put the data back into a database
made from supabase/schema_snapshot.sql. Read scripts/restore/README.md first: it is the whole procedure, and this is one step of it.

    python scripts/restore/restore_backup.py <backup.json> --out <folder> [--receipts <newer backup.json> ...] [--keep <id or username> ...]
                                             [--allow-incomplete] [--drop-unknown-columns] [--chunk-bytes 400000]

Writes, into <folder>, files to run in name order:
    10-<nnn>-<table>[-partXofY].sql   one per table (a big table is cut into pieces), parents before children. Each is safe to run twice.
    19-sequences.sql                  puts every id counter after the biggest id that came back, so new rows do not collide with old ones.
    20-after-logins.sql               what has to wait for the logins. A login (a Supabase sign-in account) cannot be restored from a backup, so the
                                      buyers' logins are re-created from the dashboard first (README step 5). The testing app's players, notes and results,
                                      and the private notes about buyers, belong to a login: this file matches each old login to its new one by USERNAME
                                      and puts them back. Safe to run again after creating more logins.
    90-check.sql                      one query: for every table the rows the backup holds against the rows the database has.
    restore-report.txt                what was written, what was left out and why, and which logins to re-create.
It never connects to a database, never touches the schema, and never restores a login or a password (a backup holds none).

Someone who was erased stays erased. A receipt in erasure_log (this backup's, or a NEWER backup given with --receipts) leaves that person out of every
table; a link to them (an affiliate's athlete, an application's athlete) is cleared and the row stays; an application whose email is on their contact record
is left out. The report names every one. A receipt matches an id or a username, so a person who was erased and later signed up again under the same id
is left out too: say --keep <id> if that id is a different person now.
"""
import argparse, hashlib, json, os, re, sys

SECRET_TABLES = {'assess_publish_keys', 'tps_publish_keys',
                 # The reminders' VAPID private key and the sender's shared secret (stage84). A weekly
                 # backup file on Amir's PC holding those is worse than losing them: losing them is
                 # recoverable (a new pair, and each app re-subscribes silently, because the PERMISSION
                 # is already granted and only the key changes), and the permission is the thing that
                 # cannot be asked for twice. Filled in again by hand after a restore.
                 'push_config'}
SHORT_LIVED = {'crew_faces', 'crew_cheers', 'crew_award_likes', 'crew_mentions', 'crew_cheer_tally',   # the Players' Lounge (stage96)
               'crew_posts', 'crew_photos', 'crew_kudos', 'crew_rings',   # the Bell's 7-day tables (stage81): never in a backup, or a 12-week backup breaks the 7-day promise in privacy.html
               # The replies (stage92). They hang off a post and die with it at 7 days, so the same promise applies.
               'crew_replies',
               # What went out today (stage84). It rebuilds itself by simply not sending twice, and a
               # restored copy would only silence the day it was taken.
               'push_sent',
               # The crew's queue and its watermarks (stage86). The queue keeps the Bell's own 7-day promise, so a
               # 12-week backup of it would break that promise exactly as a backup of crew_posts would; the
               # watermarks rebuild themselves by simply not sending twice.
               'crew_push_q', 'crew_push_seen',
               # Which cycle each athlete was last told about (stage87). It rebuilds itself: the first sight of a
               # phone is never a notification, so a restore cannot announce a cycle anybody already has.
               'push_cycle_seen'}
# The logins. Their rows are re-made by the dashboard's Create login (a new Supabase sign-in account each), never restored.
ACCOUNT_TABLES = {'athlete_identities': 'athlete_id', 'tps_accounts': 'username', 'assess_accounts': 'username'}
# Tables whose rows belong to a LOGIN, and the column that says which one: the old login's id is swapped for the new login's id.
REMAP = {'assess_players': 'account_id', 'assess_notes': 'account_id', 'assess_results': 'account_id', 'buyer_notes': 'user_id'}
# Restored after every other table (stage66): until Career Mode's rulebook is back, every Career Mode trigger does nothing, so the facts
# come back exactly as they were backed up instead of being worked out again, half-restored, on the way (a programme before its sessions).
# career_awards and career_recognition (stage70) are restored with the other tables, BEFORE the rulebook: their rows are facts
# already minted, so the rulebook's triggers must stay quiet while they come back (a restore never re-mints an award).
RESTORE_LAST = ['career_rules']
# A table whose athlete_id is a LINK to a person, not the owner of the row: for an erased person the link is cleared and the row stays.
LINK_COLUMNS = {'affiliates': ['athlete_id'], 'hab_intake': ['athlete_id', 'linked_at']}
RECEIPT_KINDS = ('athlete', 'course', 'testing')
DIGITS_FROM = '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹'
DIGITS_TO = '01234567890123456789'


def receipt_hash(kind, key):
    """The same hash coach_erase_person() writes: sha256 of '<kind>:<key in lower case>', as hex."""
    return hashlib.sha256((kind + ':' + str(key).lower()).encode('utf-8')).hexdigest()


def lit(s):
    return "'" + str(s).replace("'", "''") + "'"


def dollar_quote(text, base='bk'):
    """`text` as a dollar-quoted string whose tag cannot end it early: the closing tag must not occur earlier, not even where the text meets it."""
    tag = '$' + base + '$'
    while (tag + text + tag).find(tag, len(tag)) != len(tag) + len(text):
        base += 'x'
        tag = '$' + base + '$'
    return tag + text + tag


def digits9(s):
    """The last nine digits of a phone number, Persian and Arabic-Indic digits folded to 0-9 (the dashboard's own rule), or None."""
    d = re.sub(r'\D', '', str(s or '').translate(str.maketrans(DIGITS_FROM, DIGITS_TO)))
    return d[-9:] if len(d) >= 9 else None


# ── the schema snapshot ───────────────────────────────────────────────────────────────────────────────────────────────────

def snapshot_tables(schema_sql):
    """{table: [column names]} from the snapshot's `create table public.X (` blocks."""
    out = {}
    for m in re.finditer(r'^create table public\.("?\w+"?) \(\n(.*?)\n\);', schema_sql, re.M | re.S):
        cols = []
        for line in m.group(2).split('\n'):
            mm = re.match(r'^  ("[^"]+"|\w+) ', line)
            if mm:
                cols.append(mm.group(1).strip('"'))
        out[m.group(1).strip('"')] = cols
    return out


def foreign_keys(schema_sql):
    """{table: [(columns, referenced table)]} from `alter table public.X add constraint N FOREIGN KEY (...) REFERENCES Y(...)`; Y is 'auth.users' or a public table."""
    fks = {}
    for m in re.finditer(r'alter table public\.("?\w+"?) add constraint [^\n]*? FOREIGN KEY \(([^)]*)\) REFERENCES ([\w."]+)\(', schema_sql):
        t = m.group(1).strip('"')
        ref = m.group(3).replace('public.', '').strip('"')
        fks.setdefault(t, []).append(([c.strip().strip('"') for c in m.group(2).split(',')], ref))
    return fks


def table_order(tables, fks):
    """Parents before children (foreign keys between public tables only); alphabetical otherwise."""
    tables = set(tables)
    pending, done, order = sorted(tables), set(), []
    while pending:
        progressed = False
        for t in list(pending):
            deps = {ref for _, ref in fks.get(t, []) if ref in tables and ref != t}
            if deps <= done:
                order.append(t); done.add(t); pending.remove(t); progressed = True
        if not progressed:
            raise SystemExit('a cycle of foreign keys between ' + ', '.join(pending) + ': this script does not know how to order them')
    return order


# ── the backup ────────────────────────────────────────────────────────────────────────────────────────────────────────────

def load_backup(path, allow_incomplete):
    try:
        b = json.load(open(path, encoding='utf-8'))
    except (OSError, ValueError) as e:
        raise SystemExit(f'{path}: cannot read it as a backup ({e}).')
    if not isinstance(b, dict) or not isinstance(b.get('tables'), dict):
        raise SystemExit(f'{path}: not a dashboard backup (no "tables").')
    if (b.get('complete') is not True or 'INCOMPLETE' in os.path.basename(path)) and not allow_incomplete:
        raise SystemExit(f'{path}: this backup is marked INCOMPLETE (it could not read: {b.get("could_not_read")}). It is not a restore point. '
                         'Use an older complete one, or say --allow-incomplete if you accept a database with holes.')
    return b


def erased_hashes(receipt_rows):
    """{kind: set of subject hashes} from erasure_log rows."""
    out = {k: set() for k in RECEIPT_KINDS}
    for r in receipt_rows:
        if r.get('kind') in out and r.get('subject_hash'):
            out[r['kind']].add(r['subject_hash'])
    return out


def merge_receipts(own_rows, newer_backups):
    """The backup's own receipts plus those of newer backups it has not got, so the restored database remembers every erasure any of them knew.
    A receipt of a newer backup keeps its id unless the id is taken by another receipt, then it gets the next free one. Returns (rows, how many were added)."""
    merged = [dict(r) for r in own_rows]
    seen = {(r.get('kind'), r.get('subject_hash')) for r in merged}
    used = {r['id'] for r in merged if r.get('id') is not None}
    next_id = max(used | {0}) + 1
    added = 0
    for name, nb in newer_backups:
        if 'erasure_log' not in nb['tables']:
            raise SystemExit(f'{name} has no erasure_log (it could not be read when that backup was made, or the backup is older than stage54), so it cannot give receipts.')
        for r in nb['tables']['erasure_log']:
            key = (r.get('kind'), r.get('subject_hash'))
            if key in seen:
                continue
            r = dict(r)
            if r.get('id') is None or r['id'] in used:
                r['id'] = next_id
            used.add(r['id']); next_id = max(next_id, r['id'] + 1); seen.add(key); merged.append(r); added += 1
    return merged, added


def chunks(rows, limit):
    cur, size = [], 2
    for r in rows:
        s = len(json.dumps(r, ensure_ascii=False, separators=(',', ':'))) + 1
        if cur and size + s > limit:
            yield cur; cur, size = [], 2
        cur.append(r); size += s
    if cur:
        yield cur


# ── the SQL ───────────────────────────────────────────────────────────────────────────────────────────────────────────────

def do_block(inner):
    """A DO statement around `inner`, quoted with a tag that nothing inside (a row's text can hold any tag) can end early."""
    return 'do ' + dollar_quote(inner, 'restore') + ';\n'


def insert_block(table, rows, note=''):
    """One DO block: insert these rows (a JSON array) into public.<table>: only the columns the rows carry, only those the table has."""
    keys = sorted({k for r in rows for k in r})
    data = dollar_quote(json.dumps(rows, ensure_ascii=False, separators=(',', ':')))
    karr = 'array[' + ', '.join(lit(k) for k in keys) + ']::text[]'
    return f"-- {table}: {len(rows)} row(s){note}\n" + do_block(f"""
declare cols text; v jsonb := {data}::jsonb;
begin
  select string_agg(quote_ident(c.column_name), ', ' order by c.ordinal_position) into cols
    from information_schema.columns c
   where c.table_schema = 'public' and c.table_name = {lit(table)} and c.is_generated = 'NEVER' and c.column_name = any ({karr});
  if cols is null then raise exception 'public.{table} has none of the columns the backup carries'; end if;
  execute format('insert into public.%I (%s) overriding system value select %s from jsonb_populate_recordset(null::public.%I, $1) on conflict do nothing', {lit(table)}, cols, cols, {lit(table)}) using v;
end
""")


SEQUENCES_SQL = """-- Every id counter goes just past the biggest id that came back (a counter that restarts at 1 would collide with the restored rows).
do $restore$
declare r record;
begin
  for r in
    select s.relname as seq, t.relname as tbl, a.attname as col
      from pg_class s
      join pg_depend d on d.objid = s.oid and d.deptype in ('a', 'i')
      join pg_class t on t.oid = d.refobjid
      join pg_attribute a on a.attrelid = t.oid and a.attnum = d.refobjsubid
     where s.relkind = 'S' and s.relnamespace = 'public'::regnamespace
  loop
    execute format('select setval(%L, coalesce((select max(%I) from public.%I), 0) + 1, false)', 'public.' || r.seq, r.col, r.tbl);
  end loop;
end $restore$;
"""


def after_logins_sql(tables, fks, gone_logins):
    """Phase 2. Each old login is matched to the new one by username; the rows that belong to a login get the new id."""
    olds = [{'old_id': r['user_id'], 'tbl': t, 'username': r['username']}
            for t in ('assess_accounts', 'tps_accounts') for r in (tables.get(t) or []) if r.get('user_id') not in gone_logins]
    odata = dollar_quote(json.dumps(olds, ensure_ascii=False, separators=(',', ':')), 'ol')
    parts = [f"""-- Phase 2: what belongs to a LOGIN. Run it after the logins are re-created (README step 5); run it again after creating more.
-- Each old login is matched to its new one by username. A login that is not re-created yet leaves its rows waiting; the notice at the end says whose.
create temp table if not exists _old_logins (old_id uuid primary key, tbl text not null, username text not null);
truncate _old_logins;
insert into _old_logins select (x ->> 'old_id')::uuid, x ->> 'tbl', x ->> 'username' from jsonb_array_elements({odata}::jsonb) x;
create temp table if not exists _login_map (old_id uuid primary key, new_id uuid not null);
truncate _login_map;
insert into _login_map
select o.old_id, a.user_id from _old_logins o join public.assess_accounts a on o.tbl = 'assess_accounts' and a.username = o.username
union all
select o.old_id, a.user_id from _old_logins o join public.tps_accounts a on o.tbl = 'tps_accounts' and a.username = o.username;
"""]
    written = []
    for t in table_order(list(REMAP), fks):
        col = REMAP[t]
        rows = [r for r in (tables.get(t) or []) if r.get(col) not in gone_logins]
        if not rows:
            continue
        keys = sorted({k for r in rows for k in r})
        data = dollar_quote(json.dumps(rows, ensure_ascii=False, separators=(',', ':')))
        karr = 'array[' + ', '.join(lit(k) for k in keys) + ']::text[]'
        path = '{' + col + '}'
        parts.append(f"-- {t}: {len(rows)} row(s) in the backup\n" + do_block(f"""
declare cols text; v jsonb := {data}::jsonb; n_new int;
begin
  select string_agg(quote_ident(c.column_name), ', ' order by c.ordinal_position) into cols
    from information_schema.columns c
   where c.table_schema = 'public' and c.table_name = {lit(t)} and c.is_generated = 'NEVER' and c.column_name = any ({karr});
  execute format('with src as (select jsonb_set(x, %L, to_jsonb(m.new_id::text)) as j from jsonb_array_elements($1) x join _login_map m on m.old_id = (x ->> %L)::uuid)
                  insert into public.%I (%s) overriding system value select %s from src, lateral jsonb_populate_record(null::public.%I, src.j) on conflict do nothing',
                 {lit(path)}, {lit(col)}, {lit(t)}, cols, cols, {lit(t)}) using v;
  get diagnostics n_new = row_count;
  raise notice '{t}: % of {len(rows)} row(s) put back now (the rest are already there, or belong to a login that is not re-created yet)', n_new;
end
"""))
        written.append(t)
    parts.append("-- Which old logins still have no new one? Their rows above are waiting for them.\n" + do_block("""
declare r record; n int := 0;
begin
  for r in select o.tbl, o.username from _old_logins o left join _login_map m on m.old_id = o.old_id where m.old_id is null order by 1, 2 loop
    n := n + 1; raise notice 'no new login yet for % (%): create it with that username, then run this file again', r.username, r.tbl;
  end loop;
  if n = 0 then raise notice 'every old login has a new one'; end if;
end
"""))
    return '\n'.join(parts), written


def check_sql(expected, notes_by_day):
    """One query: table, rows the backup holds, rows the database has, and a verdict. A table that waits for logins reads 'waiting' until they are made."""
    lines = []
    for t in sorted(expected):
        n = expected[t]
        if t == 'hab_notes':
            vals = ', '.join(f"(date '{d}', {c})" for d, c in sorted(notes_by_day.items())) or "(date '1970-01-01', 0)"
            exp = f"(select coalesce(sum(n), 0)::bigint from (values {vals}) v(d, n) where d >= public.hab_notes_floor())"
            note = 'notes older than the table keeps (9 days) are removed by its own trigger, as on the live project'
        else:
            exp = f'{n}::bigint'
            note = ('a login table: re-made from the dashboard, not restored' if t in ACCOUNT_TABLES
                    else 'waits for the logins: 20-after-logins.sql' if t in REMAP else '')
        lines.append(f"  select {lit(t)}::text as tbl, {exp} as expected, (select count(*) from public.{t}) as actual, {lit(note)}::text as note")
    body = '\n  union all\n'.join(lines)
    return f"""-- For every table: the rows the backup holds ('expected') against the rows the database has now ('actual').
-- 'ok' = they match. 'waiting' = fewer rows than the backup holds in a table that waits for logins (run 20-after-logins.sql once they are made).
-- Anything else in the verdict column is a problem: do not go live until each table reads ok.
select tbl, expected, actual,
       case when actual = expected then 'ok'
            when note like 'waits for the logins%' and actual < expected then 'waiting'
            when note like 'a login table%' then 'login table (re-made by hand)'
            else 'MISSING ROWS' end as verdict,
       note
  from (
{body}
  ) t
 order by (case when actual = expected then 1 else 0 end), tbl;
"""


# ── the run ───────────────────────────────────────────────────────────────────────────────────────────────────────────────

def build(backup_path, schema_path, out_dir, receipt_paths=(), keep=(), allow_incomplete=False, drop_unknown_columns=False, chunk_bytes=400000):
    """Write the files. Returns the report text. Raises SystemExit with a plain message when the backup must not be used."""
    schema = open(schema_path, encoding='utf-8').read()
    schema_cols = snapshot_tables(schema)
    fks = foreign_keys(schema)
    backup = load_backup(backup_path, allow_incomplete)
    tables = backup['tables']
    keep = {str(k).lower() for k in keep}
    report = [f"backup {os.path.basename(backup_path)}, exported {backup.get('exported_at')}: {sum(len(v) for v in tables.values()):,} rows in {len(tables)} tables"]

    # 1. the backup must fit the schema, and the schema must hold nothing this script has not been taught about
    unknown = sorted(set(tables) - set(schema_cols))
    if unknown:
        raise SystemExit('the backup holds tables the schema snapshot does not have: ' + ', '.join(unknown) + '. The snapshot is older than this backup: '
                         'apply the later supabase/stage*.sql files to the new database, or regenerate the snapshot (README, "Keeping the snapshot current").')
    extra = {}
    for t, rows in tables.items():
        bad = sorted({k for r in rows for k in r} - set(schema_cols[t]))
        if bad:
            extra[t] = bad
    if extra and not drop_unknown_columns:
        raise SystemExit('the backup has columns the schema snapshot does not have: ' + '; '.join(f'{t}.{c}' for t, cs in sorted(extra.items()) for c in cs) +
                         '. The snapshot is older than this backup. Bring the snapshot up to date (README), or say --drop-unknown-columns to restore without them.')
    for t, cs in sorted(extra.items()):
        report.append(f'{t}: columns left out because the schema does not have them: ' + ', '.join(cs))
    missing = sorted(set(schema_cols) - set(tables) - SECRET_TABLES - SHORT_LIVED)
    if missing:
        report.append('tables the schema has and the backup does not (they stay empty): ' + ', '.join(missing))
    login_dependent = {t for t, refs in fks.items() for _, ref in refs if ref == 'auth.users' or ref in ACCOUNT_TABLES}
    if not login_dependent <= (set(ACCOUNT_TABLES) | set(REMAP)):
        raise SystemExit('these tables depend on a login but this script does not know how to remap them: ' + ', '.join(sorted(login_dependent - set(ACCOUNT_TABLES) - set(REMAP))) +
                         '. Add them to REMAP in scripts/restore/restore_backup.py and to the rehearsal before trusting a restore.')
    for t, refs in fks.items():
        for _, ref in refs:
            if ref in REMAP and t not in REMAP:
                raise SystemExit(f'{t} depends on {ref}, which waits for the logins, but {t} is not in REMAP')

    # 2. whom the receipts say is gone
    merged, added = merge_receipts(tables.get('erasure_log') or [], [(os.path.basename(p), load_backup(p, True)) for p in receipt_paths])
    if merged or 'erasure_log' in tables:
        tables['erasure_log'] = merged
    if added:
        report.append(f'erasure_log: {added} receipt(s) added from the newer backup(s), so the restored database remembers those erasures too')
    if not receipt_paths:
        report.insert(0, f"WARNING: NO NEWER BACKUP was given with --receipts. Anyone erased after {backup.get('exported_at')} comes back with this restore. "
                         'If you have a newer backup (even an INCOMPLETE one that has an erasure_log), run this again with --receipts <that file>.')
    receipts = erased_hashes(merged)
    def is_gone(kind, key):
        return str(key).lower() not in keep and receipt_hash(kind, key) in receipts[kind]
    athlete_ids = {r['athlete_id'] for rows in tables.values() for r in rows if r.get('athlete_id')}
    athlete_gone = {a for a in athlete_ids if is_gone('athlete', a)}
    gone_logins, gone_names = set(), []
    for kind, tbl in (('course', 'tps_accounts'), ('testing', 'assess_accounts')):
        for r in tables.get(tbl) or []:
            if is_gone(kind, r['username']):
                gone_logins.add(r['user_id']); gone_names.append(f"{kind} login {r['username']}")
    if athlete_gone or gone_names:
        report.append('LEFT OUT because a receipt in erasure_log says they were erased: ' + ', '.join(sorted(athlete_gone) + sorted(gone_names)))
    # An erased athlete's application forms: the ones the dashboard ticks by default (the same email, not shared with someone still here) go too;
    # every other candidate is only named, so the coach decides.
    emails, phones, others_email = set(), set(), set()
    for c in tables.get('hab_contacts') or []:
        e = str(c.get('email') or '').strip().lower()
        if c.get('athlete_id') in athlete_gone:
            if e:
                emails.add(e)
            if digits9(c.get('whatsapp')):
                phones.add(digits9(c.get('whatsapp')))
        elif e:
            others_email.add(e)
    form_drop, form_look = set(), []
    for f in tables.get('hab_intake') or []:
        e = str(f.get('email') or '').strip().lower()
        if e and e in emails and e not in others_email:
            form_drop.add(f['id'])
        elif (e and e in emails) or (digits9(f.get('contact')) and digits9(f.get('contact')) in phones):
            form_look.append(f['id'])
    if form_drop:
        report.append(f'hab_intake: {len(form_drop)} application form(s) left out because their email is on an erased athlete\'s contact record: ' + ', '.join(sorted(form_drop)))
    if form_look:
        report.append(f'hab_intake: {len(form_look)} form(s) kept that may belong to an erased person (a shared email, or the same WhatsApp number): ' + ', '.join(sorted(form_look)) + ' (look at them in the Intake tab)')

    os.makedirs(out_dir, exist_ok=True)
    for f in os.listdir(out_dir):
        if re.match(r'^(10|19|20|90)-.*\.sql$', f) or f == 'restore-report.txt':
            os.remove(os.path.join(out_dir, f))
    def write(name, text):
        open(os.path.join(out_dir, name), 'w', encoding='utf-8', newline='\n').write(text)

    # 3. phase 1: every table but the logins and what waits for them
    skip = set(ACCOUNT_TABLES) | set(REMAP)
    expected, n_files, cleared_links = {}, 0, {}
    order = table_order(set(schema_cols), fks)
    order = [t for t in order if t not in RESTORE_LAST] + [t for t in RESTORE_LAST if t in order]
    for t in order:
        if t not in tables or t in skip:
            continue
        rows = tables[t]
        if t in LINK_COLUMNS:
            fixed = []
            for r in rows:
                if t == 'hab_intake' and r.get('id') in form_drop:
                    continue
                if r.get('athlete_id') in athlete_gone:
                    r = dict(r)
                    cleared_links[t] = cleared_links.get(t, 0) + 1
                    for c in LINK_COLUMNS[t]:
                        if c in r:
                            r[c] = None
                fixed.append(r)
            rows = fixed
        elif any('athlete_id' in r for r in rows):
            kept = [r for r in rows if r.get('athlete_id') not in athlete_gone]
            if len(kept) != len(rows):
                report.append(f'{t}: {len(rows) - len(kept)} row(s) of erased athletes left out')
            rows = kept
        expected[t] = len(rows)
        if not rows:
            continue
        pieces = list(chunks(rows, chunk_bytes))
        for i, piece in enumerate(pieces, 1):
            n_files += 1
            part = f'-part{i}of{len(pieces)}' if len(pieces) > 1 else ''
            write(f'10-{n_files:03d}-{t}{part}.sql', f'-- Restore: public.{t}. Safe to run twice.\n' + insert_block(t, piece, f' (piece {i} of {len(pieces)})' if len(pieces) > 1 else ''))
    for t, n in sorted(cleared_links.items()):
        report.append(f'{t}: the link to an erased athlete was cleared on {n} row(s); the rows stay')
    write('19-sequences.sql', SEQUENCES_SQL)

    # 4. phase 2: what waits for the logins
    p2, p2_tables = after_logins_sql(tables, fks, gone_logins)
    write('20-after-logins.sql', p2)
    for t, col in REMAP.items():
        if t in tables:
            expected[t] = len([r for r in tables[t] if r.get(col) not in gone_logins])
    def login_gone(t, r):
        return r.get('user_id') in gone_logins or (t == 'athlete_identities' and r.get('athlete_id') in athlete_gone)
    for t in ACCOUNT_TABLES:
        if t in tables:
            expected[t] = len([r for r in tables[t] if not login_gone(t, r)])
    notes_by_day = {}
    for r in tables.get('hab_notes') or []:
        if r.get('athlete_id') not in athlete_gone:
            notes_by_day[r['day']] = notes_by_day.get(r['day'], 0) + 1
    write('90-check.sql', check_sql(expected, notes_by_day))

    report.append(f'phase 1: {n_files} file(s) for {len([t for t in expected if expected[t] and t not in skip])} table(s). Phase 2 (after the logins): ' + (', '.join(p2_tables) or 'nothing to put back'))
    for t, col in ACCOUNT_TABLES.items():
        live, revoked = [], []
        for r in tables.get(t) or []:
            if login_gone(t, r):
                continue
            (revoked if r.get('revoked_at') else live).append(r[col])
        if live:
            report.append(f'logins to re-create ({t}): ' + ', '.join(sorted(live)))
        if revoked:
            report.append(f'revoked logins, re-create only if you want them back, their data waits ({t}): ' + ', '.join(sorted(revoked)))
    text = '\n'.join(report) + '\n'
    write('restore-report.txt', text)
    return text


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('backup')
    ap.add_argument('--schema', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'supabase', 'schema_snapshot.sql'))
    ap.add_argument('--out', required=True)
    ap.add_argument('--receipts', action='append', default=[], help='a NEWER backup: its erasure receipts are honoured too (repeatable)')
    ap.add_argument('--keep', action='append', default=[], help='an athlete id or username to restore although a receipt matches it (repeatable)')
    ap.add_argument('--allow-incomplete', action='store_true')
    ap.add_argument('--drop-unknown-columns', action='store_true')
    ap.add_argument('--chunk-bytes', type=int, default=400000)
    a = ap.parse_args()
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    print(build(a.backup, a.schema, a.out, a.receipts, a.keep, a.allow_incomplete, a.drop_unknown_columns, a.chunk_bytes))


if __name__ == '__main__':
    main()
