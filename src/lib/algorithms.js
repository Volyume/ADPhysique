// All 10 hypertrophy algorithms — pure functions, no side effects

// Weekly set landmarks (min/target/max) derived from primary research:
// - Schoenfeld, Ogborn & Krieger (2017) J Strength Cond Res — dose-response meta-analysis
//   establishes that >10 sets/week per muscle produces superior hypertrophy vs lower volumes.
// - Baz-Valle et al. (2022) J Hum Kinet — upper volume ceiling; gains plateau/decline above
//   ~20 working sets/week for most muscles in trained individuals.
// - Krieger (2010) J Strength Cond Res — multiple sets outperform single sets; 3-6 sets/session
//   is the practical lower anchor for a meaningful stimulus.
// Values are independently derived from the above and are not reproduced from any
// proprietary coaching framework. Internal variable names mev/mav/mrv are engineering
// shorthand for min/target/max and carry no external attribution.
export const VOLUME_LANDMARKS = {
  // chest: min anchored at Krieger 2010 (≥3 meaningful sets); target mid-range of
  // Schoenfeld 2017 effective dose band (10-20 sets); max from Baz-Valle 2022 ceiling.
  chest:       { mev: 6,  mav: 14, mrv: 20 },
  // back: higher minimum reflects compound overlap (rows + pulldowns both count);
  // large muscle tolerates higher volume — Schoenfeld 2017.
  back:        { mev: 10, mav: 16, mrv: 24 },
  // front_delts: heavily stimulated by pressing; minimal direct work needed.
  front_delts: { mev: 0,  mav: 6,  mrv: 12 },
  // side_delts: isolation-dominant, high frequency tolerance — Schoenfeld 2019.
  side_delts:  { mev: 8,  mav: 16, mrv: 24 },
  // rear_delts: stimulated by row/pull patterns; direct work added on top.
  rear_delts:  { mev: 4,  mav: 14, mrv: 20 },
  // biceps: isolation muscle, moderate ceiling — Baz-Valle 2022.
  biceps:      { mev: 6,  mav: 14, mrv: 22 },
  // triceps: stimulated by pressing; direct volume ceiling lower than biceps.
  triceps:     { mev: 6,  mav: 12, mrv: 18 },
  // forearms: high repetition tolerance; wrist/grip work accumulates from compounds.
  forearms:    { mev: 6,  mav: 12, mrv: 18 },
  // quads: large muscle, compound-dominant; Schoenfeld 2017 supports higher ceiling.
  quads:       { mev: 8,  mav: 14, mrv: 20 },
  // hamstrings: stimulated by hinging and leg curls; fatigue accumulates quickly.
  hamstrings:  { mev: 6,  mav: 12, mrv: 18 },
  // glutes: overlap from squat/hinge patterns; dedicated work on top.
  glutes:      { mev: 4,  mav: 10, mrv: 16 },
  // calves: very high repetition tolerance, low systemic fatigue.
  calves:      { mev: 8,  mav: 14, mrv: 20 },
  // abs: minimal fatigue cost; frequency and volume can be higher.
  abs:         { mev: 0,  mav: 16, mrv: 24 },
  // traps: stimulated by shrugs, rows, deadlifts; moderate direct volume.
  traps:       { mev: 6,  mav: 12, mrv: 18 },
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
  calves: 'Calves',
  abs: 'Abs',
  traps: 'Traps',
};

// Algorithm 4: 1RM Ensemble Calculator
export function calculate1RM(weight, reps) {
  if (!weight || weight <= 0 || !reps || reps < 1) return weight || 0;
  if (reps === 1) return weight;

  const epley = weight * (1 + reps / 30);
  const brzycki = reps < 37 ? weight / (1.0278 - 0.0278 * reps) : weight * 2;

  if (reps <= 10) return epley * 0.6 + brzycki * 0.4;
  if (reps > 20) return brzycki;
  return (epley + brzycki) / 2;
}

// Algorithm 9: Tonnage
export function calculateTonnage(sets) {
  return sets.reduce((total, s) => {
    if (isHardSet(s)) {
      total += (s.weight || 0) * (s.actualReps || s.actual_reps || 0);
    }
    return total;
  }, 0);
}

function isHardSet(set) {
  const setType = set.setType || set.set_type || 'straight';
  return setType !== 'warmup';
}

// Algorithm 1: Weekly Volume Tracking Per Muscle
export function calculateWeeklyVolume(sets, exerciseMap = {}) {
  const volumeByMuscle = {};

  for (const set of sets) {
    if (!isHardSet(set)) continue;

    const exerciseId = set.exerciseId || set.exercise_id;
    const exercise = exerciseMap[exerciseId];
    if (!exercise) continue;

    let primaryMuscle = (exercise.primaryMuscle || exercise.primary_muscle || '').toLowerCase();
    // Legacy normalisation: old 'shoulders' data maps to side_delts (largest delt head)
    if (primaryMuscle === 'shoulders') primaryMuscle = 'side_delts';

    const secondaryMuscles = exercise.secondaryMuscles ||
      (exercise.secondary_muscles ? JSON.parse(exercise.secondary_muscles) : []);

    if (primaryMuscle) {
      if (!volumeByMuscle[primaryMuscle]) {
        volumeByMuscle[primaryMuscle] = { workingSets: 0, reps: 0, tonnage: 0 };
      }
      volumeByMuscle[primaryMuscle].workingSets += 1;
      volumeByMuscle[primaryMuscle].reps += set.actualReps || set.actual_reps || 0;
      volumeByMuscle[primaryMuscle].tonnage +=
        (set.weight || 0) * (set.actualReps || set.actual_reps || 0);
    }

    for (const sec of secondaryMuscles) {
      let muscle = (sec.muscle || sec).toLowerCase();
      // Legacy normalisation for secondary muscles
      if (muscle === 'shoulders') muscle = 'front_delts';
      const contribution = sec.contribution || 0.5;
      if (!volumeByMuscle[muscle]) {
        volumeByMuscle[muscle] = { workingSets: 0, reps: 0, tonnage: 0 };
      }
      volumeByMuscle[muscle].workingSets += contribution;
    }
  }

  return volumeByMuscle;
}

// Algorithm 5: Volume Status
export function getVolumeStatus(workingSets, muscle, customLandmarks = null) {
  const landmarks = customLandmarks?.[muscle] || VOLUME_LANDMARKS[muscle];
  if (!landmarks) return { status: 'unknown', color: '#9E9E9E', label: 'No data', landmarks: null };

  const { mev, mav, mrv } = landmarks;

  if (workingSets < mev) {
    return { status: 'below', color: '#616161', label: 'Below target', landmarks };
  }
  if (mev > 0 && workingSets <= mev + 2) {
    return { status: 'minimum', color: '#FFB300', label: 'Minimum stimulus', landmarks };
  }
  if (workingSets <= mav) {
    return { status: 'optimal', color: '#00C853', label: 'Growth range', landmarks };
  }
  if (workingSets <= mrv) {
    return { status: 'near_mrv', color: '#FFB300', label: 'Near recovery ceiling', landmarks };
  }
  return { status: 'over_mrv', color: '#FF3D00', label: 'Recovery debt', landmarks };
}

// Algorithm 2: Double Progression Suggestion
export function getProgressionSuggestion(currentSets, prevWorkoutSets, targetRepsMin, targetRepsMax, units = 'kg') {
  if (!prevWorkoutSets || prevWorkoutSets.length === 0) {
    return { action: 'baseline', message: 'First time logging — establish a baseline.' };
  }

  const prevAvgReps =
    prevWorkoutSets.reduce((sum, s) => sum + (s.actualReps || s.actual_reps || 0), 0) /
    prevWorkoutSets.length;

  const prevAvgWeight =
    prevWorkoutSets.reduce((sum, s) => sum + (s.weight || 0), 0) / prevWorkoutSets.length;

  const prevAvgRIR =
    prevWorkoutSets.reduce((sum, s) => sum + (s.rir ?? 2), 0) / prevWorkoutSets.length;

  const targetMax = targetRepsMax || prevAvgReps + 1;

  if (prevAvgReps >= targetMax && prevAvgRIR >= 1) {
    const increment = prevAvgWeight >= 60 ? 2.5 : 1.25;
    return {
      action: 'increase_weight',
      message: `Great work! Try ${(prevAvgWeight + increment).toFixed(1)}${units} next session.`,
      suggestedWeight: prevAvgWeight + increment,
    };
  }

  if (prevAvgReps < (targetRepsMin || prevAvgReps) && prevAvgRIR <= 1) {
    const decrement = prevAvgWeight >= 60 ? 2.5 : 1.25;
    return {
      action: 'decrease_weight',
      message: `Reduce to ${(prevAvgWeight - decrement).toFixed(1)}${units} and focus on rep quality.`,
      suggestedWeight: Math.max(0, prevAvgWeight - decrement),
    };
  }

  return {
    action: 'maintain',
    message: `Keep ${prevAvgWeight.toFixed(1)}${units} — aim for ${Math.ceil(targetMax)} reps next set.`,
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
    prevPrevSets = [],  // sets from the workout before last — for consecutive-miss detection
    layoffMultiplier = 1.0, // < 1 when returning from a training break
  } = options;

  function getIncrement(weight) {
    if (incrementKg != null) return incrementKg;
    if (exerciseCategory === 'isolation') return weight >= 20 ? 1 : 0.5;
    if (exerciseCategory === 'accessory') return weight >= 40 ? 1.25 : 0.75;
    // compound default
    return weight >= 60 ? 2.5 : 1.25;
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
      // Hit top of band — only increase load if RIR was ≥ 1 (had gas left)
      // If RIR null (not logged), increase anyway (optimistic default)
      const hadHeadroom = prevRIR === null || prevRIR >= 1;
      if (hadHeadroom) {
        const increment = getIncrement(prevWeight);
        // 5% session-over-session cap
        const maxJump = prevWeight * 0.05;
        const capped = Math.min(increment, maxJump > 0.5 ? maxJump : increment);
        // Round to nearest 0.25
        const rounded = Math.round(capped * 4) / 4;
        targetWeight = prevWeight + Math.max(0.25, rounded);
        action = 'increase';
      } else {
        // Grinded it out with RIR 0 — same weight, push for +1 rep is not valid
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
      // In range — same weight, +1 rep
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

  const allIncrease = targets.every(t => t.action === 'increase');
  const anyDecrease = targets.some(t => t.action === 'decrease');
  const anyIncrease = targets.some(t => t.action === 'increase');
  const allMaintain = targets.every(t => t.action === 'maintain');
  const isLayoff = layoffMultiplier < 1.0;

  let reason;
  if (isLayoff) {
    const pct = Math.round((1 - layoffMultiplier) * 100);
    reason = `Loads reduced by ${pct}% — first session back after a break. Rebuild over the next 1–2 weeks.`;
  } else if (allIncrease) {
    const inc = (targets[0].weight - targets[0].prevWeight).toFixed(2).replace(/\.?0+$/, '');
    reason = `All sets hit the top of the range — load up by ${inc}${units}.`;
  } else if (anyDecrease) {
    reason = `Load dropped — reps missed by 2+ for two sessions in a row. Reset and rebuild.`;
  } else if (anyIncrease) {
    reason = `Partial progression — add weight where you hit ${max} reps.`;
  } else if (allMaintain) {
    reason = `Same load — you were at RIR 0 with ${max}+ reps. Let recovery catch up first.`;
  } else {
    reason = `Keep the load — push for ${max} reps on each set, then increase weight.`;
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
      reps,
      weight,
      label: `New estimated 1RM: ${new1RM.toFixed(1)}${units}`,
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
      value: weight,
      reps,
      label: `Most reps at ${weight}${units}: ${reps} reps`,
    });
  }

  return prs;
}

// Algorithm 6: Auto-Regulation
export function getAutoRegSuggestion(workoutFeedback, weeklyVolumeByMuscle, customLandmarks = null) {
  const suggestions = [];
  const {
    sessionDifficulty = 3,
    overallPump = 2,
    soreness24hBefore = 1,
    fatigueLevel = 2,
    jointDiscomfort = 0,
  } = workoutFeedback || {};

  if (sessionDifficulty >= 4 && soreness24hBefore >= 2) {
    suggestions.push({
      type: 'reduce_volume',
      message: 'Reduce volume by 1-2 sets next week. High fatigue indicated.',
    });
  } else if (sessionDifficulty <= 2 && soreness24hBefore === 0 && fatigueLevel >= 4) {
    suggestions.push({
      type: 'add_volume',
      message: 'Recovery capacity available. Consider adding 1-2 sets next week.',
    });
  }

  if (jointDiscomfort >= 2) {
    suggestions.push({
      type: 'reduce_weight',
      message: 'Maintain volume but reduce load 5-10%. Joint discomfort noted.',
    });
  }

  if (overallPump === 3 && sessionDifficulty <= 3) {
    suggestions.push({
      type: 'increase_load',
      message: 'Strong response. Consider increasing load or adding a set next session.',
    });
  }

  for (const [muscle, data] of Object.entries(weeklyVolumeByMuscle || {})) {
    const landmarks = customLandmarks?.[muscle] || VOLUME_LANDMARKS[muscle];
    if (!landmarks) continue;
    if (data.workingSets > landmarks.mrv) {
      suggestions.push({
        type: 'deload_muscle',
        muscle,
        message: `${MUSCLE_DISPLAY_NAMES[muscle] || muscle}: near recovery ceiling (${Math.round(data.workingSets)} working sets). Consider reducing volume next session.`,
      });
    }
  }

  if (suggestions.length === 0) {
    suggestions.push({ type: 'maintain', message: 'Volume is within target range. Continue planned progression.' });
  }

  return suggestions;
}

// Algorithm 7: Deload Detection
export function shouldDeload(last4WeeksData) {
  if (!last4WeeksData || last4WeeksData.length < 2) return { deload: false, reasons: [] };

  const reasons = [];

  const recentReps = last4WeeksData[last4WeeksData.length - 1]?.avgReps || 0;
  const earlierReps = last4WeeksData[0]?.avgReps || 0;
  if (earlierReps > 0 && recentReps < earlierReps - 2) {
    reasons.push('Significant rep decline over past 4 weeks');
  }

  const highSorenessWeeks = last4WeeksData.filter(w => (w.avgSoreness || 0) >= 2.5).length;
  const weeksSinceDeload = last4WeeksData[last4WeeksData.length - 1]?.weeksSinceLastDeload || 99;
  if (highSorenessWeeks >= 2 && weeksSinceDeload >= 4) {
    reasons.push('Sustained high soreness for 2+ weeks');
  }

  const overMRVWeeks = last4WeeksData.filter(w => w.hasOverMRV).length;
  if (overMRVWeeks >= 2) {
    reasons.push('Over maximum weekly sets for 2+ consecutive weeks');
  }

  const avgJointDiscomfort =
    last4WeeksData.reduce((sum, w) => sum + (w.avgJointDiscomfort || 0), 0) /
    last4WeeksData.length;
  if (avgJointDiscomfort >= 1.5 && weeksSinceDeload >= 3) {
    reasons.push('Recurring joint discomfort detected');
  }

  return { deload: reasons.length > 0, reasons };
}

// Algorithm 8: Exercise Substitutes
export function getExerciseSubstitutes(targetExercise, allExercises, userEquipment = []) {
  const primaryMuscle = (
    targetExercise.primaryMuscle ||
    targetExercise.primary_muscle ||
    ''
  ).toLowerCase();
  const targetSFR = targetExercise.stimulusToFatigueRatio || targetExercise.stimulus_to_fatigue_ratio || 3;
  const targetFatigue = targetExercise.fatigueCost || targetExercise.fatigue_cost || 3;
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
    return sfrB - sfrA || fatigueA - fatigueB;
  });

  return candidates.slice(0, 3).map(ex => ({
    exercise: ex,
    reason: buildSubstituteReason(ex, targetExercise),
  }));
}

function buildSubstituteReason(sub, target) {
  const subSFR = sub.stimulusToFatigueRatio || sub.stimulus_to_fatigue_ratio || 3;
  const targetSFR = target.stimulusToFatigueRatio || target.stimulus_to_fatigue_ratio || 3;
  const subFatigue = sub.fatigueCost || sub.fatigue_cost || 3;
  const targetFatigue = target.fatigueCost || target.fatigue_cost || 3;

  if (subSFR > targetSFR) return 'Higher stimulus quality for this muscle';
  if (subFatigue < targetFatigue) return 'Lower fatigue cost — good for high-volume days';
  return 'Similar stimulus, different movement pattern';
}

// Algorithm 10: Progression Path
export function getProgressionPath(thisWeekSets, lastWeekSets, units = 'kg') {
  if (!lastWeekSets || lastWeekSets.length === 0) {
    return { action: 'establish_baseline', message: 'Keep tracking — building your baseline.' };
  }

  const thisAvg =
    thisWeekSets.reduce((s, set) => s + (set.actualReps || set.actual_reps || 0), 0) /
    Math.max(thisWeekSets.length, 1);
  const lastAvg =
    lastWeekSets.reduce((s, set) => s + (set.actualReps || set.actual_reps || 0), 0) /
    Math.max(lastWeekSets.length, 1);

  const lastWeight =
    lastWeekSets.reduce((s, set) => s + (set.weight || 0), 0) / Math.max(lastWeekSets.length, 1);

  if (thisAvg > lastAvg + 0.5) {
    const increment = lastWeight >= 60 ? 2.5 : 1.25;
    return {
      action: 'increase_weight',
      message: `Rep count up — increase weight by ${increment}${units} next session.`,
      delta: increment,
    };
  }

  if (Math.abs(thisAvg - lastAvg) <= 0.5) {
    return {
      action: 'push_reps',
      message: 'Weight steady — aim for +1 rep on each set, then bump weight.',
    };
  }

  return {
    action: 'maintain',
    message: 'Maintain current weight — focus on rep quality and full ROM.',
  };
}

// Plate calculator utility
export function calculatePlates(targetWeight, barWeight = 20, availablePlates = [25, 20, 15, 10, 5, 2.5, 1.25]) {
  const sideWeight = (targetWeight - barWeight) / 2;
  if (sideWeight <= 0) return { plates: [], totalWeight: barWeight };

  const plates = [];
  let remaining = sideWeight;

  for (const plate of availablePlates) {
    while (remaining >= plate - 0.001) {
      plates.push(plate);
      remaining -= plate;
      remaining = Math.round(remaining * 100) / 100;
    }
  }

  const totalWeight = barWeight + plates.reduce((s, p) => s + p, 0) * 2;
  return { plates, totalWeight, sideWeight: plates.reduce((s, p) => s + p, 0) };
}

// Strength standards (ratio of 1RM to bodyweight)
export const STRENGTH_STANDARDS = {
  bench: [
    { ratio: 0.5,  label: 'Beginner' },
    { ratio: 1.0,  label: 'Novice' },
    { ratio: 1.25, label: 'Intermediate' },
    { ratio: 1.5,  label: 'Advanced' },
    { ratio: 2.0,  label: 'Elite' },
  ],
  squat: [
    { ratio: 0.75, label: 'Beginner' },
    { ratio: 1.25, label: 'Novice' },
    { ratio: 1.5,  label: 'Intermediate' },
    { ratio: 2.0,  label: 'Advanced' },
    { ratio: 2.5,  label: 'Elite' },
  ],
  deadlift: [
    { ratio: 1.0,  label: 'Beginner' },
    { ratio: 1.5,  label: 'Novice' },
    { ratio: 2.0,  label: 'Intermediate' },
    { ratio: 2.5,  label: 'Advanced' },
    { ratio: 3.0,  label: 'Elite' },
  ],
};

export function getStrengthStandard(lift, estimated1RM, bodyWeight) {
  if (!bodyWeight || bodyWeight <= 0) return null;
  const standards = STRENGTH_STANDARDS[lift];
  if (!standards) return null;

  const ratio = estimated1RM / bodyWeight;
  let label = 'Beginner';
  for (const standard of standards) {
    if (ratio >= standard.ratio) label = standard.label;
  }
  return { ratio: ratio.toFixed(2), label };
}

// RP-style soreness × performance → volume decision
// Inputs use numeric scales:
//   soreness:    1=none  2=healed_early  3=healed_on_time  4=still_sore
//   performance: 1=exceeded  2=met  3=struggled  4=failed_to_match
//   pump:        1=none  2=low  3=moderate  4=great
//   joint:       0=none  1=low  2=moderate  3=high
// Returns: { decision, delta, reasonCode, reasonText }
export function computeAdaptiveDecision({ soreness = 2, performance = 2, pump = 3, joint = 0 } = {}) {
  // Joint pain overrides everything — rotate the exercise
  if (joint >= 3) {
    return {
      decision: 'rotate_exercise',
      delta: 0,
      reasonCode: 'joint_high',
      reasonText: 'High joint discomfort — rotate to a lower-risk exercise.',
    };
  }

  // Systemic MRV breach — deload trigger
  if (performance === 4 && soreness >= 3) {
    return {
      decision: 'deload_trigger',
      delta: 0,
      reasonCode: 'systemic_mrv_breach',
      reasonText: 'Could not match previous performance and still sore — recovery debt detected. Consider deloading.',
    };
  }

  // Still sore at next session → drop a set
  if (soreness === 4) {
    return {
      decision: 'drop_set',
      delta: -1,
      reasonCode: 'residual_soreness',
      reasonText: 'Still sore at next session — reduce volume by 1 set to allow recovery.',
    };
  }

  // Joint discomfort (moderate) — hold volume, no increase
  if (joint >= 2) {
    return {
      decision: 'hold',
      delta: 0,
      reasonCode: 'joint_moderate',
      reasonText: 'Moderate joint discomfort — maintain current volume. Monitor for escalation.',
    };
  }

  // RP 2-axis: soreness ≤ 2 (none or healed early) AND performance ≤ 2 (exceeded or met)
  if (soreness <= 2 && performance <= 2) {
    if (pump === 1) {
      // No pump = clear under-stimulus → add 2 sets
      return {
        decision: 'add_set',
        delta: 2,
        reasonCode: 'under_stimulus',
        reasonText: 'Full recovery + no pump signal — significantly under minimum stimulus. Add 2 sets.',
      };
    }
    if (pump === 4 && soreness === 2) {
      // Great pump, healed early — still productive but recovering fine
      return {
        decision: 'hold',
        delta: 0,
        reasonCode: 'optimal_response',
        reasonText: 'Excellent stimulus with early recovery — volume is working well. Hold.',
      };
    }
    return {
      decision: 'add_set',
      delta: 1,
      reasonCode: 'good_recovery_good_performance',
      reasonText: 'Good recovery and performance — add 1 set next week.',
    };
  }

  // Struggling or failed but still recovering — hold
  if (performance >= 3 && soreness <= 3) {
    return {
      decision: 'hold',
      delta: 0,
      reasonCode: 'performance_struggle',
      reasonText: 'Performance struggled — hold volume and focus on execution quality.',
    };
  }

  // Default: hold
  return {
    decision: 'hold',
    delta: 0,
    reasonCode: 'hold_default',
    reasonText: 'Volume is appropriate — continue as planned.',
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

    const current = data.currentSets ?? data.mav ?? 10;
    const mev = data.mev ?? 6;
    const mrv = data.mrv ?? 20;

    let nextWeekSets = current + (decision.delta ?? 0);
    nextWeekSets = Math.max(mev, Math.min(mrv, nextWeekSets));

    results[muscle] = { ...decision, nextWeekSets, currentSets: current };
  }

  return results;
}

// Adaptive volume landmarks — adjusts MEV/MAV/MRV per muscle based on user's feedback signals
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
      // Not enough data — use defaults
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

    // Compute a net stimulus/recovery score: positive = can handle more, negative = need less
    // Ranges from approximately -3 to +3
    const stimulusScore = (avgPump - 3) * 0.5;          // pump above 3 = good
    const recoveryScore = -(avgSoreness - 2) * 0.4;     // soreness above 2 = bad
    const jointScore = -(avgJoint) * 0.8;               // any joint issues = bad
    const perfScore = avgPerf * 0.5;                    // improving = good
    const prScore = Math.min(avgPRFreq * 0.3, 0.6);     // PRs = adapting
    const fatigueScore = -(avgMissed * 0.3);            // missing reps = fatigued

    const netScore = stimulusScore + recoveryScore + jointScore + perfScore + prScore + fatigueScore;

    // Adjust landmarks by up to ±4 sets based on net score
    const adjustment = Math.round(Math.max(-4, Math.min(4, netScore * 2)));

    // Find the volume that produced best results (highest pump × performance, lowest soreness)
    const scoredEntries = recent.map(e => ({
      volume: e.weeklyVolume || base.mav,
      quality: ((e.pumpScore || 3) + (e.performanceTrend || 0) - (e.sorenessScore || 2) - (e.jointDiscomfort || 0)),
    })).sort((a, b) => b.quality - a.quality);

    const bestVolume = scoredEntries[0]?.volume || base.mav;
    const worstVolume = scoredEntries[scoredEntries.length - 1]?.volume || base.mrv;

    adapted[muscle] = {
      mev: Math.max(0, base.mev + adjustment),
      mav: Math.max(base.mev + 1, Math.min(base.mrv - 1, Math.round(bestVolume))),
      mrv: Math.max(base.mav + 1, base.mrv + Math.floor(adjustment / 2)),
      isAdapted: true,
      dataPoints: entries.length,
      netScore: Math.round(netScore * 10) / 10,
      bestVolume,
      note: netScore > 1
        ? `You recover well here — landmark raised by ${adjustment} sets`
        : netScore < -1
        ? `Recovery cost is high — landmark lowered by ${Math.abs(adjustment)} sets`
        : 'Landmark based on your response data',
    };
  }

  return adapted;
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
    const baseWeight = set.weight || 0;
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
      reason: `${triggeredMuscles.length} muscle groups hit recovery ceiling — deload recommended next week.`,
    };
  }

  if (triggeredMuscles.length === 1) {
    return {
      shouldDeload: false,
      triggeredMuscles,
      reason: `${MUSCLE_DISPLAY_NAMES[triggeredMuscles[0]] || triggeredMuscles[0]} is at recovery ceiling — monitor next session.`,
    };
  }

  return { shouldDeload: false, triggeredMuscles: [], reason: null };
}
