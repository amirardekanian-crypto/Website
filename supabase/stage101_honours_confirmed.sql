-- stage101_honours_confirmed.sql — the month's honours reach an athlete only when Amir confirms them (2026-10-25)
--
-- Amir: "im gonna choose other honours at the end of the month, there should be reminder in coach.html for me tho. to pick most sessions most
-- improved an full month or my pick", then "go with your picks": (a) the app SUGGESTS the winner of Most sessions and Most improved and the
-- athletes who earned Full Month, from the numbers, and Amir CONFIRMS each with one tap or CHANGES it; his Pick he chooses with his reason (stage100);
-- (b) Full Month goes to EVERY athlete who earned it, as today; (c) NOTHING reaches an athlete (their app, the Bell, the Player Page, a push)
-- until he confirms that honour. The board: https://claude.ai/artifact/9JYRa93PVAYZSH4pRw2rhs, "The reminder in coach.html".
--
-- What this does:
--   1. career_honours.confirmed_at (nullable) and career_honour_months.confirmed (jsonb: {"sessions": <when>, "improved": <when>, "full_month": <when>}).
--      A row with no confirmed_at is a SUGGESTION: the freeze on the 8th (and the first Confirm) still writes them, and nothing reads them but the coach.
--      Every row and every month that exists today is back-filled as confirmed (at the time it was written / frozen), so nobody loses an honour.
--      The Pick is confirmed when Amir picks (coach_honours_pick writes confirmed_at); "nobody" is a decision too.
--   2. coach_honour_confirm(month, honour, athlete_ids, not_clients): Confirm or Change one of sessions / improved / full_month. The ids are the
--      winners he chose (the suggestion as it stands, or another athlete; Full Month takes a list, empty means nobody). It freezes the month if
--      nobody has, recomputes each chosen athlete's figure (career_honour_figure()) and replaces that honour's rows with them, confirmed now.
--      An honour already confirmed can be confirmed again with the SAME winners (a double tap); a different list is refused (fix a typo in the SQL editor).
--   3. The athlete-facing readers show confirmed rows only: get_my_moments() (the athlete's own honours), crew_page() (the Player Page),
--      get_bell() (the honour line, the month's honours band and the Pick card). The Bell line is dated by the confirmation, not by the freeze.
--      The push trigger fires when a row is inserted already confirmed or when its confirmed_at is set, never for a suggestion.
--   4. coach_honours() answers `confirmed` (which of the three are confirmed), `ended`, each row's confirmed_at, and the live work whenever an
--      honour is still unconfirmed. coach_honours() and coach_honours_freeze() now also work on the month's LAST DAY (career_honours_open()), so
--      the reminder can show "so far" numbers and Amir can confirm on that day.
--
-- Nothing here changes how an honour is worked out, any XP (GAME-6), a fact, an award, or a table's backup or erase list: no new table, and both
-- columns are on tables already in BACKUP_TABLES, the snapshot and coach_erase_person().
-- Guarded textual patches, like stages 76/79/94/99: each line is found exactly once or the stage refuses and changes nothing. Safe to re-run.
-- The way back: scripts/career/rollback_stage101.sql. Rehearsed on PGlite: scripts/career/rehearse_honours_confirmed.mjs.

-- ── 0. The guard ───────────────────────────────────────────────────────────
do $stage101_guard$
begin
  if to_regclass('public.career_honours') is null or to_regclass('public.career_honour_months') is null
     or to_regprocedure('public.coach_honours(date,text[])') is null or to_regprocedure('public.coach_honours_freeze(date,text[])') is null
     or to_regprocedure('public.coach_honours_pick(date,text,text[])') is null or to_regprocedure('public.career_honours_live(date,text[])') is null
     or to_regprocedure('public.get_my_moments(text)') is null or to_regprocedure('public.crew_page(uuid,text)') is null
     or to_regprocedure('public.get_bell(text)') is null or to_regprocedure('public.crew_push_t_honour()') is null then
    raise exception 'stage101: stages 75, 77, 86 and 96 are not all on this database. Nothing was changed.';
  end if;
  if position('stage100' in pg_get_functiondef('public.get_bell(text)'::regprocedure)) = 0 then
    raise exception 'stage101: get_bell() is not the stage100 text (apply stage100 first). Nothing was changed.';
  end if;
end
$stage101_guard$;

-- ── 1. The two columns, and the back-fill (only the first time) ────────────
do $stage101_cols$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'career_honours' and column_name = 'confirmed_at') then
    alter table public.career_honours add column confirmed_at timestamptz;   -- null: a suggestion, seen by the coach alone
    alter table public.career_honour_months add column confirmed jsonb not null default '{}'::jsonb;
    -- every honour that exists today was already live for the athletes: it counts as confirmed, from the moment it was written
    update public.career_honours set confirmed_at = created_at where confirmed_at is null;
    update public.career_honour_months
       set confirmed = jsonb_build_object('sessions', frozen_at, 'improved', frozen_at, 'full_month', frozen_at);
  end if;
end
$stage101_cols$;

-- ── 2. Helpers ─────────────────────────────────────────────────────────────
-- A month's honours can be looked at and confirmed from its last day (the numbers are then "so far").
create or replace function public.career_honours_open(p_month date) returns boolean
language sql stable set search_path to 'public' as $function$
  select current_date >= ((date_trunc('month', p_month) + interval '1 month')::date - 1)
$function$;

-- One athlete's figure for one honour in one month, worked out as career_honours_live() works the winners out: the plan sessions paid (D19),
-- the best main-lift win at the same effort (D18), the training weeks that ended in the month. null when the athlete has none (cannot be honoured).
create or replace function public.career_honour_figure(p_month date, p_honour text, p_athlete_id text) returns jsonb
language plpgsql stable set search_path to 'public' as $function$
declare
  m0 date := date_trunc('month', p_month)::date;
  m1 date := (date_trunc('month', p_month) + interval '1 month')::date - 1;
  v_rules jsonb := jsonb_set(public.career_rules_now(), '{fact,effort_win,limit}', '1000'::jsonb, true);
  v_n int; v_w record;
begin
  if p_honour = 'sessions' then
    select count(*)::int into v_n from public.career_facts_paid(p_athlete_id) x
     where x.kind in ('session_finished', 'session_finished_early') and x.day between m0 and m1;
    if v_n >= 1 then return jsonb_build_object('n', v_n); end if;
  elsif p_honour = 'improved' then
    select w.name, round(w.gain * 100, 1) as pct into v_w
      from public.career_cycle_wins(p_athlete_id, m0, m1, null, v_rules) w
     where public.career_norm(w.name) in (select nm from public.career_main_lift_names() nm)
     order by round(w.gain * 100, 1) desc, w.name limit 1;
    if v_w.name is not null and v_w.pct > 0 then return jsonb_build_object('lift', v_w.name, 'pct', v_w.pct); end if;
  elsif p_honour = 'full_month' then
    select count(*)::int into v_n from public.career_weeks(p_athlete_id) w where w.wto between m0 and m1 and coalesce(array_length(w.plan, 1), 0) > 0;
    if v_n >= 1 then return jsonb_build_object('weeks', v_n); end if;
  end if;
  return null;
end $function$;

-- ── 3. Confirm or change one honour ────────────────────────────────────────
create or replace function public.coach_honour_confirm(p_month date, p_honour text, p_athlete_ids text[], p_not_clients text[] default '{}'::text[]) returns jsonb
language plpgsql volatile security definer set search_path to 'public' as $function$
declare
  m0 date := date_trunc('month', p_month)::date;
  v_ids text[]; v_have text[]; v_id text; v_fig jsonb; v_done jsonb;
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  if p_honour not in ('sessions', 'improved', 'full_month') then
    raise exception 'coach_honour_confirm: % is not sessions, improved or full_month (your Pick is chosen with coach_honours_pick)', p_honour;
  end if;
  if not public.career_honours_open(m0) then raise exception 'coach_honour_confirm: % has not ended yet', to_char(m0, 'FMMonth YYYY'); end if;
  if current_date >= (m0 + interval '2 months')::date then raise exception '% can no longer be confirmed', to_char(m0, 'FMMonth YYYY'); end if;
  select coalesce(array_agg(distinct x order by x), '{}') into v_ids from unnest(coalesce(p_athlete_ids, '{}')) x where x is not null and btrim(x) <> '';
  perform public.coach_honours_freeze(m0, p_not_clients);
  perform pg_advisory_xact_lock(hashtext('career:honours:' || m0));
  select coalesce(array_agg(h.athlete_id order by h.athlete_id), '{}') into v_have from public.career_honours h where h.month = m0 and h.honour = p_honour;
  if (select jsonb_exists(confirmed, p_honour) from public.career_honour_months where month = m0) then
    if v_have = v_ids then return public.coach_honours(m0, p_not_clients); end if;
    raise exception 'Your % % is already confirmed', to_char(m0, 'FMMonth YYYY'), p_honour;
  end if;
  foreach v_id in array v_ids loop
    if not exists (select 1 from public.programs where athlete_id = v_id) then raise exception 'no such athlete: %', v_id; end if;
    if not public.career_is_client(v_id, p_not_clients) then
      raise exception 'not a client: the demo, a former athlete and your own login are never honoured';
    end if;
    v_fig := public.career_honour_figure(m0, p_honour, v_id);
    if v_fig is null then
      raise exception 'that athlete has no % in %, so it cannot be honoured', case p_honour when 'sessions' then 'plan session' when 'improved' then 'main-lift win' else 'training week' end, to_char(m0, 'FMMonth YYYY');
    end if;
    insert into public.career_honours as h (month, honour, athlete_id, value, confirmed_at) values (m0, p_honour, v_id, v_fig, now())
    on conflict (month, honour, athlete_id) do update set value = excluded.value, confirmed_at = coalesce(h.confirmed_at, excluded.confirmed_at);
  end loop;
  delete from public.career_honours where month = m0 and honour = p_honour and not (athlete_id = any (v_ids));
  v_done := jsonb_build_object(p_honour, now());
  update public.career_honour_months set confirmed = confirmed || v_done where month = m0;
  return public.coach_honours(m0, p_not_clients);
end $function$;

-- ── 4. The guarded patches ─────────────────────────────────────────────────
do $stage101_patch$
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
    if position(p.new_text in d) > 0 then continue; end if;                   -- patched already (a re-run)
    n := (length(d) - length(replace(d, p.old_text, ''))) / length(p.old_text);
    if n <> 1 then
      raise exception 'stage101: % is not what this patch expects (this line was found % times, not once): %. Nothing was changed.', p.fn, n, left(p.old_text, 80);
    end if;
    execute replace(d, p.old_text, p.new_text);
  end loop;
end
$stage101_patch$;

-- ── 5. The push: a suggestion rings nobody, a confirmation does ────────────
drop trigger if exists crew_push_honour on public.career_honours;
create trigger crew_push_honour after insert on public.career_honours
  for each row when (new.honour <> 'near' and new.confirmed_at is not null)
  execute function public.crew_push_t_honour();
drop trigger if exists crew_push_honour_ok on public.career_honours;
create trigger crew_push_honour_ok after update of confirmed_at on public.career_honours
  for each row when (new.honour <> 'near' and old.confirmed_at is null and new.confirmed_at is not null)
  execute function public.crew_push_t_honour();

-- ── 6. Grants (as every coach function) ────────────────────────────────────
do $stage101_grants$
begin
  revoke all on function public.coach_honour_confirm(date, text, text[], text[]) from public, anon;
  grant execute on function public.coach_honour_confirm(date, text, text[], text[]) to authenticated, service_role;
  revoke all on function public.career_honours_open(date) from public, anon, authenticated;
  grant execute on function public.career_honours_open(date) to service_role;
  revoke all on function public.career_honour_figure(date, text, text) from public, anon, authenticated;
  grant execute on function public.career_honour_figure(date, text, text) to service_role;
  revoke all on function public.coach_honours(date, text[]) from public, anon;
  grant execute on function public.coach_honours(date, text[]) to authenticated, service_role;
  revoke all on function public.coach_honours_freeze(date, text[]) from public, anon;
  grant execute on function public.coach_honours_freeze(date, text[]) to authenticated, service_role;
  revoke all on function public.coach_honours_pick(date, text, text[]) from public, anon;
  grant execute on function public.coach_honours_pick(date, text, text[]) to authenticated, service_role;
  revoke all on function public.get_my_moments(text) from public, anon;
  grant execute on function public.get_my_moments(text) to authenticated, service_role;
  revoke all on function public.get_bell(text) from public, anon;
  grant execute on function public.get_bell(text) to authenticated, service_role;
  revoke all on function public.crew_page(uuid, text) from public, anon;
  grant execute on function public.crew_page(uuid, text) to authenticated, service_role;
end
$stage101_grants$;

-- ── 7. The check ───────────────────────────────────────────────────────────
do $stage101_check$
begin
  if position('confirmed_at >= v_from' in pg_get_functiondef('public.get_bell(text)'::regprocedure)) = 0 then
    raise exception 'stage101: get_bell() is not the new text';
  end if;
  if position('confirmed_at is not null' in pg_get_functiondef('public.get_my_moments(text)'::regprocedure)) = 0
     or position('confirmed_at is not null' in pg_get_functiondef('public.crew_page(uuid,text)'::regprocedure)) = 0 then
    raise exception 'stage101: an athlete-facing reader is not the new text';
  end if;
  if to_regprocedure('public.coach_honour_confirm(date,text,text[],text[])') is null then raise exception 'stage101: coach_honour_confirm() is missing'; end if;
  raise notice 'stage101: applied';
end
$stage101_check$;
