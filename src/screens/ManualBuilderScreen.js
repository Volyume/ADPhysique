import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import BackHeader from '../components/BackHeader';
import Card from '../components/Card';
import ExercisePickerModal from '../components/ExercisePickerModal';

import { colors, fontSize, fontWeight, spacing, radius, type } from '../styles/theme';
import {
  createProgramme, createRoutine, addExerciseToRoutine,
  activatePlanWithBlock,
} from '../lib/database';
import { MUSCLE_DISPLAY_NAMES, VOLUME_LANDMARKS } from '../lib/algorithms';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useToast } from '../components/Toast';

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
        <Text style={balanceStyles.title}>Plan Balance</Text>
      </View>

      <View style={balanceStyles.grid}>
        {rows.map(({ muscle, sets, status }) => (
          <View key={muscle} style={balanceStyles.cell}>
            <Text style={[balanceStyles.dot, { color: STATUS_COLOR[status] }]}>
              {STATUS_DOT[status]}
            </Text>
            <Text style={balanceStyles.muscleName}>{MUSCLE_DISPLAY_NAMES[muscle]}</Text>
            {sets > 0 && (
              <Text style={balanceStyles.setCount}>{sets}×</Text>
            )}
          </View>
        ))}
      </View>

      {warnings.length > 0 && (
        <View style={balanceStyles.warningBox}>
          {warnings.map(({ muscle, status }) => (
            <View key={muscle} style={balanceStyles.warningRow}>
              <Ionicons
                name={status === 'none' ? 'alert-circle-outline' : 'information-circle-outline'}
                size={14}
                color={status === 'none' ? colors.warning : colors.textMuted}
              />
              <Text style={[balanceStyles.warningText, status === 'none' && { color: colors.warning }]}>
                {status === 'none'
                  ? `No ${MUSCLE_DISPLAY_NAMES[muscle]} work in this plan`
                  : `${MUSCLE_DISPLAY_NAMES[muscle]} work is low. Consider adding a set or two.`}
              </Text>
            </View>
          ))}
        </View>
      )}

      {overloaded.length > 0 && (
        <View style={balanceStyles.warningBox}>
          {overloaded.map(({ muscle }) => (
            <View key={muscle} style={balanceStyles.warningRow}>
              <Ionicons name="warning-outline" size={14} color={colors.error} />
              <Text style={[balanceStyles.warningText, { color: colors.error }]}>
                {`${MUSCLE_DISPLAY_NAMES[muscle]} volume is very high. This may affect recovery.`}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ManualBuilderScreen({ navigation }) {
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
            sets:         3,
            repsMin:      exercise.defaultRepMin || exercise.default_rep_min || 8,
            repsMax:      exercise.defaultRepMax || exercise.default_rep_max || 12,
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
    setDayList(prev => [
      ...prev,
      { localId: `day-${Date.now()}`, name: `Day ${prev.length + 1}`, exercises: [], routineId: null },
    ]);
  }

  function handleRemoveDay(dayIndex) {
    // Same Undo pattern as exercise removal: remove immediately, no
    // confirm Alert, an Undo toast restores the whole day (incl. its
    // exercises) at its original position.
    let removed = null;
    setDayList(prev => {
      if (dayIndex < 0 || dayIndex >= prev.length) return prev;
      removed = prev[dayIndex];
      return prev.filter((_, i) => i !== dayIndex);
    });
    if (!removed) return;
    toast.show(`Removed ${removed.name}`, {
      variant: 'undo',
      action: {
        label: 'Undo',
        onPress: () => {
          setDayList(prev => {
            const next = prev.slice();
            next.splice(dayIndex, 0, removed);
            return next;
          });
        },
      },
    });
  }

  function updateDayName(dayIndex, newName) {
    setDayList(prev => prev.map((d, i) => i === dayIndex ? { ...d, name: newName } : d));
  }

  // ── Supersets ─────────────────────────────────────────────────────────────
  // Exercises in a day that share the same supersetGroupId are one superset.
  // The user multi-selects rows (per day) then groups them; the engine and
  // ActiveWorkout already understand a shared supersetGroupId. We only write
  // the existing field — no schema or write-path change.

  // { [dayIdx]: Set<exLocalId> } of rows currently selected for grouping.
  const [supersetSelection, setSupersetSelection] = useState({});

  function toggleSupersetSelect(dayIndex, exLocalId) {
    setSupersetSelection(prev => {
      const cur = new Set(prev[dayIndex] || []);
      if (cur.has(exLocalId)) cur.delete(exLocalId);
      else cur.add(exLocalId);
      return { ...prev, [dayIndex]: cur };
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
    for (let i = 0; i < days.length; i++) {
      const day = days[i];
      const routine = await createRoutine(
        user.id,
        day.name.trim() || `Day ${i + 1}`,
        null, null, 0, null,
        programmeId,
      );
      for (let j = 0; j < day.exercises.length; j++) {
        const ex = day.exercises[j];
        await addExerciseToRoutine(
          routine.id, ex.id, j, ex.repsMin, ex.repsMax, null, ex.sets,
          null, null, ex.supersetGroupId ?? null,
        );
      }
    }
  }

  const [successModal, setSuccessModal] = useState(false);
  const [savedPlanName, setSavedPlanName] = useState('');

  async function handleSaveAndActivate() {
    if (!validate(true)) return;
    setSaving(true);
    try {
      await persistDays();
      await activatePlanWithBlock(user.id, programmeId, planName.trim() || 'My Plan');
      setSavedPlanName(planName.trim() || 'Your plan');
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
      await persistDays();
      navigation.navigate('PlansTab');
    } catch (e) {
      toast.show(e.message || "Couldn't save draft", { variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  // ── Page 1 render ─────────────────────────────────────────────────────────

  if (page === 1) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <BackHeader title="Build a Plan" />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.page1Content}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.subtitle}>
              Set up the basics, then add your workouts day by day.
            </Text>

            {/* Plan name */}
            <View style={styles.section}>
              <Text style={styles.label}>Plan name</Text>
              <TextInput
                style={styles.textInput}
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
              <Text style={styles.label}>Goal</Text>
              <View style={styles.pillWrap}>
                {GOALS.map(g => (
                  <TouchableOpacity
                    key={g.key}
                    style={[styles.pill, selectedGoal === g.key && styles.pillActive]}
                    onPress={() => setGoal(g.key)}
                    accessibilityRole="button"
                    accessibilityLabel={g.label}
                    accessibilityState={{ selected: selectedGoal === g.key }}
                  >
                    <Text style={[styles.pillText, selectedGoal === g.key && styles.pillTextActive]}>
                      {g.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Days per week */}
            <View style={styles.section}>
              <Text style={styles.label}>Training days per week</Text>
              <View style={styles.pillWrap}>
                {DAY_COUNT_OPTIONS.map(n => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.dayCountPill, daysPerWeek === n && styles.pillActive]}
                    onPress={() => setDaysPerWeek(n)}
                    accessibilityRole="button"
                    accessibilityLabel={`${n} training days per week`}
                    accessibilityState={{ selected: daysPerWeek === n }}
                  >
                    <Text style={[styles.pillText, daysPerWeek === n && styles.pillTextActive]}>
                      {n}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.hintText}>
                We&apos;ll create {daysPerWeek} empty days. You can add or remove days later.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, creating && styles.btnDisabled]}
              onPress={handleCreatePlan}
              disabled={creating}
              accessibilityRole="button"
              accessibilityLabel="Create plan and add workouts"
              accessibilityState={{ disabled: creating }}
            >
              <Ionicons name="add-circle" size={20} color={colors.onPrimary} />
              <Text style={styles.primaryBtnText}>Create Plan & Add Workouts</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Page 2 render ─────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <BackHeader title="Build a Plan" />
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
        <TextInput
          style={styles.planNameInput}
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
              <Text style={styles.dayNumber}>Day {dayIdx + 1}</Text>
              <TextInput
                style={styles.dayNameInput}
                value={day.name}
                onChangeText={v => updateDayName(dayIdx, v)}
                placeholder="Day name"
                placeholderTextColor={colors.textMuted}
              />
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
                  {day.exercises.map(ex => {
                    const isSelected = selected.has(ex.localId);
                    const groupIdx = ex.supersetGroupId ? groupOrder.indexOf(ex.supersetGroupId) : -1;
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
                            <Text style={styles.exName}>{ex.name}</Text>
                            {groupIdx >= 0 && (
                              <View style={styles.ssChip}>
                                <Ionicons name="link" size={11} color={colors.primary} />
                                <Text style={styles.ssChipText}>
                                  Superset {String.fromCharCode(65 + groupIdx)}
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.exMeta}>
                            {ex.sets} sets × {ex.repsMin}–{ex.repsMax} reps
                          </Text>
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
                    <TouchableOpacity
                      style={styles.groupBtn}
                      onPress={() => handleGroupSuperset(dayIdx)}
                      accessibilityRole="button"
                      accessibilityLabel={`Group ${selected.size} exercises into a superset`}
                    >
                      <Ionicons name="link" size={16} color={colors.primary} />
                      <Text style={styles.groupBtnText}>
                        Group {selected.size} into superset
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })()}

            {/* Add exercise button */}
            <TouchableOpacity style={styles.addExBtn} onPress={() => openPicker(dayIdx)} accessibilityRole="button" accessibilityLabel="Add exercise">
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={styles.addExText}>Add Exercise</Text>
            </TouchableOpacity>
          </Card>
        ))}

        {/* Add day */}
        <TouchableOpacity style={styles.addDayBtn} onPress={handleAddDay} accessibilityRole="button" accessibilityLabel="Add day">
          <Ionicons name="add-circle-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.addDayText}>Add Day</Text>
        </TouchableOpacity>

        {/* Plan balance */}
        <PlanBalanceCard days={days} />

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.draftBtn, saving && styles.btnDisabled]}
            onPress={handleSaveDraft}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Save draft"
            accessibilityState={{ disabled: saving }}
          >
            <Text style={styles.draftBtnText}>Save Draft</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.activateBtn, saving && styles.btnDisabled]}
            onPress={handleSaveAndActivate}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Save and activate"
            accessibilityState={{ disabled: saving }}
          >
            <Ionicons name="flash" size={18} color={colors.onPrimary} />
            <Text style={styles.activateBtnText}>Save & Activate</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Success Modal */}
      <Modal visible={successModal} transparent animationType="fade" onRequestClose={() => setSuccessModal(false)}>
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            </View>
            <Text style={styles.successTitle}>Plan Activated</Text>
            <Text style={styles.successName}>{savedPlanName}</Text>
            <Text style={styles.successSub}>Your plan is set as active and ready to use.</Text>
            <View style={styles.successActions}>
              <TouchableOpacity
                style={styles.successSecondary}
                onPress={() => setSuccessModal(false)}
                accessibilityRole="button"
                accessibilityLabel="Stay here"
              >
                <Text style={styles.successSecondaryText}>Stay Here</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.successPrimary}
                onPress={() => { setSuccessModal(false); navigation.navigate('HomeTab'); }}
                accessibilityRole="button"
                accessibilityLabel="Go to Train"
              >
                <Ionicons name="home" size={16} color={colors.onPrimary} />
                <Text style={styles.successPrimaryText}>Go to Train</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
    marginTop: 0,
  },
  section: {
    gap: spacing.md,
  },
  label: {
    ...type.label,
    color: colors.textSecondary,
  },
  textInput: {
    ...type.body,
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primary,
  },
  pillText: {
    ...type.label,
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  dayCountPill: {
    minWidth: 48,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hintText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 16,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
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
  planNameInput: {
    ...type.h2,
    color: colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing.sm,
    marginBottom: spacing.xs,
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
    letterSpacing: 0.3,
    minWidth: 44,
  },
  dayNameInput: {
    ...type.bodyStrong,
    flex: 1,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  exList: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    gap: spacing.xs,
  },
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  groupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
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
  exMeta: {
    ...type.num('caption'),
    color: colors.textMuted,
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
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  draftBtnText: {
    ...type.bodyStrong,
    color: colors.textSecondary,
  },
  activateBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
  },
  activateBtnText: {
    ...type.bodyStrong,
    color: colors.onPrimary,
  },
  successOverlay: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  successCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
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
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
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
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  successSecondaryText: {
    ...type.bodyStrong,
    color: colors.textSecondary,
  },
  successPrimary: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
    letterSpacing: 0.3,
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
  warningBox: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 16,
  },
});
