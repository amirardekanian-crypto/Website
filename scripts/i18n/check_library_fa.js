// Checks a Library item's Farsi copy (data.fa) against its English (2026-11-20, Amir: "the libraries and playbook should be
// available in farsi and everything should be written in both languages").
//
//   node scripts/i18n/check_library_fa.js <file.json>     the file is { "<slug>": { "en": <data>, "fa": <data.fa> }, ... }
//
// data.fa is a FULL copy of the item. Only the words an athlete reads may differ; everything the app or the server reads
// stays byte for byte the same: ids, the title (library_sessions logs it), block titles (isPrepBlockTitle() decides
// logging from them; the app's Farsi layer translates them on screen), exercise names and exIds, rx, type, icon, category,
// countsAs, duration, equipment, intent (a closed pill list, translated on screen). A Farsi copy must hold Farsi letters
// wherever it changed a text, and nothing may be added or dropped.
'use strict';
const fs = require('fs');
// The paths (array indexes as []) whose string may differ between the English and the Farsi.
const WORDS = [
  /^\.intro\[\]$/, /^\.before\[\]\.(text|label)$/, /^\.focusTag$/,
  /^\.blocks\[\]\.exercises\[\]\.(note|cues\.(good|bad)\[\])$/,
  /^\.blocks\[\]\.exercises\[\]\.items\[\]\.(note|detail)$/, /^\.blocks\[\]\.exercises\[\]\.why\.text$/,
  // an article: its title and its blocks' words (the layout keys stay)
  /^\.title@article$/, /^\.blocks\[\]\.(text|label|caption|meta|items\[\]|rows\[\]\[\]|q|a)@article$/,
];
const isWords = (path, kind) => WORDS.some(re => re.test(path) || re.test(path + '@' + kind));
const FA = /[؀-ۿ]/;

function walk(en, fa, path, kind, out) {
  const te = Array.isArray(en) ? 'array' : en === null ? 'null' : typeof en;
  const tf = Array.isArray(fa) ? 'array' : fa === null ? 'null' : typeof fa;
  if (te !== tf) { out.push(`${path || '.'}: ${te} in English, ${tf} in Farsi`); return; }
  if (te === 'array') {
    if (en.length !== fa.length) { out.push(`${path}: ${en.length} items in English, ${fa.length} in Farsi`); return; }
    en.forEach((x, i) => walk(x, fa[i], path + '[]', kind, out));
  } else if (te === 'object') {
    const ke = Object.keys(en).filter(k => k !== 'fa').sort(), kf = Object.keys(fa).sort();
    if (ke.join() !== kf.join()) { out.push(`${path || '.'}: keys ${ke.join(',')} vs ${kf.join(',')}`); return; }
    ke.forEach(k => walk(en[k], fa[k], path + '.' + k, kind, out));
  } else if (te === 'string') {
    if (isWords(path, kind)) { if (en.trim() && en !== fa && !FA.test(fa)) out.push(`${path}: changed but no Farsi letters: ${fa.slice(0, 60)}`); if (en.trim() && en === fa && /[A-Za-z]{3}/.test(en)) out.push(`${path}: left in English: ${en.slice(0, 60)}`); }
    else if (en !== fa) out.push(`${path}: must not change ("${en.slice(0, 40)}" → "${fa.slice(0, 40)}")`);
  } else if (en !== fa) out.push(`${path}: ${en} → ${fa}`);
}

if (require.main === module) {
  // `--files a.json b.json …`: Library files in the repo (workouts/<shelf>/<id>.json), each carrying its Farsi in `fa`
  // (pre-commit guard 30). A file with no `fa` fails: every Library session is written in both languages.
  let all;
  if (process.argv[2] === '--files') {
    all = {};
    for (const f of process.argv.slice(3)) {
      const d = JSON.parse(fs.readFileSync(f, 'utf8'));
      if (!d.fa) { console.log(`✗ ${f}: no "fa" (its Farsi copy). Every Library session is written in both languages`); process.exitCode = 1; continue; }
      const en = Object.assign({}, d); delete en.fa;
      all[f.replace(/\\/g, '/').replace(/\.json$/, '')] = { en, fa: d.fa };
    }
  } else all = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  let bad = 0;
  for (const [slug, { en, fa }] of Object.entries(all)) {
    const kind = slug.startsWith('articles/') ? 'article' : 'workout';
    const out = [];
    walk(en, fa, '', kind, out);
    if (out.length) { bad++; console.log(`✗ ${slug}`); out.slice(0, 12).forEach(l => console.log('    ' + l)); }
  }
  console.log(bad ? `✗ ${bad} of ${Object.keys(all).length} items need fixing` : `✓ all ${Object.keys(all).length} items match their English`);
  process.exit(bad || process.exitCode ? 1 : 0);
}
module.exports = { walk };
