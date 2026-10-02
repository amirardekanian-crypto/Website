"""Spectrogram + waveform picture of a WAV, with second markers: a way to 'see' the sound track.
usage: python spectro.py <in.wav> <out.png>"""
import sys, wave
import numpy as np
from scipy import signal
from PIL import Image, ImageDraw

w = wave.open(sys.argv[1]); sr = w.getframerate(); n = w.getnframes()
x = np.frombuffer(w.readframes(n), dtype=np.int16).reshape(-1, w.getnchannels()).astype(np.float32) / 32768
m = x.mean(axis=1)
f, t, S = signal.spectrogram(m, sr, nperseg=1024, noverlap=768, scaling='spectrum')
S = 10 * np.log10(S + 1e-12)
S = np.clip((S + 100) / 70, 0, 1)
keep = f <= 12000
S = S[keep][::-1]
W = int(t[-1] * 80)
img = Image.fromarray((S * 255).astype(np.uint8)).resize((W, 360), Image.BILINEAR).convert('RGB')
# a plain colour ramp
a = np.asarray(img)[:, :, 0] / 255.0
rgb = np.stack([np.clip(a * 2.2 - .2, 0, 1), np.clip(a * 1.6 - .5, 0, 1) , np.clip(1 - np.abs(a - .45) * 2.2, 0, 1) * .8], axis=2)
img = Image.fromarray((rgb * 255).astype(np.uint8))
wave_h = 120
canvas = Image.new('RGB', (W, 360 + wave_h + 18), (16, 16, 18))
canvas.paste(img, (0, 0))
d = ImageDraw.Draw(canvas)
# waveform
env = np.abs(m)
step = max(1, len(m) // W)
for px in range(W):
    seg = env[px * step:(px + 1) * step]
    if len(seg):
        v = float(seg.max()) * (wave_h / 2 - 2)
        d.line([(px, 360 + wave_h // 2 - v), (px, 360 + wave_h // 2 + v)], fill=(120, 200, 150))
for s in range(0, int(t[-1]) + 1):
    d.line([(s * 80, 0), (s * 80, 360 + wave_h)], fill=(255, 255, 255, 40), width=1)
    d.text((s * 80 + 3, 360 + wave_h + 3), f'{s}s', fill=(220, 220, 220))
canvas.save(sys.argv[2])
print(canvas.size, 'peak', round(float(np.abs(x).max()), 3))
