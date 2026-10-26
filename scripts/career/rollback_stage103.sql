-- rollback_stage103.sql — takes the 'ask' key back out of coach_crew() (supabase/stage103_coach_crew_ask.sql). Safe to re-run.
do $rb103$
declare
  d text := pg_get_functiondef('public.coach_crew()'::regprocedure);
  s_new constant text := $s$'kind', p.kind, 'body', p.body, 'photo', p.has_photo, 'at', p.created_at, 'ask', p.session -> 'ask',   -- stage103: a Mailbag answer's question$s$;
  s_old constant text := $s$'kind', p.kind, 'body', p.body, 'photo', p.has_photo, 'at', p.created_at,$s$;
begin
  if position('stage103' in d) = 0 then return; end if;
  execute replace(d, s_new, s_old);
end
$rb103$;
