import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import BackHeader from '../components/BackHeader';
import Card from '../components/Card';
import ExercisePickerModal from '../components/ExercisePickerModal';
import { Skeleton, SkeletonCard } from '../components/Skeleton';
import Stepper from '../components/Stepper';
import Button from '../components/Button';
import Chip from '../components/Chip';
import TextField from '../components/TextField';
import BottomSheet from '../components/BottomSheet';
import InfoTooltip from '../components/InfoTooltip';

import { colors, fontSize, fontWeight, spacing, radius, type } from '../styles/theme';
import {
  createProgramme, createRoutine, addExerciseToRoutine,
  activatePlanWithBlock, uid, getProgrammeById, getRoutinesForPlan,
  getRoutineExercisesWithDetails, updateRoutineName, removeExerciseFromRoutine,
  softDeleteRoutine, updateProgrammeName, db, runInTransaction,
} from '../lib/database';
import { MUSCLE_DISPLAY_NAMES, VOLUME_LANDMARKS } from '../lib/algorithms';
import { suggestRestSeconds } from '../lib/restSuggest';
import { classifySupersetPair } from '../lib/planEngine';
import { logError } from '../lib/errorLog';
import { GLOSSARY } from '../lib/coachGlossary';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useToast } from '../components/Toast';
import * as haptics from '../lib/haptics';

// ─── Constants ────────────────────────────────────────────────────────────────

const GOALS = [
  { key: 'hypertrophy', label: 'Build Muscle' },
  { key: 'balanced',    label: 'Balanced Bodybuilding' },
  { key: 'aesthetic',   label: 'Aesthetic Focus' },
  { key: 'strength',    label: 'Strength-Biased' },
  { key: 'recomp',      label: 'Lose Fat, Keep Muscle' },
];

// Selectable training-days-per-week. Default stays 4 (the prior hardcoded
// value) so existing behaviour is unchanged for users who don't touch it.
const DAY_COUNT_OPTIONS = [2, 3, 4, 5, 6];

// S5: matches BuildWorkoutScreen's shipped defaults, so an exercise dropped
// into a plan here starts with the same targets it would in the workout
// builder.
const DEFAULT_SETS = 3;
const DEFAULT_REST = 90;
// Hit slop for the small +/- stepper buttons, ported verbatim from
// BuildWorkoutScreen's stepBtn touchables.
const STEPPER_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

// Formats seconds as "90s" / "2m" / "2m 15s", ported verbatim from
// BuildWorkoutScreen so rest reads identically wherever it's edited.
function formatRest(secs) {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

// ─── Plan Balance Helpers ─────────────────────────────────────────────────────

const PRIORITY_MUSCLES = ['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'biceps', 'triceps', 'glutes'];

function computePlanVolume(days) {
  const sets = {};
  for (const day of days) {
    for (const ex of day.exercises) {
      const m = ex.primaryMuscle;
      if (!m) continue;
      sets[m] = (sets[m] || 0) + (ex.sets || 3);
    }
  }
  return sets;
}

function muscleStatus(muscle, totalSets) {
  const lm = VOLUME_LANDMARKS[muscle];
  if (!lm) return null;
  // Muscles with a 0 minimum (e.g. glutes) grow from compound work alone
  // zero direct sets is acceptable, so don't flag them as missing.
  if (totalSets === 0)      return lm.mev === 0 ? 'good' : 'none';
  if (totalSets < lm.mev)   return 'low';
  if (totalSets <= lm.mav)  return 'good';
  if (totalSets <= lm.mrv)  return 'high';
  return 'over';
}

// Theme tokens (not raw hex) so these recolour with the colour-blind palette.
const STATUS_COLOR = {
  none: colors.textMuted,
  low:  colors.warning,
  good: colors.success,
  high: colors.success,
  over: colors.error,
};
const STATUS_DOT = {
  none: '○',
  low:  '◐',
  good: '●',
  high: '●',
  over: '●',
};

function PlanBalanceCard({ days }) {
  const volume = computePlanVolume(days);
  const hasAnyExercise = days.some(d => d.exercises.length > 0);
  if (!hasAnyExercise) return null;

  const rows = PRIORITY_MUSCLES.map(m => {
    const sets = volume[m] || 0;
    const status = muscleStatus(m, sets);
    return { muscle: m, sets, status };
  }).filter(r => r.status !== null);

  const warnings = rows.filter(r => r.status === 'none' || r.status === 'low');
  const overloaded = rows.filter(r => r.status === 'over');

  return (
    <Card style={balanceStyles.card}>
      <View style={balanceStyles.header}>
        <Ionicons name="pie-chart-outline" size={16} color={colors.textSecondary} />
        <Text maxFontSizeMultiplier={1.3} style={balanceStyles.title}>Plan balance</Text>
        {/* NV-1: the dot legend (full/half/hollow, green/amber/red) has no key
            anywhere else on this card, so a first-time builder can only learn
            it by triggering a warning. Reuses the volume-bands gloss already
            shown on BodyDiagramHeatmap.js, same InfoTooltip+GLOSSARY pattern. */}
        <InfoTooltip text={GLOSSARY.volumeBands} size={14} />
      </View>

      <View style={balanceStyles.grid}>
        {rows.map(({ muscle, sets, status }) => (
          <View key={muscle} style={balanceStyles.cell}>
            <Text maxFontSizeMultiplier={1.3} style={[balanceStyles.dot, { color: STATUS_COLOR[status] }]}>
              {STATUS_DOT[status]}
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={balanceStyles.muscleName}>{MUSCLE_DISPLAY_NAMES[muscle]}</Text>
            {sets > 0 && (
              <Text maxFontSizeMultiplier={1.3} style={balanceStyles.setCount}>{sets}×</Text>
            )}
          </View>
        ))}
      </View>

      {warnings.length > 0 && (
        <Card surface="surface2" radius="md" padding="md" style={balanceStyles.warningBox}>
          {warnings.map(({ muscle, status }) => (
            <View key={muscle} style={balanceStyles.warningRow}>
              <Ionicons
                name={status === 'none' ? 'alert-circle-outline' : 'information-circle-outline'}
                size={14}
                color={status === 'none' ? colors.warning : colors.textMuted}
              />
              <Text maxFontSizeMultiplier={1.3} style={[balanceStyles.warningText, status === 'none' && { color: colors.warning }]}>
                {status === 'none'
                  ? `No ${MUSCLE_DISPLAY_NAMES[muscle]} work in this plan`
                  : `${MUSCLE_DISPLAY_NAMES[muscle]} work is low. Consider adding a set or two.`}
              </Text>
            </View>
          ))}
        </Card>
      )}

      {overloaded.length > 0 && (
        <Card surface="surface2" radius="md" padding="md" style={balanceStyles.warningBox}>
          {overloaded.map(({ muscle }) => (
            <View key={muscle} style={balanceStyles.warningRow}>
              <Ionicons name="warning-outline" size={14} color={colors.error} />
              <Text maxFontSizeMultiplier={1.3} style={[balanceStyles.warningText, { color: colors.error }]}>
                {`${MUSCLE_DISPLAY_NAMES[muscle]} volume is very high. This may affect recovery.`}
              </Text>
            </View>
          ))}
        </Card>
      )}
    </Card>
  );
}

// ─── Target stepper ───────────────────────────────────────────────────────────
// S5: compact wrapper around the shared +/- Stepper so sets, rep ranges and
// rest use the app's one numeric-control primitive while the screen keeps the
// training-specific clamp/coherence rules.
function TargetStepper({
  label,
  value,
  displayValue,
  valueLabel,
  decreaseLabel,
  increaseLabel,
  onChange,
  min,
  max,
  step = 1,
}) {
  return (
    <View style={styles.controlGroup}>
      <Text maxFontSizeMultiplier={1.3} style={styles.controlLabel}>{label}</Text>
      <Stepper
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={onChange}
        size="compact"
        hitSlop={STEPPER_HIT_SLOP}
        label={label.toLowerCase()}
        formatValue={() => `${displayValue}`}
        valueLabel={valueLabel}
        decreaseLabel={decreaseLabel}
        increaseLabel={increaseLabel}
      />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ManualBuilderScreen({ navigation, route }) {
  const { planId } = route?.params || {};
  // F7: subscribe to just these fields (a bare useAppStore() re-renders on every store mutation).
  const { user } = useAppStore(useShallow(s => ({
    user: s.user,
  })));
  const toast = useToast();

  // Page 1 state
  const [page, setPage]               = useState(1);
  const [planName, setPlanName]       = useState('');
  const [selectedGoal, setGoal]       = useState('hypertrophy');
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [creating, setCreating]       = useState(false);

  // Page 2 state
  const [programmeId, setProgrammeId]         = useState(null);
  const [editablePlanName, setEditableName]   = useState('');
  const [days, setDayList]                    = useState([]);
  const [pickerDayIndex, setPickerDayIdx]     = useState(null);
  const [showPicker, setShowPicker]           = useState(false);
  const [saving, setSaving]                   = useState(false);

  // S5: editing an already-saved plan (reached with a planId param, e.g. from
  // PlanDetailScreen's Manage section) bypasses Page 1 entirely and loads
  // straight into the Page 2 editor, the same surface used to author a new
  // plan, so every affordance below (steppers, duplicate, supersets) is
  // available on a plan someone comes back to later.
  const isEditMode = !!planId;
  const [loadingExisting, setLoadingExisting] = useState(isEditMode);
  // Existing routines removed locally during this edit session. Nothing here
  // writes until Save (matching the rest of this screen's model), so the
  // actual soft-delete happens in persistDays; Undo simply un-marks it.
  const [removedRoutineIds, setRemovedRoutineIds] = useState([]);

  useEffect(() => {
    if (!planId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const [plan, routines] = await Promise.all([
          getProgrammeById(planId),
          getRoutinesForPlan(planId),
        ]);
        if (!plan) throw new Error('Plan not found');
        const loadedDays = await Promise.all(routines.map(async (routine) => {
          const withDetails = await getRoutineExercisesWithDetails(routine.id);
          return {
            // Reuse the real routine id as the local id: it's already
            // unique and lets persistDays recognise this as an existing
            // day (routineId set) rather than a brand new one.
            localId: routine.id,
            name: routine.name,
            routineId: routine.id,
            exercises: withDetails.map(({ routineExercise, exercise }) => ({
              localId: routineExercise.id,
              id: exercise.id,
              name: exercise.name,
              primaryMuscle: (exercise.primaryMuscle || '').toLowerCase() || null,
              // Plan-D builder nudge: carried so handleGroupSuperset can reuse
              // the engine's own pairing classifier (classifySupersetPair).
              equipmentCategory: exercise.equipmentCategory || null,
              compoundIsolation: exercise.compoundIsolation || null,
              sets: routineExercise.recommendedSets ?? DEFAULT_SETS,
              repsMin: routineExercise.recommendedRepsMin ?? 8,
              repsMax: routineExercise.recommendedRepsMax ?? 12,
              restSeconds: routineExercise.restSeconds ?? DEFAULT_REST,
              supersetGroupId: routineExercise.supersetGroupId ?? null,
            })),
          };
        }));
        if (cancelled) return;
        setProgrammeId(planId);
        setEditableName(plan.name || '');
        setDayList(loadedDays);
        setPage(2);
      } catch (e) {
        if (cancelled) return;
        logError('ManualBuilderScreen.loadExistingPlan', e, { planId });
        toast.show("Couldn't load this plan, try again", { variant: 'error' });
        navigation.goBack();
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  // ── Page 1: create programme ──────────────────────────────────────────────

  async function handleCreatePlan() {
    if (!planName.trim()) {
      toast.show('Enter a name for your plan', { variant: 'warning' });
      return;
    }
    if (!user?.id) {
      toast.show('Setting up your profile, try again in a second', { variant: 'info' });
      return;
    }
    setCreating(true);
    try {
      const goalLabel = GOALS.find(g => g.key === selectedGoal)?.label ?? selectedGoal;
      const prog = await createProgramme(user.id, planName.trim(), goalLabel, 0);
      if (!prog?.id) throw new Error('Could not create plan.');
      setProgrammeId(prog.id);
      setEditableName(planName.trim());
      setDayList(
        Array.from({ length: daysPerWeek }, (_, i) => ({
          localId:   `day-${i}-${Date.now()}`,
          name:      `Day ${i + 1}`,
          exercises: [],
          routineId: null,
        })),
      );
      setPage(2);
    } catch (e) {
      toast.show(e.message || "Couldn't create plan", { variant: 'error' });
    } finally {
      setCreating(false);
    }
  }

  // ── Page 2: day & exercise management ────────────────────────────────────

  function openPicker(dayIndex) {
    setPickerDayIdx(dayIndex);
    setShowPicker(true);
  }

  function handleExerciseSelected(exercise) {
    if (pickerDayIndex === null) return;
    setDayList(prev => prev.map((d, i) => {
      if (i !== pickerDayIndex) return d;
      return {
        ...d,
        exercises: [
          ...d.exercises,
          {
            localId:      `${Date.now()}-${Math.random()}`,
            id:           exercise.id,
            name:         exercise.name,
            primaryMuscle: (exercise.primaryMuscle || exercise.primary_muscle || '').toLowerCase() || null,
            // Plan-D builder nudge: carried so handleGroupSuperset can reuse
            // the engine's own pairing classifier (classifySupersetPair).
            equipmentCategory: exercise.equipmentCategory || exercise.equipment_category || null,
            compoundIsolation: exercise.compoundIsolation || exercise.compound_isolation || null,
            sets:         DEFAULT_SETS,
            repsMin:      exercise.defaultRepMin || exercise.default_rep_min || 8,
            repsMax:      exercise.defaultRepMax || exercise.default_rep_max || 12,
            // B9 deterministic rest suggestion (compound 180s / isolation
            // 90s), the same fixed table BuildWorkoutScreen falls back to.
            // Editable via the stepper the moment it's added.
            restSeconds:  suggestRestSeconds({ exercise }),
          },
        ],
      };
    }));
  }

  function handleLongPressExercise(dayIndex, exLocalId, exName) {
    // Undo pattern: remove immediately + toast with Undo for 8 seconds.
    // No "Are you sure?" Alert, the safety net is the Undo button.
    // Captures the removed exercise so Undo can put it back at its
    // original index, not the end.
    haptics.commit();
    let removed = null;
    let removedIndex = -1;
    setDayList(prev => prev.map((d, i) => {
      if (i !== dayIndex) return d;
      const idx = d.exercises.findIndex(e => e.localId === exLocalId);
      if (idx === -1) return d;
      removed = d.exercises[idx];
      removedIndex = idx;
      return { ...d, exercises: d.exercises.filter(e => e.localId !== exLocalId) };
    }));
    if (!removed) return;
    toast.show(`Removed ${exName}`, {
      variant: 'undo',
      action: {
        label: 'Undo',
        onPress: () => {
          haptics.selection();
          setDayList(prev => prev.map((d, i) => {
            if (i !== dayIndex) return d;
            const next = d.exercises.slice();
            next.splice(removedIndex, 0, removed);
            return { ...d, exercises: next };
          }));
        },
      },
    });
  }

  function handleAddDay() {
    haptics.selection();
    setDayList(prev => [
      ...prev,
      { localId: `day-${Date.now()}`, name: `Day ${prev.length + 1}`, exercises: [], routineId: null },
    ]);
  }

  function handleRemoveDay(dayIndex) {
    // Same Undo pattern as exercise removal: remove immediately, no
    // confirm Alert, an Undo toast restores the whole day (incl. its
    // exercises) at its original position. Read the day straight from the
    // current render's days (not a setDayList updater's side effect, which
    // runs on React's own schedule) so the routineId check below is never
    // stale.
    const removed = days[dayIndex];
    if (!removed) return;
    haptics.commit();
    setDayList(prev => prev.filter((_, i) => i !== dayIndex));
    // S5 edit mode: this day may already be a saved routine. Nothing is
    // written until Save, so mark it for soft-delete then (persistDays)
    // rather than deleting it here.
    if (removed.routineId) {
      setRemovedRoutineIds(prev => [...prev, removed.routineId]);
    }
    toast.show(`Removed ${removed.name}`, {
      variant: 'undo',
      action: {
        label: 'Undo',
        onPress: () => {
          haptics.selection();
          setDayList(prev => {
            const next = prev.slice();
            next.splice(dayIndex, 0, removed);
            return next;
          });
          if (removed.routineId) {
            setRemovedRoutineIds(prev => prev.filter(id => id !== removed.routineId));
          }
        },
      },
    });
  }

  function updateDayName(dayIndex, newName) {
    setDayList(prev => prev.map((d, i) => i === dayIndex ? { ...d, name: newName } : d));
  }

  function handleDuplicateDay(dayIndex) {
    const original = days[dayIndex];
    if (!original) return;
    // Remap superset group ids so the clone's pairs are independent of the
    // original's (grouping/ungrouping one copy never touches the other).
    const groupIdMap = {};
    const clonedExercises = original.exercises.map(ex => {
      let newGroupId = null;
      if (ex.supersetGroupId) {
        if (!groupIdMap[ex.supersetGroupId]) {
          groupIdMap[ex.supersetGroupId] = `ss-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        }
        newGroupId = groupIdMap[ex.supersetGroupId];
      }
      return { ...ex, localId: uid(), supersetGroupId: newGroupId };
    });
    const clone = {
      localId: uid(),
      name: `${original.name} (copy)`,
      exercises: clonedExercises,
      // A fresh day, even when duplicating one that's already saved: it
      // gets its own new routine on Save, the original is untouched.
      routineId: null,
    };
    // Append at the end rather than right after the original: day order persists
    // purely by routine created_at (there is no position column yet), and the
    // clone gets a brand new routine on Save, so it always reloads last. Placing
    // it last here keeps the on-screen order identical to the saved-and-reloaded
    // order, instead of showing it mid-list then having it jump to the end.
    haptics.selection();
    setDayList(prev => [...prev, clone]);
    toast.show(`Duplicated ${original.name}`, { variant: 'success' });
  }

  // ── Supersets ─────────────────────────────────────────────────────────────
  // Exercises in a day that share the same supersetGroupId are one superset.
  // The user multi-selects rows (per day) then groups them; the engine and
  // ActiveWorkout already understand a shared supersetGroupId. We only write
  // the existing field, no schema or write-path change.

  // { [dayIdx]: Set<exLocalId> } of rows currently selected for grouping.
  const [supersetSelection, setSupersetSelection] = useState({});

  function toggleSupersetSelect(dayIndex, exLocalId) {
    // Giant sets (campaign item 21): a group may hold three or more exercises.
    // The live session cycles every member of a shared supersetGroupId in order
    // (A -> B -> C -> back to A), so there is no longer a pair cap here.
    // Auto-generated pairings stay pairs-only in the engine (assignSupersets);
    // this is the user-built giant-set path.
    haptics.selection();
    setSupersetSelection(prev => {
      const next = new Set(prev[dayIndex] || []);
      if (next.has(exLocalId)) next.delete(exLocalId);
      else next.add(exLocalId);
      return { ...prev, [dayIndex]: next };
    });
  }

  function clearSupersetSelection(dayIndex) {
    setSupersetSelection(prev => ({ ...prev, [dayIndex]: new Set() }));
  }

  function handleGroupSuperset(dayIndex) {
    const selected = supersetSelection[dayIndex];
    if (!selected || selected.size < 2) {
      toast.show('Select at least two exercises to superset', { variant: 'warning' });
      return;
    }
    haptics.selection();

    // Plan-D Option B/C calm nudge (docs/exercise-planning-2026-07-09/
    // plan-D-intelligent-supersets.md), extended to giant sets (campaign
    // item 21): reuse the auto-gen engine's own relationship + equipment-zone
    // classifier so the builder shares the same "coach-logical" bar the engine
    // already enforces, without enforcing it here. For a giant set of 3+ we
    // classify each consecutive link in day order; if any link clears neither
    // bar we nudge once. Never blocks; a link is only judged when both members
    // resolve a muscle (an unclassifiable custom exercise never gets a false
    // nudge).
    const members = (days[dayIndex]?.exercises || []).filter(ex => selected.has(ex.localId));
    let anyImpractical = false;
    for (let k = 0; k < members.length - 1; k++) {
      const a = members[k];
      const b = members[k + 1];
      if (!a.primaryMuscle || !b.primaryMuscle) continue;
      if (!classifySupersetPair(a, b).practical) { anyImpractical = true; break; }
    }
    if (anyImpractical) {
      toast.show(
        'Supersets work best when the exercises share a station or target opposing muscles.',
        { variant: 'info' },
      );
    }

    const groupId = `ss-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setDayList(prev => prev.map((d, i) => {
      if (i !== dayIndex) return d;
      return {
        ...d,
        exercises: d.exercises.map(ex =>
          selected.has(ex.localId) ? { ...ex, supersetGroupId: groupId } : ex,
        ),
      };
    }));
    clearSupersetSelection(dayIndex);
  }

  function handleUngroupSuperset(dayIndex, groupId) {
    haptics.commit();
    setDayList(prev => prev.map((d, i) => {
      if (i !== dayIndex) return d;
      return {
        ...d,
        exercises: d.exercises.map(ex =>
          ex.supersetGroupId === groupId ? { ...ex, supersetGroupId: null } : ex,
        ),
      };
    }));
  }

  // ── Target steppers ───────────────────────────────────────────────────────
  // Single clamp-and-set helper behind every target change (sets, reps min/max,
  // rest), the same Math.max/Math.min clamp BuildWorkoutScreen's target editors
  // use.
  function setExerciseNumber(dayIndex, exLocalId, field, value, min, max) {
    // D8 calm nudge (founder ruling 2026-07-09): manual builder never blocks,
    // but a quiet one-line note past 4 sets on one exercise matches the
    // auto-gen cap's reasoning. Fires only on the crossing edge (<=4 -> >4),
    // not on every further +1, so it stays one quiet line rather than
    // nagging on 5->6->7. Read from the current `days` state directly
    // (rather than inside the setDayList updater below) because a functional
    // setState updater is not guaranteed to run synchronously, and a toast
    // fired from inside it could double-fire under React's strict-mode
    // double-invoke or fire out of step with the render that triggered it.
    if (field === 'sets') {
      const prevSets = days[dayIndex]?.exercises.find(ex => ex.localId === exLocalId)?.sets ?? 0;
      const next = Math.max(min, Math.min(max, value));
      if (next > 4 && prevSets <= 4) {
        toast.show('A second exercise from a different angle usually beats piling more sets onto this one.', { variant: 'info' });
      }
    }
    setDayList(prev => prev.map((d, i) => {
      if (i !== dayIndex) return d;
      return {
        ...d,
        exercises: d.exercises.map(ex => {
          if (ex.localId !== exLocalId) return ex;
          let next = Math.max(min, Math.min(max, value));
          // Keep the rep range coherent: min can never climb above max, nor max
          // drop below min, so a saved target can never read "13-12 reps".
          if (field === 'repsMin') next = Math.min(next, ex.repsMax ?? max);
          else if (field === 'repsMax') next = Math.max(next, ex.repsMin ?? min);
          return { ...ex, [field]: next };
        }),
      };
    }));
  }

  // ── Reorder ───────────────────────────────────────────────────────────────
  // T7 (docs/world-class-audit-2026-07-03/_SYNTHESIS.md:171): reorder
  // exercises within a day. react-native-gesture-handler is in the tree, but
  // no screen in the app builds a drag surface on it: RoutineDetailScreen's
  // exercise list (the one existing reorder UI) swaps adjacent rows via
  // up/down chevrons, so this matches that established convention rather
  // than introducing a new interaction. Nothing writes to the DB here, same
  // as every other edit on this page: the new order lives only in local
  // state until Save, when persistDays() below re-inserts routine_exercises
  // in array order (its `j` loop index becomes order_in_routine), so
  // reordering the in-memory list is all that's needed for the new order to
  // persist and reload correctly (getRoutineExercisesWithDetails reads back
  // `ORDER BY re.order_in_routine ASC`).
  function moveExercise(dayIndex, exLocalId, direction) {
    let moved = false;
    setDayList(prev => prev.map((d, i) => {
      if (i !== dayIndex) return d;
      // Reorder at the level of superset BLOCKS, not individual rows. A pair
      // sharing a supersetGroupId must stay adjacent (ActiveWorkout only treats
      // two ADJACENT same-group rows as a superset), so a move must never split
      // one: a pair travels as a single unit, and a lone exercise hops over a
      // whole pair rather than landing between its members.
      const blocks = [];
      for (const ex of d.exercises) {
        const last = blocks[blocks.length - 1];
        if (ex.supersetGroupId && last && last[last.length - 1].supersetGroupId === ex.supersetGroupId) {
          last.push(ex);
        } else {
          blocks.push([ex]);
        }
      }
      const bIdx = blocks.findIndex(b => b.some(e => e.localId === exLocalId));
      if (bIdx === -1) return d;
      const swapIdx = direction === 'up' ? bIdx - 1 : bIdx + 1;
      if (swapIdx < 0 || swapIdx >= blocks.length) return d;
      moved = true;
      const next = blocks.slice();
      [next[bIdx], next[swapIdx]] = [next[swapIdx], next[bIdx]];
      return { ...d, exercises: next.flat() };
    }));
    if (moved) haptics.selection();
  }

  // ── Validation & persistence ──────────────────────────────────────────────

  function validate(requireExercises = true) {
    if (!editablePlanName.trim()) {
      toast.show('Give your plan a name before saving', { variant: 'warning' });
      return false;
    }
    if (days.length === 0) {
      toast.show('Add at least one training day', { variant: 'warning' });
      return false;
    }
    if (requireExercises) {
      const empty = days.find(d => d.exercises.length === 0);
      if (empty) {
        toast.show(`"${empty.name}" has no exercises. Add one or remove the day`, { variant: 'warning', duration: 5000 });
        return false;
      }
    }
    return true;
  }

  async function persistDays() {
    const d = await db();
    // Atomic: the edit path clear-and-reinserts a day's routine_exercises, so an
    // interruption between the delete (removeExerciseFromRoutine) and the
    // reinsert (addExerciseToRoutine) would otherwise leave a previously
    // populated day empty and unrecoverable. One transaction makes the whole
    // save all-or-nothing (mirrors duplicateRoutine). runInTransaction chains,
    // so the helpers' own transactions nest safely.
    await runInTransaction(d, async () => {
    for (let i = 0; i < days.length; i++) {
      const day = days[i];
      let routineId = day.routineId;
      if (routineId) {
        // S5 edit mode: an existing routine, loaded for editing. Keep its
        // identity (workout history references it by routine_id, never by
        // routine_exercises row id) so past sessions stay linked; rename if
        // changed, then rebuild its exercise list from the current local
        // state. routine_exercises are lightweight template rows with no FK
        // from logged workout_sets, so clear-and-reinsert is safe here, the
        // same approach duplicateRoutine already uses to copy a routine.
        await updateRoutineName(routineId, day.name.trim() || `Day ${i + 1}`);
        const existingExercises = await getRoutineExercisesWithDetails(routineId);
        for (const { routineExercise } of existingExercises) {
          await removeExerciseFromRoutine(routineExercise.id);
        }
      } else {
        const routine = await createRoutine(
          user.id,
          day.name.trim() || `Day ${i + 1}`,
          null, null, 0, null,
          programmeId,
        );
        routineId = routine.id;
      }
      for (let j = 0; j < day.exercises.length; j++) {
        const ex = day.exercises[j];
        await addExerciseToRoutine(
          routineId, ex.id, j, ex.repsMin, ex.repsMax, null, ex.sets,
          null, ex.restSeconds ?? null, ex.supersetGroupId ?? null,
        );
      }
    }
    // Days that existed on load but were removed during this edit session:
    // soft-delete now so they drop out of the plan everywhere else
    // (PlanDetailScreen's workout list etc.)
    for (const routineId of removedRoutineIds) {
      await softDeleteRoutine(routineId);
    }
    });
  }

  const [successModal, setSuccessModal] = useState(false);
  const [savedPlanName, setSavedPlanName] = useState('');

  async function handleSaveAndActivate() {
    if (!validate(true)) return;
    setSaving(true);
    try {
      // A rename on this final builder page lives in editablePlanName, not
      // the page-1 planName it started from. Use whichever the user
      // actually finished with, so the activated plan and the success
      // modal below both reflect the name they last saw on screen (matches
      // handleSaveDraft/handleSaveEdit, which persist editablePlanName too).
      const finalName = editablePlanName.trim() || planName.trim() || 'My Plan';
      await updateProgrammeName(programmeId, finalName);
      await persistDays();
      await activatePlanWithBlock(user.id, programmeId, finalName);
      setSavedPlanName(finalName);
      setSuccessModal(true);
    } catch (e) {
      toast.show(e.message || "Couldn't save plan", { variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDraft() {
    if (!validate(false)) return;
    setSaving(true);
    try {
      // Persist any rename made on the builder page (persistDays writes only
      // the routines, not the programme name).
      await updateProgrammeName(programmeId, editablePlanName.trim() || 'My Plan');
      await persistDays();
      navigation.navigate('PlansTab');
    } catch (e) {
      toast.show(e.message || "Couldn't save draft", { variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  // S5 edit mode: a single Save, no separate Activate step. Re-running
  // activatePlanWithBlock on a plan someone is just editing would spin up a
  // brand new training block (and deload timing) as a side effect of, say,
  // adding one superset, an unrelated and surprising reset. Editing an
  // already-active plan should never touch that. Saves are lenient (matches
  // Save Draft), an edit session can leave a day empty and be finished later.
  async function handleSaveEdit() {
    if (!validate(false)) return;
    setSaving(true);
    try {
      // Persist the (possibly renamed) plan name too: persistDays only writes
      // the routines/day names, never the programme row.
      await updateProgrammeName(programmeId, editablePlanName.trim() || 'My Plan');
      await persistDays();
      toast.show('Plan updated', { variant: 'success' });
      navigation.goBack();
    } catch (e) {
      toast.show(e.message || "Couldn't save changes", { variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  // ── Loading an existing plan (S5 edit mode) ───────────────────────────────

  if (loadingExisting) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <BackHeader title="Edit plan" />
        <View style={styles.page2Content}>
          <Skeleton width="55%" height={24} />
          <SkeletonCard height={140} />
          <SkeletonCard height={140} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Page 1 render ─────────────────────────────────────────────────────────

  if (page === 1) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <BackHeader title="Create a plan" />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.page1Content}
            keyboardShouldPersistTaps="handled"
          >
            <Text maxFontSizeMultiplier={1.3} style={styles.subtitle}>
              Set up the basics, then add your workouts day by day.
            </Text>

            {/* Plan name */}
            <View style={styles.section}>
              <TextField
                label="Plan name"
                accessibilityLabel="Plan name"
                fieldStyle={styles.textField}
                inputStyle={styles.textInput}
                value={planName}
                onChangeText={setPlanName}
                placeholder="e.g. My Push Pull Legs"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                returnKeyType="done"
              />
            </View>

            {/* Goal */}
            <View style={styles.section}>
              <Text maxFontSizeMultiplier={1.3} style={styles.label}>Goal</Text>
              <View style={styles.pillWrap}>
                {GOALS.map(g => (
                  <Chip
                    key={g.key}
                    label={g.label}
                    selected={selectedGoal === g.key}
                    onPress={() => { haptics.selection(); setGoal(g.key); }}
                    accessibilityLabel={g.label}
                    style={styles.pill}
                    labelStyle={styles.pillText}
                  />
                ))}
              </View>
            </View>

            {/* Days per week */}
            <View style={styles.section}>
              <Text maxFontSizeMultiplier={1.3} style={styles.label}>Training days per week</Text>
              <View style={styles.pillWrap}>
                {DAY_COUNT_OPTIONS.map(n => (
                  <Chip
                    key={n}
                    label={String(n)}
                    selected={daysPerWeek === n}
                    onPress={() => { haptics.selection(); setDaysPerWeek(n); }}
                    accessibilityLabel={`${n} training days per week`}
                    style={styles.dayCountPill}
                    labelStyle={styles.pillText}
                  />
                ))}
              </View>
              <Text maxFontSizeMultiplier={1.3} style={styles.hintText}>
                We&apos;ll create {daysPerWeek} empty days. You can add or remove days later.
              </Text>
            </View>

            <Button
              title="Create plan and add workouts"
              icon="add-circle"
              size="lg"
              style={[styles.primaryBtn, creating && styles.btnDisabled]}
              textStyle={styles.primaryBtnText}
              onPress={handleCreatePlan}
              disabled={creating}
              loading={creating}
              accessibilityLabel="Create plan and add workouts"
              accessibilityState={{ disabled: creating }}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Page 2 render ─────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <BackHeader title={isEditMode ? 'Edit plan' : 'Create a plan'} />
      <ExercisePickerModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={handleExerciseSelected}
        saveLabel="Add to Plan"
      />

      <ScrollView
        contentContainerStyle={styles.page2Content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Editable plan name */}
        <TextField
          accessibilityLabel="Plan name"
          containerStyle={styles.planNameFieldContainer}
          fieldStyle={styles.planNameField}
          inputStyle={styles.planNameInput}
          value={editablePlanName}
          onChangeText={setEditableName}
          placeholder="Plan name"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="words"
          returnKeyType="done"
        />

        {/* Day cards */}
        {days.map((day, dayIdx) => (
          <Card key={day.localId} style={styles.dayCard}>
            {/* Day header */}
            <View style={styles.dayHeader}>
              <Text maxFontSizeMultiplier={1.3} style={styles.dayNumber}>Day {dayIdx + 1}</Text>
              <TextField
                accessibilityLabel={`Name for day ${dayIdx + 1}`}
                containerStyle={styles.dayNameFieldContainer}
                fieldStyle={styles.dayNameField}
                inputStyle={styles.dayNameInput}
                value={day.name}
                onChangeText={v => updateDayName(dayIdx, v)}
                placeholder="Day name"
                placeholderTextColor={colors.textMuted}
              />
              <TouchableOpacity
                onPress={() => handleDuplicateDay(dayIdx)}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={`Duplicate ${day.name}`}
              >
                <Ionicons name="copy-outline" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleRemoveDay(dayIdx)}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${day.name}`}
              >
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>

            {/* Exercise list */}
            {day.exercises.length > 0 && (() => {
              const selected = supersetSelection[dayIdx] || new Set();
              // Order in which group ids first appear, for stable A/B/C labels.
              const groupOrder = [];
              for (const ex of day.exercises) {
                if (ex.supersetGroupId && !groupOrder.includes(ex.supersetGroupId)) {
                  groupOrder.push(ex.supersetGroupId);
                }
              }
              return (
                <View style={styles.exList}>
                  {day.exercises.map((ex, exIdx) => {
                    const isSelected = selected.has(ex.localId);
                    const groupIdx = ex.supersetGroupId ? groupOrder.indexOf(ex.supersetGroupId) : -1;
                    const isFirst = exIdx === 0;
                    const isLast = exIdx === day.exercises.length - 1;
                    return (
                      <TouchableOpacity
                        key={ex.localId}
                        style={[styles.exRow, isSelected && styles.exRowSelected]}
                        onPress={() => toggleSupersetSelect(dayIdx, ex.localId)}
                        onLongPress={() => handleLongPressExercise(dayIdx, ex.localId, ex.name)}
                        delayLongPress={400}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`${ex.name}, ${ex.sets} sets`}
                        accessibilityHint="Tap to select for a superset, hold to remove"
                        accessibilityState={{ selected: isSelected }}
                      >
                        <Ionicons
                          name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                          size={18}
                          color={isSelected ? colors.primary : colors.textMuted}
                        />
                        <View style={styles.exRowLeft}>
                          <View style={styles.exNameRow}>
                            <Text maxFontSizeMultiplier={1.3} style={styles.exName}>{ex.name}</Text>
                            {groupIdx >= 0 && (
                              <View style={styles.ssChip}>
                                <Ionicons name="link" size={11} color={colors.primary} />
                                <Text maxFontSizeMultiplier={1.3} style={styles.ssChipText}>
                                  Superset {String.fromCharCode(65 + groupIdx)}
                                </Text>
                              </View>
                            )}
                          </View>
                          <View style={styles.controls}>
                            <TargetStepper
                              label="Sets"
                              value={ex.sets}
                              displayValue={ex.sets}
                              valueLabel={`${ex.sets} sets`}
                              decreaseLabel={`Decrease sets for ${ex.name}`}
                              increaseLabel={`Increase sets for ${ex.name}`}
                              min={1}
                              max={20}
                              onChange={(next) => setExerciseNumber(dayIdx, ex.localId, 'sets', next, 1, 20)}
                            />
                            <TargetStepper
                              label="Reps min"
                              value={ex.repsMin}
                              displayValue={ex.repsMin}
                              valueLabel={`${ex.repsMin} minimum reps`}
                              decreaseLabel={`Decrease minimum reps for ${ex.name}`}
                              increaseLabel={`Increase minimum reps for ${ex.name}`}
                              min={1}
                              max={50}
                              onChange={(next) => setExerciseNumber(dayIdx, ex.localId, 'repsMin', next, 1, 50)}
                            />
                            <TargetStepper
                              label="Reps max"
                              value={ex.repsMax}
                              displayValue={ex.repsMax}
                              valueLabel={`${ex.repsMax} maximum reps`}
                              decreaseLabel={`Decrease maximum reps for ${ex.name}`}
                              increaseLabel={`Increase maximum reps for ${ex.name}`}
                              min={1}
                              max={50}
                              onChange={(next) => setExerciseNumber(dayIdx, ex.localId, 'repsMax', next, 1, 50)}
                            />
                            <TargetStepper
                              label="Rest"
                              value={ex.restSeconds ?? DEFAULT_REST}
                              displayValue={formatRest(ex.restSeconds ?? DEFAULT_REST)}
                              valueLabel={`Rest ${formatRest(ex.restSeconds ?? DEFAULT_REST)}`}
                              decreaseLabel={`Decrease rest for ${ex.name}`}
                              increaseLabel={`Increase rest for ${ex.name}`}
                              min={30}
                              max={600}
                              step={15}
                              onChange={(next) => setExerciseNumber(dayIdx, ex.localId, 'restSeconds', next, 30, 600)}
                            />
                          </View>
                        </View>
                        <View style={styles.reorderCol}>
                          <TouchableOpacity
                            onPress={() => moveExercise(dayIdx, ex.localId, 'up')}
                            disabled={isFirst}
                            style={[styles.reorderBtn, isFirst && styles.reorderBtnDisabled]}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            accessibilityRole="button"
                            accessibilityLabel={`Move ${ex.name} up`}
                            accessibilityState={{ disabled: isFirst }}
                          >
                            <Ionicons name="chevron-up" size={14} color={isFirst ? colors.border : colors.textMuted} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => moveExercise(dayIdx, ex.localId, 'down')}
                            disabled={isLast}
                            style={[styles.reorderBtn, isLast && styles.reorderBtnDisabled]}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            accessibilityRole="button"
                            accessibilityLabel={`Move ${ex.name} down`}
                            accessibilityState={{ disabled: isLast }}
                          >
                            <Ionicons name="chevron-down" size={14} color={isLast ? colors.border : colors.textMuted} />
                          </TouchableOpacity>
                        </View>
                        {groupIdx >= 0 && (
                          <TouchableOpacity
                            onPress={() => handleUngroupSuperset(dayIdx, ex.supersetGroupId)}
                            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                            accessibilityRole="button"
                            accessibilityLabel={`Ungroup superset ${String.fromCharCode(65 + groupIdx)}`}
                          >
                            <Ionicons name="close-circle-outline" size={16} color={colors.textMuted} />
                          </TouchableOpacity>
                        )}
                      </TouchableOpacity>
                    );
                  })}

                  {selected.size >= 2 && (
                    <View style={styles.groupBtnRow}>
                      <Button
                        title={`Group ${selected.size} into superset`}
                        icon="link"
                        variant="tertiary"
                        size="sm"
                        onPress={() => handleGroupSuperset(dayIdx)}
                        style={styles.groupBtn}
                        textStyle={styles.groupBtnText}
                        accessibilityLabel={`Group ${selected.size} exercises into a superset`}
                      />
                      {/* NV-2: "superset" is unexplained jargon for a novice
                          building their own plan (no equivalent of the
                          in-session teaching modal here). */}
                      <InfoTooltip text={GLOSSARY.superset} size={14} />
                    </View>
                  )}
                </View>
              );
            })()}

            {/* Add exercise button */}
            <Button
              title="Add exercise"
              icon="add"
              variant="tertiary"
              size="sm"
              fullWidth={false}
              onPress={() => openPicker(dayIdx)}
              style={styles.addExBtn}
              textStyle={styles.addExText}
              accessibilityLabel="Add exercise"
            />
          </Card>
        ))}

        {/* Add day */}
        <Button
          title="Add day"
          icon="add-circle-outline"
          variant="outline"
          onPress={handleAddDay}
          style={styles.addDayBtn}
          textStyle={styles.addDayText}
          accessibilityLabel="Add day"
        />

        {/* Plan balance */}
        <PlanBalanceCard days={days} />

        {/* Action buttons. Editing an existing plan gets one calm Save: no
            separate Activate step, so saving a superset tweak never spins up
            a new training block as a side effect (see handleSaveEdit). */}
        {isEditMode ? (
          <View style={styles.actionRow}>
            <Button
              title="Save changes"
              icon="checkmark-circle"
              style={[styles.activateBtn, saving && styles.btnDisabled]}
              textStyle={styles.activateBtnText}
              onPress={handleSaveEdit}
              disabled={saving}
              loading={saving}
              accessibilityLabel="Save changes"
              accessibilityState={{ disabled: saving }}
            />
          </View>
        ) : (
          <View style={styles.actionRow}>
            <Button
              title="Save draft"
              variant="secondary"
              style={[styles.draftBtn, saving && styles.btnDisabled]}
              textStyle={styles.draftBtnText}
              onPress={handleSaveDraft}
              disabled={saving}
              loading={saving}
              accessibilityLabel="Save draft"
              accessibilityState={{ disabled: saving }}
            />
            <Button
              title="Save and activate"
              icon="flash"
              style={[styles.activateBtn, saving && styles.btnDisabled]}
              textStyle={styles.activateBtnText}
              onPress={handleSaveAndActivate}
              disabled={saving}
              loading={saving}
              accessibilityLabel="Save and activate"
              accessibilityState={{ disabled: saving }}
            />
          </View>
        )}
      </ScrollView>

      {/* Success Sheet */}
      <BottomSheet
        visible={successModal}
        onClose={() => setSuccessModal(false)}
        accessibilityLabel="Plan activated"
        sheetStyle={styles.successSheet}
      >
        <View style={styles.successIconWrap}>
          <Ionicons name="checkmark-circle" size={48} color={colors.success} />
        </View>
        <Text maxFontSizeMultiplier={1.3} style={styles.successTitle}>Plan activated</Text>
        <Text maxFontSizeMultiplier={1.3} style={styles.successName}>{savedPlanName}</Text>
        <Text maxFontSizeMultiplier={1.3} style={styles.successSub}>Your plan is set as active and ready to use.</Text>
        <View style={styles.successActions}>
          <Button
            title="Stay here"
            variant="secondary"
            fullWidth={false}
            style={styles.successSecondary}
            textStyle={styles.successSecondaryText}
            onPress={() => setSuccessModal(false)}
            accessibilityLabel="Stay here"
          />
          <Button
            title="Go to Train"
            icon="home"
            fullWidth={false}
            style={styles.successPrimary}
            textStyle={styles.successPrimaryText}
            onPress={() => { setSuccessModal(false); navigation.navigate('HomeTab'); }}
            accessibilityLabel="Go to Train"
          />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Page 1 ──────────────────────────────────────────────────────────────────

  page1Content: {
    padding: spacing.lg,
    gap: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  subtitle: {
    ...type.bodySm,
    color: colors.textMuted,
    marginTop: 0,
  },
  section: {
    gap: spacing.md,
  },
  label: {
    ...type.label,
    color: colors.textSecondary,
  },
  textField: {
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
  },
  textInput: {
    ...type.body,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  pillText: {
    ...type.label,
  },
  dayCountPill: {
    minWidth: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  hintText: {
    ...type.captionTight,
    color: colors.textMuted,
  },
  primaryBtn: {
    marginTop: spacing.sm,
  },
  primaryBtnText: {
    ...type.title,
    color: colors.onPrimary,
  },
  btnDisabled: {
    opacity: 0.5,
  },

  // ── Page 2 ──────────────────────────────────────────────────────────────────

  page2Content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  planNameFieldContainer: {
    gap: 0,
    marginBottom: spacing.xs,
  },
  planNameField: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    borderRadius: 0,
    minHeight: 48,
  },
  planNameInput: {
    ...type.h2,
    paddingBottom: spacing.sm,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  dayCard: {
    padding: 0,
    overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dayNumber: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black,
    color: colors.primary,
    minWidth: 44,
  },
  dayNameFieldContainer: {
    flex: 1,
    gap: 0,
  },
  dayNameField: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    minHeight: 32,
  },
  dayNameInput: {
    ...type.bodyStrong,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  exList: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    gap: spacing.xs,
  },
  exRow: {
    flexDirection: 'row',
    // flex-start, not center: the control row below the exercise name can
    // wrap onto a second line, so the leading select icon stays pinned to
    // the name rather than floating in the middle of a taller row.
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface3,
  },
  exRowSelected: {
    backgroundColor: colors.primaryBg,
    borderRadius: radius.sm,
  },
  exRowLeft: {
    flex: 1,
    gap: spacing.xxs,
  },
  // T7: up/down reorder controls, same reorderActions/reorderBtn look as
  // RoutineDetailScreen's existing exercise-reorder chevrons.
  reorderCol: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  reorderBtn: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
  },
  reorderBtnDisabled: {
    opacity: 0.3,
  },
  exNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  ssChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryBg,
  },
  ssChipText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  groupBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  groupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    flex: 1,
  },
  groupBtnText: {
    ...type.label,
    color: colors.primary,
  },
  exName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  // Target steppers (S5): compact layout around the shared Stepper primitive.
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  controlGroup: {
    gap: spacing.xs,
    alignItems: 'center',
    minWidth: 70,
  },
  controlLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
  addExBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  addExText: {
    ...type.label,
    color: colors.primary,
  },
  addDayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderStyle: 'dashed',
    paddingVertical: spacing.lg,
  },
  addDayText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  draftBtn: {
    flex: 1,
    paddingVertical: spacing.lg,
  },
  draftBtnText: {
    ...type.bodyStrong,
    color: colors.textSecondary,
  },
  activateBtn: {
    flex: 2,
    paddingVertical: spacing.lg,
  },
  activateBtnText: {
    ...type.bodyStrong,
    color: colors.onPrimary,
  },
  successSheet: {
    alignItems: 'center',
    gap: spacing.md,
  },
  successIconWrap: {
    marginBottom: spacing.sm,
  },
  successTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.black,
    color: colors.textPrimary,
  },
  successName: {
    ...type.title,
    color: colors.primary,
    textAlign: 'center',
  },
  successSub: {
    ...type.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  successActions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  successSecondary: {
    flex: 1,
    paddingVertical: spacing.lg,
  },
  successSecondaryText: {
    ...type.bodyStrong,
    color: colors.textSecondary,
  },
  successPrimary: {
    flex: 1,
    paddingVertical: spacing.lg,
  },
  successPrimaryText: {
    ...type.bodyStrong,
    color: colors.onPrimary,
  },
});

const balanceStyles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: '45%',
    flex: 1,
  },
  dot: {
    fontSize: fontSize.sm,
    lineHeight: 16,
  },
  muscleName: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  setCount: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.semibold,
    minWidth: 24,
    textAlign: 'right',
  },
  // Card owns background/radius/padding here.
  warningBox: {
    gap: spacing.sm,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  warningText: {
    ...type.captionTight,
    flex: 1,
    color: colors.textMuted,
  },
});
