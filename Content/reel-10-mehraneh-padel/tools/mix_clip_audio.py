"""Lay her REAL racket pops (from the clips' own audio) onto the synthesized effects track, at the picture's contact frames.

The page lists them in window.__sound().clips (scenes.js clipAudioPlan): {t: reel seconds where the pop's onset goes, clip, src: the onset in
the clip's audio, dur, gain, pan}. The onset is moved onto the contact frame (sound reached the phone 17-45 ms after the hit).
Each pop is cut from 8 ms before its onset, high-passed at 120 Hz (handling noise), faded out, scaled so its peak sits at -6 dBFS x gain,
and summed into the effects track. The sum is then scaled back under -3 dBFS so mux_sfx.py's limiter has nothing to fight.

    python mix_clip_audio.py <sound.json> <sfx.wav> <out.wav>      (clip audio: ../assets/audio/<clip>.wav, 48 kHz stereo)
"""
import json, os, sys, wave
import numpy as np
from scipy import signal

HERE = os.path.dirname(os.path.abspath(__file__))
AUDIO = os.path.normpath(os.path.join(HERE, '..', 'assets', 'audio'))


def read(p):
    with wave.open(p, 'rb') as w:
        sr, ch, n = w.getframerate(), w.getnchannels(), w.getnframes()
        x = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float64) / 32768
    return sr, x.reshape(-1, ch)


def main():
    plan = json.load(open(sys.argv[1], encoding='utf-8'))
    sr, mix = read(sys.argv[2])
    hp = signal.butter(2, 120, 'highpass', fs=sr, output='sos')
    for c in plan.get('clips', []):
        csr, x = read(os.path.join(AUDIO, c['clip'] + '.wav'))
        assert csr == sr, 'clip audio must be %d Hz' % sr
        a = int((c['src'] - .008) * sr); b = a + int(c['dur'] * sr)
        seg = signal.sosfilt(hp, x[a:b], axis=0)
        fade = np.ones(len(seg)); k = int(.12 * sr); fade[-k:] = np.linspace(1, 0, k) ** 2
        ki = int((.002 if c.get('norm', True) else .12) * sr); fade[:ki] = np.linspace(0, 1, ki)   # a bed fades in gently
        seg = seg * fade[:, None]
        if c.get('norm', True):                          # a single pop: its peak goes to -6 dBFS x gain
            seg = seg / max(1e-9, np.max(np.abs(seg))) * 10 ** (-6 / 20) * c.get('gain', 1)
        else:                                            # a bed of the clip's own sound: its level as filmed x gain (no pumping of the room tone)
            seg = seg * c.get('gain', 1)
        pan = c.get('pan', 0); seg = seg * np.array([min(1, 1 - pan), min(1, 1 + pan)])
        o = int((c['t'] - .008) * sr)
        if o < 0 or o + len(seg) > len(mix):
            continue
        mix[o:o + len(seg)] += seg
        print('pop %-5s src %.3f -> %.3f s' % (c['clip'], c['src'], c['t']))
    pk = np.max(np.abs(mix))
    if pk > 10 ** (-3 / 20):
        mix *= 10 ** (-3 / 20) / pk
    out = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
    with wave.open(sys.argv[3], 'wb') as w:
        w.setnchannels(mix.shape[1]); w.setsampwidth(2); w.setframerate(sr); w.writeframes(out.tobytes())
    print('wrote', os.path.basename(sys.argv[3]), round(len(out) / sr, 2), 's, peak', round(20 * np.log10(np.max(np.abs(mix))), 1), 'dBFS')


if __name__ == '__main__':
    main()
