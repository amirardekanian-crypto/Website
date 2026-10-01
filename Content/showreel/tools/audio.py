#!/usr/bin/env python3
"""audio.py — synthesizes the reel's soundtrack from the cue sheet the picture exports.

    python3 tools/render.js --cues export/cues.json          (node: dumps every hit the picture makes)
    python3 tools/audio.py export/cues.json export/soundtrack.wav [--plot export/audio-check.png]

128 BPM, 4/4, 8 bars = exactly 15.000 s, D minor (everything lives in F-major-pentatonic over Dm / Bb / F / C).
Two layers:
  · the MUSIC is written per bar (kick, clap, hats, bass, pad, arps) and follows the picture's structure:
    bar 1 point · 2 drop · 3 form · 4 depth · 5 flow (breakdown) · 6 interface · 7 rhythm (rising stabs) · 8 lockup
  · the SOUND DESIGN is read from the cue sheet, so every slam, landing, click, cut and whoosh sits on its frame
Pure numpy/scipy: no samples, nothing to license.

Also for other videos (Content/motion):
  · a cue {"t": 3.2, "kind": "sound", "id": "whoosh"} plays any sound of the Motion Menu by name, on these same voices and buses
    (the table is Content/motion/tools/sound_recipes.py; optional props "gain", "pan", "seed"; see sound_cue)
  · --voice VOICE.wav [--duck-db 9] [--duck-release 0.25] lays a voice on top and ducks the track under it: the music, bass and
    reverb by --duck-db, the drums, percussion and fx by half as much, the voice added at unity before the limiter
    (see prep_voice, speech_envelope, duck_gains). Without --voice the track is exactly what it was.
  The track is 15 s and carries the reel's own 8-bar music unless told otherwise: --dur SECONDS sets the length, --no-music leaves the music out.
"""
import json, math, sys, argparse
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
DUR = 15.0                                                   # the reel is 15 s. Another video: --dur 42 on the command line, or REEL_AUDIO_DUR=42 in the environment
if __import__('os').environ.get('REEL_AUDIO_DUR'): DUR = float(__import__('os').environ['REEL_AUDIO_DUR'])
for _i, _a in enumerate(sys.argv[:-1]):                      # read before the buses are sized (they are made when this file is loaded)
    if _a == '--dur': DUR = float(sys.argv[_i + 1])
N = int(round(DUR * SR))
BPM = 128
BEAT = 60.0 / BPM
BAR = BEAT * 4
rng = np.random.default_rng(20260930)

# ───────────────────────────── helpers ─────────────────────────────
def midi(n): return 440.0 * 2 ** ((n - 69) / 12)
def T(dur): return np.arange(int(round(dur * SR))) / SR
def noise(n): return rng.standard_normal(n)
def sos(kind, fc, order=4):
    return signal.butter(order, fc, kind, fs=SR, output='sos')
def lp(x, fc, order=4): return signal.sosfilt(sos('low', min(fc, SR * .45), order), x)
def hp(x, fc, order=4): return signal.sosfilt(sos('high', fc, order), x)
def bp(x, lo, hi, order=2): return signal.sosfilt(sos('band', [lo, min(hi, SR * .45)], order), x)
def fade(x, a=0.002, r=0.01):
    x = x.copy(); na, nr = int(a * SR), int(r * SR)
    if na: x[:na] *= np.linspace(0, 1, na)
    if nr: x[-nr:] *= np.linspace(1, 0, nr)
    return x
def sweep_bp(x, f0, f1, q=1.4, blocks=64):
    """band-pass whose centre glides f0 -> f1 (exponentially) across x, filter state carried between blocks"""
    n = len(x); out = np.zeros(n); edges = np.linspace(0, n, blocks + 1).astype(int); zi = None
    for b in range(blocks):
        fc = f0 * (f1 / f0) ** ((b + .5) / blocks)
        s = sos('band', [max(40, fc / q), min(SR * .45, fc * q)], 2)
        if zi is None or zi.shape[0] != s.shape[0]: zi = np.zeros((s.shape[0], 2))
        out[edges[b]:edges[b + 1]], zi = signal.sosfilt(s, x[edges[b]:edges[b + 1]], zi=zi)
    return out
def saw(f, t, kmax=None):
    """band-limited saw by additive synthesis"""
    k = np.arange(1, int(min(kmax or 60, (SR * .45) // f)) + 1)
    return (np.sin(2 * np.pi * f * np.outer(t, k)) @ (1.0 / k)) * (2 / np.pi)
def pan_gain(p): return math.cos((p + 1) * math.pi / 4) * 1.4142, math.sin((p + 1) * math.pi / 4) * 1.4142

class Bus:
    def __init__(self): self.L = np.zeros(N); self.R = np.zeros(N)
    def add(self, x, t, g=1.0, pan=0.0, y=None):
        i = int(round(t * SR))
        if i >= N or i + len(x) <= 0: return
        if i < 0: x = x[-i:]; y = y[-i:] if y is not None else None; i = 0
        j = min(N, i + len(x)); x = x[:j - i]
        if y is not None:
            self.L[i:j] += x * g; self.R[i:j] += y[:j - i] * g
        else:
            l, r = pan_gain(pan); self.L[i:j] += x * g * l; self.R[i:j] += x * g * r

def _add_lr(bus, x, t, gl, gr):
    """mix mono x into a bus with per-sample left/right gain envelopes (arrays or scalars) — for moving sounds"""
    i = int(round(t * SR))
    if i >= N: return
    j = min(N, i + len(x)); n = j - i
    gl = np.broadcast_to(gl, (len(x),))[:n]; gr = np.broadcast_to(gr, (len(x),))[:n]
    bus.L[i:j] += x[:n] * gl; bus.R[i:j] += x[:n] * gr

drums, perc, bass_b, music, fx, rev = Bus(), Bus(), Bus(), Bus(), Bus(), Bus()      # drums = kicks/thumps, perc = claps/hats/snares/ticks
kicks = []                                              # kick times, for the sidechain

# ───────────────────────────── voices ─────────────────────────────
def kick(length=.5):
    t = T(length)
    f = 52 + 105 * np.exp(-t / .024)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t / .12)
    click = hp(noise(len(t)), 2500) * np.exp(-t / .004) * .5
    return np.tanh(1.7 * (body + click)) * .95
def thump(f0=95, f1=42, length=.4, decay=.14):
    t = T(length); f = f1 + (f0 - f1) * np.exp(-t / .03)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / decay)
def clap(length=.35):
    t = T(length); x = np.zeros(len(t))
    for d in (0, .011, .022): i = int(d * SR); x[i:] += noise(len(t) - i) * np.exp(-t[:len(t) - i] / .01)
    tail = noise(len(t)) * np.exp(-t / .09) * .55
    return bp(x + tail, 900, 3200) * 1.6
def snare(f=190, length=.3):
    t = T(length)
    n = bp(noise(len(t)), 1400, 7500) * np.exp(-t / .11)
    tone = np.sin(2 * np.pi * np.cumsum(f * (1 + .6 * np.exp(-t / .02))) / SR) * np.exp(-t / .07)
    return (n * .9 + tone * .6)
def hat(open_=False, vel=1.0):
    t = T(.25 if open_ else .06)
    return hp(noise(len(t)), 7000) * np.exp(-t / (.11 if open_ else .018)) * vel * 1.8
def bass_note(note, dur, vel=1.0):
    f = midi(note); t = T(dur + .08)
    x = saw(f, t, 24) * .9 + np.sin(2 * np.pi * f * t) * .55 + np.sin(np.pi * f * t) * .12
    x = np.tanh(1.5 * x); x = lp(x, 900, 2)
    e = np.minimum(1, t / .006) * np.exp(-np.maximum(0, t - dur) / .035) * (1 - .25 * np.minimum(1, t / dur))
    return x * e * vel
def stab(notes, dur=.3, bright=1.0, vel=1.0):
    t = T(dur + .3); L_ = np.zeros(len(t)); R_ = np.zeros(len(t))
    for k, n in enumerate(notes):
        f = midi(n)
        a = saw(f * 2 ** (-7 / 1200), t, 30) + saw(f * 2 ** (7 / 1200), t, 30)
        (L_ if k % 2 == 0 else R_)[:] += a * .5; (R_ if k % 2 == 0 else L_)[:] += a * .22
    e = np.minimum(1, t / .004) * np.exp(-t / (dur * .7))
    cutoff = 450 + 5500 * bright * np.exp(-t / .07)
    out = []
    for ch in (L_, R_):
        y = np.zeros(len(ch)); zi = np.zeros((1, 2)); step = 256
        for s0 in range(0, len(ch), step):
            fc = float(cutoff[min(len(ch) - 1, s0)]); sx = sos('low', min(SR * .45, fc), 2)
            y[s0:s0 + step], zi = signal.sosfilt(sx, ch[s0:s0 + step], zi=zi)
        out.append(y * e)
    return out[0] * vel, out[1] * vel
def pad(notes, dur, att=.5, rel=.8, bright=1800):
    t = T(dur + rel); out = []
    notes = [n if n >= 50 else n + 12 for n in notes]            # keep pads out of the bass register
    for side in (0, 1):
        x = np.zeros(len(t))
        for n in notes:
            f = midi(n)
            for dt in (-9, 0, 9):
                x += saw(f * 2 ** ((dt + (4 if side else -4)) / 1200), t, 18)
        x = hp(lp(x, bright, 2), 160, 2) / (len(notes) * 1.5)
        e = np.minimum(1, t / att) * np.exp(-np.maximum(0, t - dur) / (rel / 4))
        out.append(x * e)
    return out[0], out[1]
def pluck(note, dur=.3, vel=1.0, bright=1.0):
    f = midi(note); t = T(dur + .05)
    x = (np.sin(2 * np.pi * f * t) * np.exp(-t / (dur * .55)) + .45 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / (dur * .28)) * bright
         + .2 * np.sin(2 * np.pi * 3.01 * f * t) * np.exp(-t / (dur * .15)) * bright)
    x += hp(noise(len(t)), 3000) * np.exp(-t / .005) * .12
    return fade(x * vel, .001, .02)
def bell(note, dur=2.0, vel=1.0):
    f = midi(note); t = T(dur)
    parts = [(1, 1, 1.0), (2.01, .5, .55), (2.76, .42, .38), (4.17, .22, .2), (5.43, .14, .12), (8.93, .07, .06)]
    x = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / (dur * dk)) for r, a, dk in parts)
    return fade(x * vel * .5, .001, .05)
def logdrum(note, vel=1.0, length=.35):
    f = midi(note); t = T(length)
    fr = f * (1 + .14 * np.exp(-t / .03))
    x = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t / .13) + .3 * np.sin(4 * np.pi * np.cumsum(fr) / SR) * np.exp(-t / .06)
    x += hp(noise(len(t)), 2500) * np.exp(-t / .004) * .25
    return x * vel
def boom(dur=1.4, f0=64, f1=30):
    t = T(dur); f = f1 + (f0 - f1) * np.exp(-t / .12)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (dur * .35))
    x += lp(noise(len(t)), 160, 2) * np.exp(-t / .18) * .8
    return np.tanh(1.3 * x)
def crash(dur=2.0):
    t = T(dur); return hp(noise(len(t)), 3800) * np.exp(-t / (dur * .3)) * .5
def riser(dur, f0=300, f1=9000, gain=1.0, tone=None):
    t = T(dur); u = t / dur
    x = sweep_bp(noise(len(t)), f0, f1, 1.8) * (u ** 2.2) * 2.4
    if tone:
        fr = tone[0] * (tone[1] / tone[0]) ** u
        x += np.sin(2 * np.pi * np.cumsum(fr) / SR) * (u ** 2) * .5
    return fade(x * gain, .004, .004)
def whoosh(dur, up=True, f0=400, f1=6000, gain=1.0):
    t = T(dur); u = t / dur
    a, b = (f0, f1) if up else (f1, f0)
    env = np.sin(np.pi * np.clip(u, 0, 1)) ** 1.6
    return sweep_bp(noise(len(t)), a, b, 1.6) * env * 2.6 * gain
def blip(f, dur=.12, glide=1.15, vel=1.0):
    t = T(dur); fr = f * (1 + (glide - 1) * t / dur)
    return fade(np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t / (dur * .6)) * vel, .001, .01)
def tick(vel=1.0, lo=3000, hi=8000):
    t = T(.012); return bp(noise(len(t)), lo, hi) * np.exp(-t / .003) * vel * 3
def glitch(dur=.15):
    t = T(dur); x = np.zeros(len(t)); i = 0
    while i < len(t):
        n = int(rng.integers(120, 900)); seg = noise(n) if rng.random() < .6 else np.sign(np.sin(2 * np.pi * rng.uniform(200, 2200) * np.arange(n) / SR))
        seg = np.round(seg * 3) / 3; x[i:i + n] = seg[:len(x[i:i + n])] * (1 if rng.random() < .75 else 0); i += n
    return fade(x * .5, .001, .005)

# ───────────────────────────── music, bar by bar ─────────────────────────────
D2, F2, G2, A2, C3, D3 = 38, 41, 43, 45, 48, 50
CH = {                                   # chord voicings per bar
    'Dm':   [50, 53, 57, 60],            # D3 F3 A3 C4
    'Bb':   [46, 50, 53, 57],            # Bb2 D3 F3 A3
    'F':    [53, 57, 60, 64],            # F3 A3 C4 E4
    'C':    [48, 52, 55, 62],            # C3 E3 G3 D4
    'Gm':   [43, 50, 53, 58],            # G2 D3 F3 Bb3
    'Dm9':  [50, 57, 60, 65],            # D3 A3 C4 F4  (the resolved tonic: has its minor third)
}
bar = lambda k: k * BAR
PENT = [62, 65, 67, 69, 72, 74, 77, 79]  # D4 F4 G4 A4 C5 D5 F5 G5

def kick_at(t, g=1.0):
    drums.add(kick(), t, g); kicks.append(t)
def place_bass(bar_i, pattern, root_midi):
    """pattern: (beat offset, length in beats, semitones above root)"""
    for off, ln, semi in pattern:
        bass_b.add(bass_note(root_midi + semi, ln * BEAT * .92), bar(bar_i) + off * BEAT, .8)

def arrange_music():
    # ---- bar 0: POINT — sub drone, heartbeat, ticks come from the cues
    t = T(BAR + .4); drone = np.sin(2 * np.pi * midi(26) * t) * np.minimum(1, t / 1.6) ** 2 * .55
    bass_b.add(lp(drone, 120), 0, .45)
    # ---- bar 1: DROP (four on the floor)
    for b in range(4): kick_at(bar(1) + b * BEAT)
    for b in (1, 3): perc.add(clap(), bar(1) + b * BEAT, .5, .05)
    for k in range(16): perc.add(hat(open_=(k == 14), vel=.5 if k % 4 == 2 else .2), bar(1) + k * BEAT / 4, .32, (-.3 if k % 2 else .3))
    place_bass(1, [(0, .5, 0), (.75, .25, 12), (1, .5, 0), (1.75, .25, 12), (2, .5, 0), (2.5, .5, 3), (3, .5, 0), (3.5, .25, 7), (3.75, .25, 5)], D2)
    L_, R_ = pad(CH['Dm'], BAR, .35, .5, 1400); music.add(L_, bar(1), .3, y=R_)
    # ---- bar 2: FORM
    for b in range(4): kick_at(bar(2) + b * BEAT)
    for b in (1, 3): perc.add(clap(), bar(2) + b * BEAT, .5, -.05)
    for k in range(16): perc.add(hat(open_=(k % 8 == 6), vel=.3 + (.12 if k % 2 else 0)), bar(2) + k * BEAT / 4, .3, (-.3 if k % 2 else .3))
    place_bass(2, [(0, .5, 0), (.5, .25, 0), (.75, .25, 12), (1, .5, 0), (2, .5, 0), (2.5, .25, 0), (2.75, .25, 12), (3, .5, 0), (3.5, .5, 7)], 34)   # Bb1
    L_, R_ = pad(CH['Bb'], BAR, .3, .5, 1600); music.add(L_, bar(2), .3, y=R_)
    for k in range(8):                                    # sequencer pluck on the 8ths
        n = [62, 69, 65, 74, 69, 65, 72, 67][k]; music.add(pluck(n, .22, .5), bar(2) + k * BEAT / 2, .22, (-.4 if k % 2 else .4))
    # ---- bar 3: DEPTH (spacious: kick on 1 & 3, wobbling sub, swelling pad)
    for b in (0, 2): kick_at(bar(3) + b * BEAT, .9)
    t = T(BAR); lfo = .55 + .45 * np.sin(2 * np.pi * (BPM / 60 * 2) * t)
    wob = lp(np.sin(2 * np.pi * midi(29) * t) + .35 * np.sin(2 * np.pi * midi(41) * t), 220, 2) * lfo * np.minimum(1, t / .5)
    bass_b.add(wob, bar(3), .4)
    L_, R_ = pad(CH['F'], BAR, 1.0, .6, 2600); music.add(L_, bar(3), .34, y=R_)
    for k in range(16): perc.add(hat(vel=.18 + .08 * (k % 4 == 2)), bar(3) + k * BEAT / 4, .25, (-.35 if k % 2 else .35))
    # ---- bar 4: FLOW (breakdown: no kick, glittering arps, cues carry the energy)
    L_, R_ = pad(CH['C'], BAR, .9, .6, 3200); music.add(L_, bar(4), .28, y=R_)
    for k in range(24):
        n = PENT[int(hash_(k, 7) * len(PENT))] + (12 if k % 5 == 0 else 0)
        music.add(pluck(n, .3, .45, 1.2), bar(4) + .3 + k * BEAT / 4, .17 + .1 * (k / 24), hash_(k, 3) * 1.6 - .8)
    for k in range(8): perc.add(hat(vel=.2), bar(4) + k * BEAT / 2 + BEAT / 4, .2, .3)
    # ---- bar 5: INTERFACE (kick returns, bright plucks, finger snaps)
    for b in range(4): kick_at(bar(5) + b * BEAT, .85)
    for b in (1, 3): perc.add(tick(1.2, 1800, 5200), bar(5) + b * BEAT, .8, .1); perc.add(clap(), bar(5) + b * BEAT, .22, .1)
    for k in range(8): perc.add(hat(vel=.3), bar(5) + k * BEAT / 2 + BEAT / 4, .28, -.2 if k % 2 else .2)
    place_bass(5, [(0, .5, 0), (.5, .5, 12), (1, .5, 0), (1.5, .5, 7), (2, .5, 0), (2.5, .5, 12), (3, .5, 5), (3.5, .5, 3)], D2)
    L_, R_ = pad(CH['Dm'], BAR, .1, .5, 2400); music.add(L_, bar(5), .22, y=R_)
    for k in range(16):
        n = [74, 81, 77, 86, 81, 77, 84, 79][k % 8]; music.add(pluck(n, .18, .5, 1.2), bar(5) + k * BEAT / 4, .15, (-.5 if k % 2 else .5))
    # ---- bar 6: RHYTHM (snare roll builds, G pedal; the stabs come from the cues)
    for b in range(4): kick_at(bar(6) + b * BEAT, .8)
    place_bass(6, [(0, .5, 0), (.5, .5, 0), (1, .5, 0), (1.5, .5, 0), (2, .5, 0), (2.5, .5, 0), (3, .5, 0), (3.5, .5, 0)], G2)
    for k in range(16): perc.add(snare(180 + 6 * k, .22), bar(6) + BAR * .5 + k * BEAT / 4 * .5 + k * 0, .12 + .5 * (k / 15) ** 1.6, 0)
    for k in range(16): perc.add(hat(vel=.3), bar(6) + k * BEAT / 4, .3, -.3 if k % 2 else .3)
    L_, R_ = pad(CH['Gm'], BAR, .2, .4, 1500); music.add(L_, bar(6), .2, y=R_)
    # ---- bar 7: LOCKUP (the cues play the hits; here the drone and the tail)
    t = T(BAR); sub = np.sin(2 * np.pi * midi(26) * t) * np.exp(-t / 1.4)
    bass_b.add(lp(sub, 140), bar(7), .6)
    kick_at(bar(7), 1.0)                                  # the final downbeat gets a real kick too
    L_, R_ = pad(CH['Dm9'], BAR - .1, .08, 1.0, 2800); music.add(L_, bar(7), .38, y=R_); rev.add(L_, bar(7), .5, y=R_)

def hash_(a, b):
    x = (a * 374761393 + b * 668265263) & 0xFFFFFFFF; x = ((x ^ (x >> 13)) * 1274126177) & 0xFFFFFFFF; x ^= x >> 16
    return (x & 0xFFFFFF) / float(0x1000000)

# ───────────────────────────── sound design from the cue sheet ─────────────────────────────
def bar_of(t): return int(t // BAR)
def chord_for(t): return [CH['Dm'], CH['Dm'], CH['Bb'], CH['F'], CH['C'], CH['Dm'], CH['Gm'], CH['Dm9']][min(7, bar_of(t))]
def has_kick(t): return any(abs(t - k) < .03 for k in kicks)
LANDS = [50, 53, 55, 57, 60, 62]                            # M O T I O N  ->  D3 F3 G3 A3 C4 D4
UI_N = [74, 77, 79, 81, 84, 86, 89]
CUT_FX = {}

# ───────────────────────────── the Motion Menu's sounds, called by name ─────────────────────────────
def _menu_recipes():
    """Content/motion/tools/sound_recipes.py, imported on first use, so rendering the reel never needs it"""
    mod = sys.modules.get('sound_recipes')
    if mod is None:
        import os
        tools = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'motion', 'tools'))
        if tools not in sys.path: sys.path.append(tools)
        keep, sys.dont_write_bytecode = sys.dont_write_bytecode, True              # leave no __pycache__ in the repo
        try:
            import sound_recipes as mod
        finally:
            sys.dont_write_bytecode = keep
    return mod

def sound_cue(c):
    """{"t": 3.2, "kind": "sound", "id": "whoosh"}  plays the Motion Menu's recipe `whoosh` at t on these same voices and buses.
    Optional props: gain (linear, default 1), pan (-1 left .. 1 right: balances the sound's own stereo image, constant power),
    seed (another take of the sound's noise; 0 is the take you hear in the Menu, so a cue sounds like its sample).
    The recipe's own options (sound_recipes.RECIPES[id].opts) are honoured like this:
      pump    ignored: the master below already pumps the music and bass on every kick a recipe logs (kick_at)
      vacuum  its (start, hit) offsets, shifted by t, join VACUUM
      origin  the recipe was written inside a later bar of the reel's grid. The stab lives in bar 1, the Dm bar, because the
              'stab' cue reads its chord from t // BAR. So it is played at the start of that bar and then slid onto t:
              the same notes as the Menu sample wherever the cue sits. (A 'stab' cue itself still follows the bar it lands in.)"""
    R, me, t, sid = _menu_recipes(), sys.modules[__name__], c['t'], c.get('id')
    if sid not in R.RECIPES:
        import difflib
        raise ValueError(f"sound cue at t={t}: there is no Menu sound called {sid!r}; closest: {difflib.get_close_matches(str(sid), list(R.RECIPES), 3) or 'none'} "
                         f"(the table is Content/motion/tools/sound_recipes.py)")
    opts = R.RECIPES[sid].opts
    t0 = opts.get('origin', t)                          # where the recipe plays; it is heard at t
    names, g, n_kicks = ('drums', 'perc', 'bass_b', 'music', 'fx', 'rev'), globals(), len(kicks)
    real = [g[n] for n in names]
    mine = [Bus() for _ in names]                       # the recipe plays onto fresh buses, so gain, pan and the slide touch only this sound
    for n, b in zip(names, mine): g[n] = b              # the voices and the cue player look the buses up by name, at call time
    try:
        R.play(sid, t0, me, c.get('seed', 0))
    finally:
        for n, b in zip(names, real): g[n] = b
    d = int(round(t * SR)) - int(round(t0 * SR))        # samples between where the recipe played and where it is heard (0 without an origin)
    gl = gr = c.get('gain', 1.0)
    if 'pan' in c:
        pl, pr = pan_gain(c['pan']); gl, gr = gl * pl, gr * pr
    lo, hi = max(0, -d), min(N, N - d)
    for dst, src in zip(real, mine):
        if hi > lo:
            dst.L[lo + d:hi + d] += src.L[lo:hi] * gl; dst.R[lo + d:hi + d] += src.R[lo:hi] * gr
    kicks[n_kicks:] = [k_ + d / SR for k_ in kicks[n_kicks:] if 0 <= k_ + d / SR < N / SR]      # a kick outside the track would index from the end in master()'s sidechain
    for a, b in opts.get('vacuum', ()):
        if t + a >= 0 and int((t + a) * SR) + int(.012 * SR) <= N: VACUUM.append((t + a, t + b))      # master() ramps over 12 ms: it must fit

def play_cue(c):
    t, k = c['t'], c['kind']
    if k == 'pulse':
        fx.add(thump(70, 40, .25, .09), t, .5); fx.add(thump(70, 40, .25, .09), t + .19, .32)
    elif k == 'blip':
        f = midi(74 + c.get('pitch', 0) * 3); fx.add(blip(f, .16, 1.25, .5), t, .35, 0.15); rev.add(blip(f, .16, 1.25, .5), t, .25, 0.15)
    elif k == 'zip':
        x = whoosh(c.get('dur', .5), True, 500, 9000); fx.add(x, t, .3); rev.add(x, t, .15)
    elif k == 'ticks':
        d = c.get('dur', .45)
        for i in range(16):
            u = i / 15; tt = t + d * (1 - (1 - u) ** 2); fx.add(tick(.5, 3500 + 200 * i, 9000), tt, .3, (-.6 + u * 1.2))
    elif k == 'land':
        i = c['i']; x = logdrum(LANDS[i], .85); fx.add(x, t, .6, -.7 + i * .28); rev.add(x, t, .22, -.7 + i * .28)
    elif k == 'riser':
        d = c.get('dur', .4); x = riser(d, 400, 10000, .8, (midi(62), midi(86)) if d > .3 else None)
        fx.add(x, t, .4 if d > .3 else .22); rev.add(x, t, .12)
    elif k == 'hit':
        amp = c.get('amp', .5); big = amp >= .8
        if not has_kick(t):
            drums.add(thump(95, 46, .4, .13 if big else .08), t, .4 * min(1, amp + .15))
            perc.add(tick(1.0, 1500, 6000), t, .35 * amp)
        if big:
            fx.add(boom(1.5 if c.get('final') or c.get('drop') else 1.0), t, .42 * min(1, amp))
        if c.get('final'):
            fx.add(boom(1.8, 70, 30), t, .4); L_, R_ = stab([38, 50, 57, 62, 65, 69, 74], .75, 1.4, .95); music.add(L_, t, .5, y=R_); rev.add(L_, t, .3, y=R_)
            x = bell(86, 2.2, .8); fx.add(x, t, .2, .1); rev.add(x, t, .4)
        if c.get('drop') or c.get('glitch') or c.get('final') or c.get('portal') or c.get('big'):
            x = crash(2.4 if c.get('final') else 1.4); fx.add(x, t, (.5 if c.get('final') else .3) * min(1.1, amp)); rev.add(x, t, .25)
        if c.get('sub') and not big:
            fx.add(boom(.7, 58, 34), t, .25)
    elif k == 'stab':
        if c.get('rise'):
            i = c['i']; n = PENT[i % 8]
            L_, R_ = stab([n, n + 12, n - 12 + 7], .26, 1.1, .5); music.add(L_, t, .3, y=R_); rev.add(L_, t, .16, y=R_)
        else:
            ch = chord_for(t); inv = ch if c['i'] % 2 == 0 else [ch[1], ch[2], ch[3], ch[0] + 12]
            L_, R_ = stab(inv + [inv[-1] + 5 if c['i'] == 2 else inv[0] + 12], .28, 1.0, c.get('amp', .6)); music.add(L_, t, .36, y=R_); rev.add(L_, t, .2, y=R_)
    elif k == 'whoosh':
        d = c.get('dur', .5)
        if c.get('dir') == 'pan':                          # whip pan: the sound travels right -> left with the picture
            x = whoosh(d, True, 700, 4200, .9); n = len(x)
            _add_lr(fx, x, t, np.linspace(.15, 1, n) * .3, np.linspace(1, .1, n) * .3)
        else:
            x = whoosh(d, True, 300, 7000, 1.0); fx.add(x, t, .32); rev.add(x, t, .14)
    elif k == 'arp':
        i = c['k']; n = PENT[i]; x = pluck(n, .16 + .02 * i, .9, 1.3); music.add(x, t, .24 + .02 * i, -.5 + i * .14); rev.add(x, t, .3, -.5 + i * .14)
    elif k == 'draw':
        d = c.get('dur', .5); tt = T(d); fr = 420 * (1620 / 420) ** (tt / d) * (1 + .006 * np.sin(2 * np.pi * 9 * tt))
        x = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.sin(np.pi * np.clip(tt / d, 0, 1)) ** .8 * .35
        x += np.sin(4 * np.pi * np.cumsum(fr) / SR) * np.sin(np.pi * np.clip(tt / d, 0, 1)) * .1
        fx.add(x, t, .35); rev.add(x, t, .35)
    elif k == 'scan':
        d = c.get('dur', .42); tt = T(d); fr = 300 * (2600 / 300) ** (tt / d)
        x = np.sin(2 * np.pi * np.cumsum(fr) / SR + 3 * np.sin(2 * np.pi * 30 * tt)) * np.sin(np.pi * np.clip(tt / d, 0, 1)) * .4
        n = len(x)                                        # the scan line travels left -> right
        _add_lr(fx, x, t, np.linspace(1, .1, n) * .3, np.linspace(.1, 1, n) * .3)
        rev.add(x, t, .25)
    elif k == 'burst':
        d = c.get('dur', .6); tt = T(d + .3); x = noise(len(tt)); y = np.zeros(len(tt)); zi = None
        steps = 64; edges = np.linspace(0, len(tt), steps + 1).astype(int)
        for b in range(steps):
            fc = 14000 * (500 / 14000) ** (b / steps); s = sos('low', fc, 2)
            if zi is None: zi = np.zeros((s.shape[0], 2))
            y[edges[b]:edges[b + 1]], zi = signal.sosfilt(s, x[edges[b]:edges[b + 1]], zi=zi)
        y *= np.exp(-tt / .28) * 1.4
        fx.add(y, t, .5); rev.add(y, t, .3)
    elif k == 'sweep':
        d = c.get('dur', .45); soft = c.get('soft')
        x = riser(d, 200, 8000, .7 if not soft else .25); fx.add(x, t, .38 if not soft else .2); rev.add(x, t, .12)
    elif k == 'chime':
        for j, n in enumerate((74, 77, 81, 84)):
            x = bell(n, 2.4, .8); fx.add(x, t + j * .012, .26, -.3 + j * .2); rev.add(x, t + j * .012, .45, -.3 + j * .2)
        fx.add(boom(.8, 60, 38), t, .3)
    elif k == 'ui':
        i = c['i']; x = blip(midi(UI_N[i]), .09, 1.18, .8); fx.add(x, t, .22, -.7 + i * .23); rev.add(x, t, .2, -.7 + i * .23)
    elif k == 'click':
        fx.add(tick(1.2, 2200, 7000), t, .5, .55); fx.add(thump(170, 95, .1, .035), t, .35, .55)
    elif k == 'slide':
        d = c.get('dur', .26); tt = T(d); fr = 520 * (900 / 520) ** (tt / d)
        x = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.sin(np.pi * np.clip(tt / d, 0, 1)) * .25 + bp(noise(len(tt)), 2000, 5000) * .12 * np.sin(np.pi * np.clip(tt / d, 0, 1))
        fx.add(x, t, .3, .5); rev.add(x, t, .2, .5)
    elif k == 'tick':
        n = (74, 77, 81)[c['i']]; x = pluck(n, .16, .9, 1.4); fx.add(x, t, .3, .5); rev.add(x, t, .25, .5)
    elif k == 'cut':
        kind = c.get('type'); d = c.get('dur', .15)
        if kind == 'whip': x = whoosh(.2, True, 700, 6000, 1.0); fx.add(x, t - .03, .32)
        elif kind == 'iris': x = blip(500, .16, 3.2, .7); fx.add(x, t, .25); rev.add(x, t, .2)
        elif kind == 'blinds':
            for j in range(8): fx.add(tick(.8, 2500, 8000), t + j * .018, .3, -.6 + j * .17)
        elif kind == 'glitch': fx.add(glitch(.16), t, .4)
        elif kind == 'zoom': x = riser(.17, 500, 7000, 1.0); fx.add(x, t, .3)
        elif kind == 'pixel':
            for j in range(6): fx.add(blip(midi(PENT[int(hash_(j, 5) * 8)] + 12), .03, 1.0, .5), t + j * .026, .22, -.5 + j * .2)
        elif kind == 'flip': x = blip(700, .12, .3, .8); fx.add(x, t + .04, .3)
    elif k == 'slam':
        n = c.get('n', 6)
        for i in range(n):
            x = logdrum(LANDS[i] + 12, .9, .3); fx.add(x, t + i * .0352 * 1.0, .45, -.6 + i * .24); rev.add(x, t + i * .0352, .25, -.6 + i * .24)
    elif k == 'chord':
        L_, R_ = pad([50, 57, 62, 65, 69, 76], c.get('dur', 1.4), .02, 1.7, 3000)      # Dm with the 9th on top
        music.add(L_, t, .55, y=R_); rev.add(L_, t, .55, y=R_)
        for j, nn in enumerate((74, 81, 86)): x = bell(nn, 2.6, .9); fx.add(x, t + .01 * j, .3, -.4 + j * .4); rev.add(x, t + .01 * j, .5, -.4 + j * .4)
    elif k == 'ping':
        n = (81, 86)[c['i']]; x = bell(n, 1.6, .8); fx.add(x, t, .22, (-.3, .35)[c['i']]); rev.add(x, t, .5)
    elif k == 'sound':
        sound_cue(c)

# ───────────────────────────── reverb + master ─────────────────────────────
def make_ir(seed, rt=2.4, pre=.018):
    r = np.random.default_rng(seed); n = int(rt * SR); t = np.arange(n) / SR
    ir = r.standard_normal(n) * np.exp(-t / (rt / 6.9)); ir = lp(ir, 6500, 2)
    ir *= (1 - np.exp(-t / .02)); ir = np.concatenate([np.zeros(int(pre * SR)), ir]); return ir / np.sqrt(np.sum(ir ** 2)) * .45

VACUUM = [(1.800, 1.875), (13.050, 13.125)]            # (start, end) just before the drop and before the final hit: everything ducks, then the hit lands on the silence

GAINS = dict(drums=.6, perc=1.5, bass=.4, music=1.35, fx=.8, wet=.6)          # bus levels, balanced from the band report (--diag)

def limiter(x, thresh=.80, look_ms=4.0, rel_ms=90.0):
    """stereo-linked look-ahead peak limiter: gain is pulled down BEFORE the peak arrives, then released slowly"""
    from scipy.ndimage import minimum_filter1d, uniform_filter1d
    peak = np.max(np.abs(x), axis=1)
    need = np.minimum(1.0, thresh / np.maximum(peak, 1e-9))
    look = int(look_ms / 1000 * SR)
    g = uniform_filter1d(minimum_filter1d(need, size=2 * look + 1), size=2 * look + 1)
    rc = math.exp(-1.0 / (rel_ms / 1000 * SR)); acc = 1.0; out = np.empty_like(g)
    for i in range(len(g)):
        acc = g[i] if g[i] < acc else rc * acc + (1 - rc) * g[i]
        out[i] = acc
    return x * out[:, None]

def band_report(name, L, R):
    m = (L + R) * .5; rows = []
    for lo, hi in ((20, 60), (60, 250), (250, 1000), (1000, 4000), (4000, 16000)):
        y = signal.sosfilt(sos('band', [lo, hi], 2), m); rows.append(20 * math.log10(max(1e-9, math.sqrt(np.mean(y ** 2)))))
    print(f'  {name:6s} ' + '  '.join(f'{v:6.1f}' for v in rows) + f'   | total {20 * math.log10(max(1e-9, math.sqrt(np.mean(m ** 2)))):6.1f}')

# ───────────────────────────── a voice over the track: the music ducks while it speaks ─────────────────────────────
VOICE_PEAK = .8                                          # a voice is peak-normalised to the limiter's ceiling, then mixed in at unity

def prep_voice(x, sr):
    """samples (n,) or (n, channels) at any rate -> float (N, 2) at 48 kHz, cut or padded to the track, peak-normalised to VOICE_PEAK.
    Mono goes to both sides; a stereo voice keeps its sides (a third channel and up are ignored)."""
    x = np.asarray(x)
    x = x.astype(np.float64) - (128.0 if x.dtype == np.uint8 else 0.0)                      # 8-bit WAV is unsigned
    x = np.repeat(x[:, None], 2, 1) if x.ndim == 1 else (np.repeat(x, 2, 1) if x.shape[1] == 1 else x[:, :2])
    if int(sr) != SR:
        g = math.gcd(int(sr), SR); x = signal.resample_poly(x, SR // g, int(sr) // g, axis=0)
    x = x[:N]
    peak = float(np.max(np.abs(x))) if len(x) else 0.0
    if not peak > 0: raise ValueError('the voice file is silent')
    out = np.zeros((N, 2)); out[:len(x)] = x * (VOICE_PEAK / peak)
    return out

def load_voice(path):
    sr, x = wavfile.read(path)
    return prep_voice(x, sr)

def speech_envelope(voice, release=.25, attack=.015, thresh_db=-45.0):
    """0..1 per sample (length N): 1 while the voice speaks, 0 when it does not. The voice's power is measured over 20 ms every millisecond
    and gated at thresh_db (dBFS of the voice as mixed, i.e. after prep_voice, so breaths and room noise stay under it); a one-pole
    follower then smooths the gate: `attack` and `release` are its time constants in seconds."""
    p = np.mean(np.square(voice), axis=1) if voice.ndim == 2 else np.square(voice)
    c = np.concatenate([[0.0], np.cumsum(p)]); win = int(.020 * SR)
    mid = np.arange(0, N, SR // 1000)                                                       # control points, 1 kHz
    lo, hi = np.clip(mid - win // 2, 0, len(p)), np.clip(mid + win // 2, 0, len(p))
    gate = (10 * np.log10(np.maximum((c[hi] - c[lo]) / np.maximum(hi - lo, 1), 1e-20)) > thresh_db).astype(float)
    ka, kr = 1 - math.exp(-1 / (max(attack, 1e-3) * 1000)), 1 - math.exp(-1 / (max(release, 1e-3) * 1000))
    env, y = np.empty(len(gate)), 0.0
    for i, gt in enumerate(gate):
        y += (ka if gt > y else kr) * (gt - y); env[i] = y
    return np.interp(np.arange(N) / SR, mid / SR, env)

def duck_gains(env, duck_db=9.0):
    """GAINS with the ducks in. The music (pads too), the bass and the reverb go down by the full duck_db while the voice speaks; the drums,
    the percussion and the fx go down by half of it, so hits stay punchy and the voice still sits on top."""
    full, half = 10 ** (-duck_db * env / 20), 10 ** (-duck_db / 2 * env / 20)
    return dict(GAINS, music=GAINS['music'] * full, bass=GAINS['bass'] * full, wet=GAINS['wet'] * full,
                drums=GAINS['drums'] * half, perc=GAINS['perc'] * half, fx=GAINS['fx'] * half)

def _bed(g, duck, wetL, wetR, diag=False):
    """the buses summed at gains g (numbers, or per-sample curves for a ducked bed), the vacuum ducks, a 32 Hz high-pass and a 16.5 kHz low-pass"""
    L = drums.L * g['drums'] + perc.L * g['perc'] + bass_b.L * duck * g['bass'] + music.L * duck * g['music'] + fx.L * g['fx'] + wetL * g['wet']
    Rr = drums.R * g['drums'] + perc.R * g['perc'] + bass_b.R * duck * g['bass'] + music.R * duck * g['music'] + fx.R * g['fx'] + wetR * g['wet']
    if diag:
        print('  bus      20-60  60-250  250-1k   1-4k   4-16k       (dBFS rms)')
        for nm, (a_, b_) in dict(drums=(drums.L * g['drums'], drums.R * g['drums']), perc=(perc.L * g['perc'], perc.R * g['perc']), bass=(bass_b.L * duck * g['bass'], bass_b.R * duck * g['bass']),
                                 music=(music.L * duck * g['music'], music.R * duck * g['music']), fx=(fx.L * g['fx'], fx.R * g['fx']), wet=(wetL * g['wet'], wetR * g['wet']), MIX=(L, Rr)).items():
            band_report(nm, a_, b_)
    vac = np.ones(N)
    for v0, v1 in VACUUM:
        i0, i1 = int(v0 * SR), int(v1 * SR); fd = int(.012 * SR)
        vac[i0:i0 + fd] = np.linspace(1, .05, fd); vac[i0 + fd:i1] = .05                  # quick duck, hold, then the hit returns at full level
    L = L * vac; Rr = Rr * vac
    out = np.stack([L, Rr], 1)
    out = signal.sosfilt(sos('high', 32, 2), out, axis=0)
    return np.stack([lp(out[:, 0], 16500, 2), lp(out[:, 1], 16500, 2)], 1)

def master(sidechain_depth=.62, diag=False, voice=None, duck_db=9.0, duck_release=.25):
    """voice: a voice made by prep_voice/load_voice. Given, the bed ducks by duck_db under it (see duck_gains; duck_release is the follower's
    release in seconds) and the voice is added at unity before the limiter. Without it nothing here changes."""
    duck = np.ones(N)
    for tk in kicks:
        i = int(tk * SR); n = int(.4 * SR); env = 1 - sidechain_depth * np.exp(-np.arange(n) / SR / .11) * (1 - np.exp(-np.arange(n) / SR / .004))
        j = min(N, i + n); duck[i:j] = np.minimum(duck[i:j], env[:j - i])
    wetL = signal.fftconvolve(rev.L * duck ** .5, make_ir(1))[:N]; wetR = signal.fftconvolve(rev.R * duck ** .5, make_ir(2))[:N]
    out = _bed(GAINS, duck, wetL, wetR, diag)
    # bring the 99.9th-percentile peak to 0.8, then let the limiter catch only the true outliers
    scale = .8 / np.percentile(np.abs(out), 99.9)
    if voice is not None:       # the same bed again with the ducks in, at the gain-staging it had on its own: the duck changes nothing else
        out = _bed(duck_gains(speech_envelope(voice, duck_release), duck_db), duck, wetL, wetR)
    out *= scale
    if voice is not None: out += voice
    out = limiter(out)
    fo = int(.55 * SR); out[-fo:] *= (np.linspace(1, 0, fo) ** 1.5)[:, None]          # tail fades with the picture
    out[:int(.004 * SR)] *= np.linspace(0, 1, int(.004 * SR))[:, None]
    return out

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('cues'); ap.add_argument('out'); ap.add_argument('--plot'); ap.add_argument('--diag', action='store_true'); ap.add_argument('--gains', default=''); ap.add_argument('--offset', type=float, default=.012, help='seconds the whole track is delayed so sound lands just after picture, never before it')
    ap.add_argument('--voice', help='a WAV with the voice (mono or stereo, any rate): the music, bass and reverb duck under it, the drums, percussion and fx by half as much')
    ap.add_argument('--duck-db', type=float, default=9.0, help='how far the music ducks while the voice speaks (default 9)')
    ap.add_argument('--duck-release', type=float, default=.25, help='seconds the music takes to come back after the voice stops (default 0.25)')
    ap.add_argument('--dur', type=float, help='length of the track in seconds (default 15, the reel). Read before anything else is set up')
    ap.add_argument('--no-music', action='store_true', help="leave out the reel's own 8-bar music, bass, kicks and its two silences: only the sounds the cues ask for")
    a = ap.parse_args()
    sheet = json.load(open(a.cues))
    for kv in filter(None, a.gains.split(',')): k_, v_ = kv.split('='); GAINS[k_] = float(v_)
    if a.no_music: VACUUM.clear()                                           # those two holes belong to the reel's own drop and finale
    else: arrange_music()
    for c in sheet['cues']: play_cue(c)
    voice = load_voice(a.voice) if a.voice else None
    y = master(diag=a.diag, voice=voice, duck_db=a.duck_db, duck_release=a.duck_release)
    off = int(round(a.offset * SR))
    if off > 0: y = np.concatenate([np.zeros((off, 2)), y[:-off]])        # frames show a hit up to one frame (33 ms) after it happens
    wavfile.write(a.out, SR, (y * 32767).astype(np.int16))
    print(f'{a.out}: {len(y) / SR:.3f}s, peak {20 * math.log10(np.max(np.abs(y))):.2f} dBFS, rms {20 * math.log10(np.sqrt(np.mean(y ** 2))):.1f} dBFS, {len(kicks)} kicks, {len(sheet["cues"])} cues')
    if voice is not None:
        env = speech_envelope(voice, a.duck_release)
        print(f'  voice {a.voice}: speaking {100 * np.mean(env > .5):.0f}% of the track; music, bass and reverb down {a.duck_db:g} dB while it does, drums, percussion and fx {a.duck_db / 2:g} dB')
    if a.plot:
        import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
        fig, ax = plt.subplots(2, 1, figsize=(18, 7), sharex=True, gridspec_kw={'height_ratios': [1, 2]})
        tt = np.arange(len(y)) / SR; ax[0].plot(tt, y[:, 0], lw=.3); ax[0].set_ylim(-1, 1)
        f, t_, S = signal.spectrogram(y.mean(1), SR, nperseg=2048, noverlap=1536); ax[1].pcolormesh(t_, f, 10 * np.log10(S + 1e-12), vmin=-110, vmax=-30, shading='auto'); ax[1].set_yscale('symlog', linthresh=200); ax[1].set_ylim(30, 16000)
        for c in sheet['cues']:
            if c['kind'] == 'hit' and c.get('amp', 0) >= .5: ax[0].axvline(c['t'], color='r', lw=.8)
        for b in range(9): ax[0].axvline(b * BAR, color='k', lw=.6, ls=':'); ax[1].axvline(b * BAR, color='w', lw=.6, ls=':')
        plt.tight_layout(); plt.savefig(a.plot, dpi=70)

if __name__ == '__main__':
    main()
