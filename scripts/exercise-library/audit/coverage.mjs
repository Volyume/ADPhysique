#!/usr/bin/env node
/**
 * scripts/exercise-library/audit/coverage.mjs — report 5 (coverage.json).
 *
 * Matrices and gap analysis: equipmentCategory x primaryMuscle,
 * movementPattern x primaryMuscle, subregion/role coverage against the
 * engine's own SUBREGION_REQUIREMENTS (planEngine.js) checked per equipment
 * profile at STAPLE-or-COMMON tier, laterality per muscle, position
 * distribution, every demand axis's true/false/null counts (+ the null row
 * list), and adaptedSetup class distribution.
 *
 * Reuses the app's own SUBREGION_REQUIREMENTS and translateSubregion so the
 * coverage check matches exactly what the generator itself enforces —
 * never a re-derived approximation.
 */
import { loadSeedRows } from '../loadSeed.mjs';
import { movementFamily, CLASSIFIED_MUSCLES, familySatisfiesRole } from '../../../src/lib/exercise/movementFamily.js';
import { autoTier, AUTO_TIER } from '../../../src/lib/exercise/canonicality.js';
import { DEMAND_FIELDS } from '../../../src/lib/capability/demands.js';
import { writeJson, countBy, loadSubregionRequirements } from './lib.mjs';

const rows = loadSeedRows();
const SUBREGION_REQUIREMENTS = loadSubregionRequirements();

// ── translateSubregion, reimplemented from poolGenerator.js ───────────────
// poolGenerator.js also cannot be imported directly (it imports
// './exercise/movementFamily' without an extension). Its logic is copied
// verbatim rather than re-derived, per the same rule loadSeed.mjs states
// for deriveLoadSemantics: if poolGenerator.js's tables change, this copy
// must be updated alongside it. movementFamily.js itself has zero imports
// and is safe to import directly.
const SUBREGION_TRANSLATION = {
  chest:      { flat: 'flat', incline: 'incline', decline: 'lower' },
  back:       { vertical_pull: 'vertical_pull', horizontal_row: 'horizontal_row', lower_lat: 'lower_lat' },
  quads:      { sweep: 'sweep' },
  side_delts: { lateral_raise: 'side', overhead_press: 'press' },
  rear_delts: { face_pull: 'face_pull', horiz_abduction: 'horiz_abduction' },
  triceps:    { overhead: 'overhead', pushdown: 'pushdown' },
  biceps:     { long_head: 'long_head', short_head: 'short_head', brachialis: 'brachialis' },
  hamstrings: { hip_extension: 'hip_extension', knee_flexion: 'knee_flexion' },
  glutes:     { activator: 'activator', stretcher: 'stretcher', pumper: 'pumper' },
  calves:     { gastro: 'gastro', soleus: 'soleus' },
  abs:        { flexion: 'flexion', anti_extension: 'anti_extension', rotation: 'anti_rotation' },
};
const DEFAULT_SUBREGION = {
  chest: 'flat', back: 'horizontal_row', side_delts: 'side', rear_delts: 'horiz_abduction',
  front_delts: 'press', biceps: 'short_head', triceps: 'pushdown', quads: 'vasti',
  hamstrings: 'hip_extension', glutes: 'activator', calves: 'gastro', abs: 'flexion',
  traps: 'upper', adductors: 'adductor',
};
function translateSubregion(muscle, librarySubregion, name = null) {
  if (CLASSIFIED_MUSCLES.includes(muscle)) {
    return movementFamily(name, muscle, librarySubregion);
  }
  const table = SUBREGION_TRANSLATION[muscle];
  if (table && librarySubregion && table[librarySubregion]) return table[librarySubregion];
  return DEFAULT_SUBREGION[muscle] ?? 'default';
}

// ── matrices ────────────────────────────────────────────────────────────
function matrix(rowsIn, rowKeyFn, colKeyFn) {
  const m = {};
  for (const r of rowsIn) {
    const rk = String(rowKeyFn(r) ?? 'null');
    const ck = String(colKeyFn(r) ?? 'null');
    if (!m[rk]) m[rk] = {};
    m[rk][ck] = (m[rk][ck] ?? 0) + 1;
  }
  return m;
}
const equipmentCategoryByMuscle = matrix(rows, (r) => r.equipmentCategory, (r) => r.primaryMuscle);
const movementPatternByMuscle = matrix(rows, (r) => r.movementPattern, (r) => r.primaryMuscle);
const lateralityByMuscle = matrix(rows, (r) => r.primaryMuscle, (r) => r.laterality);
const positionDistribution = countBy(rows, (r) => r.position);

// ── subregion / role coverage per muscle per equipment profile ───────────
const EQUIPMENT_PROFILES = ['full_gym', 'machines_cables', 'home_gym', 'dumbbells_only', 'barbell_plates', 'bodyweight'];
const STAPLE_OR_COMMON = new Set([AUTO_TIER.STAPLE, AUTO_TIER.COMMON]);

const subregionGaps = [];
const subregionCoverageDetail = {};
for (const [muscle, req] of Object.entries(SUBREGION_REQUIREMENTS)) {
  subregionCoverageDetail[muscle] = {};
  const musclePool = rows.filter((r) => r.primaryMuscle === muscle);
  for (const role of req.required) {
    subregionCoverageDetail[muscle][role] = {};
    for (const profile of EQUIPMENT_PROFILES) {
      const matching = musclePool.filter((r) => {
        if (!(r.equipmentProfiles || []).includes(profile)) return false;
        const translated = translateSubregion(muscle, r.subregion, r.name);
        // familySatisfiesRole (movementFamily.js) is the real coverage
        // check the engine applies for back/quads, where a ROLE (e.g.
        // horizontal_row) is satisfied by more than one FAMILY
        // (horizontal_lat OR upper_mid_row); its documented fallback is
        // exact family===role equality, which is correct for every other
        // muscle, so this one call covers both cases without branching.
        return familySatisfiesRole(muscle, role, translated);
      });
      const stapleOrCommon = matching.filter((r) => STAPLE_OR_COMMON.has(autoTier(r.name)));
      subregionCoverageDetail[muscle][role][profile] = {
        totalMatching: matching.length,
        stapleOrCommonCount: stapleOrCommon.length,
        stapleOrCommonNames: stapleOrCommon.map((r) => r.name),
      };
      if (stapleOrCommon.length < 3) {
        subregionGaps.push({
          muscle, role, profile,
          stapleOrCommonCount: stapleOrCommon.length,
          stapleOrCommonNames: stapleOrCommon.map((r) => r.name),
          totalMatchingAnyTier: matching.length,
        });
      }
    }
  }
}

// ── demand axis coverage ──────────────────────────────────────────────────
const demandAxisCounts = {};
const demandAxisNullRows = {};
for (const field of DEMAND_FIELDS) {
  demandAxisCounts[field] = countBy(rows, (r) => (r[field] === null || r[field] === undefined ? 'null' : String(r[field])));
  demandAxisNullRows[field] = rows.filter((r) => r[field] === null || r[field] === undefined).map((r) => r.name);
}

// ── adaptedSetup class distribution ────────────────────────────────────────
function adaptedSetupClass(row) {
  const contexts = (row.adaptedSetup || []).map((a) => a.context).sort();
  return contexts.length ? contexts.join('+') : 'none';
}
const adaptedSetupClassDistribution = countBy(rows, adaptedSetupClass);
const unclassifiedAdaptedSetupRows = rows.filter((r) => (r.adaptedSetup || []).length === 0).map((r) => r.name);

const out = {
  equipmentCategoryByPrimaryMuscle: equipmentCategoryByMuscle,
  movementPatternByPrimaryMuscle: movementPatternByMuscle,
  lateralityByPrimaryMuscle: lateralityByMuscle,
  positionDistribution,
  subregionRequirementsSource: 'src/lib/planEngine.js SUBREGION_REQUIREMENTS',
  subregionCoverageDetail,
  subregionGapCount: subregionGaps.length,
  subregionGaps,
  demandAxisFields: DEMAND_FIELDS,
  demandAxisCounts,
  demandAxisNullRowCounts: Object.fromEntries(DEMAND_FIELDS.map((f) => [f, demandAxisNullRows[f].length])),
  demandAxisNullRows,
  adaptedSetupClassDistribution,
  unclassifiedAdaptedSetupRowCount: unclassifiedAdaptedSetupRows.length,
  unclassifiedAdaptedSetupRows,
};

const path = writeJson('coverage.json', out);
console.log(`coverage.json written: ${path}`);
console.log(`Subregion/role gaps (< 3 STAPLE-or-COMMON per profile): ${subregionGaps.length}`);
for (const g of subregionGaps) {
  console.log(`  ${g.muscle}/${g.role}/${g.profile}: ${g.stapleOrCommonCount} staple-or-common (${g.stapleOrCommonNames.join(', ') || 'none'})`);
}
console.log('Demand axis null counts:', out.demandAxisNullRowCounts);
console.log(`Unclassified adaptedSetup rows: ${unclassifiedAdaptedSetupRows.length}/${rows.length}`);
