"""Synthesize the reel's sound effects from the page's own sound plan (tools/export_sound.js -> sound.json).

Nothing is sampled or downloaded: every sound is built here from sine sweeps, filtered noise and decaying partials, placed at the exact times the
picture does things (every ball bounce comes from the same list that moves the ball). Stereo pan follows where the thing is on screen.
Mixed quietly and safely (peaks near -3 dBFS, no loud low end) because it sits UNDER whatever music Amir adds in Instagram.

usage: python make_sfx.py <sound.json> <out.wav>

sound.json comes from tools/export_sound.js: {dur, impacts:[{t,x,y,mag,snd?,phone?,medal?,pill?,skip?}], cues:[{t,k,...}], scroll:[{t,a,b}]}.
Impact `snd` picks the sound: thock (default, ball on clay), tap (glass), pill (soft UI), medal (heavy), ui (button press), none (it has its own cue).
Cue kinds: fall pop tick ping bell boom smash whoosh swish zip riser doors wipe bloop slap thud draw shimmer confetti pad launch.
"""
import json, sys
import numpy as np
from scipy import signal

SR = 48000
RNG = np.random.default_rng(20261002)


# ----------------------------------------------------------------------------- building blocks
def tt(dur):
    return np.arange(int(dur * SR)) / SR


def env_exp(dur, tau, attack=0.002):
    t = tt(dur)
    e = np.exp(-t / tau)
    a = int(attack * SR)
    if a > 0:
        e[:a] *= np.linspace(0, 1, a)
    return e


def sine_sweep(f0, f1, dur, curve='exp'):
    t = tt(dur)
    if curve == 'exp':
        k = np.log(f1 / f0) / dur
        ph = 2 * np.pi * f0 * (np.exp(k * t) - 1) / k
    else:
        ph = 2 * np.pi * (f0 * t + (f1 - f0) * t * t / (2 * dur))
    return np.sin(ph)


def noise(dur):
    return RNG.standard_normal(int(dur * SR))


def sos(kind, fc, order=2):
    return signal.butter(order, fc, btype=kind, fs=SR, output='sos')


def bp(x, lo, hi):
    return signal.sosfilt(sos('bandpass', [lo, min(hi, SR * 0.45)]), x)


def lp(x, fc):
    return signal.sosfilt(sos('lowpass', fc), x)


def hp(x, fc):
    return signal.sosfilt(sos('highpass', fc), x)


def svf_band(x, fc, q=1.4):
    """time-varying band-pass (Chamberlin state-variable filter). fc: per-sample centre frequency in Hz."""
    n = len(x)
    f = (2 * np.sin(np.pi * np.minimum(fc, SR / 6.5) / SR)).tolist()
    xs = x.tolist()
    y = [0.0] * n
    low = band = 0.0
    qq = 1.0 / q
    for i in range(n):
        high = xs[i] - low - qq * band
        band += f[i] * high
        low += f[i] * band
        y[i] = band
    return np.array(y)


def fc_curve(f0, f1, dur, ease=1.0):
    u = np.linspace(0, 1, int(dur * SR)) ** ease
    return f0 * (f1 / f0) ** u


def bell_env(dur, a=.35, power=1.0):
    u = np.linspace(0, 1, int(dur * SR))
    e = np.where(u < a, (u / a) ** 1.4, ((1 - u) / (1 - a)) ** 1.6)
    return np.clip(e, 0, 1) ** power


def norm(x, peak):
    m = np.max(np.abs(x)) or 1
    return x * (peak / m)


# ----------------------------------------------------------------------------- the sounds (mono; placed later)
def thock(mag=0.8, f0=190, bright=1.0):
    """a ball landing on clay / a pill being pressed: a short woody body + a soft click"""
    body = sine_sweep(f0, f0 * 0.42, 0.14) * env_exp(0.14, 0.035)
    click = lp(noise(0.02), 3800 * bright) * env_exp(0.02, 0.004, 0.0005)
    x = np.zeros(int(0.2 * SR)); x[:len(body)] += body * 0.9; x[:len(click)] += click * 0.42
    return norm(x, 0.55 * mag ** 1.3)


def tap(mag=0.8, f0=520):
    """the ball tapping glass (a phone's top edge): short, bright"""
    body = sine_sweep(f0, f0 * 0.5, 0.09) * env_exp(0.09, 0.022)
    tink = np.sin(2 * np.pi * 2300 * tt(0.08)) * env_exp(0.08, 0.012, 0.0005) * 0.35
    x = np.zeros(int(0.15 * SR)); x[:len(body)] += body; x[:len(tink)] += tink
    return norm(x, 0.42 * mag ** 1.2)


def pop(f=500, vol=1.0):
    x = sine_sweep(f * 0.7, f * 1.35, 0.09, 'lin') * env_exp(0.09, 0.022, 0.001)
    x = x + 0.25 * np.sin(2 * np.pi * 2 * f * tt(0.09)) * env_exp(0.09, 0.012)
    return norm(x, 0.2 * vol)


def tick(f=1800, vol=1.0):
    x = np.sin(2 * np.pi * f * tt(0.03)) * env_exp(0.03, 0.0035, 0.0003)
    x = x + lp(noise(0.03), 6000) * env_exp(0.03, 0.002, 0.0002) * 0.3
    return norm(x, 0.15 * vol)


def ping(f=1760, vol=1.0, dur=0.45):
    t = tt(dur)
    x = (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2.0 * f * t) * np.exp(-t / 0.05)) * np.exp(-t / 0.11)
    return norm(x, 0.2 * vol)


def bell(f=784, dur=1.6):
    t = tt(dur)
    x = np.zeros_like(t)
    for ratio, amp, tau in [(1, 1, 0.55), (2.76, 0.55, 0.32), (5.4, 0.3, 0.2), (8.93, 0.14, 0.11)]:
        x += amp * np.sin(2 * np.pi * f * ratio * t + RNG.uniform(0, 6.28)) * np.exp(-t / tau)
    x *= np.minimum(1, t / 0.002)
    return norm(x, 0.34)


def boom(dur=0.9):
    t = tt(dur)
    s = sine_sweep(92, 36, dur) * np.exp(-t / 0.28)
    n = lp(noise(dur), 180) * np.exp(-t / 0.09)
    return norm(s * 0.9 + n * 0.4, 0.55)


def smash():
    """the racket hitting the ball into the badge"""
    n = bp(noise(0.12), 1300, 5200) * env_exp(0.12, 0.014, 0.0005)
    body = sine_sweep(330, 105, 0.22) * env_exp(0.22, 0.06)
    x = np.zeros(int(0.35 * SR)); x[:len(n)] += n * 1.0; x[:len(body)] += body * 0.8
    sh = hp(noise(0.5), 5500) * env_exp(0.5, 0.17, 0.003) * 0.35
    out = np.zeros(int(0.7 * SR)); out[:len(x)] += norm(x, 0.6)
    out[:len(sh)] += norm(sh, 0.16)
    b = boom(0.7) * 0.7; out[:len(b)] += b
    return norm(out, 0.9)


def whoosh(dur=0.5, f0=300, f1=2400, q=1.1, vol=0.5):
    n = noise(dur)
    y = svf_band(n, fc_curve(f0, f1, dur), q)
    y = y * bell_env(dur, .55)
    return norm(y, 0.3 * vol)


def swish(vol=0.7):
    dur = 0.16
    y = svf_band(noise(dur), fc_curve(1400, 3400, dur), 1.6) * bell_env(dur, .3)
    return norm(y, 0.09 * vol)


def zip_(vol=1.0):
    dur = 0.16
    y = svf_band(noise(dur), fc_curve(900, 5200, dur), 2.2) * bell_env(dur, .6)
    return norm(y, 0.11 * vol)


def riser(dur=0.5):
    n = noise(dur)
    y = svf_band(n, fc_curve(260, 5200, dur, 1.4), 2.0)
    e = np.linspace(0, 1, len(y)) ** 2.0
    s = sine_sweep(220, 880, dur, 'lin') * 0.25
    return norm(y * e + s * e * 0.5, 0.22)


def fall(dur=0.45, f0=900, f1=240):
    y = svf_band(noise(dur), fc_curve(f0, f1, dur), 3.0) * bell_env(dur, .25)
    return norm(y, 0.08)


def doors(dur=0.65):
    n = noise(dur)
    rumble = lp(n, 420) * bell_env(dur, .45)
    mid = svf_band(noise(dur), fc_curve(380, 1600, dur), 1.2) * bell_env(dur, .5)
    clunk = np.zeros(int(dur * SR)); th = thud(); clunk[:len(th)] += th
    return norm(norm(rumble, .3) + norm(mid, .22) + clunk * 0.5, 0.5)


def wipe(dur=0.55):
    w = whoosh(dur, 260, 6200, 1.3, 1.1)
    siz = hp(noise(dur), 6500) * bell_env(dur, .8) * 0.05
    return norm(w + siz, 0.34)


def bloop():
    x = sine_sweep(430, 175, 0.16) * env_exp(0.16, 0.07, 0.002)
    return norm(x, 0.3)


def slap():
    x = lp(noise(0.1), 900) * env_exp(0.1, 0.02, 0.001) + 0.7 * sine_sweep(170, 90, 0.1) * env_exp(0.1, 0.03)
    return norm(x, 0.32)


def thud(vol=1.0):
    t = tt(0.22)
    x = sine_sweep(95, 50, 0.22) * np.exp(-t / 0.06) + 0.5 * lp(noise(0.22), 300) * np.exp(-t / 0.03)
    return norm(x, 0.4 * vol)


def draw(dur=0.6):
    out = np.zeros(int(dur * SR))
    notes = [1568, 1760, 2093, 2349, 2637, 3136]
    for i in range(7):
        t0 = int((i / 7) * dur * SR)
        p = ping(notes[i % len(notes)], 0.4, 0.12)
        out[t0:t0 + len(p)] += p[:max(0, len(out) - t0)]
    return norm(out, 0.12)


def shimmer(dur=0.55):
    x = hp(noise(dur), 5200) * env_exp(dur, 0.16, 0.004)
    out = norm(x, 0.1)
    for _ in range(5):
        f = RNG.choice([3136, 3520, 3951, 4699, 5274]); t0 = int(RNG.uniform(0, 0.25) * SR)
        p = ping(float(f), 0.35, 0.2); out[t0:t0 + len(p)] += p[:max(0, len(out) - t0)]
    return out


def confetti():
    n = bp(noise(0.1), 600, 6500) * env_exp(0.1, 0.02, 0.0004)
    low = sine_sweep(180, 90, 0.2) * env_exp(0.2, 0.05)
    out = np.zeros(int(1.2 * SR)); out[:len(n)] += norm(n, 0.4); out[:len(low)] += norm(low, 0.35)
    for i, f in enumerate([1047, 1319, 1568, 2093, 2637, 3136]):
        t0 = int((0.03 + i * 0.065) * SR); p = bell(f, 0.9) * 0.28; out[t0:t0 + len(p)] += p[:max(0, len(out) - t0)]
    sh = hp(noise(0.9), 6000) * env_exp(0.9, 0.3, 0.01) * 0.04
    out[:len(sh)] += sh
    return norm(out, 0.5)


def pad(dur=2.6):
    t = tt(dur)
    x = np.zeros_like(t)
    for f, a in [(130.8, 0.8), (196.0, 0.7), (329.6, 0.55), (493.9, 0.4), (587.3, 0.3)]:
        for det in (-3, 3):
            ff = f * 2 ** (det / 1200)
            vib = 1 + 0.0025 * np.sin(2 * np.pi * 4.6 * t + RNG.uniform(0, 6.28))
            x += a * np.sin(2 * np.pi * ff * np.cumsum(vib) / SR)
    x = lp(x, 2200)
    e = np.minimum(1, t / 0.7) * np.minimum(1, (dur - t) / 0.8)
    return norm(x * e, 0.11)


def launch(dur=0.55):
    w = whoosh(dur, 300, 3600, 1.2, 0.9)
    b = sine_sweep(180, 520, 0.12, 'lin') * env_exp(0.12, 0.04) * 0.25
    out = w.copy(); out[:len(b)] += b
    return norm(out, 0.3)


# ----------------------------------------------------------------------------- mixing
def place(buf, x, t0, pan=0.0, pan1=None):
    i0 = int(t0 * SR)
    if i0 >= buf.shape[0]:
        return
    x = x[:buf.shape[0] - i0]
    n = len(x)
    p = np.full(n, pan) if pan1 is None else np.linspace(pan, pan1, n)
    th = (np.clip(p, -1, 1) + 1) * np.pi / 4
    buf[i0:i0 + n, 0] += x * np.cos(th)
    buf[i0:i0 + n, 1] += x * np.sin(th)


def reverb_ir(dur=1.1):
    t = tt(dur)
    ir = []
    for _ in range(2):
        n = RNG.standard_normal(len(t)) * np.exp(-t / 0.26)
        n = hp(lp(n, 6500), 180)
        n[:int(0.012 * SR)] = 0
        ir.append(n / np.sqrt(np.sum(n * n)))
    return np.stack(ir, axis=1)


def main():
    plan = json.load(open(sys.argv[1], encoding='utf-8'))
    dur = plan['dur'] + 0.6
    buf = np.zeros((int(dur * SR), 2))

    # 1) every ball impact, straight from the picture
    for im in plan['impacts']:
        t, mag = im['t'], im['mag']
        pan = float(np.clip((im['x'] / 1080 - 0.5) * 1.3, -0.7, 0.7))
        snd = im.get('snd')                              # optional: 'thock' | 'tap' | 'pill' | 'medal' | 'none' (a big hit that has its own cue)
        if snd == 'none' or im.get('skip'):
            continue
        if snd == 'tap' or (snd is None and im.get('phone')):
            place(buf, tap(mag, 560 if im['phone'] == 'T' else 480), t, pan)
        elif snd == 'medal' or (snd is None and im.get('medal')):
            place(buf, thock(mag, 150), t, pan)
        elif snd == 'pill' or (snd is None and im.get('pill')):
            place(buf, thock(mag, 240, 1.2), t, pan)
            place(buf, tick(2000, 0.5), t + 0.01, pan)
        elif snd == 'ui':                                # a ball pressing a button: thock + a small pop
            place(buf, thock(mag, 330, 1.3), t, pan)
            place(buf, pop(360, 0.5), t + 0.005, pan)
        else:
            place(buf, thock(mag, 170 + 90 * (1 - im['y'] / 1920), 1.0), t, pan)

    # 2) the cue list
    K = {
        'fall': lambda c: fall(c.get('dur', .45), c.get('f0', 900), c.get('f1', 240)),
        'pop': lambda c: pop(c.get('f', 500), c.get('vol', 1)),
        'tick': lambda c: tick(c.get('f', 1800), c.get('vol', 1)),
        'ping': lambda c: ping(c.get('f', 1760), c.get('vol', 1), c.get('dur', .45)),
        'bell': lambda c: bell(c.get('f', 784)),
        'boom': lambda c: boom(),
        'smash': lambda c: smash(),
        'whoosh': lambda c: whoosh(c.get('dur', .5), c.get('f0', 300), c.get('f1', 2400)),
        'swish': lambda c: swish(c.get('vol', .7)),
        'zip': lambda c: zip_(c.get('vol', 1)),
        'riser': lambda c: riser(c.get('dur', .5)),
        'doors': lambda c: doors(c.get('dur', .65)),
        'wipe': lambda c: wipe(c.get('dur', .55)),
        'bloop': lambda c: bloop(),
        'slap': lambda c: slap(),
        'thud': lambda c: thud(c.get('vol', 1)),
        'draw': lambda c: draw(c.get('dur', .6)),
        'shimmer': lambda c: shimmer(c.get('dur', .55)),
        'confetti': lambda c: confetti(),
        'pad': lambda c: pad(c.get('dur', 2.6)),
        'launch': lambda c: launch(c.get('dur', .55)),
    }
    for c in plan['cues']:
        x = K[c['k']](c)
        place(buf, x, c['t'], c.get('pan', 0.0), c.get('pan1'))

    # 3) the phones' scrolling: a soft swish that follows the page speed
    sc = plan.get('scroll') or []                        # empty when the reel has no scrolling page: then there is nothing to add
    if sc:
        n = int((sc[-1]['t'] - sc[0]['t'] + 0.2) * SR)
        nz = noise(n / SR)
        ts = np.array([s['t'] for s in sc]); tl = sc[0]['t'] + np.arange(n) / SR
        for key, pan in (('a', 0.35), ('b', -0.35)):
            v = np.interp(tl, ts, [s[key] for s in sc])
            amp = np.clip(v / 9000.0, 0, 1) ** 0.8
            y = svf_band(nz, 700 + 2400 * amp, 1.3) * amp * 0.07
            place(buf, y, sc[0]['t'], pan)

    # 4) a little room: synthetic reverb on a send
    ir = reverb_ir()
    wet = np.stack([signal.fftconvolve(buf[:, 0], ir[:, 0])[:len(buf)], signal.fftconvolve(buf[:, 1], ir[:, 1])[:len(buf)]], axis=1)
    mix = buf + 0.2 * wet

    # 5) master: high-pass, a soft ceiling, then scale so the highest peak is -3 dBFS
    mix = np.stack([hp(mix[:, 0], 32), hp(mix[:, 1], 32)], axis=1)
    mix = np.tanh(mix * 1.15) / np.tanh(1.15)
    mix *= 10 ** (-3 / 20) / np.max(np.abs(mix))
    fade = np.minimum(1, (np.arange(len(mix)) / SR - 0.0) / 0.01)
    mix *= fade[:, None]
    out = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
    import wave
    with wave.open(sys.argv[2], 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(out.tobytes())
    print('wrote', sys.argv[2].split('/')[-1], round(len(out) / SR, 2), 's, peak', round(20 * np.log10(np.max(np.abs(mix))), 1), 'dBFS')


if __name__ == '__main__':
    main()
