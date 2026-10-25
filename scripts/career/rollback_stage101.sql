-- rollback_stage101.sql — takes the Inbox's server function away (the app then shows no tray).
drop function if exists public.get_inbox(timestamptz);
