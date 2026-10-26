// coach-harness/fixtures.js — MADE-UP data only, shaped like the live tables (columns read from
// information_schema on 2026-10-10). Every id, name, email and number here is invented.
// buildSeed({ today, bigHistory, ... }) returns the object run.js puts on window.__HARNESS_SEED.
'use strict';

function pad(n) { return String(n).padStart(2, '0'); }
function dkey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function daysAgo(today, n) { const p = today.split('-'); const d = new Date(+p[0], +p[1] - 1, +p[2]); d.setDate(d.getDate() - n); return dkey(d); }
function iso(today, n, hh) { return daysAgo(today, n) + 'T' + (hh || '09') + ':00:00.000Z'; }

function habLog(today, offs) {
  const o = {}; offs.forEach(n => { o[daysAgo(today, n)] = { train: 1, water: 8, steps: 9000 }; }); return JSON.stringify(o);
}

function programme(firstName, extra) {
  return Object.assign({
    athlete: { id: firstName.toLowerCase() + '_test', firstName, lastName: 'Example', tier: 'coached' },
    currentCycleIndex: 0,
    cycles: [{ name: 'Cycle 2 — Made-Up Block', weeks: '4 weeks', art: 'iron', focuses: ['Strength base'] }],
    workouts: { days: [
      { id: 1, focusTag: 'Legs First (fixture)', blocks: [
        { icon: '🔥', title: 'Warm-Up', exercises: [
          { name: 'Prep Circuit', type: 'circuit', rx: { rounds: 2 }, items: [{ name: 'Cat-Cow', detail: '×6 Reps' }, { name: 'Glute Bridge', detail: '×10 Reps' }] } ] },
        { icon: '💪', title: 'Primary', exercises: [
          { name: 'Goblet Squat', exId: 'goblet-squat', type: 'standard', rx: { sets: 4, reps: 10, rpe: 7, tempo: '3-0-1-0', rest: 90 }, note: 'Fixture note: leave two in the tank.' },
          { name: 'Chest-Supported Dumbbell Row', type: 'standard', rx: { sets: 3, reps: 12, rpe: 8 } } ] },
        { icon: '⚙️', title: 'Accessory', exercises: [
          { name: 'Machine Leg Press', exId: 'machine-leg-press', type: 'standard', chips: [{ label: '3 Sets' }, { label: '×12 Reps' }, { label: 'RPE 7' }] } ] } ] },
      { id: 2, focusTag: 'Upper Push (fixture)', blocks: [
        { icon: '💪', title: 'Primary', exercises: [
          { name: 'Dumbbell Bench Press', type: 'standard', rx: { sets: 4, reps: 8, rpe: 8 } },
          { name: 'Lateral Bound', type: 'standard', rx: { sets: 3, reps: 6, side: true, rpe: 6 } } ] } ] },
      { id: 3, focusTag: 'Pull Day (fixture)', blocks: [
        { icon: '💪', title: 'Primary', exercises: [
          { name: 'Trap Bar Deadlift', type: 'standard', rx: { sets: 4, reps: 6, rpe: '7-8' } } ] } ] },
    ] },
  }, extra || {});
}

const D1_LOG = [
  'Day 1 — Legs First (fixture)', 'Status: Complete', 'Session RPE: 7/10', 'Duration: 55 min', '',
  'Exercise log:', '', '[Primary]',
  '• Goblet Squat (✓)', '    Set 1: 20 @7 ✓ ×10', '    Set 2: 20 @8 ✓ ×10', '    Set 3: 22 @8 ✓ ×9', '    Set 4: 22 @9 ✓ ×8',
  '• Chest-Supported Dumbbell Row (✓)', '    Set 1: 14 @8 ✓', '    Set 2: 14 @8 ✓', '    Set 3: 14 @8 ✓',
  '', '[Accessory]', '• Machine Leg Press (2/3 sets)', '    Set 1: 60 @7 ✓', '    Set 2: 60 @7 ✓', '    Set 3: skipped',
].join('\n');

function session(id, name, day, completed_on, extra) {
  return Object.assign({ athlete_id: id, athlete_name: name, day, completed_on, status: 'Complete', session_rpe: 7, duration_min: 50,
    readiness: { composite: 3.8, sleep: 4, energy: 4, soreness: 3, stress: 4, overall: 4 }, day_note: '', focus: '',
    summary: 'Day ' + day + ' — fixture\n\nExercise log:\n[Primary]\n• Goblet Squat (✓)\n    Set 1: 20 @7 ✓',
    updated_at: completed_on + 'T18:00:00.000Z', coach_status: 'read', log: null }, extra || {});
}

// ── Courtside (stage75), made up like everything here ──────────────────────────────────────────────────────────
// buildSeed({ court: true }) adds the cast below to the usual seed; { court: true, courtAwards: false } adds the same people with NO award, mark or
// fact (the "without" side of "Courtside never changes Needs you"). Awards are dated inside the page's WEEK (Monday 00:00 to the next Monday, the
// window courtWeek() asks for), by offsets from that Monday, so they land in the window whatever day the harness runs on (on a Monday, a later day of
// the week is still in the window). Times are 09:00 to 18:00 UTC so the coach's day is the same in any zone within a few hours of UTC.
function ymdAdd(day, n) { const p = day.split('-'); const d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function mondayOf(day) { const p = day.split('-'); const dow = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay(); return ymdAdd(day, -((dow + 6) % 7)); }
const CAST = [   // [id, first name, WhatsApp]: coached, with a login sent, a programme and a session three days ago (nobody here "needs" anything)
  ['gia_court', 'Gia', '+10000000021'], ['hal_court', 'Hal', '+10000000022'], ['ivy_court', 'Ivy', '+10000000023'], ['jon_court', 'Jon', '+10000000024'],
  ['kim_former', 'Kim', '+10000000025'],
];
function courtSeed(db, today, withAwards) {
  const mon = mondayOf(today), at = (k, hhmm) => ymdAdd(mon, k) + 'T' + hhmm + ':00.000Z', dy = k => ymdAdd(mon, k);
  CAST.forEach(([id, first, wa]) => {
    db.programs.push({ athlete_id: id, data: programme(first, { athlete: { id, firstName: first, lastName: 'Example', tier: 'coached' } }), updated_at: iso(today, 5), updated_by: 'pipeline@example.invalid' });
    db.athlete_identities.push({ user_id: 'u-' + id, athlete_id: id, email: 'athlete.' + id + '@amirardekani.com', linked_at: iso(today, 30), initial_password: null, password_set_at: iso(today, 30), sent_at: iso(today, 29) });
    db.session_history.push(session(id, first + ' Example', 1, daysAgo(today, 3)));
  });
  db.athlete_status.push({ athlete_id: 'kim_former', status: 'former', since: daysAgo(today, 40), note: null, updated_at: iso(today, 40) });
  // A WhatsApp number the coach typed (source 'coach': not a signup) for everyone Courtside can name, so the panel can offer WhatsApp ↗.
  ['ava_test', 'ben_test', 'eli_new'].concat(CAST.map(c => c[0])).forEach((id, i) => {
    const row = CAST.find(c => c[0] === id);
    db.hab_contacts.push({ athlete_id: id, email: null, whatsapp: row ? row[2] : '+1000000003' + i, source: 'coach', tier: 'coached', note: null, created_at: iso(today, 10), updated_at: iso(today, 10), display_name: null });
  });
  // (Cara keeps her own record, the signup she always was, with a WhatsApp number of its own.)
  // The catalogue rows the awards name (the body is what career_award_spec() reads: name, caption with {n}, the tiers' metal).
  const badge = (id, name, caption) => ({ kind: 'badge', id, body: { name, meaning: 'Fixture meaning.', caption, tiers: [{ metal: 'bronze' }, { metal: 'silver' }, { metal: 'emerald' }] } });
  const ach = (id, name, caption) => ({ kind: 'achievement', id, body: { name, meaning: 'Fixture meaning.', caption } });
  db.career_catalogue.push(
    badge('held_weeks', 'Hold Serve', '{n} weeks held in a row.'), badge('century', 'Century', '{n} sessions with Amir.'), badge('bests', 'Personal Bests', '{n} personal bests.'),
    badge('comebacks', 'Comebacks', '{n} comebacks.'), badge('daily_run', 'Daily Run', '{n} days in a row.'),
    ach('held', 'Held', 'Your first held week. Every session, on your days.'), ach('first_best', 'First Best', 'Your first personal best. Not the last.'),
    ach('first_cycle', 'First Cycle', 'A whole cycle, finished.'), ach('back', 'Back on Court', 'You came back.'), ach('double_up', 'Double Up', 'Two main lifts, up 10% each.'),
    ach('small_win', 'Small Win', 'A small one.'), ach('last_week', 'Last Week', 'It was last week.'));
  // The month's goal and a line "From Amir" for a few people (neutral: they change nothing on Needs you).
  const m1 = today.slice(0, 7) + '-01';
  db.career_goals.push(
    { athlete_id: 'ben_test', month: m1, line: 'Squat three times a week and log every set.', done_at: null, created_at: iso(today, 6), updated_at: iso(today, 6) },
    { athlete_id: 'eli_new', month: m1, line: 'Bench press 5 kg heavier by the end of the month.', done_at: iso(today, 1), created_at: iso(today, 6), updated_at: iso(today, 1) });
  db.career_notes.push(
    { athlete_id: 'ben_test', day: today, line: 'Trained through exam week. Proud of you.', award_id: null, created_at: iso(today, 0), read_at: null },
    { athlete_id: 'eli_new', day: today, line: 'That first best was earned.', award_id: null, created_at: iso(today, 0), read_at: iso(today, 0) });
  if (!withAwards) return;
  const aw = (athlete, kind, item, tier, size, k, hhmm, evidence, how) => ({ athlete_id: athlete, award_id: kind + ':' + item + (tier ? ':' + tier : ''), kind, item, tier: tier || null, day: dy(k),
    size, how: how || 'live', evidence: evidence || {}, created_at: at(k, hhmm) });
  db.career_awards.push(
    // the visible ones: 9 moments in 8 open groups (+ Cara's, already seen) so the cap of 5 matters
    aw('ben_test', 'badge', 'held_weeks', 3, 'legend', 1, '10:00', { n: 12 }),
    aw('gia_court', 'achievement', 'first_cycle', 0, 'milestone', 2, '15:00', { facts: [{ kind: 'cycle_finished', ref: 'c1' }] }),
    aw('ava_test', 'badge', 'century', 2, 'milestone', 2, '12:00', { n: 50 }),
    aw('ava_test', 'achievement', 'held', 0, 'highlight', 2, '12:30'),       // the same day as the century: ONE group, "and First full week held"
    aw('cara_free', 'achievement', 'back', 0, 'highlight', 2, '09:00'),      // already seen (a mark below)
    aw('jon_court', 'achievement', 'back', 0, 'highlight', 3, '17:00'),
    aw('hal_court', 'badge', 'bests', 1, 'highlight', 3, '16:00', { n: 5 }),
    aw('ivy_court', 'badge', 'comebacks', 1, 'highlight', 3, '15:00', { n: 3 }),
    aw('eli_new', 'achievement', 'first_best', 0, 'highlight', 3, '14:00', { facts: [{ kind: 'personal_best', ref: 'goblet-squat|1' }] }),
    aw('ben_test', 'achievement', 'double_up', 0, 'highlight', 3, '13:00'),  // Ben on ANOTHER day: a second group
    // the ones that must never show (each is filtered by one of stage75's rules)
    aw('eli_new', 'achievement', 'small_win', 0, 'win', 4, '10:00'),                              // too small
    aw('ava_test', 'badge', 'century', 1, 'milestone', 4, '11:00', { n: 25 }, 'baseline'),        // the go-day's back-pay, not minted live
    aw('demo', 'achievement', 'first_best', 0, 'highlight', 4, '12:00'),                          // not a client
    aw('amir_ardekani', 'achievement', 'held', 0, 'highlight', 4, '12:30'),                       // not a client
    aw('kim_former', 'achievement', 'first_best', 0, 'highlight', 4, '13:00'),                    // a former athlete
    aw('jon_court', 'badge', 'daily_run', 2, 'milestone', 4, '14:00', { n: 30 }),                 // a badge that is not one of the four numbers
    aw('gia_court', 'achievement', 'last_week', 0, 'highlight', -2, '12:00'));                    // last week's, outside the window
  db.career_facts.push(
    { athlete_id: 'gia_court', kind: 'cycle_finished', ref: 'c1', day: dy(2), value: { cycle: 1, done: 12, planned: 12 }, void_at: null },
    { athlete_id: 'eli_new', kind: 'personal_best', ref: 'goblet-squat|1', day: dy(3), value: { lift: 'Goblet Squat', kg: 24 }, void_at: null });
  db.courtside_marks.push({ athlete_id: 'cara_free', award_id: 'achievement:back', saw_at: at(2, '20:00'), sent_at: at(2, '20:00'), updated_at: at(2, '20:00') });
}

// ── The Bell (stage81), made up like everything here ─────────────────────────────────────────────────────────
// buildSeed({ crew: true }) turns the stub's stage81 functions on and seeds the Bell: coach_crew() answers with these posts (ago_min is how old a post
// is on the page's clock; the stub turns it into `at`) and these answers. Use a fixed time of day (10:00 UTC) so "3h", "Yesterday" and "Mon" are the
// same every day: from 10:00 on a Thursday, 20 hours back is Wednesday afternoon and 3 days back is Monday. A photo is made in the test (the harness
// has no JPEG library): window.__DB.crew_bell.photos[<post id>] = { mime, w, h, b64 }.
const BELL_IDS = ['b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000004'];
// The replies under those posts (stage92), as crew_replies holds them: the stub's get_bell() shows a reply as the crew sees it (from Amir or a crew member), so
// Kim's, a former athlete's, is in the table and never reaches the page. Ben's reply holds markup and a quote on purpose: the page must show them as text.
const REPLY_IDS = ['e0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000004'];
function crewSeed(db) {
  db.crew_bell = {
    rings_week: 4, photos: {},
    replies: [
      { id: REPLY_IDS[0], post_id: BELL_IDS[0], athlete_id: 'ava_test', amir: false, body: 'Thanks coach. Rest day it is.', ago_min: 120 },
      { id: REPLY_IDS[1], post_id: BELL_IDS[0], athlete_id: 'ben_test', amir: false, body: '<b>Legs</b> say "no" today', ago_min: 60 },
      { id: REPLY_IDS[2], post_id: BELL_IDS[1], athlete_id: '__coach__', amir: true, body: 'Well done, Ava.', ago_min: 600 },
      { id: REPLY_IDS[3], post_id: BELL_IDS[1], athlete_id: 'eli_new', amir: false, body: 'A reply from somebody who is not in the crew.', ago_min: 500 },
    ],
    posts: [
      { id: BELL_IDS[0], athlete_id: '__coach__', amir: true, who: 'Amir', seen: true, kind: 'post', body: 'Great week, crew. Rest up and eat well.', photo: false, ago_min: 180, kudos: 2 },
      { id: BELL_IDS[1], athlete_id: 'ava_test', amir: false, who: 'Ava E.', seen: true, kind: 'post', body: 'First 50 sessions done!', photo: true, ago_min: 1200, kudos: 3 },
      { id: BELL_IDS[2], athlete_id: 'ben_test', amir: false, who: 'Ben E.', seen: true, kind: 'session', body: '', photo: true, ago_min: 4320, kudos: 0 },
      // an author the crew can no longer see (a former athlete): the page shows what the server says, dimmed, with Remove still there
      { id: BELL_IDS[3], athlete_id: 'gone_example', amir: false, who: 'Gone E.', seen: false, kind: 'post', body: 'Legs are cooked today.', photo: false, ago_min: 2900, kudos: 0 },
    ],
    people: [
      { athlete_id: 'ava_test', answer: 'yes', under13: false, answered_at: '2026-11-01T09:00:00.000Z', kinds_off: [] },
      { athlete_id: 'ben_test', answer: 'yes', under13: false, answered_at: '2026-11-02T09:00:00.000Z', kinds_off: ['best', 'level'] },
      { athlete_id: 'eli_new', answer: 'no', under13: false, answered_at: '2026-11-03T09:00:00.000Z', kinds_off: [] },
      { athlete_id: 'kim_former', answer: 'yes', under13: false, answered_at: '2026-11-04T09:00:00.000Z', kinds_off: [] },   // a former athlete: not in the list
    ],
  };
}

// ── The Monthly Open (stage85), made up like everything here ─────────────────────────────────────────────────────
// buildSeed({ open: true }) turns the stub's stage85 functions on (and stage81's, which they need: the crew is the Bell's yes answers, minus the former
// athlete) and seeds TWO CLOSED challenges and nothing live, so the page starts on the empty state with a Past list: coach_open() answers
// window.__DB.crew_open_state. The live challenge is started in the test, through the panel. Dates are fixed (the Bell's clock is 2026-11-12).
const OPEN_IDS = ['c0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-0000000000a2'];
function openSeed(db, today) {
  // Kim, whose "yes" the Bell's answers hold, is a former athlete: crew_members() leaves her out (courtSeed() says the same when it runs too).
  if (!db.athlete_status.some(r => r.athlete_id === 'kim_former')) db.athlete_status.push({ athlete_id: 'kim_former', status: 'former', since: '2026-09-01', note: null, updated_at: '2026-09-01T09:00:00.000Z' });
  // Three rows the result picker must leave out although each has a programme on the server: a former athlete (Kim), the public demo and the coach's own identity.
  [['kim_former', 'Kim'], ['demo', 'Demo'], ['amir_ardekani', 'Coach']].forEach(([id, first]) => {
    if (!db.programs.some(r => r.athlete_id === id)) db.programs.push({ athlete_id: id, data: programme(first, { athlete: { id, firstName: first, lastName: 'Example', tier: 'coached' } }), updated_at: iso(today, 5), updated_by: 'pipeline@example.invalid' });
  });
  db.crew_open_state = {
    challenges: [
      { id: OPEN_IDS[0], title: 'Plank Hold', how: 'Forearms on the floor, body in one line. Film it side-on.', unit: 'seconds', better: 'high', opened_on: '2026-08-03', closed_at: '2026-09-02T09:00:00.000Z', created_at: '2026-08-03T09:00:00.000Z' },
      { id: OPEN_IDS[1], title: 'One Kilometre Row', how: 'On the rower, damper at 5. Film the screen at the end.', unit: 'seconds', better: 'low', opened_on: '2026-09-02', closed_at: '2026-10-05T09:00:00.000Z', created_at: '2026-09-02T09:00:00.000Z' },
    ],
    results: [
      { open_id: OPEN_IDS[0], athlete_id: 'ava_test', value: 95, day: '2026-08-20' }, { open_id: OPEN_IDS[0], athlete_id: 'ben_test', value: 80, day: '2026-08-22' },
      { open_id: OPEN_IDS[1], athlete_id: 'ava_test', value: 241.5, day: '2026-09-20' },
    ],
    rings: [],
  };
}

// ── The Players' Lounge (stage96 + stage97, CONTRACT.md), made up like everything here ───────────────────────────
// buildSeed({ lounge: true }) turns the stub's stage96 functions on (faces, cheers, the table athlete_profile) and seeds them; it needs the Bell's answers
// (the crew is the yes answers), so it turns stage81 on too. buildSeed({ partner: true }) turns stage97 on (the athletes' partner codes). window.__DB.lounge
// holds the faces and the cheers; athlete_profile and referral_credits are tables. Nothing here is a real person or a real photo.
// A one-pixel JPEG: what coach_crew_faces() returns in b64 (the server holds 64 to 512 px; the page only draws it small).
const FACE_B64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
function loungeSeed(db, today) {
  db.lounge = {
    seq: 100,
    // Ava is in the crew and has a face. Eli said no: a no takes the face away, so the stub lists none for him even though a row is kept here.
    faces: [{ athlete_id: 'ava_test', fv: 1729771234, b64: FACE_B64 }, { athlete_id: 'eli_new', fv: 1729771300, b64: FACE_B64 }],
    cheers: [
      { id: 1, from_athlete: 'ben_test', from_who: 'Ben E.', to_athlete: 'ava_test', to_who: 'Ava E.', word: 'that sled push looked heavy', day: daysAgo(today, 1) },
      { id: 2, from_athlete: 'ava_test', from_who: 'Ava E.', to_athlete: 'ben_test', to_who: 'Ben E.', word: '<b>Nice</b> one "legend"', day: daysAgo(today, 2) },   // markup and a quote on purpose: shown as text
      { id: 3, from_athlete: 'ben_test', from_who: 'Ben E.', to_athlete: 'ava_test', to_who: 'Ava E.', word: null, day: daysAgo(today, 3) },
      { id: 4, from_athlete: '__coach__', from_who: 'Coach', to_athlete: 'ben_test', to_who: 'Ben E.', word: null, day: today },   // Amir already cheered Ben today
    ],
  };
  // "Your game": the athlete_profile rows the coach reads. Ava has most of it, Ben only his hand, Eli a row with nothing in it, Cara none.
  db.athlete_profile = [
    { athlete_id: 'ava_test', sports: ['padel', 'tennis'], hand: 'right', backhand: 'two', side: 'left', plays_at: null, club: 'Aspire Padel', training_for: ['strength'], working_on: 'my second serve', ig: 'ava.plays', updated_at: iso(today, 4) },
    { athlete_id: 'ben_test', sports: [], hand: 'left', backhand: null, side: null, plays_at: null, club: null, training_for: [], working_on: null, ig: null, updated_at: iso(today, 4) },
    { athlete_id: 'eli_new', sports: [], hand: null, backhand: null, side: null, plays_at: null, club: null, training_for: [], working_on: null, ig: null, updated_at: iso(today, 4) },
  ];
  // Jon reads Farsi: the notification language the programme holds (SCHEMA.md: athlete.lang), so his WhatsApp draft is the Farsi one.
  const jon = db.programs.find(p => p.athlete_id === 'jon_court');
  if (jon) jon.data.athlete.lang = 'fa';
}
function partnerSeed(db, today) {
  const row = (code, id, name) => ({ code, percent: 10, reward_percent: 10, kind: 'athlete', coach_name: name, coach_name_fa: null, instagram: null, whatsapp: null, email: null, athlete_id: id,
    applied_on: daysAgo(today, 20), active: true, retired_on: null, notes: null, created_at: iso(today, 20) });
  db.affiliates.push(row('AVA42', 'ava_test', 'Ava Example'), row('BEN43', 'ben_test', 'Ben Example'));
  const typed = (id, code) => { const i = db.hab_intake.find(x => x.id === id); if (i) i.payload = Object.assign({}, i.payload || {}, { 'Discount Code': code }); };
  typed('00000000-0000-4000-8000-0000000001a1', 'AVA42');         // Applicant One typed Ava's code: not credited yet
  typed('00000000-0000-4000-8000-0000000001a2', ' ava 42 ');      // Applicant Two typed it in lower case with a space: the same code
  typed('00000000-0000-4000-8000-0000000001a3', 'AVA42');         // Applicant Three typed it and was credited five days ago
  // Ava's own application, linked to her: the server refuses to credit her for her own code (partner:self)
  db.hab_intake.push({ id: '00000000-0000-4000-8000-0000000001a4', created_at: new Date(Date.now() - 2 * 86400e3).toISOString(), lang: 'en', name: 'Ava Example', email: 'ava@example.invalid', contact: '', programme: null,
    payload: { 'First Name': 'Ava', 'Last Name': 'Example', 'Discount Code': 'AVA42' }, status: 'new', athlete_id: 'ava_test', linked_at: iso(today, 1) });
  db.referral_credits = [
    { id: 'f0000000-0000-4000-8000-000000000001', code: 'AVA42', athlete_id: 'ava_test', intake_id: '00000000-0000-4000-8000-0000000000e1', friend_name: 'Friend Zero', percent: 10, earned_on: daysAgo(today, 30), used_on: daysAgo(today, 20), note: null, created_at: iso(today, 30) },
    { id: 'f0000000-0000-4000-8000-000000000002', code: 'AVA42', athlete_id: 'ava_test', intake_id: '00000000-0000-4000-8000-0000000001a3', friend_name: 'Fixture Applicant Three', percent: 10, earned_on: daysAgo(today, 5), used_on: null, note: null, created_at: iso(today, 5) },
  ];
}

function buildSeed(opt) {
  opt = opt || {};
  const today = opt.today;                     // the page's local YYYY-MM-DD
  // opt.courtDraft: an On court draft waiting on goblet-squat (approved, no court line), for spine-draft-court.
  const db = {
    programs: [
      { athlete_id: 'ava_test', data: programme('Ava'), updated_at: iso(today, 3), updated_by: 'pipeline@example.invalid' },
      { athlete_id: 'ben_test', data: programme('Ben'), updated_at: iso(today, 9), updated_by: 'pipeline@example.invalid' },
      { athlete_id: 'eli_new', data: programme('Eli'), updated_at: iso(today, 1), updated_by: 'pipeline@example.invalid' },
      { athlete_id: 'cara_free', data: { athlete: { id: 'cara_free', firstName: 'Cara', tier: 'free' }, workouts: { days: [] }, cycles: [] }, updated_at: iso(today, 20), updated_by: null },
    ],
    program_versions: [],
    session_history: [
      session('ava_test', 'Ava Example', 1, daysAgo(today, 1), { summary: D1_LOG, day_note: 'Fixture note: squats felt heavy.', coach_status: 'new' }),
      session('ava_test', 'Ava Example', 2, daysAgo(today, 3)),
      session('ava_test', 'Ava Example', 1, daysAgo(today, 8), { summary: D1_LOG }),
      session('ben_test', 'Ben Example', 1, daysAgo(today, 2)),
      session('ben_test', 'Ben Example', 2, daysAgo(today, 25), { day_note: 'Fixture backlog note.', coach_status: 'new' }),
    ],
    athlete_progress: [
      { athlete_id: 'ava_test', athlete_name: 'Ava Example', data: { ava_test_hab_log: habLog(today, [0, 1, 2, 4]) }, updated_at: iso(today, 0) },
      { athlete_id: 'ben_test', athlete_name: 'Ben Example', data: {}, updated_at: iso(today, 2) },
      { athlete_id: 'cara_free', athlete_name: 'Cara', data: { cara_free_hab_log: habLog(today, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]) }, updated_at: iso(today, 0) },
      { athlete_id: 'dan_proof', athlete_name: 'Dan', data: { dan_proof_hab_log: habLog(today, [5, 6]) }, updated_at: iso(today, 5) },
    ],
    athlete_identities: [
      { user_id: 'u-ava', athlete_id: 'ava_test', email: 'athlete.ava_test@amirardekani.com', linked_at: iso(today, 30), initial_password: null, password_set_at: iso(today, 30), sent_at: iso(today, 29) },
      { user_id: 'u-ben', athlete_id: 'ben_test', email: 'athlete.ben_test@amirardekani.com', linked_at: iso(today, 4), initial_password: 'fixture-unsent-pw-1', password_set_at: iso(today, 4), sent_at: null },
    ],
    coaching_logs: [{ athlete_id: 'ava_test', body: '# Fixture coaching log\nNothing real here.', updated_at: iso(today, 6) }],
    hab_notes: [
      { athlete_id: '__coach__', day: daysAgo(today, 1), body: 'Fixture coach line yesterday.', pct: null, hidden: false, created_at: iso(today, 1), updated_at: iso(today, 1) },
      { athlete_id: 'ava_test', day: today, body: 'Fixture wall line from Ava.', pct: 80, hidden: false, created_at: iso(today, 0), updated_at: iso(today, 0) },
      { athlete_id: 'cara_free', day: daysAgo(today, 1), body: 'Fixture wall line from Cara.', pct: 60, hidden: false, created_at: iso(today, 1), updated_at: iso(today, 1) },
    ],
    hab_contacts: [
      { athlete_id: 'cara_free', email: 'cara@example.invalid', whatsapp: '+10000000001', source: 'proof.html', tier: 'free', note: null, created_at: iso(today, 20), updated_at: iso(today, 20), display_name: 'Cara' },
      { athlete_id: 'dan_proof', email: 'dan@example.invalid', whatsapp: '+10000000002', source: 'proof.html', tier: 'free', note: null, created_at: iso(today, 3), updated_at: iso(today, 3), display_name: 'Dan' },
    ],
    hab_titles: [{ athlete_id: 'cara_free', title: 'FIXTURE TITLE', earned_on: daysAgo(today, 4), created_at: iso(today, 4) }],
    leaderboard_optin: [{ athlete_id: 'cara_free', display_name: 'Cara', joined_at: iso(today, 15), updated_at: iso(today, 15), title: null }],
    seasons: [{ id: 1, name: 'Fixture Season', starts_on: daysAgo(today, 12), created_at: iso(today, 12) }],
    xp_rules: [{ id: 1, rules: { streakQualifyPct: 70, quests: [
      { id: 'w_water5', xp: 150, need: 5, note: 'Full water on 5 days', title: 'FIXTURE WELL' },
      { id: 'w_train3', xp: 200, need: 3, note: 'Three workouts in the week', title: 'FIXTURE SHOW-UP' },
      { id: 'w_sleep5', xp: 150, need: 5, note: 'Sleep target on 5 days', title: 'FIXTURE RECHARGE' } ], questRuns: [] }, updated_at: iso(today, 30) }],
    call_logs: [
      { id: '00000000-0000-4000-8000-000000000c01', athlete_id: 'ava_test', athlete_name: 'Ava Example', call_date: daysAgo(today, 7), week: 'Cycle 2 · Week 1', duration: '20 min', tier: 'Coached', rating: 4,
        scores: { well: 4, sleep: 3, energy: 4, sore: 2, rpe: 7, court: 3 }, sessions_done: 3, sessions_planned: 3, win_vault: 'Fixture win.', answers: { q1: { label: 'Fixture Q', value: 'Fixture A' } },
        summary: 'Fixture summary', created_at: iso(today, 7), updated_at: iso(today, 7), ai_summary: null, ai_model: null, ai_generated_at: null },
      { id: '00000000-0000-4000-8000-000000000c02', athlete_id: 'ava_test', athlete_name: 'Ava Example', call_date: daysAgo(today, 14), week: 'Cycle 1 · Week 4', duration: '15 min', tier: 'Coached', rating: 3,
        scores: { well: 3 }, sessions_done: 2, sessions_planned: 3, win_vault: null, answers: {}, summary: 'Fixture summary 2', created_at: iso(today, 14), updated_at: iso(today, 14), ai_summary: null, ai_model: null, ai_generated_at: null },
    ],
    cycle_reports: [], hab_season_results: [], athlete_keys: [], messages: [], hab_intake: [
      { id: '00000000-0000-4000-8000-0000000001a1', created_at: new Date(Date.now() - 3 * 3600e3).toISOString(), lang: 'en', name: 'Fixture Applicant One', email: 'one@example.invalid', contact: '@fixture.one', programme: 'Set — $180 / 3 months', payload: { 'First Name': 'Fixture', 'Goals': ['Serve power'], 'Discount Code': 'FIXTURE10' }, status: 'new', handled_at: null },
      { id: '00000000-0000-4000-8000-0000000001a2', created_at: new Date(Date.now() - 30 * 3600e3).toISOString(), lang: 'fa', name: 'Fixture Applicant Two', email: 'two@example.invalid', contact: '09120000000', programme: null, payload: { 'Location': 'Nowhere' }, status: 'new', handled_at: null },
      { id: '00000000-0000-4000-8000-0000000001a3', created_at: new Date(Date.now() - 9 * 86400e3).toISOString(), lang: 'en', name: 'Fixture Applicant Three', email: 'three@example.invalid', contact: '', programme: null, payload: {}, status: 'handled', handled_at: iso(today, 8) },
    ],
    affiliates: [
      { code: 'FIXTURE10', percent: 10, coach_name: 'Fixture Coach', coach_name_fa: null, instagram: '@fixture.coach', whatsapp: '09120000009', email: 'fc@example.invalid', athlete_id: null, applied_on: daysAgo(today, 40), active: true, retired_on: null, notes: 'Made up.', created_at: iso(today, 40), updated_at: iso(today, 40) },
    ],
    chat_conversations: [
      { id: '00000000-0000-4000-8000-0000000000c1', site: 'en', page: '/', visitor: 'fixture-v1', started_at: new Date(Date.now() - 2 * 3600e3).toISOString(), last_at: new Date(Date.now() - 2 * 3600e3).toISOString(), turns: 2, handoff: 'whatsapp', tokens_in: 900, tokens_out: 200, cost_usd: 0.0031 },
      { id: '00000000-0000-4000-8000-0000000000c2', site: 'fa', page: '/index-fa.html', visitor: 'fixture-v2', started_at: new Date(Date.now() - 30 * 3600e3).toISOString(), last_at: new Date(Date.now() - 30 * 3600e3).toISOString(), turns: 1, handoff: null, tokens_in: 500, tokens_out: 120, cost_usd: 0.0018 },
      { id: '00000000-0000-4000-8000-0000000000c3', site: 'en', page: '/', visitor: 'fixture-old', started_at: new Date(Date.now() - 100 * 86400e3).toISOString(), last_at: new Date(Date.now() - 100 * 86400e3).toISOString(), turns: 1, handoff: null, tokens_in: 100, tokens_out: 50, cost_usd: 0.0005 },
    ],
    chat_messages: [
      { id: 1, conversation_id: '00000000-0000-4000-8000-0000000000c1', role: 'user', content: 'Fixture question <b>one</b>?', at: new Date(Date.now() - 2 * 3600e3).toISOString() },
      { id: 2, conversation_id: '00000000-0000-4000-8000-0000000000c1', role: 'assistant', content: 'Fixture answer one.', at: new Date(Date.now() - 2 * 3600e3).toISOString(), gap: true, gap_handled_at: null },
      { id: 3, conversation_id: '00000000-0000-4000-8000-0000000000c2', role: 'user', content: 'سوال نمونه', at: new Date(Date.now() - 30 * 3600e3).toISOString() },
      { id: 4, conversation_id: '00000000-0000-4000-8000-0000000000c2', role: 'assistant', content: 'پاسخ نمونه', at: new Date(Date.now() - 30 * 3600e3).toISOString(), gap: true, gap_handled_at: new Date(Date.now() - 29 * 3600e3).toISOString() },
      { id: 6, conversation_id: '00000000-0000-4000-8000-0000000000c1', role: 'user', content: 'Fixture second question: do you take under-16s?', at: new Date(Date.now() - 1 * 3600e3).toISOString() },
      { id: 7, conversation_id: '00000000-0000-4000-8000-0000000000c1', role: 'assistant', content: 'Fixture second answer, I could not find that.', at: new Date(Date.now() - 1 * 3600e3).toISOString(), gap: true, gap_handled_at: null },
      { id: 5, conversation_id: '00000000-0000-4000-8000-0000000000c3', role: 'user', content: 'Fixture old question', at: new Date(Date.now() - 100 * 86400e3).toISOString() },
    ],
    library_categories: [{ id: 'strength', kind: 'workout', title: 'Strength (fixture)', banner: null, icon: null, sort_order: 1 }],
    library: [{ slug: 'workouts/strength/fixture-burner', kind: 'workout', category_id: 'strength', published: true, sort_order: 1, updated_at: iso(today, 10),
      data: { id: 'fixture-burner', title: 'Fixture Burner', duration: '20 min', equipment: 'Bands', category: 'strength' } }],
    library_sessions: [],
    exercises: [
      { id: 'goblet-squat', name: 'Goblet Squat', aliases: [], pattern: 'squat', qualities: ['strength'], purpose: 'Fixture purpose.', tennis: null, cues: { good: ['Fixture cue'], bad: [] },
        equipment: ['dumbbell'], loads: ['knee'], easier: [], harder: ['machine-leg-press'], alts: [], video: 'https://www.youtube.com/watch?v=FIXTURE0001', status: 'approved', updated_at: iso(today, 10), updated_by: 'coach', impact: 'none', muscles: null,
        steps: ['Fixture step one: hold the weight at your chest.', 'Fixture step two: sit down between your heels.', 'Fixture step three: stand back up.'] },
      { id: 'machine-leg-press', name: 'Machine Leg Press', aliases: [], pattern: 'squat', qualities: [], purpose: 'Fixture draft purpose.', tennis: null, cues: null,
        equipment: ['machine'], loads: ['knee'], easier: ['goblet-squat'], harder: [], alts: [], video: null, status: 'draft', updated_at: iso(today, 2), updated_by: 'claude', impact: null, muscles: null, steps: [] },
      { id: 'dead-bug', name: 'Dead Bug', aliases: [], pattern: 'anti-extension', qualities: ['armour'], purpose: 'Fixture.', tennis: null, cues: null,
        equipment: [], loads: ['trunk'], easier: [], harder: [], alts: [], video: null, status: 'draft', updated_at: iso(today, 2), updated_by: 'claude', impact: 'none', muscles: null, steps: [] },
      // stage64: an approved entry with no steps yet, and Claude's drafts for it waiting in its coach-only half (below).
      { id: 'band-pull-apart', name: 'Band Pull-Apart', aliases: [], pattern: 'pull-horizontal', qualities: ['armour'], purpose: 'Fixture live purpose.', tennis: null,
        cues: { good: ['Fixture live key', 'Fixture live feel'], bad: ['Fixture live avoid'] },
        equipment: ['band'], loads: ['shoulder'], easier: [], harder: [], alts: [], video: null, status: 'approved', updated_at: iso(today, 5), updated_by: 'coach', impact: 'none', muscles: null, steps: [] },
    ],
    exercise_coach: [
      { id: 'goblet-squat', sfr: 2, flags: [], notes: null, suggested_qualities: null, links_before: null, links_history: null, credits: { quads: 1, glutes: 0.5 }, cost: 'moderate',
        suggested_changes: opt.courtDraft ? [{ field: 'tennis', old: null, new: 'Fixture court draft: the low ready position.', why: 'a court moment (CUE-7)', from: 'spine fixture', at: iso(today, 1, '08') }] : null },
      { id: 'machine-leg-press', sfr: 1, flags: ['loaded-knee-flexion'], notes: 'fixture coach note', suggested_qualities: ['strength', 'muscle'], links_before: { keep: 'me' }, links_history: [{ fixture: true }], credits: null, cost: null, suggested_changes: { fixture: 'keep me' } },
      // Claude's drafts (stage43 items): steps and cues are fresh (their `old` is the entry as it is), the purpose draft is
      // stale (written against an older purpose), and the easier item (a link) is a different kind of proposal the editor
      // never touches. (It was a court line until On court became a draft field, 2026-10-11.)
      { id: 'band-pull-apart', sfr: 3, flags: [], notes: null, suggested_qualities: [], links_before: null, links_history: [], credits: { back: 1, shoulder: 0.5 }, cost: 'isolation',
        suggested_changes: [
          { field: 'steps', old: [], new: ['Fixture draft step one.', 'Fixture draft step two.', 'Fixture draft step three.', 'Fixture draft step four.'], why: 'How to do it (CUE-6)', from: 'spine fixture', at: iso(today, 1, '08') },
          { field: 'cues', old: { good: ['Fixture live key', 'Fixture live feel'], bad: ['Fixture live avoid'] },
            new: { good: ['Fixture draft key', 'Fixture draft feel'], bad: ['Fixture draft fault. Fixture draft fix.'] }, why: 'CUE-1 roles', from: 'spine fixture', at: iso(today, 1, '09') },
          { field: 'purpose', old: 'An older fixture purpose.', new: 'Fixture stale purpose draft.', why: 'plain words', from: 'spine fixture', at: iso(today, 3, '08') },
          { field: 'easier', old: [], new: ['dead-bug'], why: 'a regression', from: 'spine fixture', at: iso(today, 1, '10') },
        ] },
    ],
    qualities: ['strength', 'muscle', 'power', 'spring', 'speed', 'brakes', 'rotation', 'engine', 'armour', 'movement'].map((id, i) =>
      ({ id, name: id[0].toUpperCase() + id.slice(1), family: null, line: 'Fixture line.', tennis: null, tests: [], sort: i + 1, status: i < 3 ? 'approved' : 'draft', updated_at: iso(today, 30), updated_by: 'coach' })),
    tps_content: [{ key: 'fixture', body: { fixture: true }, version: 'v1', updated_at: iso(today, 9) }],
    course_en: [{ id: 'fixture', kind: 'lesson', sort: 1, body: { fixture: true }, updated_at: iso(today, 9) }],
    tps_accounts: [{ user_id: 'u-tps-1', username: 'fixture_buyer', label: 'Fixture', created_at: iso(today, 3), initial_password: 'fixture-unsent-pw-2', password_set_at: iso(today, 3), sent_at: null, revoked_at: null }],
    assess_content: [],
    // The testing-app buyer the fixture players below belong to. The note about each buyer is in buyer_notes (stage53), so the account
    // rows carry the OLD label only for 'fixture_buyer' (to show buyer_notes wins, and the label is the fallback when it cannot be read).
    assess_accounts: [{ user_id: 'u-assess-1', username: 'fixture_academy', label: null, created_at: iso(today, 12), initial_password: null, password_set_at: iso(today, 12), sent_at: iso(today, 11), revoked_at: null }],
    buyer_notes: [
      { user_id: 'u-tps-1', app: 'course', note: 'Fixture note about a course buyer', updated_at: iso(today, 3) },
      { user_id: 'u-assess-1', app: 'testing', note: 'Fixture academy note', updated_at: iso(today, 12) },
    ],
    erasure_log: [],
    // Career Mode / Courtside (stage70, stage75): the tables exist and are empty unless opt.court fills them (courtSeed above).
    career_awards: [], career_catalogue: [], career_facts: [], courtside_marks: [], career_honour_months: [], career_honours: [], career_goals: [], career_notes: [],
    athlete_status: [],
    // a testing-app buyer's players, notes and results (made up). The coach reads them since stage50, for the backup only.
    assess_players: [
      { id: 'p-0001', account_id: 'u-assess-1', name: 'Fixture Player One', birth_year: 2012, birth_month: 4, sex: 'f', hand: 'r', squad: 'U14', created_at: iso(today, 20), updated_at: iso(today, 5), deleted_at: null },
      { id: 'p-0002', account_id: 'u-assess-1', name: 'Fixture Player Two', birth_year: 2011, birth_month: 9, sex: 'm', hand: 'l', squad: 'U14', created_at: iso(today, 20), updated_at: iso(today, 5), deleted_at: iso(today, 2) },
    ],
    assess_notes: [{ id: 'n-0001', player_id: 'p-0001', account_id: 'u-assess-1', body: 'Fixture note', created_at: iso(today, 4), deleted_at: null }],
    assess_results: [
      { player_id: 'p-0001', test: 'sprint-10m', day: daysAgo(today, 6), account_id: 'u-assess-1', value: 1.9, extra: null, updated_at: iso(today, 6), deleted_at: null },
      { player_id: 'p-0001', test: 'sprint-10m', day: daysAgo(today, 1), account_id: 'u-assess-1', value: 1.85, extra: { wind: 'none' }, updated_at: iso(today, 1), deleted_at: null },
    ],
  };
  if (opt.court) courtSeed(db, today, opt.courtAwards !== false);
  if (opt.crew || opt.open || opt.lounge) crewSeed(db);
  if (opt.open) openSeed(db, today);
  if (opt.lounge) loungeSeed(db, today);
  if (opt.partner) partnerSeed(db, today);
  if (opt.bigHistory) {
    for (let i = 0; i < opt.bigHistory; i++) {
      db.session_history.push(session('bulk_' + (i % 40), 'Bulk ' + (i % 40), (i % 3) + 1, daysAgo(today, 30 + Math.floor(i / 40))));
    }
  }
  return {
    coachEmail: 'amirardekanian@gmail.com',
    db,
    levels: { cara_free: 4, ava_test: 3, dan_proof: 1 },
    board: [{ pos: 1, display_name: 'Cara', title: null, xp: 900, level: 4, rank_label: 'STARTER', is_me: false, joined: true }],
    stub: opt.stub || {},
    crew: !!(opt.crew || opt.open || opt.lounge),   // stub.js: the stage81 functions (the Bell) answer only when this is on
    open: !!opt.open,                 // stub.js: the stage85 functions (the Monthly Open) answer only when this is on
    lounge: !!opt.lounge,             // stub.js: stage96's coach functions (faces, cheers) and the table athlete_profile answer only when this is on
    partner: !!opt.partner,           // stub.js: stage97's partner-code functions and the table referral_credits answer only when this is on
    honoursConfirm: !!opt.honoursConfirm,   // stub.js: stage101 (the month's honours wait for Amir's confirmation): coach_honour_confirm(), `confirmed`, confirmed_at
    // The month just gone's honours as the server would work them out (see stub.js: liveHonours). Made up; nothing is computed.
    honoursLive: opt.honoursLive !== undefined ? opt.honoursLive : opt.court ? {
      // A former athlete shares the top session count and the coach's own identity shares the top gain: the stub leaves both out, as
      // career_honours_live() does (a former athlete by athlete_status, the coach's identity because the page names it in p_not_clients).
      sessions: { n: 14, who: ['gia_court', 'kim_former'] },
      improved: { pct: 27.1, who: [{ athlete_id: 'hal_court', lift: 'Barbell Back Squat', pct: 27.1 }, { athlete_id: 'amir_ardekani', lift: 'Barbell Back Squat', pct: 27.1 }] },
      full_month: { who: [], near: [{ athlete_id: 'ivy_court', held: 3, weeks: 4 }, { athlete_id: 'jon_court', held: 3, weeks: 4 }] },
      shortlist: [{ slot: 'weeks_held', athlete_id: 'ava_test', n: 4 }, { slot: 'gain', athlete_id: 'hal_court', lift: 'Barbell Back Squat', pct: 27.1 },
                  { slot: 'comeback', athlete_id: 'jon_court', n: 2, gone: 16 }],
    } : null,
  };
}

module.exports = { buildSeed, daysAgo, dkey, BELL_IDS, REPLY_IDS, OPEN_IDS };
