#!/usr/bin/env node
/**
 * scripts/site/build.mjs: the volyume.app build step.
 *
 * GitHub Pages publishes public/ exactly as it is committed, so everything
 * the site takes from the app is generated here, committed, and checked for
 * drift. Run it after changing the app's theme, fonts or library data, or
 * after editing a page:
 *
 *   node scripts/site/build.mjs           write every output
 *   node scripts/site/build.mjs --check   write nothing; exit 1 if any output
 *                                         differs from what is committed
 *
 * What it writes (all under public/):
 *   assets/tokens.css        CSS custom properties from src/styles/theme.js:
 *                            the dark palette by default, the light palette
 *                            under prefers-color-scheme: light, the app's
 *                            higher-contrast tables under prefers-contrast:
 *                            more, the narrow-phone type step, spacing,
 *                            radii, text sizes, line heights, weights and the
 *                            @font-face rules for the faces in fontFamily.js.
 *   assets/fonts/            the app's Inter TTFs and their licence, copied
 *                            from assets/fonts/. The .woff beside each TTF is
 *                            written by scripts/site/ttf-to-woff.py and kept
 *                            in step by this build: it stops if one is missing
 *                            or no longer holds the same font tables.
 *   assets/icons/ionicons.svg  an SVG sprite of exactly the Ionicons the
 *                            pages reference (href="/assets/icons/
 *                            ionicons.svg#NAME"), traced from the Ionicons
 *                            font the app ships, plus its licence.
 *   assets/facts.json        every number the site states, measured from
 *                            the code (see FACTS below for each method).
 *   docs/web/privacy.html    a byte copy of public/privacy/index.html (the
 *                            single copy of the policy; see the note below).
 *   **.html                  the text of every element marked
 *                            data-fact="KEY" set to that fact's text, and the
 *                            shared header and footer (scripts/site/partials/)
 *                            copied between their marker comments, so every
 *                            page carries the same markup.
 *
 * Plain Node 22. Nothing is installed: app modules load through the repo's
 * own Babel config (see load-app-module.cjs).
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const { loadAppModule, ROOT } = require('./load-app-module.cjs');

const PUBLIC = path.join(ROOT, 'public');
const CHECK = process.argv.includes('--check');

/** Every output, keyed by repo-relative path. Values are Buffers. */
const outputs = new Map();
const problems = [];

function rel(p) {
  return path.relative(ROOT, p).split(path.sep).join('/');
}
function put(relPath, content) {
  outputs.set(relPath, Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8'));
}

// ─── 1. Design tokens ──────────────────────────────────────────────────────

const theme = loadAppModule('src/styles/theme.js');
const { fontFamily } = loadAppModule('src/styles/fontFamily.js');

const kebab = (key) => key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
const rem = (px) => `${+(px / 16).toFixed(4)}rem`;

function colourBlock(colors, base) {
  return Object.keys(colors)
    .filter((k) => typeof colors[k] === 'string' && (!base || colors[k] !== base[k]))
    .map((k) => `  --color-${kebab(k)}: ${colors[k]};`);
}

function cardShadow(resolved) {
  if (resolved.resolvedTheme !== 'light') return 'none';
  const s = resolved.shadow.card;
  const hex = s.shadowColor.replace('#', '');
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  return `${s.shadowOffset.width}px ${s.shadowOffset.height}px ${s.shadowRadius}px rgba(${r}, ${g}, ${b}, ${s.shadowOpacity})`;
}

/** The faces in fontFamily.js, as @font-face facts. 'mono' is the system face. */
function fontFaces() {
  return Object.entries(fontFamily)
    .filter(([, face]) => face !== 'monospace')
    .map(([key, face]) => {
      const family = face.startsWith('InterDisplay') ? 'Inter Display' : 'Inter';
      // regular, medium, semibold, bold and heavy are fontWeight keys; the
      // display faces (displayBold, displayHeavy) take the weight they name.
      const weightKey = theme.fontWeight[key] ? key : key.replace(/^display/, '').toLowerCase();
      const weight = theme.fontWeight[weightKey];
      if (!weight) throw new Error(`No font weight for fontFamily.${key}`);
      return { key, face, family, weight, file: `${face}.ttf`, woff: `${face}.woff` };
    });
}

function buildTokens() {
  const dark = theme.resolveTheme({ theme: 'dark' });
  const light = theme.resolveTheme({ theme: 'light' });
  const darkHC = theme.resolveTheme({ theme: 'dark', higherContrast: true });
  const lightHC = theme.resolveTheme({ theme: 'light', higherContrast: true });
  const narrow = theme.resolveTheme({ theme: 'dark', narrow: true });

  const lines = [];
  lines.push('/*');
  lines.push(' * GENERATED by scripts/site/build.mjs from src/styles/theme.js and');
  lines.push(' * src/styles/fontFamily.js. Do not edit by hand: change the app\'s theme');
  lines.push(' * and run `npm run site:build`. `--check` fails while this file is stale.');
  lines.push(' *');
  lines.push(' * Dark is the default, as in the app. Light follows the device. The app\'s');
  lines.push(' * "Higher contrast" tables follow prefers-contrast: more. Text sizes are');
  lines.push(' * the app\'s, in rem (value / 16) so the reader\'s text size setting');
  lines.push(' * applies. radius.full (999) is left out on purpose: the site has no');
  lines.push(' * capsule shapes.');
  lines.push(' */');
  lines.push('');
  for (const f of fontFaces()) {
    lines.push('@font-face {');
    lines.push(`  font-family: "${f.family}";`);
    lines.push('  font-style: normal;');
    lines.push(`  font-weight: ${f.weight};`);
    lines.push('  font-display: swap;');
    // WOFF first (about half the bytes), the TrueType file as the fallback.
    lines.push(`  src: url("/assets/fonts/${f.woff}") format("woff"), url("/assets/fonts/${f.file}") format("truetype");`);
    lines.push('}');
  }
  lines.push('');
  lines.push(':root {');
  lines.push('  color-scheme: dark;');
  lines.push(...colourBlock(dark.colors));
  lines.push(`  --shadow-card: ${cardShadow(dark)};`);
  lines.push('');
  for (const [k, v] of Object.entries(theme.spacing)) lines.push(`  --space-${kebab(k)}: ${v}px;`);
  lines.push('');
  for (const [k, v] of Object.entries(theme.radius)) {
    if (k === 'full') continue;
    lines.push(`  --radius-${kebab(k)}: ${v}px;`);
  }
  lines.push('');
  for (const [k, v] of Object.entries(dark.fontSize)) lines.push(`  --font-size-${kebab(k)}: ${rem(v)}; /* ${v}px */`);
  lines.push('');
  for (const [k, v] of Object.entries(theme.lineHeight)) lines.push(`  --line-height-${kebab(k)}: ${v};`);
  lines.push('');
  const seenWeights = new Set();
  for (const [k, v] of Object.entries(theme.fontWeight)) {
    if (seenWeights.has(v)) continue; // 'black' repeats 'heavy'
    seenWeights.add(v);
    lines.push(`  --font-weight-${kebab(k)}: ${v};`);
  }
  lines.push('');
  for (const [k, v] of Object.entries(theme.letterSpacing)) lines.push(`  --letter-spacing-${kebab(k)}: ${v}px;`);
  lines.push('');
  for (const [k, v] of Object.entries(theme.iconSize)) lines.push(`  --icon-size-${kebab(k)}: ${v}px;`);
  lines.push('');
  lines.push('  --font-text: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;');
  lines.push('  --font-display: "Inter Display", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;');
  lines.push('}');
  lines.push('');

  const narrowSizes = Object.keys(narrow.fontSize).filter((k) => narrow.fontSize[k] !== dark.fontSize[k]);
  if (narrowSizes.length) {
    lines.push(`/* The app steps its three display sizes down one notch below ${theme.NARROW_WIDTH_DP} wide. */`);
    lines.push(`@media (max-width: ${theme.NARROW_WIDTH_DP - 0.02}px) {`);
    lines.push('  :root {');
    for (const k of narrowSizes) lines.push(`    --font-size-${kebab(k)}: ${rem(narrow.fontSize[k])}; /* ${narrow.fontSize[k]}px */`);
    lines.push('  }');
    lines.push('}');
    lines.push('');
  }

  lines.push('@media (prefers-color-scheme: light) {');
  lines.push('  :root {');
  lines.push('    color-scheme: light;');
  lines.push(...colourBlock(light.colors, dark.colors).map((l) => `  ${l}`));
  lines.push(`    --shadow-card: ${cardShadow(light)};`);
  lines.push('  }');
  lines.push('}');
  lines.push('');
  lines.push('@media (prefers-contrast: more) {');
  lines.push('  :root {');
  lines.push(...colourBlock(darkHC.colors, dark.colors).map((l) => `  ${l}`));
  lines.push('  }');
  lines.push('}');
  lines.push('');
  lines.push('@media (prefers-color-scheme: light) and (prefers-contrast: more) {');
  lines.push('  :root {');
  lines.push(...colourBlock(lightHC.colors, light.colors).map((l) => `  ${l}`));
  lines.push('  }');
  lines.push('}');
  lines.push('');
  return lines.join('\n');
}

put('public/assets/tokens.css', buildTokens());

// ─── 2. Fonts ──────────────────────────────────────────────────────────────

for (const f of fontFaces()) {
  const src = path.join(ROOT, 'assets', 'fonts', f.file);
  if (!fs.existsSync(src)) throw new Error(`fontFamily.${f.key} names ${f.file}, which is not in assets/fonts/`);
  put(`public/assets/fonts/${f.file}`, fs.readFileSync(src));
}
put('public/assets/fonts/INTER_LICENSE.txt', fs.readFileSync(path.join(ROOT, 'assets', 'fonts', 'INTER_LICENSE.txt')));

/** The tables of a TrueType file as { tag: Buffer }. */
function ttfTables(buf) {
  const out = {};
  for (let i = 0; i < buf.readUInt16BE(4); i++) {
    const o = 12 + i * 16;
    out[buf.toString('latin1', o, o + 4)] = buf.subarray(buf.readUInt32BE(o + 8), buf.readUInt32BE(o + 8) + buf.readUInt32BE(o + 12));
  }
  return out;
}

/** The tables of a WOFF 1.0 file as { tag: Buffer }, each one inflated. */
function woffTables(buf) {
  if (buf.toString('latin1', 0, 4) !== 'wOFF') throw new Error('not a WOFF file');
  if (buf.readUInt32BE(8) !== buf.length) throw new Error('its length field does not match the file');
  const out = {};
  for (let i = 0; i < buf.readUInt16BE(12); i++) {
    const o = 44 + i * 20;
    const raw = buf.subarray(buf.readUInt32BE(o + 4), buf.readUInt32BE(o + 4) + buf.readUInt32BE(o + 8));
    out[buf.toString('latin1', o, o + 4)] = buf.readUInt32BE(o + 8) < buf.readUInt32BE(o + 12) ? zlib.inflateSync(raw) : raw;
  }
  return out;
}

// Each TTF has a .woff beside it (scripts/site/ttf-to-woff.py). The WOFF is
// committed like every other output, so check it still holds the TTF's tables.
for (const f of fontFaces()) {
  const woffPath = path.join(PUBLIC, 'assets', 'fonts', f.woff);
  const hint = `Run: python3 scripts/site/ttf-to-woff.py public/assets/fonts/${f.file}`;
  if (!fs.existsSync(woffPath)) { problems.push(`public/assets/fonts/${f.woff} is missing. ${hint}`); continue; }
  const want = ttfTables(fs.readFileSync(path.join(ROOT, 'assets', 'fonts', f.file)));
  let got;
  try { got = woffTables(fs.readFileSync(woffPath)); } catch (e) { problems.push(`public/assets/fonts/${f.woff}: ${e.message}. ${hint}`); continue; }
  const same = Object.keys(want).length === Object.keys(got).length && Object.keys(want).every((tag) => got[tag] && got[tag].equals(want[tag]));
  if (!same) problems.push(`public/assets/fonts/${f.woff} no longer holds the tables of assets/fonts/${f.file}. ${hint}`);
}

// ─── 3. Facts ──────────────────────────────────────────────────────────────
//
// Each fact names its source. A fact that cannot be measured stops the build;
// it never falls back to a remembered number.

const enGB = new Intl.NumberFormat('en-GB');
const whole = (n) => enGB.format(n);
const over = (n, step) => `over ${enGB.format(Math.floor(n / step) * step)}`;

/** The food importer's own usability test, read from seed.js so the count follows it. */
function importerRowTest() {
  const src = fs.readFileSync(path.join(ROOT, 'src/lib/food/seed.js'), 'utf8');
  const usable = src.match(/function _isUsableRow\(row\) \{[\s\S]*?\n\}/);
  const num = src.match(/function _num\(v\) \{[\s\S]*?\n\}/);
  if (!usable || !num) throw new Error('Could not find _isUsableRow and _num in src/lib/food/seed.js');
  return new Function(`${num[0]}\n${usable[0]}\nreturn _isUsableRow;`)();
}

function countBundledFoods() {
  const isUsable = importerRowTest();
  const files = [
    { file: 'assets/seed/off_uk_snapshot.dat', source: 'off' },
    { file: 'assets/seed/cofid_uk.dat', source: 'cofid' },
  ];
  const seen = new Set();
  let count = 0;
  for (const { file, source } of files) {
    const parsed = JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
    if (!Array.isArray(parsed.rows)) throw new Error(`${file} has no rows`);
    for (const row of parsed.rows) {
      if (!isUsable(row)) continue;
      // The importer upserts ON CONFLICT(source, source_id); source_id is row.ean.
      if (row.ean != null) {
        const key = `${source}:${row.ean}`;
        if (seen.has(key)) continue;
        seen.add(key);
      }
      count += 1;
    }
  }
  return count;
}

/** A literal array constant read from a file the build cannot import (a screen). */
function literalArray(relPath, name) {
  const src = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  const m = src.match(new RegExp(`const ${name} = (\\[[0-9,\\s]*\\]);`));
  if (!m) throw new Error(`Could not find ${name} in ${relPath}`);
  return JSON.parse(m[1]);
}

function measureFacts() {
  const { CORPUS } = loadAppModule('src/lib/exerciseCorpus/index.js');
  const { LIBRARY_PLANS } = loadAppModule('src/lib/seedRoutines.js');
  const { CURATED_MEALS } = loadAppModule('src/lib/food/curatedMeals.js');
  const { ARCHETYPE_OPTIONS } = loadAppModule('src/lib/trainingArchetypes.js');
  const { PHYSIQUE_GOALS } = loadAppModule('src/lib/coachingGoals.js');
  const clips = loadAppModule('src/lib/clips/rules.js');
  const days = literalArray('src/screens/PlanUpdateScreen.js', 'DAYS_OPTIONS');
  const foods = countBundledFoods();
  const categories = PHYSIQUE_GOALS.filter((g) => g.value !== 'general');

  const facts = {
    exercises: {
      value: CORPUS.length,
      text: whole(CORPUS.length),
      source: 'CORPUS.length, src/lib/exerciseCorpus/index.js (live entries, retired stubs excluded)',
    },
    plans: {
      value: LIBRARY_PLANS.length,
      text: whole(LIBRARY_PLANS.length),
      source: 'LIBRARY_PLANS.length, src/lib/seedRoutines.js (literal, band plans and authored plan)',
    },
    foods: {
      value: foods,
      text: over(foods, 1000),
      source: 'rows in assets/seed/off_uk_snapshot.dat and cofid_uk.dat that pass _isUsableRow in src/lib/food/seed.js, one per (source, ean)',
    },
    curatedMeals: {
      value: CURATED_MEALS.length,
      text: whole(CURATED_MEALS.length),
      source: 'CURATED_MEALS.length, src/lib/food/curatedMeals.js',
    },
    trainingStyles: {
      value: ARCHETYPE_OPTIONS.length,
      text: whole(ARCHETYPE_OPTIONS.length),
      source: 'ARCHETYPE_OPTIONS.length, src/lib/trainingArchetypes.js',
    },
    physiqueCategories: {
      value: categories.length,
      text: whole(categories.length),
      source: "PHYSIQUE_GOALS without 'general' (Not competing), src/lib/coachingGoals.js",
    },
    planDaysMin: {
      value: Math.min(...days),
      text: whole(Math.min(...days)),
      source: 'smallest DAYS_OPTIONS, src/screens/PlanUpdateScreen.js',
    },
    planDaysMax: {
      value: Math.max(...days),
      text: whole(Math.max(...days)),
      source: 'largest DAYS_OPTIONS, src/screens/PlanUpdateScreen.js',
    },
    setVideosPerWorkout: {
      value: clips.MAX_CLIPS_PER_WORKOUT,
      text: whole(clips.MAX_CLIPS_PER_WORKOUT),
      source: 'MAX_CLIPS_PER_WORKOUT, src/lib/clips/rules.js',
    },
    setVideoKeepDays: {
      value: clips.DEFAULT_KEEP_DAYS,
      text: whole(clips.DEFAULT_KEEP_DAYS),
      source: 'DEFAULT_KEEP_DAYS, src/lib/clips/rules.js',
    },
  };
  for (const [key, f] of Object.entries(facts)) {
    if (!Number.isInteger(f.value) || f.value <= 0) throw new Error(`Fact ${key} measured as ${f.value}`);
  }
  return facts;
}

const FACTS = measureFacts();
put('public/assets/facts.json', `${JSON.stringify({
  note: 'GENERATED by scripts/site/build.mjs. Every number the site states, measured from the code. Pages show `text` inside elements marked data-fact="KEY".',
  facts: FACTS,
}, null, 2)}\n`);

// ─── 4. Pages: shared partials and facts ───────────────────────────────────

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return e.name.endsWith('.html') ? [p] : [];
  });
}

const PARTIALS = ['header', 'footer'].map((name) => ({
  name,
  open: `<!-- site:${name} -->`,
  close: `<!-- /site:${name} -->`,
  body: fs.readFileSync(path.join(HERE, 'partials', `${name}.html`), 'utf8').replace(/\s+$/, ''),
}));

const FACT_ELEMENT = /(<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?\sdata-fact="([^"]*)"[^>]*>)([^<]*)(<\/\2>)/g;
const iconNames = new Set();

for (const file of walk(PUBLIC)) {
  const before = fs.readFileSync(file, 'utf8');
  let html = before;

  for (const p of PARTIALS) {
    const start = html.indexOf(p.open);
    if (start === -1) continue;
    const end = html.indexOf(p.close, start);
    if (end === -1) { problems.push(`${rel(file)}: ${p.open} has no ${p.close}`); continue; }
    html = `${html.slice(0, start + p.open.length)}\n${p.body}\n${html.slice(end)}`;
  }

  html = html.replace(FACT_ELEMENT, (whole0, open, _tag, key, _text, close) => {
    const fact = FACTS[key];
    if (!fact) { problems.push(`${rel(file)}: unknown data-fact="${key}"`); return whole0; }
    return `${open}${fact.text}${close}`;
  });

  for (const m of html.matchAll(/\/assets\/icons\/ionicons\.svg#([a-z0-9-]+)/g)) iconNames.add(m[1]);
  if (html !== before) put(rel(file), html);
}

// The privacy policy has one copy: public/privacy/index.html (public/privacy.html
// is a redirect to it). docs/web/privacy.html mirrors it byte for byte, because
// the privacy guards compare every copy of the policy. It is written here, from
// the finished page, so the two cannot drift. Its links point at the site's own
// files, so it reads in full but is only styled when served from the site.
put('docs/web/privacy.html', outputs.get('public/privacy/index.html') || fs.readFileSync(path.join(PUBLIC, 'privacy', 'index.html')));

// ─── 5. Icons: an SVG sprite traced from the app's Ionicons font ───────────

const ICON_DIR = path.join(ROOT, 'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons');

function readTrueType(buf) {
  const tables = {};
  for (let i = 0; i < buf.readUInt16BE(4); i++) {
    const o = 12 + i * 16;
    tables[buf.toString('latin1', o, o + 4)] = buf.readUInt32BE(o + 8);
  }
  const longLoca = buf.readInt16BE(tables.head + 50) === 1;
  const loca = (g) => (longLoca ? buf.readUInt32BE(tables.loca + g * 4) : buf.readUInt16BE(tables.loca + g * 2) * 2);

  let format4 = null;
  for (let i = 0; i < buf.readUInt16BE(tables.cmap + 2); i++) {
    const r = tables.cmap + 4 + i * 8;
    const at = tables.cmap + buf.readUInt32BE(r + 4);
    if (buf.readUInt16BE(r) === 3 && buf.readUInt16BE(r + 2) === 1 && buf.readUInt16BE(at) === 4) format4 = at;
  }
  if (!format4) throw new Error('Ionicons.ttf has no Windows Unicode cmap');

  function glyphId(cp) {
    const segX2 = buf.readUInt16BE(format4 + 6);
    const ends = format4 + 14;
    const starts = ends + segX2 + 2;
    const deltas = starts + segX2;
    const offsets = deltas + segX2;
    for (let i = 0; i < segX2 / 2; i++) {
      if (cp > buf.readUInt16BE(ends + i * 2)) continue;
      const start = buf.readUInt16BE(starts + i * 2);
      if (cp < start) return 0;
      const delta = buf.readInt16BE(deltas + i * 2);
      const ro = buf.readUInt16BE(offsets + i * 2);
      if (ro === 0) return (cp + delta) & 0xffff;
      const g = buf.readUInt16BE(offsets + i * 2 + ro + (cp - start) * 2);
      return g === 0 ? 0 : (g + delta) & 0xffff;
    }
    return 0;
  }

  /** Simple glyph outlines as [{x, y, on}] contours (the font has no composites). */
  function contours(g) {
    const start = tables.glyf + loca(g);
    if (loca(g + 1) === loca(g)) return [];
    const n = buf.readInt16BE(start);
    if (n < 0) throw new Error(`glyph ${g} is composite, which this tracer does not read`);
    const endPts = [];
    for (let i = 0; i < n; i++) endPts.push(buf.readUInt16BE(start + 10 + i * 2));
    const count = endPts[n - 1] + 1;
    let p = start + 10 + n * 2;
    p += 2 + buf.readUInt16BE(p);
    const flags = [];
    while (flags.length < count) {
      const f = buf[p++];
      flags.push(f);
      if (f & 8) { const rep = buf[p++]; for (let r = 0; r < rep; r++) flags.push(f); }
    }
    const xs = [];
    let x = 0;
    for (const f of flags) {
      if (f & 2) { const d = buf[p++]; x += f & 16 ? d : -d; } else if (!(f & 16)) { x += buf.readInt16BE(p); p += 2; }
      xs.push(x);
    }
    const ys = [];
    let y = 0;
    for (const f of flags) {
      if (f & 4) { const d = buf[p++]; y += f & 32 ? d : -d; } else if (!(f & 32)) { y += buf.readInt16BE(p); p += 2; }
      ys.push(y);
    }
    const out = [];
    let from = 0;
    for (const end of endPts) {
      const c = [];
      for (let i = from; i <= end; i++) c.push({ x: xs[i], y: ys[i], on: Boolean(flags[i] & 1) });
      out.push(c);
      from = end + 1;
    }
    return out;
  }
  return { glyphId, contours, unitsPerEm: buf.readUInt16BE(tables.head + 18) };
}

/** TrueType quadratic contours to an SVG path, y flipped with the baseline at `base`. */
function svgPath(contourList, base) {
  const n = (v) => +v.toFixed(1);
  const pt = (q) => `${n(q.x)} ${n(base - q.y)}`;
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, on: true });
  let d = '';
  for (const c of contourList) {
    if (!c.length) continue;
    let first = c.findIndex((q) => q.on);
    let points;
    if (first === -1) {
      const m = mid(c[0], c[1 % c.length]);
      points = [m, ...c.slice(1), c[0]];
      first = 0;
    } else {
      points = [...c.slice(first), ...c.slice(0, first)];
    }
    d += `M${pt(points[0])}`;
    let ctrl = null;
    for (let i = 1; i <= points.length; i++) {
      const q = points[i % points.length];
      if (q.on) {
        d += ctrl ? `Q${pt(ctrl)} ${pt(q)}` : `L${pt(q)}`;
        ctrl = null;
      } else if (ctrl) {
        const m = mid(ctrl, q);
        d += `Q${pt(ctrl)} ${pt(m)}`;
        ctrl = q;
      } else {
        ctrl = q;
      }
    }
    d += 'Z';
  }
  return d;
}

function buildIconSprite(names) {
  const font = readTrueType(fs.readFileSync(path.join(ICON_DIR, 'Fonts/Ionicons.ttf')));
  const glyphMap = JSON.parse(fs.readFileSync(path.join(ICON_DIR, 'glyphmaps/Ionicons.json'), 'utf8'));
  const em = font.unitsPerEm;
  const base = em - em / 8; // Ionicons sit on a 512 square with 64 units below the baseline
  const symbols = [...names].sort().map((name) => {
    const cp = glyphMap[name];
    if (!cp) { problems.push(`Ionicons has no icon named "${name}"`); return ''; }
    const d = svgPath(font.contours(font.glyphId(cp)), base);
    return `<symbol id="${name}" viewBox="0 0 ${em} ${em}"><path d="${d}"/></symbol>`;
  });
  return [
    '<svg xmlns="http://www.w3.org/2000/svg">',
    '<!-- GENERATED by scripts/site/build.mjs from the Ionicons font in @expo/vector-icons (MIT). See IONICONS_LICENSE.txt. -->',
    ...symbols.filter(Boolean),
    '</svg>',
    '',
  ].join('\n');
}

put('public/assets/icons/ionicons.svg', buildIconSprite(iconNames));
const iconPkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules/@expo/vector-icons/package.json'), 'utf8'));
put('public/assets/icons/IONICONS_LICENSE.txt', [
  'Icons on this site are Ionicons, the icon set the Volyume app uses.',
  'Ionicons is made by Ionic (https://ionic.io) and released under the MIT License.',
  `The shapes in ionicons.svg are traced from the Ionicons font in @expo/vector-icons ${iconPkg.version},`,
  'whose licence follows.',
  '',
  fs.readFileSync(path.join(ROOT, 'node_modules/@expo/vector-icons/LICENSE'), 'utf8').trimEnd(),
  '',
].join('\n'));

// ─── 6. Write, or check ────────────────────────────────────────────────────

if (problems.length) {
  for (const p of problems) console.error(`site build: ${p}`);
  process.exit(1);
}

const stale = [];
for (const [relPath, content] of outputs) {
  const abs = path.join(ROOT, relPath);
  const current = fs.existsSync(abs) ? fs.readFileSync(abs) : null;
  if (current && current.equals(content)) continue;
  stale.push(relPath);
  if (!CHECK) {
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }
}

const summary = Object.entries(FACTS).map(([k, f]) => `${k}=${f.value}`).join(' ');
if (CHECK) {
  if (stale.length) {
    console.error('site build --check: these files are not what the build would write:');
    for (const s of stale) console.error(`  ${s}`);
    console.error('Run `npm run site:build` and commit the result.');
    process.exit(1);
  }
  console.log(`site build --check: ${outputs.size} outputs up to date (${summary})`);
} else {
  console.log(`site build: ${stale.length} of ${outputs.size} outputs written (${summary})`);
}
