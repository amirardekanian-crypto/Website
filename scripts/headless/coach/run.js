// coach-harness/run.js — drive coach.html in REAL (non-demo) mode against the in-memory stub and check
// the write paths demo mode turns into no-ops. Every check states the CORRECT behaviour; a FAIL is a
// defect (or a regression after a fix). Results: out/results.json (+ screenshots, the backup files).
//
//   node run.js                 # every scenario
//   node run.js editor backup   # only scenarios whose id contains one of the words
//   SHARD=0/3 node run.js        # every 3rd scenario from the 1st: run 0/3, 1/3, 2/3 in parallel (give each its own OUT)
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
  const r = { id: 'editor-wrong-exercise', title: 'The programme is replaced on the server and reloaded while an athlete was viewed earlier, then edit a row on their (stale) page', checks: [] };
  const { page } = await L.openCoach(b, { hash: 'a/ava_test/work' });
  // The new cycle's Day 1 Primary block starts with a different lift. A restored version, a cycle from the pipeline and a refresh all
  // end like this: the page reloads the programmes (reloadPrograms) while the athlete's file was drawn from the old ones.
  await page.evaluate(() => {
    const row = window.__DB.programs.find(p => p.athlete_id === 'ava_test');
    const d = JSON.parse(JSON.stringify(row.data));
    d.cycles = [{ name: 'Cycle 3 — New File', weeks: '4 weeks' }]; d.currentCycleIndex = 0;
    d.workouts.days[0].blocks[1].exercises = [{ name: 'Box Jump', type: 'standard', rx: { sets: 3, reps: 5 } }, { name: 'Chest-Supported Dumbbell Row', type: 'standard', rx: { sets: 3, reps: 12, rpe: 8 } }];
    row.data = d; row.updated_at = new Date(Date.now() + 1000).toISOString(); row.updated_by = 'publish_cycle';
  });
  await L.go(page, 'athletes');
  await page.evaluate(() => reloadPrograms().then(render)); await L.settle(page, 700);
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
  const r = { id: 'quest-week', title: 'Today → start a quest week and end it: the XP already earned is kept (stage55)', checks: [] };
  const { page, today, log } = await L.openCoach(b, {});
  const boxes = page.locator('#questPanel input[type=checkbox]');
  await boxes.nth(0).check(); await boxes.nth(1).check();
  let n0 = await L.nCalls(page);
  await page.locator('#questStartBtn').click();
  await L.settle(page, 600);
  const st = lastOf(await L.callsSince(page, n0), x => x.kind === 'rpc' && x.name === 'set_quests');
  check(r, 'set_quests(today, [two ids])', st && st.payload.p_start === today && st.payload.p_ids.length === 2, st && st.payload);
  const live = (await page.locator('#questPanel').innerText()).replace(/\s+/g, ' ');
  check(r, 'the panel shows the live run, and says everyone keeps the XP they earned if it is ended', /Live run/i.test(live) && /End this run today/i.test(live) && /keeps the XP they already earned/.test(live) && !/Cancel this run/i.test(live), live.slice(0, 200));
  log.dialogs.length = 0;
  n0 = await L.nCalls(page);
  await page.locator('#questPanel .btn.danger').click();
  await L.settle(page, 600);
  const cs = await L.callsSince(page, n0);
  const en = lastOf(cs, x => x.kind === 'rpc' && x.name === 'end_quests');
  check(r, 'end_quests(start, today): the run is ended, not removed', en && en.payload.p_start === today && en.payload.p_end === today && !cs.some(x => x.name === 'clear_quests'), en && en.payload);
  const runs = (await L.db(page)).xp_rules[0].rules.questRuns;
  check(r, 'the run is still on the server with its end day, so nobody loses XP', runs.length === 1 && runs[0].start === today && runs[0].end === today && runs[0].ids.length === 2, runs);
  check(r, 'the confirm tells the coach everyone keeps the XP', log.dialogs.some(d => d.type === 'confirm' && /Everyone keeps the XP they already earned/.test(d.message)), log.dialogs.map(d => d.message.slice(0, 80)));
  await L.settle(page, 400);
  const ended = (await page.locator('#questPanel').innerText()).replace(/\s+/g, ' ');
  check(r, 'the panel now says the run ended early and everyone keeps the XP; the End button is gone (the run stays live until tonight, then the picker returns)', /ended early/i.test(ended) && /keeps the XP they already earned/.test(ended) && (await page.locator('#questPanel .btn.danger').count()) === 0, ended.slice(0, 260));
  r.evidence = { dialogs: log.dialogs.map(d => d.message.slice(0, 90)) };
  await page.context().close();
  return r;
};

S['quest-week-end-fails'] = async (b) => {
  const r = { id: 'quest-week-end-fails', title: 'Ending a quest run when stage55 is not applied: nothing changes, and it never falls back to the call that takes the XP back', checks: [] };
  const { page, today, log } = await L.openCoach(b, {});
  await page.evaluate(() => { const x = window.__DB.xp_rules[0]; x.rules.questRuns = [{ start: new Date().toISOString().slice(0, 10), ids: ['w_water5'] }]; });
  await page.evaluate(() => hardRefresh()); await L.settle(page, 800);
  await page.evaluate(() => { window.__STUB.missingRpc = ['end_quests']; });
  log.dialogs.length = 0;
  const n0 = await L.nCalls(page);
  await page.locator('#questPanel .btn.danger').click();
  await L.settle(page, 600);
  const cs = await L.callsSince(page, n0);
  const alerts = log.dialogs.filter(d => d.type === 'alert').map(d => d.message);
  check(r, 'the alert names the missing stage and says nothing was changed', alerts.length === 1 && /stage55_end_quests\.sql has not been run/.test(alerts[0]) && /Nothing was changed/.test(alerts[0]), alerts);
  check(r, 'clear_quests is never called as a fallback', !cs.some(x => x.name === 'clear_quests'), cs.map(x => x.name));
  const runs = (await L.db(page)).xp_rules[0].rules.questRuns;
  check(r, 'the run is untouched', runs.length === 1 && !('end' in runs[0]), runs);
  check(r, 'no page errors', !log.errors.length, log.errors);
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
  check(r, 'a failed update leaves the card as it was and says so', (await card().getAttribute('class')).includes('new') && /Could not update/.test(await L.failText(page)), { cls: await card().getAttribute('class'), failBar: await L.failText(page) });
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
  check(r, 'a write RLS filtered out is reported, not claimed', /nothing was saved/i.test(await L.failText(page)), await L.failText(page));
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
  check(r, 'a too-short typed password is stopped before any call', (await L.callsSince(page, n0)).filter(c => c.kind === 'fn').length === 0 && /8 to 72/.test(await L.failText(page)), await L.failText(page));
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

// ── 15. The call log is retired (Amir, 2026-10-11): old logs stay readable and deletable in File ──
S['calllog-delete'] = async (b) => {
  const r = { id: 'calllog-delete', title: 'Athlete → File → Old call logs → Delete a call log (the Calls tab is retired)', checks: [] };
  const { page } = await L.openCoach(b, { hash: 'a/ava_test/file' });
  check(r, 'there is no Calls tab any more, and no "+ New call log" or "Copy cycle prompt"', (await page.locator('.subrail .stab', { hasText: 'Calls' }).count()) === 0
    && !/New call log|Copy cycle prompt/.test(await page.locator('#content').innerText()), await page.locator('.subrail').innerText());
  check(r, 'the old logs are listed in File, with their count and the note that the log is retired', /old call logs\s*·\s*2/i.test(await page.locator('#content').innerText()) && /call log is retired/.test(await page.locator('#content').innerText()), '');
  const before = await page.locator('details.day-c').count();
  const n0 = await L.nCalls(page);
  await page.locator('details.day-c').first().locator('summary').click();
  await page.locator('details.day-c').first().locator('.btn.danger').click();
  await L.settle(page, 800);
  const del = lastOf(await L.callsSince(page, n0), c => c.name === 'call_logs' && c.op === 'delete');
  check(r, 'delete on call_logs by id', del && del.filters.length === 1 && /^id\.eq\./.test(del.filters[0]), del && del.filters);
  const after = await page.locator('details.day-c').count();
  const txt = await page.locator('#content').innerText();
  check(r, 'the deleted call disappears from the list and the count', after === before - 1 && /old call logs\s*·\s*1/i.test(txt), { before, after, inDb: (await L.db(page)).call_logs.length });
  await page.locator('details.day-c').first().locator('summary').click();
  await page.locator('details.day-c').first().locator('.btn.danger').click();
  await L.settle(page, 800);
  check(r, 'with none left the section is gone (no empty "No call logs yet")', !/old call logs/i.test(await page.locator('#content').innerText()), '');
  await page.context().close();
  return r;
};

S['calls-old-link'] = async (b) => {
  const r = { id: 'calls-old-link', title: 'An old #a/<id>/calls link opens the athlete, not an error', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'a/ava_test/calls' });
  check(r, 'the athlete opens on a screen that exists', /ava example/i.test(await page.locator('#content').innerText()) && (await page.locator('.subrail .stab.active').count()) === 1, await page.locator('.subrail').innerText());
  check(r, 'no page errors', !log.errors.length, log.errors);
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
  const nHist = await L.nCalls(page);
  await page.locator('details.rawlog summary', { hasText: 'Version history' }).click();
  await page.locator('#pvlist .pvrow').first().waitFor();
  const histReads = (await L.callsSince(page, nHist)).filter(c => c.name === 'program_versions' && c.op === 'select');
  check(r, 'the list asks for up to 150 saves (stage52 keeps the previous cycle, not 20)', histReads.length === 1 && histReads[0].mods.limit === 150, histReads.map(c => c.mods.limit));
  check(r, 'the caption says what is kept', /last 20 saves, and every save since the previous cycle began/.test(await page.locator('#pvlist').innerText()), (await page.locator('#pvlist').innerText()).slice(0, 300));
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

// ── 17. The programme-file upload is gone (pile A4, 2026-10-11) ───────────────────────────────────────────────
// Amir: "i dont need that publish programme button and i never use it, remove the whole button and function". New athletes and
// new cycles go up through publish_cycle() (the pipeline); day-to-day changes through the inline editor.
S['no-program-file-button'] = async (b) => {
  const r = { id: 'no-program-file-button', title: 'Athletes → Coach tools has no programme-file upload any more', checks: [] };
  const { page, log } = await L.openCoach(b, {});
  await L.go(page, 'athletes');
  await page.evaluate(() => document.querySelectorAll('details.tools').forEach(d => d.open = true));
  const tools = (await page.locator('details.tools').innerText()).replace(/\s+/g, ' ');
  check(r, 'the Coach tools line still offers Add coaching logs and Backup', /Add coaching logs/.test(tools) && /Backup/.test(tools), tools);
  check(r, 'and no programme-file upload, in the line or its note', !/programme file|Publish programme|upload button/i.test(tools.replace(/there is no upload button/i, '')), tools);
  check(r, 'the function is gone from the page', await page.evaluate(() => typeof pickProgramFile === 'undefined'), '');
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

// ── 18. Backup ───────────────────────────────────────────────────────────────
// The list under test is the PAGE's own BACKUP_TABLES (read in the scenario below), not a second copy here that could drift.
// Tables that were each missing from the backup once with nothing erroring (CLAUDE.md, "A table added to the public schema goes
// into BACKUP_TABLES the same day"): they must stay on it.
const MUST_BE_BACKED_UP = ['exercises', 'exercise_coach', 'qualities', 'coaching_log_versions', 'spine_versions', 'hab_season_results',
  'assess_players', 'assess_notes', 'assess_results', 'buyer_notes', 'erasure_log'];
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
  check(r, 'a complete backup has the plain name and says complete: true inside', /^aa-backup-\d{4}-\d{2}-\d{2}\.json$/.test(name) && file.complete === true && !file.could_not_read, { name, complete: file.complete });
  await page.context().close();
  return r;
};
// A backup that could not read a table is not a restore point (audit TOOLS-3, pile B2): its name says so, scripts/prune_backups.py
// reads the name, and it must not silence the weekly reminder.
S['backup-incomplete'] = async (b) => {
  const r = { id: 'backup-incomplete', title: 'A backup that could not read a table is named INCOMPLETE and does not count as the weekly one', checks: [] };
  const { page, log } = await L.openCoach(b, {});
  const stamp = await page.evaluate(() => new Date().toISOString().slice(0, 10));
  await page.evaluate(() => window.__STUB.fail.push({ kind: 'from', name: 'hab_intake', op: 'select', message: 'fixture: cannot read hab_intake', times: 1 }));
  const bad = await takeBackup(page, 'incomplete');
  check(r, 'the file is named aa-backup-INCOMPLETE-<date>.json', bad.name === `aa-backup-INCOMPLETE-${stamp}.json`, bad.name);
  check(r, 'inside, complete is false and could_not_read names the table and why', bad.file.complete === false && (bad.file.could_not_read || []).some(x => /^hab_intake: fixture: cannot read hab_intake/.test(x)), { complete: bad.file.complete, could_not_read: bad.file.could_not_read });
  check(r, 'the rest of the tables are still in it', Object.keys(bad.file.tables).length >= 30 && !('hab_intake' in bad.file.tables), Object.keys(bad.file.tables).length);
  check(r, 'the alert opens with INCOMPLETE and says it is not a restore point', log.dialogs.some(d => /^⚠ INCOMPLETE backup — saved as aa-backup-INCOMPLETE-/.test(d.message) && /NOT a restore point/.test(d.message)), log.dialogs.map(d => d.message.split('\n')[0]));
  const ls = await page.evaluate(() => ({ ok: localStorage.getItem('coach_last_backup'), bad: localStorage.getItem('coach_last_backup_incomplete') }));
  check(r, 'it does not count as the weekly backup (no "last backup" stamp), but the try is remembered', !ls.ok && !!ls.bad, ls);
  await L.go(page, 'today');
  const row = (await page.locator('.need', { hasText: 'Weekly backup' }).first().innerText()).replace(/\s+/g, ' ');
  check(r, 'Today still asks for the weekly backup and says the last try was INCOMPLETE', /No complete backup taken/.test(row) && /INCOMPLETE and does not count/.test(row), row);
  await L.go(page, 'athletes');
  const sum = (await page.locator('details.tools summary').innerText()).replace(/\s+/g, ' ');
  check(r, 'the Coach tools line says there is no complete backup and the last try was INCOMPLETE', /no complete backup on this computer yet/.test(sum) && /last try was INCOMPLETE/.test(sum), sum);
  // A complete one afterwards: plain name, counts, and the memory of the bad try goes.
  const good = await takeBackup(page, 'complete-after');
  check(r, 'the next backup, complete, has the plain name and complete: true', good.name === `aa-backup-${stamp}.json` && good.file.complete === true, { name: good.name, complete: good.file.complete });
  const ls2 = await page.evaluate(() => ({ ok: localStorage.getItem('coach_last_backup'), shownBad: lastBadBackupAt() }));
  check(r, 'it counts now, and the old INCOMPLETE try is no longer shown', !!ls2.ok && ls2.shownBad === '', ls2);
  await L.go(page, 'today');
  check(r, 'Today no longer asks', (await page.locator('.need', { hasText: 'Weekly backup' }).count()) === 0, '');
  await L.go(page, 'athletes');
  const sum2 = (await page.locator('details.tools summary').innerText()).replace(/\s+/g, ' ');
  check(r, 'the Coach tools line says when the last complete backup was, with no INCOMPLETE note', /last complete backup today/.test(sum2) && !/INCOMPLETE/.test(sum2), sum2);
  check(r, 'no page errors', !log.errors.length, log.errors);
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
  await page.evaluate(() => { const el = document.querySelector('.creds-top'); if (el && el.getAttribute('aria-expanded') !== 'true') el.click(); });
  const credsText = (await page.locator('.creds').innerText()).replace(/\s+/g, ' ');
  check(r, 'the panel says the database clears a password by itself once they sign in with it (stage51)', /signs in with it: the database then clears it by itself/.test(credsText), credsText.slice(0, 400));
  await page.evaluate(() => { window.__DB.athlete_identities.find(x => x.athlete_id === 'ben_test').signed_in_test = true; });
  await page.evaluate(() => hardRefresh()); await L.settle(page, 800);
  const row = page.locator('.creds .credrow', { hasText: 'ben_test' });
  check(r, 'after they sign in, the row says "signed in with it"', /signed in with it/.test(await row.innerText()), await row.innerText());
  await page.context().close();
  return r;
};

S['calls-load-fail'] = async (b) => {
  const r = { id: 'calls-load-fail', title: 'Call logs fail to load: the File tab says so (it said "No call logs yet")', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'today' });
  await page.evaluate(() => { window.__STUB.fail.push({ kind: 'from', name: 'call_logs', op: 'select', message: 'fixture: offline', times: 1 }); });
  await L.go(page, 'a/ava_test/file');
  const txt = await page.locator('#content').innerText();
  check(r, 'the File tab names the failure', /Call logs did not load/.test(txt) && !/No call logs yet/.test(txt), txt.slice(-600));
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

// ── 20b. Full erasure of a person (stage54) ──────────────────────────────────
// One more athlete with a row in every athlete table, a login, a Proof contact, three intake forms (the same email, the same
// full name, a stranger) and a partner record linked to them. Only this page's in-memory stub is changed.
async function seedErasable(page) {
  await page.evaluate(() => {
    const D = window.__DB, now = new Date().toISOString(), day = n => new Date(Date.now() - n * 86400e3).toISOString().slice(0, 10);
    const prog = JSON.parse(JSON.stringify(D.programs.find(x => x.athlete_id === 'ben_test').data));
    prog.athlete = Object.assign({}, prog.athlete, { id: 'zed_erase', firstName: 'Zed', lastName: 'Erased', tier: 'coached' });
    D.programs.push({ athlete_id: 'zed_erase', data: prog, updated_at: now, updated_by: 'pipeline@example.invalid' });
    D.program_versions.push({ id: 9001, athlete_id: 'zed_erase', data: {}, saved_at: now, saved_by: null, note: null });
    [[1, day(1)], [2, day(2)]].forEach(([n, d]) => D.session_history.push({ athlete_id: 'zed_erase', athlete_name: 'Zed Erased', day: n, completed_on: d, status: 'Complete',
      session_rpe: 7, duration_min: 40, readiness: null, day_note: null, focus: null, summary: null, updated_at: now, coach_status: 'read', log: null }));
    D.athlete_progress.push({ athlete_id: 'zed_erase', athlete_name: 'Zed Erased', data: {}, updated_at: now });
    D.athlete_identities.push({ user_id: 'u-zed', athlete_id: 'zed_erase', email: 'athlete.zed_erase@amirardekani.com', linked_at: now, initial_password: null, password_set_at: now, sent_at: now });
    D.coaching_logs.push({ athlete_id: 'zed_erase', body: 'Fixture log', updated_at: now });
    // the rollback copy of the 2026-10-09 rename (schema "backup" on the server): two rows for Zed, one for another athlete
    D['backup.onename_2026_10_09'] = (D['backup.onename_2026_10_09'] || []).concat([
      { id: 1, athlete_id: 'zed_erase', kind: 'progress', ref: {}, old: { zed_note: 'private words' }, saved_at: now },
      { id: 2, athlete_id: 'zed_erase', kind: 'session_log', ref: { day: 1 }, old: {}, saved_at: now },
      { id: 3, athlete_id: 'ben_test', kind: 'progress', ref: {}, old: {}, saved_at: now }]);
    D.hab_contacts.push({ athlete_id: 'zed_erase', email: 'Zed.Erased@Example.Invalid', whatsapp: '+10000000009', source: 'proof.html', tier: 'coached', note: null, created_at: now, updated_at: now, display_name: 'Zed' });
    const form = (id, name, email, contact) => ({ id, created_at: now, lang: 'en', name, email, contact: contact || '', programme: 'Set — $180 / 3 months', payload: {}, status: 'handled', handled_at: now });
    // Zed's contact number is +1 000 000 0009; one form carries it typed with Persian digits and a Persian name (the common case on the live data)
    D.hab_intake.push(form('zed-intake-email', 'Z. E.', ' zed.erased@example.invalid '), form('zed-intake-name', 'ZED  erased', 'other@example.invalid'),
      form('zed-intake-wa', 'زد ارزد', '', '۱ ۰۰۰ ۰۰۰ ۰۰۰۹'), form('zed-intake-stranger', 'Someone Else', 'else@example.invalid', '@someone'));
    D.affiliates.find(a => a.code === 'FIXTURE10').athlete_id = 'zed_erase';
  });
  await page.evaluate(() => hardRefresh());
  await L.settle(page, 900);
}
const erasePanelText = async page => (await page.locator('.erase').innerText()).replace(/\s+/g, ' ');

S['erase-athlete'] = async (b) => {
  const r = { id: 'erase-athlete', title: 'File → Danger zone → Erase completely…: a dry run first, the id typed, one real call, everything gone', checks: [] };
  const { page, log } = await L.openCoach(b, {});
  await seedErasable(page);
  await L.go(page, 'a/zed_erase/file');
  const before = JSON.stringify(await L.db(page));
  const n0 = await L.nCalls(page);
  await page.locator('button', { hasText: /Erase completely/ }).click();
  await page.locator('.erase #eraseIn').waitFor();
  const rpc0 = (await L.callsSince(page, n0)).filter(c => c.kind === 'rpc' && c.name === 'coach_erase_person');
  check(r, 'opening the panel makes ONE call, and it is a dry run (kind and key only: no flag, no confirmation)', rpc0.length === 1 && JSON.stringify(rpc0[0].payload) === JSON.stringify({ p_kind: 'athlete', p_key: 'zed_erase' }), rpc0.map(c => c.payload));
  check(r, '...which changed nothing on the server', JSON.stringify(await L.db(page)) === before, '');
  const text = await erasePanelText(page);
  check(r, 'the panel names them and lists what goes with real numbers', /Erase Zed Erased completely/.test(text) && /2 finished sessions/.test(text) && /1 programme\b/.test(text) && /1 coaching log\b/.test(text) && /1 contact record/.test(text) && /1 sign-in account/.test(text), text.slice(0, 600));
  check(r, 'it also lists the rollback copies kept in the backup schema (not as a raw table name)', /2 saved rollback copies of their data/.test(text) && !/backup\.onename/.test(text), text.slice(0, 700));
  check(r, 'it warns that this is a coached athlete with a live programme', /coached athlete with a live programme/.test(text), '');
  const emailPick = page.locator('.erase .pick', { hasText: 'same email' }).locator('input'), namePick = page.locator('.erase .pick', { hasText: 'same name' }).locator('input');
  const waPick = page.locator('.erase .pick', { hasText: 'same WhatsApp number' }).locator('input');
  check(r, 'three intake forms are offered: only the same-EMAIL one is ticked (a number can be a foreign number or a handle), the same-number and same-name ones are not, the stranger\'s is not listed', (await page.locator('.erase .pick').count()) === 3 && await emailPick.isChecked() && !(await waPick.isChecked()) && !(await namePick.isChecked()) && !/Someone Else/.test(text), text.slice(0, 900));
  check(r, 'the finder box is there, and the panel says one form will go, by name', (await page.locator('#eraseFindIn').count()) === 1 && /1 intake form will be erased with them/.test(text), text.slice(0, 1100));
  check(r, 'it says what stays: backups, the inbox, and that the partner record stays with only its link removed', /weekly backup files/.test(text) && /inbox/.test(text) && /FIXTURE10 stays on the Affiliates tab/.test(text), text.slice(-420));
  check(r, 'it says when the last backup was taken (none yet here), because that file is the only way back from a mistake', /last ⤓ Backup on this computer: none yet/.test(text) && /only way back/.test(text), text.slice(-520));
  const go = page.locator('#eraseGo');
  check(r, 'Erase for good is disabled until the id is typed', await go.isDisabled(), '');
  await page.locator('#eraseIn').fill('zed');
  check(r, '...and stays disabled for a wrong word', await go.isDisabled(), '');
  await page.locator('#eraseIn').fill('ZED_Eras');
  check(r, '...and is still disabled one letter short', await go.isDisabled(), '');
  await page.locator('#eraseIn').fill('ZED_Erase');
  check(r, '...and is enabled for the right id in any case', await go.isEnabled(), '');
  await namePick.check(); await waPick.check();   // the coach ticks the other two offered forms by hand
  const n1 = await L.nCalls(page);
  log.dialogs.length = 0;
  await go.click();
  await L.settle(page, 1300);
  const cs = await L.callsSince(page, n1);
  const real = cs.filter(c => c.kind === 'rpc' && c.name === 'coach_erase_person');
  check(r, 'exactly one real call, with the typed id and the three ticked forms', real.length === 1 && real[0].payload.p_dry_run === false && real[0].payload.p_confirm === 'ZED_Erase'
    && real[0].payload.p_kind === 'athlete' && real[0].payload.p_key === 'zed_erase' && JSON.stringify([...real[0].payload.p_intake_ids].sort()) === JSON.stringify(['zed-intake-email', 'zed-intake-name', 'zed-intake-wa']), real.map(c => c.payload));
  check(r, 'no separate deletes from the page (it is one transaction on the server)', !cs.some(c => c.kind === 'from' && c.op === 'delete'), '');
  const d = await L.db(page);
  const left = Object.keys(d).filter(t => Array.isArray(d[t]) && d[t].some(x => x.athlete_id === 'zed_erase'));
  check(r, 'nothing is left under their id in any table', left.length === 0, left);
  check(r, '...including the rollback copies in the backup schema, while another athlete\'s stay', (d['backup.onename_2026_10_09'] || []).filter(x => x.athlete_id === 'zed_erase').length === 0
    && (d['backup.onename_2026_10_09'] || []).filter(x => x.athlete_id === 'ben_test').length === 1, d['backup.onename_2026_10_09']);
  check(r, 'the stranger\'s intake form is still there; the three chosen ones are gone', d.hab_intake.some(i => i.id === 'zed-intake-stranger') && !d.hab_intake.some(i => /^zed-intake-(email|name|wa)$/.test(i.id)), d.hab_intake.map(i => i.id));
  check(r, 'the partner record stays, unlinked', d.affiliates.some(a => a.code === 'FIXTURE10' && a.athlete_id === null), '');
  check(r, 'other athletes keep everything', d.session_history.filter(x => x.athlete_id === 'ben_test').length === 2 && d.programs.some(x => x.athlete_id === 'ben_test') && d.athlete_identities.some(x => x.athlete_id === 'ben_test'), '');
  check(r, 'a receipt row was written', d.erasure_log.length === 1 && d.erasure_log[0].kind === 'athlete', d.erasure_log);
  check(r, 'they are off the roster and the page is back on the Athletes tab', (await page.evaluate(() => location.hash)) === '#athletes' && !(await page.evaluate(() => !!S.ath.zed_erase)), await page.evaluate(() => location.hash));
  const al = log.dialogs.filter(x => x.type === 'alert').map(x => x.message);
  check(r, 'one receipt alert: the receipt number, what is left to do, the partner note', al.length === 1 && /Receipt #1/.test(al[0]) && /weekly backup files/.test(al[0]) && /FIXTURE10/.test(al[0]) && !/native/.test(al[0]), al);
  check(r, '...it names the intake forms that went, says the sign-in account went, and warns that an open phone can save once more', /Intake forms erased: .*Z\. E\./.test(al[0]) && !/[<>]/.test(al[0]) && /sign-in account included/.test(al[0]) && /app was open on a phone/.test(al[0]), al[0]);
  check(r, 'no confirm() or prompt() dialogs were used', !log.dialogs.some(x => x.type === 'confirm' || x.type === 'prompt'), log.dialogs.map(x => x.type));
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

S['erase-guards'] = async (b) => {
  const r = { id: 'erase-guards', title: 'Erase completely…: a wrong id, Cancel, leaving the page, and the ids that are never offered', checks: [] };
  const { page, log } = await L.openCoach(b, {});
  await seedErasable(page);
  await page.evaluate(() => {
    const D = window.__DB, p = JSON.parse(JSON.stringify(D.programs.find(x => x.athlete_id === 'ben_test').data));
    p.athlete = Object.assign({}, p.athlete, { id: 'amir_ardekani', firstName: 'Amir', lastName: 'Board' });
    D.programs.push({ athlete_id: 'amir_ardekani', data: p, updated_at: new Date().toISOString(), updated_by: null });
  });
  await page.evaluate(() => hardRefresh()); await L.settle(page, 800);
  await L.go(page, 'a/zed_erase/file');
  await page.locator('button', { hasText: /Erase completely/ }).click();
  await page.locator('#eraseIn').waitFor();
  const n0 = await L.nCalls(page);
  await page.locator('#eraseIn').fill('not-the-id');
  await page.locator('#eraseIn').press('Enter');
  await L.settle(page, 400);
  check(r, 'Enter with the wrong id calls nothing and says what to type', (await L.callsSince(page, n0)).filter(c => c.kind === 'rpc').length === 0 && /Type zed_erase exactly/.test(await L.toastText(page)), await L.toastText(page));
  await page.locator('.erase button', { hasText: 'Cancel' }).click();
  check(r, 'Cancel closes the panel and brings the button back', (await page.locator('.erase').count()) === 0 && (await page.locator('button', { hasText: /Erase completely/ }).count()) === 1, '');
  await page.locator('button', { hasText: /Erase completely/ }).click(); await page.locator('#eraseIn').waitFor();
  await L.go(page, 'athletes'); await L.go(page, 'a/zed_erase/file');
  check(r, 'an open panel does not follow the coach to another screen', (await page.locator('.erase').count()) === 0, '');
  await L.go(page, 'a/amir_ardekani/file');
  const t = (await page.locator('#content').innerText()).replace(/\s+/g, ' ');
  check(r, 'the board identity gets no Erase button and the page says why', (await page.locator('button', { hasText: /Erase completely/ }).count()) === 0 && /Not offered here/.test(t), t.slice(-300));
  const d = await L.db(page);
  check(r, 'nothing was erased by any of that', d.programs.some(x => x.athlete_id === 'zed_erase') && d.erasure_log.length === 0, '');
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

// The server refuses, the sign-in lapsed, stage54 is not applied, or the answer never comes back.
S['erase-fails'] = async (b) => {
  const r = { id: 'erase-fails', title: 'Erase completely… when the server cannot or will not: nothing goes, and the words fit the cause', checks: [] };
  const { page, log } = await L.openCoach(b, {});
  await seedErasable(page);
  await L.go(page, 'a/zed_erase/file');
  const open = async () => { await page.locator('button', { hasText: /Erase completely/ }).click(); await page.waitForFunction(() => !!document.querySelector('.erase #eraseIn, .erase .eh'), null, { timeout: 5000 }); await L.settle(page, 250); };
  const intact = async () => { const d = await L.db(page); return d.programs.some(x => x.athlete_id === 'zed_erase') && d.session_history.filter(x => x.athlete_id === 'zed_erase').length === 2 && d.erasure_log.length === 0; };

  // 1. the server does not have the function yet
  await page.evaluate(() => { window.__STUB.missingRpc = ['coach_erase_person']; });
  await open();
  let t = await erasePanelText(page);
  check(r, 'stage54 not applied: the panel says which file to run, and offers no erase button', /cannot be erased now/.test(t) && /Run supabase\/PASTE-1-run-in-sql-editor\.sql in the Supabase SQL editor/.test(t) && (await page.locator('#eraseGo').count()) === 0, t);
  await page.locator('.erase button', { hasText: 'Close' }).click();
  await page.evaluate(() => { window.__STUB.missingRpc = []; });
  // 2. the dry run is refused
  await page.evaluate(() => window.__STUB.fail.push({ kind: 'rpc', name: 'coach_erase_person', message: 'That login is yours, the coach\'s. Nothing was erased.', times: 1 }));
  await open();
  t = await erasePanelText(page);
  check(r, 'a refusal from the server is shown in its own words, with no erase button', /That login is yours/.test(t) && (await page.locator('#eraseGo').count()) === 0, t);
  await page.locator('.erase button', { hasText: 'Close' }).click();
  // 3. real run: a server error, a lapsed sign-in, then an answer that never arrives
  await open();
  await page.locator('#eraseIn').fill('zed_erase');
  const cases = [
    { name: 'a server error', set: () => window.__STUB.fail.push({ kind: 'rpc', name: 'coach_erase_person', message: 'fixture: connection reset', times: 1 }), say: /Nothing was erased: fixture: connection reset/ },
    { name: 'a lapsed sign-in', set: () => window.__STUB.fail.push({ kind: 'rpc', name: 'coach_erase_person', message: 'permission denied for function coach_erase_person', times: 1 }), say: /sign-in may have lapsed/ },
  ];
  for (const c of cases) {
    log.dialogs.length = 0;
    await page.evaluate(c.set);
    await page.locator('#eraseGo').click();
    await L.settle(page, 600);
    const alerts = log.dialogs.filter(x => x.type === 'alert').map(x => x.message);
    check(r, c.name + ': the alert says nothing was erased, in words that fit', alerts.length === 1 && c.say.test(alerts[0]) && /nothing was half done/.test(alerts[0]), alerts);
    check(r, c.name + ': the panel is still open with the word typed, and the data is intact', (await page.locator('#eraseGo').isEnabled()) && (await page.locator('#eraseIn').inputValue()) === 'zed_erase' && await intact(), '');
  }
  log.dialogs.length = 0;
  await page.evaluate(() => window.__STUB.fail.push({ kind: 'rpc', name: 'coach_erase_person', message: 'TypeError: Failed to fetch', code: '', times: 1 }));
  await page.locator('#eraseGo').click();
  await L.settle(page, 600);
  t = await erasePanelText(page);
  const alerts = log.dialogs.filter(x => x.type === 'alert').map(x => x.message);
  check(r, 'the answer never arrives: the panel says it cannot tell, and does NOT claim nothing was erased', /answer never arrived/.test(t) && /cannot tell whether Zed Erased was erased/.test(t) && !/Nothing was erased/.test(t) && !alerts.length, t);
  check(r, '...and tells the coach how to find out: gone from the roster after a Refresh = it went through', /Refresh/.test(t) && /gone from the roster, it went through/.test(t) && /still there, nothing was erased/.test(t), t);
  // an error that proves the transaction never committed (a deadlock) vs one that does not (PostgREST's own connection error)
  await page.locator('.erase button', { hasText: 'Close' }).click();
  await open();
  await page.locator('#eraseIn').fill('zed_erase');
  log.dialogs.length = 0;
  await page.evaluate(() => window.__STUB.fail.push({ kind: 'rpc', name: 'coach_erase_person', message: 'deadlock detected', code: '40P01', times: 1 }));
  await page.locator('#eraseGo').click();
  await L.settle(page, 600);
  let al2 = log.dialogs.filter(x => x.type === 'alert').map(x => x.message);
  check(r, 'a deadlock (40P01) proves nothing committed: the alert says so and the panel stays open', al2.length === 1 && /Nothing was erased: deadlock detected/.test(al2[0]) && (await page.locator('#eraseGo').isEnabled()) && await intact(), al2);
  log.dialogs.length = 0;
  await page.evaluate(() => window.__STUB.fail.push({ kind: 'rpc', name: 'coach_erase_person', message: 'Internal error while the connection closed', code: 'PGRST001', times: 1 }));
  await page.locator('#eraseGo').click();
  await L.settle(page, 600);
  t = await erasePanelText(page);
  al2 = log.dialogs.filter(x => x.type === 'alert').map(x => x.message);
  check(r, 'PostgREST\'s own connection error (PGRST001) does NOT prove that: the panel says it cannot tell, with no "nothing was erased" claim', /cannot tell whether Zed Erased was erased/.test(t) && !/Nothing was erased:/.test(t) && !al2.length, t);
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

// The intake-form finder (Amir, 2026-10-11: "pick any form in the Erase panel"): the matches are only OFFERED; any form can be named.
const seedBare = (page, id, first, last) => page.evaluate(([id, first, last]) => {
  const D = window.__DB, now = new Date().toISOString();
  const prog = JSON.parse(JSON.stringify(D.programs.find(x => x.athlete_id === 'ben_test').data));
  prog.athlete = Object.assign({}, prog.athlete, { id, firstName: first, lastName: last, tier: 'coached' });
  D.programs.push({ athlete_id: id, data: prog, updated_at: now, updated_by: null });
  D.session_history.push({ athlete_id: id, athlete_name: first + ' ' + last, day: 1, completed_on: now.slice(0, 10), status: 'Complete', session_rpe: 7, duration_min: 40, readiness: null, day_note: null, focus: null, summary: null, updated_at: now, coach_status: 'read', log: null });
}, [id, first, last]);
S['erase-forms'] = async (b) => {
  const r = { id: 'erase-forms', title: 'Erase completely…: shared contacts are not ticked for you, the finder names any other form, the cap of 10, remove, a form that is gone, focus', checks: [] };
  const { page, log } = await L.openCoach(b, {});
  await seedErasable(page);
  const NAMES = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliet', 'Kilo', 'Lima'];
  await page.evaluate(NAMES => {
    const D = window.__DB, now = new Date().toISOString();
    // another athlete's contact carries Zed's number (a parent's, say): the form that carries it is "shared"
    D.hab_contacts.push({ athlete_id: 'sib_test', email: null, whatsapp: '+1 000 000 0009', source: 'proof.html', tier: 'free', note: null, created_at: now, updated_at: now, display_name: 'Sib' });
    // twelve more forms, none of them Zed's by email, number or name
    NAMES.forEach((n, i) => D.hab_intake.push({ id: 'bulk-' + (i + 1), created_at: now, lang: 'fa', name: 'Bulk ' + n, email: 'bulk' + (i + 1) + '@example.invalid', contact: '@bulk' + (i + 1), programme: 'Set', payload: {}, status: 'handled', handled_at: now }));
  }, NAMES);
  await page.evaluate(() => hardRefresh()); await L.settle(page, 900);
  await L.go(page, 'a/zed_erase/file');
  await page.locator('button', { hasText: /Erase completely/ }).click();
  await page.locator('.erase #eraseIn').waitFor();
  let t = await erasePanelText(page);
  const waRow = page.locator('.erase .pick', { hasText: 'same WhatsApp number' });
  check(r, 'the form that carries a number another athlete\'s contact also has is offered, flagged, and NOT ticked for you; the email form is ticked',
    (await waRow.count()) === 1 && !(await waRow.locator('input').isChecked()) && /also another athlete's/i.test(await waRow.innerText()) && /not ticked for you/.test(await page.locator('.erase').innerText())
    && await page.locator('.erase .pick', { hasText: 'same email' }).locator('input').isChecked(), t.slice(0, 900));
  const others = (await L.db(page)).hab_intake.length - 3;   // every form except the three the panel offers
  check(r, 'the panel says one form will go, by name, and the finder lists how many others there are', /1 intake form will be erased with them/.test(t) && /Z\. E\./.test(t) && new RegExp(others + ' other forms in the Intake tab').test(t), t.slice(0, 1100) + ' | others=' + others);
  // the finder: typing redraws only its results, so the box keeps focus
  const find = page.locator('#eraseFindIn');
  await find.click(); await find.pressSequentially('someone');
  check(r, 'typing in the finder keeps focus in the finder (only the results are redrawn)', await page.evaluate(() => document.activeElement && document.activeElement.id) === 'eraseFindIn', '');
  const stranger = page.locator('#eraseFound .pick', { hasText: 'Someone Else' });
  check(r, 'a form that nothing matched is found by a part of its name, with its email and contact on the line', (await stranger.count()) === 1 && /else@example\.invalid/.test(await stranger.innerText()) && /@someone/.test(await stranger.innerText()), await page.locator('#eraseFound').innerText());
  await stranger.locator('input').check();
  t = await erasePanelText(page);
  check(r, 'ticking it puts it in the list of forms that will go, by name and date', /2 intake forms will be erased with them/.test(t) && /Someone Else \(/.test(t), t.slice(0, 1200));
  await find.fill('zzzz-nobody');
  check(r, 'a search with no hit says so', /No other form matches “zzzz-nobody”/.test(await page.locator('#eraseFound').innerText()), await page.locator('#eraseFound').innerText());
  await find.fill('alpha');
  check(r, 'a search narrows to the one form', (await page.locator('#eraseFound .pick').count()) === 1, await page.locator('#eraseFound').innerText());
  await find.fill('bulk');
  const shown = page.locator('#eraseFound .pick');
  check(r, '"bulk" matches 12 forms: 8 are listed and the rest is a count, not a scroll', (await shown.count()) === 8 && /4 more match\. Type more to narrow it down/.test(await page.locator('#eraseFound').innerText()), await page.locator('#eraseFound').innerText());
  for (let i = 0; i < 8; i++) await shown.nth(i).locator('input').check();
  t = await erasePanelText(page);
  check(r, 'eight more ticked: ten forms will go', /10 intake forms will be erased with them/.test(t), t.slice(0, 1400));
  // the cap: find a bulk form that is not ticked yet by name, and try to tick it
  const left = await page.evaluate(() => window.__DB.hab_intake.filter(i => /^bulk-/.test(i.id) && !_erase.picked.includes(i.id)).map(i => i.name));
  await find.fill(left[0]);
  await page.locator('#eraseFound .pick input').first().click();   // click, not check(): the box is meant to un-tick itself
  await L.settle(page, 300);
  t = await erasePanelText(page);
  check(r, 'an 11th form is refused with a toast and is not ticked (the cap is 10)', left.length === 4 && /10 intake forms will be erased with them/.test(t) && !/11 intake forms/.test(t) && /At most 10 intake forms/.test(await L.toastText(page)) && !(await page.locator('#eraseFound .pick input').first().isChecked()), (await L.toastText(page)) + ' | ' + t.slice(0, 200));
  // remove: the stranger's form comes off the list
  await page.locator('#erasePicked li', { hasText: 'Someone Else' }).locator('button').click();
  t = await erasePanelText(page);
  check(r, '"remove" next to a form takes it off the list', /9 intake forms will be erased with them/.test(t) && !/Someone Else \(/.test(t), t.slice(0, 400));
  // focus survives a redraw of the whole page
  await page.locator('#eraseIn').fill('zed');
  await page.evaluate(() => render());
  const st = await page.evaluate(() => ({ id: document.activeElement && document.activeElement.id, at: document.activeElement && document.activeElement.selectionStart, v: document.activeElement && document.activeElement.value }));
  check(r, 'after the whole page is redrawn the confirm box still has focus, its text and its caret', st.id === 'eraseIn' && st.v === 'zed' && st.at === 3, st);
  // ...and the redraw does not scroll the page (focus() without preventScroll jumped it back to the box). Instant scrolling, so a jump shows at once.
  await L.settle(page, 1500);   // let any redraw the page schedules itself (Proof levels) finish first
  await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForFunction(() => window.scrollY === 0, null, { timeout: 4000 }).catch(() => {});
  const y0 = await page.evaluate(() => window.scrollY);
  await page.evaluate(() => { document.getElementById('eraseIn').dataset.mark = 'old'; });   // to prove the redraw really replaced the box
  await page.evaluate(() => render());
  await L.settle(page, 300);
  const y1 = await page.evaluate(() => window.scrollY);
  const geo = await page.evaluate(() => ({ vh: innerHeight, docH: document.documentElement.scrollHeight, boxTop: Math.round(document.getElementById('eraseIn').getBoundingClientRect().top + scrollY), active: document.activeElement && document.activeElement.id, replaced: document.getElementById('eraseIn').dataset.mark !== 'old' }));
  check(r, 'a redraw with the focus in the confirm box does not jump the page to the box (a few pixels of layout settling are fine; the bug moved it by hundreds)', y0 === 0 && Math.abs(y1 - y0) < 100 && geo.replaced && geo.boxTop > geo.vh + 200, { y0, y1, geo });
  // a ticked form that is gone by the time the button is pressed stops the erasure
  await page.evaluate(() => { const D = window.__DB; D.hab_intake = D.hab_intake.filter(i => i.id !== 'zed-intake-email'); });
  await page.locator('#eraseIn').fill('zed_erase');
  log.dialogs.length = 0;
  await page.locator('#eraseGo').click();
  await L.settle(page, 700);
  const al = log.dialogs.filter(x => x.type === 'alert').map(x => x.message);
  const d0 = await L.db(page);
  check(r, 'a ticked form that no longer exists stops the erasure with the server\'s words, and nothing is erased', al.length === 1 && /Nothing was erased: One of the intake forms does not exist/.test(al[0]) && d0.programs.some(x => x.athlete_id === 'zed_erase') && d0.erasure_log.length === 0, al);
  // put the form back and erase
  await page.evaluate(() => { const D = window.__DB; D.hab_intake.push({ id: 'zed-intake-email', created_at: new Date().toISOString(), lang: 'en', name: 'Z. E.', email: ' zed.erased@example.invalid ', contact: '', programme: 'Set', payload: {}, status: 'handled', handled_at: null }); });
  log.dialogs.length = 0;
  await page.locator('#eraseGo').click();
  await L.settle(page, 1300);
  const d = await L.db(page);
  const ids = d.hab_intake.map(i => i.id);
  const calls = (await L.calls(page)).filter(c => c.kind === 'rpc' && c.name === 'coach_erase_person' && c.payload.p_dry_run === false);
  check(r, 'the real call carries the nine ticked forms and not the shared-number one, the same-name one or the stranger\'s', calls.length === 2 && calls[1].payload.p_intake_ids.length === 9
    && !calls[1].payload.p_intake_ids.some(i => ['zed-intake-wa', 'zed-intake-name', 'zed-intake-stranger'].includes(i)), calls.map(c => c.payload.p_intake_ids));
  check(r, 'those nine are gone; the shared-number form, the same-name form, the stranger\'s and the four forms nobody ticked are still there',
    !ids.includes('zed-intake-email') && ['zed-intake-wa', 'zed-intake-name', 'zed-intake-stranger'].every(i => ids.includes(i)) && ids.filter(i => /^bulk-/.test(i)).length === 4, ids);
  const al3 = log.dialogs.filter(x => x.type === 'alert').map(x => x.message).slice(-1)[0] || '';
  check(r, 'the final alert lists the nine forms by name, as plain text (no markup)', /Intake forms erased: .*Z\. E\./.test(al3) && /Bulk /.test(al3) && !/[<>]/.test(al3), al3);

  // exactly one form offered: "carries", not "carryes", and it is ticked
  await seedBare(page, 'uno_erase', 'Uno', 'Erase');
  await page.evaluate(() => { const D = window.__DB, now = new Date().toISOString();
    D.hab_contacts.push({ athlete_id: 'uno_erase', email: 'uno@example.invalid', whatsapp: null, source: 'proof.html', tier: 'coached', note: null, created_at: now, updated_at: now, display_name: 'Uno' });
    D.hab_intake.push({ id: 'uno-form', created_at: now, lang: 'en', name: 'Uno Erase', email: 'uno@example.invalid', contact: '', programme: 'Set', payload: {}, status: 'handled', handled_at: now }); });
  await page.evaluate(() => hardRefresh()); await L.settle(page, 900);
  await L.go(page, 'a/uno_erase/file');
  await page.locator('button', { hasText: /Erase completely/ }).click();
  await page.locator('.erase #eraseIn').waitFor();
  t = await erasePanelText(page);
  check(r, 'one offered form: the words are "1 intake form carries their email…", and it is ticked', /1 intake form carries their email/.test(t) && /1 intake form will be erased with them/.test(t) && !/carryes/.test(t), t.slice(0, 700));
  await page.locator('.erase button', { hasText: 'Cancel' }).click();

  // an athlete with no login and no form: the alert does not claim a sign-in account, and says that no form went
  await seedBare(page, 'nolo_erase', 'Nolo', 'Erase');
  await page.evaluate(() => hardRefresh()); await L.settle(page, 900);
  await L.go(page, 'a/nolo_erase/file');
  await page.locator('button', { hasText: /Erase completely/ }).click();
  await page.locator('.erase #eraseIn').waitFor();
  t = await erasePanelText(page);
  check(r, 'with nothing matched the panel says so, why that is common, and offers the finder', /none carries their email, WhatsApp number or full name/.test(t) && /most forms are in Persian/.test(t) && (await page.locator('#eraseFindIn').count()) === 1 && /No intake form is ticked, so none will be erased/.test(t), t.slice(0, 900));
  await page.locator('#eraseIn').fill('nolo_erase');
  log.dialogs.length = 0;
  await page.locator('#eraseGo').click();
  await L.settle(page, 1300);
  const al4 = log.dialogs.filter(x => x.type === 'alert').map(x => x.message).slice(-1)[0] || '';
  check(r, 'the alert does not claim a sign-in account for an athlete who had none, and says no form was erased', /Erased Nolo Erase for good/.test(al4) && !/sign-in account included/.test(al4) && /No intake form was erased/.test(al4), al4);
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

// A revoked buyer's panel was drawn inside a closed <details>: invisible. It opens for the person whose Erase is open.
S['erase-revoked'] = async (b) => {
  const r = { id: 'erase-revoked', title: 'Course and Testing lists: Erase… on a REVOKED buyer shows its panel (the Revoked section opens)', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'course' });
  const rev = new Date().toISOString();
  await page.evaluate(rev => {
    const D = window.__DB, base = { label: null, created_at: rev, initial_password: null, password_set_at: rev, sent_at: rev, revoked_at: rev };
    D.tps_accounts.push(Object.assign({ user_id: 'u-tps-rev', username: 'revoked_course' }, base));
    D.assess_accounts.push(Object.assign({ user_id: 'u-assess-rev', username: 'revoked_academy' }, base));
  }, rev);
  await page.evaluate(() => hardRefresh()); await L.settle(page, 900);
  await L.go(page, 'course');
  const det = page.locator('details', { has: page.locator('summary', { hasText: /Revoked/ }) });
  check(r, 'the Revoked section is closed until something in it is opened', (await det.count()) === 1 && (await det.getAttribute('open')) === null, '');
  await det.locator('summary').click();
  await det.locator('.credrow', { hasText: 'revoked_course' }).locator('.tp-erase').click();
  await page.locator('.erase #eraseIn').waitFor({ state: 'visible', timeout: 5000 });
  check(r, 'Erase… on a revoked course buyer: the panel is VISIBLE', await page.locator('.erase').isVisible() && await page.locator('#eraseIn').isVisible(), '');
  await page.evaluate(() => render());
  check(r, '...and still visible after the page redraws (the section stays open)', await page.locator('.erase').isVisible() && (await det.getAttribute('open')) !== null, '');
  await page.locator('.erase button', { hasText: 'Cancel' }).click();
  await L.go(page, 'assess');
  const det2 = page.locator('details', { has: page.locator('summary', { hasText: /Revoked/ }) });
  await det2.locator('summary').click();
  await det2.locator('.credrow', { hasText: 'revoked_academy' }).locator('.as-erase').click();
  await page.locator('.erase #eraseIn').waitFor({ state: 'visible', timeout: 5000 });
  await page.evaluate(() => render());
  check(r, 'the same on the testing-app list, also after a redraw', await page.locator('.erase').isVisible() && await page.locator('#eraseIn').isVisible(), '');
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

// An answer that does not come: after 30 s the coach may stop waiting; a success that arrives later still finishes the job.
S['erase-slow'] = async (b) => {
  const r = { id: 'erase-slow', title: 'Erase completely… when the server is slow: Stop waiting after 30 s, and a late success still finishes (fake clock)', checks: [] };
  const { page, log } = await L.openCoach(b, {});
  await seedErasable(page);
  await L.go(page, 'a/zed_erase/file');
  await page.locator('button', { hasText: /Erase completely/ }).click();
  await page.locator('.erase #eraseIn').waitFor();
  await page.locator('#eraseIn').fill('zed_erase');
  await page.clock.install();
  await page.evaluate(() => { window.__STUB.delay.coach_erase_person = 40000; });
  log.dialogs.length = 0;
  await page.locator('#eraseGo').click();
  await page.clock.runFor(5000);
  let t = await erasePanelText(page);
  check(r, 'while it waits (5 s) the panel says Erasing… and Cancel is disabled', /Erasing…/.test(t) && await page.locator('.erase button', { hasText: 'Cancel' }).isDisabled() && (await page.locator('.erase button', { hasText: 'Stop waiting' }).count()) === 0, t.slice(-200));
  await page.clock.runFor(26000);
  check(r, 'after 30 s a "Stop waiting" button replaces Cancel', (await page.locator('.erase button', { hasText: 'Stop waiting' }).count()) === 1 && (await page.locator('.erase button', { hasText: 'Cancel' }).count()) === 0, (await erasePanelText(page)).slice(-200));
  await page.locator('.erase button', { hasText: 'Stop waiting' }).click();
  t = await erasePanelText(page);
  check(r, 'Stop waiting says the page cannot tell, and how to find out', /cannot tell whether Zed Erased was erased/.test(t) && /gone from the roster, it went through/.test(t), t);
  // meanwhile the coach opens ANOTHER athlete's panel and starts typing the id
  await page.locator('.erase button', { hasText: 'Close' }).click();
  await page.evaluate(() => { window.__STUB.delay.coach_erase_person = 0; });
  await L.go(page, 'a/ben_test/file');
  await page.locator('button', { hasText: /Erase completely/ }).click();
  await page.clock.runFor(200); await L.settle(page, 300); await page.clock.runFor(200);
  await page.locator('.erase #eraseIn').waitFor();
  await page.locator('#eraseIn').fill('ben_te');
  // the answer arrives at 40 s: a success after the coach stopped waiting still finishes the job
  await page.clock.runFor(15000);
  await page.clock.runFor(3000); await L.settle(page, 400); await page.clock.runFor(3000); await L.settle(page, 400); await page.clock.runFor(3000); await L.settle(page, 400);
  check(r, 'the late success did not drag the coach away: Ben\'s panel is still open, on his page, with what was typed', (await page.evaluate(() => location.hash)) === '#a/ben_test/file' && (await page.locator('#eraseIn').count()) === 1 && (await page.locator('#eraseIn').inputValue()) === 'ben_te', await page.evaluate(() => location.hash));
  const d = await L.db(page);
  const al = log.dialogs.filter(x => x.type === 'alert').map(x => x.message);
  check(r, 'the late success is handled: the data is gone, the receipt is written, and the coach gets the receipt alert', !d.programs.some(x => x.athlete_id === 'zed_erase') && d.erasure_log.length === 1 && al.some(m => /Erased Zed Erased for good/.test(m)), { programs: d.programs.length, receipts: d.erasure_log.length, al: al.map(m => m.slice(0, 40)) });
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

// A preview answer that arrives late (the coach cancelled while it loaded and opened the panel again) must not touch the newer panel.
S['erase-stale'] = async (b) => {
  const r = { id: 'erase-stale', title: 'Erase completely…: an old preview answer never overwrites a newer panel (cancel while loading, then reopen)', checks: [] };
  const { page, log } = await L.openCoach(b, {});
  await seedErasable(page);
  await L.go(page, 'a/zed_erase/file');
  const reopenAfterCancel = async () => {
    await page.evaluate(() => { window.__STUB.delay.coach_erase_person = 2500; });
    await page.locator('button', { hasText: /Erase completely/ }).click();       // answer #1 will take 2.5 s
    await page.locator('.erase button', { hasText: 'Cancel' }).click();          // the loading panel has a Cancel
    await page.evaluate(() => { window.__STUB.delay.coach_erase_person = 0; });
    await page.locator('button', { hasText: /Erase completely/ }).click();       // answer #2 is immediate
    await page.locator('.erase #eraseIn').waitFor();
  };
  // round 1: the stale answer lands while the new panel is ready, after the coach took a ticked form off the list and typed the id
  await reopenAfterCancel();
  await page.locator('#erasePicked button', { hasText: 'remove' }).first().click();
  await page.locator('#eraseIn').fill('zed_er');
  await L.settle(page, 2900);
  let t = await erasePanelText(page);
  check(r, 'the stale answer did not re-tick the form the coach removed, nor wipe what was typed', /No intake form is ticked, so none will be erased/.test(t) && (await page.locator('#eraseIn').inputValue()) === 'zed_er', t.slice(0, 600));
  await page.locator('.erase button', { hasText: 'Cancel' }).click();
  // round 2: the stale answer lands while the real erasure is running
  await reopenAfterCancel();
  await page.locator('#eraseIn').fill('zed_erase');
  await page.evaluate(() => { window.__STUB.delay.coach_erase_person = 4500; });
  const n0 = await L.nCalls(page);
  log.dialogs.length = 0;
  await page.locator('#eraseGo').click();
  await L.settle(page, 3000);
  const go = page.locator('#eraseGo');
  check(r, 'the stale answer landed during the erasure and left the panel busy: "Erasing…", the button disabled, still ONE real call', /Erasing…/.test(await go.innerText()) && await go.isDisabled()
    && (await L.callsSince(page, n0)).filter(c => c.kind === 'rpc' && c.name === 'coach_erase_person' && c.payload.p_dry_run === false).length === 1, await go.innerText());
  await L.settle(page, 3000);
  const d = await L.db(page);
  const real = (await L.calls(page)).filter(c => c.kind === 'rpc' && c.name === 'coach_erase_person' && c.payload.p_dry_run === false);
  check(r, 'the erasure finished once: one real call in all, one receipt, the data gone', real.length === 1 && d.erasure_log.length === 1 && !d.programs.some(x => x.athlete_id === 'zed_erase'), { real: real.length, receipts: d.erasure_log.length });
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

// With the intake list unreadable the finder must not claim there are no forms.
S['erase-forms-unreadable'] = async (b) => {
  const r = { id: 'erase-forms-unreadable', title: 'Erase completely… when the intake forms did not load: the finder says so and is switched off', checks: [] };
  const { page, log } = await L.openCoach(b, { seed: { stub: { fail: [{ kind: 'rpc', name: 'intake_list', message: 'fixture: the forms are unreadable', times: 99 }] } } });
  await seedErasable(page);
  await L.go(page, 'a/zed_erase/file');
  await page.locator('button', { hasText: /Erase completely/ }).click();
  await page.locator('.erase #eraseIn').waitFor();
  const t = await erasePanelText(page);
  check(r, 'the finder says the forms did not load (not "0 other forms") and its box is disabled', /The intake forms did not load, so they cannot be searched here/.test(t) && !/0 other forms/.test(t) && await page.locator('#eraseFindIn').isDisabled(), t.slice(0, 900));
  check(r, 'the page-wide banner names the intake forms too', /Not everything loaded/.test(await page.locator('#loadwarn').innerText()) && /intake forms/.test(await page.locator('#loadwarn').innerText()), await page.locator('#loadwarn').innerText());
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

S['erase-buyers'] = async (b) => {
  const r = { id: 'erase-buyers', title: 'Course and Testing lists: the private note comes from buyer_notes, and Erase… removes a buyer for good', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'course' });
  let row = page.locator('.credrow', { hasText: 'fixture_buyer' });
  let rowText = (await row.innerText()).replace(/\s+/g, ' ');
  check(r, 'the course list shows the note from buyer_notes, not the account row\'s old label', /Fixture note about a course buyer/.test(rowText) && !/· Fixture\b(?! note)/.test(rowText), rowText);
  const sel = (await L.calls(page)).filter(c => c.kind === 'from' && c.name === 'tps_accounts' && c.op === 'select')[0];
  check(r, 'the list asks for the account\'s user_id (to match the note) and reads buyer_notes', !!sel && (await L.calls(page)).some(c => c.kind === 'from' && c.name === 'buyer_notes' && c.op === 'select'), sel && sel.mods);
  const n0 = await L.nCalls(page);
  await row.locator('.tp-erase').click();
  await page.locator('.erase #eraseIn').waitFor();
  const rpc0 = (await L.callsSince(page, n0)).filter(c => c.kind === 'rpc' && c.name === 'coach_erase_person');
  check(r, 'Erase… on a course buyer makes one dry-run call keyed on the username', rpc0.length === 1 && JSON.stringify(rpc0[0].payload) === JSON.stringify({ p_kind: 'course', p_key: 'fixture_buyer' }), rpc0.map(c => c.payload));
  let t = await erasePanelText(page);
  check(r, 'the panel names them by the note, lists the login, the note and the sign-in account, and asks for the username', /Erase Fixture note about a course buyer completely/.test(t) && /1 course login/.test(t) && /1 note of yours about them/.test(t) && /1 sign-in account/.test(t) && /Type fixture_buyer to confirm/.test(t) && !/intake form/.test(t), t.slice(0, 500));
  await page.locator('#eraseIn').fill('fixture_buyer');
  const m0 = await L.nCalls(page);
  log.dialogs.length = 0;
  await page.locator('#eraseGo').click();
  await L.settle(page, 1000);
  const real = (await L.callsSince(page, m0)).filter(c => c.kind === 'rpc' && c.name === 'coach_erase_person');
  check(r, 'one real call: kind course, the username, the typed word, no intake forms', real.length === 1 && real[0].payload.p_dry_run === false && real[0].payload.p_confirm === 'fixture_buyer' && real[0].payload.p_kind === 'course' && real[0].payload.p_key === 'fixture_buyer' && real[0].payload.p_intake_ids.length === 0, real.map(c => c.payload));
  let d = await L.db(page);
  check(r, 'the login and the note are gone; the list says there are no logins; the testing buyer is untouched', d.tps_accounts.length === 0 && !d.buyer_notes.some(x => x.user_id === 'u-tps-1') && d.buyer_notes.some(x => x.user_id === 'u-assess-1') && d.assess_accounts.length === 1 && /No logins yet/.test(await page.locator('#content').innerText()), d.buyer_notes);
  check(r, 'a receipt alert was shown', log.dialogs.some(x => x.type === 'alert' && /Receipt #1/.test(x.message)), log.dialogs.map(x => x.message.slice(0, 60)));

  // the testing-app list
  await L.go(page, 'assess');
  row = page.locator('.credrow', { hasText: 'fixture_academy' });
  rowText = (await row.innerText()).replace(/\s+/g, ' ');
  check(r, 'the testing list shows its note from buyer_notes too', /Fixture academy note/.test(rowText), rowText);
  await row.locator('.as-erase').click();
  await page.locator('.erase #eraseIn').waitFor();
  t = await erasePanelText(page);
  check(r, 'the panel counts every player (the removed one too), note and result', /2 players/.test(t) && /1 player note/.test(t) && /2 test results/.test(t) && /1 testing-app login/.test(t) && /1 sign-in account/.test(t), t.slice(0, 600));
  await page.locator('#eraseIn').fill('FIXTURE_ACADEMY');
  await page.locator('#eraseGo').click();
  await L.settle(page, 1000);
  d = await L.db(page);
  check(r, 'all of it is gone, in one call', d.assess_players.length === 0 && d.assess_notes.length === 0 && d.assess_results.length === 0 && d.assess_accounts.length === 0 && d.erasure_log.length === 2
    && (await L.calls(page)).filter(c => c.kind === 'rpc' && c.name === 'coach_erase_person' && c.payload.p_dry_run === false).length === 2, { players: d.assess_players.length, receipts: d.erasure_log.length });
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

S['buyer-notes-fallback'] = async (b) => {
  const r = { id: 'buyer-notes-fallback', title: 'Course list when buyer_notes cannot be read (stage53 not applied): the account\'s own label shows, nothing breaks', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'course', seed: { stub: { fail: [{ kind: 'from', name: 'buyer_notes', message: 'relation "public.buyer_notes" does not exist', code: '42P01', times: 99 }] } } });
  const rowText = (await page.locator('.credrow', { hasText: 'fixture_buyer' }).innerText()).replace(/\s+/g, ' ');
  check(r, 'the old label is shown, and the list still loads with its buttons', /· Fixture/.test(rowText) && !/Fixture note about/.test(rowText) && (await page.locator('.credrow .tp-erase').count()) === 1, rowText);
  check(r, 'there is no load-error banner for a missing notes table (before stage53 that is expected)', !/Not everything loaded/.test(await page.locator('#loadwarn').innerText()), await page.locator('#loadwarn').innerText());
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};
S['buyer-notes-error'] = async (b) => {
  const r = { id: 'buyer-notes-error', title: 'Course list when buyer_notes fails for a real reason: the list still loads and the banner names it (it used to show every buyer with no note, silently)', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'course', seed: { stub: { fail: [{ kind: 'from', name: 'buyer_notes', message: 'fixture: the server fell over', code: 'XX000', times: 99 }] } } });
  const banner = (await page.locator('#loadwarn').innerText()).replace(/\s+/g, ' ');
  check(r, 'the banner says your notes about buyers did not load, with the reason', /Not everything loaded/.test(banner) && /your notes about buyers/.test(banner) && /fixture: the server fell over/.test(banner), banner);
  check(r, 'the list still loads, with the account\'s own label as the fallback', (await page.locator('.credrow .tp-erase').count()) === 1 && /· Fixture/.test((await page.locator('.credrow', { hasText: 'fixture_buyer' }).innerText()).replace(/\s+/g, ' ')), '');
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

// ── Training load when a session has no duration or RPE (TODAY-6, Amir 2026-10-11: skip them and grey out the ratio) ──
S['load-partial'] = async (b) => {
  const r = { id: 'load-partial', title: 'Training load: sessions with no duration or RPE are left out and the ratio is not shown (not enough data)', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'a/ava_test/work' });
  const addSessions = rows => page.evaluate(rows => { rows.forEach(x => window.__DB.session_history.push(x)); }, rows);
  const day = n => page.evaluate(n => new Date(Date.now() - n * 86400e3).toISOString().slice(0, 10), n);
  const mk = async (n, extra) => Object.assign({ athlete_id: 'ava_test', athlete_name: 'Ava Example', day: 1, completed_on: await day(n), status: 'Complete', session_rpe: 7, duration_min: 50,
    readiness: null, day_note: '', focus: '', summary: '', updated_at: new Date().toISOString(), coach_status: 'read', log: null }, extra || {});
  const strip = async () => (await page.locator('.mstrip').first().innerText()).replace(/\s+/g, ' ');
  const reload = async () => { await page.evaluate(() => hardRefresh()); await L.settle(page, 900); };
  // 1. a month of full data: the ratio shows
  await addSessions([await mk(15), await mk(20), await mk(26), await mk(12), await mk(9)]);
  await reload();
  let t = await strip();
  check(r, 'every session has a duration and RPE: the ratio and its zone are shown', /ACWR · (Optimal|Climbing|High load|Low load)/.test(t) && !/not enough data/.test(t), t);
  // 2. one session with no duration: the ratio goes, with the reason
  await addSessions([await mk(5, { duration_min: null })]);
  await reload();
  t = await strip();
  check(r, 'one session in the window has no duration: the pill says "not enough data" and shows no number or zone', /not enough data/.test(t) && !/ACWR ·/.test(t) && /training load\s*—/i.test(t), t);
  const card = (await page.locator('.chart-card', { hasText: 'Training load' }).first().innerText().catch(() => '')).replace(/\s+/g, ' ');
  const cardText = card || (await page.evaluate(() => { const d = document.querySelector('.chart-card'); return d ? d.textContent : ''; })).replace(/\s+/g, ' ');
  check(r, 'the load card says why, with the count, in the singular', /Not enough data/.test(cardText) && /1 of 9 sessions in the last 4 weeks has no duration or RPE/.test(cardText) && /It is left out/.test(cardText), cardText);
  check(r, 'the bars still show the sessions that do have a load, and say one was left out', /and (is|are) left out/.test(cardText) && !/count as zero/.test(cardText), cardText);
  // 3. two sessions
  await addSessions([await mk(3, { session_rpe: null })]);
  await reload();
  const card2 = await page.evaluate(() => (document.querySelector('.chart-card') || {}).textContent || '');
  check(r, 'two missing: the plural wording', /2 of 10 sessions in the last 4 weeks have no duration or RPE/.test(card2.replace(/\s+/g, ' ')) && /They are left out/.test(card2.replace(/\s+/g, ' ')), card2.replace(/\s+/g, ' ').slice(0, 400));
  // 4. once they are filled in the ratio comes back
  await page.evaluate(() => { window.__DB.session_history.filter(x => x.athlete_id === 'ava_test').forEach(x => { if (x.duration_min == null) x.duration_min = 45; if (x.session_rpe == null) x.session_rpe = 6; }); });
  await reload();
  t = await strip();
  check(r, 'once the duration and RPE are filled in, the ratio is back', /ACWR · /.test(t) && !/not enough data/.test(t), t);
  // 5. a session older than four weeks without a duration does not matter
  await addSessions([await mk(40, { duration_min: null })]);
  await reload();
  t = await strip();
  check(r, 'a session older than 4 weeks with no duration is outside the window and changes nothing', /ACWR · /.test(t), t);
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

// ── Session history is read light (audit TODAY-12, 2026-10-11, pile B1) ──────────────────────────────────────────────────────
// session_history is the one table that grows without limit, and 78% of its bytes are two columns the numbers never read:
// `summary` (the plain-text log) and `log` (the structured one). Boot reads everything else, plus the text of the few unread
// sessions that might hold an exercise note (the note lives inside the text and is what puts someone in Needs you); an
// athlete's own text and log are read when their file opens, once, and again only after the list itself was reloaded.
const histSel = cs => cs.filter(c => c.kind === 'from' && c.name === 'session_history' && c.op === 'select');
const heavySel = cs => histSel(cs).filter(c => /summary/.test(c.mods.cols) && c.filters.some(f => /^athlete_id\.eq\./.test(f)));

S['hist-light-boot'] = async (b) => {
  const r = { id: 'hist-light-boot', title: 'Boot reads sessions without their text, and an exercise-only note still reaches Needs you', checks: [] };
  const { page, today, log } = await L.openCoach(b, { seed: { bigHistory: 300 } });
  const FX = require('./fixtures');
  // Ben's only note is on an exercise (nothing in the day note): it lives inside the summary text.
  await page.evaluate(([on]) => {
    window.__DB.session_history.push({ athlete_id: 'ben_test', athlete_name: 'Ben Example', day: 3, completed_on: on, status: 'Complete', session_rpe: 7, duration_min: 50,
      readiness: null, day_note: '', focus: '', coach_status: 'new', log: null, updated_at: new Date().toISOString(),
      summary: 'Day 3 — Pull Day (fixture)\n\nExercise log:\n[Primary]\n• Trap Bar Deadlift (✓)\n    Set 1: 80 @8 ✓\n    Note: fixture lower back felt tight' });
  }, [FX.daysAgo(today, 1)]);
  const n0 = await L.nCalls(page);
  await page.evaluate(() => hardRefresh()); await L.settle(page, 900);
  const sel = histSel(await L.callsSince(page, n0));
  const light = sel.find(c => !/summary/.test(c.mods.cols)), notes = sel.find(c => /summary/.test(c.mods.cols));
  check(r, 'a refresh reads session_history twice: the numbers, and the text of unread sessions that may hold an exercise note', sel.length === 2 && !!light && !!notes, sel.map(c => c.mods.cols + ' | ' + c.filters.join(' & ')));
  check(r, 'the numbers read neither `summary` nor `log` (and not *)', !!light && !/\*|summary|\blog\b/.test(light.mods.cols), light && light.mods.cols);
  check(r, 'the text read is limited to unread sessions that contain "Note:"', !!notes && notes.filters.some(f => /^or\(coach_status\.is\.null,coach_status\.eq\.new\)$/.test(f)) && notes.filters.some(f => /^summary\.like\./.test(f)), notes && notes.filters);
  const st = await page.evaluate(() => ({
    withSummary: S.hist.filter(h => h.summary !== undefined).map(h => h.athlete_id + ':' + h.day),
    withLog: S.hist.filter(h => 'log' in h).length, rows: S.hist.length,
    ben: S.ath.ben_test.needReplyRecent.map(s => s.day), reasons: S.ath.ben_test.reasons.map(x => x.key + ':' + x.text) }));
  check(r, 'only the one session with an exercise note holds its text in memory, and none holds a log', st.withSummary.join() === 'ben_test:3' && st.withLog === 0, st);
  check(r, 'every session is still there for the numbers (no row lost to the lighter read)', st.rows === 5 + 300 + 1, st.rows);
  check(r, 'the exercise-only note still counts: Ben has a note to read', st.ben.join() === '3' && st.reasons.some(x => /^note:1 note to read/.test(x)), st);
  const need = await page.locator('#needPanel .need', { hasText: 'Ben' }).first().innerText();
  check(r, 'Needs you quotes it', /Day 3 note: “fixture lower back felt tight”/.test(need), need.replace(/\s+/g, ' '));
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

S['hist-athlete-open'] = async (b) => {
  const r = { id: 'hist-athlete-open', title: 'An athlete\'s text and log are read when their file opens, once, and again only after the list was reloaded', checks: [] };
  const { page, log } = await L.openCoach(b, {});
  let n0 = await L.nCalls(page);
  await L.go(page, 'a/ava_test/work');
  let hs = heavySel(await L.callsSince(page, n0));
  check(r, 'opening Ava reads her sessions\' text and log, filtered on her id', hs.length === 1 && /\blog\b/.test(hs[0].mods.cols) && hs[0].filters.includes('athlete_id.eq."ava_test"'), hs.map(c => c.mods.cols + ' | ' + c.filters.join(' & ')));
  const did = await rowLoc(page, 'Goblet Squat').locator('.cmp-did').innerText();
  check(r, 'the comparison has her log: Goblet Squat reads 4/4 sets', /4\/4 sets/.test(did), did.replace(/\s+/g, ' '));
  const raw = await page.locator('.wday.open .rawlog .elog-body').first().textContent();
  check(r, 'the raw log shows what was sent', /Set 1: 20 @7/.test(raw || ''), (raw || '').slice(0, 80));
  n0 = await L.nCalls(page);
  await L.go(page, 'a/ava_test/proof'); await L.go(page, 'a/ava_test/work');
  check(r, 'switching sub-tabs reads nothing again', !histSel(await L.callsSince(page, n0)).length, '');
  n0 = await L.nCalls(page);
  await L.go(page, 'a/ben_test/work');
  hs = heavySel(await L.callsSince(page, n0));
  check(r, 'opening Ben reads only Ben\'s', hs.length === 1 && hs[0].filters.includes('athlete_id.eq."ben_test"'), hs.map(c => c.filters));
  n0 = await L.nCalls(page);
  await L.go(page, 'a/ava_test/work');
  check(r, 'going back to Ava reads nothing: her text is already in memory', !histSel(await L.callsSince(page, n0)).length, '');
  n0 = await L.nCalls(page);
  await page.evaluate(() => refetch(['hist'])); await L.settle(page, 900);
  const cs2 = await L.callsSince(page, n0);
  check(r, 'after the list is reloaded the open file reads her text again (the old rows are gone)', heavySel(cs2).length === 1 && histSel(cs2).length === 3, histSel(cs2).map(c => c.mods.cols));
  check(r, 'and the comparison is still there', /4\/4 sets/.test(await rowLoc(page, 'Goblet Squat').locator('.cmp-did').innerText()), '');
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

S['hist-heavy-fails'] = async (b) => {
  const r = { id: 'hist-heavy-fails', title: 'A failed read of an athlete\'s logs says so; it never reads as "not logged"', checks: [] };
  const { page, log } = await L.openCoach(b, {});
  await page.evaluate(() => window.__STUB.fail.push({ kind: 'from', name: 'session_history', op: 'select', message: 'fixture: logs unavailable', times: 1 }));
  await L.go(page, 'a/ava_test/work');
  const txt = (await page.locator('#tabbody').innerText()).replace(/\s+/g, ' ');
  const open = (await page.locator('.wday.open').first().innerText()).replace(/\s+/g, ' ');
  check(r, 'the work tab says the logs did not load, and why', /did not load/i.test(txt) && /fixture: logs unavailable/.test(txt), txt.slice(0, 260));
  check(r, 'the open day shows no verdict or "not logged" built from a log that never arrived', !/not logged|exactly as prescribed|not done|off plan/.test(open), open.slice(0, 260));
  check(r, 'the numbers that did load are still shown (date, sRPE, minutes)', /sRPE 7\/10/.test(open) && /50 min/.test(open), open.slice(0, 200));
  await page.locator('#tabbody button', { hasText: 'Try again' }).click(); await L.settle(page, 900);
  const txt2 = (await page.locator('#tabbody').innerText()).replace(/\s+/g, ' ');
  check(r, 'Try again reads them: the notice is gone and the comparison appears', !/did not load/i.test(txt2) && /4\/4 sets/.test(txt2), txt2.slice(0, 200));
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

// ── Twin rules the dashboard now shares with the athlete app (audit TWIN-6, TWIN-7, 2026-10-11, pile B6) ─────────────────────
// The rules themselves are pinned by scripts/check_twins.js (3,500 checks). These scenarios check the SCREENS that use them.
S['live-snapshot-window'] = async (b) => {
  const r = { id: 'live-snapshot-window', title: 'Live app snapshot: a started day is "in progress" by the app\'s rule (another calendar day AND over six hours), not a 30-hour window', checks: [] };
  const states = async (fixedTime, stamps) => {
    const { page, log } = await L.openCoach(b, { tz: 'UTC', fixedTime });
    await page.evaluate(stamps => {
      const blob = window.__DB.athlete_progress.find(p => p.athlete_id === 'ava_test').data;
      Object.keys(stamps).forEach(day => { blob['ava_test_readiness_' + day] = JSON.stringify({ timestamp: stamps[day], composite: 3.5, skipped: false }); });
      S.prog.find(p => p.athlete_id === 'ava_test').data = blob;
    }, stamps);
    await L.go(page, 'a/ava_test/work');
    await page.evaluate(() => { const d = document.getElementById('livesnap'); if (d) d.open = true; });
    const txt = (await page.locator('#livesnap').innerText()).replace(/\s+/g, ' ');
    const out = {};
    ['1', '2', '3'].forEach(d => { const m = new RegExp('Day ' + d + '\\b[^]*?(in progress|a leftover, not live)').exec(txt); out[d] = m ? m[1] : null; });
    await page.context().close();
    return { out, errors: log.errors, txt };
  };
  // 14:00 UTC. Day 1: this morning (5 h). Day 2: last night 22:00 (16 h, another day: the old 30-hour window said live). Day 3: 23 h ago.
  const a = await states('2026-10-11T14:00:00Z', { 1: '2026-10-11T09:00:00Z', 2: '2026-10-10T22:00:00Z', 3: '2026-10-10T15:00:00Z' });
  check(r, 'at 14:00, a day started at 09:00 today is in progress', a.out['1'] === 'in progress', a.out);
  check(r, 'at 14:00, a day started yesterday at 22:00 (16 h) is a leftover (it used to read in progress for 30 hours)', a.out['2'] === 'a leftover, not live', a.out);
  check(r, 'at 14:00, a day started yesterday at 15:00 (23 h) is a leftover', a.out['3'] === 'a leftover, not live', a.out);
  // 02:00 UTC the next day. A session begun at 23:30 is 2.5 h old: midnight is not the end of a session (DATA-02).
  const c = await states('2026-10-11T02:00:00Z', { 1: '2026-10-10T23:30:00Z', 2: '2026-10-10T19:30:00Z', 3: '2026-10-11T01:00:00Z' });
  check(r, 'at 02:00, a day started at 23:30 (2.5 h, across midnight) is still in progress', c.out['1'] === 'in progress', c.out);
  check(r, 'at 02:00, a day started at 19:30 the evening before (6.5 h, another day) is a leftover', c.out['2'] === 'a leftover, not live', c.out);
  check(r, 'at 02:00, a day started at 01:00 today is in progress', c.out['3'] === 'in progress', c.out);
  check(r, 'no page errors', !a.errors.length && !c.errors.length, a.errors.concat(c.errors));
  return r;
};

S['retest-flag'] = async (b) => {
  const r = { id: 'retest-flag', title: 'Personal records: only a `test` value the athlete\'s app reads is a retest flag', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'a/ava_test/work' });
  await page.evaluate(() => {
    const row = window.__DB.programs.find(p => p.athlete_id === 'ava_test');
    const d = JSON.parse(JSON.stringify(row.data));
    const ex = d.workouts.days[0].blocks[1].exercises;               // Goblet Squat, Chest-Supported Dumbbell Row
    ex[0].test = '3RM';
    ex[1].test = 'heavy';                                             // the app ignores it
    d.workouts.days[1].blocks[0].exercises[0].test = true;            // Dumbbell Bench Press: the 5RM default
    d.workouts.days[2].blocks[0].exercises[0].test = '11RM';          // Trap Bar Deadlift: over the 10-rep ceiling, ignored
    row.data = d; row.updated_at = new Date(Date.now() + 1000).toISOString();
  });
  await page.evaluate(() => reloadPrograms().then(render)); await L.settle(page, 700);
  await L.go(page, 'athletes'); await L.go(page, 'a/ava_test/work');
  const rows = (await page.locator('.prlist .pr-row').allInnerTexts()).map(x => x.replace(/\s+/g, ' ').trim());
  const has = name => rows.some(x => x.toLowerCase().startsWith(name.toLowerCase()));
  check(r, 'a "3RM" lift is listed with its tag', rows.some(x => /^goblet squat\s*3rm/i.test(x)), rows);
  check(r, '`test: true` is the 5RM default', rows.some(x => /^dumbbell bench press\s*5rm/i.test(x)), rows);
  check(r, 'a value the app ignores ("heavy") is not a flag here either', !has('Chest-Supported Dumbbell Row'), rows);
  check(r, '"11RM", over the 10-rep ceiling, is not a flag', !has('Trap Bar Deadlift'), rows);
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

S['readiness-chart'] = async (b) => {
  const r = { id: 'readiness-chart', title: 'Readiness: the pill, the chart and the day card all read the app\'s check-in score and the athlete\'s usual', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'a/ava_test/work' });
  const T = s => s.replace(/\s+/g, ' ').trim();
  // Ava: nine check-ins, oldest first. The first six are from before the app stored a verdict (no score, no usual: they are worked out);
  // the rest carry what the app stored. Soreness is 1 on one of them, so the old composite and the score differ. The last day has two
  // check-ins, put in the database newest first.
  await page.evaluate(() => {
    const arr = window.__DB.session_history;
    for (let i = arr.length - 1; i >= 0; i--) if (arr[i].athlete_id === 'ava_test') arr.splice(i, 1);
    const day = n => new Date(Date.now() - n * 86400e3).toISOString().slice(0, 10);
    const ans = (s, e, st, o, so, extra) => Object.assign({ sleep: s, energy: e, stress: st, overall: o, soreness: so, composite: Math.round(((s + e + so + st) / 4) * 100) / 100, skipped: false }, extra || {});
    const row = (ago, d, rd) => ({ athlete_id: 'ava_test', athlete_name: 'Ava Example', day: d, completed_on: day(ago), status: 'Complete', session_rpe: 7, duration_min: 50,
      readiness: rd, day_note: '', focus: '', summary: 'Day ' + d + ' — fixture', coach_status: 'read', log: null, updated_at: new Date().toISOString() });
    [row(30, 1, ans(4, 4, 4, 4, 4)), row(27, 2, ans(4, 4, 4, 4, 4)), row(24, 3, ans(3, 3, 3, 3, 1)), row(21, 1, ans(4, 5, 4, 5, 3)), row(18, 2, ans(4, 4, 4, 4, 4)), row(15, 3, ans(4, 4, 4, 4, 4)),
     row(12, 1, ans(3, 3, 3, 3, 3, { level: 'amber', sore: '', drop: 1, score: 3, base: 3.92, asWritten: false })),
     row(9, 2, ans(2, 2, 2, 2, 2, { level: 'red', sore: 'half', drop: 1, score: 2, base: 3.79, asWritten: false })),
     row(6, 3, ans(4, 4, 4, 4, 1, { level: 'green', sore: 'skip', drop: 0, score: 4, base: 3.56, asWritten: false })),
     row(3, 2, ans(2, 3, 3, 2, 3, { level: 'amber', sore: '', drop: 1, score: 2.5, base: 3.6, asWritten: false, timestamp: new Date(Date.now() - 3 * 86400e3 + 5000).toISOString() })),
     row(3, 1, ans(4, 4, 4, 4, 3, { level: 'green', sore: '', drop: 0, score: 4, base: 3.6, asWritten: false, timestamp: new Date(Date.now() - 3 * 86400e3 - 5000).toISOString() }))
    ].forEach(x => arr.push(x));
  });
  await page.evaluate(() => hardRefresh()); await L.settle(page, 900);
  await L.go(page, 'a/ava_test/work');
  const strip = T(await page.locator('.mstrip').first().innerText());
  const chart = await page.evaluate(() => {
    const c = [...document.querySelectorAll('#chartbox .chart-card')].find(x => /Readiness/.test(x.textContent));
    return c ? { text: c.textContent.replace(/\s+/g, ' ').trim(), dots: c.querySelectorAll('svg circle').length, dashed: c.querySelectorAll('svg line[stroke-dasharray]').length } : null;
  });
  check(r, 'the chart card is there', !!chart, strip);
  if (chart) {
    check(r, 'the big number is the latest check-in\'s score (2.5, not the composite 2.75), against their usual 3.6', /^Readiness 2\.5\/5 · usual 3\.6/.test(chart.text), chart.text);
    check(r, 'it says how far under their usual, in the app\'s measure', /-1\.1 vs their usual \(the mean of their last ten check-ins before this one\)/.test(chart.text), chart.text);
    check(r, 'one dot per answered check-in (11) and a dashed line at their usual', chart.dots === 11 && chart.dashed === 1, { dots: chart.dots, dashed: chart.dashed });
    check(r, 'the legend names the measure the app uses, and the old "Composite per session" wording is gone', /sleep, energy, stress and how ready they feel/.test(chart.text) && /as the athlete's app scores it/.test(chart.text) && !/omposite/.test(chart.text), chart.text);
  }
  check(r, 'the pill and the chart name the same check-in: 2.5 against their usual 3.6, a lower day', /Readiness\s*2\.5\/5\s*lower day · usual 3\.6/i.test(strip), strip);
  // The day cards: the number beside the verdict is the one that made it.
  const meta = async n => T(await page.locator('#wday-' + n + ' .wday-meta').innerText());
  const m2 = await meta(2), m1 = await meta(1), m3 = await meta(3);
  check(r, 'Day 2 (the later check-in of the shared day) reads 2.5/5 with its lower day, not the composite 2.75', /readiness 2\.5\/5 · lower day/.test(m2) && !/2\.75/.test(m2), m2);
  check(r, 'Day 1 reads its stored score (4/5), not the composite (3.75)', /readiness 4\/5/.test(m1) && !/3\.75/.test(m1), m1);
  check(r, 'Day 3 reads the score 4/5 although its soreness answer was 1 (the composite would say 3.25), and says the jumps were skipped', /readiness 4\/5 · sore: no jumps/.test(m3) && !/3\.25/.test(m3), m3);

  // Eli: too few check-ins for a usual. Two from before the verdict and one stored with `base: null` (the app's own "fewer than five").
  await page.evaluate(() => {
    const day = n => new Date(Date.now() - n * 86400e3).toISOString().slice(0, 10);
    const ans = (s, e, st, o, so, extra) => Object.assign({ sleep: s, energy: e, stress: st, overall: o, soreness: so, composite: Math.round(((s + e + so + st) / 4) * 100) / 100, skipped: false }, extra || {});
    const row = (ago, d, rd) => ({ athlete_id: 'eli_new', athlete_name: 'Eli Example', day: d, completed_on: day(ago), status: 'Complete', session_rpe: 7, duration_min: 50,
      readiness: rd, day_note: '', focus: '', summary: 'Day ' + d + ' — fixture', coach_status: 'read', log: null, updated_at: new Date().toISOString() });
    [row(9, 1, ans(3, 3, 3, 3, 3)), row(6, 2, ans(4, 4, 4, 4, 4)), row(2, 1, ans(4, 3, 4, 3, 3, { level: 'green', sore: '', drop: 0, score: 3.5, base: null, asWritten: false }))].forEach(x => window.__DB.session_history.push(x));
  });
  await page.evaluate(() => hardRefresh()); await L.settle(page, 900);
  await L.go(page, 'athletes'); await L.go(page, 'a/eli_new/work');
  const strip2 = T(await page.locator('.mstrip').first().innerText());
  const chart2 = await page.evaluate(() => {
    const c = [...document.querySelectorAll('#chartbox .chart-card')].find(x => /Readiness/.test(x.textContent));
    return c ? { text: c.textContent.replace(/\s+/g, ' ').trim(), dots: c.querySelectorAll('svg circle').length, dashed: c.querySelectorAll('svg line[stroke-dasharray]').length } : null;
  });
  check(r, 'three check-ins: the pill says "no usual yet" beside the app\'s verdict, with no invented difference', /Readiness\s*3\.5\/5\s*normal day · no usual yet/i.test(strip2) && !/vs their usual/.test(strip2), strip2);
  check(r, 'the chart says the same, plots three dots and draws no dashed line', !!chart2 && /^Readiness 3\.5\/5 · no usual yet/.test(chart2.text) && /Their usual starts once they have five check-ins to go on/.test(chart2.text) && chart2.dots === 3 && chart2.dashed === 0, chart2);
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

// ── One way to say what did not work (audit BROWSER-10, FLOW-22, MKT-13, 2026-10-11, pile B5) ─────────────────────────────────────
// A failure used to be a 2.6-second toast in some tabs (easy to miss) and a pop-up in others (it stopped everything, and was gone once
// dismissed). Now: it worked = a toast; it did not = a line at the bottom that stays until it is dismissed; a question = a confirm;
// something to read or copy once = an alert. Lines carry the same words the pop-ups did, so every other scenario still finds them.
S['fail-bar'] = async (b) => {
  const r = { id: 'fail-bar', title: 'A failure stays on screen until it is dismissed, in view wherever the page is scrolled; a success stays a toast; neither is a pop-up', checks: [] };
  const { page, log } = await L.openCoach(b, {});
  const pops = () => log.dialogs.filter(d => d.via !== 'bar');
  const lines = () => page.locator('#failbar .fb-line').count();
  const post = async text => { await page.locator('#coachLineInput').fill(text); await page.locator('.mic .row .btn.primary').click(); await L.settle(page, 500); };
  // 1. a failed post on Today
  await page.evaluate(() => window.__STUB.fail.push({ kind: 'rpc', name: 'set_coach_note', message: 'fixture: the line could not be saved', times: 2 }));
  await post('first try');
  let fb = await L.failText(page);
  check(r, 'a failed save shows a line that says why', /Could not post: fixture: the line could not be saved/.test(fb), fb);
  check(r, 'it is not a pop-up, and the toast does not carry it', !pops().length && !/Could not post/.test(await L.toastText(page)), pops());
  await page.waitForTimeout(3600);
  check(r, 'it is still there after the 2.6 seconds a toast lasts', /Could not post/.test(await L.failText(page)), await L.failText(page));
  await page.evaluate(() => window.scrollTo(0, 99999));
  const box = await page.evaluate(() => { const e = document.getElementById('failbar'), q = e ? e.getBoundingClientRect() : { top: -1, bottom: -1 }; return { top: q.top, bottom: q.bottom, h: innerHeight }; });
  check(r, 'it stays in view wherever the page is scrolled to', box.top >= 0 && box.bottom <= box.h, box);
  // 2. the same failure again: one line, with a count
  await page.evaluate(() => window.scrollTo(0, 0));
  await post('second try');
  fb = await L.failText(page);
  check(r, 'the same words twice are one line with a count', (await lines()) === 1 && /×2/.test(fb), fb);
  // 3. a different failure is a second line, and Dismiss all appears
  await L.go(page, 'intake');
  await page.evaluate(() => window.__STUB.fail.push({ kind: 'rpc', name: 'set_intake_status', message: 'fixture failure', times: 1 }));
  await L.jsClick(page.locator('.intake-card', { hasText: 'Fixture Applicant One' }).locator('.intake-act[data-to=handled]'));
  await L.settle(page, 500);
  check(r, 'a different failure is a second line, and Dismiss all appears', (await lines()) === 2 && (await page.locator('#failbar .fb-all').count()) === 1, await L.failText(page));
  // 4. dismissing
  if (await lines()) await page.locator('#failbar .fb-line').first().locator('.fb-x').click();
  check(r, 'the cross removes just that line, and Dismiss all goes with the second line', (await lines()) === 1 && (await page.locator('#failbar .fb-all').count()) === 0, await L.failText(page));
  // 5. a success is a toast, not a line
  await L.go(page, 'today');
  await post('works now');
  check(r, 'a success is a toast', /On the wall/.test(await L.toastText(page)), await L.toastText(page));
  check(r, 'and adds no line', (await lines()) === 1, await L.failText(page));
  if (await lines()) await page.locator('#failbar .fb-x').click();
  check(r, 'dismissing the last line hides the bar', await page.evaluate(() => { const e = document.getElementById('failbar'); return !!e && e.hidden; }), '');
  check(r, 'the bar is announced as an alert', await page.evaluate(() => { const e = document.getElementById('failbar'); return !!e && e.getAttribute('role') === 'alert'; }), '');
  // 6. a phone
  await page.setViewportSize({ width: 360, height: 740 });
  await page.evaluate(() => window.__STUB.fail.push({ kind: 'rpc', name: 'set_coach_note', message: 'fixture: ' + 'long reason '.repeat(18), times: 1 }));
  await post('on a phone');
  const ph = await page.evaluate(() => { const e = document.getElementById('failbar'), q = e ? e.getBoundingClientRect() : { left: -1, right: 9999 }; return { left: q.left, right: q.right, w: innerWidth, sideways: document.documentElement.scrollWidth > innerWidth }; });
  check(r, 'on a 360 px phone the line fits and nothing scrolls sideways', ph.left >= 0 && ph.right <= ph.w && !ph.sideways, ph);
  check(r, 'no pop-up was shown at any point', !pops().length, pops());
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

// ── What the coach typed or opened in an athlete's file survives a redraw (audit FILE-9, 2026-10-11, pile B4) ───────────────────
// A redraw used to rebuild the tab from scratch: it wiped the password box and an email pasted under "Add past session", hid the add-session
// box again and folded Version history, the Coaching log, a day's raw log and the live snapshot shut.
S['file-redraw-keeps-work'] = async (b) => {
  const r = { id: 'file-redraw-keeps-work', title: 'A redraw keeps the password box, the pasted email and the sections the coach opened, for that athlete only', checks: [] };
  const { page, log, today } = await L.openCoach(b, { hash: 'a/ava_test/file' });
  const FX = require('./fixtures');
  // File tab: the Change password box with typed text and the cursor in it; Version history and the Coaching log open.
  await page.locator('button', { hasText: 'Change password' }).click();
  await page.locator('#athPw').fill('typed-Secret-123');
  const section = title => page.locator('details.rawlog', { hasText: title }).first();   // by what the coach reads, not by an id
  await section('Version history').evaluate(d => { d.open = true; });
  await section('Coaching log').evaluate(d => { d.open = true; });
  await L.settle(page, 600);
  await page.locator('#athPw').focus();
  const fileState = async () => Object.assign(await page.evaluate(() => ({
    pw: (document.getElementById('athPw') || {}).value,
    focus: document.activeElement && document.activeElement.id,
    pvlist: (document.getElementById('pvlist') || {}).innerText || '', clog: (document.getElementById('clog-body') || {}).innerText || '' })),
    { pv: await section('Version history').evaluate(d => d.open), cl: await section('Coaching log').evaluate(d => d.open) });
  const redraws = [
    ['a full redraw (the Proof levels arriving, ↻ Refresh or a save)', () => { assemble(); render(); }],
    ['a redraw of the tab body only', () => renderDetailBody()],
  ];
  for (const [name, fn] of redraws) {
    await page.evaluate(fn); await L.settle(page, 800);
    const st = await fileState();
    check(r, name + ': the typed password is still in the box', st.pw === 'typed-Secret-123', st);
    check(r, name + ': Version history and the Coaching log are still open, and loaded again', st.pv && st.cl && !/Loading/.test(st.pvlist + st.clog) && /Fixture coaching log/.test(st.clog), st);
    check(r, name + ': the cursor is still in the box', st.focus === 'athPw', st.focus);
  }
  // Another athlete's file starts clean.
  await L.go(page, 'a/ben_test/file');
  const ben = await fileState();
  check(r, 'another athlete\'s file starts with no typed password and the sections shut', !ben.pw && !ben.pv && !ben.cl, ben);

  // The work tab: Add past session from email with a pasted email, a date and the preview.
  await L.go(page, 'a/ava_test/work');
  await page.locator('button', { hasText: '+ Add past session from email' }).click();
  const email = 'Athlete: Ava Example\nDay 3 — Pull Day (fixture)\nStatus: Complete\nSession RPE: 7\nDuration: 40\n\nExercise log:\n[Primary]\n• Trap Bar Deadlift (✓)\n    Set 1: 80 @8 ✓';
  const day = FX.daysAgo(today, 2);
  await page.locator('#as-paste').fill(email);
  await page.locator('#as-date').fill(day);
  await page.locator('button', { hasText: 'Read email' }).click();
  await page.evaluate(() => { const d = document.querySelector('.wday .rawlog'); if (d) d.open = true; });
  const addState = () => page.evaluate(() => ({
    shown: (document.getElementById('add-session') || {}).style && document.getElementById('add-session').style.display === 'block',
    paste: (document.getElementById('as-paste') || {}).value, date: (document.getElementById('as-date') || {}).value,
    preview: (document.getElementById('as-preview') || {}).innerText || '', canSave: !!document.getElementById('as-save') && !document.getElementById('as-save').disabled,
    rawOpen: !!document.querySelector('.wday .rawlog[open]') }));
  const before = await addState();
  check(r, 'set-up: the box is open, the email read, Save enabled, a raw log open', before.shown && before.paste === email && /Day 3/.test(before.preview) && before.canSave && before.rawOpen, before);
  for (const [name, fn] of [['toggling a day card (a tab-body redraw)', () => toggleWorkDay(2)], ['a full redraw', () => { assemble(); render(); }]]) {
    await page.evaluate(fn); await L.settle(page, 700);
    const st = await addState();
    check(r, name + ': the add-session box stays open with the pasted email, the date, the preview and Save', st.shown && st.paste === email && st.date === day && /Day 3/.test(st.preview) && st.canSave, st);
  }
  check(r, 'a day\'s raw log that was open stays open through a full redraw', (await addState()).rawOpen, '');
  // Saving the session clears the box (it must not come back after the refresh the save triggers).
  const saveBtn = page.locator('#as-save');
  const pressable = (await saveBtn.isVisible()) && (await saveBtn.isEnabled());
  check(r, 'Save to logs can still be pressed after the redraws', pressable, await addState());
  if (pressable) {
    await saveBtn.click(); await L.settle(page, 1200);
    const after = await addState();
    check(r, 'after Save the box is empty and shut, with no preview and Save disabled', !after.shown && !after.paste && !after.date && !after.preview.trim() && !after.canSave, after);
    check(r, 'the session was saved', (await L.db(page)).session_history.some(x => x.athlete_id === 'ava_test' && x.day === 3 && x.completed_on === day), '');
  }
  await L.go(page, 'a/ben_test/work');
  const benWork = await addState();
  check(r, 'another athlete\'s work tab has the box shut and empty', !benWork.shown && !benWork.paste, benWork);
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

(async () => {
  const b = await L.launch();
  const ids = Object.keys(S).filter(id => !only.length || only.some(w => id.includes(w)));
  // SHARD=0/3, SHARD=1/3, SHARD=2/3 in three processes (each with its own OUT) run the whole suite in a third of the time.
  const shard = /^(\d+)\/(\d+)$/.exec(process.env.SHARD || '');
  if (shard) { const i = +shard[1], n = +shard[2]; ids.splice(0, ids.length, ...ids.filter((_, k) => k % n === i)); }
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
