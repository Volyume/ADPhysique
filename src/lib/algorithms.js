// All 10 hypertrophy algorithms, pure functions, no side effects

import {
  SESSION_REASON_CODES,
  SESSION_SHOWN_CODES,
  CHECKIN_MUSCLE_MAP,
  getSessionAdjustmentMessage,
} from './whyThisTemplates';
// C12: DST-safe local calendar helpers. Both modules are import-free, so
// there is no cycle. Plateau time claims are made in LOCAL weeks and days,
// never by dividing milliseconds by a week constant.
import { localWeekStartMs } from './dayKey';
import { localDaysElapsed } from './mesocycle';

// Weekly set landmarks per muscle group. Single source of truth, imported by planEngine too.
//
// mv  = maintenance volume: minimum to prevent detraining between blocks
// mev = minimum effective volume: minimum to make meaningful progress
// mav = maximum adaptive volume: productive sweet spot before recovery cost rises
// mrv = maximum recoverable volume: hard ceiling before accumulated fatigue impairs recovery
//
// These are population starting points, not precise prescriptions.
// computeAdaptiveLandmarks() personalises them from session feedback after 3+ data points.
// Label them as "starting range" in user-facing copy, not as objective fact.
export const VOLUME_LANDMARKS = {
  chest:       { mv: 4,  mev: 6,  mav: 14, mrv: 22 },
  back:        { mv: 8,  mev: 10, mav: 16, mrv: 25 },
  // Front/rear delts, triceps, biceps, forearms and traps all receive large
  // INDIRECT volume from compound work (pressing, rows, deads/shrugs/curls) and
  // recover well. The tracker credits indirect sets at 0.5 each, so a direct-only
  // ceiling flagged these muscles "too much" too early (volume-landmark audit
  // 2026-06-05). Their mav/mrv now reflect total (direct + indirect) recovery
  // capacity. The plan GENERATOR keeps its conservative programming ceilings via
  // GENERATOR_LANDMARK_OVERRIDES, so what we program is unchanged; only how we
  // judge adequacy on the heatmap moved.
  front_delts: { mv: 0,  mev: 0,  mav: 8,  mrv: 14 },
  side_delts:  { mv: 0,  mev: 8,  mav: 16, mrv: 26 },
  rear_delts:  { mv: 0,  mev: 6,  mav: 16, mrv: 24 },
  biceps:      { mv: 5,  mev: 6,  mav: 14, mrv: 22 },
  triceps:     { mv: 4,  mev: 6,  mav: 14, mrv: 22 },
  forearms:    { mv: 2,  mev: 4,  mav: 16, mrv: 22 },
  quads:       { mv: 6,  mev: 8,  mav: 14, mrv: 20 },
  hamstrings:  { mv: 4,  mev: 6,  mav: 14, mrv: 20 },
  // Glute ceiling raised for the physique divisions (coach-plan audit
  // 2026-06-01): Bikini/Wellness/Figure work glutes at 16-22+ sets, so the
  // mrv must support it. computeLandmarks reads mev/mrv, so mrv is the binding
  // change; mav is kept consistent for the algorithms.js consumers.
  glutes:      { mv: 0,  mev: 4,  mav: 14, mrv: 22 },
  // Adductors (inner thigh) are a distinct target (founder decision,
  // docs/audit/volyume-exercise-audit-2026-05-30). mev is 0 so a user who
  // never directly trains them is not flagged as having a lagging muscle;
  // direct adductor work counts towards mav/mrv once it is logged.
  adductors:   { mv: 0,  mev: 0,  mav: 10, mrv: 14 },
  calves:      { mv: 6,  mev: 8,  mav: 14, mrv: 20 },
  abs:         { mv: 0,  mev: 4,  mav: 16, mrv: 25 },
  traps:       { mv: 0,  mev: 4,  mav: 14, mrv: 24 },
  neck:        { mv: 0,  mev: 2,  mav: 8,  mrv: 12 },
  tibialis:    { mv: 0,  mev: 2,  mav: 8,  mrv: 12 },
};

export const MUSCLE_DISPLAY_NAMES = {
  chest: 'Chest',
  back: 'Back',
  front_delts: 'Front delts',
  side_delts: 'Side delts',
  rear_delts: 'Rear delts',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  adductors: 'Adductors',
  calves: 'Calves',
  abs: 'Abs',
  traps: 'Traps',
  neck: 'Neck',
  tibialis: 'Tibialis',
};

// One statement of how a muscle key is SPOKEN (D95, AUDIT-DUPLICATES D-4).
// interBlock.js, blockExplain.js and divisionDiff.js each carried a private
// copy of this body; all three returned the same string for every canonical
// key, for 'shoulders', and for any other snake_case key, so this is their
// behaviour rather than a new one. An unknown key is humanised rather than
// leaked raw, because a custom_exercises row synced from an older or foreign
// client can carry an arbitrary primary_muscle string. A missing key falls
// back to the calm generic word, which was the most defensive of the three
// bodies (the other two returned an empty label or threw). Note this is NOT
// the `MUSCLE_DISPLAY_NAMES[m] || m` convention used elsewhere in this file
// and in the insights/copy modules, which deliberately leaks the raw key.
export function muscleDisplayName(muscleKey) {
  const key = String(muscleKey || 'muscle');
  const known = MUSCLE_DISPLAY_NAMES[key];
  if (known) return known;
  const spaced = key.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// Algorithm 4: 1RM Ensemble Calculator
export function calculate1RM(weight, reps) {
  // CALC-2: coerce first so a NUMERIC string ("5") still computes, while a
  // non-numeric one ("abc") becomes NaN and is guarded. The old guard let a
  // non-numeric reps through and returned NaN (breaking PR detection); a naive
  // Number.isFinite guard would have wrongly rejected the numeric-string case.
  const w = Number(weight);
  const reps0 = Number(reps);
  if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(reps0) || reps0 < 1) {
    return Number.isFinite(w) && w > 0 ? w : 0;
  }
  if (reps0 === 1) return w;

  // 1RM estimators lose validity past ~12-15 reps, and Brzycki's denominator
  // runs towards its pole as reps climb, so a 25-30 rep set used to return a
  // wildly inflated estimate (≈5x the weight at 30 reps) that fired spurious
  // 1RM PRs. Clamp the rep count the formula sees at 20: above that we plateau
  // at the 20-rep estimate rather than extrapolate into nonsense. (A2-040.)
  const r = Math.min(reps0, 20);
  const epley = w * (1 + r / 30);
  const brzycki = w / (1.0278 - 0.0278 * r);

  // C10L (founder ruling): the 20-rep clamp already conceded that high-rep
  // 1RM prediction loses fidelity, but between 11 and 20 reps Brzycki still
  // carried HALF the weight, so the estimate inherited more and more of that
  // inflation on the way to the clamp. A lighter high-rep set could then
  // manufacture an Est. max PR, a steeper block e1RM slope and (since C10G
  // wired the slope into runWeeklyCoach) stronger weekly performance
  // evidence than its quality warranted. Above 10 reps the estimate is now
  // Epley alone.
  //
  // Why this is the minimal correction rather than a new model: at 10 reps
  // the two estimators have all but converged (Epley 1.3333x load, Brzycki
  // 1.3337x - 0.03% apart), so dropping Brzycki ABOVE 10 introduces no
  // downward step. Epley(11) = 1.3667x still exceeds the blended 10-rep
  // 1.3335x, the whole 1-10 range is untouched, high-rep progress stays
  // measurable, and no new published-named formula is claimed. No
  // sex-specific, exercise-specific, bodyweight, RIR or velocity term is
  // introduced; that would be a different modelling project.
  if (r <= 10) return epley * 0.6 + brzycki * 0.4;
  return epley;
}

// Algorithm 9: Tonnage
//
// `exerciseTypeById` (optional) maps exerciseId -> exercise_type. The new
// exercise_type axis lets 'distance'/'duration' sets reuse the weight column
// to store metres (and reps for seconds), so weight × reps for those is NOT
// kilograms of load — counting it would inflate tonnage with garbage. When the
// map is supplied we exclude 'distance' and 'duration' sets; 'weight_reps' and
// 'weighted_bodyweight' are real load and counted, 'reps_only' carries weight 0
// so contributes 0 anyway. The map is optional and the default for an unknown /
// absent type is 'weight_reps' (counted), so existing callers that pass no map
// keep byte-identical behaviour.
const NON_LOAD_EXERCISE_TYPES = new Set(['distance', 'duration']);

// D107-2 load semantics (LOAD-SEMANTICS-SPEC): what the entered weight
// number MEANS per exercise. `loadSemanticsById` (optional) maps
// exerciseId -> load_semantics; absent map or unknown id reads 'total',
// which is byte-identical to the pre-semantics behaviour.
//   per_hand: the entered weight is ONE of two implements, so real load per
//     rep is weight x 2.
//   assisted: the entered weight is the machine's ASSISTANCE, not load.
//     EXCLUDED from tonnage entirely - counting bodyweight minus assistance
//     would pull the user's bodyweight into training analytics, which is
//     ED-adjacent and out (spec v1 law; any change is a founder question).
//   added_bodyweight: external addition only, counted as entered (the
//     bodyweight component is deliberately NOT estimated - same law).
export function loadMultiplierFor(semantics) {
  if (semantics === 'per_hand') return 2;
  if (semantics === 'assisted') return 0;
  return 1;
}

/** Build the exerciseId -> load_semantics map from any exercise list. */
export function buildLoadSemanticsById(exercises) {
  const out = {};
  for (const e of exercises ?? []) {
    if (e?.id) out[e.id] = e.loadSemantics ?? e.load_semantics ?? 'total';
  }
  return out;
}

export function calculateTonnage(sets, exerciseTypeById = null, loadSemanticsById = null) {
  return sets.reduce((total, s) => {
    if (isHardSet(s) && isLoadBearingSet(s, exerciseTypeById)) {
      const id = s.exerciseId ?? s.exercise_id;
      const mult = loadSemanticsById ? loadMultiplierFor(loadSemanticsById[id]) : 1;
      total += (s.weight || 0) * (s.actualReps || s.actual_reps || 0) * mult;
    }
    return total;
  }, 0);
}

// True unless the set's exercise is a non-load (distance/duration) type, which
// repurposes the weight/reps columns for metres/seconds. Unknown or absent type
// defaults to load-bearing (weight_reps) so behaviour is unchanged without a map.
function isLoadBearingSet(set, exerciseTypeById) {
  if (!exerciseTypeById) return true;
  const id = set.exerciseId ?? set.exercise_id;
  const type = exerciseTypeById[id];
  return !NON_LOAD_EXERCISE_TYPES.has(type);
}

// Summarise a finished workout's logged sets. totalSets counts every set
// (incl. warm-ups); workingSetCount excludes only warm-ups; tonnage is also
// over non-warm-up sets. NOTE: isHardSet excludes warm-ups ONLY, so a dropset
// counts as a full working set and its tonnage is included. (Whether a
// dropset should count as a whole set is a separate product decision; this
// documents the current behaviour rather than the earlier comment which
// wrongly claimed dropsets were excluded.) The finish flow feeds this the
// actual workout_sets from the DB, so sets logged on an exercise later
// swapped out or removed still count towards the total (WK-2), instead of the
// in-memory exercise list which drops them. Tolerant of camelCase (in-memory)
// and snake_case (DB row) set_type.
export function summariseWorkoutSets(sets, { exerciseTypeById = null, loadSemanticsById = null } = {}) {
  const list = Array.isArray(sets) ? sets : [];
  const workingSetCount = list.filter(s => (s.setType ?? s.set_type) !== 'warmup').length;
  return {
    totalSets: list.length,
    workingSetCount,
    tonnage: calculateTonnage(list, exerciseTypeById, loadSemanticsById),
  };
}

function isHardSet(set) {
  const setType = set.setType || set.set_type || 'straight';
  return setType !== 'warmup';
}

// Shared per-set muscle allocation. ONE place decides how a logged set's
// exercise distributes working-set credit across muscles, so the heatmap
// tiles (calculateWeeklyVolume) and the trend chart (getWeeklyVolumeByMuscle
// in database.js) can never disagree on "weekly sets for muscle X". Returns
// [{ muscle, sets, role }]: the primary muscle at 1.0, each secondary at its
// contribution (default 0.5). Legacy 'shoulders' normalises to side_delts as
// a primary and front_delts as a secondary (preserved behaviour).
export function allocateExerciseVolume(exercise) {
  const out = [];
  if (!exercise) return out;

  let primary = (exercise.primaryMuscle || exercise.primary_muscle || '').toLowerCase();
  if (primary === 'shoulders') primary = 'side_delts';
  if (primary) out.push({ muscle: primary, sets: 1, role: 'primary' });

  let secondaryMuscles = Array.isArray(exercise.secondaryMuscles) ? exercise.secondaryMuscles : null;
  if (!secondaryMuscles) {
    if (typeof exercise.secondary_muscles === 'string') {
      try { secondaryMuscles = JSON.parse(exercise.secondary_muscles); }
      catch (_) { secondaryMuscles = []; }
    } else if (Array.isArray(exercise.secondary_muscles)) {
      secondaryMuscles = exercise.secondary_muscles;
    } else {
      secondaryMuscles = [];
    }
  }
  if (!Array.isArray(secondaryMuscles)) secondaryMuscles = [];

  for (const sec of secondaryMuscles) {
    let muscle = sec && typeof sec === 'object' ? sec.muscle : sec;
    if (typeof muscle !== 'string' || !muscle) continue;
    muscle = muscle.toLowerCase();
    if (muscle === 'shoulders') muscle = 'front_delts';
    const contribution = (sec && typeof sec === 'object' ? sec.contribution : undefined) ?? 0.5;
    out.push({ muscle, sets: contribution, role: 'secondary' });
  }
  return out;
}

// Algorithm 1: Weekly Volume Tracking Per Muscle
export function calculateWeeklyVolume(sets, exerciseMap = {}) {
  const volumeByMuscle = {};

  for (const set of sets) {
    if (!isHardSet(set)) continue;
    // EL-7: a ballistic set is not hypertrophy evidence and never counts
    // toward per-muscle set volume; a circuit set (real loaded working
    // sets) still does, exactly like an ordinary set.
    if (isBallisticEvidenceRow(set)) continue;

    const exerciseId = set.exerciseId || set.exercise_id;
    const exercise = exerciseMap[exerciseId];
    if (!exercise) continue;

    const reps = set.actualReps || set.actual_reps || 0;
    const tonnage = (set.weight || 0) * reps;

    for (const { muscle, sets: contribution, role } of allocateExerciseVolume(exercise)) {
      if (!muscle) continue;
      if (!volumeByMuscle[muscle]) {
        volumeByMuscle[muscle] = { workingSets: 0, reps: 0, tonnage: 0 };
      }
      volumeByMuscle[muscle].workingSets += contribution;
      // Reps and tonnage are attributed to the muscle the load directly
      // trains (the primary), not to synergists.
      if (role === 'primary') {
        volumeByMuscle[muscle].reps += reps;
        volumeByMuscle[muscle].tonnage += tonnage;
      }
    }
  }

  return volumeByMuscle;
}

/**
 * EL-7 / A7 (docs/final-certification-2026-09-05/04-TRAINING-STYLES.md):
 * calculateWeeklyVolume silently DROPS every ballistic set, so a swing-heavy
 * week reads as barely trained. Advice must never be built on evidence the
 * engine has deliberately excluded, so consumers need a way to see what was
 * dropped. This is a pure, additive companion read: the same inputs and the
 * same allocation as calculateWeeklyVolume, counting ONLY the sets it skipped
 * for evidence class. calculateWeeklyVolume's own output is untouched.
 *
 * Plain 'circuit' sets are NOT counted here: EL-7 rules that a circuit set
 * COUNTS toward per-muscle volume (real loaded working sets), so nothing was
 * excluded for it. 'circuit_ballistic' is ballistic and is counted.
 *
 * @param {Array} sets - logged sets, same shape calculateWeeklyVolume takes
 * @param {Object} exerciseMap - { [exerciseId]: exercise }
 * @returns {Object} { [muscle]: { excludedSets: number } } where excludedSets
 *   is the allocation-weighted count (primary 1.0, each secondary at its
 *   contribution), matching how the volume read would have credited them.
 *   Muscles with nothing excluded are absent.
 */
export function calculateExcludedWeeklyVolume(sets, exerciseMap = {}) {
  const excludedByMuscle = {};
  if (!Array.isArray(sets)) return excludedByMuscle;

  for (const set of sets) {
    if (!set || typeof set !== 'object') continue;
    if (!isHardSet(set)) continue;
    if (!isBallisticEvidenceRow(set)) continue;

    const exerciseId = set.exerciseId || set.exercise_id;
    const exercise = exerciseMap[exerciseId];
    if (!exercise) continue;

    for (const { muscle, sets: contribution } of allocateExerciseVolume(exercise)) {
      if (!muscle) continue;
      if (!excludedByMuscle[muscle]) excludedByMuscle[muscle] = { excludedSets: 0 };
      excludedByMuscle[muscle].excludedSets += contribution;
    }
  }

  return excludedByMuscle;
}

// Algorithm 5: Volume Status
// Returns a status string, not a colour: this module is pure and must not import
// the theme. Callers resolve the colour with volumeStatusColor(status) from
// theme.js so the colour-blind-safe and high-contrast palette swaps apply.
// (A2-038: colours used to be hardcoded hex here and bypassed the palette.)
export function getVolumeStatus(workingSets, muscle, customLandmarks = null) {
  const landmarks = customLandmarks?.[muscle] || VOLUME_LANDMARKS[muscle];
  if (!landmarks) return { status: 'unknown', label: 'No data', landmarks: null };

  const { mev, mav, mrv } = landmarks;

  // Zero work is always 'below', regardless of mev. Without this short-circuit,
  // muscles with mev=0 (front_delts, get plenty of indirect work from
  // pressing) read as 'optimal' green on the body heatmap before the user
  // has logged a single set, which makes the diagram look wrong.
  // CALC-4: a non-finite set count (NaN from corrupt/missing data) used to fall
  // through every comparison to 'over_mrv' ("Too much"). Treat it as no work.
  if (!Number.isFinite(workingSets) || workingSets <= 0) {
    return { status: 'below', label: 'Below target', landmarks };
  }
  if (workingSets < mev) {
    return { status: 'below', label: 'Below target', landmarks };
  }
  if (mev > 0 && workingSets <= mev + 2) {
    return { status: 'minimum', label: 'Just enough', landmarks };
  }
  if (workingSets <= mav) {
    return { status: 'optimal', label: 'Good range', landmarks };
  }
  if (workingSets <= mrv) {
    return { status: 'near_mrv', label: 'Getting close', landmarks };
  }
  return { status: 'over_mrv', label: 'Too much', landmarks };
}

// Default load increment for a progression step. Gym weight is stored in the
// user's display unit (kg|lbs) and is never converted, so the jump has to match
// the plates that unit actually comes in: 2.5/1.25 kg, or 5/2.5 lb. This mirrors
// the `units === 'lbs' ? 5 : 2.5` convention already used in ActiveWorkoutScreen.
// A custom per-exercise increment (incrementKg) overrides this where supplied.
// (A2-043: before this, lbs users got kg-sized jumps with an lbs label.)
export function defaultIncrement(weight, units = 'kg', category = 'compound') {
  if (units === 'lbs') {
    if (category === 'isolation') return weight >= 45 ? 2.5 : 1.25;
    if (category === 'accessory') return weight >= 90 ? 2.5 : 1.25;
    return weight >= 135 ? 5 : 2.5; // compound
  }
  if (category === 'isolation') return weight >= 20 ? 1 : 0.5;
  if (category === 'accessory') return weight >= 40 ? 1.25 : 0.75;
  return weight >= 60 ? 2.5 : 1.25; // compound
}

// getProgressionSuggestion (Algorithm 2, Double Progression Suggestion) and
// computeSetTargets (per-set next-session targets) were RETIRED in Campaign
// 20 Phase 2 Stage 12 (docs/live-prescription-campaign-20-2026-08-16/
// CAMPAIGN-20-PHASE-1-DESIGN.md §3, authorities #1 and #4). Both had zero
// production callers by this point (getProgressionSuggestion always did;
// computeSetTargets lost its last caller when ActiveWorkoutScreen.js was
// wired through the resolver in the prior commit). Their laws now live in
// src/lib/livePrescription.js:
//   - computeSetTargets' double-progression core, FQ-3 effort gate, 5% cap,
//     consecutive-miss rule, layoff handling and anchor pass -> the
//     top-set-framed nextSessionOpeningLoad (Law E amends the flat-raise
//     anchor to be back-off-aware);
//   - getProgressionSuggestion's CALC-5 bodyweight-never-loads guard (the
//     old FR-C4-4 pin) -> migrated onto the resolver tests, see
//     src/lib/__tests__/livePrescription.test.js "CALC-5 / FR-C4-4" describe.
//     FR-C4-4 is fully closed: the guard is the resolver's own
//     prevWeight > 0 check, not a borrowed comment.
// See src/lib/__tests__/livePrescription.fq3.test.js (renamed from
// computeSetTargets.fq3.test.js) for the re-anchored FQ-3 law pin.

// Algorithm 3: PR Detection
/**
 * C6 P11-1 (D97-18): rows whose actual_reps is NOT a rep count are
 * ineligible for estimated-max records. A cluster commit (myo-reps /
 * rest-pause) stores the SUM of every effort in one row, so Epley on it
 * fabricates a huge estimate from a light load (50kg x "27" out-scores a
 * genuine 62.5kg x 6) and the inflated value then owns the records wall
 * for months. Warm-ups were already excluded by callers; this is the
 * shared eligibility read for every e1RM surface. High-rep fidelity for
 * ORDINARY sets is a separate founder question and is NOT touched here.
 */
export function isE1rmEligibleRow(row) {
  const t = row?.setType ?? row?.set_type ?? 'straight';
  if (t === 'warmup' || t === 'myo_reps' || t === 'rest_pause') return false;
  // EL-7 (docs/exercise-library-expansion-2026-09-05/05-DECISIONS.md): a
  // ballistic set (light load, high reps, non-maximal effort) is not a
  // strength-effort row - Epley on it fabricates an e1RM exactly as a
  // cluster row's summed reps did (C6 P11-1). 'circuit_ballistic' is
  // caught by the substring check too; a plain 'circuit' row stays
  // eligible here so PR detection (below) still counts a circuit set.
  const ec = row?.evidenceClass ?? row?.evidence_class ?? null;
  if (typeof ec === 'string' && ec.includes('ballistic')) return false;
  return true;
}

/**
 * EL-7: e1RM-eligible AND not a circuit set. Circuit sets ARE PR-eligible
 * (isE1rmEligibleRow above; a PR is a PR, CAP-14 precedent) but must NOT
 * feed trend/plateau detection - the deferredToManual/constrained skip
 * precedent, judging nothing, teaching nothing. Use this instead of
 * isE1rmEligibleRow anywhere that reads TREND (detectPlateau,
 * detectProgressionConsistency), never for PR detection itself.
 */
export function isTrendEligibleRow(row) {
  if (!isE1rmEligibleRow(row)) return false;
  const ec = row?.evidenceClass ?? row?.evidence_class ?? null;
  return ec !== 'circuit';
}

/** EL-7: true for 'ballistic' or 'circuit_ballistic'; false for everything else. */
export function isBallisticEvidenceRow(row) {
  const ec = row?.evidenceClass ?? row?.evidence_class ?? null;
  return typeof ec === 'string' && ec.includes('ballistic');
}

export function detectPR(newSet, historicalSets, exercise, units = 'kg') {
  const prs = [];
  const weight = newSet.weight || 0;
  const reps = newSet.actualReps || newSet.actual_reps || 0;

  if (!weight || !reps) return prs;
  // C6 P11-1 (D97-18): a cluster row can neither set nor seed an
  // estimated-max record - its rep count is a sum of efforts.
  if (!isE1rmEligibleRow(newSet)) return prs;

  // D107-2 load semantics: on an assistance machine the entered weight is
  // the ASSISTANCE, so every ordinary comparison INVERTS - less is
  // stronger. Handled in its own branch: Epley on an assistance number is
  // meaningless (no 1RM estimate), heavier assistance is never progress
  // (no heaviest-weight record), and the two records that DO make sense
  // are lower assistance at no fewer reps, and more reps at the same
  // assistance. per_hand and added_bodyweight compare like with like on
  // the entered number and fall through unchanged.
  const semantics = exercise?.loadSemantics ?? exercise?.load_semantics ?? 'total';
  if (semantics === 'assisted') {
    const eligible = historicalSets.filter(
      s => (s.weight || 0) > 0 && (s.actualReps || s.actual_reps || 0) > 0,
    );
    if (!eligible.length) return prs;
    const lowestAssistance = eligible.reduce(
      (best, s) => Math.min(best, s.weight || Infinity), Infinity,
    );
    const repsAtLowest = eligible
      .filter(s => Math.abs((s.weight || 0) - lowestAssistance) < 0.1)
      .reduce((best, s) => Math.max(best, s.actualReps || s.actual_reps || 0), 0);
    if (weight < lowestAssistance - 0.001 && reps >= repsAtLowest) {
      prs.push({
        type: 'least_assistance',
        weight,
        value: weight,
        previousValue: lowestAssistance,
        reps,
        label: `New best: ${weight}${units} assistance × ${reps} reps`,
      });
    }
    const maxRepsAtSame = eligible
      .filter(s => Math.abs((s.weight || 0) - weight) < 0.1)
      .reduce((best, s) => Math.max(best, s.actualReps || s.actual_reps || 0), 0);
    if (reps > maxRepsAtSame && maxRepsAtSame > 0) {
      prs.push({
        type: 'most_reps_at_weight',
        weight,
        value: reps,
        previousValue: maxRepsAtSame,
        reps,
        label: `Most reps at ${weight}${units} assistance: ${reps} reps`,
      });
    }
    return prs;
  }

  const new1RM = calculate1RM(weight, reps);

  const best1RM = historicalSets.reduce((best, s) => {
    if (!isE1rmEligibleRow(s)) return best;
    const est = calculate1RM(s.weight || 0, s.actualReps || s.actual_reps || 0);
    return est > best ? est : best;
  }, 0);

  if (best1RM > 0 && new1RM > best1RM * 1.001) {
    prs.push({
      type: '1rm_estimate',
      value: new1RM,
      previousValue: best1RM,            // for "+X% vs previous" copy
      reps,
      weight,
      label: `New estimated max: ${new1RM.toFixed(1)}${units}`,
    });
  }

  const heaviestEver = historicalSets.reduce(
    (best, s) => ((s.weight || 0) > best ? s.weight || 0 : best),
    0,
  );
  if (weight > heaviestEver) {
    prs.push({
      type: 'heaviest_weight',
      weight,
      value: weight,
      previousValue: heaviestEver > 0 ? heaviestEver : null,
      reps,
      label: `New heaviest weight: ${weight}${units} × ${reps} reps`,
    });
  }

  const maxRepsAtWeight = historicalSets
    .filter(s => Math.abs((s.weight || 0) - weight) < 0.1)
    .reduce((best, s) => Math.max(best, s.actualReps || s.actual_reps || 0), 0);
  if (reps > maxRepsAtWeight && maxRepsAtWeight > 0) {
    prs.push({
      type: 'most_reps_at_weight',
      weight,
      value: reps,                       // the metric here is reps, not weight
      previousValue: maxRepsAtWeight,
      reps,
      label: `Most reps at ${weight}${units}: ${reps} reps`,
    });
  }

  return prs;
}

// Significance order for collapsing a session's PRs: an estimated-1RM PR
// is the headline strength gain, then a new heaviest weight, then most
// reps at a weight.
const PR_TYPE_RANK = {
  '1rm_estimate': 3,
  heaviest_weight: 2,
  // D107-2: the assisted counterpart of a heaviest-weight record (lower
  // assistance at no fewer reps) carries the same significance.
  least_assistance: 2,
  most_reps_at_weight: 1,
};

/**
 * Collapse a session's raw PR list to ONE PR per exercise.
 *
 * detectPR can return up to three PR types for a single set, and every
 * set that beats the running best counts again, so six exercises can
 * report dozens of PRs. A session should read as "one PR for that
 * exercise": this keeps the most significant PR per exercise (by type
 * rank, then larger value within a type) and preserves the order each
 * exercise's first PR was seen. Display only, the stored all-time
 * records are computed from full set history elsewhere, so this never
 * loses a real record.
 *
 * @param {Array<object>} prs  PR objects, each ideally with exerciseId
 *                             (falls back to exerciseName), type, value.
 * @returns {Array<object>}    one PR per exercise.
 */
export function bestPRPerExercise(prs) {
  if (!Array.isArray(prs) || prs.length === 0) return [];
  const bestByKey = new Map();
  const order = [];
  for (const pr of prs) {
    if (!pr) continue;
    const key = pr.exerciseId ?? pr.exerciseName ?? pr.exercise ?? '';
    const rank = PR_TYPE_RANK[pr.type] ?? 0;
    const existing = bestByKey.get(key);
    if (!existing) {
      bestByKey.set(key, pr);
      order.push(key);
      continue;
    }
    const existingRank = PR_TYPE_RANK[existing.type] ?? 0;
    if (rank > existingRank
        || (rank === existingRank && (pr.value ?? 0) > (existing.value ?? 0))) {
      bestByKey.set(key, pr);
    }
  }
  return order.map(k => bestByKey.get(k));
}

// Algorithm 7: Deload Detection
// Signal weighting: performance 50%, wellness composite 30%, soreness 20%.
// Rationale: Coleman et al. (2024, PeerJ) found soreness is an unreliable deload trigger
// in trained populations (MPS–hypertrophy uncoupling reduces DOMS meaning after adaptation);
// performance decline and joint/motivation signals precede physiological overreaching
// (Kreher & Schwartz 2012; Meeusen et al. 2013). Autoregulated deloads preferred over
// pre-planned (Bell Delphi 2023; Bell survey 2024): trigger fires when evidence warrants it.
//
// INPUT SCALES (do not "normalise" these away): each weekly bucket's
// avgSoreness and avgJointDiscomfort come from the per-session sliders, which
// are 1-3 (1=fresh/none .. 3=sore/significant), NOT the 1-5 weekly check-in
// soreness. The thresholds below (soreness >= 2.5, joint >= 1.5) are
// calibrated for that 1-3 scale. The adaptive engine maps the sliders to 1-5
// at its own boundary (SORENESS_MAP in database.js / WorkoutSummaryScreen);
// this function deliberately works in the raw slider scale instead.
export function shouldDeload(last4WeeksData) {
  if (!last4WeeksData || last4WeeksData.length < 2) return { deload: false, reasons: [] };

  const reasons = [];
  let score = 0; // 0–100; deload triggers at ≥ 50

  // Performance (50% weight).
  const recentReps = last4WeeksData[last4WeeksData.length - 1]?.avgReps || 0;
  const earlierReps = last4WeeksData[0]?.avgReps || 0;
  if (earlierReps > 0 && recentReps < earlierReps - 2) {
    score += 50;
    reasons.push('Rep performance has dropped significantly over the last 4 weeks');
  }

  // Wellness composite (30% weight, split across joint + volume signals).
  const weeksSinceDeload = last4WeeksData[last4WeeksData.length - 1]?.weeksSinceLastDeload || 99;
  // Campaign 1 P0-7 D6: average ANSWERED weeks only. Coercing unanswered
  // weeks to 0 halved or quartered genuine joint evidence and suppressed
  // the 18-point trigger; a week with no answers contributes nothing in
  // either direction (blockLedgerGather posture).
  const jointRatedWeeks = last4WeeksData
    .map(w => (w.avgJointDiscomfort == null ? null : Number(w.avgJointDiscomfort)))
    .filter(v => v != null && Number.isFinite(v));
  const avgJointDiscomfort = jointRatedWeeks.length
    ? jointRatedWeeks.reduce((sum, v) => sum + v, 0) / jointRatedWeeks.length
    : 0;
  if (avgJointDiscomfort >= 1.5 && weeksSinceDeload >= 3) {
    score += 18;
    reasons.push('Recurring joint discomfort across the block');
  }
  const overMRVWeeks = last4WeeksData.filter(w => w.hasOverMRV).length;
  if (overMRVWeeks >= 2) {
    score += 12;
    reasons.push('Exceeded your productive volume range for 2 or more weeks');
  }

  // Soreness (20% weight, down-weighted; unreliable in trained populations).
  // Require 3+ weeks at high soreness AND time since last deload ≥ 4 weeks
  // Campaign 1 P0-7 D6: null weeks (nothing rated) can neither satisfy nor
  // dilute the requirement; only genuinely-rated high weeks count.
  const highSorenessWeeks = last4WeeksData.filter(w => w.avgSoreness != null && w.avgSoreness >= 2.5).length;
  if (highSorenessWeeks >= 3 && weeksSinceDeload >= 4) {
    score += 20;
    reasons.push('Sustained soreness across 3 or more weeks');
  }

  return { deload: score >= 50, reasons };
}

const DELOAD_BUCKET_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function deloadBucketSetAt(s) {
  return s.createdAt ?? s.created_at ?? 0;
}

function deloadBucketWorkoutAt(w) {
  return w.startedAt ?? w.createdAt ?? w.created_at ?? 0;
}

function deloadBucketWorkoutCompleted(w) {
  return w.isCompleted ?? w.is_completed ?? false;
}

/**
 * Builds the last 4 weekly evidence buckets shouldDeload() reads: average
 * reps, soreness/joint-discomfort, over-MRV volume, and weeks since the
 * last lighter/recovery week. One derivation for every caller that feeds
 * shouldDeload, so a correction to one rule (e.g. the "untrained week" scan
 * boundary, Campaign 24 §2) cannot fix one copy and leave the others to
 * drift, as CoachReviewScreen's averages had (see zeroFillUnrated below --
 * Campaign 24 D33 ruling corrected that caller onto the answered-only path,
 * so no caller may set it true any more; the option and its dead branch
 * stay only as the documented record of the bug this replaced).
 *
 * @param {Array} sets - workout sets (already time/completion-filtered by
 *   the caller as appropriate; see opts.repsViaWorkoutRoster for a caller
 *   that instead scopes "this week's sets" via the workout roster).
 * @param {Array} workouts - workout rows (isCompleted, startedAt,
 *   soreness24hBefore, jointDiscomfort).
 * @param {object|null} exerciseMap - exerciseId -> exercise, required for
 *   the hasOverMRV pass and the derived weeksSinceLastDeload scan. Pass
 *   null/undefined to skip the hasOverMRV pass entirely (every bucket's
 *   hasOverMRV is false) -- the honest answer for a caller with no
 *   landmarks pass available (HomeScreen's documented D92 residual:
 *   under-suggests a deload by 12 points, never over-suggests). Must be
 *   paired with a finite opts.weeksSinceLastDeloadOverride, since the
 *   derived scan also needs exerciseMap.
 * @param {object} [opts]
 * @param {number} [opts.now] - anchor instant, default Date.now(). Also
 *   used as the scan anchor for the derived weeksSinceLastDeload even when
 *   opts.weekAnchorMs is set (matches CoachReviewScreen: Monday-anchored
 *   buckets, but a now-rolling lighter-week scan).
 * @param {number|null} [opts.weekAnchorMs] - if set, the 4 buckets are
 *   Monday-anchored (or whatever grammar the caller's own anchor encodes)
 *   weeks ending at this timestamp plus one week (CoachReviewScreen's
 *   grammar: bucket 3, the most recent, is [weekAnchorMs, weekAnchorMs +
 *   1 week)). If null (default), buckets are 4 trailing weeks measured
 *   back from `now` (useProgressData/HomeScreen's rolling grammar).
 * @param {boolean} [opts.excludeWarmups=false] - exclude
 *   s.setType === 'warmup' sets from the avgReps calc (HomeScreen's
 *   current behaviour; useProgressData/CoachReviewScreen do not do this).
 * @param {boolean} [opts.repsViaWorkoutRoster=false] - source "this
 *   week's sets" for the avgReps calc from the set of sets belonging to a
 *   completed workout whose own startedAt falls in the bucket (HomeScreen's
 *   current behaviour: `wIds = weekWorkouts.map(w => w.id)`, then
 *   `sets.filter(s => wIds.has(s.workoutId))`) instead of filtering sets
 *   directly by their own createdAt (useProgressData/CoachReviewScreen's
 *   behaviour, and this option's default).
 * @param {boolean} [opts.zeroFillUnrated=false] - coerce unrated
 *   soreness/joint values to 0 instead of excluding them from the average.
 *   No production caller may pass this any more (Campaign 24 D33: this was
 *   CoachReviewScreen's pre-fix behaviour, the already-fixed-elsewhere bug,
 *   Campaign 1 P0-7 D6). Kept as a disabled, documented option rather than
 *   deleted so the shape of the bug this replaced stays legible; defaults
 *   to false (the correct, answered-only behaviour).
 * @param {number|null} [opts.weeksSinceLastDeloadOverride] - if a finite
 *   number, every bucket gets this flat value instead of the derived,
 *   per-bucket-back-projected figure (HomeScreen's current `99`, since it
 *   has no exerciseMap to run the derivation's volume pass with).
 * @returns {Array<{avgReps, avgSoreness, avgJointDiscomfort, hasOverMRV,
 *   weeksSinceLastDeload}>} 4 entries, oldest first, ready for
 *   shouldDeload().
 */
export function buildLast4WeekDeloadBuckets(sets, workouts, exerciseMap, opts = {}) {
  const {
    now = Date.now(),
    weekAnchorMs = null,
    excludeWarmups = false,
    repsViaWorkoutRoster = false,
    zeroFillUnrated = false,
    weeksSinceLastDeloadOverride = null,
  } = opts;
  const WEEK_MS = DELOAD_BUCKET_WEEK_MS;

  const rawBuckets = [];
  for (let o = 0; o < 4; o++) {
    let start, end;
    if (weekAnchorMs != null) {
      // Monday-anchored grammar: bucket o=3 (most recent) is
      // [weekAnchorMs, weekAnchorMs + 1 week).
      start = weekAnchorMs - (3 - o) * WEEK_MS;
      end = start + WEEK_MS;
    } else {
      // Rolling grammar: measured back from `now`, oldest first.
      const wk = 3 - o;
      end = now - wk * WEEK_MS;
      start = end - WEEK_MS;
    }

    const wkSets = sets.filter((s) => {
      const at = deloadBucketSetAt(s);
      return at >= start && at < end;
    });
    const wkWorkouts = workouts.filter((w) => {
      const at = deloadBucketWorkoutAt(w);
      return at >= start && at < end && deloadBucketWorkoutCompleted(w);
    });

    const repsSets = repsViaWorkoutRoster
      ? (() => {
          const wIds = new Set(wkWorkouts.map((w) => w.id));
          return sets.filter((s) => wIds.has(s.workoutId ?? s.workout_id));
        })()
      : wkSets;
    const setsForReps = excludeWarmups
      ? repsSets.filter((s) => (s.setType ?? s.set_type) !== 'warmup')
      : repsSets;
    const avgReps = setsForReps.length > 0
      ? setsForReps.reduce((sum, s) => sum + (s.actualReps ?? s.actual_reps ?? 0), 0) / setsForReps.length
      : 0;

    let avgSoreness;
    let avgJointDiscomfort;
    if (zeroFillUnrated) {
      // Dead in production (Campaign 24 D33) -- see JSDoc above.
      avgSoreness = wkWorkouts.length > 0
        ? wkWorkouts.reduce((sum, w) => sum + (w.soreness24hBefore ?? w.soreness_24h_before ?? 0), 0) / wkWorkouts.length
        : 0;
      avgJointDiscomfort = wkWorkouts.length > 0
        ? wkWorkouts.reduce((sum, w) => sum + (w.jointDiscomfort ?? w.joint_discomfort ?? 0), 0) / wkWorkouts.length
        : 0;
    } else {
      // Campaign 1 P0-7 D6: answered-only averages, null when nothing was
      // rated -- unanswered sessions coerced to 0 diluted genuine
      // soreness/joint evidence and suppressed the deload triggers.
      // FINDING 8 (adversarial audit 2026-08-26). `v != null` is a
      // not-null check standing in for a validity check, and NaN is not null.
      // A single unusable rating turned the average into NaN, and because
      // every threshold comparison against NaN is false, the deload triggers
      // it feeds could not fire at all. Someone genuinely sore would simply
      // not be offered the deload, silently, with the evidence right there.
      // Line 584 of this same file already had the correct shape; these two
      // are the ones that missed it. Number is deliberate as well as finite:
      // these rows can arrive from a cloud pull, and a string would make
      // `sum + v` a concatenation rather than an arithmetic mean.
      const sorenessRated = wkWorkouts
        .map((w) => w.soreness24hBefore ?? w.soreness_24h_before ?? null)
        .filter((v) => typeof v === 'number' && Number.isFinite(v));
      avgSoreness = sorenessRated.length
        ? sorenessRated.reduce((sum, v) => sum + v, 0) / sorenessRated.length
        : null;
      // Finding 8, same class, same fix.
      const jointRated = wkWorkouts
        .map((w) => w.jointDiscomfort ?? w.joint_discomfort ?? null)
        .filter((v) => typeof v === 'number' && Number.isFinite(v));
      avgJointDiscomfort = jointRated.length
        ? jointRated.reduce((sum, v) => sum + v, 0) / jointRated.length
        : null;
    }

    let hasOverMRV = false;
    if (exerciseMap) {
      const vol = calculateWeeklyVolume(wkSets, exerciseMap);
      hasOverMRV = Object.entries(vol).some(([muscle, data]) => {
        const lm = VOLUME_LANDMARKS[muscle];
        return lm && data.workingSets > lm.mrv;
      });
    }

    rawBuckets.push({ avgReps, avgSoreness, avgJointDiscomfort, hasOverMRV });
  }

  // Weeks since the last lighter/recovery week: scan backwards for a
  // genuinely trained low-volume week (< 15 total working sets), an
  // untrained week ending the scan (fatigue cannot accumulate across a
  // week with no training, so the scan stops there -- Campaign 1 D97-22).
  // Always a now-rolling scan, even under the Monday-anchored bucket
  // grammar (matches CoachReviewScreen: Monday buckets, now-rolling scan).
  const weeksSinceLighter = weeksSinceLastDeloadOverride != null
    ? null
    : (() => {
        for (let wk = 1; wk <= 12; wk++) {
          const end = now - wk * WEEK_MS;
          const start = end - WEEK_MS;
          const wkSets = sets.filter((s) => {
            const at = deloadBucketSetAt(s);
            return at >= start && at < end;
          });
          if (wkSets.length === 0) return wk; // accumulation boundary, not a rest week
          const vol = calculateWeeklyVolume(wkSets, exerciseMap);
          const totalSets = Object.values(vol).reduce((sum, v) => sum + (v.workingSets || 0), 0);
          if (totalSets < 15) return wk; // a genuinely trained lighter week
        }
        return 12; // no lighter week found in last 12 weeks
      })();

  return rawBuckets.map((bucket, o) => ({
    ...bucket,
    weeksSinceLastDeload: weeksSinceLastDeloadOverride != null
      ? weeksSinceLastDeloadOverride
      : weeksSinceLighter + (3 - o),
  }));
}

// RP-style soreness × performance → volume decision
// Inputs use numeric scales:
//   soreness:    1=none  2=healed_early  3=healed_on_time  4=still_sore
//   performance: 1=exceeded  2=met  3=struggled  4=failed_to_match
//   pump:        1=none  2=low  3=moderate  4=great
//   joint:       0=none  1=low  2=moderate  3=high
// Returns: { decision, delta, reasonCode, reasonText }
// Campaign 1 P0-7 D7: hold-by-default parameter shape. The old defaults
// (soreness 2, performance 2, pump 3) landed an ARGUMENT-FREE call in the
// good-recovery branch and returned add_set +1 - so absent feedback could
// recommend an increase. soreness 3 / performance 3 routes to hold; real
// callers always pass recorded values.
export function computeAdaptiveDecision({ soreness = 3, performance = 3, pump = 3, joint = 0 } = {}) {
  // Campaign 1 review BLOCKER 1: a missing REQUIRED signal holds. An
  // explicit null (as runAdaptiveEngine now passes for unanswered
  // feedback) is not a rating and must never route through the
  // good-recovery branch. The joint override below still runs first -
  // real reported pain always wins regardless of what else is missing.
  if (joint >= 3) {
    return {
      decision: 'rotate_exercise',
      delta: 0,
      reasonCode: 'joint_high',
      // PD-2 fix (CC27): the old text claimed "Rotating to a lower-risk
      // exercise next session" - but no code performs any rotation, and
      // "lower-risk" is a safety claim no deterministic rule supports
      // (CAP-18 honest-explanation law). The decision is a RECOMMENDATION
      // the user acts on through the swap sheet; the copy now says exactly
      // that and nothing more.
      reasonText: 'High joint discomfort. Worth choosing a different exercise here; nothing changes until you swap it.',
    };
  }
  if (soreness == null || performance == null) {
    return {
      decision: 'hold',
      delta: 0,
      reasonCode: 'insufficient_feedback',
      reasonText: 'Not enough session feedback to judge. Holding your current sets.',
    };
  }
  if (pump == null) pump = 3;
  // Joint pain overrides everything, rotate the exercise
  if (joint >= 3) {
    return {
      decision: 'rotate_exercise',
      delta: 0,
      reasonCode: 'joint_high',
      // PD-2 fix (CC27): the old text claimed "Rotating to a lower-risk
      // exercise next session" - but no code performs any rotation, and
      // "lower-risk" is a safety claim no deterministic rule supports
      // (CAP-18 honest-explanation law). The decision is a RECOMMENDATION
      // the user acts on through the swap sheet; the copy now says exactly
      // that and nothing more.
      reasonText: 'High joint discomfort. Worth choosing a different exercise here; nothing changes until you swap it.',
    };
  }

  // Systemic MRV breach, deload trigger
  if (performance === 4 && soreness >= 3) {
    return {
      decision: 'deload_trigger',
      delta: 0,
      reasonCode: 'systemic_mrv_breach',
      reasonText: 'Still sore and performance dropped. Your body needs more recovery. A lighter week is recommended.',
    };
  }

  // Still sore at next session → drop a set
  if (soreness === 4) {
    return {
      decision: 'drop_set',
      delta: -1,
      reasonCode: 'residual_soreness',
      reasonText: 'Still sore at the next session. Dropping 1 set to allow recovery.',
    };
  }

  // Joint discomfort (moderate), hold volume, no increase
  if (joint >= 2) {
    return {
      decision: 'hold',
      delta: 0,
      reasonCode: 'joint_moderate',
      reasonText: 'Moderate joint discomfort. Keeping the same number of sets. Keep an eye on it.',
    };
  }

  // 2-axis readiness: soreness ≤ 2 (none or healed early) AND performance ≤ 2 (exceeded or met)
  if (soreness <= 2 && performance <= 2) {
    if (pump === 1) {
      // No pump = clear under-stimulus → add 2 sets
      return {
        decision: 'add_set',
        delta: 2,
        reasonCode: 'under_stimulus',
        reasonText: 'Full recovery between sessions. You are ready for more work. Add 2 sets next week.',
      };
    }
    if (pump === 4 && soreness === 2) {
      // Great pump, healed early, still productive but recovering fine
      return {
        decision: 'hold',
        delta: 0,
        reasonCode: 'optimal_response',
        reasonText: 'Good effort and quick recovery. Your current sets are working well. Hold here.',
      };
    }
    return {
      decision: 'add_set',
      delta: 1,
      reasonCode: 'good_recovery_good_performance',
      reasonText: 'Good recovery and performance. Add 1 set next week.',
    };
  }

  // Struggling or failed but still recovering, hold
  if (performance >= 3 && soreness <= 3) {
    return {
      decision: 'hold',
      delta: 0,
      reasonCode: 'performance_struggle',
      reasonText: 'Performance struggled. Keep the same number of sets and focus on clean technique.',
    };
  }

  // Default: hold
  return {
    decision: 'hold',
    delta: 0,
    reasonCode: 'hold_default',
    reasonText: 'Your set count looks good here. Continue as planned.',
  };
}

// Run the adaptive engine for all muscles after a session week
// weekFeedback: { [muscle]: { soreness, performance, pump, joint, currentSets, mev, mav, mrv } }
// Returns: { [muscle]: adaptiveDecision & { nextWeekSets } }
export function runAdaptiveEngine(weekFeedback = {}) {
  const results = {};

  for (const [muscle, data] of Object.entries(weekFeedback)) {
    // Campaign 1 review BLOCKER 1: pass absence THROUGH. The old
    // `?? 2 / ?? 2 / ?? 3` re-manufactured exactly the permissive
    // defaults the P0-7 D7/D9 fix removed one layer up, so a session
    // with no feedback at all still returned add_set +1. Missing
    // required signals now hold (computeAdaptiveDecision's
    // insufficient_feedback early return); joint stays 0-when-missing
    // because absence of a joint answer adds no pain signal, and the
    // joint HOLD path only ever restricts.
    const decision = computeAdaptiveDecision({
      soreness: data.soreness ?? null,
      performance: data.performance ?? null,
      pump: data.pump ?? null,
      joint: data.joint ?? 0,
    });

    const current = Math.round(data.currentSets ?? data.mav ?? 10);
    const mev = data.mev ?? 6;
    const mrv = data.mrv ?? 20;

    let nextWeekSets = current + (decision.delta ?? 0);
    nextWeekSets = Math.round(Math.max(mev, Math.min(mrv, nextWeekSets)));

    results[muscle] = { ...decision, nextWeekSets, currentSets: current };
  }

  return results;
}

// Adaptive volume landmarks, adjusts MEV/MAV/MRV per muscle based on user's feedback signals
// history: array of { muscle, pumpScore, sorenessScore, jointDiscomfort, performanceTrend, prFrequency, missedReps, weeklyVolume }
// Each entry = one logged session/week for that muscle
export function computeAdaptiveLandmarks(history = [], baseDefaults = VOLUME_LANDMARKS) {
  const adapted = {};

  // Group history by muscle
  const byMuscle = {};
  for (const entry of history) {
    if (!entry.muscle) continue;
    if (!byMuscle[entry.muscle]) byMuscle[entry.muscle] = [];
    byMuscle[entry.muscle].push(entry);
  }

  for (const muscle of Object.keys(baseDefaults)) {
    const base = baseDefaults[muscle];
    const entries = byMuscle[muscle] || [];

    if (entries.length < 3) {
      // Not enough data, use defaults
      adapted[muscle] = { ...base, dataPoints: entries.length, isAdapted: false };
      continue;
    }

    // Score: higher pump + lower soreness + no joint issues + performance improving = can handle more volume
    // Signals (all 1–5 scale except missedReps which is a count):
    // pump: 1=none → 5=great (higher = better, stimulus proxy)
    // soreness: 1=none → 5=very sore (lower = better, recovery cost)
    // jointDiscomfort: 0=none → 3=significant (lower = better, injury risk)
    // performanceTrend: -1=declining, 0=flat, 1=improving (higher = better)
    // prFrequency: PRs per 4 weeks (higher = adapting well)
    // missedReps: avg reps missed per set (higher = fatigued)

    const recent = entries.slice(-8); // last 8 data points
    const avgPump = recent.reduce((s, e) => s + (e.pumpScore || 3), 0) / recent.length;
    const avgSoreness = recent.reduce((s, e) => s + (e.sorenessScore || 2), 0) / recent.length;
    const avgJoint = recent.reduce((s, e) => s + (e.jointDiscomfort || 0), 0) / recent.length;
    const avgPerf = recent.reduce((s, e) => s + (e.performanceTrend || 0), 0) / recent.length;
    const avgPRFreq = recent.reduce((s, e) => s + (e.prFrequency || 0), 0) / recent.length;
    const avgMissed = recent.reduce((s, e) => s + (e.missedReps || 0), 0) / recent.length;

    // Compute a net stimulus/recovery score: positive = can handle more, negative = need less.
    // Weight order (research-supported): performance trend > missed reps > joint > soreness > pump.
    // Pump is exercise-selection-dependent and over-weighted in naive models.
    const stimulusScore = (avgPump - 3) * 0.3;          // pump above 3 = mild positive signal
    const recoveryScore = -(avgSoreness - 2) * 0.4;     // soreness above 2 = recovery cost
    const jointScore = -(avgJoint) * 0.8;               // joint issues = hard stop signal
    const perfScore = avgPerf * 0.8;                    // performance trend is the strongest signal
    const prScore = Math.min(avgPRFreq * 0.3, 0.6);     // PRs = adapting
    const fatigueScore = -(avgMissed * 0.6);            // missing reps = primary fatigue signal

    const netScore = stimulusScore + recoveryScore + jointScore + perfScore + prScore + fatigueScore;

    // Adjust landmarks by up to ±4 sets based on net score
    const adjustment = Math.round(Math.max(-4, Math.min(4, netScore * 2)));

    // Find the volume that produced best results (highest pump × performance, lowest soreness)
    const scoredEntries = recent.map(e => ({
      volume: e.weeklyVolume || base.mav,
      quality: ((e.pumpScore || 3) + (e.performanceTrend || 0) - (e.sorenessScore || 2) - (e.jointDiscomfort || 0)),
    })).sort((a, b) => b.quality - a.quality);

    const bestVolume = scoredEntries[0]?.volume || base.mav;

    adapted[muscle] = {
      mev: Math.max(0, base.mev + adjustment),
      mav: Math.max(base.mev + 1, Math.min(base.mrv - 1, Math.round(bestVolume))),
      mrv: Math.max(base.mav + 1, base.mrv + Math.floor(adjustment / 2)),
      isAdapted: true,
      dataPoints: entries.length,
      netScore: Math.round(netScore * 10) / 10,
      bestVolume,
      note: netScore > 1
        ? `You recover well here. Target raised by ${adjustment} sets.`
        : netScore < -1
        ? `Recovery cost is high. Target lowered by ${Math.abs(adjustment)} sets.`
        : 'Landmark based on your response data',
    };
  }

  return adapted;
}

// ── COMP-015: visible per-muscle session autoregulation ────────────────────────
//
// `computeSessionAdjustments` is a pure function (no side effects, no Date.now
// inside — the caller passes `now`), so a crash-recovery recompute from the
// same as-of-session-start inputs is bit-identical. It NEVER mutates the plan,
// routines, or weekly volume: it returns at most a ±1 set delta per affected
// exercise for THIS session only. The weekly coach remains the sole owner of
// next-week volume direction (founder decision 2026-05-28); the session layer
// is read-only against the plan and reinforces — never races — the weekly coach,
// because only one of the two ever writes.
//
// Day-of-week anchors in the copy are formatted by an injectable `formatDay`
// (default: UTC weekday) so the function stays deterministic in tests; the UI
// layer may pass a device-local formatter.
const _UTC_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const _defaultFormatDay = (ts) => (ts == null ? null : _UTC_WEEKDAYS[new Date(ts).getUTCDay()]);
const HOURS_72 = 72 * 60 * 60 * 1000;
const DAYS_4 = 4 * 24 * 60 * 60 * 1000;
// C6 Phase 12 (D97): the engine's existing detraining boundary (the PR
// rebound window's REBOUND_GAP_MAX_DAYS in blockLedgerGather.js uses the
// same 14 days: "a longer gap is detraining, not rebound"). Session
// feedback older than this cannot certify readiness for MORE volume.
const DAYS_14 = 14 * 24 * 60 * 60 * 1000;

/**
 * @param {object} input
 * @param {Array}  input.todaysExercises  [{ exerciseId, primaryMuscle, plannedSets }]
 * @param {object} input.muscleSignals    { [muscle]: { lastTrainedAt, lastFeedback: { pump, joint, performance },
 *                                          checkinSore, checkinAt, presessionSoreness, displayName } }
 * @param {object} input.weeklyContext    { doneThisWeekByMuscle, landmarks, weeklySignal:'reduce'|'hold'|'push',
 *                                          safetyHold, isDeload, weekStartMs }
 * @param {Array}  input.recentSessionEvents  this mesocycle's session_* events [{ muscle, decision, createdAt }]
 * @param {number} input.now
 * @param {string} [input.presessionIntent]   'sharp'|'average'|'below_par'|null
 * @param {function} [input.formatDay]
 * @returns {Array} [{ exerciseId, muscle, setDelta, adjustedSets, plannedSets, reasonCode, reasonText, show, signals }]
 */
export function computeSessionAdjustments({
  todaysExercises = [],
  muscleSignals = {},
  weeklyContext = {},
  recentSessionEvents = [],
  now = 0,
  presessionIntent = null,
  formatDay = _defaultFormatDay,
} = {}) {
  // R0: deload weeks belong entirely to the deload prescription. Engine silent.
  if (weeklyContext.isDeload) return [];

  const landmarks = weeklyContext.landmarks ?? {};
  const doneByMuscle = weeklyContext.doneThisWeekByMuscle ?? {};
  const weekStartMs = weeklyContext.weekStartMs ?? 0;
  const weeklySignal = weeklyContext.weeklySignal ?? 'hold';
  const safetyHold = !!weeklyContext.safetyHold;

  // First primary exercise per muscle today, in stable encounter order. Only
  // one exercise per muscle ever adjusts (and only its PRIMARY muscle — never
  // secondary credit, matching allocateExerciseVolume semantics).
  const firstExerciseForMuscle = new Map();
  const muscleOrder = [];
  for (const ex of todaysExercises) {
    const m = ex.primaryMuscle;
    if (!m || ex.exerciseId == null) continue;          // ad-hoc / unscoped → silent
    if (!Number.isFinite(ex.plannedSets) || ex.plannedSets < 1) continue;
    if (!firstExerciseForMuscle.has(m)) {
      firstExerciseForMuscle.set(m, ex);
      muscleOrder.push(m);
    }
  }

  // Add-frequency cap (this week) and revert memory (this meso), both derived
  // from adaptation_events — no new state.
  //
  // C10B (F9 trace): "revert expiry" was carried as undefined product law.
  // It is not undefined in the code. The caller passes a SIX-WEEK window
  // (sessionAdjustments: getRecentAdaptationEvents(userId, 6), a rolling
  // created_at >= now - 6 weeks), so a muscle suppressed by two reverts
  // becomes proposable again once those events age out - roughly one
  // mesocycle, an existing lifecycle boundary rather than an invented
  // duration. Reinstall does not resurrect it either: restored events keep
  // their true recorded_at, so an old revert stays outside the window.
  const addedThisWeek = new Set();
  const revertCounts = {};
  for (const ev of recentSessionEvents) {
    if (!ev || !ev.muscle) continue;
    const code = ev.decision ?? ev.reasonCode;
    if (code && code.startsWith('session_add') && (ev.createdAt ?? 0) >= weekStartMs) {
      addedThisWeek.add(ev.muscle);
    }
    if (code === 'session_adjustment_reverted') {
      revertCounts[ev.muscle] = (revertCounts[ev.muscle] ?? 0) + 1;
    }
  }

  const candidates = [];
  for (const muscle of muscleOrder) {
    const ex = firstExerciseForMuscle.get(muscle);
    const sig = muscleSignals[muscle] ?? {};
    const plannedSets = ex.plannedSets;
    const displayName = sig.displayName || MUSCLE_DISPLAY_NAMES[muscle] || muscle;
    const lk = landmarks[muscle] ?? VOLUME_LANDMARKS[muscle] ?? {};
    const mev = lk.mev ?? 0;
    const mav = lk.mav ?? Infinity;
    const mrv = lk.mrv ?? Infinity;
    // Projected weekly sets for this muscle if today runs as planned.
    const projectedPlanned = (doneByMuscle[muscle] ?? 0) + plannedSets;

    const lastTrainedAt = sig.lastTrainedAt ?? null;
    const trainedWithin72h = lastTrainedAt != null && (now - lastTrainedAt) <= HOURS_72 && (now - lastTrainedAt) >= 0;
    const lf = sig.lastFeedback ?? {};
    const lastJoint = lf.joint ?? 0;             // 0..3
    const lastPump = lf.pump ?? 3;               // 1..3 (None/Mild/Good)
    const lastPerformance = lf.performance ?? 2; // 1=exceeded 2=met 3=struggled 4=failed

    // sore-for-M = (fresh check-in flagged M) OR (came in "Sore" today AND M
    // was trained in the most recent session ≤72h ago).
    const checkinFresh = sig.checkinAt != null && (now - sig.checkinAt) <= DAYS_4 && (now - sig.checkinAt) >= 0;
    const checkinSoreForM = checkinFresh && !!sig.checkinSore;
    const presessionSoreForM = sig.presessionSoreness === 3 && trainedWithin72h;
    const soreForM = checkinSoreForM || presessionSoreForM;
    const soreSource = presessionSoreForM ? 'recent' : 'checkin';

    let reasonCode = null;
    let setDelta = 0;
    let msgOpts = { muscleName: displayName };

    if (revertCounts[muscle] >= 2) {
      // Revert memory: the user has won this argument twice this meso. Hold.
      reasonCode = SESSION_REASON_CODES.HOLD_USER_PREF;
    } else if (lastJoint >= 2) {
      // R1: recent joint discomfort → hold, suppress any add.
      reasonCode = SESSION_REASON_CODES.HOLD_JOINT;
    } else if (soreForM && trainedWithin72h) {
      // R2: residual soreness on a recently trained muscle → drop 1 set, if the
      // landmark floor allows it (weekly stays ≥ mev) and the exercise keeps ≥1.
      if (projectedPlanned - 1 >= mev && plannedSets - 1 >= 1) {
        reasonCode = SESSION_REASON_CODES.DROP_RESIDUAL_SORENESS;
        setDelta = -1;
        msgOpts = { muscleName: displayName, source: soreSource, dayName: formatDay(lastTrainedAt) };
      }
      // else: clamped by the floor → silent (no event), an edge on very low
      // weekly volume where dropping further is inadvisable.
    } else if (soreForM) {
      // R3: sore but last trained >72h ago → stale/systemic, weekly's territory.
      reasonCode = SESSION_REASON_CODES.HOLD_STALE_SORENESS;
    } else {
      // R4 / R5: well-recovered, under-stimulated → consider +1.
      // C6 Phase 12 (D97): the feedback feeding this branch must be
      // RECENT. lastFeedback carries no date of its own and the soreness
      // branches are age-gated, so this was the one branch that survived
      // a long absence - a six-month-old "easy, mild pump" session read
      // as readiness for more volume on the first session back (absence
      // converted into evidence). Feedback older than the engine's
      // 14-day detraining boundary now certifies nothing; the branch
      // simply does not fire. Conservative only: no new adds, ever.
      const feedbackRecent = lastTrainedAt != null
        && (now - lastTrainedAt) <= DAYS_14 && (now - lastTrainedAt) >= 0;
      const stimulusReady =
        feedbackRecent &&
        lastPerformance <= 2 &&
        lastPump <= 2 &&
        projectedPlanned < mav &&
        !addedThisWeek.has(muscle);
      if (stimulusReady) {
        const blockedBySafety = safetyHold;
        const blockedByWeekly = weeklySignal === 'reduce';
        if (blockedBySafety) {
          reasonCode = SESSION_REASON_CODES.HOLD_SAFETY;       // R5
        } else if (blockedByWeekly) {
          reasonCode = SESSION_REASON_CODES.HOLD_WEEKLY_PRECEDENCE; // R5
        } else if (projectedPlanned + 1 <= mrv && projectedPlanned + 1 <= mav) {
          // R4: clamp keeps projected ≤ mav (and ≤ mrv) — the session layer
          // never pushes a muscle past its working ceiling on its own.
          reasonCode = SESSION_REASON_CODES.ADD_UNDER_STIMULUS;
          setDelta = +1;
        }
      }
      // R6: default → no event, no line.
    }

    if (!reasonCode) continue;

    // R5 honesty holds surface only after a "Sharp" pre-session answer.
    const isPrecedenceHold =
      reasonCode === SESSION_REASON_CODES.HOLD_SAFETY ||
      reasonCode === SESSION_REASON_CODES.HOLD_WEEKLY_PRECEDENCE;
    const show = SESSION_SHOWN_CODES.has(reasonCode)
      || (isPrecedenceHold && presessionIntent === 'sharp');

    candidates.push({
      exerciseId: ex.exerciseId,
      muscle,
      setDelta,
      adjustedSets: plannedSets + setDelta,
      plannedSets,
      reasonCode,
      reasonText: getSessionAdjustmentMessage(reasonCode, msgOpts),
      show,
      signals: {
        soreForM,
        soreSource: soreForM ? soreSource : null,
        lastTrainedAt,
        checkinAt: sig.checkinAt ?? null,
        presessionSoreness: sig.presessionSoreness ?? null,
        lastPump,
        lastPerformance,
        lastJoint,
        projectedPlanned,
        weeklySignal,
        safetyHold,
      },
    });
  }

  // Per-session cap: at most 2 ADJUSTED (nonzero delta) exercises. Recovery has
  // right of way, so drops are kept before adds when trimming. Holds (delta 0)
  // are unaffected — they cost no set change and stay logged.
  const nonzero = candidates.filter(c => c.setDelta !== 0);
  if (nonzero.length > 2) {
    const ranked = [...nonzero].sort((a, b) => a.setDelta - b.setDelta); // drops (−1) first
    const keep = new Set(ranked.slice(0, 2).map(c => c.exerciseId));
    return candidates.filter(c => c.setDelta === 0 || keep.has(c.exerciseId));
  }
  return candidates;
}

// Maps a session difficulty rating (1=Very Easy … 5=Brutal) to the adaptive
// engine's performance scale (1=exceeded … 4=failed), the same mapping
// WorkoutSummary uses when it runs the weekly adaptive engine. Null → 2 (met),
// a neutral read that triggers neither a drop nor an add on its own.
const _DIFFICULTY_TO_PERFORMANCE = { 1: 1, 2: 1, 3: 2, 4: 3, 5: 4 };

/**
 * Pure assembler: turns the raw reads (getSessionAdjustmentSignals + the
 * weekly/meso context) into the exact input object computeSessionAdjustments
 * expects. Kept pure and separate from the IO so the scale mappings (difficulty
 * → performance, sore-muscle CSV → keys, volumeSignal → reduce/hold/push) are
 * unit-testable without a database.
 */
export function buildSessionAdjustmentInput({
  todaysExercises = [],
  perMuscle = {},
  checkin = null,
  presessionSoreness = null,
  presessionIntent = null,
  coachOutput = null,
  isDeload = false,
  weeklyVolumeByMuscle = {},
  landmarks = {},
  recentSessionEvents = [],
  weekStartMs = 0,
  now = 0,
} = {}) {
  // Sore-muscle display names from the latest check-in → engine keys.
  const soreKeys = new Set();
  if (checkin && checkin.soreMuscles) {
    for (const name of String(checkin.soreMuscles).split(',').map(s => s.trim()).filter(Boolean)) {
      const keys = CHECKIN_MUSCLE_MAP[name] || [name.toLowerCase()];
      for (const k of keys) soreKeys.add(k);
    }
  }
  const checkinAt = checkin?.checkinAt ?? null;

  const muscleSignals = {};
  for (const ex of todaysExercises) {
    const m = ex.primaryMuscle;
    if (!m || muscleSignals[m]) continue;
    const last = perMuscle[m] ?? {};
    muscleSignals[m] = {
      lastTrainedAt: last.lastTrainedAt ?? null,
      lastFeedback: {
        pump: last.pump ?? 3,
        joint: last.joint ?? 0,
        performance: _DIFFICULTY_TO_PERFORMANCE[last.sessionDifficulty] ?? 2,
      },
      checkinSore: soreKeys.has(m),
      checkinAt,
      presessionSoreness: presessionSoreness ?? null,
      displayName: MUSCLE_DISPLAY_NAMES[m] || m,
    };
  }

  const vs = coachOutput?.volumeSignal ?? 0;
  const weeklySignal = vs < 0 ? 'reduce' : vs > 0 ? 'push' : 'hold';

  return {
    todaysExercises,
    muscleSignals,
    weeklyContext: {
      doneThisWeekByMuscle: weeklyVolumeByMuscle,
      landmarks,
      weeklySignal,
      safetyHold: !!coachOutput?.safetyHold,
      isDeload: !!isDeload,
      weekStartMs,
    },
    recentSessionEvents,
    now,
    presessionIntent,
  };
}

/**
 * C12 job 1: ONE session's strength performance, as a single number.
 *
 * The BEST canonical eligible estimated max in the session — the same law
 * buildExerciseMetricSeries already uses for the Lift Progress e1RM chart
 * (`Math.max(..., calculate1RM(weight, reps))`), so the two surfaces cannot
 * describe the same history differently. Shared here rather than duplicated;
 * liftProgress calls this too.
 *
 * It is deliberately the BEST set, not the average. A plateau must answer
 * "has this exercise's best demonstrated performance stopped progressing?",
 * and workout STRUCTURE legitimately moves a mean without the athlete
 * changing: adding back-off sets, adding hypertrophy work, or shifting the
 * rep-range distribution all drag a session average around while the top set
 * climbs, and dropping back-offs lifts the average while nothing improved.
 *
 * Eligibility is the canonical law (isE1rmEligibleRow, C10D): warm-ups,
 * myo-rep and rest-pause rows are refused, because cluster rows store SUMMED
 * reps. The estimator is the canonical calculate1RM (C10L). Returns 0 when
 * the session holds no eligible loaded work.
 */
export function sessionBestE1rm(sets = []) {
  let best = 0;
  for (const s of Array.isArray(sets) ? sets : []) {
    // EL-7: this is a TREND representative (detectPlateau,
    // detectProgressionConsistency below), never a PR check, so circuit
    // sets are excluded here too - isTrendEligibleRow, not isE1rmEligibleRow.
    if (!isTrendEligibleRow(s)) continue;
    const weight = Number(s?.weight) || 0;
    const reps = Number(s?.actualReps ?? s?.actual_reps) || 0;
    if (weight <= 0 || reps <= 0) continue;
    const est = calculate1RM(weight, reps);
    if (est > best) best = est;
  }
  return best;
}

// C12 job 1: "did this session beat the last one?" uses the app's EXISTING
// definition of a better estimated max — detectPR's 0.1% margin — rather than
// a new plateau-specific threshold.
const E1RM_PROGRESS_MARGIN = 1.001;

// C12 job 2: a plateau claims TIME, so the evidence must span time. Three
// sessions in one week is not a three-week plateau, and three sessions
// scattered across ten weeks is not one continuous stall. Reuses the existing
// 14-day plateau staleness concept as the maximum gap between consecutive
// pieces of evidence rather than introducing a second constant.
const PLATEAU_MIN_WEEKS = 3;
const PLATEAU_MIN_SPAN_DAYS = 14;
const PLATEAU_MAX_GAP_DAYS = 14;

/** Newest-first session timestamp: the latest set in the session. */
function sessionAt(sets = []) {
  let at = 0;
  for (const s of Array.isArray(sets) ? sets : []) {
    const t = Number(s?.createdAt ?? s?.created_at) || 0;
    if (t > at) at = t;
  }
  return at;
}

// Plateau detection for a specific exercise across sessions.
// exerciseSessions: array of sessions newest-first, each an array of sets for that exercise.
// Returns { plateau, consecutiveStalls, resolution, weeks, sessions, spanDays }
export function detectPlateau(exerciseSessions = [], _repMin = 6, _repMax = 12) {
  // C10D RD6-3 (detection-basis half): only rows the app already accepts as
  // comparable progression evidence may decide this. isE1rmEligibleRow is
  // that existing law - the same one detectProgressionConsistency uses -
  // and it rejects warm-ups, myo-reps and rest-pause rows. Cluster sets
  // store SUMMED reps, so an unfiltered session average could invent a rep
  // jump that never happened (erasing a real plateau) or collapse one into
  // existence; a warm-up added or dropped between sessions could do the
  // same. Bad evidence must not decide that a lift is plateaued, in either
  // direction.
  //
  // Nothing else moves: the four-session window, the three adjacent
  // comparisons, the session-average basis, the +-0.01kg/+-0.5rep
  // thresholds and the 2/3-stall resolutions are all untouched. Sessions
  // left with no eligible rows drop out rather than counting as a stalled
  // comparison, and if fewer than three sessions survive the existing
  // insufficient/no-plateau state is returned - never a compensating
  // relaxation of the evidence requirement.
  const NONE = { plateau: false, consecutiveStalls: 0, resolution: null, weeks: null, sessions: 0, spanDays: 0 };
  // EL-7: isTrendEligibleRow, not isE1rmEligibleRow - a circuit set is
  // PR-eligible but must never decide a plateau (judging nothing, teaching
  // nothing).
  const eligibleSessions = (Array.isArray(exerciseSessions) ? exerciseSessions : [])
    .map((sets) => (Array.isArray(sets) ? sets.filter(isTrendEligibleRow) : []))
    .filter((sets) => sets.length > 0);
  if (eligibleSessions.length < 3) return NONE;

  // Look at up to the 4 most recent sessions (3 adjacent comparisons), so a
  // run of 3 consecutive stalls can actually be detected. The previous
  // slice(0, 3) only ever yielded 2 comparisons, capping consecutiveStalls
  // at 2, which made the "3+ stalls -> swap_exercise" resolution dead code.
  const recent = eligibleSessions.slice(0, 4);
  let consecutiveStalls = 0;

  for (let i = 0; i < recent.length - 1; i++) {
    // C12 job 1: compare each session's BEST eligible estimated max against
    // the previous session's. The old basis was the session AVERAGE weight
    // and average reps, which measured workout structure as much as
    // performance: three back-off sets added to an improving top set pulled
    // the mean down and read as a stall, and dropping back-offs lifted the
    // mean and read as progress.
    const curr = sessionBestE1rm(recent[i]);
    const prev = sessionBestE1rm(recent[i + 1]);
    if (!(curr > 0) || !(prev > 0)) continue;
    // "Progressed" is the app's existing better-estimated-max test.
    if (curr > prev * E1RM_PROGRESS_MARGIN) consecutiveStalls = 0;
    else consecutiveStalls++;
  }

  if (consecutiveStalls < 2) {
    return { ...NONE, consecutiveStalls };
  }

  // ── C12 job 2: the run must span real time, in LOCAL weeks ──────────────
  // The stalled run is the consecutiveStalls + 1 sessions ending at the
  // newest. Every date question below is answered with the app's DST-safe
  // local helpers, never by dividing milliseconds by a week constant.
  //
  // C13 job 2 separates two different questions that were sharing one
  // window. QUALIFICATION - "is there a current plateau at all?" - stays on
  // the recent four-session window, which is all it ever needed. DURATION -
  // "how far back does this stall actually reach?" - is a different
  // question, and answering it from the same four sessions under-reported a
  // genuine ten-week stall as three or four weeks. Once qualified, the run
  // is extended backwards through the FULL eligible history while the same
  // two laws keep holding: no progression, and no gap beyond the existing
  // 14-day continuity boundary.
  const run = recent.slice(0, consecutiveStalls + 1).map(sessionAt).filter((t) => t > 0);
  if (run.length < consecutiveStalls + 1) return { ...NONE, consecutiveStalls };
  for (let i = consecutiveStalls + 1; i < eligibleSessions.length; i++) {
    const olderAt = sessionAt(eligibleSessions[i]);
    if (!(olderAt > 0)) break;                       // undated: stop, never guess
    const gap = localDaysElapsed(olderAt, run[run.length - 1]);
    if (gap > PLATEAU_MAX_GAP_DAYS) break;           // the stall is not continuous here
    const older = sessionBestE1rm(eligibleSessions[i]);
    const newer = sessionBestE1rm(eligibleSessions[i - 1]);
    if (!(older > 0) || !(newer > 0)) break;
    if (newer > older * E1RM_PROGRESS_MARGIN) break; // real progression ends the stall
    run.push(olderAt);
  }
  const newest = run[0];
  const oldest = run[run.length - 1];

  // (a) at least three DISTINCT local calendar weeks. Mon/Wed/Fri in one
  //     week is three sessions, not a three-week plateau. Measured over the
  //     EXTENDED run, so a longer continuous stall only ever helps.
  const distinctWeeks = new Set(run.map((t) => localWeekStartMs(t))).size;
  // (b) at least a fortnight of local days end to end.
  const spanDays = localDaysElapsed(oldest, newest);
  // (c) no hole bigger than the existing 14-day plateau staleness boundary:
  //     week 1 / week 7 / week 10 is sparse history, not one current stall.
  let biggestGap = 0;
  for (let i = 0; i < run.length - 1; i++) {
    const gap = localDaysElapsed(run[i + 1], run[i]);
    if (gap > biggestGap) biggestGap = gap;
  }
  if (distinctWeeks < PLATEAU_MIN_WEEKS
    || spanDays < PLATEAU_MIN_SPAN_DAYS
    || biggestGap > PLATEAU_MAX_GAP_DAYS) {
    return { ...NONE, consecutiveStalls };
  }

  // C13 job 2: `weeks` now means ELAPSED duration, not a count of calendar
  // buckets touched. The old meaning called a 24-day stall "3 weeks" because
  // its evidence happened to fall in three calendar weeks; the two are
  // reported separately now so neither name is misleading. calendarWeeks is
  // retained because it is what the QUALIFICATION gate above tests.
  const durationWeeks = Math.max(1, Math.round(spanDays / 7));

  return {
    plateau: true,
    consecutiveStalls,
    sessions: run.length,
    // Elapsed duration of the continuous stall, in whole weeks.
    weeks: durationWeeks,
    durationWeeks,
    calendarWeeks: distinctWeeks,
    spanDays,
    resolution: consecutiveStalls >= 3
      ? 'swap_exercise'      // 3+ stalls: substitute this exercise for 4-6 weeks
      : 'change_rep_range',  // 2 stalls: try a different rep range (e.g. 15-20) for 3 weeks
    // C6 RD6-3 (D97-25) named the measured quantity because the session
    // AVERAGE could not support a "no progress" claim. C12 changed the
    // measurement to the BEST set, which CAN support it, and job 2
    // guarantees the time span, so the sentence now states both honestly.
    // It still invites a look rather than prescribing, and carries no
    // guilt language: nothing here says stuck, failing, behind or should.
    message: consecutiveStalls >= 3
      ? `Your best set here hasn't moved in about ${durationWeeks} weeks. Worth a look: a different exercise for this muscle for 4-6 weeks is a solid reset.`
      : `Your best set here hasn't moved in about ${durationWeeks} weeks. Worth a look: a higher rep range (15-20) for a few weeks can restart progress.`,
  };
}

/**
 * Campaign 9 closeout: progression consistency for ONE exercise.
 *
 * This is deliberately detectPlateau's mirror image, not a new formula. It
 * reuses that function's comparable-exposure model exactly: the same
 * newest-first session list, the same four-session window (three adjacent
 * comparisons), the same canonical eligibility (isE1rmEligibleRow, C10D) and
 * - since C13 job 1 - the same SESSION REPRESENTATIVE and the same progress
 * margin, so the app can never say a muscle is both progressing and
 * plateaued from the same data.
 *
 * C13 job 1: that mirror was BROKEN by Campaign 12. Plateau moved to the
 * best canonical eligible e1RM per session while this function kept
 * comparing session AVERAGE weight and AVERAGE reps, so one exercise history
 * could read 'progressing' for Campaign 9's ranking and 'plateaued' for the
 * user at the same moment - purely because the two summarised a session
 * differently. Both now call sessionBestE1rm and both call a gain
 * `curr > prev * E1RM_PROGRESS_MARGIN`.
 *
 * The question this answers is therefore "does this exercise's best
 * demonstrated strength performance show a consistent improving pattern?",
 * not "did the average set in the workout get heavier?" - a mean moves when
 * back-off sets are added or dropped without the athlete changing at all.
 *
 * WHAT THIS MEANS, AND WHAT IT DOES NOT
 *
 * 'progressing' says: this user has been able to add load or reps on this
 * exercise, recently, across enough sessions to mean something. That is an
 * observation about them and this movement.
 *
 * It is NOT a claim that the exercise produces more hypertrophy than any
 * other, and nothing may present it as one. Ordinary training logs cannot
 * support that construct.
 *
 * @param {Array<Array<object>>} exerciseSessions newest-first, one array of
 *   sets per session, all for the SAME exercise.
 * @returns {{status:'progressing'|'holding'|'insufficient', gains:number, comparisons:number}}
 */
export function detectProgressionConsistency(exerciseSessions = []) {
  // EL-7: isTrendEligibleRow - a circuit set is never trend evidence.
  const eligible = (Array.isArray(exerciseSessions) ? exerciseSessions : [])
    .map((sets) => (Array.isArray(sets) ? sets.filter(isTrendEligibleRow) : []))
    .filter((sets) => sets.length > 0);
  // Same observation floor as detectPlateau: fewer than three sessions is
  // not a trend, it is a couple of data points.
  if (eligible.length < 3) return { status: 'insufficient', gains: 0, comparisons: 0 };

  const recent = eligible.slice(0, 4);
  let gains = 0;
  let comparisons = 0;
  for (let i = 0; i < recent.length - 1; i++) {
    // C13 job 1: the SAME representative and margin detectPlateau uses.
    const curr = sessionBestE1rm(recent[i]);
    const prev = sessionBestE1rm(recent[i + 1]);
    if (!(curr > 0) || !(prev > 0)) continue;
    comparisons += 1;
    if (curr > prev * E1RM_PROGRESS_MARGIN) gains += 1;
  }
  if (comparisons < 2) return { status: 'insufficient', gains, comparisons };
  // A majority of the recent comparisons moved. Anything less is honest
  // "holding", never a negative claim about the exercise.
  return { status: gains >= Math.ceil(comparisons / 2) ? 'progressing' : 'holding', gains, comparisons };
}

// RP-classic deload prescription
// prevSets: last session's working sets for this exercise (to anchor week-1 loads)
// isFirstHalf: true = first 2 sessions of deload week (week-1 load, 50% reps)
//              false = last 2 sessions (50% of week-1 load, 50% reps)
// Returns array of { weight, reps, setType, rir, isDeload } per working set
export function generateDeloadPrescription(prevSets, isFirstHalf = true) {
  if (!prevSets || prevSets.length === 0) return [];

  const working = prevSets.filter(
    s => (s.setType || s.set_type || 'straight') !== 'warmup',
  );
  if (!working.length) return [];

  return working.map(set => {
    // CALC-6: clamp to >= 0 so a stray negative logged weight can't produce a
    // negative prescribed load (|| 0 only caught 0/null, not negatives).
    const baseWeight = Math.max(0, set.weight || 0);
    const baseReps = set.actualReps || set.actual_reps || set.reps || 8;
    const deloadWeight = isFirstHalf ? baseWeight : Math.round(baseWeight * 0.5 * 4) / 4;
    const deloadReps = Math.max(1, Math.round(baseReps * 0.5));

    return {
      weight: deloadWeight,
      reps: deloadReps,
      setType: 'straight',
      rir: 4,
      isDeload: true,
    };
  });
}

// Identify muscle groups that have been consistently below MEV across recent weeks.
// weeklyVolumeHistory: array of {muscle -> workingSets} objects, oldest first
// minWeeks: how many consecutive below-MEV weeks to flag (default 3)
// Returns array of { muscle, displayName, avgSets, mev, weeksBelow } sorted by priority
export function detectLaggingMuscles(weeklyVolumeHistory = [], minWeeks = 3) {
  if (weeklyVolumeHistory.length < minWeeks) return [];
  const recentWeeks = weeklyVolumeHistory.slice(-minWeeks);
  const results = [];
  for (const muscle of Object.keys(VOLUME_LANDMARKS)) {
    const { mev } = VOLUME_LANDMARKS[muscle];
    if (mev <= 0) continue; // skip muscles with no effective minimum (e.g. front delts)
    let weeksBelow = 0;
    let totalSets = 0;
    for (const week of recentWeeks) {
      const sets = week[muscle] ?? 0;
      totalSets += sets;
      if (sets < mev) weeksBelow++;
    }
    if (weeksBelow >= minWeeks) {
      results.push({
        muscle,
        displayName: MUSCLE_DISPLAY_NAMES[muscle] || muscle,
        avgSets: Math.round((totalSets / recentWeeks.length) * 10) / 10,
        mev,
        weeksBelow,
      });
    }
  }
  // Sort: muscles with the most weeks below MEV first, then by largest deficit
  results.sort((a, b) =>
    b.weeksBelow - a.weeksBelow ||
    (b.mev - b.avgSets) - (a.mev - a.avgSets),
  );
  return results;
}
