/* data.js — the Menu items that are not drawn: looks (colour sets), type pairs (fonts), feel (easing and timing), house rules,
 * and the finish settings. Each is callable by its Menu name:  KIT.look('ink-coral')  KIT.font('heavy-italic')  KIT.ease('settle')
 *
 * A look is a map of named colours plus ROLES, so a piece can ask for "the key colour" and get coral in the reel's look and
 * clay in the brand look. The roles are the colour language from INGREDIENTS.md:
 *   normal = ordinary information   key = the important word   fix = the solution   soft = supporting detail
 *   problem = a mistake (drawn as a strike-through, never a second warm colour)     bg = the stage     paper = a light stage
 */
(function (g) {
  'use strict';
  const L = g.L, KIT = g.KIT, P = L.PAL;

  /* ── looks (the seven the reel used) ── */
  const look = (id, doc, colors, extra) => KIT.defData('look', id, Object.assign({ colors }, extra), doc);
  look('ink-coral', 'Black stage, bone type, one coral dot.', { ink: '#0B0B10', bone: '#F2EEE5', coral: '#FF5530' });
  look('coral-block', 'A full coral screen with black type.', { coral: '#FF5530', coralDeep: '#F24A24', ink: '#0B0B10', bone: '#F2EEE5' });
  look('primary-paper', 'Warm paper with ink, coral and cobalt shapes.', { paper: '#F7F3EB', ink: '#0B0B10', coral: '#FF5530', cobalt: '#2A45FF' });
  look('cobalt-deep', 'Deep blue with pearl pink, lilac and mint highlights.', { cobalt: '#2A45FF', deep: '#0A1370', lilac: '#B7A4FF', pink: '#FFB0C8', mint: '#8CF7D8' });
  look('night-spectrum', 'Black night with a six-colour spectrum of light.', { mint: '#5CF0C0', cyan: '#5CCBFF', periwinkle: '#7FA2FF', lilac: '#B7A4FF', pink: '#FF8FB0', coral: '#FF5530' });
  look('daylight-ui', 'Bright screen, white cards, cobalt and one coral switch.', { daylight: '#F7F4EE', card: '#FFFFFF', cobalt: '#2A45FF', coral: '#FF5530', ink: '#0B0B10' });
  look('colour-plates', 'Flat plates in ink, cobalt, mint, coral, bone and lilac.', { ink: '#0B0B10', cobalt: '#2A45FF', mint: '#5CF0C0', coral: '#FF5530', bone: '#F2EEE5', lilac: '#B7A4FF' });

  /* ── the two full looks pieces use through roles ── */
  KIT.defData('look', 'reel', {
    colors: Object.assign({}, P),
    normal: P.bone, key: P.coral, fix: P.mint, soft: 'rgba(242,238,229,.62)', problem: P.coral, bg: P.ink, paper: '#F7F3EB', ink: P.ink,
    display: '"Unbounded"', accent: '"Instrument Serif"', mono: '"JetBrains Mono"', ui: '"Inter Tight"', rtl: false,
  }, 'The showreel look: ink and bone with a hot coral, Unbounded and Instrument Serif. Claude\'s own, not Amir\'s brand.');

  /* Amir's brand on a dark stage (video overlays): clay is the only accent; green is the brand primary and reads as "the fix";
     no yellow, ever. Text on dark uses the tinted inks the apps use (--clay-ink, --green-ink in dark mode). */
  KIT.defData('look', 'brand', {
    colors: { clay: '#C7552F', clayInk: '#F29A78', green: '#0E4A36', greenInk: '#7FD6B0', greenFill: '#1F7A4D', paper: '#FAF7F2', ink: '#1A1A1A', night: '#141414', bone: '#F2EEE5', grey: '#8A8A8A' },
    normal: '#F2EEE5', key: '#C7552F', keyText: '#E06B43', fix: '#1F7A4D', fixText: '#7FD6B0', soft: 'rgba(242,238,229,.62)', problem: '#C7552F',
    bg: '#141414', paper: '#FAF7F2', ink: '#1A1A1A', clayWhite: '#FFFFFF',
    display: '"Barlow Condensed"', accent: '"Barlow Condensed"', mono: '"Space Mono"', ui: '"Barlow"', rtl: false,
  }, 'Amir\'s brand on a dark stage: clay is the one accent, green is the fix, bone is normal, grey is detail. No yellow.');

  /* the colour language as a Menu look: five colours, five jobs */
  KIT.defData('look', 'signal-colours', {
    colors: { bone: '#F2EEE5', clay: '#C7552F', green: '#7FD6B0', grey: '#8A8A8A' },
    jobs: { normal: 'bone', key: 'clay', fix: 'green', detail: 'grey', mistake: 'a clay line through the word' },
  }, 'Five colours, five jobs. Bone is normal, clay is the key word, green is the fix, grey is detail, a clay line is a mistake.');

  KIT.defData('look', 'brand-fa', Object.assign({}, KIT.look('brand'), {
    display: '"Vazirmatn"', accent: '"Vazirmatn"', ui: '"Vazirmatn"', rtl: true,
  }), 'The brand look for Farsi: Vazirmatn, right to left, Persian numerals, no uppercase and no letter-spacing.');

  /* ── type pairs ── */
  KIT.defData('font', 'heavy-italic', { display: '900 {s}px "Unbounded"', accent: 'italic 400 {s}px "Instrument Serif"', faces: ['Unbounded Black', 'Instrument Serif Italic'] }, 'A very wide black sans with an elegant italic serif.');
  KIT.defData('font', 'mono-tag', { mono: '500 {s}px "JetBrains Mono"', faces: ['JetBrains Mono'], caps: true, track: 'wide' }, 'Small tracked capitals in a coding font, for labels and timecode.');
  KIT.defData('font', 'ui-sans', { ui: '600 {s}px "Inter Tight"', faces: ['Inter Tight'] }, 'A tight, clean sans for interface text and numbers.');

  /* ── feel: the easing curves, with the names the Menu gives them ── */
  const E = L.E, ease = (id, doc, fn, tech) => KIT.defData('ease', id, { fn, tech }, doc);
  ease('settle', 'Fast arrival, long soft landing.', E.outExpo, 'outExpo');
  ease('overshoot', 'Goes past the mark, then settles back.', E.outBack, 'outBack');
  ease('glide', 'Slow, fast, slow.', E.inOutCubic, 'inOutCubic');
  ease('rubber', 'Wobbles before it comes to rest.', E.outElastic, 'outElastic');
  ease('bounce', 'Drops and bounces to rest.', E.outBounce, 'outBounce');
  KIT.defData('ease', 'windup', { make: () => L.bezier(0.7, -0.45, 0.25, 1.3), tech: 'cubic-bezier(.7,-.45,.25,1.3)' }, 'Pulls back first, then goes.');
  /* spring(t, hz, damping): a real damped spring, 0 to 1 over time t in seconds */
  KIT.defData('ease', 'spring', { make: (hz = 2.4, z = .42) => t => L.spring(t, hz, z), tech: 'spring(2.4 Hz, 0.42)' }, 'Real spring physics: stiffness and damping.');
  /* stagger(i, step): the delay of the i-th piece */
  KIT.defData('ease', 'stagger', { make: (step = .03) => i => i * step, tech: 'delay = index x step' }, 'Start each piece a little after the last.');

  /* ── house rules: how picture and sound stay locked together ── */
  KIT.defData('rule', 'beat-grid', { bpm: 128, beats: 4, bars: 8, note: '128 beats a minute. Eight bars make exactly 15 seconds.' }, '128 beats a minute. Eight bars make exactly 15 seconds.');
  KIT.defData('rule', 'downbeat', { note: 'Every scene change lands on the first beat of a bar.' }, 'Every scene change lands on the first beat of a bar.');
  KIT.defData('rule', 'anticipation', { frames: 2, note: 'Land one or two frames early so it feels exactly on the beat.' }, 'Land one or two frames early so it feels exactly on the beat.');
  KIT.defData('rule', 'cue-sheet', { offset: .012, note: 'The picture writes down every hit it makes. The sound is built from that list, then delayed 12 ms so it never leads.' }, 'The picture writes down every hit it makes. The sound is built from that list, then delayed 12 ms so it never leads.');
})(window);
