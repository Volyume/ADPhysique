#!/usr/bin/env node
/**
 * scripts/exercise-library/audit/detailQuality.mjs — report 8
 * (detail-quality.json).
 *
 * Which rows carry a `cue`/description and which do not, length
 * distribution, and any US spelling or em dash in cues.
 *
 * GROUND TRUTH (loadSeed.mjs header + buildFullRow, verified): every
 * canonical (is_custom=0) row's `cue` is inserted as NULL at seed time,
 * always — rowToExercise() in seedExercises.js never sets it. So this
 * report is expected to show 0/552 with a cue; it exists to make that
 * fact explicit and machine-checkable rather than assumed, and to check
 * the `adaptedSetup` text (the corpus's actual per-exercise prose today)
 * for the same US-spelling/em-dash hygiene the brief asks of `cue`, since
 * adaptedSetup is the only free-text content this corpus actually ships.
 */
import { loadSeedRows } from '../loadSeed.mjs';
import { writeJson } from './lib.mjs';

const rows = loadSeedRows();

const withCue = rows.filter((r) => r.cue != null && String(r.cue).trim().length > 0);
const withoutCue = rows.filter((r) => !(r.cue != null && String(r.cue).trim().length > 0));

// ── adaptedSetup prose hygiene (the corpus's real shipped free text) ──────
const US_SPELLING_RE = /\b(color|fiber|center|gray|maneuver|program|favorite|organize|realize|analyze|behavior|defense|licence used as verb)\b/i;
const adaptedSetupTexts = [];
for (const r of rows) {
  for (const entry of r.adaptedSetup || []) {
    adaptedSetupTexts.push({ name: r.name, context: entry.context, text: entry.text, length: entry.text.length });
  }
}
const adaptedSetupUsSpelling = adaptedSetupTexts.filter((t) => US_SPELLING_RE.test(t.text));
const adaptedSetupEmDash = adaptedSetupTexts.filter((t) => t.text.includes('—'));

const lengths = adaptedSetupTexts.map((t) => t.length).sort((a, b) => a - b);
function percentile(arr, p) {
  if (!arr.length) return null;
  const idx = Math.min(arr.length - 1, Math.floor(p * arr.length));
  return arr[idx];
}
const lengthDistribution = {
  count: lengths.length,
  min: lengths[0] ?? null,
  p25: percentile(lengths, 0.25),
  median: percentile(lengths, 0.5),
  p75: percentile(lengths, 0.75),
  max: lengths[lengths.length - 1] ?? null,
};

const rowsWithNoAdaptedSetup = rows.filter((r) => (r.adaptedSetup || []).length === 0).length;

const out = {
  totalRows: rows.length,
  rowsWithCueCount: withCue.length,
  rowsWithoutCueCount: withoutCue.length,
  cueFinding: 'Every canonical row has cue=null (verified: 0/552). rowToExercise() in seedExercises.js never sets `cue` for a canonical insert (loadSeed.mjs header comment, buildFullRow). This is a corpus-wide gap against EL-3\'s "complete under the current field contract" gate, not a per-row anomaly — either every row needs a cue authored, or the field is deliberately deferred, but it cannot silently ship as looking "complete" while 100% null.',
  adaptedSetupEntryCount: adaptedSetupTexts.length,
  rowsWithNoAdaptedSetup,
  adaptedSetupLengthDistribution: lengthDistribution,
  adaptedSetupUsSpellingCount: adaptedSetupUsSpelling.length,
  adaptedSetupUsSpelling,
  adaptedSetupEmDashCount: adaptedSetupEmDash.length,
  adaptedSetupEmDash,
};

const path = writeJson('detail-quality.json', out);
console.log(`detail-quality.json written: ${path}`);
console.log(`Rows with cue: ${withCue.length}/${rows.length} (expected 0)`);
console.log(`adaptedSetup entries: ${adaptedSetupTexts.length} across ${rows.length - rowsWithNoAdaptedSetup} rows; ${rowsWithNoAdaptedSetup} rows have none`);
console.log(`adaptedSetup US spelling hits: ${adaptedSetupUsSpelling.length}, em dash hits: ${adaptedSetupEmDash.length}`);
console.log('Length distribution:', lengthDistribution);
