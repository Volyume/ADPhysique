/**
 * ReadinessCards
 *
 * The readiness half of the old Athlete Hub dashboard, now shown inline
 * on the Progress tab: training milestones, recovery signals, muscle
 * readiness and the recovery-capacity trend. Self-loading from local
 * SQLite given the signed-in user and tier. Coaching management (check-in,
 * nutrition, body metrics) lives in Coach and the Athlete Profile and is not duplicated here.
 *
 * Voice rules: CLAUDE.md. No em dashes.
 */
import { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';

import { colors, fontSize, fontWeight, spacing, radius, withAlpha, circle, type, alpha, fontFamily } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import AnimatedEntrance from './AnimatedEntrance';
import InfoTooltip from './InfoTooltip';
import SectionLabel from './SectionLabel';
import Button from './Button';
import BodyDiagramHeatmap from './BodyDiagramHeatmap';
import MuscleRecoveryList from './MuscleRecoveryList';
import RecoveryLearningCard from './RecoveryLearningCard';
import { computeRecoveryEMAs } from '../lib/recoveryEMA';
import { MUSCLE_DISPLAY_NAMES, calculateTonnage, buildLoadSemanticsById } from '../lib/algorithms';
import { trainingRecency } from '../lib/trainingRecency';
import {
  getAllWorkouts, getCompletedWorkoutSets,
  getLastTrainedPerMuscle, getRecentCheckins,
  getRecentCompletedWorkouts,
  getWorkoutSetsForWorkout, getAllExercises,
} from '../lib/database';
import { parseDecimalInput } from '../lib/parseDecimalInput';
import { safeFormatDate } from '../lib/safeFormat';
import { logError } from '../lib/errorLog';
// D201 (per-muscle recovery, spec docs/recovery-programme-2026-09-25/
// 00-SPEC.md section 6): the "Recovery by muscle" section below. load.js is
// the domain's ONLY I/O (mirrors HomeScreen.loadRecoveryRecommendation's
// exact call chain: loadMuscleRecovery -> resolveProgrammePosition ->
// loadPlannedSetsByRoutine -> nextLikelyTrainingTime -> recommendNextWorkout);
// everything else here is pure derivation over their results.
import { resolveProgrammePosition } from '../lib/programmePosition';
import { SESSION_STATE } from '../lib/blockProgression';
import { loadMuscleRecovery, loadPlannedSetsByRoutine } from '../lib/recovery/load';
import { nextLikelyTrainingTime } from '../lib/recovery/nextLikelyTrainingTime';
// The "ready now / later today / by Thursday / in N days" wording is
// nextWorkoutRecommendation.js's readyClause, read by MuscleRecoveryList.js
// for the rows; this file only needs the recommendation itself.
import { recommendNextWorkout } from '../lib/recovery/nextWorkoutRecommendation';

const MILESTONES = [
  { sessions: 1,    label: 'First session',  icon: 'star-outline' },
  { sessions: 10,   label: '10 sessions',    icon: 'fitness-outline' },
  { sessions: 25,   label: '25 sessions',    icon: 'flash-outline' },
  { sessions: 50,   label: '50 sessions',    icon: 'trophy-outline' },
  { sessions: 100,  label: '100 sessions',   icon: 'trophy' },
  { sessions: 250,  label: '250 sessions',   icon: 'medal-outline' },
  { sessions: 500,  label: '500 sessions',   icon: 'ribbon-outline' },
];

function nextMilestone(total) {
  return MILESTONES.find(m => m.sessions > total) ?? null;
}

/**
 * The "Recovery by muscle" caption: what the estimate is built from. Once the
 * personal learning has moved (D210), the recovery speed learned from the
 * lifts takes the recovery answer's place, and the caption says so; until
 * then the answer is what the estimate uses.
 */
export function recoveryByMuscleCaption(personal) {
  const adjustedBy = personal?.reason === 'adjusted'
    ? 'your recovery speed (learned from your workouts) and your ratings'
    : 'your answer to ‘How’s your recovery?’ and your ratings';
  return `Estimated from how long ago each muscle was last trained and how many sets it had, adjusted for ${adjustedBy}. Not a measurement.`;
}

// Task 2 (recovery/freshness UI factual-language amendment): this used to
// band elapsed time into a readiness verdict (Just trained/Recovering/
// Nearly ready/Ready) via its own inline hours-since thresholds, and its
// `!lastTrainedAt` branch turned a muscle with NO recorded training at all
// into 'Ready' - missing evidence read as a positive readiness claim, and a
// second, disagreeing banding system from the one VolumeHeatmapScreen used
// (muscleRecovery.js, since deleted). Both are gone: this now reads the
// single shared trainingRecency() authority (lib/trainingRecency.js), which
// states only what a logged timestamp establishes and never infers
// recovered/ready/fresh/fatigued. One neutral colour for every entry - there
// is no verdict left to colour-code.
function buildFreshnessDisplay(c) {
  return function freshnessDisplay(lastTrainedAt, now) {
    const recency = trainingRecency(lastTrainedAt, now);
    return { label: recency.label, daysAgo: recency.daysAgo, color: c.textMuted, dot: c.textMuted };
  };
}

// Checkins arrive newest-first. Surfaces a single plain-English read on
// recovery capacity over the recent run of check-ins, or null when there
// is not enough signal to say anything useful. Reads energy, soreness and
// sleep quality; sleep is collected on the weekly check-in but, before
// this, was never read back to the user.
export function computeRecoveryTrendInsight(checkins, nowMs = Date.now()) {
  // C6 RD6-7 (D97-25): every sentence below speaks in runs and the
  // present tense ("in a row", "weeks running", "is trending"), but the
  // input was six ROWS of any age with no adjacency test - the exact
  // class D97-5 ruled for the coach counters, unapplied to this
  // surface. Two bounds, both from the standing rulings: the latest
  // check-in must be current (14-day boundary, as blockAdvisor's
  // sibling), and a run only counts across ADJACENT calendar weeks -
  // the walk stops at the first gap, so a lapse can never chain an
  // ancient week onto today's. Thresholds and wording are unchanged.
  const rows = Array.isArray(checkins) ? checkins : [];
  const latestWs = Number(rows[0]?.weekStart ?? rows[0]?.week_start);
  if (!Number.isFinite(latestWs) || (nowMs - latestWs) > 14 * 86400000) return null;
  const adjacent = [];
  let expectedWs = latestWs;
  for (const c of rows) {
    const ws = Number(c?.weekStart ?? c?.week_start);
    if (!Number.isFinite(ws)) break;
    // 1.5-day tolerance on the 7-day step absorbs DST-length weeks.
    if (Math.abs(ws - expectedWs) > 1.5 * 86400000) break;
    adjacent.push(c);
    expectedWs = ws - 7 * 86400000;
  }
  const energies = adjacent.map(c => c.energyScore ?? null).filter(v => v !== null);
  const soreness = adjacent.map(c => c.sorenessScore ?? null).filter(v => v !== null);
  const sleep = adjacent.map(c => c.sleepQuality ?? null).filter(v => v !== null);
  if (energies.length < 3 && soreness.length < 3 && sleep.length < 3) return null;

  const recentEnergy = energies.slice(0, 4);
  const lowEnergyWeeks = recentEnergy.filter(e => e <= 2).length;
  const highEnergyWeeks = recentEnergy.filter(e => e >= 4).length;
  const recentSoreness = soreness.slice(0, 4);
  const highSorenessWeeks = recentSoreness.filter(s => s >= 4).length;
  // Sleep quality is 1 (Poor) to 5 (Excellent); 2 or below is a short night.
  const recentSleep = sleep.slice(0, 4);
  const lowSleepWeeks = recentSleep.filter(s => s <= 2).length;

  if (lowEnergyWeeks >= 3) {
    return { type: 'warning', text: `Energy has been low for ${lowEnergyWeeks} weekly check-ins in a row, which is worth paying attention to.` };
  }
  if (highSorenessWeeks >= 3) {
    return { type: 'warning', text: `High soreness has been reported ${highSorenessWeeks} weeks running, so your recovery may need more attention.` };
  }
  // A run of poor nights is the clearest recovery signal there is. Surface
  // it in the same insight slot rather than on a card of its own, so the
  // leaned Consistency surface doesn't grow another chart.
  if (lowSleepWeeks >= 3) {
    // C6 closeout P-9 (evidence-naming law): sleepQuality is a
    // dual-source column - the workout summary writes it tier-blind
    // from the pre-workout sleep question - so calling these rows
    // "weekly check-ins" manufactured check-ins that never occurred
    // for a newly upgraded user. "Weeks running" is what the RD6-7
    // adjacency walk actually proves, whichever surface supplied the
    // rating. The energy/soreness sentences keep their noun: those
    // columns are only ever written by a real check-in.
    return { type: 'warning', text: `Sleep has been rated low for ${lowSleepWeeks} weeks running, which is worth paying attention to.` };
  }
  if (highEnergyWeeks >= 3) {
    return { type: 'good', text: `Energy has been consistently high across the last ${highEnergyWeeks} weekly check-ins, which is a good sign.` };
  }
  if (energies.length >= 4) {
    const older = energies.slice(2, 4);
    const newer = energies.slice(0, 2);
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    const newerAvg = newer.reduce((a, b) => a + b, 0) / newer.length;
    if (newerAvg - olderAvg >= 1) return { type: 'good', text: 'Energy is trending upward over the last few weeks.' };
    if (olderAvg - newerAvg >= 1) return { type: 'warning', text: 'Energy has been trending lower over the last few weeks.' };
  }
  return null;
}

// P3(a) (progress-tab audit 2026-09-24, D200-2): the one-tap "Rate your
// last session" path. Builds the WorkoutSummary route params EXACTLY the
// way WorkoutHistoryScreen.buildHistoryRows builds them for its own "View
// summary" button (workoutId, durationMinutes, exerciseCount, setCount,
// workingSetCount, tonnage, exerciseNames, startedAt, endedAt, routineId,
// routineName, readOnly: true), plus allowRating: true. Returns null when
// there is no completed workout or the latest one already carries both
// post-session ratings, so the caller renders no button.
function buildRateLastSessionParams(workout, sets, allExercises) {
  if (!workout) return null;
  if (workout.fatigueLevel != null && workout.jointDiscomfort != null) return null;
  const exercises = allExercises ?? [];
  const exerciseMap = Object.fromEntries(exercises.map((e) => [e.id, e]));
  const exerciseTypeById = Object.fromEntries(
    exercises.map((e) => [e.id, e.exercise_type ?? e.exerciseType ?? 'weight_reps']),
  );
  const loadSemanticsById = buildLoadSemanticsById(exercises);
  const mySets = sets ?? [];
  const workingSets = mySets.filter((s) => s.setType !== 'warmup');
  const exerciseIds = [...new Set(mySets.map((s) => s.exerciseId))];
  const exerciseNames = exerciseIds.map((id) => exerciseMap[id]?.name).filter(Boolean).slice(0, 4);
  return {
    workoutId: workout.id,
    durationMinutes: workout.durationMinutes,
    exerciseCount: exerciseIds.length,
    setCount: mySets.length,
    workingSetCount: workingSets.length,
    tonnage: calculateTonnage(mySets, exerciseTypeById, loadSemanticsById),
    exerciseNames,
    startedAt: workout.startedAt,
    endedAt: workout.endedAt,
    routineId: workout.routineId ?? null,
    routineName: workout.routineName ?? null,
    readOnly: true,
    allowRating: true,
  };
}

// D201 (per-muscle recovery, spec section 6): row order -- "recovering
// first then nearly then recovered, then by name". A muscle with no
// session in the last 14 days never reaches this table at all (rows only
// ever hold the other three statuses; see muscleRecoveryRows below).
const RECOVERY_ROW_STATUS_RANK = Object.freeze({ recovering: 0, nearly: 1, recovered: 2 });

// ASCII compare, not localeCompare: MUSCLE_DISPLAY_NAMES are plain English
// words, and Hermes' localeCompare needs full-icu to sort correctly, which
// this app does not link -- a plain compare is exact for this alphabet and
// carries no ICU risk on-device.
function compareMuscleNames(a, b) {
  const nameA = MUSCLE_DISPLAY_NAMES[a] || a;
  const nameB = MUSCLE_DISPLAY_NAMES[b] || b;
  if (nameA === nameB) return 0;
  return nameA < nameB ? -1 : 1;
}

// The per-muscle rows (band dot, name, estimated percent, bar, the
// ready-by and trained-ago line, and the tap-to-open breakdown) and their
// helpers live in MuscleRecoveryList.js (D201 addendum 9).

// FOUNDER DECISION (fully free, no tier split): every reader below used to
// fork on `tier` (muscle freshness, the recovery-trend insight, and the
// learning-promise tooltip copy); the component no longer takes a tier prop
// and always runs the full behaviour.
// Founder question 2026-09-26 ("Should we have a place in Progress
// exclusively for recovery rather than it being hidden behind a button for
// consistency?"), ruled by the lead (register D208): the Recovery section
// moves to its own screen, reached from a Recovery row in the top card on
// Progress. `sections` picks what this component draws: 'all' (the old
// single block), 'milestone' (Consistency: the sessions milestone only) or
// 'recovery' (the Recovery screen: the section exactly as it was, same
// order, headed "Your ratings" because the screen itself is titled
// "Recovery"). The recovery reads are skipped when they would not be drawn.
export default function ReadinessCards({ userId, onRateLastSession, sections = 'all' }) {
  // CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
  // theme (src/hooks/useTheme.js). See buildLiveStyles' header comment
  // (defined further down this file, after the frozen `styles` block).
  const t = useTheme();
  const live = buildLiveStyles(t);
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [recovery, setRecovery] = useState({ soreness: null, fatigue: null, joint: null });
  const [sampleCounts, setSampleCounts] = useState({ soreness: 0, fatigue: 0, joint: 0 });
  const [muscleFreshness, setMuscleFreshness] = useState({});
  const [recoveryTrendInsight, setRecoveryTrendInsight] = useState(null);
  // P3(a): the latest completed session's WorkoutSummary route params, or
  // null when there is no completed session or it already carries both
  // post-session ratings -- either way, the "Rate your last session"
  // button renders nothing.
  const [rateSessionParams, setRateSessionParams] = useState(null);
  // P3(b): the latest weekly check-in row (camelCased, from
  // getRecentCheckins(userId, 1)), read independently of the >=3 gate the
  // existing trend-insight sentence below uses, so this row can show as
  // soon as a single check-in exists.
  const [latestCheckin, setLatestCheckin] = useState(null);
  // D201: loadMuscleRecovery's own result ({ map, nowMs, ... }), or null
  // when it hasn't resolved yet or the read failed -- null hides the whole
  // "Recovery by muscle" section (figure, rows, caption, next-workout row)
  // without touching anything else this component renders (see load()).
  const [muscleRecovery, setMuscleRecovery] = useState(null);
  // D201 addendum 9: the muscle whose breakdown is open (row tap or the
  // figure's muscle tap); null when none.
  const [selectedMuscle, setSelectedMuscle] = useState(null);
  // D201: recommendNextWorkout's result, or null when there is no active
  // block, no outstanding session to reason about, or the read failed.
  const [recoveryRecommendation, setRecoveryRecommendation] = useState(null);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const [workouts, sets] = await Promise.all([
        getAllWorkouts(userId),
        getCompletedWorkoutSets(userId),
      ]);
      const setsPerWorkout = new Map();
      for (const s of sets ?? []) {
        const wid = s.workoutId ?? s.workout_id;
        if (!wid) continue;
        setsPerWorkout.set(wid, (setsPerWorkout.get(wid) ?? 0) + 1);
      }
      const completed = (workouts ?? []).filter(w => {
        const isComplete = !!(w.isCompleted ?? w.is_completed);
        if (!isComplete) return false;
        const cachedCount = w.setCount ?? w.set_count;
        const liveCount = setsPerWorkout.get(w.id) ?? 0;
        return (cachedCount != null && cachedCount > 0) || liveCount > 0;
      });
      setTotalWorkouts(completed.length);
      // C5-P18-02 (D96): soreness_24h_before is written on a 1-3 domain
      // (Fresh/Mild/Sore, the scale the adaptive engine and computeRecoveryEMAs
      // read), but this card draws it on a gauge captioned "Scale 1-5" with
      // 1-5 thresholds, so a user who tapped the MAXIMUM option saw a
      // mid-scale amber "Elevated". Normalised for DISPLAY with the exact
      // mapping WorkoutSummaryScreen already uses (1 -> 2, 2 -> 3, 3 -> 4);
      // no stored value changes and computeRecoveryEMAs is untouched.
      // C6 RD6-12 (D97-25): the tooltip promises older sessions "fade
      // out", but emaValue normalises by the weight sum, so the OUTPUT
      // is age-invariant and the gauges were fed every completed
      // workout ever - after months away, "Fatigue - High" rendered a
      // present-tense read of ancient sessions. The gauges now read
      // only sessions inside the standing 14-day boundary (the same
      // bound R-6/RB6-4 gave the sibling readiness surfaces); with
      // nothing recent they fall to their existing waiting state. The
      // pure EMA helper is untouched.
      const gaugeRecent = completed.filter((w) => {
        const at = Number(w.endedAt ?? w.startedAt ?? w.createdAt);
        return Number.isFinite(at) && (Date.now() - at) <= 14 * 86400000;
      });
      const displayWorkouts = gaugeRecent.map((w) => (
        w.soreness24hBefore == null
          ? w
          : { ...w, soreness24hBefore: [2, 3, 4][w.soreness24hBefore - 1] ?? w.soreness24hBefore }
      ));
      setRecovery(computeRecoveryEMAs(displayWorkouts));
      // C5-P18-01 (D96): how many RATED sessions each gauge actually
      // averaged. computeRecoveryEMAs returns a value from a single point, so
      // one rated session produced "4.0 / Fatigue / High" beside a red dot,
      // under a caption calling it a weighted running average and telling the
      // user that consistently high scores mean a lighter week. Nothing had
      // been averaged and nothing was consistent. Counted here rather than in
      // recoveryEMA.js so the pure engine helper and its pinned shape stay
      // exactly as they are.
      setSampleCounts({
        soreness: gaugeRecent.filter(w => w.soreness24hBefore != null).length,
        fatigue: gaugeRecent.filter(w => w.fatigueLevel != null).length,
        joint: gaugeRecent.filter(w => (w.maxJointDiscomfort ?? w.jointDiscomfort) != null).length,
      });
    } catch (_) {}

    // Consistency draws only the milestone, which needs nothing below.
    if (sections === 'milestone') return;

    try {
      const data = await getLastTrainedPerMuscle(userId);
      setMuscleFreshness(data || {});
    } catch (_) {}
    try {
      const checkins = await getRecentCheckins(userId, 6);
      if (checkins.length >= 3) setRecoveryTrendInsight(computeRecoveryTrendInsight(checkins));
    } catch (_) {}

    // P3(a): the latest completed session, only when it still needs a
    // post-session rating. getRecentCompletedWorkouts(userId, 1) (not
    // getWorkoutById) so the row carries routineName from its routines
    // join -- a bare `SELECT * FROM workouts` never would, and the
    // summary's title depends on it (founder device report 2026-08-24,
    // WorkoutHistoryScreen's own route-building comment). Same ordering
    // WorkoutHistoryScreen's list uses, so "latest" agrees with it.
    try {
      const [lastWorkout] = await getRecentCompletedWorkouts(userId, 1);
      if (lastWorkout) {
        const [lastSets, exercisesForLast] = await Promise.all([
          getWorkoutSetsForWorkout(lastWorkout.id),
          getAllExercises(),
        ]);
        setRateSessionParams(buildRateLastSessionParams(lastWorkout, lastSets, exercisesForLast));
      } else {
        setRateSessionParams(null);
      }
    } catch (_) {}
    // Best-effort: a failed read here only means the button doesn't show
    // this visit, never a crash or a stale nav target.

    // P3(b): the latest weekly check-in, independent of the trend
    // insight's own >=3 gate above.
    try {
      const recent = await getRecentCheckins(userId, 1);
      setLatestCheckin(recent?.[0] ?? null);
    } catch (_) {}
    // Best-effort: a failed read here only means the check-in row doesn't
    // show this visit, never a crash.

    // D201 (per-muscle recovery, spec section 6): the ONLY new I/O this
    // component performs for the "Recovery by muscle" section, entirely
    // through src/lib/recovery/load.js -- mirrors
    // HomeScreen.loadRecoveryRecommendation's own call chain exactly, so
    // Home and this block can never disagree about what is next. A failed
    // read here hides the WHOLE section (never a crash, never a stale
    // figure) and leaves every other reader in this file untouched.
    try {
      const recoveryLoad = await loadMuscleRecovery(userId);
      // Opus review finding 10: a core read that failed is not an all-clear.
      // The whole section stays hidden rather than showing every muscle as
      // "no recent session" off a read that never happened.
      if (recoveryLoad?.degraded) {
        setMuscleRecovery(null);
        setRecoveryRecommendation(null);
        return;
      }
      setMuscleRecovery(recoveryLoad);
      try {
        const position = await resolveProgrammePosition(userId);
        const programmeNext = position?.nextSession ?? null;
        // Opus review finding 1: a FINISHED block awaiting the athlete's
        // decision has no "next workout" to suggest; Home's own hero says
        // "choose what comes after this block" there, and this row must not
        // contradict it. resolveProgrammePosition's gated recovery state is
        // the one authority for that reading.
        const awaitingDecision = !!position?.recoveryState?.awaitingDecision;
        if (position && programmeNext && !awaitingDecision) {
          const sessions = position.sessions ?? [];
          const outstandingIds = sessions
            .filter((s) => s.state === SESSION_STATE.OUTSTANDING)
            .map((s) => s.routineId);
          const plannedSetsByRoutine = await loadPlannedSetsByRoutine(outstandingIds);
          const projectedAtMs = nextLikelyTrainingTime({
            nowMs: recoveryLoad.nowMs,
            habitualWeekdays: recoveryLoad.habitualWeekdays,
            typicalStartMinute: recoveryLoad.typicalStartMinute,
          });
          const routineNamesById = Object.fromEntries(sessions.map((s) => [s.routineId, s.name]));
          const result = recommendNextWorkout({
            sessions,
            plannedSetsByRoutine,
            recoveryMap: recoveryLoad.map,
            projectedAtMs,
            nowMs: recoveryLoad.nowMs,
            routineNamesById,
          });
          // Lead review: this row has no card title naming the session (Home
          // does), so it carries the programme-next name itself, looked up
          // from the same sessions the rule was given.
          setRecoveryRecommendation({
            ...result,
            programmeNextName: routineNamesById[result?.programmeNext?.routineId] ?? '',
          });
        } else {
          setRecoveryRecommendation(null);
        }
      } catch (e) {
        logError('ReadinessCards.loadRecoveryRecommendation', e, { userId });
        setRecoveryRecommendation(null);
      }
    } catch (e) {
      logError('ReadinessCards.loadMuscleRecovery', e, { userId });
      setMuscleRecovery(null);
      setRecoveryRecommendation(null);
    }
  }, [userId, sections]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const next = nextMilestone(totalWorkouts);
  const unlocked = MILESTONES.filter(m => m.sessions <= totalWorkouts);
  const lastUnlocked = unlocked[unlocked.length - 1] ?? null;
  const progressPct = next ? `${Math.round(Math.min(1, totalWorkouts / next.sessions) * 100)}%` : '100%';

  const resolveFreshnessDisplay = buildFreshnessDisplay(t.colors);
  const freshnessEntries = Object.entries(MUSCLE_DISPLAY_NAMES)
    .filter(([key]) => muscleFreshness[key] !== undefined)
    .map(([key, displayName]) => ({ key, displayName, ...resolveFreshnessDisplay(muscleFreshness[key], Date.now()) }))
    // Malformed/future evidence reads as daysAgo: null (trainingRecency's
    // 'Not logged') - drop it rather than show a not-logged chip for a
    // muscle the pre-filter above already established has SOME record.
    .filter((e) => e.daysAgo !== null)
    // Factual ordering only: most recently trained first. No severity or
    // readiness implication - trainingRecency carries none to sort by.
    .sort((a, b) => a.daysAgo - b.daysAgo);

  // D201 (spec section 6): "now" for every recovery-row/next-workout
  // derivation below, taken from the loader's own snapshot rather than a
  // fresh Date.now() -- readyByPhrase/trainingRecency then always agree
  // with whatever nextLikelyTrainingTime/recommendNextWorkout computed
  // against inside load() above, even if rendering happens moments later.
  const muscleRecoveryNowMs = muscleRecovery?.nowMs ?? Date.now();
  // Rows: one per muscle with a session in the last 14 days (status is
  // never 'no_recent_session' for these), recovering first then nearly
  // then recovered, then by name (spec section 6). Absent entirely
  // (muscleRecovery null) whenever the loader hasn't resolved or failed.
  const muscleRecoveryRows = muscleRecovery
    ? Object.values(muscleRecovery.map)
      .filter((entry) => entry.status !== 'no_recent_session')
      .sort((a, b) => (
        RECOVERY_ROW_STATUS_RANK[a.status] - RECOVERY_ROW_STATUS_RANK[b.status]
      ) || compareMuscleNames(a.muscle, b.muscle))
    : [];
  // "The chips themselves fold into the rows" -- a muscle with a row above
  // no longer needs its own Training-recency chip, so that block narrows to
  // whichever ever-trained muscles (freshnessEntries) have NO row. When
  // muscleRecovery is null (not yet loaded, or the read failed),
  // rowMuscleKeys is empty and every chip keeps showing exactly as it did
  // before this feature existed. Those chips are the one place a muscle
  // with no session in 14 days is named (lead review: a second "No recent
  // session: <names>" line under the rows repeated them and was dropped).
  const rowMuscleKeys = new Set(muscleRecoveryRows.map((entry) => entry.muscle));
  const noRecentSessionEntries = freshnessEntries.filter((e) => !rowMuscleKeys.has(e.key));
  // The open row, if its muscle still has one: a selection whose muscle
  // has since left the rows (aged out of the 14-day window across a
  // refocus reload) reads as nothing open, so the next tap on that muscle
  // opens it rather than closing a phantom (review finding, 2026-09-26).
  const openMuscle = selectedMuscle && rowMuscleKeys.has(selectedMuscle) ? selectedMuscle : null;
  // Next-workout row text (spec 4.2 point 4): the swap reason when one
  // applies ("Legs is next in your plan. Quads are estimated 64% recovered,
  // ready by Thursday. Push is ready now."), else "<Name> is next." plus
  // the programme-next line ("Legs is next. Quads are estimated 64%
  // recovered, ready by Thursday." / "Legs is next. Every muscle it trains
  // is estimated recovered."). Home's card omits the name because its title
  // already carries it; this row has no such title, so it names the session
  // itself. null (row hidden) when the programme-next session's planned
  // sets could not be read: no estimate to state.
  const nextWorkoutText = (() => {
    if (!recoveryRecommendation) return null;
    if (recoveryRecommendation.reason) return recoveryRecommendation.reason;
    if (!recoveryRecommendation.programmeNextLine) return null;
    const who = recoveryRecommendation.programmeNextName || 'Your next session';
    return `${who} is next. ${recoveryRecommendation.programmeNextLine}`;
  })();

  // P3(a) (D200-2): true whenever AT LEAST ONE gauge is still short of
  // MIN_RATED_SESSIONS -- the shared caption explains why that gauge (or
  // those gauges) read N/A, and disappears once every gauge has enough.
  const gaugesIncomplete = sampleCounts.soreness < MIN_RATED_SESSIONS
    || sampleCounts.fatigue < MIN_RATED_SESSIONS
    || sampleCounts.joint < MIN_RATED_SESSIONS;

  // P3(b): "Week of 21 Sep" from the check-in's weekStart, and the four
  // check-in values on the exact scales WeeklyCheckInScreen.js uses
  // (energyScore/stressScore/sorenessScore 1-5, sleepHours in hours),
  // omitting any value the check-in left null. Empty string/array when
  // there is no check-in, so the row below renders nothing.
  const checkinWeekLabel = latestCheckin ? safeFormatDate(latestCheckin.weekStart, 'd MMM', '') : '';
  const checkinValuesLine = latestCheckin
    ? [
      checkinWeekLabel ? `Week of ${checkinWeekLabel}` : null,
      latestCheckin.energyScore != null ? `Energy ${latestCheckin.energyScore}/5` : null,
      latestCheckin.stressScore != null ? `Stress ${latestCheckin.stressScore}/5` : null,
      latestCheckin.sleepHours != null ? `Sleep ${latestCheckin.sleepHours} h` : null,
      latestCheckin.sorenessScore != null ? `Soreness ${latestCheckin.sorenessScore}/5` : null,
    ].filter(Boolean).join(' · ')
    : '';

  return (
    <AnimatedEntrance index={1} style={{ gap: spacing.md }}>
      {/* Milestone progress */}
      {sections !== 'recovery' && (lastUnlocked || next) && (
        <View style={[styles.milestoneCard, live.milestoneCard]}>
          <View style={styles.milestoneTop}>
            {lastUnlocked && (
              <View style={styles.milestoneUnlocked}>
                <Ionicons name={lastUnlocked.icon} size={16} color={t.colors.gold} />
                <Text style={[styles.milestoneUnlockedText, live.milestoneUnlockedText]}>{lastUnlocked.label}</Text>
              </View>
            )}
            {next && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Text style={[styles.milestoneNext, live.milestoneNext]}>{next.sessions - totalWorkouts} to go: {next.label}</Text>
                {/* FOUNDER DECISION (fully free, no tier split): the
                    learning promise no longer forks on tier -- every user
                    gets the three coaching capabilities (weights, rep-slip
                    detection, lighter-week timing), so this is the one
                    sentence for everyone. */}
                <InfoTooltip size={11} text={'Consistency is the biggest predictor of long-term progress. The more sessions you log, the better your coach understands how your body responds, so it can suggest the right weights, spot when your reps are slipping, and time your lighter weeks correctly.\n\nBuilding the habit is the foundation everything else sits on.'} />
              </View>
            )}
          </View>
          {next && (
            <View style={[styles.milestoneBarTrack, live.milestoneBarTrack]}>
              <View style={[styles.milestoneBarFill, live.milestoneBarFill, { width: progressPct }]} />
            </View>
          )}
        </View>
      )}

      {/* Recovery: the signals and muscle readiness folded into one block. */}
      {sections !== 'milestone' && (
      <View style={styles.section}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <SectionLabel>{sections === 'recovery' ? 'Your ratings' : 'Recovery'}</SectionLabel>
          <InfoTooltip text="A running average of your session feedback after each workout, weighted so the last week counts most, and read only from your last two weeks of rated sessions. It waits for a couple of rated sessions before showing a figure, because one session is not an average. Scored 1-5 where lower is better for Soreness and Fatigue (1 = fresh, 5 = very sore/tired). Joint Comfort is also 1-5 where 1 = comfortable." />
        </View>
        <View style={[styles.recoveryCard, live.recoveryCard]}>
          <View style={styles.recoveryGrid}>
            <RecoveryGauge label="Soreness" value={recovery.soreness} samples={sampleCounts.soreness} />
            <RecoveryGauge label="Fatigue" value={recovery.fatigue} samples={sampleCounts.fatigue} />
            <RecoveryGauge label="Joint comfort" value={recovery.joint} samples={sampleCounts.joint} invertGood />
          </View>
          {/* P3(a) (F3, D200-2): present only while at least one gauge is
              still short of MIN_RATED_SESSIONS -- names the two inputs and
              when they start counting, so an N/A gauge is never unexplained. */}
          {gaugesIncomplete && (
            <Text style={[styles.recoveryWaitingCaption, live.recoveryWaitingCaption]}>
              These read the soreness you report before a session and the fatigue and joint comfort you rate after it. They appear after two rated sessions in the last two weeks.
            </Text>
          )}

          {/* P3(a): a one-tap path to the latest completed session's
              summary, rating mode. Absent once that session carries both
              post-session ratings (rateSessionParams is then null),
              independent of gaugesIncomplete above (T2's own test (b)). */}
          {rateSessionParams && (
            <Button
              title="Rate your last session"
              variant="secondary"
              size="sm"
              onPress={() => onRateLastSession?.(rateSessionParams)}
              accessibilityLabel="Rate your last session"
            />
          )}

          <Text style={[styles.recoveryNote, live.recoveryNote]}>Scale 1-5 · Lower is better for soreness & fatigue</Text>

          {/* P3(b): the latest weekly check-in's own signals, read
              independently of the trend-insight sentence below. */}
          {latestCheckin && (
            <>
              <View style={[styles.recoveryDivider, live.recoveryDivider]} />
              <View>
                <Text style={[styles.checkinTitle, live.checkinTitle]}>From your weekly check-in</Text>
                {checkinValuesLine ? (
                  <Text style={[styles.checkinValues, live.checkinValues]}>{checkinValuesLine}</Text>
                ) : null}
              </View>
            </>
          )}

          {/* D201: narrowed to muscles with NO row in the "Recovery by
              muscle" section below (spec section 6, "the chips themselves
              fold into the rows") -- see noRecentSessionEntries above. */}
          {noRecentSessionEntries.length > 0 && (
            <>
              <View style={[styles.recoveryDivider, live.recoveryDivider]} />
              <View style={styles.mfHeaderRow}>
                <View style={[styles.mfIconWrap, { backgroundColor: t.colors.primaryBg }]}>
                  <Ionicons name="flash-outline" size={20} color={t.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.mfTitle, live.mfTitle]}>Training recency</Text>
                  {/* Task 2: this is elapsed time since the last logged set,
                      nothing more - it never reads this user's soreness or
                      recovery data, so the title and gloss say only that. */}
                  <Text style={[styles.mfSub, live.mfSub]}>How recently each muscle was trained.</Text>
                </View>
              </View>
              <View style={styles.mfChipGrid}>
                {noRecentSessionEntries.map(({ key, displayName, label, color, dot }) => (
                  <View key={key} style={[styles.mfChip, { borderColor: withAlpha(color, alpha.edge), backgroundColor: withAlpha(color, alpha.ghost) }]}>
                    <View style={[styles.mfDot, { backgroundColor: dot }]} />
                    <Text style={[styles.mfChipName, live.mfChipName, { color: t.colors.textPrimary }]}>{displayName}</Text>
                    <Text style={[styles.mfChipLabel, live.mfChipLabel, { color }]}>{label}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        {/* D201 (per-muscle recovery, spec section 6): estimated recovery
            per muscle -- the body figure (recovery palette), one row per
            recently-trained muscle, the caption, and the next-workout row. Best-effort off
            loadMuscleRecovery (see load()): absent entirely, not even the
            heading, whenever that read hasn't resolved or failed, so a
            broken estimate never sits here looking like it succeeded. */}
        {muscleRecovery && (
          <View style={[styles.mfCard, live.mfCard]}>
            <Text style={[styles.mfTitle, live.mfTitle]} accessibilityRole="header">Recovery by muscle</Text>
            {/* The sub-line carries "Estimated" for every percent in the list
                below it (spec section 6's percent law). */}
            <Text style={[styles.mfSub, live.mfSub]}>Estimated · last 14 days</Text>
            <BodyDiagramHeatmap
              recoveryByMuscle={muscleRecovery.map}
              // A muscle tap opens that muscle's row below (a muscle with no
              // row, no session in 14 days, is left alone).
              onMuscleTap={(muscle) => {
                if (openMuscle === muscle) { setSelectedMuscle(null); return; }
                if (rowMuscleKeys.has(muscle)) setSelectedMuscle(muscle);
              }}
            />
            <MuscleRecoveryList
              rows={muscleRecoveryRows}
              nowMs={muscleRecoveryNowMs}
              freshness={muscleFreshness}
              selectedMuscle={openMuscle}
              onSelect={setSelectedMuscle}
              learnedSpeed={muscleRecovery.personal?.reason === 'adjusted'}
            />
            <Text style={[styles.rbmCaption, live.rbmCaption]}>
              {recoveryByMuscleCaption(muscleRecovery.personal)}
            </Text>
            {nextWorkoutText && (
              <>
                <View style={[styles.recoveryDivider, live.recoveryDivider]} />
                <View>
                  <Text style={[styles.rbmNextWorkoutTitle, live.rbmNextWorkoutTitle]}>Next workout</Text>
                  <Text style={[styles.rbmNextWorkoutText, live.rbmNextWorkoutText]}>{nextWorkoutText}</Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* D210: the personal recovery learning, shown as one thing that
            moves (RecoveryLearningCard). Present whenever the loader
            returned a reading, including the "still learning" states, and
            absent with the section above when the read failed. */}
        {muscleRecovery?.personal ? <RecoveryLearningCard personal={muscleRecovery.personal} /> : null}

        {recoveryTrendInsight && (
          <View style={[styles.trendInsightCard, recoveryTrendInsight.type === 'good' ? [styles.trendInsightGood, live.trendInsightGood] : [styles.trendInsightWarn, live.trendInsightWarn]]}>
            <Ionicons
              name={recoveryTrendInsight.type === 'good' ? 'trending-up-outline' : 'alert-circle-outline'}
              size={16}
              color={recoveryTrendInsight.type === 'good' ? t.colors.success : t.colors.warning}
            />
            <Text style={[styles.trendInsightText, live.trendInsightText]}>{recoveryTrendInsight.text}</Text>
          </View>
        )}
      </View>
      )}
    </AnimatedEntrance>
  );
}

// MIN_RATED_SESSIONS: a "running average" needs at least two points to be one.
// Below that the gauge shows the existing no-value state with a one-line
// caption, and no colour verdict is rendered.
const MIN_RATED_SESSIONS = 2;

function RecoveryGauge({ label, value, samples = 0, invertGood = false }) {
  // CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
  // theme (src/hooks/useTheme.js). RecoveryGauge is a separate function
  // component from ReadinessCards above, so it calls useTheme() itself
  // (same pattern as WorkoutSummaryScreen.js's RatingRow).
  const t = useTheme();
  const live = buildLiveStyles(t);
  // C5-P18-01: a single rated session is not an average, so it gets no number
  // and no coloured verdict.
  const enoughSamples = samples >= MIN_RATED_SESSIONS;
  const hasValue = value != null && !isNaN(value) && enoughSamples;
  const display = hasValue ? value.toFixed(1) : 'N/A';

  let dotColor = t.colors.textMuted;
  // P3(a) (F3, D200-2): honest and specific per sample count -- 0 -> no
  // session has rated anything yet; 1 -> one rated session is not enough
  // for a running average (C5-P18-01, unchanged).
  let scaleNote = samples > 0 && !enoughSamples
    ? 'One rated session so far'
    : 'Not rated yet';
  if (hasValue) {
    const v = parseDecimalInput(value);
    if (invertGood) {
      dotColor = v >= 3 ? t.colors.error : v >= 2 ? t.colors.warning : t.colors.success;
      scaleNote = v >= 3 ? 'High discomfort' : v >= 2 ? 'Moderate' : 'Comfortable';
    } else {
      dotColor = v >= 4 ? t.colors.error : v >= 3 ? t.colors.warning : t.colors.success;
      scaleNote = v >= 4 ? 'High' : v >= 3 ? 'Elevated' : v >= 2 ? 'Moderate' : 'Low / Fresh';
    }
  }

  return (
    <View style={styles.gaugeItem}>
      <View style={[styles.gaugeDot, { backgroundColor: dotColor }]} />
      <Text style={[styles.gaugeValue, live.gaugeValue]}>{display}</Text>
      <Text style={[styles.gaugeLabel, live.gaugeLabel]}>{label}</Text>
      <Text style={[styles.gaugeScale, live.gaugeScale]}>{scaleNote}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  milestoneCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.borderSubtle, gap: spacing.md,
  },
  milestoneTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  milestoneUnlocked: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  milestoneUnlockedText: { fontSize: fontSize.sm, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold, color: colors.gold },
  milestoneNext: { ...type.caption, color: colors.textMuted },
  milestoneBarTrack: { height: 4, borderRadius: radius.full, backgroundColor: colors.surface2, overflow: 'hidden' },
  milestoneBarFill: { height: '100%', borderRadius: radius.full, backgroundColor: colors.primary },

  recoveryCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.borderSubtle, gap: spacing.md,
  },
  recoveryGrid: {
    flexDirection: 'row', gap: spacing.sm,
  },
  recoveryDivider: {
    height: 1, backgroundColor: colors.border, marginVertical: spacing.xs,
  },
  gaugeItem: { flex: 1, alignItems: 'center', gap: spacing.xs },
  gaugeDot: { width: 12, height: 12, borderRadius: radius.sm },
  gaugeValue: { fontSize: fontSize.lg, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  gaugeLabel: { ...type.caption, color: colors.textMuted, textAlign: 'center' },
  gaugeScale: { ...type.caption, color: colors.textMuted, textAlign: 'center' },
  recoveryNote: { ...type.caption, color: colors.textMuted, textAlign: 'center' },
  // P3(a): the waiting-state caption under the gauge row (F3, D200-2).
  recoveryWaitingCaption: { ...type.caption, color: colors.textMuted, textAlign: 'center' },
  // P3(b): the "From your weekly check-in" row, same hierarchy as mfTitle/mfSub.
  checkinTitle: { fontSize: fontSize.md, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  checkinValues: { ...type.captionTight, color: colors.textMuted, marginTop: spacing.xxs },

  trendInsightCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    borderRadius: radius.lg, borderWidth: 1, padding: spacing.md,
  },
  trendInsightGood: { backgroundColor: colors.successBg ?? colors.primaryBg, borderColor: withAlpha(colors.success, alpha.edge) },
  trendInsightWarn: { backgroundColor: colors.warningBg, borderColor: withAlpha(colors.warning, alpha.edge) },
  trendInsightText: { ...type.bodySm, flex: 1, color: colors.textSecondary },

  mfCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.borderSubtle, gap: spacing.md,
  },
  mfHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  mfIconWrap: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  mfTitle: { fontSize: fontSize.md, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  mfSub: { ...type.captionTight, color: colors.textMuted, marginTop: spacing.xxs },
  mfChipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  mfChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs2, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, borderWidth: 1 },
  mfDot: { width: 6, height: 6, borderRadius: circle(6), flexShrink: 0 },
  mfChipName: { ...type.captionStrong },
  mfChipLabel: { ...type.captionStrong },
  // D201 (per-muscle recovery, spec section 6): the "Recovery by muscle"
  // section's own rows/caption/next-workout styles. The section's outer
  // card reuses mfCard above (pre-existing, previously unused in this
  // file's own JSX); its heading reuses mfTitle.
  rbmCaption: { ...type.caption, color: colors.textMuted },
  rbmNextWorkoutTitle: { fontSize: fontSize.md, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  rbmNextWorkoutText: { ...type.bodySm, color: colors.textSecondary, marginTop: spacing.xxs },
});

// CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
// override for the frozen `styles` block above, shared by BOTH function-
// component scopes in this file (ReadinessCards, RecoveryGauge) -- each
// calls `const t = useTheme(); const live = buildLiveStyles(t);` and appends
// `live.KEY` after `styles.KEY`, same pattern as WorkoutSummaryScreen.js's
// buildLiveStyles. Only mirrors the colour/fontSize/type-bearing
// sub-properties of the matching frozen style, at identical rest values;
// pure layout keys (section/milestoneTop/milestoneUnlocked/recoveryGrid/
// gaugeItem/gaugeDot/trendInsightCard/mfHeaderRow/mfIconWrap/mfChipGrid/
// mfChip/mfDot) have no colour tokens, so there is nothing to unfreeze for
// them. mfCard is unused in the current JSX (dead style, pre-existing, not
// this batch's concern) but is mirrored here too for completeness.
function buildLiveStyles(t) {
  return {
    milestoneCard: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    milestoneUnlockedText: { fontSize: t.fontSize.sm, color: t.colors.gold },
    milestoneNext: { ...t.type.caption, color: t.colors.textMuted },
    milestoneBarTrack: { backgroundColor: t.colors.surface2 },
    milestoneBarFill: { backgroundColor: t.colors.primary },
    recoveryCard: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    recoveryDivider: { backgroundColor: t.colors.border },
    gaugeValue: { fontSize: t.fontSize.lg, color: t.colors.textPrimary },
    gaugeLabel: { ...t.type.caption, color: t.colors.textMuted },
    gaugeScale: { ...t.type.caption, color: t.colors.textMuted },
    recoveryNote: { ...t.type.caption, color: t.colors.textMuted },
    recoveryWaitingCaption: { ...t.type.caption, color: t.colors.textMuted },
    checkinTitle: { fontSize: t.fontSize.md, color: t.colors.textPrimary },
    checkinValues: { ...t.type.captionTight, color: t.colors.textMuted },
    trendInsightGood: { backgroundColor: t.colors.successBg ?? t.colors.primaryBg, borderColor: withAlpha(t.colors.success, alpha.edge) },
    trendInsightWarn: { backgroundColor: t.colors.warningBg, borderColor: withAlpha(t.colors.warning, alpha.edge) },
    trendInsightText: { ...t.type.bodySm, color: t.colors.textSecondary },
    mfCard: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    mfTitle: { fontSize: t.fontSize.md, color: t.colors.textPrimary },
    mfSub: { ...t.type.captionTight, color: t.colors.textMuted },
    mfChipName: { ...t.type.captionStrong },
    mfChipLabel: { ...t.type.captionStrong },
    rbmCaption: { ...t.type.caption, color: t.colors.textMuted },
    rbmNextWorkoutTitle: { fontSize: t.fontSize.md, color: t.colors.textPrimary },
    rbmNextWorkoutText: { ...t.type.bodySm, color: t.colors.textSecondary },
  };
}
