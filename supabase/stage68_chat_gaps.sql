-- stage68: the website chatbot's gaps (2026-10-17; Amir: "so little by little i have an understanding of what
-- information to add").
--
-- When the facts file (Content/CHATBOT-FACTS.md) does not answer a visitor's question, site-chat marks its reply
-- `gap = true`. coach.html → Leads → Chats lists those first under "Not answered yet"; Amir adds the answer to the
-- facts file and presses "Added to facts", which stamps `gap_handled_at`. That stamp is the ONE thing the coach may
-- change on a message: the update grant is column-level, and the policy is coach-only.
-- ⚠ RESTORE: scripts/restore/catalog.sql reads only TABLE grants, so this column grant is NOT in schema_snapshot.sql.
-- After a restore, run the `grant update (gap_handled_at)` line below again, or "Added to facts" is refused.

alter table public.chat_messages add column if not exists gap boolean not null default false;
alter table public.chat_messages add column if not exists gap_handled_at timestamptz;
create index if not exists chat_messages_open_gaps on public.chat_messages (at desc) where gap and gap_handled_at is null;

grant update (gap_handled_at) on public.chat_messages to authenticated;
drop policy if exists chat_messages_coach_update on public.chat_messages;
create policy chat_messages_coach_update on public.chat_messages for update to authenticated
  using (public.is_coach()) with check (public.is_coach());
