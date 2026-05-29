import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList,
  Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import { getAllExercises, createWorkout } from '../lib/database';
import { MUSCLE_DISPLAY_NAMES } from '../lib/algorithms';
import { generateTravelPlan } from '../lib/travelMode';
import useAppStore from '../store/useAppStore';
import { logError } from '../lib/errorLog';

const DEFAULT_SETS = 3;
const DEFAULT_REST = 90;

export default function BuildWorkoutScreen({ navigation }) {
  const { user, startWorkout, units } = useAppStore();
  const [exercises, setExercises] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [query, setQuery] = useState('');
  const [allExercises, setAllExercises] = useState([]);
  const [starting, setStarting] = useState(false);
  const [showTravelModal, setShowTravelModal] = useState(false);
  const [travelEquipment, setTravelEquipment] = useState('bodyweight');

  async function openPicker() {
    if (allExercises.length === 0) {
      const all = await getAllExercises();
      setAllExercises(all);
    }
    setQuery('');
    setShowPicker(true);
  }

  function addExercise(exercise) {
    setExercises(prev => [...prev, {
      key: `${exercise.id}-${Date.now()}`,
      exercise,
      sets: DEFAULT_SETS,
      repsMin: exercise.defaultRepMin || 8,
      repsMax: exercise.defaultRepMax || 12,
      restSeconds: DEFAULT_REST,
      startingWeight: 0,
    }]);
    setShowPicker(false);
  }

  function removeExercise(key) {
    setExercises(prev => prev.filter(e => e.key !== key));
  }

  function updateField(key, field, value) {
    setExercises(prev => prev.map(e => e.key === key ? { ...e, [field]: value } : e));
  }

  function adjustSets(key, delta) {
    setExercises(prev => prev.map(e => {
      if (e.key !== key) return e;
      const next = Math.max(1, Math.min(20, e.sets + delta));
      return { ...e, sets: next };
    }));
  }

  function adjustRest(key, delta) {
    setExercises(prev => prev.map(e => {
      if (e.key !== key) return e;
      const next = Math.max(30, Math.min(600, e.restSeconds + delta));
      return { ...e, restSeconds: next };
    }));
  }

  async function handleStartTraining() {
    if (exercises.length === 0) {
      Alert.alert('No exercises', 'Add at least one exercise or tap Skip Setup to start empty.');
      return;
    }
    setStarting(true);
    try {
      const workout = await createWorkout(user.id);
      const initialExercises = exercises.map(({ exercise, sets, repsMin, repsMax, restSeconds, startingWeight }) => ({
        exercise,
        routineExercise: {
          recommendedSets: sets,
          recommendedRepsMin: repsMin,
          recommendedRepsMax: repsMax,
          restSeconds,
          startingWeight,
          notes: null,
        },
        sets: [],
      }));
      startWorkout(workout, initialExercises);
      navigation.replace('ActiveWorkout');
    } catch (e) {
      logError('BuildWorkoutScreen.handleStartTraining', e, { userId: user?.id, exerciseCount: exercises.length });
      Alert.alert('Couldn\'t start workout', e?.message ?? 'Try again.');
    } finally {
      setStarting(false);
    }
  }

  async function handleSkip() {
    try {
      const workout = await createWorkout(user.id);
      startWorkout(workout, []);
      navigation.replace('ActiveWorkout');
    } catch (e) {
      logError('BuildWorkoutScreen.handleSkip', e, { userId: user?.id });
      Alert.alert('Couldn\'t start workout', e?.message ?? 'Try again.');
    }
  }

  async function applyTravelMode() {
    setShowTravelModal(false);
    const all = allExercises.length > 0 ? allExercises : await getAllExercises();
    if (allExercises.length === 0) setAllExercises(all);
    const plan = generateTravelPlan({ equipment: travelEquipment, daysPerWeek: 4, splitType: 'full_body' });
    const session = plan.sessions[0];
    const newItems = session.exercises.map(ex => {
      const nameLower = ex.exerciseName.toLowerCase();
      const match = all.find(e => e.name.toLowerCase() === nameLower)
        ?? all.find(e => e.name.toLowerCase().includes(nameLower.split(' ')[0]));
      const exercise = match ?? {
        id: `travel-${Date.now()}-${Math.random()}`,
        name: ex.exerciseName,
        primaryMuscle: '',
        equipment: travelEquipment,
      };
      return {
        key: `${exercise.id}-${Date.now()}-${Math.random()}`,
        exercise,
        sets: ex.sets,
        repsMin: ex.repsMin,
        repsMax: ex.repsMax,
        restSeconds: ex.restSec,
        startingWeight: 0,
      };
    });
    setExercises(newItems);
  }

  const filtered = query.trim()
    ? allExercises.filter(e => e.name.toLowerCase().includes(query.toLowerCase()))
    : allExercises.slice(0, 50);

  function formatRest(secs) {
    if (secs < 60) return `${secs}s`;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return s === 0 ? `${m}m` : `${m}m ${s}s`;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity testID="volyume-btn-skip-setup" onPress={handleSkip} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.skipText}>Skip Setup</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Build Workout</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>Add exercises and set your targets before you start.</Text>

        {/* Travel Mode quick-fill */}
        <TouchableOpacity style={styles.travelChip} onPress={() => setShowTravelModal(true)}>
          <Ionicons name="airplane-outline" size={15} color={colors.primary} />
          <Text style={styles.travelChipText}>Travel / Hotel Gym Mode</Text>
          <Ionicons name="chevron-forward" size={13} color={colors.textMuted} />
        </TouchableOpacity>

        {exercises.map((item, index) => (
          <View key={item.key} style={styles.exerciseCard}>
            <View style={styles.exerciseCardHeader}>
              <View style={styles.indexBadge}>
                <Text style={styles.indexNum}>{index + 1}</Text>
              </View>
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{item.exercise.name}</Text>
                <Text style={styles.exerciseMuscle}>
                  {MUSCLE_DISPLAY_NAMES[item.exercise.primaryMuscle] ||
                    (item.exercise.primaryMuscle || '').charAt(0).toUpperCase() +
                    (item.exercise.primaryMuscle || '').slice(1).replace(/_/g, ' ')}
                  {item.exercise.equipment ? ` · ${item.exercise.equipment}` : ''}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => removeExercise(item.key)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close-circle-outline" size={22} color={colors.error} />
              </TouchableOpacity>
            </View>

            <View style={styles.controls}>
              {/* Sets */}
              <View style={styles.controlGroup}>
                <Text style={styles.controlLabel}>Sets</Text>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => adjustSets(item.key, -1)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="remove" size={16} color={colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.stepValue}>{item.sets}</Text>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => adjustSets(item.key, 1)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="add" size={16} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Rep Range */}
              <View style={styles.controlGroup}>
                <Text style={styles.controlLabel}>Reps</Text>
                <View style={styles.repRow}>
                  <TextInput
                    style={styles.repInput}
                    value={String(item.repsMin)}
                    onChangeText={v => updateField(item.key, 'repsMin', parseInt(v) || item.repsMin)}
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                  <Text style={styles.repSep}>–</Text>
                  <TextInput
                    style={styles.repInput}
                    value={String(item.repsMax)}
                    onChangeText={v => updateField(item.key, 'repsMax', parseInt(v) || item.repsMax)}
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                </View>
              </View>

              {/* Rest */}
              <View style={styles.controlGroup}>
                <Text style={styles.controlLabel}>Rest</Text>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => adjustRest(item.key, -15)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="remove" size={16} color={colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.stepValue}>{formatRest(item.restSeconds)}</Text>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => adjustRest(item.key, 15)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="add" size={16} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Starting Weight */}
              <View style={styles.controlGroup}>
                <Text style={styles.controlLabel}>Start ({units})</Text>
                <TextInput
                  style={styles.weightInput}
                  value={item.startingWeight > 0 ? String(item.startingWeight) : ''}
                  onChangeText={v => updateField(item.key, 'startingWeight', parseFloat(v) || 0)}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  maxLength={6}
                />
              </View>
            </View>
          </View>
        ))}

        <TouchableOpacity testID="volyume-btn-add-exercise" style={styles.addBtn} onPress={openPicker}>
          <Ionicons name="add" size={20} color={colors.primary} />
          <Text style={styles.addBtnText}>Add Exercise</Text>
        </TouchableOpacity>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          testID="volyume-btn-start-training"
          style={[styles.startBtn, (starting || exercises.length === 0) && styles.startBtnDisabled]}
          onPress={handleStartTraining}
          disabled={starting || exercises.length === 0}
        >
          <Ionicons name="play-circle" size={22} color={colors.background} />
          <Text style={styles.startBtnText}>
            Start Training{exercises.length > 0 ? ` (${exercises.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Travel Mode equipment picker */}
      <Modal visible={showTravelModal} transparent animationType="fade" onRequestClose={() => setShowTravelModal(false)}>
        <View style={styles.travelOverlay}>
          <View style={styles.travelCard}>
            <Text style={styles.travelTitle}>Travel / Hotel Gym</Text>
            <Text style={styles.travelSub}>Choose available equipment. We'll build a full-body session that maintains your muscle while away from the gym.</Text>
            <View style={styles.travelOptions}>
              {[
                { id: 'bodyweight', label: 'Bodyweight only', icon: 'body-outline' },
                { id: 'dumbbells',  label: 'Dumbbells',       icon: 'barbell-outline' },
                { id: 'hotel_gym',  label: 'Hotel gym',        icon: 'fitness-outline' },
              ].map(opt => (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.travelOpt, travelEquipment === opt.id && styles.travelOptActive]}
                  onPress={() => setTravelEquipment(opt.id)}
                >
                  <Ionicons name={opt.icon} size={20} color={travelEquipment === opt.id ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.travelOptText, travelEquipment === opt.id && { color: colors.primary }]}>{opt.label}</Text>
                  {travelEquipment === opt.id && <Ionicons name="checkmark-circle" size={16} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.travelBtns}>
              <TouchableOpacity style={styles.travelCancel} onPress={() => setShowTravelModal(false)}>
                <Text style={styles.travelCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.travelConfirm} onPress={applyTravelMode}>
                <Text style={styles.travelConfirmText}>Build Session</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showPicker} animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <SafeAreaView style={styles.pickerSafe}>
          <View style={styles.pickerHeader}>
            <TextInput
              style={styles.pickerSearch}
              value={query}
              onChangeText={setQuery}
              placeholder="Search exercises..."
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <TouchableOpacity onPress={() => setShowPicker(false)} style={styles.pickerClose}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={filtered}
            keyExtractor={e => e.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.pickerItem} onPress={() => addExercise(item)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pickerItemName}>{item.name}</Text>
                  <Text style={styles.pickerItemMuscle}>
                    {(item.primaryMuscle || '').charAt(0).toUpperCase() + (item.primaryMuscle || '').slice(1)}
                    {item.equipment ? ` · ${item.equipment}` : ''}
                  </Text>
                </View>
                <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border }} />}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  skipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
    width: 80,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  exerciseCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.lg,
  },
  exerciseCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  indexBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.lg,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexNum: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  exerciseInfo: { flex: 1 },
  exerciseName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  exerciseMuscle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },
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
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  stepBtn: {
    width: 30,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    minWidth: 32,
    textAlign: 'center',
  },
  repRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  repInput: {
    width: 40,
    height: 34,
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  repSep: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  weightInput: {
    width: 64,
    height: 34,
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
  },
  addBtnText: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
  },
  startBtnDisabled: {
    opacity: 0.4,
  },
  startBtnText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.background,
  },
  pickerSafe: { flex: 1, backgroundColor: colors.background },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerSearch: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerClose: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  pickerItemName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  pickerItemMuscle: { fontSize: fontSize.sm, color: colors.textSecondary },

  // Travel mode chip + modal
  travelChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderWidth: 1, borderColor: colors.primary + '50',
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.surface, alignSelf: 'flex-start',
  },
  travelChipText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.medium, flex: 1 },
  travelOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center', padding: spacing.lg,
  },
  travelCard: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    padding: spacing.xl, width: '100%', gap: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  travelTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary },
  travelSub: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  travelOptions: { gap: spacing.sm },
  travelOpt: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  travelOptActive: { borderColor: colors.primary, backgroundColor: colors.surface2 },
  travelOptText: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  travelBtns: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  travelCancel: {
    flex: 1, paddingVertical: spacing.md, alignItems: 'center',
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  travelCancelText: { fontSize: fontSize.sm, color: colors.textSecondary },
  travelConfirm: {
    flex: 1, paddingVertical: spacing.md, alignItems: 'center',
    borderRadius: radius.md, backgroundColor: colors.primary,
  },
  travelConfirmText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.background },
});
