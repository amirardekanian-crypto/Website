/* numbers.js — numbers and words on a reel: Tally (a count-up), Span (a range like 2 to 13 m), Tiers (headline, explanation,
 * detail), Key Words (words that appear when they are said, key ones lit) and Strike and Fix (a mistake struck out, the fix set in).
 *
 * Every piece here works in English and in Farsi. What changes in Farsi (Amir, DESIGN-ATLAS.md): the line runs right to left, a line
 * is cut into WORDS and never letters (the letters join), there is no uppercase and no letter-spacing, and numbers are Persian
 * numerals. A piece decides this from its `fa` param, or, when that is null, from the look in force (KIT.use('brand-fa')).
 * Colours are roles ('normal', 'key', 'fix', 'soft') or any hex, read through KIT.role().
 */
(function (g) {
  'use strict';
  const L = g.L, KIT = g.KIT, { E, clamp, lerp, prog, rgbaHex } = L;
  const T = KIT.text;

  /* ── small text helpers the pieces share ───────────────────────── */
  const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
  /* a number as text: decimals, thousands separator, Persian numerals and the Persian decimal mark when fa */
  T.fmt = (v, o) => {
    o = o || {};
    let s = Math.abs(v).toFixed(o.decimals || 0);
    if (o.thousands) { const [a, b] = s.split('.'); s = a.replace(/\B(?=(\d{3})+(?!\d))/g, o.fa ? '٬' : ',') + (b != null ? '.' + b : ''); }
    if (o.fa) s = s.replace(/\d/g, d => FA_DIGITS[d]).replace('.', '٫');
    return (v < 0 ? '-' : '') + s;
  };
  /* the widest digit of a font: numbers are set on this pitch so a counting number never jitters */
  const pitchCache = new Map();
  T.pitch = (font, fa) => {
    const k = font + '|' + (fa ? 1 : 0); let w = pitchCache.get(k);
    if (w == null) { w = 0; for (let d = 0; d < 10; d++) w = Math.max(w, T.width(font, fa ? FA_DIGITS[d] : String(d))); pitchCache.set(k, w); }
    return w;
  };
  /* the advance of one character of a number: a fixed pitch for English digits, the digit's own width in Farsi (Persian digits vary a lot) */
  T.adv = (font, ch, fa, pitch) => ((fa || !/[0-9]/.test(ch)) ? T.width(font, ch) : pitch);
  /* cut a line of words into lines no wider than maxW (logical order; the caller lays each line out right to left when needed) */
  T.wrap = (font, str, maxW, dir) => {
    const words = str.split(/\s+/).filter(Boolean), sp = T.width(font, ' ', dir), lines = []; let cur = [], w = 0;
    for (const word of words) {
      const ww = T.width(font, word, dir);
      if (cur.length && w + sp + ww > maxW) { lines.push(cur.join(' ')); cur = [word]; w = ww; } else { w += (cur.length ? sp : 0) + ww; cur.push(word); }
    }
    if (cur.length) lines.push(cur.join(' '));
    return lines;
  };
  /* the same lines, but as even as they can be: the narrowest width that still gives the same number of lines (no orphan last word) */
  T.balance = (font, str, maxW, dir) => {
    const n = T.wrap(font, str, maxW, dir).length;
    if (n < 2) return T.wrap(font, str, maxW, dir);
    let lo = maxW * .4, hi = maxW;
    for (let i = 0; i < 14; i++) { const mid = (lo + hi) / 2; if (T.wrap(font, str, mid, dir).length === n) hi = mid; else lo = mid; }
    return T.wrap(font, str, hi, dir);
  };
  /* draw one line of text so its left (or right, or centre) edge is at x, in either direction */
  function put(ctx, str, x, y, align, rtl) {
    ctx.direction = rtl ? 'rtl' : 'ltr'; ctx.textAlign = align;
    ctx.fillText(str, x, y);
    ctx.direction = 'ltr';
  }
  T.put = put;
  const isFa = (p) => (p.fa != null ? !!p.fa : KIT.rtl());
  /* a piece's type: size, weight, kind of face ('display' is Barlow Condensed / Vazirmatn) */
  function face(p, kind, size, weight) { return KIT.face(kind || 'display', size, weight); }
  const rise = (u, d) => (1 - E.outExpo(u)) * d;

  /* ═══════════════ Tally ═══════════════ */
  KIT.piece('tally', {
    group: 'numbers',
    doc: 'A big number counts up to its target, lands with a small pop, and its unit sits beside it.',
    defaults: {
      to: 13, from: 0, decimals: 0, unit: 'm', thousands: false, x: 540, y: 960, size: 300, weight: 900, unitSize: .34, gap: .1,
      at: 0, dur: 1.1, ease: 'outExpo', pop: .05, color: 'normal', unitColor: 'keyText', align: 'center', fa: null, kind: 'display', alpha: 1,
    },
    params: {
      to: 'the number it counts up to', from: 'where it starts counting', decimals: 'digits after the point', unit: 'the unit beside it (m, s, kg, %)',
      thousands: 'show thousands separators', x: 'where the group sits (centre, or its edge, see align)', y: 'baseline of the number', size: 'size of the number (px)',
      weight: 'boldness (400 to 900)', unitSize: 'unit size as a share of the number', gap: 'space between number and unit, as a share of size',
      at: 'when it starts (s)', dur: 'how long the count takes (s)', ease: 'easing name from L.E (outExpo = fast then settle)', pop: 'size of the landing pop (0 = none)',
      color: 'colour of the number (a role or a hex)', unitColor: 'colour of the unit', align: 'center | left | right of x', fa: 'true = Farsi (null = follow the look)', kind: 'type kind', alpha: 'overall strength',
    },
    cues: p => [{ dt: 0, kind: 'sound', props: { id: 'ticks', dur: p.dur } }, { dt: p.dur, kind: 'sound', props: { id: 'plink' } }],
    draw(ctx, t, p) {
      if (t < p.at) return;
      const fa = isFa(p), u = prog(t, p.at, p.dur), v = lerp(p.from, p.to, (E[p.ease] || E.outExpo)(u));
      const nf = face(p, p.kind, p.size, p.weight), uf = face(p, p.kind, Math.round(p.size * p.unitSize), Math.max(500, p.weight - 200));
      const fmt = x => T.fmt(x, { decimals: p.decimals, thousands: p.thousands, fa });
      const pitch = T.pitch(nf, fa);
      const width = s => { let w = 0; for (const ch of s) w += T.adv(nf, ch, fa, pitch); return w; };
      const fin = fmt(p.to), cur = fmt(v), gapPx = p.size * p.gap;
      const wFin = width(fin), wUnit = p.unit ? T.width(uf, p.unit, fa ? 'rtl' : 'ltr') : 0, G = wFin + (p.unit ? gapPx + wUnit : 0);
      const left = p.align === 'left' ? p.x : p.align === 'right' ? p.x - G : p.x - G / 2;
      const popS = 1 + p.pop * Math.sin(Math.PI * clamp((t - (p.at + p.dur - .08)) / .32));
      const a = p.alpha * clamp((t - p.at) / .1);
      ctx.save();
      ctx.translate(left + G / 2, p.y - p.size * .35); ctx.scale(popS, popS); ctx.translate(-(left + G / 2), -(p.y - p.size * .35));
      ctx.globalAlpha = a; ctx.textBaseline = 'alphabetic'; ctx.fontKerning = 'normal';
      /* the number sits on its final slot; digits are drawn one by one on a fixed pitch. Next to the unit it is right-aligned (left-to-right) or left-aligned (Farsi) so the digits grow outward */
      const slotL = fa ? left + (p.unit ? wUnit + gapPx : 0) : left, slotR = slotL + wFin;
      const wCur = width(cur); let x = fa ? slotL : slotR - wCur;
      ctx.font = nf; ctx.fillStyle = KIT.role(p.color);
      for (const ch of cur) { const w = T.adv(nf, ch, fa, pitch); ctx.textAlign = 'center'; ctx.fillText(ch, x + w / 2, p.y); x += w; }
      if (p.unit) {
        ctx.font = uf; ctx.fillStyle = KIT.role(p.unitColor);
        put(ctx, p.unit, fa ? left : left + wFin + gapPx, p.y, 'left', fa);
      }
      ctx.restore();
    },
  });

  /* ═══════════════ Span ═══════════════ */
  KIT.piece('span', {
    group: 'numbers',
    doc: 'A range counts up, like 2 to 13 m. The two ends land one after the other.',
    defaults: {
      a: 2, b: 13, decimals: 0, unit: 'm', sep: null, x: 540, y: 960, size: 220, weight: 900, unitSize: .34, sepSize: .4, gap: .1,
      at: 0, dur: 1, stagger: .18, ease: 'outExpo', pop: .04, color: 'normal', sepColor: 'soft', unitColor: 'keyText', fa: null, kind: 'display', alpha: 1,
    },
    params: {
      a: 'the low end', b: 'the high end', decimals: 'digits after the point', unit: 'the unit', sep: 'the word or mark between (null = a dash, or "تا" in Farsi)',
      x: 'centre of the whole range', y: 'baseline', size: 'size of the numbers (px)', weight: 'boldness', unitSize: 'unit size as a share of the numbers', sepSize: 'size of the separator as a share',
      gap: 'space between parts as a share of size', at: 'start (s)', dur: 'how long each count takes (s)', stagger: 'how much later the second number starts (s)',
      ease: 'easing name', pop: 'landing pop', color: 'number colour', sepColor: 'separator colour', unitColor: 'unit colour', fa: 'true = Farsi', kind: 'type kind', alpha: 'overall strength',
    },
    cues: p => [{ dt: 0, kind: 'sound', props: { id: 'click' } }, { dt: p.stagger, kind: 'sound', props: { id: 'ticks', dur: p.dur } }, { dt: p.stagger + p.dur, kind: 'sound', props: { id: 'plink' } }],
    draw(ctx, t, p) {
      if (t < p.at) return;
      const fa = isFa(p), nf = face(p, p.kind, p.size, p.weight), uf = face(p, p.kind, Math.round(p.size * p.unitSize), Math.max(500, p.weight - 200));
      const sf = face(p, p.kind, Math.round(p.size * p.sepSize), 600), pitch = T.pitch(nf, fa);
      const fmt = x => T.fmt(x, { decimals: p.decimals, fa });
      const width = s => { let w = 0; for (const ch of s) w += T.adv(nf, ch, fa, pitch); return w; };
      const sepTxt = p.sep != null ? p.sep : (fa ? 'تا' : '–'), gapPx = p.size * p.gap, bar = sepTxt === '–';      // the English dash is drawn as a bar, so it sits at the middle of the digits
      const wA = width(fmt(p.a)), wB = width(fmt(p.b)), wS = bar ? p.size * .26 : T.width(sf, sepTxt, fa ? 'rtl' : 'ltr'), wU = p.unit ? T.width(uf, p.unit, fa ? 'rtl' : 'ltr') : 0;
      /* visual order from the left: English  a sep b unit;  Farsi (right to left)  unit b sep a */
      const parts = fa ? [['unit', wU], ['b', wB], ['sep', wS], ['a', wA]] : [['a', wA], ['sep', wS], ['b', wB], ['unit', wU]];
      const list = parts.filter(q => q[0] !== 'unit' || p.unit);
      const G = list.reduce((s, q) => s + q[1], 0) + gapPx * (list.length - 1);
      let x = p.x - G / 2; const pos = {};
      for (const [k, w] of list) { pos[k] = x; x += w + gapPx; }
      const u1 = prog(t, p.at, p.dur), u2 = prog(t, p.at + p.stagger, p.dur), ez = E[p.ease] || E.outExpo;
      const popS = 1 + p.pop * Math.sin(Math.PI * clamp((t - (p.at + p.stagger + p.dur - .08)) / .32));
      ctx.save();
      ctx.globalAlpha = p.alpha * clamp((t - p.at) / .1); ctx.textBaseline = 'alphabetic'; ctx.fontKerning = 'normal';
      ctx.translate(p.x, p.y - p.size * .35); ctx.scale(popS, popS); ctx.translate(-p.x, -(p.y - p.size * .35));
      const digits = (val, left, w) => {
        const s = fmt(val); let xx = left + (w - width(s)); ctx.font = nf; ctx.fillStyle = KIT.role(p.color);
        if (fa) xx = left;
        for (const ch of s) { const cw = T.adv(nf, ch, fa, pitch); ctx.textAlign = 'center'; ctx.fillText(ch, xx + cw / 2, p.y); xx += cw; }
      };
      digits(lerp(0, p.a, ez(u1)), pos.a, wA);
      ctx.save(); ctx.globalAlpha *= clamp(u1 * 2); ctx.font = sf; ctx.fillStyle = KIT.role(p.sepColor);
      if (bar) { const bh = p.size * .075; ctx.beginPath(); ctx.roundRect(pos.sep, p.y - p.size * .36 - bh / 2, wS, bh, bh / 2); ctx.fill(); } else put(ctx, sepTxt, pos.sep, p.y - p.size * .04, 'left', fa);
      ctx.restore();
      ctx.save(); ctx.globalAlpha *= clamp((t - (p.at + p.stagger)) / .1); digits(lerp(p.a, p.b, ez(u2)), pos.b, wB); ctx.restore();
      if (p.unit) { ctx.save(); ctx.globalAlpha *= clamp((t - (p.at + p.stagger)) / .15); ctx.font = uf; ctx.fillStyle = KIT.role(p.unitColor); put(ctx, p.unit, pos.unit, p.y, 'left', fa); ctx.restore(); }
      ctx.restore();
    },
  });

  /* ═══════════════ Tiers ═══════════════ */
  const TIER = {
    head: { size: 132, weight: 900, color: 'normal', alpha: 1, kind: 'display', caps: true, lh: 1.02 },
    body: { size: 60, weight: 600, color: 'normal', alpha: .92, kind: 'ui', caps: false, lh: 1.22 },
    detail: { size: 46, weight: 500, color: 'soft', alpha: 1, kind: 'ui', caps: false, lh: 1.25 },
  };
  KIT.piece('tiers', {
    group: 'numbers',
    doc: 'Three levels of words appear in turn: a loud headline, a plain explanation, a quiet detail.',
    defaults: {
      lines: [{ text: 'Short bursts decide the point', tier: 'head' }, { text: 'Most accelerations on court are only a few steps long.', tier: 'body' }, { text: 'So the first metres matter most.', tier: 'detail' }],
      x: 88, y: 600, w: 904, align: null, at: 0, step: .32, dur: .5, rise: 40, gapTier: .55, fa: null,
    },
    params: {
      lines: 'a list of { text, tier: head | body | detail, color?, size? }', x: 'left edge of the block (right edge in Farsi)', y: 'top of the block', w: 'width the words wrap to',
      align: 'left | right | center (null = reading side: left in English, right in Farsi)', at: 'when the first line starts (s)', step: 'delay between lines (s)', dur: 'how long each line takes to arrive (s)',
      rise: 'how far each line travels up as it arrives (px)', gapTier: 'extra space between tiers, as a share of the line before', fa: 'true = Farsi',
    },
    cues: p => p.lines.map((l, i) => ({ dt: i * p.step, kind: 'sound', props: { id: i === 0 ? 'whoosh' : 'click' } })),
    draw(ctx, t, p) {
      const fa = isFa(p), align = p.align || (fa ? 'right' : 'left'), ax = align === 'center' ? p.x + p.w / 2 : align === 'right' ? p.x + p.w : p.x;
      let y = p.y;
      ctx.save(); ctx.textBaseline = 'alphabetic'; ctx.fontKerning = 'normal';
      p.lines.forEach((ln, i) => {
        const tier = Object.assign({}, TIER[ln.tier || 'body'], ln.size ? { size: ln.size } : null), size = tier.size * (fa ? .86 : 1), font = face(p, fa ? 'display' : tier.kind, size, tier.weight);
        const txt = (tier.caps && !fa) ? ln.text.toUpperCase() : ln.text, lines = T.balance(font, txt, p.w, fa ? 'rtl' : 'ltr'), lh = size * tier.lh * (fa ? 1.18 : 1);
        const u = prog(t, p.at + i * p.step, p.dur), e = E.outExpo(u);
        ctx.font = font; ctx.fillStyle = KIT.role(ln.color || tier.color);
        lines.forEach((s, k) => {
          const kk = clamp(u * 1.0 - k * .08);
          ctx.globalAlpha = tier.alpha * E.outCubic(kk);
          if (kk > 0) put(ctx, s, ax, y + size * .8 + k * lh + (1 - E.outExpo(kk)) * p.rise, align, fa);
        });
        y += lines.length * lh + size * p.gapTier * (tier.lh > 1 ? 1 : .8);
        void e;
      });
      ctx.restore();
    },
  });

  /* ═══════════════ Key Words ═══════════════ */
  /* words: [{ t, text, key? }] where t is the second the word is said. */
  function layoutWords(words, p, fa) {
    let base = p.size * (fa ? .86 : 1);
    {   /* shrink the type if the longest word (on its marker bar) would not fit the box */
      let mw = 0;
      for (const wd of words) { const f = face(p, fa ? 'display' : p.kind, base, wd.key ? p.keyWeight : p.weight); mw = Math.max(mw, T.width(f, (p.caps && !fa) ? wd.text.toUpperCase() : wd.text, fa ? 'rtl' : 'ltr')); }
      if (mw + base * .28 > p.w) base *= (p.w - base * .28) / mw;
    }
    const lh = base * p.lh * (fa ? 1.12 : 1), sp = base * .26;
    const items = words.map(wd => {
      const key = !!wd.key, font = face(p, fa ? 'display' : p.kind, base, key ? p.keyWeight : p.weight);
      const txt = (p.caps && !fa) ? wd.text.toUpperCase() : wd.text;
      return { wd, key, font, txt, w: T.width(font, txt, fa ? 'rtl' : 'ltr') };
    });
    const lines = []; let cur = [], w = 0;
    for (const it of items) {
      if (cur.length && w + sp + it.w > p.w) { lines.push({ items: cur, w }); cur = []; w = 0; }
      w += (cur.length ? sp : 0) + it.w; cur.push(it);
    }
    if (cur.length) lines.push({ items: cur, w });
    const out = [];
    lines.forEach((ln, i) => {
      const start = p.align === 'center' ? p.x + (p.w - ln.w) / 2 : (fa ? (p.align === 'left' ? p.x : p.x + p.w - ln.w) : (p.align === 'right' ? p.x + p.w - ln.w : p.x));
      let x = fa ? start + ln.w : start;
      ln.items.forEach(it => {
        const left = fa ? x - it.w : x;                          // first word of a Farsi line is the rightmost
        out.push(Object.assign(it, { x: left, y: p.y + base * .8 + i * lh, h: base }));
        x += fa ? -(it.w + sp) : it.w + sp;
      });
    });
    return { out, base, lh, lines };
  }
  KIT.piece('key-words', {
    group: 'numbers',
    doc: 'A sentence, word by word, each word landing at the moment it is said. Key words are lit in clay on a marker bar.',
    defaults: {
      words: [{ t: .2, text: 'Most' }, { t: .5, text: 'tennis' }, { t: .8, text: 'accelerations' , key: true }, { t: 1.3, text: 'are' }, { t: 1.5, text: 'actually' }, { t: 1.8, text: 'very' }, { t: 2.1, text: 'short', key: true }],
      x: 88, y: 700, w: 904, size: 120, weight: 800, keyWeight: 900, lh: 1.04, align: 'left', kind: 'display', caps: true, ghost: 0,
      dur: .22, rise: 26, bar: true, color: 'normal', keyColor: 'clayWhite', barColor: 'key', fa: null,
    },
    params: {
      words: 'a list of { t: the second it is said, text, key?: true } (from a caption export or typed by hand)', x: 'left edge of the block', y: 'top of the block', w: 'width the words wrap to',
      size: 'text size (px)', weight: 'weight of ordinary words', keyWeight: 'weight of key words', lh: 'line height as a share of size', align: 'left | center | right', kind: 'type kind', caps: 'uppercase English (never Farsi)',
      ghost: 'how visible the words are before they are said (0 = hidden, .15 = a faint ghost)', dur: 'how long a word takes to land (s)', rise: 'how far it rises as it lands (px)',
      bar: 'draw a marker bar behind key words', color: 'colour of ordinary words', keyColor: 'colour of key words (on the bar)', barColor: 'colour of the bar', fa: 'true = Farsi',
    },
    cues: p => p.words.filter(w => w.key).map(w => ({ dt: w.t, kind: 'sound', props: { id: 'click' } })),
    draw(ctx, t, p) {
      const fa = isFa(p), lay = layoutWords(p.words, p, fa);
      ctx.save(); ctx.textBaseline = 'alphabetic'; ctx.fontKerning = 'normal';
      for (const it of lay.out) {
        const u = prog(t, it.wd.t, p.dur), e = E.outExpo(u), a = Math.max(p.ghost, E.outCubic(u));
        if (a <= .004) continue;
        const dy = (1 - e) * p.rise, key = it.key;
        if (key && p.bar) {
          const bu = E.outExpo(prog(t, it.wd.t, p.dur * 1.4)), pad = it.h * .14, bh = it.h * 1.02, by = it.y - it.h * .86 + dy * .3;
          ctx.fillStyle = KIT.role(p.barColor); ctx.globalAlpha = 1;
          const bw = (it.w + pad * 2) * bu, bx = fa ? it.x + it.w + pad - bw : it.x - pad;
          ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, it.h * .08); ctx.fill();
        }
        ctx.font = it.font; ctx.fillStyle = KIT.role(key && p.bar ? p.keyColor : (key ? 'keyText' : p.color)); ctx.globalAlpha = a;
        put(ctx, it.txt, it.x, it.y + dy, 'left', fa);
      }
      ctx.restore();
    },
  });

  /* ═══════════════ Strike and Fix ═══════════════ */
  KIT.piece('strike-fix', {
    group: 'numbers',
    doc: 'A wrong word gets struck out with a clay line. The right word is set in green beneath it.',
    defaults: {
      wrong: 'Stronger = faster', fix: 'Faster force = faster', x: 540, y: 900, w: 904, size: 104, weight: 800, at: 0, strikeAt: .7, strikeDur: .3, fixAt: 1.15, dur: .5, rise: 40,
      gap: 1.15, mode: 'stack', align: 'center', kind: 'display', caps: true, wrongColor: 'normal', fixColor: 'fixText', lineColor: 'key', fa: null,
    },
    params: {
      wrong: 'the mistake', fix: 'the right version', x: 'centre (or edge, see align)', y: 'baseline of the mistake', w: 'widest the text may be before it shrinks to fit (px)', size: 'text size (px)', weight: 'weight', at: 'when the mistake appears (s)',
      strikeAt: 'when the line is struck, after at (s)', strikeDur: 'how long the strike takes (s)', fixAt: 'when the fix arrives, after at (s)', dur: 'how long the fix takes to land (s)', rise: 'how far the fix rises as it lands (px)',
      gap: 'space between the two lines as a share of size', mode: 'stack (fix under the mistake) | replace (fix takes its place)', align: 'center | left | right', kind: 'type kind', caps: 'uppercase English',
      wrongColor: 'colour of the mistake', fixColor: 'colour of the fix', lineColor: 'colour of the strike line', fa: 'true = Farsi',
    },
    cues: p => [{ dt: 0, kind: 'sound', props: { id: 'click' } }, { dt: p.strikeAt, kind: 'sound', props: { id: 'swish' } }, { dt: p.fixAt, kind: 'sound', props: { id: 'pluck' } }],
    draw(ctx, t, p) {
      if (t < p.at) return;
      const fa = isFa(p), cap = x => (p.caps && !fa) ? x.toUpperCase() : x, w1 = cap(p.wrong), w2 = cap(p.fix);
      let size = p.size * (fa ? .86 : 1), font = face(p, fa ? 'display' : p.kind, size, p.weight);
      const W = s => T.width(font, s, fa ? 'rtl' : 'ltr');
      const wide = Math.max(W(w1), W(w2)); if (wide > p.w) { size *= p.w / wide; font = face(p, fa ? 'display' : p.kind, size, p.weight); }
      const a1 = W(w1), a2 = W(w2);
      const lx = (w) => p.align === 'center' ? p.x - w / 2 : p.align === 'right' ? p.x - w : p.x;
      const t0 = t - p.at, struck = E.outExpo(prog(t0, p.strikeAt, p.strikeDur));
      const replace = p.mode === 'replace', fixU = prog(t0, p.fixAt, p.dur);
      ctx.save(); ctx.textBaseline = 'alphabetic'; ctx.fontKerning = 'normal'; ctx.font = font;
      /* the mistake: dims once struck; in replace mode it leaves as the fix arrives */
      const dim = lerp(1, .42, struck), gone = replace ? 1 - E.outCubic(prog(t0, p.fixAt - .05, .25)) : 1;
      ctx.globalAlpha = clamp(t0 / .12) * dim * gone; ctx.fillStyle = KIT.role(p.wrongColor);
      put(ctx, w1, lx(a1), p.y, 'left', fa);
      if (struck > 0) {
        const lw = size * .08, my = p.y - size * .3, ext = size * .12, l0 = lx(a1) - ext, l1 = lx(a1) + a1 + ext;
        ctx.globalAlpha = gone; ctx.strokeStyle = KIT.role(p.lineColor); ctx.lineWidth = lw; ctx.lineCap = 'round';
        ctx.beginPath();
        if (fa) { ctx.moveTo(l1, my); ctx.lineTo(l1 - (l1 - l0) * struck, my); } else { ctx.moveTo(l0, my); ctx.lineTo(l0 + (l1 - l0) * struck, my); }
        ctx.stroke();
      }
      if (fixU > 0) {
        const fy = replace ? p.y : p.y + size * p.gap, e = E.outExpo(fixU);
        ctx.globalAlpha = E.outCubic(fixU); ctx.fillStyle = KIT.role(p.fixColor); ctx.font = font;
        put(ctx, w2, lx(a2), fy + (1 - e) * p.rise, 'left', fa);
      }
      ctx.restore();
    },
  });
})(window);
