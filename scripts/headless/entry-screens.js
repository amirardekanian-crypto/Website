// Sign in, Welcome, Loading and Error in the Centre Court look (Amir, 2026-10-13: "continue until everything has a consistent design"): the four
// screens a person sees before or around their first plan.
//   Sign in (signed out): the mint-dot eyebrow and the clay COACH, the sheet at the app's sheet radius, the set table's boxes, the error line as the
//     day's banner, the footer, every control 44 px, no sideways scroll at 320 / 375 / 390, readable in dark.
//   Welcome (a fresh athlete, aa_fresh_signin set before boot): the cover, the eyebrow, the title, the signature; Open Day 1, Look around first, ✕ and
//     the phone's Back; once only; never in the demo; the button on screen at 320 x 568.
//   Loading: the mark, the ring, "Loading your plan"; reduced motion slows the ring and never stops it.
//   Error: both showError() callers (a refused sign-in with its two buttons, no signal and no saved plan) in the new look, the buttons working.
// Behaviour is checked as much as the look: the sign-in form's names and autocomplete, the eye, the WhatsApp links, the buttons' handlers.
// Serve the repo first (python -m http.server 8765 --bind 127.0.0.1, see lib.js), then: node scripts/headless/entry-screens.js [--out <dir>]
'use strict';
const fs = require('fs'), path = require('path');
const H = require('./lib');

const SRC = fs.readFileSync(path.join(__dirname, '..', '..', 'program.html'), 'utf8').replace(/\r\n/g, '\n');
const WIDTHS = [320, 375, 390];

// Helpers run in the page: a token's colour as the browser computes it, the contrast of two colours, the colour behind an element.
const HELP = `(() => {
  const T = window.__T = {
    tok(name) { const e = document.createElement('i'); e.style.color = 'var(' + name + ')'; document.body.appendChild(e); const c = getComputedStyle(e).color; e.remove(); return c; },
    btn() { const e = document.createElement('i'); e.style.backgroundImage = 'var(--btn)'; document.body.appendChild(e); const c = getComputedStyle(e).backgroundImage; e.remove(); return c; },
    parse(c) { const m = String(c).match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; },
    over(fg, bg) { return { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 }; },
    lum(c) { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); },
    ratio(a, b) { const x = T.lum(a), y = T.lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); },
    bgOf(el) { const layers = []; for (let e = el; e; e = e.parentElement) { const s = getComputedStyle(e); if (s.backgroundImage !== 'none') return null; const c = T.parse(s.backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; } } let base = { r: 255, g: 255, b: 255, a: 1 }; for (let i = layers.length - 1; i >= 0; i--) base = T.over(layers[i], base); return base; },
    contrast(el) { const bg = T.bgOf(el); if (!bg) return null; const fg = T.parse(getComputedStyle(el).color); return T.ratio(T.over(fg, bg), bg); },
  };
})()`;

// What a refused sign-in answers, as supabase's does; the stub's default ("stub") reads as the generic failure.
const REFUSE_LOGIN = `(() => { if (!window.supabase) return; const cc = window.supabase.createClient;
  window.supabase.createClient = function () { const c = cc.apply(this, arguments); c.auth.signInWithPassword = function () { window.__STUB.calls.push('auth:signIn'); return Promise.resolve({ error: { message: 'Invalid login credentials' } }); }; return c; }; })()`;

// The sign-in screen, signed out. opts: w, h, dark, fonts (Google Fonts through, for screenshots), reduce (reduced motion).
async function openSignedOut(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: opts.w || 390, height: opts.h || 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block', ...(opts.reduce ? { reducedMotion: 'reduce' } : {}) });
  await ctx.route('**/*', r => { const u = r.request().url(); return u.startsWith(H.BASE + '/') || (opts.fonts && /^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(u)) ? r.continue() : r.abort(); });
  await ctx.addInitScript(cfg => { try { localStorage.setItem('__stubcfg', JSON.stringify(cfg)); } catch (e) {} }, { mode: 'online', session: null });
  await ctx.addInitScript(H.STUB);
  await ctx.addInitScript(REFUSE_LOGIN);
  await ctx.addInitScript(HELP);
  const p = await ctx.newPage();
  p.errs = [];
  p.on('pageerror', e => p.errs.push(String(e.message || e)));
  await p.goto(H.BASE + '/program.html', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#signin-screen.visible', { timeout: 15000 });
  if (opts.dark) await p.evaluate(() => document.body.setAttribute('data-dark', ''));
  await p.waitForTimeout(opts.fonts ? 1200 : 700);   // the court photo fades up; the form is wired
  return { ctx, p };
}

// The fixture athlete, signed in, then the page loaded again with the welcome flag set. opts as lib.openProgram, plus welcome: true (the flag set, no
// "welcomed" mark) and the query for the demo.
async function openFresh(browser, opts = {}) {
  const { ctx, p } = await H.openProgram(browser, Object.assign({ fresh: true }, opts));
  await p.evaluate(() => { localStorage.setItem('aa_fresh_signin', '1'); localStorage.removeItem(ATHLETE_ID + '_welcomed'); localStorage.setItem('a2hs_dismissed_v1', '1'); });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.getElementById('loading') && document.getElementById('loading').classList.contains('hidden'), null, { timeout: 20000 });
  await p.waitForTimeout(500);
  await p.evaluate(HELP);
  return { ctx, p };
}

// The loading screen kept on screen: get_program never answers (the 6 s timeout is far away). Returns the page with the loading screen showing.
async function openLoading(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: opts.w || 390, height: opts.h || 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  await ctx.route('**/*', r => { const u = r.request().url(); return u.startsWith(H.BASE + '/') || (opts.fonts && /^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(u)) ? r.continue() : r.abort(); });
  await ctx.addInitScript(H.STUB);
  const p = await ctx.newPage();
  p.errs = [];
  p.on('pageerror', e => p.errs.push(String(e.message || e)));
  await p.goto(H.BASE + '/robots.txt');   // any page on the origin, to write its localStorage first
  await p.evaluate(([prog, id]) => {
    localStorage.clear();
    localStorage.setItem('__stubcfg', JSON.stringify({ mode: 'online', program: prog, session: { user: { id: 'u' } }, identity: id, stall: { get_program: true } }));
    localStorage.setItem('sb-bvipfipbdcyqnbczjmaq-auth-token', '{}');
    localStorage.setItem('aa_athlete_id', id);
  }, [H.fixture(), H.ID]);
  if (opts.reduce) await p.emulateMedia({ reducedMotion: 'reduce' });
  await p.goto(H.BASE + '/program.html', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#loading', { timeout: 10000 });
  await p.waitForTimeout(400);
  await p.evaluate(HELP);
  return { ctx, p };
}

const sideways = p => p.evaluate(() => Math.max(document.documentElement.scrollWidth - window.innerWidth, (document.getElementById('signin-screen') || { scrollWidth: 0, clientWidth: 0 }).scrollWidth - (document.getElementById('signin-screen') || { scrollWidth: 0, clientWidth: 0 }).clientWidth));
const rect = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, b: r.bottom, r: r.right }; }, sel);

// A colour pulled from the page's own tokens, in both themes: { paper, row, hair, ink, grey, field, green, mint, clayOnGreen, clayFill, clayBig, ... }
const TOKENS = ['--paper', '--row', '--hair', '--ink', '--grey', '--field', '--green-ink', '--fill', '--mint', '--clay-on-green', '--clay-fill', '--clay-big', '--clay', '--clay-ink', '--on-accent'];
const tokens = p => p.evaluate(names => { const o = {}; names.forEach(n => { o[n] = window.__T.tok(n); }); o['--btn'] = window.__T.btn(); return o; }, TOKENS);
const isClay = c => { const m = String(c).match(/rgba?\((\d+), (\d+), (\d+)/); if (!m) return false; const [r, g, b] = [+m[1], +m[2], +m[3]]; return r > 150 && g < 130 && b < 90 && r - g > 80; };   // any clay shade

(async () => {
  const shots = H.outDir();
  const t = H.checker();
  const browser = await H.launch();

  // ── 0. the stylesheet: ONE block, the older rules gone, no yellow and no hard-coded palette in these rules ──
  {
    const i = SRC.indexOf('/* ══ SIGN-IN, WELCOME, LOADING AND ERROR IN THE CENTRE COURT LOOK (2026-10-13) ══');
    const end = SRC.indexOf('</style>');
    const block = i >= 0 ? SRC.slice(i, end) : '';
    t.check('the stylesheet has the SIGN-IN, WELCOME, LOADING AND ERROR block, the last in the sheet (no other block heading between it and </style>)', i > 0 && block.indexOf('/* ══', 10) === -1 && /\}\s*$/.test(block.trimEnd()), block.slice(0, 60));
    const before = SRC.slice(0, i);
    const dead = ['.loading-screen {', '.loading-spinner {', '.loading-text {', '.error-screen {', '.error-icon {', '.error-title {', '.error-msg {', '.error-btn {', '.signin-screen {', '.si-hero {', '.si-sheet {', '.signin-f {', '.signin-go {', '.signin-err {', '.signin-foot {', '.wel {', '.wel-hero {', '.wel-sheet {', '.wel-go {', '.wel-skip {', '.wel-x {']
      .filter(s => before.split('\n').some(l => l.trim().startsWith(s)));
    t.check('the older .loading-*, .error-*, .signin-*, .si-* and .wel* rules are gone from higher up the sheet', dead.length === 0, dead.join(' | '));
    t.check('the new block uses no --yellow and no --yellow-mid', !/--yellow/.test(block), (block.match(/--yellow[a-z-]*/g) || []).join());
    const hex = (block.match(/#[0-9a-fA-F]{3,8}\b/g) || []).filter(h => h !== '#000');
    t.check('the new block hard-codes no hex colour (only a mask\'s #000)', hex.length === 0, hex.join());
    t.check('the new block declares no colour token', !/(^|[;{\s])--[a-z-]+\s*:\s*(#|rgb|radial|linear|var)/.test(block.replace(/\/\*[\s\S]*?\*\//g, '')), '');
  }

  // ── 1. Sign in, light, 390 x 844 ──
  {
    const { ctx, p } = await openSignedOut(browser, { fonts: true });
    const tk = await tokens(p);
    const L = await p.evaluate(() => {
      const q = s => document.querySelector(s), cs = e => getComputedStyle(e);
      const copy = q('.si-hero-copy'), eye = q('.si-eyebrow'), dot = getComputedStyle(eye, '::before'), em = q('.signin-title em'), title = q('.signin-title'), mantra = q('.si-mantra');
      const hero = q('.si-hero'), sheet = q('.si-sheet'), card = q('.signin-card'), screen = q('#signin-screen'), img = q('.si-hero-img');
      const inp = q('#si-user'), pw = q('#si-pass'), lab = q('.signin-f > span'), go = q('#si-go'), help = q('.signin-help'), link = q('#si-help-wa'), foot = q('.signin-foot'), ey = q('#si-eye');
      const modal = q('#hist-overlay .readiness-modal'), search = q('.xl-search');
      const nonEm = [...copy.querySelectorAll('*')].filter(e => e !== em && !e.contains(em) && e.tagName !== 'IMG').map(e => [e.className || e.tagName, cs(e).color]);
      return {
        eyebrow: { text: eye.innerText, font: cs(eye).fontFamily, caps: cs(eye).textTransform, color: cs(eye).color, dot: [dot.width, dot.height, dot.backgroundColor, dot.borderRadius] },
        title: { text: title.innerText.replace(/\s+/g, ' '), font: cs(title).fontFamily, weight: cs(title).fontWeight, color: cs(title).color, em: em.innerText, emColor: cs(em).color, size: cs(title).fontSize },
        mantra: { text: mantra.innerText, color: cs(mantra).color }, nonEm,
        hero: { bgImage: cs(hero).backgroundImage.slice(0, 16), bgColor: cs(hero).backgroundColor, imgTag: img.tagName, scrimMask: cs(q('.si-hero-scrim')).maskImage || cs(q('.si-hero-scrim')).webkitMaskImage, markSrc: q('.signin-mark').getAttribute('src'), markRadius: cs(q('.signin-mark')).borderRadius, markW: q('.signin-mark').getBoundingClientRect().width },
        screenBg: cs(screen).backgroundColor, cardBg: cs(card).backgroundColor,
        sheet: { bg: cs(sheet).backgroundColor, tl: cs(sheet).borderTopLeftRadius, tr: cs(sheet).borderTopRightRadius, br: cs(sheet).borderBottomLeftRadius, modal: modal ? cs(modal).borderTopLeftRadius : null },
        label: { text: lab.innerText, font: cs(lab).fontFamily, caps: cs(lab).textTransform, color: cs(lab).color, size: cs(lab).fontSize },
        input: { h: inp.getBoundingClientRect().height, size: cs(inp).fontSize, bg: cs(inp).backgroundColor, border: cs(inp).borderTopColor, bw: cs(inp).borderTopWidth, radius: cs(inp).borderTopLeftRadius, color: cs(inp).color, search: search ? cs(search).borderTopLeftRadius : null, pwH: pw.getBoundingClientRect().height,
          names: [inp.name, inp.autocomplete, pw.name, pw.autocomplete, pw.type, inp.required, pw.required].join('|') },
        eyeBtn: { w: ey.getBoundingClientRect().width, h: ey.getBoundingClientRect().height, color: cs(ey).color },
        go: { text: go.innerText, bg: cs(go).backgroundImage !== 'none' ? cs(go).backgroundImage : cs(go).backgroundColor, color: cs(go).color, h: go.getBoundingClientRect().height, radius: cs(go).borderTopLeftRadius, font: cs(go).fontFamily, caps: cs(go).textTransform },
        help: { color: cs(help).color, linkColor: cs(link).color, href: link.getAttribute('href'), text: help.innerText, linkH: link.getBoundingClientRect().height, size: cs(help).fontSize },
        foot: { text: foot.innerText, font: cs(foot).fontFamily, color: cs(foot).color },
        err: { hidden: q('#si-err').hidden },
        order: [...document.querySelectorAll('.si-sheet > *')].map(e => e.id || e.className || e.tagName).join(' > '),
      };
    });
    t.check('Sign in: the eyebrow reads AA PERFORMANCE in Space Mono capitals', L.eyebrow.text === 'AA PERFORMANCE' && /Space Mono/.test(L.eyebrow.font) && L.eyebrow.caps === 'uppercase', JSON.stringify(L.eyebrow));
    t.check('Sign in: the eyebrow has the 7 px mint dot', L.eyebrow.dot[0] === '7px' && L.eyebrow.dot[1] === '7px' && L.eyebrow.dot[2] === tk['--mint'] && L.eyebrow.dot[3] === '50%', JSON.stringify(L.eyebrow.dot));
    t.check('Sign in: the eyebrow is white-ish, not clay', !isClay(L.eyebrow.color) && /rgba?\(255, 255, 255/.test(L.eyebrow.color), L.eyebrow.color);
    t.check('Sign in: the headline COACH is clay on green (--clay-on-green)', /COACH/.test(L.title.text) && L.title.em === 'COACH' && L.title.emColor === tk['--clay-on-green'], JSON.stringify(L.title));
    t.check('Sign in: nothing else in the hero is clay', L.nonEm.every(([, c]) => !isClay(c)), JSON.stringify(L.nonEm));
    t.check('Sign in: the headline is Barlow Condensed 900 at the display size, the mantra is kept', /Barlow Condensed/.test(L.title.font) && L.title.weight === '900' && L.title.size === '44px' && L.mantra.text === 'A path to your target.', JSON.stringify([L.title.font, L.title.weight, L.title.size, L.mantra.text]));
    t.check('Sign in: the hero is the cover\'s green (--hero) as a background COLOUR layer, the photo an <img> over it', L.hero.bgImage === 'radial-gradient(' && L.hero.imgTag === 'IMG', JSON.stringify(L.hero));
    t.check('Sign in: the scrim is a mask of the cover\'s last colour (the plain photo, not graded)', /linear-gradient/.test(L.hero.scrimMask || ''), L.hero.scrimMask);
    t.check('Sign in: the mark is icon-192.png, 52 px, a 13 px radius', /assets\/img\/icon-192\.png$/.test(L.hero.markSrc) && L.hero.markW === 52 && L.hero.markRadius === '13px', JSON.stringify(L.hero));
    t.check('Sign in: the sheet is the paper, its top corners the app\'s one sheet\'s radius, the bottom ones square', L.sheet.bg === tk['--paper'] && L.sheet.tl === L.sheet.modal && L.sheet.tr === L.sheet.modal && L.sheet.br === '0px' && parseFloat(L.sheet.tl) > 0, JSON.stringify(L.sheet));
    t.check('Sign in: the card is the paper too', L.cardBg === tk['--paper'], L.cardBg);
    t.check('Sign in: the labels are Space Mono capitals in --grey', /Space Mono/.test(L.label.font) && L.label.caps === 'uppercase' && L.label.color === tk['--grey'] && L.label.text === 'USERNAME', JSON.stringify(L.label));
    t.check('Sign in: the fields are the set table\'s box: white (--row), a --field edge, 16 px text, at least 48 px tall', L.input.bg === tk['--row'] && L.input.border === tk['--field'] && L.input.bw === '1px' && L.input.size === '16px' && L.input.h >= 48 && L.input.pwH >= 48 && L.input.color === tk['--ink'], JSON.stringify(L.input));
    t.check('Sign in: the fields have the Library search box\'s radius', L.input.radius === '10px' && L.input.radius === (L.input.search || '10px'), JSON.stringify([L.input.radius, L.input.search]));
    t.check('Sign in: the form keeps its names and autocomplete (a password manager finds them)', L.input.names === 'username|username|password|current-password|password|true|true', L.input.names);
    t.check('Sign in: the eye is a 48 px target, grey', L.eyeBtn.w >= 44 && L.eyeBtn.h >= 44 && L.eyeBtn.color === tk['--grey'], JSON.stringify(L.eyeBtn));
    t.check('Sign in: Sign in is the one primary green button, at least 48 px', L.go.text === 'SIGN IN' && L.go.bg === tk['--btn'] && L.go.color === tk['--on-accent'] && L.go.h >= 48 && L.go.radius === '8px' && /Barlow Condensed/.test(L.go.font) && L.go.caps === 'uppercase', JSON.stringify(L.go));
    t.check('Sign in: the help line is --grey, its link green ink and a 44 px target', L.help.color === tk['--grey'] && L.help.linkColor === tk['--green-ink'] && L.help.linkH >= 44 && /^https:\/\/wa\.me\/\d{8,}\?text=/.test(L.help.href) && /Lost your details\? Message Amir and he'll send new ones\./.test(L.help.text), JSON.stringify(L.help));
    t.check('Sign in: the footer is AMIRARDEKANI.COM in Space Mono, --grey', L.foot.text === 'AMIRARDEKANI.COM' && /Space Mono/.test(L.foot.font) && L.foot.color === tk['--grey'], JSON.stringify(L.foot));
    t.check('Sign in: the sheet\'s order is the same (Username, Password, Sign in, the error, the help, the footer)', L.order === 'signin-f > signin-f > si-go > si-err > signin-help > signin-foot', L.order);
    t.check('Sign in: the screen behind the card is the cover\'s last colour (a wide window) and the error line is hidden', L.err.hidden === true && /^rgb/.test(L.screenBg), JSON.stringify([L.screenBg, L.err]));

    // focus: the green edge
    await p.focus('#si-user'); await p.waitForTimeout(600);
    const foc = await p.evaluate(() => { const e = document.getElementById('si-user'), s = getComputedStyle(e); return { border: s.borderTopColor, shadow: s.boxShadow }; });
    t.check('Sign in: focus turns the box\'s edge green', foc.border === tk['--green-ink'] && /rgb\(14, 74, 54\)/.test(foc.shadow), JSON.stringify(foc));

    // the eye still shows and hides
    await p.fill('#si-pass', 'abc12345');
    await p.click('#si-eye');
    const shown = await p.evaluate(() => [document.getElementById('si-pass').type, document.getElementById('si-eye').getAttribute('aria-pressed'), document.getElementById('si-eye').getAttribute('aria-label'), getComputedStyle(document.getElementById('si-eye')).color]);
    await p.click('#si-eye');
    const hid = await p.evaluate(() => [document.getElementById('si-pass').type, document.getElementById('si-eye').getAttribute('aria-pressed'), document.getElementById('si-eye').getAttribute('aria-label')]);
    t.check('Sign in: the eye shows then hides the password (aria-pressed and the label follow), green while on', shown[0] === 'text' && shown[1] === 'true' && shown[2] === 'Hide password' && shown[3] === tk['--green-ink'] && hid[0] === 'password' && hid[1] === 'false' && hid[2] === 'Show password', JSON.stringify([shown, hid]));

    // every control, 44 px
    const small = await p.evaluate(() => [...document.querySelectorAll('#signin-screen button, #signin-screen input, #signin-screen a')].map(e => { const r = e.getBoundingClientRect(); return { n: e.id || e.className || e.tagName, w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 }; }).filter(c => c.w < 43.5 || c.h < 43.5));
    t.check('Sign in: every control is at least 44 px either way', small.length === 0, JSON.stringify(small));

    // a failed sign-in: the error is the day's banner
    await p.fill('#si-user', 'someone_one'); await p.fill('#si-pass', 'abc12345');
    await p.click('#si-go');
    await p.waitForFunction(() => !document.getElementById('si-err').hidden, null, { timeout: 8000 }).catch(() => {});
    const E = await p.evaluate(() => { const e = document.getElementById('si-err'), s = getComputedStyle(e); return { hidden: e.hidden, text: e.textContent, bg: s.backgroundColor, color: s.color, shadow: s.boxShadow, radius: s.borderTopLeftRadius, border: s.borderTopColor, size: s.fontSize, btn: document.getElementById('si-go').textContent, sent: (window.__STUB.calls || []).indexOf('auth:signIn') >= 0, fontW: s.fontWeight }; });
    t.check('Sign in: a refused sign-in shows the error and gives the button back', !E.hidden && E.sent && E.btn === 'Sign in' && E.text === 'That username or password is not right. Check the message Amir sent you.', JSON.stringify(E));
    t.check('Sign in: the error line is the day\'s banner: a --row box, a 4 px clay stripe at the left, words in --ink', E.bg === tk['--row'] && E.color === tk['--ink'] && /inset/.test(E.shadow) && E.shadow.indexOf(tk['--clay-fill']) >= 0 && /4px 0px 0px/.test(E.shadow) && !isClay(E.color), JSON.stringify(E));
    t.check('Sign in: the error is no tinted box (the box is exactly the --row white) and no clay text', E.bg === tk['--row'] && !isClay(E.color), JSON.stringify([E.bg, E.color]));
    t.check('Sign in: the error line is body size', E.size === '15px', E.size);
    const c1 = await p.evaluate(() => ['.signin-f > span', '.signin-help', '#si-help-wa', '.signin-foot', '#si-err', '#si-user'].map(s => [s, window.__T.contrast(document.querySelector(s))]));
    t.check('Sign in (light): text is at least 4.5:1 on its box (labels, help, link, footer, error, a typed value)', c1.every(([, r]) => r && r >= 4.5), JSON.stringify(c1.map(([s, r]) => [s, r && Math.round(r * 100) / 100])));
    t.check('Sign in (light): no page errors', p.errs.length === 0, p.errs.join(' | '));
    await p.fill('#si-user', ''); await p.fill('#si-pass', '');
    await ctx.close();
  }

  // ── 2. Sign in, dark ──
  {
    const { ctx, p } = await openSignedOut(browser, { dark: true, h: 844 });
    const tk = await tokens(p);
    t.check('Sign in (dark): the tokens are the dark set', tk['--paper'] === 'rgb(24, 24, 24)' && tk['--green-ink'] === 'rgb(109, 190, 149)', JSON.stringify([tk['--paper'], tk['--green-ink']]));
    const D = await p.evaluate(() => { const cs = e => getComputedStyle(document.querySelector(e)); return { sheet: cs('.si-sheet').backgroundColor, card: cs('.signin-card').backgroundColor, input: cs('#si-user').backgroundColor, label: cs('.signin-f > span').color, help: cs('.signin-help').color, link: cs('#si-help-wa').color, foot: cs('.signin-foot').color, eye: cs('#si-eye').color, em: cs('.signin-title em').color, hero: cs('.si-hero').backgroundImage.slice(0, 16), edge: cs('#si-user').borderTopColor }; });
    t.check('Sign in (dark): the sheet, the card and the boxes are the dark paper and row', D.sheet === tk['--paper'] && D.card === tk['--paper'] && D.input === tk['--row'] && D.edge === tk['--field'], JSON.stringify(D));
    t.check('Sign in (dark): the labels, the help, the footer and the eye are --grey, the link green ink', D.label === tk['--grey'] && D.help === tk['--grey'] && D.foot === tk['--grey'] && D.eye === tk['--grey'] && D.link === tk['--green-ink'], JSON.stringify(D));
    await p.fill('#si-user', 'someone_one'); await p.fill('#si-pass', 'abc12345'); await p.click('#si-go');
    await p.waitForFunction(() => !document.getElementById('si-err').hidden, null, { timeout: 8000 }).catch(() => {});
    const c2 = await p.evaluate(() => ['.signin-f > span', '.signin-help', '#si-help-wa', '.signin-foot', '#si-err', '#si-user'].map(s => [s, window.__T.contrast(document.querySelector(s))]));
    t.check('Sign in (dark): text is at least 4.5:1 on its box', c2.every(([, r]) => r && r >= 4.5), JSON.stringify(c2.map(([s, r]) => [s, r && Math.round(r * 100) / 100])));
    const ey = await p.evaluate(() => { const e = document.getElementById('si-err'), s = getComputedStyle(e); return [s.backgroundColor, s.color, s.boxShadow]; });
    t.check('Sign in (dark): the error line is the dark --row with ink words and the clay stripe', ey[0] === tk['--row'] && ey[1] === tk['--ink'] && ey[2].indexOf(tk['--clay-fill']) >= 0, JSON.stringify(ey));
    t.check('Sign in (dark): no page errors', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 3. Sign in: no sideways scroll, the button on screen, at 320 / 375 / 390 ──
  for (const w of WIDTHS) {
    const h = w === 320 ? 568 : w === 375 ? 667 : 844;
    for (const dark of [false, true]) {
      const { ctx, p } = await openSignedOut(browser, { w, h, dark });
      const s = await sideways(p);
      const go = await rect(p, '#si-go');
      t.check(`Sign in at ${w} x ${h}${dark ? ' dark' : ''}: no sideways scroll`, s <= 0, s);
      t.check(`Sign in at ${w} x ${h}${dark ? ' dark' : ''}: Sign in is on screen without scrolling`, go && go.b <= h, JSON.stringify(go));
      if (!dark) {
        await p.fill('#si-user', 'someone_one'); await p.fill('#si-pass', 'abc12345'); await p.click('#si-go');
        await p.waitForFunction(() => !document.getElementById('si-err').hidden, null, { timeout: 8000 }).catch(() => {});
        t.check(`Sign in at ${w} x ${h}: still no sideways scroll with the error line shown`, (await sideways(p)) <= 0, await sideways(p));
      }
      await ctx.close();
    }
  }

  // ── 4. Welcome ──
  {
    const { ctx, p } = await openFresh(browser, { fonts: true });
    const tk = await tokens(p);
    t.check('Welcome: it opens for a fresh athlete, once Home is painted', await p.evaluate(() => !!document.querySelector('.wel')));
    const W = await p.evaluate(() => {
      const q = s => document.querySelector(s), cs = e => getComputedStyle(e), r = e => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, b: b.bottom, r: b.right }; };
      const hero = q('.wel-hero'), img = q('.wel-hero img'), scrim = q('.wel-scrim'), eye = q('.wel-eyebrow'), dot = getComputedStyle(eye, '::before'), title = q('.wel-title'), x = q('.wel-x'), sheet = q('.wel-sheet');
      const go = q('.wel-go'), skip = q('.wel-skip'), sign = q('.wel-sheet .wn-sign'), modal = q('#hist-overlay .readiness-modal');
      const ps = [...sheet.querySelectorAll('p')].map(e => e.innerText);
      return {
        hero: { bgImage: cs(hero).backgroundImage.slice(0, 16), iso: cs(hero).isolation, h: r(hero).h },
        img: { src: img.getAttribute('src'), blend: cs(img).mixBlendMode, op: cs(img).opacity, mask: (cs(img).maskImage || cs(img).webkitMaskImage || '').slice(0, 40), fit: cs(img).objectFit, in: img.classList.contains('in'), alt: img.getAttribute('alt') },
        scrim: cs(scrim).backgroundImage.slice(0, 60),
        eyebrow: { text: eye.innerText, font: cs(eye).fontFamily, caps: cs(eye).textTransform, dot: [dot.width, dot.height, dot.backgroundColor], color: cs(eye).color },
        title: { text: title.innerText.replace(/\s+/g, ' '), font: cs(title).fontFamily, weight: cs(title).fontWeight, color: cs(title).color, caps: cs(title).textTransform, size: parseFloat(cs(title).fontSize) },
        x: { w: r(x).w, h: r(x).h, radius: cs(x).borderRadius, bg: cs(x).backgroundColor, text: x.textContent, label: x.getAttribute('aria-label'), top: r(x).y, right: innerWidth - r(x).r, blur: cs(x).backdropFilter || cs(x).webkitBackdropFilter },
        sheet: { bg: cs(sheet).backgroundColor, tl: cs(sheet).borderTopLeftRadius, tr: cs(sheet).borderTopRightRadius, modal: modal ? cs(modal).borderTopLeftRadius : null },
        ps, pColors: [...sheet.querySelectorAll('p')].map(e => cs(e).color), pSizes: [...sheet.querySelectorAll('p')].map(e => cs(e).fontSize),
        sign: sign ? { sig: !!sign.querySelector('svg.wn-sig'), sigLabel: sign.querySelector('svg.wn-sig') && sign.querySelector('svg.wn-sig').getAttribute('aria-label'), av: !!sign.querySelector('.wn-av'), avImg: sign.querySelector('.wn-av img') && sign.querySelector('.wn-av img').getAttribute('src'), rect: r(sign) } : null,
        order: [...sheet.children].map(e => e.className || e.tagName).join(' > '),
        go: { text: go.innerText, bg: cs(go).backgroundImage !== 'none' ? cs(go).backgroundImage : cs(go).backgroundColor, color: cs(go).color, h: r(go).h, radius: cs(go).borderTopLeftRadius, font: cs(go).fontFamily, bottom: r(go).b },
        skip: { text: skip.innerText, color: cs(skip).color, h: r(skip).h, bg: cs(skip).backgroundColor, border: cs(skip).borderTopWidth, bottom: r(skip).b },
        vh: innerHeight, scrollable: q('.wel').scrollHeight - q('.wel').clientHeight,
        old: ['.wel-hero img.in'].length && !!q('.wel-hero img.in'),
      };
    });
    t.check('Welcome: the hero is a cover on --hero, isolated so the picture can blend', W.hero.bgImage === 'radial-gradient(' && W.hero.iso === 'isolate', JSON.stringify(W.hero));
    t.check('Welcome: the welcome picture is graded into the green as the archive cover does it (luminosity, masked from the left, faded to .7)', /welcome-v1\.webp$/.test(W.img.src) && W.img.blend === 'luminosity' && /linear-gradient/.test(W.img.mask) && W.img.fit === 'cover' && W.img.in && Math.abs(parseFloat(W.img.op) - 0.7) < 0.02 && W.img.alt === '', JSON.stringify(W.img));
    t.check('Welcome: a scrim runs to the cover\'s last colour', /linear-gradient/.test(W.scrim), W.scrim);
    t.check('Welcome: the eyebrow reads YOU\'RE IN in the mint-dot recipe', W.eyebrow.text === 'YOU\'RE IN' && /Space Mono/.test(W.eyebrow.font) && W.eyebrow.caps === 'uppercase' && W.eyebrow.dot[0] === '7px' && W.eyebrow.dot[1] === '7px' && W.eyebrow.dot[2] === tk['--mint'] && !isClay(W.eyebrow.color), JSON.stringify(W.eyebrow));
    t.check('Welcome: the title is WELCOME, ALEX. in Barlow Condensed 900 capitals, white', W.title.text === 'WELCOME, ALEX.' && /Barlow Condensed/.test(W.title.font) && W.title.weight === '900' && W.title.caps === 'uppercase' && W.title.color === tk['--on-accent'] && W.title.size >= 32 && W.title.size <= 44, JSON.stringify(W.title));
    t.check('Welcome: ✕ is the 44 px glass button top right (the archive\'s ←, mirrored), clear of the top', W.x.w === 44 && W.x.h === 44 && W.x.radius === '50%' && W.x.bg === 'rgba(0, 0, 0, 0.22)' && /blur/.test(W.x.blur || '') && W.x.text === '✕' && W.x.label === 'Close' && W.x.right === 8 && W.x.top >= 8, JSON.stringify(W.x));
    t.check('Welcome: the sheet is the paper, its top corners the app\'s one sheet\'s radius', W.sheet.bg === tk['--paper'] && W.sheet.tl === W.sheet.modal && W.sheet.tr === W.sheet.modal, JSON.stringify(W.sheet));
    t.check('Welcome: the two lines are unchanged (ink and grey)', W.ps.length === 2 && /^Your plan is ready\. First up is .+\.$/.test(W.ps[0]) && W.ps[1] === 'Any questions, message me on WhatsApp. The button is in the Coach tab.' && W.pColors[0] === tk['--ink'] && W.pColors[1] === tk['--grey'] && W.pSizes[0] === '15px' && W.pSizes[1] === '13px', JSON.stringify([W.ps, W.pColors, W.pSizes]));
    t.check('Welcome: Amir\'s signature and photo sit under the two lines, as the week note signs, before the buttons', !!W.sign && W.sign.sig && W.sign.sigLabel === 'Amir' && W.sign.av && /assets\/img\/coach\.jpg$/.test(W.sign.avImg || '') && W.order === 'P > sub > wn-sign > wel-go > wel-skip', JSON.stringify([W.sign, W.order]));
    t.check('Welcome: Open Day 1 is the one primary green button', /^OPEN DAY \d+$/.test(W.go.text) && W.go.bg === tk['--btn'] && W.go.color === tk['--on-accent'] && W.go.h >= 48 && W.go.radius === '8px' && /Barlow Condensed/.test(W.go.font), JSON.stringify(W.go));
    t.check('Welcome: Look around first is quiet green-ink text, at least 44 px tall, no box', W.skip.text === 'Look around first' && W.skip.color === tk['--green-ink'] && W.skip.h >= 44 && W.skip.border === '0px' && W.skip.bg === 'rgba(0, 0, 0, 0)', JSON.stringify(W.skip));
    t.check('Welcome (390 x 844): both buttons are on screen', W.go.bottom <= W.vh && W.skip.bottom <= W.vh, JSON.stringify([W.go.bottom, W.skip.bottom, W.vh]));
    const ov = await sideways(p);
    t.check('Welcome: no sideways scroll', ov <= 0, ov);
    const small = await p.evaluate(() => [...document.querySelectorAll('.wel button')].map(e => { const r = e.getBoundingClientRect(); return { n: e.className, w: r.width, h: r.height }; }).filter(c => c.w < 43.5 || c.h < 43.5));
    t.check('Welcome: every control is at least 44 px', small.length === 0, JSON.stringify(small));
    t.check('Welcome: no page errors', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // Welcome, short and narrow: the button on screen without scrolling at 320 x 568 (and at 375 x 667)
  for (const [w, h] of [[320, 568], [375, 667]]) {
    const { ctx, p } = await openFresh(browser, { w, h });
    const r = await p.evaluate(() => { const b = e => document.querySelector(e).getBoundingClientRect(); return { go: b('.wel-go').bottom, skip: b('.wel-skip').bottom, title: b('.wel-title').bottom, hero: b('.wel-hero').height, scroll: document.querySelector('.wel').scrollHeight - document.querySelector('.wel').clientHeight, vh: innerHeight, side: document.documentElement.scrollWidth - innerWidth, titleTop: b('.wel-title').top, x: b('.wel-x').bottom, eyebrowTop: b('.wel-eyebrow').top }; });
    t.check(`Welcome at ${w} x ${h}: Open Day 1 is on screen without scrolling`, r.go <= r.vh, JSON.stringify(r));
    t.check(`Welcome at ${w} x ${h}: Look around first is on screen too (nothing to scroll)`, r.skip <= r.vh && r.scroll <= 0, JSON.stringify(r));
    t.check(`Welcome at ${w} x ${h}: the title clears the ✕ and nothing runs sideways`, r.eyebrowTop >= r.x - 2 && r.side <= 0, JSON.stringify(r));
    await ctx.close();
  }

  // Welcome: the three ways out, and the phone's Back
  {
    const { ctx, p } = await openFresh(browser, {});
    await p.evaluate(() => { const orig = window.openDayView; window.__opened = []; window.openDayView = function (id) { window.__opened.push(String(id)); return orig.apply(this, arguments); }; });
    await p.click('.wel-go'); await p.waitForTimeout(600);
    const od = await p.evaluate(() => ({ wel: !!document.querySelector('.wel'), dayView: !document.getElementById('day-view').hidden, cards: document.querySelectorAll('#day-view .checklist-item').length, opened: window.__opened, first: String(suggestedDayId() || DATA.workouts.days[0].id), home: document.querySelector('.screen.active').id }));
    t.check('Welcome: Open Day 1 closes it and opens the Next up day (the first day when none is suggested)', !od.wel && od.dayView && od.cards > 0 && od.opened.length === 1 && od.opened[0] === od.first, JSON.stringify(od));
    t.check('Welcome: no page errors after Open Day 1', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
  {
    const { ctx, p } = await openFresh(browser, {});
    await p.click('.wel-skip'); await p.waitForTimeout(300);
    t.check('Welcome: Look around first closes it and stays on Home', await p.evaluate(() => !document.querySelector('.wel') && document.querySelector('.screen.active').id === 'screen-home'));
    // once only: a second sign-in on this phone has met it
    await p.evaluate(() => { localStorage.setItem('aa_fresh_signin', '1'); });
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => document.getElementById('loading') && document.getElementById('loading').classList.contains('hidden'), null, { timeout: 20000 });
    await p.waitForTimeout(500);
    t.check('Welcome: it never shows twice (a second sign-in on this phone)', await p.evaluate(() => !document.querySelector('.wel')));
    t.check('Welcome: the flag is spent whether it showed or not', await p.evaluate(() => localStorage.getItem('aa_fresh_signin') === null));
    await ctx.close();
  }
  {
    const { ctx, p } = await openFresh(browser, {});
    await p.click('.wel-x'); await p.waitForTimeout(300);
    t.check('Welcome: ✕ closes it', await p.evaluate(() => !document.querySelector('.wel')));
    await ctx.close();
  }
  {
    const { ctx, p } = await openFresh(browser, {});
    await p.goBack().catch(() => {}); await p.waitForTimeout(500);
    const after = await p.evaluate(() => ({ wel: !!document.querySelector('.wel'), path: location.pathname }));
    t.check('Welcome: the phone\'s Back closes it and stays on the app', !after.wel && /program\.html$/.test(after.path), JSON.stringify(after));
    await ctx.close();
  }
  {
    // never in the demo: the flag is set, nothing "welcomed" yet
    const { ctx, p } = await H.openProgram(browser, { fresh: true, query: '?client=demo', stub: { demo: H.fixture() } });
    await p.evaluate(() => { localStorage.setItem('aa_fresh_signin', '1'); });
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => document.getElementById('loading') && document.getElementById('loading').classList.contains('hidden'), null, { timeout: 20000 });
    await p.waitForTimeout(500);
    t.check('Welcome: never in the demo', await p.evaluate(() => window.IS_DEMO === true && !document.querySelector('.wel')));
    await ctx.close();
  }

  // A wide window: the Welcome, Loading and Error sit in the app's 520 px column, as every other layer does; Sign in's card keeps its 460 px
  {
    const { ctx, p } = await openFresh(browser, { w: 1100, h: 800 });
    const r = await p.evaluate(() => { const b = document.querySelector('.wel').getBoundingClientRect(), x = document.querySelector('.wel-x').getBoundingClientRect(); return { x: b.x, w: b.width, xr: x.right, iw: innerWidth }; });
    t.check('Welcome in a wide window: it sits in the 520 px column, centred, its ✕ inside it', Math.abs(r.w - 520) <= 1 && Math.abs(r.x - (r.iw - 520) / 2) <= 1 && r.xr <= r.x + r.w, JSON.stringify(r));
    await ctx.close();
  }
  {
    const { ctx, p } = await openSignedOut(browser, { w: 1100, h: 800 });
    const r = await p.evaluate(() => { const b = document.querySelector('.signin-card').getBoundingClientRect(); return { x: b.x, w: b.width, iw: innerWidth, side: document.documentElement.scrollWidth - innerWidth }; });
    t.check('Sign in in a wide window: the card keeps its 460 px column, centred, nothing sideways', Math.abs(r.w - 460) <= 1 && Math.abs(r.x - (r.iw - 460) / 2) <= 1 && r.side <= 0, JSON.stringify(r));
    await ctx.close();
  }

  // ── 5. Loading ──
  {
    const { ctx, p } = await openLoading(browser, { fonts: true });
    const tk = await tokens(p);
    const Lo = await p.evaluate(() => {
      const q = s => document.querySelector(s), cs = e => getComputedStyle(e), r = e => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, b: b.bottom }; };
      const root = q('#loading'), mark = q('#loading .loading-mark'), ring = q('#loading .loading-spinner'), label = q('#loading .loading-text');
      return {
        visible: !root.classList.contains('hidden'), bg: cs(root).backgroundColor, pos: cs(root).position, align: [cs(root).alignItems, cs(root).justifyContent, cs(root).flexDirection],
        mark: mark ? { src: mark.getAttribute('src'), w: r(mark).w, h: r(mark).h, radius: cs(mark).borderRadius, loaded: mark.complete && mark.naturalWidth > 0, y: r(mark).y, b: r(mark).b } : null,
        ring: { w: ring.offsetWidth, h: ring.offsetHeight, border: cs(ring).borderTopWidth, ringColor: cs(ring).borderLeftColor, arc: cs(ring).borderTopColor, radius: cs(ring).borderTopLeftRadius, anim: cs(ring).animationName, dur: cs(ring).animationDuration, y: r(ring).y, b: r(ring).b },
        label: { text: label.innerText, raw: label.textContent, font: cs(label).fontFamily, caps: cs(label).textTransform, color: cs(label).color, y: r(label).y, size: cs(label).fontSize },
        centre: [r(mark).x + r(mark).w / 2, ring.getBoundingClientRect().x + ring.getBoundingClientRect().width / 2, r(label).x + r(label).w / 2, innerWidth / 2],
      };
    });
    t.check('Loading: the paper, covering the screen, everything centred', Lo.visible && Lo.bg === tk['--paper'] && Lo.pos === 'fixed' && Lo.align[0] === 'center' && Lo.align[1] === 'center' && Lo.align[2] === 'column', JSON.stringify([Lo.visible, Lo.bg, Lo.pos, Lo.align]));
    t.check('Loading: the mark is icon-192.png, 52 px, the sign-in\'s 13 px radius, and it loaded', !!Lo.mark && /assets\/img\/icon-192\.png$/.test(Lo.mark.src) && Lo.mark.w === 52 && Lo.mark.h === 52 && Lo.mark.radius === '13px' && Lo.mark.loaded, JSON.stringify(Lo.mark));
    t.check('Loading: under the mark a 32 px ring: a --hair ring and a green arc', Lo.ring.w === 32 && Lo.ring.h === 32 && Lo.ring.border === '3px' && Lo.ring.ringColor === tk['--hair'] && Lo.ring.arc === tk['--green-ink'] && Lo.ring.radius === '50%' && !!Lo.mark && Lo.ring.y >= Lo.mark.b, JSON.stringify(Lo.ring));
    t.check('Loading: the ring turns (spin, 0.8 s)', Lo.ring.anim === 'spin' && Lo.ring.dur === '0.8s', JSON.stringify([Lo.ring.anim, Lo.ring.dur]));
    t.check('Loading: under the ring the label reads "Loading your plan", Space Mono capitals in --grey', Lo.label.raw === 'Loading your plan' && Lo.label.text === 'LOADING YOUR PLAN' && /Space Mono/.test(Lo.label.font) && Lo.label.caps === 'uppercase' && Lo.label.color === tk['--grey'] && Lo.label.y >= Lo.ring.b && Lo.label.size === '11px', JSON.stringify(Lo.label));
    t.check('Loading: the mark, the ring and the label share one centre line', Lo.centre.every(c => Math.abs(c - Lo.centre[3]) <= 1), JSON.stringify(Lo.centre));
    // it fades out when the app is ready
    await p.evaluate(() => document.getElementById('loading').classList.add('hidden'));
    await p.waitForTimeout(550);
    const gone = await p.evaluate(() => { const s = getComputedStyle(document.getElementById('loading')); return { op: s.opacity, pe: s.pointerEvents, tr: s.transitionDuration, prop: s.transitionProperty }; });
    t.check('Loading: .hidden fades it out in 0.4 s and lets taps through', gone.op === '0' && gone.pe === 'none' && gone.tr === '0.4s' && gone.prop === 'opacity', JSON.stringify(gone));
    t.check('Loading: no page errors', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
  {
    const { ctx, p } = await openLoading(browser, { reduce: true });
    const m = await p.evaluate(() => ({ reduce: matchMedia('(prefers-reduced-motion: reduce)').matches, dur: getComputedStyle(document.querySelector('#loading .loading-spinner')).animationDuration, name: getComputedStyle(document.querySelector('#loading .loading-spinner')).animationName, state: getComputedStyle(document.querySelector('#loading .loading-spinner')).animationPlayState }));
    t.check('Loading, reduced motion: the ring turns slowly (3 s), it does not stop', m.reduce && m.dur === '3s' && m.name === 'spin' && m.state === 'running', JSON.stringify(m));
    await ctx.close();
  }
  {
    const { ctx, p } = await openLoading(browser, { w: 320, h: 568 });
    const r = await p.evaluate(() => { const b = e => document.querySelector(e).getBoundingClientRect(); return { top: b('#loading .loading-mark').top, bottom: b('#loading .loading-text').bottom, vh: innerHeight, side: document.documentElement.scrollWidth - innerWidth }; });
    t.check('Loading at 320 x 568: all three pieces on screen, nothing sideways', r.top >= 0 && r.bottom <= r.vh && r.side <= 0, JSON.stringify(r));
    await ctx.close();
  }

  // ── 6. Error: a refused sign-in (Plan not available, two buttons) and no signal with no saved plan (No connection, one button) ──
  const ERR = `(() => {
    const q = s => document.querySelector(s), cs = e => getComputedStyle(e), r = e => { const b = e.getBoundingClientRect(); return { w: Math.round(b.width * 10) / 10, h: Math.round(b.height * 10) / 10, b: b.bottom, x: b.x }; };
    const root = q('#error-screen'), icon = q('#error-icon'), svg = icon.querySelector('svg'), title = q('#error-title'), msg = q('#error-msg'), acts = q('#error-actions');
    const btns = [...acts.querySelectorAll('.error-btn')].map(b => ({ tag: b.tagName, text: b.innerText, cls: b.className, bg: cs(b).backgroundImage !== 'none' ? cs(b).backgroundImage : cs(b).backgroundColor, color: cs(b).color, h: r(b).h, w: r(b).w, radius: cs(b).borderTopLeftRadius, shadow: cs(b).boxShadow, border: cs(b).borderTopWidth + ' ' + cs(b).borderTopColor, font: cs(b).fontFamily, weight: cs(b).fontWeight, caps: cs(b).textTransform, size: cs(b).fontSize, href: b.getAttribute('href'), onclick: b.getAttribute('onclick'), outline: cs(b).outlineStyle }));
    return { visible: root.classList.contains('visible'), bg: cs(root).backgroundColor, display: cs(root).display, pos: cs(root).position,
      icon: { color: cs(icon).color, w: r(svg).w, h: r(svg).h, kind: svg.innerHTML.indexOf('M1 1l22 22') >= 0 ? 'offline' : svg.innerHTML.indexOf('rect') >= 0 ? 'locked' : '?' },
      title: { text: title.textContent, font: cs(title).fontFamily, weight: cs(title).fontWeight, caps: cs(title).textTransform, color: cs(title).color, size: cs(title).fontSize, align: cs(title).textAlign },
      msg: { text: msg.textContent, color: cs(msg).color, size: cs(msg).fontSize, align: cs(msg).textAlign, max: cs(msg).maxWidth, w: r(msg).w },
      btns, side: document.documentElement.scrollWidth - innerWidth, hiddenLoading: q('#loading').classList.contains('hidden') };
  })()`;

  {
    const { ctx, p } = await H.openProgram(browser, { stub: { mode: 'refuse' }, fonts: true });
    await p.evaluate(HELP);
    const tk = await tokens(p);
    const E = await p.evaluate(ERR);
    t.check('Error (refused): the screen shows over a hidden loading screen, on the paper', E.visible && E.hiddenLoading && E.bg === tk['--paper'] && E.display === 'flex' && E.pos === 'fixed', JSON.stringify([E.visible, E.bg, E.display]));
    t.check('Error (refused): the title is "Plan not available" in Barlow Condensed 900 capitals, in --ink, centred', E.title.text === 'Plan not available' && /Barlow Condensed/.test(E.title.font) && E.title.weight === '900' && E.title.caps === 'uppercase' && E.title.color === tk['--ink'] && E.title.align === 'center' && E.title.size === '28px', JSON.stringify(E.title));
    t.check('Error (refused): the message is the same words, in --ink at reading size, centred, at most 340 px', E.msg.text === 'This sign-in or link isn\'t accepted any more. Sign in again, or message Amir on WhatsApp if it keeps happening.' && E.msg.color === tk['--ink'] && E.msg.size === '15px' && E.msg.align === 'center' && E.msg.max === '340px' && E.msg.w <= 340, JSON.stringify(E.msg));
    t.check('Error (refused): the icon is the lock, in clay, 46 px', E.icon.kind === 'locked' && E.icon.color === tk['--clay-big'] && E.icon.w === 46 && E.icon.h === 46, JSON.stringify(E.icon));
    const [a, b] = E.btns;
    t.check('Error (refused): two buttons, Sign in again then Message Amir on WhatsApp', E.btns.length === 2 && a.text === 'SIGN IN AGAIN' && b.text === 'MESSAGE AMIR ON WHATSAPP' && a.tag === 'BUTTON' && b.tag === 'A', JSON.stringify(E.btns.map(x => [x.tag, x.text])));
    t.check('Error (refused): Sign in again is the one primary green button, at least 48 px', a.bg === tk['--btn'] && a.color === tk['--on-accent'] && a.h >= 48 && a.radius === '8px' && /Barlow Condensed/.test(a.font) && a.weight === '700' && a.caps === 'uppercase' && a.size === '15px', JSON.stringify(a));
    t.check('Error (refused): the WhatsApp button is the outlined twin: no fill, green-ink text, the --field edge, at least 48 px', b.bg === 'rgba(0, 0, 0, 0)' && b.color === tk['--green-ink'] && b.h >= 48 && b.shadow.indexOf(tk['--field']) >= 0 && /inset/.test(b.shadow) && b.radius === '8px' && b.border.startsWith('0px'), JSON.stringify(b));
    t.check('Error (refused): neither button computes the old --yellow-mid edge', !JSON.stringify(E.btns).includes('rgba(14, 74, 54, 0.22)'), JSON.stringify(E.btns.map(x => x.shadow)));
    t.check('Error (refused): the WhatsApp link is the same (the number and the message)', b.href === 'https://wa.me/447435363461?text=' + encodeURIComponent("Hi Amir, the app won't open my plan. "), b.href);
    t.check('Error (refused): both buttons are the same width and nothing runs sideways', Math.abs(a.w - b.w) <= 1 && E.side <= 0, JSON.stringify([a.w, b.w, E.side]));
    // Sign in again calls signOutAthlete() (spied: the real one reloads the page)
    await p.evaluate(() => { window.__out = 0; window.signOutAthlete = function () { window.__out++; }; });
    await p.click('#error-actions button.error-btn');
    t.check('Error (refused): Sign in again calls signOutAthlete()', (await p.evaluate(() => window.__out)) === 1 && a.onclick === 'signOutAthlete()', a.onclick);
    const ctrl = await p.evaluate(() => [...document.querySelectorAll('#error-screen .error-btn')].map(e => { const r = e.getBoundingClientRect(); return r.height >= 47.5 && r.width >= 100; }));
    t.check('Error (refused): both buttons are big enough to hit', ctrl.every(Boolean), JSON.stringify(ctrl));
    t.check('Error (refused): no page errors', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
  {
    const { ctx, p } = await H.openProgram(browser, { stub: { mode: 'offline' }, fonts: true });
    await p.evaluate(HELP);
    const tk = await tokens(p);
    const E = await p.evaluate(ERR);
    t.check('Error (no signal): "No connection" on the paper with the offline icon in clay', E.visible && E.title.text === 'No connection' && E.bg === tk['--paper'] && E.icon.kind === 'offline' && E.icon.color === tk['--clay-big'], JSON.stringify([E.title.text, E.icon]));
    t.check('Error (no signal): the message is the same words, in --ink', E.msg.text === 'The app couldn\'t reach the server, and this phone hasn\'t saved your plan yet. Try again when you have signal. Once it has opened with a connection, it opens without one too.' && E.msg.color === tk['--ink'] && E.msg.size === '15px', JSON.stringify(E.msg));
    t.check('Error (no signal): one button, Try again, the primary green, reloads', E.btns.length === 1 && E.btns[0].text === 'TRY AGAIN' && E.btns[0].onclick === 'location.reload()' && E.btns[0].bg === tk['--btn'] && E.btns[0].color === tk['--on-accent'] && E.btns[0].h >= 48, JSON.stringify(E.btns));
    t.check('Error (no signal): the title is in --ink', E.title.color === tk['--ink'], E.title.color);
    t.check('Error (no signal): no page errors', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
  for (const w of WIDTHS) {
    const h = w === 320 ? 568 : w === 375 ? 667 : 844;
    const { ctx, p } = await H.openProgram(browser, { stub: { mode: 'refuse' }, w, h });
    const E = await p.evaluate(ERR);
    t.check(`Error at ${w} x ${h}: both buttons on screen, nothing sideways`, E.btns.every(b => b.w > 0) && E.btns.length === 2 && E.side <= 0 && (await p.evaluate(() => document.querySelector('#error-actions').getBoundingClientRect().bottom)) <= h, JSON.stringify([E.side, h]));
    await ctx.close();
  }
  {
    // dark: the error screen reads too
    const { ctx, p } = await H.openProgram(browser, { stub: { mode: 'refuse' }, dark: true });
    await p.evaluate(HELP);
    await p.evaluate(() => document.body.setAttribute('data-dark', ''));
    const tk = await tokens(p);
    const E = await p.evaluate(ERR);
    const c = await p.evaluate(() => ['#error-title', '#error-msg', '#error-actions .ghost'].map(s => [s, window.__T.contrast(document.querySelector(s))]));
    t.check('Error (dark): the dark paper, ink title and words, the ghost in green ink', E.bg === tk['--paper'] && E.title.color === tk['--ink'] && E.msg.color === tk['--ink'] && E.btns[1].color === tk['--green-ink'] && tk['--paper'] === 'rgb(24, 24, 24)', JSON.stringify([E.bg, E.title.color, E.btns[1].color]));
    t.check('Error (dark): title, message and the ghost are at least 4.5:1', c.every(([, r]) => r && r >= 4.5), JSON.stringify(c));
    await ctx.close();
  }

  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
