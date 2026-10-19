// Send one test notification to a phone that subscribed at /pushtest/.
//
// Built 2026-10-19 for one question: does a web notification reach a phone, and does it still reach
// one inside Iran? Nothing in the apps uses this. If push is ever built for real, the sender becomes
// a Supabase Edge Function and this script goes away.
//
//   node scripts/pushtest/send.mjs --sub <file.json> [--title "..."] [--body "..."] [--ttl 7200]
//
// The subscription is the JSON the test page showed on the phone, saved to a file.
// The VAPID keys are NEVER in this repo. Pass them in the environment:
//
//   VAPID_PUBLIC=...  VAPID_PRIVATE=...  VAPID_SUBJECT=mailto:amirardekanian@gmail.com
//
// web-push is not a dependency of this repo either; install it outside the tree, the same rule the
// restore rehearsal follows for PGlite:
//
//   npm install web-push@3.6.7 --prefix "$TEMP/webpush"
//   NODE_PATH="$TEMP/webpush/node_modules" node scripts/pushtest/send.mjs --sub sub.json
//
// ⚠️ TTL. Firebase holds an undelivered message for four weeks by default, so a reminder sent at
// 20:00 to a phone with no signal can arrive at three in the morning a week later. Every real
// reminder must carry a short TTL. The default here is 2 hours, which is what the daily one would
// use; pass --ttl 60 to watch a message expire on purpose.

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let webpush;
try {
  webpush = require('web-push');
} catch {
  console.error('web-push is not installed. It is deliberately not a dependency of this repo:\n' +
    '  npm install web-push@3.6.7 --prefix "$TEMP/webpush"\n' +
    '  NODE_PATH="$TEMP/webpush/node_modules" node scripts/pushtest/send.mjs --sub sub.json');
  process.exit(2);
}

function arg(name, fallback = null) {
  const i = process.argv.indexOf('--' + name);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const subFile = arg('sub');
if (!subFile) {
  console.error('--sub <file.json> is required (the code the test page showed on the phone).');
  process.exit(2);
}

const { VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT } = process.env;
if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
  console.error('VAPID_PUBLIC and VAPID_PRIVATE must be in the environment. They are never committed.');
  process.exit(2);
}

let sub;
try {
  sub = JSON.parse(readFileSync(subFile, 'utf8'));
} catch (e) {
  console.error('Could not read ' + subFile + ': ' + e.message);
  process.exit(2);
}
if (!sub || !sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) {
  console.error('That file is not a push subscription. It needs endpoint and keys.p256dh / keys.auth.');
  process.exit(2);
}

webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:amirardekanian@gmail.com', VAPID_PUBLIC, VAPID_PRIVATE);

const ttl = Number(arg('ttl', 7200));
const payload = JSON.stringify({
  title: arg('title', 'Your day is still open'),
  body: arg('body', 'Tick what you did today.'),
  tag: arg('tag', 'pushtest'),
  sent: Date.now()          // the worker logs the lag, which is the number that matters
});

// Which push service is carrying it says a lot on its own: fcm/android.googleapis.com is Google's,
// web.push.apple.com is Apple's. Those are the two that may not be reachable from Iran.
const host = (() => { try { return new URL(sub.endpoint).host; } catch { return '?'; } })();

console.log('to      : ' + host);
console.log('ttl     : ' + ttl + 's');
console.log('payload : ' + payload);

try {
  const res = await webpush.sendNotification(sub, payload, { TTL: ttl, urgency: 'normal' });
  console.log('\nACCEPTED by the push service: HTTP ' + res.statusCode);
  console.log('That means it left here. Whether it reaches the phone is the phone\'s side of the');
  console.log('question, so ask what actually appeared, and when.');
} catch (e) {
  const code = e && e.statusCode;
  console.error('\nREFUSED: HTTP ' + code + ' ' + (e && e.body ? String(e.body).trim() : e.message));
  if (code === 404 || code === 410) {
    console.error('410/404 means this subscription is dead: the app was uninstalled, the permission was');
    console.error('revoked, or the browser rotated it. In the real thing the row gets deleted here.');
  } else if (code === 403) {
    console.error('403 usually means the VAPID keys do not match the public key the page subscribed with.');
  } else if (code === 413) {
    console.error('413 means the payload is too big. Keep it under about 3KB.');
  }
  process.exit(1);
}
