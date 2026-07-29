-- ═══════════════════════════════════════════════════════════════════════════
-- STAGE 20 — milestone tiers, six new weekly milestones, and seasonal events
-- ═══════════════════════════════════════════════════════════════════════════
--
-- NO FUNCTION CHANGES. This is a data update to `public.xp_rules where id = 1`
-- and nothing else — which is the whole point of the design. Two halves:
--
--   1. `milestones` goes 10 -> 16. Six new ones, all reachable in a week, so a
--      new athlete has something to chase before day five. Every one uses a
--      measure the server ALREADY understands (`daysHit:`, `streak:`,
--      `perfectDays`), so hab_bonus_xp needs no edit.
--
--   2. `passTrack` gains the four EVENT titles. Events are a client-side
--      concept — see EVENTS in habits.html — and they pay a TITLE, never XP.
--      That is deliberate: XP is scored twice and a new paying rail means new
--      plpgsql that has to agree with the app for ever, whereas a title is
--      stored, append-only and free to mint. But the server validates a title
--      against passTrack before accepting it, so the ids must exist here or it
--      will refuse a title the app has already awarded.
--
-- ⚠️ RUN THIS BEFORE MERGING habits.html. The client and the row are the two
-- copies of one rulebook (CLAUDE.md, "Everything in Proof that is scored
-- TWICE"). A client with 16 milestones against a row with 10 means the
-- leaderboard silently pays less than the athlete's own screen — nothing
-- errors, the numbers just stop matching.
--
-- SAFE TO RE-RUN. The milestone write is a whole-array replace; the passTrack
-- write is guarded so it appends once and never duplicates.
--
-- ── What this costs in XP ──────────────────────────────────────────────────
-- Milestone total goes 1,625 -> 3,585. That reads like a lot; it is not, for
-- two reasons. The 1,350 of it that is `rare` (MC 750, UB 600) needs 150
-- sessions or a 60-day water run — nobody on the board is close, and by the
-- time they are it is a year of work. The 610 that is `week` is the deliberate
-- part: an athlete's first fortnight was worth almost nothing in one-offs, and
-- that is exactly the fortnight where people quit.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ── 1. Milestones: 10 -> 16, in tier order (week, long, rare) ─────────────
-- `tier` itself is NOT sent: it is presentation only, and the server has no use
-- for it. Order here mirrors ACHIEVEMENTS in habits.html purely for reading.
update public.xp_rules set rules = rules || jsonb_build_object('milestones', '[
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

-- ── 2. Event titles appended to passTrack ────────────────────────────────
-- `lv: 0` because these are not level rewards — nothing on the server reads the
-- level of a title except hab_mint_titles, which mints from the level track;
-- lv 0 is reached by everyone, and minting one early is harmless because the
-- CLIENT decides whether the athlete owns it (CFG.pass.owned) and only ever
-- pushes a title it has actually awarded.
update public.xp_rules set rules = jsonb_set(rules, '{passTrack}',
    (rules -> 'passTrack') || '[
      {"lv":0,"kind":"title","id":"t_sunforged", "name":"SUN-FORGED"},
      {"lv":0,"kind":"title","id":"t_bedrock",   "name":"BEDROCK"},
      {"lv":0,"kind":"title","id":"t_coldforged","name":"COLD-FORGED"},
      {"lv":0,"kind":"title","id":"t_stillhere", "name":"STILL HERE"}
    ]'::jsonb),
    updated_at = now()
where id = 1
  and not (rules -> 'passTrack') @> '[{"id":"t_sunforged"}]'::jsonb;

commit;

-- ── PROOF ──────────────────────────────────────────────────────────────────
-- Expect: milestones 16 · milestone_xp 3585 · passTrack 18
--
--   select jsonb_array_length(rules -> 'milestones') as milestones,
--          (select sum((m ->> 'xp')::int)
--             from jsonb_array_elements(rules -> 'milestones') m) as milestone_xp,
--          jsonb_array_length(rules -> 'passTrack') as pass_track
--   from public.xp_rules where id = 1;
--
-- And that no athlete LOSES anything — the six new milestones only ever add,
-- so every figure here should be >= what it was before:
--
--   select ap.athlete_id,
--          public.hab_bonus_xp(public.hab_log_of(ap.data, ap.athlete_id),
--                              public.hab_cfg_of(ap.data, ap.athlete_id),
--                              s.starts_on, s.starts_on, current_date,
--                              (select rules from public.xp_rules where id = 1))
--   from public.athlete_progress ap
--   cross join (select starts_on from public.current_season()) s
--   order by 1;
