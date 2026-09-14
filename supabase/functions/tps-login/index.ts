// Creates, resets, revokes and restores logins for the Tennis Performance System course ("tps"),
// the paid Farsi handbook app at /tennis/app/ (its source is the private tps-content repo).
//
// A copy of assess-login (the testing app) with its own address prefix and table; read
// athlete-login's header before changing either. Buyers have no email here, so an account is keyed
// on tps.<username>@amirardekani.com, an address that never receives mail. Amir picks the username
// in coach.html; the app adds the rest when they sign in.
// verify_jwt is OFF deliberately: the platform accepts the publishable key as a "valid JWT".
// The real check is below: the bearer token must resolve to the coach.
//
// The password is generated, or typed by Amir in coach.html (create, reset, restore): then it must
// pass checkTyped() below, the same rule coach.html applies before sending it.
// create never touches an existing username (a typo must not reset another buyer's password).
// revoke BANS the user instead of deleting it, so restore can undo it. The course stores nothing
// about the buyer; the app deletes its offline copy of the handbook when it next sees the revoke.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const COACH_EMAIL  = 'amirardekanian@gmail.com';
const LOGIN_DOMAIN = 'amirardekani.com';
const PREFIX       = 'tps.';
const TABLE        = 'tps_accounts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

// Built to be read off one phone and typed into another (see athlete-login).
const WORDS = ('anchor amber apple arrow aspen atlas basil beacon birch bison blaze bloom brave brick bridge bronze camp cedar chase cliff cloud coast comet coral crane creek crest crown delta dune eagle ember falcon fern flame flint forest fox frost garnet glade globe grove harbor hawk hazel heron hollow ivory jade jasper jetty kite lagoon lantern larch ledge lily linen lotus maple marble meadow mesa mist moss nectar north oak ocean olive onyx opal orbit otter palm pebble pilot pine plume prism quarry quartz quill raven reef ridge river robin rowan sable sage sail sand shore silver slate solar spruce stone storm summit swift talon teak thistle tide timber topaz torch trail tulip tundra valley vault verge vista willow wind wolf woven zenith zephyr').split(' ');

function makePassword(): string {
  const pick = () => WORDS[crypto.getRandomValues(new Uint32Array(1))[0] % WORDS.length];
  const n = 10 + (crypto.getRandomValues(new Uint32Array(1))[0] % 90);
  return `${pick()}-${pick()}-${pick()}-${n}`;
}

// A password typed in coach.html. It gets typed again on the buyer's phone, often with a Farsi
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
  const { data: who, error: whoErr } = await createClient(url, anonKey).auth.getUser(token);
  if (whoErr || !who?.user?.email) return json({ error: 'not signed in' }, 401);
  if (who.user.email.toLowerCase() !== COACH_EMAIL) return json({ error: 'coach only' }, 403);

  let body: { action?: string; username?: string; label?: string; password?: string };
  try { body = await req.json(); } catch { return json({ error: 'bad JSON' }, 400); }

  const action   = String(body.action || '');
  const username = String(body.username || '').trim().toLowerCase();
  const label    = String(body.label || '').trim().slice(0, 80) || null;
  if (!/^[a-z0-9_]{3,32}$/.test(username)) return json({ error: 'bad username: 3-32 characters, a-z 0-9 _' }, 400);
  const typed = body.password == null || action === 'revoke' ? '' : String(body.password);
  const bad = typed ? checkTyped(typed, username) : '';
  if (bad) return json({ error: bad }, 400);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const now = new Date().toISOString();
  const { data: acct } = await admin.from(TABLE)
    .select('user_id, revoked_at').eq('username', username).maybeSingle();

  if (action === 'create') {
    if (acct?.user_id) return json({ error: 'username already taken' }, 409);
    const password = typed || makePassword();
    const { data: made, error: mkErr } = await admin.auth.admin.createUser({
      email: `${PREFIX}${username}@${LOGIN_DOMAIN}`, password,
      email_confirm: true,             // nobody can click a link at an address with no inbox
      user_metadata: { tps_username: username },
    });
    if (mkErr || !made?.user) return json({ error: mkErr?.message || 'could not create user' }, 400);
    const { error: linkErr } = await admin.from(TABLE).insert({
      user_id: made.user.id, username, label, initial_password: password, password_set_at: now,
    });
    if (linkErr) {
      // Never leave a login that maps to no account: it would sign in to an app with nothing to read.
      await admin.auth.admin.deleteUser(made.user.id);
      return json({ error: 'could not link account: ' + linkErr.message }, 400);
    }
    return json({ ok: true, username, password, created: true });
  }

  if (!acct?.user_id) return json({ error: 'no such login' }, 404);

  if (action === 'reset' || action === 'restore') {
    if (action === 'reset' && acct.revoked_at) return json({ error: 'login is revoked; restore it instead' }, 409);
    const password = typed || makePassword();
    const { error } = await admin.auth.admin.updateUserById(acct.user_id, { password, ban_duration: 'none' });
    if (error) return json({ error: error.message }, 400);
    await admin.from(TABLE).update({
      initial_password: password, password_set_at: now, sent_at: null, revoked_at: null,
    }).eq('user_id', acct.user_id);
    return json({ ok: true, username, password, created: false });
  }

  if (action === 'revoke') {
    const { error } = await admin.auth.admin.updateUserById(acct.user_id, { ban_duration: '876000h' });
    if (error) return json({ error: error.message }, 400);
    await admin.from(TABLE).update({ revoked_at: now, initial_password: null }).eq('user_id', acct.user_id);
    return json({ ok: true, revoked: true });
  }

  return json({ error: 'unknown action' }, 400);
});
