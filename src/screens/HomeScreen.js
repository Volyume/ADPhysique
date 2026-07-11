import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useScrollToTop } from '@react-navigation/native';
import { format } from 'date-fns/format';

import { colors, fontSize, fontWeight, spacing, radius, withAlpha, alpha, type, circle, iconSize } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import ScreenHeader from '../components/ScreenHeader';
import ConsistencyEcho from '../components/ConsistencyEcho';
import Button from '../components/Button';
import Card from '../components/Card';
import PressableCard from '../components/PressableCard';
import SectionLabel from '../components/SectionLabel';
import WhatsNewSheet from '../components/WhatsNewSheet';
import { SkeletonCard } from '../components/Skeleton';
import TodayStrip from '../components/TodayStrip';
import { useToast } from '../components/Toast';
import CoachBriefCard, { buildBriefIconColor } from '../components/CoachBriefCard';
import HomeWelcomeCard from '../components/HomeWelcomeCard';
import HomeProTeaserCard from '../components/HomeProTeaserCard';
import HomeLastSessionCard from '../components/HomeLastSessionCard';
import HomeBlockShapeSheet from '../components/HomeBlockShapeSheet';
import HomeChangeWorkoutSheet from '../components/HomeChangeWorkoutSheet';
import BottomSheet from '../components/BottomSheet';
import Chip from '../components/Chip';
import * as haptics from '../lib/haptics';
import { buildCoachBrief } from '../lib/homeCoachBrief';
import {
  getAllWorkouts, getWorkoutSetsSince, getActivePlan, getRoutinesForPlan,
  getAllRoutineExerciseCounts, createWorkout, getRoutineExercisesWithDetails,
  getWorkoutSetsForWorkout, getExerciseById,
  getCurrentMesocycleWeek, getPlannedMuscleVolume, getAllExercises,
  getMorningWeightToday, getMorningWeights, logMorningWeight, getProgressionTeaser,
  getRecentWorkoutFeedback, getLatestCoachOutput,
  getMorningWeightsLast14Days, getOpenEdPatternFlag,
  getRecentCheckins, getNutritionTargets,
} from '../lib/database';
import { stageOf, canStillTrial } from '../lib/payments/cascade';
import {
  trialStartFromEndsAt,
  selectTrialVariant,
  firstReviewUnlockDate,
  dayName,
  trialBannerLine,
  TRIAL_LENGTH_DAYS,
} from '../lib/trialActivation';
import { buildCoachLedger } from '../lib/coachLedger';
import CoachDailyBrief from '../components/CoachDailyBrief';
import { computeAndLogSessionAdjustments } from '../lib/sessionAdjustments';
import { buildFreeCoachLine } from '../lib/coachResponse';
import { activePlanLine, planHeadingName } from '../lib/planDisplay';
import { resolveActivationNudge, activationBannerLine, NUDGE_STAGE, NUDGE_WINDOW_GRACE_MS } from '../lib/activationNudge';
import { navigateCrossTab } from '../navigation/navigateCrossTab';
import { localWeekStartMs, localDayKey } from '../lib/dayKey';
import { isCalm, WELLBEING_KEY } from '../lib/wellbeing';
// NAV-4 (founder decision): the differential paywall re-homed here from the
// Pro-guarded CoachOutput, where its only audience (free tier) could never
// see it. Pure detection (the locked Move #4 detector) fed from data Home
// already loads; the badge only navigates to ProUpgrade.
import AttentionCard, { pickAttentionVariant } from '../components/AttentionCard';
import { detectDifferentialTrigger } from '../lib/differentialPaywall';
import { mapCalsAdherence } from '../lib/weeklyCoach';
import { getRecentIntakeSummary } from '../lib/food/db';
import { track as trackEngineEvent } from '../lib/engineTelemetry';
import { generateAndSavePlan } from '../lib/planAutoGen';
import { logError, logWarn } from '../lib/errorLog';
import { calculateTonnage, calculateWeeklyVolume, MUSCLE_DISPLAY_NAMES, shouldDeload } from '../lib/algorithms';
import { selectPlateauForBanner, plateauBannerLine } from '../lib/plateauSurfacing';
import { buildReadinessSummary } from '../lib/readinessSummary';
import { seedRoutinesIfNeeded } from '../lib/seedRoutines';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
// Integration wave (integration-plan.md §8): the check-in nudge's optional
// scan subline, fail-closed via the shared photo-suppression hook.
import usePhotoSuppression from '../hooks/usePhotoSuppression';

// Soft targets used only to size the weekly progress bars, not enforced

function getGreeting(firstName) {
  const h = new Date().getHours();
  const name = firstName ? `, ${firstName}` : '';
  if (h < 5)  return `Up early${name}.`;
  if (h < 12) return `Morning${name}.`;
  if (h < 17) return `Afternoon${name}.`;
  if (h < 21) return `Evening${name}.`;
  return `Late night${name}.`;
}

// COMP-008: the three pre-workout readiness rows shown beneath the intent
// options. Each is an optional low/middle/high chip. Stored values match the
// scales the workout row + its readers expect: soreness on the existing 1-3
// (Fresh/Mild/Sore) scale the adaptive engine + computeRecoveryEMAs read;
// sleep + energy on the 1-5 domain (chips offer 2/3/4) so the weekly
// sleep_quality write and CoachReview's <2.5 thresholds stay valid.
const READINESS_ROWS = [
  {
    key: 'soreness24hBefore',
    label: 'Soreness coming in',
    chips: [{ label: 'Fresh', value: 1 }, { label: 'Mild', value: 2 }, { label: 'Sore', value: 3 }],
  },
  {
    key: 'sleepQuality',
    label: 'Sleep last night',
    chips: [{ label: 'Poor', value: 2 }, { label: 'OK', value: 3 }, { label: 'Good', value: 4 }],
  },
  {
    key: 'energyScore',
    label: 'Energy today',
    chips: [{ label: 'Low', value: 2 }, { label: 'OK', value: 3 }, { label: 'High', value: 4 }],
  },
];

export default function HomeScreen({ navigation, route }) {
  const toast = useToast();
  // R9 (D70): insets and reduceMotion left with the raw intent Modal -
  // the shared BottomSheet owns both now.
  const { user, userProfile, startWorkout, activeWorkout, tier, bodyWeightUnits, restoreActiveWorkout, migrateFoodDayKeysOnce, setSessionAdjustments } = useAppStore(
    useShallow(s => ({ user: s.user, userProfile: s.userProfile, startWorkout: s.startWorkout, activeWorkout: s.activeWorkout, tier: s.tier, bodyWeightUnits: s.bodyWeightUnits, restoreActiveWorkout: s.restoreActiveWorkout, migrateFoodDayKeysOnce: s.migrateFoodDayKeysOnce, setSessionAdjustments: s.setSessionAdjustments }))
  );

  // CP-10 stage 3 (theming batch 2): live theme (src/hooks/useTheme.js).
  // `styles` below stays frozen (byte-identical StyleSheet.create, matching
  // batch 1's pattern); `live` carries every colour/fontSize/type-bearing
  // key from that frozen block, appended AFTER the frozen base in each style
  // array so a theme change re-renders this screen with no restart, at
  // identical rest values. Keys with no colour/fontSize token (pure layout:
  // flex/gap/padding/width/etc.) are omitted -- there is nothing to unfreeze.
  const t = useTheme();
  const live = {
    safe: { backgroundColor: t.colors.background },
    scheduleContextLine: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
    scheduleContextLineToday: { color: t.colors.primary },
    continueCard: { backgroundColor: t.colors.success },
    continueIcon: { backgroundColor: withAlpha(t.colors.background, alpha.soft) },
    continueTitle: { ...t.type.bodyStrong, color: t.colors.onPrimary },
    continueSub: { ...t.type.caption, color: withAlpha(t.colors.onPrimary, 0.8) },
    workoutName: { fontSize: t.fontSize.xxl, color: t.colors.textPrimary },
    workoutMeta: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
    mesoBriefChip: { backgroundColor: t.colors.surface2, borderColor: t.colors.border },
    mesoBriefText: { fontSize: t.fontSize.xs, color: t.colors.textSecondary },
    workoutOptionsText: { color: t.colors.textSecondary },
    proRecoverBtn: { backgroundColor: t.colors.primaryFill },
    proRecoverBtnText: { ...t.type.bodyStrong, color: t.colors.onPrimary },
    noPlanIconWrap: { backgroundColor: t.colors.primaryBg, borderColor: withAlpha(t.colors.primary, alpha.mid) },
    noPlanTitle: { ...t.type.h3, color: t.colors.textPrimary },
    noPlanSub: { ...t.type.bodySm, color: t.colors.textSecondary },
    blankSessionLink: { borderColor: t.colors.border, backgroundColor: t.colors.surface2 },
    blankSessionLinkText: { ...t.type.label, color: t.colors.textPrimary },
    starterCard: { backgroundColor: t.colors.surface, borderColor: withAlpha(t.colors.primary, alpha.edge) },
    glanceTitle: { fontSize: t.fontSize.xs, color: t.colors.textMuted },
    glanceStatValue: { fontSize: t.fontSize.xl, color: t.colors.textPrimary },
    glanceStatLabel: { ...t.type.caption, color: t.colors.textMuted },
    glanceDivider: { backgroundColor: t.colors.border },
    coachingNudge: { backgroundColor: t.colors.surface, borderColor: withAlpha(t.colors.primary, alpha.edge) },
    coachingNudgeLeft: { backgroundColor: t.colors.primaryBg },
    coachingNudgeTitle: { ...t.type.label, color: t.colors.textPrimary },
    coachingNudgeBody: { ...t.type.captionTight, color: t.colors.textSecondary },
    coachingNudgeScanSubline: { ...t.type.captionTight, color: t.colors.textMuted },
    coachingNudgeBtnText: { fontSize: t.fontSize.xs, color: t.colors.primary },
    intentTitle: { ...t.type.h3, color: t.colors.textPrimary },
    intentSub: { fontSize: t.fontSize.sm, color: t.colors.textMuted },
    intentOption: { backgroundColor: t.colors.surface2 ?? t.colors.background, borderColor: t.colors.border },
    intentOptionIcon: { backgroundColor: t.colors.primaryBg },
    intentOptionLabel: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    intentOptionSub: { ...t.type.caption, color: t.colors.textSecondary },
    readinessLabel: { ...t.type.caption, color: t.colors.textSecondary },
    readinessChip: { borderColor: t.colors.border, backgroundColor: t.colors.surface2 ?? t.colors.background },
    readinessChipActive: { borderColor: t.colors.primary, backgroundColor: t.colors.primaryBg },
    readinessChipText: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
    readinessChipTextActive: { color: t.colors.primary },
    intentSkipText: { fontSize: t.fontSize.sm, color: t.colors.textMuted },
    intentOptOutText: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
    intentOptOutSub: { fontSize: t.fontSize.xs, color: t.colors.textMuted },
    coachBanner: { backgroundColor: t.colors.primaryBg, borderColor: withAlpha(t.colors.primary, alpha.mid) },
    coachBannerTitle: { fontSize: t.fontSize.sm, color: t.colors.primary },
    coachBannerBody: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
    deloadBanner: { backgroundColor: withAlpha(t.colors.primary, alpha.tint), borderColor: withAlpha(t.colors.primary, alpha.mid) },
    deloadBannerTitle: { fontSize: t.fontSize.sm, color: t.colors.primary },
    deloadBannerBody: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
    plateauBanner: { backgroundColor: t.colors.primaryBg, borderColor: withAlpha(t.colors.primary, alpha.edge) },
    plateauBannerText: { ...t.type.bodySm, color: t.colors.textPrimary },
    activationBanner: { backgroundColor: t.colors.primaryBg, borderColor: withAlpha(t.colors.primary, alpha.edge) },
    activationBannerTitle: { ...t.type.bodySm, color: t.colors.textPrimary },
    activationBannerBody: { ...t.type.bodySm, color: t.colors.textMuted },
    phaseBanner: { backgroundColor: t.colors.primaryBg, borderColor: withAlpha(t.colors.primary, alpha.edge) },
    phaseBannerText: { ...t.type.captionTight, color: t.colors.textSecondary },
    quickStartCard: { backgroundColor: t.colors.primaryBg, borderColor: withAlpha(t.colors.primary, alpha.edge) },
    quickStartIcon: { backgroundColor: t.colors.surface2 },
    quickStartTitle: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    quickStartSub: { ...t.type.bodySm, color: t.colors.textSecondary },
  };
  // S15#7 readiness chip's tone colours, built live so it stays in the same
  // theme generation as CoachBriefCard (buildBriefIconColor, imported above).
  const BRIEF_ICON_COLOR = buildBriefIconColor(t.colors);

  // WK-1: recover an in-progress workout after an app kill/crash. The store
  // holds the session in memory only, so a kill stranded the logged sets
  // under an is_completed=0 row. Rehydrating here makes the "Session in
  // Progress" card reappear so the user can resume and finish it. No-ops when
  // a session is already live or no snapshot matches this user.
  // TZ-1 phase 2: also runs the one-shot food-entry day-key re-key (guarded
  // per user) so historical food lands on the local calendar day.
  useEffect(() => {
    if (user?.id && !activeWorkout) {
      restoreActiveWorkout(user.id);
    }
    if (user?.id) {
      migrateFoodDayKeysOnce(user.id);
    }
    // Only on user change: re-running on every activeWorkout change is
    // unnecessary (the guard already prevents clobbering a live session).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // H-2 (trial-subscription audit): present the subscribe-or-Free gate once when
  // the 14-day trial has ended, so it does not depend on the user having granted
  // notification permission (the only other way to reach it). One-time per user
  // via a flag; the gate itself is dismissible, so this is a prompt, not a wall.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) return;
      const ts = userProfile?.trialState ?? null;
      // Only after a trial that actually expired to Free (not paid, not a user
      // who chose Free up front and never trialled).
      if (ts !== 'cascade_expired' || tier !== 'free') return;
      // E7.2 activation funnel: a trial-lapsed (cascade_expired) user reached
      // Home, i.e. they came back after lapsing. Durable once-per-user; the
      // dashboard derives day-1-vs-later from the timestamp against the lapse
      // date. Fires independently of the gate-shown flag below.
      try {
        // eslint-disable-next-line global-require
        const { trackFirst } = require('../lib/telemetry/firsts');
        trackFirst(user.id, 'trial_lapse_day1_return').catch(() => {});
      } catch (_) { /* tolerate */ }
      const key = `@volyume_trial_end_gate_shown_${user.id}`;
      try {
        if (await AsyncStorage.getItem(key)) return;
        await AsyncStorage.setItem(key, 'true');
      } catch (_) { return; }
      if (cancelled) return;
      try {
        // T3: the helper hardcodes initial: false (F6b lazy-tab rule), so a
        // never-focused tab keeps its root beneath the pushed screen.
        navigateCrossTab(navigation, 'ProfileTab', 'CascadeGate', { variant: 'day14' });
      } catch (_) { /* navigation not ready; the notification path still covers it */ }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, userProfile?.trialState, tier]);
  // Cloud-sync version bumps when pullFromCloud finishes; HomeScreen
  // re-runs loadData so the empty state swaps for real data without
  // the user navigating away and back.
  const cloudSyncVersion = useAppStore(s => s.cloudSyncVersion);
  const bwu = bodyWeightUnits || 'st';
  // Integration wave (integration-plan.md §8): fail-closed (defaults
  // suppressed until both the calm-mode and open-ED-flag reads resolve), so
  // the check-in nudge's optional scan subline never flashes before that
  // confirmation lands.
  const photoScanSuppressed = usePhotoSuppression(user?.id);

  const [weekStats, setWeekStats] = useState({ sessions: 0, sets: 0, volume: 0 });
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
  const [showBlockShape, setShowBlockShape] = useState(false); // COMP-010 meso chip tap-through
  const [latestCoachOutput, setLatestCoachOutput] = useState(null);
  // COMP-023: day-3 trial value banner. { line, variant } when in-window, else
  // null. Computed from live counters in loadTrialBanner.
  const [trialBanner, setTrialBanner] = useState(null);
  const [trialBannerDismissed, setTrialBannerDismissed] = useState(false);
  // S3 (world-class audit): the ongoing "since your check-in" runway, below
  // the plan card. buildCoachLedger's result ({ variant, rows, unlockDate,
  // unlockLabel }) or null; computed in loadCoachRunway.
  const [coachRunway, setCoachRunway] = useState(null);
  // Free-tier weekly one-liner (founder decision 4c): one read-only
  // sentence built from training plus weight direction only. Dismissed
  // per week; defaults dismissed so it never flashes before the stored
  // dismissal has been read.
  const [freeCoachLine, setFreeCoachLine] = useState(null);
  const [freeCoachLineDismissed, setFreeCoachLineDismissed] = useState(true);
  // First-load flag, flipped false in loadData. While true, the
  // home screen renders skeleton cards in place of the main cards so
  // the user sees structure instantly on cold launch rather than a
  // blank screen until SQLite reads complete.
  const [initialLoading, setInitialLoading] = useState(true);
  const [coachBannerDismissed, setCoachBannerDismissed] = useState(false);
  const [todayWeight, setTodayWeight] = useState(null);       // logged weight for today
  const [recentWeights, setRecentWeights] = useState([]);     // last 14 entries for sparkline
  const [savingWeight, setSavingWeight] = useState(false);
  // First-launch welcome guide. Defaults to hidden so it never flashes before the
  // saved flag is read; the loader reveals it for a brand-new user (no sessions
  // logged) who hasn't dismissed it. Auto-clears once totalSessions > 0.
  const [welcomeDismissed, setWelcomeDismissed] = useState(true);
  const [showCoachingNudge, setShowCoachingNudge] = useState(false);
  const [totalSessions, setTotalSessions] = useState(0);
  const [showIntentPrompt, setShowIntentPrompt] = useState(false);
  // COMP-008: the three "walked-in-with" readiness facts, captured on the
  // pre-workout prompt where they are accurate rather than recalled after the
  // session. All optional, reset each time the prompt opens. Stored on the
  // scales the workout row + its readers expect (soreness 1-3; sleep/energy on
  // the 1-5 domain, the chips offering 2/3/4).
  const [readiness, setReadiness] = useState({
    soreness24hBefore: null,
    sleepQuality: null,
    energyScore: null,
  });
  const [teaserInsight, setTeaserInsight] = useState(null);
  const [deloadSuggestion, setDeloadSuggestion] = useState(null);
  const [deloadDismissed, setDeloadDismissed] = useState(false);

  // B3: lift plateau banner. { exerciseId, line } | null. Defaults dismissed
  // so it never flashes before the stored dismissal has been read (the
  // free-coach-line pattern); loadPlateauBanner reveals it.
  const [plateauBanner, setPlateauBanner] = useState(null);
  const [plateauBannerDismissed, setPlateauBannerDismissed] = useState(true);

  // NAV-4: differential paywall banner (free tier only). The detector result
  // ({ shown, trigger, with_food_data_message, paywall_cta }) or null.
  // Defaults dismissed so it never flashes before the stored per-week
  // dismissal has been read (the plateau/free-coach-line pattern).
  const [differentialBanner, setDifferentialBanner] = useState(null);
  const [differentialDismissed, setDifferentialDismissed] = useState(true);
  // S6: the in-app half of the activation lever, for a still-present but stalled
  // brand-new user (the push reaches the gone-quiet one). Tier-blind.
  const [activationNudge, setActivationNudge] = useState(null);
  const [activationNudgeDismissed, setActivationNudgeDismissed] = useState(true);

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
          seedRoutinesIfNeeded(user.id).catch((e) => logWarn('HomeScreen.seedRoutines', e?.message));
          setSeeded(true);
        }
        loadData();
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // HP-7: clear the loading spinner in a finally so a single rejected
    // loader can't leave Home spinning forever. The loaders each guard
    // their own errors, but Promise.all rejects on the first unhandled
    // throw and would otherwise skip setInitialLoading(false).
    try {
      // Positions 0 and 5 are read below by the differential loader (NAV-4):
      // loadWeekStats returns { deloadSuggested }, loadPlateauBanner returns
      // the picked plateau ({ exerciseId, weeks } | null). Keep them in place.
      // WARNING: this destructure is POSITIONAL. Inserting, removing or
      // reordering entries in the array below silently feeds the WRONG
      // loader's result into the differential paywall context (index 0 =
      // loadWeekStats, index 5 = loadPlateauBanner), adjust the holes in the
      // destructure together with any change to the array.
      const [weekSignals, , , , , plateauPick] = await Promise.all([
        loadWeekStats(),
        loadNextWorkout(),
        loadExerciseCounts(),
        loadBlockProgress(),
        loadPhaseBanner(),
        loadPlateauBanner(),
        loadFatigueTrend(),
        loadScheduleContext(),
        loadBriefDismissal(),
        loadWelcome(),
        loadActivationNudge(), // S6: tier-blind, computes from workouts + account age + ED flag
        ...(tier === 'pro' ? [loadTodayWeight(), loadLatestCoachOutput(), loadTrialBanner(), loadCoachRunway()] : []),
        ...(tier === 'free' ? [loadFreeCoachLine()] : []),
      ]);
      // NAV-4: the differential paywall's deload and stalled-lift contexts
      // come from what the loaders above computed, so it runs after them.
      if (tier === 'free') {
        await loadDifferentialBanner({
          deloadSuggested: !!weekSignals?.deloadSuggested,
          weeksLiftStalled: plateauPick?.weeks ?? null,
        });
      }
    } finally {
      setInitialLoading(false);
    }
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

  // COMP-023: build the day-3 value banner from live counters. Null unless the
  // user is in a Pro trial, within days 2–7, with no first review yet. Under an
  // open ED flag the line is the neutral fallback (no counts, no weight ask).
  async function loadTrialBanner() {
    try {
      if (!user?.id || stageOf(userProfile) !== 'pro_trial') { setTrialBanner(null); return; }

      // Re-lay the day-3 push on every Home open during the trial so its baked
      // variant/copy/unlock-day track the freshest counters. It is laid once at
      // trial start (day 0, when the user has done nothing → S3); without this
      // refresh an active user who never cold-relaunches would get that stale
      // "you've done nothing" push on day 3. No-ops once day 3 has passed.
      try {
        // eslint-disable-next-line global-require
        require('../lib/notifications').scheduleTrialDay3Notification(user.id, userProfile)?.catch?.(() => {});
      } catch (_) { /* best-effort */ }

      const endsAt = userProfile?.proTrialEndsAt ?? userProfile?.pro_trial_ends_at ?? null;
      const trialStart = trialStartFromEndsAt(endsAt);
      if (trialStart == null) { setTrialBanner(null); return; }
      // A3 (audit OB-4): the ledger runs from day 0, not day 2, week one is
      // exactly when the paid promise is otherwise invisible. It retires when
      // the first review lands (coachOut below) or the trial ends.
      const trialDay = Math.floor((Date.now() - trialStart) / 86400000);
      if (trialDay < 0 || trialDay > TRIAL_LENGTH_DAYS) { setTrialBanner(null); return; }

      // A coach output existing means the first review already happened, the
      // value moment is past, so the banner retires permanently.
      const [coachOut, workouts, weights, edFlag] = await Promise.all([
        getLatestCoachOutput(user.id).catch(() => null),
        getAllWorkouts(user.id).catch(() => []),
        getMorningWeightsLast14Days(user.id).catch(() => []),
        // ED-safety, fail CLOSED: a transient flag read maps to the truthy
        // 'read_failed' sentinel (edFlagOpen: !!edFlag below), so the trial
        // banner line + coach ledger use the neutral, no-weigh-in-count variant
        // on a read error (matches the siblings at :470/:521/:737/:794).
        getOpenEdPatternFlag(user.id).catch(() => 'read_failed'),
      ]);
      if (coachOut) { setTrialBanner(null); return; }

      const completedSessions = workouts.filter(w => w.isCompleted && (w.startedAt ?? 0) >= trialStart).length;
      const weekAgo = Date.now() - 7 * 86400000;
      const weighIns7d = weights.filter(w => (w.loggedAt ?? 0) >= weekAgo).length;
      const firstWeightAt = weights.length ? Math.min(...weights.map(w => w.loggedAt ?? Infinity)) : null;

      let checkinDay = 0;
      try {
        const raw = await AsyncStorage.getItem('@volyume_notification_prefs');
        if (raw) { const p = JSON.parse(raw); if (Number.isFinite(p?.checkinDay)) checkinDay = p.checkinDay; }
      } catch (_) {}

      const variant = selectTrialVariant({ completedSessions, weighIns7d });
      const unlock = firstReviewUnlockDate(firstWeightAt, checkinDay);
      const line = trialBannerLine({
        variant, completedSessions, weighIns7d,
        unlockDayName: dayName(unlock), trialDay, edFlagOpen: !!edFlag,
      });
      // A3: the "what your coach is reading" ledger, live counts vs the
      // published thresholds, from the same inputs as the banner line. Under
      // an open ED flag it is the neutral variant with no weigh-in counts.
      const ledger = buildCoachLedger({
        weighIns7d, completedSessions, firstWeightAt, checkinDay,
        edFlagOpen: !!edFlag,
      });

      // Read the per-trial dismissal BEFORE revealing the banner so a banner the
      // user already dismissed can't flash for a frame while the read resolves.
      const dKey = `@volyume_trial_value_banner_dismissed_${user.id}`;
      const dv = await AsyncStorage.getItem(dKey).catch(() => null);
      setTrialBannerDismissed(dv === 'true');
      setTrialBanner({ line, variant, ledger });
    } catch (_) {
      setTrialBanner(null);
    }
  }

  function dismissTrialBanner() {
    setTrialBannerDismissed(true);
    if (user?.id) {
      AsyncStorage.setItem(`@volyume_trial_value_banner_dismissed_${user.id}`, 'true').catch(() => {});
    }
  }

  // S3 (world-class audit, _SYNTHESIS.md #131-138): the ongoing "since your
  // check-in" runway below the plan card. Pro only (check-ins are a
  // Precision Coaching feature). Reuses buildCoachLedger -- the SAME ledger
  // the trial banner above builds -- fed the same shape of inputs
  // loadTrialBanner gathers, so the runway can never disagree with the
  // WeeklyCheckIn gate. Unlike the trial banner (trial-start-anchored, day
  // 0-14 only), this is meant to run for the whole Pro lifetime, so both
  // counts use a rolling trailing-7-day window (matching the check-in
  // screen's own MIN_WEIGH_INS window) rather than a trial-start anchor.
  async function loadCoachRunway() {
    try {
      if (!user?.id || tier !== 'pro') { setCoachRunway(null); return; }
      const [workouts, weights, edFlag, wellbeing] = await Promise.all([
        getAllWorkouts(user.id).catch(() => []),
        getMorningWeightsLast14Days(user.id).catch(() => []),
        getOpenEdPatternFlag(user.id).catch(() => 'read_failed'),
        AsyncStorage.getItem(WELLBEING_KEY).then((v) => v || 'unspecified').catch(() => 'read_failed'),
      ]);
      const weekAgo = Date.now() - 7 * 86400000;
      const weighIns7d = weights.filter(w => (w.loggedAt ?? 0) >= weekAgo).length;
      const completedSessions = workouts.filter(w => w.isCompleted && (w.startedAt ?? 0) >= weekAgo).length;
      const firstWeightAt = weights.length ? Math.min(...weights.map(w => w.loggedAt ?? Infinity)) : null;

      let checkinDay = 0;
      try {
        const raw = await AsyncStorage.getItem('@volyume_notification_prefs');
        if (raw) { const p = JSON.parse(raw); if (Number.isFinite(p?.checkinDay)) checkinDay = p.checkinDay; }
      } catch (_) {}

      // ED-safety: mirrors useWeeklyStreak's edSuppressed exactly (open flag,
      // a positive SCOFF screen, calm mode, or a failed flag/wellbeing read
      // all fail closed), folded into the ledger's single edFlagOpen lever so
      // it renders the SAME neutral no-counts variant every other coach
      // surface uses under any of these four conditions.
      const edSuppressed = !!edFlag
        || (Number.isFinite(userProfile?.scoffScore) && userProfile.scoffScore >= 2)
        || wellbeing === 'read_failed'
        || isCalm(wellbeing);

      const ledger = buildCoachLedger({
        weighIns7d, completedSessions, firstWeightAt, checkinDay,
        edFlagOpen: edSuppressed,
      });
      setCoachRunway(ledger);
    } catch (_) {
      setCoachRunway(null);
    }
  }

  // Free-tier weekly one-liner (founder decision 4c). Free-safe data
  // only: completed sessions this week plus the direction of any logged
  // morning weights. No rates, no figures, no targets, no food data and
  // no Pro functionality; the card is a read-only sentence with a Pro
  // footer. Suppressed to a training-only line under an open ED flag or
  // calm mode, per the existing COMP-004/COMP-023 rules.
  async function loadFreeCoachLine() {
    try {
      if (!user?.id) { setFreeCoachLine(null); return; }
      const weekStartMs = localWeekStartMs();
      const dKey = `@volyume_free_coach_line_dismissed_${user.id}_${weekStartMs}`;
      const [workouts, weights, edFlag, wellbeing, dismissed] = await Promise.all([
        getAllWorkouts(user.id).catch(() => []),
        getMorningWeightsLast14Days(user.id).catch(() => []),
        // Fail closed: a flag-read error maps to a truthy sentinel (suppresses
        // via !!edFlag), and wellbeing is read raw so a genuine failure is
        // distinguishable from 'unspecified' (getWellbeingMode swallows it).
        getOpenEdPatternFlag(user.id).catch(() => 'read_failed'),
        AsyncStorage.getItem(WELLBEING_KEY).then((v) => v || 'unspecified').catch(() => 'read_failed'),
        AsyncStorage.getItem(dKey).catch(() => null),
      ]);
      const sessionsThisWeek = workouts.filter(
        w => w.isCompleted && (w.startedAt ?? 0) >= weekStartMs,
      ).length;
      const line = buildFreeCoachLine({
        sessionsThisWeek,
        morningWeights: weights,
        edFlagOpen: !!edFlag,
        calmMode: isCalm(wellbeing) || wellbeing === 'read_failed',
      });
      // Read the dismissal BEFORE revealing the card so a line the user
      // already dismissed can't flash for a frame (trial-banner pattern).
      setFreeCoachLineDismissed(dismissed === 'true');
      setFreeCoachLine(line);
    } catch (_) {
      setFreeCoachLine(null);
    }
  }

  function dismissFreeCoachLine() {
    setFreeCoachLineDismissed(true);
    if (user?.id) {
      AsyncStorage.setItem(
        `@volyume_free_coach_line_dismissed_${user.id}_${localWeekStartMs()}`,
        'true',
      ).catch(() => {});
    }
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

  const welcomeKey = user?.id ? `@volyume_home_welcome_${user.id}` : null;

  async function loadWelcome() {
    if (!welcomeKey) return;
    try {
      const v = await AsyncStorage.getItem(welcomeKey);
      // Absent flag (a brand-new user) -> show; 'true' -> already dismissed.
      setWelcomeDismissed(v === 'true');
    } catch (_) {
      setWelcomeDismissed(true);
    }
  }

  // useCallback: HomeWelcomeCard is memoised (React.memo), so a stable
  // handler identity actually stops it re-rendering on every Home tick.
  const dismissWelcome = useCallback(() => {
    setWelcomeDismissed(true);
    if (welcomeKey) AsyncStorage.setItem(welcomeKey, 'true').catch(() => {});
  }, [welcomeKey]);

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

  // B3: proactive plateau-break surfacing. Detection input is training data
  // only (workout sets: load lifted and reps performed via
  // getWorkoutSetsSince); nothing weight- or food-derived feeds it, so no
  // ED-flag/calm suppression is required (COMP-004 scope is weight/food
  // content). Errors swallow to null like the other banner loaders.
  async function loadPlateauBanner() {
    try {
      if (!user?.id) { setPlateauBanner(null); return null; }
      // Eight weeks covers detectPlateau's four-session window for a weekly
      // lift without loading every set ever logged (LB-7 pattern).
      const eightWeeksAgo = Date.now() - 8 * 7 * 24 * 60 * 60 * 1000;
      const recentSets = await getWorkoutSetsSince(user.id, eightWeeksAgo);
      const picked = selectPlateauForBanner(recentSets);
      if (!picked) { setPlateauBanner(null); return null; }
      const ex = await getExerciseById(picked.exerciseId);
      if (!ex?.name) { setPlateauBanner(null); return picked; }
      // Dismissible per detected plateau: keyed by exercise + local week.
      // Read the dismissal BEFORE revealing the banner so a banner the user
      // already dismissed can't flash for a frame (trial-banner pattern).
      const dKey = `@volyume_plateau_banner_dismissed_${user.id}_${picked.exerciseId}_${localWeekStartMs()}`;
      const dv = await AsyncStorage.getItem(dKey).catch(() => null);
      setPlateauBannerDismissed(dv === 'true');
      setPlateauBanner({
        exerciseId: picked.exerciseId,
        line: plateauBannerLine(ex.name, picked.weeks),
      });
      // NAV-4: the picked plateau ({ exerciseId, weeks }) doubles as the
      // stalled-lift context for the differential loader.
      return picked;
    } catch (_) {
      setPlateauBanner(null);
      return null;
    }
  }

  function dismissPlateauBanner() {
    setPlateauBannerDismissed(true);
    if (user?.id && plateauBanner) {
      AsyncStorage.setItem(
        `@volyume_plateau_banner_dismissed_${user.id}_${plateauBanner.exerciseId}_${localWeekStartMs()}`,
        'true',
      ).catch(() => {});
    }
  }

  // NAV-4 (founder decision): the differential paywall, re-homed from the
  // Pro-guarded CoachOutput to the one surface its free-tier audience can
  // see. One honest pure evaluation of the locked Move #4 detector: the
  // stored check-in answers are mapped onto the engine vocabulary with each
  // week's own logged intake (the CoachOutput PIPE-005 read), and the deload
  // and stalled-lift contexts come from what Home's loaders already
  // computed. missing_tdee and block_summary need an engine run Home cannot
  // do, so they simply never fire here (the detector treats them as absent).
  // ED-safety: the trigger keys off adherence gaps, so any open ED flag or
  // calm mode suppresses it entirely (COMP-004 scope). Dismissible per week;
  // lowest slot in the banner stack, so the one-banner invariant holds.
  async function loadDifferentialBanner({ deloadSuggested = false, weeksLiftStalled = null } = {}) {
    try {
      if (!user?.id || tier !== 'free') { setDifferentialBanner(null); return; }
      // ED-safety, fail CLOSED: this is a food-adjacent monetisation surface,
      // so a FAILED flag/wellbeing read suppresses the banner. The usual
      // banner-loader pattern fails open on read errors, but a transient
      // failure here must never surface a nutrition upsell over a possibly
      // open ED flag or calm mode ('read_failed' is truthy for edFlag and
      // checked explicitly for wellbeing).
      const [edFlag, wellbeing] = await Promise.all([
        getOpenEdPatternFlag(user.id).catch(() => 'read_failed'),
        AsyncStorage.getItem(WELLBEING_KEY).then((v) => v || 'unspecified').catch(() => 'read_failed'),
      ]);
      if (edFlag || wellbeing === 'read_failed' || isCalm(wellbeing)) { setDifferentialBanner(null); return; }
      const [checkins, targets] = await Promise.all([
        getRecentCheckins(user.id, 3).catch(() => []),
        getNutritionTargets(user.id).catch(() => null),
      ]);
      if (!checkins.length) { setDifferentialBanner(null); return; }
      const mapped = await Promise.all(checkins.map(async (ci) => {
        let weekAvg = null;
        if (ci.weekStart) {
          try {
            const weekEndKey = localDayKey(ci.weekStart + 6 * 86400000);
            weekAvg = (await getRecentIntakeSummary(user.id, weekEndKey))?.avgKcal ?? null;
          } catch (_) { /* leave null; a plain 'no' stays a neutral off-target */ }
        }
        return mapCalsAdherence(ci.calsAdherence, weekAvg, targets?.targetKcal);
      }));
      const diff = detectDifferentialTrigger({
        userTier: tier,
        hasUsedTrial: !canStillTrial(userProfile),
        calsAdherence: mapped[0] ?? null,
        recentWeeklyHistory: mapped.slice(1).map(a => ({ adherence: a })),
        deloadSuggested,
        weeksLiftStalled,
      });
      if (!diff?.shown) { setDifferentialBanner(null); return; }
      // Read the per-week dismissal BEFORE revealing the banner so a badge
      // the user already dismissed can't flash for a frame (plateau pattern).
      const dKey = `@volyume_differential_banner_dismissed_${user.id}_${localWeekStartMs()}`;
      const dv = await AsyncStorage.getItem(dKey).catch(() => null);
      setDifferentialDismissed(dv === 'true');
      setDifferentialBanner(diff);
    } catch (_) {
      setDifferentialBanner(null);
    }
  }

  function dismissDifferentialBanner() {
    setDifferentialDismissed(true);
    if (user?.id) {
      AsyncStorage.setItem(
        `@volyume_differential_banner_dismissed_${user.id}_${localWeekStartMs()}`,
        'true',
      ).catch(() => {});
    }
  }

  // S6: resolve the activation-nudge stage for the in-app banner. Same pure
  // resolver as the push scheduler, so the two never disagree. Tier-blind.
  async function loadActivationNudge() {
    try {
      if (!user?.id) { setActivationNudge(null); return; }
      // ED-safety, fail CLOSED: a training-encouragement surface must never show
      // over an open ED flag, calm mode, or a FAILED flag/wellbeing read.
      const [edFlag, wellbeing] = await Promise.all([
        getOpenEdPatternFlag(user.id).catch(() => 'read_failed'),
        AsyncStorage.getItem(WELLBEING_KEY).then((v) => v || 'unspecified').catch(() => 'read_failed'),
      ]);
      if (edFlag || wellbeing === 'read_failed' || isCalm(wellbeing)) { setActivationNudge(null); return; }
      // Account-creation date (install proxy) from the live session.
      const createdIso = useAppStore.getState().session?.user?.created_at ?? null;
      const accountCreatedAtMs = createdIso ? new Date(createdIso).getTime() : null;
      if (!Number.isFinite(accountCreatedAtMs)) { setActivationNudge(null); return; }
      // Cheap early-out for established users (past window + grace): skip the
      // full workout read entirely, matching the scheduler. This loader runs on
      // every Home load, so the early-out matters for the whole established base.
      if (Date.now() - accountCreatedAtMs > NUDGE_WINDOW_GRACE_MS) { setActivationNudge(null); return; }
      // Fail safe on a read error (never surface a wrong-stage banner).
      let workouts;
      try {
        workouts = await getAllWorkouts(user.id);
      } catch (_) {
        setActivationNudge(null);
        return;
      }
      const completedStartedAtMs = workouts.filter((w) => w.isCompleted).map((w) => w.startedAt ?? 0);
      const nudge = resolveActivationNudge({ accountCreatedAtMs, completedStartedAtMs, nowMs: Date.now() });
      if (!nudge) { setActivationNudge(null); return; }
      // Per-stage dismissal, read BEFORE reveal so a dismissed banner can't flash.
      const dKey = `@volyume_home_activation_nudge_dismissed_${user.id}_${nudge.stage}`;
      const dv = await AsyncStorage.getItem(dKey).catch(() => null);
      setActivationNudgeDismissed(dv === 'true');
      setActivationNudge(nudge);
    } catch (_) {
      setActivationNudge(null);
    }
  }

  function dismissActivationNudge() {
    setActivationNudgeDismissed(true);
    if (user?.id && activationNudge?.stage) {
      AsyncStorage.setItem(
        `@volyume_home_activation_nudge_dismissed_${user.id}_${activationNudge.stage}`,
        'true',
      ).catch(() => {});
    }
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
      // Recent weights feed the "last known weight" prefill when today's
      // weight is not logged yet.
      try {
        const recent14 = await getMorningWeights(user.id, 14);
        setRecentWeights(recent14.map(w => w.weightKg).filter(Number.isFinite));
      } catch (_) {}
    } catch (_) {}
  }

  // COMP-027 Part B: TodayStrip owns the draft input + parsing and hands a kg
  // value here. HomeScreen stays the weight-data owner (it reloads on focus and
  // feeds the coach) and does the optimistic write.
  async function handleLogWeight(weightKg) {
    if (!weightKg || isNaN(weightKg) || weightKg <= 0 || weightKg > 300) return;
    // Optimistic: show the logged weight immediately. SQLite write happens in
    // the background. On failure, revert.
    const previousTodayWeight = todayWeight;
    setTodayWeight(weightKg);
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
      const fourWeeksAgo = Date.now() - 28 * 24 * 60 * 60 * 1000;
      // LB-7: this card needs at most the last four weeks of sets (week
      // stats + the deload window below), not every set ever logged. Load
      // that bounded slice once; the workout list is rows, not sets.
      const [allWorkouts, recentSets] = await Promise.all([
        getAllWorkouts(user.id),
        getWorkoutSetsSince(user.id, fourWeeksAgo),
      ]);
      const thisWeek = allWorkouts.filter(w => w.startedAt >= weekAgo && w.isCompleted);
      const workoutIds = new Set(thisWeek.map(w => w.id));
      const weekSets = recentSets.filter(s => workoutIds.has(s.workoutId) && s.setType !== 'warmup');
      const totalVol = weekSets.reduce((t, s) => t + (s.weight || 0) * (s.actualReps || 0), 0);
      setWeekStats({ sessions: thisWeek.length, sets: weekSets.length, volume: totalVol });


      const completed = allWorkouts.filter(w => w.isCompleted).sort((a, b) => b.startedAt - a.startedAt);
      setLastSession(completed[0] || null);
      setTotalSessions(completed.length);

      // Only show the check-in nudge on the user's actual check-in day,
      // once they have real training data to review. Gating on the
      // scheduled day (checkinDay in notif prefs, default Sunday) stops it
      // claiming the check-in is ready when it is still days away.
      if (tier === 'pro' && completed.length >= 3) {
        try {
          const seen = await AsyncStorage.getItem('@volyume_seen_coaching_nudge');
          if (seen !== 'true') {
            const raw = await AsyncStorage.getItem('@volyume_notification_prefs');
            const checkinDay = raw ? (JSON.parse(raw).checkinDay ?? 0) : 0;
            if (new Date().getDay() === checkinDay) setShowCoachingNudge(true);
          }
        } catch (_) {}
      }



      // Compute tonnage for last session. Usually inside the four-week
      // window already loaded; if the last session is older than that
      // (a returning user), fetch just that one workout's sets.
      if (completed[0]) {
        const lastId = completed[0].id;
        let lastSets = recentSets.filter(s => s.workoutId === lastId);
        if (lastSets.length === 0) {
          lastSets = await getWorkoutSetsForWorkout(lastId);
        }
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
          const wSets = recentSets.filter(s => wIds.has(s.workoutId) && s.setType !== 'warmup');
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
        // NAV-4: the differential loader reads this signal after the parallel
        // pass (state set above is not yet readable in the same pass).
        return { deloadSuggested: !!result.deload };
      } catch (_) {
        setDeloadSuggestion(null);
      }
    } catch (_e) {}
    return { deloadSuggested: false };
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

      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      // LB-7: fetch only the last week of sets rather than the whole
      // history then discarding all but seven days of it in JS.
      const [planned, recentSets, allExercises] = await Promise.all([
        getPlannedMuscleVolume(week.id),
        getWorkoutSetsSince(user.id, weekAgo),
        getAllExercises(),
      ]);

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

  async function handleStartNextWorkout(starter = false) {
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
      pendingStartRef.current = { routineId: routine.id, initialExercises, starter, routineName: routine.name };
      // D2 (founder decision 2026-07-03, Option A): a user who opted out of
      // the readiness ask starts immediately with NO readiness signal, the
      // exact Skip path, all-null inputs. Coaching input is never fabricated;
      // with nothing stated, session adjustments simply do not fire
      // (READINESS_RULES has no null key). Re-read each start so flipping the
      // Settings toggle takes effect on the very next session.
      const promptOff = await AsyncStorage.getItem('@volyume_intent_prompt_off').catch(() => null);
      if (promptOff === 'true') {
        confirmStart(null, { soreness24hBefore: null, sleepQuality: null, energyScore: null });
        return;
      }
      // Clear any readiness from a previously-cancelled prompt so each session
      // starts from blank chips.
      setReadiness({ soreness24hBefore: null, sleepQuality: null, energyScore: null });
      setShowIntentPrompt(true);
    } catch (e) {
      setIsStartingWorkout(false);
      logError('HomeScreen.handleStartNextWorkout', e, { userId: user?.id, routineId: target?.routine?.id });
      toast.show("Couldn't load workout, try again", { variant: 'error' });
    }
  }

  // COMP-008: an intent tap carries whatever readiness chips were set; Skip
  // passes intent null and no readiness (see the intent sheet). The values flow
  // straight into createWorkout, which writes them to the workout row.
  async function confirmStart(intent, readinessOverride = readiness) {
    setShowIntentPrompt(false);
    const pending = pendingStartRef.current;
    if (!pending) return;
    setIsStartingWorkout(true);
    try {
      const workout = await createWorkout(user.id, pending.routineId, {
        intent,
        ...readinessOverride,
      });
      startWorkout(workout, pending.initialExercises);
      // Always pass starterSession explicitly so a normal start can never inherit
      // a stale starterSession:true param on a reused ActiveWorkout instance.
      navigation.navigate('ActiveWorkout', {
        starterSession: !!pending.starter,
        starterRoutineName: pending.routineName,
      });
      // COMP-015 (Pro): compute + log this session's adjustments in the
      // background so it never delays the session opening. The line appears a
      // moment later once the local reads resolve. Runs once per start; a
      // crash-recovery restore rehydrates the result instead of recomputing.
      if (tier === 'pro') {
        computeAndLogSessionAdjustments({ userId: user.id, workout, exercises: pending.initialExercises })
          .then(setSessionAdjustments)
          .catch(() => {});
      }
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
      toast.show("Couldn't start workout, try again", { variant: 'error' });
    }
  }

  // useCallback: HomeLastSessionCard is memoised (React.memo), so a stable
  // handler identity actually stops it re-rendering on every Home tick.
  const handleRepeatLastSession = useCallback(async () => {
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
  }, [lastSession, user?.id, toast]);

  const hasActiveWorkout = !!activeWorkout && !isStartingWorkout;
  const displayWorkout = selectedWorkoutOverride || nextWorkout;
  // Canonical plan reference (issue 4): plan name + day descriptor from the
  // shared formatter, so this card can never drift from the Train tab again.
  // Must-fix 3 (2026-07-11): the hero eyebrow is a heading, so it drops the
  // "N×/Week" frequency baked into plan.name via planHeadingName() - the
  // raw name (with frequency) is kept everywhere else that reads
  // activePlan.name.
  const planProgress = displayWorkout
    ? activePlanLine(planHeadingName(activePlan?.name), displayWorkout?.idx ?? 0, nextWorkout?.total ?? 1)
    : null;

  // Derive how many days since last completed workout (null = no history)
  const lastWorkoutDaysAgo = lastSession
    ? Math.floor((Date.now() - lastSession.startedAt) / (24 * 60 * 60 * 1000))
    : null;

  // Compute pre-workout coaching brief (shown only when plan active + not trained today + not dismissed)
  const showCoachBrief = !!activePlan && !hasActiveWorkout && lastWorkoutDaysAgo !== 0 && !briefDismissed;
  const rawCoachBrief = showCoachBrief
    ? buildCoachBrief({
        fatigueHistory: fatigueSessions,
        weeklyVolume: weekStats,
        deloadSuggestion,
        lastWorkoutDaysAgo,
        blockProgress,
      })
    : null;
  // Suppress the default "Ready when you are" filler (founder 2026-06-30: it
  // rendered the same line as headline AND body, a content-free card under the
  // hero). Only show the brief when it carries a real coaching signal.
  const coachBrief = rawCoachBrief && rawCoachBrief.headline !== 'Ready when you are'
    ? rawCoachBrief
    : null;

  // S15#7: readiness aggregate. One calm line for the mesocycle chip,
  // composed from signals HomeScreen already loads (block phase, the
  // shouldDeload signal, last session's soreness/sleep/energy facts, recent
  // fatigue trend) rather than the phase-only text it showed before.
  const readinessSummary = buildReadinessSummary({
    currentMesoWeek,
    deloadSuggestion,
    fatigueHistory: fatigueSessions,
    lastSession,
  });

  // Banner priority (D14, DECISIONS-2026-07-09.md, Home banner cap ruling
  // delegated to the lead): keep the primary "Start" action prominent by
  // showing AT MOST ONE attention banner at a time, chosen by this fixed
  // priority order; every other eligible banner simply waits its turn, and
  // the next-highest-priority one appears on the next render once the shown
  // banner is dismissed or resolves. This supersedes the earlier D7 "top two
  // + collapsed overflow" model (AC-6/CP-1, design-usability-audit-2026-07-09)
  // as the strongest match to the one-hero Materials Policy. A fresh weekly
  // coach review outranks a trial/paywall countdown, which outranks a
  // suggested recovery week, which outranks the nutrition-phase nudge, then
  // a lift plateau, then the activation nudge, then the free-tier/
  // differential upsell line (see the ranked list below for the full order
  // and rationale). Nothing here is an ED-safety, wellbeing or calm-mode
  // banner (each already fails closed under an open ED flag/calm mode inside
  // its own loader, unchanged by this), so none needs always-show/exempt
  // treatment; this is a pure attention-priority call. Dismissal semantics
  // are untouched per banner: the cap only decides who gets the one visible
  // slot, it never marks an unshown banner as seen/dismissed.
  // Only surface the "this week's review" banner when the coach actually has a
  // review, i.e. it had enough data to assess the week. During the baseline
  // weeks the output is hasEnoughData:false ("Building your baseline,
  // adjustments start after week 2"), and advertising it as a ready review with
  // "what changed and why" was telling users coaching was live when it wasn't
  // (founder 2026-06-21).
  const showCoachBanner = tier === 'pro' && !!latestCoachOutput && latestCoachOutput.hasEnoughData
    && !coachBannerDismissed
    && (Date.now() - (latestCoachOutput.weekStart ?? 0) < 7 * 86400000);
  // T2 (world-class-audit-2026-07-03/05-cohesion.md #4): today this signal
  // surfaces ONLY on this banner, and dismissing it loses the reminder for the
  // rest of the week. Mirror the exact same condition into the store so the
  // You-tab icon can carry a calm badge too; CoachOutputScreen clears both the
  // badge and this banner (same per-week dismissal flag) the moment the
  // review is actually viewed, not just when the banner's own close button is
  // tapped. showCoachBanner is rank 1 below, so it is always the one shown
  // whenever eligible, this mirror never disagrees with what Home shows.
  useEffect(() => {
    useAppStore.getState().setHasUnseenCoachChange(showCoachBanner);
  }, [showCoachBanner]);
  // COMP-023 trial value banner: suppressed by the day-of coaching nudge so
  // two voices never say the same thing (a "don't repeat yourself" rule,
  // kept as-is; unrelated to the stack-size cap below).
  const trialBannerEligible = !!trialBanner && !trialBannerDismissed && !showCoachingNudge;
  const deloadBannerEligible = !!deloadSuggestion && !deloadDismissed;
  const phaseBannerEligible = !!phaseMismatch && !phaseBannerDismissed;
  // B3 lift plateau banner: below deload and phase, recovery and targets
  // outrank a single lift's stall, dismissible per exercise + week.
  const plateauBannerEligible = !!plateauBanner && !plateauBannerDismissed;
  // S6 activation nudge: below the coaching/recovery banners but ABOVE the
  // free-tier upsell lines (founder call: retention over monetisation for a
  // barely-active new user). Tier-blind. The cold-start stage is deliberately
  // NOT shown here, welcomeCard already owns the 0-session in-app moment; only
  // the two stall stages render a banner. Per-stage dismissible.
  const activationBannerEligible = !!activationNudge && activationNudge.stage !== NUDGE_STAGE.COLD_START
    && !activationNudgeDismissed;
  // Free-tier weekly one-liner (founder decision 4c) and the NAV-4
  // differential paywall badge share the lowest-priority slot; AttentionCard's
  // own pickAttentionVariant already decides between the two when both apply.
  const freeCoachLineEligible = tier === 'free' && !!freeCoachLine && !freeCoachLineDismissed;
  const differentialBadgeEligible = tier === 'free' && !!differentialBanner?.shown && !differentialDismissed;

  // The ranked list, highest priority first. Filtering to only the currently
  // eligible ones keeps this dynamic: whichever banners are actually active
  // this load compete for the ONE visible slot, in this fixed order.
  const BANNER_PRIORITY = [
    { key: 'coach', eligible: showCoachBanner },
    { key: 'trial', eligible: trialBannerEligible },
    { key: 'deload', eligible: deloadBannerEligible },
    { key: 'phase', eligible: phaseBannerEligible },
    { key: 'plateau', eligible: plateauBannerEligible },
    { key: 'activation', eligible: activationBannerEligible },
    { key: 'attention', eligible: freeCoachLineEligible || differentialBadgeEligible },
  ].filter(b => b.eligible);
  // The single decision point for the cap: whichever eligible banner ranks
  // highest takes the one visible slot; everything else waits its turn.
  const shownBannerKey = BANNER_PRIORITY[0]?.key ?? null;

  const showTrialCountdownBanner = shownBannerKey === 'trial';
  const showDeloadBanner = shownBannerKey === 'deload';
  const showPhaseBanner = shownBannerKey === 'phase';
  const showPlateauBanner = shownBannerKey === 'plateau';
  const showActivationBanner = shownBannerKey === 'activation';
  const showAttentionSlot = shownBannerKey === 'attention';
  // Free line still outranks the differential badge within their shared slot.
  const showFreeCoachLine = freeCoachLineEligible && showAttentionSlot;
  const showDifferentialBadge = differentialBadgeEligible && !freeCoachLineEligible && showAttentionSlot;

  // Pre-formatted for HomeLastSessionCard (memoised): keeps the component a
  // pure renderer of already-derived data rather than importing the helper.
  const lastSessionRelativeDay = lastSession ? getRelativeDay(lastSession.startedAt) : null;

  // Stable handler identities for the memoised (React.memo) extracted
  // components below, so passing them as props doesn't defeat the memo.
  const goToProUpgrade = useCallback(() => navigation.navigate('ProUpgrade'), [navigation]);
  const goToWorkoutHistory = useCallback(() => navigation.navigate('WorkoutHistory'), [navigation]);
  const closeBlockShape = useCallback(() => setShowBlockShape(false), []);
  const closeChangeWorkout = useCallback(() => setShowChangeWorkout(false), []);

  return (
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top']}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={t.colors.primary} />}
      >
        {/* ── Branded header ── */}
        <ScreenHeader title="Today" subtitle={getGreeting(userProfile?.firstName)} />

        {/* ── Training schedule context line ── */}
        {scheduleContext && (
          <Text maxFontSizeMultiplier={1.3} style={[
            styles.scheduleContextLine,
            live.scheduleContextLine,
            scheduleContext.daysUntil === 0 && [styles.scheduleContextLineToday, live.scheduleContextLineToday],
          ]}>
            {scheduleContext.daysUntil === 0
              ? 'Today is a training day'
              : scheduleContext.daysUntil === 1
                ? 'Next session: tomorrow'
                : `Next session: ${scheduleContext.dayName}`}
          </Text>
        )}

        {/* ── Compact top start CTA (above-the-fold) ── */}
        {/* The single start surface is the hero card below. The old top
            "Start workout + Start empty workout" row duplicated it one-for-one,
            so it's gone (founder 2026-06-30). */}

        {/* Cloud restore banner removed, the typical pull completes
            in under a second on a healthy connection so the banner
            flashed and vanished. Pull-to-refresh on Home still shows
            the standard RefreshControl spinner if the user wants to
            force a sync. */}

        {/* ── Fresh coach update banner ── */}
        {showCoachBanner && (
          <TouchableOpacity
            style={[styles.coachBanner, live.coachBanner]}
            // F4 (audit NAV-1): CoachOutput is registered in ProfileStack only.
            // A bare navigate from HomeStack is silently dropped in production,
            // making the flagship banner a dead tap; route via the parent tab
            // navigator like the phase banner above.
            onPress={() => navigateCrossTab(navigation, 'ProfileTab', 'CoachOutput', { weekStart: latestCoachOutput.weekStart })}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="This week's coaching review. Tap to open."
          >
            <View style={styles.coachBannerLeft}>
              <Ionicons name="pulse-outline" size={18} color={t.colors.primary} />
              <View style={{ flex: 1 }}>
                <Text maxFontSizeMultiplier={1.3} style={[styles.coachBannerTitle, live.coachBannerTitle]}>Coach - this week's decision</Text>
                <Text maxFontSizeMultiplier={1.3} style={[styles.coachBannerBody, live.coachBannerBody]}>
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
              accessibilityRole="button"
              accessibilityLabel="Dismiss coaching review banner"
            >
              <Ionicons name="close" size={16} color={t.colors.textMuted} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* ── D3: the "worth your attention" card, trial variant (second
            priority, its historical slot). The card class and its internal
            priority live in AttentionCard; only the slot lives here. ── */}
        {showTrialCountdownBanner && (
          <AttentionCard
            variant="trial"
            trialBanner={trialBanner}
            onTrialPress={() => {
              if (trialBanner.variant === 'S3') {
                scrollRef.current?.scrollTo({ y: 0, animated: true });
              } else {
                navigateCrossTab(navigation, 'ProfileTab', 'WeeklyCheckIn');
              }
            }}
            onTrialDismiss={dismissTrialBanner}
            onMethodology={() => navigateCrossTab(navigation, 'ProfileTab', 'Methodology', { source: 'trial_banner' })}
          />
        )}

        {/* ── Recovery week banner ── */}
        {showDeloadBanner && (
          <TouchableOpacity
            style={[styles.deloadBanner, live.deloadBanner]}
            onPress={() => navigation.navigate('CoachReview')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Recovery week suggested. Tap to review."
          >
            <View style={styles.deloadBannerLeft}>
              {/* Class C (COMP-027): recovery is rest-positive, the coach
                  working for you, not a hazard. Primary amber, not warning. */}
              <Ionicons name="battery-charging-outline" size={20} color={t.colors.primary} />
              <View style={{ flex: 1 }}>
                <Text maxFontSizeMultiplier={1.3} style={[styles.deloadBannerTitle, live.deloadBannerTitle]}>Recovery week suggested</Text>
                <Text maxFontSizeMultiplier={1.3} style={[styles.deloadBannerBody, live.deloadBannerBody]}>
                  {deloadSuggestion.reasons?.[0] ?? 'Your recent training signals it is time for a lighter week.'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setDeloadDismissed(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Dismiss recovery week banner"
            >
              <Ionicons name="close" size={16} color={t.colors.textMuted} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* ── Nutrition phase sync banner ── */}
        {showPhaseBanner && (
          <View style={[styles.phaseBanner, live.phaseBanner]}>
            <Ionicons name="information-circle-outline" size={18} color={t.colors.primary} style={{ marginTop: spacing.hair }} />
            <Text maxFontSizeMultiplier={1.3} style={[styles.phaseBannerText, live.phaseBannerText]} numberOfLines={3}>
              Your nutrition targets are set for {phaseMismatch.savedPhaseLabel}. Update them in Coach to reflect your current plan.
            </Text>
            <TouchableOpacity
              style={styles.phaseBannerArrow}
              onPress={() => navigateCrossTab(navigation, 'ProfileTab', 'NutritionTargets')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Go to nutrition targets"
            >
              <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={dismissPhaseBanner}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Dismiss nutrition phase banner"
            >
              <Ionicons name="close" size={15} color={t.colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── B3 lift plateau banner. Training-only content; taps through to
            the existing plateau protocol on ExerciseDetail. ExerciseDetail is
            registered in the Progress stack, not this one, so route via the
            parent tab navigator (F4 / NAV-1 bug class). ── */}
        {showPlateauBanner && (
          <TouchableOpacity
            style={[styles.plateauBanner, live.plateauBanner]}
            onPress={() => navigateCrossTab(navigation, 'ProgressTab', 'ExerciseDetail', { exerciseId: plateauBanner.exerciseId })}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={plateauBanner.line}
          >
            <View style={styles.plateauBannerLeft}>
              <Ionicons name="analytics-outline" size={18} color={t.colors.primary} />
              <Text maxFontSizeMultiplier={1.3} style={[styles.plateauBannerText, live.plateauBannerText]} numberOfLines={2}>{plateauBanner.line}</Text>
              <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.primary} />
            </View>
            <TouchableOpacity
              onPress={dismissPlateauBanner}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Dismiss plateau banner"
            >
              <Ionicons name="close" size={16} color={t.colors.textMuted} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* ── S6 activation nudge banner (stall stages only; cold-start is
            welcomeCard's). Taps through to start the next session. ── */}
        {showActivationBanner && (
          <TouchableOpacity
            style={[styles.activationBanner, live.activationBanner]}
            onPress={() => handleStartNextWorkout(false)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={activationBannerLine(activationNudge.stage)?.title}
          >
            <View style={styles.activationBannerLeft}>
              <Ionicons name="barbell-outline" size={18} color={t.colors.primary} />
              <View style={{ flex: 1 }}>
                <Text maxFontSizeMultiplier={1.3} style={[styles.activationBannerTitle, live.activationBannerTitle]} numberOfLines={1}>
                  {activationBannerLine(activationNudge.stage)?.title}
                </Text>
                <Text maxFontSizeMultiplier={1.3} style={[styles.activationBannerBody, live.activationBannerBody]} numberOfLines={2}>
                  {activationBannerLine(activationNudge.stage)?.body}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={dismissActivationNudge}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Dismiss"
            >
              <Ionicons name="close" size={16} color={t.colors.textMuted} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* ── D3: the "worth your attention" card, low slot (free tier). The
            internal priority, free_line over differential, is decided by
            pickAttentionVariant, the card class's single decision point. ── */}
        {(showFreeCoachLine || showDifferentialBadge) && (
          <AttentionCard
            variant={pickAttentionVariant({
              freeLine: showFreeCoachLine,
              differential: showDifferentialBadge,
            })}
            freeCoachLine={freeCoachLine}
            onFreeLineDismiss={dismissFreeCoachLine}
            onUpgrade={() => navigation.navigate('ProUpgrade')}
            differential={differentialBanner}
            onDifferentialCta={(action) => {
              if (action === 'shown') {
                trackEngineEvent(user?.id, 'paywall_shown', {
                  surface: `differential_${differentialBanner.trigger}`,
                  trigger: differentialBanner.trigger,
                  user_pricing_window: userProfile?.lockedInPriceTier ?? 'open_beta',
                }).catch(() => {});
              } else if (action === 'pay') {
                navigation.navigate('ProUpgrade');
              } else if (action === 'dismiss') {
                trackEngineEvent(user?.id, 'paywall_tapped_cta', {
                  surface: `differential_${differentialBanner.trigger}`,
                  cta: 'dismiss',
                }).catch(() => {});
                dismissDifferentialBanner();
              }
            }}
          />
        )}

        {/* D14 (Home banner cap): no "reveal the rest" affordance. Exactly
            one attention banner shows at a time (whichever above won the
            slot); the others wait their turn and appear on a later render
            once the shown one is dismissed or resolves. ── */}

        {/* Skeleton placeholders shown during initial cold-load. As
            soon as loadData completes, this block disappears and the
            real content (which is largely below) renders. Without it,
            the user sees a blank screen for the ~100-300ms it takes
            SQLite reads to complete on a fresh app start. */}
        {initialLoading && (
          <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
            {/* COMP-027 Part B: the skeleton teaches the new hierarchy,
                hero-shaped first, the Today strip second. */}
            <SkeletonCard height={160} />
            <SkeletonCard height={64} />
          </View>
        )}


        {/* COMP-013: the standalone first-run cue row retired here, its job
            folds into the hero first-run variant below (a net minus-one-card on
            Home, the direction COMP-027 demands: hero first, fewer stacked
            utilities). The dismissal key and gating are reused there. */}

        {/* Today strip (COMP-027 Part B): the morning-weight card sits above
            the session hero. Meal planning/logging and cardio stay in their
            own flows so this premium slot does one job clearly. */}
        {tier === 'pro' && user?.id && (
          <TodayStrip
            bwu={bwu}
            todayWeight={todayWeight}
            lastWeightKg={recentWeights.length ? recentWeights[recentWeights.length - 1] : (userProfile?.weightKg ?? null)}
            savingWeight={savingWeight}
            onLogWeight={handleLogWeight}
            // OB-8: the weekly check-in's "Log my weight first" CTA deep-links
            // here with a fresh timestamp; the strip opens its weight input.
            openWeightSignal={route?.params?.openWeightLog ?? null}
            onOpenTrend={() => navigateCrossTab(navigation, 'ProgressTab', 'Analytics', { focusWeightTrend: true })}
          />
        )}

        {/* First-launch orientation (founder 2026-06-30): a calm welcome for a
            brand-new user, shown only until the first session is logged
            (totalSessions === 0) and dismissible. The two steps are INSTRUCTION
            that points at the start action below, never duplicate buttons, so it
            orients without competing with the hero / starter cards. Research:
            docs competitive-mastery (Cronometer drip-one-pointer) + NN/G empty
            states. No weight/calorie line here (ED-safety). */}
        {!initialLoading && totalSessions === 0 && !welcomeDismissed && activePlan && nextWorkout && (
          <HomeWelcomeCard onDismiss={dismissWelcome} />
        )}

        {/* ── Primary workout area ── */}
        {hasActiveWorkout ? (
          <PressableCard
            style={[styles.continueCard, live.continueCard]}
            onPress={() => navigation.navigate('ActiveWorkout')}
            accessibilityLabel="Continue active workout"
          >
            <View style={styles.continueInner}>
              <View style={[styles.continueIcon, live.continueIcon]}>
                <Ionicons name="play" size={20} color={t.colors.onPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text maxFontSizeMultiplier={1.3} style={[styles.continueTitle, live.continueTitle]}>Workout in progress</Text>
                <Text maxFontSizeMultiplier={1.3} style={[styles.continueSub, live.continueSub]}>Tap to return to your workout</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={withAlpha(t.colors.onPrimary, 0.8)} />
            </View>
          </PressableCard>
        ) : activePlan && nextWorkout ? (
          <Card surface="surfaceElevated" style={styles.heroCard}>
            <SectionLabel tone="muted" style={styles.heroEyebrow} numberOfLines={1}>
              {planProgress}
            </SectionLabel>
            <Text maxFontSizeMultiplier={1.3} style={[styles.workoutName, live.workoutName]} numberOfLines={2}>
              {displayWorkout?.routine?.name}
            </Text>
            {exerciseCounts[displayWorkout?.routine?.id] ? (
              <Text maxFontSizeMultiplier={1.3} style={[styles.workoutMeta, live.workoutMeta]}>
                {exerciseCounts[displayWorkout.routine.id]} exercises
              </Text>
            ) : null}
            {/* S15#7 readiness aggregate: tells the user where they are in
                the training block PLUS whatever recovery/soreness/sleep/
                energy/fatigue signal outranks a plain phase read this week,
                composed by buildReadinessSummary so it is one calm line
                instead of the phase-only chip plus scattered other reads.
                Keeps Volyume's coaching identity visible at the start of
                every session, the way an RP-style plan would. Tooltip-free
                because the row is glanceable on its own. */}
            {readinessSummary && (
              <TouchableOpacity
                style={[styles.mesoBriefChip, live.mesoBriefChip]}
                onPress={() => setShowBlockShape(true)}
                accessibilityRole="button"
                accessibilityLabel="See the shape of your training block"
              >
                <Ionicons
                  name={READINESS_ICON[readinessSummary.tone] ?? READINESS_ICON.go}
                  size={12}
                  color={BRIEF_ICON_COLOR[readinessSummary.tone] ?? BRIEF_ICON_COLOR.go}
                />
                <Text maxFontSizeMultiplier={1.3} style={[styles.mesoBriefText, live.mesoBriefText]}>{readinessSummary.line}</Text>
                <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
              </TouchableOpacity>
            )}
            {coachBrief && (
              <CoachBriefCard brief={coachBrief} onDismiss={dismissBrief} />
            )}
            {/* The full planned session is the primary action for everyone
                (founder 2026-06-30: the old first-run variant highlighted a
                cut-down "short session" with the full one demoted below, which
                read as the wrong default, start the actual session). */}
            <View style={styles.startWorkoutRow}>
              <View style={styles.startBtnSplit}>
                <Button
                  title={isStartingWorkout ? 'Starting...' : 'Start workout'}
                  icon="play"
                  onPress={() => handleStartNextWorkout(false)}
                  disabled={isStartingWorkout}
                  accessibilityLabel={isStartingWorkout ? 'Starting workout' : `Start ${displayWorkout?.routine?.name || 'workout'}`}
                  style={[styles.primaryBtn, { marginTop: 0 }]}
                />
              </View>
              <Button
                variant="secondary"
                title="Options"
                icon="ellipsis-horizontal"
                onPress={() => setShowChangeWorkout(true)}
                accessibilityLabel="Workout options"
                fullWidth={false}
                style={styles.workoutOptionsBtn}
                textStyle={[styles.workoutOptionsText, live.workoutOptionsText]}
              />
            </View>
            {/* S2: the compact consistency echo + one-time forgiveness explainer,
                same resolver as the Progress strip so the number never disagrees;
                absent under ED flag / SCOFF / calm mode. */}
            <ConsistencyEcho userId={user?.id} scoffScore={userProfile?.scoffScore} />
          </Card>
        ) : (
          <View style={styles.noPlanSection}>
            {tier === 'pro' ? (
              <>
                <View style={styles.noPlanHero}>
                  <View style={[styles.noPlanIconWrap, live.noPlanIconWrap]}>
                    <Ionicons name="barbell-outline" size={28} color={t.colors.primary} />
                  </View>
                  <Text maxFontSizeMultiplier={1.3} style={[styles.noPlanTitle, live.noPlanTitle]}>No active plan yet</Text>
                  <Text maxFontSizeMultiplier={1.3} style={[styles.noPlanSub, live.noPlanSub]}>
                    If you just signed in, we may still be pulling your data from the cloud. If nothing arrives, start with a plan and we'll rebuild it from your profile.
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.proRecoverBtn, live.proRecoverBtn]}
                  accessibilityRole="button"
                  accessibilityLabel="Start with a plan"
                  onPress={async () => {
                    const result = await generateAndSavePlan(user.id, userProfile);
                    if (result.ok) {
                      await loadData();
                    } else {
                      toast.show(`Couldn't start plan: ${result.error}`, { variant: 'error', duration: 5000 });
                    }
                  }}
                  activeOpacity={0.88}
                >
                  <Ionicons name="clipboard-outline" size={18} color={t.colors.onPrimary} />
                  <Text maxFontSizeMultiplier={1.3} style={[styles.proRecoverBtnText, live.proRecoverBtnText]}>Start with a plan</Text>
                </TouchableOpacity>
              </>
            ) : (
              /* B2: the free "what do I do today" answer. One strong, calm
                 card: the micro-quiz first, the library second. Replaces the
                 old low-emphasis welcome + stacked builder cards. */
              <View style={[styles.starterCard, live.starterCard]}>
                <View style={[styles.noPlanIconWrap, live.noPlanIconWrap]}>
                  <Ionicons name="compass-outline" size={28} color={t.colors.primary} />
                </View>
                <Text maxFontSizeMultiplier={1.3} style={[styles.noPlanTitle, live.noPlanTitle]}>No active plan yet</Text>
                <Text maxFontSizeMultiplier={1.3} style={[styles.noPlanSub, live.noPlanSub]}>
                  {lastSession == null
                    ? "Answer three quick questions and we'll suggest a starter plan. You can also browse the library."
                    : "You've been training without a set plan. Answer three quick questions and we'll suggest a starter plan, or browse the library."}
                </Text>
                <View style={styles.starterActions}>
                  <Button
                    title="Start with a plan"
                    onPress={() => navigation.navigate('FreeStarter')}
                    accessibilityLabel="Answer three quick questions to start with a plan"
                  />
                  <Button
                    title="Browse plans"
                    variant="secondary"
                    onPress={() => navigation.navigate('PlansTab', { screen: 'PlanLibrary', initial: false })}
                    accessibilityLabel="Browse the plan library"
                  />
                </View>
              </View>
            )}

            {/* Progress at a glance, shown when there's history but no plan */}
            {lastSession != null && (
              <Card style={styles.glanceCard}>
                <Text maxFontSizeMultiplier={1.3} style={[styles.glanceTitle, live.glanceTitle]}>Your progress at a glance</Text>
                <View style={styles.glanceRow}>
                  <View style={styles.glanceStat}>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.glanceStatValue, live.glanceStatValue]}>{weekStats.sessions}</Text>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.glanceStatLabel, live.glanceStatLabel]}>Sessions this week</Text>
                  </View>
                  <View style={[styles.glanceDivider, live.glanceDivider]} />
                  <View style={styles.glanceStat}>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.glanceStatValue, live.glanceStatValue]}>
                      {getRelativeDay(lastSession.startedAt)}
                    </Text>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.glanceStatLabel, live.glanceStatLabel]}>Last session</Text>
                  </View>
                </View>
              </Card>
            )}

            {/* Pro keeps the quick-start escape hatch while cloud restore
                lands. The free path's blank-session route is the quiet link
                below the starter card instead. */}
            {tier === 'pro' && (
              <PressableCard
                style={[styles.quickStartCard, live.quickStartCard]}
                onPress={() => startBlankSession()}
                accessibilityLabel="Start your first workout"
              >
                <View style={[styles.quickStartIcon, live.quickStartIcon]}>
                  <Ionicons name="barbell-outline" size={28} color={t.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text maxFontSizeMultiplier={1.3} style={[styles.quickStartTitle, live.quickStartTitle]}>Start your first workout</Text>
                  <Text maxFontSizeMultiplier={1.3} style={[styles.quickStartSub, live.quickStartSub]}>Log sets as you go. No plan needed to start. Your profile builds as you train.</Text>
                </View>
                <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
              </PressableCard>
            )}

            {tier !== 'pro' && (
              <TouchableOpacity
                style={[styles.blankSessionLink, live.blankSessionLink]}
                onPress={() => startBlankSession()}
                accessibilityRole="button"
                accessibilityLabel="Just want to log? Start a blank workout"
              >
                <Ionicons name="play-outline" size={14} color={t.colors.textSecondary} />
                <Text maxFontSizeMultiplier={1.3} style={[styles.blankSessionLinkText, live.blankSessionLinkText]}>Just want to log? Start a blank workout</Text>
                <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── S3: daily brief + since-your-check-in runway. A fixed fixture
            below the plan card (not part of the one-banner priority stack
            above), per docs/wave-a-build-status-2026-07-03.md Issue 6. The
            runway is Pro only; the one-liner is tier-agnostic. ── */}
        {/* Runway suppressed while the trial-value banner is showing (the
            trial's first-review window) so weigh-ins/sessions are not said in
            two places at once; the schedule one-liner still shows. */}
        <CoachDailyBrief ledger={tier === 'pro' && !trialBanner ? coachRunway : null} />

        {/* ── Pro teaser (free tier only, after 3+ sessions) ── now below the
            hero with the same hero-first reorder. */}
        {tier === 'free' && totalSessions >= 3 && (
          <HomeProTeaserCard
            totalSessions={totalSessions}
            teaserInsight={teaserInsight}
            onPress={goToProUpgrade}
          />
        )}

        {/* ── Last session (D3, design audit 03): demoted to one slim row.
            Same tap-through to history, same Repeat action, same stats,
            compressed to a label line, a one-line name and an inline meta
            line instead of a card-sized sibling to the hero. ── */}
        {lastSession && (
          <HomeLastSessionCard
            lastSession={lastSession}
            lastSessionTonnage={lastSessionTonnage}
            relativeDay={lastSessionRelativeDay}
            onOpenHistory={goToWorkoutHistory}
            onRepeat={handleRepeatLastSession}
          />
        )}


        {/* "This week's plan" (block progress) moved to Progress tab. */}

        {/* ── Coaching discovery nudge (Pro, one-time) ── */}
        {showCoachingNudge && (
          <View style={[styles.coachingNudge, live.coachingNudge]}>
            <View style={[styles.coachingNudgeLeft, live.coachingNudgeLeft]}>
              <Ionicons name="pulse-outline" size={20} color={t.colors.primary} />
            </View>
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text maxFontSizeMultiplier={1.3} style={[styles.coachingNudgeTitle, live.coachingNudgeTitle]}>Your weekly check-in is ready</Text>
              <Text maxFontSizeMultiplier={1.3} style={[styles.coachingNudgeBody, live.coachingNudgeBody]}>
                It's your check-in day. See how your week went and what to adjust.
              </Text>
              {!photoScanSuppressed && (
                <Text maxFontSizeMultiplier={1.3} style={[styles.coachingNudgeScanSubline, live.coachingNudgeScanSubline]}>
                  If you like, add a progress scan first for extra visual context. Skipping it is fine.
                </Text>
              )}
              <TouchableOpacity
                style={styles.coachingNudgeBtn}
                accessibilityRole="button"
                accessibilityLabel="Open check-in"
                onPress={() => {
                  dismissCoachingNudge();
                  navigation.navigate('ProfileTab', { screen: 'WeeklyCheckIn', initial: false });
                }}
                activeOpacity={0.8}
              >
                <Text maxFontSizeMultiplier={1.3} style={[styles.coachingNudgeBtnText, live.coachingNudgeBtnText]}>Open check-in</Text>
                <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={dismissCoachingNudge}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Dismiss coaching nudge"
            >
              <Ionicons name="close" size={16} color={t.colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* History / Lifts / Volume quick links removed from Train (founder
            2026-06-03): they are Progress items and live on the Progress tab. */}
      </ScrollView>

      {/* Change Workout Sheet */}
      {/* COMP-010: the shape of the current training block, opened from the
          meso chip. Makes periodisation visible and the recovery week a
          destination rather than a dip. */}
      {/* D36a (item 17 modal tails, 2026-07-10): both sheets now migrated
          onto the shared BottomSheet chrome, which owns insets and
          reduce-motion itself -- insetsBottom/reduceMotion no longer
          threaded in as props. */}
      <HomeBlockShapeSheet
        visible={showBlockShape}
        onClose={closeBlockShape}
        currentMesoWeek={currentMesoWeek}
      />

      <HomeChangeWorkoutSheet
        visible={showChangeWorkout}
        onClose={closeChangeWorkout}
        activePlan={activePlan}
        displayWorkout={displayWorkout}
        planAllWorkouts={planAllWorkouts}
        nextWorkout={nextWorkout}
        exerciseCounts={exerciseCounts}
        selectedWorkoutOverride={selectedWorkoutOverride}
        onSelectOverride={setSelectedWorkoutOverride}
        navigation={navigation}
      />

      {/* ── Pre-workout intent prompt ── */}
      {/* R9 (D70): the pre-workout intent prompt moves off its hand-rolled
          raw Modal onto the shared BottomSheet (scrim, drag handle,
          swipe/backdrop/back dismiss, reduce-motion handling all owned
          there), the readiness pickers onto the shared Chip, and every tap
          gains the house selection() beat. Skip and the standing opt-out
          stay deliberately quiet text controls: they are de-emphasised
          escape hatches under the fold, not competing CTAs. */}
      <BottomSheet
        visible={showIntentPrompt}
        onClose={() => { setShowIntentPrompt(false); pendingStartRef.current = null; }}
        accessibilityLabel="How are you feeling today"
      >
        <Text maxFontSizeMultiplier={1.3} style={[styles.intentTitle, live.intentTitle]}>How are you feeling today?</Text>
        <Text maxFontSizeMultiplier={1.3} style={[styles.intentSub, live.intentSub]}>Takes a second. Helps us read your sessions better over time.</Text>
        {[
          { key: 'sharp', label: 'Sharp', sub: 'Energised and ready', icon: 'flash-outline' },
          { key: 'average', label: 'Average', sub: 'Normal day, feeling fine', icon: 'remove-outline' },
          { key: 'below_par', label: 'Below par', sub: 'Tired, stressed, or off', icon: 'arrow-down-outline' },
        ].map(opt => (
          <PressableCard
            key={opt.key}
            style={[styles.intentOption, live.intentOption]}
            onPress={() => { haptics.selection(); confirmStart(opt.key); }}
            accessibilityLabel={`${opt.label}. ${opt.sub}`}
          >
            <View style={[styles.intentOptionIcon, live.intentOptionIcon]}>
              <Ionicons name={opt.icon} size={20} color={t.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text maxFontSizeMultiplier={1.3} style={[styles.intentOptionLabel, live.intentOptionLabel]}>{opt.label}</Text>
              <Text maxFontSizeMultiplier={1.3} style={[styles.intentOptionSub, live.intentOptionSub]}>{opt.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
          </PressableCard>
        ))}

        {/* COMP-008: optional readiness chips. These tune the session
            without blocking it; tapping an intent option above (or Skip)
            still starts immediately, carrying whatever is selected here. */}
        {READINESS_ROWS.map(row => (
          <View key={row.key} style={styles.readinessRow}>
            <Text maxFontSizeMultiplier={1.3} style={[styles.readinessLabel, live.readinessLabel]}>{row.label}</Text>
            <View style={styles.readinessChips} accessibilityRole="radiogroup" accessibilityLabel={row.label}>
              {row.chips.map(chip => {
                const selected = readiness[row.key] === chip.value;
                return (
                  <Chip
                    key={chip.value}
                    label={chip.label}
                    selected={selected}
                    accessibilityRole="radio"
                    accessibilityLabel={`${row.label}: ${chip.label}`}
                    onPress={() => {
                      haptics.selection();
                      setReadiness(r => ({
                        // Tapping the selected chip again clears it, so the
                        // row stays genuinely optional.
                        ...r,
                        [row.key]: selected ? null : chip.value,
                      }));
                    }}
                  />
                );
              })}
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={styles.intentSkip}
          accessibilityRole="button"
          accessibilityLabel="Skip and start without answering"
          onPress={() => { haptics.selection(); confirmStart(null, { soreness24hBefore: null, sleepQuality: null, energyScore: null }); }}
        >
          <Text maxFontSizeMultiplier={1.3} style={[styles.intentSkipText, live.intentSkipText]}>Skip</Text>
        </TouchableOpacity>

        {/* D2 (Option A): the standing opt-out. Persists, then starts this
            session exactly as Skip would, null intent, no readiness, no
            fabricated input. Reversible in Settings, Coaching. */}
        <TouchableOpacity
          style={styles.intentOptOut}
          onPress={() => {
            haptics.selection();
            AsyncStorage.setItem('@volyume_intent_prompt_off', 'true').catch(() => {});
            confirmStart(null, { soreness24hBefore: null, sleepQuality: null, energyScore: null });
          }}
          accessibilityRole="button"
          accessibilityLabel="Don't ask before each session"
        >
          <Text maxFontSizeMultiplier={1.3} style={[styles.intentOptOutText, live.intentOptOutText]}>Don't ask before each session</Text>
          <Text maxFontSizeMultiplier={1.3} style={[styles.intentOptOutSub, live.intentOptOutSub]}>
            Without it, sessions are not adjusted to how you're feeling. Turn it back on any time in Settings, Coaching.
          </Text>
        </TouchableOpacity>
      </BottomSheet>
      {/* Sharpener: one dismissible what's-new sheet per update. */}
      <WhatsNewSheet />
    </SafeAreaView>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
// buildCoachBrief moved to src/lib/homeCoachBrief.js (behaviour-preserving
// decomposition); imported at the top of this file, unchanged.

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
// CoachBriefCard moved to src/components/CoachBriefCard.js (behaviour-
// preserving decomposition), imported at the top of this file. BRIEF_ICON_COLOR
// is re-exported from there since the readiness-summary chip below reuses its
// tone colours.

// S15#7 readiness aggregate chip: its own icon set (kept distinct from
// CoachBriefCard's BRIEF_ICON card-sized icons) but the SAME tone colours
// (BRIEF_ICON_COLOR, imported above) so the chip and the coaching brief card
// read as one family.
const READINESS_ICON = { go: 'trending-up-outline', caution: 'alert-circle-outline', recover: 'bed-outline' };

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },

  // (Morning-weight card styles retired with COMP-027 Part B, the weight cell
  //  now lives in TodayStrip.)

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

  // Continue card
  continueCard: {
    backgroundColor: colors.success,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  continueInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  continueIcon: {
    width: 40, height: 40, borderRadius: radius.xl,
    backgroundColor: withAlpha(colors.background, alpha.soft),
    alignItems: 'center', justifyContent: 'center',
  },
  continueTitle: { ...type.bodyStrong, color: colors.onPrimary },
  continueSub: { ...type.caption, color: withAlpha(colors.onPrimary, 0.8), marginTop: spacing.xxs },

  // Hero plan card. Restrained: one primary CTA, two discreet text links
  // underneath. Stat goes in the eyebrow line so we don't waste a row on a
  // coloured pill that fights the workout name for attention.
  // D3 (design audit 03): the hero is the screen's ONLY elevated object,
  // surfaceElevated ranks it above every flat surface card in the stack.
  heroCard: {
    gap: spacing.sm,
  },
  // B-5: typography now comes from SectionLabel (tone="muted"); only
  // structural overrides remain local.
  heroEyebrow: {},
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
  // B-5/Button adoption: box, fill, radius, padding and label typography now
  // come from the shared <Button> primitive; only the local margin survives.
  primaryBtn: {
    marginTop: spacing.xs,
  },
  // One primary action plus one secondary options door. View, change workout
  // and blank session live in the sheet so the hero keeps a single dominant CTA.
  startWorkoutRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  startBtnSplit: { flex: 1, marginTop: 0 },
  // Button adoption: box/fill/radius/padding now come from <Button
  // variant="secondary">; only the label colour override survives (the
  // shared secondary variant's default fg is textPrimary, this stays the
  // slightly quieter textSecondary it always was).
  workoutOptionsBtn: {},
  workoutOptionsText: { color: colors.textSecondary },

  // No plan, plan-first section
  noPlanSection: { gap: spacing.md },
  proRecoverBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primaryFill, borderRadius: radius.lg, paddingVertical: 14, marginTop: spacing.sm,
  },
  proRecoverBtnText: {
    ...type.bodyStrong, color: colors.onPrimary,
  },
  noPlanHero: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  noPlanIconWrap: {
    width: 56, height: 56, borderRadius: circle(56),
    backgroundColor: colors.primaryBg, borderWidth: 1.5, borderColor: withAlpha(colors.primary, alpha.mid),
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  noPlanTitle: {
    ...type.h3,
    color: colors.textPrimary, textAlign: 'center',
  },
  noPlanSub: {
    ...type.bodySm, color: colors.textSecondary, textAlign: 'center',
  },
  blankSessionLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center',
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  blankSessionLinkText: { ...type.label, color: colors.textPrimary },

  // B2: free no-plan starter card. One calm card, quiz first, library second.
  starterCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: withAlpha(colors.primary, alpha.edge),
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  starterActions: {
    alignSelf: 'stretch',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },

  // Progress at a glance (no-plan + has history)
  glanceCard: {
    gap: spacing.md,
  },
  glanceTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
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
    borderColor: withAlpha(colors.primary, alpha.edge),
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
    ...type.captionTight, color: colors.textSecondary,
  },
  coachingNudgeScanSubline: {
    ...type.captionTight, color: colors.textMuted,
  },
  coachingNudgeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    alignSelf: 'flex-start', marginTop: spacing.xs,
  },
  coachingNudgeBtnText: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.primary,
  },

  // R9 (D70): intentOverlay/intentSheet deleted - the shared BottomSheet
  // owns the scrim, panel chrome, insets and child gap now.
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
  // COMP-008 readiness chips
  readinessRow: {
    gap: spacing.xs,
  },
  readinessLabel: {
    ...type.caption,
    color: colors.textSecondary,
  },
  readinessChips: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  readinessChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2 ?? colors.background,
  },
  readinessChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryBg,
  },
  readinessChipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  readinessChipTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
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
  intentOptOut: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  intentOptOutText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  intentOptOutSub: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xxs,
    lineHeight: 16,
  },

  // Fresh coach review banner. D3 (design audit 03): banners are one slim
  // line above the hero, not card-sized siblings, tighter padding, no
  // extra bottom margin (the content gap carries the rhythm).
  coachBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.primaryBg, borderRadius: radius.md,
    borderWidth: 1, borderColor: withAlpha(colors.primary, alpha.mid),
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.md,
  },
  // COMP-023 trial value banner, grown into the A3 coach ledger card,
  // headline row plus the live threshold rows; matches the banner system.
  // D3: the trial-banner and free-coach-line styles moved to AttentionCard
  // with their JSX (one card class, internal priority recorded there).
  coachBannerLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 },
  coachBannerTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.primary, marginBottom: spacing.xxs },
  coachBannerBody: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 17 },
  deloadBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: withAlpha(colors.primary, alpha.tint), borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: withAlpha(colors.primary, alpha.mid),
  },
  deloadBannerLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 },
  deloadBannerTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.primary, marginBottom: spacing.xxs },
  deloadBannerBody: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 17 },

  // B3 lift plateau banner; one line plus tap-through, matches the banner
  // system's tokens (trial-banner top row shape).
  plateauBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.primaryBg, borderRadius: radius.md,
    borderWidth: 1, borderColor: withAlpha(colors.primary, alpha.edge),
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  plateauBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  plateauBannerText: {
    ...type.bodySm,
    flex: 1, fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },

  // S6 activation nudge banner (shares the plateau banner's card shape)
  activationBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.primaryBg, borderRadius: radius.md,
    borderWidth: 1, borderColor: withAlpha(colors.primary, alpha.edge),
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  activationBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  activationBannerTitle: {
    ...type.bodySm, fontWeight: fontWeight.semibold, color: colors.textPrimary,
  },
  activationBannerBody: {
    ...type.bodySm, color: colors.textMuted, marginTop: 2,
  },

  // Nutrition phase sync banner
  phaseBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.primaryBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: withAlpha(colors.primary, alpha.edge),
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  phaseBannerText: {
    ...type.captionTight,
    flex: 1,
    color: colors.textSecondary,
  },
  phaseBannerArrow: {
    paddingLeft: spacing.xs,
  },

  // Quick-start card (empty state fast path)
  quickStartCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.primaryBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    // D3: tinted edge, not a solid amber border (amber-inflation rule),
    // "Start with a plan" above is the no-plan state's one amber fill.
    borderColor: withAlpha(colors.primary, alpha.edge),
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
    ...type.bodySm,
    color: colors.textSecondary,
  },
});
