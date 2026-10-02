"""Build Content/reel-9-mehraneh.html: ONE self-contained file (fonts, pictures and scripts inlined as data URIs).

The template (src/reel9.template.html) links assets by relative path so it can be edited and previewed straight from disk;
this script is the only step between it and the file Amir opens.   usage: python build_reel9.py
"""
import base64, mimetypes, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))
OUT = os.path.normpath(os.path.join(ROOT, '..', 'reel-9-mehraneh.html'))
MIME = {'.woff2': 'font/woff2', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png'}


def data_uri(rel):
    p = os.path.normpath(os.path.join(HERE, rel))
    ext = os.path.splitext(p)[1].lower()
    with open(p, 'rb') as f:
        b = base64.b64encode(f.read()).decode('ascii')
    return f'data:{MIME[ext]};base64,{b}'


def inline_assets(text):
    # '../assets/...' inside url(...), src="..." and JS strings
    return re.sub(r"(?P<q>['\"(])(?P<p>\.\./assets/[A-Za-z0-9_./-]+)", lambda m: m.group('q') + data_uri(m.group('p')), text)


def main():
    html = open(os.path.join(HERE, 'reel9.template.html'), encoding='utf-8').read()
    for name in ('engine.js', 'scenes.js'):
        js = open(os.path.join(HERE, name), encoding='utf-8').read()
        tag = f'<script src="{name}"></script>'
        assert tag in html, tag
        html = html.replace(tag, '<script>\n' + inline_assets(js) + '\n</script>')
    html = inline_assets(html)
    assert '../assets/' not in html, 'an asset path was left un-inlined'
    open(OUT, 'w', encoding='utf-8', newline='\n').write(html)
    print('wrote', os.path.basename(OUT), round(os.path.getsize(OUT) / 1048576, 2), 'MB')


if __name__ == '__main__':
    sys.exit(main())
