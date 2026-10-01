#!/usr/bin/env python3
"""sound_recipes.py - the Motion Menu's sounds as recipes that any mix can call by name.

A recipe is a function of the start time and the audio module:

    def recipe(t0, A): ...        # plays its voices onto A's buses, starting at t0 seconds

`A` is Content/showreel/tools/audio.py (the reel's synth: its voices, its buses, its cue player). Two callers use the
same RECIPES table, so a sound is the same sound everywhere:

    Content/motion/tools/sounds.py      renders each recipe as a Menu sample (t0 = 0.10 s, then mixdown())
    Content/showreel/tools/audio.py     plays one from a video's cue sheet:   {"t": 3.2, "kind": "sound", "id": "whoosh"}

RECIPES = {id: RecipeInfo(fn, group, opts)}. `opts` are the options the Menu's mixdown() needs, and the video mix
reads them too. Times in `opts` are offsets from the recipe's start:

    pump     sidechain-duck the bass and the music on the recipe's kicks (the Menu does it; a video's master already pumps)
    depth    how deep that pump goes (default 0.62)
    vacuum   [(start, hit), ...] everything ducks to 5 % from `start`, then the hit at `hit` lands on the silence
    origin   seconds into the reel's own 8-bar grid where the recipe is written (the stab plays inside bar 1, the Dm
             bar, because the cue player reads the chord from t // BAR). The Menu plays it there and drops that
             much from the front. A video mix plays it there too and slides the result onto the cue.

This module never imports sounds.py or audio.py: it is handed the audio module, so the file can load before it.
Noise: every sound has its own seed (seed_of), so the sample you hear in the Menu is the sound a video gets.

The 48 sounds of the reel come first (their recipes are the old sounds.py ones, moved here with LEAD replaced by t0: the samples are
byte-identical), then the sounds of a court and a gym and two alerts. standin_voice() is not a sound: it makes a pretend voice for
trying the duck (sounds.py's `duck` sample and the tests use it).
"""
import math
import zlib
from typing import Callable, NamedTuple

import numpy as np
from scipy import signal

BPM = 128                                  # the reel's tempo; play() checks it against the audio module's
BEAT = 60.0 / BPM
BAR = BEAT * 4                             # 1.875 s: same arithmetic as audio.py, so the same bits


class RecipeInfo(NamedTuple):
    fn: Callable                           # fn(t0, A) -> None
    group: str                             # the Menu group the sound sits in
    opts: dict                             # mixdown options: pump, depth, vacuum, origin (see above)


RECIPES = {}


def recipe(sid, group, **opts):
    def register(fn):
        assert sid not in RECIPES, f"two recipes called {sid}"
        RECIPES[sid] = RecipeInfo(fn, group, opts)
        return fn
    return register


# ───────────────────────────── seeding and playing ─────────────────────────────
def seed_of(sid):
    return 0x6D6F7469 ^ zlib.crc32(sid.encode())          # stable across runs, machines and Python versions


_ctx = {"base": 0}


def reseed(A, salt=0):
    """A.rng is the module global that A.noise() reads; the voices pick it up at call time."""
    A.rng = np.random.default_rng(_ctx["base"] + salt)


def play(sid, t0, A, seed=0):
    """Run the recipe `sid` at t0 on A's buses, with the sound's own noise (seed_of(sid) + seed). Returns its opts.
    A's noise generator is put back afterwards, so playing a sound never changes what the cues after it get."""
    info = RECIPES[sid]
    assert abs(A.BAR - BAR) < 1e-12, "the audio module's tempo is not the one these recipes were written for"
    keep = A.rng
    _ctx["base"] = seed_of(sid) + seed
    A.rng = np.random.default_rng(_ctx["base"])
    try:
        info.fn(t0, A)
    finally:
        A.rng = keep
    return info.opts


def _cue(A, kind, t, **kw):
    A.play_cue(dict(t=t, kind=kind, **kw))


# ───────────────────────────── the 48 sounds of the reel ─────────────────────────────
# DRUMS
@recipe("kick", "Drums")
def _(t0, A):
    for t in (t0, t0 + A.BEAT):
        A.drums.add(A.kick(), t, 1.0)


@recipe("clap", "Drums")
def _(t0, A):
    for t in (t0, t0 + A.BEAT):
        A.perc.add(A.clap(), t, 0.5, 0.05)


@recipe("snap", "Drums")
def _(t0, A):
    for t in (t0, t0 + A.BEAT):
        A.perc.add(A.tick(1.2, 1800, 5200), t, 0.8, 0.1)
        A.perc.add(A.clap(), t, 0.22, 0.1)


@recipe("hat", "Drums")
def _(t0, A):
    for k in range(4):
        A.perc.add(A.hat(vel=0.5), t0 + k * A.BEAT / 2, 0.3, 0.3 if k % 2 == 0 else -0.3)


@recipe("sizzle", "Drums")
def _(t0, A):
    A.perc.add(A.hat(open_=True, vel=0.8), t0, 0.3, 0.3)
    A.perc.add(A.hat(vel=0.8), t0 + A.BEAT, 0.3, -0.3)


@recipe("snare-roll", "Drums")
def _(t0, A):
    slot = A.BEAT / 8
    for k in range(16):
        A.perc.add(A.snare(180 + 6 * k, 0.22), t0 + k * slot, 0.12 + 0.5 * (k / 15) ** 1.6, 0)
    A.perc.add(A.snare(180 + 6 * 16, 0.3), t0 + 16 * slot, 0.95, 0)         # the final, louder one, a slot after the last


@recipe("thump", "Drums")
def _(t0, A):
    for t in (t0, t0 + A.BEAT):
        A.drums.add(A.thump(95, 46, 0.4, 0.13), t, 0.55)
        A.perc.add(A.tick(1.0, 1500, 6000), t, 0.3)


# LOW END
@recipe("groove", "Low end", pump=True)
def _(t0, A):
    for b in range(4):
        A.kick_at(t0 + b * A.BEAT)                                           # kick_at also logs the time for the pump
    for off, ln, semi in [(0, .5, 0), (.75, .25, 12), (1, .5, 0), (1.75, .25, 12), (2, .5, 0),
                          (2.5, .5, 3), (3, .5, 0), (3.5, .25, 7), (3.75, .25, 5)]:
        A.bass_b.add(A.bass_note(38 + semi, ln * A.BEAT * 0.92), t0 + off * A.BEAT, 0.8)


@recipe("undertow", "Low end")
def _(t0, A):
    t = A.T(A.BAR + .4)
    drone = np.sin(2 * np.pi * A.midi(26) * t) * np.minimum(1, t / 1.6) ** 2 * .55
    A.bass_b.add(A.lp(drone, 120), t0, .45)


@recipe("wobble", "Low end")
def _(t0, A):
    t = A.T(A.BAR)
    lfo = .55 + .45 * np.sin(2 * np.pi * (A.BPM / 60 * 2) * t)
    wob = A.lp(np.sin(2 * np.pi * A.midi(29) * t) + .35 * np.sin(2 * np.pi * A.midi(41) * t), 220, 2) * lfo * np.minimum(1, t / .5)
    A.bass_b.add(wob, t0, .4)


# CHORDS AND PADS
@recipe("cushion", "Chords and pads")
def _(t0, A):
    L, R = A.pad(A.CH["Dm"], 2.0, .35, .5, 1400)
    A.music.add(L, t0, .3, y=R)


@recipe("stab", "Chords and pads", origin=BAR)
def _(t0, A):
    # The cue player reads the chord from t // BAR, so this recipe lives inside bar 1 (the Dm bar): the Menu calls it with
    # t0 = 0.10 s + BAR and drops that bar from the front; a video mix calls it at BAR and slides the result onto the cue.
    for t in (t0, t0 + A.BEAT):
        _cue(A, "stab", t, i=0, amp=0.6)


@recipe("staircase", "Chords and pads")
def _(t0, A):
    for k in range(8):
        _cue(A, "stab", t0 + k * A.BEAT / 2, i=k, rise=1)


@recipe("last-word", "Chords and pads")
def _(t0, A):
    # the reel's 'chord' cue: a D minor pad with its 9th on top, and three bells. (Until 2026-10-01 the pad's lines sat
    # inside a '#' comment in audio.py and the cue was the bells only.)
    _cue(A, "chord", t0, dur=1.4)


# NOTES AND BELLS
@recipe("pluck", "Notes and bells")
def _(t0, A):
    for n, t, pan in zip((74, 77, 81), (t0, t0 + .30, t0 + .60), (-.3, 0, .3)):
        x = A.pluck(n, .3, 1.0)
        A.music.add(x, t, .5, pan)
        A.rev.add(x, t, .15, pan)                                            # "a small reverb send"


@recipe("run", "Notes and bells")
def _(t0, A):
    for start in (t0, t0 + .9):
        for k in range(8):
            _cue(A, "arp", start + k * .035, k=k)


@recipe("bell", "Notes and bells")
def _(t0, A):
    x = A.bell(81, 2.0, 0.9)
    A.fx.add(x, t0, .3)
    A.rev.add(x, t0, .4)


@recipe("chime", "Notes and bells")
def _(t0, A):
    _cue(A, "chime", t0)


@recipe("ping", "Notes and bells")
def _(t0, A):
    _cue(A, "ping", t0, i=0)
    _cue(A, "ping", t0 + 0.5, i=1)


@recipe("knock", "Notes and bells")
def _(t0, A):
    _cue(A, "land", t0, i=2)
    _cue(A, "land", t0 + 0.45, i=2)


@recipe("roll-call", "Notes and bells")
def _(t0, A):
    _cue(A, "slam", t0, n=6)


@recipe("bubble", "Notes and bells")
def _(t0, A):
    for k in range(7):
        _cue(A, "ui", t0 + k * .04, i=k)
    _cue(A, "ui", t0 + 0.8, i=3)


@recipe("boop", "Notes and bells")
def _(t0, A):
    _cue(A, "blip", t0, pitch=0, dur=0.18)
    _cue(A, "blip", t0 + 0.45, pitch=2, dur=0.3)


@recipe("plink", "Notes and bells")
def _(t0, A):
    for k in range(3):
        _cue(A, "tick", t0 + k * .08, i=k)


# SWEEPS AND BUILDS
@recipe("riser", "Sweeps and builds")
def _(t0, A):
    x = A.riser(1.2, 300, 10000, 0.9, (A.midi(62), A.midi(86)))             # it ends abruptly, on purpose
    A.fx.add(x, t0, .4)
    A.rev.add(x, t0, .12)


@recipe("rush", "Sweeps and builds")
def _(t0, A):
    _cue(A, "sweep", t0, dur=0.4775)


@recipe("whoosh", "Sweeps and builds")
def _(t0, A):
    _cue(A, "whoosh", t0, dir="in", dur=0.5)


@recipe("swish", "Sweeps and builds")
def _(t0, A):
    _cue(A, "whoosh", t0, dir="pan", dur=0.35)


@recipe("zip", "Sweeps and builds")
def _(t0, A):
    _cue(A, "zip", t0, dur=0.5)


@recipe("inhale", "Sweeps and builds")
def _(t0, A):
    # the 'zoom' transition: the voice call from play_cue's 'cut' branch, made directly so the sample does not depend
    # on how the cue sheet keys the cut type (that key has changed once already)
    A.fx.add(A.riser(.17, 500, 7000, 1.0), t0, .3)


@recipe("scanner", "Sweeps and builds")
def _(t0, A):
    _cue(A, "scan", t0, dur=0.42)


@recipe("glassline", "Sweeps and builds")
def _(t0, A):
    _cue(A, "draw", t0, dur=0.5)


@recipe("slide", "Sweeps and builds")
def _(t0, A):
    _cue(A, "slide", t0, dur=0.26)


# HITS AND EXPLOSIONS
@recipe("boom", "Hits and explosions")
def _(t0, A):
    A.fx.add(A.boom(1.5), t0, .42)


@recipe("crash", "Hits and explosions")
def _(t0, A):
    x = A.crash(2.4)
    A.fx.add(x, t0, .35)
    A.rev.add(x, t0, .25)


@recipe("blast", "Hits and explosions")
def _(t0, A):
    _cue(A, "burst", t0, dur=0.6)


@recipe("lub-dub", "Hits and explosions")
def _(t0, A):
    _cue(A, "pulse", t0)
    _cue(A, "pulse", t0 + 0.9)


def _drop(A, hit):
    """riser, then the hit at `hit` seconds: kick + boom + crash, exactly as the reel's drop does it."""
    _cue(A, "riser", hit - .75, dur=0.6)
    A.kick_at(hit)                                   # on the kick, so the 'hit' cue adds only boom + crash (has_kick), as in the reel
    _cue(A, "hit", hit, amp=1.0, drop=1)


VACUUM_MS = 75                                       # the silence before the hit


@recipe("drop", "Hits and explosions", vacuum=[(0.85 - VACUUM_MS / 1000, 0.85)])
def _(t0, A):
    _drop(A, t0 + 0.85)


# CLICKS AND GLITCHES  (the transition family: voice calls, see 'inhale')
@recipe("click", "Clicks and glitches")
def _(t0, A):
    _cue(A, "click", t0, i=0)
    _cue(A, "click", t0 + 0.4, i=0)


@recipe("ticks", "Clicks and glitches")
def _(t0, A):
    _cue(A, "ticks", t0, dur=0.45)


@recipe("clatter", "Clicks and glitches")
def _(t0, A):
    for t in (t0, t0 + .7):
        for j in range(8):
            A.fx.add(A.tick(.8, 2500, 8000), t + j * .018, .3, -.6 + j * .17)


@recipe("pixels", "Clicks and glitches")
def _(t0, A):
    for t in (t0, t0 + .6):
        for j in range(6):
            A.fx.add(A.blip(A.midi(A.PENT[int(A.hash_(j, 5) * 8)] + 12), .03, 1.0, .5), t + j * .026, .22, -.5 + j * .2)


@recipe("peep", "Clicks and glitches")
def _(t0, A):
    for t in (t0, t0 + .5):
        x = A.blip(500, .16, 3.2, .7)
        A.fx.add(x, t, .25)
        A.rev.add(x, t, .2)


@recipe("stutter", "Clicks and glitches")
def _(t0, A):
    for n, t in enumerate((t0, t0 + .6)):
        reseed(A, n)                                 # a different burst each time
        A.fx.add(A.glitch(.16), t, .4)


@recipe("flup", "Clicks and glitches")
def _(t0, A):
    for t in (t0, t0 + .5):
        A.fx.add(A.blip(700, .12, .3, .8), t, .3)


# MIX TRICKS
@recipe("vacuum", "Mix tricks", vacuum=[(3.1 - VACUUM_MS / 1000, 3.1)])
def _(t0, A):
    # the same riser + big hit twice, 2.1 s apart: first without the vacuum (hit at 1.0 s), then with it (hit at 3.1 s)
    _drop(A, t0 + 1.0)
    _drop(A, t0 + 1.0 + 2.1)


@recipe("pump", "Mix tricks", pump=True, depth=.62)
def _(t0, A):
    L, R = A.pad(A.CH["Dm"], 2.2, .1, .5, 2400)
    A.music.add(L, t0, .3, y=R)
    A.bass_b.add(A.bass_note(38, 2.0), t0, .8)
    for b in range(5):                               # a kick on every beat while the pad is held
        A.kick_at(t0 + b * A.BEAT)


@recipe("space", "Mix tricks")
def _(t0, A):
    x = A.pluck(74, .3, 1.0)
    A.music.add(x, t0, .5)                           # dry
    A.music.add(x, t0 + 1.3, .5)                     # the same note, wet
    A.rev.add(x, t0 + 1.3, .9)


assert len(RECIPES) == 48, "the reel's menu has exactly 48 sounds (the new ones below are added to them)"


# ───────────────────────────── NEW: the sounds of a court and a gym ─────────────────────────────
# Voices built here from the audio module's own pieces (T, noise, bp, hp, lp, tick, bell, ...). Every random draw comes from A.rng,
# which play() seeds from the sound's id, so a sound is the same every time and in every mix.
def _tone(A, f0, f1, tau_f, dur, tau_a):
    """a sine that drops from f0 to f1 (time constant tau_f) while it dies away (time constant tau_a)"""
    t = A.T(dur)
    f = f1 + (f0 - f1) * np.exp(-t / tau_f)
    return np.sin(2 * np.pi * np.cumsum(f) / A.SR) * np.exp(-t / tau_a)


def _glide_bp(A, x, path, q=1.6, blocks=48):
    """a band-pass whose centre follows `path` (Hz, one value per sample): A.sweep_bp for any shape of path. State is carried between blocks."""
    n = len(x)
    out = np.zeros(n)
    edges = np.linspace(0, n, blocks + 1).astype(int)
    zi = None
    for b in range(blocks):
        if edges[b + 1] <= edges[b]:
            continue
        fc = float(path[min(n - 1, (edges[b] + edges[b + 1]) // 2)])
        s = A.sos("band", [max(40, fc / q), min(A.SR * .45, fc * q)], 2)
        if zi is None:
            zi = np.zeros((s.shape[0], 2))
        out[edges[b]:edges[b + 1]], zi = signal.sosfilt(s, x[edges[b]:edges[b + 1]], zi=zi)
    return out


def _rms(x):
    return math.sqrt(float(np.mean(x * x))) + 1e-12


def _layer(*parts):
    """sum arrays of different lengths, every one starting at sample 0"""
    out = np.zeros(max(len(p) for p in parts))
    for p in parts:
        out[:len(p)] += p
    return out


def _squeak(A, f0, dur, vel):
    """a rubber squeak: a narrow band of noise gliding up, so it rings like a tone, plus a little sine at its centre, with the flutter of
    rubber sticking and slipping"""
    n = int(dur * A.SR)
    t = np.arange(n) / A.SR
    u = t / dur
    path = f0 * (1 + .28 * u)
    x = _glide_bp(A, A.noise(n), path, 1.06, blocks=max(6, n // 24))
    x /= _rms(x)
    tone = np.sin(2 * np.pi * np.cumsum(path) / A.SR)
    flutter = 1 + .35 * np.sin(2 * np.pi * 170 * t)
    return (x * .7 + tone * .45) * flutter * np.sin(np.pi * u) ** .6 * vel


@recipe("footsteps", "Sport")
def _(t0, A):
    # four steps of a sneaker running on a hard court, 0.28 s apart. Each: a heel thump (80 to 140 Hz, gone in about 40 ms) and the sole's
    # slap; the 2nd and 4th add a rubber squeak (1.5 to 3.5 kHz, 20 to 50 ms). No two steps are alike: level, pitch and timing differ a little.
    rng = A.rng
    for k in range(4):
        j = float(rng.uniform(-.006, .006))
        t = t0 + k * .28 + (j if k else 0.0)                         # the first step lands exactly on the cue; the others wander by a few ms
        vel = float(rng.uniform(.8, 1.0))
        fb = float(rng.uniform(88, 130))
        f_sq, d_sq = float(rng.uniform(1700, 2600)), float(rng.uniform(.022, .048))
        pan = -.3 + .2 * k
        body = np.tanh(1.6 * _tone(A, fb * 1.25, fb, .008, .12, .016)) * .62          # a little saturation: the heel's harmonics reach a phone speaker
        slap = A.bp(A.noise(int(.05 * A.SR)), 450, 2600) * np.exp(-A.T(.05) / .005) * 1.1
        step = _layer(body, slap)
        A.fx.add(step, t, .62 * vel, pan)
        A.rev.add(step, t, .03, pan)
        if k % 2 == 1:
            sq = _squeak(A, f_sq, d_sq, vel)
            A.fx.add(sq, t + .010, .12, pan)
            A.rev.add(sq, t + .010, .01, pan)


def _racket_hit(A, t, vel, pan):
    pock = _tone(A, 650 + 250 * vel, 650, .008, .12, .016)                      # the ball's air: a sine that drops from ~900 to 650 Hz
    click = A.tick(1.0, 2000, 5000) * (.4 + .6 * vel) * .12                     # the strings meeting the ball
    tt = A.T(.14)
    thwack = sum(a * np.sin(2 * np.pi * f * tt) * np.exp(-tt / d)               # the string bed rings for a moment
                 for f, a, d in ((1130, .45, .030), (1520, .30, .022), (2210, .20, .015))) * (.5 + .5 * vel) * .7
    body = _tone(A, 195, 172, .02, .25, .07) * .45                              # the hollow 180 Hz of the ball, under it
    hit = np.tanh(1.5 * _layer(pock, click, np.pad(thwack, (int(.0012 * A.SR), 0)), body)) / 1.5
    A.fx.add(hit, t, .5 * vel, pan)
    A.rev.add(hit, t, .03, pan)


@recipe("ball-hit", "Sport")
def _(t0, A):
    # a racket striking a tennis ball, twice, the second one softer, 0.7 s apart
    _racket_hit(A, t0, 1.0, -.1)
    _racket_hit(A, t0 + .7, .5, .1)


@recipe("ball-bounce", "Sport")                      # not "bounce": the catalogue already has an item with that id and name (the feel)
def _(t0, A):
    # a ball bouncing on a court: three bounces, each lower than the last. Each is a short hollow thump (a sine dropping from 220 to 110 Hz)
    # with a touch of click. The gaps shrink (0.38 s, then 0.29 s); three bounces have two gaps, so the third gap of the brief (0.22 s)
    # would belong to a fourth bounce.
    for t, h in ((t0, 1.0), (t0 + .38, .66), (t0 + .38 + .29, .42)):
        body = _tone(A, 220, 110, .008, .12, .012)
        air = _tone(A, 380, 340, .02, .12, .022) * .3                           # the hollow ring of the air inside
        x = np.tanh(1.3 * _layer(body, air, A.tick(1.0, 3000, 8000) * .12 * h)) / 1.3
        A.fx.add(x, t, .7 * h)
        A.rev.add(x, t, .02 * h)


def _plate_ring(A, f0, amps, t60s, dur):
    """a struck metal bar: inharmonic partials, each dying away on its own (t60 is the time to fall 60 dB)"""
    t = A.T(dur)
    x = np.zeros(len(t))
    for r, a, t60 in zip((1.0, 1.59, 2.29, 3.36, 4.62, 6.12, 7.7), amps, t60s):
        f = f0 * r * float(A.rng.uniform(.99, 1.01))
        x += a * np.sin(2 * np.pi * f * t + float(A.rng.uniform(0, 6.28))) * np.exp(-t * 6.908 / t60)
    return x


@recipe("clank", "Sport")
def _(t0, A):
    # a weight plate touching a barbell: seven inharmonic partials between 700 Hz and 6 kHz, dying in 0.9 s (the lowest) to 0.2 s (the highest),
    # and a short noise transient. Twice; the second hit is lighter and has less top to it.
    amps = np.array([1.0, .9, .75, .6, .5, .35, .25])
    t60s = (.9, .8, .65, .5, .38, .28, .2)
    for t, lvl, pan, f0 in ((t0, 1.0, -.1, 745), (t0 + .62, .38, .1, 752)):
        ring = _plate_ring(A, f0, amps * (lvl ** (np.arange(7) / 6.0)), t60s, 1.2) * lvl        # lighter: quieter, and the top partials hardly wake
        n = len(ring)
        tick = A.hp(A.noise(n), 2500) * np.exp(-A.T(1.2) / .0025) * .45 * lvl ** 2
        tok = A.bp(A.noise(n), 300, 1200) * np.exp(-A.T(1.2) / .006) * .4 * lvl
        x = np.tanh(.5 * (ring + tick + tok)) * 2                                               # only the highest peaks of a hard knock are squeezed
        A.fx.add(x, t, .3, pan)
        A.rev.add(x, t, .08, pan)


@recipe("thud-drop", "Sport")
def _(t0, A):
    # a heavy plate dropped on a rubber floor: a deep thump (70 Hz) with a 25 ms low noise burst on top, and a dull metallic rattle that dies in 0.4 s
    thump = _tone(A, 105, 68, .022, .6, .085)
    n = int(.025 * A.SR)
    burst = A.lp(A.noise(n), 400, 2) * np.sin(np.pi * np.arange(n) / n) ** 2
    t = A.T(.5)
    rattle = np.zeros(len(t))
    for f, t60, fm in ((520, .45, 31), (870, .40, 37), (1310, .35, 29), (1740, .30, 41), (2480, .25, 35)):
        f *= float(A.rng.uniform(.97, 1.03))
        rattle += np.sin(2 * np.pi * f * t + float(A.rng.uniform(0, 6.28))) * np.exp(-t * 6.908 / t60) * (1 + .45 * np.sin(2 * np.pi * fm * t + float(A.rng.uniform(0, 6.28))))
    rattle = A.lp(rattle, 3000, 2)
    A.drums.add(thump, t0, 1.0)
    A.drums.add(burst, t0, 1.2)
    A.fx.add(rattle, t0 + .006, .08)
    A.rev.add(thump, t0, .015)


@recipe("notify", "Alerts")
def _(t0, A):
    # a soft two-note notification: two bell notes a fourth apart (D6, then G6), 120 ms apart, each dying in about a quarter of a second
    for note, dt, pan in ((86, 0.0, -.12), (91, .12, .12)):
        b = A.bell(note, 1.0, .7) * np.exp(-A.T(1.0) / .11)
        A.fx.add(b, t0 + dt, .3, pan)
        A.rev.add(b, t0 + dt, .1, pan)


@recipe("swipe", "Alerts")
def _(t0, A):
    # a graphic sliding on: a band of noise that rises for 90 ms and falls for 110 ms (200 ms in all), travelling left to right, and a faint tone after it
    n = int(.2 * A.SR)
    u = np.arange(n) / n
    path = np.where(u < .45, 350 * (4200 / 350) ** (u / .45), 4200 * (1100 / 4200) ** ((u - .45) / .55))
    x = _glide_bp(A, A.noise(n), path, 1.7, 40) / np.sqrt(path / 1500) * np.sin(np.pi * u) ** 1.4
    gl, gr = np.linspace(1, .25, n), np.linspace(.25, 1, n)
    A.fx.add(x * gl, t0, .5, y=x * gr)
    A.rev.add(x, t0, .03)
    tail = A.fade(_tone(A, 1568, 1480, .05, .35, .08) * .3, .004, .01)
    A.fx.add(tail, t0 + .11, .3, .3)
    A.rev.add(tail, t0 + .11, .04, .3)


# ───────────────────────────── a stand-in for a voice (for trying the duck) ─────────────────────────────
_VOWELS = ((730, 1090, 2440), (530, 1840, 2480), (570, 840, 2410), (270, 2290, 3010), (300, 870, 2240), (660, 1720, 2410))   # a e o i u ae


def _formant(x, f, bw, sr):
    """a two-pole resonator (Klatt): centre f Hz, bandwidth bw Hz, unity gain at DC"""
    c = -math.exp(-2 * math.pi * bw / sr)
    b = 2 * math.exp(-math.pi * bw / sr) * math.cos(2 * math.pi * f / sr)
    return signal.lfilter([1 - b - c], [1, -b, -c], x)


def standin_voice(A, phrases, dur, f0=120.0, seed=7, breaths=(), floor_db=None):
    """Something that behaves like a speaking voice, so the duck can be tried without a recording. Syllables of vowel-like sound
    (a 120 Hz pulse train with a little pitch drift, a glottal tilt, three formant resonators, a puff of noise at the start of some),
    one after another inside each of `phrases`, a list of (start, end) seconds, and silence outside them.
    breaths   [(start, end), ...]: quiet puffs of noise, 50 dB under the speech peak, to show that breaths do not trigger the duck
    floor_db  a steady room noise this many dB under the speech peak (e.g. -62)
    Returns float64 (n, 2) at A.SR, the speech peak at 1.0 (mono on both sides). It has its own seeded generator: A.rng is not touched."""
    sr, rng = A.SR, np.random.default_rng(seed)
    n = int(round(dur * sr))
    x = np.zeros(n)
    for s, e in phrases:
        t = s
        while e - t > 0.14:
            L = min(e - t, float(rng.uniform(0.17, 0.30)))
            f1, f2, f3 = _VOWELS[int(rng.integers(len(_VOWELS)))]
            m = int(L * sr)
            tl = np.arange(m) / sr
            f = f0 * (1 + 0.06 * np.sin(2 * np.pi * 1.7 * (t + tl)) + 0.02 * np.sin(2 * np.pi * 5.3 * tl))
            imp = (np.diff(np.floor(np.cumsum(f) / sr), prepend=0.0) > 0).astype(float)          # one pulse per pitch period
            y = signal.lfilter([1.0], [1, -0.92], signal.lfilter([1.0], [1, -0.92], imp))          # glottal tilt, -12 dB per octave
            for fc, bw in ((f1, 80), (f2, 110), (f3, 160), (3300, 250)):
                y = _formant(y, fc, bw, sr)
            y /= math.sqrt(float(np.mean(y * y)) + 1e-30)
            y *= np.minimum(1, tl / 0.02) * np.minimum(1, (L - tl) / 0.04) * (1 - 0.25 * tl / L)
            if rng.random() < 0.5:
                y += A.bp(rng.standard_normal(m), 2000, 6000) * np.exp(-tl / 0.012) * 0.6
            i = int(round(t * sr))
            x[i:i + m] += y[:max(0, min(m, n - i))] * float(rng.uniform(0.7, 1.0))
            t += L + float(rng.uniform(0.03, 0.07))
    x = signal.lfilter([1.0, -1.0], [1.0, -0.998], x)                                           # the pulse train carries a DC offset, a microphone would not
    x /= max(float(np.max(np.abs(x))), 1e-9)
    for s, e in breaths:
        i, j = int(round(s * sr)), min(n, int(round(e * sr)))
        b = A.bp(rng.standard_normal(j - i), 200, 2500) * np.sin(np.pi * np.arange(j - i) / (j - i)) ** 2
        x[i:j] += b * (10 ** (-50 / 20) / math.sqrt(float(np.mean(b * b)) + 1e-30))
    if floor_db is not None:
        fl = A.lp(rng.standard_normal(n), 3000, 2)
        x += fl * (10 ** (floor_db / 20) / math.sqrt(float(np.mean(fl * fl))))
    return np.stack([x, x], 1)


assert len(RECIPES) == 55, "48 from the reel and 7 new ones"
