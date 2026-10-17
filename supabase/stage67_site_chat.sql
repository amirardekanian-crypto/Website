-- stage67: the website chatbot's conversations (2026-10-17; Amir: "save 90 days").
--
-- The chatbot on the public pages (assets/js/site-chat.js) talks to the Edge Function site-chat, which
-- calls Claude and writes here with the service role. Nobody else writes: anon and authenticated have
-- no policy at all, and the coach can only READ and DELETE (coach.html → Leads → Chats).
--
-- Anonymous by design: no name, email or IP column. `visitor` is a one-way hash of the visitor's IP,
-- the date and a server secret, so it changes every day and cannot be turned back into an IP or linked
-- across days; it exists only to cap how many chats one visitor starts in a day. Anything a visitor
-- TYPES may still name them, so the rows are deleted after 90 days (site-chat purges on each new chat,
-- coach.html purges when Leads → Chats opens) and the privacy notices say so.
--
-- Both tables are in coach.html's BACKUP_TABLES. They have no athlete_id, so coach_erase_person() does
-- not need them: a visitor who asks for their chat to go is found by date and words and deleted from
-- coach.html.

create table if not exists public.chat_conversations (
  id          uuid primary key default gen_random_uuid(),
  site        text not null check (site in ('en', 'fa')),
  page        text not null default '',
  visitor     text not null default '',
  started_at  timestamptz not null default now(),
  last_at     timestamptz not null default now(),
  turns       int  not null default 0,
  handoff     text check (handoff in ('whatsapp', 'apply')),
  tokens_in   int  not null default 0,
  tokens_out  int  not null default 0,
  cost_usd    numeric(10,6) not null default 0
);
create index if not exists chat_conversations_started on public.chat_conversations (started_at desc);
create index if not exists chat_conversations_visitor on public.chat_conversations (visitor, started_at);

create table if not exists public.chat_messages (
  id               bigserial primary key,
  conversation_id  uuid not null references public.chat_conversations(id) on delete cascade,
  role             text not null check (role in ('user', 'assistant')),
  content          text not null,
  at               timestamptz not null default now()
);
create index if not exists chat_messages_conv on public.chat_messages (conversation_id, id);

alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;

revoke all on public.chat_conversations, public.chat_messages from anon, authenticated;
grant select, delete on public.chat_conversations, public.chat_messages to authenticated;

drop policy if exists chat_conversations_coach_read on public.chat_conversations;
create policy chat_conversations_coach_read on public.chat_conversations for select to authenticated using (public.is_coach());
drop policy if exists chat_conversations_coach_delete on public.chat_conversations;
create policy chat_conversations_coach_delete on public.chat_conversations for delete to authenticated using (public.is_coach());
drop policy if exists chat_messages_coach_read on public.chat_messages;
create policy chat_messages_coach_read on public.chat_messages for select to authenticated using (public.is_coach());
drop policy if exists chat_messages_coach_delete on public.chat_messages;
create policy chat_messages_coach_delete on public.chat_messages for delete to authenticated using (public.is_coach());
