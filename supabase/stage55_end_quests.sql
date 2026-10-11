-- stage55 — ending a quest run early keeps the XP already earned (2026-10-11, coach.html audit TODAY-1; Amir: "yes, they keep it").
-- Safe to re-run.
--
-- "Cancel this run" called clear_quests(), which REMOVES the run from xp_rules.rules -> questRuns. Both scorers work a quest's XP out
-- from the run every time they score (hab_bonus_xp() on the server, questEvents() in habits.html), so removing the run took the XP back
-- from everyone who had already completed one of its quests, on the board and in the app. The dashboard's box said so.
--
-- Now a run can END instead of vanishing:
--   · end_quests(p_start, p_end) keeps the run and gives it an "end" day (the dashboard passes today). From the day after, the run is no
--     longer live (its quests are not offered). A quest completed on or before the end day keeps paying, on the board and in the app;
--     one not completed by then never pays. A run that had not begun yet (end before start) is removed: nothing was earned.
--   · hab_bonus_xp() reads the run's own "end" next to the two bounds it already had (start + 6 days, the day before the next run).
--     habits.html does the same in runEndKey(): the two scorers must agree, so both are changed in the same release.
--   · clear_quests() is unchanged and stays for taking a run's XP back on purpose (SQL editor only; QUESTS.md says when).
--
-- The scoring function is patched in place from its live definition (a replace of two snippets, each of which must be found exactly
-- once, or it stops and changes nothing), so nothing else in the 10 kB function can drift. A run with no "end" scores exactly as before.

do $$
declare
  d text := pg_get_functiondef('public.hab_bonus_xp(jsonb,jsonb,date,date,date,jsonb)'::regprocedure);
  a1 constant text := $p$least(rstart + 6, coalesce(next_start - 1, rstart + 6)) as rend$p$;
  b1 constant text := $p$least(rstart + 6, coalesce(next_start - 1, rstart + 6), coalesce(own_end, rstart + 6)) as rend$p$;
  a2 constant text := $p$r.val -> 'ids' as ids,$p$;
  b2 constant text := $p$r.val -> 'ids' as ids,
             case when r.val ->> 'end' ~ '^\d{4}-\d{2}-\d{2}$' then (r.val ->> 'end')::date end as own_end,$p$;
begin
  if position('own_end' in d) > 0 then
    return;     -- already patched
  end if;
  if (length(d) - length(replace(d, a1, ''))) / length(a1) <> 1 or (length(d) - length(replace(d, a2, ''))) / length(a2) <> 1 then
    raise exception 'stage55: hab_bonus_xp does not look as expected (the qruns snippets were not found exactly once). Nothing was changed.';
  end if;
  execute replace(replace(d, a1, b1), a2, b2);
end $$;

create or replace function public.end_quests(p_start date, p_end date)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_key   text;
  v_runs  jsonb;
  v_out   jsonb := '[]'::jsonb;
  v_found boolean := false;
  r       jsonb;
begin
  if not public.is_coach() then
    raise exception 'coach only';
  end if;
  if p_start is null or p_end is null then
    raise exception 'give the run''s start day and the day it ends';
  end if;
  v_key := to_char(p_start, 'YYYY-MM-DD');
  select coalesce(rules -> 'questRuns', '[]'::jsonb) into v_runs from public.xp_rules where id = 1 for update;
  for r in select value from jsonb_array_elements(v_runs) loop
    if r ->> 'start' is not distinct from v_key then
      v_found := true;
      if p_end >= p_start then   -- a run that had not begun (end before start) is dropped: nothing was earned in it
        v_out := v_out || jsonb_build_array(r || jsonb_build_object('end', to_char(least(p_end, p_start + 6), 'YYYY-MM-DD')));
      end if;
    else
      v_out := v_out || jsonb_build_array(r);
    end if;
  end loop;
  if not v_found then
    raise exception 'no quest run starts on %', v_key;
  end if;
  update public.xp_rules set rules = jsonb_set(rules, '{questRuns}', v_out), updated_at = now() where id = 1;
  return v_out;
end; $function$;
revoke all on function public.end_quests(date, date) from public, anon;
grant execute on function public.end_quests(date, date) to authenticated;
