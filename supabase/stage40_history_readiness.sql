-- ═══════════════════════════════════════════════════════════════════════════
--  stage40 — get_my_history() also returns each session's check-in (2026-09-26)
--
--  WHY
--  ------------------------------------------------------------------------
--  Today's targets (program.html, Fork 2A) works out the day's level when the
--  athlete answers the readiness check (REC-2 in .claude/COACHING-PRINCIPLES.md).
--  One of its tests compares today's score with the athlete's OWN usual: the
--  mean of sleep, energy, stress and overall over their last 10 check-ins.
--  get_my_history() returned only the stored composite, which averages a
--  different four (soreness in, overall out), so the phone could not work that
--  usual out. It now also returns the stored check-in itself, as `ready`.
--
--  `readiness` (the composite) is unchanged, so a phone still running an older
--  copy of the app reads exactly what it always did. Only the athlete's own rows
--  come back, behind the same guard as before; the check-in is their own answers.
--
--  Same function, same guard, same grants. Safe to re-run.
--  Applied 2026-09-26 through the Supabase MCP, whose migration record calls it
--  stage39_history_readiness; the file is stage40 because stage39 was already taken.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.get_my_history(p_athlete_id text, p_days integer default 180)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare v jsonb;
begin
  if p_athlete_id = 'demo' then
    return '[]'::jsonb;
  end if;
  -- coalesce: a NULL id must be refused, not slip through a NULL comparison.
  if not coalesce(public.is_coach() or p_athlete_id = public.current_athlete_id(), false) then
    raise exception 'not allowed';
  end if;
  select coalesce(jsonb_agg(r order by r.completed_on desc, r.day desc), '[]'::jsonb) into v
  from (
    select s.completed_on, s.day, s.focus, s.session_rpe,
           s.readiness->'composite' as readiness,
           s.readiness as ready,
           s.log,
           case when s.log is null then s.summary end as summary
    from public.session_history s
    where s.athlete_id = p_athlete_id
      and s.completed_on >= current_date - greatest(1, least(coalesce(p_days, 180), 400))
    order by s.completed_on desc, s.day desc
    limit 120
  ) r;
  return v;
end $function$;

revoke all on function public.get_my_history(text, integer) from public;
grant execute on function public.get_my_history(text, integer) to anon, authenticated;
