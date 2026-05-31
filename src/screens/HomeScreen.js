import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal, TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useScrollToTop } from '@react-navigation/native';
import { format } from 'date-fns';

import { colors, fontSize, fontWeight, spacing, radius, withAlpha, type } from '../styles/theme';
import AnimatedEntrance from '../components/AnimatedEntrance';
import { formatBodyWeightShort, stoneLbsToKg, parseBodyWeightToKg, kgToStoneLbsStrings, kgToLbs } from '../lib/units';
import { VolyumeIcon } from '../components/BrandMark';
import ScreenHeader from '../components/ScreenHeader';
import GradientCard from '../components/GradientCard';
import PressableCard from '../components/PressableCard';
import { buildDailyNarrative } from '../lib/dailyNarrative';
import { SkeletonCard } from '../components/Skeleton';
import Sparkline from '../components/Sparkline';
import StepsCard from '../components/StepsCard';
import { useToast } from '../components/Toast';
import {
  getAllWorkouts, getCompletedWorkoutSets, getActivePlan, getRoutinesForPlan,
  getAllRoutineExerciseCounts, createWorkout, getRoutineExercisesWithDetails,
  getWorkoutSetsForWorkout, getExerciseById,
  getCurrentMesocycleWeek, getPlannedMuscleVolume, getAllExercises,
  getMorningWeightToday, getMorningWeights, logMorningWeight, getProgressionTeaser,
  getRecentWorkoutFeedback, getLatestCoachOutput,
} from '../lib/database';
import { generateAndSavePlan } from '../lib/planAutoGen';
import { logError } from '../lib/errorLog';
import { calculateTonnage, calculateWeeklyVolume, MUSCLE_DISPLAY_NAMES, shouldDeload, VOLUME_LANDMARKS } from '../lib/algorithms';
import { seedRoutinesIfNeeded } from '../lib/seedRoutines';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import InfoTooltip from '../components/InfoTooltip';

// Soft targets used only to size the weekly progress bars, not enforced
const WEEK_TARGETS = { sessions: 5, sets: 80, volume: 15000 };

function getGreeting(firstName) {
  const h = new Date().getHours();
  const name = firstName ? `, ${firstName}` : '';
  if (h < 5)  return `Up early${name}.`;
  if (h < 12) return `Morning${name}.`;
  if (h < 17) return `Afternoon${name}.`;
  if (h < 21) return `Evening${name}.`;
  return `Late night${name}.`;
}

export default function HomeScreen({ navigation }) {
  const toast = useToast();
  const { user, userProfile, startWorkout, activeWorkout, tier, bodyWeightUnits } = useAppStore(
    useShallow(s => ({ user: s.user, userProfile: s.userProfile, startWorkout: s.startWorkout, activeWorkout: s.activeWorkout, tier: s.tier, bodyWeightUnits: s.bodyWeightUnits }))
  );
  // Cloud-sync version bumps when pullFromCloud finishes; HomeScreen
  // re-runs loadData so the empty state swaps for real data without
  // the user navigating away and back.
  const cloudSyncVersion = useAppStore(s => s.cloudSyncVersion);
  const bwu = bodyWeightUnits || 'st';

  const [weekStats, setWeekStats] = useState({ sessions: 0, sets: 0, volume: 0 });
  const [weekStreak, setWeekStreak] = useState(0);
  const [activePlan, setActivePlanData] = useState(null);
  const [nextWorkout, setNextWorkout] = useState(null);
  const [exerciseCounts, setExerciseCounts] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [planAllWorkouts, setPlanAllWorkouts] = useState([]);
  const [selectedWorkoutOverride, setSelectedWorkoutOverride] = useState(null);
  const [showChangeWorkout, setShowChangeWorkout] = useState(false);
  const [isStartingWorkout, setIsStartingWorkout] = useState(false);
  const [lastSession, setLastSession] = useState(null);
  const [lastSessionTonnage, setLastSessionTonnage] = useState(null);
  const [blockProgress, setBlockProgress] = useState([]);
  const [currentMesoWeek, setCurrentMesoWeek] = useState(null);
  const [latestCoachOutput, setLatestCoachOutput] = useState(null);
  // First-load flag, flipped false in loadData. While true, the
  // home screen renders skeleton cards in place of the main cards so
  // the user sees structure instantly on cold launch rather than a
  // blank screen until SQLite reads complete.
  const [initialLoading, setInitialLoading] = useState(true);
  const [coachBannerDismissed, setCoachBannerDismissed] = useState(false);
  const [todayWeight, setTodayWeight] = useState(null);       // logged weight for today
  const [recentWeights, setRecentWeights] = useState([]);     // last 14 entries for sparkline
  const [weightInput, setWeightInput] = useState('');          // draft for kg/lbs mode
  const [weightInputSt, setWeightInputSt] = useState('');     // stone field (st mode)
  const [weightInputStLbs, setWeightInputStLbs] = useState(''); // lbs field (st mode)
  const [savingWeight, setSavingWeight] = useState(false);
  // Hero narrative line at the top of Home: one-sentence story drawn
  // from the user's recent data ("Last session beat your 4-week
  // average by 14%"). Null when we don't have enough signal.
  const [dailyNarrative, setDailyNarrative] = useState(null);
  const [showCoachingNudge, setShowCoachingNudge] = useState(false);
  const [totalSessions, setTotalSessions] = useState(0);
  const [showIntentPrompt, setShowIntentPrompt] = useState(false);
  const [teaserInsight, setTeaserInsight] = useState(null);
  const [deloadSuggestion, setDeloadSuggestion] = useState(null);
  const [deloadDismissed, setDeloadDismissed] = useState(false);

  // Pre-workout coaching brief
  const [briefDismissed, setBriefDismissed] = useState(false);

  // Phase sync banner
  const [phaseMismatch, setPhaseMismatch] = useState(null); // { currentPhase, targetPhase } | null
  const [phaseBannerDismissed, setPhaseBannerDismissed] = useState(false);

  // Training schedule context
  const [scheduleContext, setScheduleContext] = useState(null); // null | { daysUntil, dayName }

  // Fatigue trend mini-graph
  const [fatigueSessions, setFatigueSessions] = useState([]); // array newest-first

  const pendingStartRef = React.useRef(null); // ({ routineId, initialExercises })

  const scrollRef = useRef(null);
  useScrollToTop(scrollRef);

  useEffect(() => {
    return navigation.getParent()?.addListener('tabPress', () => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
  }, [navigation]);

  function dismissCoachingNudge() {
    setShowCoachingNudge(false);
    AsyncStorage.setItem('@volyume_seen_coaching_nudge', 'true').catch(() => {});
  }

  useFocusEffect(
    useCallback(() => {
      // Reset starting flag when screen regains focus (prevents "Session in Progress"
      // flashing during the navigation transition away to ActiveWorkout)
      setIsStartingWorkout(false);
      if (user?.id) {
        if (!seeded) {
          seedRoutinesIfNeeded(user.id).catch(console.warn);
          setSeeded(true);
        }
        loadData();
      }
    }, [user?.id]),
  );

  // Re-fetch when a cloud pull lands so the empty state replaces itself
  // with the restored plan / history without the user needing to
  // navigate away and back.
  useEffect(() => {
    if (cloudSyncVersion > 0 && user?.id) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudSyncVersion]);

  // Safety-net delayed refreshes after sign-in. The cloudSyncVersion
  // effect above usually fires fast enough, but pull payloads can be
  // large (450+ exercises, 100+ routines, hundreds of sets) and the
  // version flips only after the WHOLE pull completes. Re-loading at
  // +3s + +10s catches the case where some inserts land after the
  // first effect ran. Cheap; only runs once per session per user.
  useEffect(() => {
    if (!user?.id) return;
    const t1 = setTimeout(() => loadData().catch(() => {}), 3000);
    const t2 = setTimeout(() => loadData().catch(() => {}), 10000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function loadData() {
    await Promise.all([
      loadWeekStats(),
      loadNextWorkout(),
      loadExerciseCounts(),
      loadBlockProgress(),
      loadPhaseBanner(),
      loadFatigueTrend(),
      loadScheduleContext(),
      loadBriefDismissal(),
      loadDailyNarrative(),
      ...(tier === 'pro' ? [loadTodayWeight(), loadLatestCoachOutput()] : []),
    ]);
    setInitialLoading(false);
  }

  async function loadDailyNarrative() {
    if (!user?.id) return;
    try {
      const narrative = await buildDailyNarrative(user.id);
      setDailyNarrative(narrative);
    } catch (_) { setDailyNarrative(null); }
  }

  async function loadLatestCoachOutput() {
    try {
      const out = await getLatestCoachOutput(user.id);
      setLatestCoachOutput(out);
      const dismissedKey = out ? `@volyume_coach_banner_dismissed_${out.weekStart}` : null;
      if (dismissedKey) {
        const v = await AsyncStorage.getItem(dismissedKey);
        setCoachBannerDismissed(v === 'true');
      } else {
        setCoachBannerDismissed(false);
      }
    } catch (_) {}
  }

  async function loadBriefDismissal() {
    try {
      const stored = await AsyncStorage.getItem('@volyume_brief_dismissed_date');
      if (!stored) { setBriefDismissed(false); return; }
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
      setBriefDismissed(stored === todayStr);
    } catch (_) {
      setBriefDismissed(false);
    }
  }

  async function dismissBrief() {
    setBriefDismissed(true);
    try {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
      await AsyncStorage.setItem('@volyume_brief_dismissed_date', todayStr);
    } catch (_) {}
  }

  async function loadScheduleContext() {
    try {
      const raw = await AsyncStorage.getItem('@volyume_schedule_v1');
      if (!raw) { setScheduleContext(null); return; }
      const parsed = JSON.parse(raw);
      const days = Array.isArray(parsed.days) ? parsed.days : [];
      if (days.length === 0) { setScheduleContext(null); return; }

      const todayIndex = new Date().getDay();
      // Search the next 7 days (including today) for a scheduled day
      for (let offset = 0; offset < 7; offset++) {
        const candidate = (todayIndex + offset) % 7;
        if (days.includes(candidate)) {
          if (offset === 0) {
            setScheduleContext({ daysUntil: 0, dayName: null });
          } else if (offset === 1) {
            setScheduleContext({ daysUntil: 1, dayName: null });
          } else {
            const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            setScheduleContext({ daysUntil: offset, dayName: DAY_NAMES[candidate] });
          }
          return;
        }
      }
      setScheduleContext(null);
    } catch (_) {
      setScheduleContext(null);
    }
  }

  async function loadPhaseBanner() {
    try {
      if (!user?.id || !userProfile?.trainingPhase) return;
      const currentPhase = userProfile.trainingPhase; // e.g. 'bulk', 'cut', 'maintain'

      // Check whether the user has already dismissed the banner for this phase pair
      const dismissedRaw = await AsyncStorage.getItem('@volyume_phase_banner_dismissed_v1');
      const dismissedPhase = dismissedRaw ?? null;
      if (dismissedPhase === currentPhase) {
        setPhaseBannerDismissed(true);
        setPhaseMismatch(null);
        return;
      }
      // If the phase has changed, clear any stale dismissal
      if (dismissedPhase && dismissedPhase !== currentPhase) {
        await AsyncStorage.removeItem('@volyume_phase_banner_dismissed_v1');
      }
      setPhaseBannerDismissed(false);

      // Load saved nutrition targets (global key used by ProGoalSetupScreen)
      const raw = await AsyncStorage.getItem('@volyume_nutrition_targets');
      if (!raw) { setPhaseMismatch(null); return; }
      const targets = JSON.parse(raw);
      // targets.goal is the nutrition key (e.g. 'build', 'mild_cut', 'maintain', 'recomp')
      // We compare against the nutrition key for the current training phase
      const { TRAINING_PHASES } = await import('../lib/coachingGoals');
      const currentNutritionKey = TRAINING_PHASES.find(p => p.value === currentPhase)?.nutritionKey ?? null;
      const savedNutritionKey = targets.goal ?? null;

      if (currentNutritionKey && savedNutritionKey && currentNutritionKey !== savedNutritionKey) {
        // Find the human-readable label for the saved phase
        const savedPhaseEntry = TRAINING_PHASES.find(p => p.nutritionKey === savedNutritionKey);
        const savedPhaseLabel = savedPhaseEntry?.label ?? savedNutritionKey;
        setPhaseMismatch({ currentPhase, savedPhaseLabel });
      } else {
        setPhaseMismatch(null);
      }
    } catch (_) {
      setPhaseMismatch(null);
    }
  }

  async function dismissPhaseBanner() {
    setPhaseBannerDismissed(true);
    try {
      await AsyncStorage.setItem('@volyume_phase_banner_dismissed_v1', userProfile?.trainingPhase ?? '');
    } catch (_) {}
  }

  async function loadFatigueTrend() {
    try {
      if (!user?.id) return;
      const rows = await getRecentWorkoutFeedback(user.id, 6);
      setFatigueSessions(rows);
    } catch (_) {
      setFatigueSessions([]);
    }
  }

  async function loadTodayWeight() {
    try {
      const entry = await getMorningWeightToday(user.id);
      setTodayWeight(entry?.weightKg ?? null);
      // Recent weights for the inline sparkline above the card. Last 14
      // entries gives a meaningful 2-week trend without making the
      // sparkline too dense to read at thumbnail size.
      try {
        const recent14 = await getMorningWeights(user.id, 14);
        setRecentWeights(recent14.map(w => w.weightKg).filter(Number.isFinite));
      } catch (_) {}
      // Prefill the log-weight inputs with the previously logged weight
      // (most recent morning weight, falling back to onboarding weight).
      // Blank inputs every day forced the user to retype the same number
      //, annoying, and easy to typo.
      if (!entry?.weightKg) {
        let prefillKg = null;
        try {
          const recent = await getMorningWeights(user.id, 1);
          if (recent.length > 0) prefillKg = recent[recent.length - 1]?.weightKg;
        } catch (_) {}
        if (!prefillKg && userProfile?.weightKg && userProfile.weightKg > 0) {
          prefillKg = userProfile.weightKg;
        }
        if (prefillKg && prefillKg > 0) {
          if (bwu === 'st') {
            const { stoneStr, lbsStr } = kgToStoneLbsStrings(prefillKg);
            setWeightInputSt(stoneStr);
            setWeightInputStLbs(lbsStr);
          } else if (bwu === 'lbs') {
            setWeightInput(String(Math.round(kgToLbs(prefillKg))));
          } else {
            setWeightInput(String(Math.round(prefillKg * 10) / 10));
          }
        }
      }
    } catch (_) {}
  }

  async function handleLogWeight() {
    let weightKg;
    if (bwu === 'st') {
      if (!weightInputSt) return;
      weightKg = stoneLbsToKg(weightInputSt, weightInputStLbs || '0');
    } else {
      weightKg = parseBodyWeightToKg(weightInput, bwu);
    }
    if (!weightKg || isNaN(weightKg) || weightKg <= 0 || weightKg > 300) return;
    // Optimistic: show the logged weight + clear inputs immediately.
    // SQLite write happens in the background. On failure, revert.
    const previousTodayWeight = todayWeight;
    setTodayWeight(weightKg);
    setWeightInput('');
    setWeightInputSt('');
    setWeightInputStLbs('');
    setSavingWeight(true);
    try {
      await logMorningWeight(user.id, { weightKg, loggedAt: Date.now() });
    } catch (e) {
      // Revert the optimistic update and surface the failure.
      setTodayWeight(previousTodayWeight);
      logError('HomeScreen.handleLogWeight', e, { userId: user?.id, weightKg });
      toast.show("Couldn't save weight, try again", { variant: 'error' });
    }
    setSavingWeight(false);
  }

  async function loadWeekStats() {
    try {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const [allWorkouts, allSets] = await Promise.all([
        getAllWorkouts(user.id),
        getCompletedWorkoutSets(user.id),
      ]);
      const thisWeek = allWorkouts.filter(w => w.startedAt >= weekAgo && w.isCompleted);
      const workoutIds = new Set(thisWeek.map(w => w.id));
      const weekSets = allSets.filter(s => workoutIds.has(s.workoutId) && s.setType !== 'warmup');
      const totalVol = weekSets.reduce((t, s) => t + (s.weight || 0) * (s.actualReps || 0), 0);
      setWeekStats({ sessions: thisWeek.length, sets: weekSets.length, volume: totalVol });

      // Consecutive-week streak. Bucket every completed workout into
      // the local Mon-start week it falls in, then count back from this
      // week until we hit an empty week. Local-time-anchored so the
      // streak doesn't break across DST.
      const completedTs = allWorkouts.filter(w => w.isCompleted).map(w => w.startedAt);
      function localWeekStartMs(ts) {
        const d = new Date(ts);
        const dow = d.getDay(); // 0=Sun ... 6=Sat
        const daysBack = dow === 0 ? 6 : dow - 1; // Mon=0
        const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - daysBack);
        return monday.getTime();
      }
      const trainedWeeks = new Set(completedTs.map(localWeekStartMs));
      let streak = 0;
      const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
      let cursor = localWeekStartMs(Date.now());
      while (trainedWeeks.has(cursor)) {
        streak += 1;
        cursor -= WEEK_MS;
      }
      setWeekStreak(streak);

      const completed = allWorkouts.filter(w => w.isCompleted).sort((a, b) => b.startedAt - a.startedAt);
      setLastSession(completed[0] || null);
      setTotalSessions(completed.length);

      // Only show the coaching nudge once the user has real training data to review
      if (tier === 'pro' && completed.length >= 3) {
        AsyncStorage.getItem('@volyume_seen_coaching_nudge').then(val => {
          if (val !== 'true') setShowCoachingNudge(true);
        });
      }



      // Compute tonnage for last session
      if (completed[0]) {
        const lastId = completed[0].id;
        const lastSets = allSets.filter(s => s.workoutId === lastId);
        const tonnage = calculateTonnage(lastSets);
        setLastSessionTonnage(tonnage > 0 ? tonnage : null);
      } else {
        setLastSessionTonnage(null);
      }

      // Progression teaser, free tier only, needs 2+ sessions to compare
      if (tier === 'free' && completed.length >= 2) {
        getProgressionTeaser(user.id, completed[0].id, completed[1].id)
          .then(t => setTeaserInsight(t))
          .catch(() => {});
      }

      // Deload suggestion, build last-4-weeks summary and run shouldDeload
      // Reset dismissed state each time data reloads so a new week's signal shows again
      setDeloadDismissed(false);
      try {
        const weekMs = 7 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        const last4Weeks = Array.from({ length: 4 }, (_, i) => {
          const weekStart = now - (i + 1) * weekMs;
          const weekEnd   = now - i * weekMs;
          const weekWorkouts = allWorkouts.filter(
            w => w.isCompleted && w.startedAt >= weekStart && w.startedAt < weekEnd,
          );
          const wIds = new Set(weekWorkouts.map(w => w.id));
          const wSets = allSets.filter(s => wIds.has(s.workoutId) && s.setType !== 'warmup');
          const totalReps = wSets.reduce((t, s) => t + (s.actualReps || 0), 0);
          const avgReps = wSets.length > 0 ? totalReps / wSets.length : 0;
          return {
            avgReps,
            weeksSinceLastDeload: 99, // not tracked in local DB; use conservative value
            avgJointDiscomfort: 0,    // not tracked in local DB
            hasOverMRV: false,        // not computed here, would need calculateWeeklyVolume + VOLUME_LANDMARKS
            avgSoreness: 0,           // not tracked in local DB
          };
        }).reverse(); // oldest first, as shouldDeload expects
        const result = shouldDeload(last4Weeks);
        setDeloadSuggestion(result.deload ? result : null);
      } catch (_) {
        setDeloadSuggestion(null);
      }
    } catch (_e) {}
  }

  async function loadExerciseCounts() {
    try {
      const counts = await getAllRoutineExerciseCounts();
      setExerciseCounts(counts);
    } catch (_e) {}
  }

  async function loadBlockProgress() {
    if (!user?.id) return;
    try {
      const week = await getCurrentMesocycleWeek(user.id);
      setCurrentMesoWeek(week);
      if (!week) return;

      const [planned, allSets, allExercises] = await Promise.all([
        getPlannedMuscleVolume(week.id),
        getCompletedWorkoutSets(user.id),
        getAllExercises(),
      ]);

      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const recentSets = allSets.filter(s => (s.createdAt || 0) >= weekAgo);
      const exerciseMap = Object.fromEntries(allExercises.map(e => [e.id, e]));
      const actual = calculateWeeklyVolume(recentSets, exerciseMap);

      const progress = planned
        .filter(p => p.planned_sets > 0)
        .map(p => ({
          muscle: p.muscle,
          planned: p.planned_sets,
          actual: Math.round(actual[p.muscle]?.workingSets || 0),
          label: MUSCLE_DISPLAY_NAMES[p.muscle] || p.muscle,
        }))
        .sort((a, b) => b.planned - a.planned)
        .slice(0, 8); // top 8 muscles by volume

      setBlockProgress(progress);
    } catch (_e) {}
  }

  async function loadNextWorkout() {
    try {
      const plan = await getActivePlan(user.id);
      setActivePlanData(plan || null);
      if (!plan) {
        setNextWorkout(null);
        setPlanAllWorkouts([]);
        setSelectedWorkoutOverride(null);
        return;
      }
      const routines = await getRoutinesForPlan(plan.id);
      setPlanAllWorkouts(routines);
      setSelectedWorkoutOverride(null);
      if (routines.length === 0) { setNextWorkout(null); return; }
      const idx = (plan.nextWorkoutIndex || 0) % routines.length;
      setNextWorkout({ routine: routines[idx], total: routines.length, idx });
    } catch (_e) {
      setNextWorkout(null);
      setPlanAllWorkouts([]);
      setSelectedWorkoutOverride(null);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    // If there's an active cloud session, fire pullFromCloud first so a
    // returning user on a fresh device can manually retry the restore
    // by pulling down. Status surfaces via the banner; local re-load
    // happens regardless so any new data already in SQLite shows.
    try {
      const sessionUser = useAppStore.getState().session?.user;
      if (sessionUser?.id) {
        const store = useAppStore.getState();
        store.markCloudSyncing();
        // eslint-disable-next-line global-require
        const { pullFromCloud } = require('../lib/sync');
        pullFromCloud(sessionUser.id)
          .then(() => useAppStore.getState().markCloudSyncComplete())
          .catch((err) => useAppStore.getState().markCloudSyncError(err?.message));
      }
    } catch (_) {}
    await loadData();
    setRefreshing(false);
  }

  async function handleStartNextWorkout() {
    const target = selectedWorkoutOverride || nextWorkout;
    if (!target?.routine) return;
    try {
      const routine = target.routine;
      const withExercises = await getRoutineExercisesWithDetails(routine.id);
      const initialExercises = withExercises.map(({ exercise, routineExercise }) => ({
        exercise, routineExercise, sets: [],
        // Hydrate plan-time superset pairings onto the workout entry so
        // ActiveWorkoutScreen renders them as paired from the start.
        supersetGroupId: routineExercise?.supersetGroupId ?? null,
      }));
      pendingStartRef.current = { routineId: routine.id, initialExercises };
      setShowIntentPrompt(true);
    } catch (e) {
      setIsStartingWorkout(false);
      logError('HomeScreen.handleStartNextWorkout', e, { userId: user?.id, routineId: target?.routine?.id });
      toast.show("Couldn't load workout, try again", { variant: 'error' });
    }
  }

  async function confirmStart(intent) {
    setShowIntentPrompt(false);
    const pending = pendingStartRef.current;
    if (!pending) return;
    setIsStartingWorkout(true);
    try {
      const workout = await createWorkout(user.id, pending.routineId, { intent });
      startWorkout(workout, pending.initialExercises);
      navigation.navigate('ActiveWorkout');
    } catch (e) {
      setIsStartingWorkout(false);
      logError('HomeScreen.confirmStart', e, { userId: user?.id, routineId: pending?.routineId, intent });
      toast.show("Couldn't start workout, try again", { variant: 'error' });
    }
    pendingStartRef.current = null;
  }

  // Blank session: no plan, no routine, no preloaded exercises. The
  // previous flow just did navigation.navigate('ActiveWorkout', {
  // blank: true }), but ActiveWorkoutScreen never read that param, so
  // the screen rendered with workoutStartTime=null and the timer was
  // frozen at 0:00 with non-responsive buttons. This helper does the
  // same prep the planned-session flow does: create the workout row,
  // mark it active in the store, then navigate. Used by both quick-
  // start surfaces below.
  async function startBlankSession() {
    if (!user?.id) return;
    try {
      const workout = await createWorkout(user.id, null, { intent: null });
      startWorkout(workout, []);
      navigation.navigate('ActiveWorkout');
    } catch (e) {
      logError('HomeScreen.startBlankSession', e, { userId: user?.id });
      toast.show("Couldn't start session, try again", { variant: 'error' });
    }
  }

  async function handleRepeatLastSession() {
    if (!lastSession) return;
    const routineId = lastSession.routineId || lastSession.routine_id || null;

    try {
      let initialExercises;
      if (routineId) {
        // Load the FULL routine, not just what was done last time
        const withExercises = await getRoutineExercisesWithDetails(routineId);
        initialExercises = withExercises.map(({ exercise, routineExercise }) => ({
          exercise, routineExercise, sets: [],
          supersetGroupId: routineExercise?.supersetGroupId ?? null,
        }));
      } else {
        // No routine linked, fall back to exercises from the session's sets
        const prevSets = await getWorkoutSetsForWorkout(lastSession.id);
        const seenIds = [];
        const orderedExerciseIds = [];
        for (const s of prevSets) {
          if (s.exerciseId && !seenIds.includes(s.exerciseId)) {
            seenIds.push(s.exerciseId);
            orderedExerciseIds.push(s.exerciseId);
          }
        }
        initialExercises = (
          await Promise.all(orderedExerciseIds.map(id => getExerciseById(id).catch(() => null)))
        )
          .filter(Boolean)
          .map(exercise => ({ exercise, routineExercise: null, sets: [] }));
      }

      pendingStartRef.current = { routineId, initialExercises };
      setShowIntentPrompt(true);
    } catch (e) {
      logError('HomeScreen.handleRepeatLastSession', e, { userId: user?.id, lastSessionId: lastSession?.id, routineId });
      toast.show("Couldn't load last session, try again", { variant: 'error' });
    }
  }

  const hasActiveWorkout = !!activeWorkout && !isStartingWorkout;
  const displayWorkout = selectedWorkoutOverride || nextWorkout;
  const planProgress = displayWorkout
    ? `Day ${(displayWorkout?.idx ?? 0) + 1} of ${nextWorkout?.total ?? 1}`
    : null;

  // Derive how many days since last completed workout (null = no history)
  const lastWorkoutDaysAgo = lastSession
    ? Math.floor((Date.now() - lastSession.startedAt) / (24 * 60 * 60 * 1000))
    : null;

  // Compute pre-workout coaching brief (shown only when plan active + not trained today + not dismissed)
  const showCoachBrief = !!activePlan && !hasActiveWorkout && lastWorkoutDaysAgo !== 0 && !briefDismissed;
  const coachBrief = showCoachBrief
    ? buildCoachBrief({
        fatigueHistory: fatigueSessions,
        weeklyVolume: weekStats,
        deloadSuggestion,
        lastWorkoutDaysAgo,
        blockProgress,
      })
    : null;

  const today = format(new Date(), 'EEE d MMM');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        {/* ── Branded header ── */}
        <ScreenHeader title="Train" subtitle={getGreeting(userProfile?.firstName)} />

        {/* ── Training schedule context line ── */}
        {scheduleContext && (
          <Text style={[
            styles.scheduleContextLine,
            scheduleContext.daysUntil === 0 && styles.scheduleContextLineToday,
          ]}>
            {scheduleContext.daysUntil === 0
              ? 'Today is a training day'
              : scheduleContext.daysUntil === 1
                ? 'Next session: tomorrow'
                : `Next session: ${scheduleContext.dayName}`}
          </Text>
        )}

        {/* ── Daily narrative hero ─────────────────────────────────
            One spoken-voice sentence drawn from this user's recent
            data. The most important pixel on the screen when there's
            a real signal to surface. */}
        {dailyNarrative && (
          <GradientCard
            tone={dailyNarrative.tone || 'primary'}
            style={styles.narrativeCard}
            accessibilityLabel={dailyNarrative.headline}
          >
            <View style={styles.narrativeRow}>
              <Ionicons
                name={
                  dailyNarrative.tone === 'gold' ? 'trophy-outline'
                  : dailyNarrative.tone === 'warning' ? 'alert-circle-outline'
                  : dailyNarrative.tone === 'success' ? 'trending-up-outline'
                  : 'sparkles-outline'
                }
                size={16}
                color={
                  dailyNarrative.tone === 'gold' ? colors.gold
                  : dailyNarrative.tone === 'warning' ? colors.warning
                  : dailyNarrative.tone === 'success' ? colors.success
                  : colors.primary
                }
              />
              <Text style={styles.narrativeText}>{dailyNarrative.headline}</Text>
            </View>
          </GradientCard>
        )}

        {/* Cloud restore banner removed, the typical pull completes
            in under a second on a healthy connection so the banner
            flashed and vanished. Pull-to-refresh on Home still shows
            the standard RefreshControl spinner if the user wants to
            force a sync. */}

        {/* ── Nutrition phase sync banner ── */}
        {phaseMismatch && !phaseBannerDismissed && (
          <View style={styles.phaseBanner}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} style={{ marginTop: 1 }} />
            <Text style={styles.phaseBannerText} numberOfLines={3}>
              Your nutrition targets are set for {phaseMismatch.savedPhaseLabel}. Update them under You to reflect your current plan.
            </Text>
            <TouchableOpacity
              style={styles.phaseBannerArrow}
              onPress={() => navigation.getParent()?.navigate('ProfileTab', { screen: 'NutritionTargets' })}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Go to nutrition targets"
            >
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={dismissPhaseBanner}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Dismiss nutrition phase banner"
            >
              <Ionicons name="close" size={15} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Fresh coach update banner ── */}
        {tier === 'pro' && latestCoachOutput && !coachBannerDismissed && (Date.now() - (latestCoachOutput.weekStart ?? 0) < 7 * 86400000) && (
          <TouchableOpacity
            style={styles.coachBanner}
            onPress={() => navigation.navigate('CoachOutput', { weekStart: latestCoachOutput.weekStart })}
            activeOpacity={0.85}
          >
            <View style={styles.coachBannerLeft}>
              <Ionicons name="sparkles" size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.coachBannerTitle}>Precision Coaching · this week's review</Text>
                <Text style={styles.coachBannerBody}>
                  {latestCoachOutput.adjustments?.calories?.applied
                    ? `Calories adjusted to ${latestCoachOutput.adjustments.calories.newKcal} kcal. Tap to see why.`
                    : 'Tap to see what changed and why.'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => {
                AsyncStorage.setItem(`@volyume_coach_banner_dismissed_${latestCoachOutput.weekStart}`, 'true').catch(() => {});
                setCoachBannerDismissed(true);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* ── Recovery week banner ── */}
        {deloadSuggestion && !deloadDismissed && (
          <TouchableOpacity
            style={styles.deloadBanner}
            onPress={() => navigation.navigate('CoachReview')}
            activeOpacity={0.85}
          >
            <View style={styles.deloadBannerLeft}>
              <Ionicons name="battery-charging-outline" size={20} color={colors.warning} />
              <View style={{ flex: 1 }}>
                <Text style={styles.deloadBannerTitle}>Recovery week suggested</Text>
                <Text style={styles.deloadBannerBody}>
                  {deloadSuggestion.reasons?.[0] ?? 'Your recent training signals it is time for a lighter week.'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setDeloadDismissed(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* Skeleton placeholders shown during initial cold-load. As
            soon as loadData completes, this block disappears and the
            real content (which is largely below) renders. Without it,
            the user sees a blank screen for the ~100-300ms it takes
            SQLite reads to complete on a fresh app start. */}
        {initialLoading && (
          <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
            <SkeletonCard height={84} />
            <SkeletonCard height={120} />
            <SkeletonCard height={160} />
          </View>
        )}

        {/* ── Morning weight card ── */}
        {tier === 'pro' && (todayWeight != null ? (
          <View style={styles.weightCard}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={styles.weightCardText}>
              {formatBodyWeightShort(todayWeight, bwu)} logged today
            </Text>
            {recentWeights.length >= 3 && (
              <Sparkline data={recentWeights} width={64} height={20} color={colors.primary} />
            )}
            <TouchableOpacity
              onPress={() => {
                // Prefill inputs with the value being edited so a typo
                // correction doesn't require retyping the whole weight.
                if (todayWeight && todayWeight > 0) {
                  if (bwu === 'st') {
                    const { stoneStr, lbsStr } = kgToStoneLbsStrings(todayWeight);
                    setWeightInputSt(stoneStr);
                    setWeightInputStLbs(lbsStr);
                  } else if (bwu === 'lbs') {
                    setWeightInput(String(Math.round(kgToLbs(todayWeight))));
                  } else {
                    setWeightInput(String(Math.round(todayWeight * 10) / 10));
                  }
                }
                setTodayWeight(null);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.weightCardEdit}>Edit</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.weightCard, styles.weightCardEmpty]}>
            <Ionicons name="scale-outline" size={16} color={colors.primary} />
            <Text style={styles.weightCardPrompt}>Morning weight</Text>
            {bwu === 'st' ? (
              <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'center' }}>
                <TextInput
                  style={styles.weightInputCompact}
                  value={weightInputSt}
                  onChangeText={setWeightInputSt}
                  placeholder="12st"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={3}
                />
                <TextInput
                  style={styles.weightInputCompact}
                  value={weightInputStLbs}
                  onChangeText={setWeightInputStLbs}
                  placeholder="7lb"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  maxLength={4}
                  returnKeyType="done"
                  onSubmitEditing={handleLogWeight}
                />
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs }}>
                <TextInput
                  style={styles.weightInputCompact}
                  value={weightInput}
                  onChangeText={setWeightInput}
                  placeholder={bwu}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  onSubmitEditing={handleLogWeight}
                />
                <Text style={styles.weightInputUnit}>{bwu}</Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.weightLogBtn, ((!weightInput && !weightInputSt) || savingWeight) && styles.weightLogBtnDisabled]}
              onPress={handleLogWeight}
              disabled={(!weightInput && !weightInputSt) || savingWeight}
            >
              <Text style={styles.weightLogBtnText}>Log</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* ── Steps, a small just-info line under the weight bit (Pro;
            automatic from the health aggregator, self-hides when none) ── */}
        {tier === 'pro' && user?.id && userProfile?.stepsEnabled !== false && (
          <StepsCard userId={user.id} stepsTarget={userProfile?.stepsTarget} />
        )}

        {/* ── This week, progress bars ── */}
        <AnimatedEntrance index={0}>
        <View style={styles.weekCard}>
          <View style={styles.weekCardHeader}>
            <Text style={styles.weekLabel}>This week</Text>
            {weekStreak > 1 && (
              <View style={styles.streakChip}>
                <Ionicons name="flame" size={11} color={colors.primary} />
                <Text style={styles.streakChipText}>{weekStreak}-week streak</Text>
              </View>
            )}
          </View>
          <View style={styles.weekStats}>
            <WeekBar
              value={weekStats.sessions}
              target={WEEK_TARGETS.sessions}
              label="Sessions"
              display={String(weekStats.sessions)}
            />
            <View style={styles.weekDivider} />
            <WeekBar
              value={weekStats.sets}
              target={WEEK_TARGETS.sets}
              label="Sets"
              display={String(weekStats.sets)}
            />
            <View style={styles.weekDivider} />
            <WeekBar
              value={weekStats.volume}
              target={WEEK_TARGETS.volume}
              label="Volume"
              display={`${Math.round(weekStats.volume).toLocaleString('en-GB')} kg`}
            />
          </View>
        </View>
        </AnimatedEntrance>

        {/* Today's intake card removed from the Train screen (founder
            2026-05-29): food and macros live on the Diary tab; the Train
            screen stays training-only. */}

        {/* ── Training trend mini-graph ── */}
        {/* Training trend moved to Progress tab, sits with Mesocycle pulse there. */}

        {/* ── Pro teaser (free tier only, after 3+ sessions) ── */}
        {tier === 'free' && totalSessions >= 3 && (
          <TouchableOpacity
            style={styles.proTeaserCard}
            onPress={() => navigation.navigate('ProUpgrade')}
            activeOpacity={0.88}
          >
            <View style={styles.proTeaserLeft}>
              <Ionicons name="sparkles" size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.proTeaserTitle}>
                  {teaserInsight?.progressed && teaserInsight?.stalled
                    ? `${teaserInsight.progressed} went up. ${teaserInsight.stalled} held. Pro tells you what to do next.`
                    : teaserInsight?.progressed
                      ? `${teaserInsight.progressed} progressed this week. Pro builds on it.`
                      : totalSessions >= 10
                        ? `${totalSessions} sessions logged. Pro coaching uses all of it.`
                        : 'Add a coach that adjusts your plan each week.'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* ── Primary workout area ── */}
        {hasActiveWorkout ? (
          <PressableCard
            style={styles.continueCard}
            onPress={() => navigation.navigate('ActiveWorkout')}
            accessibilityLabel="Continue active workout"
          >
            <View style={styles.continueInner}>
              <View style={styles.continueIcon}>
                <Ionicons name="play" size={20} color={colors.background} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.continueTitle}>Session in Progress</Text>
                <Text style={styles.continueSub}>Tap to return to your workout</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.background + 'CC'} />
            </View>
          </PressableCard>
        ) : activePlan && nextWorkout ? (
          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow} numberOfLines={1}>
              {planProgress}
            </Text>
            <Text style={styles.workoutName} numberOfLines={2}>
              {displayWorkout?.routine?.name}
            </Text>
            {exerciseCounts[displayWorkout?.routine?.id] ? (
              <Text style={styles.workoutMeta}>
                {exerciseCounts[displayWorkout.routine.id]} exercises
              </Text>
            ) : null}
            {/* Mesocycle context chip: tells the user where they are in
                the training block and what effort to bring today. Keeps
                Volyume's coaching identity visible at the start of every
                session, the way an RP-style plan would. Tooltip-free
                because the row is glanceable on its own. */}
            {currentMesoWeek && (
              <View style={styles.mesoBriefChip}>
                <Ionicons
                  name={currentMesoWeek.isDeload ? 'bed-outline' : 'trending-up-outline'}
                  size={12}
                  color={currentMesoWeek.isDeload ? colors.success : colors.primary}
                />
                <Text style={styles.mesoBriefText}>
                  {currentMesoWeek.isDeload
                    ? `Deload week · pull effort back`
                    : `Week ${currentMesoWeek.weekIndex} of ${currentMesoWeek.plannedWeeks ?? '-'}` +
                      (currentMesoWeek.rirTarget != null
                        ? ` · stop ${currentMesoWeek.rirTarget} short of failure`
                        : '')}
                </Text>
              </View>
            )}
            {coachBrief && (
              <CoachBriefCard brief={coachBrief} onDismiss={dismissBrief} />
            )}
            <View style={styles.startWorkoutRow}>
              <TouchableOpacity
                style={[styles.primaryBtn, styles.startBtnSplit, isStartingWorkout && { opacity: 0.6 }]}
                onPress={handleStartNextWorkout}
                disabled={isStartingWorkout}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={isStartingWorkout ? 'Starting workout' : `Start ${displayWorkout?.routine?.name || 'workout'}`}
              >
                <Ionicons name="play" size={16} color={colors.background} />
                <Text style={styles.primaryBtnText}>
                  {isStartingWorkout ? 'Starting…' : 'Start workout'}
                </Text>
              </TouchableOpacity>
              {displayWorkout?.routine?.id ? (
                <TouchableOpacity
                  style={styles.viewWorkoutBtn}
                  onPress={() => navigation.navigate('PlansTab', {
                    screen: 'RoutineDetail',
                    params: { routineId: displayWorkout.routine.id },
                  })}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${displayWorkout?.routine?.name || 'workout'} before starting`}
                >
                  <Text style={styles.viewWorkoutBtnText}>View</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <View style={styles.heroSecondaryRow}>
              <TouchableOpacity
                style={styles.heroSecondaryBtn}
                onPress={() => setShowChangeWorkout(true)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Change planned workout"
              >
                <Ionicons name="swap-horizontal-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.heroSecondaryBtnText}>Change workout</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.heroSecondaryBtn}
                onPress={() => navigation.navigate('BuildWorkout')}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Start a blank workout instead"
              >
                <Ionicons name="add-circle-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.heroSecondaryBtnText}>Blank session</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.noPlanSection}>
            <View style={styles.noPlanHero}>
              <View style={styles.noPlanIconWrap}>
                <Ionicons name="barbell-outline" size={28} color={colors.primary} />
              </View>
              {tier === 'pro' ? (
                <>
                  <Text style={styles.noPlanTitle}>No active plan on this device</Text>
                  <Text style={styles.noPlanSub}>
                    If you just signed in we may still be pulling your data from the cloud, give it a moment. If nothing arrives, tap below to rebuild your plan from your profile.
                  </Text>
                </>
              ) : lastSession == null ? (
                <>
                  <Text style={styles.noPlanTitle}>Welcome. Let's get you started.</Text>
                  <Text style={styles.noPlanSub}>
                    We will learn your training over the first few weeks and build recommendations from there.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.noPlanTitle}>Pick up where you left off</Text>
                  <Text style={styles.noPlanSub}>
                    You've been training without a set plan. Setting one up will keep things structured and help Volyume track your progress properly.
                  </Text>
                </>
              )}
            </View>

            {tier === 'pro' && (
              <TouchableOpacity
                style={styles.proRecoverBtn}
                onPress={async () => {
                  const result = await generateAndSavePlan(user.id, userProfile);
                  if (result.ok) {
                    await loadData();
                  } else {
                    toast.show(`Couldn't build plan: ${result.error}`, { variant: 'error', duration: 5000 });
                  }
                }}
                activeOpacity={0.88}
              >
                <Ionicons name="sparkles" size={18} color={colors.background} />
                <Text style={styles.proRecoverBtnText}>Build my plan</Text>
              </TouchableOpacity>
            )}

            {/* Progress at a glance, shown when there's history but no plan */}
            {lastSession != null && (
              <View style={styles.glanceCard}>
                <Text style={styles.glanceTitle}>Your progress at a glance</Text>
                <View style={styles.glanceRow}>
                  <View style={styles.glanceStat}>
                    <Text style={styles.glanceStatValue}>{weekStats.sessions}</Text>
                    <Text style={styles.glanceStatLabel}>Sessions this week</Text>
                  </View>
                  <View style={styles.glanceDivider} />
                  <View style={styles.glanceStat}>
                    <Text style={styles.glanceStatValue}>
                      {getRelativeDay(lastSession.startedAt)}
                    </Text>
                    <Text style={styles.glanceStatLabel}>Last session</Text>
                  </View>
                </View>
              </View>
            )}

            <PressableCard
              style={styles.quickStartCard}
              onPress={() => startBlankSession()}
              accessibilityLabel="Start your first session"
            >
              <View style={styles.quickStartIcon}>
                <Ionicons name="barbell-outline" size={28} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.quickStartTitle}>Start your first session</Text>
                <Text style={styles.quickStartSub}>Log sets as you go. No plan needed to begin. We will build your profile as you train.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </PressableCard>

            {tier !== 'pro' && (
              <>
                <PlanBuilderCard
                  icon="library-outline"
                  title="Plan Library"
                  desc="Browse ready-made plans for every level, schedule, and goal."
                  badge="Recommended"
                  onPress={() => navigation.navigate('PlansTab', { screen: 'PlanLibrary', initial: false })}
                />
                <PlanBuilderCard
                  icon="barbell-outline"
                  title="Start a manual session"
                  desc="Log sets as you go. No plan required. Volyume builds your profile as you train."
                  onPress={() => startBlankSession()}
                />
              </>
            )}

            {tier !== 'pro' && (
              <TouchableOpacity
                style={styles.blankSessionLink}
                onPress={() => navigation.navigate('BuildWorkout')}
                accessibilityRole="button"
                accessibilityLabel="Start a blank session"
              >
                <Text style={styles.blankSessionLinkText}>Start a blank session instead</Text>
                <Ionicons name="chevron-forward" size={13} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Last session ── */}
        {lastSession && (
          <PressableCard
            style={styles.lastSessionCard}
            onPress={() => navigation.navigate('WorkoutHistory')}
            accessibilityLabel="Open workout history"
          >
            <View style={styles.lastSessionTop}>
              <View style={{ gap: spacing.xxs }}>
                <Text style={styles.lastSessionLabel}>Last session</Text>
                <Text style={styles.lastSessionRelDate}>{getRelativeDay(lastSession.startedAt)}</Text>
              </View>
              <TouchableOpacity
                style={styles.repeatBtn}
                onPress={e => { e.stopPropagation(); handleRepeatLastSession(); }}
                activeOpacity={0.75}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Repeat last session"
              >
                <Ionicons name="refresh-outline" size={13} color={colors.primary} />
                <Text style={styles.repeatBtnText}>Repeat</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.lastSessionName} numberOfLines={1}>
              {lastSession.name || lastSession.routineName || 'Session'}
            </Text>
            <View style={styles.lastSessionStatRow}>
              {lastSession.durationMinutes ? (
                <View style={styles.lastSessionStatPill}>
                  <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.lastSessionStatText}>{lastSession.durationMinutes}m</Text>
                </View>
              ) : null}
              {lastSession.setCount ? (
                <View style={styles.lastSessionStatPill}>
                  <Ionicons name="repeat-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.lastSessionStatText}>{lastSession.setCount} sets</Text>
                </View>
              ) : null}
              {lastSession.totalVolume ? (
                <View style={styles.lastSessionStatPill}>
                  <Ionicons name="barbell-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.lastSessionStatText}>
                    {Math.round(lastSession.totalVolume).toLocaleString('en-GB')} kg
                  </Text>
                </View>
              ) : lastSessionTonnage ? (
                <View style={styles.lastSessionStatPill}>
                  <Ionicons name="barbell-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.lastSessionStatText}>
                    {Math.round(lastSessionTonnage).toLocaleString('en-GB')} kg
                  </Text>
                </View>
              ) : null}
            </View>
          </PressableCard>
        )}


        {/* "This week's plan" (block progress) moved to Progress tab. */}

        {/* ── Coaching discovery nudge (Pro, one-time) ── */}
        {showCoachingNudge && (
          <View style={styles.coachingNudge}>
            <View style={styles.coachingNudgeLeft}>
              <Ionicons name="pulse-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text style={styles.coachingNudgeTitle}>Your weekly coaching review is here</Text>
              <Text style={styles.coachingNudgeBody}>
                Each week Volyume looks at how your training went and suggests what to adjust going forward. Tap to see yours.
              </Text>
              <TouchableOpacity
                style={styles.coachingNudgeBtn}
                onPress={() => {
                  dismissCoachingNudge();
                  navigation.navigate('ProfileTab', { screen: 'WeeklyCheckIn', initial: false });
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.coachingNudgeBtnText}>Show me</Text>
                <Ionicons name="chevron-forward" size={12} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={dismissCoachingNudge}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Dismiss coaching nudge"
            >
              <Ionicons name="close" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Quick nav ── */}
        <AnimatedEntrance index={2}>
        <View style={styles.quickRow}>
          <QuickLink
            icon="time-outline"
            label="History"
            onPress={() => navigation.navigate('WorkoutHistory')}
          />
          <QuickLink
            icon="trophy-outline"
            label="Records"
            onPress={() => navigation.navigate('ProgressTab', { screen: 'PRWall', initial: false })}
          />
          <QuickLink
            icon="grid-outline"
            label="Volume"
            onPress={() => navigation.navigate('VolumeHeatmap')}
          />
        </View>
        </AnimatedEntrance>
      </ScrollView>

      {/* Change Workout Sheet */}
      <Modal
        visible={showChangeWorkout}
        transparent
        animationType="slide"
        onRequestClose={() => setShowChangeWorkout(false)}
      >
        <TouchableOpacity
          style={styles.sheetBackdrop}
          activeOpacity={1}
          onPress={() => setShowChangeWorkout(false)}
        />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Choose Workout</Text>
          {activePlan && <Text style={styles.sheetSub}>{activePlan.name}</Text>}
          <ScrollView showsVerticalScrollIndicator={false}>
            {planAllWorkouts.map((routine, i) => {
              const isNext = i === nextWorkout?.idx && !selectedWorkoutOverride;
              const isSel = selectedWorkoutOverride?.idx === i;
              return (
                <TouchableOpacity
                  key={routine.id ?? i}
                  style={[styles.pickerRow, (isNext || isSel) && styles.pickerRowActive]}
                  onPress={() => {
                    setSelectedWorkoutOverride(
                      i === nextWorkout?.idx ? null : { routine, total: planAllWorkouts.length, idx: i },
                    );
                    setShowChangeWorkout(false);
                  }}
                >
                  <View style={[styles.dayBadge, (isNext || isSel) && styles.dayBadgeActive]}>
                    <Text style={[styles.dayNum, (isNext || isSel) && styles.dayNumActive]}>
                      D{i + 1}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerName} numberOfLines={1}>{routine.name}</Text>
                    {exerciseCounts[routine.id] ? (
                      <Text style={styles.pickerMeta}>{exerciseCounts[routine.id]} exercises</Text>
                    ) : null}
                  </View>
                  {isNext && (
                    <View style={styles.nextBadge}>
                      <Text style={styles.nextBadgeText}>Next up</Text>
                    </View>
                  )}
                  {isSel && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={styles.sheetCancel} onPress={() => setShowChangeWorkout(false)}>
            <Text style={styles.sheetCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── Pre-workout intent prompt ── */}
      <Modal
        visible={showIntentPrompt}
        transparent
        animationType="slide"
        onRequestClose={() => { setShowIntentPrompt(false); pendingStartRef.current = null; }}
      >
        <View style={styles.intentOverlay}>
          <View style={styles.intentSheet}>
            <Text style={styles.intentTitle}>How are you feeling today?</Text>
            <Text style={styles.intentSub}>Takes a second. Helps us read your sessions better over time.</Text>
            {[
              { key: 'sharp', label: 'Sharp', sub: 'Energised and ready', icon: 'flash-outline' },
              { key: 'average', label: 'Average', sub: 'Normal day, feeling fine', icon: 'remove-outline' },
              { key: 'below_par', label: 'Below par', sub: 'Tired, stressed, or off', icon: 'arrow-down-outline' },
            ].map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={styles.intentOption}
                onPress={() => confirmStart(opt.key)}
                activeOpacity={0.85}
              >
                <View style={styles.intentOptionIcon}>
                  <Ionicons name={opt.icon} size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.intentOptionLabel}>{opt.label}</Text>
                  <Text style={styles.intentOptionSub}>{opt.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.intentSkip}
              onPress={() => confirmStart(null)}
            >
              <Text style={styles.intentSkipText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Derive a 1-3 sentence coaching brief from available training data.
 * Returns { headline, body, type } where type is 'go' | 'caution' | 'recover'.
 */
function buildCoachBrief({ fatigueHistory, weeklyVolume, deloadSuggestion, lastWorkoutDaysAgo, blockProgress }) {
  // Rule 1, deload suggested
  if (deloadSuggestion) {
    return {
      headline: 'Recovery week',
      body: 'Your body is signalling it needs a lighter week. Keep the movement, drop the weight. This is how you come back stronger.',
      type: 'recover',
    };
  }

  // Rule 2, high fatigue (avg of last 2 sessions ≥ 3.5)
  if (fatigueHistory.length >= 2) {
    const recent = fatigueHistory.slice(0, 2);
    const avg = recent.reduce((s, r) => s + (r.fatigueLevel ?? r.fatigue_level ?? 0), 0) / recent.length;
    if (avg >= 3.5) {
      return {
        headline: 'Fatigue building',
        body: 'Fatigue is building. Consider reducing weight by 10% today and focusing on quality reps.',
        type: 'caution',
      };
    }
  }

  // Rule 3, long gap since last session
  if (lastWorkoutDaysAgo != null && lastWorkoutDaysAgo >= 5) {
    return {
      headline: 'Good to see you back',
      body: "It's been a while since your last session. Ease in. Don't try to catch up in one workout.",
      type: 'go',
    };
  }

  // Rule 4, 2+ muscles below MEV this week (only meaningful if the user has
  // actually been training). For brand-new users with zero workouts every
  // muscle reads as below-MEV at 0 sets, so this rule used to fire on the
  // very first launch with "Several muscle groups are below their weekly
  // minimum", which is technically true but useless advice. Require the
  // user to have logged something so we're commenting on real adherence.
  if (blockProgress && blockProgress.length > 0) {
    const totalSetsThisWeek = blockProgress.reduce((s, p) => s + (p.actual ?? 0), 0);
    const belowMev = blockProgress.filter(p => {
      const landmarks = VOLUME_LANDMARKS[p.muscle];
      return landmarks && landmarks.mev > 0 && p.actual < landmarks.mev;
    });
    if (totalSetsThisWeek > 0 && belowMev.length >= 2) {
      const muscleName = belowMev[0].label;
      return {
        headline: 'Muscle groups need attention',
        body: `Several muscle groups are below their weekly minimum. Today's a good day to prioritise ${muscleName}.`,
        type: 'go',
      };
    }
  }

  // Rule 5, volume on track, low fatigue
  if (fatigueHistory.length >= 1) {
    const recent = fatigueHistory.slice(0, 2);
    const avg = recent.reduce((s, r) => s + (r.fatigueLevel ?? r.fatigue_level ?? 0), 0) / recent.length;
    if (avg <= 2) {
      return {
        headline: 'Looking good',
        body: 'Training is on track. Push the quality today.',
        type: 'go',
      };
    }
  }

  // Rule 6, default
  return {
    headline: 'Ready when you are',
    body: 'Ready when you are.',
    type: 'go',
  };
}

function getRelativeDay(ts) {
  // Compare LOCAL calendar dates rather than epoch-ms deltas so a
  // session logged at 23:50 doesn't read as "Yesterday" when the user
  // opens the app at 00:10 (or vice versa across DST). The previous
  // floor-based math also broke across DST jumps and for users
  // outside UTC.
  const now = new Date();
  const then = new Date(ts);
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(now) - startOfDay(then)) / (24 * 60 * 60 * 1000));
  if (dayDiff <= 0) return 'Today';
  if (dayDiff === 1) return 'Yesterday';
  if (dayDiff < 7) return `${dayDiff} days ago`;
  return format(then, 'd MMM');
}

// ── Sub-components ────────────────────────────────────────────────────────────

function WeekBar({ value, target, label, display }) {
  const pct = Math.min(value / target, 1);
  return (
    <View style={styles.weekBarCell}>
      <Text style={styles.weekBarValue}>{display}</Text>
      <Text style={styles.weekBarLabel}>{label}</Text>
      <View style={styles.weekBarTrack}>
        <View style={[styles.weekBarFill, { width: `${Math.max(pct * 100, pct > 0 ? 8 : 0)}%` }]} />
      </View>
    </View>
  );
}

function PlanBuilderCard({ icon, title, desc, badge, onPress }) {
  return (
    <PressableCard style={styles.builderCard} onPress={onPress} accessibilityLabel={title}>
      <View style={styles.builderIconWrap}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.builderTitleRow}>
          <Text style={styles.builderTitle}>{title}</Text>
          {badge && (
            <View style={styles.builderBadge}>
              <Text style={styles.builderBadgeText}>{badge}</Text>
            </View>
          )}
        </View>
        <Text style={styles.builderDesc}>{desc}</Text>
      </View>
      <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
    </PressableCard>
  );
}

function QuickLink({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.quickLink} onPress={onPress}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.quickLinkLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Coach Brief Card ──────────────────────────────────────────────────────────

const BRIEF_ICON = { go: 'fitness-outline', caution: 'warning-outline', recover: 'leaf-outline' };
const BRIEF_BORDER = {
  go:      colors.primary  + '30',
  caution: colors.warning  + '30',
  recover: colors.success  + '30',
};
const BRIEF_ICON_COLOR = {
  go:      colors.primary,
  caution: colors.warning,
  recover: colors.success,
};

function CoachBriefCard({ brief, onDismiss }) {
  const borderColor = BRIEF_BORDER[brief.type] ?? BRIEF_BORDER.go;
  const iconColor   = BRIEF_ICON_COLOR[brief.type] ?? BRIEF_ICON_COLOR.go;
  const iconName    = BRIEF_ICON[brief.type] ?? BRIEF_ICON.go;

  return (
    <View style={[styles.coachBriefCard, { borderColor }]}>
      <Ionicons name={iconName} size={18} color={iconColor} style={{ marginTop: spacing.xxs }} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={styles.coachBriefHeadline}>{brief.headline}</Text>
        <Text style={styles.coachBriefBody}>{brief.body}</Text>
      </View>
      <TouchableOpacity
        onPress={onDismiss}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel="Dismiss coaching brief"
      >
        <Ionicons name="close" size={14} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },

  // Morning weight card
  weightCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  weightCardEmpty: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
  },
  weightCardPrompt: {
    ...type.label, color: colors.textPrimary,
  },
  weightCardHint: {
    fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: 16,
  },
  weightInput: {
    flex: 1, fontSize: fontSize.sm, color: colors.textPrimary,
    paddingVertical: spacing.xs,
  },
  weightInputCompact: {
    fontSize: fontSize.sm, color: colors.textPrimary,
    paddingVertical: spacing.xs, minWidth: 48, textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  weightInputUnit: { fontSize: fontSize.sm, color: colors.textSecondary },
  weightCardText: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  weightCardEdit: { ...type.caption, color: colors.primary },
  narrativeCard: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  narrativeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  narrativeText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  weightLogBtn: {
    backgroundColor: colors.primary, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
  },
  weightLogBtnDisabled: { backgroundColor: colors.surface3 },
  weightLogBtnText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.background },

  // Header, matches Plans/Progress/Athlete Hub pattern
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.xs,
  },
  headerText: { gap: 1 },
  pageTitle: {
    ...type.h3,
    color: colors.textPrimary,
  },
  greeting: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: fontWeight.regular,
  },
  trainingBrainHeaderText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
    letterSpacing: 0.2,
  },

  // Training schedule context line
  scheduleContextLine: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: -spacing.xs,
  },
  scheduleContextLineToday: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },

  // Week card with progress bars
  weekCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  weekCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  streakChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs,
    borderRadius: radius.full,
    backgroundColor: colors.primaryBg,
  },
  streakChipText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
    fontVariant: ['tabular-nums'],
  },
  weekLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
  weekStats: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  weekBarCell: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  weekDivider: {
    width: 1,
    height: 48,
    backgroundColor: colors.border,
    alignSelf: 'center',
  },
  weekBarValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  weekBarLabel: {
    ...type.caption,
    color: colors.textMuted,
  },
  weekBarTrack: {
    width: '70%',
    height: 3,
    backgroundColor: colors.surface3,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  weekBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },

  // Continue card
  continueCard: {
    backgroundColor: colors.success,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  continueInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  continueIcon: {
    width: 40, height: 40, borderRadius: radius.xl,
    backgroundColor: withAlpha(colors.background, 0.2),
    alignItems: 'center', justifyContent: 'center',
  },
  continueTitle: { ...type.bodyStrong, color: colors.background },
  continueSub: { ...type.caption, color: colors.background + 'CC', marginTop: spacing.xxs },

  // Hero plan card. Restrained: flat surface, one primary CTA, two
  // discreet text links underneath. Stat goes in the eyebrow line so
  // we don't waste a row on a coloured pill that fights the workout
  // name for attention.
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  heroEyebrow: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    fontWeight: fontWeight.semibold,
  },
  workoutName: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.black,
    color: colors.textPrimary,
    lineHeight: 30,
  },
  workoutMeta: { fontSize: fontSize.sm, color: colors.textSecondary },
  mesoBriefChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surface2,
    borderWidth: 1, borderColor: colors.border,
  },
  mesoBriefText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  primaryBtnText: { ...type.bodyStrong, color: colors.background },
  // Two-button row: primary "Start workout" + secondary "View" so the
  // user can preview the routine's exercises before committing. Mirrors
  // the Start Next Workout + View Plan layout on PlansScreen for visual
  // consistency.
  startWorkoutRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  startBtnSplit: { flex: 1, marginTop: 0 },
  viewWorkoutBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewWorkoutBtnText: { ...type.label, color: colors.textSecondary },
  heroSecondaryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  // Boxed secondary buttons matching the View / surface2 pill style
  // used elsewhere on the screen, gives the Change workout / Blank
  // session affordances proper tap targets and aligns visually with
  // the History / Records / Volume tiles below.
  heroSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  heroSecondaryBtnText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.semibold,
  },

  // No plan, plan-first section
  noPlanSection: { gap: spacing.md },
  proRecoverBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 14, marginTop: spacing.sm,
  },
  proRecoverBtnText: {
    ...type.bodyStrong, color: colors.background,
  },
  noPlanHero: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  noPlanIconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primaryBg, borderWidth: 1.5, borderColor: colors.primary + '50',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  noPlanTitle: {
    ...type.h3,
    color: colors.textPrimary, textAlign: 'center',
  },
  noPlanSub: {
    fontSize: fontSize.sm, color: colors.textSecondary,
    lineHeight: 20, textAlign: 'center',
  },
  blankSessionLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: spacing.md,
  },
  blankSessionLinkText: { fontSize: fontSize.sm, color: colors.textMuted },

  // Progress at a glance (no-plan + has history)
  glanceCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  glanceTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
  glanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  glanceStat: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  glanceStatValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black,
    color: colors.textPrimary,
  },
  glanceStatLabel: {
    ...type.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  glanceDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },

  // Plan builder cards
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    letterSpacing: 0.2,
    paddingBottom: spacing.xs,
  },
  builderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  builderIconWrap: {
    width: 40, height: 40, borderRadius: radius.sm,
    backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center',
  },
  builderTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xxs },
  builderTitle: { ...type.label, color: colors.textPrimary },
  builderBadge: {
    backgroundColor: colors.primaryBg, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs,
    borderWidth: 1, borderColor: colors.primary + '40',
  },
  builderBadgeText: { fontSize: fontSize.micro, fontWeight: fontWeight.bold, color: colors.primary },
  builderDesc: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 16 },

  // Last session
  lastSessionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  lastSessionTop: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
  },
  lastSessionLabel: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
    color: colors.textMuted, letterSpacing: 0.2,
  },
  lastSessionRelDate: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.primary,
  },
  repeatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryBg,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  repeatBtnText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  lastSessionName: {
    ...type.title, color: colors.textPrimary,
  },
  lastSessionStatRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  lastSessionStatPill: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.surface2, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    borderWidth: 1, borderColor: colors.border,
  },
  lastSessionStatText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium },

  // Quick nav
  quickRow: { flexDirection: 'row', gap: spacing.sm },
  quickLink: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickLinkLabel: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium },

  // Change workout sheet
  sheetBackdrop: { flex: 1, backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
    maxHeight: '80%',
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg,
  },
  sheetTitle: {
    ...type.h3,
    color: colors.textPrimary, marginBottom: spacing.xs,
  },
  sheetSub: { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.lg },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  pickerRowActive: {
    backgroundColor: colors.primaryBg,
    marginHorizontal: -spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  dayBadge: {
    width: 40, height: 40, borderRadius: radius.xl, backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border,
  },
  dayBadgeActive: { backgroundColor: colors.primaryBg, borderColor: colors.primary + '60' },
  dayNum: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textSecondary },
  dayNumActive: { color: colors.primary },
  pickerName: { ...type.bodyStrong, color: colors.textPrimary },
  pickerMeta: { ...type.caption, color: colors.textMuted, marginTop: spacing.xxs },
  nextBadge: {
    backgroundColor: colors.primaryBg, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs,
    borderWidth: 1, borderColor: colors.primary + '40',
  },
  nextBadgeText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.semibold },
  sheetCancel: { marginTop: spacing.lg, alignItems: 'center', paddingVertical: spacing.md },
  sheetCancelText: { ...type.body, color: colors.textSecondary },

  // Block progress card
  // Pro coaching discovery nudge
  coachingNudge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  coachingNudgeLeft: {
    width: 36, height: 36, borderRadius: radius.sm,
    backgroundColor: colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  coachingNudgeTitle: {
    ...type.label, color: colors.textPrimary,
  },
  coachingNudgeBody: {
    fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: 17,
  },
  coachingNudgeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    alignSelf: 'flex-start', marginTop: spacing.xs,
  },
  coachingNudgeBtnText: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.primary,
  },

  trainingBrainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  trainingBrainText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 17,
  },

  intentOverlay: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'flex-end',
  },
  intentSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  intentTitle: {
    ...type.h3,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  intentSub: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  intentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface2 ?? colors.background,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  intentOptionIcon: {
    width: 40, height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  intentOptionLabel: {
    ...type.bodyStrong,
    color: colors.textPrimary,
  },
  intentOptionSub: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  intentSkip: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  intentSkipText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },

  proTeaserCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  proTeaserLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  proTeaserTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 19,
  },
  proTeaserSub: {
    ...type.caption,
    color: colors.primary,
    marginTop: 1,
  },

  // Recovery week banner
  coachBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.primaryBg, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.primary + '50',
    padding: 14, marginBottom: spacing.md, gap: spacing.md,
  },
  coachBannerLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 },
  coachBannerTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.primary, marginBottom: spacing.xxs },
  coachBannerBody: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 17 },
  deloadBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: withAlpha(colors.primary, 0.12), borderRadius: radius.md, padding: spacing.lg,
    borderWidth: 1, borderColor: withAlpha(colors.primary, 0.35), marginBottom: spacing.md,
  },
  deloadBannerLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 },
  deloadBannerTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.warning, marginBottom: spacing.xxs },
  deloadBannerBody: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 17 },

  // Nutrition phase sync banner
  phaseBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.primaryBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  phaseBannerText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  phaseBannerArrow: {
    paddingLeft: spacing.xs,
  },

  // Pre-workout coaching brief card
  coachBriefCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  coachBriefHeadline: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  coachBriefBody: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 16,
  },

  // Quick-start card (empty state fast path)
  quickStartCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.primaryBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  quickStartIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStartTitle: {
    ...type.bodyStrong,
    color: colors.textPrimary,
    marginBottom: 3,
  },
  quickStartSub: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
});
