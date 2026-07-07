import React, { useState, useEffect, useRef, useCallback } from 'react';
import { appAlert } from '../components/AppAlert';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, BackHandler, AppState, Animated, AccessibilityInfo } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as hapticsVocab from '../lib/haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { colors, fontSize, fontWeight, spacing, radius, withAlpha, alpha, type, circle, motion } from '../styles/theme';
import SetEntry from '../components/SetEntry';
import RestTimer from '../components/RestTimer';
import AnimatedRow from '../components/AnimatedRow';
import ExercisePickerModal from '../components/ExercisePickerModal';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { getAllCompletedSetsForExercise, createWorkoutSet, updateWorkout, deleteIncompleteWorkout, getAllExercises, getCurrentMesocycleWeek, getWeek1SetsForExercise, getLastNWorkoutSets, getNextTimeNotes, markNoteShown, getWorkoutSetsForWorkout, updateWorkoutSet, deleteWorkoutSet } from '../lib/database';
import { enqueueSyncOp } from '../lib/syncQueue';
import { logError } from '../lib/errorLog';
import { audit } from '../lib/observability';
import {
  detectPR,
  bestPRPerExercise,
  computeSetTargets,
  calculate1RM,
  summariseWorkoutSets,
  MUSCLE_DISPLAY_NAMES,
  generateDeloadPrescription,
} from '../lib/algorithms';
import { rankSwaps } from '../lib/swapEngine';
import { isClusterType, clusterLabel, summariseCluster, mergeClusterNote } from '../lib/clusterSet';
import {
  countProgressSets,
  setNumberForKind,
  getBestAnchorSet,
  prefillRepsForTarget,
  validateSetEntryValue,
  formatLoggedSet,
} from '../lib/workoutHelpers';
import { formatPerSide, loadUnilateralExercises } from '../lib/unilateral';
import { FORM_TIPS } from '../lib/formTips';
import { applyTimeCrunch } from '../lib/mesocycle';
import { getTimeCrunchMessage, getStarterSessionMessage } from '../lib/whyThisTemplates';
import { getReadinessTweak, applyReadinessToSets, applyReadinessToTargets } from '../lib/sessionAdjustments';
import { calculatePlates, DEFAULT_BAR_KG } from '../lib/plateMath';
import { warmupRamp } from '../lib/warmupRamp';
import { shareSessionName } from '../lib/sessionShareData';

const DEFAULT_SET = { weight: '', reps: 8, setType: 'straight', notes: '', rir: 2 };

// B8: keep-awake tag so this screen's activate/deactivate can never release
// a keep-awake hold some other surface owns. Per-INSTANCE suffix because the
// screen is registered in three stacks (Home, FirstRun, ProOnboarding) and
// expo-keep-awake tags are a set, not ref-counted, with a shared tag, two
// mounted instances would trade one hold and blur ordering would decide who
// wins.
const KEEP_AWAKE_TAG = 'volyume-active-workout';
let keepAwakeSeq = 0;
const IS_JEST = typeof process !== 'undefined'
  && process.env
  && !!process.env.JEST_WORKER_ID;

// Equipment whose load is plates on a bar, the only exercises where the
// plate calculator makes sense. Seeded rows use snake_case ('barbell',
// 'smith_machine', 'ez_bar'); CUSTOM exercises store the picker's display
// spellings ('Barbell', 'Smith Machine', 'EZ Bar', ExercisePickerModal),
// so the match is case-insensitive with a flexible separator.
const PLATE_LOADED_EQUIPMENT = /(barbell|smith[\s_-]?machine|ez[\s_-]?bar)/i;

// Barbell test for the warm-up ramp's empty-bar row, same custom-spelling
// caveat as above ('barbell' seeded, 'Barbell' custom).
const BARBELL_EQUIPMENT = /barbell/i;

// Real-world plate colours by kg weight. These are physical equipment
// standards (red 25, blue 20, yellow 15, green 10, white 5), not theme
// colours, so they are deliberately literal, same recorded exception as
// the original calculator.
/* eslint-disable no-restricted-syntax */
const PLATE_COLOURS = {
  25: '#E53935',
  20: '#1565C0',
  15: '#F9A825',
  10: '#2E7D32',
  5: '#FAFAFA',
  2.5: '#757575',
  1.25: '#BDBDBD',
};
/* eslint-enable no-restricted-syntax */



const SET_TYPE_OPTIONS = [
  { value: 'straight', label: 'Working', description: 'Counts towards your weekly totals and progress tracking.' },
  { value: 'warmup', label: 'Warm-up', description: 'Lighter sets before your main work. Not counted in your weekly totals.' },
  { value: 'dropset', label: 'Drop set', description: 'Reduce the weight at failure and keep going. Counts towards weekly volume, not the set-target counter.' },
  { value: 'myo_reps', label: 'Myo-reps', description: 'A heavy activation set, then short mini-sets with a few breaths between. Counts towards volume and progress.' },
  { value: 'rest_pause', label: 'Rest-pause', description: 'Hit failure, rest 10 to 20 seconds, then squeeze out more reps. Counts towards volume and progress.' },
  { value: 'amrap', label: 'AMRAP', description: 'As many reps as possible, usually the last set. Counts towards volume and progress.' },
];

function WorkoutSheetScroll({ children }) {
  return (
    <ScrollView
      style={styles.sheetScroll}
      contentContainerStyle={styles.sheetScrollBody}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

// Returns the set to use as the rep-progression anchor.
// If the same-indexed set was lighter than the session best, anchor to the best set
// so the pre-fill targets beating the overall high-water mark, not just that slot's history.
// getBestAnchorSet + countProgressSets live in src/lib/workoutHelpers.js
// (COMP-001) so the screen, Live Activity and watch companion share the same
// counting + anchoring rules, and the rules are unit-tested off the screen.

/**
 * One already-logged set in the "This workout" list. Display only, no inputs.
 * Pulled out of the screen's render and memoised so the logged-set rows do not
 * re-render on every workout-timer tick (the parent re-renders each second);
 * with stable props React.memo skips them. `progressNum` is the set's position
 * among counting (non-warm-up, non-dropset) sets, computed by the caller.
 */
const LoggedSetRow = React.memo(function LoggedSetRow({ set, units, progressNum, exerciseType = 'weight_reps', onEdit }) {
  const isWarmup = set.setType === 'warmup';
  // Exercise-type aware: a distance/duration/reps_only set must not print
  // "{weight}kg × {reps}" (the weight column holds metres/0 for those) nor an
  // Est. max computed off a non-load value.
  const fmt = formatLoggedSet(set, units, exerciseType);
  const est1RM = (!isWarmup && fmt.showE1RM) ? calculate1RM(set.weight, set.actualReps) : null;
  const perSide = formatPerSide(set.leftReps, set.rightReps);
  const spokenSetLabel = [
    isWarmup ? 'Edit warm-up set' : `Edit set ${progressNum}`,
    fmt.text,
    perSide,
  ].filter(Boolean).join(': ');
  return (
    <TouchableOpacity
      style={[styles.loggedSetRow, isWarmup && styles.loggedSetRowWarmup]}
      // F7: the row binds its own set so the parent can pass ONE stable
      // handler; an inline closure per row was defeating this memo.
      onPress={() => onEdit(set)}
      accessibilityRole="button"
      accessibilityLabel={spokenSetLabel}
      accessibilityHint="Opens a sheet to change or delete this logged set"
    >
      {isWarmup ? (
        <Ionicons name="flame" size={14} color={colors.warning} style={{ width: 22, textAlign: 'center' }} />
      ) : (
        <View style={styles.setNumBadge}>
          <Text style={styles.setNumText} maxFontSizeMultiplier={1.3}>{progressNum}</Text>
        </View>
      )}
      <Text style={[styles.loggedSetText, isWarmup && styles.loggedSetTextWarmup]} numberOfLines={1}>
        {fmt.text}
        {perSide ? ` - ${perSide}` : ''}
        {isWarmup ? ' - Warm-up' : ''}
      </Text>
      {!isWarmup && est1RM > 0 && (
        <Text style={styles.loggedEst1RM}>Est. max ~{est1RM.toFixed(0)}{units}</Text>
      )}
      <Ionicons name="checkmark-circle" size={16} color={isWarmup ? colors.warning : colors.success} />
    </TouchableOpacity>
  );
});

export default function ActiveWorkoutScreen({ navigation, route }) {
  // Use a shallow selector so every store mutation (rest timer ticks,
  // PR celebration flag flips, accessibility toggles) doesn't re-render
  // the 2000-line tree. Without this the rest timer alone fires
  // 300-600 re-renders per workout because tickRestTimer() ran every
  // second and store-touch was wholesale.
  //
  // Actions are stable function references inside Zustand so they don't
  // need to participate in the shallow compare, we still pull them
  // off the store via the selector.
  const store = useAppStore(useShallow(s => ({
    user: s.user, units: s.units,
    activeWorkout: s.activeWorkout,
    workoutExercises: s.workoutExercises,
    currentExerciseIndex: s.currentExerciseIndex,
    setCurrentExerciseIndex: s.setCurrentExerciseIndex,
    setWorkoutExercises: s.setWorkoutExercises,
    addExerciseToWorkout: s.addExerciseToWorkout,
    addSetToCurrentExercise: s.addSetToCurrentExercise,
    updateSetInCurrentExercise: s.updateSetInCurrentExercise,
    removeSetFromCurrentExercise: s.removeSetFromCurrentExercise,
    session: s.session,
    startRestTimer: s.startRestTimer,
    defaultRestSeconds: s.defaultRestSeconds,
    autoStartRestTimer: s.autoStartRestTimer,
    workoutPrefsLoaded: s.workoutPrefsLoaded,
    loadWorkoutPrefs: s.loadWorkoutPrefs,
    showPRCelebration: s.showPRCelebration,
    endWorkout: s.endWorkout,
    workoutStartTime: s.workoutStartTime,
    lastActivityAt: s.lastActivityAt,
    updateLastActivity: s.updateLastActivity,
    sessionAdjustments: s.sessionAdjustments,
    revertSessionAdjustment: s.revertSessionAdjustment,
    dismissReadinessTweak: s.dismissReadinessTweak,
    tier: s.tier,
    barWeight: s.barWeight,
  })));
  const {
    user, units, activeWorkout, workoutExercises, currentExerciseIndex,
    setCurrentExerciseIndex, addExerciseToWorkout, addSetToCurrentExercise,
    updateSetInCurrentExercise, removeSetFromCurrentExercise, session,
    startRestTimer, defaultRestSeconds, autoStartRestTimer, workoutPrefsLoaded, loadWorkoutPrefs,
    showPRCelebration, endWorkout, workoutStartTime,
    lastActivityAt, updateLastActivity, sessionAdjustments, revertSessionAdjustment, dismissReadinessTweak, tier,
    barWeight,
  } = store;
  const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion);
  // Drop assisted machine regressions from swap suggestions for anyone past
  // their first block. A true beginner keeps them. Unknown experience is treated
  // as non-beginner so an athlete is never offered a crutch.
  const isBeginner = useAppStore(s => s.userProfile?.experience) === 'beginner';

  const [currentSet, setCurrentSet] = useState({ ...DEFAULT_SET });
  const [prevSets, setPrevSets] = useState([]);
  const [allTimeSets, setAllTimeSets] = useState([]);
  const [loggedSets, setLoggedSets] = useState([]);
  // Edit/delete an already-logged set mid-session (Hevy parity). `editingSet`
  // is the logged-set object being edited (null when the sheet is closed);
  // `editValue` is the SetEntry value object the sheet binds to.
  const [editingSet, setEditingSet] = useState(null);
  const [editValue, setEditValue] = useState(null);
  // Flashes the SetEntry card border amber for ~700ms after a successful
  // Log set, so the tap is acknowledged visibly. Resets via a tracked
  // timeout so cycling exercises mid-flash doesn't leave it stuck on.
  const [logFlash, setLogFlash] = useState(false);
  const logFlashTimeoutRef = useRef(null);
  const [detectedPRs, setDetectedPRs] = useState([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  // CL-6.1 (founder decision: prepare-not-commit). Past the target, "Log
  // another set" ARMS one more set (the entry card is already prefilled
  // with the last values) and the bottom bar returns to Log set; the
  // commit happens on that confirm, never on the arm tap. Disarms after
  // the set logs or when the exercise changes.
  const [extraSetArmed, setExtraSetArmed] = useState(false);
  useEffect(() => {
    setExtraSetArmed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentExerciseIndex, loggedSets.length]);
  // 'add' opens the picker to append an exercise; 'swap' opens it to replace the
  // current one. Lets the Swap sheet fall through to the full library and the
  // custom-exercise form when the ranked suggestions aren't what the user wants.
  const [pickerMode, setPickerMode] = useState('add');
  const [noteText, setNoteText] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  // Superset notification, tracks which group IDs the user has already
  // seen the "heads up, paired exercises" modal for in this workout. We
  // show it once per pair so the user can grab both stations before
  // starting. Set, not array, for O(1) membership checks.
  const acknowledgedSupersetsRef = useRef(new Set());
  const [supersetHeadsUp, setSupersetHeadsUp] = useState(null);
  // shape: { groupId, exerciseAName, exerciseBName } | null
  const [saving, setSaving] = useState(false);
  // Myo-rep / rest-pause cluster in progress. null when not clustering.
  // shape: { setType, weight, reps: [activation, mini1, ...] }
  const [cluster, setCluster] = useState(null);
  const [clusterReps, setClusterReps] = useState('');
  // Exercise IDs the user logs per-side (unilateral). Device-local pref.
  const [unilateralExercises, setUnilateralExercises] = useState(() => new Set());
  const [setTargets, setSetTargets] = useState([]);
  const [targetReason, setTargetReason] = useState(null);
  const [showSetTypePicker, setShowSetTypePicker] = useState(false);
  const [showOverflow, setShowOverflow] = useState(false);
  const [showExecution, setShowExecution] = useState(false);
  // B8 gym basics: both sheets open ONLY from the exercise overflow menu,
  // pull, never push (the recorded no-auto-suggest decision below stands).
  const [showWarmupRamp, setShowWarmupRamp] = useState(false);
  const [showPlates, setShowPlates] = useState(false);
  // The working weight the ramp is built from. Tapping a ramp row
  // overwrites the entry with the warm-up weight, so without this anchor a
  // reopened ramp would recompute from the WARM-UP weight and collapse
  // ("no ramp needed"), losing the typed working weight entirely on a
  // first-time exercise (Wave 4 review finding). Anchored on first open
  // while the entry holds a working (non-warm-up) weight; cleared on
  // exercise change and whenever the entry shows a working weight again.
  const rampAnchorRef = useRef(null);
  // Plate sheet inputs are sheet-local strings, seeded on open from the
  // current entry weight and the profile bar weight. Deliberately NOT
  // persisted back to the store (parity with the original calculator).
  const [plateTarget, setPlateTarget] = useState('');
  const [plateBar, setPlateBar] = useState(String(DEFAULT_BAR_KG));
  const [showStaleModal, setShowStaleModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapCandidates, setSwapCandidates] = useState([]);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [timeCrunchActive, setTimeCrunchActive] = useState(false);
  const [timeCrunchMsg, setTimeCrunchMsg] = useState('');
  const [preCrunchSnapshot, setPreCrunchSnapshot] = useState(null);
  // COMP-013: a starter session is a one-tap 15-minute subset of Day 1, applied
  // once at session start. It reuses the time-crunch machinery (snapshot +
  // revert) but caps sets and exercise count via the starter options.
  const [starterActive, setStarterActive] = useState(false);
  const starterAppliedRef = useRef(false);
  const [isDeloadWeek, setIsDeloadWeek] = useState(false);
  const [deloadDismissed, setDeloadDismissed] = useState(false);
  // B2 (Wave-3 review): the session-wide dismissal of the readiness tweak
  // lives ON the active workout (store action dismissReadinessTweak) so it
  // survives screen remounts and the WK-1 crash restore, the a11y copy
  // promises "Applies to the whole session" and now means it.
  const readinessDismissed = !!activeWorkout?.readinessDismissed;
  // Ghost pre-fill bookkeeping. The value itself is no longer rendered (the
  // ghost chip went in COMP-001; the muted input colour carries the state),
  // but the setter still arms/clears the pre-fill in loadHistory/onChange.
  const [_ghostSet, setGhostSet] = useState(null);
  const [nextTimeNotes, setNextTimeNotes] = useState([]);  // "next time" coaching notes for this routine
  // Cluster counter for myo-reps / rest-pause: 0 = activation set, 1+ = mini-set N+1
  const autoAdvanceRef = useRef(null);
  // C3 (audit 2026-07-03): mirrors autoAdvanceRef so the screen can show the
  // countdown, not just silently run it. Kept in lockstep by cancelAutoAdvance
  // below, the single place that clears the ref.
  const [autoAdvanceArmed, setAutoAdvanceArmed] = useState(false);
  const sessionSetsRef = useRef([]);   // tracks sets in this session, used for PR detection
  const warmupHintSeenRef = useRef(false); // show one-liner warmup note only on first warmup of this session
  const finishingRef = useRef(false); // gates handleFinishWorkout so a rapid double-tap can't double-finish
  const shownNoteIdsRef = useRef(new Set()); // note IDs already shown in this session

  const scrollRef = useRef(null);
  const insets = useSafeAreaInsets();
  const timerRef = useRef(null);

  // B8 (audit 05 §B8): keep the screen awake while the logger is FOCUSED,
  // the phone sits propped on the bench between sets and must not sleep
  // mid-session. Focus-scoped, not mount-scoped: this screen stays mounted
  // in the Train stack while the user browses another tab mid-session, and
  // the display shouldn't be pinned on for that. Android drops the
  // underlying window flag automatically when the app backgrounds, so no
  // AppState wiring is needed. Both calls are best-effort: a device that
  // refuses the flag must never crash the logger.
  const keepAwakeTagRef = useRef(null);
  if (keepAwakeTagRef.current === null) {
    keepAwakeSeq += 1;
    keepAwakeTagRef.current = `${KEEP_AWAKE_TAG}-${keepAwakeSeq}`;
  }
  useFocusEffect(
    useCallback(() => {
      const tag = keepAwakeTagRef.current;
      activateKeepAwakeAsync(tag).catch(() => {});
      return () => {
        try {
          Promise.resolve(deactivateKeepAwake(tag)).catch(() => {});
        } catch (_) { /* best-effort */ }
      };
    }, [])
  );

  // A ramp anchored to one exercise means nothing for the next.
  useEffect(() => {
    rampAnchorRef.current = null;
  }, [currentExerciseIndex]);

  // C3: a countdown armed on one exercise must never fire against another,
  // and must never outlive the screen. handleNextExercise and
  // handleRemoveExercise already cancel it explicitly for their own
  // navigation; this is the backstop for every other way currentExerciseIndex
  // can change (nav-strip tap, swipe), and for unmount.
  useEffect(() => {
    return () => cancelAutoAdvance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentExerciseIndex]);

  // First-use info tip highlight
  const [showInfoTipPulse, setShowInfoTipPulse] = useState(false);
  // U-A-1: the collapsed banner rail ("N notes") above the set-entry card.
  const [notesExpanded, setNotesExpanded] = useState(false);
  const infoPulseAnim = useRef(new Animated.Value(1)).current;
  const infoPulseLoop = useRef(null);

  const currentEntry = workoutExercises[currentExerciseIndex];
  const exercise = currentEntry?.exercise;
  const routineExercise = currentEntry?.routineExercise;
  const isLastExercise = currentExerciseIndex === workoutExercises.length - 1;

  // COMP-015: this session's adjustment for the current exercise, if any. Only
  // Pro sessions ever carry adjustments; a reverted one is ignored. A nonzero
  // setDelta changes the working-set target everywhere recommendedSets drives
  // the session (orientation row, target line, persistent notification); a
  // hold (delta 0) carries only a coaching line.
  const sessionAdjustment = (tier === 'pro' && exercise?.id)
    ? (sessionAdjustments || []).find(a => a.exerciseId === exercise.id && !a.reverted) ?? null
    : null;
  const comp015SetCount = (sessionAdjustment && sessionAdjustment.setDelta !== 0)
    ? sessionAdjustment.adjustedSets
    : routineExercise?.recommendedSets;

  // B2: readiness-informed, downward-only tweak from the intent-sheet answer.
  // Pure rule table (lib/sessionAdjustments.js); a presented suggestion applied
  // to this session's TARGET display only. The stored plan and logged sets are
  // never touched, and the user can dismiss it for the whole session. Silent on
  // deload weeks, matching COMP-015's R0 (deload owns the session).
  const readinessTweak = (tier === 'pro' && !isDeloadWeek)
    ? getReadinessTweak(activeWorkout?.preWorkoutIntent, {
      sleepQuality: activeWorkout?.sleepQuality,
      energyScore: activeWorkout?.energyScore,
    })
    : null;
  const readinessReduces = !!readinessTweak?.reduces && !readinessDismissed;

  // COMP-015 and the readiness tweak never stack: the LOWER set target wins,
  // so the combined surface can only ever move DOWN from the plan (a COMP-015
  // add is superseded on a below-par day; two drops never double-count).
  const readinessSetCount = readinessReduces
    ? applyReadinessToSets(routineExercise?.recommendedSets, readinessTweak)
    : null;
  const adjustedSetCount = (Number.isFinite(readinessSetCount) && Number.isFinite(comp015SetCount))
    ? Math.min(comp015SetCount, readinessSetCount)
    : (Number.isFinite(readinessSetCount) ? readinessSetCount : comp015SetCount);

  // B2: the suggested-load surface (per-set targets) with the readiness trim
  // applied for display. Deload prescriptions pass through untouched.
  const displaySetTargets = readinessReduces
    ? applyReadinessToTargets(setTargets, readinessTweak)
    : setTargets;

  // Wave-3 review: when the readiness trim sets a LOWER target than the
  // COMP-015 line announces (the min() above discarded it), the readiness
  // line must lead the in-session surface, a discarded "added a set" line
  // fronting a reduced target read as a contradiction.
  const readinessDrivesTarget = readinessReduces
    && Number.isFinite(readinessSetCount)
    && Number.isFinite(comp015SetCount)
    && readinessSetCount < comp015SetCount;
  // Honest restore copy: dismissing the easing returns to the coach's
  // session target, which may include a COMP-015 change to the plan.
  const readinessRestoreLabel = (Number.isFinite(comp015SetCount)
    && Number.isFinite(routineExercise?.recommendedSets)
    && comp015SetCount !== routineExercise.recommendedSets)
    ? "Use your coach's targets instead"
    : 'Use planned targets instead';

  // COMP-015: coverage telemetry, fire once per exercise when its adjustment
  // line first becomes visible. muscle + direction + reasonCode only, no PII.
  const shownAdjRef = useRef(new Set());
  // Hydrate the device-local workout prefs (default rest, auto-start) once so a
  // session uses the user's saved default even if App.js bootstrap didn't run
  // them. Defaults (90s, auto-start on) preserve prior behaviour until loaded.
  useEffect(() => {
    if (!workoutPrefsLoaded) loadWorkoutPrefs();
  }, [workoutPrefsLoaded, loadWorkoutPrefs]);

  useEffect(() => {
    if (!sessionAdjustment?.show || !exercise?.id) return;
    if (shownAdjRef.current.has(exercise.id)) return;
    shownAdjRef.current.add(exercise.id);
    try {
      // eslint-disable-next-line global-require
      const { track } = require('../lib/engineTelemetry');
      track(user?.id, 'session_adjustment_shown', {
        muscle: sessionAdjustment.muscle,
        direction: sessionAdjustment.setDelta < 0 ? 'drop' : sessionAdjustment.setDelta > 0 ? 'add' : 'hold',
        reasonCode: sessionAdjustment.reasonCode,
      })?.catch?.(() => {});
    } catch (_) { /* telemetry best-effort */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionAdjustment?.show, exercise?.id]);

  // Superset pairing: two adjacent entries sharing a supersetGroupId are paired.
  const currentSGI = workoutExercises[currentExerciseIndex]?.supersetGroupId ?? null;
  const nextSGI = workoutExercises[currentExerciseIndex + 1]?.supersetGroupId ?? null;
  const isPairedWithNext = currentSGI != null && currentSGI === nextSGI;
  const pairedExerciseName = currentSGI != null
    ? (workoutExercises.find((e, i) => i !== currentExerciseIndex && e.supersetGroupId === currentSGI)?.exercise?.name ?? '')
    : '';

  // C3: the one place that clears the auto-advance ref, so its "armed" state
  // (drives the "Stay here" row) never drifts from the timer it describes.
  function cancelAutoAdvance() {
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
    setAutoAdvanceArmed(false);
  }

  function handleNextExercise() {
    cancelAutoAdvance();
    // WK-5: skip over exercises Time Crunch dropped (_timeCrunchSkipped). They
    // stay in the list so the action can be reverted, but advancing onto one
    // would let the user log against a slot they were told was dropped. Stop at
    // the first non-skipped exercise; if none remain, don't advance past the end
    // (setting an out-of-bounds index would render an empty exercise slot).
    let next = currentExerciseIndex + 1;
    while (next < workoutExercises.length && workoutExercises[next]?._timeCrunchSkipped) {
      next += 1;
    }
    if (next >= workoutExercises.length) return; // no non-skipped exercise ahead
    audit('workout.exercise.next', { fromIndex: currentExerciseIndex, toIndex: next });
    setCurrentExerciseIndex(next);
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 50);
  }

  function handleTogglePair() {
    const updated = [...workoutExercises];
    if (isPairedWithNext) {
      // Unpair: clear group ID from both
      updated[currentExerciseIndex] = { ...updated[currentExerciseIndex], supersetGroupId: null };
      updated[currentExerciseIndex + 1] = { ...updated[currentExerciseIndex + 1], supersetGroupId: null };
    } else {
      // Pair: assign a fresh group ID to both
      const existingIds = updated.map(e => e.supersetGroupId).filter(Boolean);
      const newId = (Math.max(0, ...existingIds) + 1);
      updated[currentExerciseIndex] = { ...updated[currentExerciseIndex], supersetGroupId: newId };
      updated[currentExerciseIndex + 1] = { ...updated[currentExerciseIndex + 1], supersetGroupId: newId };
    }
    useAppStore.getState().setWorkoutExercises(updated);
    hapticsVocab.selection();
  }

  function handleRemoveExercise() {
    if (workoutExercises.length <= 1) {
      appAlert('Cannot remove', 'This is the only exercise in your session.');
      return;
    }
    appAlert(
      'Remove exercise?',
      `Remove ${exercise.name} from this session. Your plan is not changed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            audit('workout.exercise.removed', { exerciseId: exercise?.id });
            cancelAutoAdvance();
            const store = useAppStore.getState();
            const updated = workoutExercises.filter((_, i) => i !== currentExerciseIndex);
            store.setWorkoutExercises(updated);
            setCurrentExerciseIndex(Math.min(currentExerciseIndex, updated.length - 1));
            setLoggedSets([]);
            setPrevSets([]);
            setAllTimeSets([]);
            sessionSetsRef.current = [];
          },
        },
      ],
    );
  }

  async function handleOpenSwap() {
    const allExercises = await getAllExercises();
    const alreadyInWorkout = workoutExercises.map(e => e.exercise?.id).filter(Boolean);
    const ranked = rankSwaps(exercise, allExercises, { excludeIds: alreadyInWorkout, numResults: 8, excludeAssisted: !isBeginner });
    setSwapCandidates(ranked);
    setShowSwapModal(true);
  }

  function handleConfirmSwap(newExercise) {
    const store = useAppStore.getState();
    const updatedExercises = [...workoutExercises];
    // The slot's routineExercise carries the OLD exercise's planned load and
    // rep band. Left attached, a swapped-in move (e.g. a lateral raise) with no
    // history of its own prefills the previous exercise's startingWeight and
    // rep range. Rebuild it from the new exercise: clear the carried-over
    // weight and take the rep band from the new exercise's own defaults. The
    // planned set count is the user's choice for the slot, so keep it.
    const prevRoutineEx = updatedExercises[currentExerciseIndex]?.routineExercise;
    const newRepMin = newExercise.defaultRepMin ?? newExercise.default_rep_min
      ?? prevRoutineEx?.recommendedRepsMin ?? 6;
    const newRepMax = newExercise.defaultRepMax ?? newExercise.default_rep_max
      ?? prevRoutineEx?.recommendedRepsMax ?? 12;
    const rebuiltRoutineEx = prevRoutineEx
      ? {
          ...prevRoutineEx,
          exerciseId: newExercise.id,
          exerciseName: newExercise.name,
          recommendedRepsMin: newRepMin,
          recommendedRepsMax: newRepMax,
          startingWeight: null,
        }
      : null;
    updatedExercises[currentExerciseIndex] = {
      ...updatedExercises[currentExerciseIndex],
      exercise: newExercise,
      routineExercise: rebuiltRoutineEx,
      sets: [],
    };
    store.setWorkoutExercises(updatedExercises);
    setSwapCandidates([]);
    setShowSwapModal(false);
    setPrevSets([]);
    setAllTimeSets([]);
    setLoggedSets([]);
    sessionSetsRef.current = [];
  }

  // Single entry point for the exercise picker, whether it was opened to add or
  // to swap. Swap replaces the current exercise (incl. a freshly created custom
  // one); add appends and jumps to it.
  function handlePickerSelect(ex) {
    if (pickerMode === 'swap') {
      handleConfirmSwap(ex);
    } else {
      const newIndex = workoutExercises.length;
      addExerciseToWorkout(ex);
      setCurrentExerciseIndex(newIndex);
    }
    setShowExercisePicker(false);
    setPickerMode('add');
  }

  function closeExercisePicker() {
    setShowExercisePicker(false);
    setPickerMode('add');
  }

  function handleCancelWorkout() {
    const store = useAppStore.getState();
    const totalSets = store.workoutExercises.reduce((sum, e) => sum + (e.sets?.length ?? 0), 0);
    if (totalSets === 0) {
      store.endWorkout();
      // eslint-disable-next-line global-require
      try { require('../lib/notifications/activeWorkout').dismissActiveWorkoutNotification(); } catch (_) {}
      navigation.goBack();
    } else {
      setShowDiscardModal(true);
    }
  }

  // Hardware back → cancel flow
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleCancelWorkout();
      return true;
    });
    return () => sub.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the per-exercise "log left/right" preference once.
  useEffect(() => {
    loadUnilateralExercises().then(setUnilateralExercises).catch(() => {});
  }, []);

  // Stale workout check (>4h since last activity)
  useEffect(() => {
    if (lastActivityAt && Date.now() - lastActivityAt > 4 * 60 * 60 * 1000) {
      setShowStaleModal(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load "next time" coaching notes when the workout begins
  useEffect(() => {
    if (!activeWorkout || !user?.id) return;
    const routineId = activeWorkout.routineId ?? null;
    getNextTimeNotes(user.id, routineId).then(notes => {
      // Only surface notes not already shown in this session
      const unseen = notes.filter(n => !shownNoteIdsRef.current.has(n.id));
      if (unseen.length > 0) {
        unseen.forEach(n => shownNoteIdsRef.current.add(n.id));
        setNextTimeNotes(unseen);
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkout?.id]);

  // Superset heads-up: when the user lands on an exercise that's part of a
  // pair we haven't already shown the modal for in this workout, surface a
  // clear instructional sheet so a first-timer isn't lost. Shown once per
  // group id per workout, dismissing acknowledges; unlinking removes the
  // pair entirely; swap opens the swap UI for either exercise.
  useEffect(() => {
    if (currentSGI == null) return;
    if (acknowledgedSupersetsRef.current.has(currentSGI)) return;
    if (!pairedExerciseName) return; // safety
    // Tag as acknowledged immediately so navigating away+back doesn't re-fire
    // before the user dismisses.
    acknowledgedSupersetsRef.current.add(currentSGI);
    setSupersetHeadsUp({
      groupId: currentSGI,
      exerciseAName: exercise?.name ?? 'this exercise',
      exerciseBName: pairedExerciseName,
    });
    hapticsVocab.selection();
  }, [currentSGI, pairedExerciseName, exercise?.name]);

  // First-use info tip: pulse the Info button until tapped. The pulse itself
  // is suppressed under Reduce Motion (the static badge still shows so the
  // user can find the button), only the looping animation is killed.
  useEffect(() => {
    AsyncStorage.getItem('@volyume_seen_workout_info').then(val => {
      if (val === 'true') return;
      setShowInfoTipPulse(true);
      if (reduceMotion) return;
      infoPulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(infoPulseAnim, { toValue: 1.35, duration: motion.pulse, useNativeDriver: true }),
          Animated.timing(infoPulseAnim, { toValue: 1.0,  duration: motion.pulse, useNativeDriver: true }),
        ])
      );
      infoPulseLoop.current.start();
    });
    return () => { infoPulseLoop.current?.stop(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  // Workout timer, always derived from workoutStartTime so backgrounding never
  // causes drift. Re-syncs on every tick and on app-foreground events.
  useEffect(() => {
    if (!workoutStartTime) return;

    function syncElapsed() {
      setElapsedSeconds(Math.floor((Date.now() - workoutStartTime) / 1000));
    }

    syncElapsed();
    if (IS_JEST) {
      return () => {
        if (logFlashTimeoutRef.current) clearTimeout(logFlashTimeoutRef.current);
      };
    }
    timerRef.current = setInterval(syncElapsed, 1000);

    const appStateSub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') syncElapsed();
    });

    return () => {
      clearInterval(timerRef.current);
      // Subscription remove() can throw on corrupt subscription objects (rare
      // but possible after RN reload). Swallow so the rest of the cleanup
      // continues; the worst case is one orphan listener until next reload.
      try { appStateSub?.remove(); } catch (_) {}
      // Drop any pending log-flash reset so it doesn't run on an unmounted
      // component (cancel + finish workout mid-flash would otherwise throw a
      // React warning).
      if (logFlashTimeoutRef.current) clearTimeout(logFlashTimeoutRef.current);
    };
  }, [workoutStartTime]);

  // Persistent lock-screen / shade notification. Mirrors current
  // exercise + set + elapsed time so the user sees their workout
  // state without unlocking. Two update paths:
  //
  //   1. Real-time updates (immediate, no throttle), fire whenever
  //      the user-visible state changes: current exercise, set count,
  //      target set count. The notification re-presents on the next
  //      render tick so the lock screen always shows the same set the
  //      user just logged, not the one before. Previously the 15s
  //      throttle dropped these updates and the user saw stale state
  //      until the next tick passed the throttle window.
  //
  //   2. Elapsed-time refresh (throttled to 15s), keeps the "12:34"
  //      counter in the notification body roughly fresh without
  //      hammering the notification manager every second.
  //
  // Splitting the two paths into separate effects means the
  // dependency arrays don't fight each other and we get instant
  // feedback on user actions + cheap upkeep on the timer.
  const lastNotifUpdateRef = useRef(0);

  // Path 1: immediate update on state change.
  useEffect(() => {
    if (!workoutStartTime || !activeWorkout) return;
    lastNotifUpdateRef.current = Date.now();
    // eslint-disable-next-line global-require
    const { showActiveWorkoutNotification } = require('../lib/notifications/activeWorkout');
    showActiveWorkoutNotification({
      workoutName: activeWorkout?.name,
      elapsedSeconds,
      // Count only WORKING sets towards the index. Including warm-ups
      // produced "Set 3 of 2" on the lock-screen / persistent
      // notification when the user logged a warm-up before the first
      // working set. totalSetsForExercise is the *working* target.
      currentSetIndex: countProgressSets(loggedSets) + 1,
      totalSetsForExercise: adjustedSetCount, // COMP-015: reflect any session adjustment
      exerciseName: exercise?.name,
    }).catch(() => {});
    // Intentionally exclude elapsedSeconds, that's handled by
    // the throttled effect below. This effect responds only to
    // user-driven state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkout?.id, loggedSets?.length, exercise?.name, adjustedSetCount, workoutStartTime]);

  // Path 2: throttled elapsed-time refresh.
  useEffect(() => {
    if (!workoutStartTime || !activeWorkout) return;
    const now = Date.now();
    if (now - lastNotifUpdateRef.current < 15_000) return;
    lastNotifUpdateRef.current = now;
    // eslint-disable-next-line global-require
    const { showActiveWorkoutNotification } = require('../lib/notifications/activeWorkout');
    showActiveWorkoutNotification({
      workoutName: activeWorkout?.name,
      elapsedSeconds,
      // Count only WORKING sets towards the index. Including warm-ups
      // produced "Set 3 of 2" on the lock-screen / persistent
      // notification when the user logged a warm-up before the first
      // working set. totalSetsForExercise is the *working* target.
      currentSetIndex: countProgressSets(loggedSets) + 1,
      totalSetsForExercise: adjustedSetCount, // COMP-015
      exerciseName: exercise?.name,
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedSeconds, activeWorkout, loggedSets?.length, exercise?.name, adjustedSetCount, workoutStartTime]);

  // Dismiss the persistent notification on screen unmount. Belt-and-
  // braces because endWorkout() / handleFinishWorkout also clear it,
  // but the unmount cleanup catches navigation-away cases.
  useEffect(() => () => {
    // eslint-disable-next-line global-require
    const { dismissActiveWorkoutNotification } = require('../lib/notifications/activeWorkout');
    dismissActiveWorkoutNotification().catch(() => {});
  }, []);

  // Lock-screen rest-timer "Complete set" action. The ±15s / Skip-rest
  // buttons are handled in the notifications listener (they only touch the
  // store), but completing a set runs through the shared in-app path
  // (cluster vs normal handling), so it must fire here on the screen. The
  // action opens the app to the foreground; this listener picks it up and
  // runs handleCompleteSetPress, but ONLY when a rest is actually running,
  // so a stale tap is ignored. handleCompleteSetPressRef keeps the latest
  // closure without re-installing the listener every render.
  const handleCompleteSetPressRef = useRef(null);
  // Tracks whether the current set is still an unconfirmed ghost prefill, so the
  // lock-screen "Complete set" action below can refuse to log values the user
  // hasn't actually entered.
  const currentSetGhostRef = useRef(false);
  useEffect(() => {
    // eslint-disable-next-line global-require
    const Notifications = require('expo-notifications');
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response?.notification?.request?.content?.data;
      if (data?.type !== 'rest_timer') return;
      if (response?.actionIdentifier !== 'complete_set') return;
      // Active-rest guard: only act on a live, running rest.
      const st = useAppStore.getState();
      if (!st.activeWorkout?.id || !st.restTimerActive) return;
      // Don't blind-log from the lock screen. If the current set is still a
      // ghost (the suggested next-set prefill the user hasn't confirmed),
      // tapping "Complete set" would log a set they may not have performed,
      // so just let opensAppToForeground bring them in to confirm. When they've
      // entered real values (not a ghost), complete it one-tap as before.
      if (currentSetGhostRef.current) return;
      try { handleCompleteSetPressRef.current?.(); } catch (_) { /* never crash on a tap */ }
    });
    return () => { try { sub?.remove(); } catch (_) {} };
  }, []);

  // Load previous performance and set defaults when exercise changes
  useEffect(() => {
    if (!exercise || !activeWorkout) return;
    sessionSetsRef.current = [];
    // Clear immediately so the UI never shows a previous exercise's data
    setLoggedSets([]);
    setPrevSets([]);
    setAllTimeSets([]);
    setCurrentSet({ ...DEFAULT_SET });
    setGhostSet(null);
    // An unfinished cluster belongs to the exercise it was started on;
    // abandon it on any exercise change (incl. superset auto-jump) so
    // its banner can't carry stale reps onto the next exercise.
    setCluster(null);
    setClusterReps('');

    // Guard so that async state updates don't land after the exercise
    // changes (rapid swap) or the screen unmounts mid-load. Without this,
    // a fast tap on the next-exercise button + slow DB read could
    // overwrite the new exercise's fresh state with stale data from the
    // previous exercise.
    let cancelled = false;

    async function loadHistory() {
      const [lastN, allTime] = await Promise.all([
        getLastNWorkoutSets(exercise.id, activeWorkout.id, 2),
        getAllCompletedSetsForExercise(exercise.id, activeWorkout.id),
      ]);
      if (cancelled) return;
      const prev = lastN[0] || [];
      const prevPrev = lastN[1] || [];
      setPrevSets(prev);
      setAllTimeSets(allTime);

      // Ghost pre-fill: use the matching set index from last session
      const allLoggedAtLoad = workoutExercises[currentExerciseIndex]?.sets || [];
      const ghostIndex = allLoggedAtLoad.length; // 0-based index of next set to log
      const ghostCandidate = prev[ghostIndex] ?? prev[prev.length - 1] ?? null;
      if (ghostCandidate && ghostCandidate.weight > 0) {
        setGhostSet({
          weight: ghostCandidate.weight,
          reps: ghostCandidate.actualReps ?? ghostCandidate.actual_reps ?? 0,
          rir: ghostCandidate.rir ?? null,
        });
      } else {
        setGhostSet(null);
      }

      // Layoff detection: last session was more than 7 days ago
      const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
      const lastTs = prev.reduce((m, s) => Math.max(m, s.createdAt ?? s.created_at ?? 0), 0);
      const layoffMultiplier = lastTs > 0 && (Date.now() - lastTs) > SEVEN_DAYS ? 0.9 : 1.0;

      const allLoggedForExercise = workoutExercises[currentExerciseIndex]?.sets || [];
      setLoggedSets(allLoggedForExercise);

      // Compute per-set targets for next session
      const { targets: computed, reason: computedReason } = computeSetTargets(
        prev,
        routineExercise?.recommendedRepsMin,
        routineExercise?.recommendedRepsMax,
        units,
        {
          exerciseCategory: exercise?.exerciseCategory || exercise?.exercise_category || 'compound',
          incrementKg: exercise?.incrementKg || exercise?.increment_kg || null,
          prevPrevSets: prevPrev,
          layoffMultiplier,
        },
      );
      setSetTargets(computed);
      setTargetReason(computedReason);

      // Pre-fill from what was ACTUALLY lifted last time for this set position
      // (Strong / Hevy behaviour), NOT the computed progression target, the
      // target felt random to users (e.g. 9.5kg prefilled after a 30kg set).
      // The target still shows as the suggestion chip (setTargets), so the
      // coaching cue is kept; it just no longer overrides the input.
      const currentWorkingCount = allLoggedForExercise.filter(s => s.setType !== 'warmup').length;
      const lastActual = getBestAnchorSet(prev, currentWorkingCount) || prev[prev.length - 1] || null;
      if (lastActual && (lastActual.weight ?? 0) > 0) {
        setCurrentSet({
          ...DEFAULT_SET,
          weight: lastActual.weight,
          reps: lastActual.actualReps ?? lastActual.actual_reps ?? DEFAULT_SET.reps,
        });
      } else {
        setCurrentSet({
          ...DEFAULT_SET,
          weight: routineExercise?.startingWeight ?? '',
          reps: routineExercise?.recommendedRepsMax || DEFAULT_SET.reps,
        });
      }

      // Ghost pre-fill: if the computed weight is 0 or empty, apply ghost values
      if (ghostCandidate && ghostCandidate.weight > 0) {
        setCurrentSet(cs => {
          const w = parseFloat(cs.weight) || 0;
          if (w === 0) {
            return {
              ...cs,
              weight: ghostCandidate.weight,
              reps: ghostCandidate.actualReps ?? ghostCandidate.actual_reps ?? cs.reps,
              rir: ghostCandidate.rir ?? cs.rir,
              isGhost: true,
            };
          }
          return cs;
        });
      }

      // Warm-up sets are no longer forced on the first set of every
      // exercise. Forcing every exercise to start with a warm-up that
      // the user has to click through (or change the set type to
      // skip) is the friction the user kept hitting, they don't want
      // it. The default is now a clean working set. Users who want a
      // warm-up first tap the "Add warm-up set" button which flips
      // the current entry to warmup with sensible defaults.

      // Read the current mesocycle week for the deload state + prescription.
      try {
        const currentWeek = await getCurrentMesocycleWeek(user?.id);
        if (currentWeek) {
          setIsDeloadWeek(!!currentWeek.isDeload);

          // If this is a deload week, generate deload prescription from week-1 sets
          if (currentWeek.isDeload && currentWeek.mesocycleId && exercise?.id) {
            const week1Sets = await getWeek1SetsForExercise(currentWeek.mesocycleId, exercise.id);
            if (week1Sets.length > 0) {
              // Use first-half prescription (week-1 weight, 50% reps) as default
              const deloadTargets = generateDeloadPrescription(week1Sets, true);
              if (deloadTargets.length > 0) {
                const firstDeload = deloadTargets[0];
                setCurrentSet(cs => ({
                  ...cs,
                  weight: firstDeload.weight,
                  reps: firstDeload.reps,
                  rir: firstDeload.rir,
                }));
                // Store deload targets in setTargets shape so the inline chip renders them
                setSetTargets(deloadTargets.map(t => ({
                  weight: t.weight,
                  repsMin: t.reps,
                  repsMax: t.reps,
                  action: 'deload',
                  isDeload: true,
                })));
                setTargetReason('Recovery week: very easy effort, full recovery focus.');
              }
            }
          }
        }
      } catch (_e) {}

      // Restore an in-progress draft (typed but not yet logged) so backgrounding
      // or a cold relaunch mid-set doesn't wipe what the user just entered. Only
      // restores when it belongs to THIS set position, so it never lands a stale
      // value on the wrong set.
      try {
        const raw = await AsyncStorage.getItem(`@volyume_setdraft_${activeWorkout.id}_${exercise.id}`);
        if (!cancelled && raw) {
          const draft = JSON.parse(raw);
          const nextCount = (workoutExercises[currentExerciseIndex]?.sets || []).filter(s => s.setType !== 'warmup').length;
          if (draft && draft.workingCount === nextCount && draft.weight !== '' && draft.weight != null) {
            setCurrentSet(cs => ({
              ...cs,
              weight: draft.weight,
              reps: draft.reps ?? cs.reps,
              rir: draft.rir ?? cs.rir,
              setType: draft.setType || cs.setType,
            }));
          }
        }
      } catch (_) { /* draft restore is best-effort */ }
    }

    loadHistory();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise?.id, currentExerciseIndex]);

  // Persist the in-progress set draft so leaving the app mid-set doesn't wipe
  // what was typed. iOS routinely terminates a memory-heavy app's JS process
  // while you're in another app, then remounts this screen on return (looks
  // like "I just switched apps"), the in-memory entry would otherwise be lost.
  // Keyed per workout + exercise, tagged with the working-set index so it only
  // restores onto the same set (see loadHistory). An empty weight clears it.
  const draftSaveTimer = useRef(null);
  const draftRef = useRef(null);
  useEffect(() => {
    if (!activeWorkout?.id || !exercise?.id) { draftRef.current = null; return undefined; }
    const key = `@volyume_setdraft_${activeWorkout.id}_${exercise.id}`;
    const workingCount = countProgressSets(loggedSets);
    const w = currentSet?.weight;
    const payload = (w === '' || w == null) ? null
      : { workingCount, weight: currentSet.weight, reps: currentSet.reps, rir: currentSet.rir, setType: currentSet.setType };
    draftRef.current = { key, payload }; // mirror for the immediate background flush
    if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
    draftSaveTimer.current = setTimeout(() => {
      if (payload) AsyncStorage.setItem(key, JSON.stringify(payload)).catch(() => {});
      else AsyncStorage.removeItem(key).catch(() => {});
    }, 250);
    return () => { if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current); };
  }, [currentSet, loggedSets, activeWorkout?.id, exercise?.id]);

  // Flush the draft the INSTANT the app backgrounds, so a quick type-then-switch
  // (faster than the debounce above) still persists before iOS may kill the JS.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if ((s === 'background' || s === 'inactive') && draftRef.current?.payload) {
        AsyncStorage.setItem(draftRef.current.key, JSON.stringify(draftRef.current.payload)).catch(() => {});
      }
    });
    return () => { try { sub?.remove(); } catch (_) {} };
  }, []);

  // COMP-001 measurement: the logged list renders above the action row now;
  // emit the count as it grows so the fold maths can be validated in
  // production (no set data, just how many rows are on screen).
  useEffect(() => {
    if (loggedSets.length > 0) {
      audit('workout.loggedsets.visible', { count: loggedSets.length });
    }
  }, [loggedSets.length]);


  async function handleCompleteSet(overrides = {}) {
    if (!exercise || !activeWorkout) return;
    // A2 (audit CL-3): logging ANOTHER set cancels any pending auto-advance.
    // Previously "Log another set" within the 1.8s window still yanked the
    // screen to the next exercise, stranding the extra set's context.
    cancelAutoAdvance();
    const validation = validateSetEntryValue({
      value: currentSet,
      exercise,
      units,
      actualRepsOverride: overrides.actualReps,
      weightAction: 'completing this set',
    });
    if (!validation.ok) {
      appAlert(validation.title, validation.message);
      return;
    }
    // Cluster sets (myo-reps / rest-pause) commit the whole cluster as one
    // row: actualReps is the summed total and notes carry the breakdown.
    // Both arrive via `overrides` from finishCluster.
    const effectiveReps = validation.actualReps;
    const effectiveWeight = validation.weight;
    const effectiveNotes = overrides.notes ?? (noteText || null);
    const isWeightReps = validation.isWeightReps;

    setSaving(true);
    // D2: warm-ups get the softer tick, working sets the standard beat.
    if ((currentSet.setType ?? 'straight') === 'warmup') hapticsVocab.warmupLogged();
    else hapticsVocab.setLogged();

    try {
      // WK-3: number sets within their own kind so working sets read 1,2,3
      // regardless of any warm-ups logged first (the old loggedSets.length+1
      // counted warm-ups, so the first working set after a warm-up was "2").
      // Warm-ups get their own 1,2 sequence; set_type distinguishes them.
      const isWarmupSet = (currentSet.setType ?? 'straight') === 'warmup';
      const setNumber = setNumberForKind(loggedSets, isWarmupSet);

      const savedSet = await createWorkoutSet({
        userId: user.id,
        workoutId: activeWorkout.id,
        exerciseId: exercise.id,
        setNumber,
        setType: currentSet.setType || 'straight',
        targetRepsMin: routineExercise?.recommendedRepsMin ?? null,
        targetRepsMax: routineExercise?.recommendedRepsMax ?? null,
        actualReps: effectiveReps,
        weight: effectiveWeight,
        rir: currentSet.rir != null ? parseInt(currentSet.rir, 10) : null,
        rpe: null,
        failed: false,
        notes: effectiveNotes,
        isAmrap: currentSet.setType === 'amrap',
        leftReps: null,
        rightReps: null,
      });

      const setData = {
        id: savedSet.id,
        exerciseId: exercise.id,
        workoutId: activeWorkout.id,
        setNumber,
        setType: currentSet.setType,
        actualReps: effectiveReps,
        weight: effectiveWeight,
        rir: currentSet.rir ?? null,
        rpe: null,
        leftReps: null,
        rightReps: null,
      };

      const newLoggedSets = [...loggedSets, setData];
      setLoggedSets(newLoggedSets);
      addSetToCurrentExercise(setData);
      // The first-time hint has done its job the moment a set lands. Persist
      // the same seen-flag the overflow tap writes, so the hint (and the info
      // pulse) never come back on later sessions or new exercises. The
      // overflow menu itself stays put, so form guidance remains one tap away.
      if (showInfoTipPulse) {
        infoPulseLoop.current?.stop();
        infoPulseAnim.setValue(1);
        setShowInfoTipPulse(false);
        AsyncStorage.setItem('@volyume_seen_workout_info', 'true').catch(() => {});
      }
      audit('workout.set.logged', {
        exerciseId: exercise.id,
        setType: setData.setType,
        isWorking: setData.setType !== 'warmup',
        setIndex: newLoggedSets.length,
      });

      // Visual ack, flash the SetEntry card border amber for ~700 ms so the
      // user sees their tap landed. Tracked timeout so back-to-back logs
      // don't truncate the previous flash mid-frame.
      if (logFlashTimeoutRef.current) clearTimeout(logFlashTimeoutRef.current);
      setLogFlash(true);
      logFlashTimeoutRef.current = setTimeout(() => setLogFlash(false), 700);

      // P9 TalkBack: the haptic and the amber flash are silent to a screen
      // reader; speak the save so a TalkBack user knows the tap landed.
      // announceForAccessibility is a no-op when no screen reader runs.
      try {
        const spokenWeight = setData.weight > 0 ? `, ${setData.weight} ${units}` : '';
        AccessibilityInfo.announceForAccessibility(
          isWarmupSet
            ? 'Warm-up set logged'
            : `Set ${setNumber} logged${spokenWeight}, ${effectiveReps} reps`,
        );
      } catch (_) { /* announcement is best-effort */ }

      // PR Detection, check BEFORE adding current set to the session ref so it
      // can never match itself.  sessionSetsRef is a plain ref so it's never stale
      // the way React state can be between renders.
      const prHistory = [
        ...allTimeSets,
        ...sessionSetsRef.current.filter(s => s.exerciseId === exercise.id),
      ];
      sessionSetsRef.current = [...sessionSetsRef.current, setData];
      // PR detection runs ONLY for weight-based schemas. duration/distance
      // reuse the weight field for time/distance, so running the weight x reps
      // 1RM/heaviest detector over them would report meaningless "PRs".
      const prs = isWeightReps ? detectPR(setData, prHistory, exercise, units) : [];
      if (prs.length > 0 && prHistory.length === 0) {
        // Wave A A1: the first-ever set of an exercise beats nothing,
        // detectPR compares against empty history, so "PERSONAL RECORD"
        // would be a false claim in the very session that builds trust.
        // Acknowledge the first honestly and quietly instead (PRCelebration
        // renders its calm first-lift toast), and it never joins the
        // session's PR list. detectPR itself is untouched: this set still
        // becomes the baseline every later comparison uses.
        showPRCelebration({
          type: 'first_lift',
          weight: setData.weight,
          reps: setData.actualReps,
          value: setData.weight,
          previousValue: null,
          label: `${setData.weight}${units} x ${setData.actualReps} logged as your starting point`,
          exerciseName: exercise.name,
        });
      } else if (prs.length > 0) {
        showPRCelebration({ ...prs[0], exerciseName: exercise.name });
        // Keep one PR per exercise (the most significant), so a multi-set,
        // multi-exercise session reports a handful of PRs, not dozens. The
        // per-set celebration above still fires each time a new best lands.
        setDetectedPRs(prev => bestPRPerExercise([
          ...prev,
          ...prs.map(p => ({ ...p, exerciseId: exercise.id, exerciseName: exercise.name, units })),
        ]));
      }

      // Carry forward what was just lifted (Strong / Hevy): the next set defaults
      // to the SAME weight and reps you just did, not a stale previous-session
      // target. The target chip still shows the progression suggestion.
      if (currentSet.setType !== 'warmup') {
        setCurrentSet(cs => ({ ...cs, weight: setData.weight, reps: setData.actualReps }));
      }

      // Update last activity timestamp
      updateLastActivity();

      // Superset auto-jump: if this exercise is paired with another, jump to the
      // pair WITHOUT starting the rest timer. The rest happens after BOTH halves
      // of the pair are logged. Warmups are per-exercise so they don't trigger
      // the jump. `finally` below clears `saving`.
      //
      // K-1 fix (content-quality audit SF-1): jump only to a LATER partner (the
      // first half of a round). When we have just logged the LATER half, no
      // later partner exists, so we fall through to startRestTimer below and the
      // ~60-120s post-pair rest finally fires before the next round begins on the
      // first exercise. The old `i !== currentExerciseIndex` matched in BOTH
      // directions, so B jumped straight back to A and the rest timer never ran.
      if (currentSet.setType !== 'warmup') {
        const sgi = workoutExercises[currentExerciseIndex]?.supersetGroupId;
        const pairIdx = sgi != null
          ? workoutExercises.findIndex((e, i) => i > currentExerciseIndex && e.supersetGroupId === sgi)
          : -1;
        if (pairIdx >= 0) {
          setCurrentExerciseIndex(pairIdx);
          setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 50);
          setNoteText('');
          setShowNoteInput(false);
          setGhostSet(null);
          return;
        }
      }

      // Start rest timer with per-exercise duration, falling back to the user's
      // global default rest (Hevy teardown R1). Honour the auto-start pref: when
      // off, logging a set no longer kicks off the countdown automatically.
      if (autoStartRestTimer) {
        startRestTimer(routineExercise?.restSeconds || defaultRestSeconds || 90);
      }

      // Auto-advance to next exercise when target sets just completed
      const newWorkingCount = countProgressSets(newLoggedSets);
      const justHitTarget = targetSets && newWorkingCount >= targetSets && workingLogged < targetSets;
      if (justHitTarget && !isLastExercise) {
        if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
        autoAdvanceRef.current = setTimeout(() => {
          handleNextExercise();
        }, 1800);
        // C3: the wait is silent otherwise, arm the visible "Stay here" row
        // for exactly as long as the countdown runs.
        setAutoAdvanceArmed(true);
      }

      // Clear ghost, will be re-computed for the next set index on the next render cycle
      setGhostSet(null);

      // Prepare next set
      setNoteText('');
      setShowNoteInput(false);
      // If warmup was just completed, mark hint seen and auto-switch to working set
      if (currentSet.setType === 'warmup') {
        warmupHintSeenRef.current = true;
        const firstTarget = displaySetTargets[0]; // B2: readiness-trimmed suggestion
        if (firstTarget) {
          const anchorSet0 = getBestAnchorSet(prevSets, 0);
          const prefillReps = prefillRepsForTarget(anchorSet0, firstTarget);
          setCurrentSet(cs => ({
            ...cs,
            setType: 'straight',
            weight: firstTarget.weight,
            reps: prefillReps,
          }));
        } else {
          setCurrentSet(cs => ({
            ...cs,
            setType: 'straight',
            reps: routineExercise?.recommendedRepsMin || 8,
          }));
        }
      }
    } catch (e) {
      logError('ActiveWorkoutScreen.handleCompleteSet', e, {
        userId: user?.id,
        workoutId: activeWorkout?.id,
        exerciseId: exercise?.id,
        setType: currentSet.setType,
      });
      const retryAction = currentSet.setType === 'warmup'
        ? 'Log warm-up'
        : isClusterType(currentSet.setType)
          ? 'Start cluster'
          : 'Log set';
      appAlert(
        'Couldn\'t save set',
        `Your set wasn't saved. Tap ${retryAction} to try again. If it keeps happening, please contact support.`,
      );
    } finally {
      setSaving(false);
    }
  }

  // ─── Edit / delete an already-logged set (Hevy parity) ──────────────
  // Tapping a row in the "This workout" receipt opens a sheet pre-filled with
  // the set's values via the same SetEntry component used to log it, so every
  // exercise type gets the correct inputs for free. Save writes the local row,
  // the store's current-exercise sets array, and the on-screen receipt; the
  // cloud copy ships on the next per-set push (updated_at is bumped by
  // updateWorkoutSet). PR detection is a log-time concern and is NOT re-run on
  // an edit/delete, derived analytics recompute from the DB on next view.

  // F7 (audit UI): stable identity so the memoised LoggedSetRow actually
  // skips on the per-second timer tick, the previous inline `() =>
  // openEditSet(s)` closure was a fresh prop every render, defeating the memo.
  const openEditSet = React.useCallback((set) => {
    setEditingSet(set);
    setEditValue({
      weight: set.weight,
      reps: set.actualReps ?? set.reps,
      setType: set.setType,
      isGhost: false,
    });
  }, []);

  async function handleSaveEditedSet() {
    if (saving || !editingSet || !editValue) return;
    const validation = validateSetEntryValue({
      value: editValue,
      exercise,
      units,
      weightAction: 'saving this set',
    });
    if (!validation.ok) {
      appAlert(validation.title, validation.message);
      return;
    }
    // For timed/distance the value columns are weight=distance/0 and
    // actualReps=seconds; SetEntry already stores those numbers, so parse
    // exactly as the log path does (parseFloat(weight) || 0, parseInt(reps)).
    const { actualReps, weight } = validation;

    setSaving(true);
    try {
      await updateWorkoutSet(editingSet.id, { weight, actualReps });
      updateSetInCurrentExercise(editingSet.id, { weight, actualReps });
      setLoggedSets(prev => prev.map(s => (s.id === editingSet.id ? { ...s, weight, actualReps } : s)));
      setEditingSet(null);
      setEditValue(null);
      updateLastActivity();
      // Visual + tactile ack consistent with the log-set flash.
      hapticsVocab.setLogged();
      if (logFlashTimeoutRef.current) clearTimeout(logFlashTimeoutRef.current);
      setLogFlash(true);
      logFlashTimeoutRef.current = setTimeout(() => setLogFlash(false), 700);
      // P9 TalkBack: spoken counterpart of the ack above.
      try { AccessibilityInfo.announceForAccessibility('Set updated'); } catch (_) {}
    } catch (e) {
      logError('ActiveWorkoutScreen.handleSaveEditedSet', e, {
        userId: user?.id,
        workoutId: activeWorkout?.id,
        setId: editingSet?.id,
      });
      appAlert(
        'Couldn\'t save changes',
        'Your edit wasn\'t saved. Tap Save to retry. Tell me if this keeps happening: ' + (e?.message ?? 'unknown error'),
      );
    } finally {
      setSaving(false);
    }
  }

  function handleDeleteEditedSet() {
    if (!editingSet) return;
    appAlert(
      'Delete set?',
      'This set is removed and your session totals update. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const target = editingSet;
            try {
              const ok = await deleteWorkoutSet(user.id, target.id);
              if (!ok) {
                appAlert('Couldn\'t delete set', 'That set couldn\'t be removed. Please try again.');
                return;
              }
              // Pair the cloud delete exactly like WorkoutHistoryScreen: remove
              // the cloud row, queueing a retry op on failure so a restore
              // cannot resurrect it.
              const supabaseUserId = session?.user?.id;
              if (supabaseUserId) {
                // eslint-disable-next-line global-require
                const { deleteWorkoutSetFromCloud } = require('../lib/sync');
                deleteWorkoutSetFromCloud(supabaseUserId, target.id)
                  .then((cloudOk) => { if (!cloudOk) return enqueueSyncOp('workout_set_delete', target.id, supabaseUserId); })
                  .catch(() => enqueueSyncOp('workout_set_delete', target.id, supabaseUserId));
              }
              removeSetFromCurrentExercise(target.id);
              setLoggedSets(prev => prev.filter(s => s.id !== target.id));
              setEditingSet(null);
              setEditValue(null);
              updateLastActivity();
            } catch (e) {
              logError('ActiveWorkoutScreen.handleDeleteEditedSet', e, {
                userId: user?.id,
                workoutId: activeWorkout?.id,
                setId: target?.id,
              });
              appAlert('Couldn\'t delete set', 'That set couldn\'t be removed. Please try again.');
            }
          },
        },
      ],
    );
  }

  // ─── Cluster sets (myo-reps / rest-pause) ───────────────────────────
  // The activation effort + each mini-set accumulate locally; the whole
  // cluster commits as one workout_sets row on finish (summed reps +
  // breakdown note). See lib/clusterSet.js.

  function startCluster() {
    const activationReps = parseInt(currentSet.reps, 10);
    if (!Number.isFinite(activationReps) || activationReps < 1) {
      appAlert('Enter reps', 'Enter your activation set reps first.');
      return;
    }
    const isBodyweight = /body\s*weight/i.test(exercise?.equipment || '');
    const weightNum = parseFloat(currentSet.weight);
    if (!isBodyweight && (currentSet.weight === '' || currentSet.weight == null || isNaN(weightNum) || weightNum <= 0)) {
      appAlert('Enter weight', `Enter the weight used (in ${units}) before starting the cluster.`);
      return;
    }
    setCluster({
      setType: currentSet.setType,
      weight: currentSet.weight,
      reps: [activationReps],
    });
    setClusterReps('');
    hapticsVocab.setLogged();
    // Short intra-cluster rest hint (rest-pause is 10 to 20s).
    startRestTimer(20);
  }

  // Keyboard-completes-the-set (ULTIMATE-WR-1): the reps field's Done key and
  // the Complete-set button share ONE guarded completion, so cluster set-types
  // still start a cluster and unilateral/normal sets call handleCompleteSet().
  // Respects the same `saving` guard the button's disabled state enforces, so a
  // double Done cannot double-log.
  function handleCompleteSetPress() {
    if (saving) return;
    const uni = exercise ? unilateralExercises.has(exercise.id) : false;
    if (isClusterType(currentSet.setType) && !uni) return startCluster();
    return handleCompleteSet();
  }
  // Keep the ref pointed at the latest closure so the rest-notification
  // "Complete set" action listener (installed once) always calls current state.
  handleCompleteSetPressRef.current = handleCompleteSetPress;
  // Mirror the current set's ghost flag for that same listener's guard.
  currentSetGhostRef.current = !!currentSet?.isGhost;

  function addMiniSet() {
    const n = parseInt(clusterReps, 10);
    if (!Number.isFinite(n) || n <= 0) {
      appAlert('Enter reps', 'Enter the mini-set reps.');
      return;
    }
    setCluster((c) => (c ? { ...c, reps: [...c.reps, n] } : c));
    setClusterReps('');
    hapticsVocab.setLogged();
    startRestTimer(20);
  }

  async function finishCluster() {
    if (!cluster) return;
    const summary = summariseCluster(cluster.setType, cluster.reps);
    if (!summary) { setCluster(null); setClusterReps(''); return; }
    const notes = mergeClusterNote(noteText, summary.notes);
    await handleCompleteSet({ actualReps: summary.totalReps, notes });
    setCluster(null);
    setClusterReps('');
  }

  function cancelCluster() {
    setCluster(null);
    setClusterReps('');
  }

  function handleRevertTimeCrunch() {
    if (!preCrunchSnapshot) return;
    store.setWorkoutExercises(preCrunchSnapshot);
    setTimeCrunchActive(false);
    setStarterActive(false);
    setTimeCrunchMsg('');
    setPreCrunchSnapshot(null);
    hapticsVocab.commit();
  }

  // COMP-013: build the 15-minute starter, a true subset of Day 1. Reuses the
  // shared applyTimeCrunch with starter options (first 4 exercises, 2 sets
  // each), then maps the result back onto the session: trimmed exercises are
  // marked _timeCrunchSkipped, kept exercises keep their lifts/targets but have
  // their working-set target capped and rest cut. Revert restores Day 1 in full.
  function applyStarterSession() {
    const all = workoutExercises;
    if (!all.length) return;
    setPreCrunchSnapshot([...all]);

    const MAX_EX = 4;
    const MAX_SETS = 2;
    const asExercises = all.map(e => ({
      exerciseName:      e.exercise?.name ?? '',
      sets:              e.routineExercise?.recommendedSets ?? e.exercise?.recommendedSets ?? 3,
      restSec:           e.exercise?.restSec ?? 90,
      compoundIsolation: e.exercise?.compoundIsolation ?? 'isolation',
    }));
    const estimate = (exs) => exs.reduce((t, ex) => t + (ex.sets * ((ex.restSec ?? 60) / 60 + 0.75)), 0);
    const { exercises: trimmed } = applyTimeCrunch(
      asExercises, 15, estimate, { maxExercises: MAX_EX, maxSetsPerExercise: MAX_SETS },
    );

    // applyTimeCrunch's starter trim returns the first N entries in plan order,
    // so the first `keepCount` store entries are kept and the rest skipped. Map
    // by INDEX, not exercise name, duplicate or unnamed exercises can't collide.
    const keepCount = trimmed.length;
    store.setWorkoutExercises(prev => prev.map((entry, i) => {
      if (i >= keepCount) return { ...entry, _timeCrunchSkipped: true };
      return {
        ...entry,
        routineExercise: {
          ...entry.routineExercise,
          recommendedSets: Math.min(
            entry.routineExercise?.recommendedSets ?? entry.exercise?.recommendedSets ?? MAX_SETS,
            MAX_SETS,
          ),
        },
        exercise: entry.exercise ? {
          ...entry.exercise,
          restSec: Math.round((entry.exercise.restSec ?? 90) * 0.70),
        } : entry.exercise,
      };
    }));

    setTimeCrunchMsg(getStarterSessionMessage(route?.params?.starterRoutineName, keepCount, MAX_SETS));
    setTimeCrunchActive(true);
    setStarterActive(true);
  }

  // Apply the starter trim exactly once, when the session opens with the param.
  // Consume the param afterwards so a reused screen instance can never re-apply
  // it to a later (full) session via React Navigation's param merging.
  useEffect(() => {
    if (starterAppliedRef.current) return;
    if (!route?.params?.starterSession) return;
    if (!workoutExercises.length) return;
    starterAppliedRef.current = true;
    applyStarterSession();
    navigation.setParams({ starterSession: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.params?.starterSession, workoutExercises.length]);

  function handleTimeCrunch() {
    if (timeCrunchActive) return;
    setPreCrunchSnapshot([...workoutExercises]);
    const remainingExercises = workoutExercises.slice(currentExerciseIndex);
    if (!remainingExercises.length) return;

    // Build exercise list in planEngine format for estimator
    const asExercises = remainingExercises.map(e => ({
      exerciseName:       e.exercise?.name ?? '',
      sets:               Math.max(1, (e.exercise?.recommendedSets ?? 3) - (e.sets?.length ?? 0)),
      restSec:            e.exercise?.restSec ?? 90,
      compoundIsolation:  e.exercise?.compoundIsolation ?? 'isolation',
    }));

    // Target: fit remaining in half of a standard session (≈ 25 min max)
    const targetMins = 25;
    const { exercises: trimmed, restReduction, dropped } = applyTimeCrunch(
      asExercises,
      targetMins,
      (exs) => exs.reduce((t, ex) => t + (ex.sets * (ex.restSec / 60 + 0.75)), 0)
    );

    const newEstimate = Math.round(trimmed.reduce((t, ex) => t + (ex.sets * ((ex.restSec ?? 60) / 60 + 0.75)), 0));
    const msg = getTimeCrunchMessage(dropped, restReduction, newEstimate);

    // Apply reduced rest to current session's pending exercises
    const droppedNames = new Set(dropped);

    if (store.setWorkoutExercises) {
      store.setWorkoutExercises(prev => {
        const updated = [...prev];
        for (let i = currentExerciseIndex; i < updated.length; i++) {
          const name = updated[i].exercise?.name ?? '';
          if (droppedNames.has(name) && (updated[i].sets?.length ?? 0) === 0) {
            updated[i] = { ...updated[i], _timeCrunchSkipped: true };
          } else if (updated[i].exercise) {
            updated[i] = {
              ...updated[i],
              exercise: {
                ...updated[i].exercise,
                restSec: Math.round((updated[i].exercise.restSec ?? 90) * 0.70),
              },
            };
          }
        }
        return updated;
      });
    }

    setTimeCrunchActive(true);
    setTimeCrunchMsg(msg);
    hapticsVocab.error();
  }

  async function handleFinishWorkout() {
    if (!activeWorkout) { navigation.goBack(); return; }
    if (finishingRef.current) return; // double-tap guard
    finishingRef.current = true;
    audit('workout.finish.tap', {
      workoutId: activeWorkout?.id ?? null,
      loggedSetCount: loggedSets.length,
    });
    appAlert(
      'Finish workout?',
      `You've logged ${workoutExercises.reduce((sum, e) => sum + (e.sets?.length ?? 0), 0)} sets across ${workoutExercises.length} exercises.`,
      [
        { text: 'Keep going', style: 'cancel', onPress: () => { finishingRef.current = false; } },
        {
          text: 'Finish',
          onPress: async () => {
            // Capture everything needed for the finish before the rating sheet might
            // cause a re-render that loses closure values.
            const snapshotExercises = workoutExercises;
            const snapshotElapsed = elapsedSeconds;

            async function doFinish() {
              // WK-2: count from the DB, not the in-memory exercise list, so
              // sets logged on an exercise later swapped out or removed still
              // count towards the workout total. Those rows stay in the DB and
              // in history/volume aggregates; snapshotExercises drops them,
              // which under-reported the finished workout. Fall back to memory
              // if the read fails.
              let allSets;
              try {
                const dbRows = await getWorkoutSetsForWorkout(activeWorkout.id);
                allSets = (dbRows && dbRows.length) ? dbRows : snapshotExercises.flatMap(e => e.sets);
              } catch (_) {
                allSets = snapshotExercises.flatMap(e => e.sets);
              }
              const { totalSets, workingSetCount, tonnage } = summariseWorkoutSets(allSets);
              const exerciseNames = snapshotExercises.map(e => e.exercise?.name).filter(Boolean);
              const sessionName = shareSessionName(null, exerciseNames);
              await updateWorkout(activeWorkout.id, {
                endedAt: Date.now(),
                durationMinutes: Math.round(snapshotElapsed / 60),
                isCompleted: true,
                name: sessionName,
                setCount: workingSetCount,
                totalVolume: tonnage,
              });
              // LB-8: the core value event. Counts + duration only, no
              // exercise names or loads.
              try {
                const uid = useAppStore.getState().user?.id;
                if (uid) {
                  // eslint-disable-next-line global-require
                  const { track } = require('../lib/engineTelemetry');
                  track(uid, 'workout_completed', {
                    set_count: workingSetCount,
                    duration_min: Math.round(snapshotElapsed / 60),
                    exercise_count: snapshotExercises.length,
                  }).catch(() => {});
                  // E7.2 activation funnel: first-ever completed workout.
                  // eslint-disable-next-line global-require
                  const { trackFirst } = require('../lib/telemetry/firsts');
                  trackFirst(uid, 'first_workout_logged').catch(() => {});
                }
              } catch (_) { /* tolerate */ }
              // COMP-019: refresh the home-screen widget snapshot (consistency
              // tick) and NEW-002: push my own week signal to active partners.
              // Both fire-and-forget; neither blocks the finish flow.
              try {
                const uid2 = useAppStore.getState().user?.id;
                if (uid2) {
                  // eslint-disable-next-line global-require
                  require('../lib/widgets/writer').writeWidgetSnapshot(uid2).catch(() => {});
                  // Pass the sender's SCOFF score so an outbound freeze (§5)
                  // fires on SCOFF >= 2 with no open flag exactly as on an open
                  // flag; the writer applies the Number.isFinite && >= 2 rule.
                  // eslint-disable-next-line global-require
                  require('../lib/partners/weekSignalWriter').writeOwnWeekSignals(uid2, useAppStore.getState().userProfile?.scoffScore).catch(() => {});
                  // S6: a session just landed, so lay the next activation-nudge
                  // stage (or clear it once activated). Self-guarding and
                  // best-effort; never blocks the finish flow.
                  // eslint-disable-next-line global-require
                  require('../lib/notifications/scheduler').scheduleActivationNudge(uid2).catch(() => {});
                }
              } catch (_) { /* tolerate */ }
              // Push to cloud IMMEDIATELY on finish. Previously the
              // syncWorkout call only fired when the user tapped Close
              // on the Workout Summary screen, if they swiped away to
              // another tab or backgrounded the app between Finish and
              // Close, the completed workout never reached the cloud.
              // Cross-device sign-in then restored everything except
              // workouts and sets. Fire-and-forget; failures fall into
              // pending_sync_ops via syncWorkout's own retry path.
              try {
                const supabaseUserId = useAppStore.getState().session?.user?.id;
                if (supabaseUserId) {
                  // eslint-disable-next-line global-require
                  const { syncWorkout } = require('../lib/sync');
                  syncWorkout(supabaseUserId, activeWorkout.id).catch(() => {});
                }
              } catch (_) { /* tolerate */ }
              // COMP-015: capture the session's real (nonzero, non-reverted)
              // adjustments BEFORE endWorkout clears the slice, so the summary
              // can show its confirmation row.
              const finishedAdjustments = (useAppStore.getState().sessionAdjustments || [])
                .filter(a => a.setDelta !== 0 && !a.reverted)
                .map(a => ({ muscle: a.muscle, setDelta: a.setDelta }));
              endWorkout();
              // D2: the whole-workout completion beat (the vocabulary event
              // existed but was never called anywhere).
              hapticsVocab.workoutComplete();
              // eslint-disable-next-line global-require
              try { require('../lib/notifications/activeWorkout').dismissActiveWorkoutNotification(); } catch (_) {}
              navigation.replace('WorkoutSummary', {
                workoutId: activeWorkout.id,
                sessionAdjustments: finishedAdjustments,
                routineId: activeWorkout.routineId || null,
                startedAt: activeWorkout.startedAt,
                endedAt: Date.now(),
                durationMinutes: Math.round(snapshotElapsed / 60),
                exerciseCount: snapshotExercises.length,
                setCount: totalSets,
                workingSetCount,
                tonnage,
                exerciseNames,
                detectedPRs,
                exerciseData: snapshotExercises.map(e => ({
                  exerciseId: e.exercise?.id,
                  name: e.exercise?.name,
                  recommendedSets: e.sets.filter(s => s.setType !== 'warmup').length || 3,
                  repsMin: e.routineExercise?.recommendedRepsMin || 8,
                  repsMax: e.routineExercise?.recommendedRepsMax || 12,
                  loggedSets: e.sets.map(s => ({
                    weight: s.weight,
                    reps: s.actualReps ?? s.reps,
                    setType: s.setType,
                  })),
                })).filter(e => e.exerciseId),
              });
            }

            try {
              await doFinish();
            } catch (e) {
              logError('ActiveWorkoutScreen.handleFinishWorkout', e, {
                userId: user?.id,
                workoutId: activeWorkout?.id,
                setCount: snapshotExercises.flatMap(ex => ex.sets).length,
              });
              // Reset the double-tap guard so the user can retry. On the
              // happy path the guard stays set forever because we've
              // already navigated away from this screen.
              finishingRef.current = false;
              appAlert(
                'Couldn\'t finish workout',
                'Your sets are still saved but the workout didn\'t close. Tap Finish to retry: ' + (e?.message ?? 'unknown error'),
              );
            }
          },
        },
      ],
    );
  }

  const elapsed = {
    mins: Math.floor(elapsedSeconds / 60),
    secs: elapsedSeconds % 60,
  };
  const elapsedStr = `${elapsed.mins}:${elapsed.secs.toString().padStart(2, '0')}`;

  const targetSets = adjustedSetCount; // COMP-015: session-adjusted working-set target
  const workingLogged = countProgressSets(loggedSets);
  const targetComplete = targetSets && workingLogged >= targetSets;

  // Card-header line 1 (COMP-001): where am I, what kind of set. The whole
  // line opens the set-type picker (it replaced SetEntry's card-foot row).
  const orientationLabel = (() => {
    if (currentSet.setType === 'warmup') {
      return `Warm-up - Set W${loggedSets.filter(s => s.setType === 'warmup').length + 1}`;
    }
    if (isDeloadWeek) return `Light set ${workingLogged + 1} - Easy`;
    const pos = targetSets ? `Set ${workingLogged + 1} of ${targetSets}` : `Set ${workingLogged + 1}`;
    const mode = (currentSGI != null && pairedExerciseName)
      ? 'Superset'
      : (SET_TYPE_OPTIONS.find(o => o.value === currentSet.setType)?.label ?? 'Working');
    return `${pos} - ${mode}`;
  })();

  // Stalled-progress nudge: same weight & reps across the last 3 sessions
  // means the suggestion engine isn't doing enough on its own, pull back
  // the loop and offer a concrete next step. First working set only, so it
  // doesn't blare repeatedly. Renders as the card header's coaching line.
  const stalledAdvice = (() => {
    if (currentSet.setType === 'warmup' || workingLogged !== 0) return null;
    if (!allTimeSets || allTimeSets.length < 9) return null;
    // Group by workoutId, take the heaviest set of each session
    const bySession = new Map();
    for (const s of allTimeSets) {
      if ((s.setType ?? s.set_type ?? 'straight') === 'warmup') continue;
      const wid = s.workoutId ?? s.workout_id;
      if (!wid) continue;
      const cur = bySession.get(wid);
      if (!cur || (s.weight ?? 0) > (cur.weight ?? 0)) bySession.set(wid, s);
    }
    const sessions = Array.from(bySession.values())
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      .slice(0, 3);
    if (sessions.length < 3) return null;
    const w0 = sessions[0].weight ?? 0;
    const r0 = sessions[0].actualReps ?? 0;
    const stalled = sessions.every(s =>
      Math.abs((s.weight ?? 0) - w0) < 0.1 &&
      Math.abs((s.actualReps ?? 0) - r0) <= 1,
    );
    if (!stalled || w0 === 0) return null;
    return { w0, r0 };
  })();

  // B2: the readiness line for the coach slot. A below-par reduction carries
  // its written why on every exercise; a Sharp answer gets at most a calm
  // acknowledgement on the first exercise only, and never a target change.
  const readinessLine = readinessReduces
    ? readinessTweak.whySets
    : (readinessTweak?.acknowledgement && currentExerciseIndex === 0
      ? readinessTweak.acknowledgement
      : null);
  const activeExerciseType = exercise?.exerciseType || 'weight_reps';
  const firstSetPrompt = (() => {
    if (activeExerciseType === 'duration') return 'Enter the time, then tap Log set when done.';
            if (activeExerciseType === 'distance') return 'Enter distance and time, then tap Log set when done.';
            if (activeExerciseType === 'reps_only') return 'Enter reps, then tap Log set when done.';
            return 'Enter weight and reps, then tap Log set when done.';
  })();

  const handleCurrentSetChange = useCallback((next) => {
    if (!next.isGhost && currentSet.isGhost) setGhostSet(null);
    setCurrentSet(next);
  }, [currentSet.isGhost]);

  if (!exercise) {
    return (
      <SafeAreaView style={styles.safe}>
        <EmptyExerciseView
          onAdd={() => setShowExercisePicker(true)}
          onFinish={handleFinishWorkout}
          onCancel={handleCancelWorkout}
          elapsed={elapsedStr}
          workoutExercises={workoutExercises}
          setCurrentExerciseIndex={setCurrentExerciseIndex}
          currentExerciseIndex={currentExerciseIndex}
        />
        <ExercisePickerModal
          visible={showExercisePicker}
          onClose={closeExercisePicker}
          onSelect={handlePickerSelect}
          actionLabel={pickerMode === 'swap' ? 'Swap in' : 'Add to workout'}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerSide}>
            <TouchableOpacity
              onPress={handleCancelWorkout}
              style={styles.headerTapTarget}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Cancel workout"
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.headerCenter}>
            <Text style={styles.timerText}>{elapsedStr}</Text>
            {timeCrunchActive && (
              <Ionicons
                name="timer"
                size={15}
                color={colors.warning}
                accessibilityLabel="Time crunch active"
              />
            )}
          </View>
          <View style={styles.headerSideRight}>
            {targetComplete && !extraSetArmed && isLastExercise ? (
              <View style={styles.headerTapTarget} />
            ) : (
              <TouchableOpacity
                onPress={handleFinishWorkout}
                style={[styles.headerTapTarget, styles.headerFinishButton]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Finish workout"
              >
                <Ionicons name="checkmark-done" size={15} color={colors.textPrimary} />
                <Text style={styles.headerFinishText}>Finish</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* COMP-013 starter-session banner moved into the collapsed "N notes"
            rail above the set-entry card (U-A-1). */}

        {/* Exercise Navigator */}
        {workoutExercises.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.exerciseNav}
            contentContainerStyle={styles.exerciseNavContent}
          >
            {workoutExercises.map((entry, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.navTab, i === currentExerciseIndex && styles.navTabActive]}
                onPress={() => {
                  setCurrentExerciseIndex(i);
                }}
                accessibilityRole="button"
                accessibilityLabel={entry.exercise?.name || `Exercise ${i + 1}`}
                accessibilityState={{ selected: i === currentExerciseIndex }}
              >
                <Text
                  style={[styles.navTabText, i === currentExerciseIndex && styles.navTabTextActive]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {entry.exercise?.name}
                </Text>
                {entry.sets?.length > 0 && (
                  <View style={styles.navTabBadge}>
                    <Text style={styles.navTabBadgeText} maxFontSizeMultiplier={1.3}>{entry.sets.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Exercise Title */}
          <View style={styles.exerciseHeader}>
            <View style={styles.exerciseNameRow}>
              <Text style={styles.exerciseName} numberOfLines={2}>{exercise.name}</Text>
              <TouchableOpacity
                style={styles.overflowBtn}
                onPress={() => {
                  if (showInfoTipPulse) {
                    infoPulseLoop.current?.stop();
                    infoPulseAnim.setValue(1);
                    setShowInfoTipPulse(false);
                    AsyncStorage.setItem('@volyume_seen_workout_info', 'true').catch(() => {});
                  }
                  audit('workout.overflow.open', { exerciseId: exercise?.id });
                  setShowOverflow(true);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="More options for this exercise"
              >
                <Animated.View style={showInfoTipPulse ? { transform: [{ scale: infoPulseAnim }] } : null}>
                  <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
                </Animated.View>
              </TouchableOpacity>
            </View>
            {/* Muscle line deleted (COMP-001): primary muscle and equipment
                already show in the exercise info sheet. Superset chip moved
                into the collapsed "N notes" rail (U-A-1). */}
          </View>

          {/* U-A-1: collapse the banner stack into one tappable "N notes"
              rail so the beat line + inputs stay above the fold. The nav
              strip (above) and the rest timer (below) stay visible; every
              other banner folds in here and expands on demand. */}
          {(() => {
            const notes = [];
            if (starterActive) {
              notes.push(
                <View key="starter" style={styles.starterBanner}>
                  <Ionicons name="flash-outline" size={16} color={colors.primary} />
                  <Text style={styles.starterBannerText}>{timeCrunchMsg}</Text>
                  <TouchableOpacity
                    style={styles.inlineActionPill}
                    onPress={handleRevertTimeCrunch}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="Do the full session instead"
                  >
                    <Text style={styles.inlineActionPillText}>Full session</Text>
                  </TouchableOpacity>
                </View>
              );
            }
            if (currentSGI != null && !!pairedExerciseName) {
              notes.push(
                <View key="superset" style={styles.supersetChip}>
                  <Ionicons name="link" size={11} color={colors.primary} />
                  <Text style={styles.supersetChipText}>
                    Superset {currentSGI} - alternates with {pairedExerciseName}
                  </Text>
                </View>
              );
            }
            nextTimeNotes.forEach(note => {
              notes.push(
                <View key={`note-${note.id}`} style={styles.nextTimeBanner}>
                  <Ionicons name="bulb-outline" size={16} color={colors.primary} style={{ marginTop: spacing.hair }} />
                  <Text style={styles.nextTimeBannerText} numberOfLines={4}>{note.note}</Text>
                  <TouchableOpacity
                    style={styles.inlineActionPill}
                    onPress={async () => {
                      try { await markNoteShown(note.id); } catch (_e) {}
                      setNextTimeNotes(prev => prev.filter(n => n.id !== note.id));
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="Dismiss note"
                  >
                    <Text style={styles.inlineActionPillText}>Got it</Text>
                  </TouchableOpacity>
                </View>
              );
            });
            if (isDeloadWeek && !deloadDismissed) {
              notes.push(
                <View key="deload" style={styles.deloadBanner}>
                  <View style={styles.deloadBannerLeft}>
                    <Ionicons name="battery-charging-outline" size={18} color={colors.warning} />
                    <View>
                      <Text style={styles.deloadBannerTitle}>Recovery week</Text>
                      <Text style={styles.deloadBannerSub}>Light loads - full recovery - no PRs</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.inlineActionPill}
                    onPress={() => setDeloadDismissed(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Dismiss deload banner"
                  >
                    <Text style={styles.inlineActionPillText}>Skip</Text>
                  </TouchableOpacity>
                </View>
              );
            }
            if (targetComplete) {
              notes.push(
                <View key="target-reached" style={styles.targetBanner}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={styles.targetBannerText}>
                    Target reached: {targetSets} working set{targetSets !== 1 ? 's' : ''} done
                  </Text>
                </View>
              );
            }
            if (notes.length === 0) return null;
            const noteCount = notes.length;
            return (
              <View style={styles.notesRail}>
                <TouchableOpacity
                  style={styles.notesChip}
                  onPress={() => setNotesExpanded(v => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: notesExpanded }}
                  accessibilityLabel={`${noteCount} note${noteCount !== 1 ? 's' : ''}, tap to ${notesExpanded ? 'collapse' : 'expand'}`}
                >
                  <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
                  <Text style={styles.notesChipText}>{noteCount} note{noteCount !== 1 ? 's' : ''}</Text>
                  <Ionicons name={notesExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
                </TouchableOpacity>
                {notesExpanded && <View style={styles.notesExpanded}>{notes}</View>}
              </View>
            );
          })()}

          {/* Rest timer, sits ABOVE the SetEntry card, in the slot vacated
              by the old weekly-sets calendar row. Stays in the user's
              eye-line with the inputs but doesn't clutter the card border.
              The timer only renders when active so this space is normally
              empty. */}
          <RestTimer />

          {/* Set Entry */}
          <View style={[
            styles.setEntryCard,
            currentSet.setType === 'warmup' && styles.setEntryCardWarmup,
            logFlash && styles.setEntryCardFlash,
          ]}>
            {currentSet.setType === 'warmup' && (
              <View style={styles.warmupBanner}>
                <Ionicons name="flame-outline" size={14} color={colors.warning} />
                <Text style={styles.warmupBannerText}>Warm-up - not counted in your totals</Text>
              </View>
            )}
            {currentSet.setType === 'warmup' && !warmupHintSeenRef.current && (
              <Text style={styles.warmupOneTimeHint}>
                Get the muscles and joints ready. Light weight, easy reps. Tap Log warm-up when you&apos;re ready to work.
              </Text>
            )}
            {/* Card header (COMP-001): three fixed lines replace the old
                chip stack (set title, target chip, coach-reason chip,
                stalled chip, beat chip, repeat-last button, ghost chip).
                One mechanism for previous performance, at input size,
                tappable. Ghost pre-fill state is still communicated by
                the muted input colour (valueInputGhost). */}

            {/* Line 1: orientation row. Also the set-type picker's only
                entry point now the SetEntry card-foot row is gone. */}
            <TouchableOpacity
              testID="volyume-set-type-btn"
              style={styles.orientationRow}
              onPress={() => setShowSetTypePicker(true)}
              hitSlop={{ top: 8, bottom: 4, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={`${orientationLabel}, tap to change set type`}
            >
              <Text style={styles.orientationText}>{orientationLabel}</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Target line (U-A-1): the sets · reps prescription, moved off
                the pre-card banner stack into the card header beside the
                orientation/beat lines. */}
            {routineExercise && (
              <View style={styles.targetRow}>
                <Ionicons name="flag-outline" size={12} color={colors.textMuted} />
                <Text style={styles.targetText} numberOfLines={1}>
                  Target: {adjustedSetCount || routineExercise.recommendedSets || 3} sets - {routineExercise.recommendedRepsMin}-{routineExercise.recommendedRepsMax} reps
                </Text>
              </View>
            )}

            {/* Line 2: beat line. The previous-performance anchor plus
                target range and direction, promoted from xs italic to
                input-size numerals. Tap applies last session's numbers,
                the Hevy tap-previous-to-fill mechanic. */}
            {currentSet.setType !== 'warmup' && (() => {
              const target = displaySetTargets[workingLogged]; // B2: readiness-trimmed suggestion
              // prevSets is the raw previous-session array (warm-ups included),
              // but warm-ups and working sets number their set_number
              // independently, so a logged warm-up can sort to prevSets[0] and
              // shift the working-set mapping. Filter warm-ups out BEFORE
              // indexing by workingLogged so both the "Last:" line and the
              // tap-to-fill below read the correct working set. (D1 #2)
              const prevWorking = prevSets.filter(
                s => (s.setType ?? s.set_type ?? 'straight') !== 'warmup',
              );
              const prev = prevWorking[workingLogged];
              if (target?.isDeload) {
                return (
                  <TouchableOpacity
                    style={styles.beatLine}
                    onPress={() => {
                      hapticsVocab.setLogged();
                      audit('workout.beatline.apply', { exerciseId: exercise?.id, setIndex: workingLogged });
                      setCurrentSet(s => ({ ...s, weight: String(target.weight ?? 0), reps: target.repsMin ?? s.reps, isGhost: false }));
                    }}
                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Recovery week: ${target.weight} ${units} times ${target.repsMin}. Tap to apply.`}
                  >
                    <Text style={styles.beatLineLabel} numberOfLines={2}>
                      Recovery week - <Text style={styles.beatLineValue}>{target.weight}{units} x {target.repsMin}</Text>
                    </Text>
                    <View style={styles.beatLineCue}>
                      <Ionicons name="arrow-down-circle-outline" size={13} color={colors.textSecondary} />
                      <Text style={styles.beatLineCueText}>Use</Text>
                    </View>
                  </TouchableOpacity>
                );
              }
              const range = target
                ? (target.repsMin === target.repsMax ? `${target.repsMin}` : `${target.repsMin}-${target.repsMax}`)
                : (routineExercise?.recommendedRepsMin != null
                  ? `${routineExercise.recommendedRepsMin}-${routineExercise.recommendedRepsMax}`
                  : null);
              const glyph = target?.action === 'increase' ? '+' : target?.action === 'decrease' ? '-' : null;
              if (prev) {
                return (
                  <TouchableOpacity
                    style={styles.beatLine}
                    onPress={() => {
                      hapticsVocab.setLogged();
                      audit('workout.beatline.apply', { exerciseId: exercise?.id, setIndex: workingLogged });
                      setCurrentSet(s => ({
                        ...s,
                        weight: String(prev.weight ?? 0),
                        reps: prev.actualReps ?? s.reps,
                        isGhost: false,
                      }));
                    }}
                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Last session: ${prev.weight} ${units} times ${prev.actualReps} reps.${range ? ` Target ${range}.` : ''} Tap to apply.`}
                  >
                    <Text style={styles.beatLineLabel} numberOfLines={2}>
                      Last: <Text style={styles.beatLineValue}>{prev.weight}{units} x {prev.actualReps}</Text>
                      {range ? ' - Target ' : ''}
                      {range ? <Text style={styles.beatLineValue}>{range}</Text> : null}
                      {glyph ? <Text style={styles.beatLineGlyph}> {glyph}</Text> : null}
                    </Text>
                    <View style={styles.beatLineCue}>
                      <Ionicons name="arrow-down-circle-outline" size={13} color={colors.textSecondary} />
                      <Text style={styles.beatLineCueText}>Use</Text>
                    </View>
                  </TouchableOpacity>
                );
              }
              if (!range) return null;
              return (
                <View
                  style={styles.beatLine}
                  accessible
                  accessibilityLabel={`First time on this exercise. Target ${range} reps.`}
                >
                  <Text style={styles.beatLineLabel} numberOfLines={2}>
                    First time - Target <Text style={styles.beatLineValue}>{range}</Text>
                  </Text>
                </View>
              );
            })()}

            {/* Line 3: coaching line, max one, first working set only.
                Priority (COMP-015/B2): session adjustment > readiness tweak >
                stalled advice > coach reason. Absent while the deload banner is
                showing (one context line at a time; deload never co-occurs with
                an adjustment, the engine is silent on deload weeks). Tap opens
                the exercise info sheet, including the Adjusted today and
                readiness sections. */}
            {currentSet.setType !== 'warmup' && workingLogged === 0 &&
              !(isDeloadWeek && !deloadDismissed) && (sessionAdjustment?.show || readinessLine || stalledAdvice || targetReason) && (
              <TouchableOpacity
                style={styles.coachLine}
                onPress={() => setShowExecution(true)}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                accessibilityRole="button"
                accessibilityLabel={(sessionAdjustment?.show && !readinessDrivesTarget)
                  ? `${sessionAdjustment.reasonText} Double-tap for details and to restore the plan.`
                  : readinessLine
                    ? `${readinessLine}${readinessReduces ? ' Double-tap for details and to use the planned targets instead.' : ''}`
                    : stalledAdvice
                      ? `Same weight 3 sessions running. Try ${stalledAdvice.w0 + 2.5} ${units} times ${Math.max(1, stalledAdvice.r0 - 1)}, or stay at ${stalledAdvice.w0} ${units} and push for ${stalledAdvice.r0 + 1}.`
                      : targetReason}
              >
                <Ionicons name="sparkles-outline" size={13} color={colors.primary} style={{ marginTop: spacing.xxs }} />
                <Text style={styles.coachLineText} numberOfLines={2}>
                  {(sessionAdjustment?.show && !readinessDrivesTarget)
                    ? sessionAdjustment.reasonText
                    : readinessLine
                      ? readinessLine
                      : stalledAdvice
                        ? `Same weight 3 sessions running. Try ${stalledAdvice.w0 + 2.5}${units} x ${Math.max(1, stalledAdvice.r0 - 1)}, or stay at ${stalledAdvice.w0}${units} and push for ${stalledAdvice.r0 + 1}.`
                        : targetReason}
                </Text>
                <Ionicons name="chevron-forward" size={13} color={colors.textSecondary} style={{ marginTop: spacing.xxs }} />
              </TouchableOpacity>
            )}
            {showInfoTipPulse && loggedSets.length === 0 && prevSets.length === 0 && (
              <View style={styles.firstSetHint}>
                <Ionicons name="sparkles-outline" size={14} color={colors.primary} />
                <Text style={styles.firstSetHintText}>
                  {firstSetPrompt} Open More for form tips, warm-ups, swaps and session options.
                </Text>
              </View>
            )}
            {/* Warm-ups are no longer auto-suggested. Two reasons: the
                chip auto-appeared on every exercise's first set and
                supersets don't make sense having warm-ups between paired
                exercises. Users who want a warm-up can mark the current
                set as Warmup via the Set type picker on the SetEntry
                card below, same outcome, no prompt. */}
            <SetEntry
              value={currentSet}
              onChange={handleCurrentSetChange}
              units={units}
              isWarmup={currentSet.setType === 'warmup'}
              onSubmitComplete={handleCompleteSetPress}
              exerciseType={activeExerciseType}
              weightStepKg={exercise?.incrementKg || exercise?.increment_kg || 2.5}
            />

            {showNoteInput ? (
              <TextInput
                style={styles.noteInput}
                value={noteText}
                onChangeText={setNoteText}
                placeholder="Add a note..."
                placeholderTextColor={colors.textMuted}
                accessibilityLabel="Add a note"
                multiline
                autoFocus
                autoComplete="off"
                textContentType="none"
              />
            ) : null}
          </View>

          {/* Cluster banner: drives myo-rep / rest-pause mini-sets. */}
          {cluster ? (
            <View style={styles.clusterBanner}>
              <Text style={styles.clusterTitle}>
                {clusterLabel(cluster.setType)} cluster
              </Text>
              <Text style={styles.clusterReps}>
                {cluster.reps.join(' + ')} = {cluster.reps.reduce((a, n) => a + n, 0)} reps
                {cluster.weight ? ` @ ${cluster.weight}${units}` : ''}
              </Text>
              <View style={styles.clusterInputRow}>
                <TextInput
                  style={styles.clusterInput}
                  value={clusterReps}
                  onChangeText={setClusterReps}
                  placeholder="Mini-set reps"
                  placeholderTextColor={colors.textMuted}
                  accessibilityLabel="Mini-set reps"
                  keyboardType="number-pad"
                  returnKeyType="done"
                  onSubmitEditing={addMiniSet}
                />
                <TouchableOpacity
                  style={styles.clusterAddBtn}
                  onPress={addMiniSet}
                  accessibilityRole="button"
                  accessibilityLabel="Add mini-set"
                >
                  <Ionicons name="add" size={20} color={colors.primary} />
                  <Text style={styles.clusterAddBtnText}>Mini-set</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.completeBtn, saving && styles.btnDisabled]}
                onPress={finishCluster}
                disabled={saving}
                accessibilityRole="button"
                accessibilityState={{ disabled: saving }}
                accessibilityLabel="Finish cluster and log the set"
              >
                <Ionicons name="checkmark-circle" size={20} color={colors.onPrimary} />
                <Text style={styles.completeBtnText}>Finish cluster</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={cancelCluster} style={styles.clusterCancel} accessibilityLabel="Cancel cluster">
                <Text style={styles.clusterCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Action Buttons */}
          {/* A2 (audit CL-4): the PRIMARY action moved to the bottom-pinned
              bar (thumb zone, stable position). In the scroll, only the
              "Log another set" affordance remains, promoted to a full-size
              outline button in the exact pixels the primary used to occupy,
              so the muscle-memory tap logs a set instead of navigating. */}
          {cluster ? null : (targetComplete && !extraSetArmed) ? (
            <TouchableOpacity
              testID="volyume-btn-extra-set"
              style={[styles.extraSetBtnPromoted, saving && styles.btnDisabled]}
              onPress={() => setExtraSetArmed(true)}
              disabled={saving}
              accessibilityRole="button"
              accessibilityState={{ disabled: saving }}
              accessibilityLabel="Log another set"
              accessibilityHint="Opens one more set below; nothing is logged until you confirm"
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={styles.extraSetBtnPromotedText}>Log another set</Text>
            </TouchableOpacity>
          ) : null}

          {/* C3 (audit 2026-07-03): the 1.8s move to the next exercise used
              to be a silent setTimeout, the only way to stay was to log
              another set. Make the wait visible and give it its own
              cancel, alongside the "Log another set" affordance above. */}
          {autoAdvanceArmed && targetComplete && !extraSetArmed ? (
            <View style={styles.autoAdvanceRow}>
              <Text style={styles.autoAdvanceRowText}>Next exercise in a moment</Text>
              <Text style={styles.autoAdvanceRowDot}> - </Text>
              <TouchableOpacity
                style={styles.autoAdvanceRowActionBtn}
                onPress={cancelAutoAdvance}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Stay on this exercise"
              >
                <Text style={styles.autoAdvanceRowAction}>Stay here</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Logged sets sit ABOVE the action row (COMP-001): the session
              receipt builds above the fold, so each logged set is visible
              without scrolling past secondary actions. */}
          {loggedSets.length > 0 && (
            <View style={styles.loggedSection}>
              <Text style={styles.loggedTitle}>This workout</Text>
              {/* D2: rows keyed by the set's stable id (was the array index,
                  which made every delete re-key the rows below it) and wrapped
                  so a logged set arrives, an unlogged one leaves, and siblings
                  glide rather than jump-cut. */}
              {loggedSets.map((s, i) => (
                <AnimatedRow key={s.id ?? `row-${i}`}>
                  <LoggedSetRow
                    set={s}
                    units={units}
                    progressNum={countProgressSets(loggedSets.slice(0, i + 1))}
                    exerciseType={activeExerciseType}
                    onEdit={openEditSet}
                  />
                </AnimatedRow>
              ))}
            </View>
          )}

          {/* Action row (COMP-001): two legible buttons. Swap, info, pair,
              time crunch and remove live in the ⋯ overflow sheet. */}
          <View style={styles.secondaryActions}>
            <TouchableOpacity
              testID="volyume-btn-add-mid-workout"
              style={styles.actionBtn}
              onPress={() => setShowExercisePicker(true)}
              accessibilityRole="button"
              accessibilityLabel="Add exercise to workout"
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.actionBtnText}>Add exercise</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setShowNoteInput(v => !v)}
              accessibilityRole="button"
              accessibilityLabel="Add note to set"
            >
              <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.actionBtnText}>Add note</Text>
            </TouchableOpacity>
          </View>

          {/* Ghost navigation deleted (COMP-001): Next exercise / Finish
              live in the CTA state-swap when the target completes; the
              exercise navigator covers moving on early. Time-crunch active
              state is the timer glyph in the header; revert lives in the
              ⋯ overflow sheet. */}

          <View style={{ height: Math.max(spacing.xxl, insets.bottom + spacing.lg) }} />
        </ScrollView>

        {/* A2 (audit CL-4): the primary action lives in a bottom-pinned bar,
            the one-handed thumb zone, at a stable position, instead of
            floating mid-scroll and swapping identity in the same pixels.
            Cluster flows keep their own in-card controls, so no bar then.
            insets.bottom IS required here: E15's VolyumeTabBar returns null
            while ActiveWorkout is focused (VolyumeTabBar.js), so nothing else
            absorbs the system inset and a flat spacing.md left Log set half
            behind the Android gesture pill (founder screenshot 2026-07-03).
            The earlier "no insets here" note (2026-07-02) described the stock
            always-visible tab bar and no longer holds. Math.max keeps the
            old padding on devices that report no bottom inset. */}
        {cluster ? null : (
          <View style={[styles.bottomBar, { paddingBottom: Math.max(spacing.md, insets.bottom + spacing.sm) }]}>
            {targetComplete && !extraSetArmed ? (
              isLastExercise ? (
                <TouchableOpacity
                  testID="volyume-btn-finish-primary"
                  style={styles.completeBtn}
                  onPress={handleFinishWorkout}
                  accessibilityRole="button"
                  accessibilityLabel="Finish workout"
                >
                  <Ionicons name="checkmark-done" size={20} color={colors.onPrimary} />
                  <Text style={styles.completeBtnText}>Finish workout</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  testID="volyume-btn-next-exercise"
                  style={styles.completeBtn}
                  onPress={handleNextExercise}
                  accessibilityRole="button"
                  accessibilityLabel="Move to next exercise"
                >
                  <Ionicons name="arrow-forward-circle" size={20} color={colors.onPrimary} />
                  <Text style={styles.completeBtnText}>Next exercise</Text>
                </TouchableOpacity>
              )
            ) : (
              <TouchableOpacity
                testID="volyume-btn-complete-set"
                style={[styles.completeBtn, saving && styles.btnDisabled, currentSet.setType === 'warmup' && styles.completeBtnWarmup]}
                onPress={handleCompleteSetPress}
                disabled={saving}
                accessibilityRole="button"
                accessibilityState={{ disabled: saving }}
                accessibilityLabel={
                  currentSet.setType === 'warmup' ? 'Log warm-up'
                  : (isClusterType(currentSet.setType) && !(exercise && unilateralExercises.has(exercise.id))) ? 'Start cluster' : 'Log set'
                }
              >
                <Ionicons name="checkmark-circle" size={20} color={currentSet.setType === 'warmup' ? colors.warning : colors.onPrimary} />
                <Text style={[styles.completeBtnText, currentSet.setType === 'warmup' && styles.completeBtnTextWarmup]}>
                  {currentSet.setType === 'warmup' ? 'Log warm-up'
                    : (isClusterType(currentSet.setType) && !(exercise && unilateralExercises.has(exercise.id))) ? 'Start cluster' : 'Log set'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Exercise Picker Modal, shared by Add and Swap (see pickerMode) */}
        <ExercisePickerModal
          visible={showExercisePicker}
          onClose={closeExercisePicker}
          onSelect={handlePickerSelect}
          actionLabel={pickerMode === 'swap' ? 'Swap in' : 'Add to workout'}
        />

        {/* Superset heads-up modal, appears once per pair when the user
            lands on a paired exercise. Educational for first-timers,
            and gives a clear out (unlink or swap) if they're not set up
            for it today. */}
        <Modal
          visible={!!supersetHeadsUp}
          transparent
          animationType="fade"
          onRequestClose={() => setSupersetHeadsUp(null)}
        >
          {supersetHeadsUp ? (
          <View style={styles.supOverlay}>
            <View style={styles.supSheet}>
              <View style={styles.supIconRow}>
                <Ionicons name="link" size={24} color={colors.primary} />
                <Text style={styles.supTitle}>Superset coming up</Text>
              </View>
              <Text style={styles.supSubtitle}>
                Two exercises paired back-to-back with no rest between them.
              </Text>

              <View style={styles.supPairCard}>
                <View style={styles.supPairRow}>
                  <View style={styles.supPairChip}><Text style={styles.supPairChipText}>1</Text></View>
                  <Text style={styles.supPairName} numberOfLines={2}>
                    {supersetHeadsUp?.exerciseAName}
                  </Text>
                </View>
                <View style={styles.supPairConnector} />
                <View style={styles.supPairRow}>
                  <View style={styles.supPairChip}><Text style={styles.supPairChipText}>2</Text></View>
                  <Text style={styles.supPairName} numberOfLines={2}>
                    {supersetHeadsUp?.exerciseBName}
                  </Text>
                </View>
              </View>

              <View style={styles.supSteps}>
                <View style={styles.supStep}>
                  <Text style={styles.supStepNum}>1</Text>
                  <Text style={styles.supStepText}>Set up both stations now if you can.</Text>
                </View>
                <View style={styles.supStep}>
                  <Text style={styles.supStepNum}>2</Text>
                  <Text style={styles.supStepText}>Do all reps of the first exercise.</Text>
                </View>
                <View style={styles.supStep}>
                  <Text style={styles.supStepNum}>3</Text>
                  <Text style={styles.supStepText}>Move straight to the second. No rest between.</Text>
                </View>
                <View style={styles.supStep}>
                  <Text style={styles.supStepNum}>4</Text>
                  <Text style={styles.supStepText}>After both, rest the full rest period, then repeat.</Text>
                </View>
              </View>

              <Text style={styles.supTip}>
                Tip: if you can't grab both stations right now, unlink and do them as normal sets.
              </Text>

              <TouchableOpacity
                style={styles.supPrimaryBtn}
                onPress={() => setSupersetHeadsUp(null)}
                accessibilityRole="button"
                accessibilityLabel="Got it, start"
              >
                <Text style={styles.supPrimaryBtnText}>Got it, start</Text>
              </TouchableOpacity>

              <View style={styles.supSecondaryRow}>
                <TouchableOpacity
                  style={styles.supSecondaryBtn}
                  onPress={() => {
                    handleTogglePair(); // unpair
                    setSupersetHeadsUp(null);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Unlink the superset"
                >
                  <Ionicons name="unlink" size={14} color={colors.textSecondary} />
                  <Text style={styles.supSecondaryBtnText}>Unlink</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.supSecondaryBtn}
                  onPress={() => {
                    setSupersetHeadsUp(null);
                    handleOpenSwap();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Swap exercise"
                >
                  <Ionicons name="swap-horizontal" size={14} color={colors.textSecondary} />
                  <Text style={styles.supSecondaryBtnText}>Swap exercise</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          ) : null}
        </Modal>

        {/* Stale workout recovery modal */}
        <Modal visible={showStaleModal} transparent animationType="fade" onRequestClose={() => setShowStaleModal(false)}>
          {showStaleModal ? (
          <View style={styles.staleOverlay}>
            <View style={styles.staleSheet}>
              <Ionicons name="time-outline" size={32} color={colors.warning} style={{ marginBottom: spacing.md }} />
              <Text style={styles.staleTitle}>Resume workout?</Text>
              <Text style={styles.staleBody}>
                This workout has been inactive for a while. What would you like to do?
              </Text>
              <TouchableOpacity style={styles.staleResume} onPress={() => { updateLastActivity(); setShowStaleModal(false); }} accessibilityRole="button" accessibilityLabel="Resume workout">
                <Text style={styles.staleResumeText}>Resume</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.staleFinish} onPress={() => { setShowStaleModal(false); handleFinishWorkout(); }} accessibilityRole="button" accessibilityLabel="Finish workout">
                <Text style={styles.staleFinishText}>Finish workout</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.staleDiscard} accessibilityRole="button" accessibilityLabel="Discard workout" onPress={() => {
                appAlert('Discard workout?', 'All logged sets will be lost.', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Discard',
                    style: 'destructive',
                    onPress: async () => {
                      const discardId = activeWorkout?.id;
                      endWorkout();
                      navigation.goBack();
                      if (discardId) {
                        try { await deleteIncompleteWorkout(discardId); }
                        catch (e) { logError('ActiveWorkoutScreen.discardStale', e, { workoutId: discardId }); }
                      }
                    },
                  },
                ]);
              }}>
                <Text style={styles.staleDiscardText}>Discard</Text>
              </TouchableOpacity>
            </View>
          </View>
          ) : null}
        </Modal>




        {/* Set Type Picker Bottom Sheet */}
        <Modal
          visible={showSetTypePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowSetTypePicker(false)}
        >
          {showSetTypePicker ? (
            <View style={styles.sheetHost}>
          <TouchableOpacity
            style={styles.sheetOverlay}
            activeOpacity={1}
            onPress={() => setShowSetTypePicker(false)}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
          <View style={[styles.sheet, { paddingBottom: Math.max(spacing.xxl, insets.bottom + spacing.lg) }]}>
            <View style={styles.sheetHandle} />
            <WorkoutSheetScroll>
              <Text style={styles.sheetTitle}>Set type</Text>
              <Text style={styles.sheetExplainer}>
                Pick how this set was done. Working sets and intensity techniques count towards your training; warm-ups do not. This helps Volyume read the session correctly.
              </Text>
              {/* P9: the radios group so TalkBack announces position context
                  ("2 of 5") while each row keeps its own label and state. */}
              <View accessibilityRole="radiogroup">
              {SET_TYPE_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={styles.sheetOption}
                  onPress={() => {
                    hapticsVocab.selection();
                    setCurrentSet(s => ({ ...s, setType: opt.value }));
                    setShowSetTypePicker(false);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: currentSet.setType === opt.value }}
                  accessibilityLabel={`${opt.label}. ${opt.description}`}
                >
                  <View style={styles.sheetOptionText}>
                    <Text style={[styles.sheetOptionLabel, currentSet.setType === opt.value && styles.sheetOptionLabelActive]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.sheetOptionDesc}>{opt.description}</Text>
                  </View>
                  {currentSet.setType === opt.value && (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
              </View>
            </WorkoutSheetScroll>
          </View>
            </View>
          ) : null}
        </Modal>

        {/* B8: warm-up ramp sheet. Opens ONLY from the overflow menu (the
            recorded no-auto-suggest decision stands, pull, never push).
            Rows are the deterministic warmupRamp arithmetic; tapping one
            loads it into the set entry as a Warm-up via the same setType
            machinery as the manual picker. Nothing is logged for the user. */}
        <Modal
          visible={showWarmupRamp}
          transparent
          animationType="slide"
          onRequestClose={() => setShowWarmupRamp(false)}
        >
          {showWarmupRamp ? (
            <View style={styles.sheetHost}>
          <TouchableOpacity
            style={styles.sheetOverlay}
            activeOpacity={1}
            onPress={() => setShowWarmupRamp(false)}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
          <View style={[styles.sheet, { paddingBottom: Math.max(spacing.xxl, insets.bottom + spacing.lg) }]}>
            <View style={styles.sheetHandle} />
            <WorkoutSheetScroll>
              <Text style={styles.sheetTitle}>Warm-up ramp</Text>
              {(() => {
                // Working weight: the entry while it holds a working set;
                // the anchor while the entry holds a ramp row (so reopening
                // mid-ramp shows the SAME ramp, not one computed from the
                // warm-up weight).
                const entryWeight = parseFloat(currentSet.weight);
                const entryIsWorking = (currentSet.setType ?? 'straight') !== 'warmup';
                const working = (entryIsWorking && Number.isFinite(entryWeight) && entryWeight > 0)
                  ? entryWeight
                  : rampAnchorRef.current;
                if (!Number.isFinite(working) || working <= 0) {
                  return (
                    <Text style={styles.sheetExplainer}>
                      Enter your working weight first, then come back for warm-up sets.
                    </Text>
                  );
                }
                const rows = warmupRamp(working, {
                  isBarbell: BARBELL_EQUIPMENT.test(exercise?.equipment || ''),
                  barKg: barWeight || DEFAULT_BAR_KG,
                });
                if (rows.length === 0) {
                  return (
                    <Text style={styles.sheetExplainer}>
                      {`This is light enough to start at ${working} ${units}. No ramp is needed today.`}
                    </Text>
                  );
                }
                return (
                  <>
                    <Text style={styles.sheetExplainer}>
                      {`Working up to ${working} ${units}. Tap a row to load it as a warm-up, then log it. Warm-ups are saved but not counted in your working-set target.`}
                    </Text>
                    {rows.map((row) => (
                      <TouchableOpacity
                        key={`${row.weight}-${row.reps}`}
                        style={styles.sheetOption}
                        onPress={() => {
                          hapticsVocab.selection();
                          setGhostSet(null);
                          setCurrentSet(s => ({ ...s, weight: row.weight, reps: row.reps, setType: 'warmup', isGhost: false }));
                          setShowWarmupRamp(false);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`${row.isBar ? 'Empty bar' : `${row.weight} ${units}`}, ${row.reps} reps. Load into the set entry as a warm-up.`}
                      >
                        <View style={styles.overflowOptionRow}>
                          <Ionicons name="flame-outline" size={16} color={colors.warning} />
                          <Text style={styles.sheetOptionLabel}>{`${row.weight} ${units} x ${row.reps}`}</Text>
                        </View>
                        {row.isBar ? <Text style={styles.rampBarTag}>Empty bar</Text> : null}
                      </TouchableOpacity>
                    ))}
                  </>
                );
              })()}
            </WorkoutSheetScroll>
          </View>
            </View>
          ) : null}
        </Modal>

        {/* B8: plate calculator sheet. Sheet-local inputs seeded from the
            current entry weight and the profile bar weight on open; edits
            here deliberately persist nowhere (parity with the original
            calculator). kg-only by design, like every gym weight. */}
        <Modal
          visible={showPlates}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPlates(false)}
        >
          {showPlates ? (
            <View style={styles.sheetHost}>
          <TouchableOpacity
            style={styles.sheetOverlay}
            activeOpacity={1}
            onPress={() => setShowPlates(false)}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
          <View style={[styles.sheet, { paddingBottom: Math.max(spacing.xxl, insets.bottom + spacing.lg) }]}>
            <View style={styles.sheetHandle} />
            <WorkoutSheetScroll>
              <Text style={styles.sheetTitle}>Plate calculator</Text>
              <View style={styles.plateInputsRow}>
                <View style={styles.plateInputGroup}>
                  <Text style={styles.plateInputLabel}>{`Target (${units})`}</Text>
                  <TextInput
                    style={styles.plateInput}
                    value={plateTarget}
                    onChangeText={setPlateTarget}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    accessibilityLabel={`Target weight in ${units}`}
                  />
                </View>
                <View style={styles.plateInputGroup}>
                  <Text style={styles.plateInputLabel}>{`Bar (${units})`}</Text>
                  <TextInput
                    style={styles.plateInput}
                    value={plateBar}
                    onChangeText={setPlateBar}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                    placeholder={String(DEFAULT_BAR_KG)}
                    placeholderTextColor={colors.textMuted}
                    accessibilityLabel={`Bar weight in ${units}`}
                  />
                </View>
              </View>
              {(() => {
                const calc = calculatePlates(parseFloat(plateTarget), parseFloat(plateBar));
                if (!calc.ok) {
                  return <Text style={styles.sheetExplainer}>Enter the weight you want on the bar.</Text>;
                }
                if (calc.belowBar) {
                  return (
                    <Text style={styles.sheetExplainer}>
                      {`That is below the bar itself. The empty bar is ${parseFloat(plateBar)} ${units}.`}
                    </Text>
                  );
                }
                return (
                  <>
                    {calc.perSide.length === 0 ? (
                      <Text style={styles.sheetExplainer}>Just the empty bar. Nothing to load.</Text>
                    ) : (
                      <>
                        <Text style={styles.plateSectionLabel}>Each side, heaviest first</Text>
                        {calc.perSide.map(({ plate, count }) => (
                          <View key={plate} style={styles.plateRow} accessible accessibilityLabel={`${count} of ${plate} ${units} each side`}>
                            <View style={[styles.plateDot, { backgroundColor: PLATE_COLOURS[plate] || colors.textMuted }]} />
                            <Text style={styles.plateRowText}>{`${count} x ${plate} ${units}`}</Text>
                          </View>
                        ))}
                      </>
                    )}
                    <Text style={styles.plateTotalLine}>
                      {calc.remainderKg === 0
                        ? `Loads exactly ${calc.loadedKg} ${units}.`
                        : `Closest bar load is ${calc.loadedKg} ${units}, ${calc.remainderKg} ${units} short of the target.`}
                    </Text>
                  </>
                );
              })()}
            </WorkoutSheetScroll>
          </View>
            </View>
          ) : null}
        </Modal>

        {/* Exercise overflow sheet (COMP-001): secondary and destructive
            exercise actions, off the permanent surface. Remove keeps its
            own confirm alert inside handleRemoveExercise. */}
        <Modal
          visible={showOverflow}
          transparent
          animationType="slide"
          onRequestClose={() => setShowOverflow(false)}
        >
          {showOverflow ? (
            <View style={styles.sheetHost}>
          <TouchableOpacity
            style={styles.sheetOverlay}
            activeOpacity={1}
            onPress={() => setShowOverflow(false)}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
          <View style={[styles.sheet, { paddingBottom: Math.max(spacing.xxl, insets.bottom + spacing.lg) }]}>
            <View style={styles.sheetHandle} />
            <WorkoutSheetScroll>
              <Text style={styles.sheetTitle}>{exercise?.name}</Text>
              <TouchableOpacity
                style={styles.sheetOption}
                onPress={() => { setShowOverflow(false); handleOpenSwap(); }}
                accessibilityRole="button"
                accessibilityLabel="Swap exercise"
              >
                <View style={styles.overflowOptionRow}>
                  <Ionicons name="swap-horizontal" size={18} color={colors.textSecondary} />
                  <Text style={styles.sheetOptionLabel}>Swap exercise</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sheetOption}
                onPress={() => { setShowOverflow(false); setShowExecution(true); }}
                accessibilityRole="button"
                accessibilityLabel="Exercise info"
              >
                <View style={styles.overflowOptionRow}>
                  <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
                  <Text style={styles.sheetOptionLabel}>Exercise info</Text>
                </View>
              </TouchableOpacity>
              {/* B8 gym basics. Both live here in the overflow, secondary
                  utilities off the permanent surface (COMP-001), and strictly
                  pull: the warm-up ramp NEVER auto-appears (recorded decision
                  at the set-entry card). */}
              {/* Hidden mid-cluster: a ramp-row tap rewrites the entry's
                  weight AND set type, and finishCluster commits from the
                  live entry, the one-tap path would mislog the whole
                  cluster as a light warm-up. */}
              {!cluster && (!exercise?.exerciseType || exercise.exerciseType === 'weight_reps' || exercise.exerciseType === 'weighted_bodyweight') && (
              <TouchableOpacity
                style={styles.sheetOption}
                onPress={() => {
                  setShowOverflow(false);
                  const w = parseFloat(currentSet.weight);
                  if ((currentSet.setType ?? 'straight') !== 'warmup' && Number.isFinite(w) && w > 0) {
                    rampAnchorRef.current = w;
                  }
                  setShowWarmupRamp(true);
                }}
                accessibilityRole="button"
                accessibilityLabel="Warm-up ramp"
              >
                <View style={styles.overflowOptionRow}>
                  <Ionicons name="flame-outline" size={18} color={colors.textSecondary} />
                  <View style={styles.sheetOptionText}>
                    <Text style={styles.sheetOptionLabel}>Warm-up ramp</Text>
                    <Text style={styles.sheetOptionDesc}>Suggested light sets up to today's working weight.</Text>
                  </View>
                </View>
              </TouchableOpacity>
              )}
              {PLATE_LOADED_EQUIPMENT.test(exercise?.equipment || '') && (
              <TouchableOpacity
                style={styles.sheetOption}
                onPress={() => {
                  setShowOverflow(false);
                  const w = parseFloat(currentSet.weight);
                  setPlateTarget(Number.isFinite(w) && w > 0 ? String(w) : '');
                  setPlateBar(String(barWeight || DEFAULT_BAR_KG));
                  setShowPlates(true);
                }}
                accessibilityRole="button"
                accessibilityLabel="Plate calculator"
              >
                <View style={styles.overflowOptionRow}>
                  <Ionicons name="barbell-outline" size={18} color={colors.textSecondary} />
                  <View style={styles.sheetOptionText}>
                    <Text style={styles.sheetOptionLabel}>Plate calculator</Text>
                    <Text style={styles.sheetOptionDesc}>What to load on each side of the bar.</Text>
                  </View>
                </View>
              </TouchableOpacity>
              )}
              {!isLastExercise && (
              <TouchableOpacity
                style={styles.sheetOption}
                onPress={() => { setShowOverflow(false); handleTogglePair(); }}
                accessibilityRole="button"
                accessibilityLabel={isPairedWithNext ? 'Unpair from next exercise' : 'Pair as superset with next exercise'}
              >
                <View style={styles.overflowOptionRow}>
                  <Ionicons name={isPairedWithNext ? 'link' : 'link-outline'} size={18} color={isPairedWithNext ? colors.primary : colors.textSecondary} />
                  <Text style={styles.sheetOptionLabel}>{isPairedWithNext ? 'Unpair superset' : 'Pair as superset'}</Text>
                </View>
              </TouchableOpacity>
              )}
              {!timeCrunchActive && workoutExercises.length > currentExerciseIndex + 1 && (
              <TouchableOpacity
                style={styles.sheetOption}
                onPress={() => { setShowOverflow(false); handleTimeCrunch(); }}
                accessibilityRole="button"
                accessibilityLabel="Shorten session"
              >
                <View style={styles.overflowOptionRow}>
                  <Ionicons name="timer-outline" size={18} color={colors.textSecondary} />
                  <View style={styles.sheetOptionText}>
                    <Text style={styles.sheetOptionLabel}>Shorten session</Text>
                    <Text style={styles.sheetOptionDesc}>Shortens the rest of today's session to fit the time you have left. Undo any time.</Text>
                  </View>
                </View>
              </TouchableOpacity>
              )}
              {timeCrunchActive && (
              <TouchableOpacity
                style={styles.sheetOption}
                onPress={() => { setShowOverflow(false); handleRevertTimeCrunch(); }}
                accessibilityRole="button"
                accessibilityLabel="Undo shortening"
              >
                <View style={styles.overflowOptionRow}>
                  <Ionicons name="refresh-outline" size={18} color={colors.textSecondary} />
                  <View style={styles.sheetOptionText}>
                    <Text style={styles.sheetOptionLabel}>Undo shortening</Text>
                    {!!timeCrunchMsg && <Text style={styles.sheetOptionDesc}>{timeCrunchMsg}</Text>}
                  </View>
                </View>
              </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.sheetOption}
                onPress={() => { setShowOverflow(false); handleRemoveExercise(); }}
                accessibilityRole="button"
                accessibilityLabel="Remove exercise from workout"
              >
                <View style={styles.overflowOptionRow}>
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                  <Text style={[styles.sheetOptionLabel, { color: colors.error }]}>Remove exercise</Text>
                </View>
              </TouchableOpacity>
            </WorkoutSheetScroll>
          </View>
            </View>
          ) : null}
        </Modal>

        {/* Info / Form Bottom Sheet */}
        <Modal
          visible={showExecution}
          transparent
          animationType="slide"
          onRequestClose={() => setShowExecution(false)}
        >
          {showExecution ? (
            <View style={styles.sheetHost}>
          <TouchableOpacity
            style={styles.sheetOverlay}
            activeOpacity={1}
            onPress={() => setShowExecution(false)}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
          <View style={[styles.sheet, { paddingBottom: Math.max(spacing.xxl, insets.bottom + spacing.lg) }]}>
            <View style={styles.sheetHandle} />
            <WorkoutSheetScroll>
              <Text style={styles.sheetTitle}>{exercise?.name}</Text>
              {exercise?.primaryMuscle ? (
                <Text style={styles.infoMuscle}>
                  {MUSCLE_DISPLAY_NAMES[exercise.primaryMuscle] ?? ((exercise.primaryMuscle || '').charAt(0).toUpperCase() + (exercise.primaryMuscle || '').slice(1).replace('_', ' '))}
                  {exercise.equipment ? ` - ${exercise.equipment}` : ''}
                </Text>
              ) : null}
              {routineExercise?.recommendedSets ? (
                <View style={styles.infoTargetRow}>
                  <Ionicons name="checkmark-circle-outline" size={14} color={colors.primary} />
                  <Text style={styles.infoTarget}>
                    {adjustedSetCount || routineExercise.recommendedSets} sets of {routineExercise.recommendedRepsMin}-{routineExercise.recommendedRepsMax} reps
                  </Text>
                </View>
              ) : null}

              {/* COMP-015: Adjusted today, the reason, the plain-words signals,
                  and the one-tap revert. Shown for any visible adjustment; the
                  revert button only when there's a real set change to undo. */}
              {sessionAdjustment?.show ? (
                <View style={styles.adjustedSection}>
                  <View style={styles.adjustedHeader}>
                    <Ionicons name="sparkles" size={14} color={colors.primary} />
                    <Text style={styles.adjustedTitle}>Adjusted today</Text>
                  </View>
                  <Text style={styles.adjustedReason}>{sessionAdjustment.reasonText}</Text>
                  {sessionAdjustment.signals?.lastTrainedAt ? (
                    <Text style={styles.adjustedSignal}>
                      Last trained {new Date(sessionAdjustment.signals.lastTrainedAt).toLocaleDateString(undefined, { weekday: 'long' })}.
                    </Text>
                  ) : null}
                  {sessionAdjustment.setDelta !== 0 ? (
                    <TouchableOpacity
                      style={styles.adjustedRevertBtn}
                      onPress={() => { revertSessionAdjustment(exercise.id); setShowExecution(false); }}
                      accessibilityRole="button"
                      accessibilityLabel={`Use planned sets instead. ${routineExercise?.recommendedSets ?? ''} sets as written.`}
                    >
                      <Ionicons name="arrow-undo-outline" size={15} color={colors.primary} />
                      <Text style={styles.adjustedRevertText}>Use planned sets instead</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}

              {/* B2: Eased for today, the intent-sheet answer's downward-only
                  tweak, both written whys, and a one-tap session-wide dismiss.
                  Suggestions on the targets display only; the plan and logged
                  sets are never changed. */}
              {readinessReduces ? (
                <View style={styles.adjustedSection}>
                  <View style={styles.adjustedHeader}>
                    <Ionicons name="sparkles" size={14} color={colors.primary} />
                    <Text style={styles.adjustedTitle}>Eased for today</Text>
                  </View>
                  <Text style={styles.adjustedReason}>{readinessTweak.whySets}</Text>
                  {readinessTweak.whyLoad ? (
                    <Text style={styles.adjustedSignal}>{readinessTweak.whyLoad}</Text>
                  ) : null}
                  <TouchableOpacity
                    style={styles.adjustedRevertBtn}
                    onPress={() => { dismissReadinessTweak(); setShowExecution(false); }}
                    accessibilityRole="button"
                    accessibilityLabel={`${readinessRestoreLabel}. Applies to the whole session.`}
                  >
                    <Ionicons name="arrow-undo-outline" size={15} color={colors.primary} />
                    <Text style={styles.adjustedRevertText}>{readinessRestoreLabel}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <Text style={styles.infoNotesLabel}>How to do it</Text>
              <Text style={styles.infoNotes}>
                {routineExercise?.notes || FORM_TIPS[exercise?.name] || exercise?.notes || 'No coaching notes yet for this exercise.\n\nIf you\'re not sure how much weight to use, start light. Pick something you could comfortably lift 15 to 20 times. Getting comfortable with the movement matters more than the weight, especially early on.\n\nFocus on controlled movement, feel the target muscle working, and stop a couple of reps before you truly cannot do any more.'}
              </Text>
            </WorkoutSheetScroll>
          </View>
            </View>
          ) : null}
        </Modal>

        {/* Exercise Swap Modal */}
        <Modal visible={showSwapModal} animationType="slide" onRequestClose={() => setShowSwapModal(false)}>
          {showSwapModal ? (
            <>
          {/* Nested provider: a core RN <Modal> presents in its own window on
              iOS and would otherwise read top:0, jamming the swap list against
              the status bar / Dynamic Island. */}
          <SafeAreaProvider>
          <SafeAreaView style={styles.swapSafe} edges={['top', 'bottom']}>
            <View style={styles.swapHeader}>
              <Text style={styles.swapTitle}>Swap exercise</Text>
              <TouchableOpacity onPress={() => setShowSwapModal(false)} accessibilityRole="button" accessibilityLabel="Close swap">
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.swapSubtitle}>
              Replacing: <Text style={{ color: colors.primary }}>{exercise?.name}</Text>
            </Text>
            <Text style={styles.swapNote}>This changes this workout only. Your plan stays the same.</Text>
            <FlashList
              data={swapCandidates}
              keyExtractor={item => item.exercise.id}
              contentContainerStyle={{ padding: spacing.lg }}
              ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.swapItem} onPress={() => handleConfirmSwap(item.exercise)} accessibilityRole="button" accessibilityLabel={`Swap in ${item.exercise.name}`}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.swapItemName}>{item.exercise.name}</Text>
                    <Text style={styles.swapItemReason}>{item.reason}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl }}>
                  No close matches yet.
                </Text>
              }
              ListFooterComponent={
                // Escape hatch from the ranked suggestions: search the whole
                // library or add your own. Always present, so it works whether
                // or not there were candidates.
                <TouchableOpacity
                  style={styles.swapBrowseBtn}
                  onPress={() => {
                    setShowSwapModal(false);
                    setPickerMode('swap');
                    setShowExercisePicker(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Search all exercises or add your own"
                >
                  <Ionicons name="search" size={18} color={colors.primary} />
                  <Text style={styles.swapBrowseText}>Search all exercises or add your own</Text>
                </TouchableOpacity>
              }
            />
          </SafeAreaView>
          </SafeAreaProvider>
            </>
          ) : null}
        </Modal>
        {/* Discard Workout Modal */}
        <Modal visible={showDiscardModal} transparent animationType="fade" onRequestClose={() => setShowDiscardModal(false)}>
          {showDiscardModal ? (
          <View style={styles.discardOverlay}>
            <View style={styles.discardSheet}>
              <Text style={styles.discardTitle}>Discard workout?</Text>
              <Text style={styles.discardBody}>
                This will delete the current workout session. Your plan will not advance.
              </Text>
              <TouchableOpacity style={styles.keepTrainingBtn} onPress={() => setShowDiscardModal(false)} accessibilityRole="button" accessibilityLabel="Keep training">
                <Text style={styles.keepTrainingBtnText}>Keep Training</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.discardConfirmBtn}
                accessibilityRole="button"
                accessibilityLabel="Discard workout"
                onPress={async () => {
                  const discardId = activeWorkout?.id;
                  endWorkout();
                  navigation.goBack();
                  if (discardId) {
                    try { await deleteIncompleteWorkout(discardId); }
                    catch (e) { logError('ActiveWorkoutScreen.discardModal', e, { workoutId: discardId }); }
                  }
                }}
              >
                <Text style={styles.discardConfirmBtnText}>Discard workout</Text>
              </TouchableOpacity>
            </View>
          </View>
          ) : null}
        </Modal>

        {/* Edit / delete logged set sheet. Mirrors the discard/stale modal
            chrome (transparent fade overlay + centred sheet). Hosts the same
            SetEntry component used to log the set, so every exercise type
            (weight_reps / weighted_bodyweight / reps_only / duration /
            distance) renders the correct inputs. */}
        <Modal
          visible={editingSet != null}
          transparent
          animationType="fade"
          onRequestClose={() => { setEditingSet(null); setEditValue(null); }}
        >
          {editingSet != null ? (
          <View style={styles.editSetOverlay}>
            <View style={styles.editSetSheet}>
              <Text style={styles.editSetTitle}>Edit set</Text>
              {editValue && (
                <SetEntry
                  value={editValue}
                  onChange={setEditValue}
                  units={units}
                  isWarmup={editValue.setType === 'warmup'}
                  exerciseType={activeExerciseType}
                  weightStepKg={exercise?.incrementKg || exercise?.increment_kg || 2.5}
                />
              )}
              <TouchableOpacity
                style={[styles.editSetSaveBtn, saving && styles.btnDisabled]}
                onPress={handleSaveEditedSet}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel="Save set changes"
              >
                <Text style={styles.editSetSaveText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editSetCancelBtn}
                onPress={() => { setEditingSet(null); setEditValue(null); }}
                accessibilityRole="button"
                accessibilityLabel="Cancel editing set"
              >
                <Text style={styles.editSetCancelText}>Cancel</Text>
              </TouchableOpacity>
              <View style={styles.editSetDivider} />
              <TouchableOpacity
                style={styles.editSetDeleteBtn}
                onPress={handleDeleteEditedSet}
                accessibilityRole="button"
                accessibilityLabel="Delete set"
              >
                <Ionicons name="trash-outline" size={16} color={colors.error} />
                <Text style={styles.editSetDeleteText}>Delete set</Text>
              </TouchableOpacity>
            </View>
          </View>
          ) : null}
        </Modal>


      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function EmptyExerciseView({ onAdd, onFinish, onCancel, elapsed, workoutExercises, setCurrentExerciseIndex, currentExerciseIndex }) {
  return (
    <View style={styles.emptyView}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.headerTapTarget} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Cancel workout">
          <Ionicons name="close" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.timerText}>{elapsed}</Text>
        <TouchableOpacity onPress={onFinish} style={[styles.headerTapTarget, styles.headerFinishButton]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Finish workout">
          <Ionicons name="checkmark-done" size={15} color={colors.textPrimary} />
          <Text style={styles.headerFinishText}>Finish</Text>
        </TouchableOpacity>
      </View>

      {workoutExercises.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.exerciseNav} contentContainerStyle={styles.exerciseNavContent}>
          {workoutExercises.map((entry, i) => (
            <TouchableOpacity key={i} style={[styles.navTab, i === currentExerciseIndex && styles.navTabActive]} onPress={() => setCurrentExerciseIndex(i)} accessibilityRole="button" accessibilityState={{ selected: i === currentExerciseIndex }} accessibilityLabel={entry.exercise?.name || `Exercise ${i + 1}`}>
              <Text style={[styles.navTabText, i === currentExerciseIndex && styles.navTabTextActive]} numberOfLines={1} ellipsizeMode="tail">
                {entry.exercise?.name}
              </Text>
              {entry.sets?.length > 0 && <View style={styles.navTabBadge}><Text style={styles.navTabBadgeText} maxFontSizeMultiplier={1.3}>{entry.sets.length}</Text></View>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.emptyContent}>
        <Ionicons name="barbell-outline" size={64} color={colors.surface3} />
        <Text style={styles.emptyTitle}>Add your first exercise</Text>
        <Text style={styles.emptySubtitle}>Search the exercise library to get started</Text>
        <TouchableOpacity style={styles.addFirstBtn} onPress={onAdd} accessibilityRole="button" accessibilityLabel="Add exercise">
          <Ionicons name="add" size={22} color={colors.onPrimary} />
          <Text style={styles.addFirstBtnText}>Add exercise</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerSide: { width: 88, alignItems: 'flex-start', justifyContent: 'center' },
  // CL-6.2: a real 44pt frame under the top-corner controls (plus hitSlop);
  // purely transparent, no visual change.
  headerTapTarget: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  headerSideRight: { width: 88, alignItems: 'flex-end', justifyContent: 'center' },
  headerFinishButton: {
    flexDirection: 'row',
    gap: spacing.xxs,
    minWidth: 76,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerFinishText: { ...type.label, color: colors.textPrimary, textAlign: 'right' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  timerText: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.primary, fontVariant: ['tabular-nums'] },
  starterBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    backgroundColor: withAlpha(colors.primary, alpha.ghost),
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  starterBannerText: { ...type.bodySm, flex: 1, color: colors.textSecondary },
  inlineActionPill: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inlineActionPillText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  exerciseNav: { borderBottomWidth: 1, borderBottomColor: colors.border, maxHeight: 52 },
  exerciseNavContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, gap: spacing.sm, alignItems: 'center' },
  navTab: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, backgroundColor: colors.surface2 },
  navTabActive: { backgroundColor: colors.primaryBg },
  navTabText: { ...type.label, color: colors.textSecondary },
  navTabTextActive: { color: colors.primary },
  navTabBadge: { width: 16, height: 16, borderRadius: circle(16), backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  navTabBadgeText: { fontSize: fontSize.micro, fontWeight: fontWeight.black, color: colors.onPrimary },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingTop: spacing.sm, gap: spacing.sm },
  // U-A-1: collapsed "N notes" rail above the set-entry card.
  notesRail: { gap: spacing.xs },
  notesChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    alignSelf: 'flex-start', minHeight: 44,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    backgroundColor: colors.primaryBg, borderRadius: radius.md,
  },
  notesChipText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textSecondary },
  notesExpanded: { gap: spacing.sm },
  exerciseHeader: { gap: spacing.xs },
  exerciseNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  exerciseName: { flex: 1, fontSize: fontSize.lg, lineHeight: 23, fontWeight: fontWeight.black, color: colors.textPrimary },
  swapSafe: { flex: 1, backgroundColor: colors.background },
  swapHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  swapTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary },
  swapSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  swapNote: { ...type.caption, color: colors.textMuted, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  swapItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  swapItemName: { ...type.bodyStrong, color: colors.textPrimary, marginBottom: spacing.xxs },
  swapItemReason: { ...type.caption, color: colors.textMuted, lineHeight: 16 },
  swapBrowseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  swapBrowseText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary },
  targetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 20 },
  targetText: { flex: 1, fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 16, fontWeight: fontWeight.semibold },
  setEntryCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.xs2, borderWidth: 1, borderColor: colors.border, gap: spacing.xxs },
  setEntryCardWarmup: { borderColor: colors.warning, backgroundColor: colors.warningBg || colors.surface },
  // Short amber flash on the card border to ack a successful Log set tap.
  // Border width stays at 1 so the card doesn't shift its 2px layout for the
  // 700 ms flash, just the colour swaps.
  setEntryCardFlash: { borderColor: colors.primary },
  warmupBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  warmupBannerText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.warning, letterSpacing: 0 },
  warmupOneTimeHint: {
    ...type.bodySm, color: colors.textMuted, paddingTop: spacing.xs,
  },
  firstSetHint: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, backgroundColor: colors.primaryBg, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.xs },
  firstSetHintText: { ...type.caption, flex: 1, color: colors.primary, lineHeight: 18 },
  // COMP-001 card header: three lines replace the old chip stack.
  orientationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 2 },
  orientationText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textSecondary },
  beatLine: { alignSelf: 'stretch', minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs, paddingVertical: 0 },
  beatLineLabel: { flex: 1, minWidth: 0, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 18 },
  beatLineValue: { ...type.bodyStrong, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  beatLineGlyph: { ...type.bodyStrong, color: colors.primary },
  beatLineCue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.xs,
    minHeight: 26,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  beatLineCueText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textSecondary },
  coachLine: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs2 },
  coachLineText: { ...type.bodySm, flex: 1, color: colors.primary },
  noteInput: { backgroundColor: colors.surface2, borderRadius: radius.md, padding: spacing.md, fontSize: fontSize.sm, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, minHeight: 60 },
  // Log set is the primary action on this screen, so it reads as a filled
  // amber button with a clear label rather than a tinted outline. Dark label
  // for contrast on amber (white on amber fails WCAG). Warm-ups stay visually
  // secondary via the tinted-outline override below.
  completeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderRadius: radius.md, minHeight: 48, paddingVertical: spacing.sm, backgroundColor: colors.primaryFill },
  btnDisabled: { opacity: 0.5 },
  completeBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.onPrimary, letterSpacing: 0 },
  completeBtnWarmup: { backgroundColor: colors.warningBg || colors.surface, borderWidth: 1, borderColor: colors.warning },
  completeBtnTextWarmup: { color: colors.warning },
  // Text button below the primary CTA (COMP-001): quiet, 44pt target.
  extraSetBtn: { alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  extraSetBtnText: { ...type.label, color: colors.textSecondary },
  // A2: "Log another set" promoted into the old primary slot as an OUTLINE
  // button, full-size so the muscle-memory tap logs a set, but not filled,
  // keeping the bottom bar's CTA the single filled-amber object on screen.
  extraSetBtnPromoted: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, borderRadius: radius.md, minHeight: 48, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: withAlpha(colors.primary, alpha.strong),
    backgroundColor: colors.primaryBg,
  },
  extraSetBtnPromotedText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.primary, letterSpacing: 0 },
  // C3: quiet inline row for the auto-advance countdown, sits under the
  // "Log another set" button so it reads as one calm sentence with a
  // tappable ending, not another banner competing for attention.
  autoAdvanceRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  autoAdvanceRowText: { ...type.caption, color: colors.textMuted },
  autoAdvanceRowDot: { ...type.caption, color: colors.textMuted },
  autoAdvanceRowActionBtn: {
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  autoAdvanceRowAction: { ...type.caption, color: colors.textPrimary, fontWeight: fontWeight.semibold },
  // A2: the pinned action bar. Sits above the home indicator; the scroll's
  // bottom spacer keeps content clear of it.
  bottomBar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  clusterBanner: {
    borderWidth: 1, borderColor: withAlpha(colors.primary, 0.502), borderRadius: radius.lg,
    backgroundColor: colors.primaryBg, padding: spacing.md, gap: spacing.sm, marginBottom: spacing.sm,
  },
  clusterTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.primary, letterSpacing: 0 },
  clusterReps: { ...type.bodyStrong, color: colors.textPrimary },
  clusterInputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  clusterInput: {
    flex: 1, backgroundColor: colors.background, color: colors.textPrimary,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: fontSize.md,
  },
  clusterAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    borderWidth: 1, borderColor: withAlpha(colors.primary, 0.502), borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  clusterAddBtnText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold },
  clusterCancel: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', minHeight: 38, paddingHorizontal: spacing.lg, borderRadius: radius.sm, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  clusterCancelText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  secondaryActions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: spacing.sm, minHeight: 44, borderWidth: 1, borderColor: colors.border },
  actionBtnText: { ...type.label, color: colors.textSecondary },
  overflowBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  overflowOptionRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  supersetChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs,
    backgroundColor: colors.primaryBg, borderRadius: radius.sm,
    marginTop: spacing.xs,
  },
  supersetChipText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.semibold },
  loggedSection: { gap: spacing.xs2 },
  loggedTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted, letterSpacing: 0 },
  loggedSetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs2, minHeight: 36, backgroundColor: colors.surface, borderRadius: radius.xs, paddingVertical: spacing.xxs, paddingHorizontal: spacing.sm, borderWidth: 1, borderColor: colors.border },
  loggedSetRowWarmup: { borderColor: withAlpha(colors.warning, 0.376), backgroundColor: colors.warningBg || colors.surface },
  loggedSetTextWarmup: { color: colors.warning },
  setNumBadge: { width: 22, height: 22, borderRadius: radius.lg, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  setNumText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  loggedSetText: { ...type.bodySm, flex: 1, color: colors.textPrimary, minWidth: 0 },
  loggedEst1RM: { ...type.caption, color: colors.textMuted },
  emptyView: { flex: 1, backgroundColor: colors.background },
  emptyContent: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: spacing.xxxl * 2, gap: spacing.lg, paddingHorizontal: spacing.xxl },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary, textAlign: 'center' },
  emptySubtitle: { ...type.body, color: colors.textSecondary, textAlign: 'center' },
  addFirstBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.lg, paddingHorizontal: spacing.xxl, paddingVertical: spacing.lg, marginTop: spacing.lg },
  addFirstBtnText: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.onPrimary },
  sheetHost: { flex: 1, justifyContent: 'flex-end' },
  sheetOverlay: { flex: 1, backgroundColor: colors.scrim },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: spacing.xl, paddingTop: spacing.md, maxHeight: '92%' },
  sheetHandle: { width: 36, height: 4, borderRadius: radius.hair, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg },
  sheetTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary, marginBottom: spacing.sm },
  sheetExplainer: { ...type.bodySm, color: colors.textSecondary, marginBottom: spacing.lg },
  sheetScroll: { flexShrink: 1, minHeight: 0 },
  sheetScrollBody: { paddingBottom: spacing.xs },
  sheetOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  // B8 gym-basics sheets
  rampBarTag: { ...type.caption, color: colors.textMuted },
  plateInputsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  plateInputGroup: { flex: 1, gap: spacing.xxs },
  plateInputLabel: { ...type.caption, color: colors.textMuted },
  plateInput: { backgroundColor: colors.surface2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary, textAlign: 'center' },
  plateSectionLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted, letterSpacing: 0, marginBottom: spacing.xs },
  plateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  plateDot: { width: 18, height: 18, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
  plateRowText: { ...type.bodyStrong, color: colors.textPrimary },
  plateTotalLine: { ...type.bodySm, color: colors.textSecondary, marginTop: spacing.md },
  sheetOptionText: { flex: 1, gap: spacing.xxs },
  sheetOptionLabel: { ...type.bodyStrong, color: colors.textPrimary },
  sheetOptionLabelActive: { color: colors.primary },
  sheetOptionDesc: { ...type.caption, color: colors.textMuted },
  infoTargetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  infoTarget: { ...type.label, color: colors.primary },
  infoMuscle: { ...type.caption, color: colors.textMuted, marginBottom: spacing.sm },
  infoNotesLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted, letterSpacing: 0, marginBottom: spacing.xs, marginTop: spacing.sm },
  infoNotes: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 22 },
  // COMP-015 "Adjusted today" section in the info sheet
  adjustedSection: {
    backgroundColor: colors.primaryBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: withAlpha(colors.primary, 0.376),
    padding: spacing.md,
    gap: spacing.xs,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  adjustedHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  adjustedTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.primary, letterSpacing: 0 },
  adjustedReason: { ...type.bodySm, color: colors.textPrimary },
  adjustedSignal: { ...type.caption, color: colors.textMuted },
  adjustedRevertBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs, paddingVertical: spacing.xs },
  adjustedRevertText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold },
  targetBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.successBg, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.success },
  targetBannerText: { fontSize: fontSize.sm, color: colors.success, fontWeight: fontWeight.semibold, flex: 1 },
  // Superset heads-up modal
  supOverlay: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  supSheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, paddingBottom: spacing.xxl, borderTopWidth: 1, borderColor: colors.border, gap: spacing.md },
  supIconRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  supTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary },
  supSubtitle: { ...type.bodySm, color: colors.textSecondary },
  supPairCard: { backgroundColor: colors.surface2, borderRadius: radius.md, padding: spacing.md, borderLeftWidth: 3, borderLeftColor: colors.primary, gap: spacing.xs },
  supPairRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  supPairChip: { width: 22, height: 22, borderRadius: circle(22), backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  supPairChipText: { color: colors.onPrimary, fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  supPairName: { ...type.bodyStrong, color: colors.textPrimary, flex: 1 },
  supPairConnector: { width: 2, height: 14, backgroundColor: colors.border, marginLeft: 10 },
  supSteps: { gap: spacing.sm, marginTop: spacing.xs },
  supStep: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  supStepNum: { color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.bold, minWidth: 14 },
  supStepText: { ...type.bodySm, color: colors.textPrimary, flex: 1 },
  supTip: { ...type.caption, color: colors.textMuted, fontStyle: 'italic', marginTop: spacing.xs },
  supPrimaryBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  supPrimaryBtnText: { color: colors.onPrimary, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  supSecondaryRow: { flexDirection: 'row', gap: spacing.sm },
  supSecondaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: 'transparent' },
  supSecondaryBtnText: { ...type.label, color: colors.textSecondary },

  staleOverlay: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  staleSheet: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, width: '100%', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border },
  staleTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary, textAlign: 'center' },
  staleBody: { ...type.bodySm, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.md },
  staleResume: { width: '100%', backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  staleResumeText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.onPrimary },
  staleFinish: { width: '100%', backgroundColor: colors.surface2, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  staleFinishText: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.textPrimary },
  staleDiscard: { width: '100%', paddingVertical: spacing.md, alignItems: 'center' },
  staleDiscardText: { ...type.label, color: colors.error },
  discardOverlay: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  discardSheet: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, width: '100%', gap: spacing.md, borderWidth: 1, borderColor: colors.border },
  discardTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary, textAlign: 'center' },
  discardBody: { ...type.bodySm, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xs },
  keepTrainingBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md + 2, alignItems: 'center' },
  keepTrainingBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.onPrimary },
  discardConfirmBtn: { alignItems: 'center', paddingVertical: spacing.md },
  discardConfirmBtnText: { ...type.label, color: colors.error },
  editSetOverlay: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  editSetSheet: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, width: '100%', gap: spacing.md, borderWidth: 1, borderColor: colors.border },
  editSetTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary, textAlign: 'center' },
  editSetSaveBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md + 2, alignItems: 'center' },
  editSetSaveText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.onPrimary },
  editSetCancelBtn: { alignItems: 'center', paddingVertical: spacing.md },
  editSetCancelText: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.textSecondary },
  editSetDivider: { height: 1, backgroundColor: colors.border },
  editSetDeleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  editSetDeleteText: { ...type.label, color: colors.error },
  nextTimeBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: colors.primaryBg,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: withAlpha(colors.primary, 0.251),
  },
  nextTimeBannerText: {
    ...type.bodySm,
    flex: 1,
    color: colors.textPrimary,
  },
  deloadBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.warningBg,
    borderRadius: radius.md, marginHorizontal: spacing.lg, marginBottom: spacing.sm,
    padding: spacing.md, borderWidth: 1, borderColor: colors.warning,
  },
  deloadBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  deloadBannerTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.warning },
  deloadBannerSub: { ...type.caption, color: colors.textMuted },
});
