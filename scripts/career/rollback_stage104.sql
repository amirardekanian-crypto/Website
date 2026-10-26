-- rollback_stage104.sql — puts the six patched functions back as they were before stage101, drops coach_honour_confirm() and its two helpers,
-- puts the stage86 push trigger back and drops the two columns.
-- After this EVERY row of career_honours is visible to the athletes again, including suggestions the freeze saved and Amir has not confirmed.
-- If you want the suggestions gone first:  delete from public.career_honours where confirmed_at is null and honour <> 'near';  (run it BEFORE this file).
-- Each line is found exactly once or this refuses and changes nothing. Safe to re-run.

do $rollback101_patch$
declare p record; d text; n int;
begin
  for p in
    select * from (values
      -- the athlete's own honours (get_my_moments)
      ('public.get_my_moments(text)',
       $a$from public.career_honours h where h.athlete_id = v_id and h.honour <> 'near'))$a$,
       $a$from public.career_honours h where h.athlete_id = v_id and h.honour <> 'near' and h.confirmed_at is not null))   /* stage101: confirmed only */$a$),
      -- the Player Page (crew_page)
      ('public.crew_page(uuid,text)',
       $a$where h.athlete_id = v_subj and h.honour <> 'near'$a$,
       $a$where h.athlete_id = v_subj and h.honour <> 'near' and h.confirmed_at is not null   /* stage101: confirmed only */$a$),
      -- the Bell: the honour line is dated by the confirmation, the month's band and the Pick card show confirmed rows only
      ('public.get_bell(text)',
       $a$select h.athlete_id, h.created_at, 'honour',$a$,
       $a$select h.athlete_id, h.confirmed_at, 'honour',$a$),
      ('public.get_bell(text)',
       $a$and h.honour not in ('near', 'pick') and h.created_at >= v_from$a$,
       $a$and h.honour not in ('near', 'pick') and h.confirmed_at >= v_from$a$),
      ('public.get_bell(text)',
       $a$where h.month = v_m0 and h.honour <> 'near' and coalesce((m.kinds ->> 'honour')::boolean, true);$a$,
       $a$where h.month = v_m0 and h.honour <> 'near' and h.confirmed_at is not null and coalesce((m.kinds ->> 'honour')::boolean, true);   -- stage101$a$),
      ('public.get_bell(text)',
       $a$where h.honour = 'pick' and h.created_at >= now() - interval '7 days' and coalesce$a$,
       $a$where h.honour = 'pick' and h.confirmed_at is not null and h.created_at >= now() - interval '7 days' and coalesce$a$),
      -- the coach's reading of a month
      ('public.coach_honours(date,text[])',
       $a$if m0 >= date_trunc('month', current_date)::date then raise exception 'coach_honours: % has not ended yet'$a$,
       $a$if not public.career_honours_open(m0) then raise exception 'coach_honours: % has not ended yet'$a$),
      ('public.coach_honours(date,text[])',
       $a$'value', h.value, 'sent_at', h.sent_at)$a$,
       $a$'value', h.value, 'sent_at', h.sent_at, 'confirmed_at', h.confirmed_at)$a$),
      ('public.coach_honours(date,text[])',
       $a$if v_m.month is null or v_m.pick is null then v_live :=$a$,
       $a$if v_m.month is null or v_m.pick is null or not (coalesce(v_m.confirmed, '{}'::jsonb) ?& array['sessions', 'improved', 'full_month']) then v_live :=$a$),
      ('public.coach_honours(date,text[])',
       $a$'rows', v_rows,$a$,
       $a$'rows', v_rows, 'confirmed', coalesce(v_m.confirmed, '{}'::jsonb), 'ended', current_date >= (m0 + interval '1 month')::date,$a$),
      ('public.coach_honours(date,text[])',
       $a$'live', case when v_m.month is null then v_live end,$a$,
       $a$'live', v_live,$a$),
      -- freezing the month: also from its last day
      ('public.coach_honours_freeze(date,text[])',
       $a$if m0 >= date_trunc('month', current_date)::date then raise exception 'coach_honours_freeze: % has not ended yet'$a$,
       $a$if not public.career_honours_open(m0) then raise exception 'coach_honours_freeze: % has not ended yet'$a$),
      -- Amir's Pick is confirmed by the picking
      ('public.coach_honours_pick(date,text,text[])',
       $a$insert into public.career_honours (month, honour, athlete_id, value) values (m0, 'pick', p_athlete_id, coalesce(v_slot, '{}'::jsonb));$a$,
       $a$insert into public.career_honours (month, honour, athlete_id, value, confirmed_at) values (m0, 'pick', p_athlete_id, coalesce(v_slot, '{}'::jsonb), now());$a$)
    ) as t(fn, old_text, new_text)
  loop
    d := pg_get_functiondef(p.fn::regprocedure);
    if position(p.new_text in d) = 0 then continue; end if;                   -- not patched (a re-run)
    n := (length(d) - length(replace(d, p.new_text, ''))) / length(p.new_text);
    if n <> 1 then
      raise exception 'rollback_stage104: % is not what this rollback expects (this line was found % times, not once): %. Nothing was changed.', p.fn, n, left(p.new_text, 80);
    end if;
    execute replace(d, p.new_text, p.old_text);
  end loop;
end
$rollback101_patch$;

drop trigger if exists crew_push_honour_ok on public.career_honours;
drop trigger if exists crew_push_honour on public.career_honours;
create trigger crew_push_honour after insert on public.career_honours
  for each row when (new.honour <> 'near')
  execute function public.crew_push_t_honour();

drop function if exists public.coach_honour_confirm(date, text, text[], text[]);
drop function if exists public.career_honour_figure(date, text, text);
drop function if exists public.career_honours_open(date);
alter table public.career_honours drop column if exists confirmed_at;
alter table public.career_honour_months drop column if exists confirmed;

do $rollback101_check$
begin
  if position('confirmed_at' in pg_get_functiondef('public.get_bell(text)'::regprocedure)) > 0
     or position('career_honours_open' in pg_get_functiondef('public.coach_honours(date,text[])'::regprocedure)) > 0 then
    raise exception 'rollback_stage104: a patched function still has the stage101 text';
  end if;
  raise notice 'rollback_stage104: done';
end
$rollback101_check$;
