"""Build ONE self-contained HTML file from a reel's src/ folder: scripts and every '../assets/...' file inlined (data URIs).

Lives in <reel folder>/src/ next to reel*.template.html, engine.js, driver.js and scenes.js (new_reel.py puts it there).
    python build_reel.py            ->  Content/<reel folder name>.html   (one folder up from the reel folder)

The template links assets by relative path so it can be edited and previewed straight from disk (file:// works); this script is the only
step between it and the file Amir opens. Footage plates (extract_plate.py) are loaded by relative path at run time and are NOT inlined.
Set PYTHONIOENCODING=utf-8 on Amir's PC (the repo path has Cyrillic in it).
"""
import base64, glob, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))                       # the reel folder
OUT = os.path.normpath(os.path.join(ROOT, '..', os.path.basename(ROOT) + '.html'))
MIME = {'.woff2': 'font/woff2', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml'}


def data_uri(rel):
    p = os.path.normpath(os.path.join(HERE, rel))
    ext = os.path.splitext(p)[1].lower()
    if not os.path.exists(p):
        sys.exit(f'build stopped: "{rel}" is referenced in src/ (a script, a comment or the template) but {p} does not exist. '
                 'Add the file, or reword the comment so it does not look like an asset path.')
    with open(p, 'rb') as f:
        return f'data:{MIME[ext]};base64,' + base64.b64encode(f.read()).decode('ascii')


def inline_assets(text):
    return re.sub(r"(?P<q>['\"(])(?P<p>\.\./assets/[A-Za-z0-9_./-]+\.(?:woff2|webp|jpg|jpeg|png|svg))", lambda m: m.group('q') + data_uri(m.group('p')), text)


def main():
    templates = glob.glob(os.path.join(HERE, '*.template.html'))
    if len(templates) != 1:
        sys.exit('expected exactly one *.template.html in ' + HERE)
    html = open(templates[0], encoding='utf-8').read()
    for tag in re.findall(r'<script src="([^"]+\.js)"></script>', html):
        js = open(os.path.join(HERE, tag), encoding='utf-8').read()
        html = html.replace(f'<script src="{tag}"></script>', '<script>\n' + inline_assets(js) + '\n</script>')
    html = inline_assets(html)
    left = re.findall(r"\.\./assets/[A-Za-z0-9_./-]+\.(?:woff2|webp|jpg|jpeg|png|svg)", html)
    assert not left, 'an asset path was left un-inlined: ' + left[0]
    open(OUT, 'w', encoding='utf-8', newline='\n').write(html)
    print('wrote', os.path.basename(OUT), round(os.path.getsize(OUT) / 1048576, 2), 'MB')


if __name__ == '__main__':
    main()
