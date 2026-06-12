// ============================================================================
//  Supabase Edge Function: summarise-call
//  Secure proxy between call-log.html and the Claude API.
//
//  Why this exists: the website is a static site, so the Anthropic API key can
//  never live in the page. This function holds the key as a server-side secret,
//  verifies the caller is the signed-in coach, calls Claude, and returns a
//  structured coaching summary. The browser never sees the key.
//
//  Secrets it needs (set in Supabase → Edge Functions → Manage secrets):
//    ANTHROPIC_API_KEY   — your Claude API key (sk-ant-...)
//    SUMMARY_MODEL       — optional; defaults to claude-opus-4-8
//  SUPABASE_URL is provided automatically by the platform.
//
//  Deploy: Supabase dashboard → Edge Functions → Deploy a new function named
//  "summarise-call", paste this file. (Or `supabase functions deploy summarise-call`.)
// ============================================================================

const COACH_EMAIL = "amirardekanian@gmail.com";
const MODEL = Deno.env.get("SUMMARY_MODEL") || "claude-opus-4-8";
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";

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

// The prompt that turns one weekly check-in CALL into a clean weekly snapshot.
// This is ONE of ~4–5 weekly check-ins that make up a cycle. The coach collects
// the set and reviews them (plus the workout logs) at cycle-end to plan the next
// cycle — so this step makes NO next-cycle or load decisions. It just captures
// the week faithfully. It also does NOT see the athlete's workout logs.
const SYSTEM_PROMPT = `You are the assistant to an elite strength & conditioning coach who works with tennis players and physical-prep clients. You are given the notes from ONE athlete's weekly check-in CALL. Produce a concise weekly snapshot in the requested JSON shape. Write like a sharp coach noting the week for later review, not like an AI.

Context: this is one of roughly 4–5 weekly check-ins that make up a training cycle. The coach reviews the whole set (together with the workout logs) at cycle-end to plan the next cycle. So DO NOT make next-cycle decisions, load decisions, or programming calls here — just capture THIS week clearly and faithfully.

Use ONLY the check-in data provided: the wellbeing / sleep / energy / soreness / RPE / on-court scores, the self-reported sessions done vs planned, and the coach's notes. You do NOT have their workout logs — do not infer training detail you weren't given. If a field is empty, treat it as "not discussed" rather than assuming the best or worst.

coaching_summary: 3–5 tight sentences on how the week went — wellbeing and recovery (reference the actual scores), the training response as the athlete described it, life context, and overall trajectory for the week.
wins: the concrete wins or improvements surfaced this week.
win_quote: the single most powerful athlete line (verbatim if present), or "" if none.
content_worthy: true ONLY when there is a specific, shareable moment — a number/PR, a clear strength-to-court transfer ("legs fresher in the 3rd set"), or a transformation line — not a generic good week.
content_angle: one line on why it's content / the hook, or "" if not content-worthy.
athlete_goals: the athlete's stated goals or intentions for next week, in their framing.
flags: clinical or adherence red flags that need the coach's eye — e.g. "Right knee pain 2nd week running → watch", "Sleep <4/10 all week", "Wellbeing 3/10 — check in mid-week". Empty array if none.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    coaching_summary: { type: "string" },
    wins: { type: "array", items: { type: "string" } },
    win_quote: { type: "string" },
    content_worthy: { type: "boolean" },
    content_angle: { type: "string" },
    athlete_goals: { type: "array", items: { type: "string" } },
    flags: { type: "array", items: { type: "string" } },
  },
  required: [
    "coaching_summary", "wins", "win_quote", "content_worthy",
    "content_angle", "athlete_goals", "flags",
  ],
};

// Turn the posted call-log object into readable text for the model.
function formatCall(d: any): string {
  const s = d.scores || {};
  const sc = (l: string, v: unknown) => `${l}: ${v ?? "—"}/10`;
  const lines: string[] = [];
  lines.push(`ATHLETE: ${d.athlete_name || d.athlete_id || "Unknown"}`);
  lines.push(`DATE: ${d.call_date || "—"} | CYCLE: ${d.week || "—"} | TIER: ${d.tier || "—"} | DURATION: ${d.duration || "—"}`);
  lines.push("");
  lines.push("SCORES:");
  lines.push(`${sc("Wellbeing", s.well)} | ${sc("Sleep", s.sleep)} | ${sc("Energy", s.energy)}`);
  lines.push(`${sc("Soreness", s.sore)} | ${sc("RPE", s.rpe)} | ${sc("On-court", s.court)}`);
  lines.push(`Sessions done/planned: ${d.sessions_done ?? "—"}/${d.sessions_planned ?? "—"}`);
  lines.push("");
  if (d.win_vault) lines.push(`WIN VAULT (best quote captured): ${d.win_vault}\n`);
  lines.push("CALL NOTES:");
  const answers = d.answers || {};
  for (const k of Object.keys(answers)) {
    const a = answers[k];
    if (a && a.value) lines.push(`- ${a.label || k}: ${a.value}`);
  }
  return lines.join("\n");
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, cors);
  }
  if (!ANTHROPIC_KEY) {
    return json({ error: "Server not configured: ANTHROPIC_API_KEY missing" }, 500, cors);
  }

  // --- Verify the caller is the signed-in coach (the real gate) ---
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
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

  // --- Build the prompt from the posted call data ---
  let data: any;
  try { data = await req.json(); } catch { return json({ error: "Bad JSON body" }, 400, cors); }

  // --- Call Claude ---
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        output_config: { format: { type: "json_schema", schema: SCHEMA } },
        messages: [{ role: "user", content: `Here is this week's check-in call. Summarise it.\n\n${formatCall(data)}` }],
      }),
    });
    const body = await r.json();
    if (!r.ok) {
      return json({ error: body?.error?.message || `Claude API error ${r.status}` }, 502, cors);
    }
    // output_config.format guarantees the first text block is valid JSON
    const text = (body.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
    const summary = JSON.parse(text);
    return json({ ok: true, summary, model: MODEL, generated_at: new Date().toISOString() }, 200, cors);
  } catch (e) {
    return json({ error: "Summary generation failed: " + (e as Error).message }, 502, cors);
  }
});

function json(obj: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });
}
