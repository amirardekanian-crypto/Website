-- The way back from stage82 (the emoji beside the Like). On Amir's word only. Nothing an athlete sent is lost: every reaction stays, and the
-- ones that carried an emoji become plain Likes (the column goes, so the emoji itself does). get_bell() stops handing the app the list, which
-- is how program.html knows: it draws the Like alone again, as it did before stage82. Safe to run twice.

begin;

-- 1. get_bell() stops returning the list (the app then draws no emoji)
do $rb82_bell$
declare
  d text := pg_get_functiondef('public.get_bell(text)'::regprocedure);
  s_new constant text := '''days'', 7, ''emoji'', to_jsonb(public.crew_emoji_list()), ''at'', now());';
  s_old constant text := '''days'', 7, ''at'', now());';
begin
  if position(s_new in d) > 0 then execute replace(d, s_new, s_old); end if;
end $rb82_bell$;

-- 2. crew_kudos_of() as stage81 had it
create or replace function public.crew_kudos_of(p_post uuid, p_to text, p_day date, p_viewer text) returns jsonb
language sql stable set search_path to 'public' as $function$
  with k as (
    select k.athlete_id, m.name, k.created_at
      from public.crew_kudos k join public.crew_members() m on m.athlete_id = k.athlete_id
     where (p_post is not null and k.post_id = p_post) or (p_post is null and k.to_athlete = p_to and k.line_day = p_day)
  )
  select jsonb_build_object(
    'n', (select count(*) from k),
    'mine', exists (select 1 from k where k.athlete_id is not distinct from p_viewer),
    'names', coalesce((select jsonb_agg(x.name order by x.created_at desc)
                         from (select k.name, k.created_at from k where k.athlete_id is distinct from p_viewer order by k.created_at desc limit 3) x), '[]'::jsonb))
$function$;

-- 3. crew_kudos() back to its two arguments
drop function if exists public.crew_kudos(text, boolean, text);
create or replace function public.crew_kudos(p_target text, p_on boolean default true) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_me text := public.crew_who(); v_t text := btrim(coalesce(p_target, '')); v_post uuid; v_to text; v_day date; v_author text;
begin
  if not exists (select 1 from public.crew_members() m where m.athlete_id = v_me) then raise exception 'crew:not_yes'; end if;
  if v_t ~ '^[0-9a-f-]{36}$' then
    v_post := v_t::uuid;
    select p.athlete_id into v_author from public.crew_posts p
     where p.id = v_post and p.created_at >= now() - interval '7 days'
       and (p.athlete_id = public.coach_note_id() or exists (select 1 from public.crew_members() m where m.athlete_id = p.athlete_id));
    if v_author is null then raise exception 'crew:gone'; end if;
    if v_author = v_me then raise exception 'crew:own'; end if;
    if p_on then
      insert into public.crew_kudos (athlete_id, post_id) values (v_me, v_post) on conflict do nothing;
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
    insert into public.crew_kudos (athlete_id, to_athlete, line_day) values (v_me, v_to, v_day) on conflict do nothing;
  else
    delete from public.crew_kudos k where k.athlete_id = v_me and k.to_athlete = v_to and k.line_day = v_day;
  end if;
  return public.crew_kudos_of(null, v_to, v_day, v_me);
end $function$;
revoke all on function public.crew_kudos(text, boolean) from public, anon, authenticated;
grant execute on function public.crew_kudos(text, boolean) to authenticated, service_role;

-- 4. the column and the list (every reaction stays; the emoji on it does not)
alter table public.crew_kudos drop constraint if exists crew_kudos_emoji_check;
alter table public.crew_kudos drop column if exists emoji;
drop function if exists public.crew_emoji_list();

commit;
