// Lift Progress, the data layer behind the Progress tab's "Lift Progress"
// tile. It turns a flat list of completed sets into one row per exercise
// the user has actually trained, each carrying the trend the row's
// sparkline draws and the headline numbers it shows.
//
// Pure and side-effect free so it unit-tests without a database. The
// screen owns loading (getCompletedWorkoutSets + getExerciseLookup) and
// rendering; this owns the maths.

import { calculate1RM, isE1rmEligibleRow, isEstimatedMaxRow, loadMultiplierFor } from './algorithms';
import { buildExerciseLookup, exerciseTypeOf, loadSemanticsOf } from './exercise/lookup';

// A Map (the screens' type maps) or a plain object (the shared lookup's
// `exerciseTypeById` / `loadSemanticsById`), read the same way.
function mapGet(mapOrObject, key) {
  if (!mapOrObject) return undefined;
  if (typeof mapOrObject.get === 'function') return mapOrObject.get(key);
  return mapOrObject[key];
}

// A "session" is one workout. We group an exercise's sets by workout_id
// and take the best estimated 1RM in that session as the session's point,
// so the trend reflects the user's top working effort each time they
// trained the lift, not every individual set.

// Build the rows for the Lift Progress list.
//
//   sets       array of completed workout_sets (camelCase, newest first
//              is fine, order is normalised here)
//   exercisesOrLookup
//              the shared exercise lookup (src/lib/exercise/lookup.js,
//              database.getExerciseLookup) or an array of exercise records
//              (id, name, primaryMuscle, exerciseType, loadSemantics), the
//              shape recompReframe.js and athleteProfileSummary.js still pass
//
// D218 (founder order 2026-10-03, audit F-13 and F-4):
//  - A set contributes only through isEstimatedMaxRow (algorithms.js), the one
//    gate every estimated-max and record READ shares with the live record
//    detector and Exercise Detail's chart: no warm-up, myo-reps, rest-pause or
//    explosive row (their reps are summed efforts or not maximal), no
//    distance or duration set (metres and seconds in the weight and reps
//    columns), no assistance machine (the number entered is the help, so
//    more help read as a bigger lift), and a real load and real reps. The
//    best, the latest weight, the trend and the change all come only from
//    those sets, so an exercise with none of them has no row (it has no
//    estimated max), and this list can no longer disagree with the chart.
//  - Rows group by the RESOLVED exercise (a retired id and its survivor are
//    one row), and the name is the lookup's: the row's name, else the set's
//    own name snapshot (through the survivor name), else "Exercise".
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
export function buildLiftProgressRows(sets, exercisesOrLookup) {
  const isLookup = !!exercisesOrLookup && typeof exercisesOrLookup.resolve === 'function';
  const list = isLookup || !Array.isArray(exercisesOrLookup) ? [] : exercisesOrLookup;
  const lookup = isLookup ? exercisesOrLookup : buildExerciseLookup(list);
  // The array form also matches a row by its own id as given: the lookup
  // reads string ids (every real exercise id is one), and the array's other
  // callers and their fixtures must keep working unchanged.
  const directById = isLookup ? null : new Map(list.filter((e) => e && e.id != null).map((e) => [e.id, e]));
  const rowFor = (s) => lookup.resolve(s) ?? directById?.get(s.exerciseId ?? s.exercise_id) ?? null;

  // Group estimated-max sets by exercise, then by session (workout_id).
  const byExercise = new Map();
  for (const s of sets || []) {
    if (!s) continue;
    const rawId = s.exerciseId ?? s.exercise_id;
    if (rawId == null) continue;
    const resolved = rowFor(s);
    if (!isEstimatedMaxRow(s, exerciseTypeOf(resolved), loadSemanticsOf(resolved))) continue;
    const weight = Number(s.weight) || 0;
    const reps = Number(s.actualReps ?? s.actual_reps) || 0;
    const at = Number(s.createdAt ?? s.created_at) || 0;
    const sessionId = s.workoutId ?? s.workout_id ?? `t:${at}`;
    const exerciseId = resolved?.id ?? rawId;

    if (!byExercise.has(exerciseId)) byExercise.set(exerciseId, { firstSet: s, resolved, sessions: new Map() });
    const { sessions } = byExercise.get(exerciseId);
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, { at: 0, bestE1rm: 0, topWeight: 0 });
    }
    const sess = sessions.get(sessionId);
    sess.at = Math.max(sess.at, at);
    sess.bestE1rm = Math.max(sess.bestE1rm, calculate1RM(weight, reps));
    sess.topWeight = Math.max(sess.topWeight, weight);
  }

  const rows = [];
  for (const [exerciseId, { firstSet, resolved, sessions: sessionMap }] of byExercise) {
    const sessions = [...sessionMap.values()].sort((a, b) => a.at - b.at);
    if (sessions.length === 0) continue;

    const trend = sessions.map(s => Math.round(s.bestE1rm * 10) / 10);
    const latest = sessions[sessions.length - 1];
    const first = sessions[0];
    const bestE1rm = sessions.reduce((m, s) => Math.max(m, s.bestE1rm), 0);
    // Percent change from the first to the latest session. Needs at least
    // two sessions to mean anything; a single session has nothing to
    // compare against, so it reports null rather than a misleading 0%.
    const deltaPct = (sessions.length > 1 && first.bestE1rm > 0)
      ? Math.round(((latest.bestE1rm - first.bestE1rm) / first.bestE1rm) * 100)
      : null;

    rows.push({
      exerciseId,
      name: resolved?.name || lookup.nameFor(firstSet),
      primaryMuscle: resolved?.primaryMuscle ?? resolved?.primary_muscle ?? null,
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

// Build per-exercise, per-metric session series from the already-loaded set
// list. Pure and side-effect free. Grouping mirrors buildLiftProgressRows:
// working sets only, one point per session (workout), oldest -> newest.
// Returns Map<exerciseId, { e1rm:number[], heaviest:number[], reps:number[],
// volume:number[] }>.
//
// exerciseTypeById (optional Map<exerciseId, exercise_type>): distance/duration
// exercises reuse the weight column for metres / reps for seconds, so summing
// weight*reps or MAX(weight) for them would plot nonsense ("heaviest" metres,
// "volume" = metres*seconds). Their sets are skipped entirely. Anything not in
// the map defaults to weight_reps and is plotted as before.
//
// loadSemanticsById (optional Map<exerciseId, load_semantics>, or the shared
// lookup's plain object; D218, audit F-13): on an assistance machine
// ('assisted') the number entered is the HELP, so an estimated max on it reads
// more help as a bigger lift (D107-2: less assistance is stronger). Such an
// exercise's e1RM series is empty; every other lens keeps its rows. The volume
// lens counts load as the workout summary's Total lifted does
// (loadMultiplierFor: a per-hand set twice, an assistance machine's help not
// at all), so a dumbbell lift's chart total is the total the summary shows.
export function buildExerciseMetricSeries(sets, exerciseTypeById = null, loadSemanticsById = null) {
  const NON_LOAD = new Set(['distance', 'duration']);
  const byExercise = new Map();
  const assistedIds = new Set();
  for (const s of sets || []) {
    if (!s) continue;
    if (s.setType === 'warmup') continue;
    const exerciseId = s.exerciseId ?? s.exercise_id;
    if (exerciseId == null) continue;
    const type = mapGet(exerciseTypeById, exerciseId);
    if (type && NON_LOAD.has(type)) continue;
    const semantics = mapGet(loadSemanticsById, exerciseId);
    const assisted = semantics === 'assisted';
    const weight = Number(s.weight) || 0;
    const reps = Number(s.actualReps ?? s.actual_reps) || 0;
    if (weight <= 0 || reps <= 0) continue;
    const at = Number(s.createdAt ?? s.created_at) || 0;
    const sessionId = s.workoutId ?? s.workout_id ?? `t:${at}`;

    if (!byExercise.has(exerciseId)) byExercise.set(exerciseId, new Map());
    const sessions = byExercise.get(exerciseId);
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, { at: 0, e1rm: 0, heaviest: 0, reps: 0, volume: 0 });
    }
    const sess = sessions.get(sessionId);
    sess.at = Math.max(sess.at, at);
    // C12 job 1 (cross-metric consistency): the e1RM series and the plateau
    // detector must not describe the same history differently. Both now take
    // the best CANONICALLY ELIGIBLE estimate per session — this filter used
    // to drop warm-ups only, so a myo-rep or rest-pause row (whose reps are a
    // SUM of efforts) could spike the strength chart while the plateau
    // detector, which has refused those rows since C10D, saw no such jump.
    // Every other series (heaviest, reps, volume) keeps its existing rows.
    if (assisted) assistedIds.add(exerciseId);
    else if (isE1rmEligibleRow(s)) {
      sess.e1rm = Math.max(sess.e1rm, calculate1RM(weight, reps));
    }
    sess.heaviest = Math.max(sess.heaviest, weight);
    sess.reps += reps;
    sess.volume += weight * reps * loadMultiplierFor(semantics);
  }

  const out = new Map();
  for (const [exerciseId, sessionMap] of byExercise) {
    const ordered = [...sessionMap.values()].sort((a, b) => a.at - b.at);
    out.set(exerciseId, {
      e1rm: assistedIds.has(exerciseId) ? [] : ordered.map(s => Math.round(s.e1rm * 10) / 10),
      heaviest: ordered.map(s => Math.round(s.heaviest * 10) / 10),
      reps: ordered.map(s => s.reps),
      volume: ordered.map(s => Math.round(s.volume)),
    });
  }
  return out;
}

// B1 (progress-tab audit 2026-09-24): percent change from the first to the
// last point of ANY per-lens series (one of buildExerciseMetricSeries's
// e1rm/heaviest/reps/volume arrays, oldest -> newest), mirroring the exact
// "first session to latest" formula buildLiftProgressRows already uses for
// its own (e1RM-only) deltaPct above. Used by LiftProgressScreen's row
// badge so the "+N%" beside a non-e1RM headline (Heaviest weight / Total
// reps / Total lifted) reports THAT lens's own change instead of always the
// e1RM one. Needs at least two points to mean anything and a non-zero,
// finite first value to divide by; returns null rather than a misleading
// 0% or an Infinity/NaN otherwise, same as buildLiftProgressRows's guard.
export function seriesDeltaPct(series) {
  if (!Array.isArray(series) || series.length < 2) return null;
  const first = series[0];
  const last = series[series.length - 1];
  if (!Number.isFinite(first) || !Number.isFinite(last) || first === 0) return null;
  return Math.round(((last - first) / first) * 100);
}

// Item 10 (campaign 2026-07-10, CP-5 residue): which points in a session
// series earned a personal best, for LiftProgressScreen's row sparkline
// marker (Sparkline's new highlightIndices, same gold ring-and-dot idiom
// ExerciseDetail's chart already uses). A point is a PR when it strictly
// beats the running max of every point before it. Mirrors
// ExerciseDetailScreen's derivePRSessionDates rule that the very first point
// "beats" an empty history but is a first-lift acknowledgement, not a
// record: index 0 is never marked. Pure, oldest -> newest, and metric-
// agnostic (works for the e1rm/heaviest/reps/volume series alike), so it can
// be applied to whichever lens the row is currently showing. Non-finite
// entries are skipped rather than resetting the running max.
export function derivePRIndices(series) {
  const indices = [];
  let runningMax = null;
  (series || []).forEach((v, i) => {
    if (!Number.isFinite(v)) return;
    if (runningMax != null && v > runningMax) indices.push(i);
    if (runningMax == null || v > runningMax) runningMax = v;
  });
  return indices;
}
