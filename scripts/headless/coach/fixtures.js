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

function buildSeed(opt) {
  opt = opt || {};
  const today = opt.today;                     // the page's local YYYY-MM-DD
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
    library_categories: [{ id: 'strength', kind: 'workout', title: 'Strength (fixture)', banner: null, icon: null, sort_order: 1 }],
    library: [{ slug: 'workouts/strength/fixture-burner', kind: 'workout', category_id: 'strength', published: true, sort_order: 1, updated_at: iso(today, 10),
      data: { id: 'fixture-burner', title: 'Fixture Burner', duration: '20 min', equipment: 'Bands', category: 'strength' } }],
    library_sessions: [],
    exercises: [
      { id: 'goblet-squat', name: 'Goblet Squat', aliases: [], pattern: 'squat', qualities: ['strength'], purpose: 'Fixture purpose.', tennis: null, cues: { good: ['Fixture cue'], bad: [] },
        equipment: ['dumbbell'], loads: ['knee'], easier: [], harder: ['machine-leg-press'], alts: [], video: 'https://www.youtube.com/watch?v=FIXTURE0001', status: 'approved', updated_at: iso(today, 10), updated_by: 'coach', impact: 'none', muscles: null },
      { id: 'machine-leg-press', name: 'Machine Leg Press', aliases: [], pattern: 'squat', qualities: [], purpose: 'Fixture draft purpose.', tennis: null, cues: null,
        equipment: ['machine'], loads: ['knee'], easier: ['goblet-squat'], harder: [], alts: [], video: null, status: 'draft', updated_at: iso(today, 2), updated_by: 'claude', impact: null, muscles: null },
      { id: 'dead-bug', name: 'Dead Bug', aliases: [], pattern: 'anti-extension', qualities: ['armour'], purpose: 'Fixture.', tennis: null, cues: null,
        equipment: [], loads: ['trunk'], easier: [], harder: [], alts: [], video: null, status: 'draft', updated_at: iso(today, 2), updated_by: 'claude', impact: 'none', muscles: null },
    ],
    exercise_coach: [
      { id: 'goblet-squat', sfr: 2, flags: [], notes: null, suggested_qualities: null, links_before: null, links_history: null, credits: { quads: 1, glutes: 0.5 }, cost: 'moderate', suggested_changes: null },
      { id: 'machine-leg-press', sfr: 1, flags: ['loaded-knee-flexion'], notes: 'fixture coach note', suggested_qualities: ['strength', 'muscle'], links_before: { keep: 'me' }, links_history: [{ fixture: true }], credits: null, cost: null, suggested_changes: { fixture: 'keep me' } },
    ],
    qualities: ['strength', 'muscle', 'power', 'spring', 'speed', 'brakes', 'rotation', 'engine', 'armour', 'movement'].map((id, i) =>
      ({ id, name: id[0].toUpperCase() + id.slice(1), family: null, line: 'Fixture line.', tennis: null, tests: [], sort: i + 1, status: i < 3 ? 'approved' : 'draft', updated_at: iso(today, 30), updated_by: 'coach' })),
    tps_content: [{ key: 'fixture', body: { fixture: true }, version: 'v1', updated_at: iso(today, 9) }],
    course_en: [{ id: 'fixture', kind: 'lesson', sort: 1, body: { fixture: true }, updated_at: iso(today, 9) }],
    tps_accounts: [{ user_id: 'u-tps-1', username: 'fixture_buyer', label: 'Fixture', created_at: iso(today, 3), initial_password: 'fixture-unsent-pw-2', password_set_at: iso(today, 3), sent_at: null, revoked_at: null }],
    assess_content: [], assess_accounts: [],
  };
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
  };
}

module.exports = { buildSeed, daysAgo, dkey };
