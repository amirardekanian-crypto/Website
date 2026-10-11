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
  };
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
    Object.keys(oldRow).forEach(function (k) { if (k !== 'updated_at' && k !== 'updated_by' && !same(oldRow[k], newRow[k])) ch[k] = clone(newRow[k] === undefined ? null : newRow[k]); });
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
  var RPC = {
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
      if (at >= 0) { if (!s.replace_log && row.log == null) row.log = t[at].log; t[at] = Object.assign(t[at], row); }
      else { row.coach_status = 'new'; t.push(row); }
      return null;
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
      var E = ['name', 'aliases', 'pattern', 'qualities', 'purpose', 'tennis', 'cues', 'equipment', 'loads', 'easier', 'harder', 'alts', 'video', 'status', 'impact', 'muscles'];
      var C = ['sfr', 'flags', 'notes', 'credits', 'cost'];
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
          var how = lc(i.email) && emails.indexOf(lc(i.email)) >= 0 ? 'email' : (phoneKey(i.contact) && phones.indexOf(phoneKey(i.contact)) >= 0 ? 'whatsapp' : (full && norm(i.name) === full ? 'name' : null));
          var shared = (how === 'email' && others.some(function (c) { return lc(c.email) === lc(i.email); })) || (how === 'whatsapp' && others.some(function (c) { return phoneKey(c.whatsapp) === phoneKey(i.contact); }));
          return how ? { id: i.id, created_at: i.created_at, name: i.name, programme: i.programme, lang: i.lang, matched_on: how, shared: !!shared } : null;
        }).filter(Boolean);
        // The forms to erase are the coach's pick: any form that exists, up to 10; a form that is gone stops the erasure.
        if (ids.filter(function (id, n) { return ids.indexOf(id) === n; }).length > 10) throw new Error('More than 10 intake forms in one erasure is almost certainly a mistake. Nothing was erased.');
        ids.forEach(function (id) { if (!id || !tbl('hab_intake').some(function (i) { return i.id === id; })) throw new Error('One of the intake forms does not exist (it may already be gone). Nothing was erased.'); });
        ['session_history', 'athlete_progress', 'hab_notes', 'hab_titles', 'hab_season_results', 'leaderboard_optin', 'library_sessions', 'messages',
          'call_logs', 'cycle_reports', 'coaching_log_versions', 'coaching_logs', 'program_versions', 'programs', 'athlete_keys', 'hab_contacts',
          'athlete_identities'].forEach(function (t) { pick(t, function (r) { return r.athlete_id === key; }); });
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
        if (!RPC[name] || (ST.missingRpc || []).indexOf(name) >= 0) { call.result = { error: 'missing' }; return { data: null, error: { message: 'Could not find the function public.' + name + ' in the schema cache', code: 'PGRST202' }, status: 404 }; }
        try { var d = RPC[name](params || {}); persist(); call.result = { ok: true }; return { data: clone(d), error: null, status: 200 }; }
        catch (e) { call.result = { error: e.message }; return { data: null, error: { message: e.message, code: 'P0001' }, status: 400 }; }
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
