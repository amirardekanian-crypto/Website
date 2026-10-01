/* SHOT 3 — FORM  (bar 3, 3.750–5.625 s)
 *
 * A 16×9 grid of cells on bone. Every cell is one rounded rectangle whose corner radii, size, rotation and
 * colour are interpolated between four poses, one per beat, each wave staggered from a different origin:
 *   A  target of dots      (radial pop-in from the centre)                                  bullseye
 *   B  quarter-circle tiles (radial wave, each tile spins to its own quarter-turn)          quarter-turn
 *   C  pill bars            (left-to-right wave; rows then slide against each other)        pills
 *   D  one cobalt disc      (outside-in collapse). That disc is the portal transition 3 opens into shot 4.   gravity
 *
 * Built from the kit (Content/motion/kit): paper, then the four moves of the cell grid one after another. Each move draws while
 * it is the current one, so together they draw every frame exactly as before. The numbers are the reel's own.
 */
(function (g) {
  'use strict';
  const L = g.L, KIT = g.KIT, { PAL } = L;

  KIT.scene({
    id: 'shot3-form', label: 'FORM', hud: { color: PAL.ink }, samples: 10,
    fx: { bloom: .04, ca: .35, grain: .04, vig: .06 },
    layers: [
      { piece: 'paper' },
      { piece: 'bullseye' },
      { piece: 'quarter-turn' },
      { piece: 'pills' },
      { piece: 'gravity' },
    ],
  });
})(window);
