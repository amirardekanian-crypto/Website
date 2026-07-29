-- ═══════════════════════════════════════════════════════════════════════════
--  AMIR — PASTE THIS WHOLE FILE INTO THE SUPABASE SQL EDITOR AND PRESS RUN.
-- ═══════════════════════════════════════════════════════════════════════════
--
--  Supabase → your project → SQL Editor → New query → paste → Run.
--  It takes about two seconds. It deletes nothing and it is safe to run twice.
--
--  WHY: the app and the database each keep their own copy of the scoring rules.
--  The app has been updated; this is the other half. Until it runs, the
--  leaderboard pays slightly less than each athlete's own screen shows, because
--  the database still knows about 10 badges and the app knows about 16.
--
--  It does three things:
--    1. Tells the server which habit cannot be ticked by hand (the session), so
--       a rest day is not judged against a workout nobody could log, and moves
--       the qualifying bar to 75%.
--    2. Adds the six new badges, taking the list from 10 to 16.
--    3. Adds the four seasonal event titles, so the server accepts a title the
--       app has awarded instead of refusing it.
--
--  The check at the bottom prints what it did. Expect:
--    qualify_pct 75 · unearnable ["strength"] · milestones 16 · pass_track 18
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ── 1. The weighted day score + the streak gate (stage 19) ────────────────
update public.xp_rules
set rules = rules || '{"unearnable":["strength"],"streakQualifyPct":75}'::jsonb,
    updated_at = now()
where id = 1;

-- ── 2. Badges: 10 -> 16 (stage 20) ───────────────────────────────────────
update public.xp_rules
set rules = rules || jsonb_build_object('milestones', '[
    {"code":"FB","need":1,  "xp":50, "measure":"daysHit:strength"},
    {"code":"CS","need":1,  "xp":100,"measure":"perfectDays"},
    {"code":"HS","need":5,  "xp":100,"measure":"streak:water"},
    {"code":"TS","need":3,  "xp":120,"measure":"streak:strength"},
    {"code":"SW","need":7,  "xp":130,"measure":"daysHit:steps"},
    {"code":"FF","need":5,  "xp":110,"measure":"daysHit:fuel"},
    {"code":"DP","need":10, "xp":75, "measure":"daysWith3"},
    {"code":"ZM","need":10, "xp":100,"measure":"streak:breathe"},
    {"code":"BA","need":10, "xp":150,"measure":"streak:sleep"},
    {"code":"HM","need":12, "xp":150,"measure":"streak:strength"},
    {"code":"RB","need":14, "xp":150,"measure":"streak:mobility"},
    {"code":"IM","need":16, "xp":150,"measure":"streak:supps"},
    {"code":"RR","need":30, "xp":200,"measure":"daysHit:steps"},
    {"code":"MC","need":150,"xp":750,"measure":"daysHit:strength"},
    {"code":"UB","need":60, "xp":600,"measure":"streak:water"},
    {"code":"CN","need":100,"xp":500,"measure":"perfectDays"}
  ]'::jsonb),
  updated_at = now()
where id = 1;

-- ── 3. The four seasonal event titles (stage 20) ─────────────────────────
-- Guarded, so running this file twice does not add them twice.
update public.xp_rules
set rules = jsonb_set(rules, '{passTrack}', (rules -> 'passTrack') || '[
      {"lv":0,"kind":"title","id":"t_sunforged", "name":"SUN-FORGED"},
      {"lv":0,"kind":"title","id":"t_bedrock",   "name":"BEDROCK"},
      {"lv":0,"kind":"title","id":"t_coldforged","name":"COLD-FORGED"},
      {"lv":0,"kind":"title","id":"t_stillhere", "name":"STILL HERE"}
    ]'::jsonb),
    updated_at = now()
where id = 1
  and not (rules -> 'passTrack') @> '[{"id":"t_sunforged"}]'::jsonb;

commit;

-- ── The check ────────────────────────────────────────────────────────────
select rules ->> 'streakQualifyPct'                       as qualify_pct,
       rules -> 'unearnable'                              as unearnable,
       jsonb_array_length(rules -> 'milestones')          as milestones,
       jsonb_array_length(rules -> 'passTrack')           as pass_track,
       (select sum((m ->> 'xp')::int)
          from jsonb_array_elements(rules -> 'milestones') m) as badge_xp_total
from public.xp_rules where id = 1;
