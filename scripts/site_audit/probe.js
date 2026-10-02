(() => {
  // In-page audit probe. Returns one JSON object. Read-only: touches nothing on the page.
  const R = { _errors: [] };
  const sect = (name, fn) => { try { R[name] = fn(); } catch (e) { R._errors.push(name + ': ' + String((e && e.message) || e).slice(0, 160)); } };
  const d = document, de = d.documentElement;
  const W = innerWidth, H = innerHeight, DPR = devicePixelRatio;
  const txt = s => (s || '').replace(/\s+/g, ' ').trim();
  const q = (s, r) => Array.from((r || d).querySelectorAll(s));
  const short = (s, n) => { s = txt(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
  const cssPath = el => {
    const parts = []; let e = el, n = 0;
    while (e && e.nodeType === 1 && e !== d.body && n < 4) {
      let s = e.tagName.toLowerCase();
      if (e.id) { parts.unshift(s + '#' + e.id); break; }
      const c = (e.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
      if (c.length) s += '.' + c.join('.');
      parts.unshift(s); e = e.parentElement; n++;
    }
    return parts.join('>');
  };
  const isVis = el => {
    try { if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false; } catch (e) {}
    const r = el.getBoundingClientRect();
    return r.width >= 1 && r.height >= 1;
  };
  const absTop = el => Math.round(el.getBoundingClientRect().top + scrollY);

  // ---------- colour helpers ----------
  const parseColor = s => {
    if (!s) return null;
    let m = s.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)/);
    if (m) { const a = m[4] === undefined ? 1 : (m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4])); return [+m[1], +m[2], +m[3], a]; }
    m = s.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\)/);
    if (m) { const a = m[4] === undefined ? 1 : (m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4])); return [m[1] * 255, m[2] * 255, m[3] * 255, a]; }
    return null;
  };
  const over = (fg, bg) => { const a = fg[3]; return [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a), 1]; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const hex = c => '#' + [0, 1, 2].map(i => Math.round(c[i]).toString(16).padStart(2, '0')).join('');
  const hsl = c => {
    const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const dd = mx - mn, s = l > 0.5 ? dd / (2 - mx - mn) : dd / (mx + mn);
    let h = mx === r ? (g - b) / dd + (g < b ? 6 : 0) : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4;
    return [h * 60, s, l];
  };
  const effOpacity = el => { let o = 1, e = el; while (e && e.nodeType === 1) { o *= parseFloat(getComputedStyle(e).opacity); e = e.parentElement; } return o; };
  // background behind an element: {color} | {grad:[stops]} | {image:true}
  const bgOf = el => {
    const layers = []; let e = el;
    while (e && e.nodeType === 1) {
      const cs = getComputedStyle(e);
      const bi = cs.backgroundImage;
      if (bi && bi !== 'none') {
        if (/gradient/.test(bi) && !/url\(/.test(bi)) {
          const stops = (bi.match(/rgba?\([^)]+\)/g) || []).map(parseColor).filter(Boolean);
          let base = [255, 255, 255, 1];
          for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
          return { grad: stops.map(s => over(s, base)) };
        }
        return { image: true };
      }
      const c = parseColor(cs.backgroundColor);
      if (c && c[3] > 0) { layers.push(c); if (c[3] >= 1) break; }
      e = e.parentElement;
    }
    let base = [255, 255, 255, 1];
    for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
    return { color: base };
  };

  // ---------- text nodes ----------
  const textEls = new Map();
  const walker = d.createTreeWalker(d.body, NodeFilter.SHOW_TEXT, { acceptNode: n => (n.nodeValue.trim().length > 0 && n.parentElement && !/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|TITLE)$/.test(n.parentElement.tagName)) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
  while (walker.nextNode()) { const el = walker.currentNode.parentElement; textEls.set(el, (textEls.get(el) || '') + ' ' + walker.currentNode.nodeValue); }
  const visText = [];
  for (const [el, t] of textEls) { if (isVis(el)) visText.push([el, txt(t)]); }

  // ---------- head / SEO ----------
  sect('head', () => {
    const meta = n => { const m = d.querySelector('meta[name="' + n + '"]'); return m ? m.content : null; };
    const prop = n => { const m = d.querySelector('meta[property="' + n + '"]'); return m ? m.content : null; };
    const ld = q('script[type="application/ld+json"]').map(s => { try { const j = JSON.parse(s.textContent); return j['@type'] || (j['@graph'] || []).map(x => x['@type']).join(','); } catch (e) { return 'INVALID-JSON-LD'; } });
    return {
      url: location.pathname + location.search, lang: de.lang || null, dir: de.dir || getComputedStyle(d.body).direction,
      title: d.title, titleLen: d.title.length,
      description: meta('description'), descLen: (meta('description') || '').length, robots: meta('robots'),
      viewport: meta('viewport'), themeColor: meta('theme-color'),
      canonical: (d.querySelector('link[rel=canonical]') || {}).href || null,
      hreflang: q('link[rel=alternate][hreflang]').map(l => l.hreflang + ' ' + l.getAttribute('href')),
      og: { title: prop('og:title'), desc: prop('og:description'), image: prop('og:image'), url: prop('og:url'), type: prop('og:type') },
      twitter: meta('twitter:card'), jsonld: ld,
      manifest: !!d.querySelector('link[rel=manifest]'), appleIcon: !!d.querySelector('link[rel=apple-touch-icon]'),
      favicon: q('link[rel~=icon]').map(l => l.getAttribute('href')),
      preconnect: q('link[rel=preconnect]').map(l => l.href), preload: q('link[rel=preload]').map(l => l.getAttribute('href') + ' as=' + l.getAttribute('as')),
    };
  });

  // ---------- structure ----------
  sect('structure', () => {
    const hs = q('h1,h2,h3,h4,h5,h6').filter(isVis || (() => true));
    const levels = hs.map(h => +h.tagName[1]);
    const jumps = []; for (let i = 1; i < levels.length; i++) if (levels[i] - levels[i - 1] > 1) jumps.push(levels[i - 1] + '→' + levels[i] + ' "' + short(hs[i].textContent, 40) + '"');
    const sections = [];
    q('section, header, footer, main > div, body > div').forEach(el => {
      if (el.parentElement && el.parentElement.closest('section')) return;
      const r = el.getBoundingClientRect(); if (r.height < 60 || r.width < W * 0.5) return;
      const h = el.querySelector('h1,h2,h3'); const bg = bgOf(el);
      sections.push({ y: Math.round(r.top + scrollY), h: Math.round(r.height), tag: el.tagName.toLowerCase(), id: el.id || '', cls: short(el.getAttribute('class') || '', 28), head: h ? short(h.textContent, 48) : '', bg: bg.color ? hex(bg.color) : (bg.grad ? 'gradient' : 'image') });
    });
    sections.sort((a, b) => a.y - b.y);
    return {
      docHeight: Math.round(de.scrollHeight), viewportW: W, viewportH: H, screens: +(de.scrollHeight / H).toFixed(1),
      h1: q('h1').map(h => short(h.textContent, 90)), headings: hs.map(h => [h.tagName.toLowerCase(), short(h.textContent, 60)]).slice(0, 70), headingJumps: jumps,
      landmarks: { header: q('header,[role=banner]').length, nav: q('nav,[role=navigation]').length, main: q('main,[role=main]').length, footer: q('footer,[role=contentinfo]').length },
      skipLink: !!q('a[href^="#"]').find(a => /skip|پرش/i.test(a.textContent + ' ' + a.className)),
      sections: sections.slice(0, 40),
    };
  });

  // ---------- first screen ----------
  sect('fold', () => {
    const ctaRe = /apply|start|join|book|get started|sign ?up|buy|enrol|whatsapp|contact|free|try|download|begin|demo|درخواست|شروع|ثبت|خرید|دریافت|رایگان|تماس|واتس|مشاوره|پیام|ورود|دمو/i;
    const ctas = q('a[href], button').filter(el => ctaRe.test(txt(el.textContent) + ' ' + (el.getAttribute('aria-label') || ''))).filter(isVis)
      .map(el => ({ t: short(el.textContent || el.getAttribute('aria-label'), 36), y: absTop(el), href: (el.getAttribute('href') || '').slice(0, 60), w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) }));
    const inFold = visText.filter(([el]) => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.top < H && r.bottom > 0; }).map(([el, t]) => [el.tagName.toLowerCase(), short(t, 70), Math.round(parseFloat(getComputedStyle(el).fontSize))]).slice(0, 18);
    return { ctasAboveFold: ctas.filter(c => c.y < H).length, ctaTotal: ctas.length, ctas: ctas.slice(0, 24), firstScreenText: inFold };
  });

  // ---------- accessibility ----------
  sect('a11y', () => {
    const nameOf = el => {
      const al = el.getAttribute('aria-label'); if (al && txt(al)) return txt(al);
      const lb = el.getAttribute('aria-labelledby'); if (lb) { const t = lb.split(/\s+/).map(id => { const x = d.getElementById(id); return x ? x.textContent : ''; }).join(' '); if (txt(t)) return txt(t); }
      if (el.labels && el.labels.length) { const t = txt(el.labels[0].textContent); if (t) return t; }
      const t = txt(el.textContent); if (t) return t;
      const img = el.querySelector('img[alt]'); if (img && txt(img.alt)) return txt(img.alt);
      const st = el.querySelector('svg title'); if (st && txt(st.textContent)) return txt(st.textContent);
      return el.getAttribute('title') || '';
    };
    const named = q('a[href], button, [role=button], [role=link], select, textarea, input:not([type=hidden])').filter(isVis);
    const noName = named.filter(el => !txt(nameOf(el)) && !(el.tagName === 'INPUT' && /submit|button/.test(el.type) && el.value)).map(el => ({ p: cssPath(el), html: el.outerHTML.slice(0, 110) }));
    // tap targets
    const taps = [];
    q('a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [onclick]').filter(isVis).forEach(el => {
      const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      const para = el.closest('p, li, dd, blockquote');
      const inline = el.tagName === 'A' && cs.display === 'inline' && para && txt(para.textContent).length > txt(el.textContent).length + 12;
      taps.push({ p: cssPath(el), t: short(el.textContent || el.getAttribute('aria-label') || el.placeholder || el.type, 28), w: Math.round(r.width), h: Math.round(r.height), inline: !!inline });
    });
    const real = taps.filter(t => !t.inline);
    const small44 = real.filter(t => Math.min(t.w, t.h) < 44), small24 = real.filter(t => Math.min(t.w, t.h) < 24);
    // forms
    const labelOf = e => { const n = nameOf(e); return (e.placeholder && n === e.placeholder) ? '' : n; };
    const forms = Array.from(d.forms).map(f => {
      const fields = Array.from(f.elements).filter(e => /^(INPUT|SELECT|TEXTAREA)$/.test(e.tagName) && !/^(hidden|submit|button)$/.test(e.type));
      return { id: f.id || f.getAttribute('name') || '', action: (f.getAttribute('action') || '').slice(0, 70), fields: fields.length,
        unlabelled: fields.filter(e => !labelOf(e)).map(e => e.name || e.id || e.type).slice(0, 12),
        noAutocomplete: fields.filter(e => /name|email|phone|tel/i.test((e.name || '') + (e.type || '') + (e.id || '')) && !e.autocomplete).map(e => e.name || e.id).slice(0, 10),
        types: Array.from(new Set(fields.map(e => e.type))).join(',') };
    });
    // interactive divs
    const fake = q('[onclick]:not(a):not(button):not(input):not(select):not(summary)').filter(isVis).filter(el => !el.getAttribute('role') && el.tabIndex < 0).map(el => cssPath(el)).slice(0, 10);
    // css scan
    let focusSuppressed = 0, focusVisibleRules = 0, reduceMotionRules = 0, prefersColor = 0, sheetsBlocked = 0, infinite = 0;
    for (const sh of Array.from(d.styleSheets)) {
      let rules; try { rules = sh.cssRules; } catch (e) { sheetsBlocked++; continue; }
      const walk = rs => { for (const r of Array.from(rs)) {
        if (r.cssRules && r.media) { const mt = r.media.mediaText; if (/prefers-reduced-motion/.test(mt)) reduceMotionRules++; if (/prefers-color-scheme/.test(mt)) prefersColor++; walk(r.cssRules); }
        else if (r.cssText) { if (/:focus-visible/.test(r.selectorText || '')) focusVisibleRules++; if (/outline\s*:\s*(none|0)\b/.test(r.cssText) && /:focus/.test(r.selectorText || '')) focusSuppressed++; if (/animation[^;]*infinite/.test(r.cssText)) infinite++; }
      } };
      walk(rules);
    }
    const media = { video: q('video').map(v => ({ autoplay: v.autoplay, muted: v.muted, loop: v.loop, controls: v.controls, playsinline: v.playsInline, poster: !!v.poster, src: (v.currentSrc || v.src || '').slice(-50) })),
      iframes: q('iframe').map(f => ({ src: (f.src || '').slice(0, 70), title: f.title || null, lazy: f.loading })) };
    return { interactive: taps.length, noName: noName.slice(0, 12), noNameCount: noName.length,
      tap: { total: real.length, under44: small44.length, under24: small24.length, worst: real.slice().sort((a, b) => Math.min(a.w, a.h) - Math.min(b.w, b.h)).slice(0, 14) },
      forms, fakeButtons: fake, css: { focusSuppressed, focusVisibleRules, reduceMotionRules, prefersColor, sheetsBlocked, infiniteAnimRules: infinite },
      runningAnimations: (d.getAnimations ? d.getAnimations().filter(a => a.playState === 'running').length : null), media,
      zoomBlocked: /user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?(\D|$)/i.test((d.querySelector('meta[name=viewport]') || {}).content || '') };
  });

  // ---------- typography ----------
  sect('type', () => {
    const sizes = {}, fams = {}, tiny = [], small = []; let n = 0;
    for (const [el, t] of visText) {
      const cs = getComputedStyle(el); const fs = Math.round(parseFloat(cs.fontSize) * 10) / 10; n++;
      sizes[fs] = (sizes[fs] || 0) + 1;
      const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(); fams[fam] = (fams[fam] || 0) + 1;
      if (t.length >= 3) { if (fs < 12) tiny.push({ p: cssPath(el), fs, t: short(t, 34) }); else if (fs < 14) small.push(fs); }
    }
    const b = getComputedStyle(d.body);
    const paras = q('p').filter(isVis).filter(p => txt(p.textContent).length > 80);
    const lh = paras.slice(0, 40).map(p => { const cs = getComputedStyle(p); return parseFloat(cs.lineHeight) / parseFloat(cs.fontSize); }).filter(x => x > 0);
    const measure = paras.slice(0, 40).map(p => { const cs = getComputedStyle(p); const w = p.getBoundingClientRect().width; return Math.round(w / (parseFloat(cs.fontSize) * 0.5)); });
    const fonts = Array.from(document.fonts).filter(f => f.status === 'loaded').map(f => f.family.replace(/["']/g, '') + ' ' + f.weight);
    return { bodyFont: b.fontFamily.slice(0, 70), bodySize: b.fontSize, bodyLH: b.lineHeight, distinctSizes: Object.keys(sizes).length, sizes, families: fams,
      tinyCount: tiny.length, tiny: tiny.slice(0, 10), smallCount: small.length, avgParaLH: lh.length ? +(lh.reduce((a, b) => a + b, 0) / lh.length).toFixed(2) : null,
      maxMeasureChars: measure.length ? Math.max.apply(null, measure) : null, loadedFonts: Array.from(new Set(fonts)).slice(0, 20) };
  });

  // ---------- colour: contrast + palette ----------
  sect('color', () => {
    const groups = {}; let checked = 0, unknown = 0;
    const palette = {}, gold = [];
    for (const [el, t] of visText) {
      const cs = getComputedStyle(el); const fg0 = parseColor(cs.color); if (!fg0) continue;
      const eo = effOpacity(el); const fgA = [fg0[0], fg0[1], fg0[2], fg0[3] * eo];
      const bg = bgOf(el); const fs = parseFloat(cs.fontSize); const bold = parseInt(cs.fontWeight, 10) >= 700;
      const large = fs >= 24 || (fs >= 18.66 && bold);
      let ratios = null;
      if (bg.color) ratios = [ratio(over(fgA, bg.color), bg.color)];
      else if (bg.grad && bg.grad.length) ratios = bg.grad.map(s => ratio(over(fgA, s), s));
      else { unknown++; }
      // palette census
      const hx = hex(fg0); palette[hx] = (palette[hx] || 0) + 1;
      const hs = hsl(fg0); if (hs[1] > 0.45 && hs[2] > 0.25 && hs[2] < 0.88 && hs[0] >= 30 && hs[0] <= 65) gold.push({ kind: 'text', c: hx, t: short(t, 24), p: cssPath(el) });
      if (!ratios) continue; checked++;
      const need = large ? 3 : 4.5; const lo = Math.min.apply(null, ratios), hi = Math.max.apply(null, ratios);
      if (lo < need) {
        const key = hex(fg0) + '|' + (bg.color ? hex(bg.color) : 'grad') + '|' + (large ? 'L' : 'N');
        const g = groups[key] || (groups[key] = { fg: hex(fg0), bg: bg.color ? hex(bg.color) : 'gradient', op: +eo.toFixed(2), ratio: +lo.toFixed(2), best: +hi.toFixed(2), need, fs: Math.round(fs), count: 0, sample: short(t, 40), p: cssPath(el) });
        g.count++;
      }
    }
    // backgrounds / borders for the no-gold rule
    const bgSeen = {};
    q('body *').forEach(el => { if (!isVis(el)) return; const cs = getComputedStyle(el);
      [['bg', cs.backgroundColor], ['border', cs.borderTopColor]].forEach(([k, v]) => { const c = parseColor(v); if (!c || c[3] < 0.5) return; if (k === 'border' && parseFloat(cs.borderTopWidth) < 1) return; const hx = hex(c); if (k === 'bg') bgSeen[hx] = (bgSeen[hx] || 0) + 1; const hs = hsl(c); if (hs[1] > 0.45 && hs[2] > 0.25 && hs[2] < 0.88 && hs[0] >= 30 && hs[0] <= 65) gold.push({ kind: k, c: hx, p: cssPath(el) }); });
    });
    const top = o => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 12);
    return { checked, unknownBackground: unknown, fails: Object.values(groups).sort((a, b) => b.count - a.count).slice(0, 16), failGroups: Object.keys(groups).length,
      textPalette: top(palette), bgPalette: top(bgSeen), goldSuspects: gold.slice(0, 10), goldCount: gold.length };
  });

  // ---------- media ----------
  sect('media', () => {
    const imgs = Array.from(d.images).map(i => { const r = i.getBoundingClientRect(); const cs = getComputedStyle(i);
      return { src: (i.currentSrc || i.src || '').replace(location.origin, '').slice(0, 90), alt: i.hasAttribute('alt') ? i.getAttribute('alt') : null, nat: [i.naturalWidth, i.naturalHeight], shown: [Math.round(r.width), Math.round(r.height)], loading: i.loading, wh: i.hasAttribute('width') && i.hasAttribute('height'), vis: isVis(i) && cs.visibility !== 'hidden', top: Math.round(r.top + scrollY), role: i.getAttribute('role') }; });
    const vis = imgs.filter(i => i.vis);
    const bgs = {}; q('*').forEach(el => { const bi = getComputedStyle(el).backgroundImage; if (bi && /url\(/.test(bi) && isVis(el)) { (bi.match(/url\(["']?([^"')]+)/g) || []).forEach(u => { const k = u.replace(/url\(["']?/, '').replace(location.origin, '').slice(0, 90); const r = el.getBoundingClientRect(); if (!bgs[k]) bgs[k] = [Math.round(r.width), Math.round(r.height), absTop(el)]; }); } });
    return {
      count: imgs.length, visible: vis.length,
      noAlt: vis.filter(i => i.alt === null && i.role !== 'presentation').map(i => i.src).slice(0, 12), noAltCount: vis.filter(i => i.alt === null && i.role !== 'presentation').length,
      emptyAlt: vis.filter(i => i.alt === '').length,
      oversized: vis.filter(i => i.shown[0] > 0 && i.nat[0] / (i.shown[0] * DPR) > 1.6).map(i => i.src + ' nat' + i.nat[0] + ' shown' + i.shown[0]).slice(0, 10),
      lazyAboveFold: vis.filter(i => i.loading === 'lazy' && i.top < H).map(i => i.src).slice(0, 6),
      eagerBelowFold: vis.filter(i => i.loading !== 'lazy' && i.top > H * 2.5).length,
      noDimensions: vis.filter(i => !i.wh).length, formats: vis.reduce((o, i) => { const m = (i.src.split('?')[0].match(/\.(\w+)$/) || [, '?'])[1].toLowerCase(); o[m] = (o[m] || 0) + 1; return o; }, {}),
      images: vis.slice(0, 40).map(i => [i.src, i.alt === null ? 'NO-ALT' : short(i.alt, 28), i.shown.join('x'), i.nat.join('x'), i.loading]),
      cssBackgrounds: Object.entries(bgs).slice(0, 20),
    };
  });

  // ---------- links ----------
  sect('links', () => {
    const as = q('a[href]'); const internal = new Set(), ext = {}, wa = new Set(), bad = [], vague = [];
    as.forEach(a => {
      const h = a.getAttribute('href').trim();
      if (!h || h === '#' || /^javascript:/i.test(h)) { bad.push(short(a.textContent, 24) + ' → ' + (h || '(empty)')); return; }
      if (/^(mailto|tel|sms):/i.test(h)) return;
      let u; try { u = new URL(h, location.href); } catch (e) { bad.push('unparseable ' + h); return; }
      if (/wa\.me|whatsapp\.com/.test(u.host)) wa.add(u.pathname + (u.search ? '?' + decodeURIComponent(u.search).slice(0, 60) : ''));
      if (u.host === location.host) { if (u.pathname !== location.pathname || u.search) internal.add(u.pathname + u.search); }
      else ext[u.host] = (ext[u.host] || 0) + 1;
      if (/^(click here|read more|learn more|here|more|بیشتر|اینجا)$/i.test(txt(a.textContent))) vague.push(txt(a.textContent));
    });
    return { total: as.length, internal: Array.from(internal), external: ext, whatsapp: Array.from(wa), bad: bad.slice(0, 10), vague: vague.length };
  });

  // ---------- performance ----------
  sect('perf', () => {
    const nav = performance.getEntriesByType('navigation')[0] || {};
    const res = performance.getEntriesByType('resource').map(e => ({ n: e.name.replace(location.origin, '').slice(0, 90), host: (() => { try { return new URL(e.name).host; } catch (x) { return ''; } })(), t: e.initiatorType, ts: e.transferSize || 0, eb: e.encodedBodySize || 0, db: e.decodedBodySize || 0, d: Math.round(e.duration) }));
    const byType = {}; res.forEach(r => { const k = /\.(woff2?|ttf|otf)(\?|$)/.test(r.n) ? 'font' : /\.(png|jpe?g|webp|gif|svg|avif|ico)(\?|$)/.test(r.n) ? 'image' : /\.css(\?|$)/.test(r.n) || r.t === 'css' ? 'css' : /\.js(\?|$)/.test(r.n) || r.t === 'script' ? 'js' : r.t === 'fetch' || r.t === 'xmlhttprequest' ? 'api' : 'other'; const o = byType[k] || (byType[k] = { n: 0, enc: 0, dec: 0 }); o.n++; o.enc += r.eb; o.dec += r.db; });
    const hosts = {}; res.forEach(r => { if (r.host) hosts[r.host] = (hosts[r.host] || 0) + 1; });
    const blockingCss = q('head link[rel=stylesheet]').filter(l => !l.media || l.media === 'all' || l.media === 'screen').length;
    const blockingJs = q('head script[src]').filter(s => !s.async && !s.defer && s.type !== 'module').length;
    let inlineCss = 0, inlineJs = 0; q('style').forEach(s => inlineCss += s.textContent.length); q('script:not([src])').forEach(s => inlineJs += s.textContent.length);
    const p = window.__perf || {};
    return { requests: res.length, byType, hosts, heaviest: res.slice().sort((a, b) => b.eb - a.eb).slice(0, 12).map(r => [r.n, Math.round(r.eb / 1024) + 'KB', r.d + 'ms']),
      domNodes: d.getElementsByTagName('*').length, htmlKB: Math.round(de.outerHTML.length / 1024), inlineCssKB: Math.round(inlineCss / 1024), inlineJsKB: Math.round(inlineJs / 1024),
      blockingCss, blockingJs, ttfb: Math.round(nav.responseStart || 0), dcl: Math.round(nav.domContentLoadedEventEnd || 0), load: Math.round(nav.loadEventEnd || 0),
      fcp: p.fcp || null, lcp: p.lcp || null, lcpEl: p.lcpEl || null, cls: p.cls !== undefined ? +p.cls.toFixed(3) : null, longTasks: p.longTasks || 0, longTaskMs: p.longTaskMs || 0 };
  });

  // ---------- layout ----------
  sect('layout', () => {
    const over = []; if (de.scrollWidth > W + 1) {
      q('body *').forEach(el => { if (!isVis(el)) return; const r = el.getBoundingClientRect(); if (r.right > W + 2 && getComputedStyle(el).position !== 'fixed') over.push({ p: cssPath(el), right: Math.round(r.right), w: Math.round(r.width) }); });
    }
    return { scrollW: de.scrollWidth, innerW: W, overflowX: de.scrollWidth > W + 1, offenders: over.sort((a, b) => b.right - a.right).slice(0, 8) };
  });

  // ---------- Persian / RTL ----------
  sect('rtl', () => {
    const hasFa = s => /[؀-ۿ]/.test(s);
    let faEls = 0, ascii = 0, persian = 0, arabicIndic = 0, arabicYeh = 0, arabicKaf = 0, miSpace = 0, haSpace = 0, latinInFa = 0; const ls = [], lhLow = [], fonts = {}, physical = [];
    const allFa = [];
    for (const [el, t] of visText) {
      if (!hasFa(t)) continue; faEls++; allFa.push(t);
      const cs = getComputedStyle(el); const fs = parseFloat(cs.fontSize);
      const l = cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing);
      if (l && Math.abs(l) > 0.01) ls.push({ p: cssPath(el), ls: cs.letterSpacing, t: short(t, 26) });
      const lh = cs.lineHeight === 'normal' ? 1.2 : parseFloat(cs.lineHeight) / fs;
      if (t.length > 60 && lh < 1.6) lhLow.push({ p: cssPath(el), lh: +lh.toFixed(2), fs: Math.round(fs), t: short(t, 26) });
      const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(); fonts[fam] = (fonts[fam] || 0) + 1;
      if (cs.direction === 'ltr' && cs.textAlign === 'left') physical.push(cssPath(el));
    }
    const all = allFa.join(' ');
    ascii = (all.match(/[0-9]/g) || []).length; persian = (all.match(/[۰-۹]/g) || []).length; arabicIndic = (all.match(/[٠-٩]/g) || []).length;
    arabicYeh = (all.match(/ي/g) || []).length; arabicKaf = (all.match(/ك/g) || []).length;
    miSpace = (all.match(/(^|\s)ن?می\s[؀-ۿ]/g) || []).length; haSpace = (all.match(/[؀-ۿ]\sها(\s|$|[،.؟!])/g) || []).length;
    // physical-property CSS in the page's own stylesheets (matters on RTL pages)
    let physRules = 0, logicalRules = 0;
    for (const sh of Array.from(d.styleSheets)) { let rules; try { rules = sh.cssRules; } catch (e) { continue; } const walk = rs => { for (const r of Array.from(rs)) { if (r.cssRules) walk(r.cssRules); else if (r.cssText) { if (/(margin|padding)-(left|right)\s*:|(^|[;{ ])(left|right)\s*:|float\s*:\s*(left|right)|text-align\s*:\s*(left|right)|border-(left|right)/.test(r.cssText)) physRules++; if (/-inline-(start|end)|inset-inline|text-align\s*:\s*(start|end)/.test(r.cssText)) logicalRules++; } } }; walk(rules); }
    const faTitle = hasFa(d.title) || hasFa((d.querySelector('meta[name=description]') || {}).content || '');
    return { isRtl: getComputedStyle(d.body).direction === 'rtl', faElements: faEls, digits: { ascii, persian, arabicIndic }, arabicYeh, arabicKaf, miSpace, haSpace,
      letterSpacedFa: ls.slice(0, 8), letterSpacedCount: ls.length, lowLineHeight: lhLow.slice(0, 6), lowLineHeightCount: lhLow.length, faFonts: fonts, physicalCssRules: physRules, logicalCssRules: logicalRules, faTitleOrMeta: faTitle };
  });

  // ---------- fixed / sticky UI inventory ----------
  sect('fixed', () => {
    const out = [];
    q('body *').forEach(el => {
      const cs = getComputedStyle(el);
      if (cs.position !== 'fixed' && cs.position !== 'sticky') return;
      if (!isVis(el)) return;
      const r = el.getBoundingClientRect();
      if (r.width < 24 || r.height < 12) return;
      out.push({ p: cssPath(el), pos: cs.position, top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), w: Math.round(r.width), t: short(el.textContent, 40) });
    });
    const topEls = out.filter(o => o.top <= 4 && o.top >= -4);
    const botEls = out.filter(o => o.top > H * 0.6 && o.bottom >= H - 40);
    const topH = topEls.reduce((a, o) => Math.max(a, o.bottom), 0);
    const botH = botEls.length ? H - Math.min.apply(null, botEls.map(o => o.top)) : 0;
    return { items: out.slice(0, 10), topBarPx: topH, bottomBarPx: botH, coveredPct: +(((topH + botH) / H) * 100).toFixed(1) };
  });

  // ---------- copy metrics ----------
  sect('copy', () => {
    const root = d.querySelector('main') || d.body;
    const text = txt(root.innerText || '');
    const wordsArr = text.match(/[A-Za-z؀-ۿ0-9][A-Za-z؀-ۿ0-9'’\-]*/g) || [];
    const sents = text.split(/(?<=[.!?؟])\s+/).filter(s => s.trim().split(/\s+/).length >= 3);
    const syl = w => { w = w.toLowerCase().replace(/[^a-z]/g, ''); if (!w) return 0; const m = w.replace(/e$/, '').match(/[aeiouy]+/g); return Math.max(1, m ? m.length : 1); };
    const en = wordsArr.filter(w => /^[A-Za-z]/.test(w));
    const flesch = en.length > 50 && sents.length ? 206.835 - 1.015 * (en.length / sents.length) - 84.6 * (en.reduce((a, w) => a + syl(w), 0) / en.length) : null;
    return { words: wordsArr.length, sentences: sents.length, avgSentenceWords: sents.length ? +(wordsArr.length / sents.length).toFixed(1) : null,
      emDash: (text.match(/—/g) || []).length, semicolons: (text.match(/[;؛]/g) || []).length, exclam: (text.match(/!/g) || []).length,
      triads: (text.match(/\b[\w'-]+, [\w'-]+,? (and|or) [\w'-]+\b/g) || []).length, flesch: flesch ? Math.round(flesch) : null };
  });

  return R;
})()
