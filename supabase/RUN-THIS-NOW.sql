-- ═══════════════════════════════════════════════════════════════════════════
--  AMIR — ONE MORE PASTE. Supabase → SQL Editor → New query → paste → Run.
-- ═══════════════════════════════════════════════════════════════════════════
--
--  Your last check came back:  badges 16 · bar 75 · titles 5
--
--  The first two are right — the badge list and the qualifying bar are done.
--  The third is not: the app can hand out 18 titles and card looks, and the
--  server's list only knows 5. The server REFUSES a title it does not
--  recognise, so 13 of them would simply never appear next to anyone's name on
--  the leaderboard or the wall.
--
--  That gap is older than today — the four new event titles went in fine, but
--  the level-track titles were never all there to begin with.
--
--  This statement only ever ADDS. It reads whatever is in the list now, works
--  out which of the 18 are missing, and appends just those. Nothing is removed,
--  nothing anyone has already earned is touched (earned titles live in a
--  separate table, public.hab_titles), and running it twice does nothing the
--  second time.
--
--  Expect afterwards:  badges 16 · bar 75 · titles 18
-- ═══════════════════════════════════════════════════════════════════════════

begin;

with cur as (
  select coalesce(rules -> 'passTrack', '[]'::jsonb) as pt
  from public.xp_rules where id = 1
),
want as (
  select '[
    {"lv":2, "kind":"title","id":"t_signed",    "name":"SIGNED ON"},
    {"lv":4, "kind":"title","id":"t_23",        "name":"THE TWENTY-THREE"},
    {"lv":6, "kind":"card", "id":"c_ember",     "name":"EMBER"},
    {"lv":8, "kind":"title","id":"t_early",     "name":"EARLY DOORS"},
    {"lv":11,"kind":"title","id":"t_night",     "name":"NIGHT SHIFT"},
    {"lv":14,"kind":"card", "id":"c_blueprint", "name":"BLUEPRINT"},
    {"lv":17,"kind":"title","id":"t_between",   "name":"BETWEEN SESSIONS"},
    {"lv":21,"kind":"title","id":"t_iron",      "name":"IRONCLAD"},
    {"lv":25,"kind":"card", "id":"c_night",     "name":"NIGHTFALL"},
    {"lv":29,"kind":"title","id":"t_metronome", "name":"THE METRONOME"},
    {"lv":34,"kind":"title","id":"t_weather",   "name":"WEATHERPROOF"},
    {"lv":39,"kind":"card", "id":"c_flare",     "name":"FLARE"},
    {"lv":44,"kind":"title","id":"t_unbroken",  "name":"UNBROKEN"},
    {"lv":50,"kind":"title","id":"t_proof",     "name":"PROOF ITSELF"},
    {"lv":0, "kind":"title","id":"t_sunforged", "name":"SUN-FORGED"},
    {"lv":0, "kind":"title","id":"t_bedrock",   "name":"BEDROCK"},
    {"lv":0, "kind":"title","id":"t_coldforged","name":"COLD-FORGED"},
    {"lv":0, "kind":"title","id":"t_stillhere", "name":"STILL HERE"}
  ]'::jsonb as pt
),
missing as (
  select coalesce(jsonb_agg(w.val), '[]'::jsonb) as pt
  from jsonb_array_elements((select pt from want)) w(val)
  where not exists (
    select 1 from jsonb_array_elements((select pt from cur)) c(val)
    where c.val ->> 'id' = w.val ->> 'id'
  )
)
update public.xp_rules
set rules = jsonb_set(rules, '{passTrack}',
      (select pt from cur) || (select pt from missing)),
    updated_at = now()
where id = 1;

commit;

-- ── The check ────────────────────────────────────────────────────────────
-- Expect: badges 16 · bar 75 · titles 18 · missing_from_server 0
select jsonb_array_length(rules -> 'milestones') as badges,
       rules ->> 'streakQualifyPct'              as bar,
       jsonb_array_length(rules -> 'passTrack')  as titles,
       (select count(*)
          from (values ('t_signed'),('t_23'),('c_ember'),('t_early'),('t_night'),
                       ('c_blueprint'),('t_between'),('t_iron'),('c_night'),
                       ('t_metronome'),('t_weather'),('c_flare'),('t_unbroken'),
                       ('t_proof'),('t_sunforged'),('t_bedrock'),('t_coldforged'),
                       ('t_stillhere')) v(id)
         where not exists (
           select 1 from jsonb_array_elements(rules -> 'passTrack') e(val)
           where e.val ->> 'id' = v.id)) as missing_from_server
from public.xp_rules where id = 1;
