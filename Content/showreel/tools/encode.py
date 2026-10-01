#!/usr/bin/env python3
"""encode.py — frames + soundtrack -> the finished MP4.

    python3 tools/encode.py FRAMES_DIR SOUNDTRACK.wav OUT.mp4 [--crf 17] [--lufs -14]

 · video: PNG frames (f_0000.png …) at 30 fps -> H.264 High, yuv420p, tagged BT.709 limited range, faststart
 · audio: two-pass EBU R128 loudnorm (linear) to -14 LUFS / -1.5 dBTP (the level social players expect), AAC 192k 48 kHz
 · then proves the file: 1920x1080, 30 fps, exact duration, one video + one audio stream, loudness on target
ffmpeg comes from `pip install imageio-ffmpeg` (a full static build with libx264) unless $FFMPEG is set.
"""
import argparse, json, os, re, subprocess, sys

def ffmpeg_path():
    if os.environ.get('FFMPEG'): return os.environ['FFMPEG']
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()

def run(cmd, capture=False):
    r = subprocess.run(cmd, capture_output=capture, text=True)
    if r.returncode != 0:
        sys.exit(f'ffmpeg failed ({r.returncode}):\n{(r.stderr or "")[-1500:]}')
    return r

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('frames'); ap.add_argument('audio'); ap.add_argument('out')
    ap.add_argument('--crf', type=int, default=17); ap.add_argument('--lufs', type=float, default=-14.0)
    ap.add_argument('--preset', default='slow')
    a = ap.parse_args()
    ff = ffmpeg_path()
    norm = os.path.splitext(a.out)[0] + '.audio-norm.wav'

    # pass 1: measure
    tp = -1.5
    r = run([ff, '-hide_banner', '-nostats', '-i', a.audio, '-af', f'loudnorm=I={a.lufs}:TP={tp}:LRA=11:print_format=json', '-f', 'null', '-'], capture=True)
    j = json.loads(re.search(r'\{[^{}]*"input_i"[^{}]*\}', r.stderr, re.S).group(0))
    print(f"measured: I={j['input_i']} LUFS  TP={j['input_tp']} dBTP  LRA={j['input_lra']} LU")
    # pass 2: apply linearly with the measured values
    af = (f"loudnorm=I={a.lufs}:TP={tp}:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}"
          f":measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true:print_format=summary")
    run([ff, '-y', '-hide_banner', '-nostats', '-i', a.audio, '-af', af, '-ar', '48000', '-c:a', 'pcm_s16le', norm], capture=True)

    vf = 'scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int+bicubic,format=yuv420p'
    run([ff, '-y', '-hide_banner', '-nostats', '-framerate', '30', '-i', os.path.join(a.frames, 'f_%04d.png'), '-i', norm,
         '-vf', vf, '-c:v', 'libx264', '-preset', a.preset, '-crf', str(a.crf), '-profile:v', 'high', '-level', '4.2', '-g', '60', '-bf', '3',
         '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
         '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart', '-shortest', a.out])
    os.remove(norm)

    # verify
    r = run([ff, '-hide_banner', '-i', a.out, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture=True)
    err = r.stderr
    head = err.split('Stream mapping')[0]                             # only the input's own streams, not the analysis graph's
    info = re.findall(r'Stream #0:\d.*?(Video|Audio): ([^\n]*)', head)
    dur = re.search(r'Duration: (\d+):(\d+):([\d.]+)', err); secs = int(dur.group(1)) * 3600 + int(dur.group(2)) * 60 + float(dur.group(3))
    lufs = re.findall(r'I:\s+(-?[\d.]+) LUFS', err)[-1]; peak = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', err)[-1]
    size = os.path.getsize(a.out) / 1e6
    print(f'{a.out}: {size:.1f} MB, {secs:.3f} s')
    for kind, line in info: print(f'  {kind}: {line[:120]}')
    print(f'  loudness {lufs} LUFS, true peak {peak} dBTP')
    ok = abs(secs - 15.0) < .05 and len(info) == 2 and abs(float(lufs) - a.lufs) < 1.0
    print('PASS' if ok else 'CHECK ME'); sys.exit(0 if ok else 1)

if __name__ == '__main__':
    main()
