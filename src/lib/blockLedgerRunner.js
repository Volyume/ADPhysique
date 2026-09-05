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
  getBlocksWithTrainingEvidence,
  getBlockTrainingData,
  getPriorCompletedSets,
  getPlannedMuscleVolumeForBlock,
  getDeloadSuggestedWeekStarts,
  getExerciseRowsById,
  getCheckinsInRange,
  getMesocycleWeeks,
  getOpenEdPatternFlag,
  getActivePlan,
  getRoutinesForPlan,
  getRoutineExercisesWithDetails,
  storeBlockLedger,
  getAllExercises,
  getCapabilityConstraints,
  getSessionConstraintEffectsForWorkouts,
  getRoutineExerciseSetsMap,
  filterCapabilityEligibleSetRows,
} from './database';
// CC30 (sections 7, 33.4): learning eligibility is decided at GATHER
// time from the capability state effective when the evidence occurred,
// stamped per entry, and every downstream consumer reads the stamp -
// the frozen judgement itself is never recomputed (CC-D17).
import { capabilityWatermark, constrainedMusclesInWindow } from './capability/eligibility';
import { buildBlockLedger, BLOCK_CLASS, LEDGER_VERSION, STALE_EVIDENCE_WEEKS } from './interBlock';
import { computeBlockPerformance, effectiveBlockSlopePct } from './blockMetrics';
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
  isNonLearningEligibility,
  blockHasCircuitSetForMuscle,
} from './blockLedgerGather';
import { computeLearnedRange } from './learnedRange';
import { resolveSeedRange } from './blockSeed';
import { getManualLandmarks, getAdaptedLandmarks, mergeLandmarkPrecedence, isManualEdit } from './effectiveLandmarks';
import { getBlockStatus } from './mesocycle';
import { VOLUME_LANDMARKS } from './algorithms';
import { localWeekStartMs } from './dayKey';
import { isCalm, WELLBEING_KEY } from './wellbeing';
import { logError } from './errorLog';
import { structureSignature } from './programmeEpoch';

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

/**
 * C10N: how long ago the most recent LEGITIMATE per-muscle block evidence
 * finished, keyed by muscle. One clock for one product concept — the
 * activation carry (D10, Campaign 8) and the Adjust decision both read this,
 * so they can never disagree about when memory stops being actionable.
 *
 * "Legitimate" is the load-bearing word. An INSUFFICIENT_DATA entry is a
 * block we could not judge, so it contributes nothing and must NOT restart
 * the clock; neither may reading a stored ledger, syncing, restarting the
 * app, opening a screen or choosing Repeat, none of which produce evidence.
 * Only a newly judged compatible block can make memory fresh again.
 *
 * Blocks are walked oldest-first so the newest judged entry per muscle wins.
 * Fails toward STALE: an unreadable date or an unparseable ledger records
 * nothing, so the muscle reads as having no recent evidence.
 */
function judgedEvidenceAgeByMuscle(mesos, nowMs) {
  const byMuscle = new Map();
  const dated = (Array.isArray(mesos) ? mesos : [])
    .filter((m) => m?.blockLedger && toMs(m.startDate) != null)
    .sort((a, b) => toMs(a.startDate) - toMs(b.startDate));
  for (const m of dated) {
    const overdue = getBlockStatus(
      toMs(m.startDate), m.plannedWeeks ?? m.durationWeeks ?? 5, nowMs,
    ).weeksOverdue;
    if (!Number.isFinite(overdue)) continue;
    try {
      for (const e of JSON.parse(m.blockLedger)?.entries ?? []) {
        if (!e?.muscle) continue;
        if (e.classification === BLOCK_CLASS.INSUFFICIENT_DATA) continue;
        // Skip constrained/circuit entries — they are never recent judged
        // evidence (CC30; EL-7 extends the same skip set to 'circuit').
        if (isNonLearningEligibility(e.eligibility)) continue;
        byMuscle.set(e.muscle, { entry: e, weeksOverdue: overdue });
      }
    } catch (_e) { /* unparseable prior ledger: no evidence */ }
  }
  return byMuscle;
}

/**
 * C11 job 2: THE canonical learned-memory actionability decision. Both entry
 * points — the Adjust/next-block seeding and the plan-activation carry — call
 * this, so the same athlete, muscle, history and moment can never get two
 * different answers depending on which screen they reached. Campaign 10N
 * closed the missing gate on Adjust but left activation with its own inline
 * age read that counted an INSUFFICIENT_DATA entry as recent; that divergence
 * is what this replaces.
 *
 * Returns { recent, fresh } where `recent` is the newest JUDGED entry for the
 * muscle (or null) and `fresh` is whether it sits inside the one existing
 * STALE_EVIDENCE_WEEKS boundary. No new constant, no decay.
 */
function learnedActionability(freshnessByMuscle, muscle) {
  const recent = freshnessByMuscle.get(muscle) ?? null;
  return { recent, fresh: recent != null && recent.weeksOverdue < STALE_EVIDENCE_WEEKS };
}

/**
 * C11 job 3 (RA6-4): may this muscle be offered a bounded capacity probe?
 *
 * EVIDENCE SHAPE, stated because it constrains the answer. A stored ledger
 * entry does NOT retain doseResponse — `finish()` records muscle,
 * classification, confidence, evidence, observed, upwardCarryPrevented,
 * proposal and rationale, and the evidence array carries slope, PR density,
 * PR count, recovery cost and adherence. lateProgression / lateRecoveryOk are
 * not among them, so they cannot be read back.
 *
 * They can, however, be PROVEN rather than reconstructed. In interBlock's
 * RESPONSIVE branch the +1 is applied only when
 *   earned = lateProgression && lateRecoveryOk && confidence >= CONFIDENCE_FLOOR
 *            && !suppressed && weeksSinceBlockEnd < STALE_EVIDENCE_WEEKS
 * so a proposal that starts ABOVE the block's own observed start is a
 * recorded conclusion that every one of those held. The deduction runs one
 * way only — an equal start proves nothing, because the clamps can absorb an
 * earned +1 — which is exactly the conservative direction for granting a
 * probe. Nothing is guessed and no threshold is lowered.
 */
function probeEligible({ recent, fresh, suppressed, manualControls }) {
  if (!fresh || suppressed || manualControls) return false;
  const entry = recent?.entry;
  if (!entry || entry.classification !== BLOCK_CLASS.RESPONSIVE) return false;
  const proposed = Number(entry.proposal?.startSets);
  const observed = Number(entry.observed?.startSets);
  if (!Number.isFinite(proposed) || !Number.isFinite(observed)) return false;
  return proposed > observed;
}

/**
 * C13 job 4: drop ledgers whose RAW EVIDENCE the user has deleted.
 *
 * A stored Block Ledger stays exactly as written - it is the historical
 * record of what Volyume concluded when that block finished, and nothing
 * here rebuilds, rewrites or removes it. What it stops doing is TEACHING:
 * deliberately deleted training history must not keep compounding into new
 * personalisation (establishedStart, the learned ceiling, probe eligibility,
 * future Adjust seeding) for ever merely because a derived record survives.
 *
 * Only the provable distinction is applied - the block retains completed
 * training rows, or it does not. No material-edit threshold is invented, so
 * correcting a typo changes nothing. Fails OPEN on a read error.
 */
async function replayableMesos(userId, mesos) {
  try {
    const withLedger = (Array.isArray(mesos) ? mesos : []).filter((m) => m?.blockLedger && m?.id);
    if (withLedger.length === 0) return mesos;
    if (typeof getBlocksWithTrainingEvidence !== 'function') return mesos;
    const alive = await getBlocksWithTrainingEvidence(userId, withLedger.map((m) => m.id));
    // Fail OPEN on anything unexpected: a transient read failure, or a build
    // where the helper is absent, must never silently strip a user's learned
    // history. Only a definite "this block has no training rows" removes one.
    if (!(alive instanceof Set)) return mesos;
    return mesos.filter((m) => !m?.blockLedger || !m?.id || alive.has(m.id));
  } catch (_e) {
    return mesos;
  }
}

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
        // Campaign 16 adversarial close: a same-version ledger created by
        // the earlier build has no programme signature, so returning it
        // would preserve the very epoch ambiguity this snapshot closes.
        // Recompute the active finished block once to backfill the snapshot;
        // future reads remain idempotent.
        const isCurrent = meso.isActive === 1 || meso.isActive === true;
        if (stored?.version === LEDGER_VERSION
          && (stored?.programmeSignature || !isCurrent)) return stored;
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

    // CC30 (section 7 matrix): the gather-time eligibility stamp. A read
    // failure records watermark null so the dedicated restamp pass
    // (section 33.4) corrects the stamps once rows are readable again;
    // eligibility itself defaults to 'normal' (the ledger is frozen at
    // block end - the restamp, not a guess, is the correction path).
    let constrainedMuscles = new Set();
    let capWatermark = null;
    try {
      const capRows = await getCapabilityConstraints(userId);
      capWatermark = capabilityWatermark(capRows);
      if (capRows.some((r) => r.role === 'episode')) {
        const library = await getAllExercises();
        constrainedMuscles = constrainedMusclesInWindow(capRows, library, blockStart, blockEnd);
      }
    } catch (_e) { capWatermark = null; }

    // CC30 (BD-D7): the per-muscle EFFECTIVE planned dose. A slot omitted
    // under an APPLIED episode rule (session_constraint_effects) was never
    // owed, so its planned sets leave the muscle's denominator - the
    // ledger's adherence question becomes "of what was effectively
    // planned, what was delivered", per muscle, matching section 18's
    // session-level law.
    const omittedPlannedByMuscle = {};
    try {
      const effectRecords = await getSessionConstraintEffectsForWorkouts(
        userId, training.workouts.map((w) => w.id),
      );
      if (effectRecords.length) {
        const routineIds = [...new Set(training.workouts.map((w) => w.routine_id).filter(Boolean))];
        const setsMap = await getRoutineExerciseSetsMap(routineIds);
        for (const rec of effectRecords) {
          const w = workoutsById.get(rec.workoutId);
          if (!w?.routine_id) continue;
          for (const eff of rec.effects ?? []) {
            if (eff?.effect !== 'omitted' || !eff.exerciseFrom) continue;
            const ex = exercisesById.get(eff.exerciseFrom);
            const muscle = ex?.primary_muscle ?? null;
            if (!muscle) continue;
            const planned = setsMap.get(`${w.routine_id}|${eff.exerciseFrom}`) ?? 0;
            omittedPlannedByMuscle[muscle] = (omittedPlannedByMuscle[muscle] || 0) + planned;
          }
        }
      }
    } catch (_e) { /* best effort: the plan-wide denominator stands */ }

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
        // C10K: same list as the deload flags, the rebound windows and the
        // C10J recovery gather. Scopes ONLY lateRecoveryOk's evidence
        // population; performance terms are unaffected.
        appliedEarlyDeloadWeekIndices,
      });
      const recoveryRows = collectMuscleSessionRows({
        sets: training.sets, workouts: training.workouts, exercisesById, muscle,
      });
      const agg = computeMuscleRecoveryAggregates({
        rows: recoveryRows, blockStart, blockWeeks, deloadWeekIndex,
        // C10J (D91-24): the SAME list already derived above for the deload
        // flags and the rebound windows, threaded through rather than
        // re-derived. An applied early-deload week's deliberately light
        // sessions must not dilute the muscle's response to the normal
        // accumulation dose.
        appliedEarlyDeloadWeekIndices,
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
        // CC30: the gather-time stamp (section 7 matrix, EA column). EL-7
        // extends it: a muscle not capability-constrained but trained
        // through a circuit this block is stamped 'circuit' - same skip
        // treatment (learns nothing), different provenance.
        eligibility: constrainedMuscles.has(muscle)
          ? 'constrained'
          : (blockHasCircuitSetForMuscle(training.sets, exercisesById, muscle) ? 'circuit' : 'normal'),
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
          // BD-D7: effective planned, never below zero.
          plannedSets: Math.max(0,
            sumPlannedSets(planned, muscle) - (omittedPlannedByMuscle[muscle] || 0)),
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
    // Snapshot the programme structure while this finished block still
    // points at the active plan. Mesocycles have no programme foreign key;
    // without this immutable signature a later rebuild leaves the epoch
    // reader guessing from names, and unrelated programmes can be counted
    // together. The snapshot lives inside the already-synced ledger JSON,
    // so it needs no schema or cloud migration.
    let programmeSignature = null;
    if (meso.isActive === 1 || meso.isActive === true) {
      try {
        const activePlan = await getActivePlan(userId);
        const routines = activePlan?.id ? await getRoutinesForPlan(activePlan.id) : [];
        const workouts = [];
        for (const routine of routines ?? []) {
          // eslint-disable-next-line no-await-in-loop
          const rows = await getRoutineExercisesWithDetails(routine.id);
          workouts.push({
            name: routine.name,
            exercises: (rows ?? []).map(row => ({ exerciseId: row?.exercise?.id ?? null })),
          });
        }
        if (workouts.length) {
          programmeSignature = structureSignature({
            splitType: routines.find(r => r?.splitType)?.splitType ?? null,
            workouts,
          });
        }
      } catch (_) { programmeSignature = null; }
    }
    const record = {
      ...ledger,
      mesocycleId,
      mesocycleName: meso.name ?? null,
      programmeSignature,
      blockStartDate: meso.startDate ?? null,
      blockEndDate: new Date(blockEnd).toISOString().slice(0, 10),
      computedAt: Date.now(),
      // CC30 (section 33.4): the capability state this computation saw.
      // null = the rows were unreadable; the restamp pass treats that as
      // "needs restamping" the moment rows become readable.
      capabilityWatermark: capWatermark,
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
 * C10G F-6: the LIVE block's effective e1RM slope so far — weeklyCoach's
 * `blockE1rmSlopePct` seam (D91-9), which until now had no caller and so
 * never once fired. Returns a percentage, or null when there is no live
 * block or the block has not yet produced a usable strength series.
 *
 * No new metric: this reads `blockMetrics.computeBlockPerformance` — the
 * app's ONE strength-slope law — per trained muscle and combines the
 * usable readings through `effectiveBlockSlopePct`. See the MID-BLOCK USE
 * note in blockMetrics.js for why a part-elapsed block is honest here.
 *
 * Deliberately NOT read: `doseResponse` and `prDensity`, which are
 * block-END evidence. Nothing is written — a live block never freezes a
 * premature ledger (the Stage 6 review #14 precondition is untouched).
 */
export async function computeLiveBlockSlopePct(userId) {
  try {
    const mesos = await getAllMesocyclesForUser(userId);
    // Same canonical active-block resolution as getAchievedWeeklyPeaks
    // above (review #15): soft-deleted rows out, newest wins.
    const active = mesos
      .filter((m) => !m.deletedAt && (m.isActive === 1 || m.isActive === true))
      .sort((a, b) => (toMs(b.createdAt) ?? 0) - (toMs(a.createdAt) ?? 0))[0] ?? null;
    const blockStart = toMs(active?.startDate);
    if (!active || blockStart == null) return null;
    const blockWeeks = active.plannedWeeks ?? active.durationWeeks ?? 5;
    if (!(blockWeeks >= 2)) return null;
    // A finished block's strength evidence belongs to the ledger, which
    // judges it once and freezes it; the weekly run must not re-narrate it.
    if (getBlockStatus(blockStart, blockWeeks).awaitingDecision) return null;
    const deloadWeekIndex = active.deloadWeek ?? blockWeeks;

    const [training, priorSets, exercisesById] = await Promise.all([
      getBlockTrainingData(userId, active.id),
      getPriorCompletedSets(userId, blockStart, blockStart - PRIOR_WINDOW_DAYS * 24 * 60 * 60 * 1000),
      getExerciseRowsById(userId),
    ]);

    // D112 R7 (section 20; closes audit T2-12): the live slope is judged
    // over capability-ELIGIBLE sets, the same filter the plateau and
    // progression paths already use. Sets logged on a movement while a
    // definite episode conflict held it are display truth, not
    // programme evidence - without this, the restriction manufactured a
    // regression and the coach blamed the programme for it. No-episode
    // users pass through untouched, and a read failure keeps every set
    // (the pre-filter behaviour).
    const slopeSets = await filterCapabilityEligibleSetRows(
      userId, training.sets, { atField: 'created_at' },
    ).catch(() => training.sets);

    // Only muscles actually trained in the block so far can carry strength
    // evidence; a planned-but-untrained muscle would return confidence 0
    // and be dropped anyway, so it costs a read for nothing.
    const perMuscle = Object.keys(VOLUME_LANDMARKS)
      .filter((muscle) => sumCompletedSets(slopeSets, exercisesById, muscle) > 0)
      .map((muscle) => computeBlockPerformance({
        muscle,
        sets: slopeSets,
        exercisesById,
        priorSets,
        blockStart,
        blockWeeks,
        deloadWeekIndex,
        // PR density is not read here, so the rebound windows it alone
        // discounts are not gathered.
        reboundWindowsMs: [],
      }));
    return effectiveBlockSlopePct(perMuscle);
  } catch (e) {
    logError('blockLedgerRunner.computeLiveBlockSlopePct', e, { userId });
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

/**
 * CC30 (section 33.4 / CC-D17): the DEDICATED eligibility-restamp pass.
 *
 * backfillMissingBlockLedgers skips ledgered blocks by design, so a
 * backdated or late-synced capability row could leave an old frozen
 * ledger carrying stale eligibility. This pass re-derives ONLY the
 * per-entry `eligibility` field for every stored ledger whose recorded
 * capabilityWatermark predates the newest capability row (or recorded
 * null - the rows were unreadable at computation). Eligibility is
 * PROVENANCE, not judgement: classification, proposal, observed numbers
 * and rationale are never touched (the one exemption from the
 * never-recompute law, register CC-D17). Restamping is idempotent and
 * best-effort; consumers gate on the stamp at their next read.
 */
export async function restampLedgerEligibility(userId) {
  try {
    const capRows = await getCapabilityConstraints(userId);
    const wm = capabilityWatermark(capRows);
    const mesos = await getAllMesocyclesForUser(userId);
    const anyEpisode = capRows.some((r) => r.role === 'episode');
    const library = anyEpisode ? await getAllExercises() : [];
    let restamped = 0;
    for (const m of mesos ?? []) {
      if (!m?.blockLedger) continue;
      let ledger;
      try { ledger = JSON.parse(m.blockLedger); } catch (_e) { continue; }
      if (!Array.isArray(ledger?.entries)) continue;
      const seen = ledger.capabilityWatermark;
      if (seen != null && seen >= wm) continue; // already stamped against these rows
      const start = toMs(m.startDate);
      const weeks = m.plannedWeeks ?? m.durationWeeks ?? 5;
      if (start == null) continue;
      const constrained = anyEpisode
        ? constrainedMusclesInWindow(capRows, library, start, start + weeks * WEEK_MS)
        : new Set();
      let changed = false;
      for (const e of ledger.entries) {
        // This pass restamps ONLY the capability-derived half of the
        // eligibility stamp (CC-D17): a frozen 'circuit' stamp (EL-7,
        // decided once from the block's own training rows at finish time)
        // is never recomputed here and is preserved unless capability now
        // takes precedence.
        const next = constrained.has(e.muscle)
          ? 'constrained'
          : (e.eligibility === 'circuit' ? 'circuit' : 'normal');
        if ((e.eligibility ?? 'normal') !== next) { e.eligibility = next; changed = true; }
      }
      ledger.capabilityWatermark = wm;
      if (changed || seen == null || seen < wm) {
        // eslint-disable-next-line no-await-in-loop
        await storeBlockLedger(m.id, JSON.stringify(ledger)).catch(() => {});
        restamped += changed ? 1 : 0;
      }
    }
    return { restamped };
  } catch (_e) {
    return { restamped: 0 };
  }
}

/**
 * C8 Work 2 (D97-9): muscle-level learned evidence for an activation
 * that is NOT "Continue with adjustments".
 *
 * Only the adjust path ever passed seed ranges to activatePlanWithBlock,
 * so a plan switch, a copied routine, a phase rebuild or a post-upgrade
 * wizard build handed the writer NOTHING and every muscle got the
 * static research template ramp - a block-eight user re-ramping from
 * Day-1-like values. The founder's ruling: muscle-level learning does
 * not belong to one plan ID.
 *
 * This is deliberately WEAKER than the adjust path. There is no current
 * block proposal here (no `ledgerEntry`), so resolveSeedRange can only
 * fall through its existing chain:
 *   manual override -> learned band -> profile-adjusted -> research.
 * Every existing constraint therefore still wins: a manual override
 * outranks it, suppression skips the learned band entirely, research
 * MEV stays the floor anchor, and a band with no qualifying evidence
 * (isLearned false) simply is not used.
 *
 * Review D1/D8: the map returned here contains ONLY the muscles that
 * genuinely carried something (a learned band or the user's own manual
 * setting). A muscle whose chain fell through to the profile prior or
 * to research is omitted, and generateInitialPlannedVolume leaves any
 * omitted muscle on the static template ramp. This matters most under
 * suppression, where the learned band is skipped for every muscle: a
 * single unrelated manual override must not hand the whole body a
 * profile-prior ramp (measured at 6->21 sets against a 6->14 template)
 * during calm mode or an open ED flag. Carrying only what was actually
 * learned also means an incompatible new plan costs nothing.
 *
 * Pro only: FREE HAS NO COACHING, so a free activation keeps the
 * template ramp exactly as before. Using the user's own past blocks as
 * prior evidence claims only that those blocks happened - never that
 * Volyume coached them.
 *
 * No backfill here (unlike the next-block builder): activation must
 * stay fast, and only ALREADY-JUDGED blocks count as evidence.
 *
 * D10 (C8 closeout): the learned band is memory and has no clock, so
 * before this an eight-month-lapsed user activating a plan was ramped
 * straight back to the ceiling they last held. The engine already
 * answers this: classifyMuscleBlock refuses an increase once a block
 * ended STALE_EVIDENCE_WEEKS ago, "once the gap could have
 * deconditioned the muscle" (interBlock.js). The activation carry now
 * applies that same law, measured with the same getBlockStatus
 * weeksOverdue the classifier is fed. Nothing new is invented: no
 * decay curve, no percentage, no second duration. Memory persists
 * untouched - the ledgers and the band are not modified, and the
 * moment the user finishes a fresh block the carry is live again -
 * it simply cannot authorise a fresh upward prescription on its own.
 *
 * A manual override is NOT evidence and is not gated by this: it is
 * the user's own setting, and manual intent outranks inferred intent.
 *
 * FOUNDER RULING (C8 final closeout, option (b)): the learned band can
 * never raise a STARTING prescription - its floor is monotone downward
 * by construction, and that law is deliberate and unchanged. So a
 * mature user switching plan or phase used to reset to the Day-1
 * research start (measured: chest week 1 of 6, exactly what a brand-new
 * user gets) even though nothing about their training had changed. The
 * ruling separates the two things the band was being asked to be:
 *
 *   DURABLE LEARNED RANGE  - all judged history, no clock, used for the
 *     ceiling. Untouched: computeLearnedRange still sees everything.
 *   RECENT ACTIVATION SEED - the most recent judged block's PROPOSAL,
 *     supplied as activation evidence so the mature start survives a
 *     change of plan identity.
 *
 * This is not a blind copy of a previous programme. The proposal goes
 * through resolveSeedRange like any other, so every existing mechanism
 * still applies with no new algorithm added:
 *   - manual precedence     - step 1 returns before the entry is read
 *   - safety suppression    - no entry is supplied at all under it
 *   - evidence sufficiency  - the resolver rejects INSUFFICIENT_DATA,
 *                             deferredToManual and non-numeric proposals
 *   - research/hard bounds  - the resolver's clamp keeps research MEV as
 *                             the floor and the absolute weekly ceiling
 *   - compatibility         - per MUSCLE: a muscle the previous plan
 *                             never trained has no entry, so nothing is
 *                             transplanted into it
 *   - recency               - the SAME STALE_EVIDENCE_WEEKS boundary
 *
 * Memory persists; actionability expires.
 */
export async function buildLearnedSeedRangesForActivation(userId, { userProfile = null, tier = 'free' } = {}) {
  // Volyume is fully free (founder decision 2026-09-03): the old Pro gate
  // is gone, so this now runs for every user with eligible history. `tier`
  // stays an accepted (unused-here) option only for the pass-through call
  // to getAdaptedLandmarks below.
  if (!userId) return null;
  try {
    // CC30 (section 33.4): stale eligibility self-corrects at the durable
    // decision doors, before any ledger entry is consulted.
    await restampLedgerEligibility(userId).catch(() => {});
    const allMesos = await getAllMesocyclesForUser(userId);
    if (!Array.isArray(allMesos) || allMesos.length === 0) return null;
    // C13 job 4: ledgers whose raw evidence the user deleted stay stored and
    // renderable, but stop teaching future prescriptions.
    const mesos = await replayableMesos(userId, allMesos);
    const manualTable = await getManualLandmarks(userId);
    const adaptedTable = await getAdaptedLandmarks(userId, { tier }).catch(() => null);
    const suppressed = await readSuppression(userId);
    const nowMs = Date.now();

    // D10 + the option (b) ruling: per MUSCLE, what is the most recent
    // JUDGED entry, and how long ago did the block carrying it finish?
    //
    // C11 job 2: this used to be an inline copy that accepted ANY entry,
    // including an INSUFFICIENT_DATA one — so a block we could not judge
    // restarted the clock here while Campaign 10N's Adjust gate correctly
    // ignored it, and the same memory read as fresh on one path and stale on
    // the other. Both now consume judgedEvidenceAgeByMuscle +
    // learnedActionability, one law with one boundary.
    const recentByMuscle = judgedEvidenceAgeByMuscle(mesos, nowMs);

    const ranges = {};
    for (const muscle of Object.keys(VOLUME_LANDMARKS)) {
      const research = VOLUME_LANDMARKS[muscle];
      const history = priorLedgerEntries(mesos, nowMs, muscle);
      const learned = computeLearnedRange({
        prior: profileAdjustedPrior(muscle, userProfile),
        researchMev: research?.mev ?? 0,
        adaptedMrv: adaptedTable?.[muscle]?.isAdapted ? adaptedTable[muscle].mrv : null,
        ledgerHistory: history,
        muscle,
      });
      const manualEntry = manualTable?.[muscle] ?? null;
      // Stale evidence cannot authorise a fresh upward prescription. The
      // band and the entries are untouched memory; they are simply not
      // consulted here until a fresh block is finished.
      const { recent, fresh } = learnedActionability(recentByMuscle, muscle);
      const resolved = resolveSeedRange({
        manual: isManualEdit(manualEntry, research) ? manualEntry : null,
        // The RECENT ACTIVATION SEED. Withheld entirely under
        // suppression: a flagged or calm user's activation must never
        // start above the ramp they would otherwise have been given.
        // Constrained/circuit entries are also excluded — a block trained
        // under a capability episode, or as a circuit, does not seed the
        // next block (CC30; EL-7).
        ledgerEntry: (fresh && !suppressed && !isNonLearningEligibility(recent.entry?.eligibility)) ? recent.entry : null,
        learnedRange: (learned.isLearned && fresh) ? learned : null,
        profileAdjusted: profileAdjustedPrior(muscle, userProfile),
        research,
        suppressed,
        intent: 'adjust',
      });
      // Per-muscle, never body-wide: only a genuinely carried muscle is
      // written. Everything else stays on the template ramp.
      if (resolved?.source === 'ledger' || resolved?.source === 'learned' || resolved?.source === 'manual') {
        ranges[muscle] = resolved;
      }
    }
    // Nothing was actually carried forward: let the caller keep the
    // honest template ramp rather than relabel research as learned.
    if (Object.keys(ranges).length === 0) return null;
    return { version: 1, intent: 'activation', sourceMesocycleId: null, ranges };
  } catch (e) {
    logError('blockLedgerRunner.buildLearnedSeedRangesForActivation', e, { userId });
    return null;
  }
}

export async function buildSeedRangesForNextBlock(userId, { intent = 'adjust', userProfile = null, tier = 'free' } = {}) {
  try {
    // C6 P9-01 (D97): judge any switched-away finished blocks first, so
    // the replay below reads the user's WHOLE history.
    await backfillMissingBlockLedgers(userId, { userProfile, tier });
    // CC30 (section 33.4): then restamp eligibility on the whole stored
    // history against the newest capability rows.
    await restampLedgerEligibility(userId).catch(() => {});
    const allMesos = await getAllMesocyclesForUser(userId);
    // C13 job 4: same law on the Adjust path. The just-finished block is
    // re-spliced below with its fresh ledger, and it necessarily still has
    // its training rows, so a live decision is never affected.
    const mesos = await replayableMesos(userId, allMesos);
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

    // C10N: the Adjust decision had NO freshness gate. Campaign 8 (D10) gave
    // one to the activation carry, so a returning user's memory expired
    // there — but the very same user pressing Adjust on the decision card
    // still received the full learned band, however old the evidence behind
    // it was. That is the stored-ledger asymmetry D97-3 named, surviving on
    // the other path: whether stale memory prescribed depended on WHICH
    // screen the user reached. The same STALE_EVIDENCE_WEEKS boundary now
    // governs both. Memory persists; actionability expires.
    const freshnessByMuscle = judgedEvidenceAgeByMuscle(mesosForReplay, Date.now());

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
      // The band and every entry behind it stay untouched in storage; they
      // are simply not consulted to prescribe until a fresh judged block
      // exists. An INSUFFICIENT_DATA block cannot supply that freshness, so
      // it neither refreshes nor erases what earlier blocks established.
      const { recent, fresh: learnedFresh } = learnedActionability(freshnessByMuscle, muscle);
      const manualControls = isManualEdit(manualEntry, research);
      const ledgerEntry = ledger?.entries?.find?.((e) => e.muscle === muscle) ?? null;
      // Constrained/circuit entries do not seed the next block (CC30; EL-7).
      ranges[muscle] = resolveSeedRange({
        manual: manualControls ? manualEntry : null,
        ledgerEntry: isNonLearningEligibility(ledgerEntry?.eligibility) ? null : ledgerEntry,
        learnedRange: (learned.isLearned && learnedFresh) ? learned : null,
        profileAdjusted: profileAdjustedPrior(muscle, userProfile),
        research,
        suppressed,
        intent,
        // A probe belongs to the evidence-based Adjust path only; Repeat
        // stays exactly the block the user ran.
        capacityProbe: intent !== 'repeat'
          && probeEligible({ recent, fresh: learnedFresh, suppressed, manualControls }),
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
