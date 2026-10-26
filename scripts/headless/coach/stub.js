// coach-harness/stub.js — a fake supabase-js v2 for driving coach.html in REAL (non-demo) mode.
//
// Injected with Playwright page.addInitScript() AFTER the seed (window.__HARNESS_SEED) and BEFORE any
// page script, so coach.html's `supabase.createClient(...)` gets this client. The jsDelivr script tag
// is routed to an empty body by run.js, so the CDN block does not matter.
//
// What it gives coach.html:
//   auth: getSession (a signed-in coach), onAuthStateChange (callbacks kept in window.__authCbs; fires
//         INITIAL_SESSION once after subscribe, like real supabase-js v2 does), signOut, signInWithOAuth
//   from(table): a chainable, thenable PostgREST-like builder over an in-memory DB (select/eq/neq/in/gte/
//         lte/gt/lt/is/order/limit/range/maybeSingle/single/insert/update/upsert/delete/match/not/or/filter)
//   rpc(name, params): the RPCs coach.html calls, emulated from the SQL in supabase/*.sql
//   functions.invoke(name, {body}): athlete-login / assess-login / tps-login emulation
//
// Knobs (window.__STUB, also settable before load via window.__HARNESS_SEED.stub):
//   maxRows      PostgREST max-rows cap (default 1000)
//   fail         [{ kind:'from'|'rpc'|'fn', name, op?, message, code?, times? }]  one-shot or N-shot errors. `code` is the database
//                error code (default P0001 for an rpc, XX000 for a table); code:'' is what supabase-js returns when the answer never
//                arrived (a dropped connection), where the write may or may not have gone in
//   rlsDeny      { table: ['update','delete','insert'] } -> zero rows touched, NO error (PostgREST behaviour)
//   delay        { name: ms } extra latency per table/rpc/function name
//   missingRpc   ['coach_save_spine', ...] -> those RPCs answer "Could not find the function" (PGRST202), like a server that has not had the stage applied
//   emitInitial  true (default) = fire INITIAL_SESSION after onAuthStateChange, as supabase-js v2 does
//   persist      true (default) = DB saved to localStorage '__harness_db' after every write, reloaded on boot
//
// Every call is recorded in window.__calls: { i, t, kind, name, op, filters, mods, payload, opts, result }.
// Everything here is MADE-UP data. Never seed it with real athlete data.
(function () {
  'use strict';
  var SEED = window.__HARNESS_SEED || {};
  var COACH = SEED.coachEmail || 'amirardekanian@gmail.com';
  var clone = function (v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); };
  var DB;
  try { var saved = localStorage.getItem('__harness_db'); DB = saved ? JSON.parse(saved) : null; } catch (e) { DB = null; }
  if (!DB) DB = clone(SEED.db || {});
  var ST = window.__STUB = Object.assign({ maxRows: 1000, fail: [], rlsDeny: {}, delay: {}, emitInitial: true, persist: true, seq: 1000 },
    SEED.stub || {});
  // The month's honours as the server would work them out (the stub does no maths): a fixture object, settable in a scenario as
  // window.__STUB.honoursLive = { sessions: {n, who: [ids]}, improved: {pct, who: [{athlete_id, lift, pct}]},
  //   full_month: {who: [{athlete_id, weeks}], near: [{athlete_id, held, weeks}]}, shortlist: [{slot, athlete_id, ...}] }.
  if (ST.honoursLive === undefined) ST.honoursLive = SEED.honoursLive || null;
  var CALLS = window.__calls = [];
  window.__DB = DB;
  window.__authCbs = [];

  var PK = {
    programs: ['athlete_id'], program_versions: ['id'], session_history: ['athlete_id', 'day', 'completed_on'],
    athlete_progress: ['athlete_id'], athlete_identities: ['athlete_id'], coaching_logs: ['athlete_id'],
    hab_notes: ['athlete_id', 'day'], hab_contacts: ['athlete_id'], hab_intake: ['id'], hab_titles: ['athlete_id', 'title'],
    leaderboard_optin: ['athlete_id'], seasons: ['id'], xp_rules: ['id'], call_logs: ['id'], affiliates: ['code'],
    library: ['slug'], library_categories: ['kind', 'id'], exercises: ['id'], exercise_coach: ['id'], qualities: ['id'],
    tps_accounts: ['username'], assess_accounts: ['username'], messages: ['id'], cycle_reports: ['id'], spine_versions: ['id'],
    assess_players: ['id'], assess_notes: ['id'], assess_results: ['player_id', 'test', 'day'],
    buyer_notes: ['user_id'], erasure_log: ['id'],
    // stage70 and stage75 (Career Mode / Courtside)
    career_facts: ['athlete_id', 'kind', 'ref'], career_catalogue: ['kind', 'id'], career_awards: ['athlete_id', 'award_id'],
    courtside_marks: ['athlete_id', 'award_id'], career_honour_months: ['month'], career_honours: ['month', 'honour', 'athlete_id'],
    career_goals: ['athlete_id', 'month'], career_notes: ['athlete_id', 'day'],
  };
  // stage75's own tables and functions: a server that has not had that stage applied has none of them, so `missingRpc: ['get_courtside']` takes
  // all of them away together (the page then shows no Courtside and no warning).
  var COURT_TABLES = ['courtside_marks', 'career_honour_months', 'career_honours', 'career_goals', 'career_notes'];
  var COURT_RPCS = ['get_courtside', 'coach_courtside_mark', 'coach_honours', 'coach_honours_freeze', 'coach_honours_sent', 'coach_honours_pick',
    'coach_set_goal', 'coach_goal_done', 'coach_from_amir'];
  // stage104 (the month's honours wait for Amir): the stub answers as the stage does only when the seed says `honoursConfirm: true`, so every other scenario runs
  // against a server before stage104 (no `confirmed`, every row live for the athletes) as before. `missingRpc: ['coach_honour_confirm']` takes it away again.
  function s101() { return !!SEED.honoursConfirm && (ST.missingRpc || []).indexOf('coach_honour_confirm') < 0; }
  function noStage75() { return (ST.missingRpc || []).indexOf('get_courtside') >= 0; }
  // stage81's functions (the Bell). The stub answers them only when the seed says `crew: true` (buildSeed({crew: true})), so every other scenario runs
  // against a server that has not had stage81, as before; `missingRpc: ['coach_crew']` takes them away again (the page draws no Bell).
  // get_bell and coach_crew_remove_reply are stage92's way to read and remove a reply; they come and go with the Bell here (a server without stage81 has neither).
  var CREW_RPCS = ['coach_crew', 'coach_crew_post', 'coach_crew_remove', 'coach_crew_under13', 'crew_photo', 'get_bell', 'coach_crew_remove_reply'];
  function noStage81() { return !SEED.crew || (ST.missingRpc || []).indexOf('coach_crew') >= 0; }
  // stage85's functions (the Monthly Open). Answered only when the seed says `open: true` (buildSeed({open: true}), which also turns stage81 on: stage85 needs it), so
  // every other scenario runs against a server that has not had stage85; `missingRpc: ['coach_open']` takes them away from a seeded run too, and
  // `window.__STUB.openNull = true` makes coach_open() answer nothing at all (a null, no error).
  var OPEN_RPCS = ['coach_open', 'coach_open_set', 'coach_open_close', 'coach_open_result', 'coach_open_remove'];
  function noStage84() { return !SEED.open || (ST.missingRpc || []).indexOf('coach_open') >= 0; }
  // The Players' Lounge (CONTRACT.md, 2026-10-24). stage96's coach functions (faces, cheers) and its table athlete_profile answer only when the seed says
  // `lounge: true` (buildSeed({lounge: true})); stage97's partner-code functions only with `partner: true`. Otherwise every one answers "Could not find
  // the function" (PGRST202) and athlete_profile "Could not find the table" (PGRST205), like a server that has not had the stage. `missingRpc: [name]` takes one away.
  var LOUNGE_RPCS = ['coach_crew_faces', 'coach_crew_face_clear', 'coach_cheer', 'coach_crew_cheers', 'coach_cheer_word_clear'];
  var PARTNER_RPCS = ['coach_partner_codes', 'coach_partner_code_make', 'coach_partner_credit_add', 'coach_partner_credit_used'];
  // stage102's coach functions (the weekly crew) answer only with `weekly: true` in the seed (buildSeed({weekly: true})).
  var WEEKLY_RPCS = ['coach_crew_weekly', 'coach_crew_week_set', 'coach_crew_week_close', 'coach_question_answer', 'coach_question_drop'];
  function noStage102() { return !SEED.weekly; }
  function noStage96() { return !SEED.lounge; }
  function noStage97() { return !SEED.partner; }
  function persist() { if (ST.persist) { try { localStorage.setItem('__harness_db', JSON.stringify(DB)); } catch (e) {} } }
  function tbl(name) { return DB[name] || (DB[name] = []); }
  function nowIso() { return new Date().toISOString(); }
  function utcDate() { return new Date().toISOString().slice(0, 10); }   // Postgres CURRENT_DATE on a UTC server
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function takeFail(kind, name, op) {
    for (var i = 0; i < ST.fail.length; i++) {
      var f = ST.fail[i];
      if (f.kind === kind && f.name === name && (!f.op || f.op === op)) {
        if (f.times != null) { f.times--; if (f.times <= 0) ST.fail.splice(i, 1); }
        return f;
      }
    }
    return null;
  }
  function record(c) { c.i = CALLS.length; c.t = Date.now(); CALLS.push(c); return c; }

  // ---- comparisons the way PostgREST casts them (text compare unless both sides are numbers) ----
  function cmp(a, b) {
    if (a == null || b == null) return a == null && b == null ? 0 : (a == null ? -1 : 1);
    var na = Number(a), nb = Number(b);
    if (typeof a !== 'boolean' && a !== '' && b !== '' && !isNaN(na) && !isNaN(nb) && !/^\d{4}-\d{2}-\d{2}/.test(String(a))) return na - nb;
    a = String(a); b = String(b); return a < b ? -1 : a > b ? 1 : 0;
  }
  function eqv(a, b) { if (typeof a === 'boolean' || typeof b === 'boolean') return String(a) === String(b); return a != null && b != null && cmp(a, b) === 0; }
  function opTest(op, v, arg) {
    switch (op) {
      case 'eq': return eqv(v, arg);
      case 'neq': return !eqv(v, arg);
      case 'gt': return v != null && cmp(v, arg) > 0;
      case 'gte': return v != null && cmp(v, arg) >= 0;
      case 'lt': return v != null && cmp(v, arg) < 0;
      case 'lte': return v != null && cmp(v, arg) <= 0;
      case 'is': return (arg === null || arg === 'null') ? v == null : String(v) === String(arg);
      case 'in': { var list = Array.isArray(arg) ? arg : String(arg).replace(/^\(|\)$/g, '').split(','); return list.some(function (x) { return eqv(v, x); }); }
      // LIKE as PostgreSQL has it: % is any run of characters INCLUDING newlines (a session's summary is many lines), _ is one character.
      case 'like': case 'ilike': { var re = new RegExp('^' + String(arg).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '[\\s\\S]*').replace(/_/g, '[\\s\\S]') + '$', op === 'ilike' ? 'i' : ''); return re.test(String(v == null ? '' : v)); }
      default: throw new Error('stub: unsupported operator ' + op);
    }
  }
  function parseOr(s) {   // 'coach_status.is.null,coach_status.eq.new'
    return String(s).split(',').map(function (part) {
      var m = part.match(/^([^.]+)\.(not\.)?([a-z]+)\.(.*)$/);
      if (!m) throw new Error('stub: cannot parse or() ' + part);
      return { col: m[1], neg: !!m[2], op: m[3], arg: m[4] === 'null' ? null : m[4] };
    });
  }

  function Builder(table) {
    this.table = table; this.op = 'select'; this.cols = '*'; this.filters = []; this.fdesc = [];
    this.ord = []; this.rng = null; this.lim = null; this.mode = null; this.payload = null; this.opts = null;
    this.returning = false; this.countOpt = null; this.head = false;
  }
  var B = Builder.prototype;
  B._f = function (desc, fn) { this.filters.push(fn); this.fdesc.push(desc); return this; };
  B.select = function (cols, o) {
    if (this.op === 'select') { this.cols = cols || '*'; if (o) { this.countOpt = o.count || null; this.head = !!o.head; } }
    else { this.returning = true; this.retCols = cols || '*'; }
    return this;
  };
  ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike'].forEach(function (op) {
    B[op] = function (col, v) { return this._f(col + '.' + op + '.' + JSON.stringify(v), function (r) { return opTest(op, r[col], v); }); };
  });
  B.is = function (col, v) { return this._f(col + '.is.' + v, function (r) { return opTest('is', r[col], v); }); };
  B.in = function (col, list) { return this._f(col + '.in.' + JSON.stringify(list), function (r) { return opTest('in', r[col], list); }); };
  B.match = function (obj) { var self = this; Object.keys(obj).forEach(function (k) { self.eq(k, obj[k]); }); return this; };
  B.not = function (col, op, v) { return this._f(col + '.not.' + op + '.' + v, function (r) { return !opTest(op, r[col], v); }); };
  B.filter = function (col, op, v) { return this._f(col + '.' + op + '.' + v, function (r) { return opTest(op, r[col], v); }); };
  B.or = function (s) {
    var parts = parseOr(s);
    return this._f('or(' + s + ')', function (r) { return parts.some(function (p) { var t = opTest(p.op, r[p.col], p.arg); return p.neg ? !t : t; }); });
  };
  B.order = function (col, o) { this.ord.push({ col: col, asc: !o || o.ascending !== false }); return this; };
  B.limit = function (n) { this.lim = n; return this; };
  B.range = function (a, b) { this.rng = [a, b]; return this; };
  B.maybeSingle = function () { this.mode = 'maybe'; return this; };
  B.single = function () { this.mode = 'single'; return this; };
  B.insert = function (rows, o) { this.op = 'insert'; this.payload = rows; this.opts = o || null; return this; };
  B.update = function (patch, o) { this.op = 'update'; this.payload = patch; this.opts = o || null; return this; };
  B.upsert = function (rows, o) { this.op = 'upsert'; this.payload = rows; this.opts = o || null; return this; };
  B.delete = function (o) { this.op = 'delete'; this.opts = o || null; return this; };
  B.abortSignal = function () { return this; };
  B.then = function (ok, bad) { return this._run().then(ok, bad); };
  B.catch = function (bad) { return this._run().catch(bad); };

  function project(row, cols) {
    if (!cols || cols.trim() === '*') return clone(row);
    var out = {};
    cols.split(',').map(function (c) { return c.trim(); }).filter(Boolean).forEach(function (c) {
      if (c === '*') Object.assign(out, clone(row)); else out[c] = clone(row[c]);
    });
    return out;
  }
  function keyOf(table, row, conflict) {
    var cols = conflict ? String(conflict).split(',').map(function (s) { return s.trim(); }) : (PK[table] || ['id']);
    return cols.map(function (c) { return String(row[c]); }).join('|');
  }

  // ---- table triggers, from information_schema.triggers on the live DB ----
  function beforeUpdate(table, oldRow, newRow) {
    if (table === 'programs') {           // programs_version_trg -> programs_version_snapshot()
      if (JSON.stringify(oldRow.data) !== JSON.stringify(newRow.data)) {
        var pv = tbl('program_versions');
        pv.push({ id: ++ST.seq, athlete_id: oldRow.athlete_id, data: clone(oldRow.data), saved_at: nowIso(), saved_by: oldRow.updated_by || null, note: null });
        var mine = pv.filter(function (v) { return v.athlete_id === oldRow.athlete_id; }).sort(function (a, b) { return b.id - a.id; });
        mine.slice(20).forEach(function (v) { pv.splice(pv.indexOf(v), 1); });
      }
      newRow.updated_at = nowIso(); newRow.updated_by = COACH;
    }
    if (table === 'affiliates' || table === 'coaching_logs' || table === 'library') newRow.updated_at = nowIso();
    if (table === 'exercises' || table === 'qualities') newRow.updated_at = nowIso();   // stage46: touch_updated_at()
    keepSpineVersion(table, oldRow, newRow, COACH);
  }
  // stage49: spine_keep_version(). The row as it was, plus { column: the value it became } for every column that
  // really changed (updated_at / updated_by do not count). `who` is the signed-in email, or 'sql' for a write
  // with none (Claude's /spine, the SQL editor).
  function canon(v) {
    if (Array.isArray(v)) return v.map(canon);
    if (v && typeof v === 'object') { var o = {}; Object.keys(v).sort().forEach(function (k) { o[k] = canon(v[k]); }); return o; }
    return v === undefined ? null : v;
  }
  var same = function (a, b) { return JSON.stringify(canon(a)) === JSON.stringify(canon(b)); };
  function keepSpineVersion(table, oldRow, newRow, who) {
    if (['exercises', 'exercise_coach', 'qualities'].indexOf(table) < 0) return;
    var ch = {};
    Object.keys(Object.assign({}, oldRow, newRow)).forEach(function (k) { if (k !== 'updated_at' && k !== 'updated_by' && !same(oldRow[k], newRow[k])) ch[k] = clone(newRow[k] === undefined ? null : newRow[k]); });
    if (!Object.keys(ch).length) return;
    tbl('spine_versions').push({ id: ++ST.seq, tbl: table, row_id: oldRow.id, op: 'update', data: clone(oldRow), changed: ch,
      saved_at: nowIso(), saved_by: who, was_updated_at: oldRow.updated_at || null });
  }
  // Claude's /spine Upkeep, or any SQL with no signed-in user: a write that fires the trigger as 'sql'.
  window.__sqlWrite = function (table, id, patch) {
    var rows = tbl(table), at = rows.findIndex(function (r) { return r.id === id; });
    if (at < 0) throw new Error('__sqlWrite: no ' + table + ' row ' + id);
    var nr = Object.assign({}, rows[at], clone(patch));
    if (table === 'exercises' || table === 'qualities') nr.updated_at = nowIso();
    keepSpineVersion(table, rows[at], nr, 'sql');
    rows[at] = nr; persist();
  };

  B._run = async function () {
    var self = this, table = this.table, op = this.op;
    var call = record({ kind: 'from', name: table, op: op, filters: this.fdesc.slice(), payload: clone(this.payload), opts: clone(this.opts),
      mods: { cols: this.cols, order: this.ord.slice(), range: this.rng, limit: this.lim, mode: this.mode, returning: this.returning, count: this.countOpt } });
    if (ST.delay[table]) await sleep(ST.delay[table]);
    await sleep(0);
    var f = takeFail('from', table, op);
    if (f) { call.result = { error: f.message }; return { data: null, error: { message: f.message, code: f.code != null ? f.code : 'XX000' }, status: f.status || 400, count: null }; }
    // A table the server does not have (PostgREST's schema-cache answer): stage75's five while that stage is missing, or any in ST.missingTables.
    if ((noStage75() && COURT_TABLES.indexOf(table) >= 0) || (noStage96() && table === 'athlete_profile') || (noStage97() && table === 'referral_credits') || (ST.missingTables || []).indexOf(table) >= 0) {
      call.result = { error: 'missing' };
      return { data: null, error: { message: "Could not find the table 'public." + table + "' in the schema cache", code: 'PGRST205' }, status: 404, count: null };
    }
    var rows = tbl(table);
    var match = function (r) { return self.filters.every(function (fn) { return fn(r); }); };
    var denied = (ST.rlsDeny[table] || []).indexOf(op) >= 0;
    var out;
    if (op === 'select') {
      var res = rows.filter(match);
      var total = res.length;
      if (this.ord.length) res = res.slice().sort(function (a, b) {
        for (var i = 0; i < self.ord.length; i++) { var o = self.ord[i]; var c = cmp(a[o.col], b[o.col]); if (c) return o.asc ? c : -c; } return 0;
      });
      var from = 0, to = res.length - 1;
      if (this.rng) { from = this.rng[0]; to = this.rng[1]; }
      if (this.lim != null) to = Math.min(to, from + this.lim - 1);
      to = Math.min(to, from + ST.maxRows - 1);                         // PostgREST max-rows
      res = res.slice(from, to + 1).map(function (r) { return project(r, self.cols); });
      if (this.mode === 'maybe' || this.mode === 'single') {
        if (res.length > 1) { out = { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' } }; }
        else if (!res.length && this.mode === 'single') out = { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' } };
        else out = { data: res[0] || null, error: null };
      } else out = { data: this.head ? null : res, error: null, count: this.countOpt ? total : null };
      call.result = { rows: Array.isArray(out.data) ? out.data.length : (out.data ? 1 : 0), error: out.error && out.error.message };
      // Test hook: simulate something else writing between two reads (e.g. an UPDATE moving a tuple).
      if (typeof ST.afterSelect === 'function') { try { ST.afterSelect(table, call, DB); } catch (e) {} }
      return Object.assign({ status: 200 }, out);
    }
    var touched = [];
    if (op === 'update') {
      if (!denied) rows.forEach(function (r, i) {
        if (!match(r)) return;
        var nr = Object.assign({}, r, clone(self.payload));
        beforeUpdate(table, r, nr);
        rows[i] = nr; touched.push(nr);
      });
    } else if (op === 'delete') {
      if (!denied) for (var i = rows.length - 1; i >= 0; i--) if (match(rows[i])) { touched.push(rows[i]); rows.splice(i, 1); }
    } else if (op === 'insert' || op === 'upsert') {
      var list = Array.isArray(this.payload) ? this.payload : [this.payload];
      var conflict = this.opts && this.opts.onConflict;
      for (var j = 0; j < list.length; j++) {
        var row = clone(list[j]);
        var k = keyOf(table, row, conflict);
        var at = rows.findIndex(function (r) { return keyOf(table, r, conflict) === k; });
        if (at >= 0) {
          if (op === 'insert') { call.result = { error: 'duplicate key' }; return { data: null, error: { message: 'duplicate key value violates unique constraint "' + table + '_pkey"', code: '23505' }, status: 409 }; }
          if (denied) continue;
          var merged = Object.assign({}, rows[at], row);
          beforeUpdate(table, rows[at], merged);
          rows[at] = merged; touched.push(merged);
        } else {
          if (denied) continue;
          if (table === 'programs') { row.updated_at = row.updated_at || nowIso(); row.updated_by = row.updated_by || COACH; }
          if (row.created_at === undefined && /affiliates|hab_intake|call_logs/.test(table)) row.created_at = nowIso();
          if (table === 'affiliates' && row.active === undefined) row.active = true;
          rows.push(row); touched.push(row);
        }
      }
    }
    persist();
    call.result = { touched: touched.length };
    if (this.returning) return { data: touched.map(function (r) { return project(r, self.retCols); }), error: null, status: 200 };
    return { data: null, error: null, status: op === 'insert' || op === 'upsert' ? 201 : 204, count: null };
  };

  // ---- RPCs, emulated from their SQL (supabase/*.sql and pg_proc on the live DB) ----
  function habDays(blob, id) {
    var raw = blob && blob[id + '_hab_log']; var log = raw; try { if (typeof raw === 'string') log = JSON.parse(raw); } catch (e) { log = null; }
    return log && typeof log === 'object' ? Object.keys(log).filter(function (k) { var v = log[k]; return v && typeof v === 'object' && Object.keys(v).length; }).length : 0;
  }
  // ---- stage75: Courtside, the monthly honours, the monthly goal and "From Amir" (supabase/stage75_career_courtside.sql) ----
  // The caller is always the coach (is_coach() is implied). "current_date" is the server's UTC date, as everywhere in this stub.
  var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var monthStart = function (d) { return String(d).slice(0, 7) + '-01'; };                                 // date_trunc('month', d)::date
  var monthLabel = function (m0) { return MONTH_NAMES[+String(m0).slice(5, 7) - 1] + ' ' + String(m0).slice(0, 4); };   // to_char(m0, 'FMMonth YYYY')
  var plusMonths = function (m0, n) { return new Date(Date.UTC(+m0.slice(0, 4), +m0.slice(5, 7) - 1 + n, 1)).toISOString().slice(0, 10); };
  var plusDays = function (day, n) { return new Date(Date.parse(day + 'T00:00:00Z') + n * 86400e3).toISOString().slice(0, 10); };
  var tidy = function (s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); };               // btrim(regexp_replace(coalesce(p, ''), '\s+', ' ', 'g'))
  var hasProgramme = function (id) { return tbl('programs').some(function (r) { return r.athlete_id === id; }); };
  // career_is_client(id, p_not_clients): not the demo, not an id the page names as no client (coach.html passes SYSTEM_IDS and its own identity,
  // COURT_NOT_CLIENTS), not a former athlete. coach_from_amir() calls it with no list.
  function isClient(id, notClients) {
    id = id == null ? '' : String(id);
    return ['', 'demo'].indexOf(id) < 0 && (notClients || []).indexOf(id) < 0 && !tbl('athlete_status').some(function (s) { return s.athlete_id === id && s.status === 'former'; });
  }
  // career_award_spec(): the name and caption come from the catalogue row's body, {n} is the evidence's n rounded.
  function awardSpec(a, body) {
    body = body || {};
    var n = a.evidence && a.evidence.n != null ? Math.round(Number(a.evidence.n)) : null, cap = body.caption != null ? String(body.caption) : null;
    if (cap != null && n != null) cap = cap.split('{n}').join(String(n));
    if (a.kind === 'badge') {
      var tb = body.tiers && a.tier ? body.tiers[a.tier - 1] : null;
      return { kind: 'badge', name: body.name || a.item, meaning: body.meaning || null, metal: (tb && tb.metal) || null, tier: a.tier, n: n, caption: cap, date: a.day };
    }
    return { kind: 'achievement', name: body.name || a.item, meaning: body.meaning || null, caption: cap, date: a.day };
  }
  // career_honours_live(m0, p_not_clients): the fixture, in the function's shape, with every winner who is not a client left out (the real
  // function only looks at clients). The count `n` / `pct` is the fixture's, not recomputed.
  function liveHonours(m0, notClients) {
    var h = clone(ST.honoursLive) || {}, ok = function (id) { return isClient(id, notClients); }, ids = function (l) { return (l || []).filter(ok); };
    var rows = function (l) { return (l || []).filter(function (e) { return ok(e.athlete_id); }); };
    return { month: m0, sessions: { n: h.sessions ? h.sessions.n : null, who: ids(h.sessions && h.sessions.who) },
      improved: { pct: h.improved ? h.improved.pct : null, who: rows(h.improved && h.improved.who) },
      full_month: { who: rows(h.full_month && h.full_month.who), near: rows(h.full_month && h.full_month.near) }, shortlist: rows(h.shortlist) };
  }
  // coach_honours(): the frozen rows once frozen, else the live work; only a month that has ended.
  function honoursOf(p_month, notClients) {
    var m0 = monthStart(p_month), cur = monthStart(utcDate());
    if (s101() ? !honoursOpen(m0) : m0 >= cur) throw new Error('coach_honours: ' + monthLabel(m0) + ' has not ended yet');
    var vm = tbl('career_honour_months').find(function (r) { return r.month === m0; }) || null;
    var rows = tbl('career_honours').filter(function (h) { return h.month === m0; })
      .sort(function (a, b) { return a.honour < b.honour ? -1 : a.honour > b.honour ? 1 : a.athlete_id < b.athlete_id ? -1 : a.athlete_id > b.athlete_id ? 1 : 0; })
      .map(function (h) { var o = { honour: h.honour, athlete_id: h.athlete_id, value: clone(h.value), sent_at: h.sent_at || null }; if (s101()) o.confirmed_at = h.confirmed_at || null; return o; });
    if (s101()) {
      var cf = vm && vm.confirmed ? vm.confirmed : {}, need = !vm || vm.pick == null || !(cf.sessions && cf.improved && cf.full_month);
      var lv = need ? liveHonours(m0, notClients) : null;
      return { month: m0, frozen: !!vm, frozen_at: vm ? vm.frozen_at : null, pick: vm ? vm.pick : null, pick_at: vm ? vm.pick_at : null,
        pick_open: utcDate() < plusMonths(m0, 2), rows: rows, confirmed: clone(cf), ended: utcDate() >= plusMonths(m0, 1), live: lv,
        shortlist: vm && vm.pick != null ? null : lv.shortlist };
    }
    var live = !vm || vm.pick == null ? liveHonours(m0, notClients) : null;
    return { month: m0, frozen: !!vm, frozen_at: vm ? vm.frozen_at : null, pick: vm ? vm.pick : null, pick_at: vm ? vm.pick_at : null,
      pick_open: utcDate() < plusMonths(m0, 2), rows: rows, live: vm ? null : live, shortlist: vm && vm.pick != null ? null : live.shortlist };
  }
  // career_honours_open(): a month can be read and confirmed from its last day.
  function honoursOpen(m0) { return utcDate() >= plusDays(plusMonths(m0, 1), -1); }
  function freezeHonours(p_month, notClients) {
    var m0 = monthStart(p_month);
    if (s101() ? !honoursOpen(m0) : m0 >= monthStart(utcDate())) throw new Error('coach_honours_freeze: ' + monthLabel(m0) + ' has not ended yet');
    if (tbl('career_honour_months').some(function (r) { return r.month === m0; })) return honoursOf(m0, notClients);   // idempotent
    var v = liveHonours(m0, notClients), add = function (honour, id, value) { tbl('career_honours').push({ month: m0, honour: honour, athlete_id: id, value: value, sent_at: null, created_at: nowIso(), confirmed_at: null }); };
    tbl('career_honour_months').push(s101() ? { month: m0, frozen_at: nowIso(), pick: null, pick_at: null, confirmed: {} } : { month: m0, frozen_at: nowIso(), pick: null, pick_at: null });
    v.sessions.who.forEach(function (id) { add('sessions', id, { n: v.sessions.n }); });
    v.improved.who.forEach(function (e) { add('improved', e.athlete_id, { lift: e.lift, pct: e.pct }); });
    v.full_month.who.forEach(function (e) { add('full_month', e.athlete_id, { weeks: e.weeks }); });
    v.full_month.near.forEach(function (e) { add('near', e.athlete_id, { held: e.held, weeks: e.weeks }); });
    return honoursOf(m0, notClients);
  }

  // The Bell's state (stage81): posts as coach_crew() returns them, but with `ago_min` (how old, in minutes, on the page's clock) in place of `at`;
  // people as coach_crew() returns them; photos by post id. Tests read and change it as window.__DB.crew_bell.
  function bell() { return DB.crew_bell || (DB.crew_bell = { posts: [], people: [], photos: {}, rings_week: 0 }); }
  function bellSweep() {   // crew_sweep(): a post goes 7 days after it was made, and its replies go with it (on delete cascade)
    var c = bell(); c.posts = c.posts.filter(function (p) { return p.ago_min <= 7 * 1440; });
    c.replies = (c.replies || []).filter(function (r) { return c.posts.some(function (p) { return p.id === r.post_id; }); });
    return c;
  }
  var BELL_OK = 'crew:';
  // The Open's state (stage85): every challenge ever set (the live one has no closed_at), every confirmed result, the Bell lines a result rang. Tests read and
  // change it as window.__DB.crew_open_state. The crew is crew_members(): a yes (the Bell's people), not under 13, not a former athlete, not the demo,
  // named by the board name, else the default name (first name and the last name's initial).
  function openState() { return DB.crew_open_state || (DB.crew_open_state = { challenges: [], results: [], rings: [] }); }
  function openLive() {
    var live = openState().challenges.filter(function (x) { return !x.closed_at; });
    live.sort(function (a, b) { return a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0; });   // the newest row with no closed_at
    return live[0] || null;
  }
  function openCrew() {
    var former = function (id) { return tbl('athlete_status').some(function (s) { return s.athlete_id === id && s.status === 'former'; }); };
    return bell().people.filter(function (p) { return p.answer === 'yes' && !p.under13 && p.athlete_id !== 'demo' && !former(p.athlete_id); }).map(function (p) {
      var o = tbl('leaderboard_optin').find(function (r) { return r.athlete_id === p.athlete_id; }), pr = tbl('programs').find(function (r) { return r.athlete_id === p.athlete_id; });
      var a = (pr && pr.data && pr.data.athlete) || {}, last = String(a.lastName || '').replace(/^ +| +$/g, '');
      var def = pr ? (a.firstName ? a.firstName + (last ? ' ' + last.charAt(0).toUpperCase() + '.' : '') : 'Athlete').slice(0, 24) : null;
      return { athlete_id: p.athlete_id, name: (o && String(o.display_name || '').replace(/^ +| +$/g, '')) || def || 'Athlete', kinds_off: p.kinds_off || [] };
    });
  }
  // A write answers coach_open()'s shape too; `openWriteNull` makes it answer nothing after doing its work (a lost answer, a proxy that drops the body).
  function openOut() { if (ST.openWriteNull > 0) { ST.openWriteNull--; return null; } return openAnswer(); }
  // coach_open(): the live challenge, every result he confirmed (crew member or not; `who` is the athlete id when they are not in the crew, as the SQL's
  // coalesce(m.name, res.athlete_id)), the last five closed challenges, the crew to pick from.
  function openAnswer() {
    var s = openState(), o = openLive(), crew = openCrew(), by = {};
    crew.forEach(function (m) { by[m.athlete_id] = m; });
    var key = function (v) { return o && o.better === 'low' ? Number(v) : -Number(v); };
    var rows = !o ? [] : s.results.filter(function (r) { return r.open_id === o.id; }).sort(function (a, b) {
      return (key(a.value) - key(b.value)) || (a.athlete_id < b.athlete_id ? -1 : a.athlete_id > b.athlete_id ? 1 : 0); });
    // closed_at desc, limit 5 (two closed in the same instant: the one made later first; the SQL leaves that to chance, the stub must not)
    var past = s.challenges.filter(function (x) { return x.closed_at; }).sort(function (a, b) {
      return a.closed_at < b.closed_at ? 1 : a.closed_at > b.closed_at ? -1 : s.challenges.indexOf(b) - s.challenges.indexOf(a); }).slice(0, 5);
    return {
      open: o ? { id: o.id, title: o.title, how: o.how, unit: o.unit, better: o.better, opened_on: o.opened_on } : null,
      results: rows.map(function (r) { return { athlete_id: r.athlete_id, who: by[r.athlete_id] ? by[r.athlete_id].name : r.athlete_id, in_crew: !!by[r.athlete_id], value: r.value, day: r.day }; }),
      past: past.map(function (x) { return { id: x.id, title: x.title, unit: x.unit, opened_on: x.opened_on, closed_at: x.closed_at, n: s.results.filter(function (r) { return r.open_id === x.id; }).length }; }),
      crew: crew.map(function (m) { return { athlete_id: m.athlete_id, who: m.name }; }).sort(function (a, b) { return a.who < b.who ? -1 : a.who > b.who ? 1 : 0; }),
      at: nowIso() };
  }
  // The Players' Lounge's state (stage96): the faces as coach_crew_faces() returns them, the cheers as coach_crew_cheers() returns them (all of them, with the
  // day; the read lists the last 7). Tests read and change it as window.__DB.lounge. A member is a crew_members() person: a yes, not under 13, not a former
  // athlete, not the demo (the server takes a face, a cheer given or received and a mention away when someone leaves; the stub just does not list them).
  // stage102's state: the object coach_crew_weekly() answers, kept in window.__DB.crew_weekly (tests read and change it).
  function weekly() { return DB.crew_weekly || (DB.crew_weekly = { week: utcDate(), weeks: [], members: 0, questions: [], answered_month: 0 }); }
  function weeklyOut() { return clone(weekly()); }
  function lounge() { return DB.lounge || (DB.lounge = { faces: [], cheers: [], seq: 100 }); }
  function loungeMember(id) { return openCrew().some(function (m) { return m.athlete_id === id; }); }
  function loungeName(id) { var m = openCrew().find(function (x) { return x.athlete_id === id; }); return m ? m.name : id; }
  function ymdBack(day, n) { var p = day.split('-'), d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); }
  var normCodeS = function (v) { return String(v == null ? '' : v).replace(/\s+/g, '').toUpperCase(); };
  // The intakes that typed a code (stage97's `uses`): the "Discount Code" field or the first word of "Discount Applied", archived ones left out.
  function partnerUses(code) {
    return tbl('hab_intake').filter(function (i) {
      if ((i.status || 'new') === 'archived') return false;
      var p = i.payload || {};
      return normCodeS(p['Discount Code']) === code || normCodeS(String(p['Discount Applied'] || '').split(' ')[0]) === code;
    });
  }
  function partnerCredits(code) {
    return tbl('referral_credits').filter(function (c) { return c.code === code; }).map(function (c) {   // the contract's shape, with intake_id (the main session's answer, 2026-10-24)
      return { id: c.id, friend_name: c.friend_name, earned_on: c.earned_on, used_on: c.used_on, percent: c.percent, intake_id: c.intake_id }; });
  }
  function intakeFriend(i) { var p = i.payload || {}; return (i.name && String(i.name).trim()) || [p['First Name'], p['Last Name']].filter(Boolean).join(' ').trim() || null; }
  function errCode(msg, code) { var e = new Error(msg); e.code = code; return e; }
  var RPC = {
    // ---- stage102: the weekly crew (the Toss, the bank, the Mailbag). Every write answers coach_crew_weekly() again, as the SQL does. ----
    coach_crew_weekly: function () { return weeklyOut(); },
    coach_crew_week_set: function (p) {
      var W = weekly(), tr = function (v) { return v == null ? null : String(v).replace(/^\s+|\s+$/g, '') || null; };
      var a = tr(p.p_q), s1 = tr(p.p_a), s2 = tr(p.p_b), theme = tr(p.p_theme);
      if ((a || s1 || s2) && !(a && s1 && s2)) throw new Error('Give the question and both sides, or none of them.');
      if ((a && a.length > 80) || (s1 && s1.length > 30) || (s2 && s2.length > 30) || (theme && theme.length > 60)) throw new Error('Too long.');
      var row = W.weeks.find(function (w) { return w.week === p.p_week; });
      if (!row) { row = { week: p.p_week, q: null, a: null, b: null, theme: null, closed: false, va: 0, vb: 0 }; W.weeks.push(row); }
      if (row.q !== a) { row.va = 0; row.vb = 0; row.closed = false; }
      row.q = a; row.a = s1; row.b = s2; row.theme = theme;
      if (!row.q && !row.theme) W.weeks = W.weeks.filter(function (w) { return w !== row; });
      W.weeks.sort(function (x, y) { return x.week < y.week ? -1 : 1; });
      return weeklyOut();
    },
    coach_crew_week_close: function (p) {
      var row = weekly().weeks.find(function (w) { return w.week === p.p_week; });
      if (!row || !row.q) throw new Error('There is no question that week.');
      row.closed = true; return weeklyOut();
    },
    coach_question_answer: function (p) {
      var q = weekly().questions.find(function (x) { return String(x.id) === String(p.p_id); }), ans = String(p.p_answer == null ? '' : p.p_answer).replace(/^\s+|\s+$/g, '');
      if (!q) throw new Error('That question is gone.');
      if (q.answered_at) throw new Error('That question is already answered.');
      if (!ans) throw new Error('Write the answer first.');
      if (ans.length > 280) throw new Error('The answer is ' + ans.length + ' characters. Keep it to 280.');
      q.answer = ans; q.answered_at = nowIso(); weekly().answered_month++;
      if (DB.crew_bell) DB.crew_bell.posts.push({ id: '00000000-0000-4000-8000-' + String(++ST.seq).padStart(12, '0'), athlete_id: '__coach__', amir: true, who: 'Amir', seen: true, kind: 'post', body: ans, photo: false, ago_min: 0, kudos: 0, seq: ST.seq,
        session: { ask: { q: q.body, by: q.ok_name ? 'First' : null } } });
      return weeklyOut();
    },
    coach_question_drop: function (p) {
      var W = weekly(), n = W.questions.length;
      W.questions = W.questions.filter(function (x) { return String(x.id) !== String(p.p_id) || x.answered_at; });
      if (W.questions.length === n) throw new Error('That question is gone.');
      return weeklyOut();
    },
    // ---- stage96: faces and cheers (CONTRACT.md sections 3 and 6) ----
    coach_crew_faces: function () {
      return lounge().faces.filter(function (f) { return loungeMember(f.athlete_id); }).map(function (f) { return { athlete_id: f.athlete_id, fv: f.fv, b64: f.b64 }; });
    },
    coach_crew_face_clear: function (p) {
      var L = lounge(); L.faces = L.faces.filter(function (f) { return f.athlete_id !== p.p_athlete; });
      return { ok: true };
    },
    // crew_cheer() as Amir: the word first (100 after cleaning), then the person (a member, not under 13: otherwise gone), then once a day (the server's UTC day).
    coach_cheer: function (p) {
      var L = lounge(), word = p.p_word == null ? null : String(p.p_word).replace(/^\s+|\s+$/g, '').replace(/["<>\\]/g, '');
      if (word !== null && word.length > 100) throw new Error('crew:word_long');
      if (!loungeMember(p.p_athlete)) throw new Error('crew:gone');
      var day = utcDate();
      if (L.cheers.some(function (c) { return c.from_athlete === '__coach__' && c.to_athlete === p.p_athlete && c.day === day; })) throw new Error('crew:cheer_today');
      L.cheers.push({ id: ++L.seq, from_athlete: '__coach__', from_who: 'Coach', to_athlete: p.p_athlete, to_who: loungeName(p.p_athlete), word: word || null, day: day });
      return { ok: true, season: L.cheers.filter(function (c) { return c.to_athlete === p.p_athlete; }).length };
    },
    // the last 7 days (today and the six before), newest first
    coach_crew_cheers: function () {
      var L = lounge(), from = ymdBack(utcDate(), 6);
      return clone(L.cheers.filter(function (c) { return c.day >= from; }).sort(function (a, b) { return (a.day < b.day ? 1 : a.day > b.day ? -1 : 0) || (b.id - a.id); }));
    },
    coach_cheer_word_clear: function (p) {
      var c = lounge().cheers.find(function (x) { return x.id === p.p_id; });
      if (c) c.word = null;
      return { ok: true };
    },
    // ---- stage97: the athletes' partner codes (CONTRACT.md section 8) ----
    coach_partner_codes: function () {
      return tbl('affiliates').filter(function (a) { return a.kind === 'athlete'; }).map(function (a) {
        return { code: a.code, athlete_id: a.athlete_id, who: loungeName(a.athlete_id) === a.athlete_id ? (a.coach_name || a.athlete_id) : loungeName(a.athlete_id), active: !!a.active,
          uses: partnerUses(a.code).length, credits: partnerCredits(a.code) };
      });
    },
    // my_partner_code(true) for someone else: upper(first name letters only, max 10) + two digits, unique; one per athlete. Returns {code}; refuses
    // partner:has_code, partner:under13 (the Bell's tick) and partner:no_programme.
    coach_partner_code_make: function (p) {
      var rows = tbl('affiliates'), have = rows.find(function (a) { return a.kind === 'athlete' && a.athlete_id === p.p_athlete; });
      var pr = tbl('programs').find(function (r) { return r.athlete_id === p.p_athlete; });
      if (!pr) throw new Error('partner:no_programme');
      if (bell().people.some(function (x) { return x.athlete_id === p.p_athlete && x.under13; })) throw new Error('partner:under13');
      if (have) throw new Error('partner:has_code');
      {
        var a = pr.data.athlete || {}, first = String(a.firstName || p.p_athlete).replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 10) || 'ATHLETE', n = 41, code;
        do { code = first + String(++n % 100).padStart(2, '0'); } while (rows.some(function (x) { return x.code === code; }));
        have = { code: code, percent: 10, reward_percent: 10, kind: 'athlete', coach_name: [a.firstName, a.lastName].filter(Boolean).join(' ') || p.p_athlete, coach_name_fa: null, instagram: null, whatsapp: null, email: null,
          athlete_id: p.p_athlete, applied_on: utcDate(), active: true, retired_on: null, notes: null, created_at: nowIso() };
        rows.push(have);
      }
      return { code: have.code };
    },
    // The member's own code on their own application is refused (partner:self); the same intake twice hits the unique (code, intake_id).
    coach_partner_credit_add: function (p) {
      var a = tbl('affiliates').find(function (x) { return x.code === p.p_code && x.kind === 'athlete'; });
      if (!a) throw new Error('partner:no_code');
      var i = tbl('hab_intake').find(function (x) { return String(x.id) === String(p.p_intake); });
      if (!i) throw new Error('partner:no_intake');
      if (i.athlete_id && i.athlete_id === a.athlete_id) throw new Error('partner:self');
      var cr = tbl('referral_credits');
      if (cr.some(function (c) { return c.code === a.code && String(c.intake_id) === String(i.id); })) throw errCode('duplicate key value violates unique constraint "referral_credits_code_intake_id_key"', '23505');
      var row = { id: 'f0000000-0000-4000-8000-' + String(++ST.seq).padStart(12, '0'), code: a.code, athlete_id: a.athlete_id, intake_id: i.id, friend_name: intakeFriend(i), percent: 10, earned_on: utcDate(), used_on: null, note: p.p_note || null, created_at: nowIso() };
      cr.push(row);
      return { id: row.id, friend_name: row.friend_name, earned_on: row.earned_on, used_on: null, percent: 10 };
    },
    coach_partner_credit_used: function (p) {
      var c = tbl('referral_credits').find(function (x) { return x.id === p.p_id; });
      if (!c) throw new Error('partner:no_credit');
      c.used_on = p.p_used ? utcDate() : null;
      return { id: c.id, friend_name: c.friend_name, earned_on: c.earned_on, used_on: c.used_on, percent: c.percent };
    },
    // ---- stage81: the Bell (supabase/stage81_career_crew.sql) ----
    coach_crew: function () {
      var c = bellSweep();
      return { posts: clone(c.posts).sort(function (a, b) { return (a.ago_min - b.ago_min) || ((b.seq || 0) - (a.seq || 0)); }).map(function (p) {
          var o = clone(p); o.at = new Date(Date.now() - p.ago_min * 60000).toISOString(); delete o.ago_min; delete o.seq; return o; }),
        people: clone(c.people), rings_week: c.rings_week || 0 };
    },
    // crew_write_post() in the order the SQL checks: too long, then the photo (base64, a JPEG, at most 450 KB), then empty.
    coach_crew_post: function (p) {
      var c = bellSweep(), body = String(p.p_body == null ? '' : p.p_body).replace(/^\s+|\s+$/g, '');
      if (body.length > 280) throw new Error(BELL_OK + 'too_long');
      var b64 = p.p_photo ? String(p.p_photo).replace(/^data:[^,]*,/, '').replace(/\s/g, '') : '';
      if (b64) {
        var bin;
        try { bin = atob(b64); } catch (e) { throw new Error(BELL_OK + 'photo_bad'); }
        if (bin.length > 450000) throw new Error(BELL_OK + 'photo_big');
        if (bin.length < 100 || bin.slice(0, 3) !== '\xff\xd8\xff') throw new Error(BELL_OK + 'photo_bad');
      }
      if (!b64 && !body) throw new Error(BELL_OK + 'empty');
      var id = '00000000-0000-4000-8000-' + String(++ST.seq).padStart(12, '0');
      c.posts.push({ seq: ST.seq, id: id, athlete_id: '__coach__', amir: true, who: 'Amir', seen: true, kind: 'post', body: body, photo: !!b64, ago_min: 0, kudos: 0 });
      if (b64) c.photos[id] = { mime: 'image/jpeg', w: p.p_w || null, h: p.p_h || null, b64: b64 };
      return { id: id };
    },
    coach_crew_remove: function (p) {
      var c = bellSweep(), n = c.posts.length;
      c.posts = c.posts.filter(function (x) { return x.id !== p.p_post; }); delete c.photos[p.p_post];
      c.replies = c.replies.filter(function (r) { return r.post_id !== p.p_post; });
      return c.posts.length < n;
    },
    // stage92: Amir removes any reply; true when one was there (the SQL's `found`). Never touches a post.
    coach_crew_remove_reply: function (p) {
      var c = bellSweep(), n = c.replies.length;
      c.replies = c.replies.filter(function (r) { return r.id !== p.p_id; });
      return c.replies.length < n;
    },
    // get_bell() as the coach reads it (no viewer): the athlete feed, of which the page keeps only the posts and their replies. Like the SQL, a post shows only when its
    // author is Amir or in the crew (newest first, at most 80), and a reply only when its author is Amir or in the crew (oldest first, `who` the crew name).
    // Other items (a line, the week's sessions) come too, so the page has to pick the posts out.
    get_bell: function () {
      var c = bellSweep(), crew = {};
      openCrew().forEach(function (m) { crew[m.athlete_id] = m; });
      var at = function (ago) { return new Date(Date.now() - ago * 60000).toISOString(); };
      var items = c.posts.filter(function (p) { return p.amir || crew[p.athlete_id]; }).sort(function (a, b) { return (a.ago_min - b.ago_min) || ((b.seq || 0) - (a.seq || 0)); }).slice(0, 80).map(function (p) {
        return { t: 'post', id: p.id, who: p.amir ? 'Amir' : crew[p.athlete_id].name, me: false, amir: !!p.amir, kind: p.kind, body: p.body, session: null, photo: !!p.photo, at: at(p.ago_min),
          kudos: { n: p.kudos || 0, mine: false, names: [] },
          replies: c.replies.filter(function (r) { return r.post_id === p.id && (r.amir || crew[r.athlete_id]); }).sort(function (a, b) { return b.ago_min - a.ago_min; }).map(function (r) {
            return { id: r.id, who: r.amir ? 'Amir' : crew[r.athlete_id].name, me: false, amir: !!r.amir, body: r.body, at: at(r.ago_min) }; }) };
      });
      items.push({ t: 'line', key: 'fixture:line', who: 'Ava E.', me: false, at: at(30), parts: [{ k: 'joined' }], kudos: { n: 0, mine: false, names: [] } });
      return { athlete_id: null, me: null, items: items, honours: null, days: 7, week: { members: Object.keys(crew).length, sessions: 0, held: 0 }, crew: [], at: nowIso() };
    },
    // Needs a programme (the SQL checks programs); ON takes the athlete's posts off at once.
    coach_crew_under13: function (p) {
      var c = bellSweep();
      if (!String(p.p_athlete || '').trim() || p.p_on == null) throw new Error(BELL_OK + 'who');
      if (!tbl('programs').some(function (r) { return r.athlete_id === p.p_athlete; })) throw new Error(BELL_OK + 'who');
      var row = c.people.find(function (x) { return x.athlete_id === p.p_athlete; });
      if (!row) c.people.push(row = { athlete_id: p.p_athlete, answer: null, under13: false, answered_at: null, kinds_off: [] });
      row.under13 = !!p.p_on;
      if (p.p_on) { c.posts = c.posts.filter(function (x) { return x.athlete_id !== p.p_athlete; }); bellSweep(); }   // their posts go, and the replies under them
      return !!p.p_on;
    },
    crew_photo: function (p) {
      var c = bellSweep(), ph = c.photos[p.p_post];
      if (!ph || !c.posts.some(function (x) { return x.id === p.p_post; })) return null;
      return { id: p.p_post, mime: ph.mime, w: ph.w, h: ph.h, b64: ph.b64 };
    },
    // ---- stage85: the Monthly Open (supabase/stage85_crew_open.sql). Every one answers coach_open()'s shape; the caller is always the coach. ----
    // `window.__STUB.openNull = true` makes the read answer nothing; `window.__STUB.openWriteNull = n` makes the next n WRITES do their work and then answer nothing.
    coach_open: function () { return ST.openNull ? null : openAnswer(); },
    // Starts a new challenge (and closes whatever was open) or, with p_id, corrects the words of that one and keeps its results.
    coach_open_set: function (p) {
      var s = openState(), title = String(p.p_title == null ? '' : p.p_title).replace(/^ +| +$/g, ''), better = String(p.p_better == null ? 'high' : p.p_better).replace(/^ +| +$/g, '').toLowerCase();
      if (title.length < 1 || title.length > 60) throw new Error('the challenge needs a name, up to 60 characters');
      if (better !== 'high' && better !== 'low') throw new Error('better is high or low, not ' + better);
      var how = String(p.p_how == null ? '' : p.p_how).slice(0, 400), unit = String(p.p_unit == null ? '' : p.p_unit).replace(/^ +| +$/g, '').slice(0, 16);
      if (p.p_id != null) {
        var c = s.challenges.find(function (x) { return x.id === p.p_id && !x.closed_at; });   // only the live one: a closed challenge is not corrected
        if (!c) throw new Error('no such challenge is open');
        c.title = title; c.how = how; c.unit = unit; c.better = better;
      } else {
        s.challenges.forEach(function (x) { if (!x.closed_at) x.closed_at = nowIso(); });
        s.challenges.push({ id: 'c0000000-0000-4000-8000-' + String(++ST.seq).padStart(12, '0'), title: title, how: how, unit: unit, better: better,
          opened_on: utcDate(), closed_at: null, created_at: nowIso() });
      }
      return openOut();
    },
    coach_open_close: function () {
      openState().challenges.forEach(function (x) { if (!x.closed_at) x.closed_at = nowIso(); });
      return openOut();
    },
    // One result per athlete per challenge (typed again, it replaces; the athlete must have a programme); a Bell line (kind 'open') only for a crew_members() member with the Open switched on.
    coach_open_result: function (p) {
      var s = openState(), ath = String(p.p_athlete == null ? '' : p.p_athlete).replace(/^ +| +$/g, '');
      if (!ath) throw new Error('which athlete?');
      if (p.p_value == null) throw new Error('what result?');
      if (!tbl('programs').some(function (r) { return r.athlete_id === ath; })) throw new Error('no athlete "' + ath + '"');   // an athlete, not a typed id that belongs to nobody
      var o = openLive();
      if (!o) throw new Error('no challenge is open');
      var v = Number(p.p_value);
      if (isNaN(v)) { var bad = new Error('invalid input syntax for type numeric: "' + p.p_value + '"'); bad.code = '22P02'; throw bad; }
      if (!(v > -1000000 && v < 1000000)) { var rng = new Error('new row for relation "crew_open_results" violates check constraint "crew_open_results_value_check"'); rng.code = '23514'; throw rng; }
      var day = p.p_day || utcDate(), row = s.results.find(function (r) { return r.open_id === o.id && r.athlete_id === ath; });
      if (row) { row.value = v; row.day = day; } else s.results.push({ open_id: o.id, athlete_id: ath, value: v, day: day });
      var cons = openCrew().find(function (x) { return x.athlete_id === ath; });   // crew_members(): a stray "yes" of a former athlete or the demo rings nothing
      if (cons && (cons.kinds_off || []).indexOf('open') < 0) {
        var text = 'posted ' + String(Math.round(v * 100) / 100) + (o.unit ? ' ' + o.unit : '') + ' in ' + o.title;
        var ring = s.rings.find(function (x) { return x.athlete_id === ath && x.kind === 'open' && x.ref === o.id; });
        if (ring) ring.value = { text: text }; else s.rings.push({ athlete_id: ath, kind: 'open', ref: o.id, value: { text: text } });
      }
      return openOut();
    },
    // Takes one result off, and its Bell line with it.
    coach_open_remove: function (p) {
      var s = openState(), o = openLive(), ath = String(p.p_athlete == null ? '' : p.p_athlete).replace(/^ +| +$/g, '');
      if (!o) throw new Error('no challenge is open');
      s.results = s.results.filter(function (r) { return !(r.open_id === o.id && r.athlete_id === ath); });
      s.rings = s.rings.filter(function (x) { return !(x.kind === 'open' && x.ref === o.id && x.athlete_id === ath); });
      return openOut();
    },
    // The week's moments for Courtside: live awards (never the go-day's baseline) of highlight size and up, of the kinds that stay after the cut,
    // for clients only, minted inside the window. Every row of the week comes back, marked or not.
    get_courtside: function (p) {
      var from = Date.parse(p.p_from), to = Date.parse(p.p_to);
      if (!p.p_from || !p.p_to || isNaN(from) || isNaN(to) || to <= from || to - from > 35 * 86400e3)
        throw new Error('get_courtside: give a window of at most 35 days (from ' + p.p_from + ', to ' + p.p_to + ')');
      var marks = tbl('courtside_marks'), cat = tbl('career_catalogue'), facts = tbl('career_facts');
      var rows = tbl('career_awards').filter(function (a) {
        var at = Date.parse(a.created_at);
        return a.how === 'live' && at >= from && at < to && ['highlight', 'milestone', 'legend'].indexOf(a.size) >= 0
          && (a.kind === 'achievement' || (a.kind === 'badge' && ['held_weeks', 'century', 'bests', 'comebacks'].indexOf(a.item) >= 0)) && isClient(a.athlete_id, p.p_not_clients);
      }).sort(function (a, b) { return a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : a.award_id < b.award_id ? -1 : a.award_id > b.award_id ? 1 : 0; });
      return { rows: rows.map(function (a) {
        var c = cat.find(function (x) { return x.kind === a.kind && x.id === a.item; }), m = marks.find(function (x) { return x.athlete_id === a.athlete_id && x.award_id === a.award_id; });
        var fs = [];
        ((a.evidence && a.evidence.facts) || []).forEach(function (e) {
          facts.forEach(function (f) { if (f.athlete_id === a.athlete_id && f.kind === e.kind && f.ref === e.ref) fs.push({ kind: f.kind, ref: f.ref, day: f.day, value: clone(f.value) }); });
        });
        return { athlete_id: a.athlete_id, award_id: a.award_id, kind: a.kind, item: a.item, tier: a.tier == null ? null : a.tier, day: a.day, size: a.size, at: a.created_at,
          spec: awardSpec(a, c && c.body), evidence: clone(a.evidence), facts: fs, saw_at: m ? m.saw_at : null, sent_at: m ? m.sent_at : null };
      }) };
    },
    // Saw it ('saw'), WhatsApp or Copy ('sent': seen too), Undo ('undo'). Returns how many of the ids were that athlete's (live, for saw and sent) awards.
    coach_courtside_mark: function (p) {
      if (['saw', 'sent', 'undo'].indexOf(p.p_what) < 0) throw new Error('coach_courtside_mark: ' + p.p_what + ' is not saw, sent or undo');
      var ids = p.p_award_ids || [], marks = tbl('courtside_marks'), awards = tbl('career_awards');
      if (p.p_what === 'undo') {
        DB.courtside_marks = marks.filter(function (m) { return !(m.athlete_id === p.p_athlete_id && ids.indexOf(m.award_id) >= 0); });
        return awards.filter(function (a) { return a.athlete_id === p.p_athlete_id && ids.indexOf(a.award_id) >= 0; }).length;
      }
      var n = 0;
      awards.forEach(function (a) {
        if (a.athlete_id !== p.p_athlete_id || ids.indexOf(a.award_id) < 0 || a.how !== 'live') return;
        n++;
        var m = marks.find(function (x) { return x.athlete_id === a.athlete_id && x.award_id === a.award_id; });
        if (m) { m.saw_at = m.saw_at || nowIso(); m.sent_at = m.sent_at || (p.p_what === 'sent' ? nowIso() : null); m.updated_at = nowIso(); }
        else marks.push({ athlete_id: a.athlete_id, award_id: a.award_id, saw_at: nowIso(), sent_at: p.p_what === 'sent' ? nowIso() : null, updated_at: nowIso() });
      });
      return n;
    },
    coach_honours: function (p) { return honoursOf(p.p_month, p.p_not_clients); },
    coach_honours_freeze: function (p) { return freezeHonours(p.p_month, p.p_not_clients); },
    // Returns 1, or 0 when that honour has no such winner (not frozen yet: freeze first).
    coach_honours_sent: function (p) {
      var m0 = monthStart(p.p_month), n = 0;
      tbl('career_honours').forEach(function (h) { if (h.month === m0 && h.honour === p.p_honour && h.athlete_id === p.p_athlete_id) { h.sent_at = h.sent_at || nowIso(); n++; } });
      return n;
    },
    // Amir's Pick: an athlete (any client) or nobody (null). Freezes the month first. Once decided it stays decided. Open until the end of the month after.
    coach_honours_pick: function (p) {
      var m0 = monthStart(p.p_month);
      if (utcDate() >= plusMonths(m0, 2)) throw new Error(monthLabel(m0) + ' can no longer be picked');
      freezeHonours(m0, p.p_not_clients);
      var vm = tbl('career_honour_months').find(function (r) { return r.month === m0; });
      if (vm.pick != null) throw new Error('Your ' + monthLabel(m0) + ' pick is already decided');
      if (p.p_athlete_id == null) { vm.pick = 'nobody'; vm.pick_at = nowIso(); return honoursOf(m0, p.p_not_clients); }
      if (!hasProgramme(p.p_athlete_id)) throw new Error('no such athlete: ' + p.p_athlete_id);
      if (!isClient(p.p_athlete_id, p.p_not_clients)) throw new Error('not a client: the demo, a former athlete and your own login are never picked');
      var slot = (liveHonours(m0, p.p_not_clients).shortlist || []).find(function (e) { return e.athlete_id === p.p_athlete_id; });
      tbl('career_honours').push({ month: m0, honour: 'pick', athlete_id: p.p_athlete_id, value: slot ? clone(slot) : {}, sent_at: null, created_at: nowIso(), confirmed_at: s101() ? nowIso() : null });
      vm.pick = 'picked'; vm.pick_at = nowIso();
      return honoursOf(m0, p.p_not_clients);
    },
    // stage104: confirm or change one of sessions / improved / full_month (see supabase/stage104_honours_confirmed.sql). The chosen athletes replace that honour's
    // rows, each confirmed now; an honour already confirmed takes the same winners again (a double tap) and refuses a different list. The figure is the fixture's
    // (honoursLive) for the athlete, else a made-up one; an athlete in __STUB.noFigure has none and cannot be honoured.
    coach_honour_confirm: function (p) {
      if (!s101()) throw new Error('Could not find the function public.coach_honour_confirm');
      var m0 = monthStart(p.p_month), hon = p.p_honour;
      if (['sessions', 'improved', 'full_month'].indexOf(hon) < 0) throw new Error('coach_honour_confirm: ' + hon + ' is not sessions, improved or full_month (your Pick is chosen with coach_honours_pick)');
      if (!honoursOpen(m0)) throw new Error('coach_honour_confirm: ' + monthLabel(m0) + ' has not ended yet');
      if (utcDate() >= plusMonths(m0, 2)) throw new Error(monthLabel(m0) + ' can no longer be confirmed');
      var ids = []; (p.p_athlete_ids || []).forEach(function (x) { if (x && ids.indexOf(x) < 0) ids.push(x); }); ids.sort();
      freezeHonours(m0, p.p_not_clients);
      var vm = tbl('career_honour_months').find(function (r) { return r.month === m0; });
      var have = tbl('career_honours').filter(function (h) { return h.month === m0 && h.honour === hon; }).map(function (h) { return h.athlete_id; }).sort();
      if (vm.confirmed && vm.confirmed[hon]) {
        if (JSON.stringify(have) === JSON.stringify(ids)) return honoursOf(m0, p.p_not_clients);
        throw new Error('Your ' + monthLabel(m0) + ' ' + hon + ' is already confirmed');
      }
      var live = liveHonours(m0, p.p_not_clients), figs = [];
      ids.forEach(function (id) {
        if (!hasProgramme(id)) throw new Error('no such athlete: ' + id);
        if (!isClient(id, p.p_not_clients)) throw new Error('not a client: the demo, a former athlete and your own login are never honoured');
        var ie = live.improved.who.find(function (e) { return e.athlete_id === id; }), fe = live.full_month.who.find(function (e) { return e.athlete_id === id; });
        var fx = hon === 'sessions' ? { n: live.sessions.who.indexOf(id) >= 0 ? live.sessions.n : 5 }
          : hon === 'improved' ? (ie ? { lift: ie.lift, pct: ie.pct } : { lift: 'Barbell Back Squat', pct: 5 })
          : { weeks: fe ? fe.weeks : 3 };
        if ((ST.noFigure || []).indexOf(id) >= 0) throw new Error('that athlete has no ' + (hon === 'sessions' ? 'plan session' : hon === 'improved' ? 'main-lift win' : 'training week') + ' in ' + monthLabel(m0) + ', so it cannot be honoured');
        figs.push([id, fx]);
      });
      var rows = tbl('career_honours');
      figs.forEach(function (f) {
        var row = rows.find(function (h) { return h.month === m0 && h.honour === hon && h.athlete_id === f[0]; });
        if (row) { row.value = f[1]; row.confirmed_at = row.confirmed_at || nowIso(); }
        else rows.push({ month: m0, honour: hon, athlete_id: f[0], value: f[1], sent_at: null, created_at: nowIso(), confirmed_at: nowIso() });
      });
      for (var i = rows.length - 1; i >= 0; i--) if (rows[i].month === m0 && rows[i].honour === hon && ids.indexOf(rows[i].athlete_id) < 0) rows.splice(i, 1);
      vm.confirmed = vm.confirmed || {}; vm.confirmed[hon] = nowIso();
      return honoursOf(m0, p.p_not_clients);
    },
    // stage100 (2026-10-25, round 7, idea #92): the reason on a month's pick, kept in the pick row's value.why. 140 characters at most; empty clears it;
    // refused with a plain message when the month has no pick. Answers coach_honours()'s shape. `missingRpc: ['coach_honours_why']` is a server before stage100.
    coach_honours_why: function (p) {
      var m0 = monthStart(p.p_month), why = String(p.p_why == null ? '' : p.p_why).replace(/^\s+|\s+$/g, '');
      if (why.length > 140) throw new Error('The reason is ' + why.length + ' characters. Keep it to 140.');
      var rows = tbl('career_honours').filter(function (h) { return h.month === m0 && h.honour === 'pick'; });
      if (!rows.length) throw new Error('There is no pick for ' + monthLabel(m0) + ' yet. Pick first, then write why.');
      rows.forEach(function (h) { h.value = h.value || {}; if (why === '') delete h.value.why; else h.value.why = why; });
      return honoursOf(m0, p.p_not_clients);
    },
    // Write, rewrite or clear (an empty line) an athlete's goal for a month. A goal already ticked done is not cleared. Returns the row, or null.
    coach_set_goal: function (p) {
      var m0 = monthStart(p.p_month), line = tidy(p.p_line), goals = tbl('career_goals'), cur = monthStart(utcDate());
      if (!hasProgramme(p.p_athlete_id)) throw new Error('no such athlete: ' + p.p_athlete_id);
      if (m0 < plusMonths(cur, -1) || m0 > plusMonths(cur, 1)) throw new Error('a goal is for last month, this month or next month (not ' + monthLabel(m0) + ')');
      if (/[\u0000-\u001f\u007f]/.test(line)) throw new Error('the goal has a control character');
      var at = goals.findIndex(function (g) { return g.athlete_id === p.p_athlete_id && g.month === m0; });
      if (line === '') {
        if (at >= 0 && !goals[at].done_at) { goals.splice(at, 1); return null; }
        if (at >= 0) throw new Error('that goal is ticked done: untick it first to clear it');
        return null;
      }
      if (line.length > 140) throw new Error('a goal is at most 140 characters (this one is ' + line.length + ')');
      if (at >= 0) { goals[at].line = line; goals[at].updated_at = nowIso(); return clone(goals[at]); }
      var row = { athlete_id: p.p_athlete_id, month: m0, line: line, done_at: null, created_at: nowIso(), updated_at: nowIso() };
      goals.push(row); return clone(row);
    },
    coach_goal_done: function (p) {
      var m0 = monthStart(p.p_month), g = tbl('career_goals').find(function (x) { return x.athlete_id === p.p_athlete_id && x.month === m0; });
      if (!g) throw new Error('no goal for ' + p.p_athlete_id + ' in ' + monthLabel(m0));
      g.done_at = p.p_done ? (g.done_at || nowIso()) : null; g.updated_at = nowIso();
      return clone(g);
    },
    // "From Amir": one line (1 to 90 characters) for an athlete on the coach's day; an empty line takes back that day's line while it is unread.
    coach_from_amir: function (p) {
      var line = tidy(p.p_line), notes = tbl('career_notes'), today = utcDate();
      if (!p.p_day || p.p_day < plusDays(today, -1) || p.p_day > plusDays(today, 1)) throw new Error('from_amir: ' + p.p_day + ' is not today');
      if (!hasProgramme(p.p_athlete_id)) throw new Error('no such athlete: ' + p.p_athlete_id);
      var at = notes.findIndex(function (n) { return n.athlete_id === p.p_athlete_id && n.day === p.p_day; });
      if (line === '') {
        if (at >= 0 && !notes[at].read_at) { notes.splice(at, 1); return null; }
        if (at >= 0) throw new Error('they have read it already: it stays');
        return null;
      }
      if (!isClient(p.p_athlete_id)) throw new Error('not a client: the demo and a former athlete get no line');
      if (/[\u0000-\u001f\u007f]/.test(line)) throw new Error('the line has a control character');
      if (line.length > 90) throw new Error('one line is at most 90 characters (this one is ' + line.length + ')');
      var award = p.p_award_id == null ? null : p.p_award_id;
      if (award != null && !tbl('career_awards').some(function (a) { return a.athlete_id === p.p_athlete_id && a.award_id === award; })) throw new Error('that moment is not ' + p.p_athlete_id + "'s");
      if (at >= 0) throw new Error('one line a day: ' + p.p_athlete_id + ' already has one today (take it back first to change it)');
      var row = { athlete_id: p.p_athlete_id, day: p.p_day, line: line, award_id: award, created_at: nowIso(), read_at: null };
      notes.push(row); return clone(row);
    },
    contact_list: function () {
      return tbl('hab_contacts').map(function (c) {
        var o = tbl('leaderboard_optin').find(function (x) { return x.athlete_id === c.athlete_id; });
        var ap = tbl('athlete_progress').find(function (x) { return x.athlete_id === c.athlete_id; });
        return { athlete_id: c.athlete_id, email: c.email, whatsapp: c.whatsapp, source: c.source, tier: c.tier,
          shown_as: (o && o.display_name) || c.display_name, on_board: !!o, days_logged: habDays(ap && ap.data, c.athlete_id), signed_up: c.created_at };
      }).sort(function (a, b) { return String(b.signed_up).localeCompare(String(a.signed_up)); });
    },
    intake_list: function () { return clone(tbl('hab_intake')).sort(function (a, b) { return String(b.created_at).localeCompare(String(a.created_at)); }); },
    set_coach_note: function (p) {   // p_day DEFAULT CURRENT_DATE: the server's (UTC) date when the client sends none
      var day = p.p_day || utcDate(), body = String(p.p_body || '').trim().slice(0, 200), t = tbl('hab_notes');
      var at = t.findIndex(function (n) { return n.athlete_id === '__coach__' && n.day === day; });
      if (!body) { if (at >= 0) t.splice(at, 1); return null; }
      if (at >= 0) { t[at].body = body; t[at].updated_at = nowIso(); }
      else t.push({ athlete_id: '__coach__', day: day, body: body, pct: null, hidden: false, created_at: nowIso(), updated_at: nowIso() });
      return null;
    },
    hide_note: function (p) { tbl('hab_notes').forEach(function (n) { if (n.athlete_id === p.p_athlete_id && n.day === p.p_day) { n.hidden = p.p_hidden !== false; n.updated_at = nowIso(); } }); return null; },
    set_quests: function (p) {
      if (!p.p_ids || !p.p_ids.length) throw new Error('give at least one quest id, or use clear_quests()');
      var x = tbl('xp_rules').find(function (r) { return r.id === 1; }); var runs = (x.rules.questRuns || []).filter(function (r) { return r.start !== p.p_start; });
      runs.push({ start: p.p_start, ids: p.p_ids.slice() }); x.rules.questRuns = runs; x.updated_at = nowIso(); return runs;
    },
    clear_quests: function (p) {
      var x = tbl('xp_rules').find(function (r) { return r.id === 1; }); x.rules.questRuns = (x.rules.questRuns || []).filter(function (r) { return r.start !== p.p_start; }); return x.rules.questRuns;
    },
    // stage55: ending a run keeps it with an `end` day (capped at its seventh day); an end before the start drops it (nothing earned).
    end_quests: function (p) {
      if (p.p_start == null || p.p_end == null) throw new Error("give the run's start day and the day it ends");
      var x = tbl('xp_rules').find(function (r) { return r.id === 1; }), out = [], found = false;
      var plus6 = function (k) { return new Date(Date.parse(k + 'T00:00:00Z') + 6 * 86400e3).toISOString().slice(0, 10); };
      (x.rules.questRuns || []).forEach(function (r) {
        if (r.start !== p.p_start) { out.push(r); return; }
        found = true;
        if (p.p_end >= p.p_start) out.push(Object.assign({}, r, { end: p.p_end < plus6(r.start) ? p.p_end : plus6(r.start) }));
      });
      if (!found) throw new Error('no quest run starts on ' + p.p_start);
      x.rules.questRuns = out; x.updated_at = nowIso(); return out;
    },
    set_intake_status: function (p) {
      if (['new', 'handled', 'archived'].indexOf(p.p_status) < 0) throw new Error('bad intake status: ' + p.p_status);
      tbl('hab_intake').forEach(function (i) { if (String(i.id) === String(p.p_id)) { i.status = p.p_status; i.handled_at = p.p_status === 'new' ? null : (i.handled_at || nowIso()); } });
      return null;
    },
    hab_season_level: function (p) { return (SEED.levels || {})[p.p_athlete_id] || null; },
    // A fixture row marks "has signed in since the password was set" with signed_in_test: true.
    coach_login_use: function () {
      var out = [];
      [['athlete', 'athlete_identities', 'athlete_id'], ['course', 'tps_accounts', 'username'], ['testing', 'assess_accounts', 'username']].forEach(function (t) {
        tbl(t[1]).forEach(function (r) { if (r.initial_password) out.push({ app: t[0], key: r[t[2]], signed_in_since: !!r.signed_in_test }); });
      });
      return out;
    },
    coach_season_levels: function (p) { return (p.p_ids || []).map(function (id) { return { athlete_id: id, level: (SEED.levels || {})[id] || null }; }); },
    leaderboard_top: function () { return clone(SEED.board || []); },
    save_session: function (p) {
      var s = p.p_session || {}, t = tbl('session_history');
      var row = { athlete_id: p.p_athlete_id, athlete_name: p.p_athlete_name, day: p.p_day, completed_on: p.p_completed_on,
        status: s.status, session_rpe: s.session_rpe === '' ? null : Number(s.session_rpe), duration_min: s.duration_min === '' ? null : Number(s.duration_min),
        readiness: s.readiness, day_note: s.day_note, focus: s.focus, summary: s.summary, updated_at: nowIso(),
        log: Array.isArray(s.log) ? s.log : null };
      var at = t.findIndex(function (r) { return r.athlete_id === row.athlete_id && Number(r.day) === Number(row.day) && r.completed_on === row.completed_on; });
      // stage46: an existing row keeps its log unless the coach says replace_log, and keeps its
      // coach_status (the caller here is always the coach, whose saves never re-open a note).
      // stage60: the caller here is the coach, and a coach's save over a hidden session brings it back (the phone's never does).
      if (at >= 0) { if (!s.replace_log && row.log == null) row.log = t[at].log; row.hidden_at = null; row.hidden_by = null; t[at] = Object.assign(t[at], row); }
      else { row.coach_status = 'new'; t.push(row); }
      return null;
    },
    // stage63: a paused or former mark; 'active' removes it. The same rules as the SQL (the demo and the dashboard's own identity have no status).
    coach_set_status: function (p) {
      var id = String(p.p_athlete_id == null ? '' : p.p_athlete_id).trim();
      if (!id) throw new Error('which athlete?');
      if (['active', 'paused', 'former'].indexOf(p.p_status) < 0) throw new Error('bad status: ' + p.p_status);
      if (['demo', 'amir_ardekani'].indexOf(id.toLowerCase()) >= 0) throw new Error('"' + id + '" is the public demo or your own identity: it has no status');
      if (!tbl('programs').some(function (r) { return r.athlete_id === id; }) && !tbl('hab_contacts').some(function (r) { return r.athlete_id === id; }) && !tbl('athlete_progress').some(function (r) { return r.athlete_id === id; })) throw new Error('there is no athlete called "' + id + '"');
      var rows = tbl('athlete_status'), at = rows.findIndex(function (r) { return r.athlete_id === id; });
      if (p.p_status === 'active') { if (at >= 0) rows.splice(at, 1); }
      else {
        var note = String(p.p_note == null ? '' : p.p_note).trim() || null, today = nowIso().slice(0, 10);
        if (at >= 0) { var old = rows[at]; rows[at] = { athlete_id: id, status: p.p_status, since: p.p_since || (old.status === p.p_status ? old.since : today), note: note, updated_at: nowIso() }; }
        else rows.push({ athlete_id: id, status: p.p_status, since: p.p_since || today, note: note, updated_at: nowIso() });
      }
      return { athlete_id: id, status: p.p_status };
    },
    // stage62: a WhatsApp number from the coach. A new contact record (source 'coach') only when there is a number to keep; an existing one only has its
    // number changed. The caller is always the coach.
    coach_set_whatsapp: function (p) {
      var id = String(p.p_athlete_id == null ? '' : p.p_athlete_id).trim();
      if (!id) throw new Error('which athlete?');
      var wa = String(p.p_whatsapp == null ? '' : p.p_whatsapp).trim() || null;
      if (wa && wa.length > 40) throw new Error('that is too long for a phone number');
      var prog = tbl('programs').find(function (r) { return r.athlete_id === id; });
      var row = tbl('hab_contacts').find(function (r) { return r.athlete_id === id; });
      if (!prog && !row) throw new Error('there is no athlete called "' + id + '"');
      if (row) { row.whatsapp = wa; row.updated_at = nowIso(); }
      else if (wa) tbl('hab_contacts').push({ athlete_id: id, email: null, whatsapp: wa, source: 'coach', tier: prog && prog.data && prog.data.athlete && prog.data.athlete.tier === 'free' ? 'free' : 'coached',
        note: null, created_at: nowIso(), updated_at: nowIso(), display_name: null });
      return { athlete_id: id, whatsapp: wa };
    },
    // stage61: record what became of an application. The same rules as the SQL: 'client' needs an athlete, only 'client' and 'free' keep one, the
    // athlete must exist, a new application becomes handled, a null outcome clears the outcome and the link.
    set_intake_outcome: function (p) {
      var OUT = ['client', 'free', 'not_a_fit', 'no_reply', 'declined', 'other'];
      if (p.p_outcome != null && OUT.indexOf(p.p_outcome) < 0) throw new Error('bad intake outcome: ' + p.p_outcome);
      var ath = String(p.p_athlete_id == null ? '' : p.p_athlete_id).trim() || null;
      if (p.p_outcome == null || ['client', 'free'].indexOf(p.p_outcome) < 0) ath = null;
      if (p.p_outcome === 'client' && !ath) throw new Error('pick the athlete this application became');
      if (ath && !tbl('programs').some(function (r) { return r.athlete_id === ath; }) && !tbl('hab_contacts').some(function (r) { return r.athlete_id === ath; })) throw new Error('there is no athlete called "' + ath + '"');
      var hit = 0;
      tbl('hab_intake').forEach(function (i) {
        if (String(i.id) !== String(p.p_id)) return;
        hit++;
        i.linked_at = !ath ? null : (i.athlete_id === ath ? i.linked_at : nowIso());
        i.athlete_id = ath; i.outcome = p.p_outcome == null ? null : p.p_outcome;
        if (p.p_outcome != null && (i.status || 'new') === 'new') { i.status = 'handled'; i.handled_at = nowIso(); }
      });
      if (!hit) throw new Error('no such application');
      return { outcome: p.p_outcome == null ? null : p.p_outcome, athlete_id: ath };
    },
    // stage60: hide (p_hide true, the default) or restore a finished session; the stub's caller is always the coach. Only rows that change count.
    coach_hide_session: function (p) {
      if (!String(p.p_athlete_id == null ? '' : p.p_athlete_id).trim() || p.p_day == null || p.p_completed_on == null) throw new Error('which session?');
      var hide = p.p_hide == null ? true : !!p.p_hide, n = 0;
      tbl('session_history').forEach(function (r) {
        if (r.athlete_id === p.p_athlete_id && Number(r.day) === Number(p.p_day) && r.completed_on === p.p_completed_on && (r.hidden_at == null) === hide) {
          r.hidden_at = hide ? nowIso() : null; r.hidden_by = hide ? COACH : null; n++;
        }
      });
      return { changed: n, hidden: hide };
    },
    // stage48: both deletes or neither. The coach check is the signed-in email, as in the SQL.
    coach_delete_training_history: function (p) {
      if (!String(p.p_athlete_id == null ? '' : p.p_athlete_id).trim()) throw new Error('which athlete?');
      var ns = tbl('session_history').length, np = tbl('athlete_progress').length;
      DB.session_history = tbl('session_history').filter(function (r) { return r.athlete_id !== p.p_athlete_id; });
      DB.athlete_progress = tbl('athlete_progress').filter(function (r) { return r.athlete_id !== p.p_athlete_id; });
      return { sessions: ns - DB.session_history.length, progress: np - DB.athlete_progress.length };
    },
    // stage48: the Spine editor's two-table save. Lock both rows, refuse (writing nothing) on a clash, else write
    // exactly the columns sent; the version trigger runs on each update.
    coach_save_spine: function (p) {
      // The whitelists of supabase/stage64_spine_steps.sql (stage48's, plus steps and Claude's draft list).
      var E = ['name', 'aliases', 'pattern', 'qualities', 'purpose', 'tennis', 'cues', 'equipment', 'loads', 'easier', 'harder', 'alts', 'video', 'status', 'impact', 'muscles', 'steps'];
      var C = ['sfr', 'flags', 'notes', 'credits', 'cost', 'suggested_changes'];
      // SQL NULL and JSON null mean nothing for that half; any other non-object is an error (a double-encoded payload).
      var obj = function (v) {
        if (v == null) return {};
        if (typeof v !== 'object' || Array.isArray(v)) throw new Error('the entry, the coach-only part and their two snapshots must each be a JSON object');
        return v;
      };
      var entry = obj(p.p_entry), coach = obj(p.p_coach), es = obj(p.p_entry_snap), cs = obj(p.p_coach_snap);
      Object.keys(entry).forEach(function (k) { if (E.indexOf(k) < 0) throw new Error('exercises.' + k + ' cannot be written from the editor'); });
      Object.keys(coach).forEach(function (k) { if (C.indexOf(k) < 0) throw new Error('exercise_coach.' + k + ' cannot be written from the editor'); });
      var ex = tbl('exercises').find(function (r) { return r.id === p.p_id; });
      if (!ex) throw new Error('this entry is no longer on the server (' + p.p_id + '). Refresh.');
      var co = tbl('exercise_coach').find(function (r) { return r.id === p.p_id; }) || null;
      var bad = function (live, changes, snap) {
        return Object.keys(changes).filter(function (k) { return !same(live[k], snap[k]) && !same(live[k], changes[k]); }).sort();
      };
      var ce = bad(ex, entry, es), cc = co ? bad(co, coach, cs) : [];
      if (ce.length || cc.length) {
        var res = { ok: false };
        if (ce.length) res.entry = { cols: ce, live: clone(ex) };
        if (cc.length) res.coach = { cols: cc, live: clone(co) };
        return res;
      }
      // The table's own checks (stage64 steps, stage43 the draft list), as the database applies them on the write.
      var dbErr = function (m, code) { var e = new Error(m); e.code = code; return e; };
      if ('steps' in entry) {
        if (entry.steps == null) throw dbErr('null value in column "steps" of relation "exercises" violates not-null constraint', '23502');
        if (!Array.isArray(entry.steps) || entry.steps.length > 6 || entry.steps.some(function (x) { return typeof x !== 'string' || !/\S/.test(x) || x.length > 140; }))
          throw dbErr('new row for relation "exercises" violates check constraint "exercises_steps_ok"', '23514');
      }
      if ('suggested_changes' in coach && !Array.isArray(coach.suggested_changes))
        throw dbErr('new row for relation "exercise_coach" violates check constraint "exercise_coach_suggested_changes_ok"', '23514');
      var hasE = Object.keys(entry).length > 0, hasC = Object.keys(coach).length > 0;
      if (hasE) {
        var ne = Object.assign({}, ex, clone(entry), { updated_by: 'coach', updated_at: nowIso() });
        keepSpineVersion('exercises', ex, ne, COACH);
        Object.assign(ex, ne);
      }
      if (hasC) {
        if (co) { var nc = Object.assign({}, co, clone(coach)); keepSpineVersion('exercise_coach', co, nc, COACH); Object.assign(co, nc); }
        else { co = Object.assign({ id: p.p_id, sfr: null, flags: [], notes: null, suggested_qualities: [], links_before: null, links_history: [], credits: null, cost: null, suggested_changes: [] }, clone(coach)); tbl('exercise_coach').push(co); }
      }
      return { ok: true, entry: hasE ? clone(ex) : null, coach: hasC ? clone(co) : null };
    },
    // stage54: one-step full erasure, emulated from supabase/stage54_erase_person.sql. The same refusals, the same counts, a dry run
    // (the default) that changes nothing, the typed confirmation on a real run, intake forms offered by email or full name, the partner
    // link cleared (the record stays), a receipt without personal data. The stub has no auth.users: the sign-in accounts are counted
    // from the login rows. The SQL itself is tested on a real Postgres by scripts/test_spine_sql.sh.
    coach_erase_person: function (p) {
      var kind = String(p.p_kind == null ? '' : p.p_kind).trim().toLowerCase(), key = String(p.p_key == null ? '' : p.p_key).trim();
      // Like the SQL: an explicit NULL is refused (it once skipped every check and still deleted); an omitted flag is a dry run.
      if (p.p_dry_run === null) throw new Error('p_dry_run must be true or false, not null. Nothing was erased.');
      var dry = p.p_dry_run !== false, ids = p.p_intake_ids || [];
      var lc = function (v) { return String(v == null ? '' : v).trim().toLowerCase(); };
      var norm = function (v) { return lc(v).replace(/\s+/g, ' '); };
      // the last 9 digits of a number, Persian and Arabic-Indic digits folded (null when there are fewer than 9 digits)
      var phoneKey = function (v) {
        var d = String(v == null ? '' : v).replace(/[٠-٩۰-۹]/g, function (c) { return String('٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹'.indexOf(c) % 10); }).replace(/\D/g, '');
        return d.length >= 9 ? d.slice(-9) : null;
      };
      if (['athlete', 'course', 'testing'].indexOf(kind) < 0) throw new Error('Unknown kind of person "' + kind + '": use athlete, course or testing.');
      if (!key) throw new Error('Who? The id or username is empty.');
      var del = {}, counts = {}, word, shown, cands = [], unlinked = [], users = [];
      var pick = function (t, pred) { var rows = (DB[t] || []).filter(pred); del[t] = rows; counts[t] = rows.length; };   // reads never create a table
      if (kind === 'athlete') {
        if (['demo', 'amir_ardekani'].indexOf(key.toLowerCase()) >= 0) throw new Error('"' + key + '" is not a client (the public demo, or the identity this dashboard reads the board through). It is never erased.');
        word = key;
        var prog = tbl('programs').find(function (r) { return r.athlete_id === key; });
        var a = (prog && prog.data && prog.data.athlete) || {};
        shown = ((a.firstName || '') + ' ' + (a.lastName || '')).trim();
        if (!shown) { var hc = tbl('hab_contacts').find(function (r) { return r.athlete_id === key; }); shown = (hc && hc.display_name) || ''; }
        if (!shown) { var ap = tbl('athlete_progress').find(function (r) { return r.athlete_id === key; }); shown = (ap && ap.athlete_name) || ''; }
        shown = shown || key;
        users = tbl('athlete_identities').filter(function (r) { return r.athlete_id === key; }).map(function (r) { return r.user_id; });
        var mine = tbl('hab_contacts').filter(function (r) { return r.athlete_id === key; }), others = tbl('hab_contacts').filter(function (r) { return r.athlete_id !== key; });
        var emails = mine.filter(function (r) { return lc(r.email); }).map(function (r) { return lc(r.email); });
        var phones = mine.map(function (r) { return phoneKey(r.whatsapp); }).filter(Boolean);
        var full = a.firstName && a.lastName ? norm(a.firstName + ' ' + a.lastName) : null;
        // email, then WhatsApp number, then full name (the SQL's order); 'shared' = another athlete's contact carries the same email or number
        cands = tbl('hab_intake').map(function (i) {
          var how = i.athlete_id === key ? 'linked' : lc(i.email) && emails.indexOf(lc(i.email)) >= 0 ? 'email' : (phoneKey(i.contact) && phones.indexOf(phoneKey(i.contact)) >= 0 ? 'whatsapp' : (full && norm(i.name) === full ? 'name' : null));
          var shared = (how === 'email' && others.some(function (c) { return lc(c.email) === lc(i.email); })) || (how === 'whatsapp' && others.some(function (c) { return phoneKey(c.whatsapp) === phoneKey(i.contact); }));
          return how ? { id: i.id, created_at: i.created_at, name: i.name, programme: i.programme, lang: i.lang, matched_on: how, shared: !!shared } : null;
        }).filter(Boolean);
        // The forms to erase are the coach's pick: any form that exists, up to 10; a form that is gone stops the erasure.
        if (ids.filter(function (id, n) { return ids.indexOf(id) === n; }).length > 10) throw new Error('More than 10 intake forms in one erasure is almost certainly a mistake. Nothing was erased.');
        ids.forEach(function (id) { if (!id || !tbl('hab_intake').some(function (i) { return i.id === id; })) throw new Error('One of the intake forms does not exist (it may already be gone). Nothing was erased.'); });
        ['session_history', 'athlete_progress', 'hab_notes', 'hab_titles', 'hab_season_results', 'leaderboard_optin', 'library_sessions', 'messages',
          'call_logs', 'cycle_reports', 'coaching_log_versions', 'coaching_logs', 'program_versions', 'programs', 'athlete_keys', 'hab_contacts',
          'athlete_identities', 'athlete_status'].forEach(function (t) { pick(t, function (r) { return r.athlete_id === key; }); });
        // the rollback copy the 2026-10-09 rename left in the backup schema (the SQL empties every table there with an athlete_id column)
        pick('backup.onename_2026_10_09', function (r) { return r.athlete_id === key; });
        pick('hab_intake', function (r) { return ids.indexOf(r.id) >= 0; });
        unlinked = tbl('affiliates').filter(function (r) { return r.athlete_id === key; }).map(function (r) { return r.code; }).sort();
      } else {
        var T = kind === 'course' ? 'tps_accounts' : 'assess_accounts';
        var acct = tbl(T).find(function (r) { return lc(r.username) === lc(key); });
        if (!acct) throw new Error('There is no ' + (kind === 'course' ? 'course' : 'testing-app') + ' login called "' + key + '". Nothing was erased.');
        word = acct.username; users = [acct.user_id];
        var bn = tbl('buyer_notes').find(function (r) { return r.user_id === acct.user_id; });
        shown = (bn && bn.note) || word;
        if (kind === 'testing') {
          pick('assess_notes', function (r) { return r.account_id === acct.user_id; });
          pick('assess_results', function (r) { return r.account_id === acct.user_id; });
          pick('assess_players', function (r) { return r.account_id === acct.user_id; });
        }
        pick('buyer_notes', function (r) { return r.user_id === acct.user_id; });
        pick(T, function (r) { return r.user_id === acct.user_id; });
      }
      counts.auth_users = users.length;
      if (!dry && lc(p.p_confirm) !== lc(word)) throw new Error('The confirmation does not match. Type exactly "' + word + '" to erase. Nothing was erased.');
      // Like the SQL: "nothing is stored" looks at DATA only (not a bare sign-in, not the intake forms ticked), and the forms are added after
      var total = Object.keys(counts).reduce(function (n, k) { return k === 'auth_users' || k === 'hab_intake' ? n : n + counts[k]; }, 0);
      if (total === 0) throw new Error('Nothing is stored for "' + key + '". Nothing was erased.');
      total += (counts.auth_users || 0) + (counts.hab_intake || 0);
      var logId = null;
      if (!dry) {
        Object.keys(del).forEach(function (t) { if (DB[t]) DB[t] = DB[t].filter(function (r) { return del[t].indexOf(r) < 0; }); });
        // stage61: an application linked to the erased athlete that was not ticked keeps its answers and loses only the link
        if (kind === 'athlete') tbl('hab_intake').forEach(function (r) { if (r.athlete_id === key) { r.athlete_id = null; r.linked_at = null; } });
        tbl('affiliates').forEach(function (r) { if (r.athlete_id === key && kind === 'athlete') r.athlete_id = null; });
        logId = tbl('erasure_log').length + 1;
        tbl('erasure_log').push({ id: logId, erased_at: nowIso(), erased_by: COACH, kind: kind, subject_hash: 'hash:' + kind + ':' + lc(word),
          counts: Object.assign({}, counts, { affiliates_unlinked: unlinked.length }) });
      }
      return { ok: true, dry_run: dry, kind: kind, key: key, shown_as: shown, confirm_word: word, counts: counts, total: total,
        intake_candidates: cands, intake_erased: counts.hab_intake == null ? null : counts.hab_intake, affiliates_unlinked: unlinked, log_id: logId };
    },
    forget_contact: function (p) {
      ['hab_contacts', 'leaderboard_optin', 'athlete_progress'].forEach(function (n) { DB[n] = tbl(n).filter(function (r) { return r.athlete_id !== p.p_athlete_id; }); });
      DB.hab_notes = tbl('hab_notes').filter(function (r) { return r.athlete_id !== p.p_athlete_id; }); return null;
    },
  };
  function rpc(name, params) {
    var thenable = {
      then: function (ok, bad) { return run().then(ok, bad); },
      catch: function (bad) { return run().catch(bad); },
    };
    ['eq', 'order', 'limit', 'select', 'maybeSingle', 'single'].forEach(function (m) { thenable[m] = function () { return thenable; }; });
    var ran = null;
    function run() {
      if (ran) return ran;
      ran = (async function () {
        var call = record({ kind: 'rpc', name: name, payload: clone(params || null) });
        if (ST.delay[name]) await sleep(ST.delay[name]);
        await sleep(0);
        var f = takeFail('rpc', name);
        if (f) { call.result = { error: f.message }; return { data: null, error: { message: f.message, code: f.code != null ? f.code : 'P0001' }, status: 400 }; }
        if (!RPC[name] || (ST.missingRpc || []).indexOf(name) >= 0 || (noStage75() && COURT_RPCS.indexOf(name) >= 0) || (noStage81() && CREW_RPCS.indexOf(name) >= 0) || (noStage84() && OPEN_RPCS.indexOf(name) >= 0) || (noStage96() && LOUNGE_RPCS.indexOf(name) >= 0) || (noStage102() && WEEKLY_RPCS.indexOf(name) >= 0) || (noStage97() && PARTNER_RPCS.indexOf(name) >= 0)) { call.result = { error: 'missing' }; return { data: null, error: { message: 'Could not find the function public.' + name + ' in the schema cache', code: 'PGRST202' }, status: 404 }; }
        try { var d = RPC[name](params || {}); persist(); call.result = { ok: true }; return { data: clone(d), error: null, status: 200 }; }
        catch (e) { call.result = { error: e.message }; return { data: null, error: { message: e.message, code: e.code || 'P0001' }, status: 400 }; }
      })();
      return ran;
    }
    return thenable;
  }

  // ---- Edge Functions (supabase/functions/*/index.ts) ----
  function genPw() { return 'harness-pw-' + Math.random().toString(36).slice(2, 8); }
  var FN = {
    'athlete-login': function (b) {
      var ids = tbl('athlete_identities');
      var one = function (id, typed) {
        var pw = typed || genPw(), row = ids.find(function (r) { return r.athlete_id === id; });
        if (row) { row.initial_password = pw; row.password_set_at = nowIso(); row.sent_at = null; return { athlete_id: id, username: id, password: pw, created: false }; }
        ids.push({ user_id: 'u-' + id, athlete_id: id, email: 'athlete.' + id + '@amirardekani.com', linked_at: nowIso(), initial_password: pw, password_set_at: nowIso(), sent_at: null });
        return { athlete_id: id, username: id, password: pw, created: true };
      };
      if (b.action === 'create' || b.action === 'reset') { if (!/^[A-Za-z0-9_]+$/.test(String(b.athlete_id || ''))) return [400, { error: 'bad athlete_id' }]; return [200, one(b.athlete_id, b.password)]; }
      if (b.action === 'create_many') { var res = (b.athlete_ids || []).map(function (id) { return one(id); }); return [200, { created: res.length, failed: [] }]; }
      if (b.action === 'revoke') { DB.athlete_identities = ids.filter(function (r) { return r.athlete_id !== b.athlete_id; }); return [200, { revoked: true }]; }
      return [400, { error: 'unknown action' }];
    },
  };
  // assess-login and tps-login (the testing app and the course): create / reset / revoke / restore a buyer's login in assess_accounts / tps_accounts,
  // as supabase/functions/*-login/index.ts do (username a-z0-9_ 3-32; revoke bans and keeps the row; restore needs a revoked one).
  function buyerFn(table) {
    return function (b) {
      var rows = tbl(table), u = String(b.username || '');
      if (!/^[a-z0-9_]{3,32}$/.test(u)) return [400, { error: 'bad username' }];
      var row = rows.find(function (r) { return r.username === u; });
      var pw = b.password || genPw();
      if (b.action === 'create') {
        if (row) return [409, { error: 'that username already exists' }];
        rows.push({ user_id: 'u-' + table + '-' + u, username: u, label: b.label || '', created_at: nowIso(), initial_password: pw, password_set_at: nowIso(), sent_at: null, revoked_at: null });
        return [200, { username: u, password: pw, created: true }];
      }
      if (!row) return [404, { error: 'no such login' }];
      if (b.action === 'reset') { row.initial_password = pw; row.password_set_at = nowIso(); row.sent_at = null; return [200, { username: u, password: pw, created: false }]; }
      if (b.action === 'revoke') { row.revoked_at = nowIso(); row.initial_password = null; return [200, { username: u, revoked: true }]; }
      if (b.action === 'restore') { row.revoked_at = null; row.initial_password = pw; row.password_set_at = nowIso(); row.sent_at = null; return [200, { username: u, password: pw, created: false }]; }
      return [400, { error: 'unknown action' }];
    };
  }
  FN['assess-login'] = buyerFn('assess_accounts');
  FN['tps-login'] = buyerFn('tps_accounts');
  var functions = {
    invoke: async function (name, o) {
      var body = o && o.body;
      var call = record({ kind: 'fn', name: name, payload: clone(body) });
      if (ST.delay[name]) await sleep(ST.delay[name]);
      await sleep(0);
      var f = takeFail('fn', name);
      var status, data;
      if (f) { status = f.status || 500; data = { error: f.message }; }
      else if (!FN[name]) { status = 404; data = { error: 'no such function (stub)' }; }
      else { var r = FN[name](body || {}); status = r[0]; data = r[1]; persist(); }
      call.result = { status: status, data: clone(data) };
      if (status >= 200 && status < 300) return { data: data, error: null };
      // supabase-js: FunctionsHttpError, data null, error.context is the Response
      return { data: null, error: { name: 'FunctionsHttpError', message: 'Edge Function returned a non-2xx status code', context: { json: async function () { return data; } } } };
    },
  };

  var session = { access_token: 'harness-token', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'harness-refresh', user: { id: 'coach-uuid', email: COACH, aud: 'authenticated' } };
  if (SEED.signedOut) session = null;
  var auth = {
    getSession: async function () { record({ kind: 'auth', name: 'getSession' }); return { data: { session: clone(session) }, error: null }; },
    getUser: async function () { return { data: { user: session ? clone(session.user) : null }, error: null }; },
    onAuthStateChange: function (cb) {
      window.__authCbs.push(cb);
      record({ kind: 'auth', name: 'onAuthStateChange' });
      if (ST.emitInitial) setTimeout(function () { cb('INITIAL_SESSION', clone(session)); }, 0);
      return { data: { subscription: { id: 'sub-' + window.__authCbs.length, unsubscribe: function () {} } } };
    },
    signOut: async function () { record({ kind: 'auth', name: 'signOut' }); session = null; return { error: null }; },
    signInWithOAuth: async function (o) { record({ kind: 'auth', name: 'signInWithOAuth', payload: clone(o) }); return { data: {}, error: null }; },
  };
  window.__fireAuth = function (event) { window.__authCbs.forEach(function (cb) { cb(event, clone(session)); }); };

  var client = {
    from: function (t) { return new Builder(t); },
    rpc: rpc,
    functions: functions,
    auth: auth,
    channel: function () { return { on: function () { return this; }, subscribe: function () { return this; } }; },
    removeChannel: function () {},
  };
  Object.defineProperty(window, 'supabase', { value: { createClient: function () { record({ kind: 'client', name: 'createClient' }); return client; } }, writable: false, configurable: true });
})();
