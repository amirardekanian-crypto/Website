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
// The File's Danger zone is folded until it is needed (2026-10-12): open it the way the coach would, before touching what is inside it.
const openDanger = async (page) => { await page.evaluate(() => { const d = document.getElementById('dangerzone'); if (d) d.open = true; }); };
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
  const r = { id: 'quest-week', title: 'Proof → start a quest week and end it: the XP already earned is kept (stage55)', checks: [] };
  const { page, today, log } = await L.openCoach(b, { hash: 'proof' });   // the lever moved from Today to Proof (round 2, 2026-10-12)
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
  await page.locator('#questPanel .btn.danger').click();   // End this run today: round 3 of the UX pass, it opens a panel (dangerAsk), nothing is called yet
  await page.locator('#questPanel #dangerGo').waitFor();
  const askTxt = (await page.locator('#questPanel .dangerask').innerText()).replace(/\s+/g, ' ');
  check(r, 'the button only opens a panel under itself: no call yet, the final button is named for the act', !(await L.callsSince(page, n0)).some(x => x.name === 'end_quests') && /End the run today/.test(await page.locator('#dangerGo').innerText()), askTxt);
  await page.locator('#dangerGo').click();
  await L.settle(page, 600);
  const cs = await L.callsSince(page, n0);
  const en = lastOf(cs, x => x.kind === 'rpc' && x.name === 'end_quests');
  check(r, 'end_quests(start, today): the run is ended, not removed', en && en.payload.p_start === today && en.payload.p_end === today && !cs.some(x => x.name === 'clear_quests'), en && en.payload);
  const runs = (await L.db(page)).xp_rules[0].rules.questRuns;
  check(r, 'the run is still on the server with its end day, so nobody loses XP', runs.length === 1 && runs[0].start === today && runs[0].end === today && runs[0].ids.length === 2, runs);
  check(r, 'the panel tells the coach everyone keeps the XP (and no confirm() was used)', /Everyone keeps the XP they already earned/.test(askTxt) && /A quest nobody has completed by tonight never pays/.test(askTxt) && /clear the run in the SQL editor/.test(askTxt) && !log.dialogs.some(d => d.type === 'confirm'), askTxt);
  await L.settle(page, 400);
  const ended = (await page.locator('#questPanel').innerText()).replace(/\s+/g, ' ');
  check(r, 'the panel now says the run ended early and everyone keeps the XP; the End button is gone (the run stays live until tonight, then the picker returns)', /ended early/i.test(ended) && /keeps the XP they already earned/.test(ended) && (await page.locator('#questPanel .btn.danger').count()) === 0, ended.slice(0, 260));
  r.evidence = { dialogs: log.dialogs.map(d => d.message.slice(0, 90)) };
  await page.context().close();
  return r;
};

S['quest-week-end-fails'] = async (b) => {
  const r = { id: 'quest-week-end-fails', title: 'Ending a quest run when stage55 is not applied: nothing changes, and it never falls back to the call that takes the XP back', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'proof' });
  await page.evaluate(() => { const x = window.__DB.xp_rules[0]; x.rules.questRuns = [{ start: new Date().toISOString().slice(0, 10), ids: ['w_water5'] }]; });
  await page.evaluate(() => hardRefresh()); await L.settle(page, 800);
  await page.evaluate(() => { window.__STUB.missingRpc = ['end_quests']; });
  log.dialogs.length = 0;
  const n0 = await L.nCalls(page);
  await page.locator('#questPanel .btn.danger').click();
  await page.locator('#questPanel #dangerGo').click();
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
  const { page } = await L.openCoach(b, { hash: 'intake' });   // the old address: it lands on Leads
  const badge = async () => (await page.locator('#rail a.tab', { hasText: 'Leads' }).innerText()).replace(/\s+/g, ' ');
  const b0 = await badge();
  // (2026-10-12, round 2: the newest new application is on show in the detail, with the buttons; its row in the list says which group it is in.)
  const detail = () => page.locator('.in-detail', { hasText: 'Fixture Applicant One' });
  const grp = () => page.locator('.in-row', { hasText: 'Fixture Applicant One' }).getAttribute('data-st');
  let n0 = await L.nCalls(page);
  await L.jsClick(detail().locator('.intake-act[data-to=handled]'));
  await L.settle(page);
  let c = lastOf(await L.callsSince(page, n0), x => x.name === 'set_intake_status');
  check(r, 'Mark handled → set_intake_status(id, handled)', c && c.payload.p_status === 'handled' && /1a1$/.test(c.payload.p_id), c && c.payload);
  check(r, 'it moves to Handled (and stays on show) and the badge drops', (await grp()) === 'handled' && (await detail().count()) === 1 && (await badge()) !== b0, { grp: await grp(), before: b0, after: await badge() });
  n0 = await L.nCalls(page);
  await L.jsClick(detail().locator('.intake-act[data-to=archived]'));
  await L.settle(page);
  c = lastOf(await L.callsSince(page, n0), x => x.name === 'set_intake_status');
  check(r, 'Archive → archived', c && c.payload.p_status === 'archived' && (await grp()) === 'archived', c && c.payload);
  n0 = await L.nCalls(page);
  await L.jsClick(detail().locator('.intake-act[data-to=new]'));
  await L.settle(page);
  c = lastOf(await L.callsSince(page, n0), x => x.name === 'set_intake_status');
  check(r, 'Reopen → new, badge back', c && c.payload.p_status === 'new' && (await grp()) === 'new' && (await badge()) === b0, { payload: c && c.payload, badge: await badge() });
  await page.evaluate(() => window.__STUB.fail.push({ kind: 'rpc', name: 'set_intake_status', message: 'fixture failure', times: 1 }));
  await L.jsClick(detail().locator('.intake-act[data-to=handled]'));
  await L.settle(page);
  check(r, 'a failed update leaves the application as it was and says so', (await grp()) === 'new' && /Could not update/.test(await L.failText(page)), { grp: await grp(), failBar: await L.failText(page) });
  await page.context().close();
  return r;
};

// ── 12. Affiliates ───────────────────────────────────────────────────────────
S['affiliates'] = async (b) => {
  const r = { id: 'affiliates', title: 'Leads → Referral codes (the old #affiliates address): add a code, retire one, and a refused write', checks: [] };
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
  await page.locator('details.day-c').first().locator('.btn.danger').first().click();   // Delete: opens the panel (dangerAsk); its final button does the work
  await page.locator('details.day-c').first().locator('#dangerGo').click();
  await L.settle(page, 800);
  const del = lastOf(await L.callsSince(page, n0), c => c.name === 'call_logs' && c.op === 'delete');
  check(r, 'delete on call_logs by id', del && del.filters.length === 1 && /^id\.eq\./.test(del.filters[0]), del && del.filters);
  const after = await page.locator('details.day-c').count();
  const txt = await page.locator('#content').innerText();
  check(r, 'the deleted call disappears from the list and the count', after === before - 1 && /old call logs\s*·\s*1/i.test(txt), { before, after, inDb: (await L.db(page)).call_logs.length });
  await page.locator('details.day-c').first().locator('summary').click();
  await page.locator('details.day-c').first().locator('.btn.danger').first().click();
  await page.locator('details.day-c').first().locator('#dangerGo').click();
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
  const tools = (await page.locator('details.tools').evaluate(el => el.textContent)).replace(/\s+/g, ' ');   // textContent: the note's long text sits in the "How this works" fold
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
  const sum = (await page.locator('details.tools > summary').innerText()).replace(/\s+/g, ' ');
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
  const sum2 = (await page.locator('details.tools > summary').innerText()).replace(/\s+/g, ' ');
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
  const credsText = (await page.locator('.creds').evaluate(el => el.textContent)).replace(/\s+/g, ' ');   // textContent: the stage51 sentence is in the panel's "How this works" fold
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
  await openDanger(page);
  const before = await L.db(page);
  const n0 = await L.nCalls(page);
  await page.locator('button', { hasText: /^Delete training history$/ }).click();   // opens the panel (dangerAsk); the final button names the person
  await page.locator('#dangerGo').waitFor();
  const askTxt = (await page.locator('.dangerask').innerText()).replace(/\s+/g, ' ');
  check(r, 'the button only opens a panel: no call yet', !(await L.callsSince(page, n0)).some(c => c.name === 'coach_delete_training_history'), askTxt);
  await page.locator('#dangerGo').click();
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
  check(r, 'the panel says what goes and what stays, and they are still on the roster', /Goes:/.test(askTxt) && /Stays: .*programme.*login/i.test(askTxt) && /cannot be undone, except from a backup file/.test(askTxt) && /Delete Ben Example's training history/.test(askTxt) && onRoster && !log.dialogs.some(x => x.type === 'confirm'), { stillOnRoster: onRoster, panelText: askTxt.slice(0, 400) });
  await page.context().close();
  return r;
};

// The server refuses (or is unreachable, or the sign-in lapsed, or stage48 is not applied): nothing is removed and
// the page says why, in words that fit the cause.
S['athlete-delete-fails'] = async (b) => {
  const r = { id: 'athlete-delete-fails', title: 'Delete training history when the server refuses: nothing goes, and the message fits the cause', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'a/ben_test/file' });
  await openDanger(page);
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
    await page.locator('button', { hasText: /^Delete training history$/ }).click();
    await page.locator('#dangerGo').click();
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

// ── Round 3 of the UX pass (2026-10-12): the long confirm()s and alert()s ─────────────────────────────────────────────────────────────
// Destroying or ending something asks in a panel under its button (dangerAsk: Delete training history, Forget, End the run today, Delete for
// good of a hidden session, Delete of an old call log); something to read or copy once is a notice() line in the fail bar. A short yes/no
// stays a confirm(). The harness records a notice in log.dialogs as an 'alert' with via: 'notice' (lib.js).
S['danger-panels'] = async (b) => {
  const r = { id: 'danger-panels', title: 'The five long confirm()s are panels under their buttons, the long alert()s are notice() lines with Copy, and the demo draws neither', checks: [] };
  const FX = require('./fixtures');
  const { page, log, today } = await L.openCoach(b, { hash: 'a/ben_test/file' });
  const asked = () => page.evaluate(() => (typeof _danger !== 'undefined' && _danger) ? _danger.key : null);
  const ptxt = async () => (await page.locator('.dangerask').innerText()).replace(/\s+/g, ' ');
  const clip = () => page.evaluate(() => navigator.clipboard.readText());
  const ncount = () => page.locator('#failbar .fb-notice').count();
  // One action through the whole life of its panel: it opens under the button and calls nothing; Cancel and Esc close it and call nothing; a
  // redraw keeps it; leaving the screen drops it; the final button makes exactly the old call, once, even when pressed twice.
  async function cycle(name, o) {
    const calls = async n0 => o.calls(await L.callsSince(page, n0));
    await o.back();
    let n0 = await L.nCalls(page);
    const opener = o.opener();
    await opener.click();
    await page.locator('#dangerGo').waitFor();
    const txt = await ptxt();
    const ob = await opener.boundingBox(), pb = await page.locator('.dangerask').boundingBox();
    check(r, `${name}: the button opens one panel right under itself`, (await page.locator('.dangerask').count()) === 1 && !!ob && !!pb && pb.y >= ob.y + ob.height - 1 && pb.y - (ob.y + ob.height) < 150, { ob, pb });
    check(r, `${name}: the final button is named for the act, and Cancel is beside it`, o.final.test((await page.locator('#dangerGo').innerText()).trim()) && (await page.locator('#dangerNo').innerText()).trim() === 'Cancel', await page.locator('#dangerGo').innerText());
    check(r, `${name}: the panel says what goes and what stays, in the old words`, /Goes:/.test(txt) && /Stays:/.test(txt) && o.words.every(re => re.test(txt)), { missing: o.words.filter(re => !re.test(txt)).map(String), txt });
    check(r, `${name}: nothing is called until the final button`, (await calls(n0)).length === 0, '');
    for (const w of [390, 320]) {
      await page.setViewportSize({ width: w, height: 800 }); await L.settle(page, 250);
      const fit = await page.evaluate(() => { const p = document.querySelector('.dangerask').getBoundingClientRect(); return { sw: document.documentElement.scrollWidth, iw: innerWidth, left: Math.round(p.left), right: Math.round(p.right) }; });
      check(r, `${name}: at ${w} px the open panel fits the screen (no sideways scroll)`, fit.sw <= fit.iw && fit.left >= 0 && fit.right <= fit.iw, fit);
    }
    await page.setViewportSize({ width: 1280, height: 900 }); await L.settle(page, 250);
    await page.locator('#dangerNo').click();
    check(r, `${name}: Cancel closes it and calls nothing`, (await page.locator('.dangerask').count()) === 0 && (await asked()) === null && (await calls(n0)).length === 0, '');
    await opener.click(); await page.locator('#dangerGo').waitFor();
    await page.keyboard.press('Escape');
    check(r, `${name}: Esc closes it and calls nothing`, (await page.locator('.dangerask').count()) === 0 && (await asked()) === null && (await calls(n0)).length === 0, '');
    await opener.click(); await page.locator('#dangerGo').waitFor();
    const key = await asked();
    await page.evaluate(o.redraw); await L.settle(page, 400);
    check(r, `${name}: a redraw keeps the open panel where it was`, (await page.locator('.dangerask').count()) === 1 && await page.locator('.dangerask').isVisible() && (await asked()) === key && (await ptxt()) === txt, await asked());
    await L.go(page, 'athletes');
    check(r, `${name}: leaving the screen drops it, and it is not there on coming back`, (await asked()) === null, await asked());
    await o.back();
    check(r, `${name}: ...on coming back there is no panel`, (await page.locator('.dangerask').count()) === 0, '');
    n0 = await L.nCalls(page);
    await o.opener().click(); await page.locator('#dangerGo').waitFor();
    await page.locator('#dangerGo').dblclick(); await L.settle(page, 1300);
    const done = await calls(n0);
    check(r, `${name}: the final button makes the old call, exactly once even when pressed twice`, done.length === 1 && o.payload(done[0]), done.map(c => c.payload || c.filters));
    check(r, `${name}: afterwards the panel is gone`, (await page.locator('.dangerask').count()) === 0 && (await asked()) === null, '');
  }

  // 1. Delete training history (File → Danger zone)
  await cycle('Delete training history', {
    back: async () => { await L.go(page, 'a/ben_test/file'); await openDanger(page); },
    opener: () => page.locator('button', { hasText: /^Delete training history$/ }),
    final: /^Delete Ben Example's training history$/,
    words: [/Delete Ben Example's training history\?/, /every finished session \(the hidden ones too\)/, /It cannot be undone, except from a backup file/, /Stays: Their programme, their login, the coaching log, call logs, Proof contact and wall lines/, /They stay on the roster/, /Erase completely/],
    redraw: () => { assemble(); render(); },
    calls: cs => cs.filter(c => c.kind === 'rpc' && c.name === 'coach_delete_training_history'),
    payload: c => c.payload.p_athlete_id === 'ben_test',
  });
  const d1 = await L.db(page);
  check(r, 'Delete training history: Ben has no sessions left, Ava keeps hers, and the toast says how many went', !d1.session_history.some(x => x.athlete_id === 'ben_test') && d1.session_history.some(x => x.athlete_id === 'ava_test') && /Deleted 2 sessions and the app data/.test(await L.toastText(page)), await L.toastText(page));

  // One panel at a time: the Delete panel's own words say "use Erase completely…", and opening that closes the Delete panel.
  await L.go(page, 'a/ben_test/file'); await openDanger(page);
  await page.locator('button', { hasText: /^Delete training history$/ }).click(); await page.locator('#dangerGo').waitFor();
  await page.locator('button', { hasText: /Erase completely/ }).click(); await page.locator('.erase #eraseIn').waitFor();
  check(r, 'opening Erase completely… closes an open Delete panel: one panel at a time', (await page.locator('.dangerask').count()) === 0 && (await page.locator('.erase').count()) === 1 && (await asked()) === null, '');
  await page.locator('.erase button', { hasText: 'Cancel' }).click(); await L.settle(page, 300);

  // 2. Forget (File → Danger zone, a free signup); a coached athlete is refused in the bar before any panel
  await page.evaluate(() => { window.__DB.hab_contacts.push({ athlete_id: 'ava_test', email: 'ava@example.invalid', whatsapp: '+10000000003', source: 'proof.html', tier: 'free', note: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), display_name: 'Ava' }); return hardRefresh(); });
  await L.settle(page, 900);
  await page.evaluate(() => forgetContact('ava_test'));
  check(r, 'Forget: a coached athlete is refused in the bar and no panel opens', /coached athlete/.test(await L.failText(page)) && (await page.locator('.dangerask').count()) === 0 && (await asked()) === null, await L.failText(page));
  await page.evaluate(() => failDismissAll());
  await cycle('Forget', {
    back: async () => { await L.go(page, 'a/cara_free/file'); await openDanger(page); },
    opener: () => page.locator('#dangerzone button', { hasText: 'Forget their Proof data…' }),
    final: /^Forget Cara/,
    words: [/Forget cara_free\?/, /PERMANENTLY deletes their contact details, their whole habit log and progress, their board place and their roll-call lines/, /no undo and no automatic backup: take a ⤓ Backup first/, /Stays: Their programme, login, session history, titles and season results stay/, /Erase completely/],
    redraw: () => { assemble(); render(); },
    calls: cs => cs.filter(c => c.kind === 'rpc' && c.name === 'forget_contact'),
    payload: c => c.payload.p_athlete_id === 'cara_free',
  });
  check(r, 'Forget: their contact is gone and the toast says so', !(await L.db(page)).hab_contacts.some(c => c.athlete_id === 'cara_free') && /Forgotten/.test(await L.toastText(page)), await L.toastText(page));

  // 3. End this quest run today (Proof → Quest week)
  await page.evaluate(([t]) => { window.__DB.xp_rules[0].rules.questRuns = [{ start: t, ids: ['w_water5', 'w_train3'] }]; return hardRefresh(); }, [today]);
  await L.settle(page, 900);
  await cycle('End this quest run', {
    back: async () => { await L.go(page, 'proof'); },
    opener: () => page.locator('#questPanel .btn.danger', { hasText: 'End this run today' }),
    final: /^End the run today$/,
    words: [/End this quest run today\?/, /The quests stop being offered from tomorrow/, /A quest nobody has completed by tonight never pays/, /Everyone keeps the XP they already earned from it, on the board and in the app/, /clear the run in the SQL editor: QUESTS\.md says how/],
    redraw: () => { render(); },
    calls: cs => cs.filter(c => c.kind === 'rpc' && ['end_quests', 'clear_quests'].includes(c.name)),
    payload: c => c.name === 'end_quests' && c.payload.p_start === today && c.payload.p_end === today,
  });

  // 4. Delete for good of a hidden session (File → Records)
  const hday = FX.daysAgo(today, 5);
  await hideFixture(page, hday, false);
  await page.evaluate(([k]) => hideSession('ava_test', 3, k), [hday]); await L.settle(page, 900);
  if (await page.locator('#undobar .ux').count()) await page.locator('#undobar .ux').click();
  await cycle('Delete for good', {
    back: async () => { await L.go(page, 'a/ava_test/file'); await L.settle(page, 400); },
    opener: () => page.locator('#hidden-sessions button', { hasText: 'Delete for good' }),
    final: /^Delete Day 3 log for good$/,
    words: [/Delete the hidden Day 3 log from \d{4}-\d{2}-\d{2} for good\?/, /This removes it from the database\. It can only come back from a backup file/, /Stays: Their other sessions and the rest of their file/, /If you only want it out of the numbers, leave it hidden/],
    redraw: () => { assemble(); render(); },
    calls: cs => cs.filter(c => c.name === 'session_history' && c.op === 'delete'),
    payload: c => c.filters.length === 4 && c.filters.some(f => /hidden_at/.test(String(f))),
  });
  check(r, 'Delete for good: the hidden row is gone from the database', !(await L.db(page)).session_history.some(x => x.athlete_id === 'ava_test' && x.day === 3 && x.completed_on === hday), '');

  // 5. Delete of an old call log (File → Records, inside the log's fold, which a redraw keeps open)
  await cycle('Delete a call log', {
    back: async () => { await L.go(page, 'a/ava_test/file'); await L.settle(page, 400); await page.locator('details.day-c').first().locator('summary').click(); },
    opener: () => page.locator('details.day-c').first().locator('.btn.danger').first(),
    final: /^Delete this call log$/,
    words: [/Delete the call log from \d{4}-\d{2}-\d{2}\?/, /This permanently removes that weekly check-in\. It cannot be undone/, /Stays: Their other call logs and the rest of their file/],
    redraw: () => { assemble(); render(); },
    calls: cs => cs.filter(c => c.name === 'call_logs' && c.op === 'delete'),
    payload: c => c.filters.length === 1 && /^id\.eq\./.test(c.filters[0]),
  });
  check(r, 'Delete a call log: one of Ava\'s two logs is left', (await L.db(page)).call_logs.filter(c => c.athlete_id === 'ava_test').length === 1, '');

  // ── notice(): a calm line in the fail bar, with Copy ──
  await L.go(page, 'athletes');
  await page.evaluate(() => { failDismissAll(); notice('A first password', 'Password: abc12345XYZ\n\nThe WhatsApp message is copied.', { copy: 'abc12345XYZ' }); });
  const nl = page.locator('#failbar .fb-notice');
  const geo = await page.evaluate(() => { const l = document.querySelector('#failbar .fb-notice'), c = getComputedStyle(l); return { border: c.borderLeftColor, inBar: !!l.closest('#failbar'), barHidden: document.getElementById('failbar').hidden }; });
  check(r, 'a notice is a line in the same bar as the failures: a bold title, the body with its new lines, a Copy button and a ✕', geo.inBar && !geo.barHidden && (await nl.count()) === 1 && /A first password/.test(await nl.locator('.fb-title').innerText()) && /Password: abc12345XYZ/.test(await nl.locator('.fb-body').innerText()) && (await nl.locator('.fb-copy').count()) === 1 && (await nl.locator('.fb-x').count()) === 1, geo);
  check(r, 'its tone is calm: the court green, not the clay of a failure', geo.border === 'rgb(14, 74, 54)', geo.border);
  await nl.locator('.fb-copy').click(); await L.settle(page, 200);
  check(r, 'Copy puts exactly the password on the clipboard and says Copied', (await clip()) === 'abc12345XYZ' && /Copied/.test(await nl.locator('.fb-copy').innerText()), await clip());
  await page.waitForTimeout(2200); await page.evaluate(() => render()); await L.go(page, 'today');
  check(r, 'it stays until ✕: after a pause, a redraw and another screen it is still there', (await ncount()) === 1, await L.failText(page));
  await page.evaluate(() => notice('A first password', 'Password: abc12345XYZ\n\nThe WhatsApp message is copied.', { copy: 'abc12345XYZ' }));
  check(r, 'the same notice twice is one line with a count', (await ncount()) === 1 && /×2/.test(await nl.innerText()), await nl.innerText());
  await page.evaluate(() => fail('A failure at the same time.'));
  check(r, 'a failure beside it is a second line, and Dismiss all appears', (await page.locator('#failbar .fb-line').count()) === 2 && (await page.locator('#failbar .fb-all').count()) === 1 && (await page.locator('#failbar .fb-line:not(.fb-notice)').count()) === 1, await L.failText(page));
  await nl.locator('.fb-x').click();
  check(r, 'the notice\'s ✕ removes just that line', (await ncount()) === 0 && (await page.locator('#failbar .fb-line').count()) === 1, await L.failText(page));
  await page.evaluate(() => failDismissAll());
  // The browser refuses to copy: the text is selected for Ctrl+C instead. And the "Copy failed" notice offers its text selected.
  await page.evaluate(() => Object.defineProperty(navigator.clipboard, 'writeText', { value: () => Promise.reject(new Error('blocked')), configurable: true }));
  await page.evaluate(() => notice('Refused', 'Password: refused987654 and some words.', { copy: 'refused987654' }));
  await nl.locator('.fb-copy').click(); await L.settle(page, 300);
  const sel1 = await page.evaluate(() => String(getSelection()));
  check(r, 'when the browser refuses to copy, exactly the password is selected and the button says so', sel1 === 'refused987654' && /Selected/.test(await nl.locator('.fb-copy').innerText()), { sel1 });
  await page.evaluate(() => failDismissAll());
  await page.evaluate(() => copyText('Plain text 123\nsecond line'));
  await L.settle(page, 300);
  const sel2 = await page.evaluate(() => String(getSelection()));
  check(r, 'a failed Copy in the page is a notice, "Copy failed — here it is:", with the text selected', /^Copy failed — here it is:/.test((await nl.locator('.fb-title').innerText()).trim()) && sel2.replace(/\s+/g, ' ') === 'Plain text 123 second line' && (await nl.locator('.fb-copy').count()) === 0, { sel2 });
  await page.evaluate(() => { delete navigator.clipboard.writeText; failDismissAll(); });

  // ── the notices the long alert()s became ──
  const noticeWords = async () => (await nl.last().locator('.fb-msg').innerText()).replace(/\s+/g, ' ').trim();
  // a password the server could not store (athlete): the only place it is shown
  await L.go(page, 'a/eli_new/file'); await page.evaluate(() => failDismissAll());
  await page.evaluate(() => { const o = sb.functions.invoke.bind(sb.functions); sb.functions.invoke = async (n, a) => { const x = await o(n, a); if (x && x.data && /^(athlete|tps)-login$/.test(n) && !/many/.test(a.body.action)) x.data = Object.assign({}, x.data, { warning: 'the password works, but it was not stored for Logins to send (fixture): copy it now' }); return x; }; });
  await page.locator('#athPw').fill('');
  await page.locator('.pwform .btn.primary').click(); await L.settle(page, 900);
  const pw1 = ((await L.db(page)).athlete_identities.find(x => x.athlete_id === 'eli_new') || {}).initial_password;
  const t1 = await noticeWords();
  check(r, 'athlete password the server could not store: a warning notice with the old words, the password and the WhatsApp line', (await ncount()) === 1 && /Password reset for eli_new, but the password works, but it was not stored for Logins to send \(fixture\): copy it now\./.test(t1) && t1.includes('Password: ' + pw1) && /The WhatsApp message is copied to your clipboard\./.test(t1) && (await nl.evaluate(el => el.classList.contains('warn'))), t1);
  for (const w of [390, 320]) {
    await page.setViewportSize({ width: w, height: 800 }); await L.settle(page, 250);
    const fit = await page.evaluate(() => { const q = document.getElementById('failbar').getBoundingClientRect(); return { sw: document.documentElement.scrollWidth, iw: innerWidth, left: Math.round(q.left), right: Math.round(q.right) }; });
    check(r, `...at ${w} px the notice fits the screen (no sideways scroll), Copy still in view`, fit.sw <= fit.iw && fit.left >= 0 && fit.right <= fit.iw && await nl.locator('.fb-copy').isVisible(), fit);
  }
  await page.setViewportSize({ width: 1280, height: 900 }); await L.settle(page, 250);
  await nl.locator('.fb-copy').click(); await L.settle(page, 200);
  check(r, '...and its Copy puts the password (not the message) on the clipboard', !!pw1 && (await clip()) === pw1, await clip());
  await page.evaluate(() => render()); await L.settle(page, 300);
  check(r, '...it survives a redraw and goes with ✕', (await ncount()) === 1 && await (async () => { await nl.locator('.fb-x').click(); return (await ncount()) === 0; })(), '');
  // a buyer's password the server could not store
  await L.go(page, 'buyers'); await L.settle(page, 500);
  await page.locator('#tpUser').fill('warn_buyer'); await page.locator('#tpCreate').click(); await L.settle(page, 900);
  const pw2 = ((await L.db(page)).tps_accounts.find(x => x.username === 'warn_buyer') || {}).initial_password;
  const t2 = await noticeWords();
  check(r, 'buyer password the server could not store: a warning notice with the password, the Farsi message line and the warning', (await ncount()) === 1 && /Login created for warn_buyer/.test(t2) && t2.includes('Password: ' + pw2) && /The Farsi WhatsApp message is copied to your clipboard\./.test(t2) && /⚠ the password works, but it was not stored/.test(t2), t2);
  await nl.locator('.fb-copy').click(); await L.settle(page, 200);
  check(r, '...and its Copy puts the password on the clipboard', !!pw2 && (await clip()) === pw2, await clip());
  await page.evaluate(() => failDismissAll());
  // the bulk logins result: the old words, in the warning tone when some failed
  await L.go(page, 'athletes');
  await page.evaluate(() => { window.__DB.athlete_identities = window.__DB.athlete_identities.filter(x => x.athlete_id !== 'ava_test'); return hardRefresh(); });
  await L.settle(page, 900);
  check(r, 'bulk logins: Ava now needs one', await page.evaluate(() => athletesNeedingLogin().includes('ava_test')), await page.evaluate(() => athletesNeedingLogin()));
  await page.evaluate(() => { const o = sb.functions.invoke.bind(sb.functions); sb.functions.invoke = async (n, a) => (n === 'athlete-login' && a.body.action === 'create_many') ? { data: { created: 1, failed: [{ athlete_id: 'x_fail', error: 'fixture boom' }], skipped: ['y_skip'] }, error: null } : o(n, a); });
  await page.evaluate(() => bulkCreateLogins()); await L.settle(page, 700);
  const t3 = await noticeWords();
  check(r, 'bulk logins: "1 login created.", who already had one, who failed and why, in the warning tone', /^1 login created\. Already had a login, left as it was: y_skip 1 failed: x_fail: fixture boom$/.test(t3) && (await nl.last().evaluate(el => el.classList.contains('warn'))), t3);
  await page.evaluate(() => failDismissAll());
  // Add coaching logs: nothing to add, then added
  const addLogs = async name => {
    await openTools(page);
    const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.locator('#toolsPanel button', { hasText: 'Add coaching logs' }).click()]);
    await fc.setFiles([{ name, mimeType: 'text/markdown', buffer: Buffer.from('# Fixture log\n') }]); await L.settle(page, 900);
  };
  await addLogs('ava_test.md');
  const t4 = await noticeWords();
  check(r, 'Add coaching logs with nothing new: "Nothing to add." and who is already on the server', /^Nothing to add\. Already on the server \(left exactly as they are\): ava_test$/.test(t4), t4);
  await page.evaluate(() => failDismissAll());
  await addLogs('eli_new.md');
  const t5 = await noticeWords();
  check(r, 'Add coaching logs that adds one: "Added 1 of 1." and the log is on the server', /^Added 1 of 1\.$/.test(t5) && (await L.db(page)).coaching_logs.some(x => x.athlete_id === 'eli_new'), t5);
  await page.evaluate(() => failDismissAll());
  // Library publish with a skipped file
  await L.go(page, 'links');
  const [fc2] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: /\+ Publish workout/ }).click()]);
  await fc2.setFiles([{ name: 'good-one.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ id: 'good-one', title: 'Good One', duration: '10 min', category: 'strength' })) },
    { name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{ not json') }]);
  await L.settle(page, 900);
  const t6 = await noticeWords();
  check(r, 'Library publish with a skipped file: "Published 1." and what was skipped', /^Published 1\. Skipped: broken\.json: not valid JSON$/.test(t6), t6);
  await page.evaluate(() => failDismissAll());
  // the backup summary: calm, with the rows per table folded; an INCOMPLETE one in the warning tone, its warning first
  await takeBackup(page, 'dp-complete');
  const bn = page.locator('#failbar .fb-notice:not(.warn)');
  check(r, 'the backup summary is a notice: "Backup downloaded — N rows across M tables.", keep a copy, and the rows per table folded under it', (await bn.count()) === 1 && /^Backup downloaded — [\d,]+ rows across \d+ tables\./.test((await bn.locator('.fb-title').innerText()).trim()) && /Keep a copy somewhere that is not this computer/.test(await bn.innerText()) && (await bn.locator('details.fb-more').getAttribute('open')) === null && /programs: \d+/.test(await bn.locator('details.fb-more').evaluate(el => el.textContent)), await bn.innerText());
  await page.evaluate(() => failDismissAll());
  await page.evaluate(() => window.__STUB.fail.push({ kind: 'from', name: 'hab_intake', op: 'select', message: 'fixture: cannot read hab_intake', times: 1 }));
  await takeBackup(page, 'dp-incomplete');
  const wn = page.locator('#failbar .fb-notice.warn');
  const wt = (await wn.innerText()).replace(/\s+/g, ' ');
  check(r, 'an INCOMPLETE backup is a notice in the warning tone that opens with the warning, says it is not a restore point and names what could not be read', (await wn.count()) === 1 && /^⚠ INCOMPLETE backup — saved as aa-backup-INCOMPLETE-/.test(wt) && /NOT a restore point/.test(wt) && /hab_intake: fixture: cannot read hab_intake/.test(wt), wt);
  await page.evaluate(() => failDismissAll());
  // none of the five long confirms, and no alert() or prompt() at all, anywhere above
  const real = log.dialogs.filter(d => d.via === undefined);
  check(r, 'no alert() or prompt() fired anywhere above', !real.some(d => d.type !== 'confirm'), real.map(d => d.type + ': ' + d.message.slice(0, 50)));
  check(r, 'the only confirm()s were the short ones that stay (create logins, add coaching logs, publish)', real.every(d => /^(Create logins for|Add \d+ new coaching log|Publish \d+ )/.test(d.message)), real.map(d => d.message.slice(0, 50)));
  check(r, 'notices are recorded for the harness with via: notice', log.dialogs.filter(d => d.via === 'notice').length >= 8, log.dialogs.filter(d => d.via === 'notice').length);
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();

  // ── the demo draws the slots and opens none ──
  const dctx = await b.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'UTC' });
  const dp = await dctx.newPage();
  const derr = [];
  dp.on('pageerror', e => derr.push(String(e && e.message || e)));
  dp.on('dialog', d => { derr.push('dialog: ' + d.type()); d.dismiss().catch(() => {}); });
  await dp.route('**/*', route => route.request().url().startsWith(L.BASE) ? route.continue() : route.fulfill({ status: 204, body: '' }));
  await dp.goto(L.BASE + '/coach.html?demo=1');
  await dp.waitForFunction(() => document.querySelector('#rail a.tab') && !document.querySelector('#content .loading'), null, { timeout: 15000 });
  await dp.waitForTimeout(500);
  const dId = await dp.evaluate(() => Object.keys(S.ath).find(k => k !== 'demo') || Object.keys(S.ath)[0]);
  await dp.evaluate(h => { location.hash = h; }, 'a/' + dId + '/file'); await dp.waitForTimeout(700);
  await dp.evaluate(() => { const d = document.getElementById('dangerzone'); if (d) d.open = true; });
  const slots = await dp.locator('#dangerzone .dangerslot').count();
  await dp.evaluate(id => { deleteAthlete(id); forgetContact(id); endQuestRun('2026-01-01'); deleteHiddenSession(id, 1, '2026-01-01'); deleteCallLog('x', id, '2026-01-01'); }, dId);
  check(r, 'demo: the File draws the Danger zone with its slot, and none of the five opens a panel or a dialog (the demo saves nothing)', slots >= 1 && (await dp.locator('.dangerask').count()) === 0 && (await dp.evaluate(() => _danger)) === null && !derr.length, { slots, derr });
  await dctx.close();
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
  await L.go(page, 'a/zed_erase/file'); await openDanger(page);
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
  check(r, 'it says what stays: backups, the inbox, and that the partner record stays with only its link removed', /weekly backup files/.test(text) && /inbox/.test(text) && /FIXTURE10 stays under Leads, in Referral codes/.test(text), text.slice(-420));
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
  await L.go(page, 'a/zed_erase/file'); await openDanger(page);
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
  await L.go(page, 'athletes'); await L.go(page, 'a/zed_erase/file'); await openDanger(page);
  check(r, 'an open panel does not follow the coach to another screen', (await page.locator('.erase').count()) === 0, '');
  await L.go(page, 'a/amir_ardekani/file'); await openDanger(page);
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
  await L.go(page, 'a/zed_erase/file'); await openDanger(page);
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
  await L.go(page, 'a/zed_erase/file'); await openDanger(page);
  await page.locator('button', { hasText: /Erase completely/ }).click();
  await page.locator('.erase #eraseIn').waitFor();
  let t = await erasePanelText(page);
  const waRow = page.locator('.erase .pick', { hasText: 'same WhatsApp number' });
  check(r, 'the form that carries a number another athlete\'s contact also has is offered, flagged, and NOT ticked for you; the email form is ticked',
    (await waRow.count()) === 1 && !(await waRow.locator('input').isChecked()) && /also another athlete's/i.test(await waRow.innerText()) && /not ticked for you/.test(await page.locator('.erase').innerText())
    && await page.locator('.erase .pick', { hasText: 'same email' }).locator('input').isChecked(), t.slice(0, 900));
  const others = (await L.db(page)).hab_intake.length - 3;   // every form except the three the panel offers
  check(r, 'the panel says one form will go, by name, and the finder lists how many others there are', /1 intake form will be erased with them/.test(t) && /Z\. E\./.test(t) && new RegExp(others + ' other forms in Leads').test(t), t.slice(0, 1100) + ' | others=' + others);
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
  await L.go(page, 'a/uno_erase/file'); await openDanger(page);
  await page.locator('button', { hasText: /Erase completely/ }).click();
  await page.locator('.erase #eraseIn').waitFor();
  t = await erasePanelText(page);
  check(r, 'one offered form: the words are "1 intake form may be theirs…" (no plural slip), and it is ticked', /1 intake form may be theirs/.test(t) && /1 intake form will be erased with them/.test(t) && !/carryes/.test(t), t.slice(0, 700));
  await page.locator('.erase button', { hasText: 'Cancel' }).click();

  // an athlete with no login and no form: the alert does not claim a sign-in account, and says that no form went
  await seedBare(page, 'nolo_erase', 'Nolo', 'Erase');
  await page.evaluate(() => hardRefresh()); await L.settle(page, 900);
  await L.go(page, 'a/nolo_erase/file'); await openDanger(page);
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
  await det.locator('.credrow', { hasText: 'revoked_course' }).locator('.tp-manage').click();   // Erase… waits behind Manage
  await det.locator('.credrow', { hasText: 'revoked_course' }).locator('.tp-erase').click();
  await page.locator('.erase #eraseIn').waitFor({ state: 'visible', timeout: 5000 });
  check(r, 'Erase… on a revoked course buyer: the panel is VISIBLE', await page.locator('.erase').isVisible() && await page.locator('#eraseIn').isVisible(), '');
  await page.evaluate(() => render());
  check(r, '...and still visible after the page redraws (the section stays open)', await page.locator('.erase').isVisible() && (await det.getAttribute('open')) !== null, '');
  await page.locator('.erase button', { hasText: 'Cancel' }).click();
  await L.go(page, 'assess');
  const det2 = page.locator('details', { has: page.locator('summary', { hasText: /Revoked/ }) });
  await det2.locator('summary').click();
  await det2.locator('.credrow', { hasText: 'revoked_academy' }).locator('.as-manage').click();
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
  await L.go(page, 'a/zed_erase/file'); await openDanger(page);
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
  await L.go(page, 'a/ben_test/file'); await openDanger(page);
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
  await L.go(page, 'a/zed_erase/file'); await openDanger(page);
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
  await L.go(page, 'a/zed_erase/file'); await openDanger(page);
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
  await row.locator('.tp-manage').click();
  await row.locator('.tp-erase').click();
  await page.locator('.erase #eraseIn').waitFor();
  const rpc0 = (await L.callsSince(page, n0)).filter(c => c.kind === 'rpc' && c.name === 'coach_erase_person');
  check(r, 'Erase… on a course buyer makes one dry-run call keyed on the username', rpc0.length === 1 && JSON.stringify(rpc0[0].payload) === JSON.stringify({ p_kind: 'course', p_key: 'fixture_buyer' }), rpc0.map(c => c.payload));
  check(r, 'while the Erase panel is open, Manage stays open with Erase… in view (also after a redraw)', await (async () => { const ok = async () => (await row.locator('.tp-manage').getAttribute('aria-expanded')) === 'true' && await row.locator('.tp-erase').isVisible(); const a = await ok(); await page.evaluate(() => render()); return a && await ok(); })(), '');
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
  await row.locator('.as-manage').click();
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
  await page.locator('.credrow .tp-manage').click();   // Erase… waits behind Manage
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
  await page.locator('.credrow .tp-manage').click();   // Erase… waits behind Manage
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
  check(r, 'seven steps: refused with the reason, nothing sent (a line in the fail bar since round 3, not a pop-up)', log.dialogs.length === 1 && log.dialogs[0].via === 'bar' && /7 steps: 6 at most/.test(log.dialogs[0].message) && /Nothing was saved/.test(log.dialogs[0].message) && !spineRpcs(await L.callsSince(page, n0)).length, log.dialogs.map(x => x.message));
  // a step of 141 characters
  log.dialogs.length = 0;
  await box.fill('Short step.\n' + 'x'.repeat(141));
  n0 = await L.nCalls(page);
  await page.locator('.sp-save').first().click(); await L.settle(page, 400);
  check(r, 'a step over 140 characters: refused, naming the step, nothing sent (a fail-bar line)', log.dialogs.length === 1 && log.dialogs[0].via === 'bar' && /Step 2 of How to do it is 141 characters/.test(log.dialogs[0].message) && /Nothing was saved/.test(log.dialogs[0].message) && !spineRpcs(await L.callsSince(page, n0)).length, log.dialogs.map(x => x.message));
  check(r, 'the hint under the box says it will not save', /will not save/.test(await page.locator('[data-steps-hint]').innerText()), await page.locator('[data-steps-hint]').innerText());
  // the Farsi How to do it has the same limits and the same answer: a fail-bar line, nothing sent (round 3 turned the third pop-up into a line too)
  log.dialogs.length = 0;
  await box.fill('Short step.');
  await page.evaluate(() => { document.querySelector('textarea[data-sf=steps_fa]').value = ['یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت'].map(x => 'گام ' + x).join('\n'); });
  n0 = await L.nCalls(page);
  await page.locator('.sp-save').first().click(); await L.settle(page, 400);
  check(r, 'seven Farsi steps: refused with the reason in a fail-bar line, nothing sent', log.dialogs.length === 1 && log.dialogs[0].via === 'bar' && /The Farsi How to do it has 7 steps: 6 at most/.test(log.dialogs[0].message) && /Nothing was saved/.test(log.dialogs[0].message) && !spineRpcs(await L.callsSince(page, n0)).length, log.dialogs.map(x => x.message));
  await page.evaluate(() => { document.querySelector('textarea[data-sf=steps_fa]').value = ''; });
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
  await L.go(page, 'exercises/coverage');   // the counts are on the Coverage sub-tab, as tiles
  const cov = await page.locator('#content').innerText();
  check(r, "the page says how many entries have a draft from Claude to read", /1\s+With Claude’s draft to read/.test(cov), cov.slice(0, 500));
  await L.go(page, 'exercises');
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
  // The six groups are folded behind "Change pill" (round 3, 2026-10-12): open them the way the coach would. They stay open for the rest of this editor.
  await ed.locator('.pp-toggle').click();
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
  await L.go(page, 'exercises/qualities'); await L.settle(page, 900);   // the Quality check is on the Qualities sub-tab
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
  // 2. the Exercises tab, Coverage sub-tab
  await L.go(page, 'exercises/coverage'); await L.settle(page, 900);
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
  const r = { id: 'today-small-truths', title: 'Today: a blank exercise note is no note, a line from tomorrow says so, and the line box says what it strips', checks: [] };   // the wall column is #proofToday since round 2
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
  const wall = (await page.locator('#proofToday').innerText()).replace(/\s+/g, ' ');
  check(r, 'a line filed under tomorrow (an athlete whose clock is ahead) says "Tomorrow, their time", not a bare date', /Tomorrow, their time/i.test(wall) && /Early riser line/.test(wall), wall);
  const wallHow = ((await page.locator('#proofToday #how-wall').evaluate(el => el.textContent)) || '').replace(/\s+/g, ' ');   // the strip warning is in the composer's "How this works" fold
  check(r, 'the line box says that quotes, < > and backslashes are removed and line breaks become spaces', /Quotes, < > and backslashes are removed when you post, and line breaks become spaces/.test(wallHow) && /characters are removed/.test(wall), wallHow);
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

// ── Explain once (round 3 of the coach UX pass, 2026-10-12) ───────────────────────────────────────────────────────────
// A panel shows ONE short hint line (plain words, about 15 at most, no em-dash); the longer text stays, word for word, in a "How this works" fold at the
// end of the panel (<details class="how">, shut until it is opened). The hints carry data-hint, the folds an id (how-…). A warning next to a destructive
// action is not a hint and keeps its words (the Erase panel, the Danger zone, the confirms).
S['hints-once'] = async (b) => {
  const r = { id: 'hints-once', title: 'Explain once: every panel shows one short hint line at 1440 px and keeps its long text in a "How this works" fold (Tools, Logins to send, Referral codes, Buyers, Proof, Free signups, Today, the work tab, Qualities, Coverage)', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'athletes' });
  await page.setViewportSize({ width: 1440, height: 900 });
  // How many lines of text a hint takes up: text nodes only (a button inside the hint is not text), rects within 4 px of each other are one line.
  const linesOf = sel => page.evaluate(s => {
    const el = document.querySelector(s);
    if (!el) return -1;
    const tops = [];
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      if (!n.textContent.trim() || (n.parentElement && n.parentElement.closest('button'))) continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      for (const rc of rg.getClientRects()) { if (rc.width > 0.5 && !tops.some(t => Math.abs(t - rc.top) < 4)) tops.push(rc.top); }
    }
    return tops.length;
  }, sel);
  const hintText = sel => page.evaluate(s => { const el = document.querySelector(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : null; }, sel);
  const foldInfo = id => page.evaluate(i => {
    const el = document.getElementById(i);
    return el ? { tag: el.tagName, cls: el.className, open: el.open === true, summary: (el.querySelector('summary') || {}).textContent || '', text: el.textContent.replace(/\s+/g, ' ') } : null;
  }, id);
  // One panel: its hint is a single line of at most 15 words with no em-dash, and its fold holds each original phrase word for word.
  const panel = async (what, hintSel, foldId, phrases) => {
    const t = await hintText(hintSel), n = await linesOf(hintSel);
    check(r, `${what}: the hint is on the page`, t != null && t.length > 0, t);
    check(r, `${what}: the hint is one line at 1440 px`, n === 1, { lines: n, text: t });
    check(r, `${what}: at most 15 words and no em-dash`, t != null && t.split(' ').length <= 15 && !/—/.test(t), t);
    const f = await foldInfo(foldId);
    check(r, `${what}: a shut "How this works" fold at the end`, !!f && f.tag === 'DETAILS' && /\bhow\b/.test(f.cls) && !f.open && /How this works/.test(f.summary), f && { tag: f.tag, cls: f.cls, open: f.open, summary: f.summary });
    check(r, `${what}: the fold holds the original words`, !!f && phrases.every(p => f.text.includes(p)), { missing: f ? phrases.filter(p => !f.text.includes(p)) : phrases });
  };

  // 1. The work tab. The logs warning first (before the athlete's logs are read once), then the Personal records note.
  await page.evaluate(() => window.__STUB.fail.push({ kind: 'from', name: 'session_history', op: 'select', message: 'fixture: logs unavailable', times: 1 }));
  await L.go(page, 'a/ava_test/work'); await L.settle(page, 700);
  const warn = ((await hintText('#tabbody .loadwarn')) || '');
  check(r, 'work tab: the session-logs warning is still said in full', /Their session logs did not load\./.test(warn) && /not because they skipped the work/.test(warn) && /fixture: logs unavailable/.test(warn), warn);
  check(r, 'work tab: and it takes two lines at most at 1440 px', (await linesOf('#tabbody .loadwarn')) >= 1 && (await linesOf('#tabbody .loadwarn')) <= 2, await linesOf('#tabbody .loadwarn'));
  await page.evaluate(() => {
    const row = window.__DB.programs.find(p => p.athlete_id === 'ava_test');
    const d = JSON.parse(JSON.stringify(row.data));
    d.workouts.days[0].blocks[1].exercises[0].test = '3RM';
    row.data = d; row.updated_at = new Date(Date.now() + 1000).toISOString();
  });
  await page.evaluate(() => reloadPrograms().then(render)); await L.settle(page, 700);
  await L.go(page, 'athletes'); await L.go(page, 'a/ava_test/work'); await L.settle(page, 700);
  await panel('work tab, Personal records', '[data-hint=prs]', 'how-prs', ['Estimated one-rep maxes, worked out from their logged sets or entered after a test.', 'They own the record — this is read-only.']);
  const stripSubs = await page.evaluate(() => [...document.querySelectorAll('.mstrip .mp-s')].map(e => e.textContent.trim()));
  check(r, 'work tab: the metric strip\'s sub-lines were already short and are unchanged (each under 8 words)', stripSubs.length === 3 && stripSubs.every(s => s.split(' ').length < 8), stripSubs);
  check(r, 'work tab: Earlier cycles and the Live app snapshot are folded rows, not paragraphs of intro', await page.evaluate(() => [...document.querySelectorAll('#earlier-cycles > summary, #livesnap > summary')].every(s => s.textContent.trim().split(/\s+/).length <= 10)), '');

  // 2. The ⚙ Tools panel: the Coach tools note and the Logins to send paragraph.
  await L.go(page, 'athletes');
  await openTools(page);
  await panel('Tools, Coach tools', '#toolsPanel [data-hint=tools]', 'how-tools', ['New athletes and new cycles go up through the pipeline (publish_cycle); there is no upload button.', 'Back up weekly: the free plan keeps no backups. Keep the last 12 files, on this computer and off it, and delete older ones (the privacy notice promises about three months).', 'The way back is written down and rehearsed: scripts/restore/README.md in the repo.']);
  await panel('Tools, Logins to send', '#toolsPanel [data-hint=creds]', 'how-creds', ['Copy each one and send it on WhatsApp, then mark it sent. A password is stored here only until you do, or until the person signs in with it: the database then clears it by itself (stage51) and they drop out of this list.', 'After that the only way to see one again is a reset.', 'Signed in with it can only show for a moment, or for one stored before stage51.']);
  await page.locator('#toolsBtn').click(); await L.settle(page, 150);

  // 3. Leads → Referral codes: the intro, the deal, and the new-code form's hint.
  await L.go(page, 'leads/codes'); await L.settle(page, 500);
  await panel('Referral codes, intro', '[data-hint=aff]', 'how-aff', ['These are the codes both apply forms accept. Add or retire one and it takes effect straight away — no deploy.', 'The deal: the client gets the code\'s % off; the coach earns 10% of what the client actually pays — first payment and every renewal. Payout details stay in the application email (Gmail, subject:(Affiliate)).']);
  const deal = await hintText('[data-hint=aff-deal]');
  check(r, 'Referral codes, the deal: one short line, no em-dash', deal != null && (await linesOf('[data-hint=aff-deal]')) === 1 && deal.split(' ').length <= 15 && !/—/.test(deal), deal);
  await page.locator('#affAdd').click(); await L.settle(page, 300);
  await panel('Referral codes, the new-code form', '[data-hint=aff-new]', 'how-aff-new', ['Convention is NAME10 — uppercase letters and digits, no spaces. Payout / card details stay in the application email, never here.']);

  // 4. Buyers, both tabs: the intro, the New login hint (the long password text is in the fold).
  await L.go(page, 'buyers'); await L.settle(page, 700);
  await panel('Buyers, Course', '[data-hint=buyers]', 'how-buyers', ['Logins for the Tennis Performance System course (Level 2),', 'One login per buyer.', 'Creates the account and copies a Farsi WhatsApp message with the link, username, password and install steps.', 'Password: 8+ characters, English letters, numbers and symbols, no spaces. Leave it empty to generate one.']);
  const bn = await hintText('[data-hint=buyers-new]');
  check(r, 'Buyers, Course: the New login hint is one short line', bn != null && (await linesOf('[data-hint=buyers-new]')) === 1 && bn.split(' ').length <= 15 && !/—/.test(bn), bn);
  await L.go(page, 'buyers/testing'); await L.settle(page, 700);
  await panel('Buyers, Testing app', '[data-hint=buyers]', 'how-buyers', ['Logins for the tennis testing app,', 'One login per buyer; an academy\'s coaches share it.', 'Creates the account and copies a Farsi WhatsApp message with the link, username and password.', 'Password: 8+ characters, English letters, numbers and symbols, no spaces. Leave it empty to generate one.']);

  // 5. Proof: the board's subtitle (the time and Reload stay), the Season paragraph, the wall composer.
  await L.go(page, 'proof'); await L.settle(page, 900);
  await panel('Proof, the board', '#boardPanel [data-hint=board]', 'how-board', ['Scored by the server — exactly what the crew sees in the app.']);
  const bt = await hintText('#boardPanel [data-hint=board]');
  check(r, 'Proof, the board: "As of hh:mm." and Reload are still in the hint', /^As of \d\d:\d\d\./.test(bt || '') && (await page.locator('#boardPanel [data-hint=board] button', { hasText: 'Reload' }).count()) === 1, bt);
  await panel('Proof, Season', '[data-hint=season]', 'how-season', ['Starting or closing a season stays in the Supabase SQL editor on purpose — it resets every score. See XP_SYSTEM.md.']);
  await panel('Proof, the wall composer', '#wallPanel [data-hint=wall]', 'how-wall', ['Pinned on today\'s wall. Quotes, < > and backslashes are removed when you post, and line breaks become spaces.']);
  check(r, 'Proof, the wall composer: the visible hint still says that characters are removed (the reason a typed quote disappears)', /removed/.test((await hintText('#wallPanel [data-hint=wall]')) || ''), await hintText('#wallPanel [data-hint=wall]'));

  // 6. Leads → Free signups: the funnel's intro.
  await L.go(page, 'leads/signups'); await L.settle(page, 600);
  await panel('Free signups, the funnel', '#funnelPanel [data-hint=funnel]', 'how-funnel', ['Free signups from proof.html — days logged is the qualifying signal.', '+ days on the free tier = worth a WhatsApp.']);
  const fh = await hintText('#funnelPanel [data-hint=funnel]'), ff = await foldInfo('how-funnel');
  check(r, 'Free signups: when some have never logged a day, the hint says how many of how many and the fold says what to do about it', !/have never logged a day/.test(ff.text) || (/^\d+ of \d+ have never logged a day\.$/.test(fh) && /they need a first-day nudge, not a pitch\./.test(ff.text)), { fh, fold: ff.text.slice(0, 300) });

  // 7. Today: the same composer in the short Proof column.
  await L.go(page, 'today'); await L.settle(page, 500);
  await panel('Today, the wall composer', '#proofToday [data-hint=wall]', 'how-wall', ['Pinned on today\'s wall. Quotes, < > and backslashes are removed when you post, and line breaks become spaces.']);
  check(r, 'Today: only one composer and one fold on the page', (await page.locator('#coachLineInput').count()) === 1 && (await page.locator('#how-wall').count()) === 1, '');

  // 8. Exercises: Qualities and Coverage.
  await L.go(page, 'exercises/qualities'); await L.settle(page, 700);
  await panel('Qualities, The ten qualities', '[data-hint=qm]', 'qm-how', ['What each day card on Home says it builds. A quality reaches a phone only when it is approved and the day\'s exercises carry it.']);
  await panel('Qualities, Quality check', '[data-hint=qc]', 'qc-how', ['For each athlete: what their current week trains most, in working sets a week']);

  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();

  // 9. Coverage: the "Cards that show something else on a phone" hint (a draft twin of an approved entry, as in spine-phone-view).
  const c2 = await L.openCoach(b, { hash: 'athletes' });
  await c2.page.setViewportSize({ width: 1440, height: 900 });
  await c2.page.evaluate(() => {
    const now = new Date().toISOString();
    const E = (id, name, status) => ({ id, name, aliases: [], pattern: 'isolation', qualities: ['strength'], purpose: 'Fixture.', tennis: null, cues: { good: ['Fixture cue'], bad: [] },
      equipment: [], loads: [], easier: [], harder: [], alts: [], video: null, status, updated_at: now, updated_by: 'coach', impact: 'none', muscles: null });
    window.__DB.exercises.splice(0, window.__DB.exercises.length, E('seated-leg-curl', 'Seated Leg Curl', 'approved'), E('machine-seated-leg-curl', 'Machine Seated Leg Curl', 'draft'));
    window.__DB.exercise_coach.splice(0, window.__DB.exercise_coach.length);
    const row = window.__DB.programs.find(p => p.athlete_id === 'ava_test');
    const d = JSON.parse(JSON.stringify(row.data));
    d.workouts.days = [{ id: 1, focusTag: 'Legs First (fixture)', blocks: [{ icon: '💪', title: 'Primary', exercises: [{ name: 'Machine Seated Leg Curl', exId: 'machine-seated-leg-curl', type: 'standard', rx: { sets: 3, reps: 10, rpe: 7 } }] }] }, { id: 2, focusTag: 'Upper Push (fixture)', blocks: [] }, { id: 3, focusTag: 'Pull Day (fixture)', blocks: [] }];
    row.data = d; row.updated_at = new Date(Date.now() + 1000).toISOString();
  });
  await c2.page.evaluate(() => { S.spine = null; return reloadPrograms(); });
  await L.go(c2.page, 'exercises/coverage'); await L.settle(c2.page, 900);
  // `panel` closes over the first page, so this one is checked inline.
  const cd = await c2.page.evaluate(() => {
    const el = document.querySelector('[data-hint=cov-differ]'), f = document.getElementById('cov-differ-how');
    return { hint: el ? el.textContent.replace(/\s+/g, ' ').trim() : null, fold: f ? { open: f.open, text: f.textContent.replace(/\s+/g, ' '), summary: (f.querySelector('summary') || {}).textContent } : null };
  });
  check(r, 'Coverage, Cards that show something else: the hint is at most 15 words with no em-dash', cd.hint != null && cd.hint.split(' ').length <= 15 && !/—/.test(cd.hint), cd.hint);
  check(r, 'Coverage, Cards that show something else: a shut fold holds the original paragraph', !!cd.fold && !cd.fold.open && /How this works/.test(cd.fold.summary) && cd.fold.text.includes('These cards find a draft here, so on a phone they show nothing (a card that names its entry shows that entry or nothing) or, with no entry named, the closest approved one.'), cd.fold);
  const cl = await c2.page.evaluate(() => { const el = document.querySelector('[data-hint=cov-differ]'); if (!el) return -1; const tops = []; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const rg = document.createRange(); rg.selectNodeContents(n); for (const rc of rg.getClientRects()) if (rc.width > 0.5 && !tops.some(t => Math.abs(t - rc.top) < 4)) tops.push(rc.top); } return tops.length; });
  check(r, 'Coverage, Cards that show something else: one line at 1440 px', cl === 1, cl);
  check(r, 'no page errors (Coverage)', !c2.log.errors.length, c2.log.errors);
  await c2.page.context().close();
  return r;
};

// ── The look, round 3 of the UX pass (2026-10-12): the rules the whole page follows, measured on the demo screens ──────────────────
// Five font sizes, three radii, typefaces with jobs, capitals only on column heads and group labels, ONE fold, a neutral Free chip, one button
// height, and no font, colour, radius or shadow typed into a template (the demo has every screen filled in, and nothing in it is real).
S['design-rules'] = async (b) => {
  const r = { id: 'design-rules', title: 'The look: five font sizes, three radii, Barlow Condensed only on the brand and the athlete\'s name, Space Mono and capitals only where they have a job, one fold, a neutral Free chip, one button height, no styling typed into a template', checks: [] };
  // Where a face or a case is allowed. Space Mono: numbers that line up or must be exact. Capitals: column heads and group labels.
  const MONO_OK = '.aff-code, .mic .count, .qx, .cmp-rx, .cmp-rx *, .cmp-did, .cmp-did *, .rx-editor input, .rx-editor select, .credpass, #athPw, [class*="-pwin"], #eraseIn, .pw-secret, .elog-body, .xp small, .pr-v, .pr-v *, td.num, .fb-sel, code, .rpe-set';
  const UP_OK = '.eyebrow, .rhead, .rgroup, .cmp-head, .cmp-grp-t, .qm-head, .in-gh, .in-h, .wallday .d, th, .brand, .gate h1, .gate .mark, .dethead h2, input.uc';
  const COND_OK = '.brand, .gate h1, .gate .mark, .dethead h2';
  const SCREENS = [
    ['today', 'today'], ['today with Tools open', 'today', async p => { await p.click('#toolsBtn'); await p.waitForTimeout(300); }],
    ['athletes', 'athletes'], ['an athlete (the work)', 'a/demo_ana'], ['an athlete, charts open', 'a/demo_ana', async p => { await p.click('#chartsBtn'); await p.waitForTimeout(300); }],
    ['an athlete (the file)', 'a/demo_ana/file'], ['a free athlete', 'a/demo_kian'],
    ['exercises', 'exercises'], ['exercises, an entry open', 'exercises', async p => { const row = await p.$('.spine-row'); if (row) { await row.click(); await p.waitForTimeout(500); } }],
    ['qualities', 'exercises/qualities'], ['coverage', 'exercises/coverage'],
    ['proof', 'proof'], ['leads', 'leads'], ['free signups', 'leads/signups'], ['referral codes', 'leads/codes'], ['library', 'links'], ['buyers', 'buyers'], ['testing app', 'buyers/testing'],
  ];
  const sizeBad = [], radiusBad = [], condBad = [], monoBad = [], upBad = [], foldBad = [], btnBad = [], primaryBad = [], freeChips = [], plumDots = [], errs = [];
  let seen = 0;
  for (const vw of [1440, 390]) {
    const ctx = await b.newContext({ viewport: { width: vw, height: 900 }, timezoneId: 'UTC' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errs.push(String(e && e.message || e)));
    await page.route('**/*', route => route.request().url().startsWith(L.BASE) ? route.continue() : route.fulfill({ status: 204, body: '' }));
    await page.goto(L.BASE + '/coach.html?demo=1#today');
    await page.waitForFunction(() => document.querySelector('#rail a.tab') && !document.querySelector('#content .loading'), null, { timeout: 15000 });
    for (const [name, hash, act] of SCREENS) {
      await page.evaluate(h => { if (document.getElementById('toolsPanel') && !document.getElementById('toolsPanel').hidden) document.getElementById('toolsBtn').click(); location.hash = h; }, hash);
      await page.waitForTimeout(600);
      if (act) { try { await act(page); } catch (e) { errs.push(name + ': ' + e.message); } }
      const res = await page.evaluate(({ MONO_OK, UP_OK, COND_OK, vw }) => {
        const out = { size: [], radius: [], cond: [], mono: [], up: [], fold: [], btn: [], primary: [], free: [], dots: [], n: 0 };
        const SIZES = [12, 14, 17, 22, 30];
        const desc = el => (el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).join('.') : '')).slice(0, 56) + ' "' + (el.textContent || '').trim().slice(0, 18) + '"';
        const shown = el => { const cs = getComputedStyle(el), q = el.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && q.width > 0 && q.height > 0; };
        for (const el of document.querySelectorAll('#app *')) {
          if (el.closest('svg') || el.tagName === 'OPTION' || el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || !shown(el)) continue;
          out.n++;
          const cs = getComputedStyle(el);
          const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
          const field = (el.tagName === 'INPUT' && !['checkbox', 'radio', 'hidden', 'range'].includes(el.type)) || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT';
          if (own || field) {
            const fs = parseFloat(cs.fontSize);
            if (!SIZES.includes(fs) && !(fs === 16 && field && vw < 900)) out.size.push(desc(el) + ' ' + cs.fontSize);
            const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
            if (fam === 'Barlow Condensed' && !el.closest(COND_OK)) out.cond.push(desc(el));
            if (fam === 'Space Mono' && !el.closest(MONO_OK)) out.mono.push(desc(el));
            if (cs.textTransform === 'uppercase' && !el.closest(UP_OK)) out.up.push(desc(el));
          }
          const isChk = el.tagName === 'INPUT' && ['checkbox', 'radio'].includes(el.type);
          if (!isChk) {
            for (const k of ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius']) {
              const v = cs[k];
              if (!v || v === '0px') continue;
              const bad = v.split(' ').some(t => { const n = parseFloat(t); return t.endsWith('%') ? false : !(n === 8 || n === 12 || n >= 999); });
              if (bad) { out.radius.push(desc(el) + ' ' + k + ' ' + v); break; }
            }
          }
          if (el.matches('.btn:not(.mp-more), .abtn, .modbtn, .tbtn')) {
            const h = Math.round(el.getBoundingClientRect().height);
            if (Math.abs(h - 32) > 1) out.btn.push(desc(el) + ' ' + h + 'px');
          }
          if (el.matches('details > summary')) {
            const p = getComputedStyle(el, '::before');
            if (!(p.content && p.content !== 'none' && p.content !== 'normal' && p.borderRightWidth === '2px' && p.transform !== 'none' && p.width === '8px')) out.fold.push(desc(el));
          }
          if (el.matches('.chip') && /^free$/i.test(el.textContent.trim())) out.free.push({ bg: cs.backgroundColor, color: cs.color });
          if (el.matches('.need .dot.ochre')) out.dots.push(desc(el));
        }
        // at most one primary button per panel (a row's own primary, in a login or a credential row, is that row's)
        for (const sec of document.querySelectorAll('.panel')) {
          if (!shown(sec)) continue;
          const n = [...sec.querySelectorAll('.btn.primary')].filter(x => shown(x) && !x.closest('.credrow, .pwform, .fun, .hidrow')).length;
          if (n > 1) out.primary.push(desc(sec) + ' has ' + n);
        }
        return out;
      }, { MONO_OK, UP_OK, COND_OK, vw });
      seen += res.n;
      const tag = s => vw + ' px · ' + name + ' · ' + s;
      res.size.forEach(s => sizeBad.push(tag(s))); res.radius.forEach(s => radiusBad.push(tag(s))); res.cond.forEach(s => condBad.push(tag(s)));
      res.mono.forEach(s => monoBad.push(tag(s))); res.up.forEach(s => upBad.push(tag(s))); res.fold.forEach(s => foldBad.push(tag(s)));
      res.btn.forEach(s => btnBad.push(tag(s))); res.primary.forEach(s => primaryBad.push(tag(s))); res.dots.forEach(s => plumDots.push(tag(s)));
      res.free.forEach(f => freeChips.push(f));
    }
    await ctx.close();
  }
  const uniq = a => [...new Set(a)].slice(0, 12);
  check(r, 'the screens were measured (a few thousand elements)', seen > 3000, seen);
  check(r, 'every font size is 12, 14, 17, 22 or 30 (16 only on a form field below 900 px)', sizeBad.length === 0, uniq(sizeBad));
  check(r, 'every corner is 0, 8, 12 or a pill (999 or 50%)', radiusBad.length === 0, uniq(radiusBad));
  check(r, 'Barlow Condensed is on the brand and the athlete\'s name, and nowhere else', condBad.length === 0, uniq(condBad));
  check(r, 'Space Mono is only on numbers that line up or must be exact (the allow-list), never on a date, a fact or a label', monoBad.length === 0, uniq(monoBad));
  check(r, 'capitals are only on column heads and group labels (the allow-list)', upBad.length === 0, uniq(upBad));
  check(r, 'every <details> summary has the shared chevron on its left', foldBad.length === 0, uniq(foldBad));
  check(r, 'every button is 32 px high with a mouse', btnBad.length === 0, uniq(btnBad));
  check(r, 'a panel shows at most one primary button', primaryBad.length === 0, uniq(primaryBad));
  const PLUM = ['rgb(122, 78, 110)', 'rgba(122, 78, 110, 0.12)'];
  check(r, 'the Free tier is a neutral outline chip: found, and neither its fill nor its text is plum', freeChips.length >= 2 && freeChips.every(f => !PLUM.includes(f.bg) && !PLUM.includes(f.color) && f.bg === 'rgba(0, 0, 0, 0)'), freeChips.slice(0, 4));
  check(r, 'a Needs-you dot that is not a warning is grey, not plum', plumDots.length === 0, uniq(plumDots));
  // Nothing typed into a template: a font, a colour, a radius or a shadow is a class next to its component's CSS (a width or a margin may stay).
  const src = await (await fetch(L.BASE + '/coach.html')).text();
  const typed = (src.match(/style="[^"]*"/g) || []).filter(s => /font-size|font-family|border-radius|box-shadow|text-transform|letter-spacing|(^|[;"])\s*color\s*:/.test(s));
  check(r, 'no font, colour, radius or shadow is typed into a template as a style attribute', typed.length === 0, typed.slice(0, 8));
  check(r, 'no page errors', errs.length === 0, errs.slice(0, 5));
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
  const r = { id: 'quest-run-window', title: 'Proof → the live quest run and its last day are the app\'s: latest-starting run, clipped where the next one starts', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'proof' });
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
  // (the quest lever is on Proof since round 2, so the week is started where the board is: the redraw that follows reads the board again)
  await page.locator('#questPanel input[type=checkbox]').first().check();
  n0 = await L.nCalls(page);
  await page.locator('#questStartBtn').click();
  await L.settle(page, 900);
  check(r, 'after a quest week starts the board is read again (its XP moved)', (await boardCalls(n0)) === 1, await boardCalls(n0));
  n0 = await L.nCalls(page);
  await L.go(page, 'today'); await L.go(page, 'proof'); await L.settle(page, 500);
  check(r, 'and then it is kept again: leaving and coming back reads nothing', (await boardCalls(n0)) === 0, await boardCalls(n0));
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

// ── Proof is the community's home (round 2 of the coach.html redesign, 2026-10-12) ───────────────────────────────────────────────────
// Running the crew used to be split: the wall, the quest lever and the pulse on Today, the board, titles, season and the signup funnel on Proof.
// Now Proof holds all of it, Today keeps a short Proof column that links to it, and body weight (which comes from the training app, not from
// Proof) moved from the athlete's Proof sub-tab to The work, folded under one header line.
S['proof-home'] = async (b) => {
  const r = { id: 'proof-home', title: 'Proof holds the whole crew (wall, quest lever, pulse, board, titles, season); the signup funnel is on Leads → Free signups, not here; Today keeps a short Proof column that links to it; body weight is on The work', checks: [] };
  const { page, log, today } = await L.openCoach(b, {});
  const txt = async sel => (await page.locator(sel).innerText()).replace(/\s+/g, ' ').trim();
  const dayOf = n => page.evaluate(n => addDays(todayKey(), n), n);
  const ids = () => page.evaluate(() => ['coachLineInput', 'wallPanel', 'questPanel', 'pulsePanel', 'proofToday', 'boardPanel', 'funnelPanel'].reduce((o, id) => { o[id] = document.querySelectorAll('#' + id).length; return o; }, {}));
  const overflow = () => page.evaluate(() => ({ over: document.documentElement.scrollWidth - innerWidth, wide: [...document.querySelectorAll('#content *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1).slice(0, 4).map(el => el.tagName + '.' + el.className) }));
  const post = async (sel, text) => { await page.locator(sel + ' #coachLineInput').fill(text); const n0 = await L.nCalls(page); await page.locator(sel + ' .mic .row .btn.primary').click(); await L.settle(page, 700); return lastOf(await L.callsSince(page, n0), c => c.kind === 'rpc' && c.name === 'set_coach_note'); };

  // 1. Today's Proof column: one panel, the composer, today's lines, a quest line, a drifting line; none of the full panels
  let n = await ids();
  check(r, 'Today: one #coachLineInput and one #proofToday, and none of the full wall, quest lever or pulse (#wallPanel, #questPanel, #pulsePanel)', n.coachLineInput === 1 && n.proofToday === 1 && !n.wallPanel && !n.questPanel && !n.pulsePanel, n);
  let col = await txt('#proofToday');
  check(r, 'it holds the composer and only TODAY\'s lines: Ava\'s line (with Hide) is there, yesterday\'s (Cara\'s, the coach\'s) are not', (await page.locator('#proofToday .mic textarea').count()) === 1 && /Fixture wall line from Ava/.test(col) && (await page.locator('#proofToday .wline .modbtn').count()) === 1 && !/Fixture wall line from Cara/.test(col) && !/Fixture coach line yesterday/.test(col), col);
  const linkTexts = () => page.evaluate(() => [...document.querySelectorAll('#proofToday a')].map(a => ({ t: a.textContent.replace(/\s+/g, ' ').trim(), h: a.getAttribute('href') })));
  let lk = await linkTexts();
  check(r, 'three links, all to Proof: the earlier lines, the quest line (nothing live: start one on Proof) and who is drifting (Dan, silent 5 days)', lk.length === 3 && lk.every(x => x.h === '#proof') && lk[0].t === 'Earlier lines on Proof →' && lk[1].t === 'No quest week live · start one on Proof →' && lk[2].t === 'Drifting: Dan 5 d →', lk);
  // a live run: "Quest week · day 3 of 7 · 2 quests · ends <weekday>"
  await page.evaluate(async d => { window.__DB.xp_rules[0].rules.questRuns = [{ start: d, ids: ['w_water5', 'w_train3'] }]; await refetch(['rules']); }, await dayOf(-2));
  const dow = await page.evaluate(() => DOWS[pDate(addDays(todayKey(), 4)).getDay()]);
  lk = await linkTexts();
  check(r, 'a live run reads "Quest week · day 3 of 7 · 2 quests · ends <weekday>" and opens Proof', lk[1] && lk[1].t === `Quest week · day 3 of 7 · 2 quests · ends ${dow} →` && lk[1].h === '#proof', lk[1]);
  // drifting: most silent first, four names at most, then "+ N more"; nothing at all when nobody drifts
  await page.evaluate(() => {
    const mk = (id, name, gap) => { S.ath[id] = { id, name, tier: 'free', isHab: true, habGap: gap, habDays: {}, habLast: null, habToday: false, hab7: 0, reasons: [], toReply: 0, needReplyStale: 0, needReplyRecent: [], needReplySessions: [], onBoard: false }; };
    mk('zz_c', 'Cy', 7); mk('zz_a', 'Ann', 9); mk('zz_e', 'Ed', 3); mk('zz_b', 'Bo', 8); mk('zz_d', 'Di', 6); render();
  });
  check(r, 'drifting lists the most silent first, four names at most, then "+ 2 more" (Dan 5 d and Ed 3 d)', (await txt('#proofToday .ptline.drift')) === 'Drifting: Ann 9 d, Bo 8 d, Cy 7 d, Di 6 d, + 2 more →', await txt('#proofToday .ptline.drift'));
  await page.evaluate(() => { Object.keys(S.ath).filter(k => k.startsWith('zz_')).forEach(k => delete S.ath[k]); S.ath.dan_proof.habGap = 0; render(); });
  check(r, 'when nobody has been silent for 3 days there is no drifting line (and no empty part)', (await page.locator('#proofToday .ptline.drift').count()) === 0 && (await page.locator('#proofToday .pt').count()) === 3, await page.locator('#proofToday .pt').count());
  await page.evaluate(() => { S.ath.dan_proof.habGap = 5; render(); });
  // the counters: "on court" opens Proof (the pulse is there), "wall lines today" scrolls to Today's column
  await page.locator('.board .counter').nth(1).click(); await L.settle(page, 300);
  check(r, 'the "wall lines today" counter stays on Today and scrolls to the Proof column', (await page.evaluate(() => location.hash)) !== '#proof' && (await page.locator('#proofToday').count()) === 1, await page.evaluate(() => location.hash));
  // posting from Today
  let up = await post('#proofToday', 'Line from Today');
  check(r, 'posting from Today works: set_coach_note with the local day, and Take it down is offered', up && up.payload.p_body === 'Line from Today' && up.payload.p_day === today && (await page.locator('#proofToday .mic .btn.danger').count()) === 1, up && up.payload);

  // 2. Proof: the whole crew, two columns
  await page.locator('.board .counter').nth(0).click(); await L.settle(page, 600);
  check(r, 'the "on court today" counter opens Proof', (await page.evaluate(() => location.hash)) === '#proof' && (await page.locator('#wallPanel').count()) === 1, await page.evaluate(() => location.hash));
  n = await ids();
  check(r, 'Proof: one #coachLineInput; the wall, quest lever, pulse and board once each; the funnel is NOT here (it is Leads → Free signups); Today\'s column is gone', n.coachLineInput === 1 && n.wallPanel === 1 && n.questPanel === 1 && n.pulsePanel === 1 && n.boardPanel === 1 && n.funnelPanel === 0 && !n.proofToday, n);
  const geo = await page.evaluate(() => {
    const by = t => [...document.querySelectorAll('#content .panel')].find(p => (p.querySelector('.phead .t') || {}).textContent === t);
    const P = { wall: by('The wall'), board: by('The board'), quest: by('Quest week'), pulse: by('Proof pulse'), titles: by('Titles minted'), season: by('Season') };
    const missing = Object.keys(P).filter(k => !P[k]);
    if (missing.length) return { missing };
    const R = {}; Object.keys(P).forEach(k => { const q = P[k].getBoundingClientRect(); R[k] = { l: Math.round(q.left), t: Math.round(q.top + scrollY), w: Math.round(q.width) }; });
    return R;
  });
  const colsOk = !geo.missing && geo.wall.l === geo.board.l && geo.wall.t < geo.board.t
    && ['pulse', 'titles', 'season'].every(k => geo[k].l === geo.quest.l) && geo.quest.l > geo.wall.l + geo.wall.w - 1
    && geo.quest.t < geo.pulse.t && geo.pulse.t < geo.titles.t && geo.titles.t < geo.season.t && Math.abs(geo.wall.t - geo.quest.t) < 3;
  check(r, 'two columns: The wall then The board on the left; Quest week, Proof pulse, Titles minted and Season (last) on the right, level at the top', colsOk, geo);
  check(r, 'the left column is the wider one (about 1.3 to 1)', !geo.missing && geo.wall.w / geo.quest.w > 1.2 && geo.wall.w / geo.quest.w < 1.4, geo.missing || [geo.wall.w, geo.quest.w]);
  const wallTxt = await txt('#wallPanel');
  check(r, 'the full wall: the composer holds the line posted from Today; yesterday\'s lines (the crew\'s with Hide, and yours) are here; Show the full week', (await page.locator('#wallPanel #coachLineInput').inputValue()) === 'Line from Today' && /Fixture wall line from Cara/.test(wallTxt) && /Fixture coach line yesterday/.test(wallTxt) && (await page.locator('#wallPanel .modbtn').count()) === 2 && /Show the full week/.test(wallTxt), wallTxt);
  await page.evaluate(async d => { window.__DB.hab_notes.push({ athlete_id: 'dan_proof', day: d, body: 'Five days back line', pct: 40, hidden: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }); await refetch(['notes']); }, await dayOf(-5));
  check(r, 'a line from five days ago is not in the two-day view', !/Five days back line/.test(await txt('#wallPanel')), '');
  await page.locator('#wallPanel .showweek').click(); await L.settle(page, 400);
  const wk = await txt('#wallPanel');
  check(r, 'Show the full week lists it, says last 7 days and offers Show less', /Five days back line/.test(wk) && /last 7 days/.test(wk) && /Show less/.test(wk), wk);
  await page.locator('#wallPanel .showweek').click(); await L.settle(page, 400);
  check(r, 'Show less puts it back', !/Five days back line/.test(await txt('#wallPanel')) && /last 2 days/.test(await txt('#wallPanel')), '');
  // the quest lever, with the live run set in step 1: the run and End this run today (never the picker)
  const qTxt = await txt('#questPanel');
  check(r, 'Quest week shows the live run (Day 3/7, both quests) with End this run today, and no picker', /Live run/i.test(qTxt) && /Day 3\/7/i.test(qTxt) && /FIXTURE WELL/.test(qTxt) && /FIXTURE SHOW-UP/.test(qTxt) && (await page.locator('#questPanel .btn.danger', { hasText: 'End this run today' }).count()) === 1 && (await page.locator('#questPanel input[type=checkbox]').count()) === 0, qTxt);
  await page.evaluate(async () => { window.__DB.xp_rules[0].rules.questRuns = []; await refetch(['rules']); });
  const pick = page.locator('#questPanel input[type=checkbox]');
  const startDisabled = () => page.locator('#questStartBtn').isDisabled();
  check(r, 'with no run live: the picker (3 quests) and Start the week, switched off until one is ticked', (await pick.count()) === 3 && (await startDisabled()), await pick.count());
  await pick.nth(0).check();
  check(r, 'ticking one switches Start the week on, and a redraw keeps the tick', !(await startDisabled()) && (await page.evaluate(() => { render(); return document.querySelectorAll('#questPanel input:checked').length; })) === 1, '');
  await L.settle(page, 300);
  check(r, 'after the redraw Start the week is still on (questPickCount runs after the panel is drawn)', !(await startDisabled()), '');
  await page.evaluate(() => { document.querySelectorAll('#questPanel input:checked').forEach(i => { i.checked = false; }); questPickCount(); });
  // the pulse, titles, season; the funnel is on Leads → Free signups now
  const pulse = await page.evaluate(() => [...document.querySelectorAll('#pulsePanel .pulse')].map(x => x.innerText.replace(/\s+/g, ' ').trim()));
  check(r, 'Proof pulse lists every Proof athlete, most silent first (Dan, 5d silent, on top)', pulse.length === 3 && /^Dan/.test(pulse[0]) && /5d silent/.test(pulse[0]), pulse);
  const rest = await txt('#content');
  check(r, 'Titles minted and Season are on Proof, and The funnel is not', /FIXTURE TITLE/.test(rest) && /Fixture Season/.test(rest) && !/The funnel/.test(rest), '');
  await L.go(page, 'leads/signups');
  const fn = await page.evaluate(() => { const h = funnelPanelHtml(); return { section: /^\s*<section[^>]*id="funnelPanel"/.test(h), head: /The funnel/.test(h), rows: document.querySelectorAll('#funnelPanel .fun').length, acts: [...document.querySelectorAll('#funnelPanel .fun')].map(f => f.querySelector('.acts').innerText.replace(/\s+/g, ' ').trim()) }; });
  check(r, 'The funnel (Leads → Free signups) comes from funnelPanelHtml() (one self-contained section) and keeps WhatsApp, copy email and open on each row', fn.section && fn.head && fn.rows === 2 && fn.acts.every(a => /WhatsApp/.test(a) && /copy email/.test(a) && /open/.test(a)), fn);
  await L.go(page, 'proof');

  // 3. posting and hiding from Proof; a redraw never blanks the page to "Fetching the board…" once the board is held
  await page.evaluate(() => { window.__sawFetching = false; const c = document.getElementById('content'); new MutationObserver(() => { if (c.innerText.includes('Fetching the board')) window.__sawFetching = true; }).observe(c, { childList: true, subtree: true, characterData: true }); });
  up = await post('#wallPanel', 'Line from Proof');
  check(r, 'posting from Proof works: set_coach_note with the local day, one composer, and the composer shows the line', up && up.payload.p_body === 'Line from Proof' && up.payload.p_day === today && (await ids()).coachLineInput === 1 && (await page.locator('#wallPanel #coachLineInput').inputValue()) === 'Line from Proof', up && up.payload);
  const n1 = await L.nCalls(page);
  await page.locator('#wallPanel .wline', { hasText: 'Fixture wall line from Cara.' }).locator('.modbtn').click(); await L.settle(page, 700);
  const hide = lastOf(await L.callsSince(page, n1), c => c.kind === 'rpc' && c.name === 'hide_note');
  check(r, 'hiding a line from Proof works: hide_note(cara_free, yesterday, true), and the line redraws greyed with Show', hide && hide.payload.p_athlete_id === 'cara_free' && hide.payload.p_day === await dayOf(-1) && hide.payload.p_hidden === true && (await page.locator('#wallPanel .wline.hid .modbtn', { hasText: 'Show' }).count()) === 1, hide && hide.payload);
  const sync = await page.evaluate(() => { render(); return { spinner: document.getElementById('content').innerText.includes('Fetching the board'), rows: document.querySelectorAll('#boardPanel .lbrow').length, asOf: /As of \d\d:\d\d/.test(document.getElementById('boardPanel').innerText) }; });
  check(r, 'a redraw draws the held board AT ONCE: no "Fetching the board…" at any moment of the post, the hide or a render(), and the board rows and its time are there', !sync.spinner && sync.rows >= 1 && sync.asOf && (await page.evaluate(() => window.__sawFetching)) === false, { sync, saw: await page.evaluate(() => window.__sawFetching) });
  // a real first read waits inside the board's own panel only
  await page.evaluate(() => { resetBoard(); window.__STUB.delay.leaderboard_top = 1200; render(); });
  const first = await page.evaluate(() => ({ board: document.getElementById('boardPanel').innerText.replace(/\s+/g, ' '), mic: !!document.querySelector('#wallPanel .mic'), quest: !!document.getElementById('questPanel'), pulse: document.querySelectorAll('#pulsePanel .pulse').length }));
  check(r, 'a real first read shows "Fetching the board…" in the board\'s own panel only, with the wall, quest lever and pulse already on screen', /Fetching the board/.test(first.board) && first.mic && first.quest && first.pulse === 3, first);
  await L.settle(page, 1700);
  await page.evaluate(() => { window.__STUB.delay.leaderboard_top = 0; });
  check(r, 'and the rows arrive in that panel with their time', !/Fetching/.test(await txt('#boardPanel')) && /As of \d\d:\d\d/.test(await txt('#boardPanel')) && (await page.locator('#boardPanel .lbrow').count()) >= 1, await txt('#boardPanel'));
  // going back to Today: the composer there shows the line posted from Proof, and only one composer is in the page
  await L.go(page, 'today');
  n = await ids();
  check(r, 'back on Today: the composer shows the line posted from Proof, and there is still one #coachLineInput', n.coachLineInput === 1 && (await page.locator('#proofToday #coachLineInput').inputValue()) === 'Line from Proof', n);

  // 4. no sideways scroll on Today or Proof at 390 and 320
  for (const w of [390, 320]) {
    await page.setViewportSize({ width: w, height: 844 });
    for (const h of ['today', 'proof']) { await L.go(page, h); await L.settle(page, 250); const o = await overflow(); check(r, `${h === 'today' ? 'Today' : 'Proof'} at ${w} px: no sideways scroll`, o.over <= 0, o); }
  }
  await page.setViewportSize({ width: 1280, height: 900 });

  // 5. body weight: on The work, one compact panel with the chart folded; gone from the athlete's Proof sub-tab; absent with no reading
  await page.evaluate(() => {
    const row = window.__DB.athlete_progress.find(p => p.athlete_id === 'ava_test');
    const wt = {};
    for (let i = 0; i < 40; i++) wt[addDays(todayKey(), -i)] = { kg: i === 0 ? 64.7 : Math.round((64.7 + i * 0.08) * 10) / 10, t: Date.now() - i * 86400000 };
    row.data.ava_test_hab_wt = JSON.stringify(wt);
    row.data.ava_test_1rm = [{ lift: 'Goblet Squat', kg: 40, w: 30, r: 5, rpe: 8, d: addDays(todayKey(), -3), t: Date.now() }];
    return refetch(['prog']);
  });
  await L.go(page, 'a/ava_test/work'); await L.settle(page, 500);
  const wt = await page.evaluate(() => {
    const d = document.getElementById('wtdet'), box = document.getElementById('tabbody');
    const pos = (a, c) => !!(a && c && (a.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING));
    return d ? { n: document.querySelectorAll('#wtdet').length, inWork: box.contains(d), open: d.open, head: d.querySelector('summary').textContent.replace(/\s+/g, ' ').trim(),
      afterPr: pos(document.querySelector('.prlist'), d), beforeCards: pos(d, document.querySelector('.wday')), svgShown: !!d.querySelector('.chart-svg') && d.querySelector('.chart-svg').checkVisibility() } : null;
  });
  check(r, 'The work: ONE #wtdet panel, shut, after the Personal records panel and before the day cards', !!wt && wt.n === 1 && wt.inWork && !wt.open && wt.afterPr && wt.beforeCards, wt);
  check(r, 'its header line reads "Body weight · 64.7 kg · today · −x.x kg over 30 days · −x.x over 90" (the app\'s own numbers)', !!wt && /^Body weight · 64\.7 kg · today · −\d\.\d kg over 30 days · −\d\.\d over 90$/.test(wt.head), wt && wt.head);
  check(r, 'the chart is not on screen until it is opened', !!wt && wt.svgShown === false, wt);
  await page.locator('#wtdet summary').click(); await L.settle(page, 200);
  const opened = () => page.evaluate(() => { const d = document.getElementById('wtdet'); return { open: !!d && d.open, svg: !!d && !!d.querySelector('.chart-svg') && d.querySelector('.chart-svg').checkVisibility(), w: d ? Math.round(d.querySelector('.chart-svg').getBoundingClientRect().width) : 0 }; });
  const o1 = await opened();
  check(r, 'a tap on the header opens it and shows the chart (not wider than 520 px)', o1.open && o1.svg && o1.w <= 520, o1);
  await page.evaluate(() => renderDetailBody()); await L.settle(page, 200);
  const o2 = await opened();
  await page.evaluate(() => { assemble(); render(); }); await L.settle(page, 500);
  const o3 = await opened();
  check(r, 'it stays open through a redraw of the tab and a full redraw (snapTabBody keeps it)', o2.open && o3.open, [o2, o3]);
  await L.go(page, 'a/ava_test/proof'); await L.settle(page, 400);
  check(r, 'the athlete\'s Proof sub-tab no longer has it', (await page.locator('#wtdet').count()) === 0 && !/body weight/i.test(await txt('#tabbody')) && /habit tracking/i.test(await txt('#tabbody')), await txt('#tabbody'));
  await L.go(page, 'a/ben_test/work'); await L.settle(page, 400);
  check(r, 'an athlete with no reading has no body weight panel at all (absent, not empty)', (await page.locator('#wtdet').count()) === 0 && !/body weight/i.test(await txt('#tabbody')), '');
  for (const w of [390, 320]) {
    await page.setViewportSize({ width: w, height: 844 });
    await L.go(page, 'a/ava_test/work'); await L.settle(page, 250);
    await page.evaluate(() => { document.getElementById('wtdet').open = true; });
    const o = await overflow();
    check(r, `The work with body weight open at ${w} px: no sideways scroll`, o.over <= 0, o);
  }
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

// ── Seven places, one sticky bar, ⚙ Tools in it (round 2 of the coach UX pass, 2026-10-12; Amir: "D1 yes") ───────────────────────────────────
// Nine tabs became seven: Today, Athletes, Exercises, Proof, Leads (Intake + the signup funnel + Affiliates), Library, Buyers (the Course + the Testing app).
// From 900 px the brand, the tabs, the signed-in label, ↻ Refresh, ⚙ Tools and Sign out are ONE sticky bar (it was a 58 px bar over a 61 px rail); under 900 px
// the top bar and one row of tabs that scrolls sideways inside itself. ⚙ Tools hangs under the bar on every screen. The old addresses still land.
S['nav-seven'] = async (b) => {
  const r = { id: 'nav-seven', title: 'Seven places in one sticky bar with ⚙ Tools in it; Leads and Buyers have sub-tabs; the four old addresses land in the right place and are rewritten; Back keeps the place; no sideways scroll at 390 and 320', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'today' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await L.settle(page, 500);
  const hash = () => page.evaluate(() => location.hash);
  const tabsOf = () => page.evaluate(() => [...document.querySelectorAll('#rail a.tab')].map(a => ({ label: a.childNodes[0].textContent.trim(), href: a.getAttribute('href'), n: (a.querySelector('.n') || {}).textContent || '', on: a.classList.contains('active') })));
  const subsOf = sel => page.evaluate(s => [...document.querySelectorAll(s + ' .stab')].map(a => ({ label: a.childNodes[0].textContent.trim(), href: a.getAttribute('href'), n: (a.querySelector('.n') || {}).textContent || '', on: a.classList.contains('active') })), sel);

  // 1. the seven places and their two badges
  const tabs = await tabsOf();
  check(r, 'seven tabs, in this order, with these addresses: Today, Athletes, Exercises, Proof, Leads, Library, Buyers', JSON.stringify(tabs.map(t => t.label)) === JSON.stringify(['Today', 'Athletes', 'Exercises', 'Proof', 'Leads', 'Library', 'Buyers']) && JSON.stringify(tabs.map(t => t.href)) === JSON.stringify(['#today', '#athletes', '#exercises', '#proof', '#leads', '#links', '#buyers']), tabs);
  const exp = await page.evaluate(() => ({ waiting: Object.values(S.ath).reduce((n, a) => n + a.toReply, 0), apps: newApplications() }));
  check(r, 'two badges: Athletes (notes to read) and Leads (new applications), and none on the others', exp.apps === 2 && exp.waiting > 0 && tabs.filter(t => t.n).map(t => t.label + ':' + t.n).join() === `Athletes:${exp.waiting},Leads:${exp.apps}`, { exp, tabs: tabs.filter(t => t.n) });
  check(r, 'Today is the one marked (aria-current), and the page title says Today\'s own: the Coach\'s Box alone', tabs.filter(t => t.on).map(t => t.label).join() === 'Today' && (await page.title()) === "The Coach's Box" && (await page.locator('#rail a.tab[aria-current="page"]').count()) === 1, await page.title());

  // 2. one sticky bar
  await page.evaluate(() => { document.getElementById('app').style.minHeight = '3500px'; });   // a sticky bar sticks inside its parent: the fixtures' pages are short, so the page is given room to scroll
  const geo = () => page.evaluate(() => {
    const t = document.querySelector('.topbar'), q = t.getBoundingClientRect(), cs = getComputedStyle(t);
    const inside = sel => { const e = document.querySelector(sel), x = e.getBoundingClientRect(); return x.width > 0 && x.top >= q.top - 0.5 && x.bottom <= q.bottom + 0.5 && x.left >= q.left - 0.5 && x.right <= q.right + 0.5; };
    const rail = [...document.querySelectorAll('#rail a.tab')].map(a => a.getBoundingClientRect());
    return { h: Math.round(q.height), pos: cs.position, top: Math.round(q.top), allInside: ['.brand', '#rail', '#who', '.tbtn[aria-label=Refresh]', '#toolsBtn', '#logoutBtn'].filter(s => !inside(s)),
      oneLine: rail.every(x => Math.abs(x.top - rail[0].top) < 1.5), tabsEnd: Math.round(rail[rail.length - 1].right), rightStart: Math.round(document.querySelector('.topbar .right').getBoundingClientRect().left),
      stick: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--stick')), contentTop: Math.round(document.getElementById('content').getBoundingClientRect().top), over: document.documentElement.scrollWidth - innerWidth };
  });
  let g = await geo();
  check(r, 'at 1440 the bar is ONE sticky row of at most 64 px (it was 119: a top bar and a rail) and holds the brand, the seven tabs, the signed-in label, ↻ Refresh, ⚙ Tools and Sign out', g.h <= 64 && g.pos === 'sticky' && !g.allInside.length && g.oneLine, g);
  check(r, 'the tabs end before the right-hand buttons begin, and --stick is the bar\'s own height, with the page content starting under it', g.tabsEnd <= g.rightStart && g.stick === g.h && g.contentTop >= g.h, g);
  await page.evaluate(() => window.scrollTo({ top: 900, behavior: 'instant' })); await L.settle(page, 200);
  g = await geo();
  check(r, 'scrolled 900 px down the bar is still at the top of the window', g.top === 0, g.top);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  const offs = { st: g.stick };
  // what is offset under the bar: the comparison header (The work), the Applications list, the Exercises split
  await L.go(page, 'a/ava_test/work'); await L.settle(page, 400);
  const cmpTop = await page.evaluate(() => { const h = document.querySelector('.cmp-head'); return h ? getComputedStyle(h).top : null; });
  check(r, 'the comparison header on The work sticks right under the bar (its top is --stick)', cmpTop === `${offs.st}px`, { cmpTop, stick: offs.st });
  await L.go(page, 'leads'); await L.settle(page, 400);
  await page.evaluate(() => window.scrollTo({ top: 100, behavior: 'instant' })); await L.settle(page, 200);
  const listTop = await page.evaluate(() => Math.round(document.querySelector('.in-list').getBoundingClientRect().top));
  check(r, 'the Applications list sticks 12 px under the bar while the page scrolls', listTop === offs.st + 12, { listTop, stick: offs.st });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await L.go(page, 'exercises'); await L.settle(page, 500);
  const split = await page.evaluate(() => { const s = document.querySelector('.sp-split').getBoundingClientRect(); return { bottom: Math.round(s.bottom), win: innerHeight, sy: Math.round(scrollY) }; });
  check(r, 'the Exercises split still fits the window (spineFit measures from its own top)', split.bottom <= split.win && split.sy === 0, split);

  // 3. ⚙ Tools: in the bar, on every screen
  await page.evaluate(() => { window.__DB.athlete_identities = window.__DB.athlete_identities.filter(x => x.athlete_id !== 'ava_test'); return hardRefresh(); });   // a coached athlete with sessions and no login
  await L.settle(page, 900);
  await L.go(page, 'athletes'); await L.settle(page, 300);
  check(r, 'one #toolsBtn, in the bar; the roster\'s controls keep the search, the sort and the filter chips and no longer hold it', (await page.locator('#toolsBtn').count()) === 1 && (await page.locator('.topbar #toolsBtn').count()) === 1 && (await page.locator('#content #toolsBtn, #content #toolsPanel').count()) === 0 && (await page.locator('#searchBox, #sortSel').count()) === 2 && (await page.locator('.rfilters .rf').count()) > 2, '');
  const panelGeo = () => page.evaluate(() => { const p = document.getElementById('toolsPanel').getBoundingClientRect(), t = document.querySelector('.topbar').getBoundingClientRect(); return { top: Math.round(p.top), barBottom: Math.round(t.bottom), right: Math.round(p.right), w: Math.round(p.width), win: innerWidth, expanded: document.getElementById('toolsBtn').getAttribute('aria-expanded') }; });
  for (const h of ['today', 'athletes', 'a/ben_test/file']) {
    await L.go(page, h); await L.settle(page, 300);
    check(r, `on ${h}: closed at first, the badge says one login waits`, await page.locator('#toolsPanel').isHidden() && (await page.locator('#toolsBtn .tn').innerText()) === '1' && (await page.locator('#toolsBtn').getAttribute('aria-expanded')) === 'false', await page.locator('#toolsBtn').innerText());
    await page.locator('#toolsBtn').click(); await L.settle(page, 200);
    const pg = await panelGeo(), ptxt = (await page.locator('#toolsPanel').innerText()).replace(/\s+/g, ' ');
    check(r, `on ${h}: one tap opens it under the bar at the right (520 px wide at most), with Create 1 missing login, Backup and Logins to send`, await page.locator('#toolsPanel').isVisible() && pg.expanded === 'true' && pg.top === pg.barBottom && pg.w <= 520 && pg.right <= pg.win && /Create 1 missing login/.test(ptxt) && /Backup/.test(ptxt) && /Logins to send/i.test(ptxt), { pg, ptxt: ptxt.slice(0, 160) });
    await page.locator('#toolsBtn').click(); await L.settle(page, 150);
    check(r, `on ${h}: a second tap closes it`, await page.locator('#toolsPanel').isHidden() && (await page.locator('#toolsBtn').getAttribute('aria-expanded')) === 'false', '');
  }
  await L.go(page, 'athletes'); await L.settle(page, 300);
  await page.locator('#toolsBtn').click(); await page.keyboard.press('Escape'); await L.settle(page, 150);
  check(r, 'Esc closes it', await page.locator('#toolsPanel').isHidden(), '');
  await page.locator('#toolsBtn').click();
  await page.locator('#toolsPanel .tools-note').click(); await L.settle(page, 150);
  check(r, 'a click inside the panel keeps it open', await page.locator('#toolsPanel').isVisible(), '');
  await page.mouse.click(40, 500); await L.settle(page, 150);   // the margin left of the page: nothing there to open
  check(r, 'a click outside it closes it', await page.locator('#toolsPanel').isHidden(), '');
  await page.locator('#toolsBtn').click();
  await page.evaluate(() => render()); await L.settle(page, 200);
  check(r, 'it stays open through a redraw', await page.locator('#toolsPanel').isVisible(), '');
  await page.locator('#searchBox').focus();
  await page.evaluate(() => { S.logins.extra_x = { athlete_id: 'extra_x', initial_password: 'extra-pw-9' }; paintTools(); });
  check(r, 'a change to what the panel holds is drawn without taking the focus off the box being typed in', (await page.evaluate(() => document.activeElement.id)) === 'searchBox' && /extra_x/.test(await page.locator('#toolsPanel').innerText()) && (await page.locator('#toolsBtn .tn').innerText()) === '2', await page.evaluate(() => document.activeElement.id));
  await page.evaluate(() => { delete S.logins.extra_x; paintTools(); });
  await page.mouse.click(40, 500);

  // 4. the nine-tab addresses still land, in the new place, and the address bar is rewritten without an extra history entry
  const OLD = [['intake', '#leads', 'Leads'], ['affiliates', '#leads/codes', 'Leads'], ['assess', '#buyers/testing', 'Buyers'], ['course', '#buyers', 'Buyers']];
  for (const [old, now, tab] of OLD) {
    await L.go(page, 'today'); await L.settle(page, 200);
    await L.go(page, old); await L.settle(page, 300);
    const act = (await tabsOf()).filter(t => t.on).map(t => t.label).join();
    check(r, `#${old} lands on ${now} (the ${tab} tab marked) and the address bar says so`, (await hash()) === now && act === tab, { hash: await hash(), act });
    await page.goBack(); await L.settle(page, 300);
    check(r, `...and the rewrite is no extra history entry: one step Back from it is Today, not #${old}`, (await hash()) === '#today', await hash());
  }
  const o2 = await L.openCoach(b, { hash: 'assess' });
  check(r, 'opening the page ON an old address (a bookmark) lands in the new place and rewrites it: #assess → #buyers/testing, the Testing app sub-tab on show', (await o2.page.evaluate(() => location.hash)) === '#buyers/testing' && (await o2.page.locator('.buy-subrail .stab.active').textContent()).startsWith('Testing app') && (await o2.page.locator('#asUser').count()) === 1, await o2.page.evaluate(() => location.hash));
  await o2.page.context().close();

  // 5. Leads: Applications · Free signups · Referral codes · Chats
  await L.go(page, 'leads'); await L.settle(page, 400);
  let subs = await subsOf('.lead-subrail');
  check(r, 'Leads has four sub-tabs, Applications first and marked, with a count of the new ones; its address is #leads', JSON.stringify(subs.map(s => s.label)) === JSON.stringify(['Applications', 'Free signups', 'Referral codes', 'Chats']) && JSON.stringify(subs.map(s => s.href)) === JSON.stringify(['#leads', '#leads/signups', '#leads/codes', '#leads/chats']) && subs[0].on && subs[0].n === '2' && !subs[1].n && !subs[2].n && (await page.locator('#inView').count()) === 1, subs);
  check(r, 'the page title names the screen: Applications · Leads', (await page.title()) === "Applications · Leads · The Coach's Box", await page.title());
  await page.locator('.lead-subrail .stab', { hasText: 'Free signups' }).click(); await L.settle(page, 400);
  check(r, 'Free signups (#leads/signups) is the funnel: its section, two rows, and no applications view', (await hash()) === '#leads/signups' && (await page.locator('#funnelPanel').count()) === 1 && (await page.locator('#funnelPanel .fun').count()) === 2 && (await page.locator('#inView').count()) === 0 && (await page.title()) === "Free signups · Leads · The Coach's Box", await hash());
  await L.go(page, 'proof'); await L.settle(page, 500);
  check(r, 'and the funnel is no longer on Proof', (await page.locator('#funnelPanel').count()) === 0 && !/The funnel/.test(await page.locator('#content').innerText()), '');
  await page.locator('#rail a.tab', { hasText: 'Leads' }).click(); await L.settle(page, 300);
  await page.locator('.lead-subrail .stab', { hasText: 'Referral codes' }).click(); await L.settle(page, 400);
  check(r, 'Referral codes (#leads/codes) is the code roster, with + Add code', (await hash()) === '#leads/codes' && (await page.locator('#affAdd').count()) === 1 && /Live codes/i.test(await page.locator('#content').innerText()) && (await page.title()) === "Referral codes · Leads · The Coach's Box", await hash());
  await page.locator('#affAdd').click();
  const form = page.locator('.aff-form[data-new="1"]');
  await form.locator('[data-k=code]').fill('nav15'); await form.locator('[data-k=percent]').fill('15'); await form.locator('[data-k=coach_name]').fill('Nav Coach');
  let n0 = await L.nCalls(page);
  await form.locator('.aff-save').click(); await L.settle(page, 600);
  const ins = lastOf(await L.callsSince(page, n0), x => x.name === 'affiliates' && x.op === 'insert');
  check(r, 'adding a code still works from here: insert {NAV15, 15} and the code is listed', !!ins && ins.payload.code === 'NAV15' && ins.payload.percent === 15 && (await page.locator('.intake-card', { hasText: 'NAV15' }).count()) === 1, ins && ins.payload);
  n0 = await L.nCalls(page);
  await L.jsClick(page.locator('.aff-retire[data-code=NAV15]')); await L.settle(page, 600);
  const upd = lastOf(await L.callsSince(page, n0), x => x.name === 'affiliates' && x.op === 'update');
  check(r, 'retiring one still works: update {active: false} for that code, and it moves to Retired', !!upd && upd.payload.active === false && upd.filters.join() === 'code.eq."NAV15"' && /Retired · \d/.test(await page.locator('#content').innerText()), upd && { payload: upd.payload, filters: upd.filters });
  await page.locator('.lead-subrail .stab', { hasText: 'Applications' }).click(); await L.settle(page, 300);
  check(r, 'Applications is back, with its list and the application on show', (await hash()) === '#leads' && (await page.locator('#inView .in-row').count()) >= 3 && (await page.locator('.in-detail .in-title').count()) === 1, await hash());

  // 6. Buyers: Course · Testing app, each with its count, and a login can be made on each
  await page.locator('#rail a.tab', { hasText: 'Buyers' }).click(); await L.settle(page, 700);
  subs = await subsOf('.buy-subrail');
  check(r, 'Buyers has two sub-tabs: the Course (marked, #buyers) and the Testing app (#buyers/testing), each with its count of active logins (1 and 1)', JSON.stringify(subs.map(s => [s.label, s.href, s.n, s.on])) === JSON.stringify([['Course', '#buyers', '1', true], ['Testing app', '#buyers/testing', '1', false]]) && (await page.title()) === "Course · Buyers · The Coach's Box", subs);
  const fnCalls = async (n, fn) => (await L.callsSince(page, n)).filter(c => c.kind === 'fn' && c.name === fn);
  await page.locator('#tpUser').fill('nav_course'); n0 = await L.nCalls(page);
  await page.locator('#tpCreate').click(); await L.settle(page, 900);
  let calls = await fnCalls(n0, 'tps-login');
  check(r, 'a course login is created from here (one tps-login create) and the Course count goes to 2', calls.length === 1 && calls[0].payload.action === 'create' && calls[0].payload.username === 'nav_course' && (await subsOf('.buy-subrail'))[0].n === '2', { calls: calls.map(c => c.payload), subs: await subsOf('.buy-subrail') });
  await page.locator('.buy-subrail .stab', { hasText: 'Testing app' }).click(); await L.settle(page, 500);
  check(r, 'the Testing app sub-tab: #buyers/testing, its own list (fixture_academy) and form, and the Course\'s list is not drawn there', (await hash()) === '#buyers/testing' && (await page.locator('#asUser').count()) === 1 && (await page.locator('#tpUser').count()) === 0 && /fixture_academy/.test(await page.locator('#buyersBody').innerText()) && (await page.title()) === "Testing app · Buyers · The Coach's Box", await hash());
  await page.locator('#asUser').fill('nav_academy'); n0 = await L.nCalls(page);
  await page.locator('#asCreate').click(); await L.settle(page, 900);
  calls = await fnCalls(n0, 'assess-login');
  check(r, 'a testing-app login is created from here (one assess-login create) and the Testing app count goes to 2', calls.length === 1 && calls[0].payload.action === 'create' && calls[0].payload.username === 'nav_academy' && (await subsOf('.buy-subrail'))[1].n === '2' && (await subsOf('.buy-subrail'))[1].on, { calls: calls.map(c => c.payload), subs: await subsOf('.buy-subrail') });

  // 7. Back from an athlete returns to the roster at the same place
  await L.go(page, 'athletes'); await L.settle(page, 300);
  await page.evaluate(() => { document.body.style.minHeight = '3500px'; window.scrollTo({ top: 600, behavior: 'instant' }); }); await L.settle(page, 300);
  await page.evaluate(() => { location.hash = '#a/ava_test/work'; }); await L.settle(page, 700);
  await page.goBack(); await L.settle(page, 700);
  const yBack = await page.evaluate(() => Math.round(scrollY));
  check(r, 'Back from an athlete lands on the roster where it was left (600)', (await hash()) === '#athletes' && Math.abs(yBack - 600) <= 2, { hash: await hash(), yBack });

  // 8. 900 px is the narrowest single bar; 899 px is two rows
  await page.setViewportSize({ width: 900, height: 800 }); await L.settle(page, 300);
  g = await geo();
  check(r, 'at 900 px it is still ONE bar of at most 64 px with the seven tabs on one line, and the tabs end before the buttons begin', g.h <= 64 && g.oneLine && g.tabsEnd <= g.rightStart && !g.allInside.filter(s => s !== '#who').length && g.over <= 0, g);
  await page.setViewportSize({ width: 899, height: 800 }); await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' })); await L.settle(page, 300);
  const two = await page.evaluate(() => { const tb = document.querySelector('.tb-top').getBoundingClientRect(), rl = document.getElementById('rail').getBoundingClientRect(); return { tbH: Math.round(tb.height), tbPos: getComputedStyle(document.querySelector('.tb-top')).position, railTop: Math.round(rl.top), railPos: getComputedStyle(document.querySelector('.rail')).position, stick: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--stick')) }; });
  check(r, 'at 899 px the top bar is its own sticky row (--stick is its height) and the tab row sits under it, not sticky', two.tbPos === 'sticky' && two.tbH === two.stick && two.railTop >= two.tbH && two.railPos === 'static', two);

  // 9. a narrow window: one row of tabs (600 px) or, below 600 px, the bottom bar in its place (round 3, scenario `phone-bottom-bar`); the active place in view, no sideways scroll of the page
  const SCREENS = ['today', 'athletes', 'a/ava_test/work', 'a/ava_test/file', 'exercises', 'exercises/coverage', 'proof', 'leads', 'leads/signups', 'leads/codes', 'links', 'buyers', 'buyers/testing'];
  for (const w of [600, 390, 320]) {
    await page.setViewportSize({ width: w, height: 800 }); await L.settle(page, 300);
    const bad = [];
    for (const s of SCREENS) {
      await L.go(page, s); await L.settle(page, 250);
      const m = await page.evaluate(() => ({ over: document.documentElement.scrollWidth - innerWidth, wide: [...document.querySelectorAll('.tb-top *, #rail *, #content *')].filter(el => { const x = el.getBoundingClientRect(); return x.width > 0 && x.right > innerWidth + 1 && !el.closest('#rail'); }).slice(0, 3).map(el => el.tagName + '.' + el.className) }));
      if (m.over > 0) bad.push([s, m]);
    }
    check(r, `at ${w} px no screen scrolls sideways (the tab row scrolls inside itself)`, !bad.length, bad);
    await L.go(page, 'buyers/testing'); await L.settle(page, 300);
    const row = await page.evaluate(() => { const rl = document.getElementById('rail'), tabs = [...rl.querySelectorAll('a.tab')].map(a => a.getBoundingClientRect()), on = rl.querySelector('a.tab.active').getBoundingClientRect(), box = rl.getBoundingClientRect();
      return { oneRow: tabs.every(x => Math.abs(x.top - tabs[0].top) < 1.5), scrolls: rl.scrollWidth > rl.clientWidth, scrollLeft: Math.round(rl.scrollLeft), activeIn: on.left >= box.left - 1 && on.right <= box.right + 1, active: rl.querySelector('a.tab.active').textContent.trim() }; });
    if (w >= 600) {
      // (the row used to scroll sideways inside itself at 390 and 320 and the check said so; from 600 px up the seven tabs fit, so the row only has to hold the active one in view)
      check(r, `at ${w} px the seven tabs are ONE row (scrolling sideways inside itself if they must) and the active tab (${row.active}) is in view`, row.oneRow && row.activeIn && row.active === 'Buyers', row);
    } else {
      const bb = await page.evaluate(() => { const items = [...document.querySelectorAll('#botbar .bb-item')].map(a => a.getBoundingClientRect()), more = document.getElementById('moreBtn');
        return { n: items.length, oneRow: items.every(x => Math.abs(x.top - items[0].top) < 1.5), inWindow: items.every(x => x.left >= -0.5 && x.right <= innerWidth + 0.5), railShown: !!document.getElementById('rail').offsetParent, moreOn: more.classList.contains('active'), activeNav: [...document.querySelectorAll('#botbar .bb-item.active')].length }; });
      check(r, `at ${w} px the tab row gives way to the bottom bar: four items in ONE row inside the window, and the active place (Buyers) is shown by More being marked`, bb.n === 4 && bb.oneRow && bb.inWindow && !bb.railShown && bb.moreOn && bb.activeNav === 1, bb);
    }
    const tb = await page.evaluate(() => { const bx = [...document.querySelectorAll('.tb-top .brand, .tb-top .tbtn')].map(e => e.getBoundingClientRect()); return { allIn: bx.every(x => x.right <= innerWidth + 0.5 && x.left >= -0.5), tools: !!document.getElementById('toolsBtn').offsetParent }; });
    check(r, `at ${w} px the brand, ↻, ⚙ Tools and Sign out all fit in the top bar`, tb.allIn && tb.tools, tb);
    await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'instant' })); await L.settle(page, 200);
    const stuck = await page.evaluate(() => ({ barTop: Math.round(document.querySelector('.tb-top').getBoundingClientRect().top), railBottom: Math.round(document.querySelector('.rail').getBoundingClientRect().bottom),
      botBottom: Math.round(document.getElementById('botbar').getBoundingClientRect().bottom), win: innerHeight }));
    if (w >= 600) check(r, `at ${w} px scrolled down the top bar stays at the top of the window and the tab row scrolls away (it does not eat the phone's screen)`, stuck.barTop === 0 && stuck.railBottom < 0, stuck);
    else check(r, `at ${w} px scrolled down the top bar stays at the top of the window, the bottom bar at the bottom, and no tab row is drawn (it does not eat the phone's screen)`, stuck.barTop === 0 && stuck.botBottom === stuck.win && stuck.railBottom <= 0, stuck);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  }
  await L.go(page, 'athletes'); await L.settle(page, 300);
  await page.locator('#toolsBtn').click(); await L.settle(page, 200);
  const pw = await page.evaluate(() => { const p = document.getElementById('toolsPanel').getBoundingClientRect(), t = document.querySelector('.tb-top').getBoundingClientRect(); return { left: Math.round(p.left), right: Math.round(p.right), win: innerWidth, top: Math.round(p.top), barBottom: Math.round(t.bottom), over: document.documentElement.scrollWidth - innerWidth }; });
  check(r, 'on a phone the Tools panel is the full width right under the bar, and the page does not scroll sideways', pw.left <= 0 && pw.right >= pw.win && pw.top === pw.barBottom && pw.over <= 0, pw);
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

// ── A phone's bottom bar (round 3 of the coach UX pass, 2026-10-12) ────────────────────────────────────────────────────────────────────────
// Below 600 px the tab row is hidden and a bar fixed to the bottom takes its place: Today · Athletes · Exercises · More, with the Athletes badge on its item.
// More opens a small sheet above the bar (Proof, Leads with its badge, Library, Buyers); the sheet is one history step. From 600 px up nothing is different.
S['phone-bottom-bar'] = async (b) => {
  const r = { id: 'phone-bottom-bar', title: 'Below 600 px a bottom bar (Today, Athletes, Exercises, More) replaces the tab row; More opens a sheet with the other four places that closes on a pick, outside, Esc and Back; the toast, Undo bar, fail bar and Save bar sit above the bar; from 600 px up nothing changed', checks: [] };
  const geo = (page) => page.evaluate(() => {
    const vis = el => { if (!el) return false; const cs = getComputedStyle(el), q = el.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && q.width > 0 && q.height > 0; };
    const bar = document.getElementById('botbar'), sheet = document.getElementById('moreSheet'), bq = bar.getBoundingClientRect(), sq = sheet.getBoundingClientRect(), tq = document.querySelector('.tb-top').getBoundingClientRect();
    const rows = [...sheet.querySelectorAll('.ms-row')];
    return { barShown: vis(bar), barTop: Math.round(bq.top * 10) / 10, barBottom: Math.round(bq.bottom * 10) / 10, barH: Math.round(bq.height), win: innerHeight, winW: innerWidth,
      items: [...bar.querySelectorAll('.bb-item')].map(a => ({ label: a.querySelector('.bb-l').childNodes[0].textContent.trim(), href: a.getAttribute('href'), n: (a.querySelector('.n') || {}).textContent || '', on: a.classList.contains('active'), cur: a.getAttribute('aria-current') })),
      railShown: vis(document.getElementById('rail')), railTabs: document.querySelectorAll('#rail a.tab').length, sheetShown: vis(sheet), scrimShown: vis(document.getElementById('moreScrim')), expanded: document.getElementById('moreBtn').getAttribute('aria-expanded'),
      rows: rows.map(a => ({ label: a.querySelector('.ms-name').textContent, href: a.getAttribute('href'), n: (a.querySelector('.n') || {}).textContent || '', on: a.classList.contains('active'), cur: a.getAttribute('aria-current') })),
      sheetTop: Math.round(sq.top), sheetBottom: Math.round(sq.bottom * 10) / 10, sheetLeft: Math.round(sq.left), sheetRight: Math.round(sq.right), topBarBottom: Math.round(tq.bottom),
      toolsShown: vis(document.getElementById('toolsPanel')), over: document.documentElement.scrollWidth - innerWidth };
  });
  const SCREENS = ['today', 'athletes', 'a/ava_test/work', 'a/ava_test/file', 'exercises', 'exercises/coverage', 'proof', 'leads', 'leads/signups', 'leads/codes', 'links', 'buyers', 'buyers/testing'];
  for (const [w, h] of [[390, 844], [320, 640]]) {
    const { page, log } = await L.openCoach(b, { hash: 'today' });
    await page.setViewportSize({ width: w, height: h }); await L.settle(page, 500);
    const hash = () => page.evaluate(() => location.hash);
    const hlen = () => page.evaluate(() => history.length);
    const exp = await page.evaluate(() => ({ waiting: Object.values(S.ath).reduce((n, a) => n + a.toReply, 0), apps: newApplications() }));
    const tapBar = label => page.locator('#botbar .bb-item', { hasText: label }).click();
    const openMore = async () => { await page.locator('#moreBtn').click(); await L.settle(page, 350); };
    const prep = async () => { await L.go(page, 'athletes'); await L.go(page, 'exercises'); await L.settle(page, 200); };   // [... #athletes, #exercises]: one step back is #athletes
    const back = async () => { await page.goBack(); await L.settle(page, 500); };

    // 1. what is drawn
    let g = await geo(page);
    check(r, `at ${w} px the bar is fixed to the bottom of the window and holds four items: Today, Athletes, Exercises, More`, g.barShown && g.barBottom === g.win && g.barH >= 48 && JSON.stringify(g.items.map(x => x.label)) === JSON.stringify(['Today', 'Athletes', 'Exercises', 'More']) && g.items.slice(0, 3).map(x => x.href).join() === '#today,#athletes,#exercises', g);
    check(r, `at ${w} px the tab row is not drawn (its seven links stay in the page, for the code that waits for them)`, !g.railShown && g.railTabs === 7, { railShown: g.railShown, railTabs: g.railTabs });
    check(r, `at ${w} px the Athletes item carries the notes to read (${exp.waiting}), More carries the new applications (${exp.apps}), and Today and Exercises carry nothing`, exp.waiting > 0 && exp.apps === 2 && g.items.map(x => x.n).join('|') === `|${exp.waiting}||${exp.apps}`, { exp, items: g.items });
    check(r, `at ${w} px Today is the one item marked (aria-current), and the sheet and its scrim are not shown`, g.items.filter(x => x.on).map(x => x.label).join() === 'Today' && g.items[0].cur === 'page' && !g.sheetShown && !g.scrimShown && g.expanded === 'false', g);

    // 2. each item goes to its screen and is marked
    const seen = [];
    for (const [label, href] of [['Athletes', '#athletes'], ['Exercises', '#exercises'], ['Today', '#today'], ['Athletes', '#athletes'], ['Exercises', '#exercises']]) {
      await tapBar(label); await L.settle(page, 450);
      g = await geo(page);
      seen.push([label, await hash(), g.items.filter(x => x.on).map(x => x.label).join()]);
    }
    check(r, `at ${w} px each item goes to its screen and is the one marked`, seen.every(([l, hh, on]) => hh === { Athletes: '#athletes', Exercises: '#exercises', Today: '#today' }[l] && on === l), seen);

    // 3. More: the sheet
    let n0 = await hlen();
    await openMore();
    g = await geo(page);
    check(r, `at ${w} px More opens a sheet above the bar with four places: Proof, Leads (with its badge), Library, Buyers; the scrim is up and More says it is expanded`, g.sheetShown && g.scrimShown && g.expanded === 'true' && JSON.stringify(g.rows.map(x => x.label)) === JSON.stringify(['Proof', 'Leads', 'Library', 'Buyers']) && g.rows.map(x => x.href).join() === '#proof,#leads,#links,#buyers' && g.rows.map(x => x.n).join('|') === `|${exp.apps}||`, g.rows);
    check(r, `at ${w} px the sheet sits right above the bar, inside the window and under the top bar, and the page does not scroll sideways`, g.sheetBottom <= g.barTop + 0.5 && g.barTop - g.sheetBottom <= 2 && g.sheetTop >= g.topBarBottom && g.sheetLeft >= 0 && g.sheetRight <= g.winW && g.over <= 0, g);
    check(r, `at ${w} px opening it is one history step`, (await hlen()) === n0 + 1, { before: n0, after: await hlen() });
    await page.keyboard.press('Escape'); await L.settle(page, 450);

    // 4. a pick goes there, closes the sheet, marks More, and leaves no dead step in the history
    n0 = await hlen();
    await openMore();
    await page.locator('#moreSheet .ms-row', { hasText: 'Leads' }).click(); await L.settle(page, 700);
    g = await geo(page);
    check(r, `at ${w} px picking Leads goes to #leads, closes the sheet and the scrim, and marks More (and no other item)`, (await hash()) === '#leads' && !g.sheetShown && !g.scrimShown && g.expanded === 'false' && g.items.filter(x => x.on).map(x => x.label).join() === 'More' && g.items[3].n === String(exp.apps), { hash: await hash(), g });
    check(r, `at ${w} px Back from the picked place is the screen it was picked on, and Back again the one before it (no dead step left by the sheet)`, await (async () => { await back(); const first = await hash(); await back(); return first === '#exercises' && (await hash()) === '#athletes'; })(), { hash: await hash() });
    await L.go(page, 'buyers'); await L.settle(page, 300);
    await openMore();
    g = await geo(page);
    check(r, `at ${w} px on Buyers its row is marked in the sheet (aria-current) and More is marked on the bar`, g.rows.filter(x => x.on).map(x => x.label).join() === 'Buyers' && g.rows.find(x => x.on).cur === 'page' && g.items.filter(x => x.on).map(x => x.label).join() === 'More', g);
    await page.keyboard.press('Escape'); await L.settle(page, 450);

    // 5. a new screen from the sheet starts at the top (a pick is a tap, not a Back)
    await page.evaluate(() => { document.body.style.minHeight = '3500px'; });
    await L.go(page, 'proof'); await page.evaluate(() => window.scrollTo({ top: 500, behavior: 'instant' })); await L.settle(page, 300);
    await L.go(page, 'today'); await L.settle(page, 300);
    await openMore();
    await page.locator('#moreSheet .ms-row', { hasText: 'Proof' }).click(); await L.settle(page, 800);
    const yTop = await page.evaluate(() => Math.round(scrollY));
    check(r, `at ${w} px a place picked from the sheet starts at the top, even one left scrolled down (the place Back would have kept)`, (await hash()) === '#proof' && yTop === 0, { hash: await hash(), yTop });
    await page.evaluate(() => { document.body.style.minHeight = ''; });

    // 6. the other ways out: Esc, a tap outside, More again, Back, a tap on the bar. Each closes it, leaves the screen where it was and leaves no dead step.
    const exits = {
      'Esc': async () => { await page.keyboard.press('Escape'); },
      'a tap outside (on the scrim)': async () => { await page.mouse.click(Math.round(w / 2), 120); },
      'a second tap on More': async () => { await page.locator('#moreBtn').click(); },
    };
    for (const [name, fn] of Object.entries(exits)) {
      await prep(); n0 = await hlen();
      await openMore(); await fn(); await L.settle(page, 600);
      g = await geo(page);
      check(r, `at ${w} px ${name} closes the sheet, stays on the screen, opens nothing else, and Back goes to the screen before (one step)`, !g.sheetShown && !g.scrimShown && g.expanded === 'false' && !g.toolsShown && (await hash()) === '#exercises' && await (async () => { await back(); return (await hash()) === '#athletes'; })(), { name, g: { sheetShown: g.sheetShown, scrimShown: g.scrimShown, toolsShown: g.toolsShown }, hash: await hash(), n0 });
    }
    await prep();
    await openMore(); await back();
    g = await geo(page);
    check(r, `at ${w} px Back closes the sheet and nothing else: still on #exercises`, !g.sheetShown && !g.scrimShown && g.expanded === 'false' && (await hash()) === '#exercises', { hash: await hash(), sheetShown: g.sheetShown });
    await back();
    check(r, `at ${w} px with the sheet closed, Back does what it always did: the screen before (#athletes)`, (await hash()) === '#athletes', await hash());
    await prep();
    await openMore(); await tapBar('Today'); await L.settle(page, 700);
    g = await geo(page);
    check(r, `at ${w} px a tap on the bar while the sheet is open closes it and goes there (#today, Today marked), and Back is the screen before`, (await hash()) === '#today' && !g.sheetShown && g.items.filter(x => x.on).map(x => x.label).join() === 'Today' && await (async () => { await back(); return (await hash()) === '#exercises'; })(), { hash: await hash(), g: g.items });

    // 7. never together with ⚙ Tools
    await L.go(page, 'athletes'); await L.settle(page, 300);
    await openMore();
    await page.evaluate(() => toggleTools()); await L.settle(page, 450);
    g = await geo(page);
    check(r, `at ${w} px opening ⚙ Tools closes the More sheet`, g.toolsShown && !g.sheetShown && !g.scrimShown, { tools: g.toolsShown, sheet: g.sheetShown });
    await page.locator('#moreBtn').click(); await L.settle(page, 450);
    g = await geo(page);
    check(r, `at ${w} px opening More closes the Tools panel`, !g.toolsShown && g.sheetShown, { tools: g.toolsShown, sheet: g.sheetShown });
    await page.keyboard.press('Escape'); await L.settle(page, 450);

    // 8. everything fixed at the bottom sits above the bar
    const rects = () => page.evaluate(() => { const q = id => { const e = document.getElementById(id), x = e.getBoundingClientRect(); return { top: Math.round(x.top * 10) / 10, bottom: Math.round(x.bottom * 10) / 10, shown: getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden' && x.height > 0 }; };
      return { bar: q('botbar'), toast: q('toast'), undo: q('undobar'), fail: q('failbar'), top: document.querySelector('.tb-top').getBoundingClientRect().bottom }; });
    await page.evaluate(() => toast('Saved. Checking the bar')); await L.settle(page, 450);
    let q = await rects();
    check(r, `at ${w} px the toast sits above the bar (and clear of it)`, q.toast.shown && q.toast.bottom <= q.bar.top - 8, q);
    await page.evaluate(() => offerUndoFn('Hid the session. Checking the bar', () => {})); await L.settle(page, 450);
    q = await rects();
    check(r, `at ${w} px the Undo bar sits above the bar and above the toast`, q.undo.shown && q.undo.bottom <= q.bar.top - 8 && q.undo.bottom <= q.toast.top, q);
    await page.evaluate(() => { dismissUndo(); fail('Fixture: something did not save. Checking the bar'); }); await L.settle(page, 400);
    q = await rects();
    check(r, `at ${w} px the fail bar is in view above the bar, under the top bar`, q.fail.shown && q.fail.bottom <= q.bar.top && q.fail.top >= q.top - 0.5, q);
    await page.evaluate(() => { failDismissAll(); }); await L.settle(page, 300);
    await L.go(page, 'exercises'); await L.settle(page, 500);
    await page.locator('.spine-row button[data-open]').first().click(); await L.settle(page, 600);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' })); await L.settle(page, 200);
    const sv = await page.evaluate(() => { const a = document.querySelector('#spineEd .spine-acts'), x = a.getBoundingClientRect(), bq = document.getElementById('botbar').getBoundingClientRect(); return { top: Math.round(x.top), bottom: Math.round(x.bottom * 10) / 10, barTop: Math.round(bq.top * 10) / 10, h: Math.round(document.getElementById('spineEd').getBoundingClientRect().height), win: innerHeight }; });
    check(r, `at ${w} px the Exercises editor's Save bar sticks to the bottom of the window just above the bar, not behind it`, sv.h > sv.win && sv.bottom <= sv.barTop + 0.5 && sv.barTop - sv.bottom <= 2 && sv.top >= 0, sv);

    // 9. the last element of a long screen can be scrolled up above the bar, and nothing scrolls sideways
    const longs = [];
    for (const s of ['a/ava_test/work', 'athletes', 'exercises', 'proof', 'today', 'leads']) {
      await L.go(page, s); await L.settle(page, 300);
      const info = await page.evaluate(() => ({ h: document.documentElement.scrollHeight, win: innerHeight }));
      if (info.h <= info.win + 40) continue;
      await page.evaluate(() => window.scrollTo({ top: 1e6, behavior: 'instant' })); await L.settle(page, 250);
      const e = await page.evaluate(() => {
        const bq = document.getElementById('botbar').getBoundingClientRect();
        const shut = el => { for (let p = el.parentElement; p; p = p.parentElement) if (p.tagName === 'DETAILS' && !p.open && !(el.closest('summary') && el.closest('summary').parentElement === p)) return true; return false; };   // a folded section draws nothing, whatever its boxes say
        const els = [...document.querySelectorAll('#content *')].filter(el => { const cs = getComputedStyle(el), x = el.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && x.height > 0 && x.width > 0 && !shut(el) && !el.closest('.spine-acts') && !['fixed', 'sticky'].includes(cs.position); });
        const maxBottom = Math.max(...els.map(el => el.getBoundingClientRect().bottom));
        // an element from the middle of the page, scrolled to the END of the window: scroll-padding must keep it clear of the bar
        const docY = el => el.getBoundingClientRect().bottom + scrollY;
        const mid = els.filter(el => /^(DIV|SECTION|LI|TR)$/.test(el.tagName) && el.getBoundingClientRect().height >= 30 && el.getBoundingClientRect().height <= 400 && docY(el) > innerHeight + 60 && docY(el) < document.documentElement.scrollHeight - 150).sort((a, b) => docY(b) - docY(a))[0];
        let midBottom = null;
        if (mid) { mid.scrollIntoView({ block: 'end', behavior: 'instant' }); midBottom = Math.round(mid.getBoundingClientRect().bottom * 10) / 10; }
        return { barTop: Math.round(bq.top * 10) / 10, maxBottom: Math.round(maxBottom * 10) / 10, midBottom, hasMid: !!mid };
      });
      longs.push([s, info.h, e]);
    }
    check(r, `at ${w} px on every long screen the last element ends above the bar when scrolled to the end (${longs.map(x => x[0]).join(', ')})`, longs.length >= 3 && longs.every(([, , e]) => e.maxBottom <= e.barTop + 0.5), longs);
    check(r, `at ${w} px an element scrolled to the end of the window stops above the bar (scroll-padding), on at least one long screen`, longs.some(([, , e]) => e.hasMid) && longs.every(([, , e]) => !e.hasMid || e.midBottom <= e.barTop + 0.5), longs.map(([s, , e]) => [s, e.hasMid, e.midBottom, e.barTop]));
    const wide = [];
    for (const open of [false, true]) {
      for (const s of SCREENS) {
        await L.go(page, s); await L.settle(page, 200);
        if (open) await openMore();
        g = await geo(page);
        if (g.over > 0 || (open && (g.sheetLeft < 0 || g.sheetRight > g.winW))) wide.push([s, open, g.over]);
        if (open) { await page.keyboard.press('Escape'); await L.settle(page, 350); }
      }
    }
    check(r, `at ${w} px no screen scrolls sideways, with the sheet closed or open`, !wide.length, wide);
    check(r, `at ${w} px no page errors`, !log.errors.length, log.errors);
    if (w === 390) {
      // a window that grows past 600 px while the sheet is open drops it
      await L.go(page, 'athletes'); await openMore();
      await page.setViewportSize({ width: 700, height: 800 }); await L.settle(page, 600);
      g = await geo(page);
      check(r, 'widening the window past 600 px with the sheet open closes it, and the bar goes with the phone layout', !g.sheetShown && !g.scrimShown && !g.barShown && g.expanded === 'false', { sheet: g.sheetShown, scrim: g.scrimShown, bar: g.barShown });
    }
    await page.context().close();
  }

  // 10. 599 px is still a phone, 600 px and up is as before
  const { page, log } = await L.openCoach(b, { hash: 'today' });
  const CSSV = () => page.evaluate(() => ({ bb: getComputedStyle(document.documentElement).getPropertyValue('--bb').trim(), toastBottom: getComputedStyle(document.getElementById('toast')).bottom, undoBottom: getComputedStyle(document.getElementById('undobar')).bottom,
    appPad: getComputedStyle(document.getElementById('app')).paddingBottom, scrollPad: getComputedStyle(document.documentElement).scrollPaddingBottom, one: document.querySelector('.topbar').getBoundingClientRect().height, barPos: getComputedStyle(document.querySelector('.topbar')).position }));
  await page.setViewportSize({ width: 599, height: 800 }); await L.settle(page, 300);
  let g = await geo(page), c = await CSSV();
  check(r, 'at 599 px it is still the phone layout: the bottom bar is shown, the tab row is not, and the toast and Undo bar are lifted by the bar', g.barShown && !g.railShown && /56px/.test(c.bb) && c.appPad === '56px' && c.scrollPad === '56px' && c.toastBottom === '82px' && c.undoBottom === '132px', { barShown: g.barShown, railShown: g.railShown, c });
  for (const [w, h] of [[600, 800], [750, 900], [899, 800], [900, 800], [1440, 900]]) {
    await page.setViewportSize({ width: w, height: h }); await L.settle(page, 300);
    g = await geo(page); c = await CSSV();
    const tabs = await page.evaluate(() => [...document.querySelectorAll('#rail a.tab')].map(a => a.getBoundingClientRect()));
    const oneRow = tabs.every(x => Math.abs(x.top - tabs[0].top) < 1.5 && x.width > 0);
    check(r, `at ${w} px nothing changed: no bottom bar, no sheet, the seven tabs in ONE row (${w >= 900 ? 'inside the one sticky bar' : 'under the top bar'}), the toast and Undo bar where they were (26 px and 76 px), no extra page padding`,
      !g.barShown && !g.sheetShown && !g.scrimShown && g.railShown && g.railTabs === 7 && oneRow && c.bb === '' && c.toastBottom === '26px' && c.undoBottom === '76px' && c.appPad === '0px' && c.scrollPad === 'auto' && (w >= 900 ? c.one <= 64 && c.barPos === 'sticky' : true) && g.over <= 0, { barShown: g.barShown, railShown: g.railShown, oneRow, c, over: g.over });
  }
  const noop = await page.evaluate(() => { toggleMore({ detail: 1 }); return { sheetHidden: document.getElementById('moreSheet').hidden, len: history.length }; });
  check(r, 'from 600 px up the More sheet cannot be opened (and nothing is added to the history)', noop.sheetHidden, noop);
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

// The roster as one dense list (2026-10-12, redesign round 1): a PC row is 60 px or less with aligned columns under column heads, a phone row is two lines.
S['roster-dense'] = async (b) => {
  const r = { id: 'roster-dense', title: 'Roster: a dense row per person (column heads, aligned columns, 60 px or less) on a PC, two lines and no sideways scroll on a phone; the cycle with its week, its end in clay near the end; the level still fills in place', checks: [] };
  const FX = require('./fixtures');
  const { page, log, today } = await L.openCoach(b, { hash: 'athletes', seed: { stub: { delay: { coach_season_levels: 1500 } } } });
  await page.setViewportSize({ width: 1440, height: 900 });
  const row = name => page.locator('#content .ath', { hasText: name });
  // 1. the levels arrive into the Proof column of the rows that are already on screen
  await row('Ava Example').locator('.a-proof').waitFor();
  check(r, 'the roster is drawn before the levels arrive: Ava has her seven dots and no level yet', (await row('Ava Example').locator('.a-proof .dt').count()) === 7 && !/LV/.test(await row('Ava Example').locator('.a-proof').innerText()), await row('Ava Example').locator('.a-proof').innerText());
  await page.evaluate(() => { window.__row = document.querySelector('#content .ath'); });
  await L.settle(page, 2200);
  check(r, 'when the levels arrive the rows are the same elements, and the level is plain text in the Proof column', await page.evaluate(() => document.querySelector('#content .ath') === window.__row) && /^LV \d+$/.test(await row('Ava Example').locator('.a-proof .lvtext').innerText()) && (await row('Ava Example').locator('.a-proof .lvchip').count()) === 0, await row('Ava Example').locator('.a-proof').innerText());
  // 2. dated cycles: Ava is 10 days into 4 weeks, Ben's (4 weeks) ends in 3 days, Eli's (5 weeks) ended 5 days ago
  await page.evaluate(([s, e, s2, e2, s3, e3]) => {
    const set = (id, a, z) => { const p = window.__DB.programs.find(x => x.athlete_id === id); p.data.cycles[0].startDate = a; p.data.cycles[0].endDate = z; };
    set('ava_test', s, e); set('ben_test', s2, e2); set('eli_new', s3, e3);
    return hardRefresh();
  }, [FX.daysAgo(today, 10), FX.daysAgo(today, -18), FX.daysAgo(today, 25), FX.daysAgo(today, -3), FX.daysAgo(today, 40), FX.daysAgo(today, 5)]);
  await L.settle(page, 900);
  const clay = await page.evaluate(() => { const i = document.createElement('i'); i.style.color = 'var(--clay-ink)'; document.body.appendChild(i); const c = getComputedStyle(i).color; i.remove(); return c; });
  const colourOf = loc => loc.evaluate(el => getComputedStyle(el).color);
  const heads = await page.locator('.rhead > span').evaluateAll(els => els.map(e => e.textContent));
  check(r, 'the column heads are there: Athlete, Cycle, Last session, Proof, Why, in small capitals', JSON.stringify(heads) === JSON.stringify(['Athlete', 'Cycle', 'Last session', 'Proof', 'Why']) && await page.locator('.rhead').isVisible() && await page.locator('.rhead').evaluate(el => getComputedStyle(el).textTransform === 'uppercase' && getComputedStyle(el).fontSize === '12px'), heads);
  const heights = await page.locator('#content .ath').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().height)));
  check(r, 'every athlete row is 60 px or less at 1440 px', heights.length >= 5 && Math.max(...heights) <= 60, heights);
  const lefts = await page.evaluate(() => ['a-cycle', 'a-last', 'a-proof', 'a-why'].map(c => [...new Set([...document.querySelectorAll('#content .ath .' + c)].map(e => Math.round(e.getBoundingClientRect().left)))].length));
  check(r, 'the columns line up: every row starts each of Cycle, Last session, Proof and Why at the same x', JSON.stringify(lefts) === '[1,1,1,1]', lefts);
  const cyc = async name => (await row(name).locator('.a-cycle').innerText()).replace(/\s+/g, ' ');
  check(r, 'a dated cycle says its number, the week and its end: "C1 · wk 2/4 · ends 30 Oct"', /^C1 · wk 2\/4 · ends \d{1,2} [A-Z][a-z]{2}$/.test(await cyc('Ava Example')) && (await row('Ava Example').locator('.a-cycle .warn').count()) === 0, await cyc('Ava Example'));
  check(r, 'a cycle that ends in 3 days says so, in clay', /^C1 · wk 4\/4 · ends in 3 d$/.test(await cyc('Ben Example')) && (await colourOf(row('Ben Example').locator('.a-cycle .warn'))) === clay, [await cyc('Ben Example'), await colourOf(row('Ben Example').locator('.a-cycle .warn'))]);
  check(r, 'a cycle that ended 5 days ago says so, in clay', /^C1 · wk 5\/5 · ended 5 d ago$/.test(await cyc('Eli Example')) && (await colourOf(row('Eli Example').locator('.a-cycle .warn'))) === clay, await cyc('Eli Example'));
  check(r, 'a free athlete with no cycle and a person with no programme say so, quietly', /^no cycle$/.test(await cyc('Cara')) && /^no programme$/.test(await cyc('Dan')) && (await row('Dan').locator('.a-cycle .warn').count()) === 0, [await cyc('Cara'), await cyc('Dan')]);
  const last = async name => (await row(name).locator('.a-last').innerText()).replace(/\s+/g, ' ');
  check(r, 'the last session and the session count share a cell; no sessions reads "no sessions yet" for a coached athlete and a dash for anyone else', /^yesterday · 3 sessions$/.test(await last('Ava Example')) && /^no sessions yet$/.test(await last('Eli Example')) && /^—$/.test(await last('Dan')), [await last('Ava Example'), await last('Eli Example'), await last('Dan')]);
  check(r, 'Proof: seven dots, n/7 and the level for Ava; nothing at all for Ben, who has no habits', (await row('Ava Example').locator('.a-proof .dt').count()) === 7 && /4\/7/.test(await row('Ava Example').locator('.a-proof .n7').innerText()) && (await row('Ben Example').locator('.a-proof').innerText()) === '' && (await row('Ben Example').locator('.dt').count()) === 0, '');
  check(r, 'the old "on court ✓ / N d off" tag is gone (the dots say it)', !/on court|d off/.test(await page.locator('#rosterBox').innerText()), '');
  const whyAva = await row('Ava Example').locator('.a-why').innerText();
  check(r, 'Why: Ava\'s unread note is in clay, in words', /note/.test(whyAva) && (await colourOf(row('Ava Example').locator('.a-why .warn').first())) === clay, whyAva);
  const ava = await row('Ava Example').locator('.ava').evaluate(el => getComputedStyle(el).backgroundColor), cara = await row('Cara').locator('.ava').evaluate(el => getComputedStyle(el).backgroundColor);
  check(r, 'the avatar is court green for a coached athlete, and a plain outline (not plum) for a free one, whose tier reads "free"', ava === 'rgb(14, 74, 54)' && cara !== 'rgb(122, 78, 110)' && cara !== ava && (await row('Cara').locator('.tier').innerText()) === 'free' && (await row('Ava Example').locator('.tier').innerText()) === 'coached', [ava, cara]);
  check(r, 'a row is still one button that opens the athlete, and a note waiting leaves its clay mark', (await row('Ava Example').evaluate(el => el.tagName)) === 'BUTTON' && await row('Ava Example').evaluate(el => el.classList.contains('flag') && /inset/.test(getComputedStyle(el).boxShadow)), '');
  // 3. no sideways scroll at any width, and on a phone a row is two lines
  const overflow = () => page.evaluate(() => ({ page: document.documentElement.scrollWidth - window.innerWidth, roster: document.getElementById('rosterBox').scrollWidth - document.getElementById('rosterBox').clientWidth,
    rows: Math.max(...[...document.querySelectorAll('#content .ath')].map(e => e.scrollWidth - e.clientWidth)) }));
  for (const w of [1180, 900]) {
    await page.setViewportSize({ width: w, height: 800 }); await L.settle(page, 250);
    const o = await overflow();
    check(r, w + ' px: no sideways scroll, on the page, the roster or any row', o.page <= 0 && o.roster <= 0 && o.rows <= 0, o);
  }
  for (const [w, h] of [[390, 844], [320, 640]]) {
    await page.setViewportSize({ width: w, height: h }); await L.settle(page, 250);
    const o = await overflow();
    check(r, w + ' px: no sideways scroll, on the page, the roster or any row', o.page <= 0 && o.roster <= 0 && o.rows <= 0, o);
    const g = await row('Ava Example').evaluate(el => { const t = s => el.querySelector(s).getBoundingClientRect().top; return { head: getComputedStyle(document.querySelector('.rhead')).display, id: t('.a-id'), why: t('.a-why'), cycle: t('.a-cycle'), h: el.getBoundingClientRect().height }; });
    // at 390 px the name and "1 note to read" share line 1; at 320 px the words may wrap under the name, but the cycle is always below both
    check(r, w + ' px: no column heads; line 1 is the name and why (wrapping under the name when there is no room), then the cycle line', g.head === 'none' && (w < 360 || Math.abs(g.why - g.id) <= 6) && g.cycle > g.why - 2 && g.cycle > g.id + 14 && g.h <= (w < 360 ? 150 : 110), g);
  }
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

// Round 1 of the coach UX pass (2026-10-12): Today is Needs you first and wide, every person row has ONE button named for what it does,
// and the things that are not a person sit under "Also waiting", with the logins that were created and not sent (new).
S['today-also-waiting'] = async (b) => {
  const r = { id: 'today-also-waiting', title: 'Today: Needs you first and wide, a button on each row that names what it does, and "Also waiting" with the logins to send', checks: [] };
  const { page, log } = await L.openCoach(b, {});
  const peopleText = () => page.locator('#needPanel .phead .r').innerText().then(s => s.replace(/\s+/g, ' ').trim());
  // 1. layout: Needs you first in the page, left of Proof today (one short panel, round 2) and about twice as wide; no banner headline.
  // The full wall, the quest lever and the pulse are on Proof only, so none of their ids is on Today (one copy of an id at a time).
  const lay = await page.evaluate(() => {
    const n = document.getElementById('needPanel'), w = document.getElementById('proofToday');
    const rn = n.getBoundingClientRect(), rw = w.getBoundingClientRect(), F = Node.DOCUMENT_POSITION_FOLLOWING;
    return { order: !!(n.compareDocumentPosition(w) & F), fullOnToday: ['wallPanel', 'questPanel', 'pulsePanel'].filter(id => document.getElementById(id)),
      left: rn.right <= rw.left + 1, ratio: Math.round(rn.width / rw.width * 100) / 100, top: Math.abs(rn.top - rw.top) < 2,
      h1: document.querySelectorAll('#content h1').length, strip: Math.round(document.querySelector('.board').getBoundingClientRect().height),
      counters: [...document.querySelectorAll('.board .counter')].map(a => a.textContent.replace(/\s+/g, ' ').trim()) };
  });
  check(r, '#needPanel comes before #proofToday in the page, and the full wall, quest lever and pulse are not on Today', lay.order && !lay.fullOnToday.length, lay);
  check(r, 'on a wide screen Needs you is the left column, level with Proof today and about twice as wide', lay.left && lay.top && lay.ratio > 1.8 && lay.ratio < 2.3, lay);
  check(r, 'the strip has no headline and is slim (under 110 px), with the four counters on it as number + label', lay.h1 === 0 && lay.strip < 110 && lay.counters.length === 4 && /^\d+\/\d+ on court today$/.test(lay.counters[0]) && /^\d+ notes? to read$/.test(lay.counters[3]), lay);
  for (const w of [390, 320]) {
    await page.setViewportSize({ width: w, height: 844 }); await L.settle(page, 250);
    const ph = await page.evaluate(() => { const n = document.getElementById('needPanel').getBoundingClientRect(), wl = document.getElementById('proofToday').getBoundingClientRect();
      return { stacked: wl.top >= n.bottom - 1, sw: document.documentElement.scrollWidth, iw: innerWidth, strip: Math.round(document.querySelector('.board').getBoundingClientRect().height) }; });
    check(r, `at ${w} px one column with Needs you first, and no sideways scroll`, ph.stacked && ph.sw <= ph.iw, ph);
    if (w === 390) check(r, 'at 390 px the strip stays under 150 px (counters 2 x 2)', ph.strip < 150, ph);
  }
  await page.setViewportSize({ width: 1280, height: 900 }); await L.settle(page, 250);

  // 2. each person's button, from the top reason
  const info = await page.evaluate(() => [...document.querySelectorAll('#needPanel .need')].filter(el => el.querySelector('.needgo:not(.static)')).map(el => ({
    name: el.querySelector('.n').textContent.trim(), btns: [...el.querySelectorAll('.nacts .btn')].map(x => x.textContent.trim()), tags: [...el.querySelectorAll('.nacts .btn')].map(x => x.tagName),
    href: (el.querySelector('.nacts a.btn') || {}).href || '', target: (el.querySelector('.nacts a.btn') || {}).target || '',
    go: el.querySelector('.needgo').getAttribute('onclick'), open: [...el.querySelectorAll('.nacts button')].map(x => x.getAttribute('onclick')) })));
  const by = n => info.find(x => x.name === n) || {};
  check(r, 'a note row (Ava): Mark read and Open day, and Open day does what the row does', JSON.stringify(by('Ava Example').btns) === JSON.stringify(['Mark read', 'Open day']) && by('Ava Example').open[1] === by('Ava Example').go, by('Ava Example'));
  check(r, 'a no-login row (Eli) says Set up login', JSON.stringify(by('Eli Example').btns) === JSON.stringify(['Set up login']), by('Eli Example'));
  check(r, 'a new signup with a number (Dan) says WhatsApp, a link that opens in a new tab', JSON.stringify(by('Dan').btns) === JSON.stringify(['WhatsApp ↗']) && by('Dan').tags[0] === 'A' && /^https:\/\/wa\.me\/\d+$/.test(by('Dan').href) && by('Dan').target === '_blank', by('Dan'));
  // every key, on made-up people (so the table is checked for all of them, with and without a number)
  const KEYS = [['sync', 'Open sessions'], ['lowrun', 'Open'], ['cycle', 'Open cycle'], ['renew', 'Open file'], ['idle', 'Open'], ['login', 'Set up login'], ['signup', 'WhatsApp ↗'], ['silent', 'WhatsApp ↗'], ['upgrade', 'WhatsApp ↗']];
  const synth = await page.evaluate(KEYS => {
    _needAll = true;
    const mk = (id, key, wa) => { S.ath[id] = { id, name: 'Zz ' + id, tier: 'coached', reasons: [{ key, tone: key === 'sync' ? 'warn' : 'note', text: 'fixture ' + key, weight: 1, sub: key === 'sync' ? 'work' : key === 'signup' || key === 'silent' || key === 'upgrade' ? 'proof' : 'file' }],
      needReplyRecent: [], needReplyStale: 0, needReplySessions: [], toReply: 0, contact: { whatsapp: wa }, isHab: false }; };
    KEYS.forEach(([k]) => mk('zz_' + k, k, '+447700900123'));
    ['signup', 'silent', 'upgrade'].forEach(k => mk('zz_nowa_' + k, k, '@just_a_handle'));
    render();
    const out = [...document.querySelectorAll('#needPanel .need')].filter(el => /^Zz /.test((el.querySelector('.n') || {}).textContent || '')).map(el => ({
      id: el.querySelector('.n').textContent.trim().slice(3), btns: [...el.querySelectorAll('.nacts .btn')].map(x => x.textContent.trim()),
      tag: (el.querySelector('.nacts .btn') || {}).tagName, href: (el.querySelector('.nacts a.btn') || {}).href || '', rel: (el.querySelector('.nacts a.btn') || {}).rel || '',
      sameAsRow: el.querySelector('.nacts button') ? el.querySelector('.nacts button').getAttribute('onclick') === el.querySelector('.needgo').getAttribute('onclick') : null,
      warn: el.querySelector('.r1').classList.contains('warn') }));
    Object.keys(S.ath).filter(k => k.startsWith('zz_')).forEach(k => delete S.ath[k]);
    _needAll = false; render();
    return out;
  }, KEYS);
  const bad = [];
  KEYS.forEach(([k, label]) => { const x = synth.find(s => s.id === 'zz_' + k) || {};
    if (JSON.stringify(x.btns) !== JSON.stringify([label])) bad.push([k, x.btns]);
    if (label === 'WhatsApp ↗' ? !(x.tag === 'A' && x.href === 'https://wa.me/447700900123' && /noopener/.test(x.rel)) : (k !== 'login' && x.sameAsRow !== true)) bad.push([k, 'link or handler', x]); });
  ['signup', 'silent', 'upgrade'].forEach(k => { const x = synth.find(s => s.id === 'zz_nowa_' + k) || {}; if (JSON.stringify(x.btns) !== JSON.stringify(['Open']) || x.sameAsRow !== true) bad.push(['nowa ' + k, x]); });
  check(r, 'every reason key has the button in the brief: Open sessions / Open / Open cycle / Open file / Set up login, WhatsApp for signup, silent and upgrade (a plain Open when there is no number), and the plain ones do what the row does', synth.length === KEYS.length + 3 && !bad.length, bad.length ? bad : synth.length);
  check(r, 'only a warn reason is clay (the sync row), the others are ink', synth.find(s => s.id === 'zz_sync').warn === true && synth.filter(s => s.id !== 'zz_sync').every(s => s.warn === false), synth.map(s => s.id + ':' + s.warn));

  // 3. Also waiting
  const also = await page.evaluate(() => { const a = document.querySelector('#needPanel .also'); if (!a) return null;
    const last = [...document.querySelectorAll('#needPanel .need')].filter(el => el.querySelector('.needgo:not(.static)')).pop();
    return { label: (a.querySelector('.eyebrow') || {}).textContent, after: !!(last.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING),
      rows: [...a.querySelectorAll('.need')].map(el => ({ title: el.querySelector('.n').textContent.trim(), btns: [...el.querySelectorAll('.nacts .btn')].map(x => x.textContent.trim()) })) }; });
  check(r, 'an "Also waiting" group under the people', !!also && also.label === 'Also waiting' && also.after, also);
  const rowOf = t => (also && also.rows.find(x => x.title === t)) || {};
  check(r, 'it holds the applications, the logins to send, the weekly backup and the older notes, each with its own button',
    JSON.stringify(rowOf('2 new applications').btns) === JSON.stringify(['Open Leads']) && JSON.stringify(rowOf('Login to send · Ben Example').btns) === JSON.stringify(['Copy message', 'Mark sent'])
    && JSON.stringify(rowOf('Weekly backup').btns) === JSON.stringify(['⤓ Back up now']) && JSON.stringify(rowOf('1 older note').btns) === JSON.stringify(['Clear']), also);
  check(r, 'only a login that still holds its first password is listed (Ava\'s was sent)', also.rows.filter(x => /^Login to send/.test(x.title)).length === 1, also.rows.map(x => x.title));
  const people0 = await peopleText();
  const nPeople = await page.evaluate(() => Object.values(S.ath).filter(a => (a.reasons || []).length).length);
  const asReason = await page.evaluate(() => Object.values(S.ath).some(a => (a.reasons || []).some(x => /login to send/i.test(x.text + x.key))));
  check(r, 'the header counts people only: the rows under Also waiting are not reasons', people0 === `${nPeople} people` && nPeople === 4 && !asReason, { people0, nPeople, asReason });
  await page.evaluate(() => { LOAD_ERR.logins = 'fixture: logins did not load'; render(); });
  check(r, 'when the list of logins did not load, no login row is shown', (await page.locator('#needPanel .also .need', { hasText: 'Login to send' }).count()) === 0, '');
  await page.evaluate(() => { LOAD_ERR.logins = ''; render(); });
  check(r, 'and it comes back when it did', (await page.locator('#needPanel .also .need', { hasText: 'Login to send · Ben Example' }).count()) === 1, '');

  // 4. Copy message, then Mark sent: the same write as the Tools panel's
  const row = () => page.locator('#needPanel .also .need', { hasText: 'Login to send · Ben Example' });
  await row().getByRole('button', { name: 'Copy message' }).click(); await L.settle(page, 300);
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  check(r, 'Copy message puts their login message on the clipboard', /ben_test/.test(clip) && /fixture-unsent-pw-1/.test(clip), clip.slice(0, 120));
  const d0 = log.dialogs.length, n0 = await L.nCalls(page);
  await row().getByRole('button', { name: 'Mark sent' }).click(); await L.settle(page, 800);
  const todayUpd = lastOf(await L.callsSince(page, n0), isUpd('athlete_identities'));
  check(r, 'Mark sent asks first, then clears the stored password and stamps sent, for that athlete', log.dialogs.slice(d0).some(x => x.type === 'confirm' && /ben_test/.test(x.message)) && !!todayUpd && todayUpd.payload.initial_password === null && typeof todayUpd.payload.sent_at === 'string' && todayUpd.filters.includes('athlete_id.eq."ben_test"'), todayUpd && { payload: todayUpd.payload, filters: todayUpd.filters });
  check(r, 'the row goes and the people count does not change', (await row().count()) === 0 && (await peopleText()) === people0 && location_is_today(await page.evaluate(() => location.hash)), await peopleText());
  await page.evaluate(() => { const x = window.__DB.athlete_identities.find(i => i.athlete_id === 'ben_test'); x.initial_password = 'fixture-unsent-pw-1'; x.sent_at = null; return hardRefresh(); }); await L.settle(page, 800);
  await L.go(page, 'athletes'); await openTools(page);
  await page.evaluate(() => { const el = document.querySelector('.creds-top'); if (el && el.getAttribute('aria-expanded') !== 'true') el.click(); });
  const n1 = await L.nCalls(page);
  await page.locator('.creds .credrow', { hasText: 'ben_test' }).getByRole('button', { name: 'Mark sent' }).click(); await L.settle(page, 800);
  const toolsUpd = lastOf(await L.callsSince(page, n1), isUpd('athlete_identities'));
  check(r, 'it is the very write the Tools panel makes (same columns, same filter)', !!toolsUpd && !!todayUpd && JSON.stringify(Object.keys(toolsUpd.payload).sort()) === JSON.stringify(Object.keys(todayUpd.payload).sort()) && toolsUpd.payload.initial_password === null && JSON.stringify(toolsUpd.filters) === JSON.stringify(todayUpd.filters), toolsUpd && { payload: toolsUpd.payload, filters: toolsUpd.filters });

  // 5. Set up login opens the File and puts the cursor in the password box; a note's Open day opens that day
  await L.go(page, 'today');
  await page.locator('#needPanel .need', { hasText: 'Eli Example' }).first().getByRole('button', { name: 'Set up login' }).click(); await L.settle(page, 400);
  const st = await page.evaluate(() => ({ hash: location.hash, focus: document.activeElement && document.activeElement.id }));
  check(r, 'Set up login opens their File with the cursor in the password box', st.hash === '#a/eli_new/file' && st.focus === 'athPw', st);
  await L.go(page, 'today');
  await page.locator('#needPanel .need', { hasText: 'Ava Example' }).first().getByRole('button', { name: 'Open day' }).click(); await L.settle(page, 400);
  check(r, 'a note\'s Open day opens the day the note is on', await page.evaluate(() => location.hash) === '#a/ava_test/work', await page.evaluate(() => location.hash));
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

S['spine-copy-add'] = async (b) => {
  const r = { id: 'spine-copy-add', title: 'Exercises → Not in the Spine yet: one tap copies "/spine add <name>" for Claude', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'exercises/coverage' });   // Not in the Spine yet is on the Coverage sub-tab
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

// ── Exercises sub-tabs and the side-by-side editor (round 2 of the coach UX pass, 2026-10-12) ──
// Entries / Qualities / Coverage have their own addresses; from 1000 px the editor opens beside the list (each scrolls on its own),
// below that it replaces the list with "← All exercises"; leaving a sub-tab with typed, unsaved work asks first.
S['spine-subtabs'] = async (b) => {
  const r = { id: 'spine-subtabs', title: 'Exercises: three sub-tabs with their own addresses; the editor beside the list from 1000 px, in place of it on a phone; the guard when leaving a sub-tab', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'exercises' });
  dismissDialogs(page, log);   // a confirm is answered No
  const noOverflow = () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  const vis = sel => page.locator(sel).first().isVisible();
  const url = () => page.url().replace(/^.*coach\.html/, '');
  await page.setViewportSize({ width: 1440, height: 900 }); await L.settle(page, 300);

  // 1. the three sub-tabs and their addresses
  const tabs = await page.locator('.sp-subrail .stab').allInnerTexts();
  check(r, 'three sub-tabs: Entries, Qualities, Coverage (Coverage with a count)', tabs.length === 3 && /^Entries$/i.test(tabs[0].trim()) && /^Qualities$/i.test(tabs[1].trim()) && /^Coverage\s*\d+$/i.test(tabs[2].replace(/\s+/g, ' ').trim()), tabs);
  check(r, '#exercises is Entries: the search box and the list are there, the sub-tab is marked', (await page.locator('#spineQ').count()) === 1 && /Entries/i.test(await page.locator('.sp-subrail .stab.active').innerText()), '');
  await page.locator('.sp-subrail .stab', { hasText: 'Qualities' }).click(); await L.settle(page, 400);
  check(r, 'Qualities has its own address, a row per quality, and no list', /#exercises\/qualities$/.test(url()) && (await page.locator('.qm-row').count()) === 10 && (await page.locator('#spineQ').count()) === 0, url());
  check(r, 'the Quality check is open under it', await page.locator('#content details', { hasText: 'Quality check' }).first().evaluate(d => d.open), '');
  await page.locator('.sp-subrail .stab', { hasText: 'Coverage' }).click(); await L.settle(page, 400);
  const covN = await page.locator('.sp-subrail .stab.active .n').innerText();
  const sections = await page.evaluate(() => [...document.querySelectorAll('#content details')].filter(d => d.querySelector(':scope > summary.arch-toggle')).map(d => [d.querySelector('summary').textContent.trim(), d.open]));
  const fixN = sections.reduce((n, s) => n + (+((/·\s*(\d+) names?/.exec(s[0]) || [])[1] || 0)), 0);
  check(r, 'Coverage has its own address, four count tiles and the bar', /#exercises\/coverage$/.test(url()) && (await page.locator('.sp-tile').count()) === 4, url());
  check(r, 'the two lists are open there, and the tab\'s count is what they hold', sections.length >= 1 && sections.every(s => s[1]) && +covN === fixN && fixN > 0, { covN, sections });
  await page.evaluate(() => { location.hash = 'exercises/nonsense'; }); await L.settle(page, 400);
  check(r, 'an unknown part reads as Entries', (await page.locator('#spineQ').count()) === 1, url());
  await page.evaluate(() => { location.hash = 'exercises'; }); await L.settle(page, 300);

  // 2. the Coverage warning line on Entries
  const warn = page.locator('.sp-warn');
  check(r, 'Entries says in one clay line what Coverage has to fix, and links to it', (await warn.count()) === 1 && /not in the Spine/.test(await warn.innerText()) && /exercises\/coverage$/.test(await warn.getAttribute('href')), (await warn.count()) ? await warn.innerText() : 'no line');
  await warn.click(); await L.settle(page, 400);
  check(r, 'the line opens Coverage', /#exercises\/coverage$/.test(url()) && (await page.locator('.sp-tile').count()) === 4, url());
  await page.locator('.sp-subrail .stab', { hasText: 'Entries' }).click(); await L.settle(page, 300);

  // 3. a long list, and a desktop width: the editor opens beside it
  await page.evaluate(() => {
    const now = new Date().toISOString();
    for (let i = 0; i < 70; i++) {
      const id = 'bulk-lift-' + String(i).padStart(2, '0');
      window.__DB.exercises.push({ id, name: 'Bulk Lift ' + String(i).padStart(2, '0'), aliases: [], pattern: 'squat', qualities: ['strength'], purpose: 'Fixture.', tennis: null, cues: null,
        equipment: [], loads: [], easier: [], harder: [], alts: [], video: null, status: 'approved', updated_at: now, updated_by: 'coach', impact: 'none', muscles: null, steps: [] });
      window.__DB.exercise_coach.push({ id, sfr: null, flags: [], notes: null, suggested_qualities: null, links_before: null, links_history: null, credits: null, cost: null, suggested_changes: null });
    }
    S.spine = null; renderExercises();
  });
  await page.waitForFunction(() => document.querySelector('#spineQ')); await L.settle(page, 300);
  await page.locator('.sp-filter[data-f="approved"]').click(); await L.settle(page, 300);
  check(r, 'nothing open: the right side says so', (await vis('.sp-empty')) && /Pick an exercise to edit it/.test(await page.locator('.sp-empty').innerText()), '');
  const list = page.locator('.sp-list');
  const dims = await list.evaluate(el => ({ ch: el.clientHeight, sh: el.scrollHeight, oy: getComputedStyle(el).overflowY }));
  check(r, 'the list scrolls on its own (taller than its box, overflow auto)', dims.sh > dims.ch + 200 && dims.oy === 'auto', dims);
  await list.evaluate(el => { el.scrollTop = 600; });
  check(r, 'scrolling the list does not move the page', (await page.evaluate(() => window.scrollY)) === 0 && (await list.evaluate(el => el.scrollTop)) > 400, '');
  // open a row that is on screen, by a JS click (no scrolling), so the list's own scroll is what is being tested
  const picked = await page.evaluate(() => {
    const l = document.querySelector('.sp-list').getBoundingClientRect();
    const row = [...document.querySelectorAll('.sp-list .spine-row')].find(x => x.getBoundingClientRect().top > l.top + 40 && x.getBoundingClientRect().bottom < l.bottom - 40);
    row.querySelector('button[data-open]').click();
    return row.dataset.open;
  });
  await page.locator('#spineEd').waitFor(); await L.settle(page, 300);
  const side = await page.evaluate(() => {
    const l = document.querySelector('.sp-listpane').getBoundingClientRect(), e = document.getElementById('spineEd').getBoundingClientRect(), a = document.querySelector('#spineEd .spine-acts').getBoundingClientRect();
    return { listRight: l.right, edLeft: e.left, listTop: l.top, edTop: e.top, actsBottom: a.bottom, vh: window.innerHeight, listScroll: document.querySelector('.sp-list').scrollTop,
      on: document.querySelector('.spine-row.on') ? document.querySelector('.spine-row.on').dataset.open : null };
  });
  check(r, 'at 1440 the editor opens beside the list, level with it', side.edLeft >= side.listRight && Math.abs(side.edTop - side.listTop) < 8, side);
  check(r, 'the open row is highlighted, and the list kept its place', side.on === picked && side.listScroll > 400, { picked, ...side });
  check(r, 'the editor has its own scroll and its Save bar is in view at the bottom', (await page.locator('#spineEd').evaluate(el => getComputedStyle(el).overflowY === 'auto' && el.scrollHeight > el.clientHeight + 300)) && side.actsBottom <= side.vh && side.actsBottom > side.vh - 80, side);
  await page.locator('#spineEd').evaluate(el => { el.scrollTop = 500; });
  await page.evaluate(() => renderExercises()); await L.settle(page, 200);
  check(r, 'a redraw keeps both scroll positions', (await page.locator('#spineEd').evaluate(el => el.scrollTop)) === 500 && (await list.evaluate(el => el.scrollTop)) > 400, '');
  const before = await page.evaluate(() => document.querySelector('.sp-list').scrollTop);
  log.dialogs.length = 0;
  await page.locator('.spine-row.on button[data-open]').click(); await L.settle(page, 200);
  check(r, 'tapping the open row does nothing', !log.dialogs.length && (await page.locator('#spineEd').evaluate(el => el.scrollTop)) === 500 && (await page.locator('#spineEd').count()) === 1, log.dialogs);
  // typed work: another row asks first and a No keeps the editor and the typing
  await page.locator('[data-sf=purpose]').fill('Typed beside the list');
  const other = await page.evaluate(id => [...document.querySelectorAll('.sp-list .spine-row')].map(x => x.dataset.open).find(x => x !== id), picked);
  await page.locator(`.spine-row[data-open="${other}"] button[data-open]`).click({ force: true }); await L.settle(page, 300);
  check(r, 'another row asks first, and a No keeps this editor and the typing', log.dialogs.some(x => x.type === 'confirm' && /unsaved changes/.test(x.message)) && (await page.locator('[data-sf=purpose]').inputValue()) === 'Typed beside the list' && (await page.evaluate(() => document.querySelector('.spine-row.on').dataset.open)) === picked, log.dialogs);
  // a filter or a search does not close the editor or lose the typing
  await page.locator('#spineQ').fill('bulk lift 0'); await L.settle(page, 300);
  check(r, 'a search keeps the editor and the typing', (await page.locator('[data-sf=purpose]').inputValue()) === 'Typed beside the list', '');
  await page.locator('#spineQ').fill(''); await L.settle(page, 200);

  // 4. leaving a sub-tab with typed work asks, and a No stays put with the typing
  log.dialogs.length = 0;
  await page.locator('.sp-subrail .stab', { hasText: 'Qualities' }).click(); await L.settle(page, 400);
  check(r, 'switching to Qualities with unsaved typing asks, and a No stays on Entries with the typing', log.dialogs.some(x => x.type === 'confirm') && /#exercises$/.test(url()) && (await page.locator('[data-sf=purpose]').inputValue()) === 'Typed beside the list', { url: url(), dialogs: log.dialogs });
  log.dialogs.length = 0;
  await page.evaluate(() => { location.hash = 'exercises/coverage'; }); await L.settle(page, 400);
  check(r, 'so does a link to Coverage', log.dialogs.some(x => x.type === 'confirm') && /#exercises$/.test(url()), { url: url(), dialogs: log.dialogs });
  log.dialogs.length = 0;
  await page.evaluate(() => { location.hash = 'today'; }); await L.settle(page, 400);
  check(r, 'leaving the tab still asks', log.dialogs.some(x => x.type === 'confirm') && /#exercises$/.test(url()), { url: url(), dialogs: log.dialogs });
  // a Yes: the typing is dropped, and Entries comes back with the entry as saved
  page.removeAllListeners('dialog'); page.on('dialog', async d => { log.dialogs.push({ type: d.type(), message: d.message() }); await d.accept().catch(() => {}); });
  log.dialogs.length = 0;
  await page.locator('.sp-subrail .stab', { hasText: 'Qualities' }).click(); await L.settle(page, 400);
  check(r, 'a Yes goes to Qualities', /#exercises\/qualities$/.test(url()) && (await page.locator('.qm-row').count()) === 10 && (await page.locator('#spineEd').count()) === 0, url());
  await page.locator('.sp-subrail .stab', { hasText: 'Entries' }).click(); await L.settle(page, 400);
  check(r, 'back on Entries the entry is open again, as saved (the typing was dropped)', (await page.locator('[data-sf=purpose]').count()) === 1 && (await page.locator('[data-sf=purpose]').inputValue()) !== 'Typed beside the list', '');
  // typed quality text: leaving that sub-tab asks, too
  dismissDialogs(page, log);
  await page.locator('.sp-subrail .stab', { hasText: 'Qualities' }).click(); await L.settle(page, 400);
  await page.locator('[data-qf="strength:line"]').fill('Typed quality line');
  log.dialogs.length = 0;
  await page.evaluate(() => { location.hash = 'exercises'; }); await L.settle(page, 400);
  check(r, 'leaving Qualities with a typed line asks, and a No keeps it', log.dialogs.some(x => x.type === 'confirm') && /#exercises\/qualities$/.test(url()) && (await page.locator('[data-qf="strength:line"]').inputValue()) === 'Typed quality line', { url: url(), dialogs: log.dialogs });
  page.removeAllListeners('dialog'); page.on('dialog', async d => { log.dialogs.push({ type: d.type(), message: d.message() }); await d.accept().catch(() => {}); });
  await page.evaluate(() => { location.hash = 'exercises'; }); await L.settle(page, 400);   // a Yes: Entries, the typed line dropped
  await page.locator('.sp-close').first().click(); await L.settle(page, 300);
  check(r, 'Close closes it, and the empty state is back', (await page.locator('#spineEd').count()) === 0 && (await vis('.sp-empty')), '');

  // 5. a phone: the editor takes the list's place, with "← All exercises"
  await page.setViewportSize({ width: 390, height: 844 }); await L.settle(page, 400);
  check(r, 'at 390 the list is full width and the empty state is not shown', (await page.locator('.sp-listpane').evaluate(el => el.getBoundingClientRect().width)) > 340 && !(await vis('.sp-empty')) && !(await vis('.sp-back')), '');
  await page.evaluate(() => window.scrollTo({ top: 900, behavior: 'instant' }));
  const y1 = await page.evaluate(() => window.scrollY);
  const pick2 = await page.evaluate(() => {
    const row = [...document.querySelectorAll('.sp-list .spine-row')].find(x => x.getBoundingClientRect().top > 160 && x.getBoundingClientRect().bottom < innerHeight);
    row.querySelector('button[data-open]').click(); return row.dataset.open;
  });
  await page.locator('#spineEd').waitFor(); await L.settle(page, 300);
  const ph = await page.evaluate(() => ({ listShown: !!document.querySelector('.sp-listpane') && getComputedStyle(document.querySelector('.sp-listpane')).display !== 'none', backTop: document.querySelector('.sp-back').getBoundingClientRect().top,
    backShown: getComputedStyle(document.querySelector('.sp-back')).display !== 'none', edW: document.getElementById('spineEd').getBoundingClientRect().width, vw: innerWidth }));
  check(r, 'the editor replaces the list at full width, with ← All exercises in view at the top', !ph.listShown && ph.backShown && ph.backTop >= 0 && ph.backTop < 150 && ph.edW > 340 && ph.edW <= ph.vw, ph);
  check(r, '...and the page has no sideways scroll', await noOverflow(), '');
  await page.locator('[data-sf=purpose]').fill('Typed on a phone');
  log.dialogs.length = 0; dismissDialogs(page, log);
  await page.locator('.sp-back').click(); await L.settle(page, 300);
  check(r, '← All exercises asks like Close does, and a No keeps the editor and the typing', log.dialogs.some(x => x.type === 'confirm') && (await page.locator('[data-sf=purpose]').inputValue()) === 'Typed on a phone', log.dialogs);
  page.removeAllListeners('dialog'); page.on('dialog', async d => { log.dialogs.push({ type: d.type(), message: d.message() }); await d.accept().catch(() => {}); });
  await page.locator('.sp-back').click(); await L.settle(page, 400);
  const y2 = await page.evaluate(() => window.scrollY);
  check(r, 'a Yes brings the list back, where it was', (await page.locator('#spineEd').count()) === 0 && (await vis('.sp-listpane')) && Math.abs(y2 - y1) < 6, { y1, y2 });
  for (const w of [390, 320]) {
    await page.setViewportSize({ width: w, height: 700 }); await L.settle(page, 300);
    const res = {};
    res.entries = await noOverflow();
    await page.locator(`button[data-open="${pick2}"]`).click({ force: true }); await page.locator('#spineEd').waitFor(); await L.settle(page, 200);
    res.editor = await noOverflow();
    await page.locator('.sp-back').click(); await L.settle(page, 200);
    await page.locator('.sp-subrail .stab', { hasText: 'Qualities' }).click(); await L.settle(page, 300);
    res.qualities = await noOverflow();
    await page.locator('.sp-subrail .stab', { hasText: 'Coverage' }).click(); await L.settle(page, 300);
    res.coverage = await noOverflow();
    await page.locator('.sp-subrail .stab', { hasText: 'Entries' }).click(); await L.settle(page, 300);
    check(r, `no sideways scroll at ${w}px on Entries, an open entry, Qualities or Coverage`, Object.values(res).every(Boolean), res);
  }
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
    const rowBtns = async cls => (await row('new_buyer').locator(cls.map(c => '.' + P + '-' + c).join(', ')).count());
    check(r, 'a row with a password waiting shows Copy message (the primary button), Mark sent and Manage, and none of Change password, Revoke or Erase…', (await row('new_buyer').locator('.' + P + '-copy.primary').count()) === 1 && (await rowBtns(['sent'])) === 1 && (await rowBtns(['manage'])) === 1 && (await rowBtns(['pw', 'act', 'erase'])) === 0, '');
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
    // Change password, Revoke and Erase… sit behind Manage; it stays open through a redraw
    const mg = row('new_buyer').locator('.' + P + '-manage');
    check(r, 'a row with nothing to send shows only Manage, folded: Change password, Revoke and Erase… are not on it yet', (await rowBtns(['manage'])) === 1 && (await rowBtns(['pw', 'act', 'erase', 'copy', 'sent'])) === 0 && (await mg.getAttribute('aria-expanded')) === 'false', '');
    await mg.click(); await L.settle(page, 300);
    check(r, 'Manage opens Change password, Revoke and Erase… under the row, and says it is expanded', (await rowBtns(['pw'])) === 1 && (await rowBtns(['act'])) === 1 && (await rowBtns(['erase'])) === 1 && (await mg.getAttribute('aria-expanded')) === 'true', '');
    await page.evaluate(() => render()); await L.settle(page, 200);
    check(r, 'it is still open after the page redraws', (await rowBtns(['pw', 'act', 'erase'])) === 3 && (await mg.getAttribute('aria-expanded')) === 'true', '');
    await mg.click(); await L.settle(page, 200);
    check(r, 'a second tap on Manage folds it again', (await rowBtns(['pw', 'act', 'erase'])) === 0 && (await mg.getAttribute('aria-expanded')) === 'false', '');
    await mg.click(); await L.settle(page, 200);
    // change the password: a typed one, then the function's
    await row('new_buyer').locator('.' + P + '-pw').click(); await L.settle(page, 300);
    check(r, 'Change password opens a form under the row, focused', (await page.locator('.' + P + '-pwin').count()) === 1 && await page.evaluate(sel => document.activeElement && document.activeElement.matches(sel), '.' + P + '-pwin'), '');
    await page.locator('.' + P + '-pwin').fill('AbcdEfgh12');
    n0 = await L.nCalls(page);
    await page.locator('.' + P + '-pwsave').click(); await L.settle(page, 800);
    calls = await fnCalls(n0);
    check(r, 'Save password calls reset with the typed password', calls.length === 1 && calls[0].payload.action === 'reset' && calls[0].payload.username === 'new_buyer' && calls[0].payload.password === 'AbcdEfgh12', calls.map(c => c.payload));
    check(r, 'and says Password changed', /Password changed for new_buyer/.test(await L.toastText(page)), await L.toastText(page));
    check(r, 'a finished action folds Manage again (the row has a new password to send: Copy message, Mark sent and Manage)', (await rowBtns(['pw', 'act', 'erase'])) === 0 && (await rowBtns(['copy', 'sent', 'manage'])) === 3, '');
    await mg.click(); await L.settle(page, 200);
    await row('new_buyer').locator('.' + P + '-pw').click(); await L.settle(page, 300);
    await page.locator('.' + P + '-pwin').fill('short');
    n0 = await L.nCalls(page);
    await page.locator('.' + P + '-pwsave').click(); await L.settle(page, 400);
    check(r, 'a password that breaks the rule is refused before the function is called', (await fnCalls(n0)).length === 0 && /8/.test(await L.failText(page)), await L.failText(page));
    await page.evaluate(() => failDismissAll());
    await page.locator('.' + P + '-pwcancel').click(); await L.settle(page, 300);
    check(r, 'Cancel closes the password form and leaves Manage open', (await page.locator('.' + P + '-pwin').count()) === 0 && (await rowBtns(['pw', 'act', 'erase'])) === 3, '');
    // revoke and restore
    n0 = await L.nCalls(page);
    await row('new_buyer').locator('.' + P + '-act').click(); await L.settle(page, 800);
    calls = await fnCalls(n0);
    check(r, 'Revoke (after the confirm) calls revoke, and the login moves to Revoked', calls.length === 1 && calls[0].payload.action === 'revoke' && /new_buyer revoked/.test(await L.toastText(page)), { calls: calls.map(c => c.payload), toast: await L.toastText(page) });
    await page.evaluate(() => { document.querySelectorAll('#content details').forEach(d => { d.open = true; }); });
    check(r, 'a revoked row shows Restore and Manage; Manage holds only Erase… (no Revoke, no Change password), and keeps the Revoked section open', (await row('new_buyer').locator('.' + P + '-pw').innerText()) === 'Restore' && (await rowBtns(['manage'])) === 1 && (await rowBtns(['act', 'erase'])) === 0, '');
    await row('new_buyer').locator('.' + P + '-manage').click(); await L.settle(page, 300);
    check(r, '...and opening it shows Erase… alone, with the Revoked section still open', (await rowBtns(['erase'])) === 1 && (await rowBtns(['act'])) === 0 && (await rowBtns(['pw'])) === 1 && await row('new_buyer').isVisible(), '');
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

// ── Round 3 of the coach UX pass (2026-10-12): the Library as compact rows, the charts with axes, the ✎ editor with a folded pill picker ─────────────────────
S['r3-library-charts-editor'] = async (b) => {
  const r = { id: 'r3-library-charts-editor', title: 'Round 3: the Library is compact rows with folding shelves and one Copy link; the charts have labelled axes; the ✎ editor folds its pill groups and the pencil shows at rest', checks: [] };
  const DAY = n => new Date(Date.now() - n * 86400e3).toISOString().slice(0, 10);
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  // the way a chart says its first and last date: "12 Sep", with the year on both when they are not both this year
  const axisFmt = (a, c) => { const yr = DAY(0).slice(0, 4), wy = a.slice(0, 4) !== yr || c.slice(0, 4) !== yr; const f = s => +s.slice(8) + ' ' + MON[+s.slice(5, 7) - 1] + (wy ? ' ' + s.slice(0, 4) : ''); return a === c ? [f(a)] : [f(a), f(c)]; };
  const overflow = page => page.evaluate(() => ({ over: document.documentElement.scrollWidth - innerWidth, wide: [...document.querySelectorAll('#content *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1).slice(0, 4).map(el => el.tagName + '.' + el.className) }));
  const seedLibrary = (page, n) => page.evaluate(n => {
    const cats = [['recovery', 'article', 'Recovery'], ['nutrition', 'article', 'Nutrition'], ['conditioning', 'workout', 'Conditioning'], ['mobility', 'workout', 'Mobility']];
    cats.forEach(([id, kind, title], i) => window.__DB.library_categories.push({ id, kind, title, banner: null, icon: null, sort_order: 10 + i }));
    for (let i = 0; i < n; i++) {
      const art = i % 3 === 0, cat = art ? cats[i % 2] : cats[2 + (i % 2)];
      window.__DB.library.push({ slug: (art ? 'articles/' : 'workouts/') + cat[0] + '/gen-' + i, kind: art ? 'article' : 'workout', category_id: cat[0], published: i % 11 !== 5, sort_order: 100 + i,
        updated_at: new Date(Date.now() - i * 86400e3).toISOString(),
        data: art ? { id: 'gen-' + i, title: 'Article ' + i, readMins: 4 + (i % 6) } : { id: 'gen-' + i, title: 'Workout ' + i, duration: '15 min', equipment: 'Bands', category: cat[0] } });
    }
    return hardRefresh();
  }, n).then(() => L.settle(page, 900));
  const openShelves = page => page.evaluate(() => [...document.querySelectorAll('details.lib-shelf[open]')].map(d => d.dataset.lk));
  const SITE = 'https://www.amirardekani.com';   // typed here on purpose: the addresses copied must be the ones the Library always copied

  // ── 1. The Library with 64 items, at 1440 ────────────────────────────────────────────────────────────────────────────────────────────────
  let { page, log } = await L.openCoach(b, { hash: 'today' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await seedLibrary(page, 63);
  await L.go(page, 'links');
  const st = await page.evaluate(() => ({ n: document.querySelectorAll('details.lib-shelf').length, open: document.querySelectorAll('details.lib-shelf[open]').length,
    sum: [...document.querySelectorAll('details.lib-shelf > summary .lib-n')].reduce((a, s) => a + Number(s.textContent), 0), pub: S.lib.filter(l => l.published).length, total: S.lib.length,
    head: document.querySelector('.lib-count').textContent.replace(/\s+/g, ' ').trim(), nHidden: S.lib.filter(l => !l.published).length }));
  check(r, 'first visit with 64 items: every shelf is folded', st.total === 64 && st.n >= 4 && st.open === 0, st);
  check(r, 'each shelf says its count, and the counts add up to the published items', st.sum === st.pub, st);
  check(r, 'the header line gives the totals', st.head === `64 items · ${st.nHidden} hidden`, st.head);
  await page.locator('details.lib-shelf').first().locator('summary').click();
  const rows = await page.evaluate(() => [...document.querySelectorAll('details.lib-shelf[open] .link-row')].map(el => Math.round(el.getBoundingClientRect().height)));
  check(r, 'an open shelf lists compact rows: none taller than 52 px at 1440', rows.length >= 5 && rows.every(h => h <= 52 && h >= 40), rows);
  const first = page.locator('details.lib-shelf').first().locator('.link-row').first();
  const vis = async loc => (await loc.locator('button:visible').allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim());
  check(r, 'an article row has ONE Copy link and Hide, and no printed address', JSON.stringify(await vis(first)) === JSON.stringify(['Copy link ▾', 'Hide']) && !/https?:/.test(await first.innerText()), await vis(first));
  check(r, 'the row names its kind and meta in muted text', /Article 0/.test(await first.innerText()) && /article · 4 min read · updated /.test((await first.locator('.link-row-meta').innerText()).trim()), await first.innerText());
  await first.locator('.lr-copy-btn').click();
  check(r, 'Copy link on an article opens a small choice: App, Web FA, Web EN', JSON.stringify(await vis(first)) === JSON.stringify(['Copy link ▾', 'App', 'Web FA', 'Web EN', 'Hide']), await vis(first));
  const clip = () => page.evaluate(() => navigator.clipboard.readText());
  const got = {};
  for (const lab of ['App', 'Web FA', 'Web EN']) {
    if (!(await first.locator('.lr-pick').isVisible())) await first.locator('.lr-copy-btn').click();
    await first.locator('.lr-pick button', { hasText: new RegExp('^' + lab + '$') }).click(); await L.settle(page, 200);
    got[lab] = await clip();
    await L.settle(page, 1000);   // the choice folds itself away a moment after a copy; the next round opens it again
  }
  check(r, 'it copies the same addresses as before: the app link, the Farsi page and the English page', got.App === SITE + '/program.html?article=gen-0' && got['Web FA'] === SITE + '/fa/articles/gen-0.html' && got['Web EN'] === SITE + '/en/articles/gen-0.html', got);
  await L.settle(page, 1100);
  check(r, 'the choice folds away again by itself after a copy', !(await first.locator('.lr-pick').isVisible()), '');
  // a workout has one address: Copy link copies it straight away
  await page.locator('details.lib-shelf summary', { hasText: 'Strength (fixture)' }).click();
  const wk = page.locator('.link-row', { hasText: 'Fixture Burner' }).first();
  check(r, 'a workout row has Copy link and Hide, nothing more', JSON.stringify(await vis(wk)) === JSON.stringify(['Copy link', 'Hide']), await vis(wk));
  await wk.locator('button', { hasText: 'Copy link' }).click(); await L.settle(page, 200);
  check(r, 'and copies its app address at once', (await clip()) === SITE + '/program.html?workout=fixture-burner', await clip());
  // shelves remember
  const o1 = await openShelves(page);
  await page.evaluate(() => { render(); });
  const o2 = await openShelves(page);
  await L.go(page, 'today'); await L.go(page, 'links');
  const o3 = await openShelves(page);
  check(r, 'the shelves you opened stay open through a redraw and a visit to another tab, and the others stay folded', o1.length === 2 && JSON.stringify(o2) === JSON.stringify(o1) && JSON.stringify(o3) === JSON.stringify(o1), { o1, o2, o3 });
  // the header and the How this works fold
  const hd = await page.evaluate(() => ({ primary: document.querySelectorAll('#content .btn.primary').length,
    btns: [...document.querySelectorAll('.lib-acts .btn')].map(x => x.textContent.trim()),
    sentence: [...document.querySelectorAll('#content p')].filter(p => /changes every athlete's app at once/.test(p.textContent)).map(p => !!p.closest('details.how')),
    howLast: document.querySelector('#content').lastElementChild === document.querySelector('#content > details.how'), howOpen: document.querySelector('#content > details.how').open }));
  check(r, 'the two publish buttons are plain buttons in the header line, and there is no primary button on the screen', hd.primary === 0 && JSON.stringify(hd.btns) === JSON.stringify(['+ Publish workout', '+ Publish article']), hd);
  check(r, 'the sentence about what publishing does is in the How this works fold at the foot, shut', hd.sentence.length === 1 && hd.sentence[0] && hd.howLast && !hd.howOpen, hd);
  // Hide still goes through the same guarded write
  const hid0 = await page.locator('details.lib-hidden').count();
  const n0 = await L.nCalls(page);
  await wk.locator('button', { hasText: 'Hide' }).click(); await L.settle(page, 800);
  const upd = lastOf(await L.callsSince(page, n0), isUpd('library'));
  check(r, 'Hide asks, then writes published=false for that item only', !!upd && upd.payload.published === false && upd.filters.some(f => /slug\.eq/.test(f) && /fixture-burner/.test(f)), upd && [upd.payload, upd.filters]);
  check(r, 'the row goes to the Hidden fold, which stays shut and keeps its marker', (await page.locator('details.lib-hidden').count()) >= hid0 && !(await page.locator('details.lib-hidden').first().evaluate(d => d.open)) && (await page.locator('details.lib-hidden .link-row.hiddenitem .chip', { hasText: 'hidden' }).count()) >= 1, '');
  // no sideways scroll, with a shelf open and a choice open
  for (const w of [390, 320]) {
    await page.setViewportSize({ width: w, height: 844 });
    await L.go(page, 'today'); await L.go(page, 'links');
    await page.locator('details.lib-shelf').first().locator('.lr-copy-btn').first().click(); await L.settle(page, 150);
    const o = await overflow(page);
    check(r, `the Library with a shelf and a choice open at ${w} px: no sideways scroll`, o.over <= 0, o);
  }
  check(r, 'no page errors (Library)', !log.errors.length, log.errors);
  await page.context().close();

  // ── 2. A small library opens its shelves the first time ─────────────────────────────────────────────────────────────────────────────────
  ({ page, log } = await L.openCoach(b, { hash: 'today' }));
  await seedLibrary(page, 8);
  await L.go(page, 'links');
  const sm = await page.evaluate(() => ({ n: document.querySelectorAll('details.lib-shelf').length, open: document.querySelectorAll('details.lib-shelf[open]').length, total: S.lib.length, hiddenOpen: [...document.querySelectorAll('details.lib-hidden[open]')].length }));
  check(r, 'first visit with 9 items (under 12): every shelf is open, the Hidden fold is shut', sm.total === 9 && sm.n >= 3 && sm.open === sm.n && sm.hiddenOpen === 0, sm);
  check(r, 'no page errors (small Library)', !log.errors.length, log.errors);
  await page.context().close();

  // ── 3. The charts: axes that match the data ────────────────────────────────────────────────────────────────────────────────────────────
  ({ page, log } = await L.openCoach(b, { hash: 'a/ava_test/work' }));
  await page.setViewportSize({ width: 1440, height: 900 });
  const sess = [[30, 7, 60], [27, 8, 60], [24, 7, 50], [21, 7, 60], [18, 7, 50], [15, 7, 60], [12, 8, 70], [9, 7, 60], [6, 7, 60], [3, 8, 60], [2, 7, 60], [1, 8, 60]];   // [days ago, session RPE, minutes]
  const checkIns = [30, 27, 24, 21, 18, 15, 12, 9, 6, 3];                                                                                    // the last two sessions have no check-in
  await page.evaluate(([sess, checkIns]) => {
    const arr = window.__DB.session_history;
    for (let i = arr.length - 1; i >= 0; i--) if (arr[i].athlete_id === 'ava_test') arr.splice(i, 1);
    const day = n => new Date(Date.now() - n * 86400e3).toISOString().slice(0, 10);
    sess.forEach(([ago, rpe, min], i) => arr.push({ athlete_id: 'ava_test', athlete_name: 'Ava Example', day: 1 + (i % 3), completed_on: day(ago), status: 'Complete', session_rpe: rpe, duration_min: min,
      readiness: checkIns.indexOf(ago) < 0 ? null : { sleep: 3 + (i % 3), energy: 3 + ((i + 1) % 3), stress: 4, overall: 3 + (i % 2), soreness: 3, composite: 3.5, skipped: false },
      day_note: '', focus: '', summary: 'Day ' + (1 + (i % 3)) + ' — fixture', coach_status: 'read', log: null, updated_at: new Date().toISOString() }));
    const wt = {};
    for (let i = 0; i < 40; i++) wt[addDays(todayKey(), -i)] = { kg: Math.round((64.7 + i * 0.08) * 10) / 10, t: Date.now() - i * 86400000 };
    window.__DB.athlete_progress.find(p => p.athlete_id === 'ava_test').data.ava_test_hab_wt = JSON.stringify(wt);
    return hardRefresh();
  }, [sess, checkIns]);
  await L.settle(page, 900);
  await L.go(page, 'athletes'); await L.go(page, 'a/ava_test/work');
  await page.locator('#chartsBtn').click(); await page.locator('#wtdet summary').click(); await L.settle(page, 250);
  // what the load chart should say, worked out here from the same sessions: the Monday of each of the last 8 weeks and each week's load
  const monday = s => new Date(new Date(s + 'T00:00:00Z').getTime() - ((new Date(s + 'T00:00:00Z').getUTCDay() + 6) % 7) * 86400e3);
  const m0 = monday(DAY(0)), buckets = [];
  for (let i = 7; i >= 0; i--) buckets.push({ start: new Date(m0.getTime() - i * 7 * 86400e3).toISOString().slice(0, 10), load: 0 });
  sess.forEach(([ago, rpe, min]) => { const d = DAY(ago); for (let i = buckets.length - 1; i >= 0; i--) if (d >= buckets[i].start) { buckets[i].load += rpe * min; break; } });
  const maxLoad = Math.max.apply(null, buckets.map(x => x.load));
  const cardInfo = name => page.evaluate(n => {
    const c = [...document.querySelectorAll('#chartbox .chart-card')].find(x => x.querySelector('h4').textContent === n);
    if (!c) return null;
    const svg = c.querySelector('svg');
    return { y: [...c.querySelectorAll('.cp-y span')].map(s => s.textContent), x: [...c.querySelectorAll('.cp-x span')].map(s => s.textContent), h: Math.round(c.getBoundingClientRect().height),
      px: [...c.querySelectorAll('.cp-y span, .cp-x span')].map(s => parseFloat(getComputedStyle(s).fontSize)),
      circles: c.querySelectorAll('svg circle').length, dashed: c.querySelectorAll('svg line[stroke-dasharray]').length, rects: c.querySelectorAll('svg rect').length,
      fill: c.querySelector('.bar-fill') ? c.querySelector('.bar-fill').style.width : null, big: (c.querySelector('.chart-big') || {}).textContent || '',
      rules: svg ? [...svg.querySelectorAll('line:not([stroke-dasharray])')].map(l => Number(l.getAttribute('y1'))) : [], vb: svg ? svg.viewBox.baseVal.height : 0, svgTop: svg ? svg.getBoundingClientRect().top : 0, svgH: svg ? svg.getBoundingClientRect().height : 0,
      yMid: [...c.querySelectorAll('.cp-y span')].map(s => { const q = s.getBoundingClientRect(); return q.top + q.height / 2; }) };
  }, name);
  const ld = await cardInfo('Training load'), rd = await cardInfo('Readiness'), ad = await cardInfo('Adherence');
  check(r, 'the three chart cards are there and each is shorter than the old 280 px (260 or less at 1440)', !!ld && !!rd && !!ad && [ld.h, rd.h, ad.h].every(h => h <= 260), [ld && ld.h, rd && rd.h, ad && ad.h]);
  check(r, 'Training load: the y axis is 0 and the tallest week, the x axis the Monday of the first and of the last week', !!ld && JSON.stringify(ld.y) === JSON.stringify([maxLoad.toLocaleString('en-GB'), '0']) && JSON.stringify(ld.x) === JSON.stringify(axisFmt(buckets[0].start, buckets[7].start).map(t => 'w/c ' + t)), { got: ld && [ld.y, ld.x], want: [maxLoad.toLocaleString('en-GB'), buckets[0].start, buckets[7].start] });
  check(r, 'Training load keeps its eight weekly bars', !!ld && ld.rects === 8, ld && ld.rects);
  check(r, 'Readiness: the y axis is the 1 to 5 scale, the x axis the first and the last check-in', !!rd && JSON.stringify(rd.y) === JSON.stringify(['5', '1']) && JSON.stringify(rd.x) === JSON.stringify(axisFmt(DAY(30), DAY(3))), { got: rd && [rd.y, rd.x], want: axisFmt(DAY(30), DAY(3)) });
  check(r, 'Readiness keeps one point per check-in (10) and its dashed "usual" line', !!rd && rd.circles === 10 && rd.dashed === 1, rd && [rd.circles, rd.dashed]);
  check(r, 'a y label sits at the height of the value it names: 5 and 1 at the chart\'s two rules, within 2 px', !!rd && rd.rules.length === 2 && rd.yMid.every((m, i) => Math.abs(m - (rd.svgTop + rd.rules[i] / rd.vb * rd.svgH)) <= 2), rd && { rules: rd.rules, mids: rd.yMid, svgTop: rd.svgTop, svgH: rd.svgH, vb: rd.vb });
  check(r, 'Adherence keeps its bar, with the 0 % and 100 % ends under it, and the bar is as long as the number says', !!ad && JSON.stringify(ad.x) === JSON.stringify(['0%', '100%']) && ad.fill === parseInt(ad.big, 10) + '%', ad && [ad.x, ad.fill, ad.big]);
  check(r, 'every axis label is 12 px or more', [ld, rd, ad].every(c => c && c.px.length && c.px.every(p => p >= 12)), [ld && ld.px, rd && rd.px, ad && ad.px]);
  // body weight: the lowest and highest point of the line it draws, and its first and last day
  const wtAvg = []; { const kg = []; for (let i = 0; i < 40; i++) kg.push(Math.round((64.7 + i * 0.08) * 10) / 10);
    for (let i = 0; i < 40; i++) { const w = kg.slice(i, Math.min(i + 7, 40)); wtAvg.push(w.reduce((a, v) => a + v, 0) / w.length); } }
  const r1 = v => (Math.round(v * 10) / 10).toFixed(1);
  const wtc = await page.evaluate(() => { const d = document.getElementById('wtdet'); return { y: [...d.querySelectorAll('.cp-y span')].map(s => s.textContent), x: [...d.querySelectorAll('.cp-x span')].map(s => s.textContent), w: Math.round(d.querySelector('.chart-svg').getBoundingClientRect().width), open: d.open }; });
  check(r, 'Body weight: the y axis is the highest and the lowest kg of its line, the x axis its first and last day, and the chart is not wider than 520 px', JSON.stringify(wtc.y) === JSON.stringify([r1(Math.max.apply(null, wtAvg)) + ' kg', r1(Math.min.apply(null, wtAvg)) + ' kg']) && JSON.stringify(wtc.x) === JSON.stringify(axisFmt(DAY(39), DAY(0))) && wtc.w <= 520, { wtc, want: [r1(Math.max.apply(null, wtAvg)), r1(Math.min.apply(null, wtAvg)), axisFmt(DAY(39), DAY(0))] });

  // ── 4. The ✎ editor ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  await page.evaluate(() => {
    const row = window.__DB.programs.find(p => p.athlete_id === 'ava_test');
    row.data.workouts.days[0].blocks[1].exercises[0].intent = 'neutral grip';
    row.data.workouts.days[0].blocks[1].exercises[1].intent = 'Right leg first · glute focus';
    return reloadPrograms().then(() => render());
  });
  await L.settle(page, 600);
  await page.evaluate(() => { const d = document.getElementById('wday-1'); if (d && !d.classList.contains('open')) d.querySelector('.wday-top').click(); });
  await L.settle(page, 200);
  await page.mouse.move(2, 2);
  const pen = rowLoc(page, 'Goblet Squat').locator('.rx-edit');
  const grey = async () => pen.evaluate(el => { const c = getComputedStyle(el); const m = c.color.match(/[\d.]+/g).map(Number); return { opacity: c.opacity, rgb: m.slice(0, 3), vis: c.visibility, box: (() => { const q = el.getBoundingClientRect(), p = el.closest('.cmp-row').getBoundingClientRect(); return q.width > 0 && q.height > 0 && q.left >= p.left && q.right <= p.right && q.top >= p.top && q.bottom <= p.bottom; })() }; });
  const rest = await grey();
  check(r, 'at 1440 the ✎ is visible at rest (not hidden until hover), a faint grey glyph, inside its row', (await pen.isVisible()) && rest.opacity === '1' && rest.vis === 'visible' && rest.box && Math.max.apply(null, rest.rgb) - Math.min.apply(null, rest.rgb) <= 12, rest);
  await pen.hover(); await L.settle(page, 250);
  const hov = await grey();
  check(r, 'and it goes to the dark green on hover', hov.rgb[1] > hov.rgb[0] + 20 && hov.rgb[1] <= 80 && hov.opacity === '1', { rest: rest.rgb, hov });
  await page.mouse.move(2, 2);
  let ed = await openEditor(page, 'Goblet Squat');
  const fields = await ed.evaluate(e => ({ labels: [...e.querySelectorAll('.exed-grid .exf')].map(f => f.firstElementChild.textContent.trim()),
    tops: [...e.querySelectorAll('.exed-grid .exf')].map(f => Math.round(f.getBoundingClientRect().top)), hs: [...e.querySelectorAll('.exed-grid .exf')].map(f => Math.round(f.getBoundingClientRect().height)),
    ctl: (() => { const s = e.querySelector('select').getBoundingClientRect(), i = e.querySelector('[id^="exSets-"]').getBoundingClientRect(); const cs = getComputedStyle(e.querySelector('select')), ci = getComputedStyle(e.querySelector('[id^="exSets-"]')); return { sh: Math.round(s.height), ih: Math.round(i.height), sf: cs.fontFamily === ci.fontFamily, sb: cs.borderTopColor === ci.borderTopColor && cs.borderRadius === ci.borderRadius }; })() }));
  check(r, 'the seven fields are one row: same top, same height, the Dose select drawn like the boxes', fields.labels.join() === 'Sets,Dose,Value,Per side,RPE,Tempo,Rest' && new Set(fields.tops).size === 1 && new Set(fields.hs).size === 1 && fields.ctl.sh === fields.ctl.ih && fields.ctl.sf && fields.ctl.sb, fields);
  const pills = async () => ed.evaluate(e => ({ chips: [...e.querySelectorAll('.pp-chip')].map(c => c.textContent.replace('✕', '').trim()), link: e.querySelector('.pp-toggle').textContent.trim(), buttons: [...e.querySelectorAll('.pp')].filter(p => p.getClientRects().length).length,
    groupsHidden: e.querySelector('.pp-groups').hidden }));
  let pl = await pills();
  check(r, 'the pill groups are folded: the pill on the card is a chip with a ✕, and the link says Change pill', pl.groupsHidden && pl.buttons === 0 && pl.chips.join() === 'neutral grip' && pl.link === 'Change pill' && (await ed.locator('.pp-chip .pp-x').count()) === 1, pl);
  await ed.locator('.pp-toggle').click();
  pl = await pills();
  check(r, 'Change pill opens the six groups, the card\'s pill marked on', !pl.groupsHidden && pl.buttons > 15 && (await ed.locator('.pp.on:visible').allInnerTexts()).join() === 'neutral grip' && pl.link === 'Done', pl);
  await ed.locator('.pp', { hasText: /^wide grip$/ }).click();
  check(r, 'picking one in the same group takes its place, and the chip follows', (await pills()).chips.join() === 'wide grip', await pills());
  await page.evaluate(() => { assemble(); render(); }); await L.settle(page, 600);
  ed = page.locator('.rx-editor[style*="block"]').first();
  pl = await pills();
  check(r, 'the groups stay open, and the chip stays, through a redraw while the editor is open', (await page.locator('.rx-editor[style*="block"]').count()) === 1 && !pl.groupsHidden && pl.buttons > 15 && pl.chips.join() === 'wide grip', pl);
  await ed.locator('.pp-chip .pp-x').click();
  pl = await pills();
  check(r, 'the ✕ on a chip takes the pill off, and no button in the open groups stays on', pl.chips.length === 0 && pl.link === 'Done' && (await ed.locator('.pp.on').count()) === 0, pl);
  await ed.locator('.pp-toggle').click();
  pl = await pills();
  check(r, 'Done folds the groups again, and with no pill the link says Add a pill', pl.groupsHidden && pl.buttons === 0 && pl.link === 'Add a pill', pl);
  await ed.locator('.exed-acts button', { hasText: 'Cancel' }).click(); await L.settle(page, 200);
  // a value off the pill list stays in view with its two ways out, whatever is folded
  ed = await openEditor(page, 'Chest-Supported Dumbbell Row');
  pl = await pills();
  check(r, 'a value off the list is shown in clay with Move to the note and Drop it while the groups are folded; the list value shows as a chip', pl.groupsHidden && (await ed.locator('.pp-off:visible').count()) === 1 && (await ed.locator('.pp-off:visible button').allInnerTexts()).join() === 'Move to the note,Drop it' && pl.chips.join() === 'right side first', { pl, off: await ed.locator('.pp-off').allInnerTexts() });
  await ed.locator('.exed-acts button', { hasText: 'Cancel' }).click(); await L.settle(page, 200);
  // no sideways scroll on The work with the charts, the weight and an editor open, with its groups open
  for (const w of [390, 320]) {
    await page.setViewportSize({ width: w, height: 844 });
    await L.go(page, 'athletes'); await L.go(page, 'a/ava_test/work');
    await page.evaluate(() => { document.getElementById('chartbox').style.display = 'block'; document.getElementById('wtdet').open = true; const d = document.getElementById('wday-1'); if (d && !d.classList.contains('open')) d.querySelector('.wday-top').click(); });
    await L.settle(page, 250);
    // an editor left open by the last round comes back with the page (its typed work and its open groups survive a redraw): that is the one to look at
    const e2 = (await page.locator('.rx-editor[style*="block"]').count()) ? page.locator('.rx-editor[style*="block"]').first() : await openEditor(page, 'Goblet Squat');
    if (await e2.locator('.pp-groups').evaluate(g => g.hidden)) await e2.locator('.pp-toggle').click();
    await L.settle(page, 150);
    const o = await overflow(page);
    // the page clips a day card at its edge, so also ask whether anything inside the editor reaches past the screen
    const edge = await page.evaluate(() => [...document.querySelectorAll('.rx-editor[style*="block"] *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1).slice(0, 3).map(el => el.tagName + '.' + el.className));
    check(r, `The work with the charts, the weight and the editor with its pill groups open at ${w} px: no sideways scroll, nothing in the editor past the screen`, o.over <= 0 && edge.length === 0, { o, edge });
  }
  check(r, 'no page errors (charts and editor)', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

// ── The preview says what it shows (audit TOOLS-11, pile A7; 2026-10-11) ─────────────────────────────────────────────────────────────
S['file-preview-wording'] = async (b) => {
  const r = { id: 'file-preview-wording', title: 'The File tab says the preview shows the programme only, and the preview bar in program.html says the same', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'a/ava_test/file' });
  // Since 2026-10-12 Their app is a row of Contact and access: its one-line hint is on the row and its full explanation (what the preview
  // shows and does not) is the group's How this works, one tap away. textContent reads a folded fold too.
  const panel = await page.evaluate(() => {
    const row = [...document.querySelectorAll('.frow')].find(x => /their app/i.test(x.querySelector('.frow-l').textContent));
    const how = document.getElementById('how-contact');
    const theirs = how ? [...how.querySelectorAll('p')].find(p => /their app/i.test(p.textContent)) : null;
    return ((row ? row.innerText : '') + ' ' + (theirs ? theirs.textContent : '')).replace(/\s+/g, ' ').trim();
  });
  check(r, 'the File tab does not promise "their real data" or "exactly as they see it"', !!panel && !/real data|exactly as they see/i.test(panel), panel);
  check(r, 'it says the preview shows the programme only', /programme only/.test(panel), panel);
  check(r, 'it says what is not in it (sets, weights, records, habits) and where to read that (The work and Proof)', /sets, weights, records, habits/.test(panel) && /The work and Proof/.test(panel), panel);
  // The two buttons still open the read-only preview of this athlete.
  await page.evaluate(() => { window.__opened = []; window.open = u => { window.__opened.push(String(u)); return null; }; });
  // (The header carries a View their app too, on every sub-tab: these are the File's own two buttons.)
  await page.locator('#tabbody').getByRole('button', { name: 'View their app' }).click();
  await page.locator('#tabbody').getByRole('button', { name: 'View their Proof' }).click();
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
  await page.locator('#hidden-sessions button', { hasText: 'Delete for good' }).click();   // opens the panel under the row (dangerAsk); nothing is deleted yet
  await page.locator('#hidden-sessions #dangerGo').waitFor();
  const confirmText = (await page.locator('#hidden-sessions .dangerask').innerText()).replace(/\s+/g, ' ');
  check(r, 'it asked first, in a panel under the row: nothing deleted yet', !(await L.callsSince(page, n0)).some(x => x.name === 'session_history' && x.op === 'delete'), confirmText);
  await page.locator('#hidden-sessions #dangerGo').click();
  await L.settle(page, 900);
  const del = (await L.callsSince(page, n0)).filter(x => x.name === 'session_history' && x.op === 'delete').slice(-1)[0];
  check(r, 'Delete for good deletes by athlete, day, date AND only a hidden row', !!del && del.filters.length === 4 && del.filters.some(f => /hidden_at/.test(String(f))), del && del.filters);
  check(r, 'the panel said it can only come back from a backup file, and what stays', /for good/.test(confirmText) && /backup file/.test(confirmText) && /Stays: Their other sessions/.test(confirmText) && !log.dialogs.some(d => d.type === 'confirm'), confirmText);
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
  const r = { id: 'intake-outcome', title: "Leads → Applications: an application records what happened and the athlete it became; the athlete's File says where they came from and opens that application", checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'intake' });   // the old address: it lands on Leads
  // (2026-10-12, round 2: the application on show is the detail on the right, chosen from the list; its row wears the outcome pill and says which group it is in.)
  const row = name => page.locator('.in-row', { hasText: name });
  const choose = async name => { await row(name).click(); await L.settle(page, 200); };
  const detail = page.locator('.in-detail');
  const badge = async () => (await page.locator('#rail a.tab', { hasText: 'Leads' }).innerText()).replace(/\s+/g, ' ');
  const b0 = await badge();
  const one = detail;       // the newest new application is on show when the tab opens: Fixture Applicant One
  check(r, 'the application on show when the tab opens is Fixture Applicant One', /Fixture Applicant One/.test(await detail.locator('.in-title').textContent()), await detail.locator('.in-title').textContent());
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
  const t1 = (await row('Fixture Applicant One').evaluate(el => el.textContent) + ' ' + await one.evaluate(el => el.textContent)).replace(/\s+/g, ' ');   // the row wears the pill, the detail names the athlete
  check(r, 'it moved to Handled (and stays on show), its row wears the outcome as a pill, the detail names the athlete, and the Leads badge dropped', (await row('Fixture Applicant One').getAttribute('data-st')) === 'handled' && /Became a client/.test(await row('Fixture Applicant One').innerText()) && /Ava Example/.test(await one.innerText()) && (await badge()) !== b0, { st: await row('Fixture Applicant One').getAttribute('data-st'), t1: t1.slice(0, 200), badge: await badge() });
  check(r, 'the server row holds the link and the outcome, and marked the application handled', await page.evaluate(() => { const i = window.__DB.hab_intake.find(x => /1a1$/.test(x.id)); return i.athlete_id === 'ava_test' && i.outcome === 'client' && i.status === 'handled' && !!i.linked_at; }), '');
  // 2. an outcome that keeps no athlete
  await choose('Fixture Applicant Two');
  const two = detail;
  await two.locator('.i-out-sel').selectOption('not_a_fit');
  check(r, 'a "Not a fit" has no athlete picker', !(await two.locator('.i-who').isVisible()), '');
  n0 = await L.nCalls(page);
  await two.locator('.intake-outcome-save').click(); await L.settle(page, 900);
  const c2 = lastOf(await L.callsSince(page, n0), c => c.name === 'set_intake_outcome');
  check(r, 'it is saved with no athlete', !!c2 && c2.payload.p_outcome === 'not_a_fit' && c2.payload.p_athlete_id === null, c2 && c2.payload);
  // 3. the athlete's File says where they came from
  await L.go(page, 'a/ava_test/file'); await L.settle(page, 700);
  // (2026-10-12: Came from is a row of Contact and access, no longer a line of the Program file table.)
  const cameRow = page.locator('.frow', { has: page.locator('.frow-l', { hasText: /^came from$/i }) });
  const meta = (await cameRow.first().innerText()).replace(/\s+/g, ' ');
  check(r, 'the File says "Came from" the application, its programme and its outcome, with a link that opens it in Leads', /came from/i.test(meta) && /Set — \$180/.test(meta) && /Became a client/.test(meta) && (await cameRow.locator('a[href="#leads"]').count()) === 1, meta.slice(0, 400));
  await cameRow.locator('a[href="#leads"]').first().click(); await L.settle(page, 700);
  check(r, 'the link goes to Leads with THAT application on show (Application One, not the Two chosen a moment ago)', (await page.evaluate(() => location.hash)) === '#leads' && /Fixture Applicant One/.test(await detail.locator('.in-title').textContent()), { hash: await page.evaluate(() => location.hash), shown: await detail.locator('.in-title').textContent() });
  // 4. clearing it
  await L.go(page, 'leads'); await L.settle(page, 500);
  await choose('Fixture Applicant One');
  await detail.locator('.i-out-sel').selectOption('');
  n0 = await L.nCalls(page);
  await detail.locator('.intake-outcome-save').click(); await L.settle(page, 900);
  const c3 = lastOf(await L.callsSince(page, n0), c => c.name === 'set_intake_outcome');
  check(r, 'clearing sends a null outcome and no athlete', !!c3 && c3.payload.p_outcome === null && c3.payload.p_athlete_id === null, c3 && c3.payload);
  await L.go(page, 'a/ava_test/file'); await L.settle(page, 700);
  check(r, 'and the File no longer says where they came from', !/came from/i.test(await page.locator('#tabbody').innerText()), '');
  // 5. a server without stage61
  await L.go(page, 'intake'); await L.settle(page, 500);
  await page.evaluate(() => { window.__STUB.missingRpc = ['set_intake_outcome']; });
  await choose('Fixture Applicant One');
  await detail.locator('.i-out-sel').selectOption('declined');
  await detail.locator('.intake-outcome-save').click(); await L.settle(page, 700);
  check(r, 'a server that has not had stage61 says so, in words', /set_intake_outcome yet/.test(await L.failText(page)) && /stage61/.test(await L.failText(page)), await L.failText(page));
  // 6. the likely athlete is suggested, never saved on its own
  await page.evaluate(() => { window.__STUB.missingRpc = []; window.__DB.hab_intake.push({ id: 'guess-1', created_at: new Date().toISOString(), lang: 'en', name: 'Ava  Example', email: '', contact: '', programme: 'Set', payload: {}, status: 'new', handled_at: null }); return hardRefresh(); });
  await L.settle(page, 900); await L.go(page, 'intake'); await L.settle(page, 500);
  await page.locator('.in-row[data-id="guess-1"]').click(); await L.settle(page, 200);
  check(r, 'an application with the same full name as one athlete has that athlete pre-selected', (await page.locator('.i-outcome[data-id="guess-1"] .i-ath-sel').inputValue()) === 'ava_test', await page.locator('.i-outcome[data-id="guess-1"] .i-ath-sel').inputValue());
  check(r, '...and a saved outcome is only what the coach saved (nothing was sent for it)', await page.evaluate(() => { const i = window.__DB.hab_intake.find(x => x.id === 'guess-1'); return !i.athlete_id && !i.outcome; }), '');
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

// ── The Intake tab as a list and a detail (round 2 of the coach UX pass; 2026-10-12) ─────────────────────────────────────────────────────────
S['intake-list-detail'] = async (b) => {
  const r = { id: 'intake-list-detail', title: 'Intake: the list and the chosen application side by side at 1440, one at a time below 1000 px, a Farsi answer in its own right-to-left cell, one primary button in the closing row', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'intake' });
  await page.setViewportSize({ width: 1440, height: 900 }); await L.settle(page, 300);
  const row = name => page.locator('.in-row', { hasText: name });
  const title = async () => ((await page.locator('.in-detail .in-title').textContent()) || '').trim();
  const box = sel => page.locator(sel).first().boundingBox();
  // textContent, not innerText: the group labels are drawn in small capitals now (round 3's look), and innerText follows the rendering
  const heads = async () => (await page.locator('.in-list .in-gh').allTextContents()).map(t => t.replace(/\s+/g, ' ').trim());
  const grp = name => row(name).getAttribute('data-st');
  const quiet = async () => (await page.locator('.in-detail .in-quiet .btn').allInnerTexts()).map(t => t.trim());
  const noOverflow = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  // 1. side by side; the newest new application is on show
  const lb = await box('.in-list'), db = await box('.in-detail');
  check(r, 'at 1440 the list (about 320 px wide) and the application stand side by side, tops level', !!lb && !!db && lb.width > 300 && lb.width < 340 && db.x >= lb.x + lb.width && Math.abs(db.y - lb.y) < 4, { lb, db });
  check(r, 'the newest NEW application (Fixture Applicant One, not the older new one or the handled one) is on show and its row is marked', /^Fixture Applicant One$/.test(await title()), await title());
  check(r, '...the row says so too (aria-current), and no other row does', (await row('Fixture Applicant One').getAttribute('aria-current')) === 'true' && (await page.locator('.in-row[aria-current]').count()) === 1, '');
  check(r, 'the list has the groups New · 2 and Handled · 1', JSON.stringify(await heads()) === JSON.stringify(['New · 2', 'Handled · 1']), await heads());
  // more applications: a Farsi one (the newest), an archived one
  await page.evaluate(() => {
    const now = Date.now();
    window.__DB.hab_intake.push(
      { id: 'fa-1', created_at: new Date(now - 3600e3).toISOString(), lang: 'fa', name: 'سارا محمدی', email: 'sara.fa@example.invalid', contact: '۰۹۱۲۱۲۳۴۵۶۷', programme: 'Set — $180 / 3 months',
        payload: { 'Age': '29', 'Goals': ['قدرت سرویس', 'استقامت'], 'Current Injury': 'درد شانه راست', 'Level': 'Club', 'Notes': 'من هفته های گذشته بعد از تمرین سنگین سرویس درد دارم و میخوام برنامه ای بگیرم که با سرک من سازگار باشد و بتونم هفته ای چهار روز تمرین کنم' }, status: 'new', handled_at: null },
      { id: 'arch-1', created_at: new Date(now - 12 * 86400e3).toISOString(), lang: 'en', name: 'Fixture Archived', email: 'arch@example.invalid', contact: '', programme: null, payload: { 'Location': 'Nowhere' }, status: 'archived', handled_at: new Date(now - 11 * 86400e3).toISOString() });
    return hardRefresh();
  });
  await L.settle(page, 900);
  check(r, 'a newer application arriving does not take the screen away from the one on show', /Fixture Applicant One/i.test(await title()), await title());
  check(r, 'the groups are New · 3, Handled · 1 and a FOLDED Archived · 1', JSON.stringify(await heads()) === JSON.stringify(['New · 3', 'Handled · 1', 'Archived · 1']) && !(await page.locator('.in-arch').evaluate(d => d.open)) && !(await row('Fixture Archived').isVisible()), await heads());
  const rowText = (await row('Fixture Applicant One').innerText()).replace(/\s+/g, ' ');
  check(r, 'a row carries initials, the EN or FA pill, the programme in short and when it arrived', /^FO$/.test((await row('Fixture Applicant One').locator('.ava').innerText()).trim()) && /EN/.test(rowText) && /Set/.test(rowText) && !/\$180/.test(rowText) && /today|yesterday|days ago/.test(rowText), rowText);
  // 2. choosing another shows it
  await row('Fixture Applicant Two').click(); await L.settle(page, 250);
  check(r, 'choosing another application shows it, and the mark moves', /Fixture Applicant Two/i.test(await title()) && (await row('Fixture Applicant Two').getAttribute('aria-current')) === 'true' && !(await row('Fixture Applicant One').getAttribute('aria-current')), await title());
  // 3. the choice survives a redraw and a status change
  await page.evaluate(() => hardRefresh()); await L.settle(page, 900);
  check(r, 'the choice survives a reload of the data', /Fixture Applicant Two/i.test(await title()), await title());
  const n0 = await L.nCalls(page);
  await page.locator('.in-detail .intake-act[data-to=handled]').click(); await L.settle(page, 500);
  check(r, 'Mark handled sends the status and nothing else', (await L.callsSince(page, n0)).filter(c => c.kind === 'rpc' && /^set_intake/.test(c.name)).map(c => c.name).join() === 'set_intake_status', (await L.callsSince(page, n0)).map(c => c.name));
  check(r, '...it moves to Handled but stays on show', (await grp('Fixture Applicant Two')) === 'handled' && /Fixture Applicant Two/i.test(await title()) && JSON.stringify(await heads()) === JSON.stringify(['New · 2', 'Handled · 2', 'Archived · 1']), { grp: await grp('Fixture Applicant Two'), title: await title(), heads: await heads() });
  check(r, '...and, now handled, its quiet buttons are Reopen and Archive (no Mark handled)', JSON.stringify(await quiet()) === JSON.stringify(['Reopen', 'Archive']), await quiet());
  // 4. a Farsi application: each answer in its own cell, right-to-left inside it
  await row('سارا محمدی').click(); await L.settle(page, 250);
  const geo = await page.evaluate(() => {
    const pane = document.querySelector('.in-detail').getBoundingClientRect();
    const qs = [...document.querySelectorAll('.in-detail .in-q')].map(q => {
      const dt = q.querySelector('dt').getBoundingClientRect(), dd = q.querySelector('dd'), d = dd.getBoundingClientRect(), qb = q.getBoundingClientRect(), cs = getComputedStyle(dd);
      return { label: q.querySelector('dt').textContent, dir: dd.getAttribute('dir'), align: cs.textAlign, direction: cs.direction, long: q.classList.contains('long'), q: { x: qb.x, w: qb.width, top: qb.top }, dt: { r: dt.right }, dd: { x: d.x, r: d.right } };
    });
    return { pane: { x: pane.x, w: pane.width }, qs };
  });
  const rtl = geo.qs.filter(q => q.dir === 'rtl'), notRtl = geo.qs.filter(q => q.dir !== 'rtl');
  check(r, 'the Farsi answers (goals, injury, notes) carry dir=rtl and are right-aligned; the Latin ones (age, level) do not', rtl.length === 3 && rtl.every(q => q.direction === 'rtl' && q.align === 'right') && notRtl.length === 2 && notRtl.every(q => q.direction === 'ltr' && q.align !== 'right'), geo.qs.map(q => [q.label, q.dir, q.align]));
  check(r, 'each answer sits inside its own cell pair, to the right of its label, and a short answer\'s pair is half the pane, so it is not pushed to the far edge', geo.qs.filter(q => !q.long).every(q => q.dd.x >= q.dt.r - 1 && q.dd.r <= q.q.x + q.q.w + 1 && q.q.w < geo.pane.w * 0.55), geo.qs.map(q => [q.label, Math.round(q.q.w), Math.round(q.dd.r)]));
  const pairs = geo.qs.filter(q => !q.long);
  check(r, 'two pairs to a row on a wide screen (the first two share a top and are side by side); a long answer takes the whole row', pairs.length >= 2 && Math.abs(pairs[0].q.top - pairs[1].q.top) < 2 && pairs[1].q.x > pairs[0].q.x + 100 && geo.qs.some(q => q.long && q.q.w > geo.pane.w * 0.8), pairs.slice(0, 2).map(q => q.q));
  const email = await page.locator('.in-contact a[href^="mailto:"]').count(), wa = await page.locator('.in-contact a[href^="https://wa.me/"]').getAttribute('href');
  check(r, 'the contact row has the email (mailto), a WhatsApp link built from the Persian digits, and a Copy beside each', email === 1 && wa === 'https://wa.me/989121234567' && (await page.locator('.in-contact .copy-btn-js').count()) === 2, wa);
  // 5. one way to close: Save outcome is the only primary button; the quiet ones sit beside it
  check(r, 'in the closing row Save outcome is the only primary button', (await page.locator('.in-detail .i-outcome .btn.primary').count()) === 1 && (await page.locator('.in-detail .i-outcome .btn.primary.intake-outcome-save').count()) === 1, '');
  check(r, '...next to it, the quiet ones: Mark handled and Archive (a new application)', JSON.stringify(await quiet()) === JSON.stringify(['Mark handled', 'Archive']) && (await page.locator('.in-detail .in-quiet .btn.primary').count()) === 0, await quiet());
  const sb = await box('.in-detail .intake-outcome-save'), mb = await box('.in-detail .intake-act[data-to=handled]');
  check(r, '...all in one row (What happened, Save outcome and the quiet ones level)', Math.abs(sb.y - mb.y) < 4 && (await page.locator('.in-detail .i-out-sel').isVisible()), { sb, mb });
  check(r, 'Which athlete shows only when the outcome keeps one', !(await page.locator('.in-detail .i-who').isVisible()) && (await page.locator('.in-detail .i-out-sel').selectOption('client'), await page.locator('.in-detail .i-who').isVisible()) && (await page.locator('.in-detail .i-out-sel').selectOption('not_a_fit'), !(await page.locator('.in-detail .i-who').isVisible())), '');
  // 6. Mark handled (no outcome), Archive and Reopen still work
  let n1 = await L.nCalls(page);
  await page.locator('.in-detail .intake-act[data-to=handled]').click(); await L.settle(page, 500);
  let cs = await L.callsSince(page, n1);
  check(r, 'Mark handled closes it with NO outcome: one set_intake_status(handled), no set_intake_outcome', cs.filter(c => c.name === 'set_intake_status').length === 1 && cs.filter(c => c.name === 'set_intake_status')[0].payload.p_status === 'handled' && !cs.some(c => c.name === 'set_intake_outcome') && (await grp('سارا محمدی')) === 'handled', cs.map(c => c.name));
  n1 = await L.nCalls(page);
  await page.locator('.in-detail .intake-act[data-to=archived]').click(); await L.settle(page, 500);
  cs = await L.callsSince(page, n1);
  check(r, 'Archive → archived; the folded group opens so the one on show is not hidden, and the application is still on show', cs.filter(c => c.name === 'set_intake_status').length === 1 && (await grp('سارا محمدی')) === 'archived' && await page.locator('.in-arch').evaluate(d => d.open) && await row('سارا محمدی').isVisible() && (await title()) === 'سارا محمدی', await grp('سارا محمدی'));
  check(r, '...an archived application offers only Reopen', JSON.stringify(await quiet()) === JSON.stringify(['Reopen']), await quiet());
  n1 = await L.nCalls(page);
  await page.locator('.in-detail .intake-act[data-to=new]').click(); await L.settle(page, 500);
  check(r, 'Reopen → new again, back under New', (await grp('سارا محمدی')) === 'new' && JSON.stringify(await quiet()) === JSON.stringify(['Mark handled', 'Archive']), await grp('سارا محمدی'));
  // 7. the list keeps its place when one is chosen (a long list scrolls by itself)
  await page.evaluate(() => { const D = window.__DB; for (let n = 0; n < 40; n++) D.hab_intake.push({ id: 'bulk-' + n, created_at: new Date(Date.now() - (14 + n) * 86400e3).toISOString(), lang: 'en', name: 'Bulk ' + n, email: '', contact: '', programme: null, payload: {}, status: 'handled', handled_at: null }); return hardRefresh(); });
  await L.settle(page, 900);
  await page.evaluate(() => { document.querySelector('.in-list').scrollTop = 500; });
  const sy0 = await page.evaluate(() => document.querySelector('.in-list').scrollTop);
  const pick = page.locator('.in-row', { hasText: 'Bulk 9' }).first();
  await pick.click(); await L.settle(page, 250);
  const sy1 = await page.evaluate(() => document.querySelector('.in-list').scrollTop);
  check(r, 'the list is its own scroll box on a wide screen, and choosing a row does not move it', sy0 > 300 && Math.abs(sy1 - sy0) < 3 && /Bulk 9/.test(await title()), { sy0, sy1 });
  check(r, 'no horizontal overflow at 1440', await noOverflow(), '');
  // 8. the 1000 px line
  await page.setViewportSize({ width: 1000, height: 800 }); await L.settle(page, 250);
  const l1 = await box('.in-list'), d1 = await box('.in-detail');
  check(r, 'at 1000 px it is still a list beside the application', !!l1 && !!d1 && d1.x >= l1.x + l1.width - 1 && await noOverflow(), { l1, d1 });
  // 9. below 1000 px: the list, then the application INSTEAD of it, with a way back (a fresh page: nothing chosen by hand yet)
  await page.context().close();
  for (const w of [999, 390, 320]) {
    const o = await L.openCoach(b, { hash: 'intake' });
    const p = o.page;
    await p.evaluate(() => { const now = Date.now(); window.__DB.hab_intake.push({ id: 'fa-1', created_at: new Date(now - 3600e3).toISOString(), lang: 'fa', name: 'سارا محمدی', email: 'sara.fa.with.a.rather.long.address@example.invalid', contact: '۰۹۱۲۱۲۳۴۵۶۷', programme: 'Set — $180 / 3 months', payload: { 'Age': '29', 'Goals': ['قدرت سرویس', 'استقامت'], 'Notes': 'من هفته های گذشته بعد از تمرین سنگین سرویس درد دارم و میخوام برنامه ای بگیرم که با سرک من سازگار باشد و بتونم هفته ای چهار روز تمرین کنم' }, status: 'new', handled_at: null }); return hardRefresh(); });
    await L.settle(p, 900);
    await p.setViewportSize({ width: w, height: 844 }); await L.settle(p, 300);
    const vis = sel => p.locator(sel).first().isVisible();
    const ov = () => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    check(r, `at ${w}: the list is the screen and the application is not drawn, with no horizontal overflow`, (await vis('.in-list')) && !(await vis('.in-detail')) && await ov(), '');
    await p.locator('.in-row', { hasText: 'سارا محمدی' }).click(); await L.settle(p, 250);
    check(r, `at ${w}: choosing one shows it INSTEAD of the list, with "← All applications" at the top`, !(await vis('.in-list')) && (await vis('.in-detail')) && /All applications/.test(await p.locator('.in-back').innerText()) && (await p.locator('.in-back').isVisible()), '');
    await p.locator('.in-detail .i-out-sel').selectOption('client'); await L.settle(p, 100);
    const g = await p.evaluate(() => { const qs = [...document.querySelectorAll('.in-detail .in-q')].map(q => q.getBoundingClientRect()); return { stacked: qs.length >= 2 && qs[1].top > qs[0].bottom - 1 && Math.abs(qs[0].left - qs[1].left) < 2, rtl: document.querySelectorAll('.in-detail dd[dir=rtl]').length }; });
    // one question per row once the application itself is narrower than about 700 px; at 999 the full-width application is 900 px, so it keeps two
    check(r, `at ${w}: ${w < 700 ? 'one question per row' : 'two questions to a row'}, the Farsi answers still right-to-left, the athlete picker open, and nothing runs off the screen`, g.stacked === (w < 700) && g.rtl >= 2 && await p.locator('.in-detail .i-who').isVisible() && await ov(), g);
    await p.locator('.in-back').click(); await L.settle(p, 250);
    check(r, `at ${w}: "← All applications" returns to the list`, (await vis('.in-list')) && !(await vis('.in-detail')) && (await p.locator('.in-row[aria-current]').count()) === 1, '');
    check(r, `at ${w}: no page errors`, !o.log.errors.length, o.log.errors);
    await p.context().close();
  }
  check(r, 'no page errors', !log.errors.length, log.errors);
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
  await L.go(page, 'a/zed_erase/file'); await openDanger(page);
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
  await L.go(page, 'leads/signups'); await L.settle(page, 600);   // the signup funnel is Leads → Free signups since 2026-10-12
  check(r, 'and it is not in the signup funnel (Leads → Free signups)', !/ben_test/.test(await page.locator('#content').innerText()) && /cara_free/.test(await page.locator('#content').innerText()), '');
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
  const r = { id: 'tools-button', title: 'The roster starts under the filter chips: Coach tools, Logins to send and Create missing logins sit behind one ⚙ Tools button, now in the top bar (360 px phone)', checks: [] };
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
  await page.evaluate(() => render());   // a whole-screen redraw (the button is in the top bar now, not in the roster that redraws)
  check(r, 'it stays open through a redraw', await page.locator('#toolsPanel').isVisible(), '');
  await page.locator('#toolsBtn').click();
  check(r, 'and closes again', await page.locator('#toolsPanel').isHidden(), '');
  // A menu closes when you go somewhere (round 3 merge, 2026-10-12): left open, it sat over the Library's publish buttons.
  await page.locator('#toolsBtn').click();
  await L.go(page, 'links');
  check(r, 'it closes when you go to another screen, and its button says so', await page.locator('#toolsPanel').isHidden() && (await page.locator('#toolsBtn').getAttribute('aria-expanded')) === 'false', '');
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
  const pops = () => log.dialogs.filter(d => d.via === undefined);   // real pop-ups only: a failure line is via 'bar', a notice() via 'notice'
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
  await L.jsClick(page.locator('.in-detail', { hasText: 'Fixture Applicant One' }).locator('.intake-act[data-to=handled]'));
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

// ── The athlete header and the File's four groups (2026-10-12, round 1 of the coach.html redesign) ──────────────────────────────────────
// The header says why this person needs you and where their cycle is, on every sub-tab (the dark cycle block on The work is gone); the File is
// four groups in one order, the Danger zone is shut until it is needed, and Forget lives there, not in the Proof funnel's row.
S['file-groups'] = async (b) => {
  const r = { id: 'file-groups', title: 'The athlete header (cycle, Needs you, actions) and the File tab: four groups, a folded Danger zone, Forget out of the funnel row', checks: [] };
  const { page, log, today } = await L.openCoach(b, { hash: 'a/ben_test/file' });
  const FX = require('./fixtures');
  const head = async () => (await page.locator('.dethead').innerText()).replace(/\s+/g, ' ');
  const headings = async () => (await page.locator('#tabbody .fh').allInnerTexts()).map(x => x.replace(/\s+/g, ' ').trim());
  const dangerOpen = () => page.evaluate(() => { const d = document.getElementById('dangerzone'); return !!d && d.open; });
  // 1. An undated cycle: its name and focus, and no "week x of y".
  const h0 = await head();
  check(r, 'an undated cycle: the header names the cycle and its focus and has no week text', /Cycle 2 — Made-Up Block/.test(h0) && /Strength base/.test(h0) && !/week \d+ of \d+/i.test(h0), h0);
  // 2. The four groups, in order (Records appears because Ava has old call logs; Ben has nothing for it).
  check(r, 'Ben has no records to show: three groups, in order', JSON.stringify(await headings()) === JSON.stringify(['Contact and access', 'Programme', 'Danger zone']), await headings());
  await L.go(page, 'a/ava_test/file');
  check(r, 'Ava has old call logs: the four groups, in order', JSON.stringify(await headings()) === JSON.stringify(['Contact and access', 'Programme', 'Records', 'Danger zone']), await headings());
  const rowsOf = async () => (await page.locator('#tabbody .fgroup').first().locator('.frow-l').allInnerTexts()).map(x => x.trim());
  check(r, 'Contact and access holds WhatsApp, Login, Status and Their app, in that order', JSON.stringify(await rowsOf()) === JSON.stringify(['WhatsApp', 'Login', 'Status', 'Their app']), await rowsOf());
  check(r, 'no card inside a card: no old section heading or second-level panel is left on the File', (await page.locator('#tabbody .sec').count()) === 0 && (await page.locator('#tabbody .panel .panel').count()) === 0, '');
  // 3. A dated cycle: week x of y, the dates, the days left; Needs you as links to the screen that has each reason.
  await page.evaluate(([as, ae, bs, be]) => {
    const pa = window.__DB.programs.find(x => x.athlete_id === 'ava_test'); pa.data.cycles[0].startDate = as; pa.data.cycles[0].endDate = ae;
    const pb = window.__DB.programs.find(x => x.athlete_id === 'ben_test'); pb.data.cycles[0].startDate = bs; pb.data.cycles[0].endDate = be;
    return hardRefresh();
  }, [FX.daysAgo(today, 8), FX.daysAgo(today, -20), FX.daysAgo(today, 33), FX.daysAgo(today, 5)]);
  await L.settle(page, 900);
  await L.go(page, 'a/ava_test/file'); await L.settle(page, 500);
  const h1 = await head();
  check(r, 'a dated cycle: "week 2 of 4", the dates and "20 days left" sit under the name', /Cycle 2 — Made-Up Block · week 2 of 4 · \d{1,2} [A-Z][a-z]{2} – \d{1,2} [A-Z][a-z]{2} · 20 days left/.test(h1) && /Strength base/.test(h1), h1);
  const needs = await page.locator('.dethead .det-need a').evaluateAll(as => as.map(a => [a.textContent.trim(), a.getAttribute('href'), a.className]));
  check(r, 'Needs you lists each reason as a link to its own sub-tab (the unread note goes to The work, in clay)', /^Needs you:/.test((await page.locator('.det-need').innerText()).trim()) && needs.some(n => /note/.test(n[0]) && n[1] === '#a/ava_test/work' && /warn/.test(n[2])), needs);
  const cycbarFile = await page.locator('.cycbar').count();
  await L.go(page, 'a/ava_test/work'); await L.settle(page, 400);
  check(r, 'the same header (cycle line) is on The work, and the green cycle block is gone from it and from the File', (await page.locator('.dethead .det-cycle').count()) === 1 && (await page.locator('.cycbar').count()) === 0 && cycbarFile === 0, await head());
  await L.go(page, 'a/ava_test/proof'); await L.settle(page, 400);
  check(r, 'and on Proof', (await page.locator('.dethead .det-cycle').count()) === 1 && (await page.locator('.dethead .det-need').count()) === 1, await head());
  await L.go(page, 'a/ben_test/file'); await L.settle(page, 400);
  const h2 = await head();
  const bn = await page.locator('.dethead .det-need a').evaluateAll(as => as.map(a => [a.textContent.trim(), a.getAttribute('href')]));
  check(r, 'a cycle that ended: "ended 5 days ago", and its reason links to the File', /ended 5 days ago/.test(h2) && !/week \d+ of \d+/i.test(h2) && bn.some(n => /renew/.test(n[0]) && n[1] === '#a/ben_test/file'), { h2, bn });
  // 4. The actions on the right: WhatsApp (three cases are in whatsapp-number), View their app with programme days, View their Proof without.
  check(r, 'View their app is in the header when they have programme days', (await page.locator('.dethead .det-acts button', { hasText: 'View their app' }).count()) === 1, await head());
  await L.go(page, 'a/dan_proof/file'); await L.settle(page, 500);
  check(r, 'a habit-only person gets View their Proof instead', (await page.locator('.dethead .det-acts button', { hasText: 'View their Proof' }).count()) === 1 && (await page.locator('.dethead .det-acts button', { hasText: 'View their app' }).count()) === 0, await head());

  // 5. The Danger zone: shut on arrival, open while Erase… is open, kept open across a redraw, shut again on another visit.
  await L.go(page, 'a/ava_test/file'); await L.settle(page, 500);
  check(r, 'the Danger zone is folded on arrival, and what is inside is not on screen', !(await dangerOpen()) && !(await page.locator('button', { hasText: /Erase completely/ }).isVisible()), '');
  const sum = await page.locator('#dangerzone > summary').evaluate(el => ({ t: el.textContent.trim(), c: getComputedStyle(el).color }));
  check(r, 'its summary reads "Danger zone", in clay', sum.t === 'Danger zone' && sum.c === 'rgb(176, 74, 39)', sum);
  await page.locator('#dangerzone > summary').click();
  check(r, 'a tap opens it: Delete training history and Erase completely… are there, each with a line', (await dangerOpen()) && await page.locator('button', { hasText: /Delete training history/ }).isVisible() && await page.locator('button', { hasText: /Erase completely/ }).isVisible() && /one step/.test(await page.locator('#dangerzone').innerText()), '');
  await page.evaluate(() => { assemble(); render(); }); await L.settle(page, 600);
  check(r, 'opened by hand, it is still open after a full redraw', await dangerOpen(), '');
  await page.locator('button', { hasText: /Erase completely/ }).click(); await page.locator('.erase #eraseIn').waitFor();
  check(r, 'with Erase… open the Danger zone is open and the panel is inside it', (await dangerOpen()) && (await page.locator('#dangerzone .erase').count()) === 1, '');
  await page.evaluate(() => { document.getElementById('dangerzone').open = false; assemble(); render(); }); await L.settle(page, 600);
  check(r, 'folded by hand while Erase… is open, a redraw opens it again (the panel is never hidden)', (await dangerOpen()) && (await page.locator('#dangerzone .erase').count()) === 1, '');
  await page.locator('.erase button', { hasText: 'Cancel' }).click(); await L.settle(page, 400);
  check(r, 'Cancel closes the panel and leaves the Danger zone open', (await dangerOpen()) && (await page.locator('.erase').count()) === 0, '');
  await L.go(page, 'athletes'); await L.go(page, 'a/ava_test/file'); await L.settle(page, 400);
  check(r, 'coming back to the File later finds it folded again', !(await dangerOpen()), '');

  // 6. Forget: offered in the File for a free person who signed up, not for a coached athlete, and gone from the funnel row.
  await page.evaluate(() => { window.__DB.hab_contacts.push({ athlete_id: 'ava_test', email: 'ava@example.invalid', whatsapp: '+10000000003', source: 'proof.html', tier: 'free', note: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), display_name: 'Ava' }); return hardRefresh(); });
  await L.settle(page, 900);
  await L.go(page, 'a/ava_test/file'); await openDanger(page);
  check(r, 'a coached athlete who signed up through Proof first is not offered Forget', await page.evaluate(() => isSignup(S.ath.ava_test.contact)) && (await page.locator('button', { hasText: /Forget/ }).count()) === 0, '');
  await L.go(page, 'a/cara_free/file'); await openDanger(page);
  const fb = page.locator('#dangerzone button', { hasText: 'Forget their Proof data…' });
  check(r, 'a free person with a signup record is offered "Forget their Proof data…" in their Danger zone', (await fb.count()) === 1 && await fb.isVisible(), await page.locator('#dangerzone').innerText());
  await L.go(page, 'leads/signups'); await L.settle(page, 700);   // the funnel moved from Proof to Leads → Free signups (2026-10-12)
  const funRow = page.locator('.fun', { hasText: 'cara_free' });
  const acts = (await funRow.locator('.acts').innerText()).replace(/\s+/g, ' ');
  check(r, 'the signup funnel row keeps WhatsApp, copy email and open, and has no forget button', /WhatsApp/.test(acts) && /copy email/.test(acts) && /open/.test(acts) && !/forget/i.test(acts) && (await page.locator('.fun button', { hasText: /forget/i }).count()) === 0, acts);
  await L.go(page, 'a/cara_free/file'); await openDanger(page);
  const n0 = await L.nCalls(page);
  await page.locator('#dangerzone button', { hasText: 'Forget their Proof data…' }).click();   // opens the panel (dangerAsk), still inside the Danger zone
  await page.locator('#dangerzone #dangerGo').waitFor();
  const forgetAsk = (await page.locator('#dangerzone .dangerask').innerText()).replace(/\s+/g, ' ');
  check(r, 'it asks first, in a panel: no call yet', !(await L.callsSince(page, n0)).some(c => c.name === 'forget_contact') && /Forget cara_free\?/.test(forgetAsk) && /PERMANENTLY deletes their contact details/.test(forgetAsk), forgetAsk);
  await page.locator('#dangerGo').click(); await L.settle(page, 900);
  const fg = lastOf(await L.callsSince(page, n0), c => c.name === 'forget_contact');
  check(r, 'then calls forget_contact for that person, with no confirm() dialog', !!fg && fg.payload.p_athlete_id === 'cara_free' && !log.dialogs.some(d => d.type === 'confirm'), { fg: fg && fg.payload, dialogs: log.dialogs.map(d => d.type) });
  check(r, 'and their contact is gone, so the offer goes with it', !(await L.db(page)).hab_contacts.some(c => c.athlete_id === 'cara_free'), '');

  // 7. Narrow screens: no sideways scroll, with the Danger zone and every How this works open.
  await L.go(page, 'a/dan_proof/file'); await L.settle(page, 400);
  await page.evaluate(() => { const d = document.getElementById('dangerzone'); if (d) d.open = true; document.querySelectorAll('details.how').forEach(x => x.open = true); });
  for (const w of [390, 320]) {
    await page.setViewportSize({ width: w, height: 800 }); await L.settle(page, 300);
    const sw = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
    check(r, `at ${w} px the File fits the screen (no sideways scroll)`, sw.sw <= sw.iw, sw);
    await L.go(page, 'a/ava_test/work'); await L.settle(page, 300);
    const sw2 = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
    check(r, `at ${w} px the header fits the screen on The work`, sw2.sw <= sw2.iw, sw2);
    await L.go(page, 'a/dan_proof/file'); await L.settle(page, 300);
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

// ── The week's cap judges every session of its week (Amir, 2026-10-12: "colour against the cap in those weeks"; dayTargetC / rpeTargetOn) ─────────
S['work-week-cap'] = async (b) => {
  const r = { id: 'work-week-cap', title: "The work: in a week capped at RPE 7 every session is judged against 7, check-in or not; a lower day still reads 'that day'; a retest in the closing week keeps its own", checks: [] };
  const { page, log, today } = await L.openCoach(b, { hash: 'a/ava_test/work' });
  const FX = require('./fixtures');
  const LOG1 = ['Day 1 — Legs First (fixture)', 'Status: Complete', '', 'Exercise log:', '', '[Primary]',
    '• Goblet Squat (✓)', '    Set 1: 20 @7 ✓ ×10', '    Set 2: 20 @7 ✓ ×10', '    Set 3: 20 @7 ✓ ×10', '    Set 4: 20 @7 ✓ ×10',
    '• Chest-Supported Dumbbell Row (✓)', '    Set 1: 14 @7 ✓', '    Set 2: 14 @8 ✓', '    Set 3: 14 @9 ✓',
    '', '[Accessory]', '• Machine Leg Press (✓)', '    Set 1: 60 @7 ✓', '    Set 2: 60 @7 ✓', '    Set 3: 60 @7 ✓'].join('\n');
  const LOG2 = ['Day 2 — Upper Push (fixture)', 'Status: Complete', '', 'Exercise log:', '', '[Primary]',
    '• Dumbbell Bench Press (✓)', '    Set 1: 24 @9 ✓ ×8', '    Set 2: 24 @9 ✓ ×8', '    Set 3: 24 @9 ✓ ×8', '    Set 4: 24 @9 ✓ ×8',
    '• Lateral Bound (✓)', '    Set 1: ×6 @6 ✓', '    Set 2: ×6 @6 ✓', '    Set 3: ×6 @6 ✓'].join('\n');
  // The cycle: began 3 days ago (Day 2's session is its first day, Day 1's is yesterday), week 1 capped at RPE 7. Set through the stub's tables, then reloaded.
  const setUp = (o) => page.evaluate(o => {
    const p = window.__DB.programs.find(x => x.athlete_id === 'ava_test');
    Object.assign(p.data.cycles[0], { startDate: o.start, endDate: o.end, weekNotes: { '1': { text: 'Keep every set at RPE 7 or under.', rpeCap: 7 } } });
    p.data.workouts.days[0].blocks[1].exercises[1].test = o.rowTest || undefined;
    const ss = window.__DB.session_history.filter(s => s.athlete_id === 'ava_test');
    const d1 = ss.find(s => s.day === 1 && s.completed_on === o.d1), d2 = ss.find(s => s.day === 2 && s.completed_on === o.d2);
    Object.assign(d1, { summary: o.log1, log: null, readiness: o.rd1 });
    Object.assign(d2, { summary: o.log2, log: null });
    return hardRefresh();
  }, Object.assign({ log1: LOG1, log2: LOG2, d1: FX.daysAgo(today, 1), d2: FX.daysAgo(today, 3), rd1: null }, o));
  const rowOf = (day, name) => page.evaluate(([day, name]) => {
    const card = document.getElementById('wday-' + day);
    const row = card && [...card.querySelectorAll('.cmp-row')].find(x => ((x.querySelector('.cmp-nm') || {}).textContent || '').trim().startsWith(name));
    if (!row) return null;
    const t = el => (el ? el.textContent : '').replace(/\s+/g, ' ').trim();
    return { rx: t(row.querySelector('.rx-rpe')), over: [...row.querySelectorAll('.rpe-set.over')].map(t), under: [...row.querySelectorAll('.rpe-set.under')].map(t),
      perSet: t(row.querySelector('.did-detail')), flags: [...row.querySelectorAll('.cmp-flags .fl')].map(t), meta: t(card.querySelector('.wday-meta')), verdict: t(card.querySelector('.dv')) };
  }, [day, name]);
  const ROW = 'Chest-Supported Dumbbell Row', BENCH = 'Dumbbell Bench Press';

  // 1. A normal day (no check-in) in the capped week.
  await setUp({ start: FX.daysAgo(today, 3), end: FX.daysAgo(today, -32) });
  await L.settle(page, 900);
  let row = await rowOf(1, ROW);
  check(r, 'no check-in, week 1: the RPE-8 row reads "RPE 8 → 7 that week"', row && row.rx === 'RPE 8 → 7 that week', row);
  check(r, '...its 8 and 9 are over (clay), its 7 plain', row && row.over.join() === '8,9' && !row.under.length && /per set: 7 · 8 · 9/.test(row.perSet), row);
  check(r, '...a mean of 8 against 7 is not a flag (under 1.5)', row && !row.flags.length, row && row.flags);
  check(r, 'the day card does not call it a lower day (the meta is the check-in\'s)', row && !/lower day/.test(row.meta), row && row.meta);
  const gob = await rowOf(1, 'Goblet Squat');
  check(r, 'an RPE-7 card is not moved by a cap of 7 (no arrow), and its 7s are plain', gob && gob.rx === 'RPE 7' && !gob.over.length && !gob.under.length, gob);
  const bench = await rowOf(2, BENCH);
  check(r, 'Day 2 (an older check-in with no level), 9s on an RPE-8 card: "→ 7 that week" and "2 over target RPE"', bench && bench.rx === 'RPE 8 → 7 that week' && bench.flags.includes('2 over target RPE'), bench);
  check(r, '...so the day reads off plan', bench && /1 off plan/.test(bench.verdict), bench && bench.verdict);
  const bound = await rowOf(2, 'Lateral Bound');
  check(r, 'an RPE-6 card under a cap of 7 is left alone', bound && bound.rx === 'RPE 6' && !bound.flags.length, bound);

  // 2. The same sessions when the cycle began 10 days ago: yesterday is week 2, which has no note.
  await setUp({ start: FX.daysAgo(today, 10), end: FX.daysAgo(today, -32) });
  await L.settle(page, 900);
  row = await rowOf(1, ROW);
  check(r, 'week 2 (no note): the card as written, no arrow', row && row.rx === 'RPE 8', row);
  check(r, '...its 7 is under (blue), its 8 plain, its 9 over', row && row.under.join() === '7' && row.over.join() === '9', row);

  // 3. A lower day in the capped week: the day moved it, and it says so.
  await setUp({ start: FX.daysAgo(today, 3), end: FX.daysAgo(today, -32), rd1: { level: 'amber', drop: 1, score: 3 } });
  await L.settle(page, 900);
  row = await rowOf(1, ROW);
  check(r, 'a lower day in the capped week reads "RPE 8 → 7 that day"', row && row.rx === 'RPE 8 → 7 that day', row);
  check(r, '...and the day card says lower day', row && /lower day/.test(row.meta), row && row.meta);

  // 4. The closing week (the cycle ends in 4 days) with the row flagged as a retest: it keeps its own target, the lift beside it does not (TST-4).
  await setUp({ start: FX.daysAgo(today, 3), end: FX.daysAgo(today, -4), rowTest: true });
  await L.settle(page, 900);
  row = await rowOf(1, ROW);
  check(r, 'a flagged retest in the closing week keeps RPE 8: no arrow, 7 under, 8 plain, 9 over', row && row.rx === 'RPE 8' && row.under.join() === '7' && row.over.join() === '9', row);
  const bench2 = await rowOf(2, BENCH);
  check(r, '...while the unflagged lift that week is judged against the cap', bench2 && bench2.rx === 'RPE 8 → 7 that week', bench2);
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

// ── Leads → Chats (2026-10-17) ───────────────────────────────────────────────
S['leads-chats'] = async (b) => {
  const r = { id: 'leads-chats', title: 'Leads → Chats: old chats are deleted on open, the rest listed, escaped, and a delete asks first', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'leads/chats' });
  await page.locator('#chView .in-row').first().waitFor();
  await L.settle(page, 400);
  const rows = await page.locator('#chView .in-row').count();
  const db0 = await L.db(page);
  check(r, 'the conversation older than 90 days was deleted when the tab opened, the other two are listed', rows === 2 && db0.chat_conversations.length === 2 && !db0.chat_conversations.some(c => c.visitor === 'fixture-old'), { rows, left: db0.chat_conversations.length });
  const txt = (await page.locator('#content').innerText()).replace(/\s+/g, ' ');
  check(r, 'one hint line and the month line (2 chats, $0.0049)', /Kept 90 days, then deleted/.test(txt) && /This month: 2 chats, \$0\.0049/.test(txt), txt.slice(0, 300));
  check(r, 'a row shows the first message, the turns and the handoff tag', /Fixture question/.test(txt) && /2 turns/.test(txt) && /WhatsApp/.test(txt), txt.slice(0, 300));
  check(r, 'visitor text is escaped (no element made from it)', (await page.locator('#chView .ch-msg b').count()) === 0 && /<b>one<\/b>/.test(await page.locator('#chView .in-detail').innerText()), await page.locator('#chView .in-detail').innerText());
  await page.locator('#chView .in-row').nth(1).click();
  check(r, 'the Farsi chat reads with dir=auto and shows its page', (await page.locator('#chView .ch-msg span[dir=auto]').first().getAttribute('dir')) === 'auto' && /index-fa\.html/.test(await page.locator('#chView .in-detail').innerText()), '');
  const n0 = await L.nCalls(page);
  await page.locator('#chView .ch-del').click();
  await page.locator('#dangerGo').waitFor();
  check(r, 'Delete only opens the panel: no write yet', !(await L.callsSince(page, n0)).some(x => x.kind === 'from' && x.name === 'chat_conversations' && x.op === 'delete'), '');
  await page.locator('#dangerGo').click();
  await L.settle(page, 600);
  const db1 = await L.db(page);
  check(r, 'the chat is deleted on the server and leaves the list', db1.chat_conversations.length === 1 && (await page.locator('#chView .in-row').count()) === 1, db1.chat_conversations.length);
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

// ── Leads → Chats: Not answered yet (stage68, 2026-10-17) ────────────────────
S['leads-chats-gaps'] = async (b) => {
  const r = { id: 'leads-chats-gaps', title: 'Leads → Chats: Not answered yet lists open gaps, marks them with one column, filters, and undoes', checks: [] };
  const { page, log } = await L.openCoach(b, { hash: 'leads/chats' });
  await page.locator('#chView .in-row').first().waitFor();
  await L.settle(page, 500);
  // Not answered yet (stage68): only open gaps, the visitor's question, a one-column write, and the item leaves.
  const gtxt = await page.locator('#chGaps').innerText();
  check(r, 'Not answered yet lists the two open gaps (not the handled one) with the right question, newest first',
    /Not answered yet/.test(gtxt) && (await page.locator('#chGaps .ch-gap').count()) === 2 && /Fixture second question/.test((await page.locator('#chGaps .ch-gap-q').first().innerText())) && !/پاسخ نمونه|سوال نمونه/.test(gtxt) && /Questions the bot could not answer from your facts/.test(gtxt), gtxt);
  check(r, 'the chat with open gaps carries the marker in the list and its gap replies in the transcript',
    (await page.locator('#chView .in-row .ipill.gap').count()) === 1 && (await page.locator('#chView .in-detail .ipill.gap').count()) >= 1, '');
  await page.locator('#chView .ch-gapsonly').click();
  check(r, 'Only with gaps shows just the conversation with an open gap', (await page.locator('#chView .in-row').count()) === 1 && /Fixture question/.test(await page.locator('#chView .in-row').first().innerText()), '');
  await page.locator('#chView .ch-gapsonly').click();
  check(r, 'turning the filter off lists both again', (await page.locator('#chView .in-row').count()) === 2, '');
  await page.locator('#chGaps .ch-gap-open').first().click();
  check(r, 'Open chat selects that conversation', /Fixture question/.test(await page.locator('#chView .in-detail').innerText()), '');
  if (await page.locator('#chView .in-back').isVisible()) await page.locator('#chView .in-back').click();
  const n1 = await L.nCalls(page);
  await page.locator('#chGaps .ch-gap-done').first().click();
  await L.settle(page, 600);
  const wr = (await L.callsSince(page, n1)).filter(x => x.kind === 'from' && x.name === 'chat_messages' && x.op === 'update');
  const db2 = await L.db(page);
  const m7 = db2.chat_messages.find(x => x.id === 7), m2 = db2.chat_messages.find(x => x.id === 2);
  check(r, 'Added to facts writes only gap_handled_at, for that message', wr.length === 1 && JSON.stringify(Object.keys(wr[0].payload)) === '["gap_handled_at"]' && !!m7.gap_handled_at && m2.gap_handled_at === null, wr);
  check(r, 'the item leaves the list and one remains; Undo bar is offered', (await page.locator('#chGaps .ch-gap').count()) === 1 && (await page.locator('#undobar button', { hasText: 'Undo' }).count()) === 1, '');
  await page.locator('#undobar button', { hasText: 'Undo' }).click();
  await L.settle(page, 600);
  const db3 = await L.db(page);
  check(r, 'Undo clears the stamp and the item is back', db3.chat_messages.find(x => x.id === 7).gap_handled_at === null && (await page.locator('#chGaps .ch-gap').count()) === 2, '');
  await page.locator('#chGaps .ch-gap-done').nth(0).click(); await L.settle(page, 500);
  await page.locator('#chGaps .ch-gap-done').nth(0).click(); await L.settle(page, 500);
  check(r, 'with none left the block says nothing is waiting', /Nothing waiting\. Every question so far was in your facts\./.test(await page.locator('#chGaps').innerText()), '');
  check(r, 'no page errors', !log.errors.length, log.errors);
  await page.context().close();
  return r;
};

// ── Career Mode phase 3: the Trophies group on the athlete's File (2026-10-18; read only) ───────────────────────────────────────────────
// It exists only once the newest rulebook's [switch] catalogue is a day. While it is "off" (or the rulebook cannot be read) the group is absent and
// career_awards / career_catalogue are never read; with it on, the File lists titles, achievements and badges (a badge once, at its highest step),
// the retired ones folded under "Retired, still theirs", and a read that fails is a quiet line in the group: no banner, no fail-bar line.
S['career-trophies'] = async (b) => {
  const r = { id: 'career-trophies', title: "The File's Trophies group: absent and never read while the catalogue switch is off; with it on, titles, achievements and badges at their highest step with the retired ones folded; a failed read is a quiet line", checks: [] };
  const NOW = '2026-10-18T10:00:00Z';   // fixes "this year" for the days without a year
  const awardsOf = cs => cs.filter(c => c.kind === 'from' && c.name === 'career_awards' && c.op === 'select');
  const catalogueOf = cs => cs.filter(c => c.kind === 'from' && c.name === 'career_catalogue' && c.op === 'select');
  const heads = async page => (await page.locator('#tabbody .fh').allInnerTexts()).map(x => x.replace(/\s+/g, ' ').trim());
  const rowLines = async (page, label) => (await page.locator('#trophies-body .frow').filter({ has: page.locator('.frow-l', { hasText: new RegExp('^' + label + '$') }) }).locator('.trow').allInnerTexts()).map(x => x.replace(/\s+/g, ' ').trim());
  const quiet = async (page, log) => ({ fail: await L.failText(page), warn: (await page.locator('#loadwarn').innerText()).trim(), alerts: log.dialogs.filter(d => d.type === 'alert' || d.via).map(d => d.message), errors: log.errors });
  const isQuiet = q => !q.fail && !q.warn && !q.alerts.length && !q.errors.length;
  const ALL4 = ['Contact and access', 'Programme', 'Records', 'Danger zone'];

  // 1. The switch is "off": Ava has awards in the database, and the page does not look.
  {
    const { page, log } = await L.openCoach(b, { hash: 'a/ava_test/file', fixedTime: NOW, seed: { career: 'off' } });
    await L.settle(page, 600);
    check(r, 'switch "off": the File is the usual groups, no Trophies group', JSON.stringify(await heads(page)) === JSON.stringify(ALL4) && (await page.locator('#trophies').count()) === 0, await heads(page));
    await L.go(page, 'a/ben_test/file'); await L.go(page, 'a/ava_test/file');
    await page.evaluate(() => hardRefresh()); await L.settle(page, 1000);
    const cs = await L.calls(page);
    check(r, 'the rulebook is read (twice: boot and Refresh), and career_awards and career_catalogue are never read', cs.filter(c => c.name === 'career_rules').length === 2 && !awardsOf(cs).length && !catalogueOf(cs).length, cs.filter(c => /^career_/.test(c.name)).map(c => c.name));
    check(r, 'and still no Trophies group after Refresh, and nothing was said', (await page.locator('#trophies').count()) === 0 && isQuiet(await quiet(page, log)), await quiet(page, log));
    await page.context().close();
  }

  // 2. The switch is a day.
  {
    const { page, log } = await L.openCoach(b, { hash: 'athletes', fixedTime: NOW, seed: { career: 'on' } });
    await L.settle(page, 500);
    const c0 = await L.calls(page);
    check(r, 'before any File is open nothing of the awards is read (one athlete at a time)', !awardsOf(c0).length && !catalogueOf(c0).length, '');
    await L.go(page, 'a/ava_test/file'); await L.settle(page, 800);
    check(r, 'Ava\'s File: Trophies sits between Programme and Records', JSON.stringify(await heads(page)) === JSON.stringify(['Contact and access', 'Programme', 'Trophies', 'Records', 'Danger zone']), await heads(page));
    let cs = await L.calls(page);
    check(r, 'one read of her awards (filtered on her id) and one of the catalogue (badges, achievements and titles only)', awardsOf(cs).length === 1 && awardsOf(cs)[0].filters.some(f => /^athlete_id\.eq\."ava_test"$/.test(f)) && catalogueOf(cs).length === 1 && catalogueOf(cs)[0].filters.some(f => /^kind\.in\./.test(f)), { aw: awardsOf(cs).map(c => c.filters), cat: catalogueOf(cs).map(c => c.filters) });
    check(r, 'the count line: 4 badges, 3 achievements, 1 title', (await rowLines(page, 'Earned')).length === 0 && /^4 badges, 3 achievements, 1 title$/.test((await page.locator('#trophies-body .frow').filter({ has: page.locator('.frow-l', { hasText: /^Earned$/ }) }).locator('.frow-v').innerText()).trim()), await page.locator('#trophies-body').innerText());
    check(r, 'Titles: the title with its metal and day', JSON.stringify(await rowLines(page, 'Titles')) === JSON.stringify(['CLOCKWORK · Prismatic · 15 Oct']), await rowLines(page, 'Titles'));
    check(r, 'Achievements, newest first, the year only when it is not this one, the retired one not here', JSON.stringify(await rowLines(page, 'Achievements')) === JSON.stringify(['Held · 27 Sep', 'First Cycle · 3 Dec 2025']), await rowLines(page, 'Achievements'));
    check(r, 'Badges: one line each at the highest step (Century at step 2 = Silver II, tier names where the catalogue has them, a step number where it has not), newest first, the retired ladder not here',
      JSON.stringify(await rowLines(page, 'Badges')) === JSON.stringify(['Century · Silver II · 14 Oct', 'HUMAN SPRINKLER · Silver STEADY · 3 Oct', 'Hold Serve · Bronze I · 20 Sep']), await rowLines(page, 'Badges'));
    const ret = await page.evaluate(() => { const d = document.getElementById('trophies-retired'); return d && { open: d.open, summary: d.querySelector('summary').textContent.replace(/\s+/g, ' ').trim(), lines: [...d.querySelectorAll('.trow')].map(x => x.textContent.replace(/\s+/g, ' ').trim()) }; });
    check(r, 'Retired, still theirs: folded, counts its two, the achievement then the badge (a retired ladder keeps its habit and its highest step)', !!ret && !ret.open && ret.summary === 'Retired, still theirs · 2' && JSON.stringify(ret.lines) === JSON.stringify(['Old Mark · 9 May', 'Consistency Tiers · water · Emerald LOCKED IN · 11 Jul']), ret);
    check(r, 'read only: no button, box or action inside the group, and no career call but selects', (await page.locator('#trophies button, #trophies input, #trophies textarea, #trophies select, #trophies [onclick]').count()) === 0 && cs.filter(c => /^career_/.test(c.name)).every(c => c.op === 'select'), '');
    const sizes = await page.evaluate(() => { const ok = [12, 14, 17, 22, 30], bad = []; document.querySelectorAll('#trophies *').forEach(el => { if ([...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) { const s = parseFloat(getComputedStyle(el).fontSize); if (!ok.includes(s)) bad.push(el.tagName + ' ' + s); } }); return bad; });
    check(r, 'its text keeps to the five sizes', !sizes.length, sizes);
    // opened by hand, kept through a redraw; nothing is read again
    await page.locator('#trophies-retired > summary').click(); await L.settle(page, 200);
    check(r, 'the fold opens and shows the two lines', await page.locator('#trophies-retired .trow').first().isVisible(), '');
    await page.evaluate(() => { assemble(); render(); }); await L.settle(page, 700);
    check(r, 'a full redraw keeps it open and the group full (no "Loading…")', await page.evaluate(() => { const d = document.getElementById('trophies-retired'); return !!d && d.open; }) && !/Loading/.test(await page.locator('#trophies-body').innerText()), await page.locator('#trophies-body').innerText());
    await L.go(page, 'a/ava_test/work'); await L.go(page, 'a/ava_test/file'); await L.settle(page, 500);
    cs = await L.calls(page);
    check(r, 'another sub-tab and back, and the redraw, read nothing again', awardsOf(cs).length === 1 && catalogueOf(cs).length === 1, { aw: awardsOf(cs).length, cat: catalogueOf(cs).length });
    // another athlete: only their awards, the catalogue is not read again
    await L.go(page, 'a/cara_free/file'); await L.settle(page, 700);
    check(r, 'Cara (one achievement): "1 achievement", her own award only', /^1 achievement$/.test((await page.locator('#trophies-body .frow').first().locator('.frow-v').innerText()).trim()) && JSON.stringify(await rowLines(page, 'Achievements')) === JSON.stringify(['First Look · 10 Oct']) && (await rowLines(page, 'Badges')).length === 0 && (await rowLines(page, 'Titles')).length === 0 && (await page.locator('#trophies-retired').count()) === 0, await page.locator('#trophies-body').innerText());
    await L.go(page, 'a/ben_test/file'); await L.settle(page, 700);
    check(r, 'Ben (nothing earned): "No trophies yet."', /No trophies yet\./.test(await page.locator('#trophies-body').innerText()) && (await page.locator('#trophies-body .frow').count()) === 0, await page.locator('#trophies-body').innerText());
    cs = await L.calls(page);
    check(r, 'each athlete was read once, by their own id, and the catalogue still once', awardsOf(cs).length === 3 && catalogueOf(cs).length === 1 && JSON.stringify(awardsOf(cs).map(c => (c.filters.find(f => /^athlete_id\.eq\./.test(f)) || '').replace(/^athlete_id\.eq\./, ''))) === JSON.stringify(['"ava_test"', '"cara_free"', '"ben_test"']), awardsOf(cs).map(c => c.filters));
    check(r, 'nothing was said: no banner, no bar line, no pop-up, no error', isQuiet(await quiet(page, log)), await quiet(page, log));
    // ↻ Refresh reads them again
    await page.evaluate(() => hardRefresh()); await L.settle(page, 1200);
    cs = await L.calls(page);
    check(r, '↻ Refresh reads Ben\'s awards and the catalogue again', awardsOf(cs).length === 4 && catalogueOf(cs).length === 2, { aw: awardsOf(cs).length, cat: catalogueOf(cs).length });
    // narrow screens, with the fold and the explanation open
    await L.go(page, 'a/ava_test/file'); await L.settle(page, 700);
    await page.evaluate(() => { const d = document.getElementById('trophies-retired'); if (d) d.open = true; document.querySelectorAll('details.how').forEach(x => x.open = true); });
    for (const w of [390, 320]) {
      await page.setViewportSize({ width: w, height: 800 }); await L.settle(page, 300);
      const sw = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
      check(r, `at ${w} px the File with the Trophies group fits the screen`, sw.sw <= sw.iw, sw);
    }
    check(r, 'no page errors', !log.errors.length, log.errors);
    await page.context().close();
  }

  // 3. A read that fails is a quiet line in the group, and Refresh tries again.
  for (const [what, name] of [['the awards', 'career_awards'], ['the catalogue', 'career_catalogue']]) {
    const { page, log } = await L.openCoach(b, { hash: 'athletes', fixedTime: NOW, seed: { career: 'on', stub: { fail: [{ kind: 'from', name, message: `relation "public.${name}" does not exist`, code: '42P01', times: 1 }] } } });
    await L.go(page, 'a/ava_test/file'); await L.settle(page, 900);
    const txt = (await page.locator('#trophies-body').innerText()).replace(/\s+/g, ' ');
    check(r, `reading ${what} fails: the group says so in one line and lists nothing`, /did not load just now/.test(txt) && (await page.locator('#trophies-body .frow').count()) === 0, txt);
    check(r, `and says nothing else: no banner, no bar line, no pop-up, no error; the rest of the File is there`, isQuiet(await quiet(page, log)) && JSON.stringify(await heads(page)) === JSON.stringify(['Contact and access', 'Programme', 'Trophies', 'Records', 'Danger zone']), { q: await quiet(page, log), h: await heads(page) });
    await L.go(page, 'a/ava_test/work'); await L.go(page, 'a/ava_test/file'); await L.settle(page, 500);
    check(r, 'it is not read again on a redraw (no loop on a table that is not there)', (await L.calls(page)).filter(c => c.name === name && c.op === 'select').length === 1, '');
    await page.evaluate(() => hardRefresh()); await L.settle(page, 1200);
    check(r, 'Refresh tries again and the trophies appear', /^4 badges, 3 achievements, 1 title$/.test((await page.locator('#trophies-body .frow').first().locator('.frow-v').innerText()).trim()), await page.locator('#trophies-body').innerText());
    await page.context().close();
  }

  // 4. The rulebook cannot be read: the same as "off".
  {
    const { page, log } = await L.openCoach(b, { hash: 'a/ava_test/file', fixedTime: NOW, seed: { career: 'on', stub: { fail: [{ kind: 'from', name: 'career_rules', message: 'permission denied for table career_rules', code: '42501', times: 5 }] } } });
    await L.settle(page, 700);
    const cs = await L.calls(page);
    check(r, 'a rulebook that cannot be read: no Trophies group, nothing read, nothing said', (await page.locator('#trophies').count()) === 0 && !awardsOf(cs).length && isQuiet(await quiet(page, log)), await quiet(page, log));
    await page.context().close();
  }

  // 5. The switch answers after a File was already drawn (a link straight to it).
  {
    const { page, log } = await L.openCoach(b, { hash: 'a/ava_test/file', fixedTime: NOW, seed: { career: 'on', stub: { delay: { career_rules: 2500 } } } });
    check(r, 'a File drawn before the rulebook answers has no Trophies group yet', (await page.locator('#trophies').count()) === 0 && (await page.locator('#tabbody .fh').count()) >= 3, await heads(page));
    await page.locator('#trophies-body').waitFor({ timeout: 6000 });
    await L.settle(page, 800);
    check(r, 'when it answers the group is added and filled in', /^4 badges, 3 achievements, 1 title$/.test((await page.locator('#trophies-body .frow').first().locator('.frow-v').innerText()).trim()), await page.locator('#trophies-body').innerText());
    check(r, 'and nothing was said', isQuiet(await quiet(page, log)), await quiet(page, log));
    await page.context().close();
  }
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
