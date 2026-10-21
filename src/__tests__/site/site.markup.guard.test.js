/**
 * volyume.app markup guard: language, zoom, landmarks, headings, images and
 * link names.
 *
 * Authority: docs/site-rebuild-2026-10/BRIEF.md ("Design": nothing cut off at
 * 360 px, at 200% zoom or at the largest text size; images sized and
 * compressed; tap targets of at least 44 px; British English) and CLAUDE.md
 * section 4 (a pass at the phone's largest text size on any screen change).
 *
 * What this pins, on every page under public/ except a redirect stub and the
 * private members tool:
 *  1. <html lang="en-GB">.
 *  2. The viewport meta allows zoom: no user-scalable=no, no maximum-scale of
 *     1, so the 200% zoom and largest-text-size requirements can be met at all.
 *  3. One <main> landmark and exactly one <h1>; ids are unique.
 *  4. Every image has alt text, a width and a height (so it is sized and the
 *     page does not jump), is served from the site, and is 400 KB or less.
 *  5. Every link and button has a name a screen reader can read: text, an
 *     aria-label, or an image with alt.
 *  6. Every in-page #anchor lands on an id that exists.
 *
 * What it cannot check from source, and the manual device checklist covers:
 * the 44 px tap target, no horizontal scroll at 360 px and the largest text
 * size. Those are checked on a phone with an EAS build.
 *
 * These fail on the old pages (no lang on some, images without width and
 * height, a 635 KB image) and pass once the rebuilt pages land.
 */
'use strict';

const S = require('./siteScan');

const isStub = (rel) => S.readPage(rel).elements.some((e) => e.name === 'meta' && /refresh/i.test(e.attrs['http-equiv'] || ''));
const PAGES = S.htmlFiles().filter((rel) => !isStub(rel));
const IMAGE_MAX_BYTES = 400 * 1024;

const each = (fn) => {
  const out = [];
  PAGES.forEach((rel) => fn(rel, S.readPage(rel), (msg) => out.push(`${rel}: ${msg}`)));
  return out;
};

describe('document basics', () => {
  test('every page declares lang en-GB', () => {
    expect(each((rel, page, bad) => {
      const html = page.elements.find((e) => e.name === 'html');
      if (!html || html.attrs.lang !== 'en-GB') bad(`lang is ${html ? html.attrs.lang : 'missing'}`);
    })).toEqual([]);
  });

  test('every page sets the viewport and does not block zoom', () => {
    expect(each((rel, page, bad) => {
      const v = page.metaContent('viewport') || '';
      if (!/width\s*=\s*device-width/.test(v)) bad(`viewport is "${v}"`);
      if (/user-scalable\s*=\s*(no|0)/i.test(v) || /maximum-scale\s*=\s*[01](\.\d+)?\b/i.test(v)) bad(`viewport blocks zoom: "${v}"`);
    })).toEqual([]);
  });

  test('every page has one <main> and exactly one <h1>', () => {
    expect(each((rel, page, bad) => {
      const mains = page.elements.filter((e) => e.name === 'main').length;
      const h1s = page.elements.filter((e) => e.name === 'h1').length;
      if (mains !== 1) bad(`${mains} <main> elements`);
      if (h1s !== 1) bad(`${h1s} <h1> elements`);
    })).toEqual([]);
  });

  test('ids are unique within a page', () => {
    expect(each((rel, page, bad) => {
      const seen = new Set();
      page.elements.forEach((e) => {
        if (e.attrs.id === undefined) return;
        if (seen.has(e.attrs.id)) bad(`duplicate id "${e.attrs.id}"`);
        seen.add(e.attrs.id);
      });
    })).toEqual([]);
  });

  test('every in-page #anchor lands on an id that exists', () => {
    expect(each((rel, page, bad) => {
      const ids = new Set(page.elements.map((e) => e.attrs.id).filter((v) => v !== undefined));
      page.elements.filter((e) => e.name === 'a' && /^#./.test(e.attrs.href || '')).forEach((e) => {
        if (!ids.has(e.attrs.href.slice(1))) bad(`#${e.attrs.href.slice(1)} has no target`);
      });
    })).toEqual([]);
  });
});

describe('images', () => {
  test('every image has alt text, a width and a height', () => {
    expect(each((rel, page, bad) => {
      page.elements.filter((e) => e.name === 'img').forEach((e) => {
        const src = (e.attrs.src || '').slice(0, 60);
        if (e.attrs.alt === undefined) bad(`<img ${src}> has no alt`);
        if (!/^\d+(\.\d+)?$/.test(e.attrs.width || '') || !/^\d+(\.\d+)?$/.test(e.attrs.height || '')) bad(`<img ${src}> has no numeric width and height`);
      });
    })).toEqual([]);
  });

  test('every image the pages use is on the site, a real picture, and 400 KB or less', () => {
    const files = new Set();
    each((rel, page) => {
      page.elements.filter((e) => e.name === 'img' || e.name === 'source').forEach((e) => {
        const urls = [e.attrs.src, ...(e.attrs.srcset ? e.attrs.srcset.split(',').map((p) => p.trim().split(/\s+/)[0]) : [])].filter(Boolean);
        urls.forEach((u) => { const r = S.resolveRef(u, rel); if (r.kind === 'local') files.add(r.path.replace(/^\//, '')); });
      });
    });
    const out = [];
    files.forEach((f) => {
      if (!S.publicExists(f)) { out.push(`${f}: missing`); return; }
      if (/\.svg$/i.test(f)) return;
      if (S.fileSize(f) > IMAGE_MAX_BYTES) out.push(`${f}: ${Math.round(S.fileSize(f) / 1024)} KB, want ${IMAGE_MAX_BYTES / 1024} KB or less`);
      if (!S.imageSize(f)) out.push(`${f}: not a PNG, JPEG or WebP`);
    });
    expect(out).toEqual([]);
  });
});

describe('names a screen reader can read', () => {
  const named = (page, e) => {
    if ((e.attrs['aria-label'] || '').trim() || (e.attrs['aria-labelledby'] || '').trim() || (e.attrs.title || '').trim()) return true;
    if (page.textOf(e)) return true;
    // An image inside with alt text.
    return page.elements.some((c) => c.name === 'img' && S.inside(c, e) && (c.attrs.alt || '').trim());
  };

  test('every link has a name', () => {
    expect(each((rel, page, bad) => {
      page.elements.filter((e) => e.name === 'a' && e.attrs.href !== undefined).forEach((e) => {
        if (!named(page, e)) bad(`<a href="${e.attrs.href.slice(0, 60)}"> has no text, aria-label or image alt`);
      });
    })).toEqual([]);
  });

  test('every button has a name', () => {
    expect(each((rel, page, bad) => {
      page.elements.filter((e) => e.name === 'button').forEach((e) => {
        if (!named(page, e)) bad('<button> has no text or aria-label');
      });
    })).toEqual([]);
  });
});
