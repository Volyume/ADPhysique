import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import BackHeader from '../components/BackHeader';
import ExercisePickerModal from '../components/ExercisePickerModal';

import { colors, fontSize, fontWeight, spacing, radius, type } from '../styles/theme';
import {
  createProgramme, createRoutine, addExerciseToRoutine,
  activatePlanWithBlock,
} from '../lib/database';
import { MUSCLE_DISPLAY_NAMES, VOLUME_LANDMARKS } from '../lib/algorithms';
import useAppStore from '../store/useAppStore';
import { useToast } from '../components/Toast';

// ─── Constants ────────────────────────────────────────────────────────────────

const GOALS = [
  { key: 'hypertrophy', label: 'Build Muscle' },
  { key: 'balanced',    label: 'Balanced Bodybuilding' },
  { key: 'aesthetic',   label: 'Aesthetic Focus' },
  { key: 'strength',    label: 'Strength-Biased' },
  { key: 'recomp',      label: 'Lose Fat, Keep Muscle' },
];

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
    <View style={balanceStyles.card}>
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
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ManualBuilderScreen({ navigation }) {
  const { user } = useAppStore();
  const toast = useToast();

  // Page 1 state
  const [page, setPage]               = useState(1);
  const [planName, setPlanName]       = useState('');
  const [selectedGoal, setGoal]       = useState('hypertrophy');
  const daysPerWeek                   = 4;
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

  function updateDayName(dayIndex, newName) {
    setDayList(prev => prev.map((d, i) => i === dayIndex ? { ...d, name: newName } : d));
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
        await addExerciseToRoutine(routine.id, ex.id, j, ex.repsMin, ex.repsMax, null, ex.sets);
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
              Set up the basics, then we will walk you through adding workouts day by day.
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
                  >
                    <Text style={[styles.pillText, selectedGoal === g.key && styles.pillTextActive]}>
                      {g.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, creating && styles.btnDisabled]}
              onPress={handleCreatePlan}
              disabled={creating}
            >
              <Ionicons name="add-circle" size={20} color={colors.background} />
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
          <View key={day.localId} style={styles.dayCard}>
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
            </View>

            {/* Exercise list */}
            {day.exercises.length > 0 && (
              <View style={styles.exList}>
                {day.exercises.map(ex => (
                  <TouchableOpacity
                    key={ex.localId}
                    style={styles.exRow}
                    onLongPress={() => handleLongPressExercise(dayIdx, ex.localId, ex.name)}
                    delayLongPress={400}
                    activeOpacity={0.7}
                  >
                    <View style={styles.exRowLeft}>
                      <Text style={styles.exName}>{ex.name}</Text>
                      <Text style={styles.exMeta}>
                        {ex.sets} sets × {ex.repsMin}–{ex.repsMax} reps
                      </Text>
                    </View>
                    <Ionicons name="ellipsis-horizontal" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Add exercise button */}
            <TouchableOpacity style={styles.addExBtn} onPress={() => openPicker(dayIdx)}>
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={styles.addExText}>Add Exercise</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Add day */}
        <TouchableOpacity style={styles.addDayBtn} onPress={handleAddDay}>
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
          >
            <Text style={styles.draftBtnText}>Save Draft</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.activateBtn, saving && styles.btnDisabled]}
            onPress={handleSaveAndActivate}
            disabled={saving}
          >
            <Ionicons name="flash" size={18} color={colors.background} />
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
              >
                <Text style={styles.successSecondaryText}>Stay Here</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.successPrimary}
                onPress={() => { setSuccessModal(false); navigation.navigate('HomeTab'); }}
              >
                <Ionicons name="home" size={16} color={colors.background} />
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
  pillRow: {
    flexDirection: 'row',
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
  dayPill: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
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
    color: colors.background,
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
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
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
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface3,
  },
  exRowLeft: {
    flex: 1,
    gap: spacing.xxs,
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
    color: colors.background,
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
    color: colors.background,
  },
});

const balanceStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
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
