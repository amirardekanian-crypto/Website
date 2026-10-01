/* transitions.js — the seven joins between shots. Each one lands ON a bar line (the next shot's first beat), and
 * each is a match-cut of some kind: the full stop floods, the ink slab carries the next section number, the disc
 * becomes the portal, the glitch cuts on the flash, the screen splits open, a whip pan, a flash into the lockup.
 *
 * Built from the kit (Content/motion/kit/joins.js). Each join keeps the reel's own numbers as its defaults, so a plain
 * KIT.transition(id) is the reel's version; the Slab is the one that is told its words.
 *
 *   KIT.transition(id, params)   gives the engine { pre, post, draw(ctx, A, B, p, t), fx(p) }:
 *                                A = outgoing shot, B = incoming shot (full canvases), p = 0..1 across the window,
 *                                fx = extra post-processing added on top of the shots' own (chromatic aberration, flash)
 */
(function (g) {
  'use strict';
  const R = g.REEL, KIT = g.KIT;

  R.transition(KIT.transition('full-stop'));                              // 1 · POINT → TYPE: the full stop swells and floods the screen coral
  R.transition(KIT.transition('slab', { text: '03', label: 'FORM' }));    // 2 · TYPE → FORM: a skewed ink slab sweeps right to left, carrying the next section number
  R.transition(KIT.transition('portal'));                                 // 3 · FORM → DEPTH: the cobalt disc is the portal; its edge becomes the iris into the next world
  R.transition(KIT.transition('static'));                                 // 4 · DEPTH → FLOW: a glitch cut on the flash
  R.transition(KIT.transition('clamshell'));                              // 5 · FLOW → INTERFACE: the screen splits along its middle and opens
  R.transition(KIT.transition('whiplash'));                               // 6 · INTERFACE → RHYTHM: whip pan
  R.transition(KIT.transition('strobe'));                                 // 7 · RHYTHM → CLAUDE: hard cut on a white flash
})(window);
