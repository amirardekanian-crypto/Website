/* lab.js — the registry for kit samples. A sample is one small scene that shows one new piece working.
 *
 *   KIT.sample('court', {
 *     w: 1080, h: 1920, dur: 5,                    the frame (a reel is 1080 x 1920) and the length in seconds
 *     langs: ['en', 'fa'],                         which languages the sample exists in (a Farsi one needs Amir's reading)
 *     fx: { bloom: .06, ca: 0, grain: .035, vig: .22 },
 *     build(c) { KIT.scene({ ... layers ... }); }  c = { lang, fa, W, H, DUR, look, PAD, TOP }
 *   });
 *
 * The page lab.html?item=court plays it. tools/still.js takes pictures of it. tools/clips.js turns it into the Menu's clip.
 */
(function (g) {
  'use strict';
  const KIT = g.KIT, L = g.L;
  const SAMPLES = KIT.samples = Object.create(null);
  KIT.sample = (id, spec) => { SAMPLES[id] = Object.assign({ id, w: 1080, h: 1920, dur: 5, langs: ['en'], look: 'brand' }, spec); return SAMPLES[id]; };

  /* the numbers every reel layout uses */
  KIT.lab = {
    PAD: 88,                    // edge padding of a 1080 x 1920 reel
    TOP: 150,                   // the chapter rail's line: inside the top band, below the phone's status bar
    SAFE_TOP: 250, SAFE_BOT: 1500,   // what Instagram leaves clear: keep the key content between these two lines
    /* the stage every sample stands on: a dim radial from the room tokens (#0c0f0b to #16161A) */
    stage(W, H) {
      return { piece: 'backdrop', params: { from: [W / 2, H * .38, 40], to: [W / 2, H * .38, Math.max(W, H) * .95], stops: [[0, '#1B1D1A'], [1, '#0B0D0A']] } };
    },
  };
})(window);
