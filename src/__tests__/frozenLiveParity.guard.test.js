/**
 * frozenLiveParity.guard.test.js — a colour-bearing style key consumed from
 * the live theme must EXIST in the live theme.
 *
 * WHY THIS SUITE EXISTS. 153 files in this app write every colour twice: a
 * frozen `StyleSheet.create` block baked at import time, and a
 * `buildLiveStyles(t)` object rebuilt per render from `useTheme()`. A screen
 * composes them as `[styles.K, live.K]`, so the live half wins at runtime and
 * the frozen half is the boot-time fallback.
 *
 * That arrangement has one silent failure mode, and this campaign hit it NINE
 * times: a key defined in the frozen half WITH A COLOUR, consumed as
 * `[styles.K, live.K]`, and never defined in `buildLiveStyles`. `live.K`
 * resolves `undefined`, React Native drops it from the style array without
 * complaint, and the frozen boot-time value wins PERMANENTLY -- so the element
 * keeps the palette the app started in and never flips with the theme. Nothing
 * throws. Nothing lints. Every existing test passes, because every existing
 * test asserts the frozen value.
 *
 * Finding the ninth by hand is not a strategy. This finds them mechanically.
 *
 * THE SECOND TEST is the mirror image: a frozen key that carries NO colour
 * correctly has no live twin (that is the migrated-primitive convention), so
 * the `live.K` beside it is dead. Harmless at runtime, but it reads as if the
 * element follows the theme when there is nothing left to follow, and it is
 * what a future reader would "fix" by inventing a live twin. Two were created
 * by this very campaign, stripping chrome off `MacroRings`' card and
 * `LoggedSetRow`'s row.
 *
 * WHAT IT DOES NOT CLAIM. It does not check that the two halves AGREE on a
 * value -- the other shape of this defect. D174's structural differ reported
 * zero instances of that across 2,386 keys in 137 files. This checks only the
 * shape that hides.
 *
 * SCOPE. Product source only. A key consumed as `live.K` but defined in NO
 * frozen StyleSheet in the file is not a style key at all -- it is an
 * unrelated local named `live` (`ProgressPhotoCompare.js:397` has an array,
 * so `live.length` looked like a missing style until this rule excluded it).
 *
 * TWO BUGS IN THIS SUITE'S OWN FIRST DRAFTS, recorded because both are the
 * kind that make a guard pass by measuring nothing:
 *  1. A "skip files with a spread" escape hatch tested for `...` anywhere in
 *     the function body. `...t.type.caption` is the house idiom, so it skipped
 *     almost every file. Caught by mutation-testing: deleting a real key left
 *     the suite green. The check is now depth-aware.
 *  2. Only `buildLiveStyles` was read, so the six keys of
 *     `ManualBuilderScreen`'s SECOND builder, `buildBalanceLiveStyles`, all
 *     reported as missing. Every `build*Styles` function is read now.
 * The coverage test at the bottom exists so neither can recur silently.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..');

function listSourceFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) listSourceFiles(p, out);
    else if (entry.name.endsWith('.js') && !entry.name.endsWith('.test.js')) out.push(p);
  }
  return out;
}

/** Strip comments, so a key NAMED in prose is never read as a definition. */
function code(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/**
 * Top-level keys of an object literal starting at `open`, by brace depth.
 * Depth 1 is inside the literal, which is where style keys live; anything
 * deeper is a style VALUE's own properties (`{ color: ..., fontSize: ... }`)
 * and must not be mistaken for a key. Returns null on an unbalanced scan
 * rather than guessing, and reports a depth-1 spread so an unanalysable
 * object degrades to "not measured" instead of "wrong".
 */
function topLevelKeys(text, open) {
  const keys = new Map();
  let spread = false;
  let depth = 0;
  // The key whose value we are currently inside, and where that value began.
  // A value runs until the NEXT depth-1 key or the literal's close -- NOT to
  // end of line. Slicing to end of line was this suite's third self-inflicted
  // bug: `approachCardDesc: {` carries its colour on the following line, so a
  // one-line slice read it as pure layout and filed a REAL defect under the
  // harmless list. A guard that downgrades the thing it exists to catch is
  // worse than no guard.
  let openKey = null;
  let valueStart = 0;
  const close = (end) => { if (openKey !== null) keys.set(openKey, text.slice(valueStart, end)); };

  for (let i = open; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '{' || ch === '[' || ch === '(') { depth += 1; continue; }
    if (ch === '}' || ch === ']' || ch === ')') {
      depth -= 1;
      if (depth === 0) { close(i); return { keys, spread }; }
      continue;
    }
    if (depth !== 1) continue;
    if (ch === '.' && text.startsWith('...', i)) { spread = true; continue; }
    const m = /^([A-Za-z_$][\w$]*)\s*:/.exec(text.slice(i));
    if (m && !/[\w$.]/.test(text[i - 1] || '')) {
      close(i);
      openKey = m[1];
      valueStart = i + m[0].length;
      i += m[0].length - 1;
    }
  }
  return null;
}

/** Every key any `build*Styles(t)` function in the file returns. */
function liveKeys(text) {
  const out = new Set();
  let spread = false;
  let found = false;
  for (const m of text.matchAll(/function\s+build[A-Za-z]*Styles\s*\(/g)) {
    const retAt = text.indexOf('return', m.index);
    if (retAt === -1) continue;
    const open = text.indexOf('{', retAt);
    if (open === -1) continue;
    const scan = topLevelKeys(text, open);
    if (scan === null) return null;
    found = true;
    if (scan.spread) spread = true;
    for (const k of scan.keys.keys()) out.add(k);
  }
  return found ? { keys: out, spread } : null;
}

/** Every key any `StyleSheet.create({...})` in the file defines, with its text. */
function frozenKeys(text) {
  const out = new Map();
  for (const m of text.matchAll(/StyleSheet\s*\.\s*create\s*\(/g)) {
    const open = text.indexOf('{', m.index);
    if (open === -1) continue;
    const scan = topLevelKeys(text, open);
    if (scan === null) continue;
    for (const [k, v] of scan.keys) out.set(k, v);
  }
  return out;
}

// A frozen value that mentions any of these follows the palette, so dropping
// its live twin freezes it at boot. A value with none of them is pure layout.
const CARRIES_A_TOKEN = /\b(colors|withAlpha|type|fontSize|shadow)\s*[.(]/;

const missingLiveTwin = [];
const deadConsumption = [];
let filesMeasured = 0;

for (const file of listSourceFiles(SRC)) {
  const text = code(fs.readFileSync(file, 'utf8'));
  const live = liveKeys(text);
  if (live === null || live.spread) continue;
  const frozen = frozenKeys(text);
  if (frozen.size === 0) continue;
  filesMeasured += 1;

  const rel = path.relative(SRC, file).split(path.sep).join('/');
  const consumed = new Set();
  for (const m of text.matchAll(/\blive\s*\.\s*([A-Za-z_$][\w$]*)/g)) consumed.add(m[1]);

  for (const key of consumed) {
    if (live.keys.has(key)) continue;
    // Not a style key at all -- an unrelated local named `live`.
    if (!frozen.has(key)) continue;
    if (CARRIES_A_TOKEN.test(frozen.get(key))) missingLiveTwin.push(`${rel} - live.${key}`);
    else deadConsumption.push(`${rel} - live.${key}`);
  }
}

describe('frozen/live parity', () => {
  test('no colour-bearing frozen key is consumed live without a live twin', () => {
    // THE DEFECT. Written to FAIL: the tenth instance turns this red with the
    // file and key named, instead of shipping an element that silently stops
    // following the theme.
    expect(missingLiveTwin.sort()).toEqual([]);
  });

  test('no dead live.K sits beside a frozen key that carries no colour', () => {
    // THE CRUFT. A palette-invariant frozen key correctly has no live twin, so
    // the `live.K` beside it should go rather than tempt someone to invent one.
    expect(deadConsumption.sort()).toEqual([]);
  });

  test('the scan actually measures the app, rather than skipping it', () => {
    // Both of this suite's own first-draft bugs made it measure almost nothing
    // while passing. This pins the coverage so that cannot recur silently.
    expect(filesMeasured).toBeGreaterThan(100);
  });
});
