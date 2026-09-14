// Creates, resets and revokes athlete logins.
//
// The password is generated (makePassword), or typed by Amir in coach.html for a single create or
// reset: then it must pass checkTyped() below, the same rule coach.html applies before sending it.
// create_many always generates.
//
// Athletes have no email address, so an account is keyed on an internal address
// athlete.<id>@amirardekani.com that never receives mail. The athlete types their
// username (their athlete id); the app adds the rest.
//
// The domain matters: Supabase validates that an email domain actually resolves,
// and rejected athletes.amirardekani.com outright ("email_address_invalid") because
// that subdomain has no DNS. amirardekani.com does resolve, so the namespacing moved
// into the local part instead. Do not "tidy" this back to a subdomain without
// checking that it validates, or every account creation will fail.
//
// Creating a user needs the service-role key, which must never reach a browser —
// hence this function. verify_jwt is OFF deliberately: the platform's check accepts
// the publishable key as a "valid JWT", and every visitor to the site holds that.
// The real check is below — resolve the bearer token to an actual user and require
// it to be the coach. Verified: no token, the legacy anon JWT, the modern
// publishable key and a garbage token are all rejected.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const COACH_EMAIL  = 'amirardekanian@gmail.com';
const LOGIN_DOMAIN = 'amirardekani.com';
const PREFIX       = 'athlete.';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

// Passwords get read off one phone and typed into another, so they are built to be
// transcribed: lowercase words, no ambiguous characters, one number. 3 words from
// 128 plus 2 digits is ~2e8 combinations — ample for an account holding training
// programmes, behind Supabase's own auth rate limiting.
const WORDS = ('anchor amber apple arrow aspen atlas basil beacon birch bison blaze bloom brave brick bridge bronze camp cedar chase cliff cloud coast comet coral crane creek crest crown delta dune eagle ember falcon fern flame flint forest fox frost garnet glade globe grove harbor hawk hazel heron hollow ivory jade jasper jetty kite lagoon lantern larch ledge lily linen lotus maple marble meadow mesa mist moss nectar north oak ocean olive onyx opal orbit otter palm pebble pilot pine plume prism quarry quartz quill raven reef ridge river robin rowan sable sage sail sand shore silver slate solar spruce stone storm summit swift talon teak thistle tide timber topaz torch trail tulip tundra valley vault verge vista willow wind wolf woven zenith zephyr').split(' ');

function makePassword(): string {
  const pick = () => WORDS[crypto.getRandomValues(new Uint32Array(1))[0] % WORDS.length];
  const n = 10 + (crypto.getRandomValues(new Uint32Array(1))[0] % 90);
  return `${pick()}-${pick()}-${pick()}-${n}`;
}

// A password typed in coach.html. It gets typed again on the athlete's phone, often with a Farsi
// keyboard one switch away, so only printable English characters: 8 to 72 of them (72 is the most
// bcrypt reads), no spaces. coach.html checks the same rule first; this is the check that counts.
// Returns what is wrong, or '' when it is fine.
function checkTyped(password: string, username: string): string {
  if (!/^[\x21-\x7E]{8,72}$/.test(password)) return 'password: 8-72 characters, English letters, numbers and symbols only, no spaces';
  if (password.toLowerCase() === username.toLowerCase()) return 'password must not be the same as the username';
  return '';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const url        = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey    = Deno.env.get('SUPABASE_ANON_KEY')!;

  // --- the only thing between anyone and an admin API -----------------------
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'not signed in' }, 401);

  const asCaller = createClient(url, anonKey);
  const { data: who, error: whoErr } = await asCaller.auth.getUser(token);
  // A publishable key resolves to no user at all — exactly the case the platform's
  // own verify_jwt would have waved through.
  if (whoErr || !who?.user?.email) return json({ error: 'not signed in' }, 401);
  if (who.user.email.toLowerCase() !== COACH_EMAIL) return json({ error: 'coach only' }, 403);

  let body: { action?: string; athlete_id?: string; athlete_ids?: string[]; password?: string };
  try { body = await req.json(); } catch { return json({ error: 'bad JSON' }, 400); }

  const action = String(body.action || '');
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const valid = (id: string) => /^[A-Za-z0-9_]{1,64}$/.test(id);

  // Make or reset one login, with the typed password or a generated one. Returns the password so
  // the caller can show it, and stores it on the identity row so a bulk run is not lost to a closed dialog.
  async function provision(athleteId: string, typed = '') {
    const email = `${PREFIX}${athleteId.toLowerCase()}@${LOGIN_DOMAIN}`;
    const password = typed || makePassword();

    const { data: existing } = await admin
      .from('athlete_identities').select('user_id').eq('athlete_id', athleteId).maybeSingle();

    if (existing?.user_id) {
      const { error } = await admin.auth.admin.updateUserById(existing.user_id, { password });
      if (error) return { athlete_id: athleteId, error: error.message };
      await admin.from('athlete_identities')
        .update({ initial_password: password, password_set_at: new Date().toISOString(), sent_at: null })
        .eq('athlete_id', athleteId);
      return { athlete_id: athleteId, username: athleteId, password, created: false };
    }

    const { data: made, error: mkErr } = await admin.auth.admin.createUser({
      email, password,
      email_confirm: true,             // nobody can click a link at an address with no inbox
      user_metadata: { athlete_id: athleteId },
    });
    if (mkErr || !made?.user) return { athlete_id: athleteId, error: mkErr?.message || 'could not create user' };

    const { error: linkErr } = await admin.from('athlete_identities').insert({
      user_id: made.user.id, athlete_id: athleteId, email,
      initial_password: password, password_set_at: new Date().toISOString(),
    });
    if (linkErr) {
      // Never leave an account that maps to nobody — that is a login which succeeds
      // and then shows an empty app.
      await admin.auth.admin.deleteUser(made.user.id);
      return { athlete_id: athleteId, error: 'could not link account: ' + linkErr.message };
    }
    return { athlete_id: athleteId, username: athleteId, password, created: true };
  }

  if (action === 'create' || action === 'reset') {
    const athleteId = String(body.athlete_id || '').trim();
    if (!valid(athleteId)) return json({ error: 'bad athlete_id' }, 400);
    const typed = body.password == null ? '' : String(body.password);
    const bad = typed ? checkTyped(typed, athleteId) : '';
    if (bad) return json({ error: bad }, 400);
    const r = await provision(athleteId, typed);
    if ('error' in r) return json({ error: r.error }, 400);
    return json({ ok: true, ...r });
  }

  // Bulk provisioning. Sequential on purpose: the admin API rate-limits, and a
  // burst of 45 parallel creates fails in ways that are tedious to unpick.
  if (action === 'create_many') {
    const ids = Array.isArray(body.athlete_ids) ? body.athlete_ids.map(String) : [];
    if (!ids.length) return json({ error: 'no athlete_ids' }, 400);
    if (ids.length > 100) return json({ error: 'too many at once' }, 400);
    if (!ids.every(valid)) return json({ error: 'bad athlete_id in list' }, 400);

    const results = [];
    for (const id of ids) results.push(await provision(id));
    return json({
      ok: true,
      created: results.filter(r => (r as any).created === true).length,
      reset:   results.filter(r => (r as any).created === false).length,
      failed:  results.filter(r => 'error' in r),
      results,
    });
  }

  if (action === 'revoke') {
    const athleteId = String(body.athlete_id || '').trim();
    if (!valid(athleteId)) return json({ error: 'bad athlete_id' }, 400);
    const { data: existing } = await admin
      .from('athlete_identities').select('user_id').eq('athlete_id', athleteId).maybeSingle();
    if (!existing?.user_id) return json({ ok: true, revoked: false });
    await admin.auth.admin.deleteUser(existing.user_id);   // cascades the identity row
    return json({ ok: true, revoked: true });
  }

  return json({ error: 'unknown action' }, 400);
});
