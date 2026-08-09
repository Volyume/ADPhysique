/**
 * blockLedgerGather.js — pure transforms for the Block Ledger gather
 * (Stage 6 of the adaptive mesocycle build; authority
 * docs/blueprint-adaptive-mesocycle-2026-08-09.md §3.1/§3.9 item 2).
 *
 * These turn raw stored rows into interBlock's recovery/systemic inputs,
 * the PR rebound windows and the seeded weekly ramp. The impure runner
 * (blockLedgerRunner.js) only fetches rows and calls these, so every
 * piece of judgement is deterministic and pinned by
 * blockLedgerGather.stage6.test.js.
 *
 * Scale contracts:
 * - workouts.soreness_24h_before is 1-3 on device; interBlock's
 *   sorenessLateAvg speaks the 1-5 model scale. remapSoreness13to15 is
 *   the adaptive-history precedent (1->2, 2->3, 3->4), so a device "3 =
 *   sore" lands exactly on the worked examples' ">= 4" threshold.
 * - readinessSlope is the normalised TOTAL change across the block
 *   ((last - first) / 100 on the 0-100 readiness scale): a 30+ point
 *   decline reads <= -0.3, interBlock's persistent-signal line. The
 *   runner computes the 0-100 values with blockAdvisor's own
 *   checkinReadiness (reuse, not a fork) and passes plain numbers here.
 * - The advisor's live deload flag was never persisted (Stage 3 recon
 *   G1); the persisted substitutes are coach_outputs.recovery_flag =
 *   'deload_suggested' (dated by week_start) and an APPLIED early
 *   deload (mesocycle_weeks.is_deload on a non-final week). Mid-block
 *   means before the peak week (D91 ruling 4).
 */
import { allocateExerciseVolume } from './algorithms';
import { localDaysElapsed } from './mesocycle';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

const SLEEP_FLAG_HOURS = 6.5;      // blockAdvisor's medium threshold
const REBOUND_GAP_MAX_DAYS = 14;   // a longer gap is detraining, not rebound

const num = (v, fallback) => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return Number.isFinite(n) ? n : fallback;
};

const localStartOfDay = (ms) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

const weekOf = (blockStart, at) => {
  if (localStartOfDay(at) < localStartOfDay(blockStart)) return 0;
  return Math.floor(localDaysElapsed(blockStart, at) / 7) + 1;
};

function accumulationWeeks(blockWeeks, deloadWeekIndex) {
  const weeks = [];
  for (let w = 1; w <= blockWeeks; w += 1) if (w !== deloadWeekIndex) weeks.push(w);
  return weeks;
}

/** Device 1-3 soreness onto the 1-5 model scale; unknowns stay null. */
export function remapSoreness13to15(v) {
  const n = num(v, null);
  if (n === 1) return 2;
  if (n === 2) return 3;
  if (n === 3) return 4;
  return null;
}

/**
 * Per-muscle recovery aggregates over the block's accumulation window.
 * rows: [{ at, soreness13, joint }] — the muscle's block sessions'
 * feedback (soreness_24h_before, joint_discomfort).
 */
export function computeMuscleRecoveryAggregates({
  rows = [],
  blockStart,
  blockWeeks,
  deloadWeekIndex = blockWeeks,
} = {}) {
  const accum = accumulationWeeks(blockWeeks, deloadWeekIndex);
  const splitAt = Math.ceil(accum.length / 2);
  const lateWeeks = new Set(accum.slice(splitAt));
  const accumSet = new Set(accum);

  let dataPoints = 0;
  const lateSoreness = [];
  const joints = [];
  for (const row of rows) {
    const at = num(row?.at, null);
    if (at == null) continue;
    const w = weekOf(blockStart, at);
    if (!accumSet.has(w)) continue;
    const soreness = remapSoreness13to15(row.soreness13);
    const joint = num(row.joint, null);
    if (soreness != null || joint != null) dataPoints += 1;
    if (soreness != null && lateWeeks.has(w)) lateSoreness.push(soreness);
    if (joint != null) joints.push(joint);
  }

  return {
    sorenessLateAvg: lateSoreness.length
      ? lateSoreness.reduce((s, v) => s + v, 0) / lateSoreness.length
      : null,
    jointDiscomfortAvg: joints.length
      ? joints.reduce((s, v) => s + v, 0) / joints.length
      : 0,
    dataPoints,
  };
}

/**
 * Normalised total readiness change across the block: (last - first)/100
 * over chronological 0-100 readiness values. Fewer than two points say
 * nothing.
 */
export function computeReadinessSlope(values = []) {
  const clean = values.map((v) => num(v, null)).filter((v) => v != null);
  if (clean.length < 2) return 0;
  return (clean[clean.length - 1] - clean[0]) / 100;
}

/** Weeks whose check-in slept under the flag threshold; unknowns never count. */
export function countSleepFlaggedWeeks(checkins = []) {
  let count = 0;
  for (const ci of checkins) {
    const hours = num(ci?.sleepHours, null);
    if (hours != null && hours < SLEEP_FLAG_HOURS) count += 1;
  }
  return count;
}

/**
 * Persisted deload evidence -> the flag pair interBlock reads.
 * recoveryFlagWeekStarts: week_start ms of coach outputs whose
 * recovery_flag was 'deload_suggested'. appliedEarlyDeloadWeekIndices:
 * mesocycle_weeks with is_deload = 1 on a NON-final week (the user
 * accepted an early deload — the strongest persisted evidence).
 */
export function deriveDeloadFlags({
  recoveryFlagWeekStarts = [],
  appliedEarlyDeloadWeekIndices = [],
  blockStart,
  blockWeeks,
  deloadWeekIndex = blockWeeks,
} = {}) {
  const accum = accumulationWeeks(blockWeeks, deloadWeekIndex);
  const accumSet = new Set(accum);
  const peakWeek = accum.length ? accum[accum.length - 1] : blockWeeks;

  const signalWeeks = [];
  for (const ws of recoveryFlagWeekStarts) {
    const at = num(ws, null);
    if (at == null) continue;
    const w = weekOf(blockStart, at);
    if (accumSet.has(w)) signalWeeks.push(w);
  }
  for (const w of appliedEarlyDeloadWeekIndices) {
    const idx = num(w, null);
    if (idx != null && accumSet.has(idx)) signalWeeks.push(idx);
  }

  const deloadFlagFired = signalWeeks.length > 0;
  const deloadFlagMidBlock = signalWeeks.some((w) => w < peakWeek);
  return { deloadFlagFired, deloadFlagMidBlock };
}

/**
 * PR rebound windows: the block's first week when it starts on the heels
 * of the previous block (within 14 days of its end), plus the week after
 * any applied early deload. PR events inside these windows carry the
 * 0.25 rebound weight in blockMetrics.
 */
export function computeReboundWindows({
  previousBlockEndMs = null,
  blockStart,
  blockWeeks,
  deloadWeekIndex = blockWeeks,
  appliedEarlyDeloadWeekIndices = [],
} = {}) {
  const windows = [];
  const prevEnd = num(previousBlockEndMs, null);
  if (prevEnd != null && prevEnd <= blockStart
    && localDaysElapsed(prevEnd, blockStart) <= REBOUND_GAP_MAX_DAYS) {
    windows.push({ start: blockStart, end: blockStart + WEEK_MS });
  }
  for (const w of appliedEarlyDeloadWeekIndices) {
    const idx = num(w, null);
    if (idx == null) continue;
    const following = idx + 1;
    if (following >= 1 && following <= blockWeeks && following !== deloadWeekIndex) {
      windows.push({ start: blockStart + idx * WEEK_MS, end: blockStart + (idx + 1) * WEEK_MS });
    }
  }
  return windows;
}

/** Sum a muscle's planned sets across the block's planned_muscle_volume rows. */
export function sumPlannedSets(rows = [], muscle) {
  let total = 0;
  for (const row of rows) {
    if ((row?.muscle ?? null) !== muscle) continue;
    total += num(row.plannedSets ?? row.planned_sets, 0);
  }
  return total;
}

/**
 * Sum a muscle's COMPLETED working-set credit over block sets, through
 * the app's single allocator (primary 1.0, secondaries at their
 * contribution) — the same attribution the planned targets were built
 * with, so the adherence ratio compares like with like.
 */
export function sumCompletedSets(sets = [], exercisesById = null, muscle) {
  const lookup = (id) => (exercisesById instanceof Map
    ? exercisesById.get(id)
    : (Object.prototype.hasOwnProperty.call(exercisesById ?? {}, id) ? exercisesById[id] : undefined));
  let total = 0;
  for (const row of sets) {
    if ((row?.setType ?? row?.set_type) === 'warmup') continue;
    const reps = num(row?.actualReps ?? row?.actual_reps ?? row?.reps, 0);
    if (!(reps > 0)) continue;
    const ex = lookup(row?.exerciseId ?? row?.exercise_id);
    if (!ex) continue;
    try {
      for (const alloc of allocateExerciseVolume(ex)) {
        if (alloc.muscle === muscle) total += alloc.sets;
      }
    } catch (_e) { /* unallocatable exercise: no credit */ }
  }
  return total;
}

/**
 * Feedback rows for the sessions where the muscle worked as PRIMARY:
 * the recovery aggregates' input. Ordered by session date.
 */
export function collectMuscleSessionRows({
  sets = [],
  workouts = [],
  exercisesById = null,
  muscle,
} = {}) {
  const lookup = (id) => (exercisesById instanceof Map
    ? exercisesById.get(id)
    : (Object.prototype.hasOwnProperty.call(exercisesById ?? {}, id) ? exercisesById[id] : undefined));
  const sessionIds = new Set();
  for (const row of sets) {
    if ((row?.setType ?? row?.set_type) === 'warmup') continue;
    const ex = lookup(row?.exerciseId ?? row?.exercise_id);
    if (!ex) continue;
    try {
      if (allocateExerciseVolume(ex).some((a) => a.role === 'primary' && a.muscle === muscle)) {
        const wid = row?.workoutId ?? row?.workout_id;
        if (wid != null) sessionIds.add(wid);
      }
    } catch (_e) { /* unallocatable exercise */ }
  }
  return workouts
    .filter((w) => sessionIds.has(w?.id))
    .map((w) => ({
      at: num(w.startedAt ?? w.started_at ?? w.createdAt ?? w.created_at, null),
      soreness13: num(w.soreness24hBefore ?? w.soreness_24h_before, null),
      joint: num(w.jointDiscomfort ?? w.joint_discomfort, null),
    }))
    .filter((r) => r.at != null)
    .sort((a, b) => a.at - b.at);
}

/**
 * The highest single ACCUMULATION week of completed allocator credit for
 * the muscle — interBlock's achievedPeak. Deload-week work is prescribed
 * light and never counts as a peak.
 */
export function computeAchievedWeeklyPeak({
  sets = [],
  exercisesById = null,
  muscle,
  blockStart,
  blockWeeks,
  deloadWeekIndex = blockWeeks,
} = {}) {
  const accumSet = new Set(accumulationWeeks(blockWeeks, deloadWeekIndex));
  const byWeek = new Map();
  for (const row of sets) {
    const at = num(row?.createdAt ?? row?.created_at, null);
    if (at == null) continue;
    const w = weekOf(blockStart, at);
    if (!accumSet.has(w)) continue;
    const credit = sumCompletedSets([row], exercisesById, muscle);
    if (credit > 0) byWeek.set(w, (byWeek.get(w) ?? 0) + credit);
  }
  let peak = 0;
  for (const total of byWeek.values()) peak = Math.max(peak, total);
  return Math.round(peak);
}

/**
 * The seeded weekly ramp: linear start -> peak across the accumulation
 * weeks (whole sets at every step), then the deload week. A peak below
 * the start never descends — the ramp holds at the start instead
 * (retention is a hold, not a taper).
 */
export function buildSeededWeeklyTargets({
  startSets,
  peakSets,
  accumWeeks,
  deloadSets,
} = {}) {
  const start = num(startSets, 0);
  const peak = Math.max(num(peakSets, start), start);
  const n = Math.max(1, num(accumWeeks, 1));
  const targets = [];
  for (let i = 0; i < n; i += 1) {
    targets.push(n === 1 ? peak : Math.round(start + ((peak - start) * i) / (n - 1)));
  }
  targets.push(Math.round(num(deloadSets, 0)));
  return targets;
}
