// Pool generation (docs/audit/volyume-exercise-audit-2026-05-30, 06 section
// 0). planEngine selects from a hardcoded POOL whose names must match the
// exercise library by string; when they drift, planAutoGen silently drops
// the exercise. This module derives the POOL shape from the library instead,
// so adding an exercise to the library makes it selectable and a name can
// never fail to resolve, because the names come from the same place.
//
// Pure and dependency-free: it takes the library array and returns the
// { muscle: [ { n, sub, p, eq } ] } structure planEngine consumes. The
// engine owns the fallback to its built-in POOL when generation is thin;
// this module just builds.

// ── paramKey ────────────────────────────────────────────────────────────
// planEngine keys rep ranges, rest and min-sets off four paramKeys. Derive
// from the granular equipment category and compound/isolation so a generated
// entry behaves like the hand-written one it replaces (e.g. Smith compound
// reads mod_compound, a selectorised machine compound reads machine).
const HEAVY_CATEGORIES = new Set(['barbell', 'landmine']);
const MACHINE_CATEGORIES = new Set(['machine_selectorised', 'machine_plate_loaded']);

export function deriveParamKey(equipmentCategory, compoundIsolation) {
  if (compoundIsolation === 'isolation') return 'isolation';
  if (HEAVY_CATEGORIES.has(equipmentCategory)) return 'heavy_compound';
  if (MACHINE_CATEGORIES.has(equipmentCategory)) return 'machine';
  return 'mod_compound';
}

// ── subregion translation ───────────────────────────────────────────────
// The library's SUBREGION_MAP vocab and planEngine's POOL `sub` vocab differ
// for some muscles (the audit's "two taxonomies"). This table maps the
// library value to the POOL value per muscle so SUBREGION_REQUIREMENTS keeps
// matching. Muscles whose two vocabs already agree are pass-through; muscles
// the library doesn't subregion-tag fall back to a per-muscle default.
const SUBREGION_TRANSLATION = {
  chest:      { flat: 'flat', incline: 'incline', decline: 'lower' },
  back:       { vertical_pull: 'vertical_pull', horizontal_row: 'horizontal_row', lower_lat: 'lower_lat' },
  quads:      { sweep: 'sweep' },
  side_delts: { lateral_raise: 'side', overhead_press: 'press' },
  rear_delts: { face_pull: 'face_pull', horiz_abduction: 'horiz_abduction' },
  triceps:    { overhead: 'overhead', pushdown: 'lateral' },
  hamstrings: { hip_extension: 'hip_extension', knee_flexion: 'knee_flexion' },
  glutes:     { activator: 'activator', stretcher: 'stretcher', pumper: 'pumper' },
  calves:     { gastro: 'gastro', soleus: 'soleus' },
  abs:        { flexion: 'flexion', anti_extension: 'anti_extension', rotation: 'anti_rotation' },
};

// Default POOL subregion when the library has no tag for an exercise, so a
// generated entry still carries a plausible sub. These match the muscles
// where POOL has subregions but the library mostly doesn't tag them.
const DEFAULT_SUBREGION = {
  chest: 'flat',
  back: 'horizontal_row',
  side_delts: 'side',
  rear_delts: 'horiz_abduction',
  front_delts: 'press',
  biceps: 'short_head',
  triceps: 'lateral',
  quads: 'vasti',
  hamstrings: 'hip_extension',
  glutes: 'activator',
  calves: 'gastro',
  abs: 'flexion',
  traps: 'upper',
  adductors: 'adductor',
};

export function translateSubregion(muscle, librarySubregion) {
  const table = SUBREGION_TRANSLATION[muscle];
  if (table && librarySubregion && table[librarySubregion]) {
    return table[librarySubregion];
  }
  return DEFAULT_SUBREGION[muscle] ?? 'default';
}

// ── pool entry ──────────────────────────────────────────────────────────
// One library exercise becomes one POOL entry. equipmentProfiles is already
// the exact `eq` vocab planEngine filters on, so it passes through (parsing
// the JSON string getAllExercises returns if needed).
function parseProfiles(ex) {
  const p = ex.equipmentProfiles;
  if (Array.isArray(p)) return p;
  if (typeof p === 'string' && p.length) {
    try { return JSON.parse(p); } catch { return []; }
  }
  return [];
}

export function toPoolEntry(ex) {
  return {
    n: ex.name,
    sub: translateSubregion(ex.primaryMuscle, ex.subregion),
    p: deriveParamKey(ex.equipmentCategory, ex.compoundIsolation),
    eq: parseProfiles(ex),
    // Carried for goal bias and difficulty gating in selection (06 sections
    // 2 and the difficulty decision). planEngine ignores fields it doesn't
    // read, so this stays shape-compatible with the hand-written POOL.
    difficulty: ex.difficulty ?? null,
    sfr: ex.stimulusToFatigueRatio ?? null,
    equipmentCategory: ex.equipmentCategory ?? null,
    // Secondary (synergist) muscles, primary-muscle vocab. Carried for indirect
    // volume modelling (spec phase 3e): each secondary counts a fractional set.
    secondary: Array.isArray(ex.secondaryMuscles) ? ex.secondaryMuscles : [],
  };
}

// ── non-hypertrophy exclusion ─────────────────────────────────────────────
// Plyometric, Olympic-power and conditioning movements are rate-of-force /
// energy-system work, not a hypertrophy stimulus. They must never be counted as
// hypertrophy volume (a box jump credited as calf growth, a power clean as trap
// growth). Excluded from the generated pool so selection never picks them; the
// library's real movements (calf raises, rack pull) fill that volume instead.
const NON_HYPERTROPHY_PATTERNS = new Set(['plyometric', 'power']);
const NON_HYPERTROPHY_NAMES = new Set([
  'Cycling (Stationary)', 'Sled Push', 'Assault Bike', 'Jump Squat', 'Broad Jump',
  'Stair Running', 'Battle Ropes', 'Clean Pull',
]);
export function isHypertrophyExercise(ex) {
  if (NON_HYPERTROPHY_PATTERNS.has(ex.movementPattern)) return false;
  if (NON_HYPERTROPHY_NAMES.has(ex.name)) return false;
  return true;
}

// ── generate ────────────────────────────────────────────────────────────
// Build the full { muscle: [entry] } pool from the library. Skips custom
// exercises (no derived metadata) and anything with no equipment profile
// (can't be filtered into a plan). Returns only canonical, profiled,
// non-`other` exercises grouped by primary muscle.
export function generatePoolFromLibrary(exercises) {
  const pool = {};
  for (const ex of exercises || []) {
    if (!ex || !ex.name || !ex.primaryMuscle) continue;
    if (ex.isCustom === 1 || ex.isCustom === true) continue;
    if (!ex.equipmentCategory || ex.equipmentCategory === 'other') continue;
    if (!isHypertrophyExercise(ex)) continue;
    const entry = toPoolEntry(ex);
    if (entry.eq.length === 0) continue;
    if (!pool[ex.primaryMuscle]) pool[ex.primaryMuscle] = [];
    pool[ex.primaryMuscle].push(entry);
  }
  return pool;
}

// Decide whether a generated pool is healthy enough to use for a given set
// of muscles, or whether the engine should fall back to its built-in POOL.
// A muscle is "covered" if it has at least `minPerMuscle` entries. Returns
// the list of muscles that are under-covered so the caller can fall back per
// muscle rather than wholesale.
export function findThinMuscles(pool, muscles, minPerMuscle = 3) {
  const thin = [];
  for (const m of muscles) {
    if ((pool[m]?.length ?? 0) < minPerMuscle) thin.push(m);
  }
  return thin;
}
