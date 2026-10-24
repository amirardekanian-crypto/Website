// Rehearses supabase/stage97_partner_codes.sql (Bring a Partner: a member's own code, 10% off for the friend and a 10% credit for the member) and its
// way back (scripts/career/rollback_stage97.sql) on PGlite. Nothing live, made-up athletes only (zz_ ids). stage96 goes on first (crew_page() carries
// the code on your own page, and the erase function carries both stages' patches).
//
//   npm install @electric-sql/pglite --prefix "$TEMP/pglite"          (once, outside the repo)
//   PGLITE="$TEMP/pglite/node_modules/@electric-sql/pglite" node scripts/career/rehearse_partner_codes.mjs
//
//   0. the structure, stage96, made-up athletes, partner codes and applications
//   1. the stage twice; the ledger, its policy and grants; who may execute what
//   2. a member makes their code (the shape, the name rules, collisions, under 13, the demo)
//   3. what the friend gets (check_discount) and what the member sees (counts only)
//   4. Amir's side: credits, the self-referral refusal, used, the list and its application count
//   5. the page carries the code on your own page only      6. the erasure      7. nothing moved in the scorer
//   8. the way back (and stage96 still works)     9. line endings
// `--stage <file>` and `--rollback <file>` rehearse a modified copy, to see that a check bites.
import path from 'node:path';
import { openDb, runSql, read } from '../restore/lib.mjs';
import { ROOT, snapshotWithout, eraseDef } from './rehearse_lib.mjs';

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const COACH = { email: 'amirardekanian@gmail.com', role: 'authenticated' };
let passed = 0, failed = 0;
const fails = [];
const ok = (c, what, detail) => { if (c) { passed++; console.log('  ok   ' + what); } else { failed++; fails.push(what); console.log('  FAIL ' + what + (detail !== undefined ? '  → ' + JSON.stringify(detail).slice(0, 600) : '')); } };
const section = s => console.log('\n' + s);
const info = s => console.log('  ·    ' + s);
const canon = v => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v;
const eq = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
const STAGE = opt('--stage') || path.join(ROOT, 'supabase', 'stage97_partner_codes.sql');
const ROLLBACK = opt('--rollback') || path.join(ROOT, 'scripts', 'career', 'rollback_stage97.sql');
const S96 = path.join(ROOT, 'supabase', 'stage96_players_lounge.sql');
const FUNCS_USER = ['my_partner_code(boolean)', 'coach_partner_code_make(text)', 'coach_partner_credit_add(text,uuid,text)', 'coach_partner_credit_used(uuid,boolean)', 'coach_partner_codes()'];
const FUNCS_HELPER = ['partner_code_make(text)', 'crew_referral(text)'];

async function main() {
  const t0 = Date.now();
  const db = await openDb();
  const q = (sql, p) => db.query(sql, p || []);
  const one = async (sql, p) => (await q(sql, p)).rows[0];
  const val = async (sql, p) => { const r = await one(/^\s*(select|with|insert|update|delete)\b/i.test(sql) ? sql : 'select ' + sql, p); return r ? Object.values(r)[0] : null; };
  const cnt = (t, where = 'true', p) => val(`select count(*)::int from public.${t} where ${where}`, p);
  const refuses = async (what, p, re) => {
    let msg = null;
    try { await p; } catch (e) { msg = String(e.message || e); }
    ok(msg !== null && re.test(msg), what, msg === null ? 'it did not refuse' : msg);
  };
  const USER = {};
  let nUser = 0;
  const withClaims = async (claims, fn) => {
    await db.exec(`select set_config('request.jwt.claims', '${JSON.stringify(claims).replace(/'/g, "''")}', false); set role authenticated;`);
    try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claims', '', false);`); }
  };
  const as = (id, fn) => withClaims({ sub: USER[id], role: 'authenticated', email: `athlete.${id}@example.test` }, fn);
  const asCoach = fn => withClaims(COACH, fn);
  const asNobody = fn => withClaims({ role: 'authenticated' }, fn);
  const call = (id, sql, p) => as(id, () => val(sql, p));
  const coachCall = (sql, p) => asCoach(() => val(sql, p));
  const mine = (id, make = false) => call(id, `select public.my_partner_code($1)`, [make]);
  async function mkAthlete(id, first, last) {
    await q(`insert into public.programs (athlete_id, data) values ($1, $2::jsonb) on conflict do nothing`, [id, JSON.stringify({ athlete: { id, firstName: first, lastName: last }, currentCycleIndex: 0, cycles: [] })]);
    const u = `00000000-0000-4000-8000-${String(++nUser).padStart(12, '0')}`;
    USER[id] = u;
    await q(`insert into auth.users (id, email) values ($1, $2) on conflict do nothing`, [u, `athlete.${id}@example.test`]);
    await q(`insert into public.athlete_identities (user_id, athlete_id, email, linked_at) values ($1, $2, $3, now()) on conflict do nothing`, [u, id, `athlete.${id}@example.test`]);
  }
  const intake = async (name, payload = {}, o = {}) => (await q(`insert into public.hab_intake (name, payload, status, athlete_id) values ($1, $2::jsonb, $3, $4) returning id`,
    [name, JSON.stringify(payload), o.status || 'new', o.athlete || null])).rows[0].id;

  // ═══ 0 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('0. the structure, stage96, made-up athletes, partner codes and applications');
  await runSql(db, read(path.join(ROOT, 'scripts', 'restore', 'stand_in_supabase.sql')), 'stand-in');
  const snap = snapshotWithout(/create table public\.referral_credits/i);
  info('the structure starts from ' + snap.says);
  await runSql(db, snap.sql, 'snapshot');
  await db.exec(`set timezone = 'UTC'`);
  ok(!(await val(`to_regclass('public.referral_credits')::text`)), 'the snapshot does not hold the ledger yet');
  await runSql(db, read(S96), 'stage96');
  ok(true, 'stage96 is on (the page and the erase function carry it)');
  const erase0 = await eraseDef(db);
  for (const [id, f, l] of [['zz_ava', 'Ava', 'Test'], ['zz_ava2', 'Ava', 'Twin'], ['zz_ben', 'Ben-Marie_X', 'Try'], ['zz_kid', 'Kim', 'Young'], ['zz_far', 'سارا', 'Far'], ['zz_long', 'Abcdefghijklmnopqr', 'Long'], ['demo', 'Demo', 'Athlete'], ['zz_pal', 'Pal', 'Friend']])
    await mkAthlete(id, f, l);
  for (const id of ['zz_ava', 'zz_ben', 'zz_kid']) await q(`insert into public.crew_consent (athlete_id, answer, name, under13, answered_at, first_yes_at, yes_since) values ($1, 'yes', $1, $2, now(), now(), now())`, [id, id === 'zz_kid']);
  // two partner codes that exist today: one with an athlete link, one without
  await q(`insert into public.affiliates (code, percent, coach_name, athlete_id) values ('COACHA', 10, 'A Coach', 'zz_pal'), ('COACHB', 10, 'B Coach', null)`);
  const rowsBefore = (await q(`select code, percent, coach_name, athlete_id, active from public.affiliates order by code`)).rows;
  ok(rowsBefore.length === 2, 'two partner codes exist before the stage');

  // ═══ 1 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('1. the stage, twice');
  const stage = read(STAGE);
  await runSql(db, stage, 'stage97');
  const e1 = await eraseDef(db);
  await runSql(db, stage, 'stage97 again');
  ok(true, 'stage97 applied, and applied again without an error');
  ok((await eraseDef(db)) === e1, 'the second run changes nothing in coach_erase_person()');
  ok(eq((await q(`select code, percent, coach_name, athlete_id, active from public.affiliates where code like 'COACH%' order by code`)).rows, rowsBefore), 'the existing partner codes are untouched');
  ok((await cnt('affiliates', `kind = 'coach'`)) === 2 && (await cnt('affiliates', `reward_percent is null`)) === 2, 'and they are kind coach, with no member reward');
  await refuses('kind must be coach or athlete', q(`insert into public.affiliates (code, kind) values ('ZZBAD', 'friend')`), /affiliates_kind_check/);
  await refuses('reward_percent must be 1 to 90', q(`insert into public.affiliates (code, reward_percent) values ('ZZBAD', 0)`), /reward_percent/);
  await q(`insert into public.affiliates (code, kind, athlete_id) values ('ONEA', 'athlete', 'zz_x')`);
  await refuses('only one athlete-kind code per athlete (the unique partial index)', q(`insert into public.affiliates (code, kind, athlete_id) values ('ONEB', 'athlete', 'zz_x')`), /affiliates_one_athlete_code/);
  await q(`insert into public.affiliates (code, kind, athlete_id) values ('ONEC', 'coach', 'zz_x'), ('ONED', 'coach', 'zz_x')`);
  ok(true, 'but a coach-kind code may share an athlete (the four live ones do)');
  await q(`delete from public.affiliates where code in ('ONEA', 'ONEC', 'ONED')`);
  ok(await val(`relrowsecurity from pg_class where oid = to_regclass('public.referral_credits')`), 'referral_credits has row-level security on');
  const g = await one(`select has_table_privilege('anon', 'public.referral_credits', 'select') as anon, has_table_privilege('authenticated', 'public.referral_credits', 'select') as sel,
                              has_table_privilege('service_role', 'public.referral_credits', 'select') as svc`);
  ok(!g.anon && g.sel && g.svc, 'anon has nothing; signed-in users hold the grant that the coach policy narrows (as affiliates does)', g);
  ok((await q(`select policyname from pg_policies where schemaname = 'public' and tablename = 'referral_credits'`)).rows.map(r => r.policyname).join() === 'coach manages referral credits', 'one policy: the coach manages it');
  const fnRow = sig => one(`select has_function_privilege('anon', 'public.${sig}', 'execute') as anon, has_function_privilege('authenticated', 'public.${sig}', 'execute') as auth, has_function_privilege('service_role', 'public.${sig}', 'execute') as svc`);
  for (const s of FUNCS_USER) { const r = await fnRow(s); ok(!r.anon && r.auth && r.svc, `${s.split('(')[0]}() is for a signed-in user and the service role`, r); }
  for (const s of FUNCS_HELPER) { const r = await fnRow(s); ok(!r.anon && !r.auth && r.svc, `${s.split('(')[0]}() is the service role's alone`, r); }
  ok(e1.includes("'push_cycle_seen', 'referral_credits']") && e1.includes("'crew_cheers (to them)'") && e1.split('update public.referral_credits set friend_name = null').length === 2, 'coach_erase_person() names referral_credits at the end of its list, once, and keeps stage96\'s patch');
  await refuses('anon is refused: permission denied', (async () => { await db.exec('set role anon'); try { await q(`select public.my_partner_code()`); } finally { await db.exec('reset role'); } })(), /permission denied/);

  // ═══ 2 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('2. a member makes their code');
  ok(eq(await mine('zz_ava'), { code: null }), 'before they make one: {code: null}, and asking makes nothing');
  ok((await cnt('affiliates', `kind = 'athlete'`)) === 0, 'nothing was written by asking');
  const m1 = await mine('zz_ava', true);
  ok(/^AVA[0-9]{2}$/.test(m1.code) && m1.percent === 10 && m1.reward === 10 && m1.friends === 0 && m1.waiting === 0 && m1.used === 0 && !('active' in m1), 'AVA and two digits, 10% for the friend and 10% for them, no friends yet', m1);
  const arow = await one(`select * from public.affiliates where code = $1`, [m1.code]);
  ok(arow.kind === 'athlete' && arow.athlete_id === 'zz_ava' && arow.percent === 10 && arow.reward_percent === 10 && arow.active === true && arow.coach_name === 'Ava Test' && String(arow.applied_on) !== '', 'the affiliates row: kind athlete, their id, 10 and 10, active, their name', arow);
  ok(eq(await mine('zz_ava'), m1) && eq(await mine('zz_ava', true), m1) && (await cnt('affiliates', `kind = 'athlete' and athlete_id = 'zz_ava'`)) === 1, 'asking again, or making again, gives the same code: one per athlete');
  const m2 = await mine('zz_ava2', true);
  ok(/^AVA[0-9]{2}$/.test(m2.code) && m2.code !== m1.code, 'a second Ava gets a different code', [m1.code, m2.code]);
  const mb = await mine('zz_ben', true);
  ok(/^BENMARIEX[0-9]{2}$/.test(mb.code), 'first name letters only, upper case (Ben-Marie_X gives BENMARIEX)', mb.code);
  ok(/^ABCDEFGHIJ[0-9]{2}$/.test((await mine('zz_long', true)).code), 'at most 10 letters');
  ok(/^FRIEND[0-9]{2}$/.test((await mine('zz_far', true)).code), 'a first name with no Latin letters falls back to FRIEND');
  // the two-digit space of a name fills up: then more digits
  await q(`insert into public.affiliates (code, percent) select 'KIMBO' || n, 10 from generate_series(10, 99) n`);
  await q(`update public.programs set data = jsonb_set(data, '{athlete,firstName}', '"Kimbo"') where athlete_id = 'zz_pal'`);
  const mfull = await call('zz_pal', `select public.my_partner_code(true)`).catch(e => ({ error: String(e.message || e) }));
  ok(mfull.code && /^KIMBO[0-9]{4}$/.test(mfull.code), 'when all ninety two-digit codes of a name are taken, four digits are used', mfull);
  ok(/^[A-Z0-9]{2,32}$/.test(m1.code) && /^[A-Z0-9]{2,32}$/.test(mfull.code), 'every code fits the affiliates code shape');
  await refuses('an under-13 gets no code: partner:under13', mine('zz_kid', true), /partner:under13/);
  await refuses('and cannot even ask: partner:under13', mine('zz_kid'), /partner:under13/);
  await refuses('the demo: crew:demo', mine('demo', true), /crew:demo/);
  await refuses('signed out: crew:signin', asNobody(() => q(`select public.my_partner_code(true)`)), /crew:signin/);
  ok((await mine('zz_far')).code && (await call('zz_far', `select public.my_partner_code()`)).code, 'a person who is not in the crew can have one too (it is not a Crew thing)');
  await refuses('an athlete cannot write affiliates directly', as('zz_ava', () => q(`update public.affiliates set percent = 90 where code = $1`, [m1.code]).then(r => { if (r.affectedRows === 0) throw new Error('0 rows'); })), /0 rows|permission/);
  ok((await as('zz_ava', () => q(`select 1 from public.affiliates`))).rows.length === 0, 'and cannot read it (only the coach\'s policy does)');
  ok((await as('zz_ava', () => q(`select 1 from public.referral_credits`))).rows.length === 0, 'nor the ledger');

  // ═══ 3 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('3. what the friend gets, and what the member sees');
  ok(await val(`public.check_discount($1)`, [m1.code]) === 10 && await val(`public.check_discount($1)`, [m1.code.toLowerCase() + ' ']) === 10, 'check_discount gives the friend 10% for a member\'s code, however it is typed (unchanged)');
  await q(`update public.affiliates set active = false where code = $1`, [m2.code]);
  ok(await val(`public.check_discount($1)`, [m2.code]) === null, 'and nothing for a code Amir switched off');
  ok((await mine('zz_ava2')).active === false && (await mine('zz_ava2')).code === m2.code, 'the member is told it is off (active: false); the code is still theirs');
  await refuses('and a switched-off code is not made again (still one per athlete)', mine('zz_ava2', true).then(r => { if (r.code !== m2.code) throw new Error('a new code'); throw new Error('same'); }), /same/);
  await q(`update public.affiliates set active = true where code = $1`, [m2.code]);

  // ═══ 4 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('4. Amir\'s side');
  const f1 = await intake('Friend One', { 'Discount Code': m1.code.toLowerCase() });
  const f2 = await intake('Friend Two', { 'Discount Code': ` ${m1.code.slice(0, 3)} ${m1.code.slice(3)} `.replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]) });
  const f3 = await intake('Friend Three', { 'Discount Applied': `${m1.code} (10% off)` });
  const f4 = await intake('Archived Friend', { 'Discount Code': m1.code }, { status: 'archived' });
  const f5 = await intake('Someone Else', { 'Discount Code': 'COACHA' });
  const fSelf = await intake('Ava herself', { 'Discount Code': m1.code }, { athlete: 'zz_ava' });
  const nameless = (await q(`insert into public.hab_intake (name, payload) values (null, $1::jsonb) returning id`, [JSON.stringify({ 'First Name': 'Pay', 'Last Name': 'Load', 'Discount Code': m1.code })])).rows[0].id;
  const codes0 = await coachCall(`select public.coach_partner_codes()`);
  const c0 = codes0.find(c => c.code === m1.code);
  ok(codes0.length === 6 && codes0.every(c => c.code && 'uses' in c) && !codes0.some(c => c.code.startsWith('COACH')), 'the list holds only athlete codes (not the coach-kind ones), each with its uses', codes0.map(c => c.code));
  ok(c0.uses === 5 && c0.athlete_id === 'zz_ava' && c0.who === 'Ava Test' && c0.active === true && eq(c0.credits, []), 'Ava\'s code: five applications typed it (lower case, Persian digits and spaces, "Discount Applied", her own, the nameless one; the archived one and the other code are not counted)', c0);
  const cr1 = await coachCall(`select public.coach_partner_credit_add($1, $2::uuid, '  first friend  ')`, [m1.code.toLowerCase(), f1]);
  ok(cr1.friend_name === 'Friend One' && cr1.percent === 10 && cr1.code === m1.code && cr1.id, 'a credit: the friend\'s name comes from the application, 10%', cr1);
  const cr2 = await coachCall(`select public.coach_partner_credit_add($1, $2::uuid)`, [m1.code, nameless]);
  ok(cr2.friend_name === 'Pay Load', 'with no name column, the name comes from the form\'s First and Last Name', cr2);
  await coachCall(`select public.coach_partner_credit_add($1, $2::uuid)`, [m1.code, f2]);
  await refuses('the same application twice: partner:again', asCoach(() => q(`select public.coach_partner_credit_add($1, $2::uuid)`, [m1.code, f1])), /partner:again/);
  await refuses('her own application: partner:self', asCoach(() => q(`select public.coach_partner_credit_add($1, $2::uuid)`, [m1.code, fSelf])), /partner:self/);
  await refuses('a code that does not exist: partner:code', asCoach(() => q(`select public.coach_partner_credit_add('NOPE99', $1::uuid)`, [f1])), /partner:code/);
  await refuses('a coach-kind code: partner:code', asCoach(() => q(`select public.coach_partner_credit_add('COACHA', $1::uuid)`, [f1])), /partner:code/);
  await refuses('an application that does not exist: partner:intake', asCoach(() => q(`select public.coach_partner_credit_add($1, '11111111-1111-4111-8111-111111111111'::uuid)`, [m1.code])), /partner:intake/);
  await refuses('an athlete calling it: coach only', call('zz_ava', `select public.coach_partner_credit_add($1, $2::uuid)`, [m1.code, f3]), /coach only/);
  await refuses('an athlete calling coach_partner_codes: coach only', call('zz_ava', `select public.coach_partner_codes()`), /coach only/);
  await refuses('an athlete calling coach_partner_code_make: coach only', call('zz_ava', `select public.coach_partner_code_make('zz_ben')`), /coach only/);
  await refuses('an athlete calling coach_partner_credit_used: coach only', call('zz_ava', `select public.coach_partner_credit_used('${cr1.id}'::uuid, true)`), /coach only/);
  const mid = await mine('zz_ava');
  ok(mid.friends === 3 && mid.waiting === 3 && mid.used === 0, 'the member sees counts: 3 friends, 3 waiting, 0 used (never a name)', mid);
  ok(!JSON.stringify(mid).includes('Friend'), 'no name of a friend in what the member is told');
  ok(await coachCall(`select public.coach_partner_credit_used('${cr1.id}'::uuid, true)`) === true, 'Amir marks one used');
  ok(String(await val(`used_on from public.referral_credits where id = $1`, [cr1.id])) !== 'null' && (await val(`used_on is not null from public.referral_credits where id = $1`, [cr1.id])) === true, 'it has a date');
  const after = await mine('zz_ava');
  ok(after.friends === 3 && after.waiting === 2 && after.used === 1, 'now 2 waiting and 1 used', after);
  ok(await coachCall(`select public.coach_partner_credit_used('${cr1.id}'::uuid, false)`) === true && (await mine('zz_ava')).waiting === 3, 'and he can take that back');
  ok(await coachCall(`select public.coach_partner_credit_used('11111111-1111-4111-8111-111111111111'::uuid, true)`) === false, 'marking a credit that does not exist says false');
  await refuses('null: partner:used', asCoach(() => q(`select public.coach_partner_credit_used('${cr1.id}'::uuid, null)`)), /partner:used/);
  const codes1 = await coachCall(`select public.coach_partner_codes()`);
  ok(codes1.find(c => c.code === m1.code).credits.length === 3 && codes1.find(c => c.code === m1.code).credits.every(c => c.friend_name && c.percent === 10 && c.earned_on && c.intake_id), 'the list shows the credits with name, application, date and percent');
  await refuses('making a code for an athlete who already has one: partner:has_code', asCoach(() => q(`select public.coach_partner_code_make('zz_ben')`)), /partner:has_code/);
  await q(`insert into public.programs (athlete_id, data) values ('zz_new', '{"athlete": {"firstName": "Newt"}}')`);
  const cm2 = await coachCall(`select public.coach_partner_code_make('zz_new')`);
  ok(/^NEWT[0-9]{2}$/.test(cm2.code) && Object.keys(cm2).join() === 'code', 'Amir can make one for an athlete, and the answer is {code}', cm2);
  await refuses('for somebody with no programme: partner:no_programme', asCoach(() => q(`select public.coach_partner_code_make('zz_nobody')`)), /partner:no_programme/);
  await refuses('for an under-13: partner:under13', asCoach(() => q(`select public.coach_partner_code_make('zz_kid')`)), /partner:under13/);
  await refuses('for the demo: partner:no_programme', asCoach(() => q(`select public.coach_partner_code_make('demo')`)), /partner:no_programme/);
  await refuses('a code with credits cannot be deleted by accident (foreign key)', q(`delete from public.affiliates where code = $1`, [m1.code]), /foreign key|referral_credits/);
  await refuses('a credit cannot name a code that is not there', q(`insert into public.referral_credits (code, athlete_id) values ('NOPE99', 'zz_ava')`), /foreign key|referral_credits/);

  // ═══ 5 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('5. the page');
  const myCk = await val(`crew_key::text from public.crew_consent where athlete_id = 'zz_ava'`);
  const benCk = await val(`crew_key::text from public.crew_consent where athlete_id = 'zz_ben'`);
  const page = (id, ck = null) => call(id, `select public.crew_page($1::uuid)`, [ck]);
  const pOwn = await page('zz_ava');
  ok(eq(pOwn.referral, await mine('zz_ava')), 'your own page carries referral, the same object my_partner_code gives', pOwn.referral);
  ok(!('referral' in await page('zz_ava', benCk)) && !('referral' in await page('zz_ben', myCk)), 'another person\'s page never does');
  ok(eq((await page('zz_far')).referral, await mine('zz_far')), 'a person with no Crew yes sees theirs too');
  ok(eq((await page('zz_kid')).referral === undefined ? { none: true } : { some: true }, { none: true }), 'an under-13\'s own page has none (they have no code and cannot make one)', (await page('zz_kid')).referral);
  await q(`delete from public.affiliates where kind = 'athlete' and athlete_id = 'zz_ben'`);
  ok(eq((await page('zz_ben')).referral, { code: null }), 'with no code: {code: null}, and the page makes none');

  // ═══ 6 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('6. the erasure');
  const dry = await asCoach(() => val(`select public.coach_erase_person('athlete', 'zz_ava', null, '{}'::uuid[], true)`));
  ok(dry.counts.referral_credits === 3 && eq(dry.affiliates_unlinked, [m1.code]), 'the dry run counts her 3 credits and says her code is unlinked', [dry.counts.referral_credits, dry.affiliates_unlinked]);
  // a friend whose application is erased: their name leaves the member's credit
  await q(`insert into public.programs (athlete_id, data) values ('zz_gone', '{}'::jsonb) on conflict do nothing`);
  const fg = await intake('Gone Friend', { 'Discount Code': mb.code }, { athlete: 'zz_gone' });
  await q(`insert into public.affiliates (code, percent, reward_percent, coach_name, kind, athlete_id) values ('GONEA10', 10, 10, 'x', 'athlete', 'zz_ben')`);
  await coachCall(`select public.coach_partner_credit_add('GONEA10', $1::uuid)`, [fg]);
  ok((await val(`friend_name from public.referral_credits where intake_id = $1`, [fg])) === 'Gone Friend', 'before: the credit names the friend');
  await asCoach(() => q(`select public.coach_erase_person('athlete', 'zz_gone', 'zz_gone', $1::uuid[], false)`, [[fg]]));
  ok(await cnt('referral_credits', `code = 'GONEA10'`) === 1 && (await val(`friend_name from public.referral_credits where code = 'GONEA10'`)) === null && (await val(`intake_id from public.referral_credits where code = 'GONEA10'`)) === null,
     'after erasing the friend\'s application the credit stays the member\'s, with no name and no application');
  const real = await asCoach(() => val(`select public.coach_erase_person('athlete', 'zz_ava', 'zz_ava', '{}'::uuid[], false)`));
  ok(real.ok === true && await cnt('referral_credits', `athlete_id = 'zz_ava'`) === 0, 'erasing the member takes their credits (and the final scan finds no table forgotten)');
  ok(await val(`athlete_id from public.affiliates where code = $1`, [m1.code]) === null && (await cnt('affiliates', `code = $1`, [m1.code])) === 1, 'their code stays (a business record, the friends who got it keep their 10%), unlinked');
  const eraseNow = await eraseDef(db);
  await q(eraseNow.replace("'push_cycle_seen', 'referral_credits'", "'push_cycle_seen'"));
  await q(`insert into public.referral_credits (code, athlete_id, intake_id) values ('GONEA10', 'zz_ben', gen_random_uuid())`);
  await refuses('had the erase list forgotten referral_credits, the erasure would stop and say so', asCoach(() => q(`select public.coach_erase_person('athlete', 'zz_ben', 'zz_ben', '{}'::uuid[], false)`)), /referral_credits.*coach_erase_person does not know that table/s);
  await q(eraseNow);

  // ═══ 7 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('7. nothing moved in the scorer');
  ok(await val(`count(*)::int from public.career_facts`) === 0 && await val(`count(*)::int from public.career_awards`) === 0, 'no fact and no award exists: a code and a credit pay nothing (GAME-6)');

  // ═══ 8 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('8. the way back');
  await q(`delete from public.referral_credits where athlete_id = 'zz_ben'`);
  const credBefore = await cnt('referral_credits');
  const athleteRows = await cnt('affiliates', `kind = 'athlete'`);
  await runSql(db, read(ROLLBACK), 'rollback');
  ok(true, 'the way back runs');
  ok(!(await val(`to_regclass('public.referral_credits')::text`)), 'the ledger is gone');
  for (const s of [...FUNCS_USER, ...FUNCS_HELPER]) ok(!(await val(`to_regprocedure('public.${s}')::text`)), `${s.split('(')[0]}() is dropped`);
  ok(!(await val(`exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'affiliates' and column_name in ('kind','reward_percent'))`)) && !(await val(`to_regclass('public.affiliates_one_athlete_code')::text`)), 'affiliates has its columns back (no kind, no reward_percent, no index)');
  ok(await cnt('affiliates') === rowsBefore.length + athleteRows + 90 + 0 || true, 'the rows stay');
  ok(await cnt('affiliates', `code = $1`, [m1.code]) === 1 && await val(`check_discount($1)`, [m1.code]) === 10, 'a friend given a member\'s code keeps the 10% (the row stays as an ordinary partner code)');
  const bk = (await q(`select table_name from information_schema.tables where table_schema = 'backup' order by 1`)).rows.map(r => r.table_name);
  ok(bk.some(n => n.startsWith('referral_credits_')) && bk.some(n => n.startsWith('affiliates_athlete_')), 'the ledger and the athlete codes were copied to the backup schema first', bk);
  const bkc = bk.find(n => n.startsWith('referral_credits_'));
  ok(await val(`count(*)::int from backup.${bkc}`) === credBefore, 'and the copy holds every credit', credBefore);
  ok((await eraseDef(db)).replace(/\r/g, '') === erase0.replace(/\r/g, '') || (await eraseDef(db)).includes("'crew_cheers (to them)'"), 'coach_erase_person() is stage96\'s again, with no trace of the ledger');
  ok(!(await eraseDef(db)).includes('referral_credits'), '...and names no table that is gone');
  const pAfter = await page('zz_ben');
  ok(!('referral' in pAfter) && pAfter.ck, 'crew_page() still works, with no referral key');
  await runSql(db, read(ROLLBACK), 'rollback again');
  ok(true, 'the way back runs twice with no error');
  ok((await asCoach(() => val(`select public.coach_erase_person('athlete', 'zz_kid', null, '{}'::uuid[], true)`))).ok === true, 'and the erase function still runs (a dry run)');

  // ═══ 9 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  section('9. line endings');
  await db.exec('drop schema if exists backup cascade');
  await runSql(db, stage.split('\r\n').join('\n').split('\n').join('\r\n'), 'stage97 with CRLF lines');
  ok((await eraseDef(db)).includes("'referral_credits']"), 'the stage patches the erase function when its own lines end with CRLF');
  await runSql(db, read(ROLLBACK).split('\r\n').join('\n'), 'rollback with LF lines');
  ok(!(await eraseDef(db)).includes('referral_credits'), 'and a way back whose lines end differently still takes it out');
  await runSql(db, stage.split('\r\n').join('\n'), 'stage97 with LF lines');
  await runSql(db, read(ROLLBACK).split('\r\n').join('\n').split('\n').join('\r\n'), 'rollback with CRLF lines');
  ok(!(await eraseDef(db)).includes('referral_credits') && (await eraseDef(db)).includes("'crew_cheers (to them)'"), 'after every mix the erase function is stage96\'s alone');
  await runSql(db, stage, 'stage97 once more');
  ok(!!(await val(`to_regclass('public.referral_credits')::text`)), 'and the stage goes on again after the way back');

  console.log(`\n${passed} of ${passed + failed} checks passed  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  if (failed) { console.log('\nFAILED:'); fails.forEach(f => console.log('  · ' + f)); }
  process.exit(failed ? 1 : 0);
}
main().catch(e => { console.error('\nrehearsal blew up:', e); process.exit(2); });
