// All 10 hypertrophy algorithms — pure functions, no side effects

// Weekly set landmarks per muscle group. Single source of truth — imported by planEngine too.
//
// mv  = maintenance volume: minimum to prevent detraining between blocks
// mev = minimum effective volume: minimum to make meaningful progress
// mav = maximum adaptive volume: productive sweet spot before recovery cost rises
// mrv = maximum recoverable volume: hard ceiling before accumulated fatigue impairs recovery
//
// These are population starting points, not precise prescriptions.
// computeAdaptiveLandmarks() personalises them from session feedback after 3+ data points.
// Label them as "starting range" in user-facing copy — not as objective fact.
export const VOLUME_LANDMARKS = {
  chest:       { mv: 4,  mev: 6,  mav: 14, mrv: 22 },
  back:        { mv: 8,  mev: 10, mav: 16, mrv: 25 },
  front_delts: { mv: 0,  mev: 0,  mav: 6,  mrv: 12 },
  side_delts:  { mv: 0,  mev: 8,  mav: 16, mrv: 26 },
  rear_delts:  { mv: 0,  mev: 6,  mav: 14, mrv: 22 },
  biceps:      { mv: 5,  mev: 6,  mav: 14, mrv: 22 },
  triceps:     { mv: 4,  mev: 6,  mav: 12, mrv: 18 },
  forearms:    { mv: 2,  mev: 4,  mav: 12, mrv: 14 },
  quads:       { mv: 6,  mev: 8,  mav: 14, mrv: 20 },
  hamstrings:  { mv: 4,  mev: 6,  mav: 12, mrv: 20 },
  glutes:      { mv: 0,  mev: 4,  mav: 10, mrv: 16 },
  calves:      { mv: 6,  mev: 8,  mav: 14, mrv: 20 },
  abs:         { mv: 0,  mev: 4,  mav: 16, mrv: 25 },
  traps:       { mv: 0,  mev: 4,  mav: 12, mrv: 20 },
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
  calves: 'Calves',
  abs: 'Abs',
  traps: 'Traps',
  neck: 'Neck',
  tibialis: 'Tibialis',
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

  // Zero work is always 'below', regardless of mev. Without this short-circuit,
  // muscles with mev=0 (front_delts — get plenty of indirect work from
  // pressing) read as 'optimal' green on the body heatmap before the user
  // has logged a single set, which makes the diagram look wrong.
  if (workingSets <= 0) {
    return { status: 'below', color: '#616161', label: 'Below target', landmarks };
  }
  if (workingSets < mev) {
    return { status: 'below', color: '#616161', label: 'Below target', landmarks };
  }
  if (mev > 0 && workingSets <= mev + 2) {
    return { status: 'minimum', color: '#FFB300', label: 'Just enough', landmarks };
  }
  if (workingSets <= mav) {
    return { status: 'optimal', color: '#00C853', label: 'Good range', landmarks };
  }
  if (workingSets <= mrv) {
    return { status: 'near_mrv', color: '#FFB300', label: 'Getting close', landmarks };
  }
  return { status: 'over_mrv', color: '#FF3D00', label: 'Too much', landmarks };
}

// Algorithm 2: Double Progression Suggestion
export function getProgressionSuggestion(currentSets, prevWorkoutSets, targetRepsMin, targetRepsMax, units = 'kg') {
  if (!prevWorkoutSets || prevWorkoutSets.length === 0) {
    return { action: 'baseline', message: 'First time logging this exercise. Any weight is a great starting point.' };
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
    message: `Keep ${prevAvgWeight.toFixed(1)}${units}. Aim for ${Math.ceil(targetMax)} reps next set.`,
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
      // Hit top of band — only increase load if RIR was logged AND ≥ 1.
      // Null RIR → hold weight. Novice lifters systematically underestimate their
      // RIR by 2-4 reps; optimistically increasing load when RIR is unlogged drives
      // premature overload. Log RIR to unlock progression suggestions.
      const hadHeadroom = prevRIR !== null && prevRIR >= 1;
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
    reason = `You hit the top of the range - good work. Log your RIR next session and the app will suggest whether to add weight.`;
  } else if (anyAnchored) {
    const n = targets.filter(t => t.anchored).length;
    reason = `${n === targets.length ? 'All' : n} set target${n > 1 ? 's' : ''} raised to match your session best (${bestPrevW}${units}). That is your overall high-water mark, not just that set's history.`;
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
        message: `${MUSCLE_DISPLAY_NAMES[muscle] || muscle}: strong stimulus. You have room to add a set or increase intensity next week.`,
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
export function shouldDeload(last4WeeksData) {
  if (!last4WeeksData || last4WeeksData.length < 2) return { deload: false, reasons: [] };

  const reasons = [];
  let score = 0; // 0–100; deload triggers at ≥ 50

  // — Performance (50% weight) —
  const recentReps = last4WeeksData[last4WeeksData.length - 1]?.avgReps || 0;
  const earlierReps = last4WeeksData[0]?.avgReps || 0;
  if (earlierReps > 0 && recentReps < earlierReps - 2) {
    score += 50;
    reasons.push('Rep performance has dropped significantly over the last 4 weeks');
  }

  // — Wellness composite (30% weight, split across joint + volume signals) —
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

  // — Soreness (20% weight — down-weighted; unreliable in trained populations) —
  // Require 3+ weeks at high soreness AND time since last deload ≥ 4 weeks
  const highSorenessWeeks = last4WeeksData.filter(w => (w.avgSoreness || 0) >= 2.5).length;
  if (highSorenessWeeks >= 3 && weeksSinceDeload >= 4) {
    score += 20;
    reasons.push('Sustained soreness across 3 or more weeks');
  }

  return { deload: score >= 50, reasons };
}

// Stretch position score — Maeo et al. (2023), Pedrosa et al. (2022), Wolf et al. (2023)
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
  const targetSFR = targetExercise.stimulusToFatigueRatio || targetExercise.stimulus_to_fatigue_ratio || 3;
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
  return 'Same muscles, different movement. Useful for variation across mesocycles.';
}

// Algorithm 10: Progression Path
export function getProgressionPath(thisWeekSets, lastWeekSets, units = 'kg') {
  if (!lastWeekSets || lastWeekSets.length === 0) {
    return { action: 'establish_baseline', message: 'Keep logging. After a week or two you will start seeing comparisons here.' };
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
      message: `Rep count up. Increase weight by ${increment}${units} next session.`,
      delta: increment,
    };
  }

  if (Math.abs(thisAvg - lastAvg) <= 0.5) {
    return {
      action: 'push_reps',
      message: 'Weight steady. Aim for +1 rep on each set, then bump weight.',
    };
  }

  return {
    action: 'maintain',
    message: 'Maintain current weight. Focus on rep quality and full range of motion.',
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
      reasonText: 'High joint discomfort. Rotating to a lower-risk exercise next session.',
    };
  }

  // Systemic MRV breach — deload trigger
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

  // Joint discomfort (moderate) — hold volume, no increase
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
      // Great pump, healed early — still productive but recovering fine
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

  // Struggling or failed but still recovering — hold
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
        ? `You recover well here. Target raised by ${adjustment} sets.`
        : netScore < -1
        ? `Recovery cost is high. Target lowered by ${Math.abs(adjustment)} sets.`
        : 'Landmark based on your response data',
    };
  }

  return adapted;
}

// Effective set weighting by RIR proximity — continuous curve per Robinson et al. (2024,
// Sports Medicine 54:2209–2231). The dose-response is monotonic with no discontinuity at
// RIR 2: "marginal slopes for estimated RIR were negative and their confidence intervals did
// not contain a null point estimate." RIR 0–2 are functionally equivalent (full credit);
// credit decreases continuously above RIR 2 down to zero at RIR 8+.
// Null RIR: treated as RIR ~2 (conservative — novices routinely over-estimate headroom).
export function getSetEffectivenessWeight(rir) {
  if (rir === null || rir === undefined) return 0.9;
  if (rir <= 2) return 1.0;
  if (rir === 3) return 0.85;
  if (rir === 4) return 0.70;
  if (rir === 5) return 0.50;
  if (rir <= 7) return 0.25;
  return 0.0; // RIR 8+ — insufficient stimulus
}

// Weighted effective sets per muscle — accounts for proximity to failure.
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
export function detectPlateau(exerciseSessions = [], repMin = 6, repMax = 12) {
  if (!exerciseSessions || exerciseSessions.length < 3) {
    return { plateau: false, consecutiveStalls: 0, resolution: null };
  }

  const recent = exerciseSessions.slice(0, 3);
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

// Volume confidence — how much to trust the adaptive landmark estimate for a muscle.
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
