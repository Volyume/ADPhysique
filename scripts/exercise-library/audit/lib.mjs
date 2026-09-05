#!/usr/bin/env node
/**
 * scripts/exercise-library/audit/lib.mjs
 *
 * Shared, deterministic helpers for the corpus-audit scripts (Part III of
 * the founder brief 2026-09-05, authority
 * docs/exercise-library-expansion-2026-09-05/README.md +
 * 05-DECISIONS.md EL-2/EL-3/EL-5). Read-only on src/: every script in this
 * directory imports the app's own pure modules for ground truth instead of
 * re-deriving their logic, per the job brief.
 *
 * Nothing here writes outside docs/exercise-library-expansion-2026-09-05/
 * or scripts/exercise-library/audit/.
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const OUT_DIR = join(ROOT, 'docs/exercise-library-expansion-2026-09-05/data/audit');

/**
 * SUBREGION_REQUIREMENTS, extracted from planEngine.js source text.
 * planEngine.js cannot be imported directly under plain Node: its own
 * import specifiers omit file extensions (`from './coachingGoals'`, etc.),
 * which Metro/Babel resolve at RN build time but Node's ESM loader
 * refuses — same category of problem loadSeed.mjs documents for
 * seedExercises.js, same fix (parse the source text for the one exported
 * object this script needs, eval it in isolation, never re-derive its
 * values by hand).
 */
export function loadSubregionRequirements() {
  const src = readFileSync(join(ROOT, 'src/lib/planEngine.js'), 'utf8');
  const start = src.indexOf('export const SUBREGION_REQUIREMENTS = {');
  if (start === -1) throw new Error('loadSubregionRequirements: could not find SUBREGION_REQUIREMENTS in planEngine.js');
  const braceStart = src.indexOf('{', start);
  let depth = 0;
  let end = -1;
  for (let i = braceStart; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  if (end === -1) throw new Error('loadSubregionRequirements: unbalanced braces reading SUBREGION_REQUIREMENTS');
  const literal = src.slice(braceStart, end);
  // eslint-disable-next-line no-new-func
  return Function(`"use strict"; return (${literal});`)();
}

export function writeJson(filename, data) {
  mkdirSync(OUT_DIR, { recursive: true });
  const path = join(OUT_DIR, filename);
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
  return path;
}

/** Count rows by a key-deriving function. Returns a plain object, sorted by
 *  descending count then key, so output is deterministic and readable. */
export function countBy(rows, fn) {
  const counts = new Map();
  for (const r of rows) {
    const k = fn(r);
    const key = k === null || k === undefined ? 'null' : String(k);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.fromEntries(
    [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
  );
}

/** Normalise a name for near-duplicate detection: lower-case, strip
 *  punctuation, expand common abbreviations, collapse whitespace, sort
 *  words (word-order independence per the brief). */
const ABBREV = [
  [/\bdb\b/g, 'dumbbell'],
  [/\bbb\b/g, 'barbell'],
  [/\bkb\b/g, 'kettlebell'],
];
export function normalizeNameForDupeCheck(name) {
  let s = String(name || '').toLowerCase();
  s = s.replace(/[()]/g, ' ');
  s = s.replace(/[-,]/g, ' ');
  s = s.replace(/[^a-z0-9\s]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  for (const [re, rep] of ABBREV) s = s.replace(re, rep);
  const words = s.split(' ').filter(Boolean).sort();
  return words.join(' ');
}

/** Loose normalisation used only for exact-duplicate (case/whitespace-only)
 *  detection: preserves word order, only folds case and collapses spaces. */
export function normalizeNameCaseOnly(name) {
  return String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Expand DB/BB/KB shorthand to their full words (whole-word only), same
 *  substitutions as normalizeNameForDupeCheck, WITHOUT sorting — callers
 *  that need order-sensitive tokens (near-tuple pairwise diff) use this so
 *  "Single-Leg Romanian Deadlift (DB)" and "... (Dumbbell)" tokenize to the
 *  same words instead of leaving a spurious 2-letter diff token. */
export function expandAbbreviations(name) {
  let s = String(name || '').toLowerCase();
  for (const [re, rep] of ABBREV) s = s.replace(re, rep);
  return s;
}

export function tokenize(name) {
  return expandAbbreviations(name)
    .replace(/[()]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function jaccard(a, b) {
  const sa = new Set(a);
  const sb = new Set(b);
  const inter = [...sa].filter((x) => sb.has(x)).length;
  const union = new Set([...sa, ...sb]).size;
  return union === 0 ? 0 : inter / union;
}

export function symmetricDiff(a, b) {
  const sa = new Set(a);
  const sb = new Set(b);
  const onlyA = [...sa].filter((x) => !sb.has(x));
  const onlyB = [...sb].filter((x) => !sa.has(x));
  return { onlyA, onlyB };
}
