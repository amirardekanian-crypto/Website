/* figure.js — the athlete, and the forces on them:
 *   Athlete (a simple geometric figure in side view that moves between poses: ready, split step, first step, drive, plant)
 *   Force Arrow (an arrow grown from a point, its length the size of a force)   Ground Reaction (the push of the ground, with its two parts)
 *
 * The figure is deliberately NOT realistic: rounded limbs, a round head, joints you can read (the Menu's Pills style).
 * Amir approves each pose before it is used in a video (INGREDIENTS.md), so poses are plain data (POSES below) and easy to change.
 *
 * Angles are in degrees. A limb's angle is measured from straight down, positive = swung forward (towards the way the figure faces).
 * The figure stands on a ground line: whichever foot is lowest rests on it, and `lift` raises the whole figure off it (a hop).
 */
(function (g) {
  'use strict';
  const L = g.L, KIT = g.KIT, { E, clamp, lerp, prog } = L;
  const T = KIT.text;
  const isFa = p => (p.fa != null ? !!p.fa : KIT.rtl());
  const col = (c, a) => { const v = KIT.role(c); return a == null || a >= 1 ? v : L.rgbaHex(/^#/.test(v) ? v : '#FFFFFF', a); };
  const rad = d => d * Math.PI / 180;

  /* body proportions, as shares of the figure's height */
  const BODY = { torso: .30, neck: .035, head: .062, thigh: .245, shank: .245, foot: .105, heel: .03, upper: .165, fore: .15, shoulder: .93 };

  /* a pose: trunk lean from vertical (forward +), two legs and two arms. A is the near side (drawn on top), B the far side.
     leg: hip (thigh angle), knee (bend, 0 = straight), ankle (0 = foot flat, negative = heel up, toe down)
     arm: sh (upper arm angle from down), el (elbow bend)       lift: how far the figure is off the ground, as a share of height */
  const POSES = {
    'ready': { trunk: 24, A: { hip: 30, knee: 52, ankle: 0 }, B: { hip: 16, knee: 44, ankle: 0 }, armA: { sh: 32, el: 72 }, armB: { sh: -8, el: 78 }, lift: 0 },
    'split-step': { trunk: 22, A: { hip: 34, knee: 64, ankle: -14 }, B: { hip: -4, knee: 58, ankle: -14 }, armA: { sh: 44, el: 68 }, armB: { sh: -28, el: 64 }, lift: .07 },
    'first-step': { trunk: 40, A: { hip: 62, knee: 96, ankle: 10 }, B: { hip: -30, knee: 6, ankle: -55 }, armA: { sh: -48, el: 92 }, armB: { sh: 55, el: 88 }, lift: 0 },
    'drive': { trunk: 44, A: { hip: -34, knee: 4, ankle: -55 }, B: { hip: 64, knee: 100, ankle: 5 }, armA: { sh: 58, el: 90 }, armB: { sh: -50, el: 92 }, lift: 0 },
    'plant': { trunk: -4, A: { hip: 42, knee: 14, ankle: 22 }, B: { hip: 8, knee: 52, ankle: 0 }, armA: { sh: -20, el: 40 }, armB: { sh: 40, el: 30 }, lift: 0 },
  };
  const mixPose = (a, b, k) => {
    const o = { trunk: lerp(a.trunk, b.trunk, k), lift: lerp(a.lift, b.lift, k) };
    for (const j of ['A', 'B']) o[j] = { hip: lerp(a[j].hip, b[j].hip, k), knee: lerp(a[j].knee, b[j].knee, k), ankle: lerp(a[j].ankle, b[j].ankle, k) };
    for (const j of ['armA', 'armB']) o[j] = { sh: lerp(a[j].sh, b[j].sh, k), el: lerp(a[j].el, b[j].el, k) };
    return o;
  };

  /* the pose at time t from a list of key poses [{ pose, at }]: it arrives at each key's time, easing in over `blend` seconds before it */
  function poseAt(p, t) {
    const keys = p.poses.map(k => ({ pose: typeof k.pose === 'string' ? POSES[k.pose] : k.pose, at: k.at }));
    if (!keys.length) return POSES.ready;
    let cur = keys[0].pose;
    for (let i = 1; i < keys.length; i++) {
      const u = prog(t, keys[i].at - p.blend, p.blend); if (u <= 0) break;
      cur = mixPose(keys[i - 1].pose, keys[i].pose, (E[p.ease] || E.inOutCubic)(u));
      if (u < 1) break;
    }
    return cur;
  }

  /* where every joint is, in pixels, for params p at time t (so other pieces can attach to the figure) */
  function joints(p, t) {
    const pose = poseAt(p, t), H = p.height * p.scale, d = p.dir, S = (a, l) => [Math.sin(rad(a)) * l * d, Math.cos(rad(a)) * l];
    const out = { pose, H };
    const hip = [0, 0];
    const tr = [Math.sin(rad(pose.trunk)) * BODY.torso * H * d, -Math.cos(rad(pose.trunk)) * BODY.torso * H];
    const neck = [hip[0] + tr[0], hip[1] + tr[1]], sh = [hip[0] + tr[0] * BODY.shoulder, hip[1] + tr[1] * BODY.shoulder];
    const ha = pose.trunk * .55, headC = [neck[0] + Math.sin(rad(ha)) * (BODY.neck + BODY.head) * H * d, neck[1] - Math.cos(rad(ha)) * (BODY.neck + BODY.head) * H];
    Object.assign(out, { hip, neck, shoulder: sh, head: headC, headR: BODY.head * H });
    for (const j of ['A', 'B']) {
      const lg = pose[j], th = S(lg.hip, BODY.thigh * H), knee = [hip[0] + th[0], hip[1] + th[1]];
      const shk = S(lg.hip - lg.knee, BODY.shank * H), ankle = [knee[0] + shk[0], knee[1] + shk[1]];
      const fa = 90 + lg.ankle, toe = [ankle[0] + Math.sin(rad(fa)) * BODY.foot * H * d, ankle[1] + Math.cos(rad(fa)) * BODY.foot * H];
      const heel = [ankle[0] - Math.sin(rad(fa)) * BODY.heel * H * d, ankle[1] - Math.cos(rad(fa)) * BODY.heel * H];
      out['knee' + j] = knee; out['ankle' + j] = ankle; out['toe' + j] = toe; out['heel' + j] = heel;
      const ar = pose['arm' + j], up = S(ar.sh, BODY.upper * H), elbow = [sh[0] + up[0], sh[1] + up[1]], fo = S(ar.sh + ar.el, BODY.fore * H), hand = [elbow[0] + fo[0], elbow[1] + fo[1]];
      out['elbow' + j] = elbow; out['hand' + j] = hand;
    }
    /* put the lowest foot point on the ground, then raise by the lift */
    const r = p.limb * H / 2;
    const low = Math.max(out.toeA[1], out.toeB[1], out.heelA[1], out.heelB[1], out.ankleA[1], out.ankleB[1]) + r;
    const dy = KIT.val(p.groundY, t) - low - pose.lift * H, dx = KIT.val(p.x, t);
    out.shift = [dx, dy]; out.ground = KIT.val(p.groundY, t); out.lowest = low;
    const shiftPt = q => [q[0] + dx, q[1] + dy];
    for (const k of Object.keys(out)) if (Array.isArray(out[k]) && out[k].length === 2 && k !== 'shift') out[k] = shiftPt(out[k]);
    return out;
  }
  KIT.figure = { POSES, BODY, poseAt, joints };
  let gc = null;                                                    // one spare canvas for afterimages, resized when the frame size changes
  const ghostCanvas = (w, h) => { if (!gc || gc.width !== w || gc.height !== h) gc = L.canvas(w, h); return gc; };

  /* ═══════════════ Athlete ═══════════════ */
  KIT.piece('figure', {
    group: 'athlete',
    doc: 'A simple, geometric athlete in side view. It moves between poses: ready, split step, first step, drive, plant.',
    defaults: {
      poses: [{ pose: 'ready', at: 0 }], blend: .3, ease: 'inOutCubic', x: 540, groundY: 1500, height: 640, scale: 1, dir: 1, limb: .062, torsoWidth: 1.9,
      color: 'normal', farShade: .5, highlight: [], highlightColor: 'key', ground: true, groundColor: 'soft', ghosts: 0, ghostStep: .1, at: 0, alpha: 1,
    },
    params: {
      poses: 'the story of the pose: a list of { pose: name or a pose object, at: seconds it is reached }. Names: ready, split-step, first-step, drive, plant', blend: 'how long a change of pose takes (s)', ease: 'easing name for the change',
      x: 'where the hips are along the ground (px, or a function of time)', groundY: 'the ground line (px)', height: 'height of the figure (px)', scale: 'extra scale', dir: '1 faces right, -1 faces left', limb: 'limb thickness as a share of height',
      torsoWidth: 'torso thickness as a multiple of a limb', color: 'colour of the near side', farShade: 'how strong the far side is (0 to 1)', highlight: 'limbs to light up: legA, legB, armA, armB, torso, head',
      highlightColor: 'colour of the lit limbs', ground: 'draw the ground line and shadow', groundColor: 'colour of the ground line', ghosts: 'how many afterimages trail behind', ghostStep: 'time between afterimages (s)', at: 'when it appears (s)', alpha: 'strength (a number, or a function of time)',
    },
    cues: p => p.poses.slice(1).map(k => ({ dt: k.at, kind: 'sound', props: { id: 'footsteps' } })),
    draw(ctx, t, p, env) {
      if (t < p.at) return;
      const fade = clamp((t - p.at) / .25), alpha = KIT.val(p.alpha, t);
      /* the far side is a darker, solid version of the near colour (no see-through, so overlaps never show) */
      const stage = '#16181A', far = c => L.mixHex(c, stage, 1 - p.farShade);
      const paint = (g2, J, solid) => {
        const H = J.H, lw = p.limb * H, hl = k => p.highlight.indexOf(k) >= 0;
        const colour = (k, isFar) => { const c = hl(k) ? col(p.highlightColor) : col(p.color); return isFar && !hl(k) ? far(c) : c; };
        const seg = (a_, b_, w, c) => { g2.strokeStyle = c; g2.lineWidth = w; g2.beginPath(); g2.moveTo(a_[0], a_[1]); g2.lineTo(b_[0], b_[1]); g2.stroke(); };
        g2.lineCap = 'round'; g2.lineJoin = 'round';
        const limb = (j, isFar) => { const c = colour('leg' + j, isFar); seg(J.hip, J['knee' + j], lw, c); seg(J['knee' + j], J['ankle' + j], lw * .92, c); seg(J['heel' + j], J['toe' + j], lw * .8, c); };
        const arm = (j, isFar) => { const c = colour('arm' + j, isFar); seg(J.shoulder, J['elbow' + j], lw * .78, c); seg(J['elbow' + j], J['hand' + j], lw * .7, c); g2.fillStyle = c; g2.beginPath(); g2.arc(J['hand' + j][0], J['hand' + j][1], lw * .46, 0, Math.PI * 2); g2.fill(); };
        arm('B', true); limb('B', true);
        seg(J.hip, J.neck, lw * p.torsoWidth, colour('torso', false));
        g2.fillStyle = colour('head', false); g2.beginPath(); g2.arc(J.head[0], J.head[1], J.headR, 0, Math.PI * 2); g2.fill();
        limb('A', false); arm('A', false);
        void solid;
      };
      ctx.save();
      const J0 = joints(p, t);
      if (p.ground) {                                                                     // the ground line and a soft shadow that shrinks as the figure leaves it
        const gy = J0.ground, air = clamp((J0.pose.lift * J0.H) / (J0.H * .12));
        ctx.globalAlpha = alpha * fade; ctx.strokeStyle = col(p.groundColor, .5); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.x - J0.H * .8, gy + 2); ctx.lineTo(p.x + J0.H * .8, gy + 2); ctx.stroke();
        ctx.globalAlpha = alpha * fade * (.35 - .2 * air); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(J0.hip[0], gy + 4, J0.H * (.2 - .05 * air), J0.H * .022, 0, 0, Math.PI * 2); ctx.fill();
      }
      if (p.ghosts > 0) {                                                                  // afterimages: drawn solid on a spare canvas, then laid down faint
        const tmp = ghostCanvas(env.W, env.H), tg = tmp.getContext('2d');
        for (let k = p.ghosts; k >= 1; k--) {
          tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, tmp.width, tmp.height); paint(tg, joints(p, t - k * p.ghostStep), true);
          ctx.globalAlpha = alpha * fade * .24 / k; ctx.drawImage(tmp, 0, 0);
        }
      }
      const A = alpha * fade;
      if (A < .999) {                                                                      // a see-through figure is drawn whole on a spare canvas first, so limbs never show through each other
        const tmp = ghostCanvas(env.W, env.H), tg = tmp.getContext('2d'); tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, tmp.width, tmp.height); paint(tg, J0, false);
        ctx.globalAlpha = A; ctx.drawImage(tmp, 0, 0);
      } else { ctx.globalAlpha = 1; paint(ctx, J0, false); }
      ctx.restore();
    },
  });

  /* ═══════════════ Force Arrow ═══════════════ */
  KIT.piece('force-arrow', {
    group: 'athlete',
    doc: 'An arrow grows from a point. Its length is the size of a force and it points the way the force pushes.',
    defaults: {
      from: [540, 1000], angle: -90, length: 300, label: null, size: 52, width: 18, color: 'key', labelColor: 'keyText', head: 1, at: 0, dur: .5, ease: 'outBack', follow: null, kind: 'display', weight: 800, fa: null, alpha: 1, labelSide: 'auto', plate: null,
    },
    params: {
      from: '[x, y] where the force acts (px)', angle: 'which way it points, in degrees (0 = right, -90 = up, 90 = down)', length: 'how long it is at full size (px)', label: 'a name for the force (null = none)', size: 'label size (px)', width: 'arrow thickness (px)',
      color: 'colour of the arrow', labelColor: 'colour of the label', head: 'size of the head as a multiple of the width', at: 'when it starts to grow (s)', dur: 'how long it takes to grow (s)', ease: 'easing name',
      follow: 'null, or a function of time that returns 0 to 1: the length follows it (a force that rises and falls)', kind: 'type kind', weight: 'label weight', fa: 'true = Farsi', alpha: 'strength', labelSide: 'auto | left | right | above | below: where the label sits', plate: 'a colour for a plate behind the label (null = none)',
    },
    cues: () => [{ dt: 0, kind: 'sound', props: { id: 'thump' } }],
    draw(ctx, t, p) {
      if (t < p.at) return;
      const F = KIT.val(p.from, t), u = (E[p.ease] || E.outBack)(prog(t, p.at, p.dur)), k = p.follow ? KIT.val(p.follow, t) : 1, len = p.length * u * k, a = rad(p.angle);
      if (len < 2) return;
      const dx = Math.cos(a), dy = Math.sin(a), w = p.width, hs = w * 2.3 * p.head, base = Math.max(0, len - hs * .9), e = [F[0] + dx * len, F[1] + dy * len], b = [F[0] + dx * base, F[1] + dy * base];
      ctx.save(); ctx.globalAlpha = p.alpha; ctx.fillStyle = col(p.color); ctx.strokeStyle = col(p.color); ctx.lineCap = 'butt';
      ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(F[0], F[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      ctx.save(); ctx.translate(e[0], e[1]); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-hs, -hs * .62); ctx.lineTo(-hs * .78, 0); ctx.lineTo(-hs, hs * .62); ctx.closePath(); ctx.fill(); ctx.restore();
      if (p.label) {
        const fa = isFa(p), font = KIT.face(fa ? 'display' : p.kind, p.size * (fa ? .88 : 1), p.weight), mid = [F[0] + dx * len * .5, F[1] + dy * len * .5], off = w * .5 + 22;
        const upright = Math.abs(dy) >= Math.abs(dx), side = p.labelSide, right = side === 'left' ? false : side === 'right' ? true : dx >= -.2;
        const above = side === 'below' ? false : true;
        const lx = upright ? mid[0] + (right ? off : -off) : mid[0], ly = (upright ? mid[1] : mid[1] + (above ? -off - p.size * .12 : off + p.size * .82)) + (upright ? p.size * .32 : 0);
        const align = upright ? (right ? 'left' : 'right') : 'center', tw = T.width(font, p.label, fa ? 'rtl' : 'ltr');
        ctx.globalAlpha = p.alpha * clamp((u - .5) * 3);
        if (p.plate) { const px = align === 'left' ? lx - 14 : align === 'right' ? lx - tw - 14 : lx - tw / 2 - 14; ctx.fillStyle = col(p.plate); ctx.beginPath(); ctx.roundRect(px, ly - p.size * .86, tw + 28, p.size * 1.16, 10); ctx.fill(); }
        ctx.font = font; ctx.fillStyle = col(p.labelColor); ctx.textBaseline = 'alphabetic'; T.put(ctx, p.label, lx, ly, align, fa);
      }
      ctx.restore();
    },
  });

  /* ═══════════════ Ground Reaction ═══════════════ */
  KIT.piece('ground-reaction', {
    group: 'athlete',
    doc: 'The push of the ground back on the athlete. One arrow for the whole push, two for its up part and its forward part.',
    defaults: {
      figure: null, foot: 'toeB', point: null, up: 380, forward: 260, dir: 1, width: 16, parts: true, label: 'GRF', upLabel: 'UP', forwardLabel: 'FORWARD', color: 'key', partColor: 'normal',
      at: 0, dur: .55, size: 50, kind: 'display', fa: null, alpha: 1, follow: null, plate: 'rgba(12,15,11,.8)',
    },
    params: {
      figure: 'the figure params this force acts on (the same object given to the Athlete), or null and use point', foot: 'which joint of the figure the force starts at: toeA, toeB, heelA, heelB', point: '[x, y] when there is no figure',
      up: 'length of the upward part (px)', forward: 'length of the forward part (px; negative = backward)', dir: '1 = forward is to the right, -1 = to the left', width: 'thickness of the whole-push arrow (px)', parts: 'draw the two parts',
      label: 'name of the whole push', upLabel: 'name of the up part', forwardLabel: 'name of the forward part', color: 'colour of the whole push', partColor: 'colour of the parts', at: 'when it starts (s)', dur: 'how long it takes to grow (s)',
      size: 'label size (px)', kind: 'type kind', fa: 'true = Farsi', alpha: 'strength', follow: 'null, or a function of time returning 0 to 1: the push rises and falls with it', plate: 'a plate colour behind the labels (null = none)',
    },
    cues: () => [{ dt: 0, kind: 'sound', props: { id: 'thump' } }],
    draw(ctx, t, p) {
      if (t < p.at) return;
      const origin = p.figure ? joints(Object.assign({}, KIT.defs.figure.defaults, p.figure), t)[p.foot] : KIT.val(p.point, t);
      if (!origin) return;
      const u = E.outBack(prog(t, p.at, p.dur)), k = p.follow ? KIT.val(p.follow, t) : 1, up = p.up * u * k, fw = p.forward * p.dir * u * k, fa = isFa(p);
      const O = [origin[0], origin[1]], tip = [O[0] + fw, O[1] - up];
      ctx.save(); ctx.globalAlpha = p.alpha;
      if (p.parts) {
        const dash = (a, b, c) => { ctx.setLineDash([10, 10]); ctx.strokeStyle = col(c, .55); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.setLineDash([]); };
        dash([O[0] + fw, O[1]], tip, p.partColor); dash([O[0], O[1] - up], tip, p.partColor);
      }
      const arrow = (from, to, color, w, label, side) => {
        const dx = to[0] - from[0], dy = to[1] - from[1], len = Math.hypot(dx, dy); if (len < 6) return;
        KIT.draw('force-arrow', ctx, t, { from, angle: Math.atan2(dy, dx) * 180 / Math.PI, length: len, color, width: w, label, size: p.size * (w < p.width ? .82 : 1), at: -10, dur: .001, kind: p.kind, fa: p.fa, labelSide: side, plate: p.plate, labelColor: color === p.color ? 'keyText' : 'normal' });
      };
      if (p.parts) { arrow(O, [O[0], O[1] - up], p.partColor, p.width * .55, p.upLabel, 'left'); arrow(O, [O[0] + fw, O[1]], p.partColor, p.width * .55, p.forwardLabel, 'below'); }
      arrow(O, tip, p.color, p.width, p.label, 'right');
      ctx.restore();
    },
  });

  /* ═══════════════ Phases (a row of poses) ═══════════════ */
  KIT.piece('pose-strip', {
    group: 'athlete',
    doc: 'Poses in a row, named one after another: split step, first step, drive. Arrows join them.',
    defaults: {
      poses: [{ pose: 'split-step', label: 'Split step' }, { pose: 'first-step', label: 'First step' }, { pose: 'drive', label: 'Acceleration' }], x: 540, groundY: 1280, w: 920, height: 420, at: 0, step: .9, dur: .5,
      color: 'normal', lastColor: 'key', labelSize: 46, arrows: true, dir: 1, fa: null, kind: 'display',
    },
    params: {
      poses: 'a list of { pose: a pose name, label: its name }', x: 'centre of the row (px)', groundY: 'the ground line (px)', w: 'width of the whole row (px)', height: 'height of each figure (px)', at: 'when the first one appears (s)',
      step: 'time between figures (s)', dur: 'how long a figure takes to arrive (s)', color: 'colour of the figures', lastColor: 'colour of the last figure and its name (the one that matters)', labelSize: 'size of the names (px)',
      arrows: 'draw an arrow between figures', dir: '1 faces right, -1 faces left', fa: 'true = Farsi (the row then runs right to left)', kind: 'type kind',
    },
    cues: p => p.poses.map((_, i) => ({ dt: i * p.step, kind: 'sound', props: { id: 'click' } })),
    draw(ctx, t, p) {
      const fa = isFa(p), n = p.poses.length, slot = p.w / n, dir = fa ? -1 : p.dir;
      p.poses.forEach((q, i) => {
        const idx = fa ? n - 1 - i : i, cx = p.x - p.w / 2 + slot * (idx + .5), t0 = p.at + i * p.step, last = i === n - 1, c = last ? p.lastColor : p.color;
        const u = prog(t, t0, p.dur); if (u <= 0) return;
        const e = E.outBack(u, 1.2);
        ctx.save(); ctx.globalAlpha = E.outCubic(u); ctx.translate(cx, p.groundY); ctx.scale(lerp(.92, 1, e), lerp(.92, 1, e)); ctx.translate(-cx, -p.groundY);
        KIT.draw('figure', ctx, t, { poses: [{ pose: q.pose, at: 0 }], x: cx, groundY: p.groundY, height: p.height, dir, color: c, highlight: [], at: -10, ground: i === 0 || true, limb: .065 });
        ctx.restore();
        const lab = q.label || '', font = KIT.face(fa ? 'display' : p.kind, p.labelSize * (fa ? .9 : 1), 800), txt = (!fa && lab) ? lab.toUpperCase() : lab;
        ctx.save(); ctx.globalAlpha = E.outCubic(prog(t, t0 + .15, .4)); ctx.font = font; ctx.fillStyle = col(last ? 'keyText' : 'normal'); ctx.textBaseline = 'alphabetic'; T.put(ctx, txt, cx, p.groundY + p.labelSize * 1.9 + (1 - E.outExpo(prog(t, t0 + .15, .4))) * 18, 'center', fa); ctx.restore();
        if (p.arrows && i < n - 1) {
          const nx = p.x - p.w / 2 + slot * ((fa ? n - 2 - i : i + 1) + .5), mid = (cx + nx) / 2, y = p.groundY - p.height * .55, half = slot * .12;
          KIT.draw('arrow', ctx, t, { from: [mid - dir * half, y], to: [mid + dir * half, y], at: t0 + p.dur * .8, dur: .35, color: 'soft', width: 7, head: 28 });
        }
      });
    },
  });
})(window);
