/**
 * blockLedgerRunner.js — the impure Block Ledger assembly (Stage 6 of
 * the adaptive mesocycle build; authority
 * docs/blueprint-adaptive-mesocycle-2026-08-09.md §3.9 items 2-3 + the
 * founder's Stage 6 order). Hardened after the Stage 6 adversarial
 * review (2026-08-09): the ledger only computes for a FINISHED block
 * (awaitingDecision — a mid-block caller can never freeze a premature
 * ledger); check-in/coach-output windows align to local week starts so
 * block week 1's rows are never dropped; the real tier threads through
 * (the adapted layer stays Pro-gated); the profile prior speaks the
 * nutrition-phase vocabulary; the learned-range replay sees the
 * just-finished block; and manual overrides only count when the user
 * actually EDITED the muscle (untouched editor defaults are not
 * overrides).
 *
 * This is the THIN layer: it fetches rows through database.js and hands
 * every judgement to the pure modules (blockMetrics -> performance,
 * blockLedgerGather -> recovery/systemic/windows/ramps/priors,
 * interBlock -> classification, learnedRange -> block-grain memory,
 * blockSeed -> the seeding fallback chain).
 *
 * Suppression is read fail-CLOSED (the widget writer's pattern): a
 * transient ED-flag or wellbeing read failure counts as suppressed, so
 * a possibly-flagged user can never receive an upward carry because a
 * read timed out.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAllMesocyclesForUser,
  getBlockTrainingData,
  getPriorCompletedSets,
  getPlannedMuscleVolumeForBlock,
  getDeloadSuggestedWeekStarts,
  getExerciseRowsById,
  getCheckinsInRange,
  getMesocycleWeeks,
  getOpenEdPatternFlag,
  storeBlockLedger,
} from './database';
import { buildBlockLedger, LEDGER_VERSION } from './interBlock';
import { computeBlockPerformance } from './blockMetrics';
import {
  computeMuscleRecoveryAggregates,
  computeReadinessSlope,
  countSleepFlaggedWeeks,
  deriveDeloadFlags,
  computeReboundWindows,
  sumPlannedSets,
  sumCompletedSets,
  collectMuscleSessionRows,
  computeAchievedWeeklyPeak,
  profileAdjustedPrior,
  priorLedgerEntries,
  trailingStaleCount,
} from './blockLedgerGather';
import { computeLearnedRange } from './learnedRange';
import { resolveSeedRange } from './blockSeed';
import { getManualLandmarks, getAdaptedLandmarks, mergeLandmarkPrecedence, isManualEdit } from './effectiveLandmarks';
import { getBlockStatus } from './mesocycle';
import { VOLUME_LANDMARKS } from './algorithms';
import { localWeekStartMs } from './dayKey';
import { isCalm, WELLBEING_KEY } from './wellbeing';
import { logError } from './errorLog';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
// §3.1 speaks of "the SAME lifts' previous-block bests"; a bounded prior
// window keeps the read cheap while comfortably covering the previous
// two blocks (documented narrowing, Stage 6 review NIT).
const PRIOR_WINDOW_DAYS = 180;

const toMs = (v) => {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : new Date(v).getTime();
  return Number.isFinite(n) ? n : null;
};

/** Calm mode OR open ED flag, fail closed on any read failure. */
async function readSuppression(userId) {
  const edFlag = await getOpenEdPatternFlag(userId).catch(() => 'read_failed');
  const wellbeing = await AsyncStorage.getItem(WELLBEING_KEY)
    .then((v) => v || 'unspecified').catch(() => 'read_failed');
  return !!edFlag || wellbeing === 'read_failed' || isCalm(wellbeing);
}

/**
 * Compute the finished block's ledger and persist it on the mesocycle
 * row. Idempotent: an already-stored ledger at the current version is
 * returned as-is (pass { force: true } to rebuild), so a reopened
 * completion screen, a sync retry or an app restart can never learn
 * twice. Returns the parsed ledger, or null when the block is not
 * finished (awaitingDecision) or cannot be judged.
 */
export async function computeAndStoreBlockLedger(userId, mesocycleId, { force = false, userProfile = null, tier = 'free' } = {}) {
  try {
    const mesos = await getAllMesocyclesForUser(userId);
    const meso = mesos.find((m) => m.id === mesocycleId);
    if (!meso) return null;
    const blockStart = toMs(meso.startDate);
    const blockWeeks = meso.plannedWeeks ?? meso.durationWeeks ?? 5;
    if (blockStart == null || !(blockWeeks >= 2)) return null;
    const deloadWeekIndex = meso.deloadWeek ?? blockWeeks;

    // A ledger is BLOCK-END evidence. A mid-block computation would be
    // premature AND, because of the idempotency above, frozen for ever —
    // so the finished state is a hard precondition (review #14).
    const status = getBlockStatus(blockStart, blockWeeks);
    if (!status.awaitingDecision) return null;

    if (!force && meso.blockLedger) {
      try {
        const stored = JSON.parse(meso.blockLedger);
        if (stored?.version === LEDGER_VERSION) return stored;
      } catch (_e) { /* recompute below */ }
    }

    const blockEnd = blockStart + blockWeeks * WEEK_MS;
    // Week-keyed rows (weekly_checkins, coach_outputs) carry LOCAL MONDAY
    // week_start stamps while blocks start on any weekday; aligning the
    // window to week starts keeps block week 1's rows in and the
    // post-block week's out (review #5).
    const checkinFrom = localWeekStartMs(blockStart);
    const checkinTo = localWeekStartMs(blockEnd);
    const [training, priorSets, planned, exercisesById, checkins, flagWeeks, weekRows, suppressed] = await Promise.all([
      getBlockTrainingData(userId, mesocycleId),
      getPriorCompletedSets(userId, blockStart, blockStart - PRIOR_WINDOW_DAYS * 24 * 60 * 60 * 1000),
      getPlannedMuscleVolumeForBlock(mesocycleId),
      getExerciseRowsById(userId),
      getCheckinsInRange(userId, checkinFrom, checkinTo),
      getDeloadSuggestedWeekStarts(userId, checkinFrom, checkinTo),
      getMesocycleWeeks(mesocycleId),
      readSuppression(userId),
    ]);

    const appliedEarlyDeloadWeekIndices = weekRows
      .filter((w) => w.is_deload === 1 && w.week_index !== deloadWeekIndex)
      .map((w) => w.week_index);

    // The previous block, for the post-deload PR rebound window.
    const previous = mesos
      .filter((m) => m.id !== mesocycleId && toMs(m.startDate) != null && toMs(m.startDate) < blockStart)
      .sort((a, b) => toMs(b.startDate) - toMs(a.startDate))[0] ?? null;
    const previousBlockEndMs = previous
      ? (toMs(previous.endDate) ?? (toMs(previous.startDate) + (previous.plannedWeeks ?? previous.durationWeeks ?? 5) * WEEK_MS))
      : null;
    const reboundWindowsMs = computeReboundWindows({
      previousBlockEndMs, blockStart, blockWeeks, deloadWeekIndex, appliedEarlyDeloadWeekIndices,
    });

    // Campaign 1 review finding 8: the SLOPE input must be on ONE scale
    // for every week. checkinReadiness renormalises to energy/soreness
    // 0.5/0.5 when sleep is unanswered (correct for absolute reads), but
    // a slope across weeks that mix answered and unanswered sleep would
    // then measure the scale change, not the user - and could lose the
    // readinessSlope <= -0.3 strain point in a genuinely deteriorating
    // block. The slope therefore uses the sleep-free score for EVERY
    // week; the advisor's absolute thresholds keep the full formula.
    const sleepFreeReadiness = (c) => {
      if (!c) return null;
      // FB-36 guard (C6 P-3, D97-20): the sleep-only row a completed
      // workout writes answers neither energy nor soreness — that is no
      // reading, not a neutral 50, and must not shape the slope.
      if (c.energyScore == null && c.sorenessScore == null) return null;
      const energy = (((c.energyScore ?? 3) - 1) / 4) * 100;
      const soreness = (1 - ((c.sorenessScore ?? 3) - 1) / 4) * 100;
      return energy * 0.5 + soreness * 0.5;
    };
    const readinessSlope = computeReadinessSlope(checkins.map((c) => sleepFreeReadiness(c)));
    const sleepFlaggedWeeks = countSleepFlaggedWeeks(checkins);
    const { deloadFlagFired, deloadFlagMidBlock } = deriveDeloadFlags({
      recoveryFlagWeekStarts: flagWeeks, appliedEarlyDeloadWeekIndices,
      blockStart, blockWeeks, deloadWeekIndex,
    });
    const systemic = { readinessSlope, sleepFlaggedWeeks, deloadFlagFired };

    const manualTable = await getManualLandmarks(userId);
    // The adapted layer stays Pro-gated: the REAL tier threads through
    // (review #6); default 'free' fails closed to no adapted layer.
    const adaptedTable = await getAdaptedLandmarks(userId, { tier }).catch(() => null);
    const effective = mergeLandmarkPrecedence({ manual: manualTable, adapted: adaptedTable }).table;

    const workoutsById = new Map(training.workouts.map((w) => [w.id, w]));

    // Muscles worth judging: anything the block planned or trained.
    const muscles = Object.keys(VOLUME_LANDMARKS).filter((muscle) => (
      sumPlannedSets(planned, muscle) > 0 || sumCompletedSets(training.sets, exercisesById, muscle) > 0
    ));

    const muscleInputs = muscles.map((muscle) => {
      const performance = computeBlockPerformance({
        muscle,
        sets: training.sets,
        exercisesById,
        priorSets,
        workoutsById,
        blockStart,
        blockWeeks,
        deloadWeekIndex,
        reboundWindowsMs,
      });
      const recoveryRows = collectMuscleSessionRows({
        sets: training.sets, workouts: training.workouts, exercisesById, muscle,
      });
      const agg = computeMuscleRecoveryAggregates({
        rows: recoveryRows, blockStart, blockWeeks, deloadWeekIndex,
      });
      const week1Planned = planned
        .filter((p) => p.muscle === muscle && p.week_index === 1)
        .reduce((s, p) => s + (p.planned_sets ?? 0), 0);
      const plannedPeak = planned
        .filter((p) => p.muscle === muscle && p.week_index !== deloadWeekIndex)
        .reduce((max, p) => Math.max(max, p.planned_sets ?? 0), 0);
      const achievedPeak = computeAchievedWeeklyPeak({
        sets: training.sets, exercisesById, muscle, blockStart, blockWeeks, deloadWeekIndex,
      });
      const history = priorLedgerEntries(mesos, blockStart, muscle);
      const learned = computeLearnedRange({
        prior: profileAdjustedPrior(muscle, userProfile),
        researchMev: VOLUME_LANDMARKS[muscle]?.mev ?? 0,
        adaptedMrv: adaptedTable?.[muscle]?.isAdapted ? adaptedTable[muscle].mrv : null,
        ledgerHistory: history,
        muscle,
      });

      return {
        muscle,
        landmarks: effective[muscle] ?? VOLUME_LANDMARKS[muscle],
        researchMev: VOLUME_LANDMARKS[muscle]?.mev ?? null,
        learnedCeiling: learned.isLearned ? learned.ceiling : null,
        // An untouched editor default is NOT an override (review
        // blocker #1): only a genuine edit defers the ledger to manual.
        manualOverride: isManualEdit(manualTable?.[muscle], VOLUME_LANDMARKS[muscle]),
        previousStart: week1Planned > 0 ? week1Planned : null,
        plannedPeak: plannedPeak > 0 ? plannedPeak : null,
        achievedPeak: achievedPeak > 0 ? achievedPeak : null,
        priorFlatBlocks: trailingStaleCount(history),
        adherence: {
          completedSets: sumCompletedSets(training.sets, exercisesById, muscle),
          plannedSets: sumPlannedSets(planned, muscle),
        },
        performance,
        recovery: {
          // Campaign 1 P0-4: honest nulls pass THROUGH (no ?? 0). The old
          // coercion turned "no soreness answers" into "soreness fine"
          // before the classifier ever saw it. classifyMuscleBlock's own
          // num(v, 0) still means no-evidence contributes zero strain
          // weight - identical numbers, honest provenance - and the
          // MIN_RECOVERY_POINTS gate keeps sparse blocks INSUFFICIENT_DATA.
          sorenessLateAvg: agg.sorenessLateAvg,
          jointDiscomfortAvg: agg.jointDiscomfortAvg,
          readinessSlope,
          sleepFlaggedWeeks,
          deloadFlagFired,
          deloadFlagMidBlock,
          dataPoints: agg.dataPoints,
        },
      };
    });

    const ledger = buildBlockLedger({
      muscles: muscleInputs,
      systemic,
      suppressed,
      weeksSinceBlockEnd: status.weeksOverdue,
    });
    // Provenance (founder Stage 6 order B): enough to answer "why did
    // back start at 14 sets in this new block" from the stored record.
    const record = {
      ...ledger,
      mesocycleId,
      mesocycleName: meso.name ?? null,
      blockStartDate: meso.startDate ?? null,
      blockEndDate: new Date(blockEnd).toISOString().slice(0, 10),
      computedAt: Date.now(),
    };
    await storeBlockLedger(mesocycleId, JSON.stringify(record));
    return record;
  } catch (e) {
    logError('blockLedgerRunner.computeAndStoreBlockLedger', e, { userId, mesocycleId });
    return null;
  }
}

/**
 * The ACTIVE block's achieved weekly peak per muscle so far — the
 * strain-aware deload apply's anchor (Stage 7, §3.4). Returns
 * { [muscle]: peakSets } or null when no live block exists.
 */
export async function getAchievedWeeklyPeaks(userId) {
  try {
    const mesos = await getAllMesocyclesForUser(userId);
    // Review #15: match the canonical active-block getter — skip
    // soft-deleted rows and, should a sync ever leave two actives,
    // take the newest rather than SQL row order.
    const active = mesos
      .filter((m) => !m.deletedAt && (m.isActive === 1 || m.isActive === true))
      .sort((a, b) => (toMs(b.createdAt) ?? 0) - (toMs(a.createdAt) ?? 0))[0] ?? null;
    const blockStart = toMs(active?.startDate);
    if (!active || blockStart == null) return null;
    const blockWeeks = active.plannedWeeks ?? active.durationWeeks ?? 5;
    const deloadWeekIndex = active.deloadWeek ?? blockWeeks;
    const [training, exercisesById] = await Promise.all([
      getBlockTrainingData(userId, active.id),
      getExerciseRowsById(userId),
    ]);
    const peaks = {};
    for (const muscle of Object.keys(VOLUME_LANDMARKS)) {
      const peak = computeAchievedWeeklyPeak({
        sets: training.sets, exercisesById, muscle, blockStart, blockWeeks, deloadWeekIndex,
      });
      if (peak > 0) peaks[muscle] = peak;
    }
    return peaks;
  } catch (e) {
    logError('blockLedgerRunner.getAchievedWeeklyPeaks', e, { userId });
    return null;
  }
}

/**
 * Resolve the next block's per-muscle seed ranges through the founder's
 * fallback chain (blockSeed.resolveSeedRange). `intent` is the advisor
 * button the user tapped ('repeat' | 'adjust'); the finished block's
 * ledger is computed (and persisted) on demand. Returns
 * { version, intent, sourceMesocycleId, ranges } or null on failure.
 */
/**
 * C6 P9-01 (D97): recover the evidence of blocks the user LEFT by
 * switching plans instead of by the decision card. A switched-away
 * block was deactivated with no ledger ever computed, and no caller
 * ever reached it again (the story path computes only for the ACTIVE
 * block; this builder selects only the newest meso) - so five weeks of
 * real per-muscle evidence went permanently unread. The training data
 * itself was never lost, only never judged; this computes the missing
 * ledgers lazily at consumption time. Every existing protection
 * composes: computeAndStoreBlockLedger's own finished-state
 * precondition (getBlockStatus is DATE-derived, so an abandoned block
 * becomes judgeable once its calendar runs out), the adherence and
 * exposure gates (a week-2 abandonment classifies INSUFFICIENT_DATA
 * honestly), and the >= 4-week stale-evidence hold (weeksOverdue is
 * real at backfill time, so old evidence cannot climb). Idempotent by
 * the stored-ledger version guard; bounded by the user's meso count.
 */
export async function backfillMissingBlockLedgers(userId, { userProfile = null, tier = 'free' } = {}) {
  try {
    const mesos = await getAllMesocyclesForUser(userId);
    for (const m of mesos) {
      if (m.blockLedger) continue;
      const start = toMs(m.startDate);
      if (start == null) continue;
      const weeks = m.plannedWeeks ?? m.durationWeeks ?? 5;
      if (!getBlockStatus(start, weeks).awaitingDecision) continue;
      // Sequential and best-effort: one bad block never blocks the rest.
      // eslint-disable-next-line no-await-in-loop
      await computeAndStoreBlockLedger(userId, m.id, { userProfile, tier }).catch(() => null);
    }
  } catch (_e) { /* best effort: consumption falls back to stored state */ }
}

export async function buildSeedRangesForNextBlock(userId, { intent = 'adjust', userProfile = null, tier = 'free' } = {}) {
  try {
    // C6 P9-01 (D97): judge any switched-away finished blocks first, so
    // the replay below reads the user's WHOLE history.
    await backfillMissingBlockLedgers(userId, { userProfile, tier });
    const mesos = await getAllMesocyclesForUser(userId);
    // The block being decided on: the most recent one with a start date,
    // and only when it is genuinely FINISHED (awaitingDecision) — a
    // mid-block restart seeds without a ledger (review #14).
    const current = mesos
      .filter((m) => toMs(m.startDate) != null)
      .sort((a, b) => toMs(b.startDate) - toMs(a.startDate))[0] ?? null;
    const currentFinished = current
      ? getBlockStatus(toMs(current.startDate), current.plannedWeeks ?? current.durationWeeks ?? 5).awaitingDecision
      : false;

    const ledger = current && currentFinished
      ? await computeAndStoreBlockLedger(userId, current.id, { userProfile, tier })
      : null;

    // The just-finished block's ledger IS history now: splice the fresh
    // record into the local view so the learned-range replay sees it
    // (review #3 — the stale read left the memory one block behind).
    const mesosForReplay = ledger
      ? mesos.map((m) => (m.id === current.id ? { ...m, blockLedger: JSON.stringify(ledger) } : m))
      : mesos;

    const manualTable = await getManualLandmarks(userId);
    const adaptedTable = await getAdaptedLandmarks(userId, { tier }).catch(() => null);
    const suppressed = await readSuppression(userId);
    const nextStart = toMs(current?.startDate) != null
      ? toMs(current.startDate) + (current.plannedWeeks ?? current.durationWeeks ?? 5) * WEEK_MS
      : null;

    const ranges = {};
    for (const muscle of Object.keys(VOLUME_LANDMARKS)) {
      const research = VOLUME_LANDMARKS[muscle];
      const history = nextStart != null
        ? priorLedgerEntries(mesosForReplay, nextStart, muscle)
        : [];
      const learned = computeLearnedRange({
        prior: profileAdjustedPrior(muscle, userProfile),
        researchMev: research?.mev ?? 0,
        adaptedMrv: adaptedTable?.[muscle]?.isAdapted ? adaptedTable[muscle].mrv : null,
        ledgerHistory: history,
        muscle,
      });
      const manualEntry = manualTable?.[muscle] ?? null;
      ranges[muscle] = resolveSeedRange({
        manual: isManualEdit(manualEntry, research) ? manualEntry : null,
        ledgerEntry: ledger?.entries?.find?.((e) => e.muscle === muscle) ?? null,
        learnedRange: learned.isLearned ? learned : null,
        profileAdjusted: profileAdjustedPrior(muscle, userProfile),
        research,
        suppressed,
        intent,
      });
    }
    return { version: 1, intent, sourceMesocycleId: ledger ? current.id : null, ranges };
  } catch (e) {
    logError('blockLedgerRunner.buildSeedRangesForNextBlock', e, { userId });
    return null;
  }
}

/**
 * Record how the finished block's recommendation was actually USED
 * (founder Stage 6 order B: used, overridden or bypassed) onto its
 * stored ledger — the provenance that answers "did the user take the
 * coach's numbers". Best-effort and last-write-wins: it records the
 * decision that actually created the next block.
 */
export async function recordSeedOutcome(userId, sourceMesocycleId, { intent = null, ranges = null } = {}) {
  try {
    if (!sourceMesocycleId) return;
    const mesos = await getAllMesocyclesForUser(userId);
    const meso = mesos.find((m) => m.id === sourceMesocycleId);
    if (!meso?.blockLedger) return;
    const record = JSON.parse(meso.blockLedger);
    const perMuscle = {};
    for (const [muscle, r] of Object.entries(ranges ?? {})) {
      perMuscle[muscle] = { source: r.source, startSets: r.startSets, peakSets: r.peakSets };
    }
    record.seedOutcome = { intent, recordedAt: Date.now(), perMuscle };
    await storeBlockLedger(sourceMesocycleId, JSON.stringify(record));
  } catch (e) {
    logError('blockLedgerRunner.recordSeedOutcome', e, { userId, sourceMesocycleId });
  }
}
