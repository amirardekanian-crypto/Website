-- MADE-UP rows for the restore rehearsal (scripts/restore/rehearse.mjs). Not one real person, programme or number: every name ends in _test, every
-- address is on example.test. It fills EVERY table the dashboard backs up (and the sign-in stand-ins they point at), with the awkward values a real
-- backup has: quotes, backslashes, Farsi, an emoji, dollar-quote tags inside text, arrays, jsonb, numeric, dates, identity and serial ids.
--
-- The cast
--   ava_test       coached, has a login, a programme, sessions (one hidden), a contact, an affiliate link, a linked application
--   ben_test       paused (athlete_status), a login
--   cleo_test      a free Proof user: a contact, notes, no login, no programme
--   gone_test      will be ERASED by the rehearsal, through the real coach_erase_person(): a row in nearly every athlete table
--   reborn_test    has a receipt in erasure_log (id 3) and data: an id that was erased once and used again, for --keep
--   buyer_one, buyer_two     testing-app buyers (players, notes, results)       gone_buyer   a testing buyer who will be erased
--   learner_one, learner_rev course buyers (the second is revoked)               gone_learner a course buyer who will be erased
-- Login ids are fixed so the rehearsal can say which is which.

-- ── sign-ins (the stand-in for Supabase's auth.users) ─────────────────────────────────────────────────────────────────────
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000c0c0', 'amirardekanian@gmail.com'),
  ('00000000-0000-4000-8000-00000000a001', 'athlete.ava_test@amirardekani.com'),
  ('00000000-0000-4000-8000-00000000a002', 'athlete.ben_test@amirardekani.com'),
  ('00000000-0000-4000-8000-00000000a003', 'athlete.gone_test@amirardekani.com'),
  ('00000000-0000-4000-8000-00000000b001', 'assess.buyer_one@amirardekani.com'),
  ('00000000-0000-4000-8000-00000000b002', 'assess.buyer_two@amirardekani.com'),
  ('00000000-0000-4000-8000-00000000b003', 'assess.gone_buyer@amirardekani.com'),
  ('00000000-0000-4000-8000-00000000c001', 'tps.learner_one@amirardekani.com'),
  ('00000000-0000-4000-8000-00000000c002', 'tps.learner_rev@amirardekani.com'),
  ('00000000-0000-4000-8000-00000000c003', 'tps.gone_learner@amirardekani.com');

-- ── the logins ────────────────────────────────────────────────────────────────────────────────────────────────────────────
insert into public.athlete_identities (user_id, athlete_id, email, linked_at, initial_password, password_set_at, sent_at) values
  ('00000000-0000-4000-8000-00000000a001', 'ava_test', 'athlete.ava_test@amirardekani.com', '2026-09-01 10:00:00+00', 'Made-Up-First-Password-1', '2026-09-01 10:00:00+00', null),
  ('00000000-0000-4000-8000-00000000a002', 'ben_test', 'athlete.ben_test@amirardekani.com', '2026-09-02 10:00:00+00', null, '2026-09-02 10:00:00+00', '2026-09-02 11:00:00+00'),
  ('00000000-0000-4000-8000-00000000a003', 'gone_test', 'athlete.gone_test@amirardekani.com', '2026-09-03 10:00:00+00', null, '2026-09-03 10:00:00+00', '2026-09-03 11:00:00+00');

insert into public.assess_accounts (user_id, username, created_at, initial_password, password_set_at, sent_at, revoked_at) values
  ('00000000-0000-4000-8000-00000000b001', 'buyer_one', '2026-09-10 09:00:00+00', 'Made-Up-First-Password-2', '2026-09-10 09:00:00+00', null, null),
  ('00000000-0000-4000-8000-00000000b002', 'buyer_two', '2026-09-11 09:00:00+00', null, '2026-09-11 09:00:00+00', '2026-09-11 10:00:00+00', null),
  ('00000000-0000-4000-8000-00000000b003', 'gone_buyer', '2026-09-12 09:00:00+00', null, '2026-09-12 09:00:00+00', '2026-09-12 10:00:00+00', null);

insert into public.tps_accounts (user_id, username, created_at, initial_password, password_set_at, sent_at, revoked_at) values
  ('00000000-0000-4000-8000-00000000c001', 'learner_one', '2026-09-20 09:00:00+00', null, '2026-09-20 09:00:00+00', '2026-09-20 10:00:00+00', null),
  ('00000000-0000-4000-8000-00000000c002', 'learner_rev', '2026-09-21 09:00:00+00', null, '2026-09-21 09:00:00+00', '2026-09-21 10:00:00+00', '2026-10-01 09:00:00+00'),
  ('00000000-0000-4000-8000-00000000c003', 'gone_learner', '2026-09-22 09:00:00+00', null, '2026-09-22 09:00:00+00', '2026-09-22 10:00:00+00', null);

insert into public.buyer_notes (user_id, app, note, updated_at) values
  ('00000000-0000-4000-8000-00000000b001', 'testing', 'buyer one''s club: \ back-slash and a "quote"', '2026-09-15 09:00:00+00'),
  ('00000000-0000-4000-8000-00000000b003', 'testing', 'gone buyer''s note', '2026-09-15 09:05:00+00'),
  ('00000000-0000-4000-8000-00000000c001', 'course', 'یادداشت خصوصی ✓', '2026-09-25 09:00:00+00'),
  ('00000000-0000-4000-8000-00000000c002', 'course', null, '2026-09-25 09:10:00+00'),
  ('00000000-0000-4000-8000-00000000c003', 'course', 'gone learner''s note', '2026-09-25 09:20:00+00');

-- ── Career Mode's rulebook and catalogue (stage66), BEFORE the rows below: the triggers then make each athlete's facts as the live
--    project does, so career_facts is backed up and restored like any other table. A made-up rulebook, not career/rulebook.toml ──
insert into public.career_rules (version, rules, source, loaded_at) values
  (1, '{"version": 1, "shadow": {"on": true}, "level": {"base": 400, "growth": 0.55, "ranks": ["ROOKIE", "CONTENDER"], "levels_per_rank": 5, "prestige_after": 50},
        "week": {"close_after_days": 1}, "habits": {"completion_bonus": 1.2, "max_custom": 3, "lapse_days": 3, "comeback_stick": 7, "qualify_pct": 80,
        "one_miss_door": true, "locked": ["strength"], "backfill_days": 3, "weights": {"strength": 100, "steps": 60, "water": 30, "custom": 25},
        "targets": {"strength": 1, "steps": 10000, "water": 8}},
        "fact": {"session_finished": {"xp": 400, "limit": 1, "limit_per": "plan_day_week"}, "comeback": {"xp": 50}, "cycle_finished": {"min_share": 0.8}}}',
   'made up', '2026-10-17 09:00:00+00');
insert into public.career_catalogue (kind, id, body, version, loaded_at) values
  ('badge', 'held_weeks', '{"name": "Held Weeks", "meaning": "consistency", "kind": "best_run", "counts": "week_held", "tiers": [{"at": 4, "metal": "bronze", "xp": 200, "size": "highlight"}]}', 1, '2026-10-17 09:00:00+00'),
  ('setting', 'bell', '{"keep_days": 7, "question": "Ring the bell for the crew when you set a best? ''Yes'' \\ or keep it to me"}', 1, '2026-10-17 09:00:00+00');
-- Career Mode's score cache (stage69): nothing in it is a source, but it holds a person's numbers, so it is backed up and erased like the rest
insert into public.career_scores (athlete_id, stamp, score, updated_at) values
  ('ava_test', 'made-up stamp', '{"career": {"xp": 1200, "level": 3, "rank": "ROOKIE 3"}, "season": {"points": 400}, "week": {"points": 0}}', '2026-10-17 09:00:00+00'),
  ('gone_test', 'made-up stamp', '{"career": {"xp": 50, "level": 1, "rank": "ROOKIE 1"}}', '2026-10-17 09:00:00+00');
-- Career Mode's rewards and the moments told (stage70): a person's own, so backed up and erased like the rest
insert into public.career_awards (athlete_id, award_id, kind, item, tier, subject, day, pays, xp, size, meaning, evidence, how, rules_version, created_at) values
  ('ava_test', 'badge:held_weeks:1', 'badge', 'held_weeks', 1, '', '2026-10-12', true, 200, 'highlight', 'consistency', '{"facts": ["week_held|c1|w4"]}', 'live', 1, '2026-10-17 09:00:00+00'),
  ('gone_test', 'achievement:first_best', 'achievement', 'first_best', null, '', '2026-10-10', true, 100, 'highlight', 'progress', '{}', 'baseline', 1, '2026-10-17 09:00:00+00');
insert into public.career_recognition (athlete_id, award_id, audience, size, due_at, told_at, told_by, created_at) values
  ('ava_test', 'badge:held_weeks:1', 'athlete', 'highlight', '2026-10-17 09:00:00+00', '2026-10-17 10:00:00+00', 'proof', '2026-10-17 09:00:00+00'),
  ('gone_test', 'achievement:first_best', 'athlete', 'highlight', '2026-10-17 09:00:00+00', null, null, '2026-10-17 09:00:00+00');
-- Courtside (stage75): Amir's marks, a month's honours, a goal and a line from him; a person's own (the month row is not), so backed up and erased
insert into public.courtside_marks (athlete_id, award_id, saw_at, sent_at, updated_at) values
  ('ava_test', 'badge:held_weeks:1', '2026-10-17 11:00:00+00', '2026-10-17 11:00:00+00', '2026-10-17 11:00:00+00'),
  ('gone_test', 'achievement:first_best', '2026-10-17 11:05:00+00', null, '2026-10-17 11:05:00+00');
insert into public.career_honour_months (month, frozen_at, pick, pick_at) values
  ('2026-09-01', '2026-10-08 09:00:00+00', 'picked', '2026-10-08 09:10:00+00');
insert into public.career_honours (month, honour, athlete_id, value, sent_at, created_at) values
  ('2026-09-01', 'sessions', 'ava_test', '{"n": 14}', '2026-10-08 09:05:00+00', '2026-10-08 09:00:00+00'),
  ('2026-09-01', 'near', 'gone_test', '{"held": 3, "weeks": 4}', null, '2026-10-08 09:00:00+00'),
  ('2026-09-01', 'pick', 'gone_test', '{"slot": "weeks_held", "n": 3}', null, '2026-10-08 09:10:00+00');
insert into public.career_goals (athlete_id, month, line, done_at, created_at, updated_at) values
  ('ava_test', '2026-10-01', 'Squat 3 times a week, every week. Don''t skip the "log"', null, '2026-10-01 09:00:00+00', '2026-10-01 09:00:00+00'),
  ('gone_test', '2026-10-01', 'هر هفته سه جلسه ✓', '2026-10-15 09:00:00+00', '2026-10-01 09:00:00+00', '2026-10-15 09:00:00+00');
insert into public.career_notes (athlete_id, day, line, award_id, created_at, read_at) values
  ('ava_test', '2026-10-17', 'Trained through exam week. Proud of you.', 'badge:held_weeks:1', '2026-10-17 11:00:00+00', null),
  ('gone_test', '2026-10-16', 'Back on it. Good.', null, '2026-10-16 11:00:00+00', null);

-- Crew and the Bell (stage81): only the ANSWER is kept in a backup. The posts, photos, kudos and rings are deleted after 7 days and are
-- left out of BACKUP_TABLES on purpose (SHORT_LIVED in restore_backup.py), so a restore brings back who said yes and nothing they wrote.
insert into public.crew_consent (athlete_id, answer, kinds, name, under13, crew_key, answered_at, first_yes_at, yes_since, updated_at) values
  ('ava_test', 'yes', '{"best": false}', 'Ava T.', false, '11111111-2222-4333-8444-555555555555', '2026-10-18 09:00:00+00', '2026-10-18 09:00:00+00', '2026-10-18 09:00:00+00', '2026-10-18 09:00:00+00'),
  ('gone_test', 'no', '{}', null, false, '22222222-3333-4444-8555-666666666666', '2026-10-18 10:00:00+00', '2026-10-18 09:30:00+00', null, '2026-10-18 10:00:00+00');

-- The phones that asked for a reminder (stage84). This one IS backed up, because a restore without it
-- would cost every athlete the single notification permission their browser gives, and that cannot be
-- asked for twice. push_sent (what went out today) and push_config (the VAPID private key and the
-- sender's shared secret) are deliberately left out, so nothing seeds them.
insert into public.push_subs (endpoint, athlete_id, p256dh, auth, app, kinds, hour, quiet_days, tz_offset, lang, device, created_at, updated_at) values
  ('https://web.push.apple.com/made-up-endpoint-for-the-rehearsal-0001', 'ava_test',
   'BFNpLdIIpJ-1yq2puIicO5GJJTcbteUYElX75z32dK3UQv16g2H4YjDiiGVwB9psguu5f9rKU4d1NPhtBvmI7dM',
   'made-up-auth-aaaa', 'proof', '{"workout": false}', 20, 2, 0, 'en', 'iOS18 · Safari18 · installed',
   '2026-10-19 18:00:00+00', '2026-10-19 18:00:00+00'),
  ('https://fcm.googleapis.com/made-up-endpoint-for-the-rehearsal-0002', 'gone_test',
   'BFNpLdIIpJ-1yq2puIicO5GJJTcbteUYElX75z32dK3UQv16g2H4YjDiiGVwB9psguu5f9rKU4d1NPhtBvmI7dM',
   'made-up-auth-bbbb', 'training', '{}', 19, 3, 210, 'fa', 'Android14 · Chrome130',
   '2026-10-19 18:00:00+00', '2026-10-19 18:00:00+00');

-- ── the programmes and what hangs off an athlete ──────────────────────────────────────────────────────────────────────────
insert into public.programs (athlete_id, data, updated_at, updated_by) values
  ('ava_test', '{"athlete":{"firstName":"Ava","lastName":"Test","goal":"first serve \"speed\" $bk$ and $$ tags \\ backslash"},"cycles":[{"n":1,"startDate":"2026-09-07","endDate":"2026-10-04","weeks":4}],"notes":["پیام فارسی","line\nbreak","emoji 🎾"]}', '2026-10-01 08:00:00+00', 'coach'),
  ('ben_test', '{"athlete":{"firstName":"Ben","lastName":"Test"},"cycles":[]}', '2026-10-02 08:00:00+00', 'coach'),
  ('gone_test', '{"athlete":{"firstName":"Gone","lastName":"Test"},"cycles":[{"n":1}]}', '2026-10-02 09:00:00+00', 'coach'),
  ('reborn_test', '{"athlete":{"firstName":"Reborn","lastName":"Test"},"cycles":[]}', '2026-10-03 09:00:00+00', 'coach');

insert into public.program_versions (athlete_id, data, saved_at, saved_by, note) values
  ('ava_test', '{"athlete":{"firstName":"Ava"},"v":1}', '2026-09-30 08:00:00+00', 'coach', 'before the RPE edit'),
  ('ava_test', '{"athlete":{"firstName":"Ava"},"v":2}', '2026-10-01 07:00:00+00', 'coach', null),
  ('gone_test', '{"v":1}', '2026-10-02 08:30:00+00', 'coach', 'gone one');

insert into public.coaching_logs (athlete_id, body, updated_at) values
  ('ava_test', E'# Ava\nRationale with a ''quote'', a back\\slash and $restore$ in it.\n', '2026-10-01 08:10:00+00'),
  ('ben_test', '# Ben', '2026-10-02 08:10:00+00'),
  ('gone_test', '# Gone', '2026-10-02 09:10:00+00');
-- ids 5, 6 and 9 on purpose: the counter must end up after 9
insert into public.coaching_log_versions (id, athlete_id, body, saved_at, was_updated_at) values
  (5, 'ava_test', '# Ava v1', '2026-09-30 08:10:00+00', null),
  (6, 'ava_test', '# Ava v2', '2026-10-01 08:09:00+00', '2026-09-30 08:10:00+00'),
  (9, 'gone_test', '# Gone v1', '2026-10-02 09:09:00+00', null);

insert into public.athlete_progress (athlete_id, athlete_name, data, updated_at) values
  ('ava_test', 'Ava Test', '{"ava_test_hab_wt":[{"t":1,"kg":61.5}],"settings":{"dark":true}}', '2026-10-03 08:00:00+00'),
  ('ben_test', 'Ben Test', '{}', '2026-10-03 08:01:00+00'),
  ('cleo_test', 'Cleo Test', '{"proof":{"tier":"free"}}', '2026-10-03 08:02:00+00'),
  ('gone_test', 'Gone Test', '{"x":1}', '2026-10-03 08:03:00+00');

insert into public.session_history (athlete_id, athlete_name, day, completed_on, status, session_rpe, duration_min, readiness, day_note, focus, summary, updated_at, coach_status, log, hidden_at, hidden_by) values
  ('ava_test', 'Ava Test', 1, '2026-09-08', 'done', 7, 55, '{"sleep":4,"sore":2}', 'felt "good"', 'Lower', 'Set 1: 3×8 ×60 @7 ✓', '2026-09-08 18:00:00+00', 'new', '{"ex":[{"n":"Back Squat","sets":[{"r":8,"w":60}]}]}', null, null),
  ('ava_test', 'Ava Test', 2, '2026-09-10', 'done', 8, 60, null, null, 'Upper', null, '2026-09-10 18:00:00+00', 'seen', null, null, null),
  ('ava_test', 'Ava Test', 2, '2026-09-12', 'done', 6, 40, null, 'a duplicate day number', 'Upper', null, '2026-09-12 18:00:00+00', 'new', null, '2026-09-13 09:00:00+00', 'coach'),
  ('gone_test', 'Gone Test', 1, '2026-09-09', 'done', 5, 30, null, null, 'Lower', null, '2026-09-09 18:00:00+00', 'new', null, null, null);

insert into public.messages (athlete_id, sender, body, context, created_at, read_by_coach, read_by_athlete) values
  ('ava_test', 'athlete', 'hello coach', 'session 1', '2026-09-08 19:00:00+00', true, true),
  ('ava_test', 'coach', 'hi', null, '2026-09-08 19:05:00+00', true, false),
  ('gone_test', 'athlete', 'bye', null, '2026-09-09 19:00:00+00', false, false);

insert into public.hab_notes (athlete_id, day, body, pct, hidden, created_at, updated_at) values
  ('ava_test', current_date - 1, 'solid day', 100, false, now(), now()),
  ('ava_test', current_date - 2, 'tired', 60, false, now(), now()),
  ('cleo_test', current_date - 1, 'walked 🚶', 80, true, now(), now()),
  ('gone_test', current_date - 1, 'gone note', 50, false, now(), now());

insert into public.hab_titles (athlete_id, title, earned_on, created_at) values
  ('ava_test', 'Early Bird', '2026-09-15', '2026-09-15 07:00:00+00'),
  ('ava_test', 'Streaker', '2026-09-29', '2026-09-29 07:00:00+00'),
  ('gone_test', 'Gone Title', '2026-09-16', '2026-09-16 07:00:00+00');

insert into public.hab_season_results (athlete_id, starts_on, season_name, ended_on, level, xp, created_at) values
  ('ava_test', '2026-07-01', 'Summer', '2026-08-31', 12, 4321, '2026-09-01 00:00:00+00'),
  ('gone_test', '2026-07-01', 'Summer', '2026-08-31', 3, 99, '2026-09-01 00:00:00+00');

insert into public.leaderboard_optin (athlete_id, display_name, joined_at, updated_at, title) values
  ('ava_test', 'Ava T.', '2026-09-05 10:00:00+00', '2026-09-05 10:00:00+00', 'Early Bird'),
  ('ben_test', 'Ben T.', '2026-09-06 10:00:00+00', '2026-09-06 10:00:00+00', null),
  ('gone_test', 'Gone T.', '2026-09-07 10:00:00+00', '2026-09-07 10:00:00+00', null);

insert into public.seasons (name, starts_on, created_at) values
  ('Summer', '2026-07-01', '2026-06-30 00:00:00+00'),
  ('Autumn', '2026-09-01', '2026-08-31 00:00:00+00');

insert into public.xp_rules (id, rules, updated_at) values
  (1, '{"checkin":10,"streakQualifyPct":60,"levelBase":100,"note":"made up"}', '2026-09-01 00:00:00+00');

insert into public.call_logs (athlete_id, athlete_name, call_date, week, duration, tier, rating, scores, sessions_done, sessions_planned, win_vault, answers, summary, ai_summary, ai_model, ai_generated_at) values
  ('ava_test', 'Ava Test', '2026-09-20', 'W3', '12 min', '3mo', 4, '{"energy":4}', 5, 6, 'first pull-up', '{"q1":"fine"}', 'a call', '{"content_worthy":"yes","points":["a","b"]}', 'made-up-model', '2026-09-20 12:00:00+00'),
  ('gone_test', 'Gone Test', '2026-09-21', null, null, null, null, '{}', null, null, null, '{}', null, null, null, null);

insert into public.cycle_reports (athlete_id, athlete_name, cycle, report, weeks_count, sessions_count, model, generated_at) values
  ('ava_test', 'Ava Test', '1', '{"headline":"strong cycle"}', 4, 20, 'made-up-model', '2026-10-04 12:00:00+00'),
  ('gone_test', 'Gone Test', '1', '{}', 4, 2, null, '2026-10-04 12:00:00+00');

insert into public.library_sessions (athlete_id, slug, completed_on, counts_as, title, category_id, duration_min) values
  ('ava_test', 'off-the-mark', '2026-09-14', 'extra', 'Off the Mark', 'speed', 25),
  ('ava_test', 'off-the-mark', '2026-09-21', null, 'Off the Mark', 'speed', 25),
  ('gone_test', 'banded-burner', '2026-09-15', null, 'Banded Burner', 'strength', 30);

insert into public.athlete_keys (athlete_id, secret_key) values ('legacy_test', 'made-up-legacy-key');
insert into public.athlete_status (athlete_id, status, since, note, updated_at) values
  ('ben_test', 'paused', '2026-10-05', 'injured wrist, back on 2026-11-01', '2026-10-05 10:00:00+00');

-- ── contacts, applications, partners ───────────────────────────────────────────────────────────────────────────────────────
insert into public.hab_contacts (athlete_id, email, whatsapp, source, tier, note, created_at, updated_at, display_name) values
  ('ava_test', 'shared@example.test', '+44 7700 900001', 'coach', 'paid', null, '2026-09-01 00:00:00+00', '2026-09-01 00:00:00+00', 'Ava T'),
  ('cleo_test', 'cleo@example.test', '+98 912 000 0002', 'proof', 'free', 'from the bio link', '2026-09-30 00:00:00+00', '2026-09-30 00:00:00+00', 'Cleo T'),
  ('gone_test', 'gone@example.test', '+98 912 000 0001', 'proof', 'free', null, '2026-09-02 00:00:00+00', '2026-09-02 00:00:00+00', 'Gone T');

insert into public.hab_intake (id, created_at, lang, name, email, contact, programme, payload, status, handled_at, athlete_id, outcome, linked_at) values
  -- the same email as gone_test's contact record and nobody else's: the dashboard ticks it by default, and the restore leaves it out
  ('10000000-0000-4000-8000-000000000001', '2026-08-01 10:00:00+00', 'en', 'Gone Applicant', 'gone@example.test', '+98 912 000 0001', '3 months', '{"q":"I want to win"}', 'handled', '2026-08-02 10:00:00+00', null, 'client', null),
  -- ava_test's email, nothing to do with anyone erased: kept, not named
  ('10000000-0000-4000-8000-000000000002', '2026-08-02 10:00:00+00', 'en', 'Shared Parent', 'shared@example.test', '+44 7700 900009', '1 month', '{}', 'new', null, null, null, null),
  -- the same WhatsApp number as gone_test, a different email: kept, named
  ('10000000-0000-4000-8000-000000000003', '2026-08-03 10:00:00+00', 'fa', 'یک نفر', 'someone@example.test', '09120000001', 'یک ماهه', '{"q":"سوال"}', 'new', null, null, null, null),
  -- linked to gone_test by the dashboard but with its own email: kept, the link cleared
  ('10000000-0000-4000-8000-000000000004', '2026-08-04 10:00:00+00', 'en', 'Linked Applicant', 'linked@example.test', null, '6 months', '{}', 'handled', '2026-08-05 10:00:00+00', 'gone_test', 'client', '2026-08-05 10:00:00+00'),
  ('10000000-0000-4000-8000-000000000005', '2026-08-05 10:00:00+00', 'en', 'Ava Applicant', 'ava@example.test', null, '3 months', '{}', 'handled', '2026-08-06 10:00:00+00', 'ava_test', 'client', '2026-08-06 10:00:00+00');

insert into public.affiliates (code, percent, coach_name, coach_name_fa, instagram, whatsapp, email, athlete_id, applied_on, active, retired_on, notes) values
  ('PARTNER10', 10, 'Partner Coach', 'مربی همکار', '@partner_test', '+44 7700 900002', 'partner@example.test', 'ava_test', '2026-08-01', true, null, E'a note with ''quotes'' and a back\\slash and $bk$'),
  ('GONE20', 20, 'Gone Partner', null, null, null, null, 'gone_test', '2026-08-02', false, '2026-09-30', null),
  ('SOLO5', 5, 'Solo', null, null, null, null, null, null, true, null, null);

-- ── the website chatbot's saved chats (stage67) ──
insert into public.chat_conversations (id, site, page, visitor, started_at, last_at, turns, handoff, tokens_in, tokens_out, cost_usd) values
  ('20000000-0000-4000-8000-000000000001', 'en', '/', 'visitor-made-up-1', '2026-09-01 10:00:00+00', '2026-09-01 10:03:00+00', 2, 'whatsapp', 1200, 300, 0.004500);
insert into public.chat_messages (conversation_id, role, content, at) values
  ('20000000-0000-4000-8000-000000000001', 'user', 'How much is the 3 month plan?', '2026-09-01 10:00:00+00'),
  ('20000000-0000-4000-8000-000000000001', 'assistant', 'It is made-up text for the rehearsal.', '2026-09-01 10:00:05+00');

-- ── the Library, the exercise Spine, qualities ─────────────────────────────────────────────────────────────────────────────
insert into public.library_categories (id, kind, title, banner, icon, sort_order) values
  ('speed', 'workout', 'Speed', 'banner-speed-v2.jpg', '⚡', 1),
  ('strength', 'workout', 'Strength', null, null, 2);
insert into public.library (slug, kind, data, published, sort_order, updated_at, category_id) values
  ('off-the-mark', 'workout', '{"title":"Off the Mark","blocks":[{"name":"A","ex":["Sprint Start"]}]}', true, 1, '2026-09-01 00:00:00+00', 'speed'),
  ('banded-burner', 'workout', '{"title":"Banded Burner"}', true, 2, '2026-09-01 00:00:00+00', 'strength'),
  ('draft-article', 'article', '{"title":"A draft"}', false, null, '2026-09-02 00:00:00+00', null);

insert into public.qualities (id, name, family, line, tennis, tests, sort, status, updated_at, updated_by) values
  ('strength', 'Strength', 'force', 'the maximum force you can produce', 'serve and groundstroke power', array['1RM squat','trap-bar pull'], 1, 'approved', '2026-09-01 00:00:00+00', 'coach'),
  ('speed', 'Speed', 'velocity', 'how fast you move', null, '{}', 2, 'draft', '2026-09-01 00:00:00+00', null);

insert into public.exercises (id, name, aliases, pattern, qualities, purpose, tennis, cues, equipment, loads, easier, harder, alts, video, status, updated_at, updated_by, impact, muscles, steps) values
  ('back-squat', 'Back Squat (barbell)', '{}', 'squat', array['strength'], 'build leg strength', 'drive off the ground', '{"setup":["bar low on the traps"],"do":["brace","sit between the hips"]}', array['barbell','rack'], array['knee','hip-groin','low-back'], array['goblet-squat'], '{}', array['goblet-squat'], 'https://www.youtube.com/watch?v=made_up_01', 'approved', '2026-09-01 00:00:00+00', 'coach', 'none', '{"quads":1,"glutes":1,"adductors":0.5}', array['Unrack the bar','Step back','Sit to parallel','Drive up']),
  ('goblet-squat', 'Goblet Squat (dumbbell)', array['cup squat'], 'squat', array['strength','speed'], null, null, null, array['dumbbell'], array['knee'], '{}', array['back-squat'], '{}', null, 'draft', '2026-09-02 00:00:00+00', null, null, null, '{}'),
  ('sprint-start', 'Sprint Start', '{}', 'sprint', array['speed'], null, null, '{"do":["fall forward"]}', '{}', array['ankle-foot','hamstring'], '{}', '{}', '{}', null, 'draft', '2026-09-03 00:00:00+00', null, 'running', '{"hamstrings":1,"calves":0.5}', '{}');

insert into public.exercise_coach (id, sfr, flags, notes, suggested_qualities, links_before, links_history, credits, cost, suggested_changes) values
  ('back-squat', 4, array['review'], E'coach-only: ''quotes'' and a back\\slash', array['strength'], '{"easier":["goblet-squat"]}', '[{"at":"2026-09-01","note":"first links"}]', '{"quads":1,"glutes":1}', 'heavy', '[]'),
  ('goblet-squat', null, '{}', null, '{}', null, '[]', null, null, '[{"field":"cues","to":"cue text"}]');

insert into public.spine_versions (tbl, row_id, op, data, changed, saved_at, saved_by, was_updated_at) values
  ('exercises', 'back-squat', 'update', '{"id":"back-squat","name":"Back Squat"}', '["name"]', '2026-09-02 00:00:00+00', 'coach', '2026-09-01 00:00:00+00'),
  ('exercises', 'old-lift', 'delete', '{"id":"old-lift"}', null, '2026-09-03 00:00:00+00', 'coach', null),
  ('qualities', 'speed', 'update', '{"id":"speed"}', '["line"]', '2026-09-04 00:00:00+00', null, null);

-- ── the course app and the testing app ──────────────────────────────────────────────────────────────────────────────────────
insert into public.tps_content (key, body, version, updated_at) values
  ('lessons', '{"fuel-competition":{"title":"سوخت‌گیری روز مسابقه","body":"متن درس با «نقل‌قول» و \\ و ✓"}}', 'v-made-up-1', '2026-09-24 00:00:00+00'),
  ('tests', '{}', 'v-made-up-2', '2026-09-24 00:00:00+00');
insert into public.course_en (id, kind, sort, body, updated_at) values
  ('fuel-competition', 'lesson', 1.5, '{"title":"Match-day fuel"}', '2026-09-24 00:00:00+00'),
  ('quiz-one', 'test', 999, '{"questions":[]}', '2026-09-24 00:00:00+00');
insert into public.assess_content (key, body, version, updated_at) values
  ('tests', '{"sprint10":{"label":"10 m sprint","unit":"s"}}', 'v-made-up-3', '2026-09-14 00:00:00+00'),
  ('norms', '{"x":[1,2,3]}', 'v-made-up-4', '2026-09-14 00:00:00+00');

insert into public.assess_players (id, account_id, name, birth_year, birth_month, sex, hand, squad, created_at, updated_at, deleted_at) values
  ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000b001', 'Player One', 1390, 5, 'm', 'r', 'U14', '2026-09-11 10:00:00+00', '2026-09-11 10:00:00+00', null),
  ('20000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-00000000b001', 'بازیکن دو', 1392, 11, 'f', 'l', null, '2026-09-11 10:05:00+00', '2026-09-12 10:05:00+00', '2026-09-13 10:05:00+00'),
  ('20000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-00000000b002', 'Player Three', 1388, 1, 'f', 'r', 'U16', '2026-09-12 10:00:00+00', '2026-09-12 10:00:00+00', null),
  ('20000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-00000000b003', 'Gone Player', 1390, 2, 'm', 'r', null, '2026-09-13 10:00:00+00', '2026-09-13 10:00:00+00', null);
insert into public.assess_notes (id, player_id, account_id, body, created_at, deleted_at) values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000b001', E'strong first step, ''quote'' and \\ slash', '2026-09-12 10:00:00+00', null),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-00000000b002', 'یادداشت', '2026-09-13 10:00:00+00', '2026-09-14 10:00:00+00'),
  ('30000000-0000-4000-8000-000000000009', '20000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-00000000b003', 'gone note', '2026-09-13 10:00:00+00', null);
insert into public.assess_results (player_id, test, day, account_id, value, extra, updated_at, deleted_at) values
  ('20000000-0000-4000-8000-000000000001', 'sprint10', '1405/06/20', '00000000-0000-4000-8000-00000000b001', 1.847, '{"wind":"calm","attempts":[1.9,1.85]}', '2026-09-11 12:00:00+00', null),
  ('20000000-0000-4000-8000-000000000001', 'cmj', '1405/06/20', '00000000-0000-4000-8000-00000000b001', 31.5, null, '2026-09-11 12:01:00+00', null),
  ('20000000-0000-4000-8000-000000000002', 'sprint10', '1405/06/21', '00000000-0000-4000-8000-00000000b001', 2.05, null, '2026-09-12 12:00:00+00', '2026-09-13 12:00:00+00'),
  ('20000000-0000-4000-8000-000000000003', 'sprint10', '1405/06/21', '00000000-0000-4000-8000-00000000b002', 1.9, '{}', '2026-09-12 12:00:00+00', null),
  ('20000000-0000-4000-8000-000000000009', 'sprint10', '1405/06/22', '00000000-0000-4000-8000-00000000b003', 2.2, null, '2026-09-13 12:00:00+00', null);

-- ── receipts of erasures that happened before the backup: ids 3 and 7 on purpose (the counter must end up after 7) ──────────
insert into public.erasure_log (id, erased_at, erased_by, kind, subject_hash, counts) overriding system value values
  (3, '2026-09-30 10:00:00+00', 'amirardekanian@gmail.com', 'athlete', encode(sha256(convert_to('athlete:reborn_test', 'UTF8')), 'hex'), '{"programs":1}'),
  (7, '2026-10-03 10:00:00+00', 'amirardekanian@gmail.com', 'athlete', encode(sha256(convert_to('athlete:long_gone_test', 'UTF8')), 'hex'), '{"programs":2,"messages":9}');
-- the counters, as a live database would have them after those explicit ids (the rehearsal's erasures then get 8, 9 and 10)
select setval(pg_get_serial_sequence('public.erasure_log', 'id'), 7);
select setval('public.coaching_log_versions_id_seq', 9);
