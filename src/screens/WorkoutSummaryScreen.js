import React, { useState, useEffect, useRef } from 'react';
import { appAlert } from '../components/AppAlert';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius, type, volumeStatusColor, withAlpha } from '../styles/theme';
import InfoTooltip from '../components/InfoTooltip';
import { useFeedback } from '../components/FeedbackSheet';
import { shouldPrompt } from '../lib/feedback';
import {
  getCompletedWorkoutSets, getAllExercises, getAllWorkouts, updateWorkout,
  getActivePlan, getRoutinesForPlan, advancePlanNextWorkout,
  createAdaptationEvent, getCurrentMesocycleWeek,
  saveWeeklyCheckin, saveNextTimeNote, getRoutineWorkoutTonnages,
  getRoutineById,
} from '../lib/database';
import { calculateWeeklyVolume, getVolumeStatus, MUSCLE_DISPLAY_NAMES, runAdaptiveEngine, VOLUME_LANDMARKS } from '../lib/algorithms';
import useAppStore from '../store/useAppStore';
import { useToast } from '../components/Toast';
import { syncWorkout } from '../lib/sync';
import { incrementSessionCount, shouldPromptReview, requestReview } from '../lib/storeReview';
import { workoutDayMs } from '../lib/workoutDate';
import { localWeekStartMs } from '../lib/dayKey';

const RATING_LABELS = {
  sessionDifficulty: ['', 'Very Easy', 'Easy', 'Moderate', 'Hard', 'Brutal'],
  overallPump: ['', 'None', 'Mild', 'Good'],
  soreness24hBefore: ['', 'Fresh', 'Mild', 'Sore'],
  fatigueLevel: ['', 'Fresh', 'Mild', 'Moderate', 'High', 'Exhausted'],
  jointDiscomfort: ['None', 'Slight', 'Moderate', 'Significant'],
  energyScore: ['', 'Low', 'Fair', 'Moderate', 'Good', 'High'],
  sleepQuality: ['', 'Poor', 'Fair', 'OK', 'Good', 'Excellent'],
};

function RatingRow({ label, field, value, max, onChange }) {
  const labels = RATING_LABELS[field];
  return (
    <View style={styles.ratingRow}>
      <View style={styles.ratingLabelRow}>
        <Text style={styles.ratingLabel}>{label}</Text>
        {labels?.[value] ? <Text style={styles.ratingValueLabel}>{labels[value]}</Text> : null}
      </View>
      <View style={styles.ratingBtns} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {Array.from({ length: max + 1 }, (_, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.ratingBtn, value === i && styles.ratingBtnActive]}
            onPress={() => onChange(i)}
            accessibilityRole="radio"
            accessibilityState={{ selected: value === i }}
            accessibilityLabel={labels?.[i] ? `${i}, ${labels[i]}` : String(i)}
          >
            <Text style={[styles.ratingBtnText, value === i && styles.ratingBtnTextActive]}>
              {i}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function WorkoutSummaryScreen({ navigation, route }) {
  const {
    workoutId, durationMinutes, exerciseCount, setCount, workingSetCount, tonnage,
    exerciseNames = [], readOnly = false,
    routineId = null, detectedPRs = [], exerciseData = [],
    startedAt = null, endedAt = null,
  } = route.params || {};
  const { user, units, userProfile, session } = useAppStore();
  const toast = useToast();
  // Renamed to feedbackSheet to avoid clashing with the per-set
  // feedback state below (sessionDifficulty, overallPump, etc.).
  // Both live in the same scope, JS doesn't let two consts share a
  // name in the same block.
  const feedbackSheet = useFeedback();
  const insets = useSafeAreaInsets();

  const [feedback, setFeedback] = useState({
    sessionDifficulty: 3,
    overallPump: 2,
    soreness24hBefore: 1,
    fatigueLevel: 2,
    jointDiscomfort: 0,
    energyScore: 3,
    sleepQuality: 3,
  });
  const [notes, setNotes] = useState('');
  const [nextTimeNote, setNextTimeNote] = useState('');
  // The day's name (e.g. "Back + Delts (Width)") for the share card title.
  // The summary is reached with routineId but not the name, so fetch it.
  const [routineName, setRoutineName] = useState('');
  const [weeklyVolume, setWeeklyVolume] = useState({});
  const [saving, setSaving] = useState(false);
  const [completedWorkoutCount, setCompletedWorkoutCount] = useState(null);
  // Default-expanded so the energy + sleep prompts surface naturally
  // at the end of the session. The coach engine relies on these
  // signals; hiding them behind a tap was making the post-workout
  // check-in feel like it had disappeared.
  const [feedbackExpanded, setFeedbackExpanded] = useState(!readOnly);
  const [expandedVolumeWhy, setExpandedVolumeWhy] = useState(null);
  const [adaptiveDecisions, setAdaptiveDecisions] = useState({});
  const [readOnlyExerciseData, setReadOnlyExerciseData] = useState([]);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // 4-week comparison: how does this session stack up against the same
  // routine over the last 4 weeks? null while loading or when there's no
  // routine / no prior history to compare to (a one-off session is also
  // an "n/a" case).
  const [comparison, setComparison] = useState(null);

  const feedbackDebounceRef = useRef(null);

  useEffect(() => {
    if (!readOnly && routineId && user?.id) {
      (async () => {
        try {
          const activePlan = await getActivePlan(user.id);
          if (activePlan) {
            const planRoutines = await getRoutinesForPlan(activePlan.id);
            if (planRoutines.some(r => r.id === routineId)) {
              await advancePlanNextWorkout(activePlan.id, planRoutines.length);
            }
          }
        } catch (_e) {}
      })();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadVolumeAndHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the routine/day name so the share card can title the session with the
  // real workout name rather than a join of the first two exercise names.
  useEffect(() => {
    let cancelled = false;
    if (!routineId) return undefined;
    (async () => {
      try {
        const r = await getRoutineById(routineId);
        if (!cancelled && r?.name) setRoutineName(r.name);
      } catch (_e) { /* fall back to the exercise-name title */ }
    })();
    return () => { cancelled = true; };
  }, [routineId]);

  // Contextual feedback prompt, fires ONCE after the user has
  // completed their first ~3 sessions. Suppressed thereafter via
  // the @volyume_feedback_prompt_history_v1 store. Never fires in
  // read-only mode (viewing old history).
  useEffect(() => {
    if (readOnly || !feedbackSheet) return;
    const totalDone = completedWorkoutCount ?? 0;
    // Trigger windows: after session 1 (the "is this for you?" beat)
    // and after session 10 (the "still working?" beat). Both gated
    // by the 14-day suppression in feedback.js.
    let triggerKey = null;
    if (totalDone === 1) triggerKey = 'first_workout_summary';
    else if (totalDone === 10) triggerKey = 'tenth_workout_summary';
    if (!triggerKey) return;
    // Show the sheet a beat after the screen settles so the user
    // has registered the summary before we ask. 1.4s feels natural
    //, long enough to read the headline, short enough to not feel
    // detached from the completion moment.
    const t = setTimeout(async () => {
      const ok = await shouldPrompt(triggerKey).catch(() => false);
      if (!ok) return;
      feedbackSheet.open({
        trigger: 'contextual',
        triggerKey,
      });
    }, 1400);
    return () => clearTimeout(t);
  }, [readOnly, completedWorkoutCount, feedbackSheet]);

  // 4-week comparison against prior sessions of the SAME routine. Skipped
  // for one-off sessions (no routineId) and for read-only history views
  // where the "current" workout already lives in the dataset and the
  // ranking would double-count.
  useEffect(() => {
    if (readOnly || !routineId || !user?.id) return;
    const since = Date.now() - 28 * 24 * 60 * 60 * 1000; // 4 weeks
    getRoutineWorkoutTonnages(user.id, routineId, since, workoutId)
      .then(prior => {
        if (!prior.length) {
          setComparison({ verdict: 'first', priorCount: 0 });
          return;
        }
        const tonnages = prior.map(p => p.tonnage || 0).filter(t => t > 0);
        if (!tonnages.length) {
          setComparison({ verdict: 'first', priorCount: 0 });
          return;
        }
        const avg = tonnages.reduce((a, b) => a + b, 0) / tonnages.length;
        const current = tonnage || 0;
        const pct = avg > 0 ? Math.round(((current - avg) / avg) * 100) : 0;
        // Rank: position of `current` if inserted into sorted list (desc).
        // 1 = top of the window. of = total sessions inc. current.
        const allSorted = [...tonnages, current].sort((a, b) => b - a);
        const position = allSorted.indexOf(current) + 1;
        const total = allSorted.length;
        let verdict;
        if (position === 1) verdict = 'best';
        else if (pct >= 10) verdict = 'up';
        else if (pct <= -10) verdict = 'down';
        else verdict = 'on_pace';
        setComparison({ verdict, pct, position, total, priorCount: tonnages.length, avgTonnage: Math.round(avg) });
      })
      .catch(() => setComparison(null));
  }, [readOnly, routineId, user?.id, workoutId, tonnage]);

  useEffect(() => {
    // Map feedback to adaptive engine scales per muscle, then run adaptive engine
    // soreness24hBefore: 1=fresh→2, 2=mild→3, 3=sore→4
    // sessionDifficulty: 1=veryEasy→1(exceeded), 2=easy→1, 3=moderate→2(met), 4=hard→3(struggled), 5=brutal→4(failed)
    // overallPump: 1=none→1, 2=mild→2, 3=good→4
    // jointDiscomfort: 0=none→0, 1=slight→1, 2=moderate→2, 3=significant→3
    const soreness = [0, 2, 3, 4][feedback.soreness24hBefore - 1] ?? 2;
    const performance = [0, 1, 1, 2, 3, 4][feedback.sessionDifficulty] ?? 2;
    const pump = [1, 1, 2, 4][feedback.overallPump - 1] ?? 3;
    const joint = feedback.jointDiscomfort ?? 0;

    // Build per-muscle feedback using the weekly volume
    const muscleFeedback = {};
    for (const [muscle, volData] of Object.entries(weeklyVolume)) {
      const { mev = 6, mav = 14, mrv = 22 } = (typeof getVolumeStatus === 'function'
        ? (getVolumeStatus(volData.workingSets, muscle)?.landmarks || {})
        : {});
      muscleFeedback[muscle] = {
        soreness,
        performance,
        pump,
        joint,
        currentSets: volData.workingSets,
        mev,
        mav,
        mrv,
      };
    }
    const decisions = runAdaptiveEngine(muscleFeedback);
    setAdaptiveDecisions(decisions);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedback, weeklyVolume]);

  useEffect(() => {
    if (!workoutId || readOnly) return;
    if (feedbackDebounceRef.current) clearTimeout(feedbackDebounceRef.current);
    feedbackDebounceRef.current = setTimeout(async () => {
      try {
        await updateWorkout(workoutId, {
          sessionDifficulty: feedback.sessionDifficulty,
          overallPump: feedback.overallPump,
          soreness24hBefore: feedback.soreness24hBefore,
          jointDiscomfort: feedback.jointDiscomfort,
          fatigueLevel: feedback.fatigueLevel,
          notes: notes || null,
        });
      } catch (_e) {}
    }, 1000);
    return () => {
      if (feedbackDebounceRef.current) clearTimeout(feedbackDebounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedback, notes]);

  async function loadVolumeAndHistory() {
    if (!user?.id) return;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const [allSets, allExercises, allWorkouts] = await Promise.all([
      getCompletedWorkoutSets(user.id),
      getAllExercises(),
      getAllWorkouts(user.id),
    ]);
    const recentSets = allSets.filter(s => s.createdAt >= weekAgo);
    const exerciseMap = Object.fromEntries(allExercises.map(e => [e.id, e]));
    const volume = calculateWeeklyVolume(recentSets, exerciseMap);
    setWeeklyVolume(volume);

    const fourWeeksAgo = Date.now() - 28 * 24 * 60 * 60 * 1000;
    const completed = allWorkouts.filter(w => w.isCompleted && w.startedAt >= fourWeeksAgo);
    setCompletedWorkoutCount(completed.length);

    // For readOnly (history) view, load and group sets by exercise
    if (readOnly && workoutId) {
      try {
        const { getWorkoutSetsForWorkout } = await import('../lib/database');
        const wSets = await getWorkoutSetsForWorkout(workoutId);
        const exerciseMap = Object.fromEntries(allExercises.map(e => [e.id, e]));
        const grouped = [];
        const seen = [];
        for (const s of wSets) {
          if (!seen.includes(s.exerciseId)) seen.push(s.exerciseId);
        }
        for (const exId of seen) {
          const ex = exerciseMap[exId];
          if (!ex) continue;
          grouped.push({
            exerciseId: exId,
            name: ex.name,
            loggedSets: wSets
              .filter(s => s.exerciseId === exId)
              .map(s => ({
                weight: s.weight,
                reps: s.actualReps ?? s.actual_reps,
                setType: s.setType ?? s.set_type ?? 'straight',
              })),
          });
        }
        setReadOnlyExerciseData(grouped);
      } catch (_e) {}
    }
  }

  async function handleDone() {
    if (readOnly) {
      navigation.goBack();
      return;
    }
    if (!workoutId) { navigation.popToTop(); return; }
    setSaving(true);
    if (feedbackDebounceRef.current) clearTimeout(feedbackDebounceRef.current);
    try {
      await updateWorkout(workoutId, {
        sessionDifficulty: feedback.sessionDifficulty,
        overallPump: feedback.overallPump,
        soreness24hBefore: feedback.soreness24hBefore,
        jointDiscomfort: feedback.jointDiscomfort,
        fatigueLevel: feedback.fatigueLevel,
        notes: notes || null,
      });
    } catch (_e) {}

    // Contribute this session's sleep-quality rating to the week's recovery
    // record. This is the ONLY field WorkoutSummary writes to weekly_checkins:
    // sleep_quality is not held on the workouts table and is read by
    // CoachReview + the recovery-trend insight, and the weekly coach does NOT
    // read it. Everything else this screen used to write either duplicated a
    // weekly-coach input on a conflicting scale (energy, soreness,
    // training_performance) or is sourced better elsewhere (per-session
    // soreness/fatigue live on the workouts row). The save is now preserving,
    // so passing only sleepQuality leaves the user's calorie / steps / cardio /
    // training answers for the week untouched.
    if (user?.id) {
      try {
        await saveWeeklyCheckin(user.id, {
          // FF-006: attribute the sleep-quality rating to the workout's own
          // week, not the wall clock at summary-close time. A late or
          // cross-midnight close used to land it in the wrong weekly bucket.
          // localWeekStartMs is the locked-rule, local Monday-anchored helper.
          weekStart: localWeekStartMs(workoutDayMs({ startedAt, endedAt })),
          sleepQuality: feedback.sleepQuality || null,
        });
      } catch (_e) {}
    }

    // Write adaptation events for engine decisions. These are an
    // in-session record of how each muscle responded (soreness /
    // performance / pump / joint), surfaced in the Engine Log on the You tab.
    //
    // The per-session engine no longer writes NEXT-WEEK planned volume.
    // Founder decision 2026-05-28: the weekly coach owns next-week
    // volume (confirm-then-apply on the coach card), so the per-session
    // engine stays in-session only. Letting both write next week's plan
    // double-counted volume. nextWeekSets is still recorded on the
    // adaptation event as a signal, it just no longer mutates the plan.
    try {
      const currentWeek = await getCurrentMesocycleWeek(user?.id);
      if (currentWeek?.id && Object.keys(adaptiveDecisions).length > 0) {
        for (const [muscle, dec] of Object.entries(adaptiveDecisions)) {
          await createAdaptationEvent({
            mesocycleWeekId: currentWeek.id,
            muscle,
            decision: dec.decision,
            delta: dec.delta,
            reasonCode: dec.reasonCode,
            reasonText: dec.reasonText,
            signals: {
              soreness: dec.soreness ?? null,
              performance: dec.performance ?? null,
              pump: dec.pump ?? null,
              joint: dec.joint ?? null,
              currentSets: dec.currentSets,
              nextWeekSets: dec.nextWeekSets,
            },
          });
        }
      }
    } catch (_e) {}

    // Save "next time" note if the user typed one
    if (user?.id && nextTimeNote.trim()) {
      try {
        await saveNextTimeNote(user.id, { routineId: routineId ?? null, note: nextTimeNote.trim() });
      } catch (_e) {}
    }

    // Background sync to Supabase, fire and forget, never blocks navigation
    const supabaseUserId = session?.user?.id;
    if (supabaseUserId && workoutId) {
      syncWorkout(supabaseUserId, workoutId).catch(() => {});
    }

    // Write the session to Apple Health / Health Connect so the user's
    // weekly activity stays accurate across their health stack. Silent
    // no-op if the user hasn't granted the workout write scope.
    try {
      const endedAt = Date.now();
      const startedAt = endedAt - Math.max(1, durationMinutes || 1) * 60_000;
      // eslint-disable-next-line global-require
      const { writeWorkoutToHealth } = require('../lib/health');
      writeWorkoutToHealth({
        startedAt,
        endedAt,
        tonnageKg: tonnage || 0,
        bodyWeightKg: userProfile?.bodyWeightKg ?? userProfile?.bodyweightKg ?? null,
        notes: exerciseNames?.length ? exerciseNames.slice(0, 4).join(', ') : null,
      }).catch(() => {});
    } catch (_) {}

    // Increment session count and request App Store / Play Store review after 5 sessions
    incrementSessionCount().then(count => {
      if (count >= 5) {
        shouldPromptReview().then(should => { if (should) requestReview(); });
      }
    }).catch(() => {});

    setSaving(false);
    navigation.popToTop();
  }

  function handleShareCard() {
    // Top set across the whole session, heaviest non-warmup set drives the
    // "best lift" highlight on the share card.
    let topSet = null;
    let topWeight = 0;
    for (const ex of exerciseData || []) {
      for (const s of ex.loggedSets || []) {
        if (s.setType === 'warmup') continue;
        const w = parseFloat(s.weight) || 0;
        if (w > topWeight) {
          topWeight = w;
          topSet = { weight: w, reps: s.reps || 0, exerciseName: ex.name };
        }
      }
    }

    // Intensity tier, drives the badge on the share card. Heuristic, but
    // gives a "great workout" flavour without needing a full grading system.
    const sets = workingSetCount ?? setCount ?? 0;
    const ton = tonnage || 0;
    let intensityTier = 'solid';
    if (detectedPRs.length >= 2 || ton > 8000 || sets >= 25) intensityTier = 'epic';
    else if (detectedPRs.length >= 1 || ton > 4000 || sets >= 18) intensityTier = 'tough';

    // Title with the real day name (e.g. "Back + Delts (Width)") when we have
    // it. Fall back to a join of the first exercises, then a generic label.
    const sessionName = (routineName && routineName.trim())
      || (exerciseNames.length > 0
        ? exerciseNames.slice(0, 2).join(' & ') + (exerciseNames.length > 2 ? ' +more' : '')
        : 'Session Complete');
    const sessionData = {
      sessionName,
      duration: durationMinutes || 0,
      workingSets: sets,
      exerciseCount: exerciseCount || 0,
      tonnage: ton,
      exercises: exerciseNames,
      prCount: detectedPRs.length,
      topSet,
      intensityTier,
    };
    const prData = detectedPRs.length > 0 ? detectedPRs[0] : null;
    navigation.navigate('ShareCard', { sessionData, prData });
  }

  function handleSaveAsTemplate() {
    if (!exerciseData.length) {
      appAlert('No exercises', 'No exercise data available to save as template.');
      return;
    }
    setTemplateName(exerciseNames.slice(0, 2).join(' & ') || 'My Workout');
    setTemplateModalVisible(true);
  }

  async function confirmSaveTemplate() {
    const name = templateName.trim();
    if (!name) return;
    setTemplateModalVisible(false);
    try {
      const { createWorkoutTemplateFromWorkout } = require('../lib/database');
      await createWorkoutTemplateFromWorkout(user.id, name, exerciseData);
      toast.show(`"${name}" saved to Workout Templates`, { variant: 'success' });
    } catch (_) {
      toast.show('Could not save template. Try again.', { variant: 'error' });
    }
  }

  const musclesWorked = Object.keys(weeklyVolume)
    .filter(m => weeklyVolume[m]?.workingSets > 0)
    .sort((a, b) => (weeklyVolume[b]?.workingSets || 0) - (weeklyVolume[a]?.workingSets || 0))
    .slice(0, 6);

  const displayWorkingSets = workingSetCount ?? setCount ?? 0;

  // The session's own day (when it was trained/completed), NOT the moment this
  // screen is opened. Viewing a past workout used to show today's date because
  // this read new Date(); now it reads the workout's ended/started time.
  const completionDate = new Date(workoutDayMs({ startedAt, endedAt })).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const prExerciseNames = detectedPRs
    .slice(0, 3)
    .map(pr => pr.exerciseName || pr.exercise || '')
    .filter(Boolean)
    .join(', ');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.completionHeader}>
          <View style={styles.checkRow}>
            <Ionicons name="checkmark-circle" size={28} color={colors.success} />
            <Text style={styles.completionTitle}>Session Complete</Text>
          </View>
          <Text style={styles.completionDate}>{completionDate}</Text>
        </View>

        <View style={styles.statsGrid}>
          <StatBox icon="barbell-outline" value={String(exerciseCount || 0)} label="Exercises" animateOrder={0} />
          <StatBox
            icon="layers-outline"
            value={String(displayWorkingSets)}
            label="Working Sets"
            tooltip={'Hard sets counted in your weekly totals. Warm-up sets are excluded.\n\nA working set is any set where you trained close to your limit, typically 0 to 3 reps from failure.'}
            animateOrder={1}
          />
          <StatBox icon="time-outline" value={`${durationMinutes || 0}m`} label="Duration" animateOrder={2} />
          <StatBox
            icon="trending-up-outline"
            value={`${Math.round(tonnage || 0).toLocaleString('en-GB')} kg`}
            label="Total kg"
            tooltip={'Total weight moved this session: sets × reps × weight added together. A rough measure of how much work you did. More is not always better; quality of effort matters more than raw numbers.'}
            animateOrder={3}
          />
        </View>

        {/* 4-week comparison, only when we have at least one prior session
            of this routine. Lives right under the stat row so the user
            reads "your numbers" and then "how those numbers compare".
            Wrapped in RevealSection so it fades in after the stat
            counters have settled (~1100ms grid + 0ms own delay). */}
        {comparison && comparison.priorCount > 0 && (
          <RevealSection delay={1100}>{(() => {
          const { verdict, pct, position, total, priorCount } = comparison;
          let headline, sub, accent;
          if (verdict === 'best') {
            headline = `Strongest session in 4 weeks`;
            sub = `Top of ${total} sessions logged for this routine.`;
            accent = colors.gold;
          } else if (verdict === 'up') {
            headline = `${pct >= 0 ? '+' : ''}${pct}% vs your 4-week average`;
            sub = `Position ${position} of ${total} sessions in the window.`;
            accent = colors.success;
          } else if (verdict === 'down') {
            headline = `${pct}% vs your 4-week average`;
            sub = `Recovery or stress matter. Don't chase yesterday's volume; trust the trend.`;
            accent = colors.textSecondary;
          } else {
            headline = `On pace with your last ${priorCount} session${priorCount !== 1 ? 's' : ''}`;
            sub = `Within ±10% of your 4-week average. Consistency is the goal.`;
            accent = colors.primary;
          }
          return (
            <View style={[styles.compareCard, { borderColor: withAlpha(accent, 0.251) }]}>
              <View style={styles.compareIconWrap}>
                <Ionicons
                  name={verdict === 'best' ? 'trophy-outline' : verdict === 'up' ? 'trending-up-outline' : verdict === 'down' ? 'trending-down-outline' : 'analytics-outline'}
                  size={18}
                  color={accent}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.compareHeadline, { color: accent }]}>{headline}</Text>
                <Text style={styles.compareSub}>{sub}</Text>
              </View>
            </View>
          );
        })()}</RevealSection>
        )}

        <RevealSection delay={1220}>{(() => {
          const display = readOnly
            ? readOnlyExerciseData
            : exerciseData.length > 0 ? exerciseData : [];
          if (!display.length) return null;
          return (
            <View style={styles.exerciseList}>
              {display.map((ex, i) => {
                const workingSets = (ex.loggedSets ?? []).filter(
                  s => (s.setType ?? 'straight') !== 'warmup'
                );
                return (
                  <View key={ex.exerciseId || i} style={styles.exerciseListRow}>
                    <Text style={styles.exerciseListName} numberOfLines={1}>{ex.name}</Text>
                    {workingSets.length > 0 ? (
                      <View style={styles.exerciseSetsList}>
                        {workingSets.map((s, si) => (
                          <Text key={si} style={styles.exerciseSetChip}>
                            {s.weight > 0 ? `${s.weight}${units}` : 'BW'} × {s.reps}
                          </Text>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.exerciseListMeta}>
                        {ex.recommendedSets} × {ex.repsMin}–{ex.repsMax}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          );
        })()}</RevealSection>

        {detectedPRs.length > 0 && (
          <RevealSection delay={1340}>
          <View style={styles.prRow}>
            <Ionicons name="trophy-outline" size={18} color={colors.warning} />
            <Text style={styles.prRowText}>
              {detectedPRs.length} new PR{detectedPRs.length !== 1 ? 's' : ''}
              {prExerciseNames ? ` · ${prExerciseNames}` : ''}
            </Text>
          </View>
          </RevealSection>
        )}

        <View style={styles.divider} />

        {musclesWorked.length > 0 && (
          <RevealSection delay={1460}>
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Text style={styles.sectionTitle}>This week's volume</Text>
              <InfoTooltip size={11} text={
                'How much you\'ve trained each muscle group this week.\n\n' +
                'Green = Good range: enough training to grow without overdoing it\n' +
                'Yellow = Getting close: one more session and it may be too much\n' +
                'Red = Too much: consider doing a little less next week\n' +
                'Grey = Below minimum: not quite enough to drive growth yet\n\n' +
                'These targets are personalised and adjust over time based on how your body responds.'
              } />
            </View>
            {musclesWorked.map(muscle => {
              const data = weeklyVolume[muscle];
              const { label, status } = getVolumeStatus(data.workingSets, muscle);
              const color = volumeStatusColor(status);
              const insight = getVolumeInsight(muscle, data.workingSets, status);
              const why = getVolumeWhy(muscle, data.workingSets, status);
              const isExpanded = expandedVolumeWhy === muscle;
              return (
                <View key={muscle} style={styles.volumeRow}>
                  <View style={styles.volumeRowMain}>
                    <Text style={styles.muscleName}>{MUSCLE_DISPLAY_NAMES[muscle] || muscle}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: withAlpha(color, 0.133) }]}>
                      <Text style={[styles.statusText, { color }]}>{label}</Text>
                    </View>
                  </View>
                  {insight ? (
                    <Text style={styles.volumeInsightText}>{insight}</Text>
                  ) : (
                    <Text style={styles.volumeInsightText}>
                      {Math.round(data.workingSets)} sets this week
                    </Text>
                  )}
                  {why && (
                    <>
                      <TouchableOpacity
                        onPress={() => setExpandedVolumeWhy(isExpanded ? null : muscle)}
                        accessibilityRole="button"
                        accessibilityLabel={isExpanded ? `Hide why ${MUSCLE_DISPLAY_NAMES[muscle] || muscle} sits here` : `Why ${MUSCLE_DISPLAY_NAMES[muscle] || muscle} sits here`}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        style={styles.volumeWhyToggle}
                      >
                        <Text style={styles.volumeWhyToggleText}>
                          {isExpanded ? 'Hide explanation' : 'Why this status?'}
                        </Text>
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={14}
                          color={colors.primary}
                        />
                      </TouchableOpacity>
                      {isExpanded && (
                        <Text style={styles.volumeWhyBody}>{why}</Text>
                      )}
                    </>
                  )}
                </View>
              );
            })}
          </View>
          </RevealSection>
        )}

        {!readOnly && (
          <RevealSection delay={1580}>
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>How did it feel?</Text>
              <Text style={styles.optionalLabel}>optional</Text>
            </View>
            <TouchableOpacity
              style={styles.feedbackToggleBtn}
              onPress={() => setFeedbackExpanded(e => !e)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ expanded: feedbackExpanded }}
              accessibilityLabel={feedbackExpanded ? 'Hide session feedback' : 'Add session feedback'}
            >
              <Text style={styles.feedbackToggleBtnText}>
                {feedbackExpanded ? 'Hide session feedback' : 'Add session feedback'}
              </Text>
              <Ionicons
                name={feedbackExpanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            {feedbackExpanded && (
              <View style={styles.feedbackCard}>
                <RatingRow label="Difficulty" field="sessionDifficulty" value={feedback.sessionDifficulty} max={5} onChange={v => setFeedback(f => ({ ...f, sessionDifficulty: v }))} />
                <RatingRow label="Muscle engagement" field="overallPump" value={feedback.overallPump} max={3} onChange={v => setFeedback(f => ({ ...f, overallPump: v }))} />
                <RatingRow label="Soreness coming in" field="soreness24hBefore" value={feedback.soreness24hBefore} max={3} onChange={v => setFeedback(f => ({ ...f, soreness24hBefore: v }))} />
                <RatingRow label="Fatigue" field="fatigueLevel" value={feedback.fatigueLevel} max={5} onChange={v => setFeedback(f => ({ ...f, fatigueLevel: v }))} />
                <RatingRow label="Joint discomfort" field="jointDiscomfort" value={feedback.jointDiscomfort} max={3} onChange={v => setFeedback(f => ({ ...f, jointDiscomfort: v }))} />
                <RatingRow label="Energy today" field="energyScore" value={feedback.energyScore} max={5} onChange={v => setFeedback(f => ({ ...f, energyScore: v }))} />
                <RatingRow label="Sleep last night" field="sleepQuality" value={feedback.sleepQuality} max={5} onChange={v => setFeedback(f => ({ ...f, sleepQuality: v }))} />
                <TextInput
                  style={styles.notesInput}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Anything notable from this session..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                />
              </View>
            )}
          </View>
          </RevealSection>
        )}

        {!readOnly && !routineId && exerciseData.length > 0 && (
          <RevealSection delay={1700}>
          <View style={styles.secondaryActions}>
            <TouchableOpacity style={styles.templateBtn} onPress={handleSaveAsTemplate} accessibilityRole="button" accessibilityLabel="Save as workout template">
              <Ionicons name="bookmark-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.templateBtnText}>Save as Workout Template</Text>
            </TouchableOpacity>
          </View>
          </RevealSection>
        )}

        {!readOnly && (
          <RevealSection delay={1820}>
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Notes for next time</Text>
              <Text style={styles.optionalLabel}>optional</Text>
            </View>
            <TextInput
              style={styles.nextTimeNoteInput}
              value={nextTimeNote}
              onChangeText={setNextTimeNote}
              placeholder="Anything to remember for next session? e.g. try 85kg, wider grip, reduce volume…"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>
          </RevealSection>
        )}
      </ScrollView>

      <View style={[styles.stickyFooter, { paddingBottom: Math.max(spacing.lg, insets.bottom) }]}>
        <View style={styles.footerRow}>
          <TouchableOpacity
            style={[styles.doneBtn, saving && styles.btnDisabled]}
            onPress={handleDone}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Close"
            accessibilityState={{ disabled: saving }}
          >
            <Text style={styles.doneBtnText}>Close</Text>
          </TouchableOpacity>
          {!readOnly && (
            <TouchableOpacity style={styles.shareFooterBtn} onPress={handleShareCard} accessibilityRole="button" accessibilityLabel="Share session card">
              <Ionicons name="share-social-outline" size={20} color={colors.background} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Template name modal, cross-platform alternative to Alert.prompt */}
      <Modal
        visible={templateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTemplateModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.templateModalBg}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.templateModalCard}>
            <Text style={styles.templateModalTitle}>Save as Workout Template</Text>
            <TextInput
              style={styles.templateModalInput}
              value={templateName}
              onChangeText={setTemplateName}
              placeholder="Template name"
              placeholderTextColor={colors.textMuted}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={confirmSaveTemplate}
              selectTextOnFocus
            />
            <View style={styles.templateModalBtns}>
              <TouchableOpacity
                style={styles.templateModalCancel}
                onPress={() => setTemplateModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={styles.templateModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.templateModalSave, !templateName.trim() && { opacity: 0.4 }]}
                onPress={confirmSaveTemplate}
                disabled={!templateName.trim()}
                accessibilityRole="button"
                accessibilityLabel="Save template"
                accessibilityState={{ disabled: !templateName.trim() }}
              >
                <Text style={styles.templateModalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function getVolumeInsight(muscle, sets, status) {
  const landmarks = VOLUME_LANDMARKS[muscle];
  if (!landmarks) return null;
  const { mev, mrv } = landmarks;
  const n = Math.round(sets);
  const range = `${mev}–${mrv} sets/week`;
  if (status === 'optimal') return `${n} sets · on track for hypertrophy (target: ${range})`;
  if (status === 'minimum') return `${n} sets · at minimum effective volume (target: ${range})`;
  if (status === 'below') return `${n} sets · below minimum effective volume (target: ${range})`;
  if (status === 'near_mrv') return `${n} sets · approaching upper limit (target: ${range})`;
  if (status === 'over_mrv') return `${n} sets · over your recovery limit (aim for ${range} next week)`;
  return `${n} sets (target: ${range})`;
}

// Longer-form "why this status" explanation surfaced behind a tap on each
// muscle row. The insight line above is at-a-glance; this body answers
// the "but why?" question with concrete next-week guidance and the
// landmark numbers for THIS muscle specifically.
function getVolumeWhy(muscle, sets, status) {
  const landmarks = VOLUME_LANDMARKS[muscle];
  if (!landmarks) return null;
  const { mev, mrv } = landmarks;
  const name = MUSCLE_DISPLAY_NAMES[muscle] || muscle;
  const closing = ' Targets adjust over time as your body responds to training.';
  if (status === 'optimal') {
    return `${name}'s productive range sits between ${mev} and ${mrv} sets per week, and you landed inside it. Next week, look for an extra rep on at least one exercise rather than piling on more sets.${closing}`;
  }
  if (status === 'minimum') {
    return `You're right at the floor for ${name}. ${mev} sets is enough to grow, but only just. One or two more sets across the week, or a slower eccentric on one exercise, moves you into a stronger range.${closing}`;
  }
  if (status === 'below') {
    return `Below the ${mev}-set floor where reliable growth signals start to appear in research. Two routes next week: add a couple of sets to an existing exercise, or sneak in one extra movement that hits ${name}.${closing}`;
  }
  if (status === 'near_mrv') {
    return `Close to the recovery ceiling for ${name} (${mrv} sets per week). One more session and recovery costs start to outweigh the gains. Hold here next week. If your reps are still climbing session to session, you're managing the load well.${closing}`;
  }
  if (status === 'over_mrv') {
    return `Past the recovery ceiling for ${name} (${mrv} sets per week). Soreness, performance drops and joint chatter usually follow. Drop a few sets next week to land back in the green band. Backing off here is how you come back stronger.${closing}`;
  }
  return null;
}

// RevealSection, staggered fade-in + small upward translate for the
// major sections below the stat grid. Sequences the comparison card,
// exercise list, PRs, feedback, and finish CTA so the screen reads
// top-to-bottom as the eye scans rather than landing all at once.
//
// Each section's `delay` is roughly the previous section's delay +
// 120ms; the first reveal kicks off after the StatBox counters
// settle (~1100ms total for the grid). Reduce-motion users see the
// final state immediately, no opacity ramp, no transform.
function RevealSection({ delay = 0, children }) {
  const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion);
  const opacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(reduceMotion ? 0 : 14)).current;

  useEffect(() => {
    if (reduceMotion) return;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 320, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 360, delay, useNativeDriver: true }),
    ]).start();
  }, [delay, reduceMotion, opacity, translateY]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

// StatBox renders a single hero stat. When the value is a pure
// number-like string (no letters), the value animates from 0 up to
// the target across ~900ms with an ease-out curve. The user sees
// "Total kg: 4,000 → 8,432 → 12,800" tick by rather than the number
// just appearing, gives the summary a cinematic beat. Reduce-motion
// users get the final value immediately.
function StatBox({ icon, value, label, tooltip, animateOrder = 0 }) {
  const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion);
  // Parse the value to detect whether it's "10,432 kg" (number with
  // optional suffix) or "12m" (number + unit) or "8" (pure number).
  // We keep the suffix and animate only the number.
  const parsed = React.useMemo(() => {
    const m = String(value || '').match(/^([\d,]+(?:\.\d+)?)(.*)$/);
    if (!m) return null;
    const cleanNum = parseFloat(m[1].replace(/,/g, ''));
    if (!Number.isFinite(cleanNum)) return null;
    return { num: cleanNum, suffix: m[2] };
  }, [value]);

  const [displayed, setDisplayed] = useState(() => parsed ? 0 : value);
  const opacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(reduceMotion ? 0 : 8)).current;

  useEffect(() => {
    if (!parsed) { setDisplayed(value); return; }
    if (reduceMotion) { setDisplayed(value); return; }
    // Staggered reveal, each StatBox starts ~80ms after the previous
    // one. Gives the grid a left-to-right shimmer rather than four
    // boxes appearing simultaneously.
    const delay = animateOrder * 80;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 280, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 320, delay, useNativeDriver: true }),
    ]).start();
    // Counter animation: tick from 0 to target across ~900ms with
    // ease-out so the increment slows as it approaches the final
    // value. Smooth, not janky.
    const target = parsed.num;
    const durationMs = 900;
    const startedAt = Date.now() + delay;
    let raf = null;
    function step() {
      const now = Date.now();
      if (now < startedAt) { raf = requestAnimationFrame(step); return; }
      const t = Math.min(1, (now - startedAt) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(target * eased);
      const formatted = target >= 100
        ? `${current.toLocaleString('en-GB')}${parsed.suffix}`
        : `${current}${parsed.suffix}`;
      setDisplayed(formatted);
      if (t < 1) raf = requestAnimationFrame(step);
      else setDisplayed(value);
    }
    raf = requestAnimationFrame(step);
    return () => { if (raf) cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Animated.View style={[styles.statBox, { opacity, transform: [{ translateY }] }]}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.statValue}>{displayed}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xxs }}>
        <Text style={styles.statLabel}>{label}</Text>
        {tooltip ? <InfoTooltip size={10} text={tooltip} /> : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxxl },
  completionHeader: { gap: spacing.xs, paddingVertical: spacing.md },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  completionTitle: { fontSize: fontSize.xxl, fontWeight: fontWeight.black, color: colors.textPrimary },
  completionDate: { fontSize: fontSize.sm, color: colors.textMuted },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  statBox: {
    flex: 1, minWidth: '45%', backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.lg, alignItems: 'center', gap: spacing.xs, borderWidth: 1, borderColor: colors.border,
  },
  statValue: { fontSize: fontSize.xl, fontWeight: fontWeight.black, color: colors.textPrimary },
  statLabel: { ...type.caption, color: colors.textSecondary },
  prRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.warningBg, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: withAlpha(colors.warning, 0.251),
  },
  prRowText: { ...type.label, flex: 1, color: colors.warning },
  divider: { height: 1, backgroundColor: colors.border },
  section: { gap: spacing.md },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { ...type.label, color: colors.textSecondary },
  optionalLabel: { ...type.caption, color: colors.textMuted },
  volumeRow: {
    flexDirection: 'column', gap: spacing.xs,
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  volumeRowMain: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
  },
  muscleName: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.textPrimary },
  volumeInsightText: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 18 },
  volumeWhyToggle: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    alignSelf: 'flex-start', paddingVertical: spacing.xxs,
  },
  volumeWhyToggleText: {
    fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.semibold,
  },
  volumeWhyBody: {
    fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: 19,
    backgroundColor: colors.surface2, borderRadius: radius.sm,
    padding: spacing.sm, marginTop: spacing.xxs,
  },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: radius.sm },
  statusText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  feedbackToggleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  feedbackToggleBtnText: { fontSize: fontSize.md, color: colors.textSecondary, fontWeight: fontWeight.medium },
  feedbackCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.lg, borderWidth: 1, borderColor: colors.border },
  ratingRow: { gap: spacing.sm },
  ratingLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ratingLabel: { ...type.label, color: colors.textSecondary },
  ratingBtns: { flexDirection: 'row', gap: spacing.xs },
  ratingBtn: {
    width: 40, height: 40, borderRadius: radius.xl, backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border,
  },
  ratingBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  ratingBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textSecondary },
  ratingBtnTextActive: { color: colors.background },
  ratingValueLabel: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.medium },
  notesInput: {
    ...type.body,
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg,
    color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, minHeight: 80,
  },
  nextTimeNoteInput: {
    backgroundColor: colors.surface2, borderRadius: radius.md, padding: spacing.lg,
    fontSize: fontSize.sm, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border,
    minHeight: 72, textAlignVertical: 'top',
  },
  secondaryActions: { gap: spacing.sm },
  templateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  templateBtnText: { ...type.label, color: colors.textSecondary },
  stickyFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
  },
  footerRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  doneBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  doneBtnText: {
    ...type.title,
    color: colors.background,
  },
  shareFooterBtn: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseList: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  exerciseListRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  exerciseListName: {
    ...type.label,
    color: colors.textPrimary,
  },
  exerciseListMeta: {
    ...type.num('caption'),
    color: colors.textSecondary,
  },
  exerciseSetsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  exerciseSetChip: {
    ...type.num('caption'),
    color: colors.textSecondary,
    backgroundColor: colors.surface2 ?? colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },

  templateModalBg: {
    flex: 1, backgroundColor: colors.scrim,
    justifyContent: 'center', alignItems: 'center', padding: spacing.xl,
  },
  templateModalCard: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    padding: spacing.xl, width: '100%', gap: spacing.md,
  },
  templateModalTitle: {
    fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary,
  },
  templateModalInput: {
    ...type.body,
    backgroundColor: colors.surface2, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    color: colors.textPrimary,
    borderWidth: 1, borderColor: colors.border,
  },
  templateModalBtns: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' },
  templateModalCancel: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  templateModalCancelText: { fontSize: fontSize.sm, color: colors.textSecondary },
  templateModalSave: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: radius.md, backgroundColor: colors.primary,
  },
  templateModalSaveText: { ...type.label, color: colors.background },

  // 4-week comparison card, same surface treatment as other summary
  // cards but borderColor is set inline per-verdict (gold for best, green
  // for up, neutral for on-pace, muted for down).
  compareCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1,
    marginTop: spacing.md,
  },
  compareIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  compareHeadline: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  compareSub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 3, lineHeight: 16 },
});
