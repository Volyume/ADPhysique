// All 10 hypertrophy algorithms — pure functions, no side effects

export const VOLUME_LANDMARKS = {
  chest:       { mev: 6,  mav: 14, mrv: 22 },
  back:        { mev: 10, mav: 18, mrv: 25 },
  front_delts: { mev: 0,  mav: 6,  mrv: 12 },
  side_delts:  { mev: 8,  mav: 16, mrv: 26 },
  rear_delts:  { mev: 4,  mav: 16, mrv: 22 },
  biceps:      { mev: 8,  mav: 16, mrv: 26 },
  triceps:     { mev: 6,  mav: 12, mrv: 18 },
  forearms:    { mev: 8,  mav: 14, mrv: 20 },
  quads:       { mev: 8,  mav: 14, mrv: 20 },
  hamstrings:  { mev: 6,  mav: 12, mrv: 20 },
  glutes:      { mev: 0,  mav: 8,  mrv: 16 },
  calves:      { mev: 8,  mav: 14, mrv: 20 },
  abs:         { mev: 0,  mav: 18, mrv: 25 },
  traps:       { mev: 6,  mav: 12, mrv: 20 },
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
    reasons.push('Over MRV for 2+ consecutive weeks');
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

  if (subSFR > targetSFR) return 'Higher stimulus-to-fatigue ratio';
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
