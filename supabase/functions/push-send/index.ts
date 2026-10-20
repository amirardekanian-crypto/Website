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
//   POST /push-send            send what is due: the reminders, the crew AND a published cycle
//   POST /push-send?only=crew  the crew only. What the 15-minute job calls (stage86).
//   POST /push-send?dry=1      say what WOULD go, send nothing. Safe to run any time.
//
// THE FOUR KINDS, and where each one is decided: habits and workout in push_due() (stage84, hourly,
// at the athlete's own hour), crew in crew_push_due() (stage86, every 15 minutes), cycle in
// cycle_push_due() (stage87, hourly). All four answer in the same columns, so the loop below carries
// them without knowing which is which; the only places this file can tell them apart are the three
// `kind ===` tests, because each kind writes down what it sent in its own way.
//
// THE CREW (stage86). public.crew_push_due() answers in exactly the same columns as push_due(), so
// everything below carries both without knowing the difference. Two things do differ, and they are
// the only two `kind === 'crew'` tests in this file: the crew's answer comes back from
// crew_push_done(), which moves a watermark rather than writing a day to a ledger; and a dry run asks
// for it with p_mark false, so saying what WOULD go never swallows an event.
// Until stage86 is applied that function does not exist, which is not a failure of the reminders: the
// error is read and ignored, and the hourly run carries on.
//
// WHERE THE KEYS LIVE. In public.push_config, a one-row table only the service role can read, NOT in
// Edge Function secrets. Two reasons: the hourly job needs the same shared secret, so one place means
// the two can never disagree; and it is one fewer thing for Amir to set by hand in a dashboard.
// Environment variables of the same names still win if they are set, so the keys can be moved into
// Supabase's own secret store later without touching this code.
//   url / secret                the sender's address and the shared secret the hourly job sends
//   vapid_public / vapid_private / vapid_subject
//
// ⚠️ push_config is deliberately NOT in BACKUP_TABLES: a weekly backup file on Amir's PC holding the
// private key and the shared secret is worse than losing them. Losing them is recoverable — generate
// a new pair, and each app re-subscribes silently the next time it opens, because the PERMISSION is
// already granted and only the key changes. That is the one thing that must not be lost.
// ⚠️ vapid_public must be the key the apps subscribe with (assets/js/push.js). If they ever disagree,
// every push is refused with 403 and nothing else looks wrong.

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

  const db = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  // The keys and the shared secret, from the table the hourly job also reads. An environment
  // variable of the same name wins, so they can be moved into Supabase's secret store later.
  const { data: cfgRow } = await db.from('push_config').select('*').eq('id', true).maybeSingle();
  const cfg = (cfgRow ?? {}) as Record<string, string | null>;
  const pick = (env: string, col: string) => Deno.env.get(env) || cfg[col] || '';

  const secret = pick('PUSH_CRON_SECRET', 'secret');
  const given = req.headers.get('x-push-key') ?? '';
  // Constant-time-ish: compare lengths first, then every character, so a wrong key cannot be found
  // one character at a time by timing the answer.
  const same = secret.length > 0 && given.length === secret.length &&
    given.split('').reduce((a, c, i) => a | (c.charCodeAt(0) ^ secret.charCodeAt(i)), 0) === 0;
  if (!same) return json({ error: 'no' }, 401);

  const publicKey = pick('VAPID_PUBLIC', 'vapid_public');
  const privateKey = pick('VAPID_PRIVATE', 'vapid_private');
  const subject = pick('VAPID_SUBJECT', 'vapid_subject') || 'mailto:amirardekanian@gmail.com';
  if (!publicKey || !privateKey) return json({ error: 'the VAPID keys are not set' }, 500);

  const params = new URL(req.url).searchParams;
  const dry = params.get('dry') === '1';
  const only = params.get('only') ?? '';

  const due: Due[] = [];
  if (only !== 'crew') {
    const { data, error } = await db.rpc('push_due');
    if (error) return json({ error: 'push_due: ' + error.message }, 500);
    due.push(...((data ?? []) as Due[]));
  }
  if (only === '' || only === 'crew') {
    // p_mark false on a dry run: decide everything, move no watermark.
    const { data, error } = await db.rpc('crew_push_due', dry ? { p_mark: false } : {});
    // Before stage86 is applied there is no such function. Anything else is a real error.
    if (error && !/does not exist|could not find|schema cache/i.test(error.message)) {
      return json({ error: 'crew_push_due: ' + error.message }, 500);
    }
    due.push(...((data ?? []) as Due[]));
  }
  if (only === '') {
    // "Your next cycle is ready" (stage87). On the HOURLY run only: a published cycle is a state that
    // stays true, so there is nothing to catch quickly, and the crew's 15-minute tick is left alone.
    const { data, error } = await db.rpc('cycle_push_due', dry ? { p_mark: false } : {});
    if (error && !/does not exist|could not find|schema cache/i.test(error.message)) {
      return json({ error: 'cycle_push_due: ' + error.message }, 500);
    }
    due.push(...((data ?? []) as Due[]));
  }

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
    // The crew's ledger is a watermark instead of a day, so it has its own one-line answer; a total
    // failure leaves the watermark where it was and the next 15-minute tick sends the same news.
    if (phones[0].kind === 'crew') {
      await db.rpc('crew_push_done', { p_athlete_id: phones[0].athlete_id, p_ok: anyOk });
    } else if (phones[0].kind === 'cycle') {
      // stage87's mark is which cycle they were told about, not a day in a ledger.
      await db.rpc('cycle_push_done', { p_athlete_id: phones[0].athlete_id, p_ok: anyOk });
    } else {
      await db.rpc('push_done', {
        p_athlete_id: phones[0].athlete_id, p_kind: phones[0].kind, p_day: phones[0].day, p_ok: anyOk,
      });
    }
  }

  return json({ people: groups.size, sent, failed, dropped, trouble });
});
