import React, { useState, useEffect, useRef } from 'react';
import { appAlert } from '../components/AppAlert';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, FlatList, BackHandler, AppState, Animated } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as hapticsVocab from '../lib/haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { colors, fontSize, fontWeight, spacing, radius, withAlpha, type } from '../styles/theme';
import SetEntry from '../components/SetEntry';
import RestTimer from '../components/RestTimer';
import ExercisePickerModal from '../components/ExercisePickerModal';
import DemoCard from '../components/DemoCard';
import CoachingNotesPanel from '../components/CoachingNotesPanel';
import { getSampleDemo } from '../lib/demos/sampleDemos';
import { getContextualCue } from '../lib/demos/cueEngine';
import { getExerciseWhyThis } from '../lib/whyThisTemplates';
import * as Speech from 'expo-speech';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { getAllCompletedSetsForExercise, createWorkoutSet, updateWorkout, deleteIncompleteWorkout, getAllExercises, getCurrentMesocycleWeek, getWeek1SetsForExercise, getLastNWorkoutSets, getNextTimeNotes, markNoteShown, getWorkoutSetsForWorkout, getExerciseById } from '../lib/database';
import { logError } from '../lib/errorLog';
import { audit } from '../lib/observability';
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
import { formatPerSide, loadUnilateralExercises } from '../lib/unilateral';
import { FORM_TIPS } from '../lib/formTips';
import InfoTooltip from '../components/InfoTooltip';
import { applyTimeCrunch } from '../lib/mesocycle';
import { getTimeCrunchMessage } from '../lib/whyThisTemplates';

const DEFAULT_SET = { weight: '', reps: 8, setType: 'straight', notes: '', rir: 2 };

// Spoken cues use a British MALE voice or none at all — the default Android TTS
// voice is a robotic female that undercuts the coaching tone. We resolve the
// best en-GB male voice once and cache it; if the device has no decent match we
// stay silent rather than speak in the wrong voice.
let _cueVoiceId; // undefined = unresolved, null = none suitable, string = chosen
async function resolveCueVoice() {
  if (_cueVoiceId !== undefined) return _cueVoiceId;
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const enGB = (voices || []).filter(v => /en[-_]GB/i.test(v.language || ''));
    const id = v => `${v.identifier || ''} ${v.name || ''}`.toLowerCase();
    // Known male en-GB identifiers (Google: gbb/gbd/rjs; generic 'male').
    const male = enGB.find(v => /\b(gbb|gbd|rjs|male)\b|男|#male/i.test(id(v)))
      || enGB.find(v => /(gbb|gbd|rjs|male)/i.test(id(v)));
    _cueVoiceId = male ? male.identifier : null;
  } catch (_) {
    _cueVoiceId = null;
  }
  return _cueVoiceId;
}
async function speakCue(text) {
  if (!text) return;
  const voice = await resolveCueVoice();
  if (!voice) return; // no decent British man → leave it out (founder's call)
  try {
    Speech.stop();
    Speech.speak(text, { language: 'en-GB', voice, pitch: 0.96, rate: 0.98 });
  } catch (_) { /* never let a cue crash the set */ }
}



const SET_TYPE_OPTIONS = [
  { value: 'straight', label: 'Working', description: 'Counts toward your weekly totals and progress tracking.' },
  { value: 'warmup', label: 'Warm-up', description: 'Lighter sets before your main work. Not counted in your weekly totals.' },
  { value: 'dropset', label: 'Drop set', description: 'Reduce the weight at failure and keep going. Counts toward weekly volume, not the set-target counter.' },
  { value: 'myo_reps', label: 'Myo-reps', description: 'A heavy activation set, then short mini-sets with a few breaths between. Counts toward volume and progress.' },
  { value: 'rest_pause', label: 'Rest-pause', description: 'Hit failure, rest 10 to 20 seconds, then squeeze out more reps. Counts toward volume and progress.' },
  { value: 'amrap', label: 'AMRAP', description: 'As many reps as possible, usually the last set. Counts toward volume and progress.' },
];

// Returns the set to use as the rep-progression anchor.
// If the same-indexed set was lighter than the session best, anchor to the best set
// so the pre-fill targets beating the overall high-water mark, not just that slot's history.
function getBestAnchorSet(sets, workingIdx) {
  if (!sets || sets.length === 0) return null;
  const working = sets.filter(s => (s.setType ?? s.set_type ?? 'straight') !== 'warmup');
  const indexed = working[workingIdx] ?? null;
  const best = working.reduce((b, s) => (!b || (s.weight || 0) > (b.weight || 0)) ? s : b, null);
  if (!indexed || !best || (indexed.weight || 0) >= (best.weight || 0)) return indexed ?? best;
  return best;
}

// Drop sets count for weekly volume but NOT toward the set-target progress.
// Only straight, amrap, myo-reps, rest-pause and superset sets tick the target counter.
function countProgressSets(sets) {
  return sets.filter(s => {
    const t = s.setType ?? s.set_type ?? 'straight';
    return t !== 'warmup' && t !== 'dropset';
  }).length;
}

/**
 * Compact set table (the Strong/Hevy idiom): SET | PREVIOUS | KG | REPS | ✓ in
 * ~40px rows instead of a card per set. Logged sets show their actuals;
 * remaining planned sets show last session's set as a dimmed ghost target, the
 * next one highlighted. Display only — input stays in SetEntry above, so the
 * logging flow itself is untouched. Memoised: the parent re-renders every
 * timer second.
 */
const SetTable = React.memo(function SetTable({ loggedSets, prevSets, plannedCount, units }) {
  const rows = [];
  let workingIdx = 0;
  for (let i = 0; i < loggedSets.length; i++) {
    const s = loggedSets[i];
    const isWarmup = s.setType === 'warmup';
    const prev = isWarmup ? null : prevSets?.[workingIdx] ?? null;
    rows.push({ key: `l${i}`, kind: 'logged', set: s, prev, num: isWarmup ? null : workingIdx + 1 });
    if (!isWarmup) workingIdx++;
  }
  const upcoming = Math.max(0, (plannedCount || 0) - workingIdx);
  for (let j = 0; j < upcoming; j++) {
    rows.push({
      key: `u${j}`, kind: j === 0 ? 'next' : 'todo',
      prev: prevSets?.[workingIdx + j] ?? null, num: workingIdx + j + 1,
    });
  }
  if (!rows.length) return null;

  return (
    <View style={styles.setTable}>
      <View style={styles.setTableHead}>
        <Text style={[styles.setTableHeadText, styles.colSet]}>Set</Text>
        <Text style={[styles.setTableHeadText, styles.colPrev]}>Previous</Text>
        <Text style={[styles.setTableHeadText, styles.colNum]}>{units}</Text>
        <Text style={[styles.setTableHeadText, styles.colNum]}>Reps</Text>
        <View style={styles.colTick} />
      </View>
      {rows.map(r => {
        const isWarmup = r.kind === 'logged' && r.set.setType === 'warmup';
        const perSide = r.kind === 'logged' ? formatPerSide(r.set.leftReps, r.set.rightReps) : null;
        return (
          <View key={r.key} style={[styles.setTableRow, r.kind === 'next' && styles.setTableRowNext]}>
            {isWarmup ? (
              <Ionicons name="flame" size={13} color={colors.warning} style={styles.colSet} />
            ) : (
              <Text style={[styles.setTableNum, styles.colSet]}>{r.num}</Text>
            )}
            <Text style={[styles.setTablePrev, styles.colPrev]} numberOfLines={1}>
              {r.prev ? `${r.prev.weight}×${r.prev.actualReps ?? r.prev.actual_reps ?? '–'}` : '–'}
            </Text>
            {r.kind === 'logged' ? (
              <>
                <Text style={[styles.setTableVal, styles.colNum]}>{r.set.weight}</Text>
                <Text style={[styles.setTableVal, styles.colNum]}>
                  {r.set.actualReps}{perSide ? `*` : ''}
                </Text>
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={isWarmup ? colors.warning : colors.success}
                  style={styles.colTick}
                />
              </>
            ) : (
              <>
                <Text style={[styles.setTableGhost, styles.colNum]}>{r.prev ? String(r.prev.weight) : '–'}</Text>
                <Text style={[styles.setTableGhost, styles.colNum]}>{r.prev ? String(r.prev.actualReps ?? r.prev.actual_reps ?? '–') : '–'}</Text>
                <Ionicons
                  name={r.kind === 'next' ? 'ellipse-outline' : 'ellipse-outline'}
                  size={14}
                  color={r.kind === 'next' ? colors.primary : colors.textDisabled}
                  style={styles.colTick}
                />
              </>
            )}
          </View>
        );
      })}
    </View>
  );
});

export default function ActiveWorkoutScreen({ navigation }) {
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
    startRestTimer: s.startRestTimer,
    showPRCelebration: s.showPRCelebration,
    endWorkout: s.endWorkout,
    workoutStartTime: s.workoutStartTime,
    lastActivityAt: s.lastActivityAt,
    updateLastActivity: s.updateLastActivity,
  })));
  const {
    user, units, activeWorkout, workoutExercises, currentExerciseIndex,
    setCurrentExerciseIndex, addExerciseToWorkout, addSetToCurrentExercise,
    startRestTimer, showPRCelebration, endWorkout, workoutStartTime,
    lastActivityAt, updateLastActivity,
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
  // Flashes the SetEntry card border amber for ~700ms after a successful
  // Log set, so the tap is acknowledged visibly. Resets via a tracked
  // timeout so cycling exercises mid-flash doesn't leave it stuck on.
  const [logFlash, setLogFlash] = useState(false);
  const logFlashTimeoutRef = useRef(null);
  const [detectedPRs, setDetectedPRs] = useState([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
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
  const [showExecution, setShowExecution] = useState(false);
  const [showStaleModal, setShowStaleModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapCandidates, setSwapCandidates] = useState([]);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  // "How to perform": the exercise demonstration sheet for the current lift.
  const [showHowTo, setShowHowTo] = useState(false);
  const [howToExercise, setHowToExercise] = useState(null);
  // Contextual cue: the ONE coaching line most relevant to this lift right now
  // (first-time / plateau / recovery / load-aware), picked deterministically.
  const [contextualCue, setContextualCue] = useState(null);
  const [speakCues, setSpeakCues] = useState(false);
  const [voiceReady, setVoiceReady] = useState(false); // a British male voice exists on this device
  const [timeCrunchActive, setTimeCrunchActive] = useState(false);
  const [timeCrunchMsg, setTimeCrunchMsg] = useState('');
  const [preCrunchSnapshot, setPreCrunchSnapshot] = useState(null);
  const [isDeloadWeek, setIsDeloadWeek] = useState(false);
  const [deloadDismissed, setDeloadDismissed] = useState(false);
  const [ghostSet, setGhostSet] = useState(null); // pre-fill from last session (same set index)
  const [nextTimeNotes, setNextTimeNotes] = useState([]);  // "next time" coaching notes for this routine
  // Cluster counter for myo-reps / rest-pause: 0 = activation set, 1+ = mini-set N+1
  const autoAdvanceRef = useRef(null);
  const sessionSetsRef = useRef([]);   // tracks sets in this session, used for PR detection
  const warmupHintSeenRef = useRef(false); // show one-liner warmup note only on first warmup of this session
  const finishingRef = useRef(false); // gates handleFinishWorkout so a rapid double-tap can't double-finish
  const shownNoteIdsRef = useRef(new Set()); // note IDs already shown in this session

  const scrollRef = useRef(null);
  const insets = useSafeAreaInsets();
  const timerRef = useRef(null);

  // First-use info tip highlight
  const [showInfoTipPulse, setShowInfoTipPulse] = useState(false);
  const infoPulseAnim = useRef(new Animated.Value(1)).current;
  const infoPulseLoop = useRef(null);

  const currentEntry = workoutExercises[currentExerciseIndex];
  const exercise = currentEntry?.exercise;
  const routineExercise = currentEntry?.routineExercise;

  // Open the "How to perform" demonstration sheet for the current lift. Loads
  // the full exercise row by id so the demo media + structured cues are present
  // even if the in-memory workout entry only carried a partial exercise object.
  async function openHowTo() {
    if (!exercise?.id) return;
    setHowToExercise(exercise);   // show immediately with what we have
    setShowHowTo(true);
    try {
      const full = await getExerciseById(exercise.id);
      if (full) setHowToExercise(full);
    } catch (_) { /* keep the partial */ }
  }
  const isLastExercise = currentExerciseIndex === workoutExercises.length - 1;

  // Superset pairing: two adjacent entries sharing a supersetGroupId are paired.
  const currentSGI = workoutExercises[currentExerciseIndex]?.supersetGroupId ?? null;
  const nextSGI = workoutExercises[currentExerciseIndex + 1]?.supersetGroupId ?? null;
  const isPairedWithNext = currentSGI != null && currentSGI === nextSGI;
  const pairedExerciseName = currentSGI != null
    ? (workoutExercises.find((e, i) => i !== currentExerciseIndex && e.supersetGroupId === currentSGI)?.exercise?.name ?? '')
    : '';

  function handleNextExercise() {
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
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
            if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
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
    updatedExercises[currentExerciseIndex] = {
      ...updatedExercises[currentExerciseIndex],
      exercise: newExercise,
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
          Animated.timing(infoPulseAnim, { toValue: 1.35, duration: 700, useNativeDriver: true }),
          Animated.timing(infoPulseAnim, { toValue: 1.0,  duration: 700, useNativeDriver: true }),
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
      // Count only WORKING sets toward the index. Including warm-ups
      // produced "Set 3 of 2" on the lock-screen / persistent
      // notification when the user logged a warm-up before the first
      // working set. totalSetsForExercise is the *working* target.
      currentSetIndex: countProgressSets(loggedSets) + 1,
      totalSetsForExercise: routineExercise?.recommendedSets,
      exerciseName: exercise?.name,
    }).catch(() => {});
    // Intentionally exclude elapsedSeconds, that's handled by
    // the throttled effect below. This effect responds only to
    // user-driven state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkout?.id, loggedSets?.length, exercise?.name, routineExercise?.recommendedSets, workoutStartTime]);

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
      // Count only WORKING sets toward the index. Including warm-ups
      // produced "Set 3 of 2" on the lock-screen / persistent
      // notification when the user logged a warm-up before the first
      // working set. totalSetsForExercise is the *working* target.
      currentSetIndex: countProgressSets(loggedSets) + 1,
      totalSetsForExercise: routineExercise?.recommendedSets,
      exerciseName: exercise?.name,
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedSeconds, activeWorkout, loggedSets?.length, exercise?.name, routineExercise?.recommendedSets, workoutStartTime]);

  // Dismiss the persistent notification on screen unmount. Belt-and-
  // braces because endWorkout() / handleFinishWorkout also clear it,
  // but the unmount cleanup catches navigation-away cases.
  useEffect(() => () => {
    // eslint-disable-next-line global-require
    const { dismissActiveWorkoutNotification } = require('../lib/notifications/activeWorkout');
    dismissActiveWorkoutNotification().catch(() => {});
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

      // Pre-fill: use target for the current working set position.
      // Reps: prefer (prev session reps + 1) when it sits inside the target range
      // so the input starts at the beat-chip suggestion, not the range floor.
      const currentWorkingCount = allLoggedForExercise.filter(s => s.setType !== 'warmup').length;
      const currentTarget = computed[currentWorkingCount];
      if (currentTarget) {
        const prevSet = getBestAnchorSet(prev, currentWorkingCount);
        const beatRep = prevSet ? prevSet.actualReps + 1 : null;
        const prefillReps = (beatRep && beatRep >= currentTarget.repsMin && beatRep <= currentTarget.repsMax)
          ? beatRep
          : currentTarget.repsMin;
        setCurrentSet({
          ...DEFAULT_SET,
          weight: currentTarget.weight,
          reps: prefillReps,
        });
      } else if (prev.length > 0) {
        const lastSet = prev[prev.length - 1];
        setCurrentSet({
          ...DEFAULT_SET,
          weight: lastSet.weight != null ? lastSet.weight : '',
          reps: lastSet.actualReps || DEFAULT_SET.reps,
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
    }

    loadHistory();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise?.id, currentExerciseIndex]);

  // Contextual cue for the current lift; optionally spoken (eyes-free, opt-in).
  useEffect(() => {
    let cancelled = false;
    setContextualCue(null);
    if (!exercise?.id || !user?.id) return undefined;
    getContextualCue(user.id, exercise, { repMin: routineExercise?.repMin ?? null })
      .then(cue => {
        if (cancelled || !cue) return;
        setContextualCue(cue);
        if (speakCues && cue.cue) {
          speakCue(`${cue.headline ? cue.headline + '. ' : ''}${cue.cue}`);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; Speech.stop(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise?.id, user?.id]);

  useEffect(() => {
    AsyncStorage.getItem('@volyume_speak_cues_v1')
      .then(v => setSpeakCues(v === 'true'))
      .catch(() => {});
    // Only expose the audio controls if the device actually has a usable
    // British male voice; otherwise the feature stays hidden, not robotic.
    resolveCueVoice().then(id => setVoiceReady(!!id)).catch(() => {});
  }, []);

  function toggleSpeakCues() {
    setSpeakCues(prev => {
      const next = !prev;
      AsyncStorage.setItem('@volyume_speak_cues_v1', String(next)).catch(() => {});
      if (!next) Speech.stop();
      return next;
    });
  }


  async function handleCompleteSet(overrides = {}) {
    if (!exercise || !activeWorkout) return;
    // Reps required (a cluster override carries its own total). A per-side
    // (unilateral) exercise logs one reps value, done on both sides at the
    // same weight, so it validates and stores like any other set: one
    // weight, one rep count, no separate left/right.
    // Parse reps up front and validate as a real number. The old check
    // (`currentSet.reps < 1`) was a string comparison, so a pasted or
    // non-numeric value ("abc") gave NaN < 1 === false and slipped through,
    // logging a NaN-rep set that then poisoned tonnage, PRs and the summary.
    const repsNum = overrides.actualReps != null
      ? overrides.actualReps
      : parseInt(currentSet.reps, 10);
    if (!Number.isFinite(repsNum) || repsNum < 1) {
      appAlert('Enter reps', 'Please enter the number of reps completed.');
      return;
    }
    // Cluster sets (myo-reps / rest-pause) commit the whole cluster as one
    // row: actualReps is the summed total and notes carry the breakdown.
    // Both arrive via `overrides` from finishCluster.
    const effectiveReps = repsNum;
    const effectiveNotes = overrides.notes ?? (noteText || null);
    // Weight is required unless this is a bodyweight movement. A blank or
    // non-numeric field means the user hasn't entered a load yet, block
    // rather than silently saving a 0 kg set.
    const isBodyweight = /body\s*weight/i.test(exercise.equipment || '');
    const weightNum = parseFloat(currentSet.weight);
    if (!isBodyweight && (currentSet.weight === '' || currentSet.weight == null || isNaN(weightNum) || weightNum <= 0)) {
      appAlert('Enter weight', `Enter the weight used (in ${units}) before completing this set.`);
      return;
    }

    setSaving(true);
    hapticsVocab.setLogged();

    try {
      // WK-3: number sets within their own kind so working sets read 1,2,3
      // regardless of any warm-ups logged first (the old loggedSets.length+1
      // counted warm-ups, so the first working set after a warm-up was "2").
      // Warm-ups get their own 1,2 sequence; set_type distinguishes them.
      const isWarmupSet = (currentSet.setType ?? 'straight') === 'warmup';
      const setNumber = loggedSets.filter(s =>
        ((s.setType ?? s.set_type ?? 'straight') === 'warmup') === isWarmupSet
      ).length + 1;

      const savedSet = await createWorkoutSet({
        userId: user.id,
        workoutId: activeWorkout.id,
        exerciseId: exercise.id,
        setNumber,
        setType: currentSet.setType || 'straight',
        targetRepsMin: routineExercise?.recommendedRepsMin ?? null,
        targetRepsMax: routineExercise?.recommendedRepsMax ?? null,
        actualReps: effectiveReps,
        weight: parseFloat(currentSet.weight) || 0,
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
        weight: parseFloat(currentSet.weight) || 0,
        rir: currentSet.rir ?? null,
        rpe: null,
        leftReps: null,
        rightReps: null,
      };

      const newLoggedSets = [...loggedSets, setData];
      setLoggedSets(newLoggedSets);
      addSetToCurrentExercise(setData);
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

      // PR Detection, check BEFORE adding current set to the session ref so it
      // can never match itself.  sessionSetsRef is a plain ref so it's never stale
      // the way React state can be between renders.
      const prHistory = [
        ...allTimeSets,
        ...sessionSetsRef.current.filter(s => s.exerciseId === exercise.id),
      ];
      sessionSetsRef.current = [...sessionSetsRef.current, setData];
      const prs = detectPR(setData, prHistory, exercise, units);
      if (prs.length > 0) {
        showPRCelebration({ ...prs[0], exerciseName: exercise.name });
        // Keep one PR per exercise (the most significant), so a multi-set,
        // multi-exercise session reports a handful of PRs, not dozens. The
        // per-set celebration above still fires each time a new best lands.
        setDetectedPRs(prev => bestPRPerExercise([
          ...prev,
          ...prs.map(p => ({ ...p, exerciseId: exercise.id, exerciseName: exercise.name, units })),
        ]));
      }

      // Pre-fill next set from per-set targets (same beat-rep logic as initial load)
      if (currentSet.setType !== 'warmup') {
        const nextWorkingCount = countProgressSets(newLoggedSets);
        const nextTarget = setTargets[nextWorkingCount];
        if (nextTarget) {
          const prevSetForNext = getBestAnchorSet(prevSets, nextWorkingCount);
          const beatRep = prevSetForNext ? prevSetForNext.actualReps + 1 : null;
          const prefillReps = (beatRep && beatRep >= nextTarget.repsMin && beatRep <= nextTarget.repsMax)
            ? beatRep
            : nextTarget.repsMin;
          setCurrentSet(cs => ({ ...cs, weight: nextTarget.weight, reps: prefillReps }));
        }
      }

      // Update last activity timestamp
      updateLastActivity();

      // Superset auto-jump: if this exercise is paired with another, jump to the
      // pair WITHOUT starting the rest timer. The rest happens after BOTH halves
      // of the pair are logged. Warmups are per-exercise so they don't trigger
      // the jump. `finally` below clears `saving`.
      if (currentSet.setType !== 'warmup') {
        const sgi = workoutExercises[currentExerciseIndex]?.supersetGroupId;
        const pairIdx = sgi != null
          ? workoutExercises.findIndex((e, i) => i !== currentExerciseIndex && e.supersetGroupId === sgi)
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

      // Start rest timer with per-exercise duration
      startRestTimer(routineExercise?.restSeconds || 90);

      // Auto-advance to next exercise when target sets just completed
      const newWorkingCount = countProgressSets(newLoggedSets);
      const justHitTarget = targetSets && newWorkingCount >= targetSets && workingLogged < targetSets;
      if (justHitTarget && !isLastExercise) {
        if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
        autoAdvanceRef.current = setTimeout(() => {
          handleNextExercise();
        }, 1800);
      }

      // Clear ghost, will be re-computed for the next set index on the next render cycle
      setGhostSet(null);

      // Prepare next set
      setNoteText('');
      setShowNoteInput(false);
      // If warmup was just completed, mark hint seen and auto-switch to working set
      if (currentSet.setType === 'warmup') {
        warmupHintSeenRef.current = true;
        const firstTarget = setTargets[0];
        if (firstTarget) {
          const anchorSet0 = getBestAnchorSet(prevSets, 0);
          const beatRep = anchorSet0 ? anchorSet0.actualReps + 1 : null;
          const prefillReps = (beatRep && beatRep >= firstTarget.repsMin && beatRep <= firstTarget.repsMax)
            ? beatRep
            : firstTarget.repsMin;
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
      appAlert(
        'Couldn\'t save set',
        'Your set wasn\'t saved. Tap Log set to retry. Tell me if this keeps happening: ' + (e?.message ?? 'unknown error'),
      );
    } finally {
      setSaving(false);
    }
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
    setTimeCrunchMsg('');
    setPreCrunchSnapshot(null);
    hapticsVocab.commit();
  }

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
      'Finish Workout?',
      `You've logged ${workoutExercises.reduce((sum, e) => sum + (e.sets?.length ?? 0), 0)} sets across ${workoutExercises.length} exercises.`,
      [
        { text: 'Keep Going', style: 'cancel', onPress: () => { finishingRef.current = false; } },
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
              // count toward the workout total. Those rows stay in the DB and
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
              const sessionName = snapshotExercises.length > 0
                ? snapshotExercises.slice(0, 2).map(e => e.exercise?.name?.split(' ')[0]).filter(Boolean).join(' & ')
                : null;
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
              // Training Partners: republish this week's derived consistency
              // signal. No-op unless the feature is enabled for the user; the
              // server counts real completed workouts, so this only nudges the
              // refresh. Fire-and-forget.
              try {
                const uid = useAppStore.getState().user?.id;
                if (uid) {
                  // eslint-disable-next-line global-require
                  require('../lib/partners/publishSignal').publishMyWeeklySignal(uid);
                }
              } catch (_) { /* tolerate */ }
              endWorkout();
              // eslint-disable-next-line global-require
              try { require('../lib/notifications/activeWorkout').dismissActiveWorkoutNotification(); } catch (_) {}
              navigation.replace('WorkoutSummary', {
                workoutId: activeWorkout.id,
                routineId: activeWorkout.routineId || null,
                startedAt: activeWorkout.startedAt,
                endedAt: Date.now(),
                durationMinutes: Math.round(snapshotElapsed / 60),
                exerciseCount: snapshotExercises.length,
                setCount: totalSets,
                workingSetCount,
                tonnage,
                exerciseNames: snapshotExercises.map(e => e.exercise?.name).filter(Boolean),
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

  const targetSets = routineExercise?.recommendedSets;
  const workingLogged = countProgressSets(loggedSets);
  const targetComplete = targetSets && workingLogged >= targetSets;

  // The "how to" demonstration sheet. Defined once and rendered in BOTH the
  // empty-state and the main return — previously it lived only in the
  // !exercise branch, so the Info / How-to button did nothing during an
  // actual workout (the modal that listens to showHowTo was never mounted).
  const howToSheet = (
    <Modal
      visible={showHowTo}
      animationType="slide"
      onRequestClose={() => setShowHowTo(false)}
    >
      <SafeAreaView style={styles.howToSafe} edges={['top', 'bottom']}>
        <View style={styles.howToHeader}>
          <Text style={styles.howToTitle} numberOfLines={1}>{howToExercise?.name}</Text>
          <TouchableOpacity
            onPress={() => setShowHowTo(false)}
            style={styles.howToClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.howToContent}>
          <DemoCard
            exercise={{
              ...howToExercise,
              primaryMuscleLabel:
                MUSCLE_DISPLAY_NAMES[howToExercise?.primaryMuscle ?? howToExercise?.primary_muscle]
                ?? howToExercise?.primaryMuscle ?? null,
            }}
            localFrames={getSampleDemo(howToExercise?.name)?.frames}
            localVideo={getSampleDemo(howToExercise?.name)?.video}
          />
          {howToExercise?.subregion ? (
            <View style={styles.whyThisCard}>
              <Ionicons name="compass-outline" size={16} color={colors.primary} style={{ marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.whyThisLabel}>Why this exercise</Text>
                <Text style={styles.whyThisText}>
                  {getExerciseWhyThis(howToExercise.name, howToExercise.subregion)}
                  {(howToExercise?.sfr ?? howToExercise?.stimulusToFatigueRatio) >= 4
                    ? ' High training payoff for the effort it costs.' : ''}
                </Text>
              </View>
            </View>
          ) : null}
          <CoachingNotesPanel
            formCues={howToExercise?.formCues ?? getSampleDemo(howToExercise?.name)?.formCues}
            commonMistakes={howToExercise?.commonMistakes ?? getSampleDemo(howToExercise?.name)?.commonMistakes}
            formTip={howToExercise?.name ? (FORM_TIPS[howToExercise.name] ?? null) : null}
            coachingCue={howToExercise?.cue || null}
            notes={howToExercise?.notes}
          />
          {voiceReady ? (
            <TouchableOpacity
              style={styles.speakCuesRow}
              onPress={toggleSpeakCues}
              accessibilityRole="switch"
              accessibilityState={{ checked: speakCues }}
              accessibilityLabel="Speak cues at the start of each exercise"
            >
              <Ionicons
                name={speakCues ? 'volume-high' : 'volume-mute-outline'}
                size={18}
                color={speakCues ? colors.primary : colors.textMuted}
              />
              <Text style={styles.speakCuesText}>
                Speak the cue when each exercise starts: {speakCues ? 'on' : 'off'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

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
          actionLabel={pickerMode === 'swap' ? 'Swap In' : 'Add to Workout'}
        />
        {howToSheet}
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
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Cancel workout"
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.headerCenter}>
            <Text style={styles.timerText}>{elapsedStr}</Text>
          </View>
          <View style={styles.headerSideRight}>
            <TouchableOpacity
              onPress={handleFinishWorkout}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Finish workout"
            >
              <Text style={styles.finishBtn}>Finish</Text>
            </TouchableOpacity>
          </View>
        </View>

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
                >
                  {entry.exercise?.name?.split(' ').slice(0, 2).join(' ')}
                </Text>
                {entry.sets?.length > 0 && (
                  <View style={styles.navTabBadge}>
                    <Text style={styles.navTabBadgeText}>{entry.sets.length}</Text>
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
              <TouchableOpacity
                style={styles.exerciseNameTap}
                onPress={openHowTo}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${exercise.name}. Tap to see the demonstration`}
              >
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <Ionicons name="play-circle" size={18} color={colors.primary} style={styles.exerciseNamePlay} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.swapBtn}
                onPress={handleOpenSwap}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Swap exercise"
              >
                <Ionicons name="swap-horizontal" size={16} color={colors.primary} />
                <Text style={styles.swapBtnText}>Swap</Text>
              </TouchableOpacity>
            </View>
            {/* Muscle + "How to" share one compact row: the header cost
                100-120px before the first input (design audit 2026-06-09);
                folding these saves ~32px on the highest-traffic screen. */}
            <View style={styles.exerciseSubRow}>
              <Text style={styles.exerciseMuscle}>
                {MUSCLE_DISPLAY_NAMES[exercise.primaryMuscle ?? exercise.primary_muscle] ??
                  ((exercise.primaryMuscle || exercise.primary_muscle || '').charAt(0).toUpperCase() +
                    (exercise.primaryMuscle || exercise.primary_muscle || '').slice(1).replace(/_/g, ' '))}
                {' · primary muscle'}
              </Text>
              <TouchableOpacity
                style={styles.howToBtn}
                onPress={openHowTo}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={`How to perform ${exercise.name}`}
              >
                <Ionicons name="play-circle-outline" size={14} color={colors.primary} />
                <Text style={styles.howToBtnText}>How to</Text>
              </TouchableOpacity>
            </View>
            {currentSGI != null && !!pairedExerciseName && (
              <View style={styles.supersetChip}>
                <Ionicons name="link" size={11} color={colors.primary} />
                <Text style={styles.supersetChipText}>
                  Superset {currentSGI} · alternates with {pairedExerciseName}
                </Text>
              </View>
            )}
          </View>

          {/* Contextual cue: the one line that matters for this lift right now */}
          {contextualCue?.cue ? (
            <View style={styles.cueBanner}>
              <Ionicons
                name={contextualCue.kind === 'plateau' ? 'trending-up-outline'
                  : contextualCue.kind === 'recovery' ? 'battery-charging-outline'
                  : contextualCue.kind === 'first_time' ? 'school-outline' : 'bulb-outline'}
                size={16}
                color={colors.primary}
                style={{ marginTop: 1 }}
              />
              <Text style={styles.cueBannerText} numberOfLines={3}>
                {contextualCue.headline ? (
                  <Text style={styles.cueBannerHeadline}>{contextualCue.headline}. </Text>
                ) : null}
                {contextualCue.cue}
              </Text>
              {voiceReady ? (
                <TouchableOpacity
                  onPress={async () => {
                    try { if (await Speech.isSpeakingAsync()) { Speech.stop(); return; } } catch (_) { /* fall through to speak */ }
                    speakCue(`${contextualCue.headline ? contextualCue.headline + '. ' : ''}${contextualCue.cue}`);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Hear this cue, tap again to stop"
                >
                  <Ionicons name="volume-medium-outline" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {/* Next-time coaching notes */}
          {nextTimeNotes.map(note => (
            <View key={note.id} style={styles.nextTimeBanner}>
              <Ionicons name="bulb-outline" size={16} color={colors.primary} style={{ marginTop: 1 }} />
              <Text style={styles.nextTimeBannerText} numberOfLines={4}>{note.note}</Text>
              <TouchableOpacity
                onPress={async () => {
                  try { await markNoteShown(note.id); } catch (_e) {}
                  setNextTimeNotes(prev => prev.filter(n => n.id !== note.id));
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Dismiss note"
              >
                <Text style={styles.nextTimeBannerDismiss}>Got it</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* Deload Week Banner */}
          {isDeloadWeek && !deloadDismissed && (
            <View style={styles.deloadBanner}>
              <View style={styles.deloadBannerLeft}>
                <Ionicons name="battery-charging-outline" size={18} color={colors.warning} />
                <View>
                  <Text style={styles.deloadBannerTitle}>Recovery week</Text>
                  <Text style={styles.deloadBannerSub}>Light loads · full recovery · no PRs</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setDeloadDismissed(true)}
                accessibilityRole="button"
                accessibilityLabel="Dismiss deload banner"
              >
                <Text style={styles.deloadSkip}>Skip</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Target */}
          {routineExercise && (
            <View style={styles.targetRow}>
              <Ionicons name="flag-outline" size={14} color={colors.textMuted} />
              <Text style={styles.targetText}>
                Target: {routineExercise.recommendedSets || 3} sets · {routineExercise.recommendedRepsMin}–{routineExercise.recommendedRepsMax} reps
              </Text>
            </View>
          )}

          {/* Rest timer, sits ABOVE the SetEntry card, in the slot vacated
              by the old weekly-sets calendar row. Stays in the user's
              eye-line with the inputs but doesn't clutter the card border.
              The timer only renders when active so this space is normally
              empty. */}
          <RestTimer />

          {/* Target complete banner */}
          {targetComplete && (
            <View style={styles.targetBanner}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.targetBannerText}>
                Target reached: {targetSets} working set{targetSets !== 1 ? 's' : ''} done
              </Text>
            </View>
          )}

          {/* Set Entry */}
          <View style={[
            styles.setEntryCard,
            currentSet.setType === 'warmup' && styles.setEntryCardWarmup,
            logFlash && styles.setEntryCardFlash,
          ]}>
            {currentSet.setType === 'warmup' && (
              <View style={styles.warmupBanner}>
                <Ionicons name="flame-outline" size={14} color={colors.warning} />
                <Text style={styles.warmupBannerText}>Warm-up · not counted in your totals</Text>
              </View>
            )}
            {currentSet.setType === 'warmup' && !warmupHintSeenRef.current && (
              <Text style={styles.warmupOneTimeHint}>
                Get the muscles and joints ready. Light weight, easy reps. Tap Done when you're ready to work.
              </Text>
            )}
            <Text style={styles.setEntryTitle}>
              {currentSet.setType === 'warmup'
                ? 'Warm-up set'
                : isDeloadWeek
                  ? `Light set ${workingLogged + 1} · Easy`
                  : routineExercise?.recommendedSets
                    ? `Set ${workingLogged + 1} / ${routineExercise.recommendedSets}`
                    : `Set ${workingLogged + 1}`}
            </Text>
            {currentSet.setType !== 'warmup' && setTargets[workingLogged] && (
              <View style={styles.inlineTargetChip}>
                <Ionicons name="flag-outline" size={11} color={colors.primary} />
                <Text style={styles.inlineTargetText}>
                  Target: {setTargets[workingLogged].weight}{units} × {setTargets[workingLogged].repsMin === setTargets[workingLogged].repsMax ? setTargets[workingLogged].repsMin : `${setTargets[workingLogged].repsMin}–${setTargets[workingLogged].repsMax}`}
                  {setTargets[workingLogged].action === 'increase' ? ' ↑' : setTargets[workingLogged].action === 'decrease' ? ' ↓' : ''}
                </Text>
              </View>
            )}
            {currentSet.setType !== 'warmup' && targetReason && (
              <View style={styles.coachReasonChip}>
                <Ionicons name="sparkles-outline" size={11} color={colors.primary} />
                <Text style={styles.coachReasonText}>{targetReason}</Text>
              </View>
            )}
            {/* Stalled-progress nudge: if the user has done the same
                weight & reps for the same exercise across the last 3
                sessions, the suggestion engine isn't doing enough on
                its own, pull-back the loop and offer a concrete next
                step. Only shown on the first working set of an
                exercise so it doesn't blare repeatedly. */}
            {currentSet.setType !== 'warmup' && workingLogged === 0 && (() => {
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
              const bumpKg = 2.5; // gym weights are kg-only
              return (
                <View style={styles.stalledChip}>
                  <Ionicons name="trending-up-outline" size={12} color={colors.warning} />
                  <Text style={styles.stalledChipText}>
                    Same load 3 sessions running. Try {w0 + bumpKg}{units} × {Math.max(1, r0 - 1)}, or stick at {w0}{units} for {r0 + 1} reps.
                  </Text>
                </View>
              );
            })()}
            {currentSet.setType !== 'warmup' && prevSets[workingLogged] && (() => {
              const prev = prevSets[workingLogged];
              const cw = parseFloat(currentSet.weight) || 0;
              const sameWeight = Math.abs(cw - prev.weight) < 0.1;
              return (
                <View style={styles.beatChip}>
                  <Ionicons name="time-outline" size={11} color={colors.textMuted} />
                  <Text style={styles.beatChipText}>
                    {sameWeight
                      ? `Last time: ${prev.weight}${units} × ${prev.actualReps} reps. Can you hit ${prev.actualReps + 1}?`
                      : `Last time: ${prev.weight}${units} × ${prev.actualReps} reps`}
                  </Text>
                </View>
              );
            })()}
            {/* Quick-repeat: pre-fill the entry card from the most
                recent logged set so the user doesn't have to type the
                same numbers twice in a row. Hidden when the entry
                already matches the last logged set (no value) or when
                no sets have been logged this session yet. */}
            {(() => {
              const last = loggedSets[loggedSets.length - 1];
              if (!last) return null;
              const cw = parseFloat(currentSet.weight) || 0;
              const cr = parseInt(currentSet.reps, 10) || 0;
              if (Math.abs(cw - (last.weight ?? 0)) < 0.01 && cr === (last.actualReps ?? 0)) return null;
              return (
                <TouchableOpacity
                  style={styles.repeatLastBtn}
                  onPress={() => {
                    hapticsVocab.setLogged();
                    setCurrentSet(s => ({
                      ...s,
                      weight: String(last.weight ?? 0),
                      reps: last.actualReps ?? s.reps,
                      isGhost: false,
                    }));
                  }}
                  hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Repeat last set: ${last.weight}${units} times ${last.actualReps}`}
                >
                  <Ionicons name="repeat-outline" size={13} color={colors.textSecondary} />
                  <Text style={styles.repeatLastText}>
                    Repeat last: {last.weight}{units} × {last.actualReps}
                  </Text>
                </TouchableOpacity>
              );
            })()}
            {currentSet.isGhost && ghostSet && (
              <View style={styles.ghostChip}>
                <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                <Text style={styles.ghostChipText}>Pre-filled from last session. Tap to confirm.</Text>
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
              onChange={(next) => {
                if (!next.isGhost && currentSet.isGhost) setGhostSet(null);
                setCurrentSet(next);
              }}
              units={units}
              onOpenSetTypePicker={() => setShowSetTypePicker(true)}
              isWarmup={currentSet.setType === 'warmup'}
            />

            {showNoteInput ? (
              <TextInput
                style={styles.noteInput}
                value={noteText}
                onChangeText={setNoteText}
                placeholder="Add a note..."
                placeholderTextColor={colors.textMuted}
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
                accessibilityLabel="Finish cluster and log the set"
              >
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                <Text style={styles.completeBtnText}>Finish cluster</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={cancelCluster} style={styles.clusterCancel} accessibilityLabel="Cancel cluster">
                <Text style={styles.clusterCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Action Buttons */}
          {cluster ? null : targetComplete ? (
            <>
              {isLastExercise ? (
                <TouchableOpacity
                  testID="volyume-btn-finish-primary"
                  style={styles.completeBtn}
                  onPress={handleFinishWorkout}
                  accessibilityRole="button"
                  accessibilityLabel="Finish workout"
                >
                  <Ionicons name="checkmark-done" size={20} color={colors.success} />
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
                  <Ionicons name="arrow-forward-circle" size={20} color={colors.primary} />
                  <Text style={styles.completeBtnText}>Next exercise</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                testID="volyume-btn-extra-set"
                style={[styles.extraSetBtn, saving && styles.btnDisabled]}
                onPress={handleCompleteSet}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel="Complete extra set"
              >
                <Text style={styles.extraSetBtnText}>+ Complete Extra Set</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              testID="volyume-btn-complete-set"
              style={[styles.completeBtn, saving && styles.btnDisabled, currentSet.setType === 'warmup' && styles.completeBtnWarmup]}
              onPress={() => {
                const uni = exercise ? unilateralExercises.has(exercise.id) : false;
                if (isClusterType(currentSet.setType) && !uni) return startCluster();
                return handleCompleteSet();
              }}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel={
                currentSet.setType === 'warmup' ? 'Done with warm-up'
                : (isClusterType(currentSet.setType) && !(exercise && unilateralExercises.has(exercise.id))) ? 'Start cluster' : 'Complete set'
              }
            >
              <Ionicons name="checkmark-circle" size={20} color={currentSet.setType === 'warmup' ? colors.warning : colors.primary} />
              <Text style={[styles.completeBtnText, currentSet.setType === 'warmup' && styles.completeBtnTextWarmup]}>
                {currentSet.setType === 'warmup' ? 'Done'
                  : (isClusterType(currentSet.setType) && !(exercise && unilateralExercises.has(exercise.id))) ? 'Start cluster' : 'Log set'}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.secondaryActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setShowNoteInput(v => !v)}
              accessibilityRole="button"
              accessibilityLabel="Add note to set"
            >
              <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.actionBtnText}>Note</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnGuide]}
              onPress={() => {
                if (showInfoTipPulse) {
                  infoPulseLoop.current?.stop();
                  infoPulseAnim.setValue(1);
                  setShowInfoTipPulse(false);
                  AsyncStorage.setItem('@volyume_seen_workout_info', 'true').catch(() => {});
                }
                setShowExecution(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="View exercise guide"
            >
              <Animated.View style={showInfoTipPulse ? { transform: [{ scale: infoPulseAnim }] } : null}>
                <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
              </Animated.View>
              <Text style={[styles.actionBtnText, styles.actionBtnGuideText]}>Info</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="volyume-btn-add-mid-workout"
              style={styles.actionBtn}
              onPress={() => setShowExercisePicker(true)}
              accessibilityRole="button"
              accessibilityLabel="Add exercise to workout"
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.actionBtnText}>Add</Text>
            </TouchableOpacity>
            {!isLastExercise && (
              <TouchableOpacity
                style={[styles.actionBtn, isPairedWithNext && styles.actionBtnPaired]}
                onPress={handleTogglePair}
                accessibilityRole="button"
                accessibilityLabel={isPairedWithNext ? 'Unpair from next exercise' : 'Pair as superset with next exercise'}
              >
                <Ionicons name={isPairedWithNext ? 'link' : 'link-outline'} size={18} color={isPairedWithNext ? colors.primary : colors.textSecondary} />
                <Text style={[styles.actionBtnText, isPairedWithNext && { color: colors.primary }]}>
                  {isPairedWithNext ? 'Paired' : 'Pair'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnDanger]}
              onPress={handleRemoveExercise}
              accessibilityRole="button"
              accessibilityLabel="Remove exercise from workout"
            >
              <Ionicons name="trash-outline" size={18} color={colors.error} />
              <Text style={[styles.actionBtnText, { color: colors.error }]}>Remove</Text>
            </TouchableOpacity>
          </View>

          {/* Set table: logged actuals + remaining planned sets with last
              session's numbers as the ghost target (Strong/Hevy idiom) */}
          {(loggedSets.length > 0 || (routineExercise?.recommendedSets ?? 0) > 0) && (
            <View style={styles.loggedSection}>
              <Text style={styles.loggedTitle}>This workout</Text>
              <SetTable
                loggedSets={loggedSets}
                prevSets={prevSets}
                plannedCount={routineExercise?.recommendedSets ?? 0}
                units={units}
              />
            </View>
          )}

          {/* Ghost navigation */}
          {!targetComplete && (
            isLastExercise ? (
              <TouchableOpacity testID="volyume-btn-finish-ghost" style={styles.finishWorkoutLargeBtn} onPress={handleFinishWorkout}>
                <Ionicons name="checkmark-done" size={18} color={colors.success} />
                <Text style={styles.finishWorkoutLargeBtnText}>Finish Workout</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity testID="volyume-btn-next-exercise-ghost" style={styles.nextExerciseBtn} onPress={handleNextExercise}>
                <Text style={styles.nextExerciseBtnText}>Next Exercise</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.primary} />
              </TouchableOpacity>
            )
          )}

          {/* Phase 6: Time Crunch button */}
          {!timeCrunchActive && workoutExercises.length > currentExerciseIndex + 1 && (
            <View style={styles.timeCrunchRow}>
              <TouchableOpacity style={styles.timeCrunchBtn} onPress={handleTimeCrunch} activeOpacity={0.75}>
                <Ionicons name="timer-outline" size={15} color={colors.warning} />
                <Text style={styles.timeCrunchBtnText}>Time crunch today</Text>
              </TouchableOpacity>
              <InfoTooltip
                size={15}
                text={
                  'Shortens your remaining session to fit the time you have left.\n\n' +
                  'Cuts rest times by around 30%, drops any isolation exercises you haven\'t started yet, and keeps everything you\'ve already begun. Your main lifts stay in.\n\n' +
                  'You can undo it straight away if you change your mind.'
                }
              />
            </View>
          )}
          {timeCrunchActive && !!timeCrunchMsg && (
            <View style={styles.timeCrunchActiveBar}>
              <Ionicons name="timer" size={14} color={colors.warning} style={{ marginTop: spacing.xxs }} />
              <View style={styles.timeCrunchActiveContent}>
                <Text style={styles.timeCrunchActiveText}>{timeCrunchMsg}</Text>
                <TouchableOpacity style={styles.timeCrunchRevertBtn} onPress={handleRevertTimeCrunch} activeOpacity={0.75}>
                  <Ionicons name="refresh-outline" size={13} color={colors.textSecondary} />
                  <Text style={styles.timeCrunchRevertText}>Revert</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={{ height: Math.max(spacing.xxl, insets.bottom + spacing.lg) }} />
        </ScrollView>

        {/* Exercise Picker Modal, shared by Add and Swap (see pickerMode) */}
        <ExercisePickerModal
          visible={showExercisePicker}
          onClose={closeExercisePicker}
          onSelect={handlePickerSelect}
          actionLabel={pickerMode === 'swap' ? 'Swap In' : 'Add to Workout'}
        />

        {/* Demonstration sheet — rendered here so Info / How-to works mid-workout */}
        {howToSheet}

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
        </Modal>

        {/* Stale workout recovery modal */}
        <Modal visible={showStaleModal} transparent animationType="fade" onRequestClose={() => setShowStaleModal(false)}>
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
                <Text style={styles.staleFinishText}>Finish Workout</Text>
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
        </Modal>




        {/* Set Type Picker Bottom Sheet */}
        <Modal
          visible={showSetTypePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowSetTypePicker(false)}
        >
          <TouchableOpacity
            style={styles.sheetOverlay}
            activeOpacity={1}
            onPress={() => setShowSetTypePicker(false)}
          />
          <View style={[styles.sheet, { paddingBottom: Math.max(spacing.xxl, insets.bottom + spacing.lg) }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Set type</Text>
            <Text style={styles.sheetExplainer}>
              Pick how this set was done. Working and the intensity techniques all count toward your weekly totals; warm-ups don't. The label tells the coach how you trained.
            </Text>
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
        </Modal>

        {/* Info / Form Bottom Sheet */}
        <Modal
          visible={showExecution}
          transparent
          animationType="slide"
          onRequestClose={() => setShowExecution(false)}
        >
          <TouchableOpacity
            style={styles.sheetOverlay}
            activeOpacity={1}
            onPress={() => setShowExecution(false)}
          />
          <View style={[styles.sheet, { paddingBottom: Math.max(spacing.xxl, insets.bottom + spacing.lg) }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{exercise?.name}</Text>
            {exercise?.primaryMuscle ? (
              <Text style={styles.infoMuscle}>
                {MUSCLE_DISPLAY_NAMES[exercise.primaryMuscle] ?? ((exercise.primaryMuscle || '').charAt(0).toUpperCase() + (exercise.primaryMuscle || '').slice(1).replace('_', ' '))}
                {exercise.equipment ? ` · ${exercise.equipment}` : ''}
              </Text>
            ) : null}
            {routineExercise?.recommendedSets ? (
              <View style={styles.infoTargetRow}>
                <Ionicons name="checkmark-circle-outline" size={14} color={colors.primary} />
                <Text style={styles.infoTarget}>
                  {routineExercise.recommendedSets} sets of {routineExercise.recommendedRepsMin}–{routineExercise.recommendedRepsMax} reps
                </Text>
              </View>
            ) : null}
            <Text style={styles.infoNotesLabel}>How to do it</Text>
            <Text style={styles.infoNotes}>
              {routineExercise?.notes || FORM_TIPS[exercise?.name] || exercise?.notes || 'No coaching notes yet for this exercise.\n\nIf you\'re not sure how much weight to use, start light. Pick something you could comfortably lift 15 to 20 times. Getting comfortable with the movement matters more than the weight, especially early on.\n\nFocus on controlled movement, feel the target muscle working, and stop a couple of reps before you truly cannot do any more.'}
            </Text>
          </View>
        </Modal>

        {/* Exercise Swap Modal */}
        <Modal visible={showSwapModal} animationType="slide" onRequestClose={() => setShowSwapModal(false)}>
          <SafeAreaView style={styles.swapSafe} edges={['top', 'bottom']}>
            <View style={styles.swapHeader}>
              <Text style={styles.swapTitle}>Swap Exercise</Text>
              <TouchableOpacity onPress={() => setShowSwapModal(false)} accessibilityRole="button" accessibilityLabel="Close swap">
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.swapSubtitle}>
              Replacing: <Text style={{ color: colors.primary }}>{exercise?.name}</Text>
            </Text>
            <Text style={styles.swapNote}>Session-only. Your plan is not changed.</Text>
            <FlatList
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
                  No similar exercises found.
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
        </Modal>
        {/* Discard Workout Modal */}
        <Modal visible={showDiscardModal} transparent animationType="fade" onRequestClose={() => setShowDiscardModal(false)}>
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
                <Text style={styles.discardConfirmBtnText}>Discard Workout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>


      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function EmptyExerciseView({ onAdd, onFinish, onCancel, elapsed, workoutExercises, setCurrentExerciseIndex, currentExerciseIndex }) {
  return (
    <View style={styles.emptyView}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Cancel workout">
          <Ionicons name="close" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.timerText}>{elapsed}</Text>
        <TouchableOpacity onPress={onFinish} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Finish workout">
          <Text style={styles.finishBtn}>Finish</Text>
        </TouchableOpacity>
      </View>

      {workoutExercises.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.exerciseNav} contentContainerStyle={styles.exerciseNavContent}>
          {workoutExercises.map((entry, i) => (
            <TouchableOpacity key={i} style={[styles.navTab, i === currentExerciseIndex && styles.navTabActive]} onPress={() => setCurrentExerciseIndex(i)} accessibilityRole="button" accessibilityState={{ selected: i === currentExerciseIndex }} accessibilityLabel={entry.exercise?.name || `Exercise ${i + 1}`}>
              <Text style={[styles.navTabText, i === currentExerciseIndex && styles.navTabTextActive]} numberOfLines={1}>
                {entry.exercise?.name?.split(' ').slice(0, 2).join(' ')}
              </Text>
              {entry.sets?.length > 0 && <View style={styles.navTabBadge}><Text style={styles.navTabBadgeText}>{entry.sets.length}</Text></View>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.emptyContent}>
        <Ionicons name="barbell-outline" size={64} color={colors.surface3} />
        <Text style={styles.emptyTitle}>Add your first exercise</Text>
        <Text style={styles.emptySubtitle}>Search the exercise library to get started</Text>
        <TouchableOpacity style={styles.addFirstBtn} onPress={onAdd} accessibilityRole="button" accessibilityLabel="Add exercise">
          <Ionicons name="add" size={22} color={colors.background} />
          <Text style={styles.addFirstBtnText}>Add Exercise</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerSide: { width: 64, alignItems: 'flex-start', justifyContent: 'center' },
  headerSideRight: { width: 64, alignItems: 'flex-end', justifyContent: 'center' },
  finishBtn: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.primary, paddingVertical: spacing.xs },
  headerCenter: { flex: 1, alignItems: 'center' },
  timerText: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.primary, fontVariant: ['tabular-nums'] },
  exerciseNav: { borderBottomWidth: 1, borderBottomColor: colors.border, maxHeight: 48 },
  exerciseNavContent: { paddingHorizontal: spacing.lg, gap: spacing.sm, alignItems: 'center' },
  navTab: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: colors.surface2, maxWidth: 140 },
  navTabActive: { backgroundColor: colors.primaryBg },
  navTabText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium },
  navTabTextActive: { color: colors.primary },
  navTabBadge: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  navTabBadgeText: { fontSize: fontSize.micro, fontWeight: fontWeight.black, color: colors.background },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingTop: spacing.sm, gap: spacing.sm },
  exerciseHeader: { gap: spacing.xs },
  exerciseNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  exerciseNameTap: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  exerciseName: { flexShrink: 1, fontSize: fontSize.xxl, fontWeight: fontWeight.black, color: colors.textPrimary },
  exerciseNamePlay: { marginLeft: spacing.sm },
  swapBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.surface2, borderRadius: radius.sm, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderWidth: 1, borderColor: colors.border },
  swapBtnText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.primary },
  exerciseSubRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm,
  },
  howToBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  howToBtnText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.primary },
  howToSafe: { flex: 1, backgroundColor: colors.background },
  howToHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  howToTitle: { ...type.title, flex: 1, color: colors.textPrimary },
  howToClose: { padding: spacing.xs },
  howToContent: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },
  swapSafe: { flex: 1, backgroundColor: colors.background },
  swapHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  swapTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary },
  swapSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  swapNote: { fontSize: fontSize.xs, color: colors.textMuted, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  swapItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  swapItemName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary, marginBottom: spacing.xxs },
  swapItemReason: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 16 },
  swapBrowseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  swapBrowseText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary },
  exerciseMuscle: { flexShrink: 1, fontSize: fontSize.sm, color: colors.textSecondary },
  targetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  targetText: { fontSize: fontSize.sm, color: colors.textMuted },
  setEntryCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.md },
  setEntryCardWarmup: { borderColor: colors.warning, backgroundColor: colors.warningBg || colors.surface },
  // Short amber flash on the card border to ack a successful Log set tap.
  // Border width stays at 1 so the card doesn't shift its 2px layout for the
  // 700 ms flash, just the colour swaps.
  setEntryCardFlash: { borderColor: colors.primary },
  warmupBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  warmupBannerText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.warning, letterSpacing: 0.3 },
  warmupOneTimeHint: {
    fontSize: fontSize.sm, color: colors.textMuted,
    lineHeight: 20, paddingTop: spacing.xs,
  },
  firstSetHint: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, backgroundColor: colors.primaryBg, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  firstSetHintText: { flex: 1, fontSize: fontSize.xs, color: colors.primary, lineHeight: 18 },
  setEntryTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted, letterSpacing: 0.2 },
  noteInput: { backgroundColor: colors.surface2, borderRadius: radius.md, padding: spacing.md, fontSize: fontSize.sm, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, minHeight: 60 },
  ghostChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, backgroundColor: colors.surface2, borderRadius: radius.sm, alignSelf: 'flex-start', marginBottom: spacing.xs },
  ghostChipText: { fontSize: fontSize.xs, color: colors.textMuted, fontStyle: 'italic' },
  // Log set is the primary action on this screen, so it reads as a filled
  // amber button with a clear label rather than a tinted outline. Dark label
  // for contrast on amber (white on amber fails WCAG). Warm-ups stay visually
  // secondary via the tinted-outline override below.
  completeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: radius.lg, paddingVertical: spacing.lg, backgroundColor: colors.primaryFill },
  btnDisabled: { opacity: 0.5 },
  completeBtnText: { fontSize: fontSize.lg, fontWeight: fontWeight.heavy, color: colors.background, letterSpacing: 0.6 },
  completeBtnWarmup: { backgroundColor: colors.warningBg || colors.surface, borderWidth: 1, borderColor: colors.warning },
  completeBtnTextWarmup: { color: colors.warning },
  extraSetBtn: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingVertical: spacing.md },
  extraSetBtnText: { fontSize: fontSize.md, color: colors.textSecondary, fontWeight: fontWeight.medium },
  clusterBanner: {
    borderWidth: 1, borderColor: withAlpha(colors.primary, 0.502), borderRadius: radius.lg,
    backgroundColor: colors.primaryBg, padding: spacing.md, gap: spacing.sm, marginBottom: spacing.sm,
  },
  clusterTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.primary, letterSpacing: 0.6 },
  clusterReps: { fontSize: fontSize.md, color: colors.textPrimary, fontWeight: fontWeight.semibold },
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
  clusterCancel: { alignItems: 'center', paddingVertical: spacing.xs },
  clusterCancelText: { fontSize: fontSize.sm, color: colors.textMuted },
  secondaryActions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.border },
  actionBtnDanger: { borderColor: withAlpha(colors.error, 0.251) },
  actionBtnGuide: { borderColor: withAlpha(colors.primary, 0.376), backgroundColor: colors.primaryBg },
  actionBtnPaired: { borderColor: withAlpha(colors.primary, 0.376), backgroundColor: colors.primaryBg },
  actionBtnText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium },
  actionBtnGuideText: { color: colors.primary },
  supersetChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs,
    backgroundColor: colors.primaryBg, borderRadius: radius.sm,
    marginTop: spacing.xs,
  },
  supersetChipText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.semibold },
  nextExerciseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.lg },
  nextExerciseBtnText: { fontSize: fontSize.md, color: colors.primary, fontWeight: fontWeight.bold },
  finishWorkoutLargeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 1.5, borderColor: colors.success, borderRadius: radius.lg, paddingVertical: spacing.lg },
  finishWorkoutLargeBtnText: { fontSize: fontSize.md, color: colors.success, fontWeight: fontWeight.bold },
  timeCrunchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  timeCrunchBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: withAlpha(colors.warning, 0.333), backgroundColor: colors.warningBg ?? colors.surface },
  timeCrunchBtnText: { fontSize: fontSize.xs, color: colors.warning, fontWeight: fontWeight.medium },
  timeCrunchActiveBar: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, padding: spacing.sm, backgroundColor: colors.warningBg ?? colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: withAlpha(colors.warning, 0.267) },
  timeCrunchActiveContent: { flex: 1, gap: spacing.sm },
  timeCrunchActiveText: { fontSize: fontSize.xs, color: colors.warning, lineHeight: 18 },
  timeCrunchRevertBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start', paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  timeCrunchRevertText: { fontSize: fontSize.xs, color: colors.textSecondary },
  loggedSection: { gap: spacing.sm },
  loggedTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted, letterSpacing: 0.2 },
  // Compact set table: ~40px rows, hairlines only, whole-row readability.
  setTable: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
  },
  setTableHead: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
  },
  setTableHeadText: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  setTableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
  },
  setTableRowNext: { backgroundColor: colors.primaryBg },
  setTableNum: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  setTablePrev: { fontSize: fontSize.sm, color: colors.textMuted, fontVariant: ['tabular-nums'] },
  setTableVal: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary, fontVariant: ['tabular-nums'], textAlign: 'center' },
  setTableGhost: { fontSize: fontSize.md, color: colors.textDisabled, fontVariant: ['tabular-nums'], textAlign: 'center' },
  colSet: { width: 34 },
  colPrev: { flex: 1 },
  colNum: { width: 64, textAlign: 'center' },
  colTick: { width: 26, textAlign: 'right', marginLeft: 'auto' },
  emptyView: { flex: 1, backgroundColor: colors.background },
  emptyContent: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: spacing.xxxl * 2, gap: spacing.lg, paddingHorizontal: spacing.xxl },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary, textAlign: 'center' },
  emptySubtitle: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center' },
  addFirstBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.lg, paddingHorizontal: spacing.xxl, paddingVertical: spacing.lg, marginTop: spacing.lg },
  addFirstBtnText: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.background },
  sheetOverlay: { flex: 1, backgroundColor: colors.scrim },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg },
  sheetTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary, marginBottom: spacing.sm },
  sheetExplainer: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.lg },
  sheetOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetOptionText: { flex: 1, gap: spacing.xxs },
  sheetOptionLabel: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  sheetOptionLabelActive: { color: colors.primary },
  sheetOptionDesc: { fontSize: fontSize.xs, color: colors.textMuted },
  infoTargetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  infoTarget: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.medium },
  infoMuscle: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: spacing.sm },
  infoNotesLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing.xs, marginTop: spacing.sm },
  infoNotes: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 22 },
  targetBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.successBg, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.success },
  targetBannerText: { fontSize: fontSize.sm, color: colors.success, fontWeight: fontWeight.semibold, flex: 1 },
  // Superset heads-up modal
  supOverlay: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  supSheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, paddingBottom: spacing.xxl, borderTopWidth: 1, borderColor: colors.border, gap: spacing.md },
  supIconRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  supTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary },
  supSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  supPairCard: { backgroundColor: colors.surface2, borderRadius: radius.md, padding: spacing.md, borderLeftWidth: 3, borderLeftColor: colors.primary, gap: spacing.xs },
  supPairRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  supPairChip: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  supPairChipText: { color: colors.background, fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  supPairName: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.semibold, flex: 1 },
  supPairConnector: { width: 2, height: 14, backgroundColor: colors.border, marginLeft: 10 },
  supSteps: { gap: spacing.sm, marginTop: spacing.xs },
  supStep: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  supStepNum: { color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.bold, minWidth: 14 },
  supStepText: { color: colors.textPrimary, fontSize: fontSize.sm, lineHeight: 20, flex: 1 },
  supTip: { color: colors.textMuted, fontSize: fontSize.xs, fontStyle: 'italic', marginTop: spacing.xs },
  supPrimaryBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  supPrimaryBtnText: { color: colors.background, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  supSecondaryRow: { flexDirection: 'row', gap: spacing.sm },
  supSecondaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: 'transparent' },
  supSecondaryBtnText: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.medium },

  staleOverlay: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  staleSheet: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, width: '100%', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border },
  staleTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary, textAlign: 'center' },
  staleBody: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: spacing.md },
  staleResume: { width: '100%', backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  staleResumeText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.background },
  staleFinish: { width: '100%', backgroundColor: colors.surface2, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  staleFinishText: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.textPrimary },
  staleDiscard: { width: '100%', paddingVertical: spacing.md, alignItems: 'center' },
  staleDiscardText: { fontSize: fontSize.sm, color: colors.error, fontWeight: fontWeight.medium },
  discardOverlay: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  discardSheet: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, width: '100%', gap: spacing.md, borderWidth: 1, borderColor: colors.border },
  discardTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary, textAlign: 'center' },
  discardBody: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: spacing.xs },
  keepTrainingBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md + 2, alignItems: 'center' },
  keepTrainingBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.background },
  discardConfirmBtn: { alignItems: 'center', paddingVertical: spacing.md },
  discardConfirmBtnText: { fontSize: fontSize.sm, color: colors.error, fontWeight: fontWeight.medium },
  inlineTargetChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.primaryBg, borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    alignSelf: 'flex-start', marginBottom: spacing.xs,
  },
  inlineTargetText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.semibold },
  coachReasonChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.surface2, borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    alignSelf: 'flex-start', marginBottom: spacing.xs,
    borderWidth: 1, borderColor: withAlpha(colors.primary, 0.188),
  },
  coachReasonText: { fontSize: fontSize.xs, color: colors.textSecondary, flexShrink: 1 },
  beatChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    marginBottom: spacing.xs,
    alignSelf: 'flex-start',
  },
  beatChipText: { fontSize: fontSize.xs, color: colors.textMuted, fontStyle: 'italic' },
  repeatLastBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', marginBottom: spacing.xs,
    paddingVertical: spacing.xs, paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
    borderWidth: 1, borderColor: colors.border,
  },
  repeatLastText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium },
  stalledChip: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    marginBottom: spacing.xs,
    paddingVertical: 6, paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.warningBg,
    borderWidth: 1, borderColor: withAlpha(colors.warning, 0.251),
  },
  stalledChipText: { fontSize: fontSize.xs, color: colors.warning, fontWeight: fontWeight.medium, flex: 1, lineHeight: 16 },
  nextTimeBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: colors.primaryBg,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: withAlpha(colors.primary, 0.251),
  },
  cueBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  cueBannerText: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 19 },
  cueBannerHeadline: { color: colors.textPrimary, fontWeight: fontWeight.semibold },
  whyThisCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.borderSubtle,
  },
  whyThisLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  whyThisText: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 19, marginTop: spacing.xxs },
  speakCuesRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  speakCuesText: { fontSize: fontSize.sm, color: colors.textSecondary },
  nextTimeBannerText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  nextTimeBannerDismiss: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    paddingLeft: spacing.xs,
  },
  deloadBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.warningBg,
    borderRadius: radius.md, marginHorizontal: spacing.lg, marginBottom: spacing.sm,
    padding: spacing.md, borderWidth: 1, borderColor: colors.warning,
  },
  deloadBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  deloadBannerTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.warning },
  deloadBannerSub: { fontSize: fontSize.xs, color: colors.textMuted },
  deloadSkip: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: fontWeight.medium },
});
