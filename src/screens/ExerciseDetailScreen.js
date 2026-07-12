import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { format } from 'date-fns/format';
import VolyumeChart from '../components/VolyumeChart';
import WindowChips from '../components/WindowChips';
import {
  TREND_WINDOWS, DEFAULT_WINDOW_KEY, windowByKey, filterByWindow,
  pickInitialWindowKey, e1rmTakeaway,
} from '../lib/chartWindows';
import { track } from '../lib/engineTelemetry';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha, motion } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import Card from '../components/Card';
import TextField from '../components/TextField';
import SectionLabel from '../components/SectionLabel';
import { SkeletonCard } from '../components/Skeleton';
import AnimatedEntrance from '../components/AnimatedEntrance';
import {
  getExerciseById, getWorkoutSetsForExercise, getAllExercises,
  getExerciseGoal, saveExerciseGoal, markGoalAchieved, deleteExerciseGoal,
} from '../lib/database';
import { calculate1RM, MUSCLE_DISPLAY_NAMES, detectPlateau, detectPR } from '../lib/algorithms';
import { buildExerciseMetricSeries } from '../lib/liftProgress';
import { equipmentDisplayLabel, difficultyDisplayLabel, subregionDisplayLabel } from '../lib/exerciseDisplay';
import { rankSwaps } from '../lib/swapEngine';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { logError } from '../lib/errorLog';
import { FORM_TIPS } from '../lib/formTips';
import InfoTooltip from '../components/InfoTooltip';
import { navigateCrossTab } from '../navigation/navigateCrossTab';
import BottomSheet from '../components/BottomSheet';

// Loose date parser, accepts "Dec 2025", "December 2025", "2025-12", "12/2025" etc.
// Returns unix timestamp (ms) for the 1st of the parsed month, or null.
function parseLooseDate(str) {
  if (!str || !str.trim()) return null;
  const s = str.trim();

  // ISO yyyy-mm
  const isoMatch = s.match(/^(\d{4})-(\d{1,2})$/);
  if (isoMatch) {
    const d = new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, 1);
    if (!isNaN(d)) return d.getTime();
  }

  // mm/yyyy or mm-yyyy
  const slashMatch = s.match(/^(\d{1,2})[\/\-](\d{4})$/);
  if (slashMatch) {
    const d = new Date(parseInt(slashMatch[2], 10), parseInt(slashMatch[1], 10) - 1, 1);
    if (!isNaN(d)) return d.getTime();
  }

  // "Dec 2025" / "December 2025"
  const d = new Date(`1 ${s}`);
  if (!isNaN(d)) return d.getTime();

  // Full date string fallback
  const d2 = new Date(s);
  if (!isNaN(d2)) return d2.getTime();

  return null;
}

// The five lenses the detail chart can draw. Mirrors LiftProgressScreen's
// metric switcher (best set / heaviest / total reps / volume) and adds best-set
// volume, the heaviest single working set's load × its reps that session, a
// cheap derive from the already-grouped sets. 'heaviest' is the historic
// default ("Max weight"); 'e1rm' is the estimated max. Values come from
// buildExerciseMetricSeries so distance/duration exercises (which reuse the
// weight column) plot nothing rather than nonsense.
const CHART_METRICS = [
  { key: 'e1rm', label: 'Est. max' },
  { key: 'heaviest', label: 'Max weight' },
  { key: 'reps', label: 'Total reps' },
  { key: 'volume', label: 'Volume' },
  { key: 'bestSetVolume', label: 'Best-set vol' },
];

// Whether a metric's values are a weight in the display unit (so the tooltip
// and takeaway append kg/lbs) or a bare count (reps) / derived load.
const WEIGHT_METRICS = new Set(['e1rm', 'heaviest']);

// Build one dated chart point per session for every lens, oldest -> newest,
// reusing buildExerciseMetricSeries for the e1rm/heaviest/reps/volume arrays so
// distance/duration exercises are skipped exactly as the list sparkline skips
// them. Pure and exported for unit testing. allSessions is the screen's
// per-workout set groups (each an array of sets). bestSetVolume is computed
// here from the same working-set grouping (heaviest working set's load × reps).
export function buildDetailMetricPoints(allSessions, exerciseId, exerciseTypeById) {
  const flatSets = (allSessions || []).flat();
  const series = buildExerciseMetricSeries(flatSets, exerciseTypeById)?.get(exerciseId);
  if (!series) return [];

  // Session dates + best-set volume, grouped with the SAME rules
  // buildExerciseMetricSeries uses (non-warmup working sets), so the arrays
  // line up by index with the series it returns.
  const bySession = new Map();
  for (const s of flatSets) {
    if (!s) continue;
    if ((s.setType ?? s.set_type) === 'warmup') continue;
    const exId = s.exerciseId ?? s.exercise_id;
    if (exId !== exerciseId) continue;
    const weight = Number(s.weight) || 0;
    const reps = Number(s.actualReps ?? s.actual_reps) || 0;
    if (weight <= 0 || reps <= 0) continue;
    const at = Number(s.createdAt ?? s.created_at) || 0;
    const sessionId = s.workoutId ?? s.workout_id ?? `t:${at}`;
    if (!bySession.has(sessionId)) bySession.set(sessionId, { at: 0, topWeight: 0, topReps: 0 });
    const sess = bySession.get(sessionId);
    sess.at = Math.max(sess.at, at);
    if (weight > sess.topWeight) { sess.topWeight = weight; sess.topReps = reps; }
  }
  const ordered = [...bySession.values()].sort((a, b) => a.at - b.at);

  return ordered.map((sess, i) => ({
    date: sess.at,
    e1rm: series.e1rm[i] ?? 0,
    heaviest: series.heaviest[i] ?? 0,
    reps: series.reps[i] ?? 0,
    volume: series.volume[i] ?? 0,
    bestSetVolume: Math.round(sess.topWeight * sess.topReps),
  }));
}

// CP-5 (scorecard): which sessions earned a personal best, for the trend
// chart's PR markers. Reuses `detectPR` — the SAME per-set PR engine
// ActiveWorkoutScreen calls at log time — rather than a second set of PR
// rules; this just replays it over history instead of inventing new logic.
// Working sets are replayed oldest -> newest, each compared against every
// set logged strictly before it (all-time, mirrors ActiveWorkoutScreen's
// prHistory), and grouped into sessions the same way buildDetailMetricPoints
// does. A session counts as a PR session only when detectPR fires AND the
// history it fired against was non-empty; the very first-ever set for an
// exercise always "beats" the empty history (detectPR's baseline
// heaviest_weight entry) but the app already treats that honestly as a
// first-lift acknowledgement, not a personal record (Wave A A1, see
// ActiveWorkoutScreen's `prs.length > 0 && prHistory.length === 0` gate and
// src/lib/__tests__/detectPR.firstLift.test.js) - this mirrors that exact
// gate rather than re-deciding it. Mirrors ActiveWorkoutScreen's
// isWeightReps check too: distance/duration exercises (which reuse the
// weight column for metres/seconds) never produce a marker. Pure and
// exported for unit testing. Returns a Set of session timestamps (the same
// `date` buildDetailMetricPoints assigns each point), so a caller can match
// markers to whichever window is currently shown without re-deriving
// indices per window.
export function derivePRSessionDates(allSessions, exercise, exerciseTypeById) {
  const dates = new Set();
  const exerciseId = exercise?.id;
  if (exerciseId == null) return dates;
  const exerciseType = exerciseTypeById?.get(exerciseId) ?? exercise?.exerciseType ?? 'weight_reps';
  if (exerciseType === 'distance' || exerciseType === 'duration') return dates;

  const workingSets = (allSessions || []).flat().filter(s => (
    s
    && (s.setType ?? s.set_type) !== 'warmup'
    && (s.exerciseId ?? s.exercise_id) === exerciseId
    && (Number(s.weight) || 0) > 0
    && (Number(s.actualReps ?? s.actual_reps) || 0) > 0
  ));
  workingSets.sort((a, b) => (
    (Number(a.createdAt ?? a.created_at) || 0) - (Number(b.createdAt ?? b.created_at) || 0)
  ));

  // Group into sessions (workoutId) purely to report the session's own `at`
  // (max createdAt among its sets), identical to buildDetailMetricPoints, so
  // a marker can be matched to a chart point by date.
  const bySession = new Map();
  for (const s of workingSets) {
    const at = Number(s.createdAt ?? s.created_at) || 0;
    const sessionId = s.workoutId ?? s.workout_id ?? `t:${at}`;
    if (!bySession.has(sessionId)) bySession.set(sessionId, { at: 0, sets: [] });
    const sess = bySession.get(sessionId);
    sess.at = Math.max(sess.at, at);
    sess.sets.push(s);
  }
  const orderedSessions = [...bySession.values()].sort((a, b) => a.at - b.at);

  const history = [];
  for (const sess of orderedSessions) {
    let sessionHasPR = false;
    for (const s of sess.sets) {
      const prs = detectPR(s, history, exercise, 'kg');
      // Same gate as ActiveWorkoutScreen: a hit against empty history is the
      // honest "first lift", not a personal record.
      if (prs.length > 0 && history.length > 0) sessionHasPR = true;
      history.push(s);
    }
    if (sessionHasPR) dates.add(sess.at);
  }
  return dates;
}

// Split form-tip / notes prose into ordered steps for numbered rendering.
// FORM_TIPS entries are 3–4 instruction sentences; rendering them as numbered
// steps (Hevy-style) reads as a how-to rather than a wall of text. Pure and
// exported for testing. Splits on explicit newlines first; otherwise on
// sentence boundaries (". " before a capital / digit), which leaves decimal
// ranges (written with en-dashes, e.g. "30–45°", "2–10") untouched. Returns
// the trimmed steps; a caller showing fewer than 2 should fall back to the
// paragraph, since one "step" is just the original text.
export function splitInstructionSteps(text) {
  if (!text || typeof text !== 'string') return [];
  const trimmed = text.trim();
  if (!trimmed) return [];

  // Explicit line breaks win, already author-segmented.
  const lines = trimmed.split(/\r?\n+/).map(l => l.trim()).filter(Boolean);
  if (lines.length > 1) return lines;

  // Otherwise split into sentences. Keep the terminating punctuation; only
  // break when the next sentence starts with a capital letter or digit, so an
  // abbreviation mid-sentence does not split a step.
  const sentences = trimmed
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map(s => s.trim())
    .filter(Boolean);
  return sentences;
}

export default function ExerciseDetailScreen({ navigation, route }) {
  const { exerciseId } = route.params || {};
  // F7: subscribe to just these fields (a bare useAppStore() re-renders on every store mutation).
  const { user, units } = useAppStore(useShallow(s => ({
    user: s.user,
    units: s.units,
  })));
  const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion);
  // Live-subscribing so a resize (e.g. Android split-screen/freeform) picks
  // up the correct chart width, matching RestTimer.js's useWindowDimensions
  // pattern rather than a frozen module-scope Dimensions.get().
  const { width: windowWidth } = useWindowDimensions();
  // CP-10 batch G (2026-07-11): live theme (src/hooks/useTheme.js).
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  const [exercise, setExercise] = useState(null);
  const [loadingExercise, setLoadingExercise] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [history, setHistory] = useState([]);
  // COMP-019: all sessions (uncapped) feed the windowed chart; history stays
  // the last-8 view for the History list and all-time best below.
  const [allSessions, setAllSessions] = useState([]);
  const [chartWindowKey, setChartWindowKey] = useState(DEFAULT_WINDOW_KEY);
  const [prs, setPRs] = useState([]);
  const [substitutes, setSubstitutes] = useState([]);
  const [plateau, setPlateau] = useState(null);
  // Detail-chart lens. Defaults to 'heaviest' to preserve the historic "Max
  // weight" default; persisted so the choice survives a reopen (mirrors how the
  // window key is persisted). The other lenses recompute from the same sets.
  const [chartMetric, setChartMetric] = useState('heaviest');

  // Goal state
  const [goal, setGoal] = useState(null);
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [goalWeightInput, setGoalWeightInput] = useState('');
  const [goalDateInput, setGoalDateInput] = useState('');
  const [goalSaving, setGoalSaving] = useState(false);
  const [congratsBanner, setCongratusBanner] = useState(false);
  const congratsOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (exerciseId) loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseId]);

  // COMP-019: pick the chart's initial window, persisted choice if it holds
  // enough sessions, else widen to the narrowest window with >=2 (never dead).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let pref = DEFAULT_WINDOW_KEY;
      try { const v = await AsyncStorage.getItem('@volyume_chart_window_e1rm'); if (v) pref = v; } catch (_) {}
      if (cancelled) return;
      const pts = allSessions.map(s => ({ date: s[0]?.createdAt ?? 0 })).filter(p => p.date);
      setChartWindowKey(pickInitialWindowKey(pts, p => p.date, TREND_WINDOWS, pref));
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSessions.length]);

  // Restore the persisted chart lens, if any (mirrors the window-key restore).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const v = await AsyncStorage.getItem('@volyume_chart_metric_detail');
        if (!cancelled && v && CHART_METRICS.some(m => m.key === v)) setChartMetric(v);
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, []);

  async function loadData() {
    setLoadingExercise(true);
    setLoadError(null);
    try {
      const ex = await getExerciseById(exerciseId);
      if (!ex) {
        setExercise(null);
        setLoadError('not_found');
        return;
      }
      setExercise(ex);

      // History, group by workout, last 8 sessions
      const mySets = await getWorkoutSetsForExercise(exerciseId, user.id, 200);

      const byWorkout = {};
      for (const s of mySets) {
        if (!byWorkout[s.workoutId]) byWorkout[s.workoutId] = [];
        byWorkout[s.workoutId].push(s);
      }
      const sessions = Object.values(byWorkout);
      setAllSessions(sessions);
      setHistory(sessions.slice(0, 8));

      // Plateau detection
      const sessionArrays = sessions.map(s => s.sets ?? s); // newest-first already
      const plateauResult = detectPlateau(sessionArrays, ex?.defaultRepMin ?? 6, ex?.defaultRepMax ?? 12);
      setPlateau(plateauResult.plateau ? plateauResult : null);

      // Compute local PRs from working sets
      const workingSets = mySets.filter(
        s => (s.setType ?? s.set_type) !== 'warmup' && (s.weight || 0) > 0 && (s.actualReps || 0) > 0,
      );
      let computedBest1RM = 0;
      if (workingSets.length > 0) {
        const computedPRs = [];
        let best1RMVal = 0, best1RMSet = null, heaviest = null, mostReps = null;
        for (const s of workingSets) {
          const est = calculate1RM(s.weight, s.actualReps);
          if (est > best1RMVal) { best1RMVal = est; best1RMSet = s; }
          if (!heaviest || s.weight > heaviest.weight) heaviest = s;
          if (!mostReps || s.actualReps > mostReps.actualReps) mostReps = s;
        }
        computedBest1RM = best1RMVal;
        if (best1RMSet) computedPRs.push({ id: 'pr_1rm', record_type: '1rm_estimate', value: best1RMVal, reps: best1RMSet.actualReps, achieved_date: best1RMSet.createdAt });
        if (heaviest)   computedPRs.push({ id: 'pr_heavy', record_type: 'heaviest_weight', value: heaviest.weight, reps: heaviest.actualReps, achieved_date: heaviest.createdAt });
        if (mostReps && mostReps !== heaviest) computedPRs.push({ id: 'pr_reps', record_type: 'most_reps', value: mostReps.weight, reps: mostReps.actualReps, achieved_date: mostReps.createdAt });
        setPRs(computedPRs);
      }

      // Load goal and auto-detect achievement
      const loadedGoal = await getExerciseGoal(user.id, exerciseId);
      if (loadedGoal && !loadedGoal.achievedAt && computedBest1RM >= loadedGoal.targetWeight) {
        await markGoalAchieved(loadedGoal.id);
        const updatedGoal = { ...loadedGoal, achievedAt: Date.now() };
        setGoal(updatedGoal);
        showCongratsBanner();
      } else {
        setGoal(loadedGoal);
      }

      // Substitutes, ranked by SFR score and similarity
      const allExercises = await getAllExercises();
      try {
        const swaps = rankSwaps(ex, allExercises, { equipment: [] });
        setSubstitutes(swaps.slice(0, 4));
      } catch (_) {
        // swapEngine unavailable, hide section silently
      }
    } catch (e) {
      logError('ExerciseDetailScreen.loadData', e);
      setExercise(null);
      setLoadError('read_failed');
    } finally {
      setLoadingExercise(false);
    }
  }

  function showCongratsBanner() {
    setCongratusBanner(true);
    if (reduceMotion) {
      congratsOpacity.setValue(1);
      setTimeout(() => {
        congratsOpacity.setValue(0);
        setCongratusBanner(false);
      }, 3500);
      return;
    }
    Animated.sequence([
      Animated.timing(congratsOpacity, { toValue: 1, duration: motion.enter, useNativeDriver: true }),
      Animated.delay(3500),
      Animated.timing(congratsOpacity, { toValue: 0, duration: motion.exit, useNativeDriver: true }),
    ]).start(() => setCongratusBanner(false));
  }

  function openGoalSheet() {
    if (goal) {
      setGoalWeightInput(String(goal.targetWeight));
      setGoalDateInput(
        goal.targetDate
          ? format(new Date(goal.targetDate), 'MMM yyyy')
          : '',
      );
    } else {
      setGoalWeightInput('');
      setGoalDateInput('');
    }
    setGoalModalVisible(true);
  }

  async function handleSaveGoal() {
    const w = parseFloat(goalWeightInput);
    if (!w || w <= 0) return;
    const targetDate = parseLooseDate(goalDateInput);
    setGoalSaving(true);
    try {
      await saveExerciseGoal(user.id, exerciseId, { targetWeight: w, targetDate });
      const updated = await getExerciseGoal(user.id, exerciseId);
      setGoal(updated);
      setGoalModalVisible(false);
    } finally {
      setGoalSaving(false);
    }
  }

  async function handleRemoveGoal() {
    await deleteExerciseGoal(user.id, exerciseId);
    setGoal(null);
    setGoalModalVisible(false);
  }

  if (!exercise && loadError) {
    return (
      <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
        <BackHeader title="Exercise" />
        <View style={styles.loadErrorWrap}>
          <Card padding="xl" style={styles.loadErrorCard} accessibilityRole="alert" accessibilityLabel="Exercise details could not be loaded">
            <View style={[styles.loadErrorIcon, live.loadErrorIcon]}>
              <Ionicons name="alert-circle-outline" size={22} color={t.colors.warning} />
            </View>
            <Text maxFontSizeMultiplier={1.3} style={[styles.loadErrorTitle, live.loadErrorTitle]}>Couldn't load exercise details</Text>
            <Text maxFontSizeMultiplier={1.3} style={[styles.loadErrorText, live.loadErrorText]}>
              Couldn't load this on your device. Try again. Your workout history has not been changed.
            </Text>
            <Button
              title="Try again"
              onPress={loadData}
              loading={loadingExercise}
              disabled={loadingExercise}
              accessibilityLabel="Try loading exercise details again"
              style={styles.loadErrorButton}
            />
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  if (!exercise) {
    // Content-shaped skeletons during the initial DB load, instead of a bare
    // spinner, so it reads as the screen filling in rather than stalling.
    return (
      <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
        <BackHeader title="Exercise" />
        <View style={{ padding: spacing.md, gap: spacing.md }}>
          <SkeletonCard height={120} />
          <SkeletonCard height={180} />
          <SkeletonCard height={92} />
        </View>
      </SafeAreaView>
    );
  }

  const formTip = FORM_TIPS[exercise.name] ?? null;
  const primaryMuscle = MUSCLE_DISPLAY_NAMES[(exercise.primaryMuscle || '').toLowerCase()] || exercise.primaryMuscle;
  const secondaryMuscles = exercise.secondaryMuscles || [];
  const equipmentLabel = equipmentDisplayLabel(exercise);
  const difficultyLabel = difficultyDisplayLabel(exercise);
  const subregionLabel = subregionDisplayLabel(exercise.subregion);
  const coachingCue = exercise.cue || null;

  const allTimeSets = history.flat();
  const best1RM = allTimeSets.reduce((best, s) => {
    const est = calculate1RM(s.weight || 0, s.actualReps || 0);
    return est > best ? est : best;
  }, 0);

  // Goal progress derived values
  const goalProgress = goal && !goal.achievedAt
    ? Math.min(1, best1RM / goal.targetWeight)
    : goal && goal.achievedAt
      ? 1
      : 0;
  const goalKgToGo = goal && !goal.achievedAt
    ? Math.max(0, goal.targetWeight - best1RM)
    : 0;

  // COMP-019: one chart point per session, oldest → newest, each carrying its
  // session date so the window chips slice by date (not by count). Built from
  // ALL sessions; the window controls what's shown. Each point now carries
  // every lens (e1rm / heaviest / total reps / volume / best-set volume) so the
  // metric switcher redraws without reloading. Built via the shared
  // buildExerciseMetricSeries, so a distance/duration exercise yields no points.
  const exerciseTypeById = new Map([[exerciseId, exercise.exerciseType ?? 'weight_reps']]);
  const allChartPoints = buildDetailMetricPoints(allSessions, exerciseId, exerciseTypeById);

  const e1rmDateOf = (p) => p.date;
  const chartWin = windowByKey(TREND_WINDOWS, chartWindowKey) ?? windowByKey(TREND_WINDOWS, DEFAULT_WINDOW_KEY);
  const windowedPoints = filterByWindow(allChartPoints, e1rmDateOf, chartWin.days);
  const chartCoversAll = windowedPoints.length === allChartPoints.length;
  const activeYKey = chartMetric;
  const activeMetricIsWeight = WEIGHT_METRICS.has(chartMetric);

  // CP-5: sessions that earned a personal best, mapped onto the CURRENTLY
  // windowed points so the chart's highlightIndices always match what's on
  // screen (derived from all-time history, independent of the window/metric).
  const prSessionDates = derivePRSessionDates(allSessions, exercise, exerciseTypeById);
  const prHighlightIndices = windowedPoints.reduce((acc, p, i) => {
    if (prSessionDates.has(p.date)) acc.push(i);
    return acc;
  }, []);
  const chartTakeaway = (windowedPoints.length >= 2 && activeMetricIsWeight)
    ? e1rmTakeaway({
        windowKey: chartWindowKey, coversAll: chartCoversAll, points: windowedPoints,
        dateOf: e1rmDateOf, values: windowedPoints.map(p => p[activeYKey]), unit: units,
      })
    : '';

  function selectChartWindow(key) {
    setChartWindowKey(key);
    AsyncStorage.setItem('@volyume_chart_window_e1rm', key).catch(() => {});
    try { track(user?.id, 'chart_window_changed', { chart_id: 'e1rm', window: key })?.catch?.(() => {}); } catch (_) {}
  }

  function selectChartMetric(key) {
    setChartMetric(key);
    AsyncStorage.setItem('@volyume_chart_metric_detail', key).catch(() => {});
    try { track(user?.id, 'chart_metric_changed', { chart_id: 'exercise_detail', metric: key })?.catch?.(() => {}); } catch (_) {}
  }

  return (
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
      <BackHeader title={exercise.name} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Overview */}
        <AnimatedEntrance index={0}>
        <Card style={styles.overviewCard}>
          <View style={styles.tags}>
            <View style={[styles.tag, live.tag]}><Text maxFontSizeMultiplier={1.3} style={[styles.tagText, live.tagText]}>{primaryMuscle}</Text></View>
            {subregionLabel && (
              <View style={[styles.tag, live.tag, styles.tagSecondary, live.tagSecondary]}>
                <Text maxFontSizeMultiplier={1.3} style={[styles.tagText, live.tagText, styles.tagTextSecondary, live.tagTextSecondary]}>{subregionLabel}</Text>
              </View>
            )}
            {equipmentLabel && (
              <View style={[styles.tag, live.tag, styles.tagSecondary, live.tagSecondary]}>
                <Text maxFontSizeMultiplier={1.3} style={[styles.tagText, live.tagText, styles.tagTextSecondary, live.tagTextSecondary]}>{equipmentLabel}</Text>
              </View>
            )}
            {exercise.compoundIsolation && (
              <View style={[styles.tag, live.tag, styles.tagSecondary, live.tagSecondary]}>
                <Text maxFontSizeMultiplier={1.3} style={[styles.tagText, live.tagText, styles.tagTextSecondary, live.tagTextSecondary]}>
                  {exercise.compoundIsolation.charAt(0).toUpperCase() + exercise.compoundIsolation.slice(1)}
                </Text>
              </View>
            )}
            {difficultyLabel && (
              <View style={[styles.tag, live.tag, styles.tagSecondary, live.tagSecondary]}>
                <Text maxFontSizeMultiplier={1.3} style={[styles.tagText, live.tagText, styles.tagTextSecondary, live.tagTextSecondary]}>{difficultyLabel}</Text>
              </View>
            )}
          </View>

          {secondaryMuscles.length > 0 && (
            <View style={styles.secMuscles}>
              <Text maxFontSizeMultiplier={1.3} style={[styles.secMuscleLabel, live.secMuscleLabel]}>Also works</Text>
              {secondaryMuscles.map((m, i) => {
                const key = m.muscle || m;
                const label = MUSCLE_DISPLAY_NAMES[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
                return (
                  <View key={i} style={[styles.tag, live.tag, styles.tagSecondary, live.tagSecondary]}>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.tagText, live.tagText, styles.tagTextSecondary, live.tagTextSecondary]}>{label}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {best1RM > 0 && (
            <View style={[styles.est1RM, live.est1RM]}>
              <Ionicons name="trophy-outline" size={16} color={t.colors.gold} />
              <Text maxFontSizeMultiplier={1.3} style={[styles.est1RMText, live.est1RMText]}>Estimated max: {best1RM.toFixed(1)} {units}</Text>
              <InfoTooltip text="Your estimated max lift: the most weight you could lift for a single rep, calculated from the sets you've logged. It updates automatically as you get stronger." size={12} />
            </View>
          )}

          <View style={[styles.sfrRow, live.sfrRow]}>
            <View style={styles.sfrItem}>
              <Text maxFontSizeMultiplier={1.3} style={[styles.sfrValue, live.sfrValue]}>{exercise.stimulusToFatigueRatio || 3}/5</Text>
              <View style={styles.sfrLabelRow}>
                <Text maxFontSizeMultiplier={1.3} style={[styles.sfrLabel, live.sfrLabel]}>Quality</Text>
                <InfoTooltip text="Effort rating: how much growth this exercise produces relative to how tiring it is overall. 5/5 = great return for the fatigue cost. 3/5 = moderate. 1/5 = very demanding for what you get back." size={11} />
              </View>
            </View>
            <View style={[styles.sfrDivider, live.sfrDivider]} />
            <View style={styles.sfrItem}>
              <Text maxFontSizeMultiplier={1.3} style={[styles.sfrValue, live.sfrValue]}>{exercise.fatigueCost || 3}/5</Text>
              <View style={styles.sfrLabelRow}>
                <Text maxFontSizeMultiplier={1.3} style={[styles.sfrLabel, live.sfrLabel]}>Fatigue</Text>
                <InfoTooltip text="How much systemic fatigue this exercise creates. 5/5 = very demanding (deadlift). 1/5 = minimal fatigue. High-fatigue exercises need more recovery between sessions." size={11} />
              </View>
            </View>
            <View style={[styles.sfrDivider, live.sfrDivider]} />
            <View style={styles.sfrItem}>
              <Text maxFontSizeMultiplier={1.3} style={[styles.sfrValue, live.sfrValue]}>{exercise.defaultRepMin || 6}-{exercise.defaultRepMax || 12}</Text>
              <Text maxFontSizeMultiplier={1.3} style={[styles.sfrLabel, live.sfrLabel]}>Rep range</Text>
            </View>
          </View>
        </Card>
        </AnimatedEntrance>

        {/* Personal Record highlight card */}
        {prs.length > 0 && (() => {
          const pr1rm   = prs.find(p => p.record_type === '1rm_estimate');
          const prHeavy = prs.find(p => p.record_type === 'heaviest_weight');
          const prReps  = prs.find(p => p.record_type === 'most_reps');
          const displayPR = pr1rm || prHeavy;
          if (!displayPR) return null;
          return (
            <Card tone="primary" style={styles.prHighlightCard}>
              <View style={styles.prHighlightHeader}>
                <Ionicons name="trophy" size={18} color={t.colors.primary} />
                <SectionLabel tone="muted">Personal bests</SectionLabel>
              </View>
              <View style={styles.prHighlightRow}>
                {displayPR && (
                  <View style={styles.prHighlightStat}>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.prHighlightStatValue, live.prHighlightStatValue]}>
                      {parseFloat(displayPR.value).toFixed(1)}{units}
                    </Text>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.prHighlightStatLabel, live.prHighlightStatLabel]}>
                      {displayPR.record_type === '1rm_estimate' ? 'Est. max' : 'Heaviest set'}
                    </Text>
                  </View>
                )}
                {prHeavy && displayPR !== prHeavy && (
                  <View style={[styles.prHighlightStat, styles.prHighlightStatBordered, live.prHighlightStatBordered]}>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.prHighlightStatValue, live.prHighlightStatValue]}>
                      {prHeavy.value}{units} x {prHeavy.reps}
                    </Text>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.prHighlightStatLabel, live.prHighlightStatLabel]}>Best set</Text>
                  </View>
                )}
                {prReps && (
                  <View style={[styles.prHighlightStat, styles.prHighlightStatBordered, live.prHighlightStatBordered]}>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.prHighlightStatValue, live.prHighlightStatValue]}>
                      {prReps.value}{units} x {prReps.reps}
                    </Text>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.prHighlightStatLabel, live.prHighlightStatLabel]}>Most reps</Text>
                  </View>
                )}
              </View>
              <Text maxFontSizeMultiplier={1.3} style={[styles.prHighlightDate, live.prHighlightDate]}>
                Achieved {format(new Date(displayPR.achieved_date), 'MMM d yyyy')}
              </Text>
            </Card>
          );
        })()}

        {/* Congratulatory banner, shown briefly when goal is auto-detected as achieved */}
        {congratsBanner && (
          <Animated.View style={[styles.congratsBanner, live.congratsBanner, { opacity: congratsOpacity }]}>
            <Ionicons name="checkmark-circle" size={18} color={t.colors.primary} />
            <Text maxFontSizeMultiplier={1.3} style={[styles.congratsText, live.congratsText]}>You've hit your target. Set a new one.</Text>
          </Animated.View>
        )}

        {/* Goal section */}
        {!goal && (
          <Button
            title="Set a target weight"
            icon="flag-outline"
            variant="outline"
            size="sm"
            fullWidth={false}
            onPress={openGoalSheet}
            style={styles.goalSetLink}
            accessibilityLabel="Set a target weight"
          />
        )}

        {goal && (
          <Card style={styles.goalCard}>
            <View style={styles.goalCardHeader}>
              <View style={styles.goalCardLeft}>
                <Ionicons name="flag" size={14} color={t.colors.primary} />
                <SectionLabel tone="muted">Target</SectionLabel>
              </View>
              <TouchableOpacity onPress={openGoalSheet} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Edit target">
                <Ionicons name="pencil-outline" size={14} color={t.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.goalWeightRow}>
              <View style={styles.goalWeightItem}>
                <Text maxFontSizeMultiplier={1.3} style={[styles.goalWeightValue, live.goalWeightValue]}>{best1RM > 0 ? best1RM.toFixed(1) : '-'}{best1RM > 0 ? units : ''}</Text>
                <Text maxFontSizeMultiplier={1.3} style={[styles.goalWeightLabel, live.goalWeightLabel]}>Current est. max</Text>
              </View>
              <Ionicons name="arrow-forward" size={14} color={t.colors.textMuted} />
              <View style={styles.goalWeightItem}>
                <Text maxFontSizeMultiplier={1.3} style={[styles.goalWeightValue, live.goalWeightValue, { color: t.colors.primary }]}>
                  {goal.targetWeight}{units}
                </Text>
                <Text maxFontSizeMultiplier={1.3} style={[styles.goalWeightLabel, live.goalWeightLabel]}>
                  Target{goal.targetDate ? ` - by ${format(new Date(goal.targetDate), 'MMM yyyy')}` : ''}
                </Text>
              </View>
            </View>

            <View style={[styles.goalBarTrack, live.goalBarTrack]}>
              <View style={[styles.goalBarFill, live.goalBarFill, { width: `${Math.round(goalProgress * 100)}%` }]} />
            </View>

            <Text maxFontSizeMultiplier={1.3} style={[
              styles.goalBarCaption,
              live.goalBarCaption,
              goalProgress >= 1 && { color: t.colors.primary },
            ]}>
              {goalProgress >= 1
                ? 'Goal reached.'
                : `${goalKgToGo.toFixed(1)}${units} to go`}
            </Text>
          </Card>
        )}

        {plateau && (
          <View style={[styles.plateauBanner, live.plateauBanner]}>
            <Ionicons name="analytics-outline" size={18} color={t.colors.warning} />
            <View style={{ flex: 1 }}>
              <Text maxFontSizeMultiplier={1.3} style={[styles.plateauTitle, live.plateauTitle]}>Progress has stalled</Text>
              <Text maxFontSizeMultiplier={1.3} style={[styles.plateauBody, live.plateauBody]}>{plateau.message}</Text>
            </View>
          </View>
        )}

        {/* Strength trend chart */}
        {allChartPoints.length >= 2 && (
          <View style={styles.chartSection}>
            <Text maxFontSizeMultiplier={1.3} style={[styles.chartLabel, live.chartLabel]}>Strength trend</Text>
            <WindowChips windows={TREND_WINDOWS} selectedKey={chartWindowKey} onSelect={selectChartWindow}
              accessibilityPrefix="strength trend window" />
            {!!chartTakeaway && <Text maxFontSizeMultiplier={1.3} style={[styles.chartTakeaway, live.chartTakeaway]}>{chartTakeaway}</Text>}
            <View style={styles.chartToggle}>
              {CHART_METRICS.map(m => (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.chartToggleBtn, live.chartToggleBtn, chartMetric === m.key && [styles.chartToggleBtnActive, live.chartToggleBtnActive]]}
                  onPress={() => selectChartMetric(m.key)}
                  accessibilityRole="button"
                  accessibilityLabel={m.label}
                  accessibilityState={{ selected: chartMetric === m.key }}
                >
                  <Text maxFontSizeMultiplier={1.3} style={[styles.chartToggleBtnText, live.chartToggleBtnText, chartMetric === m.key && [styles.chartToggleBtnTextActive, live.chartToggleBtnTextActive]]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {windowedPoints.length >= 2 ? (
              <View style={[styles.chartContainer, live.chartContainer]}>
                <VolyumeChart
                  data={windowedPoints.map(d => ({ value: d[activeYKey] }))}
                  width={windowWidth - spacing.lg * 2 - spacing.md * 2}
                  height={96}
                  color={t.colors.primary}
                  thickness={2}
                  area
                  areaTopColor={t.colors.chartFill}
                  areaBottomColor={t.colors.chartFill}
                  curved
                  interactive
                  highlightIndices={prHighlightIndices}
                  accessibilityLabel={`${CHART_METRICS.find(m => m.key === chartMetric)?.label ?? 'Strength'} trend chart`}
                  formatTooltip={(i) => {
                    const p = windowedPoints[i];
                    if (!p) return null;
                    return {
                      title: activeMetricIsWeight
                        ? `${Math.round(p[activeYKey])} ${units}`
                        : `${Math.round(p[activeYKey])}`,
                      sub: p.date ? format(new Date(p.date), 'MMM d') : '',
                    };
                  }}
                />
              </View>
            ) : (
              <Text maxFontSizeMultiplier={1.3} style={[styles.chartEmptyHint, live.chartEmptyHint]}>Not enough data in this window yet.</Text>
            )}
            {chartMetric === 'e1rm' && (
              <Text maxFontSizeMultiplier={1.3} style={[styles.e1rmNote, live.e1rmNote]}>
                Estimated from top set using the Epley formula. Best for rep ranges 2 to 10.
              </Text>
            )}
          </View>
        )}

        {/* History */}
        {history.length > 0 && (
          <View style={styles.section}>
            <SectionLabel>History (last {history.length} sessions)</SectionLabel>
            {history.map((sessionSets, i) => {
              const firstSet = sessionSets[0];
              const date = new Date(firstSet.createdAt);
              const sessionEst1RM = Math.max(...sessionSets.map(s => calculate1RM(s.weight || 0, s.actualReps || 0)));
              return (
                <Card radius="md" style={styles.historyCard} key={i}>
                  <Text maxFontSizeMultiplier={1.3} style={[styles.historyDate, live.historyDate]}>{format(date, 'MMM d')}</Text>
                  <View style={styles.historySets}>
                    {sessionSets.map((s, j) => (
                      <Text maxFontSizeMultiplier={1.3} key={j} style={[styles.historySetText, live.historySetText]}>
                        {s.weight}{units} x {s.actualReps}
                        {s.set_type === 'warmup' || s.setType === 'warmup' ? ' - Warm-up' : ''}
                        {s.set_type === 'dropset' || s.setType === 'dropset' ? ' - Drop Set' : ''}
                      </Text>
                    ))}
                  </View>
                  {sessionEst1RM > 0 && (
                    <Text maxFontSizeMultiplier={1.3} style={[styles.historyEst, live.historyEst]}>Est. max: ~{sessionEst1RM.toFixed(0)}{units}</Text>
                  )}
                </Card>
              );
            })}
          </View>
        )}

        {/* History empty state */}
        {history.length === 0 && exercise && (
          <Card radius="md" style={styles.historyEmpty}>
            <Ionicons name="time-outline" size={20} color={t.colors.textMuted} />
            <Text maxFontSizeMultiplier={1.3} style={[styles.historyEmptyText, live.historyEmptyText]}>
              You haven't logged this exercise yet. Add it to a session to start tracking your progress.
            </Text>
            <Button
              title="Start workout"
              variant="tertiary"
              size="sm"
              fullWidth={false}
              onPress={() => navigateCrossTab(navigation, 'HomeTab', 'BuildWorkout')}
              accessibilityLabel="Start a workout"
            />
          </Card>
        )}

        {/* PRs */}
        {prs.length > 0 && (
          <View style={styles.section}>
            <SectionLabel>All-time bests</SectionLabel>
            {prs.slice(0, 5).map((pr) => (
              <Card radius="md" style={styles.prRow} key={pr.id}>
                <Ionicons
                  name={pr.record_type === '1rm_estimate' ? 'trophy-outline' :
                   pr.record_type === 'heaviest_weight' ? 'barbell-outline' : 'repeat-outline'}
                  size={22}
                  color={t.colors.gold}
                />
                <View style={styles.prInfo}>
                  <Text maxFontSizeMultiplier={1.3} style={[styles.prLabel, live.prLabel]}>
                    {pr.record_type === '1rm_estimate' ? 'Estimated max' :
                     pr.record_type === 'heaviest_weight' ? 'Heaviest weight' : 'Most reps'}
                  </Text>
                  <Text maxFontSizeMultiplier={1.3} style={[styles.prValue, live.prValue]}>
                    {pr.record_type === '1rm_estimate' ? `${parseFloat(pr.value).toFixed(1)}${units}` :
                     `${pr.value}${units} x ${pr.reps} reps`}
                  </Text>
                </View>
                <Text maxFontSizeMultiplier={1.3} style={[styles.prDate, live.prDate]}>{format(new Date(pr.achieved_date), 'MMM d yyyy')}</Text>
              </Card>
            ))}
          </View>
        )}

        {/* Similar exercises, horizontal scroll of small cards */}
        {substitutes.length > 0 && (
          <View style={styles.section}>
            <SectionLabel>Similar exercises</SectionLabel>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.subScrollContent}
            >
              {substitutes.map(({ exercise: sub }) => {
                const subPrimary = MUSCLE_DISPLAY_NAMES[(sub.primaryMuscle || '').toLowerCase()] || sub.primaryMuscle;
                return (
                  <Card
                    key={sub.id}
                    // Origin-aware hero zoom (D31): pushing to the substitute's
                    // own detail grows it from this small card's measured rect;
                    // a null rect falls back to the app's centre zoom.
                    onPressWithLayout={(rect) => navigation.push('ExerciseDetail', { exerciseId: sub.id, exerciseName: sub.name, __heroOrigin: rect || undefined })}
                    surface="surface2"
                    radius="md"
                    padding="md"
                    style={styles.subCard}
                    accessibilityLabel={`View ${sub.name}`}
                  >
                    <Text maxFontSizeMultiplier={1.3} style={[styles.subCardName, live.subCardName]} numberOfLines={2}>{sub.name}</Text>
                    <View style={styles.subCardFooter}>
                      {sub.equipment ? (
                        <Ionicons name="barbell-outline" size={11} color={t.colors.textMuted} />
                      ) : null}
                      <Text maxFontSizeMultiplier={1.3} style={[styles.subCardEquipment, live.subCardEquipment]} numberOfLines={1}>
                        {sub.equipment || subPrimary || ''}
                      </Text>
                    </View>
                  </Card>
                );
              })}
            </ScrollView>
          </View>
        )}

        {coachingCue && (
          <View style={styles.section}>
            <View style={[styles.cueCard, live.cueCard]}>
              <Ionicons name="bulb-outline" size={16} color={t.colors.primary} />
              <Text maxFontSizeMultiplier={1.3} style={[styles.cueText, live.cueText]}>{coachingCue}</Text>
            </View>
          </View>
        )}

        {(formTip || exercise.notes) && (() => {
          const instructionText = formTip ?? exercise.notes;
          const steps = splitInstructionSteps(instructionText);
          return (
            <View style={styles.section}>
              <SectionLabel>How to do it</SectionLabel>
              <Card radius="md" style={styles.notesCard}>
                {steps.length >= 2 ? (
                  steps.map((step, i) => (
                    <View key={i} style={[styles.stepRow, i > 0 && styles.stepRowSpaced]}>
                      <View style={[styles.stepNumber, live.stepNumber]}>
                        <Text maxFontSizeMultiplier={1.3} style={[styles.stepNumberText, live.stepNumberText]}>{i + 1}</Text>
                      </View>
                      <Text maxFontSizeMultiplier={1.3} style={[styles.stepText, live.stepText]}>{step}</Text>
                    </View>
                  ))
                ) : (
                  <Text maxFontSizeMultiplier={1.3} style={[styles.notesText, live.notesText]}>{instructionText}</Text>
                )}
              </Card>
            </View>
          );
        })()}
      </ScrollView>

      {/* Goal-setting bottom sheet.
          D36a (item 17 modal tails, 2026-07-10): migrated off a hand-rolled
          Modal onto the shared BottomSheet chrome, same choice as item 4
          (RoutineDetail's edit-exercise modal) rather than a bare inset
          patch -- this modal is the same content class (bottom-anchored
          form, several TextFields), so the same product-consistency and
          gesture-dismiss gains apply, and it fixes the genuine inset bug
          (modalSheet had no safe-area padding) in the same motion.
          `keyboardAvoiding` replaces the KeyboardAvoidingView wrapper;
          BottomSheet's own keyboardBehavior handles the lift and TextField
          already swaps to BottomSheetTextInput inside a sheet. */}
      <BottomSheet
        visible={goalModalVisible}
        onClose={() => setGoalModalVisible(false)}
        keyboardAvoiding
        accessibilityLabel={goal ? 'Edit target' : 'Set a target weight'}
      >
            <Text maxFontSizeMultiplier={1.3} style={[styles.modalTitle, live.modalTitle]}>{goal ? 'Edit target' : 'Set a target weight'}</Text>
            <Text maxFontSizeMultiplier={1.3} style={[styles.modalSubtitle, live.modalSubtitle]}>
              Based on your estimated max. Progress will be shown each time you open this exercise.
            </Text>

            <TextField
              label={`Target weight (${units})`}
              fieldStyle={styles.weightField}
              inputStyle={[styles.weightInput, live.weightInput]}
              value={goalWeightInput}
              onChangeText={setGoalWeightInput}
              keyboardType="decimal-pad"
              placeholder={`e.g. 100`}
              placeholderTextColor={t.colors.textMuted}
              returnKeyType="done"
              accessibilityLabel={`Target weight in ${units}`}
            />

            <TextField
              label="Target date (optional)"
              fieldStyle={styles.dateField}
              inputStyle={[styles.dateInput, live.dateInput]}
              value={goalDateInput}
              onChangeText={setGoalDateInput}
              placeholder="e.g. Dec 2025"
              placeholderTextColor={t.colors.textMuted}
              returnKeyType="done"
              autoCapitalize="words"
              accessibilityLabel="Target date, optional"
            />

            <Button
              title="Save goal"
              style={styles.saveGoalBtn}
              textStyle={[styles.saveGoalBtnText, live.saveGoalBtnText]}
              onPress={handleSaveGoal}
              disabled={goalSaving || !goalWeightInput}
              loading={goalSaving}
              accessibilityLabel="Save goal"
              accessibilityState={{ disabled: goalSaving || !goalWeightInput }}
            />

            {goal && (
              <Button
                title="Remove goal"
                icon="trash-outline"
                variant="outline"
                size="sm"
                fullWidth={false}
                onPress={handleRemoveGoal}
                style={styles.removeGoalLink}
                accessibilityLabel="Remove goal"
              />
            )}
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl },
  overviewCard: {
    gap: spacing.md,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tag: {
    backgroundColor: colors.primaryBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  tagText: { ...type.label, color: colors.primary },
  tagSecondary: { backgroundColor: colors.surface2 },
  tagTextSecondary: { color: colors.textSecondary },
  secMuscles: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
  secMuscleLabel: { ...type.label, color: colors.textMuted },
  est1RM: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: withAlpha(colors.gold, 0.082),
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  est1RMText: { ...type.bodyStrong, color: colors.gold },
  sfrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sfrItem: { flex: 1, alignItems: 'center', gap: spacing.xxs },
  sfrValue: { ...type.num('title'), color: colors.textPrimary },
  sfrLabel: { ...type.caption, color: colors.textMuted },
  sfrLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  sfrDivider: { width: 1, height: 36, backgroundColor: colors.border },
  chartSection: { gap: spacing.sm },
  chartTakeaway: { ...type.bodySm, color: colors.textSecondary },
  chartEmptyHint: { ...type.caption, color: colors.textMuted, fontStyle: 'italic', paddingVertical: spacing.md },
  chartLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
  },
  chartToggle: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, alignSelf: 'flex-start' },
  loadErrorWrap: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
  loadErrorCard: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadErrorIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(colors.warning, 0.12),
    marginBottom: spacing.xs,
  },
  loadErrorTitle: { ...type.title, color: colors.textPrimary, textAlign: 'center' },
  loadErrorText: { ...type.bodySm, color: colors.textSecondary, textAlign: 'center' },
  loadErrorButton: { marginTop: spacing.md, alignSelf: 'stretch' },
  chartToggleBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chartToggleBtnActive: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
  chartToggleBtnText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium },
  chartToggleBtnTextActive: { color: colors.primary },
  e1rmNote: { ...type.caption, color: colors.textMuted, marginTop: spacing.xs, fontStyle: 'italic' },
  chartContainer: {
    height: 120,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  historyEmpty: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md,
  },
  historyEmptyText: {
    ...type.bodySm,
    flex: 1,
    minWidth: 180,
    color: colors.textMuted,
  },
  section: { gap: spacing.md },
  historyCard: {
    gap: spacing.sm,
  },
  historyDate: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textPrimary },
  historySets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  historySetText: { fontSize: fontSize.sm, color: colors.textSecondary },
  historyEst: { ...type.num('caption'), color: colors.textMuted },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  prInfo: { flex: 1 },
  prLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  prValue: { ...type.num('bodyStrong'), color: colors.textPrimary },
  prDate: { ...type.num('caption'), color: colors.textMuted },
  // Similar exercises, horizontal scroll cards
  subScrollContent: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  subCard: {
    width: 140,
    height: 72,
    justifyContent: 'space-between',
  },
  subCardName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    lineHeight: 17,
  },
  subCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  subCardEquipment: {
    ...type.caption,
    color: colors.textMuted,
    flex: 1,
  },
  // PR highlight card
  prHighlightCard: {
    gap: spacing.sm,
  },
  prHighlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  prHighlightRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  prHighlightStat: {
    flex: 1,
    gap: spacing.xxs,
  },
  prHighlightStatBordered: {
    paddingLeft: spacing.md,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  prHighlightStatValue: {
    ...type.num('title'),
    color: colors.primary,
  },
  prHighlightStatLabel: {
    ...type.caption,
    color: colors.textMuted,
  },
  prHighlightDate: {
    ...type.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  notesCard: {},
  notesText: { ...type.bodySm, color: colors.textSecondary },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  stepRowSpaced: { marginTop: spacing.md },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.hair,
  },
  stepNumberText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.primary },
  stepText: { ...type.bodySm, flex: 1, color: colors.textSecondary },
  cueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryBg,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: withAlpha(colors.primary, 0.314),
  },
  cueText: { ...type.bodySm, flex: 1, color: colors.textPrimary },
  plateauBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.warningBg,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  plateauTitle: {
    ...type.label,
    color: colors.warning,
    marginBottom: spacing.xxs,
  },
  plateauBody: {
    ...type.bodySm,
    color: colors.textSecondary,
  },
  // Goal section
  goalSetLink: {
    alignSelf: 'flex-start',
  },
  goalCard: {
    gap: spacing.sm,
  },
  goalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goalCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  goalWeightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  goalWeightItem: {
    flex: 1,
    gap: spacing.xxs,
  },
  goalWeightValue: {
    ...type.num('title'),
    color: colors.textPrimary,
  },
  goalWeightLabel: {
    ...type.caption,
    color: colors.textMuted,
  },
  goalBarTrack: {
    height: 6,
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  goalBarFill: {
    height: 6,
    backgroundColor: colors.primaryFill,
    borderRadius: radius.sm,
  },
  goalBarCaption: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  // Congrats banner
  congratsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryBg,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: withAlpha(colors.primary, 0.251),
  },
  congratsText: {
    ...type.label,
    flex: 1,
    color: colors.primary,
  },
  // Goal modal. BottomSheet supplies the backdrop, panel chrome and drag
  // handle now (D36a migration) -- only the content-level styles remain.
  modalTitle: {
    ...type.title,
    color: colors.textPrimary,
  },
  modalSubtitle: {
    ...type.bodySm,
    color: colors.textMuted,
  },
  weightField: {
    borderRadius: radius.md,
  },
  weightInput: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  dateField: {
    borderRadius: radius.md,
  },
  dateInput: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
  },
  saveGoalBtn: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  saveGoalBtnText: {
    ...type.bodyStrong,
    color: colors.onPrimary,
  },
  removeGoalLink: {
    alignSelf: 'center',
  },
});

// CP-10 batch G (2026-07-11): the frozen `styles` block above stays byte-
// identical. This mirrors ONLY the colour/fontSize/type-bearing sub-
// properties of the matching frozen style, at identical rest values, so the
// screen carries no static island under a live theme toggle. Pure layout
// keys (flex/gap/padding/width/height/overflow/borderWidth, no token) are
// correctly omitted -- there is nothing to unfreeze for them. Same pattern
// as AddCustomFoodScreen.js's buildLiveStyles (batch D).
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    tag: { backgroundColor: t.colors.primaryBg },
    tagText: { ...t.type.label, color: t.colors.primary },
    tagSecondary: { backgroundColor: t.colors.surface2 },
    tagTextSecondary: { color: t.colors.textSecondary },
    secMuscleLabel: { ...t.type.label, color: t.colors.textMuted },
    est1RM: { backgroundColor: withAlpha(t.colors.gold, 0.082) },
    est1RMText: { ...t.type.bodyStrong, color: t.colors.gold },
    sfrRow: { borderTopColor: t.colors.border },
    sfrValue: { ...t.type.num('title'), color: t.colors.textPrimary },
    sfrLabel: { ...t.type.caption, color: t.colors.textMuted },
    sfrDivider: { backgroundColor: t.colors.border },
    chartTakeaway: { ...t.type.bodySm, color: t.colors.textSecondary },
    chartEmptyHint: { ...t.type.caption, color: t.colors.textMuted },
    chartLabel: { fontSize: t.fontSize.xs, color: t.colors.textMuted },
    loadErrorIcon: { backgroundColor: withAlpha(t.colors.warning, 0.12) },
    loadErrorTitle: { ...t.type.title, color: t.colors.textPrimary },
    loadErrorText: { ...t.type.bodySm, color: t.colors.textSecondary },
    chartToggleBtn: { backgroundColor: t.colors.surface2, borderColor: t.colors.border },
    chartToggleBtnActive: { backgroundColor: t.colors.primaryBg, borderColor: t.colors.primary },
    chartToggleBtnText: { fontSize: t.fontSize.xs, color: t.colors.textSecondary },
    chartToggleBtnTextActive: { color: t.colors.primary },
    e1rmNote: { ...t.type.caption, color: t.colors.textMuted },
    chartContainer: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    historyEmptyText: { ...t.type.bodySm, color: t.colors.textMuted },
    historyDate: { fontSize: t.fontSize.sm, color: t.colors.textPrimary },
    historySetText: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
    historyEst: { ...t.type.num('caption'), color: t.colors.textMuted },
    prLabel: { fontSize: t.fontSize.sm, color: t.colors.textMuted },
    prValue: { ...t.type.num('bodyStrong'), color: t.colors.textPrimary },
    prDate: { ...t.type.num('caption'), color: t.colors.textMuted },
    subCardName: { fontSize: t.fontSize.sm, color: t.colors.textPrimary },
    subCardEquipment: { ...t.type.caption, color: t.colors.textMuted },
    prHighlightStatBordered: { borderLeftColor: t.colors.border },
    prHighlightStatValue: { ...t.type.num('title'), color: t.colors.primary },
    prHighlightStatLabel: { ...t.type.caption, color: t.colors.textMuted },
    prHighlightDate: { ...t.type.caption, color: t.colors.textMuted },
    notesText: { ...t.type.bodySm, color: t.colors.textSecondary },
    stepNumber: { backgroundColor: t.colors.primaryBg },
    stepNumberText: { fontSize: t.fontSize.xs, color: t.colors.primary },
    stepText: { ...t.type.bodySm, color: t.colors.textSecondary },
    cueCard: { backgroundColor: t.colors.primaryBg, borderColor: withAlpha(t.colors.primary, 0.314) },
    cueText: { ...t.type.bodySm, color: t.colors.textPrimary },
    plateauBanner: { backgroundColor: t.colors.warningBg, borderLeftColor: t.colors.warning },
    plateauTitle: { ...t.type.label, color: t.colors.warning },
    plateauBody: { ...t.type.bodySm, color: t.colors.textSecondary },
    goalWeightValue: { ...t.type.num('title'), color: t.colors.textPrimary },
    goalWeightLabel: { ...t.type.caption, color: t.colors.textMuted },
    goalBarTrack: { backgroundColor: t.colors.surface2 },
    goalBarFill: { backgroundColor: t.colors.primaryFill },
    goalBarCaption: { fontSize: t.fontSize.xs, color: t.colors.textMuted },
    congratsBanner: { backgroundColor: t.colors.primaryBg, borderColor: withAlpha(t.colors.primary, 0.251) },
    congratsText: { ...t.type.label, color: t.colors.primary },
    modalTitle: { ...t.type.title, color: t.colors.textPrimary },
    modalSubtitle: { ...t.type.bodySm, color: t.colors.textMuted },
    weightInput: { fontSize: t.fontSize.xxl },
    dateInput: { fontSize: t.fontSize.md },
    saveGoalBtnText: { ...t.type.bodyStrong, color: t.colors.onPrimary },
  };
}
