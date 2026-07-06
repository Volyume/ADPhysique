import React, { useState, useEffect, useRef } from 'react';
import { appAlert } from '../components/AppAlert';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, radius, type, volumeStatusColor, withAlpha, alpha, circle, motion } from '../styles/theme';
import InfoTooltip from '../components/InfoTooltip';
import BackHeader from '../components/BackHeader';
import RollingNumber from '../components/RollingNumber';
import BlockShapeCard from '../components/BlockShapeCard';
import Button from '../components/Button';
import TextField from '../components/TextField';
import { useFeedback } from '../components/FeedbackSheet';
import { shouldPrompt } from '../lib/feedback';
import {
  getCompletedWorkoutSets, getAllExercises, getAllWorkouts, updateWorkout,
  getActivePlan, getRoutinesForPlan, advancePlanNextWorkout,
  createAdaptationEvent, getCurrentMesocycleWeek,
  saveWeeklyCheckin, saveNextTimeNote, getRoutineWorkoutTonnages,
  getRoutineById, getWorkoutById, getOpenEdPatternFlag,
} from '../lib/database';
import { isCalm, WELLBEING_KEY } from '../lib/wellbeing';
import { claimMilestones } from '../lib/milestones';
import { selection as hapticSelection, prAchieved as hapticMilestone } from '../lib/haptics';
import { MilestoneBurst } from '../components/PRCelebration';
import ProgressPhotoPrompt from '../components/ProgressPhotoPrompt';
import usePartners from '../hooks/usePartners';
import { ticksLabel } from '../lib/partners/signals';
import { getVisibleMoments, markMomentSeen } from '../lib/partners/moments';
import { calculateWeeklyVolume, getVolumeStatus, MUSCLE_DISPLAY_NAMES, runAdaptiveEngine } from '../lib/algorithms';
import { getVolumeInsight, getVolumeWhy } from '../lib/volumeInsightCopy';
import { topSetFromExerciseData, intensityTier, shareSessionName } from '../lib/sessionShareData';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useToast } from '../components/Toast';
import { syncWorkout } from '../lib/sync';
import { incrementSessionCount, shouldPromptReview, requestReview } from '../lib/storeReview';
import { workoutDayMs } from '../lib/workoutDate';
import { localWeekStartMs } from '../lib/dayKey';
import { navigateCrossTab } from '../navigation/navigateCrossTab';
import { logError } from '../lib/errorLog';

// COMP-008: soreness, energy and sleep moved to the pre-workout intent prompt
// (captured where they are accurate). The post-workout block keeps only the
// three session-response ratings plus fatigue.
const RATING_LABELS = {
  sessionDifficulty: ['', 'Very Easy', 'Easy', 'Moderate', 'Hard', 'Brutal'],
  overallPump: ['', 'None', 'Mild', 'Good'],
  fatigueLevel: ['', 'Fresh', 'Mild', 'Moderate', 'High', 'Exhausted'],
  jointDiscomfort: ['None', 'Slight', 'Moderate', 'Significant'],
};

function formatPartnerWinDate(value) {
  const n = Number(value);
  const date = new Date(Number.isFinite(n) ? n : Date.now());
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function partnerRecordLabel(pr = {}) {
  if (pr.type === 'heaviest_weight') return 'New heaviest weight';
  return 'New rep best';
}

function partnerCheerFailureMessage(error) {
  if (error === 'not_active') return 'That partnership is no longer active. Refresh Partners and try again.';
  return 'Could not send that cheer. Check your connection and try again.';
}

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
    // COMP-015: the session's nonzero adjustments, passed from the finish flow
    // ([{ muscle, setDelta }]). Live path only; history (readOnly) has none.
    sessionAdjustments = [],
  } = route.params || {};
  // F7: subscribe to just these fields (a bare useAppStore() re-renders on every store mutation).
  const { user, units, userProfile, session, tier } = useAppStore(useShallow(s => ({
    user: s.user,
    units: s.units,
    userProfile: s.userProfile,
    session: s.session,
    tier: s.tier,
  })));
  const toast = useToast();
  // NEW-002 rebuild: the post-workout partner beat (Duolingo's post-lesson
  // nudge is the highest-value re-engagement moment). Renders only when
  // paired, live path, and not calm/ED-suppressed.
  const partners = usePartners(user?.id, tier);
  // Renamed to feedbackSheet to avoid clashing with the per-set
  // feedback state below (sessionDifficulty, overallPump, etc.).
  // Both live in the same scope, JS doesn't let two consts share a
  // name in the same block.
  const feedbackSheet = useFeedback();
  const [feedback, setFeedback] = useState({
    sessionDifficulty: 3,
    overallPump: 2,
    fatigueLevel: 2,
    jointDiscomfort: 0,
  });
  // COMP-008: soreness and sleep are now captured before the session and live
  // on the workout row. The summary reads them back so the adaptive engine
  // still gets a soreness input and the weekly recovery record still receives a
  // sleep value, both sourced from the more accurate pre-workout capture.
  const [preWorkoutReadiness, setPreWorkoutReadiness] = useState({
    soreness24hBefore: null,
    sleepQuality: null,
  });
  const [notes, setNotes] = useState('');
  const [nextTimeNote, setNextTimeNote] = useState('');
  // The day's name (e.g. "Back + Delts (Width)") for the share card title.
  // The summary is reached with routineId but not the name, so fetch it.
  const [routineName, setRoutineName] = useState('');
  const [weeklyVolume, setWeeklyVolume] = useState({});
  const [saving, setSaving] = useState(false);
  const [completedWorkoutCount, setCompletedWorkoutCount] = useState(null);
  // COMP-013: the calibrated first-session acknowledgement, shown only on the
  // live summary of a user's very first completed session. null = not the first
  // session, or suppressed under calmer experience / an open ED pattern flag
  // (the header's neutral "Workout complete" is acknowledgement enough; no push).
  const [firstSessionLine, setFirstSessionLine] = useState(null);
  // D1 (int-04 F1): the beginner early-win ladder. The single milestone rung
  // crossed by this session (first_week, 5/10/25/50/100 sessions), or null.
  // Claimed once per rung from local workout rows; inherits the same calm/ED
  // suppression as firstSessionLine. PRs are owned by PRCelebration and the
  // first session by COMP-013, so neither double-celebrates here.
  const [milestone, setMilestone] = useState(null);
  // D2: the gold particle burst for the big rungs (50/100 sessions).
  const [milestoneBurst, setMilestoneBurst] = useState(false);
  // D2: calm-mode / open-ED suppression flag for the peak-surface celebratory
  // cards (the programme-arc strip + the phase-completion card). Set once from
  // the shared wellbeing read in loadVolumeAndHistory.
  const [calmSuppressed, setCalmSuppressed] = useState(false);
  // C3 milestone moment for the post-workout partner beat: when the engine has a
  // moment for the active pair, the beat shows its calm line (with the same
  // inline cheer) instead of the generic tick line. getVisibleMoments already
  // applies the fail-closed ED/calm/SCOFF suppression and the frequency caps, so
  // this holds null under any suppressed state. Marked seen on cheer or unmount.
  const [partnerMoment, setPartnerMoment] = useState(null);
  const partnerMomentRef = useRef(null);
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

  // C3 milestone moment: only when the beat itself would render (paired live
  // path, Pro, not calm/ED-suppressed). getVisibleMoments is fail-closed and
  // additionally suppresses internally, so this is a second gate, never the
  // safety boundary. Keeps the ref in step for the unmount mark-seen.
  const beatEligible = !readOnly && !calmSuppressed && tier === 'pro'
    && (partners.rowState === 'active' || partners.rowState === 'resting');
  const activePairId = partners.partnership?.id;
  useEffect(() => {
    let cancelled = false;
    if (!beatEligible || !user?.id || !activePairId) {
      setPartnerMoment(null);
      partnerMomentRef.current = null;
      return undefined;
    }
    getVisibleMoments(user.id).then((moments) => {
      if (cancelled) return;
      const m = (moments || []).find((x) => x.pairId === activePairId) || null;
      setPartnerMoment(m);
      partnerMomentRef.current = m;
    }).catch(() => { /* fail quiet: the beat falls back to the tick line */ });
    return () => { cancelled = true; };
  }, [beatEligible, user?.id, activePairId]);

  // Mark the moment seen on unmount (the user saw it). Cheer marks it too.
  useEffect(() => () => {
    if (partnerMomentRef.current?.id) markMomentSeen(partnerMomentRef.current.id).catch(() => {});
  }, []);

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

  // COMP-008: pull the pre-workout soreness + sleep off the workout row so the
  // engine and the weekly sleep write read the concurrent capture rather than a
  // post-session rating. A Skip-started (or pre-COMP-008) session leaves these
  // null, which both readers already treat as a neutral default.
  useEffect(() => {
    if (readOnly || !workoutId) return;
    let cancelled = false;
    (async () => {
      try {
        const w = await getWorkoutById(workoutId);
        if (!cancelled && w) {
          setPreWorkoutReadiness({
            soreness24hBefore: w.soreness24hBefore ?? null,
            sleepQuality: w.sleepQuality ?? null,
          });
        }
      } catch (_e) {}
    })();
    return () => { cancelled = true; };
  }, [readOnly, workoutId]);

  // COMP-005: block-end recap. When the session just finished sits in the final
  // planned week of the active mesocycle, offer the block story in-flow (no
  // push needed, the user is right here). Heuristic detection: there is no
  // status='completed' writer, so the final-week reached (weekIndex >=
  // plannedWeeks) is the signal, tolerant of training past the planned end.
  const [blockStory, setBlockStory] = useState(null);
  // D2: the current mesocycle week, for the "Week N of M" programme-arc strip.
  const [mesoWeek, setMesoWeek] = useState(null);
  useEffect(() => {
    if (readOnly || !user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const wk = await getCurrentMesocycleWeek(user.id);
        if (cancelled || !wk) return;
        setMesoWeek(wk);
        if (wk.mesocycleId && wk.plannedWeeks > 0 && wk.weekIndex >= wk.plannedWeeks) {
          setBlockStory({ mesocycleId: wk.mesocycleId, name: wk.mesoName });
        }
      } catch (_e) {}
    })();
    return () => { cancelled = true; };
  }, [readOnly, user?.id]);

  useEffect(() => {
    // Map feedback to adaptive engine scales per muscle, then run adaptive engine
    // soreness24hBefore: 1=fresh→2, 2=mild→3, 3=sore→4 (now sourced pre-workout)
    // sessionDifficulty: 1=veryEasy→1(exceeded), 2=easy→1, 3=moderate→2(met), 4=hard→3(struggled), 5=brutal→4(failed)
    // overallPump: 1=none→1, 2=mild→2, 3=good→4
    // jointDiscomfort: 0=none→0, 1=slight→1, 2=moderate→2, 3=significant→3
    const soreness = [0, 2, 3, 4][preWorkoutReadiness.soreness24hBefore - 1] ?? 2;
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
  }, [feedback, weeklyVolume, preWorkoutReadiness]);

  useEffect(() => {
    if (!workoutId || readOnly) return;
    if (feedbackDebounceRef.current) clearTimeout(feedbackDebounceRef.current);
    feedbackDebounceRef.current = setTimeout(async () => {
      try {
        await updateWorkout(workoutId, {
          sessionDifficulty: feedback.sessionDifficulty,
          overallPump: feedback.overallPump,
          // COMP-008: soreness_24h_before is written pre-session by
          // createWorkout; the summary no longer rates or writes it, so it
          // must not be sent here or it would clobber the pre-workout value.
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

    // COMP-013 + D1: the first-session line and the early-win milestone ladder
    // share one wellbeing read. Live summary only (never the read-only history
    // view). The just-finished workout is already marked complete by the time
    // this runs, so it is counted here.
    if (!readOnly) {
      const completedWorkouts = allWorkouts.filter(w => w.isCompleted);
      const totalCompleted = completedWorkouts.length;
      // Calm-mode / open-ED flag suppress BOTH surfaces. When suppressed we
      // skip the milestone claim entirely, so a rung crossed during a wellbeing
      // hold is caught and shown later rather than silently consumed.
      let calm = false;
      let edFlag = null;
      try {
        // Fail CLOSED: read the raw wellbeing flag rather than the memoised
        // getWellbeingMode() helper (which swallows storage errors down to
        // 'unspecified'). A genuine read failure here must suppress, not
        // silently fall through to an unsuppressed surface.
        const [mode, flag] = await Promise.all([
          AsyncStorage.getItem(WELLBEING_KEY).then((v) => v || 'unspecified').catch(() => 'read_failed'),
          user?.id ? getOpenEdPatternFlag(user.id).catch(() => 'read_failed') : Promise.resolve(null),
        ]);
        calm = isCalm(mode) || mode === 'read_failed';
        edFlag = flag;
      } catch (_) {}
      const suppressed = calm || !!edFlag;
      setCalmSuppressed(suppressed);

      // COMP-013: first completed session ever → the calibrated acknowledgement.
      if (totalCompleted === 1) {
        setFirstSessionLine(suppressed ? null : "Your first session is done, and that's the hard part over.");
      }

      // D1: claim the early-win milestone for this session. Skipped on the very
      // first session (COMP-013 owns that beat) and whenever suppressed. PRs are
      // owned by PRCelebration, so everHitPR is held false here, first_pr never
      // fires a second celebration on top of the PR burst.
      if (!suppressed && totalCompleted > 1 && user?.id) {
        try {
          const sessionDaysMs = completedWorkouts
            .map(w => w.startedAt)
            .filter(Number.isFinite);
          const shown = await claimMilestones(user.id, {
            sessionCount: totalCompleted,
            sessionDaysMs,
            everHitPR: false,
          });
          if (shown) {
            setMilestone(shown);
            // D2 (design audit 03 win #4): scale the payoff to the rung. The
            // big rungs (50/100 sessions) earn the gold particle burst and the
            // celebration haptic ladder; the earlier rungs keep the quiet
            // tick. Same calm/ED suppression as the card (this branch), and
            // the burst itself renders nothing under reduce-motion.
            if (shown.key === 'sessions_50' || shown.key === 'sessions_100') {
              setMilestoneBurst(true);
              hapticMilestone();
            } else {
              hapticSelection();
            }
          }
        } catch (_) {}
      }
    }

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
        // COMP-008: soreness_24h_before is written pre-session by createWorkout;
        // not sent here so the post-workout save can't clobber it.
        jointDiscomfort: feedback.jointDiscomfort,
        fatigueLevel: feedback.fatigueLevel,
        notes: notes || null,
      });
    } catch (_e) {}

    // Contribute this session's sleep-quality rating to the week's recovery
    // record. This is the ONLY field WorkoutSummary writes to weekly_checkins:
    // sleep_quality is read by CoachReview + the recovery-trend insight, and the
    // weekly coach does NOT read it. Everything else this screen used to write
    // either duplicated a weekly-coach input on a conflicting scale (energy,
    // soreness, training_performance) or is sourced better elsewhere (per-session
    // soreness/fatigue live on the workouts row). The save is preserving, so
    // passing only sleepQuality leaves the user's calorie / steps / cardio /
    // training answers for the week untouched.
    //
    // COMP-008: sleep is now captured pre-session and lives on the workout row,
    // so the value comes from preWorkoutReadiness rather than a post-workout
    // rating. Only write when the lifter actually answered it, passing null
    // would clear a sleep value the weekly check-in (or an earlier session)
    // already set this week, since saveWeeklyCheckin treats explicit null as
    // "clear".
    if (user?.id && preWorkoutReadiness.sleepQuality != null) {
      try {
        await saveWeeklyCheckin(user.id, {
          // FF-006: attribute the sleep-quality rating to the workout's own
          // week, not the wall clock at summary-close time. A late or
          // cross-midnight close used to land it in the wrong weekly bucket.
          // localWeekStartMs is the locked-rule, local Monday-anchored helper.
          weekStart: localWeekStartMs(workoutDayMs({ startedAt, endedAt })),
          sleepQuality: preWorkoutReadiness.sleepQuality,
        });
      } catch (_e) {}
    }

    // Write adaptation events for engine decisions. These are an
    // in-session record of how each muscle responded (soreness /
    // performance / pump / joint), surfaced in the Engine Log on the Coach tab.
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

    // Count the completed session and ask for an App Store / Play Store
    // review once the habit gates pass (sessions + days, see storeReview.js).
    incrementSessionCount().then(() => {
      shouldPromptReview().then(should => { if (should) requestReview(); });
    }).catch(() => {});

    setSaving(false);
    navigation.popToTop();
  }

  function handleShareCard() {
    // Top set across the whole session, heaviest non-warmup set drives the
    // "best lift" highlight on the share card.
    const topSet = topSetFromExerciseData(exerciseData);

    // Intensity tier, drives the badge on the share card. Heuristic, but
    // gives a "great workout" flavour without needing a full grading system.
    const sets = workingSetCount ?? setCount ?? 0;
    const ton = tonnage || 0;
    const tier = intensityTier(detectedPRs.length, ton, sets);

    // Title with the real day name (e.g. "Back + Delts (Width)") when we have
    // it. Fall back to a join of the first exercises, then a generic label.
    const sessionName = shareSessionName(routineName, exerciseNames);
    const sessionData = {
      sessionName,
      duration: durationMinutes || 0,
      workingSets: sets,
      exerciseCount: exerciseCount || 0,
      tonnage: ton,
      exercises: exerciseNames,
      prCount: detectedPRs.length,
      topSet,
      intensityTier: tier,
    };
    const prData = detectedPRs.length > 0 ? detectedPRs[0] : null;
    // Pass every PR from the session so the share card can let the user choose
    // which one to feature (a session can set several); prData stays as the
    // first for back-compat.
    navigation.navigate('ShareCard', { sessionData, prData, prList: detectedPRs });
  }

  function handlePreviewPartnerWin() {
    const firstPr = detectedPRs.length > 0 ? detectedPRs[0] : null;
    const completedAt = formatPartnerWinDate(endedAt || startedAt || Date.now());
    if (firstPr) {
      navigateCrossTab(navigation, 'ProgressTab', 'Partner', {
        source: 'workout_summary_partner_win',
        shareWinType: 'personal_record',
        shareWinPayload: {
          liftName: firstPr.exerciseName || firstPr.exercise || 'A lift',
          recordLabel: partnerRecordLabel(firstPr),
        },
      });
      return;
    }
    navigateCrossTab(navigation, 'ProgressTab', 'Partner', {
      source: 'workout_summary_partner_win',
      shareWinType: 'workout_summary',
      shareWinPayload: {
        workoutName: shareSessionName(routineName, exerciseNames),
        completedAt,
      },
    });
  }

  async function handlePostWorkoutCheer() {
    if (!partners?.cheerEnabled) return;
    if (!partners.partnership?.id) {
      toast.show('Refresh Partners and try again.', { variant: 'error' });
      return;
    }
    const reciprocal = partners.partnerWeek?.weekMet || (partners.partnerWeek?.done > 0);
    const result = await partners.cheer(partners.partnership.id, undefined, !!reciprocal);
    if (result?.ok || result?.error === 'already_cheered') {
      if (partnerMoment?.id) {
        markMomentSeen(partnerMoment.id).catch(() => {});
        partnerMomentRef.current = null;
        setPartnerMoment(null);
      }
      toast.show(result?.error === 'already_cheered' ? 'Cheer already sent today' : 'Cheer sent', { variant: 'success' });
      return;
    }
    logError('WorkoutSummaryScreen.postWorkoutCheer', new Error(result?.error || 'unknown'), { userId: user?.id });
    toast.show(partnerCheerFailureMessage(result?.error), { variant: 'error' });
  }

  // D2 (decision 4b: share artefacts are FREE): a 2-tap share of the early-win
  // milestone, reusing ShareCard's generic milestone layout. No Pro gate.
  function handleShareMilestone() {
    if (!milestone) return;
    navigation.navigate('ShareCard', {
      milestoneData: {
        eyebrow: 'Milestone',
        title: milestone.title,
        heroValue: milestone.heroValue ?? '',
        heroUnit: milestone.heroUnit ?? '',
        caption: milestone.body,
        date: Date.now(),
      },
    });
  }

  // D2: share the phase-completion (a block finished) as a free artefact.
  function handleShareBlock() {
    if (!blockStory) return;
    const weeks = mesoWeek?.plannedWeeks;
    navigation.navigate('ShareCard', {
      milestoneData: {
        eyebrow: 'Block complete',
        title: blockStory.name || 'Training block complete',
        heroValue: Number.isFinite(weeks) ? String(weeks) : '',
        heroUnit: Number.isFinite(weeks) ? 'weeks trained' : '',
        caption: 'A full training block, recovery week and all.',
        date: Date.now(),
      },
    });
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

  // Photos LOOP-3 (D4): the competence-event id the photo invitation dedupes on.
  // COMPETENCE ONLY — a claimed session/consistency milestone (its stable rung
  // key), else a new PB this session (keyed per workout so it fires at most once
  // per session). Never a weigh-in, bodyweight, body-composition or appearance
  // event. Null on the read-only history view and when no competence win fired,
  // so ProgressPhotoPrompt renders nothing. The prompt re-gates on suppression /
  // Pro / opt-out / frequency itself.
  const photoPromptMilestoneId = readOnly
    ? null
    : milestone?.key
      ? `milestone:${milestone.key}`
      : detectedPRs.length > 0
        ? `pb:${workoutId}`
        : null;

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
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {readOnly ? <BackHeader title="Workout summary" /> : null}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.completionHeader}>
          <View style={styles.checkRow}>
            <Ionicons name="checkmark-circle" size={28} color={colors.success} />
            <Text style={styles.completionTitle}>Workout complete</Text>
          </View>
          <Text style={styles.completionDate}>{completionDate}</Text>
          {firstSessionLine ? (
            <Text style={styles.firstSessionLine}>{firstSessionLine}</Text>
          ) : null}
        </View>

        {/* D1 (int-04 F1): the early-win milestone card, the celebratory beat
            for a beginner crossing first week / 5 / 10 / 25 / 50 / 100 sessions.
            Sits at the top emotional peak, only rendered on the rare session a
            rung is crossed (and never under calm/ED). Calm in tone, not loud. */}
        {milestone ? (
          <RevealSection delay={120}>
            <View style={styles.milestoneCard}>
              <View style={styles.milestoneIconWrap}>
                <Ionicons name={milestone.icon} size={22} color={colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.milestoneTitle}>{milestone.title}</Text>
                <Text style={styles.milestoneBody}>{milestone.body}</Text>
              </View>
              <TouchableOpacity
                style={styles.milestoneShareBtn}
                onPress={handleShareMilestone}
                accessibilityRole="button"
                accessibilityLabel="Share this milestone"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="share-social-outline" size={18} color={colors.gold} />
              </TouchableOpacity>
            </View>
          </RevealSection>
        ) : null}

        {/* D3 (design audit 03): tonnage is THE headline. One elevated hero
            card carrying the display-size animated counter, with the 4-week
            comparison verdict fused into it; the remaining three stats step
            down to a compact row below. The hero is the screen's single
            amber object (the numeral); everything else is neutral or tint. */}
        <View style={styles.heroCard}>
          <StatBox
            hero
            value={`${Math.round(tonnage || 0).toLocaleString('en-GB')} kg`}
            label="Total lifted"
            tooltip={'Total weight moved this session: sets × reps × weight added together. A rough measure of how much work you did. More is not always better; quality of effort matters more than raw numbers.'}
          />
          {/* 4-week comparison verdict, fused into the hero so "your number"
              and "how it compares" read as one statement. Only when we have
              at least one prior session of this routine. */}
          {comparison && comparison.priorCount > 0 && (() => {
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
              sub = `Sessions vary with recovery, sleep and stress. The 4-week trend carries more signal than any single session.`;
              accent = colors.textSecondary;
            } else {
              headline = `On pace with your last ${priorCount} session${priorCount !== 1 ? 's' : ''}`;
              sub = `Within ±10% of your 4-week average. Consistency is the goal.`;
              // Neutral, not amber: the hero numeral is this screen's one
              // amber object (design audit 03 amber-inflation rule).
              accent = colors.textPrimary;
            }
            return (
              <View style={styles.verdictRow}>
                <Ionicons
                  name={verdict === 'best' ? 'trophy-outline' : verdict === 'up' ? 'trending-up-outline' : verdict === 'down' ? 'trending-down-outline' : 'analytics-outline'}
                  size={16}
                  color={accent}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.verdictHeadline, { color: accent }]}>{headline}</Text>
                  <Text style={styles.verdictSub}>{sub}</Text>
                </View>
              </View>
            );
          })()}
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
        </View>

        {/* NEW-002 rebuild: the post-workout partner beat, where a cheer is
            most natural (you just trained; here is where your partner stands).
            Paired + live path only; inherits calm/ED suppression; a resting
            partner never reads as a fail. */}
        {!readOnly && !calmSuppressed && tier === 'pro'
          && (partners.rowState === 'active' || partners.rowState === 'resting') && (
          <RevealSection delay={1130}>
            <View style={styles.partnerBeatRow}>
              <View style={styles.partnerBeatTop}>
                <Ionicons name="people-outline" size={18} color={colors.primary} />
                <Text style={styles.partnerBeatText}>
                  {partnerMoment
                    ? partnerMoment.line
                    : partners.rowState === 'resting'
                      ? `${partners.partnership?.partnerFirstName || 'Your partner'} is resting this week.`
                      : `${partners.partnership?.partnerFirstName || 'Your partner'}: ${ticksLabel({ done: partners.partnerWeek?.done, planned: partners.partnerWeek?.planned })} this week.`}
                </Text>
              </View>
              <View style={styles.partnerBeatActions}>
                <TouchableOpacity
                  style={styles.partnerWinBtn}
                  onPress={handlePreviewPartnerWin}
                  accessibilityRole="button"
                  accessibilityLabel="Preview this workout win for a partner"
                >
                  <Ionicons name="trophy-outline" size={14} color={colors.primary} />
                  <Text style={styles.partnerCheerText}>Preview win</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.partnerCheerBtn, !partners.cheerEnabled && styles.partnerCheerBtnDone]}
                  onPress={handlePostWorkoutCheer}
                  disabled={!partners.cheerEnabled}
                  accessibilityRole="button"
                  accessibilityLabel={partners.cheerEnabled ? 'Send a cheer' : 'Cheer sent'}
                >
                  <Ionicons name="hand-left-outline" size={14} color={partners.cheerEnabled ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.partnerCheerText, !partners.cheerEnabled && styles.partnerCheerTextDone]}>
                    {partners.cheerEnabled ? 'Cheer' : 'Sent'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </RevealSection>
        )}

        {/* D2: programme-arc strip, where this session sits in the block, so
            the work reads as a journey towards the recovery week, not an
            open-ended grind. Suppressed under calm/ED; needs a real ≥2-week
            block. Reuses the same BlockShapeCard as Home and Consistency. */}
        {!readOnly && !calmSuppressed && mesoWeek?.plannedWeeks >= 2 && (
          <RevealSection delay={1160}>
            <View style={styles.blockArcSection}>
              <Text style={styles.sectionTitle}>Your block</Text>
              {mesoWeek.mesoName ? (
                <Text style={styles.blockArcName}>{mesoWeek.mesoName}</Text>
              ) : null}
              <BlockShapeCard
                weekIndex={mesoWeek.weekIndex}
                plannedWeeks={mesoWeek.plannedWeeks}
                isDeload={mesoWeek.isDeload}
                compact
              />
            </View>
          </RevealSection>
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
                            {s.weight > 0 ? `${s.weight}${units}` : 'BW'} x {s.reps}
                          </Text>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.exerciseListMeta}>
                        {ex.recommendedSets} x {ex.repsMin}-{ex.repsMax}
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
              {prExerciseNames ? ` - ${prExerciseNames}` : ''}
            </Text>
          </View>
          </RevealSection>
        )}

        {/* Photos LOOP-3 (D4): the calm, opt-in "mark the moment" invitation,
            appended inside the celebration surface on a competence win only (a
            PB or a session-streak milestone). ProgressPhotoPrompt owns every
            gate itself (fail-closed suppression, Pro, permanent opt-out, ≤1/day
            + per-milestone dedupe); a null milestone id renders nothing. */}
        {photoPromptMilestoneId ? (
          <RevealSection delay={1400}>
            <ProgressPhotoPrompt
              milestoneId={photoPromptMilestoneId}
              tier={tier}
              onAddPhoto={() => navigation.navigate('ProgressPhotos')}
            />
          </RevealSection>
        ) : null}

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
            {/* D3: one compressed card, hairline dividers between muscles,
                instead of a stack of same-weight bordered cards. */}
            <View style={styles.volumeCard}>
            {musclesWorked.map((muscle, mi) => {
              const data = weeklyVolume[muscle];
              const { label, status } = getVolumeStatus(data.workingSets, muscle);
              const color = volumeStatusColor(status);
              const insight = getVolumeInsight(muscle, data.workingSets, status);
              const why = getVolumeWhy(muscle, data.workingSets, status);
              const isExpanded = expandedVolumeWhy === muscle;
              return (
                <View key={muscle} style={[styles.volumeRow, mi === musclesWorked.length - 1 && styles.volumeRowLast]}>
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
          </View>
          </RevealSection>
        )}

        {/* COMP-005 + D2: block-end recap. Under calm/ED this stays the quiet
            neutral link (the recap is still reachable, no celebration cues). */}
        {!readOnly && blockStory && calmSuppressed && (
          <RevealSection delay={1480}>
            <TouchableOpacity
              style={styles.blockRecapRow}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('RecapStory', { variant: 'block', mesocycleId: blockStory.mesocycleId, blockName: blockStory.name })}
              accessibilityRole="button"
              accessibilityLabel="Watch your block story"
            >
              <Ionicons name="sparkles" size={16} color={colors.primary} />
              <Text style={styles.blockRecapText}>You&apos;ve finished this block. Have a look back at how it went.</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </TouchableOpacity>
          </RevealSection>
        )}

        {/* D2: phase-completion celebration card, the full beat when a block's
            final week closes (recap line + what's next), with the block story
            and a free share artefact (decision 4b). Suppressed under calm/ED,
            which falls back to the neutral link above. */}
        {!readOnly && blockStory && !calmSuppressed && (
          <RevealSection delay={1480}>
            <View style={styles.phaseCard}>
              <View style={styles.phaseHeaderRow}>
                <Ionicons name="flag" size={18} color={colors.gold} />
                <Text style={styles.phaseTitle}>Block complete</Text>
              </View>
              {blockStory.name ? (
                <Text style={styles.phaseName}>{blockStory.name}</Text>
              ) : null}
              <Text style={styles.phaseRecap}>
                {Number.isFinite(mesoWeek?.plannedWeeks)
                  ? `${mesoWeek.plannedWeeks} weeks done, recovery week and all. A full training block, in the bank.`
                  : 'A full training block, recovery week and all, in the bank.'}
              </Text>
              <Text style={styles.phaseNext}>
                What's next: a new block, starting a little heavier than the last. That is how progress compounds over months, not just weeks.
              </Text>
              <View style={styles.phaseActions}>
                <TouchableOpacity
                  style={styles.phaseActionBtn}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('RecapStory', { variant: 'block', mesocycleId: blockStory.mesocycleId, blockName: blockStory.name })}
                  accessibilityRole="button"
                  accessibilityLabel="Watch your block story"
                >
                  <Ionicons name="sparkles" size={15} color={colors.primary} />
                  <Text style={styles.phaseActionText}>Watch your block story</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.phaseShareBtn}
                  activeOpacity={0.85}
                  onPress={handleShareBlock}
                  accessibilityRole="button"
                  accessibilityLabel="Share block complete"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="share-social-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </RevealSection>
        )}

        {/* COMP-015: confirmation row, closes the loop at the moment the user
            is about to give the next round of feedback. Live path only. */}
        {!readOnly && sessionAdjustments.length > 0 && (
          <RevealSection delay={1520}>
            <View style={styles.adjustedSummaryRow}>
              <Ionicons name="sparkles" size={15} color={colors.primary} />
              <Text style={styles.adjustedSummaryText}>
                Adjusted today: {sessionAdjustments.map(a =>
                  `${(MUSCLE_DISPLAY_NAMES[a.muscle] || a.muscle).toLowerCase()}, ${a.setDelta < 0 ? '1 set fewer' : '1 set added'}`,
                ).join(' - ')}
              </Text>
            </View>
          </RevealSection>
        )}

        {/* D3 (design audit 03): the "tell the coach" zone, the session's
            inputs grouped into ONE distinct card at the end, separated from
            the celebratory "what happened" zone above. Same controls, same
            handlers; only the grouping and header treatment changed. */}
        {!readOnly && (
          <RevealSection delay={1580}>
          <View style={styles.coachZoneCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Tell your coach</Text>
              <Text style={styles.optionalLabel}>optional</Text>
            </View>
            <Text style={styles.coachZoneSubHeading}>How did it feel?</Text>
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
                {/* COMP-008: Soreness, Energy and Sleep moved to the
                    pre-workout intent prompt. The block keeps the three session
                    responses you can only judge once the work is done, plus
                    fatigue. */}
                <RatingRow label="Difficulty" field="sessionDifficulty" value={feedback.sessionDifficulty} max={5} onChange={v => setFeedback(f => ({ ...f, sessionDifficulty: v }))} />
                <RatingRow label="Muscle engagement" field="overallPump" value={feedback.overallPump} max={3} onChange={v => setFeedback(f => ({ ...f, overallPump: v }))} />
                <RatingRow label="Joint discomfort" field="jointDiscomfort" value={feedback.jointDiscomfort} max={3} onChange={v => setFeedback(f => ({ ...f, jointDiscomfort: v }))} />
                <RatingRow label="Fatigue" field="fatigueLevel" value={feedback.fatigueLevel} max={5} onChange={v => setFeedback(f => ({ ...f, fatigueLevel: v }))} />
                <TextField accessibilityLabel="Session feedback notes"
                  fieldStyle={styles.notesField}
                  inputStyle={styles.notesInput}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Anything notable from this session..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                />
              </View>
            )}
            <View style={styles.coachZoneDivider} />
            <Text style={styles.coachZoneSubHeading}>Notes for next time</Text>
            <TextField accessibilityLabel="Notes for next time"
              fieldStyle={styles.nextTimeNoteField}
              inputStyle={styles.nextTimeNoteInput}
              value={nextTimeNote}
              onChangeText={setNextTimeNote}
              placeholder="Anything to remember for next session? e.g. try 85kg, wider grip, reduce volume..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>
          </RevealSection>
        )}

        {!readOnly && !routineId && exerciseData.length > 0 && (
          <RevealSection delay={1700}>
          <View style={styles.secondaryActions}>
            <Button
              title="Save as Workout Template"
              variant="secondary"
              icon="bookmark-outline"
              style={styles.templateBtn}
              textStyle={styles.templateBtnText}
              onPress={handleSaveAsTemplate}
              accessibilityLabel="Save as workout template"
            />
          </View>
          </RevealSection>
        )}
      </ScrollView>

      {/* Flat token, NOT insets.bottom: the tab band renders below this
          screen and already absorbs the system inset, so adding it here
          doubled the gap under Close (founder screenshot 2026-07-03). The
          inverse case, ActiveWorkout, where the band hides, is the one
          that needs the inset; bottomBarInset.guard.test.js pins both. */}
      <View style={[styles.stickyFooter, { paddingBottom: spacing.lg }]}>
        <View style={styles.footerRow}>
          <Button
            title="Close"
            variant="secondary"
            size="lg"
            style={styles.doneBtn}
            textStyle={styles.doneBtnText}
            onPress={handleDone}
            disabled={saving}
            accessibilityLabel="Close"
            accessibilityState={{ disabled: saving }}
          />
          {!readOnly && (
            <Button
              title="Share"
              variant="outline"
              size="lg"
              icon="share-social-outline"
              fullWidth={false}
              style={styles.shareFooterBtn}
              textStyle={styles.shareFooterBtnText}
              onPress={handleShareCard}
              accessibilityLabel="Share session card"
            />
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
            <TextField accessibilityLabel="Workout template name"
              fieldStyle={styles.templateModalField}
              inputStyle={styles.templateModalInput}
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
              <Button
                title="Cancel"
                variant="secondary"
                fullWidth={false}
                style={styles.templateModalCancel}
                onPress={() => setTemplateModalVisible(false)}
                accessibilityLabel="Cancel"
                textStyle={styles.templateModalCancelText}
              />
              <Button
                title="Save"
                fullWidth={false}
                style={styles.templateModalSave}
                onPress={confirmSaveTemplate}
                disabled={!templateName.trim()}
                accessibilityLabel="Save template"
                accessibilityState={{ disabled: !templateName.trim() }}
                textStyle={styles.templateModalSaveText}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* D2: gold burst over the summary for the 50/100-session rungs. Set
          only inside the calm/ED-suppressed-free branch; renders nothing
          under reduce-motion; never blocks taps. */}
      {milestoneBurst ? <MilestoneBurst onDone={() => setMilestoneBurst(false)} /> : null}
    </SafeAreaView>
  );
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
      Animated.timing(opacity, { toValue: 1, duration: motion.enter, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: motion.enter, delay, useNativeDriver: true }),
    ]).start();
  }, [delay, reduceMotion, opacity, translateY]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

// StatBox renders a single stat. When the value is a pure
// number-like string (no letters), the value animates from 0 up to
// the target across ~900ms with an ease-out curve. The user sees
// "Total kg: 4,000 → 8,432 → 12,800" tick by rather than the number
// just appearing, gives the summary a cinematic beat. Reduce-motion
// users get the final value immediately.
//
// D3: `hero` renders the same animated counter at display size for the
// screen's one headline number (tonnage), without the box chrome; the
// three compact boxes below keep the original treatment.
function StatBox({ icon, value, label, tooltip, animateOrder = 0, hero = false }) {
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

  const opacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(reduceMotion ? 0 : 8)).current;
  const delay = animateOrder * 80;

  useEffect(() => {
    if (reduceMotion) return;
    // Staggered reveal, each StatBox starts ~80ms after the previous
    // one. Gives the grid a left-to-right shimmer rather than four
    // boxes appearing simultaneously.
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: motion.enter, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: motion.enter, delay, useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // E9/E15-4: the count-up rides RollingNumber on the UI thread (the old
  // requestAnimationFrame counter re-rendered this box every frame).
  // Non-numeric values render static, as before.
  const numeral = (textStyle) => (parsed ? (
    <RollingNumber
      value={parsed.num}
      from={0}
      delayMs={delay}
      suffix={parsed.suffix}
      style={textStyle}
      accessibilityLabel={String(value)}
    />
  ) : (
    <Text style={textStyle}>{value}</Text>
  ));

  if (hero) {
    return (
      <Animated.View style={[styles.heroValueWrap, { opacity, transform: [{ translateY }] }]}>
        {numeral(styles.heroValue)}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xxs }}>
          <Text style={styles.heroValueLabel}>{label}</Text>
          {tooltip ? <InfoTooltip size={11} text={tooltip} /> : null}
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.statBox, { opacity, transform: [{ translateY }] }]}>
      <Ionicons name={icon} size={20} color={colors.textSecondary} />
      {numeral(styles.statValue)}
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
  firstSessionLine: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary, marginTop: spacing.xs },
  // D1 early-win milestone card. Gold accent (an achievement beat, kin to the
  // PR row) but calm: a soft surface card, no confetti, no full-screen takeover.
  milestoneCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: withAlpha(colors.gold, 0.376),
  },
  milestoneIconWrap: {
    width: 40, height: 40, borderRadius: circle(40),
    backgroundColor: withAlpha(colors.gold, 0.125),
    alignItems: 'center', justifyContent: 'center',
  },
  milestoneTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
  milestoneBody: { ...type.captionTight, color: colors.textSecondary, marginTop: 3 },
  milestoneShareBtn: {
    width: 36, height: 36, borderRadius: circle(36),
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: withAlpha(colors.gold, 0.125),
  },
  // D2 phase-completion celebration card.
  phaseCard: {
    gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: withAlpha(colors.gold, 0.376),
  },
  phaseHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  phaseTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
  phaseName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary },
  phaseRecap: { ...type.bodySm, color: colors.textSecondary },
  phaseNext: { ...type.captionTight, color: colors.textMuted },
  phaseActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xxs },
  phaseActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    paddingVertical: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: withAlpha(colors.primary, 0.376),
  },
  phaseActionText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary },
  phaseShareBtn: {
    width: 44, height: 44, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: withAlpha(colors.primary, 0.376),
  },
  // NEW-002 post-workout partner beat
  partnerBeatRow: {
    gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  partnerBeatTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  partnerBeatText: { ...type.bodySm, flex: 1, color: colors.textPrimary },
  partnerBeatActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  // D3: amber tint, not a second amber fill, the hero numeral is this
  // screen's one amber object.
  partnerWinBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.surface2, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 40,
  },
  partnerCheerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.primaryBg, borderRadius: radius.full,
    borderWidth: 1, borderColor: withAlpha(colors.primary, alpha.edge),
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 40,
  },
  partnerCheerBtnDone: {
    backgroundColor: withAlpha(colors.border, alpha.edge),
    borderColor: colors.border,
  },
  partnerCheerText: { ...type.label, color: colors.primary, fontSize: fontSize.xs },
  partnerCheerTextDone: { color: colors.textSecondary },
  // D2 programme-arc strip wrapper, surface card matching the other summary
  // sections, holding the reused BlockShapeCard (dots + effort word).
  blockArcSection: {
    gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  blockArcName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  // D3 hero: the one elevated object on the screen (surfaceElevated ranks
  // the hero, design audit 03 rule 4), carrying the display-size tonnage.
  heroCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
    alignItems: 'center',
  },
  heroValueWrap: { alignItems: 'center', gap: spacing.xs },
  heroValue: { ...type.num('display'), color: colors.primary },
  heroValueLabel: { ...type.caption, color: colors.textSecondary },
  verdictRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    alignSelf: 'stretch',
    borderTopWidth: 1, borderTopColor: colors.borderSubtle,
    paddingTop: spacing.md,
  },
  verdictHeadline: { ...type.bodyStrong },
  verdictSub: { ...type.captionTight, color: colors.textMuted, marginTop: spacing.xxs },
  // The three remaining stats step down to one compact row under the hero.
  statsGrid: { flexDirection: 'row', gap: spacing.md },
  statBox: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, alignItems: 'center', gap: spacing.xs, borderWidth: 1, borderColor: colors.border,
  },
  statValue: { ...type.num('h3'), color: colors.textPrimary },
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
  // D3: real section headers (design audit 03 rule 3), the D0 `title` role,
  // not a body-sized label.
  sectionTitle: { ...type.title, color: colors.textPrimary },
  optionalLabel: { ...type.caption, color: colors.textMuted },
  // D3: the weekly-volume rows live in ONE card with hairline dividers.
  volumeCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
  },
  volumeRow: {
    flexDirection: 'column', gap: spacing.xs,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
  },
  volumeRowLast: { borderBottomWidth: 0 },
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
  // D3 "tell the coach" zone: the session's inputs as one distinct card.
  coachZoneCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg, gap: spacing.md,
  },
  coachZoneSubHeading: { ...type.label, color: colors.textSecondary },
  coachZoneDivider: { height: 1, backgroundColor: colors.borderSubtle },
  feedbackToggleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface2, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  feedbackToggleBtnText: { fontSize: fontSize.md, color: colors.textSecondary, fontWeight: fontWeight.medium },
  feedbackCard: { gap: spacing.lg, paddingTop: spacing.xs },
  // COMP-015 confirmation row
  adjustedSummaryRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.primaryBg, borderRadius: radius.md,
    borderWidth: 1, borderColor: withAlpha(colors.primary, 0.251),
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.md,
  },
  adjustedSummaryText: { ...type.bodySm, flex: 1, color: colors.textSecondary },
  // COMP-005 block-end recap row
  blockRecapRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.primaryBg, borderRadius: radius.md,
    // D3: tinted edge, not a solid amber border (amber-inflation rule).
    borderWidth: 1, borderColor: withAlpha(colors.primary, alpha.edge),
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.md,
  },
  blockRecapText: { flex: 1, fontSize: fontSize.sm, color: colors.textPrimary, fontWeight: fontWeight.semibold },
  ratingRow: { gap: spacing.sm },
  ratingLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ratingLabel: { ...type.label, color: colors.textSecondary },
  ratingBtns: { flexDirection: 'row', gap: spacing.xs },
  ratingBtn: {
    width: 40, height: 40, borderRadius: radius.xl, backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border,
  },
  // D3: selected state uses the app-wide chip grammar (tint + amber edge,
  // see components/Chip.js), not a full amber fill.
  ratingBtnActive: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
  ratingBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textSecondary },
  ratingBtnTextActive: { color: colors.primary },
  ratingValueLabel: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.medium },
  notesField: { borderRadius: radius.md },
  notesInput: { ...type.body, padding: spacing.lg, minHeight: 80, textAlignVertical: 'top' },
  nextTimeNoteField: { borderRadius: radius.md },
  nextTimeNoteInput: {
    fontSize: fontSize.sm,
    padding: spacing.lg,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  secondaryActions: { gap: spacing.sm },
  templateBtn: {
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
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
  // D3: quiet close, the summary's job is done, so leaving it is not the
  // screen's hero. The tonnage numeral carries the one amber; the footer
  // actions are neutral (Close) and amber-outline (share).
  doneBtn: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    ...type.title,
    color: colors.textPrimary,
  },
  shareFooterBtn: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: withAlpha(colors.primary, alpha.strong),
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  shareFooterBtnText: {
    ...type.title,
    color: colors.primary,
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
  templateModalField: { borderRadius: radius.md },
  templateModalInput: { ...type.body, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
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
  templateModalSaveText: { ...type.label, color: colors.onPrimary },
});
