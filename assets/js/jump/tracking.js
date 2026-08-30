/* ============================================================================
   tracking.js — finding the athlete, the floor, and the moment of takeoff.

   Input is an array of downscaled grayscale frames with exact timestamps.
   Output is, per frame, where the lowest part of the athlete is (their feet)
   and where the middle of their silhouette is (a stand-in for their centre of
   mass), plus how much the tracker trusts itself.

   THE CRITICAL FAILURE MODE, STATED UP FRONT
   A shadow pooling under the feet sticks to them. It holds the foot signal at
   floor level for a frame or two after the real takeoff, and it rushes up to
   meet the descending foot before the real landing. Both shorten the measured
   flight time, so an unhandled shadow makes jumps read LOWER than they are.
   That is why this file runs two passes: the first pass finds the flight
   phase, where the shadow has detached and is easy to throw away, and
   measures how wide a real foot is. The second pass uses that width to tell
   foot from shadow during contact. A single pass cannot calibrate itself.

   COORDINATES
   Image coordinates throughout. y increases DOWNWARD. So the floor is a large
   y, and jumping makes y smaller. Free fall is therefore a parabola opening
   upward in y, and the fitted quadratic coefficient is positive.
   ========================================================================= */

(function (root) {
  "use strict";

  var JumpKit = root.JumpKit = root.JumpKit || {};

  /* ====================================================================
     Small numeric helpers
     ==================================================================== */

  function median(arr) {
    if (!arr.length) return 0;
    var a = arr.slice().sort(function (x, y) { return x - y; });
    var m = a.length >> 1;
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  }

  function mad(arr) {
    var m = median(arr);
    return median(arr.map(function (v) { return Math.abs(v - m); }));
  }

  function percentileOf(sorted, p) {
    if (!sorted.length) return 0;
    var i = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
    return sorted[i];
  }

  /* ====================================================================
     Background model.

     A static camera over a few seconds has no real background drift, so an
     adaptive model is not just unnecessary, it is harmful: it absorbs the
     athlete while they stand still and punches a hole exactly where the
     signal is. This is a static three stage model instead.
     ==================================================================== */

  function buildBackground(frames, W, H, opts) {
    opts = opts || {};
    var N = W * H;
    var K = Math.min(frames.length, 48);          // subsample, plenty for a median
    var step = Math.max(1, Math.floor(frames.length / K));
    var sample = [];
    for (var i = 0; i < frames.length && sample.length < K; i += step) sample.push(frames[i].buf);
    K = sample.length;

    // Per pixel percentile via a 256 bin histogram. Faster than sorting and
    // it costs one pass over the chosen frames. Takes the frame list
    // explicitly so the caller can re-run it on a cleaner subset.
    function percentileImage(p, useFrames) {
      var frameSet = useFrames || sample;
      var count = frameSet.length;
      var out = new Uint8Array(N);
      var hist = new Uint16Array(256);
      var target = Math.max(1, Math.round((p / 100) * count));
      for (var px = 0; px < N; px++) {
        hist.fill(0);
        for (var k = 0; k < count; k++) hist[frameSet[k][px]]++;
        var acc = 0, v = 0;
        for (v = 0; v < 256; v++) { acc += hist[v]; if (acc >= target) break; }
        out[px] = v;
      }
      return out;
    }

    /* --- stage 1, provisional median and a trust map ----------------- */

    var B0 = percentileImage(50);

    // Noise estimate from pixels that barely move.
    var ranges = new Uint8Array(N);
    for (var px = 0; px < N; px++) {
      var lo = 255, hi = 0;
      for (var k = 0; k < K; k++) {
        var v = sample[k][px];
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      ranges[px] = hi - lo;
    }
    var sortedRanges = Array.prototype.slice.call(ranges).sort(function (a, b) { return a - b; });
    var quietCut = percentileOf(sortedRanges, 40);
    var quietRanges = [];
    for (var px2 = 0; px2 < N; px2 += 7) if (ranges[px2] <= quietCut) quietRanges.push(ranges[px2]);
    var sn = Math.max(2, (median(quietRanges) || 4) / 2);

    var trust = new Uint8Array(N);
    var trusted = 0;
    for (var px3 = 0; px3 < N; px3++) {
      var ok = 0;
      for (var k3 = 0; k3 < K; k3++) if (Math.abs(sample[k3][px3] - B0[px3]) < 3 * sn) ok++;
      trust[px3] = (ok / K) > 0.60 ? 1 : 0;
      trusted += trust[px3];
    }
    var bgQuality = trusted / N;

    /* --- stage 2, rebuild the background behind the athlete ---------- */
    //
    // This is the NORMAL case for a vertical jump, and it is the one that
    // breaks a naive background model. The athlete stays in the same place
    // and jumps. Their torso covers the same pixels in every single frame,
    // so a temporal median at those pixels returns the ATHLETE, not the wall
    // behind them. Subtracting that background then finds only the thin bands
    // at the head and the feet where something actually changed, and the
    // measured silhouette collapses to a few pixels tall.
    //
    // The fix uses the two things the recording guide already demands: one
    // person, and a plain background. One person occupies a narrow band of
    // columns. Every row therefore has clean background pixels either side of
    // them, so the background inside the band can be rebuilt from the same
    // row outside it.
    //
    // The trade: a background with strong vertical structure running through
    // the athlete's band, a door frame or a window edge, gets rebuilt wrongly
    // and shows up as permanent foreground. That is what bgQuality is for,
    // and it is why the guide asks for a plain wall.

    var colActivity = new Float64Array(W);
    for (var cy = 0; cy < H; cy++) {
      var co = cy * W;
      for (var cx = 0; cx < W; cx++) colActivity[cx] += ranges[co + cx];
    }
    var peakCol = 0, peakVal = 0;
    for (var c = 0; c < W; c++) if (colActivity[c] > peakVal) { peakVal = colActivity[c]; peakCol = c; }

    var bandL = peakCol, bandR = peakCol;
    if (peakVal > 0) {
      var cut = 0.25 * peakVal;
      while (bandL > 0 && colActivity[bandL - 1] > cut) bandL--;
      while (bandR < W - 1 && colActivity[bandR + 1] > cut) bandR++;
    }
    // Widen a little. The arms and the shadow reach past the torso, and we
    // would rather rebuild slightly too much background than too little.
    var pad = Math.max(3, Math.round((bandR - bandL) * 0.25));
    bandL = Math.max(0, bandL - pad);
    bandR = Math.min(W - 1, bandR + pad);

    var bandWidth = bandR - bandL + 1;
    var B = new Uint8Array(B0);

    if (bandWidth < 0.62 * W) {
      for (var ry = 0; ry < H; ry++) {
        var ro = ry * W;
        var outside = [];
        for (var rx = 0; rx < W; rx++) {
          if (rx >= bandL && rx <= bandR) continue;
          if (trust[ro + rx]) outside.push(B0[ro + rx]);
        }
        if (outside.length < 6) continue;          // not enough to rebuild, leave the row alone
        var rowBg = median(outside);
        for (var bx = bandL; bx <= bandR; bx++) B[ro + bx] = rowBg;
      }
    } else {
      // The athlete fills most of the frame, so there is nothing clean to
      // rebuild from. Fall back to a percentile biased away from them, and
      // drop the quality score so the UI insists on manual confirmation.
      var movingSum = 0, movingN = 0, trustedSum = 0, trustedN = 0;
      for (var px4 = 0; px4 < N; px4++) {
        if (ranges[px4] > quietCut) { movingSum += B0[px4]; movingN++; }
        if (trust[px4]) { trustedSum += B0[px4]; trustedN++; }
      }
      var moversDarker = movingN && trustedN ? (movingSum / movingN) < (trustedSum / trustedN) : true;
      B = percentileImage(moversDarker ? 85 : 15);
      bgQuality = Math.min(bgQuality, 0.45);
    }

    /* --- stage 3, refine from athlete-free frames if there are any ---- */
    //
    // ORDER MATTERS HERE, and getting it wrong is subtle enough to be worth
    // spelling out. This check has to run against the REBUILT background, not
    // against the raw temporal median. Measured against the raw median, a
    // static athlete looks like background to itself: their torso sits at the
    // median in every frame, the difference is zero, and every frame reads as
    // "nobody in shot". The check then fires on every clip, returns the raw
    // median as the background, and the whole silhouette collapses to the few
    // pixels at the head and the feet that actually moved.

    function countForeground(buf, ref) {
      var c = 0;
      for (var p = 0; p < N; p += 3) if (Math.abs(buf[p] - ref[p]) > 3 * sn) c++;
      return c * 3;
    }

    var counts = sample.map(function (b) { return countForeground(b, B); });
    var minCount = Math.min.apply(null, counts);

    if (minCount < 0.02 * N) {
      var clean = [];
      for (var c2 = 0; c2 < sample.length; c2++) if (counts[c2] < 0.05 * N) clean.push(sample[c2]);
      if (clean.length >= 3) {
        // Genuinely athlete-free frames exist, so a plain median over just
        // those beats anything we can reconstruct.
        B = percentileImage(50, clean);
        bgQuality = Math.max(bgQuality, 0.9);
      }
    }

    // Pixels inside the band no longer hold an observed value, they hold a
    // reconstruction. They must not drive the exposure fit in trackFrame.
    for (var ty = 0; ty < H; ty++) {
      var to = ty * W;
      for (var tx = bandL; tx <= bandR; tx++) trust[to + tx] = 0;
    }

    return {
      B: B, trust: trust, bgQuality: bgQuality, sn: sn,
      band: { left: bandL, right: bandR, width: bandWidth, frameWidth: W }
    };
  }

  /* ====================================================================
     Per frame segmentation and measurement
     ==================================================================== */

  function trackFrame(buf, bg, W, H, roi, widthLimit) {
    var B = bg.B, sn = bg.sn;
    var N = W * H;
    var thresh = Math.max(9, 3 * sn);

    var x0 = roi.x0, x1 = roi.x1, y0 = roi.y0, y1 = roi.y1;

    /* --- photometric normalisation ---------------------------------- */
    // Phone auto exposure shifts the whole frame. Fit a gain and offset on
    // trusted pixels so a brightness change is not read as movement.
    var sx = 0, sy = 0, sxx = 0, sxy = 0, n = 0;
    for (var p = 0; p < N; p += 17) {
      if (!bg.trust[p]) continue;
      var iv = buf[p], bv = B[p];
      sx += iv; sy += bv; sxx += iv * iv; sxy += iv * bv; n++;
    }
    var gain = 1, offset = 0;
    if (n > 20) {
      var den = n * sxx - sx * sx;
      if (Math.abs(den) > 1e-6) {
        gain = (n * sxy - sx * sy) / den;
        offset = (sy - gain * sx) / n;
        if (!isFinite(gain) || gain < 0.5 || gain > 2) { gain = 1; offset = 0; }
      }
    }

    /* --- foreground mask --------------------------------------------- */

    var mask = new Uint8Array(N);
    for (var y = y0; y <= y1; y++) {
      var rowOff = y * W;
      for (var x = x0; x <= x1; x++) {
        var idx = rowOff + x;
        var v = gain * buf[idx] + offset;
        if (Math.abs(v - B[idx]) > thresh) mask[idx] = 1;
      }
    }

    /* --- open then close ---------------------------------------------- */
    // Despeckle first, then fill codec holes. This order matters: closing
    // first could bridge the body back to its own shadow after the opening
    // had just separated them.
    erode(mask, W, H, roi);
    dilate(mask, W, H, roi);
    dilate(mask, W, H, roi);
    erode(mask, W, H, roi);

    /* --- connected components, keep the biggest ------------------------ */

    var blob = largestBlob(mask, W, H, roi);
    if (!blob || blob.area < 40) {
      return { ok: false, area: blob ? blob.area : 0 };
    }

    /* --- row widths, the shadow test ----------------------------------- */

    var rowW = new Int32Array(H);
    var rowFg = new Float64Array(H);   // mean brightness of the blob in this row
    var rowBgM = new Float64Array(H);  // mean background brightness behind it
    for (var yy = blob.top; yy <= blob.bottom; yy++) {
      var c = 0, off = yy * W, sf = 0, sb = 0;
      for (var xx = blob.left; xx <= blob.right; xx++) {
        if (mask[off + xx] !== 2) continue;
        c++;
        sf += gain * buf[off + xx] + offset;
        sb += B[off + xx];
      }
      rowW[yy] = c;
      rowFg[yy] = c ? sf / c : 0;
      rowBgM[yy] = c ? sb / c : 0;
    }

    // A SHADOW IS A PARTIAL DARKENING, A PERSON IS NOT.
    // Width alone cannot separate a narrow attached shadow from a shoe, and
    // that shadow is what holds the foot signal at floor level for a frame or
    // two either side of every contact. But a shadow only scales the light
    // falling on the floor, so it lands in a predictable brightness ratio
    // against the background it covers. A person is made of different stuff
    // and lands anywhere.
    //
    // Known false positive, and it is the reason this is a row test rather
    // than a pixel gate: mid grey shoes on a light floor sit in the same
    // ratio band and get skipped, so the reported foot is the ankle instead.
    // That is a CONSTANT offset, and it cancels in h = groundY - footY
    // because the ground line is derived from the same estimator. Leaving a
    // shadow in place does not cancel, it moves frame to frame and wrecks the
    // flight timing. So this trade is strongly worth making.
    function shadowLikeRow(y) {
      if (!rowW[y] || rowBgM[y] < 1) return false;
      var ratio = rowFg[y] / rowBgM[y];
      return ratio > 0.45 && ratio < 0.92;
    }

    // How wide is this person? Measured over the upper part of the blob,
    // which is torso and legs and is never shadow. This gives the first pass
    // something to work with before any flight has been found, which matters
    // more than it sounds: with a shadow that stays attached to the foot for
    // the whole jump, the first pass cannot find a flight at all without it,
    // so nothing ever gets calibrated and the tracker reports the foot on the
    // floor in every frame.
    var upperRows = [];
    var upperEnd = blob.top + Math.round((blob.bottom - blob.top) * 0.7);
    for (var uy = blob.top; uy <= upperEnd; uy++) upperRows.push(rowW[uy]);
    var bodyW = median(upperRows) || 8;

    // Two independent ceilings, and we take the tighter. The calibrated one
    // knows what this athlete's shoe actually measures; the body relative one
    // works before there is any calibration and catches a shadow wide enough
    // to slip under a generous calibrated limit.
    var effLimit = (widthLimit && widthLimit > 0)
      ? Math.min(widthLimit, 1.8 * bodyW)
      : 1.8 * bodyW;

    // Bottom-most row that is narrow enough AND solid enough to be a foot,
    // confirmed by the row above it passing the same two tests.
    var footY = blob.bottom;
    for (var fy = blob.bottom; fy > blob.top; fy--) {
      if (rowW[fy] <= effLimit && rowW[fy - 1] <= effLimit &&
          !shadowLikeRow(fy) && !shadowLikeRow(fy - 1)) { footY = fy; break; }
    }
    var shadowRows = blob.bottom - footY;

    // Where along the floor that foot is.
    var footX = 0, footCount = 0, fo = footY * W;
    for (var fx = blob.left; fx <= blob.right; fx++) {
      if (mask[fo + fx] === 2) { footX += fx; footCount++; }
    }
    footX = footCount ? footX / footCount : (blob.left + blob.right) / 2;

    // Bottom width used to calibrate the width limit on the next pass, and
    // to score confidence. Take the median of the lowest few rows.
    var bottomRows = [];
    for (var br = Math.max(blob.top, blob.bottom - 4); br <= blob.bottom; br++) bottomRows.push(rowW[br]);

    return {
      ok: true,
      footX: footX,
      footY: footY,
      centroidX: blob.cx,
      centroidY: blob.cy,
      area: blob.area,
      largestFrac: blob.area / Math.max(1, blob.totalFg),
      top: blob.top,
      bottom: blob.bottom,
      left: blob.left,
      right: blob.right,
      bboxHeight: blob.bottom - blob.top,
      bottomWidth: median(bottomRows),
      widthAtFoot: rowW[footY],
      touchesEdge: blob.top <= y0 || blob.bottom >= y1 || blob.left <= x0 || blob.right >= x1,
      secondBlobFrac: blob.secondFrac
    };
  }

  /* --- morphology, 4 neighbour, in place over the ROI ----------------- */

  function erode(mask, W, H, roi) {
    var copy = mask.slice();
    for (var y = roi.y0 + 1; y < roi.y1; y++) {
      var o = y * W;
      for (var x = roi.x0 + 1; x < roi.x1; x++) {
        var i = o + x;
        if (copy[i] && (!copy[i - 1] || !copy[i + 1] || !copy[i - W] || !copy[i + W])) mask[i] = 0;
      }
    }
  }

  function dilate(mask, W, H, roi) {
    var copy = mask.slice();
    for (var y = roi.y0 + 1; y < roi.y1; y++) {
      var o = y * W;
      for (var x = roi.x0 + 1; x < roi.x1; x++) {
        var i = o + x;
        if (!copy[i] && (copy[i - 1] || copy[i + 1] || copy[i - W] || copy[i + W])) mask[i] = 1;
      }
    }
  }

  /* --- connected components, two pass union find, 8 connectivity ------ */

  function largestBlob(mask, W, H, roi) {
    var N = W * H;
    var labels = new Int32Array(N);
    var parent = [0];
    var next = 1;

    function find(a) { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; }
    function union(a, b) { a = find(a); b = find(b); if (a !== b) parent[b] = a; }

    for (var y = roi.y0; y <= roi.y1; y++) {
      var o = y * W;
      for (var x = roi.x0; x <= roi.x1; x++) {
        var i = o + x;
        if (!mask[i]) continue;
        var best = 0;
        var nb = [i - 1, i - W, i - W - 1, i - W + 1];
        for (var k = 0; k < 4; k++) {
          var j = nb[k];
          if (j < 0 || j >= N) continue;
          if (!labels[j]) continue;
          if (!best) best = labels[j]; else union(best, labels[j]);
        }
        if (!best) { best = next; parent[next] = next; next++; }
        labels[i] = best;
      }
    }

    var stats = {};
    var totalFg = 0;
    for (var y2 = roi.y0; y2 <= roi.y1; y2++) {
      var o2 = y2 * W;
      for (var x2 = roi.x0; x2 <= roi.x1; x2++) {
        var i2 = o2 + x2;
        if (!labels[i2]) continue;
        totalFg++;
        var r = find(labels[i2]);
        var s = stats[r] || (stats[r] = { area: 0, sx: 0, sy: 0, top: 1e9, bottom: -1, left: 1e9, right: -1, root: r });
        s.area++; s.sx += x2; s.sy += y2;
        if (y2 < s.top) s.top = y2;
        if (y2 > s.bottom) s.bottom = y2;
        if (x2 < s.left) s.left = x2;
        if (x2 > s.right) s.right = x2;
      }
    }

    var list = Object.keys(stats).map(function (k) { return stats[k]; })
      .sort(function (a, b) { return b.area - a.area; });
    if (!list.length) return null;

    var main = list[0];
    var second = list[1];

    // Mark the winning blob as 2 so the caller can measure row widths on it
    // alone. Everything else stays 1 and is ignored.
    for (var y3 = main.top; y3 <= main.bottom; y3++) {
      var o3 = y3 * W;
      for (var x3 = main.left; x3 <= main.right; x3++) {
        var i3 = o3 + x3;
        if (labels[i3] && find(labels[i3]) === main.root) mask[i3] = 2;
      }
    }

    return {
      area: main.area,
      cx: main.sx / main.area,
      cy: main.sy / main.area,
      top: main.top, bottom: main.bottom, left: main.left, right: main.right,
      totalFg: totalFg,
      secondFrac: second ? second.area / main.area : 0
    };
  }

  /* ====================================================================
     Ground line
     ==================================================================== */

  function groundLine(track) {
    var footYs = track.filter(function (t) { return t.ok; }).map(function (t) { return t.footY; });
    if (!footYs.length) return { y: 0, mad: 0 };

    var sorted = footYs.slice().sort(function (a, b) { return a - b; });
    var yg = percentileOf(sorted, 75);

    for (var iter = 0; iter < 3; iter++) {
      var contact = footYs.filter(function (v) { return v > yg - 3; });
      if (!contact.length) break;
      yg = median(contact);
    }
    var contactFinal = footYs.filter(function (v) { return v > yg - 3; });
    return { y: yg, mad: mad(contactFinal) };
  }

  /* ====================================================================
     Flight phase detection.

     Foot height above the floor is the signal. Foreground pixel count is
     useless here, it moves with arm position and with the shadow. Centroid
     velocity is a poor primary because takeoff is not sharp in the centroid.
     ==================================================================== */

  function segmentPhases(h, T, standingHeightPx) {
    var hiThresh = Math.max(4, 0.030 * standingHeightPx);
    var loThresh = Math.max(2, 0.015 * standingHeightPx);

    var phases = [];
    var state = "CONTACT";
    var contactStart = 0;

    for (var t = 0; t < h.length - 1; t++) {
      if (state === "CONTACT" && h[t] > hiThresh && h[t + 1] > hiThresh) {
        phases.push({ type: "contact", startIndex: contactStart, endIndex: t });
        phases.push({ type: "air", startIndex: t });
        state = "AIR";
      } else if (state === "AIR" && h[t] < loThresh) {
        phases[phases.length - 1].endIndex = t;
        contactStart = t;
        state = "CONTACT";
      }
    }
    if (state === "AIR") phases[phases.length - 1].endIndex = h.length - 1;
    else phases.push({ type: "contact", startIndex: contactStart, endIndex: h.length - 1 });

    return phases.filter(function (p) { return p.endIndex > p.startIndex; });
  }

  /* ====================================================================
     Sub frame refinement.

     Two things constrain this, and both are easy to get wrong.

     1. The contact side of the foot height signal is censored at zero. The
        segmentation cannot report a foot below the floor, so contact frames
        carry no slope information and including them drags the answer back
        towards the grid frame. Fit the AIRBORNE side only.
     2. The foot is not a projectile in the first fraction of a second after
        takeoff. The ankle is still extending. So do not force gravity onto
        the foot curve, fit a straight line and let it be what it is.
     ==================================================================== */

  /**
   * Walk a detected boundary outward to the last frame where the foot was
   * still on the floor. dir +1 walks backwards from a takeoff, dir -1 walks
   * forwards from a landing. Capped so a noisy trace cannot run away.
   */
  function snapToGround(h, index, dir, noise) {
    var i = index;
    for (var step = 0; step < 25; step++) {
      var next = i - dir;
      if (next < 0 || next >= h.length) break;
      if (h[next] <= noise) { i = next; break; }
      if (h[next] >= h[i]) break;     // no longer heading towards the floor
      i = next;
    }
    return i;
  }

  function refineCrossing(T, h, boundaryIndex, dir, conf, peakH) {
    var period = boundaryIndex + 1 < T.length ? (T[boundaryIndex + 1] - T[boundaryIndex]) : 0.004;

    // WHY THE DETECTED BOUNDARY IS NOT THE ANSWER
    // The hysteresis threshold has to clear the segmentation noise floor, so
    // it sits a few pixels above the ground. The foot crosses those few
    // pixels slowly, because right at the crossing it is barely moving in
    // pixel terms: a 30 cm jump filmed 100 px tall rises about half a pixel
    // per frame at 240 fps. So the threshold is reached SEVERAL frames after
    // the real crossing, always in the same direction, on both boundaries.
    // That is a systematic underestimate of flight time, not noise, and it is
    // exactly what this function exists to remove.
    //
    // So the fit window is chosen by HEIGHT, not by a fixed frame offset: all
    // the frames sitting on the ramp between the noise floor and a low
    // ceiling. Frames before the real crossing sit below the noise floor and
    // drop out on their own, which is what makes this safe.

    peakH = peakH || Math.max.apply(null, h);
    var noise = Math.max(0.6, 0.02 * peakH);
    var ceiling = Math.max(noise * 5, 0.30 * peakH);

    // Widen the ceiling until there are enough samples on the ramp. At a low
    // frame rate the foot crosses the first few pixels in only one or two
    // frames, and a fixed ceiling would leave nothing to fit. Widening costs
    // a little accuracy to curvature and buys a lot more than it costs,
    // because the alternative is falling back to a boundary that is biased.
    var S = [];
    var widen = [1, 1.7, 2.4];
    for (var w = 0; w < widen.length; w++) {
      var cap = Math.min(0.70 * peakH, ceiling * widen[w]);
      S = [];
      for (var k = -20; k <= 20; k++) {
        var i = boundaryIndex + k;
        if (i < 0 || i >= h.length) continue;
        if (h[i] <= noise || h[i] > cap) continue;
        if (conf && conf[i] != null && conf[i] < 0.4) continue;
        S.push(i);
      }
      if (S.length >= 4) break;
    }

    if (S.length < 3) return { t: T[boundaryIndex], sd: period, ok: false };

    var tbar = 0;
    S.forEach(function (k) { tbar += T[k]; });
    tbar /= S.length;

    var sxx = 0, sxy = 0, sy = 0;
    S.forEach(function (k) {
      var dt = T[k] - tbar;
      sxx += dt * dt;
      sxy += dt * h[k];
      sy += h[k];
    });
    if (sxx <= 0) return { t: T[boundaryIndex], sd: period, ok: false };

    var m = sxy / sxx;
    var c = sy / S.length;

    // Takeoff must have the foot rising, landing must have it falling. In
    // image coordinates h is height above floor, so both are positive slopes
    // away from the crossing. Wrong sign means we are not looking at a real
    // ground crossing.
    if (dir * m <= 0) return { t: T[boundaryIndex], sd: period, ok: false };

    var tc = tbar - c / m;

    // The crossing must land just outside the ramp we fitted, on the ground
    // side. Anywhere else and the fit is telling us something is wrong rather
    // than giving us extra precision.
    //
    // Note this bound is around the RAMP, not around the detected boundary.
    // Bounding it to one frame of the detected boundary would forbid the
    // correction this function exists to make, and silently leave the whole
    // systematic error in place.
    // The crossing sits on opposite sides of the ramp for the two boundaries:
    // takeoff happens BEFORE the foot climbs the ramp, landing happens AFTER
    // it comes back down it. A single symmetric bound gets one of them wrong,
    // which silently leaves the whole systematic error in place on that side.
    var rampFirst = T[S[0]], rampLast = T[S[S.length - 1]];
    var lo, hi;
    if (dir > 0) { lo = rampFirst - 20 * period; hi = rampFirst + period; }
    else { lo = rampLast - period; hi = rampLast + 20 * period; }

    if (tc < lo || tc > hi) {
      return { t: T[boundaryIndex], sd: period, ok: false };
    }

    var resid = 0;
    S.forEach(function (k) {
      var pred = m * (T[k] - tbar) + c;
      resid += (h[k] - pred) * (h[k] - pred);
    });
    var sr = Math.sqrt(resid / Math.max(1, S.length - 2));
    var sd = (sr / Math.abs(m)) * Math.sqrt(1 / S.length + Math.pow(tc - tbar, 2) / sxx);

    return { t: tc, sd: sd, ok: true };
  }

  /* ====================================================================
     Centroid parabola, and the gravity cross check.

     This is the independent second opinion. The feet tell us the flight time.
     The body tells us, separately, how fast it was accelerating. If those two
     disagree, either the frame rate is wrong or the athlete did something the
     flight time method cannot see, like tucking their legs.
     ==================================================================== */

  function fitParabola(times, ys) {
    var n = times.length;
    if (n < 5) return null;

    // Mean centre t. Fitting on absolute seconds makes the normal equations
    // catastrophically ill conditioned even in double precision.
    var tbar = 0;
    for (var i = 0; i < n; i++) tbar += times[i];
    tbar /= n;

    var S = [0, 0, 0, 0, 0];    // sums of dt^0..dt^4
    var Y = [0, 0, 0];          // sums of y*dt^0..dt^2
    for (var k = 0; k < n; k++) {
      var dt = times[k] - tbar;
      var p = 1;
      for (var e = 0; e < 5; e++) { S[e] += p; p *= dt; }
      Y[0] += ys[k];
      Y[1] += ys[k] * dt;
      Y[2] += ys[k] * dt * dt;
    }

    // Solve the 3x3 system for [c, b, a] in y = a*dt^2 + b*dt + c
    var M = [
      [S[0], S[1], S[2]],
      [S[1], S[2], S[3]],
      [S[2], S[3], S[4]]
    ];
    var sol = solve3(M, Y);
    if (!sol) return null;

    var c = sol[0], b = sol[1], a = sol[2];

    var ssTot = 0, ssRes = 0, ybar = Y[0] / n;
    for (var q = 0; q < n; q++) {
      var d = times[q] - tbar;
      var pred = a * d * d + b * d + c;
      ssRes += (ys[q] - pred) * (ys[q] - pred);
      ssTot += (ys[q] - ybar) * (ys[q] - ybar);
    }

    return {
      a: a, b: b, c: c, tbar: tbar,
      r2: ssTot > 0 ? 1 - ssRes / ssTot : 0,
      apexT: a !== 0 ? tbar - b / (2 * a) : tbar,
      apexY: a !== 0 ? c - (b * b) / (4 * a) : c
    };
  }

  function solve3(M, v) {
    var A = [
      [M[0][0], M[0][1], M[0][2], v[0]],
      [M[1][0], M[1][1], M[1][2], v[1]],
      [M[2][0], M[2][1], M[2][2], v[2]]
    ];
    for (var col = 0; col < 3; col++) {
      var piv = col;
      for (var r = col + 1; r < 3; r++) if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
      if (Math.abs(A[piv][col]) < 1e-12) return null;
      var tmp = A[col]; A[col] = A[piv]; A[piv] = tmp;
      for (var r2 = 0; r2 < 3; r2++) {
        if (r2 === col) continue;
        var f = A[r2][col] / A[col][col];
        for (var c2 = col; c2 < 4; c2++) A[r2][c2] -= f * A[col][c2];
      }
    }
    return [A[0][3] / A[0][0], A[1][3] / A[1][1], A[2][3] / A[2][2]];
  }

  /**
   * Compare the fitted acceleration against real gravity.
   * Returns null when we have no height to scale with.
   */
  function gravityCheck(parabola, standingHeightPx, athleteHeight_m) {
    if (!parabola || !standingHeightPx || !athleteHeight_m) return null;
    var P = JumpKit.physics;
    var scale = P.pixelScale(standingHeightPx, athleteHeight_m);
    var ghat = P.impliedGravity(parabola.a, scale);
    if (!isFinite(ghat) || ghat <= 0) return null;
    return {
      ghat: ghat,
      rho: ghat / P.G,
      lambda: P.impliedTimebaseDivisor(ghat),
      impliedHeight_m: P.impliedAthleteHeight_m(standingHeightPx, parabola.a),
      band: P.gravityCheckBand(ghat / P.G),
      r2: parabola.r2
    };
  }

  /**
   * Split the airborne frames in half and fit each half separately. If the
   * two halves imply different timebases, a speed ramp is running through the
   * jump and NO single correction can fix it. This is the check that makes an
   * iPhone slow motion export safe to refuse rather than silently mis-measure.
   */
  function rampGuard(times, ys, standingHeightPx, athleteHeight_m) {
    if (times.length < 12) return { ok: true, reason: "too few frames to test" };
    var half = Math.floor(times.length / 2);
    var a = fitParabola(times.slice(0, half), ys.slice(0, half));
    var b = fitParabola(times.slice(half), ys.slice(half));
    if (!a || !b) return { ok: true, reason: "could not fit both halves" };

    var ca = gravityCheck(a, standingHeightPx, athleteHeight_m);
    var cb = gravityCheck(b, standingHeightPx, athleteHeight_m);
    if (!ca || !cb) return { ok: true, reason: "no scale available" };

    var mean = (ca.lambda + cb.lambda) / 2;
    var diff = Math.abs(ca.lambda - cb.lambda) / (mean || 1);
    return {
      ok: diff <= 0.10,
      diff: diff,
      lambdaFirst: ca.lambda,
      lambdaSecond: cb.lambda
    };
  }

  /* ====================================================================
     Confidence
     ==================================================================== */

  function frameConfidence(t, medianArea, standingHeightPx, footWidth) {
    if (!t || !t.ok) return 0;
    var terms = [];

    terms.push(clamp01(1 - Math.abs(Math.log(t.area / Math.max(1, medianArea))) / Math.log(2.5)));
    terms.push(clamp01((t.largestFrac - 0.6) / 0.35));
    if (standingHeightPx) {
      var hr = t.bboxHeight / standingHeightPx;
      terms.push(clamp01(1 - Math.abs(hr - 0.9) / 0.5));
    }
    if (footWidth) {
      terms.push(clamp01(1 - Math.max(0, (t.widthAtFoot / footWidth) - 1) / 2.0));
    }
    if (t.touchesEdge) return 0;
    if (t.secondBlobFrac > 0.30) terms.push(0.4);

    var prod = 1;
    terms.forEach(function (v) { prod *= Math.max(0.02, v); });
    return Math.pow(prod, 1 / terms.length);
  }

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  /* ====================================================================
     The whole analysis
     ==================================================================== */

  function analyse(frames, roi, athleteHeight_m, opts) {
    opts = opts || {};
    var W = opts.width, H = opts.height;
    var T = frames.map(function (f) { return f.t; });

    var bg = buildBackground(frames, W, H);

    /* ---- pass A, uncalibrated, just to find the flight -------------- */

    var passA = frames.map(function (f) { return trackFrame(f.buf, bg, W, H, roi, 0); });
    var gl0 = groundLine(passA);
    var heights0 = passA.map(function (t) { return t.ok ? gl0.y - t.footY : 0; });

    var standingHeights = passA.filter(function (t) { return t.ok; }).map(function (t) { return t.bboxHeight; });
    var standingHeightPx = median(standingHeights);

    var phases0 = segmentPhases(heights0, T, standingHeightPx);
    var air0 = phases0.filter(function (p) { return p.type === "air"; })
      .sort(function (a, b) { return (b.endIndex - b.startIndex) - (a.endIndex - a.startIndex); })[0];

    // Foot width measured while airborne, where the shadow has detached and
    // cannot contaminate it. This is the whole reason for two passes.
    var footWidth = 8;
    if (air0) {
      var widths = [];
      for (var i = air0.startIndex; i <= air0.endIndex; i++) {
        if (passA[i] && passA[i].ok) widths.push(passA[i].bottomWidth);
      }
      if (widths.length) footWidth = Math.max(4, median(widths));
    }
    // 1.9 rather than a looser factor: a floor shadow typically spreads the
    // bottom rows to about twice the shoe width, so anything much above 2
    // lets it straight through.
    var widthLimit = 1.9 * footWidth;

    /* ---- pass B, calibrated ------------------------------------------ */

    var track = frames.map(function (f) { return trackFrame(f.buf, bg, W, H, roi, widthLimit); });
    var gl = groundLine(track);
    var h = track.map(function (t) { return t.ok ? gl.y - t.footY : 0; });

    var medianArea = median(track.filter(function (t) { return t.ok; }).map(function (t) { return t.area; }));
    var conf = track.map(function (t) { return frameConfidence(t, medianArea, standingHeightPx, footWidth); });

    var phases = segmentPhases(h, T, standingHeightPx);

    /* ---- refine every boundary --------------------------------------- */

    var flights = [];
    var contacts = [];
    var seq = [];        // phases in order, holding the object built for each

    phases.forEach(function (p) {
      if (p.type === "air") {
        // Peak height of THIS flight, so the ramp window scales with the hop
        // rather than with the biggest jump in the clip.
        var peakH = 0;
        for (var pk = p.startIndex; pk <= p.endIndex && pk < h.length; pk++) {
          if (h[pk] > peakH) peakH = h[pk];
        }

        // The hysteresis thresholds exist to find the phase reliably, not to
        // define where it starts. Both of them sit above the floor, so the
        // detected takeoff is late and the detected landing is early, and the
        // two biases COMPOUND rather than cancel. Snap each boundary out to
        // the last frame the foot was genuinely at floor level before doing
        // anything else. This is what makes the grid fallback unbiased when
        // sub frame refinement cannot run.
        var noiseFloor = Math.max(0.6, 0.02 * peakH);
        p.startIndex = snapToGround(h, p.startIndex, +1, noiseFloor);
        p.endIndex = snapToGround(h, p.endIndex, -1, noiseFloor);

        var start = refineCrossing(T, h, p.startIndex, +1, conf, peakH);
        var end = refineCrossing(T, h, p.endIndex, -1, conf, peakH);
        // Mixing a refined boundary with a grid boundary reintroduces half a
        // frame of bias, so it is both or neither.
        var bothOk = start.ok && end.ok;
        var flight = {
          start: bothOk ? start.t : T[p.startIndex],
          end: bothOk ? end.t : T[p.endIndex],
          startIndex: p.startIndex,
          endIndex: p.endIndex,
          refined: bothOk,
          sdStart: start.sd,
          sdEnd: end.sd,
          ok: (p.endIndex - p.startIndex) >= 6
        };
        flights.push(flight);
        seq.push({ type: "air", obj: flight });
      } else {
        var contact = {
          start: T[p.startIndex],
          end: T[p.endIndex],
          startIndex: p.startIndex,
          endIndex: p.endIndex,
          ok: (p.endIndex - p.startIndex) >= 5,
          flightAfter: -1
        };
        contacts.push(contact);
        seq.push({ type: "contact", obj: contact });
      }
    });

    // A ground contact ENDS exactly where the next flight begins, and BEGINS
    // exactly where the previous one ended. Otherwise the flight time and the
    // contact time either overlap or leave a gap, and RSI is wrong.
    //
    // Link by ORDER, never by matching frame indices. snapToGround moves the
    // air phase boundaries after segmentPhases has already built the contact
    // phases, so the two no longer share an index, and an index match here
    // silently pairs nothing and drops every hop in the 10-5.
    for (var si = 0; si < seq.length; si++) {
      if (seq[si].type !== "air") continue;
      var air = seq[si].obj;
      if (si > 0 && seq[si - 1].type === "contact") {
        seq[si - 1].obj.end = air.start;
        seq[si - 1].obj.flightAfter = flights.indexOf(air);
      }
      if (si + 1 < seq.length && seq[si + 1].type === "contact") {
        seq[si + 1].obj.start = air.end;
      }
    }

    /* ---- the physics cross check ------------------------------------- */

    var main = flights.filter(function (f) { return f.ok; })
      .sort(function (a, b) { return (b.end - b.start) - (a.end - a.start); })[0];

    var parabola = null, check = null, ramp = null;
    if (main) {
      var ts = [], ys = [];
      for (var k = main.startIndex; k <= main.endIndex; k++) {
        if (track[k] && track[k].ok) { ts.push(T[k]); ys.push(track[k].centroidY); }
      }
      parabola = fitParabola(ts, ys);
      check = gravityCheck(parabola, standingHeightPx, athleteHeight_m);
      ramp = rampGuard(ts, ys, standingHeightPx, athleteHeight_m);
    }

    /* ---- posture proxies ---------------------------------------------- */

    var posture = null;
    if (main) {
      var takeoffFrame = track[main.startIndex];
      var landingFrame = track[Math.min(track.length - 1, main.endIndex)];
      var minFlightH = Infinity;
      for (var m = main.startIndex; m <= main.endIndex; m++) {
        if (track[m] && track[m].ok && track[m].bboxHeight < minFlightH) minFlightH = track[m].bboxHeight;
      }
      posture = {
        standingBboxH: standingHeightPx,
        takeoffBboxH: takeoffFrame && takeoffFrame.ok ? takeoffFrame.bboxHeight : null,
        landingBboxH: landingFrame && landingFrame.ok ? landingFrame.bboxHeight : null,
        minFlightBboxH: isFinite(minFlightH) ? minFlightH : null
      };
    }

    /* ---- overall confidence -------------------------------------------- */

    var boundaryConf = [];
    if (main) {
      [main.startIndex, main.endIndex].forEach(function (idx) {
        for (var d = -1; d <= 1; d++) {
          var q = idx + d;
          if (q >= 0 && q < conf.length) boundaryConf.push(conf[q]);
        }
      });
    }
    var overall = boundaryConf.length
      ? boundaryConf.reduce(function (a, b) { return a + b; }, 0) / boundaryConf.length
      : 0;

    if (bg.bgQuality < 0.55) overall *= 0.75;
    if (check && check.band === "amber") overall *= 0.85;
    if (check && check.band === "red") overall *= 0.4;
    if (parabola && parabola.r2 < 0.97) overall *= 0.85;

    return {
      T: T,
      h: h,
      track: track,
      conf: conf,
      groundY: gl.y,
      groundMad: gl.mad,
      standingHeightPx: standingHeightPx,
      footWidth: footWidth,
      flights: flights,
      contacts: contacts,
      mainFlight: main,
      parabola: parabola,
      gravity: check,
      ramp: ramp,
      posture: posture,
      bgQuality: bg.bgQuality,
      confidence: clamp01(overall)
    };
  }

  /* ==================================================================== */

  JumpKit.tracking = {
    analyse: analyse,
    buildBackground: buildBackground,
    trackFrame: trackFrame,
    groundLine: groundLine,
    segmentPhases: segmentPhases,
    refineCrossing: refineCrossing,
    fitParabola: fitParabola,
    gravityCheck: gravityCheck,
    rampGuard: rampGuard
  };

})(typeof window !== "undefined" ? window : this);
