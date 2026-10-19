// Guard 25 — NO GHOST CALLS. node scripts/check_ghost_calls.js [--selftest]
//
// A "ghost call" is a name that is CALLED but declared nowhere the page can see: `athleteId()` in a
// file whose own name is `ATHLETE_ID`. It is not a style problem. It throws a ReferenceError the
// moment the line runs, and in a render path it takes the WHOLE screen down with it:
//   · 2026-10-19, program.html: pushReady() used habits.html's `DEMO` and `athleteId()`, so the
//     account sheet would not open. Caught by scripts/headless/crew.js, after it had gone live.
//   · 2026-10-19, habits.html: the same paste, the same `athleteId()`, left in AA Proof. renderToday()
//     calls it, so boot's own first render() threw and every signed-in athlete sat on "Loading proof"
//     for ever. The embedded strip on Home went on working (IS_EMBED short-circuits before the bad
//     name), which is exactly what hid it. Amir found it himself, on the live site.
// Twice in one day, from one paste, and no test covered either: a test only sees the screens it opens.
// This reads every line of every page instead.
//
// One scope per FILE, which is what the browser gives top-level declarations, plus the globals of every
// /assets/js/*.js the page loads. A name genuinely provided from outside goes in ALLOWED with its
// reason. Deleting a function and leaving its callers behind is the other thing this catches: delete
// the callers too, or put the function back.
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');

// Every page with script of its own, and the shared files. A new app page goes in this list.
const FILES = [
  'habits.html', 'program.html', 'coach.html', 'proof.html', 'index.html', 'index-en.html', 'index-fa.html',
  'jump.html', 'form.html', 'form-fa.html', 'call-log.html', 'links.html', 'privacy.html', 'privacy-fa.html',
  'terms.html', 'terms-fa.html', 'etminan.html', 'etminan-en.html', 'etminan-dv.html', 'partner-fa.html',
  'uts-padel.html', '404.html',
  'tennis/app/index.html', 'tennis/index.html', 'tennis-testing/index.html',
  'assets/js/shared.js', 'assets/js/push.js', 'assets/js/chips.js', 'assets/js/sharecard.js',
  'assets/js/rally.js', 'assets/js/splitstep.js', 'assets/js/between-sets.js', 'assets/js/site-chat.js',
  'assets/js/track.js', 'assets/js/fa-nav.js', 'sw.js',
];

// Provided from outside the file, on purpose. Every one of these is called behind a test for it.
const ALLOWED = new Set([
  'PasswordCredential',                                                 // the browser's own
  'supabase',                                                           // the library, from its own <script src>
  'AAPush', 'AAChips', 'AAShareCard', 'AARally', 'AASplitStep', 'AABetweenSets',   // the shared kits
  'Plausible', 'plausible', 'gtag', 'dataLayer',                        // analytics, if it loaded at all
  'html2canvas', 'Chart',                                               // anything from a CDN
]);

const BUILTIN = new Set(`
Array Object String Number Boolean Date Math JSON RegExp Error TypeError RangeError SyntaxError Promise Map Set
WeakMap WeakSet Symbol Proxy Reflect BigInt Function Blob File FileReader FormData URL URLSearchParams Request
Response Headers AbortController AbortSignal Image Audio Option Intl TextEncoder TextDecoder Uint8Array
Uint8ClampedArray Int8Array Int16Array Uint16Array Int32Array Uint32Array Float32Array Float64Array ArrayBuffer
DataView Notification Worker ServiceWorker MutationObserver IntersectionObserver ResizeObserver PerformanceObserver
Event CustomEvent MouseEvent KeyboardEvent TouchEvent PointerEvent ErrorEvent DOMParser XMLSerializer XMLHttpRequest
WebSocket AudioContext createImageBitmap OffscreenCanvas Path2D BroadcastChannel MediaRecorder Range Node Element HTMLElement
parseInt parseFloat isNaN isFinite encodeURIComponent decodeURIComponent encodeURI decodeURI escape unescape
setTimeout clearTimeout setInterval clearInterval requestAnimationFrame cancelAnimationFrame requestIdleCallback
cancelIdleCallback queueMicrotask structuredClone fetch alert confirm prompt atob btoa getComputedStyle matchMedia
scrollTo scrollBy scrollIntoView open close focus blur print postMessage addEventListener removeEventListener
dispatchEvent importScripts clearImmediate setImmediate reportError
eval require module exports process Buffer console globalThis window document navigator location
history screen localStorage sessionStorage caches crypto performance self top parent frames opener visualViewport
`.trim().split(/\s+/));

const KEYWORD = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'typeof', 'function', 'new', 'delete',
  'void', 'in', 'of', 'do', 'else', 'try', 'case', 'await', 'yield', 'async', 'instanceof', 'throw', 'super',
  'this', 'default', 'break', 'continue', 'finally', 'class', 'let', 'const', 'var', 'export', 'import', 'with',
  'debugger', 'static', 'extends', 'get', 'set', 'constructor']);

function inlineScripts(src, file) {
  if (file.endsWith('.js')) return [src];
  const out = [], re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(src))) out.push(m[1]);
  return out;
}

// Comments, quoted strings and regex literals out, by walking the source once. A regex cannot do this
// safely: a `/*` inside a template or a URL eats the rest of the file, and an earlier draft of this
// guard reported four functions as missing that were declared right there. A template's `${...}` is
// kept as code, because that is where its calls are.
const NL = String.fromCharCode(10);
function strip(src) {
  let out = '', i = 0, prev = '';
  const n = src.length;
  // One entry per open template: { code: false } while in its literal text, { code: true, depth }
  // inside a `${…}`. The depth is load-bearing — `${rows.map(r => { return r })}` has braces of its
  // own, and without counting them the scanner closed the template early and lost the rest of the file.
  const stack = [];
  const top = () => stack[stack.length - 1];
  const inText = () => stack.length && !top().code;
  const opensRegex = () => prev === '' || '=(,:[!&|?+-*%~^{;}'.indexOf(prev) >= 0 ||
    /\b(return|typeof|case|in|of|new|delete|void|do|else|yield|await)\s*$/.test(out.slice(-10));
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (!inText() && c === '/' && d === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; out += ' '; continue; }
    if (!inText() && c === '/' && d === '/') { const e = src.indexOf(NL, i); i = e < 0 ? n : e; out += ' '; continue; }
    if (!inText() && (c === '"' || c === "'")) {
      const q = c;
      i++;
      while (i < n && src[i] !== q && src[i] !== NL) { i += src[i] === '\\' ? 2 : 1; }
      i++;
      out += q + q; prev = q; continue;
    }
    if (!inText() && c === '`') { stack.push({ code: false, depth: 0 }); i++; out += ' '; continue; }
    if (inText()) {
      if (c === '\\') { i += 2; continue; }
      if (c === '$' && d === '{') { top().code = true; top().depth = 0; i += 2; out += '('; prev = '('; continue; }
      if (c === '`') { stack.pop(); i++; out += ' '; prev = ' '; continue; }
      i++; continue;
    }
    if (c === '`') { stack.push({ code: false, depth: 0 }); i++; out += ' '; continue; }
    if (stack.length && top().code && c === '{') { top().depth++; out += c; prev = c; i++; continue; }
    if (c === '/' && opensRegex()) {
      i++;
      let cls = false;
      while (i < n && src[i] !== NL) {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === '[') cls = true;
        else if (src[i] === ']') cls = false;
        else if (src[i] === '/' && !cls) break;
        i++;
      }
      i++;
      while (i < n && /[a-z]/.test(src[i])) i++;
      out += 'RE'; prev = 'E'; continue;
    }
    if (c === '}' && stack.length && top().code) {
      if (top().depth > 0) { top().depth--; out += c; prev = c; i++; continue; }
      top().code = false; i++; out += ')'; prev = ')'; continue;
    }
    out += c;
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  return out;
}

function declared(code) {
  const d = new Set();
  const add = re => { let m; while ((m = re.exec(code))) d.add(m[1]); };
  add(/\bfunction\s*\*?\s*([A-Za-z_$][\w$]*)/g);
  add(/\bclass\s+([A-Za-z_$][\w$]*)/g);
  add(/\b(?:let|const|var)\s+([A-Za-z_$][\w$]*)/g);
  add(/\bwindow\.([A-Za-z_$][\w$]*)\s*=/g);
  add(/\b([A-Za-z_$][\w$]*)\s*=[^=>]/g);       // any assignment to a bare name
  add(/\b([A-Za-z_$][\w$]*)\s*:/g);            // object keys, class methods and labels
  add(/\b([A-Za-z_$][\w$]*)\s*=>/g);           // single-parameter arrow
  add(/\b([A-Za-z_$][\w$]*)\s*\([^()]*\)\s*\{/g);   // a method in a class or an object literal
  let m;
  const lists = /\b(?:let|const|var)\s+([^;\n]*)/g;         // a declaration list, destructuring included
  while ((m = lists.exec(code))) (m[1].match(/[A-Za-z_$][\w$]*/g) || []).forEach(n => d.add(n));
  const params = /(?:function\s*\*?\s*[A-Za-z_$\w]*\s*|\bcatch\s*)\(([^)]*)\)|\(([^()]*)\)\s*=>/g;
  while ((m = params.exec(code))) ((m[1] || m[2] || '').match(/[A-Za-z_$][\w$]*/g) || []).forEach(n => d.add(n));
  return d;
}

function ghosts(src, rel) {
  const code = inlineScripts(src, rel).map(strip).join(NL + ';' + NL);
  const d = declared(code);
  (src.match(/<script[^>]*\bsrc="\/?assets\/js\/([\w.-]+\.js)"/g) || []).forEach(tag => {
    const f = tag.match(/([\w.-]+\.js)/)[1];
    try { declared(strip(fs.readFileSync(path.join(ROOT, 'assets', 'js', f), 'utf8'))).forEach(n => d.add(n)); }
    catch (e) { /* not in the repo */ }
  });
  const out = new Map();
  const call = /(?:^|[^\w$.?])([A-Za-z_$][\w$]*)\(/g;
  let m;
  while ((m = call.exec(code))) {
    const n = m[1];
    if (KEYWORD.has(n) || BUILTIN.has(n) || ALLOWED.has(n) || d.has(n)) continue;
    out.set(n, (out.get(n) || 0) + 1);
  }
  return out;
}

function lineOf(src, name) {
  const re = new RegExp('(^|[^\\w$.])' + name.replace(/\$/g, '\\$') + '\\(');
  return src.split(/\r?\n/).findIndex(l => re.test(l)) + 1;
}

if (process.argv.indexOf('--selftest') >= 0) {
  // It has to fail on the two faults that actually shipped, and pass the shapes it must never flag.
  const cases = [
    ['the athleteId() paste', '<script>const ATHLETE_ID = "x";' + NL + 'function pushReady() {' + NL + '  return !!athleteId();' + NL + '}</script>', true],
    ['a function deleted under its caller', '<script>function wtAvgSeries(d) {' + NL + '  return wtSeries(d);' + NL + '}</script>', true],
    ['a regex that looks like a call', '<script>function f(s) {' + NL + '  return s.match(/^rpe_(\\d+)$/);' + NL + '}</script>', false],
    ['prose inside a template', '<script>function f() {' + NL + '  return `the far (left) side`;' + NL + '}</script>', false],
    ['a block comment holding a slash-star', '<script>const u = `http://x/*y`;' + NL + 'function keepMe() { return u; }' + NL + 'function g() { return keepMe(); }</script>', false],
    ['declared in another script block', '<script>function a(){}</script><script>a();</script>', false],
    ['a parameter called as a callback', '<script>function f(cb) { cb(); }</script>', false],
    ['a browser global behind a test', '<script>function f(){ return window.PasswordCredential ? new PasswordCredential({}) : null; }</script>', false],
    ['division, not a regex', '<script>function f(a, b) { return a / b + (a) / (b); }</script>', false],
    ['a call inside a template', '<script>function nm(){ return 1; }' + NL + 'function row(){ return `<b>${nm()}</b>`; }</script>', false],
    ['a GHOST call inside a template', '<script>function row(){ return `<b>${noSuchName()}</b>`; }</script>', true],
  ];
  let bad = 0;
  for (const [name, src, shouldFlag] of cases) {
    const found = ghosts(src, 'case.html').size > 0;
    const ok = found === shouldFlag;
    if (!ok) bad++;
    console.log((ok ? '  ok   ' : '  FAIL ') + name + (shouldFlag ? '  (must flag)' : '  (must not flag)'));
  }
  console.log('');
  console.log(bad ? 'check_ghost_calls --selftest: ' + bad + ' case(s) wrong' : 'check_ghost_calls --selftest: OK');
  process.exit(bad ? 1 : 0);
}

let found = 0, read = 0;
for (const rel of FILES) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) continue;
  read++;
  const src = fs.readFileSync(full, 'utf8');
  for (const [name, count] of ghosts(src, rel)) {
    console.log('  ' + rel + ':' + lineOf(src, name) + '  ' + name + '()  called ' + count + ' time(s), declared nowhere');
    found++;
  }
}
console.log('');
if (found) {
  console.log('check_ghost_calls: FAIL — ' + found + ' ghost call(s) in ' + read + ' files.');
  console.log('A ghost call throws a ReferenceError the moment it runs, and in a render path it takes the screen with it.');
  console.log('Declare it, delete the caller, or add it to ALLOWED with the reason it comes from outside the file.');
  process.exit(1);
}
console.log('check_ghost_calls: OK (' + read + ' files, every called name resolves)');
