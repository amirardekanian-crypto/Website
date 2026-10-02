"""Whole-clip cut-out of the speaker with RobustVideoMatting (RVM): the faster, steadier way to make full_cut_t.webm for the depth family.

  python rvm_cutout.py <full_src.mp4> <out dir> [--start S] [--seconds N] [--ratio 0.25] [--trim 2] [--feather 1.0] [--name full_cut_t.webm]

Same job as cutout.py's u2net route (u2net_human_seg through `hyperframes remove-background`, about 7 s of work per second of footage) and the same file at
the end: a 1080x1920, 30 fps VP9 WebM with an alpha channel whose time zero is time zero of the input. RVM is a video matting model with memory (it carries
a recurrent state from frame to frame), so the edge does not flicker the way a per-frame segmentation does, and it keeps the shirt where u2net let the lower
hem fade into the backdrop. The model (rvm_mobilenetv3_fp32.onnx, 14,975,696 bytes, sha256 88d45312...cbbd2828, the project's v1.0.0 release) is in
C:\\Users\\Amir\\tools\\rvm and runs on the CPU through onnxruntime. The project is GPL-3.0: using the model as a tool does not put that licence on his
videos, but never copy its code into the kit.

How it runs: this script feeds the model and writes ONLY the alpha (one byte a pixel) into a second ffmpeg. That ffmpeg reads the same clip itself, trims the
alpha (erosion x N, then a feather: the trim cutout.py's step 3 does, here in the same pass), merges it with the picture and encodes VP9 once. The colour is
the clip's own pixels, never a second encode of them.

  input     the 1080x1920, 30 fps clip cutout.py makes (full_src.mp4). Anything else is scaled and re-timed to that on the way in, but then the picture and the
            alpha come from two separate decodes of the same file, so keep it a constant-frame-rate file.
  --ratio   the model works on the frame scaled by this much and refines at full size: 0.25 (default, about 55 ms a frame here), 0.375 (95 ms, finer hair), 0.5 (160 ms)
  --trim    3x3 erosions of the alpha before the feather (cutout.py used 2). Hides a thin light rim of the wall on DARK backdrops.
  --feather sigma of the blur after the erosion (1.0 as in cutout.py; 0 = none)
  --warm    frames of warm-up on the first frame, so the model's memory is set before the first real one (default 3)
Needs onnxruntime (pip install onnxruntime) and numpy. Prints frames per second as it goes.
"""
import argparse
import os
import queue
import shutil
import subprocess
import sys
import threading
import time

import numpy as np

MODEL = r"C:\Users\Amir\tools\rvm\rvm_mobilenetv3_fp32.onnx"
W, H, FPS = 1080, 1920, 30


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("src")
    ap.add_argument("out")
    ap.add_argument("--start", type=float, default=0.0)
    ap.add_argument("--seconds", type=float, default=0.0)
    ap.add_argument("--ratio", type=float, default=0.25)
    ap.add_argument("--trim", type=int, default=2)
    ap.add_argument("--feather", type=float, default=1.0)
    ap.add_argument("--warm", type=int, default=3)
    ap.add_argument("--name", default="full_cut_t.webm")
    ap.add_argument("--cpu-used", type=int, default=4, help="VP9 speed: 3 is slower and a little smaller")
    ap.add_argument("--threads", type=int, default=0, help="model threads (0 = the number of real cores)")
    a = ap.parse_args()

    import onnxruntime as ort

    os.makedirs(a.out, exist_ok=True)
    out = os.path.join(a.out, a.name)
    ff = shutil.which("ffmpeg") or "ffmpeg"
    so = ort.SessionOptions()
    if a.threads:
        so.intra_op_num_threads = a.threads
    sess = ort.InferenceSession(MODEL, so, providers=["CPUExecutionProvider"])
    dsr = np.array([a.ratio], dtype=np.float32)
    fixed = "scale=%d:%d:flags=lanczos,fps=%d" % (W, H, FPS)
    seek = ["-ss", "%.3f" % a.start] if a.start else []
    dur = ["-t", "%.3f" % a.seconds] if a.seconds else []

    # the alpha: erosions, then a feather, on the gray plane the model fills; then merged with the picture
    m = "[1:v]format=gray" + ",erosion" * a.trim + (",gblur=sigma=%g" % a.feather if a.feather > 0 else "") + "[m]"
    fc = "[0:v]%s,format=yuv420p[c];%s;[c][m]alphamerge,format=yuva420p" % (fixed, m)
    cmd_in = [ff, "-v", "error"] + seek + dur + ["-i", a.src, "-vf", fixed + ",format=rgb24", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    cmd_out = [ff, "-y", "-v", "error"] + seek + dur + ["-i", a.src, "-f", "rawvideo", "-pix_fmt", "gray", "-s", "%dx%d" % (W, H), "-r", str(FPS), "-i", "-",
                                                       "-filter_complex", fc, "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "16", "-row-mt", "1",
                                                       "-tile-columns", "2", "-cpu-used", str(a.cpu_used), "-auto-alt-ref", "0", "-an", "-metadata:s:v:0", "alpha_mode=1", out]
    pin = subprocess.Popen(cmd_in, stdout=subprocess.PIPE)
    pout = subprocess.Popen(cmd_out, stdin=subprocess.PIPE)

    q_in, q_out = queue.Queue(maxsize=4), queue.Queue(maxsize=4)
    size = W * H * 3

    def reader():  # decode -> float tensor, a few frames ahead of the model
        try:
            while True:
                buf = pin.stdout.read(size)
                if len(buf) < size:
                    return
                frame = np.frombuffer(buf, dtype=np.uint8).reshape(H, W, 3)
                q_in.put(np.ascontiguousarray(frame.transpose(2, 0, 1)[None]).astype(np.float32) * (1.0 / 255.0))
        finally:
            q_in.put(None)  # whatever happened, the model loop must not wait for ever

    failed = []

    def writer():  # alpha bytes -> the encoder; if the encoder dies, keep draining so the model loop can finish and say so
        while True:
            b = q_out.get()
            if b is None:
                return
            if not failed:
                try:
                    pout.stdin.write(b)
                except OSError as e:
                    failed.append(e)

    threading.Thread(target=reader, daemon=True).start()
    wt = threading.Thread(target=writer, daemon=True)
    wt.start()

    rec = [np.zeros([1, 1, 1, 1], dtype=np.float32)] * 4
    names = ["pha", "r1o", "r2o", "r3o", "r4o"]
    n, t0, t_model = 0, time.time(), 0.0
    while True:
        x = q_in.get()
        if x is None:
            break
        if n == 0:
            for _ in range(max(a.warm, 0)):
                _, *rec = sess.run(names, {"src": x, "r1i": rec[0], "r2i": rec[1], "r3i": rec[2], "r4i": rec[3], "downsample_ratio": dsr})
        t1 = time.time()
        pha, *rec = sess.run(names, {"src": x, "r1i": rec[0], "r2i": rec[1], "r3i": rec[2], "r4i": rec[3], "downsample_ratio": dsr})
        t_model += time.time() - t1
        q_out.put((pha[0, 0] * 255.0 + 0.5).astype(np.uint8).tobytes())
        n += 1
        if n % 90 == 0:
            el = time.time() - t0
            print("  frame %d (%.1f s of footage) | %.1f fps overall, model alone %.1f fps" % (n, n / FPS, n / el, n / t_model), file=sys.stderr, flush=True)
    q_out.put(None)
    wt.join()
    try:
        pout.stdin.close()
    except OSError:
        pass
    pout.wait()
    pin.wait()
    el = time.time() - t0
    if n == 0:
        sys.exit("no frames were decoded from %s (wrong path, or nothing after --start?)" % a.src)
    print("done: %d frames (%.1f s of footage) in %.0f s = %.2f s of work per second of footage -> %s" % (n, n / FPS, el, el / max(n / FPS, 1e-9), out))
    if pout.returncode or failed:
        sys.exit("the encoder failed (exit %s)%s" % (pout.returncode, " after its input pipe broke" if failed else ""))


if __name__ == "__main__":
    main()
