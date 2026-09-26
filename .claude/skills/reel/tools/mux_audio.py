"""Put Amir's filmed take's sound under a silent reel/ad render, at Instagram loudness, and prove it.

render_mp4.js writes NO audio. An ad (/ad) is one finished MP4 whose only voice is his take, so this is
the last step of every ad export (/ad stage 16-17, /reel Step 9).

    python .claude/skills/reel/tools/mux_audio.py RENDER.mp4 TAKE.mov --out FINAL.mp4
           [--in 2.0]        seconds into the take where the cut starts (he leaves ~2 s of silence at the top)
           [--at 0.0]        seconds into the render where the take's audio starts
           [--music bed.m4a --music-under 20]   optional bed, N LU under his voice and ducked (usually none: music goes on in Instagram)

What it does:
  1. Measures the take (pass 1 of EBU R128 loudnorm) over the part that is used.
  2. Muxes: video copied untouched, take audio high-passed at 80 Hz, normalised to -14 LUFS integrated,
     -1.5 dBTP true peak (pass 2, linear), 48 kHz stereo AAC 192k, delayed to --at, 0.25 s fade-out,
     padded with silence to the render's exact length. With --music: the bed is normalised to --music-under LU below
     the voice (default 20, so -34 LUFS) and a sidechain compressor keyed on his voice ducks it further while he speaks; a limiter holds -1.5 dBTP.
  3. Checks the result: an audio stream exists, integrated loudness within +-1 LU of -14, true peak
     <= -1.0 dBTP, audio and video lengths within 0.1 s. Exits 1 if any check fails.

ffmpeg: $FFMPEG, PATH, or imageio-ffmpeg (on Amir's PC:
%APPDATA%\\Python\\Python314\\site-packages\\imageio_ffmpeg\\binaries\\ffmpeg-win-x86_64-v7.1.exe).
No ffprobe ships with imageio-ffmpeg, so every check here uses ffmpeg itself.
"""
import argparse, json, os, re, shutil, subprocess, sys

TARGET_I, TARGET_TP, TARGET_LRA = -14.0, -1.5, 11


def find_ffmpeg():
    if os.environ.get("FFMPEG"):
        return os.environ["FFMPEG"]
    if shutil.which("ffmpeg"):
        return shutil.which("ffmpeg")
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        sys.exit("No ffmpeg found. Run: python -m pip install --user imageio-ffmpeg")


def run(ff, args):
    # -nostdin matters: without it ffmpeg can sit waiting on the terminal under Git Bash.
    return subprocess.run([ff, "-hide_banner", "-nostdin", *args], capture_output=True, text=True,
                          encoding="utf-8", errors="replace")


def duration(ff, path):
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", run(ff, ["-i", path]).stderr)
    if not m:
        sys.exit(f"Cannot read the duration of {path}")
    h, mi, s = m.groups()
    return int(h) * 3600 + int(mi) * 60 + float(s)


def stream_len(ff, path, sel):
    r = run(ff, ["-i", path, "-map", f"0:{sel}:0", "-c", "copy", "-f", "null", "-"])
    if r.returncode != 0:
        return None
    t = re.findall(r"time=(\d+):(\d+):([\d.]+)", r.stderr)
    if not t:
        return None
    h, mi, s = t[-1]
    return int(h) * 3600 + int(mi) * 60 + float(s)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("render")
    ap.add_argument("take")
    ap.add_argument("--out", required=True)
    ap.add_argument("--in", dest="t_in", type=float, default=0.0)
    ap.add_argument("--at", type=float, default=0.0)
    ap.add_argument("--music")
    ap.add_argument("--music-under", type=float, default=20.0)
    a = ap.parse_args()
    ff = find_ffmpeg()

    vdur = duration(ff, a.render)
    use = max(0.1, vdur - a.at)  # seconds of take that fit after --at

    # 1. measure
    r = run(ff, ["-ss", str(a.t_in), "-t", f"{use:.3f}", "-i", a.take, "-vn", "-af",
                 f"highpass=f=80,loudnorm=I={TARGET_I}:TP={TARGET_TP}:LRA={TARGET_LRA}:print_format=json",
                 "-f", "null", "-"])
    js = r.stderr[r.stderr.rfind("{"):r.stderr.rfind("}") + 1]
    try:
        m = json.loads(js)
    except ValueError:
        sys.exit("Could not measure the take. Does it have an audio track?\n" + r.stderr[-800:])
    print(f"take measured: {m['input_i']} LUFS, {m['input_tp']} dBTP")

    fade_st = max(0.0, vdur - 0.25)
    delay_ms = int(round(a.at * 1000))
    voice = (f"highpass=f=80,loudnorm=I={TARGET_I}:TP={TARGET_TP}:LRA={TARGET_LRA}"
             f":measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
             f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true"
             f",aresample=48000,aformat=channel_layouts=stereo,adelay={delay_ms}:all=1")
    tail = f"afade=t=out:st={fade_st:.3f}:d=0.25,apad=whole_dur={vdur:.3f}"

    # 2. mux (video stream copied; -t pins the length, -shortest with apad can hang)
    args = ["-y", "-i", a.render, "-ss", str(a.t_in), "-t", f"{use:.3f}", "-i", a.take]
    if a.music:
        args += ["-stream_loop", "-1", "-i", a.music]
        fc = (f"[1:a]{voice},asplit=2[v][key];"
              f"[2:a]aresample=48000,aformat=channel_layouts=stereo,loudnorm=I={TARGET_I - a.music_under}:TP=-6:LRA=11[bed];"
              f"[bed][key]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=300[duck];"
              f"[v][duck]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.84:level=0,{tail}[a]")
        args += ["-filter_complex", fc, "-map", "0:v:0", "-map", "[a]"]
    else:
        args += ["-map", "0:v:0", "-map", "1:a:0", "-af", f"{voice},{tail}"]
    args += ["-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-t", f"{vdur:.3f}",
             "-movflags", "+faststart", a.out]
    r = run(ff, args)
    if r.returncode != 0:
        sys.exit("mux failed\n" + r.stderr[-1500:])

    # 3. check
    ok = True
    r = run(ff, ["-i", a.out, "-map", "0:a:0", "-af", "ebur128=peak=true", "-f", "null", "-"])
    if r.returncode != 0:
        print("FAIL no audio stream in the output")
        sys.exit(1)
    summ = r.stderr[r.stderr.rfind("Summary:"):]
    i = float(re.search(r"I:\s+(-?[\d.]+) LUFS", summ).group(1))
    pk = re.search(r"Peak:\s+(-?[\d.]+|-inf) dBFS", summ).group(1)
    pk = float("-inf") if pk == "-inf" else float(pk)
    al, vl = stream_len(ff, a.out, "a"), stream_len(ff, a.out, "v")
    print(f"out: audio {al:.2f}s video {vl:.2f}s, {i:.1f} LUFS, true peak {pk:.1f} dBTP")
    if abs(i - TARGET_I) > 1.0:
        print(f"FAIL loudness {i:.1f} LUFS, want {TARGET_I:.0f} +-1"); ok = False
    if pk > -1.0:
        print(f"FAIL true peak {pk:.1f} dBTP, want <= -1.0"); ok = False
    if al is None or vl is None or abs(al - vl) > 0.1:
        print("FAIL audio and video lengths differ"); ok = False
    print("PASS" if ok else "CHECK FAILED")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
