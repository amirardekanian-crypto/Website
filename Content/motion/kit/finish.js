/* finish.js — the look in force, and the finish settings (Shutter, Jolt, Halo, Prism, Film, Vignette) as callable data.
 *
 *   KIT.use('brand')                    choose the look every piece reads its colours and fonts from
 *   KIT.role('key')                     the colour for a role in that look ('normal', 'key', 'keyText', 'fix', 'fixText', 'soft', ...);
 *                                       a hex or rgba colour is passed through, so a piece param can be a role or a colour
 *   KIT.face('display', 120, 900)       a CSS font string for a kind of type in that look ('display', 'accent', 'ui', 'mono')
 *   KIT.finish('halo')                  what a finish item is: { key, default, range, doc }
 *   KIT.fx({ halo: .2, prism: 0 })      the post settings for a scene (in core.js)      KIT.jolt({...})   camera shake (core.js)
 */
(function (g) {
  'use strict';
  const L = g.L, R = g.REEL, KIT = g.KIT;

  /* ── the look in force ── */
  KIT.activeLook = 'reel';
  KIT.use = id => { const k = KIT.look(id); KIT.activeLook = id; return k; };
  const isColour = c => typeof c === 'string' && /^(#|rgb|hsl)/.test(c);
  KIT.role = (c, lk) => {
    if (c == null || typeof c !== 'string' || isColour(c)) return c;
    const k = KIT.look(lk || KIT.activeLook);
    return k[c] != null ? k[c] : c;
  };
  KIT.face = (kind, size, weight, lk) => {
    const k = KIT.look(lk || KIT.activeLook), fam = k[kind] || k.display;
    return `${weight || 700} ${size}px ${fam}, ${k.rtl ? 'Tahoma, ' : ''}sans-serif`;
  };
  /* are we drawing Farsi? true when the look in force is a right-to-left look */
  KIT.rtl = lk => !!KIT.look(lk || KIT.activeLook).rtl;

  /* ── the finish group ── */
  const fin = (id, doc, v) => KIT.defData('finish', id, v, doc);
  fin('shutter', 'How long the camera shutter stays open on each frame. Longer means more motion blur.', { key: 'shutter', default: .6, range: [0, 1], unit: 'of a frame' });
  fin('jolt', 'How hard a big hit shakes and punches the camera.', { key: 'jolt', default: { x: 30, y: 22, rot: .01, zoom: .04, decay: 9, on: true } });
  fin('halo', 'A soft glow around the brightest parts of the picture.', { key: 'bloom', default: .18, range: [0, 1] });
  fin('prism', 'The colour fringe at the edges, like a cheap lens. Grows on every hit.', { key: 'ca', default: .5, range: [0, 6] });
  fin('film', 'Fine film grain over everything.', { key: 'grain', default: .05, range: [0, .2] });
  fin('vignette', 'The corners fall off into dark.', { key: 'vig', default: .3, range: [0, 1] });
  KIT.finish = id => { const v = KIT.data.finish[id]; if (!v) throw new Error('kit: no finish called "' + id + '"'); return v; };
  KIT.shutter = v => { R.shutter = v; return R.shutter; };
})(window);
