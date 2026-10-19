# Centre Court — the app UI kit

**What this is.** The look of the athlete app (`program.html`), written so a screen can be rebuilt from it. Centre Court was
built screen by screen on 2026-10-12/13 (cache `aap-v124` to `aap-v137`) after the UX audit *Quiet Frame*
(claude.ai/artifact/BBWjsR99FqthXmzCkeyK49). Amir's brief for it: *calm paper, rows with hairlines, one strong green thing on a screen.*

**What wins when this file and the app disagree:** the app. The tokens live in `program.html`'s style sheet; every selector below
says where. Behaviour of each screen is in [`PROGRAM-APP.md`](../PROGRAM-APP.md); the brand bible for social, reels and ads is
[`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md); the working file is [`DESIGN-ATLAS.md`](DESIGN-ATLAS.md).

**Who uses it.** The English athlete app (done), the Farsi course app `tennis/app/` (to be redesigned on this kit: read
[§9, Farsi and RTL](#9-adapting-the-kit-to-farsi--rtl) first), any mock-up or reel that shows the app.

---

## 1. The five rules

1. **One green thing per screen.** A single strong green block (the cover, the open lift's head, the finish band) and everything else
   is paper. Two greens never touch: the foot band under a cover starts on the cover's last colour (`--hero-end`), so there is no seam.
2. **Clay means "look here".** Only what asks the athlete to look: the Coach's note mark, a Because disc, an RPE over target, the
   tempo's hot digit, a banner that asks for something, the week note's numbers, the fault cue's bar, an armed delete. Headers,
   labels, stripes, done tints, charts and buttons are green or grey. (DS-01.)
3. **Text tokens are not fill tokens.** Green text is `--green-ink`, never `--fill`. Small clay text is `--clay-ink`, never `--clay`.
   Fills and borders use `--fill`, `--clay`, `--clay-fill`. Dark mode moves the text tokens and leaves the fills alone.
4. **Every tap target is at least 44 px.** A smaller drawing sits inside a 44 px hit area (a 32 px circle in a 44 px button, a 36 px chip
   in a 44 px chip). Rows are 64 px, primary buttons 44 to 56 px, inputs 48 px. Typed text is 16 px so an iPhone never zooms.
5. **No yellow, gold, ochre or amber, and no third colour.** Green, clay, paper, ink. The one other hue is steel blue (an RPE *under*
   target and a sore check-in).

Also: **one primary button look** (green, `--btn`); a secondary is outlined. **One colour set**, declared once. **Dark mode is the
athlete's choice**, never the phone's.

---

## 2. Tokens

All colour tokens are declared in the block **THE APP'S ONE COLOUR SET** (`program.html` L206): light on `body`, dark on
`body[data-dark]`. **Never on `:root`**: a custom property holding `var()` resolves where it is declared, and dark mode is an
attribute on `body`, so a token on `:root` would never turn dark. A new colour joins that block, light and dark, and nowhere else.

### 2.1 Surfaces and ink

| Token | Light | Dark | For |
|---|---|---|---|
| `--paper` | `#FAF7F2` | `#181818` | the page |
| `--sand` | `#F1ECE3` | `#202020` | a quiet band (How hard? keys, the Library switch) |
| `--row` | `#FFFFFF` | `#242424` | a white row, a set box, a door row |
| `--hair` | `#E4DDD1` | `#2C2C2C` | hairlines between rows |
| `--box` | `#D8D1C5` | `#4A4A4A` | a button or chip outline, a sheet handle |
| `--field` | `#A89F92` | `#5A5A5A` | the edge of a typed-in box (2.44:1, so a box reads as a box) |
| `--ink` | `#1A1A1A` | `#EDEDED` | text |
| `--grey` | `#5C5C5C` | `#9A9A9A` | secondary text, captions |
| `--ring` | `#8A8378` | `#666666` | a plain ⓘ ring, a locked row, a grey chevron |
| `--ph` | `#6B6B6B` | `#8F8F8F` | placeholder text |
| `--tint` | `rgba(14,74,54,.08)` | `rgba(109,190,149,.13)` | pressed state, a pill's background |
| `--prog-track` | `rgba(14,74,54,.12)` | `rgba(109,190,149,.16)` | the empty part of a progress bar |

### 2.2 Green

| Token | Light | Dark | For |
|---|---|---|---|
| `--fill` | `#0E4A36` | same | green fills and borders (never text) |
| `--green-ink` | `#0E4A36` | `#6DBE95` | **green text**, outlined numerals, section titles, icons on paper |
| `--mint` | `#6DBE95` | same | on a green surface: the eyebrow dot and words, progress, the ring |
| `--mark` | `var(--fill)` | `#1B7254` | a selected key, the live set's disc, the made tick (`#0E4A36` sinks on `#181818`) |

The green surfaces are gradients, all four re-tuned for dark:

| Token | Light | Dark | For |
|---|---|---|---|
| `--hero` | `radial-gradient(125% 90% at 100% 0%, #1B7254 0%, #0E4A36 46%, #082D20 100%)` | `… #17654A 0%, #0D4532 46%, #072A1E 100%` | **the cover**: every green block |
| `--hero-end` / `--hero-end-a` | `#06241A` / `rgba(6,36,26,.55)` | `#051F16` / `rgba(5,31,22,.55)` | the cover's last colour; the scrim ends on it |
| `--btn` | `radial-gradient(120% 120% at 0% 0%, #1B6A4E 0%, #0E4A36 55%, #0B3E2D 100%)` | `… #23815C 0%, #1D7656 55%, #1B7254 100%` | **the primary button**; also a selected tab or chip (white text 4.8:1 or better; darkest stop 3:1 on paper) |
| `--foot` | `radial-gradient(120% 140% at 100% 100%, #0C3F2E 0%, #083024 40%, var(--hero-end) 68%)` | `… #0A3828 0%, #072A1E 40%, var(--hero-end) 68%` | the band under a cover (before Start, New best) |
| `--bar` | `radial-gradient(160% 260% at 100% 0%, #17664B 0%, #0E4A36 45%, #0A3829 100%)` | `… #155E45 0%, #0D4532 45%, #082F22 100%` | the slim session bar |
| `--tile-on-green` | `radial-gradient(120% 150% at 0% 0%, #24855F 0%, #16603F 52%, #0E4A36 100%)` | `… #1F7655 0%, #13573F 52%, #0D4532 100%` | a light-ring button or a tile **on** a green surface |
| `--on-accent` | `#FFFFFF` | same | text on any filled button |

### 2.3 Clay and steel

| Token | Light | Dark | For |
|---|---|---|---|
| `--clay` | `#C7552F` | same | the brand fill: the Coach's note dot and quote mark, the fault cue's bar |
| `--clay-fill` | `#C2512C` | same | **the fill under white text**: a Because disc, an over-target tag, a banner stripe, an armed button (never `#C7552F` under white) |
| `--clay-ink` | `#B5461F` (5.1:1) | `#E06B43` | **small clay text** |
| `--clay-big` | `#C7552F` | `#E06B43` | clay text at 18.66 px bold or larger |
| `--clay-on-green` | `#E06B43` | same | clay on a green surface (week limits, the tempo's hot digit, a cycle bar) |
| `--steel` | `#3E6A92` | `#8DB3D6` | RPE under target; a sore check-in's stripe |

### 2.4 Old names

Still in the sheet as aliases, so a new rule never uses them: `--yellow` = `--fill` (it is **green**), `--ice` = `--clay`,
`--grey-bg` = `--paper`, `--grey-card` = `--sand`, `--grey-mid` = `--box`, `--grey-text` = `--grey`, `--grey-dark` = `--ink`,
`--white` = `--row`, `--rpe-under` = `--steel`, `--tile` = `--btn`, `--info` = `--ring`. (Their dim/mid/glow variants, `--yellow-dim`,
`--ice-glow` and so on, remain for old rules.)

### 2.5 What is not a token

Radii, shadows, spacing and easing are written out in the rules; the app has no `--r*`, `--space*`, `--shadow*` or `--ease`. Use these:

| | Values |
|---|---|
| **Radii** | 8 px every button · 10 px inputs, RPE keys, chips on a cover · 12 px door rows, shelf bands, note textarea · 14 px the How-to row, the Library switch, the hint · 16 px a cover inside the gutter, a toast, a sheet's top corners · 999 px / 50 % pills and the glass circles · 3 px bars |
| **Shadows** | almost none; paper rows have none. The light-ring button: `inset 0 0 0 1px rgba(255,255,255,.22), 0 10px 22px -10px rgba(0,0,0,.6)`. The note box: `0 12px 40px rgba(0,0,0,.4), inset 0 0 0 1px rgba(255,255,255,.08)` |
| **Hairline** | `1px solid var(--hair)`, never on the first row of a list; the last row's spacing is margin, not a border |
| **Motion** | plain `ease`. Press: `transform .1s`, `:active` scale .97 to .98 (.92 on the glass circles). Chevron turn `.2s`; a fold `.3s` on `grid-template-rows 0fr→1fr`; entrances `.2` to `.35s` (`fadeUp`, 16 px). The ring `1s linear`. The only custom curve, `cubic-bezier(.16,1,.3,1)` (the brand's house ease), is on Sign-in |

---

## 3. Type

Three families, each with one job:

| Face | Used for | Weights that load |
|---|---|---|
| **Barlow** (body default) | sentences, row names (600 at 18 px), inputs (500 at 16 px), the › glyph | 300 to 700 |
| **Barlow Condensed** | **every button and link** (700, capitals, 1 px tracking), cover titles (900), numerals (900), section titles (700 at 15 px), set numbers, RPE keys (700 at 22 px) | 400, 600, 700, 900. 900 also ships as our own file, `AA Barlow Condensed` (`/assets/fonts/BarlowCondensed-900.woff2`, pre-cached), so a phone offline still draws it condensed |
| **Space Mono** | every eyebrow, caption, meta line and clock: 11 px, capitals, 1 to 2 px tracking. The session clock is 700 at 32 px | 400, 700 |

`button, input, select, textarea { font: inherit }`. Only the weights above are requested; a weight that is not loaded is faked, so a
rule never says 800.

### 3.1 The scale (`:root`, one step per job)

| Token | px | For |
|---|---|---|
| `--fs-label` | 11 | Space Mono labels, eyebrows, pills, the tab bar, meta lines. **The floor** |
| `--fs-small` | 13 | a secondary line, a helper sentence, a small button |
| `--fs-body` | 15 | notes, cues, rows, buttons |
| `--fs-field` | 16 | what the athlete types |
| `--fs-lead` | 18 | a card's or sheet's title, a closed card's name, a control's digits |
| `--fs-title` | 22 | a section title, the open card's name, a number in a row |
| `--fs-head` | 28 | a heading inside a screen, a day's number, a scoreboard value |
| `--fs-display` | 44 | the title at the top of a screen |

Display pieces outside the scale (32 px and up: the rest timer's 96, the cover titles' `clamp(28px, 8.4vw, 36px)` and the day cover's
`clamp(32px, 11.3vw, 44px)`) carry a `/* display: … */` comment. `scripts/check_type_scale.py` (pre-commit guard 12) blocks any other
size and anything under 11 px. A new rule picks the step by its job and never invents a size.

### 3.2 Which face, where

- **Cover title:** Barlow Condensed 900, `clamp(28px, 8.4vw, 36px)`, line-height .96, 0.3 px tracking, capitals, white, `text-wrap: balance`,
  no mid-word break, `max-width` about 330 px, `text-shadow: 0 1px 10px rgba(6,36,26,.55)` over a photo. A day's cover goes up to 44 px.
- **Title on paper:** the screen's name (`.prog-title`) is 900 at 44 px, line-height 1, capitals, `--ink`. A sheet's title is 900 at 28 px.
- **Eyebrow:** Space Mono 700, 11 px, 2 px tracking, capitals (see §5.2).
- **Section title:** Barlow Condensed 700, 15 px, capitals, `.08em`, `--green-ink`, a hairline to the edge (§5.9).
- **Meta line under a title:** Space Mono 400, 11 px, 1 px tracking, capitals, white at .8 (grey on paper).
- **Row name / sub:** Barlow 600 at 18 px, ink / Barlow 400 at 13 px, grey.
- **Numbers that line up** (scoreboard, set table, clocks): `font-variant-numeric: tabular-nums`.

---

## 4. Gutter, spacing, frame

- **`--g`** is the gutter: 20 px, 16 px under 360 px wide (`body { --g: 20px }`); `.step-scroll` (Guided) uses 16; a sheet uses `--g`
  and 24 px from 560 px wide. **Every piece carries `--g` itself and panels are full-bleed** (a hairline runs to the screen's edge).
- **Rhythm:** a section starts 22 to 28 px below the last; a row is 64 px high (74 for an exercise row, 54 when done) with 10 to 12 px of padding;
  door rows are 10 px apart; an eyebrow's dot and words are 8 px apart; the mint dot is 7 × 7.
- **The frame:** the app is a 520 px column (`--app-w`; fixed chrome offsets by `--app-gutter`). From 560 px wide the screen gets a 1 px
  `--box` edge and a soft side shadow, and a sheet becomes a centred dialog.
- **The demo banner:** full-screen layers offset by `--demo-h`, the banner's measured height.

---

## 5. The parts

Each part says where it lives. Selectors repeat per screen (the cover is not one shared class, §10), but the inside is always this.

### 5.1 The cover — *the one green thing*

A full-width block: `background: var(--hero); color: #fff; isolation: isolate; overflow: hidden`. Corners 0 when full-bleed (a day, a
Library session, the archive, the welcome), 16 px when it sits inside the gutter (`.dc-hero`, `.cyc-card`, `.coach-panel`, `.pb-cover`) and 12 px
for a shelf band (`.shelf-band`, min-height 96).

Three layers make the picture:

1. **The photo,** graded: `position: absolute; inset: 0; object-fit: cover; mix-blend-mode: luminosity; opacity: .7` (.66 on the cycle and
   playbook covers), `object-position: 84% 58%` (the subject sits right), and a mask so the words have clean green on the left:
   `mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,.2) 28%, #000 70%)`.
2. **The scrim:** `linear-gradient(180deg, transparent 30%, var(--hero-end-a) 78%, var(--hero-end) 100%)`.
3. **The caption,** over both, with a 44 px glass ← at the top left (§5.8). Padding `74px var(--g) 22px` on a full-bleed cover (room
   for the glass button), 56 on the home card, 44 on a cycle or playbook cover, 26 on the coach panel.

A cover with no picture (Records, Body weight) is the same `--hero` with the same caption padding. A cover ends on ONE colour, `--hero-end`,
and what sits under it (the foot band, the bar before Start) starts on it.

Where: day `#day-view-card .cm-banner*` (L2941), home `.dc-hero` (L4351), cycle `.cyc-card` (L4458), coach `.coach-panel` (L2404), session
and article `.ws-header` (L4222), archive `.archive-banner` (L4571), shelf `.shelf-band` (L4141), welcome `.wel-hero` (L4696), Records `.ceil-head` (L2493).
Sign-in is the one exception: a hero **colour** with the photo as an `<img>` fading over it, so the form never waits on a photo.

**Foot band** (`--foot`, 1 px `rgba(255,255,255,.10)` top border): under the day cover before Start (`.session-timer`, L2981) and for a New best
(`.ceil-pr`, L2606). **Finish band:** `.session-confirm.ready .confirm-body` is `--hero`, padding `26px var(--g) 28px`.

### 5.2 The mint-dot eyebrow

`display: flex; align-items: center; gap: 8px; font: 700 var(--fs-label)/1.2 'Space Mono'; letter-spacing: 2px; text-transform: uppercase;`
colour `--mint` (or `rgba(255,255,255,.84–.88)` on a few covers). The dot is `::before`, 7 × 7, `border-radius: 50%`, `background: var(--mint)`.
Multi-line eyebrows start-align with the dot 3 px down. On paper it is `--green-ink` (or `--grey`) with a green dot (`.prog-eyebrow`, `.home-greet-hi`,
`.readiness-eyebrow`). The words are always short: *● DAY 1*, *● THIS CYCLE · 2 OF 3*, *● YOUR COACH*, *● REST · BARBELL BACK SQUAT*.

### 5.3 The condensed title

§3.2. Classes: `.day-card-name`, `.ws-title`, `.cyc-name`, `.archive-title`, `.ceil-title`, `.pb-title`, `.coach-panel-title`, `.shelf-t`, `.wel-title`,
`.signin-title` (44 px; *COACH* in `--clay-on-green`), `.complete-title`. The open exercise head's name is 900 at 28 px, line-height .94. Under a title:
the mono meta line (*50 MIN · BARBELL*).

### 5.4 The scoreboard

Values over captions in equal columns, under a hairline, **on a cover**:

- **Records / Body weight** `.ceil-board` (L2504): `display: grid; grid-auto-flow: column; grid-template-columns: repeat(n, minmax(0, 1fr)); margin-top: 20px;
  padding-top: 14px; border-top: 1px solid rgba(255,255,255,.16)`. Value: Barlow Condensed 900 at `--fs-head`, line-height .9, white, tabular. Caption:
  Space Mono 400 at 11 px, 1 px tracking, capitals, `rgba(255,255,255,.72)`; 7 px between them.
- **The open exercise head** `.ex-numline` (L3314): four tracks (the first `minmax(25%, max-content)`), *4 × 6* SETS×REPS · *7* RPE · *3-1-1* TEMPO · *2:30* REST,
  12 px above and below its hairline; the tempo's hot digit is `--clay-on-green`.
- On paper: `.cf-board` (Log a max), two columns, `border-top: 1px solid var(--hair)`, numbers 900 at `--fs-head` in `--green-ink`.
- An empty value is `—`.

### 5.5 The paper row with hairlines

No box, no white, no shadow, no stripe. `min-height: 64px; padding: 10–12px 0; row + row { border-top: 1px solid var(--hair) }`. Name 600 at
`--fs-lead` ink; sub 400 at `--fs-small` grey (or a mono 11 px line); a grey › at the end (600 at `--fs-title`). `:active { background: var(--tint) }`;
`:focus-visible { outline: 2px solid var(--green-ink); outline-offset: -2px }`. Examples: `.dc-row` (grid `44px 1fr 44px`, gap 10), `.shelf-row`, `.road-head`,
`.archive-ex`, `.ceil-lift`, `.wp-row`, `.hs-row`.

The exercise row on the day: grid `44px 1fr 44px`, gap `0 12px`, min-height 74, padding `14px var(--g)`; the hairline is inset to start at the name
(`left: calc(var(--g) + 56px)`).

### 5.6 The outlined P24 numeral

The row's number, and its checkbox. Barlow Condensed 900, 32 px, line-height 1, `color: transparent; -webkit-text-stroke: 1.5px var(--green-ink);
paint-order: stroke fill`, tabular, zero-padded (*01*, *06*, *10*). **Done turns the fill solid green** (`color: var(--green-ink)`). In a 44 px column; the
tap target under it is the whole left column of the row. `.ex-num` (L3190, pulled in by `margin-left: -56px`), `.dc-num`, `.road-num` (next:
stroke 45 % between green and `--ring`; locked: `--ring`), `.archive-ex-num`. On a green head the numeral becomes the mint eyebrow (*● 06*).

### 5.7 The door row and the fold row

**Door row** `.hrow` (Home, Progress, Coach, Records, sheets): `display: flex; gap: 14px; min-height: 64px; margin: 0 var(--g) 10px;
padding: 12px 14px 12px 16px; border: 1px solid var(--hair); border-radius: 12px; background: var(--row)`. A 22 px green line icon (`.hrow-ic`);
the door's NAME (`.hrow-l`, Number First, 2026-10-19): Barlow 600 at `--fs-field`, sentence case, ink — the fold rows' recipe — **unless the door carries a figure**
(`.hrow-b:has(.hrow-vv)`, the five number rows), where the figure leads and the name drops to Barlow 600 at `--fs-small` in `--green-ink`. ONE rule over all seven
scopes; it was 11 px Space Mono tracked capitals declared six times. The value in Barlow 700 at `--fs-lead` ink (`.hrow-v`;
`.is-togo` clay-ink for something that asks, `.is-ok` green-ink); an optional 60 × 24 sparkline in `currentColor`; a grey › (`.hrow-a`). It looks the same
with or without data (`.quiet` changes only the words).

**Fold row** (`.cn-row`, `.note-card`, `.rate-fold`, `.ceil-help`, `.road-head`): a row that opens. The chevron is a CSS mask, `--chev-down`, 18 px,
`background: var(--grey)`, turns 180° (`.2s`); the body opens by `grid-template-rows: 0fr → 1fr` (`.3s`). The body is indented to the text (`padding: 0 0 20px 36px`
under a 22 px icon). Enter and Space open it, `aria-expanded` says whether it is open. **A closed fold shows no history.**

### 5.8 Buttons

**Primary** (one look, the list `ONE PRIMARY BUTTON` at L2373): `background: var(--btn); color: var(--on-accent); border: 0; border-radius: 8px;
min-height: 44px`; Barlow Condensed 700, capitals, 1 px tracking. Full-width 52 px (sign-in, welcome, readiness) at `--fs-body`/`--fs-lead`; Done 56 px;
Rest 48 px, min-width 132. **A new primary action joins that list. Never clay.**

**Outlined secondary:** `background: transparent; color: var(--ink)` (or `--green-ink`); `box-shadow: inset 0 0 0 1.5px var(--box)` (`--field` on the error screen).
**Armed (a destructive first tap):** `background: var(--clay-fill); color: #fff` (anything that deletes takes two taps: `armedTap()`).
**Selected segment or chip:** `--btn` (or `--mark` for a key; dark swaps `--fill` for `--mark`). Unselected: `--row`, `inset 0 0 0 1px var(--box)`, radius 10.

**Light-ring button on green** (the cover's Start, Open WhatsApp, the note box's OK): `background: var(--tile-on-green); box-shadow: inset 0 0 0 1px
rgba(255,255,255,.22), 0 10px 22px -10px rgba(0,0,0,.6); color: #fff; border-radius: 8px`; 700 at `--fs-lead`, capitals, 1 px tracking; `.1s` press.
Its twin on green is outlined: transparent with `inset 0 0 0 1.5px rgba(255,255,255,.5)`.

**44 px glass ← and ✕** (on a cover): `display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; color: #fff;
background: rgba(0,0,0,.22); backdrop-filter: blur(6px)`; `:active` scale .92; `:focus-visible` a 2 px white outline, offset 2. Absolute, top 8 px, left 8 px (back),
right 8 px (close, the moon). Guided's *?* and ✕ and the timer's sound and ✕ are the same circle. One close grammar: **← top left for a screen, ✕ top right for a
full-screen overlay, a sheet slides down.**

**Text link** (More, Open day, Refresh, Test 5RM): Barlow Condensed 700 at 15 px, 0.8 px tracking, capitals, `--green-ink`, a 44 px tall hit, a drawn › after it.

### 5.9 Section title and fold-open lists

Barlow Condensed 700, `--fs-body`, `.08em`, capitals, `--green-ink`, `padding-left: var(--g)`, `margin: 26px 0 12px`, `::after { flex: 1; height: 1px;
background: var(--hair) }`, an optional count in Space Mono 11 px grey at the right. (`.prog-sec`, `.section-title`, `.lib-sec`, `.archive-day-title`, `.wp-head`.)
Block titles inside a day are the same, with the block's rest at its end.

### 5.10 The banner (4 px stripe)

A white row (`--row`), full width, hairline above and below, **`box-shadow: inset 4px 0 0 <colour>`**:

| State | Stripe | Label (Space Mono 700, 11 px, 1.2 px tracking, capitals) |
|---|---|---|
| Asks for something | `--clay-fill` | `--clay-ink`: *UPDATE*, *SAVED FOR YOU*, *LOWER DAY* |
| Sore check-in | `--steel` | steel |
| Neutral | `--ring` | `--grey`: *OFFLINE* |

Under the label a sentence (Barlow 500 at `--fs-body`, ink) and ONE green condensed text link as its action. `.rd-in` (L3862), `.ws-before` (L4251, collapsible),
`.ceil-due` (L2535), `.plan-offline`, `.uf-card` (L2862). **Sign-in's error** is the same row with 10 px corners and 12 px 14 px 12 px 18 px padding.

### 5.11 The note box, the Coach's note, the hint

Notices have **three looks only**, plus the install card: the banner (§5.10), the note box and the first-session hint.

- **Note box** `.aa-toast` (`aaToast()`): a green cover box in the middle of the screen, above the sheets (z 215). `background: var(--hero); color: #fff;
  border-radius: 16px; padding: 20px 18px 16px; gap: 12px`; a mint-dot eyebrow (`.aa-toast-k`: *How to log*, *No weight*), text Barlow 500 at `--fs-body`, buttons
  44 px: a light-ring OK, an outlined one beside it.
- **Coach's note** (a pull quote on paper): no box; `padding: 16px 0 0 56px`; Barlow 500 at `--fs-field`, ink; a clay “ at the left (Barlow Condensed 900 at
  `--fs-display`, `--clay`; dark `--clay-ink`) in a 44 px column; three lines then *More*. The same pull quote carries `.ar-callout`; the road's Now card no longer wears it (2026-10-19, Doors: Amir's first sentence there keeps one 3 px clay stripe, `.road-from`, and no glyph, which drew as two slabs); on a cover it is
  `--clay-on-green`.
- **First-session hint** `.onb-hint` (P66): `background: var(--tile)`, radius 14, `padding: 14px 6px 10px 14px`, a 12 px rotated notch, Amir's 32 px photo, a mint *GOT IT*.
- **Textarea:** min-height 88 px (96 in the finish), `padding: 12px 14px`, `1px solid var(--box)`, radius 12, `--row`, 16 px.

### 5.12 The sheet and its sticky top row

`.readiness-modal` is the frame (`padding: 0 var(--g) calc(24px + env(safe-area-inset-bottom))`, `--paper`, top corners 16 px; a centred dialog from 560 px).
**`.sheet-bar`** is the one top row on every sheet (L2713): `position: sticky; top: 0; z-index: 5; min-height: 56px; margin: 0 calc(-1 * var(--g)); background: var(--paper)`.
A 40 × 5 handle in `--box` sits 7 px from the top (no handle from 560 px wide). **‹ Back** on the left only when a page is behind it, **Close** on the right; both
`.sheet-back` / `.sheet-close` are 44 px tall, Barlow Condensed 700, `.8px` tracking, capitals, `--green-ink`. A scrolled sheet gets `0 1px 0 var(--hair)` under the bar.
The About sheet (`.ax-sheet`) is the green exception: a transparent bar with white buttons that turns solid `--fill` once the page scrolls under it. A page's head is a
green-dot eyebrow, a 28 px title and a grey 15 px sub. There is no grey Close at the foot.

### 5.13 Amir's signature

How the app shows his voice: under the week note, the Coach's note on the Why card, the finish, the welcome, the coach panel, the About sheet, the hint.

- **`WN_SIG`** is the inline SVG (a drawn stand-in) in `.wn-sig`, 124 × 44, `margin-left: -3px`, `color: var(--green-ink)`; white and 104 × 37 on green.
- **His photo** `.wn-av`: 44 × 44 circle, `box-shadow: 0 0 0 2px var(--white), 0 3px 10px rgba(0,0,0,.14)`; 40 px with a 2 px `rgba(255,255,255,.92)` ring on green; 32 px in the hint.
- **The row** `.wn-sign`: `display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-top: 14px; padding-top: 6px;
  border-top: 1px solid var(--grey-mid)` (`rgba(255,255,255,.16)` on green).

His photo shows **once** per card; where the signature already carries it, no second avatar.

### 5.14 The rest

- **The set table** (L3452): columns `--c-set` 44 | kg 1fr | reps 1fr | `--c-tag` 92 | `--c-tick` 44, gap 12 (narrower under 360). Row 60 px with a hairline; boxes 48 px, `1px solid var(--field)`, radius 10,
  `--row`, 500 at 16 px. The live set's number is a 32 px disc in `--mark` with a white numeral; a done set is bold with no box. **RPE keys** are 48 px (Barlow Condensed 700 at 22 px, radius 10);
  over target is `--clay-fill` with white, under is `--steel` with white. **How hard?** is a `--sand` band hanging off its set.
- **Intent pill** `.ex-summary-pill.modifier`: radius 999, `--tint`, `--green-ink`, Space Mono 700 at 11 px, 1 px tracking, capitals (on green: `rgba(255,255,255,.14)`, white).
- **ⓘ** `.ex-about`, a 44 px hit: plain is a 22 px ring (1.5 px `--ring`); a Because is a 28 px `--clay-fill` disc with a white *i*.
- **The Library switch** `.lib-switch`: three equal tabs in a `--sand` pill (radius 14, 4 px padding, `1px solid var(--hair)`); a tab is 52 px high, the word in Barlow Condensed 700 at 15 px over a mono count; the selected tab is `--btn`.
- **Chips** `.xl-chip`: a 44 px hit with a 36 px pill drawn inside; selected is `--btn`.
- **Inputs** `.xl-search`, `.signin-f input`, `.wt-input`: 48 px, `1px solid var(--field)`, radius 10, `--row`, 500 at 16 px; focus is `--green-ink` plus `0 0 0 1px var(--green-ink)`.
- **The slim session bar** (L3031): sticky, a 56 px row on `--bar`, a 3 px progress line with a mint fill; the week's limits are its one extra row (Space Mono 700 at 11 px; the numbers in `--clay-on-green`).
- **Rest timer:** a green band then paper; ring 220 px (it shrinks at 720 and 620 px of height), stroke 5, mint progress, white 96 px digits.
- **Progress's road** `.road-row` (L4507): `is-done / is-now / is-next / is-locked`, the P24 numeral, a mint *NOW* tag, a fold on the current cycle. Inside Now (Doors): the tagline, the aims (`.road-aims`, one text edge `--road-edge`), Amir's first sentence signed (`.road-from`), two fold rows (`.road-unit`, the `.ceil-help` grammar) and the Because door.
- **Charts:** the line and every dot green, grey axes; clay only for a real fall.

---

## 6. Dark mode

The athlete chooses it (Account → Theme); neither app follows the phone. It is `body[data-dark]`. In dark: the paper is `#181818`; the **text** tokens lighten
(`--green-ink` `#6DBE95`, `--clay-ink` and `--clay-big` `#E06B43`, `--steel` `#8DB3D6`); the **fills** do not (`--fill`, `--clay`, `--clay-fill`, `--on-accent` stay);
the four green gradients are re-tuned; a selected key uses `--mark` because `#0E4A36` sinks on `#181818`.

---

## 7. A screen, top to bottom

The skeleton every screen follows (Home, Progress, Coach, Records, a Library session, the archive, the welcome):

1. **Cover or title.** A green cover with the glass ← (a screen reached from another), the mint-dot eyebrow, the condensed title, the mono meta line, the scoreboard if there are numbers. A tab root
   has no ←: its header is the eyebrow on paper over the 44 px title (*Progress*), and the cover is its first card.
2. **Section titles** (green, hairline to the edge) over **paper rows** or **door rows**, with folds for anything long.
3. **At most one primary button,** at the bottom of the thing it finishes.
4. **Notices** are a banner in the flow, a note box on top, or the first-session hint; a sheet for anything that needs a page.
5. **The tab bar** (Home · Progress · Library · Coach) hides from Start until Done in a session; the slim bar replaces it.

---

## 8. Checks

`scripts/check_type_scale.py` (pre-commit guard 12) holds the type scale. (`scripts/check_site_style.py` is for the public site, not the app.) The headless suites for the app are named per screen in
`PROGRAM-APP.md` (`home-progress.js`, `coach-tab.js`, `records-weight.js`, `library.js`, `guided-rest.js`, `sheets-notices.js`, `entry-screens.js`, `progress-road.js`);
`ds01-test`-style colour checks fail on clay outside the §1 list.

---

## 9. Adapting the kit to Farsi / RTL

*Principles only. The Farsi course app (`tennis/app/`) is redesigned on this kit by a separate session, which decides the details.* The audience, voice and the
existing Farsi rules are in `DESIGN_SYSTEM.md` §2 and `DESIGN-ATLAS.md`; this section says what happens to each part of the kit.

### 9.1 Script-neutral: copy as it is

Every colour token and its dark value · the five rules · radii, hairlines, the 44 px targets · `--g` and the rhythm · the cover's layers (photo grade, scrim, `--hero`) · the foot band ·
the banner's recipe (4 px stripe, label, sentence, one link) · the primary, outlined and light-ring buttons (the shapes and colours) · the glass circle · the fold's behaviour · the set table's
logic · dark mode · motion durations · the "one primary button, one green thing" discipline. Clay still means "look here".

### 9.2 Needs a Farsi variant

| Part | Latin version | In Farsi |
|---|---|---|
| **Capitals** | eyebrows, titles, buttons, section titles are uppercase | **No uppercase** (it does not exist). Drop `text-transform`. Weight and size carry the emphasis |
| **Letter-spacing** | 1 to 2 px on mono and condensed | **`letter-spacing: 0` everywhere.** Tracking disconnects the letters. This removes the eyebrow's wide-set look, so the eyebrow is carried by the dot, the weight and the colour |
| **Display face** | Barlow Condensed 900 | Vazirmatn 800 to 900. Its natural width is larger, so sizes run about 25 % smaller than the Latin title and line-height rises from .94 to 1.22 to 1.32; a tight line clips the dots and tails |
| **Mono face** | Space Mono, capitals, 11 px | Space Mono has no Persian letters. Use Vazirmatn 600 at **12 px or more** (13 safer) for eyebrows, captions and meta lines. The floor moves from 11 to 12 |
| **Body** | Barlow 15 px | Vazirmatn 400 to 600 at 15 to 16 px, line-height about 1.6 |
| **Numerals** | Barlow Condensed digits | **Persian numerals ۰–۹** in anything the athlete reads. A counter, a clock, `4 × 6`, a tempo (`3-1-1`) and any value that must keep its order stay `direction: ltr` so the digits are not reversed. Check that the outlined numeral (`-webkit-text-stroke`) draws cleanly in the Persian digit glyphs before using P24; if not, use a solid numeral in `--green-ink` with a hairline ring |
| **Arrows and chevrons** | › opens, ← goes back | › becomes ‹ and ← becomes → (flip the masked chevron with `transform: scaleX(-1)`, or use the logical icon). The glass back button sits at the **top right**, the close at the top left |
| **Side-dependent layout** | `left`, `margin-left`, `padding-left`, `inset 4px 0 0` | Write it with logical properties (`margin-inline-start`, `padding-inline-start`, `inset-inline-start`) so one rule serves both. The P24 numeral column and the row's chevron swap sides on their own in a `dir="rtl"` grid; the banner's 4 px stripe goes to the **right** edge; a fold's body indent moves to the right; the sheet's ‹ Back is on the right and Close on the left |
| **Photo** | the subject sits right (`object-position: 84%`), the mask clears the left | Mirror the cover: the subject sits **left**, the words sit right (`object-position` about 16 %, mask `270deg`). Do not flip the photo itself |
| **Progress and bars** | fill left to right | fill right to left; the road reads right to left |
| **Signature** | `WN_SIG` + photo at the right, the line above it | The photo and drawing keep their shape (**a signature is not mirrored**); the row aligns to the start side. The signed words are Amir's Farsi, read by him first |

### 9.3 Stays left-to-right inside an RTL screen

Clocks and timers, the set table's *kg × reps*, tempo, RPE scale and the digit order of any number, handles and URLs, chart time axes (keep time moving left to right;
decide once and apply it to every chart), the ▶ play glyph, the tennis-ball and tick glyphs, phone mock-ups in a reel.

### 9.4 Practical

- Set `dir="rtl"` and `lang="fa"` on the page; set `dir="ltr"` on the counters named above.
- **Fonts:** Vazirmatn 400 to 900 (a variable file is one request). Self-host it: the Farsi apps run in Iran, and a Google Fonts link may not load there (`CLAUDE.md`, *Unverified from Iran*).
  The same applies to Barlow Condensed for the Latin numerals the Farsi site keeps.
- **Copy:** the app speaks as Amir; the course app's Farsi is warm and colloquial, never translated word for word from the English (`DESIGN_SYSTEM.md` §10).
- **Colours and contrast are not retested** just because the script changed; a Farsi size at the 12 px floor still has to hit the same text-token contrast.

---

## 10. Gaps in the kit (suggestions, not yet done)

Things a rebuild would trip over, found while writing this. None is changed.

1. **The cover is copy-pasted per screen** (about nine selectors with the same photo grade, scrim and caption, and corner radii of 0, 12 and 16). One `.cover` class with
   a `--cover-pad` variable would stop them drifting, and the Farsi app could take the same class.
2. **No radius, shadow or easing tokens.** The values in §2.5 are repeated as literals. `--r-btn: 8px`, `--r-row: 12px`, `--r-card: 16px` and `--ease` would let the Farsi variant mirror or retune in one place.
3. **Reduced motion is honoured on very little** (the road fold, a few chevrons, the spinner). Press scales and entrances run regardless.
4. **The Coach's-note quote mark** uses `--clay` in light and `--clay-ink` in dark, while the rule says fills are `--clay`; it is a 44 px glyph so both pass, but the rule and the code differ.
5. **`--yellow` and `--ice` are still names** in the sheet (aliases). A rename sweep would remove the one trap a new reader falls into (`--yellow` is green).
