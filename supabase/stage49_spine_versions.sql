-- stage49 — version history for the Spine (2026-10-10, coach.html audit SERVER-6 / SPINE-1).
-- Safe to re-run. Applied to the live project 2026-10-10 as migration stage49_spine_versions,
-- after passing scripts/test_spine_sql.sh.
--
-- Until now an overwritten cue, a wiped count or a deleted entry could only come back from a weekly backup
-- file. programs has had program_versions since 2026-09-07 and coaching_logs got coaching_log_versions in
-- stage47; the exercise library, the thing every card's ⓘ sheet reads, had nothing.
--
-- spine_versions keeps the row as it was BEFORE every change that really changes it, for the three Spine
-- tables: exercises (what the athlete reads), exercise_coach (what only the coach reads) and qualities (the
-- ten texts). One row per change, from any writer: the dashboard, Claude's /spine SQL, a hand-written UPDATE.
--   data        the whole row before the change (so a deleted entry can be put back too)
--   changed     for an update: { column: the value it became }, only the columns that changed; updated_at and
--               updated_by do not count, so a save that changes nothing leaves no version
--   saved_by    the signed-in email when there is one (the dashboard), else 'sql' (Claude, the SQL editor)
-- Nothing is pruned: a Spine row is a few hundred bytes of text and nothing in it is about a person.
-- coach.html reads this to show an entry's history and put changed fields back (through coach_save_spine, so
-- the put-back is itself a guarded, recorded change). It is in the weekly backup (BACKUP_TABLES).
-- To read one by hand:
--   select saved_at, saved_by, op, jsonb_object_keys(changed) from spine_versions where tbl = 'exercises' and row_id = '<id>' order by id desc;
-- To put a deleted entry back: insert into exercises select * from jsonb_populate_record(null::exercises, (select data from spine_versions where tbl='exercises' and row_id='<id>' and op='delete' order by id desc limit 1));

create table if not exists public.spine_versions (
  id              bigserial primary key,
  tbl             text not null check (tbl in ('exercises', 'exercise_coach', 'qualities')),
  row_id          text not null,
  op              text not null check (op in ('update', 'delete')),
  data            jsonb not null,
  changed         jsonb,
  saved_at        timestamptz not null default now(),
  saved_by        text,
  was_updated_at  timestamptz
);
create index if not exists spine_versions_row_idx on public.spine_versions (tbl, row_id, id desc);

alter table public.spine_versions enable row level security;
do $$ begin
  if not exists (select 1 from pg_policy where polrelid = 'public.spine_versions'::regclass and polname = 'coach read spine versions') then
    create policy "coach read spine versions" on public.spine_versions
      for select to authenticated using (public.is_coach());
  end if;
end $$;
revoke all on public.spine_versions from anon, authenticated;
grant select on public.spine_versions to authenticated;

create or replace function public.spine_keep_version()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  o   jsonb := to_jsonb(old);
  n   jsonb;
  ch  jsonb;
  who text := coalesce(auth.jwt() ->> 'email', 'sql');
begin
  if tg_op = 'DELETE' then
    insert into public.spine_versions (tbl, row_id, op, data, saved_by, was_updated_at)
    values (tg_table_name, old.id, 'delete', o, who, nullif(o ->> 'updated_at', '')::timestamptz);
    return old;
  end if;
  n := to_jsonb(new);
  select coalesce(jsonb_object_agg(e.key, n -> e.key), '{}'::jsonb) into ch
    from jsonb_each(o) e
   where e.key not in ('updated_at', 'updated_by')
     and (n -> e.key) is distinct from e.value;
  if ch = '{}'::jsonb then
    return new;
  end if;
  insert into public.spine_versions (tbl, row_id, op, data, changed, saved_by, was_updated_at)
  values (tg_table_name, old.id, 'update', o, ch, who, nullif(o ->> 'updated_at', '')::timestamptz);
  return new;
end; $function$;
revoke execute on function public.spine_keep_version() from public, anon, authenticated;

create or replace trigger exercises_version_trg before update or delete on public.exercises
  for each row execute function public.spine_keep_version();
create or replace trigger exercise_coach_version_trg before update or delete on public.exercise_coach
  for each row execute function public.spine_keep_version();
create or replace trigger qualities_version_trg before update or delete on public.qualities
  for each row execute function public.spine_keep_version();
