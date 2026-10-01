/* serve.js — the small web server the kit's tools use. It serves Content/ and, for the few repo files a sample may use,
 * the site's own assets: the Vazirmatn font (assets/fonts/) and the real court photos (court-*.jpg at the repo root).
 * Nothing else outside Content/ is reachable. */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const CONTENT = path.resolve(__dirname, '..', '..'), REPO = path.resolve(CONTENT, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.css': 'text/css', '.svg': 'image/svg+xml', '.mp4': 'video/mp4' };
const REPO_OK = [/^\/assets\/fonts\/[\w.-]+$/, /^\/assets\/img\/[\w.-]+$/, /^\/court-[a-z]+\.jpg$/];
function find(url) {
  const rel = decodeURIComponent(url.split('?')[0]);
  let p = path.join(CONTENT, rel);
  if (p.startsWith(CONTENT + path.sep) && fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  if (REPO_OK.some(r => r.test(rel))) { p = path.join(REPO, rel); if (fs.existsSync(p) && fs.statSync(p).isFile()) return p; }
  return null;
}
exports.serve = () => new Promise(res => {
  const srv = http.createServer((req, rsp) => {
    const p = find(req.url);
    if (!p) { rsp.writeHead(404); return rsp.end('404'); }
    rsp.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(p).pipe(rsp);
  }).listen(0, '127.0.0.1', () => res(srv));
});
