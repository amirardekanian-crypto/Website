-- ============================================================================
--  STAGE 7 — AI coaching summary on call logs
--  Run AFTER stage5_call_logs.sql. Safe to re-run.
--
--  Adds three columns to public.call_logs to hold the AI-generated coaching
--  summary (produced by the `summarise-call` Edge Function and reviewed/edited
--  by the coach before saving). No new RLS needed — the existing
--  "coach manage call_logs" policy already covers every column.
-- ============================================================================

alter table public.call_logs
  add column if not exists ai_summary      jsonb,        -- structured: {coaching_summary, load_decision, load_reasoning, session_target, wins[], win_quote, content_worthy, content_angle, athlete_goals[], flags[]}
  add column if not exists ai_model        text,         -- which Claude model produced it
  add column if not exists ai_generated_at timestamptz;  -- when it was generated

-- Lets the dashboard quickly find logs flagged as content-worthy (Step 3).
create index if not exists call_logs_content_flag_idx
  on public.call_logs (((ai_summary ->> 'content_worthy')))
  where ai_summary is not null;
