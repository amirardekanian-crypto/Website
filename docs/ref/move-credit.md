# Court Log counts toward Steps: the MET table and where each number comes from

Built 2026-11-22 (stage121; Amir: *"lets do option 1 / get a good equal of padel as well, add cycling as well, and a few more
options like beach tennis"*). The rule is in [`docs/rules/habits-in-app.md`](../rules/habits-in-app.md); this is the evidence.

## The arithmetic

- One activity = `round(minutes × MET ÷ 3.5) × 100` steps. Walking at ~100 steps a minute is ~3.5 MET (Compendium 17200 brisk
  walking is 4.8; level walking at ~5 km/h is ~3.5), so one MET-minute is ~28.6 steps.
- A day's credit is the sum, capped at 70% of the Steps target (7,000 of 10,000). Steps also count the hours not spent sitting,
  and a watch worn on court has already counted some of those steps.
- Steps for the day = typed + credit. Paid through the Steps habit only, so it is paid once.
- Forward only (D20): from 2026-11-22.
- Bodyweight is not needed: walking and the activity both scale with body mass, so it cancels out of the conversion.

Two copies: `public.activity_met()` / `move_steps_credit()` (the server, which pays) and `MOVE_MET` / `moveCreditOf()` in
program.html (what the phone shows). `scripts/check_twins.js` holds them equal.

## The table (MET for easy / normal / hard)

| Kind | Easy | Normal | Hard | Source (C = 2024 Adult Compendium, F = field study, A = by analogy) |
|---|---|---|---|---|
| Tennis | 5.0 | 6.8 | 8.0 | 15695 hitting (C), 15675 general (C), 15676 competitive (C) |
| Match (tennis) | 6.8 | 8.0 | 8.5 | 15675 (C), 15690 singles (C), match VO2 26.6–29.9 ml/kg/min = 7.6–8.5 MET (F, Cádiz Gallardo et al. 2023 review) |
| Padel | 5.0 | 6.0 | 7.0 | No Compendium entry. Carrasco et al. 2011, first-level young players, 24.1 ml/kg/min = 6.9 MET (F); easy/normal by analogy with tennis doubles and paddleball (A) |
| Beach tennis | 5.0 | 6.0 | 7.5 | No Compendium entry, no gas-analysis study. Jung et al. 2024 (Front Physiol), ~66–76% HRR, wearable estimate ~7.0–8.8 MET, scaled down (A from F) |
| Pickleball | 4.0 | 4.5 | 6.0 | Smith, Buchanan & Dalleck 2018, doubles, 4.1 ± 1.0 MET, older adults (F); hard by analogy with tennis doubles 15680 (A) |
| Squash | 6.0 | 7.3 | 10.0 | 15652 general (C); hard capped like racquetball competitive (A) |
| Badminton | 5.5 | 7.0 | 9.0 | 15030 social, 15020 competitive, 15025 match play (C) |
| Running | 7.5 | 9.3 | 11.0 | 12020 jogging, 12050 ~10 km/h, 12070 ~11.3 km/h (C) |
| Cycling | 4.0 | 6.8 | 10.0 | 01010 leisure <16 km/h, 01020 16–19 km/h, 01040 22.5–25.6 km/h (C); indoor similar |
| Swimming | 5.8 | 8.0 | 9.8 | 18240 slow, 18290 medium, 18230 fast (C) |
| Football | 5.0 | 7.0 | 9.5 | easy by analogy (A), 15610 casual (C), 15605 competitive (C) |
| Gym | 3.5 | 5.0 | 6.0 | 02054, 02052, 02050 (C) |
| Other | 3.5 | 5.0 | 7.5 | circuit training light / moderate / vigorous as a scale (A) |

An hour of normal tennis is 11,700 steps of work, so it reaches the cap.

## Where the evidence is thin

Padel (one VO2 figure, young high-level players: recreational padel is likely lower), beach tennis (no VO2 study), pickleball
(one small study, older adults), squash (no modern VO2 study). Racket-sport METs are averaged over the whole session, rest between
points included. The same effort costs a fit athlete more absolute MET, so the table may undercount competitive players.

Sources: [2024 Adult Compendium](https://pacompendium.com/adult-compendium/) (Herrmann et al. 2024, J Sport Health Sci) ·
[Cádiz Gallardo et al. 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10101231/) · [Paulauskas et al. 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12213881) ·
[Jung et al. 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11557381/) · [Smith, Buchanan & Dalleck 2018](https://ijrep.org/?p=2291)
