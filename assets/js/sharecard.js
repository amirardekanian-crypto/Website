/* ══ HIGHLIGHT REEL: the training app's share cards (2026-10-17) ══════════════════════════════════════════════════════════
   Amir asked to celebrate athletes' wins and let them share them on Instagram, approved the design page
   (https://claude.ai/artifact/SuyYRPeX9n2SdbiUvoHhkF) with "go with your picks" on all five decisions (all five cards at once;
   the athlete picks English or Farsi; weights shown, with a switch to hide them; his photo and signature on every card; the name
   Highlight Reel), and added: "the achievements, badges and other things need to have a celebration as well". So this ONE painter
   draws ten cards in one family:
     · the training's five, fed by program.html: best (New Best), effort (Same Effort), retest (Retest), cycle (Signed Off) and
       roadmap (The Distance);
     · Career Mode's five reward cards, drawn and tested with sample data now and fed by Career Mode phase 3 (career/CAREER_MODE.md,
       GAME-14: from a highlight up, a reward gets a share card): badge, achievement, title, level and quest.
   Two sizes: a Story (1080 × 1920, the default) and a 4:5 post (1080 × 1350). Every card carries the court's lines, Amir's photo,
   his signature (program.html's WN_SIG, the same paths), the mark, @amirardekanian and AMIRARDEKANI.COM. In a Story the top 250 px
   and the bottom 340 px are Instagram's own bars, so nothing that matters is drawn there.
   Rules (the design page's "Rules every card follows"): a card says what the app already says, from the same rules (PROG-01: never
   beyond what the sets show, a set as lifted, never the 1RM estimate); never body weight, a check-in answer, pain or an RPE-only claim;
   no person in a picture (the cycle covers are objects); no gold or yellow anywhere (the metals are Proof's: bronze, silver, emerald,
   amethyst, prismatic). Nothing leaves the phone until the athlete taps Share or Save: this file only draws.
   The decisions (which win, which numbers) are made by the caller; this file only words and draws them, in English and in Farsi.
   A weight is written in the measure the athlete logged it in (2026-10-18): the spec's `u` is 'kg', 'lb' or 'plates' (the count on a
   machine's stack); absent or anything else is 'kg'. The numbers are the ones typed, never converted, and the unit word after each
   one follows `u` (best, retest and effort carry it on the spec, the cycle card on each win): kgs() / plusKg() / unitW() below.
   ⚠️ EVERY FARSI STRING IS IN ONE TABLE (FA, below) AND EVERY ONE IS A DRAFT FOR AMIR TO READ. Change the words there, never inline.
   Fonts: Barlow and Barlow Condensed from /assets/css/app-fonts.css (the app's own files), Vazirmatn from
   /assets/fonts/Vazirmatn-Variable.woff2, loaded only for a Farsi card. The arrows, ticks and stars are drawn as paths, because the
   app's font files carry Latin only (→ and ✓ would fall back to a phone's own font).
   Tests: scripts/headless/sharecard.js paints every card at both sizes in both languages and fails on text past its box.
   Used by: program.html (the share sheet, the finish band, the moments). PROGRAM-APP.md → Highlight Reel. */
(function (root) {
  'use strict';

  // ── 1. Sizes and colours ──────────────────────────────────────────────────────────────────────────────────────────────
  // top/bottom: where the content may sit. A Story keeps Instagram's top bar (about 250 px) and its reply bar (about 340 px)
  // clear; a post has only a margin. pad: the sides.
  // eyeY: the top strip (the eyebrow, and the athlete's name and the date). bodyY..bodyEnd: the card's own words, laid out
  // from the bottom up. footY: the hairline, his photo, his signature and the mantra. adY: the handle, the mark, the site.
  // Everything ends by 1568 in a Story: Instagram's reply bar starts at 1580 (scripts/headless/sharecard.js, rule `bars`).
  const SIZES = {
    story: { W: 1080, H: 1920, top: 280, bottom: 1576, pad: 84, cover: 1020,
             eyeY: 286, bodyY: 420, bodyEnd: 1220, footY: 1300, adY: 1496 },
    post:  { W: 1080, H: 1350, top: 92, bottom: 1262, pad: 84, cover: 700,
             eyeY: 96, bodyY: 230, bodyEnd: 930, footY: 1000, adY: 1190 },
  };
  // The card's colours: Centre Court's green cover, as the athlete sees it in the app (the design page's --c-* tokens).
  const C = {
    ink: '#FFFFFF', soft: '#CFE3D8', mute: '#9FC3B2', clay: '#F08A63', clayLine: '#E06B43',
    line: 'rgba(255,255,255,0.16)', court: 'rgba(255,255,255,0.11)', bar: 'rgba(255,255,255,0.22)', dim: 'rgba(255,255,255,0.52)',
    deep: '#082D20', mid: '#0E4A36', light: '#1B7254', foot: '#0C3F2E', mint: '#6DBE95',
  };
  const FAM = {
    disp: '"Barlow Condensed", "Arial Narrow", Arial, sans-serif',
    body: 'Barlow, Arial, sans-serif',
    mono: '"Space Mono", ui-monospace, Menlo, monospace',
    fa: 'Vazirmatn, Tahoma, Arial, sans-serif',
  };
  // The face a style's family asks document.fonts for (Space Mono ships 400 and 700 only).
  const FACE = { disp: '"Barlow Condensed"', mono: '"Space Mono"', body: 'Barlow' };
  const ASSET = {
    coach: '/assets/img/coach.jpg', logo: '/assets/img/icon-192.png', court: '/court-sessions.jpg',
    vazir: '/assets/fonts/Vazirmatn-Variable.woff2', fonts: '/assets/css/app-fonts.css',
  };
  // Amir's signature: program.html's WN_SIG, the same two paths (viewBox 0 0 130 46, skewX(-12) translate(8 0)).
  const SIG = {
    d1: 'M5 40 C11 28 17 14 24 4 C25 15 27 28 30 38 C31 41 28 37 22 31 C17 27 11 26 9 28 C16 25 30 25 38 28 C40 29 41 33 41 38 C42 32 45 27 48 28 C51 29 51 34 51 38 C52 32 55 27 58 28 C61 29 61 34 62 38 C63 34 65 31 67 30 C67 33 67 36 69 38 C70 35 71 32 72 29 C72 32 72 35 73 38 C74 33 77 29 81 29 C84 29 85 31 87 32 C97 37 112 31 124 21',
    d2: 'M66.5 22.5 l1.6 -1.2', w1: 2.2, w2: 2.7, vw: 130, vh: 46,
  };

  // ── 2. The words ──────────────────────────────────────────────────────────────────────────────────────────────────────
  // EN and FA have the same keys (the headless test checks it). A function is a string with numbers in it; the numbers arrive
  // already written in the card's language (n(), kgs(), dates). The English follows the app's own words (winText(), the Records
  // screen, Career Mode's catalogue), worded for someone who does not train with Amir: "effort", never "RPE", in a sentence.
  const EN = {
    coach: 'Amir Ardekani · Coach',
    kg: 'kg', lb: 'lb', plate: 'plate', plates: 'plates', reps: n => n === 1 ? 'rep' : 'reps', sessions: 'sessions', weeks: 'weeks', cycles: 'cycles', newBests: 'new bests',
    personalRecords: 'Personal records',
    cycleEye: (n, name) => `Cycle ${n} · ${name}`,
    cycleOf: (n, of) => `Cycle ${n} of ${of}`,
    testWeek: n => `Cycle ${n} · test week`,
    week: n => `Week ${n}`,
    // New Best
    bestHead: [['New '], ['best', 1]],
    bestGainKg: (g, d) => [[g, 1], [` on ${d}. Same reps.`]],
    bestGainReps: (g, w, d) => [[g, 1], [` at ${w} on ${d}.`]],
    bestHiddenKg: d => [[`On ${d}. Same reps.`]],
    bestHiddenReps: d => [[`On ${d}. Same weight.`]],
    // Same Effort: the headline and the line by the win's shape (program.html's winText(), its shape)
    effortHead: {
      kg: [['Same effort.'], ['More weight.', 1, 1]], kgSameReps: [['Same reps.'], ['More weight.', 1, 1]],
      reps: [['Same effort.'], ['More reps.', 1, 1]], repsSameWeight: [['Same weight.'], ['More reps.', 1, 1]],
      kgEasier: [['More weight.'], ['Less effort.', 1, 1]], kgReps: [['More weight.'], ['More reps.', 1, 1]],
      bwReps: [['Same effort.'], ['More reps.', 1, 1]], bwRepsPlain: [['More reps.', 1]],
      pct: p => [[`About ${p}`], ['stronger.', 1, 1]],
    },
    effortLine: {
      kg: g => [[g, 1], [' at the same reps and the same effort.']],
      kgSameReps: g => [[g, 1], [' at the same reps.']],
      reps: (g, w) => [[g, 1], [` at ${w} and the same effort.`]],
      repsSameWeight: (g, w) => [[g, 1], [` at ${w}.`]],
      kgEasier: g => [[g, 1], [' at the same reps, and it felt easier.']],
      kgReps: (g, g2) => [[g, 1], [' and '], [g2, 1], ['.']],
      bwReps: g => [[g, 1], [' at the same effort.']],
      bwRepsPlain: g => [[g, 1], ['.']],
      pctHarder: p => [['Heavier and harder: '], [`about ${p} stronger.`, 1]],
      pctFewer: p => [['Heavier for fewer reps: '], [`about ${p} stronger.`, 1]],
      pctLess: p => [['More reps with less weight: '], [`about ${p} stronger.`, 1]],
      pctBw: p => [[`About ${p} stronger.`, 1]],
    },
    // the short form, one line under a lift's name (Signed Off's wins)
    winShort: {
      kg: g => `${g}, same reps, same effort`, kgSameReps: g => `${g}, same reps`,
      reps: (g, w) => `${g} at ${w}, same effort`, repsSameWeight: (g, w) => `${g} at ${w}`,
      kgEasier: g => `${g}, and it felt easier`, kgReps: (g, g2) => `${g} and ${g2}`,
      bwReps: g => `${g}, same effort`, bwRepsPlain: g => g,
      pctHarder: p => `heavier and harder: about ${p} stronger`, pctFewer: p => `heavier for fewer reps: about ${p} stronger`,
      pctLess: p => `more reps with less: about ${p} stronger`, pctBw: p => `about ${p} stronger`,
    },
    rpe: r => `RPE ${r}`,
    // Retest
    retestHead: [['Re'], ['test', 1]],
    beaten: 'Beaten',
    retestOneCycle: g => [[g, 1], [' in one cycle.']],
    retestSince: (g, d) => [[g, 1], [` since ${d}.`]],
    retestDates: (d1, d2) => ` Tested ${d1}, retested ${d2}.`,
    retestBefore: (d1, d2) => ` Best before this cycle ${d1}, retested ${d2}.`,
    // Signed Off
    signedOff: 'Signed off',
    // The Distance
    roadEye: 'The whole roadmap',
    roadHead: [['The '], ['distance', 1]],
    roadLine: (d1, d2) => [[`Started ${d1}. Finished ${d2}.`]],
    // Career Mode's rewards
    meaning: { consistency: 'Consistency', commitment: 'Commitment', progress: 'Progress', resilience: 'Resilience', chosen: 'From Amir' },
    achievementEye: m => `Achievement · ${m}`,
    levelEye: 'Career Mode',
    levelHead: n => [['Level '], [n, 1]],
    levelLine: () => [['Your career level. It never resets.']],
    // ── The 2026-10-19 pass: the mantra, the four marks, the month's honour, the Open, the player card, a level, the
    //    month's goal and a session. Amir, 2026-10-19: "go with your picks", and the photo decision below.
    mantra: 'A coach in your pocket.',
    markEye: 'A new mark',
    // The words under a mark's number, and Amir's line about it. `n` arrives already written in the card's language.
    markWords: { weeks_held: 'weeks held in a row', sessions_with_amir: 'sessions with Amir', personal_bests: 'personal bests', comebacks: 'comebacks' },
    markLine: {
      weeks_held: n => [['Every session, '], [`${n} weeks running.`, 1], [' Keep it boring.']],
      sessions_with_amir: n => [[`${n} sessions in.`, 1], [' This is how it adds up.']],
      personal_bests: n => [[`${n} personal bests.`, 1], [' You are getting stronger.']],
      comebacks: n => [[`${n} times you came back.`, 1], [' That is the part that counts.']],
    },
    markUnit: { weeks_held: 'weeks', sessions_with_amir: 'sessions', personal_bests: 'bests', comebacks: 'comebacks' },
    nextMark: s => `Next mark · ${s}`,
    // The month's honour. A card never names another athlete (2026-10-19): the place and the field size, nothing else.
    honourEye: m => `The crew · ${m}`,
    honourName: { sessions: 'Most sessions', improved: 'Most improved', full_month: 'Full month', pick: 'Amir’s Pick' },
    honourSub: { sessions: m => `With Amir in ${m}`, improved: m => `On a main lift in ${m}`, full_month: m => `Every training week of ${m}`, pick: m => `Chosen by Amir for ${m}` },
    ord: v => { const k = Number(v) % 100, s = ['th', 'st', 'nd', 'rd'][k > 10 && k < 14 ? 0 : Number(v) % 10] || 'th'; return v + s; },
    placeOf: (p, f) => `${p} of ${f}`,
    // The Monthly Open
    openEye: m => `The Open · ${m}`,
    yourResult: 'Your result',
    // The player card: their own card, any day
    playerEye: 'The card',
    playerNums: { weeks: 'weeks held', sessions: 'sessions with Amir', bests: 'personal bests', comebacks: 'comebacks' },
    playerLifts: 'Best lifts',
    playerSince: d => `With Amir since ${d}`,
    // A new level, the month's goal, a session
    levelUpEye: 'A new level',
    goalEye: m => `${m} · the goal`,
    goalDone: 'Done',
    goalFrom: 'From Amir',
    sessionEye: 'Session done',
    mins: n => `${n} min`,
    minsW: 'min',
    exercises: n => Number(n) === 1 ? 'exercise' : 'exercises',
    setsW: n => Number(n) === 1 ? 'set' : 'sets',
    // Copy caption (the share sheet)
    capBest: (lift, set) => `New best on the ${lift}: ${set}.`,
    capEffort: (lift, what) => `${lift}: ${what}.`,
    capRetest: (lift, what) => `${lift} retest, beaten: ${what}.`,
    capCycle: (name, done, planned) => `${name}, signed off: ${done} of ${planned} sessions.`,
    capRoad: (n, weeks) => `The whole roadmap: ${n} cycles${weeks ? ', ' + weeks + ' weeks' : ''}.`,
    capAchievement: name => `${name}.`,
    capLevel: n => `Level ${n}.`,
    capMark: (n, words) => `${n} ${words}.`,
    capHonour: (name, month) => `${name}, ${month}.`,
    capOpen: (title, result, place) => `${title}: ${result}${place ? ', ' + place : ''}.`,
    capPlayer: level => `Level ${level} with Amir.`,
    capGoal: month => `${month}'s goal, done.`,
    capSession: title => `${title}, done.`,
    capTail: 'Coached by @amirardekanian · amirardekani.com',
  };

  // ⚠️ FARSI: DRAFTS, EVERY ONE. Amir writes or approves every Farsi word before it ships (the design page, decision 2). The voice is
  // the Farsi site's: warm and colloquial ("همون"). A lift's name and a cycle's name stay in English, as they are in the app.
  // DECIDED (Amir, 2026-10-17: "Keep all three Farsi choices"): Iranian (Shamsi) dates on a Farsi card (۲۵ مهر ۱۴۰۵, not the design
  // page's Gregorian); the athlete's name in English letters (a programme holds no Farsi spelling of it); "Career Mode" in English on the
  // level card (levelEye). The words below are still drafts waiting for his read.
  const FA = {
    coach: 'امیر اردکانی · مربی',
    // The weight words (drafts for Amir to read, like every word here): پوند = lb and پلیت = a plate on a machine's stack (the number
    // before it says how many, so Farsi has one form for "plate" and "plates"; EN has two, "1 plate" and "6 plates").
    kg: 'کیلو', lb: 'پوند', plate: 'پلیت', plates: 'پلیت', reps: () => 'تکرار', sessions: 'جلسه', weeks: 'هفته', cycles: 'دوره', newBests: 'رکورد جدید',
    personalRecords: 'رکوردهای شخصی',
    cycleEye: (n, name) => `دورهٔ ${n} · ${name}`,
    cycleOf: (n, of) => `دورهٔ ${n} از ${of}`,
    testWeek: n => `دورهٔ ${n} · هفتهٔ تست`,
    week: n => `هفتهٔ ${n}`,
    bestHead: [['رکورد '], ['جدید', 1]],
    bestGainKg: (g, d) => [[g, 1], [` بیشتر از ${d}، با همون تعداد تکرار.`]],
    bestGainReps: (g, w, d) => [[g, 1], [` با ${w}، بیشتر از ${d}.`]],
    bestHiddenKg: d => [[`نسبت به ${d}، با همون تعداد تکرار.`]],
    bestHiddenReps: d => [[`نسبت به ${d}، با همون وزنه.`]],
    effortHead: {
      kg: [['همون فشار.'], ['وزنهٔ بیشتر.', 1, 1]], kgSameReps: [['همون تکرار.'], ['وزنهٔ بیشتر.', 1, 1]],
      reps: [['همون فشار.'], ['تکرار بیشتر.', 1, 1]], repsSameWeight: [['همون وزنه.'], ['تکرار بیشتر.', 1, 1]],
      kgEasier: [['وزنهٔ بیشتر.'], ['فشار کمتر.', 1, 1]], kgReps: [['وزنهٔ بیشتر.'], ['تکرار بیشتر.', 1, 1]],
      bwReps: [['همون فشار.'], ['تکرار بیشتر.', 1, 1]], bwRepsPlain: [['تکرار بیشتر.', 1]],
      pct: p => [[`حدود ${p}`], ['قوی‌تر.', 1, 1]],
    },
    effortLine: {
      kg: g => [[g, 1], [' بیشتر، با همون تعداد تکرار و همون فشار.']],
      kgSameReps: g => [[g, 1], [' بیشتر، با همون تعداد تکرار.']],
      reps: (g, w) => [[g, 1], [` بیشتر با ${w}، با همون فشار.`]],
      repsSameWeight: (g, w) => [[g, 1], [` بیشتر با ${w}.`]],
      kgEasier: g => [[g, 1], [' بیشتر با همون تکرار، و راحت‌تر هم بود.']],
      kgReps: (g, g2) => [[g, 1], [' بیشتر و '], [g2, 1], [' بیشتر.']],
      bwReps: g => [[g, 1], [' بیشتر، با همون فشار.']],
      bwRepsPlain: g => [[g, 1], [' بیشتر.']],
      pctHarder: p => [['سنگین‌تر و سخت‌تر: '], [`حدود ${p} قوی‌تر.`, 1]],
      pctFewer: p => [['سنگین‌تر با تکرار کمتر: '], [`حدود ${p} قوی‌تر.`, 1]],
      pctLess: p => [['تکرار بیشتر با وزنهٔ کمتر: '], [`حدود ${p} قوی‌تر.`, 1]],
      pctBw: p => [[`حدود ${p} قوی‌تر.`, 1]],
    },
    winShort: {
      kg: g => `${g} بیشتر، همون تکرار، همون فشار`, kgSameReps: g => `${g} بیشتر، همون تکرار`,
      reps: (g, w) => `${g} بیشتر با ${w}، همون فشار`, repsSameWeight: (g, w) => `${g} بیشتر با ${w}`,
      kgEasier: g => `${g} بیشتر، و راحت‌تر`, kgReps: (g, g2) => `${g} و ${g2} بیشتر`,
      bwReps: g => `${g} بیشتر، همون فشار`, bwRepsPlain: g => `${g} بیشتر`,
      pctHarder: p => `سنگین‌تر و سخت‌تر: حدود ${p} قوی‌تر`, pctFewer: p => `سنگین‌تر با تکرار کمتر: حدود ${p} قوی‌تر`,
      pctLess: p => `تکرار بیشتر با وزنهٔ کمتر: حدود ${p} قوی‌تر`, pctBw: p => `حدود ${p} قوی‌تر`,
    },
    rpe: r => `RPE ${r}`,
    retestHead: [['تست '], ['دوباره', 1]],
    beaten: 'شکسته شد',
    retestOneCycle: g => [[g, 1], [' بیشتر، توی یک دوره.']],
    retestSince: (g, d) => [[g, 1], [` بیشتر از ${d}.`]],
    retestDates: (d1, d2) => ` تست اول ${d1}، تست دوم ${d2}.`,
    retestBefore: (d1, d2) => ` بهترین قبل از این دوره ${d1}، تست دوباره ${d2}.`,
    signedOff: 'تأیید مربی',
    roadEye: 'کل نقشهٔ راه',
    roadHead: [['کل '], ['مسیر', 1]],
    roadLine: (d1, d2) => [[`شروع ${d1}. پایان ${d2}.`]],
    meaning: { consistency: 'ثبات', commitment: 'تعهد', progress: 'پیشرفت', resilience: 'تاب‌آوری', chosen: 'از طرف امیر' },
    achievementEye: m => `دستاورد · ${m}`,
    levelEye: 'Career Mode',
    levelHead: n => [['سطح '], [n, 1]],
    levelLine: () => [['سطح حرفه‌ای تو. هیچ‌وقت صفر نمی‌شه.']],
    // ── The 2026-10-19 pass, in Farsi. DRAFTS, every one: Amir reads them before they ship.
    mantra: 'یه مربی تو جیبت',
    markEye: 'یک نشانهٔ تازه',
    markWords: { weeks_held: 'هفته پشت سر هم', sessions_with_amir: 'جلسه با امیر', personal_bests: 'رکورد شخصی', comebacks: 'برگشت' },
    markLine: {
      weeks_held: n => [['هر جلسه، '], [`${n} هفتهٔ بی‌وقفه.`, 1], [' همین‌طور ساده نگهش دار.']],
      sessions_with_amir: n => [[`${n} جلسه پشت سر گذاشتی.`, 1], [' این‌طوری جمع می‌شه.']],
      personal_bests: n => [[`${n} رکورد شخصی.`, 1], [' داری قوی‌تر می‌شی.']],
      comebacks: n => [[`${n} بار برگشتی.`, 1], [' همین قسمتش مهمه.']],
    },
    markUnit: { weeks_held: 'هفته', sessions_with_amir: 'جلسه', personal_bests: 'رکورد', comebacks: 'برگشت' },
    nextMark: s => `نشانهٔ بعدی · ${s}`,
    honourEye: m => `جمع ما · ${m}`,
    honourName: { sessions: 'بیشترین جلسه', improved: 'بیشترین پیشرفت', full_month: 'ماه کامل', pick: 'انتخابِ امیر' },
    honourSub: { sessions: m => `با امیر، توی ${m}`, improved: m => `روی یک حرکت اصلی، توی ${m}`, full_month: m => `همهٔ هفته‌های تمرینیِ ${m}`, pick: m => `انتخابِ امیر برای ${m}` },
    ord: v => `رتبهٔ ${v}`,
    placeOf: (p, f) => `${p} از ${f}`,
    openEye: m => `اوپن · ${m}`,
    yourResult: 'نتیجهٔ تو',
    playerEye: 'کارت تو',
    playerNums: { weeks: 'هفته پشت سر هم', sessions: 'جلسه با امیر', bests: 'رکورد شخصی', comebacks: 'برگشت' },
    playerLifts: 'بهترین رکوردها',
    playerSince: d => `با امیر از ${d}`,
    levelUpEye: 'سطح جدید',
    goalEye: m => `${m} · هدف ماه`,
    goalDone: 'انجام شد',
    goalFrom: 'از طرف امیر',
    sessionEye: 'جلسه تمام شد',
    mins: n => `${n} دقیقه`,
    minsW: 'دقیقه',
    exercises: () => 'حرکت',
    setsW: () => 'ست',
    capBest: (lift, set) => `رکورد جدید توی ${lift}: ${set}.`,
    capEffort: (lift, what) => `${lift}: ${what}.`,
    capRetest: (lift, what) => `تست دوبارهٔ ${lift}، شکسته شد: ${what}.`,
    capCycle: (name, done, planned) => `${name} تمام شد: ${done} از ${planned} جلسه.`,
    capRoad: (n, weeks) => `کل نقشهٔ راه: ${n} دوره${weeks ? '، ' + weeks + ' هفته' : ''}.`,
    capAchievement: name => `${name}.`,
    capLevel: n => `سطح ${n}.`,
    capMark: (n, words) => `${n} ${words}.`,
    capHonour: (name, month) => `${name}، ${month}.`,
    capOpen: (title, result, place) => `${title}: ${result}${place ? '، ' + place : ''}.`,
    capPlayer: level => `سطح ${level} با امیر.`,
    capGoal: month => `هدفِ ${month} انجام شد.`,
    capSession: title => `${title} تمام شد.`,
    capTail: 'مربی: @amirardekanian · amirardekani.com',
    months: ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'],
  };
  EN.months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // ── 3. Numbers and dates, in the card's language ──────────────────────────────────────────────────────────────────────
  const FA_DIG = '۰۱۲۳۴۵۶۷۸۹';
  function faDigits(s) {
    return String(s).replace(/(\d)\.(\d)/g, '$1٫$2').replace(/%/g, '٪').replace(/[0-9]/g, d => FA_DIG[+d]);
  }
  function L(lang) { return lang === 'fa' ? FA : EN; }
  function n(v, lang) { return lang === 'fa' ? faDigits(v) : String(v); }
  // A weight as the app writes it: to the half unit (kilo, pound or plate), no ".0". It is the number the athlete typed, not a conversion.
  function kgNum(v) { return String(Math.round(Number(v) * 2) / 2).replace(/\.0$/, ''); }
  // The measure a weight was logged in (program.html's uKey()): 'kg', 'lb' or 'plates' (the count on a machine's weight stack).
  // Absent or anything else is 'kg', so every spec made before the measures existed draws as it always did.
  function uOf(u) { return u === 'lb' || u === 'plates' ? u : 'kg'; }
  // The word after a weight in that measure: kg · lb · "plate" for exactly 1, else "plates"; Farsi کیلو · پوند · پلیت.
  function unitW(u, v, lang) {
    const k = uOf(u), t = L(lang);
    return k === 'plates' ? (Number(kgNum(v)) === 1 ? t.plate : t.plates) : t[k];
  }
  // The names say "kg" for history's sake: with the optional unit `u` (default kg) they write any of the three measures.
  function kgs(v, lang, u) { return n(kgNum(v), lang) + ' ' + unitW(u, v, lang); }              // "92.5 kg" · "6 plates" · "۹۲٫۵ کیلو"
  function plusKg(v, lang, u) { return lang === 'fa' ? kgs(v, lang, u) : '+' + kgNum(v) + ' ' + unitW(u, v, lang); }   // "+7.5 kg" · "+1 plate"
  function plusReps(v, lang) { return lang === 'fa' ? n(v, lang) + ' ' + FA.reps(v) : '+' + v + ' ' + EN.reps(v); }
  function pctStr(p, lang) { return lang === 'fa' ? '٪' + n(p, lang) : p + '%'; }
  // Gregorian to Shamsi (the jalaali algorithm; checked day by day against Intl's Persian calendar, 2024 to 2029).
  function toJalali(gy, gm, gd) {
    const g = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    const gy2 = gm > 2 ? gy + 1 : gy;
    let days = 355666 + 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + g[gm - 1];
    let jy = -1595 + 33 * Math.floor(days / 12053); days %= 12053;
    jy += 4 * Math.floor(days / 1461); days %= 1461;
    if (days > 365) { jy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
    const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
    const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
    return [jy, jm, jd];
  }
  // A calendar day ('2026-10-17'), never a clock instant: read as its numbers, so it is the same day in every time zone.
  function ymd(iso) {
    const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? [+m[1], +m[2], +m[3]] : null;
  }
  function dateShort(iso, lang) {   // "12 Sep" · "۲۱ شهریور"
    const p = ymd(iso); if (!p) return '';
    if (lang !== 'fa') return p[2] + ' ' + EN.months[p[1] - 1];
    const j = toJalali(p[0], p[1], p[2]);
    return n(j[2], 'fa') + ' ' + FA.months[j[1] - 1];
  }
  function dateLong(iso, lang) {    // "17 Oct 2026" · "۲۵ مهر ۱۴۰۵"
    const p = ymd(iso); if (!p) return '';
    if (lang !== 'fa') return p[2] + ' ' + EN.months[p[1] - 1] + ' ' + p[0];
    const j = toJalali(p[0], p[1], p[2]);
    return n(j[2], 'fa') + ' ' + FA.months[j[1] - 1] + ' ' + n(j[0], 'fa');
  }
  const isFaText = s => /[\u0600-\u06FF]/.test(String(s || ''));
  // A Latin name inside a Farsi line ("Darya · ۲۵ مهر ۱۴۰۵"): a right-to-left mark after it, or the bidi rules glue the Persian
  // number that follows onto the Latin word and the line reads "۲۵ · Darya مهر".
  const bidi = (s, lang) => lang === 'fa' && s && !isFaText(s) ? s + '\u200F' : s;

  // ── 4. Fonts and pictures ─────────────────────────────────────────────────────────────────────────────────────────────
  // The app's own font stylesheet: program.html loads it already; anywhere else (the headless test page) it is added once.
  function ensureFontCss() {
    if (typeof document === 'undefined' || document.querySelector('link[href*="app-fonts.css"]')) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = ASSET.fonts;
    document.head.appendChild(l);
  }
  let _vazir = null;
  function ensureVazir() {
    if (_vazir) return _vazir;
    let has = false;
    try { document.fonts.forEach(f => { if (/vazirmatn/i.test(f.family)) has = true; }); } catch (e) {}
    if (has) { _vazir = document.fonts.load('400 40px Vazirmatn', 'سلام').catch(() => null); return _vazir; }
    try {
      const face = new FontFace('Vazirmatn', 'url(' + ASSET.vazir + ') format("woff2")', { weight: '100 900', style: 'normal' });
      document.fonts.add(face);
      _vazir = face.load().catch(() => null);
    } catch (e) { _vazir = Promise.resolve(null); }
    return _vazir;
  }
  const _wait = (p, ms) => Promise.race([p, new Promise(r => setTimeout(r, ms))]);
  async function fonts(lang) {
    if (typeof document === 'undefined' || !document.fonts) return;
    ensureFontCss();
    // Every Latin face the style table uses (a weight never loaded draws in the fallback: Barlow 500 did, until this list was read
    // off the table instead of typed).
    const want = {};
    Object.keys(ST.en).forEach(k => { const s = ST.en[k]; want[s.w + ' 40px ' + (FACE[s.fam] || 'Barlow')] = 1; });
    // A face that cannot load (no signal, not cached yet) draws in the fallback: a card in Arial beats no card.
    const jobs = Object.keys(want).map(f => document.fonts.load(f, 'AB12').catch(() => null));
    if (lang === 'fa') jobs.push(ensureVazir());
    await _wait(Promise.all(jobs), 6000);
    try { await _wait(document.fonts.ready, 3000); } catch (e) {}
  }
  const _imgs = {};
  function img(url) {
    if (!url) return Promise.resolve(null);
    if (!_imgs[url]) _imgs[url] = new Promise(res => {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => res(im);
      im.onerror = () => { delete _imgs[url]; res(null); };   // a missing picture leaves the green; it is tried again next time
      im.src = url;
    });
    return _imgs[url];
  }

  // ── 5. Drawing parts ──────────────────────────────────────────────────────────────────────────────────────────────────
  // The cover's green: radial-gradient(125% 90% at 100% 0%, #1B7254, #0E4A36 46%, #082D20), an ellipse drawn by scaling a circle.
  function ground(x, S) {
    x.fillStyle = C.deep; x.fillRect(0, 0, S.W, S.H);
    const rx = 1.25 * S.W, ry = 0.9 * S.H;
    x.save();
    x.translate(S.W, 0); x.scale(1, ry / rx);
    const g = x.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, C.light); g.addColorStop(0.46, C.mid); g.addColorStop(1, C.deep);
    x.fillStyle = g; x.fillRect(-S.W, 0, S.W * 2, S.H * rx / ry);
    x.restore();
  }
  // The athlete's own photo as the card's ground (Amir, 2026-10-19: "any idea can be sent with their photo as a background
  // like strava's photos"). It fills the card, is darkened and pulled towards the green so the brand still holds, and a veil
  // carries the words at the bottom. The picture is drawn on the phone and never leaves it until Share or Save image.
  function shot(x, S, im, fit) {
    const f = fit || { z: 1, dx: 0, dy: 0 };
    const s = Math.max(S.W / im.width, S.H / im.height) * f.z, dw = im.width * s, dh = im.height * s;
    const slackX = Math.max(0, dw - S.W) / 2, slackY = Math.max(0, dh - S.H) / 2;
    x.save();
    x.drawImage(im, (S.W - dw) / 2 + f.dx * slackX, (S.H - dh) / 2 + f.dy * slackY, dw, dh);
    x.globalCompositeOperation = 'multiply';            // the house grade: darker, green-leaning shadows
    x.fillStyle = 'rgba(16,70,54,0.42)'; x.fillRect(0, 0, S.W, S.H);
    x.restore();
    const g = x.createLinearGradient(0, 0, 0, S.H);
    g.addColorStop(0, 'rgba(4,16,11,0.62)'); g.addColorStop(0.28, 'rgba(4,16,11,0.12)');
    g.addColorStop(0.56, 'rgba(4,16,11,0.52)'); g.addColorStop(0.80, 'rgba(4,16,11,0.93)'); g.addColorStop(1, '#04100B');
    x.fillStyle = g; x.fillRect(0, 0, S.W, S.H);
  }
  // The court: a tennis half court seen from above, faint, behind everything (the design page's motif, every card).
  function court(x, S) {
    const top = S.H === 1920 ? 384 : 160, bot = S.H === 1920 ? 1856 : 1280, mid = S.H === 1920 ? 1120 : 720;
    x.save();
    x.strokeStyle = C.court; x.lineWidth = 4.8; x.lineCap = 'square';
    x.strokeRect(96, top, 888, bot - top);
    x.beginPath();
    x.moveTo(184, top); x.lineTo(184, bot); x.moveTo(896, top); x.lineTo(896, bot);
    x.moveTo(184, mid); x.lineTo(896, mid); x.moveTo(540, mid); x.lineTo(540, bot);
    x.moveTo(540, top); x.lineTo(540, top + 28);   // the centre mark on the baseline
    x.stroke();
    x.restore();
  }
  // A cycle's cover (the cycle cards): graded into the green as the app's This cycle cover is (luminosity, masked from the left), with a
  // scrim down to the card's green, so the words that sit over it stay readable. The covers are objects, never a person.
  function cover(x, S, im, h) {
    if (!im) return;
    const W = S.W, H = h || S.cover;
    const o = document.createElement('canvas'); o.width = W; o.height = H;
    const y = o.getContext('2d');
    const s = Math.max(W / im.width, H / im.height), dw = im.width * s, dh = im.height * s;
    y.drawImage(im, (W - dw) * 0.6, (H - dh) * 0.4, dw, dh);
    y.globalCompositeOperation = 'destination-in';
    const m = y.createLinearGradient(0, 0, W, 0);
    m.addColorStop(0, 'rgba(0,0,0,0.25)'); m.addColorStop(0.45, 'rgba(0,0,0,0.75)'); m.addColorStop(1, 'rgba(0,0,0,1)');
    y.fillStyle = m; y.fillRect(0, 0, W, H);
    x.save();
    x.globalAlpha = 0.82;
    x.globalCompositeOperation = 'luminosity';
    x.drawImage(o, 0, 0);
    x.restore();
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(6,36,26,0.20)'); g.addColorStop(0.55, 'rgba(6,36,26,0.56)'); g.addColorStop(1, C.foot);
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    const fade = x.createLinearGradient(0, H - 2, 0, H + 160);   // the cover's last row melts into the card's green
    fade.addColorStop(0, 'rgba(12,63,46,1)'); fade.addColorStop(1, 'rgba(12,63,46,0)');
    x.fillStyle = fade; x.fillRect(0, H - 2, W, 162);
  }
  function roundRect(x, l, t, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    x.beginPath();
    x.moveTo(l + r, t); x.lineTo(l + w - r, t); x.arcTo(l + w, t, l + w, t + r, r);
    x.lineTo(l + w, t + h - r); x.arcTo(l + w, t + h, l + w - r, t + h, r);
    x.lineTo(l + r, t + h); x.arcTo(l, t + h, l, t + h - r, r);
    x.lineTo(l, t + r); x.arcTo(l, t, l + r, t, r);
    x.closePath();
  }
  // Amir's photo in a circle (his face is the upper middle of coach.jpg); his initials on the green when it cannot load.
  function photo(x, cx, cy, d, im) {
    x.save();
    x.beginPath(); x.arc(cx, cy, d / 2, 0, Math.PI * 2); x.closePath();
    if (im) {
      x.clip();
      const s = Math.min(im.width, im.height) * 0.66, sx = (im.width - s) / 2, sy = im.height * 0.07;
      x.drawImage(im, sx, sy, s, s, cx - d / 2, cy - d / 2, d, d);
    } else {
      x.fillStyle = C.ink; x.fill();
      x.fillStyle = C.mid; x.font = '800 ' + Math.round(d * 0.4) + 'px ' + FAM.disp;
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('AA', cx, cy + 1);
    }
    x.restore();
    x.save(); x.strokeStyle = 'rgba(255,255,255,0.28)'; x.lineWidth = 3;
    x.beginPath(); x.arc(cx, cy, d / 2, 0, Math.PI * 2); x.stroke(); x.restore();
  }
  // His signature, the week note's paths, w px wide.
  function signature(x, l, t, w, color) {
    const s = w / SIG.vw;
    x.save();
    x.translate(l, t); x.scale(s, s);
    x.transform(1, 0, Math.tan(-12 * Math.PI / 180), 1, 0, 0);
    x.translate(8, 0);
    x.strokeStyle = color || C.ink; x.lineCap = 'round'; x.lineJoin = 'round';
    x.lineWidth = SIG.w1; x.stroke(new Path2D(SIG.d1));
    x.lineWidth = SIG.w2; x.stroke(new Path2D(SIG.d2));
    x.restore();
  }
  function logo(x, l, t, d, im) {
    x.save();
    roundRect(x, l, t, d, d, d * 0.24); x.fillStyle = '#FAF7F2'; x.fill();
    if (im) { x.clip(); x.drawImage(im, l, t, d, d); }
    x.restore();
  }
  // Drawn marks (the font files carry Latin only): a tick, an arrow, a star.
  function tick(x, cx, cy, s, color, wgt) {
    x.save(); x.strokeStyle = color; x.lineWidth = wgt || s * 0.16; x.lineCap = 'round'; x.lineJoin = 'round';
    x.beginPath(); x.moveTo(cx - s * 0.36, cy + s * 0.02); x.lineTo(cx - s * 0.1, cy + s * 0.28); x.lineTo(cx + s * 0.38, cy - s * 0.26);
    x.stroke(); x.restore();
  }
  function arrow(x, l, cy, w, color, left) {
    const h = w * 0.42, sw = Math.max(6, w * 0.13);
    x.save(); x.strokeStyle = color; x.lineWidth = sw; x.lineCap = 'round'; x.lineJoin = 'round';
    x.beginPath();
    if (left) { x.moveTo(l + w, cy); x.lineTo(l + sw, cy); x.moveTo(l + h, cy - h); x.lineTo(l + sw * 0.6, cy); x.lineTo(l + h, cy + h); }
    else { x.moveTo(l, cy); x.lineTo(l + w - sw, cy); x.moveTo(l + w - h, cy - h); x.lineTo(l + w - sw * 0.6, cy); x.lineTo(l + w - h, cy + h); }
    x.stroke(); x.restore();
  }

  // ── 6. Text: one style table, measured, fitted and recorded ───────────────────────────────────────────────────────────
  // Every word on a card goes through put(), which records its box: the headless test reads the records (canvas._boxes) and fails
  // on a text wider than the room it was given. A text that does not fit shrinks (to 62 % of its size at the least), then wraps where
  // it may, and only then is cut with "…" (recorded as cut).
  // Sizes are the design page's quarter-size card × 4 (eye 9.5 px → 38).
  const ST = {
    en: {
      // Space Mono is the app's own eyebrow and caption face (assets/css/app-fonts.css ships it), so the card's small
      // capitals read like a screen of the app.
      eye:   { fam: 'mono', w: 700, size: 34, lh: 1.3, track: 0.14, upper: 1, color: C.mute },
      who:   { fam: 'mono', w: 400, size: 30, lh: 1.3, track: 0.10, upper: 1, color: C.dim },
      mant:  { fam: 'mono', w: 400, size: 28, lh: 1.35, track: 0.12, upper: 1, color: C.mute },
      next:  { fam: 'mono', w: 400, size: 32, lh: 1.3, track: 0.13, upper: 1, color: C.mute },
      lab:   { fam: 'disp', w: 800, size: 54, lh: 1.15, track: 0.15, upper: 1, color: C.clay },
      tag:   { fam: 'disp', w: 800, size: 46, lh: 1.15, track: 0.12, upper: 1, color: C.ink },
      big:   { fam: 'disp', w: 800, size: 184, lh: 0.9, track: 0.01, upper: 1, color: C.ink },
      lift:  { fam: 'disp', w: 700, size: 60, lh: 1.1, track: 0.06, upper: 1, color: C.soft },
      num:   { fam: 'disp', w: 800, size: 216, lh: 0.95, track: 0.005, color: C.ink },
      small: { fam: 'disp', w: 700, size: 104, lh: 0.95, track: 0.01, color: C.soft },
      line:  { fam: 'body', w: 400, size: 50, lh: 1.34, color: C.soft },
      lineB: { fam: 'body', w: 700, size: 50, lh: 1.34, color: C.clay },
      sig:   { fam: 'body', w: 400, size: 42, lh: 1.3, color: C.soft },
      foot:  { fam: 'disp', w: 700, size: 36, lh: 1.2, track: 0.16, upper: 1, color: C.mute },
      stamp: { fam: 'disp', w: 800, size: 52, lh: 1, track: 0.14, upper: 1, color: C.clay },
      label: { fam: 'disp', w: 700, size: 42, lh: 1.2, track: 0.06, upper: 1, color: C.ink },
      row:   { fam: 'body', w: 500, size: 42, lh: 1.25, color: C.soft },
      stat:  { fam: 'disp', w: 800, size: 84, lh: 1, color: C.ink },
      statL: { fam: 'body', w: 500, size: 38, lh: 1.2, color: C.soft },
      winN:  { fam: 'body', w: 600, size: 44, lh: 1.3, color: C.ink },
      winT:  { fam: 'body', w: 500, size: 44, lh: 1.3, color: C.clay },
      quote: { fam: 'body', w: 600, size: 78, lh: 1.26, color: C.ink },
      road:  { fam: 'body', w: 500, size: 46, lh: 1.25, color: C.soft },
      roadN: { fam: 'disp', w: 800, size: 60, lh: 1, color: C.clay },
      plate: { fam: 'disp', w: 800, size: 120, lh: 1, track: 0.04, upper: 1, color: C.ink },
      metal: { fam: 'disp', w: 700, size: 46, lh: 1.2, track: 0.12, upper: 1, color: C.ink },
      step:  { fam: 'body', w: 500, size: 44, lh: 1.3, color: C.soft },
    },
    // Farsi: Vazirmatn, no capitals and no letter-spacing (the site's rule), a taller line for the script.
    fa: {
      eye:   { fam: 'fa', w: 600, size: 38, lh: 1.5, color: C.mute },
      who:   { fam: 'fa', w: 500, size: 34, lh: 1.5, color: C.dim },
      mant:  { fam: 'fa', w: 500, size: 32, lh: 1.5, color: C.mute },
      next:  { fam: 'fa', w: 500, size: 34, lh: 1.5, color: C.mute },
      lab:   { fam: 'fa', w: 800, size: 50, lh: 1.35, color: C.clay },
      tag:   { fam: 'fa', w: 800, size: 44, lh: 1.35, color: C.ink },
      big:   { fam: 'fa', w: 800, size: 160, lh: 1.15, color: C.ink },
      num:   { fam: 'fa', w: 800, size: 184, lh: 1.1, color: C.ink },
      small: { fam: 'fa', w: 700, size: 88, lh: 1.1, color: C.soft },
      line:  { fam: 'fa', w: 400, size: 50, lh: 1.58, color: C.soft },
      lineB: { fam: 'fa', w: 700, size: 50, lh: 1.58, color: C.clay },
      sig:   { fam: 'fa', w: 500, size: 42, lh: 1.5, color: C.soft },
      stamp: { fam: 'fa', w: 800, size: 50, lh: 1.2, color: C.clay },
      label: { fam: 'fa', w: 700, size: 42, lh: 1.4, color: C.ink },
      row:   { fam: 'fa', w: 500, size: 42, lh: 1.45, color: C.soft },
      stat:  { fam: 'fa', w: 800, size: 76, lh: 1.15, color: C.ink },
      statL: { fam: 'fa', w: 500, size: 38, lh: 1.45, color: C.soft },
      winT:  { fam: 'fa', w: 500, size: 44, lh: 1.55, color: C.clay },
      quote: { fam: 'fa', w: 600, size: 72, lh: 1.5, color: C.ink },
      road:  { fam: 'fa', w: 500, size: 46, lh: 1.45, color: C.soft },
      roadN: { fam: 'fa', w: 800, size: 56, lh: 1.2, color: C.clay },
      plate: { fam: 'fa', w: 800, size: 110, lh: 1.25, color: C.ink },
      metal: { fam: 'fa', w: 700, size: 44, lh: 1.4, color: C.ink },
      step:  { fam: 'fa', w: 500, size: 44, lh: 1.55, color: C.soft },
    },
  };
  // A Latin text on a Farsi card (a lift's name, a cycle's name, the handle) keeps the English style.
  function styleOf(lang, role, text) {
    const en = ST.en[role], fa = ST.fa[role];
    if (lang !== 'fa' || !fa) return en;
    return isFaText(text) || /^[\s\d۰-۹٫٪+×·.,:()-]*$/.test(String(text)) ? fa : en;
  }
  function fontStr(st, size) { return `${st.w} ${Math.round(size * 10) / 10}px ${FAM[st.fam]}`; }
  function caseOf(st, t) { return st.upper ? String(t).toUpperCase() : String(t); }
  // Width of a text in a style at a size, letter-spacing included (spacing between letters: CSS adds it after each, so the last is
  // trailing and not counted).
  function textW(x, st, size, t) {
    t = caseOf(st, t);
    x.font = fontStr(st, size);
    const sp = (st.track || 0) * size;
    if (!sp) return x.measureText(t).width;
    let w = 0; const ch = Array.from(t);
    ch.forEach(c => { w += x.measureText(c).width; });
    return w + sp * Math.max(0, ch.length - 1);
  }
  // Ascent and descent of a style at a size (the face's own box, else a fair guess).
  function metrics(x, st, size) {
    x.font = fontStr(st, size);
    const m = x.measureText('Hgآ');
    const a = m.fontBoundingBoxAscent, d = m.fontBoundingBoxDescent;
    return (a > 0 && d >= 0) ? { a, d } : { a: size * 0.92, d: size * 0.24 };
  }
  // Draws one run at (l, baseline). rtl: drawn right to left in one piece (Farsi must never be drawn letter by letter: it joins).
  function drawRun(x, st, size, t, l, base, color, rtl) {
    t = caseOf(st, t);
    x.font = fontStr(st, size);
    x.fillStyle = color || st.color;
    x.textBaseline = 'alphabetic';
    const sp = (st.track || 0) * size;
    if (!sp || rtl) {
      x.direction = rtl ? 'rtl' : 'ltr';
      x.textAlign = rtl ? 'right' : 'left';
      x.fillText(t, rtl ? l + textW(x, st, size, t) : l, base);
      x.direction = 'ltr';
      return;
    }
    x.textAlign = 'left'; x.direction = 'ltr';
    let cx = l;
    Array.from(t).forEach(c => { x.fillText(c, cx, base); cx += x.measureText(c).width + sp; });
  }

  // The painter for one card: the canvas, its size, its language, the record of every box, and the flow.
  function Painter(x, S, lang, imgs, opts) {
    this.x = x; this.S = S; this.lang = lang; this.rtl = lang === 'fa'; this.imgs = imgs; this.opts = opts;
    this.t = L(lang);
    this.X0 = S.pad; this.X1 = S.W - S.pad; this.MW = this.X1 - this.X0;
    this.boxes = []; this.items = []; this.fit = { k: 1, dropped: [] };
  }
  const P = Painter.prototype;
  P.st = function (role, text) { return styleOf(this.lang, role, text); };
  P.rec = function (role, text, l, t, w, h, maxW, size, cut) {
    this.boxes.push({ role, text: String(text), x: Math.round(l), y: Math.round(t), w: Math.round(w * 10) / 10, h: Math.round(h),
      maxW: Math.round(maxW * 10) / 10, size: Math.round(size * 10) / 10, cut: !!cut });
  };
  // One line of one style, fitted to maxW: the size it ends at and the text (cut with "…" only past the floor).
  P.fitLine = function (st, t, size, maxW, floor) {
    const x = this.x;
    let w = textW(x, st, size, t);
    if (w <= maxW) return { size, t, w, cut: false };
    const min = size * (floor || 0.62);
    let s2 = Math.max(min, Math.floor(size * maxW / w * 10) / 10);
    w = textW(x, st, s2, t);
    while (w > maxW && s2 > min) { s2 = Math.max(min, s2 - 1); w = textW(x, st, s2, t); }
    if (w <= maxW) return { size: s2, t, w, cut: false };
    let cut = Array.from(String(t));
    while (cut.length > 1 && textW(x, st, s2, cut.join('') + '…') > maxW) cut.pop();
    const tt = cut.join('').trimEnd() + '…';
    return { size: s2, t: tt, w: textW(x, st, s2, tt), cut: true };
  };
  // Draws one fitted line at the top `top` (a CSS line box of lh × size), aligned to the card's start edge (or `align`).
  P.line1 = function (role, t, top, k, o) {
    o = o || {};
    const st = o.st || this.st(role, t), size = (o.size || st.size) * k, maxW = o.maxW || this.MW;
    const f = this.fitLine(st, t, size, maxW, o.floor);
    const lh = st.lh * f.size, m = metrics(this.x, st, f.size);
    const base = top + (st.lh * size) / 2 + (m.a - m.d) / 2;
    const rtl = o.rtl != null ? o.rtl : (this.rtl && isFaText(t));
    const end = o.align === 'end' ? !this.rtl : o.align === 'center' ? null : this.rtl;
    let l = o.l != null ? o.l : (end === null ? this.X0 + (this.MW - f.w) / 2 : end ? this.X1 - f.w : this.X0);
    if (o.l == null && o.x0 != null) l = end ? o.x0 + maxW - f.w : o.x0;
    drawRun(this.x, st, f.size, f.t, l, base, o.color, rtl);
    this.rec(role, f.t, l, top, f.w, st.lh * size, maxW, f.size, f.cut);
    return { h: st.lh * size, w: f.w, l, size: f.size, base };
  };
  P.lineH = function (role, t, k) { const st = this.st(role, t); return st.lh * st.size * k; };

  // Rich text: runs of [text, bold?] wrapped over up to `max` lines, each word in its run's style. On a Farsi card the words go right to
  // left, and a run of Latin words (a lift's name) stays one piece so it reads left to right.
  P.tokens = function (runs, roleA, roleB) {
    const out = [];
    runs.forEach(r => {
      const text = String(r[0]), bold = !!r[1], role = bold ? roleB : roleA;
      const parts = text.split(/(\s+)/).filter(s => s.length);
      let buf = null;
      parts.forEach(p => {
        if (/^\s+$/.test(p)) { if (buf) buf.sp = true; return; }
        const latin = this.rtl && !isFaText(p) && /[A-Za-z]/.test(p);
        if (latin && buf && buf.latin && !buf.sp2) { buf.t += ' ' + p; return; }
        buf = { t: p, role, latin, sp: false };
        out.push(buf);
      });
      if (buf) buf.sp2 = false;
    });
    // spaces: a token followed by whitespace in its own run, or the next run starting with whitespace
    return out;
  };
  P.layoutRich = function (runs, roleA, roleB, size0, maxW, maxLines) {
    const x = this.x, toks = this.tokens(runs, roleA, roleB);
    let size = size0;
    const floor = size0 * 0.62;
    for (;;) {
      const lines = [[]]; let w = 0;
      toks.forEach(tk => {
        const st = this.st(tk.role, tk.t), sz = size * st.size / this.st(roleA, 'a').size, tw = textW(x, st, sz, tk.t);
        // The space between two words, with the letter-spacing on both sides of it: a tracked line (a lift's name) is drawn as ONE
        // string, letter by letter, so each gap is that wide on the card (the headless test caught a long lift 14 px past the edge).
        const gap = lines[lines.length - 1].length ? textW(x, st, sz, ' ') + 2 * (st.track || 0) * sz : 0;
        if (lines[lines.length - 1].length && w + gap + tw > maxW) { lines.push([]); w = 0; }
        const cur = lines[lines.length - 1];
        cur.push({ tk, w: tw, gap: cur.length ? gap : 0 });
        w += (cur.length > 1 ? gap : 0) + tw;
      });
      const widest = Math.max(...lines.map(l => l.reduce((s, it) => s + it.gap + it.w, 0)));
      if ((lines.length <= maxLines && widest <= maxW) || size <= floor) return { lines, size, widest };
      size = Math.max(floor, size - Math.max(1, size * 0.04));
    }
  };
  P.rich = function (runs, top, k, o) {
    o = o || {};
    const roleA = o.roleA || 'line', roleB = o.roleB || 'lineB';
    const stA = this.st(roleA, 'آ' && runs.map(r => r[0]).join(' '));
    const size0 = stA.size * k, maxW = o.maxW || this.MW, maxLines = o.max || 3;
    const L1 = this.layoutRich(runs, roleA, roleB, size0, maxW, maxLines);
    const lh = stA.lh * L1.size, x = this.x;
    let y = top;
    // Only the lines that were measured are drawn, and the last of them ends on "…": richH() reports maxLines, so a longer
    // text used to be drawn past the box and over whatever came next (found by the headless test on a long month's goal).
    const rows = L1.lines.slice(0, maxLines), over = L1.lines.length > maxLines;
    if (over) {
      const wOf = arr => arr.reduce((s, it) => s + it.gap + it.w, 0);
      const dot = arr => {
        const c = arr.slice(), it = c[c.length - 1], st2 = this.st(it.tk.role, it.tk.t), sz2 = L1.size * st2.size / stA.size;
        const t2 = it.tk.t + '…';
        c[c.length - 1] = { tk: { t: t2, role: it.tk.role, latin: it.tk.latin }, w: textW(x, st2, sz2, t2), gap: it.gap };
        return c;
      };
      const last = rows[maxLines - 1].slice();
      let line = dot(last);
      while (wOf(line) > maxW && last.length > 1) { last.pop(); line = dot(last); }
      rows[maxLines - 1] = line;
    }
    rows.forEach((ln, li) => {
      const m = metrics(x, stA, L1.size);
      const base = y + lh / 2 + (m.a - m.d) / 2;
      const lw = ln.reduce((s, it) => s + it.gap + it.w, 0);
      const cut = over && li === rows.length - 1;
      if (this.rtl) {
        let r = (o.x1 != null ? o.x1 : this.X1);
        ln.forEach(it => {
          r -= it.gap;
          const st = this.st(it.tk.role, it.tk.t), sz = L1.size * st.size / stA.size;
          drawRun(x, st, sz, it.tk.t, r - it.w, base, null, isFaText(it.tk.t));
          r -= it.w;
        });
        this.rec(roleA, ln.map(it => it.tk.t).join(' '), (o.x1 != null ? o.x1 : this.X1) - lw, y, lw, lh, maxW, L1.size, cut);
      } else {
        let l = o.x0 != null ? o.x0 : this.X0;
        const l0 = l;
        ln.forEach(it => {
          l += it.gap;
          const st = this.st(it.tk.role, it.tk.t), sz = L1.size * st.size / stA.size;
          drawRun(x, st, sz, it.tk.t, l, base, null, false);
          l += it.w;
        });
        this.rec(roleA, ln.map(it => it.tk.t).join(' '), l0, y, lw, lh, maxW, L1.size, cut);
      }
      y += lh;
    });
    return { h: Math.min(L1.lines.length, maxLines) * lh };
  };
  P.richH = function (runs, k, o) {
    o = o || {};
    const roleA = o.roleA || 'line', roleB = o.roleB || 'lineB';
    const stA = this.st(roleA, runs.map(r => r[0]).join(' '));
    const L1 = this.layoutRich(runs, roleA, roleB, stA.size * k, o.maxW || this.MW, o.max || 3);
    return Math.min(L1.lines.length, o.max || 3) * stA.lh * L1.size;
  };

  // ── 7. The flow: the card's words from the top, the signature block at the bottom, shrunk together until they fit ──────
  // add({ name, gap, h(k), draw(y, k), drop }) — drop: the order an item is left out in when even 62 % does not fit (1 goes first).
  P.add = function (it) { it.gap = it.gap || 0; this.items.push(it); return this; };
  P.flow = function (top, bottom) {
    let items = this.items.slice(), k = 1;
    const H = (kk, its) => its.reduce((s, it, i) => s + (i ? it.gap * kk : 0) + it.h(kk), 0);
    for (;;) {
      for (k = 1; k > 0.6; k = Math.round((k - 0.02) * 100) / 100) if (H(k, items) <= bottom - top) break;
      if (H(k, items) <= bottom - top || !items.some(it => it.drop)) break;
      let wi = -1;
      items.forEach((it, i) => { if (it.drop && (wi < 0 || it.drop < items[wi].drop)) wi = i; });
      this.fit.dropped.push(items[wi].name);
      items = items.filter((_, i) => i !== wi);
    }
    this.fit.k = k;
    this.fit.over = Math.max(0, Math.round(H(k, items) - (bottom - top)));
    // The card's words sit on the foot, not under the eyebrow: a short card leaves its air at the top, where the picture is.
    let y = Math.max(top, bottom - H(k, items));
    items.forEach((it, i) => { if (i) y += it.gap * k; it.draw(y, k); y += it.h(k); });
    this.fit.end = Math.round(y);
    return y;
  };

  // The parts every card is made of (the design page's classes: .eye, .big, .bar, .lift, .num, .line, .stamp, .stats …).
  // The eyebrow is no longer a flow item: it is drawn on the top strip, beside the athlete's name and the date.
  P.eye = function (t) { this.eyebrow = t == null ? '' : String(t); return this; };
  // One line in clay, in capitals: what the card is (NEW BEST, WEEKS HELD IN A ROW, MOST SESSIONS).
  P.lab = function (t, gap) {
    return this.add({ name: 'lab', gap: gap || 0, h: k => this.lineH('lab', t, k), draw: (y, k) => this.line1('lab', t, y, k) });
  };
  // The outlined numeral, the day screen's P24: the card's one huge number where the number is a count, not a weight.
  P.ghost = function (t, gap, o) {
    o = o || {};
    const x = this.x, st = Object.assign({}, this.st('num', t), { size: o.size || 400 });
    return this.add({ name: 'ghost', gap: gap || 0, h: k => st.lh * st.size * k, draw: (y, k) => {
      const f = this.fitLine(st, t, st.size * k, this.MW), lh = st.lh * st.size * k, m = metrics(x, st, f.size);
      const base = y + lh / 2 + (m.a - m.d) / 2, l = this.rtl ? this.X1 - f.w : this.X0;
      x.save();
      x.font = fontStr(st, f.size); x.textBaseline = 'alphabetic'; x.textAlign = 'left'; x.direction = 'ltr';
      x.lineWidth = Math.max(7, f.size * 0.028); x.lineJoin = 'round'; x.strokeStyle = C.ink;
      x.strokeText(f.t, l, base);
      x.restore();
      this.rec('num', f.t, l, y, f.w, lh, this.MW, f.size, f.cut);
    } });
  };
  // A word in a solid clay box, white on it (the atlas: a solid clay block always takes #fff, on --accent-2-fill).
  P.tag = function (t, gap) {
    const st = this.st('tag', t);
    const dims = k => { const f = this.fitLine(st, t, st.size * k, this.MW - 60 * k); return { f, w: f.w + 48 * k, h: st.size * k * st.lh + 28 * k }; };
    return this.add({ name: 'tag', gap: gap || 0, h: k => dims(k).h, draw: (y, k) => {
      const d = dims(k), x = this.x, l = this.rtl ? this.X1 - d.w : this.X0;
      roundRect(x, l, y, d.w, d.h, 10 * k); x.fillStyle = '#C2512C'; x.fill();
      const m = metrics(x, st, d.f.size), base = y + d.h / 2 + (m.a - m.d) / 2;
      drawRun(x, st, d.f.size, d.f.t, l + 24 * k, base, C.ink, this.rtl && isFaText(d.f.t));
      this.rec('tag', d.f.t, l + 24 * k, y + 14 * k, d.f.w, st.size * k * st.lh, this.MW - 60 * k, d.f.size, d.f.cut);
    } });
  };
  // The quiet line under a mark: what the next one is.
  P.nextLine = function (t, gap) {
    return this.add({ name: 'next', gap: gap || 0, drop: 1, h: k => this.lineH('next', t, k), draw: (y, k) => this.line1('next', t, y, k) });
  };
  // Four numbers, two by two (the player card's): [[value, label], …].
  P.grid4 = function (cells, gap) {
    const colGap = 36, rowGap = 30, colW = (this.MW - colGap) / 2;
    const labH = k => Math.max.apply(null, cells.map(c => this.lineH('statL', c[1], k)));
    const rowH = k => this.lineH('stat', '0', k) + 6 * k + labH(k);
    return this.add({ name: 'grid', gap: gap || 0, h: k => rowH(k) * 2 + rowGap * k, draw: (y, k) => {
      cells.slice(0, 4).forEach((c, i) => {
        const col = i % 2, row = (i / 2) | 0;
        const x0 = this.rtl ? this.X1 - (col + 1) * colW - col * colGap : this.X0 + col * (colW + colGap);
        const top = y + row * (rowH(k) + rowGap * k);
        const r = this.line1('stat', c[0], top, k, { maxW: colW, x0 });
        this.line1('statL', c[1], top + r.h + 6 * k, k, { maxW: colW, x0 });
      });
    } });
  };
  // The headline: runs [text, clay?, newLine?]; up to `max` lines, shrunk to the width.
  P.big = function (runs, gap, max, o) {
    o = o || {};
    const lines = [];
    runs.forEach(r => { if (r[2] || !lines.length) lines.push([]); lines[lines.length - 1].push(r); });
    const role = 'big';
    const all = runs.map(r => r[0]).join(' ');
    const st = this.st(role, all);
    const base = (o.size || st.size);
    // Each written line may wrap further (a long cycle name); every line shares one size, so the headline reads as one block.
    // A word can be made of two runs with no space between them ("Re" + "test", the second in clay): it is drawn as its pieces.
    const wordsOf = ln => {
      const words = []; let cur = null;
      ln.forEach(r => String(r[0]).split(/(\s+)/).forEach(piece => {
        if (!piece) return;
        if (/^\s+$/.test(piece)) { cur = null; return; }
        if (!cur) { cur = { t: '', parts: [] }; words.push(cur); }
        cur.t += piece; cur.parts.push({ t: piece, c: !!r[1] });
      }));
      return words;
    };
    // a word's width: its pieces, and the letter-spacing between the last letter of one and the first of the next
    const wordW = (w, size) => w.parts.reduce((s, pc) => s + textW(this.x, st, size, pc.t), 0) + (st.track || 0) * size * (w.parts.length - 1);
    const lay = k => {
      const x = this.x;
      let size = base * k;
      const floor = base * k * (o.floor || 0.5);
      const max2 = max || 2;
      for (;;) {
        const out = [];
        lines.forEach(ln => {
          const words = wordsOf(ln);
          let cur = [];
          const lw = arr => arr.reduce((s, w, i) => s + wordW(w, size) + (i ? textW(x, st, size, ' ') : 0), 0);
          words.forEach(w => {
            if (cur.length && lw(cur.concat([w])) > this.MW) { out.push(cur); cur = []; }
            cur.push(w);
          });
          if (cur.length) out.push(cur);
        });
        const widest = Math.max(...out.map(l => l.reduce((s, w, i) => s + wordW(w, size) + (i ? textW(x, st, size, ' ') : 0), 0)));
        if ((out.length <= max2 && widest <= this.MW) || size <= floor) return { out, size, widest };
        size = Math.max(floor, size - Math.max(1, size * 0.04));
      }
    };
    return this.add({ name: 'big', gap: gap || 0,
      h: k => { const a = lay(k); return Math.min(a.out.length, max || 2) * st.lh * a.size; },
      draw: (y, k) => {
        const a = lay(k), x = this.x, sp = textW(x, st, a.size, ' ');
        const m = metrics(x, st, a.size), lh = st.lh * a.size, mx = max || 2;
        // More lines than room even at the smallest size: the last line ends on "…" (dropping words until it fits), so a cut name
        // is seen to be cut and never reads as a shorter, different one.
        const rows = a.out.slice(0, mx), cut = a.out.length > mx;
        if (cut) {
          const dots = arr => { const c = arr.slice(), w = c[c.length - 1];
            c[c.length - 1] = { t: w.t + '…', parts: w.parts.concat([{ t: '…', c: w.parts[w.parts.length - 1].c }]) }; return c; };
          const lw = arr => arr.reduce((s, w, i) => s + wordW(w, a.size) + (i ? sp : 0), 0);
          let last = rows[mx - 1].slice(), line = dots(last);
          while (lw(line) > this.MW && last.length > 1) { last.pop(); line = dots(last); }
          rows[mx - 1] = line;
        }
        rows.forEach((ln, li) => {
          const top = y + li * lh, base = top + lh / 2 + (m.a - m.d) / 2;
          const ws = ln.map(w => wordW(w, a.size)), tot = ws.reduce((s, v) => s + v, 0) + sp * (ln.length - 1);
          const faLine = ln.some(w => isFaText(w.t)), trk = (st.track || 0) * a.size;
          const pieces = (w, l0, rtl) => {   // a word's pieces, each in its colour, in reading order
            let l = l0;
            (rtl ? w.parts.slice().reverse() : w.parts).forEach(pc => {
              const pw = textW(x, st, a.size, pc.t);
              drawRun(x, st, a.size, pc.t, l, base, pc.c ? C.clay : st.color, rtl);
              l += pw + trk;
            });
          };
          if (this.rtl && faLine) {
            let r = this.X1;
            ln.forEach((w, i) => { pieces(w, r - ws[i], true); r -= ws[i] + sp; });
          } else {
            let l = this.rtl ? this.X1 - tot : this.X0;
            ln.forEach((w, i) => { pieces(w, l, false); l += ws[i] + sp; });
          }
          this.rec('big', ln.map(w => w.t).join(' '), this.rtl ? this.X1 - tot : this.X0, top, tot, lh, this.MW, a.size, cut && li === mx - 1);
        });
      } });
  };
  P.bar = function (gap) {
    return this.add({ name: 'bar', gap: gap || 0, h: k => 16 * k, draw: (y, k) => {
      const w = 152 * k, l = this.rtl ? this.X1 - w : this.X0;
      roundRect(this.x, l, y, w, 16 * k, 8 * k); this.x.fillStyle = C.clayLine; this.x.fill();
    } });
  };
  // A lift's name: English in both languages, up to two lines, then smaller.
  P.lift = function (t, gap) {
    const st = ST.en.lift;
    const lay = k => this.layoutRich([[t]], 'lift', 'lift', st.size * k, this.MW, 2);
    return this.add({ name: 'lift', gap: gap || 0, h: k => lay(k).lines.length * st.lh * lay(k).size,
      draw: (y, k) => {
        const a = lay(k), lh = st.lh * a.size, x = this.x, m = metrics(x, st, a.size);
        a.lines.forEach((ln, i) => {
          const txt = ln.map(it => it.tk.t).join(' '), w = textW(x, st, a.size, txt);
          const l = this.rtl ? this.X1 - w : this.X0, top = y + i * lh;
          drawRun(x, st, a.size, txt, l, top + lh / 2 + (m.a - m.d) / 2, null, false);
          this.rec('lift', txt, l, top, w, lh, this.MW, a.size, false);
        });
      } });
  };
  // The big number: parts [{ t, s: 'num'|'small' } | { arrow: 1 }], on one baseline, shrunk together to the width.
  P.num = function (parts, gap, o) {
    o = o || {};
    const x = this.x;
    const stOf = p => p.arrow ? null : this.st(p.s || 'num', p.t);
    const big = this.st('num', parts.map(p => p.t || '').join(''));
    const lay = k => {
      let f = 1;
      const widths = s => parts.map(p => p.arrow ? big.size * s * 0.42 + 44 * s : textW(x, stOf(p), stOf(p).size * s, p.t));
      let ws = widths(k * f), tot = ws.reduce((a, b) => a + b, 0);
      while (tot > this.MW && f > 0.4) { f -= 0.02; ws = widths(k * f); tot = ws.reduce((a, b) => a + b, 0); }
      return { s: k * f, ws, tot };
    };
    return this.add({ name: 'num', gap: gap || 0, h: k => big.lh * big.size * lay(k).s,
      draw: (y, k) => {
        const a = lay(k), lh = big.lh * big.size * a.s, m = metrics(x, big, big.size * a.s);
        const base = y + lh / 2 + (m.a - m.d) / 2;
        let l = this.rtl ? this.X1 : this.X0;
        parts.forEach((p, i) => {
          const w = a.ws[i];
          if (this.rtl) l -= w;
          if (p.arrow) {
            const aw = big.size * a.s * 0.42;
            arrow(x, l + 22 * a.s, base - big.size * a.s * 0.3, aw, C.clay, this.rtl);
          } else {
            const st = stOf(p);
            drawRun(x, st, st.size * a.s, p.t, l, base, p.color, this.rtl && isFaText(p.t));
          }
          if (!this.rtl) l += w;
        });
        const l0 = this.rtl ? this.X1 - a.tot : this.X0;
        this.rec('num', parts.map(p => p.arrow ? '→' : p.t).join(''), l0, y, a.tot, lh, this.MW, big.size * a.s, false);
      } });
  };
  P.para = function (runs, gap, o) {
    o = o || {};
    return this.add({ name: o.name || 'line', gap: gap || 0, drop: o.drop, h: k => this.richH(runs, k, o), draw: (y, k) => this.rich(runs, y, k, o) });
  };
  // The stamp: a word in a clay box, turned 4°, as Amir would stamp a file.
  P.stamp = function (t, gap) {
    const st = this.st('stamp', t);
    const dims = k => {
      const f = this.fitLine(st, t, st.size * k, this.MW - 80 * k);
      return { f, w: f.w + 64 * k, h: st.size * k * st.lh + 40 * k };
    };
    return this.add({ name: 'stamp', gap: gap || 0, h: k => dims(k).h + 24 * k, draw: (y, k) => {
      const d = dims(k), x = this.x, l = this.rtl ? this.X1 - d.w - 8 * k : this.X0 + 8 * k, t0 = y + 12 * k;
      x.save();
      x.translate(l + d.w / 2, t0 + d.h / 2); x.rotate((this.rtl ? 4 : -4) * Math.PI / 180);
      roundRect(x, -d.w / 2, -d.h / 2, d.w, d.h, 24 * k);
      x.strokeStyle = C.clayLine; x.lineWidth = 6 * k; x.stroke();
      const m = metrics(x, st, d.f.size);
      drawRun(x, st, d.f.size, d.f.t, -d.f.w / 2, (m.a - m.d) / 2, null, this.rtl && isFaText(t));
      x.restore();
      this.rec('stamp', d.f.t, l + 32 * k, t0 + 20 * k, d.f.w, st.size * k * st.lh, this.MW - 80 * k, d.f.size, d.f.cut);
    } });
  };
  // Three numbers in a row under a hairline (Signed Off, The Distance): [[value, label], …].
  P.stats = function (cells, gap) {
    const x = this.x, colGap = 24;
    const colW = (this.MW - colGap * (cells.length - 1)) / cells.length;
    const lab = k => Math.max(...cells.map(c => this.richH([[c[1]]], k, { roleA: 'statL', roleB: 'statL', maxW: colW, max: 2 })));
    return this.add({ name: 'stats', gap: gap || 0,
      h: k => 4 + 40 * k + this.lineH('stat', '0', k) + 6 * k + lab(k),
      draw: (y, k) => {
        x.fillStyle = C.line; x.fillRect(this.X0, y, this.MW, 4);
        cells.forEach((c, i) => {
          const x0 = this.rtl ? this.X1 - (i + 1) * colW - i * colGap : this.X0 + i * (colW + colGap);
          const r = this.line1('stat', c[0], y + 4 + 40 * k, k, { maxW: colW, x0 });
          this.rich([[c[1]]], y + 4 + 40 * k + r.h + 6 * k, k, { roleA: 'statL', roleB: 'statL', maxW: colW, max: 2, x0, x1: x0 + colW });
        });
      } });
  };

  // ── 8. The top strip and the foot (the 2026-10-19 pass) ───────────────────────────────────────────────────────────────
  // The top strip: a mint dot and the eyebrow at the card's start edge, the athlete's first name and the date at the end.
  // The name sits HERE, not at the foot: it is the first thing read, and it is nowhere near Instagram's reply bar.
  P.whoText = function (iso) {
    const d = dateLong(iso, this.lang);
    const first = this.opts.name !== false && this.opts.first ? String(this.opts.first) : '';
    return first ? bidi(first, this.lang) + ' · ' + d : d;
  };
  P.topStrip = function (iso) {
    const S = this.S, x = this.x, y = S.eyeY, eye = this.eyebrow || '';
    const st = this.st('eye', eye), lh = st.lh * st.size, dot = 17, gap = 16;
    const wEye = this.MW * 0.52, wWho = this.MW * 0.40;   // 40 px of air between them, however long the eyebrow is
    if (eye) {
      const cx = this.rtl ? this.X1 - dot / 2 : this.X0 + dot / 2;
      x.save(); x.fillStyle = C.mint;
      x.beginPath(); x.arc(cx, y + lh / 2, dot / 2, 0, Math.PI * 2); x.fill(); x.restore();
      this.line1('eye', eye, y, 1, { maxW: wEye, x0: this.rtl ? this.X1 - dot - gap - wEye : this.X0 + dot + gap });
    }
    const who = this.whoText(iso);
    this.line1('who', who, y, 1, { maxW: wWho, x0: this.rtl ? this.X0 : this.X1 - wWho, align: 'end' });
  };
  // The foot: one hairline, his photo, his signature and the mantra, then the address line with the mark. "Amir Ardekani ·
  // Coach" went with the 2026-10-19 pass: the handle names him, and six things in the bottom third were five too many.
  P.foot = function () {
    const x = this.x, S = this.S, rtl = this.rtl, y = S.footY;
    x.fillStyle = C.line; x.fillRect(this.X0, y, this.MW, 4);
    const fy = y + 44;
    const cx = rtl ? this.X1 - 60 : this.X0 + 60;
    photo(x, cx, fy + 60, 120, this.imgs.coach);
    const sigW = 250, tx = rtl ? this.X1 - 120 - 36 : this.X0 + 120 + 36, room = this.MW - 156;
    signature(x, rtl ? tx - sigW : tx, fy - 4, sigW, C.ink);
    this.line1('mant', this.t.mantra, fy + 86, 1, { maxW: room, x0: rtl ? tx - room : tx });
    // The address line: the handle, the mark, the site (mirrored on a Farsi card).
    const fst = ST.en.foot, a = '@amirardekanian', b = 'amirardekani.com';
    const left = rtl ? b : a, right = rtl ? a : b, ay = S.adY;
    const m = metrics(x, fst, fst.size), base = ay + 36 + (m.a - m.d) / 2;
    const wl = textW(x, fst, fst.size, left), wr = textW(x, fst, fst.size, right);
    drawRun(x, fst, fst.size, left, this.X0, base, null, false);
    drawRun(x, fst, fst.size, right, this.X1 - wr, base, null, false);
    this.rec('foot', left, this.X0, ay + 14, wl, 44, (this.MW - 72) / 2 - 24, fst.size, false);
    this.rec('foot', right, this.X1 - wr, ay + 14, wr, 44, (this.MW - 72) / 2 - 24, fst.size, false);
    logo(x, S.W / 2 - 36, ay, 72, this.imgs.logo);
  };
  // The top strip, the card's own words laid out from the foot up, then the foot.
  P.finish = function (iso) {
    this.topStrip(iso);
    this.flow(this.S.bodyY, this.S.bodyEnd);
    this.foot();
  };

  // ── 9. The cards ──────────────────────────────────────────────────────────────────────────────────────────────────────
  // Each takes the painter (p) and the card's data (d). The data shapes are written above each one; program.html builds the training
  // five (hlSpecs in PROGRAM-APP.md → Highlight Reel), Career Mode phase 3 builds the reward five from its catalogue.
  const W_ = (lang, v, u) => kgs(v, lang, u);
  function cycleEye(p, c) {
    return c && c.n ? p.t.cycleEye(n(c.n, p.lang), c.name || '') : p.t.personalRecords;
  }
  // A headline's runs ([text, clay?, newLine?]) as one line of words, for the clay label at the top of a card.
  const headText = runs => runs.map((r, i) => (i && r[2] ? ' ' : '') + r[0]).join('').replace(/\s+/g, ' ').trim();
  const TPL = {};

  // best: { lift, u, w, r, date, prev: { w, r, date } | null, cycle: { n, of, name } | null }
  // The set as lifted (never the 1RM estimate), in the measure `u` (kg, lb or plates; its bar is in the same measure). The gain only when
  // the reps match (or, at the same weight, the reps it gained).
  TPL.best = function (p, d) {
    const lang = p.lang, t = p.t, show = p.opts.weights !== false, u = d.u;
    const pr = d.prev || null;
    const sameR = pr && +pr.r === +d.r && +d.w > +pr.w;
    const sameW = pr && +pr.w === +d.w && +d.r > +pr.r;
    p.eye(cycleEye(p, d.cycle));
    p.lab(headText(t.bestHead));
    if (show) p.num([{ t: n(kgNum(d.w), lang) }, { t: ' ' + unitW(u, d.w, lang) + ' × ' + n(d.r, lang), s: 'small' }], 18);
    else if (sameR) p.num([{ t: plusKg(d.w - pr.w, lang, u).replace(/\s.*$/, '') }, { t: ' ' + unitW(u, d.w - pr.w, lang), s: 'small' }], 18);
    else if (sameW) p.num([{ t: (lang === 'fa' ? '' : '+') + n(d.r - pr.r, lang) }, { t: ' ' + t.reps(d.r - pr.r), s: 'small' }], 18);
    p.lift(d.lift, 26);
    if (pr && show && sameR) p.para(t.bestGainKg(plusKg(d.w - pr.w, lang, u), dateShort(pr.date, lang)), 32, { drop: 2 });
    else if (pr && show && sameW) p.para(t.bestGainReps(plusReps(d.r - pr.r, lang), W_(lang, d.w, u), dateShort(pr.date, lang)), 32, { drop: 2 });
    else if (pr && !show && sameR) p.para(t.bestHiddenKg(dateShort(pr.date, lang)), 32, { drop: 2 });
    else if (pr && !show && sameW) p.para(t.bestHiddenReps(dateShort(pr.date, lang)), 32, { drop: 2 });
    p.finish(d.date);
  };
  TPL.best.ok = d => !!(d && d.lift && d.w > 0 && d.r > 0);

  // effort: { lift, u, shape, same, pct, a: { w, n, r, date, wk }, b: { w, n, r, date, wk }, cycle, date }
  // u: the measure both sets' weights are in (kg, lb or plates); on the cycle card each win carries its own.
  // shape (program.html's winText() names it): kg · reps · kgEasier · kgReps · bwReps · pctHarder · pctFewer · pctLess · pctBw. `same`: the RPE
  // is known and the same. RPE-only wins never reach a card.
  const EFFORT_KEY = d => {
    const s = d.shape;
    if (s === 'kg') return d.same ? 'kg' : 'kgSameReps';
    if (s === 'reps') return d.same ? 'reps' : 'repsSameWeight';
    if (s === 'bwReps') return d.same ? 'bwReps' : 'bwRepsPlain';
    return s;
  };
  function effortWords(p, d, short) {
    const lang = p.lang, t = p.t, show = !p.opts || p.opts.weights !== false;
    let key = EFFORT_KEY(d);
    // Weights hidden, "the change only": a reps win at the same weight drops the weight it was lifted at (+4 reps, same effort), the
    // words a bodyweight reps win already has. A weight win shows only its change anyway (+7.5 kg, +10 lb, +1 plate: the spec's `u`).
    if (!show && key === 'reps') key = 'bwReps';
    if (!show && key === 'repsSameWeight') key = 'bwRepsPlain';
    const dw = (d.b.w || 0) - (d.a.w || 0), dn = (d.b.n || 0) - (d.a.n || 0);
    const g = plusKg(dw, lang, d.u), gr = plusReps(dn, lang), w = d.b.w ? W_(lang, d.b.w, d.u) : '', pc = pctStr(d.pct, lang);
    const tab = short ? t.winShort : t.effortLine;
    const f = tab[key];
    if (!f) return null;
    if (/^pct/.test(key)) return f(pc);
    if (key === 'kgReps') return f(g, gr);
    if (key === 'reps' || key === 'repsSameWeight') return f(gr, w);
    if (key === 'bwReps' || key === 'bwRepsPlain') return f(gr);
    return f(g);
  }
  TPL.effort = function (p, d) {
    const lang = p.lang, t = p.t, show = p.opts.weights !== false, x = p.x;
    const key = EFFORT_KEY(d);
    const head = /^pct/.test(key) ? t.effortHead.pct(pctStr(d.pct, lang)) : t.effortHead[key];
    p.eye(cycleEye(p, d.cycle));
    p.lab(headText(head));
    p.lift(d.lift, 26);
    // Before and after: the first session of the cycle and the best since, as lifted, each with its effort.
    const label = s => s.wk && d.a.wk !== d.b.wk ? t.week(n(s.wk, lang)) : dateShort(s.date, lang);
    const setTxt = s => {
      const reps = s.n ? (s.w && show ? kgs(s.w, lang, d.u) + ' × ' + n(s.n, lang) : (s.w ? '× ' + n(s.n, lang) : n(s.n, lang) + ' ' + t.reps(s.n))) : '';
      return [reps, s.r ? t.rpe(n(s.r, lang)) : ''].filter(Boolean).join(' · ');
    };
    const val = s => (s.w ? s.w : 1) * (1 + ((s.n || 0) + (s.r >= 6 && s.r <= 10 ? 10 - s.r : 0)) / 30);
    const rows = [{ s: d.a, now: false }, { s: d.b, now: true }];
    const top = Math.max(val(d.a), val(d.b)) || 1;
    rows.forEach(r => { r.frac = Math.max(0.3, Math.min(1, val(r.s) / top)); });
    const rowH = k => 64 * k + 10 * k + p.lineH('row', 'A', k);
    p.add({ name: 'vs', gap: 40, h: k => rowH(k) * 2 + 28 * k, draw: (y, k) => {
      rows.forEach((r, i) => {
        const top0 = y + i * (rowH(k) + 28 * k), labW = 176 * k, gapW = 32 * k, barW = p.MW - labW - gapW;
        const lab = label(r.s);
        const lx = p.rtl ? p.X1 - labW : p.X0, bx = p.rtl ? p.X0 : p.X0 + labW + gapW;
        p.line1('label', lab, top0 + (64 * k - p.lineH('label', lab, k)) / 2, k, { maxW: labW, x0: lx });
        const bw = barW * r.frac;
        roundRect(x, p.rtl ? bx + barW - bw : bx, top0, bw, 64 * k, 16 * k);
        x.fillStyle = r.now ? C.clayLine : C.bar; x.fill();
        p.line1('row', setTxt(r.s), top0 + 64 * k + 10 * k, k, { maxW: barW, x0: bx });
      });
    } });
    const words = effortWords(p, d, false);
    if (words) p.para(words, 32, { drop: 2 });
    p.finish(d.date);
  };
  TPL.effort.ok = d => !!(d && d.lift && d.a && d.b && d.shape && EFFORT_KEY(d) in EN.effortLine);

  // retest: { lift, u, spec ('5RM'), now: { w, r, date }, before: { w, r, date, test }, oneCycle, cycle: { n } }
  // Both sets and both dates, nothing else, in the measure `u` (kg, lb or plates; the earlier set is in the same one). A weight gain only
  // when the reps match.
  TPL.retest = function (p, d) {
    const lang = p.lang, t = p.t, show = p.opts.weights !== false, u = d.u;
    const a = d.before, b = d.now, sameR = +a.r === +b.r;
    p.eye(d.cycle && d.cycle.n ? t.testWeek(n(d.cycle.n, lang)) : t.personalRecords);
    p.lab(headText(t.retestHead) + ' · ' + t.beaten);
    if (show && sameR) p.num([{ t: n(kgNum(a.w), lang) }, { arrow: 1 }, { t: n(kgNum(b.w), lang) }, { t: ' ' + unitW(u, b.w, lang), s: 'small' }], 18);
    else if (show) p.num([{ t: n(kgNum(a.w), lang) + '×' + n(a.r, lang), s: 'small' }, { arrow: 1 },
      { t: n(kgNum(b.w), lang) }, { t: ' ' + unitW(u, b.w, lang) + ' × ' + n(b.r, lang), s: 'small' }], 18);
    else if (sameR && b.w > a.w) p.num([{ t: plusKg(b.w - a.w, lang, u).replace(/\s.*$/, '') }, { t: ' ' + unitW(u, b.w - a.w, lang), s: 'small' }], 18);
    else if (+b.w === +a.w && b.r > a.r) p.num([{ t: (lang === 'fa' ? '' : '+') + n(b.r - a.r, lang) }, { t: ' ' + t.reps(b.r - a.r), s: 'small' }], 18);
    p.lift(d.lift + (d.spec ? ' · ' + d.spec : ''), 26);
    let gain = null;
    if (sameR && b.w > a.w) gain = plusKg(b.w - a.w, lang, u);
    else if (+a.w === +b.w && b.r > a.r) gain = plusReps(b.r - a.r, lang);
    const d1 = dateShort(a.date, lang), d2 = dateShort(b.date, lang);
    const dates = a.test ? t.retestDates(d1, d2) : t.retestBefore(d1, d2);
    const runs = gain ? (d.oneCycle ? t.retestOneCycle(gain) : t.retestSince(gain, d1)).concat([[dates]]) : [[dates.trim()]];
    p.para(runs, 32, { drop: 2 });
    p.finish(b.date);
  };
  TPL.retest.ok = d => !!(d && d.lift && d.now && d.before && d.now.w > 0 && d.before.w > 0);

  // cycle (Signed Off): { cycle: { n, of, name, art }, done, planned, bests, weeks, wins: [{ lift, shape, same, pct, a, b }], end }
  TPL.cycle = function (p, d) {
    const lang = p.lang, t = p.t, c = d.cycle || {};
    p.eye(c.of ? t.cycleOf(n(c.n, lang), n(c.of, lang)) : t.cycleEye(n(c.n, lang), ''));
    p.big([[c.name || '']], 0, 2, { size: 136, floor: 0.42 });
    p.stamp(t.signedOff, 20);
    const cells = [];
    if (d.planned) cells.push([n(d.done, lang) + '/' + n(d.planned, lang), t.sessions]);
    cells.push([n(d.bests || 0, lang), t.newBests]);
    if (d.weeks) cells.push([n(d.weeks, lang), t.weeks]);
    p.stats(cells, 30);
    (d.wins || []).slice(0, 3).forEach((w, i) => {
      const words = effortWords(p, w, true);
      if (!words) return;
      p.add({ name: 'win' + (i + 1), gap: i ? 18 : 30, drop: 3 - i,
        h: k => p.lineH('winN', 'A', k) + p.richH([[words, 1]], k, { roleA: 'winT', roleB: 'winT', max: 2 }),
        draw: (y, k) => {
          const r = p.line1('winN', w.lift, y, k, { st: ST.en.winN });
          p.rich([[words, 1]], y + r.h, k, { roleA: 'winT', roleB: 'winT', max: 2 });
        } });
    });
    p.finish(d.end);
  };
  TPL.cycle.ok = d => !!(d && d.cycle && d.cycle.name && d.end);

  // roadmap (The Distance): { cycles: [{ name, art }], weeks, sessions, start, end }
  TPL.roadmap = function (p, d) {
    const lang = p.lang, t = p.t, x = p.x, cs = d.cycles || [];
    p.eye(t.roadEye);
    p.big(t.roadHead, 0, 1, { size: 136 });
    const cells = [[n(cs.length, lang), t.cycles]];
    if (d.weeks) cells.push([n(d.weeks, lang), t.weeks]);
    if (d.sessions) cells.push([n(d.sessions, lang), t.sessions]);
    p.stats(cells, 30);
    const rowH = k => 76 * k;
    p.add({ name: 'road', gap: 34, h: k => cs.length * rowH(k) + Math.max(0, cs.length - 1) * 20 * k, draw: (y, k) => {
      cs.forEach((c, i) => {
        const top = y + i * (rowH(k) + 20 * k), rtl = p.rtl;
        const numW = 64 * k, thW = 136 * k, gap = 24 * k, tickW = 56 * k;
        const nx = rtl ? p.X1 - numW : p.X0;
        p.line1('roadN', n(i + 1, lang), top + (rowH(k) - p.lineH('roadN', '1', k)) / 2, k, { maxW: numW, x0: nx, align: 'center' });
        const tx = rtl ? nx - gap - thW : nx + numW + gap;
        const im = p.imgs['art' + i];
        x.save(); roundRect(x, tx, top, thW, rowH(k), 12 * k); x.clip();
        x.fillStyle = C.mid; x.fillRect(tx, top, thW, rowH(k));
        if (im) {
          const s = Math.max(thW / im.width, rowH(k) / im.height);
          x.globalAlpha = 0.85; x.drawImage(im, tx + (thW - im.width * s) / 2, top + (rowH(k) - im.height * s) / 2, im.width * s, im.height * s);
        }
        x.restore();
        const nameW = p.MW - numW - thW - tickW - gap * 3;
        const nx2 = rtl ? tx - gap - nameW : tx + thW + gap;
        p.line1('road', c.name || '', top + (rowH(k) - p.lineH('road', c.name || '', k)) / 2, k, { maxW: nameW, x0: nx2, st: ST.en.road });
        tick(x, rtl ? p.X0 + tickW / 2 : p.X1 - tickW / 2, top + rowH(k) / 2, 44 * k, C.ink, 6 * k);
      });
    } });
    if (d.start && d.end) p.para(t.roadLine(dateShort(d.start, lang), dateShort(d.end, lang)), 30, { drop: 1 });
    p.finish(d.end);
  };
  TPL.roadmap.ok = d => !!(d && Array.isArray(d.cycles) && d.cycles.length && d.end);

  // ── Career Mode's cards (the 2026-10-19 pass): a mark, an achievement, the month's honour, the Monthly Open, a new level,
  //    the month's goal, a session and the athlete's own card. No badge, metal, rank, title or quest anywhere: they left the
  //    server with the cut (career/CAREER_MODE.md → Round 5, L2 and L5). Amir, 2026-10-19: "go with your picks", and
  //    "all the achievements should get a card", so every achievement is shareable from Your moments, whenever it was earned.
  // REWARD_TEMPLATES_START

  const startL = (p, w) => p.rtl ? p.X1 - w : p.X0;
  const rwEye = (f, word) => word ? f(word) : f('').replace(/\s*·\s*$/, '');          // "Achievement · Progress", or "Achievement"
  // How far a reward's own name may shrink before the engine cuts it: a long name is drawn smaller, never shorter.
  const NAME_FLOOR = 0.36;
  // The four numbers' marks (career/badges.toml, program.html's careerMarks()). A card is drawn for one of these keys only.
  const MARK_KEYS = ['weeks_held', 'sessions_with_amir', 'personal_bests', 'comebacks'];
  // The ink of a fitted line: how far it rises above its baseline and falls below it (capitals fall nowhere, Farsi falls and rises).
  function inkOf(p, st, f) {
    p.x.font = fontStr(st, f.size);
    const mt = p.x.measureText(caseOf(st, f.t));
    return { asc: mt.actualBoundingBoxAscent > 0 ? mt.actualBoundingBoxAscent : f.size * 0.7, desc: Math.max(0, mt.actualBoundingBoxDescent || 0) };
  }
  // The top of the line box, as P.line1 lays it out, that puts the INK of a fitted text on the line yc.
  function inkTop(p, st, size, yc, f) {
    const i = inkOf(p, st, f), m = metrics(p.x, st, f.size);
    return yc + (i.asc - i.desc) / 2 - (st.lh * size) / 2 - (m.a - m.d) / 2;
  }
  // A Farsi card is handed ENGLISH text whenever the catalogue has no Farsi for it yet (a caption, what counts in the Open).
  // The engine's rich() keeps a run of Latin words in ONE piece on a right-to-left card, so such a sentence never wraps and runs
  // off the card. plainLines() breaks text of one style in the order it is written, and block() draws each line whole through
  // line1(), on the card's start edge.
  const hasLatin = s => /[A-Za-z]/.test(String(s));
  function plainLines(p, st, text, size, maxW, maxLines) {
    const words = String(text).trim().split(/\s+/), floor = size * 0.62;
    for (let s = size; ; s = Math.max(floor, s - Math.max(1, s * 0.04))) {
      const lines = []; let cur = '';
      words.forEach(w => {
        const t2 = cur ? cur + ' ' + w : w;
        if (cur && textW(p.x, st, s, t2) > maxW) { lines.push(cur); cur = w; } else cur = t2;
      });
      if (cur) lines.push(cur);
      if ((lines.length <= maxLines && lines.every(l => textW(p.x, st, s, l) <= maxW)) || s <= floor) {
        if (lines.length > maxLines) lines.splice(maxLines - 1, lines.length, lines.slice(maxLines - 1).join(' '));   // the rest ends in "…"
        return { lines, size: s };
      }
    }
  }
  // Text of one style in up to o.max lines: { h, draw(top) }. The engine's own rich() for everything but Latin letters on a Farsi card.
  function block(p, text, k, o) {
    const role = o.roleA || 'line', maxLines = o.max || 3;
    if (!(p.rtl && hasLatin(text))) return { h: p.richH([[text]], k, o), draw: top => p.rich([[text]], top, k, o) };
    const st = p.st(role, text), a = plainLines(p, st, text, st.size * k, o.maxW || p.MW, maxLines), lh = st.lh * a.size;
    return { h: a.lines.length * lh, draw: top => a.lines.forEach((ln, i) => p.line1(role, ln, top + i * lh, k, { st, maxW: o.maxW, x0: o.x0, size: a.size / k, floor: 1 })) };
  }
  // A paragraph of one style as a flow item (a caption, what counts in the Open, the month's goal in Amir's words).
  function paraItem(p, text, gap, o) {
    o = o || {};
    return p.add({ name: o.name || 'line', gap: gap || 0, drop: o.drop, h: k => block(p, text, k, o).h, draw: (y, k) => block(p, text, k, o).draw(y) });
  }

  // mark: { first, key ('weeks_held' | 'sessions_with_amir' | 'personal_bests' | 'comebacks'), n, next, date }
  // One of the four numbers crossing a mark (L3). The number is the outlined numeral, the day screen's own: a count, never a weight.
  TPL.mark = function (p, d) {
    const t = p.t, lang = p.lang, key = MARK_KEYS.indexOf(d.key) >= 0 ? d.key : MARK_KEYS[0];
    const num = n(d.n, lang);
    p.eye(t.markEye);
    p.lab(t.markWords[key]);
    p.ghost(num, 8);
    p.para(t.markLine[key](num), 24, { drop: 2 });
    if (d.next > 0) p.nextLine(t.nextMark(n(d.next, lang) + ' ' + t.markUnit[key]), 20);
    p.finish(d.date);
  };
  TPL.mark.ok = d => !!(d && d.n > 0 && MARK_KEYS.indexOf(d.key) >= 0);

  // achievement: { first, name, nameFa?, meaning, caption, captionFa?, date }
  // EVERY achievement gets one (Amir, 2026-10-19), whenever it was earned: a round seal, the name with its last word in clay, the line.
  TPL.achievement = function (p, d) {
    const t = p.t, x = p.x, fa = p.lang === 'fa', caption = fa && d.captionFa ? d.captionFa : d.caption;
    const words = String(fa && d.nameFa ? d.nameFa : d.name).trim().split(/\s+/), last = words.pop();
    p.eye(rwEye(t.achievementEye, t.meaning[d.meaning]));
    p.add({ name: 'seal', gap: 0, h: k => 232 * k, draw: (y, k) => {
      const R = 116 * k, cx = startL(p, 2 * R) + R, cy = y + R;
      x.save();
      x.strokeStyle = C.clayLine; x.lineWidth = 6 * k; x.lineCap = 'round';
      x.beginPath();
      for (let i = 0; i < 28; i++) {
        const a = i * Math.PI * 2 / 28, r1 = (i % 2 ? 104 : 97) * k, r2 = 113 * k;
        x.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); x.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
      }
      x.stroke();
      x.beginPath(); x.arc(cx, cy, 86 * k, 0, Math.PI * 2); x.fillStyle = C.mid; x.fill();
      x.beginPath(); x.arc(cx, cy, 84 * k, 0, Math.PI * 2); x.strokeStyle = 'rgba(255,255,255,0.30)'; x.lineWidth = 4 * k; x.stroke();
      x.restore();
      tick(x, cx, cy, 100 * k, C.ink, 15 * k);
    } });
    p.big(words.length ? [[words.join(' ') + ' '], [last, 1]] : [[last, 1]], 26, 2, { size: 146, floor: NAME_FLOOR });
    if (caption) paraItem(p, caption, 26, { name: 'caption', drop: 2 });
    p.finish(d.date);
  };
  TPL.achievement.ok = d => !!(d && d.name && String(d.name).trim());

  // honour: { first, honour ('sessions' | 'improved' | 'full_month' | 'pick'), month, n?, pct?, lift?, place?, field?, date }
  // One of the month's honours (L9). ⚠️ A card never names another athlete: the place and the size of the field, nothing more.
  TPL.honour = function (p, d) {
    const t = p.t, lang = p.lang, h = t.honourName[d.honour] ? d.honour : 'pick';
    p.eye(t.honourEye(d.month || ''));
    if (h === 'sessions' && d.n > 0) {
      p.lab(t.honourName[h]);
      p.num([{ t: n(d.n, lang) }, { t: ' ' + t.sessions, s: 'small' }], 18);
    } else if (h === 'improved' && d.pct > 0) {
      p.lab(t.honourName[h]);
      p.num([{ t: pctStr(Math.round(d.pct * 10) / 10, lang) }], 18);
      if (d.lift) p.lift(d.lift, 24);
    } else {
      p.big([[t.honourName[h]]], 0, 2, { size: 146, floor: 0.42 });
    }
    p.para([[t.honourSub[h](d.month || '')]], 26, { drop: 2 });
    if (d.place > 0 && d.field > 0) p.tag(t.placeOf(t.ord(n(d.place, lang)), n(d.field, lang)), 26);
    p.finish(d.date);
  };
  TPL.honour.ok = d => !!(d && d.honour && d.month);

  // open: { first, title, how?, value, unit?, place?, field?, month, date }
  // The Monthly Open (stage85). The result is the athlete's own, confirmed by Amir; the board is never drawn, only their place.
  TPL.open = function (p, d) {
    const t = p.t, lang = p.lang;
    p.eye(t.openEye(d.month || ''));
    p.lab(d.title || '');
    const parts = [{ t: n(d.value, lang) }];
    if (d.unit) parts.push({ t: ' ' + d.unit, s: 'small' });
    p.num(parts, 18);
    if (d.place > 0 && d.field > 0) p.tag(t.placeOf(t.ord(n(d.place, lang)), n(d.field, lang)), 26);
    if (d.how) paraItem(p, d.how, 26, { name: 'how', drop: 2 });
    p.finish(d.date);
  };
  TPL.open.ok = d => !!(d && d.title && d.value != null && d.value !== '');

  // player: { first, level, weeks, sessions, bests, comebacks, lifts: [{ name, w, r, u }], since, date }
  // Their own card, any day: the one card that waits for nothing to happen. Weights follow the share sheet's switch.
  TPL.player = function (p, d) {
    const t = p.t, lang = p.lang, show = p.opts.weights !== false;
    const lifts = show ? (d.lifts || []).filter(w => w && w.name && w.w > 0).slice(0, 3) : [];
    p.eye(t.playerEye);
    p.big(t.levelHead(n(d.level, lang)), 0, 1, { size: 150 });
    p.grid4([[n(d.weeks || 0, lang), t.playerNums.weeks], [n(d.sessions || 0, lang), t.playerNums.sessions],
      [n(d.bests || 0, lang), t.playerNums.bests], [n(d.comebacks || 0, lang), t.playerNums.comebacks]], 44);
    if (lifts.length) p.nextLine(t.playerLifts, 32);
    lifts.forEach((w, i) => {
      const half = p.MW * 0.60, rest = p.MW - half - 24;
      p.add({ name: 'lift' + (i + 1), gap: i ? 14 : 20, drop: 3 - i, h: k => p.lineH('winN', 'A', k), draw: (y, k) => {
        p.line1('winN', w.name, y, k, { st: ST.en.winN, maxW: half, x0: p.rtl ? p.X1 - half : p.X0 });
        p.line1('winT', kgs(w.w, lang, w.u) + ' × ' + n(w.r, lang), y, k, { maxW: rest, x0: p.rtl ? p.X0 : p.X1 - rest, align: 'end' });
      } });
    });
    if (d.since) p.nextLine(t.playerSince(dateLong(d.since, lang)), 26);
    p.finish(d.date);
  };
  TPL.player.ok = d => !!(d && d.level > 0);

  // level: { first, level, date } — the career level, which never resets. No rank name anywhere (L2).
  TPL.level = function (p, d) {
    const t = p.t, lang = p.lang;
    p.eye(t.levelUpEye);
    p.big(t.levelHead(n(d.level, lang)), 0, 1, { size: 180 });
    p.para(t.levelLine(), 26, { drop: 2 });
    p.finish(d.date);
  };
  TPL.level.ok = d => !!(d && d.level > 0);

  // goal: { first, month, text, textFa?, date } — the month's goal, in Amir's own words, ticked (L10).
  TPL.goal = function (p, d) {
    const t = p.t, fa = p.lang === 'fa', text = fa && d.textFa ? d.textFa : d.text;
    p.eye(t.goalEye(d.month || ''));
    paraItem(p, text, 0, { name: 'goal', roleA: 'quote', roleB: 'quote', max: 4 });
    p.tag(t.goalDone, 30);
    p.finish(d.date);
  };
  TPL.goal.ok = d => !!(d && d.text && String(d.text).trim());

  // session: { first, title, cycle?, mins?, exercises?, sets?, date } — a session done, the card the crew photo belongs on.
  // Never an RPE, a check-in answer or anything about their body: it is a day's work, not a claim.
  TPL.session = function (p, d) {
    const t = p.t, lang = p.lang;
    p.eye(d.cycle && d.cycle.n ? cycleEye(p, d.cycle) : t.sessionEye);
    p.big([[d.title || '']], 0, 2, { size: 136, floor: 0.42 });
    const cells = [];
    if (d.mins > 0) cells.push([n(d.mins, lang), t.minsW]);
    if (d.exercises > 0) cells.push([n(d.exercises, lang), t.exercises(d.exercises)]);
    if (d.sets > 0) cells.push([n(d.sets, lang), t.setsW(d.sets)]);
    if (cells.length) p.stats(cells, 30);
    p.finish(d.date);
  };
  TPL.session.ok = d => !!(d && d.title && String(d.title).trim());
  // REWARD_TEMPLATES_END

  // ── 10. Painting, the picture, the caption ───────────────────────────────────────────────────────────────────────────
  function artList(spec) {
    if (spec.kind === 'cycle') return { art: spec.cycle && spec.cycle.art };
    if (spec.kind === 'roadmap') { const o = {}; (spec.cycles || []).forEach((c, i) => { o['art' + i] = c.art; }); return o; }
    return {};
  }
  // How the athlete's own picture sits on the card: z 1 fills it, and dx / dy slide it inside what is left over, -1 to 1.
  // They are clamped here, so a card can never show an edge however the phone's fingers moved.
  function fitOf(f) {
    f = f || {};
    return { z: Math.max(1, Math.min(4, +f.z || 1)), dx: Math.max(-1, Math.min(1, +f.dx || 0)), dy: Math.max(-1, Math.min(1, +f.dy || 0)) };
  }
  // The card's ground. With the athlete's picture: the picture, graded, under a veil. Without: the green, the cycle's own
  // cover (or the court) graded into it, then the court's lines.
  function drawGround(x, S, imgs, fit) {
    if (imgs.shot) { shot(x, S, imgs.shot, fit); return; }
    ground(x, S);
    const pic = imgs.art || imgs.court;
    if (pic) cover(x, S, pic, S.cover);
    court(x, S);
  }
  // layer: 'bg' draws the ground alone, 'fg' the words alone on a clear canvas (the share sheet draws the two, so a finger
  // moving the picture repaints the cheap half only). No layer: the whole card, which is what Share and Save image export.
  async function paint(spec, opts) {
    opts = Object.assign({ size: 'story', lang: 'en', weights: true, name: true }, opts || {});
    const S = SIZES[opts.size] || SIZES.story, lang = opts.lang === 'fa' ? 'fa' : 'en';
    const tpl = TPL[spec && spec.kind];
    if (!tpl) throw new Error('sharecard: no card called ' + (spec && spec.kind));
    await fonts(lang);
    const want = Object.assign({ coach: ASSET.coach, logo: ASSET.logo, court: ASSET.court }, artList(spec));
    if (opts.photo) want.shot = opts.photo;
    const keys = Object.keys(want), got = await Promise.all(keys.map(k => img(want[k])));
    const imgs = {}; keys.forEach((k, i) => { imgs[k] = got[i]; });
    const c = document.createElement('canvas');
    c.width = S.W; c.height = S.H;
    const x = c.getContext('2d');
    const p = new Painter(x, S, lang, imgs, Object.assign({ first: spec.first }, opts));
    if (opts.layer !== 'fg') drawGround(x, S, imgs, fitOf(opts.fit));
    if (opts.layer !== 'bg') tpl(p, spec);
    c._boxes = p.boxes; c._fit = p.fit; c._size = S;
    return c;
  }
  // The ground alone, drawn again into a canvas the share sheet already has: a finger dragging or pinching the picture
  // costs one drawImage and two fills, never a new layout.
  function reground(canvas, photo, fit) {
    const S = (canvas && canvas._size) || SIZES.story;
    return img(photo).then(im => {
      const x = canvas.getContext('2d');
      x.clearRect(0, 0, S.W, S.H);
      if (im) shot(x, S, im, fitOf(fit)); else ground(x, S);
      return canvas;
    });
  }
  function toBlob(spec, opts) {
    return paint(spec, opts).then(c => new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('toBlob')), 'image/png')));
  }
  // The words the share sheet copies and the phone's share sheet carries. Weights hidden: the change only.
  function caption(spec, opts) {
    opts = Object.assign({ lang: 'en', weights: true }, opts || {});
    const lang = opts.lang === 'fa' ? 'fa' : 'en', t = L(lang), show = opts.weights !== false, d = spec;
    let s = '';
    if (d.kind === 'best') {
      const pr = d.prev;
      const set = show ? kgs(d.w, lang, d.u) + ' × ' + n(d.r, lang)
        : pr && +pr.r === +d.r ? plusKg(d.w - pr.w, lang, d.u) : pr && +pr.w === +d.w ? plusReps(d.r - pr.r, lang) : '';
      s = set ? t.capBest(bidi(d.lift, lang), set) : t.capBest(bidi(d.lift, lang), '').replace(/[:،]\s*\.$/, '.');
    } else if (d.kind === 'effort') {
      const p = { lang, t, opts: { weights: show } };
      const w = effortWords(p, d, true);
      s = t.capEffort(bidi(d.lift, lang), w || '');
    } else if (d.kind === 'retest') {
      const a = d.before, b = d.now;
      const u = d.u;
      const change = [b.w > a.w ? plusKg(b.w - a.w, lang, u) : '', b.r > a.r ? plusReps(b.r - a.r, lang) : ''].filter(Boolean).join(lang === 'fa' ? '، ' : ', ');
      const what = +a.r === +b.r ? (show ? kgs(a.w, lang, u) + ' → ' + kgs(b.w, lang, u) : change)
        : (show ? kgs(a.w, lang, u) + ' × ' + n(a.r, lang) + ' → ' + kgs(b.w, lang, u) + ' × ' + n(b.r, lang) : change);
      s = t.capRetest(bidi(d.lift, lang), what);
    } else if (d.kind === 'cycle') s = t.capCycle(bidi(d.cycle.name, lang), n(d.done, lang), n(d.planned, lang));
    else if (d.kind === 'roadmap') s = t.capRoad(n((d.cycles || []).length, lang), d.weeks ? n(d.weeks, lang) : '');
    else if (d.kind === 'achievement') s = t.capAchievement(lang === 'fa' && d.nameFa ? d.nameFa : d.name);
    else if (d.kind === 'level') s = t.capLevel(n(d.level, lang));
    else if (d.kind === 'mark') s = t.capMark(n(d.n, lang), t.markWords[d.key] || '');
    else if (d.kind === 'honour') s = t.capHonour(t.honourName[d.honour] || '', d.month || '');
    else if (d.kind === 'open') s = t.capOpen(bidi(d.title, lang), n(d.value, lang) + (d.unit ? ' ' + d.unit : ''),
      d.place > 0 && d.field > 0 ? t.placeOf(t.ord(n(d.place, lang)), n(d.field, lang)) : '');
    else if (d.kind === 'player') s = t.capPlayer(n(d.level, lang));
    else if (d.kind === 'goal') s = t.capGoal(d.month || '');
    else if (d.kind === 'session') s = t.capSession(bidi(d.title, lang));
    return (s ? s + ' ' : '') + t.capTail;
  }
  function can(spec) { const tpl = spec && TPL[spec.kind]; return !!(tpl && (!tpl.ok || tpl.ok(spec))); }

  root.ShareCard = {
    paint, toBlob, caption, can, fonts, reground, fitOf,
    kinds: () => Object.keys(TPL),
    SIZES, EN, FA, C,
    // for the tests and Career Mode: the words a win gets, the dates, the digits
    _effortKey: EFFORT_KEY, _dateShort: dateShort, _dateLong: dateLong, _faDigits: faDigits, _toJalali: toJalali,
    // the internals the reward cards (and their tests) are drawn with
    _: { Painter, ST, TPL, styleOf, textW, metrics, drawRun, roundRect, photo, signature, logo, tick, arrow, n, kgs, plusKg, unitW, uOf, dateShort, dateLong, isFaText },
  };
})(typeof window !== 'undefined' ? window : this);
