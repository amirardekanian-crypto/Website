// Face audit for reel 10: does the graphic ball (or its smash) ever cover HER FACE in the footage?
// Her face boxes come from the frame-by-frame clip analysis (tools/faces.json, source px, sampled every ~0.5 s and interpolated);
// they are mapped to the stage through the same timing map and framing the page uses (MAP / viewN / srcToStage in scenes.js).
// usage: node face_audit.js <reel.html> [step=1/60]      exit 1 when the ball overlaps a face box (padded 20 px)
const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../../../.claude/skills/reel/tools/_pw'));
const { pathToFileURL } = require('url');
const fs = require('fs');
const file = process.argv[2], STEP = +(process.argv[3] || 1 / 60);
const FACES = JSON.parse(fs.readFileSync(path.join(__dirname, 'faces.json'), 'utf8'));
(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1080, height: 1920 } })).newPage();
  await p.goto(pathToFileURL(path.resolve(file)).href + '?capture=1');
  await p.evaluate(() => window.__ready);
  const hits = await p.evaluate(({ FACES, STEP }) => {
    const face = (id, s) => { const a = FACES[id]; if (s <= a[0][0]) return a[0][1]; for (let i = 1; i < a.length; i++) if (s <= a[i][0]) { const f = (s - a[i - 1][0]) / (a[i][0] - a[i - 1][0]); return a[i - 1][1].map((v, k) => v + (a[i][1][k] - v) * f); } return a[a.length - 1][1]; };
    const scenes = [
      { from: 0, to: 1.65, clip: 'p33', id: '4633', view: view1 },
      { from: 1.2, to: T.door[0], clip: 'p31', id: '4631', view: view2 },
      { from: T.pane[0], to: T.racket[1], clip: 'p30', id: '4630', view: view4 },
    ];
    const out = [];
    for (let t = 0; t <= DUR; t += STEP) {
      const bs = ballState(t); if (!bs) continue;
      if (bs.L.alpha) { const f = Math.min(1, Math.max(0, (t - bs.L.t0) / bs.L.T)); if (bs.L.alpha[0] + (bs.L.alpha[1] - bs.L.alpha[0]) * f <= .01) continue; }
      for (const sc of scenes) {
        if (t < sc.from || t > sc.to) continue;
        const tq = Math.round(t * 30) / 30, src = mapAt(MAP[sc.clip], tq).s, v = sc.view(tq), fb = face(sc.id, src);
        const [x0, y0] = srcToStage(sc.clip, v, fb[0], fb[1]), [x1, y1] = srcToStage(sc.clip, v, fb[2], fb[3]);
        const pad = 20, cx = Math.max(x0 - pad, Math.min(bs.x, x1 + pad)), cy = Math.max(y0 - pad, Math.min(bs.y, y1 + pad));
        if ((bs.x - cx) ** 2 + (bs.y - cy) ** 2 < bs.r * bs.r) out.push({ t: +t.toFixed(3), clip: sc.id, ball: [Math.round(bs.x), Math.round(bs.y), Math.round(bs.r)], face: [x0, y0, x1, y1].map(Math.round) });
      }
    }
    return out;
  }, { FACES, STEP });
  await b.close();
  if (!hits.length) { console.log('FACE AUDIT: the ball never touches her face (20 px margin).'); return; }
  console.log('FACE AUDIT: ' + hits.length + ' sample(s) with the ball on her face');
  hits.slice(0, 40).forEach(h => console.log('  t ' + h.t + '  clip ' + h.clip + '  ball ' + h.ball + '  face ' + h.face));
  process.exit(1);
})();
