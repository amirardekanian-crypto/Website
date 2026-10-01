#!/usr/bin/env python3
"""srt_words.py — turns a caption export (SRT) into the word list that the On Cue piece takes.

    python3 Content/motion/tools/srt_words.py captions.srt                       print JSON: [{ "t": 0.42, "text": "Most" }, ...]
    python3 Content/motion/tools/srt_words.py captions.srt --keys acceleration,short --offset -1.0
        --keys     words to light up as key words (matched without case, punctuation or the joining mark; Farsi works the same way)
        --offset   shift every time by this many seconds (the video may start a moment after the captions)
        --out FILE write the JSON to a file instead of printing it

An SRT gives the time a whole caption starts and ends, not each word. This tool spreads the words across the caption by how long each is,
which is close for natural speech and is always checkable: play it, and move any word that lands early or late. Claude cannot hear, so a
real word-by-word timing (from a speech tool Amir trusts) replaces this when there is one. In the output a word is { t, text, key? }.
"""
import json, re, sys
from pathlib import Path

TIME = re.compile(r'(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)')
STRIP = re.compile(r'[\W_]+', re.UNICODE)


def secs(h, m, s, ms):
    return int(h) * 3600 + int(m) * 60 + int(s) + int(ms.ljust(3, '0')[:3]) / 1000


def norm(w):
    """a word for comparing: lower case, no punctuation, no zero-width joiner (so a Farsi word matches however it was typed)"""
    return STRIP.sub('', w.replace('‌', '')).lower()


def parse(text):
    cues = []
    for block in re.split(r'\n\s*\n', text.replace('\r', '').lstrip('﻿').strip()):
        lines = [l for l in block.split('\n') if l.strip()]
        for i, l in enumerate(lines):
            m = TIME.search(l)
            if m:
                body = ' '.join(lines[i + 1:])
                body = re.sub(r'<[^>]+>', '', body)
                cues.append((secs(*m.groups()[:4]), secs(*m.groups()[4:]), body))
                break
    return cues


def words(cues, keys, offset):
    out = []
    keyset = {norm(k) for k in keys if norm(k)}
    for a, b, body in cues:
        ws = body.split()
        if not ws:
            continue
        weights = [max(2, len(norm(w))) + 1 for w in ws]
        total, t = float(sum(weights)), a
        for w, wt in zip(ws, weights):
            o = {'t': round(t + offset, 3), 'text': w}
            if norm(w) in keyset:
                o['key'] = True
            out.append(o)
            t += (b - a) * wt / total
    return out


def main(argv):
    if not argv or argv[0].startswith('--'):
        print(__doc__); return 2
    keys, offset, out = [], 0.0, None
    i = 1
    while i < len(argv):
        if argv[i] == '--keys': keys = [k.strip() for k in argv[i + 1].split(',')]; i += 2
        elif argv[i] == '--offset': offset = float(argv[i + 1]); i += 2
        elif argv[i] == '--out': out = argv[i + 1]; i += 2
        else: i += 1
    result = words(parse(Path(argv[0]).read_text(encoding='utf-8-sig')), keys, offset)
    text = json.dumps(result, ensure_ascii=False, indent=1)
    if out: Path(out).write_text(text + '\n', encoding='utf-8'); print(f'{len(result)} words -> {out}')
    else: print(text)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
