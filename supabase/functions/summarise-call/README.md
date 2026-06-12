# summarise-call — Edge Function

Secure proxy between `call-log.html` and the Claude API. Holds the Anthropic API
key as a server-side secret so it never touches the browser, verifies the caller
is the signed-in coach, and returns a structured coaching summary of a weekly
check-in call.

## One-time setup

1. **Get an Anthropic API key** — console.anthropic.com → API keys → create key (`sk-ant-...`).
2. **Run the migration** — paste `supabase/stage7_call_log_ai.sql` into the Supabase SQL editor and run it (adds the `ai_summary` columns to `call_logs`).
3. **Deploy the function** — Supabase dashboard → **Edge Functions** → **Deploy a new function**, name it exactly `summarise-call`, paste `index.ts`.
   - **Turn OFF "Verify JWT"** for this function. It does its own auth (checks the coach email from the user's token), and leaving the gateway check on breaks the browser's CORS preflight.
   - CLI equivalent: `supabase functions deploy summarise-call --no-verify-jwt`
4. **Set the secret** — Edge Functions → **Manage secrets** → add:
   - `ANTHROPIC_API_KEY` = your `sk-ant-...` key
   - *(optional)* `SUMMARY_MODEL` = `claude-sonnet-4-6` to cut cost ~5× (default is `claude-opus-4-8`)
5. **Push** `call-log.html` to GitHub.

## Test

Open `https://www.amirardekani.com/call-log.html`, pick an athlete, fill a few
fields, click **✨ Summarise (AI)**. The editable AI panel appears; edit anything,
then **💾 Save Call Log** to store it.

## Cost

~1–3¢ per summary on Opus 4.8; less on Sonnet 4.6. Only runs when you click the button.

## Editing the coaching logic

The prompt that encodes the load-decision framework, ACWR awareness, and content
flagging lives in `SYSTEM_PROMPT` in `index.ts`. Edit it and redeploy to tune how
the summaries read.
