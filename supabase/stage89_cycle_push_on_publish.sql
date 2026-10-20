-- stage89 — a published cycle notifies the athlete AT ONCE, not up to an hour later (2026-10-20)
--
-- WHY. stage87 built the cycle notification as a STATE the hourly sweep notices: push_fire() runs at
-- minute 4, asks cycle_push_due(), and that returns every athlete whose programme has moved past the
-- cycle they were last told about. publish_cycle() itself notifies nothing. So the athlete's "Your next
-- cycle is ready" always waited for the next minute-4, and on 2026-10-20 Forge was published at 09:49
-- and the 10:04 run reported nobody due at all, for a reason that could not be found in the stored
-- state. Firing push_fire() by hand at 10:53 delivered it in one go. Whatever that empty run was, the
-- athlete should never have been waiting on a sweep for news that already happened.
--
-- WHAT. A trigger on public.programs, fired only when currentCycleIndex actually CHANGES. Not a rewrite
-- of publish_cycle(): the trigger catches every path that advances a cycle (publish_cycle today, the
-- dashboard or a hand-written update tomorrow), and reproducing that function's long body to add one
-- line is how a transcription slip reaches the live table.
--
-- WHAT IT DOES NOT CHANGE. The decision stays where stage87 put it. This trigger asks nobody anything:
-- push_fire() posts one request and the sender calls cycle_push_due(), which still applies every gate —
-- the switch (push_on), awake hours (8 to 21 where the athlete is), a coached athlete with a roadmap,
-- and the push_cycle_seen watermark. So it cannot notify the wrong person, and it cannot notify twice:
-- once a cycle is sent, seen = cci and the hourly run finds nothing.
--
-- THE HOURLY JOB STAYS, and is still the safety net. An athlete whose local clock is outside 8 to 21
-- when their cycle is published is not awake: this fire sends them nothing and the sweep reaches them at
-- 08:04 their own morning instead. The immediate fire is an improvement on the wait, never a
-- replacement for the sweep.
--
-- pg_net IS TRANSACTIONAL: net.http_post() queues the request in a table, so a publish that rolls back
-- sends nothing, and the request leaves only after the commit that made the cycle real. That is why this
-- is safe inside publish_cycle()'s all-or-nothing transaction.
--
-- ROLLBACK:  drop trigger if exists programs_cycle_push_trg on public.programs;
--            drop function if exists public.cycle_push_on_publish();

create or replace function public.cycle_push_on_publish()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  -- Only a cycle ADVANCE is news. Every other write to programs — the dashboard's inline editor, a
  -- mid-cycle correction, a Spine rename moving history — leaves currentCycleIndex alone and must stay
  -- silent. A first programme arrives as an INSERT, which this trigger does not watch: a new athlete is
  -- onboarded by hand, and cycle_push_due()'s first-sight rule would hold its tongue anyway.
  if coalesce(new.data ->> 'currentCycleIndex', '') = coalesce(old.data ->> 'currentCycleIndex', '') then
    return new;
  end if;

  begin
    perform public.push_fire();
  exception when others then
    -- A sender that is down must never cost the athlete their new cycle. The hourly job will carry it.
    raise warning 'cycle_push_on_publish: %', sqlerrm;
  end;

  return new;
end $function$;

revoke all on function public.cycle_push_on_publish() from anon, authenticated;

drop trigger if exists programs_cycle_push_trg on public.programs;
create trigger programs_cycle_push_trg
  after update of data on public.programs
  for each row execute function public.cycle_push_on_publish();

comment on function public.cycle_push_on_publish() is
  'stage89: fires push_fire() when a programme''s currentCycleIndex advances, so a published cycle '
  'notifies the athlete at once instead of waiting for the hourly sweep. Every gate stays in '
  'cycle_push_due(); the hourly job remains the safety net for an athlete who is asleep.';
