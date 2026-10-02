// Check every internal link found by the probes (all pages, phone viewport). node linkcheck.js [dir=out-before]
const fs = require('fs'), path = require('path'), os = require('os');
const BASE = process.env.AUDIT_BASE || 'https://www.amirardekani.com';
const dir = process.argv[2] || process.env.AUDIT_OUT || path.join(os.tmpdir(), 'site-audit', 'out');
const where = new Map(); const ext = new Map();
for (const key of fs.readdirSync(dir)) {
  const f = path.join(dir, key, 'mobile', 'record.json'); if (!fs.existsSync(f)) continue;
  const r = JSON.parse(fs.readFileSync(f, 'utf8')); const L = (r.probe || {}).links || {};
  for (const u of L.internal || []) { if (!where.has(u)) where.set(u, new Set()); where.get(u).add(key); }
  for (const [h, n] of Object.entries(L.external || {})) ext.set(h, (ext.get(h) || 0) + n);
}
(async () => {
  const urls = [...where.keys()].sort(); const bad = []; let ok = 0; const redirects = [];
  const queue = urls.slice();
  async function worker() {
    while (queue.length) {
      const u = queue.shift();
      try {
        let res = await fetch(BASE + u, { method: 'GET', redirect: 'manual' });
        if (res.status >= 300 && res.status < 400) { redirects.push([u, res.status, res.headers.get('location')]); res = await fetch(BASE + u, { redirect: 'follow' }); }
        if (res.status >= 400) bad.push([u, res.status, [...where.get(u)].join(',')]); else ok++;
      } catch (e) { bad.push([u, 'ERR ' + String(e).slice(0, 40), [...where.get(u)].join(',')]); }
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));
  console.log(`internal links checked: ${urls.length}  ok: ${ok}  bad: ${bad.length}`);
  bad.forEach(b => console.log('  BAD', b.join('  ')));
  console.log('redirected links (' + redirects.length + '):'); redirects.slice(0, 12).forEach(r => console.log('  ', r.join(' -> ')));
  console.log('external hosts linked:', Object.fromEntries(ext));
})();
