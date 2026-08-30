/* ============================================================================
   filming.js — how to record a jump you can actually measure.

   This is the shared camera guide. Every test shows it. A test can add or
   override a section through its own `filmingOverrides` field, it does not
   duplicate any of this.

   WRITING RULES FOR THIS FILE (from .claude/COACHING-PRINCIPLES.md)
   No em dashes. No semicolons. Commas where a writer would reach for a dash.
   Contractions throughout. Short sentences, uneven lengths. One bolded phrase
   per paragraph, and it is the instruction, not a keyword. Why before how.
   Read it back and ask: would a busy coach type this on his phone?

   MARKUP
   **bold** is the only inline markup. The app renders it. Nothing else.

   Strings are double quoted so contractions do not need escaping. Do not use
   backticks anywhere in this codebase, a backtick inside a comment inside a
   template literal has taken the live app down twice.
   ========================================================================= */

(function (root) {
  "use strict";

  var JumpKit = root.JumpKit = root.JumpKit || {};

  JumpKit.filming = {

    title: "Filming a jump you can actually measure",

    intro: [
      "Your score comes from one thing, how long you're off the floor, measured to the millisecond. Everything on this page exists to make two moments visible in a single frame, the moment your foot leaves the floor and the moment it comes back.",
      "**Get this right once and you never think about it again.** Put tape on the floor where the phone goes and where you stand. Every test after this one is a repeat."
    ],

    sections: [

      /* ------------------------------------------------------------------ */
      {
        id: "frame-rate",
        title: "Slow motion, not normal video",
        why: "This is the one that decides whether your number means anything.",
        body: [
          "**Record in your phone's slow-motion mode, 240 fps, 1080p.** Every phone made in the last several years has it. Don't use 4K, most phones drop to 60 or 120 fps when you do.",
          "Here's why it matters this much. At 240 frames a second, one frame is 4 milliseconds and we can measure your jump to about **a fifth of a centimetre**. At 30 frames a second, which is what normal video records at, one frame is 33 milliseconds and the same jump is only good to **plus or minus 4 centimetres**.",
          "4 centimetres is more than most athletes improve in a season. So a 30 fps clip can't tell you whether you got better or whether the camera blinked at a different moment. **This page won't accept video below 60 fps**, and it will tell you what it found before it does anything else.",
          "Going above 240 buys you almost nothing. Don't chase 960."
        ],
        bullets: []
      },

      /* ------------------------------------------------------------------ */
      {
        id: "getting-the-file-here",
        title: "Getting the clip here without ruining it",
        why: "This catches more people than everything else put together, and it fails silently.",
        priority: true,
        body: [
          "A slow-motion clip can arrive here with the slow motion baked into it. When that happens the video is still 240 frames of your jump, but it's been saved as a normal 30 fps file that runs eight times too long. Your half second in the air becomes four seconds.",
          "**Nothing in the file says this has happened.** We catch it by checking whether your jump is physically possible, and if it isn't we stop and ask you. That's a good safety net, but it's better not to need it."
        ],
        bullets: [
          {
            label: "iPhone, the reliable way",
            text: "Open the clip in Photos, tap Edit, tap the speedometer icon at the bottom, then drag the left slider all the way right so it reads 100% at 240 FPS. Save. The clip now plays at normal speed and keeps all 240 frames. Upload that."
          },
          {
            label: "iPhone, the other way",
            text: "Save the clip into the Files app first. Then on this page tap Choose File and pick Browse instead of Photo Library. That route hands us the original bytes untouched."
          },
          {
            label: "Android",
            text: "Your phone bakes the slow motion in when it records, which is normal. Most Android phones write a tag saying what they actually captured at, and if yours does we correct it exactly and tell you we did. If it doesn't, we'll ask you which setting you used."
          },
          {
            label: "Never send it through a messaging app",
            text: "WhatsApp, Instagram, Telegram and iMessage all re-encode video to 30 fps and throw the slow motion away. AirDrop it, use a cable, or upload the original straight from the phone that filmed it."
          },
          {
            label: "Don't slow it down in an editing app",
            text: "Editors invent frames in between the real ones. The takeoff frame you end up measuring might never have been photographed."
          },
          {
            label: "Samsung Super Slow-mo and Instant Slow-mo are guesses",
            text: "The phone photographs 240 frames a second and invents the rest with software. Measuring on an invented frame is measuring a guess. Use the standard 240 fps slow-motion mode instead. This page blocks the interpolated ones."
          }
        ]
      },

      /* ------------------------------------------------------------------ */
      {
        id: "camera-position",
        title: "Where the phone goes",
        why: "The camera has to see daylight under your shoe at the exact frame you leave the floor.",
        body: [
          "**Put the phone low, about 50 cm off the floor.** A low tripod, a bench, a box, or propped against a water bottle. Waist height feels natural and it's wrong, because from up there you're looking down at the floor and the gap under your shoe is hidden."
        ],
        bullets: [
          { label: "Square on", text: "the phone faces you straight on, not at an angle. An angled view hides toe-off and makes your landing look early, and both of those make your jump read lower than it was." },
          { label: "About 3.5 metres back", text: "landscape, phone turned sideways. Your whole body in frame, feet to head." },
          { label: "Headroom", text: "at least 30 cm of clear space above your head at the very top of the jump. If your head touches the top edge of the frame, the rep doesn't count." },
          { label: "Floor visible", text: "the floor line should run right across the frame, with about 30 cm of floor showing either side of your feet." },
          { label: "Tape both spots", text: "one X where you stand, one mark where the phone goes. Same two marks every session, forever." }
        ]
      },

      /* ------------------------------------------------------------------ */
      {
        id: "hold-it-still",
        title: "Lock it down before you jump",
        why: "Shake you'd never notice at normal speed moves the floor line at 240 fps.",
        body: [
          "Tripod, or wedge the phone against something solid. Don't have someone hold it.",
          "**Before you record, tap and hold on your feet on the screen until it says AE/AF Lock.** That freezes the focus and the brightness. Without it the phone can refocus mid-jump and blur the exact frames we need. No zoom, digital zoom throws away detail. Don't touch the phone during the rep."
        ],
        bullets: []
      },

      /* ------------------------------------------------------------------ */
      {
        id: "light",
        title: "More light than you think",
        why: "Slow motion cuts the light each frame gets by about four times.",
        body: [
          "A room that looks perfectly bright to your eye can produce dark, smeared slow-motion frames where the moment of takeoff is unreadable. **Film in the brightest, most even light you can find.**",
          "Never film into a window or with a bright light behind you. You end up as a silhouette and we can't tell your shoe from the floor.",
          "**Watch for a hard shadow pooling under your feet.** It's the single worst thing for automatic detection. A shadow sticks to your foot as you leave the floor and it rushes up to meet you as you land, so the software thinks you took off late and landed early. That makes your jump read lower than it was. Even, diffuse light fixes it, or just move away from the one strong light that's causing it."
        ],
        bullets: []
      },

      /* ------------------------------------------------------------------ */
      {
        id: "background",
        title: "Plain wall, one person",
        why: "Anything else moving in frame can be mistaken for you.",
        body: [
          "Plain background, ideally a wall that contrasts with what you're wearing. No mirrors. Nobody walking behind you.",
          "**One person in frame, and that's you.** A spotter standing in shot puts a second pair of feet on the floor line, and those read as extra contacts."
        ],
        bullets: []
      },

      /* ------------------------------------------------------------------ */
      {
        id: "clothing",
        title: "Ankles out, shoes that stand out",
        why: "We find the moment of takeoff by watching the bottom edge of your shoe.",
        body: [
          "**Shorts or tights, and your ankles and shoes fully visible.** Anything hanging over the shoe hides the moment we're trying to measure.",
          "Wear the same shoes every test. Footwear genuinely changes jump height and contact time, so switching them mid-block looks like a training effect when it isn't."
        ],
        bullets: [
          { label: "Works", text: "shorts, tights, shoes that clearly contrast with the floor, hair tied back." },
          { label: "Doesn't work", text: "baggy joggers over the shoe, black shoes on a dark floor, white shoes on a light floor, loose hoodies, dangling drawstrings, long loose hair." }
        ]
      },

      /* ------------------------------------------------------------------ */
      {
        id: "surface",
        title: "Jump on something solid",
        why: "A soft floor lengthens your contact time and moves the floor line while you're on it.",
        body: [
          "Concrete, a solid gym floor, or a firm rubber mat laid over concrete. **Never a crash mat, a thick gym mat, a sprung sports hall floor, grass or turf.**",
          "Drop jumps and the 10-5 are hit hardest, because the whole point of those is how fast you get off the ground. Retest on the same surface every time. This page records which surface you used and it won't plot two different ones on the same line."
        ],
        bullets: []
      }
    ],

    /* -------------------------------------------------------------------- */
    preflight: {
      title: "Thirty second check before you record",
      items: [
        "Slow-motion mode on, 240 fps, 1080p",
        "Phone on its taped mark, about 50 cm high, about 3.5 m back, turned sideways",
        "Whole body in frame with room to spare above your head at the top",
        "Focus and brightness locked on your feet",
        "Bright even light, nothing bright behind you, no hard shadow under your feet",
        "Plain background, only you in shot",
        "Shoes that contrast with the floor, ankles visible",
        "Solid floor, standing on your X",
        "Uploading the original clip, not one that's been through a messaging app"
      ]
    },

    /* --------------------------------------------------------------------
       Shown under "How accurate is this?". The numbers are computed from
       physics.js at render time, never typed in here, so if the error model
       changes the table follows.
       -------------------------------------------------------------------- */
    accuracyNotes: [
      "**Typical** is what you actually get. **Worst case** is what one badly chosen frame costs you.",
      "Contact time is punished about two and a half times harder than flight time, because it's two and a half times shorter. That's why RSI needs a faster camera than jump height does.",
      "Above 240 fps there's almost nothing left to win. There's a floor of about 0.8 milliseconds that comes from motion blur and your foot squashing against the floor, and no camera fixes that.",
      "**These are the tool's errors, not yours.** Your own day to day variation is about 3% on jump height and 5 to 8% on RSI, which at 240 fps is bigger than everything in this table. That's the point. At 240 fps the camera stops being the thing holding you back.",
      "Separately from all of the above, a height measured from flight time reads about 2.5 to 3 cm higher than a force plate would say. That's a difference in what's being measured, not a mistake, and a faster camera doesn't shrink it. Just don't put these numbers on the same chart as force plate numbers."
    ]
  };

})(typeof window !== "undefined" ? window : this);
