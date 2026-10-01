/* The reel kit: blocks as small functions (see BLOCKS.md for what each one is for, and when NOT to use it).
 *
 * Every block creates its own elements on the stage and adds its tweens to the master timeline.
 * Times are seconds on the EDITED clock: wrap anything tied to speech in E(sourceSeconds).
 * Every block returns its elements, so a reel can add bespoke tweens on top. The kit is ingredients, not recipes.
 *
 * Needs: gsap, kit.css, and a stage element #stage. Farsi rules are built in: words animate whole, never letter by letter.
 */
(function (global) {
  "use strict";
  const K = {};
  let tl, stage;
  const FA = "۰۱۲۳۴۵۶۷۸۹";
  K.fa = (n) => String(n).replace(/\d/g, (d) => FA[+d]); // Persian digits
  K.words = (s) => String(s).trim().split(/\s+/);

  const mk = (tag, cls, html, parent) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    (parent || stage).appendChild(e);
    return e;
  };

  // `hyperframes check` (tools/check_gate.py) reads these marks. A block that layers or bleeds on purpose says so, so the gate fails only on an
  // accident. overlap: text boxes touch (the boxes, not the ink). occlusion: type behind him, or in a clipped window. overflow: bigger than its
  // frame. caption-zone: its BOX dips into his caption band y 230-470 (the ink does not).
  // WHERE the mark goes matters (tested 2026-10-01): caption-zone and overflow marks on a container cover what is inside it, but an occlusion or an
  // overlap mark counts only on the TEXT element itself (an ancestor's does not), so digits and words carry LEAF. text_not_painted has no mark.
  const allow = (e, ...kinds) => {
    kinds.forEach((k) => e.setAttribute("data-layout-allow-" + k, ""));
    return e;
  };
  const LEAF = " data-layout-allow-occlusion data-layout-allow-overlap data-layout-allow-overflow";
  const DI = "<i" + LEAF + ">"; // one digit of an odometer column

  // The master timeline. from/fromTo must NOT paint their start state at frame 0 (a later wipe-out would show its layer at once).
  K.timeline = () => global.gsap.timeline({ paused: true, defaults: { immediateRender: false } });
  K.init = (o) => {
    tl = o.tl;
    stage = o.stage || document.getElementById("stage");
    K.bar = mk("div", "k-bar");
    K.flashEl = mk("div", "k-flash");
    // clean-ring filters for outlined type: Farsi letters overlap where they join, so a plain text stroke would show the joins.
    // The ring is built from the silhouette (dilate minus erode), so it never does. ol = paper, oc = clay; 3 and 5 = half the ring width in px.
    const ring = (id, r, colour) =>
      '<filter id="' + id + '" x="-5%" y="-16%" width="110%" height="132%" color-interpolation-filters="sRGB">' +
      '<feMorphology in="SourceAlpha" operator="dilate" radius="' + r + '" result="d"/>' +
      '<feMorphology in="SourceAlpha" operator="erode" radius="' + r + '" result="e"/>' +
      '<feComposite in="d" in2="e" operator="out" result="ring"/>' +
      '<feFlood flood-color="' + colour + '" result="c"/><feComposite in="c" in2="ring" operator="in"/></filter>';
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.setAttribute("style", "position:absolute;left:0;top:0");
    svg.innerHTML = ring("k-ol3", 3, "#faf7f2") + ring("k-ol5", 5, "#faf7f2") + ring("k-oc3", 3, "#e06b43") + ring("k-oc5", 5, "#e06b43");
    stage.appendChild(svg);
    return K;
  };

  /* ---------- entrances shared by stamps and chips ---------- */
  const ENTER = {
    pop: (s, t) => tl.fromTo(s, { autoAlpha: 0, scale: 0.6, y: 40 }, { autoAlpha: 1, scale: 1, y: 0, duration: 0.4, ease: "back.out(1.8)" }, t),
    slide: (s, t) => tl.fromTo(s, { autoAlpha: 0, x: 520 }, { autoAlpha: 1, x: 0, duration: 0.55, ease: "expo.out" }, t),
    drop: (s, t) => tl.fromTo(s, { autoAlpha: 0, y: -380, rotate: -7 }, { autoAlpha: 1, y: 0, rotate: -1.5, duration: 0.7, ease: "bounce.out" }, t),
    mask: (s, t) => {
      tl.set(s, { autoAlpha: 1 }, t);
      tl.fromTo(s, { clipPath: "inset(0px 0px 0px 100%)" }, { clipPath: "inset(0px 0px 0px 0%)", duration: 0.45, ease: "power3.out" }, t);
    },
  };
  const gone = (els, t, o = {}) =>
    tl.to(els, { autoAlpha: 0, y: o.y ?? 20, scale: o.scale ?? 0.92, duration: o.d ?? 0.22, ease: "power2.in", stagger: o.stagger ?? 0.04 }, t);

  /* ---------- transitions ---------- */
  // wipeIn / wipeOut: for the full-screen layers (question, court, the statement cards). variant: "clay" (a clay line sweeps right
  // to left, the Farsi reading direction), "iris" (a circle opens), "push" (the layer slides over), "slice" (six bars), "whip" (a
  // fast slide with blur), "zoom" (a circle opens while the layer rushes in).
  // slice: six bars wipe in one after another from the right (the reading side). One comb-shaped polygon driven by the CSS variable --p.
  const SLICE = (() => {
    const n = 6, H = 1920 / n, S = 0.09, span = 1 - (n - 1) * S;
    const w = (i) => "clamp(0px, calc((var(--p) - " + (i * S).toFixed(3) + ") * " + (1080 / span).toFixed(2) + "px), 1080px)";
    const pts = ["1080px 0px"];
    for (let i = 0; i < n; i++) {
      pts.push("calc(1080px - " + w(i) + ") " + i * H + "px");
      pts.push("calc(1080px - " + w(i) + ") " + (i + 1) * H + "px");
      pts.push("1080px " + (i + 1) * H + "px");
    }
    return "polygon(" + pts.join(", ") + ")";
  })();
  const HIDDEN = "inset(0px 0px 0px 100%)";
  K.wipeIn = (layer, t, d = 0.5, v = "clay") => {
    if (v === "slice") {
      tl.set(layer, { clipPath: SLICE, "--p": 0 }, t);
      tl.fromTo(layer, { "--p": 0 }, { "--p": 1, duration: d * 1.2, ease: "power2.inOut" }, t);
      return;
    }
    if (v === "whip") {
      tl.set(layer, { clipPath: "inset(0px 0px 0px 0px)" }, t);
      tl.fromTo(layer, { x: 1180, skewX: -14, filter: "blur(22px)" }, { x: 0, skewX: 0, filter: "blur(0px)", duration: d * 0.9, ease: "power4.out" }, t);
      return;
    }
    if (v === "zoom") {
      tl.fromTo(layer, { clipPath: "circle(0% at 50% 50%)", scale: 1.7, filter: "blur(18px)" }, { clipPath: "circle(78% at 50% 50%)", scale: 1, filter: "blur(0px)", duration: d, ease: "power3.out" }, t);
      return;
    }
    if (v === "iris") {
      tl.fromTo(layer, { clipPath: "circle(0% at 50% 55%)" }, { clipPath: "circle(80% at 50% 55%)", duration: d, ease: "power3.inOut" }, t);
      return;
    }
    if (v === "push") {
      tl.set(layer, { clipPath: "inset(0px 0px 0px 0px)" }, t);
      tl.fromTo(layer, { x: 1080 }, { x: 0, duration: d, ease: "power3.inOut" }, t);
      return;
    }
    tl.set(K.bar, { autoAlpha: 1 }, t);
    tl.fromTo(layer, { clipPath: "inset(0px 0px 0px 1080px)" }, { clipPath: "inset(0px 0px 0px 0px)", duration: d, ease: "power3.inOut" }, t);
    tl.fromTo(K.bar, { x: 0 }, { x: -1116, duration: d, ease: "power3.inOut" }, t);
    tl.set(K.bar, { autoAlpha: 0 }, t + d);
  };
  K.wipeOut = (layer, t, d = 0.5, v = "clay") => {
    if (v === "slice") {
      tl.fromTo(layer, { "--p": 1 }, { "--p": 0, duration: d * 1.2, ease: "power2.inOut" }, t);
      tl.set(layer, { clipPath: HIDDEN }, t + d * 1.2 + 0.02);
      return;
    }
    if (v === "whip") {
      tl.fromTo(layer, { x: 0, skewX: 0, filter: "blur(0px)" }, { x: -1180, skewX: 14, filter: "blur(22px)", duration: d * 0.9, ease: "power3.in" }, t);
      tl.set(layer, { clipPath: HIDDEN, x: 0, skewX: 0, filter: "none" }, t + d * 0.9 + 0.02);
      return;
    }
    if (v === "zoom") {
      tl.fromTo(layer, { clipPath: "circle(78% at 50% 50%)", scale: 1, filter: "blur(0px)" }, { clipPath: "circle(0% at 50% 50%)", scale: 0.55, filter: "blur(14px)", duration: d, ease: "power3.in" }, t);
      tl.set(layer, { clipPath: HIDDEN, scale: 1, filter: "none" }, t + d + 0.02);
      return;
    }
    if (v === "iris") {
      tl.fromTo(layer, { clipPath: "circle(80% at 50% 55%)" }, { clipPath: "circle(0% at 50% 55%)", duration: d, ease: "power3.inOut" }, t);
      return;
    }
    if (v === "push") {
      tl.to(layer, { x: -1080, duration: d, ease: "power3.inOut" }, t);
      tl.set(layer, { clipPath: "inset(0px 0px 0px 100%)", x: 0 }, t + d);
      return;
    }
    tl.set(K.bar, { autoAlpha: 1 }, t);
    tl.fromTo(layer, { clipPath: "inset(0px 0px 0px 0px)" }, { clipPath: "inset(0px 1080px 0px 0px)", duration: d, ease: "power3.inOut" }, t);
    tl.fromTo(K.bar, { x: 0 }, { x: -1116, duration: d, ease: "power3.inOut" }, t);
    tl.set(K.bar, { autoAlpha: 0 }, t + d);
  };
  // flash: a quick flash that peaks at t. Use once, on the moment that matters.
  K.flash = (t, o = {}) => {
    tl.set(K.flashEl, { backgroundColor: o.color || "#fff" }, Math.max(0, t - 0.07));
    tl.fromTo(K.flashEl, { autoAlpha: 0 }, { autoAlpha: o.peak ?? 0.95, duration: 0.07, ease: "power1.in" }, Math.max(0, t - 0.07));
    tl.to(K.flashEl, { autoAlpha: 0, duration: o.d ?? 0.34, ease: "power2.out" }, t);
  };

  /* ---------- stamps: one tag per spoken word ----------
   * K.stamps(["فقط","یه","تمرین"], { at:[t,t,t], y:1250, size:"big"|"sm"|"huge"|"mega", tone:"paper"|"ink"|"green"|"bad",
   *   variant:"pop"|"slide"|"drop"|"mask", x:(left px, to align left instead of centring), out:t }) */
  K.stamps = (words, o = {}) => {
    const row = mk("div", "k-layer");
    row.style.top = (o.y ?? 1250) + "px";
    if (o.x != null) {
      row.style.left = o.x + "px";
      row.style.width = "auto";
      row.style.justifyContent = "flex-start";
    }
    const els = words.map((w) => mk("div", "k-stamp k-" + (o.size || "big") + (o.tone ? " k-" + o.tone : "") + " k-hid", w, row));
    els.forEach((s, i) => ENTER[o.variant || "pop"](s, o.at[i] ?? o.at[o.at.length - 1]));
    if (o.out != null) gone(els, o.out);
    return { row, els };
  };

  /* ---------- chips: a list of options, one per spoken word ----------
   * K.chips(["پرش","اسکات سنگین",...], { at:[t,...], layout:"grid2"|"stack", y:1210, variant, out:t, lead:0.03 }) */
  K.chips = (items, o = {}) => {
    const box = mk("div", "k-chips k-" + (o.layout || "grid2"));
    box.style.top = (o.y ?? 1210) + "px";
    const els = items.map((w) => mk("div", "k-stamp k-chip k-hid", w, box));
    els.forEach((c, i) => ENTER[o.variant || "pop"](c, (o.at[i] ?? o.at[o.at.length - 1]) - (o.lead ?? 0.03)));
    if (o.out != null) gone(els, o.out, { scale: 0.9 });
    return { box, els };
  };

  /* ---------- ghost numeral: a huge translucent number on the wall ---------- */
  K.ghost = (text, o = {}) => {
    const g = mk("div", "k-ghost k-hid", text);
    g.style.left = (o.x ?? 40) + "px";
    g.style.top = (o.y ?? 520) + "px";
    g.style.fontSize = (o.size ?? 640) + "px";
    tl.fromTo(g, { autoAlpha: 0, x: -90, scale: 0.9 }, { autoAlpha: 1, x: 0, scale: 1, duration: 0.8, ease: "expo.out" }, o.at);
    if (o.out != null) tl.to(g, { autoAlpha: 0, duration: 0.3 }, o.out);
    return g;
  };

  /* ---------- tag: a small stamp beside him, with a ring burst ---------- */
  K.tag = (text, o = {}) => {
    const x = o.x ?? 28, y = o.y ?? 860;
    const ring = mk("div", "k-ring k-hid");
    ring.style.left = x - 8 + "px";
    ring.style.top = y - 20 + "px";
    const tag = mk("div", "k-stamp k-sm k-hid" + (o.tone ? " k-" + o.tone : ""), text);
    tag.style.position = "absolute";
    tag.style.left = x + "px";
    tag.style.top = y + "px";
    tag.style.zIndex = 10;
    tl.fromTo(tag, { autoAlpha: 0, scale: 0.4, rotate: -10 }, { autoAlpha: 1, scale: 1, rotate: o.rot ?? -3, duration: 0.45, ease: "back.out(2.2)" }, o.at);
    if (o.ring !== false) tl.fromTo(ring, { scale: 0.3, autoAlpha: 0.95 }, { scale: 2.6, autoAlpha: 0, duration: 0.7, ease: "power2.out" }, o.at);
    if (o.out != null) gone(tag, o.out);
    return { tag, ring };
  };

  /* ---------- question card: a full-screen card while his voice runs on ----------
   * K.question(["از یه تمرین", {t:"انفجاری", em:true}, "چی می‌خواید؟"],
   *   { at:t (wipe in), lineAt:[t,t,t], out:t (wipe out), look:"clay"(default)|"court"|"ink", court:"clay"|"green",
   *     wipeVariant:"iris"(default)|"push"|"clay", tops:[560,770,1070] })  -- an {em:true} line is the stamped, slammed one */
  K.question = (lines, o = {}) => {
    const look = o.look || "clay"; // his favourite (showreel 09); ink and court are the other two
    const card = mk("div", "k-full k-" + look);
    if (look === "court") {
      mk("img", "k-bg", null, card).src = "img/court-" + (o.court || "clay") + ".jpg";
      mk("div", "k-scrim", "", card);
    }
    const glow = look === "court" ? null : mk("div", "k-qglow", "", card);
    const ring = mk("div", "k-qring k-hid", "", card);
    const tops = o.tops || [560, 770, 1070];
    const els = lines.map((ln, i) => {
      const obj = typeof ln === "object", text = obj ? ln.t : ln;
      if (obj && ln.em) {
        const w = mk("div", "k-qem", "", card);
        w.style.top = tops[i] + "px";
        return { em: true, el: mk("div", "k-stamp k-hid", text, w) };
      }
      const d = mk("div", "k-qline k-hid", text, card);
      d.style.top = tops[i] + "px";
      return { em: false, el: d };
    });
    const wv = o.wipeVariant || "iris"; // his favourite pairing with the clay card
    K.wipeIn(card, o.at, o.wipe ?? 0.5, wv);
    els.forEach((x, i) => {
      const t = o.lineAt[i];
      if (x.em) {
        tl.fromTo(x.el, { scale: 2.4, autoAlpha: 0, rotate: -5 }, { scale: 1, autoAlpha: 1, rotate: -2, duration: 0.5, ease: "expo.out" }, t);
        tl.fromTo(ring, { scale: 0.3, autoAlpha: 0.95 }, { scale: 3.6, autoAlpha: 0, duration: 0.85, ease: "power2.out" }, t);
        if (glow) tl.fromTo(glow, { scale: 0.6, opacity: 0.2 }, { scale: 1.2, opacity: 1, duration: 0.9, ease: "power2.out" }, t);
      } else {
        tl.fromTo(x.el, { x: 420, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.55, ease: "expo.out" }, t);
      }
    });
    K.wipeOut(card, o.out, o.wipe ?? 0.5, wv);
    return { card, els };
  };

  /* ---------- checklist: rules that arrive as he names them, then get ticked ----------
   * K.checklist(["نیروی زیاد · زمان کوتاه", ...], { at:[t,t,t] (each row in), ticks:[t,t,t], style:"paper"|"dark", y:1205,
   *   pulses:[t,t,t] (each row pulses), hide:[t0,t1] (move away at t0, come back at t1), out:t }) */
  const CHK =
    '<svg viewBox="0 0 48 48"><circle class="k-ringc" cx="24" cy="24" r="20"/><circle class="k-fill" cx="24" cy="24" r="22"/><path class="k-tick" d="M13.5 25.5 L21 33 L35 16"/></svg>';
  K.checklist = (items, o = {}) => {
    const box = mk("div", "k-list k-" + (o.style || "paper"));
    box.style.top = (o.y ?? 1205) + "px";
    const rows = items.map((it, i) => {
      const lab = typeof it === "string" ? it : it.label;
      const n = (it && it.n) || K.fa(i + 1);
      const r = mk("div", "k-item k-hid", '<div class="k-num">' + n + '</div><div class="k-lab"><span>' + lab + '</span></div><div class="k-chk">' + CHK + "</div>", box);
      global.gsap.set(r.querySelector(".k-fill"), { svgOrigin: "24 24", scale: 0.3, opacity: 0 });
      return r;
    });
    rows.forEach((r, i) => {
      const t = o.at[i];
      tl.fromTo(r, { x: 760, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.6, ease: "expo.out" }, t);
      tl.fromTo(r.querySelector(".k-lab span"), { clipPath: "inset(0px 0px 0px 100%)" }, { clipPath: "inset(0px 0px 0px 0%)", duration: 0.5, ease: "power2.out" }, t + 0.18);
    });
    (o.pulses || []).forEach((t, i) => {
      tl.to(rows[i], { scale: 1.05, duration: 0.14, ease: "power2.out" }, t);
      tl.to(rows[i], { scale: 1, duration: 0.3, ease: "power2.inOut" }, t + 0.14);
    });
    if (o.hide) {
      tl.to(rows, { y: 140, autoAlpha: 0, duration: 0.3, ease: "power2.in", stagger: 0.05 }, o.hide[0]);
      tl.fromTo(rows, { y: 140, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, ease: "expo.out", stagger: 0.08 }, o.hide[1]);
    }
    const tick = (i, t) => {
      const r = rows[i];
      tl.to(r.querySelector(".k-fill"), { opacity: 1, scale: 1, svgOrigin: "24 24", duration: 0.3, ease: "back.out(2.4)" }, t);
      tl.to(r.querySelector(".k-tick"), { strokeDashoffset: 0, duration: 0.28, ease: "power2.out" }, t + 0.08);
      tl.to(r.querySelector(".k-num"), { backgroundColor: "#1f7a4d", duration: 0.25 }, t);
      tl.to(r, { scale: 1.045, duration: 0.12, ease: "power2.out" }, t);
      tl.to(r, { scale: 1, duration: 0.3, ease: "power2.inOut" }, t + 0.12);
    };
    (o.ticks || []).forEach((t, i) => tick(i, t));
    if (o.out != null) tl.to(rows, { x: -900, autoAlpha: 0, duration: 0.5, ease: "power3.in", stagger: 0.07 }, o.out);
    return { box, rows, tick };
  };

  /* ---------- court cutaway, "steps": a ball is struck, then a runner takes a few steps to it ----------
   * K.courtSteps({ at:t (wipe in), hit:t (the strike), line1:"چند ثانیه", line1At:t, line2:"چند قدم", line2At:t,
   *   steps:[t,t,t,t,t], arrive:t, out:t (wipe out), image:"clay"|"green", wipeVariant, dur:4.2 }) */
  const court = (o, image) => {
    const c = mk("div", "k-full k-court");
    mk("img", "k-bg", null, c).src = "img/court-" + (image || "clay") + ".jpg";
    mk("div", "k-scrim", "", c);
    return c;
  };
  K.courtSteps = (o = {}) => {
    const c = court(o, o.image);
    const t1 = mk("div", "k-ctext k-hid", o.line1 || "", c);
    t1.style.top = "520px";
    const w2 = mk("div", "k-cstamp", "", c);
    w2.style.top = "770px";
    const t2 = mk("div", "k-stamp k-huge k-hid", o.line2 || "", w2);
    const mx = [135, 270, 405, 540, 675], my = [1625, 1563, 1500, 1438, 1375];
    const mks = mx.map((x, k) => {
      const m = mk("div", "k-mk", "", c);
      m.style.left = x + "px";
      m.style.top = my[k] + "px";
      return m;
    });
    const run = mk("div", "k-run", "", c);
    const ball = mk("img", "k-ball", null, c);
    ball.src = "img/ball.webp";
    const wv = o.wipeVariant || "clay";
    K.wipeIn(c, o.at, 0.45, wv);
    tl.fromTo(c.querySelector(".k-bg"), { scale: 1 }, { scale: 1.14, duration: o.dur ?? 4.2, ease: "none" }, o.at);
    tl.fromTo(ball, { x: -170, y: 150, rotate: 0, autoAlpha: 1 }, { x: 700, y: 1290, rotate: 540, duration: 0.85, ease: "power1.in" }, o.hit);
    tl.to(ball, { x: 770, y: 1200, duration: 0.22, ease: "power2.out" }, o.hit + 0.85);
    tl.to(ball, { x: 830, y: 1290, duration: 0.22, ease: "power2.in" }, o.hit + 1.07);
    tl.fromTo(t1, { x: 520, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.55, ease: "expo.out" }, o.line1At);
    tl.fromTo(t2, { scale: 0.4, autoAlpha: 0, y: 50 }, { scale: 1, autoAlpha: 1, y: 0, duration: 0.5, ease: "back.out(2)" }, o.line2At);
    tl.set(run, { autoAlpha: 1 }, o.steps[0] - 0.05);
    o.steps.forEach((s, k) => {
      tl.fromTo(mks[k], { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.18, ease: "back.out(3)" }, s);
      tl.to(run, { x: mx[k] - 110 + 12, y: my[k] - 1660 + 12, duration: 0.22, ease: "power2.out" }, s);
    });
    const arrive = o.arrive ?? o.steps[o.steps.length - 1] + 0.05;
    tl.to(run, { x: 735, y: 1300 - 1660 + 10, duration: 0.2, ease: "power2.out" }, arrive);
    tl.fromTo(ball, { scale: 1 }, { scale: 1.18, duration: 0.2, yoyo: true, repeat: 1, ease: "power2.out" }, arrive);
    K.wipeOut(c, o.out, 0.45, wv);
    return { layer: c, ball, run };
  };

  /* ---------- court cutaway, "measure": a distance line draws in and a ball sprints along it ----------
   * K.courtMeasure({ at:t, label:"چند متر", labelAt:t, sprintAt:t, out:t, image:"green"|"clay", wipeVariant }) */
  K.courtMeasure = (o = {}) => {
    const c = court(o, o.image || "green");
    const w = mk("div", "k-cstamp", "", c);
    w.style.top = "640px";
    const lab = mk("div", "k-stamp k-huge k-hid", o.label || "", w);
    const capL = mk("div", "k-cap", "", c);
    capL.style.left = "125px";
    const capR = mk("div", "k-cap", "", c);
    capR.style.left = "945px";
    const dist = mk("div", "k-dist", "", c);
    const streak = mk("div", "k-streak", "", c);
    const ball = mk("img", "k-ball", null, c);
    ball.src = "img/ball.webp";
    const wv = o.wipeVariant || "clay";
    K.wipeIn(c, o.at, 0.45, wv);
    tl.fromTo(c.querySelector(".k-bg"), { scale: 1.12 }, { scale: 1, duration: 3.0, ease: "none" }, o.at);
    tl.fromTo(lab, { scale: 0.4, autoAlpha: 0, y: 50 }, { scale: 1, autoAlpha: 1, y: 0, duration: 0.5, ease: "back.out(2)" }, o.labelAt);
    tl.fromTo(capR, { autoAlpha: 0, scaleY: 0 }, { autoAlpha: 1, scaleY: 1, duration: 0.25, ease: "power2.out" }, o.labelAt + 0.05);
    tl.fromTo(dist, { autoAlpha: 1, scaleX: 0 }, { autoAlpha: 1, scaleX: 1, duration: 0.5, ease: "power3.out" }, o.labelAt + 0.15);
    tl.fromTo(capL, { autoAlpha: 0, scaleY: 0 }, { autoAlpha: 1, scaleY: 1, duration: 0.25, ease: "power2.out" }, o.labelAt + 0.5);
    tl.fromTo(ball, { x: 905, y: 1190, rotate: 0, autoAlpha: 1 }, { x: 70, y: 1190, rotate: -900, duration: 1.0, ease: "power3.out" }, o.sprintAt);
    tl.fromTo(streak, { scaleX: 0, autoAlpha: 0, y: 0 }, { scaleX: 1, autoAlpha: 0.9, y: 235, duration: 0.5, ease: "power2.out" }, o.sprintAt + 0.05);
    tl.to(streak, { autoAlpha: 0, duration: 0.3 }, o.sprintAt + 0.7);
    K.wipeOut(c, o.out, 0.45, wv);
    return { layer: c, ball };
  };

  /* ================= the depth family (extends K.behind) =================
   * Layers that live BETWEEN the wall and him. Like K.behind they need a footage segment whose plan entry carries
   * inner_html = kit.behind_video("full_cut.webm", <the segment's `in` second>): the cut-out video shares that segment's zoom.
   * Inside the segment wrapper (#v<seg>) the order is: footage < backdrop, dim < words, rows, halo, sweep < the cut-out < floor fade.
   * Several can run in one segment: the cut-out stays on from the first one's start to the last one's end.
   * His framing at zoom 1.0: free wall from y 470 (his captions own 230-470), head about y 610-900, shoulders from y 930, so
   * words are readable above and beside his head, and anything lower is texture that slides behind him.
   */
  const DEPTH = {};
  const depth = (seg, t0, t1) => {
    let d = DEPTH[seg];
    if (!d) {
      const wrap = document.getElementById("v" + seg);
      if (!wrap || !wrap.querySelector("video.k-cut")) throw new Error("segment " + seg + " has no cut-out: give its plan entry inner_html = kit.behind_video(...)");
      d = DEPTH[seg] = { wrap, cut: wrap.querySelector("video.k-cut"), spans: [], sw: global.gsap.timeline({ defaults: { immediateRender: false } }) };
      tl.add(d.sw, 0);
    }
    d.spans.push([Math.max(0, t0 - 0.1), t1 + 0.45]);
    d.sw.clear();
    const merged = [];
    d.spans.slice().sort((a, b) => a[0] - b[0]).forEach((s) => {
      const last = merged[merged.length - 1];
      if (last && s[0] <= last[1]) last[1] = Math.max(last[1], s[1]);
      else merged.push(s.slice());
    });
    merged.forEach((s) => {
      d.sw.set(d.cut, { opacity: 1 }, s[0]);
      d.sw.set(d.cut, { opacity: 0 }, s[1]);
    });
    return d;
  };
  const deepWord = (d, text, o = {}) => {
    const ol = o.tone === "outline" || o.tone === "outline-clay";
    const e = mk("div", "k-deep" + (o.tone ? " k-" + o.tone : ""), ol ? "<span" + LEAF + ">" + text + "</span>" : text, d.wrap);
    allow(e, "caption-zone", "occlusion", "overflow", "overlap"); // type behind him: his head hides part of it, a giant word bleeds, echoes stack
    if (o.size) e.style.fontSize = o.size + "px";
    if (o.top != null) e.style.top = o.top + "px";
    if (o.x) e.style.left = o.x + "px";
    return e;
  };
  // how a word arrives and leaves. "rise" is a mask: the letters climb out of their own baseline.
  const DIN = {
    rise: (e, t, a, size) =>
      tl.fromTo(e, { autoAlpha: 0, y: size * 0.35, clipPath: "inset(" + size + "px -90px -90px -90px)" },
        { autoAlpha: a, y: 0, clipPath: "inset(-90px -90px -90px -90px)", duration: 0.8, ease: "expo.out" }, t),
    blur: (e, t, a) => tl.fromTo(e, { autoAlpha: 0, scale: 1.6, filter: "blur(22px)" }, { autoAlpha: a, scale: 1, filter: "blur(0px)", duration: 0.55, ease: "expo.out" }, t),
    slide: (e, t, a, size, dir) => tl.fromTo(e, { autoAlpha: 0, x: 380 * (dir ?? 1) }, { autoAlpha: a, x: 0, duration: 0.55, ease: "expo.out" }, t),
    pop: (e, t, a) => tl.fromTo(e, { autoAlpha: 0, scale: 0.7 }, { autoAlpha: a, scale: 1, duration: 0.5, ease: "back.out(1.7)" }, t),
    draw: (e, t, a) =>
      tl.fromTo(e, { autoAlpha: a, scale: 1.05, clipPath: "inset(-90px -90px -90px 1080px)" },
        { autoAlpha: a, scale: 1, clipPath: "inset(-90px -90px -90px -90px)", duration: 0.95, ease: "power3.inOut" }, t),
  };
  const DOUT = {
    fade: (e, t) => tl.to(e, { autoAlpha: 0, duration: 0.3, ease: "power2.in" }, t),
    drop: (e, t) => tl.to(e, { autoAlpha: 0, y: 110, duration: 0.4, ease: "power3.in" }, t),
    slide: (e, t, dir) => tl.to(e, { autoAlpha: 0, x: -380 * (dir ?? 1), duration: 0.4, ease: "power3.in" }, t),
    grow: (e, t) => tl.to(e, { autoAlpha: 0, scale: 1.3, duration: 0.35, ease: "power2.in" }, t),
  };
  const dimmer = (d, amount, t0, t1) => {
    const dim = mk("div", "k-dim", "", d.wrap);
    tl.to(dim, { opacity: amount, duration: 0.3 }, t0 - 0.05);
    tl.to(dim, { opacity: 0, duration: 0.35 }, t1);
    return dim;
  };

  /* ---------- the word BEHIND him ----------
   * K.behind(segIndex, [{text:"اسپرینت"},{text:"استارت",tone:"paper"}], { at:[t,t] (each word in), out:[t,t] (each word out), dim:0.45 })
   * Per word: tone "clay" (default) | "paper" | "ink" | "green" | "outline", size, top. A 7-letter word at about 270 px fits the frame;
   * his head should cover only the bottom of the letters. */
  K.behind = (seg, words, o = {}) => {
    const at = o.at, out = o.out, last = words.length - 1;
    const d = depth(seg, at[0], out[last]);
    const dim = dimmer(d, o.dim ?? 0.45, at[0], out[last]);
    const els = words.map((w) => deepWord(d, w.text, { tone: w.tone, size: w.size, top: w.top }));
    els.forEach((e, i) => {
      if (i === 0) tl.fromTo(e, { autoAlpha: 0, scale: 1.6, filter: "blur(22px)" }, { autoAlpha: 1, scale: 1, filter: "blur(0px)", duration: 0.5, ease: "expo.out" }, at[0]);
      else tl.fromTo(e, { autoAlpha: 0, x: 360, scale: 1.1 }, { autoAlpha: 1, x: 0, scale: 1, duration: 0.45, ease: "expo.out" }, at[i]);
      if (i < last) tl.to(e, { x: -360, autoAlpha: 0, duration: 0.35, ease: "power3.in" }, out[i]);
      else tl.to(e, { autoAlpha: 0, scale: 1.3, duration: 0.3, ease: "power2.in" }, out[i]);
    });
    return { dim, els, cut: d.cut };
  };

  /* ---------- a stack of lines behind him ----------
   * K.stack(seg, [{t:"سرعت", tone:"paper", size:250}, {t:"قدرت", tone:"outline", a:0.7}, ...],
   *   { at:[t,t,t] (each line in), out:t or [t,t,t], top:450, size:230, lead:0.8 (line spacing x size), enter:"rise"|"blur"|"slide"|"pop",
   *     exit:"slide"|"fade"|"drop"|"grow", dim:0.4 })
   * Per line: t, tone, size, a (opacity 0-1), x (shift sideways), enter. With him in front, the lower lines are texture: let them
   * be outlines or echoes (a: 0.6, 0.3) and put the words that must be read on the top line. */
  K.stack = (seg, lines, o = {}) => {
    const outs = Array.isArray(o.out) ? o.out : lines.map(() => o.out);
    const end = Math.max.apply(null, outs);
    const d = depth(seg, o.at[0], end);
    const dim = o.dim === 0 ? null : dimmer(d, o.dim ?? 0.4, o.at[0], end);
    let top = o.top ?? 450;
    const els = lines.map((ln, i) => {
      const L = typeof ln === "string" ? { t: ln } : ln;
      const size = L.size ?? o.size ?? 230;
      const e = deepWord(d, L.t, { tone: L.tone ?? o.tone, size, top, x: L.x });
      top += size * (o.lead ?? 0.8);
      DIN[L.enter ?? o.enter ?? "rise"](e, o.at[i] ?? o.at[o.at.length - 1], L.a ?? 1, size);
      DOUT[o.exit ?? "slide"](e, outs[i] + i * 0.05);
      return e;
    });
    return { dim, els };
  };

  /* ---------- a giant hollow word ----------
   * K.outline(seg, "اسپرینت", { at:t, out:t, size:420, top:400, tone:"paper"|"clay", fill:true (a faint solid under the ring),
   *   fillAt:t (the ring turns solid on a beat), enter:"draw"|"rise"|"pop", dim:0.3 })
   * The ring is a morphology filter (K.init makes it), so joined Farsi letters stay clean. Big and quiet: it is texture. */
  K.outline = (seg, word, o = {}) => {
    const d = depth(seg, o.at, o.out);
    const dim = o.dim === 0 ? null : dimmer(d, o.dim ?? 0.3, o.at, o.out);
    const size = o.size ?? 420, top = o.top ?? 400;
    const ring = deepWord(d, word, { tone: o.tone === "clay" ? "outline-clay" : "outline", size, top });
    const fill = o.fill === false ? null : deepWord(d, word, { tone: "ghostfill", size, top });
    const enter = DIN[o.enter || "draw"];
    enter(ring, o.at, 1, size);
    if (fill) enter(fill, o.at, 1, size);
    if (o.fillAt != null) {
      const solid = deepWord(d, word, { tone: o.tone === "clay" ? "clay" : "paper", size, top });
      tl.fromTo(solid, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35, ease: "power2.out" }, o.fillAt);
      tl.to(solid, { autoAlpha: 0, duration: 0.3 }, o.out);
    }
    [ring, fill].forEach((e) => e && DOUT[o.exit || "fade"](e, o.out));
    return { dim, ring, fill };
  };

  /* ---------- drifting rows: a word repeated, sliding slowly behind him while he stays still ----------
   * K.drift(seg, "سرعت", { at:t, out:t, rows:[{top:450, size:170, tone:"outline", dir:1, speed:90, a:0.9}, {top:625, size:230, tone:"clay", dir:-1, speed:70}],
   *   dim:0.3 })   dir 1 moves right, -1 left; speed in px per second. Words slide out of sight behind his head: that is the depth. */
  K.drift = (seg, word, o = {}) => {
    const rows = o.rows || [
      { top: 450, size: 170, tone: "outline", dir: 1, speed: 90, a: 0.95 },
      { top: 625, size: 230, tone: "clay", dir: -1, speed: 70, a: 1 },
    ];
    const d = depth(seg, o.at, o.out);
    const dim = o.dim === 0 ? null : dimmer(d, o.dim ?? 0.3, o.at, o.out);
    const dur = o.out - o.at + 1.2;
    const els = rows.map((r, i) => {
      const row = mk("div", "k-drow", "", d.wrap);
      allow(row, "caption-zone", "occlusion", "overflow", "overlap"); // rows of one word sliding behind him: texture
      row.style.top = r.top + "px";
      row.style.fontSize = r.size + "px";
      const inner = mk("div", "k-dri", "", row);
      const cls = r.tone === "outline" ? "k-outline" : r.tone === "outline-clay" ? "k-outline k-oc" : "k-" + (r.tone || "clay");
      inner.innerHTML = new Array(9).fill('<b class="' + cls + '"' + LEAF + ">" + word + "</b>").join("");
      const travel = r.speed * dur;
      tl.fromTo(inner, { x: (-r.dir * travel) / 2 }, { x: (r.dir * travel) / 2, duration: dur, ease: "none" }, o.at - 0.6);
      tl.fromTo(row, { autoAlpha: 0, clipPath: "inset(-90px -90px -90px 1080px)" }, { autoAlpha: r.a ?? 1, clipPath: "inset(-90px -90px -90px -90px)", duration: 0.9, ease: "power3.out" }, o.at + i * 0.12);
      tl.to(row, { autoAlpha: 0, duration: 0.35 }, o.out + i * 0.05);
      return row;
    });
    return { dim, els };
  };

  /* ---------- a halo, disc or ring behind his head ----------
   * K.halo(seg, { at:t, out:t, kind:"glow"|"disc"|"ring", tone:"clay"|"paper"|"green"|"ink", x:540, y:800, size, a:1, breathe:true })
   * glow = a soft light, disc = a flat circle (portrait in front of a sun), ring = a thin circle. */
  K.halo = (seg, o = {}) => {
    const kind = o.kind || "glow", tone = o.tone || "clay";
    const size = o.size ?? (kind === "glow" ? 1100 : 740);
    const x = o.x ?? 540, y = o.y ?? 800;
    const d = depth(seg, o.at, o.out);
    const e = mk("div", (kind === "glow" ? "k-halo" : "k-disc" + (kind === "ring" ? " k-ring" : "")) + " k-t-" + tone, "", d.wrap);
    e.style.width = e.style.height = size + "px";
    e.style.left = x - size / 2 + "px";
    e.style.top = y - size / 2 + "px";
    tl.fromTo(e, { autoAlpha: 0, scale: 0.5 }, { autoAlpha: o.a ?? 1, scale: 1, duration: 0.85, ease: "expo.out" }, o.at);
    if (o.breathe !== false && o.out - o.at > 1.9) tl.to(e, { scale: 1.07, duration: o.out - o.at - 1.0, ease: "sine.inOut" }, o.at + 0.85);
    tl.to(e, { autoAlpha: 0, scale: 1.12, duration: 0.4, ease: "power2.in" }, o.out);
    return { el: e };
  };

  /* ---------- a light sweep: a soft diagonal band crossing the wall behind him ----------
   * K.sweep(seg, { at:t, d:1.1, dir:-1 (-1 = right to left, the reading way), tone:"paper"|"clay" }) */
  K.sweep = (seg, o = {}) => {
    const dd = o.d ?? 1.1;
    const d = depth(seg, o.at, o.at + dd);
    const e = mk("div", "k-sweep" + (o.tone === "clay" ? " k-t-clay" : ""), "", d.wrap);
    global.gsap.set(e, { rotation: 16, transformOrigin: "50% 50%" });
    const dir = o.dir ?? -1;
    tl.fromTo(e, { autoAlpha: 1, x: dir < 0 ? 1500 : -520 }, { x: dir < 0 ? -520 : 1500, duration: dd, ease: "power2.inOut" }, o.at);
    tl.set(e, { autoAlpha: 0 }, o.at + dd + 0.02);
    return { el: e };
  };

  /* ---------- backdrop swap: the room turns into a studio colour, and only he stays ----------
   * K.backdrop(seg, { at:t, out:t, tone:"clay"|"ink"|"green"|"paper", variant:"iris"|"wipe"|"drop"|"fade", d:0.6, from:[540,800] (the iris centre),
   *   floor:true (a fade in front of him that hides where the cut-out ends at the table), shadow:true, rim:"224,107,67" (a coloured edge light instead),
   *   lower:true (the default; false = he stays full size) or {scale:0.9, y:150} (he sinks after the swap: headroom for type; he liked it) })
   * Returns { el } so a word, a halo or a stack can be put on top of it (they are drawn above the backdrop). */
  K.backdrop = (seg, o = {}) => {
    const tone = o.tone || "clay", t0 = o.at, t1 = o.out, v = o.variant || "iris", dd = o.d ?? 0.6;
    const d = depth(seg, t0, t1);
    const el = mk("div", "k-backdrop k-bd-" + tone, "", d.wrap);
    const ff = o.floor === false ? null : mk("div", "k-floorfade k-ff-" + tone, "", d.wrap);
    const c = (r) => "circle(" + r + "px at " + (o.from ? o.from[0] : 540) + "px " + (o.from ? o.from[1] : 800) + "px)";
    if (v === "iris") {
      tl.set(el, { autoAlpha: 1 }, t0);
      tl.fromTo(el, { clipPath: c(0) }, { clipPath: c(1600), duration: dd, ease: "power3.inOut" }, t0);
      tl.to(el, { clipPath: c(0), duration: dd, ease: "power3.inOut" }, t1);
      tl.set(el, { autoAlpha: 0 }, t1 + dd + 0.02);
    } else if (v === "wipe") {
      tl.set(el, { autoAlpha: 1 }, t0);
      tl.fromTo(el, { clipPath: "inset(0px 0px 0px 1080px)" }, { clipPath: "inset(0px 0px 0px 0px)", duration: dd, ease: "power3.inOut" }, t0);
      tl.to(el, { clipPath: "inset(0px 1080px 0px 0px)", duration: dd, ease: "power3.inOut" }, t1);
      tl.set(el, { autoAlpha: 0 }, t1 + dd + 0.02);
    } else if (v === "drop") {
      tl.fromTo(el, { autoAlpha: 1, y: -1920 }, { y: 0, duration: dd, ease: "expo.out" }, t0);
      tl.to(el, { y: -1920, duration: dd, ease: "power3.in" }, t1);
      tl.set(el, { autoAlpha: 0 }, t1 + dd + 0.02);
    } else {
      tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: dd, ease: "power2.inOut" }, t0);
      tl.to(el, { autoAlpha: 0, duration: dd, ease: "power2.inOut" }, t1);
    }
    if (ff) {
      tl.fromTo(ff, { autoAlpha: 0 }, { autoAlpha: 1, duration: dd, ease: "power2.out" }, t0 + dd * 0.4);
      tl.to(ff, { autoAlpha: 0, duration: dd * 0.8, ease: "power2.in" }, t1);
    }
    // a soft edge on the cut-out so he sits in the studio: a dark shadow, or a coloured rim light when o.rim is a colour ("224,107,67")
    if (o.shadow !== false) {
      const edge = o.rim ? "drop-shadow(0px 0px 26px rgba(" + o.rim + ",0.55))" : "drop-shadow(0px 8px 30px rgba(0,0,0,0.38))";
      tl.fromTo(d.cut, { filter: "drop-shadow(0px 0px 0px rgba(0,0,0,0))" }, { filter: edge, duration: dd, ease: "power2.out" }, t0);
      tl.to(d.cut, { filter: "drop-shadow(0px 0px 0px rgba(0,0,0,0))", duration: dd, ease: "power2.in" }, t1);
    }
    // lower: after the swap he sinks a little (scale about his seat, then down), which opens headroom for big type above him.
    // The footage under the backdrop sinks with him. Do not combine with K.focus in the same segment (both move the footage).
    if (o.lower !== false) {
      const foot = d.wrap.querySelector("video:not(.k-cut)");
      const lw = Object.assign({ scale: 0.9, y: 150 }, o.lower && o.lower !== true ? o.lower : {});
      global.gsap.set([foot, d.cut], { transformOrigin: "50% 100%" });
      tl.fromTo([foot, d.cut], { scale: 1, y: 0 }, { scale: lw.scale, y: lw.y, duration: 0.8, ease: "power3.inOut" }, t0 + dd);
      tl.to([foot, d.cut], { scale: 1, y: 0, duration: 0.7, ease: "power3.inOut" }, t1 - 0.8);
    }
    return { el, ff };
  };

  /* ---------- focus: the room goes soft, dark and grey, he stays sharp (a depth-of-field pull) ----------
   * K.focus(seg, { at:t, out:t, blur:9, gray:0.9, dim:0.42 }) */
  K.focus = (seg, o = {}) => {
    const d = depth(seg, o.at, o.out);
    const foot = d.wrap.querySelector("video:not(.k-cut)");
    const on = "blur(" + (o.blur ?? 9) + "px) grayscale(" + (o.gray ?? 0.9) + ") brightness(" + (o.dim ?? 0.42) + ")";
    const off = "blur(0px) grayscale(0) brightness(1)";
    tl.fromTo(foot, { filter: off, scale: 1 }, { filter: on, scale: 1.04, duration: 0.55, ease: "power2.out" }, o.at);
    tl.to(foot, { filter: off, scale: 1, duration: 0.55, ease: "power2.inOut" }, o.out);
    return { foot };
  };

  /* ---------- call to action ----------
   * K.cta("شتاب", { at:t, sub:"کامنت کنید", subAt:t, pulse:t, variant:"bubble"(default)|"stamp", y:1160, out:t }) */
  K.cta = (word, o = {}) => {
    const y = o.y ?? 1160;
    const w1 = mk("div", "k-layer");
    w1.style.top = y + "px";
    const big = mk("div", (o.variant === "stamp" ? "k-stamp k-mega" : "k-bubble") + " k-hid", word, w1); // the bubble is his favourite
    allow(big, "overlap"); // the big stamp's box runs about 30 px over its sub-line (the ink does not)
    const w2 = mk("div", "k-layer");
    w2.style.top = y + 310 + "px";
    const sub = o.sub ? allow(mk("div", "k-stamp k-paper k-sm k-hid", o.sub, w2), "overlap") : null;
    tl.fromTo(big, { autoAlpha: 0, scale: 0.3, rotate: 7 }, { autoAlpha: 1, scale: 1, rotate: -2, duration: 0.5, ease: "back.out(2)" }, o.at);
    if (sub) tl.fromTo(sub, { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: "expo.out" }, o.subAt ?? o.at + 0.45);
    if (o.pulse != null) tl.to(big, { scale: 1.07, duration: 0.18, yoyo: true, repeat: 1, ease: "power2.out" }, o.pulse);
    if (o.out != null) gone([big].concat(sub ? [sub] : []), o.out);
    return { big, sub };
  };

  /* ================= the broadcast court: a clean court in perspective =================
   * Built in CSS 3D on a flat plane (100 px = 1 m; the court is 23.77 x 10.97 m). The lines draw themselves, the camera swings in
   * from a top-down blueprint, a runner leaves stroboscopic ghosts along a glowing path, a ripple spreads where a foot lands and
   * numbers stand up out of the floor. Two scenes use it (they replace the photo courts 14 and 15):
   *   K.courtSteps3d({ at, hit, line1, line1At, line2, line2At, steps:[t,t,t,t,t], arrive, out })   a ball, then a few steps to it
   *   K.courtMeasure3d({ at, label, labelAt, sprintAt, sprintDur, value, unit, every, out })          a distance, a sprint along it
   * Time budget: from `at` the lines draw and the camera swings in (2.0 s; swing:false makes it 1.0 s). Put the first event after that.
   * Metres in the options are (x right of the centre line, y up-court from the near baseline).
   */
  const TILT = 62;
  const CT = { L: 71.5, R: 1168.5, T: 111.5, B: 2488.5, SL: 208.5, SR: 1031.5, NET: 1300, S1: 660, S2: 1940, CX: 620 };
  const LW = 10;
  const COURT_LINES = [
    // x, y, w, h, draw axis, transform origin, order: the lines draw from the middle of the court outwards
    [CT.CX - LW / 2, CT.S1, LW, CT.S2 - CT.S1, "y", "50% 50%", 0],
    [CT.SL, CT.S1 - LW / 2, CT.SR - CT.SL, LW, "x", "50% 50%", 0],
    [CT.SL, CT.S2 - LW / 2, CT.SR - CT.SL, LW, "x", "50% 50%", 0],
    [CT.SL - LW / 2, CT.T, LW, CT.B - CT.T, "y", "50% 0%", 1],
    [CT.SR - LW / 2, CT.T, LW, CT.B - CT.T, "y", "50% 0%", 1],
    [CT.L, CT.T - LW / 2, CT.R - CT.L, LW, "x", "50% 50%", 2],
    [CT.L, CT.B - LW / 2, CT.R - CT.L, LW, "x", "50% 50%", 2],
    [CT.L - LW / 2, CT.T, LW, CT.B - CT.T, "y", "50% 0%", 3],
    [CT.R - LW / 2, CT.T, LW, CT.B - CT.T, "y", "50% 0%", 3],
    [CT.CX - LW / 2, CT.T, LW, 24, "y", "50% 0%", 3],
    [CT.CX - LW / 2, CT.B - 24, LW, 24, "y", "50% 100%", 3],
  ];
  const CAMS = 1.25, CAMY = -916; // the camera after the swing: scale and the plane's y (the near baseline sits near y 1520)
  const M3 = (xm, ym) => [CT.CX + xm * 100, CT.B - ym * 100];
  const deg = (r) => (r * 180) / Math.PI;
  // invert an ease: the progress p (0-1) at which the eased value reaches v (used to time ghosts and numbers to the runner)
  const easeAt = (name, v) => {
    const f = global.gsap.parseEase(name);
    let a = 0, b = 1;
    for (let i = 0; i < 28; i++) {
      const m = (a + b) / 2;
      if (f(m) < v) a = m;
      else b = m;
    }
    return (a + b) / 2;
  };

  // a running pictogram in three poses (reach, flight, passing), 100 x 200, feet at the bottom, facing right
  const POSES = [
    ["M53 46 L76 66 L90 44 M53 46 L30 62 L20 86", "M42 100 L70 138 L68 196 M42 100 L22 142 L2 170"],
    ["M53 46 L78 60 L92 78 M53 46 L32 58 L22 34", "M42 100 L74 128 L62 164 M42 100 L30 150 L28 198"],
    ["M53 46 L72 70 L88 54 M53 46 L28 70 L14 52", "M42 100 L72 116 L88 152 M42 100 L42 150 L40 198"],
  ];
  const fig = (pose) => {
    const P = POSES[pose % 3];
    return (
      '<svg viewBox="0 0 100 200"><g fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M52 40 L42 100" stroke-width="26"/><path d="' + P[0] + '" stroke-width="13"/><path d="' + P[1] + '" stroke-width="17"/></g>' +
      '<circle cx="59" cy="17" r="15" fill="#fff"/></svg>'
    );
  };

  const scene3d = (o) => {
    const g = global.gsap;
    const t0 = o.at, swing = o.swing !== false, W = 0.45, wv = o.wipeVariant || "iris";
    const layer = mk("div", "k-full k-c3d");
    const stage3 = mk("div", "k-stage3d", "", layer);
    const plane = allow(mk("div", "k-plane", "", stage3), "overflow", "occlusion", "overlap"); // the court lies in 3D: lines run off the frame, the runner's ghosts and the numbers stack
    mk("div", "k-floor", "", plane);
    const inc = mk("div", "k-inc", "", plane);
    Object.assign(inc.style, { left: CT.L + "px", top: CT.T + "px", width: CT.R - CT.L + "px", height: CT.B - CT.T + "px" });
    mk("div", "k-rake", "", inc);
    g.set(inc, { clipPath: "inset(0px 0px 100% 0px)" });
    const scan = mk("div", "k-scan", "", plane);
    Object.assign(scan.style, { left: CT.L - 30 + "px", width: CT.R - CT.L + 60 + "px", top: "0px" });
    const lines = COURT_LINES.map((L) => {
      const e = mk("div", "k-cl", "", plane);
      Object.assign(e.style, { left: L[0] + "px", top: L[1] + "px", width: L[2] + "px", height: L[3] + "px" });
      g.set(e, { transformOrigin: L[5] });
      return e;
    });
    const net = mk("div", "k-net3", "", plane);
    net.style.top = CT.NET + "px";
    g.set(net, { rotationX: -TILT, transformOrigin: "50% 100%" });
    mk("div", "k-fog", "", layer);

    // the camera: a top-down blueprint that swings back into the broadcast angle (pivot = the near edge of the plane)
    g.set(plane, swing ? { transformOrigin: "50% 100%", rotationX: 0, scale: 0.7, y: -730, z: 0 } : { transformOrigin: "50% 100%", rotationX: TILT, scale: CAMS, y: CAMY, z: 0 });
    const ready = t0 + (swing ? 2.0 : 1.0);
    K.wipeIn(layer, t0, W, wv);
    COURT_LINES.forEach((L, i) => {
      const grow = L[4] === "x" ? { scaleX: 0 } : { scaleY: 0 };
      const full = L[4] === "x" ? { scaleX: 1 } : { scaleY: 1 };
      tl.fromTo(lines[i], Object.assign({ autoAlpha: 1 }, grow), Object.assign({ duration: 0.6, ease: "power3.out" }, full), t0 + 0.14 + L[6] * 0.14 + (i % 3) * 0.03);
    });
    tl.fromTo(inc, { clipPath: "inset(0px 0px 100% 0px)" }, { clipPath: "inset(0px 0px 0% 0px)", duration: 1.0, ease: "power2.inOut" }, t0 + 0.55);
    tl.fromTo(scan, { autoAlpha: 1, y: CT.T }, { y: CT.B, duration: 1.0, ease: "power2.inOut" }, t0 + 0.55);
    tl.set(scan, { autoAlpha: 0 }, t0 + 1.58);
    if (swing) tl.to(plane, { rotationX: TILT, scale: CAMS, y: CAMY, duration: 1.15, ease: "power3.inOut" }, t0 + 0.8);
    tl.fromTo(net, { autoAlpha: 1, scaleY: 0 }, { scaleY: 1, duration: 0.5, ease: "back.out(1.7)" }, ready - 0.45);

    const add = (cls, html) => mk("div", cls, html || "", plane);
    const stand = (el, x, y) => g.set(el, { x, y, rotationX: -TILT, transformOrigin: "50% 100%" }); // upright, feet at (x, y)
    const flat = (el, x, y) => g.set(el, { x, y }); // lying on the court
    // a number that stands up out of the floor at (x, y); lift = how high above the floor it ends up
    const board = (text, x, y, o2 = {}) => {
      const size = o2.size ?? 150, lift = o2.lift ?? 0, H = lift + size * 1.3 + (o2.unit ? size * 0.42 : 0);
      const e = add("k-num3");
      Object.assign(e.style, { width: "340px", height: H + "px", margin: -H + "px 0 0 -170px" });
      const inner = allow(mk("div", "k-nm", text + (o2.unit ? "<small" + LEAF + ">" + o2.unit + "</small>" : ""), e), "occlusion", "overlap", "overflow");
      inner.style.fontSize = size + "px";
      if (o2.unit) inner.querySelector("small").style.fontSize = size * 0.36 + "px";
      stand(e, x, y);
      return {
        el: e,
        rise: (t, d2) => {
          tl.set(e, { autoAlpha: 1 }, t);
          tl.fromTo(inner, { y: H + 20 }, { y: 0, duration: d2 ?? 0.55, ease: "expo.out" }, t);
        },
        gone: (t) => tl.to(e, { autoAlpha: 0, duration: 0.3 }, t),
      };
    };
    const ripple = (x, y, t, big) => {
      const r = add("k-rip");
      flat(r, x, y);
      tl.fromTo(r, { autoAlpha: 0.95, scale: 0.25 }, { autoAlpha: 0, scale: big ? 2.6 : 1.7, duration: big ? 0.9 : 0.6, ease: "power2.out" }, t);
      return r;
    };
    return { layer, plane, t0, ready, W, wv, add, stand, flat, board, ripple };
  };

  K.courtSteps3d = (o = {}) => {
    const S = scene3d(o), { layer, plane, add, stand, flat, board, ripple } = S;
    const g = global.gsap;
    const steps = o.steps, n = steps.length;
    const arrive = o.arrive ?? steps[n - 1] + 0.12;
    const A = M3.apply(null, o.ballFrom || [-2.4, 22.4]), B1 = M3.apply(null, o.bounce1 || [3.4, 8.2]), B2 = M3.apply(null, o.bounce2 || [3.2, 3.4]);
    const P0 = M3.apply(null, o.from || [-1.9, 1.4]), R = B2;
    // top lines, in front of the court
    const c1 = allow(mk("div", "k-ctext k-hid", o.line1 || "", layer), "overlap"); // its box runs about 30 px into the stamp's box below (the ink does not)
    c1.style.top = "480px";
    c1.style.fontSize = "165px";
    const w2 = mk("div", "k-cstamp", "", layer);
    w2.style.top = "672px";
    const c2 = allow(mk("div", "k-stamp k-huge k-hid", o.line2 || "", w2), "overlap");
    if (o.line1At != null) tl.fromTo(c1, { x: 520, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.55, ease: "expo.out" }, o.line1At);
    if (o.line2At != null) tl.fromTo(c2, { scale: 0.4, autoAlpha: 0, y: 50 }, { scale: 1, autoAlpha: 1, y: 0, duration: 0.5, ease: "back.out(2)" }, o.line2At);

    // the ball: struck at the far baseline, one bounce, a second one where the runner will meet it
    const tHit = o.hit, tB1 = tHit + (arrive - tHit) * 0.62, d1 = tB1 - tHit, d2 = arrive - tB1;
    const sh = add("k-sh");
    flat(sh, A[0], A[1]);
    const ball = add("k-b3");
    stand(ball, A[0], A[1]);
    const bimg = mk("img", "", null, ball);
    bimg.src = "img/ball.webp";
    tl.set([ball, sh], { autoAlpha: 1 }, tHit);
    tl.fromTo(ball, { x: A[0], y: A[1] }, { x: B1[0], y: B1[1], duration: d1, ease: "none" }, tHit);
    tl.fromTo(sh, { x: A[0], y: A[1] }, { x: B1[0], y: B1[1], duration: d1, ease: "none" }, tHit);
    tl.fromTo(bimg, { y: -130 }, { y: -360, duration: d1 * 0.5, ease: "power2.out" }, tHit);
    tl.to(bimg, { y: 0, duration: d1 * 0.5, ease: "power2.in" }, tHit + d1 * 0.5);
    tl.to(ball, { x: B2[0], y: B2[1], duration: d2, ease: "none" }, tB1);
    tl.to(sh, { x: B2[0], y: B2[1], duration: d2, ease: "none" }, tB1);
    tl.to(bimg, { y: -190, duration: d2 * 0.45, ease: "power2.out" }, tB1);
    tl.to(bimg, { y: 0, duration: d2 * 0.55, ease: "power2.in" }, tB1 + d2 * 0.45);
    // stroboscopic copies of the ball along both legs
    const strobe = (t, d, p, q, hf, n) => {
      for (let j = 1; j <= n; j++) {
        const u = j / (n + 1), gb = add("k-b3"), gi = mk("img", "", null, gb);
        gi.src = "img/ball.webp";
        stand(gb, p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u);
        g.set(gi, { y: -hf(u) });
        tl.fromTo(gb, { autoAlpha: 0.75 }, { autoAlpha: 0.75, duration: 0.01 }, t + d * u);
        tl.to(gb, { autoAlpha: 0, duration: 0.55, ease: "power2.out" }, t + d * u + 0.05);
      }
    };
    strobe(tHit, d1, A, B1, (u) => (u < 0.5 ? 130 + 230 * (1 - Math.pow(1 - 2 * u, 2)) : 360 * (1 - Math.pow(2 * u - 1, 2))), 6);
    strobe(tB1, d2, B1, B2, (u) => (u < 0.45 ? 190 * (1 - Math.pow(1 - u / 0.45, 2)) : 190 * (1 - Math.pow((u - 0.45) / 0.55, 2))), 3);
    ripple(A[0], A[1], tHit, true);
    ripple(B1[0], B1[1], tB1, false);
    // a target ring where the ball will land, pulsing until the runner is there
    const tgt = add("k-ring3");
    flat(tgt, R[0], R[1]);
    tl.fromTo(tgt, { autoAlpha: 0, scale: 1.8 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: "power3.out" }, tB1);
    tl.to(tgt, { scale: 1.12, duration: 0.2, yoyo: true, repeat: Math.max(1, Math.floor((arrive - tB1) / 0.2)), ease: "sine.inOut" }, tB1 + 0.4);

    // the runner, the glowing path, the ghosts, the footprints, the count
    const dx = R[0] - P0[0], dy = R[1] - P0[1], len = Math.hypot(dx, dy), head = deg(Math.atan2(-dx, dy));
    const path = add("k-path");
    g.set(path, { x: P0[0], y: P0[1], height: len, rotation: head });
    tl.fromTo(path, { autoAlpha: 1, scaleY: 0 }, { scaleY: 1, duration: arrive - steps[0] + 0.1, ease: "none" }, steps[0] - 0.05);
    const pts = steps.map((_, k) => [P0[0] + dx * Math.pow((k + 1) / n, 0.9), P0[1] + dy * Math.pow((k + 1) / n, 0.9)]);
    const run = add("k-run3", fig(0));
    stand(run, P0[0], P0[1]);
    const rg = add("k-ring3");
    flat(rg, P0[0], P0[1]);
    tl.set(run, { autoAlpha: 1 }, steps[0] - 0.5);
    tl.fromTo(rg, { autoAlpha: 0, scale: 0.5 }, { autoAlpha: 1, scale: 0.55, duration: 0.3 }, steps[0] - 0.5);
    steps.forEach((s, k) => {
      const prev = k === 0 ? P0 : pts[k - 1];
      tl.to(run, { x: pts[k][0], y: pts[k][1], duration: 0.24, ease: "power2.out" }, s);
      tl.to(rg, { x: pts[k][0], y: pts[k][1], duration: 0.24, ease: "power2.out" }, s);
      const gh = add("k-gh3", fig(k + 1));
      stand(gh, prev[0], prev[1]);
      tl.fromTo(gh, { autoAlpha: 0.9 }, { autoAlpha: 0.9, duration: 0.01 }, s + 0.02);
      tl.to(gh, { autoAlpha: 0.4, duration: 0.7, ease: "power2.out" }, s + 0.05);
      tl.to(gh, { autoAlpha: 0, duration: 0.35 }, o.out - 0.35);
      const side = k % 2 ? 1 : -1, px = Math.cos((head * Math.PI) / 180) * 17 * side, py = Math.sin((head * Math.PI) / 180) * 17 * side;
      const fp = add("k-fp");
      g.set(fp, { x: pts[k][0] + px, y: pts[k][1] + py, rotation: head });
      tl.fromTo(fp, { autoAlpha: 0, scale: 0.4 }, { autoAlpha: 0.95, scale: 1, duration: 0.14, ease: "back.out(3)" }, s + 0.16);
      tl.to(fp, { autoAlpha: 0, duration: 0.6 }, s + 1.5);
      ripple(pts[k][0], pts[k][1], s + 0.16, false);
      const nb = board(K.fa(k + 1), pts[k][0] - 70, pts[k][1] + 14, { size: 140, lift: 245 });
      nb.rise(s + 0.2, 0.5);
      nb.gone(Math.min(o.out - 0.35, arrive + 0.9));
    });
    tl.to(rg, { scale: 0.62, duration: 0.2, yoyo: true, repeat: 1, ease: "power2.out" }, arrive);
    ripple(R[0], R[1], arrive, true);
    tl.to([run, rg, tgt, path, ball, sh], { autoAlpha: 0, duration: 0.35 }, o.out - 0.35);
    tl.fromTo(plane, { z: 0 }, { z: 150, duration: o.out - S.ready + 0.5, ease: "sine.inOut" }, S.ready - 0.2);
    K.wipeOut(layer, o.out, S.W, S.wv);
    return { layer, plane, run };
  };

  K.courtMeasure3d = (o = {}) => {
    const S = scene3d(o), { layer, plane, add, stand, flat, board, ripple } = S;
    const g = global.gsap;
    const from = M3.apply(null, o.from || [4.0, 3.0]), to = M3.apply(null, o.to || [-4.0, 3.0]);
    const dx = to[0] - from[0], dy = to[1] - from[1], len = Math.hypot(dx, dy), th = Math.atan2(dy, dx);
    const metres = len / 100, every = o.every ?? 2;
    const sprintAt = o.sprintAt, dur = o.sprintDur ?? 1.3, ease = o.ease || "power2.inOut";
    const at = (m) => sprintAt + dur * easeAt(ease, m / metres); // the time the runner passes m metres
    const P = (m) => [from[0] + (dx * m) / metres, from[1] + (dy * m) / metres];
    // label, in front
    const w2 = mk("div", "k-cstamp", "", layer);
    w2.style.top = "480px";
    const lab = mk("div", "k-stamp k-huge k-hid", o.label || "", w2);
    if (o.labelAt != null) tl.fromTo(lab, { scale: 0.4, autoAlpha: 0, y: 50 }, { scale: 1, autoAlpha: 1, y: 0, duration: 0.5, ease: "back.out(2)" }, o.labelAt);
    // the measuring line and its end caps
    const ml = add("k-tk");
    Object.assign(ml.style, { left: "0px", top: "-5px", width: len + "px", transformOrigin: "0% 50%" });
    g.set(ml, { x: from[0], y: from[1], rotation: deg(th) });
    const lt = o.lineAt ?? o.labelAt + 0.2;
    tl.fromTo(ml, { autoAlpha: 1, scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: "power3.out" }, lt);
    const cap = (p, t) => {
      const e = add("k-tk");
      Object.assign(e.style, { left: "-60px", top: "-5px", width: "120px" });
      g.set(e, { x: p[0], y: p[1], rotation: deg(th) + 90 });
      tl.fromTo(e, { autoAlpha: 0, scaleX: 0 }, { autoAlpha: 1, scaleX: 1, duration: 0.3, ease: "back.out(2)" }, t);
      return e;
    };
    const caps = [cap(from, lt), cap(to, lt + 0.4)];
    // ticks and their numbers, timed to the runner
    const items = [];
    for (let m = every; m < metres - 0.01; m += every) {
      const p = P(m);
      const tk = add("k-tk");
      Object.assign(tk.style, { left: "-34px", top: "-5px", width: "68px" });
      g.set(tk, { x: p[0], y: p[1], rotation: deg(th) + 90 });
      tl.fromTo(tk, { autoAlpha: 0, scaleX: 0 }, { autoAlpha: 1, scaleX: 1, duration: 0.25 }, lt + 0.3);
      const nb = board(K.fa(m), p[0], p[1] - 16, { size: 110, lift: 210 });
      nb.rise(at(m) - 0.1, 0.5);
      items.push(tk, nb.el);
    }
    // the runner: a sprint along the line, a ghost every metre
    const run = add("k-run3", fig(0));
    stand(run, from[0], from[1]);
    g.set(run.firstChild, { scaleX: dx < 0 ? -1 : 1 });
    const rg = add("k-ring3");
    flat(rg, from[0], from[1]);
    tl.set(run, { autoAlpha: 1 }, sprintAt - 0.45);
    tl.fromTo(rg, { autoAlpha: 0, scale: 0.5 }, { autoAlpha: 1, scale: 0.55, duration: 0.3 }, sprintAt - 0.45);
    tl.fromTo(run, { x: from[0], y: from[1] }, { x: to[0], y: to[1], duration: dur, ease }, sprintAt);
    tl.fromTo(rg, { x: from[0], y: from[1] }, { x: to[0], y: to[1], duration: dur, ease }, sprintAt);
    const trail = add("k-path");
    g.set(trail, { x: from[0], y: from[1], height: len, rotation: deg(Math.atan2(-dx, dy)) });
    tl.fromTo(trail, { autoAlpha: 1, scaleY: 0 }, { scaleY: 1, duration: dur, ease }, sprintAt);
    const ghosts = [];
    for (let m = o.ghostEvery ?? 1; m < metres - 0.4; m += o.ghostEvery ?? 1) {
      const p = P(m), gh = add("k-gh3", fig(Math.round(m)));
      stand(gh, p[0], p[1]);
      g.set(gh.firstChild, { scaleX: dx < 0 ? -1 : 1 });
      const tg = at(m);
      tl.fromTo(gh, { autoAlpha: 0.9 }, { autoAlpha: 0.9, duration: 0.01 }, tg);
      tl.to(gh, { autoAlpha: 0.4, duration: 0.7, ease: "power2.out" }, tg + 0.04);
      ghosts.push(gh);
    }
    // the answer: a big number standing at the end of the line
    const tEnd = sprintAt + dur;
    const big = board(o.value || K.fa(Math.round(metres)), to[0] + 60, to[1] - 24, { size: 190, lift: 215, unit: o.unit });
    big.rise(tEnd - 0.05, 0.7);
    ripple(to[0], to[1], tEnd, true);
    tl.to([run, rg, trail].concat(ghosts, items, caps, [ml]), { autoAlpha: 0, duration: 0.35 }, o.out - 0.35);
    tl.to(big.el, { autoAlpha: 0, duration: 0.3 }, o.out - 0.35);
    tl.fromTo(plane, { z: 0, x: 0 }, { z: 160, x: 90, duration: o.out - S.ready + 0.5, ease: "sine.inOut" }, S.ready - 0.2);
    K.wipeOut(layer, o.out, S.W, S.wv);
    return { layer, plane, run };
  };

  /* ================= the statement cards (stage 2) =================
   * Full-screen cards that take over while his voice runs on, like K.question. Every word and number on them is HIS.
   *   K.number("۳", { at, landAt, unit, pre, out, look })    an odometer rolls and the number lands with a slam
   *   K.slamBehind(seg, "۳", { at, landAt, out })             the same number behind him (needs the cut-out; a studio swap suits it)
   *   K.versus("قدرت", "سرعت", { at, vsAt, win, winAt, out }) a skewed split, A against B, with an optional verdict
   *   K.list([...], { at, itemAt:[...], flatAt, out })         a drum that turns to each item, then unrolls into the whole list
   *   K.quote([...lines], { at, lineAt:[...], hlAt, zoomAt, out })  a page with a highlighter that zooms onto the key line
   *   K.whip(t, { out:i-1, in:i, style:"whip"|"zoom" })       hides a jump cut between two footage segments
   * Looks: "clay" | "ink" | "paper". Wipes (wipeVariant): iris, push, clay, slice, whip, zoom.
   */
  const PD = "۰۱۲۳۴۵۶۷۸۹";
  const digitOf = (ch) => {
    const i = PD.indexOf(ch);
    return i >= 0 ? i : "0123456789".indexOf(ch);
  };
  const shake = (el, t, amp) => {
    const a = amp ?? 14;
    [[-1, 0.6], [0.8, -0.7], [-0.55, 0.45], [0.3, -0.25], [0, 0]].forEach((s, i) => tl.to(el, { x: s[0] * a, y: s[1] * a, duration: 0.05, ease: "none" }, t + i * 0.05));
  };
  // a row of odometer reels: every digit is a column that rolls up to its number; other characters are plain
  const reels = (parent, value, size, cycles) => {
    const row = mk("div", "k-num", "", parent);
    row.style.fontSize = size + "px";
    const items = Array.from(String(value)).map((ch) => {
      const d = digitOf(ch);
      if (d < 0) return { sep: ch === "٫" || ch === "." ? mk("div", "k-ndot k-hid", "", row) : mk("div", "k-nsep k-hid", ch, row) };
      const reel = allow(mk("div", "k-reel", "", row), "caption-zone", "occlusion", "overflow", "overlap"); // the odometer: a column of digits behind a clipped window
      const col = mk("div", "k-rcol", "", reel);
      let h = "";
      for (let c = 0; c < cycles; c++) for (let k = 0; k < 10; k++) h += DI + PD[k] + "</i>";
      for (let k = 0; k <= d; k++) h += DI + PD[k] + "</i>";
      col.innerHTML = h;
      return { reel, col, dist: (cycles * 10 + d) * size * 1.12 };
    });
    return { row, items };
  };
  // the last reel stops exactly at landAt, the others a little before it (the digits lock in one after another)
  const rollReels = (R, landAt, o) => {
    const dur = o.roll ?? 1.2, gap = o.gap ?? 0.16;
    const digits = R.items.filter((x) => x.col);
    digits.forEach((it, k) => {
      const start = landAt - (digits.length - 1 - k) * gap - dur;
      tl.fromTo(it.col, { y: 0 }, { y: -it.dist, duration: dur, ease: "power3.out" }, start);
      tl.fromTo(it.col, { filter: "blur(9px)" }, { filter: "blur(0px)", duration: dur, ease: "power2.out" }, start);
    });
    R.items.filter((x) => x.sep).forEach((x) => tl.fromTo(x.sep, { autoAlpha: 0, scale: 0.5 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, landAt));
    return landAt - (digits.length - 1) * gap - dur; // when the first reel starts
  };
  // a slow push-in on a whole card: a hold is never dead still (amt = how much it grows by the end)
  const push = (el, t0, t1, amt) => tl.fromTo(el, { scale: 1 }, { scale: 1 + (amt ?? 0.03), duration: Math.max(0.1, t1 - t0), ease: "none" }, t0);
  const numSize = (value, o) => {
    const nd = Array.from(String(value)).filter((ch) => digitOf(ch) >= 0).length;
    return o.size ?? (nd <= 1 ? 780 : nd === 2 ? 640 : nd === 3 ? 500 : 400);
  };

  /* ---------- number slam ----------
   * K.number("۳", { at:t (wipe in), landAt:t (the last digit stops: the slam), roll:1.2, unit:"ثانیه", unitAt:t, pre:"فقط", preAt:t, out:t,
   *   look:"clay"|"ink"|"paper", wipeVariant, y:880, size, cycles:2, shake:14 })
   * Give him the number from his own mouth; the digits are rolled for show. Non-digit characters (٫ ٪) pop in at the landing. */
  K.number = (value, o = {}) => {
    const g = global.gsap;
    const look = o.look || "clay", wv = o.wipeVariant || "iris", cy = o.y ?? 980;
    const c = mk("div", "k-full k-" + look);
    const st = allow(mk("div", "k-nstage", "", c), "overflow"); // panels, plates and the card's own parts slide in from beyond the frame
    const glow = mk("div", "k-qglow", "", st);
    glow.style.top = cy - 400 + "px";
    const ring = mk("div", "k-qring k-hid", "", st);
    ring.style.top = cy - 200 + "px";
    const size = numSize(value, o);
    const R = reels(st, value, size, o.cycles ?? 2);
    R.row.style.top = cy - size * 0.56 + "px";
    K.wipeIn(c, o.at, o.wipe ?? 0.5, wv);
    const t1 = rollReels(R, o.landAt, o);
    if (o.pre) {
      const pre = allow(mk("div", "k-npre k-hid", o.pre, st), "caption-zone"); // its box starts at y 442, 28 px into the band; the ink does not
      pre.style.top = cy - size * 0.56 - 60 + "px";
      tl.fromTo(pre, { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: "expo.out" }, o.preAt ?? Math.max(o.at + 0.3, t1 - 0.4));
    }
    tl.fromTo(R.row, { scale: 1.16 }, { scale: 1, duration: 0.45, ease: "expo.out" }, o.landAt);
    // two outline echoes of the number ripple outwards from the landing (built like the reels, already stopped on the digits)
    [0, 1].forEach((i) => {
      const E = reels(st, value, size, 0);
      E.row.classList.add("k-necho", "k-hid");
      E.row.style.top = cy - size * 0.56 + "px";
      E.items.forEach((x) => (x.col ? g.set(x.col, { y: -x.dist }) : g.set(x.sep, { autoAlpha: 1 })));
      tl.fromTo(E.row, { scale: 1, autoAlpha: 0.75 }, { scale: 1.3 + i * 0.35, autoAlpha: 0, duration: 0.85, ease: "power2.out" }, o.landAt + 0.04 + i * 0.09);
    });
    tl.fromTo(glow, { scale: 0.6, opacity: 0.2 }, { scale: 1.25, opacity: 1, duration: 0.9, ease: "power2.out" }, o.landAt);
    push(st, o.landAt + 0.5, o.out, 0.035);
    tl.fromTo(ring, { scale: 0.3, autoAlpha: 0.95 }, { scale: 3.6, autoAlpha: 0, duration: 0.85, ease: "power2.out" }, o.landAt);
    shake(st, o.landAt, o.shake ?? 14);
    if (o.unit) {
      const uw = mk("div", "k-nunit", "", st);
      uw.style.top = cy + size * 0.40 + "px";
      const ut = mk("div", "k-stamp k-huge k-hid", o.unit, uw);
      ENTER.drop(ut, o.unitAt ?? o.landAt + 0.18);
    }
    K.wipeOut(c, o.out, o.wipe ?? 0.5, wv);
    return { card: c, row: R.row, items: R.items };
  };

  /* ---------- number slam, behind him ----------
   * K.slamBehind(seg, "۳", { at:t (it appears), landAt:t, out:t, top:500, size, tone:"paper"|"clay", dim:0.3 })
   * Needs the cut-out and suits a studio swap: K.backdrop first (he sinks), then this above his head. */
  K.slamBehind = (seg, value, o = {}) => {
    const d = depth(seg, o.at, o.out);
    const dim = o.dim === 0 ? null : dimmer(d, o.dim ?? 0.3, o.at, o.out);
    const size = o.size ?? (numSize(value, {}) * 0.8);
    const R = reels(d.wrap, value, size, o.cycles ?? 2);
    R.row.classList.add("k-numd", "k-hid");
    if (o.tone === "clay") R.row.classList.add("k-numc");
    const top = o.top ?? 500;
    R.row.style.top = top + "px";
    const ring = mk("div", "k-dring k-hid", "", d.wrap);
    ring.style.top = top + size * 0.56 - 260 + "px";
    const t1 = rollReels(R, o.landAt, o);
    tl.set(R.row, { autoAlpha: 1 }, Math.min(o.at, t1));
    tl.fromTo(R.row, { scale: 1.2 }, { scale: 1, duration: 0.45, ease: "expo.out" }, o.landAt);
    tl.fromTo(ring, { scale: 0.3, autoAlpha: 0.9 }, { scale: 3.2, autoAlpha: 0, duration: 0.8, ease: "power2.out" }, o.landAt);
    tl.to(R.row, { autoAlpha: 0, y: -80, duration: 0.35, ease: "power2.in" }, o.out);
    return { row: R.row };
  };

  /* ---------- versus: a skewed split ----------
   * K.versus("قدرت", "سرعت", { at:t, aAt:t, bAt:t, vsAt:t, vs:"در برابر", win:"a"|"b" (optional), winAt:t, out:t, subA, subB,
   *   colors:["clay","ink2"] (a is on the right, the reading side), wipeVariant })
   * A and B slide in from opposite edges and meet on a slanted seam. With `win` the seam moves toward the loser, the loser is
   * struck through in brick red and dims, the winner turns green with a tick (green = the answer, brick red = the mistake). */
  K.versus = (a, b, o = {}) => {
    const g = global.gsap;
    const wv = o.wipeVariant || "iris";
    const c = mk("div", "k-full k-" + (o.look || "ink"));
    const st = allow(mk("div", "k-nstage", "", c), "overflow"); // panels, plates and the card's own parts slide in from beyond the frame
    const cols = o.colors || ["clay", "ink2"];
    const side = (cls, col, word, sub, left) => {
      const p = mk("div", "k-vp " + cls + " k-vc-" + col, "", st);
      const inn = mk("div", "k-vin", "", p);
      inn.style.left = left + "px";
      const tick = mk("div", "k-vtick", '<svg viewBox="0 0 48 48"><path d="M10 25 L21 36 L39 14" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="60" stroke-dashoffset="60"/></svg>', inn);
      const w = mk("div", "k-vw k-hid", word + '<i class="k-strike"></i>', inn);
      const s = sub ? mk("div", "k-vs k-hid", sub, inn) : null;
      g.set(inn, { yPercent: -50, skewX: 7 });
      g.set(w.querySelector(".k-strike"), { scaleX: 0 });
      return { p, inn, w, s, tick, path: tick.querySelector("path"), strike: w.querySelector(".k-strike") };
    };
    const A = side("k-vpa", cols[0], a, o.subA, 10);
    const B = side("k-vpb", cols[1], b, o.subB, 870);
    g.set(A.p, { skewX: -7, x: 1500 });
    g.set(B.p, { skewX: -7, x: -700 });
    const seam = mk("div", "k-vseam", "", st);
    g.set(seam, { skewX: -7 });
    const row = mk("div", "k-layer", "", st);
    row.style.top = "760px";
    row.style.left = "21px";
    const chip = mk("div", "k-stamp k-big k-hid", o.vs || "", row);
    K.wipeIn(c, o.at, o.wipe ?? 0.45, wv);
    const aAt = o.aAt ?? o.at + 0.35, bAt = o.bAt ?? aAt + 0.18;
    tl.to(A.p, { x: 540, duration: 0.75, ease: "expo.out" }, aAt);
    tl.to(B.p, { x: 540, duration: 0.75, ease: "expo.out" }, bAt);
    tl.fromTo(A.w, { autoAlpha: 0, y: 70 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: "expo.out" }, aAt + 0.3);
    tl.fromTo(B.w, { autoAlpha: 0, y: 70 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: "expo.out" }, bAt + 0.3);
    if (A.s) tl.fromTo(A.s, { autoAlpha: 0 }, { autoAlpha: 0.85, duration: 0.4 }, aAt + 0.55);
    if (B.s) tl.fromTo(B.s, { autoAlpha: 0 }, { autoAlpha: 0.85, duration: 0.4 }, bAt + 0.55);
    tl.fromTo(seam, { autoAlpha: 0, scaleY: 0 }, { autoAlpha: 1, scaleY: 1, duration: 0.4, ease: "power3.out" }, bAt + 0.45);
    K.flash(bAt + 0.5, { peak: 0.3, d: 0.3 });
    push(st, bAt + 1.0, o.out, 0.03);
    if (o.vs) {
      const vt = o.vsAt ?? bAt + 0.8;
      tl.fromTo(chip, { autoAlpha: 0, scale: 0.3, rotate: 8 }, { autoAlpha: 1, scale: 1, rotate: -4, duration: 0.45, ease: "back.out(2.2)" }, vt);
    }
    if (o.win) {
      const W = o.win === "a" ? A : B, L = o.win === "a" ? B : A, shift = o.win === "a" ? -230 : 230;
      tl.to([A.p, B.p, seam], { x: 540 + shift, duration: 0.7, ease: "power3.inOut" }, o.winAt);
      tl.to(row, { x: shift, duration: 0.7, ease: "power3.inOut" }, o.winAt);
      tl.to(L.p, { filter: "brightness(0.55) saturate(0.5)", duration: 0.5 }, o.winAt);
      tl.to([A.inn, B.inn], { x: -shift / 2, duration: 0.7, ease: "power3.inOut" }, o.winAt);
      tl.to(L.inn, { scale: 0.72, duration: 0.7, ease: "power3.inOut" }, o.winAt);
      tl.to(W.inn, { scale: 1.12, duration: 0.7, ease: "power3.inOut" }, o.winAt);
      tl.fromTo(L.strike, { scaleX: 0 }, { scaleX: 1, duration: 0.4, ease: "power3.out" }, o.winAt + 0.1);
      tl.to(W.p, { backgroundColor: "#0e4a36", duration: 0.5 }, o.winAt + 0.25);
      tl.fromTo(W.tick, { autoAlpha: 0, scale: 0.4 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: "back.out(2.5)" }, o.winAt + 0.5);
      tl.to(W.path, { strokeDashoffset: 0, duration: 0.35, ease: "power2.out" }, o.winAt + 0.6);
    }
    K.wipeOut(c, o.out, o.wipe ?? 0.45, wv);
    return { card: c, A, B };
  };

  /* ---------- a drum: a list that turns to each item, then unrolls ----------
   * K.list(["نیروی زیاد · زمان کوتاه", ...], { at:t (card in), itemAt:[t,t,t] (each item takes the front), flatAt:t (the drum unrolls into
   *   the whole list), out:t, look:"ink"|"clay"|"paper", wipeVariant, mode:"video", y:1360 })
   * Three to five items. Each is HIS phrase; keep one short line per item (about 22 characters at most).
   * mode:"video" (his idea, 2026-10-01: "can be on the video it self as well") puts a smaller drum in the chest zone over his own
   * picture: no card, no wipe, the drum rises in from below and sinks out; his face stays on screen. */
  K.list = (items, o = {}) => {
    const g = global.gsap;
    const vid = o.mode === "video"; // on the footage itself: no card, the drum sits in the chest zone over his picture
    const n = items.length, TH = 36, IH = vid ? 130 : 190, GAP = vid ? 22 : 30;
    const Rr = (IH + GAP) / (2 * Math.tan(((TH / 2) * Math.PI) / 180));
    const wv = o.wipeVariant || "iris";
    const c = vid ? mk("div", "k-ovl") : mk("div", "k-full k-" + (o.look || "ink"));
    const stage = mk("div", "k-dstage" + (vid ? " k-vid" : ""), "", c);
    const drum = mk("div", "k-drum", "", stage);
    if (vid) drum.style.top = (o.y ?? 1360) + "px";
    const OFFC = vid ? ["rgba(24,24,29,0.84)", "rgba(51,51,60,0.92)"] : ["#24242b", "#33333c"]; // an idle card and its numeral
    const its = items.map((txt, i) => {
      const pv = mk("div", "k-pv", "", drum);
      const it = mk("div", "k-it", '<div class="k-itn">' + K.fa(i + 1) + '</div><div class="k-itl">' + txt + "</div>", pv);
      g.set(pv, { rotationX: -i * TH });
      g.set(it, { z: Rr, autoAlpha: 0 });
      return { pv, it, num: it.firstChild, lab: it.lastChild };
    });
    g.set(drum, { z: -Rr, rotationX: 0 });
    if (vid) tl.fromTo(c, { y: 260, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.65, ease: "expo.out" }, o.at);
    else K.wipeIn(c, o.at, o.wipe ?? 0.45, wv);
    const state = (j, act) => (j === act ? 1 : Math.abs(j - act) === 1 ? 0.42 : 0.1);
    its.forEach((x, i) => tl.fromTo(x.it, { autoAlpha: 0 }, { autoAlpha: state(i, 0), duration: 0.5, ease: "power2.out" }, o.itemAt[0] - 0.15 + i * 0.06));
    const on = (x, t) => {
      tl.to(x.it, { backgroundColor: "#c7552f", color: "#ffffff", scale: 1.04, duration: 0.3, ease: "power2.out" }, t);
      tl.to(x.num, { backgroundColor: "#16161a", duration: 0.3 }, t);
    };
    const off = (x, t) => {
      tl.to(x.it, { backgroundColor: OFFC[0], color: "#e9e4da", scale: 1, duration: 0.3 }, t);
      tl.to(x.num, { backgroundColor: OFFC[1], duration: 0.3 }, t);
    };
    on(its[0], o.itemAt[0]);
    if (!vid) push(stage, o.itemAt[0], o.out, 0.03);
    for (let i = 1; i < n; i++) {
      const t = o.itemAt[i];
      tl.to(drum, { rotationX: i * TH, duration: 0.55, ease: "power3.inOut" }, t - 0.1);
      its.forEach((x, j) => tl.to(x.it, { autoAlpha: state(j, i), duration: 0.4 }, t - 0.1));
      off(its[i - 1], t - 0.05);
      on(its[i], t + 0.2);
    }
    if (o.flatAt != null) {
      const f = o.flatAt;
      tl.to(drum, { rotationX: 0, z: 0, duration: 0.85, ease: "power3.inOut" }, f);
      its.forEach((x, i) => {
        tl.to(x.pv, { rotationX: 0, y: (i - (n - 1) / 2) * (IH + (vid ? 16 : 26)), duration: 0.85, ease: "power3.inOut" }, f);
        tl.to(x.it, { z: 0, autoAlpha: 1, backgroundColor: "#faf7f2", color: "#1a1a1a", scale: 1, duration: 0.85, ease: "power3.inOut" }, f);
        tl.to(x.num, { backgroundColor: "#c7552f", duration: 0.5 }, f);
      });
    }
    if (vid) tl.to(c, { y: 260, autoAlpha: 0, duration: 0.45, ease: "power3.in" }, o.out);
    else K.wipeOut(c, o.out, o.wipe ?? 0.45, wv);
    return { card: c, drum, its };
  };

  /* ---------- a page with a highlighter ----------
   * K.quote(["از یه تمرین انفجاری", {t:"نیروی زیاد · زمان کوتاه", hl:true}, ...], { at:t, lineAt:[t,...], hlAt:t, zoomAt:t, zoom (default: fits the key line), out:t,
   *   look:"ink"|"clay", top:560, tag:"..." })
   * The sheet falls onto a dark table, lines are written in, a clay highlighter sweeps the key line, then the page zooms onto it.
   * Lines are broken by hand (one short line each, about 24 characters), so nothing has to be measured. The words are HIS. */
  K.quote = (lines, o = {}) => {
    const g = global.gsap;
    const wv = o.wipeVariant || "iris", LH = 112, PADT = 84, top = o.top ?? 560;
    const c = mk("div", "k-full k-" + (o.look || "ink"));
    const pg = mk("div", "k-qpage", "", c);
    const sheet = mk("div", "k-sheet k-hid", "", pg);
    sheet.style.top = top + "px";
    const ls = lines.map((ln) => {
      const L = typeof ln === "string" ? { t: ln } : ln;
      const d = mk("div", "k-ql", "", sheet);
      const sp = mk("span", "", (L.hl ? '<i class="k-hlb"></i>' : "") + "<b>" + L.t + "</b>", d);
      const band = L.hl ? sp.querySelector(".k-hlb") : null;
      return { d, sp, band, hl: !!L.hl };
    });
    if (o.tag) {
      const tg = mk("div", "k-stamp k-sm", o.tag, sheet);
      tg.style.position = "absolute";
      tg.style.top = "-34px";
      tg.style.right = "40px";
    }
    K.wipeIn(c, o.at, o.wipe ?? 0.45, wv);
    push(pg, o.at + 1.0, o.out, 0.03);
    tl.fromTo(sheet, { autoAlpha: 0, y: -280, rotationX: 38, rotation: -7 }, { autoAlpha: 1, y: 0, rotationX: 0, rotation: -2.2, duration: 0.85, ease: "expo.out" }, o.at + 0.3);
    ls.forEach((l, i) => tl.fromTo(l.sp, { clipPath: "inset(-20px -20px -20px 100%)" }, { clipPath: "inset(-20px -20px -20px -20px)", duration: 0.45, ease: "power2.out" }, o.lineAt[i]));
    const hi = ls.findIndex((x) => x.hl);
    if (hi >= 0 && o.hlAt != null) tl.fromTo(ls[hi].band, { scaleX: 0 }, { scaleX: 1, duration: 0.55, ease: "power3.out" }, o.hlAt);
    if (hi >= 0 && o.zoomAt != null) {
      const ly = PADT + hi * LH + LH / 2;
      g.set(sheet, { transformOrigin: "50% " + ly + "px" });
      const key = lines[hi], kt = typeof key === "string" ? key : key.t;
      const zoom = o.zoom ?? Math.max(1.2, Math.min(2.1, 880 / (Array.from(kt).length * 62 * 0.38))); // fit the key line to about 880 px
      tl.to(sheet, { scale: zoom, y: 900 - (top + ly), rotation: 0, duration: 0.85, ease: "power3.inOut" }, o.zoomAt);
      tl.to(ls.filter((x) => !x.hl).map((x) => x.d), { opacity: 0.12, duration: 0.5 }, o.zoomAt);
    }
    K.wipeOut(c, o.out, o.wipe ?? 0.45, wv);
    return { card: c, sheet, ls };
  };

  /* ---------- hide a jump cut ----------
   * K.whip(t, { out:i-1, in:i, style:"whip"|"zoom", dir:-1, d1:0.16, d2:0.26 })
   * t is the second (edited clock) where footage segment `out` ends and `in` begins. The outgoing picture blurs and slides (or
   * zooms) away just before the cut, the incoming one settles from the other side. It moves the footage videos themselves, so do not
   * combine it with K.focus or K.backdrop's `lower` in the same segment. */
  K.whip = (t, o = {}) => {
    const vids = (i) => Array.from(document.getElementById("v" + i).querySelectorAll("video"));
    const A = vids(o.out), B = vids(o.in), dir = o.dir ?? -1, d1 = o.d1 ?? 0.16, d2 = o.d2 ?? 0.26;
    // both pictures are scaled up while they move, so the edge of the frame never shows (110 px of slide needs about 1.22)
    if (o.style === "zoom") {
      tl.fromTo(A, { scale: 1, filter: "blur(0px)" }, { scale: 1.45, filter: "blur(22px)", duration: d1, ease: "power2.in" }, t - d1);
      tl.fromTo(B, { scale: 1.45, filter: "blur(22px)" }, { scale: 1, filter: "blur(0px)", duration: d2, ease: "power3.out" }, t);
    } else {
      tl.fromTo(A, { x: 0, scale: 1, filter: "blur(0px)" }, { x: dir * 110, scale: 1.22, filter: "blur(26px)", duration: d1, ease: "power2.in" }, t - d1);
      tl.fromTo(B, { x: -dir * 110, scale: 1.22, filter: "blur(26px)" }, { x: 0, scale: 1, filter: "blur(0px)", duration: d2, ease: "power3.out" }, t);
    }
  };

  /* ================= stage 3 (showreel 5, 2026-10-01): diagrams, the force-time curve, chapter labels, the body map =================
   *   K.diagram(["نیرو", "سرعت", "توان"], { at, nodeAt:[t,t,t], out, layout:"chain"|"cycle"|"row", mode:"card"|"video" })   a chain that builds itself
   *   K.curve({ at, out, curves:[{ at, dur, tone, x0, k, label }], slope:{ at, curve, label }, gap:{ at, level, label } })    the force-time curve
   *   K.chapter(2, "سرعت", { at, titleAt, out, total:3, variant:"card"|"band" })                                             a chapter label on the clay wipe
   *   K.bodymap([{ m:"quads", label:"ران", at, view:"front", side:"r" }, ...], { at, out })                                 the app's traced body, lit as he says it
   * Every word and every number on them is HIS; the showreel's are placeholders. The curves are a drawn idea (the same peak, reached sooner),
   * never his data. All four are full-screen cards or sit on the footage, so none of them needs the cut-out.
   */
  const SVGNS = "http://www.w3.org/2000/svg";
  const sv = (tag, attrs, parent) => {
    const e = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach((k) => e.setAttribute(k, attrs[k]));
    if (parent) parent.appendChild(e);
    return e;
  };
  // a stroke that draws itself: hide it with the dash trick, then tween the offset to 0 (the same trick as the checklist's tick)
  const svgPrep = (el) => {
    const L = el.getTotalLength();
    el.style.strokeDasharray = L;
    el.style.strokeDashoffset = L;
    return L;
  };
  const svgDraw = (el, t, d, ease) => {
    const L = svgPrep(el);
    tl.fromTo(el, { strokeDashoffset: L }, { strokeDashoffset: 0, duration: d, ease: ease || "power3.out" }, t);
    return L;
  };
  const gridTex = (card) => mk("div", "k-gridtex", "", card); // a faint dot grid: graph paper behind a diagram or a plot
  // a ring that bursts out of a point: the kit's landing mark (as in K.tag)
  const burst = (parent, x, y, t, size, grow) => {
    const s = size ?? 200;
    const r = mk("div", "k-ring k-hid", "", parent);
    Object.assign(r.style, { left: x - s / 2 + "px", top: y - s / 2 + "px", width: s + "px", height: s + "px" });
    tl.fromTo(r, { scale: 0.3, autoAlpha: 0.95 }, { scale: grow ?? 2.6, autoAlpha: 0, duration: 0.7, ease: "power2.out" }, t);
    return r;
  };

  // How wide a Farsi phrase is in Vazirmatn Black, in ems. Measured on 39 real labels (2026-10-01): this is never under and usually 10-25 percent over, so
  // a label that fits by this estimate fits. It is an estimate on purpose: measuring in the page would give a wrong width if the font has not loaded yet.
  const emW = (s) => {
    const n = Array.from(String(s)).length;
    return Math.min(0.62 * n + 0.2, 0.52 * n + 0.9);
  };
  // the biggest font size (at most fs) that a phrase takes in maxW px, and whether that is still at least minFs
  const fitFs = (text, maxW, fs, minFs) => {
    const need = Math.floor(maxW / emW(text));
    return { fs: Math.max(minFs, Math.min(fs, need)), fits: need >= minFs };
  };
  const warnFit = (what, text, extra) => {
    const msg = "kit: " + what + " '" + text + "' does not fit at a readable size" + (extra ? " (" + extra + ")" : "") + ": shorten it, or use a card";
    (global.__kitWarnings = global.__kitWarnings || []).push(msg);
    if (global.console) global.console.warn(msg);
  };

  /* ---------- diagram: a chain that builds itself ----------
   * K.diagram(["نیرو", "سرعت", "توان", "برد"], { at:t (it comes in), nodeAt:[t,t,t,t] (a node lands when the pulse reaches it: say the word there), out:t,
   *   mode:"video" (the default: plates over his own picture, over the chest zone, his face stays) | "card" (a full-screen card),
   *   layout (video): "auto" (the default: the first of row, grid and stack whose text fits at a readable size) | "row" (a line of plates: short words) |
   *                   "grid" (2 x 2: three or four nodes, words up to about ten letters) | "stack" (up to three long phrases, one under the other)
   *   layout (card):  "chain" (the default: a staircase of plates) | "cycle" (exactly four, the last arrow runs back to the first, a mark turns in the middle),
   *   loop:true (video grid, four nodes: the last arrow runs back to the first and every plate lights; loopAt:t),
   *   look:"ink" | "clay" (card), travel:0.55 (one pulse's trip), y:1350 (video: the block's centre), wipeVariant })
   * He prefers it ON HIS OWN VIDEO when the spacing and the size of the text allow it (43), so that is the default and the layout adapts: the text is shrunk to fit
   * (never below 42 px on the video, 56 on a card) and a label that still does not fit is reported (console warning, window.__kitWarnings): shorten it or use a card.
   * The node being said is clay, earlier ones cool (to paper on a card, to a dark plate on the video, like the drum). It reads right to left, top to bottom. */
  K.diagram = (nodes, o = {}) => {
    const g = global.gsap;
    const n = nodes.length, texts = nodes.map((x) => (typeof x === "string" ? x : x.t)), vid = (o.mode || "video") === "video";
    const look = o.look || "ink", wv = o.wipeVariant || "iris", trav = o.travel ?? 0.55, TH = 12, MINF = vid ? 42 : 56, yc = o.y ?? 1350;
    let want = o.layout || (vid ? "auto" : "chain");
    if (vid && want === "cycle") want = "grid";
    if (vid && want === "chain") want = "auto";
    const loop = o.loop ?? want === "cycle";
    if (want === "cycle" && n !== 4) throw new Error("K.diagram cycle needs exactly four nodes");
    // geometry of one layout: the plates [left, top, width, height] and the arrows between them (axis-aligned, edge of one plate to the next)
    const plan = (name) => {
      const P = [], A = [];
      let tabW, fs, pad = 24;
      const side = (i, j, y) => (P[j][0] < P[i][0] ? [[P[i][0], y], [P[j][0] + P[j][2], y]] : [[P[i][0] + P[i][2], y], [P[j][0], y]]);
      const vert = (i, j, x) => (P[j][1] > P[i][1] ? [[x, P[i][1] + P[i][3]], [x, P[j][1]]] : [[x, P[i][1]], [x, P[j][1] + P[j][3]]]);
      // video blocks end at x 960: Instagram puts its buttons down the right edge, so the first node stays clear of them
      if (name === "row") {
        const gap = n > 3 ? 48 : 84, R = 960, Lm = 40, w = Math.floor((R - Lm - (n - 1) * gap) / n), h = n > 3 ? 112 : 124;
        tabW = n > 3 ? 60 : 76;
        fs = n > 3 ? 40 : 48;
        pad = 14;
        for (let i = 0; i < n; i++) P.push([R - (i + 1) * w - i * gap, yc - h / 2, w, h]);
        for (let i = 0; i < n - 1; i++) A.push(side(i, i + 1, yc));
      } else if (name === "grid") {
        const w = 410, h = 116, R = 960, gx = 100, gy = 76, top = yc - (2 * h + gy) / 2;
        const X = [R - w, R - 2 * w - gx], Y = [top, top + h + gy];
        tabW = 84;
        fs = 58;
        pad = 16;
        [[X[0], Y[0]], [X[1], Y[0]], [X[1], Y[1]], [X[0], Y[1]]].slice(0, n).forEach((q) => P.push([q[0], q[1], w, h]));
        const tx = (i) => P[i][0] + P[i][2] - tabW / 2;
        if (n > 1) A.push(side(0, 1, Y[0] + h / 2));
        if (n > 2) A.push(vert(1, 2, tx(1)));
        if (n > 3) A.push(side(2, 3, Y[1] + h / 2));
        if (loop && n === 4) A.push(vert(3, 0, tx(3)));
      } else if (name === "stack") {
        const w = 760, h = 92, gap = 56, left = 200, top0 = Math.round(yc - (n * h + (n - 1) * gap) / 2);
        tabW = 92;
        fs = 54;
        pad = 16;
        for (let i = 0; i < n; i++) P.push([left, top0 + i * (h + gap), w, h]);
        for (let i = 0; i < n - 1; i++) A.push(vert(i, i + 1, left + w - tabW / 2));
      } else if (name === "cycle") {
        tabW = 130;
        fs = 66;
        P.push([590, 690, 440, 200], [50, 690, 440, 200], [50, 1130, 440, 200], [590, 1130, 440, 200]);
        A.push([[590, 790], [490, 790]], [[270, 890], [270, 1130]], [[490, 1230], [590, 1230]], [[810, 1130], [810, 890]]);
      } else {
        const h = 156, pitch = n > 3 ? 270 : 300, top0 = 1040 - ((n - 1) * pitch + h) / 2;
        tabW = 156;
        fs = 80;
        for (let i = 0; i < n; i++) P.push([i % 2 ? 80 : 400, Math.round(top0 + i * pitch), 600, h]);
        for (let i = 0; i < n - 1; i++) A.push([[600, P[i][1] + h], [600, P[i + 1][1]]]);
      }
      // the biggest font each label takes in its plate
      const fits = texts.map((t, i) => fitFs(t, P[i][2] - tabW - 2 * pad, fs, MINF));
      return { name, P, A, tabW, fs, pad, fits, ok: fits.every((f) => f.fits), low: Math.min.apply(null, fits.map((f) => f.fs)) };
    };
    let pl;
    if (want === "auto") {
      // the first layout whose text fits (a row only while its text stays at 44 px or more); if none does, the one that keeps the text biggest
      const tries = ["row", "grid"].concat(n <= 3 ? ["stack"] : []).map(plan);
      pl = tries.find((t) => t.ok && (t.name !== "row" || t.low >= 44)) || tries.slice().sort((a, b) => b.low - a.low)[0];
    } else pl = plan(want);
    if (!pl.ok) texts.forEach((t, i) => (pl.fits[i].fits ? 0 : warnFit("diagram label", t, pl.name + " layout, " + MINF + " px")));
    const { P, A, tabW, fs, pad } = pl;
    const c = vid ? mk("div", "k-ovl") : mk("div", "k-full k-" + look);
    if (!vid) gridTex(c);
    const st = allow(mk("div", "k-nstage", "", c), "overflow"); // panels, plates and the card's own parts slide in from beyond the frame
    // colours as [plate, text, tab]
    const COL = vid
      ? { act: ["#c7552f", "#ffffff", "#16161a"], done: ["rgba(24,24,29,0.88)", "#e9e4da", "rgba(51,51,60,0.95)"] }
      : look === "clay"
      ? { act: ["#16161a", "#ffffff", "#c7552f"], done: ["#faf7f2", "#1a1a1a", "#c7552f"] }
      : { act: ["#c7552f", "#ffffff", "#16161a"], done: ["#faf7f2", "#1a1a1a", "#c7552f"] };
    // arrows first, so the plates sit on top of their ends
    const arrows = A.map((e) => {
      const a = e[0], b = e[1], horiz = a[1] === b[1], dx = Math.sign(b[0] - a[0]), dy = Math.sign(b[1] - a[1]);
      const len = Math.abs(horiz ? b[0] - a[0] : b[1] - a[1]);
      const line = mk("div", "k-dline", "", st);
      Object.assign(line.style, horiz
        ? { left: Math.min(a[0], b[0]) + "px", top: a[1] - TH / 2 + "px", width: len + "px", height: TH + "px" }
        : { left: a[0] - TH / 2 + "px", top: Math.min(a[1], b[1]) + "px", width: TH + "px", height: len + "px" });
      g.set(line, { transformOrigin: horiz ? (dx < 0 ? "100% 50%" : "0% 50%") : dy < 0 ? "50% 100%" : "50% 0%" });
      const head = mk("div", "k-dhead", "", st);
      Object.assign(head.style, { left: b[0] - dx * 22 + "px", top: b[1] - dy * 22 + "px" });
      g.set(head, { rotation: (Math.atan2(dy, dx) * 180) / Math.PI });
      const dot = mk("div", "k-dpulse", "", st);
      g.set(dot, { x: a[0], y: a[1] });
      return { line, head, dot, a, b, horiz, dx, dy };
    });
    const plates = nodes.map((nd, i) => {
      const L = typeof nd === "string" ? { t: nd } : nd, b = P[i];
      const p = mk("div", "k-dp", "", st);
      Object.assign(p.style, { left: b[0] + "px", top: b[1] + "px", width: b[2] + "px", height: b[3] + "px", backgroundColor: COL.act[0], color: COL.act[1] });
      const tab = mk("div", "k-dpn", K.fa(i + 1), p);
      Object.assign(tab.style, { width: tabW + "px", backgroundColor: COL.act[2], fontSize: Math.min(fs * 1.12, tabW * 0.78) + "px" });
      const lab = mk("div", "k-dpl", L.t, p);
      Object.assign(lab.style, { fontSize: pl.fits[i].fs + "px", padding: "0 " + pad + "px" });
      return { p, tab, cx: b[0] + b[2] - tabW / 2, cy: b[1] + b[3] / 2 };
    });
    // one pulse along one arrow: the line grows behind it, the head pops when it arrives
    const run = (ar, t, d) => {
      const prop = ar.horiz ? "scaleX" : "scaleY";
      tl.fromTo(ar.line, { autoAlpha: 1, [prop]: 0 }, { [prop]: 1, duration: d, ease: "power2.inOut" }, t);
      tl.set(ar.dot, { autoAlpha: 1 }, t);
      tl.fromTo(ar.dot, { x: ar.a[0], y: ar.a[1] }, { x: ar.b[0], y: ar.b[1], duration: d, ease: "power2.inOut" }, t);
      tl.to(ar.dot, { autoAlpha: 0, scale: 0.4, duration: 0.2 }, t + d);
      tl.fromTo(ar.head, { autoAlpha: 0, scale: 0.4 }, { autoAlpha: 1, scale: 1, duration: 0.2, ease: "back.out(3)" }, t + d - 0.08);
    };
    const tint = (i, t, k) => {
      tl.to(plates[i].p, { backgroundColor: COL[k][0], color: COL[k][1], duration: 0.3 }, t);
      tl.to(plates[i].tab, { backgroundColor: COL[k][2], duration: 0.3 }, t);
    };
    if (vid) tl.fromTo(c, { y: 260, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.65, ease: "expo.out" }, o.at);
    else K.wipeIn(c, o.at, o.wipe ?? 0.5, wv);
    nodes.forEach((_, i) => {
      const t = o.nodeAt[i], ar = i > 0 ? arrows[i - 1] : null;
      const off = ar ? [-ar.dx * 150, -ar.dy * 150] : [170, 0]; // the plate slides in from where the pulse came
      if (ar) run(ar, t - trav, trav);
      tl.fromTo(plates[i].p, { autoAlpha: 0, x: off[0], y: off[1] }, { autoAlpha: 1, x: 0, y: 0, duration: 0.5, ease: "expo.out" }, t - 0.06);
      burst(st, plates[i].cx, plates[i].cy, t, 200, 2.4);
      if (i > 0) tint(i - 1, t, "done");
    });
    if (loop && arrows.length === n) {
      // the last arrow runs back to the first node: the loop closes and every plate lights (on a card, a turning mark sits in the middle)
      const t0 = o.loopAt ?? o.nodeAt[n - 1] + 1.3, ta = t0 + trav;
      run(arrows[n - 1], t0, trav);
      burst(st, plates[0].cx, plates[0].cy, ta, 200, 2.4);
      plates.forEach((_, i) => tint(i, ta + i * 0.07, "act"));
      if (pl.name === "cycle") {
        const mark = mk("div", "k-dloop k-hid",
          '<svg viewBox="0 0 100 100"><path d="M66 22.3 A32 32 0 1 1 25.5 29.4" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/>' +
          '<path d="M34.5 18.7 L31.6 34.5 L19.4 24.3 Z" fill="currentColor"/></svg>', st);
        tl.fromTo(mark, { autoAlpha: 0, scale: 0.4 }, { autoAlpha: 1, scale: 1, duration: 0.55, ease: "back.out(2)" }, ta);
        tl.to(mark, { rotation: 120 * Math.max(1, o.out - ta), duration: Math.max(1, o.out - ta), ease: "none" }, ta);
      }
    }
    if (!vid) push(st, o.nodeAt[0], o.out, 0.03);
    if (vid) tl.to(c, { y: 260, autoAlpha: 0, duration: 0.45, ease: "power3.in" }, o.out);
    else K.wipeOut(c, o.out, o.wipe ?? 0.5, wv);
    return { card: c, plates, arrows, layout: pl.name, fits: pl.ok };
  };

  /* ---------- the force-time curve ----------
   * K.curve({ at:t (card in), out:t, look:"ink"|"paper", yLabel:"نیرو", xLabel:"زمان", labelsAt:t,
   *   curves:[{ at:t (it starts to draw), dur:1.4, tone:"paper"|"clay", x0:0.62 (where it climbs, 0-1), k:5.2 (how fast it climbs),
   *            label:"قبل", labelAt:t, labelU:0.8 }, ...],                    the last curve is the clay one
   *   slope:{ at:t, curve:1, label:"شیب", labelAt:t }                          a tangent at the steepest point, drawn with its rise and run
   *   gap:{ at:t, level:0.8, label:"زمان کمتر", labelAt:t } })                  two curves: the time each takes to reach a share of the peak
   * A graph is a claim. The curves are a drawn IDEA (the same peak, reached sooner), never his data; the words are his. */
  K.curve = (o = {}) => {
    const g = global.gsap, wv = o.wipeVariant || "iris", look = o.look || "ink";
    const X0 = 150, X1 = 940, YB = o.yb ?? 1400, YT = o.yt ?? 640, W = X1 - X0, H = YB - YT;
    const c = mk("div", "k-full k-" + look);
    gridTex(c);
    const st = allow(mk("div", "k-nstage", "", c), "overflow"); // panels, plates and the card's own parts slide in from beyond the frame
    const svg = sv("svg", { viewBox: "0 0 1080 1920", class: "k-csvg" }, st);
    // a logistic climb normalised to start at 0 and end at 1
    const fn = (u, x0, k) => {
      const s = (v) => 1 / (1 + Math.exp(-k * (v - x0)));
      return (s(u) - s(0)) / (s(1) - s(0));
    };
    const PX = (u) => X0 + W * u, PY = (v) => YB - H * v;
    const pt = (x, y) => x.toFixed(1) + " " + y.toFixed(1);
    const lab = (txt, cls, x, y, align) => {
      const e = mk("div", "k-clab k-hid " + cls, txt, st);
      Object.assign(e.style, { left: x + "px", top: y + "px" });
      g.set(e, { xPercent: align === "r" ? -100 : 0 }); // "r": the right edge sits on x (Farsi ends there)
      return e;
    };
    const rise = (e, t) => tl.fromTo(e, { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: "expo.out" }, t);
    K.wipeIn(c, o.at, o.wipe ?? 0.5, wv);
    // the frame: faint grid, the peak line, two axes that draw themselves, their arrowheads, the two words
    const grid = [0.25, 0.5, 0.75].map((v) => sv("path", { d: "M" + pt(X0, PY(v)) + "L" + pt(X1, PY(v)), class: "k-cgrid" }, svg));
    const peak = sv("path", { d: "M" + pt(X0, YT) + "L" + pt(X1 + 12, YT), class: "k-cpeak" }, svg);
    const axY = sv("path", { d: "M" + pt(X0, YB + 14) + "L" + pt(X0, YT - 84), class: "k-cax" }, svg);
    const axX = sv("path", { d: "M" + pt(X0 - 14, YB) + "L" + pt(X1 + 56, YB), class: "k-cax" }, svg);
    const headY = sv("path", { d: "M" + pt(X0 - 17, YT - 78) + "L" + pt(X0, YT - 112) + "L" + pt(X0 + 17, YT - 78) + "Z", class: "k-chead" }, svg);
    const headX = sv("path", { d: "M" + pt(X1 + 50, YB - 17) + "L" + pt(X1 + 84, YB) + "L" + pt(X1 + 50, YB + 17) + "Z", class: "k-chead" }, svg);
    const ta = o.at + 0.5;
    svgDraw(axX, ta, 0.7);
    svgDraw(axY, ta + 0.1, 0.7);
    tl.to([headX, headY], { autoAlpha: 1, duration: 0.2 }, ta + 0.62);
    tl.fromTo(grid.concat([peak]), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, stagger: 0.08 }, ta + 0.5);
    if (o.yLabel) rise(lab(o.yLabel, "k-caxl", X0 + 44, YT - 150, "l"), o.labelsAt ?? ta + 0.9);
    if (o.xLabel) rise(lab(o.xLabel, "k-caxl", X1 + 70, YB + 34, "r"), o.labelsAt ?? ta + 1.0);
    // the curves: the stroke draws, a glowing head runs along it (one short linear leg per sample, timed through the same ease)
    const curves = (o.curves || []).map((cv, i, all) => {
      const tone = cv.tone || (i === all.length - 1 ? "clay" : "paper");
      const N = 120, pts = [];
      for (let j = 0; j <= N; j++) {
        const u = j / N;
        pts.push([PX(u), PY(fn(u, cv.x0, cv.k))]);
      }
      const path = sv("path", { d: "M" + pts.map((p) => pt(p[0], p[1])).join("L"), class: "k-cv k-cv-" + tone }, svg);
      const dur = cv.dur ?? 1.4, ease = cv.ease || "power2.inOut", t0 = cv.at;
      const L = svgPrep(path);
      tl.fromTo(path, { strokeDashoffset: L }, { strokeDashoffset: 0, duration: dur, ease }, t0);
      const dot = mk("div", "k-cdot k-cdot-" + tone, "", st);
      g.set(dot, { x: pts[0][0], y: pts[0][1] });
      tl.set(dot, { autoAlpha: 1 }, t0);
      const cum = [0];
      for (let j = 1; j <= N; j++) cum.push(cum[j - 1] + Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]));
      let prev = 0;
      for (let j = 3; j <= N; j += 3) {
        const tj = dur * easeAt(ease, cum[j] / cum[N]);
        tl.to(dot, { x: pts[j][0], y: pts[j][1], duration: Math.max(0.001, tj - prev), ease: "none" }, t0 + prev);
        prev = tj;
      }
      if (tone === "clay") burst(st, pts[N][0], pts[N][1], t0 + dur, 190, 2.8);
      else tl.to(dot, { autoAlpha: 0, duration: 0.3 }, t0 + dur + 0.1);
      if (cv.label) {
        const lu = cv.labelU ?? (tone === "clay" ? 0.26 : 0.8), lx = PX(lu), ly = PY(fn(lu, cv.x0, cv.k));
        const e = tone === "clay" ? lab(cv.label, "k-clab-clay", lx - 40, ly - 36, "r") : lab(cv.label, "k-clab-paper", lx + 34, ly + 22, "l");
        rise(e, cv.labelAt ?? t0 + dur * 0.55);
      }
      return { path, pts, tone, cv, dur, t0 };
    });
    // the slope: a tangent at the steepest point, with its rise and run as a dashed triangle
    if (o.slope && curves.length) {
      const sc = curves[o.slope.curve ?? curves.length - 1], cv = sc.cv, u = o.slope.u ?? cv.x0;
      const P0 = [PX(u), PY(fn(u, cv.x0, cv.k))];
      const d = (fn(u + 0.002, cv.x0, cv.k) - fn(u - 0.002, cv.x0, cv.k)) / 0.004; // climb per unit of u
      const ang = Math.atan(-(H * d) / W), ux = Math.cos(ang), uy = Math.sin(ang), hl = o.slope.half ?? 170;
      const a = [P0[0] - ux * hl, P0[1] - uy * hl], b = [P0[0] + ux * hl, P0[1] + uy * hl];
      const tan = sv("path", { d: "M" + pt(a[0], a[1]) + "L" + pt(b[0], b[1]), class: "k-ctan" }, svg);
      const legs = sv("path", { d: "M" + pt(a[0], a[1]) + "L" + pt(b[0], a[1]) + "L" + pt(b[0], b[1]), class: "k-cleg" }, svg);
      const ts = o.slope.at;
      svgDraw(tan, ts, 0.5);
      tl.fromTo(legs, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35 }, ts + 0.35);
      if (o.slope.label) {
        const e = mk("div", "k-stamp k-paper k-sm k-hid", o.slope.label, st);
        Object.assign(e.style, { position: "absolute", left: P0[0] + 120 + "px", top: P0[1] - 64 + "px", zIndex: 6 });
        tl.fromTo(e, { autoAlpha: 0, scale: 0.4, rotate: -8 }, { autoAlpha: 1, scale: 1, rotate: -2, duration: 0.45, ease: "back.out(2.2)" }, o.slope.labelAt ?? ts + 0.4);
      }
    }
    // the gap: the time each curve takes to reach a share of the peak, lit on the time axis
    if (o.gap && curves.length > 1) {
      const v = o.gap.level ?? 0.8, ys = PY(v), tg = o.gap.at;
      const solve = (cv) => {
        let lo = 0, hi = 1;
        for (let i = 0; i < 30; i++) {
          const m = (lo + hi) / 2;
          if (fn(m, cv.x0, cv.k) < v) lo = m;
          else hi = m;
        }
        return (lo + hi) / 2;
      };
      const xA = PX(solve(curves[curves.length - 1].cv)), xB = PX(solve(curves[0].cv));
      const hz = sv("path", { d: "M" + pt(X0, ys) + "L" + pt(xB + 36, ys), class: "k-cleg" }, svg);
      const dA = sv("path", { d: "M" + pt(xA, ys) + "L" + pt(xA, YB), class: "k-cdrop k-cdrop-clay" }, svg);
      const dB = sv("path", { d: "M" + pt(xB, ys) + "L" + pt(xB, YB), class: "k-cdrop k-cdrop-paper" }, svg);
      const bar = sv("path", { d: "M" + pt(xA, YB) + "L" + pt(xB, YB), class: "k-cbar" }, svg);
      const dots = [sv("circle", { cx: xA, cy: ys, r: 13, class: "k-cpt k-cpt-clay" }, svg), sv("circle", { cx: xB, cy: ys, r: 13, class: "k-cpt k-cpt-paper" }, svg)];
      tl.fromTo(hz, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35 }, tg);
      tl.fromTo([dA, dB], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35, stagger: 0.18 }, tg + 0.2);
      tl.fromTo(dots, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25, stagger: 0.18 }, tg + 0.2);
      tl.set(bar, { autoAlpha: 1 }, tg + 0.7);
      svgDraw(bar, tg + 0.7, 0.5, "power3.out");
      if (o.gap.label) {
        const e = mk("div", "k-stamp k-sm k-hid", o.gap.label, st);
        Object.assign(e.style, { position: "absolute", left: (xA + xB) / 2 + "px", top: YB + 62 + "px", zIndex: 6 });
        g.set(e, { xPercent: -50 });
        tl.fromTo(e, { autoAlpha: 0, scale: 0.4, rotate: 6 }, { autoAlpha: 1, scale: 1, rotate: -2, duration: 0.45, ease: "back.out(2.2)" }, o.gap.labelAt ?? tg + 1.0);
      }
    }
    push(st, (curves[0] && curves[0].t0) || o.at + 1, o.out, 0.03);
    K.wipeOut(c, o.out, o.wipe ?? 0.5, wv);
    return { card: c, svg, curves };
  };

  /* ---------- chapter label: a section marker that rides the clay wipe ----------
   * K.chapter(2, "سرعت", { at:t (the wipe starts), landAt:t (the number settles), titleAt:t (the title is slammed), out:t, total:3, from:1 (the number it rolls from),
   *   variant:"band" (the default: a clay band across the chest zone, his face stays: he prefers it, 47) | "card" (full screen, his voice runs on, 46),
   *   look:"clay"|"ink"|"paper" (card), wipeVariant:"clay" (default) | "iris" | "push" ..., size:176 (card title), y:1180 (band top), roll })
   * The number is a ghost odometer that rolls one step per chapter; the title is slammed in; a row of chips says where you are (done, here, to come).
   * Three chapters in a reel at most. The top band stays free: nothing sits above y 500. Title and number are HIS words. */
  K.chapter = (num, title, o = {}) => {
    const g = global.gsap, band = (o.variant || "band") === "band", total = o.total ?? 3, from = o.from ?? Math.max(0, num - 1);
    const at = o.at, landAt = o.landAt ?? at + (band ? 0.8 : 1.0), titleAt = o.titleAt ?? landAt, roll = o.roll ?? (band ? 0.85 : 1.15);
    // the roll: one column of digits from the last chapter's number, through a full turn, to this one
    let digits = "";
    for (let k = from; k <= num + 10; k++) digits += DI + PD[k % 10] + "</i>";
    const steps = num + 10 - from;
    if (!band) {
      const look = o.look || "clay", wv = o.wipeVariant || "clay";
      const c = mk("div", "k-full k-" + look);
      const st = allow(mk("div", "k-nstage", "", c), "overflow"); // panels, plates and the card's own parts slide in from beyond the frame
      const glow = mk("div", "k-qglow", "", st);
      const ring = mk("div", "k-qring k-hid", "", st);
      ring.style.top = "760px";
      const size = o.numSize ?? 980;
      const win = allow(mk("div", "k-chn", "", st), "caption-zone", "occlusion", "overflow", "overlap"); // the chapter's ghost odometer
      Object.assign(win.style, { fontSize: size + "px", left: (1080 - 0.66 * size) / 2 + "px", top: 1000 - 0.56 * size + "px" });
      const col = mk("div", "k-chncol", digits, win);
      tl.fromTo(col, { y: 0 }, { y: -steps * size * 1.12, duration: roll, ease: "power3.out" }, landAt - roll);
      tl.fromTo(col, { filter: "blur(16px)" }, { filter: "blur(0px)", duration: roll, ease: "power2.out" }, landAt - roll);
      const tw = mk("div", "k-chtitle", "", st);
      tw.style.top = (o.titleY ?? 790) + "px";
      const stamp = mk("div", "k-stamp k-hid", title, tw);
      const tf = fitFs(title, 860, o.size ?? 176, 110); // a long title shrinks to fit the screen instead of running off it
      if (!tf.fits) warnFit("chapter title", title, "card");
      Object.assign(stamp.style, { fontSize: tf.fs + "px", padding: "4px 64px" });
      const row = mk("div", "k-chrow", "", st);
      row.style.top = (o.rowY ?? 1200) + "px";
      const chips = [];
      for (let i = 1; i <= total; i++) chips.push(mk("div", "k-chchip k-hid " + (i < num ? "k-done" : i === num ? "k-here" : "k-next"), K.fa(i), row));
      K.wipeIn(c, at, o.wipe ?? 0.5, wv);
      tl.fromTo(chips, { autoAlpha: 0, scale: 0.4 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: "back.out(2.4)", stagger: 0.09 }, at + 0.7);
      tl.fromTo(stamp, { scale: 2.4, autoAlpha: 0, rotate: -5 }, { scale: 1, autoAlpha: 1, rotate: -2, duration: 0.5, ease: "expo.out" }, titleAt);
      tl.fromTo(ring, { scale: 0.3, autoAlpha: 0.95 }, { scale: 3.6, autoAlpha: 0, duration: 0.85, ease: "power2.out" }, titleAt);
      tl.fromTo(glow, { scale: 0.6, opacity: 0.2 }, { scale: 1.25, opacity: 1, duration: 0.9, ease: "power2.out" }, titleAt);
      tl.to(chips[num - 1], { scale: 1.2, duration: 0.14, ease: "power2.out", yoyo: true, repeat: 1 }, titleAt + 0.1);
      shake(st, titleAt, o.shake ?? 10);
      push(st, titleAt + 0.5, o.out, 0.03);
      K.wipeOut(c, o.out, o.wipe ?? 0.5, wv);
      return { card: c, stamp, chips };
    }
    // the band: a clay slab across the chest zone (his face stays on screen), numeral tab on the right, the title beside it
    const b = mk("div", "k-chband", "", stage);
    b.style.top = (o.y ?? 1180) + "px";
    const nb = allow(mk("div", "k-chbn", "", b), "caption-zone", "occlusion", "overflow", "overlap"); // the chapter band's number window
    const col = mk("div", "k-chncol", digits, nb);
    const tt = mk("div", "k-chbt", "", b);
    const tf = fitFs(title, 640, 150, 96); // the band leaves 640 px beside the numeral: a longer title shrinks to fit
    if (!tf.fits) warnFit("chapter title", title, "band");
    tt.style.fontSize = tf.fs + "px";
    const words = K.words(title).map((w) => mk("span", "k-hid", w, tt));
    const bars = mk("div", "k-chbp", "", b);
    for (let i = 1; i <= total; i++) mk("i", i < num ? "k-done" : i === num ? "k-here" : "k-next", "", bars);
    const edge = mk("div", "k-chbedge", "", stage);
    edge.style.top = (o.y ?? 1180) + "px";
    tl.fromTo(b, { clipPath: "inset(0px 0px 0px 100%)" }, { clipPath: "inset(0px 0px 0px 0%)", duration: 0.55, ease: "power3.inOut" }, at);
    tl.fromTo(edge, { autoAlpha: 1, x: 1080 }, { x: -6, duration: 0.55, ease: "power3.inOut" }, at);
    tl.set(edge, { autoAlpha: 0 }, at + 0.57);
    tl.fromTo(col, { y: 0 }, { y: -steps * 340, duration: roll, ease: "power3.out" }, landAt - roll);
    tl.fromTo(col, { filter: "blur(10px)" }, { filter: "blur(0px)", duration: roll, ease: "power2.out" }, landAt - roll);
    tl.fromTo(words, { autoAlpha: 0, x: 160 }, { autoAlpha: 1, x: 0, duration: 0.5, ease: "expo.out", stagger: 0.09 }, titleAt);
    tl.to(b, { clipPath: "inset(0px 1080px 0px 0px)", duration: 0.5, ease: "power3.inOut" }, o.out);
    tl.fromTo(edge, { autoAlpha: 1, x: 1074 }, { x: -6, duration: 0.5, ease: "power3.inOut" }, o.out);
    tl.set(edge, { autoAlpha: 0 }, o.out + 0.52);
    return { band: b, words };
  };

  /* ---------- the body map: the app's traced body, muscles lit as he says them ----------
   * K.bodymap([{ m:"quads", label:"ران", at:t, view:"front"|"back", side:"r"|"l" }, { m:["glutes","hamstrings"], label:"زنجیره پشتی", at:t, view:"back" }, ...],
   *   { at:t (card in), out:t, chain:true (a glowing line and a pulse run from one step to the next: the joints chain), travel:0.55, height:1040, y:490 })
   * `m` is a muscle group of the app's drawing (front: neck back shoulder chest triceps core biceps forearm hip adductors quads calves shins peroneals
   * ankle; back: neck back shoulder triceps lowback forearm glutes quads adductors hamstrings calves peroneals) or a joint ring ("ring:hip", "ring:knee",
   * "ring:ankle": the prefix is needed because hip and ankle are also muscle groups; the hip ring is the kit's own, the app has none). Made for the ink card: the drawing is the app's dark-mode body.
   * The body turns round (a 3D flip) when a step asks for the other view. The muscle being said is full clay with a glow and a label on a leader
   * line; earlier ones stay in soft clay, so the body fills up. HIGHLIGHT ONLY WHAT HE SAYS: no "this only trains X" claim. Same drawing as the app. */
  K.bodymap = (steps, o = {}) => {
    const BM = global.BODYMAP;
    if (!BM) throw new Error("data/bodymap.js is not loaded (the template includes it, kit.scaffold copies it)");
    const g = global.gsap, wv = o.wipeVariant || "iris", look = o.look || "ink";
    const c = mk("div", "k-full k-" + look);
    const st = allow(mk("div", "k-nstage", "", c), "overflow"); // panels, plates and the card's own parts slide in from beyond the frame
    const glow = mk("div", "k-qglow", "", st);
    const VBW = 800, VBH = 1652, FH = o.height ?? 1040, S = FH / VBH, FW = VBW * S;
    const FX = 540 - FW / 2 + (o.dx ?? 0), FY = o.y ?? 490;
    glow.style.top = FY + FH / 2 - 400 + "px";
    // the reveal (a clip) lives on a wrapper: the figure itself must stay preserve-3d for the flip
    const wrap = mk("div", "k-bmwrap", "", st);
    const stage3 = mk("div", "k-bmstage", "", wrap);
    const body = mk("div", "k-bmfig", "", stage3);
    Object.assign(body.style, { left: FX + "px", top: FY + "px", width: FW + "px", height: FH + "px" });
    const PAL = look === "paper"
      ? { sf: "#ece6dc", mus: "#cbc1b2", ln: "#a89d8c", on: "#c7552f", soft: "#e8a68b", hot: "#f3c2ac" }
      : { sf: "#34343c", mus: "#4b4b56", ln: "#7b7b88", on: "#e06b43", soft: "#94553f", hot: "#ffcfba" };
    const faces = {};
    ["front", "back"].forEach((view) => {
      const pl = BM.place[view], vbx = pl.x + (pl.w - VBW) / 2;
      const svg = sv("svg", { viewBox: vbx + " 0 " + VBW + " " + VBH, class: "k-bmsvg", preserveAspectRatio: "xMidYMid meet" }, body);
      sv("path", { d: BM.sil[view], fill: PAL.sf }, svg);
      const gs = {};
      Object.keys(BM.groups[view]).forEach((k) => (gs[k] = sv("path", { d: BM.groups[view][k], fill: PAL.mus }, svg)));
      sv("path", { d: BM.line[view], "fill-rule": "evenodd", fill: PAL.ln, stroke: PAL.ln, "stroke-width": 1.2, "stroke-linejoin": "round" }, svg);
      sv("path", { d: BM.sil[view], fill: "none", stroke: PAL.ln, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      const rg = {}, R = (BM.rings && BM.rings[view]) || {};
      Object.keys(R).forEach((name) => {
        rg[name] = R[name].map((e) => sv("ellipse", { cx: e[0], cy: e[1], rx: e[2], ry: e[3], fill: "none", stroke: PAL.on, "stroke-width": 9, opacity: 0 }, svg));
      });
      faces[view] = { svg, gs, rg, vbx };
    });
    g.set(faces.back.svg, { rotationY: 180 });
    // a muscle group of the drawing, or a joint ring: "ring:hip", "ring:knee", "ring:ankle" (a bare "knee" works too; "hip" and "ankle" are
    // muscle groups of the drawing, so the ring needs its prefix)
    const pick = (view, id) => {
      const f = faces[view], isRing = id.indexOf("ring:") === 0, rn = isRing ? id.slice(5) : id;
      if (!isRing && f.gs[id]) return { path: f.gs[id] };
      if (f.rg[rn]) return { rings: f.rg[rn] };
      throw new Error("K.bodymap: no muscle or ring called '" + id + "' in the " + view + " view");
    };
    // where a muscle sits on the screen (the centre of its biggest piece on the chosen side), for the leader line
    const anchorOf = (view, id, side) => {
      const f = faces[view], mid = f.vbx + VBW / 2, r = pick(view, id);
      let best = null;
      const consider = (bb) => {
        const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
        const score = ((side === "l" ? cx < mid : cx > mid) ? 1e9 : 0) + bb.width * bb.height;
        if (!best || score > best.score) best = { cx, cy, score };
      };
      if (r.path) {
        r.path.getAttribute("d").split(/(?=M)/).forEach((d) => {
          const tmp = sv("path", { d }, f.svg);
          consider(tmp.getBBox());
          f.svg.removeChild(tmp);
        });
      } else r.rings.forEach((e) => consider(e.getBBox()));
      return [FX + (best.cx - f.vbx) * S, FY + best.cy * S];
    };
    const lsvg = sv("svg", { viewBox: "0 0 1080 1920", class: "k-csvg" }, st);
    const scan = mk("div", "k-bmscan", "", st);
    K.wipeIn(c, o.at, o.wipe ?? 0.5, wv);
    // the body is revealed top to bottom behind a scan line
    g.set(wrap, { clipPath: "inset(0px 0px 100% 0px)" });
    tl.fromTo(wrap, { clipPath: "inset(0px 0px 100% 0px)" }, { clipPath: "inset(0px 0px 0% 0px)", duration: 1.0, ease: "power2.inOut" }, o.at + 0.55);
    tl.fromTo(scan, { autoAlpha: 1, y: FY - 10 }, { y: FY + FH, duration: 1.0, ease: "power2.inOut" }, o.at + 0.55);
    tl.set(scan, { autoAlpha: 0 }, o.at + 1.58);
    let cur = steps[0].view || o.view || "front";
    g.set(body, { rotationY: cur === "back" ? 180 : 0 });
    const FLIP = 0.95;
    // which steps turn the body, and when: a step that asks for the other view starts its turn FLIP + 0.1 s before it speaks
    const views = [], flipAt = [];
    steps.forEach((s, i) => {
      const v = s.view || (i ? views[i - 1] : cur);
      views.push(v);
      flipAt.push(i && v !== views[i - 1] ? s.at - FLIP - 0.1 : null);
    });
    const NEXT = steps.map((s, i) => (i + 1 < steps.length ? steps[i + 1].at : o.out));
    const GLOW0 = "drop-shadow(0px 0px 0px rgba(224,107,67,0))", GLOW1 = "drop-shadow(0px 0px 24px rgba(224,107,67,0.9))";
    const anchors = [];
    steps.forEach((s, i) => {
      const view = views[i], f = faces[view], t = s.at, ids = [].concat(s.m);
      if (flipAt[i] != null) {
        tl.to(body, { rotationY: view === "back" ? 180 : 0, duration: FLIP, ease: "power3.inOut" }, flipAt[i]);
        tl.fromTo(body, { scale: 1 }, { scale: 0.9, duration: FLIP / 2, ease: "power2.inOut", yoyo: true, repeat: 1 }, flipAt[i]);
      }
      ids.forEach((id) => {
        const r = pick(view, id);
        if (r.path) {
          tl.fromTo(r.path, { fill: PAL.hot, filter: GLOW0 }, { fill: PAL.on, filter: GLOW1, duration: 0.5, ease: "power2.out" }, t);
          tl.to(r.path, { fill: PAL.soft, filter: GLOW0, duration: 0.4 }, NEXT[i] - 0.05);
        } else {
          // a joint ring: lit like a muscle (glow, soft fill). In a chain the rings are the nodes, so they all stay lit
          tl.fromTo(r.rings, { opacity: 0, filter: GLOW0, fill: "rgba(224,107,67,0)" }, { opacity: 1, filter: GLOW1, fill: "rgba(224,107,67,0.22)", duration: 0.4, stagger: 0.06 }, t);
          tl.to(r.rings, { opacity: o.chain ? 1 : 0.6, filter: GLOW0, duration: 0.4 }, NEXT[i] - 0.05);
        }
      });
      // the label on a leader line, on the side of the screen it was asked for. The plate sits against the edge (right edge at x 960:
      // Instagram's buttons own the far right) and the line ends at a LOW estimate of its width, so it tucks under the plate: no font measuring
      const side = s.side || (i % 2 ? "l" : "r");
      const [mx, my] = anchorOf(view, ids[0], side);
      const estW = Math.round(40 + 32 * Array.from(s.label).length);
      const innerX = side === "r" ? 960 - estW : 40 + estW, ly = Math.min(1480, Math.max(560, my + (s.dy ?? 0)));
      const lab = mk("div", "k-stamp k-paper k-hid k-bml", s.label, st);
      if (side === "r") lab.style.right = "120px";
      else lab.style.left = "40px";
      lab.style.top = ly - 46 + "px";
      // chain: a glowing line runs from the last step's spot to this one, with a pulse that arrives as he says it (hip -> knee -> ankle)
      anchors.push([mx, my]);
      if (o.chain && i > 0 && views[i] === views[i - 1]) {
        const tt = o.travel ?? 0.55, pa = anchors[i - 1];
        const seg = sv("path", { d: "M" + pa[0].toFixed(1) + " " + pa[1].toFixed(1) + "L" + mx.toFixed(1) + " " + my.toFixed(1), class: "k-bmchain" }, lsvg);
        tl.set(seg, { opacity: 1 }, t - tt);
        svgDraw(seg, t - tt, tt, "power2.inOut");
        const pulse = mk("div", "k-dpulse", "", st);
        g.set(pulse, { x: pa[0], y: pa[1] });
        tl.set(pulse, { autoAlpha: 1 }, t - tt);
        tl.fromTo(pulse, { x: pa[0], y: pa[1] }, { x: mx, y: my, duration: tt, ease: "power2.inOut" }, t - tt);
        tl.to(pulse, { autoAlpha: 0, scale: 0.4, duration: 0.2 }, t);
      }
      const ln = sv("path", { d: "M" + mx.toFixed(1) + " " + my.toFixed(1) + "L" + innerX + " " + ly.toFixed(1), class: "k-bmln" }, lsvg);
      const dt = sv("circle", { cx: mx.toFixed(1), cy: my.toFixed(1), r: 11, class: "k-bmdot" }, lsvg);
      const tOut = flipAt[i + 1] != null ? flipAt[i + 1] - 0.05 : NEXT[i] - 0.15;
      tl.set(ln, { opacity: 1 }, t);
      svgDraw(ln, t, 0.4, "power2.out");
      tl.fromTo(dt, { opacity: 0 }, { opacity: 1, duration: 0.2 }, t);
      tl.fromTo(lab, { autoAlpha: 0, x: side === "r" ? 140 : -140 }, { autoAlpha: 1, x: 0, duration: 0.5, ease: "expo.out" }, t + 0.22);
      tl.to([lab, ln, dt], { autoAlpha: 0, duration: 0.25 }, tOut);
    });
    push(st, o.at + 1.4, o.out, 0.03);
    K.wipeOut(c, o.out, o.wipe ?? 0.5, wv);
    return { card: c, body, faces };
  };

  /* ---------- catalogue label: for the showreel only, never in a real reel ---------- */
  K.label = (text, t0, t1) => {
    const l = allow(mk("div", "k-label", text), "caption-zone", "overflow"); // the showreel's catalogue label (never in a real reel)
    tl.fromTo(l, { autoAlpha: 0, x: -30 }, { autoAlpha: 1, x: 0, duration: 0.25, ease: "power2.out" }, t0);
    tl.to(l, { autoAlpha: 0, duration: 0.2 }, t1);
    return l;
  };

  global.K = K;
})(window);
