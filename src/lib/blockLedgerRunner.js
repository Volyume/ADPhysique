/**
 * blockLedgerRunner.js — the impure Block Ledger assembly (Stage 6 of
 * the adaptive mesocycle build; authority
 * docs/blueprint-adaptive-mesocycle-2026-08-09.md §3.9 items 2-3 + the
 * founder's Stage 6 order).
 *
 * This is the THIN layer: it fetches rows through database.js and hands
 * every judgement to the pure modules (blockMetrics -> performance,
 * blockLedgerGather -> recovery/systemic/windows/ramps, interBlock ->
 * classification, learnedRange -> block-grain memory, blockSeed -> the
 * seeding fallback chain). Nothing here decides anything; it only
 * plumbs.
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
} from './blockLedgerGather';
import { computeLearnedRange } from './learnedRange';
import { resolveSeedRange } from './blockSeed';
import { computeLandmarks } from './planEngine';
import { checkinReadiness } from './blockAdvisor';
import { getManualLandmarks, getAdaptedLandmarks, mergeLandmarkPrecedence } from './effectiveLandmarks';
import { getBlockStatus } from './mesocycle';
import { VOLUME_LANDMARKS } from './algorithms';
import { isCalm, WELLBEING_KEY } from './wellbeing';
import { logError } from './errorLog';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
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

/** Profile-adjusted prior for a muscle, lowercase-normalised; research on any gap. */
function profilePrior(muscle, userProfile) {
  const research = VOLUME_LANDMARKS[muscle];
  try {
    if (userProfile?.experience) {
      const adjusted = computeLandmarks(
        userProfile.experience,
        userProfile.recoveryRating ?? 'average',
        userProfile.goalPhase ?? 'maint',
        userProfile.age ?? null,
      )[muscle];
      if (adjusted) return { mev: adjusted.MEV, mav: adjusted.MAVhigh, mrv: adjusted.MRV };
    }
  } catch (_e) { /* research fallback below */ }
  return research ? { mev: research.mev, mav: research.mav, mrv: research.mrv } : null;
}

/** Prior finished blocks' ledger entries for a muscle, oldest first. */
function priorLedgerEntries(mesos, beforeStartMs, muscle) {
  const entries = [];
  const prior = mesos
    .filter((m) => {
      const start = toMs(m.startDate);
      return start != null && start < beforeStartMs && m.blockLedger;
    })
    .sort((a, b) => toMs(a.startDate) - toMs(b.startDate));
  for (const m of prior) {
    try {
      const ledger = JSON.parse(m.blockLedger);
      const entry = ledger?.entries?.find?.((e) => e.muscle === muscle);
      if (entry) entries.push(entry);
    } catch (_e) { /* unparseable prior ledger: no evidence */ }
  }
  return entries;
}

function trailingStaleCount(entries) {
  let count = 0;
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    if (entries[i]?.classification === 'STALE') count += 1;
    else break;
  }
  return count;
}

/**
 * Compute the finished block's ledger and persist it on the mesocycle
 * row. Idempotent: an already-stored ledger at the current version is
 * returned as-is (pass { force: true } to rebuild). Returns the parsed
 * ledger, or null when the block cannot be judged at all.
 */
export async function computeAndStoreBlockLedger(userId, mesocycleId, { force = false, userProfile = null } = {}) {
  try {
    const mesos = await getAllMesocyclesForUser(userId);
    const meso = mesos.find((m) => m.id === mesocycleId);
    if (!meso) return null;
    const blockStart = toMs(meso.startDate);
    const blockWeeks = meso.plannedWeeks ?? meso.durationWeeks ?? 5;
    if (blockStart == null || !(blockWeeks >= 2)) return null;
    const deloadWeekIndex = meso.deloadWeek ?? blockWeeks;

    if (!force && meso.blockLedger) {
      try {
        const stored = JSON.parse(meso.blockLedger);
        if (stored?.version === LEDGER_VERSION) return stored;
      } catch (_e) { /* recompute below */ }
    }

    const blockEnd = blockStart + blockWeeks * WEEK_MS;
    const [training, priorSets, planned, exercisesById, checkins, flagWeeks, weekRows, suppressed] = await Promise.all([
      getBlockTrainingData(userId, mesocycleId),
      getPriorCompletedSets(userId, blockStart, blockStart - PRIOR_WINDOW_DAYS * 24 * 60 * 60 * 1000),
      getPlannedMuscleVolumeForBlock(mesocycleId),
      getExerciseRowsById(userId),
      getCheckinsInRange(userId, blockStart, blockEnd),
      getDeloadSuggestedWeekStarts(userId, blockStart, blockEnd),
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

    const readinessSlope = computeReadinessSlope(checkins.map((c) => checkinReadiness(c)));
    const sleepFlaggedWeeks = countSleepFlaggedWeeks(checkins);
    const { deloadFlagFired, deloadFlagMidBlock } = deriveDeloadFlags({
      recoveryFlagWeekStarts: flagWeeks, appliedEarlyDeloadWeekIndices,
      blockStart, blockWeeks, deloadWeekIndex,
    });
    const systemic = { readinessSlope, sleepFlaggedWeeks, deloadFlagFired };

    const manualTable = await getManualLandmarks(userId);
    const adaptedTable = await getAdaptedLandmarks(userId, { tier: 'pro' }).catch(() => null);
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
        prior: profilePrior(muscle, userProfile),
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
        manualOverride: !!manualTable?.[muscle],
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
          sorenessLateAvg: agg.sorenessLateAvg ?? 0,
          jointDiscomfortAvg: agg.jointDiscomfortAvg,
          readinessSlope,
          sleepFlaggedWeeks,
          deloadFlagFired,
          deloadFlagMidBlock,
          dataPoints: agg.dataPoints,
        },
      };
    });

    const { weeksOverdue } = getBlockStatus(blockStart, blockWeeks);
    const ledger = buildBlockLedger({
      muscles: muscleInputs,
      systemic,
      suppressed,
      weeksSinceBlockEnd: weeksOverdue,
    });
    const record = { ...ledger, mesocycleId, computedAt: Date.now() };
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
    const active = mesos.find((m) => m.isActive === 1 || m.isActive === true) ?? null;
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
 * { version, intent, ranges: { [muscle]: { startSets, peakSets, source } } }
 * or null when nothing beyond the template ramp is known.
 */
export async function buildSeedRangesForNextBlock(userId, { intent = 'adjust', userProfile = null } = {}) {
  try {
    const mesos = await getAllMesocyclesForUser(userId);
    // The block being decided on: the most recent one with a start date.
    const current = mesos
      .filter((m) => toMs(m.startDate) != null)
      .sort((a, b) => toMs(b.startDate) - toMs(a.startDate))[0] ?? null;

    const ledger = current
      ? await computeAndStoreBlockLedger(userId, current.id, { userProfile })
      : null;

    const manualTable = await getManualLandmarks(userId);
    const adaptedTable = await getAdaptedLandmarks(userId, { tier: 'pro' }).catch(() => null);
    const suppressed = await readSuppression(userId);
    const nextStart = toMs(current?.startDate) != null
      ? toMs(current.startDate) + (current.plannedWeeks ?? current.durationWeeks ?? 5) * WEEK_MS
      : null;

    const ranges = {};
    for (const muscle of Object.keys(VOLUME_LANDMARKS)) {
      const research = VOLUME_LANDMARKS[muscle];
      const history = nextStart != null ? priorLedgerEntries(
        // Include the just-finished block: its stored ledger is history now.
        mesos, nextStart, muscle,
      ) : [];
      const learned = computeLearnedRange({
        prior: profilePrior(muscle, userProfile),
        researchMev: research?.mev ?? 0,
        adaptedMrv: adaptedTable?.[muscle]?.isAdapted ? adaptedTable[muscle].mrv : null,
        ledgerHistory: history,
        muscle,
      });
      ranges[muscle] = resolveSeedRange({
        manual: manualTable?.[muscle] ?? null,
        ledgerEntry: ledger?.entries?.find?.((e) => e.muscle === muscle) ?? null,
        learnedRange: learned.isLearned ? learned : null,
        profileAdjusted: profilePrior(muscle, userProfile),
        research,
        suppressed,
        intent,
      });
    }
    return { version: 1, intent, ranges };
  } catch (e) {
    logError('blockLedgerRunner.buildSeedRangesForNextBlock', e, { userId });
    return null;
  }
}
