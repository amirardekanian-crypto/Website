-- stage35 — Fixing links that were already there, and merging three duplicates (2026-09-24). APPLIED.
--
-- After the stage34 link pass, an assistant-coach review listed EXISTING links (approved
-- before that pass) that break the strict meanings: Regressions and Progressions are the SAME
-- movement made easier or harder, Alternatives are the same movement on other kit. Stage34 only
-- added; these were proposals, and Amir said "apply the fixes".
--
-- Backup first (tag 'claude-fixes-2026-09-24c' in exercise_coach.links_history): the links and
-- aliases of the 25 entries touched, and the WHOLE row of each merged duplicate (its coach half
-- included) as `merged_entry` on the entry it merged into. The coach half stays in the database;
-- this public file never carries SFR or flags.
--
-- 1. Ab Wheel Rollout: RKC Plank was its regression (a plank is not a rollout). Both sides removed.
-- 2. Hollow Hold <- Dead Bug and V-Up <- Hollow Hold (one-sided): different movements, removed.
--    Tuck Hollow Hold and Tuck-Up (stage34) are their regressions now.
-- 3. Modified Side Plank with Hip Abduction is done from the KNEES: its regression is Kneeling
--    Side Plank, not Side Plank (that was backwards), and Copenhagen Plank (inner thigh, not outer
--    hip) is no longer its progression. Side Plank and it both progress to the plain name
--    'Side Plank with Hip Abduction'.
-- 4. Rowing is not an alternative to Assault Bike or Stationary Bike: bike <-> bike only.
-- 5. Banded Glute Bridge (band at the knees) is a harder bridge, not an alternative: Glute Bridge
--    -> Banded Glute Bridge. Machine Hip Thrust left Glute Bridge's progressions to keep that list
--    at four; Machine Hip Thrust still lists Glute Bridge as its regression (one-sided on purpose).
-- 6. Three duplicates merged. The name that goes becomes an ALIAS on the one that stays, so every
--    programme card using it still resolves (by name; none carried an exId):
--      Cable Single-Leg Hip Extension -> cable-glute-kickback (had the video, used by 2 athletes)
--      Rotational Wall Slam          -> medicine-ball-rotational-throw (video, 6 athletes)
--      Thoracic Windmill             -> open-book (video, 5 athletes)
--    ⚠ Two entries may never share a name or alias: the resolver takes the tightest tier with ONE
--    entry, so a shared name resolves to NOTHING and both cards lose their cues. That is why the
--    duplicate is deleted rather than kept beside the alias.
-- 7. Broad Jump <- Squat Jump (vertical is not horizontal), Serratus Wall Slide -> Scapular
--    Push-Up (same muscle, different movement), Dumbbell Push Press <-> Single-Arm Landmine Push
--    Press (another plane, one arm): removed. In their place: Scapular Push-Up <- 'Incline Scapular
--    Push-Up', Dumbbell Push Press alt 'Barbell Push Press'.
-- 8. Half-Kneeling Bottoms-Up Kettlebell Press is HARDER than the half-kneeling dumbbell press:
--    moved from Alternatives to Progressions (both sides).
-- 9. Single-Leg Calf Raise <- Standing Machine Calf Raise: a heavy machine raise is not easier.
--    Both sides removed; Double-Leg Calf Raise (stage34) is the regression.
-- NOT applied — proposal 10, "remove the alias Single-Leg Bound from Lateral Bound": the one
--    programme using that name (Reactive Power, one athlete) IS a lateral bound ("push off
--    sideways", "the outside of the hip catches you"). Removing it would cut that card off its
--    entry. If a forward single-leg bound is ever programmed, give it its own entry and stamp
--    exId 'lateral-bound' on this card first.
--
-- Result, checked after: 209 entries; all 260 exercise names in live programmes still resolve;
-- 365 links (104 plain names); 17 entries with no link (rowing and serratus-wall-slide joined the
-- warm-up drills and stretches); no list longer than four; no id that is not an entry.
--
-- Undo one entry's links and aliases:
--   update public.exercises x
--      set easier = array(select jsonb_array_elements_text(h->'easier')),
--          harder = array(select jsonb_array_elements_text(h->'harder')),
--          alts   = array(select jsonb_array_elements_text(h->'alts')),
--          aliases = array(select jsonb_array_elements_text(h->'aliases'))
--     from public.exercise_coach c, jsonb_array_elements(c.links_history) h
--    where c.id = x.id and h->>'before' = 'claude-fixes-2026-09-24c' and h ? 'easier' and x.id = '<exercise-id>';
-- Bring back a merged entry: take `merged_entry` from its keeper's links_history, remove the alias
-- from the keeper FIRST (or both resolve to nothing), then insert the row into exercises and its
-- `coach` object into exercise_coach.

begin;
insert into public.exercise_coach (id, links_history)
select x.id, jsonb_build_array(jsonb_build_object('before','claude-fixes-2026-09-24c','saved',now(),
       'easier',to_jsonb(x.easier),'harder',to_jsonb(x.harder),'alts',to_jsonb(x.alts),'aliases',to_jsonb(x.aliases)))
  from public.exercises x where x.id in ('ab-wheel-rollout','rkc-plank','hollow-hold','v-up','modified-side-plank-with-hip-abduction',
    'side-plank','kneeling-side-plank','assault-bike','stationary-bike','rowing','banded-glute-bridge','glute-bridge','dumbbell-glute-bridge',
    'cable-glute-kickback','medicine-ball-rotational-throw','open-book','broad-jump','serratus-wall-slide','scapular-push-up',
    'dumbbell-push-press','single-arm-landmine-push-press','half-kneeling-bottoms-up-kettlebell-press',
    'half-kneeling-single-arm-dumbbell-press','single-leg-calf-raise','standing-machine-calf-raise')
on conflict (id) do update set links_history = public.exercise_coach.links_history || excluded.links_history
 where not public.exercise_coach.links_history @> '[{"before":"claude-fixes-2026-09-24c"}]';
update public.exercise_coach k
   set links_history = k.links_history || jsonb_build_array(jsonb_build_object('before','claude-fixes-2026-09-24c','saved',now(),
       'merged_entry', to_jsonb(x) || jsonb_build_object('coach', coalesce(to_jsonb(c) - 'links_history', '{}'::jsonb))))
  from (values ('cable-glute-kickback','cable-single-leg-hip-extension'),('medicine-ball-rotational-throw','rotational-wall-slam'),
               ('open-book','thoracic-windmill')) m(keep, gone)
  join public.exercises x on x.id = m.gone left join public.exercise_coach c on c.id = m.gone
 where k.id = m.keep and not k.links_history @> jsonb_build_array(jsonb_build_object('merged_entry', jsonb_build_object('id', m.gone)));

update public.exercises set aliases = aliases || array['Cable Single-Leg Hip Extension'] where id = 'cable-glute-kickback' and not 'Cable Single-Leg Hip Extension' = any(aliases);
update public.exercises set aliases = aliases || array['Rotational Wall Slam'] where id = 'medicine-ball-rotational-throw' and not 'Rotational Wall Slam' = any(aliases);
update public.exercises set aliases = aliases || array['Thoracic Windmill'] where id = 'open-book' and not 'Thoracic Windmill' = any(aliases);
update public.exercises set
  easier = array(select u from unnest(easier) with ordinality t(u, o) where u not in ('cable-single-leg-hip-extension','rotational-wall-slam','thoracic-windmill') order by o),
  harder = array(select u from unnest(harder) with ordinality t(u, o) where u not in ('cable-single-leg-hip-extension','rotational-wall-slam','thoracic-windmill') order by o),
  alts   = array(select u from unnest(alts)   with ordinality t(u, o) where u not in ('cable-single-leg-hip-extension','rotational-wall-slam','thoracic-windmill') order by o)
 where (easier || harder || alts) && array['cable-single-leg-hip-extension','rotational-wall-slam','thoracic-windmill'];
delete from public.exercises where id in ('cable-single-leg-hip-extension','rotational-wall-slam','thoracic-windmill');

update public.exercises set easier = array_remove(easier, 'rkc-plank') where id = 'ab-wheel-rollout';
update public.exercises set harder = array_remove(harder, 'ab-wheel-rollout') where id = 'rkc-plank';
update public.exercises set easier = array_remove(easier, 'dead-bug') where id = 'hollow-hold';
update public.exercises set easier = array_remove(easier, 'hollow-hold') where id = 'v-up';
update public.exercises set easier = array_replace(easier, 'side-plank', 'kneeling-side-plank'), harder = array_remove(harder, 'copenhagen-plank') where id = 'modified-side-plank-with-hip-abduction';
update public.exercises set harder = array_remove(harder, 'modified-side-plank-with-hip-abduction') || array['Side Plank with Hip Abduction'] where id = 'side-plank' and not 'Side Plank with Hip Abduction' = any(harder);
update public.exercises set harder = harder || array['modified-side-plank-with-hip-abduction'] where id = 'kneeling-side-plank' and not 'modified-side-plank-with-hip-abduction' = any(harder);
update public.exercises set alts = array_remove(alts, 'rowing') where id in ('assault-bike', 'stationary-bike');
update public.exercises set alts = array_remove(array_remove(alts, 'assault-bike'), 'stationary-bike') where id = 'rowing';
update public.exercises set alts = array_remove(array_remove(alts, 'glute-bridge'), 'dumbbell-glute-bridge'), easier = easier || array['glute-bridge'] where id = 'banded-glute-bridge' and not 'glute-bridge' = any(easier);
update public.exercises set alts = array_remove(alts, 'banded-glute-bridge'), harder = array_remove(harder, 'machine-hip-thrust') || array['banded-glute-bridge'] where id = 'glute-bridge' and not 'banded-glute-bridge' = any(harder);
update public.exercises set alts = array_remove(alts, 'banded-glute-bridge') where id = 'dumbbell-glute-bridge';
update public.exercises set easier = array_remove(easier, 'squat-jump') where id = 'broad-jump';
update public.exercises set harder = array_remove(harder, 'scapular-push-up') where id = 'serratus-wall-slide';
update public.exercises set easier = array_remove(easier, 'serratus-wall-slide') || array['Incline Scapular Push-Up'] where id = 'scapular-push-up' and not 'Incline Scapular Push-Up' = any(easier);
update public.exercises set alts = array_remove(alts, 'single-arm-landmine-push-press') || array['Barbell Push Press'] where id = 'dumbbell-push-press' and not 'Barbell Push Press' = any(alts);
update public.exercises set alts = array_remove(alts, 'dumbbell-push-press') where id = 'single-arm-landmine-push-press';
update public.exercises set alts = array_remove(alts, 'half-kneeling-single-arm-dumbbell-press'), easier = easier || array['half-kneeling-single-arm-dumbbell-press'] where id = 'half-kneeling-bottoms-up-kettlebell-press' and not 'half-kneeling-single-arm-dumbbell-press' = any(easier);
update public.exercises set alts = array_remove(alts, 'half-kneeling-bottoms-up-kettlebell-press'), harder = harder || array['half-kneeling-bottoms-up-kettlebell-press'] where id = 'half-kneeling-single-arm-dumbbell-press' and not 'half-kneeling-bottoms-up-kettlebell-press' = any(harder);
update public.exercises set easier = array_remove(easier, 'standing-machine-calf-raise') where id = 'single-leg-calf-raise';
update public.exercises set harder = array_remove(harder, 'single-leg-calf-raise') where id = 'standing-machine-calf-raise';

update public.exercises set updated_at = now(), updated_by = 'claude-fixes-2026-09-24c'
 where id in (select id from public.exercise_coach where links_history @> '[{"before":"claude-fixes-2026-09-24c"}]');
commit;
