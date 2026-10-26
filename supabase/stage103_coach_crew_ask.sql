-- stage103_coach_crew_ask.sql — coach.html's Bell shows the question above a Mailbag answer (2026-10-25)
--
-- stage102 posts a Mailbag answer as Amir's crew post with session {"ask": {"q", "by"}}. The athlete app reads it from get_bell(); coach.html reads
-- its Bell from coach_crew(), which never returned `session`. This adds ONE key to each post there, 'ask' (session -> 'ask', null on every other
-- post), and nothing else: the rest of a post's session (a finished day's numbers) stays out of the coach's list as before.
--
-- A guarded patch of the live text: it refuses if coach_crew() is not the text it expects. The way back: scripts/career/rollback_stage103.sql.
-- Safe to re-run.

do $stage103$
declare
  d text := pg_get_functiondef('public.coach_crew()'::regprocedure);
  s_old constant text := $s$'kind', p.kind, 'body', p.body, 'photo', p.has_photo, 'at', p.created_at,$s$;
  s_new constant text := $s$'kind', p.kind, 'body', p.body, 'photo', p.has_photo, 'at', p.created_at, 'ask', p.session -> 'ask',   -- stage103: a Mailbag answer's question$s$;
begin
  if position('stage103' in d) > 0 then return; end if;
  if (length(d) - length(replace(d, s_old, ''))) / length(s_old) <> 1 then
    raise exception 'stage103: coach_crew() is not what this patch expects. Nothing was changed.';
  end if;
  execute replace(d, s_old, s_new);
end
$stage103$;

do $stage103_check$
begin
  if position('stage103' in pg_get_functiondef('public.coach_crew()'::regprocedure)) = 0 then raise exception 'stage103: coach_crew() is not the new text'; end if;
  raise notice 'stage103: applied';
end
$stage103_check$;
