-- The way back from stage83 (the feed only when it has changed). On Amir's word only. Nothing is lost: the function only read, and
-- program.html falls back to get_bell() the moment this one is missing, so the Bell keeps working — it simply sends the whole feed
-- every time again. Safe to run twice.
drop function if exists public.get_bell_if_new(text, text);
