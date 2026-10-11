// coach-harness/run.js — drive coach.html in REAL (non-demo) mode against the in-memory stub and check
// the write paths demo mode turns into no-ops. Every check states the CORRECT behaviour; a FAIL is a
// defect (or a regression after a fix). Results: out/results.json (+ screenshots, the backup files).
//
//   node run.js                 # every scenario
//   node run.js editor backup   # only scenarios whose id contains one of the words
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./lib');

const results = [];
function check(r, name, ok, actual, expect) { r.checks.push({ name, ok: !!ok, expect, actual }); }
const S = {};   // scenarios
const only = process.argv.slice(2);

const lastOf = (cs, pred) => cs.filter(pred).slice(-1)[0];
const isUpd = (t) => c => c.kind === 'from' && c.name === t && c.op === 'update';
const rowLoc = (page, name) => page.locator('.wday.open .cmp-row', { hasText: name }).first();
async function openEditor(page, exName) {
  await rowLoc(page, exName).locator('.rx-edit').click();
  await page.locator('.rx-editor[style*="block"]').first().waitFor();
  return page.locator('.rx-editor[style*="block"]').first();
}
async function setField(ed, prefix, v) { await ed.locator(`[id^="${prefix}-"]`).fill(String(v)); }
async function doseText(page, exName) { return (await rowLoc(page, exName).locator('.cmp-rx').innerText()).replace(/\s+/g, ' ').trim(); }

// ── 1. Boot ─────────────────────────────────────────────────────────────────
S['boot-double-load'] = async (b) => {
  const r = { id: 'boot-double-load', title: 'One sign-in loads the store once', checks: [] };
  const { page, log } = await L.openCoach(b, {});
  const cs = await L.calls(page);
  check(r, 'loadAll() runs once on page load', L.loadAllCount(cs) === 1, 'athlete_progress selects at boot: ' + L.loadAllCount(cs), 1);
  check(r, 'no page errors', !log.errors.length, log.errors, []);
  r.evidence = { bootCalls: cs.map(c => c.kind + ':' + c.name + (c.op ? ':' + c.op : '')) };
  await page.context().close();
  return r;
};

// ── 2. Inline exercise editor: happy path ────────────────────────────────────
S['editor-save'] = async (b) => {
  const r = { id: 'editor-save', title: 'The work → ✎ → change sets/reps/RPE → Save', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'a/ava_test/work' });
  const before = await L.db(page);
  const ed = await openEditor(page, 'Goblet Squat');
  await setField(ed, 'exSets', 5); await setField(ed, 'exDose', 8); await setField(ed, 'exRpe', 9);
  const n0 = await L.nCalls(page);
  await ed.locator('.exed-acts button', { hasText: 'Save' }).click();
  await L.settle(page, 600);
  const cs = await L.callsSince(page, n0);
  const up = lastOf(cs, isUpd('programs'));
  const after = await L.db(page);
  const ex = up && up.payload.data.workouts.days[0].blocks[1].exercises[0];
  check(r, 'one programs.update sent, filtered on the athlete (and guarded by the updated_at it read)', up && up.filters[0] === 'athlete_id.eq."ava_test"' && up.filters.slice(1).every(f => /^updated_at\.eq\./.test(f)), up && up.filters, ['athlete_id.eq."ava_test"', 'updated_at.eq.<read>']);
  check(r, 'payload rx carries the new values', ex && String(ex.rx.sets) === '5' && String(ex.rx.reps) === '8' && String(ex.rx.rpe) === '9', ex && ex.rx);
  check(r, 'rx keeps its number types (sets/reps/rpe were numbers)', ex && typeof ex.rx.reps === 'number' && typeof ex.rx.rpe === 'number', ex && { reps: typeof ex.rx.reps, rpe: typeof ex.rx.rpe });
  check(r, 'the write is guarded against a newer server row (updated_at / version in the filter)', up && up.filters.length > 1, up && up.filters);
  const pv = after.program_versions.filter(v => v.athlete_id === 'ava_test');
  check(r, 'program_versions got the previous version', pv.length === 1 && pv[0].data.workouts.days[0].blocks[1].exercises[0].rx.sets === 4, pv.map(v => v.data.workouts.days[0].blocks[1].exercises[0].rx));
  const shown = await doseText(page, 'Goblet Squat');
  check(r, 'the row redraws with 5 × 8 and RPE 9', /5 × 8/.test(shown) && /RPE 9/.test(shown), shown);
  check(r, 'toast confirms', /Saved/.test(await L.toastText(page)), await L.toastText(page));
  r.evidence = { payloadBytes: up && JSON.stringify(up.payload).length, payloadKeys: up && Object.keys(up.payload), rxBefore: before.programs[0].data.workouts.days[0].blocks[1].exercises[0].rx, rxSent: ex && ex.rx, dialogs: log.dialogs };
  // A save that changes nothing: is a version still written?
  const ed2 = await openEditor(page, 'Chest-Supported Dumbbell Row');
  const pvBefore = (await L.db(page)).program_versions.length;
  const n1 = await L.nCalls(page);
  await ed2.locator('.exed-acts button', { hasText: 'Save' }).click();
  await L.settle(page, 600);
  const up2 = lastOf(await L.callsSince(page, n1), isUpd('programs'));
  const pvAfter = (await L.db(page)).program_versions.length;
  check(r, 'Save with no change sends nothing (or at least writes no version)', !up2 || pvAfter === pvBefore,
    { sent: !!up2, versionsBefore: pvBefore, versionsAfter: pvAfter, rxSent: up2 && up2.payload.data.workouts.days[0].blocks[1].exercises[1].rx });
  await page.screenshot({ path: path.join(L.OUT, 'editor-save.png'), fullPage: false });
  await page.context().close();
  return r;
};

// ── 3. Editor: the server refuses the write ──────────────────────────────────
S['editor-save-error'] = async (b) => {
  const r = { id: 'editor-save-error', title: 'Save fails at the server', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'a/ava_test/work' });
  await page.evaluate(() => window.__STUB.fail.push({ kind: 'from', name: 'programs', op: 'update', message: 'fixture: permission denied', times: 1 }));
  const ed = await openEditor(page, 'Goblet Squat');
  await setField(ed, 'exSets', 6);
  await ed.locator('.exed-acts button', { hasText: 'Save' }).click();
  await L.settle(page, 700);
  check(r, 'an alert names the error', log.dialogs.some(d => /Could not save: fixture: permission denied/.test(d.message)), log.dialogs);
  const shown = await doseText(page, 'Goblet Squat');
  check(r, 'the row still shows the SAVED prescription (4 × 10), not the failed edit', /4 × 10/.test(shown), shown);
  const st = await page.evaluate(() => ({ store: S.programs.ava_test.workouts.days[0].blocks[1].exercises[0].rx, view: _D.program.workouts.days[0].blocks[1].exercises[0].rx, same: _D.program === S.programs.ava_test }));
  check(r, 'the athlete view and the store agree after the failure', st.same, st);
  await page.context().close();
  return r;
};

// ── 4. Editor: the programme changed on the server after the dashboard loaded ─
S['editor-stale-overwrite'] = async (b) => {
  const r = { id: 'editor-stale-overwrite', title: 'Pipeline publishes a new cycle, then Amir edits one exercise in an open dashboard', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'a/ava_test/work' });
  // publish_cycle() lands while the tab is open: new cycle name, a 4th day, a changed lift.
  await page.evaluate(() => {
    const row = window.__DB.programs.find(p => p.athlete_id === 'ava_test');
    const d = JSON.parse(JSON.stringify(row.data));
    d.cycles.push({ name: 'Cycle 3 — Published Later', weeks: '5 weeks', art: 'voltage' }); d.currentCycleIndex = 1;
    d.workouts.days.push({ id: 4, focusTag: 'New Day From The Pipeline', blocks: [{ title: 'Primary', exercises: [{ name: 'Box Jump', type: 'standard', rx: { sets: 3, reps: 5 } }] }] });
    d.workouts.days[2].blocks[0].exercises[0].rx.sets = 5;
    row.data = d; row.updated_at = new Date(Date.now() + 1000).toISOString(); row.updated_by = 'publish_cycle';
  });
  const ed = await openEditor(page, 'Goblet Squat');
  await setField(ed, 'exSets', 5);
  await ed.locator('.exed-acts button', { hasText: 'Save' }).click();
  await L.settle(page, 700);
  const after = await L.db(page);
  const row = after.programs.find(p => p.athlete_id === 'ava_test').data;
  check(r, 'the published cycle survives the edit (or the edit is refused with a warning)',
    (row.cycles.length === 2 && row.workouts.days.length === 4) || log.dialogs.some(d => /changed|newer|reload/i.test(d.message)),
    { cyclesNow: row.cycles.map(c => c.name), daysNow: row.workouts.days.length, currentCycleIndex: row.currentCycleIndex, trapBarSets: row.workouts.days[2].blocks[0].exercises[0].rx.sets, dialogs: log.dialogs });
  const pv = after.program_versions.filter(v => v.athlete_id === 'ava_test').slice(-1)[0];
  r.evidence = { recoverableFromVersions: !!(pv && pv.data.cycles.length === 2), toast: await L.toastText(page) };
  await page.context().close();
  return r;
};

// ── 5. Editor: the update matches no row ──────────────────────────────────────
S['editor-zero-rows'] = async (b) => {
  const r = { id: 'editor-zero-rows', title: 'Update reaches the server but changes no row (row gone / RLS)', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'a/ava_test/work' });
  await page.evaluate(() => { window.__STUB.rlsDeny.programs = ['update']; });
  const ed = await openEditor(page, 'Goblet Squat');
  await setField(ed, 'exSets', 5);
  await ed.locator('.exed-acts button', { hasText: 'Save' }).click();
  await L.settle(page, 600);
  const t = await L.toastText(page);
  const sets = (await L.db(page)).programs.find(p => p.athlete_id === 'ava_test').data.workouts.days[0].blocks[1].exercises[0].rx.sets;
  check(r, 'no "Saved" claim when nothing was saved', !/Saved/.test(t) || sets === 5, { toast: t, setsOnServer: sets, dialogs: log.dialogs });
  await page.context().close();
  return r;
};

// ── 6. Auth events while typing ─────────────────────────────────────────────
for (const ev of ['TOKEN_REFRESHED', 'SIGNED_IN']) {
  S['auth-' + ev] = async (b) => {
    const r = { id: 'auth-' + ev, title: `onAuthStateChange('${ev}') with the exercise editor open and typed`, checks: [] };
    const { page } = await L.openCoach(b, { hash: 'a/ava_test/work' });
    const ed = await openEditor(page, 'Goblet Squat');
    await setField(ed, 'exSets', 7);
    await ed.locator('[id^="exNote-"]').fill('typed but not saved yet');
    const n0 = await L.nCalls(page);
    await page.evaluate(e => window.__fireAuth(e), ev);
    await L.settle(page, 1200);
    const cs = await L.callsSince(page, n0);
    const open = await page.locator('.rx-editor[style*="block"]').count();
    const typed = open ? await page.locator('.rx-editor[style*="block"] [id^="exSets-"]').inputValue() : null;
    check(r, 'the open editor and the typed values survive', open === 1 && typed === '7', { editorOpen: open, setsField: typed });
    check(r, 'no full reload for a token refresh / tab return', L.loadAllCount(cs) === 0, 'loadAll runs: ' + L.loadAllCount(cs) + ', calls: ' + cs.length);
    await page.context().close();
    return r;
  };
}

// ── 6b. Auth event while the Spine editor / coach-line composer / affiliate form hold typed text ──
S['auth-SIGNED_IN-forms'] = async (b) => {
  const r = { id: 'auth-SIGNED_IN-forms', title: "onAuthStateChange('SIGNED_IN') (tab return) while other forms hold typed text", checks: [] };
  let { page } = await L.openCoach(b, { hash: 'exercises' });
  await page.locator('button[data-open="machine-leg-press"]').click();
  await page.locator('textarea[data-sf=purpose]').fill('Typed purpose, not saved yet');
  await page.evaluate(() => window.__fireAuth('SIGNED_IN'));
  await L.settle(page, 1200);
  const stillOpen = await page.locator('textarea[data-sf=purpose]').count();
  const val = stillOpen ? await page.locator('textarea[data-sf=purpose]').inputValue() : null;
  check(r, 'Spine editor keeps the typed purpose (or visibly closes)', !stillOpen || val === 'Typed purpose, not saved yet', { editorStillOpen: !!stillOpen, purposeNow: val });
  // and if Amir now taps Approve, what goes out?
  if (stillOpen) {
    const n0 = await L.nCalls(page);
    await page.locator('.sp-save[data-ap="1"]').click(); await L.settle(page, 700);
    const ex = (await L.callsSince(page, n0)).filter(c => c.name === 'exercises' && c.op === 'update').slice(-1)[0];
    r.evidence = { approvedPurpose: ex && ex.payload.purpose, approvedStatus: ex && ex.payload.status };
  }
  await page.context().close();
  ({ page } = await L.openCoach(b, {}));
  await page.locator('#coachLineInput').fill('Half-written line');
  await page.evaluate(() => window.__fireAuth('SIGNED_IN'));
  await L.settle(page, 1200);
  check(r, 'coach-line composer keeps the half-written line', (await page.locator('#coachLineInput').inputValue()) === 'Half-written line', await page.locator('#coachLineInput').inputValue());
  await page.context().close();
  ({ page } = await L.openCoach(b, { hash: 'affiliates' }));
  await page.locator('#affAdd').click();
  await page.locator('.aff-form[data-new="1"] [data-k=coach_name]').fill('Typed coach name');
  await page.evaluate(() => window.__fireAuth('SIGNED_IN'));
  await L.settle(page, 1200);
  const f = page.locator('.aff-form[data-new="1"] [data-k=coach_name]');
  check(r, 'affiliate form keeps the typed name', (await f.count()) && (await f.inputValue()) === 'Typed coach name', (await f.count()) ? await f.inputValue() : 'form gone');
  await page.context().close();
  return r;
};

// ── 6c. Stale athlete view after a programme reload: the editor writes to whatever sits at that index now ──
S['editor-wrong-exercise'] = async (b) => {
  const r = { id: 'editor-wrong-exercise', title: 'Publish a new file for an athlete viewed earlier, then edit a row on their (stale) page', checks: [] };
  const { page, seed } = await L.openCoach(b, { hash: 'a/ava_test/work' });
  const file = JSON.parse(JSON.stringify(seed.db.programs[0].data));
  file.athlete.id = 'ava_test';
  file.cycles = [{ name: 'Cycle 3 — New File', weeks: '4 weeks' }];
  // the new cycle's Day 1 Primary block starts with a different lift
  file.workouts.days[0].blocks[1].exercises = [{ name: 'Box Jump', type: 'standard', rx: { sets: 3, reps: 5 } }, { name: 'Chest-Supported Dumbbell Row', type: 'standard', rx: { sets: 3, reps: 12, rpe: 8 } }];
  const fp = path.join(L.OUT, 'ava_test.newcycle.json'); fs.writeFileSync(fp, JSON.stringify(file));
  await L.go(page, 'athletes');
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), (async () => { await page.evaluate(() => document.querySelectorAll('details.tools').forEach(d => d.open = true)); await page.locator('button', { hasText: 'Publish programme file' }).click(); })()]);
  await chooser.setFiles(fp);
  await L.settle(page, 900);
  await L.go(page, 'a/ava_test/work');
  const rowName = await page.locator('.wday.open .cmp-row').nth(1).locator('.cmp-nm').innerText();
  const editableGoblet = await page.locator('.wday.open .cmp-row', { hasText: 'Goblet Squat' }).locator('.rx-edit').count();
  if (!/Goblet Squat/.test(rowName) && !editableGoblet) {
    // Fixed behaviour: the page redrew from the published programme, so the stale row is gone.
    check(r, 'the page shows the programme that is on the server', true, { rowShown: rowName.trim(), onServer: 'Box Jump' });
    check(r, 'an edit made on the "Goblet Squat" row never lands on another exercise', true, 'no stale Goblet Squat row left to edit');
    await page.context().close();
    return r;
  }
  const ed = await openEditor(page, 'Goblet Squat');
  const shownSets = await ed.locator('[id^="exSets-"]').inputValue();
  await setField(ed, 'exSets', 2);
  await ed.locator('.exed-acts button', { hasText: 'Save' }).click();
  await L.settle(page, 700);
  const d = (await L.db(page)).programs.find(p => p.athlete_id === 'ava_test').data;
  const target = d.workouts.days[0].blocks[1].exercises[0];
  check(r, 'the page shows the programme that is on the server', !/Goblet Squat/.test(rowName), { rowShown: rowName.trim(), onServer: 'Box Jump' });
  check(r, 'an edit made on the "Goblet Squat" row never lands on another exercise', target.name === 'Goblet Squat' || target.rx.sets !== 2, { editorPrefilledSets: shownSets, savedOnto: target.name, itsRxNow: target.rx });
  await page.context().close();
  return r;
};

// ── 7. Mark read ─────────────────────────────────────────────────────────────
S['note-mark-read'] = async (b) => {
  const r = { id: 'note-mark-read', title: 'The work → session note → Mark read', checks: [] };
  const { page, today } = await L.openCoach(b, { hash: 'a/ava_test/work' });
  const badge0 = await page.locator('#rail a.tab', { hasText: 'Athletes' }).innerText();
  const n0 = await L.nCalls(page);
  await page.locator('.wday.open .daynote button', { hasText: 'Mark read' }).click();
  await L.settle(page, 600);
  const cs = await L.callsSince(page, n0);
  const up = lastOf(cs, isUpd('session_history'));
  check(r, 'update {coach_status:"read"} on exactly that session', up && JSON.stringify(up.payload) === '{"coach_status":"read"}' && up.filters.length === 3, up && { payload: up.payload, filters: up.filters });
  check(r, 'the note now says read', (await page.locator('.wday.open .dn-read').count()) === 1, await page.locator('.wday.open .daynote').innerText().catch(() => ''));
  const badge1 = await page.locator('#rail a.tab', { hasText: 'Athletes' }).innerText();
  check(r, 'the Athletes badge drops', badge0 !== badge1, { before: badge0, after: badge1 });
  check(r, 'no re-read of the whole session_history afterwards', !cs.some(c => c.name === 'session_history' && c.op === 'select'), cs.map(c => c.name + ':' + c.op));
  await page.context().close();
  return r;
};

// ── 8. Coach line: post and take down (UTC and Tehran just after midnight) ───
for (const tzCase of [{ tz: 'UTC', at: null }, { tz: 'Asia/Tehran', at: '2026-10-09T22:00:00Z' }]) {
  const id = 'coach-line-' + (tzCase.tz === 'UTC' ? 'utc' : 'tehran-0130');
  S[id] = async (b) => {
    const r = { id, title: `Today → post and take down the coach line (${tzCase.tz}${tzCase.at ? ', 01:30 local' : ''})`, checks: [] };
    const { page, today } = await L.openCoach(b, { tz: tzCase.tz, fixedTime: tzCase.at || undefined });
    const yBefore = (await L.db(page)).hab_notes.find(n => n.athlete_id === '__coach__' && n.day !== today);
    await page.locator('#coachLineInput').fill('Harness line for today');
    let n0 = await L.nCalls(page);
    await page.locator('.mic .row .btn.primary').click();
    await L.settle(page, 600);
    const post = lastOf(await L.callsSince(page, n0), c => c.kind === 'rpc' && c.name === 'set_coach_note');
    check(r, 'set_coach_note carries the day the coach is looking at (p_day)', post && post.payload && post.payload.p_day === today, post && post.payload);
    const val = await page.locator('#coachLineInput').inputValue();
    check(r, 'the composer shows the posted line as today\'s', val === 'Harness line for today', val);
    const dbNow = await L.db(page);
    const yAfter = dbNow.hab_notes.find(n => n.athlete_id === '__coach__' && yBefore && n.day === yBefore.day);
    check(r, 'yesterday\'s coach line is untouched', !yBefore || (yAfter && yAfter.body === yBefore.body), { yesterdayBefore: yBefore && yBefore.body, yesterdayAfter: yAfter && yAfter.body, stored: dbNow.hab_notes.filter(n => n.athlete_id === '__coach__').map(n => ({ day: n.day, body: n.body })) });
    n0 = await L.nCalls(page);
    const down = page.locator('.mic .row .btn.danger');
    if (await down.count()) {
      await down.click(); await L.settle(page, 600);
      const del = lastOf(await L.callsSince(page, n0), c => c.kind === 'rpc' && c.name === 'set_coach_note');
      check(r, 'Take it down sends an empty body for today', del && del.payload.p_body === '' && del.payload.p_day === today, del && del.payload);
    } else check(r, '"Take it down" is offered for the line just posted', false, 'no Take-it-down button rendered');
    r.evidence = { localToday: today, serverUtcDate: (tzCase.at || new Date().toISOString()).slice(0, 10) };
    await page.context().close();
    return r;
  };
}

// ── 9. Hide a wall line ──────────────────────────────────────────────────────
S['wall-hide'] = async (b) => {
  const r = { id: 'wall-hide', title: 'Today → wall → Hide an athlete line', checks: [] };
  const { page, today } = await L.openCoach(b, {});
  const n0 = await L.nCalls(page);
  await page.locator('.wline', { hasText: 'Fixture wall line from Ava.' }).locator('.modbtn').click();
  await L.settle(page, 600);
  const c = lastOf(await L.callsSince(page, n0), x => x.kind === 'rpc' && x.name === 'hide_note');
  check(r, 'hide_note(ava_test, today, true)', c && c.payload.p_athlete_id === 'ava_test' && c.payload.p_day === today && c.payload.p_hidden === true, c && c.payload);
  const line = page.locator('.wline', { hasText: 'Fixture wall line from Ava.' });
  check(r, 'the line redraws as hidden with a Show button', (await line.locator('.hidetag').count()) === 1 && /Show/.test(await line.locator('.modbtn').innerText()), await line.innerText());
  await page.context().close();
  return r;
};

// ── 10. Quest week ───────────────────────────────────────────────────────────
S['quest-week'] = async (b) => {
  const r = { id: 'quest-week', title: 'Today → start and cancel a quest week', checks: [] };
  const { page, today, log } = await L.openCoach(b, {});
  const boxes = page.locator('#questPanel input[type=checkbox]');
  await boxes.nth(0).check(); await boxes.nth(1).check();
  let n0 = await L.nCalls(page);
  await page.locator('#questStartBtn').click();
  await L.settle(page, 600);
  const st = lastOf(await L.callsSince(page, n0), x => x.kind === 'rpc' && x.name === 'set_quests');
  check(r, 'set_quests(today, [two ids])', st && st.payload.p_start === today && st.payload.p_ids.length === 2, st && st.payload);
  check(r, 'the panel shows the live run', /Live run/i.test(await page.locator('#questPanel').innerText()), (await page.locator('#questPanel').innerText()).slice(0, 120));
  n0 = await L.nCalls(page);
  await page.locator('#questPanel .btn.danger').click();
  await L.settle(page, 600);
  const cl = lastOf(await L.callsSince(page, n0), x => x.kind === 'rpc' && x.name === 'clear_quests');
  check(r, 'clear_quests(start)', cl && cl.payload.p_start === today, cl && cl.payload);
  check(r, 'the picker is back', (await page.locator('#questStartBtn').count()) === 1, '');
  r.evidence = { dialogs: log.dialogs.map(d => d.message.slice(0, 90)) };
  await page.context().close();
  return r;
};

// ── 11. Intake ───────────────────────────────────────────────────────────────
S['intake-status'] = async (b) => {
  const r = { id: 'intake-status', title: 'Intake → Mark handled / Archive / Reopen (+ a failure)', checks: [] };
  const { page } = await L.openCoach(b, { hash: 'intake' });
  const badge = async () => (await page.locator('#rail a.tab', { hasText: 'Intake' }).innerText()).replace(/\s+/g, ' ');
  const b0 = await badge();
  const card = () => page.locator('.intake-card', { hasText: 'Fixture Applicant One' });
  let n0 = await L.nCalls(page);
  await L.jsClick(card().locator('.intake-act[data-to=handled]'));
  await L.settle(page);
  let c = lastOf(await L.callsSince(page, n0), x => x.name === 'set_intake_status');
  check(r, 'Mark handled → set_intake_status(id, handled)', c && c.payload.p_status === 'handled' && /1a1$/.test(c.payload.p_id), c && c.payload);
  check(r, 'card moves to Handled and the badge drops', (await card().getAttribute('class')).includes('handled') && (await badge()) !== b0, { cls: await card().getAttribute('class'), before: b0, after: await badge() });
  n0 = await L.nCalls(page);
  await L.jsClick(card().locator('.intake-act[data-to=archived]'));
  await L.settle(page);
  c = lastOf(await L.callsSince(page, n0), x => x.name === 'set_intake_status');
  check(r, 'Archive → archived', c && c.payload.p_status === 'archived' && (await card().getAttribute('class')).includes('archived'), c && c.payload);
  n0 = await L.nCalls(page);
  await L.jsClick(card().locator('.intake-act[data-to=new]'));
  await L.settle(page);
  c = lastOf(await L.callsSince(page, n0), x => x.name === 'set_intake_status');
  check(r, 'Reopen → new, badge back', c && c.payload.p_status === 'new' && (await badge()) === b0, { payload: c && c.payload, badge: await badge() });
  await page.evaluate(() => window.__STUB.fail.push({ kind: 'rpc', name: 'set_intake_status', message: 'fixture failure', times: 1 }));
  await L.jsClick(card().locator('.intake-act[data-to=handled]'));
  await L.settle(page);
  check(r, 'a failed update leaves the card as it was and says so', (await card().getAttribute('class')).includes('new') && /Could not update/.test(await L.toastText(page)), { cls: await card().getAttribute('class'), toast: await L.toastText(page) });
  await page.context().close();
  return r;
};

// ── 12. Affiliates ───────────────────────────────────────────────────────────
S['affiliates'] = async (b) => {
  const r = { id: 'affiliates', title: 'Affiliates → add a code, retire one, and a refused write', checks: [] };
  const { page, today, log } = await L.openCoach(b, { hash: 'affiliates' });
  await page.locator('#affAdd').click();
  const form = page.locator('.aff-form[data-new="1"]');
  await form.locator('[data-k=code]').fill('harness15');
  await form.locator('[data-k=percent]').fill('15');
  await form.locator('[data-k=coach_name]').fill('Harness Coach');
  let n0 = await L.nCalls(page);
  await form.locator('.aff-save').click();
  await L.settle(page);
  const ins = lastOf(await L.callsSince(page, n0), x => x.name === 'affiliates' && x.op === 'insert');
  check(r, 'insert {code: HARNESS15, percent: 15} asking for the row back', ins && ins.payload.code === 'HARNESS15' && ins.payload.percent === 15 && ins.mods.returning, ins && { payload: ins.payload, returning: ins.mods.returning });
  check(r, 'the new code shows under Live codes', (await page.locator('.intake-card', { hasText: 'HARNESS15' }).count()) === 1, '');
  n0 = await L.nCalls(page);
  await L.jsClick(page.locator('.aff-retire[data-code=FIXTURE10]'));
  await L.settle(page);
  const up = lastOf(await L.callsSince(page, n0), x => x.name === 'affiliates' && x.op === 'update');
  check(r, 'retire → update {active:false, retired_on: today}', up && up.payload.active === false && up.payload.retired_on === today && up.filters.join() === 'code.eq."FIXTURE10"', up && { payload: up.payload, filters: up.filters });
  check(r, 'it moves to Retired', /Retired · 1/.test(await page.locator('#content').innerText()), '');
  await page.evaluate(() => { window.__STUB.rlsDeny.affiliates = ['insert', 'update']; });
  await page.locator('#affAdd').click();
  await page.locator('.aff-form[data-new="1"] [data-k=code]').fill('DENIED10');
  await page.locator('.aff-form[data-new="1"] .aff-save').click();
  await L.settle(page);
  check(r, 'a write RLS filtered out is reported, not claimed', /nothing was saved/.test(await L.toastText(page)), await L.toastText(page));
  r.evidence = { dialogs: log.dialogs.map(d => d.message.slice(0, 80)) };
  await page.context().close();
  return r;
};

// ── 13. Spine entry save + approve ───────────────────────────────────────────
S['spine-approve'] = async (b) => {
  const r = { id: 'spine-approve', title: 'Exercises → open a draft → edit → Approve', checks: [] };
  const { page } = await L.openCoach(b, { hash: 'exercises' });
  await page.locator('button[data-open="machine-leg-press"]').click();
  await page.locator('textarea[data-sf=purpose]').waitFor();
  await page.locator('textarea[data-sf=purpose]').fill('Harness purpose line.');
  const n0 = await L.nCalls(page);
  await page.locator('.sp-save[data-ap="1"]').click();
  await L.settle(page, 700);
  const cs = await L.callsSince(page, n0);
  // Since stage48 the save is ONE call, and it sends only what changed (here: purpose, status, and Claude's
  // suggested qualities, which go up with the first save of an entry that has none).
  const sv = lastOf(cs, x => x.kind === 'rpc' && x.name === 'coach_save_spine');
  const pe = sv && sv.payload.p_entry;
  check(r, 'one coach_save_spine call for that entry, with the approved status and the edited purpose', sv && sv.payload.p_id === 'machine-leg-press' && pe.status === 'approved' && pe.purpose === 'Harness purpose line.', sv && sv.payload);
  check(r, 'only the changed columns are sent', pe && Object.keys(pe).sort().join() === 'purpose,qualities,status', pe && Object.keys(pe));
  check(r, 'the snapshot carries what the page read for exactly those columns', sv && Object.keys(sv.payload.p_entry_snap).sort().join() === 'purpose,qualities,status' && sv.payload.p_entry_snap.status === 'draft', sv && sv.payload.p_entry_snap);
  check(r, 'the coach-only half is not sent when nothing coach-only changed', sv && Object.keys(sv.payload.p_coach).length === 0, sv && sv.payload.p_coach);
  check(r, 'no direct table writes from the page', !cs.some(x => x.kind === 'from' && x.op !== 'select'), cs.filter(x => x.kind === 'from' && x.op !== 'select').map(x => x.name + ':' + x.op));
  const d = await L.db(page);
  const e = d.exercises.find(x => x.id === 'machine-leg-press');
  check(r, 'untouched fields are unchanged on the server (easier, equipment, loads) and the suggestion is saved', JSON.stringify(e.easier) === '["goblet-squat"]' && JSON.stringify(e.equipment) === '["machine"]' && JSON.stringify(e.loads) === '["knee"]' && JSON.stringify(e.qualities) === '["strength","muscle"]', { easier: e.easier, equipment: e.equipment, loads: e.loads, qualities: e.qualities });
  const coach = d.exercise_coach.find(x => x.id === 'machine-leg-press');
  check(r, 'exercise_coach keeps every column', coach.suggested_changes && coach.links_before && coach.links_history && coach.notes === 'fixture coach note', Object.keys(coach));
  check(r, 'the entry is now in Approved and the editor closed', e.status === 'approved' && (await page.locator('textarea[data-sf=purpose]').count()) === 0, '');
  r.evidence = { savePayload: sv && sv.payload };
  await page.context().close();
  return r;
};

// ── 14. Create a login (Edge Function) ───────────────────────────────────────
S['login-create'] = async (b) => {
  const r = { id: 'login-create', title: 'Athlete → File → Create login (athlete-login Edge Function)', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'a/eli_new/file' });
  await page.locator('#athPw').fill('short');
  let n0 = await L.nCalls(page);
  await page.locator('.pwform .btn.primary').click();
  await L.settle(page, 300);
  check(r, 'a too-short typed password is stopped before any call', (await L.callsSince(page, n0)).filter(c => c.kind === 'fn').length === 0 && /8 to 72/.test(await L.toastText(page)), await L.toastText(page));
  await page.locator('#athPw').fill('');
  n0 = await L.nCalls(page);
  await page.locator('.pwform .btn.primary').click();
  await L.settle(page, 800);
  const fn = lastOf(await L.callsSince(page, n0), c => c.kind === 'fn');
  check(r, 'invoke("athlete-login", {action:create, athlete_id:eli_new}) and no password key', fn && fn.name === 'athlete-login' && fn.payload.action === 'create' && fn.payload.athlete_id === 'eli_new' && !('password' in fn.payload), fn && fn.payload);
  // Since 2026-10-10 the password is shown in place on the athlete's File tab (Copy / Mark sent), not in a one-off alert.
  const card = await page.locator('.credrow .credpass').first().innerText().catch(() => '');
  check(r, 'the new password is shown on the athlete\'s File tab with Copy and Mark sent', !!card && (await page.locator('.credrow button', { hasText: 'Mark sent' }).count()) > 0, card);
  const clip = await page.evaluate(() => navigator.clipboard.readText()).catch(e => 'clipboard error: ' + e.message);
  check(r, 'the WhatsApp message is on the clipboard', /Username: eli_new/.test(clip), clip.split('\n').slice(0, 3));
  check(r, 'the File tab now shows the login', /has a username and password/.test(await page.locator('#content').innerText()), '');
  await page.evaluate(() => window.__STUB.fail.push({ kind: 'fn', name: 'athlete-login', message: 'fixture: function down', status: 500, times: 1 }));
  await page.locator('button', { hasText: 'Change password' }).click();
  await page.locator('#athPw').fill('');
  await page.locator('.pwform .btn.primary').click();
  await L.settle(page, 600);
  check(r, 'a function error is shown with its message', log.dialogs.some(d => /Could not reset the login:\s+fixture: function down/.test(d.message)), log.dialogs.slice(-1));
  await page.context().close();
  return r;
};

// ── 15. Delete a call log ────────────────────────────────────────────────────
S['calllog-delete'] = async (b) => {
  const r = { id: 'calllog-delete', title: 'Athlete → Calls → Delete a call log', checks: [] };
  const { page } = await L.openCoach(b, { hash: 'a/ava_test/calls' });
  const before = await page.locator('details.day-c').count();
  const n0 = await L.nCalls(page);
  await page.locator('details.day-c').first().locator('summary').click();
  await page.locator('details.day-c').first().locator('.btn.danger').click();
  await L.settle(page, 800);
  const del = lastOf(await L.callsSince(page, n0), c => c.name === 'call_logs' && c.op === 'delete');
  check(r, 'delete on call_logs by id', del && del.filters.length === 1 && /^id\.eq\./.test(del.filters[0]), del && del.filters);
  const after = await page.locator('details.day-c').count();
  const sub = (await page.locator('.subrail .stab', { hasText: 'Calls' }).innerText()).replace(/\s+/g, ' ');
  check(r, 'the deleted call disappears from the list and the count', after === before - 1, { before, after, subtab: sub, inDb: (await L.db(page)).call_logs.length });
  await page.context().close();
  return r;
};

// ── 16. Restore a programme version ──────────────────────────────────────────
S['version-restore'] = async (b) => {
  const r = { id: 'version-restore', title: 'File → Version history → Restore, then look at The work', checks: [] };
  const { page } = await L.openCoach(b, { hash: 'a/ava_test/work' });
  const ed = await openEditor(page, 'Goblet Squat');
  await setField(ed, 'exSets', 5);
  await ed.locator('.exed-acts button', { hasText: 'Save' }).click();
  await L.settle(page, 600);
  await L.go(page, 'a/ava_test/file');
  await page.locator('details.rawlog summary', { hasText: 'Version history' }).click();
  await page.locator('#pvlist .pvrow').first().waitFor();
  const n0 = await L.nCalls(page);
  await page.locator('#pvlist .pvrow button').first().click();
  await L.settle(page, 800);
  const up = lastOf(await L.callsSince(page, n0), isUpd('programs'));
  check(r, 'programs.update with the stored version', up && up.payload.data.workouts.days[0].blocks[1].exercises[0].rx.sets === 4, up && up.payload.data.workouts.days[0].blocks[1].exercises[0].rx);
  await L.go(page, 'a/ava_test/work');
  const shown = await doseText(page, 'Goblet Squat');
  check(r, 'The work shows the restored prescription (4 × 10)', /4 × 10/.test(shown), shown);
  await page.context().close();
  return r;
};

// ── 17. Publish a programme file while that athlete was open ──────────────────
S['program-file-publish'] = async (b) => {
  const r = { id: 'program-file-publish', title: 'Athletes → ↑ Publish programme file (athlete viewed earlier)', checks: [] };
  const { page, seed } = await L.openCoach(b, { hash: 'a/ava_test/work' });
  const file = JSON.parse(JSON.stringify(seed.db.programs[0].data));
  file.athlete.id = 'ava_test';
  file.cycles = [{ name: 'Cycle 9 — From The File', weeks: '4 weeks' }];
  const fp = path.join(L.OUT, 'ava_test.fixture.json'); fs.writeFileSync(fp, JSON.stringify(file));
  await L.go(page, 'athletes');
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), (async () => { await page.evaluate(() => document.querySelectorAll('details.tools').forEach(d => d.open = true)); await page.locator('button', { hasText: 'Publish programme file' }).click(); })()]);
  const n0 = await L.nCalls(page);
  await chooser.setFiles(fp);
  await L.settle(page, 900);
  const up = lastOf(await L.callsSince(page, n0), c => c.name === 'programs' && c.op === 'upsert');
  check(r, 'programs.upsert onConflict athlete_id', up && up.opts.onConflict === 'athlete_id', up && up.opts);
  await L.go(page, 'a/ava_test/work');
  const head = await page.locator('.cycbar').innerText().catch(() => '');
  check(r, 'the athlete page shows the published cycle', /From The File/i.test(head), head);
  // a brand-new athlete published the same way
  const nf = JSON.parse(JSON.stringify(file)); nf.athlete.id = 'zed_new'; nf.athlete.firstName = 'Zed';
  const fp2 = path.join(L.OUT, 'zed_new.fixture.json'); fs.writeFileSync(fp2, JSON.stringify(nf));
  await L.go(page, 'athletes');
  const [ch2] = await Promise.all([page.waitForEvent('filechooser'), (async () => { await page.evaluate(() => document.querySelectorAll('details.tools').forEach(d => d.open = true)); await page.locator('button', { hasText: 'Publish programme file' }).click(); })()]);
  await ch2.setFiles(fp2);
  await L.settle(page, 900);
  const onRoster = await page.locator('#rosterBox .ath', { hasText: 'Zed' }).count();
  const inDb = (await L.db(page)).programs.some(p => p.athlete_id === 'zed_new');
  check(r, 'a NEW athlete appears on the roster after "Programme published"', onRoster === 1, { onRoster, inDb, toast: await L.toastText(page) });
  await page.context().close();
  return r;
};

// ── 18. Backup ───────────────────────────────────────────────────────────────
// The list under test is the PAGE's own BACKUP_TABLES (read in the scenario below), not a second copy here that could drift.
// Tables that were each missing from the backup once with nothing erroring (CLAUDE.md, "A table added to the public schema goes
// into BACKUP_TABLES the same day"): they must stay on it.
const MUST_BE_BACKED_UP = ['exercises', 'exercise_coach', 'qualities', 'coaching_log_versions', 'spine_versions', 'hab_season_results',
  'assess_players', 'assess_notes', 'assess_results'];
async function takeBackup(page, tag) {
  await L.go(page, 'athletes');
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), (async () => { await page.evaluate(() => document.querySelectorAll('details.tools').forEach(d => d.open = true)); await page.locator('details.tools button', { hasText: 'Backup' }).click(); })()]);
  const fp = path.join(L.OUT, 'backup-' + tag + '.json');
  await dl.saveAs(fp);
  await L.settle(page, 300);
  return { file: JSON.parse(fs.readFileSync(fp, 'utf8')), name: dl.suggestedFilename(), fp };
}
S['backup-basic'] = async (b) => {
  const r = { id: 'backup-basic', title: 'Athletes → ⤓ Backup: every table, every row', checks: [] };
  const { page, log } = await L.openCoach(b, {});
  const live = await L.db(page);
  const { file, name } = await takeBackup(page, 'basic');
  const listed = await page.evaluate(() => BACKUP_TABLES.slice());
  const missing = listed.filter(t => !(t in file.tables));
  const wrong = listed.filter(t => file.tables[t] && file.tables[t].length !== (live[t] || []).length).map(t => t + ' ' + file.tables[t].length + '/' + (live[t] || []).length);
  check(r, 'every listed table present with every row', !missing.length && !wrong.length, { missing, wrong, name });
  check(r, 'the tables that were once missing are still on the list', MUST_BE_BACKED_UP.every(t => listed.includes(t)), MUST_BE_BACKED_UP.filter(t => !listed.includes(t)));
  const assess = ['assess_players', 'assess_notes', 'assess_results'].map(t => [t, (live[t] || []).length, (file.tables[t] || []).length]);
  check(r, 'the testing app\'s players, notes and results (stage50) come back with every row, soft-deleted ones included', assess.every(([, onServer, inFile]) => onServer > 0 && onServer === inFile), assess);
  const pw = ['athlete_identities', 'tps_accounts', 'assess_accounts'].map(t => [t, (file.tables[t] || []).filter(x => x.initial_password).length]);
  check(r, 'no plaintext login passwords in the file', pw.every(([, n]) => n === 0), pw);
  check(r, 'alert summarises the counts', log.dialogs.some(d => /Backup downloaded/.test(d.message)), log.dialogs.map(d => d.message.split('\n')[0]));
  await page.context().close();
  return r;
};
S['backup-paging'] = async (b) => {
  const r = { id: 'backup-paging', title: 'Backup with 2,345 session_history rows (paging), a 500-row server cap, and a write mid-backup', checks: [] };
  // a) paging past 1000
  let { page, log } = await L.openCoach(b, { seed: { bigHistory: 2340 } });
  let live = await L.db(page);
  let n0 = await L.nCalls(page);
  let { file } = await takeBackup(page, 'paging');
  let pages = (await L.callsSince(page, n0)).filter(c => c.name === 'session_history' && c.op === 'select');
  check(r, 'all session_history rows are in the file', file.tables.session_history.length === live.session_history.length, { inFile: file.tables.session_history.length, onServer: live.session_history.length });
  check(r, 'pages are ordered by a key (stable paging)', pages.every(p => p.mods.order.length > 0), pages.map(p => ({ range: p.mods.range, order: p.mods.order })));
  await page.context().close();
  // b) server max-rows below 1000
  ({ page, log } = await L.openCoach(b, { seed: { bigHistory: 2340, stub: { maxRows: 500 } } }));
  live = await L.db(page);
  ({ file } = await takeBackup(page, 'maxrows500'));
  check(r, 'a server page cap under 1000 does not truncate silently', file.tables.session_history.length === live.session_history.length || log.dialogs.some(d => /truncat|incomplete|could not/i.test(d.message)),
    { inFile: file.tables.session_history.length, onServer: live.session_history.length, alertFirstLines: log.dialogs.map(d => d.message.split('\n').slice(0, 1)) });
  await page.context().close();
  // c) one row updated between page 1 and page 2 (Postgres writes the new tuple elsewhere in the heap)
  ({ page, log } = await L.openCoach(b, { seed: { bigHistory: 2340 } }));
  await page.evaluate(() => {
    window.__STUB.afterSelect = function (table, call, DB) {
      if (table === 'session_history' && call.mods.range && call.mods.range[0] === 0 && !window.__moved) {
        window.__moved = true; const t = DB.session_history; const row = t.splice(5, 1)[0]; row.coach_status = 'read'; t.push(row);
      }
    };
  });
  live = await L.db(page);
  ({ file } = await takeBackup(page, 'concurrent'));
  const key = x => x.athlete_id + '|' + x.day + '|' + x.completed_on;
  const got = new Set(file.tables.session_history.map(key));
  const lost = live.session_history.map(key).filter(k => !got.has(k));
  const dups = file.tables.session_history.length - got.size;
  check(r, 'a write during the backup loses no row', lost.length === 0, { rowsLost: lost.length, duplicates: dups, inFile: file.tables.session_history.length });
  await page.context().close();
  return r;
};

// ── 18b. Backfill a past session from an email, then delete it ────────────────
S['session-import-delete'] = async (b) => {
  const r = { id: 'session-import-delete', title: 'The work → + Add past session from email → Save; then Raw log → Delete this log', checks: [] };
  const { page, today } = await L.openCoach(b, { hash: 'a/ava_test/work' });
  const email = ['Full summary', 'Day 3 — Pull Day (fixture)', 'Status: Complete', 'Session RPE: 8/10', 'Duration: 40 min', '',
    'Notes from athlete', 'Fixture imported note.', '', 'Exercise log:', '[Primary]', '• Trap Bar Deadlift (✓)', '    Set 1: 80 @7 ✓', '    Set 2: 80 @8 ✓'].join('\n');
  await page.locator('button', { hasText: 'Add past session from email' }).click();
  await page.locator('#as-paste').fill(email);
  await page.locator('button', { hasText: 'Read email' }).click();
  const day = require('./fixtures').daysAgo(today, 5);
  await page.locator('#as-date').fill(day);
  let n0 = await L.nCalls(page);
  await page.locator('#as-save').click();
  await L.settle(page, 800);
  const c = (await L.callsSince(page, n0)).filter(x => x.name === 'save_session').slice(-1)[0];
  check(r, 'save_session(ava_test, day 3, date, {...}, p_key null)', c && c.payload.p_athlete_id === 'ava_test' && c.payload.p_day === 3 && c.payload.p_completed_on === day && c.payload.p_key === null && c.payload.p_session.session_rpe === '8', c && Object.assign({}, c.payload, { p_session: Object.assign({}, c.payload.p_session, { summary: '(' + c.payload.p_session.summary.length + ' chars)' }) }));
  const card3 = page.locator('.wday', { hasText: 'Pull Day (fixture)' });
  check(r, 'Day 3 now shows the imported session', /Complete/.test(await card3.locator('.wday-top').innerText()), (await card3.locator('.wday-top').innerText()).replace(/\s+/g, ' '));
  await card3.locator('.wday-top').click();
  n0 = await L.nCalls(page);
  await card3.locator('details.rawlog summary').first().click();
  await card3.locator('button', { hasText: 'Delete this log' }).click();
  await L.settle(page, 800);
  const del = (await L.callsSince(page, n0)).filter(x => x.name === 'session_history' && x.op === 'delete').slice(-1)[0];
  check(r, 'delete filtered on athlete, day and date (the primary key)', del && del.filters.length === 3, del && del.filters);
  check(r, 'Day 3 is back to not logged', /not logged yet/.test(await page.locator('.wday', { hasText: 'Pull Day (fixture)' }).locator('.wday-top').innerText()), '');
  await page.context().close();
  return r;
};

S['session-import-replace'] = async (b) => {
  const r = { id: 'session-import-replace', title: 'Add past session over one already on that date: the email really replaces it', checks: [] };
  const { page, today } = await L.openCoach(b, { hash: 'a/ava_test/work' });
  const day = require('./fixtures').daysAgo(today, 6);
  await page.evaluate(d => {
    window.__DB.session_history.push({ athlete_id: 'ava_test', athlete_name: 'Ava Example', day: 3, completed_on: d, status: 'Complete', session_rpe: 7, duration_min: 30,
      readiness: null, day_note: '', focus: 'Pull Day (fixture)', summary: 'Day 3 — Pull Day (fixture)\nExercise log:\n• Old Lift (✓)', log: [{ ex: 'Old Lift', sets: [] }], coach_status: 'read', updated_at: new Date().toISOString() });
  }, day);
  await page.evaluate(() => hardRefresh()); await L.settle(page, 800);
  const email = ['Full summary', 'Day 3 — Pull Day (fixture)', 'Status: Complete', 'Session RPE: 8/10', 'Duration: 40 min', '', 'Exercise log:', '[Primary]', '• Trap Bar Deadlift (✓)', '    Set 1: 80 @7 ✓'].join('\n');
  await page.locator('button', { hasText: 'Add past session from email' }).click();
  await page.locator('#as-paste').fill(email);
  await page.locator('button', { hasText: 'Read email' }).click();
  await page.locator('#as-date').fill(day);
  const n0 = await L.nCalls(page);
  await page.locator('#as-save').click(); await L.settle(page, 800);
  const c = (await L.callsSince(page, n0)).filter(x => x.name === 'save_session').slice(-1)[0];
  check(r, 'save_session asks to replace the old log', c && c.payload.p_session.replace_log === true, c && c.payload.p_session.replace_log);
  const row = (await L.db(page)).session_history.find(x => x.athlete_id === 'ava_test' && x.day === 3 && x.completed_on === day);
  check(r, "the old set-by-set log is gone, so coach and athlete see the email's session", row && row.log == null && /Trap Bar Deadlift/.test(row.summary), row && { log: row.log });
  await page.context().close();
  return r;
};

// The email's check-in line (audit FILE-8, 2026-10-10): the import stores the day's verdict the way the app does.
S['session-import-checkin'] = async (b) => {
  const r = { id: 'session-import-checkin', title: 'Add past session from email: the Today: check-in line is read and stored', checks: [] };
  const { page, today } = await L.openCoach(b, { hash: 'a/ava_test/work' });
  const LOWER = 'lower day (every RPE 1 lower, never below 6)', SORE = 'sore: jumps and landings halved';
  const email = ['Athlete', 'Ava Example', '', 'Day', 'Day 3 — Pull Day (fixture)', '', 'Status', 'Complete', '', 'Session RPE', '8/10', '', 'Duration', '40 min', '',
    'Readiness', `Composite 3.5/5 · Sleep 3 · Energy 4 · Soreness 2 · Stress 4 · Overall 3 · ${LOWER} · ${SORE} — trained as written by choice`, '',
    'Notes from athlete', 'Fixture imported note.', '', 'Full summary',
    'Day 3 — Pull Day (fixture)', 'Status: Complete', 'Session RPE: 8/10', 'Duration: 40 min', '',
    'Readiness (at start) — composite 3.5/5:', '  Sleep last night: 3/5 (Okay)', '  Energy levels: 4/5 (Good)', '  How sore are you: 2/5 (Quite sore)',
    '  Stress: 4/5 (Calm)', '  How ready do you feel overall: 3/5 (Okay)', `Today: ${LOWER} · ${SORE} — trained as written by choice`, '',
    'Notes from athlete:', 'Fixture imported note.', '', 'Exercise log:', '', '[Primary]', '• Trap Bar Deadlift (✓)', '    Set 1: 80 ×6 @7 ✓', '    Set 2: 80 ×6 @8 ✓'].join('\n');
  await page.locator('button', { hasText: 'Add past session from email' }).click();
  await page.locator('#as-paste').fill(email);
  await page.locator('button', { hasText: 'Read email' }).click();
  const preview = await page.locator('#as-preview').innerText();
  check(r, 'the preview shows the verdict beside the readiness number', /3\.5\/5 · lower day · sore: jumps halved \(trained as written\)/.test(preview.replace(/\s+/g, ' ')), preview.replace(/\s+/g, ' ').slice(0, 300));
  const day = require('./fixtures').daysAgo(today, 5);
  await page.locator('#as-date').fill(day);
  const n0 = await L.nCalls(page);
  await page.locator('#as-save').click(); await L.settle(page, 800);
  const c = (await L.callsSince(page, n0)).filter(x => x.name === 'save_session').slice(-1)[0];
  const rd = c && c.payload.p_session.readiness;
  check(r, 'save_session carries the verdict in the shape the app stores', rd && rd.level === 'amber' && rd.sore === 'half' && rd.drop === 1 && rd.asWritten === true && rd.score === 3.5, rd);
  check(r, 'and the answers', rd && rd.composite === 3.5 && rd.sleep === 3 && rd.soreness === 2, rd);
  const top = await page.locator('.wday', { hasText: 'Pull Day (fixture)' }).locator('.wday-top').innerText();
  check(r, 'the day card names it like any session the app sent', /lower day · sore: jumps halved \(trained as written\)/.test(top.replace(/\s+/g, ' ')), top.replace(/\s+/g, ' '));
  // An email with no check-in line stores no verdict.
  await page.locator('button', { hasText: 'Add past session from email' }).click();
  await page.locator('#as-paste').fill(email.replace(/Today: [^\n]*\n/, '').replace(/ · lower day[^\n]*/, ''));
  await page.locator('button', { hasText: 'Read email' }).click();
  await page.locator('#as-date').fill(require('./fixtures').daysAgo(today, 9));
  const n1 = await L.nCalls(page);
  await page.locator('#as-save').click(); await L.settle(page, 800);
  const c2 = (await L.callsSince(page, n1)).filter(x => x.name === 'save_session').slice(-1)[0];
  const rd2 = c2 && c2.payload.p_session.readiness;
  check(r, 'no check-in line: the answers are stored and no verdict is invented', rd2 && rd2.composite === 3.5 && rd2.level === undefined && rd2.sore === undefined, rd2);
  await page.context().close();
  return r;
};

S['login-used-mark'] = async (b) => {
  const r = { id: 'login-used-mark', title: 'Logins to send marks a password that has already been used to sign in', checks: [] };
  const { page } = await L.openCoach(b, { hash: 'athletes' });
  check(r, 'an unused stored password carries no mark', (await page.locator('.creds .credrow', { hasText: 'ben_test' }).locator('.fl.good').count()) === 0, '');
  await page.evaluate(() => { window.__DB.athlete_identities.find(x => x.athlete_id === 'ben_test').signed_in_test = true; });
  await page.evaluate(() => hardRefresh()); await L.settle(page, 800);
  const row = page.locator('.creds .credrow', { hasText: 'ben_test' });
  check(r, 'after they sign in, the row says "signed in with it"', /signed in with it/.test(await row.innerText()), await row.innerText());
  await page.context().close();
  return r;
};

S['calls-load-fail'] = async (b) => {
  const r = { id: 'calls-load-fail', title: 'Call logs fail to load: the Calls tab says so (it said "No call logs yet")', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'today' });
  await page.evaluate(() => { window.__STUB.fail.push({ kind: 'from', name: 'call_logs', op: 'select', message: 'fixture: offline', times: 1 }); });
  await L.go(page, 'a/ava_test/calls');
  const txt = await page.locator('#content').innerText();
  check(r, 'the tab names the failure', /Call logs did not load/.test(txt) && !/No call logs yet/.test(txt), txt.slice(0, 300));
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

S['route-unknown-sub'] = async (b) => {
  const r = { id: 'route-unknown-sub', title: 'A link with an unknown screen name opens the athlete, not "no athlete"', checks: [] };
  const { page } = await L.openCoach(b, { hash: 'a/ava_test/nonsense' });
  const st = await page.evaluate(() => route());
  check(r, 'route reads the athlete id', st.view === 'detail' && st.id === 'ava_test', st);
  check(r, 'the file opens', !/No athlete/.test(await page.locator('#content').innerText()), '');
  await page.context().close();
  return r;
};

// ── 19. Clear the note backlog ───────────────────────────────────────────────
S['backlog-clear'] = async (b) => {
  const r = { id: 'backlog-clear', title: 'Today → Needs you → Clear older notes', checks: [] };
  const { page } = await L.openCoach(b, {});
  const n0 = await L.nCalls(page);
  await page.locator('#needPanel button', { hasText: 'Clear' }).click();
  await L.settle(page, 700);
  const ups = (await L.callsSince(page, n0)).filter(isUpd('session_history'));
  // Since 2026-10-10: exactly the rows the dialog counted, each by its key (never a date filter
  // that also catches notes that arrived after the page loaded).
  check(r, 'updates are by key (athlete, day, completed_on), one per counted note', ups.length > 0 && ups.every(u => ['athlete_id', 'day', 'completed_on'].every(k => u.filters.some(f => f.startsWith(k + '.eq.'))) && !u.filters.some(f => /^completed_on\.lt\./.test(f))), ups.map(u => u.filters));
  const d = await L.db(page);
  check(r, 'the old note is read, the recent one is not', d.session_history.find(s => s.athlete_id === 'ben_test' && s.day === 2).coach_status === 'read' && d.session_history.find(s => s.athlete_id === 'ava_test' && s.day === 1 && s.day_note).coach_status === 'new', '');
  check(r, 'the backlog row is gone', (await page.locator('#needPanel button', { hasText: 'Clear' }).count()) === 0, '');
  await page.context().close();
  return r;
};

// A note's age is when it ARRIVED, not the day the athlete trained (audit TODAY-2, 2026-10-10): a phone that
// syncs a fortnight late delivers a note that is new to the coach.
S['backlog-late-note'] = async (b) => {
  const r = { id: 'backlog-late-note', title: 'A note synced late about an old session reaches Needs you, newest arrival first', checks: [] };
  const { page, today } = await L.openCoach(b, {});
  const FX = require('./fixtures');
  await page.evaluate(([old30, old12]) => {
    const now = new Date().toISOString();
    const row = (id, name, day, on, note, upd) => ({ athlete_id: id, athlete_name: name, day, completed_on: on, status: 'Complete', session_rpe: 7, duration_min: 50,
      readiness: null, day_note: note, focus: '', summary: 'Day ' + day + ' — fixture', coach_status: 'new', log: null, updated_at: upd });
    // eli: trained 30 days ago, the phone synced it today.
    window.__DB.session_history.push(row('eli_new', 'Eli Example', 1, old30, 'Fixture late-synced note.', now));
    // ava: an older session (12 days ago) whose note arrived today, beside the fixture's own note from yesterday.
    window.__DB.session_history.push(row('ava_test', 'Ava Example', 3, old12, 'Fixture newest arrival.', now));
  }, [FX.daysAgo(today, 30), FX.daysAgo(today, 12)]);
  await page.evaluate(() => hardRefresh()); await L.settle(page, 900);
  const st = await page.evaluate(() => ({
    eli: { recent: S.ath.eli_new.needReplyRecent.length, stale: S.ath.eli_new.needReplyStale },
    ben: { recent: S.ath.ben_test.needReplyRecent.length, stale: S.ath.ben_test.needReplyStale },
    avaOrder: S.ath.ava_test.needReplyRecent.map(s => s.day),
    reasons: S.ath.eli_new.reasons.map(x => x.key + ':' + x.text),
  }));
  check(r, 'a 30-day-old session whose note arrived today is waiting, not backlog', st.eli.recent === 1 && st.eli.stale === 0, st.eli);
  check(r, 'it shows in Needs you as a note to read', st.reasons.some(x => /^note:1 note to read/.test(x)), st.reasons);
  check(r, 'a note that really is old (arrived 25 days ago) is still backlog', st.ben.recent === 0 && st.ben.stale === 1, st.ben);
  check(r, 'newest arrival first: the session trained 12 days ago but delivered today comes before yesterday\'s', st.avaOrder.join() === '3,1', st.avaOrder);
  const need = await page.locator('#needPanel .need', { hasText: 'Eli' }).first().innerText();
  check(r, 'the Needs you row quotes the late note', /Day 1 note: “Fixture late-synced note\.”/.test(need), need.replace(/\s+/g, ' '));
  const ava = await page.locator('#needPanel .need', { hasText: 'Ava' }).first().innerText();
  check(r, 'Ava\'s row opens the newest arrival', /Day 3 note: “Fixture newest arrival\.”/.test(ava), ava.replace(/\s+/g, ' '));
  const back = await page.locator('#needPanel', { hasText: 'older note' }).first().innerText();
  check(r, 'the backlog row counts only the one that is truly old, and says "arrived"', /1 older note/.test(back) && /arrived more than 14 days ago/.test(back), back.replace(/\s+/g, ' '));
  // Clearing the backlog leaves the late note alone.
  await page.locator('#needPanel button', { hasText: 'Clear' }).click(); await L.settle(page, 700);
  const d = await L.db(page);
  check(r, 'Clear older notes marks the old one read and leaves the late one waiting',
    d.session_history.find(x => x.athlete_id === 'ben_test' && x.day === 2).coach_status === 'read' && d.session_history.find(x => x.athlete_id === 'eli_new' && x.day === 1).coach_status === 'new', '');
  await page.context().close();
  return r;
};

// ── 20. Delete all data ──────────────────────────────────────────────────────
S['athlete-delete-all'] = async (b) => {
  const r = { id: 'athlete-delete-all', title: 'File → Danger zone → Delete training history: one call, one transaction', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'a/ben_test/file' });
  const before = await L.db(page);
  const n0 = await L.nCalls(page);
  await page.locator('button', { hasText: /Delete training history/ }).click();
  await L.settle(page, 1200);
  const cs = await L.callsSince(page, n0);
  const rpc = cs.filter(c => c.kind === 'rpc' && c.name === 'coach_delete_training_history');
  check(r, 'one coach_delete_training_history call for that athlete', rpc.length === 1 && rpc[0].payload.p_athlete_id === 'ben_test', rpc.map(c => c.payload));
  check(r, 'no separate deletes from the page (the old two-step)', !cs.some(c => c.kind === 'from' && c.op === 'delete'), cs.filter(c => c.op === 'delete').map(c => c.name));
  const d = await L.db(page);
  check(r, 'that athlete has no sessions and no progress snapshot left', !d.session_history.some(x => x.athlete_id === 'ben_test') && !d.athlete_progress.some(x => x.athlete_id === 'ben_test'),
    { sessions: d.session_history.filter(x => x.athlete_id === 'ben_test').length, progress: d.athlete_progress.filter(x => x.athlete_id === 'ben_test').length });
  check(r, 'another athlete keeps theirs', d.session_history.filter(x => x.athlete_id === 'ava_test').length === before.session_history.filter(x => x.athlete_id === 'ava_test').length && d.athlete_progress.some(x => x.athlete_id === 'ava_test'), '');
  check(r, 'the toast says how many sessions went', /Deleted 2 sessions and the app data/.test(await L.toastText(page)), await L.toastText(page));
  const onRoster = await page.evaluate(() => !!S.ath.ben_test);
  check(r, 'the confirm says what stays, and they are still on the roster', /programme|login/i.test(log.dialogs.map(x => x.message).join(' ')) && onRoster, { stillOnRoster: onRoster, confirmText: log.dialogs.map(x => x.message.replace(/\n+/g, ' ').slice(0, 160)) });
  await page.context().close();
  return r;
};

// The server refuses (or is unreachable, or the sign-in lapsed, or stage48 is not applied): nothing is removed and
// the page says why, in words that fit the cause.
S['athlete-delete-fails'] = async (b) => {
  const r = { id: 'athlete-delete-fails', title: 'Delete training history when the server refuses: nothing goes, and the message fits the cause', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'a/ben_test/file' });
  const cases = [
    { name: 'a server error', set: () => window.__STUB.fail.push({ kind: 'rpc', name: 'coach_delete_training_history', message: 'fixture: connection reset', times: 1 }), say: /Nothing was deleted: fixture: connection reset/ },
    { name: 'a lapsed sign-in', set: () => window.__STUB.fail.push({ kind: 'rpc', name: 'coach_delete_training_history', message: 'permission denied for function coach_delete_training_history', times: 1 }), say: /sign-in may have lapsed/ },
    { name: 'stage48 not applied', set: () => { window.__STUB.missingRpc = ['coach_delete_training_history']; }, say: /has not been applied/ },
    // No database code = the answer never arrived (a dropped connection): the delete may or may not have gone through,
    // so the page must not claim "nothing was removed" (here the stub did not run it, but the page cannot know that).
    { name: 'the answer never arrives', set: () => window.__STUB.fail.push({ kind: 'rpc', name: 'coach_delete_training_history', message: 'TypeError: Failed to fetch', code: '', times: 1 }), say: /answer never arrived[\s\S]*cannot tell whether Ben Example's training history was deleted/, unsure: true },
  ];
  for (const c of cases) {
    log.dialogs.length = 0;
    await page.evaluate(c.set);
    await page.locator('button', { hasText: /Delete training history/ }).click();
    await L.settle(page, 700);
    const alerts = log.dialogs.filter(x => x.type === 'alert').map(x => x.message);
    check(r, c.name + ': the alert says what is known, in words that fit', alerts.length === 1 && c.say.test(alerts[0]) && (c.unsure ? !/Nothing was (removed|deleted)/.test(alerts[0]) : /Nothing was removed/.test(alerts[0])), alerts);
    const d = await L.db(page);
    check(r, c.name + ': the sessions and the snapshot are both still there', d.session_history.filter(x => x.athlete_id === 'ben_test').length === 2 && d.athlete_progress.some(x => x.athlete_id === 'ben_test'), '');
  }
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

// ── 21. The Spine editor (Exercises tab) ─────────────────────────────────────
// Claude's /spine Upkeep writes the same rows by SQL while Amir reviews them. Since 2026-10-10 a save
// sends only the columns the coach changed, and refuses when someone else changed one of THOSE.
async function spineOpen(page, id) {
  await page.evaluate(() => { _spineQ = ''; });
  await page.locator('#spineQ').fill(id.replace(/-/g, ' '));
  await L.settle(page, 200);
  await page.locator(`button[data-open="${id}"]`).click();
  await page.locator('#spineEd').waitFor();
}
const serverSet = (page, table, id, patch) => page.evaluate(([t, i, p]) => {
  const row = window.__DB[t].find(r => r.id === i); Object.assign(row, p);
}, [table, id, patch]);
function dismissDialogs(page, log) {
  page.removeAllListeners('dialog');
  page.on('dialog', async d => { log.dialogs.push({ type: d.type(), message: d.message() }); await (d.type() === 'confirm' ? d.dismiss() : d.accept()).catch(() => {}); });
}

S['spine-save-keeps-claude'] = async (b) => {
  const r = { id: 'spine-save-keeps-claude', title: 'Claude fills an entry by SQL; Amir, in a tab opened earlier, adds a video and saves', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'exercises' });
  await spineOpen(page, 'goblet-squat');
  // What /spine Upkeep does meanwhile: a court line, a progression, a count and a cost, updated_at moved on.
  await serverSet(page, 'exercises', 'goblet-squat', { tennis: 'Claude court line', harder: ['machine-leg-press', 'dead-bug'], updated_at: new Date(Date.now() + 1000).toISOString(), updated_by: 'claude-pipeline' });
  await serverSet(page, 'exercise_coach', 'goblet-squat', { credits: { quads: 1, glutes: 1 }, cost: 'heavy' });
  await page.locator('[data-sf=video]').fill('https://www.youtube.com/watch?v=NEWVIDEO001');
  const n0 = await L.nCalls(page);
  await page.locator('.sp-save').first().click(); await L.settle(page, 700);
  const cs = await L.callsSince(page, n0);
  const up = lastOf(cs, c => c.kind === 'rpc' && c.name === 'coach_save_spine');
  const keys = up ? Object.keys(up.payload.p_entry).sort() : [];
  check(r, 'only the changed column goes up (video)', up && keys.join() === 'video', keys);
  check(r, 'the save names the value it read, so the server can tell a clash from a change elsewhere', up && up.payload.p_entry_snap.video === 'https://www.youtube.com/watch?v=FIXTURE0001', up && up.payload.p_entry_snap);
  check(r, 'the coach-only half is not sent at all', up && Object.keys(up.payload.p_coach).length === 0, up && up.payload.p_coach);
  check(r, 'no upsert or other write of a whole row from the page', !cs.some(c => c.kind === 'from' && c.op !== 'select'), cs.filter(c => c.kind === 'from' && c.op !== 'select').map(c => c.name + ':' + c.op));
  const d = await L.db(page);
  const e = d.exercises.find(x => x.id === 'goblet-squat'), k = d.exercise_coach.find(x => x.id === 'goblet-squat');
  check(r, "Claude's court line, progression, count and cost survive", e.tennis === 'Claude court line' && e.harder.length === 2 && k.cost === 'heavy' && k.credits.glutes === 1, { tennis: e.tennis, harder: e.harder, cost: k.cost, credits: k.credits });
  check(r, 'the video is saved', e.video === 'https://www.youtube.com/watch?v=NEWVIDEO001', e.video);
  check(r, 'no dialog on a clean save', !log.dialogs.length, log.dialogs);
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

S['spine-clash'] = async (b) => {
  const r = { id: 'spine-clash', title: 'Claude and Amir change the same field: refuse, keep the typing, save again on purpose', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'exercises' });
  await spineOpen(page, 'goblet-squat');
  await serverSet(page, 'exercises', 'goblet-squat', { purpose: 'Claude purpose', updated_at: new Date(Date.now() + 1000).toISOString(), updated_by: 'claude-pipeline' });
  await page.locator('[data-sf=purpose]').fill('Amir purpose');
  let n0 = await L.nCalls(page);
  await page.locator('.sp-save').first().click(); await L.settle(page, 700);
  check(r, 'nothing is written', (await L.db(page)).exercises.find(x => x.id === 'goblet-squat').purpose === 'Claude purpose', (await L.db(page)).exercises.find(x => x.id === 'goblet-squat').purpose);
  check(r, 'the dialog names the field and both values', log.dialogs.length === 1 && /Why it’s here: now "Claude purpose", was "Fixture purpose\."/.test(log.dialogs[0].message), log.dialogs.map(x => x.message));
  check(r, '...and says both halves were held back', log.dialogs.length === 1 && /Nothing was saved, to either half/.test(log.dialogs[0].message), log.dialogs.map(x => x.message));
  check(r, 'the typed text is still in the form', (await page.locator('[data-sf=purpose]').inputValue()) === 'Amir purpose', await page.locator('[data-sf=purpose]').count() ? await page.locator('[data-sf=purpose]').inputValue() : 'editor gone');
  n0 = await L.nCalls(page);
  await page.locator('.sp-save').first().click(); await L.settle(page, 700);
  const d = await L.db(page);
  check(r, 'Save again puts his over theirs', d.exercises.find(x => x.id === 'goblet-squat').purpose === 'Amir purpose', d.exercises.find(x => x.id === 'goblet-squat').purpose);
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

S['spine-load-fail'] = async (b) => {
  const r = { id: 'spine-load-fail', title: 'The coach-only half fails to load: no editor, no save of blanks', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'today' });
  await page.evaluate(() => { window.__STUB.fail.push({ kind: 'from', name: 'exercise_coach', op: 'select', message: 'fixture: network down', times: 1 }); });
  await L.go(page, 'exercises');
  const txt = await page.locator('#content').innerText();
  check(r, 'the tab says it did not load, with the reason', /did not load/i.test(txt) && /network down/.test(txt), txt.slice(0, 200));
  check(r, 'no editor or Save is offered', (await page.locator('.sp-save').count()) === 0 && (await page.locator('button[data-open]').count()) === 0, '');
  await page.locator('button', { hasText: 'Try again' }).first().click();
  await page.waitForFunction(() => !document.querySelector('#content .loading'));
  await L.settle(page, 300);
  check(r, 'Try again loads it', (await page.locator('#spineQ').count()) === 1, '');
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

S['spine-rename-guard'] = async (b) => {
  const r = { id: 'spine-rename-guard', title: 'Renaming an entry live cards find by name is stopped (one name, history moves with it)', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'exercises' });
  await spineOpen(page, 'goblet-squat');
  await page.locator('[data-sf=name]').fill('Dumbbell Goblet Squat');
  const n0 = await L.nCalls(page);
  await page.locator('.sp-save').first().click(); await L.settle(page, 600);
  check(r, 'nothing is written', !(await L.callsSince(page, n0)).some(c => c.name === 'exercises' && c.op !== 'select'), '');
  check(r, 'the dialog names the cards and /spine', log.dialogs.length === 1 && /card/.test(log.dialogs[0].message) && /\/spine/.test(log.dialogs[0].message), log.dialogs.map(x => x.message));
  // An alias that is another entry's name is refused too.
  log.dialogs.length = 0;
  await page.locator('[data-sf=name]').fill('Goblet Squat');
  await page.locator('[data-sf=aliases]').fill('Machine Leg Press');
  await page.locator('.sp-save').first().click(); await L.settle(page, 600);
  check(r, "an alias equal to another entry's name is refused", log.dialogs.length === 1 && /already how Machine Leg Press is written/.test(log.dialogs[0].message), log.dialogs.map(x => x.message));
  await page.context().close();
  return r;
};

S['spine-move-back-confirm'] = async (b) => {
  const r = { id: 'spine-move-back-confirm', title: '"Move back to draft" asks first, and a no writes nothing', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'exercises' });
  dismissDialogs(page, log);
  await spineOpen(page, 'goblet-squat');
  const n0 = await L.nCalls(page);
  await page.locator('.sp-save[data-ap="0"]').click(); await L.settle(page, 500);
  check(r, 'a confirm names what it does', log.dialogs.length === 1 && log.dialogs[0].type === 'confirm' && /off every phone/.test(log.dialogs[0].message), log.dialogs);
  check(r, 'a no writes nothing', !(await L.callsSince(page, n0)).some(c => c.op === 'update' || c.op === 'upsert'), '');
  check(r, 'still approved', (await L.db(page)).exercises.find(x => x.id === 'goblet-squat').status === 'approved', '');
  await page.context().close();
  return r;
};

S['spine-unsaved-guard'] = async (b) => {
  const r = { id: 'spine-unsaved-guard', title: 'Typed, unsaved work: opening another entry or leaving the tab asks first; a redraw keeps it', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'exercises' });
  dismissDialogs(page, log);
  await spineOpen(page, 'machine-leg-press');
  await page.locator('[data-sf=purpose]').fill('Half-typed purpose');
  await page.locator('#spineQ').fill('');   // the search redraws the whole tab
  await L.settle(page, 300);
  check(r, 'a redraw (search) keeps the typing', (await page.locator('[data-sf=purpose]').inputValue()) === 'Half-typed purpose', await page.locator('[data-sf=purpose]').inputValue());
  await page.locator('button[data-open="dead-bug"]').click(); await L.settle(page, 300);
  check(r, 'opening another entry asks first', log.dialogs.some(x => x.type === 'confirm' && /unsaved changes to Machine Leg Press/.test(x.message)), log.dialogs);
  check(r, 'a no keeps the editor and the text', (await page.locator('[data-sf=purpose]').inputValue()) === 'Half-typed purpose', '');
  log.dialogs.length = 0;
  await page.evaluate(() => { location.hash = 'today'; }); await L.settle(page, 400);
  check(r, 'leaving the tab asks first, and a no stays', log.dialogs.some(x => x.type === 'confirm') && /#exercises$/.test(page.url()) && (await page.locator('[data-sf=purpose]').inputValue()) === 'Half-typed purpose', { url: page.url(), dialogs: log.dialogs });
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

// stage48: the entry and the coach-only half are one transaction. A clash on EITHER half holds back BOTH.
S['spine-save-atomic'] = async (b) => {
  const r = { id: 'spine-save-atomic', title: 'A clash in the coach-only half holds the entry half back too; a failed save writes neither', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'exercises' });
  await spineOpen(page, 'goblet-squat');
  // Claude changes the coach-only note by SQL after the page read; Amir changes a video (entry) AND the same note.
  await serverSet(page, 'exercise_coach', 'goblet-squat', { notes: 'Claude coach note' });
  await page.locator('[data-sf=video]').fill('https://www.youtube.com/watch?v=AMIRVIDEO01');
  await page.locator('[data-sf=notes]').fill('Amir coach note');
  await page.locator('.sp-save').first().click(); await L.settle(page, 700);
  let d = await L.db(page);
  check(r, 'the clash on the coach-only note names it, with both values', log.dialogs.length === 1 && /Notes: now "Claude coach note", was "\(empty\)"/.test(log.dialogs[0].message), log.dialogs.map(x => x.message));
  check(r, 'the entry half was NOT saved either (before stage48 it was, and only the coach half was refused)', d.exercises.find(x => x.id === 'goblet-squat').video === 'https://www.youtube.com/watch?v=FIXTURE0001', d.exercises.find(x => x.id === 'goblet-squat').video);
  check(r, 'nothing was written to the coach-only half', d.exercise_coach.find(x => x.id === 'goblet-squat').notes === 'Claude coach note', d.exercise_coach.find(x => x.id === 'goblet-squat').notes);
  check(r, 'the typing is still in the form', (await page.locator('[data-sf=video]').inputValue()) === 'https://www.youtube.com/watch?v=AMIRVIDEO01' && (await page.locator('[data-sf=notes]').inputValue()) === 'Amir coach note', '');
  // Save again, on purpose: both go in together.
  log.dialogs.length = 0;
  await page.locator('.sp-save').first().click(); await L.settle(page, 700);
  d = await L.db(page);
  check(r, 'Save again puts both halves in, together', d.exercises.find(x => x.id === 'goblet-squat').video === 'https://www.youtube.com/watch?v=AMIRVIDEO01' && d.exercise_coach.find(x => x.id === 'goblet-squat').notes === 'Amir coach note' && !log.dialogs.length, { dialogs: log.dialogs });
  // The server fails: nothing is written, the form keeps the typing, and the alert says so.
  await page.locator('[data-sf=purpose]').fill('Typed before the failure');
  await page.locator('[data-sf=sfr]').fill('4');
  await page.evaluate(() => window.__STUB.fail.push({ kind: 'rpc', name: 'coach_save_spine', message: 'fixture: connection reset', times: 1 }));
  log.dialogs.length = 0;
  await page.locator('.sp-save').first().click(); await L.settle(page, 700);
  d = await L.db(page);
  check(r, 'a failed save writes neither half', d.exercises.find(x => x.id === 'goblet-squat').purpose === 'Fixture purpose.' && d.exercise_coach.find(x => x.id === 'goblet-squat').sfr === 2, { purpose: d.exercises.find(x => x.id === 'goblet-squat').purpose, sfr: d.exercise_coach.find(x => x.id === 'goblet-squat').sfr });
  check(r, 'the alert says nothing was saved, to either half, and keeps the typing', log.dialogs.length === 1 && /Could not save Goblet Squat: fixture: connection reset/.test(log.dialogs[0].message) && /Nothing was saved, to either half/.test(log.dialogs[0].message)
    && (await page.locator('[data-sf=purpose]').inputValue()) === 'Typed before the failure' && (await page.locator('[data-sf=sfr]').inputValue()) === '4', log.dialogs.map(x => x.message));
  // The answer never arrives (no database code): the save may have gone in, so the page must not say it did not.
  await page.evaluate(() => window.__STUB.fail.push({ kind: 'rpc', name: 'coach_save_spine', message: 'TypeError: Failed to fetch', code: '', times: 1 }));
  log.dialogs.length = 0;
  await page.locator('.sp-save').first().click(); await L.settle(page, 700);
  check(r, 'an answer that never arrived is not reported as "nothing was saved"', log.dialogs.length === 1 && /answer never arrived/.test(log.dialogs[0].message) && /cannot tell whether Goblet Squat was saved/.test(log.dialogs[0].message)
    && !/Nothing was saved/.test(log.dialogs[0].message) && (await page.locator('[data-sf=purpose]').inputValue()) === 'Typed before the failure', log.dialogs.map(x => x.message));
  // stage48 not applied: say so, change nothing.
  log.dialogs.length = 0;
  await page.evaluate(() => { window.__STUB.missingRpc = ['coach_save_spine']; });
  await page.locator('.sp-save').first().click(); await L.settle(page, 700);
  check(r, 'a server without stage48 is named, and nothing is saved', log.dialogs.length === 1 && /has not been applied/.test(log.dialogs[0].message) && (await L.db(page)).exercises.find(x => x.id === 'goblet-squat').purpose === 'Fixture purpose.', log.dialogs.map(x => x.message));
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

// stage49: an entry's history, and Undo through the same guarded save.
S['spine-history'] = async (b) => {
  const r = { id: 'spine-history', title: 'Exercises → an entry → History: every change, who made it, and Undo', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'exercises' });
  dismissDialogs(page, log); log.dialogs.length = 0;
  await spineOpen(page, 'goblet-squat');
  await page.locator('.spine-ed details.rawlog summary').click(); await L.settle(page, 400);
  let txt = await page.locator('#spvlist').innerText();
  check(r, 'a new entry has no history yet, and says so', /No earlier versions yet/.test(txt), txt.slice(0, 120));
  // Claude (SQL, no signed-in user) writes a court line; Amir saves a new video from the page.
  await page.evaluate(() => window.__sqlWrite('exercises', 'goblet-squat', { tennis: 'Claude court line' }));
  await page.locator('[data-sf=video]').fill('https://www.youtube.com/watch?v=NEWVIDEO001');
  // Claude's write landed after the page read, but on a column Amir is not changing: no clash.
  await page.locator('.sp-save').first().click(); await L.settle(page, 800);
  txt = await page.locator('#spvlist').innerText();
  check(r, 'History stayed open through the redraw and lists both changes, newest first', /you[\s\S]*Video[\s\S]*Claude \(SQL\)[\s\S]*On court/.test(txt), txt.replace(/\s+/g, ' ').slice(0, 400));
  check(r, 'it shows the old value then the new one', /Video: https:\/\/www\.youtube\.com\/watch\?v=FIXTURE0001 → https:\/\/www\.youtube\.com\/watch\?v=NEWVIDEO001/.test(txt) && /On court: \(empty\) → Claude court line/.test(txt), txt.replace(/\s+/g, ' ').slice(0, 400));
  check(r, 'every change is labelled by who made it', (await page.locator('#spvlist .spvwho').allInnerTexts()).join('|') === 'you|Claude (SQL)', await page.locator('#spvlist .spvwho').allInnerTexts());
  // Undo Amir's video change.
  const n0 = await L.nCalls(page);
  log.dialogs.length = 0;
  page.removeAllListeners('dialog');
  page.on('dialog', async d => { log.dialogs.push({ type: d.type(), message: d.message() }); await d.accept().catch(() => {}); });
  await page.locator('#spvlist .spvrow').first().locator('button', { hasText: 'Undo this change' }).click(); await L.settle(page, 900);
  const cs = await L.callsSince(page, n0);
  const sv = lastOf(cs, c => c.kind === 'rpc' && c.name === 'coach_save_spine');
  check(r, 'the confirm shows the value it will put back', log.dialogs.some(x => x.type === 'confirm' && /Video: now https:\/\/www\.youtube\.com\/watch\?v=NEWVIDEO001\s+back to https:\/\/www\.youtube\.com\/watch\?v=FIXTURE0001/.test(x.message)), log.dialogs.map(x => x.message.slice(0, 200)));
  check(r, 'Undo goes through coach_save_spine, naming what is live now as the snapshot', sv && sv.payload.p_entry.video === 'https://www.youtube.com/watch?v=FIXTURE0001' && sv.payload.p_entry_snap.video === 'https://www.youtube.com/watch?v=NEWVIDEO001' && Object.keys(sv.payload.p_entry).length === 1, sv && sv.payload);
  const d = await L.db(page);
  const e = d.exercises.find(x => x.id === 'goblet-squat');
  check(r, 'the video is back, Claude\'s court line is untouched', e.video === 'https://www.youtube.com/watch?v=FIXTURE0001' && e.tennis === 'Claude court line', { video: e.video, tennis: e.tennis });
  txt = await page.locator('#spvlist').innerText();
  check(r, 'the undo is itself in the list', (await page.locator('#spvlist .spvrow').count()) === 3 && /Video: https:\/\/www\.youtube\.com\/watch\?v=NEWVIDEO001 → https:\/\/www\.youtube\.com\/watch\?v=FIXTURE0001/.test(txt), txt.replace(/\s+/g, ' ').slice(0, 300));
  check(r, 'a toast says it was put back', /Put back/.test(await L.toastText(page)), await L.toastText(page));
  // Undo something that already is as it was: nothing is sent.
  const n1 = await L.nCalls(page);
  await page.locator('#spvlist .spvrow').nth(1).locator('button', { hasText: 'Undo this change' }).click(); await L.settle(page, 500);
  check(r, 'undoing a change that is already undone sends nothing', !(await L.callsSince(page, n1)).some(c => c.kind === 'rpc'), /nothing to put back/i.test(await L.toastText(page)));
  // The coach-only half is versioned too, and labelled.
  await page.evaluate(() => window.__sqlWrite('exercise_coach', 'goblet-squat', { cost: 'heavy' }));
  await page.locator('.spine-ed details.rawlog summary').click(); await L.settle(page, 200);
  await page.locator('.spine-ed details.rawlog summary').click(); await L.settle(page, 500);
  txt = await page.locator('#spvlist').innerText();
  check(r, 'a change to the coach-only half is listed as such', /Claude \(SQL\) · coach-only part[\s\S]*Cost: moderate → heavy/.test(txt), txt.replace(/\s+/g, ' ').slice(0, 300));
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

S['spine-history-unavailable'] = async (b) => {
  const r = { id: 'spine-history-unavailable', title: 'History when stage49 is not applied, or the read fails: a plain sentence, nothing else breaks', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'exercises' });
  await spineOpen(page, 'goblet-squat');
  await page.evaluate(() => window.__STUB.fail.push({ kind: 'from', name: 'spine_versions', op: 'select', message: "Could not find the table 'public.spine_versions' in the schema cache", code: 'PGRST205', times: 1 }));
  await page.locator('.spine-ed details.rawlog summary').click(); await L.settle(page, 500);
  let txt = await page.locator('#spvlist').innerText();
  check(r, 'a missing table says stage49 is not applied', /not on the server yet/.test(txt) && /stage49/.test(txt), txt);
  await page.locator('.spine-ed details.rawlog summary').click(); await L.settle(page, 200);
  // A lapsed sign-in answers 42501 "permission denied for table spine_versions": it names the table, and must not read as "stage49 is not applied".
  await page.evaluate(() => window.__STUB.fail.push({ kind: 'from', name: 'spine_versions', op: 'select', message: 'permission denied for table spine_versions', code: '42501', times: 1 }));
  await page.locator('.spine-ed details.rawlog summary').click(); await L.settle(page, 500);
  txt = await page.locator('#spvlist').innerText();
  check(r, 'a lapsed sign-in says so, not "stage49 is not applied"', /sign-in may have lapsed/.test(txt) && !/not on the server yet/.test(txt), txt);
  await page.locator('.spine-ed details.rawlog summary').click(); await L.settle(page, 200);
  await page.evaluate(() => window.__STUB.fail.push({ kind: 'from', name: 'spine_versions', op: 'select', message: 'fixture: network down', times: 1 }));
  await page.locator('.spine-ed details.rawlog summary').click(); await L.settle(page, 500);
  txt = await page.locator('#spvlist').innerText();
  check(r, 'any other failure says what failed', /Could not load history: fixture: network down/.test(txt), txt);
  check(r, 'the editor and its Save are still there', (await page.locator('.sp-save').count()) > 0 && (await page.locator('[data-sf=purpose]').count()) === 1, '');
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

// Review findings on stage49's History (2026-10-10), each pinned so it cannot come back.

// History reads the table when the coach opens it, not on every redraw (the search box redraws the tab on each keystroke),
// and again after anything that changes the entry.
S['spine-history-reads'] = async (b) => {
  const r = { id: 'spine-history-reads', title: 'History is read when opened and after a change, not on every redraw', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'exercises' });
  dismissDialogs(page, log);
  await spineOpen(page, 'goblet-squat');
  const versionReads = cs => cs.filter(c => c.kind === 'from' && c.name === 'spine_versions' && c.op === 'select').length;
  const n0 = await L.nCalls(page);
  await page.locator('.spine-ed details.rawlog summary').click(); await L.settle(page, 500);
  check(r, 'opening History reads it once (not once for the click and again for the redraw)', versionReads(await L.callsSince(page, n0)) === 1, versionReads(await L.callsSince(page, n0)));
  const n1 = await L.nCalls(page);
  await page.locator('#spineQ').click(); await page.locator('#spineQ').press('End');
  for (let i = 0; i < 5; i++) { await page.keyboard.press('Backspace'); await L.settle(page, 60); }
  await L.settle(page, 400);
  check(r, 'five keystrokes in the search box redraw the tab and read History again zero times', versionReads(await L.callsSince(page, n1)) === 0, versionReads(await L.callsSince(page, n1)));
  check(r, '...and History is still open, still filled', await page.locator('.spine-ed details.rawlog').evaluate(el => el.open) && /No earlier versions yet/.test(await page.locator('#spvlist').innerText()), await page.locator('#spvlist').innerText());
  // A save changes the entry: History reads again, once, and shows the change.
  const n2 = await L.nCalls(page);
  await page.locator('[data-sf=video]').fill('https://www.youtube.com/watch?v=READS000001');
  await page.locator('.sp-save').first().click(); await L.settle(page, 800);
  check(r, 'after a save History is read again, once', versionReads(await L.callsSince(page, n2)) === 1, versionReads(await L.callsSince(page, n2)));
  check(r, '...and lists the save', /Video:[\s\S]*READS000001/.test(await page.locator('#spvlist').innerText()), (await page.locator('#spvlist').innerText()).slice(0, 200));
  // Closing and opening it again is the coach asking: read it fresh.
  const n3 = await L.nCalls(page);
  await page.locator('.spine-ed details.rawlog summary').click(); await L.settle(page, 200);
  await page.locator('.spine-ed details.rawlog summary').click(); await L.settle(page, 500);
  check(r, 'closing and re-opening History reads it fresh', versionReads(await L.callsSince(page, n3)) === 1, versionReads(await L.callsSince(page, n3)));
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

// A change far into a long text is still visible, in the list and in the Undo confirm.
S['spine-history-long-text'] = async (b) => {
  const r = { id: 'spine-history-long-text', title: 'History and the Undo confirm show an edit made past the 140th character', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'exercises' });
  dismissDialogs(page, log); log.dialogs.length = 0;
  await spineOpen(page, 'goblet-squat');
  const base = 'A long purpose line that explains why this exercise is in the programme, what it trains and what the athlete should feel when it is done well, so the cue stays with them on court. ';
  await page.evaluate(([o, n]) => { window.__sqlWrite('exercises', 'goblet-squat', { purpose: o }); window.__sqlWrite('exercises', 'goblet-squat', { purpose: n }); }, [base + 'Keep the ribs down.', base + 'Let the ribs flare.']);
  await page.locator('.spine-ed details.rawlog summary').click(); await L.settle(page, 500);
  const row = (await page.locator('#spvlist .spvrow').first().innerText()).replace(/\s+/g, ' ');
  check(r, 'the list shows the words that changed, on both sides', /Keep the ribs down\. → .*Let the ribs flare\./.test(row), row);
  const first = (row.match(/Why it’s here: …(\S+)/) || [])[1];
  check(r, '...cut with an ellipsis, on the start of a word', !!first && base.indexOf(' ' + first) >= 0, row);
  log.dialogs.length = 0;
  page.removeAllListeners('dialog');
  page.on('dialog', async d => { log.dialogs.push({ type: d.type(), message: d.message() }); await d.dismiss().catch(() => {}); });
  await page.locator('#spvlist .spvrow').first().locator('button', { hasText: 'Undo this change' }).click(); await L.settle(page, 700);
  const conf = log.dialogs.find(x => x.type === 'confirm');
  check(r, 'the Undo confirm shows the words it replaces and the words it brings back', conf && /now .*Let the ribs flare\./.test(conf.message) && /back to .*Keep the ribs down\./.test(conf.message), conf && conf.message);
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

// Undo can bring an old name, alias or link back, so it must meet the same identity rules as Save.
S['spine-undo-guards'] = async (b) => {
  const r = { id: 'spine-undo-guards', title: 'Undo meets the rules Save does: no rename of an entry cards use, no alias another entry owns, no link to a missing entry', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'exercises' });
  dismissDialogs(page, log);
  const reload = () => page.evaluate(async () => { S.spine = null; _spineOpen = null; _spineHistId = null; await loadSpine(); await reloadPrograms(); renderExercises(); });
  const rpcCalls = async n => (await L.callsSince(page, n)).filter(c => c.kind === 'rpc' && c.name === 'coach_save_spine');
  const undoNewest = async () => {
    await spineOpen(page, 'goblet-squat');
    await page.locator('.spine-ed details.rawlog summary').click(); await L.settle(page, 500);
    log.dialogs.length = 0;
    const n = await L.nCalls(page);
    await page.locator('#spvlist .spvrow').first().locator('button', { hasText: 'Undo this change' }).click(); await L.settle(page, 800);
    return { n, alerts: log.dialogs.filter(x => x.type === 'alert').map(x => x.message), confirms: log.dialogs.filter(x => x.type === 'confirm').map(x => x.message) };
  };

  // a. Claude renames the entry and its cards (the /spine "One name in live programmes" move); undoing the rename would
  //    detach every one of those cards from the entry.
  await page.evaluate(() => {
    window.__sqlWrite('exercises', 'goblet-squat', { name: 'Dumbbell Goblet Squat' });
    (window.__DB.programs || []).forEach(p => (p.data.workouts.days || []).forEach(dy => (dy.blocks || []).forEach(bl => (bl.exercises || []).forEach(ex => {
      if (ex.name === 'Goblet Squat') { ex.name = 'Dumbbell Goblet Squat'; delete ex.exId; } }))));
  });
  await reload();
  let u = await undoNewest();
  check(r, 'a: undoing a rename of an entry live cards use is refused, naming the cards', u.alerts.length === 1 && /Dumbbell Goblet Squat is on 3 cards in 3 programmes/.test(u.alerts[0]) && /Nothing was changed/.test(u.alerts[0]), u.alerts);
  check(r, 'a: no confirm was asked and nothing was sent', !u.confirms.length && !(await rpcCalls(u.n)).length, { confirms: u.confirms, rpcs: (await rpcCalls(u.n)).length });
  check(r, 'a: the entry keeps its new name and the cards still find it', await page.evaluate(() => S.spine.list.find(e => e.id === 'goblet-squat').name === 'Dumbbell Goblet Squat' && spineCardsFor('goblet-squat').cards === 3), '');

  // b. An alias another entry already owns as its name.
  await page.evaluate(() => { window.__sqlWrite('exercises', 'goblet-squat', { aliases: ['Machine Leg Press'] }); window.__sqlWrite('exercises', 'goblet-squat', { aliases: [] }); });
  await reload();
  u = await undoNewest();
  check(r, 'b: undoing a change that would bring back an alias another entry owns is refused', u.alerts.length === 1 && /already how Machine Leg Press is written/.test(u.alerts[0]) && /Nothing was changed/.test(u.alerts[0]), u.alerts);
  check(r, 'b: nothing was sent', !(await rpcCalls(u.n)).length, '');

  // c. A link to an entry that is not in the Spine any more.
  await page.evaluate(() => {
    window.__sqlWrite('exercises', 'goblet-squat', { easier: ['dead-bug'] }); window.__sqlWrite('exercises', 'goblet-squat', { easier: [] });
    window.__DB.exercises = window.__DB.exercises.filter(e => e.id !== 'dead-bug'); window.__DB.exercise_coach = window.__DB.exercise_coach.filter(e => e.id !== 'dead-bug');
  });
  await reload();
  u = await undoNewest();
  check(r, 'c: undoing a change that would link to an entry that is gone is refused, naming it', u.alerts.length === 1 && /not in the Spine any more[\s\S]*dead-bug/.test(u.alerts[0]) && /Nothing was changed/.test(u.alerts[0]), u.alerts);
  check(r, 'c: nothing was sent', !(await rpcCalls(u.n)).length, '');

  // d. The rules are not in the way of an ordinary undo.
  await page.evaluate(() => { window.__sqlWrite('exercises', 'goblet-squat', { tennis: 'Court line one' }); window.__sqlWrite('exercises', 'goblet-squat', { tennis: 'Court line two' }); });
  await reload();
  page.removeAllListeners('dialog');
  page.on('dialog', async d => { log.dialogs.push({ type: d.type(), message: d.message() }); await d.accept().catch(() => {}); });
  u = await undoNewest();
  check(r, 'd: an ordinary undo (a court line) still goes through, as one coach_save_spine call', (await rpcCalls(u.n)).length === 1 && !u.alerts.length && (await L.db(page)).exercises.find(x => x.id === 'goblet-squat').tennis === 'Court line one', { alerts: u.alerts, rpcs: (await rpcCalls(u.n)).length });
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

S['spine-circuits-count'] = async (b) => {
  const r = { id: 'spine-circuits-count', title: 'An exercise used only inside a circuit counts as used', checks: [] };
  const { page } = await L.openCoach(b, { hash: 'exercises' });
  await page.evaluate(() => {
    window.__DB.exercises.push({ id: 'glute-bridge', name: 'Glute Bridge', aliases: [], pattern: 'hinge', qualities: [], purpose: null, tennis: null, cues: null,
      equipment: [], loads: [], easier: [], harder: [], alts: [], video: null, status: 'draft', updated_at: new Date().toISOString(), updated_by: 'claude', impact: null, muscles: null });
    S.spine = null; renderExercises();
  });
  await page.waitForFunction(() => document.querySelector('#spineQ'));
  await spineOpen(page, 'glute-bridge');
  const txt = await page.locator('#spineEd').innerText();
  check(r, 'the editor says who does it', /Doing it now: /.test(txt), txt.slice(0, 160));
  await page.context().close();
  return r;
};

S['walink'] = async (b) => {
  const r = { id: 'walink', title: 'WhatsApp links only for real numbers', checks: [] };
  const { page } = await L.openCoach(b, {});
  const out = await page.evaluate(() => ['@sara_1990', 'sara.k99@gmail.com', '+98 0912 123 4567', '09121234567', '۰۹۱۲۱۲۳۴۵۶۷', '07512 345678', '+44 7512 345678'].map(x => [x, waLink(x)]));
  const want = { '@sara_1990': '', 'sara.k99@gmail.com': '', '+98 0912 123 4567': 'https://wa.me/989121234567', '09121234567': 'https://wa.me/989121234567',
    '۰۹۱۲۱۲۳۴۵۶۷': 'https://wa.me/989121234567', '07512 345678': '', '+44 7512 345678': 'https://wa.me/447512345678' };
  out.forEach(([x, got]) => check(r, JSON.stringify(x) + ' -> ' + (want[x] || 'no link'), got === want[x], got));
  await page.context().close();
  return r;
};

(async () => {
  const b = await L.launch();
  const ids = Object.keys(S).filter(id => !only.length || only.some(w => id.includes(w)));
  for (const id of ids) {
    let res;
    try { res = await S[id](b); }
    catch (e) { res = { id, title: id, checks: [{ name: 'scenario ran', ok: false, actual: String(e && e.stack || e).slice(0, 600) }] }; }
    results.push(res);
    const bad = res.checks.filter(c => !c.ok).length;
    console.log((bad ? 'FAIL ' : 'ok   ') + id + '  (' + (res.checks.length - bad) + '/' + res.checks.length + ')');
    res.checks.filter(c => !c.ok).forEach(c => console.log('       ✗ ' + c.name + '\n         actual: ' + String(JSON.stringify(c.actual)).slice(0, 400)));
  }
  fs.writeFileSync(path.join(L.OUT, 'results.json'), JSON.stringify(results, null, 2));
  await b.close();
  const fails = results.reduce((n, r) => n + r.checks.filter(c => !c.ok).length, 0);
  console.log('\n' + results.length + ' scenarios, ' + fails + ' failing checks. Details: ' + path.join(L.OUT, 'results.json'));
})().catch(e => { console.error(e); process.exit(1); });
