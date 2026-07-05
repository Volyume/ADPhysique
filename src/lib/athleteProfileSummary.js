import { buildLiftProgressRows } from './liftProgress';
import { getStrengthLevel, summariseStrengthStanding } from './strengthStandards';
import { kgToLbs } from './units';

function completedWorkoutRows(workouts) {
  return (workouts || []).filter(w => !!(w?.isCompleted ?? w?.is_completed));
}

function latestCompletedWorkoutAt(workouts) {
  return completedWorkoutRows(workouts)
    .map(w => Number(w.endedAt ?? w.ended_at ?? w.startedAt ?? w.started_at ?? 0))
    .filter(Boolean)
    .sort((a, b) => b - a)[0] ?? null;
}

function bodyweightForLiftUnits(weightKg, units) {
  if (!weightKg) return null;
  const value = units === 'lbs' ? kgToLbs(weightKg) : weightKg;
  return Math.round(value * 10) / 10;
}

export function buildAthleteProfileSummary({
  workouts,
  sets,
  exercises,
  latestWeight,
  bodyComp,
  metrics,
  scan,
  userProfile,
  units,
}) {
  const rows = buildLiftProgressRows(sets, exercises);
  const bwKg = latestWeight?.weightKg ?? userProfile?.weightKg ?? userProfile?.bodyWeightKg ?? null;
  const bwForLiftUnits = bodyweightForLiftUnits(bwKg, units);
  const liftEntries = [];

  if (bwForLiftUnits) {
    for (const row of rows) {
      const level = getStrengthLevel(row.name, row.bestE1rm, bwForLiftUnits);
      if (level) liftEntries.push({ row, level });
    }
  }

  const strength = summariseStrengthStanding(liftEntries.map(({ row, level }) => ({
    lift: row.name,
    oneRm: row.bestE1rm,
    level,
  })));

  return {
    sessions: completedWorkoutRows(workouts).length,
    weight: bwKg,
    bodyFat: bodyComp?.bodyFatPercent ?? null,
    bodyFatLoggedAt: bodyComp?.loggedAt ?? null,
    latestMetric: metrics?.[0] ?? null,
    latestWorkoutAt: latestCompletedWorkoutAt(workouts),
    scan,
    strength,
    keyLifts: liftEntries.slice(0, 5),
  };
}
