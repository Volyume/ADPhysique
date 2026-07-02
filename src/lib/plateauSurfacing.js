// B3 (audit/05-enhancements.md): proactive plateau-break surfacing.
//
// Pure selection logic for the Home plateau banner. Reuses the EXISTING
// detection (detectPlateau in algorithms.js, read-only import; its outputs are
// untouched) and only decides which plateaued lift, if any, deserves the one
// banner slot. No I/O, no store access; deterministic for identical inputs.
//
// ED-safety note (COMP-004 check): the input here is workout_sets rows only,
// i.e. load lifted and reps performed. Nothing weight-derived (bodyweight,
// calories, food) feeds the detection, so the banner is training-only and
// needs no ED-flag suppression. If this ever changes, add the same
// getOpenEdPatternFlag/calm suppression the free coach line uses.

import { detectPlateau } from './algorithms';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Only surface a plateau on a lift the user is still training. A lift last
// touched more than a fortnight ago is a dropped lift, not a plateau, and
// nagging about it is exactly the risk the audit entry flags.
export const PLATEAU_MAX_STALENESS_MS = 14 * 24 * 60 * 60 * 1000;

// Pick the single plateaued lift (if any) the Home banner should surface.
//
// sets: workout_sets rows (camelCase from database.js; snake_case tolerated to
// match the algorithms.js convention). Sessions are grouped per exercise by
// workoutId and ordered newest-first, INCLUDING warm-up sets, mirroring
// ExerciseDetailScreen.loadData exactly so the banner never claims a plateau
// the target screen would not show.
//
// Returns { exerciseId, consecutiveStalls, weeks, latestSessionAt } or null.
// weeks is the calendar span of the stalled run of sessions, floored at 1.
export function selectPlateauForBanner(sets = [], { now = Date.now(), maxStalenessMs = PLATEAU_MAX_STALENESS_MS } = {}) {
  if (!Array.isArray(sets) || sets.length === 0) return null;

  // exerciseId -> Map(workoutId -> sets[])
  const byExercise = new Map();
  for (const s of sets) {
    if (!s) continue;
    const exerciseId = s.exerciseId ?? s.exercise_id;
    const workoutId = s.workoutId ?? s.workout_id;
    if (!exerciseId || !workoutId) continue;
    let byWorkout = byExercise.get(exerciseId);
    if (!byWorkout) { byWorkout = new Map(); byExercise.set(exerciseId, byWorkout); }
    let group = byWorkout.get(workoutId);
    if (!group) { group = []; byWorkout.set(workoutId, group); }
    group.push(s);
  }

  let best = null;
  for (const [exerciseId, byWorkout] of byExercise) {
    // detectPlateau needs 3+ sessions; skip cheaply before sorting.
    if (byWorkout.size < 3) continue;

    const sessions = [...byWorkout.values()]
      .map(sessionSets => ({
        sets: sessionSets,
        at: Math.max(...sessionSets.map(x => x.createdAt ?? x.created_at ?? 0)),
      }))
      .sort((a, b) => b.at - a.at); // newest first, as detectPlateau expects

    if (now - sessions[0].at > maxStalenessMs) continue;

    const result = detectPlateau(sessions.map(s => s.sets));
    if (!result.plateau) continue;

    // The stalled run spans consecutiveStalls + 1 sessions ending at the
    // newest; its calendar span gives the honest "for {n} weeks" figure.
    const run = sessions.slice(0, result.consecutiveStalls + 1);
    const spanMs = run[0].at - run[run.length - 1].at;
    const weeks = Math.max(1, Math.round(spanMs / WEEK_MS));
    const totalSets = [...byWorkout.values()].reduce((t, g) => t + g.length, 0);

    const candidate = {
      exerciseId,
      consecutiveStalls: result.consecutiveStalls,
      weeks,
      totalSets,
      latestSessionAt: sessions[0].at,
    };
    // One banner only: the longest stall wins; ties go to the most-trained
    // lift (most sets in window), then the most recently trained.
    if (
      !best
      || candidate.consecutiveStalls > best.consecutiveStalls
      || (candidate.consecutiveStalls === best.consecutiveStalls && candidate.totalSets > best.totalSets)
      || (candidate.consecutiveStalls === best.consecutiveStalls && candidate.totalSets === best.totalSets
          && candidate.latestSessionAt > best.latestSessionAt)
    ) {
      best = candidate;
    }
  }

  if (!best) return null;
  const { totalSets: _ignored, ...picked } = best;
  return picked;
}

// The banner line. Calm, specific, actionable; British English, no em dash
// (docs/COACHING_VOICE_SYNTHESIS_LOCKED.md).
export function plateauBannerLine(exerciseName, weeks) {
  const n = Math.max(1, Math.round(weeks ?? 1));
  const unit = n === 1 ? 'week' : 'weeks';
  return `${exerciseName} has plateaued for ${n} ${unit}. Tap for a way through.`;
}
