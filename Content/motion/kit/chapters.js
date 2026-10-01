/* chapters.js — Chapter Rail: a thin rail along the top of a long reel (01 THE PROBLEM, 02 WHY IT HAPPENS, 03 WHAT TO DO, 04 TAKEAWAY).
 *
 * It sits at the TOP, below Instagram's header band, because the buttons and the caption cover the bottom of a reel. The rail has one
 * segment per chapter, filled as time passes; the chapter you are in is lit in clay and named above the rail with its number.
 * In Farsi the rail runs right to left, the first chapter on the right, and the numbers are Persian.
 * Chapter times come from the script (seconds), so the rail is driven by the same clock as everything else.
 */
(function (g) {
  'use strict';
  const L = g.L, KIT = g.KIT, { E, clamp, lerp, prog } = L;
  const T = KIT.text;
  const isFa = p => (p.fa != null ? !!p.fa : KIT.rtl());
  const col = (c, a) => { const v = KIT.role(c); return a == null || a >= 1 ? v : L.rgbaHex(/^#/.test(v) ? v : '#FFFFFF', a); };

  KIT.piece('chapters', {
    group: 'frame',
    doc: 'A thin rail along the top of the reel. One segment per chapter: done ones filled, the current one lit and named, the rest waiting.',
    defaults: {
      chapters: [{ label: 'The problem', from: 0, to: 3 }, { label: 'Why it happens', from: 3, to: 6 }, { label: 'What to do', from: 6, to: 9 }, { label: 'Takeaway', from: 9, to: 12 }],
      x: 88, y: 292, w: 904, h: 10, gap: 12, size: 44, at: 0, now: null, caps: true, numbers: true, doneColor: 'normal', liveColor: 'key', waitColor: 'rgba(242,238,229,.22)', labelColor: 'normal', numColor: 'keyText', fa: null,
    },
    params: {
      chapters: 'a list of { label, from, to }: the chapter names and the seconds they run', x: 'left edge of the rail (px)', y: 'height of the rail (px). Keep it below Instagram\'s top band', w: 'length of the rail (px)', h: 'thickness (px)', gap: 'space between segments (px)',
      size: 'size of the chapter name (px)', at: 'when the rail appears (s)', now: 'null = the scene clock, or a function of time if the chapters run on a different clock', caps: 'uppercase English names (never Farsi)', numbers: 'show the chapter number',
      doneColor: 'colour of finished segments', liveColor: 'colour of the current segment', waitColor: 'colour of segments still to come', labelColor: 'colour of the name', numColor: 'colour of the number', fa: 'true = Farsi (the rail runs right to left)',
    },
    cues: p => p.chapters.slice(1).map(c => ({ dt: c.from, kind: 'sound', props: { id: 'click' } })),
    draw(ctx, t, p) {
      if (t < p.at) return;
      const fa = isFa(p), n = p.chapters.length, cur = KIT.val(p.now, t) != null ? KIT.val(p.now, t) : t, segW = (p.w - p.gap * (n - 1)) / n, u0 = E.outExpo(prog(t, p.at, .6));
      ctx.save(); ctx.globalAlpha = u0; ctx.textBaseline = 'alphabetic';
      let live = -1;
      p.chapters.forEach((c, i) => { if (cur >= c.from && (cur < c.to || i === n - 1)) live = i; });
      p.chapters.forEach((c, i) => {
        const x = fa ? p.x + p.w - (i + 1) * segW - i * p.gap : p.x + i * (segW + p.gap), k = clamp((cur - c.from) / (c.to - c.from));
        ctx.fillStyle = col(p.waitColor); ctx.beginPath(); ctx.roundRect(x, p.y, segW, p.h, p.h / 2); ctx.fill();
        if (k > 0) {
          const fw = segW * k; ctx.fillStyle = col(i === live ? p.liveColor : p.doneColor, i === live ? 1 : .85);
          ctx.beginPath(); ctx.roundRect(fa ? x + segW - fw : x, p.y, fw, p.h, p.h / 2); ctx.fill();
        }
      });
      /* the name of the chapter we are in, with its number, above the rail: it rolls up each time the chapter changes */
      if (live >= 0) {
        const c = p.chapters[live], ru = E.outExpo(prog(cur, c.from, .45)), num = fa ? T.fa(String(live + 1).padStart(2, '0')) : String(live + 1).padStart(2, '0');
        const name = (p.caps && !fa) ? c.label.toUpperCase() : c.label, nf = fa ? KIT.face('ui', p.size, 700) : KIT.face('mono', p.size * .78, 700), edge = fa ? p.x + p.w : p.x;
        ctx.save(); ctx.beginPath(); ctx.rect(p.x - 20, p.y - p.size * 1.9, p.w + 40, p.size * 1.7); ctx.clip();
        const dy = (1 - ru) * p.size * .9; ctx.globalAlpha = u0 * ru; ctx.font = nf; if (!fa) ctx.letterSpacing = '3px';
        const numStr = p.numbers ? num : '', gap = p.numbers ? 22 : 0, nw = p.numbers ? T.width(nf, numStr) + gap : 0;
        if (p.numbers) { ctx.fillStyle = col(p.numColor); T.put(ctx, numStr, edge, p.y - p.size * .55 + dy, fa ? 'right' : 'left', fa); }
        ctx.fillStyle = col(p.labelColor); T.put(ctx, name, fa ? edge - nw : edge + nw, p.y - p.size * .55 + dy, fa ? 'right' : 'left', fa);
        ctx.restore();
      }
      ctx.restore();
    },
  });
})(window);
