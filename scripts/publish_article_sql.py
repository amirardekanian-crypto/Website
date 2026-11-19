#!/usr/bin/env python3
"""
publish_article_sql.py: print the SQL that publishes one article to the app (public.library).

WHY (Amir, 2026-11-19: "publish on my app and it should be automatic from now")
  The /article skill used to stop at the website and leave the app step to Amir (coach.html ->
  Library -> + Publish article). Now the skill does it: this script turns the English article
  file into ONE upsert statement, the session runs it with the Supabase MCP tool (execute_sql),
  and reads the row back. It does exactly what coach.html's pickLibraryFile('article') does:

  - refuses a Farsi file (.fa.json, "lang", "sourceHash" or "translationOf"): it would replace
    the English article for every athlete;
  - needs "id" and "category"; the category title ("Mental") becomes the shelf id ("mental")
    from articles/index.json;
  - slug = articles/<shelf>/<id>, upserted on slug;
  - an article Amir HID stays hidden (published is only set on a new row);
  - the same id on ANOTHER shelf stops the whole statement (it would show twice).

USAGE
  python scripts/publish_article_sql.py articles/mental/<slug>.json > /tmp/publish.sql
  then run the file's text with execute_sql (project bvipfipbdcyqnbczjmaq). It ends with a
  SELECT of the row: published must be true (or false only if Amir hid it on purpose).
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main(path):
    p = Path(path)
    d = json.loads(p.read_text(encoding='utf-8'))
    if p.name.endswith('.fa.json') or d.get('lang') == 'fa' or d.get('sourceHash') or d.get('translationOf'):
        sys.exit(f'{p}: a Farsi translation builds the website page; it never goes in the app')
    if 'countsAs' in d or 'focusTag' in d or 'duration' in d:
        sys.exit(f'{p}: this is a workout file, not an article')
    aid, cat = str(d.get('id') or '').strip(), str(d.get('category') or '').strip()
    if not aid:
        sys.exit(f'{p}: no "id"')
    if not cat:
        sys.exit(f'{p}: no "category", which decides its shelf')
    manifest = json.loads((ROOT / 'articles' / 'index.json').read_text(encoding='utf-8'))
    shelf = next((c['id'] for c in manifest['categories']
                  if c['id'] == cat.lower() or c['title'].lower() == cat.lower()), None)
    if not shelf:
        sys.exit(f'{p}: category "{cat}" is not a shelf in articles/index.json')
    if p.parent.name != shelf:
        sys.exit(f'{p}: the file sits in articles/{p.parent.name}/ but its category is the {shelf} shelf')
    slug = f'articles/{shelf}/{aid}'
    body = json.dumps(d, ensure_ascii=False)
    tag = '$art$'
    if tag in body:
        sys.exit(f'{p}: contains {tag}; pick another dollar-quote tag')
    print(f"""do $$
begin
  if exists (select 1 from public.library where kind = 'article' and slug <> '{slug}' and data->>'id' = '{aid}') then
    raise exception '"{aid}" is already on another shelf: hide that row in coach.html first';
  end if;
  if not exists (select 1 from public.library_categories where kind = 'article' and id = '{shelf}') then
    raise exception 'shelf "{shelf}" does not exist in library_categories';
  end if;
end $$;
insert into public.library (slug, kind, category_id, data, published, updated_at)
values ('{slug}', 'article', '{shelf}', {tag}{body}{tag}::jsonb, true, now())
on conflict (slug) do update set kind = excluded.kind, category_id = excluded.category_id,
  data = excluded.data, updated_at = now();
select slug, category_id, published, data->>'title' as title, updated_at from public.library where slug = '{slug}';""")


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
