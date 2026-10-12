/**
 * serve.js -- D222 phase 6 (R62): what a structure plan serves in a block week.
 *
 * Authority: docs/audit/plan-builder-map-2026-10-11/23-PHASE6-INTEGRATION-SPEC.md
 * R60 and R62. Kept apart from ./adapt.js so the serving path
 * (sessionAdjustments) imports nothing but this. Pure, no I/O, deterministic.
 */

/** True for facts an engine plan carries (R60). */
export function isStructureFacts(facts) {
  return facts?.version === 2 && facts?.structure?.version === 3 && Array.isArray(facts.structure.sessions);
}

/**
 * R62: what a structure plan serves in block week `weekIndex` (1-based) for
 * today's rows. Each row is matched to its structure exercise by routine
 * exercise id, else by exercise id within the routine (in order, so an
 * exercise twice in a session maps in turn). A matched row is served the
 * ladder's sets for the week, unless the person typed a count for it
 * (facts.typed wins, as today); a row with no match (added by hand later) is
 * left to the caller, served as today. The effort is the ladder's RIR where it
 * is higher than the block week's (the next-day exception).
 *
 * @param {object} args
 * @param {object} args.facts      the plan's facts
 * @param {string} args.routineId  today's routine
 * @param {number} args.weekIndex  the block week, 1-based
 * @param {?number} [args.weekRir] the block week's RIR target
 * @param {boolean} [args.isDeload] the block week is the recovery week (mesocycle_weeks.is_deload).
 *        The recovery week serves the ladder's last entry (the engine's deload
 *        week); a working week serves its own entry, clamped to the last
 *        working week, never the recovery entry (a kept block can be 5 weeks
 *        with week 5 the recovery week, or 6 with week 6)
 * @param {Array<{exerciseId: ?string, slotId: ?string, cap?: number}>} args.exercises
 *        today's rows; `cap` holds an exercise put in a slot for today (a one-off
 *        swap) to its own cap, as servedSetsCap does today
 * @param {Object<string, number>} [args.ramp]  D222 phase 7 (R74): the injury
 *        ramp's week (planned_muscle_volume rows with source 'reintroduction'),
 *        app muscle -> its planned direct sets. Each exercise of such a muscle
 *        is served its share of the ramp's figure against the plan's own
 *        figure for the week (facts.weeklyTargets), never above the ladder
 *        and never below one set
 * @returns {{ sets: Object<string, number>, rir: Object<string, number> }}  by exercise id
 */
export function structureServedWeek({ facts, routineId, weekIndex, weekRir = null, isDeload = false, exercises, ramp = null }) {
  const out = { sets: {}, rir: {} };
  if (!isStructureFacts(facts) || !routineId || !Number.isInteger(weekIndex) || weekIndex < 1) return out;
  const session = facts.structure.sessions.find((s) => s && s.routineId === routineId);
  if (!session) return out;
  const list = Array.isArray(session.exercises) ? session.exercises : [];
  const typed = facts.typed != null && typeof facts.typed === 'object' && !Array.isArray(facts.typed) ? facts.typed : {};
  const taken = new Set();
  const rows = Array.isArray(exercises) ? exercises : [];
  // Rows whose routine exercise id is recorded claim their exercise first, so
  // the order fallback below never takes a recorded row's exercise.
  const match = new Map();
  rows.forEach((row, i) => {
    const j = row?.slotId != null ? list.findIndex((x, k) => !taken.has(k) && x.routineExerciseId != null && x.routineExerciseId === row.slotId) : -1;
    if (j >= 0) { taken.add(j); match.set(i, j); }
  });
  rows.forEach((row, i) => {
    if (match.has(i) || !row?.exerciseId) return;
    const j = list.findIndex((x, k) => !taken.has(k) && x.routineExerciseId == null && x.exerciseId === row.exerciseId);
    if (j >= 0) { taken.add(j); match.set(i, j); }
  });
  for (const [i, j] of match) {
    const row = rows[i];
    const ladder = Array.isArray(list[j].weeks) ? list[j].weeks : [];
    const week = isDeload === true
      ? ladder[ladder.length - 1]
      : ladder[Math.max(1, Math.min(weekIndex, ladder.length - 1)) - 1];
    if (!row.exerciseId || !week) continue;
    const t = row.slotId != null ? typed[row.slotId] : undefined;
    // D222 phase 7 (R76): a typed count is served as typed; the recovery
    // week still halves it (never below one set).
    if (typeof t === 'number' && Number.isFinite(t) && t >= 1) out.sets[row.exerciseId] = isDeload === true ? Math.max(1, Math.round(t / 2)) : t;
    else if (Number.isFinite(week.sets) && week.sets >= 1) {
      // The planned exercise is served the ladder as built; another exercise
      // in its place today is held to its own cap.
      const swapped = row.exerciseId !== list[j].exerciseId && Number.isFinite(row.cap) && row.cap >= 1;
      out.sets[row.exerciseId] = swapped ? Math.min(week.sets, row.cap) : week.sets;
    }
    if (Number.isFinite(week.rir) && (!Number.isFinite(weekRir) || week.rir > weekRir)) out.rir[row.exerciseId] = week.rir;
    // R74: the injury ramp only lowers; it never takes an exercise above its ladder.
    const app = APP_KEY[list[j].muscle] ?? list[j].muscle;
    const held = ramp && Number.isFinite(ramp[app]) ? ramp[app] : null;
    const planned = held != null && Array.isArray(facts.weeklyTargets?.[app]) ? facts.weeklyTargets[app][weekIndex - 1] : null;
    if (held != null && Number.isFinite(planned) && planned > 0 && held < planned && Number.isFinite(out.sets[row.exerciseId])) {
      const now = out.sets[row.exerciseId];
      out.sets[row.exerciseId] = Math.max(1, Math.min(now, Math.round((now * held) / planned)));
    }
  }
  return out;
}

// The app's muscle key of an engine muscle (adapt.appMuscleOf's merges),
// kept here so the serving path imports nothing heavy.
const APP_KEY = Object.freeze({ lats: 'back', upper_back: 'back', glute_max: 'glutes', glute_med: 'glutes' });
