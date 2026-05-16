import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
  Modal, TextInput, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import {
  getAllRoutines, createRoutine, softDeleteRoutine, getAllRoutineExerciseCounts,
  duplicateRoutine, getRoutineExercisesWithDetails, createWorkout,
} from '../lib/database';
import useAppStore from '../store/useAppStore';

export default function RoutinesScreen({ navigation }) {
  const { user, startWorkout } = useAppStore();
  const [routines, setRoutines] = useState([]);
  const [exerciseCounts, setExerciseCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useFocusEffect(useCallback(() => {
    loadRoutines();
  }, [user?.id]));

  async function loadRoutines() {
    if (!user?.id) return;
    setLoading(true);
    try {
      const all = await getAllRoutines(user.id);
      setRoutines(all.filter(r => r.isActive));
      const counts = await getAllRoutineExerciseCounts();
      setExerciseCounts(counts);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadRoutines();
    setRefreshing(false);
  }

  async function handleCreate() {
    if (!newName.trim()) {
      Alert.alert('Name required', 'Enter a name for the routine.');
      return;
    }
    setCreating(true);
    try {
      const routine = await createRoutine(user.id, newName.trim());
      setNewName('');
      setShowCreate(false);
      await loadRoutines();
      navigation.navigate('RoutineDetail', { routineId: routine.id });
    } finally {
      setCreating(false);
    }
  }

  async function handleStart(routine) {
    const exerciseCount = exerciseCounts[routine.id] || 0;
    if (exerciseCount === 0) {
      Alert.alert(
        'No exercises',
        'This routine has no exercises yet.',
        [
          { text: 'Add Exercise', onPress: () => navigation.navigate('RoutineDetail', { routineId: routine.id }) },
          {
            text: 'Start Blank Workout',
            onPress: () => navigation.navigate('HomeTab', { screen: 'BuildWorkout' }),
          },
        ],
      );
      return;
    }
    const workout = await createWorkout(user.id, routine.id);
    const withExercises = await getRoutineExercisesWithDetails(routine.id);
    const initialExercises = withExercises.map(({ exercise, routineExercise }) => ({
      exercise,
      routineExercise,
      sets: [],
    }));
    startWorkout(workout, initialExercises);
    navigation.navigate('HomeTab', { screen: 'ActiveWorkout' });
  }

  async function handleDuplicate(routine) {
    const newRoutine = await duplicateRoutine(routine.id, user.id, `${routine.name} (copy)`);
    await loadRoutines();
    navigation.navigate('RoutineDetail', { routineId: newRoutine.id });
  }

  function handleOptions(routine) {
    Alert.alert(routine.name, undefined, [
      { text: 'Edit', onPress: () => navigation.navigate('RoutineDetail', { routineId: routine.id }) },
      { text: 'Duplicate', onPress: () => handleDuplicate(routine) },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => Alert.alert(
          'Delete routine?',
          `"${routine.name}" will be removed.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                await softDeleteRoutine(routine.id);
                await loadRoutines();
              },
            },
          ],
        ),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  const myRoutines = routines.filter(r => !r.name.startsWith('[SAMPLE]'));
  const sampleRoutines = routines.filter(r => r.name.startsWith('[SAMPLE]'));

  function renderRoutineCard({ item: routine }) {
    const count = exerciseCounts[routine.id] || 0;
    const isSample = routine.name.startsWith('[SAMPLE]');
    const displayName = isSample ? routine.name.replace('[SAMPLE] ', '') : routine.name;
    return (
      <View style={styles.card}>
        <View style={styles.cardMain}>
          <Text style={styles.cardName} numberOfLines={2}>{displayName}</Text>
          <View style={styles.cardMeta}>
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>{count} exercise{count !== 1 ? 's' : ''}</Text>
            </View>
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => handleStart(routine)}
          >
            <Ionicons name="play" size={14} color={colors.background} />
            <Text style={styles.startBtnText}>Start</Text>
          </TouchableOpacity>
          {!isSample && (
            <TouchableOpacity
              style={styles.moreBtn}
              onPress={() => handleOptions(routine)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          {isSample && (
            <TouchableOpacity
              style={styles.moreBtn}
              onPress={() => navigation.navigate('RoutineDetail', { routineId: routine.id })}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={[]}
        keyExtractor={() => 'root'}
        renderItem={null}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View style={styles.content}>
            <Text style={styles.pageTitle}>Routines</Text>

            <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)}>
              <Ionicons name="add-circle" size={20} color={colors.background} />
              <Text style={styles.createBtnText}>Create New Routine</Text>
            </TouchableOpacity>

            {myRoutines.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>MY ROUTINES</Text>
                {myRoutines.map(r => (
                  <View key={r.id} style={{ marginBottom: spacing.md }}>
                    {renderRoutineCard({ item: r })}
                  </View>
                ))}
              </View>
            )}

            {myRoutines.length === 0 && !loading && (
              <View style={styles.emptyMine}>
                <Text style={styles.emptyMineText}>No routines yet. Create your first training split above.</Text>
              </View>
            )}

            {sampleRoutines.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>SAMPLE ROUTINES</Text>
                <Text style={styles.sectionSubtitle}>Pre-built templates to get you started</Text>
                {sampleRoutines.map(r => (
                  <View key={r.id} style={{ marginBottom: spacing.md }}>
                    {renderRoutineCard({ item: r })}
                  </View>
                ))}
              </View>
            )}
          </View>
        }
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
      />

      <Modal
        visible={showCreate}
        animationType="slide"
        transparent
        onRequestClose={() => { setShowCreate(false); setNewName(''); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>New Routine</Text>
            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Push Day, Upper Body A"
              placeholderTextColor={colors.textMuted}
              autoFocus
              onSubmitEditing={handleCreate}
              returnKeyType="done"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setShowCreate(false); setNewName(''); }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, creating && { opacity: 0.6 }]}
                onPress={handleCreate}
                disabled={creating}
              >
                <Text style={styles.confirmBtnText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.xl },
  pageTitle: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.black,
    color: colors.textPrimary,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
  },
  createBtnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.background,
  },
  section: { gap: spacing.xs },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black,
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
  },
  sectionSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardMain: { flex: 1, gap: spacing.sm },
  cardName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  cardMeta: { flexDirection: 'row', gap: spacing.sm },
  countPill: {
    backgroundColor: colors.surface2,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
  },
  countPillText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  startBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.background,
  },
  moreBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyMine: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyMineText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  modalInput: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalActions: { flexDirection: 'row', gap: spacing.md },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: fontSize.md, color: colors.textSecondary },
  confirmBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  confirmBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.background },
});
