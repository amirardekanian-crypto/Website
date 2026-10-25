-- The way back from stage98 (the cheers number counts cheers only, a like no longer counts).
-- On Amir's word only (CLAUDE.md: a change to the live project waits for his yes), after a backup (coach.html -> Tools -> Backup).
--
-- WHAT IT DOES, in this order (each step safe to run twice, and each only undoes what stage98 did):
--   1. puts the like counter back: crew_tally_down(), crew_t_tally_kudos() and the trigger crew_tally_kudos, and crew_kudos() as stage96 left it
--      (taking a like back takes one off the number again). The text is stage96's own, character for character (the rehearsal compares the md5);
--   2. puts the old numbers back from backup.lounge98_cheer_tally_20261025: each member who has a row in the copy gets their old number PLUS the
--      cheers sent to them since stage98 (the number now, minus what stage98 set, n_after). A member who has no row in the copy (they got their
--      first cheer after stage98) keeps the number they have, and a member who has left has no row. Likes given or taken back while stage98 was on
--      were not counted then, and are not counted now;
--   3. renames the copy to ..._restored, so that a later stage98 makes a fresh one. Drop that copy within the privacy notice's three months, like
--      every other backup copy.
-- Run a second time it puts the same functions back and finds the copy spent (the ..._restored one), so it changes no number. With neither the copy
-- nor a spent one it refuses and changes nothing.
-- If stage96 comes off too, take THIS off first (scripts/career/rollback_stage96.sql works either way round, but this puts back a trigger on a table
-- that one drops).

begin;

-- 1. the like counter
create or replace function public.crew_tally_down(p_athlete text) returns void
language plpgsql security definer set search_path to 'public' as $function$
begin
  update public.crew_cheer_tally set n = greatest(n - 1, 0), updated_at = now() where athlete_id = p_athlete;
end $function$;

create or replace function public.crew_t_tally_kudos() returns trigger
language plpgsql security definer set search_path to 'public' as $function$
declare v_to text;
begin
  begin
    v_to := case when new.post_id is not null then (select p.athlete_id from public.crew_posts p where p.id = new.post_id) else new.to_athlete end;
    if v_to is not null and v_to <> new.athlete_id then perform public.crew_tally_up(v_to); end if;
  exception when others then
    raise warning 'crew: a like was not counted: % (%)', sqlerrm, sqlstate;
  end;
  return null;
end $function$;
drop trigger if exists crew_tally_kudos on public.crew_kudos;
create trigger crew_tally_kudos after insert on public.crew_kudos
  for each row execute function public.crew_t_tally_kudos();

CREATE OR REPLACE FUNCTION public.crew_kudos(p_target text, p_on boolean DEFAULT true, p_emoji text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me text := public.crew_who(); v_t text := btrim(coalesce(p_target, '')); v_post uuid; v_to text; v_day date; v_author text;
  v_em text := nullif(btrim(coalesce(p_emoji, '')), '');
begin
  if not exists (select 1 from public.crew_members() m where m.athlete_id = v_me) then raise exception 'crew:not_yes'; end if;
  if v_em is not null and not (v_em = any (public.crew_emoji_list())) then raise exception 'crew:emoji'; end if;
  if v_t ~ '^[0-9a-f-]{36}$' then
    v_post := v_t::uuid;
    select p.athlete_id into v_author from public.crew_posts p
     where p.id = v_post and p.created_at >= now() - interval '7 days'
       and (p.athlete_id = public.coach_note_id() or exists (select 1 from public.crew_members() m where m.athlete_id = p.athlete_id));
    if v_author is null then raise exception 'crew:gone'; end if;
    if v_author = v_me then raise exception 'crew:own'; end if;
    if p_on then
      insert into public.crew_kudos (athlete_id, post_id, emoji) values (v_me, v_post, v_em)
      on conflict (athlete_id, post_id) where post_id is not null
      do update set emoji = excluded.emoji, created_at = now();
    else
      delete from public.crew_kudos k where k.athlete_id = v_me and k.post_id = v_post;
      if found then perform public.crew_tally_down(v_author); end if;   -- stage96: taking a like back takes one off the cheer tally (the sweep and a deleted post do not)
    end if;
    return public.crew_kudos_of(v_post, null, null, v_me);
  end if;
  if v_t !~ '^[0-9a-f-]{36}:\d{4}-\d{2}-\d{2}$' then raise exception 'crew:target'; end if;
  begin
    v_day := split_part(v_t, ':', 2)::date;
  exception when others then raise exception 'crew:target';
  end;
  select m.athlete_id into v_to from public.crew_members() m where m.crew_key = split_part(v_t, ':', 1)::uuid;
  if v_to is null or v_day < current_date - 7 or v_day > current_date + 1 then raise exception 'crew:gone'; end if;
  if v_to = v_me then raise exception 'crew:own'; end if;
  if p_on then
    insert into public.crew_kudos (athlete_id, to_athlete, line_day, emoji) values (v_me, v_to, v_day, v_em)
    on conflict (athlete_id, to_athlete, line_day) where to_athlete is not null
    do update set emoji = excluded.emoji, created_at = now();
    -- stage96: the like signs the live achievements of that person's day (Signed Ball). Kept past the 7-day sweep, removed when the like is taken back.
    insert into public.crew_award_likes (athlete_id, to_athlete, award_id)
    select v_me, v_to, a.award_id from public.career_awards a
     where a.athlete_id = v_to and a.kind = 'achievement' and a.how = 'live' and (a.created_at at time zone 'UTC')::date = v_day
    on conflict do nothing;
  else
    delete from public.crew_kudos k where k.athlete_id = v_me and k.to_athlete = v_to and k.line_day = v_day;
    if found then perform public.crew_tally_down(v_to); end if;   -- stage96: taking a like back takes one off the cheer tally (the sweep and a deleted post do not)
    delete from public.crew_award_likes l
     where l.athlete_id = v_me and l.to_athlete = v_to
       and l.award_id in (select a.award_id from public.career_awards a
                           where a.athlete_id = v_to and a.kind = 'achievement' and a.how = 'live' and (a.created_at at time zone 'UTC')::date = v_day);
  end if;
  return public.crew_kudos_of(null, v_to, v_day, v_me);
end $function$;

do $rb98_grants$
begin
  revoke all on function public.crew_tally_down(text) from public, anon, authenticated;
  grant execute on function public.crew_tally_down(text) to service_role;
  revoke all on function public.crew_t_tally_kudos() from public, anon, authenticated;
  grant execute on function public.crew_t_tally_kudos() to service_role;
  revoke all on function public.crew_kudos(text, boolean, text) from public, anon;
  grant execute on function public.crew_kudos(text, boolean, text) to authenticated, service_role;
end
$rb98_grants$;

-- 2 and 3. the old numbers, then the copy is spent
do $rb98_numbers$
begin
  if to_regclass('backup.lounge98_cheer_tally_20261025') is not null then
    -- under a lock on crew_cheers, so a cheer sent while this runs is not lost
    lock table public.crew_cheers in share mode;
    update public.crew_cheer_tally t
       set n = greatest(b.n + (t.n - b.n_after), 0), updated_at = now()
      from backup.lounge98_cheer_tally_20261025 b
     where b.athlete_id = t.athlete_id and greatest(b.n + (t.n - b.n_after), 0) <> t.n;
    drop table if exists backup.lounge98_cheer_tally_20261025_restored;
    alter table backup.lounge98_cheer_tally_20261025 rename to lounge98_cheer_tally_20261025_restored;
  elsif to_regclass('backup.lounge98_cheer_tally_20261025_restored') is null then
    raise exception 'rollback_stage98: backup.lounge98_cheer_tally_20261025 is missing, so the old numbers cannot be put back. Nothing was changed.';
  end if;
end
$rb98_numbers$;

commit;
