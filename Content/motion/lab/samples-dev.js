/* samples-dev.js — drawing aids, not Menu items. dev-fit: pieces from the 1920 x 1080 reel placed into boxes of a tall 1080 x 1920 frame with KIT.fit,
 * which is how every reel piece is meant to be reused in a reel. */
(function (g) {
  'use strict';
  const KIT = g.KIT, L = g.L;
  const FX = { bloom: .05, ca: 0, grain: .035, vig: .22 };
  KIT.sample('dev-fit', {
    dur: 2.6, langs: ['en'], fx: FX, dev: true,
    build(c) {
      const boxed = (box, fn) => ({ fn(ctx, t, env) { ctx.save(); ctx.beginPath(); ctx.rect(box[0], box[1], box[2], box[3]); ctx.clip(); KIT.fit(ctx, 1920, 1080, box, { mode: 'cover' }); fn(ctx, t); ctx.restore(); } });
      KIT.scene({ id: c.id, label: 'FIT', t0: 0, dur: c.DUR, fx: FX, layers: [
        KIT.lab.stage(c.W, c.H),
        boxed([88, 260, 904, 560], (ctx, t) => KIT.draw('bento', ctx, t, { at: 0 })),
        boxed([88, 860, 904, 560], (ctx, t) => KIT.draw('slash', ctx, t, { at: 0 })),
        boxed([88, 1460, 904, 380], (ctx, t) => KIT.draw('ghost-numeral', ctx, t, { at: 0 })),
      ] });
    },
  });
})(window);
