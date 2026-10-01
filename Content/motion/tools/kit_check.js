#!/usr/bin/env node
/* kit_check.js — is every Motion Menu item really callable, and is every piece documented?
 *
 *   node Content/motion/tools/kit_check.js            check everything, exit 1 on any problem
 *   node Content/motion/tools/kit_check.js --quiet    only print problems
 *
 * It opens the lab page (every kit file loaded), then:
 *   1. for every item in catalog.json it asks the kit whether that name is callable (a piece, an alias, a scene change, or data: look,
 *      type pair, feel, house rule, finish setting);
 *   2. for every piece it checks the one-line doc, the group, and one doc line for every param (and no doc line for a param that does not exist);
 *   3. every sound id a piece's cues name is a sound in the catalogue;
 *   4. it draws every piece, with its own defaults, at a few moments on a blank 1080 x 1920 canvas, and every scene change between two canvases,
 *      to catch a piece that throws when it is called alone;
 *   5. kit/bodymap.js is up to date with the app's muscle drawing.
 */
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const { serve } = require('./serve');
const MOTION = path.resolve(__dirname, '..');
const quiet = process.argv.includes('--quiet');

(async () => {
  const cat = JSON.parse(fs.readFileSync(path.join(MOTION, 'catalog.json'), 'utf8'));
  const soundIds = cat.items.filter(i => i.kind === 'sound').map(i => i.id);
  const srv = await serve(), port = srv.address().port;
  const exe = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const browser = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined, args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-color-profile=srgb'] });
  const pg = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const errors = []; pg.on('pageerror', e => errors.push('page error: ' + e.message));
  await pg.goto(`http://127.0.0.1:${port}/motion/lab.html?render=1`);
  await pg.waitForFunction('window.REEL_READY === true', null, { timeout: 120000 });

  const res = await pg.evaluate(({ items, soundIds }) => {
    const KIT = window.KIT, R = window.REEL, L = window.L, problems = [], info = { pieces: 0, aliases: 0, joins: 0, data: 0, drawn: 0 };
    const P = m => problems.push(m);
    /* 1. the catalogue */
    for (const it of items) {
      const id = it.id; let ok = false;
      if (it.kind === 'sound') continue;
      if (it.kind === 'visual') ok = KIT.has(id) || !!(KIT.data.finish && KIT.data.finish[id]);
      else if (it.kind === 'look') ok = !!KIT.data.look[id];
      else if (it.kind === 'pair') ok = !!KIT.data.font[id];
      else if (it.kind === 'feel') ok = !!KIT.data.ease[id];
      else if (it.kind === 'rule') ok = !!KIT.data.rule[id];
      if (!ok) P(`menu item "${id}" (${it.kind}) is not callable: nothing in the kit has that name`);
    }
    /* 2 and 3. docs and sound ids */
    for (const id of KIT.ids()) {
      const d = KIT.defs[id];
      if (d.kind === 'alias') { info.aliases++; if (!d.doc) P(`${id}: alias has no doc`); try { KIT.resolve(id); } catch (e) { P(`${id}: ${e.message}`); } continue; }
      if (d.kind === 'join') info.joins++; else info.pieces++;
      if (!d.doc) P(`${id}: no doc`);
      if (!d.group) P(`${id}: no group`);
      for (const k of Object.keys(d.defaults)) if (!(k in d.params)) P(`${id}: param "${k}" has no doc line`);
      for (const k of Object.keys(d.params)) if (!(k in d.defaults)) P(`${id}: a doc line for "${k}", which is not a param`);
      if (d.cues) {
        try { for (const c of d.cues(KIT.resolve(id).p, {})) { if (c.kind === 'sound' && c.props && c.props.id && soundIds.indexOf(c.props.id) < 0) P(`${id}: its cue plays "${c.props.id}", which is not a sound in the catalogue`); } } catch (e) { P(`${id}: cues() threw: ${e.message}`); }
      }
    }
    info.data = Object.values(KIT.data).reduce((s, o) => s + Object.keys(o).length, 0);
    /* 4. draw everything alone */
    const SPEC = { W: R.W, H: R.H, FPS: R.FPS, BEAT: R.BEAT, BAR: R.BAR, S8: R.BEAT / 2, L, R, KIT };
    const W = 1080, H = 1920, cv = L.canvas(W, H), ctx = cv.getContext('2d');
    const A = L.canvas(W, H), B = L.canvas(W, H); A.getContext('2d').fillStyle = '#336'; A.getContext('2d').fillRect(0, 0, W, H); B.getContext('2d').fillStyle = '#833'; B.getContext('2d').fillRect(0, 0, W, H);
    for (const id of KIT.ids()) {
      const d = KIT.defs[id]; let real = d, p;
      try { const r = KIT.resolve(id, {}); real = r.def; p = r.p; } catch (e) { continue; }
      try {
        if (real.warm) real.warm(p, SPEC);
        if (real.kind === 'join') { for (const pr of [0, .3, .6, 1]) { ctx.clearRect(0, 0, W, H); KIT.cut(id, ctx, A, B, pr, {}); } }
        else for (const t of [0, .25, .8, 1.6, 3]) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H); KIT.draw(id, ctx, t, {}); }
        info.drawn++;
      } catch (e) { P(`${id}: drawing it alone threw: ${e.message}`); }
    }
    return { problems, info };
  }, { items: cat.items, soundIds });

  let bodymapOk = true;
  try { execFileSync('python3', [path.join(__dirname, 'bodymap.py'), '--check'], { stdio: 'pipe' }); } catch (e) { bodymapOk = false; res.problems.push('kit/bodymap.js is out of date: run python3 Content/motion/tools/bodymap.py'); }
  for (const e of errors) res.problems.push(e);
  await browser.close(); srv.close();

  const i = res.info;
  if (!quiet) console.log(`kit: ${i.pieces} pieces, ${i.aliases} aliases, ${i.joins} scene changes, ${i.data} data items; ${i.drawn} drawn alone; body map ${bodymapOk ? 'up to date' : 'STALE'}`);
  if (res.problems.length) { for (const p of res.problems) console.log('PROBLEM ' + p); console.log(`${res.problems.length} problem(s)`); process.exit(1); }
  if (!quiet) console.log('ok');
})().catch(e => { console.error(e); process.exit(1); });
