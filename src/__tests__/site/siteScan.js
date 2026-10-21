/**
 * Shared reader for the volyume.app guard tests (src/__tests__/site/*).
 *
 * Not a test file: Jest only runs *.test.js, so this is plain support code.
 * It reads everything under public/ as the visitor's browser would, with no
 * dependency beyond Node: a small tolerant HTML reader (tags, attributes,
 * comments, raw script and style text, entities) is enough for the rules the
 * guards pin, and it avoids leaning on a transitive package (jsdom, parse5)
 * that package.json does not declare.
 *
 * What it gives the guards:
 *  - every HTML page under public/ (the private admin tool public/members/ is
 *    left out of the copy and design scans, on purpose; the guards that name
 *    it ask for it explicitly);
 *  - the visible text of a page, split into blocks and sentences, with the
 *    title, the meta text and the text-bearing attributes (alt, title,
 *    aria-label, placeholder) counted as copy too;
 *  - the parts an author marks up: data-fact, data-explains;
 *  - the CSS (linked files under public/assets and inline style blocks) and
 *    the inline script text.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Buffer } = require('buffer');

const REPO = path.resolve(__dirname, '..', '..', '..');
const PUBLIC = path.join(REPO, 'public');
const ORIGIN = 'https://volyume.app';
const SUPABASE_HOST = 'sujrylzzxcqxxfygptns.supabase.co';

// ---------------------------------------------------------------------------
// Files

function walk(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return walk(full, base);
    return [path.relative(base, full).split(path.sep).join('/')];
  }).sort();
}

const allPublicFiles = () => walk(PUBLIC);
const readPublic = (rel) => fs.readFileSync(path.join(PUBLIC, rel), 'utf8');
const publicExists = (rel) => fs.existsSync(path.join(PUBLIC, rel));
const sha256 = (rel) => crypto.createHash('sha256').update(fs.readFileSync(path.join(PUBLIC, rel))).digest('hex');

// The private team admin tool. Not part of the public site.
const isMembers = (rel) => rel === 'members' || rel.startsWith('members/');

/** Every HTML file under public/, members excluded unless asked for. */
function htmlFiles({ includeMembers = false } = {}) {
  return allPublicFiles().filter((f) => /\.html$/i.test(f) && (includeMembers || !isMembers(f)));
}

/** The URL path a visitor uses for a file. */
function urlOf(rel) {
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'index.html'.length)}`;
  return `/${rel}`;
}

function cssFiles() {
  return allPublicFiles().filter((f) => /^assets\/.*\.css$/i.test(f));
}

// ---------------------------------------------------------------------------
// Entities

const NAMED = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0',
  rsquo: '\u2019', lsquo: '\u2018', ldquo: '\u201c', rdquo: '\u201d',
  sbquo: '\u201a', bdquo: '\u201e',
  mdash: '\u2014', ndash: '\u2013', hellip: '\u2026', middot: '\u00b7',
  bull: '\u2022', rarr: '\u2192', larr: '\u2190', uarr: '\u2191', darr: '\u2193',
  pound: '\u00a3', euro: '\u20ac', yen: '\u00a5', cent: '\u00a2', dollar: '$',
  copy: '\u00a9', reg: '\u00ae', trade: '\u2122', times: '\u00d7', deg: '\u00b0',
  minus: '\u2212', plusmn: '\u00b1', laquo: '\u00ab', raquo: '\u00bb',
  thinsp: '\u2009', ensp: '\u2002', emsp: '\u2003', shy: '\u00ad',
  check: '\u2713', hearts: '\u2665', star: '\u2606', starf: '\u2605',
};

function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (m, body) => {
    if (body[0] === '#') {
      const code = body[1].toLowerCase() === 'x' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      try { return String.fromCodePoint(code); } catch { return m; }
    }
    return Object.prototype.hasOwnProperty.call(NAMED, body) ? NAMED[body] : m;
  });
}

// ---------------------------------------------------------------------------
// HTML reader

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const BLOCK = new Set([
  'address', 'article', 'aside', 'blockquote', 'body', 'br', 'button', 'caption', 'dd', 'details', 'dialog', 'div', 'dl', 'dt',
  'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'label', 'legend',
  'li', 'main', 'nav', 'noscript', 'ol', 'option', 'p', 'pre', 'section', 'select', 'summary', 'table', 'tbody', 'td',
  'tfoot', 'th', 'thead', 'tr', 'ul',
]);

function parseAttrs(raw) {
  const attrs = {};
  const re = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    const value = m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : '';
    attrs[m[1].toLowerCase()] = decodeEntities(value);
  }
  return attrs;
}

function parseHtml(html) {
  const src = html.replace(/^\ufeff/, '');
  const elements = [];
  const segments = [];
  const comments = [];
  const scripts = [];
  const styles = [];
  const stack = [];
  let title = null;
  let block = 0;

  const tagRe = /<!--([\s\S]*?)-->|<!\[CDATA\[[\s\S]*?\]\]>|<![^>]*>|<\?[^>]*>|<(\/?)([a-zA-Z][^\s/>]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
  let last = 0;
  let m;
  const pushText = (raw) => {
    if (!raw) return;
    const text = decodeEntities(raw);
    if (text.trim() === '' && !segments.length) return;
    segments.push({ text, block });
  };

  while ((m = tagRe.exec(src)) !== null) {
    pushText(src.slice(last, m.index));
    last = tagRe.lastIndex;

    if (m[1] !== undefined) { comments.push(m[1]); continue; }
    if (!m[3]) continue; // doctype, CDATA, processing instruction

    const name = m[3].toLowerCase();
    if (m[2] === '/') {
      let idx = -1;
      for (let k = stack.length - 1; k >= 0; k -= 1) { if (stack[k].name === name) { idx = k; break; } }
      if (idx >= 0) {
        while (stack.length > idx) { stack.pop().end = segments.length; }
      }
      if (BLOCK.has(name)) block += 1;
      continue;
    }

    let rawAttrs = m[4] || '';
    const selfClosing = /\/\s*$/.test(rawAttrs);
    if (selfClosing) rawAttrs = rawAttrs.replace(/\/\s*$/, '');
    const attrs = parseAttrs(rawAttrs);
    const el = { name, attrs, start: segments.length, end: segments.length, parent: stack.length ? stack[stack.length - 1] : null };
    elements.push(el);
    if (BLOCK.has(name)) block += 1;

    if (name === 'script' || name === 'style' || name === 'title' || name === 'textarea') {
      const closeRe = new RegExp(`</${name}\\s*>`, 'i');
      const rest = src.slice(last);
      const cm = closeRe.exec(rest);
      const body = cm ? rest.slice(0, cm.index) : rest;
      last += body.length + (cm ? cm[0].length : 0);
      tagRe.lastIndex = last;
      if (name === 'script') scripts.push({ attrs, code: body });
      else if (name === 'style') styles.push({ attrs, code: body });
      else if (name === 'title') title = decodeEntities(body).replace(/\s+/g, ' ').trim();
      else pushText(body);
      continue;
    }

    if (VOID.has(name) || selfClosing) continue;
    stack.push(el);
  }
  pushText(src.slice(last));
  while (stack.length) stack.pop().end = segments.length;

  const textOf = (el) => segments.slice(el.start, el.end).map((s) => s.text).join('').replace(/\s+/g, ' ').trim();
  const metas = elements.filter((e) => e.name === 'meta').map((e) => e.attrs);
  const metaContent = (key) => {
    const hit = metas.find((a) => (a.name || '').toLowerCase() === key || (a.property || '').toLowerCase() === key);
    return hit ? hit.content : undefined;
  };

  return { html: src, elements, segments, comments, scripts, styles, title, metas, metaContent, textOf };
}

/** Is `child` somewhere inside `ancestor`? */
function inside(child, ancestor) {
  for (let p = child.parent; p; p = p.parent) { if (p === ancestor) return true; }
  return false;
}

const pageCache = new Map();
function readPage(rel) {
  if (!pageCache.has(rel)) pageCache.set(rel, parseHtml(readPublic(rel)));
  return pageCache.get(rel);
}

// ---------------------------------------------------------------------------
// Copy: what a visitor reads

const norm = (s) => s.replace(/\s+/g, ' ').trim();

/**
 * Split a block of text into sentences. A sentence ends at . ! or ? followed
 * by a space and a capital, digit or opening quote.
 */
function sentencesOf(text) {
  const t = norm(text);
  if (!t) return [];
  return t.split(/(?<=[.!?])\s+(?=[A-Z0-9\u2018\u201c"'(])/).map((s) => s.trim()).filter(Boolean);
}

/** The ranges of segments that sit inside an element marked data-explains. */
function explainedRanges(page) {
  return page.elements
    .filter((e) => e.attrs['data-explains'] !== undefined)
    .map((e) => [e.start, e.end]);
}

/** The ranges of segments inside an element carrying a number from the build step (data-fact). */
function factRanges(page) {
  return page.elements.filter((e) => e.attrs['data-fact'] !== undefined).map((e) => [e.start, e.end]);
}

// Journals and publishers a reference list points to.
const CITATION_HOST = /(^|\.)(nlm\.nih\.gov|doi\.org|acm\.org|nature\.com|springer\.com|sciencedirect\.com|wiley\.com|oup\.com|tandfonline\.com|bmj\.com|jamanetwork\.com|thelancet\.com|lww\.com|frontiersin\.org|mdpi\.com|plos\.org|cochranelibrary\.com)$/i;

/**
 * The ranges of segments that are a quoted source: a <cite>, anything marked
 * data-citation, and the list item (<li>) of a reference list that links to a
 * journal or publisher. A cited paper's title keeps its own words (it may say
 * "volume" or "hypertrophy"); the page's own sentences may not.
 */
function citationRanges(page) {
  const ranges = [];
  page.elements.forEach((e, i) => {
    if (e.name === 'cite' || e.attrs['data-citation'] !== undefined) ranges.push([e.start, e.end]);
    if (e.name !== 'a' || !e.attrs.href) return;
    let host = '';
    try { host = new URL(e.attrs.href, ORIGIN).hostname; } catch { return; }
    if (!CITATION_HOST.test(host)) return;
    for (let k = i - 1; k >= 0; k -= 1) {
      const c = page.elements[k];
      if (c.name === 'li' && c.start <= e.start && c.end >= e.end) { ranges.push([c.start, c.end]); break; }
    }
  });
  return ranges;
}

/**
 * The body text as blocks (a paragraph, a list item, a heading, a table cell).
 * With skipExplained, text inside an element marked data-explains is left out.
 * Quoted sources (see citationRanges) are left out unless skipCitations is false.
 */
function bodyBlocks(page, { skipExplained = false, skipCitations = true, skipFacts = false } = {}) {
  const skip = [
    ...(skipExplained ? explainedRanges(page) : []),
    ...(skipCitations ? citationRanges(page) : []),
    ...(skipFacts ? factRanges(page) : []),
  ];
  const inSkip = (i) => skip.some(([a, b]) => i >= a && i < b);
  const blocks = [];
  let cur = null;
  page.segments.forEach((seg, i) => {
    if (inSkip(i)) return;
    if (!cur || cur.block !== seg.block) {
      cur = { block: seg.block, text: '' };
      blocks.push(cur);
    }
    cur.text += seg.text;
  });
  return blocks.map((b) => norm(b.text)).filter(Boolean);
}

/**
 * Like bodyBlocks, but each block keeps the range of segments it came from, so
 * a caller can say which element a block sits under: [{text, first, last}].
 */
function blocksWithRange(page) {
  const blocks = [];
  let cur = null;
  page.segments.forEach((seg, i) => {
    if (!cur || cur.block !== seg.block) {
      cur = { block: seg.block, text: '', first: i, last: i };
      blocks.push(cur);
    }
    cur.text += seg.text;
    cur.last = i;
  });
  return blocks.map((b) => ({ text: norm(b.text), first: b.first, last: b.last })).filter((b) => b.text);
}

const TEXT_ATTRS = ['alt', 'title', 'aria-label', 'placeholder'];
const META_TEXT_KEYS = ['description', 'og:title', 'og:description', 'og:image:alt', 'twitter:title', 'twitter:description', 'twitter:image:alt'];

/** Title, meta text and text-bearing attributes, as {where, text}. */
function metaCopy(page) {
  const out = [];
  if (page.title) out.push({ where: '<title>', text: page.title });
  page.metas.forEach((a) => {
    const key = (a.name || a.property || '').toLowerCase();
    if (META_TEXT_KEYS.includes(key) && a.content) out.push({ where: `meta ${key}`, text: norm(a.content) });
  });
  page.elements.forEach((e) => {
    TEXT_ATTRS.forEach((k) => {
      if (e.attrs[k] && e.name !== 'link') out.push({ where: `${e.name}[${k}]`, text: norm(e.attrs[k]) });
    });
  });
  return out;
}

/**
 * Every unit of copy on a page as {where, text}: one per sentence of body
 * text, plus the title, meta and attribute text.
 */
function copyUnits(page, { skipExplained = false, skipCitations = true, skipFacts = false } = {}) {
  const units = [];
  bodyBlocks(page, { skipExplained, skipCitations, skipFacts }).forEach((b) => {
    sentencesOf(b).forEach((s) => units.push({ where: 'text', text: s }));
  });
  metaCopy(page).forEach((u) => {
    sentencesOf(u.text).forEach((s) => units.push({ where: u.where, text: s }));
  });
  return units;
}

/** Every string literal in a block of inline script (comments skipped). */
function scriptStrings(code) {
  const out = [];
  let i = 0;
  const n = code.length;
  while (i < n) {
    const c = code[i];
    const d = code[i + 1];
    if (c === '/' && d === '/') { while (i < n && code[i] !== '\n') i += 1; continue; }
    if (c === '/' && d === '*') { const e = code.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      let s = '';
      while (j < n && code[j] !== c) {
        if (code[j] === '\\') { s += code[j + 1] === 'u' ? '' : code[j + 1] || ''; j += 2; continue; }
        if (c !== '`' && code[j] === '\n') break;
        s += code[j];
        j += 1;
      }
      out.push(s);
      i = j + 1;
      continue;
    }
    i += 1;
  }
  return out;
}

/**
 * Script strings that read as copy: three or more words, no markup, no URL,
 * no selector. These are the sentences the working pages (challenge, email,
 * survey, profile) build in the browser.
 */
function scriptCopy(page) {
  const out = [];
  page.scripts.forEach((s) => {
    if (s.attrs.src) return;
    scriptStrings(s.code).forEach((str) => {
      const t = norm(decodeEntities(str));
      if (t.split(' ').length < 3) return;
      if (/[<>{}=;]|:\/\/|^[/#.]/.test(t)) return;
      if (!/[A-Za-z]{3,}/.test(t)) return;
      out.push(t);
    });
  });
  return out;
}

// ---------------------------------------------------------------------------
// CSS

/** Minimal rule reader: [{selector, body, atRule}] with comments removed. */
function parseCss(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const rules = [];
  const walkBlock = (text, atRule) => {
    let i = 0;
    while (i < text.length) {
      const open = text.indexOf('{', i);
      if (open < 0) break;
      const head = text.slice(i, open).trim();
      let depth = 1;
      let j = open + 1;
      while (j < text.length && depth > 0) {
        if (text[j] === '{') depth += 1;
        else if (text[j] === '}') depth -= 1;
        j += 1;
      }
      const body = text.slice(open + 1, j - 1);
      if (head.startsWith('@')) {
        if (/^@(media|supports|layer|container|document)/i.test(head)) walkBlock(body, head);
        else rules.push({ selector: head, body, atRule: head });
      } else {
        rules.push({ selector: head, body, atRule });
      }
      i = j;
    }
  };
  walkBlock(clean, null);
  return rules;
}

function declarations(body) {
  return body.split(';').map((d) => d.trim()).filter(Boolean).map((d) => {
    const k = d.indexOf(':');
    return k < 0 ? null : { prop: d.slice(0, k).trim().toLowerCase(), value: d.slice(k + 1).trim() };
  }).filter(Boolean);
}

/** CSS a page carries inline, as [{source, css}]. */
function pageCss(rel) {
  const page = readPage(rel);
  const out = page.styles.map((s, i) => ({ source: `${rel} <style>#${i + 1}`, css: s.code }));
  page.elements.filter((e) => e.attrs.style).forEach((e) => {
    out.push({ source: `${rel} <${e.name} style>`, css: `x{${e.attrs.style}}` });
  });
  return out;
}

/** Every CSS source on the site: shared files and inline blocks. */
function allCss() {
  const out = cssFiles().map((f) => ({ source: f, css: readPublic(f) }));
  htmlFiles().forEach((f) => out.push(...pageCss(f)));
  return out;
}

// ---------------------------------------------------------------------------
// Images

/** Width, height and type of a PNG, JPEG or WebP, read from its header. */
function imageSizeOf(buf) {
  if (buf.length > 24 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { type: 'png', w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i += 1; continue; }
      const marker = buf[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { type: 'jpeg', h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  if (buf.length > 30 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const kind = buf.toString('ascii', 12, 16);
    if (kind === 'VP8X') return { type: 'webp', w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
    if (kind === 'VP8 ') return { type: 'webp', w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
    if (kind === 'VP8L') { const b = buf.readUInt32LE(21); return { type: 'webp', w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 }; }
  }
  return null;
}
const imageSize = (rel) => imageSizeOf(fs.readFileSync(path.join(PUBLIC, rel)));
const fileSize = (rel) => fs.statSync(path.join(PUBLIC, rel)).size;

// ---------------------------------------------------------------------------
// Links

const isLocalHost = (host) => host === 'volyume.app' || host === 'www.volyume.app';

/**
 * Resolve a reference found on a page.
 * Returns {kind:'external'|'scheme'|'anchor'|'local'|'broken-url', ...}.
 */
function resolveRef(ref, fromRel) {
  const raw = ref.trim();
  if (raw === '' || raw.startsWith('data:') || raw.startsWith('blob:')) return { kind: 'scheme' };
  if (raw.startsWith('#')) return { kind: 'anchor', fragment: raw.slice(1) };
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^https?:/i.test(raw)) {
    return { kind: 'scheme', scheme: raw.split(':')[0].toLowerCase() };
  }
  let u;
  try {
    u = new URL(raw.startsWith('//') ? `https:${raw}` : raw, `${ORIGIN}${urlOf(fromRel)}`);
  } catch {
    return { kind: 'broken-url' };
  }
  if (!isLocalHost(u.hostname)) return { kind: 'external', host: u.hostname, url: u.href };
  let p = u.pathname;
  try { p = decodeURIComponent(p); } catch { /* keep the raw path */ }
  return { kind: 'local', path: p, fragment: u.hash.replace(/^#/, ''), search: u.search };
}

/** Does a site path resolve to a file a static host would serve? */
function pathResolves(p) {
  const clean = p.replace(/^\/+/, '');
  if (clean === '') return publicExists('index.html');
  if (publicExists(clean) && fs.statSync(path.join(PUBLIC, clean)).isFile()) return true;
  return publicExists(`${clean.replace(/\/+$/, '')}/index.html`);
}

/** Paths the 404 page forwards: /partner/CODE and /c/CODE. */
const FORWARDED = [/^\/partner\/[A-Za-z0-9]{8,}\/?$/, /^\/c\/[A-Za-z0-9-]{3,32}\/?$/];

module.exports = {
  REPO, PUBLIC, ORIGIN, SUPABASE_HOST,
  allPublicFiles, readPublic, publicExists, sha256, isMembers, htmlFiles, urlOf, cssFiles,
  decodeEntities, parseHtml, inside, readPage, norm, sentencesOf, bodyBlocks, blocksWithRange, metaCopy, copyUnits,
  scriptStrings, scriptCopy, explainedRanges, citationRanges, factRanges,
  parseCss, declarations, pageCss, allCss,
  imageSizeOf, imageSize, fileSize,
  isLocalHost, resolveRef, pathResolves, FORWARDED,
};
