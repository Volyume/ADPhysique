import { buildLiftProgressRows } from './liftProgress';
import {
  STRENGTH_STANDARDS,
  getStrengthLevel,
  matchStandardKey,
  summariseStrengthStanding,
} from './strengthStandards';
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
    // F13 (progress-tab audit 2026-09-24, register D200 "fix it all"):
    // mirrors the fix already landed for the Lift progress screen (commit
    // d2b92e4e, LiftProgressScreen.js ~L225-234). Entries used to be keyed
    // by exercise NAME, so two variants of the same lift (e.g. "Barbell
    // Bench Press" and "Close-Grip Bench Press") both matched the 'bench'
    // standard and were scored + counted as two lifts -- doubling
    // strength.count and letting keyLifts show the same standard twice
    // while another went missing entirely. Key by the STANDARD instead
    // (matchStandardKey), keeping only the higher-ratio variant per
    // standard, so summariseStrengthStanding and keyLifts each see exactly
    // one entry per standard.
    const winners = {};
    for (const row of rows) {
      if (!row.bestE1rm) continue;
      const key = matchStandardKey(row.name);
      if (!key) continue;
      const level = getStrengthLevel(row.name, row.bestE1rm, bwForLiftUnits);
      if (!level) continue;
      if (!winners[key] || level.ratio > winners[key].level.ratio) {
        winners[key] = { row, level };
      }
    }
    for (const key of Object.keys(STRENGTH_STANDARDS)) {
      if (winners[key]) liftEntries.push(winners[key]);
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
    weightLoggedAt: latestWeight?.loggedAt ?? latestWeight?.logged_at ?? null,
    bodyFat: bodyComp?.bodyFatPercent ?? null,
    bodyFatLoggedAt: bodyComp?.loggedAt ?? null,
    latestMetric: metrics?.[0] ?? null,
    latestWorkoutAt: latestCompletedWorkoutAt(workouts),
    scan,
    strength,
    keyLifts: liftEntries.slice(0, 5),
  };
}
