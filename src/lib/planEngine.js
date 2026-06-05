/**
 * planEngine.js  v3
 * Deterministic hypertrophy plan generation engine.
 * Pure functions only, no side effects, no DB calls, no Math.random().
 */

import { GOAL_LABELS as _GOAL_LABELS, GOAL_OVERLAYS, PHASE_OVERLAYS } from './coachingGoals';
import { VOLUME_LANDMARKS } from './algorithms';
import { generatePoolFromLibrary } from './poolGenerator';

// ---------------------------------------------------------------------------
// Public label maps
// ---------------------------------------------------------------------------

export const GOAL_LABELS = _GOAL_LABELS;

export const SPLIT_LABELS = {
  full_body:       'Full Body',
  upper_lower:     'Upper / Lower',
  ppl:             'Push / Pull / Legs',
  ppl_ab:          'PPL A/B (6-day)',
  upper_lower_wp:  'Upper / Lower + Weak-Point Day',
  lower_focus:     'Lower-Body Focus',
  balanced_ul:     'Upper / Lower (5-day)',
};

// ---------------------------------------------------------------------------
// Weak-point UI label → internal muscle key
// ---------------------------------------------------------------------------

const WEAK_POINT_MAP = {
  'Chest':            'chest',
  'Upper Chest':      'chest',
  'Lats / Back Width':'back',
  'Back Thickness':   'back',
  'Side Delts':       'side_delts',
  'Rear Delts':       'rear_delts',
  'Front Delts':      'front_delts',
  'Biceps':           'biceps',
  'Triceps':          'triceps',
  'Quads':            'quads',
  'Hamstrings':       'hamstrings',
  'Glutes':           'glutes',
  'Adductors':        'adductors',
  'Calves':           'calves',
  'Core / Abs':       'abs',
  'Traps':            'traps',
};

function resolveWeakPointKeys(uiLabels) {
  const keys = [];
  for (const label of uiLabels) {
    const key = WEAK_POINT_MAP[label];
    if (key && !keys.includes(key)) keys.push(key);
  }
  return keys;
}

// ---------------------------------------------------------------------------
// Volume landmarks, imported from algorithms.js (single source of truth)
// ---------------------------------------------------------------------------
// VOLUME_LANDMARKS uses lowercase keys: { mv, mev, mav, mrv }
// computeLandmarks() below adapts these to uppercase for backward compatibility.

// ---------------------------------------------------------------------------
// Autoregulation multiplier tables
// ---------------------------------------------------------------------------

const EXP_MULT = {
  beginner:     { MEV: 0.70, MRV: 0.75 },
  intermediate: { MEV: 1.00, MRV: 1.00 },
  advanced:     { MEV: 1.15, MRV: 1.10 },
  competitive:  { MEV: 1.25, MRV: 1.15 },
};

const REC_MULT = {
  poor:    { MEV: 1.10, MRV: 0.80 },
  average: { MEV: 1.00, MRV: 1.00 },
  good:    { MEV: 0.95, MRV: 1.15 },
};

const NUT_MULT = {
  lean_gain:      { MEV: 0.95, MRV: 1.10 },
  build:          { MEV: 0.95, MRV: 1.10 },
  maintain:       { MEV: 1.00, MRV: 1.00 },
  recomp:         { MEV: 1.00, MRV: 1.00 },
  mild_cut:       { MEV: 1.00, MRV: 0.90 },
  aggressive_cut: { MEV: 1.05, MRV: 0.80 },
  contest_prep:   { MEV: 1.10, MRV: 0.70 },
};

function ageMultipliers(age) {
  if (age == null || (age >= 30 && age < 40)) return { MEV: 1.00, MRV: 1.00 };
  if (age < 30)  return { MEV: 1.00, MRV: 1.05 };
  if (age < 50)  return { MEV: 1.00, MRV: 0.92 };
  if (age < 60)  return { MEV: 1.05, MRV: 0.85 };
  return          { MEV: 1.10, MRV: 0.75 };
}

function computeLandmarks(experience, recoveryRating, nutritionPhase, age) {
  const mExp = EXP_MULT[experience]    ?? EXP_MULT.intermediate;
  const mRec = REC_MULT[recoveryRating] ?? REC_MULT.average;
  const mNut = NUT_MULT[nutritionPhase] ?? { MEV: 1.00, MRV: 1.00 };
  const mAge = ageMultipliers(age);

  const result = {};
  for (const [muscle, base] of Object.entries(VOLUME_LANDMARKS)) {
    let MEVadj = Math.round(base.mev * mExp.MEV * mRec.MEV * mNut.MEV * mAge.MEV);
    let MRVadj = Math.round(base.mrv * mExp.MRV * mRec.MRV * mNut.MRV * mAge.MRV);

    // Clash guard
    if (MEVadj >= MRVadj) MEVadj = Math.max(2, MRVadj - 2);
    // Floor for non-zero-MEV muscles (VOLUME_LANDMARKS uses lowercase keys)
    if (MRVadj < 4 && base.mev > 0) { MRVadj = 4; MEVadj = 2; }

    const MAVlow  = MEVadj + 2;
    const MAVhigh = Math.max(MAVlow, MRVadj - 1);
    result[muscle] = { MV: base.mv, MEV: MEVadj, MAVlow, MAVhigh, MRV: MRVadj };
  }
  return result;
}

// ---------------------------------------------------------------------------
// Goal overlays
// ---------------------------------------------------------------------------

function applyGoalOverlay(weeklyTargets, landmarks, goal, weakPointKeys, phase, effectiveDays = 4) {
  const t = { ...weeklyTargets };

  const overlay = GOAL_OVERLAYS[goal] ?? {};

  // 1. Physique-category overlay (mens_physique, bikini, etc.). Bias volume
  //    toward the muscles that drive that category's judging. Priority muscles
  //    (multiplier > 1.0) are placed INSIDE their working (MAV-MRV) band,
  //    scaled by how strong the priority is, rather than multiplied up from
  //    MEV. Anchoring at MEV was why lower-body emphasis never reached the
  //    plate (coach-plan audit 2026-06-01): the science-individualised MRV is
  //    the ceiling, the overlay only distributes volume within it. This runs
  //    for every goal, INCLUDING during a weak-point block, so the division
  //    character is kept rather than wiped.
  const PRIORITY_NORM = 0.6; // multiplier delta that maps to the top of MAV-MRV
  for (const [m, mult] of Object.entries(overlay)) {
    if (t[m] == null) continue;
    const lm = landmarks[m];
    if (mult > 1.0) {
      const frac = Math.min(1, (mult - 1) / PRIORITY_NORM);
      t[m] = Math.round(lm.MAVlow + frac * (lm.MRV - lm.MAVlow));
    } else {
      // De-emphasised: scale down from the MEV floor (unchanged behaviour).
      t[m] = Math.round(t[m] * mult);
    }
  }

  // 2. Phase overlay (strength_size's isolation reduction), applied on top so a
  //    competitor on a strength-size block keeps the category bias with less
  //    isolation work. The weak_point phase overlay is empty: its emphasis is
  //    additive (step 3), not a multiplier.
  const phaseOverlay = PHASE_OVERLAYS[phase] ?? {};
  for (const [m, mult] of Object.entries(phaseOverlay)) {
    if (t[m] != null) {
      t[m] = Math.round(t[m] * mult);
    }
  }

  // 3. Weak-point specialisation: ADDITIVE on top of the division targets, not
  //    a replacement (coach-plan audit 2026-06-01, stage 4). The old behaviour
  //    dropped every non-weak-point muscle to maintenance and discarded the
  //    division emphasis. Now each weak-point muscle gets a capped bonus
  //    (closes ~40% of the gap to its MRV), and the added volume is offset by
  //    trimming the lowest-priority, non-weak-point muscles toward MV so total
  //    systemic stress is held. Division priorities and the recovery envelope
  //    (MRV clamp + systemic cap below) are preserved.
  if (phase === 'weak_point' && weakPointKeys.length) {
    let added = 0;
    for (const m of weakPointKeys) {
      if (t[m] == null) continue;
      const lm = landmarks[m];
      // Use the division-aware ceiling so weak-pointing a muscle the division
      // already trains hard (e.g. Bikini glutes near 30) raises it rather than
      // clamping to the generic MRV. Never reduces the muscle.
      const mrvCap = divisionMRV(m, goal, lm);
      // Specialisation pushes the lagging muscle hard toward its MRV (Helms):
      // close ~70% of the gap, not a token bump. Bounded by MRV and by the
      // systemic-offset trim below so the recovery envelope is held.
      const bonus = Math.max(2, Math.round((mrvCap - t[m]) * 0.7));
      const next = Math.max(t[m], Math.min(mrvCap, t[m] + bonus));
      added += next - t[m];
      t[m] = next;
    }
    // Offset against the lowest-priority, non-weak-point muscles first.
    const trimable = Object.keys(t)
      .filter(m => !weakPointKeys.includes(m)
        && (overlay[m] == null || overlay[m] < 1.15)
        && t[m] > landmarks[m].MV)
      .sort((a, b) => (overlay[a] ?? 1) - (overlay[b] ?? 1));
    let remaining = added;
    for (const m of trimable) {
      if (remaining <= 0) break;
      const trim = Math.min(t[m] - landmarks[m].MV, remaining);
      t[m] -= trim;
      remaining -= trim;
    }
  }

  // Clamp each muscle to 110% of its MRV
  for (const m of Object.keys(t)) {
    const cap = Math.round(landmarks[m].MRV * 1.10);
    t[m] = Math.min(t[m], cap);
  }

  // Systemic ceiling: individualised to the user's recovery capacity rather
  // than a flat 130 for everyone (coach-plan audit 2026-06-01). The per-muscle
  // MRVs are already individualised by experience, recovery, age and nutrition
  // in computeLandmarks, so a fraction of their sum is a recovery-scaled total
  // cap: a beginner or poor-recovery user is held lower, an advanced
  // good-recovery competitor higher. The 0.40 factor keeps an average
  // intermediate near the previous 130.
  const totalMRV = Object.values(landmarks).reduce((s, lm) => s + lm.MRV, 0);
  // A 3-day week cannot recover the same weekly volume as 4-6 days at the same
  // per-session density (the productive ceiling per session is ~6-8 sets/muscle;
  // a 3-day plan stacks too many sets per session otherwise). Tighten the
  // systemic budget at <= 3 days so accessories sit nearer MEV than MAV and the
  // dense full-body sessions of high-volume divisions fit the recoverable and
  // time ceilings, instead of holding everything at MAV at a frequency that
  // cannot support it.
  // Only the non-matrix divisions (General, Bodybuilding, Women's Bodybuilding)
  // run a 3-day full body that crams every muscle into each session; the matrix
  // divisions are structured and do not. Tighten the budget at 3 days only for
  // those, leaving the structured divisions (and their arm floors) untouched.
  const compress3Day = effectiveDays <= 3 && !DIVISION_MATRIX[goal];
  const systemicFactor = compress3Day ? 0.34 : 0.40;
  const systemicCap = Math.round(totalMRV * systemicFactor);
  const total = Object.values(t).reduce((s, v) => s + v, 0);
  if (total > systemicCap) {
    const scale = systemicCap / total;
    for (const m of Object.keys(t)) {
      t[m] = Math.max(0, Math.round(t[m] * scale));
    }
  }

  return t;
}

// ---------------------------------------------------------------------------
// Volume integrity (rebuild spec phase 1)
// ---------------------------------------------------------------------------
//
// Per-muscle weekly volume landmarks the floor/cap pass uses (Israetel /
// Renaissance Periodization classic figures, intermediate, weekly hard sets),
// keyed by the engine's internal muscle names. MRV is the hard ceiling. The
// three delt heads share a combined cap of 26 (Israetel) enforced separately
// below, which is what stops the "shoulders to 30" failure.
//
// SINGLE SOURCE OF TRUTH: these are derived from the tracker's VOLUME_LANDMARKS
// (algorithms.js) so a landmark change there flows through here automatically,
// EXCEPT where the generator deliberately differs. The generator's job (decide
// what to PROGRAM) is not the tracker's job (judge adequacy), so a few muscles
// diverge BY DESIGN per the plan-engine rebuild spec
// (docs/audit/volyume-planengine-rebuild-2026-06-01/planengine-rebuild-01-phase1-tests.md).
// Those deltas are listed explicitly below with their reason, instead of
// living in a second literal table that could silently drift from the tracker.
// Tracker-only muscles (neck, tibialis) are not programmed by the generator,
// so they are intentionally absent from this table.
const GENERATOR_LANDMARK_MUSCLES = [
  'chest', 'back', 'side_delts', 'rear_delts', 'front_delts', 'biceps',
  'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'abs', 'traps',
  'forearms', 'adductors',
];
const GENERATOR_LANDMARK_OVERRIDES = {
  // Programmed to be fed indirectly (rows/pulls, deads/shrugs), so the
  // generator does NOT floor them and keeps the spec's direct ceilings.
  rear_delts: { MEV: 0, MRV: 14 },
  traps:      { MEV: 0, MRV: 26 },
  // RP general glute MRV is 16 here; Bikini/Wellness get 30 via divisionMRV().
  // (The tracker's mrv 22 was raised for physique TRACKING, not programming.)
  glutes:     { MV: 4, MEV: 6, MRV: 16 },
  // Spec phase-1 table values that differ from the tracker.
  side_delts: { MV: 6, MRV: 20 }, // direct side-delt ceiling; combined delt cap 26 binds in practice
  biceps:     { MEV: 8, MRV: 20 },
  abs:        { MEV: 6 },
  // The tracker mrv for these was raised (recovery capacity + indirect volume,
  // volume-landmark audit 2026-06-05) so the heatmap stops over-flagging them,
  // but the GENERATOR keeps the conservative programming ceiling, so pin MRV.
  triceps:     { MRV: 18 },
  front_delts: { MRV: 12 },
  // Forearms/adductors are an assumption flagged in the rebuild docs (not in
  // the original spec table); kept here so the generator caps them.
  forearms:   { MV: 0, MEV: 0, MRV: 16 },
  adductors:  { MRV: 12 },
};
export const SPEC_LANDMARKS = Object.fromEntries(
  GENERATOR_LANDMARK_MUSCLES.map((m) => {
    const v = VOLUME_LANDMARKS[m];
    return [m, { MV: v.mv, MEV: v.mev, MRV: v.mrv, ...(GENERATOR_LANDMARK_OVERRIDES[m] ?? {}) }];
  }),
);

// Combined delt-complex weekly ceiling (Israetel side+rear = 26). The spec caps
// side+rear at 26 and front separately; we fold all three heads into the 26 so
// the ceiling matches the engine's combined "shoulders" volume bucket and
// directly prevents the shoulders-to-30 failure. Flagged as a conservative
// interpretation in the rebuild docs; splitting front out waits on the summary
// exposing per-head sets.
const SIDE_REAR_DELT_CAP = 26;

// Indirect (synergist) volume: a secondary muscle on a compound lift earns a
// fractional working set (spec phase 3e, RP convention of half a set). Used to
// report indirect volume and to flag muscles whose only coverage is indirect.
const INDIRECT_SET_FRACTION = 0.5;

// Division-aware weekly MRV ceiling. Glutes get the higher Bikini/Wellness cap
// (spec: ~30 weekly split across Contreras exercise types) versus RP's general
// MRV of 16. Shared by the floor/cap pass and the weak-point overlay so a
// weak-pointed glute is not clamped to 16 in a division that allows 30.
function divisionMRV(muscle, goal, lm) {
  if (muscle === 'glutes' && (goal === 'bikini' || goal === 'wellness')) return 30;
  return lm.MRV;
}

// Buffer kept above MEV when trimming a synergist for its indirect volume, so
// the trimmed direct target never reaches the bare minimum (spec phase 3e).
const INDIRECT_TRIM_BUFFER = 2;

// Structural movers that must never read zero in any generated program, even
// when a division de-emphasises them (spec: "maintenance, not zero"). At 3
// training days the maintenance floor compresses to 4.
const STRUCTURAL_MUSCLES = ['chest', 'back', 'side_delts', 'quads', 'hamstrings', 'glutes'];

function maintenanceFloor(effectiveDays) {
  return effectiveDays <= 3 ? 4 : 6;
}

// Apply the spec's hard floors and caps to the weekly per-muscle targets,
// after the division overlay has distributed volume. Floors: structural
// muscles to a maintenance minimum; division-judged muscles (overlay >= 1.0)
// to their MEV. Caps: every muscle to its MRV, and the three delt heads to a
// combined 26. This is the phase-1 guarantee: no judged/structural zero, no
// muscle over MRV.
function enforceWeeklyFloorsAndCaps(weeklyTargets, goal, effectiveDays, weakPointKeys = []) {
  const t = { ...weeklyTargets };
  const overlay = GOAL_OVERLAYS[goal] ?? {};
  const maint = maintenanceFloor(effectiveDays);

  // Floors.
  for (const m of STRUCTURAL_MUSCLES) {
    if (SPEC_LANDMARKS[m]) t[m] = Math.max(t[m] ?? 0, maint);
  }
  for (const [m, lm] of Object.entries(SPEC_LANDMARKS)) {
    const mult = overlay[m];
    if (mult != null && mult >= 1.0) t[m] = Math.max(t[m] ?? 0, lm.MEV);
  }

  // Bikini/Wellness arms: not a judged priority, but at 5-6 days the upper body
  // should read "smaller, not absent" (Manion). Floor biceps/triceps to a token
  // 4 sets so a long lower-focused week still shows some arm tone, rather than
  // literal zero. Documented decision, not an accident.
  if ((goal === 'bikini' || goal === 'wellness') && effectiveDays >= 5) {
    t.biceps = Math.max(t.biceps ?? 0, 4);
    t.triceps = Math.max(t.triceps ?? 0, 4);
  }

  // Indirect-volume trim (spec phase 3e). A synergist that gets heavy indirect
  // work from its driver compound does not need full DIRECT volume: the
  // fractional sets from pulling (biceps) or pressing (triceps) already carry
  // it. Trim the direct target by a credit proportional to the driver's volume,
  // keeping a 2-set buffer above MEV. Effective volume (direct + indirect)
  // stays well above MEV, which is the correct adequacy measure. Only ever
  // trims (never raises), and skips a user-selected weak point (boosted on
  // purpose). The phase-1 MEV-floor invariant is preserved (floor is MEV + 2).
  const trimSynergist = (muscle, driverMuscle, rate) => {
    const lm = SPEC_LANDMARKS[muscle];
    if (!lm || t[muscle] == null || weakPointKeys.includes(muscle)) return;
    const credit = Math.round((t[driverMuscle] ?? 0) * rate);
    const floor = lm.MEV + INDIRECT_TRIM_BUFFER;
    t[muscle] = Math.min(t[muscle], Math.max(floor, t[muscle] - credit));
  };
  trimSynergist('biceps', 'back', 0.4);
  trimSynergist('triceps', 'chest', 0.5);

  // Per-muscle MRV cap. Glutes get a higher ceiling for the lower-body
  // divisions, where the spec allows ~30 weekly sets split across glute
  // exercise types (Contreras), versus RP's general MRV of 16 elsewhere.
  for (const m of Object.keys(t)) {
    const lm = SPEC_LANDMARKS[m];
    if (!lm) continue;
    t[m] = Math.min(t[m], divisionMRV(m, goal, lm));
  }

  // Combined delt-complex cap (side + rear + front folded into 26).
  const sd = t.side_delts ?? 0;
  const rd = t.rear_delts ?? 0;
  const fd = t.front_delts ?? 0;
  const deltSum = sd + rd + fd;
  if (deltSum > SIDE_REAR_DELT_CAP) {
    const scale = SIDE_REAR_DELT_CAP / deltSum;
    t.side_delts = Math.round(sd * scale);
    t.rear_delts = Math.round(rd * scale);
    t.front_delts = Math.round(fd * scale);
  }

  return t;
}

// ---------------------------------------------------------------------------
// Exercise pool
// ---------------------------------------------------------------------------

// Entry: { n: name, sub: subregion, p: paramKey, eq: [equipment...] }
// paramKey: 'heavy_compound' | 'mod_compound' | 'machine' | 'isolation'

export const POOL = {
  chest: [
    { n: 'Barbell Bench Press',            sub: 'flat',    p: 'heavy_compound', eq: ['full_gym', 'barbell_plates'] },
    { n: 'Incline Barbell Bench Press',    sub: 'incline', p: 'heavy_compound', eq: ['full_gym', 'barbell_plates'] },
    { n: 'Incline Dumbbell Press',         sub: 'incline', p: 'mod_compound',   eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'Dumbbell Bench Press',           sub: 'flat',    p: 'mod_compound',   eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'Machine Chest Press',            sub: 'flat',    p: 'machine',        eq: ['full_gym', 'machines_cables'] },
    { n: 'Incline Machine Press',          sub: 'incline', p: 'machine',        eq: ['full_gym', 'machines_cables'] },
    { n: 'Smith Machine Bench Press',      sub: 'flat',    p: 'mod_compound',   eq: ['full_gym', 'machines_cables'] },
    { n: 'Push-Up',                        sub: 'flat',    p: 'mod_compound',   eq: ['bodyweight'] },
    { n: 'Cable Crossover (High to Low)',  sub: 'flat',    p: 'isolation',      eq: ['full_gym', 'machines_cables'] },
    { n: 'Pec Deck (Machine Fly)',         sub: 'flat',    p: 'isolation',      eq: ['full_gym', 'machines_cables'] },
    { n: 'Cable Fly (Low to High)',        sub: 'incline', p: 'isolation',      eq: ['full_gym', 'machines_cables'] },
    { n: 'Dumbbell Fly',                   sub: 'flat',    p: 'isolation',      eq: ['full_gym', 'dumbbells_only', 'home_gym', 'barbell_plates'] },
    { n: 'Incline Dumbbell Fly',           sub: 'incline', p: 'isolation',      eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
  ],
  back: [
    { n: 'Lat Pulldown (Wide Grip)',       sub: 'vertical_pull',   p: 'mod_compound',   eq: ['full_gym', 'machines_cables'] },
    { n: 'Pull-Up',                        sub: 'vertical_pull',   p: 'mod_compound',   eq: ['bodyweight'] },
    { n: 'Lat Pulldown (Close Grip)',      sub: 'vertical_pull',   p: 'mod_compound',   eq: ['full_gym', 'machines_cables'] },
    { n: 'Single-Arm Lat Pulldown',        sub: 'vertical_pull',   p: 'machine',        eq: ['full_gym', 'machines_cables'] },
    { n: 'Cable High Row',                 sub: 'vertical_pull',   p: 'mod_compound',   eq: ['full_gym', 'machines_cables'] },
    { n: 'Barbell Row (Bent Over)',        sub: 'horizontal_row',  p: 'heavy_compound', eq: ['full_gym', 'barbell_plates'] },
    { n: 'T-Bar Row',                      sub: 'horizontal_row',  p: 'heavy_compound', eq: ['full_gym', 'barbell_plates'] },
    { n: 'Seated Cable Row',               sub: 'horizontal_row',  p: 'mod_compound',   eq: ['full_gym', 'machines_cables'] },
    { n: 'Dumbbell Row',                   sub: 'horizontal_row',  p: 'mod_compound',   eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'Machine Row (Chest Supported)',  sub: 'horizontal_row',  p: 'machine',        eq: ['full_gym', 'machines_cables'] },
    { n: 'Chest-Supported Row (Dumbbell)',sub: 'horizontal_row',  p: 'mod_compound',   eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'Inverted Row',                   sub: 'horizontal_row',  p: 'mod_compound',   eq: ['bodyweight'] },
    { n: 'Pendlay Row',                    sub: 'horizontal_row',  p: 'heavy_compound', eq: ['full_gym', 'barbell_plates'] },
    { n: 'Seal Row',                       sub: 'horizontal_row',  p: 'mod_compound',   eq: ['full_gym', 'barbell_plates'] },
    { n: 'Landmine Row',                   sub: 'horizontal_row',  p: 'mod_compound',   eq: ['full_gym', 'barbell_plates'] },
    { n: 'Seated Machine Row (Wide)',      sub: 'horizontal_row',  p: 'machine',        eq: ['full_gym', 'machines_cables'] },
    { n: 'Single-Arm Cable Row',           sub: 'horizontal_row',  p: 'mod_compound',   eq: ['full_gym', 'machines_cables'] },
    { n: 'Cable Straight-Arm Pulldown',   sub: 'lower_lat',       p: 'isolation',      eq: ['full_gym', 'machines_cables'] },
    { n: 'Cable Lat Pullover',             sub: 'lower_lat',       p: 'isolation',      eq: ['full_gym', 'machines_cables'] },
  ],
  side_delts: [
    { n: 'Cable Lateral Raise',    sub: 'side', p: 'isolation', eq: ['full_gym', 'machines_cables'] },
    { n: 'Dumbbell Lateral Raise', sub: 'side', p: 'isolation', eq: ['full_gym', 'dumbbells_only', 'home_gym', 'barbell_plates'] },
    { n: 'Machine Lateral Raise',  sub: 'side', p: 'isolation', eq: ['full_gym', 'machines_cables'] },
    { n: 'Leaning Lateral Raise',  sub: 'side', p: 'isolation', eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
  ],
  rear_delts: [
    { n: 'Face Pull',                       sub: 'face_pull',       p: 'isolation', eq: ['full_gym', 'machines_cables', 'barbell_plates'] },
    { n: 'Reverse Pec Deck',                sub: 'horiz_abduction', p: 'isolation', eq: ['full_gym', 'machines_cables'] },
    { n: 'Cable Rear Delt Fly',             sub: 'horiz_abduction', p: 'isolation', eq: ['full_gym', 'machines_cables'] },
    { n: 'Dumbbell Rear Delt Fly',          sub: 'horiz_abduction', p: 'isolation', eq: ['full_gym', 'dumbbells_only', 'home_gym', 'barbell_plates'] },
    { n: 'Dumbbell Side-Lying Rear Delt',   sub: 'horiz_abduction', p: 'isolation', eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'Lying Rear Delt Row',             sub: 'horiz_abduction', p: 'isolation', eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
  ],
  front_delts: [
    { n: 'Barbell Overhead Press',    sub: 'press',        p: 'heavy_compound', eq: ['full_gym', 'barbell_plates'] },
    { n: 'Dumbbell Shoulder Press',   sub: 'press',        p: 'mod_compound',   eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'Machine Shoulder Press',    sub: 'press',        p: 'machine',        eq: ['full_gym', 'machines_cables'] },
    { n: 'Arnold Press',              sub: 'press',        p: 'mod_compound',   eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'Seated Dumbbell Press',     sub: 'press',        p: 'mod_compound',   eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'Dumbbell Front Raise',      sub: 'front_raise',  p: 'isolation',      eq: ['full_gym', 'dumbbells_only', 'home_gym', 'barbell_plates'] },
  ],
  biceps: [
    { n: 'Incline Dumbbell Curl',        sub: 'long_head',  p: 'isolation', eq: ['full_gym', 'dumbbells_only', 'home_gym', 'barbell_plates'] },
    { n: 'Spider Curl',                  sub: 'long_head',  p: 'isolation', eq: ['full_gym', 'barbell_plates'] },
    { n: 'Prone Incline Curl',           sub: 'long_head',  p: 'isolation', eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'Barbell Curl',                 sub: 'short_head', p: 'isolation', eq: ['full_gym', 'barbell_plates'] },
    { n: 'EZ Bar Curl',                  sub: 'short_head', p: 'isolation', eq: ['full_gym', 'barbell_plates'] },
    { n: 'Preacher Curl (EZ Bar)',       sub: 'short_head', p: 'isolation', eq: ['full_gym', 'barbell_plates'] },
    { n: 'Cable Curl',                   sub: 'short_head', p: 'isolation', eq: ['full_gym', 'machines_cables'] },
    { n: 'Machine Curl',                 sub: 'short_head', p: 'isolation', eq: ['full_gym', 'machines_cables'] },
    { n: 'Dumbbell Curl',                sub: 'short_head', p: 'isolation', eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'Concentration Curl',           sub: 'short_head', p: 'isolation', eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'Hammer Curl',                  sub: 'brachialis', p: 'isolation', eq: ['full_gym', 'dumbbells_only', 'home_gym', 'barbell_plates'] },
    { n: 'Cable Hammer Curl (Rope)',     sub: 'brachialis', p: 'isolation', eq: ['full_gym', 'machines_cables'] },
    { n: 'Zottman Curl',                 sub: 'brachialis', p: 'isolation', eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'Cross-Body Hammer Curl',       sub: 'brachialis', p: 'isolation', eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
  ],
  triceps: [
    { n: 'Overhead Cable Tricep Extension', sub: 'overhead', p: 'isolation',    eq: ['full_gym', 'machines_cables'] },
    { n: 'EZ Bar Skull Crusher',            sub: 'overhead', p: 'isolation',    eq: ['full_gym', 'barbell_plates'] },
    { n: 'Overhead Dumbbell Extension',     sub: 'overhead', p: 'isolation',    eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'JM Press',                        sub: 'overhead', p: 'mod_compound', eq: ['full_gym', 'barbell_plates'] },
    { n: 'Lying Tricep Extension',          sub: 'overhead', p: 'isolation',    eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'Decline Skull Crusher',           sub: 'overhead', p: 'isolation',    eq: ['full_gym', 'barbell_plates'] },
    { n: 'Rope Pushdown',                   sub: 'lateral',  p: 'isolation',    eq: ['full_gym', 'machines_cables'] },
    { n: 'Cable Pushdown (Straight Bar)',   sub: 'lateral',  p: 'isolation',    eq: ['full_gym', 'machines_cables'] },
    { n: 'Machine Tricep Extension',        sub: 'lateral',  p: 'machine',      eq: ['full_gym', 'machines_cables'] },
    { n: 'Close-Grip Bench Press',          sub: 'lateral',  p: 'mod_compound', eq: ['full_gym', 'barbell_plates'] },
    { n: 'Diamond Push-Up',                 sub: 'lateral',  p: 'mod_compound', eq: ['bodyweight'] },
    { n: 'Tate Press',                      sub: 'lateral',  p: 'isolation',    eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
  ],
  quads: [
    { n: 'Barbell Back Squat',      sub: 'vasti',   p: 'heavy_compound', eq: ['full_gym', 'barbell_plates'] },
    { n: 'Leg Press',               sub: 'vasti',   p: 'machine',        eq: ['full_gym', 'machines_cables'] },
    { n: 'Hack Squat Machine',      sub: 'vasti',   p: 'machine',        eq: ['full_gym', 'machines_cables'] },
    { n: 'Pendulum Squat',          sub: 'vasti',   p: 'machine',        eq: ['full_gym', 'machines_cables'] },
    { n: 'Barbell Front Squat',     sub: 'sweep',  p: 'heavy_compound', eq: ['full_gym', 'barbell_plates'] },
    { n: 'Bulgarian Split Squat',   sub: 'vasti',   p: 'mod_compound',   eq: ['full_gym', 'dumbbells_only', 'home_gym', 'barbell_plates'] },
    { n: 'Smith Machine Squat',     sub: 'vasti',   p: 'machine',        eq: ['full_gym', 'machines_cables'] },
    { n: 'Goblet Squat',            sub: 'vasti',   p: 'mod_compound',   eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'Dumbbell Lunge',          sub: 'vasti',   p: 'mod_compound',   eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'Walking Lunge',           sub: 'vasti',   p: 'mod_compound',   eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'Leg Extension',           sub: 'sweep',  p: 'isolation',      eq: ['full_gym', 'machines_cables'] },
    { n: 'Sissy Squat',             sub: 'sweep',  p: 'isolation',      eq: ['full_gym', 'bodyweight', 'home_gym'] },
  ],
  hamstrings: [
    { n: 'Romanian Deadlift (Barbell)',    sub: 'hip_extension', p: 'heavy_compound', eq: ['full_gym', 'barbell_plates'] },
    { n: 'Romanian Deadlift (Dumbbell)',   sub: 'hip_extension', p: 'mod_compound',   eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'Single-Leg Romanian Deadlift',   sub: 'hip_extension', p: 'mod_compound',   eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'Good Morning',                   sub: 'hip_extension', p: 'mod_compound',   eq: ['full_gym', 'barbell_plates'] },
    { n: 'Stiff-Leg Deadlift',             sub: 'hip_extension', p: 'heavy_compound', eq: ['full_gym', 'barbell_plates'] },
    { n: 'Lying Leg Curl',                 sub: 'knee_flexion',  p: 'machine',        eq: ['full_gym', 'machines_cables'] },
    { n: 'Seated Leg Curl',                sub: 'knee_flexion',  p: 'machine',        eq: ['full_gym', 'machines_cables'] },
    { n: 'Nordic Hamstring Curl',          sub: 'knee_flexion',  p: 'isolation',      eq: ['full_gym', 'bodyweight', 'home_gym'] },
    { n: 'Standing Leg Curl',              sub: 'knee_flexion',  p: 'machine',        eq: ['full_gym', 'machines_cables'] },
  ],
  glutes: [
    { n: 'Barbell Hip Thrust',        sub: 'activator', p: 'mod_compound', eq: ['full_gym', 'barbell_plates'] },
    { n: 'Smith Machine Hip Thrust',  sub: 'activator', p: 'machine',      eq: ['full_gym', 'machines_cables'] },
    { n: 'Dumbbell Hip Thrust',       sub: 'activator', p: 'mod_compound', eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'Cable Pull-Through',        sub: 'activator', p: 'isolation',    eq: ['full_gym', 'machines_cables'] },
    { n: 'Glute Bridge',              sub: 'activator', p: 'mod_compound', eq: ['bodyweight'] },
    { n: 'Step-Up (Dumbbell)',        sub: 'stretcher', p: 'mod_compound', eq: ['full_gym', 'dumbbells_only', 'home_gym'] },
    { n: 'Abductor Machine',          sub: 'pumper',    p: 'isolation',    eq: ['full_gym', 'machines_cables'] },
    { n: 'Cable Hip Abduction',       sub: 'pumper',    p: 'isolation',    eq: ['full_gym', 'machines_cables'] },
  ],
  calves: [
    { n: 'Standing Calf Raise (Machine)',      sub: 'gastro', p: 'isolation', eq: ['full_gym', 'machines_cables', 'barbell_plates'] },
    { n: 'Dumbbell Calf Raise (Standing)',     sub: 'gastro', p: 'isolation', eq: ['full_gym', 'dumbbells_only', 'home_gym', 'barbell_plates'] },
    { n: 'Leg Press Calf Raise',               sub: 'gastro', p: 'isolation', eq: ['full_gym', 'machines_cables'] },
    { n: 'Single-Leg Calf Raise (Bodyweight)', sub: 'gastro', p: 'isolation', eq: ['full_gym', 'bodyweight', 'home_gym', 'dumbbells_only', 'barbell_plates', 'machines_cables'] },
    { n: 'Seated Calf Raise',                  sub: 'soleus', p: 'isolation', eq: ['full_gym', 'machines_cables'] },
  ],
  abs: [
    { n: 'Cable Crunch',        sub: 'flexion',        p: 'isolation', eq: ['full_gym', 'machines_cables'] },
    { n: 'Hanging Leg Raise',   sub: 'flexion',        p: 'isolation', eq: ['full_gym', 'bodyweight', 'home_gym', 'barbell_plates'] },
    { n: 'Decline Crunch',      sub: 'flexion',        p: 'isolation', eq: ['full_gym', 'home_gym', 'barbell_plates', 'dumbbells_only', 'bodyweight'] },
    { n: 'Leg Raise (Flat Bench)', sub: 'flexion',     p: 'isolation', eq: ['full_gym', 'bodyweight', 'home_gym', 'barbell_plates'] },
    { n: 'Ab Rollout',          sub: 'anti_extension', p: 'isolation', eq: ['full_gym', 'bodyweight', 'home_gym'] },
    { n: 'Plank',               sub: 'anti_extension', p: 'isolation', eq: ['full_gym', 'bodyweight', 'home_gym', 'dumbbells_only', 'barbell_plates', 'machines_cables'] },
    { n: 'Side Plank',          sub: 'anti_rotation',  p: 'isolation', eq: ['full_gym', 'bodyweight', 'home_gym', 'dumbbells_only', 'barbell_plates', 'machines_cables'] },
    { n: 'Pallof Press',        sub: 'anti_rotation',  p: 'isolation', eq: ['full_gym', 'machines_cables'] },
    { n: 'Cable Woodchop',      sub: 'anti_rotation',  p: 'isolation', eq: ['full_gym', 'machines_cables'] },
  ],
  traps: [
    { n: 'Barbell Shrug',                 sub: 'upper',     p: 'isolation', eq: ['full_gym', 'barbell_plates'] },
    { n: 'Dumbbell Shrug',                sub: 'upper',     p: 'isolation', eq: ['full_gym', 'dumbbells_only', 'home_gym', 'barbell_plates'] },
    { n: 'Cable Shrug',                   sub: 'upper',     p: 'isolation', eq: ['full_gym', 'machines_cables'] },
    { n: 'Face Pull (Rope)',              sub: 'mid_lower', p: 'isolation', eq: ['full_gym', 'machines_cables'] },
    { n: 'Cable Y-Raise (Prone)',         sub: 'mid_lower', p: 'isolation', eq: ['full_gym', 'machines_cables'] },
  ],
};

// ---------------------------------------------------------------------------
// Effective pool (library-generated, with per-muscle fallback to POOL)
// ---------------------------------------------------------------------------
// planEngine has always selected from the hardcoded POOL above. When the
// caller passes the exercise library (planAutoGen does), generatePlan builds
// a pool from it (poolGenerator) and points selection at that instead, so
// new library exercises become selectable and POOL/library names can't drift
// (docs/audit/volyume-exercise-audit-2026-05-30, 06 section 0).
//
// The engine stays synchronous and deterministic: the effective pool is a
// module-level reference that generatePlan sets at the start of a run and
// clears at the end. When no library is passed (every existing unit test),
// it stays exactly POOL, so behaviour is unchanged unless a library is
// supplied. The founder's choice was generate + per-muscle fallback: a
// muscle the library covers thinly keeps POOL's entries for that muscle.
let _effectivePool = POOL;

// Weak-point muscles for the current run (internal keys). Set in generatePlan,
// restored after, like _effectivePool. buildSession flexes the per-session cap
// for these, and buildFromMatrix gives them extra sessions, so a weak-point
// muscle can actually deliver its boosted volume while the division split is
// preserved.
let _weakPointKeys = [];

// Minimum library entries per muscle before we trust the generated pool for
// that muscle; below this we fall back to POOL's hand-written entries.
const MIN_GENERATED_PER_MUSCLE = 3;

function buildEffectivePool(exerciseLibrary) {
  if (!exerciseLibrary || exerciseLibrary.length === 0) return POOL;
  const generated = generatePoolFromLibrary(exerciseLibrary);
  // Start from the generated pool, then for any muscle POOL knows about that
  // the library covers thinly, keep POOL's entries. This never leaves a
  // muscle worse-covered than today.
  const merged = { ...generated };
  for (const muscle of Object.keys(POOL)) {
    if ((merged[muscle]?.length ?? 0) < MIN_GENERATED_PER_MUSCLE) {
      merged[muscle] = POOL[muscle];
    }
  }
  return merged;
}

// ---------------------------------------------------------------------------
// Subregion coverage requirements (weekly-level)
// ---------------------------------------------------------------------------

const SUBREGION_REQUIREMENTS = {
  back:       { minSets: 6,  required: ['vertical_pull', 'horizontal_row'] },
  hamstrings: { minSets: 6,  required: ['hip_extension', 'knee_flexion'] },
  // Glutes: Contreras split-by-type. Once volume is glute-led (Bikini/Wellness
  // territory, >= 16 weekly), spread across a heavy peak-contraction lift and a
  // light abduction/kickback so the week is not three hip thrusts. Stretcher is
  // a bonus, not required, because the program's hip-hinge already loads the
  // glute in the lengthened position.
  glutes:     { minSets: 16, required: ['activator', 'pumper'] },
  // Quads: once volume is quad-emphasis (>= 14 weekly, Classic/Wellness/BB),
  // spread across a sweep-biased lift (knee-forward) and a general mass squat
  // so the two weekly sessions use different patterns (spec phase 3 benchmark).
  // Quads: spread across a sweep-biased lift and a general mass squat once the
  // muscle is trained at MEV+ (8). This was minSets 14, which the systemic-cap-
  // scaled quad target rarely reached, so quads got one exercise/session and
  // under-delivered next to hamstrings (whose hip-extension+knee-flexion
  // requirement triggers at 6). Lowered to 8 so quads and hams spread
  // symmetrically and a mass division's quads reach parity with its hams.
  quads:      { minSets: 8,  required: ['sweep', 'vasti'] },
  chest:      { minSets: 10, required: ['incline', 'flat'] },  // flat covers flat+lower
  rear_delts: { minSets: 6,  required: ['face_pull', 'horiz_abduction'] },
  triceps:    { minSets: 8,  required: ['overhead'] },
  calves:     { minSets: 10, required: ['gastro', 'soleus'] },
  abs:        { minSets: 10, required: ['flexion', 'anti_extension'] },
};

// ---------------------------------------------------------------------------
// Session time parameters
// ---------------------------------------------------------------------------

const REST_SEC = {
  heavy_compound: 180,
  mod_compound:   150,
  machine:        120,
  isolation:       75,
};

const TRANS_SEC = {
  full_gym:       120,
  machines_cables: 90,
  home_gym:        60,
  dumbbells_only:  45,
  barbell_plates:  75,
  bodyweight:      30,
};

// ---------------------------------------------------------------------------
// makeEx, build one exercise entry
// ---------------------------------------------------------------------------

const REP_RANGES = {
  heavy_compound: { repMin: 5,  repMax: 9  },
  mod_compound:   { repMin: 8,  repMax: 12 },
  machine:        { repMin: 8,  repMax: 15 },
  isolation:      { repMin: 10, repMax: 20 },
};

const STRENGTH_REP_RANGES = {
  heavy_compound: { repMin: 4,  repMax: 6  },
  mod_compound:   { repMin: 5,  repMax: 8  },
  machine:        { repMin: 8,  repMax: 12 },
  isolation:      { repMin: 10, repMax: 15 },
};

const STRENGTH_REST = {
  heavy_compound: 210,
  mod_compound:   180,
  machine:        120,
  isolation:       75,
};

function baseRir(experience) {
  if (experience === 'beginner')     return 3;
  if (experience === 'intermediate') return 2;
  return 1;
}

function makeEx(name, paramKey, sets, experience, nutritionPhase, goal = null, notes = null) {
  const isStrength = goal === 'strength_hypertrophy';
  const rr = isStrength ? (STRENGTH_REP_RANGES[paramKey] ?? STRENGTH_REP_RANGES.isolation)
                        : (REP_RANGES[paramKey] ?? REP_RANGES.isolation);
  const rest = isStrength ? (STRENGTH_REST[paramKey] ?? REST_SEC[paramKey] ?? 75)
                          : (REST_SEC[paramKey] ?? 75);
  let rir = baseRir(experience);
  const cutPhases = ['mild_cut', 'aggressive_cut', 'contest_prep'];
  if (cutPhases.includes(nutritionPhase)) rir = Math.min(rir + 1, 4);

  const minSets = (paramKey === 'heavy_compound' || paramKey === 'mod_compound') ? 3 : 2;
  return {
    exerciseName: name,
    sets: Math.max(minSets, sets),
    repMin: rr.repMin,
    repMax: rr.repMax,
    restSec: rest,
    rirTarget: rir,
    notes: notes ?? null,
  };
}

// ---------------------------------------------------------------------------
// Time budget calculation and trimming
// ---------------------------------------------------------------------------

export function estimateWorkoutMinutes(exercises) {
  if (!exercises || exercises.length === 0) return 0;
  const T_SET_LOG = 60;

  const numCompounds = exercises.filter(e => e.restSec >= 150).length;
  const overheadMin = 7.5 + Math.max(0, numCompounds - 1);
  let sessionSec = overheadMin * 60;

  for (const ex of exercises) {
    sessionSec += ex.sets * T_SET_LOG + (ex.sets - 1) * ex.restSec;
  }
  return Math.ceil(sessionSec / 60);
}

function estimateSessionMinutes(exercises, equipment) {
  if (!exercises || exercises.length === 0) return 0;
  const T_SET_LOG = 60;
  const trans = TRANS_SEC[equipment] ?? 90;
  const numCompounds = exercises.filter(e => e.restSec >= 150).length;
  const overheadMin = 7.5 + Math.max(0, numCompounds - 1);

  let sessionSec = overheadMin * 60;
  for (const ex of exercises) {
    sessionSec += ex.sets * T_SET_LOG + (ex.sets - 1) * ex.restSec;
  }
  if (exercises.length > 1) {
    sessionSec += (exercises.length - 1) * trans;
  }
  return sessionSec / 60;
}

// Hard delivered-volume ceiling. Sums each muscle's delivered sets (by the slot
// it was selected for, _m) across all sessions and trims the largest entries so
// no muscle exceeds its division-aware MRV, and the side+rear+front delt complex
// stays within its combined cap. Keeps a 3-set minimum and never removes a
// muscle's last entry. Runs before time-trim and the volume summary.
function clampDeliveredToMRV(workouts, goal, _landmarks) {
  const byMuscle = {};
  for (const w of workouts) for (const ex of w.exercises) {
    if (ex._m) (byMuscle[ex._m] ??= []).push(ex);
  }
  const trimGroup = (exs, cap) => {
    let total = exs.reduce((s, e) => s + e.sets, 0);
    if (total <= cap) return;
    for (const ex of [...exs].sort((a, b) => b.sets - a.sets)) {
      while (total > cap && ex.sets > 3) { ex.sets--; total--; }
    }
    if (total > cap) {
      for (const ex of exs) {
        if (total <= cap) break;
        if (exs.filter(e => e.sets > 0).length <= 1) break;
        if (ex.sets <= 3) { total -= ex.sets; ex.sets = 0; }
      }
    }
  };
  for (const [m, exs] of Object.entries(byMuscle)) {
    if (m === 'side_delts' || m === 'rear_delts' || m === 'front_delts') continue;
    const lm = SPEC_LANDMARKS[m];
    if (lm) trimGroup(exs, divisionMRV(m, goal, lm));
  }
  const delts = [...(byMuscle.side_delts ?? []), ...(byMuscle.rear_delts ?? []), ...(byMuscle.front_delts ?? [])];
  if (delts.length) trimGroup(delts, SIDE_REAR_DELT_CAP);
  for (const w of workouts) w.exercises = w.exercises.filter(e => e.sets > 0);
}

function trimToTimeBudget(exercises, sessionLengthMinutes, equipment) {
  if (!sessionLengthMinutes || sessionLengthMinutes <= 0) return exercises;
  const budget = sessionLengthMinutes - 2;
  if (estimateSessionMinutes(exercises, equipment) <= budget) return exercises;

  const result = exercises.map(e => ({ ...e }));

  // Phase 1: reduce sets back-to-front, min 3 sets (rebuild spec: no 2-set
  // fragments). Below this floor we drop whole exercises in phase 2 rather than
  // shaving an entry down to 2.
  let safety = 120;
  while (estimateSessionMinutes(result, equipment) > budget && safety-- > 0) {
    let trimmed = false;
    for (let i = result.length - 1; i >= 1; i--) {
      if (result[i].sets > 3) {
        result[i].sets--;
        trimmed = true;
        break;
      }
    }
    if (!trimmed) break;
  }

  // Phase 2: drop whole exercises, lowest-priority first. Protections:
  //  - never the first exercise of the session
  //  - never an exercise that covers a required subregion (_req)
  //  - never a muscle's only remaining exercise (keeps every targeted
  //    muscle represented, better a few minutes over budget than a
  //    muscle group with zero direct volume)
  // If nothing is safely removable we stop and accept a small overage;
  // the displayed duration is an estimate, not a hard cap.
  let safety2 = 60;
  while (estimateSessionMinutes(result, equipment) > budget && result.length > 3 && safety2-- > 0) {
    let removeIdx = -1;
    for (let i = result.length - 1; i >= 1; i--) {
      const ex = result[i];
      if (ex._req) continue;
      const muscleCount = result.filter(x => x._m === ex._m).length;
      if (muscleCount <= 1) continue; // sole exercise for its muscle, protect
      removeIdx = i;
      break;
    }
    if (removeIdx === -1) break;
    result.splice(removeIdx, 1);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Exercise selection helpers
// ---------------------------------------------------------------------------

// Division-specific pool restrictions (rebuild spec phase 3, division pools).
// Unlike DIVISION_SUBREGION_BIAS (a soft scoring nudge), these are the spec's
// HARD pool rules: a division must not select certain lifts for a muscle.
//  - denySubs: sub-regions the division's judging criteria exclude.
//  - denyParams: movement classes the division excludes (e.g. shape-only legs
//    drop heavy_compound).
// Each rule is attributed to an explicit spec line, not a judgement call:
//  - Bikini back "width, NOT heavy traps/rows" (spec L152, anti-pattern L238):
//    drop horizontal_row.
//  - Bikini quads "shape only, no heavy" (spec L152, L157): drop heavy_compound.
//  - Bikini "never bench" (spec L152): chest is MV via machine/incline only.
//  - Men's Physique "legs maintenance: leg press, RDL, leg curl, calf"
//    (spec L116): quads drop heavy_compound (no back/front squat).
// SAFETY: applied only when enough lifts survive, so a thin library or a
// machine-only user is never starved (same philosophy as difficulty gating).
const DIVISION_POOL_RULES = {
  bikini: {
    // Lat-WIDTH only for the X-frame: vertical pulls and straight-arm/pullover
    // (both tagged vertical_pull). No heavy rows and no deadlifts (deadlifts
    // build erector/trap thickness that widens the waist and blunts the taper,
    // working against the judged outcome). An allow-list, not a deny-list, so a
    // mis-tagged hinge (e.g. a deadlift tagged lower_lat) cannot leak in.
    back:        { allowSubs: ['vertical_pull'] },
    quads:       { denyParams: ['heavy_compound'] },
    chest:       { denyParams: ['heavy_compound'] },
    // Round delts via lateral raises, not pressing (spec L152). Drop overhead
    // press from both delt buckets: side delts (the Bikini priority) keep the
    // lateral-raise variants, front delts (MEV 0, not judged) keep isolation.
    side_delts:  { denySubs: ['press'] },
    front_delts: { denySubs: ['press'] },
  },
  mens_physique: {
    quads: { denyParams: ['heavy_compound'] },
  },
};

function filterPool(muscle, equipment, goal) {
  const pool = _effectivePool[muscle] ?? [];
  const byEquip = pool.filter(e => e.eq.includes(equipment));

  const rule = DIVISION_POOL_RULES[goal]?.[muscle];
  if (!rule) return byEquip;

  const restricted = byEquip.filter(e => {
    if (rule.allowSubs && !rule.allowSubs.includes(e.sub)) return false;
    if (rule.denySubs && rule.denySubs.includes(e.sub)) return false;
    if (rule.denyParams && rule.denyParams.includes(e.p)) return false;
    return true;
  });
  // Never starve: if the division rule removes every lift, fall back to the
  // equipment-filtered pool. A single survivor is kept (a de-emphasised muscle
  // like Bikini front delts may legitimately have one isolation option); the
  // no-zero / no-fragment benchmarks guard coverage.
  return restricted.length >= 1 ? restricted : byEquip;
}

// Division-aware exercise priority (coach-plan audit 2026-06-01, stage 3).
// A scoring nudge (not a hard filter) that favours the subregion the division
// is judged on, within the muscle's existing volume. Width-judged divisions
// favour incline (upper chest) and vertical pulls (lat width); the glute-led
// divisions favour the glute-max (hip-thrust/hinge) pattern. Side-delt and
// hamstring pools are already movement-specific, so they need no nudge.
const DIVISION_SUBREGION_BIAS = {
  mens_physique:    { chest: 'incline', back: 'vertical_pull' },
  figure:           { chest: 'incline', back: 'vertical_pull' },
  classic_physique: { back: 'vertical_pull', quads: 'sweep' },
  womens_physique:  { back: 'vertical_pull' },
  bikini:           { glutes: 'activator' },
  wellness:         { glutes: 'activator', quads: 'sweep' },
};

// How many exercises a session holds for a muscle, given its set target.
// Extracted so difficulty gating can size its coverage threshold to the same
// number the selection loop uses below.
function numExHint(sessionTarget) {
  return sessionTarget <= 5 ? 1 : 2;
}

// Assistance / regression lifts: the machine-assisted versions of bodyweight
// compounds (Assisted Pull-Up, Assisted Dip Machine). These are beginner
// crutches, an intermediate or stronger lifter trains the loaded version
// instead. Gated away from non-beginners below (athlete-suitability fix). The
// word boundary keeps it to genuinely assisted lifts, not, say, a future
// "Resisted" anything.
const ASSISTED_RE = /\bassisted\b/i;

function selectExercisesForMuscle(muscle, sessionTarget, equipment, goal, slot, usedNames, weeklyTotalSets, landmarks, experience, nutritionPhase) {
  if (sessionTarget < 2) return [];

  let available = filterPool(muscle, equipment, goal);
  if (available.length === 0) return [];

  // Difficulty gating (founder decision: gate, but never starve coverage).
  // Beginners don't get advanced (difficulty 3) lifts in generated plans,
  // but only drop them if enough options remain to cover the muscle; if
  // gating would leave too few, keep the advanced lifts so coverage wins.
  // Library entries carry `difficulty`; the hand-written POOL fallback
  // entries don't, so they're treated as ungated (null) and never dropped.
  if (experience === 'beginner') {
    const gated = available.filter(e => e.difficulty == null || e.difficulty < 3);
    if (gated.length >= Math.max(2, numExHint(sessionTarget))) {
      available = gated;
    }
  }

  // The mirror image of the above for everyone past their first block: drop the
  // assisted crutch lifts so a Men's Physique or any intermediate+ athlete gets
  // the real movement, not the assisted machine. Same never-starve guard: only
  // drop them when enough loaded options remain to cover the muscle. This also
  // undoes a quirk where a division's vertical-pull bias could rank Assisted
  // Pull-Up above real pulls for that athlete.
  if (experience !== 'beginner') {
    const gated = available.filter(e => !ASSISTED_RE.test(e.n));
    if (gated.length >= Math.max(2, numExHint(sessionTarget))) {
      available = gated;
    }
  }

  // Determine subregion priority
  const req = SUBREGION_REQUIREMENTS[muscle];
  const requiredSubs = req && weeklyTotalSets >= req.minSets ? req.required : [];

  // Goal-aware selection bias (06 section 2). A scoring nudge, not a hard
  // filter, so a machine-only or thin-library user still gets a plan.
  //  - strength: favour barbell/landmine compounds for the heavy slots.
  //  - hypertrophy (default): favour higher stimulus-to-fatigue where two
  //    candidates otherwise tie, so machines/cables and stable movements win.
  const isStrengthGoal = goal === 'strength_hypertrophy';

  // Sort: required subregion first → compound before isolation → goal bias
  // → SFR tiebreak → pool index. Each term is an order of magnitude below
  // the previous so the established priority order is preserved.
  const divBias = DIVISION_SUBREGION_BIAS[goal];
  const preferredSub = divBias ? divBias[muscle] : null;
  function sortScore(e, idx) {
    const reqBonus   = requiredSubs.includes(e.sub) ? 0 : 100;
    const paramOrder = { heavy_compound: 0, mod_compound: 1, machine: 2, isolation: 3 };
    const paramBonus = (paramOrder[e.p] ?? 3) * 10;
    // Division subregion nudge: half a param tier, enough to favour the judged
    // subregion (e.g. incline chest for Men's Physique) without overriding the
    // required-coverage or compound-first ordering.
    const divBonus = (preferredSub && e.sub === preferredSub) ? -5 : 0;
    let goalBonus = 0;
    if (isStrengthGoal) {
      // Strength: nudge barbell/landmine compounds up a little.
      const heavyBarbell = e.p === 'heavy_compound'
        && (e.equipmentCategory == null || e.equipmentCategory === 'barbell' || e.equipmentCategory === 'landmine');
      goalBonus = heavyBarbell ? -3 : 0;
    } else if (e.sfr != null) {
      // Hypertrophy: higher SFR ranks earlier (sfr 1..10 -> bonus -1..-0.1),
      // small enough to act only as a tiebreak within the same param tier.
      goalBonus = -(e.sfr / 10);
    }
    return reqBonus + paramBonus + divBonus + goalBonus + idx;
  }

  const sorted = available
    .map((e, idx) => ({ e, score: sortScore(e, idx) }))
    .sort((a, b) => a.score - b.score)
    .map(x => x.e);

  // Determine how many exercises this session can hold for this muscle.
  // Cap at 2 per session: each exercise needs at least 3 working sets for
  // compounds (standard PT/coach minimum), so 6 sets minimum for two exercises.
  // Three exercises per muscle per session fragments volume unnecessarily.
  const numEx = numExHint(sessionTarget);

  const covered = new Set();
  const chosen = [];

  // Pass 1: cover required subregions.
  // When the session can't fit every required subregion (e.g. hamstrings at
  // 3 sets/session can only hold 1 exercise but needs hip-extension AND
  // knee-flexion), rotate which subregions this session covers by slot so the
  // WEEK satisfies the requirement, Lower A does the leg curl, Lower B the
  // RDL. This is the back-day / hamstring-day balance fix from the spec.
  let subsToCover = requiredSubs;
  if (requiredSubs.length > numEx) {
    subsToCover = [];
    for (let k = 0; k < numEx; k++) {
      subsToCover.push(requiredSubs[(slot + k) % requiredSubs.length]);
    }
  }
  for (const sub of subsToCover) {
    if (chosen.length >= numEx) break;
    const candidate = sorted.find(e => e.sub === sub && !usedNames.has(e.n));
    if (candidate) {
      chosen.push(candidate);
      covered.add(sub);
      usedNames.add(candidate.n);
    }
  }

  // Pass 2: fill remaining slots, preferring a different sub-region than the
  // ones already chosen for this muscle this session (anti-redundancy 3d: no
  // two exercises for one muscle in a session share a movement pattern, e.g.
  // two hip thrusts or two lateral raises, UNLESS no alternative pattern
  // exists). Diversity-first pass, then a fallback that allows a repeat sub so
  // a high-volume muscle still fills its slots.
  const chosenSubs = new Set(chosen.map(e => e.sub));
  const tryFill = (allowSameSub) => {
    for (const e of sorted) {
      if (chosen.length >= numEx) break;
      if (usedNames.has(e.n)) continue;
      if (!allowSameSub && chosenSubs.has(e.sub)) continue;
      // RDL/SLDL guardrail, never both in the same session
      if (muscle === 'hamstrings') {
        const hasRdl  = chosen.some(x => x.n === 'Romanian Deadlift (Barbell)');
        const hasSldl = chosen.some(x => x.n === 'Stiff-Leg Deadlift');
        if (e.n === 'Stiff-Leg Deadlift' && hasRdl) continue;
        if (e.n === 'Romanian Deadlift (Barbell)' && hasSldl) continue;
      }
      chosen.push(e);
      usedNames.add(e.n);
      chosenSubs.add(e.sub);
    }
  };
  tryFill(false);
  tryFill(true);

  // Fallback: if still empty, allow an already-used pick (vary by slot)
  if (chosen.length === 0 && sorted.length > 0) {
    chosen.push(sorted[slot % sorted.length]);
  }

  // Distribute sessionTarget sets across chosen exercises.
  // Every entry gets 3-6 working sets (rebuild spec phase 1: no 2-set
  // fragments; a single exercise holds at most 6 sets). The session target is
  // spread as evenly as the chosen exercises allow, so a muscle's DELIVERED
  // volume tracks its target instead of being capped at numEx*4 and dropping
  // the remainder (the delivered-vs-target gap: a 5-set session with one
  // isolation used to deliver 3). The reservation keeps later entries above the
  // minimum.
  const MIN_SETS_PER_ENTRY = 3;
  const MAX_SETS_PER_ENTRY = 6;
  const n = chosen.length;
  const result = [];
  let remaining = sessionTarget;
  for (let i = 0; i < n; i++) {
    const entry = chosen[i];
    const slotsLeft = n - i;
    const slotsAfter = slotsLeft - 1;
    const reserveAfter = slotsAfter * MIN_SETS_PER_ENTRY;
    const maxForThis = Math.min(MAX_SETS_PER_ENTRY, remaining - reserveAfter);
    let s = Math.ceil(remaining / slotsLeft);
    s = Math.min(s, maxForThis);
    s = Math.max(MIN_SETS_PER_ENTRY, s);
    remaining -= s;
    const exObj = makeEx(entry.n, entry.p, s, experience, nutritionPhase, goal, null);
    // Internal-only tags consumed by trimToTimeBudget, stripped before output.
    exObj._m = muscle;                              // owning muscle
    exObj._req = covered.has(entry.sub) && requiredSubs.includes(entry.sub); // covers a required subregion
    result.push(exObj);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Split selection
// ---------------------------------------------------------------------------

function selectSplit(experience, effectiveDays, goal) {
  // Lower-body-dominant divisions need more leg sessions (coach-plan audit
  // stage 2). Full body at 3 days already exposes legs every session;
  // upper/lower at 4 already runs 2 lower days; 5-6 days route to the
  // lower-focus split (3 lower days).
  const lowerFocus = (goal === 'bikini' || goal === 'wellness');
  // Divisions whose legs are fully judged need two leg days at 5 days (the PPL
  // 5-day gives one). Men's Physique stays upper-weighted; general keeps PPL so
  // the default non-competitor experience is unchanged.
  const legJudgedBalanced = (goal === 'bodybuilding' || goal === 'classic_physique'
    || goal === 'figure' || goal === 'womens_physique' || goal === 'womens_bodybuilding');
  if (effectiveDays === 3) {
    if (lowerFocus) return 'full_body';
    return (experience === 'advanced' || experience === 'competitive') ? 'ppl' : 'full_body';
  }
  if (effectiveDays === 4) return 'upper_lower';
  if (effectiveDays === 5) {
    if (goal === 'weak_point_spec') return 'upper_lower_wp';
    if (lowerFocus) return 'lower_focus';
    if (legJudgedBalanced) return 'balanced_ul';
    return 'ppl';
  }
  if (effectiveDays === 6) return lowerFocus ? 'lower_focus' : 'ppl_ab';
  // Days outside the supported 3-6 range fall through here, log so we
  // can spot the bad-input pattern. effectiveDays is normally clamped by
  // the caller; if we land here something upstream let an invalid value
  // slip through.
  try {
    require('./errorLog').logWarn(
      'planEngine.selectSplit',
      `unexpected effectiveDays=${effectiveDays}, falling back to ppl_ab`,
      { effectiveDays, experience, goal },
    );
  } catch (_) {}
  return 'ppl_ab';
}

// ---------------------------------------------------------------------------
// Session builders
// ---------------------------------------------------------------------------

function buildSession(name, muscles, sessionsPerMuscle, weeklyTargets, equipment, goal, slot, usedNamesByMuscle, experience, nutritionPhase, landmarks) {
  const exercises = [];

  for (const muscle of muscles) {
    const wTarget = weeklyTargets[muscle] ?? 0;
    const sessions = sessionsPerMuscle[muscle] ?? 1;
    // Per-session cap (spec section B). 8 sets/muscle/session is the productive
    // ceiling (Brigatto/Nippard); a weak-point muscle flexes to 12 so its
    // boosted weekly volume can be expressed instead of being clipped at 8. The
    // weekly MRV cap still bounds the total.
    const sessionCap = _weakPointKeys.includes(muscle) ? 12 : 8;
    const sessionTarget = Math.min(sessionCap, Math.round(wTarget / sessions));
    if (sessionTarget < 2) continue;

    const usedNames = usedNamesByMuscle[muscle] ?? new Set();
    const exs = selectExercisesForMuscle(
      muscle, sessionTarget, equipment, goal, slot,
      usedNames, wTarget, landmarks, experience, nutritionPhase
    );
    usedNamesByMuscle[muscle] = usedNames;
    // Tag each emitted exercise with the muscle it was picked for so the
    // downstream superset planner can pair antagonist / non-competing pairs.
    // These underscore-prefixed fields are stripped by planAutoGen before
    // writing to the DB.
    for (const ex of exs) {
      if (ex._muscle == null) ex._muscle = muscle;
    }
    exercises.push(...exs);
  }

  return { name, exercises };
}

// ---------------------------------------------------------------------------
// Split-specific workout array builders
// ---------------------------------------------------------------------------

function buildFullBodyWorkouts(weeklyTargets, landmarks, equipment, goal, experience, nutritionPhase, effectiveDays) {
  const muscles = ['quads', 'hamstrings', 'glutes', 'chest', 'back', 'side_delts', 'rear_delts', 'biceps', 'triceps', 'abs', 'calves'];
  const labels = ['Full Body A', 'Full Body B', 'Full Body C', 'Full Body D', 'Full Body E', 'Full Body F'];

  // Rotating emphasis (spec): a muscle appears in only as many days as it needs
  // to deliver its target at >= ~4 sets/session, not in every session. This
  // keeps low-volume muscles above the per-session minimum (so they are never
  // dropped to zero, the general-3-day glutes-0 failure) and keeps each session
  // short enough to fit the time budget (a full body of all 11 muscles every
  // day blew past it). Frequency is at least 1 (so nothing is omitted) and at
  // most effectiveDays.
  const sessionsPerMuscle = {};
  for (const m of muscles) {
    const t = weeklyTargets[m] ?? 0;
    sessionsPerMuscle[m] = t <= 0 ? 0 : Math.max(1, Math.min(effectiveDays, Math.round(t / 5)));
  }

  // Assign each muscle to its frequency of days, biggest/most-frequent first,
  // always into the least-loaded days so session sizes stay balanced.
  const dayMuscles = Array.from({ length: effectiveDays }, () => []);
  const order = [...muscles].sort((a, b) =>
    (sessionsPerMuscle[b] - sessionsPerMuscle[a]) || ((weeklyTargets[b] ?? 0) - (weeklyTargets[a] ?? 0)));
  for (const m of order) {
    const picks = dayMuscles
      .map((d, i) => [i, d.length])
      .sort((a, b) => a[1] - b[1])
      .slice(0, sessionsPerMuscle[m])
      .map(x => x[0]);
    for (const i of picks) dayMuscles[i].push(m);
  }

  const usedByMuscle = {};
  for (const m of muscles) usedByMuscle[m] = new Set();

  return dayMuscles.map((dm, i) => buildSession(
    labels[i % labels.length], dm, sessionsPerMuscle,
    weeklyTargets, equipment, goal, i, usedByMuscle,
    experience, nutritionPhase, landmarks,
  ));
}

function buildUpperLowerWorkouts(weeklyTargets, landmarks, equipment, goal, experience, nutritionPhase) {
  const upperMuscles = ['chest', 'back', 'side_delts', 'rear_delts', 'front_delts', 'biceps', 'triceps'];
  // Adductors sit in the lower split. They default to a 0 weekly target
  // (mev 0, like front delts), so they're only programmed when a user makes
  // them a weak point or otherwise raises the target; including them here
  // just means that work lands on lower days when it exists.
  const lowerMuscles = ['quads', 'hamstrings', 'glutes', 'adductors', 'calves', 'abs'];

  const sessionsPerMuscle = {};
  for (const m of upperMuscles) sessionsPerMuscle[m] = 2;
  for (const m of lowerMuscles) sessionsPerMuscle[m] = 2;

  const usedByMuscle = {};
  const allMuscles = [...upperMuscles, ...lowerMuscles];
  for (const m of allMuscles) usedByMuscle[m] = new Set();

  const upperA = buildSession('Upper A', upperMuscles, sessionsPerMuscle, weeklyTargets, equipment, goal, 0, usedByMuscle, experience, nutritionPhase, landmarks);
  const lowerA = buildSession('Lower A', lowerMuscles, sessionsPerMuscle, weeklyTargets, equipment, goal, 0, usedByMuscle, experience, nutritionPhase, landmarks);
  const upperB = buildSession('Upper B', upperMuscles, sessionsPerMuscle, weeklyTargets, equipment, goal, 1, usedByMuscle, experience, nutritionPhase, landmarks);
  const lowerB = buildSession('Lower B', lowerMuscles, sessionsPerMuscle, weeklyTargets, equipment, goal, 1, usedByMuscle, experience, nutritionPhase, landmarks);

  return [upperA, lowerA, upperB, lowerB];
}

// Leg-judged divisions need more LEG SESSIONS, not just more leg sets:
// buildSession caps a muscle at min(8, target/sessions), so one leg day cannot
// deliver a 12-22 set leg target however high the overlay sets it (coach-plan
// audit 2026-06-01, stages 2/2b). This builder runs `lowerDays` lower sessions
// against the rest as upper, interleaved L/U/L/U... Lower-dominant divisions
// (Bikini, Wellness) pass lowerDays=3; balanced leg-judged divisions pass half.
function buildWeightedUpperLower(weeklyTargets, landmarks, equipment, goal, experience, nutritionPhase, effectiveDays, lowerDays) {
  const upperMuscles = ['chest', 'back', 'traps', 'side_delts', 'rear_delts', 'front_delts', 'biceps', 'triceps'];
  // Quads lead the lower day (squat), not glutes: this split serves the balanced
  // mass divisions (Bodybuilding, Women's Bodybuilding), where the week should
  // open on a major compound, not a hip thrust.
  const lowerMuscles = ['quads', 'hamstrings', 'glutes', 'adductors', 'calves', 'abs'];
  const upperDays = Math.max(1, effectiveDays - lowerDays);

  const sessionsPerMuscle = {};
  for (const m of upperMuscles) sessionsPerMuscle[m] = upperDays;
  for (const m of lowerMuscles) sessionsPerMuscle[m] = lowerDays;

  const usedByMuscle = {};
  for (const m of [...upperMuscles, ...lowerMuscles]) usedByMuscle[m] = new Set();

  const lowerSessions = Array.from({ length: lowerDays }, (_, i) =>
    buildSession(`Lower ${String.fromCharCode(65 + i)}`, lowerMuscles, sessionsPerMuscle, weeklyTargets, equipment, goal, i, usedByMuscle, experience, nutritionPhase, landmarks));
  const upperSessions = Array.from({ length: upperDays }, (_, i) =>
    buildSession(`Upper ${String.fromCharCode(65 + i)}`, upperMuscles, sessionsPerMuscle, weeklyTargets, equipment, goal, i, usedByMuscle, experience, nutritionPhase, landmarks));

  // Interleave lower-first so the priority work lands on fresh days.
  const out = [];
  let l = 0;
  let u = 0;
  while (out.length < effectiveDays && (l < lowerSessions.length || u < upperSessions.length)) {
    if (l < lowerSessions.length) out.push(lowerSessions[l++]);
    if (u < upperSessions.length) out.push(upperSessions[u++]);
  }
  return out;
}

function buildPPLWorkouts(weeklyTargets, landmarks, equipment, goal, experience, nutritionPhase, effectiveDays) {
  const pushMuscles = ['chest', 'front_delts', 'side_delts', 'triceps'];
  const pullMuscles = ['back', 'rear_delts', 'biceps', 'traps'];
  const legMuscles  = ['quads', 'hamstrings', 'glutes', 'adductors', 'calves', 'abs'];

  const sessionsPerMuscle = {};
  const allMuscles = [...pushMuscles, ...pullMuscles, ...legMuscles];

  if (effectiveDays === 3) {
    for (const m of allMuscles) sessionsPerMuscle[m] = 1;
  } else if (effectiveDays === 5) {
    for (const m of pushMuscles) sessionsPerMuscle[m] = 2;
    for (const m of pullMuscles) sessionsPerMuscle[m] = 2;
    for (const m of legMuscles)  sessionsPerMuscle[m] = 1;
  } else {
    // 6-day ppl_ab
    for (const m of allMuscles) sessionsPerMuscle[m] = 2;
  }

  const usedByMuscle = {};
  for (const m of allMuscles) usedByMuscle[m] = new Set();

  if (effectiveDays === 3) {
    return [
      buildSession('Push',   pushMuscles, sessionsPerMuscle, weeklyTargets, equipment, goal, 0, usedByMuscle, experience, nutritionPhase, landmarks),
      buildSession('Pull',   pullMuscles, sessionsPerMuscle, weeklyTargets, equipment, goal, 0, usedByMuscle, experience, nutritionPhase, landmarks),
      buildSession('Legs',   legMuscles,  sessionsPerMuscle, weeklyTargets, equipment, goal, 0, usedByMuscle, experience, nutritionPhase, landmarks),
    ];
  }
  if (effectiveDays === 5) {
    return [
      buildSession('Push A', pushMuscles, sessionsPerMuscle, weeklyTargets, equipment, goal, 0, usedByMuscle, experience, nutritionPhase, landmarks),
      buildSession('Pull A', pullMuscles, sessionsPerMuscle, weeklyTargets, equipment, goal, 0, usedByMuscle, experience, nutritionPhase, landmarks),
      buildSession('Legs',   legMuscles,  sessionsPerMuscle, weeklyTargets, equipment, goal, 0, usedByMuscle, experience, nutritionPhase, landmarks),
      buildSession('Push B', pushMuscles, sessionsPerMuscle, weeklyTargets, equipment, goal, 1, usedByMuscle, experience, nutritionPhase, landmarks),
      buildSession('Pull B', pullMuscles, sessionsPerMuscle, weeklyTargets, equipment, goal, 1, usedByMuscle, experience, nutritionPhase, landmarks),
    ];
  }
  // 6-day
  return [
    buildSession('Push A', pushMuscles, sessionsPerMuscle, weeklyTargets, equipment, goal, 0, usedByMuscle, experience, nutritionPhase, landmarks),
    buildSession('Pull A', pullMuscles, sessionsPerMuscle, weeklyTargets, equipment, goal, 0, usedByMuscle, experience, nutritionPhase, landmarks),
    buildSession('Legs A', legMuscles,  sessionsPerMuscle, weeklyTargets, equipment, goal, 0, usedByMuscle, experience, nutritionPhase, landmarks),
    buildSession('Push B', pushMuscles, sessionsPerMuscle, weeklyTargets, equipment, goal, 1, usedByMuscle, experience, nutritionPhase, landmarks),
    buildSession('Pull B', pullMuscles, sessionsPerMuscle, weeklyTargets, equipment, goal, 1, usedByMuscle, experience, nutritionPhase, landmarks),
    buildSession('Legs B', legMuscles,  sessionsPerMuscle, weeklyTargets, equipment, goal, 1, usedByMuscle, experience, nutritionPhase, landmarks),
  ];
}

function buildWeakPointDay(weakPointKeys, weeklyTargets, landmarks, equipment, goal, experience, nutritionPhase) {
  const muscles = weakPointKeys.length > 0 ? weakPointKeys : ['side_delts', 'biceps'];
  const sessionsPerMuscle = {};
  for (const m of muscles) sessionsPerMuscle[m] = 3; // WP day is 3rd session

  const usedByMuscle = {};
  for (const m of muscles) usedByMuscle[m] = new Set();

  // Override targets to MRV-2
  const wpTargets = { ...weeklyTargets };
  for (const m of muscles) {
    if (landmarks[m]) {
      wpTargets[m] = Math.max(landmarks[m].MEV, landmarks[m].MRV - 2);
    }
  }

  const session = buildSession(
    'Weak Point Specialisation', muscles, sessionsPerMuscle,
    wpTargets, equipment, goal, 2, usedByMuscle,
    experience, nutritionPhase, landmarks
  );

  // Ensure at least 4 sets on first exercise
  if (session.exercises.length > 0 && session.exercises[0].sets < 4) {
    session.exercises[0] = { ...session.exercises[0], sets: 4 };
  }

  return session;
}

function buildUpperLowerWPWorkouts(weeklyTargets, landmarks, equipment, goal, weakPointKeys, experience, nutritionPhase) {
  const base = buildUpperLowerWorkouts(weeklyTargets, landmarks, equipment, goal, experience, nutritionPhase);
  const wpDay = buildWeakPointDay(weakPointKeys, weeklyTargets, landmarks, equipment, goal, experience, nutritionPhase);
  const all = [...base, wpDay];

  // The base upper/lower already delivers the weak muscle's boosted weekly
  // target; the dedicated weak-point day adds more on top. Clamp the total to
  // MRV so a specialisation never exceeds the recoverable ceiling (the WP day
  // is trimmed first, keeping a 3-set minimum, then dropped if still over).
  for (const m of weakPointKeys) {
    const lm = landmarks[m];
    if (!lm) continue;
    const cap = divisionMRV(m, goal, lm);
    let total = 0;
    for (const w of all) for (const ex of w.exercises) if (ex._muscle === m) total += ex.sets;
    let excess = total - cap;
    if (excess <= 0) continue;
    const wpExs = wpDay.exercises.filter(ex => ex._muscle === m);
    for (const ex of wpExs) {
      if (excess <= 0) break;
      const cut = Math.min(ex.sets - 3, excess);
      if (cut > 0) { ex.sets -= cut; excess -= cut; }
    }
    if (excess > 0) {
      // Still over: drop the smallest WP-day entries for this muscle.
      wpDay.exercises = wpDay.exercises.filter(ex => {
        if (ex._muscle === m && excess > 0) { excess -= ex.sets; return false; }
        return true;
      });
    }
  }
  return all;
}

// ---------------------------------------------------------------------------
// Division x day-count decision matrix (rebuild spec phase 2)
// ---------------------------------------------------------------------------
//
// The structural core of specialisation: (division x day-count) jointly select
// the split skeleton and the muscle-priority ORDER within each session. The first
// muscle of session 1 is the division's lead muscle, so the week opens with
// that muscle's top compound (back -> vertical pull for Men's Physique, glutes
// -> hip thrust for Bikini, never bench). Muscle order within a session is the
// division's priority order, so priority muscles are trained first and most
// frequently. Volume per muscle is still the floored/capped weekly target from
// phase 1; this matrix decides STRUCTURE and FREQUENCY.
//
// Only the six specialised divisions are routed here. General, Bodybuilding and
// Women's Bodybuilding stay balanced on the legacy selectSplit path (their spec
// rows match it: Full Body / Upper-Lower / PPL), and the weak_point phase keeps
// its dedicated UL+WP builder.
export const DIVISION_MATRIX = {
  mens_physique: {
    label: 'V-Taper',
    3: [
      { name: 'Upper A (Width)', muscles: ['back', 'side_delts', 'chest', 'triceps'] },
      { name: 'Lower + Abs', muscles: ['quads', 'hamstrings', 'glutes', 'calves', 'abs'] },
      { name: 'Upper B (Detail)', muscles: ['back', 'rear_delts', 'side_delts', 'biceps', 'chest'] },
    ],
    4: [
      { name: 'Back + Delts (Width)', muscles: ['back', 'side_delts', 'rear_delts'] },
      { name: 'Chest + Arms', muscles: ['chest', 'triceps', 'biceps'] },
      { name: 'Lower + Abs', muscles: ['quads', 'hamstrings', 'glutes', 'calves', 'abs'] },
      { name: 'Back + Delts (Thickness)', muscles: ['back', 'rear_delts', 'side_delts', 'traps'] },
    ],
    5: [
      { name: 'Pull (Width)', muscles: ['back', 'rear_delts', 'biceps'] },
      { name: 'Push (Delts + Chest)', muscles: ['side_delts', 'chest', 'front_delts', 'triceps'] },
      { name: 'Legs + Abs', muscles: ['quads', 'hamstrings', 'glutes', 'calves', 'abs'] },
      { name: 'Pull (Thickness)', muscles: ['back', 'traps', 'biceps'] },
      { name: 'Delts + Arms', muscles: ['side_delts', 'rear_delts', 'triceps', 'biceps'] },
    ],
    6: [
      { name: 'Pull (Width)', muscles: ['back', 'rear_delts', 'biceps'] },
      { name: 'Push (Chest)', muscles: ['chest', 'front_delts', 'side_delts', 'triceps'] },
      { name: 'Legs', muscles: ['quads', 'hamstrings', 'glutes', 'calves'] },
      { name: 'Pull (Thickness)', muscles: ['back', 'side_delts', 'biceps'] },
      { name: 'Push (Delts)', muscles: ['side_delts', 'chest', 'triceps'] },
      { name: 'Delts + Arms + Abs', muscles: ['side_delts', 'rear_delts', 'biceps', 'triceps', 'abs'] },
    ],
  },
  classic_physique: {
    label: 'X-Frame',
    3: [
      { name: 'Upper (Back + Delt)', muscles: ['back', 'side_delts', 'chest', 'triceps'] },
      { name: 'Lower (Sweep + Ham)', muscles: ['quads', 'hamstrings', 'glutes', 'calves', 'abs'] },
      { name: 'Upper (Chest + Arm)', muscles: ['chest', 'back', 'biceps', 'triceps', 'rear_delts'] },
    ],
    4: [
      { name: 'Back + Rear Delt', muscles: ['back', 'rear_delts', 'side_delts'] },
      { name: 'Legs (Sweep)', muscles: ['quads', 'hamstrings', 'glutes', 'calves'] },
      { name: 'Chest + Side Delt + Arms', muscles: ['chest', 'side_delts', 'biceps', 'triceps'] },
      { name: 'Back + Hams', muscles: ['back', 'hamstrings', 'abs'] },
    ],
    5: [
      { name: 'Pull', muscles: ['back', 'rear_delts', 'biceps'] },
      { name: 'Legs (Quad)', muscles: ['quads', 'calves', 'abs'] },
      { name: 'Push', muscles: ['chest', 'side_delts', 'triceps'] },
      { name: 'Pull', muscles: ['back', 'side_delts', 'biceps'] },
      { name: 'Legs (Ham + Glute)', muscles: ['hamstrings', 'glutes', 'quads', 'calves'] },
    ],
    6: [
      { name: 'Pull', muscles: ['back', 'rear_delts', 'biceps'] },
      { name: 'Push', muscles: ['chest', 'front_delts', 'triceps'] },
      { name: 'Legs', muscles: ['quads', 'hamstrings', 'glutes', 'calves'] },
      { name: 'Pull', muscles: ['back', 'side_delts', 'biceps'] },
      { name: 'Push', muscles: ['chest', 'side_delts', 'triceps'] },
      { name: 'Legs + Abs', muscles: ['quads', 'hamstrings', 'calves', 'abs'] },
    ],
  },
  bikini: {
    label: 'Glute Focus',
    3: [
      { name: 'Glute Focus A', muscles: ['glutes', 'hamstrings', 'side_delts'] },
      { name: 'Upper (Delts + Width)', muscles: ['side_delts', 'back', 'rear_delts', 'abs'] },
      { name: 'Glute Focus B', muscles: ['glutes', 'hamstrings', 'quads', 'abs'] },
    ],
    4: [
      { name: 'Lower (Glute + Ham)', muscles: ['glutes', 'hamstrings', 'abs'] },
      { name: 'Upper (Delts + Back)', muscles: ['side_delts', 'back', 'rear_delts', 'abs'] },
      { name: 'Lower (Glute + Quad)', muscles: ['glutes', 'quads', 'hamstrings'] },
      { name: 'Glutes (Pump) + Delts', muscles: ['glutes', 'side_delts', 'back'] },
    ],
    5: [
      { name: 'Glutes (Max)', muscles: ['glutes', 'hamstrings'] },
      { name: 'Delts + Back + Abs', muscles: ['side_delts', 'back', 'rear_delts', 'abs'] },
      { name: 'Glutes (Medius + Ham)', muscles: ['glutes', 'hamstrings'] },
      { name: 'Lower (Quad + Glute)', muscles: ['quads', 'glutes', 'calves'] },
      { name: 'Delts + Arms', muscles: ['side_delts', 'rear_delts', 'biceps', 'triceps'] },
    ],
    6: [
      { name: 'Glutes', muscles: ['glutes', 'hamstrings'] },
      { name: 'Upper (Delt + Back)', muscles: ['side_delts', 'back', 'rear_delts'] },
      { name: 'Glutes', muscles: ['glutes', 'hamstrings'] },
      { name: 'Lower (Quad)', muscles: ['quads', 'glutes', 'calves'] },
      { name: 'Upper (Delt + Arm)', muscles: ['side_delts', 'biceps', 'triceps'] },
      { name: 'Glutes Pump + Abs', muscles: ['glutes', 'abs'] },
    ],
  },
  wellness: {
    label: 'Lower Focus',
    3: [
      { name: 'Lower A (Glute + Ham)', muscles: ['glutes', 'hamstrings'] },
      { name: 'Lower B (Quad + Adductor)', muscles: ['quads', 'adductors', 'glutes', 'calves'] },
      { name: 'Upper (Delts + Back + Abs)', muscles: ['side_delts', 'back', 'abs'] },
    ],
    4: [
      { name: 'Glute + Ham + Delts', muscles: ['glutes', 'hamstrings', 'side_delts'] },
      { name: 'Quad Sweep + Adductor', muscles: ['quads', 'adductors', 'calves'] },
      { name: 'Glute (Medius) + Upper', muscles: ['side_delts', 'glutes', 'back'] },
      { name: 'Lower Full', muscles: ['quads', 'hamstrings', 'glutes', 'calves'] },
    ],
    5: [
      { name: 'Glutes', muscles: ['glutes', 'hamstrings'] },
      { name: 'Quads (Sweep)', muscles: ['quads', 'adductors', 'calves'] },
      { name: 'Glute + Ham', muscles: ['glutes', 'hamstrings'] },
      { name: 'Upper (Delts + Back)', muscles: ['side_delts', 'back', 'abs'] },
      { name: 'Lower Full + Arms', muscles: ['quads', 'glutes', 'calves', 'biceps', 'triceps'] },
    ],
    6: [
      { name: 'Glutes', muscles: ['glutes', 'hamstrings'] },
      { name: 'Quads', muscles: ['quads', 'adductors', 'calves'] },
      { name: 'Ham + Glute', muscles: ['hamstrings', 'glutes'] },
      { name: 'Upper (Delts + Back)', muscles: ['side_delts', 'back', 'abs'] },
      { name: 'Lower (Sweep)', muscles: ['quads', 'glutes', 'calves'] },
      { name: 'Glute Pump + Arms + Abs', muscles: ['glutes', 'biceps', 'triceps', 'abs'] },
    ],
  },
  figure: {
    label: 'X-Frame',
    3: [
      { name: 'Upper (Delt + Back Width)', muscles: ['side_delts', 'back', 'rear_delts', 'triceps'] },
      { name: 'Lower (Glute + Ham + Quad)', muscles: ['glutes', 'hamstrings', 'quads', 'calves'] },
      { name: 'Upper (Delt + Arm + Abs)', muscles: ['side_delts', 'back', 'triceps', 'abs'] },
    ],
    4: [
      { name: 'Back + Rear Delt', muscles: ['back', 'rear_delts', 'side_delts'] },
      { name: 'Lower', muscles: ['glutes', 'hamstrings', 'quads', 'calves'] },
      { name: 'Shoulders + Arms', muscles: ['side_delts', 'rear_delts', 'triceps', 'biceps'] },
      { name: 'Back Width + Abs', muscles: ['back', 'side_delts', 'abs'] },
    ],
    5: [
      { name: 'Pull', muscles: ['back', 'rear_delts', 'biceps'] },
      { name: 'Legs', muscles: ['glutes', 'hamstrings', 'quads', 'calves'] },
      { name: 'Delts + Arms', muscles: ['side_delts', 'rear_delts', 'triceps'] },
      { name: 'Pull', muscles: ['back', 'side_delts', 'biceps'] },
      { name: 'Lower (Glute-Ham)', muscles: ['glutes', 'hamstrings', 'calves'] },
    ],
    6: [
      { name: 'Pull', muscles: ['back', 'rear_delts', 'biceps'] },
      { name: 'Push (Delt)', muscles: ['side_delts', 'chest', 'triceps'] },
      { name: 'Legs', muscles: ['glutes', 'hamstrings', 'quads', 'calves'] },
      { name: 'Pull', muscles: ['back', 'side_delts', 'biceps'] },
      { name: 'Delts + Arms', muscles: ['side_delts', 'rear_delts', 'triceps'] },
      { name: 'Lower', muscles: ['glutes', 'hamstrings', 'calves', 'abs'] },
    ],
  },
  womens_physique: {
    label: 'V-Taper',
    3: [
      { name: 'Upper (Back + Delt)', muscles: ['back', 'side_delts', 'chest', 'triceps'] },
      { name: 'Lower (Quad + Ham + Glute)', muscles: ['quads', 'hamstrings', 'glutes', 'calves'] },
      { name: 'Upper (Chest + Arm + Abs)', muscles: ['chest', 'back', 'biceps', 'triceps', 'abs'] },
    ],
    4: [
      { name: 'Upper (Width)', muscles: ['back', 'side_delts', 'rear_delts', 'triceps'] },
      { name: 'Lower', muscles: ['quads', 'hamstrings', 'glutes', 'calves'] },
      { name: 'Upper (Thickness)', muscles: ['back', 'chest', 'side_delts', 'biceps'] },
      { name: 'Lower', muscles: ['quads', 'hamstrings', 'glutes', 'abs'] },
    ],
    5: [
      { name: 'Pull', muscles: ['back', 'rear_delts', 'biceps'] },
      { name: 'Push', muscles: ['chest', 'side_delts', 'triceps'] },
      { name: 'Legs', muscles: ['quads', 'hamstrings', 'glutes', 'calves'] },
      { name: 'Upper', muscles: ['back', 'side_delts', 'biceps'] },
      { name: 'Lower', muscles: ['hamstrings', 'glutes', 'quads', 'abs'] },
    ],
    6: [
      { name: 'Pull', muscles: ['back', 'rear_delts', 'biceps'] },
      { name: 'Push', muscles: ['side_delts', 'chest', 'triceps'] },
      { name: 'Legs', muscles: ['quads', 'hamstrings', 'glutes', 'calves'] },
      { name: 'Pull', muscles: ['back', 'side_delts', 'biceps'] },
      { name: 'Push', muscles: ['chest', 'side_delts', 'triceps'] },
      { name: 'Legs', muscles: ['quads', 'hamstrings', 'glutes', 'abs'] },
    ],
  },
};

// Build a division's sessions from a matrix cell. Frequency per muscle is how
// many sessions list it; muscle order within a session is the division's
// priority order (set in the matrix), so session 1's first muscle is the lead.
const UPPER_MUSCLES = new Set(['chest', 'back', 'side_delts', 'rear_delts', 'front_delts', 'biceps', 'triceps', 'traps']);

// Movement pattern per muscle. Augmentation (structural coverage + weak-point
// boosts) must respect this, otherwise a chest (push) weak point lands on a
// pull day and back (pull) on a push day, the "Pull (Width) full of bench
// press" bug. side_delts is neutral: side raises belong on push OR pull/delt
// days, so they fit any upper session.
export const MUSCLE_PATTERN = {
  chest: 'push', front_delts: 'push', triceps: 'push',
  back: 'pull', rear_delts: 'pull', biceps: 'pull', traps: 'pull',
  side_delts: 'delts',
  quads: 'legs', hamstrings: 'legs', glutes: 'legs', calves: 'legs', adductors: 'legs',
  abs: 'core',
};
function patternOf(m) { return MUSCLE_PATTERN[m] ?? 'other'; }

// Anchor muscles define a day's movement pattern for augmentation. A weak-point
// or structural muscle is only added to a day that already trains an anchor of
// the same pattern, so a back boost never lands on a legs+arms day that merely
// does biceps curls (which also blew the time budget), and chest never lands on
// a pull day. Isolation muscles (biceps, triceps, rear/side delts, traps,
// calves, abs) are not anchors: they ride on a day defined by its big movers.
const PATTERN_ANCHORS = {
  push: ['chest', 'front_delts'],
  pull: ['back'],
  legs: ['quads', 'hamstrings', 'glutes'],
};

// Can muscle m be added to a session that currently trains `sessionMuscles`?
function patternFits(m, sessionMuscles) {
  const p = patternOf(m);
  // Side delts are neutral: a side raise fits any day that already trains an
  // upper muscle (push, pull or another delt).
  if (p === 'delts') {
    return sessionMuscles.some((x) => ['push', 'pull', 'delts'].includes(patternOf(x)));
  }
  // Abs only ride onto a day that already trains abs.
  if (p === 'core') {
    return sessionMuscles.some((x) => patternOf(x) === 'core');
  }
  const anchors = PATTERN_ANCHORS[p];
  if (!anchors) return false;
  return sessionMuscles.some((x) => anchors.includes(x));
}

function buildFromMatrix(sessionsIn, weeklyTargets, landmarks, equipment, goal, experience, nutritionPhase) {
  // Clone so the structural-coverage net never mutates the shared matrix.
  const sessions = sessionsIn.map(s => ({ name: s.name, muscles: [...s.muscles] }));

  // Structural coverage: a division's matrix may legitimately omit a structural
  // mover (e.g. Bikini does no dedicated chest), but the spec forbids any
  // structural muscle reading zero. Append any missing structural muscle, at
  // the END (lowest priority = maintenance), to a session of the same region.
  for (const m of STRUCTURAL_MUSCLES) {
    if (sessions.some(s => s.muscles.includes(m))) continue;
    const wantUpper = UPPER_MUSCLES.has(m);
    // Prefer a session that trains the same movement pattern, so a missing
    // structural mover never lands on the opposite-pattern day. Fall back to
    // the same upper/lower region, then to the first session.
    const target = sessions.find(s => patternFits(m, s.muscles))
                ?? sessions.find(s => s.muscles.some(x => UPPER_MUSCLES.has(x) === wantUpper))
                ?? sessions[0];
    target.muscles.push(m);
  }

  // Weak-point session augmentation (spec section B, the "add a session" option
  // composed with the division split). A weak-point muscle's boosted weekly
  // target needs enough sessions to deliver at <= ~9 sets each. Add it to more
  // sessions until it has enough, but ONLY to sessions that train the SAME
  // movement pattern (chest into a push day, back into a pull day, a leg muscle
  // into a leg day) so a weak point never contaminates an opposite-pattern day.
  // Capped at 3 sessions so multiple simultaneous weak points cannot stack a
  // session past its time budget.
  const augCount = sessions.map(() => 0);  // weak muscles added per session
  for (const m of _weakPointKeys) {
    const wTarget = weeklyTargets[m] ?? 0;
    if (wTarget <= 0) continue;
    const desired = Math.min(3, sessions.length, Math.max(2, Math.ceil(wTarget / 9)));
    let have = sessions.filter(s => s.muscles.includes(m)).length;
    if (have >= desired) continue;
    // Same-pattern only. If there are not enough same-pattern days to reach the
    // desired spread, the muscle simply trains in fewer sessions at higher
    // per-session volume (capped at the 12-set session cap) rather than landing
    // on an opposite-pattern day. One augmented muscle per session so multiple
    // simultaneous weak points never stack and blow the time budget.
    for (let i = 0; i < sessions.length; i++) {
      if (have >= desired) break;
      const s = sessions[i];
      if (s.muscles.includes(m) || augCount[i] >= 1) continue;
      if (!patternFits(m, s.muscles)) continue;
      s.muscles.unshift(m);  // lead the session: weak point gets first pick
      augCount[i] += 1;
      have += 1;
    }
  }

  const sessionsPerMuscle = {};
  for (const s of sessions) {
    for (const m of s.muscles) sessionsPerMuscle[m] = (sessionsPerMuscle[m] ?? 0) + 1;
  }
  const usedByMuscle = {};
  for (const s of sessions) {
    for (const m of s.muscles) if (!usedByMuscle[m]) usedByMuscle[m] = new Set();
  }
  return sessions.map((s, i) => buildSession(
    s.name, s.muscles, sessionsPerMuscle, weeklyTargets, equipment, goal, i,
    usedByMuscle, experience, nutritionPhase, landmarks,
  ));
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

function deduplicateExercises(exercises) {
  const seen = new Set();
  return exercises.filter(e => {
    if (seen.has(e.exerciseName)) return false;
    seen.add(e.exerciseName);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Weekly volume summary
// ---------------------------------------------------------------------------

function buildVolumeSummary(workouts, weeklyTargets, weakPointKeys) {
  const internalToExternal = {
    chest: 'chest', back: 'back',
    side_delts: 'shoulders', rear_delts: 'shoulders', front_delts: 'shoulders',
    biceps: 'biceps', triceps: 'triceps',
    quads: 'quads', hamstrings: 'hamstrings', glutes: 'glutes',
    calves: 'calves', abs: 'abs', traps: 'traps', forearms: null,
  };

  // Direct sets (the working sets of an exercise count fully toward its primary
  // muscle) and indirect sets (each synergist gets a fractional set, spec phase
  // 3e / RP convention of 0.5 set per secondary muscle).
  const actualSets = {};
  const indirect = {};
  for (const workout of workouts) {
    for (const ex of workout.exercises) {
      for (const [muscle, pool] of Object.entries(_effectivePool)) {
        const entry = pool.find(p => p.n === ex.exerciseName);
        if (!entry) continue;
        actualSets[muscle] = (actualSets[muscle] ?? 0) + ex.sets;
        for (const sec of entry.secondary ?? []) {
          indirect[sec] = (indirect[sec] ?? 0) + ex.sets * INDIRECT_SET_FRACTION;
        }
      }
    }
  }

  const externalKeys = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'abs', 'traps'];
  const summary = {};
  for (const key of externalKeys) summary[key] = { plannedSets: 0, indirectSets: 0, isWeakPoint: false };

  for (const [internal, ext] of Object.entries(internalToExternal)) {
    if (!ext) continue;
    summary[ext].plannedSets += actualSets[internal] ?? 0;
    summary[ext].indirectSets += indirect[internal] ?? 0;
    if (weakPointKeys.includes(internal)) {
      summary[ext].isWeakPoint = true;
    }
  }
  // Round indirect to halves for reporting (plannedSets stays the exact direct
  // count, so the existing contract is untouched).
  for (const key of externalKeys) {
    summary[key].indirectSets = Math.round(summary[key].indirectSets * 2) / 2;
  }

  // Per-head delt breakdown, nested inside the shoulders bucket (additive, does
  // not change the aggregate). Lets the UI report a side-delt or rear-delt
  // weak-point on the head that actually moved, instead of the aggregate that
  // can fall when one head rises and another is reallocated down.
  summary.shoulders.heads = {
    side_delts: actualSets.side_delts ?? 0,
    rear_delts: actualSets.rear_delts ?? 0,
    front_delts: actualSets.front_delts ?? 0,
  };

  return summary;
}

// ---------------------------------------------------------------------------
// Personalisation summary
// ---------------------------------------------------------------------------

const EXPERIENCE_LABELS = {
  beginner:     'Beginner (under 18 months of consistent training)',
  intermediate: 'Intermediate (18 months – 3 years)',
  advanced:     'Advanced (3–5 years)',
  competitive:  'Competitive (5+ years, physique or performance focus)',
};

const EQUIPMENT_LABELS = {
  full_gym:        'Full commercial gym',
  machines_cables: 'Machines & cables only',
  dumbbells_only:  'Dumbbells only',
  barbell_plates:  'Barbell & plates',
  home_gym:        'Home gym setup',
  bodyweight:      'Bodyweight only',
};

const RECOVERY_LABELS = {
  poor:    'Poor (limited sleep, high life stress)',
  average: 'Average',
  good:    'Good (8+ h sleep, low stress)',
};

const NUTRITION_PHASE_LABELS = {
  lean_gain:      'Build muscle slowly',
  build:          'Build muscle quickly',
  maintain:       'Maintain weight',
  recomp:         'Hold muscle, lose fat',
  mild_cut:       'Lose weight steadily',
  aggressive_cut: 'Lose weight fast',
  contest_prep:   'Contest preparation',
};

function buildPersonalisationSummary(inputs, effectiveDays, splitType, weakPointUILabels) {
  const { experience, trainingAge, daysPerWeek, sessionLengthMinutes,
          equipment, goal, recoveryRating, nutritionPhase } = inputs;
  return {
    experience:     EXPERIENCE_LABELS[experience] ?? experience,
    trainingAge:    trainingAge ? `Training age: ${trainingAge}` : 'Training age: not specified',
    daysPerWeek:    effectiveDays !== daysPerWeek
      ? `Requested ${daysPerWeek} days, adjusted to ${effectiveDays} days based on experience`
      : `${effectiveDays} training days per week`,
    sessionLength:  `~${sessionLengthMinutes} min sessions`,
    equipment:      EQUIPMENT_LABELS[equipment] ?? equipment,
    goal:           GOAL_LABELS[goal] ?? goal,
    split:          SPLIT_LABELS[splitType] ?? splitType,
    weakPoints:     weakPointUILabels.length
      ? `Weak points targeted: ${weakPointUILabels.join(', ')}`
      : 'No specific weak points flagged',
    recovery:       RECOVERY_LABELS[recoveryRating] ?? recoveryRating,
    nutritionPhase: nutritionPhase ? (NUTRITION_PHASE_LABELS[nutritionPhase] ?? nutritionPhase) : 'Not specified',
  };
}

// ---------------------------------------------------------------------------
// whyThis, jargon-free plain English
// ---------------------------------------------------------------------------

function buildWhyThis(inputs, splitType, effectiveDays, workouts, weakPointUILabels) {
  const { experience, goal, phase, recoveryRating, nutritionPhase, equipment } = inputs;
  const eqLabel = EQUIPMENT_LABELS[equipment] ?? equipment;
  // Same shadow as generatePlan, map post-merge phase to legacy goal IDs
  // so the goalMap below still keys narrative text correctly.
  const internalGoal = phase === 'weak_point'   ? 'weak_point_spec'
                     : phase === 'strength_size' ? 'strength_hypertrophy'
                     : goal;

  const result = {};

  // schedule
  const splitName = SPLIT_LABELS[splitType] ?? splitType;
  const scheduleMap = {
    full_body:
      `${splitName} was chosen for your ${effectiveDays} days at ${experience} level. Hitting every muscle group each session means you practise each movement pattern ${effectiveDays} times a week. Frequent repetition is the primary driver of early and intermediate progress, and this structure uses your available days as efficiently as possible.`,
    upper_lower:
      `${splitName} was chosen for your ${effectiveDays} days at ${experience} level. Training each muscle group twice a week is the most well-supported frequency for consistent progress: each muscle gets enough practice to grow, enough sets per session to make training worthwhile, and 48–72 hours between sessions to recover.`,
    ppl:
      `${splitName} was chosen for your ${effectiveDays} days at ${experience} level. Grouping muscles by movement pattern means each group has fully recovered before it trains again. Push muscles rest on Pull and Legs days, so there is no leftover chest fatigue when you are pressing for shoulders.`,
    ppl_ab:
      `${splitName} was chosen for your ${effectiveDays} days at ${experience} level. Two complete Push / Pull / Legs rotations per week give each muscle group twice-weekly training. Rotating A and B exercise choices across the two cycles keeps training varied enough to sustain progress without overloading any one muscle pattern.`,
    upper_lower_wp:
      `Upper / Lower on 4 days trains every muscle group twice a week. The fifth session is reserved entirely for ${weakPointUILabels.length ? weakPointUILabels.join(' and ') : 'your selected weak points'}. The extra sets are timed so they do not compromise recovery on your main training days.`,
  };
  result.schedule = scheduleMap[splitType] ?? `${splitName} was selected to match your ${effectiveDays} days, ${experience} level, and goal.`;

  // goal explanation, uses internalGoal so strength_size / weak_point
  // phases get their narrative (kept under the legacy keys so this map
  // doesn't grow).
  const goalMap = {
    general:               `Even, well-rounded muscle growth. Sets are spread across all major muscle groups so nothing gets systematically undertrained, which is the most common cause of stalled progress.`,
    general_hypertrophy:   `Even, well-rounded muscle growth. Sets are spread across all major muscle groups so nothing gets systematically undertrained, which is the most common cause of stalled progress.`,
    weak_point_spec:        `This block gives${weakPointUILabels.length ? ' ' + weakPointUILabels.join(' and ') : ' your selected muscles'} more sets than a balanced plan would assign, while keeping everything else at enough to hold current size. Consistent targeted work over several weeks is how muscles behind the rest close the gap.`,
    strength_hypertrophy:  `Muscle growth is still the goal, but your main compound lifts are loaded heavier and in a lower rep range. Building strength lets you use more weight over time, and more weight applied correctly means more muscle.`,
    mens_physique:         `Upper-body width and a sharp V-shape. Shoulder and lat development drive the look. More sets are placed on side delts, back width, and rear delts than a general plan would assign.`,
    classic_physique:      `Proportional symmetry and balanced mass. Calves, shoulders, and waist definition are all judged. Sets are spread to build a complete physique with particular attention to the landmark muscles of the division.`,
    bodybuilding:          `Maximum development across every muscle group. Sets are pushed toward the upper range of what your body can recover from, aiming for full, complete development with nothing left undertrained.`,
    bikini:                `Glutes and hamstrings are the primary judging criterion for this division. Lower-body sets are elevated well above a general plan, while upper-body volume stays proportional and lean.`,
    wellness:              `Like bikini but with heavier lower-body emphasis overall. Quads as well as glutes and hamstrings are prioritised. Upper body is maintained with moderate volume to stay proportional.`,
    figure:                `Balanced upper and lower development with particular attention to shoulder width and back detail. A full, muscular look with symmetry across the entire physique.`,
    womens_physique:       `Greater overall muscle development than figure, with conditioning a key criterion. Sets are pushed higher across the board, with attention to the detail muscles that show best on stage.`,
    womens_bodybuilding:   `Maximum female muscular development and conditioning, the most muscular division. Sets are pushed toward the upper range of what your body can recover from, with full development across every group and particular attention to back, shoulders and legs.`,
  };
  result.goal = goalMap[internalGoal] ?? goalMap[goal] ?? `Goal: ${GOAL_LABELS[goal] ?? goal}.`;

  // experience
  const expMap = {
    beginner:     `When you're starting out, your body responds well to almost any consistent training. Volume is kept lower here so you can build good technique and work capacity before adding more sets.`,
    intermediate: `At this stage, your muscles need more total weekly sets to keep improving than they did early on. This plan does enough to keep you progressing without piling up more fatigue than you can recover from between sessions.`,
    advanced:     `Progress comes more slowly now and needs more specific programming. Set counts are higher here because your body has adapted to handle more work, and lower volumes simply would not be enough to keep you moving forward.`,
    competitive:  `Your muscles have adapted to high training volumes and need a lot of weekly work to keep changing. This plan uses the highest set counts, balanced carefully against recovery so you can sustain quality across the full block.`,
  };
  result.experience = expMap[experience] ?? `Experience level: ${experience}.`;

  // progression (always)
  const weeks = (experience === 'advanced' || experience === 'competitive') ? 6 : 5;
  result.progression = `The plan spans ${weeks} weeks. You start at the sets shown here and add roughly one set per exercise per week across the first ${weeks - 1} weeks. The final week drops to about half the volume. This is not a lost week. Your muscles use the easier week to fully repair and come back stronger before the next block.`;

  // equipment
  result.equipment = `Exercises were selected for ${eqLabel}. Every lift in the plan is available and safe to perform with the equipment you specified, with no substitutions needed.`;

  // recovery (conditional)
  if (recoveryRating === 'poor') {
    result.recovery = `You flagged poor recovery (limited sleep or high life stress). The plan uses less volume than it would at average recovery, and sessions are kept to ${effectiveDays} days. Sleep and stress management will do more for your progress right now than adding sets.`;
  } else if (recoveryRating === 'good') {
    result.recovery = `Good recovery allows slightly more volume than average, which is reflected in this plan. You are sleeping well and managing stress, so take advantage of that by keeping nutrition consistent throughout the block.`;
  }

  // nutrition (conditional)
  const nutPhase = nutritionPhase;
  if (nutPhase && nutPhase !== 'maintain') {
    const phaseLabel = NUTRITION_PHASE_LABELS[nutPhase] ?? nutPhase;
    const nutMap = {
      lean_gain:      `${phaseLabel}: you have extra calories to work with. Volume is slightly higher because extra food speeds up recovery and lets you get more out of your training. Keep the intensity up and you'll make the most of it.`,
      build:          `${phaseLabel}: eating more supports higher training volumes. This plan uses more weekly sets than it would at maintenance, because your body can recover from more. Keep protein high to direct those extra calories toward muscle rather than fat.`,
      mild_cut:       `${phaseLabel}: eating less slows recovery slightly. Volume is modest and you should stop a rep or two further from failure than usual. This preserves muscle and keeps recovery manageable while in a deficit.`,
      aggressive_cut: `${phaseLabel}: a significant calorie cut reduces how much your body can recover from. Volume is reduced. Keep protein at or above 2 g per kg of bodyweight and focus on your main compound lifts to protect muscle.`,
      contest_prep:   `Contest prep: your recovery is severely limited. Volume is at the lower end and caution is warranted. Prioritise sleep, protein intake, and managing life stress outside the gym.`,
      recomp:         `Hold muscle, lose fat: training volume is kept at a level your body can handle while eating at a slight deficit. The goal is doing enough to hold on to your muscle while your nutrition gradually shifts your body composition.`,
    };
    result.nutrition = nutMap[nutPhase] ?? `${phaseLabel} phase influences how much volume the plan uses.`;
  }

  // weakPoints (conditional)
  if (weakPointUILabels.length > 0) {
    result.weakPoints = `${weakPointUILabels.join(' and ')} ${weakPointUILabels.length === 1 ? 'receives' : 'receive'} more weekly sets than the rest of the plan. Consistently giving extra attention to an area that's behind, over several weeks, while the rest of the programme stays balanced, is the most reliable way to close the gap.`;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Warnings
// ---------------------------------------------------------------------------

function buildWarnings(inputs, effectiveDays, weakPointUILabels) {
  const { experience, daysPerWeek, recoveryRating, nutritionPhase } = inputs;
  const warnings = [];

  if (experience === 'beginner' && daysPerWeek > 4) {
    warnings.push(
      `A ${daysPerWeek}-day programme exceeds typical beginner recovery capacity. Your plan has been reduced to ${effectiveDays} days to protect recovery and reinforce movement quality before adding frequency.`,
    );
  }
  if (recoveryRating === 'poor' && effectiveDays >= 5) {
    warnings.push(
      'Poor recovery combined with 5 or more training days significantly increases injury and burnout risk. Consider reducing to 4 days per week and prioritising 7–9 hours of sleep.',
    );
  }
  if ((nutritionPhase === 'aggressive_cut' || nutritionPhase === 'contest_prep') && effectiveDays >= 5) {
    warnings.push(
      'Training 5 or more days on a significant calorie cut is hard on the body. Volume has been reduced, but consider dropping to 4 days to match your lower recovery capacity.',
    );
  }
  if (experience === 'competitive' && recoveryRating === 'poor') {
    warnings.push(
      'Competitive-level training demands excellent recovery. With poor recovery flagged, you risk building up fatigue that masks progress. Address sleep and life stress before adding more training.',
    );
  }
  if (weakPointUILabels.length === 3) {
    warnings.push(
      'Three weak points are targeted (the maximum supported). Any additional muscles beyond three will not receive extra sets.',
    );
  }

  return warnings;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Superset assignment
// ---------------------------------------------------------------------------
//
// Pairs adjacent accessory exercises into supersets when it's actually useful:
//   - Goal is hypertrophy/physique-family (volume + pump > max load)
//   - Experience is intermediate+ (beginners need to lock in form on straight sets)
//   - Both exercises are in the accessory / isolation portion (not the heavy
//     compounds, those get full rest periods to express max load)
//   - The two muscle groups are antagonist or non-competing (no fatigue
//     cross-talk that would tank the second exercise's working load)
//
// Mutates entries in place by adding `supersetGroupId` to paired pairs.

// Muscle pairs that superset cleanly. Symmetric, pair-lookup checks both
// directions. Excludes same-muscle pairs and competing pairs like
// chest+triceps or back+biceps (shared fatigue from compounds).
const SUPERSET_COMPATIBLE = {
  // Push ↔ Pull (antagonist)
  chest:       ['back', 'biceps', 'rear_delts', 'abs', 'calves'],
  back:        ['chest', 'triceps', 'side_delts', 'front_delts', 'abs', 'calves'],
  // Arms, bi/tri antagonist + delt + small isolations
  biceps:      ['triceps', 'chest', 'side_delts', 'rear_delts', 'abs', 'calves'],
  triceps:     ['biceps', 'back', 'side_delts', 'rear_delts', 'abs', 'calves'],
  // Delts, different heads antagonise, plus arms / small isolations
  front_delts: ['rear_delts', 'back', 'biceps', 'abs', 'calves'],
  side_delts:  ['rear_delts', 'biceps', 'triceps', 'back', 'abs', 'calves'],
  rear_delts:  ['front_delts', 'side_delts', 'chest', 'biceps', 'triceps', 'abs', 'calves'],
  // Legs, antagonist quads/hams; glutes already overlap with both compounds
  quads:       ['hamstrings', 'calves', 'abs'],
  hamstrings:  ['quads', 'calves', 'abs'],
  glutes:      ['calves', 'abs'],
  // Small isolations pair with almost anything that isn't themselves
  calves:      ['abs', 'biceps', 'triceps', 'side_delts', 'rear_delts', 'chest', 'back', 'quads', 'hamstrings', 'glutes'],
  abs:         ['calves', 'biceps', 'triceps', 'side_delts', 'rear_delts', 'chest', 'back', 'quads', 'hamstrings', 'glutes'],
};

function canSuperset(muscleA, muscleB) {
  if (!muscleA || !muscleB || muscleA === muscleB) return false;
  const compat = SUPERSET_COMPATIBLE[muscleA];
  return Array.isArray(compat) && compat.includes(muscleB);
}

// Goal families that benefit most from supersets (volume + pump emphasis).
// Keyed off `internalGoal` (legacy IDs), the strength_size phase deliberately
// stays OUT of this set so compound work isn't rushed under fatigue.
const SUPERSET_GOAL_ALLOWLIST = new Set([
  'general', 'general_hypertrophy', 'weak_point_spec',
  'mens_physique', 'classic_physique', 'bodybuilding',
  'bikini', 'wellness', 'figure', 'womens_physique',
]);

function assignSupersets(exercises, { goal, experience, sessionLengthMinutes }) {
  if (!Array.isArray(exercises) || exercises.length < 4) return;
  // Gate: skip if beginner (form takes priority over time efficiency)
  if (experience === 'beginner') return;
  // Gate: skip if goal isn't volume/pump-focused AND the user has a generous
  // session window. Short sessions (≤ 50 min) get supersets regardless of
  // goal because the time saving outweighs the strength trade.
  const goalAllows = SUPERSET_GOAL_ALLOWLIST.has(goal);
  const timeConstrained = (sessionLengthMinutes ?? 60) <= 50;
  if (!goalAllows && !timeConstrained) return;

  // Find the start of the accessory portion: skip leading exercises that look
  // like heavy compounds (long rest period > 150s indicates main lift).
  let accessoryStart = 0;
  while (
    accessoryStart < exercises.length &&
    (exercises[accessoryStart].restSec ?? 0) >= 150
  ) accessoryStart++;
  // Always leave at least the first exercise alone, even if rest is short.
  if (accessoryStart === 0) accessoryStart = 1;

  // Walk adjacent pairs from the accessory portion. Cap pairs per workout at 2
  // so we don't superset every accessory, that's exhausting and the engine
  // shouldn't make every session feel like circuit training.
  const MAX_PAIRS_PER_WORKOUT = 2;
  let pairsAssigned = 0;
  let quadsHamsPairAlreadyUsed = false;
  let i = accessoryStart;
  while (i < exercises.length - 1 && pairsAssigned < MAX_PAIRS_PER_WORKOUT) {
    const a = exercises[i];
    const b = exercises[i + 1];
    // Skip if either is already paired (defensive, shouldn't happen on first
    // assignment) or either is a heavy compound (long rest period).
    if (a.supersetGroupId != null || b.supersetGroupId != null
        || (a.restSec ?? 0) >= 150 || (b.restSec ?? 0) >= 150) {
      i++;
      continue;
    }
    if (canSuperset(a._muscle, b._muscle)) {
      const isQuadsHamsPair =
        (a._muscle === 'quads' && b._muscle === 'hamstrings') ||
        (a._muscle === 'hamstrings' && b._muscle === 'quads');
      if (isQuadsHamsPair && quadsHamsPairAlreadyUsed) {
        i++;
        continue;
      }
      const groupId = `sg_${i}_${pairsAssigned}`;
      a.supersetGroupId = groupId;
      b.supersetGroupId = groupId;
      if (isQuadsHamsPair) quadsHamsPairAlreadyUsed = true;
      pairsAssigned++;
      i += 2; // skip past the pair so we don't try to chain
    } else {
      i++;
    }
  }
}

export function generatePlan(inputs) {
  // Point selection at a library-generated pool for the duration of this
  // run when the caller supplies the library, then always restore POOL so
  // the module stays stateless between runs (try/finally guards a throw).
  // No library (every existing unit test) means _effectivePool stays POOL.
  const prevPool = _effectivePool;
  const prevWeakPoints = _weakPointKeys;
  _effectivePool = buildEffectivePool(inputs?.exerciseLibrary);
  try {
    return _generatePlanInner(inputs);
  } finally {
    _effectivePool = prevPool;
    _weakPointKeys = prevWeakPoints;
  }
}

function _generatePlanInner(inputs) {
  const {
    experience        = 'intermediate',
    trainingAge: _trainingAge = null,
    daysPerWeek       = 4,
    sessionLengthMinutes = 60,
    equipment         = 'full_gym',
    goal              = 'general',
    phase             = null,  // training phase, drives weak_point / strength_size overlays
    weakPoints        = [],
    recoveryRating    = 'average',
    nutritionPhase    = null,
    nutritionContext  = null,
    age               = null,
  } = inputs;

  // Cap weak points at 3 for determinism
  const safeWeakPointsUI = weakPoints.slice(0, 3);
  const weakPointKeys    = resolveWeakPointKeys(safeWeakPointsUI);
  _weakPointKeys = weakPointKeys;  // visible to buildSession / buildFromMatrix

  // Clamp to the supported 3-6 split range. selectSplit and DIVISION_MATRIX
  // only define splits for 3-6 days; an out-of-range value (1, 2 or 7, e.g.
  // from imported data) previously fell through selectSplit to a 6-day
  // ppl_ab, so a user who asked for 2 days got six sessions. The rebuild spec
  // assumes the caller clamps; do it here so the engine is safe on any input.
  const requestedDays = Number.isFinite(daysPerWeek) ? Math.round(daysPerWeek) : 4;
  const clampedDays = Math.min(6, Math.max(3, requestedDays));
  // Beginners capped at 4 days
  const effectiveDays = (experience === 'beginner' && clampedDays > 4) ? 4 : clampedDays;

  // Shadow goal for legacy engine code paths. Post-merge, weak_point and
  // strength_size live under `phase`, not `goal`. applyGoalOverlay already
  // handles both directly. But the internal builders (split selection,
  // rep range / rest selection in makeEx, plan name labels, etc.) still
  // key off the old goal IDs, and threading `phase` through every helper
  // would touch 30+ call sites. Mapping back to the legacy IDs here is
  // surgical and contained.
  const internalGoal = phase === 'weak_point'   ? 'weak_point_spec'
                     : phase === 'strength_size' ? 'strength_hypertrophy'
                     : goal;

  // Phase 2: the six specialised divisions select their split + session
  // composition from the division x day-count matrix (division-first). General,
  // Bodybuilding and Women's Bodybuilding keep the legacy day-count selector.
  // The weak_point phase ALSO uses the matrix (phase 4): it keeps the division
  // split and layers the weak-point boost + extra weak-muscle sessions on top,
  // instead of dropping to a generic upper/lower that loses division character.
  const matrixCell = DIVISION_MATRIX[goal]
    ? DIVISION_MATRIX[goal][effectiveDays]
    : null;
  const splitType = matrixCell
    ? DIVISION_MATRIX[goal].label
    : selectSplit(experience, effectiveDays, internalGoal);

  // Compute adjusted landmarks
  const landmarks = computeLandmarks(experience, recoveryRating, nutritionPhase, age);

  // Build base weekly targets (MEV as week-1 start)
  const weeklyTargets = {};
  for (const [m, lm] of Object.entries(landmarks)) {
    weeklyTargets[m] = lm.MEV;
  }

  // Apply goal overlay, then the spec's hard floors and caps (phase 1):
  // structural/judged muscles never zero, no muscle over MRV, delts capped at
  // a combined 26.
  const overlaidTargets = applyGoalOverlay(weeklyTargets, landmarks, goal, weakPointKeys, phase, effectiveDays);
  const adjustedTargets = enforceWeeklyFloorsAndCaps(overlaidTargets, goal, effectiveDays, weakPointKeys);

  // Build workouts
  let rawWorkouts;
  if (matrixCell) {
    rawWorkouts = buildFromMatrix(
      matrixCell, adjustedTargets, landmarks, equipment, internalGoal, experience, nutritionPhase,
    );
  } else {
  switch (splitType) {
    case 'full_body':
      rawWorkouts = buildFullBodyWorkouts(adjustedTargets, landmarks, equipment, internalGoal, experience, nutritionPhase, effectiveDays);
      break;
    case 'upper_lower':
      rawWorkouts = buildUpperLowerWorkouts(adjustedTargets, landmarks, equipment, internalGoal, experience, nutritionPhase);
      break;
    case 'upper_lower_wp':
      rawWorkouts = buildUpperLowerWPWorkouts(adjustedTargets, landmarks, equipment, internalGoal, weakPointKeys, experience, nutritionPhase);
      break;
    case 'lower_focus':
      rawWorkouts = buildWeightedUpperLower(adjustedTargets, landmarks, equipment, internalGoal, experience, nutritionPhase, effectiveDays, 3);
      break;
    case 'balanced_ul':
      rawWorkouts = buildWeightedUpperLower(adjustedTargets, landmarks, equipment, internalGoal, experience, nutritionPhase, effectiveDays, Math.floor(effectiveDays / 2));
      break;
    case 'ppl':
    case 'ppl_ab':
      rawWorkouts = buildPPLWorkouts(adjustedTargets, landmarks, equipment, internalGoal, experience, nutritionPhase, effectiveDays);
      break;
    default:
      rawWorkouts = buildFullBodyWorkouts(adjustedTargets, landmarks, equipment, internalGoal, experience, nutritionPhase, effectiveDays);
  }
  }

  // Strength notes (strength_size phase OR legacy goal)
  if (internalGoal === 'strength_hypertrophy') {
    for (const w of rawWorkouts) {
      for (const ex of w.exercises) {
        if (ex.restSec >= 150 && !ex.notes) {
          ex.notes = 'Add weight when you complete the top of the rep range for 2 consecutive sessions with good form.';
        }
      }
    }
  }

  // Hard safety net: clamp DELIVERED weekly volume to MRV. Per-session rounding
  // and the cap-flex can stack a muscle a set or two over its ceiling (e.g. the
  // delt complex at 6 days, a hamstring/quad weak-point). Trim the largest
  // entries (by selection slot _m) down, keeping 3 sets minimum and never the
  // last entry, so no muscle is delivered above its recoverable maximum.
  clampDeliveredToMRV(rawWorkouts, goal, landmarks);

  // Finalise: deduplicate, trim to time budget, assign supersets, stamp duration
  const workouts = rawWorkouts.map(w => {
    const deduped  = deduplicateExercises(w.exercises);
    const trimmed  = trimToTimeBudget(deduped, sessionLengthMinutes, equipment);
    // Assign superset pairings while we still have the internal _muscle tag
    // available. Function mutates entries in place adding `supersetGroupId`.
    assignSupersets(trimmed, { goal, experience, sessionLengthMinutes });
    // Strip internal-only tags (_m, _req used by trimming; _muscle by
    // assignSupersets). supersetGroupId is public and survives the strip.
    const clean = trimmed.map(({ _m, _req, _muscle, ...rest }) => rest);
    const dur = Math.ceil(estimateSessionMinutes(clean, equipment));
    const out = { name: w.name, exercises: clean, estimatedDurationMinutes: dur };
    // A session that the time-trim left meaningfully over the preferred length
    // is one the engine would not shorten further without dropping judged
    // volume (e.g. a full leg day for a mass division). Frame that as expected,
    // not a defect: tell the user it is normal for the volume and offer a split.
    if (sessionLengthMinutes && dur > sessionLengthMinutes + 15) {
      out.durationNote = `Around ${dur} min, longer than your ${sessionLengthMinutes} min target. That is normal for the volume this session needs; split it across two days if you prefer shorter sessions.`;
    }
    return out;
  });

  // Discard sessions that ended up with no exercises (shouldn't happen but guard it)
  const validWorkouts = workouts.filter(w => w.exercises.length > 0);

  const warnings              = buildWarnings({ ...inputs, weakPoints: safeWeakPointsUI }, effectiveDays, safeWeakPointsUI);
  // Weak-point already at its division ceiling: a selected weak point that the
  // division already trains near MRV can only move a set or two, so the
  // "specialisation" plan is near-identical. Tell the user rather than imply a
  // big change (e.g. Bikini glutes, already the #1 priority).
  if (phase === 'weak_point') {
    const maxTarget = Math.max(0, ...Object.values(adjustedTargets));
    for (const m of weakPointKeys) {
      const lm = landmarks[m];
      if (!lm) continue;
      const atMrv = (adjustedTargets[m] ?? 0) >= divisionMRV(m, goal, lm) - 1;
      const isTopPriority = (adjustedTargets[m] ?? 0) >= maxTarget - 1;
      if (atMrv || isTopPriority) {
        const label = Object.keys(WEAK_POINT_MAP).find(k => WEAK_POINT_MAP[k] === m) ?? m;
        warnings.push(`${label} is already one of this division's highest-priority muscles, so a specialisation block adds little. Consider picking a muscle that is currently lower priority.`);
      }
    }
  }
  const weeklyVolumeSummary   = buildVolumeSummary(validWorkouts, adjustedTargets, weakPointKeys);
  const personalisationSummary = buildPersonalisationSummary(
    { ...inputs, weakPoints: safeWeakPointsUI }, effectiveDays, splitType, safeWeakPointsUI
  );
  const whyThis               = buildWhyThis(
    { ...inputs, weakPoints: safeWeakPointsUI }, splitType, effectiveDays, validWorkouts, safeWeakPointsUI
  );

  // Plan-name label keyed off internalGoal so strength_size / weak_point
  // phases produce their own short labels (kept under the legacy keys).
  const goalShort = {
    general:              'Build Muscle',
    general_hypertrophy:  'Build Muscle',
    weak_point_spec:      'Specialisation',
    strength_hypertrophy: 'Strength + Size',
    mens_physique:        "Men's Physique",
    classic_physique:     'Classic Physique',
    bodybuilding:         'Bodybuilding',
    bikini:               'Bikini',
    wellness:             'Wellness',
    figure:               'Figure',
    womens_physique:      "Women's Physique",
    womens_bodybuilding:  "Women's Bodybuilding",
  }[internalGoal] ?? 'Training';

  const splitShort = {
    full_body:      'Full Body',
    upper_lower:    'Upper-Lower',
    ppl:            'PPL',
    ppl_ab:         'PPL A/B',
    upper_lower_wp: 'UL + WP',
    lower_focus:    'Lower Focus',
    balanced_ul:    'Upper-Lower',
  }[splitType] ?? splitType;

  // Include the nutrition phase in the plan name so a user who re-rolls
  // their plan from the Hub (changing only the phase from "Bulk" to
  // "Lean Gain", for example) gets visually distinct entries in Plans
  // instead of three rows all called "Build Muscle Upper-Lower 4×/week".
  const phaseShort = {
    cut:       'Cut',
    bulk:      'Bulk',
    lean_gain: 'Lean Gain',
    recomp:    'Recomp',
    maintain:  'Maintain',
    // coachingPhaseKey variants, planEngine receives either form
    mild_cut:  'Cut',
    mod_cut:   'Cut',
    agg_cut:   'Aggressive Cut',
    mild_bulk: 'Lean Gain',
    mod_bulk:  'Bulk',
    maint:     'Maintain',
  }[nutritionPhase] ?? null;
  const planName = phaseShort
    ? `${goalShort} · ${phaseShort} · ${splitShort} ${effectiveDays}×/week`
    : `${goalShort} ${splitShort} ${effectiveDays}×/week`;

  return {
    name:                    planName,
    goal,
    splitType,
    daysPerWeek:             effectiveDays,
    estimatedSessionMinutes: sessionLengthMinutes,
    workouts:                validWorkouts,
    weeklyVolumeSummary,
    personalisationSummary,
    whyThis,
    warnings,
    nutritionContext:        nutritionContext ?? null,
  };
}
