#!/usr/bin/env python3
"""
build_article_pages.py — publish the app's Read-library articles as real web pages.

WHY (Amir, 2026-09-13: "every time I add an article it updates the website as well")
  Articles live inside program.html, which is noindex and disallowed in robots.txt, so
  Google has never read one. People in Iran search in Farsi, and the articles are
  written in English. This script turns every article into static pages Google can
  read: /en/articles/<slug>.html from the English JSON, /fa/articles/<slug>.html from a
  reviewed Farsi translation, an index page per language, and sitemap.xml.

  Static on purpose. Google reads plain HTML most reliably, and a page that fetched its
  text from Supabase would depend on Supabase answering from inside Iran (see /reach/).

SOURCES (all in articles/<category>/)
  <slug>.json      The English article: the same file the /article skill writes and
                   coach.html publishes to public.library. Never edited by this script.
  <slug>.fa.json   Its Farsi translation, for the website only. It deliberately has NO
                   "id" and NO "category": coach.html's "+ Publish article" refuses a file
                   without them, so the Farsi can never overwrite the English row in the app.

  A Farsi file carries "sourceHash", a fingerprint of the English title + blocks it was
  translated from. Revise the English and --check fails until the Farsi is brought back
  in line and re-stamped, so a translation cannot quietly fall behind its original.

USAGE
  python scripts/build_article_pages.py              write every page + sitemap.xml
  python scripts/build_article_pages.py --check      change nothing; exit 1 if any page,
                                                     translation or the sitemap is missing
                                                     or stale (.githooks/pre-commit runs it)
  python scripts/build_article_pages.py --stamp SLUG record that SLUG's Farsi now matches
                                                     its English (after updating the Farsi)
"""

import argparse
import datetime
import hashlib
import html
import json
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent
SITE = 'https://www.amirardekani.com'
ARTICLES = ROOT / 'articles'
OUT_DIRS = {'en': ROOT / 'en' / 'articles', 'fa': ROOT / 'fa' / 'articles'}
SITEMAP = ROOT / 'sitemap.xml'
OG_IMAGE = SITE + '/assets/img/og-image.jpg'
PERSON_ID = SITE + '/#person'   # the Person node defined on index.html and index-fa.html

# Category folder -> display names. A new category in the app needs a line here; --check
# says so rather than guessing a Farsi name.
CATEGORIES = {
    'for-coaches':     {'en': 'For Coaches',     'fa': 'برای مربی‌ها'},
    'pre-competition': {'en': 'Pre-Competition', 'fa': 'قبل از مسابقه'},
    'recovery':        {'en': 'Recovery',        'fa': 'ریکاوری'},
    'mental':          {'en': 'Mental',          'fa': 'ذهن'},
    'nutrition':       {'en': 'Nutrition',       'fa': 'تغذیه'},
    'supplements':     {'en': 'Supplements',     'fa': 'مکمل‌ها'},
}

MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
          'August', 'September', 'October', 'November', 'December']
MONTHS_FA = ['ژانویه', 'فوریه', 'مارس', 'آوریل', 'مه', 'ژوئن', 'ژوئیه',
             'اوت', 'سپتامبر', 'اکتبر', 'نوامبر', 'دسامبر']
FA_DIGITS = str.maketrans('0123456789', '۰۱۲۳۴۵۶۷۸۹')

# Everything a page says that is not the article itself. Visible brand stays "Amir
# Ardekani" like the rest of the site; the byline and Google's data use "Ardekanian",
# the name people actually search (Amir, 2026-09-13).
L = {
    'en': {
        'dir': 'ltr', 'locale': 'en_GB',
        'home': '/', 'articles': '/en/articles/', 'form': '/form.html', 'terms': '/terms.html',
        'body_font': "'Barlow',system-ui,sans-serif",
        'head_font': "'Barlow Condensed','Barlow',system-ui,sans-serif",
        'font_href': 'https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700'
                     '&family=Barlow+Condensed:wght@700;800;900&display=swap',
        'brand': 'Amir Ardekani', 'author': 'Amir Ardekanian',
        'nav_label': 'Primary', 'crumbs_label': 'Breadcrumb', 'foot_label': 'Footer',
        'nav_home': 'Home', 'nav_articles': 'Articles', 'nav_cta': 'Apply Now', 'toggle': 'فارسی',
        'minutes': '{} min read', 'rule': 'Rule',
        'app_title': 'This article is also in the app',
        'app_sub': 'AA Performance · opens without an account',
        'open': 'Open →',
        'cta_h': 'Want a programme built around your game?',
        'cta_p': 'Individualised tennis & padel strength & conditioning, written from your own '
                 'game and updated every week.',
        'cta_btn': 'Apply Now',
        'more_h': 'More articles',
        'blog_name': 'Amir Ardekanian — Tennis & Padel S&C Articles',
        'index_title': 'Tennis & Padel Strength & Conditioning Articles | Amir Ardekanian',
        'index_h1': 'Tennis & padel S&C articles',
        'index_dek': 'Warm-ups, recovery, injury and the rest of what a tennis or padel player '
                     'needs off court — from the same library my athletes read in the app.',
        'foot_line': 'Amir Ardekani — Tennis & Padel Strength & Conditioning',
        'instagram': 'Instagram', 'privacy': 'Privacy', 'terms_label': 'Terms',
    },
    'fa': {
        'dir': 'rtl', 'locale': 'fa_IR',
        'home': '/index-fa.html', 'articles': '/fa/articles/', 'form': '/form-fa.html',
        'terms': '/terms-fa.html',
        'body_font': "'Vazirmatn',Tahoma,sans-serif",
        'head_font': "'Vazirmatn',Tahoma,sans-serif",
        'font_href': 'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700;800;900'
                     '&display=swap',
        'brand': 'امیر اردکانی', 'author': 'امیر اردکانیان',
        'nav_label': 'منو', 'crumbs_label': 'مسیر', 'foot_label': 'پیوندها',
        'nav_home': 'خانه', 'nav_articles': 'مقاله‌ها', 'nav_cta': 'شروع کن', 'toggle': 'EN',
        'minutes': '{} دقیقه مطالعه', 'rule': 'قاعده',
        'app_title': 'این مقاله داخلِ اپ هم هست',
        'app_sub': 'نسخه‌ی انگلیسی · بدونِ ثبت‌نام باز می‌شه',
        'open': 'باز کن ←',
        'cta_h': 'برنامه‌ی بدنسازیِ اختصاصیِ تنیس یا پدل می‌خوای؟',
        'cta_p': 'یه مربی، تو جیبت: برنامه‌ای که از روی بازیِ خودت نوشته می‌شه و هر هفته آپدیت می‌شه.',
        'cta_btn': 'شروع کن',
        'more_h': 'مقاله‌های دیگه',
        'blog_name': 'امیر اردکانیان — مقاله‌های بدنسازیِ تنیس و پدل',
        'index_title': 'مقاله‌های بدنسازیِ تنیس و پدل | امیر اردکانیان',
        'index_h1': 'مقاله‌های بدنسازیِ تنیس و پدل',
        'index_dek': 'گرم‌کردن، ریکاوری، آسیب و هر چی یه بازیکن یا مربیِ تنیس و پدل بیرون از زمین '
                     'لازم داره — از همون کتابخونه‌ای که شاگردهام توی اپ می‌خونن.',
        'foot_line': 'امیر اردکانی — مربیِ بدنسازیِ تنیس و پدل',
        'instagram': 'اینستاگرام', 'privacy': 'حریم خصوصی', 'terms_label': 'قوانین',
    },
}

CSS = """:root{--green:#0E4A36;--clay:#C7552F;--clay-2:#E06B43;--paper:#FAF7F2;--card:#fff;--ink:#1A1A1A;--ink-2:#5C5C5C;--line:#E7E2D9}
*{margin:0;padding:0;box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{font-family:__BODY__;background:var(--paper);color:var(--ink);line-height:1.8;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
img{max-width:100%}
h1,h2,h3{font-family:__HEAD__}
.wrap{max-width:1120px;margin:0 auto;padding:0 22px}
.narrow{max-width:760px}
.nav{position:sticky;top:0;z-index:10;background:rgba(14,74,54,.95);backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,.1)}
.nav .wrap{display:flex;align-items:center;justify-content:space-between;gap:14px;min-height:64px}
.brand{display:flex;align-items:center;gap:12px;color:#fff;font-weight:800;font-size:19px;white-space:nowrap}
.brand img{width:38px;height:38px;border-radius:10px;background:#fff;display:block}
.nav-links{display:flex;align-items:center;gap:20px}
.nav-links a{color:rgba(255,255,255,.85);font-weight:600;font-size:16px}
.nav-links a:hover,.nav-links a[aria-current]{color:#fff}
.nav-links .lang{border:1.5px solid rgba(255,255,255,.32);border-radius:100px;padding:3px 12px;font-size:14px}
.btn{display:inline-flex;align-items:center;justify-content:center;background:var(--clay);color:#fff!important;font-weight:700;font-size:18px;border-radius:100px;padding:14px 30px;box-shadow:0 10px 28px rgba(199,85,47,.28);transition:background .2s}
.btn:hover{background:var(--clay-2)}
.nav-links .btn{font-size:15px;padding:8px 18px;box-shadow:none}
@media(max-width:620px){.hide-sm{display:none}.brand{font-size:17px}.nav-links{gap:14px}}
.hero{background:radial-gradient(120% 90% at 80% 0%,#155b43 0%,var(--green) 55%,#0a3527 100%);color:#fff;padding:46px 0 54px}
.crumbs{display:flex;flex-wrap:wrap;gap:8px;font-size:14px;color:rgba(255,255,255,.65);margin-bottom:14px}
.crumbs a:hover{color:#fff}
.hero h1{font-weight:900;font-size:clamp(34px,6vw,56px);line-height:1.25}
.dek{font-size:20px;line-height:1.75;color:rgba(255,255,255,.86);margin-top:14px}
.meta{margin-top:18px;font-size:15px;color:rgba(255,255,255,.72)}
.meta b{color:var(--clay-2);font-weight:700}
main.wrap{padding-top:34px;padding-bottom:72px}
.art p{font-size:19px;margin:0 0 20px}
.art p.lead{font-size:21px;font-weight:500}
.art h2{font-weight:800;font-size:28px;line-height:1.4;margin:44px 0 16px;display:flex;align-items:center;gap:12px}
.art h2::before{content:"";width:26px;height:3px;background:var(--clay);flex-shrink:0}
.art ul{list-style:none;margin:0 0 24px}
.art li{position:relative;padding-inline-start:28px;margin-bottom:12px;font-size:18.5px}
.art li::before{content:"";position:absolute;inset-inline-start:4px;top:.72em;width:10px;height:10px;border-radius:50%;background:var(--clay)}
.callout{background:rgba(199,85,47,.07);border:1px solid rgba(199,85,47,.2);border-inline-start:4px solid var(--clay);border-radius:14px;padding:18px 20px;margin:0 0 20px}
.callout .label{display:inline-block;background:var(--clay);color:#fff;font-weight:700;font-size:14px;line-height:1.6;border-radius:100px;padding:2px 12px;margin-bottom:8px}
.art .callout p{margin:0;font-size:18px}
figure{margin:0 0 20px}figure img{width:100%;border-radius:14px;display:block}figcaption{font-size:14px;color:var(--ink-2);margin-top:8px}
.card-link{display:flex;align-items:center;gap:14px;border-radius:16px;padding:14px 18px;margin:0 0 30px;background:var(--card);border:1px solid var(--line);transition:border-color .2s}
.card-link:hover{border-color:var(--clay)}
.card-link .ic{width:44px;height:44px;border-radius:12px;background:var(--green);color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.card-link b{display:block;font-size:17px;line-height:1.5}
.card-link small{display:block;font-size:14px;color:var(--ink-2);line-height:1.5}
.card-link .go{margin-inline-start:auto;color:var(--clay);font-weight:800;white-space:nowrap;font-size:15px}
.art .workout{background:var(--green);border-color:var(--green);color:#fff;margin-bottom:20px}
.art .workout .ic{background:var(--clay)}
.art .workout small{color:rgba(255,255,255,.75)}
.art .workout .go{color:#fff}
.cta{margin-top:52px;background:var(--green);color:#fff;border-radius:22px;padding:34px 26px;text-align:center}
.cta h2{font-weight:900;font-size:clamp(25px,4vw,33px);line-height:1.4}
.cta p{color:rgba(255,255,255,.86);font-size:18px;margin:12px auto 22px;max-width:520px}
.more{margin-top:52px}
.more>h2{font-weight:800;font-size:26px;margin-bottom:16px}
.cards{display:grid;gap:16px}
@media(min-width:760px){.cards.grid{grid-template-columns:1fr 1fr}}
.card{display:block;background:var(--card);border:1px solid var(--line);border-radius:18px;padding:22px;transition:border-color .2s,transform .2s}
.card:hover{border-color:var(--clay);transform:translateY(-2px)}
.card .chip{font-size:13px;font-weight:700;color:var(--clay)}
.card h2,.card h3{font-size:22px;font-weight:800;line-height:1.45;margin:4px 0 8px}
.card p{font-size:16px;color:var(--ink-2);line-height:1.75}
.card .m{font-size:14px;color:var(--ink-2);margin-top:10px}
.foot{background:#0a3527;color:rgba(255,255,255,.7);padding:34px 0;font-size:15px}
.foot .wrap{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:14px}
.foot nav{display:flex;flex-wrap:wrap;gap:18px}
.foot a{color:rgba(255,255,255,.85);font-weight:600}
.foot a:hover{color:#fff}"""

CSS_EN = """
h1,h2,h3{text-transform:uppercase;letter-spacing:.01em}
.hero h1{font-weight:800;line-height:1.02}
.art h2{font-size:32px;line-height:1.1}
.card h2,.card h3{font-size:25px;line-height:1.1}
.art p.lead::first-letter{float:left;font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:3.6em;line-height:.82;color:var(--clay);margin:.06em .12em 0 0}"""


# ── helpers ───────────────────────────────────────────────────────────────

def esc(s):
    return html.escape(str(s if s is not None else ''), quote=True)


def rel(path):
    return Path(path).relative_to(ROOT).as_posix()


def norm(text):
    return text.replace('\r\n', '\n')


def read_json(path):
    return json.loads(path.read_text(encoding='utf-8'))


def source_hash(en):
    """Fingerprint of what a translation is translated FROM: the English title + blocks."""
    blob = json.dumps({'title': en.get('title'), 'blocks': en.get('blocks')},
                      ensure_ascii=False, sort_keys=True, separators=(',', ':'))
    return hashlib.sha256(blob.encode('utf-8')).hexdigest()[:16]


def parse_date(value):
    """'June 2026' -> (2026, 6). The article skill writes month-level dates."""
    m = re.match(r'\s*([A-Za-z]+)\s+(\d{4})\s*$', str(value or ''))
    if not m or m.group(1).capitalize() not in MONTHS:
        return None
    return int(m.group(2)), MONTHS.index(m.group(1).capitalize()) + 1


def date_label(ym, lang):
    if not ym:
        return ''
    y, mo = ym
    return f'{MONTHS_FA[mo - 1]} {y}'.translate(FA_DIGITS) if lang == 'fa' else f'{MONTHS[mo - 1]} {y}'


def read_label(minutes, lang):
    if not minutes:
        return ''
    text = L[lang]['minutes'].format(minutes)
    return text.translate(FA_DIGITS) if lang == 'fa' else text


def summary(doc, limit=155):
    """Meta description for a document that has no explicit one: its first paragraph."""
    first = next((b.get('text') for b in doc.get('blocks') or []
                  if b.get('type') == 'p' and b.get('text')), doc.get('title', ''))
    text = ' '.join(str(first).split())
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(' ', 1)[0].rstrip(',;:—–- ') + '…'


def jsonld_script(data):
    return json.dumps(data, ensure_ascii=False, indent=1).replace('</', '<\\/')


# ── loading + validation ──────────────────────────────────────────────────

def check_translation(en, fa, slug):
    """Returns (fatal problems, stale?). Fatal = the Farsi page cannot be built from it."""
    fatal = []
    if 'id' in fa or 'category' in fa:
        fatal.append('must not have "id" or "category": with them, coach.html\'s "+ Publish article" '
                     'would accept this file and overwrite the English article in the app')
    if fa.get('translationOf') != slug:
        fatal.append(f'"translationOf" must be "{slug}"')
    for key in ('title', 'description'):
        if not str(fa.get(key) or '').strip():
            fatal.append(f'needs a "{key}"')
    en_blocks, fa_blocks = en.get('blocks') or [], fa.get('blocks') or []
    if len(en_blocks) != len(fa_blocks):
        fatal.append(f'has {len(fa_blocks)} blocks but the English has {len(en_blocks)}: '
                     'translate it block for block')
    else:
        for i, (e, f) in enumerate(zip(en_blocks, fa_blocks), 1):
            if e.get('type') != f.get('type'):
                fatal.append(f'block {i} is "{f.get("type")}" but the English block {i} is "{e.get("type")}"')
            elif e.get('type') == 'list' and len(e.get('items') or []) != len(f.get('items') or []):
                fatal.append(f'block {i} has {len(f.get("items") or [])} list items, '
                             f'the English has {len(e.get("items") or [])}')
    return fatal, fa.get('sourceHash') != source_hash(en)


def load(problems):
    arts = []
    for src in sorted(ARTICLES.glob('*/*.json')):
        if src.name.endswith('.fa.json'):
            continue
        try:
            en = read_json(src)
        except ValueError as e:
            problems.append(f'{rel(src)}: not valid JSON ({e})')
            continue
        slug, cat = en.get('id') or src.stem, src.parent.name
        if cat not in CATEGORIES:
            problems.append(f'{rel(src)}: the category folder "{cat}" has no names in CATEGORIES at the '
                            'top of scripts/build_article_pages.py; add its English and Farsi names')
            continue
        if not en.get('title') or not isinstance(en.get('blocks'), list):
            problems.append(f'{rel(src)}: needs a "title" and a "blocks" array')
            continue

        art = {'slug': slug, 'cat': cat, 'en': en, 'fa': None, 'fa_ok': False,
               'date': parse_date(en.get('date'))}
        fa_src = src.with_name(src.stem + '.fa.json')
        if not fa_src.exists():
            problems.append(f'{rel(src)}: has no Farsi translation yet ({rel(fa_src)}), so it has no '
                            'Farsi page. The /article skill writes one; Amir approves it before it ships')
        else:
            try:
                fa = read_json(fa_src)
            except ValueError as e:
                problems.append(f'{rel(fa_src)}: not valid JSON ({e})')
                fa = None
            if fa is not None:
                fatal, stale = check_translation(en, fa, slug)
                problems.extend(f'{rel(fa_src)}: {p}' for p in fatal)
                if stale and not fatal:
                    problems.append(f'{rel(fa_src)}: is out of date. The English changed after this was '
                                    'translated (or it was never stamped). Update the Farsi to match, get '
                                    f'Amir\'s OK, then run: python scripts/build_article_pages.py --stamp {slug}')
                if not fatal:
                    art['fa'], art['fa_ok'] = fa, True
        arts.append(art)
    # Newest first, as the app lists them.
    arts.sort(key=lambda a: (-(a['date'][0] * 12 + a['date'][1]) if a['date'] else 0, a['slug']))
    return arts


# ── rendering ─────────────────────────────────────────────────────────────

def blocks_html(blocks, lang):
    out, lead = [], True
    for b in blocks:
        kind = b.get('type')
        if kind == 'p':
            out.append(f'<p{" class=\"lead\"" if lead else ""}>{esc(b.get("text"))}</p>')
            lead = False
        elif kind == 'h':
            out.append(f'<h2>{esc(b.get("text"))}</h2>')
        elif kind == 'list':
            out.append('<ul>' + ''.join(f'<li>{esc(i)}</li>' for i in b.get('items') or []) + '</ul>')
        elif kind == 'callout':
            out.append(f'<aside class="callout"><span class="label">{esc(b.get("label") or L[lang]["rule"])}'
                       f'</span><p>{esc(b.get("text"))}</p></aside>')
        elif kind == 'img':
            cap = b.get('caption') or ''
            src = '/' + str(b.get('src') or '').lstrip('/')
            out.append(f'<figure><img src="{esc(src)}" alt="{esc(cap)}" loading="lazy">'
                       + (f'<figcaption>{esc(cap)}</figcaption>' if cap else '') + '</figure>')
        elif kind == 'workout':
            wid = Path(str(b.get('file') or '')).stem
            meta = f'<small>{esc(b.get("meta"))}</small>' if b.get('meta') else ''
            out.append(f'<a class="card-link workout" href="/program.html?workout={quote(wid)}">'
                       f'<span class="ic" aria-hidden="true">▶</span><span><b>{esc(b.get("label"))}</b>{meta}</span>'
                       f'<span class="go">{esc(L[lang]["open"])}</span></a>')
    return '\n'.join(out)


def nav_html(lang, toggle_href, current):
    c, other = L[lang], ('fa' if lang == 'en' else 'en')
    cur = ' aria-current="page"' if current == c['articles'] else ''
    return (f'<nav class="nav" aria-label="{esc(c["nav_label"])}"><div class="wrap">\n'
            f'<a class="brand" href="{c["home"]}"><img src="/assets/img/icon-192.png" alt="" width="38" height="38">'
            f'{esc(c["brand"])}</a>\n'
            f'<div class="nav-links">\n'
            f'<a class="hide-sm" href="{c["home"]}">{esc(c["nav_home"])}</a>\n'
            f'<a href="{c["articles"]}"{cur}>{esc(c["nav_articles"])}</a>\n'
            f'<a class="lang" href="{toggle_href}" lang="{other}" hreflang="{other}">{esc(c["toggle"])}</a>\n'
            f'<a class="btn hide-sm" href="{c["form"]}">{esc(c["nav_cta"])}</a>\n'
            f'</div></div></nav>')


def footer_html(lang):
    c = L[lang]
    return (f'<footer class="foot"><div class="wrap">\n<div>{esc(c["foot_line"])}</div>\n'
            f'<nav aria-label="{esc(c["foot_label"])}"><a href="{c["home"]}">{esc(c["nav_home"])}</a>'
            f'<a href="{c["articles"]}">{esc(c["nav_articles"])}</a>'
            f'<a href="https://instagram.com/amirardekanian" target="_blank" rel="noopener">{esc(c["instagram"])}</a>'
            f'<a href="/privacy.html">{esc(c["privacy"])}</a><a href="{c["terms"]}">{esc(c["terms_label"])}</a></nav>\n'
            f'</div></footer>')


def page(lang, *, title, description, path, alternates, jsonld, body, og_type):
    c, other = L[lang], ('fa' if lang == 'en' else 'en')
    alt = dict(alternates)
    toggle = alt.get(other) or L[other]['home']
    hreflang = ''.join(f'<link rel="alternate" hreflang="{k}" href="{SITE}{v}">\n' for k, v in alternates) \
        if other in alt else ''
    css = CSS.replace('__BODY__', c['body_font']).replace('__HEAD__', c['head_font']) + (CSS_EN if lang == 'en' else '')
    return f"""<!DOCTYPE html>
<html lang="{lang}" dir="{c['dir']}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#0E4A36">
<!-- GENERATED by scripts/build_article_pages.py from articles/. Edit the JSON and rebuild: hand edits here are overwritten. -->
<title>{esc(title)}</title>
<meta name="description" content="{esc(description)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="{SITE}{path}">
{hreflang}<meta property="og:type" content="{og_type}">
<meta property="og:url" content="{SITE}{path}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(description)}">
<meta property="og:image" content="{OG_IMAGE}">
<meta property="og:locale" content="{c['locale']}">
<meta property="og:site_name" content="{esc(c['author'])}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/svg+xml" href="/assets/img/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="{c['font_href']}" rel="stylesheet">
<!-- Plausible (privacy-friendly, cookieless) -->
<script defer data-domain="amirardekani.com" src="https://plausible.io/js/script.js"></script>
<script type="application/ld+json">
{jsonld_script(jsonld)}
</script>
<style>
{css}
</style>
</head>
<body>
{nav_html(lang, toggle, path)}
{body}
{footer_html(lang)}
</body>
</html>
"""


def card_html(lang, art, heading):
    doc = art[lang]
    desc = str(doc.get('description') or '').strip() or summary(doc)
    meta = ' · '.join(filter(None, [read_label(art['en'].get('readMins'), lang), date_label(art['date'], lang)]))
    return (f'<a class="card" href="/{lang}/articles/{art["slug"]}.html">'
            f'<span class="chip">{esc(CATEGORIES[art["cat"]][lang])}</span>'
            f'<{heading}>{esc(doc["title"])}</{heading}><p>{esc(desc)}</p><div class="m">{meta}</div></a>')


def crumbs_ld(items):
    return {'@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': i, 'name': name, 'item': SITE + path}
        for i, (name, path) in enumerate(items, 1)]}


def article_page(lang, art, arts):
    c, doc, slug = L[lang], art[lang], art['slug']
    cat = CATEGORIES[art['cat']][lang]
    path, en_path = f'/{lang}/articles/{slug}.html', f'/en/articles/{slug}.html'
    alternates = [('en', en_path)]
    if art['fa_ok']:
        alternates.append(('fa', f'/fa/articles/{slug}.html'))
    alternates.append(('x-default', en_path))

    explicit = str(doc.get('description') or '').strip()
    description = explicit or summary(doc)
    title = str(doc.get('seoTitle') or '').strip() or f'{doc["title"]} | {c["author"]}'
    ym = art['date']
    meta = ' · '.join(filter(None, [read_label(art['en'].get('readMins'), lang), date_label(ym, lang)]))

    post = {
        '@type': 'BlogPosting', '@id': SITE + path + '#article',
        'headline': doc['title'], 'description': description, 'inLanguage': lang,
        'url': SITE + path, 'mainEntityOfPage': SITE + path, 'image': OG_IMAGE, 'articleSection': cat,
        'author': {'@type': 'Person', '@id': PERSON_ID, 'name': c['author'], 'url': SITE + c['home']},
        'publisher': {'@id': PERSON_ID},
        'isPartOf': {'@type': 'Blog', '@id': SITE + c['articles'] + '#blog', 'name': c['blog_name'],
                     'url': SITE + c['articles']},
    }
    if ym:
        post['datePublished'] = f'{ym[0]}-{ym[1]:02d}-01'
    if lang == 'fa':
        post['translationOfWork'] = {'@id': SITE + en_path + '#article'}
    jsonld = {'@context': 'https://schema.org', '@graph': [
        post, crumbs_ld([(c['nav_home'], c['home']), (c['nav_articles'], c['articles']), (doc['title'], path)])]}

    others = [o for o in arts if o['slug'] != slug and (lang == 'en' or o['fa_ok'])][:3]
    more = ''
    if others:
        more = (f'<section class="more"><h2>{esc(c["more_h"])}</h2><div class="cards">'
                + ''.join(card_html(lang, o, 'h3') for o in others) + '</div></section>')
    dek = f'<p class="dek">{esc(explicit)}</p>\n' if explicit else ''
    body = f"""<header class="hero"><div class="wrap narrow">
<nav class="crumbs" aria-label="{esc(c['crumbs_label'])}"><a href="{c['home']}">{esc(c['nav_home'])}</a><span aria-hidden="true">/</span><a href="{c['articles']}">{esc(c['nav_articles'])}</a><span aria-hidden="true">/</span><span>{esc(cat)}</span></nav>
<h1>{esc(doc['title'])}</h1>
{dek}<p class="meta"><b>{esc(c['author'])}</b> · {meta}</p>
</div></header>
<main class="wrap narrow">
<a class="card-link" href="/program.html?article={quote(slug)}"><span class="ic" aria-hidden="true">📲</span><span><b>{esc(c['app_title'])}</b><small>{esc(c['app_sub'])}</small></span><span class="go">{esc(c['open'])}</span></a>
<article class="art">
{blocks_html(doc['blocks'], lang)}
</article>
<section class="cta">
<h2>{esc(c['cta_h'])}</h2>
<p>{esc(c['cta_p'])}</p>
<a class="btn" href="{c['form']}">{esc(c['cta_btn'])}</a>
</section>
{more}
</main>"""
    return page(lang, title=title, description=description, path=path, alternates=alternates,
                jsonld=jsonld, body=body, og_type='article')


def index_page(lang, arts):
    c = L[lang]
    listed = [a for a in arts if lang == 'en' or a['fa_ok']]
    path = c['articles']
    posts = [{'@type': 'BlogPosting', '@id': f'{SITE}/{lang}/articles/{a["slug"]}.html#article',
              'headline': a[lang]['title'], 'url': f'{SITE}/{lang}/articles/{a["slug"]}.html'} for a in listed]
    jsonld = {'@context': 'https://schema.org', '@graph': [
        {'@type': 'Blog', '@id': SITE + path + '#blog', 'name': c['blog_name'], 'url': SITE + path,
         'inLanguage': lang, 'description': c['index_dek'],
         'author': {'@type': 'Person', '@id': PERSON_ID, 'name': c['author']}, 'blogPost': posts},
        crumbs_ld([(c['nav_home'], c['home']), (c['nav_articles'], path)])]}
    body = f"""<header class="hero"><div class="wrap narrow">
<nav class="crumbs" aria-label="{esc(c['crumbs_label'])}"><a href="{c['home']}">{esc(c['nav_home'])}</a><span aria-hidden="true">/</span><span>{esc(c['nav_articles'])}</span></nav>
<h1>{esc(c['index_h1'])}</h1>
<p class="dek">{esc(c['index_dek'])}</p>
</div></header>
<main class="wrap">
<div class="cards grid">
{''.join(card_html(lang, a, 'h2') for a in listed)}
</div>
<section class="cta">
<h2>{esc(c['cta_h'])}</h2>
<p>{esc(c['cta_p'])}</p>
<a class="btn" href="{c['form']}">{esc(c['cta_btn'])}</a>
</section>
</main>"""
    return page(lang, title=c['index_title'], description=c['index_dek'], path=path,
                alternates=[('en', L['en']['articles']), ('fa', L['fa']['articles']),
                            ('x-default', L['en']['articles'])],
                jsonld=jsonld, body=body, og_type='website')


def build_outputs(arts):
    out = {}
    for lang in ('en', 'fa'):
        out[OUT_DIRS[lang] / 'index.html'] = index_page(lang, arts)
        for art in arts:
            if lang == 'en' or art['fa_ok']:
                out[OUT_DIRS[lang] / f'{art["slug"]}.html'] = article_page(lang, art, arts)
    return out


# ── sitemap ───────────────────────────────────────────────────────────────

def robots_disallow():
    robots = ROOT / 'robots.txt'
    if not robots.exists():
        return []
    return [m.group(1) for m in re.finditer(r'^\s*Disallow:\s*(\S+)', robots.read_text(encoding='utf-8'), re.I | re.M)]


def indexable_loc(text, disallow):
    """A page belongs in the sitemap when it names a canonical URL on this site and is not noindex."""
    if re.search(r'<meta\s+name=["\']robots["\']\s+content=["\'][^"\']*noindex', text, re.I):
        return None
    m = re.search(r'<link\s+rel=["\']canonical["\']\s+href=["\']([^"\']+)["\']', text, re.I)
    if not m or not m.group(1).startswith(SITE):
        return None
    loc = m.group(1)
    if any((loc[len(SITE):] or '/').startswith(d) for d in disallow):
        return None
    return loc


def sitemap_entries(outputs):
    disallow = robots_disallow()
    roots = []
    for f in sorted(ROOT.glob('*.html')):
        loc = indexable_loc(f.read_text(encoding='utf-8', errors='replace'), disallow)
        if loc:
            roots.append((loc, f))
    first = {SITE + '/': 0, SITE + '/index-fa.html': 1}
    roots.sort(key=lambda e: (first.get(e[0], 2), e[0]))
    generated = [(indexable_loc(text, disallow), path) for path, text in outputs.items()]
    entries, seen = [], set()
    for loc, f in roots + [g for g in generated if g[0]]:
        if loc not in seen:
            seen.add(loc)
            entries.append((loc, f))
    return entries


def git_lastmod(path):
    """Date of the last commit that touched a file, or today if it has uncommitted changes."""
    today = datetime.date.today().isoformat()
    try:
        dirty = subprocess.run(['git', 'status', '--porcelain', '--', rel(path)], cwd=ROOT,
                               capture_output=True, text=True, check=True).stdout.strip()
        if dirty:
            return today
        return subprocess.run(['git', 'log', '-1', '--format=%cs', '--', rel(path)], cwd=ROOT,
                              capture_output=True, text=True, check=True).stdout.strip() or today
    except (OSError, subprocess.CalledProcessError):
        return today


def sitemap_xml(entries):
    urls = ''.join(f'  <url>\n    <loc>{esc(loc)}</loc>\n    <lastmod>{git_lastmod(f)}</lastmod>\n  </url>\n'
                   for loc, f in entries)
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<!-- GENERATED by scripts/build_article_pages.py. Do not edit by hand. A root page is listed '
            'when it has a canonical link and no noindex; the article pages come from articles/. -->\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + '</urlset>\n')


# ── commands ──────────────────────────────────────────────────────────────

def print_problems(problems):
    for p in problems:
        print('  - ' + p, file=sys.stderr)


def cmd_build(problems, outputs):
    for path, text in outputs.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        if path.exists() and norm(path.read_text(encoding='utf-8')) == norm(text):
            continue
        path.write_text(text, encoding='utf-8', newline='\n')
        print('wrote   ' + rel(path))
    for folder in OUT_DIRS.values():
        for f in sorted(folder.glob('*.html')) if folder.exists() else []:
            if f not in outputs:
                f.unlink()
                print('deleted ' + rel(f) + ' (its article is gone)')
    xml = sitemap_xml(sitemap_entries(outputs))
    if not SITEMAP.exists() or norm(SITEMAP.read_text(encoding='utf-8')) != norm(xml):
        SITEMAP.write_text(xml, encoding='utf-8', newline='\n')
        print('wrote   sitemap.xml')
    if problems:
        print(f'\nBuilt, but {len(problems)} thing(s) need attention:', file=sys.stderr)
        print_problems(problems)
        return 1
    print('articles: pages and sitemap are up to date')
    return 0


def cmd_check(problems, outputs):
    stale = [rel(p) for p, text in outputs.items()
             if not p.exists() or norm(p.read_text(encoding='utf-8')) != norm(text)]
    for folder in OUT_DIRS.values():
        for f in sorted(folder.glob('*.html')) if folder.exists() else []:
            if f not in outputs:
                stale.append(rel(f) + ' has no article behind it')
    want = {loc for loc, _ in sitemap_entries(outputs)}
    have = set(re.findall(r'<loc>([^<]+)</loc>', SITEMAP.read_text(encoding='utf-8'))) if SITEMAP.exists() else set()
    if want != have:
        missing, extra = sorted(want - have), sorted(have - want)
        stale.append('sitemap.xml' + (f' is missing {", ".join(missing)}' if missing else '')
                     + (f' still lists {", ".join(extra)}' if extra else ''))
    if not problems and not stale:
        print('articles: pages and sitemap are up to date')
        return 0
    if problems:
        print('Article translations need attention:', file=sys.stderr)
        print_problems(problems)
    if stale:
        print('Out of date. Run `python scripts/build_article_pages.py` and commit what it writes:', file=sys.stderr)
        print_problems(stale)
    return 1


def cmd_stamp(slug):
    for src in sorted(ARTICLES.glob('*/*.json')):
        if src.name.endswith('.fa.json'):
            continue
        en = read_json(src)
        if (en.get('id') or src.stem) != slug:
            continue
        fa_src = src.with_name(src.stem + '.fa.json')
        if not fa_src.exists():
            print(f'{rel(fa_src)} does not exist yet', file=sys.stderr)
            return 1
        fa = read_json(fa_src)
        fatal, _ = check_translation(en, fa, slug)
        if fatal:
            print(f'Not stamped: {rel(fa_src)} does not line up with the English yet:', file=sys.stderr)
            print_problems(fatal)
            return 1
        fa['sourceHash'] = source_hash(en)
        fa_src.write_text(json.dumps(fa, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
        print(f'stamped {rel(fa_src)} against the current English')
        return 0
    print(f'No article with id "{slug}" in articles/', file=sys.stderr)
    return 1


def main():
    ap = argparse.ArgumentParser(description='Build the public article pages and sitemap from articles/.')
    ap.add_argument('--check', action='store_true', help='change nothing; exit 1 if anything is stale')
    ap.add_argument('--stamp', metavar='SLUG', help="record that SLUG's Farsi matches its current English")
    args = ap.parse_args()
    if args.stamp:
        return cmd_stamp(args.stamp)
    problems = []
    arts = load(problems)
    outputs = build_outputs(arts)
    return cmd_check(problems, outputs) if args.check else cmd_build(problems, outputs)


if __name__ == '__main__':
    sys.exit(main())
