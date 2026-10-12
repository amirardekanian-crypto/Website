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
  const { page } = await L.openCoach(b, { hash: 'a/ava_test/work' });
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
  const { page, log } = await L.openCoach(b, {});
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
  await page.locator('#pvlist .pvrow').first().getByRole('button', { name: /Restore this/ }).click();
  await L.settle(page, 800);
  const up = lastOf(await L.callsSince(page, n0), isUpd('programs'));
  check(r, 'programs.update with the stored version', up && up.payload.data.workouts.days[0].blocks[1].exercises[0].rx.sets === 4, up && up.payload.data.workouts.days[0].blocks[1].exercises[0].rx);
  check(r, 'and it is written only against the stamp it read (a restore cannot wipe a newer save)', !!up && up.filters.some(f => /^updated_at\.eq\./.test(f)), up && up.filters);
  await L.go(page, 'a/ava_test/work');
  const shown = await doseText(page, 'Goblet Squat');
  check(r, 'The work shows the restored prescription (4 × 10)', /4 × 10/.test(shown), shown);
  await page.context().close();
  return r;
};

// ── 17. The programme-file upload is gone (pile A4, 2026-10-11) ───────────────────────────────────────────────
// Amir: "i dont need that publish programme button and i never use it, remove the whole button and function". New athletes and
// new cycles go up through publish_cycle() (the pipeline); day-to-day changes through the inline editor.
// The roster's tools sit behind a ⚙ button (audit ROSTER-12, pile A10): open the panel, and the Coach tools line inside it.
async function openTools(page) {
  if (await page.locator('#toolsPanel').isHidden()) await page.locator('#toolsBtn').click();
  await page.evaluate(() => document.querySelectorAll('details.tools').forEach(d => { d.open = true; }));
}
S['no-program-file-button'] = async (b) => {
  const r = { id: 'no-program-file-button', title: 'Athletes → Coach tools has no programme-file upload any more', checks: [] };
  const { page, log } = await L.openCoach(b, {});
  await L.go(page, 'athletes');
  await openTools(page);
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
  'assess_players', 'assess_notes', 'assess_results', 'buyer_notes', 'erasure_log', 'athlete_status'];
async function takeBackup(page, tag) {
  await L.go(page, 'athletes');
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), (async () => { await openTools(page); await page.locator('details.tools button', { hasText: 'Backup' }).click(); })()]);
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
  await openTools(page);
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
  await openTools(page);
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

S['login-used-mark'] = async (b) => {
  const r = { id: 'login-used-mark', title: 'Logins to send marks a password that has already been used to sign in', checks: [] };
  const { page } = await L.openCoach(b, { hash: 'athletes' });
  await openTools(page);
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
  check(r, 'stage54 not applied: the panel says which file to run, and offers no erase button', /cannot be erased now/.test(t) && /Run supabase\/stage53_buyer_notes\.sql, then supabase\/stage54_erase_person\.sql, in the Supabase SQL editor/.test(t) && (await page.locator('#eraseGo').count()) === 0, t);
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
  check(r, 'one offered form: the words are "1 intake form may be theirs…" (no plural slip), and it is ticked', /1 intake form may be theirs/.test(t) && /1 intake form will be erased with them/.test(t) && !/carryes/.test(t), t.slice(0, 700));
  await page.locator('.erase button', { hasText: 'Cancel' }).click();

  // an athlete with no login and no form: the alert does not claim a sign-in account, and says that no form went
  await seedBare(page, 'nolo_erase', 'Nolo', 'Erase');
  await page.evaluate(() => hardRefresh()); await L.settle(page, 900);
  await L.go(page, 'a/nolo_erase/file');
  await page.locator('button', { hasText: /Erase completely/ }).click();
  await page.locator('.erase #eraseIn').waitFor();
  t = await erasePanelText(page);
  check(r, 'with nothing matched the panel says so, why that is common, and offers the finder', /none is linked to them or carries their email, WhatsApp number or full name/.test(t) && /most forms are in Persian/.test(t) && (await page.locator('#eraseFindIn').count()) === 1 && /No intake form is ticked, so none will be erased/.test(t), t.slice(0, 900));
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
  const { page, log } = await L.openCoach(b, { seed: { stub: { fail: [{ kind: 'from', name: 'hab_intake', op: 'select', message: 'fixture: the forms are unreadable', times: 99 }] } } });
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
async function spineOpen(page, id, q) {   // q: what to type in the search (default: the id with spaces)
  await page.evaluate(() => { _spineQ = ''; });
  await page.locator('#spineQ').fill(q || id.replace(/-/g, ' '));
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
  await page.locator('.sp-save').first().click(); await L.settle(page, 700);
  check(r, 'nothing is written', (await L.db(page)).exercises.find(x => x.id === 'goblet-squat').purpose === 'Claude purpose', (await L.db(page)).exercises.find(x => x.id === 'goblet-squat').purpose);
  check(r, 'the dialog names the field and both values', log.dialogs.length === 1 && /Why it’s here: now "Claude purpose", was "Fixture purpose\."/.test(log.dialogs[0].message), log.dialogs.map(x => x.message));
  check(r, '...and says both halves were held back', log.dialogs.length === 1 && /Nothing was saved, to either half/.test(log.dialogs[0].message), log.dialogs.map(x => x.message));
  check(r, 'the typed text is still in the form', (await page.locator('[data-sf=purpose]').inputValue()) === 'Amir purpose', await page.locator('[data-sf=purpose]').count() ? await page.locator('[data-sf=purpose]').inputValue() : 'editor gone');
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
  await page.evaluate(() => document.querySelectorAll('#spineEd details.spsec').forEach(d => { d.open = true; })); await L.settle(page, 150);   // the editor folds the coach-only part (SPINE-7)
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

// ── stage64 (2026-10-11): How to do it, Claude's drafts, the pill picker ─────────────────────────────────────
const spineRpcs = cs => cs.filter(c => c.kind === 'rpc' && c.name === 'coach_save_spine');
const GOBLET_STEPS = ['Fixture step one: hold the weight at your chest.', 'Fixture step two: sit down between your heels.', 'Fixture step three: stand back up.'];
const DRAFT_STEPS = ['Fixture draft step one.', 'Fixture draft step two.', 'Fixture draft step three.', 'Fixture draft step four.'];
const coachRow = (d, id) => d.exercise_coach.find(x => x.id === id);

S['spine-steps-save'] = async (b) => {
  const r = { id: 'spine-steps-save', title: 'How to do it: one per line, saved as a list, refused past the database limits, in History', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'exercises' });
  await page.locator('.sp-filter[data-f="approved"]').click(); await L.settle(page, 300);
  const gobletRow = await page.locator('.spine-row[data-open="goblet-squat"]').innerText();
  const pullRow = await page.locator('.spine-row[data-open="band-pull-apart"]').innerText();
  check(r, 'the list says which entries have steps and which have none', /steps ✓/.test(gobletRow) && /no steps/.test(pullRow), { gobletRow, pullRow });
  await spineOpen(page, 'goblet-squat');
  const box = page.locator('textarea[data-sf=steps]');
  check(r, "the box holds the entry's steps, one per line", (await box.inputValue()) === GOBLET_STEPS.join('\n'), await box.inputValue());
  // seven steps: refused before anything leaves the page
  await box.fill(['a', 'b', 'c', 'd', 'e', 'f', 'g'].map(x => 'Step ' + x + '.').join('\n'));
  let n0 = await L.nCalls(page);
  await page.locator('.sp-save').first().click(); await L.settle(page, 400);
  check(r, 'seven steps: refused with the reason, nothing sent', log.dialogs.length === 1 && /7 steps: 6 at most/.test(log.dialogs[0].message) && !spineRpcs(await L.callsSince(page, n0)).length, log.dialogs.map(x => x.message));
  // a step of 141 characters
  log.dialogs.length = 0;
  await box.fill('Short step.\n' + 'x'.repeat(141));
  n0 = await L.nCalls(page);
  await page.locator('.sp-save').first().click(); await L.settle(page, 400);
  check(r, 'a step over 140 characters: refused, naming the step, nothing sent', log.dialogs.length === 1 && /Step 2 of How to do it is 141 characters/.test(log.dialogs[0].message) && !spineRpcs(await L.callsSince(page, n0)).length, log.dialogs.map(x => x.message));
  check(r, 'the hint under the box says it will not save', /will not save/.test(await page.locator('[data-steps-hint]').innerText()), await page.locator('[data-steps-hint]').innerText());
  // a good edit: a typed "1." or "2)" and blank lines are dropped; only the steps go up
  log.dialogs.length = 0;
  const want = ['Hold one dumbbell at your chest.', 'Sit down between your heels.', 'Stand back up.'];
  await box.fill('1. Hold one dumbbell at your chest.\n\n2) Sit down between your heels.\nStand back up.\n');
  n0 = await L.nCalls(page);
  await page.locator('.sp-save').first().click(); await L.settle(page, 700);
  const up = lastOf(await L.callsSince(page, n0), c => c.kind === 'rpc' && c.name === 'coach_save_spine');
  check(r, 'one save with only the steps, as a list (typed numbers and blank lines dropped)', up && Object.keys(up.payload.p_entry).join() === 'steps' && JSON.stringify(up.payload.p_entry.steps) === JSON.stringify(want), up && up.payload.p_entry);
  check(r, 'the snapshot is the steps the page read', up && JSON.stringify(up.payload.p_entry_snap.steps) === JSON.stringify(GOBLET_STEPS), up && up.payload.p_entry_snap);
  check(r, 'the coach-only half is not sent (no drafts on this entry)', up && !Object.keys(up.payload.p_coach).length, up && up.payload.p_coach);
  check(r, 'saved on the server', JSON.stringify((await L.db(page)).exercises.find(x => x.id === 'goblet-squat').steps) === JSON.stringify(want), (await L.db(page)).exercises.find(x => x.id === 'goblet-squat').steps);
  // History lists it as Steps, numbered, with Undo
  await page.locator('#spineEd details.rawlog > summary').click(); await L.settle(page, 500);
  const hist = await page.locator('#spvlist').innerText();
  check(r, 'History shows the change as Steps, numbered, with Undo', /Steps: 1\. Fixture step one/.test(hist) && /1\. Hold one dumbbell at your chest\./.test(hist) && /Undo this change/.test(hist), hist.slice(0, 400));
  // a server without stage64 is named, and the typing stays
  await box.fill('Hold it.\nSquat.\nStand.');
  await page.evaluate(() => window.__STUB.fail.push({ kind: 'rpc', name: 'coach_save_spine', message: 'exercises.steps cannot be written from the editor', times: 1 }));
  await page.locator('.sp-save').first().click(); await L.settle(page, 600);
  check(r, 'a server without stage64 is named, nothing saved, the typing kept', log.dialogs.length === 1 && /stage64_spine_steps\.sql has not been applied/.test(log.dialogs[0].message) && (await box.inputValue()) === 'Hold it.\nSquat.\nStand.', log.dialogs.map(x => x.message));
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

S['spine-draft-prefill'] = async (b) => {
  const r = { id: 'spine-draft-prefill', title: "Claude's drafts: counted, listed, pre-filled and marked; a stale one is not shown; closing asks nothing", checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'exercises' });
  dismissDialogs(page, log);
  const cov = await page.locator('#content').innerText();
  check(r, "the page says how many entries have a draft from Claude to read", /1 with Claude’s draft to read/.test(cov), cov.slice(0, 500));
  const fb = page.locator('.sp-filter[data-f="claude"]');
  check(r, "a Claude's drafts filter, with the count", (await fb.count()) === 1 && /Claude’s drafts · 1/.test(await fb.innerText()), (await fb.count()) ? await fb.innerText() : 'no button');
  await fb.click(); await L.settle(page, 300);
  const rows = await page.locator('.spine-row').allInnerTexts();
  check(r, 'the filter lists the entry with a draft, and only it', rows.length === 1 && /Band Pull-Apart/.test(rows[0]) && /Claude’s draft to read/.test(rows[0]), rows);
  const n0 = await L.nCalls(page);
  await page.locator('button[data-open="band-pull-apart"]').click(); await page.locator('#spineEd').waitFor(); await L.settle(page, 200);
  check(r, 'the steps box is pre-filled with the draft', (await page.locator('textarea[data-sf=steps]').inputValue()) === DRAFT_STEPS.join('\n'), await page.locator('textarea[data-sf=steps]').inputValue());
  check(r, 'both cue boxes are pre-filled with the cues draft', (await page.locator('textarea[data-sf=good]').inputValue()) === 'Fixture draft key\nFixture draft feel' && (await page.locator('textarea[data-sf=bad]').inputValue()) === 'Fixture draft fault. Fixture draft fix.',
    [await page.locator('textarea[data-sf=good]').inputValue(), await page.locator('textarea[data-sf=bad]').inputValue()]);
  check(r, "a stale draft is ignored: the purpose box holds the entry's own purpose", (await page.locator('textarea[data-sf=purpose]').inputValue()) === 'Fixture live purpose.', await page.locator('textarea[data-sf=purpose]').inputValue());
  const ed = await page.locator('#spineEd').innerText();
  check(r, 'each pre-filled draft says it is Claude’s and saved with Save, with Discard and what the entry holds now',
    (ed.match(/Claude’s draft · saved when you press Save/g) || []).length === 2 && (await page.locator('#spineEd button', { hasText: 'Discard draft' }).count()) === 2 && /On the entry now: Fixture live key/.test(ed), ed.slice(0, 900));
  check(r, 'the stale one is named as not shown', /no longer matches the entry/.test(ed), '');
  check(r, 'the three pre-filled boxes are outlined', (await page.locator('#spineEd .sp-drafted').count()) === 3, await page.locator('#spineEd .sp-drafted').count());
  check(r, 'opening the entry sends nothing', !(await L.callsSince(page, n0)).some(c => c.kind === 'rpc' || (c.kind === 'from' && c.op !== 'select')), '');
  await page.locator('#spineEd .sp-close').first().click(); await L.settle(page, 300);
  check(r, 'closing without saving asks nothing (a draft is not unsaved work)', !log.dialogs.length && (await page.locator('#spineEd').count()) === 0, log.dialogs);
  check(r, '...and the drafts are all still waiting', (coachRow(await L.db(page), 'band-pull-apart').suggested_changes || []).length === 4, coachRow(await L.db(page), 'band-pull-apart').suggested_changes);
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

S['spine-draft-court'] = async (b) => {
  const r = { id: 'spine-draft-court', title: "An On court draft (2026-10-11): pre-filled and marked like the others, and Save approves it in the same call", checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'exercises', seed: { courtDraft: true } });
  dismissDialogs(page, log);
  await spineOpen(page, 'goblet-squat', 'goblet squat');
  check(r, 'the On court box is pre-filled with the draft', (await page.locator('input[data-sf=tennis]').inputValue()) === 'Fixture court draft: the low ready position.',
    await page.locator('input[data-sf=tennis]').inputValue());
  const ed = await page.locator('#spineEd').innerText();
  check(r, "it is marked as Claude's, with its reason and what the entry holds now", /Claude’s draft · saved when you press Save: a court moment/.test(ed) && /On the entry now: \(empty\)/.test(ed), ed.slice(0, 700));
  check(r, 'the box is outlined', (await page.locator('#spineEd input[data-sf=tennis].sp-drafted').count()) === 1, '');
  const n0 = await L.nCalls(page);
  await page.locator('.sp-save').first().click(); await L.settle(page, 700);
  const up = spineRpcs(await L.callsSince(page, n0))[0];
  check(r, 'Save sends the court line in the entry half and an empty list in the coach-only half, in one call',
    up && up.payload.p_entry.tennis === 'Fixture court draft: the low ready position.' && Array.isArray(up.payload.p_coach.suggested_changes) && up.payload.p_coach.suggested_changes.length === 0,
    up && { entry: up.payload.p_entry, coach: up.payload.p_coach });
  const d = await L.db(page);
  check(r, 'the server has it, and the list is empty', d.exercises.find(x => x.id === 'goblet-squat').tennis === 'Fixture court draft: the low ready position.'
    && (coachRow(d, 'goblet-squat').suggested_changes || []).length === 0, coachRow(d, 'goblet-squat').suggested_changes);
  check(r, 'no dialog, no page errors', !log.dialogs.length && !log.errors.length, { dialogs: log.dialogs, errors: log.errors });
  await page.context().close();
  return r;
};

S['spine-draft-save'] = async (b) => {
  const r = { id: 'spine-draft-save', title: "Save approves Claude's drafts: the entry gets them and the list loses them, in one call; the rest stay", checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'exercises' });
  await spineOpen(page, 'band-pull-apart', 'band-pull-apart');
  const n0 = await L.nCalls(page);
  await page.locator('.sp-save').first().click(); await L.settle(page, 700);
  const ups = spineRpcs(await L.callsSince(page, n0)), up = ups[0];
  check(r, 'one coach_save_spine call', ups.length === 1, ups.length);
  check(r, 'the entry half carries the drafted steps and cues, and nothing else', up && Object.keys(up.payload.p_entry).sort().join() === 'cues,steps'
    && JSON.stringify(up.payload.p_entry.steps) === JSON.stringify(DRAFT_STEPS) && JSON.stringify(up.payload.p_entry.cues) === JSON.stringify({ good: ['Fixture draft key', 'Fixture draft feel'], bad: ['Fixture draft fault. Fixture draft fix.'] }), up && up.payload.p_entry);
  const left = up && up.payload.p_coach.suggested_changes;
  check(r, 'the coach-only half sends the list without the two it decided: the stale purpose and the link item stay', up && Object.keys(up.payload.p_coach).join() === 'suggested_changes'
    && Array.isArray(left) && left.map(x => x.field).join() === 'purpose,easier', up && up.payload.p_coach);
  check(r, 'the snapshot is the list as the page read it (the guard against a draft that arrived since)', up && (up.payload.p_coach_snap.suggested_changes || []).length === 4, up && up.payload.p_coach_snap);
  const d = await L.db(page);
  const e = d.exercises.find(x => x.id === 'band-pull-apart');
  check(r, 'the server has the steps and the cues', JSON.stringify(e.steps) === JSON.stringify(DRAFT_STEPS) && e.cues.good[0] === 'Fixture draft key', { steps: e.steps, cues: e.cues });
  check(r, '...and two items left on the list', coachRow(d, 'band-pull-apart').suggested_changes.map(x => x.field).join() === 'purpose,easier', coachRow(d, 'band-pull-apart').suggested_changes);
  check(r, 'the toast says the drafts are off the list', /2 drafts from Claude off the list/.test(await L.toastText(page)), await L.toastText(page));
  check(r, 'the editor no longer shows a draft, and the filter is gone', (await page.locator('#spineEd .sp-draft:not(.off)').count()) === 0 && (await page.locator('.sp-filter[data-f="claude"]').count()) === 0, '');
  check(r, 'no dialog, no page errors', !log.dialogs.length && !log.errors.length, { dialogs: log.dialogs, errors: log.errors });
  await page.context().close();
  return r;
};

S['spine-draft-discard'] = async (b) => {
  const r = { id: 'spine-draft-discard', title: "Discard puts the entry's value back and takes the draft off the list with Save; Bring it back undoes it", checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'exercises' });
  dismissDialogs(page, log);
  await spineOpen(page, 'band-pull-apart', 'band-pull-apart');
  await page.locator('#spineEd button', { hasText: 'Discard draft' }).first().click(); await L.settle(page, 300);   // the steps' (it comes first)
  check(r, "the steps box goes back to the entry's own value (none)", (await page.locator('textarea[data-sf=steps]').inputValue()) === '', await page.locator('textarea[data-sf=steps]').inputValue());
  check(r, 'the line says discarded, and offers Bring it back', /Claude’s draft discarded/.test(await page.locator('#spineEd').innerText()) && (await page.locator('#spineEd button', { hasText: 'Bring it back' }).count()) === 1, '');
  await page.locator('#spineEd button', { hasText: 'Bring it back' }).click(); await L.settle(page, 300);
  check(r, 'Bring it back fills the box again', (await page.locator('textarea[data-sf=steps]').inputValue()) === DRAFT_STEPS.join('\n'), await page.locator('textarea[data-sf=steps]').inputValue());
  await page.locator('#spineEd button', { hasText: 'Discard draft' }).first().click(); await L.settle(page, 300);
  await page.locator('#spineEd .sp-close').first().click(); await L.settle(page, 300);
  check(r, 'a discard is unsaved work: closing asks first, and a no stays', log.dialogs.some(x => x.type === 'confirm' && /unsaved changes to Band Pull-Apart/.test(x.message)) && (await page.locator('#spineEd').count()) === 1, log.dialogs);
  log.dialogs.length = 0;
  const n0 = await L.nCalls(page);
  await page.locator('.sp-save').first().click(); await L.settle(page, 700);
  const up = spineRpcs(await L.callsSince(page, n0))[0];
  check(r, 'Save sends the kept cues draft and no steps', up && Object.keys(up.payload.p_entry).join() === 'cues', up && up.payload.p_entry);
  check(r, '...and takes both decided drafts (kept and discarded) off the list', up && (up.payload.p_coach.suggested_changes || []).map(x => x.field).join() === 'purpose,easier', up && up.payload.p_coach);
  const d = await L.db(page);
  check(r, 'the server: still no steps, the cues draft written, two items left', JSON.stringify(d.exercises.find(x => x.id === 'band-pull-apart').steps) === '[]'
    && d.exercises.find(x => x.id === 'band-pull-apart').cues.good[0] === 'Fixture draft key' && coachRow(d, 'band-pull-apart').suggested_changes.length === 2, '');
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

S['spine-draft-arrives'] = async (b) => {
  const r = { id: 'spine-draft-arrives', title: 'A draft Claude adds while the page is open: the save is refused whole, then Save again keeps the new one', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'exercises' });
  await spineOpen(page, 'band-pull-apart', 'band-pull-apart');
  // /spine Upkeep adds a proposal by SQL while Amir reads
  await page.evaluate(() => { window.__DB.exercise_coach.find(x => x.id === 'band-pull-apart').suggested_changes.push(
    { field: 'equipment', old: ['band'], new: ['band', 'rack'], why: 'fixture', from: 'spine fixture', at: new Date().toISOString() }); });
  await page.locator('.sp-save').first().click(); await L.settle(page, 700);
  let d = await L.db(page);
  check(r, 'refused: the dialog names Claude’s drafts and the counts', log.dialogs.length === 1 && /Claude’s drafts: 5 on the list now, 4 when you opened it/.test(log.dialogs[0].message) && /Nothing was saved, to either half/.test(log.dialogs[0].message), log.dialogs.map(x => x.message));
  check(r, 'nothing written: no steps, and the new item is on the list', JSON.stringify(d.exercises.find(x => x.id === 'band-pull-apart').steps) === '[]' && coachRow(d, 'band-pull-apart').suggested_changes.length === 5, coachRow(d, 'band-pull-apart').suggested_changes.length);
  check(r, 'the editor still shows the drafts, pre-filled from the list as it is now', (await page.locator('textarea[data-sf=steps]').inputValue()) === DRAFT_STEPS.join('\n'), await page.locator('textarea[data-sf=steps]').inputValue());
  log.dialogs.length = 0;
  await page.locator('.sp-save').first().click(); await L.settle(page, 700);
  d = await L.db(page);
  check(r, 'Save again goes through: the steps are on the entry', JSON.stringify(d.exercises.find(x => x.id === 'band-pull-apart').steps) === JSON.stringify(DRAFT_STEPS) && !log.dialogs.length, log.dialogs);
  check(r, "...and Claude's new item is still waiting, beside the two the editor never touches", coachRow(d, 'band-pull-apart').suggested_changes.map(x => x.field).join() === 'purpose,easier,equipment', coachRow(d, 'band-pull-apart').suggested_changes.map(x => x.field));
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

S['editor-pill-picker'] = async (b) => {
  const r = { id: 'editor-pill-picker', title: 'The ✎ pill picker: the closed list, two at most, one per group; an old pill to the note or dropped; saved as one string', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'a/ava_test/work' });
  // an old card: an old spelling, an off-list pill, a tempo said in words. And a card already on the list.
  await page.evaluate(async () => {
    const row = window.__DB.programs.find(p => p.athlete_id === 'ava_test');
    row.data.workouts.days[0].blocks[1].exercises[1].intent = 'Right leg first · glute focus · 3s eccentric';
    row.data.workouts.days[0].blocks[1].exercises[0].intent = 'neutral grip';
    await reloadPrograms(); render();
  });
  await L.settle(page, 600);
  const rx = rowLoc(page, 'Chest-Supported Dumbbell Row').locator('.cmp-rx');
  check(r, 'the row shows the pill: a list value in its list spelling, the two off the list in clay', (await rx.locator('.rx-pill:not(.off)').allInnerTexts()).join() === 'right side first' && (await rx.locator('.rx-pill.off').count()) === 2,
    { on: await rx.locator('.rx-pill:not(.off)').allInnerTexts(), off: await rx.locator('.rx-pill.off').allInnerTexts() });
  check(r, "the row's issue count includes the pill", /chip issue/.test(await rx.innerText()), await rx.innerText());
  // a card already on the list: Save with no change sends nothing
  let ed = await openEditor(page, 'Goblet Squat');
  check(r, 'the picker shows the card’s pill as on', (await ed.locator('.pp.on').allInnerTexts()).join() === 'neutral grip', await ed.locator('.pp.on').allInnerTexts());
  let n0 = await L.nCalls(page);
  await ed.locator('.exed-acts button', { hasText: 'Save' }).click(); await L.settle(page, 500);
  check(r, 'a pill already on the list does not make a no-change save write', !lastOf(await L.callsSince(page, n0), isUpd('programs')), '');
  ed = await openEditor(page, 'Chest-Supported Dumbbell Row');
  check(r, 'the old spelling is on, as its list value', (await ed.locator('.pp.on').allInnerTexts()).join() === 'right side first', await ed.locator('.pp.on').allInnerTexts());
  check(r, 'each value off the list is flagged, with Move to the note and Drop it', (await ed.locator('.pp-off').count()) === 2 && (await ed.locator('.pp-off button', { hasText: 'Move to the note' }).count()) === 2, await ed.locator('.pp-off').allInnerTexts());
  await ed.locator('.pp-off', { hasText: 'glute focus' }).locator('button', { hasText: 'Move to the note' }).click();
  await ed.locator('.pp-off', { hasText: '3s eccentric' }).locator('button', { hasText: 'Drop it' }).click();
  check(r, 'Move to the note puts it in the note as a sentence; both flags gone', (await ed.locator('[id^="exNote-"]').inputValue()) === 'Glute focus.' && (await ed.locator('.pp-off').count()) === 0, await ed.locator('[id^="exNote-"]').inputValue());
  const pp = v => ed.locator('.pp', { hasText: new RegExp('^' + v + '$') });
  await pp('neutral grip').click(); await pp('wide grip').click();
  check(r, 'one per group: wide grip takes neutral grip’s place', (await ed.locator('.pp.on').allInnerTexts()).sort().join() === 'right side first,wide grip', await ed.locator('.pp.on').allInnerTexts());
  await pp('max intent').click(); await L.settle(page, 100);
  check(r, 'a third is refused, with a toast', (await ed.locator('.pp.on').count()) === 2 && /Two pills at most/.test(await L.toastText(page)), { on: await ed.locator('.pp.on').allInnerTexts(), toast: await L.toastText(page) });
  await pp('right side first').click(); await pp('hold at the top').click();
  check(r, 'a hold pill without tempo iso is warned', /needs Tempo iso/.test(await ed.locator('.pillpick').innerText()), await ed.locator('.pillpick').innerText());
  await setField(ed, 'exTempo', 'iso'); await L.settle(page, 100);
  check(r, '...and the warning goes when the tempo is iso', !/needs Tempo iso/.test(await ed.locator('.pillpick').innerText()), await ed.locator('.pillpick').innerText());
  await setField(ed, 'exTempo', ''); await pp('hold at the top').click(); await pp('max intent').click();
  n0 = await L.nCalls(page);
  await ed.locator('.exed-acts button', { hasText: 'Save' }).click(); await L.settle(page, 700);
  const up = lastOf(await L.callsSince(page, n0), isUpd('programs'));
  const ex = up && up.payload.data.workouts.days[0].blocks[1].exercises[1];
  check(r, 'saved as ONE string, joined by " · ", in the order picked', ex && ex.intent === 'wide grip · max intent', ex && ex.intent);
  check(r, 'the old pill moved into the note', ex && ex.note === 'Glute focus.', ex && ex.note);
  check(r, 'the row redraws with the two pills, both on the list', (await rowLoc(page, 'Chest-Supported Dumbbell Row').locator('.rx-pill:not(.off)').allInnerTexts()).join() === 'wide grip,max intent', await rowLoc(page, 'Chest-Supported Dumbbell Row').locator('.rx-pill').allInnerTexts());
  check(r, 'no dialog, no page errors', !log.dialogs.length && !log.errors.length, { dialogs: log.dialogs, errors: log.errors });
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

S['quality-day-cards'] = async (b) => {
  const r = { id: 'quality-day-cards', title: 'Quality check: each day card, day by day, by the app\'s rule (70% gate, 12% cut, the phone\'s view)', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'athletes' });
  // Ava: five days. The Spine has approved entries and one DRAFT lift; of the ten qualities only strength, muscle and power are approved.
  await page.evaluate(() => {
    const now = new Date().toISOString();
    const E = (id, name, status, q) => ({ id, name, aliases: [], pattern: 'squat', qualities: q, purpose: 'Fixture.', tennis: null, cues: null, equipment: [], loads: [], easier: [], harder: [], alts: [], video: null,
      status, updated_at: now, updated_by: 'coach', impact: 'none', muscles: null });
    const list = [E('sc-squat', 'Scenario Squat', 'approved', ['strength', 'muscle']), E('sc-press', 'Scenario Press', 'approved', ['strength']), E('sc-row', 'Scenario Row', 'approved', ['muscle', 'strength']),
      E('sc-brace', 'Scenario Brace', 'approved', ['armour']), E('sc-untagged', 'Scenario Untagged', 'approved', []), E('sc-draft', 'Scenario Draft Lift', 'draft', ['power'])];
    window.__DB.exercises.splice(0, window.__DB.exercises.length, ...list);
    window.__DB.exercise_coach.splice(0, window.__DB.exercise_coach.length, ...list.map(e => ({ id: e.id, sfr: null, flags: [], notes: null, suggested_qualities: null, links_before: null, links_history: null, credits: null, cost: null, suggested_changes: null })));
    const row = window.__DB.programs.find(p => p.athlete_id === 'ava_test');
    const d = JSON.parse(JSON.stringify(row.data));
    const ex = (name, sets, exId) => ({ name, exId, type: 'standard', rx: { sets, reps: 8 } });
    const day = (id, ...exs) => ({ id, focusTag: 'Scenario day ' + id, blocks: [{ icon: '💪', title: 'Primary', exercises: exs }] });
    d.workouts.days = [
      { id: 1, focusTag: 'Scenario day 1', blocks: [{ icon: '🔥', title: 'Warm-Up', exercises: [ex('Scenario Untagged', 2)] },
        { icon: '💪', title: 'Primary', exercises: [ex('Scenario Squat', 4, 'sc-squat'), ex('Scenario Press', 3, 'sc-press'), ex('Scenario Row', 3, 'sc-row')] }] },
      day(2, ex('Scenario Squat', 3, 'sc-squat'), ex('Scenario Untagged', 4, 'sc-untagged'), ex('Unknown Exercise', 3)),
      day(3, ex('Scenario Draft Lift', 4, 'sc-draft'), ex('Scenario Squat', 2, 'sc-squat')),
      day(4, ex('Scenario Brace', 4, 'sc-brace')),
      day(5, ex('Scenario Squat', 1, 'sc-squat')),
    ];
    row.data = d; row.updated_at = new Date(Date.now() + 1000).toISOString();
  });
  await page.evaluate(() => { S.spine = null; return reloadPrograms(); });
  await L.go(page, 'exercises'); await L.settle(page, 900);
  const avaRow = () => page.evaluate(() => {
    document.querySelectorAll('#content details').forEach(d => { d.open = true; });
    const row = [...document.querySelectorAll('#content .credrow')].find(x => /Ava Example/.test(x.textContent) && /Trains most/.test(x.textContent));
    return row ? row.textContent.replace(/\s+/g, ' ').trim() : null;
  });
  let txt = await avaRow();
  check(r, 'Ava has a row in the Quality check', !!txt, '');
  const now = (/Day cards on their phone: (.*?)(?: Once the drafts are approved:|$)/.exec(txt || '') || [])[1] || '', later = (/Once the drafts are approved: (.*)$/.exec(txt || '') || [])[1] || '';
  check(r, 'on the phone, Day 1 names its two qualities (the warm-up is not counted)', /Day 1 Strength · Muscle \|/.test(now), now);
  check(r, 'Day 2 is blank: 30% of its sets are tagged and 70% are needed', /Day 2 blank \(30% tagged, 70% needed\)/.test(now), now);
  check(r, 'Day 3 is blank on the phone: its draft lift is not served there (33% tagged)', /Day 3 blank \(33% tagged, 70% needed\)/.test(now), now);
  check(r, 'Day 4 is blank on the phone: the quality it trains is not approved (0% tagged)', /Day 4 blank \(0% tagged, 70% needed\)/.test(now), now);
  check(r, 'Day 5 is blank: one set is too few to name a quality', /Day 5 blank \(too few sets to name a quality\)/.test(now), now);
  check(r, 'once the drafts are approved, Day 3 reads Power · Strength and Day 4 reads Armour (the others stay as they are)', /Day 1 Strength · Muscle \| Day 2 blank \(30% tagged, 70% needed\) \| Day 3 Power · Strength \| Day 4 Armour \| Day 5 blank/.test(later), later);
  check(r, 'the weekly line says nothing about the day cards (it is a weekly number)', !/so the day cards show nothing/.test(txt || '') && /77% of the week's sets tagged/.test(txt || ''), txt);
  // No approved quality at all: no day card can show one, and the line says so instead of listing five blanks.
  await page.evaluate(() => { window.__DB.qualities.forEach(q => { q.status = 'draft'; }); S.spine = null; renderExercises(); });
  await L.settle(page, 900);
  txt = await avaRow();
  check(r, 'with no quality approved the phone line says so', /Day cards on their phone: no quality is approved yet, so no day card shows one/.test(txt || ''), txt);
  check(r, 'and the "once approved" line still shows what the cards will say', /Once the drafts are approved: Day 1 Strength · Muscle/.test(txt || ''), txt);
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

S['spine-phone-view'] = async (b) => {
  const r = { id: 'spine-phone-view', title: 'Spine: a card on a draft has no video here (it has none on a phone), and the Exercises tab lists the cards that show something else on a phone', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'athletes' });
  // Two approved entries with a video each and a DRAFT loose twin of each (the word "machine"): the phone is served the approved ones only.
  await page.evaluate(() => {
    const now = new Date().toISOString();
    const E = (id, name, status, video) => ({ id, name, aliases: [], pattern: 'isolation', qualities: ['strength'], purpose: 'Fixture.', tennis: null, cues: { good: ['Fixture cue'], bad: [] },
      equipment: [], loads: [], easier: [], harder: [], alts: [], video, status, updated_at: now, updated_by: 'coach', impact: 'none', muscles: null });
    const list = [E('seated-leg-curl', 'Seated Leg Curl', 'approved', 'https://www.youtube.com/watch?v=APPROVED001'), E('machine-seated-leg-curl', 'Machine Seated Leg Curl', 'draft', 'https://www.youtube.com/watch?v=DRAFT000001'),
      E('hip-abduction', 'Hip Abduction', 'approved', 'https://www.youtube.com/watch?v=HIPABD00001'), E('machine-hip-abduction', 'Machine Hip Abduction', 'draft', 'https://www.youtube.com/watch?v=DRAFT000002')];
    window.__DB.exercises.splice(0, window.__DB.exercises.length, ...list);
    window.__DB.exercise_coach.splice(0, window.__DB.exercise_coach.length);
    const row = window.__DB.programs.find(p => p.athlete_id === 'ava_test');
    const d = JSON.parse(JSON.stringify(row.data));
    const ex = (name, exId) => ({ name, exId, type: 'standard', rx: { sets: 3, reps: 10, rpe: 7 } });
    d.workouts.days = [{ id: 1, focusTag: 'Legs First (fixture)', blocks: [{ icon: '💪', title: 'Primary', exercises: [
      ex('Machine Seated Leg Curl', 'machine-seated-leg-curl'),     // names the draft
      ex('Seated Leg Curl', 'seated-leg-curl'),                     // names an approved entry
      ex('Machine Hip Abduction', undefined) ] }] },                // names nothing: the coach's view finds the draft, a phone its approved twin
      { id: 2, focusTag: 'Upper Push (fixture)', blocks: [] }, { id: 3, focusTag: 'Pull Day (fixture)', blocks: [] }];
    row.data = d; row.updated_at = new Date(Date.now() + 1000).toISOString();
  });
  await page.evaluate(() => { S.spine = null; return reloadPrograms(); });
  // 1. the compare view: the video a phone can play
  await L.go(page, 'athletes'); await L.go(page, 'a/ava_test/work'); await L.settle(page, 900);
  const vid = async name => page.evaluate(n => {
    const row = [...document.querySelectorAll('.wday.open .cmp-row')].find(x => (x.querySelector('.cmp-nm') || {}).textContent.replace('▶', '').trim() === n);
    if (!row) return 'no row';
    const a = row.querySelector('.cmp-vid');
    return a ? a.getAttribute('href') : null;
  }, name);
  check(r, 'the card on the DRAFT has no video link (a phone has nothing for it; the draft\'s own video is not shown here)', (await vid('Machine Seated Leg Curl')) === null, await vid('Machine Seated Leg Curl'));
  check(r, 'the card on the approved entry has its video', (await vid('Seated Leg Curl')) === 'https://www.youtube.com/watch?v=APPROVED001', await vid('Seated Leg Curl'));
  check(r, 'the card with no exId finds the approved twin\'s video, as a phone does', (await vid('Machine Hip Abduction')) === 'https://www.youtube.com/watch?v=HIPABD00001', await vid('Machine Hip Abduction'));
  // 2. the Exercises tab
  await L.go(page, 'exercises'); await L.settle(page, 900);
  const txt = await page.evaluate(() => { document.querySelectorAll('#content details').forEach(d => { d.open = true; }); return document.getElementById('content').textContent.replace(/\s+/g, ' '); });
  check(r, 'Coverage says two card names show something else on a phone until the drafts are approved', /2 card names show something else on a phone until the draft is approved/.test(txt), txt.slice(0, 500));
  const list = (/Cards that show something else on a phone · 2 names(.*?)(?:Not in the Spine yet|$)/.exec(txt) || [])[1] || '';
  check(r, 'the list names the card on the draft: here the draft, on a phone nothing', /Machine Seated Leg Curl\s*1 athlete · here: Machine Seated Leg Curl \(draft\) · phone: nothing/.test(list), list);
  check(r, 'and the card with no exId: here the draft, on a phone the closest approved one', /Machine Hip Abduction\s*1 athlete · here: Machine Hip Abduction \(draft\) · phone: Hip Abduction/.test(list), list);
  check(r, 'the approved card is not in the list', !/[^e]Seated Leg Curl\s*1 athlete · here: Seated Leg Curl/.test(list), list);
  // 3. once the draft is approved both agree and the list goes
  await page.evaluate(() => { window.__DB.exercises.forEach(e => { e.status = 'approved'; }); S.spine = null; renderExercises(); });
  await L.settle(page, 900);
  const txt2 = await page.evaluate(() => document.getElementById('content').textContent.replace(/\s+/g, ' '));
  check(r, 'with every entry approved nothing shows something else on a phone', !/show something else on a phone|Cards that show something else/.test(txt2), txt2.slice(0, 300));
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

// ── Small truthfulness fixes on Today and the board (audit TODAY-3, TODAY-4, TODAY-13, TODAY-14, TODAY-15, MKT-3, MKT-8; 2026-10-11, pile B8) ─────────
S['today-small-truths'] = async (b) => {
  const r = { id: 'today-small-truths', title: 'Today: a blank exercise note is no note, a line from tomorrow says so, and the line box says what it strips', checks: [] };
  const { page, log } = await L.openCoach(b, {});
  const has = await page.evaluate(() => [
    sessionHasNote({ day_note: '', summary: 'Day 1\n\nExercise log:\n[Primary]\n• Squat (✓)\n    Set 1: 20 ✓\n    Note:  \n' }),
    sessionHasNote({ day_note: '', summary: 'Day 1\n\nExercise log:\n[Primary]\n• Squat (✓)\n    Set 1: 20 ✓\n    Note: knee felt odd\n' }),
    sessionHasNote({ day_note: '   ', summary: '' }), sessionHasNote({ day_note: 'knee', summary: '' })]);
  check(r, 'a "Note:" line with nothing after it is not a note to read; a real one is, and so is a day note', JSON.stringify(has) === JSON.stringify([false, true, false, true]), has);
  await page.evaluate(() => {
    window.__DB.hab_notes.push({ athlete_id: 'cara_free', day: addDays(todayKey(), 1), body: 'Early riser line', pct: 100, hidden: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    return refetch(['notes']);
  });
  await L.settle(page, 700);
  const wall = (await page.locator('#wallPanel').innerText()).replace(/\s+/g, ' ');
  check(r, 'a line filed under tomorrow (an athlete whose clock is ahead) says "Tomorrow, their time", not a bare date', /Tomorrow, their time/i.test(wall) && /Early riser line/.test(wall), wall);
  check(r, 'the line box says that quotes, < > and backslashes are removed and line breaks become spaces', /Quotes, < > and backslashes are removed when you post, and line breaks become spaces/.test(wall), wall);
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

S['refetch-failures'] = async (b) => {
  const r = { id: 'refetch-failures', title: 'After a save, a reload that fails is told (the wall, contacts, rules), not skipped', checks: [] };
  const { page, log } = await L.openCoach(b, {});
  // 1. post a line while the wall's read fails: the post works, the reload does not
  await page.evaluate(() => { window.__STUB.fail.push({ kind: 'from', name: 'hab_notes', op: 'select', message: 'fixture: the wall is down', times: 1 }); });
  await page.locator('#coachLineInput').fill('Back to it today');
  await page.getByRole('button', { name: /Post today's line/ }).click();
  await L.settle(page, 900);
  let bar = await L.failText(page);
  check(r, 'the line was saved, and the page says the wall could not be reloaded and why', /Saved, but the crew wall \(fixture: the wall is down\) could not be reloaded/.test(bar), bar);
  check(r, 'it says what you see may be out of date and what to do', /may be out of date\. Tap ↻ Refresh/.test(bar), bar);
  // 2. two slices fail at once: one line names both
  await page.evaluate(() => {
    window.__STUB.fail.push({ kind: 'rpc', name: 'contact_list', message: 'fixture: contacts down', times: 1 });
    window.__STUB.fail.push({ kind: 'from', name: 'xp_rules', op: 'select', message: 'fixture: rules down', times: 1 });
    return refetch(['contacts', 'rules']);
  });
  await L.settle(page, 700);
  bar = await L.failText(page);
  check(r, 'two failed reloads are named in one line, each with its reason', /the quest and XP rules \(fixture: rules down\) and the Proof contacts \(fixture: contacts down\) could not be reloaded, so what you see for them may be out of date/.test(bar), bar);
  // 3. nothing fails: nothing is said
  await page.evaluate(() => { failDismissAll(); return refetch(['notes', 'rules', 'contacts']); });
  await L.settle(page, 700);
  check(r, 'when every reload works the bar stays empty', (await L.failText(page)) === '', await L.failText(page));
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

S['quest-run-window'] = async (b) => {
  const r = { id: 'quest-run-window', title: 'Today → the live quest run and its last day are the app\'s: latest-starting run, clipped where the next one starts', checks: [] };
  const { page, log } = await L.openCoach(b, {});
  const day = n => page.evaluate(n => addDays(todayKey(), n), n);
  const pretty = async n => page.evaluate(k => prettyDate(k), await day(n));
  const setRuns = async runs => { await page.evaluate(runs => { window.__DB.xp_rules[0].rules.questRuns = runs; return refetch(['rules']); }, runs); await L.settle(page, 600); };
  const panel = async () => (await page.locator('#questPanel').innerText()).replace(/\s+/g, ' ');
  // 1. two runs overlap: the later-starting one is live, for its own seven days
  await setRuns([{ start: await day(-4), ids: ['w_water5'] }, { start: await day(-1), ids: ['w_train3'] }]);
  let t1 = await panel();
  check(r, 'overlapping runs: the one that started later is live (its quest, not the older run\'s)', /FIXTURE SHOW-UP/.test(t1) && !/FIXTURE WELL/.test(t1), t1);
  check(r, 'and it runs its full seven days from its own start', t1.includes('ends ' + await pretty(5)) && /Day 2\/7/.test(t1), t1);
  // 2. listed the other way round: still the latest-starting, not the last in the list
  await setRuns([{ start: await day(-1), ids: ['w_train3'] }, { start: await day(-4), ids: ['w_water5'] }]);
  t1 = await panel();
  check(r, 'the same two runs listed the other way round: still the later-starting one (it used to be the last in the list)', /FIXTURE SHOW-UP/.test(t1) && !/FIXTURE WELL/.test(t1), t1);
  // 3. one scheduled ahead: this run stops the day before it, and the panel says who takes over
  await setRuns([{ start: await day(3), ids: ['w_sleep5'] }, { start: await day(-2), ids: ['w_water5'] }]);
  t1 = await panel();
  check(r, 'a run scheduled ahead: the live run ends the day before it starts (not on its seventh day)', t1.includes('ends ' + await pretty(2)) && !t1.includes('ends ' + await pretty(4)), t1);
  check(r, 'and the panel says the next run takes over, not that this one was ended early', t1.includes('the run from ' + await pretty(3) + ' takes over') && !/ended early/.test(t1) && /FIXTURE WELL/.test(t1), t1);
  // 4. a run the coach ended is still "ended early"
  await setRuns([{ start: await day(-2), ids: ['w_water5'], end: await day(0) }]);
  t1 = await panel();
  check(r, 'a run you ended today still reads "ended early · last day" with today\'s date', /ended early · last day/.test(t1) && t1.includes(await pretty(0)), t1);
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

S['proof-board-truth'] = async (b) => {
  const r = { id: 'proof-board-truth', title: 'Proof: the board says when it was read, says why it failed, and is read again after a quest week starts', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'proof' });
  await L.settle(page, 700);
  const boardCalls = async n0 => (await L.callsSince(page, n0)).filter(c => c.kind === 'rpc' && c.name === 'leaderboard_top').length;
  let txt = (await page.locator('#content').innerText()).replace(/\s+/g, ' ');
  check(r, 'the board says when it was read, with a Reload button', /As of \d\d:\d\d\./.test(txt) && (await page.getByRole('button', { name: /Reload/ }).count()) === 1, txt.slice(0, 300));
  // a failed read says why and offers to try again
  await page.evaluate(() => { window.__STUB.fail.push({ kind: 'rpc', name: 'leaderboard_top', message: 'fixture: the board is down', times: 1 }); });
  await page.getByRole('button', { name: /Reload/ }).click();
  await L.settle(page, 700);
  txt = (await page.locator('#content').innerText()).replace(/\s+/g, ' ');
  check(r, 'a board that fails to load says why, not just that it could not be fetched', /Couldn't fetch the board: fixture: the board is down/.test(txt) && (await page.getByRole('button', { name: /Try again/ }).count()) === 1, txt.slice(0, 300));
  await page.getByRole('button', { name: /Try again/ }).click();
  await L.settle(page, 700);
  txt = (await page.locator('#content').innerText()).replace(/\s+/g, ' ');
  check(r, 'Try again reads it again and the board is back, with its time', /As of \d\d:\d\d\./.test(txt) && !/Couldn't fetch/.test(txt) && /Cara/.test(txt), txt.slice(0, 300));
  // the board is kept until something moves the XP: starting a quest week rereads it
  let n0 = await L.nCalls(page);
  await L.go(page, 'today'); await L.go(page, 'proof'); await L.settle(page, 500);
  check(r, 'leaving and coming back to Proof does not read the board again (it is kept)', (await boardCalls(n0)) === 0, await boardCalls(n0));
  await L.go(page, 'today'); await L.settle(page, 500);
  await page.locator('#questPanel input[type=checkbox]').first().check();
  await page.locator('#questStartBtn').click();
  await L.settle(page, 700);
  n0 = await L.nCalls(page);
  await L.go(page, 'proof'); await L.settle(page, 700);
  check(r, 'after a quest week starts the board is read again (its XP moved)', (await boardCalls(n0)) === 1, await boardCalls(n0));
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

// ── Undo as a diff (audit FLOW-11, WORK-10; 2026-10-11, pile B9) ─────────────────────────────────────────────
S['undo-after-save'] = async (b) => {
  const r = { id: 'undo-after-save', title: 'A programme save offers a one-tap Undo that says what it changed, and refuses when the programme was written since', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'a/ava_test/work' });
  const prog = async () => (await L.db(page)).programs.find(p => p.athlete_id === 'ava_test').data;
  const sets = async () => (await prog()).workouts.days[0].blocks[1].exercises[0].rx.sets;
  const save = async v => { const ed = await openEditor(page, 'Goblet Squat'); await setField(ed, 'exSets', v); await ed.locator('.exed-acts button', { hasText: 'Save' }).click(); await L.settle(page, 700); };
  // 1. a save offers Undo, in words
  await save(5);
  const bar = page.locator('#undobar');
  check(r, 'the save worked and an Undo bar is up', (await sets()) === 5 && (await bar.isVisible()), { sets: await sets(), visible: await bar.isVisible() });
  const said = (await bar.innerText()).replace(/\s+/g, ' ');
  check(r, 'it says in words what the save changed, and whose programme', /Ava Example: Day 1 · Goblet Squat: sets 4 → 5/.test(said), said);
  // 2. Undo puts the programme back, but only against the stamp the save left
  const n0 = await L.nCalls(page);
  await bar.locator('.btn', { hasText: 'Undo' }).click();
  await L.settle(page, 700);
  const upd = lastOf(await L.callsSince(page, n0), isUpd('programs'));
  check(r, 'Undo restores the programme as it was before the save', (await sets()) === 4, await sets());
  check(r, 'the write is guarded by the stamp the save left (updated_at), so it cannot overwrite a newer one', !!upd && upd.filters.some(f => /^updated_at\.eq\./.test(f)), upd && upd.filters);
  check(r, 'the bar is gone and the page says Undone', !(await bar.isVisible()) && /Undone/.test(await L.toastText(page)), await L.toastText(page));
  // 3. someone else writes after the save: Undo refuses and leaves their work
  await save(6);
  await page.evaluate(() => {
    const row = window.__DB.programs.find(p => p.athlete_id === 'ava_test');
    row.data.workouts.days[0].blocks[1].exercises[0].rx.sets = 9;
    row.updated_at = new Date(Date.now() + 3000).toISOString(); row.updated_by = 'publish_cycle';
  });
  await bar.locator('.btn', { hasText: 'Undo' }).click();
  await L.settle(page, 700);
  check(r, 'a programme written since the save is left alone (9 sets stay)', (await sets()) === 9, await sets());
  check(r, 'and the page says why, and that nothing was changed', /has been written since your save/.test(await L.failText(page)) && /Nothing was changed/.test(await L.failText(page)), await L.failText(page));
  // 4. a restore from Version history is guarded the same way, and can itself be undone
  await page.evaluate(() => failDismissAll());
  await L.go(page, 'a/ava_test/file'); await L.settle(page, 500);
  await page.evaluate(() => { document.getElementById('pvdet').open = true; });
  await page.locator('.pvrow').first().waitFor();
  const before = JSON.stringify(await prog());
  await page.locator('.pvrow').first().getByRole('button', { name: /Restore this/ }).click();
  await L.settle(page, 800);
  check(r, 'a restore changes the programme', JSON.stringify(await prog()) !== before, '');
  const said2 = (await bar.innerText().catch(() => '')).replace(/\s+/g, ' ');
  check(r, 'a restore offers Undo too, with the words', (await bar.isVisible()) && /^Ava Example restored: /.test(said2), said2);
  await bar.locator('.btn', { hasText: 'Undo' }).click();
  await L.settle(page, 800);
  check(r, 'Undo of the restore gives back exactly the programme from before it', JSON.stringify(await prog()) === before, '');
  // 5. a restore against a programme that moved while it was being read is refused
  await page.evaluate(() => { document.getElementById('pvdet').open = false; document.getElementById('pvdet').open = true; });
  await page.locator('.pvrow').first().waitFor();
  const before2 = JSON.stringify(await prog());
  await page.evaluate(() => {
    window.__bumped = false;
    window.__STUB.afterSelect = (table) => { if (table === 'programs' && !window.__bumped) { window.__bumped = true; window.__DB.programs.find(p => p.athlete_id === 'ava_test').updated_at = new Date(Date.now() + 9000).toISOString(); } };
  });
  await page.locator('.pvrow').first().getByRole('button', { name: /Restore this/ }).click();
  await L.settle(page, 800);
  check(r, 'a restore that finds the programme newer than it read is refused and changes nothing', JSON.stringify(await prog()) === before2 && /Could not restore/.test(await L.failText(page)), (await L.failText(page)).slice(0, 200));
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

S['version-diff'] = async (b) => {
  const r = { id: 'version-diff', title: 'Version history says in words what each save changed', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'a/ava_test/work' });
  const save = async (field, v) => { const ed = await openEditor(page, 'Goblet Squat'); await setField(ed, field, v); await ed.locator('.exed-acts button', { hasText: 'Save' }).click(); await L.settle(page, 700); };
  await save('exSets', 5);
  await save('exNote', 'Two in the tank');
  await L.go(page, 'a/ava_test/file'); await L.settle(page, 500);
  await page.evaluate(() => { document.getElementById('pvdet').open = true; });
  await page.locator('.pvrow').nth(1).waitFor();
  const rows = page.locator('.pvrow');
  check(r, 'each version has a button that says what the save after it changed', (await rows.first().getByRole('button', { name: /What this save changed/ }).count()) === 1, await rows.count());
  await rows.first().getByRole('button', { name: /What this save changed/ }).click();
  await L.settle(page, 500);
  const newest = (await rows.first().locator('.pvdiffbox').innerText()).replace(/\s+/g, ' ');
  check(r, 'the newest version against the programme now: the last save changed the note (the card already had one)', /Day 1 · Goblet Squat: Coach’s Note changed/.test(newest), newest);
  await rows.nth(1).getByRole('button', { name: /What this save changed/ }).click();
  await L.settle(page, 500);
  const older = (await rows.nth(1).locator('.pvdiffbox').innerText()).replace(/\s+/g, ' ');
  check(r, 'the version before it against the next one: the earlier save changed the sets', /Day 1 · Goblet Squat: sets 4 → 5/.test(older) && !/Note/.test(older), older);
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

// ── Phone and reading polish (audit BROWSER-4, ROSTER-11, ROSTER-15, FLOW-7, FLOW-13, SPINE-7; 2026-10-11, pile B10) ───────────────────────────
S['back-keeps-place'] = async (b) => {
  const r = { id: 'back-keeps-place', title: 'Back to a screen you left lands where you were on it; a new screen starts at the top', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'athletes' });
  await page.evaluate(() => { document.body.style.minHeight = '3500px'; });     // the fixtures are a short list: give the page room to scroll
  const y = () => page.evaluate(() => Math.round(window.scrollY));
  check(r, 'the browser\'s own scroll restore is switched off (it ran before the page drew and was then overwritten)', await page.evaluate(() => history.scrollRestoration) === 'manual', await page.evaluate(() => history.scrollRestoration));
  await page.evaluate(() => window.scrollTo(0, 600)); await L.settle(page, 300);
  check(r, 'the roster is scrolled', (await y()) === 600, await y());
  await page.evaluate(() => { location.hash = '#a/ava_test/work'; }); await L.settle(page, 700);
  check(r, 'a new screen (an athlete) starts at the top', (await y()) === 0, await y());
  await page.goBack(); await L.settle(page, 700);
  check(r, 'Back to the roster lands where you were (600), not at the top', Math.abs((await y()) - 600) <= 2, await y());
  // a fresh tap on the Athletes tab, from another screen, starts at the top
  await page.evaluate(() => { location.hash = '#a/ava_test/work'; }); await L.settle(page, 700);
  await page.locator('#rail a.tab', { hasText: 'Athletes' }).first().click(); await L.settle(page, 700);
  check(r, 'tapping the Athletes tab (not Back) starts the roster at the top', (await y()) === 0, await y());
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

S['roster-tier-chips'] = async (b) => {
  const r = { id: 'roster-tier-chips', title: 'Roster: the tier chips add up to Everyone, and a chip with nobody in it is not shown', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'athletes' });
  const chips = async () => page.evaluate(() => [...document.querySelectorAll('.rfilters .rf')].map(x => [x.firstChild.textContent.trim(), Number(x.querySelector('.c').textContent), x.classList.contains('on')]));
  let c = await chips(); const n = Object.fromEntries(c.map(x => [x[0], x[1]]));
  check(r, 'Coached + Free + Proof only add up to Everyone when everybody has a file', n['Coached'] + n['Free'] + n['Proof only'] === n['Everyone'] && !('No file' in n), c);
  check(r, 'a chip with nobody in it (Gone quiet 0) is not shown', !('Gone quiet' in n) || n['Gone quiet'] > 0, c);
  // someone who signed up and has no programme and no habits: they used to sit under no tier chip
  await page.evaluate(() => { window.__DB.hab_contacts.push({ athlete_id: 'zed_nofile', email: 'zed@example.invalid', whatsapp: '+10000000009', source: 'proof.html', tier: 'free', note: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), display_name: 'Zed' }); return hardRefresh(); });
  await L.settle(page, 900);
  c = await chips(); const m = Object.fromEntries(c.map(x => [x[0], x[1]]));
  check(r, 'a person with no file gets a "No file" chip, and the tier chips add up to Everyone again', m['No file'] === 1 && m['Coached'] + m['Free'] + m['Proof only'] + m['No file'] === m['Everyone'], c);
  await page.locator('.rfilters .rf', { hasText: 'No file' }).click(); await L.settle(page, 400);
  const list = (await page.locator('#content .ath').allInnerTexts()).join(' ').replace(/\s+/g, ' ');
  check(r, 'the chip lists exactly them', /zed/i.test(list) && !/ava/i.test(list), list.slice(0, 200));
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

S['today-mark-read'] = async (b) => {
  const r = { id: 'today-mark-read', title: 'Today: a note in Needs you can be marked read from there', checks: [] };
  const { page, log } = await L.openCoach(b, {});
  const rows = () => page.locator('#needPanel .need.needrow');
  const n0 = await rows().count();
  check(r, 'a waiting note shows as a row with Mark read beside open →', n0 >= 1 && (await rows().first().getByRole('button', { name: 'Mark read' }).count()) === 1, n0);
  const said = (await rows().first().innerText()).replace(/\s+/g, ' ');
  check(r, 'the row quotes the note', /note: “/.test(said), said);
  const before = await page.evaluate(() => Object.values(S.ath).reduce((n, a) => n + a.toReply, 0));
  const c0 = await L.nCalls(page);
  await rows().first().getByRole('button', { name: 'Mark read' }).click(); await L.settle(page, 700);
  const upd = lastOf(await L.callsSince(page, c0), isUpd('session_history'));
  check(r, 'it marks that one session read, on the server', !!upd && upd.payload.coach_status === 'read' && upd.filters.some(f => /^athlete_id\.eq\./.test(f)) && upd.filters.some(f => /^day\.eq\./.test(f)), upd && { payload: upd.payload, filters: upd.filters });
  const after = await page.evaluate(() => Object.values(S.ath).reduce((n, a) => n + a.toReply, 0));
  check(r, 'the notes-to-read count goes down by one, without opening the athlete', after === before - 1 && location_is_today(await page.evaluate(() => location.hash)), { before, after });
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};
function location_is_today(h) { return h === '' || h === '#today'; }

S['spine-copy-add'] = async (b) => {
  const r = { id: 'spine-copy-add', title: 'Exercises → Not in the Spine yet: one tap copies "/spine add <name>" for Claude', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'exercises' });
  await L.settle(page, 700);
  await page.evaluate(() => document.querySelectorAll('#content details').forEach(d => { d.open = true; }));
  const panel = page.locator('details', { hasText: 'Not in the Spine yet' }).first();
  const names = await page.evaluate(() => [...document.querySelectorAll('details')].find(d => /Not in the Spine yet/.test(d.textContent)).querySelectorAll('.credrow .credname').length);
  check(r, 'the list has names with no entry', names >= 1, names);
  const one = panel.locator('.credrow').first();
  const nm = (await one.locator('.credname').innerText()).trim();
  await one.getByRole('button', { name: /Copy \/spine add/ }).click(); await L.settle(page, 300);
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  check(r, 'a row copies "/spine add <that name>"', clip === '/spine add ' + nm, clip);
  await panel.getByRole('button', { name: /Copy \/spine add for all/ }).click(); await L.settle(page, 300);
  const all = (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n');   // Windows hands the clipboard back with CRLF
  check(r, 'the top button copies every name, one per line, after "/spine add"', /^\/spine add\n- /.test(all) && all.split('\n').length === names + 1 && all.includes('- ' + nm), all.slice(0, 160));
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

S['spine-editor-folds'] = async (b) => {
  const r = { id: 'spine-editor-folds', title: 'Exercises → an entry: the body map and the coach-only half are folded, and open by themselves when something is missing', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'exercises' });
  await L.settle(page, 600);
  await page.locator('.sp-filter', { hasText: 'Approved' }).click(); await L.settle(page, 300);
  await page.locator('.spine-row', { hasText: 'Goblet Squat' }).first().getByRole('button', { name: 'Open' }).click(); await L.settle(page, 500);
  let secs = await page.evaluate(() => [...document.querySelectorAll('#spineEd details.spsec')].map(d => [d.querySelector('summary').textContent.replace(/\s+/g, ' ').trim(), d.open]));
  check(r, 'a complete entry (counts, cost and SFR set) has three folded parts (body map, Farsi, coach only)', secs.length === 3 && secs.every(s => s[1] === false), secs);
  // one that is missing its counts: the coach-only part opens by itself and says so
  await page.locator('.sp-close').first().click(); await L.settle(page, 400);
  await page.locator('.sp-filter[data-f="draft"]').click(); await L.settle(page, 300);
  await page.locator('.spine-row', { hasText: 'Machine Leg Press' }).first().getByRole('button', { name: 'Open' }).click(); await L.settle(page, 500);
  secs = await page.evaluate(() => [...document.querySelectorAll('#spineEd details.spsec')].map(d => [d.querySelector('summary').textContent.replace(/\s+/g, ' ').trim(), d.open]));
  check(r, 'an entry with no count yet opens the coach-only part by itself and says "no count yet"', secs.some(s => /Coach only/.test(s[0]) && s[1] && /no count yet/.test(s[0])), secs);
  // typing into the coach-only part works, and a redraw leaves the parts as they were
  await page.locator('#spineEd [data-sf="sfr"]').fill('3');
  await page.evaluate(() => { const d = document.querySelector('#spineEd details.spsec'); d.open = true; d.dispatchEvent(new Event('toggle')); });
  await page.evaluate(() => renderExercises()); await L.settle(page, 400);
  secs = await page.evaluate(() => [...document.querySelectorAll('#spineEd details.spsec')].map(d => d.open));
  check(r, 'the parts stay as you left them across a redraw, and what was typed is kept', secs[0] === true && secs[1] === false && secs[2] === true && (await page.locator('#spineEd [data-sf="sfr"]').inputValue()) === '3', secs);
  const c0 = await L.nCalls(page);
  await page.locator('#spineEd .sp-save').first().click(); await L.settle(page, 800);
  const upd = lastOf(await L.callsSince(page, c0), c => c.kind === 'rpc' && c.name === 'coach_save_spine');
  check(r, 'a save from the folded editor still sends what was typed (the SFR)', !!upd && JSON.stringify(upd.payload).includes('"sfr":3'), upd && JSON.stringify(upd.payload).slice(0, 200));
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

S['levels-in-place'] = async (b) => {
  const r = { id: 'levels-in-place', title: 'The Proof levels arrive without redrawing the page that is already on screen', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'athletes', seed: { stub: { delay: { coach_season_levels: 1500 } } } });
  const text0 = await page.locator('#content').innerText();
  check(r, 'the roster is drawn before the levels arrive (no LV yet)', !/LV 3/.test(text0), text0.slice(0, 120));
  await page.evaluate(() => { window.__row = document.querySelector('#content .ath'); window.__q = document.querySelector('#rsearch, #content input[type=search], #content input'); });
  await L.settle(page, 2200);
  const same = await page.evaluate(() => ({ rowKept: !!window.__row && window.__row.isConnected, firstRowNow: document.querySelector('#content .ath') === window.__row }));
  check(r, 'when the levels arrive the rows on screen are the same elements (nothing was replaced)', same.rowKept && same.firstRowNow, same);
  const text1 = await page.locator('#content').innerText();
  check(r, 'and the levels are on the roster now', /LV 3/.test(text1) && /LV 4/.test(text1), text1.replace(/\s+/g, ' ').slice(0, 200));
  // the athlete's header and the Proof panel use the same slots
  await L.go(page, 'a/ava_test/work'); await L.settle(page, 500);
  check(r, 'an athlete\'s header shows the level', /LV 3/.test(await page.locator('#content').innerText()), '');
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

// ── Buyer logins: the Testing app and Course tabs (audit MKT-6; pinned 2026-10-11 before the two copied blocks were merged) ───────────────────────
for (const [tab, P, fn, table, urlPart] of [['course', 'tp', 'tps-login', 'tps_accounts', '/tennis/app/'], ['assess', 'as', 'assess-login', 'assess_accounts', '/tennis-testing/app/']]) {
  S['buyer-logins-' + tab] = async (b) => {
    const r = { id: 'buyer-logins-' + tab, title: `${tab === 'course' ? 'Course' : 'Testing app'} tab: create, copy, mark sent, change the password, revoke and restore a buyer's login, and a double tap`, checks: [] };
    const { page, log } = await L.openCoach(b, { hash: tab });
    await L.settle(page, 600);
    const row = u => page.locator('#content .credrow', { hasText: u }).first();
    const fnCalls = async n0 => (await L.callsSince(page, n0)).filter(c => c.kind === 'fn' && c.name === fn);
    const clip = () => page.evaluate(() => navigator.clipboard.readText());
    // create (double tap: one call)
    await page.locator('#' + P + 'User').fill('new_buyer'); await page.locator('#' + P + 'Label').fill('who bought it');
    let n0 = await L.nCalls(page);
    await page.locator('#' + P + 'Create').dblclick(); await L.settle(page, 900);
    let calls = await fnCalls(n0);
    check(r, 'Create calls the login function once even on a double tap, with the username and the note', calls.length === 1 && calls[0].payload.action === 'create' && calls[0].payload.username === 'new_buyer' && calls[0].payload.label === 'who bought it', calls.map(c => c.payload));
    check(r, 'the new login is in the list with its stored password and a Copy message button', (await row('new_buyer').locator('.credpass').count()) === 1 && (await row('new_buyer').locator('.' + P + '-copy').count()) === 1, '');
    const msg = await clip();
    check(r, 'the Farsi message with the link, username and password is on the clipboard', msg.includes(urlPart) && msg.includes('new_buyer') && /رمز عبور/.test(msg), msg.slice(0, 120));
    check(r, 'the page says Login created for them', /Login created for new_buyer/.test(await L.toastText(page)), await L.toastText(page));
    // copy again
    await page.evaluate(() => navigator.clipboard.writeText('x'));
    await row('new_buyer').locator('.' + P + '-copy').click(); await L.settle(page, 300);
    check(r, 'Copy message puts the same message back', (await clip()).includes('new_buyer') && (await clip()).includes(urlPart), (await clip()).slice(0, 80));
    // mark sent clears the stored password
    n0 = await L.nCalls(page);
    await row('new_buyer').locator('.' + P + '-sent').click(); await L.settle(page, 700);
    const upd = lastOf(await L.callsSince(page, n0), isUpd(table));
    check(r, 'Mark sent clears the stored password and stamps sent, for that username', !!upd && upd.payload.initial_password === null && !!upd.payload.sent_at && upd.filters.some(f => /^username\.eq\./.test(f)), upd && upd.payload);
    check(r, 'the row now says sent and has no password or Copy message', /sent \d{4}-\d{2}-\d{2}/.test((await row('new_buyer').innerText()).replace(/\s+/g, ' ')) && (await row('new_buyer').locator('.credpass').count()) === 0, (await row('new_buyer').innerText()).replace(/\s+/g, ' '));
    // change the password: a typed one, then the function's
    await row('new_buyer').locator('.' + P + '-pw').click(); await L.settle(page, 300);
    check(r, 'Change password opens a form under the row, focused', (await page.locator('.' + P + '-pwin').count()) === 1 && await page.evaluate(sel => document.activeElement && document.activeElement.matches(sel), '.' + P + '-pwin'), '');
    await page.locator('.' + P + '-pwin').fill('AbcdEfgh12');
    n0 = await L.nCalls(page);
    await page.locator('.' + P + '-pwsave').click(); await L.settle(page, 800);
    calls = await fnCalls(n0);
    check(r, 'Save password calls reset with the typed password', calls.length === 1 && calls[0].payload.action === 'reset' && calls[0].payload.username === 'new_buyer' && calls[0].payload.password === 'AbcdEfgh12', calls.map(c => c.payload));
    check(r, 'and says Password changed', /Password changed for new_buyer/.test(await L.toastText(page)), await L.toastText(page));
    await row('new_buyer').locator('.' + P + '-pw').click(); await L.settle(page, 300);
    await page.locator('.' + P + '-pwin').fill('short');
    n0 = await L.nCalls(page);
    await page.locator('.' + P + '-pwsave').click(); await L.settle(page, 400);
    check(r, 'a password that breaks the rule is refused before the function is called', (await fnCalls(n0)).length === 0 && /8/.test(await L.failText(page)), await L.failText(page));
    await page.evaluate(() => failDismissAll());
    await page.locator('.' + P + '-pwcancel').click(); await L.settle(page, 300);
    // revoke and restore
    n0 = await L.nCalls(page);
    await row('new_buyer').locator('.' + P + '-act').click(); await L.settle(page, 800);
    calls = await fnCalls(n0);
    check(r, 'Revoke (after the confirm) calls revoke, and the login moves to Revoked', calls.length === 1 && calls[0].payload.action === 'revoke' && /new_buyer revoked/.test(await L.toastText(page)), { calls: calls.map(c => c.payload), toast: await L.toastText(page) });
    await page.evaluate(() => { document.querySelectorAll('#content details').forEach(d => { d.open = true; }); });
    await row('new_buyer').locator('.' + P + '-pw').click(); await L.settle(page, 300);
    n0 = await L.nCalls(page);
    await page.locator('.' + P + '-pwsave').click(); await L.settle(page, 800);
    calls = await fnCalls(n0);
    check(r, 'Restore calls restore (no typed password: the function makes one) and says Login restored', calls.length === 1 && calls[0].payload.action === 'restore' && /Login restored for new_buyer/.test(await L.toastText(page)), { calls: calls.map(c => c.payload), toast: await L.toastText(page) });
    // the function fails: the page says why, in the persistent bar
    await page.evaluate(f => { window.__STUB.fail.push({ kind: 'fn', name: f, message: 'fixture: the login function is down', times: 1 }); }, fn);
    await page.locator('#' + P + 'User').fill('another_one');
    await page.locator('#' + P + 'Create').click(); await L.settle(page, 800);
    check(r, 'a failed create says why and nothing is added', /Could not create the login/.test(await L.failText(page)) && /fixture: the login function is down/.test(await L.failText(page)) && (await row('another_one').count()) === 0, await L.failText(page));
    check(r, 'no page errors', !log.errors.length, log.errors);
    await page.context().close();
    return r;
  };
}

S['athlete-login-double-tap'] = async (b) => {
  const r = { id: 'athlete-login-double-tap', title: 'An athlete\'s Save password tapped twice calls the login function once (a second call made a second password and left the message with the first)', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'a/ava_test/file' });
  await page.getByRole('button', { name: 'Change password' }).click();
  await page.locator('#athPw').fill('AbcdEfgh12');
  const n0 = await L.nCalls(page);
  await page.getByRole('button', { name: 'Save password' }).dblclick(); await L.settle(page, 900);
  const calls = (await L.callsSince(page, n0)).filter(c => c.kind === 'fn' && c.name === 'athlete-login');
  check(r, 'one call, with the typed password', calls.length === 1 && calls[0].payload.action === 'reset' && calls[0].payload.password === 'AbcdEfgh12', calls.map(c => c.payload));
  check(r, 'and the page says what happened (the "Copied" toast no longer replaces it)', /Password changed — the message is copied; send it on WhatsApp/.test(await L.toastText(page)), await L.toastText(page));
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

// ── Tidying (audit SERVER-10, TOOLS-6, ROSTER-13; 2026-10-11, pile B11) ─────────────────────────────────────────────────────────────
S['library-paged'] = async (b) => {
  const r = { id: 'library-paged', title: 'The Library items are read in pages, so a server with a small row cap still shows every one', checks: [] };
  const { page, log } = await L.openCoach(b, { seed: { stub: { maxRows: 3 } } });
  await page.evaluate(() => {
    for (let i = 1; i <= 8; i++) window.__DB.library.push({ slug: 'workouts/strength/item-' + i, kind: 'workout', category_id: 'strength', published: true, sort_order: 10 + i, updated_at: new Date().toISOString(),
      data: { id: 'item-' + i, title: 'Item ' + i, duration: '15 min', equipment: 'Bands', category: 'strength' } });
    return hardRefresh();
  });
  await L.settle(page, 900);
  const st = await page.evaluate(() => ({ n: S.lib.length, err: LOAD_ERR.library || '', slugs: S.lib.map(x => x.slug) }));
  check(r, 'all nine items are there although the server answers three at a time', st.n === 9 && !st.err, st);
  check(r, 'and they are in their shelf order (sort_order, then slug)', st.slugs[0] === 'workouts/strength/fixture-burner' && st.slugs[8] === 'workouts/strength/item-8', st.slugs);
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

S['library-publish-guards'] = async (b) => {
  const r = { id: 'library-publish-guards', title: 'Library publish: the confirm says what is new and what replaces, a hidden item stays hidden, and an id on another shelf is refused', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'links' });
  await page.evaluate(() => {
    window.__DB.library_categories.push({ id: 'conditioning', kind: 'workout', title: 'Conditioning (fixture)', banner: null, icon: null, sort_order: 2 });
    window.__DB.library.push({ slug: 'workouts/strength/hidden-one', kind: 'workout', category_id: 'strength', published: false, sort_order: 2, updated_at: new Date().toISOString(),
      data: { id: 'hidden-one', title: 'Hidden One', duration: '10 min', category: 'strength' } });
    return hardRefresh();
  });
  await L.settle(page, 900);
  const file = (name, d) => ({ name, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(d)) });
  const pick = async files => {
    const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: /\+ Publish workout/ }).click()]);
    await fc.setFiles(files); await L.settle(page, 900);
  };
  const lastConfirm = () => (log.dialogs.filter(d => d.type === 'confirm').slice(-1)[0] || {}).message || '';
  // 1. new, replaces a live one, replaces a hidden one
  let n0 = await L.nCalls(page);
  await pick([file('fixture-burner.json', { id: 'fixture-burner', title: 'Fixture Burner', duration: '20 min', category: 'strength' }),
    file('brand-new.json', { id: 'brand-new', title: 'Brand New', duration: '15 min', category: 'strength' }),
    file('hidden-one.json', { id: 'hidden-one', title: 'Hidden One', duration: '10 min', category: 'strength' })]);
  const c1 = lastConfirm();
  check(r, 'the confirm says which is new', /Brand New — new/.test(c1), c1);
  check(r, 'it says which replaces the live one', /Fixture Burner — replaces the live one/.test(c1), c1);
  check(r, 'and which replaces a hidden one, which stays hidden', /Hidden One — replaces a hidden one, which STAYS hidden/.test(c1), c1);
  const up = lastOf(await L.callsSince(page, n0), c => c.kind === 'from' && c.name === 'library' && c.op === 'upsert');
  const pubOf = slug => ((up && up.payload) || []).find(x => x.slug === slug);
  check(r, 'the write keeps the hidden one hidden and publishes the other two', !!up && pubOf('workouts/strength/hidden-one').published === false && pubOf('workouts/strength/fixture-burner').published === true && pubOf('workouts/strength/brand-new').published === true, up && up.payload.map(x => [x.slug, x.published]));
  // 2. the same id on another shelf: refused, nothing written
  n0 = await L.nCalls(page);
  await pick([file('fixture-burner.json', { id: 'fixture-burner', title: 'Fixture Burner', duration: '20 min', category: 'conditioning' })]);
  const bar = await L.failText(page);
  check(r, 'an id that is already on another shelf is refused, naming the shelf and what to do', /already on the Strength \(fixture\) shelf/.test(bar) && /hide that one first/.test(bar), bar);
  check(r, 'and nothing was written', !(await L.callsSince(page, n0)).some(c => c.name === 'library' && c.op === 'upsert'), '');
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

// ── The preview says what it shows (audit TOOLS-11, pile A7; 2026-10-11) ─────────────────────────────────────────────────────────────
S['file-preview-wording'] = async (b) => {
  const r = { id: 'file-preview-wording', title: 'The File tab says the preview shows the programme only, and the preview bar in program.html says the same', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'a/ava_test/file' });
  const panel = await page.evaluate(() => {
    const h = [...document.querySelectorAll('.sec')].find(x => /their app/i.test(x.innerText));   // the heading is drawn in capitals, which innerText returns
    const p = h && h.nextElementSibling;
    return p ? p.innerText.replace(/\s+/g, ' ').trim() : '';
  });
  check(r, 'the File tab does not promise "their real data" or "exactly as they see it"', !!panel && !/real data|exactly as they see/i.test(panel), panel);
  check(r, 'it says the preview shows the programme only', /programme only/.test(panel), panel);
  check(r, 'it says what is not in it (sets, weights, records, habits) and where to read that (The work and Proof)', /sets, weights, records, habits/.test(panel) && /The work and Proof/.test(panel), panel);
  // The two buttons still open the read-only preview of this athlete.
  await page.evaluate(() => { window.__opened = []; window.open = u => { window.__opened.push(String(u)); return null; }; });
  await page.getByRole('button', { name: 'View their app' }).click();
  await page.getByRole('button', { name: 'View their Proof' }).click();
  const opened = await page.evaluate(() => window.__opened);
  check(r, 'View their app opens program.html for that athlete in preview mode', /\/program\.html\?client=ava_test&preview=1$/.test(opened[0] || ''), opened);
  check(r, 'View their Proof opens habits.html for that athlete in preview mode', /\/habits\.html\?client=ava_test&preview=1$/.test(opened[1] || ''), opened);
  // The bar the athlete app draws over a preview makes the same claim, so the two cannot drift apart again.
  const src = await page.evaluate(async () => (await fetch('/program.html')).text());
  const bar = (src.match(/bar\.textContent = '(COACH PREVIEW[^']*)' \+ clientId \+ '([^']*)'/) || []).slice(1).join('<id>');
  check(r, 'the preview bar in program.html says "without their logged work", not "exactly as they see it"', /without their logged work/.test(bar) && !/exactly as they see/.test(bar), bar);
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

// ── Hide a session instead of deleting it (audit FILE-11, ROSTER-9; pile A6, stage60; 2026-10-11) ─────────────────────────────────────────
const hideFixture = async (page, day, withMarks) => {
  await page.evaluate(([d, marks]) => {
    window.__DB.session_history.push({ athlete_id: 'ava_test', athlete_name: 'Ava Example', day: 3, completed_on: d, status: 'Complete', session_rpe: 7, duration_min: 30,
      readiness: null, day_note: '', focus: 'Pull Day (fixture)', summary: 'Day 3 — Pull Day (fixture)\nExercise log:\n• Old Lift (✓)', log: [{ ex: 'Old Lift', sets: [] }],
      coach_status: 'read', updated_at: new Date().toISOString(), hidden_at: null, hidden_by: null });
    if (marks) { const p = window.__DB.athlete_progress.find(x => x.athlete_id === 'ava_test'); p.data['ava_test_sent_d3'] = d + 'T18:00:00.000Z'; p.data['ava_test_senton_d3'] = d; }
    return hardRefresh();
  }, [day, !!withMarks]);
  await L.settle(page, 900);
};

S['session-hide-undo'] = async (b) => {
  const r = { id: 'session-hide-undo', title: 'Hide this log: the session leaves the numbers, Undo and Restore bring it back, Delete for good only reaches a hidden one', checks: [] };
  const { page, log, today } = await L.openCoach(b, { hash: 'a/ava_test/work' });
  const day = require('./fixtures').daysAgo(today, 5);
  await hideFixture(page, day, false);
  const dayCard = () => page.locator('.wday', { hasText: 'Pull Day (fixture)' });
  const dayText = async () => (await dayCard().locator('.wday-top').innerText()).replace(/\s+/g, ' ');
  const row = async () => (await L.db(page)).session_history.find(x => x.athlete_id === 'ava_test' && x.day === 3 && x.completed_on === day);
  check(r, 'Day 3 shows the logged session to begin with', /Complete/.test(await dayText()), await dayText());
  // 1. hide it from the raw log
  await dayCard().locator('.wday-top').click();
  let n0 = await L.nCalls(page);
  await dayCard().locator('details.rawlog summary').first().click();
  await dayCard().locator('button', { hasText: 'Hide this log' }).click();
  await L.settle(page, 900);
  let calls = await L.callsSince(page, n0);
  const hide = calls.filter(x => x.name === 'coach_hide_session').slice(-1)[0];
  check(r, 'one coach_hide_session call, for that athlete, day and date, hide true', !!hide && calls.filter(x => x.name === 'coach_hide_session').length === 1 && hide.payload.p_athlete_id === 'ava_test' && hide.payload.p_day === 3 && hide.payload.p_completed_on === day && hide.payload.p_hide === true, hide && hide.payload);
  check(r, 'no row was deleted', !calls.some(x => x.name === 'session_history' && x.op === 'delete'), calls.filter(x => x.op === 'delete'));
  check(r, 'the day card is back to not logged', /not logged yet/.test(await dayText()), await dayText());
  const bar = (await page.locator('#undobar').innerText()).replace(/\s+/g, ' ');
  check(r, 'the Undo bar says what was hidden, and that it is out of the numbers', /Hid Ava Example.s Day 3 log from/.test(bar) && /Undo/.test(bar) && /out of their numbers/.test(bar), bar);
  const hidden = await row();
  check(r, 'the row is still in the database, marked hidden by the coach', !!hidden && !!hidden.hidden_at && hidden.hidden_by === 'amirardekanian@gmail.com', hidden && { at: hidden.hidden_at, by: hidden.hidden_by });
  check(r, 'the dashboard keeps it out of every number (S.hist) and lists it apart (S.histHidden)', await page.evaluate(d => !S.hist.some(h => h.day === 3 && h.completed_on === d) && S.histHidden.some(h => h.day === 3 && h.completed_on === d), day), '');
  // 2. Undo from the bar
  n0 = await L.nCalls(page);
  await page.locator('#undobar button', { hasText: 'Undo' }).click();
  await L.settle(page, 900);
  calls = await L.callsSince(page, n0);
  const un = calls.filter(x => x.name === 'coach_hide_session').slice(-1)[0];
  check(r, 'Undo calls coach_hide_session with hide false', !!un && un.payload.p_hide === false && un.payload.p_day === 3, un && un.payload);
  check(r, 'Day 3 shows the session again, and the row is no longer hidden', /Complete/.test(await dayText()) && !(await row()).hidden_at, await dayText());
  check(r, 'the Undo bar is gone', await page.locator('#undobar').isHidden(), '');
  // 3. the File lists a hidden session, and Restore brings it back
  await page.evaluate(([k]) => hideSession('ava_test', 3, k), [day]); await L.settle(page, 900);
  await page.locator('#undobar .ux').click();
  await L.go(page, 'a/ava_test/file'); await L.settle(page, 700);
  const list = (await page.locator('#hidden-sessions').innerText()).replace(/\s+/g, ' ');
  check(r, 'the File lists it under Hidden sessions: day, date, what it was, Restore and Delete for good', /Day 3/.test(list) && /Pull Day \(fixture\)/.test(list) && /Restore/.test(list) && /Delete for good/.test(list), list);
  n0 = await L.nCalls(page);
  await page.locator('#hidden-sessions button', { hasText: 'Restore' }).click();
  await L.settle(page, 900);
  const rs = (await L.callsSince(page, n0)).filter(x => x.name === 'coach_hide_session').slice(-1)[0];
  check(r, 'Restore calls coach_hide_session with hide false', !!rs && rs.payload.p_hide === false, rs && rs.payload);
  check(r, 'the list is gone when nothing is hidden', (await page.locator('#hidden-sessions').count()) === 0 && !(await row()).hidden_at, '');
  // 4. Delete for good reaches a hidden session only
  await page.evaluate(([k]) => hideSession('ava_test', 3, k), [day]); await L.settle(page, 900);
  await page.locator('#undobar .ux').click();
  await L.go(page, 'a/ava_test/file'); await L.settle(page, 700);
  n0 = await L.nCalls(page);
  await page.locator('#hidden-sessions button', { hasText: 'Delete for good' }).click();
  await L.settle(page, 900);
  const del = (await L.callsSince(page, n0)).filter(x => x.name === 'session_history' && x.op === 'delete').slice(-1)[0];
  check(r, 'Delete for good deletes by athlete, day, date AND only a hidden row', !!del && del.filters.length === 4 && del.filters.some(f => /hidden_at/.test(String(f))), del && del.filters);
  const confirmText = ((log.dialogs.filter(d => d.type === 'confirm').slice(-1)[0]) || {}).message || '';
  check(r, 'it asked first, and said it can only come back from a backup file', /for good/.test(confirmText) && /backup file/.test(confirmText), confirmText);
  check(r, 'the row is gone', !(await row()), '');
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

S['session-hide-no-false-warning'] = async (b) => {
  const r = { id: 'session-hide-no-false-warning', title: 'Hiding a session whose report was emailed does not start a "session not synced" warning', checks: [] };
  const { page, log, today } = await L.openCoach(b, { hash: 'today' });
  const day = require('./fixtures').daysAgo(today, 4);
  await hideFixture(page, day, true);      // the athlete's progress carries the report's marks for Day 3
  const keys = () => page.evaluate(() => reasonsOf(S.ath.ava_test).map(x => x.key));
  check(r, 'with the session on file there is no sync warning', !(await keys()).includes('sync'), await keys());
  await page.evaluate(([k]) => hideSession('ava_test', 3, k), [day]); await L.settle(page, 900);
  check(r, 'after hiding it there is still none', !(await keys()).includes('sync'), await keys());
  check(r, 'the roster still holds the hidden session apart and counts it as present', await page.evaluate(() => S.ath.ava_test.hidden.length === 1 && S.ath.ava_test.syncGaps.length === 0), '');
  // The old way: the session row simply gone while its report mark stays is the warning.
  await page.evaluate(([k]) => { window.__DB.session_history = window.__DB.session_history.filter(x => !(x.athlete_id === 'ava_test' && x.completed_on === k && x.day === 3)); return hardRefresh(); }, [day]);
  await L.settle(page, 900);
  check(r, 'a report mark with no session at all is still a warning (the check itself is unchanged)', (await keys()).includes('sync'), await keys());
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

// ── What became of an application (audit FLOW-17, SPINE-11; pile A8, stage61; 2026-10-11) ───────────────────────────────────────────────────
S['intake-outcome'] = async (b) => {
  const r = { id: 'intake-outcome', title: "Intake: an application records what happened and the athlete it became; the athlete's File says where they came from", checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'intake' });
  const card = name => page.locator('.intake-card', { hasText: name });
  const badge = async () => (await page.locator('#rail a.tab', { hasText: 'Intake' }).innerText()).replace(/\s+/g, ' ');
  const b0 = await badge();
  const one = card('Fixture Applicant One');
  // 1. a client needs an athlete
  await one.locator('.i-out-sel').selectOption('client');
  check(r, 'choosing "Became a client" shows the athlete picker', await one.locator('.i-who').isVisible(), '');
  let n0 = await L.nCalls(page);
  await one.locator('.intake-outcome-save').click(); await L.settle(page, 500);
  check(r, 'saving a client with no athlete picked is refused on the page, and nothing is sent', !(await L.callsSince(page, n0)).some(c => c.name === 'set_intake_outcome') && /Pick the athlete/.test(await L.failText(page)), await L.failText(page));
  await one.locator('.i-ath-sel').selectOption('ava_test');
  n0 = await L.nCalls(page);
  await one.locator('.intake-outcome-save').click(); await L.settle(page, 900);
  const c1 = lastOf(await L.callsSince(page, n0), c => c.name === 'set_intake_outcome');
  check(r, 'one set_intake_outcome(id, client, ava_test)', !!c1 && /1a1$/.test(c1.payload.p_id) && c1.payload.p_outcome === 'client' && c1.payload.p_athlete_id === 'ava_test', c1 && c1.payload);
  const t1 = (await one.evaluate(el => el.textContent)).replace(/\s+/g, ' ');      // textContent: the card is folded, its body is not drawn
  check(r, 'the card moved to Handled, wears the outcome as a pill, names the athlete, and the Intake badge dropped', /handled/.test(await one.getAttribute('class')) && /Became a client/.test(t1) && /Ava Example/.test(t1) && (await badge()) !== b0, { cls: await one.getAttribute('class'), t1: t1.slice(0, 200), badge: await badge() });
  check(r, 'the server row holds the link and the outcome, and marked the application handled', await page.evaluate(() => { const i = window.__DB.hab_intake.find(x => /1a1$/.test(x.id)); return i.athlete_id === 'ava_test' && i.outcome === 'client' && i.status === 'handled' && !!i.linked_at; }), '');
  // 2. an outcome that keeps no athlete
  const two = card('Fixture Applicant Two');
  await two.locator('.i-out-sel').selectOption('not_a_fit');
  check(r, 'a "Not a fit" has no athlete picker', !(await two.locator('.i-who').isVisible()), '');
  n0 = await L.nCalls(page);
  await two.locator('.intake-outcome-save').click(); await L.settle(page, 900);
  const c2 = lastOf(await L.callsSince(page, n0), c => c.name === 'set_intake_outcome');
  check(r, 'it is saved with no athlete', !!c2 && c2.payload.p_outcome === 'not_a_fit' && c2.payload.p_athlete_id === null, c2 && c2.payload);
  // 3. the athlete's File says where they came from
  await L.go(page, 'a/ava_test/file'); await L.settle(page, 700);
  const meta = (await page.locator('.meta-table').first().innerText()).replace(/\s+/g, ' ');
  check(r, 'the File says "Came from" the application, its programme and its outcome, with a link to Intake', /came from/i.test(meta) && /Set — \$180/.test(meta) && /Became a client/.test(meta) && (await page.locator('.meta-table a[href="#intake"]').count()) === 1, meta.slice(0, 400));
  // 4. clearing it
  await L.go(page, 'intake'); await L.settle(page, 500);
  await card('Fixture Applicant One').locator('summary').click();
  await card('Fixture Applicant One').locator('.i-out-sel').selectOption('');
  n0 = await L.nCalls(page);
  await card('Fixture Applicant One').locator('.intake-outcome-save').click(); await L.settle(page, 900);
  const c3 = lastOf(await L.callsSince(page, n0), c => c.name === 'set_intake_outcome');
  check(r, 'clearing sends a null outcome and no athlete', !!c3 && c3.payload.p_outcome === null && c3.payload.p_athlete_id === null, c3 && c3.payload);
  await L.go(page, 'a/ava_test/file'); await L.settle(page, 700);
  check(r, 'and the File no longer says where they came from', !/came from/i.test(await page.locator('.meta-table').first().innerText()), '');
  // 5. a server without stage61
  await L.go(page, 'intake'); await L.settle(page, 500);
  await page.evaluate(() => { window.__STUB.missingRpc = ['set_intake_outcome']; });
  await card('Fixture Applicant One').locator('summary').click();      // a handled card is folded after every redraw
  await card('Fixture Applicant One').locator('.i-out-sel').selectOption('declined');
  await card('Fixture Applicant One').locator('.intake-outcome-save').click(); await L.settle(page, 700);
  check(r, 'a server that has not had stage61 says so, in words', /set_intake_outcome yet/.test(await L.failText(page)) && /stage61/.test(await L.failText(page)), await L.failText(page));
  // 6. the likely athlete is suggested, never saved on its own
  await page.evaluate(() => { window.__STUB.missingRpc = []; window.__DB.hab_intake.push({ id: 'guess-1', created_at: new Date().toISOString(), lang: 'en', name: 'Ava  Example', email: '', contact: '', programme: 'Set', payload: {}, status: 'new', handled_at: null }); return hardRefresh(); });
  await L.settle(page, 900); await L.go(page, 'intake'); await L.settle(page, 500);
  check(r, 'an application with the same full name as one athlete has that athlete pre-selected', (await page.locator('.i-outcome[data-id="guess-1"] .i-ath-sel').inputValue()) === 'ava_test', await page.locator('.i-outcome[data-id="guess-1"] .i-ath-sel').inputValue());
  check(r, '...and a saved outcome is only what the coach saved (nothing was sent for it)', await page.evaluate(() => { const i = window.__DB.hab_intake.find(x => x.id === 'guess-1'); return !i.athlete_id && !i.outcome; }), '');
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

S['erase-linked-form'] = async (b) => {
  const r = { id: 'erase-linked-form', title: 'Erase completely…: an application you linked to the athlete is offered and ticked; one left unticked keeps its answers and loses only the link', checks: [] };
  const { page, log } = await L.openCoach(b, {});
  await seedErasable(page);
  await page.evaluate(() => {
    const now = new Date().toISOString();
    window.__DB.hab_intake.push({ id: 'zed-linked-1', created_at: now, lang: 'fa', name: 'ناشناس', email: '', contact: '', programme: 'Set', payload: {}, status: 'handled', handled_at: now, athlete_id: 'zed_erase', outcome: 'client', linked_at: now },
      { id: 'zed-linked-2', created_at: now, lang: 'fa', name: 'ناشناس دو', email: '', contact: '', programme: 'Set', payload: {}, status: 'handled', handled_at: now, athlete_id: 'zed_erase', outcome: 'client', linked_at: now });
    return hardRefresh();
  });
  await L.settle(page, 900);
  await L.go(page, 'a/zed_erase/file');
  await page.locator('button', { hasText: /Erase completely/ }).click();
  await page.locator('.erase #eraseIn').waitFor();
  const t = await erasePanelText(page);
  const picks = page.locator('.erase .pick');
  check(r, 'both linked applications are offered, with the chip "linked to them"', (await picks.filter({ hasText: 'linked to them' }).count()) === 2, t.slice(0, 900));
  check(r, 'they are ticked for you (the coach linked them by hand), and so is the same-email one', (await picks.filter({ hasText: 'linked to them' }).locator('input:checked').count()) === 2 && await page.locator('.erase .pick', { hasText: 'same email' }).locator('input').isChecked(), '');
  await page.locator('.erase .pick', { hasText: 'linked to them' }).first().locator('input').uncheck();   // leave one of them
  await page.locator('#eraseIn').fill('zed_erase');
  const n0 = await L.nCalls(page);
  await page.locator('#eraseGo').click(); await L.settle(page, 1300);
  const real = (await L.callsSince(page, n0)).filter(c => c.name === 'coach_erase_person' && c.payload.p_dry_run === false);
  const picked = (real[0] && real[0].payload.p_intake_ids) || [];
  check(r, 'the real call names the ticked linked form and not the unticked one', real.length === 1 && picked.length === 2 && picked.filter(x => /^zed-linked-/.test(x)).length === 1, picked);
  const d = await L.db(page);
  const left = d.hab_intake.filter(i => /^zed-linked-/.test(i.id));
  check(r, 'one linked form is gone; the other keeps its answers, with no athlete id and no link time', left.length === 1 && left[0].athlete_id === null && left[0].linked_at === null && left[0].outcome === 'client', left);
  check(r, 'nothing is left under their id in any table', Object.keys(d).filter(t => Array.isArray(d[t]) && d[t].some(x => x.athlete_id === 'zed_erase')).length === 0, '');
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

// ── A WhatsApp number on the File (audit FLOW-8; pile A9, stage62; 2026-10-11) ───────────────────────────────────────────────────────────
S['whatsapp-number'] = async (b) => {
  const r = { id: 'whatsapp-number', title: "A WhatsApp number on the File: saved by the coach, shown in the header with a button, never mistaken for a signup", checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'a/ben_test/file' });
  const head = async () => (await page.locator('.dethead').innerText()).replace(/\s+/g, ' ');
  check(r, 'a coached athlete with no number gets "add a WhatsApp number" under their name', /add a WhatsApp number/i.test(await head()) && (await page.locator('.dethead a[href$="/file"]').count()) === 1, await head());
  check(r, 'the File has the number box, empty, with no Remove button', (await page.locator('#waNum').inputValue()) === '' && !(await page.getByRole('button', { name: 'Remove', exact: true }).count()), '');
  // 1. nonsense is refused on the page
  let n0 = await L.nCalls(page);
  await page.locator('#waNum').fill('hello there');
  await page.locator('button', { hasText: 'Save number' }).click(); await L.settle(page, 500);
  check(r, 'something that is not a phone number is refused with words, and nothing is sent', /does not look like a phone number/.test(await L.failText(page)) && !(await L.callsSince(page, n0)).some(c => c.name === 'coach_set_whatsapp'), await L.failText(page));
  // 2. what is typed survives a redraw
  await page.evaluate(() => renderDetailBody()); await L.settle(page, 300);
  check(r, 'what was typed is still in the box after a redraw', (await page.locator('#waNum').inputValue()) === 'hello there', await page.locator('#waNum').inputValue());
  // 3. a real number
  await page.locator('#waNum').fill('  +44 7700   900123 ');
  n0 = await L.nCalls(page);
  await page.locator('button', { hasText: 'Save number' }).click(); await L.settle(page, 900);
  const c1 = lastOf(await L.callsSince(page, n0), c => c.name === 'coach_set_whatsapp');
  check(r, 'one coach_set_whatsapp(ben_test, "+44 7700 900123") with the spaces tidied', !!c1 && c1.payload.p_athlete_id === 'ben_test' && c1.payload.p_whatsapp === '+44 7700 900123', c1 && c1.payload);
  check(r, 'the header shows a WhatsApp button to wa.me and the number', (await page.locator('.dethead a.abtn[href="https://wa.me/447700900123"]').count()) === 1 && /\+44 7700 900123/.test(await head()), await head());
  check(r, 'the record was made by the coach, as a coached athlete, not as a signup', await page.evaluate(() => { const c = window.__DB.hab_contacts.find(x => x.athlete_id === 'ben_test'); return !!c && c.source === 'coach' && c.tier === 'coached'; }), '');
  check(r, 'the box holds the saved number and there is a Remove button', (await page.locator('#waNum').inputValue()) === '+44 7700 900123' && (await page.getByRole('button', { name: 'Remove', exact: true }).count()) === 1, '');
  // 4. it is not a signup anywhere
  check(r, 'it is not a "new signup" reason', await page.evaluate(() => !reasonsOf(S.ath.ben_test).some(x => x.key === 'signup')), '');
  check(r, 'it gives them no Proof tab', !/proof/i.test(await page.locator('.subrail').innerText()), await page.locator('.subrail').innerText());
  await L.go(page, 'proof'); await L.settle(page, 600);
  check(r, 'and it is not in the Proof signup funnel', !/ben_test/.test(await page.locator('#content').innerText()) && /cara_free/.test(await page.locator('#content').innerText()), '');
  // 5. remove it
  await L.go(page, 'a/ben_test/file'); await L.settle(page, 500);
  n0 = await L.nCalls(page);
  await page.getByRole('button', { name: 'Remove', exact: true }).click(); await L.settle(page, 900);
  const c2 = lastOf(await L.callsSince(page, n0), c => c.name === 'coach_set_whatsapp');
  check(r, 'Remove sends an empty number', !!c2 && c2.payload.p_whatsapp === null, c2 && c2.payload);
  check(r, 'the header goes back to "add a WhatsApp number" and the box is empty', /add a WhatsApp number/i.test(await head()) && (await page.locator('#waNum').inputValue()) === '', await head());
  // 6. an Iranian number, and a server without stage62
  await page.locator('#waNum').fill('۰۹۱۲ ۱۲۳ ۴۵۶۷');
  await page.evaluate(() => { window.__STUB.missingRpc = ['coach_set_whatsapp']; });
  await page.locator('button', { hasText: 'Save number' }).click(); await L.settle(page, 700);
  check(r, 'a server that has not had stage62 says so, in words', /coach_set_whatsapp yet/.test(await L.failText(page)) && /stage62/.test(await L.failText(page)), await L.failText(page));
  await page.evaluate(() => { window.__STUB.missingRpc = []; });
  await page.locator('button', { hasText: 'Save number' }).click(); await L.settle(page, 900);
  check(r, 'a number typed with Persian digits is accepted and the button opens the Iranian chat', (await page.locator('.dethead a.abtn[href="https://wa.me/989121234567"]').count()) === 1, await head());
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

// ── Status, the demo out of the totals, and the ⚙ Tools button (audit ROSTER-7, ROSTER-12; pile A10, stage63; 2026-10-11) ────────────────────
const rosterCounts = page => page.evaluate(() => Object.fromEntries(R_FILTERS.map(f => [f.id, Object.values(S.ath).filter(f.test).length])));

S['status-paused-former'] = async (b) => {
  const r = { id: 'status-paused-former', title: 'File → Status: paused and former take an athlete out of Needs you and Gone quiet, former also out of the totals, a note from them still gets through', checks: [] };
  const { page, log, today } = await L.openCoach(b, { hash: 'a/ben_test/file' });
  const FX = require('./fixtures');
  // Give ben_test two reasons to be in front of Amir: a cycle that ended 5 days ago (renew?), and a note he has not read.
  await page.evaluate(([end, d]) => {
    const p = window.__DB.programs.find(x => x.athlete_id === 'ben_test'); p.data.cycles[p.data.currentCycleIndex || 0].endDate = end;
    window.__DB.session_history.push({ athlete_id: 'ben_test', athlete_name: 'Ben Example', day: 1, completed_on: d, status: 'Complete', session_rpe: 7, duration_min: 30, readiness: null,
      day_note: 'Knee felt sore on the last set', focus: 'Day 1', summary: 'Day 1', log: null, coach_status: 'new', updated_at: new Date().toISOString(), hidden_at: null, hidden_by: null });
    return hardRefresh();
  }, [FX.daysAgo(today, 5), FX.daysAgo(today, 1)]);
  await L.settle(page, 900);
  const keys = () => page.evaluate(() => reasonsOf(S.ath.ben_test).map(x => x.key).sort());
  const c0 = await rosterCounts(page);
  const k0 = await keys();
  check(r, 'to begin with they are active, in front of you for a note and a cycle that ended, and the Status panel shows Active pressed', k0.includes('note') && k0.includes('renew') && (await page.locator('.stbtns button[aria-pressed="true"]').innerText()) === 'Active', k0);
  // 1. pause, with a note
  await page.locator('#stNote').fill('  back   in January ');
  let n0 = await L.nCalls(page);
  await page.locator('.stbtns button', { hasText: 'Paused' }).click(); await L.settle(page, 900);
  const c1 = lastOf(await L.callsSince(page, n0), c => c.name === 'coach_set_status');
  check(r, 'one coach_set_status(ben_test, paused, no date, "back in January")', !!c1 && c1.payload.p_athlete_id === 'ben_test' && c1.payload.p_status === 'paused' && c1.payload.p_since === null && c1.payload.p_note === 'back in January', c1 && c1.payload);
  check(r, 'the header carries a Paused chip, and the Paused button is the pressed one', /paused/i.test(await page.locator('.dethead').innerText()) && (await page.locator('.stbtns button[aria-pressed="true"]').innerText()) === 'Paused', await page.locator('.dethead').innerText());
  const k1 = await keys();
  check(r, 'the cycle reason is gone while they are away, the note they sent is not', JSON.stringify(k1) === JSON.stringify(['note']), k1);
  await L.go(page, 'athletes'); await L.settle(page, 500);
  const c2 = await rosterCounts(page);
  check(r, 'the Paused chip counts one, and Everyone and Coached still count them', c2.paused === 1 && c2.all === c0.all && c2.coached === c0.coached, c2);
  const box = (await page.locator('#rosterBox').innerText()).replace(/\s+/g, ' ');
  check(r, 'the row says "Paused since … back in January" and carries the chip', /Paused since .*back in January/.test(box), box.slice(0, 400));
  // 2. their note was read: now nothing at all is asked of Amir for them, and they are in the Paused group, never in Gone quiet
  await page.evaluate(() => { window.__DB.session_history.forEach(s => { if (s.athlete_id === 'ben_test') s.coach_status = 'read'; }); return hardRefresh(); }); await L.settle(page, 900);
  check(r, 'with the note read they have no reason at all, and are not "gone quiet"', await page.evaluate(() => reasonsOf(S.ath.ben_test).length === 0 && !S.ath.ben_test.lapsed), '');
  check(r, 'the roster lists them under a Paused group', /PAUSED\s*1/i.test((await page.locator('#rosterBox .rgroup').allInnerTexts()).join(' ')), await page.locator('#rosterBox .rgroup').allInnerTexts());
  // 3. former: out of the totals, under their own chip
  await L.go(page, 'a/ben_test/file'); await L.settle(page, 500);
  n0 = await L.nCalls(page);
  await page.locator('.stbtns button', { hasText: 'Former' }).click(); await L.settle(page, 900);
  const c3 = lastOf(await L.callsSince(page, n0), c => c.name === 'coach_set_status');
  check(r, 'Former sends status former, keeping the note box as it was', !!c3 && c3.payload.p_status === 'former' && c3.payload.p_note === 'back in January', c3 && c3.payload);
  await L.go(page, 'athletes'); await L.settle(page, 500);
  const c4 = await rosterCounts(page);
  check(r, 'a former athlete is out of Everyone and Coached and has their own chip', c4.former === 1 && c4.paused === 0 && c4.all === c0.all - 1 && c4.coached === c0.coached - 1, c4);
  check(r, 'the footer says one is former and not counted', /1 former, not counted/.test(await page.locator('#content').innerText()), '');
  await page.locator('.rf', { hasText: 'Former' }).click(); await L.settle(page, 300);
  check(r, 'the Former chip lists them', /ben/i.test(await page.locator('#rosterBox').innerText()), await page.locator('#rosterBox').innerText());
  // 4. active again
  await L.go(page, 'a/ben_test/file'); await L.settle(page, 500);
  n0 = await L.nCalls(page);
  await page.locator('.stbtns button', { hasText: 'Active' }).click(); await L.settle(page, 900);
  const c5 = lastOf(await L.callsSince(page, n0), c => c.name === 'coach_set_status');
  check(r, 'Active sends status active and no note, and the row is gone from the server', !!c5 && c5.payload.p_status === 'active' && c5.payload.p_note === null && !(await L.db(page)).athlete_status.some(x => x.athlete_id === 'ben_test'), c5 && c5.payload);
  const k5 = await keys();
  check(r, 'and the reasons come back (the cycle that ended, and nothing else new)', k5.includes('renew'), k5);
  // 5. a server without stage63
  await page.evaluate(() => { window.__STUB.missingRpc = ['coach_set_status']; });
  await page.locator('.stbtns button', { hasText: 'Paused' }).click(); await L.settle(page, 700);
  check(r, 'a server that has not had stage63 says so, in words', /coach_set_status/.test(await L.failText(page)) && /stage63/.test(await L.failText(page)), await L.failText(page));
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

S['roster-demo-out'] = async (b) => {
  const r = { id: 'roster-demo-out', title: 'The public demo and your own identity are not in the roster totals or its chips; the footer says so and links the demo', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'athletes' });
  const c0 = await rosterCounts(page);
  await page.evaluate(() => {
    const D = window.__DB, now = new Date().toISOString();
    ['demo', 'amir_ardekani'].forEach(id => { const prog = JSON.parse(JSON.stringify(D.programs.find(x => x.athlete_id === 'ben_test').data)); prog.athlete = Object.assign({}, prog.athlete, { id, firstName: id === 'demo' ? 'Demo' : 'Amir', lastName: 'Fixture' });
      D.programs.push({ athlete_id: id, data: prog, updated_at: now, updated_by: 'pipeline@example.invalid' }); });
    return hardRefresh();
  });
  await L.settle(page, 900);
  const c1 = await rosterCounts(page);
  check(r, 'two more people with a programme change no count at all', JSON.stringify(c1) === JSON.stringify(c0), { before: c0, after: c1 });
  check(r, 'the tier chips still add up to Everyone', c1.coached + c1.free + c1.proof + c1.nofile === c1.all, c1);
  const rows = (await page.locator('#rosterBox .ath .nm').allInnerTexts()).join(' | ');
  check(r, 'neither is a row on the roster', !/Demo Fixture|Amir Fixture/.test(rows), rows);
  const foot = (await page.locator('#content > p.empty').last().innerText()).replace(/\s+/g, ' ');
  check(r, 'the footer counts the people without them and says the demo is not counted, with a link to open it', new RegExp(c1.all + ' people').test(foot) && /public demo is not counted/.test(foot) && (await page.locator('#content a[href="#a/demo"]').count()) === 1, foot);
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

S['tools-button'] = async (b) => {
  const r = { id: 'tools-button', title: 'The roster starts under the filter chips: Coach tools, Logins to send and Create missing logins sit behind one ⚙ Tools button (360 px phone)', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'athletes' });
  await page.setViewportSize({ width: 360, height: 780 });
  await page.evaluate(() => { window.__DB.athlete_identities = window.__DB.athlete_identities.filter(x => x.athlete_id !== 'ava_test'); return hardRefresh(); });   // a coached athlete with sessions and no login
  await L.settle(page, 900);
  check(r, 'the panel is folded, the button says how many logins wait, and it is not expanded', await page.locator('#toolsPanel').isHidden() && (await page.locator('#toolsBtn .tn').innerText()) === '1' && (await page.locator('#toolsBtn').getAttribute('aria-expanded')) === 'false', await page.locator('#toolsBtn').innerText());
  const top = await page.locator('#rosterBox .ath').first().evaluate(el => Math.round(el.getBoundingClientRect().top));
  check(r, 'the first athlete starts above y = 400 at 360 px (it was about 495 with the tools in the way)', top < 400, top);
  check(r, 'none of the tools is on screen: no Backup button, no Logins to send, no Create missing logins', !(await page.locator('details.tools button', { hasText: 'Backup' }).isVisible()) && !(await page.locator('.creds').isVisible()) && !(await page.locator('button', { hasText: /missing login/ }).isVisible()), '');
  await page.locator('#toolsBtn').click();
  check(r, 'the button opens the panel, and it holds Backup, Logins to send and Create 1 missing login', await page.locator('#toolsPanel').isVisible() && (await page.locator('#toolsBtn').getAttribute('aria-expanded')) === 'true' && await page.locator('details.tools button', { hasText: 'Backup' }).isVisible() && await page.locator('#toolsPanel .creds').isVisible() && await page.locator('#toolsPanel button', { hasText: 'Create 1 missing login' }).isVisible(), await page.locator('#toolsPanel').innerText());
  await page.evaluate(() => renderAthletes());
  check(r, 'it stays open through a redraw', await page.locator('#toolsPanel').isVisible(), '');
  await page.locator('#toolsBtn').click();
  check(r, 'and closes again', await page.locator('#toolsPanel').isHidden(), '');
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
// A redraw used to rebuild the tab from scratch: it wiped the password box and folded Version history, the Coaching log, a day's raw
// log and the live snapshot shut. (The Add past session box it also covered was removed on 2026-10-12.)
S['file-redraw-keeps-work'] = async (b) => {
  const r = { id: 'file-redraw-keeps-work', title: 'A redraw keeps the password box and the sections the coach opened, for that athlete only', checks: [] };
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

  // The work tab: a day's raw log the coach opened stays open through a tab-body redraw and a full one.
  await L.go(page, 'a/ava_test/work');
  await page.evaluate(() => { const d = document.querySelector('.wday .rawlog'); if (d) d.open = true; });
  const rawOpen = () => page.evaluate(() => !!document.querySelector('.wday .rawlog[open]'));
  check(r, 'set-up: a day\'s raw log is open', await rawOpen(), '');
  for (const [name, fn] of [['toggling a day card (a tab-body redraw)', () => toggleWorkDay(2)], ['a full redraw', () => { assemble(); render(); }]]) {
    await page.evaluate(fn); await L.settle(page, 700);
    check(r, name + ': the raw log is still open', await rawOpen(), '');
  }
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

// ── The work tab is this cycle's (2026-10-12; Amir, a day into a new cycle: "all im seeing is his past cycle") ─────────────────────────
S['work-this-cycle'] = async (b) => {
  const r = { id: 'work-this-cycle', title: "The work: a dated cycle's day cards hold only its own sessions; earlier ones are under Earlier cycles", checks: [] };
  const { page, log, today } = await L.openCoach(b, { hash: 'a/ava_test/work' });
  const FX = require('./fixtures');
  const card = n => page.locator('.wday', { hasText: n });
  const top = async n => (await card(n).locator('.wday-top').innerText()).replace(/\s+/g, ' ');
  // An undated cycle (the fixture): every session on the cards and no Earlier cycles, as before.
  check(r, 'an undated cycle: Day 2 shows its session and there is no Earlier cycles', /Complete/.test(await top('Upper Push (fixture)')) && (await page.locator('#earlier-cycles').count()) === 0, await top('Upper Push (fixture)'));
  // The cycle began 2 days ago: Day 1 from yesterday is this cycle's; Day 2 (3 days ago) and the older Day 1 (8 days ago) are the last cycle's.
  await page.evaluate(s => { const p = window.__DB.programs.find(x => x.athlete_id === 'ava_test'); p.data.cycles[0].startDate = s; return hardRefresh(); }, FX.daysAgo(today, 2));
  await L.settle(page, 900);
  check(r, "Day 1 shows this cycle's session", /Complete/.test(await top('Legs First (fixture)')), await top('Legs First (fixture)'));
  check(r, "Day 1 has no picker: last cycle's Day 1 is not one of its sessions", (await card('Legs First (fixture)').locator('.sesspick').count()) === 0, '');
  check(r, 'Day 2 is not logged this cycle (its last session was the previous cycle)', /not logged yet/.test(await top('Upper Push (fixture)')) && /this cycle/.test(await top('Upper Push (fixture)')), await top('Upper Push (fixture)'));
  const earlier = page.locator('#earlier-cycles');
  check(r, 'Earlier cycles lists the two older sessions, folded', (await earlier.count()) === 1 && /Earlier cycles · 2 sessions/i.test(await earlier.locator('summary').first().innerText()) && (await earlier.getAttribute('open')) === null, await earlier.count());
  await earlier.locator('summary').first().click();
  const rows = await earlier.locator(':scope > details.rawlog > summary').allInnerTexts();
  check(r, 'each one dated, with its day, newest first', rows.length === 2 && /Day 2/i.test(rows[0]) && /Day 1/i.test(rows[1]), rows);
  await page.evaluate(() => { assemble(); render(); }); await L.settle(page, 700);
  check(r, 'Earlier cycles stays open through a redraw', (await page.locator('#earlier-cycles').getAttribute('open')) !== null, '');
  const n0 = await L.nCalls(page);
  const first = page.locator('#earlier-cycles > details.rawlog').first();
  await first.locator('summary').click();
  await first.locator('button', { hasText: 'Hide this log' }).click();
  await L.settle(page, 900);
  const hid = (await L.callsSince(page, n0)).filter(x => x.name === 'coach_hide_session').slice(-1)[0];
  check(r, 'Hide this log works from Earlier cycles', !!hid && hid.payload.p_day === 2 && hid.payload.p_completed_on === FX.daysAgo(today, 3) && hid.payload.p_hide === true, hid && hid.payload);
  check(r, 'the work tab has no Add past session box any more', (await page.locator('button', { hasText: 'Add past session' }).count()) === 0 && (await page.locator('#as-paste').count()) === 0, '');
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

// ── The phone's finished-sessions list (program.html _noteFinished(), 2026-10-12): "session not synced" with no email report ─────────
S['sync-finished-list'] = async (b) => {
  const r = { id: 'sync-finished-list', title: "A session on the phone's finished list with no row is a sync warning, email or not", checks: [] };
  const { page, log, today } = await L.openCoach(b, { hash: 'today' });
  const FX = require('./fixtures');
  const keys = () => page.evaluate(() => reasonsOf(S.ath.ava_test).map(x => x.key));
  const gaps = () => page.evaluate(() => S.ath.ava_test.syncGaps.map(g => g.day + '|' + g.on));
  const setList = async list => {
    await page.evaluate(l => { const p = window.__DB.athlete_progress.find(x => x.athlete_id === 'ava_test'); p.data['ava_test_finished'] = JSON.stringify(l); return hardRefresh(); }, list);
    await L.settle(page, 900);
  };
  await setList(['1|' + FX.daysAgo(today, 1), '2|' + FX.daysAgo(today, 3)]);
  check(r, 'every session on the list is on file: no warning', !(await keys()).includes('sync'), await gaps());
  await setList(['1|' + FX.daysAgo(today, 1), '3|' + FX.daysAgo(today, 2)]);
  check(r, 'Day 3 finished on the phone two days ago and not on file: the warning names it', (await keys()).includes('sync') && (await gaps()).join() === '3|' + FX.daysAgo(today, 2), await gaps());
  await setList(['3|' + FX.daysAgo(today, 20)]);
  check(r, 'an entry older than 14 days is not chased', !(await keys()).includes('sync'), await gaps());
  await setList(['3|' + FX.daysAgo(today, 2)]);
  await hideFixture(page, FX.daysAgo(today, 2), false);
  await page.evaluate(([k]) => hideSession('ava_test', 3, k), [FX.daysAgo(today, 2)]); await L.settle(page, 900);
  check(r, 'a hidden session counts as on file', !(await keys()).includes('sync'), await gaps());
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
