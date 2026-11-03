-- stage106_spare_session.sql — the spare: a plan day trained twice covers the same day next week, and every finished session counts (2026-10-26)
--
-- ⚠️ BROUGHT TO THE REPO AFTER THE FACT (2026-11-03). This stage was applied to the live project bvipfipbdcyqnbczjmaq on 2026-10-26 at
-- 13:28:57 UTC as the migration `stage106_spare_session` (version 20261026132857), from a session whose files never reached main. It was found
-- on 2026-11-02, when supabase/schema_snapshot.sql was made again and picked up its two changed functions; the rest alert that came next had to
-- be filed as stage107_rest_push.sql (docs/record/PUSH-REST-AND-FINISH.md). No copy was on any branch. The BODY below, from the first `do` to
-- the end, is the SQL that was applied, character for character: it is supabase_migrations.schema_migrations.statements for that migration
-- (3,230 characters, md5 e1b28d5210829100eae36af57c1260bd). Only this header is new, and it is written from the live rows; Amir's own words
-- for the decision are not on record here. Do not apply it again: it is live (a re-run changes nothing, each patch skips itself).
--
-- It is half of one change. The other half is rulebook VERSION 12, seeded two minutes later (2026-10-26 13:30:21 UTC, starts_on 2026-10-26):
-- session_finished and session_finished_early went from limit 1 to limit 2 per plan day per training week, so a plan day done a second time in
-- the same week pays again and a third time pays nothing. career/rulebook.toml was brought to version 12 in the same commit as this file; the
-- rules it seeds equal the live version 12 row (md5 of rules::text b25cf1c042828c53b8adac8e05a271cd).
--
-- What this does (guarded textual patches, like stages 76/79/94/99/104/105: each line is found exactly once or it refuses and changes nothing):
--   career_derive(text), `held`: a plan day missed in a training week still counts as done when the SAME plan day was trained twice or more in
--       the week before, in the same cycle (`pw.week = wk.week - 1`). Only for weeks starting on or after 2026-10-18, Season 1's first day
--       (D20: nothing before it is worked out again). The spare covers the next week only, and only the day it doubled.
--   career_derive(text), `held_on`: a week held by spares alone has no session in it, so its day is the week's first day (coalesce with wfrom)
--       instead of null.
--   career_measures(text,jsonb,text[]): a `count:` reward over session_finished / session_finished_early counts EVERY finished session, not
--       only the ones career_facts_paid() pays. That takes the two session kinds out of D19's paid-only count (stage73; the comment above the
--       line in the function still describes D19 for the kinds it keeps: library_session and effort_win). It moves Century and the sessions_N
--       achievements. XP is untouched: career_facts_paid() still applies the cap, now 2 (version 12).
--
-- What it moved on the live rows. No table, column, grant or trigger. coach_erase_person() was NOT changed by it: the snapshot of 2026-11-02 shows
-- that function (and eight others) as different only because their live bodies carry CR line ends from an old Windows-applied version, which the
-- snapshot of 2026-10-26 had dropped; ignoring whitespace they are identical. The version 12 seed's quiet pass (13:30 UTC) minted 6 awards for
-- 6 athletes, every one `via count:session_finished,session_finished_early`: Century step 2 and sessions_7, 15, 30 and 40 found by the new count,
-- 5 of them at 0 XP (done before their paid_from, D21) and one sessions_15, done 2026-10-25, at 200 XP. As of 2026-11-03 no week has been held
-- by a spare yet.
--
-- The way back: scripts/career/rollback_stage106.sql, on Amir's word only (it undoes the SQL here, not version 12's limit 2).
-- Detail: career/PROCEDURES.md → Stage 106.

do $stage106_guard$
begin
  if to_regprocedure('public.career_derive(text)') is null or to_regprocedure('public.career_measures(text,jsonb,text[])') is null
     or to_regprocedure('public.career_weeks(text)') is null then
    raise exception 'stage106: stages 66 and 70 are not all on this database. Nothing was changed.';
  end if;
end
$stage106_guard$;

do $stage106_patch$
declare p record; d text; n int; v text;
begin
  for p in
    select * from (values
      ('public.career_derive(text)',
       $a$(select bool_and(exists (select 1 from s where s.d between wk.wfrom and wk.wto and s.pday = pd)) from unnest(wk.plan) pd) as held,$a$,
       $a$(select bool_and(exists (select 1 from s where s.d between wk.wfrom and wk.wto and s.pday = pd)
                            or (wk.wfrom >= date '2026-10-18'   /* stage106: the spare, from Season 1 */
                                and (select count(*) from s join wk pw on pw.cycle_index = wk.cycle_index and pw.week = wk.week - 1
                                      where s.d between pw.wfrom and pw.wto and s.pday = pd) >= 2)) from unnest(wk.plan) pd) as held,$a$,
       null::text, null::text),
      ('public.career_derive(text)',
       $a$(select max(z.fd) from (select min(s.d) as fd from s where s.d between wk.wfrom and wk.wto and s.pday = any (wk.plan)$a$,
       $a$coalesce((select max(z.fd) from (select min(s.d) as fd from s where s.d between wk.wfrom and wk.wto and s.pday = any (wk.plan)$a$,
       $a$group by s.pday) z) as held_on,$a$,
       $a$group by s.pday) z), wk.wfrom) as held_on,   /* stage106 */$a$),
      ('public.career_measures(text,jsonb,text[])',
       $a$where public.career_rules_now() -> 'fact' -> k ->> 'limit_per' is not null)$a$,
       $a$where public.career_rules_now() -> 'fact' -> k ->> 'limit_per' is not null
                                     and k not in ('session_finished', 'session_finished_early'))   /* stage106: every session counts */$a$,
       null::text, null::text)
    ) as t(fn, old1, new1, old2, new2)
  loop
    d := pg_get_functiondef(p.fn::regprocedure);
    if position(p.new1 in d) > 0 then continue; end if;
    n := (length(d) - length(replace(d, p.old1, ''))) / length(p.old1);
    if n <> 1 then
      raise exception 'stage106: % is not what this stage expects (this text was found % times, not once): %. Nothing was changed.', p.fn, n, left(p.old1, 80);
    end if;
    v := replace(d, p.old1, p.new1);
    if p.old2 is not null then
      n := (length(d) - length(replace(d, p.old2, ''))) / length(p.old2);
      if n <> 1 then
        raise exception 'stage106: % is not what this stage expects (this text was found % times, not once): %. Nothing was changed.', p.fn, n, left(p.old2, 80);
      end if;
      v := replace(v, p.old2, p.new2);
    end if;
    execute v;
  end loop;
end
$stage106_patch$;

do $stage106_check$
begin
  if position('stage106' in pg_get_functiondef('public.career_derive(text)'::regprocedure)) = 0
     or position('stage106' in pg_get_functiondef('public.career_measures(text,jsonb,text[])'::regprocedure)) = 0 then
    raise exception 'stage106: a patched function does not carry the stage106 text';
  end if;
  raise notice 'stage106: done';
end
$stage106_check$;
