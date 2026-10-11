// A card that names its entry IS that entry, on the phone (audit TWIN-1, 2026-10-11), against the stub.
// The phone is served approved Spine entries only. A programme card carries the id of its entry (`exId`); when that
// entry is still a DRAFT the phone does not have it. It used to look the card up by NAME instead, and the loose name
// tiers (the word "machine" dropped, word order ignored) found a different approved entry: "Machine Seated Leg Curl"
// (a draft) showed the cues and video of "Seated Leg Curl". Now a card with an exId shows that entry or nothing; a card
// with no exId is still found by its name. This checks, in the real app:
//   · spineFor(): the draft's id answers nothing (even though the name has an approved loose twin), the approved id
//     answers its entry, an id the phone has never heard of answers nothing, and no id falls back to the name tiers;
//   · the cards: the one on the draft has no video player in its open card, the ones on an approved entry or found by name do.
// Serve the repo (python3 -m http.server 8765 --bind 127.0.0.1), then: node scripts/headless/spine-link.js
'use strict';
const H = require('./lib');

const TWIN = { id: 'seated-leg-curl', name: 'Seated Leg Curl', aliases: [], equipment: ['machine'],
  cues: { good: ['Pad above the heels'], bad: [] }, video: 'https://www.youtube.com/watch?v=SeatedCurl01', purpose: 'Hamstrings.' };

(async () => {
  const t = H.checker();
  const browser = await H.launch();
  const prog = H.fixture();
  prog.workouts.days[0].blocks[1].exercises.push(
    { name: 'Machine Seated Leg Curl', exId: 'machine-seated-leg-curl', type: 'standard', rx: { sets: 3, reps: 10 } },   // a draft: not on the phone
    { name: 'Seated Leg Curl', exId: 'seated-leg-curl', type: 'standard', rx: { sets: 3, reps: 10 } },                    // approved
    { name: 'Curl Seated Leg', type: 'standard', rx: { sets: 3, reps: 10 } },                                              // no exId: found by name
    { name: 'Ghost Press', exId: 'never-existed', type: 'standard', rx: { sets: 3, reps: 10 } });                           // an id the phone has never heard of
  const { ctx, p } = await H.openProgram(browser, { prog, spine: H.SPINE.concat([TWIN]) });

  const look = (name, exId) => p.evaluate(([n, e]) => { const x = spineFor(n, e); return x ? x.id : null; }, [name, exId]);
  t.check('a card on a DRAFT shows no entry, although "Seated Leg Curl" is its loose twin', (await look('Machine Seated Leg Curl', 'machine-seated-leg-curl')) === null, await look('Machine Seated Leg Curl', 'machine-seated-leg-curl'));
  t.check('a card on an approved entry shows that entry', (await look('Seated Leg Curl', 'seated-leg-curl')) === 'seated-leg-curl', await look('Seated Leg Curl', 'seated-leg-curl'));
  t.check('an exId wins over a name that belongs to another entry', (await look('Seated Leg Curl', 'box-jump')) === 'box-jump', await look('Seated Leg Curl', 'box-jump'));
  t.check('an id the phone has never heard of is no entry, whatever the name', (await look('Seated Leg Curl', 'never-existed')) === null, await look('Seated Leg Curl', 'never-existed'));
  t.check('a name with no exId is still found by its tiers (word order)', (await look('Curl Seated Leg', '')) === 'seated-leg-curl', await look('Curl Seated Leg', ''));
  t.check('and by its exact name', (await look('Box Jump', undefined)) === 'box-jump', await look('Box Jump', undefined));

  await p.evaluate(() => openDayView('1'));
  await p.waitForTimeout(300);
  const player = name => p.evaluate(`(() => { const c = ${H.card(name)}; if (!c) return 'no card';
    if (c.classList.contains('collapsed')) toggleExpand(c);
    return c.querySelector('.ex-vunit') ? 'player' : 'none'; })()`);
  t.check('the card on the draft has no video player', (await player('Machine Seated Leg Curl')) === 'none', await player('Machine Seated Leg Curl'));
  t.check('the card on the approved entry has its player', (await player('Seated Leg Curl')) === 'player', await player('Seated Leg Curl'));
  t.check('the card found by name has its player', (await player('Curl Seated Leg')) === 'player', await player('Curl Seated Leg'));
  t.check('the card with an unknown id has none', (await player('Ghost Press')) === 'none', await player('Ghost Press'));
  t.check('no page errors', !p.errs.length, p.errs.join(' | '));

  await ctx.close(); await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
