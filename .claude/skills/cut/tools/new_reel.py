"""Start a new reel from the kit.

  python new_reel.py <slug>

Makes C:\\Users\\Amir\\Videos\\Reels\\<slug>\\v1\\ with public/ filled from the kit (runtime, fonts, images, gsap, sounds) and a
build.py to edit. Nothing is cut or rendered yet. The rest of the workflow is in SKILL.md: stage the footage, transcribe,
find the idea, write the plan, then fill in SEGMENTS / BLOCKS / SFX in build.py.
"""
import os
import sys

sys.path.insert(0, r"C:\Users\Amir\.claude\skills\cut\kit")
import kit  # noqa: E402

SKELETON = '''"""Reel %%SLUG%%, v1. Fill in SEGMENTS (the edit plan), BLOCKS (kit calls and anything bespoke) and SFX, then:
  python build.py
  bash C:/Users/Amir/.claude/skills/cut/tools/shots.sh <this folder> "<times>" build.py     (look at every contact sheet)
  hyperframes render public -o %%SLUG%%_raw.mp4 --fps 30
  python C:/Users/Amir/.claude/skills/cut/tools/loud.py %%SLUG%%_raw.mp4 ../%%SLUG%%_v1.mp4
Blocks are ingredients: see C:/Users/Amir/.claude/skills/cut/kit/BLOCKS.md, and kit/USAGE.md for the rotation rules.
Every reel needs one bespoke moment: put its CSS in css=, its elements in html=, its tweens in BLOCKS.
"""
import os
import sys

sys.path.insert(0, r"C:\\Users\\Amir\\.claude\\skills\\cut\\kit")
import kit

ROOT = os.path.dirname(os.path.abspath(__file__))
TR = os.path.join(ROOT, "..", "transcript.json")  # from: hyperframes transcribe RAW -d <slug folder> --engine whisper --model large-v3 --language fa --json

# Source seconds. rate: 1.0 as spoken. zoom: 1.0 wide, 1.12-1.22 cut-in. punch: settle on the cut. drift: slow push-in.
# Cut inside real silences; change speed on sentence or pause boundaries.
SEGMENTS = [
    {"in": 0.0, "out": 5.0, "rate": 1.0, "zoom": 1.0, "drift": 0.05},
]

BLOCKS = """
K.stamps(["..."], { at: [E(1.0)], variant: "pop", out: E(4.0) });
"""

SFX = [(1.0, "pop")]  # (source seconds, sound): pop whoosh ding thock hit stamp

kit.build(ROOT, "%%SLUG%%", SEGMENTS, BLOCKS, sfx=SFX, transcript=TR)
'''

slug = sys.argv[1]
root = os.path.join(r"C:\Users\Amir\Videos\Reels", slug, "v1")
pub = os.path.join(root, "public")
os.makedirs(pub, exist_ok=True)
kit.scaffold(pub)
build = os.path.join(root, "build.py")
if not os.path.exists(build):
    open(build, "w", encoding="utf-8").write(SKELETON.replace("%%SLUG%%", slug))
print("ready:", root)
print("next: stage the footage into public/ (input-video.mp4, voice.m4a), transcribe to", os.path.join(root, "..", "transcript.json"))
