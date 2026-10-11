// Shared plumbing for the restore rehearsal (scripts/restore/rehearse.mjs): PGlite, and a SQL splitter that knows quotes, dollar quotes and comments,
// so a script can be run one statement at a time and an error names the statement that caused it.
//
// PGlite is a real PostgreSQL compiled to WebAssembly. It is not a dependency of the repo: install it into a scratch folder and point PGLITE at it,
// the way PLAYWRIGHT points at Playwright:
//     npm install @electric-sql/pglite --prefix <scratch folder>          (about 25 MB; delete the folder afterwards)
//     PGLITE=<scratch folder>/node_modules/@electric-sql/pglite node scripts/restore/rehearse.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function openDb() {
  const dir = process.env.PGLITE || '';
  if (!dir) throw new Error('Set PGLITE to the folder of @electric-sql/pglite (see the top of scripts/restore/lib.mjs).');
  const { PGlite } = await import(pathToFileURL(path.join(dir, 'dist', 'index.js')).href);
  return new PGlite();
}

// One statement per element, without the closing semicolon's trailing space. Understands '...' (with ''), "..." identifiers, $tag$ ... $tag$,
// -- line comments and /* */ block comments. A statement is whatever lies between two top-level semicolons.
export function splitSql(sql) {
  const out = [];
  let i = 0, start = 0;
  const n = sql.length;
  while (i < n) {
    const c = sql[i], d = sql[i + 1];
    if (c === '-' && d === '-') { const e = sql.indexOf('\n', i); i = e < 0 ? n : e + 1; continue; }
    if (c === '/' && d === '*') { const e = sql.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
    if (c === "'") { i++; while (i < n) { if (sql[i] === "'") { if (sql[i + 1] === "'") { i += 2; continue; } break; } i++; } i++; continue; }
    if (c === '"') { i++; while (i < n && sql[i] !== '"') i++; i++; continue; }
    if (c === '$') {
      const m = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i, i + 80));
      if (m) { const tag = m[0]; const e = sql.indexOf(tag, i + tag.length); i = e < 0 ? n : e + tag.length; continue; }
    }
    if (c === ';') { const stmt = sql.slice(start, i).trim(); if (stmt && !/^(--[^\n]*\n?)*$/.test(stmt)) out.push(stmt); start = i + 1; i++; continue; }
    i++;
  }
  const rest = sql.slice(start).trim();
  if (rest && !/^(--[^\n]*\n?\s*)*$/.test(rest)) out.push(rest);
  return out;
}

// Run a script statement by statement. Throws an Error that names the statement (its first line) and the database's own message.
export async function runSql(db, sql, label) {
  for (const stmt of splitSql(sql)) {
    try { await db.exec(stmt + ';'); }
    catch (e) { throw new Error(`${label || 'sql'}: ${String(e.message || e).split('\n')[0]}\n   in: ${stmt.split('\n')[0].slice(0, 160)}`); }
  }
}

export const read = f => fs.readFileSync(f, 'utf8');
