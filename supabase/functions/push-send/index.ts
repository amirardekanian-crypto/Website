// Sends the reminders that are due. Deliberately dumb.
//
// The DECISION — who is due a reminder, which kind, in which language, with what words — lives in
// public.push_due() in supabase/stage84_push.sql, because that is the part worth testing, and the
// rehearsal (scripts/push/rehearse_push.mjs) runs it. This function asks that question, carries the
// answers to Google and Apple, and writes down what happened. It decides nothing of its own.
//
// Called once an hour by pg_cron (through pg_net). An athlete's reminder goes at THEIR local hour, so
// an hourly run is what makes every time zone work from one job: push_due() only returns the phones
// for whom it is their hour right now.
//
// ⚠️ verify_jwt must be OFF for this function, for the reason athlete-login explains: the platform's
// check accepts the publishable key as a valid JWT, and every visitor to the site holds that. The real
// check is below — a shared secret in a header that only the cron job knows (PUSH_CRON_SECRET).
// A service-role key is NOT used for that, because the cron command is stored in the database and the
// key would be sitting in cron.job in plain text.
//
//   POST /push-send            send what is due
//   POST /push-send?dry=1      say what WOULD go, send nothing. Safe to run any time.
//
// Secrets it needs (Supabase → Edge Functions → Secrets):
//   VAPID_PUBLIC      the same key the apps subscribe with. If these two ever disagree, every push is
//                     refused with 403 and nothing else looks wrong.
//   VAPID_PRIVATE     never anywhere else. Not in the repo, not in the apps.
//   VAPID_SUBJECT     mailto: or https:, who a push service should contact about this sender.
//   PUSH_CRON_SECRET  the shared secret above.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { sendPush } from './webpush.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-push-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

interface Due {
  endpoint: string; p256dh: string; auth: string; athlete_id: string; kind: string;
  title: string; body: string; tag: string; ttl: number; day: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const secret = Deno.env.get('PUSH_CRON_SECRET') ?? '';
  const given = req.headers.get('x-push-key') ?? '';
  // Constant-time-ish: compare lengths first, then every character, so a wrong key cannot be found
  // one character at a time by timing the answer.
  const same = secret.length > 0 && given.length === secret.length &&
    given.split('').reduce((a, c, i) => a | (c.charCodeAt(0) ^ secret.charCodeAt(i)), 0) === 0;
  if (!same) return json({ error: 'no' }, 401);

  const publicKey = Deno.env.get('VAPID_PUBLIC') ?? '';
  const privateKey = Deno.env.get('VAPID_PRIVATE') ?? '';
  const subject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:amirardekanian@gmail.com';
  if (!publicKey || !privateKey) return json({ error: 'the VAPID keys are not set' }, 500);

  const db = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  const dry = new URL(req.url).searchParams.get('dry') === '1';

  const { data, error } = await db.rpc('push_due');
  if (error) return json({ error: 'push_due: ' + error.message }, 500);
  const due = (data ?? []) as Due[];

  // One notification per athlete per kind, however many phones they have: the ledger is marked once,
  // after every one of their phones has been tried.
  const groups = new Map<string, Due[]>();
  for (const d of due) {
    const k = `${d.athlete_id}|${d.kind}|${d.day}`;
    const g = groups.get(k);
    if (g) g.push(d); else groups.set(k, [d]);
  }

  if (dry) {
    return json({
      dry: true, phones: due.length, people: groups.size,
      // No athlete id and no endpoint: this answer is read from a browser.
      would: [...groups.values()].map(g => ({ kind: g[0].kind, title: g[0].title, phones: g.length })),
    });
  }

  let sent = 0, failed = 0, dropped = 0;
  const trouble: { status: number; body?: string }[] = [];

  for (const [, phones] of groups) {
    const payload = JSON.stringify({
      title: phones[0].title, body: phones[0].body, tag: phones[0].tag, sent: Date.now(),
    });
    let anyOk = false;
    for (const p of phones) {
      const r = await sendPush(
        { endpoint: p.endpoint, p256dh: p.p256dh, auth: p.auth },
        payload, { subject, publicKey, privateKey }, { ttl: p.ttl },
      );
      if (r.ok) { anyOk = true; sent++; }
      else if (r.gone) {
        // The subscription is dead: uninstalled, permission withdrawn, or the browser rotated it.
        // Deleting it is the whole handling — retrying it for ever is how a sender rots.
        dropped++;
        await db.rpc('push_drop', { p_endpoint: p.endpoint });
      } else {
        failed++;
        if (trouble.length < 5) trouble.push({ status: r.status, body: r.body });
      }
    }
    // One phone taking it is enough to call the day done: a second phone failing should not make the
    // same reminder arrive again an hour later. If EVERY phone failed, push_done(ok => false) stamps
    // the failure but writes no ledger row, so the next run tries once more — and since push_due()
    // still only fires at the athlete's own hour, "once more" is that evening, not a retry storm.
    await db.rpc('push_done', {
      p_athlete_id: phones[0].athlete_id, p_kind: phones[0].kind, p_day: phones[0].day, p_ok: anyOk,
    });
  }

  return json({ people: groups.size, sent, failed, dropped, trouble });
});
