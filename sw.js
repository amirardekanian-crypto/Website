// AA Performance — Service Worker
// Bump CACHE version any time you push a breaking change to the app shell.
// v3: program.html's app shell changed — it now links the real /manifest.json and
// carries the apple-mobile-web-app-* meta tags, so the pre-cached v2 shell would
// keep an installed athlete on a version that cannot be installed properly.
// v4: program.html's <head> changed — the font stylesheet no longer blocks paint,
// the Supabase SDK now loads ahead of analytics, and the login screen is painted
// from the body instead of from boot(). An installed athlete sitting on the
// pre-cached v3 shell would keep the slow first load offline-first opens are
// most likely to suffer from.
// v5: navigations and the exercise library are stale-while-revalidate rather
// than network-first, and the library joins the pre-cache. The shell keys also
// moved from the full URL to the pathname, so a v4 cache would miss every one.
// v6: the login screen is the Baseline design now — it loads court-sessions.jpg,
// which joins the pre-cache so the second open never waits for it.
// v7: the shell did not change. The worker now leaves /reach/ and /tennis/ alone (the
// Iran reachability probe, and the future paid course, which ships its own worker),
// and activate deletes only this app's own aap-* caches, so a bump here can never wipe
// another app's offline copy on the same origin.
// v8: the shell did not change. The worker also leaves /tennis-testing/ alone (the tennis
// testing app, which keeps its own offline copy of content and saves in localStorage).
// v9: shared.js changed. Its video pop-up (the small play button on circuit items) now embeds
// from www.youtube.com like the inline player does, because the nocookie player was getting
// YouTube's sign-in wall in Iran. shared.js is in the shell and served cache-first, so without
// a bump every installed phone would keep the old pop-up for ever.
// v10: program.html changed. It now draws a workout's "Before you start" card (its `before`
// field), resolves ?workout= links through the database, and reads two more per-side chip
// forms. An installed athlete on the pre-cached v9 shell keeps a renderer that IGNORES
// `before`, so this bump is what gets the new shell onto phones. It is also why the sessions'
// safety wording is only moved into `before` AFTER this version has been live for a while.
// v14: program.html changed (The Card Remembers, 2026-09-24): sets log reps, every card shows
// last time, and the History sheet reads get_my_history(). The session record now carries `log`,
// so the sooner phones leave the v13 shell the sooner their sessions are saved as data.
// v17: program.html changed (The Spine, 2026-09-24): the ⓘ About sheet with Rungs, and cues filled
// from the exercise's entry on cards that carry none of their own. (v16 was the RPE colours.)
// v18: program.html changed (Library → Exercises, the third door, 2026-09-24).
// v20: program.html changed (2026-09-24): exercises inside a circuit show their Spine entry's cues
// when they carry none of their own, the same as a standalone card.
// v26: program.html changed (2026-09-26): the first and last week of a cycle show the
// coach's note for that week (cycles[n].weekNotes) under This Week and at the top of a session.
// Also: Personal Records' "Add your body weight" now opens this app's own weight screen (its
// "Open AA Proof" button led to a Proof that has had no weight screen since 2026-09-12).
// v27: program.html changed (2026-09-26): a day's reset clears every circuit round's RPE on
// programmes written with rx.rounds (it cleared round 1 only), and the Quality mix counts a legacy
// "×3 Rounds" circuit as three rounds, not one. coach.html's Quality check reads rounds the same way.
// v28: program.html changed (2026-09-26): exercise videos come from the Spine entries; the app
// no longer fetches exercise_library.json (retired with its Notion sync), so the shell stops
// pre-caching it.
// v29: program.html changed (2026-09-26): a legacy circuit ("×3 Rounds", no rx) draws all its rounds
// again. Since 2026-09-20 renderCircuit() read parseInt("×3 Rounds") as NaN and drew one round.
// v30: program.html changed (2026-09-26): the in-app chat is gone (the Coach tab opens WhatsApp
// instead), Home puts the training before the habits, and the last ochre and amber are clay/paper.
// v31: program.html changed (2026-09-26): WhatsApp doors at the end of a session and in each
// exercise's About sheet, pre-filled with the day or exercise; the session note stops inviting
// swap requests (Amir answers only on WhatsApp).
// v32: program.html changed (2026-09-26): the "My Plan" tab is now "Game Plan", with a route icon.
// v33: program.html changed (2026-09-26): weight boxes open empty with last time's weight as a hint
//      and a "Same as last" button; Personal Records fill themselves with each new best.
// v34: program.html changed (2026-09-26): the readiness check sets today's targets (REC-2),
//      and a running session's Guided button is visible again.
// v35: program.html and habits.html changed (2026-09-26): today's habits are ticked on Home,
//      in AA Proof's embedded strip (habits.html?embed=1).
// v36: program.html and habits.html changed (2026-09-26, REL-01): both open with no signal from
//      the last plan the phone loaded (localStorage `plancache`), stop waiting at once when the
//      Supabase library could not download, and say what really went wrong when they cannot open.
//      It also carries habits.html's rounded day gate (gatePasses(), b821468), which shipped without
//      a bump of its own.
// v37: shared.js and program.html changed (2026-09-26): the video pop-up reads the same YouTube
//      links as the app (a Short plays in a tall box; a non-YouTube link opens as a link), and
//      a weight typed as "2×20" reads back as a weight, not as 20 reps. habits.html: the six July
//      AA Proof bugs (ecb459a).
// v38: program.html changed (2026-09-26, stage42): the About sheet's "Body parts involved" pills
//      became the muscle map, a front-and-back body with the worked muscles lit.
// v39: habits.html changed (2026-09-26, PRIV-01): the tour, the Crew card and Settings tell a
//      coached athlete they go on the board after their first session, by name, and offer
//      "Keep me off the board" before it happens.
// v40: program.html changed (2026-09-26): ytVideoId() embeds only a YouTube address, the same
//      host check as the site modal; any other link opens as a link.
// v41: program.html changed (2026-09-26, CNT-01): the guide's finish, report and rest-timer cards
//      name the real buttons, and the Library promises a habit tick only when that habit is on.
// v42: program.html changed (2026-09-26, WK-01): opening Guided never pauses a running clock, it
//      resumes at the first unfinished set, and its last button (Finish Session ✓) really finishes.
// v43: program.html changed (2026-09-26, LOG-02): Reset Session, a weight reading and a Personal
//      Record take two taps (armedTap()), and Reset moved away from Send.
// v44: habits.html changed (2026-09-26, PRF-04): the nudge stops asking for the session Proof cannot
//      tick, its OPEN YOUR PROGRAMME button opens the programme, and "logged nothing" means nothing.
// v45: program.html, shared.js and habits.html changed (2026-09-26, HOME-03): the install ask waits
//      for a finished session, its words match the phone, and Proof stops asking coached athletes.
// v46: program.html changed (2026-09-26, WK-03): the session bar never clips the clock, and a Home day
//      card shows "In progress · Resume" for a session started today.
// v47: program.html changed (2026-09-26, A11Y-01): dark mode text reads (--green-ink/--clay-ink), the rest
//      timer is dark in dark mode, the tab bar and labels are 11 px, and the session rating is 44 px.
// v48: program.html and shared.js changed (2026-09-26, NAV-01): the phone's Back button closes the top
//      layer (a sheet, the rest timer, Guided, a screen, the day) instead of leaving the app.
// v49: habits.html changed (2026-09-26, NAV-01): the phone's Back button closes AA Proof's top layer (a
//      sheet, Settings a step at a time, a tab) instead of leaving the app; never in the embedded strip.
// v50: program.html changed (2026-09-26, HOME-01): This Week is built from the session history (Done pills
//      that last the week, the right day suggested, "2 of 3 sessions done this week").
// v51: program.html changed (2026-09-26, BW-01): the weigh-in box sits under the headline number, above
//      the chart and the list; the weight and Records trend lines read in dark mode.
// v52: program.html changed (2026-09-26, DATA-02): a session is filed under the local day it was finished
//      (one date for every save of it), and a session running past midnight keeps its clock and check-in.
// v53: program.html changed (2026-09-26, SHEET-01): the info sheet keeps a trail, with a ‹ Back and the
//      phone's Back stepping back a page before it closes.
// v54: program.html changed (2026-09-26, POL-01): the side rail only in a day view and under the overlays,
//      every screen lights its tab, the demo banner clears the dark toggle and Guided's ✕, dead code gone.
// v55: program.html changed (2026-09-26, PLAN-01): Game Plan folds past and future cycles (the current one
//      open), and the welcome's button opens Day 1.
// v56: program.html changed (2026-09-26, REC-01): the estimated max is off the working card (it stays in
//      Personal Records, which fill themselves and keep "+ Log a max").
// v57: program.html changed (2026-09-26, DATA-02): a day logged but never finished is asked about on a
//      later open ("Tuesday's Day 2 was never sent": Send it / Clear it).
// v58: program.html changed (2026-09-26, HOME-02): Home is led by the training: a small cycle line, done days
//      as small rows, the in-progress card with Resume, and habits / records / weight as one row each.
// v59: program.html changed (2026-09-27, WK-02): the rest timer keeps time in a pocket, and a tick offers Rest.
// v60: program.html changed (2026-09-27, CARD-01/02/03): the working card (one number line, the Last time box,
//      the how-to folded after the first time, small done rows).
// v61: program.html changed (2026-09-27, WK-01): Guided pins the current set, logs the kg on the rest screen,
//      and takes circuits round by round.
// v62: program.html changed (2026-09-27, WK-04): one finish (rate, then Done sends the report once, from an
//      outbox that waits for signal), and Reset in the session bar.
// v63: program.html changed (2026-09-27, WK-04): the session bar's three buttons fit one row on a narrow
//      phone (they ran 22 px past the bar at 360 px), and the armed Reset reads "Reset?".
// v64: program.html changed (2026-09-27, ONB-01): three one-time hints in a new athlete's first session
//      (Start or Guided, the set circle, How hard?), each gone once the athlete does the thing.
// v65: program.html changed (2026-09-27, WK-05): a warm-up circuit is a list (cues on a tap), and a
//      circuit's rest is never invented (it fell back to 60 s).
// v66: program.html and habits.html changed (2026-09-27, NAV-02): the initials button opens Theme,
//      Install, Help, Privacy and Sign out (which sends everything first); Proof's Settings signs out.
// v67: program.html changed (2026-09-27, WK-03): from Start until Done the session bar is one slim line
//      (← Home, clock, Pause, ⋯) and the tab bar hides (Amir's option C).
// v68: program.html changed (2026-09-27, COACH-02): the guide opens in the sheet (your initials, one row on
//      the Coach tab, "How hard?", "tempo", Guided's ?); a Guided mode card.
// v69: program.html changed (2026-09-27, PROG-01): the This cycle card at the top of Home (the week, sessions
//      done, and effort-matched wins), replacing the small cycle line.
// v70: program.html changed (2026-09-27): the working card's "Same as last" button is gone (the open
//      card's Last time box already shows last time); Guided's rest screen keeps its own.
// v71: program.html changed (2026-09-27, CONS-01): one RPE control everywhere (a set, a circuit's rounds,
//      Guided, the session rating and Log a max): 44 px, and a second tap clears it.
// v72: program.html changed (2026-09-27, DS-03): one type scale (seven sizes and a field size, nothing
//      under 11 px), buttons in the app's font, only weights that are loaded; the line of numbers is never cut.
// v73: program.html changed (2026-09-27, NAV-01): one close grammar: Guided's ✕ at the top right, sheets
//      slide down (a handle, a swipe), their Close is a 44 px target.
// v74: program.html changed (2026-09-27, POL-01): Back keeps your place (manual scroll restoration), the
//      Library returns to where it was, the rest screen is solid, a superset's rows fit 320 px, "Session habit".
// v75: program.html and habits.html changed (2026-09-27, A11Y-01): pinch-zoom is on in the training app (5x),
//      and both apps drop only the double-tap zoom (touch-action: manipulation).
// v76: habits.html changed (2026-09-27, PRF-01): the circle is the tick, + is 44 px in the habit's tint,
//      the programme's session is one slim line at the end of Today.
// v77: habits.html and program.html changed (2026-09-27, PRF-03): Today leads with the verdict ("2 to go",
//      On target, Perfect) instead of the day's percentage, and the training app's habits row says the same.
// v78: habits.html changed (2026-09-27, PRF-05): one week strip on Today's card, ticked when on target, is
//      also the day picker (the four day chips went); the card a size smaller; the rank's name is fitted.
// v79: habits.html changed (2026-09-27, PRF-02 part 1): only a level, a rank and a 7+ day streak take the
//      whole screen (a level's reward on it); medals, tiers, a perfect day, a comeback: the wins card on Today.
// v80: habits.html changed (2026-09-27, PRF-02 part 2): the tour is five steps (the row, the week, the level
//      and the Locker, the board, your initials).
// v81: habits.html changed (2026-09-27, PRF-02 part 3): Progress shows the next three milestones, quests only
//      while a run is on, the Locker's road to the next three rewards, Crew opens on the board.
// v82: habits.html changed (2026-09-27, POL-02): one word each (Milestones, Locker), the tab bar lights where
//      you are, Day N is your day, "Off", a grey lock notice, a toast above a sheet, dark buttons at 5:1.
// v83: habits.html changed (2026-09-27, A11Y-01): no label under 11 px anywhere in AA Proof (904 were).
// v84: program.html changed (2026-09-27, DS-01): clay means "look here"; every block is one green, the running
//      bar, Guided, labels and + Log a max green or grey.
// v85: program.html changed (2026-09-27, DS-03 part 2): one primary button (eleven looks were one green one).
// v86: program.html changed (2026-09-27, LIB-01): the Sessions shelves are a list (a photo band, three rows,
//      All N ›), and a session at the right moment: sore → the finished card, the week done → Home.
// v87: program.html changed (2026-09-27, POL-01): the Quality sheet shows no "How we measure it".
// v88: program.html changed (2026-09-27): a week note's rpeDrop never takes a lower day's target under RPE 6.
// v89: program.html and habits.html changed (2026-09-27, DOC-01): comments only, checked against the code.
// v90: program.html changed (2026-09-27, DOC-01 follow-ups): Log a max's form without clay, the guide's Rest
//      line, an article link opens the published row.
// v91: habits.html changed (2026-09-27): EXTRA MILESTONES in Settings, ON A STREAK on the share cards.
// v92: program.html changed (2026-09-27): dead code the DOC-01 pass found, removed (316 lines, no behaviour).
// v93: habits.html changed (2026-09-27): the same for AA Proof (105 lines, no behaviour).
const CACHE = 'aap-v93';

// Pre-cached on install — the minimum needed to open the app offline.
const SHELL = [
  '/program.html',
  // On the login screen since 2026-09-12 — the first image an athlete ever loads.
  '/court-sessions.jpg',
  '/manifest.json',
  '/assets/css/tokens.css',
  '/assets/css/base.css',
  '/assets/css/components.css',
  '/assets/js/shared.js',
  '/assets/img/icon-192.png',
  '/assets/img/icon-512.png',
];

// Install: pre-cache the shell, then activate immediately (don't wait for old tabs to close).
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      // cache:'reload' — a bare addAll() can be answered from the browser's HTTP cache, which
      // files the OLD bytes under the NEW version name; the fetch handler is cache-first, so
      // they would then be pinned until the next bump. Seen testing the v9 bump: the fresh
      // cache held the previous shared.js.
      .then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

// Activate: wipe THIS app's older caches, take control of all open tabs now.
// ⚠️ Cache Storage is shared by the whole origin. The old filter (`k !== CACHE`) deleted
// every other cache too, so each bump here would silently destroy the offline copy of any
// other app on amirardekani.com. Only ever delete the aap- prefix.
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith('aap-') && k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Serve the cached copy at once and refresh it in the background for next time.
//
// ⚠️ TWO THINGS HERE ARE LOAD-BEARING, and getting either wrong produces an app
// that is fast and then never updates again — which is worse than slow.
//   1. `refresh` must resolve only AFTER cache.put() finishes, because it is what
//      waitUntil() holds the worker open for. Resolving on the response alone
//      lets the browser kill the worker mid-write, and the new version is
//      silently dropped every single time. That is not theoretical: it is what
//      the first draft of this did, and a fourth consecutive load still served
//      the first build.
//   2. `cache: 'reload'` makes the background fetch skip the HTTP cache. Without
//      it the revalidation can be answered from Chrome's own cache with the
//      very bytes we are trying to replace, and the shell freezes one version
//      behind for as long as that entry stays fresh.
function staleWhileRevalidate(e, request, key) {
  const refresh = fetch(new Request(request.url, { cache: 'reload', credentials: 'same-origin' }))
    .then(res => {
      if (!res.ok) return res;
      const copy = res.clone();
      return caches.open(CACHE).then(c => c.put(key, copy)).then(() => res);
    });
  e.waitUntil(refresh.catch(() => {}));
  return caches.open(CACHE)
    .then(c => c.match(key))
    .then(cached => cached || refresh)
    .catch(() => refresh);
}

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Only intercept same-origin requests.
  if (url.origin !== location.origin) return;

  // Hands off /reach/ and /tennis/. This worker's scope is '/', so without this it would
  // answer those pages from its own cache: the reachability probe would then report
  // "opens without a VPN" from a cached copy on exactly the phones being tested, and the
  // paid course app (which has its own worker and caches) would get stale files pinned.
  // Returning without respondWith() sends the request to the network untouched.
  // /tennis-testing/ is the testing app: it must always get its newest script, never a pinned copy.
  if (/^\/(reach|tennis|tennis-testing)(\/|$)/.test(url.pathname)) return;

  // HTML (navigate) — STALE-WHILE-REVALIDATE (Amir, 2026-09-12: opening the
  // home-screen icon was slow). This was network-first, which meant every tap on
  // the installed icon re-downloaded all 360KB of program.html before a single
  // pixel appeared; the cached shell was only ever used when the network FAILED,
  // so a merely slow connection held the whole app hostage. iOS kills a
  // backgrounded PWA aggressively, so almost every open paid it cold.
  //
  // ⚠️ What makes this safe is that the programme is NOT in this file any more.
  // Since 2026-09-07 every programme is a row in public.programs fetched live on
  // each boot, so a one-launch-old shell still shows today's training. The only
  // thing that lags a deploy is the app's own code, and it lands on the next
  // open — which is why the background refresh below is not optional.
  // (With no signal, the page itself opens the last plan it loaded from
  // localStorage `plancache` — REL-01. This worker never stores a plan.)
  //
  // Keyed on the PATHNAME, not the full URL: a legacy ?client=&key= link and a
  // plain /program.html are the same shell, and caching them separately would
  // mean the installed icon never hits the copy the other one warmed.
  if (request.mode === 'navigate') {
    e.respondWith(staleWhileRevalidate(e, request, url.origin + url.pathname));
    return;
  }

  // JSON (articles, workouts) — network-first so updates land immediately, but
  // keep the last good copy as an offline fallback.
  // ⚠️ This used to be how a PWA relaunched with no signal still found its
  // programme: data/<id>.json. Those files have been a 404 since 2026-09-07 (a
  // 404 is never cached here), so from then until REL-01 (2026-09-26) an offline
  // relaunch showed "Program Not Found". The programme now opens offline from
  // the page's own localStorage copy (`plancache`), not from this cache.
  if (url.pathname.endsWith('.json')) {
    e.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) caches.open(CACHE).then(c => c.put(request, res.clone()));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static assets (CSS, JS, images, fonts) — cache-first, network fallback.
  e.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(res => {
        // ⚠️ Only cache a real answer. Cache.put stores ANY response, 404s
        // included, and this branch is cache-first — so a phone that asked for
        // an image before it existed would keep serving that 404 for ever, and
        // art uploaded later would never appear. Found 2026-09-19, when the app
        // had spent months probing four extensions for every missing cycle
        // banner. No CACHE bump: the art ships under new paths, and bumping
        // would throw away every athlete's offline copy of the app for nothing.
        if (res && res.ok) caches.open(CACHE).then(c => c.put(request, res.clone()));
        return res;
      });
    })
  );
});
