-- stage98_cheers_count.sql — the cheers number on a Player Page counts cheers, not likes (2026-10-25)
--
-- Amir, on a real Player Page the day after the Players' Lounge went live: "The number of cheers is wrong." One member's tile read 15. She had been sent 2
-- cheers. The other 13 were likes on her posts and Bell lines, which stage96 (section 8b) put into the same number because the push says "X cheered you"
-- for a like. But a cheer is the one a person sends to another person from their face, with the clap button (crew_cheer, the crew_cheers table), the
-- cheer of the reference he showed. A like is a like. So the number counts cheers only.
--
-- Live before this file (ten members, 68 in all): 15, 13, 8, 8, 7, 5, 5, 3, 3, 1. After it (11 in all, one for every cheer ever sent): 2, 2, 1, 1, 1, 1, 1, 1, 1, 0.
--
-- What this does, and nothing else:
--   1. Copies the tally to backup.lounge98_cheer_tally_20261025 first (athlete_id, n, updated_at, and n_after: the number this file sets). Made once:
--      a re-run keeps the first copy. Drop it within the privacy notice's three months, like every other backup copy (about two weeks is plenty).
--   2. A like stops counting. The trigger crew_tally_kudos and its function crew_t_tally_kudos() are dropped; crew_kudos() loses the two lines that took
--      one off the tally when a like was taken back (it is the LIVE definition, pg_get_functiondef on 2026-10-25, with those two lines out and one
--      comment in; nothing else of it changes); the helper crew_tally_down(), which nothing calls any more, is dropped with them.
--   3. Every row is counted again: n = the cheers that person has received (rows of crew_cheers with them as to_athlete, Amir's included, never
--      their own). A member with no row keeps none (the page says 0). The count runs under a lock on crew_cheers, so a cheer sent while this applies
--      is counted once, not twice and not never.
--
-- What stays as it was: the trigger crew_tally_cheer (+1 on every INSERT into crew_cheers, Amir's included) and crew_tally_up(); crew_page() (it reads
-- the tally, so it needs no change: cheers.total); crew_forget() (leaving the crew deletes the row, the number starts again from 0 on a return);
-- the 7-day sweep and the 400-day delete of cheer rows (the number is all-time: a swept cheer is not taken off); the table, its RLS and grants.
-- GAME-6 holds as before: it is a number on a page, it pays nothing, it writes no fact.
--
-- ⚠️ After this file, DO NOT run stage96 again: it would put the like back into the number (its trigger, its two lines). stage96's guard now refuses
-- when crew_kudos() carries the word stage98. crew_kudos() is REPLACED, not patched: the guard compares the live text with the text this file was
-- written against (md5 with the carriage returns taken out) and REFUSES, naming the function, if somebody changed it since. Nothing is changed then.
--
-- Rehearsed on PGlite: scripts/career/rehearse_lounge.mjs (sections 1b, 6b, 15 and 17: the stage twice, the refusals, a like moves nothing, a cheer is
-- +1, the recount from a mixed state, the way back) and once on the live database inside a DO block that ends in `raise exception`. The way back:
-- scripts/career/rollback_stage98.sql. Safe to re-run this file.

-- ── 0. The guard ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
do $stage98_guard$
declare d text;
begin
  if to_regclass('public.crew_cheer_tally') is null or to_regclass('public.crew_cheers') is null or to_regclass('public.crew_kudos') is null
     or to_regprocedure('public.crew_tally_up(text)') is null or to_regprocedure('public.crew_t_tally_cheer()') is null then
    raise exception 'stage98: the cheer tally (stage96) is missing. Nothing was changed.';
  end if;
  if not exists (select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid
                  where t.tgname = 'crew_tally_cheer' and c.relname = 'crew_cheers' and not t.tgisinternal) then
    raise exception 'stage98: the trigger crew_tally_cheer is missing from crew_cheers. Nothing was changed.';
  end if;
  if to_regprocedure('public.crew_kudos(text,boolean,text)') is null then
    raise exception 'stage98: crew_kudos() is missing. Nothing was changed.';
  end if;
  d := pg_get_functiondef('public.crew_kudos(text,boolean,text)'::regprocedure);
  if position('stage98' in d) = 0 and md5(replace(d, chr(13), '')) <> '11b0b6b701e218460b8a601e884789f5' then
    raise exception 'stage98: crew_kudos() is not the text this file was written against (md5 %, expected 11b0b6b701e218460b8a601e884789f5). Somebody changed it since 2026-10-25: read the live definition, merge the change into this file, and run it again. Nothing was changed.',
      md5(replace(d, chr(13), ''));
  end if;
end
$stage98_guard$;

-- ── 1. The old numbers, kept ──────────────────────────────────────────────────────────────────────────────────────────────────────
-- Made once ("if not exists"): a re-run must not copy the new numbers over the old. n_after is what step 3 sets, so the way back can tell the cheers
-- sent since from the likes that used to count.
create schema if not exists backup;
create table if not exists backup.lounge98_cheer_tally_20261025 as
  select t.athlete_id, t.n, t.updated_at,
         (select count(*) from public.crew_cheers c where c.to_athlete = t.athlete_id and c.athlete_id <> t.athlete_id)::integer as n_after
    from public.crew_cheer_tally t;

-- ── 2. A like is not a cheer ──────────────────────────────────────────────────────────────────────────────────────────────────────
drop trigger if exists crew_tally_kudos on public.crew_kudos;

-- crew_kudos(): the live text, minus the two lines that took one off the tally when a like was taken back.
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
      -- stage98: a like is not a cheer. Taking one back leaves the cheer tally alone (stage96 took one off it here).
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
    delete from public.crew_award_likes l
     where l.athlete_id = v_me and l.to_athlete = v_to
       and l.award_id in (select a.award_id from public.career_awards a
                           where a.athlete_id = v_to and a.kind = 'achievement' and a.how = 'live' and (a.created_at at time zone 'UTC')::date = v_day);
  end if;
  return public.crew_kudos_of(null, v_to, v_day, v_me);
end $function$;

drop function if exists public.crew_t_tally_kudos();
drop function if exists public.crew_tally_down(text);

-- crew_kudos() keeps the door it had (said again so a replaced function can never end up wider than it was)
do $stage98_grants$
begin
  revoke all on function public.crew_kudos(text, boolean, text) from public, anon;
  grant execute on function public.crew_kudos(text, boolean, text) to authenticated, service_role;
end
$stage98_grants$;

-- ── 3. Every row counted again: the cheers that person has received ───────────────────────────────────────────────────────────────
-- Under a lock that lets reads through and holds writes back until this commits, so a cheer sent right now is counted exactly once (before the lock:
-- it is in the count; after: the trigger adds its +1 to the new number). A row whose number is right is not touched.
do $stage98_recount$
begin
  lock table public.crew_cheers in share mode;
  update public.crew_cheer_tally t
     set n = x.n, updated_at = now()
    from (select t2.athlete_id,
                 (select count(*) from public.crew_cheers c where c.to_athlete = t2.athlete_id and c.athlete_id <> t2.athlete_id)::integer as n
            from public.crew_cheer_tally t2) x
   where x.athlete_id = t.athlete_id and t.n <> x.n;
end
$stage98_recount$;

-- ── 4. What it must look like afterwards ──────────────────────────────────────────────────────────────────────────────────────────
do $stage98_check$
begin
  if exists (select 1 from pg_trigger where tgname = 'crew_tally_kudos' and not tgisinternal) then
    raise exception 'stage98: a like still counts (the trigger crew_tally_kudos is still on crew_kudos)';
  end if;
  if not exists (select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid
                  where t.tgname = 'crew_tally_cheer' and c.relname = 'crew_cheers' and not t.tgisinternal) then
    raise exception 'stage98: a cheer does not count (the trigger crew_tally_cheer is missing)';
  end if;
  if to_regprocedure('public.crew_t_tally_kudos()') is not null or to_regprocedure('public.crew_tally_down(text)') is not null then
    raise exception 'stage98: a function of the like counter is still there';
  end if;
  if position('crew_tally_down' in pg_get_functiondef('public.crew_kudos(text,boolean,text)'::regprocedure)) > 0
     or position('stage98' in pg_get_functiondef('public.crew_kudos(text,boolean,text)'::regprocedure)) = 0 then
    raise exception 'stage98: crew_kudos() is not the new text';
  end if;
  if exists (select 1 from public.crew_cheer_tally t
              where t.n <> (select count(*) from public.crew_cheers c where c.to_athlete = t.athlete_id and c.athlete_id <> t.athlete_id)) then
    raise exception 'stage98: a number is not the count of the cheers received';
  end if;
  raise notice 'stage98: applied';
end
$stage98_check$;
