"""Put the synthesized sound effects under the silent render and PROVE the result.

Unlike mux_audio.py (a voice take, -14 LUFS), this is a sparse sound-design layer that sits under music Amir adds in Instagram:
a gentle compressor lifts the tails, a limiter holds the peaks at -1.5 dBFS, 48 kHz stereo AAC 192k, video stream copied untouched.

usage: python mux_sfx.py <silent.mp4> <sfx.wav> <out.mp4>
Exit code 1 if a check fails: an audio stream exists, audio and video lengths within 0.1 s, true peak <= -1.0 dBTP.
"""
import re, shutil, subprocess, sys

ff = shutil.which('ffmpeg') or 'ffmpeg'
video, wav, out = sys.argv[1:4]


def run(args):
    return subprocess.run([ff, '-hide_banner', '-nostdin', *args], capture_output=True, text=True, encoding='utf-8', errors='replace')


def dur(path):
    m = re.search(r'Duration: (\d+):(\d+):([\d.]+)', run(['-i', path]).stderr)
    h, mi, s = m.groups()
    return int(h) * 3600 + int(mi) * 60 + float(s)


vd = dur(video)
af = 'acompressor=threshold=0.05:ratio=3:attack=6:release=160:makeup=3,alimiter=limit=0.84:level=disabled,afade=t=out:st=%.2f:d=0.25' % (vd - 0.25)
r = run(['-y', '-i', video, '-i', wav, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-af', af, '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
         '-t', '%.3f' % vd, '-movflags', '+faststart', out])
if r.returncode != 0:
    print(r.stderr[-1500:]); sys.exit(1)

m = run(['-i', out, '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr
I = re.findall(r'I:\s+(-?[\d.]+) LUFS', m)[-1]
TP = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', m)[-1]
LRA = re.findall(r'LRA:\s+([\d.]+) LU', m)[-1]
ad = dur(out)
streams = run(['-i', out]).stderr
ok = 'Audio:' in streams and 'Video:' in streams and abs(ad - vd) < 0.1 and float(TP) <= -1.0
print(f'audio stream: {"yes" if "Audio:" in streams else "NO"} | length {ad:.2f} s vs video {vd:.2f} s | integrated {I} LUFS | true peak {TP} dBFS | LRA {LRA} LU')
print('PASS' if ok else 'FAIL')
sys.exit(0 if ok else 1)
