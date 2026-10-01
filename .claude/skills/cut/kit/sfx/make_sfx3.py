"""Synthesise three more kit sounds with ffmpeg (no downloads): tick (one click), roll (an odometer slowing down: clicks that spread out), swipe (a highlighter pass)."""
import os
import subprocess

FF = r"C:\Users\Amir\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe"
OUT = r"C:\Users\Amir\.claude\skills\cut\kit\sfx"


def run(args):
    r = subprocess.run([FF, "-y", "-hide_banner", "-loglevel", "error"] + args, capture_output=True, text=True)
    if r.returncode:
        raise SystemExit(r.stderr[-800:])


# one click
click = "aevalsrc='0.7*sin(2*PI*2600*t)*exp(-110*t)+0.35*(random(0)-0.5)*exp(-260*t)':d=0.07:s=48000"
run(["-f", "lavfi", "-i", click, "-af", "afade=t=in:d=0.001", os.path.join(OUT, "tick.wav")])

# roll: clicks whose gaps grow like a counter slowing down (first gap 28 ms, each 1.14x longer), about 1.0 s in all
times, t, gap = [], 0.0, 0.028
while t < 0.95:
    times.append(t)
    t += gap
    gap *= 1.14
n = len(times)
labels = "".join("[c%d]" % i for i in range(n))
graph = "[0:a]asplit=%d%s;" % (n, labels)
graph += "".join("[c%d]adelay=%d|%d[d%d];" % (i, int(times[i] * 1000), int(times[i] * 1000), i) for i in range(n))
graph += "".join("[d%d]" % i for i in range(n)) + "amix=inputs=%d:normalize=0,volume=1.6,atrim=0:1.05[o]" % n
run(["-f", "lavfi", "-i", click, "-filter_complex", graph, "-map", "[o]", "-ar", "48000", os.path.join(OUT, "roll.wav")])

# swipe: a highlighter pass, filtered noise that rises and falls
run(["-f", "lavfi", "-i", "anoisesrc=d=0.45:c=white:r=48000:a=0.8", "-af",
     "highpass=f=1400,lowpass=f=7500,afade=t=in:d=0.12,afade=t=out:st=0.2:d=0.25,volume=0.9", os.path.join(OUT, "swipe.wav")])
print("clicks in roll:", n)
for f in ("tick.wav", "roll.wav", "swipe.wav"):
    print(f, os.path.getsize(os.path.join(OUT, f)))
