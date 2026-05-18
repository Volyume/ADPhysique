/**
 * insightsEngine.js
 * Deterministic, explainable rule engine that surfaces "For You" insight cards.
 *
 * Pure function: same inputs → same outputs. No DB calls, no side effects.
 * Persistence (user_insights table) is handled by the database layer.
 *
 * Jargon rule: user-facing `copy` never contains MEV/MAV/MRV/RIR/RPE/mesocycle.
 *
 * Insight types: under_mev_muscle | stalled_lift | peaked_lift |
 *                recovery_warn | deload_due | gentle_rhythm
 */

import { calculateWeeklyVolume, VOLUME_LANDMARKS, MUSCLE_DISPLAY_NAMES } from './algorithms';
import { computeRecoveryEMAs, emaWeekOverWeekPct } from './recoveryEMA';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

// severity: 0 info · 1 notice · 2 warning
function mkInsight(type, severity, copy, key, actionPayload = null) {
  return { type, severity, copy, key, actionPayload, generatedAt: Date.now() };
}

function topSetOf(sets) {
  // "top set" = highest weight; tie-break highest reps
  return sets.reduce((best, s) => {
    const w = s.weight ?? 0;
    const r = s.actualReps ?? s.actual_reps ?? 0;
    if (!best) return s;
    const bw = best.weight ?? 0;
    const br = best.actualReps ?? best.actual_reps ?? 0;
    if (w > bw || (w === bw && r > br)) return s;
    return best;
  }, null);
}

function sessionsByDay(sets) {
  // group set timestamps into day-keyed sessions for an exercise
  const byDay = new Map();
  for (const s of sets) {
    const at = s.createdAt ?? s.created_at ?? 0;
    const day = Math.floor(at / DAY_MS);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(s);
  }
  return [...byDay.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([day, daySets]) => ({ day, sets: daySets }));
}

/**
 * @param {object} args
 * @param {Array}  args.workouts     - all workouts (need startedAt/createdAt + feedback)
 * @param {Array}  args.sets         - all workout_sets
 * @param {Object} args.exerciseMap  - { exerciseId: exercise }
 * @param {number} [args.now]
 * @returns {Array} insight objects (unsorted/uncapped — caller persists & caps)
 */
export function generateInsights({ workouts = [], sets = [], exerciseMap = {}, now = Date.now() }) {
  const insights = [];

  // A "low volume for 3 weeks" nudge only makes sense once there is an
  // actual 3-week training base. For brand-new users (no history, or a
  // first session only days ago) it is meaningless noise — there is no
  // trend to be down from. Require completed sessions spanning ≥ 3 weeks.
  const completed = workouts.filter(w => w.isCompleted ?? w.is_completed ?? false);
  const earliestStart = completed.reduce(
    (min, w) => Math.min(min, w.startedAt ?? w.createdAt ?? now),
    now,
  );
  const hasThreeWeekBase =
    completed.length >= 6 && (now - earliestStart) >= 3 * WEEK_MS;

  // ---- Rule 1: under-target muscle for 3 rolling weeks --------------------
  for (let muscleKey of (hasThreeWeekBase ? Object.keys(VOLUME_LANDMARKS) : [])) {
    const lm = VOLUME_LANDMARKS[muscleKey];
    if (!lm || lm.mev <= 0) continue;
    let trainedAtAll = false;
    let allWeeksLow = true;
    for (let wk = 0; wk < 3; wk++) {
      const end = now - wk * WEEK_MS;
      const start = end - WEEK_MS;
      const weekSets = sets.filter(s => {
        const at = s.createdAt ?? s.created_at ?? 0;
        return at >= start && at < end;
      });
      const vol = calculateWeeklyVolume(weekSets, exerciseMap);
      const wSets = vol[muscleKey]?.workingSets ?? 0;
      if (wSets > 0) trainedAtAll = true;
      if (wSets >= lm.mev) allWeeksLow = false;
    }
    if (trainedAtAll && allWeeksLow) {
      const name = MUSCLE_DISPLAY_NAMES[muscleKey] ?? muscleKey;
      insights.push(mkInsight(
        'under_mev_muscle', 1,
        `Your ${name.toLowerCase()} volume has been low for 3 weeks. Adding a set or two this week will get it growing again.`,
        `under_mev_${muscleKey}`,
        { muscle: muscleKey },
      ));
    }
  }

  // ---- Rule 2 & 3: stalled / peaked lifts --------------------------------
  const setsByExercise = {};
  for (const s of sets) {
    const id = s.exerciseId ?? s.exercise_id;
    if (!id) continue;
    (setsByExercise[id] ??= []).push(s);
  }

  for (const [exId, exSets] of Object.entries(setsByExercise)) {
    const ex = exerciseMap[exId];
    if (!ex) continue;
    const exName = ex.name ?? 'this lift';
    const repMax = ex.defaultRepMax ?? ex.default_rep_max ?? null;
    const sessions = sessionsByDay(exSets);
    if (sessions.length < 4) continue;

    const recent = sessions.slice(-4);
    const tops = recent.map(s => topSetOf(s.sets)).filter(Boolean);
    if (tops.length < 4) continue;

    // peaked: last 2 sessions hit top of rep range with room (rir>=1)
    if (repMax) {
      const last2 = tops.slice(-2);
      const peaked = last2.every(t => {
        const r = t.actualReps ?? t.actual_reps ?? 0;
        const rir = t.rir ?? 9;
        return r >= repMax && rir >= 1;
      });
      if (peaked) {
        insights.push(mkInsight(
          'peaked_lift', 1,
          `You hit the top of your rep range on ${exName} twice in a row — time to add a little weight next session.`,
          `peaked_${exId}`,
          { exerciseId: exId },
        ));
        continue;
      }
    }

    // stalled: 4 sessions same top weight & reps, with reps short of failure
    const w0 = tops[0].weight ?? 0;
    const r0 = tops[0].actualReps ?? tops[0].actual_reps ?? 0;
    const flat = tops.every(t =>
      (t.weight ?? 0) === w0 &&
      (t.actualReps ?? t.actual_reps ?? 0) === r0,
    );
    const avgRir = tops.reduce((a, t) => a + (t.rir ?? 0), 0) / tops.length;
    if (flat && w0 > 0 && avgRir >= 3) {
      insights.push(mkInsight(
        'stalled_lift', 1,
        `${exName} has been stuck at the same weight for 4 sessions but you've had reps left in the tank. Push closer to your limit or nudge the weight up.`,
        `stalled_${exId}`,
        { exerciseId: exId },
      ));
    }
  }

  // ---- Rule 4: recovery warning (soreness trend up) ----------------------
  const sorenessPts = workouts
    .filter(w => w.soreness24hBefore != null)
    .map(w => ({ value: w.soreness24hBefore, at: w.startedAt ?? w.createdAt ?? w.created_at ?? 0 }))
    .filter(p => p.at > 0);
  const sorenessWoW = emaWeekOverWeekPct(sorenessPts, now);
  if (sorenessWoW != null && sorenessWoW >= 18) {
    insights.push(mkInsight(
      'recovery_warn', 2,
      `Your soreness coming into sessions is trending up week-on-week. Prioritise sleep and protein — if it keeps climbing, a lighter week is coming.`,
      'recovery_warn',
      { sorenessWoW: Math.round(sorenessWoW) },
    ));
  }

  // ---- Rule 5: deload due (over MRV 2+ weeks OR high fatigue EMA) ---------
  let overMrvWeeks = 0;
  for (let wk = 0; wk < 4; wk++) {
    const end = now - wk * WEEK_MS;
    const start = end - WEEK_MS;
    const weekSets = sets.filter(s => {
      const at = s.createdAt ?? s.created_at ?? 0;
      return at >= start && at < end;
    });
    const vol = calculateWeeklyVolume(weekSets, exerciseMap);
    const over = Object.entries(vol).some(([m, v]) => {
      const lm = VOLUME_LANDMARKS[m];
      return lm && v.workingSets > lm.mrv;
    });
    if (over) overMrvWeeks++;
  }
  const { fatigue } = computeRecoveryEMAs(
    workouts.filter(w => w.isCompleted ?? w.is_completed ?? true), now,
  );
  if (overMrvWeeks >= 2 || (fatigue != null && fatigue >= 4.3)) {
    insights.push(mkInsight(
      'deload_due', 2,
      `Your training load and fatigue are both running high. A lighter week soon will let you come back stronger — not a setback, part of the plan.`,
      'deload_due',
      { overMrvWeeks, fatigue: fatigue != null ? Math.round(fatigue * 10) / 10 : null },
    ));
  }

  // ---- Rule 6: gentle rhythm (info, never a threat) ----------------------
  const days21Ago = now - 21 * DAY_MS;
  const trainedDays = new Set();
  for (const w of workouts) {
    const at = w.startedAt ?? w.createdAt ?? w.created_at ?? 0;
    if (at >= days21Ago && (w.isCompleted ?? w.is_completed ?? true)) {
      trainedDays.add(Math.floor(at / DAY_MS));
    }
  }
  if (trainedDays.size >= 4) {
    insights.push(mkInsight(
      'gentle_rhythm', 0,
      `You've trained ${trainedDays.size} of the last 21 days. Steady work — this is what progress looks like.`,
      'gentle_rhythm',
      { count: trainedDays.size },
    ));
  }

  return insights;
}

/**
 * Sorts by severity desc then recency, caps to `max` (default 3).
 */
export function rankAndCapInsights(insights, max = 3) {
  return [...insights]
    .sort((a, b) => b.severity - a.severity || b.generatedAt - a.generatedAt)
    .slice(0, max);
}
