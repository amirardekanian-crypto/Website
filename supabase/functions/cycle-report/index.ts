// ============================================================================
//  Supabase Edge Function: cycle-report
//  End-of-cycle analysis. Reads ALL the weekly check-in summaries for a cycle
//  PLUS all the workout logs (session_history) for that cycle, asks Claude to
//  surface trends that drive next-cycle programming, and saves the report.
//
//  Secrets (Supabase → Edge Functions → Manage secrets):
//    ANTHROPIC_API_KEY            — your Claude API key
//    SUMMARY_MODEL                — optional; defaults to claude-opus-4-8
//  SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the platform.
//
//  Deploy: name it "cycle-report", paste this file, turn OFF "Verify JWT".
// ============================================================================

const COACH_EMAIL = "amirardekanian@gmail.com";
const MODEL = Deno.env.get("SUMMARY_MODEL") || "claude-opus-4-8";
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const ALLOWED_ORIGINS = [
  "https://www.amirardekani.com",
  "https://amirardekani.com",
  "http://localhost:8000",
];

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

const SYSTEM_PROMPT = `You are the assistant to an elite strength & conditioning coach (tennis + physical prep). A training cycle (~4–5 weeks) has just ended for ONE athlete. You are given two data sources for that cycle:
1. The weekly check-in SUMMARIES from each week (wellbeing/sleep/energy/soreness/RPE/on-court scores, sessions done vs planned, wins, the athlete's own words, flags).
2. The athlete's logged WORKOUT SESSIONS across the cycle (per-session RPE, duration, completion status, readiness, focus).

Produce an end-of-cycle report whose JOB is to drive the programming decisions for the NEXT cycle. Analyse TRENDS across the weeks and the logs — do not just restate individual weeks. Cross-reference the two sources: does the self-reported check-in line up with what they actually logged?

Look at: wellbeing / sleep / energy / soreness trajectories week to week; RPE and training-load trend; adherence (sessions done vs planned, completion rate); recovery signals; recurring flags; and notable single sessions.

Fields:
- cycle_overview: 3–5 sentences — the arc of the cycle and the headline.
- trends: specific, data-backed observations. Cite direction and rough numbers ("soreness climbed 3→7 over weeks 3–5", "adherence 11/12 sessions", "RPE drifted up while on-court scores fell").
- what_worked: concrete things to keep.
- what_to_change: concrete things to adjust.
- programming_decisions: the actual calls this data supports for next cycle — load direction, volume, exercise emphasis, recovery, scheduling. Make them DECISIONS, not vague advice.
- load_direction: the overall read for next cycle (one of progress | maintain | reduce | deload | mixed).
- content_wins: improvements or wins across the cycle that are content-worthy — a PR, a clear strength-to-court transfer, a transformation — with enough specifics to actually make content. Empty if none.
- flags: anything needing attention before or into next cycle (niggles, low recovery, adherence).

Use ONLY the provided data. If a source is thin (few weeks logged, sparse sessions), say so plainly rather than inventing trends.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    cycle_overview: { type: "string" },
    trends: { type: "array", items: { type: "string" } },
    what_worked: { type: "array", items: { type: "string" } },
    what_to_change: { type: "array", items: { type: "string" } },
    programming_decisions: { type: "array", items: { type: "string" } },
    load_direction: { type: "string", enum: ["progress", "maintain", "reduce", "deload", "mixed"] },
    content_wins: { type: "array", items: { type: "string" } },
    flags: { type: "array", items: { type: "string" } },
  },
  required: [
    "cycle_overview", "trends", "what_worked", "what_to_change",
    "programming_decisions", "load_direction", "content_wins", "flags",
  ],
};

function rest(path: string): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, cors);
  if (!ANTHROPIC_KEY) return json({ error: "Server not configured: ANTHROPIC_API_KEY missing" }, 500, cors);
  if (!SERVICE_KEY) return json({ error: "Server not configured: service role key missing" }, 500, cors);

  // --- Verify the caller is the signed-in coach ---
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Not signed in" }, 401, cors);
  try {
    const u = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: req.headers.get("apikey") || "" },
    });
    if (!u.ok) return json({ error: "Invalid session" }, 401, cors);
    const user = await u.json();
    if ((user.email || "").toLowerCase() !== COACH_EMAIL.toLowerCase()) {
      return json({ error: "Not authorised" }, 403, cors);
    }
  } catch (_e) {
    return json({ error: "Auth check failed" }, 401, cors);
  }

  // --- Inputs ---
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Bad JSON body" }, 400, cors); }
  const athleteId = String(body.athlete_id || "").trim();
  const athleteName = String(body.athlete_name || athleteId);
  const cycle = String(body.cycle || "").trim();
  if (!athleteId || !cycle) return json({ error: "athlete_id and cycle are required" }, 400, cors);

  try {
    // 1) Weekly check-in summaries for this cycle (week column holds "Week X · Cycle Y")
    const wkRes = await rest(
      `call_logs?athlete_id=eq.${encodeURIComponent(athleteId)}` +
      `&week=ilike.${encodeURIComponent("*cycle " + cycle + "*")}` +
      `&select=week,call_date,scores,sessions_done,sessions_planned,win_vault,ai_summary&order=call_date.asc`,
    );
    const weeklies: any[] = wkRes.ok ? await wkRes.json() : [];
    if (!weeklies.length) {
      return json({ error: `No weekly check-ins found for Cycle ${cycle}. Save some weekly logs first.` }, 404, cors);
    }

    // 2) Workout logs over the cycle's date window (from the weeklies' call dates, padded)
    const dates = weeklies.map((w) => w.call_date).filter(Boolean).sort();
    const start = addDays(dates[0], -16);
    const end = addDays(dates[dates.length - 1], 3);
    const seRes = await rest(
      `session_history?athlete_id=eq.${encodeURIComponent(athleteId)}` +
      `&completed_on=gte.${start}&completed_on=lte.${end}` +
      `&select=day,completed_on,status,session_rpe,duration_min,focus,readiness,day_note&order=completed_on.asc`,
    );
    const sessions: any[] = seRes.ok ? await seRes.json() : [];

    // --- Build the analysis prompt ---
    const text = formatCycle(athleteName, cycle, weeklies, sessions);

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 3000,
        system: SYSTEM_PROMPT,
        output_config: { format: { type: "json_schema", schema: SCHEMA } },
        messages: [{ role: "user", content: text }],
      }),
    });
    const ai = await r.json();
    if (!r.ok) return json({ error: ai?.error?.message || `Claude API error ${r.status}` }, 502, cors);
    const out = (ai.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
    const report = JSON.parse(out);
    const generated_at = new Date().toISOString();

    // --- Save it (upsert by athlete + cycle) ---
    await fetch(`${SUPABASE_URL}/rest/v1/cycle_reports?on_conflict=athlete_id,cycle`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "content-type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        athlete_id: athleteId, athlete_name: athleteName, cycle, report,
        weeks_count: weeklies.length, sessions_count: sessions.length,
        model: MODEL, generated_at,
      }),
    });

    return json({
      ok: true, report, model: MODEL, generated_at,
      weeks_count: weeklies.length, sessions_count: sessions.length,
    }, 200, cors);
  } catch (e) {
    return json({ error: "Cycle report failed: " + (e as Error).message }, 502, cors);
  }
});

function formatCycle(name: string, cycle: string, weeklies: any[], sessions: any[]): string {
  const L: string[] = [];
  L.push(`ATHLETE: ${name} — CYCLE ${cycle}`);
  L.push(`Weekly check-ins: ${weeklies.length} · Logged sessions: ${sessions.length}`);
  L.push("");
  L.push("=== WEEKLY CHECK-IN SUMMARIES ===");
  weeklies.forEach((w, i) => {
    const s = w.scores || {};
    const ai = w.ai_summary || {};
    L.push(`\n--- ${w.week || "Week " + (i + 1)} (${w.call_date || "—"}) ---`);
    L.push(`Scores — wellbeing ${s.well ?? "—"}, sleep ${s.sleep ?? "—"}, energy ${s.energy ?? "—"}, soreness ${s.sore ?? "—"}, RPE ${s.rpe ?? "—"}, on-court ${s.court ?? "—"}; sessions ${w.sessions_done ?? "—"}/${w.sessions_planned ?? "—"}`);
    if (ai.coaching_summary) L.push(`Summary: ${ai.coaching_summary}`);
    if (ai.wins && ai.wins.length) L.push(`Wins: ${ai.wins.join("; ")}`);
    if (ai.flags && ai.flags.length) L.push(`Flags: ${ai.flags.join("; ")}`);
    if (ai.athlete_goals && ai.athlete_goals.length) L.push(`Goals: ${ai.athlete_goals.join("; ")}`);
    if (!ai.coaching_summary && w.win_vault) L.push(`Win vault: ${w.win_vault}`);
  });
  L.push("\n=== LOGGED WORKOUT SESSIONS ===");
  if (!sessions.length) {
    L.push("(No logged sessions found in the cycle window.)");
  } else {
    sessions.forEach((se) => {
      const rd = se.readiness && typeof se.readiness === "object" ? se.readiness.composite : null;
      L.push(`${se.completed_on} · Day ${se.day ?? "—"} · ${se.status || "—"} · RPE ${se.session_rpe ?? "—"} · ${se.duration_min ?? "—"}min${rd != null ? ` · readiness ${rd}/5` : ""}${se.focus ? ` · ${se.focus}` : ""}${se.day_note ? ` · note: ${se.day_note}` : ""}`);
    });
  }
  L.push("\nAnalyse the trends across both sources and produce the end-of-cycle report.");
  return L.join("\n");
}

function json(obj: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "content-type": "application/json" } });
}
