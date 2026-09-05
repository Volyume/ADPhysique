#!/usr/bin/env node
/**
 * scripts/exercise-library/audit/count.mjs — report 1 (count.json).
 * Exact count of the built-in corpus and its distribution across every
 * classification axis the brief names. Reuses loadSeedRows() (the
 * campaign's shared seed loader) and canonicality.autoTier() for ground
 * truth; nothing here re-derives seed logic.
 */
import { loadSeedRows } from '../loadSeed.mjs';
import { autoTier } from '../../../src/lib/exercise/canonicality.js';
import { writeJson, countBy } from './lib.mjs';

const rows = loadSeedRows();

function adaptedSetupClass(row) {
  const contexts = (row.adaptedSetup || []).map((a) => a.context).sort();
  return contexts.length ? contexts.join('+') : 'none';
}

const out = {
  totalCount: rows.length,
  perEquipment: countBy(rows, (r) => r.equipment),
  perPrimaryMuscle: countBy(rows, (r) => r.primaryMuscle),
  perMovementPattern: countBy(rows, (r) => r.movementPattern),
  perEquipmentCategory: countBy(rows, (r) => r.equipmentCategory),
  perTier: countBy(rows, (r) => autoTier(r.name)),
  perExerciseType: countBy(rows, (r) => r.exerciseType),
  perLaterality: countBy(rows, (r) => r.laterality),
  perPosition: countBy(rows, (r) => r.position),
  perAdaptedSetupClass: countBy(rows, adaptedSetupClass),
  perMovementFamily: countBy(rows, (r) => r.movementFamily),
};

const path = writeJson('count.json', out);
console.log(`count.json written: ${path}`);
console.log(`Total rows: ${rows.length}`);
console.log('Per tier:', out.perTier);
