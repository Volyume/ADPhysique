// All 10 hypertrophy algorithms, pure functions, no side effects

import {
  SESSION_REASON_CODES,
  SESSION_SHOWN_CODES,
  CHECKIN_MUSCLE_MAP,
  getSessionAdjustmentMessage,
} from './whyThisTemplates';

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
  // at the 20-rep estimate rather than extrapolate into nonsense. Behaviour for
  // 1-20 reps is unchanged. (A2-040.)
  const r = Math.min(reps0, 20);
  const epley = w * (1 + r / 30);
  const brzycki = w / (1.0278 - 0.0278 * r);

  if (r <= 10) return epley * 0.6 + brzycki * 0.4;
  return (epley + brzycki) / 2;
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

export function calculateTonnage(sets, exerciseTypeById = null) {
  return sets.reduce((total, s) => {
    if (isHardSet(s) && isLoadBearingSet(s, exerciseTypeById)) {
      total += (s.weight || 0) * (s.actualReps || s.actual_reps || 0);
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
export function summariseWorkoutSets(sets) {
  const list = Array.isArray(sets) ? sets : [];
  const workingSetCount = list.filter(s => (s.setType ?? s.set_type) !== 'warmup').length;
  return {
    totalSets: list.length,
    workingSetCount,
    tonnage: calculateTonnage(list),
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

// Algorithm 2: Double Progression Suggestion.
//
// The live in-set hint. It shares the same progression CONTRACT as
// computeSetTargets (the end-of-session per-set engine) so the two never give
// opposite advice on the same data:
//   - load only increases when RIR was actually LOGGED and showed headroom
//     (>= 1). Unlogged RIR holds and prompts for it -- novices under-estimate
//     RIR, so an optimistic increase on missing data drives premature overload.
//   - rep band defaults are 6-12 (matching computeSetTargets), so an exercise
//     with no configured min/max can still progress instead of maintaining
//     forever, and the decrease branch can actually fire.
export function getProgressionSuggestion(currentSets, prevWorkoutSets, targetRepsMin, targetRepsMax, units = 'kg') {
  if (!prevWorkoutSets || prevWorkoutSets.length === 0) {
    return { action: 'baseline', message: 'First time logging this exercise. Any weight is a great starting point.' };
  }

  const min = targetRepsMin || 6;
  const max = targetRepsMax || 12;

  const prevAvgReps =
    prevWorkoutSets.reduce((sum, s) => sum + (s.actualReps || s.actual_reps || 0), 0) /
    prevWorkoutSets.length;

  const prevAvgWeight =
    prevWorkoutSets.reduce((sum, s) => sum + (s.weight || 0), 0) / prevWorkoutSets.length;

  // Only sets that actually logged RIR count towards headroom. No logged RIR =>
  // unknown headroom => hold (never optimistically add load).
  const ratedSets = prevWorkoutSets.filter(s => s.rir != null);
  const rirLogged = ratedSets.length > 0;
  const prevAvgRIR = rirLogged
    ? ratedSets.reduce((sum, s) => sum + s.rir, 0) / ratedSets.length
    : null;

  if (prevAvgReps >= max) {
    if (!rirLogged) {
      return {
        action: 'maintain',
        message: 'You hit the top of the range. Note how many reps you had left in the tank and we\'ll tell you whether to add weight.',
        suggestedWeight: prevAvgWeight,
      };
    }
    if (prevAvgRIR >= 1) {
      // CALC-5: a bodyweight / unloaded exercise (prevAvgWeight <= 0) has no load
      // to add — suggest more reps instead of a nonsensical "+1.3kg".
      if (prevAvgWeight <= 0) {
        return {
          action: 'increase_reps',
          message: 'Strong sets. Add a rep or two next session.',
          suggestedWeight: 0,
        };
      }
      const increment = defaultIncrement(prevAvgWeight, units);
      return {
        action: 'increase_weight',
        message: `Great work! Try ${(prevAvgWeight + increment).toFixed(1)}${units} next session.`,
        suggestedWeight: prevAvgWeight + increment,
      };
    }
    // Hit the top of the range but ground it out (RIR < 1): hold and recover.
    return {
      action: 'maintain',
      message: `Keep ${prevAvgWeight.toFixed(1)}${units}. Recover the rep quality before adding weight.`,
      suggestedWeight: prevAvgWeight,
    };
  }

  if (prevAvgReps < min && rirLogged && prevAvgRIR <= 1) {
    const decrement = defaultIncrement(prevAvgWeight, units);
    return {
      action: 'decrease_weight',
      message: `Reduce to ${(prevAvgWeight - decrement).toFixed(1)}${units} and focus on rep quality.`,
      suggestedWeight: Math.max(0, prevAvgWeight - decrement),
    };
  }

  return {
    action: 'maintain',
    message: `Keep ${prevAvgWeight.toFixed(1)}${units}. Aim for ${Math.ceil(max)} reps next set.`,
    suggestedWeight: prevAvgWeight,
  };
}

// Per-set targets for next session using double-progression model with RIR awareness
export function computeSetTargets(prevSets, repMin, repMax, units = 'kg', options = {}) {
  if (!prevSets || prevSets.length === 0) return { targets: [], reason: null };

  const prevWorking = prevSets.filter(
    s => (s.setType || s.set_type || 'straight') !== 'warmup',
  );
  if (prevWorking.length === 0) return { targets: [], reason: null };

  const min = repMin || 6;
  const max = repMax || 12;

  // Increment by exercise category
  const {
    exerciseCategory = 'compound',
    incrementKg = null,
    prevPrevSets = [],  // sets from the workout before last, for consecutive-miss detection
    layoffMultiplier = 1.0, // < 1 when returning from a training break
  } = options;

  function getIncrement(weight) {
    if (incrementKg != null) return incrementKg;
    return defaultIncrement(weight, units, exerciseCategory);
  }

  const prevPrevWorking = prevPrevSets.filter(
    s => (s.setType || s.set_type || 'straight') !== 'warmup',
  );

  const targets = [];

  for (let i = 0; i < prevWorking.length; i++) {
    const set = prevWorking[i];
    const prevWeight = set.weight || 0;
    const prevReps = set.actualReps || set.actual_reps || 0;
    const prevRIR = set.rir ?? null; // null = not logged

    let targetWeight = prevWeight;
    let targetMin = min;
    let targetMax = max;
    let action = 'maintain';

    if (prevReps >= max) {
      // Hit top of band, only increase load if RIR was logged AND ≥ 1.
      // Null RIR → hold weight. Novice lifters systematically underestimate their
      // RIR by 2-4 reps; optimistically increasing load when RIR is unlogged drives
      // premature overload. Log RIR to unlock progression suggestions.
      const hadHeadroom = prevRIR !== null && prevRIR >= 1;
      if (hadHeadroom) {
        const increment = getIncrement(prevWeight);
        // 5% session-over-session cap. Always apply it: the previous form
        // (maxJump > 0.5 ? maxJump : increment) disabled the cap entirely
        // for loads <= 10 units, so a 5 kg dumbbell could jump the full
        // default increment (a ~25% jump). The +0.25 floor below guarantees
        // progress when 5% rounds to zero.
        const maxJump = prevWeight * 0.05;
        const capped = Math.min(increment, maxJump);
        // Round to nearest 0.25
        const rounded = Math.round(capped * 4) / 4;
        targetWeight = prevWeight + Math.max(0.25, rounded);
        action = 'increase';
      } else {
        // Grinded it out with RIR 0, same weight, push for +1 rep is not valid
        // so just hold and let RIR recover
        targetMin = min;
        action = 'maintain';
      }
    } else if (prevReps < min && min > 1) {
      const missAmount = min - prevReps;
      // Only auto-drop if: missed by ≥2 AND the session before that also missed by ≥2.
      // A single miss → hold weight and aim for the rep minimum again.
      const prevPrevSet = prevPrevWorking[i];
      const prevPrevReps = prevPrevSet
        ? (prevPrevSet.actualReps ?? prevPrevSet.actual_reps ?? 9999)
        : 9999;
      const consecutiveMiss = missAmount >= 2 && (min - prevPrevReps) >= 2;
      if (consecutiveMiss) {
        const decrement = getIncrement(prevWeight);
        targetWeight = Math.max(0, prevWeight - decrement);
        action = 'decrease';
      } else {
        action = 'maintain';
      }
    } else {
      // In range, same weight, +1 rep
      targetMin = Math.min(prevReps + 1, max);
      action = 'add_rep';
    }

    // Apply layoff multiplier (returning from a training break ≥7 days).
    // Rounds to nearest 0.25 to stay on standard plate increments.
    if (layoffMultiplier < 1.0 && targetWeight > 0) {
      targetWeight = Math.round(targetWeight * layoffMultiplier * 4) / 4;
      action = 'decrease';
    }

    targets.push({ weight: targetWeight, repsMin: targetMin, repsMax: targetMax, prevWeight, prevReps, prevRIR, action });
  }

  // Second pass: ensure no set targets below the session's overall best weight.
  // If Set 1 was 5kg×12 but Set 3 was 8kg×10, Set 1's target should be anchored
  // to 8kg (the session high-water mark), not to its own 5kg history.
  const bestPrevW = prevWorking.reduce((m, s) => Math.max(m, s.weight || 0), 0);
  const bestPrevSet = bestPrevW > 0
    ? prevWorking.find(s => (s.weight || 0) === bestPrevW) ?? null
    : null;

  if (bestPrevSet) {
    const bw = bestPrevW;
    const br = bestPrevSet.actualReps ?? bestPrevSet.actual_reps ?? 0;
    const bRIR = bestPrevSet.rir ?? null;
    for (let i = 0; i < targets.length; i++) {
      if (targets[i].prevWeight < bw) {
        let newWeight = bw;
        let newAction = 'anchor';
        if (br >= max) {
          const hadHeadroom = bRIR !== null && bRIR >= 1;
          if (hadHeadroom) {
            const inc = getIncrement(bw);
            const cap = bw * 0.05;
            const capped = Math.min(inc, cap > 0.5 ? cap : inc);
            newWeight = bw + Math.max(0.25, Math.round(capped * 4) / 4);
            newAction = 'increase';
          } else {
            newAction = 'maintain';
          }
        } else if (br >= min) {
          newAction = 'add_rep';
        } else {
          newAction = 'maintain';
        }
        targets[i] = { ...targets[i], weight: newWeight, action: newAction, anchored: true };
      }
    }
  }

  const allIncrease = targets.every(t => t.action === 'increase');
  const anyDecrease = targets.some(t => t.action === 'decrease');
  const anyIncrease = targets.some(t => t.action === 'increase');
  const allMaintain = targets.every(t => t.action === 'maintain');
  const anyAnchored = targets.some(t => t.anchored);
  const isLayoff = layoffMultiplier < 1.0;
  const noRIRLogged = targets.every(t => t.prevRIR === null);
  const repsHitTopNoRIR = noRIRLogged && targets.every(t => t.prevReps >= max);

  let reason;
  if (isLayoff) {
    const pct = Math.round((1 - layoffMultiplier) * 100);
    reason = `Loads reduced by ${pct}% for your first session back after a break. Rebuild over the next 1 to 2 weeks.`;
  } else if (repsHitTopNoRIR) {
    reason = `You hit the top of the range. Next time, note how many reps you had left and we'll tell you whether to add weight.`;
  } else if (anyAnchored) {
    const n = targets.filter(t => t.anchored).length;
    reason = `${n === targets.length ? 'All' : n} set target${n > 1 ? 's' : ''} raised to match your best set so far (${bestPrevW}${units}), not just this set's own history.`;
  } else if (allIncrease) {
    const inc = (targets[0].weight - targets[0].prevWeight).toFixed(2).replace(/\.?0+$/, '');
    reason = `All sets hit the top of the range. Add ${inc}${units} next session.`;
  } else if (anyDecrease) {
    reason = `Load dropped: reps missed by 2 or more for two sessions in a row. Reset and rebuild.`;
  } else if (anyIncrease) {
    reason = `Partial progression: add weight on the sets where you hit ${max} reps.`;
  } else if (allMaintain) {
    reason = `Same load for now. Push for ${max} reps on each set before adding weight.`;
  } else {
    reason = `Keep the same load. Push for ${max} reps on each set before increasing weight.`;
  }

  return { targets, reason };
}

// Algorithm 3: PR Detection
export function detectPR(newSet, historicalSets, exercise, units = 'kg') {
  const prs = [];
  const weight = newSet.weight || 0;
  const reps = newSet.actualReps || newSet.actual_reps || 0;

  if (!weight || !reps) return prs;

  const new1RM = calculate1RM(weight, reps);

  const best1RM = historicalSets.reduce((best, s) => {
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

// Algorithm 6: Auto-Regulation
// perMuscleStimulusRatings: optional array of { primaryMuscle, pump, connection } from
// post-exercise ratings. When present, per-muscle pump overrides the session-level overallPump
// for muscle-specific volume suggestions, enabling targeted recommendations.
export function getAutoRegSuggestion(workoutFeedback, weeklyVolumeByMuscle, customLandmarks = null, perMuscleStimulusRatings = null) {
  const suggestions = [];
  const {
    sessionDifficulty = 3,
    overallPump = 2,
    soreness24hBefore = 1,
    fatigueLevel = 2,
    jointDiscomfort = 0,
  } = workoutFeedback || {};

  // Build per-muscle pump map from exercise ratings when available.
  // Falls back to session-level overallPump for muscles with no rating.
  const musclePumpMap = {};
  if (perMuscleStimulusRatings?.length) {
    for (const r of perMuscleStimulusRatings) {
      if (r.primaryMuscle) {
        musclePumpMap[r.primaryMuscle] = r.pump ?? overallPump;
      }
    }
  }

  if (sessionDifficulty >= 4 && soreness24hBefore >= 2) {
    suggestions.push({
      type: 'reduce_volume',
      message: 'Your body is showing fatigue. Drop 1 or 2 sets next week and let it catch up.',
    });
  } else if (sessionDifficulty <= 2 && soreness24hBefore === 0 && fatigueLevel >= 4) {
    suggestions.push({
      type: 'add_volume',
      message: "You're recovering well. You can add a set or two next week if you want to push things forward.",
    });
  }

  if (jointDiscomfort >= 2) {
    suggestions.push({
      type: 'reduce_weight',
      message: 'Joint discomfort noted. Keep the same number of sets but ease off the weight slightly next session.',
    });
  }

  if (overallPump === 3 && sessionDifficulty <= 3 && !perMuscleStimulusRatings?.length) {
    suggestions.push({
      type: 'increase_load',
      message: 'Good session. You can push a little harder next time: try adding weight or an extra set.',
    });
  }

  for (const [muscle, data] of Object.entries(weeklyVolumeByMuscle || {})) {
    const landmarks = customLandmarks?.[muscle] || VOLUME_LANDMARKS[muscle];
    if (!landmarks) continue;

    if (data.workingSets > landmarks.mrv) {
      suggestions.push({
        type: 'deload_muscle',
        muscle,
        message: `${MUSCLE_DISPLAY_NAMES[muscle] || muscle}: over target this week (${Math.round(data.workingSets)} sets). Consider doing a little less next session.`,
      });
      continue;
    }

    // Per-muscle pump signal: low pump (1-2) on a well-recovered muscle may indicate
    // poor exercise selection or need for technique adjustment, not necessarily volume issue.
    // High pump (4-5) with volume near MAV suggests the current exercise selection is working.
    const musclePump = musclePumpMap[muscle] ?? overallPump;
    if (musclePump <= 2 && data.workingSets >= (landmarks.mev || 2)) {
      suggestions.push({
        type: 'swap_exercise',
        muscle,
        message: `${MUSCLE_DISPLAY_NAMES[muscle] || muscle}: pump was low this session. Try a different exercise or check your technique before adding volume.`,
      });
    } else if (musclePump >= 4 && data.workingSets < (landmarks.mav || landmarks.mrv)) {
      suggestions.push({
        type: 'add_muscle_volume',
        muscle,
        message: `${MUSCLE_DISPLAY_NAMES[muscle] || muscle}: working hard. You have room to add a set or push harder next week.`,
      });
    }
  }

  if (suggestions.length === 0) {
    suggestions.push({ type: 'maintain', message: "Training is on track. Keep doing what you're doing." });
  }

  return suggestions;
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
  const avgJointDiscomfort =
    last4WeeksData.reduce((sum, w) => sum + (w.avgJointDiscomfort || 0), 0) /
    last4WeeksData.length;
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
  const highSorenessWeeks = last4WeeksData.filter(w => (w.avgSoreness || 0) >= 2.5).length;
  if (highSorenessWeeks >= 3 && weeksSinceDeload >= 4) {
    score += 20;
    reasons.push('Sustained soreness across 3 or more weeks');
  }

  return { deload: score >= 50, reasons };
}

// Stretch position score, Maeo et al. (2023), Pedrosa et al. (2022), Wolf et al. (2023)
// confirm that exercises training the target muscle at long length produce measurably
// greater hypertrophy per set. Prefer high-stretch alternatives when substituting.
const STRETCH_SCORE = { high: 2, medium: 1, low: 0 };

// Algorithm 8: Exercise Substitutes
export function getExerciseSubstitutes(targetExercise, allExercises, userEquipment = []) {
  const primaryMuscle = (
    targetExercise.primaryMuscle ||
    targetExercise.primary_muscle ||
    ''
  ).toLowerCase();
  const targetFatigue = targetExercise.fatigueCost || targetExercise.fatigue_cost || 3;
  const targetStretch = targetExercise.tension_at_stretch || targetExercise.tensionAtStretch || 'medium';
  const targetId = targetExercise.id;

  const candidates = allExercises.filter(ex => {
    if (ex.id === targetId) return false;
    const exMuscle = (ex.primaryMuscle || ex.primary_muscle || '').toLowerCase();
    if (exMuscle !== primaryMuscle) return false;
    const exFatigue = ex.fatigueCost || ex.fatigue_cost || 3;
    if (exFatigue > targetFatigue + 1) return false;
    if (userEquipment.length > 0) {
      const exEquipment = (ex.equipment || '').toLowerCase();
      const hasEquipment = userEquipment.some(e =>
        exEquipment.includes(e.toLowerCase()) || exEquipment === 'bodyweight',
      );
      if (!hasEquipment) return false;
    }
    return true;
  });

  candidates.sort((a, b) => {
    const sfrA = a.stimulusToFatigueRatio || a.stimulus_to_fatigue_ratio || 3;
    const sfrB = b.stimulusToFatigueRatio || b.stimulus_to_fatigue_ratio || 3;
    const fatigueA = a.fatigueCost || a.fatigue_cost || 3;
    const fatigueB = b.fatigueCost || b.fatigue_cost || 3;
    const stretchA = STRETCH_SCORE[a.tension_at_stretch || a.tensionAtStretch || 'medium'] ?? 1;
    const stretchB = STRETCH_SCORE[b.tension_at_stretch || b.tensionAtStretch || 'medium'] ?? 1;
    // Composite: SFR primary, stretch bonus secondary (scaled to 0–0.6 so it doesn't override SFR),
    // fatigue tiebreaker
    const scoreA = sfrA + stretchA * 0.3;
    const scoreB = sfrB + stretchB * 0.3;
    return scoreB - scoreA || fatigueA - fatigueB;
  });

  return candidates.slice(0, 3).map(ex => ({
    exercise: ex,
    reason: buildSubstituteReason(ex, targetExercise, targetStretch),
  }));
}

function buildSubstituteReason(sub, target, targetStretch = 'medium') {
  const subSFR = sub.stimulusToFatigueRatio || sub.stimulus_to_fatigue_ratio || 3;
  const targetSFR = target.stimulusToFatigueRatio || target.stimulus_to_fatigue_ratio || 3;
  const subFatigue = sub.fatigueCost || sub.fatigue_cost || 3;
  const targetFatigue = target.fatigueCost || target.fatigue_cost || 3;
  const subStretch = sub.tension_at_stretch || sub.tensionAtStretch || 'medium';

  if (subStretch === 'high' && targetStretch !== 'high') {
    return 'Trains this muscle at a longer length. Evidence suggests this produces slightly more growth per set.';
  }
  if (subSFR > targetSFR) return 'Better match for this muscle with less overall fatigue.';
  if (subFatigue < targetFatigue) return 'Less demanding overall. Good for busy or high-volume weeks.';
  return 'Same muscles, different movement. Good for mixing things up over a training block.';
}

// RP-style soreness × performance → volume decision
// Inputs use numeric scales:
//   soreness:    1=none  2=healed_early  3=healed_on_time  4=still_sore
//   performance: 1=exceeded  2=met  3=struggled  4=failed_to_match
//   pump:        1=none  2=low  3=moderate  4=great
//   joint:       0=none  1=low  2=moderate  3=high
// Returns: { decision, delta, reasonCode, reasonText }
export function computeAdaptiveDecision({ soreness = 2, performance = 2, pump = 3, joint = 0 } = {}) {
  // Joint pain overrides everything, rotate the exercise
  if (joint >= 3) {
    return {
      decision: 'rotate_exercise',
      delta: 0,
      reasonCode: 'joint_high',
      reasonText: 'High joint discomfort. Rotating to a lower-risk exercise next session.',
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
    const decision = computeAdaptiveDecision({
      soreness: data.soreness ?? 2,
      performance: data.performance ?? 2,
      pump: data.pump ?? 3,
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
      const stimulusReady =
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

// Effective set weighting by RIR proximity, continuous curve per Robinson et al. (2024,
// Sports Medicine 54:2209–2231). The dose-response is monotonic with no discontinuity at
// RIR 2: "marginal slopes for estimated RIR were negative and their confidence intervals did
// not contain a null point estimate." RIR 0–2 are functionally equivalent (full credit);
// credit decreases continuously above RIR 2 down to zero at RIR 8+.
// Null RIR: treated as RIR ~2 (conservative, novices routinely over-estimate headroom).
export function getSetEffectivenessWeight(rir) {
  if (rir === null || rir === undefined) return 0.9;
  if (rir <= 2) return 1.0;
  if (rir === 3) return 0.85;
  if (rir === 4) return 0.70;
  if (rir === 5) return 0.50;
  if (rir <= 7) return 0.25;
  return 0.0; // RIR 8+, insufficient stimulus
}

// Weighted effective sets per muscle, accounts for proximity to failure.
// Returns { [muscle]: { workingSets, effectiveSets, reps, tonnage } }
export function calculateEffectiveSets(sets, exerciseMap = {}) {
  const volumeByMuscle = {};

  for (const set of sets) {
    const setType = set.setType || set.set_type || 'straight';
    if (setType === 'warmup') continue;

    const exerciseId = set.exerciseId || set.exercise_id;
    const exercise = exerciseMap[exerciseId];
    if (!exercise) continue;

    let primaryMuscle = (exercise.primaryMuscle || exercise.primary_muscle || '').toLowerCase();
    if (primaryMuscle === 'shoulders') primaryMuscle = 'side_delts';

    // Effective-volume weight: prefer logged RIR; fall back to RPE-derived RIR
    // (RIR ≈ 10 − RPE); null when neither is present.
    let rirForWeight = null;
    if (set.rir != null) rirForWeight = set.rir;
    else if (set.rpe != null) rirForWeight = 10 - set.rpe;
    const weight = getSetEffectivenessWeight(rirForWeight);

    if (primaryMuscle) {
      if (!volumeByMuscle[primaryMuscle]) {
        volumeByMuscle[primaryMuscle] = { workingSets: 0, effectiveSets: 0, reps: 0, tonnage: 0 };
      }
      volumeByMuscle[primaryMuscle].workingSets += 1;
      volumeByMuscle[primaryMuscle].effectiveSets += weight;
      volumeByMuscle[primaryMuscle].reps += set.actualReps || set.actual_reps || 0;
      volumeByMuscle[primaryMuscle].tonnage += (set.weight || 0) * (set.actualReps || set.actual_reps || 0);
    }
  }

  return volumeByMuscle;
}

// Plateau detection for a specific exercise across sessions.
// exerciseSessions: array of sessions newest-first, each an array of sets for that exercise.
// Returns { plateau, consecutiveStalls, resolution }
export function detectPlateau(exerciseSessions = [], _repMin = 6, _repMax = 12) {
  if (!exerciseSessions || exerciseSessions.length < 3) {
    return { plateau: false, consecutiveStalls: 0, resolution: null };
  }

  // Look at up to the 4 most recent sessions (3 adjacent comparisons), so a
  // run of 3 consecutive stalls can actually be detected. The previous
  // slice(0, 3) only ever yielded 2 comparisons, capping consecutiveStalls
  // at 2, which made the "3+ stalls -> swap_exercise" resolution dead code.
  const recent = exerciseSessions.slice(0, 4);
  let consecutiveStalls = 0;

  for (let i = 0; i < recent.length - 1; i++) {
    const currSets = recent[i];
    const prevSets = recent[i + 1];
    if (!currSets?.length || !prevSets?.length) continue;

    const currAvgWeight = currSets.reduce((s, set) => s + (set.weight || 0), 0) / currSets.length;
    const currAvgReps   = currSets.reduce((s, set) => s + (set.actualReps || set.actual_reps || 0), 0) / currSets.length;
    const prevAvgWeight = prevSets.reduce((s, set) => s + (set.weight || 0), 0) / prevSets.length;
    const prevAvgReps   = prevSets.reduce((s, set) => s + (set.actualReps || set.actual_reps || 0), 0) / prevSets.length;

    const noLoadGain = currAvgWeight <= prevAvgWeight + 0.01;
    const noRepGain  = currAvgReps  <= prevAvgReps  + 0.5;

    if (noLoadGain && noRepGain) consecutiveStalls++;
    else consecutiveStalls = 0;
  }

  if (consecutiveStalls < 2) {
    return { plateau: false, consecutiveStalls, resolution: null };
  }

  return {
    plateau: true,
    consecutiveStalls,
    resolution: consecutiveStalls >= 3
      ? 'swap_exercise'      // 3+ stalls: substitute this exercise for 4-6 weeks
      : 'change_rep_range',  // 2 stalls: try a different rep range (e.g. 15-20) for 3 weeks
    message: consecutiveStalls >= 3
      ? 'No progress for 3 sessions in a row. Try a different exercise for this muscle for the next 4-6 weeks, then revisit.'
      : 'No progress for 2 sessions. Try shifting to a higher rep range (15-20) for 3 weeks, then return to this weight.',
  };
}

// Volume confidence, how much to trust the adaptive landmark estimate for a muscle.
// Based on number of feedback data points collected.
export function getVolumeConfidence(dataPoints) {
  if (dataPoints < 3)  return { level: 'low',    label: 'Estimated', description: 'Starting range. Not yet personalised to you.' };
  if (dataPoints < 6)  return { level: 'medium',  label: 'Learning',  description: 'Based on limited data. Adjust after each check-in.' };
  return                      { level: 'high',    label: 'Personalised', description: 'Based on your logged response data.' };
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

// Check if a deload is recommended based on adaptation events from the current week
// events: array of adaptation_event objects
// Returns { shouldDeload, triggeredMuscles, reason }
export function evaluateDeloadTriggers(events = []) {
  const triggers = events.filter(e => e.decision === 'deload_trigger');
  const triggeredMuscles = [...new Set(triggers.map(e => e.muscle).filter(Boolean))];

  if (triggeredMuscles.length >= 2) {
    return {
      shouldDeload: true,
      triggeredMuscles,
      reason: `${triggeredMuscles.length} muscle groups exceeded their weekly limit. A lighter week is recommended.`,
    };
  }

  if (triggeredMuscles.length === 1) {
    return {
      shouldDeload: false,
      triggeredMuscles,
      reason: `${MUSCLE_DISPLAY_NAMES[triggeredMuscles[0]] || triggeredMuscles[0]} is close to its weekly limit. Keep an eye on it next session.`,
    };
  }

  return { shouldDeload: false, triggeredMuscles: [], reason: null };
}
