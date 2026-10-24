-- stage97_partner_codes.sql — Bring a Partner: a member's own code, 10% off for the friend and 10% for the member (2026-10-24)
--
-- Amir, on idea 69 of the Players' Lounge round: "the idea 69 gives the memeber 10% discount to the new memeber, and 10% to themselves". The friend
-- who types the member's code on the intake form gets 10% off, as any partner code does today (check_discount() is NOT changed: it reads
-- affiliates.percent, and an athlete's code is an affiliates row like the 6 partner codes). The member's 10% is a CREDIT that Amir writes down by hand
-- when that friend becomes a client: this database has no payments, no orders and no prices (stage29 header: payout and card details are kept
-- out on purpose), so it cannot know who paid. The credit is a ledger line, not a payment.
--
-- What this adds, and nothing else:
--   1. affiliates gains `kind` ('coach': the 6 existing partner codes keep it; 'athlete': a member's own) and `reward_percent` (what the member earns,
--      10). One athlete-kind code per athlete: a unique partial index on athlete_id where kind = 'athlete'.
--   2. referral_credits: one row per friend who came through a member's code, written by Amir (athlete_id = the member who earns, intake_id = the
--      friend's application, friend_name, percent, when it was earned, when Amir used it). The coach has an ALL policy; no athlete has a grant.
--      Kept for good: it is in BACKUP_TABLES, the snapshot and coach_erase_person() the day this goes live.
--   3. my_partner_code(p_make): any signed-in athlete who is not under 13 reads their code, or makes it: UPPER(first name, letters only, up to 10)
--      plus two digits, 10% for the friend, 10% for them. crew_referral(athlete) is the same answer without making one, and crew_page() (stage96)
--      carries it on your OWN page once this function exists.
--   4. Amir's side: coach_partner_code_make (a code for an athlete: {code}, or partner:has_code, partner:under13, partner:no_programme), coach_partner_credit_add (a credit for a friend's application: refused when the
--      application is the member's own, partner:self), coach_partner_credit_used (mark it used, or take that back), coach_partner_codes (every
--      athlete code with the applications that typed it and its credits).
--   5. coach_erase_person() learns referral_credits, and nulls the friend's name and application on a credit when that application is erased.
--
-- What it never does: pay XP or write a fact (GAME-6: a code is a social action, a credit is Amir's ledger); show a member a friend's name (my
-- code answer is counts only); change what a friend pays on the form; touch the 6 partner codes; look at a payment (there is none to look at).
-- A member cannot earn from their own application (partner:self); the check is the intake's athlete_id, which Amir links by hand (stage61), so it
-- is only as good as that link.
--
-- Rehearsed on PGlite: scripts/career/rehearse_partner_codes.mjs (the stage twice, every function, the refusals, the erasure, the way back) and once
-- on the live database inside a DO block that ends in `raise exception`. The way back: scripts/career/rollback_stage97.sql. Safe to re-run this file.

-- ── 0. The guard ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
do $stage97_guard$
begin
  if to_regclass('public.affiliates') is null or to_regclass('public.hab_intake') is null or to_regprocedure('public.check_discount(text)') is null then
    raise exception 'stage97: affiliates, hab_intake or check_discount() is missing (stages 29 and 61 first). Nothing was changed.';
  end if;
  if to_regprocedure('public.crew_who()') is null or to_regprocedure('public.coach_erase_person(text,text,text,uuid[],boolean)') is null
     or to_regclass('public.crew_consent') is null then
    raise exception 'stage97: crew_who(), crew_consent or coach_erase_person() is missing (stage81 first). Nothing was changed.';
  end if;
  -- the credit table names the friend's application by its id, whatever type that is: this file was written against uuid
  if (select c.data_type from information_schema.columns c where c.table_schema = 'public' and c.table_name = 'hab_intake' and c.column_name = 'id') is distinct from 'uuid' then
    raise exception 'stage97: hab_intake.id is not a uuid any more. Nothing was changed.';
  end if;
end
$stage97_guard$;

-- ── 1. affiliates: whose code it is, and what the member earns ────────────────────────────────────────────────────────────────────
alter table public.affiliates add column if not exists kind text not null default 'coach' check (kind in ('coach', 'athlete'));
alter table public.affiliates add column if not exists reward_percent integer check (reward_percent between 1 and 90);
create unique index if not exists affiliates_one_athlete_code on public.affiliates (athlete_id) where kind = 'athlete';

-- ── 2. The ledger ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- No foreign key to hab_intake on purpose: erasing a friend's application must not be blocked by, or cascade into, a member's ledger. The erase
-- function nulls the name and the application on the credit instead. The code IS a foreign key: a code with credits cannot be deleted by accident.
create table if not exists public.referral_credits (
  id          uuid        primary key default gen_random_uuid(),
  code        text        not null references public.affiliates (code),
  athlete_id  text        not null,                                    -- the member who earns it
  intake_id   uuid,                                                    -- the friend's application (hab_intake.id)
  friend_name text,
  percent     integer     not null default 10 check (percent between 1 and 90),
  earned_on   date        not null default current_date,
  used_on     date,
  note        text,
  created_at  timestamptz not null default now(),
  constraint referral_credits_once unique (code, intake_id)
);
create index if not exists referral_credits_athlete_idx on public.referral_credits (athlete_id);
create index if not exists referral_credits_code_idx on public.referral_credits (code);

do $stage97_policies$
begin
  execute 'alter table public.referral_credits enable row level security';
  execute 'revoke all on table public.referral_credits from public, anon';
  execute 'grant all on table public.referral_credits to authenticated, service_role';
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'referral_credits' and policyname = 'coach manages referral credits') then
    create policy "coach manages referral credits" on public.referral_credits for all to authenticated
      using ((select public.is_coach())) with check ((select public.is_coach()));
  end if;
end
$stage97_policies$;

-- ── 3. Making and reading a code ──────────────────────────────────────────────────────────────────────────────────────────────────
-- A code for an athlete: UPPER(first name, letters only, up to 10) + two digits, not taken by any other code (more digits when the two-digit space
-- of a name is full). Returns the code; an athlete who already has one gets it back. One at a time, under a lock.
create or replace function public.partner_code_make(p_athlete text) returns text
language plpgsql security definer set search_path to 'public' as $function$
declare v_have text; v_base text; v_name text; v_code text; v_try integer := 0;
begin
  perform pg_advisory_xact_lock(hashtext('partner_code'));
  select a.code into v_have from public.affiliates a where a.athlete_id = p_athlete and a.kind = 'athlete';
  if v_have is not null then return v_have; end if;
  select upper(left(regexp_replace(coalesce(p.data -> 'athlete' ->> 'firstName', ''), '[^A-Za-z]', '', 'g'), 10)),
         nullif(btrim(concat_ws(' ', nullif(btrim(p.data -> 'athlete' ->> 'firstName'), ''), nullif(btrim(p.data -> 'athlete' ->> 'lastName'), ''))), '')
    into v_base, v_name from public.programs p where p.athlete_id = p_athlete;
  if not found then raise exception 'partner:no_programme'; end if;
  v_base := coalesce(nullif(v_base, ''), 'FRIEND');
  loop
    v_try := v_try + 1;
    v_code := v_base || case when v_try <= 40 then lpad((10 + floor(random() * 90))::int::text, 2, '0')
                             else lpad(floor(random() * 10000)::int::text, 4, '0') end;
    exit when not exists (select 1 from public.affiliates a where a.code = v_code);
    if v_try > 400 then raise exception 'partner:full'; end if;
  end loop;
  insert into public.affiliates (code, percent, reward_percent, coach_name, kind, active, athlete_id, applied_on)
  values (v_code, 10, 10, left(coalesce(v_name, p_athlete), 80), 'athlete', true, p_athlete, current_date);
  return v_code;
end $function$;

-- A member's code as the app shows it: counts only, never a friend's name. {code: null} when there is none.
create or replace function public.crew_referral(p_athlete text) returns jsonb
language sql stable set search_path to 'public' as $function$
  select coalesce(
    (select jsonb_build_object(
              'code', a.code, 'percent', a.percent, 'reward', coalesce(a.reward_percent, 10),
              'friends', (select count(*) from public.referral_credits r where r.code = a.code),
              'waiting', (select count(*) from public.referral_credits r where r.code = a.code and r.used_on is null),
              'used', (select count(*) from public.referral_credits r where r.code = a.code and r.used_on is not null))
            || case when a.active then '{}'::jsonb else jsonb_build_object('active', false) end
       from public.affiliates a where a.athlete_id = p_athlete and a.kind = 'athlete' limit 1),
    jsonb_build_object('code', null))
$function$;

create or replace function public.my_partner_code(p_make boolean default false) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare v_me text := public.crew_who();
begin
  if exists (select 1 from public.crew_consent c where c.athlete_id = v_me and c.under13) then raise exception 'partner:under13'; end if;
  if coalesce(p_make, false) then
    perform public.partner_code_make(v_me);
  end if;
  return public.crew_referral(v_me);
end $function$;

-- ── 4. Amir's side ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.coach_partner_code_make(p_athlete text) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare v_a text := nullif(btrim(coalesce(p_athlete, '')), '');
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  if v_a is null or v_a in ('demo', public.coach_note_id()) or not exists (select 1 from public.programs p where p.athlete_id = v_a) then raise exception 'partner:no_programme'; end if;
  if exists (select 1 from public.crew_consent c where c.athlete_id = v_a and c.under13) then raise exception 'partner:under13'; end if;
  if exists (select 1 from public.affiliates a where a.athlete_id = v_a and a.kind = 'athlete') then raise exception 'partner:has_code'; end if;
  return jsonb_build_object('code', public.partner_code_make(v_a));
end $function$;

-- A credit for a friend's application. The friend's name comes from the application. Refused when the application is the code owner's own.
create or replace function public.coach_partner_credit_add(p_code text, p_intake uuid, p_note text default null) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare a record; i record; v_id uuid; v_name text;
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  select x.* into a from public.affiliates x where x.code = upper(btrim(coalesce(p_code, ''))) and x.kind = 'athlete';
  if not found then raise exception 'partner:code'; end if;
  if a.athlete_id is null then raise exception 'partner:orphan'; end if;
  select h.* into i from public.hab_intake h where h.id = p_intake;
  if not found then raise exception 'partner:intake'; end if;
  if i.athlete_id is not null and i.athlete_id = a.athlete_id then raise exception 'partner:self'; end if;
  if exists (select 1 from public.referral_credits r where r.code = a.code and r.intake_id = p_intake) then raise exception 'partner:again'; end if;
  v_name := left(coalesce(nullif(btrim(i.name), ''), nullif(btrim(concat_ws(' ', i.payload ->> 'First Name', i.payload ->> 'Last Name')), '')), 80);
  insert into public.referral_credits (code, athlete_id, intake_id, friend_name, percent, note)
  values (a.code, a.athlete_id, p_intake, v_name, coalesce(a.reward_percent, 10), nullif(left(btrim(coalesce(p_note, '')), 200), ''))
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'code', a.code, 'friend_name', v_name, 'percent', coalesce(a.reward_percent, 10), 'earned_on', current_date);
end $function$;

-- Mark a credit used (today), or take that back.
create or replace function public.coach_partner_credit_used(p_id uuid, p_used boolean) returns boolean
language plpgsql security definer set search_path to 'public' as $function$
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  if p_used is null then raise exception 'partner:used'; end if;
  update public.referral_credits set used_on = case when p_used then current_date end where id = p_id;
  return found;
end $function$;

-- Every athlete's code: who, whether it is on, how many applications typed it (not archived; folded the way coach.html's affUses() folds Persian and
-- Arabic digits and spaces: these are APPLICATIONS, not payments), and its credits.
create or replace function public.coach_partner_codes() returns jsonb
language plpgsql stable security definer set search_path to 'public' as $function$
begin
  if not public.is_coach() then raise exception 'coach only'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'code', a.code, 'athlete_id', a.athlete_id,
             'who', coalesce(nullif(btrim(concat_ws(' ', p.data -> 'athlete' ->> 'firstName', p.data -> 'athlete' ->> 'lastName')), ''), a.coach_name, a.athlete_id),
             'active', a.active,
             'uses', (select count(*) from public.hab_intake h
                       where h.status <> 'archived'
                         and (upper(regexp_replace(translate(coalesce(h.payload ->> 'Discount Code', ''), U&'\0660\0661\0662\0663\0664\0665\0666\0667\0668\0669\06F0\06F1\06F2\06F3\06F4\06F5\06F6\06F7\06F8\06F9', '01234567890123456789'), '\s', '', 'g')) = a.code
                              or upper(regexp_replace(translate(split_part(btrim(coalesce(h.payload ->> 'Discount Applied', '')), ' ', 1), U&'\0660\0661\0662\0663\0664\0665\0666\0667\0668\0669\06F0\06F1\06F2\06F3\06F4\06F5\06F6\06F7\06F8\06F9', '01234567890123456789'), '\s', '', 'g')) = a.code)),
             'credits', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'intake_id', r.intake_id, 'friend_name', r.friend_name, 'earned_on', r.earned_on, 'used_on', r.used_on, 'percent', r.percent)
                                                    order by r.earned_on desc, r.created_at desc)
                                    from public.referral_credits r where r.code = a.code), '[]'::jsonb)) order by a.code)
      from public.affiliates a left join public.programs p on p.athlete_id = a.athlete_id
     where a.kind = 'athlete'), '[]'::jsonb);
end $function$;

-- ── 5. coach_erase_person() learns the ledger ─────────────────────────────────────────────────────────────────────────────────────
-- The member's own credits go with the member (the loop's athlete_id). A friend whose application is erased leaves no name behind on the credit.
do $stage97_erase$
declare
  d text := pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure);
  s_old constant text := '''push_cycle_seen'']';
  s_new constant text := '''push_cycle_seen'', ''referral_credits'']';
  a_old constant text := '      -- The rollback copies the pipeline keeps before a one-off change to live programmes sit in the "backup" schema';
  a_new constant text := concat_ws(chr(10),
    '      -- stage97: a friend whose application is erased below leaves no name on the member''s credit (the credit stays the member''s own until THEY are erased).',
    '      update public.referral_credits set friend_name = null, intake_id = null where intake_id = any (v_ids);',
    '', '') || a_old;
  n integer; m integer;
begin
  if position('''referral_credits''' in d) > 0 then
    return;   -- already patched (a re-run)
  end if;
  n := (length(d) - length(replace(d, s_old, ''))) / length(s_old);
  m := (length(d) - length(replace(d, a_old, ''))) / length(a_old);
  if n <> 1 or m <> 1 then
    raise exception 'stage97: coach_erase_person() is not what this patch expects (the end of its table list found % times, the backup-schema comment % times, not once each). Nothing was changed.', n, m;
  end if;
  execute replace(replace(d, s_old, s_new), a_old, a_new);
end $stage97_erase$;

-- ── 6. Grants ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
do $stage97_grants$
declare f text;
begin
  foreach f in array array['public.partner_code_make(text)', 'public.crew_referral(text)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
  foreach f in array array['public.my_partner_code(boolean)', 'public.coach_partner_code_make(text)', 'public.coach_partner_credit_add(text,uuid,text)',
                           'public.coach_partner_credit_used(uuid,boolean)', 'public.coach_partner_codes()'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end
$stage97_grants$;

-- ── 7. What it must look like afterwards ──────────────────────────────────────────────────────────────────────────────────────────
do $stage97_check$
begin
  if to_regclass('public.referral_credits') is null or to_regprocedure('public.my_partner_code(boolean)') is null
     or to_regprocedure('public.coach_partner_codes()') is null or to_regprocedure('public.crew_referral(text)') is null then
    raise exception 'stage97: something is missing';
  end if;
  if position('''referral_credits''' in pg_get_functiondef('public.coach_erase_person(text,text,text,uuid[],boolean)'::regprocedure)) = 0 then
    raise exception 'stage97: coach_erase_person() does not know referral_credits';
  end if;
  raise notice 'stage97: applied';
end
$stage97_check$;
