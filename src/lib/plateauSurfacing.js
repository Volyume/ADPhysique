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
  let qualifying = 0;
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

    // C12 job 3: ONE verdict. The span and session count come from the
    // detector, which derives them from LOCAL calendar dates. This module
    // used to recompute weeks itself as `spanMs / WEEK_MS`, a second
    // definition that also drifted by an hour across a DST boundary.
    const totalSets = [...byWorkout.values()].reduce((t, g) => t + g.length, 0);

    const candidate = {
      exerciseId,
      consecutiveStalls: result.consecutiveStalls,
      weeks: result.weeks,
      sessions: result.sessions,
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
    qualifying += 1;
  }

  if (!best) return null;
  const { totalSets: _ignored, ...picked } = best;
  // C12 job 3: the map recorded a comprehension gap - Home can pick ONE
  // plateau from several but told the user only the lift and the duration,
  // never that a choice had been made. `selectedFrom` lets the banner add one
  // restrained clause when a selection actually happened. It stays absent
  // when only one lift qualified, because then nothing was selected and any
  // explanation would be noise. The tie-break rules themselves are never
  // exposed.
  return { ...picked, selectedFrom: qualifying };
}

// The banner line. Calm, specific, actionable; British English, no em dash
// (docs/COACHING_VOICE_SYNTHESIS_LOCKED.md).
// C6 RD6-3 + RD6-4 (D97-25): "has plateaued for N weeks" claimed more
// than the detector measures on two axes. The detector compares SESSION
// AVERAGES over every set (warm-ups included), so a user who added
// three reps to their top set could be told they had plateaued; and the
// weeks figure was the calendar span of as few as three sessions, so
// three sessions across eight weeks read "plateaued for 7 weeks". The
// line now states the measured quantity and carries the density it
// rests on (sessions AND span), inviting a look instead of asserting a
// verdict the tap-through detail lets the user judge for themselves.
// C12: the measured quantity is now the BEST eligible set per session, not
// the session average, and job 2 guarantees the time claim, so the line says
// what it means. The span is whatever the run really was - "across 3 weeks",
// "across 5 weeks" - never derived from the session count. `selectedFrom`
// adds one restrained clause when Home genuinely chose between several
// current plateaus; the tie-break itself is never described.
export function plateauBannerLine(exerciseName, weeks, sessions = null, selectedFrom = 1) {
  const n = Math.max(1, Math.round(weeks ?? 1));
  const unit = n === 1 ? 'week' : 'weeks';
  const sc = Number.isFinite(sessions) && sessions >= 2 ? sessions : null;
  const density = sc ? ` across your last ${sc} sessions` : '';
  const chosen = Number.isFinite(selectedFrom) && selectedFrom > 1
    ? ' Your longest current stall.'
    : '';
  return `${exerciseName}'s best set hasn't moved across ${n} ${unit}${density}.${chosen} Tap to take a look.`;
}
