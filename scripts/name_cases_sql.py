#!/usr/bin/env python3
"""The checker's SQL name matching, recorded against the shared cases (audit TWIN-8, 2026-10-11).

check_program.py --spine-sql resolves every card's name on the server with NORM_SQL and LOOSE_SQL. SQL is not something this repo can
run, so the answers those two strings give for the names in scripts/name_cases.json are RECORDED from the live database (read-only), with
a hash of the strings, and scripts/test_check_program.py holds the record to the athlete app's rule (program.html exNameVariants()):
NORM_SQL must give tier 0 and LOOSE_SQL of that must give tier 2. Change either string, or add a name, and the test fails until this is redone.

  python scripts/name_cases_sql.py              print the read-only query; run it with the Supabase MCP (execute_sql)
  python scripts/name_cases_sql.py --save FILE  FILE = the tool's answer saved as it came back; writes the record into name_cases.json

The names and the app's tiers come from  node scripts/check_twins.js --write-names  (after a deliberate change to the app's rule).
"""
import datetime, hashlib, importlib.util, json, os, re, sys

for _s in (sys.stdout, sys.stderr):
    _s.reconfigure(encoding='utf-8')

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CASES = os.path.join(REPO, 'scripts', 'name_cases.json')

def checker():
    spec = importlib.util.spec_from_file_location('check_program', os.path.join(REPO, 'scripts', 'check_program.py'))
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m

def sql_sha(m=None):
    m = m or checker()
    return hashlib.sha256((m.NORM_SQL + '\n' + m.LOOSE_SQL).encode('utf-8')).hexdigest()[:16]

def sql_text(s): return "'" + str(s).replace("'", "''") + "'"

def dump_cases(c):
    """The file's one format (scripts/check_twins.js --write-names writes the same bytes): one name per line."""
    def one(o, pad):
        return '{\n' + ',\n'.join(pad + json.dumps(k, ensure_ascii=False) + ': ' + json.dumps(v, ensure_ascii=False, separators=(',', ':')) for k, v in o.items()) + '\n' + pad[:-2] + '}'
    s = c.get('sql')
    sql = 'null' if not s else ('{\n    "recorded": ' + json.dumps(s['recorded']) + ',\n    "sha": ' + json.dumps(s['sha']) + ',\n    "rows": ' + one(s['rows'], '      ').replace('\n    }', '\n    }') + '\n  }')
    return '{\n  "about": ' + json.dumps(c['about'], ensure_ascii=False) + ',\n  "variants": ' + one(c['variants'], '    ') + ',\n  "sql": ' + sql + '\n}\n'

def query():
    m = checker()
    names = list(json.load(open(CASES, encoding='utf-8'))['variants'])
    arr = ', '.join(sql_text(n) for n in names)
    return (f"-- Read-only. What the checker's --spine-sql gives each shared name: nk = NORM_SQL, lk = LOOSE_SQL of nk.\n"
            f"with cards(n) as (select unnest(array[{arr}]::text[]))\n"
            f"select jsonb_object_agg(n, jsonb_build_array(nk, lk)) as rows\n"
            f"from (select n, nk, {m.LOOSE_SQL.format(n='nk')} lk from (select n, {m.NORM_SQL.format(x='n')} nk from cards) c) z;")

def save(path):
    text = open(path, encoding='utf-8').read()
    try: data = json.loads(text)
    except ValueError:
        m = re.search(r'(\[\s*\{.*\}\s*\])', text, re.S)
        if not m: sys.exit('could not find the query result in ' + path)
        data = json.loads(m.group(1))
    rows = data[0]['rows'] if isinstance(data, list) else data
    if isinstance(rows, str): rows = json.loads(rows)
    c = json.load(open(CASES, encoding='utf-8'))
    missing = [n for n in c['variants'] if n not in rows]
    if missing: sys.exit(f"the result has no row for {len(missing)} names (first: {missing[0]!r}): run the whole query")
    c['sql'] = {'recorded': datetime.date.today().isoformat(), 'sha': sql_sha(), 'rows': {n: rows[n] for n in c['variants']}}
    open(CASES, 'w', encoding='utf-8', newline='\n').write(dump_cases(c))
    print(f"recorded {len(c['variants'])} names, sha {c['sql']['sha']}")

if __name__ == '__main__':
    if len(sys.argv) >= 3 and sys.argv[1] == '--save': save(sys.argv[2])
    else: print(query())
