"""Turn a piece of footage into a numbered frame sequence a timeline reel can draw by time (a "plate").

A <video> element obeys neither the page clock nor the renderer, so the timeline engine never plays one: it draws the frame that
belongs at time t from a folder of stills (engine.js: plateLoad / plateAt / plateDraw). The picture is then a pure function of time like
everything else, so the frame-accurate render, the motion blur and a still at any instant all stay exact. Footage has its own motion blur,
so showing the nearest frame inside the shutter looks right.

    python extract_plate.py <video> <outDir> [--fps 30] [--width 720] [--from 0] [--to N] [--quality 3]

Writes outDir/f_00001.jpg ... and outDir/plate.json {count, fps, width, height}. 30 fps matches the reel. 720 px wide is enough for a window or a
phone-sized card; for a full-bleed 1080x1920 plate use --width 1080 (about 0.2 MB per frame: a 10 s plate is 60 MB, keep it OUT of the repo,
or keep only a lean copy: --quality 6 --fps 24).
To use it, in the reel's scenes file:
    plateLoad('take', { dir: '../assets/plates/take', count: <count>, fps: 30 });          // before init() finishes: it adds itself to PRELOAD
    plateDraw(ctx2d, 'take', t - AT + IN, 0, 0, canvas.width, canvas.height);               // cover-fit into the canvas box
His voice goes back on afterwards with tools/mux_audio.py (same IN / AT numbers).
Preview note: a reel with plates loads its frames by relative path, so it is not a single self-contained file; the MP4 is the deliverable.
"""
import json, os, re, shutil, subprocess, sys


def ffmpeg():
    p = os.environ.get('FFMPEG') or shutil.which('ffmpeg')
    if p:
        return p
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def opt(name, default):
    a = sys.argv
    return type(default)(a[a.index(name) + 1]) if name in a else default


def main():
    pos = [a for i, a in enumerate(sys.argv[1:], 1) if not a.startswith('--') and not sys.argv[i - 1].startswith('--')]
    if len(pos) < 2:
        print(__doc__); sys.exit(2)
    video, out = pos[0], pos[1]
    fps, width, start, q = opt('--fps', 30), opt('--width', 720), opt('--from', 0.0), opt('--quality', 3)
    to = opt('--to', 0.0)
    os.makedirs(out, exist_ok=True)
    for f in os.listdir(out):
        if f.startswith('f_') or f == 'plate.json':
            os.remove(os.path.join(out, f))
    ff = ffmpeg()
    cmd = [ff, '-hide_banner', '-loglevel', 'error', '-y', '-ss', str(start)]
    if to:
        cmd += ['-t', str(to - start)]
    cmd += ['-i', video, '-vf', f'fps={fps},scale={width}:-2:flags=lanczos', '-q:v', str(q), os.path.join(out, 'f_%05d.jpg')]
    r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if r.returncode != 0:
        print(r.stderr[-800:]); sys.exit(1)
    frames = sorted(f for f in os.listdir(out) if re.match(r'f_\d+\.jpg$', f))
    from PIL import Image
    w, h = Image.open(os.path.join(out, frames[0])).size
    meta = {'count': len(frames), 'fps': fps, 'width': w, 'height': h}
    json.dump(meta, open(os.path.join(out, 'plate.json'), 'w'))
    size = sum(os.path.getsize(os.path.join(out, f)) for f in frames) / 1048576
    print(f"{len(frames)} frames at {fps} fps, {w}x{h}, {size:.1f} MB -> {os.path.basename(out)}  ({len(frames) / fps:.2f} s)")


if __name__ == '__main__':
    main()
