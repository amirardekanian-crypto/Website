// The Coach tab in the Centre Court look (Amir, 2026-10-13: "continue until everything has a consistent design"): a header like Progress's
// (● YOUR COACH, COACH AMIR, one mono line), the WhatsApp panel as the screen's one green thing (ONE link, the same href and pre-filled message,
// signed with his signature and photo), the number as selectable text, Notes from Amir as fold rows (one open at a time, aria-expanded), and
// How the app works as one door row. Serve the repo first (python -m http.server 8765 --bind 127.0.0.1, see lib.js), then:
//   node scripts/headless/coach-tab.js [--out <dir>]
// It also takes the screenshots for the review (375 x 667 and 320 x 568 light, 390 x 844 dark: the Coach tab with two notes, one open) into --out.
'use strict';
const path = require('path');
const H = require('./lib');

const GREEN = 'rgb(14, 74, 54)', INK = 'rgb(26, 26, 26)', GREY = 'rgb(92, 92, 92)', HAIR = 'rgb(228, 221, 209)', WHITE = 'rgb(255, 255, 255)';

// Two notes (the first dated, with a list in its body), as coaches write them: an emoji for the icon, HTML for the body.
const NOTES = { greeting: 'For You, Alex', cards: [
  { icon: '🛌', title: 'Sleep before the tournament', date: '12 Oct',
    body: '<p>Aim for <strong>eight hours</strong> the two nights before you play.</p><ul><li>Phone out of the bedroom</li><li>Same bedtime, even on Saturday</li></ul><p>If you only get six, do not panic. Play your game.</p>' },
  { icon: '🍽️', title: 'Eating on match days', body: '<p>Eat what you have eaten before. Nothing new on the day.</p>' },
] };
function prog(notes) {
  const P = H.fixture();
  if (notes === null) delete P.notes; else P.notes = notes || NOTES;
  return P;
}

// Every text node the active screen draws, as a client rect, against the account button's (the same sweep as home-progress.js).
const OVERLAP = `(() => {
  const b = document.getElementById('global-account'), r = b.getBoundingClientRect();
  if (!r.width) return { hidden: true, hits: [] };
  const hits = [], tw = document.createTreeWalker(document.querySelector('.screen.active'), NodeFilter.SHOW_TEXT);
  for (let n; (n = tw.nextNode());) {
    if (!n.textContent.trim() || !n.parentElement) continue;
    const cs = getComputedStyle(n.parentElement);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const range = document.createRange(); range.selectNodeContents(n);
    for (const q of range.getClientRects()) {
      if (q.width < 1 || q.height < 1) continue;
      if (q.left < r.right && q.right > r.left && q.top < r.bottom && q.bottom > r.top) hits.push(n.textContent.trim().slice(0, 28));
    }
  }
  return { hidden: false, hits, rect: [r.left, r.top, r.right, r.bottom].map(Math.round) };
})()`;

const sideways = p => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
// The background of a token (--hero, --tile-on-green) as the browser computes it, so a panel is compared with the real thing, not a copy of its numbers.
const tokenBg = (p, v) => p.evaluate(v => { const d = document.createElement('div'); d.style.background = 'var(' + v + ')'; document.body.appendChild(d); const bg = getComputedStyle(d).backgroundImage; d.remove(); return bg; }, v);
const goCoach = async p => { await p.evaluate(() => { window.scrollTo(0, 0); goTo('notes'); }); await p.waitForTimeout(500); };
const rect = (p, sel) => p.evaluate(sel => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { top: Math.round((r.top + scrollY) * 10) / 10, bottom: Math.round((r.bottom + scrollY) * 10) / 10, left: Math.round(r.left * 10) / 10, right: Math.round(r.right * 10) / 10, w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 }; }, sel);
const open = p => p.evaluate(() => [...document.querySelectorAll('#screen-notes .cn-row')].map(b => b.getAttribute('aria-expanded') + ':' + (document.getElementById(b.getAttribute('aria-controls')).offsetHeight > 0 ? 'shown' : 'hidden')).join(' '));
const tap = async (p, sel) => { await p.evaluate(sel => document.querySelector(sel).scrollIntoView({ block: 'center' }), sel); await p.click(sel); await p.waitForTimeout(150); };

(async () => {
  const shots = H.outDir();
  const t = H.checker();
  const browser = await H.launch();

  // ── 1. the header: ● YOUR COACH, COACH AMIR as Progress's title, one mono line, no photo; the old parts are gone ──
  {
    const { ctx, p } = await H.openProgram(browser, { prog: prog() });
    await p.evaluate(() => goTo('plan')); await p.waitForTimeout(500);
    const pr = await p.evaluate(() => { const t = document.querySelector('#athlete-card-wrap .prog-title'), e = document.querySelector('#athlete-card-wrap .prog-eyebrow');
      const f = el => { const c = getComputedStyle(el); return [c.fontFamily.split(',')[0].replace(/["']/g, ''), c.fontSize, c.fontWeight, c.letterSpacing, c.color, c.textTransform, c.lineHeight].join('|'); }; return { title: f(t), eyebrow: f(e) }; });
    await goCoach(p);
    const h = await p.evaluate(() => {
      const s = document.getElementById('screen-notes'), h1 = s.querySelector('h1'), eb = s.querySelector('.prog-eyebrow'), role = s.querySelector('.coach-role');
      const f = el => { const c = getComputedStyle(el); return [c.fontFamily.split(',')[0].replace(/["']/g, ''), c.fontSize, c.fontWeight, c.letterSpacing, c.color, c.textTransform, c.lineHeight].join('|'); };
      const dot = getComputedStyle(eb, '::before');
      return { h1s: s.querySelectorAll('h1').length, title: h1 && h1.textContent.trim(), titleF: h1 && f(h1), eyebrow: eb && eb.textContent.trim(), eyebrowF: eb && f(eb), dot: dot.content + '|' + dot.width + '|' + dot.height + '|' + dot.backgroundColor,
        role: role && role.textContent.trim(), roleCaps: role && getComputedStyle(role).textTransform, roleFont: role && getComputedStyle(role).fontFamily, roleSize: role && getComputedStyle(role).fontSize, roleColor: role && getComputedStyle(role).color,
        headImg: !!s.querySelector('.coach-head img, .coach-head .coach-avatar'),
        old: ['.coach-hero', '.coach-avatar', '.coach-wa', '.coach-wa-num', '.note-personal', '.note-tile', '.note-cta', '.notes-section-label', '.app-help-row', '.coach-status'].filter(q => s.querySelector(q)),
        order: [...s.querySelectorAll('.coach-head, .coach-panel, .coach-num, .prog-sec, .cn-list, .hrow')].map(e => e.className.split(' ')[0]).join(' ') };
    });
    t.check('header: one h1, "Coach Amir", the same face, weight, size, colour and caps as Progress\'s title (44 px Barlow Condensed 900)',
      h.h1s === 1 && h.title === 'Coach Amir' && h.titleF === pr.title && /^Barlow Condensed\|44px\|900\|/.test(h.titleF), JSON.stringify([h.title, h.titleF, pr.title]));
    t.check('header: the eyebrow "Your coach" is Progress\'s eyebrow (Space Mono 11 px, green ink, spaced capitals) with its green dot',
      h.eyebrow === 'Your coach' && h.eyebrowF === pr.eyebrow && /^Space Mono\|11px\|700\|2px\|rgb\(14, 74, 54\)\|uppercase\|/.test(h.eyebrowF) && /7px\|7px\|rgb\(14, 74, 54\)$/.test(h.dot), JSON.stringify([h.eyebrow, h.eyebrowF, pr.eyebrow, h.dot]));
    t.check('header: one mono line, "Strength & conditioning coach", in capitals, grey, 11 px Space Mono',
      h.role === 'Strength & conditioning coach' && h.roleCaps === 'uppercase' && /Space Mono/.test(h.roleFont) && h.roleSize === '11px' && h.roleColor === GREY, JSON.stringify([h.role, h.roleCaps, h.roleFont, h.roleSize, h.roleColor]));
    t.check('header: no photo or avatar in it (his photo is in the panel)', !h.headImg, String(h.headImg));
    t.check('the old Coach parts are gone (hero, avatar, coloured tiles, Tap to read, section labels, the old row)', h.old.length === 0, h.old.join());
    t.check('order top to bottom: header, the panel, the number, Notes from Amir, the notes, then the one door row', h.order === 'coach-head coach-panel coach-num prog-sec cn-list hrow', h.order);
    t.check('no page errors (header)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 2. the panel: ONE green thing, ONE link (same href, target, pre-filled message), words kept, the button inside the link, the sign-off ──
  {
    const { ctx, p } = await H.openProgram(browser, { prog: prog() });
    await goCoach(p);
    const want = await p.evaluate(() => coachWhatsAppUrl());
    const hero = await tokenBg(p, '--hero'), btnBg = await tokenBg(p, '--tile-on-green');
    const o = await p.evaluate(() => {
      const s = document.getElementById('screen-notes'), a = s.querySelector('.coach-panel');
      const cs = getComputedStyle(a), btn = a.querySelector('.coach-panel-btn'), title = a.querySelector('.coach-panel-title'), eye = a.querySelector('.coach-panel-eye'), line = a.querySelector('.coach-panel-line');
      const img = a.querySelector('.coach-panel-img'), by = a.querySelector('.coach-panel-by'), sig = by && by.querySelector('.wn-sig'), av = by && by.querySelector('.wn-av');
      const dot = getComputedStyle(eye, '::before');
      return { tag: a.tagName, href: a.getAttribute('href'), target: a.target, rel: a.rel, label: a.getAttribute('aria-label'), anchors: s.querySelectorAll('a').length, inside: a.querySelectorAll('a, button, input').length, btnTag: btn.tagName,
        bg: cs.backgroundImage, radius: cs.borderTopLeftRadius, color: cs.color, deco: cs.textDecorationLine, mL: cs.marginLeft, mR: cs.marginRight, gutter: getComputedStyle(document.body).getPropertyValue('--g').trim(),
        eye: eye.textContent.trim(), eyeF: [getComputedStyle(eye).fontFamily.split(',')[0].replace(/["']/g, ''), getComputedStyle(eye).fontSize, getComputedStyle(eye).textTransform].join('|'), eyeDot: dot.content + '|' + dot.backgroundColor + '|' + dot.width,
        title: title.textContent.trim(), titleCaps: getComputedStyle(title).textTransform, titleF: [getComputedStyle(title).fontFamily.split(',')[0].replace(/["']/g, ''), getComputedStyle(title).fontWeight, getComputedStyle(title).color].join('|'), titleSize: parseFloat(getComputedStyle(title).fontSize),
        line: line.textContent.trim(), lineSize: getComputedStyle(line).fontSize,
        btn: { text: btn.textContent.replace(/\s+/g, ' ').trim(), bg: getComputedStyle(btn).backgroundImage, h: Math.round(btn.getBoundingClientRect().height), color: getComputedStyle(btn).color, caps: getComputedStyle(btn).textTransform,
          ring: getComputedStyle(btn).boxShadow, radius: getComputedStyle(btn).borderTopLeftRadius, font: getComputedStyle(btn).fontFamily.split(',')[0].replace(/["']/g, '') + '|' + getComputedStyle(btn).fontWeight, clay: /199,\s*85,\s*47/.test(getComputedStyle(btn).backgroundImage + getComputedStyle(btn).backgroundColor) },
        img: img && { src: img.getAttribute('src'), blend: getComputedStyle(img).mixBlendMode, alt: img.getAttribute('alt'), pos: getComputedStyle(img).position, right: getComputedStyle(img).right },
        by: by && { sig: !!sig, sigColor: sig && getComputedStyle(sig).color, sigLabel: sig && sig.getAttribute('aria-label'), av: !!av, avImg: av && av.querySelector('img') && av.querySelector('img').getAttribute('src'), avHidden: av && av.getAttribute('aria-hidden'), avRing: av && getComputedStyle(av).boxShadow,
          avSize: av && Math.round(av.getBoundingClientRect().width), sigTop: sig && Math.round(sig.getBoundingClientRect().top), avTop: av && Math.round(av.getBoundingClientRect().top), btnBottom: Math.round(btn.getBoundingClientRect().bottom), panelBottom: Math.round(a.getBoundingClientRect().bottom) },
        text: a.textContent.replace(/\s+/g, ' ').trim() };
    });
    t.check('panel: ONE link (an <a>), with the same href as coachWhatsAppUrl() (wa.me + the pre-filled message), target _blank, rel noopener',
      o.tag === 'A' && o.href === want && /^https:\/\/wa\.me\/447435363461\?text=Hi%20Amir%2C%20it's%20Alex/.test(o.href.replace(/%27/g, "'")) && o.target === '_blank' && /noopener/.test(o.rel), JSON.stringify([o.href, want, o.target, o.rel]));
    t.check('panel: the pre-filled message still says who is writing and where (name, cycle, week)', await p.evaluate(h => /^Hi Amir, it's Alex \(.+, week \d+\)\. $/.test(decodeURIComponent(h.split('?text=')[1])), o.href), decodeURIComponent(o.href.split('?text=')[1] || ''));
    t.check('panel: the only link on the screen, nothing clickable inside it (the button is not a second link), the button is a <span>', o.anchors === 1 && o.inside === 0 && o.btnTag === 'SPAN', JSON.stringify([o.anchors, o.inside, o.btnTag]));
    t.check('panel: it has a name that holds the visible words "Open WhatsApp"', /Open WhatsApp/.test(o.label || ''), o.label);
    t.check('panel: --hero background, 16 px corners, white text, no underline, inside the gutter (margin = --g)', o.bg === hero && o.radius === '16px' && o.color === 'rgb(255, 255, 255)' && o.deco === 'none' && o.mL === o.gutter && o.mR === o.gutter, JSON.stringify([o.radius, o.color, o.deco, o.mL, o.mR, o.gutter, o.bg === hero]));
    t.check('panel: the eyebrow "Questions, swaps, anything that hurts" in Space Mono capitals with a dot', o.eye === 'Questions, swaps, anything that hurts' && /^Space Mono\|11px\|uppercase$/.test(o.eyeF) && /\|rgb\(109, 190, 149\)\|7px$/.test(o.eyeDot), JSON.stringify([o.eye, o.eyeF, o.eyeDot]));
    t.check('panel: the title "Message me on WhatsApp" in capitals, Barlow Condensed 900, white, a display size (28 to 36 px)', /^Message me on WhatsApp$/i.test(o.title) && o.titleCaps === 'uppercase' && o.titleF === 'Barlow Condensed|900|rgb(255, 255, 255)' && o.titleSize >= 28 && o.titleSize <= 36, JSON.stringify([o.title, o.titleCaps, o.titleF, o.titleSize]));
    t.check('panel: the line keeps the old words (form videos, "I answer there, not in the app") and the eyebrow keeps questions, swaps, anything that hurts',
      o.line === 'Form videos welcome. I answer there, not in the app.' && /questions/i.test(o.text) && /swaps/i.test(o.text) && /anything that hurts/i.test(o.text) && /form videos/i.test(o.text), JSON.stringify([o.line, o.lineSize]));
    t.check('panel: the button "Open WhatsApp" has the cover\'s light-ring look (--tile-on-green, a light ring, 8 px corners, 48 px, white Barlow Condensed capitals), never clay',
      o.btn.text === 'Open WhatsApp' && o.btn.bg === btnBg && /rgba\(255, 255, 255, 0\.22\)/.test(o.btn.ring) && o.btn.radius === '8px' && o.btn.h >= 48 && o.btn.color === 'rgb(255, 255, 255)' && o.btn.caps === 'uppercase' && /^Barlow Condensed\|700$/.test(o.btn.font) && !o.btn.clay, JSON.stringify(o.btn));
    t.check('panel: his photo is graded into the green on the right (luminosity), decorative (alt empty)', !!o.img && /coach\.jpg$/.test(o.img.src) && o.img.blend === 'luminosity' && o.img.alt === '' && o.img.pos === 'absolute', JSON.stringify(o.img));
    t.check('panel: signed at the foot, his signature in white, under the button; his photo shows ONCE, graded into the green (no second avatar by the signature: the audit call of 2026-10-13)',
      !!o.by && o.by.sig && o.by.sigColor === 'rgb(255, 255, 255)' && o.by.sigLabel === 'Amir' && !o.by.av && o.by.sigTop > o.by.btnBottom, JSON.stringify(o.by));
    // ONE green thing: exactly one element on the screen paints the cover's green (the --hero gradient)
    const greens = await p.evaluate(hero => [...document.querySelectorAll('#screen-notes *')].filter(e => getComputedStyle(e).backgroundImage === hero).map(e => e.className), hero);
    t.check('the screen has exactly one green thing: the panel (no other element paints --hero)', greens.length === 1 && /coach-panel/.test(greens[0]), JSON.stringify(greens));
    // the whole panel is the link: a tap on the title, the button, the signature and the photo all land on the one <a>, with that href
    const hits = [];
    await p.evaluate(() => { window.__hits = []; document.addEventListener('click', e => { const a = e.target.closest('a'); if (a && a.closest('#screen-notes')) { window.__hits.push(a.getAttribute('href')); e.preventDefault(); } }, true); });
    for (const sel of ['.coach-panel-title', '.coach-panel-btn', '.coach-panel-by .wn-sig', '.coach-panel-img', '.coach-panel-line']) { await tap(p, sel); }
    const got = await p.evaluate(() => window.__hits);
    t.check('panel: a tap on the title, the button, the signature, the photo or the line is the same one link (same href each time)', got.length === 5 && got.every(h => h === want), JSON.stringify(got.map(h => h === want)));
    t.check('no page errors (panel)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 3. the number: selectable text under the panel, read from COACH_WHATSAPP_SHOWN, not inside the link ──
  {
    const { ctx, p } = await H.openProgram(browser, { prog: prog() });
    await goCoach(p);
    const n = await p.evaluate(() => { const e = document.querySelector('#screen-notes .coach-num'), cs = getComputedStyle(e);
      const range = document.createRange(); range.selectNodeContents(e); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
      return { text: e.textContent.trim(), shown: COACH_WHATSAPP_SHOWN, font: cs.fontFamily, size: cs.fontSize, color: cs.color, sel: cs.userSelect || cs.webkitUserSelect, inLink: !!e.closest('a'), tag: e.tagName, selected: sel.toString().trim(),
        panelBottom: document.querySelector('.coach-panel').getBoundingClientRect().bottom, top: e.getBoundingClientRect().top, secTop: document.querySelector('#screen-notes .prog-sec').getBoundingClientRect().top }; });
    t.check('the number: "+44 7435 363461", the same string the app keeps (COACH_WHATSAPP_SHOWN), Space Mono, grey, not inside the link', n.text === '+44 7435 363461' && n.text === n.shown && /Space Mono/.test(n.font) && n.color === GREY && !n.inLink, JSON.stringify(n));
    t.check('the number is selectable text (user-select is not none, and a range over it selects it whole)', n.sel !== 'none' && n.selected === '+44 7435 363461', JSON.stringify([n.sel, n.selected]));
    t.check('the number sits under the panel and above the notes', n.top >= n.panelBottom && n.top < n.secTop, JSON.stringify([n.panelBottom, n.top, n.secTop]));
    t.check('no page errors (number)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 4. Notes from Amir: a green section title, fold rows on the paper, one open at a time, aria-expanded, keyboard ──
  {
    const { ctx, p } = await H.openProgram(browser, { prog: prog() });
    await p.evaluate(() => goTo('plan')); await p.waitForTimeout(500);
    const progSec = await p.evaluate(() => { const e = document.querySelector('#screen-plan .prog-sec'), c = getComputedStyle(e);
      return [c.fontFamily.split(',')[0].replace(/["']/g, ''), c.fontSize, c.fontWeight, c.letterSpacing, c.color, c.textTransform, c.paddingLeft, c.marginTop, c.marginBottom, getComputedStyle(e, '::after').height].join('|'); });
    await goCoach(p);
    const o = await p.evaluate(() => {
      const s = document.getElementById('screen-notes'), sec = s.querySelector('.prog-sec'), c = getComputedStyle(sec);
      const rows = [...s.querySelectorAll('.cn-row')], items = [...s.querySelectorAll('.cn-item')];
      const look = r => { const ic = r.querySelector('.cn-ic'), ti = r.querySelector('.cn-title'), da = r.querySelector('.cn-date'), ch = r.querySelector('.cn-chev'), svg = ic.querySelector('svg');
        return { tag: r.tagName, type: r.type, h: Math.round(r.getBoundingClientRect().height), w: Math.round(r.getBoundingClientRect().width), expanded: r.getAttribute('aria-expanded'), controls: r.getAttribute('aria-controls'),
          icon: svg ? Math.round(svg.getBoundingClientRect().width) + 'x' + Math.round(svg.getBoundingClientRect().height) : null, iconColor: getComputedStyle(ic).color, iconBg: getComputedStyle(ic).backgroundColor, iconImg: getComputedStyle(ic).backgroundImage,
          title: ti.textContent.trim(), titleF: [getComputedStyle(ti).fontFamily.split(',')[0].replace(/["']/g, ''), getComputedStyle(ti).fontWeight, getComputedStyle(ti).fontSize, getComputedStyle(ti).color].join('|'),
          date: da && da.textContent.trim(), dateF: da && [getComputedStyle(da).fontFamily.split(',')[0].replace(/["']/g, ''), getComputedStyle(da).fontSize, getComputedStyle(da).color].join('|'),
          chev: ch && { mask: (getComputedStyle(ch).webkitMaskImage || getComputedStyle(ch).maskImage).slice(0, 30), bg: getComputedStyle(ch).backgroundColor, w: Math.round(ch.getBoundingClientRect().width) },
          body: (() => { const b = document.getElementById(r.getAttribute('aria-controls')); return b && { hidden: b.hidden, region: b.getAttribute('role'), labelled: b.getAttribute('aria-labelledby') === r.id, size: getComputedStyle(b).fontSize, color: getComputedStyle(b).color, ul: !!b.querySelector('ul'), strong: !!b.querySelector('strong'), text: b.textContent.trim().slice(0, 40) }; })() }; };
      return { sec: sec.textContent.trim(), secF: [c.fontFamily.split(',')[0].replace(/["']/g, ''), c.fontSize, c.fontWeight, c.letterSpacing, c.color, c.textTransform, c.paddingLeft, c.marginTop, c.marginBottom, getComputedStyle(sec, '::after').height].join('|'),
        secAfter: getComputedStyle(sec, '::after').backgroundColor, n: rows.length, rows: rows.map(look), tones: s.querySelectorAll('.note-tile').length, cta: /tap to read/i.test(s.innerText),
        edges: items.map(i => { const x = getComputedStyle(i); return x.borderTopWidth + ' ' + x.borderTopStyle + ' ' + x.borderTopColor + ' ' + x.backgroundColor; }), listLeft: Math.round(s.querySelector('.cn-list').getBoundingClientRect().left), gutter: parseFloat(getComputedStyle(document.body).getPropertyValue('--g')) };
    });
    t.check('Notes from Amir: the section title is Progress\'s .prog-sec look (15 px condensed capitals, green ink, a hairline to the edge)', o.sec === 'Notes from Amir' && o.secF === progSec && o.secAfter === HAIR, JSON.stringify([o.sec, o.secF, progSec, o.secAfter]));
    t.check('notes: two fold rows, each a <button> with aria-expanded="false" and its body hidden, both closed to start', o.n === 2 && o.rows.every(r => r.tag === 'BUTTON' && r.type === 'button' && r.expanded === 'false' && r.body && r.body.hidden && r.body.region === 'region' && r.body.labelled), JSON.stringify(o.rows.map(r => [r.tag, r.expanded, r.body && r.body.hidden])));
    t.check('notes: a 22 px green line icon (the emoji resolved to a line icon), no coloured tile, no "Tap to read"', o.rows.every(r => r.icon === '22x22' && r.iconColor === GREEN && r.iconBg === 'rgba(0, 0, 0, 0)' && r.iconImg === 'none') && o.tones === 0 && !o.cta, JSON.stringify([o.rows.map(r => [r.icon, r.iconColor, r.iconBg]), o.tones, o.cta]));
    t.check('notes: the title is Barlow 600 at 18 px in ink; the date is mono grey 11 px when there is one and absent when there is not', o.rows.every(r => r.titleF === 'Barlow|600|18px|' + INK) && o.rows[0].date === '12 Oct' && o.rows[0].dateF === 'Space Mono|11px|' + GREY && o.rows[1].date === null, JSON.stringify([o.rows.map(r => r.titleF), o.rows.map(r => r.date), o.rows[0].dateF]));
    t.check('notes: the ⌄ chevron is the app\'s one (--chev-down mask in grey)', o.rows.every(r => r.chev && /url\("data:image\/svg\+xml/.test(r.chev.mask) && r.chev.bg === GREY && r.chev.w === 18), JSON.stringify(o.rows.map(r => r.chev)));
    t.check('notes: rows run the width of the list on the gutter, 64 px tall at the least, a hairline between them and none above the first', o.rows.every(r => r.h >= 64 && r.w >= 280) && o.listLeft === o.gutter && /^0px none/.test(o.edges[0]) && o.edges[1].startsWith('1px solid ' + HAIR) && o.edges.every(e => /rgba\(0, 0, 0, 0\)$/.test(e)), JSON.stringify([o.rows.map(r => r.h), o.listLeft, o.edges]));

    // open one, then the other (one at a time), then close it again
    await tap(p, '#cn-h-0');
    t.check('tap the first: it opens (aria-expanded true, its body shown), the second stays closed', (await open(p)) === 'true:shown false:hidden', await open(p));
    await p.waitForTimeout(350);   // the chevron's turn takes .2 s
    const b0 =await p.evaluate(() => { const b = document.getElementById('cn-b-0'), r = document.getElementById('cn-h-0'), br = b.getBoundingClientRect(), rr = r.getBoundingClientRect();
      return { size: getComputedStyle(b).fontSize, lh: getComputedStyle(b).lineHeight, color: getComputedStyle(b).color, ul: !!b.querySelector('ul li'), listStyle: b.querySelector('ul') && getComputedStyle(b.querySelector('ul')).paddingLeft, strong: b.querySelector('strong') && getComputedStyle(b.querySelector('strong')).fontWeight,
        under: br.top >= rr.bottom - 1, bg: getComputedStyle(b).backgroundColor, indent: Math.round(br.left - rr.left), p: b.querySelectorAll('p').length, chev: getComputedStyle(r.querySelector('.cn-chev')).transform }; });
    t.check('an open note: its body is on the paper under the row, 15 px in ink with its paragraphs, list and bold kept, no box around it', b0.under && b0.size === '15px' && b0.color === INK && b0.ul && b0.strong >= 600 && b0.p === 2 && b0.bg === 'rgba(0, 0, 0, 0)', JSON.stringify(b0));
    t.check('an open note: the chevron turns (⌃)', b0.chev !== 'none' && /matrix\(-1/.test(b0.chev), b0.chev);
    await tap(p, '#cn-h-1');
    t.check('tap the second: it opens and the first closes (one open at a time)', (await open(p)) === 'false:hidden true:shown', await open(p));
    await tap(p, '#cn-h-1');
    t.check('tap the open one again: it closes, none open', (await open(p)) === 'false:hidden false:hidden', await open(p));
    await p.evaluate(() => document.getElementById('cn-h-0').focus()); await p.keyboard.press('Enter');
    t.check('keyboard: Enter on a row opens it', (await open(p)) === 'true:shown false:hidden', await open(p));
    await p.evaluate(() => document.getElementById('cn-h-1').focus()); await p.keyboard.press('Space');
    t.check('keyboard: Space on another row opens it and closes the first', (await open(p)) === 'false:hidden true:shown', await open(p));
    t.check('no page errors (notes)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 5. no notes, no section: the panel, the number and the door row stay (the notes missing, empty or without cards) ──
  for (const [name, notes] of [['no notes block', null], ['an empty card list', { cards: [] }], ['a block with no cards key', { greeting: 'Hi' }]]) {
    const { ctx, p } = await H.openProgram(browser, { prog: prog(notes) });
    await goCoach(p);
    const o = await p.evaluate(() => { const s = document.getElementById('screen-notes');
      return { sec: s.querySelectorAll('.prog-sec').length, rows: s.querySelectorAll('.cn-row, .cn-list, .cn-item').length, panel: s.querySelectorAll('.coach-panel').length, num: s.querySelectorAll('.coach-num').length, door: s.querySelectorAll('.hrow').length,
        text: /notes from amir|personal notes/i.test(s.innerText), order: [...s.querySelectorAll('.coach-head, .coach-panel, .coach-num, .hrow')].map(e => e.className.split(' ')[0]).join(' '),
        gap: (() => { const n = s.querySelector('.coach-num').getBoundingClientRect(), d = s.querySelector('.hrow').getBoundingClientRect(); return Math.round(d.top - n.bottom); })() }; });
    t.check(`${name}: no "Notes from Amir" section and no fold rows; the panel, the number and the door row are still there, in order`, o.sec === 0 && o.rows === 0 && !o.text && o.panel === 1 && o.num === 1 && o.door === 1 && o.order === 'coach-head coach-panel coach-num hrow' && o.gap >= 12, JSON.stringify(o));
    t.check(`${name}: no page errors`, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 6. How the app works: one door row (Home's .hrow look), no section label above it, opens the help sheet; Back closes it ──
  {
    const { ctx, p } = await H.openProgram(browser, { prog: prog() });
    await goCoach(p);
    const look = el => { const c = getComputedStyle(el); return [c.backgroundColor, c.borderTopWidth, c.borderTopStyle, c.borderTopColor, c.borderTopLeftRadius, c.minHeight, c.display].join('|'); };
    await p.evaluate(() => goTo('home')); await p.waitForTimeout(400);
    const homeRow = await p.evaluate(`(() => { const f = ${look.toString()}; const r = document.querySelector('#home-habits-wrap .hrow') || (() => { document.getElementById('home-habits-wrap').innerHTML = habitCardHtml(); return document.querySelector('#home-habits-wrap .hrow'); })();
      const l = r.querySelector('.hrow-l'), a = r.querySelector('.hrow-a'); const lc = getComputedStyle(l), ac = getComputedStyle(a);
      return { row: f(r), label: [lc.fontFamily.split(',')[0].replace(/["']/g, ''), lc.fontSize, lc.fontWeight, lc.letterSpacing, lc.color, lc.textTransform].join('|'), arrow: [ac.fontSize, ac.color].join('|') }; })()`);
    await goCoach(p);
    const d = await p.evaluate(`(() => { const f = ${look.toString()}; const s = document.getElementById('screen-notes'), r = s.querySelector('.hrow'), l = r.querySelector('.hrow-l'), v = r.querySelector('.hrow-v, .hrow-q'), a = r.querySelector('.hrow-a'), ic = r.querySelector('.hrow-ic svg');
      const lc = getComputedStyle(l), ac = getComputedStyle(a), vc = getComputedStyle(v);
      return { n: s.querySelectorAll('.hrow').length, tag: r.tagName, onclick: r.getAttribute('onclick'), row: f(r), label: l.textContent.trim(), labelF: [lc.fontFamily.split(',')[0].replace(/["']/g, ''), lc.fontSize, lc.fontWeight, lc.letterSpacing, lc.color, lc.textTransform].join('|'),
        line: v.textContent.trim(), lineFont: vc.fontFamily.split(',')[0].replace(/["']/g, ''), arrow: a.textContent.trim(), arrowF: [ac.fontSize, ac.color].join('|'), icon: ic && Math.round(ic.getBoundingClientRect().width) + 'x' + Math.round(ic.getBoundingClientRect().height), iconColor: ic && getComputedStyle(ic.parentElement).color,
        helpGlyph: !!ic && ic.innerHTML.indexOf('M9.09 9a3 3 0 0 1 5.83 1') > -1,
        sibling: (r.previousElementSibling || {}).className || '', h: Math.round(r.getBoundingClientRect().height), w: Math.round(r.getBoundingClientRect().width), left: Math.round(r.getBoundingClientRect().left), gutter: parseFloat(getComputedStyle(document.body).getPropertyValue('--g')),
        secBefore: [...s.querySelectorAll('.prog-sec')].map(e => e.textContent.trim()) }; })()`);
    t.check('door row: exactly one, a <button> that calls openHelp()', d.n === 1 && d.tag === 'BUTTON' && d.onclick === 'openHelp()', JSON.stringify([d.n, d.tag, d.onclick]));
    t.check('door row: the label "Using the app" over one Barlow line "How the app works", a grey ›', d.label === 'Using the app' && d.line === 'How the app works' && d.lineFont === 'Barlow' && d.arrow === '›' && d.arrowF === homeRow.arrow, JSON.stringify([d.label, d.line, d.arrow, d.arrowF]));
    t.check('door row: the same look as Home\'s .hrow (white, 1 px edge, 12 px corners, 64 px at least)', d.row === homeRow.row && /^rgb\(255, 255, 255\)\|1px\|solid\|.*\|12px\|64px\|flex$/.test(d.row), JSON.stringify([d.row, homeRow.row]));
    // Number First (2026-10-19): the two doors are deliberately NOT set the same. This one carries no figure, so its name is the
    // headline (Barlow 600, 16 px, ink, sentence case); Home's habits row carries one ("3 to go"), so its name is the quiet green label.
    t.check('door row: its name is the headline voice, and Home\'s habits row — which carries a figure — is the quiet green label instead',
      d.labelF === 'Barlow|16px|600|normal|rgb(26, 26, 26)|none' && homeRow.label === 'Barlow|13px|600|normal|rgb(14, 74, 54)|none' && d.labelF !== homeRow.label, JSON.stringify([d.labelF, homeRow.label]));
    t.check('door row: a 22 px green line icon, the help glyph; on the gutter; no section label above it (the only title is Notes from Amir, which is above the notes)', d.icon === '22x22' && d.iconColor === GREEN && d.helpGlyph && d.left === d.gutter && d.sibling.indexOf('cn-list') > -1 && d.secBefore.join() === 'Notes from Amir', JSON.stringify([d.icon, d.iconColor, d.helpGlyph, d.left, d.gutter, d.sibling, d.secBefore]));
    await tap(p, '#screen-notes .hrow');
    const sheet = await p.evaluate(() => { const ov = document.getElementById('hist-overlay'); return { shown: ov.classList.contains('visible'), title: (ov.querySelector('.readiness-title') || {}).textContent, cards: ov.querySelectorAll('.help-list .note-card').length, screen: document.querySelector('.screen.active').id }; });
    t.check('tapping it opens the help sheet (How the app works, with the guide cards), the Coach tab still behind it', sheet.shown && sheet.title === 'How the app works' && sheet.cards >= 10 && sheet.screen === 'screen-notes', JSON.stringify(sheet));
    // the guide's cards still fold one at a time (toggleNote, untouched)
    await p.evaluate(() => document.querySelector('#hist-overlay .help-list .note-card .note-card-header').click());
    await p.evaluate(() => document.querySelectorAll('#hist-overlay .help-list .note-card .note-card-header')[1].click());
    t.check('the guide in the sheet still opens one card at a time', await p.evaluate(() => document.querySelectorAll('#hist-overlay .help-list .note-card.open').length === 1));
    await p.goBack(); await p.waitForTimeout(500);
    const after = await p.evaluate(() => ({ shown: document.getElementById('hist-overlay').classList.contains('visible'), screen: document.querySelector('.screen.active').id }));
    t.check('Back closes the sheet and leaves the Coach tab', !after.shown && after.screen === 'screen-notes', JSON.stringify(after));
    t.check('no page errors (door row)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 7. 320, 375 and 390, light and dark: no sideways scroll, the panel whole, every control 44 px at the least, the initials button on no text ──
  for (const [w, h, dark] of [[320, 568, false], [375, 667, false], [390, 844, false], [320, 568, true], [375, 667, true], [390, 844, true]]) {
    const tag = `${w}${dark ? ' dark' : ''}`;
    const { ctx, p } = await H.openProgram(browser, { prog: prog(), w, h, dark });
    await goCoach(p);
    const g = await p.evaluate(() => {
      const s = document.getElementById('screen-notes'), panel = s.querySelector('.coach-panel'), pr = panel.getBoundingClientRect(), gut = parseFloat(getComputedStyle(document.body).getPropertyValue('--g'));
      const inside = [...panel.querySelectorAll('.coach-panel-eye, .coach-panel-title, .coach-panel-line, .coach-panel-btn, .coach-panel-by')].map(e => { const r = e.getBoundingClientRect(); return { c: e.className, l: Math.round(r.left - pr.left), r: Math.round(pr.right - r.right), sw: e.scrollWidth - e.clientWidth, w: Math.round(r.width) }; });
      const controls = [...s.querySelectorAll('a, button, .coach-panel-btn')].map(e => { const r = e.getBoundingClientRect(); return { c: (e.className || e.tagName).split(' ')[0], w: Math.round(r.width), h: Math.round(r.height) }; });
      const title = s.querySelector('.coach-panel-title'), tr = title.getBoundingClientRect();
      return { gut, left: Math.round(pr.left), right: Math.round(innerWidth - pr.right), h: Math.round(pr.height), inside, controls, titleLines: Math.round(tr.height / parseFloat(getComputedStyle(title).lineHeight)), titleSize: getComputedStyle(title).fontSize,
        headLeft: Math.round(s.querySelector('.prog-eyebrow').getBoundingClientRect().left), numLeft: Math.round(s.querySelector('.coach-num').getBoundingClientRect().left), secPad: Math.round(parseFloat(getComputedStyle(s.querySelector('.prog-sec')).paddingLeft)),
        listLeft: Math.round(s.querySelector('.cn-list').getBoundingClientRect().left), doorLeft: Math.round(s.querySelector('.hrow').getBoundingClientRect().left), rowRight: Math.round(innerWidth - s.querySelector('.cn-list').getBoundingClientRect().right), scroll: document.documentElement.scrollWidth - innerWidth,
        bodyBg: getComputedStyle(document.body).backgroundColor, rowBg: getComputedStyle(s.querySelector('.hrow')).backgroundColor };
    });
    t.check(`${tag}: no sideways scroll on the Coach tab, closed and with a note open`, g.scroll <= 0 && await (async () => { await tap(p, '#cn-h-0'); const a = await sideways(p); await tap(p, '#cn-h-0'); return a <= 0; })(), JSON.stringify([g.scroll, await sideways(p)]));
    t.check(`${tag}: the panel sits on the gutter (${g.gut} px each side) and the header, the number, the section title, the notes and the door row start on it too`,
      g.left === g.gut && g.right === g.gut && Math.abs(g.headLeft - g.gut) <= 1 && g.numLeft === g.gut && g.secPad === g.gut && g.listLeft === g.gut && g.doorLeft === g.gut && g.rowRight === g.gut, JSON.stringify([g.gut, g.left, g.right, g.headLeft, g.numLeft, g.secPad, g.listLeft, g.doorLeft, g.rowRight]));
    t.check(`${tag}: everything in the panel is whole (no part cut off or pushed past the panel's edge; the title is at most 3 lines)`, g.inside.every(i => i.sw <= 0 && i.l >= 0 && i.r >= 0) && g.titleLines <= 3, JSON.stringify([g.inside, g.titleLines, g.titleSize]));
    t.check(`${tag}: every control is 44 px or more each way (the panel link, its button, the fold rows, the door row)`, g.controls.length === 5 && g.controls.every(c => c.w >= 44 && c.h >= 44), JSON.stringify(g.controls));
    await p.evaluate(() => window.scrollTo(0, 0));   // the initials button scrolls away with its screen: measure it at the top
    const o = await p.evaluate(OVERLAP);
    t.check(`${tag}: the initials button overlaps no text at the top of the Coach tab`, !o.hidden && o.hits.length === 0, JSON.stringify(o));
    t.check(`${tag}: ${dark ? 'dark: the page is #181818 and the door row #242424 (the one colour set)' : 'light: the page is the paper and the door row is white'}`,
      dark ? g.bodyBg === 'rgb(24, 24, 24)' && g.rowBg === 'rgb(36, 36, 36)' : g.bodyBg === 'rgb(250, 247, 242)' && g.rowBg === WHITE, JSON.stringify([g.bodyBg, g.rowBg]));
    t.check(`${tag}: no page errors`, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 8. the demo: the banner is forced on (the stub cannot drive ?client=demo): nothing of the header lies under it, the initials button is on no text, and the panel still carries the demo's message ──
  {
    const { ctx, p } = await H.openProgram(browser, { prog: prog(), w: 320, h: 568 });
    await p.evaluate(() => { window.IS_DEMO = true; document.body.classList.add('is-demo'); document.getElementById('demo-banner').hidden = false; renderNotes(); goTo('notes'); window.scrollTo(0, 0); });
    await p.waitForTimeout(500);
    const d = await p.evaluate(() => {
      const s = document.querySelector('.screen.active'), bn = document.getElementById('demo-banner').getBoundingClientRect(), under = [], tw = document.createTreeWalker(s, NodeFilter.SHOW_TEXT);
      for (let n; (n = tw.nextNode());) { if (!n.textContent.trim() || !n.parentElement) continue; const cs = getComputedStyle(n.parentElement); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        const r = document.createRange(); r.selectNodeContents(n); for (const q of r.getClientRects()) if (q.width > 1 && q.height > 1 && q.top < bn.bottom && q.bottom > bn.top) under.push(n.textContent.trim().slice(0, 24)); }
      return { screen: s.id, banner: [Math.round(bn.top), Math.round(bn.bottom)], under, headTop: Math.round(document.querySelector('#screen-notes .coach-head').getBoundingClientRect().top), href: decodeURIComponent(document.querySelector('.coach-panel').getAttribute('href').split('?text=')[1]), scroll: document.documentElement.scrollWidth - innerWidth };
    });
    t.check('demo: the Coach header and the rest start under the banner (no text under it), the screen does not scroll sideways', d.screen === 'screen-notes' && d.under.length === 0 && d.headTop >= d.banner[1] && d.scroll <= 0, JSON.stringify(d));
    const o = await p.evaluate(OVERLAP);
    t.check('demo: the initials button (moved down under the banner) overlaps no text', !o.hidden && o.hits.length === 0, JSON.stringify(o));
    t.check('demo: the panel\'s message is the demo\'s ("trying the AA app demo")', /trying the AA app demo/.test(d.href), d.href);
    await p.screenshot({ path: path.join(shots, 'coach-320-demo-banner.png') });
    t.check('no page errors (demo)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 9. the review screenshots: the Coach tab with two notes, one open (375 x 667 and 320 x 568 light, 390 x 844 dark). With --fonts the Google fonts
  //    (fonts.googleapis.com, fonts.gstatic.com) are let through and the page is reloaded, so Barlow and Space Mono are the real faces. ──
  for (const [w, h, dark] of [[375, 667, false], [320, 568, false], [390, 844, true]]) {
    const { ctx, p } = await H.openProgram(browser, { prog: prog(), w, h, dark });
    if (process.argv.includes('--fonts')) {
      await ctx.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, r => r.continue());
      await p.reload({ waitUntil: 'domcontentloaded' });
      await p.waitForFunction(() => document.getElementById('loading') && document.getElementById('loading').classList.contains('hidden'), null, { timeout: 20000 });
      await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
    }
    await goCoach(p);
    await tap(p, '#cn-h-0'); await p.waitForTimeout(350);
    const name = `coach-${w}x${h}-${dark ? 'dark' : 'light'}`;
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(150);
    await p.screenshot({ path: path.join(shots, name + '-top.png') });
    await p.evaluate(() => window.scrollTo(0, document.querySelector('#screen-notes .prog-sec').getBoundingClientRect().top + scrollY - 16)); await p.waitForTimeout(250);
    await p.screenshot({ path: path.join(shots, name + '-notes-open.png') });
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.screenshot({ path: path.join(shots, name + '-full.png'), fullPage: true });
    t.check(`screenshots ${w} x ${h}${dark ? ' dark' : ''}: taken with one note open, no page errors`, (await open(p)) === 'true:shown false:hidden' && p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  await browser.close();
  const failed = t.report();
  console.log('screenshots: ' + shots);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
