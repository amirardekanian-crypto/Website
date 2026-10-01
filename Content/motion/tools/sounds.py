#!/usr/bin/env python3
"""sounds.py - the Motion Menu's 48 sound samples, played on the reel's own synth.

    python3 Content/motion/tools/sounds.py                          render all 48
    python3 Content/motion/tools/sounds.py --only kick,zip          render a subset (ids, comma separated)
    python3 Content/motion/tools/sounds.py --zip /tmp/sounds.zip    also zip every WAV that is on disk
    python3 Content/motion/tools/sounds.py --no-sheet               skip the waveform contact sheet

Every sample is its own little mix. The voices, buses, cue player and house levels come from
Content/showreel/tools/audio.py, which is imported and never edited (and never byte-compiled next to
itself). For each sound: zero the buses, clear the kick list, reseed the noise from the sound's id, play
the recipe, then mixdown():

    bus sum with A.GAINS  +  reverb send (A.make_ir(1) / (2) convolved, at GAINS["wet"])
    +  sidechain pump on bass + music (only the recipes that say "pump")  +  vacuum duck (only the recipes that say so)
    ->  32 Hz high-pass  ->  master()'s gain-staging (99.9th percentile to 0.8)  ->  A.limiter
    ->  trim where the tail falls under -60 dBFS, or where the sound hard-stops (0.35 s .. 5.0 s; shorter is padded)
    ->  3 ms fade-in, 25 ms fade-out (2 ms when the sound has already faded itself out, so its last hit stays whole)
    ->  peak to exactly -3.0 dBFS

Samples start 0.10 s in. "-60 dBFS" is measured on the finished sample, i.e. 57 dB under its peak.
Because each sound reseeds from its own id (crc32), a subset renders byte-identical to a full run.

Writes (repo-relative):
    Content/motion/menu/sounds/<id>.m4a      AAC-LC 128 kbps, 48 kHz stereo, +faststart
    Content/motion/export/wav/<id>.wav       48 kHz 16-bit stereo (export/ is git-ignored on purpose)
    Content/motion/menu/sounds.json          {id: {dur, peaks[48], peak_db, rms_db}}
    Content/motion/export/sound-sheet.png    8 x 6 waveform contact sheet
"""
import sys
sys.dont_write_bytecode = True           # importing audio.py must not leave a __pycache__ inside Content/showreel/

import argparse
import importlib.util
import json
import math
import subprocess
import zipfile
import zlib
from pathlib import Path

import numpy as np
from scipy import signal
from scipy.io import wavfile
from scipy.ndimage import maximum_filter1d

ROOT = Path(__file__).resolve().parents[3]
AUDIO_PY = ROOT / "Content" / "showreel" / "tools" / "audio.py"
MOTION = ROOT / "Content" / "motion"
DIR_M4A = MOTION / "menu" / "sounds"
DIR_WAV = MOTION / "export" / "wav"
FILE_JSON = MOTION / "menu" / "sounds.json"
FILE_SHEET = MOTION / "export" / "sound-sheet.png"


def _load_reel_audio():
    spec = importlib.util.spec_from_file_location("showreel_audio", AUDIO_PY)
    mod = importlib.util.module_from_spec(spec)
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
        self.id, self.group, self.build = sid, group, build


SOUNDS = []
_state = {"seed": 0}


def sound(sid, group):
    def register(fn):
        SOUNDS.append(Sound(sid, group, fn))
        return fn
    return register


def seed_of(sid):
    return 0x6D6F7469 ^ zlib.crc32(sid.encode())          # stable across runs, machines and Python versions


def reseed(salt=0):
    """A.rng is the module global that A.noise() reads; the voices pick it up at call time."""
    A.rng = np.random.default_rng(_state["seed"] + salt)


def prepare(sid):
    for b in BUSES:
        b.L[:] = 0.0
        b.R[:] = 0.0
    del A.kicks[:]
    _state["seed"] = seed_of(sid)
    reseed()


def cue(kind, t, **kw):
    A.play_cue(dict(t=t, kind=kind, **kw))


# ───────────────────────────── the mixdown ─────────────────────────────
_irs = []


def reverb_irs():
    if not _irs:
        _irs.extend((A.make_ir(1), A.make_ir(2)))
    return _irs


def mixdown(pump=False, depth=0.62, vacuum=(), origin=0.0, info=None):
    """Sum the buses into one finished stereo sample (float64, shape (n, 2), peak exactly PEAK_DB).

    pump    sidechain-duck bass_b and music from A.kicks (the master()'s curve, `depth` deep)
    vacuum  [(start, hit_time), ...] everything ducks to 5 % (12 ms ramp), then the hit lands at full level
    origin  seconds of the buffer to drop from the front (the stab recipe plays inside bar 1)
    info    optional dict that receives diagnostics (raw peak, limiter gain reduction, ...)
    """
    g = A.GAINS
    M = int(round((origin + MAX_LEN + 0.5) * SR))         # nothing later than this can reach the sample
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
    span = np.nonzero(a > a.max() * 10 ** ((TAIL_DB - PEAK_DB) / 20))[0]
    out = out * (.8 / np.percentile(np.abs(out[span[0]:span[-1] + 1]), 99.9))
    raw = out
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
    n = int(np.clip(end, MIN_LEN * SR, MAX_LEN * SR))
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


# ───────────────────────────── the 48 recipes ─────────────────────────────
# A recipe plays onto the buses and returns mixdown() options (or nothing).

# DRUMS
@sound("kick", "Drums")
def _():
    for t in (LEAD, LEAD + BEAT):
        A.drums.add(A.kick(), t, 1.0)


@sound("clap", "Drums")
def _():
    for t in (LEAD, LEAD + BEAT):
        A.perc.add(A.clap(), t, 0.5, 0.05)


@sound("snap", "Drums")
def _():
    for t in (LEAD, LEAD + BEAT):
        A.perc.add(A.tick(1.2, 1800, 5200), t, 0.8, 0.1)
        A.perc.add(A.clap(), t, 0.22, 0.1)


@sound("hat", "Drums")
def _():
    for k in range(4):
        A.perc.add(A.hat(vel=0.5), LEAD + k * BEAT / 2, 0.3, 0.3 if k % 2 == 0 else -0.3)


@sound("sizzle", "Drums")
def _():
    A.perc.add(A.hat(open_=True, vel=0.8), LEAD, 0.3, 0.3)
    A.perc.add(A.hat(vel=0.8), LEAD + BEAT, 0.3, -0.3)


@sound("snare-roll", "Drums")
def _():
    slot = BEAT / 8
    for k in range(16):
        A.perc.add(A.snare(180 + 6 * k, 0.22), LEAD + k * slot, 0.12 + 0.5 * (k / 15) ** 1.6, 0)
    A.perc.add(A.snare(180 + 6 * 16, 0.3), LEAD + 16 * slot, 0.95, 0)       # the final, louder one, a slot after the last


@sound("thump", "Drums")
def _():
    for t in (LEAD, LEAD + BEAT):
        A.drums.add(A.thump(95, 46, 0.4, 0.13), t, 0.55)
        A.perc.add(A.tick(1.0, 1500, 6000), t, 0.3)


# LOW END
@sound("groove", "Low end")
def _():
    for b in range(4):
        A.kick_at(LEAD + b * BEAT)                                           # kick_at also logs the time for the pump
    for off, ln, semi in [(0, .5, 0), (.75, .25, 12), (1, .5, 0), (1.75, .25, 12), (2, .5, 0),
                          (2.5, .5, 3), (3, .5, 0), (3.5, .25, 7), (3.75, .25, 5)]:
        A.bass_b.add(A.bass_note(38 + semi, ln * BEAT * 0.92), LEAD + off * BEAT, 0.8)
    return dict(pump=True)


@sound("undertow", "Low end")
def _():
    t = A.T(BAR + .4)
    drone = np.sin(2 * np.pi * A.midi(26) * t) * np.minimum(1, t / 1.6) ** 2 * .55
    A.bass_b.add(A.lp(drone, 120), LEAD, .45)


@sound("wobble", "Low end")
def _():
    t = A.T(BAR)
    lfo = .55 + .45 * np.sin(2 * np.pi * (A.BPM / 60 * 2) * t)
    wob = A.lp(np.sin(2 * np.pi * A.midi(29) * t) + .35 * np.sin(2 * np.pi * A.midi(41) * t), 220, 2) * lfo * np.minimum(1, t / .5)
    A.bass_b.add(wob, LEAD, .4)


# CHORDS AND PADS
@sound("cushion", "Chords and pads")
def _():
    L, R = A.pad(A.CH["Dm"], 2.0, .35, .5, 1400)
    A.music.add(L, LEAD, .3, y=R)


@sound("stab", "Chords and pads")
def _():
    # chord_for(t) reads the chord from t // BAR: play inside bar index 1 (the Dm bar), then drop that bar from the front
    for t in (BAR + LEAD, BAR + LEAD + BEAT):
        cue("stab", t, i=0, amp=0.6)
    return dict(origin=BAR)


@sound("staircase", "Chords and pads")
def _():
    for k in range(8):
        cue("stab", LEAD + k * BEAT / 2, i=k, rise=1)


@sound("last-word", "Chords and pads")
def _():
    # NB audio.py's 'chord' branch has its pad's music.add / rev.add inside a trailing '#' comment, so as the
    # reel stands this cue is the three bells only. Rendered through play_cue as specified: fix audio.py and a re-run picks the pad up.
    cue("chord", LEAD, dur=1.4)


# NOTES AND BELLS
@sound("pluck", "Notes and bells")
def _():
    for n, t, pan in zip((74, 77, 81), (LEAD, LEAD + .30, LEAD + .60), (-.3, 0, .3)):
        x = A.pluck(n, .3, 1.0)
        A.music.add(x, t, .5, pan)
        A.rev.add(x, t, .15, pan)                                            # "a small reverb send"


@sound("run", "Notes and bells")
def _():
    for start in (LEAD, LEAD + .9):
        for k in range(8):
            cue("arp", start + k * .035, k=k)


@sound("bell", "Notes and bells")
def _():
    x = A.bell(81, 2.0, 0.9)
    A.fx.add(x, LEAD, .3)
    A.rev.add(x, LEAD, .4)


@sound("chime", "Notes and bells")
def _():
    cue("chime", LEAD)


@sound("ping", "Notes and bells")
def _():
    cue("ping", LEAD, i=0)
    cue("ping", 0.60, i=1)


@sound("knock", "Notes and bells")
def _():
    cue("land", LEAD, i=2)
    cue("land", 0.55, i=2)


@sound("roll-call", "Notes and bells")
def _():
    cue("slam", LEAD, n=6)


@sound("bubble", "Notes and bells")
def _():
    for k in range(7):
        cue("ui", LEAD + k * .04, i=k)
    cue("ui", 0.9, i=3)


@sound("boop", "Notes and bells")
def _():
    cue("blip", LEAD, pitch=0, dur=0.18)
    cue("blip", 0.55, pitch=2, dur=0.3)


@sound("plink", "Notes and bells")
def _():
    for k in range(3):
        cue("tick", LEAD + k * .08, i=k)


# SWEEPS AND BUILDS
@sound("riser", "Sweeps and builds")
def _():
    x = A.riser(1.2, 300, 10000, 0.9, (A.midi(62), A.midi(86)))             # it ends abruptly, on purpose
    A.fx.add(x, LEAD, .4)
    A.rev.add(x, LEAD, .12)


@sound("rush", "Sweeps and builds")
def _():
    cue("sweep", LEAD, dur=0.4775)


@sound("whoosh", "Sweeps and builds")
def _():
    cue("whoosh", LEAD, dir="in", dur=0.5)


@sound("swish", "Sweeps and builds")
def _():
    cue("whoosh", LEAD, dir="pan", dur=0.35)


@sound("zip", "Sweeps and builds")
def _():
    cue("zip", LEAD, dur=0.5)


@sound("inhale", "Sweeps and builds")
def _():
    # the 'zoom' transition: the voice call from play_cue's 'cut' branch, made directly so the sample does not depend
    # on how the cue sheet keys the cut type (that key has changed once already)
    A.fx.add(A.riser(.17, 500, 7000, 1.0), LEAD, .3)


@sound("scanner", "Sweeps and builds")
def _():
    cue("scan", LEAD, dur=0.42)


@sound("glassline", "Sweeps and builds")
def _():
    cue("draw", LEAD, dur=0.5)


@sound("slide", "Sweeps and builds")
def _():
    cue("slide", LEAD, dur=0.26)


# HITS AND EXPLOSIONS
@sound("boom", "Hits and explosions")
def _():
    A.fx.add(A.boom(1.5), LEAD, .42)


@sound("crash", "Hits and explosions")
def _():
    x = A.crash(2.4)
    A.fx.add(x, LEAD, .35)
    A.rev.add(x, LEAD, .25)


@sound("blast", "Hits and explosions")
def _():
    cue("burst", LEAD, dur=0.6)


@sound("lub-dub", "Hits and explosions")
def _():
    cue("pulse", LEAD)
    cue("pulse", 1.0)


def _drop(hit, vacuum_ms=None):
    """riser, (vacuum,) then the hit at `hit` seconds: kick + boom + crash, exactly as the reel's drop does it."""
    cue("riser", hit - .75, dur=0.6)
    A.kick_at(hit)                                   # on the kick, so the 'hit' cue adds only boom + crash (has_kick), as in the reel
    cue("hit", hit, amp=1.0, drop=1)
    return [(hit - vacuum_ms / 1000, hit)] if vacuum_ms else []


@sound("drop", "Hits and explosions")
def _():
    return dict(vacuum=_drop(0.95, vacuum_ms=75))


# CLICKS AND GLITCHES  (the transition family: voice calls, see 'inhale')
@sound("click", "Clicks and glitches")
def _():
    cue("click", LEAD, i=0)
    cue("click", 0.50, i=0)


@sound("ticks", "Clicks and glitches")
def _():
    cue("ticks", LEAD, dur=0.45)


@sound("clatter", "Clicks and glitches")
def _():
    for t in (LEAD, LEAD + .7):
        for j in range(8):
            A.fx.add(A.tick(.8, 2500, 8000), t + j * .018, .3, -.6 + j * .17)


@sound("pixels", "Clicks and glitches")
def _():
    for t in (LEAD, LEAD + .6):
        for j in range(6):
            A.fx.add(A.blip(A.midi(A.PENT[int(A.hash_(j, 5) * 8)] + 12), .03, 1.0, .5), t + j * .026, .22, -.5 + j * .2)


@sound("peep", "Clicks and glitches")
def _():
    for t in (LEAD, LEAD + .5):
        x = A.blip(500, .16, 3.2, .7)
        A.fx.add(x, t, .25)
        A.rev.add(x, t, .2)


@sound("stutter", "Clicks and glitches")
def _():
    for n, t in enumerate((LEAD, LEAD + .6)):
        reseed(n)                                    # a different burst each time
        A.fx.add(A.glitch(.16), t, .4)


@sound("flup", "Clicks and glitches")
def _():
    for t in (LEAD, LEAD + .5):
        A.fx.add(A.blip(700, .12, .3, .8), t, .3)


# MIX TRICKS
@sound("vacuum", "Mix tricks")
def _():
    # the same riser + big hit twice, 2.1 s apart: first without the vacuum (hit at 1.1 s), then with it (hit at 3.2 s)
    _drop(1.1)
    return dict(vacuum=_drop(1.1 + 2.1, vacuum_ms=75))


@sound("pump", "Mix tricks")
def _():
    L, R = A.pad(A.CH["Dm"], 2.2, .1, .5, 2400)
    A.music.add(L, LEAD, .3, y=R)
    A.bass_b.add(A.bass_note(38, 2.0), LEAD, .8)
    for b in range(5):                               # a kick on every beat while the pad is held
        A.kick_at(LEAD + b * BEAT)
    return dict(pump=True, depth=.62)


@sound("space", "Mix tricks")
def _():
    x = A.pluck(74, .3, 1.0)
    A.music.add(x, LEAD, .5)                         # dry
    A.music.add(x, 1.4, .5)                          # the same note, wet
    A.rev.add(x, 1.4, .9)


assert len(SOUNDS) == 48 and len({s.id for s in SOUNDS}) == 48, "the menu has exactly 48 sounds"


# ───────────────────────────── render, measure, write ─────────────────────────────
def render(snd, info=None):
    prepare(snd.id)
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


def encode_m4a(wav_path, m4a_path):
    subprocess.run([ffmpeg_exe(), "-y", "-hide_banner", "-loglevel", "error", "-i", str(wav_path),
                    "-vn", "-map_metadata", "-1", "-c:a", "aac", "-profile:a", "aac_low", "-b:a", "128k",
                    "-ar", str(SR), "-ac", "2", "-fflags", "+bitexact", "-flags:a", "+bitexact",
                    "-movflags", "+faststart", str(m4a_path)], check=True)


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
    """8 x 6 waveform thumbnails, id as the title. One hue (brand green) on warm paper; each thumbnail is on its
    own time axis, so its length is printed in the corner."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    paper, card, hair, ink, muted, green = "#FAF7F2", "#FFFFFF", "#E7E2D9", "#1A1A1A", "#5C5C5C", "#0E4A36"
    cols, rows, bins = 8, 6, 220
    fig, axes = plt.subplots(rows, cols, figsize=(20, 11.8), dpi=100, facecolor=paper)
    fig.subplots_adjust(left=.012, right=.988, top=.925, bottom=.015, wspace=.07, hspace=.52)
    fig.text(.012, .962, "Motion Menu · 48 sounds", fontsize=15, fontweight="bold", color=ink, va="center")
    fig.text(.988, .962, "each thumbnail is on its own time axis (length top right) · amplitude normalised to −3 dBFS peak",
             fontsize=9.5, color=muted, ha="right", va="center")
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
    for d in (DIR_M4A, DIR_WAV, FILE_JSON.parent, FILE_SHEET.parent):
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
        encode_m4a(wav, DIR_M4A / f"{snd.id}.m4a")
        fresh[snd.id] = m = measure(pcm)
        print(f"  {snd.id:11s} {m['dur']:5.2f} s   peak {m['peak_db']:6.2f} dB   rms {m['rms_db']:6.1f} dB"
              f"   (limiter {info['limiter_gr_db']:5.1f} dB)")
    write_json(fresh)
    print(f"{len(todo)} sample(s) -> {DIR_M4A.relative_to(ROOT)}/*.m4a, {DIR_WAV.relative_to(ROOT)}/*.wav, {FILE_JSON.relative_to(ROOT)}")
    if args.zip:
        print(f"{write_zip(args.zip)} WAV(s) -> {args.zip}")
    if not args.no_sheet:
        make_sheet(FILE_SHEET)
        print(f"sheet -> {FILE_SHEET.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
