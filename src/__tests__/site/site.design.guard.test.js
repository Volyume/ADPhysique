/**
 * volyume.app design guard: the stylesheets follow the app and keep the
 * brief's "no" list.
 *
 * Authority: docs/site-rebuild-2026-10/BRIEF.md ("Design"), docs/rules/styling.md
 * and src/styles/theme.js (colours, radii, text sizes) and fontFamily.js.
 *
 * What this pins, over public/assets/*.css and every <style> block and style
 * attribute in an HTML page (public/members/ excluded):
 *  1. Clipped text is impossible by construction: no text-overflow: ellipsis,
 *     no line-clamp, no white-space: nowrap (unless the selector is on the
 *     allow-list below), and no overflow-x: hidden on html or body, which
 *     hides a horizontal overflow instead of fixing it.
 *  2. No pills. A radius is a theme.js radius (6, 10, 16, 20), never 999, 50%
 *     or a "full" variable, except on images and avatars (ROUND_OK below is
 *     the allow-list mechanism: add a selector pattern with a reason).
 *  3. No gradient text, glow, glass or blobs: no background-clip: text, no
 *     text-shadow, no backdrop-filter, no filter: blur. No animation that
 *     runs forever, no autoplay, no marquee.
 *  4. Nothing external: no remote font, stylesheet, @import or url().
 *  5. The site follows the app: colours live only in the generated
 *     assets/tokens.css and every hex in it is a colour theme.js defines, with
 *     the dark core first and the light core under prefers-color-scheme; text
 *     sizes are never set in px outside tokens.css (so the largest text size
 *     scales them); fonts are Inter and Inter Display served from the site.
 *
 * These fail on the old pages (inline stylesheets with hard-coded colours,
 * pill and round radii, backdrop blur, system fonts) and pass once the
 * rebuilt pages land on assets/site.css and assets/tokens.css.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const S = require('./siteScan');
const { declProblems } = require('./siteCssRules');

const THEME = fs.readFileSync(path.join(S.REPO, 'src', 'styles', 'theme.js'), 'utf8');
const TOKENS = 'assets/tokens.css';
const SITE_CSS = 'assets/site.css';

// ---------------------------------------------------------------------------
// What theme.js defines

function objectBody(name) {
  const start = THEME.indexOf(`${name} = {`);
  if (start < 0) return '';
  return THEME.slice(start, THEME.indexOf('\n};', start));
}
function themeColours(name) {
  const out = {};
  for (const m of objectBody(name).matchAll(/^\s*(\w+):\s*'(#[0-9A-Fa-f]{6})'/gm)) out[m[1]] = m[2].toLowerCase();
  return out;
}
const DARK = themeColours('const baseColors');
const LIGHT = themeColours('const lightColors');
const THEME_HEX = new Set((THEME.match(/#[0-9a-fA-F]{6}\b/g) || []).map((h) => h.toLowerCase()));
const RADII = Object.fromEntries([...objectBody('export const radius').matchAll(/^\s*(\w+):\s*(\d+)/gm)].map((m) => [m[1], Number(m[2])]));
const RADIUS_PX = new Set(Object.entries(RADII).filter(([k]) => k !== 'full').map(([, v]) => v));

// ---------------------------------------------------------------------------
// Allow-lists (a selector pattern with the reason it is allowed)

// Round on purpose: an image or an avatar, never text or a control.
const ROUND_OK = [
  /(^|[\s>+~(])(img|picture|video|canvas)(?![\w-])/i,
  /\.avatar(?![\w-])/i,
];
// Text that is known to fit on one line (a fixed-length label). Empty: the
// rebuilt pages let text wrap.
const NOWRAP_OK = [];

// ---------------------------------------------------------------------------
// Reading every rule on the site

const SOURCES = S.allCss();
const rulesOf = (src) => S.parseCss(src.css).map((r) => ({ ...r, source: src.source, decls: S.declarations(r.body) }));
const ALL_RULES = SOURCES.flatMap(rulesOf);
const RULES = ALL_RULES.filter((r) => !/^@font-face/i.test(r.selector));

/** Problems of one category across every rule on the site, as readable lines. */
function problems(...cats) {
  const out = [];
  RULES.forEach((r) => r.decls.forEach((d) => {
    declProblems(d, r, { radiusPx: RADIUS_PX, roundOk: ROUND_OK, nowrapOk: NOWRAP_OK, isTokens: r.source === TOKENS })
      .filter((p) => cats.includes(p.cat))
      .forEach((p) => out.push(`${r.source} ${r.selector.slice(0, 60)} { ${d.prop}: ${d.value.slice(0, 60)} } ${p.msg}`));
  }));
  return out;
}

const isSharedFile = (source) => source.startsWith('assets/');

describe('stylesheets exist and are generated from the app', () => {
  test('assets/tokens.css and assets/site.css exist, and tokens.css says it is generated from theme.js', () => {
    expect({ tokens: S.publicExists(TOKENS), site: S.publicExists(SITE_CSS) }).toEqual({ tokens: true, site: true });
    const head = S.publicExists(TOKENS) ? S.readPublic(TOKENS).slice(0, 600) : '';
    expect(head).toMatch(/generated/i);
    expect(head).toContain('src/styles/theme.js');
  });

  test('every page links the shared stylesheet', () => {
    const missing = S.htmlFiles().filter((rel) => {
      const page = S.readPage(rel);
      if (page.elements.some((e) => e.name === 'meta' && /refresh/i.test(e.attrs['http-equiv'] || ''))) return false; // a redirect stub
      return !page.elements.some((e) => e.name === 'link' && /stylesheet/i.test(e.attrs.rel || '') && /\/assets\/site\.css(\?|$)/.test(e.attrs.href || ''));
    });
    expect(missing).toEqual([]);
  });

  test('tokens.css carries the dark palette first and the light palette under prefers-color-scheme', () => {
    const css = S.publicExists(TOKENS) ? S.readPublic(TOKENS) : '';
    const rules = S.parseCss(css);
    const darkRule = rules.find((r) => r.selector.trim() === ':root' && !r.atRule);
    const lightRule = rules.find((r) => /prefers-color-scheme:\s*light/i.test(r.atRule || ''));
    expect({ dark: !!darkRule, light: !!lightRule }).toEqual({ dark: true, light: true });
    const hexIn = (r) => new Set((r.body.match(/#[0-9a-fA-F]{6}\b/g) || []).map((h) => h.toLowerCase()));
    ['background', 'surface', 'primary', 'primaryFill', 'textPrimary', 'textSecondary'].forEach((k) => {
      expect({ k, in: darkRule && hexIn(darkRule).has(DARK[k]) }).toEqual({ k, in: true });
      expect({ k, in: lightRule && hexIn(lightRule).has(LIGHT[k]) }).toEqual({ k, in: true });
    });
  });

  test('every hex colour in tokens.css is a colour theme.js defines', () => {
    const css = S.publicExists(TOKENS) ? S.readPublic(TOKENS) : '';
    const strangers = [...new Set((css.match(/#[0-9a-fA-F]{3,8}\b/g) || []).map((h) => h.toLowerCase()))].filter((h) => !THEME_HEX.has(h));
    expect(strangers).toEqual([]);
  });

  test('the radius tokens are the theme radii and there is no "full" radius', () => {
    const css = S.publicExists(TOKENS) ? S.readPublic(TOKENS) : '';
    const names = [...css.matchAll(/(--[\w-]*(radius|round|pill|corner)[\w-]*)\s*:\s*([^;]+);/gi)].map((m) => [m[1], m[3].trim()]);
    expect(names.length).toBeGreaterThan(0);
    const bad = names.filter(([n, v]) => /full|pill|circle|round(ed)?$/i.test(n) || parseFloat(v) >= 999);
    expect(bad).toEqual([]);
    expect(css).toContain(`${RADII.lg}px`);
  });

  test('the colour scheme is declared for both themes', () => {
    const css = SOURCES.filter((s) => isSharedFile(s.source)).map((s) => s.css).join('\n');
    expect(css).toMatch(/color-scheme\s*:\s*[^;]*\bdark\b[^;]*\blight\b|color-scheme\s*:\s*[^;]*\blight\b[^;]*\bdark\b/i);
  });
});

describe('no clipped text', () => {
  test('no text-overflow: ellipsis and no line-clamp, in any stylesheet', () => {
    expect(problems('clip')).toEqual([]);
  });

  test('no white-space: nowrap on text that might not fit', () => {
    expect(problems('nowrap')).toEqual([]);
  });

  test('no overflow-x: hidden on html or body (it hides a horizontal overflow instead of fixing it)', () => {
    expect(problems('overflow')).toEqual([]);
  });
});

describe('no pills', () => {
  test('a radius is a theme radius, not 999, 50% or a full/pill variable, except on images and avatars', () => {
    expect(problems('radius')).toEqual([]);
  });

  test('no custom property is a "full", "pill" or "round" radius', () => {
    const bad = [];
    ALL_RULES.forEach((r) => r.decls.forEach((d) => {
      declProblems(d, r, { radiusPx: RADIUS_PX, roundOk: ROUND_OK, nowrapOk: NOWRAP_OK, isTokens: true })
        .filter((p) => p.cat === 'radius-var').forEach((p) => bad.push(`${r.source} ${p.msg}`));
    }));
    expect(bad).toEqual([]);
  });
});

describe('no gradient text, glow, glass or motion that never stops', () => {
  test('no background-clip: text and no transparent text fill', () => {
    expect(problems('gradient-text')).toEqual([]);
  });

  test('no text-shadow, backdrop-filter or blur filter', () => {
    expect(problems('glow', 'glass')).toEqual([]);
  });

  test('no animation that runs forever', () => {
    expect(problems('motion')).toEqual([]);
  });

  test('no autoplay, marquee or blink in a page', () => {
    const out = [];
    S.htmlFiles().forEach((rel) => S.readPage(rel).elements.forEach((e) => {
      if (/^(marquee|blink)$/.test(e.name)) out.push(`${rel} <${e.name}>`);
      if (e.attrs.autoplay !== undefined) out.push(`${rel} <${e.name} autoplay>`);
    }));
    expect(out).toEqual([]);
  });
});

describe('nothing is fetched from another host', () => {
  test('no external url(), @import or font in any stylesheet', () => {
    const out = SOURCES.flatMap((s) => {
      const hits = [...s.css.matchAll(/(url\(\s*['"]?\s*(https?:)?\/\/[^)]*\)|@import\s+(url\()?\s*['"]?\s*(https?:)?\/\/[^;]*)/gi)];
      return hits.map((m) => `${s.source}: ${m[0].slice(0, 80)}`);
    });
    expect(out).toEqual([]);
  });

  test('every url() in the shared stylesheets points at a file that exists', () => {
    const out = [];
    SOURCES.filter((s) => s.source.startsWith('assets/')).forEach((s) => {
      for (const m of s.css.matchAll(/url\(\s*['"]?([^'")]+?)['"]?\s*\)/gi)) {
        const ref = m[1];
        if (/^(data:|#)/.test(ref)) continue;
        const r = S.resolveRef(ref, s.source);
        if (r.kind === 'local' && !S.pathResolves(r.path)) out.push(`${s.source}: ${ref}`);
        if (r.kind === 'external') out.push(`${s.source}: external ${ref}`);
      }
    });
    expect(out).toEqual([]);
  });
});

describe('the site follows the app', () => {
  test('colours are written only in the generated tokens.css', () => {
    expect(problems('colour')).toEqual([]);
  });

  test('text sizes are never set in px outside tokens.css, so the largest text size scales them', () => {
    expect(problems('size-px')).toEqual([]);
  });

  test('no text smaller than the app\'s smallest size (11)', () => {
    expect(problems('size-min')).toEqual([]);
  });

  test('fonts are Inter and Inter Display, served from the site, in the weights the app uses', () => {
    const faces = ALL_RULES.filter((r) => /^@font-face/i.test(r.selector)).map((r) => {
      const get = (p) => (r.decls.find((d) => d.prop === p) || {}).value || '';
      return { family: get('font-family').replace(/['"]/g, '').trim(), weight: get('font-weight'), display: get('font-display'), src: get('src'), source: r.source };
    });
    const weights = (family) => faces.filter((f) => f.family === family).flatMap((f) => (f.weight.split(/\s+/).length === 2 ? [] : [Number(f.weight)]));
    expect(weights('Inter').sort()).toEqual(expect.arrayContaining([400, 500, 600, 700, 800]));
    expect(weights('Inter Display').sort()).toEqual(expect.arrayContaining([700, 800]));
    faces.forEach((f) => {
      expect({ family: f.family, swap: /swap|optional/.test(f.display) }).toEqual({ family: f.family, swap: true });
      const urls = [...f.src.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)].map((m) => m[1]);
      expect(urls.length).toBeGreaterThan(0);
      urls.forEach((u) => {
        const r = S.resolveRef(u, f.source);
        expect({ u, local: r.kind === 'local' && S.pathResolves(r.path) }).toEqual({ u, local: true });
      });
    });
    const named = new Set();
    RULES.forEach((r) => r.decls.forEach((d) => {
      if (d.prop === 'font-family' || (d.prop.startsWith('--') && /font|family/.test(d.prop))) {
        d.value.split(',').forEach((f) => { const n = f.trim().replace(/['"]/g, '').toLowerCase(); if (n && !n.startsWith('var(')) named.add(n); });
      }
    }));
    const GENERIC = new Set(['inter', 'inter display', 'ionicons', 'system-ui', '-apple-system', 'blinkmacsystemfont', 'segoe ui', 'roboto', 'helvetica neue', 'helvetica', 'arial', 'sans-serif', 'serif', 'monospace', 'ui-monospace', 'sf mono', 'menlo', 'consolas', 'courier new', 'inherit']);
    expect([...named].filter((n) => !GENERIC.has(n))).toEqual([]);
    expect(named.has('inter')).toBe(true);
    expect(named.has('inter display')).toBe(true);
  });
});
