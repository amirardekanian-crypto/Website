-- stage43 — a pending list for Spine wording proposals (2026-09-26). Applied on Amir's word the same day.
--
-- The pipeline audit (2026-09-26): Spine Upkeep may not change a
-- field that already has content on an APPROVED entry (cues, purpose, tennis, a link, a count, SFR,
-- flags). It proposes the change to Amir instead (CUE-4, /spine Upkeep step 2). Quality suggestions
-- already had a durable home (exercise_coach.suggested_qualities, stage32b); every other proposal was
-- only printed in one handoff, and was lost if nobody acted on it that day.
--
-- Same pattern as suggested_qualities: the coach-only half of the entry holds the suggestion, and it
-- reaches exercises (and so a phone) only when Amir says yes. One jsonb array per entry:
--
--   suggested_changes  jsonb  [{ "field": "cues" | "purpose" | "tennis" | "equipment" | "easier" |
--                                          "harder" | "alts" | "credits" | "cost" | "sfr" | "flags",
--                                "old":   the value as it stood when proposed (exactly, for the diff),
--                                "new":   the proposed value, same shape as the column,
--                                "why":   one line, general (never an athlete's name or detail),
--                                "from":  the run that proposed it, e.g. "program-assemble 2026-09-26",
--                                "at":    ISO timestamp }]
--
-- Written by /spine Upkeep (the end of /program-assemble, /program-edit, /workout). Read and cleared by
-- the next /spine run, after Amir's word: yes -> the field is written on public.exercises (old value
-- backed up in links_history first) and the item removed; no -> the item removed. Nothing else reads it.
--
-- Coach-only (exercise_coach RLS is is_coach(); get_exercises() never reads this table). coach.html's
-- save upserts only the columns it names, so it never clears this column.
--
-- Apply with the Supabase MCP apply_migration (project bvipfipbdcyqnbczjmaq), name stage43_spine_proposals.

alter table public.exercise_coach add column if not exists suggested_changes jsonb not null default '[]'::jsonb;

alter table public.exercise_coach drop constraint if exists exercise_coach_suggested_changes_ok;
alter table public.exercise_coach add constraint exercise_coach_suggested_changes_ok check (
  jsonb_typeof(suggested_changes) = 'array'
);

comment on column public.exercise_coach.suggested_changes is
  'Pending proposals for an approved entry (field, old, new, why, from, at). Claude writes, Amir decides, /spine clears. Never read by a phone.';

-- Check after applying:
--   select column_name, column_default from information_schema.columns
--    where table_schema = 'public' and table_name = 'exercise_coach' and column_name = 'suggested_changes';
