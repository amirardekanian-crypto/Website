"""One-time (and any-time) check of everything the reel tools need on this PC, installing what is missing and safe to install.

    python .claude/skills/reel/tools/setup_tools.py

Checks node, ffmpeg (PATH, $FFMPEG or imageio-ffmpeg), Microsoft Edge (the tools drive it through playwright-core, `channel: 'msedge'`),
the Python packages numpy / scipy / Pillow, and playwright-core in %TEMP%/reel-tools (installed with npm if missing).
The node tools find that folder by themselves (tools/_pw.js), so nothing has to be exported.
Exit code 0 when everything needed is in place.
"""
import os, shutil, subprocess, sys, tempfile

ok_all = True


def line(name, ok, detail=''):
    global ok_all
    ok_all &= bool(ok)
    print(f"  [{'ok' if ok else 'MISSING'}] {name}" + (f"  {detail}" if detail else ''))


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', shell=isinstance(cmd, str), **kw)


print('reel tools check')
node = shutil.which('node')
line('node', node, run(['node', '--version']).stdout.strip() if node else 'install Node 20+ (winget install OpenJS.NodeJS.LTS)')

ff = os.environ.get('FFMPEG') or shutil.which('ffmpeg')
if not ff:
    try:
        import imageio_ffmpeg
        ff = imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        ff = None
line('ffmpeg', ff, ff or 'python -m pip install --user imageio-ffmpeg  (or winget install Gyan.FFmpeg)')
if ff:
    out = run([ff, '-hide_banner', '-filters']).stdout
    need = ['tmix', 'loudnorm', 'noise', 'ebur128', 'acompressor', 'alimiter']
    miss = [n for n in need if f' {n} ' not in out]
    line('ffmpeg filters (tmix, noise, loudnorm, ebur128, acompressor, alimiter)', not miss, ('missing: ' + ', '.join(miss)) if miss else '')

edge = [p for p in (r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe', r'C:\Program Files\Microsoft\Edge\Application\msedge.exe') if os.path.exists(p)]
line('Microsoft Edge', edge or sys.platform != 'win32', edge[0] if edge else 'Edge ships with Windows 11; on other systems use channel chrome in the tools')

for mod, pip in (('numpy', 'numpy'), ('scipy', 'scipy'), ('PIL', 'Pillow')):
    try:
        __import__(mod); line('python ' + mod, True)
    except Exception:
        line('python ' + mod, False, f'python -m pip install --user {pip}')

tools = os.path.join(tempfile.gettempdir(), 'reel-tools')
pw = os.path.join(tools, 'node_modules', 'playwright-core', 'package.json')
if not os.path.exists(pw) and node:
    print('  installing playwright-core into', tools)
    os.makedirs(tools, exist_ok=True)
    run('npm init -y', cwd=tools)
    r = run('npm i playwright-core', cwd=tools)
    if r.returncode != 0:
        print(r.stderr[-600:])
line('playwright-core', os.path.exists(pw), tools)

print('ALL GOOD' if ok_all else 'SOMETHING IS MISSING (see above)')
sys.exit(0 if ok_all else 1)
