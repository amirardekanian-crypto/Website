#!/usr/bin/env python3
"""What one Claude Code session cost, and where the tokens went (PRC-29; .claude/skills/PIPELINE-RUN.md).

Why (2026-10-17): a new athlete's pipeline run cost about $36, half of it re-reading one conversation that grew to
781k tokens, and nobody knew until the transcript was taken apart by hand. Run this at the end of a run (or on an
old one) and paste the summary into the handoff.

  python scripts/session_cost.py <transcript.jsonl>          # one session
  python scripts/session_cost.py --latest                    # the newest transcript of this repo's sessions
  python scripts/session_cost.py --helpers <transcript.jsonl>   # same, and say so when there are no helpers

Helpers (2026-10-18): the numbers above are the main conversation only. Subagents and workflow agents keep their own
transcripts in <session id>/subagents/**/*.jsonl next to <session id>.jsonl, and a big run spends most of its tokens
there. When that folder exists a short block follows the output: per model the calls, cache writes, cache reads, fresh
input, output and total for main and helpers, a grand total, and the ten biggest helpers with their first-call and peak
context. A message is counted ONCE: a transcript repeats a message id while it streams, so each usage field takes its
maximum per id. --helpers also works with --latest.

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

KEYS = ('input_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens', 'output_tokens')

def read_msgs(f):
    """One record per API message id in a transcript: the max of each usage field. Returns [(model, usage dict)] in order."""
    recs, order = {}, []
    for line in open(f, encoding='utf-8', errors='replace'):
        try: o = json.loads(line)
        except Exception: continue
        m = o.get('message') if isinstance(o.get('message'), dict) else None
        if not m or m.get('role') != 'assistant' or 'usage' not in m: continue
        k = m.get('id') or id(o)
        if k not in recs: order.append(k); recs[k] = {'model': m.get('model', '?')}
        recs[k]['model'] = m.get('model', recs[k]['model'])
        for x in KEYS: recs[k][x] = max(recs[k].get(x, 0), int(m['usage'].get(x) or 0))
    return [recs[k] for k in order]

def helpers(path, force=False):
    sub = os.path.join(os.path.splitext(path)[0], 'subagents')
    files = glob.glob(os.path.join(sub, '**', '*.jsonl'), recursive=True)
    if not files:
        if force: print('helpers: none (no subagents folder next to this transcript)')
        return
    tot, rows = {}, []
    for who, fl in (('main', [path]), ('helpers', files)):
        for f in fl:
            msgs = read_msgs(f)
            for r in msgs:
                t = tot.setdefault((who, r['model']), dict.fromkeys(KEYS, 0) | {'calls': 0})
                t['calls'] += 1
                for x in KEYS: t[x] += r[x]
            if who == 'helpers' and msgs:
                ctx = [r['input_tokens'] + r['cache_creation_input_tokens'] + r['cache_read_input_tokens'] for r in msgs]
                rows.append((sum(ctx) + sum(r['output_tokens'] for r in msgs), os.path.basename(f)[:28], msgs[-1]['model'].replace('claude-', ''), len(msgs), ctx[0], max(ctx)))
    def line(label, t):
        allin = t['input_tokens'] + t['cache_creation_input_tokens'] + t['cache_read_input_tokens']
        return (f"{label} calls {t['calls']:4}  fresh-in {t['input_tokens']:>9,}  cache-write {t['cache_creation_input_tokens']:>11,}  "
                f"cache-read {t['cache_read_input_tokens']:>12,}  out {t['output_tokens']:>9,}  total {allin + t['output_tokens']:>12,}")
    print(f"\nhelpers: {len(files)} transcript(s) next to the main one")
    g, gh = dict.fromkeys(KEYS, 0) | {'calls': 0}, dict.fromkeys(KEYS, 0) | {'calls': 0}
    for (who, model), t in sorted(tot.items()):
        print(line(f"{who:8} {model:26}", t))
        for x in list(KEYS) + ['calls']:
            g[x] += t[x]
            if who == 'helpers': gh[x] += t[x]
    print(line('helpers total'.ljust(35), gh))
    print(line('GRAND TOTAL main + helpers'.ljust(35), g))
    rows.sort(reverse=True)
    print('biggest helpers (file, model, calls, first context, peak context, total):')
    for t, n, mo, c, f0, pk in rows[:10]:
        print(f"  {n:28} {mo:14} {c:5} {f0/1e3:7.0f}k {pk/1e3:7.0f}k {t/1e6:6.2f}M")

if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if a != '--helpers']
    force = len(args) != len(sys.argv) - 1
    if len(args) != 1: sys.exit(__doc__)
    p = args[0]
    if p == '--latest':
        import re
        root = os.path.join(os.path.expanduser('~'), '.claude', 'projects')
        # Claude turns every character that is not a letter, digit or dash into a dash (Cyrillic too).
        folder = os.path.join(root, re.sub(r'[^A-Za-z0-9-]', '-', os.getcwd()))
        files = sorted(glob.glob(os.path.join(folder, '*.jsonl')), key=os.path.getmtime)
        if not files:  # fall back to the newest folder that ends in this repo's name
            alt = [d for d in glob.glob(os.path.join(root, '*GitHub-Website')) if glob.glob(os.path.join(d, '*.jsonl'))]
            if alt:
                folder = max(alt, key=lambda d: max(os.path.getmtime(f) for f in glob.glob(os.path.join(d, '*.jsonl'))))
                files = sorted(glob.glob(os.path.join(folder, '*.jsonl')), key=os.path.getmtime)
        if not files: sys.exit(f'no transcripts in {folder}')
        p = files[-1]
    main(p)
    helpers(p, force)
