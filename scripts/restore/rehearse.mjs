// The restore rehearsal: proves, on a throwaway PostgreSQL (PGlite), that supabase/schema_snapshot.sql + a dashboard backup + scripts/restore/restore_backup.py
// really bring the database back. Made-up rows only (scripts/restore/seed_made_up.sql); it never touches a real project and writes only to a temp folder.
//
//     PGLITE=<scratch>/node_modules/@electric-sql/pglite node scripts/restore/rehearse.mjs        (see the top of lib.mjs for the install)
//
// What it does, in order
//   1. builds database A from the snapshot, fills it with the made-up rows, and takes backup 1 the way coach.html's Backup button does (same table list,
//      first passwords blanked)
//   2. erases three made-up people in A with the REAL coach_erase_person() (an athlete, a testing buyer, a course buyer), then takes backup 2: a NEWER
//      backup that holds their receipts and none of their data
//   3. restores backup 1 (which still holds those people) into a fresh database B using backup 2's receipts, applying the generated files exactly as the README says;
//      checks the row counts, runs everything twice, simulates re-creating the logins in two steps, and compares every table of B with A table by table
//   4. restores again without --keep (the person with an old receipt stays out), and without receipts (the report must say so loudly)
//   5. tries the files the script must refuse (incomplete backup, unknown table, unknown column, a "newer" backup with no erasure_log)
// Exit code 1 if anything failed.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import cp from 'node:child_process';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { openDb, runSql, read } from './lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const SNAPSHOT = path.join(ROOT, 'supabase', 'schema_snapshot.sql');
const SECRET_TABLES = ['assess_publish_keys', 'tps_publish_keys',
                       'push_config'];                   // and the reminders' VAPID private key and shared secret (stage84): see restore_backup.py
const SHORT_LIVED = ['crew_posts', 'crew_photos', 'crew_kudos', 'crew_rings',   // the Bell's 7-day tables (stage81), as in restore_backup.py: never in a backup, on purpose
                     'push_sent',                               // and what went out today (stage84): it rebuilds itself by not sending twice
                     'crew_push_q', 'crew_push_seen'];          // the crew's queue and its watermarks (stage86): the queue keeps the Bell's own 7 days, the watermarks rebuild themselves
const COACH_JWT = JSON.stringify({ email: 'amirardekanian@gmail.com', role: 'authenticated', sub: '00000000-0000-4000-8000-00000000c0c0' });
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'restore-rehearsal-'));

let passed = 0, failed = 0;
function ok(cond, what, detail) {
  if (cond) { passed++; console.log('  ok   ' + what); }
  else { failed++; console.log('  FAIL ' + what + (detail ? '\n         ' + String(detail).split('\n').join('\n         ') : '')); }
}
const section = s => console.log('\n' + s);

// ── helpers ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function py(args) {
  let last;
  for (const exe of [process.env.PYTHON, 'python', 'python3'].filter(Boolean)) {
    const r = cp.spawnSync(exe, ['-I', ...args], { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
    if (r.error && r.error.code === 'ENOENT') continue;
    last = r;
    if (r.status === 9009 || /Microsoft Store|was not found/i.test(r.stderr || '')) continue;      // the Windows Store stub of python3
    return r;
  }
  if (last) return last;
  throw new Error('No python found. Set PYTHON to its path.');
}
const restore = (backup, out, extra = []) => py([path.join(HERE, 'restore_backup.py'), backup, '--out', out, ...extra]);

async function makeDb() {
  const db = await openDb();
  await runSql(db, read(path.join(HERE, 'stand_in_supabase.sql')), 'stand-in');
  await runSql(db, read(SNAPSHOT), 'snapshot');
  return db;
}
async function q(db, sql, params) { return (await db.query(sql, params)).rows; }
const names = s => [...s.matchAll(/'([a-z_]+)'/g)].map(m => m[1]);

function dashboardLists() {
  const html = read(path.join(ROOT, 'coach.html'));
  const bt = html.match(/const BACKUP_TABLES = \[([\s\S]*?)\];/);
  const pt = html.match(/const PASSWORD_TABLES = \[([\s\S]*?)\];/);
  if (!bt || !pt) throw new Error('coach.html no longer has BACKUP_TABLES / PASSWORD_TABLES in the shape this rehearsal reads');
  return { backupTables: names(bt[1]), passwordTables: names(pt[1]) };
}

// The file coach.html's Backup button writes: each table's rows as PostgREST returns them (to_jsonb is the same shape), first passwords blanked.
async function exportBackup(db, lists) {
  const tables = {};
  for (const t of lists.backupTables) {
    let rows = JSON.parse((await q(db, `select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)::text as j from public.${t} x`))[0].j);
    if (lists.passwordTables.includes(t)) rows = rows.map(x => ('initial_password' in x) ? { ...x, initial_password: null } : x);
    tables[t] = rows;
  }
  return {
    exported_at: new Date().toISOString(), project: 'rehearsal', note: 'made-up rows', tables, complete: true,
    row_counts: Object.fromEntries(Object.entries(tables).map(([t, r]) => [t, r.length])),
  };
}
const save = (obj, file) => { fs.writeFileSync(file, JSON.stringify(obj, null, 2)); return file; };
const clone = o => JSON.parse(JSON.stringify(o));

async function applyFiles(db, dir, re) {
  const files = fs.readdirSync(dir).filter(f => re.test(f)).sort();
  for (const f of files) await runSql(db, read(path.join(dir, f)), f);
  return files;
}
async function check(db, dir) {
  const rows = await q(db, read(path.join(dir, '90-check.sql')));
  return Object.fromEntries(rows.map(r => [r.tbl, { expected: Number(r.expected), actual: Number(r.actual), verdict: r.verdict }]));
}

// What a table holds, as one hash. The logins are compared by NAME (a re-created login has a new id), and so is everything that points at a login.
function hashSql(t) {
  const row = {
    affiliates: `to_jsonb(t) - 'updated_at'`,        // the real erasure touches updated_at when it clears the link (a trigger); a restore keeps the original
    assess_accounts: `jsonb_build_object('username', username)`,
    tps_accounts: `jsonb_build_object('username', username)`,
    athlete_identities: `jsonb_build_object('athlete_id', athlete_id, 'email', email)`,
    assess_players: `(to_jsonb(t) - 'account_id') || jsonb_build_object('who', (select a.username from public.assess_accounts a where a.user_id = t.account_id))`,
    assess_notes: `(to_jsonb(t) - 'account_id') || jsonb_build_object('who', (select a.username from public.assess_accounts a where a.user_id = t.account_id))`,
    assess_results: `(to_jsonb(t) - 'account_id') || jsonb_build_object('who', (select a.username from public.assess_accounts a where a.user_id = t.account_id))`,
    buyer_notes: `(to_jsonb(t) - 'user_id') || jsonb_build_object('who', coalesce((select a.username from public.assess_accounts a where a.user_id = t.user_id), (select a.username from public.tps_accounts a where a.user_id = t.user_id)))`,
  }[t] || 'to_jsonb(t)';
  return `select count(*)::int as n, md5(coalesce(string_agg(x, '|' order by x), '')) as h from (select (${row})::text as x from public.${t} t) s`;
}
async function compareDbs(a, b, tables, label) {
  const bad = [];
  for (const t of tables) {
    const ra = (await q(a, hashSql(t)))[0], rb = (await q(b, hashSql(t)))[0];
    if (ra.n !== rb.n || ra.h !== rb.h) bad.push(`${t}: ${ra.n} rows in the original, ${rb.n} restored`);
  }
  ok(bad.length === 0, `${label}: all ${tables.length} tables hold the same rows`, bad.join('\n'));
}

// Re-create logins the way the dashboard's Create login does (a new sign-in id, the same username), reading the names from the report like the operator.
async function recreateLogins(db, report, only) {
  const made = [];
  for (const m of report.matchAll(/^(?:logins to re-create|revoked logins[^(]*)\s*\((\w+)\): (.+)$/gm)) {
    for (const name of m[2].split(',').map(s => s.trim())) {
      if (only && !only.has(name)) continue;
      const tbl = m[1];
      const id = crypto.randomUUID();
      const prefix = tbl === 'athlete_identities' ? 'athlete' : tbl === 'tps_accounts' ? 'tps' : 'assess';
      const email = `${prefix}.${name}@amirardekani.com`;
      await db.query('insert into auth.users (id, email) values ($1, $2)', [id, email]);
      if (tbl === 'athlete_identities') await db.query('insert into public.athlete_identities (user_id, athlete_id, email) values ($1, $2, $3)', [id, name, email]);
      else await db.query(`insert into public.${tbl} (user_id, username) values ($1, $2)`, [id, name]);
      made.push(name);
    }
  }
  return made;
}

async function nextIdsAfterMax(db) {
  const seqs = await q(db, `select s.relname as seq, t.relname as tbl, a.attname as col from pg_class s
      join pg_depend d on d.objid = s.oid and d.deptype in ('a', 'i') join pg_class t on t.oid = d.refobjid
      join pg_attribute a on a.attrelid = t.oid and a.attnum = d.refobjsubid where s.relkind = 'S' and s.relnamespace = 'public'::regnamespace order by 1`);
  const bad = [];
  for (const s of seqs) {
    const mx = (await q(db, `select coalesce(max(${s.col}), 0)::text as m from public.${s.tbl}`))[0].m;
    const nx = (await q(db, `select nextval('public.${s.seq}')::text as n`))[0].n;
    if (!(BigInt(nx) > BigInt(mx))) bad.push(`${s.tbl}.${s.col}: next id ${nx}, biggest ${mx}`);
  }
  return { n: seqs.length, bad };
}

// ── the run ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
try {
  const lists = dashboardLists();

  section('1. the schema snapshot and the dashboard agree on the tables');
  const A = await makeDb();
  const tablesInDb = (await q(A, `select tablename from pg_tables where schemaname = 'public' order by 1`)).map(r => r.tablename);
  ok(tablesInDb.length >= 45, `the snapshot built ${tablesInDb.length} tables`);
  ok(JSON.stringify([...lists.backupTables].sort()) === JSON.stringify(tablesInDb.filter(t => !SECRET_TABLES.includes(t) && !SHORT_LIVED.includes(t))),
     'coach.html BACKUP_TABLES is every public table except the key-hash and secret tables and the short-lived ones (stage81, stage84)',
     'in the database but not in BACKUP_TABLES: ' + tablesInDb.filter(t => !SECRET_TABLES.includes(t) && !SHORT_LIVED.includes(t) && !lists.backupTables.includes(t)).join(', ') +
     '\nin BACKUP_TABLES but not in the database: ' + lists.backupTables.filter(t => !tablesInDb.includes(t)).join(', '));

  // The snapshot, applied to a database and read back with catalog.sql, writes the same snapshot (comment lines aside): nothing the generator can see is lost on the way.
  const cat = (await q(A, read(path.join(HERE, 'catalog.sql'))))[0].catalog;
  fs.writeFileSync(path.join(TMP, 'catalog.json'), JSON.stringify(cat));
  const again = py([path.join(HERE, 'make_schema_snapshot.py'), path.join(TMP, 'catalog.json'), '--out', path.join(TMP, 'snapshot-again.sql'), '--date', '2000-01-01']);
  const noComments = f => read(f).split('\n').filter(l => !l.startsWith('--')).join('\n');
  const same = again.status === 0 && noComments(path.join(TMP, 'snapshot-again.sql')) === noComments(SNAPSHOT);
  let firstDiff = '';
  if (!same && again.status === 0) {
    const x = noComments(SNAPSHOT).split('\n'), y = noComments(path.join(TMP, 'snapshot-again.sql')).split('\n');
    const i = x.findIndex((l, k) => l !== y[k]);
    firstDiff = `first difference at statement line ${i + 1}:\n  snapshot : ${(x[i] || '').slice(0, 200)}\n  read back: ${(y[i] || '').slice(0, 200)}`;
  }
  ok(same, 'the snapshot reproduces itself: applied, read back with catalog.sql and written again, it is the same', again.stderr || firstDiff);

  section('2. made-up rows, then backup 1 (taken the way the dashboard takes it)');
  await runSql(A, read(path.join(HERE, 'seed_made_up.sql')), 'seed');
  const emptyAfterSeed = [];
  for (const t of lists.backupTables) if (!Number((await q(A, `select count(*) as n from public.${t}`))[0].n)) emptyAfterSeed.push(t);
  ok(emptyAfterSeed.length === 0, 'the seed puts at least one row in every backed-up table', 'empty: ' + emptyAfterSeed.join(', '));
  const b1 = await exportBackup(A, lists);
  b1.exported_at = '2026-10-11T20:00:00.000Z';
  b1.tables.hab_notes.push({ athlete_id: 'ava_test', day: new Date(Date.now() - 20 * 864e5).toISOString().slice(0, 10), body: 'older than the table keeps', pct: 10, hidden: false,
                             created_at: '2026-09-20T00:00:00+00:00', updated_at: '2026-09-20T00:00:00+00:00' });
  ok(b1.tables.athlete_identities.every(r => r.initial_password === null), 'the first passwords are blanked in the file, as the dashboard does');
  const f1 = save(b1, path.join(TMP, 'aa-backup-2026-10-11.json'));

  section('3. three erasures with the real coach_erase_person(), then backup 2 (newer: receipts, no data)');
  await q(A, `select set_config('request.jwt.claims', $1, false)`, [COACH_JWT]);
  const erased = [];
  for (const [kind, key, ids] of [['athlete', 'gone_test', ['10000000-0000-4000-8000-000000000001']], ['testing', 'gone_buyer', []], ['course', 'gone_learner', []]]) {
    const r = (await q(A, `select public.coach_erase_person($1, $2, $3, $4::uuid[], false) as r`, [kind, key, key, ids]))[0].r;
    erased.push(r);
  }
  await q(A, `select set_config('request.jwt.claims', '', false)`);
  ok(erased.every(r => r && r.ok === true), 'the erasures ran (athlete, testing buyer, course buyer)', JSON.stringify(erased));
  const b2 = await exportBackup(A, lists);
  b2.exported_at = '2026-10-12T20:00:00.000Z';
  ok(b2.tables.erasure_log.length === 5, 'backup 2 holds five receipts (2 seeded, 3 new)');
  ok(!JSON.stringify(b2.tables).includes('gone_test') && !JSON.stringify(b2.tables).includes('gone_buyer'), 'backup 2 holds no trace of the erased people');
  const f2 = save(b2, path.join(TMP, 'aa-backup-2026-10-12.json'));
  ok(JSON.stringify(b1.tables).includes('gone_test'), 'backup 1 still holds the erased athlete (it is the old one)');

  section('4. restore backup 1 with backup 2\'s receipts into a fresh database B');
  const dirB = path.join(TMP, 'restore-B');
  const rb = restore(f1, dirB, ['--receipts', f2, '--keep', 'reborn_test']);
  ok(rb.status === 0, 'restore_backup.py ran', rb.stderr || rb.stdout);
  const reportB = fs.readFileSync(path.join(dirB, 'restore-report.txt'), 'utf8');
  console.log(reportB.split('\n').map(l => '       | ' + l).join('\n'));
  ok(/LEFT OUT because a receipt[^\n]*gone_test/.test(reportB) && /testing login gone_buyer/.test(reportB) && /course login gone_learner/.test(reportB), 'the report names the three erased people');
  ok(!/LEFT OUT[^\n]*reborn_test/.test(reportB), 'reborn_test (--keep) is not left out');
  ok(!/logins to re-create \(athlete_identities\)[^\n]*gone_test/.test(reportB), 'the erased athlete\'s login is not on the list of logins to re-create');
  ok(/hab_intake: 1 application form\(s\) left out/.test(reportB) && /10000000-0000-4000-8000-000000000003/.test(reportB), 'the report names the form it dropped and the form that may belong to an erased person');
  const B = await makeDb();
  const files = await applyFiles(B, dirB, /^(10|19)-/);
  ok(files.length > 20, `${files.length} files applied (phase 1 and the counters)`);
  let chk = await check(B, dirB);
  const wrong = Object.entries(chk).filter(([t, c]) => !['ok', 'waiting', 'login table (re-made by hand)'].includes(c.verdict));
  ok(wrong.length === 0, 'the check query: every table is ok, waiting for a login, or a login table', wrong.map(([t, c]) => `${t}: ${JSON.stringify(c)}`).join('\n'));
  ok(chk.hab_notes.verdict === 'ok' && chk.hab_notes.expected === 4 - 1, 'hab_notes: the note older than the table keeps is not expected, and not there (the table prunes it)', JSON.stringify(chk.hab_notes));
  ok((await q(B, `select count(*)::int as n from public.hab_notes where body = 'older than the table keeps'`))[0].n === 0, 'the old note was pruned by the table\'s own trigger');
  ok(chk.assess_players.verdict === 'waiting' && chk.athlete_identities.verdict.startsWith('login table'), 'before the logins exist, the testing players wait and the login tables read as such');

  section('5. the erased stay erased (nothing under their ids), links cleared, forms handled');
  const athleteTables = (await q(B, `select table_name from information_schema.columns where table_schema = 'public' and column_name = 'athlete_id' order by 1`)).map(r => r.table_name);
  const traces = [];
  for (const t of athleteTables) {
    const n = (await q(B, `select count(*)::int as n from public.${t} where athlete_id = 'gone_test'`))[0].n;
    if (n) traces.push(`${t}: ${n}`);
  }
  ok(traces.length === 0, `no row of the erased athlete in any of the ${athleteTables.length} tables with an athlete_id`, traces.join(', '));
  ok((await q(B, `select count(*)::int as n from public.hab_intake where id = '10000000-0000-4000-8000-000000000001'`))[0].n === 0, 'the application with the erased athlete\'s own email is gone');
  const kept = await q(B, `select id, athlete_id, linked_at, outcome from public.hab_intake order by id`);
  ok(kept.length === 4 && kept.every(r => r.athlete_id !== 'gone_test'), 'the other four applications are kept, none linked to the erased athlete');
  const f4 = kept.find(r => r.id === '10000000-0000-4000-8000-000000000004');
  ok(f4 && f4.athlete_id === null && f4.linked_at === null && f4.outcome === 'client', 'the application that was linked to them keeps its answer and loses only the link');
  const aff = await q(B, `select code, athlete_id from public.affiliates order by code`);
  ok(aff.length === 3 && aff.find(r => r.code === 'GONE20').athlete_id === null, 'the partner record stays, its link to the erased athlete is cleared');
  ok((await q(B, `select count(*)::int as n from public.erasure_log`))[0].n === 5, 'all five receipts are in the restored database (the newer ones were added)');

  section('6. running it twice changes nothing; the counters are past every restored id');
  await applyFiles(B, dirB, /^(10|19)-/);
  const chk2 = await check(B, dirB);
  ok(JSON.stringify(chk2) === JSON.stringify(chk), 'the second run leaves every count as it was');
  const nx = await nextIdsAfterMax(B);
  ok(nx.n === 9 && nx.bad.length === 0, `all ${nx.n} id counters hand out an id past every restored one`, nx.bad.join('\n'));

  section('7. the logins come back in two steps; the rows that belong to a login follow');
  const made1 = await recreateLogins(B, reportB, new Set(['buyer_one', 'learner_one', 'ava_test']));
  ok(made1.length === 3, 'step 1: three of the logins re-created (buyer_one, learner_one, ava_test)', made1.join(','));
  await runSql(B, read(path.join(dirB, '20-after-logins.sql')), '20-after-logins');
  chk = await check(B, dirB);
  ok(chk.assess_players.verdict === 'waiting' && chk.assess_players.actual === 2, 'after step 1: buyer_one\'s two players are back, buyer_two\'s is still waiting', JSON.stringify(chk.assess_players));
  ok(chk.assess_results.actual === 3 && chk.assess_notes.actual === 1 && chk.buyer_notes.actual === 2, 'after step 1: their results, notes and the private notes follow (3, 1, 2)', JSON.stringify([chk.assess_results, chk.assess_notes, chk.buyer_notes]));
  const made2 = await recreateLogins(B, reportB, new Set(['buyer_two', 'learner_rev', 'ben_test']));
  ok(made2.length === 3, 'step 2: the rest re-created (buyer_two, learner_rev revoked-then-restored, ben_test)', made2.join(','));
  await runSql(B, read(path.join(dirB, '20-after-logins.sql')), '20-after-logins');
  await runSql(B, read(path.join(dirB, '20-after-logins.sql')), '20-after-logins (again)');
  chk = await check(B, dirB);
  const waiting = Object.entries(chk).filter(([t, c]) => c.actual !== c.expected && !['athlete_identities'].includes(t));
  ok(waiting.length === 0, 'after step 2 and a second run: every table matches the backup', waiting.map(([t, c]) => `${t}: ${JSON.stringify(c)}`).join('\n'));
  ok(chk.athlete_identities.actual === 2, 'athlete_identities holds the two re-created logins (ava_test and ben_test)', JSON.stringify(chk.athlete_identities));

  section('8. database B against database A (after its erasures): table by table');
  await compareDbs(A, B, lists.backupTables, 'B (restore of backup 1 + receipts)');

  section('8b. the same restore cut into many small pieces gives the same database');
  const dirE = path.join(TMP, 'restore-E');
  const re2 = restore(f1, dirE, ['--receipts', f2, '--keep', 'reborn_test', '--chunk-bytes', '600']);
  ok(re2.status === 0, 'restore_backup.py ran with --chunk-bytes 600', re2.stderr);
  const E = await makeDb();
  const piecesE = await applyFiles(E, dirE, /^(10|19)-/);
  ok(piecesE.length > files.length + 10 && piecesE.some(f => /-part\d+of\d+\.sql$/.test(f)), `${piecesE.length} small pieces applied (against ${files.length})`);
  const waitForLogins = ['athlete_identities', 'tps_accounts', 'assess_accounts', 'assess_players', 'assess_notes', 'assess_results', 'buyer_notes'];
  await compareDbs(B, E, lists.backupTables.filter(t => !waitForLogins.includes(t)), 'E (many pieces) against B, the tables that do not wait for a login');
  await E.close();
  await B.close();

  section('9. without --keep, an id with an old receipt stays out');
  const dirC = path.join(TMP, 'restore-C');
  const rc = restore(f1, dirC, ['--receipts', f2]);
  ok(rc.status === 0, 'restore_backup.py ran', rc.stderr);
  const reportC = fs.readFileSync(path.join(dirC, 'restore-report.txt'), 'utf8');
  ok(/LEFT OUT[^\n]*reborn_test/.test(reportC), 'the report names reborn_test');
  const C = await makeDb();
  await applyFiles(C, dirC, /^(10|19)-/);
  ok((await q(C, `select count(*)::int as n from public.programs where athlete_id = 'reborn_test'`))[0].n === 0, 'reborn_test has no programme in the restored database');
  await C.close();

  section('10. without receipts the erased person comes back, and the report says so loudly');
  const dirD = path.join(TMP, 'restore-D');
  const rd = restore(f1, dirD, ['--keep', 'reborn_test']);
  ok(rd.status === 0, 'restore_backup.py ran', rd.stderr);
  const reportD = fs.readFileSync(path.join(dirD, 'restore-report.txt'), 'utf8');
  ok(/NO NEWER BACKUP/i.test(reportD) && /comes? back/i.test(reportD), 'the report warns that anyone erased after this backup comes back', reportD);

  section('11. files the script must refuse');
  const refuse = (what, obj, name, extra, pattern) => {
    const f = save(obj, path.join(TMP, name));
    const r = restore(f, path.join(TMP, 'refused'), extra);
    ok(r.status !== 0 && pattern.test((r.stderr || '') + (r.stdout || '')), `refused: ${what}`, `exit ${r.status}\n${r.stderr || r.stdout}`);
  };
  refuse('an incomplete backup (complete: false)', { ...clone(b1), complete: false, could_not_read: ['programs: boom'] }, 'aa-backup-2026-10-13.json', [], /INCOMPLETE/);
  refuse('a file named INCOMPLETE', clone(b1), 'aa-backup-INCOMPLETE-2026-10-13.json', [], /INCOMPLETE/);
  const withTable = clone(b1); withTable.tables.mystery_table = [{ id: 1 }];
  refuse('a table the schema does not have', withTable, 'aa-backup-t.json', [], /mystery_table/);
  const withCol = clone(b1); withCol.tables.programs[0].bogus_column = 1;
  refuse('a column the schema does not have', withCol, 'aa-backup-c.json', [], /programs\.bogus_column/);
  const rdc = restore(path.join(TMP, 'aa-backup-c.json'), path.join(TMP, 'dropcol'), ['--drop-unknown-columns']);
  ok(rdc.status === 0 && /columns left out/.test(fs.readFileSync(path.join(TMP, 'dropcol', 'restore-report.txt'), 'utf8')), '--drop-unknown-columns restores without it and says so');
  const noLog = clone(b2); delete noLog.tables.erasure_log;
  refuse('a "newer" backup with no erasure_log', b1, 'aa-backup-x.json', ['--receipts', save(noLog, path.join(TMP, 'aa-backup-nolog.json'))], /no erasure_log/);
  refuse('a file that is not a backup', { hello: 'world' }, 'aa-backup-y.json', [], /not a dashboard backup/);

  await A.close();
} catch (e) {
  failed++;
  console.log('\nCRASH: ' + (e && e.stack || e));
} finally {
  if (process.env.KEEP) console.log('\nfiles kept in ' + TMP);
  else fs.rmSync(TMP, { recursive: true, force: true });
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
