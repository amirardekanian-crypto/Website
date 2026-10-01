/* cells.js — the cell grid and its paper: Bullseye, Quarter Turn, Pills, Gravity (shot 3), and Paper.
 *
 * The grid is 16 x 9 cells on paper. Every cell is ONE rounded rectangle whose size, corner radii, rotation and colour are mixed
 * between four poses, one per beat, each wave starting from a different place:
 *   bullseye       a target of dots           popping in from the centre
 *   quarter-turn   quarter-circle tiles       a wave from the centre; each tile spins to its own quarter turn
 *   pills          bars of different lengths  a wave from the left; then the rows slide against each other
 *   gravity        one disc                   collapsing from the outside in
 * A cell's state is the chain of those mixes, so the four moves cannot be drawn apart from each other: they are ONE piece, `cells`,
 * and each Menu name is that piece with `phases` set (the way squash and hop are the ball). A phase draws while it is the current one:
 * bullseye before the quarter turn starts, quarter-turn until the pills start, and so on. List all four, one after another, and you
 * get the whole shot; list one and you get just that move. Paper is the background and is its own piece.
 * With no params each one draws exactly what shot 3 of the reel drew.
 */
(function (g) {
  'use strict';
  const L = g.L, KIT = g.KIT, { PAL, E, clamp, prog, hash, hex } = L;
  const BEAT = .46875;                                       // one beat at 128 bpm (s)
  const PHASES = ['bullseye', 'quarter-turn', 'pills', 'gravity'];

  /* pose = [cx, cy, w, h, rot, rtl, rtr, rbr, rbl, r, g, b] */
  const pose = (cx, cy, w, h, rot, rad, col) => [cx, cy, w, h, rot, rad[0], rad[1], rad[2], rad[3], col[0], col[1], col[2]];
  const mixPose = (a, b, p) => { const o = new Array(12); for (let i = 0; i < 12; i++) o[i] = a[i] + (b[i] - a[i]) * p; return o; };

  /* the cells: each one's five poses and when its wave reaches it. Built once per set of params (in warm). */
  const built = new Map();
  const tableKey = p => JSON.stringify([p.cols, p.rows, p.size, p.dot, p.rings, p.ringStep, p.tiles, p.bars, p.barColors, p.disc, p.discR, KIT.val(p.center)]);
  function table(p) {
    const key = tableKey(p);
    let cells = built.get(key);
    if (cells) return cells;
    const S = p.size, cols = p.cols, rows = p.rows, center = KIT.val(p.center);
    const rings = p.rings.map(hex), tiles = p.tiles.map(hex), barCol = p.barColors.map(hex), disc = hex(p.disc);
    const mx = (cols - 1) / 2, my = (rows - 1) / 2, mid = cols * S / 2, reach = Math.hypot(mx, my) + .8;
    cells = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c, cx = S / 2 + c * S, cy = S / 2 + r * S;
      const d = Math.hypot(c - mx, r - my);                                  // distance from the centre, in cells
      const ring = rings[Math.floor(d / p.ringStep) % rings.length];
      const A = pose(cx, cy, p.dot, p.dot, 0, [p.dot / 2, p.dot / 2, p.dot / 2, p.dot / 2], ring);
      const Z = pose(cx, cy, 0, 0, 0, [0, 0, 0, 0], ring);
      const k = Math.floor(hash(i, 7) * 4);
      const qcol = tiles[(c + 2 * r) % tiles.length];
      const B = pose(cx, cy, S, S, k * Math.PI / 2, [S, 0, 0, 0], qcol);

      // pose C: this cell's slice of its row's bar (cells outside the bar shrink into the nearest end)
      const len = p.bars[Math.min(r, p.bars.length - 1)], x0 = mid - len * S / 2, x1 = mid + len * S / 2, bc = barCol[Math.min(r, barCol.length - 1)];
      const a = Math.max(c * S, x0), b = Math.min((c + 1) * S, x1);
      let C;
      if (b > a) {
        const first = a === x0, last = b === x1, rr = p.dot / 2;
        C = pose((a + b) / 2, cy, b - a + 1.5, p.dot, 0, [first ? rr : 0, last ? rr : 0, last ? rr : 0, first ? rr : 0], bc);
      } else {
        const ex = cx < mid ? x0 : x1;
        C = pose(ex, cy, 0, p.dot, 0, [0, 0, 0, 0], bc);
      }
      const D = pose(center[0], center[1], p.discR * 2, p.discR * 2, 0, [p.discR, p.discR, p.discR, p.discR], disc);
      cells.push({
        c, r, Z, A, B, C, D,
        dA: d * .012, dB: d * .009, dC: c * .006 + Math.abs(r - my) * .003, dD: (reach - d) * .007,
        dir: r % 2 ? 1 : -1,
      });
    }
    built.set(key, cells);
    return cells;
  }

  function drawCell(ctx, s, shift) {
    const w = s[2], h = s[3];
    if (w < .6 || h < .6) return;
    ctx.save();
    ctx.translate(s[0] + shift, s[1]);
    if (s[4]) ctx.rotate(s[4]);
    ctx.fillStyle = `rgb(${s[9] | 0},${s[10] | 0},${s[11] | 0})`;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, [Math.max(0, s[5]), Math.max(0, s[6]), Math.max(0, s[7]), Math.max(0, s[8])]);
    ctx.fill();
    ctx.restore();
  }

  KIT.piece('cells', {
    group: 'shapes',
    doc: 'A grid of cells that turns into dots, quarter circles, bars and then one disc. Each Menu move is one phase of it.',
    defaults: {
      at: 0, phases: PHASES, beat: BEAT, lead: [.06, .04, .04, .06],
      cols: 16, rows: 9, size: 120, dot: 96,
      rings: [PAL.coral, PAL.ink, PAL.cobalt], ringStep: 1.5, speed: 1,
      tiles: [PAL.coral, PAL.ink, PAL.ink, PAL.cobalt, PAL.ink],
      bars: [7, 10, 12, 14, 16, 14, 12, 10, 7], barColors: [PAL.cobalt, PAL.coral, PAL.ink, PAL.coral, PAL.cobalt, PAL.coral, PAL.ink, PAL.coral, PAL.cobalt], shift: 64,
      center: [960, 540], disc: PAL.cobalt, discR: 170, publish: 'disc',
    },
    params: {
      at: 'start of the clock the beats below are counted on (s)', phases: 'which moves to draw: bullseye, quarter-turn, pills, gravity', beat: 'length of a beat (s): the poses land on beats 0, 1, 2 and 3',
      lead: 'how early (s) each pose lands before its beat, so it feels exactly on it: [bullseye, quarter-turn, pills, gravity]',
      cols: 'cells across', rows: 'cells down', size: 'width and height of one cell (px)', dot: 'diameter of a dot and thickness of a bar (px)',
      rings: 'colours of the rings of dots, from the centre out', ringStep: 'width of a ring, in cells', speed: 'how fast the dots pop in (1 is the reel)',
      tiles: 'colours of the quarter-circle tiles, handed out across the grid', bars: 'length of the bar in each row, in cells', barColors: 'colour of the bar in each row', shift: 'how far the rows slide against each other (px)',
      center: 'where everything collapses to: [x, y], or a function giving it', disc: 'colour of the disc', discR: 'radius of the disc (px)', publish: 'name the disc position is published under, for a scene change to find',
    },
    warm(p) { table(p); if (p.publish && p.phases.indexOf('gravity') >= 0) { const c = KIT.val(p.center); KIT.mark(p.publish, { x: c[0], y: c[1], r: p.discR }); } },
    warmKey: p => tableKey(p),
    cues(p) {
      const has = n => p.phases.indexOf(n) >= 0, out = [];
      if (has('bullseye')) {
        out.push({ dt: p.beat * 0, hit: .6, props: { pop: 1 } });
        for (let k = 0; k < 8; k++) out.push({ dt: k * .035, kind: 'arp', props: { k } });
      }
      if (has('quarter-turn')) out.push({ dt: p.beat * 1, hit: .5, props: { i: 1 } });
      if (has('pills')) out.push({ dt: p.beat * 2, hit: .5, props: { i: 2 } });
      if (has('gravity')) out.push({ dt: (p.beat * 3 - p.lead[3]) - .1, kind: 'whoosh', props: { dir: 'in', dur: .5 } });   // the collapse into the disc
      return out;
    },
    draw(ctx, t, p) {
      const T_A = p.beat * 0 - p.lead[0], T_B = p.beat * 1 - p.lead[1], T_C = p.beat * 2 - p.lead[2], T_D = p.beat * 3 - p.lead[3];   // when each pose lands
      const tt = t - p.at, now = tt >= T_D ? 3 : tt >= T_C ? 2 : tt >= T_B ? 1 : 0;
      if (p.phases.indexOf(PHASES[now]) < 0) return;
      const sp = p.speed, slide = E.inOutCubic(prog(tt, T_C + .1, .36));         // pose C: rows slide against each other
      for (const k of table(p)) {
        const pA = E.outBack(prog(tt - k.dA / sp, T_A, .24 / sp), 1.7);
        const pB = E.outBack(prog(tt - k.dB, T_B, .26), 1.35);
        const pC = E.outBack(prog(tt - k.dC, T_C, .26), 1.25);
        const pD = E.inOutCubic(prog(tt - k.dD, T_D, .28));
        let s = mixPose(k.Z, k.A, pA);
        if (pB > 0) s = mixPose(s, k.B, pB);
        if (pC > 0) s = mixPose(s, k.C, pC);
        if (pD > 0) s = mixPose(s, k.D, pD);
        drawCell(ctx, s, k.dir * p.shift * slide * (1 - pD));
      }
    },
  });
  KIT.alias('bullseye', 'cells', { phases: ['bullseye'] }, 'Rings of dots pop in from the centre.');
  KIT.alias('quarter-turn', 'cells', { phases: ['quarter-turn'] }, 'Dots turn into a pattern of quarter circles.');
  KIT.alias('pills', 'cells', { phases: ['pills'] }, 'Tiles merge into bars that slide against each other.');
  KIT.alias('gravity', 'cells', { phases: ['gravity'] }, 'Everything collapses into one disc.');

  /* ── paper: warm paper with a faint grid (shot 3's background) ── */
  KIT.piece('paper', {
    group: 'furniture',
    doc: 'Warm paper with a faint grid.',
    defaults: { tone: ['#F7F3EB', '#EEE8DC'], from: 120, to: 1200, size: 120, line: 'rgba(11,11,16,.055)', width: 1.5 },
    params: { tone: 'paper colour in the middle and at the edges', from: 'radius of the lighter middle (px)', to: 'radius where the paper is darkest (px)', size: 'distance between grid lines (px)', line: 'grid line colour', width: 'grid line width (px)' },
    draw(ctx, t, p, env) {
      const W = env.W, H = env.H;
      KIT.draw('backdrop', ctx, t, { from: [W / 2, H / 2, p.from], to: [W / 2, H / 2, p.to], stops: [[0, p.tone[0]], [1, p.tone[1]]] });
      ctx.strokeStyle = p.line; ctx.lineWidth = p.width; ctx.beginPath();
      for (let x = p.size; x < W; x += p.size) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for (let y = p.size; y < H; y += p.size) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke();
    },
  });
})(window);
