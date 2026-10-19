-- stage82_crew_emoji.sql — a few emoji beside the Like on a Bell post (Career Mode round 5, step 5's second half; 2026-10-19)
--
-- Amir, 2026-10-19, after the page https://claude.ai/artifact/KkF7qE5yomcLdxKYF1mjo8: *"instead of racket go with hearty eyes. but lets go with
-- all five out style"*. So: direction A (the Like and the four emoji all on the card, one tap each) and the set 🔥 💪 👏 😍, with the Like itself
-- the fifth and the default. An emoji earns nothing, exactly as the Like does not (GAME-6), and who sent what still shows by name (GAME-9).
--
-- ⚠️ The Monthly Open moves to stage83: this took 82.
--
-- What this changes, and nothing else:
--   1. `crew_kudos` gains one nullable column, `emoji`. **Null is the plain Like**, so every row stage81 already wrote stays a Like and no
--      athlete's reaction moves. The table's check is loose (1 to 16 characters); the LIST of what may be sent is `crew_emoji_list()`, so
--      changing the set later is a function, not a migration that would have to rewrite a constraint.
--   2. `crew_emoji_list()`: the four, in the order the card draws them. One source for the server; the app draws what `get_bell()` hands it.
--   3. `crew_kudos(p_target, p_on, p_emoji)`: a third argument. One reaction per person per target still (the unique indexes are unchanged), so
--      sending a different one SWAPS it in place and re-dates it; `p_on => false` takes it back, whatever it was. An emoji that is not on the
--      list is refused (`crew:emoji`). The old two-argument call is dropped, so nothing can reach the old body by accident.
--   4. `crew_kudos_of()` gains `emoji` (the viewer's own, null when theirs is the plain Like or they have none), `like` (how many plain Likes)
--      and `by` (how many of each emoji, only the ones actually sent). `n`, `mine` and `names` keep their old meanings, so a phone that has not
--      updated yet keeps working: it reads n and mine and draws one Like.
--   5. `get_bell()` returns `emoji`, the list. **That is how the app knows the server can take an emoji at all**: until this stage is applied
--      there is no `emoji` key and program.html draws the Like alone, exactly as it does today.
--
-- What it does NOT touch: the tables' rows (one `alter table ... add column`, no backfill), the scorer, XP, the 7-day sweep, the erase list,
-- `coach_crew()`'s counts, `crew_photo()`, the consent rules or who may see what.
--
-- Rehearsed on PGlite: `scripts/career/rehearse_crew.mjs` (its section 14 covers this stage).
-- The way back: `scripts/career/rollback_stage82.sql` (the column and the list go; every reaction stays, as a plain Like). Safe to re-run.

-- ── 0. The guard ────────────────────────────────────────────────────────────────────────────────────────────────────────
do $stage82_guard$
begin
  if to_regclass('public.crew_kudos') is null or to_regprocedure('public.get_bell(text)') is null then
    raise exception 'stage82: stage81 (Crew and the Bell) is not on this database. Nothing was changed.';
  end if;
end
$stage82_guard$;

-- ── 1. The column: null is the plain Like, so nothing already sent moves ────────────────────────────────────────────────
alter table public.crew_kudos add column if not exists emoji text;
do $stage82_check$
begin
  if not exists (select 1 from pg_constraint where conname = 'crew_kudos_emoji_check' and conrelid = 'public.crew_kudos'::regclass) then
    alter table public.crew_kudos add constraint crew_kudos_emoji_check check (emoji is null or char_length(emoji) between 1 and 16);
  end if;
end
$stage82_check$;

-- ── 2. The set, in the order the card draws them (the Like is the fifth, and it is null) ────────────────────────────────
create or replace function public.crew_emoji_list() returns text[]
language sql immutable set search_path to 'public' as $function$
  select array['🔥', '💪', '👏', '😍']::text[]
$function$;

-- ── 3. One target's reactions as the viewer sees them ───────────────────────────────────────────────────────────────────
-- n: every reaction · mine: the viewer reacted at all · emoji: the viewer's own, null for the plain Like · names: up to three crew names,
-- newest first, never the viewer · like: how many plain Likes · by: how many of each emoji, only those sent.
create or replace function public.crew_kudos_of(p_post uuid, p_to text, p_day date, p_viewer text) returns jsonb
language sql stable set search_path to 'public' as $function$
  with k as (
    select k.athlete_id, m.name, k.created_at, k.emoji
      from public.crew_kudos k join public.crew_members() m on m.athlete_id = k.athlete_id
     where (p_post is not null and k.post_id = p_post) or (p_post is null and k.to_athlete = p_to and k.line_day = p_day)
  )
  select jsonb_build_object(
    'n', (select count(*) from k),
    'mine', exists (select 1 from k where k.athlete_id is not distinct from p_viewer),
    'emoji', (select k.emoji from k where k.athlete_id is not distinct from p_viewer and p_viewer is not null limit 1),
    'like', (select count(*) from k where k.emoji is null),
    'by', coalesce((select jsonb_object_agg(x.emoji, x.c) from (select k.emoji, count(*) as c from k where k.emoji is not null group by k.emoji) x), '{}'::jsonb),
    'names', coalesce((select jsonb_agg(x.name order by x.created_at desc)
                         from (select k.name, k.created_at from k where k.athlete_id is distinct from p_viewer order by k.created_at desc limit 3) x), '[]'::jsonb))
$function$;

-- ── 4. Sending one: the same door, with the emoji ───────────────────────────────────────────────────────────────────────
-- One per person per target: a different one SWAPS in place (and is re-dated, so the names read newest first), the same one again is taken
-- back by the app sending p_on => false. Null is the plain Like. Pays nothing (GAME-6).
drop function if exists public.crew_kudos(text, boolean);
create or replace function public.crew_kudos(p_target text, p_on boolean default true, p_emoji text default null) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
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
  else
    delete from public.crew_kudos k where k.athlete_id = v_me and k.to_athlete = v_to and k.line_day = v_day;
  end if;
  return public.crew_kudos_of(null, v_to, v_day, v_me);
end $function$;

-- ── 5. get_bell() hands the app the list, which is how it knows this stage is on ─────────────────────────────────────────
do $stage82_bell$
declare
  d text := pg_get_functiondef('public.get_bell(text)'::regprocedure);
  s_old constant text := '''days'', 7, ''at'', now());';
  s_new constant text := '''days'', 7, ''emoji'', to_jsonb(public.crew_emoji_list()), ''at'', now());';
  n integer;
begin
  if position(s_new in d) > 0 then
    return;   -- already patched (a re-run)
  end if;
  n := (length(d) - length(replace(d, s_old, ''))) / length(s_old);
  if n <> 1 then
    raise exception 'stage82: get_bell() is not what this patch expects (its last line was found % times, not once). Nothing was changed.', n;
  end if;
  execute replace(d, s_old, s_new);
end
$stage82_bell$;

-- ── 6. Grants (the new function and the changed one; the dropped two-argument form took its grant with it) ───────────────
do $stage82_grants$
begin
  revoke all on function public.crew_emoji_list() from public, anon, authenticated;
  grant execute on function public.crew_emoji_list() to service_role;
  revoke all on function public.crew_kudos(text, boolean, text) from public, anon, authenticated;
  grant execute on function public.crew_kudos(text, boolean, text) to authenticated, service_role;
  revoke all on function public.crew_kudos_of(uuid, text, date, text) from public, anon, authenticated;
  grant execute on function public.crew_kudos_of(uuid, text, date, text) to service_role;
end
$stage82_grants$;
