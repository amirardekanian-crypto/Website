#!/usr/bin/env python3
"""Turn the connector's saved answer to `check_program.py --spine-sql --pad` into the --spine file.

Why (2026-10-17): the checker needs a byte-exact copy of the database's answer (it verifies md5 checksums), and the
answer is ~30 KB, so retyping it costs tokens and invites slips. With --pad the answer is too large to come back
inline, the connector saves it to a file, and this script copies it out: the padding column dropped, every checksum
verified. Reads the file as the connector wrote it (a JSON list of text parts, or the raw text).

  python scripts/save_spine_result.py <saved tool result> <scratch>/spine_<id>.json
"""
import hashlib, json, re, sys

def rows_from(raw):
    text = raw
    try:
        o = json.loads(raw)
        if isinstance(o, list): text = ''.join(p.get('text', '') for p in o if isinstance(p, dict))
        elif isinstance(o, dict) and 'result' in o: text = raw
    except ValueError:
        pass
    try: text = json.loads(text)['result']
    except (ValueError, KeyError, TypeError): pass
    m = re.search(r'<untrusted-data-[^>]+>\s*(\[.*\])\s*</untrusted-data', text, re.S)   # the second tag: the first is in the warning sentence
    if not m: sys.exit('no result rows found in that file')
    return json.loads(m.group(1))

def main():
    if len(sys.argv) != 3: sys.exit(__doc__)
    rows = rows_from(open(sys.argv[1], encoding='utf-8').read())
    bad = []
    for r in rows:
        r.pop('_pad', None)
        for k in ('spine', 'names', 'ledger', 'purposes', 'texts'):
            if k + '_md5' in r and hashlib.md5((r.get(k) or '').encode()).hexdigest() != r[k + '_md5']: bad.append(k)
    if bad: sys.exit('checksum mismatch: ' + ', '.join(bad) + ' (nothing written)')
    json.dump(rows, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False)
    print(f"saved {sys.argv[2]}: {len(rows)} row(s), checksums ok")

if __name__ == '__main__':
    main()
