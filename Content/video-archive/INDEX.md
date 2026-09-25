# Video archive: index

*Written by `archive.py build` from `catalog.json`. Do not edit by hand.* **Look here before you generate any clip** (the spend protocol in `.claude/skills/video/SKILL.md`: reuse before you generate). Search this file by what a clip SHOWS, not by its name. Amir opens `index.html` in this folder for the visual version.

Where files live: `clips/` and `app-clips/` are in git; `reels/` and `private/` are NOT in git (OneDrive only, so a cloud session will not have them). ⚠️ An entry marked **RESTRICTED** must not be used in an ad.

## Finished ads (reels) (3)

### `reel-7-dawn-to-floodlights`: Reel 7: Dawn to Floodlights
- **Shows:** 30 s silent Farsi ad for the tennis course (TPS). A clay ball hops along a court baseline through the 16 weeks and four blocks, the real demo in a phone, and it ends on the button «هفته‌ی ۱ رو رایگان امتحان کن». Made from stills, no video clips.
- **File:** `reels/2026-09-20_reel-7-dawn-to-floodlights.mp4` · 2026-09-20 · 30.0 s 1080x1920 · private (not in git)
- **Usable:** The whole file.
- **Tags:** reel, farsi, course, tps, ad, silent, 30s
- **Source:** Content/reel-7-course/ (rebuilds from src/; export with .claude/skills/reel/tools/render_mp4.js)
- **Notes:** Approved by Amir ('incredible'). An identical copy sits on his Desktop as ZFe0Pmm5cZ9N5OHqb3geZg.mp4.

### `reel-8-16-weeks-hook-a`: Reel 8: 16 Weeks, hook A
- **Shows:** 20 s silent Farsi ad for the tennis course on four generated video clips (clay burst, chalked grip, floodlit pivot, night court), a rail of 16 weeks, the real demo in a phone, and the free-week button. Hook A: «۱۶ هفته تا بدنِ تنیسی.»
- **File:** `reels/2026-09-20_reel-8-16-weeks-hook-a.mp4` · 2026-09-20 · 20.0 s 1080x1920 · private (not in git)
- **Usable:** The whole file.
- **Tags:** reel, farsi, course, tps, ad, silent, 20s, generated-footage
- **Source:** Content/reel-8-course/ (README has the scene map; export with render_mp4.js, add --query hook=b for hook B)
- **Notes:** Clips used: clay-burst, chalk-grip, floodlit-pivot, night-court-plate. Approved by Amir ('they are amazing', he prefers A). The footage is AI-generated: label the post if Instagram asks.

### `reel-8-16-weeks-hook-b`: Reel 8: 16 Weeks, hook B
- **Shows:** 20 s silent Farsi ad for the tennis course on four generated video clips (clay burst, chalked grip, floodlit pivot, night court), a rail of 16 weeks, the real demo in a phone, and the free-week button. Hook B: «تو زمین: سریع‌تر. قوی‌تر. انفجاری‌تر.»
- **File:** `reels/2026-09-20_reel-8-16-weeks-hook-b.mp4` · 2026-09-20 · 20.0 s 1080x1920 · private (not in git)
- **Usable:** The whole file.
- **Tags:** reel, farsi, course, tps, ad, silent, 20s, generated-footage
- **Source:** Content/reel-8-course/ (README has the scene map; export with render_mp4.js, add --query hook=b for hook B)
- **Notes:** Clips used: clay-burst, chalk-grip, floodlit-pivot, night-court-plate. Amir's pick from six options; it replaced a first hook B that made no sense in Farsi. The footage is AI-generated: label the post if Instagram asks.

## Generated clips (Higgsfield) (18)

### `chalk-grip`: Chalked grip
- **Shows:** Chalked hands and forearms on the handles of a trap bar in a shaft of window light in a dark gym, chalk dust drifting, a clay-orange towel on the floor. Locked camera, slow motion.
- **File:** `clips/2026-09-20_chalk-grip.mp4` · 2026-09-20 · 3.0 s 716x1280
- **Usable:** 0-1.55 s ONLY. From 1.67 s a bearded man bends into the frame: his face and a printed shirt logo appear, which breaks the no-face, no-logo rule.
- **Tags:** gym, strength, chalk, trap-bar, hands, window-light, slow-motion, vertical
- **Used in:** reel-8-course
- **Made with:** Cinema Studio v2, std, slowmo, sound off, 3 s, 9:16, 4 credits · job `804a5c00-f07c-422b-9c02-f66d2aa86d5c`
- **Start picture:** `clips/2026-09-20_chalk-grip_start.webp` (job `9c7eef38-a64e-47ae-8c17-daff50cb1746`)
- **Prompt:** Static locked-off camera. The chalked hands squeeze the trap bar handles tighter, forearms tensing, and a small cloud of white chalk dust lifts off the knuckles and drifts through the shaft of window light. The bar stays on the floor. Slow motion. Realistic, natural physics, no morphing, no extra fingers, no face.
- **Source:** Content/reel-8-course/ (masters/gym.mp4 is the trimmed part)
- **Notes:** 3 s silent clip. Credits: 3 clip + 1 start picture (medium/1k). The prompt said 'no face' and 'the bar stays on the floor'; the model completed the person anyway because the start picture showed only forearms.

### `clay-burst`: Clay burst
- **Shows:** Low camera on a white shoe driving off red clay in slow motion. A burst of red dust explodes forward and up and drifts through warm light. Locked camera.
- **File:** `clips/2026-09-20_clay-burst.mp4` · 2026-09-20 · 5.0 s 720x1276 +audio
- **Usable:** 0-3.0 s (the foot leaves the frame at 3 s, then only drifting dust). Has a quiet audio track (sound was on).
- **Tags:** clay, dust, shoe, slow-motion, close-up, court, vertical
- **Used in:** reel-8-course
- **Made with:** Cinema Studio v2, std, slowmo, sound on, 5 s, 9:16, 10.5 credits · job `371bb4ef-83ec-4786-ba24-3687ce406b2e`
- **Start picture:** `clips/2026-09-20_clay-burst_start.webp` (job `6de014d5-3bff-4738-83e0-8da2d61c458f`)
- **Prompt:** Slow motion. The player's white shoe drives off the red clay and a burst of red dust explodes forward and up, drifting through the warm light. Camera locked and low, no camera movement. Realistic, natural physics. The sound of a shoe pushing off clay and a soft dust burst.
- **Source:** Content/reel-8-course/ (masters/burst.mp4 is the trimmed part)
- **Notes:** 5 s clip. Credits: 7.5 clip + 3 start picture (high/2k). Sound was on by mistake (the default): drop it with -an.

### `floodlit-pivot`: Floodlit pivot
- **Shows:** A woman seen from behind on a clay court at night under floodlights: split-step, a turn, then a sprint away with clay dust bursting from each push-off. Locked camera.
- **File:** `clips/2026-09-20_floodlit-pivot.mp4` · 2026-09-20 · 5.0 s 720x1276 +audio
- **Usable:** 0-1.75 s (she runs away and shrinks to a dot after that). Has an audio track (sound was on).
- **Tags:** clay, night, floodlights, sprint, pivot, woman, from-behind, vertical
- **Used in:** reel-8-course
- **Made with:** Kling 3.0, std, sound on, 5 s, 9:16, 13 credits · job `b4e56996-df20-4ec1-bb28-5c10ff49203f`
- **Start picture:** `clips/2026-09-20_floodlit-pivot_start.webp` (job `6fdcfb40-7ea2-4989-b173-9f004988c2fb`)
- **Prompt:** Static locked-off camera. The tennis player, seen from behind, lands from her split-step and explodes into a fast sprint toward the far baseline, arms driving, racket in her right hand. Red clay dust bursts from each push-off and hangs in the floodlight beams. Realistic athletic motion, no morphing, no extra limbs, face never visible. Sound: fast footsteps and scrapes on clay, breath, quiet night ambience.
- **Source:** Content/reel-8-course/ (masters/pivot.mp4 is the trimmed part)
- **Notes:** 5 s clip. Credits: 10 clip + 3 start picture. Lesson: never prompt travel toward or away from a locked camera.

### `night-court-plate`: Night court plate
- **Shows:** An empty red clay court at night under floodlights with a low haze drifting and dust in the light beams. Almost still: a calm plate to put text or a button over. Silent.
- **File:** `clips/2026-09-20_night-court-plate.mp4` · 2026-09-20 · 3.0 s 716x1280
- **Usable:** All 3.0 s. Only the haze moves, so on a phone it can read as almost still.
- **Tags:** clay, night, floodlights, haze, empty-court, plate, calm, vertical
- **Used in:** reel-8-course
- **Made with:** Cinema Studio v2, std, linear, sound off, 3 s, 9:16, 3 credits · job `0a334ef3-3184-45f6-9f98-97ae5ed59bb1`
- **Start picture:** `Content/reel-7-course/masters/week-sixteen.webp (uploaded as media 6e9efc1d)` (job `6e9efc1d-3d5e-43e9-80e2-7c63d6ffe52a`)
- **Prompt:** Static locked-off camera. The empty red clay court at night under the floodlights. Fine red dust drifts slowly through the light beams and a thin low haze moves across the court. The floodlights glow steadily. Nothing else moves. Realistic, calm, no people.
- **Source:** Content/reel-8-course/ (masters/plate.mp4); start picture Content/reel-7-course/masters/week-sixteen.webp
- **Notes:** 3 s silent clip made from the Reel 7 night picture (already vertical), so no new start picture was generated.

### `blue-court-calf-press`: Blue court: calf presses in
- **Shows:** Low close-up of a calf and a dark shoe pressing into a blue hard court, a white court line running diagonally, dust drifting around the shoe. Locked camera.
- **File:** `clips/2026-09-02_blue-court-calf-press.mp4` · 2026-09-02 · 5.0 s 828x1108
- **Tags:** hard-court, blue-court, dust, calf, shoe, close-up, vertical
- **Made with:** Kling 3.0, std, sound off, 5 s, 9:16 · job `95267972-e02e-4709-9517-36ed0522da86`
- **Start picture:** `clips/2026-09-02_start-blue-court-calf.webp` (job `d60e0f04-f9e9-409b-aada-57a2da88097c`)
- **Prompt:** The foot presses further into the ground under load, ankle and calf tensing, weight staying low and grounded. Dust drifts low across the court around the shoe. The foot does not lift or shift position. Camera locked off, no movement.
- **Notes:** Amir's own test clip (2026-09-02). Described from the prompt and one frame: not checked frame by frame for faces, logos or morphing. Credits not recorded.

### `blue-court-calf-skid`: Blue court: calf and skid
- **Shows:** The same close-up of a calf and dark shoe on a blue hard court, but the shoe grips and skids on a hard stop and a burst of dust kicks out sideways. Locked camera.
- **File:** `clips/2026-09-02_blue-court-calf-skid.mp4` · 2026-09-02 · 5.0 s 828x1108
- **Tags:** hard-court, blue-court, dust, calf, shoe, skid, close-up, vertical
- **Made with:** Kling 3.0, std, sound off, 5 s, 9:16 · job `ad3e5f0d-cf28-4be6-9f3b-cb48ffeb4aa4`
- **Start picture:** `clips/2026-09-02_start-blue-court-calf.webp` (job `d60e0f04-f9e9-409b-aada-57a2da88097c`)
- **Prompt:** The shoe grips and skids slightly on the court as the leg absorbs a hard stop, ankle rolling and re-settling under the sudden load, a fresh burst of dust kicking out sideways from under the sole. Camera locked off, no movement.
- **Notes:** Amir's own test clip (2026-09-02). Described from the prompt and one frame: not checked frame by frame for faces, logos or morphing. Credits not recorded.

### `blue-court-sole-pushoff`: Blue court: sole push-off
- **Shows:** Extreme close-up from behind of a shoe sole lifting off a dark blue hard court, weight rolling onto the toe, dust kicking up behind. Locked camera, slow motion. Has an audio track.
- **File:** `clips/2026-09-02_blue-court-sole-pushoff.mp4` · 2026-09-02 · 5.0 s 828x1108 +audio
- **Tags:** hard-court, blue-court, dust, shoe-sole, close-up, slow-motion, vertical
- **Made with:** Kling 3.0, std, sound on, 5 s, 9:16 · job `35d62fd8-98f3-47ed-ac7e-299902af447a`
- **Start picture:** `clips/2026-09-02_start-blue-court-sole.webp` (job `ced4916e-dbac-47cb-8d45-ac5896aa6062`)
- **Prompt:** The foot pushes off the ground, weight rolling forward onto the toe, more dust kicking up and drifting behind, slow motion. Camera locked off, no movement.
- **Notes:** Amir's own test clip (2026-09-02). Described from the prompt and one frame: not checked frame by frame for faces, logos or morphing. Credits not recorded.

### `dusk-lateral-sprint`: Dusk court: lateral sprint (vertical)
- **Shows:** Vertical evening shot of a blue court with floodlights glowing against a pale sky: a small player in white sprints sideways along the baseline and lunges.
- **File:** `clips/2026-09-02_dusk-lateral-sprint.mp4` · 2026-09-02 · 4.0 s 720x1280
- **Tags:** hard-court, blue-court, dusk, floodlights, lunge, sprint, man, vertical
- **Made with:** Kling 3.0, std, sound off, 4 s, 9:16 · job `19731a41-c95e-428d-81ba-8f3b57ade765`
- **Prompt:** A male tennis player in white kit sprints sideways along his baseline on a sunlit blue hard court, travelling left to right across the frame. He stays behind the baseline throughout and never moves toward the net. Three hard lateral strides driving off the outside foot, then he lunges into a full stretch to his right with the racket extended, reaching toward the edge of the frame. He lands off balance, still short. C ... (full prompt in catalog.json)
- **Notes:** Amir's own test clip (2026-09-02). Described from the prompt and one frame: not checked frame by frame for faces, logos or morphing. Credits not recorded.

### `hardcourt-lunge-wide-a`: Hard court: sideways lunge (wide, from the net)
- **Shows:** Wide locked shot from the net end of a sunlit blue hard court: a male player in white kit sprints sideways along the baseline and lunges to his right, off balance. He is small in a wide 16:9 frame.
- **File:** `clips/2026-09-02_hardcourt-lunge-wide-a.mp4` · 2026-09-02 · 4.0 s 1280x720
- **Tags:** hard-court, blue-court, lunge, sprint, wide, man, 16x9, sunlit
- **Made with:** Kling 3.0, std, sound off, 4 s, 16:9 · job `a0074244-1de9-4f33-a79d-a097505911fa`
- **Prompt:** A male tennis player in white kit sprints sideways along the baseline of a sunlit blue hard court, moving left to right across the frame, parallel to the net. He stays behind the baseline the whole time and never moves forward toward the net. Three hard lateral strides, driving off the outside foot, then he lunges into a full stretch to his right with the racket extended, reaching toward the edge of the frame. He lan ... (full prompt in catalog.json)
- **Notes:** Amir's own test clip (2026-09-02). Described from the prompt and one frame: not checked frame by frame for faces, logos or morphing. Credits not recorded. Horizontal (16:9), so it needs cropping for a reel.

### `hardcourt-lunge-wide-b`: Hard court: sprint past a dropping ball (wide)
- **Shows:** Wide side-on tracking shot on a sunlit blue hard court: a male player in white kit sprints toward the sideline and lunges for a ball that drops and bounces just past his racket. 16:9.
- **File:** `clips/2026-09-02_hardcourt-lunge-wide-b.mp4` · 2026-09-02 · 5.0 s 1280x720
- **Tags:** hard-court, blue-court, lunge, sprint, ball, wide, man, 16x9, sunlit
- **Made with:** Kling 3.0, std, sound off, 5 s, 16:9 · job `efb953fd-79cd-4e73-b8de-b05622126f0c`
- **Prompt:** A male tennis player in white kit sprints from behind the baseline toward the sideline of a sunlit blue hard court. He starts low and driving, taking three hard strides across the court, then lunges into a full stretch with his racket extended out to the side. The tennis ball drops and bounces past the tip of his racket, just out of reach. He lands off balance, momentum carrying him forward past the ball. Camera: sid ... (full prompt in catalog.json)
- **Notes:** Amir's own test clip (2026-09-02). Described from the prompt and one frame: not checked frame by frame for faces, logos or morphing. Credits not recorded. Horizontal (16:9).

### `net-player-sprint`: Player at the net: lateral sprint
- **Shows:** A curly-haired player in a maroon shirt, seen from behind at the net of a dusty tan court in warm low light, drives off his outside foot and accelerates sideways. Camera pans with him. Slow motion. (A person is on screen, from behind.)
- **File:** `clips/2026-09-02_net-player-sprint.mp4` · 2026-09-02 · 5.0 s 828x1108
- **Tags:** net, lateral, sprint, acceleration, man, from-behind, warm-light, slow-motion, vertical
- **Made with:** Kling 3.0, std, sound off, 5 s, 9:16 · job `2c482ae1-a185-476c-8949-f68ebf15d75e`
- **Start picture:** `clips/2026-09-02_start-net-player.webp` (job `e9ee238c-d1c9-4c4a-823e-e9a3bc99825e`)
- **Prompt:** The player drives explosively off his outside foot and accelerates sideways across the court, first two strides powerful and low. Camera pans with him. Slow motion.
- **Notes:** Amir's own test clip (2026-09-02). Described from the prompt and one frame: not checked frame by frame for faces, logos or morphing. Credits not recorded.

### `net-player-sprint-ball`: Player at the net: sprint to the ball
- **Shows:** The same player and start picture as 'net-player-sprint', accelerating sideways toward an oncoming tennis ball, racket in hand. Camera pans with him. Slow motion.
- **File:** `clips/2026-09-02_net-player-sprint-ball.mp4` · 2026-09-02 · 5.0 s 828x1108
- **Tags:** net, lateral, sprint, ball, man, from-behind, warm-light, slow-motion, vertical
- **Made with:** Kling 3.0, std, sound off, 5 s, 9:16 · job `bf0c289f-15bb-449b-b4a3-21e174d6ec32`
- **Start picture:** `clips/2026-09-02_start-net-player.webp` (job `e9ee238c-d1c9-4c4a-823e-e9a3bc99825e`)
- **Prompt:** The player drives explosively off his outside foot and accelerates sideways across the court toward an oncoming tennis ball, first two strides powerful and low. Camera pans with him. Slow motion.
- **Notes:** Amir's own test clip (2026-09-02). Described from the prompt and one frame: not checked frame by frame for faces, logos or morphing. Credits not recorded.

### `photo-player-kling-a`: Photo player: lateral acceleration (Kling) **RESTRICTED: made from an uploaded photo of a real-looking player (his likeness). Do not use in an ad without that person's permission. Kept out of git.**
- **Shows:** A young man in a dark teal shirt and white shorts on a blue and green hard court (a likeness taken from an uploaded photo): he drives off his outside foot and accelerates sideways toward an oncoming ball.
- **File:** `private/2026-09-02_photo-player-kling-a.mp4` · 2026-09-02 · 5.0 s 1176x784 · private (not in git)
- **Tags:** hard-court, man, face-visible, restricted
- **Made with:** Kling 3.0, std, sound off, 5 s, 16:9 requested · job `8435c650-bd52-4aaa-9c57-91c5fa492bbf`
- **Start picture:** `private/2026-09-02_photo-player-reference.jpg` (job `dbb06b25-55df-4f47-97fb-9e33067bb437`)
- **Prompt:** The player drives explosively off his outside foot and accelerates sideways across the court toward an oncoming tennis ball, first two strides powerful and low. Camera pans with him. Slow motion.
- **Notes:** Amir's own test clip (2026-09-02). Described from the prompt and one frame: not checked frame by frame for faces, logos or morphing. Credits not recorded.

### `photo-player-kling-b`: Photo player: crossover steps (Kling) **RESTRICTED: made from an uploaded photo of a real-looking player (his likeness). Do not use in an ad without that person's permission. Kept out of git.**
- **Shows:** A young man in a dark teal shirt and white shorts on a blue and green hard court (a likeness taken from an uploaded photo): three fast crossover steps toward the ball, racket drawing back for a forehand.
- **File:** `private/2026-09-02_photo-player-kling-b.mp4` · 2026-09-02 · 5.0 s 1176x784 · private (not in git)
- **Tags:** hard-court, man, face-visible, restricted
- **Made with:** Kling 3.0, std, sound off, 5 s · job `9b2d4143-95d3-4c9e-8387-0eb1252a6078`
- **Start picture:** `private/2026-09-02_photo-player-reference.jpg` (job `dbb06b25-55df-4f47-97fb-9e33067bb437`)
- **Prompt:** The player pushes explosively off his left leg and accelerates diagonally forward and to his right, three fast crossover steps toward the ball, racket drawing back into forehand preparation. Camera tracks with him, holding chest height. Single continuous shot, no cut. 9:16
- **Notes:** Amir's own test clip (2026-09-02). Described from the prompt and one frame: not checked frame by frame for faces, logos or morphing. Credits not recorded.

### `photo-player-minimax`: Photo player: split-step and sprint (MiniMax) **RESTRICTED: made from an uploaded photo of a real-looking player (his likeness). Do not use in an ad without that person's permission. Kept out of git.**
- **Shows:** A young man in a dark teal shirt and white shorts on a blue and green hard court (a likeness taken from an uploaded photo): a split-step, then a full sprint toward a ball that drops in the far half, with a side-on tracking camera. Has an audio track.
- **File:** `private/2026-09-02_photo-player-minimax.mp4` · 2026-09-02 · 5.2 s 2176x1440 +audio · private (not in git)
- **Tags:** hard-court, man, face-visible, restricted
- **Made with:** MiniMax H3, 2K, 5 s, 9:16 requested, audio · job `082f3714-db97-4d3e-82e9-358deae7a75c`
- **Start picture:** `private/2026-09-02_photo-player-reference.jpg` (job `dbb06b25-55df-4f47-97fb-9e33067bb437`)
- **Prompt:** @Image1 is the reference photo of the tennis player: keep the player's identity and exact look... he does a split-step, then explodes into a full sprint toward the ball, visibly accelerating with every stride... side-on tracking shot, slow tracking camera, dust puffing off each step, sneaker squeaks and footfalls, no music. (full prompt shortened here)
- **Notes:** Amir's own test clip (2026-09-02). Described from the prompt and one frame: not checked frame by frame for faces, logos or morphing. Credits not recorded.

### `photo-player-wan`: Photo player: sideways acceleration (Wan 2.5) **RESTRICTED: made from an uploaded photo of a real-looking player (his likeness). Do not use in an ad without that person's permission. Kept out of git.**
- **Shows:** A young man in a dark teal shirt and white shorts on a blue and green hard court (a likeness taken from an uploaded photo): a slow-motion sideways acceleration toward an incoming ball, camera panning with him, net in the foreground. Has an audio track.
- **File:** `private/2026-09-02_photo-player-wan.mp4` · 2026-09-02 · 5.0 s 1184x784 +audio · private (not in git)
- **Tags:** hard-court, man, face-visible, restricted
- **Made with:** Wan 2.5 (fast, 720p), 5 s, sound on · job `2f6574d1-f774-48e9-9911-e44a2ad01807`
- **Start picture:** `private/2026-09-02_photo-player-reference.jpg` (job `dbb06b25-55df-4f47-97fb-9e33067bb437`)
- **Prompt:** A male tennis player wearing a fitted teal blue athletic shirt and white shorts stands centered on an outdoor hardcourt with a blue and green surface, holding a tennis racquet with both hands in a ready stance. He pushes off his outside foot with explosive power, then accelerates sideways with two strong, low strides toward an incoming tennis ball entering frame from the camera's right side at a slightly elevated hei ... (full prompt in catalog.json)
- **Notes:** Amir's own test clip (2026-09-02). Described from the prompt and one frame: not checked frame by frame for faces, logos or morphing. Credits not recorded.

### `through-the-net-forehand`: Through the net: reaching for the ball
- **Shows:** Seen through the net mesh: a man in a light blue shirt accelerates sideways toward a ball he cannot reach. The camera is on the net. Vertical. His face is visible.
- **File:** `clips/2026-09-02_through-the-net-forehand.mp4` · 2026-09-02 · 5.0 s 720x1280
- **Tags:** hard-court, net-mesh, man, forehand, ball, face-visible, vertical
- **Made with:** Kling 3.0, std, sound off, 5 s, 9:16 · job `b9f00890-3732-4cab-b636-4c099ca731d8`
- **Prompt:** create a video of a tennis player on a tennis court. accelerating in a lateral movement toward a tennis ball to hit a forehand but cant reach the ball the camera is on the net
- **Notes:** Amir's own test clip (2026-09-02). Described from the prompt and one frame: not checked frame by frame for faces, logos or morphing. Credits not recorded. A face is visible.

### `woman-forehand-reach`: Woman on a blue court: reaching for the ball
- **Shows:** A woman in a blue dress with a racket on a blue hard court accelerates toward a tennis ball (upper right) that she cannot reach. Vertical. Her face is visible.
- **File:** `clips/2026-09-02_woman-forehand-reach.mp4` · 2026-09-02 · 4.0 s 720x1280
- **Tags:** hard-court, blue-court, woman, forehand, ball, face-visible, vertical
- **Made with:** Kling 3.0, std, sound off, 4 s, 9:16 · job `427d6eb0-4d17-4c79-9d5c-605c0c2ac943`
- **Prompt:** create a video of a tennis player on a tennis court. accelerating toward a tennis ball to hit a forehand but cant reach the ball
- **Notes:** Amir's own test clip (2026-09-02). Described from the prompt and one frame: not checked frame by frame for faces, logos or morphing. Credits not recorded. A face is visible.

## App explainer clips (8)

### `app-clip-delivery`: App clip: delivery
- **Shows:** A phone showing the short intake form: how the programme starts and reaches the athlete.
- **File:** `app-clips/2026-09-06_app-clip-delivery.mp4` · 2026-09-06 · 6.8 s 1080x1920
- **Tags:** app, farsi, silent, cutaway, explainer, vertical
- **Used in:** the Farsi system reel (reel-5/6-system)
- **Source:** Content/clip-delivery.html (spec in Content/APP-CLIPS.md)
- **Notes:** Silent looping cutaway exported from an HTML clip. Description written from one frame and the spec: check it against the spec before quoting it.

### `app-clip-human`: App clip: written by a person
- **Shows:** The coach's card next to the athlete's log with the words «من نوشتم» (I wrote it) against «خودکار» (automatic).
- **File:** `app-clips/2026-09-06_app-clip-human.mp4` · 2026-09-06 · 7.0 s 1080x1920
- **Tags:** app, farsi, silent, cutaway, explainer, vertical
- **Used in:** the Farsi system reel (reel-5/6-system)
- **Source:** Content/clip-human.html (spec in Content/APP-CLIPS.md)
- **Notes:** Silent looping cutaway exported from an HTML clip. Description written from one frame and the spec: check it against the spec before quoting it.

### `app-clip-loop`: App clip: the logging loop
- **Shows:** The logging screen: four sets of a Barbell Back Squat are entered with weight and RPE and ticked off, with a caption «هر هفته چک‌این داریم» (we check in every week).
- **File:** `app-clips/2026-09-06_app-clip-loop.mp4` · 2026-09-06 · 6.8 s 1080x1920
- **Tags:** app, farsi, silent, cutaway, explainer, vertical
- **Used in:** the Farsi system reel (reel-5/6-system)
- **Source:** Content/clip-loop.html (spec in Content/APP-CLIPS.md)
- **Notes:** Silent looping cutaway exported from an HTML clip. Description written from one frame and the spec: check it against the spec before quoting it.

### `app-clip-map`: App clip: the cycle map
- **Shows:** «هر سیکل یه مأموریت» (each cycle is a mission): the cycles C1 to C5 with the Foundation Forge card (done) and Load and Build (active).
- **File:** `app-clips/2026-09-06_app-clip-map.mp4` · 2026-09-06 · 6.8 s 1080x1920
- **Tags:** app, farsi, silent, cutaway, explainer, vertical
- **Used in:** the Farsi system reel (reel-5/6-system)
- **Source:** Content/clip-map.html (spec in Content/APP-CLIPS.md)
- **Notes:** Silent looping cutaway exported from an HTML clip. Description written from one frame and the spec: check it against the spec before quoting it.

### `app-clip-needs`: App clip: needs analysis
- **Shows:** «تحلیل نیاز: زمین چی می‌خواد؟» (needs analysis: what does the court demand?) with sprint, change of direction and rotational power.
- **File:** `app-clips/2026-09-06_app-clip-needs.mp4` · 2026-09-06 · 7.5 s 1080x1920
- **Tags:** app, farsi, silent, cutaway, explainer, vertical
- **Used in:** the Farsi system reel (reel-5/6-system)
- **Source:** Content/clip-needs.html (spec in Content/APP-CLIPS.md)
- **Notes:** Silent looping cutaway exported from an HTML clip. Description written from one frame and the spec: check it against the spec before quoting it.

### `app-clip-prescription`: App clip: a prescription
- **Shows:** A strength day card (Day 3, change of direction and rotational power) with the Barbell Romanian Deadlift row opening to its video slot: how a prescription looks in the app.
- **File:** `app-clips/2026-09-06_app-clip-prescription.mp4` · 2026-09-06 · 7.6 s 1080x1920
- **Tags:** app, farsi, silent, cutaway, explainer, vertical
- **Used in:** the Farsi system reel (reel-5/6-system)
- **Source:** Content/clip-prescription.html (spec in Content/APP-CLIPS.md)
- **Notes:** Silent looping cutaway exported from an HTML clip. Description written from one frame and the spec: check it against the spec before quoting it.

### `app-clip-watch`: App clip: the coach watches
- **Shows:** A phone with the Accelerations and Squat Strength session and its readiness check: the data the coach reads.
- **File:** `app-clips/2026-09-06_app-clip-watch.mp4` · 2026-09-06 · 8.3 s 1080x1920
- **Tags:** app, farsi, silent, cutaway, explainer, vertical
- **Used in:** the Farsi system reel (reel-5/6-system)
- **Source:** Content/clip-watch.html (spec in Content/APP-CLIPS.md)
- **Notes:** Silent looping cutaway exported from an HTML clip. Description written from one frame and the spec: check it against the spec before quoting it.

### `app-clip-why`: App clip: why this cycle
- **Shows:** The cycle cards (Foundation Forge, Load and Build, Power Translation...) with one card opening to explain itself.
- **File:** `app-clips/2026-09-06_app-clip-why.mp4` · 2026-09-06 · 7.3 s 1080x1920
- **Tags:** app, farsi, silent, cutaway, explainer, vertical
- **Used in:** the Farsi system reel (reel-5/6-system)
- **Source:** Content/clip-why.html (spec in Content/APP-CLIPS.md)
- **Notes:** Silent looping cutaway exported from an HTML clip. Description written from one frame and the spec: check it against the spec before quoting it.

## Overlays and assets (2)

### `fast-feet-overlay-black`: FAST FEET overlay (black, blend)
- **Shows:** The words FAST FEET in bold white with a row of footprints, on black: for a Screen/Add blend over other footage in an editor. 4 s, 60 fps.
- **File:** `clips/2026-09-03_fast-feet-overlay-black.mp4` · 2026-09-03 · 4.0 s 1080x1920
- **Tags:** overlay, text, editing, vertical
- **Notes:** Not built in this repo: origin unknown (made outside these sessions).

### `fast-feet-overlay-green`: FAST FEET overlay (green screen)
- **Shows:** The same FAST FEET title with footprints, on chroma green: key the green out in an editor. 4 s, 60 fps.
- **File:** `clips/2026-09-03_fast-feet-overlay-green.mp4` · 2026-09-03 · 4.0 s 1080x1920
- **Tags:** overlay, text, editing, vertical
- **Notes:** Not built in this repo: origin unknown.

## Own camera footage (4)

### `form-talk-edit`: Talking to camera: the short form (edit with the form on screen)
- **Shows:** The same 78.9 s recording of Amir at his desk, with a phone mock-up on screen showing the intake form. 4K vertical. A real person's face: private.
- **File:** `not copied: Downloads folder: 0807.mp4 (212 MB). NOT copied into the archive (too big): say the word and it will be.` · 2026-09-07 · 78.9 s 2160x3840 +audio · private (not in git)
- **Tags:** footage, amir, talking-head, face-visible, 4k, edit
- **Notes:** Appears to be the finished edit of form-talk-raw.

### `form-talk-raw`: Talking to camera: the short form (raw, 4K)
- **Shows:** Amir at a desk with a laptop, talking to camera, with a Farsi title «فرم کوتاه پر» (fill in the short form). 78.9 s, 4K vertical. A real person's face: private.
- **File:** `not copied: Downloads folder: IMG_4315.MP4 (385 MB). NOT copied into the archive (too big): say the word and it will be.` · 2026-09-06 · 78.9 s 2160x3840 +audio · private (not in git)
- **Tags:** footage, amir, talking-head, face-visible, 4k
- **Notes:** Looks like the version with the on-screen title; the phone-mockup edit is form-talk-edit.

### `court-indoor-player-from-behind`: Indoor court: a player from behind
- **Shows:** A woman in a blue top and dark shorts, seen from behind, on an indoor tennis court under a steel-arched roof. A real player.
- **File:** `../../coach-site/media/court.mp4` · 2026-08-30 · 10.8 s 464x848 +audio
- **Usable:** All 10.8 s.
- **Tags:** footage, indoor-court, from-behind, woman
- **Source:** Downloads/IMG_4203.MP4 is identical (same bytes)
- **Notes:** Already public: it is served on the coach-site draft (coach-site/media/court.mp4, tracked in git). Not copied again.

### `selfie-outdoor-2026-08-07`: Selfie video outdoors
- **Shows:** Amir in sunglasses and a backpack, filming himself outdoors on a sunny day. A real person's face: private.
- **File:** `private/2026-08-07_selfie-outdoor-2026-08-07.mov` · 2026-08-07 · 12.5 s 464x848 +audio · private (not in git)
- **Tags:** footage, amir, selfie, face-visible
- **Notes:** Low resolution (464x848).
