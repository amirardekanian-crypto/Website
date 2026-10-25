/* AA emblems: the achievement cabinet's art, drawn in code (Amir, 2026-10-25: direction A "Centre Court" of the board
   https://claude.ai/artifact/8eH6ZbquCeTMZd46BK3QwG, "go with your picks"). One SVG per emblem, no pictures, no network.

   THE RULES THE DRAWINGS KEEP
   - Shape = family (a diamond for sessions, a medal for weeks in a row, a cup for months in a row, a shield for bests, a hexagon
     for comebacks, a coin with a banner for a habit rung, a ticket for months with Amir, each one-off its own frame and glyph).
   - Colour = step. Five steps from the court, NEVER a metal: 0 Ink, 1 Grass, 2 Clay, 3 Night (ink in a clay frame), 4 Champion
     (green in a clay frame). No yellow, gold, ochre or amber, ever (docs/rules/design.md). A tiered thing takes its step from its
     place; a one-off takes it from what it pays (stepOf()).
   - A won emblem is drawn in its colours. A not-won one is a flat ghost of the same shape (--ghost, --ghost-dk, --paper), as Nike's.
   - The level medal is direction C's struck medal: a new design every ten levels (LVD), the level number on it.
   - The AA monogram sits where Nike puts its swoosh.

   API (window.AAEmblem): ach(id, {won}) · mark(markId, tierIndex, {won}) · level(L, {won}) · info(id) · markInfo(markId, tierIndex)
   · SECTIONS · stepName(i) · LEVEL_STEPS. Each drawing returns an <svg> string (viewBox 0 0 120 120); size it with CSS.
   An unknown id still draws: a plain notched trophy with a star, so a new catalogue line never shows a hole. */
(function () {
  'use strict';
  const INK = '#1A1A1A', PAPER = '#FAF7F2', GREEN = '#0E4A36', CLAY = '#C7552F';
  const GHOST = 'var(--ghost, #E6E0D6)', GHOST_DK = 'var(--ghost-dk, #D2C9BB)', GPAPER = 'var(--paper, #FAF7F2)';
  const P_ = 'aae-';   // every gradient id carries this, so nothing on the page can collide with it

  // ── the five steps ──
  const CHALK_FR = [[0, '#FFFFFF'], [.3, '#E6E0D5'], [.58, '#A39B8F'], [.82, '#6A6359'], [1, '#B9B1A5']];
  const CLAY_FR = [[0, '#FFD2BF'], [.3, '#E58A64'], [.58, '#C7552F'], [.82, '#7E2F15'], [1, '#B5461F']];
  const INK_OBJ = [[0, '#4B4B4B'], [.45, '#1F1F1F'], [1, '#0B0B0B']];
  const GREEN_OBJ = [[0, '#2E9470'], [.45, '#0E4A36'], [1, '#05261B']];
  const CLAY_OBJ = [[0, '#EE9A76'], [.45, '#C7552F'], [1, '#6E2812']];
  const CHALK_NU = [[0, '#FFFFFF'], [1, '#E2DCD1']];
  const CLAY_NU = [[0, '#FFC9B3'], [.55, '#E9835B'], [1, '#C7552F']];
  const RIB_INK = [[0, '#0B0B0B'], [.5, '#3A3A3A'], [1, '#0B0B0B']], RIB_GREEN = [[0, '#0A3A2A'], [.5, '#1B7254'], [1, '#0A3A2A']];
  const STEPS = [
    { name: 'Ink', fr: CHALK_FR, obj: INK_OBJ, objMid: '#141414', nu: CHALK_NU, det: '#CFC8BC', aa: '#CFC8BC', band: INK, bandTx: '#FFFFFF', rib: RIB_INK, stripe: PAPER, acc: CLAY, ground: ['#FFFFFF', '#E2DCD2'], gTx: INK },
    { name: 'Grass', fr: CHALK_FR, obj: GREEN_OBJ, objMid: '#0B3D2C', nu: CHALK_NU, det: '#6DBE95', aa: '#9FD8BB', band: GREEN, bandTx: '#FFFFFF', rib: RIB_GREEN, stripe: PAPER, acc: CLAY, ground: ['#EAF5EF', '#BCD9CA'], gTx: INK },
    { name: 'Clay', fr: CHALK_FR, obj: CLAY_OBJ, objMid: '#A9441F', nu: CHALK_NU, det: '#F7B79C', aa: '#FFD9C8', band: CLAY, bandTx: '#FFFFFF', rib: [[0, '#8A3418'], [.5, '#D9683F'], [1, '#8A3418']], stripe: PAPER, acc: INK, ground: ['#FBEAE2', '#EDBBA3'], gTx: INK },
    { name: 'Night', fr: CLAY_FR, obj: INK_OBJ, objMid: '#141414', nu: CLAY_NU, det: '#C7552F', aa: '#E9835B', band: INK, bandTx: '#F7A183', rib: RIB_INK, stripe: CLAY, acc: CLAY, ground: ['#3A3A3A', '#0E0E0E'], gTx: '#FFFFFF' },
    { name: 'Champion', fr: CLAY_FR, obj: GREEN_OBJ, objMid: '#0B3D2C', nu: CHALK_NU, det: '#F7A183', aa: '#F7A183', band: GREEN, bandTx: '#FFFFFF', rib: RIB_GREEN, stripe: CLAY, acc: CLAY, key: PAPER, ground: ['#1B7254', '#06241A'], gTx: '#FFFFFF' },
  ];
  // the level medal's materials (direction C): chalk, slate, green glaze, terracotta, and glazed (green in a terracotta rim)
  const MAT = [
    { cn: [[0, '#FFFFFF'], [.3, '#F1ECE3'], [.72, '#CFC6B8'], [1, '#948A7B']], cf: [[0, '#E6DFD3'], [1, '#C6BDAE']], nu: [[0, '#FFFFFF'], [1, '#F1ECE3']] },
    { cn: [[0, '#7A7A7A'], [.3, '#4A4A4A'], [.72, '#262626'], [1, '#0B0B0B']], cf: [[0, '#3E3E3E'], [1, '#1E1E1E']], nu: [[0, '#B4B4B4'], [1, '#5A5A5A']] },
    { cn: [[0, '#9FD8BB'], [.3, '#2E9470'], [.72, '#0E4A36'], [1, '#04201A']], cf: [[0, '#1B7254'], [1, '#0B3D2C']], nu: [[0, '#CFEDDD'], [1, '#5DB389']] },
    { cn: [[0, '#FFD2BF'], [.3, '#E58A64'], [.72, '#C7552F'], [1, '#6E2812']], cf: [[0, '#D8673E'], [1, '#A9441F']], nu: [[0, '#FFE6DA'], [1, '#F0A27F']] },
    { cn: [[0, '#FFD2BF'], [.3, '#E58A64'], [.72, '#C7552F'], [1, '#6E2812']], cf: [[0, '#1B7254'], [1, '#0B3D2C']], nu: [[0, '#FFFFFF'], [1, '#D9EFE3']] },
  ];

  // ── the gradients, put on the page once ──
  const stops = a => a.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('');
  const lin = (id, x1, y1, x2, y2, a) => `<linearGradient id="${P_}${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops(a)}</linearGradient>`;
  const rad = (id, cx, cy, r, a) => `<radialGradient id="${P_}${id}" cx="${cx}" cy="${cy}" r="${r}">${stops(a)}</radialGradient>`;
  function defsHTML() {
    let g = '';
    STEPS.forEach((t, i) => { g += lin(`A${i}-fr`, 0, 0, 1, 1, t.fr) + lin(`A${i}-ed`, 1, 1, 0, 0, t.fr) + rad(`A${i}-obj`, .35, .28, .85, t.obj) + lin(`A${i}-nu`, 0, 0, 0, 1, t.nu) + lin(`A${i}-rib`, 0, 0, 1, 0, t.rib); });
    MAT.forEach((t, i) => { g += rad(`C${i}-cn`, .36, .3, .8, t.cn) + lin(`C${i}-cf`, 0, 0, 0, 1, t.cf) + lin(`C${i}-nu`, 0, 0, 0, 1, t.nu); });
    g += lin('L-clay', 0, 0, 0, 1, [[0, '#F2A383'], [1, '#B5461F']]);
    return `<svg id="aae-defs" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true" focusable="false"><defs>${g}</defs></svg>`;
  }
  function ensureDefs() {
    if (typeof document === 'undefined' || document.getElementById('aae-defs') || !document.body) return;
    document.body.insertAdjacentHTML('afterbegin', defsHTML());
  }
  const U = id => `url(#${P_}${id})`;

  // ── helpers ──
  const S = (f, s, w, x = '') => `style="fill:${f || 'none'};${s ? `stroke:${s};stroke-width:${w};` : ''}${x}"`;
  const FONT = `font-family:'Barlow Condensed','Arial Narrow',sans-serif;font-weight:800`;
  const num = (n, x, y, fill, size, x2 = '') => `<text x="${x}" y="${(y + size * 0.355).toFixed(1)}" text-anchor="middle" style="${FONT};fill:${fill};font-size:${size}px;${x2}">${n}</text>`;
  const aa = (x, y, fill, size = 7) => `<text x="${x}" y="${(y + size * 0.36).toFixed(1)}" text-anchor="middle" style="${FONT};fill:${fill};font-size:${size}px;letter-spacing:.6px">AA</text>`;
  const word = (t, x, y, size, col, ls = 1.6) => `<text x="${x}" y="${y}" text-anchor="middle" style="font-family:Barlow,system-ui,sans-serif;font-weight:700;font-size:${size}px;letter-spacing:${ls}px;fill:${col}">${t}</text>`;
  const nsz = (n, a, b, c) => String(n).length > 2 ? c : String(n).length > 1 ? b : a;
  const P = pts => pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ');
  const ring = (n, r, cx = 60, cy = 60, off = -90) => Array.from({ length: n }, (_, i) => { const a = (off + i * 360 / n) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
  const ticks = (n, r1, r2, cx = 60, cy = 60) => Array.from({ length: n }, (_, i) => { const a = i * 2 * Math.PI / n, c = Math.cos(a), s = Math.sin(a); return `M${(cx + r1 * c).toFixed(1)} ${(cy + r1 * s).toFixed(1)}L${(cx + r2 * c).toFixed(1)} ${(cy + r2 * s).toFixed(1)}`; }).join('');
  const RC = 'stroke-linecap:round', RJ = 'stroke-linecap:round;stroke-linejoin:round';

  // ── glyphs on a 24 grid: (colour, the ground behind a cut-out) ──
  const GL = {
    water: c => `<path d="M12 2.5C12 2.5 5 10.2 5 15a7 7 0 0 0 14 0c0-4.8-7-12.5-7-12.5z" ${S(c)}/>`,
    sleep: c => `<path d="M15.5 3A9 9 0 1 0 21 17.5 7.4 7.4 0 0 1 15.5 3z" ${S(c)}/>`,
    food: (c, bg) => `<path d="M4 20C4 10 10.5 4 20 4c0 9.5-6 16-16 16z" ${S(c)}/><path d="M5 19 13.5 10.5" ${S('none', bg, 1.6, RC)}/>`,
    steps: c => `<ellipse cx="8" cy="14.5" rx="3.6" ry="5.6" ${S(c)}/><ellipse cx="16" cy="8.5" rx="3.6" ry="5.6" ${S(c)}/><circle cx="8" cy="22" r="1.6" ${S(c)}/><circle cx="16" cy="16" r="1.6" ${S(c)}/>`,
    link: c => `<rect x="1.8" y="8" width="12.5" height="8" rx="4" ${S('none', c, 2.6)}/><rect x="9.7" y="8" width="12.5" height="8" rx="4" ${S('none', c, 2.6)}/>`,
    sweep: c => `<path d="M12 1.5 14.2 9.8 22.5 12 14.2 14.2 12 22.5 9.8 14.2 1.5 12 9.8 9.8z" ${S(c)}/>`,
    sunrise: c => `<path d="M5.5 17.5a6.5 6.5 0 0 1 13 0z" ${S(c)}/><path d="M2 20.5h20M12 4v3M4.6 8.6l2.1 2.1M19.4 8.6l-2.1 2.1M1.8 14h2.6M19.6 14h2.6" ${S('none', c, 2, RC)}/>`,
    target: (c, bg) => `<circle cx="12" cy="12" r="9.5" ${S(c)}/><circle cx="12" cy="12" r="6.2" ${S(bg)}/><circle cx="12" cy="12" r="3" ${S(c)}/>`,
    dumbbell: c => `<rect x="1.5" y="9" width="3" height="6" rx="1" ${S(c)}/><rect x="4.5" y="6.5" width="3.6" height="11" rx="1.2" ${S(c)}/><rect x="8" y="10.8" width="8" height="2.4" ${S(c)}/><rect x="15.9" y="6.5" width="3.6" height="11" rx="1.2" ${S(c)}/><rect x="19.5" y="9" width="3" height="6" rx="1" ${S(c)}/>`,
    fight: c => `<path d="M2.5 18.5 9 12l4 4 8.5-9M15.5 6.5h6v6" ${S('none', c, 2.6, RJ)}/>`,
    cycle: c => `<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" ${S('none', c, 2.6, RC)}/><path d="M18.2 2.8v4.4h-4.4" ${S('none', c, 2.6, RJ)}/>`,
    book: (c, bg) => `<path d="M12 6.5C9.5 5 6.5 4.6 3 5v13.2c3.5-.4 6.5 0 9 1.4 2.5-1.4 5.5-1.8 9-1.4V5c-3.5-.4-6.5 0-9 1.5z" ${S(c)}/><path d="M12 6.8v12.6" ${S('none', bg, 1.4)}/>`,
    road: c => `<path d="M2 21 9.5 9.5 13 14.5 16 11 22 21z" ${S(c)}/><path d="M9.5 10V2.5" ${S('none', c, 1.6, RC)}/><path d="M9.5 2.5 15 4.5 9.5 6.5z" ${S(c)}/>`,
    calendar: (c, bg) => `<rect x="3" y="5" width="18" height="16" rx="2.5" ${S(c)}/><path d="M3 10h18" ${S('none', bg, 1.4)}/><path d="M8 3v4M16 3v4" ${S('none', c, 2, RC)}/><path d="M8.5 15.2l2.4 2.4 4.6-4.8" ${S('none', bg, 2, RJ)}/>`,
    tally: c => `<path d="M5 5v14M9.5 5v14M14 5v14M18.5 5v14M2.5 16.5 21 7.5" ${S('none', c, 2.4, RC)}/>`,
    notebook: (c, bg) => `<rect x="5" y="3" width="15.5" height="18" rx="2" ${S(c)}/><path d="M9 8.5h8M9 12.5h8M9 16.5h5" ${S('none', bg, 1.5, RC)}/><path d="M3 7.5h4M3 12h4M3 16.5h4" ${S('none', c, 1.8, RC)}/>`,
    bubble: (c, bg) => `<path d="M4.5 4.5h15a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H11l-5 4v-4H4.5a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2z" ${S(c)}/><circle cx="8" cy="10.8" r="1.3" ${S(bg)}/><circle cx="12" cy="10.8" r="1.3" ${S(bg)}/><circle cx="16" cy="10.8" r="1.3" ${S(bg)}/>`,
    treble: c => `<circle cx="7" cy="16" r="4.3" ${S(c)}/><circle cx="17" cy="16" r="4.3" ${S(c)}/><circle cx="12" cy="7.3" r="4.3" ${S(c)}/>`,
    sprout: c => `<path d="M12 21.5V11M6 21.5h12" ${S('none', c, 2.2, RC)}/><path d="M12 12.5C12 7.5 8.6 4.5 3.5 4.5c0 5 3.4 8 8.5 8z" ${S(c)}/><path d="M12 10.5c0-4.5 3.2-7 8.5-7 0 4.6-3.3 7-8.5 7z" ${S(c)}/>`,
    pomegranate: (c, bg) => `<circle cx="12" cy="14" r="7.5" ${S(c)}/><path d="M8.6 7.6 9.2 3.8 12 5.6 14.8 3.8 15.4 7.6z" ${S(c)}/>` + [[9.6, 12.6], [14.4, 12.6], [12, 15.2], [9.3, 16.6], [14.7, 16.6], [12, 10.8]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".95" ${S(bg)}/>`).join(''),
    moonstar: c => `<path d="M14 4A8.6 8.6 0 1 0 20.5 17.2 7 7 0 0 1 14 4z" ${S(c)}/><path d="M19.5 2.2l.9 2 2 .9-2 .9-.9 2-.9-2-2-.9 2-.9z" ${S(c)}/>`,
    arrowUp: c => `<path d="M12 2.5 20.5 12H15v9.5H9V12H3.5z" ${S(c)}/>`,
    allcourt: c => { const pts = ring(5, 7.5, 12, 12); return `<path d="${pts.map(([x, y]) => `M12 12L${x.toFixed(1)} ${y.toFixed(1)}`).join('')}" ${S('none', c, 1.5)}/><circle cx="12" cy="12" r="2.8" ${S(c)}/>` + pts.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.4" ${S(c)}/>`).join(''); },
    bounce: c => `<circle cx="18" cy="6.5" r="3.6" ${S(c)}/><path d="M2.5 4.5C4.5 14 6.5 20 9.5 20s4.6-5 6.3-9.6" ${S('none', c, 1.9, 'stroke-linecap:round;stroke-dasharray:2.2 2.4')}/><path d="M3 21.5h9" ${S('none', c, 1.8, RC)}/>`,
    door: c => `<path d="M14 3.5h4.5a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H14M3 12h11.5M10.5 7.8l4.2 4.2-4.2 4.2" ${S('none', c, 2.4, RJ)}/>`,
    uturn: c => `<path d="M7 21V10a5.5 5.5 0 0 1 11 0v4.5" ${S('none', c, 2.6, RC)}/><path d="M14 11.5 18 15.5l4-4" ${S('none', c, 2.6, RJ)}/>`,
    rain: c => `<path d="M7 15a4.5 4.5 0 0 1-.4-9A6 6 0 0 1 17.8 7.6 3.7 3.7 0 0 1 17.4 15z" ${S(c)}/><path d="M8.5 18 7.5 21M12.5 18l-1 3M16.5 18l-1 3" ${S('none', c, 1.9, RC)}/>`,
    stack: c => [3.5, 8.5, 13.5, 18.5].map(y => `<rect x="3" y="${y}" width="18" height="3.4" rx="1.7" ${S(c)}/>`).join(''),
    anvil: c => `<path d="M2.5 6.5H16c.3 2.7 2.2 4 5.5 4v2.5H16.5l-1.2 3H17V20H7v-4h1.7l-1.2-3C4.6 13 2.5 10.7 2.5 6.5z" ${S(c)}/>`,
    rock: c => `<path d="M2.5 20.5h19l-2.2-4.6H4.7zM5 14.4h14l-2.2-4.6H7.2zM7.5 8.3h9l-2.2-4.6H9.7z" ${S(c)}/>`,
    snow: c => `<path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7" ${S('none', c, 2.2, RC)}/><path d="M9.3 3.6 12 6.3l2.7-2.7M9.3 20.4 12 17.7l2.7 2.7" ${S('none', c, 1.6, RJ)}/>`,
    flag: c => `<path d="M6 21.5V2.5M3 21.5h7" ${S('none', c, 2.4, RC)}/><path d="M6.5 3.5h12.5l-3.2 4.2 3.2 4.3H6.5z" ${S(c)}/>`,
    star: c => `<path d="M12 2.5 14.6 9l7 .4-5.4 4.4 1.8 6.8L12 16.8l-6 3.8 1.8-6.8L2.4 9.4l7-.4z" ${S(c)}/>`,
  };

  // ── the palette of one emblem: its step's colours, or the ghost ──
  function pal(tier, won) {
    if (!won) return { lk: 1, fr: GHOST, ed: GHOST, ink: GHOST, nu: GPAPER, det: GPAPER, band: GHOST, bandTx: GPAPER, rib: GHOST, stripe: GHOST, aa: GPAPER, onFr: GPAPER, acc: GHOST, bg: GHOST, edOp: .7 };
    const i = Math.max(0, Math.min(4, tier | 0)), t = STEPS[i];
    return { fr: U(`A${i}-fr`), ed: t.key || U(`A${i}-ed`), edOp: t.key ? 1 : .7, ink: U(`A${i}-obj`), nu: U(`A${i}-nu`), det: t.det, band: t.band, bandTx: t.bandTx,
      rib: U(`A${i}-rib`), stripe: t.stripe, aa: t.aa, onFr: INK, acc: t.acc, bg: t.objMid };
  }
  function frame(kind, p) {
    if (kind === 'notch') { let o = `<circle cx="60" cy="60" r="46" ${S('none', p.fr, 4)}/>`; for (const a of [0, 90, 180, 270]) o += `<path d="M60 4 L65.5 10.5 L60 17 L54.5 10.5 Z" transform="rotate(${a} 60 60)" ${S(p.fr)}/>`; return o; }
    if (kind === 'crest') return `<path d="M60 6 L103 21 V60 C103 86 85 103 60 114 C35 103 17 86 17 60 V21 Z" ${S('none', p.fr, 4, 'stroke-linejoin:round')}/><path d="M60 13 L96 26 V60 C96 82 81 97 60 106 C39 97 24 82 24 60 V26 Z" ${S('none', p.ed, 1, `opacity:${p.edOp};stroke-linejoin:round`)}/>`;
    if (kind === 'hex') return `<polygon points="${P(ring(6, 52))}" ${S('none', p.fr, 4.5, 'stroke-linejoin:round')}/>`;
    if (kind === 'oct') return `<polygon points="${P(ring(8, 53, 60, 60, 22.5))}" ${S('none', p.fr, 4, 'stroke-linejoin:round')}/><polygon points="${P(ring(8, 47, 60, 60, 22.5))}" ${S('none', p.ed, 1, `opacity:${p.edOp};stroke-linejoin:round`)}/>`;
    if (kind === 'square') return `<rect x="10" y="10" width="100" height="100" rx="20" ${S('none', p.fr, 4.5)}/><rect x="17" y="17" width="86" height="86" rx="14" ${S('none', p.ed, 1, `opacity:${p.edOp}`)}/>`;
    return `<path d="M20 11 H100 V79 L60 108 L20 79 Z" ${S('none', p.fr, 4.5, 'stroke-linejoin:round')}/>`;   // shield
  }
  const diamond = p => `<path d="M60 7 L113 60 L60 113 L7 60 Z" ${S('none', p.fr, 5, 'stroke-linejoin:round')}/><path d="M60 16 L104 60 L60 104 L16 60 Z" ${S('none', p.ed, 1.2, `opacity:${p.edOp}`)}/>`;
  const ball = (p, n) => `<circle cx="60" cy="58" r="28" ${S(p.ink)}/><path d="M38 41 C45 49 45 67 38 75 M82 41 C75 49 75 67 82 75" ${S('none', p.det, 2.2, 'stroke-linecap:round;opacity:.85')}/>` + num(n, 60, 58, p.nu, 24);
  const bell = (p, n) => `<path d="M45 56 V43 C45 33 52 27 60 27 C68 27 75 33 75 43 V56" ${S('none', p.ink, 8, RC)}/><circle cx="60" cy="66" r="25" ${S(p.ink)}/>` + num(n, 60, 67, p.nu, 27);
  const plate = (p, n) => `<circle cx="60" cy="59" r="31" ${S(p.ink)}/><path d="${ticks(24, 26.5, 29.5, 60, 59)}" ${S('none', p.det, 1.1, 'opacity:.6')}/><circle cx="60" cy="59" r="20" ${S('none', p.det, .8, 'opacity:.5')}/>` + num(n, 60, 59, p.nu, nsz(n, 27, 27, 21));
  const dumb = (p, n) => { const d = String(n); return `<rect x="45" y="56" width="30" height="8" rx="2" ${S(p.ink)}/><rect x="25" y="45" width="23" height="30" rx="6" ${S(p.ink)}/><rect x="72" y="45" width="23" height="30" rx="6" ${S(p.ink)}/>` + num(d[0], 36.5, 60, p.nu, 22) + num(d.slice(1), 83.5, 60, p.nu, 22); };
  const AA_DK = p => p.lk ? GHOST_DK : p.aa;

  // ── the families ──
  const DRAW = {
    // sessions: Nike's object ladder. A ball for the first, a kettlebell to 7, a dumbbell 10 to 25 (its digits on the two heads), a plate from 30
    sessions(s, p) { const n = +s.n; return diamond(p) + (n === 1 ? ball(p, n) : n < 10 ? bell(p, n) : n < 30 ? dumb(p, n) : plate(p, n)) + aa(60, 99, AA_DK(p), 7); },
    // weeks in a row: a medal on a ribbon; the ribbon changes with the step
    weeks(s, p) {
      return `<path d="M88 14 L74 14 L53 64 L67 64 Z" ${S(p.rib)}/><path d="M81 14 L60 64" ${S('none', p.stripe, 2.6)}/>`
        + `<path d="M32 14 L46 14 L67 64 L53 64 Z" ${S(p.rib)}/><path d="M39 14 L60 64" ${S('none', p.stripe, 2.6)}/>`
        + `<rect x="27" y="7" width="66" height="13" rx="3" ${S(p.fr)}/>` + aa(60, 13.5, p.onFr, 7)
        + `<circle cx="60" cy="82" r="29" ${S(p.fr)}/><circle cx="60" cy="82" r="25.5" ${S('none', p.ed, 1, `opacity:${p.edOp}`)}/><circle cx="60" cy="82" r="23.5" ${S(p.ink)}/>`
        + (p.lk ? '' : `<path d="M44 67 C50 74 50 90 44 97 M76 67 C70 74 70 90 76 97" ${S('none', 'rgba(255,255,255,.12)', 1.6)}/>`)
        + num(s.n, 60, 82, p.nu, nsz(s.n, 28, 25, 20));
    },
    // months in a row: a cup, the number of months on it
    months(s, p) {
      return `<path d="M33 27 H21 V37 C21 49 29 56 39 58 M87 27 H99 V37 C99 49 91 56 81 58" ${S('none', p.fr, 4.5, RJ)}/>`
        + `<path d="M31 15 H89 V44 C89 64 77 77 60 79 C43 77 31 64 31 44 Z" ${S(p.ink, p.fr, 4, 'stroke-linejoin:round')}/>`
        + `<rect x="54" y="79" width="12" height="9" ${S(p.fr)}/><path d="M37 88 H83 L87 106 H33 Z" ${S(p.fr)}/>` + aa(60, 97.5, p.onFr, 8)
        + num(s.n, 60, 45, p.nu, nsz(s.n, 32, 28, 22));
    },
    // personal bests: a shield with the number on a rising triangle
    bests(s, p) {
      return `<path d="M20 11 H100 V79 L60 108 L20 79 Z" ${S('none', p.fr, 4.5, 'stroke-linejoin:round')}/><path d="M26 17 H94 V76 L60 101 L26 76 Z" ${S('none', p.ed, 1, `opacity:${p.edOp};stroke-linejoin:round`)}/>`
        + `<path d="M60 27 L89 74 H31 Z" ${S(p.ink, p.ink, 6, 'stroke-linejoin:round')}/>`
        + `<path d="M46 87 L60 95 L74 87" ${S('none', p.fr, 3.5, RJ)}/>`
        + num(s.n, 60, 59, p.nu, nsz(s.n, 24, 22, 17)) + aa(60, 70, p.lk ? GPAPER : p.aa, 6);
    },
    // comebacks that stuck: a hexagon
    comebacks(s, p) {
      return `<polygon points="${P(ring(6, 52))}" ${S('none', p.fr, 4.5, 'stroke-linejoin:round')}/><polygon points="${P(ring(6, 41))}" ${S(p.ink, p.ink, 3, 'stroke-linejoin:round')}/>`
        + `<path d="M41 44 L51 55 L75 36 M66 35.5 H75.5 V45" ${S('none', p.det, 3.2, RJ)}/>`
        + num(s.n, 60, 73, p.nu, 27) + aa(60, 92, p.lk ? GPAPER : p.aa, 6);
    },
    // a habit rung: a coin with its habit's glyph and a banner with I, II or III
    rung(s, p) {
      return `<circle cx="60" cy="52" r="43" ${S('none', p.fr, 4.5)}/><circle cx="60" cy="52" r="38.5" ${S('none', p.ed, 1, `opacity:${p.edOp}`)}/><circle cx="60" cy="52" r="35" ${S(p.ink)}/>`
        + `<g transform="translate(60 50) scale(1.45) translate(-12 -12)">${(GL[s.glyph] || GL.star)(p.lk ? GPAPER : p.nu, p.lk ? GHOST : p.bg)}</g>`
        + `<path d="M17 86 H103 L96 96 L103 106 H17 L24 96 Z" ${S(p.band, null, 0, 'stroke-linejoin:round')}/>`
        + `<text x="60" y="100.8" text-anchor="middle" style="${FONT};fill:${p.bandTx};font-size:15px;letter-spacing:1.5px">${s.rn}</text>`;
    },
    // months with Amir: a season ticket
    ticket(s, p) {
      const path = 'M16 28 H104 Q112 28 112 36 V52 A8 8 0 0 0 112 68 V84 Q112 92 104 92 H16 Q8 92 8 84 V68 A8 8 0 0 0 8 52 V36 Q8 28 16 28 Z';
      return `<path d="${path}" ${S('none', p.fr, 4, 'stroke-linejoin:round')}/><rect x="17" y="35" width="86" height="50" rx="5" ${S(p.ink)}/>`
        + `<path d="M41 39 V81" ${S('none', p.lk ? GPAPER : p.det, 1.4, 'stroke-dasharray:3 3;opacity:.75')}/>`
        + `<g transform="rotate(-90 29 60)">${aa(29, 60, p.lk ? GPAPER : p.aa, 9)}</g>`
        + num(s.n, 72, 55, p.nu, nsz(s.n, 30, 28, 22)) + word(+s.n === 1 ? 'MONTH' : 'MONTHS', 72, 78, 7, p.lk ? GPAPER : p.det, 1.4);
    },
    // a one-off: its frame, a solid object, one glyph (or a short word)
    trophy(s, p) {
      const k = s.frame || 'notch', cy = k === 'crest' || k === 'shield' ? 55 : 60;
      let o = frame(k, p);
      o += k === 'hex' ? `<polygon points="${P(ring(6, 41))}" ${S(p.ink, p.ink, 3, 'stroke-linejoin:round')}/>` : `<circle cx="60" cy="${cy}" r="${k === 'shield' ? 29 : 33}" ${S(p.ink)}/>`;
      if (s.text) return o + num(s.text, 60, cy, p.nu, s.text.length > 3 ? 17 : s.text.length > 2 ? 20 : 25);
      return o + `<g transform="translate(60 ${cy}) scale(1.5) translate(-12 -12)">${(GL[s.glyph] || GL.star)(p.lk ? GPAPER : p.nu, p.lk ? GHOST : p.bg)}</g>`;
    },
    gem(s, p) {
      let o = `<polygon points="${P(ring(8, 53, 60, 60, 22.5))}" ${S('none', p.fr, 4, 'stroke-linejoin:round')}/><polygon points="${P(ring(8, 47, 60, 60, 22.5))}" ${S('none', p.ed, 1, `opacity:${p.edOp};stroke-linejoin:round`)}/>`
        + `<path d="M40 34 H80 L96 52 L60 100 L24 52 Z" ${S(p.ink)}/>`;
      if (!p.lk) o += `<path d="M40 34 H60 L50 52 Z" style="fill:#fff;opacity:.42"/><path d="M60 34 H80 L70 52 Z" style="fill:#fff;opacity:.16"/><path d="M24 52 L40 34 L50 52 Z" style="fill:#fff;opacity:.3"/><path d="M80 34 L96 52 H70 Z" style="fill:#000;opacity:.12"/><path d="M24 52 H50 L60 100 Z" style="fill:#000;opacity:.06"/><path d="M70 52 H96 L60 100 Z" style="fill:#000;opacity:.25"/><path d="M50 52 H70 L60 100 Z" style="fill:#fff;opacity:.22"/>`;
      o += `<path d="M24 52 H96 M40 34 L50 52 L60 34 L70 52 L80 34 M50 52 L60 100 L70 52" ${S('none', p.lk ? GPAPER : 'rgba(255,255,255,.7)', 1.1, 'stroke-linejoin:round')}/>`;
      return o + (s.n ? num(s.n, 60, 43, p.lk ? GPAPER : '#FFFFFF', 12) : '');
    },
    rackets(s, p) {
      const det = p.lk ? GHOST : p.ink;
      const r = rot => `<g transform="rotate(${rot} 60 62)"><ellipse cx="60" cy="40" rx="13.5" ry="17.5" ${S('none', p.ink, 5)}/><path d="M54 27 V53 M60 24 V56 M66 27 V53 M48 34 H72 M47 40 H73 M48 46 H72" ${S('none', det, .9, 'opacity:.55')}/><path d="M60 58 V64" ${S('none', p.ink, 4)}/><rect x="56.3" y="63" width="7.4" height="27" rx="2.6" ${S(p.ink)}/></g>`;
      return frame('crest', p) + r(-30) + r(30) + `<circle cx="60" cy="98" r="5" ${S(p.acc)}/>`;
    },
    twox(s, p) {
      return frame('square', p) + `<circle cx="60" cy="60" r="34" ${S(p.ink)}/><path d="${ticks(28, 29, 32)}" ${S('none', p.det, 1.1, 'opacity:.6')}/>`
        + num('2×', 60, 57, p.nu, 30) + aa(60, 79, p.lk ? GPAPER : p.aa, 7);
    },
    spine(s, p) {
      let o = `<polygon points="60,5 99,26 99,94 60,115 21,94 21,26" ${S('none', p.fr, 4, 'stroke-linejoin:round')}/>`;
      for (let i = 0; i < 5; i++) {
        const y = 22 + i * 15.5, w = 20 + i * 5;
        o += `<path d="M${60 - w / 2 - 7} ${y + 5.5} H${60 + w / 2 + 7}" ${S('none', p.ink, 3.6, RC)}/><rect x="${60 - w / 2}" y="${y}" width="${w}" height="11" rx="4" ${S(p.ink)}/>`
          + `<path d="M${60 - w / 2 + 4} ${y + 2.6} H${60 + w / 2 - 4}" ${S('none', p.lk ? GPAPER : p.det, 1, 'stroke-linecap:round;opacity:.65')}/>`;
      }
      return o;
    },
    // a Grand Slam fortnight: the court from above, in its own surface
    court(s, p) {
      const surf = p.lk ? GHOST : ({ hard: U('A0-obj'), clay: U('A2-obj'), grass: U('A1-obj') })[s.surface];
      const ln = p.lk ? GPAPER : 'rgba(255,255,255,.88)';
      return frame('notch', p) + `<circle cx="60" cy="60" r="34" ${S(surf)}/>`
        + `<path d="M47 37 H73 V83 H47 Z M47 49 H73 M47 71 H73 M60 49 V71" ${S('none', ln, 1.4)}/><path d="M42 60 H78" ${S('none', ln, 2.6, RC)}/>`;
    },
    slam4(s, p) {
      const sf = { hard: U('A0-obj'), clay: U('A2-obj'), grass: U('A1-obj') };
      let o = frame('oct', p);
      [['hard', 41, 37], ['clay', 61, 37], ['grass', 41, 61], ['hard', 61, 61]].forEach(([k, x, y]) => {
        o += `<rect x="${x}" y="${y}" width="18" height="22" rx="2" ${S(p.lk ? GHOST : sf[k])}/><path d="M${x + 3} ${y + 3} H${x + 15} V${y + 19} H${x + 3} Z M${x + 1.5} ${y + 11} H${x + 16.5}" ${S('none', p.lk ? GPAPER : 'rgba(255,255,255,.85)', .9)}/>`;
      });
      return o;
    },
  };

  // ── the catalogue → emblem (career/achievements.toml and badges.toml ids; the 33 of rulebook v11 are marked v11) ──
  // sec: the cabinet's section · fam: the drawing · n: the number on it · tier: the step (a one-off's comes from its XP: stepOf())
  const stepOf = xp => xp >= 1000 ? 4 : xp >= 700 ? 3 : xp >= 400 ? 2 : xp >= 150 ? 1 : 0;
  const sessTier = n => n <= 7 ? 0 : n <= 25 ? 1 : n <= 50 ? 2 : n <= 200 ? 3 : 4;
  const weekTier = n => n <= 2 ? 0 : n <= 4 ? 1 : n <= 6 ? 2 : 3;
  const monthTier = m => m <= 3 ? 1 : m <= 5 ? 2 : m <= 7 ? 3 : 4;
  const bestTier = n => n <= 3 ? 0 : n <= 10 ? 1 : n <= 25 ? 2 : n <= 75 ? 3 : 4;
  const CAT = {};
  const put = (id, o) => { CAT[id] = o; };
  // Sessions (the sessions with Amir, as Century counts them; FIRST BLOOD and THE MACHINIST count the WORKOUT habit's days)
  put('first_blood', { sec: 'sessions', fam: 'sessions', n: 1, tier: 0, order: 1 });
  [3, 5, 7, 10, 15, 20, 30, 40, 75, 300, 400].forEach(n => put('sessions_' + n, { sec: 'sessions', fam: 'sessions', n, tier: sessTier(n), order: n, v11: true }));
  put('the_machinist', { sec: 'sessions', fam: 'sessions', n: 150, tier: 3, order: 150 });
  // Weeks in a row (medals) and months in a row (cups: a month is four held weeks)
  put('held', { sec: 'weeks', fam: 'weeks', n: 1, tier: 0, order: 1 });
  put('back_to_back', { sec: 'weeks', fam: 'weeks', n: 2, tier: 0, order: 2 });
  [3, 5, 6, 7].forEach(n => put('weeks_' + n, { sec: 'weeks', fam: 'weeks', n, tier: weekTier(n), order: n, v11: true }));
  [[4, 16], [5, 20], [7, 28], [9, 36]].forEach(([m, w]) => put('months_' + m, { sec: 'months', fam: 'months', n: m, weeks: w, tier: monthTier(m), order: w, v11: true }));
  // Getting stronger
  put('first_best', { sec: 'stronger', fam: 'bests', n: 1, tier: 0, order: 1 });
  [3, 15, 75].forEach(n => put('bests_' + n, { sec: 'stronger', fam: 'bests', n, tier: bestTier(n), order: n, v11: true }));
  put('moving_up', { sec: 'stronger', fam: 'trophy', frame: 'shield', glyph: 'arrowUp', xp: 100, order: 1001 });
  put('rematch_won', { sec: 'stronger', fam: 'rackets', xp: 300, order: 1002 });
  put('all_court', { sec: 'stronger', fam: 'trophy', frame: 'crest', glyph: 'allcourt', xp: 400, order: 1003 });
  put('double_up', { sec: 'stronger', fam: 'twox', xp: 500, order: 1004 });
  put('the_proving_ground', { sec: 'stronger', fam: 'trophy', frame: 'crest', glyph: 'target', xp: 600, order: 1005 });
  // Comebacks
  put('rebound', { sec: 'comebacks', fam: 'trophy', frame: 'hex', glyph: 'bounce', xp: 100, order: 1001 });
  put('back', { sec: 'comebacks', fam: 'trophy', frame: 'hex', glyph: 'door', xp: 100, order: 1002 });
  put('kept_going', { sec: 'comebacks', fam: 'trophy', frame: 'hex', glyph: 'rain', xp: 300, order: 1003 });
  put('all_the_way_back', { sec: 'comebacks', fam: 'trophy', frame: 'hex', glyph: 'uturn', xp: 400, order: 1004 });
  put('back_in_the_fight_1', { sec: 'comebacks', fam: 'rung', glyph: 'fight', rn: 'I', tier: 0, order: 1005 });
  put('back_in_the_fight_2', { sec: 'comebacks', fam: 'rung', glyph: 'fight', rn: 'II', tier: 1, order: 1006 });
  put('backbone', { sec: 'comebacks', fam: 'spine', xp: 700, order: 1007 });
  // Habits: the ladders, then the habit one-offs
  const LADDERS = [
    ['water', ['full_tank', 'human_sprinkler_2', 'human_sprinkler_3']], ['sleep', ['lights_out', 'blackout_artist_2', 'blackout_artist_3']],
    ['food', ['well_fed', 'fully_fuelled_2', 'fully_fuelled_3']], ['steps', ['on_your_feet', 'ground_covered_2', 'ground_covered_3']],
    ['link', ['week_that_counted', 'thirty_days_running', 'unbroken_3']], ['sweep', ['complete_day', 'ten_complete_days', 'clean_sweep_3']],
    ['sunrise', ['dawn_patrol_1', 'dawn_patrol_2', 'dawn_patrol_3']], ['target', ['on_target_1', 'on_target_2', 'on_target_3']], ['dumbbell', ['heavy_metal_1', 'heavy_metal_2']],
  ];
  LADDERS.forEach(([glyph, ids], li) => ids.forEach((id, i) => put(id, { sec: 'habits', fam: 'rung', glyph, rn: ['I', 'II', 'III'][i], tier: i, order: li * 10 + i, ladder: glyph })));
  put('full_stack', { sec: 'habits', fam: 'trophy', frame: 'oct', glyph: 'stack', xp: 200, order: 1001 });
  put('quarter_million', { sec: 'habits', fam: 'trophy', frame: 'notch', text: '250K', xp: 400, order: 1002 });
  put('the_foundry', { sec: 'habits', fam: 'trophy', frame: 'oct', glyph: 'anvil', xp: 500, order: 1003 });
  put('bedrock', { sec: 'habits', fam: 'trophy', frame: 'oct', glyph: 'rock', xp: 500, order: 1004 });
  put('cold_blood', { sec: 'habits', fam: 'trophy', frame: 'oct', glyph: 'snow', xp: 600, order: 1005 });
  put('still_standing', { sec: 'habits', fam: 'trophy', frame: 'oct', glyph: 'flag', xp: 600, order: 1006 });
  put('million_steps', { sec: 'habits', fam: 'trophy', frame: 'notch', text: '1M', xp: 1000, order: 1007 });
  put('the_centurion', { sec: 'habits', fam: 'gem', n: 100, xp: 1200, order: 1008 });
  // With Amir: a ticket
  put('month_one', { sec: 'amir', fam: 'ticket', n: 1, tier: 0, order: 1, v11: true });
  put('season_ticket', { sec: 'amir', fam: 'ticket', n: 3, tier: 1, order: 3 });
  put('half_year', { sec: 'amir', fam: 'ticket', n: 6, tier: 2, order: 6 });
  put('year_one', { sec: 'amir', fam: 'ticket', n: 12, tier: 3, order: 12 });
  put('year_two', { sec: 'amir', fam: 'ticket', n: 24, tier: 4, order: 24, v11: true });
  // Trophies: cycles, the log, and the calendar
  put('first_cycle', { sec: 'trophies', fam: 'trophy', frame: 'crest', glyph: 'cycle', xp: 300, order: 1 });
  put('by_the_book', { sec: 'trophies', fam: 'trophy', frame: 'crest', glyph: 'book', xp: 500, order: 2 });
  put('flawless', { sec: 'trophies', fam: 'gem', xp: 300, order: 3 });
  put('the_distance', { sec: 'trophies', fam: 'trophy', frame: 'crest', glyph: 'road', xp: 1000, order: 4 });
  put('full_month', { sec: 'trophies', fam: 'trophy', frame: 'square', glyph: 'calendar', xp: 400, order: 5 });
  put('every_rep_counted', { sec: 'trophies', fam: 'trophy', frame: 'notch', glyph: 'tally', xp: 50, order: 6 });
  put('the_notebook', { sec: 'trophies', fam: 'trophy', frame: 'square', glyph: 'notebook', xp: 200, order: 7 });
  put('straight_talk', { sec: 'trophies', fam: 'trophy', frame: 'notch', glyph: 'bubble', xp: 150, order: 8 });
  put('extra_mile', { sec: 'trophies', fam: 'trophy', frame: 'notch', text: '+1', xp: 100, order: 9 });
  put('extra_innings', { sec: 'trophies', fam: 'trophy', frame: 'notch', text: '+5', xp: 300, order: 10 });
  put('clean_sheet', { sec: 'trophies', fam: 'trophy', frame: 'notch', glyph: 'treble', xp: 50, order: 11 });
  put('down_under', { sec: 'trophies', fam: 'court', surface: 'hard', xp: 150, order: 21, v11: true });
  put('red_clay', { sec: 'trophies', fam: 'court', surface: 'clay', xp: 150, order: 22, v11: true });
  put('the_lawns', { sec: 'trophies', fam: 'court', surface: 'grass', xp: 150, order: 23, v11: true });
  put('big_apple', { sec: 'trophies', fam: 'court', surface: 'hard', xp: 150, order: 24, v11: true });
  put('calendar_slam', { sec: 'trophies', fam: 'slam4', xp: 1000, order: 25, v11: true });
  put('nowruz', { sec: 'trophies', fam: 'trophy', frame: 'notch', glyph: 'sprout', xp: 150, order: 26, v11: true });
  put('yalda', { sec: 'trophies', fam: 'trophy', frame: 'notch', glyph: 'pomegranate', xp: 150, order: 27, v11: true });
  put('early_bird', { sec: 'trophies', fam: 'trophy', frame: 'notch', glyph: 'sunrise', xp: 100, order: 28, v11: true });
  put('night_owl', { sec: 'trophies', fam: 'trophy', frame: 'notch', glyph: 'moonstar', xp: 100, order: 29, v11: true });
  Object.keys(CAT).forEach(id => { const c = CAT[id]; if (c.tier == null) c.tier = stepOf(c.xp || 0); c.id = id; });

  // The four marks (badges.toml), tier by tier, placed in the same sections as Nike's ladders
  const MARKS = {
    century: [25, 50, 100, 200, 500].map(n => ({ sec: 'sessions', fam: 'sessions', n, tier: sessTier(n), order: n })),
    held_weeks: [[4, 'weeks', 4], [8, 'months', 2], [12, 'months', 3], [24, 'months', 6], [52, 'months', 12]].map(([w, sec, n]) => ({ sec, fam: sec, n, weeks: w, tier: sec === 'weeks' ? weekTier(n) : monthTier(n), order: w })),
    bests: [5, 10, 25, 50, 100].map(n => ({ sec: 'stronger', fam: 'bests', n, tier: bestTier(n), order: n })),
    comebacks: [[3, 1], [5, 2], [10, 4]].map(([n, tier]) => ({ sec: 'comebacks', fam: 'comebacks', n, tier, order: n })),
  };

  const SECTIONS = [
    { k: 'sessions', t: 'Sessions' }, { k: 'weeks', t: 'Weeks in a row', group: 'streaks' }, { k: 'months', t: 'Months in a row', group: 'streaks' },
    { k: 'stronger', t: 'Getting stronger' }, { k: 'comebacks', t: 'Comebacks' }, { k: 'habits', t: 'Habits' }, { k: 'amir', t: 'With Amir' }, { k: 'trophies', t: 'Trophies' },
  ];

  function svgWrap(inner, label) {
    ensureDefs();
    const l = String(label || '').replace(/[<>&"]/g, '');
    return `<svg class="aae" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"${l ? ` role="img" aria-label="${l}"` : ' aria-hidden="true"'}>${inner}</svg>`;
  }
  function drawSpec(spec, won, label) {
    const fn = DRAW[spec.fam] || DRAW.trophy;
    return svgWrap(fn(spec, pal(spec.tier, won)), label);
  }
  const FALLBACK = { fam: 'trophy', frame: 'notch', glyph: 'star', tier: 0 };

  // ── the level medal: direction C's struck medal, a new design every ten levels ──
  const LVD = [
    { r: '1–9', rim: 'C0-cn', face: 'C0-cf', rel: 'C0-nu', d: '#6A6359', h: '#FFFFFF', line: '#7A7266', edge: 'plain', tails: ['#D8D1C5', INK], name: 'Chalk' },
    { r: '10–19', rim: 'C1-cn', face: 'C1-cf', rel: 'C1-nu', d: '#000000', h: '#9A9A9A', line: '#000000', edge: 'reeded', tails: [INK, PAPER], name: 'Slate' },
    { r: '20–29', rim: 'C2-cn', face: 'C2-cf', rel: 'C2-nu', d: '#021610', h: '#BFE6D2', line: '#021610', edge: 'beaded', tails: [GREEN, PAPER], name: 'Green glaze' },
    { r: '30–39', rim: 'C3-cn', face: 'C3-cf', rel: 'C3-nu', d: '#5A1E0B', h: '#FFE0D2', line: '#5A1E0B', edge: 'notched', tails: [CLAY, PAPER], name: 'Terracotta' },
    { r: '40–49', rim: 'C3-cn', face: 'C2-cf', rel: 'C4-nu', d: '#021610', h: '#FFFFFF', line: '#5A1E0B', edge: 'laurel', tails: [GREEN, CLAY], name: 'Glazed' },
    { r: '50–59', rim: 'C3-cn', face: 'C1-cf', rel: 'C3-nu', d: '#000000', h: '#FFE0D2', line: '#5A1E0B', edge: 'reeded', extra: 'star', tails: [INK, CLAY], name: 'Night' },
    { r: '60–69', rim: 'C0-cn', face: 'C2-cf', rel: 'C4-nu', d: '#021610', h: '#FFFFFF', line: '#7A7266', edge: 'beaded', extra: 'court', tails: [GREEN, PAPER], name: 'Court' },
    { r: '70–79', rim: 'C3-cn', face: 'C0-cf', rel: 'L-clay', d: '#5A1E0B', h: '#FFFFFF', line: '#5A1E0B', edge: 'scallop', tails: [CLAY, GREEN], name: 'Rosette' },
    { r: '80–89', rim: 'C1-cn', face: 'C1-cf', rel: 'C0-nu', d: '#000000', h: '#FFFFFF', line: '#000000', edge: 'wreath', tails: [INK, CLAY], name: 'Wreath' },
    { r: '90–99', rim: 'C3-cn', face: 'C0-cf', rel: 'L-clay', d: '#5A1E0B', h: '#FFFFFF', line: '#5A1E0B', edge: 'beaded', extra: 'sun', tails: [CLAY, PAPER], name: 'Sunburst' },
    { r: '100+', rim: 'C3-cn', face: 'C2-cf', rel: 'C4-nu', d: '#021610', h: '#FFFFFF', line: '#5A1E0B', edge: 'wreath', extra: 'stars', tails: [GREEN, CLAY], name: 'Centenary' },
  ];
  function debossed(r, cx, cy) {
    const a = (deg, rr) => [cx + rr * Math.cos(deg * Math.PI / 180), cy + rr * Math.sin(deg * Math.PI / 180)].map(v => v.toFixed(1)).join(' ');
    return `<circle cx="${cx}" cy="${cy}" r="${r}" ${S(GHOST)}/><path d="M${a(135, r - 1.6)}A${r - 1.6} ${r - 1.6} 0 0 1 ${a(315, r - 1.6)}" ${S('none', GHOST_DK, 3.2)}/><path d="M${a(315, r - 1.4)}A${r - 1.4} ${r - 1.4} 0 0 1 ${a(135, r - 1.4)}" ${S('none', GPAPER, 2.2, 'opacity:.8')}/>`;
  }
  function levelInner(L, won) {
    L = Math.max(1, Math.floor(+L || 1));
    const D = LVD[Math.min(10, Math.floor(L / 10))], cx = 60, cy = 50;
    const wreath = D.edge === 'wreath', R = wreath ? 38 : 44, F = R - 10;
    const tl = 'M46 84 L36 116 L45 110 L51 117 L58 88 Z', tr = 'M74 84 L84 116 L75 110 L69 117 L62 88 Z';
    const ns = String(L).length > 2 ? 23 : String(L).length > 1 ? 29 : 33;
    if (!won) return `<path d="${tl} ${tr}" ${S(GHOST)}/>` + debossed(44, cx, cy) + `<g style="opacity:.8">${num(L, cx, cy, GHOST_DK, ns)}</g>`;
    let o = `<path d="${tl}" ${S(D.tails[0])}/><path d="M43 94 L52 88" ${S('none', D.tails[1], 2.6)}/><path d="${tr}" ${S(D.tails[0])}/><path d="M77 94 L68 88" ${S('none', D.tails[1], 2.6)}/>`;
    if (wreath) for (const side of [-1, 1]) for (let i = 0; i < 9; i++) {
      const a = 90 + side * (18 + i * 17.5), x = cx + 43.5 * Math.cos(a * Math.PI / 180), y = cy + 43.5 * Math.sin(a * Math.PI / 180);
      o += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="2.6" ry="6" transform="rotate(${(a + 90 + side * 22).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" ${S(CLAY, '#7E2F15', .6)}/>`;
    }
    if (D.edge === 'scallop') o += ring(22, R - 3, cx, cy).map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6.2" ${S(U(D.rim), D.line, .6)}/>`).join('') + `<circle cx="${cx}" cy="${cy}" r="${R - 3}" ${S(U(D.rim))}/>`;
    else o += `<circle cx="${cx}" cy="${cy}" r="${R}" ${S(U(D.rim), D.line, .8)}/>`;
    const band = (R + F) / 2;
    if (D.edge === 'plain') o += `<circle cx="${cx}" cy="${cy}" r="${band}" ${S('none', D.h, .8, 'opacity:.6')}/>`;
    if (D.edge === 'reeded') o += `<path d="${ticks(84, F + 2, R - 1, cx, cy)}" ${S('none', D.line, .9, 'opacity:.45')}/>`;
    if (D.edge === 'beaded') o += ring(26, band, cx, cy).map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.7" ${S(D.h, D.line, .4)}/>`).join('');
    if (D.edge === 'notched') o += ring(12, R - 1.5, cx, cy).map(([x, y], i) => `<path d="M0 -3.2 L3.4 2.8 H-3.4 Z" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${i * 30 + 180})" ${S(D.line, null, 0, 'opacity:.55')}/>`).join('');
    if (D.edge === 'laurel') for (const side of [-1, 1]) for (let i = 0; i < 5; i++) { const a = 90 + side * (16 + i * 15), x = cx + band * Math.cos(a * Math.PI / 180), y = cy + band * Math.sin(a * Math.PI / 180); o += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="1.7" ry="3.8" transform="rotate(${(a + 90).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" ${S(D.h, D.line, .4)}/>`; }
    o += `<circle cx="${cx}" cy="${cy}" r="${F}" ${S(U(D.face), 'rgba(0,0,0,.3)', 1.2)}/><circle cx="${cx}" cy="${cy}" r="${F - 2.6}" ${S('none', D.h, .7, 'opacity:.45')}/>`;
    if (D.extra === 'court') o += `<path d="M48 ${cy - 22} H72 V${cy + 22} H48 Z M48 ${cy - 11} H72 M48 ${cy + 11} H72 M60 ${cy - 11} V${cy + 11}" ${S('none', '#BFE6D2', .9, 'opacity:.5')}/><path d="M45 ${cy} H75" ${S('none', '#BFE6D2', 1.6, 'opacity:.6')}/>`;
    if (D.extra === 'sun') o += Array.from({ length: 24 }, (_, i) => { const a1 = i * 15 * Math.PI / 180, a2 = (i * 15 + 6) * Math.PI / 180; return `<path d="M${cx} ${cy}L${(cx + F * Math.cos(a1)).toFixed(1)} ${(cy + F * Math.sin(a1)).toFixed(1)}L${(cx + F * Math.cos(a2)).toFixed(1)} ${(cy + F * Math.sin(a2)).toFixed(1)}Z" ${S(CLAY, null, 0, 'opacity:.13')}/>`; }).join('');
    const star = (x, y, r, col) => `<path d="${Array.from({ length: 10 }, (_, i) => { const rr = i % 2 ? r * .45 : r, a = (-90 + i * 36) * Math.PI / 180; return (i ? 'L' : 'M') + (x + rr * Math.cos(a)).toFixed(1) + ' ' + (y + rr * Math.sin(a)).toFixed(1); }).join('')}Z" ${S(col)}/>`;
    const stars = D.extra === 'star' ? 1 : D.extra === 'stars' ? Math.min(5, Math.max(1, Math.floor(L / 100))) : 0;
    const draw = col => num(L, cx, cy + 1, col, ns) + word('LEVEL', cx, cy + 20, 5.6, col, 1.4)
      + Array.from({ length: stars }, (_, i) => star(cx + (i - (stars - 1) / 2) * 10, cy - 19, 4.2, col)).join('');
    return o + `<g transform="translate(1 1.3)" style="opacity:.6">${draw(D.d)}</g><g transform="translate(-.7 -.8)" style="opacity:.9">${draw(D.h)}</g>${draw(U(D.rel))}`;
  }

  // ── the month's honours: legendary, one of a kind (Amir, 2026-10-25: "any honour should be like a legendary trophy which is very unique";
  //    direction A of https://claude.ai/artifact/9JYRa93PVAYZSH4pRw2rhs, The Grand Cup): Champion's cup, a crown of three clay stars, a clay laurel,
  //    the honour's own sign on the cup and its month on a clay banner. kind: sessions · improved · full_month · pick; month "2026-10".
  const HON_SIGN = {
    sessions: c => [0, 1, 2, 3].map(i => `<rect x="44" y="${66 - i * 8}" width="32" height="6" rx="3" ${S(c)}/>`).join('') + `<rect x="58" y="26" width="4" height="46" rx="2" ${S(c)}/>`,
    improved: c => `<path d="M38 72 L52 56 L60 64 L80 40" ${S('none', c, 5, RJ)}/><path d="M68 38 H82 V52" ${S('none', c, 5, RJ)}/>`,
    full_month: (c, bg) => `<rect x="38" y="32" width="44" height="40" rx="5" ${S(c)}/><path d="M38 42 H82" ${S('none', bg, 2)}/>` + Array.from({ length: 12 }, (_, i) => `<path d="M${44 + (i % 4) * 10} ${49 + Math.floor(i / 4) * 8} l2 2 4-4" ${S('none', bg, 1.6, RJ)}/>`).join(''),
    pick: c => `<text x="60" y="66" text-anchor="middle" style="${FONT};fill:${c};font-size:30px;letter-spacing:1px">AA</text>` + hstar(60, 33, 7, c),
  };
  function hstar(x, y, r, col) { return `<path d="${Array.from({ length: 10 }, (_, i) => { const rr = i % 2 ? r * .45 : r, a = (-90 + i * 36) * Math.PI / 180; return (i ? 'L' : 'M') + (x + rr * Math.cos(a)).toFixed(1) + ' ' + (y + rr * Math.sin(a)).toFixed(1); }).join('')}Z" ${S(col)}/>`; }
  const MON3 = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  function honourInner(kind, month, won) {
    const m = /^(\d{4})-(\d{2})/.exec(String(month || '')), label = m ? MON3[Number(m[2]) - 1] + ' ' + m[1] : '';
    const sign = HON_SIGN[kind] || HON_SIGN.pick;
    let laurel = '';
    for (const side of [-1, 1]) for (let i = 0; i < 8; i++) {
      const a = 90 + side * (20 + i * 130 / 7), x = 60 + 49 * Math.cos(a * Math.PI / 180), y = 54 + 49 * Math.sin(a * Math.PI / 180);
      laurel += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="2.5" ry="5.6" transform="rotate(${(a + 90 + side * 24).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" ${S(won ? CLAY : GHOST, won ? '#7E2F15' : null, .5)}/>`;
    }
    const fr = won ? U('A4-fr') : GHOST, obj = won ? U('A4-obj') : GHOST, nu = won ? U('A4-nu') : GPAPER, cl = won ? CLAY : GHOST;
    return laurel
      + `<path d="M34 26 H22 V36 C22 48 30 55 40 57 M86 26 H98 V36 C98 48 90 55 80 57" ${S('none', fr, 5, RJ)}/>`
      + `<path d="M30 16 H90 V44 C90 66 77 80 60 82 C43 80 30 66 30 44 Z" ${S(obj, fr, 4.5, 'stroke-linejoin:round')}/>`
      + `<g transform="translate(60 49) scale(.78) translate(-60 -52)">${sign(nu, won ? '#0B3D2C' : GHOST)}</g>`
      + `<rect x="53" y="82" width="14" height="8" ${S(fr)}/>`
      + `<path d="M24 90 H96 L90 100 L96 110 H24 L30 100 Z" ${S(cl, won ? '#7E2F15' : null, .8)}/>`
      + (label ? `<text x="60" y="104.5" text-anchor="middle" style="${FONT};fill:${won ? '#fff' : GPAPER};font-size:12px;letter-spacing:1.5px">${label}</text>` : '')
      + hstar(42, 8, 4.5, cl) + hstar(60, 5, 6, cl) + hstar(78, 8, 4.5, cl);
  }

  window.AAEmblem = {
    /** A month's honour, legendary (kind: sessions · improved · full_month · pick; month "YYYY-MM"). opts: { won } (default true) */
    honour(kind, month, opts) { const o = opts || {}; return svgWrap(honourInner(kind, month, o.won !== false), o.label); },
    /** An achievement by its catalogue id. opts: { won: bool, label: string } */
    ach(id, opts) { const o = opts || {}, c = CAT[id] || FALLBACK; return drawSpec(c, !!o.won, o.label); },
    /** One tier of a mark (badges.toml id: century, held_weeks, bests, comebacks; tierIndex from 0). */
    mark(markId, tierIndex, opts) { const o = opts || {}, t = (MARKS[markId] || [])[tierIndex | 0]; return drawSpec(t || FALLBACK, !!o.won, o.label); },
    /** The level medal: the level's own number on its decade's design. opts: { won } (default true) */
    level(L, opts) { const o = opts || {}; return svgWrap(levelInner(L, o.won !== false), o.label || ('Level ' + L)); },
    /** Where an achievement sits: { sec, fam, tier, order, n, v11 } or null for an id the cabinet does not know. */
    info(id) { return CAT[id] ? Object.assign({}, CAT[id]) : null; },
    markInfo(markId, tierIndex) { const t = (MARKS[markId] || [])[tierIndex | 0]; return t ? Object.assign({}, t) : null; },
    markTiers(markId) { return (MARKS[markId] || []).length; },
    SECTIONS: SECTIONS.map(s => Object.assign({}, s)),
    stepName(i) { return (STEPS[i | 0] || STEPS[0]).name; },
    /** The Latest card's ground for a step: [light, dark] stops and the text colour on it. */
    ground(i) { const t = STEPS[Math.max(0, Math.min(4, i | 0))]; return { css: `radial-gradient(120% 90% at 30% 20%, ${t.ground[0]}, ${t.ground[1]})`, text: t.gTx }; },
    LEVEL_STEPS: LVD.map((d, i) => ({ from: i === 0 ? 1 : i * 10, range: d.r, name: d.name })),
    ensureDefs,
  };
})();
