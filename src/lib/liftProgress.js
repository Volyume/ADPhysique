// Lift Progress, the data layer behind the Progress tab's "Lift Progress"
// tile. It turns a flat list of completed sets into one row per exercise
// the user has actually trained, each carrying the trend the row's
// sparkline draws and the headline numbers it shows.
//
// Pure and side-effect free so it unit-tests without a database. The
// screen owns loading (getCompletedWorkoutSets + getAllExercises) and
// rendering; this owns the maths.

import { calculate1RM } from './algorithms';

// A "session" is one workout. We group an exercise's sets by workout_id
// and take the best estimated 1RM in that session as the session's point,
// so the trend reflects the user's top working effort each time they
// trained the lift, not every individual set.

// Build the rows for the Lift Progress list.
//
//   sets       array of completed workout_sets (camelCase, newest first
//              is fine, order is normalised here)
//   exercises  array of exercise records (id, name, primaryMuscle)
//
// Returns an array of rows, most recently trained first:
//   {
//     exerciseId, name, primaryMuscle,
//     sessions,            number of distinct sessions the lift appears in
//     lastTrainedAt,       ms epoch of the most recent set
//     bestE1rm,            best estimated 1RM across all sessions
//     latestE1rm,          estimated 1RM of the most recent session
//     latestWeight,        heaviest working weight in the most recent session
//     trend,               est 1RM per session, oldest -> newest (sparkline)
//     deltaPct,            percent change from first to latest session, or null
//   }
export function buildLiftProgressRows(sets, exercises) {
  const exById = new Map();
  for (const ex of exercises || []) {
    if (ex && ex.id != null) exById.set(ex.id, ex);
  }

  // Group working sets by exercise, then by session (workout_id).
  const byExercise = new Map();
  for (const s of sets || []) {
    if (!s) continue;
    if (s.setType === 'warmup') continue; // working sets only
    const exerciseId = s.exerciseId ?? s.exercise_id;
    if (exerciseId == null) continue;
    const weight = Number(s.weight) || 0;
    const reps = Number(s.actualReps ?? s.actual_reps) || 0;
    if (weight <= 0 || reps <= 0) continue; // unlogged / bodyweight-less rows
    const at = Number(s.createdAt ?? s.created_at) || 0;
    const sessionId = s.workoutId ?? s.workout_id ?? `t:${at}`;

    if (!byExercise.has(exerciseId)) byExercise.set(exerciseId, new Map());
    const sessions = byExercise.get(exerciseId);
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, { at: 0, bestE1rm: 0, topWeight: 0 });
    }
    const sess = sessions.get(sessionId);
    sess.at = Math.max(sess.at, at);
    sess.bestE1rm = Math.max(sess.bestE1rm, calculate1RM(weight, reps));
    sess.topWeight = Math.max(sess.topWeight, weight);
  }

  const rows = [];
  for (const [exerciseId, sessionMap] of byExercise) {
    const sessions = [...sessionMap.values()].sort((a, b) => a.at - b.at);
    if (sessions.length === 0) continue;

    const trend = sessions.map(s => Math.round(s.bestE1rm * 10) / 10);
    const latest = sessions[sessions.length - 1];
    const first = sessions[0];
    const bestE1rm = sessions.reduce((m, s) => Math.max(m, s.bestE1rm), 0);
    const deltaPct = first.bestE1rm > 0
      ? Math.round(((latest.bestE1rm - first.bestE1rm) / first.bestE1rm) * 100)
      : null;

    const ex = exById.get(exerciseId);
    rows.push({
      exerciseId,
      name: ex?.name ?? 'Exercise',
      primaryMuscle: ex?.primaryMuscle ?? ex?.primary_muscle ?? null,
      sessions: sessions.length,
      lastTrainedAt: latest.at,
      bestE1rm: Math.round(bestE1rm * 10) / 10,
      latestE1rm: Math.round(latest.bestE1rm * 10) / 10,
      latestWeight: Math.round(latest.topWeight * 10) / 10,
      trend,
      deltaPct,
    });
  }

  // Most recently trained first, so the lift you just did is at the top.
  rows.sort((a, b) => b.lastTrainedAt - a.lastTrainedAt);
  return rows;
}
