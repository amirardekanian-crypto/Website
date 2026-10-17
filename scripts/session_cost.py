#!/usr/bin/env python3
"""What one Claude Code session cost, and where the tokens went (PRC-29; .claude/skills/PIPELINE-RUN.md).

Why (2026-10-17): a new athlete's pipeline run cost about $36, half of it re-reading one conversation that grew to
781k tokens, and nobody knew until the transcript was taken apart by hand. Run this at the end of a run (or on an
old one) and paste the summary into the handoff.

  python scripts/session_cost.py <transcript.jsonl>          # one session
  python scripts/session_cost.py --latest                    # the newest transcript of this repo's sessions

Transcripts live in ~/.claude/projects/<the repo folder, with / turned into ->/. Standard library only.
"""
import glob, json, os, sys
from datetime import datetime

def ts(o):
    t = o.get('timestamp')
    return datetime.fromisoformat(t.replace('Z', '+00:00')) if t else None

def text_len(c):
    if isinstance(c, str): return len(c)
    return sum(len(b.get('text', '')) if b.get('type') == 'text' else len(json.dumps(b)) for b in c or [] if isinstance(b, dict))

def main(path):
    recs = [json.loads(l) for l in open(path, encoding='utf-8') if l.strip()]
    calls, tools, results, humans, gaps, cost = {}, {}, [], [], [], None
    prev = None
    for i, o in enumerate(recs):
        t = ts(o)
        if t and prev and (t - prev[0]).total_seconds() > 300:
            gaps.append((prev[0], t, prev[1]))
        if o.get('type') == 'cost-state': cost = o
        if o.get('type') == 'assistant':
            m = o['message']; u = m.get('usage') or {}
            c = calls.setdefault(m.get('id'), {'i': i, 't': t, 'ctx': (u.get('input_tokens') or 0) + (u.get('cache_read_input_tokens') or 0)
                                               + (u.get('cache_creation_input_tokens') or 0), 'out': u.get('output_tokens') or 0, 'vis': 0})
            last = None
            for b in m.get('content', []):
                if b.get('type') == 'text': c['vis'] += len(b['text'])
                if b.get('type') == 'tool_use':
                    c['vis'] += len(json.dumps(b.get('input')))
                    inp = b.get('input') or {}
                    tools[b['id']] = (b['name'], str(inp.get('file_path') or inp.get('command') or inp.get('query') or inp.get('description') or '')[:90].replace('\n', ' '))
                    last = b['name']
            if t: prev = (t, 'waiting on ' + ('Amir' if last == 'AskUserQuestion' else f'a tool ({last})' if last else 'Amir'))
        elif o.get('type') == 'user':
            c = o['message'].get('content')
            if (o.get('origin') or {}).get('kind') == 'human':
                humans.append((o['message'].get('content') if isinstance(c, str) else ' '.join(b.get('text', '') for b in c if isinstance(b, dict)))[:60])
            if isinstance(c, list):
                for b in c:
                    if isinstance(b, dict) and b.get('type') == 'tool_result':
                        results.append((text_len(b.get('content')),) + tools.get(b.get('tool_use_id'), ('?', '?')))
            if t: prev = (t, 'working')
        elif t and o.get('type') in ('system', 'queue-operation'):
            pass
    cl = sorted(calls.values(), key=lambda c: c['i'])
    if not cl: sys.exit('no assistant calls in that file')
    reread = sum(c['ctx'] for c in cl)
    think = sum(max(0, c['out'] - c['vis'] // 4) for c in cl)
    print(f"session: {os.path.basename(path)}")
    print(f"calls: {len(cl)} · first context {cl[0]['ctx']//1000}k · peak {max(c['ctx'] for c in cl)//1000}k · average {reread//len(cl)//1000}k")
    print(f"context re-read in total: {reread/1e6:.1f}M tokens · output {sum(c['out'] for c in cl)//1000}k (about {think//1000}k of it thinking, which stays in the conversation)")
    if cost: print(f"the session's own cost record: ${cost.get('totalCostUSD', 0):.2f} (API prices; subagents included)")
    print(f"messages from you: {len(humans)}")
    big = sorted(results, reverse=True)[:8]
    print('largest tool results (chars, tool, what):')
    for n, name, d in big: print(f"  {n:7d}  {name[:24]:24s} {d}")
    stalls = list({(f'{a:%m-%d %H:%M}', f'{b:%H:%M}'): (a, b, why) for a, b, why in gaps if why.startswith('waiting on a tool')}.values())
    if stalls:
        print('stalls (a tool call with no answer for over 5 minutes):')
        for a, b, why in stalls: print(f"  {a:%m-%d %H:%M} to {b:%H:%M} ({(b - a).seconds // 60} min) {why}")
    print('signals: ' + '; '.join(x for x in [
        'peak context over 400k: split the run into helpers (PRC-29)' if max(c['ctx'] for c in cl) > 400_000 else '',
        'thinking is over a third of the output: lower the effort of the mechanical stages' if think > sum(c['out'] for c in cl) / 3 else '',
        f'{len(stalls)} stall(s): read back after every timeout, arm a check-in' if stalls else ''] if x) or 'none')

if __name__ == '__main__':
    if len(sys.argv) != 2: sys.exit(__doc__)
    p = sys.argv[1]
    if p == '--latest':
        folder = os.path.join(os.path.expanduser('~'), '.claude', 'projects', os.getcwd().replace('/', '-').replace('\\', '-').replace(':', '-'))
        files = sorted(glob.glob(os.path.join(folder, '*.jsonl')), key=os.path.getmtime)
        if not files: sys.exit(f'no transcripts in {folder}')
        p = files[-1]
    main(p)
