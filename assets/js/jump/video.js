/* ============================================================================
   video.js — working out when each frame actually happened, and getting at
   the pixels.

   THE GOVERNING IDEA
   There is no such thing as "the fps" of a video. What there is, is an array
   T[] holding the presentation time of every frame in seconds. Every duration
   this app reports is the difference between two entries in that array. A
   scalar fps exists only for display and for deciding what we are willing to
   measure.

   This matters because an iPhone slow-motion export can hold 240 fps regions
   and 30 fps regions inside one file, so any single number is wrong for part
   of the clip.

   WHAT THIS FILE DOES
   1. Parses the MP4/MOV container by hand to get exact per-frame timing.
   2. Cross-checks that against what the browser thinks, which is the only
      defence against edit lists being honoured differently per browser.
   3. Pulls frames out, verifying which frame we actually landed on.

   NOT IMPLEMENTED YET, ON PURPOSE
   A WebCodecs decode path would be 5 to 10 times faster than seeking. It is
   deliberately left out of v1: it needs a full sample-table demuxer, and a
   subtle bug there produces the wrong FRAME rather than an obvious error.
   Slow and right beats fast and quietly wrong. The seek path below is the
   method the validation literature used, so this is not a degraded product.
   Add it behind `PATHS.A` when there is time to test it against real files
   from several phones.
   ========================================================================= */

(function (root) {
  "use strict";

  var JumpKit = root.JumpKit = root.JumpKit || {};

  /* ====================================================================
     Byte helpers
     ==================================================================== */

  function fourcc(dv, off) {
    return String.fromCharCode(
      dv.getUint8(off), dv.getUint8(off + 1),
      dv.getUint8(off + 2), dv.getUint8(off + 3)
    );
  }

  function u64(dv, off) {
    // Avoid BigInt so this works everywhere. Video files never legitimately
    // exceed 2^53 bytes, so the precision loss is theoretical.
    return dv.getUint32(off) * 4294967296 + dv.getUint32(off + 4);
  }

  function sliceBuffer(file, start, end) {
    return file.slice(start, Math.min(end, file.size)).arrayBuffer();
  }

  /* ====================================================================
     Top level box walk.

     Done by reading 16 byte headers only, so a 200 MB mdat is skipped
     rather than loaded. Phone recordings put moov at the END of the file,
     after mdat, which is why we cannot just read the first megabyte.
     ==================================================================== */

  function walkTopLevel(file) {
    var boxes = [];
    var off = 0;

    function step() {
      if (off >= file.size) return Promise.resolve(boxes);
      return sliceBuffer(file, off, off + 16).then(function (buf) {
        if (buf.byteLength < 8) return boxes;
        var dv = new DataView(buf);
        var size = dv.getUint32(0);
        var type = fourcc(dv, 4);
        var headerSize = 8;

        if (size === 1) {
          if (buf.byteLength < 16) return boxes;
          size = u64(dv, 8);
          headerSize = 16;
        } else if (size === 0) {
          size = file.size - off;
        }
        if (size < 8 || off + size > file.size + 1) {
          throw new Error("MALFORMED_CONTAINER");
        }

        boxes.push({ type: type, start: off, size: size, headerSize: headerSize });
        off += size;
        return step();
      });
    }
    return step();
  }

  /* ====================================================================
     In-memory box tree, used once moov has been sliced out.
     ==================================================================== */

  var CONTAINERS = {
    moov: 1, trak: 1, edts: 1, mdia: 1, minf: 1, stbl: 1,
    mvex: 1, moof: 1, traf: 1, udta: 1
  };

  // Children of a QuickTime 'meta' start straight after the header. Children
  // of an ISO 'meta' start 4 bytes later, past version and flags. Guessing
  // wrong here misparses every .MOV an iPhone produces.
  var QT_META_FIRST_CHILDREN = { hdlr: 1, keys: 1, ilst: 1, mhdr: 1 };

  function parseBoxes(dv, start, end, out) {
    out = out || [];
    var off = start;
    while (off + 8 <= end) {
      var size = dv.getUint32(off);
      var type = fourcc(dv, off + 4);
      var headerSize = 8;

      if (size === 1) {
        size = u64(dv, off + 8);
        headerSize = 16;
      } else if (size === 0) {
        size = end - off;
      }
      if (size < 8 || off + size > end) break;

      var box = {
        type: type,
        start: off,
        end: off + size,
        payload: off + headerSize,
        children: null
      };

      if (CONTAINERS[type]) {
        box.children = parseBoxes(dv, box.payload, box.end);
      } else if (type === "meta") {
        var childStart = box.payload;
        if (off + 16 <= end) {
          var probe = fourcc(dv, off + 12);
          if (!QT_META_FIRST_CHILDREN[probe]) childStart = box.payload + 4;
        }
        box.children = parseBoxes(dv, childStart, box.end);
      }

      out.push(box);
      off += size;
    }
    return out;
  }

  function findBox(boxes, type) {
    for (var i = 0; i < boxes.length; i++) {
      if (boxes[i].type === type) return boxes[i];
      if (boxes[i].children) {
        var hit = findBox(boxes[i].children, type);
        if (hit) return hit;
      }
    }
    return null;
  }

  function findAll(boxes, type, acc) {
    acc = acc || [];
    for (var i = 0; i < boxes.length; i++) {
      if (boxes[i].type === type) acc.push(boxes[i]);
      if (boxes[i].children) findAll(boxes[i].children, type, acc);
    }
    return acc;
  }

  /* ====================================================================
     Track selection and the timing boxes
     ==================================================================== */

  function isVideoTrack(dv, trak) {
    // handler_type sits at box start + 16. Reading it at +12 would pick up
    // QuickTime's component_type ('mhlr') and reject every .MOV.
    var hdlrs = findAll(trak.children || [], "hdlr");
    for (var i = 0; i < hdlrs.length; i++) {
      if (fourcc(dv, hdlrs[i].start + 16) === "vide") return true;
    }
    return false;
  }

  function readMdhd(dv, box) {
    var version = dv.getUint8(box.payload);
    return version === 1
      ? { timescale: dv.getUint32(box.start + 28), duration: u64(dv, box.start + 32) }
      : { timescale: dv.getUint32(box.start + 20), duration: dv.getUint32(box.start + 24) };
  }

  function readStts(dv, box) {
    var count = dv.getUint32(box.start + 12);
    var entries = [];
    var off = box.start + 16;
    for (var i = 0; i < count && off + 8 <= box.end; i++, off += 8) {
      entries.push({
        sampleCount: dv.getUint32(off),
        sampleDelta: dv.getUint32(off + 4)
      });
    }
    return entries;
  }

  function readCtts(dv, box) {
    var version = dv.getUint8(box.payload);
    var count = dv.getUint32(box.start + 12);
    var entries = [];
    var off = box.start + 16;
    for (var i = 0; i < count && off + 8 <= box.end; i++, off += 8) {
      entries.push({
        sampleCount: dv.getUint32(off),
        offset: version === 1 ? dv.getInt32(off + 4) : dv.getUint32(off + 4)
      });
    }
    return entries;
  }

  function readStsz(dv, box) {
    return {
      sampleSize: dv.getUint32(box.start + 12),
      sampleCount: dv.getUint32(box.start + 16)
    };
  }

  function readElst(dv, box) {
    var version = dv.getUint8(box.payload);
    var count = dv.getUint32(box.start + 12);
    var entries = [];
    var off = box.start + 16;
    var stride = version === 1 ? 20 : 12;
    for (var i = 0; i < count && off + stride <= box.end; i++, off += stride) {
      entries.push(version === 1
        ? { duration: u64(dv, off), mediaTime: dv.getInt32(off + 12), rate: dv.getInt16(off + 16) }
        : { duration: dv.getUint32(off), mediaTime: dv.getInt32(off + 4), rate: dv.getInt16(off + 8) });
    }
    return entries;
  }

  /* ====================================================================
     Apple and Android metadata. The Android capture-fps tag is the only
     fully reliable way we ever get to un-bake a slow motion clip.
     ==================================================================== */

  function readMetadataHints(dv, moovBoxes) {
    var hints = { captureFps: null, appleFullFrameRateIntent: null, keys: [] };

    var metas = findAll(moovBoxes, "meta");
    for (var m = 0; m < metas.length; m++) {
      var kids = metas[m].children || [];
      var keysBox = null, ilstBox = null;
      for (var k = 0; k < kids.length; k++) {
        if (kids[k].type === "keys") keysBox = kids[k];
        if (kids[k].type === "ilst") ilstBox = kids[k];
      }
      if (!keysBox || !ilstBox) continue;

      // keys: full box, entry_count at +12, then per entry
      // key_size (u32, INCLUSIVE of its own 8 byte header), namespace, name
      var names = [];
      var kcount = dv.getUint32(keysBox.start + 12);
      var koff = keysBox.start + 16;
      for (var i = 0; i < kcount && koff + 8 <= keysBox.end; i++) {
        var keySize = dv.getUint32(koff);
        if (keySize < 8) break;
        var nameLen = keySize - 8;
        var s = "";
        for (var c = 0; c < nameLen; c++) s += String.fromCharCode(dv.getUint8(koff + 8 + c));
        names.push(s);
        koff += keySize;
      }
      hints.keys = hints.keys.concat(names);

      // ilst children carry a 1-based index into keys as their "type"
      var ioff = ilstBox.payload;
      while (ioff + 8 <= ilstBox.end) {
        var itemSize = dv.getUint32(ioff);
        if (itemSize < 8) break;
        var keyIndex = dv.getUint32(ioff + 4);
        var dataOff = ioff + 8;
        if (dataOff + 16 <= ilstBox.end && fourcc(dv, dataOff + 4) === "data") {
          var typeIndicator = dv.getUint32(dataOff + 8) & 0x00ffffff;
          var payloadOff = dataOff + 16;
          var payloadLen = dv.getUint32(dataOff) - 16;
          var name = names[keyIndex - 1];
          var value = null;
          if (typeIndicator === 23 && payloadLen >= 4) value = dv.getFloat32(payloadOff);
          else if (typeIndicator === 24 && payloadLen >= 8) value = dv.getFloat64(payloadOff);
          else if ((typeIndicator === 21 || typeIndicator === 22) && payloadLen >= 4) value = dv.getUint32(payloadOff);
          else if (typeIndicator === 1) {
            value = "";
            for (var q = 0; q < payloadLen; q++) value += String.fromCharCode(dv.getUint8(payloadOff + q));
          }
          if (name === "com.android.capture.fps") hints.captureFps = value;
          if (name === "com.apple.quicktime.full-frame-rate-playback-intent") hints.appleFullFrameRateIntent = value;
        }
        ioff += itemSize;
      }
    }
    return hints;
  }

  /* ====================================================================
     Rate classification
     ==================================================================== */

  function classifyRate(sttsEntries, timescale) {
    var e = sttsEntries.slice();

    // A single odd frame at the very start or end is normal, not variable
    // frame rate. Drop those before judging.
    if (e.length > 2 && e[0].sampleCount === 1) e.shift();
    if (e.length > 1 && e[e.length - 1].sampleCount === 1) e.pop();
    if (!e.length) return { klass: "UNKNOWN", fps: null };

    var total = 0, byDelta = {};
    e.forEach(function (x) {
      total += x.sampleCount;
      byDelta[x.sampleDelta] = (byDelta[x.sampleDelta] || 0) + x.sampleCount;
    });

    var deltas = Object.keys(byDelta).map(Number).sort(function (a, b) { return a - b; });
    var dominant = deltas.reduce(function (best, d) {
      return byDelta[d] > byDelta[best] ? d : best;
    }, deltas[0]);

    if (byDelta[dominant] / total >= 0.99) {
      return { klass: "CFR", fps: timescale / dominant };
    }

    // Two adjacent integer deltas is how a non-integer rate is stored, e.g.
    // 240 fps in a timescale of 600 alternates deltas of 2 and 3.
    if (deltas.length === 2 && Math.abs(deltas[1] - deltas[0]) === 1) {
      var weighted = 0;
      e.forEach(function (x) { weighted += x.sampleDelta * x.sampleCount; });
      return { klass: "COARSE_CFR", fps: timescale / (weighted / total) };
    }

    var ratio = deltas[deltas.length - 1] / deltas[0];
    if (ratio >= 4) return { klass: "RAMPED", fps: null };
    return { klass: "VFR", fps: null };
  }

  /* ====================================================================
     probe(file) — the whole timing story for a clip
     ==================================================================== */

  function probe(file) {
    var result = {
      ok: false,
      reason: null,
      timescale: null,
      T: null,
      nSamples: 0,
      rateClass: null,
      fps: null,
      captureFpsHint: null,
      fragmented: false,
      warnings: []
    };

    return walkTopLevel(file).then(function (boxes) {
      var moovBox = null, hasMoof = false;
      boxes.forEach(function (b) {
        if (b.type === "moov") moovBox = b;
        if (b.type === "moof") hasMoof = true;
      });

      if (!moovBox) {
        result.reason = "NO_MOOV";
        return result;
      }

      return sliceBuffer(file, moovBox.start, moovBox.start + moovBox.size).then(function (buf) {
        var dv = new DataView(buf);
        // Re-base: the sliced buffer starts at moovBox.start, so parse from 0.
        var tree = parseBoxes(dv, 0, buf.byteLength);
        var moov = tree[0];
        if (!moov || moov.type !== "moov") { result.reason = "NO_MOOV"; return result; }

        var moovKids = moov.children || [];

        // Fragmented files: timing lives in moof/trun, which we do not parse.
        // Browser MediaRecorder output looks like this and its mdhd duration
        // is often zero, so we reject rather than guess.
        if (hasMoof || findBox(moovKids, "mvex")) {
          result.fragmented = true;
          result.reason = "FRAGMENTED";
          return result;
        }

        var traks = findAll(moovKids, "trak");
        var vtrak = null;
        for (var i = 0; i < traks.length; i++) {
          if (isVideoTrack(dv, traks[i])) { vtrak = traks[i]; break; }
        }
        if (!vtrak) { result.reason = "NO_VIDEO_TRACK"; return result; }

        var mdhdBox = findBox(vtrak.children || [], "mdhd");
        var sttsBox = findBox(vtrak.children || [], "stts");
        var stszBox = findBox(vtrak.children || [], "stsz");
        var stz2Box = findBox(vtrak.children || [], "stz2");
        var cttsBox = findBox(vtrak.children || [], "ctts");
        var elstBox = findBox(vtrak.children || [], "elst");

        if (!mdhdBox || !sttsBox) { result.reason = "NO_TIMING_BOXES"; return result; }
        if (stz2Box && !stszBox) { result.reason = "STZ2_UNSUPPORTED"; return result; }

        var mdhd = readMdhd(dv, mdhdBox);
        var stts = readStts(dv, sttsBox);
        if (!stts.length) { result.reason = "EMPTY_STTS"; return result; }

        var stsz = stszBox ? readStsz(dv, stszBox) : null;
        var ctts = cttsBox ? readCtts(dv, cttsBox) : null;

        /* ---- build the decode timestamps ---------------------------- */

        var dts = [];
        var tick = 0;
        stts.forEach(function (e) {
          for (var i = 0; i < e.sampleCount; i++) {
            dts.push(tick);
            tick += e.sampleDelta;
          }
        });

        /* ---- apply composition offsets ------------------------------ */
        // ctts shifts presentation order. It must be ADDED to the decode
        // time, never summed into the durations.

        var pts = dts;
        if (ctts && ctts.length) {
          var offsets = [];
          ctts.forEach(function (e) {
            for (var i = 0; i < e.sampleCount; i++) offsets.push(e.offset);
          });
          pts = dts.map(function (d, i) { return d + (offsets[i] || 0); });
        }

        /* ---- edit list ---------------------------------------------- */
        // media_rate is deliberately ignored. Browsers disagree about it, and
        // a rate based slow motion marker would play differently in each one.
        // A leading trim (media_time > 0) does shift the timeline, so we
        // honour that part.

        var shift = 0;
        if (elstBox) {
          var elst = readElst(dv, elstBox);
          for (var e2 = 0; e2 < elst.length; e2++) {
            if (elst[e2].mediaTime > 0) { shift = elst[e2].mediaTime; break; }
          }
          if (elst.length > 1) {
            result.warnings.push({
              id: "TB-EDIT-LIST",
              severity: "amber",
              text: "This clip has been trimmed or has more than one segment. We are timing from each frame's own timestamp, which is right, but re-record if anything looks off."
            });
          }
        }

        var T = pts.slice().sort(function (a, b) { return a - b; })
          .map(function (t) { return (t - shift) / mdhd.timescale; });

        /* ---- sample count sanity ------------------------------------ */

        var nFromStts = T.length;
        var nSamples = nFromStts;
        if (stsz && stsz.sampleCount && stsz.sampleCount !== nFromStts) {
          nSamples = Math.min(stsz.sampleCount, nFromStts);
          T = T.slice(0, nSamples);
          result.warnings.push({
            id: "TB-04",
            severity: "amber",
            text: "This video file looks damaged or was cut off mid recording. The timing may be wrong. Record it again if you can."
          });
        }

        var rate = classifyRate(stts, mdhd.timescale);
        var hints = readMetadataHints(dv, moovKids);

        result.ok = true;
        result.timescale = mdhd.timescale;
        result.T = T;
        result.nSamples = nSamples;
        result.rateClass = rate.klass;
        result.fps = rate.fps;
        result.captureFpsHint = hints.captureFps;
        result.metadataKeys = hints.keys;
        result.containerDuration_s = mdhd.duration / mdhd.timescale;

        if (rate.klass === "VFR" || rate.klass === "RAMPED") {
          result.warnings.push({
            id: "TB-03",
            severity: "amber",
            text: "This clip's frame timing changes as it goes, which usually means an iPhone slow motion export with a speed ramp in it. We're timing from each frame's own timestamp, which is correct, but re-record with the ramp taken out for a result you can trust."
          });
        }

        return result;
      });
    }).catch(function (err) {
      result.ok = false;
      result.reason = err && err.message === "MALFORMED_CONTAINER" ? "MALFORMED" : "PARSE_FAILED";
      result.error = String(err && err.message || err);
      return result;
    });
  }

  /* ====================================================================
     Runtime cross check.

     The container says one thing. The browser's own demuxer says another.
     If they disagree by more than 1% something is changing what playback
     time means, usually an edit list being honoured differently, and we do
     not produce a number from it.
     ==================================================================== */

  function crossCheck(probeResult, videoEl) {
    var out = { ok: true, effectiveFps: null, delta: null, warnings: [] };
    if (!probeResult.ok || !videoEl.duration || !isFinite(videoEl.duration)) return out;

    out.effectiveFps = probeResult.nSamples / videoEl.duration;

    if (probeResult.fps) {
      out.delta = Math.abs(out.effectiveFps - probeResult.fps) / probeResult.fps;
      if (out.delta > 0.01) {
        out.ok = false;
        out.warnings.push({
          id: "TB-01",
          severity: "block",
          text: "The browser and the video file disagree about this clip's timing, " +
                out.effectiveFps.toFixed(1) + " against " + probeResult.fps.toFixed(1) +
                " frames per second. Something in the file is changing what playback time means, so we won't produce a jump height from it. Try re-exporting the clip from your phone."
        });
      }
    }
    return out;
  }

  /* ====================================================================
     Local rate across just the analysed window. This is what the frame rate
     gate is applied to, because a clip can be 240 fps in one place and 30 in
     another.
     ==================================================================== */

  function localRate(T, fromIndex, toIndex) {
    var diffs = [];
    for (var i = Math.max(1, fromIndex); i <= Math.min(T.length - 1, toIndex); i++) {
      diffs.push(T[i] - T[i - 1]);
    }
    if (!diffs.length) return { fps: null, period: null, iqrRatio: null };
    diffs.sort(function (a, b) { return a - b; });
    var med = diffs[Math.floor(diffs.length / 2)];
    var q1 = diffs[Math.floor(diffs.length * 0.25)];
    var q3 = diffs[Math.floor(diffs.length * 0.75)];
    return {
      fps: med > 0 ? 1 / med : null,
      period: med,
      iqrRatio: med > 0 ? (q3 - q1) / med : null
    };
  }

  /* ====================================================================
     Frame extraction.

     Seek to the MIDPOINT of a frame's display interval, not its start.
     Seeking to a boundary rounds into the previous frame in several
     browsers. The midpoint is community practice rather than anything the
     spec guarantees, which is exactly why the landing check below is
     mandatory and not optional.
     ==================================================================== */

  function once(el, evt) {
    return new Promise(function (resolve) {
      function h() { el.removeEventListener(evt, h); resolve(); }
      el.addEventListener(evt, h);
    });
  }

  function onceRvfc(video) {
    if (!video.requestVideoFrameCallback) return Promise.resolve(null);
    return new Promise(function (resolve) {
      video.requestVideoFrameCallback(function (now, meta) { resolve(meta); });
    });
  }

  function nearestIndex(T, t) {
    var lo = 0, hi = T.length - 1;
    while (lo < hi) {
      var mid = (lo + hi) >> 1;
      if (T[mid] < t) lo = mid + 1; else hi = mid;
    }
    if (lo > 0 && Math.abs(T[lo - 1] - t) <= Math.abs(T[lo] - t)) return lo - 1;
    return lo;
  }

  /**
   * Pull a range of frames into downscaled grayscale buffers.
   *
   * @param {HTMLVideoElement} video   must be in the DOM. Do not hide it with
   *        display:none, Chromium may throttle frame callbacks on hidden
   *        elements. opacity 0.01 at 1x1 px is the safe way.
   * @param {number[]} T               frame times from probe()
   * @param {number} from              first frame index
   * @param {number} to                last frame index, inclusive
   * @param {object} opts              {width, onProgress, signal}
   */
  function extractFrames(video, T, from, to, opts) {
    opts = opts || {};
    var targetW = opts.width || 320;
    var aspect = (video.videoHeight || 9) / (video.videoWidth || 16);
    var aw = targetW;
    var ah = Math.max(2, Math.round(targetW * aspect));

    var canvas = document.createElement("canvas");
    canvas.width = aw;
    canvas.height = ah;
    var ctx = canvas.getContext("2d", { willReadFrequently: true });

    var hasRvfc = typeof video.requestVideoFrameCallback === "function";
    var frames = [];
    var retries = 0;
    var invalid = 0;
    var i = from;

    function grayscale(imgData) {
      var d = imgData.data;
      var g = new Uint8Array(aw * ah);
      for (var p = 0, q = 0; p < d.length; p += 4, q++) {
        // Rec. 601 luma. Integer maths, no float, this is the hot loop.
        g[q] = (d[p] * 77 + d[p + 1] * 150 + d[p + 2] * 29) >> 8;
      }
      return g;
    }

    function grabOne(index, attempt) {
      var t = (index + 1 < T.length) ? (T[index] + T[index + 1]) / 2 : T[index] + 0.001;
      if (attempt) {
        var period = (index + 1 < T.length) ? (T[index + 1] - T[index]) : 0.004;
        t += (attempt % 2 ? 1 : -1) * 0.4 * period * Math.ceil(attempt / 2);
      }

      var seeked = once(video, "seeked");
      var rvfc = hasRvfc ? onceRvfc(video) : Promise.resolve(null);
      video.currentTime = t;

      return Promise.all([seeked, rvfc]).then(function (r) {
        var meta = r[1];
        var landedT = meta ? meta.mediaTime : T[index];

        if (meta) {
          var landed = nearestIndex(T, meta.mediaTime);
          if (landed !== index) {
            if (attempt < 3) { retries++; return grabOne(index, attempt + 1); }
            invalid++;
          }
        }

        ctx.drawImage(video, 0, 0, aw, ah);
        return {
          index: index,
          t: landedT,
          buf: grayscale(ctx.getImageData(0, 0, aw, ah)),
          verified: !!meta
        };
      });
    }

    function loop() {
      if (opts.signal && opts.signal.aborted) return Promise.resolve(null);
      if (i > to) return Promise.resolve(null);
      var idx = i++;
      return grabOne(idx, 0).then(function (f) {
        frames.push(f);
        if (opts.onProgress) opts.onProgress((frames.length) / (to - from + 1));
        return loop();
      });
    }

    return loop().then(function () {
      var warnings = [];
      var retryRate = retries / Math.max(1, frames.length);
      if (retryRate > 0.15) {
        warnings.push({
          id: "EX-02",
          severity: "amber",
          text: "This browser is having trouble landing on exact frames, so the result may be less reliable than usual. Chrome or Safari will do better."
        });
      }
      if (!hasRvfc) {
        warnings.push({
          id: "EX-03",
          severity: "amber",
          text: "This browser can't confirm which frame was captured. The numbers are still computed from the file's own timing, but we can't double check them. Chrome or Safari will give a more reliable measurement."
        });
      }
      return {
        frames: frames,
        width: aw,
        height: ah,
        path: hasRvfc ? "seek+rvfc" : "seek",
        retries: retries,
        invalid: invalid,
        warnings: warnings
      };
    });
  }

  /* ====================================================================
     Choosing an analysis resolution that fits in memory.
     ==================================================================== */

  function pickAnalysisWidth(frameCount) {
    var BUDGET = 96 * 1024 * 1024;
    var options = [480, 384, 320, 256];
    for (var i = 0; i < options.length; i++) {
      var w = options[i];
      var h = Math.round(w * 9 / 16);
      if (frameCount * w * h <= BUDGET) return w;
    }
    return 256;
  }

  var MAX_FRAMES = 2400;   // 10 seconds at 240 fps

  /* ==================================================================== */

  JumpKit.video = {
    probe: probe,
    crossCheck: crossCheck,
    localRate: localRate,
    extractFrames: extractFrames,
    pickAnalysisWidth: pickAnalysisWidth,
    nearestIndex: nearestIndex,
    MAX_FRAMES: MAX_FRAMES,

    // exposed for testing and for anyone adding the WebCodecs path later
    _internal: {
      walkTopLevel: walkTopLevel,
      parseBoxes: parseBoxes,
      classifyRate: classifyRate,
      readMetadataHints: readMetadataHints
    }
  };

})(typeof window !== "undefined" ? window : this);
