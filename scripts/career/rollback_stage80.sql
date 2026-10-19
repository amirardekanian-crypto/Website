-- rollback_stage80.sql — takes supabase/stage80_career_achievements_read.sql off: drops get_achievements(). On Amir's word only.
-- It only read, so nothing else changes; the Four Courts section in program.html then shows nothing (it draws only from a server answer).
drop function if exists public.get_achievements(text);
