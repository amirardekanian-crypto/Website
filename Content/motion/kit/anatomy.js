/* anatomy.js — Muscle Map: the athlete app's own body drawing, with the muscles lighting up one at a time.
 *
 * The drawing is Amir's (the "Muscles worked" figure in program.html, traced from his chosen picture; see
 * .claude/skills/image/bodymap/README.md), front and back, one shape per muscle group with the SAME muscle names as the Spine:
 *   front: neck back shoulder chest triceps core biceps forearm hip adductors quads calves shins peroneals ankle
 *   back : neck back shoulder triceps lowback forearm glutes quads adductors hamstrings calves peroneals
 * Colours follow the app: the main muscle in full clay, helpers in soft clay. Nothing is redrawn and no picture is generated.
 * kit/bodymap.js is generated from the drawing by tools/bodymap.py.
 */
(function (g) {
  'use strict';
  const L = g.L, KIT = g.KIT, { E, clamp, lerp, prog } = L;
  const T = KIT.text;
  const isFa = p => (p.fa != null ? !!p.fa : KIT.rtl());
  const col = (c, a) => { const v = KIT.role(c); return a == null || a >= 1 ? v : L.rgbaHex(/^#/.test(v) ? v : '#FFFFFF', a); };

  /* the names a label may use. The Farsi ones are a draft for Amir to read. */
  const NAMES = {
    en: { quads: 'QUADS', glutes: 'GLUTES', calves: 'CALVES', hamstrings: 'HAMSTRINGS', chest: 'CHEST', shoulder: 'SHOULDERS', triceps: 'TRICEPS', biceps: 'BICEPS', core: 'CORE', forearm: 'FOREARMS', back: 'BACK', lowback: 'LOWER BACK', hip: 'HIPS', adductors: 'INNER THIGH', shins: 'SHINS', peroneals: 'OUTER CALF', ankle: 'ANKLES', neck: 'NECK' },
    fa: { quads: 'چهارسر ران', glutes: 'سرینی', calves: 'ساق پا', hamstrings: 'همسترینگ', chest: 'سینه', shoulder: 'شانه', triceps: 'پشت بازو', biceps: 'جلو بازو', core: 'مرکز بدن', forearm: 'ساعد', back: 'پشت', lowback: 'کمر', hip: 'لگن', adductors: 'ران داخلی', shins: 'جلو ساق', peroneals: 'کنار ساق', ankle: 'مچ پا', neck: 'گردن' },
  };
  KIT.muscleNames = NAMES;

  const paths = new Map();
  const path = (kind, view, name) => { const k = kind + '|' + view + '|' + name; let p = paths.get(k); if (!p) { const s = name == null ? KIT.bodymap[kind][view] : KIT.bodymap[kind][view][name]; p = s ? new Path2D(s) : null; paths.set(k, p); } return p; };

  /* where the view is at time t: which view, and how far through a turn (scaleX goes 1 to 0 to 1 as the body turns round) */
  function viewAt(p, t) {
    let cur = p.views[0].view, sx = 1;
    for (let i = 1; i < p.views.length; i++) {
      const a = p.views[i].at - p.turn / 2, u = prog(t, a, p.turn);
      if (u > 0) { cur = u < .5 ? p.views[i - 1].view : p.views[i].view; sx = Math.abs(Math.cos(Math.PI * u)); if (u >= 1) sx = 1; }
    }
    return { view: cur, sx };
  }

  KIT.piece('muscle-map', {
    group: 'anatomy',
    doc: 'The app\'s own body drawing. Muscles light up one at a time with a label, and the body can turn round from front to back.',
    defaults: {
      x: 630, y: 980, height: 1180, views: [{ view: 'front', at: 0 }], lights: [{ muscle: 'quads', at: 1, role: 'main' }], labels: true, labelSize: 52, labelGap: 48, labelSide: 'left', at: 0, turn: .75,
      base: 'rgba(242,238,229,.075)', lineArt: .2, silFill: 'rgba(242,238,229,.035)', silLine: 'rgba(242,238,229,.34)', main: 'key', helper: 'rgba(199,85,47,.5)', glow: 30, fa: null,
    },
    params: {
      x: 'centre of the body (px)', y: 'centre of the body (px)', height: 'height of the drawing (px)', views: 'a list of { view: front | back, at: seconds }: when the body turns round', lights: 'a list of { muscle, at: seconds, role: main | helper, view?: front | back (only light it in that view), label?: text, side?: left | right }',
      labels: 'name each muscle as it lights', labelSize: 'size of the names (px)', labelGap: 'space between the body and the names (px)', labelSide: 'which side of the body the names go: left | right (they stack in one column)', at: 'when the body appears (s)', turn: 'how long a turn takes (s)',
      base: 'fill of a muscle that is not lit', lineArt: 'strength of the fine line drawing over the muscles (0 to 1)', silFill: 'fill of the body shape', silLine: 'colour of the body outline', main: 'colour of a main muscle', helper: 'colour of a helping muscle',
      glow: 'size of the glow round a main muscle (px)', fa: 'true = Farsi',
    },
    cues: p => p.lights.map(l => ({ dt: l.at, kind: 'sound', props: { id: 'bubble' } })).concat(p.views.slice(1).map(v => ({ dt: v.at - p.turn / 2, kind: 'sound', props: { id: 'whoosh' } }))),
    draw(ctx, t, p) {
      if (t < p.at) return;
      const BM = KIT.bodymap, fa = isFa(p), { view, sx } = viewAt(p, t), pl = BM.place[view], s = p.height / pl.h, fade = E.outCubic(clamp((t - p.at) / .5));
      const cx = p.x, top = p.y - p.height / 2;
      ctx.save(); ctx.globalAlpha = fade;
      ctx.translate(cx, top); ctx.scale(s * sx, s); ctx.translate(-(pl.x + pl.w / 2), 0);
      /* the body shape, the muscles, the fine line drawing */
      ctx.fillStyle = col(p.silFill); ctx.fill(path('sil', view));
      for (const name of Object.keys(BM.groups[view])) {
        const lit = p.lights.filter(l => l.muscle === name && t >= l.at && (!l.view || l.view === view)), f = path('groups', view, name);
        if (!lit.length) { ctx.fillStyle = col(p.base); ctx.fill(f); continue; }
        const l = lit[lit.length - 1], u = E.outCubic(prog(t, l.at, .45)), main = (l.role || 'main') === 'main', base = main ? col(p.main) : col(p.helper);
        ctx.save();
        if (main && p.glow) { ctx.shadowColor = col(p.main, .85 * u); ctx.shadowBlur = p.glow * u; }
        ctx.fillStyle = base; ctx.globalAlpha = fade * lerp(.35, 1, u); ctx.fill(f); ctx.restore();
        const flash = 1 - E.outCubic(prog(t, l.at, .4)); if (flash > .01) { ctx.save(); ctx.globalAlpha = fade * .55 * flash; ctx.fillStyle = '#FFFFFF'; ctx.fill(f); ctx.restore(); }
      }
      ctx.globalAlpha = fade * p.lineArt; ctx.fillStyle = col('normal'); ctx.fill(path('line', view));
      ctx.globalAlpha = fade; ctx.strokeStyle = col(p.silLine); ctx.lineWidth = 3 / s; ctx.lineJoin = 'round'; ctx.stroke(path('sil', view));
      ctx.restore();
      /* the names, once the body has stopped turning: one column beside the body, kept clear of each other */
      if (p.labels && sx > .985) {
        const names = NAMES[fa ? 'fa' : 'en'], axis = pl.x + pl.w / 2, gap = p.labelSize * 1.38, rows = [];
        for (const l of p.lights) {
          if (l.view && l.view !== view) continue;
          const parts = BM.parts[view][l.muscle]; if (!parts) continue;
          const side = l.side || p.labelSide;
          const pick = parts.filter(q => (side === 'left' ? q.cx <= axis : q.cx >= axis))[0] || parts[0];     // the biggest shape on that side of the body
          rows.push({ l, side, point: [cx + (pick.cx - axis) * s, top + pick.cy * s] });
        }
        for (const side of ['left', 'right']) {                                                                  // stack the names so they never overlap
          const col_ = rows.filter(r => r.side === side).sort((a, b) => a.point[1] - b.point[1]);
          let last = -1e9; for (const r of col_) { r.y = Math.max(r.point[1], last + gap); last = r.y; }
          const over = last - (col_.length ? col_[col_.length - 1].point[1] : 0); if (over > 0 && col_.length > 1) for (const r of col_) r.y -= over / 2;
        }
        const leftX = cx - (pl.w / 2) * s - p.labelGap, rightX = cx + (pl.w / 2) * s + p.labelGap;
        for (const r of rows) {
          const l = r.l, main = (l.role || 'main') === 'main', to = [r.side === 'left' ? leftX : rightX, r.y];
          KIT.draw('label-line', ctx, t, { point: r.point, to, text: l.label || names[l.muscle] || l.muscle, at: l.at + .1, dur: .5, size: p.labelSize, color: main ? 'normal' : 'soft', lineColor: main ? 'keyText' : 'soft', fa: p.fa, kind: 'display', weight: 800, alpha: fade, hold: 20 });
        }
      }
    },
  });
})(window);
