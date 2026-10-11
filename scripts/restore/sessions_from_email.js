// Put back sessions that reached Amir by email but never reached session_history (2026-10-12).
//
//   node scripts/restore/sessions_from_email.js <emails.json>  >  restore.sql
//
// Until 2026-10-12 the app saved a session to the server once and queued it for a retry only when the call came back
// with an error; a call that never came back lost it, while the emailed report (which waits in its own outbox) arrived.
// The app now queues every session before it sends it, so this should never be needed again. It is kept for the day it
// is: it reads each report with coach.html's OWN parser (parseSessionEmail, the one reader of the report's format, held
// to the app's writer by scripts/check_twins.js), and prints one INSERT that adds only what is missing:
// ON CONFLICT (athlete_id, day, completed_on) DO NOTHING, so a session already on the server is never touched.
//
// <emails.json> is a list, one entry per report, made by hand or by Claude from Gmail (get_message, PLAIN_TEXT; the
// newest report of a session when there are two, e.g. "Send the update"). Keep it OUTSIDE the repo (it holds athlete data):
//   [{ "athlete_id": "jane_doe", "name": "Jane Doe", "on": "2026-10-10", "body": "<the plain-text email>" }, …]
// `on` is the day the session was trained (the athlete's local date; the phone's <id>_senton_d<N> when it is in their
// progress, else the email's date in Tehran). Find the missing ones first: every report since a date, against
// session_history by athlete name, day and a date window (see the 2026-10-12 entry in CODEBASE.md). Run the SQL with the
// Supabase MCP and read back what it RETURNS: a row not listed was already there.
'use strict';
const fs = require('fs'), path = require('path');

const emailsPath = process.argv[2];
if (!emailsPath) { console.error('usage: node scripts/restore/sessions_from_email.js <emails.json>'); process.exit(2); }
const src = fs.readFileSync(path.join(__dirname, '..', '..', 'coach.html'), 'utf8');
function grabFn(name) {
  const i = src.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('coach.html has no function ' + name + ': update this script');
  let depth = 0;
  for (let k = src.indexOf('{', i); k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}' && !--depth) return src.slice(i, k + 1);
  }
  throw new Error('unbalanced: ' + name);
}
const parseSessionEmail = new Function(grabFn('parseCheckinPlan') + '\n' + grabFn('parseSessionEmail') + '\nreturn parseSessionEmail;')();

const q = s => s == null ? 'null' : "'" + String(s).replace(/'/g, "''") + "'";
const num = v => (v === '' || v == null) ? 'null' : String(Math.round(Number(v)));
const rows = JSON.parse(fs.readFileSync(emailsPath, 'utf8')).map((e, i) => {
  if (!e.athlete_id || !e.name || !/^\d{4}-\d{2}-\d{2}$/.test(String(e.on || ''))) throw new Error(`entry ${i}: athlete_id, name and on (YYYY-MM-DD) are needed`);
  // Gmail's plain text is "Field : value"; the pasted email the parser was written for is "Field\nvalue".
  const text = String(e.body || '').replace(/^Full summary : /m, 'Full summary\n').replace(/^([A-Za-z][^:\n]*?) : /gm, '$1: ');
  const p = parseSessionEmail(text);
  if (!p.day) throw new Error(`entry ${i} (${e.athlete_id} ${e.on}): no "Day N" line in the email`);
  if (!p.summary.startsWith('Day ' + p.day)) throw new Error(`entry ${i}: the summary does not start with its day; is the body the whole email?`);
  console.error(`${e.athlete_id} · Day ${p.day} · ${e.on} · ${p.focus} · ${p.status} · sRPE ${p.session_rpe || '-'} · ${p.duration_min || '-'} min · readiness ${p.readiness ? 'yes' : 'none'}`);
  return `(${q(e.athlete_id)}, ${q(e.name)}, ${p.day}, ${q(e.on)}, ${q(p.status || 'Complete')}, ${num(p.session_rpe)}, ${num(p.duration_min)}, ` +
    `${p.readiness ? q(JSON.stringify(p.readiness)) + '::jsonb' : 'null'}, ${q(p.day_note || '')}, ${q(p.focus || '')}, ${q(p.summary)}, now())`;
});
console.log(`insert into public.session_history (athlete_id, athlete_name, day, completed_on, status, session_rpe, duration_min, readiness, day_note, focus, summary, updated_at)
values
${rows.join(',\n')}
on conflict (athlete_id, day, completed_on) do nothing
returning athlete_id, day, completed_on, status, session_rpe, duration_min, focus;`);
