/* hud.js — the persistent frame furniture: crop marks, title, SMPTE timecode, section label, 8-bar progress.
 * Drawn AFTER post-processing so it stays razor sharp, and in the colour of whichever shot is on screen.
 *
 * The drawing is the kit's Slate (Content/motion/kit/slate.js). This file only works out, for the frame being made, what the
 * Slate needs to know: the colour (blended across a scene change), how visible each corner is (each shot says so in its
 * `hud`), which shot owns the label, and the fade of the whole thing (the lockup fades it out). The kit loads after this file,
 * so it is looked up when a frame is drawn, never before.
 */
(function (g) {
  'use strict';
  const L = g.L, R = g.REEL, { hex, mixC, smoothstep } = L;

  R.hudText = { title: 'CLAUDE', sub: '— MOTION REEL ’26' };            // the two strings in the top-left corner

  R.hud = function (ctx, t) {
    const a = R.active(t);
    let cur, nxt = null, k = 0;
    if (a.tr) { cur = R.shots[a.tr.to - 1]; nxt = R.shots[a.tr.to]; k = smoothstep(.35, .65, a.p); } else cur = R.shots[a.i];
    const hc = s => hex(s.hud.colorAt ? s.hud.colorAt(t - s.t0) : s.hud.color);       // a shot may change its HUD colour over time
    const col = nxt ? mixC(hc(cur), hc(nxt), k) : hc(cur);
    const owner = k > .5 ? nxt : cur;                       // whose label / visibility rules apply
    const idx = R.shots.indexOf(owner);
    const ga = owner.hud.alphaAt ? owner.hud.alphaAt(t - owner.t0) : 1;                 // whole-HUD fade (the lockup fades out)
    const vis = key => (nxt ? L.lerp(cur.hud[key], nxt.hud[key], k) : cur.hud[key]);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);                     // the slate lives in frame pixels, whatever the last drawing left behind
    g.KIT.draw('slate', ctx, t, {
      title: R.hudText.title, sub: R.hudText.sub, color: col, alpha: ga,
      marks: vis('marks'), tl: vis('tl'), tr: vis('tr'), bl: vis('bl'), br: vis('br'),
      sections: R.shots, section: idx,
    });
    ctx.restore();
  };
})(window);
