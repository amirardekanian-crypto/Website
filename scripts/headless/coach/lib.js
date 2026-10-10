// coach-harness/lib.js — shared Playwright plumbing for run.js and reallib.js.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
// Found where the cloud container keeps them; elsewhere set PLAYWRIGHT (its module path) and CHROMIUM.
const PW = process.env.PLAYWRIGHT
  || (fs.existsSync('/opt/node22/lib/node_modules/playwright') ? '/opt/node22/lib/node_modules/playwright' : 'playwright');
const { chromium } = require(PW);
const { buildSeed } = require('./fixtures');

const BASE = process.env.COACH_BASE || 'http://127.0.0.1:8765';
// Results, screenshots and downloaded backups go OUTSIDE the repo (OUT overrides).
const OUT = process.env.OUT || path.join(os.tmpdir(), 'coach-harness-out');
const STUB = fs.readFileSync(path.join(__dirname, 'stub.js'), 'utf8');
fs.mkdirSync(OUT, { recursive: true });

function localDay(date, tz) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' });
  return f.format(date);   // en-CA -> YYYY-MM-DD
}

async function launch() {
  const exe = process.env.CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
  return chromium.launch(Object.assign({ args: ['--no-sandbox'] }, exe ? { executablePath: exe } : {}));
}

// opts: { tz, fixedTime (ISO), seed: {bigHistory, stub}, hash }
async function openCoach(browser, opts) {
  opts = opts || {};
  const tz = opts.tz || 'UTC';
  const ctx = await browser.newContext({ timezoneId: tz, acceptDownloads: true, viewport: { width: 1280, height: 900 },
    permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  const now = opts.fixedTime ? new Date(opts.fixedTime) : new Date();
  if (opts.fixedTime) await page.clock.setFixedTime(now);
  const today = localDay(now, tz);
  const seed = buildSeed(Object.assign({ today }, opts.seed || {}));
  const log = { dialogs: [], errors: [], console: [] };
  page.on('dialog', async d => { log.dialogs.push({ type: d.type(), message: d.message() }); await d.accept().catch(() => {}); });
  page.on('pageerror', e => log.errors.push(String(e && e.message || e)));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') log.console.push(m.type() + ': ' + m.text()); });
  await page.route('**/*', route => {
    const u = route.request().url();
    if (u.startsWith(BASE)) return route.continue();
    if (/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js/.test(u)) return route.fulfill({ status: 200, contentType: 'application/javascript', body: '/* supabase-js stubbed by coach-harness */' });
    return route.fulfill({ status: 204, body: '' });   // fonts, analytics: nothing leaves the box
  });
  await page.addInitScript(s => {
    window.__HARNESS_SEED = s;
    try { if (!sessionStorage.getItem('__harness_keep')) localStorage.removeItem('__harness_db'); sessionStorage.setItem('__harness_keep', '1'); } catch (e) {}
  }, seed);
  await page.addInitScript(STUB);
  await page.goto(BASE + '/coach.html' + (opts.hash ? '#' + opts.hash : ''));
  await page.waitForFunction(() => document.querySelector('#rail a.tab') && !document.querySelector('#content .loading'), null, { timeout: 15000 });
  await page.waitForTimeout(400);
  return { ctx, page, log, today, seed, tz, now };
}

const settle = (page, ms) => page.waitForTimeout(ms || 450);
const calls = page => page.evaluate(() => window.__calls.map(c => Object.assign({}, c)));
const db = page => page.evaluate(() => JSON.parse(JSON.stringify(window.__DB)));
async function callsSince(page, n) { return (await calls(page)).slice(n); }
async function nCalls(page) { return page.evaluate(() => window.__calls.length); }
async function toastText(page) { return page.evaluate(() => (document.getElementById('toast') || {}).textContent || ''); }
async function go(page, hash) {
  await page.evaluate(h => { location.hash = h; }, hash);
  await page.waitForFunction(() => !document.querySelector('#content .loading'), null, { timeout: 10000 });
  await settle(page, 300);
}
// Click through JS, so a button inside a closed <details> still fires its handler (what a coach does
// after opening the card; Playwright refuses to click hidden elements).
async function jsClick(locator) { await locator.first().evaluate(el => el.click()); }
function loadAllCount(cs) { return cs.filter(c => c.kind === 'from' && c.name === 'athlete_progress' && c.op === 'select').length; }

module.exports = { BASE, OUT, launch, openCoach, settle, calls, db, callsSince, nCalls, toastText, go, jsClick, loadAllCount, localDay };
