// Warns when a commit adds English to program.html that the Farsi app has no words for (2026-11-20, the app in Farsi).
//
//   node scripts/i18n/check_new_words.js            the staged diff of program.html (pre-commit guard 31 runs this)
//   node scripts/i18n/check_new_words.js <diff>      a diff file instead
//
// It reads only the ADDED lines, takes the text an athlete could see (between tags, and quoted strings that read like
// words), and looks each up the way assets/js/i18n.js does: an exact entry, a pattern, the same words with punctuation
// or an arrow at either end. What it cannot find is listed. It never blocks: a quoted string can be code, and a text
// built from ${…} pieces is matched by a pattern this cannot test. The list is a to-do: add the words to a part in
// scripts/i18n/fa/ and run node scripts/build_i18n_fa.js.
'use strict';
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const DIR = path.join(__dirname, 'fa');
const norm = s => String(s).replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();

const exact = {}, patterns = [];
for (const f of fs.readdirSync(DIR).filter(f => f.endsWith('.json')).sort()) {
  const p = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  Object.keys(p.exact || {}).forEach(k => { exact[norm(k)] = 1; });
  (p.patterns || []).forEach(x => { try { patterns.push(new RegExp('^' + x[0] + '$')); } catch (e) {} });
}
function known(t) {
  const k = norm(t);
  if (exact[k] || patterns.some(re => re.test(k))) return true;
  const m = k.match(/^([^A-Za-z0-9]*)(.*?)([.:!?…›‹→←]*)$/);
  return !!(m && exact[m[2]]);
}

const diff = process.argv[2] ? fs.readFileSync(process.argv[2], 'utf8')
  : execSync('git diff --cached -U0 -- program.html', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const added = diff.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++'))
  .map(l => l.slice(1)).filter(l => !/^\s*(\/\/|\*|\/\*|<!--)/.test(l));

const seen = new Set(), missing = [];
const looksLikeWords = t => /[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(t) && !/[{};=]|=>|\(\)|\.(js|css|html|json|png|webp)\b|^[a-z]+[A-Z]/.test(t)
  && !/^(https?:|\/|#|\.)/.test(t) && /[A-Za-z]/.test(t.charAt(0) === '' ? 'a' : t.replace(/^[^A-Za-z]+/, '').charAt(0));
for (const line of added) {
  const pieces = [];
  line.replace(/>([^<>]{3,})</g, (a, t) => { pieces.push(t); return a; });
  line.replace(/(['"`])((?:(?!\1)[^\\]|\\.){3,200}?)\1/g, (a, q, t) => { pieces.push(t); return a; });
  for (let t of pieces) {
    if (t.includes('${') || t.includes('<')) continue;   // built from pieces or holds markup: a pattern's job, not testable here
    t = norm(t.replace(/\\'/g, "'"));
    if (!looksLikeWords(t) || seen.has(t)) continue;
    if (/^[a-z0-9 _-]+$/.test(t) && /[-_]/.test(t)) continue;   // a class list ("acct-foot acct-lang-note")
    if (/^[a-z] /.test(t) || /^(Barlow|Space Mono|Vazirmatn|Tahoma)/.test(t)) continue;   // the tail of an apostrophe in a comment ("s honours…"), a font
    seen.add(t);
    if (!known(t)) missing.push(t);
  }
}
if (missing.length) {
  console.log(`⚠ ${missing.length} new English text(s) in program.html have no Farsi yet (Farsi phones show them in English):`);
  missing.slice(0, 40).forEach(t => console.log('    · ' + t.slice(0, 110)));
  console.log('  Add them to a part in scripts/i18n/fa/ and run: node scripts/build_i18n_fa.js   (a warning, not a block)');
}
process.exit(0);
