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

import { colors, fontSize, fontWeight, spacing, radius, withAlpha, alpha, type, circle, motion, iconSize } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import { workoutLoggerSize } from '../styles/layout';
import SetEntry from '../components/SetEntry';
import RestTimer from '../components/RestTimer';
import AnimatedRow from '../components/AnimatedRow';
import ExercisePickerModal from '../components/ExercisePickerModal';
import BottomSheet from '../components/BottomSheet';
import DragReorderList from '../components/DragReorderList';
import { useDragAutoScrollBridge } from '../components/DragReorderList';
import Button from '../components/Button';
import Card from '../components/Card';
// D43 S1 (docs/ux-world-class-audit-2026-07-09/D43-LOGGER-REDESIGN-BLUEPRINT.md
// section 5): LoggedSetRow and EmptyExerciseView extracted verbatim into
// src/components/workout/. `export { LoggedSetRow }` below keeps existing
// imports of it from this screen working.
import { LoggedSetRow } from '../components/workout/LoggedSetRow';
import EmptyExerciseView from '../components/workout/EmptyExerciseView';
// D43 S1 slice 2: DiscardWorkoutModal, StaleWorkoutModal and
// EditLoggedSetModal extracted verbatim into src/components/workout/ (see
// each file's own header comment). None was ever exported from this screen
// (all three were inline JSX, not named components), so there is no
// re-export to keep -- the imports below are the only call sites.
import DiscardWorkoutModal from '../components/workout/DiscardWorkoutModal';
import StaleWorkoutModal from '../components/workout/StaleWorkoutModal';
import EditLoggedSetModal from '../components/workout/EditLoggedSetModal';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { getAllCompletedSetsForExercise, createWorkoutSet, updateWorkout, deleteIncompleteWorkout, getAllExercises, getCurrentMesocycleWeek, getWeek1SetsForExercise, getLastNWorkoutSets, getNextTimeNotes, markNoteShown, getWorkoutSetsForWorkout, updateWorkoutSet, deleteWorkoutSet } from '../lib/database';
import { enqueueSyncOp } from '../lib/syncQueue';
import { logError } from '../lib/errorLog';
import { audit } from '../lib/observability';
import { swapAdjacentBlocks } from '../lib/reorder';
import {
  detectPR,
  bestPRPerExercise,
  computeSetTargets,
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
  shouldConfirmBeforeFinish,
} from '../lib/workoutHelpers';
import {
  formatPerSide, loadUnilateralExercises, setUnilateralExercise,
  loadUnilateralAsked, markUnilateralAsked,
  lowerSideReps, perSideRestPlan, halfRestSeconds,
} from '../lib/unilateral';
import { FORM_TIPS } from '../lib/formTips';
import { GLOSSARY } from '../lib/coachGlossary';
import { applyTimeCrunch } from '../lib/mesocycle';
import { getTimeCrunchMessage, getStarterSessionMessage } from '../lib/whyThisTemplates';
import { getReadinessTweak, applyReadinessToSets, applyReadinessToTargets } from '../lib/sessionAdjustments';
import { DEFAULT_BAR_KG } from '../lib/plateMath';
import { warmupRamp } from '../lib/warmupRamp';
import { shareSessionName } from '../lib/sessionShareData';

const DEFAULT_SET = { weight: '', reps: 8, setType: 'straight', notes: '', rir: 2 };

// Founder fix (2026-07-10): "the next exercise button ... doesn't always
// happen, it goes on and adds more and more sets". Root cause: targetSets
// below used to be adjustedSetCount ALONE, which resolves to undefined
// whenever the current slot has no routineExercise row at all - a blank/
// freeform workout (HomeScreen "Just want to log? Start a blank workout",
// startWorkout(workout, [])) and ANY exercise added mid-session via the "+
// Add exercise" picker (handlePickerSelect -> addExerciseToWorkout(ex), which
// defaults its second arg to null in useAppStore.js) both land here.
// `undefined && workingLogged >= undefined` is always falsy, so
// targetComplete never becomes true and the target-reached bottom-bar swap
// (Next exercise / Finish workout) never fires for these slots - the entry
// card just keeps offering "Log set" forever, matching the founder's report.
// Fallback, in order: the session-adjusted target -> the routine row's own
// recommendedSets (defensive; already folded into the first) -> this
// constant, only when the slot truly has no plan data at all. 3 is not a new
// number: it is the exact fallback this file already uses when displaying a
// target with a missing recommendedSets (see the "Target: N sets" line and
// the info-sheet target line further down), so a freeform/ad-hoc exercise
// now gets the same target-reached behaviour, not a silently different one.
const DEFAULT_FREEFORM_TARGET_SETS = 3;

// D9 (docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md): the
// full unilateral (per-side) walkthrough - modelled on the superset
// heads-up below - shows only the very first time it is ever suggested,
// same '@volyume_seen_*' once-ever convention as '@volyume_seen_workout_info'
// just below and DiaryScreen's hints.
const UNILATERAL_WALKTHROUGH_SEEN_KEY = '@volyume_seen_unilateral_walkthrough';

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

// Barbell test for the warm-up ramp's empty-bar row, same custom-spelling
// caveat as above ('barbell' seeded, 'Barbell' custom).
const BARBELL_EQUIPMENT = /barbell/i;



const SET_TYPE_OPTIONS = [
  { value: 'straight', label: 'Working', description: 'Counts towards your weekly totals and progress tracking.' },
  { value: 'warmup', label: 'Warm-up', description: 'Lighter sets before your main work. Not counted in your weekly totals.' },
  { value: 'dropset', label: 'Drop set', description: 'Reduce the weight at failure and keep going. Counts towards weekly volume, not the set-target counter.' },
  { value: 'myo_reps', label: 'Myo-reps', description: 'A heavy activation set, then short mini-sets with a few breaths between. Counts towards volume and progress.' },
  { value: 'rest_pause', label: 'Rest-pause', description: 'Hit failure, rest 10 to 20 seconds, then squeeze out more reps. Counts towards volume and progress.' },
  { value: 'amrap', label: 'AMRAP', description: 'As many reps as possible, usually the last set. Counts towards volume and progress.' },
];


// D35: scrollRef/onScroll/onContentSizeChange are optional and undefined
// for every sheet except the reorder sheet below -- they come straight
// from that sheet's useDragAutoScrollBridge() call and are otherwise a
// no-op (RN ignores undefined ref/onScroll/onContentSizeChange props), so
// every other WorkoutBottomSheet caller keeps today's plain-ScrollView
// behaviour byte for byte.
function WorkoutSheetScroll({ children, scrollRef, onScroll, onContentSizeChange }) {
  return (
    <ScrollView
      ref={scrollRef}
      onScroll={onScroll}
      onContentSizeChange={onContentSizeChange}
      scrollEventThrottle={onScroll ? 16 : undefined}
      style={styles.sheetScroll}
      contentContainerStyle={styles.sheetScrollBody}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

function WorkoutBottomSheet({
  visible, onClose, accessibilityLabel, keyboardAvoiding = false, children,
  scrollRef, onScroll, onContentSizeChange,
}) {
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      keyboardAvoiding={keyboardAvoiding}
      accessibilityLabel={accessibilityLabel}
    >
      <WorkoutSheetScroll scrollRef={scrollRef} onScroll={onScroll} onContentSizeChange={onContentSizeChange}>
        {children}
      </WorkoutSheetScroll>
    </BottomSheet>
  );
}

// Returns the set to use as the rep-progression anchor.
// If the same-indexed set was lighter than the session best, anchor to the best set
// so the pre-fill targets beating the overall high-water mark, not just that slot's history.
// getBestAnchorSet + countProgressSets live in src/lib/workoutHelpers.js
// (COMP-001) so the screen, Live Activity and watch companion share the same
// counting + anchoring rules, and the rules are unit-tested off the screen.

// D43 S1: LoggedSetRow moved to src/components/workout/LoggedSetRow.js
// (imported above). Re-exported here so existing `import { LoggedSetRow }
// from '.../ActiveWorkoutScreen'` call sites keep working unchanged.
export { LoggedSetRow };

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

  // CP-10 stage 3 (theming FINAL batch): live theme (src/hooks/useTheme.js).
  // See buildLiveStyles' header comment (defined further down this
  // file, after the frozen `styles` block -- see the comment there for why).
  const t = useTheme();
  const live = buildLiveStyles(t);

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
  // D44: superset/giant-set group-driven focus changes (the alternation jump
  // AND the round-return) previously moved the screen with zero cue - no
  // haptic distinct from the ordinary set-logged tick, no announcement, no
  // visible sign (founder report: "seems to swap exercise when there's still
  // a set to do at times without saying anything"). This transient message
  // drives a brief banner naming the destination exercise, cleared via a
  // tracked timeout the same way logFlash above is.
  const [groupFocusMessage, setGroupFocusMessage] = useState(null);
  const groupFocusTimeoutRef = useRef(null);
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
  // shape: { groupId, memberNames: string[] } | null (2+ members: pair or giant set)
  const [saving, setSaving] = useState(false);
  // Myo-rep / rest-pause cluster in progress. null when not clustering.
  // shape: { setType, weight, reps: [activation, mini1, ...] }
  const [cluster, setCluster] = useState(null);
  const [clusterReps, setClusterReps] = useState('');
  // Exercise IDs the user logs per-side (unilateral). Device-local pref.
  const [unilateralExercises, setUnilateralExercises] = useState(() => new Set());
  // D9: exercise IDs the user has already been asked about (accepted or
  // declined per-side logging), so the one-time suggestion never repeats.
  const [unilateralAsked, setUnilateralAsked] = useState(() => new Set());
  const [unilateralPrefsLoaded, setUnilateralPrefsLoaded] = useState(false);
  // D9: has the full one-time walkthrough (below) ever been shown? A ref,
  // not state - it only decides which suggestion UI to show and doesn't
  // itself need to trigger a re-render.
  const unilateralWalkthroughSeenRef = useRef(false);
  // D9: the current suggestion/walkthrough prompt, or null when hidden.
  // Only set for the FULL walkthrough case (first time ever); the
  // lighter repeat-suggestion for later exercises fires via appAlert
  // directly and never touches this state.
  const [unilateralSuggest, setUnilateralSuggest] = useState(null);
  // D9: per-side (unilateral) two-phase set in progress. null when not
  // active. shape: { setType, weight, leftReps }.
  const [perSide, setPerSide] = useState(null);
  const [perSideReps, setPerSideReps] = useState('');
  const [setTargets, setSetTargets] = useState([]);
  const [targetReason, setTargetReason] = useState(null);
  const [showSetTypePicker, setShowSetTypePicker] = useState(false);
  const [showOverflow, setShowOverflow] = useState(false);
  const [showExecution, setShowExecution] = useState(false);
  // D32 (2026-07-10, campaign item 20): the purpose-built reorder sheet
  // (whole-workout drag), opened from the existing overflow menu. NO in-view
  // drag on this screen -- the single-exercise focus view stays untouched;
  // see the sheet's own render block further down for the rationale.
  const [showReorderSheet, setShowReorderSheet] = useState(false);
  // D35: edge auto-scroll for the reorder sheet's own scroll area
  // (WorkoutSheetScroll's ScrollView, threaded through WorkoutBottomSheet
  // below). Declared unconditionally here alongside showReorderSheet.
  const reorderSheetScroll = useDragAutoScrollBridge();
  // B8 gym basics: the warm-up helper opens ONLY from the exercise overflow menu,
  // pull, never push (the recorded no-auto-suggest decision below stands).
  const [showWarmupRamp, setShowWarmupRamp] = useState(false);
  // The working weight the ramp is built from. Tapping a ramp row
  // overwrites the entry with the warm-up weight, so without this anchor a
  // reopened ramp would recompute from the WARM-UP weight and collapse
  // ("no ramp needed"), losing the typed working weight entirely on a
  // first-time exercise (Wave 4 review finding). Anchored on first open
  // while the entry holds a working (non-warm-up) weight; cleared on
  // exercise change and whenever the entry shows a working weight again.
  const rampAnchorRef = useRef(null);
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
  // D32 (2026-07-10, campaign item 20): workoutExercises entries carry no
  // stable id of their own (a routineExercise-less ad-hoc add has none), so
  // the reorder sheet's DragReorderList needs SOME per-entry key. Object
  // identity is stable across a reorder (the array is only ever reshuffled,
  // never cloned per-entry, except where an entry is genuinely replaced --
  // e.g. a swap -- which correctly earns a fresh key). A WeakMap lazily
  // assigns one string id per entry object the first time it's seen.
  const workoutExerciseKeysRef = useRef(new WeakMap());
  const workoutExerciseKeySeqRef = useRef(0);
  function keyForWorkoutExercise(entry) {
    const map = workoutExerciseKeysRef.current;
    if (!map.has(entry)) {
      workoutExerciseKeySeqRef.current += 1;
      map.set(entry, `wx-${workoutExerciseKeySeqRef.current}`);
    }
    return map.get(entry);
  }

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
  // "Last" means no exercise AFTER this one still counts: handleNextExercise
  // skips _timeCrunchSkipped slots, so a trailing time-crunched exercise must
  // not make the second-to-last slot offer a Next button that would no-op --
  // it gets the Finish offer instead (product ruling 2026-07-10, closing the
  // gap the next-exercise landing surfaced).
  const isLastExercise = !workoutExercises.some(
    (entry, i) => i > currentExerciseIndex && !entry?._timeCrunchSkipped,
  );

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

  // Superset / giant-set grouping: entries sharing a supersetGroupId are one
  // unit. A pair is the two-member case; a giant set (campaign item 21) has 3+.
  const currentSGI = workoutExercises[currentExerciseIndex]?.supersetGroupId ?? null;
  const nextSGI = workoutExercises[currentExerciseIndex + 1]?.supersetGroupId ?? null;
  const isPairedWithNext = currentSGI != null && currentSGI === nextSGI;
  // Every member of the current group, in session order (for the heads-up).
  const groupMemberNames = currentSGI != null
    ? workoutExercises.filter(e => e.supersetGroupId === currentSGI).map(e => e.exercise?.name ?? '')
    : [];
  // The OTHER members (all of them, for a giant set), in session order.
  const partnerNames = currentSGI != null
    ? workoutExercises
        .filter((e, i) => i !== currentExerciseIndex && e.supersetGroupId === currentSGI)
        .map(e => e.exercise?.name ?? '')
        .filter(Boolean)
    : [];
  // First partner: kept for the truthiness gates that guard the chip/modal.
  const pairedExerciseName = partnerNames[0] ?? '';
  // British-English list join ("A", "A and B", "A, B and C"), no Oxford comma.
  const partnerNamesText = partnerNames.length <= 1
    ? (partnerNames[0] ?? '')
    : `${partnerNames.slice(0, -1).join(', ')} and ${partnerNames[partnerNames.length - 1]}`;

  // L07-F9 (design-usability-audit-2026-07-09): in-session drag-reorder was
  // missing, only the nav-strip's tap-to-jump existed. Reusing the existing
  // no-new-dependency reorder pattern (RoutineDetailScreen.js's
  // handleMoveExercise: swap-adjacent-and-persist, no PanResponder/library).
  // Supersets pair two ADJACENT entries sharing a supersetGroupId
  // (isPairedWithNext above); moving either half would separate them from
  // that adjacency assumption, so a move is blocked whenever the current
  // exercise or its swap target is part of a pair.
  const prevSGI = currentExerciseIndex > 0 ? (workoutExercises[currentExerciseIndex - 1]?.supersetGroupId ?? null) : null;
  const canMoveUp = currentExerciseIndex > 0 && currentSGI == null && prevSGI == null;
  const canMoveDown = currentExerciseIndex < workoutExercises.length - 1 && currentSGI == null && nextSGI == null;

  // C3: the one place that clears the auto-advance ref, so its "armed" state
  // (drives the "Stay here" row) never drifts from the timer it describes.
  function cancelAutoAdvance() {
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
    setAutoAdvanceArmed(false);
  }

  // D44: the cue for a group-driven focus change (the forward alternation
  // jump in handleCompleteSet AND the round-return it now performs). Mirrors
  // the "Set N logged" announcement pattern (~1540) plus a haptic distinct
  // from the ordinary set-logged tick (selection(), not the impact used for
  // setLogged), plus a brief visible banner naming the destination so a
  // sighted user isn't just silently relocated. Copy is lead-reviewed voice
  // (calm, plain, no exclamation, British English): "Superset: now X" /
  // "Giant set: now X", matching the existing "Superset coming up" /
  // "Giant set coming up" 2-vs-3+ split used by the pre-set heads-up modal.
  function announceGroupFocusChange(destIdx, sgi) {
    const destName = workoutExercises[destIdx]?.exercise?.name ?? '';
    const groupSize = workoutExercises.filter(e => e.supersetGroupId === sgi).length;
    const groupLabel = groupSize > 2 ? 'Giant set' : 'Superset';
    const message = `${groupLabel}: now ${destName}`;
    hapticsVocab.selection();
    try {
      AccessibilityInfo.announceForAccessibility(message);
    } catch (_) { /* announcement is best-effort */ }
    if (groupFocusTimeoutRef.current) clearTimeout(groupFocusTimeoutRef.current);
    setGroupFocusMessage(message);
    groupFocusTimeoutRef.current = setTimeout(() => setGroupFocusMessage(null), 2500);
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
      // Unlink the whole group: clear the group id from EVERY member (a pair is
      // just the two-member case). Coherent for a giant set of 3+ - it never
      // leaves an orphaned lone member still carrying the group id.
      const gid = currentSGI;
      for (let i = 0; i < updated.length; i++) {
        if (updated[i].supersetGroupId === gid) {
          updated[i] = { ...updated[i], supersetGroupId: null };
        }
      }
    } else {
      // Link the current exercise with the next. If either is already in a
      // group, the other JOINS that group (growing a pair into a giant set);
      // otherwise a fresh group id links the two. A string id matches the
      // builder/engine scheme, so a mixed session never produces a NaN id.
      const nextIdx = currentExerciseIndex + 1;
      const curGid = updated[currentExerciseIndex].supersetGroupId;
      const nextGid = updated[nextIdx]?.supersetGroupId;
      const gid = curGid || nextGid || `ss-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      updated[currentExerciseIndex] = { ...updated[currentExerciseIndex], supersetGroupId: gid };
      updated[nextIdx] = { ...updated[nextIdx], supersetGroupId: gid };
    }
    useAppStore.getState().setWorkoutExercises(updated);
    hapticsVocab.selection();
  }

  // L07-F9: move the current exercise one slot earlier/later in the session.
  // Same swap-adjacent-and-persist pattern as RoutineDetailScreen's
  // handleMoveExercise, adapted for the single-exercise-focus view here: the
  // in-memory workoutExercises array is the order of record for a session
  // (nav-strip order, finish-summary order), and setWorkoutExercises already
  // persists it via the same crash-recovery snapshot every other
  // order-affecting action (add/remove exercise) uses.
  function handleMoveExercise(direction) {
    const swapIndex = direction === 'up' ? currentExerciseIndex - 1 : currentExerciseIndex + 1;
    if (swapIndex < 0 || swapIndex >= workoutExercises.length) return;
    if (currentSGI != null || (workoutExercises[swapIndex]?.supersetGroupId ?? null) != null) return;
    audit('workout.exercise.reordered', { fromIndex: currentExerciseIndex, toIndex: swapIndex });
    const updated = [...workoutExercises];
    const temp = updated[currentExerciseIndex];
    updated[currentExerciseIndex] = updated[swapIndex];
    updated[swapIndex] = temp;
    useAppStore.getState().setWorkoutExercises(updated);
    setCurrentExerciseIndex(swapIndex);
    hapticsVocab.selection();
  }

  // D32 (2026-07-10, campaign item 20): the purpose-built reorder SHEET's
  // own accessible move path (chevrons inside the sheet, same shape the
  // sheet's drag rows use) -- distinct from handleMoveExercise above, which
  // stays untouched and still only moves the CURRENT exercise one step from
  // the main view's overflow menu. This one is block-aware (a superset/
  // giant-set group in the sheet's whole-workout list moves as a unit,
  // src/lib/reorder.js) and can move ANY row in the sheet, not just the one
  // currently focused. Persists through the SAME setWorkoutExercises path
  // (see handleReorderWorkoutExercises below) and keeps currentExerciseIndex
  // pointing at the same exercise.
  function handleSheetMoveExercise(index, direction) {
    const updated = swapAdjacentBlocks(workoutExercises, index, direction, (e) => e.supersetGroupId ?? null);
    if (updated === workoutExercises) return;
    const movedEntry = workoutExercises[currentExerciseIndex];
    useAppStore.getState().setWorkoutExercises(updated);
    const newIndex = updated.indexOf(movedEntry);
    if (newIndex !== -1 && newIndex !== currentExerciseIndex) setCurrentExerciseIndex(newIndex);
    hapticsVocab.selection();
  }

  // D32: the reorder sheet's drag path. DragReorderList already fires the
  // pickup/drop haptics itself. Persists through the SAME
  // setWorkoutExercises -> _persistActiveWorkout flow every other order-
  // affecting action here uses (add/remove/move/pair exercise); sets on
  // every entry are untouched (order metadata only), and
  // currentExerciseIndex is re-pointed at whichever array slot the exercise
  // the user was actually on ends up in, so the main view never jumps to a
  // different exercise underneath them after closing the sheet.
  function handleReorderWorkoutExercises(nextExercises) {
    const movedEntry = workoutExercises[currentExerciseIndex];
    useAppStore.getState().setWorkoutExercises(nextExercises);
    const newIndex = nextExercises.indexOf(movedEntry);
    if (newIndex !== -1 && newIndex !== currentExerciseIndex) setCurrentExerciseIndex(newIndex);
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
    cancelAutoAdvance();
    setSwapCandidates([]);
    setShowSwapModal(false);
    setPrevSets([]);
    setAllTimeSets([]);
    setLoggedSets([]);
    setCurrentSet({
      ...DEFAULT_SET,
      reps: newRepMax || DEFAULT_SET.reps,
    });
    setGhostSet(null);
    setCluster(null);
    setClusterReps('');
    setPerSide(null);
    setPerSideReps('');
    setExtraSetArmed(false);
    setNoteText('');
    setShowNoteInput(false);
    setNotesExpanded(false);
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

  function openAddExercisePicker() {
    setPickerMode('add');
    setShowExercisePicker(true);
  }

  // L07-F10: whether the CURRENT exercise has real unsaved work sitting in
  // the entry that a Cancel/Finish tap would silently drop -- a typed-but-
  // not-yet-logged set, a cluster mid-way through its mini-sets, or an
  // unsaved note. Shared by handleCancelWorkout (widens its confirm gate)
  // and handleFinishWorkout (names the set in its existing confirm copy).
  function hasInProgressSetEntry() {
    return !!cluster
      || !!perSide
      || (currentSet.weight !== '' && currentSet.weight != null)
      || currentSet.reps !== DEFAULT_SET.reps
      || noteText.trim().length > 0;
  }

  function handleCancelWorkout() {
    const store = useAppStore.getState();
    const totalSets = store.workoutExercises.reduce((sum, e) => sum + (e.sets?.length ?? 0), 0);
    // A genuinely empty session (no logged sets AND nothing typed/in-
    // progress) can discard silently, one tap, no dialog. But a typed-not-
    // yet-logged set, an in-progress cluster, or an unsaved note is real
    // unsaved work the old totalSets===0 check discarded with zero
    // confirmation, so widen the gate to cover it with the same calm
    // discard-confirm the app already uses once any set is logged.
    if (totalSets === 0 && !hasInProgressSetEntry()) {
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

  // D9: load the per-exercise "log per side" preferences once - which
  // exercises are ON, which have already been asked about (so the
  // suggestion never repeats), and whether the one-time walkthrough has
  // ever been shown. All three gate the suggestion effect below, so it
  // waits for this load rather than firing optimistically and asking twice.
  useEffect(() => {
    let active = true;
    Promise.all([
      loadUnilateralExercises(),
      loadUnilateralAsked(),
      AsyncStorage.getItem(UNILATERAL_WALKTHROUGH_SEEN_KEY).catch(() => null),
    ]).then(([on, asked, seen]) => {
      if (!active) return;
      setUnilateralExercises(on);
      setUnilateralAsked(asked);
      unilateralWalkthroughSeenRef.current = seen === 'true';
      setUnilateralPrefsLoaded(true);
    }).catch(() => { if (active) setUnilateralPrefsLoaded(true); });
    return () => { active = false; };
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
  // group we haven't already shown the modal for in this workout, surface a
  // clear instructional sheet so a first-timer isn't lost. Shown once per
  // group id per workout, dismissing acknowledges; unlinking removes the
  // whole group; swap opens the swap UI for the current exercise. Works for a
  // pair (two members) or a giant set (3+).
  useEffect(() => {
    if (currentSGI == null) return;
    if (acknowledgedSupersetsRef.current.has(currentSGI)) return;
    if (!pairedExerciseName) return; // safety
    // Tag as acknowledged immediately so navigating away+back doesn't re-fire
    // before the user dismisses.
    acknowledgedSupersetsRef.current.add(currentSGI);
    setSupersetHeadsUp({
      groupId: currentSGI,
      // Every member in session order (a pair is just two; a giant set 3+).
      memberNames: groupMemberNames.length ? groupMemberNames : [exercise?.name ?? 'this exercise'],
    });
    hapticsVocab.selection();
    // groupMemberNames is derived from currentSGI + workoutExercises and only
    // read once, behind the acknowledged-ref gate, so it needn't re-trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSGI, pairedExerciseName, exercise?.name]);

  // D9: metadata-flagged unilateral exercises (exercise.laterality, finally
  // read here - exerciseMetadata.js's deriveLaterality was computed and
  // stored but never consulted before this build, see plan-C-unilateral-
  // logging.md) get a one-time, per-exercise suggestion to log per side.
  // Never forced - bilateral exercises never see this, and a unilateral
  // exercise only ever gets asked ONCE (loadUnilateralAsked); the answer
  // sticks per exercise via setUnilateralExercise. The very first time this
  // fires for the user, the suggestion carries the full walkthrough
  // (modelled on the superset heads-up above); every later exercise gets a
  // quick confirm only, since the pattern has already been taught.
  // acknowledgedUnilateralRef tags the exercise id immediately, same guard
  // shape as acknowledgedSupersetsRef above, so navigating away and back
  // doesn't re-fire before the user answers.
  const acknowledgedUnilateralRef = useRef(new Set());
  useEffect(() => {
    if (!unilateralPrefsLoaded || !exercise?.id) return;
    if (exercise.laterality !== 'unilateral') return;
    if (unilateralAsked.has(exercise.id)) return;
    if (acknowledgedUnilateralRef.current.has(exercise.id)) return;
    acknowledgedUnilateralRef.current.add(exercise.id);
    hapticsVocab.selection();
    if (unilateralWalkthroughSeenRef.current) {
      appAlert(
        'Log this one side at a time?',
        `${exercise.name} is usually trained one side at a time. Do one side, then the other; it still counts as one working set.`,
        [
          { text: 'No, log as normal', style: 'cancel', onPress: () => handleUnilateralAnswer(exercise.id, false) },
          { text: 'Yes, log per side', onPress: () => handleUnilateralAnswer(exercise.id, true) },
        ],
      );
    } else {
      setUnilateralSuggest({ exerciseId: exercise.id, exerciseName: exercise.name });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise?.id, exercise?.laterality, exercise?.name, unilateralPrefsLoaded, unilateralAsked]);

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
      // D44: same guard for the group-focus banner reset (finish/cancel
      // within 2.5s of a superset jump would otherwise set state after
      // unmount).
      if (groupFocusTimeoutRef.current) clearTimeout(groupFocusTimeoutRef.current);
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

  // Lock-screen rest-timer "Log set" action. The ±15s / Skip-rest
  // buttons are handled in the notifications listener (they only touch the
  // store), but completing a set runs through the shared in-app path
  // (cluster vs normal handling), so it must fire here on the screen. The
  // action opens the app to the foreground; this listener picks it up and
  // runs handleCompleteSetPress, but ONLY when a rest is actually running,
  // so a stale tap is ignored. handleCompleteSetPressRef keeps the latest
  // closure without re-installing the listener every render.
  const handleCompleteSetPressRef = useRef(null);
  // Tracks whether the current set is still an unconfirmed ghost prefill, so the
  // lock-screen "Log set" action below can refuse to log values the user
  // hasn't actually entered.
  const currentSetGhostRef = useRef(false);
  useEffect(() => {
    // eslint-disable-next-line global-require
    const Notifications = require('expo-notifications');
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response?.notification?.request?.content?.data;
      if (data?.type !== 'rest_timer') return;
      const actionId = response?.actionIdentifier;
      if (actionId === 'add_exercise') {
        // L07-F4: opening the picker is a plain UI action, not a set-logging
        // or rest-math call, so unlike complete_set it doesn't need the
        // active-rest guard below -- adding an exercise still makes sense
        // even if the rest happened to end just before the tap landed. It
        // still requires a live workout so a stale tap on a notification
        // left over from a finished/discarded session is a no-op.
        const stAdd = useAppStore.getState();
        if (!stAdd.activeWorkout?.id) return;
        try { openAddExercisePicker(); } catch (_) { /* never crash on a tap */ }
        return;
      }
      if (actionId !== 'complete_set') return;
      // Active-rest guard: only act on a live, running rest.
      const st = useAppStore.getState();
      if (!st.activeWorkout?.id || !st.restTimerActive) return;
      // Don't blind-log from the lock screen. If the current set is still a
      // ghost (the suggested next-set prefill the user hasn't confirmed),
      // tapping "Log set" would log a set they may not have performed,
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
    setNoteText('');
    setShowNoteInput(false);
    setNotesExpanded(false);
    // An unfinished cluster belongs to the exercise it was started on;
    // abandon it on any exercise change (incl. superset auto-jump) so
    // its banner can't carry stale reps onto the next exercise. A
    // part-way-through per-side set is the same shape of risk.
    setCluster(null);
    setClusterReps('');
    setPerSide(null);
    setPerSideReps('');

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
        // L07-F2: setId tags which logged set earned this PR, so an edit or
        // delete of that exact set (below, handleSaveEditedSet /
        // handleDeleteEditedSet) can correct a now-stale badge without
        // touching detectPR itself.
        setDetectedPRs(prev => bestPRPerExercise([
          ...prev,
          ...prs.map(p => ({ ...p, exerciseId: exercise.id, exerciseName: exercise.name, units, setId: setData.id })),
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
      let sgi = null;
      let pairIdx = -1;
      if (currentSet.setType !== 'warmup') {
        sgi = workoutExercises[currentExerciseIndex]?.supersetGroupId;
        pairIdx = sgi != null
          ? workoutExercises.findIndex((e, i) => i > currentExerciseIndex && e.supersetGroupId === sgi)
          : -1;
        if (pairIdx >= 0) {
          setCurrentExerciseIndex(pairIdx);
          setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 50);
          setNoteText('');
          setShowNoteInput(false);
          setGhostSet(null);
          // D44: cue the jump - previously silent (no haptic distinct from
          // setLogged, no announcement, no visible sign).
          announceGroupFocusChange(pairIdx, sgi);
          return;
        }
      }

      // Start rest timer with per-exercise duration, falling back to the user's
      // global default rest (Hevy teardown R1). Honour the auto-start pref: when
      // off, logging a set no longer kicks off the countdown automatically.
      // D9 amendment 2: a per-side (unilateral) COMPOUND set halves this
      // rest too (finishPerSide already halved the between-sides pause);
      // isolation gets the ordinary full rest here, its rest-class
      // difference is only the between-sides "switch sides" prompt.
      if (autoStartRestTimer) {
        const fullRest = routineExercise?.restSeconds || defaultRestSeconds || 90;
        startRestTimer(overrides.perSideCompound ? halfRestSeconds(fullRest) : fullRest);
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
      } else if (sgi != null && pairIdx < 0) {
        // D44 round-return: this set was the LAST member of its group (no
        // member with a later index shares supersetGroupId, so the forward
        // jump above found nothing and fell through here - the K-1 rest
        // timer just started, unchanged). Nothing used to move focus back to
        // the group's first member for the next round, despite
        // ActiveWorkoutScreen.giantSet.guard.test.js's own comment asserting
        // "next round from A"; the user was silently stranded on the last
        // member. The justHitTarget branch above still wins when this
        // exercise's own set target completed on this same set - the
        // ordinary next-exercise auto-advance is correct once the whole
        // group's prescribed work here is done, so round-return only fires
        // when the round continues.
        const firstIdx = workoutExercises.findIndex(e => e.supersetGroupId === sgi);
        if (firstIdx >= 0 && firstIdx !== currentExerciseIndex) {
          setCurrentExerciseIndex(firstIdx);
          setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 50);
          announceGroupFocusChange(firstIdx, sgi);
        }
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

  // Campaign item 14 (D25): the zeego long-press menu's "Delete set" item
  // reuses this SAME confirm-then-remove flow, not a new one. handleDeleteEditedSet
  // is pinned zero-arg (ActiveWorkoutScreen.prReEval.guard.test.js), and it
  // reads `editingSet` by closure, so it cannot take a target set directly.
  // openDeleteFromMenu opens the edit sheet's state exactly like a row tap
  // (openEditSet) and records which set id it was for; the effect below
  // fires the real, unmodified handleDeleteEditedSet() once editingSet
  // reflects that id, so the user sees the existing "Delete set?" confirm —
  // no new deletion path, no bypassed confirmation.
  const menuDeleteTargetIdRef = useRef(null);
  const openDeleteFromMenu = React.useCallback((set) => {
    menuDeleteTargetIdRef.current = set.id;
    openEditSet(set);
  }, [openEditSet]);
  useEffect(() => {
    if (menuDeleteTargetIdRef.current != null && editingSet && editingSet.id === menuDeleteTargetIdRef.current) {
      menuDeleteTargetIdRef.current = null;
      handleDeleteEditedSet();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingSet]);

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

      // L07-F2: re-run PR detection so an edited-up set can still trigger the
      // celebration, and an edited-DOWN set clears its own now-stale badge.
      // Mirrors the log-time detection above (handleCompleteSet) exactly:
      // history excludes this set's own (pre-edit) sessionSetsRef entry so it
      // can never match itself, detectPR itself is untouched.
      sessionSetsRef.current = sessionSetsRef.current.map(s => (
        s.id === editingSet.id ? { ...s, weight, actualReps } : s
      ));
      if (validation.isWeightReps) {
        const editPrHistory = [
          ...allTimeSets,
          ...sessionSetsRef.current.filter(s => s.exerciseId === exercise.id && s.id !== editingSet.id),
        ];
        const editedPrs = detectPR({ weight, actualReps }, editPrHistory, exercise, units);
        if (editedPrs.length > 0 && editPrHistory.length > 0) {
          showPRCelebration({ ...editedPrs[0], exerciseName: exercise.name });
        }
        setDetectedPRs(prev => {
          const withoutThisSet = prev.filter(p => p.setId !== editingSet.id);
          if (editedPrs.length === 0 || editPrHistory.length === 0) return withoutThisSet;
          return bestPRPerExercise([
            ...withoutThisSet,
            ...editedPrs.map(p => ({ ...p, exerciseId: exercise.id, exerciseName: exercise.name, units, setId: editingSet.id })),
          ]);
        });
      }

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
        'Your edit was not saved. Tap Save to retry. If this keeps happening, tell us from Settings > Help.',
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
              // L07-F2: drop this set from the session PR-detection ref so a
              // later set in the same exercise never compares against a
              // deleted set, and clear any PR badge this exact set earned so
              // it doesn't linger stale for the rest of the session (derived
              // analytics elsewhere recompute correctly from the DB anyway).
              sessionSetsRef.current = sessionSetsRef.current.filter(s => s.id !== target.id);
              setDetectedPRs(prev => prev.filter(p => p.setId !== target.id));
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
  // still start a cluster, a per-side (D9) exercise starts the two-phase
  // per-side flow, and everything else calls handleCompleteSet() directly.
  // Respects the same `saving` guard the button's disabled state enforces, so a
  // double Done cannot double-log. Per-side takes the same precedence over
  // cluster the old minimal design already gave it (an exercise is one or the
  // other, never both); its own second-phase input (below) drives
  // finishPerSide directly, never this shared button, so a truthy `perSide`
  // here is a no-op rather than mis-committing the in-progress pair.
  function handleCompleteSetPress() {
    if (saving) return;
    if (perSide) return;
    const uni = exercise ? unilateralExercises.has(exercise.id) : false;
    if (uni) return startPerSide();
    if (isClusterType(currentSet.setType)) return startCluster();
    return handleCompleteSet();
  }
  // Keep the ref pointed at the latest closure so the rest-notification
  // "Log set" action listener (installed once) always calls current state.
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

  // ─── Per-side (unilateral) sets (D9) ─────────────────────────────────
  // Same two-phase shape as the cluster flow above: side one accumulates
  // locally, a rest-class-governed pause runs (lib/unilateral.js
  // perSideRestPlan - D9 amendment 2), side two is entered, and the pair
  // commits as ONE workout_sets row via the normal handleCompleteSet path -
  // actual_reps is the LOWER side (lowerSideReps), the breakdown rides in
  // notes as "L 10 / R 9" (formatPerSide), exactly as the cluster's
  // breakdown rides in notes (clusterSet.js). No schema change: left_reps/
  // right_reps (migration 054, legacy) stay untouched and unwritten.

  async function handleUnilateralAnswer(exerciseId, turnOn) {
    try {
      const [onSet, askedSet] = await Promise.all([
        setUnilateralExercise(exerciseId, turnOn),
        markUnilateralAsked(exerciseId),
      ]);
      setUnilateralExercises(onSet);
      setUnilateralAsked(askedSet);
    } catch (e) {
      logError('ActiveWorkoutScreen.handleUnilateralAnswer', e, { exerciseId });
    }
  }

  function startPerSide() {
    const leftReps = parseInt(currentSet.reps, 10);
    if (!Number.isFinite(leftReps) || leftReps < 1) {
      appAlert('Enter reps', 'Enter the reps for your first side.');
      return;
    }
    const isBodyweight = /body\s*weight/i.test(exercise?.equipment || '');
    const weightNum = parseFloat(currentSet.weight);
    if (!isBodyweight && (currentSet.weight === '' || currentSet.weight == null || isNaN(weightNum) || weightNum <= 0)) {
      appAlert('Enter weight', `Enter the weight used (in ${units}) before logging your first side.`);
      return;
    }
    setPerSide({
      setType: currentSet.setType,
      weight: currentSet.weight,
      leftReps,
    });
    setPerSideReps('');
    hapticsVocab.setLogged();
    // D9 amendment 2: compound gets a real running rest timer for the
    // between-sides pause (half the exercise's normal rest); isolation gets
    // no timer here at all, betweenSeconds is null and the banner below
    // shows a plain "switch sides" prompt instead.
    const restPlan = perSideRestPlan(exercise?.compoundIsolation, routineExercise?.restSeconds || defaultRestSeconds || 90);
    if (restPlan.betweenSeconds != null) startRestTimer(restPlan.betweenSeconds);
  }

  async function finishPerSide() {
    if (!perSide) return;
    const rightReps = parseInt(perSideReps, 10);
    if (!Number.isFinite(rightReps) || rightReps < 1) {
      appAlert('Enter reps', 'Enter the reps for your other side.');
      return;
    }
    const notes = mergeClusterNote(noteText, formatPerSide(perSide.leftReps, rightReps));
    const actualReps = lowerSideReps(perSide.leftReps, rightReps);
    // perSideCompound tells handleCompleteSet's post-set rest (below) to
    // halve the normal rest too (D9 amendment 2: compound halves EVERY
    // pause, between sides AND after the second side); isolation gets the
    // ordinary full rest there, its rest-class difference is only the
    // between-sides "switch sides" prompt handled in startPerSide above.
    await handleCompleteSet({
      actualReps,
      notes,
      perSideCompound: exercise?.compoundIsolation === 'compound',
    });
    setPerSide(null);
    setPerSideReps('');
  }

  function cancelPerSide() {
    setPerSide(null);
    setPerSideReps('');
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

    // Target: fit remaining in half of a standard session (~25 min max)
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
          // D17: a completed session can shift the habit-derived training-
          // reminder schedule, so refresh it here too. Self-guarding
          // (no-ops until there is enough history) and best-effort; never
          // blocks the finish flow.
          // eslint-disable-next-line global-require
          require('../lib/notifications/trainingHabitSchedule').refreshHabitDerivedTrainingSchedule(uid2).catch(() => {});
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

    async function runFinish() {
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
          'Your sets are still saved, but the workout did not close. Check your connection and tap Finish workout again.',
        );
      }
    }

    // L07-F10: an unconditional confirm on every finish warned even when
    // nothing was at risk. shouldConfirmBeforeFinish (lib/workoutHelpers.js)
    // is the shared, unit-tested rule: it says "warn" only when the session
    // has zero logged sets, or a planned exercise (excluding one Time Crunch
    // consciously dropped via _timeCrunchSkipped) is about to be finished
    // with no sets at all. When every planned exercise already has a set,
    // there is nothing to silently discard, so finish immediately. A typed
    // but unlogged entry still counts as something at risk, so it keeps the
    // confirm even when every exercise is covered.
    if (!shouldConfirmBeforeFinish(snapshotExercises) && !hasInProgressSetEntry()) {
      await runFinish();
      return;
    }

    // Name the unlogged set explicitly so the confirm covers the "unsaved/
    // in-progress" case too, not just the logged-set count.
    const inProgressNote = hasInProgressSetEntry()
      ? ` You also have an unlogged set for ${exercise?.name || 'this exercise'} that will be lost.`
      : '';
    appAlert(
      'Finish workout?',
      `You've logged ${snapshotExercises.reduce((sum, e) => sum + (e.sets?.length ?? 0), 0)} sets across ${snapshotExercises.length} exercises.${inProgressNote}`,
      [
        { text: 'Keep going', style: 'cancel', onPress: () => { finishingRef.current = false; } },
        { text: 'Finish workout', onPress: runFinish },
      ],
    );
  }

  const elapsed = {
    mins: Math.floor(elapsedSeconds / 60),
    secs: elapsedSeconds % 60,
  };
  const elapsedStr = `${elapsed.mins}:${elapsed.secs.toString().padStart(2, '0')}`;

  // COMP-015: session-adjusted working-set target, falling back to the
  // routine row's own recommendedSets (defensive - adjustedSetCount already
  // folds this in when there is no active adjustment), and finally to
  // DEFAULT_FREEFORM_TARGET_SETS so a slot with no routineExercise at all
  // (blank workout, or an exercise added mid-session) still resolves to a
  // real number instead of undefined. See DEFAULT_FREEFORM_TARGET_SETS above
  // for the full root-cause note.
  const targetSets = adjustedSetCount || routineExercise?.recommendedSets || DEFAULT_FREEFORM_TARGET_SETS;
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
  const noteActionLabel = showNoteInput || noteText.trim().length > 0 ? 'Edit note' : 'Add note';

  const handleCurrentSetChange = useCallback((next) => {
    if (!next.isGhost && currentSet.isGhost) setGhostSet(null);
    setCurrentSet(next);
  }, [currentSet.isGhost]);

  if (!exercise) {
    return (
      <SafeAreaView style={[styles.safe, live.safe]}>
        <EmptyExerciseView
          onAdd={openAddExercisePicker}
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
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {/* Header */}
        <View style={[styles.header, live.header]}>
          <View style={styles.headerSide}>
            <TouchableOpacity
              onPress={handleCancelWorkout}
              style={styles.headerTapTarget}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Cancel workout"
            >
              <Ionicons name="close" size={22} color={t.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.headerCenter}>
            <Text maxFontSizeMultiplier={1.3} style={[styles.timerText, live.timerText]}>{elapsedStr}</Text>
            {timeCrunchActive && (
              <Ionicons
                name="timer"
                size={15}
                color={t.colors.warning}
                accessibilityLabel="Time crunch active"
              />
            )}
          </View>
          <View style={styles.headerSideRight}>
            {targetComplete && !extraSetArmed && isLastExercise ? (
              <View style={styles.headerTapTarget} />
            ) : (
              <Button
                title="Finish"
                icon="checkmark-done"
                variant="secondary"
                size="sm"
                fullWidth={false}
                onPress={handleFinishWorkout}
                style={[styles.headerTapTarget, styles.headerFinishButton, live.headerFinishButton]}
                accessibilityLabel="Finish workout"
              />
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
            style={[styles.exerciseNav, live.exerciseNav]}
            contentContainerStyle={styles.exerciseNavContent}
          >
            {workoutExercises.map((entry, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.navTab, live.navTab, i === currentExerciseIndex && [styles.navTabActive, live.navTabActive]]}
                onPress={() => {
                  setCurrentExerciseIndex(i);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                accessibilityRole="button"
                accessibilityLabel={entry.exercise?.name || `Exercise ${i + 1}`}
                accessibilityState={{ selected: i === currentExerciseIndex }}
              >
                <Text maxFontSizeMultiplier={1.3}
                  style={[styles.navTabText, live.navTabText, i === currentExerciseIndex && [styles.navTabTextActive, live.navTabTextActive]]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {entry.exercise?.name}
                </Text>
                {entry.sets?.length > 0 && (
                  <View style={[styles.navTabBadge, live.navTabBadge]}>
                    <Text style={[styles.navTabBadgeText, live.navTabBadgeText]} maxFontSizeMultiplier={1.3}>{entry.sets.length}</Text>
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
              <Text maxFontSizeMultiplier={1.3} style={[styles.exerciseName, live.exerciseName]} numberOfLines={2}>{exercise.name}</Text>
              <TouchableOpacity
                style={[styles.overflowBtn, live.overflowBtn]}
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
                accessibilityLabel="Exercise options"
              >
                <Animated.View style={showInfoTipPulse ? { transform: [{ scale: infoPulseAnim }] } : null}>
                  <Ionicons name="ellipsis-horizontal" size={20} color={t.colors.textSecondary} />
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
                <View key="starter" style={[styles.starterBanner, live.starterBanner]}>
                  <Ionicons name="flash-outline" size={16} color={t.colors.primary} />
                  <Text maxFontSizeMultiplier={1.3} style={[styles.starterBannerText, live.starterBannerText]}>{timeCrunchMsg}</Text>
                  <TouchableOpacity
                    style={[styles.inlineActionPill, live.inlineActionPill]}
                    onPress={handleRevertTimeCrunch}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="Do the full session instead"
                  >
                    <Text maxFontSizeMultiplier={1.3} style={[styles.inlineActionPillText, live.inlineActionPillText]}>Full session</Text>
                  </TouchableOpacity>
                </View>
              );
            }
            if (currentSGI != null && !!pairedExerciseName) {
              notes.push(
                <View key="superset" style={[styles.supersetChip, live.supersetChip]}>
                  <Ionicons name="link" size={11} color={t.colors.primary} />
                  <Text maxFontSizeMultiplier={1.3} style={[styles.supersetChipText, live.supersetChipText]}>
                    Superset - alternates with {partnerNamesText}
                  </Text>
                </View>
              );
            }
            nextTimeNotes.forEach(note => {
              notes.push(
                <View key={`note-${note.id}`} style={[styles.nextTimeBanner, live.nextTimeBanner]}>
                  <Ionicons name="bulb-outline" size={16} color={t.colors.primary} style={{ marginTop: spacing.hair }} />
                  <Text maxFontSizeMultiplier={1.3} style={[styles.nextTimeBannerText, live.nextTimeBannerText]} numberOfLines={4}>{note.note}</Text>
                  <TouchableOpacity
                    style={[styles.inlineActionPill, live.inlineActionPill]}
                    onPress={async () => {
                      try { await markNoteShown(note.id); } catch (_e) {}
                      setNextTimeNotes(prev => prev.filter(n => n.id !== note.id));
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="Dismiss note"
                  >
                    <Text maxFontSizeMultiplier={1.3} style={[styles.inlineActionPillText, live.inlineActionPillText]}>Got it</Text>
                  </TouchableOpacity>
                </View>
              );
            });
            if (isDeloadWeek && !deloadDismissed) {
              notes.push(
                <View key="deload" style={[styles.deloadBanner, live.deloadBanner]}>
                  <View style={styles.deloadBannerLeft}>
                    <Ionicons name="battery-charging-outline" size={18} color={t.colors.warning} />
                    <View>
                      <Text maxFontSizeMultiplier={1.3} style={[styles.deloadBannerTitle, live.deloadBannerTitle]}>Recovery week</Text>
                      <Text maxFontSizeMultiplier={1.3} style={[styles.deloadBannerSub, live.deloadBannerSub]}>Light loads - full recovery - no PRs</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.inlineActionPill, live.inlineActionPill]}
                    onPress={() => setDeloadDismissed(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Dismiss deload banner"
                  >
                    <Text maxFontSizeMultiplier={1.3} style={[styles.inlineActionPillText, live.inlineActionPillText]}>Skip</Text>
                  </TouchableOpacity>
                </View>
              );
            }
            if (targetComplete) {
              notes.push(
                <View key="target-reached" style={[styles.targetBanner, live.targetBanner]}>
                  <Ionicons name="checkmark-circle" size={16} color={t.colors.success} />
                  <Text maxFontSizeMultiplier={1.3} style={[styles.targetBannerText, live.targetBannerText]}>
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
                  style={[styles.notesChip, live.notesChip]}
                  onPress={() => setNotesExpanded(v => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: notesExpanded }}
                  accessibilityLabel={`${noteCount} note${noteCount !== 1 ? 's' : ''}, tap to ${notesExpanded ? 'collapse' : 'expand'}`}
                >
                  <Ionicons name="information-circle-outline" size={16} color={t.colors.textSecondary} />
                  <Text maxFontSizeMultiplier={1.3} style={[styles.notesChipText, live.notesChipText]}>{noteCount} note{noteCount !== 1 ? 's' : ''}</Text>
                  <Ionicons name={notesExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={t.colors.textSecondary} />
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
          <Card
            radius="md"
            padding="none"
            style={[
              styles.setEntryCard,
              currentSet.setType === 'warmup' && [styles.setEntryCardWarmup, live.setEntryCardWarmup],
              logFlash && [styles.setEntryCardFlash, live.setEntryCardFlash],
            ]}
          >
            {/* D44: transient visual sign for a superset/giant-set
                group-driven focus change. The spoken announcement already
                fires in announceGroupFocusChange (this exact message), so
                this row is hidden from the accessibility tree to avoid
                double narration on TalkBack/VoiceOver - it's the visible
                half of the cue, not a second announcement. */}
            {groupFocusMessage && (
              <View
                style={[styles.groupFocusBanner, live.groupFocusBanner]}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <Ionicons name="swap-horizontal" size={16} color={t.colors.primary} />
                <Text maxFontSizeMultiplier={1.3} style={[styles.groupFocusBannerText, live.groupFocusBannerText]}>
                  {groupFocusMessage}
                </Text>
              </View>
            )}
            {currentSet.setType === 'warmup' && (
              <View style={styles.warmupBanner}>
                <Ionicons name="flame-outline" size={14} color={t.colors.warning} />
                <Text maxFontSizeMultiplier={1.3} style={[styles.warmupBannerText, live.warmupBannerText]}>Warm-up - not counted in your totals</Text>
              </View>
            )}
            {currentSet.setType === 'warmup' && !warmupHintSeenRef.current && (
              <Text maxFontSizeMultiplier={1.3} style={[styles.warmupOneTimeHint, live.warmupOneTimeHint]}>
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
              <Text maxFontSizeMultiplier={1.3} style={[styles.orientationText, live.orientationText]}>{orientationLabel}</Text>
              <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
            </TouchableOpacity>

            {/* Target line (U-A-1): the sets/reps prescription, moved off
                the pre-card banner stack into the card header beside the
                orientation/beat lines. */}
            {routineExercise && (
              <View style={styles.targetRow}>
                <Ionicons name="flag-outline" size={12} color={t.colors.textMuted} />
                <Text maxFontSizeMultiplier={1.3} style={[styles.targetText, live.targetText]} numberOfLines={1}>
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
                    <Text maxFontSizeMultiplier={1.3} style={[styles.beatLineLabel, live.beatLineLabel]} numberOfLines={2}>
                      Recovery week - <Text maxFontSizeMultiplier={1.3} style={[styles.beatLineValue, live.beatLineValue]}>{target.weight}{units} x {target.repsMin}</Text>
                    </Text>
                    <View style={[styles.beatLineCue, live.beatLineCue]}>
                      <Ionicons name="arrow-down-circle-outline" size={13} color={t.colors.textSecondary} />
                      <Text maxFontSizeMultiplier={1.3} style={[styles.beatLineCueText, live.beatLineCueText]}>Use</Text>
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
                    <Text maxFontSizeMultiplier={1.3} style={[styles.beatLineLabel, live.beatLineLabel]} numberOfLines={2}>
                      Last: <Text maxFontSizeMultiplier={1.3} style={[styles.beatLineValue, live.beatLineValue]}>{prev.weight}{units} x {prev.actualReps}</Text>
                      {range ? ' - Target ' : ''}
                      {range ? <Text maxFontSizeMultiplier={1.3} style={[styles.beatLineValue, live.beatLineValue]}>{range}</Text> : null}
                      {glyph ? <Text maxFontSizeMultiplier={1.3} style={[styles.beatLineGlyph, live.beatLineGlyph]}> {glyph}</Text> : null}
                    </Text>
                    <View style={[styles.beatLineCue, live.beatLineCue]}>
                      <Ionicons name="arrow-down-circle-outline" size={13} color={t.colors.textSecondary} />
                      <Text maxFontSizeMultiplier={1.3} style={[styles.beatLineCueText, live.beatLineCueText]}>Use</Text>
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
                  <Text maxFontSizeMultiplier={1.3} style={[styles.beatLineLabel, live.beatLineLabel]} numberOfLines={2}>
                    First time - Target <Text maxFontSizeMultiplier={1.3} style={[styles.beatLineValue, live.beatLineValue]}>{range}</Text>
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
                <Ionicons name="pulse-outline" size={13} color={t.colors.primary} style={{ marginTop: spacing.xxs }} />
                <Text maxFontSizeMultiplier={1.3} style={[styles.coachLineText, live.coachLineText]} numberOfLines={2}>
                  {(sessionAdjustment?.show && !readinessDrivesTarget)
                    ? sessionAdjustment.reasonText
                    : readinessLine
                      ? readinessLine
                      : stalledAdvice
                        ? `Same weight 3 sessions running. Try ${stalledAdvice.w0 + 2.5}${units} x ${Math.max(1, stalledAdvice.r0 - 1)}, or stay at ${stalledAdvice.w0}${units} and push for ${stalledAdvice.r0 + 1}.`
                        : targetReason}
                </Text>
                <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} style={{ marginTop: spacing.xxs }} />
              </TouchableOpacity>
            )}
            {showInfoTipPulse && loggedSets.length === 0 && prevSets.length === 0 && (
              <View style={[styles.firstSetHint, live.firstSetHint]}>
                <Ionicons name="information-circle-outline" size={14} color={t.colors.primary} />
                <Text maxFontSizeMultiplier={1.3} style={[styles.firstSetHintText, live.firstSetHintText]}>
                  {/* NV-4 (ux-world-class-audit-2026-07-09/cohesion-02-novice-psychology.md):
                      no baseline "what's a set / what's a rep" explainer existed
                      anywhere. This is the exact gate the audit asked for: the
                      very first exercise card, shown once ever (the seen-flag
                      above turns off for good the moment any set is logged). */}
                  {GLOSSARY.rep} {GLOSSARY.set} {firstSetPrompt} Use exercise options for form tips, warm-ups, swaps and session settings.
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
              <TextInput maxFontSizeMultiplier={1.3}
                style={[styles.noteInput, live.noteInput]}
                value={noteText}
                onChangeText={setNoteText}
                placeholder="Add a note for this set"
                placeholderTextColor={t.colors.textMuted}
                accessibilityLabel="Add a note"
                multiline
                autoFocus
                autoComplete="off"
                textContentType="none"
              />
            ) : null}
          </Card>

          {/* Cluster banner: drives myo-rep / rest-pause mini-sets. */}
          {cluster ? (
            <View style={[styles.clusterBanner, live.clusterBanner]}>
              <Text maxFontSizeMultiplier={1.3} style={[styles.clusterTitle, live.clusterTitle]}>
                {clusterLabel(cluster.setType)} cluster
              </Text>
              <Text maxFontSizeMultiplier={1.3} style={[styles.clusterReps, live.clusterReps]}>
                {cluster.reps.join(' + ')} = {cluster.reps.reduce((a, n) => a + n, 0)} reps
                {cluster.weight ? ` @ ${cluster.weight}${units}` : ''}
              </Text>
              <View style={styles.clusterInputRow}>
                <TextInput maxFontSizeMultiplier={1.3}
                  style={[styles.clusterInput, live.clusterInput]}
                  value={clusterReps}
                  onChangeText={setClusterReps}
                  placeholder="Mini-set reps"
                  placeholderTextColor={t.colors.textMuted}
                  accessibilityLabel="Mini-set reps"
                  keyboardType="number-pad"
                  returnKeyType="done"
                  onSubmitEditing={addMiniSet}
                />
                <Button
                  variant="tertiary"
                  fullWidth={false}
                  style={[styles.clusterAddBtn, live.clusterAddBtn]}
                  onPress={addMiniSet}
                  accessibilityLabel="Add mini-set"
                >
                  <Ionicons name="add" size={20} color={t.colors.primary} />
                  <Text maxFontSizeMultiplier={1.3} style={[styles.clusterAddBtnText, live.clusterAddBtnText]}>Mini-set</Text>
                </Button>
              </View>
              <Button
                variant="primary"
                style={[styles.completeBtn, live.completeBtn]}
                onPress={finishCluster}
                disabled={saving}
                accessibilityLabel="Finish cluster and log the set"
              >
                <Ionicons name="checkmark-circle" size={20} color={t.colors.onPrimary} />
                <Text maxFontSizeMultiplier={1.3} style={[styles.completeBtnText, live.completeBtnText]}>Finish cluster</Text>
              </Button>
              <TouchableOpacity onPress={cancelCluster} style={[styles.clusterCancel, live.clusterCancel]} accessibilityLabel="Cancel cluster">
                <Text maxFontSizeMultiplier={1.3} style={[styles.clusterCancelText, live.clusterCancelText]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Per-side (unilateral) banner (D9): drives the two-phase
              per-side flow. Reuses the cluster banner's exact styling and
              shape (same interaction pattern, not a new one) - one input
              row for the second side, one primary "finish" action, one
              cancel. Rest-class copy (D9 amendment 2) differs: compound
              names the running rest timer above; isolation shows a plain
              switch-sides line with no timer at all. */}
          {perSide ? (
            <View style={[styles.clusterBanner, live.clusterBanner]}>
              <Text maxFontSizeMultiplier={1.3} style={[styles.clusterTitle, live.clusterTitle]}>
                {exercise?.compoundIsolation === 'compound' ? 'Other side, after your rest' : 'Switch sides'}
              </Text>
              <Text maxFontSizeMultiplier={1.3} style={[styles.clusterReps, live.clusterReps]}>
                First side: {perSide.leftReps} reps
                {perSide.weight ? ` @ ${perSide.weight}${units}` : ''}
              </Text>
              {exercise?.compoundIsolation !== 'compound' && (
                <Text maxFontSizeMultiplier={1.3} style={[styles.sheetOptionDesc, live.sheetOptionDesc]}>Swap sides when you're ready, no rush.</Text>
              )}
              <View style={styles.clusterInputRow}>
                <TextInput maxFontSizeMultiplier={1.3}
                  style={[styles.clusterInput, live.clusterInput]}
                  value={perSideReps}
                  onChangeText={setPerSideReps}
                  placeholder="Other side reps"
                  placeholderTextColor={t.colors.textMuted}
                  accessibilityLabel="Other side reps"
                  keyboardType="number-pad"
                  returnKeyType="done"
                  onSubmitEditing={finishPerSide}
                />
              </View>
              <Button
                variant="primary"
                style={[styles.completeBtn, live.completeBtn]}
                onPress={finishPerSide}
                disabled={saving}
                accessibilityLabel="Log the other side and finish this set"
              >
                <Ionicons name="checkmark-circle" size={20} color={t.colors.onPrimary} />
                <Text maxFontSizeMultiplier={1.3} style={[styles.completeBtnText, live.completeBtnText]}>Log other side</Text>
              </Button>
              <TouchableOpacity onPress={cancelPerSide} style={[styles.clusterCancel, live.clusterCancel]} accessibilityLabel="Cancel this set">
                <Text maxFontSizeMultiplier={1.3} style={[styles.clusterCancelText, live.clusterCancelText]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* A2 (audit CL-4): the PRIMARY action moved to the bottom-pinned
              bar (thumb zone, stable position). In the scroll, only the
              "Log another set" affordance remains, promoted to a full-size
              outline button in the exact pixels the primary used to occupy,
              so the muscle-memory tap logs a set instead of navigating. */}
          {(cluster || perSide) ? null : (targetComplete && !extraSetArmed) ? (
            <Button
              testID="volyume-btn-extra-set"
              variant="secondary"
              style={[styles.extraSetBtnPromoted, live.extraSetBtnPromoted]}
              onPress={() => setExtraSetArmed(true)}
              disabled={saving}
              accessibilityLabel="Log another set"
              accessibilityHint="Opens one more set below; nothing is logged until you confirm"
            >
              <Ionicons name="add-circle-outline" size={20} color={t.colors.primary} />
              <Text maxFontSizeMultiplier={1.3} style={[styles.extraSetBtnPromotedText, live.extraSetBtnPromotedText]}>Log another set</Text>
            </Button>
          ) : null}

          {/* C3 (audit 2026-07-03): the 1.8s move to the next exercise used
              to be a silent setTimeout, the only way to stay was to log
              another set. Make the wait visible and give it its own
              cancel, alongside the "Log another set" affordance above. */}
          {autoAdvanceArmed && targetComplete && !extraSetArmed ? (
            <View style={styles.autoAdvanceRow}>
              <Text maxFontSizeMultiplier={1.3} style={[styles.autoAdvanceRowText, live.autoAdvanceRowText]}>Next exercise in a moment</Text>
              <Text maxFontSizeMultiplier={1.3} style={[styles.autoAdvanceRowDot, live.autoAdvanceRowDot]}> - </Text>
              <TouchableOpacity
                style={[styles.autoAdvanceRowActionBtn, live.autoAdvanceRowActionBtn]}
                onPress={cancelAutoAdvance}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Stay on this exercise"
              >
                <Text maxFontSizeMultiplier={1.3} style={[styles.autoAdvanceRowAction, live.autoAdvanceRowAction]}>Stay here</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Logged sets sit ABOVE the action row (COMP-001): the session
              receipt builds above the fold, so each logged set is visible
              without scrolling past secondary actions. */}
          {loggedSets.length > 0 && (
            <View style={styles.loggedSection}>
              <Text maxFontSizeMultiplier={1.3} style={[styles.loggedTitle, live.loggedTitle]}>This workout</Text>
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
                    onDelete={openDeleteFromMenu}
                  />
                </AnimatedRow>
              ))}
            </View>
          )}

          {/* Secondary exercise utilities live in Exercise options so the
              logger surface stays focused on entering and reviewing sets. */}

          {/* Ghost navigation deleted (COMP-001): Next exercise / Finish
              live in the CTA state-swap when the target completes; the
              exercise navigator covers moving on early. Time-crunch active
              state is the timer glyph in the header; revert lives in the
              exercise options sheet. */}

          <View style={{ height: Math.max(spacing.xxl, insets.bottom + spacing.lg) }} />
        </ScrollView>

        {/* A2 (audit CL-4): the primary action lives in a bottom-pinned bar,
            the one-handed thumb zone, at a stable position, instead of
            floating mid-scroll and swapping identity in the same pixels.
            Cluster flows (and the per-side flow, D9) keep their own
            in-card controls, so no bar then.
            insets.bottom IS required here: E15's VolyumeTabBar returns null
            while ActiveWorkout is focused (VolyumeTabBar.js), so nothing else
            absorbs the system inset and a flat spacing.md left Log set half
            behind the Android gesture pill (founder screenshot 2026-07-03).
            The earlier "no insets here" note (2026-07-02) described the stock
            always-visible tab bar and no longer holds. Math.max keeps the
            old padding on devices that report no bottom inset. */}
        {(cluster || perSide) ? null : (
          <View style={[styles.bottomBar, live.bottomBar, { paddingBottom: Math.max(spacing.md, insets.bottom + spacing.sm) }]}>
            {targetComplete && !extraSetArmed ? (
              isLastExercise ? (
                <Button
                  testID="volyume-btn-finish-primary"
                  variant="primary"
                  style={[styles.completeBtn, live.completeBtn]}
                  onPress={handleFinishWorkout}
                  accessibilityLabel="Finish workout"
                >
                  <Ionicons name="checkmark-done" size={20} color={t.colors.onPrimary} />
                  <Text maxFontSizeMultiplier={1.3} style={[styles.completeBtnText, live.completeBtnText]}>Finish workout</Text>
                </Button>
              ) : (
                <Button
                  testID="volyume-btn-next-exercise"
                  variant="primary"
                  style={[styles.completeBtn, live.completeBtn]}
                  onPress={handleNextExercise}
                  accessibilityLabel="Move to next exercise"
                >
                  <Ionicons name="arrow-forward-circle" size={20} color={t.colors.onPrimary} />
                  <Text maxFontSizeMultiplier={1.3} style={[styles.completeBtnText, live.completeBtnText]}>Next exercise</Text>
                </Button>
              )
            ) : (
              <Button
                testID="volyume-btn-complete-set"
                variant="primary"
                style={[styles.completeBtn, live.completeBtn, currentSet.setType === 'warmup' && [styles.completeBtnWarmup, live.completeBtnWarmup]]}
                onPress={handleCompleteSetPress}
                disabled={saving}
                accessibilityLabel={
                  currentSet.setType === 'warmup' ? 'Log warm-up'
                  : (isClusterType(currentSet.setType) && !(exercise && unilateralExercises.has(exercise.id))) ? 'Start cluster' : 'Log set'
                }
              >
                <Ionicons name="checkmark-circle" size={20} color={currentSet.setType === 'warmup' ? t.colors.warning : t.colors.onPrimary} />
                <Text maxFontSizeMultiplier={1.3} style={[styles.completeBtnText, live.completeBtnText, currentSet.setType === 'warmup' && [styles.completeBtnTextWarmup, live.completeBtnTextWarmup]]}>
                  {currentSet.setType === 'warmup' ? 'Log warm-up'
                    : (isClusterType(currentSet.setType) && !(exercise && unilateralExercises.has(exercise.id))) ? 'Start cluster' : 'Log set'}
                </Text>
              </Button>
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

        {/* Superset / giant-set heads-up modal, appears once per group when the
            user lands on a grouped exercise. Educational for first-timers,
            and gives a clear out (unlink or swap) if they're not set up
            for it today. Renders one numbered row per member, so a pair shows
            two and a giant set 3+. */}
        <Modal
          visible={!!supersetHeadsUp}
          transparent
          animationType={reduceMotion ? 'none' : 'fade'}
          onRequestClose={() => setSupersetHeadsUp(null)}
        >
          {supersetHeadsUp ? (
          <View style={[styles.supOverlay, live.supOverlay]}>
            <View style={[styles.supSheet, live.supSheet]}>
              <ScrollView
                style={styles.supSheetScroll}
                contentContainerStyle={[styles.supSheetContent, { paddingBottom: Math.max(spacing.xxl, insets.bottom + spacing.lg) }]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.supIconRow}>
                  <Ionicons name="link" size={24} color={t.colors.primary} />
                  <Text maxFontSizeMultiplier={1.3} style={[styles.supTitle, live.supTitle]}>
                    {(supersetHeadsUp?.memberNames?.length ?? 0) > 2 ? 'Giant set coming up' : 'Superset coming up'}
                  </Text>
                </View>
                <Text maxFontSizeMultiplier={1.3} style={[styles.supSubtitle, live.supSubtitle]}>
                  {(supersetHeadsUp?.memberNames?.length ?? 0) > 2
                    ? `${supersetHeadsUp.memberNames.length} exercises done back-to-back with no rest between them.`
                    : 'Two exercises done back-to-back with no rest between them.'}
                </Text>

                <Card surface="surface2" radius="md" padding="md" style={[styles.supPairCard, live.supPairCard]}>
                  {(supersetHeadsUp?.memberNames ?? []).map((memberName, memberIdx) => (
                    <React.Fragment key={`${memberIdx}-${memberName}`}>
                      {memberIdx > 0 && <View style={[styles.supPairConnector, live.supPairConnector]} />}
                      <View style={styles.supPairRow}>
                        <View style={[styles.supPairChip, live.supPairChip]}><Text maxFontSizeMultiplier={1.3} style={[styles.supPairChipText, live.supPairChipText]}>{memberIdx + 1}</Text></View>
                        <Text maxFontSizeMultiplier={1.3} style={[styles.supPairName, live.supPairName]} numberOfLines={2}>
                          {memberName}
                        </Text>
                      </View>
                    </React.Fragment>
                  ))}
                </Card>

                <View style={styles.supSteps}>
                  <View style={styles.supStep}>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.supStepNum, live.supStepNum]}>1</Text>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.supStepText, live.supStepText]}>Set up every station now if you can.</Text>
                  </View>
                  <View style={styles.supStep}>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.supStepNum, live.supStepNum]}>2</Text>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.supStepText, live.supStepText]}>Do all reps of the first exercise.</Text>
                  </View>
                  <View style={styles.supStep}>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.supStepNum, live.supStepNum]}>3</Text>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.supStepText, live.supStepText]}>Move straight to the next. No rest between.</Text>
                  </View>
                  <View style={styles.supStep}>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.supStepNum, live.supStepNum]}>4</Text>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.supStepText, live.supStepText]}>After the last one, rest the full rest period, then repeat.</Text>
                  </View>
                </View>

                <Text maxFontSizeMultiplier={1.3} style={[styles.supTip, live.supTip]}>
                  Tip: if you can't grab every station right now, unlink and do them as normal sets.
                </Text>

                <Button
                  variant="primary"
                  style={[styles.supPrimaryBtn, live.supPrimaryBtn]}
                  onPress={() => setSupersetHeadsUp(null)}
                  title="Got it, start"
                  textStyle={[styles.supPrimaryBtnText, live.supPrimaryBtnText]}
                />

                <View style={styles.supSecondaryRow}>
                  <Button
                    variant="outline"
                    style={[styles.supSecondaryBtn, live.supSecondaryBtn]}
                    onPress={() => {
                      handleTogglePair(); // unpair
                      setSupersetHeadsUp(null);
                    }}
                    accessibilityLabel="Unlink the superset"
                  >
                    <Ionicons name="unlink" size={14} color={t.colors.textSecondary} />
                    <Text maxFontSizeMultiplier={1.3} style={[styles.supSecondaryBtnText, live.supSecondaryBtnText]}>Unlink</Text>
                  </Button>
                  <Button
                    variant="outline"
                    style={[styles.supSecondaryBtn, live.supSecondaryBtn]}
                    onPress={() => {
                      setSupersetHeadsUp(null);
                      handleOpenSwap();
                    }}
                    accessibilityLabel="Swap exercise"
                  >
                    <Ionicons name="swap-horizontal" size={14} color={t.colors.textSecondary} />
                    <Text maxFontSizeMultiplier={1.3} style={[styles.supSecondaryBtnText, live.supSecondaryBtnText]}>Swap exercise</Text>
                  </Button>
                </View>
              </ScrollView>
            </View>
          </View>
          ) : null}
        </Modal>

        {/* D9 unilateral (per-side) FULL walkthrough - shown only the very
            first time the suggestion ever fires for this user
            (unilateralWalkthroughSeenRef / UNILATERAL_WALKTHROUGH_SEEN_KEY);
            every later unilateral exercise gets a quick appAlert confirm
            only (see the suggestion effect above). Copies the superset
            heads-up's shape and styles exactly (icon, title, numbered
            steps, tip, primary CTA) - same tone, same reused pattern, not a
            new one. "No, log as normal" still counts as answered: the
            choice sticks per exercise either way, so the suggestion never
            repeats for THIS exercise regardless of which button is tapped. */}
        <Modal
          visible={!!unilateralSuggest}
          transparent
          animationType={reduceMotion ? 'none' : 'fade'}
          onRequestClose={() => setUnilateralSuggest(null)}
        >
          {unilateralSuggest ? (() => {
            const isCompound = exercise?.compoundIsolation === 'compound';
            const answerAndClose = (turnOn) => {
              const id = unilateralSuggest.exerciseId;
              setUnilateralSuggest(null);
              unilateralWalkthroughSeenRef.current = true;
              AsyncStorage.setItem(UNILATERAL_WALKTHROUGH_SEEN_KEY, 'true').catch(() => {});
              handleUnilateralAnswer(id, turnOn);
            };
            return (
          <View style={[styles.supOverlay, live.supOverlay]}>
            <View style={[styles.supSheet, live.supSheet]}>
              <ScrollView
                style={styles.supSheetScroll}
                contentContainerStyle={[styles.supSheetContent, { paddingBottom: Math.max(spacing.xxl, insets.bottom + spacing.lg) }]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.supIconRow}>
                  <Ionicons name="repeat" size={24} color={t.colors.primary} />
                  <Text maxFontSizeMultiplier={1.3} style={[styles.supTitle, live.supTitle]}>Log this one side at a time?</Text>
                </View>
                <Text maxFontSizeMultiplier={1.3} style={[styles.supSubtitle, live.supSubtitle]}>
                  {unilateralSuggest.exerciseName} is usually trained one side at a time.
                </Text>

                <Card surface="surface2" radius="md" padding="md" style={[styles.supPairCard, live.supPairCard]}>
                  <View style={styles.supPairRow}>
                    <View style={[styles.supPairChip, live.supPairChip]}><Text maxFontSizeMultiplier={1.3} style={[styles.supPairChipText, live.supPairChipText]}>1</Text></View>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.supPairName, live.supPairName]} numberOfLines={2}>First side</Text>
                  </View>
                  <View style={[styles.supPairConnector, live.supPairConnector]} />
                  <View style={styles.supPairRow}>
                    <View style={[styles.supPairChip, live.supPairChip]}><Text maxFontSizeMultiplier={1.3} style={[styles.supPairChipText, live.supPairChipText]}>2</Text></View>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.supPairName, live.supPairName]} numberOfLines={2}>Other side</Text>
                  </View>
                </Card>

                <View style={styles.supSteps}>
                  <View style={styles.supStep}>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.supStepNum, live.supStepNum]}>1</Text>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.supStepText, live.supStepText]}>Do your first side.</Text>
                  </View>
                  <View style={styles.supStep}>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.supStepNum, live.supStepNum]}>2</Text>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.supStepText, live.supStepText]}>
                      {isCompound
                        ? 'Half your normal rest, then do the other side.'
                        : 'Switch sides when you\'re ready, no forced timer.'}
                    </Text>
                  </View>
                  <View style={styles.supStep}>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.supStepNum, live.supStepNum]}>3</Text>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.supStepText, live.supStepText]}>
                      {isCompound
                        ? 'Rest the same again, then start your next set.'
                        : 'Rest as normal once both sides are done.'}
                    </Text>
                  </View>
                  <View style={styles.supStep}>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.supStepNum, live.supStepNum]}>4</Text>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.supStepText, live.supStepText]}>Logs as one set, using your lower side's reps.</Text>
                  </View>
                </View>

                <Text maxFontSizeMultiplier={1.3} style={[styles.supTip, live.supTip]}>
                  Tip: change your mind any time from this exercise's options menu.
                </Text>

                <Button
                  variant="primary"
                  style={[styles.supPrimaryBtn, live.supPrimaryBtn]}
                  onPress={() => answerAndClose(true)}
                  title="Yes, log per side"
                  textStyle={[styles.supPrimaryBtnText, live.supPrimaryBtnText]}
                />

                <View style={styles.supSecondaryRow}>
                  <Button
                    variant="outline"
                    style={[styles.supSecondaryBtn, live.supSecondaryBtn]}
                    onPress={() => answerAndClose(false)}
                    accessibilityLabel="No, log as normal"
                  >
                    <Text maxFontSizeMultiplier={1.3} style={[styles.supSecondaryBtnText, live.supSecondaryBtnText]}>No, log as normal</Text>
                  </Button>
                </View>
              </ScrollView>
            </View>
          </View>
            );
          })() : null}
        </Modal>

        {/* Stale workout recovery modal (D43 S1 slice 2: extracted to
            src/components/workout/StaleWorkoutModal.js, byte-identical). */}
        <StaleWorkoutModal
          visible={showStaleModal}
          reduceMotion={reduceMotion}
          onClose={() => setShowStaleModal(false)}
          onResume={() => { updateLastActivity(); setShowStaleModal(false); }}
          onFinish={() => { setShowStaleModal(false); handleFinishWorkout(); }}
          onDiscard={() => {
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
          }}
        />

        {/* Set Type Picker Bottom Sheet */}
        <WorkoutBottomSheet
          visible={showSetTypePicker}
          onClose={() => setShowSetTypePicker(false)}
          accessibilityLabel="Set type"
        >
          {showSetTypePicker ? (
            <>
              <Text maxFontSizeMultiplier={1.3} style={[styles.sheetTitle, live.sheetTitle]}>Set type</Text>
              <Text maxFontSizeMultiplier={1.3} style={[styles.sheetExplainer, live.sheetExplainer]}>
                Pick how this set was done. Working sets and intensity techniques count towards your training; warm-ups do not. This helps Volyume read the session correctly.
              </Text>
              {/* P9: the radios group so TalkBack announces position context
                  ("2 of 5") while each row keeps its own label and state. */}
              <View accessibilityRole="radiogroup">
              {SET_TYPE_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.sheetOption, live.sheetOption]}
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
                    <Text maxFontSizeMultiplier={1.3} style={[styles.sheetOptionLabel, live.sheetOptionLabel, currentSet.setType === opt.value && [styles.sheetOptionLabelActive, live.sheetOptionLabelActive]]}>
                      {opt.label}
                    </Text>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.sheetOptionDesc, live.sheetOptionDesc]}>{opt.description}</Text>
                  </View>
                  {currentSet.setType === opt.value && (
                    <Ionicons name="checkmark" size={18} color={t.colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
              </View>
            </>
          ) : null}
        </WorkoutBottomSheet>

        {/* B8: warm-up set helper. Opens ONLY from the overflow menu (the
            recorded no-auto-suggest decision stands, pull, never push).
            Choosing one suggested set
            loads it into the set entry as a Warm-up via the same setType
            machinery as the manual picker. Nothing is logged for the user. */}
        <WorkoutBottomSheet
          visible={showWarmupRamp}
          onClose={() => setShowWarmupRamp(false)}
          accessibilityLabel="Warm-up sets"
        >
          {showWarmupRamp ? (
            <>
              <Text maxFontSizeMultiplier={1.3} style={[styles.sheetTitle, live.sheetTitle]}>Warm-up sets</Text>
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
                    <Text maxFontSizeMultiplier={1.3} style={[styles.sheetExplainer, live.sheetExplainer]}>
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
                    <Text maxFontSizeMultiplier={1.3} style={[styles.sheetExplainer, live.sheetExplainer]}>
                      {`This is light enough to start at ${working} ${units}. You can begin with your working set today.`}
                    </Text>
                  );
                }
                return (
                  <>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.sheetExplainer, live.sheetExplainer]}>
                      {`Working up to ${working} ${units}. Choose a warm-up set to load it, then tap Log warm-up. Warm-ups are saved but not counted in your working-set target.`}
                    </Text>
                    {rows.map((row) => (
                      <TouchableOpacity
                        key={`${row.weight}-${row.reps}`}
                        style={[styles.sheetOption, live.sheetOption]}
                        onPress={() => {
                          hapticsVocab.selection();
                          setGhostSet(null);
                          setCurrentSet(s => ({ ...s, weight: row.weight, reps: row.reps, setType: 'warmup', isGhost: false }));
                          setShowWarmupRamp(false);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`${row.isBar ? 'Empty bar' : `${row.weight} ${units}`}, ${row.reps} reps. Load as a warm-up set.`}
                      >
                        <View style={styles.overflowOptionRow}>
                          <Ionicons name="flame-outline" size={16} color={t.colors.warning} />
                          <Text maxFontSizeMultiplier={1.3} style={[styles.sheetOptionLabel, live.sheetOptionLabel]}>{`${row.weight} ${units} x ${row.reps}`}</Text>
                        </View>
                        {row.isBar ? <Text maxFontSizeMultiplier={1.3} style={[styles.rampBarTag, live.rampBarTag]}>Empty bar</Text> : null}
                      </TouchableOpacity>
                    ))}
                  </>
                );
              })()}
            </>
          ) : null}
        </WorkoutBottomSheet>

        {/* Exercise overflow sheet (COMP-001): secondary and destructive
            exercise actions, off the permanent surface. Remove keeps its
            own confirm alert inside handleRemoveExercise. */}
        <WorkoutBottomSheet
          visible={showOverflow}
          onClose={() => setShowOverflow(false)}
          accessibilityLabel="Exercise options"
        >
          {showOverflow ? (
            <>
              <Text maxFontSizeMultiplier={1.3} style={[styles.sheetTitle, live.sheetTitle]}>{exercise?.name}</Text>
              <TouchableOpacity
                style={[styles.sheetOption, live.sheetOption]}
                onPress={() => { setShowOverflow(false); handleOpenSwap(); }}
                accessibilityRole="button"
                accessibilityLabel="Swap exercise"
              >
                <View style={styles.overflowOptionRow}>
                  <Ionicons name="swap-horizontal" size={18} color={t.colors.textSecondary} />
                  <Text maxFontSizeMultiplier={1.3} style={[styles.sheetOptionLabel, live.sheetOptionLabel]}>Swap exercise</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetOption, live.sheetOption]}
                onPress={() => {
                  setShowOverflow(false);
                  openAddExercisePicker();
                }}
                accessibilityRole="button"
                accessibilityLabel="Add exercise to workout"
              >
                <View style={styles.overflowOptionRow}>
                  <Ionicons name="add-circle-outline" size={18} color={t.colors.textSecondary} />
                  <Text maxFontSizeMultiplier={1.3} style={[styles.sheetOptionLabel, live.sheetOptionLabel]}>Add exercise</Text>
                </View>
              </TouchableOpacity>
              {canMoveUp && (
              <TouchableOpacity
                style={[styles.sheetOption, live.sheetOption]}
                onPress={() => { setShowOverflow(false); handleMoveExercise('up'); }}
                accessibilityRole="button"
                accessibilityLabel="Move exercise up"
              >
                <View style={styles.overflowOptionRow}>
                  <Ionicons name="chevron-up" size={18} color={t.colors.textSecondary} />
                  <Text maxFontSizeMultiplier={1.3} style={[styles.sheetOptionLabel, live.sheetOptionLabel]}>Move exercise up</Text>
                </View>
              </TouchableOpacity>
              )}
              {canMoveDown && (
              <TouchableOpacity
                style={[styles.sheetOption, live.sheetOption]}
                onPress={() => { setShowOverflow(false); handleMoveExercise('down'); }}
                accessibilityRole="button"
                accessibilityLabel="Move exercise down"
              >
                <View style={styles.overflowOptionRow}>
                  <Ionicons name="chevron-down" size={18} color={t.colors.textSecondary} />
                  <Text maxFontSizeMultiplier={1.3} style={[styles.sheetOptionLabel, live.sheetOptionLabel]}>Move exercise down</Text>
                </View>
              </TouchableOpacity>
              )}
              {/* D32 (2026-07-10, campaign item 20): opens the purpose-built
                  reorder sheet (whole-workout drag). Additive to the
                  Move exercise up/down entries above, which stay exactly as
                  they were (still one step, still just the current
                  exercise). */}
              {workoutExercises.length > 1 && (
              <TouchableOpacity
                style={[styles.sheetOption, live.sheetOption]}
                onPress={() => { setShowOverflow(false); setShowReorderSheet(true); }}
                accessibilityRole="button"
                accessibilityLabel="Reorder exercises"
              >
                <View style={styles.overflowOptionRow}>
                  <Ionicons name="reorder-three-outline" size={18} color={t.colors.textSecondary} />
                  <Text maxFontSizeMultiplier={1.3} style={[styles.sheetOptionLabel, live.sheetOptionLabel]}>Reorder exercises</Text>
                </View>
              </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.sheetOption, live.sheetOption]}
                onPress={() => {
                  setShowOverflow(false);
                  setShowNoteInput(true);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${noteActionLabel} for this set`}
              >
                <View style={styles.overflowOptionRow}>
                  <Ionicons name="create-outline" size={18} color={t.colors.textSecondary} />
                  <Text maxFontSizeMultiplier={1.3} style={[styles.sheetOptionLabel, live.sheetOptionLabel]}>{noteActionLabel}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetOption, live.sheetOption]}
                onPress={() => { setShowOverflow(false); setShowExecution(true); }}
                accessibilityRole="button"
                accessibilityLabel="Exercise info"
              >
                <View style={styles.overflowOptionRow}>
                  <Ionicons name="information-circle-outline" size={18} color={t.colors.textSecondary} />
                  <Text maxFontSizeMultiplier={1.3} style={[styles.sheetOptionLabel, live.sheetOptionLabel]}>Exercise info</Text>
                </View>
              </TouchableOpacity>
              {/* D9: per-exercise "log per side" preference. Shown only for
                  metadata-flagged unilateral exercises (exercise.laterality,
                  exerciseMetadata.js deriveLaterality) - this is the manual
                  override/escape hatch alongside the one-time suggestion
                  prompt above; flipping it here never re-shows that prompt
                  (it also marks the exercise "asked", same as answering the
                  prompt directly). */}
              {exercise?.laterality === 'unilateral' && (
              <TouchableOpacity
                style={[styles.sheetOption, live.sheetOption]}
                onPress={() => {
                  setShowOverflow(false);
                  const exerciseId = exercise.id;
                  const nextOn = !unilateralExercises.has(exerciseId);
                  handleUnilateralAnswer(exerciseId, nextOn);
                }}
                accessibilityRole="button"
                accessibilityLabel={unilateralExercises.has(exercise.id) ? 'Stop logging this exercise per side' : 'Log this exercise per side'}
              >
                <View style={styles.overflowOptionRow}>
                  <Ionicons
                    name={unilateralExercises.has(exercise.id) ? 'repeat' : 'repeat-outline'}
                    size={18}
                    color={unilateralExercises.has(exercise.id) ? t.colors.primary : t.colors.textSecondary}
                  />
                  <View style={styles.sheetOptionText}>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.sheetOptionLabel, live.sheetOptionLabel]}>{unilateralExercises.has(exercise.id) ? 'Logging per side' : 'Log per side'}</Text>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.sheetOptionDesc, live.sheetOptionDesc]}>One side, then the other. Still counts as one set.</Text>
                  </View>
                </View>
              </TouchableOpacity>
              )}
              {/* B8 gym basics. The warm-up helper lives here in the overflow,
                  off the permanent surface (COMP-001), and strictly
                  pull: the warm-up helper NEVER auto-appears (recorded decision
                  at the set-entry card). */}
              {/* Hidden mid-cluster: a ramp-row tap rewrites the entry's
                  weight AND set type, and finishCluster commits from the
                  live entry, the one-tap path would mislog the whole
                  cluster as a light warm-up. */}
              {!cluster && (!exercise?.exerciseType || exercise.exerciseType === 'weight_reps' || exercise.exerciseType === 'weighted_bodyweight') && (
              <TouchableOpacity
                style={[styles.sheetOption, live.sheetOption]}
                onPress={() => {
                  setShowOverflow(false);
                  const w = parseFloat(currentSet.weight);
                  if ((currentSet.setType ?? 'straight') !== 'warmup' && Number.isFinite(w) && w > 0) {
                    rampAnchorRef.current = w;
                  }
                  setShowWarmupRamp(true);
                }}
                accessibilityRole="button"
                accessibilityLabel="Warm-up sets"
              >
                <View style={styles.overflowOptionRow}>
                  <Ionicons name="flame-outline" size={18} color={t.colors.textSecondary} />
                  <View style={styles.sheetOptionText}>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.sheetOptionLabel, live.sheetOptionLabel]}>Warm-up sets</Text>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.sheetOptionDesc, live.sheetOptionDesc]}>Suggested light sets up to today's working weight.</Text>
                  </View>
                </View>
              </TouchableOpacity>
              )}
              {!isLastExercise && (
              <TouchableOpacity
                style={[styles.sheetOption, live.sheetOption]}
                onPress={() => { setShowOverflow(false); handleTogglePair(); }}
                accessibilityRole="button"
                accessibilityLabel={isPairedWithNext ? 'Unpair from next exercise' : 'Pair as superset with next exercise'}
              >
                <View style={styles.overflowOptionRow}>
                  <Ionicons name={isPairedWithNext ? 'link' : 'link-outline'} size={18} color={isPairedWithNext ? t.colors.primary : t.colors.textSecondary} />
                  <Text maxFontSizeMultiplier={1.3} style={[styles.sheetOptionLabel, live.sheetOptionLabel]}>{isPairedWithNext ? 'Unpair superset' : 'Pair as superset'}</Text>
                </View>
              </TouchableOpacity>
              )}
              {!timeCrunchActive && workoutExercises.length > currentExerciseIndex + 1 && (
              <TouchableOpacity
                style={[styles.sheetOption, live.sheetOption]}
                onPress={() => { setShowOverflow(false); handleTimeCrunch(); }}
                accessibilityRole="button"
                accessibilityLabel="Shorten session"
              >
                <View style={styles.overflowOptionRow}>
                  <Ionicons name="timer-outline" size={18} color={t.colors.textSecondary} />
                  <View style={styles.sheetOptionText}>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.sheetOptionLabel, live.sheetOptionLabel]}>Shorten session</Text>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.sheetOptionDesc, live.sheetOptionDesc]}>Shortens the rest of today's session to fit the time you have left. Undo any time.</Text>
                  </View>
                </View>
              </TouchableOpacity>
              )}
              {timeCrunchActive && (
              <TouchableOpacity
                style={[styles.sheetOption, live.sheetOption]}
                onPress={() => { setShowOverflow(false); handleRevertTimeCrunch(); }}
                accessibilityRole="button"
                accessibilityLabel="Undo shortening"
              >
                <View style={styles.overflowOptionRow}>
                  <Ionicons name="refresh-outline" size={18} color={t.colors.textSecondary} />
                  <View style={styles.sheetOptionText}>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.sheetOptionLabel, live.sheetOptionLabel]}>Undo shortening</Text>
                    {!!timeCrunchMsg && <Text maxFontSizeMultiplier={1.3} style={[styles.sheetOptionDesc, live.sheetOptionDesc]}>{timeCrunchMsg}</Text>}
                  </View>
                </View>
              </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.sheetOption, live.sheetOption]}
                onPress={() => { setShowOverflow(false); handleRemoveExercise(); }}
                accessibilityRole="button"
                accessibilityLabel="Remove exercise from workout"
              >
                <View style={styles.overflowOptionRow}>
                  <Ionicons name="trash-outline" size={18} color={t.colors.error} />
                  <Text maxFontSizeMultiplier={1.3} style={[styles.sheetOptionLabel, live.sheetOptionLabel, { color: t.colors.error }]}>Remove exercise</Text>
                </View>
              </TouchableOpacity>
            </>
          ) : null}
        </WorkoutBottomSheet>

        {/* Reorder sheet (D32, 2026-07-10, campaign item 20): the whole
            workout as a draggable list, opened from the overflow menu
            above. NO in-view drag on the main single-exercise view (that
            view is a deliberate focus design, and in-view drag mid-training
            is ergonomically risky); this sheet is the purpose-built surface
            instead. Block-aware: a superset/giant-set group moves and lands
            whole (src/lib/reorder.js). Every row also carries its own
            up/down chevrons as the accessible move path (drag's handle is
            hidden from screen readers, see DragReorderList's own header
            comment) -- this sheet's chevrons are ADDITIONAL to, and
            distinct from, the Move exercise up/down overflow entries above
            (those still move only the current exercise one step; these move
            any row in the sheet). Both persist through the same
            setWorkoutExercises -> _persistActiveWorkout flow every other
            order-affecting action uses; completed/in-progress sets are
            untouched (order metadata only), and currentExerciseIndex is
            re-pointed at the same exercise after either path. */}
        <WorkoutBottomSheet
          visible={showReorderSheet}
          onClose={() => setShowReorderSheet(false)}
          accessibilityLabel="Reorder exercises"
          scrollRef={reorderSheetScroll.scrollRef}
          onScroll={reorderSheetScroll.onScroll}
          onContentSizeChange={reorderSheetScroll.onContentSizeChange}
        >
          {showReorderSheet ? (
            <>
              <Text maxFontSizeMultiplier={1.3} style={[styles.sheetTitle, live.sheetTitle]}>Reorder exercises</Text>
              <Text maxFontSizeMultiplier={1.3} style={[styles.sheetExplainer, live.sheetExplainer]}>
                Hold and drag the handle, or use the arrows. Exercises in a superset or giant set move together.
              </Text>
              <DragReorderList
                items={workoutExercises}
                keyExtractor={keyForWorkoutExercise}
                getGroupId={(e) => e.supersetGroupId ?? null}
                onReorder={handleReorderWorkoutExercises}
                handleAccessibilityLabel={(e) => `Drag to reorder ${e.exercise?.name ?? 'exercise'}`}
                gap={spacing.sm}
                scrollRef={reorderSheetScroll.scrollRef}
                scrollOffset={reorderSheetScroll.scrollOffset}
                renderRow={({ item, index }) => {
                  const gid = item.supersetGroupId ?? null;
                  // Same 2-vs-3+ naming the heads-up modal uses (item 21):
                  // "Superset" for a pair, "Giant set" for three or more.
                  const groupSize = gid != null
                    ? workoutExercises.filter((e) => (e.supersetGroupId ?? null) === gid).length
                    : 0;
                  const canUp = swapAdjacentBlocks(workoutExercises, index, 'up', (e) => e.supersetGroupId ?? null) !== workoutExercises;
                  const canDown = swapAdjacentBlocks(workoutExercises, index, 'down', (e) => e.supersetGroupId ?? null) !== workoutExercises;
                  const setsLogged = item.sets?.length ?? 0;
                  return (
                    <View style={[styles.reorderSheetRow, live.reorderSheetRow]}>
                      <View style={styles.reorderSheetRowInfo}>
                        <Text maxFontSizeMultiplier={1.3} style={[styles.reorderSheetRowName, live.reorderSheetRowName]} numberOfLines={1}>
                          {item.exercise?.name ?? 'Exercise'}
                        </Text>
                        <Text maxFontSizeMultiplier={1.3} style={[styles.reorderSheetRowMeta, live.reorderSheetRowMeta]}>
                          {setsLogged} set{setsLogged !== 1 ? 's' : ''} logged
                        </Text>
                        {gid != null && (
                          <View style={[styles.reorderSheetSupersetChip, live.reorderSheetSupersetChip]}>
                            <Ionicons name="link" size={11} color={t.colors.primary} />
                            <Text maxFontSizeMultiplier={1.3} style={[styles.reorderSheetSupersetChipText, live.reorderSheetSupersetChipText]}>{groupSize > 2 ? 'Giant set' : 'Superset'}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.reorderSheetChevrons}>
                        <TouchableOpacity
                          onPress={() => handleSheetMoveExercise(index, 'up')}
                          disabled={!canUp}
                          style={[styles.reorderSheetChevronBtn, live.reorderSheetChevronBtn, !canUp && styles.reorderSheetChevronBtnDisabled]}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityRole="button"
                          accessibilityState={{ disabled: !canUp }}
                          accessibilityLabel={`Move ${item.exercise?.name ?? 'exercise'} up`}
                        >
                          <Ionicons name="chevron-up" size={16} color={canUp ? t.colors.textSecondary : t.colors.border} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleSheetMoveExercise(index, 'down')}
                          disabled={!canDown}
                          style={[styles.reorderSheetChevronBtn, live.reorderSheetChevronBtn, !canDown && styles.reorderSheetChevronBtnDisabled]}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityRole="button"
                          accessibilityState={{ disabled: !canDown }}
                          accessibilityLabel={`Move ${item.exercise?.name ?? 'exercise'} down`}
                        >
                          <Ionicons name="chevron-down" size={16} color={canDown ? t.colors.textSecondary : t.colors.border} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
              />
            </>
          ) : null}
        </WorkoutBottomSheet>

        {/* Info / Form Bottom Sheet */}
        <WorkoutBottomSheet
          visible={showExecution}
          onClose={() => setShowExecution(false)}
          accessibilityLabel="Exercise info"
        >
          {showExecution ? (
            <>
              <Text maxFontSizeMultiplier={1.3} style={[styles.sheetTitle, live.sheetTitle]}>{exercise?.name}</Text>
              {exercise?.primaryMuscle ? (
                <Text maxFontSizeMultiplier={1.3} style={[styles.infoMuscle, live.infoMuscle]}>
                  {MUSCLE_DISPLAY_NAMES[exercise.primaryMuscle] ?? ((exercise.primaryMuscle || '').charAt(0).toUpperCase() + (exercise.primaryMuscle || '').slice(1).replace('_', ' '))}
                  {exercise.equipment ? ` - ${exercise.equipment}` : ''}
                </Text>
              ) : null}
              {routineExercise?.recommendedSets ? (
                <View style={styles.infoTargetRow}>
                  <Ionicons name="checkmark-circle-outline" size={14} color={t.colors.primary} />
                  <Text maxFontSizeMultiplier={1.3} style={[styles.infoTarget, live.infoTarget]}>
                    {adjustedSetCount || routineExercise.recommendedSets} sets of {routineExercise.recommendedRepsMin}-{routineExercise.recommendedRepsMax} reps
                  </Text>
                </View>
              ) : null}

              {/* COMP-015: Adjusted today, the reason, the plain-words signals,
                  and the one-tap revert. Shown for any visible adjustment; the
                  revert button only when there's a real set change to undo. */}
              {sessionAdjustment?.show ? (
                <View style={[styles.adjustedSection, live.adjustedSection]}>
                  <View style={styles.adjustedHeader}>
                    <Ionicons name="pulse-outline" size={14} color={t.colors.primary} />
                    <Text maxFontSizeMultiplier={1.3} style={[styles.adjustedTitle, live.adjustedTitle]}>Adjusted today</Text>
                  </View>
                  <Text maxFontSizeMultiplier={1.3} style={[styles.adjustedReason, live.adjustedReason]}>{sessionAdjustment.reasonText}</Text>
                  {sessionAdjustment.signals?.lastTrainedAt ? (
                    <Text maxFontSizeMultiplier={1.3} style={[styles.adjustedSignal, live.adjustedSignal]}>
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
                      <Ionicons name="arrow-undo-outline" size={15} color={t.colors.primary} />
                      <Text maxFontSizeMultiplier={1.3} style={[styles.adjustedRevertText, live.adjustedRevertText]}>Use planned sets instead</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}

              {/* B2: Eased for today, the intent-sheet answer's downward-only
                  tweak, both written whys, and a one-tap session-wide dismiss.
                  Suggestions on the targets display only; the plan and logged
                  sets are never changed. */}
              {readinessReduces ? (
                <View style={[styles.adjustedSection, live.adjustedSection]}>
                  <View style={styles.adjustedHeader}>
                    <Ionicons name="pulse-outline" size={14} color={t.colors.primary} />
                    <Text maxFontSizeMultiplier={1.3} style={[styles.adjustedTitle, live.adjustedTitle]}>Eased for today</Text>
                  </View>
                  <Text maxFontSizeMultiplier={1.3} style={[styles.adjustedReason, live.adjustedReason]}>{readinessTweak.whySets}</Text>
                  {readinessTweak.whyLoad ? (
                    <Text maxFontSizeMultiplier={1.3} style={[styles.adjustedSignal, live.adjustedSignal]}>{readinessTweak.whyLoad}</Text>
                  ) : null}
                  <TouchableOpacity
                    style={styles.adjustedRevertBtn}
                    onPress={() => { dismissReadinessTweak(); setShowExecution(false); }}
                    accessibilityRole="button"
                    accessibilityLabel={`${readinessRestoreLabel}. Applies to the whole session.`}
                  >
                    <Ionicons name="arrow-undo-outline" size={15} color={t.colors.primary} />
                    <Text maxFontSizeMultiplier={1.3} style={[styles.adjustedRevertText, live.adjustedRevertText]}>{readinessRestoreLabel}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <Text maxFontSizeMultiplier={1.3} style={[styles.infoNotesLabel, live.infoNotesLabel]}>How to do it</Text>
              <Text maxFontSizeMultiplier={1.3} style={[styles.infoNotes, live.infoNotes]}>
                {routineExercise?.notes || FORM_TIPS[exercise?.name] || exercise?.notes || 'No coaching notes yet for this exercise.\n\nIf you\'re not sure how much weight to use, start light. Pick something you could comfortably lift 15 to 20 times. Getting comfortable with the movement matters more than the weight, especially early on.\n\nFocus on controlled movement, feel the target muscle working, and stop a couple of reps before you truly cannot do any more.'}
              </Text>
            </>
          ) : null}
        </WorkoutBottomSheet>

        {/* Exercise Swap Modal */}
        <Modal visible={showSwapModal} animationType={reduceMotion ? 'none' : 'slide'} onRequestClose={() => setShowSwapModal(false)}>
          {showSwapModal ? (
            <>
          {/* Nested provider: a core RN <Modal> presents in its own window on
              iOS and would otherwise read top:0, jamming the swap list against
              the status bar / Dynamic Island. */}
          <SafeAreaProvider>
          <SafeAreaView style={[styles.swapSafe, live.swapSafe]} edges={['top', 'bottom']}>
            <View style={[styles.swapHeader, live.swapHeader]}>
              <View style={styles.swapHeaderCopy}>
                <Text maxFontSizeMultiplier={1.3} style={[styles.swapTitle, live.swapTitle]}>Swap exercise</Text>
                <Text maxFontSizeMultiplier={1.3} style={[styles.swapSubtitle, live.swapSubtitle]} numberOfLines={1}>
                  {exercise?.name}
                </Text>
              </View>
              <TouchableOpacity style={[styles.swapCloseBtn, live.swapCloseBtn]} onPress={() => setShowSwapModal(false)} accessibilityRole="button" accessibilityLabel="Close swap">
                <Ionicons name="close" size={20} color={t.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text maxFontSizeMultiplier={1.3} style={[styles.swapNote, live.swapNote]}>Choose a close match for today. Your plan is not changed, and sets you log count towards the new exercise's own muscle in your weekly volume.</Text>
            <FlashList
              data={swapCandidates}
              keyExtractor={item => item.exercise.id}
              contentContainerStyle={styles.swapListContent}
              ItemSeparatorComponent={() => <View style={styles.swapItemGap} />}
              renderItem={({ item }) => (
                <TouchableOpacity style={[styles.swapItem, live.swapItem]} onPress={() => handleConfirmSwap(item.exercise)} accessibilityRole="button" accessibilityLabel={`Swap in ${item.exercise.name}`}>
                  <View style={[styles.swapItemIcon, live.swapItemIcon]}>
                    <Ionicons name="swap-horizontal" size={16} color={t.colors.textSecondary} />
                  </View>
                  <View style={styles.swapItemCopy}>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.swapItemName, live.swapItemName]}>{item.exercise.name}</Text>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.swapItemReason, live.swapItemReason]}>{item.reason}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.swapEmpty}>
                  <Text maxFontSizeMultiplier={1.3} style={[styles.swapEmptyTitle, live.swapEmptyTitle]}>No close matches yet</Text>
                  <Text maxFontSizeMultiplier={1.3} style={[styles.swapEmptyText, live.swapEmptyText]}>Search the full library instead.</Text>
                </View>
              }
              ListFooterComponent={
                // Escape hatch from the ranked suggestions: search the whole
                // library or add your own. Always present, so it works whether
                // or not there were candidates.
                <TouchableOpacity
                  style={[styles.swapBrowseBtn, live.swapBrowseBtn]}
                  onPress={() => {
                    setShowSwapModal(false);
                    setPickerMode('swap');
                    setShowExercisePicker(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Search exercise library"
                >
                  <Ionicons name="search" size={16} color={t.colors.textSecondary} />
                  <Text maxFontSizeMultiplier={1.3} style={[styles.swapBrowseText, live.swapBrowseText]}>Search exercise library</Text>
                </TouchableOpacity>
              }
            />
          </SafeAreaView>
          </SafeAreaProvider>
            </>
          ) : null}
        </Modal>
        {/* Discard Workout Modal (D43 S1 slice 2: extracted to
            src/components/workout/DiscardWorkoutModal.js, byte-identical). */}
        <DiscardWorkoutModal
          visible={showDiscardModal}
          reduceMotion={reduceMotion}
          onClose={() => setShowDiscardModal(false)}
          onDiscard={async () => {
            const discardId = activeWorkout?.id;
            endWorkout();
            navigation.goBack();
            if (discardId) {
              try { await deleteIncompleteWorkout(discardId); }
              catch (e) { logError('ActiveWorkoutScreen.discardModal', e, { workoutId: discardId }); }
            }
          }}
        />

        {/* Edit / delete logged set sheet (D43 S1 slice 2: extracted to
            src/components/workout/EditLoggedSetModal.js, byte-identical --
            see that file's header comment). handleSaveEditedSet and
            handleDeleteEditedSet stay defined in this screen unchanged
            (pinned by ActiveWorkoutScreen.prReEval.guard.test.js) and are
            only wired down as props. */}
        <EditLoggedSetModal
          visible={editingSet != null}
          reduceMotion={reduceMotion}
          onClose={() => { setEditingSet(null); setEditValue(null); }}
          editValue={editValue}
          onChangeEditValue={setEditValue}
          units={units}
          exerciseType={activeExerciseType}
          weightStepKg={exercise?.incrementKg || exercise?.increment_kg || 2.5}
          onSave={handleSaveEditedSet}
          saving={saving}
          onDelete={handleDeleteEditedSet}
        />


      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// D43 S1: EmptyExerciseView moved to src/components/workout/
// EmptyExerciseView.js (imported above as a default export); it was never
// exported from this screen (a private in-file component), so there is no
// re-export to keep here -- the import above is the only call site.

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerSide: { width: workoutLoggerSize.headerSide, alignItems: 'flex-start', justifyContent: 'center' },
  // CL-6.2: a real 44pt frame under the top-corner controls (plus hitSlop);
  // purely transparent, no visual change.
  headerTapTarget: { minWidth: workoutLoggerSize.headerButtonMin, minHeight: workoutLoggerSize.headerButtonMin, alignItems: 'center', justifyContent: 'center' },
  headerSideRight: { width: workoutLoggerSize.headerSide, alignItems: 'flex-end', justifyContent: 'center' },
  headerFinishButton: {
    flexDirection: 'row',
    gap: spacing.xxs,
    minWidth: workoutLoggerSize.finishButtonMinWidth,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  timerText: { ...type.num('title'), color: colors.primary },
  starterBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    backgroundColor: withAlpha(colors.primary, alpha.ghost),
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  starterBannerText: { ...type.bodySm, flex: 1, color: colors.textSecondary },
  inlineActionPill: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: withAlpha(colors.primary, alpha.edge),
  },
  inlineActionPillText: { ...type.caption, color: colors.textPrimary },
  exerciseNav: { borderBottomWidth: 1, borderBottomColor: colors.border, maxHeight: workoutLoggerSize.exerciseNavMaxHeight },
  exerciseNavContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, gap: spacing.sm, alignItems: 'center' },
  navTab: { minHeight: workoutLoggerSize.exerciseTabMinHeight, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, backgroundColor: colors.surface2 },
  navTabActive: { backgroundColor: colors.primaryBg },
  navTabText: { ...type.label, color: colors.textSecondary },
  navTabTextActive: { color: colors.primary },
  navTabBadge: { width: workoutLoggerSize.exerciseTabBadge, height: workoutLoggerSize.exerciseTabBadge, borderRadius: circle(workoutLoggerSize.exerciseTabBadge), backgroundColor: colors.primaryFill, alignItems: 'center', justifyContent: 'center' },
  navTabBadgeText: { ...type.caption, color: colors.onPrimary, fontSize: fontSize.micro },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingTop: spacing.sm, gap: spacing.sm },
  // U-A-1: collapsed "N notes" rail above the set-entry card.
  notesRail: { gap: spacing.xs },
  notesChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    alignSelf: 'flex-start', minHeight: workoutLoggerSize.primaryActionMinHeight,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  notesChipText: { ...type.label, color: colors.textSecondary },
  notesExpanded: { gap: spacing.sm },
  exerciseHeader: { gap: spacing.xs },
  exerciseNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  exerciseName: { flex: 1, ...type.title, color: colors.textPrimary },
  swapSafe: { flex: 1, backgroundColor: colors.background },
  swapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  swapHeaderCopy: { flex: 1, minWidth: 0, gap: spacing.xxs },
  swapTitle: { ...type.title, color: colors.textPrimary },
  swapSubtitle: { ...type.caption, color: colors.textMuted },
  swapCloseBtn: {
    width: workoutLoggerSize.headerButtonMin,
    height: workoutLoggerSize.headerButtonMin,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  swapNote: { ...type.caption, color: colors.textMuted, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  swapListContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  swapItemGap: { height: spacing.sm },
  swapItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 62,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  swapItemIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface2,
    flexShrink: 0,
  },
  swapItemCopy: { flex: 1, minWidth: 0 },
  swapItemName: { ...type.label, color: colors.textPrimary, marginBottom: spacing.xxs },
  swapItemReason: { ...type.caption, color: colors.textMuted, lineHeight: 16 },
  swapBrowseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.md, minHeight: 44, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.surface },
  swapBrowseText: { ...type.label, color: colors.textPrimary },
  swapEmpty: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.xs },
  swapEmptyTitle: { ...type.label, color: colors.textPrimary },
  swapEmptyText: { ...type.caption, color: colors.textMuted },
  targetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 20 },
  targetText: { flex: 1, ...type.captionTight, color: colors.textMuted },
  setEntryCard: { padding: spacing.xs2, gap: spacing.xxs },
  setEntryCardWarmup: { borderColor: colors.warning, backgroundColor: colors.warningBg || colors.surface },
  // Short amber flash on the card border to ack a successful Log set tap.
  // Border width stays at 1 so the card doesn't shift its 2px layout for the
  // 700 ms flash, just the colour swaps.
  setEntryCardFlash: { borderColor: colors.primary },
  warmupBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  warmupBannerText: { ...type.caption, color: colors.warning },
  warmupOneTimeHint: {
    ...type.bodySm, color: colors.textMuted, paddingTop: spacing.xs,
  },
  firstSetHint: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderSubtle, padding: spacing.sm, marginBottom: spacing.xs },
  firstSetHintText: { ...type.caption, flex: 1, color: colors.textSecondary, lineHeight: 18 },
  // COMP-001 card header: three lines replace the old chip stack.
  orientationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 2 },
  orientationText: { ...type.label, color: colors.textSecondary },
  beatLine: { alignSelf: 'stretch', minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs, paddingVertical: 0 },
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
  beatLineCueText: { ...type.caption, color: colors.textSecondary },
  coachLine: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs2 },
  coachLineText: { ...type.bodySm, flex: 1, color: colors.primary },
  noteInput: { backgroundColor: colors.surface2, borderRadius: radius.md, padding: spacing.md, fontSize: fontSize.sm, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, minHeight: 60 },
  // Log set is the primary action on this screen, so it reads as a filled
  // amber button with a clear label rather than a tinted outline. Dark label
  // for contrast on amber (white on amber fails WCAG). Warm-ups stay visually
  // secondary via the tinted-outline override below.
  completeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderRadius: radius.md, minHeight: workoutLoggerSize.primaryActionMinHeight, paddingVertical: spacing.xs, backgroundColor: colors.primaryFill },
  btnDisabled: { opacity: 0.5 },
  completeBtnText: { ...type.bodyStrong, color: colors.onPrimary },
  completeBtnWarmup: { backgroundColor: colors.warningBg || colors.surface, borderWidth: 1, borderColor: colors.warning },
  completeBtnTextWarmup: { color: colors.warning },
  // Text button below the primary CTA (COMP-001): quiet, 44pt target.
  extraSetBtn: { alignItems: 'center', justifyContent: 'center', minHeight: workoutLoggerSize.primaryActionMinHeight },
  extraSetBtnText: { ...type.label, color: colors.textSecondary },
  // A2: "Log another set" promoted into the old primary slot as an OUTLINE
  // button, full-size so the muscle-memory tap logs a set, but not filled,
  // keeping the bottom bar's CTA the single filled-amber object on screen.
  extraSetBtnPromoted: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, borderRadius: radius.md, minHeight: workoutLoggerSize.primaryActionMinHeight, paddingVertical: spacing.xs,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  extraSetBtnPromotedText: { ...type.label, color: colors.textPrimary },
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
    minHeight: workoutLoggerSize.primaryActionMinHeight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: withAlpha(colors.primary, alpha.edge),
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
  clusterTitle: { ...type.label, color: colors.primary },
  clusterReps: { ...type.bodyStrong, color: colors.textPrimary },
  clusterInputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  clusterInput: {
    flex: 1, backgroundColor: colors.background, color: colors.textPrimary,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, ...type.body,
  },
  clusterAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    borderWidth: 1, borderColor: withAlpha(colors.primary, 0.502), borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    // Explicit transparent: the Button `tertiary` variant this now renders
    // as (components/Button.js) fills with colors.primaryBg by default;
    // this outlined-only look (border, no fill) is a deliberate quieter
    // treatment for the mini-set add action, so it must override that.
    backgroundColor: 'transparent',
  },
  clusterAddBtnText: { ...type.label, color: colors.primary },
  clusterCancel: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', minHeight: workoutLoggerSize.primaryActionMinHeight, paddingHorizontal: spacing.lg, borderRadius: radius.sm, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  clusterCancelText: { ...type.label, color: colors.textPrimary },
  overflowBtn: {
    width: workoutLoggerSize.overflowButton,
    height: workoutLoggerSize.overflowButton,
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
  loggedTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted },
  // D43 S1: loggedSetRow/loggedSetRowWarmup/loggedSetTextWarmup/setNumBadge/
  // setNumText/loggedSetText/loggedEst1RM (LoggedSetRow-exclusive) and
  // emptyView/emptyContent/emptyTitle/emptySubtitle/addFirstBtn/
  // addFirstBtnText (EmptyExerciseView-exclusive) moved verbatim to
  // src/components/workout/LoggedSetRow.js and .../EmptyExerciseView.js --
  // no other render in this screen used them, so nothing stays behind.
  sheetTitle: { ...type.title, color: colors.textPrimary, marginBottom: spacing.sm },
  sheetExplainer: { ...type.bodySm, color: colors.textSecondary, marginBottom: spacing.lg },
  sheetScroll: { flexShrink: 1, minHeight: 0 },
  sheetScrollBody: { paddingBottom: spacing.xs },
  sheetOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: workoutLoggerSize.compactSheetOptionMinHeight, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  // B8 gym-basics sheet
  rampBarTag: { ...type.caption, color: colors.textMuted },
  sheetOptionText: { flex: 1, gap: spacing.xxs },
  sheetOptionLabel: { ...type.bodyStrong, color: colors.textPrimary },
  sheetOptionLabelActive: { color: colors.primary },
  sheetOptionDesc: { ...type.caption, color: colors.textMuted },
  // D32 (2026-07-10, campaign item 20): the whole-workout reorder sheet.
  reorderSheetRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
  },
  reorderSheetRowInfo: { flex: 1, gap: spacing.xxs },
  reorderSheetRowName: { ...type.bodyStrong, color: colors.textPrimary },
  reorderSheetRowMeta: { ...type.caption, color: colors.textMuted },
  reorderSheetSupersetChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xxs,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: radius.sm,
    backgroundColor: colors.primaryBg, alignSelf: 'flex-start', marginTop: spacing.xxs,
  },
  reorderSheetSupersetChipText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.primary },
  reorderSheetChevrons: { flexDirection: 'column', alignItems: 'center', gap: spacing.xxs },
  reorderSheetChevronBtn: {
    width: 28, height: 28, alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.sm, backgroundColor: colors.surface2,
  },
  reorderSheetChevronBtnDisabled: { opacity: 0.3 },
  infoTargetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  infoTarget: { ...type.label, color: colors.primary },
  infoMuscle: { ...type.caption, color: colors.textMuted, marginBottom: spacing.sm },
  infoNotesLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted, marginBottom: spacing.xs, marginTop: spacing.sm },
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
  adjustedTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.primary },
  adjustedReason: { ...type.bodySm, color: colors.textPrimary },
  adjustedSignal: { ...type.caption, color: colors.textMuted },
  adjustedRevertBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs, paddingVertical: spacing.xs },
  adjustedRevertText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold },
  targetBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.successBg, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.success },
  // AY-2/D7: onSuccessBg is the text-on-tint ink (the flat `success` mark
  // fails 4.5:1 composited on successBg in light theme at every elevation).
  targetBannerText: { fontSize: fontSize.sm, color: colors.onSuccessBg, fontWeight: fontWeight.semibold, flex: 1 },
  // D44: transient banner naming the destination exercise after a
  // superset/giant-set group-driven focus change (forward jump or
  // round-return). Same shape as targetBanner above, primary tint instead of
  // success (this isn't a completion, just a navigation notice), and the
  // primary-on-primaryBg combination already used by navTabActive/
  // navTabTextActive elsewhere in this file.
  groupFocusBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primaryBg, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.primary, marginBottom: spacing.sm },
  groupFocusBannerText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold, flex: 1 },
  // Superset heads-up modal (shared with the unilateral-suggest modal below
  // -- both use supOverlay/supSheet/supSheetContent). D36a (item 17 modal
  // tails, 2026-07-10): this stays a raw Modal (education moment with its
  // own scroll behaviour, not a candidate for BottomSheet), but the bottom
  // padding was a fixed token with no safe-area inset -- the call sites now
  // widen contentContainerStyle to
  // `Math.max(spacing.xxl, insets.bottom + spacing.lg)`, same
  // Math.max(token, insets.bottom + token) contract as bottomBar/plateBar.
  // The static paddingBottom below stays as the pre-inset floor.
  supOverlay: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  supSheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, maxHeight: '88%', borderTopWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  supSheetScroll: { flexShrink: 1, minHeight: 0 },
  supSheetContent: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  supIconRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  supTitle: { ...type.h3, color: colors.textPrimary },
  supSubtitle: { ...type.bodySm, color: colors.textSecondary },
  supPairCard: { borderLeftWidth: 3, borderLeftColor: colors.primary, gap: spacing.xs },
  supPairRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  supPairChip: { width: 22, height: 22, borderRadius: circle(22), backgroundColor: colors.primaryFill, alignItems: 'center', justifyContent: 'center' },
  supPairChipText: { color: colors.onPrimary, fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  supPairName: { ...type.bodyStrong, color: colors.textPrimary, flex: 1 },
  supPairConnector: { width: 2, height: 14, backgroundColor: colors.border, marginLeft: 10 },
  supSteps: { gap: spacing.sm, marginTop: spacing.xs },
  supStep: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  supStepNum: { color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.bold, minWidth: 14 },
  supStepText: { ...type.bodySm, color: colors.textPrimary, flex: 1 },
  supTip: { ...type.caption, color: colors.textMuted, fontStyle: 'italic', marginTop: spacing.xs },
  supPrimaryBtn: { backgroundColor: colors.primaryFill, borderRadius: radius.md, minHeight: workoutLoggerSize.primaryActionMinHeight, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
  supPrimaryBtnText: { ...type.bodyStrong, color: colors.onPrimary },
  supSecondaryRow: { flexDirection: 'row', gap: spacing.sm },
  supSecondaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: 'transparent' },
  supSecondaryBtnText: { ...type.label, color: colors.textSecondary },

  // D43 S1 slice 2: stale*/discard*/keepTrainingBtn*/editSet* (all exclusive
  // to the stale-recovery, discard-confirm and edit-set modals) moved
  // verbatim to src/components/workout/StaleWorkoutModal.js,
  // .../DiscardWorkoutModal.js and .../EditLoggedSetModal.js -- no other
  // render in this screen used them, so nothing stays behind.
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

// CP-10 stage 3 (theming FINAL batch, 2026-07-10): buildLiveStyles is the
// shared "frozen base + live override" map for this screen's three
// function-component scopes (LoggedSetRow, ActiveWorkoutScreen,
// EmptyExerciseView) -- each calls `const t = useTheme(); const live =
// buildLiveStyles(t);` and appends `live.KEY` after `styles.KEY` in every
// style array, same pattern as batch 1/2 (Card.js/CoachBriefCard.js's
// buildBriefIconColor). Extracted to one function (rather than inlined
// three times) so the three scopes can never drift out of step with each
// other or with the frozen `styles` block above -- every key here mirrors
// only the colour/fontSize/type-bearing sub-properties of the matching
// frozen style, at identical rest values; pure layout keys (flex/gap/
// padding/width, no token) are correctly omitted, there is nothing to
// unfreeze for them.
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    header: { borderBottomColor: t.colors.border },
    headerFinishButton: { backgroundColor: t.colors.surface2, borderColor: t.colors.border },
    timerText: { ...t.type.num('title'), color: t.colors.primary },
    starterBanner: { backgroundColor: withAlpha(t.colors.primary, alpha.ghost), borderBottomColor: t.colors.border },
    starterBannerText: { ...t.type.bodySm, color: t.colors.textSecondary },
    inlineActionPill: { backgroundColor: t.colors.surface, borderColor: withAlpha(t.colors.primary, alpha.edge) },
    inlineActionPillText: { ...t.type.caption, color: t.colors.textPrimary },
    exerciseNav: { borderBottomColor: t.colors.border },
    navTab: { backgroundColor: t.colors.surface2 },
    navTabActive: { backgroundColor: t.colors.primaryBg },
    navTabText: { ...t.type.label, color: t.colors.textSecondary },
    navTabTextActive: { color: t.colors.primary },
    navTabBadge: { backgroundColor: t.colors.primaryFill },
    navTabBadgeText: { ...t.type.caption, color: t.colors.onPrimary, fontSize: t.fontSize.micro },
    notesChip: { backgroundColor: t.colors.surface, borderColor: t.colors.borderSubtle },
    notesChipText: { ...t.type.label, color: t.colors.textSecondary },
    exerciseName: { ...t.type.title, color: t.colors.textPrimary },
    swapSafe: { backgroundColor: t.colors.background },
    swapHeader: { borderBottomColor: t.colors.borderSubtle },
    swapTitle: { ...t.type.title, color: t.colors.textPrimary },
    swapSubtitle: { ...t.type.caption, color: t.colors.textMuted },
    swapCloseBtn: { backgroundColor: t.colors.surface, borderColor: t.colors.borderSubtle },
    swapNote: { ...t.type.caption, color: t.colors.textMuted },
    swapItem: { backgroundColor: t.colors.surface, borderColor: t.colors.borderSubtle },
    swapItemIcon: { backgroundColor: t.colors.surface2 },
    swapItemName: { ...t.type.label, color: t.colors.textPrimary },
    swapItemReason: { ...t.type.caption, color: t.colors.textMuted },
    swapBrowseBtn: { borderColor: t.colors.borderSubtle, backgroundColor: t.colors.surface },
    swapBrowseText: { ...t.type.label, color: t.colors.textPrimary },
    swapEmptyTitle: { ...t.type.label, color: t.colors.textPrimary },
    swapEmptyText: { ...t.type.caption, color: t.colors.textMuted },
    targetText: { ...t.type.captionTight, color: t.colors.textMuted },
    setEntryCardWarmup: { borderColor: t.colors.warning, backgroundColor: t.colors.warningBg || t.colors.surface },
    setEntryCardFlash: { borderColor: t.colors.primary },
    warmupBannerText: { ...t.type.caption, color: t.colors.warning },
    warmupOneTimeHint: { ...t.type.bodySm, color: t.colors.textMuted },
    firstSetHint: { backgroundColor: t.colors.surface, borderColor: t.colors.borderSubtle },
    firstSetHintText: { ...t.type.caption, color: t.colors.textSecondary },
    orientationText: { ...t.type.label, color: t.colors.textSecondary },
    beatLineLabel: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
    beatLineValue: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    beatLineGlyph: { ...t.type.bodyStrong, color: t.colors.primary },
    beatLineCue: { backgroundColor: t.colors.surface2, borderColor: t.colors.border },
    beatLineCueText: { ...t.type.caption, color: t.colors.textSecondary },
    coachLineText: { ...t.type.bodySm, color: t.colors.primary },
    noteInput: { backgroundColor: t.colors.surface2, fontSize: t.fontSize.sm, color: t.colors.textPrimary, borderColor: t.colors.border },
    completeBtn: { backgroundColor: t.colors.primaryFill },
    completeBtnText: { ...t.type.bodyStrong, color: t.colors.onPrimary },
    completeBtnWarmup: { backgroundColor: t.colors.warningBg || t.colors.surface, borderColor: t.colors.warning },
    completeBtnTextWarmup: { color: t.colors.warning },
    extraSetBtnText: { ...t.type.label, color: t.colors.textSecondary },
    extraSetBtnPromoted: { borderColor: t.colors.border, backgroundColor: t.colors.surface2 },
    extraSetBtnPromotedText: { ...t.type.label, color: t.colors.textPrimary },
    autoAdvanceRowText: { ...t.type.caption, color: t.colors.textMuted },
    autoAdvanceRowDot: { ...t.type.caption, color: t.colors.textMuted },
    autoAdvanceRowActionBtn: { backgroundColor: t.colors.surface, borderColor: withAlpha(t.colors.primary, alpha.edge) },
    autoAdvanceRowAction: { ...t.type.caption, color: t.colors.textPrimary },
    bottomBar: { backgroundColor: t.colors.background, borderTopColor: t.colors.borderSubtle },
    clusterBanner: { borderColor: withAlpha(t.colors.primary, 0.502), backgroundColor: t.colors.primaryBg },
    clusterTitle: { ...t.type.label, color: t.colors.primary },
    clusterReps: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    clusterInput: { backgroundColor: t.colors.background, color: t.colors.textPrimary, borderColor: t.colors.border, ...t.type.body },
    clusterAddBtn: { borderColor: withAlpha(t.colors.primary, 0.502) },
    clusterAddBtnText: { ...t.type.label, color: t.colors.primary },
    clusterCancel: { backgroundColor: t.colors.surface2, borderColor: t.colors.border },
    clusterCancelText: { ...t.type.label, color: t.colors.textPrimary },
    overflowBtn: { backgroundColor: t.colors.surface2, borderColor: t.colors.border },
    supersetChip: { backgroundColor: t.colors.primaryBg },
    supersetChipText: { fontSize: t.fontSize.xs, color: t.colors.primary },
    loggedTitle: { fontSize: t.fontSize.xs, color: t.colors.textMuted },
    // D43 S1: LoggedSetRow-exclusive (loggedSetRow/loggedSetRowWarmup/
    // loggedSetTextWarmup/setNumBadge/setNumText/loggedSetText/loggedEst1RM)
    // and EmptyExerciseView-exclusive (emptyView/emptyTitle/emptySubtitle/
    // addFirstBtn/addFirstBtnText) live overrides moved verbatim into each
    // component's own buildLiveStyles.
    sheetTitle: { ...t.type.title, color: t.colors.textPrimary },
    sheetExplainer: { ...t.type.bodySm, color: t.colors.textSecondary },
    sheetOption: { borderBottomColor: t.colors.border },
    rampBarTag: { ...t.type.caption, color: t.colors.textMuted },
    sheetOptionLabel: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    sheetOptionLabelActive: { color: t.colors.primary },
    sheetOptionDesc: { ...t.type.caption, color: t.colors.textMuted },
    reorderSheetRow: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    reorderSheetRowName: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    reorderSheetRowMeta: { ...t.type.caption, color: t.colors.textMuted },
    reorderSheetSupersetChip: { backgroundColor: t.colors.primaryBg },
    reorderSheetSupersetChipText: { color: t.colors.primary },
    reorderSheetChevronBtn: { backgroundColor: t.colors.surface2 },
    infoTarget: { ...t.type.label, color: t.colors.primary },
    infoMuscle: { ...t.type.caption, color: t.colors.textMuted },
    infoNotesLabel: { fontSize: t.fontSize.xs, color: t.colors.textMuted },
    infoNotes: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
    adjustedSection: { backgroundColor: t.colors.primaryBg, borderColor: withAlpha(t.colors.primary, 0.376) },
    adjustedTitle: { fontSize: t.fontSize.xs, color: t.colors.primary },
    adjustedReason: { ...t.type.bodySm, color: t.colors.textPrimary },
    adjustedSignal: { ...t.type.caption, color: t.colors.textMuted },
    adjustedRevertText: { fontSize: t.fontSize.sm, color: t.colors.primary },
    targetBanner: { backgroundColor: t.colors.successBg, borderColor: t.colors.success },
    targetBannerText: { fontSize: t.fontSize.sm, color: t.colors.onSuccessBg },
    groupFocusBanner: { backgroundColor: t.colors.primaryBg, borderColor: t.colors.primary },
    groupFocusBannerText: { fontSize: t.fontSize.sm, color: t.colors.primary },
    supOverlay: { backgroundColor: t.colors.scrim },
    supSheet: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    supTitle: { ...t.type.h3, color: t.colors.textPrimary },
    supSubtitle: { ...t.type.bodySm, color: t.colors.textSecondary },
    supPairCard: { borderLeftColor: t.colors.primary },
    supPairChip: { backgroundColor: t.colors.primaryFill },
    supPairChipText: { color: t.colors.onPrimary, fontSize: t.fontSize.xs },
    supPairName: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    supPairConnector: { backgroundColor: t.colors.border },
    supStepNum: { color: t.colors.primary, fontSize: t.fontSize.sm },
    supStepText: { ...t.type.bodySm, color: t.colors.textPrimary },
    supTip: { ...t.type.caption, color: t.colors.textMuted },
    supPrimaryBtn: { backgroundColor: t.colors.primaryFill },
    supPrimaryBtnText: { ...t.type.bodyStrong, color: t.colors.onPrimary },
    supSecondaryBtn: { borderColor: t.colors.border },
    supSecondaryBtnText: { ...t.type.label, color: t.colors.textSecondary },
    // D43 S1 slice 2: stale*/discard*/keepTrainingBtn*/editSet* live overrides
    // moved verbatim into StaleWorkoutModal.js's, DiscardWorkoutModal.js's
    // and EditLoggedSetModal.js's own buildLiveStyles.
    nextTimeBanner: { backgroundColor: t.colors.primaryBg, borderColor: withAlpha(t.colors.primary, 0.251) },
    nextTimeBannerText: { ...t.type.bodySm, color: t.colors.textPrimary },
    deloadBanner: { backgroundColor: t.colors.warningBg, borderColor: t.colors.warning },
    deloadBannerTitle: { fontSize: t.fontSize.sm, color: t.colors.warning },
    deloadBannerSub: { ...t.type.caption, color: t.colors.textMuted },
  };
}
