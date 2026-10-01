"""Word times for Farsi talking heads: measure the pause smear, clamp it, or transcribe with whisper.cpp's speech detector.

Whisper's word times smear around pauses: the first word after a pause starts where the pause started, and the last word before one ends late
(measured on HCTV3230: see RESEARCH-2026-10-01.md section 7.1). The planner cuts inside real silences and never across a word, and graphics are
placed on word times, so a smear moves both. Hyperframes' own transcribe passes --dtw to whisper-cli but whisper.cpp silently switches DTW off while flash attention is on (the default), and its
parser builds words from the plain token `offsets` anyway. `transcribe --source dtw` runs with --no-flash-attn so the DTW times exist (t_dtw, 10 ms units).

  python word_times.py eval  VIDEO TRANSCRIPT.json [--noise -35] [--min 0.25]      # how far off are the words around every pause?
  python word_times.py clamp VIDEO TRANSCRIPT.json --out OUT.json                  # pull every word back out of the silences
  python word_times.py words RAW.json --out transcript.json [--source offsets|dtw] # whisper-cli -ojf JSON -> the flat {text,start,end} list
  python word_times.py transcribe VIDEO --out-dir DIR [--noise -35|auto] [--no-clamp] [--source dtw|offsets] [--vad]
        # whisper-cli large-v3 on the CPU, Farsi, flash attention OFF so the DTW times exist, then every word is clamped out of the silences
        # -> DIR/whisper.json (raw) + DIR/transcript.json (the flat {text,start,end} list the planner reads). About 3 min for an 85 s clip.

Measured on HCTV3230 (13 pauses of 0.25 s or more; the planner at --min 0.40 cuts):  Hyperframes today 1 pause (0.3 s) | + clamp 3 (1.1 s) |
flash attention off, DTW 4 (1.8 s) | DTW + clamp 7 (3.4 s) | VAD + clamp 2 (1.4 s). So the default is DTW + clamp and the VAD file is not used.
An independent acoustic check (does the next word start where the sound rises 3x?): 23% today, 85% with the clamp.

Plain files in and out (UTF-8, no network). Needs ffmpeg on PATH, and whisper-cli for `transcribe`.
"""
import argparse
import json
import os
import shutil
import statistics
import subprocess
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import plan_to_clips as P  # noqa: E402

MODEL = os.path.join(os.path.expanduser("~"), ".cache", "hyperframes", "whisper", "models", "ggml-large-v3.bin")
VAD_MODEL = r"C:\Users\Amir\tools\whisper.cpp\models\ggml-silero-v5.1.2.bin"


def silence_map(video, noise, min_len):
    total = P.media_duration(video)
    if str(noise) == "auto":
        noise = P.auto_noise(video)[0]
    return [(s, e) for s, e in P.silences(video, noise, min_len, total) if s > 0.05 and e < total - 0.05], total


def load_audio(video, sr=16000):
    import numpy as np
    p = subprocess.run(["ffmpeg", "-v", "error", "-i", video, "-vn", "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"], capture_output=True)
    return np.frombuffer(p.stdout, dtype="float32"), sr


def rms(x, sr, t0, t1):
    import numpy as np
    a, b = max(0, int(t0 * sr)), min(len(x), int(t1 * sr))
    return float(np.sqrt(np.mean(x[a:b] ** 2))) + 1e-9 if b > a else 1e-9


def acoustic(words, sil, audio):
    """An independent check that does not use the silence map: does the first word after each pause start where the sound RISES (the energy in the
    50 ms after its start against the 100-20 ms before it), and does the last word before it end where the sound FALLS? Ratios of 3x or more mean yes."""
    x, sr = audio
    on, off = [], []
    for s0, s1 in sil:
        before = [w for w in words if w["start"] < s0]
        after = [w for w in words if w["end"] > s1]
        if not before or not after:
            continue
        b, a = before[-1], after[0]
        on.append(rms(x, sr, a["start"], a["start"] + 0.05) / rms(x, sr, a["start"] - 0.10, a["start"] - 0.02))
        off.append(rms(x, sr, b["end"] - 0.05, b["end"]) / rms(x, sr, b["end"] + 0.02, b["end"] + 0.10))
    return on, off


def smear(words, sil):
    """For every pause: how far INTO the silence the next word starts (early) and the previous word ends (over), in ms. Positive = off."""
    rows = []
    for s0, s1 in sil:
        before = [w for w in words if w["start"] < s0]
        after = [w for w in words if w["end"] > s1]
        if not before or not after:
            continue
        b, a = before[-1], after[0]
        rows.append(dict(at=s0, length=s1 - s0, over=(b["end"] - s0) * 1000 if b["end"] > s0 else 0.0,
                         early=(s1 - a["start"]) * 1000 if a["start"] < s1 else 0.0,
                         inside=sum(1 for w in words if w["start"] > s0 and w["end"] < s1)))
    return rows


def report(words, sil, label="", audio=None):
    rows = smear(words, sil)
    if not rows:
        print("%s no pauses to measure" % label)
        return None
    early = [r["early"] for r in rows]
    over = [r["over"] for r in rows]
    pct = lambda xs, k: sorted(xs)[min(len(xs) - 1, int(len(xs) * k))]
    ok = lambda xs: 100.0 * sum(1 for x in xs if x <= 60) / len(xs)
    print("%-22s pauses %3d | next word starts inside the pause: median %4.0f ms, p90 %4.0f, worst %4.0f, within 60 ms %3.0f%% | "
          "previous word ends inside it: median %4.0f, p90 %4.0f, worst %4.0f, within 60 ms %3.0f%% | words wholly inside a pause: %d" % (
              label, len(rows), statistics.median(early), pct(early, 0.9), max(early), ok(early),
              statistics.median(over), pct(over, 0.9), max(over), ok(over), sum(r["inside"] for r in rows)))
    if audio is not None:
        on, off = acoustic(words, sil, audio)
        good = lambda xs: 100.0 * sum(1 for v in xs if v >= 3) / len(xs)
        print("%-22s acoustic check: the next word starts where the sound rises (3x or more): %3.0f%% (median %.1fx) | "
              "the previous word ends where it falls: %3.0f%% (median %.1fx)" % ("", good(on), statistics.median(on), good(off), statistics.median(off)))
    return rows


def clamp(words, sil, pad=0.02):
    """Pull each word out of the silences: a word that starts inside a pause starts at the pause's end; a word that ends inside one ends at its start."""
    out = [dict(w) for w in words]
    for s0, s1 in sil:
        for w in out:
            if s0 < w["start"] < s1 and w["end"] > s1:
                w["start"] = round(max(s1 - pad, s0), 3)
            if w["start"] < s0 and s0 < w["end"] < s1 + 0.0001:
                w["end"] = round(min(s0 + pad, w["end"]), 3)
    for i in range(1, len(out)):  # keep them in order and non-overlapping
        if out[i]["start"] < out[i - 1]["end"]:
            out[i - 1]["end"] = round(max(out[i - 1]["start"] + 0.01, min(out[i - 1]["end"], out[i]["start"])), 3)
    for w in out:
        if w["end"] <= w["start"]:
            w["end"] = round(w["start"] + 0.04, 3)
    return out


def words_from_raw(raw, source="offsets"):
    """whisper-cli --output-json-full -> flat words, like Hyperframes' parser (a token with no leading space joins the word before it).
    source "dtw": a word starts at the DTW time of its first token (t_dtw, 10 ms units) when whisper gave one, and ends where the next word starts or
    at the last token's own end, whichever is earlier."""
    words = []
    for seg in raw.get("transcription", []):
        for tok in seg.get("tokens", []):
            raw_text = tok.get("text", "")
            text = raw_text.strip()
            if not text or text.startswith("[_") or text.startswith("[BLANK"):
                continue
            off = tok.get("offsets", {})
            t0, t1 = off.get("from", 0) / 1000.0, off.get("to", 0) / 1000.0
            dtw = tok.get("t_dtw", -1)
            dtw = dtw / 100.0 if isinstance(dtw, (int, float)) and dtw >= 0 else None
            if words and not raw_text.startswith(" "):
                words[-1]["text"] += text
                words[-1]["end_off"] = t1
                continue
            words.append(dict(text=text, start_off=t0, end_off=t1, dtw=dtw))
    for i, w in enumerate(words):
        if source == "dtw" and w["dtw"] is not None:
            start = w["dtw"]
        else:
            start = w["start_off"]
        w["start"] = start
    for i, w in enumerate(words):
        nxt = words[i + 1]["start"] if i + 1 < len(words) else None
        end = w["end_off"]
        if source == "dtw" and nxt is not None:
            end = min(end, nxt) if end > w["start"] else nxt
        w["end"] = max(end, w["start"] + 0.02)
    return [dict(text=w["text"], start=round(w["start"], 3), end=round(w["end"], 3)) for w in words]


def transcribe(video, outdir, vad=False, source="dtw", do_clamp=False, noise="-35"):
    os.makedirs(outdir, exist_ok=True)
    wav = os.path.join(outdir, "audio16k.wav")
    r = subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", video, "-vn", "-ar", "16000", "-ac", "1", "-f", "wav", wav], capture_output=True, text=True)
    if r.returncode:
        sys.exit(r.stderr[-500:])
    base = os.path.join(outdir, "whisper")
    args = [shutil.which("whisper-cli") or "whisper-cli", "--model", MODEL, "--output-json-full", "--output-file", base, "--dtw", "large.v3",
            "--suppress-nst", "--language", "fa"]
    # whisper.cpp switches DTW off when flash attention is on ("dtw_token_timestamps is not supported with flash_attn - disabling") and flash
    # attention is on by default, so `hyperframes transcribe --dtw` has never produced a DTW time here. -nfa turns it back on (about 1.4x slower).
    if source == "dtw":
        args.append("--no-flash-attn")
    if vad:
        if not os.path.exists(VAD_MODEL):
            sys.exit("the VAD model is missing: " + VAD_MODEL)
        args += ["--vad", "--vad-model", VAD_MODEL]
    args.append(wav)
    print("running:", " ".join(args), file=sys.stderr)
    p = subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if p.returncode or not os.path.exists(base + ".json"):
        sys.exit("whisper-cli failed:\n" + (p.stderr or "")[-1500:])
    raw = json.load(open(base + ".json", encoding="utf-8"))
    words = words_from_raw(raw, source)
    if do_clamp:
        sil, _ = silence_map(video, noise, 0.25)
        words = clamp(words, sil)
    out = os.path.join(outdir, "transcript.json")
    json.dump(words, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("%d words -> %s" % (len(words), out), file=sys.stderr)
    return words


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    e = sub.add_parser("eval")
    e.add_argument("video")
    e.add_argument("transcript")
    e.add_argument("--noise", default="-35", help="a dB number or 'auto'")
    e.add_argument("--min", default="0.25")
    c = sub.add_parser("clamp")
    c.add_argument("video")
    c.add_argument("transcript")
    c.add_argument("--out", required=True)
    c.add_argument("--noise", default="-35")
    c.add_argument("--min", default="0.25")
    w = sub.add_parser("words")
    w.add_argument("raw")
    w.add_argument("--out", required=True)
    w.add_argument("--source", choices=["offsets", "dtw"], default="offsets")
    t = sub.add_parser("transcribe")
    t.add_argument("video")
    t.add_argument("--out-dir", required=True)
    t.add_argument("--vad", action="store_true", help="whisper.cpp's speech detector first (measured worse than none on HCTV3230; kept for tests)")
    t.add_argument("--source", choices=["offsets", "dtw"], default="dtw")
    t.add_argument("--no-clamp", action="store_true", help="do not pull the words out of the silences")
    t.add_argument("--noise", default="-35", help="silence floor in dB for the clamp, or 'auto'")
    a = ap.parse_args()
    if a.cmd == "eval":
        sil, total = silence_map(a.video, a.noise, a.min)
        report(P.load_words(a.transcript), sil, os.path.basename(a.transcript), load_audio(a.video))
    elif a.cmd == "clamp":
        sil, _ = silence_map(a.video, a.noise, a.min)
        words = P.load_words(a.transcript)
        out = clamp(words, sil)
        json.dump(out, open(a.out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        audio = load_audio(a.video)
        report(words, sil, "before", audio)
        report(out, sil, "after the clamp", audio)
    elif a.cmd == "words":
        raw = json.load(open(a.raw, encoding="utf-8"))
        words = words_from_raw(raw, a.source)
        json.dump(words, open(a.out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print("%d words -> %s" % (len(words), a.out))
    else:
        transcribe(a.video, a.out_dir, a.vad, a.source, not a.no_clamp, a.noise)


if __name__ == "__main__":
    main()
