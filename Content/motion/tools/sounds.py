#!/usr/bin/env python3
"""sounds.py - the Motion Menu's sound samples (56: the reel's 48, then footsteps and friends, then the duck), played on the reel's own synth.

    python3 Content/motion/tools/sounds.py                          render all 56
    python3 Content/motion/tools/sounds.py --only kick,zip          render a subset (ids, comma separated)
    python3 Content/motion/tools/sounds.py --zip /tmp/sounds.zip    also zip every WAV that is on disk
    python3 Content/motion/tools/sounds.py --no-sheet               skip the waveform contact sheet

The sounds themselves are RECIPES, in sound_recipes.py: fn(t0, A), one per id. The same table is what a video's cue sheet calls
({"kind": "sound", "id": "whoosh", "t": 3.2}, see audio.py), so a sound is the same in the Menu and in a video.
This file renders each recipe as a sample. The voices, buses, cue player and house levels come from
Content/showreel/tools/audio.py, which is imported here (and never byte-compiled next to itself). For each sound: zero the
buses, clear the kick list, reseed the noise from the sound's id, play the recipe at LEAD, then mixdown():

    bus sum with A.GAINS  +  reverb send (A.make_ir(1) / (2) convolved, at GAINS["wet"])
    +  sidechain pump on bass + music (only the recipes that say "pump")  +  vacuum duck (only the recipes that say so)
    ->  32 Hz high-pass  ->  master()'s gain-staging (99.9th percentile to 0.8)  ->  A.limiter
    ->  trim where the tail falls under -60 dBFS, or where the sound hard-stops (0.35 s .. 5.0 s; shorter is padded)
    ->  3 ms fade-in, 25 ms fade-out (2 ms when the sound has already faded itself out, so its last hit stays whole)
    ->  peak to exactly -3.0 dBFS

Samples start 0.10 s in. "-60 dBFS" is measured on the finished sample, i.e. 57 dB under its peak.
Because each sound reseeds from its own id (crc32), a subset renders byte-identical to a full run.

`duck` is the one sample that is not a recipe: it shows --voice (the music ducking under a voice) with a stand-in voice, first without
the duck, then with it, through audio.py's own duck code (speech_envelope, duck_gains, prep_voice). It is 6.2 s long, so it is the one
sample allowed more than MAX_LEN (5.0 s): its own limit is DUCK_MAX_LEN, 7.0 s.

Writes (repo-relative):
    Content/motion/menu/sounds/<id>.mp3      MP3 160 kbps, 48 kHz stereo (artifacts serve .mp3 / .wav / .ogg, not .m4a)
    Content/motion/export/wav/<id>.wav       48 kHz 16-bit stereo (export/ is git-ignored on purpose)
    Content/motion/menu/sounds.json          {id: {dur, peaks[48], peak_db, rms_db}}
    Content/motion/export/sound-sheet.png    8-wide waveform contact sheet (7 rows for 56 sounds)
"""
import sys
sys.dont_write_bytecode = True           # importing audio.py must not leave a __pycache__ inside Content/showreel/

import argparse
import importlib.util
import json
import math
import subprocess
import zipfile
from pathlib import Path

import numpy as np
from scipy import signal
from scipy.io import wavfile
from scipy.ndimage import maximum_filter1d

sys.path.insert(0, str(Path(__file__).resolve().parent))
import sound_recipes as R                # the recipes: fn(t0, A) per sound, shared with the video mix (audio.py's 'sound' cue)

ROOT = Path(__file__).resolve().parents[3]
AUDIO_PY = ROOT / "Content" / "showreel" / "tools" / "audio.py"
MOTION = ROOT / "Content" / "motion"
DIR_SND = MOTION / "menu" / "sounds"
DIR_WAV = MOTION / "export" / "wav"
FILE_JSON = MOTION / "menu" / "sounds.json"
FILE_SHEET = MOTION / "export" / "sound-sheet.png"


def _load_reel_audio():
    spec = importlib.util.spec_from_file_location("showreel_audio", AUDIO_PY)
    mod = importlib.util.module_from_spec(spec)
    sys.modules["showreel_audio"] = mod  # audio.py's 'sound' cue finds its own module here (sys.modules[__name__])
    spec.loader.exec_module(mod)         # audio.py guards main(), so this only defines voices and buses
    return mod


A = _load_reel_audio()
SR, BEAT, BAR = A.SR, A.BEAT, A.BAR
LEAD = 0.10                              # every sample starts this far in
MIN_LEN, MAX_LEN = 0.35, 5.0             # seconds
PEAK_DB, TAIL_DB = -3.0, -60.0           # finished peak; where the tail is considered over
N_PEAKS = 48                             # slices in the waveform strip of sounds.json
BUSES = (A.drums, A.perc, A.bass_b, A.music, A.fx, A.rev)


# ───────────────────────────── registry and per-sound state ─────────────────────────────
class Sound:
    def __init__(self, sid, group, build):
        self.id, self.group, self.build = sid, group, build      # build() plays the sound onto the buses, returns mixdown() options


def _recipe_sound(sid):
    """A Menu sample is the recipe played at LEAD. The recipe's own options (pump, vacuum, origin) become mixdown's."""
    def build():
        o = dict(R.RECIPES[sid].opts)
        origin = o.pop("origin", 0.0)
        t0 = LEAD + origin                           # a recipe written inside bar 1 starts that far into the buffer; mixdown drops the bars before it
        R.play(sid, t0, A)                           # seeds the noise from the sound's id (R.seed_of), so a subset renders byte-identical to a full run
        if origin:
            o["origin"] = origin
        if "vacuum" in o:
            o["vacuum"] = [(t0 + a, t0 + b) for a, b in o["vacuum"]]
        return o
    return build


# `duck` is not a recipe a video can place: in a video the duck comes from --voice. It is the demonstration of it, so it has a builder of its own.
DUCK_MAX_LEN = 7.0                                   # the one sample longer than MAX_LEN (5.0 s): two phrases of speech with a groove under them
DUCK_DB = 9.0                                        # audio.py's default --duck-db
DUCK_PHRASES = [(0.35, 2.75), (3.55, 5.95)]          # the stand-in voice speaks twice, 2.4 s each
DUCK_FROM = 3.15                                     # nothing ducks before this (the gap between the phrases): without, then with


def _duck_bed(t0):
    """A steady groove for six seconds with every bus family in it (kick, claps and hats; bass; a held pad and a pluck line),
    so the duck is heard on all of them. The bar is the reel's own 'form' bar, three times over."""
    for b in range(13):
        A.drums.add(A.kick(), t0 + b * BEAT, 1.0)
    for b in range(1, 13, 2):
        A.perc.add(A.clap(), t0 + b * BEAT, .5, -.05)
    for k in range(48):
        A.perc.add(A.hat(open_=(k % 8 == 6), vel=.3 + (.12 if k % 2 else 0)), t0 + k * BEAT / 4, .3, -.3 if k % 2 else .3)
    for bar in range(3):
        for off, ln, semi in [(0, .5, 0), (.5, .25, 0), (.75, .25, 12), (1, .5, 0), (2, .5, 0), (2.5, .25, 0), (2.75, .25, 12), (3, .5, 0), (3.5, .5, 7)]:
            A.bass_b.add(A.bass_note(34 + semi, ln * BEAT * .92), t0 + (bar * 4 + off) * BEAT, .8)
    L, R = A.pad(A.CH["Bb"], 5.3, .3, .5, 1600)
    A.music.add(L, t0, .3, y=R)
    for k in range(24):
        A.music.add(A.pluck([62, 69, 65, 74, 69, 65, 72, 67][k % 8], .22, .5), t0 + k * BEAT / 2, .22, -.4 if k % 2 else .4)


def _build_duck():
    """The groove with the stand-in voice over it, first without the duck, then with it (the code path of --voice:
    A.speech_envelope, A.duck_gains, and the voice added at unity). The groove keeps the gain-staging it has on its own."""
    A.rng = np.random.default_rng(R.seed_of("duck"))
    _duck_bed(LEAD)
    alone = {}
    mixdown(info=alone, max_len=DUCK_MAX_LEN)        # the groove alone, only to learn its scale
    voice = A.prep_voice(R.standin_voice(A, DUCK_PHRASES, DUCK_MAX_LEN + .5), SR)
    env = A.speech_envelope(voice)
    env[:int(DUCK_FROM * SR)] = 0.0
    return dict(max_len=DUCK_MAX_LEN, gains=A.duck_gains(env, DUCK_DB), voice=voice, scale=alone["scale"])


SOUNDS = [Sound(sid, info.group, _recipe_sound(sid)) for sid, info in R.RECIPES.items()]
SOUNDS.insert(max(i for i, x in enumerate(SOUNDS) if x.group == "Mix tricks") + 1, Sound("duck", "Mix tricks", _build_duck))
assert len({x.id for x in SOUNDS}) == len(SOUNDS), "two sounds share an id"


def prepare():
    for b in BUSES:
        b.L[:] = 0.0
        b.R[:] = 0.0
    del A.kicks[:]


# ───────────────────────────── the mixdown ─────────────────────────────
_irs = []


def reverb_irs():
    if not _irs:
        _irs.extend((A.make_ir(1), A.make_ir(2)))
    return _irs


def mixdown(pump=False, depth=0.62, vacuum=(), origin=0.0, info=None, max_len=MAX_LEN, gains=None, voice=None, scale=None):
    """Sum the buses into one finished stereo sample (float64, shape (n, 2), peak exactly PEAK_DB).

    pump    sidechain-duck bass_b and music from A.kicks (the master()'s curve, `depth` deep)
    vacuum  [(start, hit_time), ...] everything ducks to 5 % (12 ms ramp), then the hit lands at full level
    origin  seconds of the buffer to drop from the front (the stab recipe plays inside bar 1)
    info    optional dict that receives diagnostics (raw peak, limiter gain reduction, gain-staging scale, ...)
    max_len the longest the finished sample may be, seconds (MAX_LEN; only `duck` needs more)
    gains   bus gains to use instead of A.GAINS: numbers, or per-sample curves (the duck code path hands in A.duck_gains(...))
    voice   a voice made by A.prep_voice, added on top at unity after the gain-staging and before the limiter, as the video master does
    scale   the gain-staging scale to use instead of measuring one: a sample with a voice in it keeps the scale its bed has on its own
    """
    g = A.GAINS
    M = int(round((origin + max_len + 0.5) * SR))         # nothing later than this can reach the sample
    if gains is not None:
        g = {k: (v[:M] if np.ndim(v) else v) for k, v in gains.items()}
    duck = np.ones(M)
    if pump:
        k = np.arange(int(.4 * SR)) / SR
        env = 1 - depth * np.exp(-k / .11) * (1 - np.exp(-k / .004))
        for tk in A.kicks:
            i = int(round(tk * SR))
            if i < M:
                j = min(M, i + len(env))
                duck[i:j] = np.minimum(duck[i:j], env[:j - i])
    irL, irR = reverb_irs()
    wetL = signal.fftconvolve(A.rev.L[:M], irL)[:M]
    wetR = signal.fftconvolve(A.rev.R[:M], irR)[:M]
    L = (A.drums.L[:M] * g["drums"] + A.perc.L[:M] * g["perc"] + A.bass_b.L[:M] * duck * g["bass"]
         + A.music.L[:M] * duck * g["music"] + A.fx.L[:M] * g["fx"] + wetL * g["wet"])
    R = (A.drums.R[:M] * g["drums"] + A.perc.R[:M] * g["perc"] + A.bass_b.R[:M] * duck * g["bass"]
         + A.music.R[:M] * duck * g["music"] + A.fx.R[:M] * g["fx"] + wetR * g["wet"])
    # where the sound really stops: the last non-zero sample of the sum (a hard stop, or the end of the reverb tail)
    mag = np.maximum(np.abs(L), np.abs(R))
    stop = int(np.nonzero(mag > mag.max() * 1e-9)[0][-1]) + 1
    if voice is not None:
        vmag = np.max(np.abs(voice[:M]), axis=1)
        stop = max(stop, int(np.nonzero(vmag > 1e-9)[0][-1]) + 1)
    vac = np.ones(M)
    fd = int(.012 * SR)
    for v0, v1 in vacuum:
        i0, i1 = int(round(v0 * SR)), int(round(v1 * SR))
        vac[i0:i0 + fd] = np.linspace(1, .05, fd)
        vac[i0 + fd:i1] = .05
    out = np.stack([L * vac, R * vac], 1)
    out = signal.sosfilt(A.sos("high", 32, 2), out, axis=0)[:stop]    # the filter rings after a hard stop: cut there, not after
    # Gain-stage the way the reel's master() does: the 99.9th-percentile peak goes to 0.8, so the limiter below only
    # catches true outliers. (Without it the voices' raw levels, -19 .. +8 dBFS, would decide how hard each sound is
    # squashed: the open hat went flat, the snare roll lost its crescendo.) Measured over the sound's own span, not the silence.
    a = np.max(np.abs(out), axis=1)
    if not a.max() > 1e-9:
        raise ValueError("the mix is silent")
    if scale is None:
        span = np.nonzero(a > a.max() * 10 ** ((TAIL_DB - PEAK_DB) / 20))[0]
        scale = .8 / np.percentile(np.abs(out[span[0]:span[-1] + 1]), 99.9)
    out = out * scale
    if voice is not None:
        out = out + voice[:M][:len(out)]
    raw = out
    if info is not None:
        info["scale"] = scale
    out = A.limiter(out)
    if info is not None:
        before, after = np.max(np.abs(raw), axis=1), np.max(np.abs(out), axis=1)
        live = before > 1e-4
        info["raw_peak_db"] = 20 * math.log10(max(1e-9, before.max()))
        info["limiter_gr_db"] = 20 * math.log10(max(1e-9, float(np.min(after[live] / before[live])))) if live.any() else 0.0
    out = out[int(round(origin * SR)):]
    peak = float(np.max(np.abs(out)))
    target = 10 ** (PEAK_DB / 20)
    # where does the sound end? the last 10 ms-peak-envelope value above -60 dBFS of the finished level
    env = maximum_filter1d(np.max(np.abs(out), axis=1) * (target / peak), int(.010 * SR))
    live = np.nonzero(env > 10 ** (TAIL_DB / 20))[0]
    end = int(live[-1]) + 1 if len(live) else 0
    if info is not None:
        info["natural_end_s"] = end / SR
    n = int(np.clip(end, MIN_LEN * SR, max_len * SR))
    out = out[:n].copy()
    if len(out) < n:                                                      # shorter than the minimum: pad with silence
        out = np.pad(out, ((0, n - len(out)), (0, 0)))
    n_in, n_out = int(.003 * SR), int(.025 * SR)
    out[:n_in] *= np.linspace(0, 1, n_in)[:, None]
    last = np.max(np.abs(out[-n_out:]), axis=1)
    hard = last[-int(.001 * SR):].max() > .05 * last.max()                # a hard stop, or a tail still ringing?
    n_out = n_out if hard else int(.002 * SR)                             # a sound that has already faded itself out (the last bleep of
    out[-n_out:] *= np.linspace(1, 0, n_out)[:, None]                     # 'pixels') only gets a 2 ms declick, so its final hit stays intact
    return out * (target / float(np.max(np.abs(out))))


# (the recipes themselves live in sound_recipes.py; SOUNDS is built from its table above)

# ───────────────────────────── render, measure, write ─────────────────────────────
def render(snd, info=None):
    prepare()
    opts = snd.build() or {}
    return mixdown(info=info, **opts)


def to_pcm(y):
    return np.clip(np.round(y * 32767.0), -32767, 32767).astype(np.int16)


def measure(pcm):
    y = pcm.astype(np.float64) / 32768.0
    mono = y.mean(axis=1)
    edges = np.linspace(0, len(mono), N_PEAKS + 1).astype(int)
    pk = np.array([np.max(np.abs(mono[a:b])) for a, b in zip(edges[:-1], edges[1:])])
    pk = pk / pk.max()
    return {"dur": round(len(mono) / SR, 2),
            "peaks": [round(float(v), 2) for v in pk],
            "peak_db": round(20 * math.log10(float(np.max(np.abs(y)))), 2),
            "rms_db": round(20 * math.log10(math.sqrt(float(np.mean(y ** 2)))), 1)}


_ffmpeg = []


def ffmpeg_exe():
    if not _ffmpeg:
        import imageio_ffmpeg
        _ffmpeg.append(imageio_ffmpeg.get_ffmpeg_exe())
    return _ffmpeg[0]


def encode_mp3(wav_path, mp3_path):
    subprocess.run([ffmpeg_exe(), "-y", "-hide_banner", "-loglevel", "error", "-i", str(wav_path),
                    "-vn", "-map_metadata", "-1", "-c:a", "libmp3lame", "-b:a", "160k",
                    "-ar", str(SR), "-ac", "2", "-fflags", "+bitexact", "-flags:a", "+bitexact", "-write_xing", "0",
                    str(mp3_path)], check=True)


def write_json(fresh):
    try:
        old = json.loads(FILE_JSON.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        old = {}
    merged = {s.id: fresh.get(s.id, old.get(s.id)) for s in SOUNDS if fresh.get(s.id) or old.get(s.id)}
    rows = [f"  {json.dumps(k)}: {json.dumps(v)}" for k, v in merged.items()]      # one sound per line
    FILE_JSON.write_text("{\n" + ",\n".join(rows) + "\n}\n", encoding="utf-8")


def write_zip(path):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    n = 0
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        for s in SOUNDS:
            f = DIR_WAV / f"{s.id}.wav"
            if f.exists():
                zi = zipfile.ZipInfo(f"motion-menu-sounds/{s.id}.wav", date_time=(2026, 10, 1, 0, 0, 0))
                zi.compress_type, zi.external_attr = zipfile.ZIP_DEFLATED, 0o644 << 16
                z.writestr(zi, f.read_bytes())
                n += 1
    return n


# ───────────────────────────── the contact sheet ─────────────────────────────
def make_sheet(path):
    """8-wide waveform thumbnails (7 rows for 56 sounds), id as the title. One hue (brand green) on warm paper; each thumbnail is on its
    own time axis, so its length is printed in the corner."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    paper, card, hair, ink, muted, green = "#FAF7F2", "#FFFFFF", "#E7E2D9", "#1A1A1A", "#5C5C5C", "#0E4A36"
    cols, bins = 8, 220
    rows = -(-len(SOUNDS) // cols)
    h = 1.97 * rows                                          # the height of one row stays what it was (11.8 in for six)
    fig, axes = plt.subplots(rows, cols, figsize=(20, h), dpi=100, facecolor=paper)
    fig.subplots_adjust(left=.012, right=.988, top=1 - .885 / h, bottom=.015, wspace=.07, hspace=.52)
    fig.text(.012, 1 - .447 / h, f"Motion Menu · {len(SOUNDS)} sounds", fontsize=15, fontweight="bold", color=ink, va="center")
    fig.text(.988, 1 - .447 / h, "each thumbnail is on its own time axis (length top right) · amplitude normalised to −3 dBFS peak",
             fontsize=9.5, color=muted, ha="right", va="center")
    for ax in axes.flat[len(SOUNDS):]:
        ax.axis("off")
    for ax, s in zip(axes.flat, SOUNDS):
        ax.set_facecolor(card)
        ax.set_xticks([])
        ax.set_yticks([])
        for sp in ax.spines.values():
            sp.set_color(hair)
            sp.set_linewidth(.8)
        ax.set_title(s.id, loc="left", fontsize=9.5, fontweight="bold", color=ink, pad=4)
        f = DIR_WAV / f"{s.id}.wav"
        if not f.exists():
            ax.text(.5, .5, "not rendered", ha="center", va="center", fontsize=8, color=muted, transform=ax.transAxes)
            continue
        _, w = wavfile.read(f)
        mono = w.astype(np.float64).mean(axis=1) / 32768.0
        edges = np.linspace(0, len(mono), bins + 1).astype(int)
        mn, mx = np.minimum.reduceat(mono, edges[:-1]), np.maximum.reduceat(mono, edges[:-1])
        x = np.linspace(0, 1, bins)
        ax.axhline(0, color=hair, lw=.7)
        ax.fill_between(x, mn, mx, color=green, lw=0)
        ax.set_xlim(0, 1)
        ax.set_ylim(-.78, .78)
        ax.set_title(f"{len(mono) / SR:.2f} s", loc="right", fontsize=7.5, color=muted, pad=4)
    fig.savefig(path, dpi=100, facecolor=paper)
    plt.close(fig)


# ───────────────────────────── CLI ─────────────────────────────
def main():
    ap = argparse.ArgumentParser(description="Render the Motion Menu's sound samples (see the module docstring).")
    ap.add_argument("--only", metavar="ID,ID", help="render just these ids")
    ap.add_argument("--zip", metavar="PATH", help="also write a zip of every WAV that is on disk")
    ap.add_argument("--no-sheet", action="store_true", help="skip the waveform contact sheet")
    args = ap.parse_args()
    by_id = {s.id: s for s in SOUNDS}
    todo = SOUNDS
    if args.only:
        ids = list(dict.fromkeys(i.strip() for i in args.only.split(",") if i.strip()))
        bad = [i for i in ids if i not in by_id]
        if bad:
            ap.error(f"unknown id(s): {', '.join(bad)}  (valid: {', '.join(by_id)})")
        todo = [by_id[i] for i in ids]
    for d in (DIR_SND, DIR_WAV, FILE_JSON.parent, FILE_SHEET.parent):
        d.mkdir(parents=True, exist_ok=True)
    fresh, group = {}, None
    for snd in todo:
        if snd.group != group:
            group = snd.group
            print(f"\n{group}")
        info = {}
        pcm = to_pcm(render(snd, info))
        wav = DIR_WAV / f"{snd.id}.wav"
        wavfile.write(wav, SR, pcm)
        encode_mp3(wav, DIR_SND / f"{snd.id}.mp3")
        fresh[snd.id] = m = measure(pcm)
        print(f"  {snd.id:11s} {m['dur']:5.2f} s   peak {m['peak_db']:6.2f} dB   rms {m['rms_db']:6.1f} dB"
              f"   (limiter {info['limiter_gr_db']:5.1f} dB)")
    write_json(fresh)
    print(f"{len(todo)} sample(s) -> {DIR_SND.relative_to(ROOT)}/*.mp3, {DIR_WAV.relative_to(ROOT)}/*.wav, {FILE_JSON.relative_to(ROOT)}")
    if args.zip:
        print(f"{write_zip(args.zip)} WAV(s) -> {args.zip}")
    if not args.no_sheet:
        make_sheet(FILE_SHEET)
        print(f"sheet -> {FILE_SHEET.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
