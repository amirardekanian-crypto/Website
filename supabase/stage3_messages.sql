-- ============================================================================
--  STAGE 3 — two-way messaging (coach-initiated)
--  Project: bvipfipbdcyqnbczjmaq (eu-west-2). Run AFTER stage1 + stage2.
--  Safe to re-run: every statement is guarded.
--
--  Model (agreed with coach):
--   - Athletes keep sending notes the way they already do (per-exercise notes
--     + the finish-session note land in session_history). Those are the inbound.
--   - The COACH starts every chat thread, by replying to a note. Only the notes
--     the coach replies to get "promoted" into the messages table — so the chat
--     never fills up with one note per session. The rest stay on their session
--     record (session_history) and are cleared with "Mark read".
--   - Once a thread exists, the athlete can answer back on it (but can't cold-
--     start one). Their reply is written through send_athlete_message().
--
--  Security mirrors stage1/2: athletes (anon) never touch the table directly —
--  they go through key-checked SECURITY DEFINER functions. Only the signed-in
--  coach (allowlisted email) gets direct table access via RLS.
-- ============================================================================

-- ── the chat store ─────────────────────────────────────────────────────────
create table if not exists public.messages (
  id              bigint generated always as identity primary key,
  athlete_id      text        not null,
  sender          text        not null check (sender in ('coach','athlete')),
  body            text        not null,
  context         text,                                  -- e.g. 'session:3:2026-05-28', or null for general
  created_at      timestamptz not null default now(),
  read_by_coach   boolean     not null default false,
  read_by_athlete boolean     not null default false
);
alter table public.messages enable row level security;
create index if not exists messages_athlete_idx on public.messages (athlete_id, created_at);

-- Coach: full direct access, gated by the allowlisted email (the real gate).
drop policy if exists "coach manage messages" on public.messages;
create policy "coach manage messages" on public.messages
  for all to authenticated
  using      ( (auth.jwt() ->> 'email') = 'amirardekanian@gmail.com' )
  with check ( (auth.jwt() ->> 'email') = 'amirardekanian@gmail.com' );

-- ── tracks which session notes the coach has dealt with ────────────────────
-- 'new'      = athlete left a note, coach hasn't acted → shows as "to reply"
-- 'read'     = coach acknowledged it (no reply needed) → chip clears
-- 'replied'  = coach replied (note promoted into the chat) → chip clears
alter table public.session_history
  add column if not exists coach_status text not null default 'new';

-- Coach can UPDATE session rows (only to set coach_status). Athletes write via
-- save_session() as before; this just lets the dashboard flip the status.
drop policy if exists "coach update sessions" on public.session_history;
create policy "coach update sessions" on public.session_history
  for update to authenticated
  using      ( (auth.jwt() ->> 'email') = 'amirardekanian@gmail.com' )
  with check ( (auth.jwt() ->> 'email') = 'amirardekanian@gmail.com' );

-- ── athlete read: key-checked, read-only (no side effects) ─────────────────
-- Returns the athlete's whole thread. The dot on the app is computed client-
-- side from unread coach messages; marking-read is a separate explicit call
-- (below) so just opening the app to check the dot doesn't clear it.
create or replace function public.get_messages(p_athlete_id text, p_key text default null)
returns setof public.messages
language plpgsql security definer set search_path = public as $fn$
declare v_expected text;
begin
  select secret_key into v_expected from public.athlete_keys where athlete_id = p_athlete_id;
  if v_expected is not null and (p_key is distinct from v_expected) then
    raise exception 'invalid athlete key';
  end if;
  return query
    select * from public.messages where athlete_id = p_athlete_id order by created_at asc;
end; $fn$;
revoke all on function public.get_messages(text, text) from public;
grant execute on function public.get_messages(text, text) to anon, authenticated;

-- ── athlete reply within an existing thread: key-checked ───────────────────
create or replace function public.send_athlete_message(
  p_athlete_id text, p_body text, p_context text default null, p_key text default null)
returns void
language plpgsql security definer set search_path = public as $fn$
declare v_expected text;
begin
  select secret_key into v_expected from public.athlete_keys where athlete_id = p_athlete_id;
  if v_expected is not null and (p_key is distinct from v_expected) then
    raise exception 'invalid athlete key';
  end if;
  if coalesce(btrim(p_body), '') = '' then return; end if;
  insert into public.messages (athlete_id, sender, body, context, read_by_athlete, read_by_coach)
  values (p_athlete_id, 'athlete', left(p_body, 2000), p_context, true, false);
end; $fn$;
revoke all on function public.send_athlete_message(text, text, text, text) from public;
grant execute on function public.send_athlete_message(text, text, text, text) to anon, authenticated;

-- ── athlete marks coach messages as read (clears their dot): key-checked ───
create or replace function public.mark_athlete_read(p_athlete_id text, p_key text default null)
returns void
language plpgsql security definer set search_path = public as $fn$
declare v_expected text;
begin
  select secret_key into v_expected from public.athlete_keys where athlete_id = p_athlete_id;
  if v_expected is not null and (p_key is distinct from v_expected) then
    raise exception 'invalid athlete key';
  end if;
  update public.messages set read_by_athlete = true
    where athlete_id = p_athlete_id and sender = 'coach' and read_by_athlete = false;
end; $fn$;
revoke all on function public.mark_athlete_read(text, text) from public;
grant execute on function public.mark_athlete_read(text, text) to anon, authenticated;
