---
name: chat-facts
description: "Teach the website chatbot something new, or fix what it says. Use when Amir says \"add this to the bot\", \"add this to the facts\", \"the chatbot should know...\", \"what did the chatbot not know?\", \"check the chatbot gaps\", \"what are people asking the bot?\", pastes a question from coach.html → Leads → Chats (Not answered yet) with his answer, or changes a price, product or policy the bot talks about. Reads the open gaps, writes the answer into Content/CHATBOT-FACTS.md, rebuilds and redeploys site-chat, tests it live, marks the gaps handled, commits and pushes."
---

# /chat-facts — teach the website chatbot

The chat bubble on the public pages (`assets/js/site-chat.js`) is answered by the Edge Function `site-chat`
(Claude Haiku 5.5). **It knows ONLY `Content/CHATBOT-FACTS.md`.** When a visitor asks something that file does
not answer, the bot ends its reply with `[[gap]]`, the function saves `chat_messages.gap = true`, and coach.html →
Leads → Chats lists it under **Not answered yet** until Amir presses **Added to facts ✓** (`gap_handled_at`).
Background: CLAUDE.md → *The website chatbot*; `supabase/stage67_site_chat.sql`, `stage68_chat_gaps.sql`.

Two files, two jobs. Do not mix them:
- **`Content/CHATBOT-FACTS.md` = what the bot KNOWS** (prices, products, process, FAQ). Almost every change goes here.
- **`RULES` in `supabase/functions/site-chat/index.ts` = how it BEHAVES** (tone, third person, no diagnosis, no
  workouts, handoff and gap tags). Change it only when the bot answered *badly*, not when it lacked a fact.

## Step 1 — Find what to add

If Amir gave the question and the answer, go to Step 2. If he asked what the bot did not know, read the open gaps
(Supabase MCP `execute_sql`, read-only) and show them to him as a short numbered list, newest first:

```sql
select m.id, c.site, m.at::date as day,
       (select u.content from public.chat_messages u
         where u.conversation_id = m.conversation_id and u.role = 'user' and u.id < m.id
         order by u.id desc limit 1) as question,
       left(m.content, 200) as bot_said
from public.chat_messages m join public.chat_conversations c on c.id = m.conversation_id
where m.gap and m.gap_handled_at is null and c.page <> '/test'
order by m.at desc;
```

Group questions that ask the same thing. Then **ask Amir for each answer in his words**. Never write an answer
yourself: a guess here becomes something the bot tells clients as fact. If a question is off-topic or not worth an
answer, say so and offer to mark it handled anyway.

## Step 2 — Write it into the facts file

Edit `Content/CHATBOT-FACTS.md`. Everything above the first `## [` heading is a note to Amir and never reaches the bot.
- **Pick the section by who it is true for.** `[both]` goes to both bots, `[en]` only to the English site's,
  `[fa]` only to the Farsi site's. A fact about Iran (toman, card-to-card, the course, the testing app) is `[both]`
  (Amir, 2026-10-17: Iranians may ask in English). The English bot raises Iran products only when asked; that is
  a RULE, not a fact, so leave it alone.
- Put it under the heading where a reader would look (prices with prices, a "can I…" question in *Common questions*).
  If an existing line says something different, **change that line**. Never leave two versions; the bot may give either.
- Write it **in English**, as a plain fact ("Amir coaches online only; there are no in-person sessions."), with Amir's
  wording in quotes and the date when it is a decision of his. The Farsi bot translates. Add a Farsi term to *Farsi
  words to use* only when the wording matters (a price, a product name).
- Numbers exactly as Amir said them. Never work out a toman amount or a per-week price.
- Update the "Last checked" line under the preamble with today's date and a few words on what changed.

## Step 3 — Rebuild and redeploy

```
python scripts/build_chat_facts.py
```
It writes `supabase/functions/site-chat/facts.ts` (generated: never edit it by hand). Pre-commit guard 21 blocks a
commit where the two disagree.

Then redeploy with the Supabase MCP `deploy_edge_function`: name `site-chat`, `verify_jwt: false`, entrypoint
`index.ts`, and **both files, `index.ts` and `facts.ts`, with their full current contents** (Read each file and pass it
exactly; a deploy with only one file breaks the function). The result gives a version number; write it in the commit
message. Supabase sometimes adds versions of its own (a secret change), so a jump in the number is normal.

## Step 4 — Test it live

```
python -X utf8 scripts/chat_ask.py en "<the visitor's question>"
python -X utf8 scripts/chat_ask.py fa "<the same question in Farsi>"
```
Ask the gap question itself (in the language it came in, and the other one if the fact is `[both]`), plus one
question it already answered well, to check nothing else changed. Check that:
- the answer says the new fact, in the third person ("Amir…", never "I"/"we" as Amir), with no invented detail;
- the button is right (`apply` when they are ready to start, `whatsapp` for anything personal);
- it is no longer a gap: `select gap from public.chat_messages m join public.chat_conversations c on c.id = m.conversation_id where c.page = '/test' and m.role = 'assistant' order by m.id;`

`OFFLINE` means no key, the spend cap, or a database error: read the logs with `query_logs`
(`select timestamp, event_message from logs where source = 'function_logs' order by timestamp desc limit 10`;
"invalid x-api-key" means the `ANTHROPIC_API_KEY` secret is wrong, which only Amir can fix). `LIMIT` means you used
8 chats today: delete the test chats first.

**Always delete the test chats afterwards** (they would show in Amir's Chats tab and count towards the daily limit):
```sql
delete from public.chat_conversations where page = '/test' returning id;
```

## Step 5 — Mark the gaps handled

Amir can press **Added to facts ✓** himself. If he asked you to do it, stamp the ones this change answers:
```sql
update public.chat_messages set gap_handled_at = now() where id in (<ids from Step 1>) returning id;
```

## Step 6 — Keep the pages true

The website must not contradict the bot. If the new fact changes something a page says (a price, what a plan
includes, who it is for), name the pages (`index.html`, `index-fa.html`, `form*.html`, `/tennis/`, `/tennis-testing/`,
`Content/PRODUCT.md`) and offer to update them. Do not edit them unasked. Farsi page copy ships only after Amir reads it.

## Step 7 — Commit and push

Other sessions share this folder: `git status --short` first, and stage **only** the files you changed
(`Content/CHATBOT-FACTS.md`, `supabase/functions/site-chat/facts.ts`, and `index.ts` if RULES changed). Commit with
Amir's words in the message and the deployed version, then push `main` by itself. If git says "must be run in a
work tree", `.git/config` has `core.bare = true` again: `git config core.bare false` fixes it.

## Reply to Amir

One short message: what the bot now says (quote the new answer from Step 4), which gaps are handled, and any page
that still says otherwise.
