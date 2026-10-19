-- The way back from stage77 (an athlete's read of their goal, Amir's lines, "Amir saw this" and their honours). On Amir's word only.
-- Nothing depends on it but the light screens of AA Performance, which then show no goal, no lines and no "saw this" (they hide what does not load).
-- Afterwards remake supabase/schema_snapshot.sql in the same commit. Safe to run twice.
drop function if exists public.get_my_moments(text);
drop function if exists public.mark_note_read(text, date);
