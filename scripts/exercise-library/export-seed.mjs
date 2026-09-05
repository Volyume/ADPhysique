#!/usr/bin/env node
/**
 * scripts/exercise-library/export-seed.mjs
 *
 * Writes the campaign's machine-readable snapshot of the current canonical
 * exercise library (docs/exercise-library-expansion-2026-09-05/README.md):
 *
 *   data/seed-export.json  - every row loadSeedRows() produces, sorted by
 *                             name, with a stable key order.
 *   data/seed-enums.json   - every value actually in use per field, with
 *                            counts, so the corpus audit (02) and the
 *                            market benchmark (03) work from real usage
 *                            rather than the theoretical enum lists in the
 *                            derivation modules.
 *
 * Deterministic; reads only src/lib via loadSeed.mjs, writes only the two
 * files above. Run: node scripts/exercise-library/export-seed.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadSeedRows, SEED_ROW_COLUMNS } from './loadSeed.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DATA_DIR = join(ROOT, 'docs/exercise-library-expansion-2026-09-05/data');

// Stable key order for every exported row. Every field loadSeedRows()
// produces must appear here — a field left off this list is silently
// dropped from the export, so it doubles as a checklist against
// buildFullRow()'s output shape.
const KEY_ORDER = [
  'name', 'canonicalId',
  'primaryMuscle', 'secondaryMuscles', 'subregion', 'movementFamily',
  'equipment', 'equipmentCategory', 'equipmentProfiles', 'machineType',
  'movementPattern', 'compoundIsolation', 'force', 'laterality',
  'defaultRepMin', 'defaultRepMax', 'fatigueCost', 'stimulusToFatigueRatio',
  'difficulty', 'machineOk', 'homeOk',
  'exerciseType', 'loadSemantics', 'exerciseCategory', 'incrementKg', 'cue',
  'position', 'floorAccess', 'overheadPosition', 'gripDemand',
  'unilateralLoadable', 'bilateralUpper', 'bilateralLower', 'axialLoad',
  'impact', 'balanceDemand', 'weightBearingHands',
  'adaptedSetup', 'demandValidationErrors', 'isCustom',
];

function orderRow(row) {
  const out = {};
  for (const k of KEY_ORDER) out[k] = row[k];
  const extra = Object.keys(row).filter((k) => !KEY_ORDER.includes(k));
  if (extra.length) {
    throw new Error(`export-seed: row "${row.name}" carries fields not in KEY_ORDER: ${extra.join(', ')}`);
  }
  return out;
}

function countBy(rows, field, { arrayField = false } = {}) {
  const counts = {};
  for (const r of rows) {
    const v = r[field];
    const values = arrayField ? (Array.isArray(v) ? v : []) : [v];
    for (const val of values) {
      const key = val === null || val === undefined ? '(null)' : String(val);
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }
  // Sort by count desc, then key asc, for a stable, readable file.
  return Object.fromEntries(
    Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
  );
}

function buildEnums(rows) {
  const scalarFields = [
    'primaryMuscle', 'subregion', 'movementFamily', 'equipment',
    'equipmentCategory', 'machineType', 'movementPattern', 'compoundIsolation',
    'force', 'laterality', 'difficulty', 'machineOk', 'homeOk',
    'exerciseType', 'loadSemantics', 'exerciseCategory', 'incrementKg', 'cue',
    'position', 'floorAccess', 'overheadPosition', 'gripDemand',
    'unilateralLoadable', 'bilateralUpper', 'bilateralLower', 'axialLoad',
    'impact', 'balanceDemand', 'weightBearingHands',
  ];
  const enums = {};
  for (const f of scalarFields) enums[f] = countBy(rows, f);
  enums.secondaryMuscles = countBy(rows, 'secondaryMuscles', { arrayField: true });
  enums.equipmentProfiles = countBy(rows, 'equipmentProfiles', { arrayField: true });
  return enums;
}

function main() {
  const rows = loadSeedRows();
  const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name));
  const exportRows = sorted.map(orderRow);

  mkdirSync(DATA_DIR, { recursive: true });

  const seedExportPath = join(DATA_DIR, 'seed-export.json');
  writeFileSync(seedExportPath, JSON.stringify(exportRows, null, 2) + '\n');

  const enums = buildEnums(rows);
  const seedEnumsPath = join(DATA_DIR, 'seed-enums.json');
  writeFileSync(seedEnumsPath, JSON.stringify({
    generatedFrom: 'src/lib/seedExercises.js RAW, via scripts/exercise-library/loadSeed.mjs',
    rowCount: rows.length,
    tupleSchema: SEED_ROW_COLUMNS,
    enums,
  }, null, 2) + '\n');

  console.log(`export-seed: wrote ${exportRows.length} rows to ${seedExportPath}`);
  console.log(`export-seed: wrote enum/count summary to ${seedEnumsPath}`);
}

main();
