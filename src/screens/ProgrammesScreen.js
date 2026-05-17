import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  Modal, TextInput, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import {
  getAllRoutines, createRoutine, softDeleteRoutine, getAllRoutineExerciseCounts,
  duplicateRoutine, getRoutineExercisesWithDetails, createWorkout,
  getAllProgrammes, copyRoutineFromLibrary,
} from '../lib/database';
import useAppStore from '../store/useAppStore';

export default function ProgrammesScreen({ navigation }) {
  const { user, startWorkout } = useAppStore();
  const [myWorkouts, setMyWorkouts] = useState([]);
  const [libraryWorkouts, setLibraryWorkouts] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [exerciseCounts, setExerciseCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useFocusEffect(useCallback(() => {
    loadData();
  }, [user?.id]));

  async function loadData() {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [all, counts, progs] = await Promise.all([
        getAllRoutines(user.id),
        getAllRoutineExerciseCounts(),
        getAllProgrammes(user.id),
      ]);
      const active = all.filter(r => r.isActive);
      setMyWorkouts(active.filter(r => !r.isLibrary));
      setLibraryWorkouts(active.filter(r => r.isLibrary));
      setProgrammes(progs);
      setExerciseCounts(counts);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function handleCreate() {
    if (!newName.trim()) {
      Alert.alert('Name required', 'Enter a name for the workout.');
      return;
    }
    setCreating(true);
    try {
      const routine = await createRoutine(user.id, newName.trim());
      setNewName('');
      setShowCreate(false);
      await loadData();
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
        'This workout has no exercises yet.',
        [
          { text: 'Add Exercise', onPress: () => navigation.navigate('RoutineDetail', { routineId: routine.id }) },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
      return;
    }
    const workout = await createWorkout(user.id, routine.id);
    const withExercises = await getRoutineExercisesWithDetails(routine.id);
    const initialExercises = withExercises.map(({ exercise, routineExercise }) => ({
      exercise, routineExercise, sets: [],
    }));
    startWorkout(workout, initialExercises);
    navigation.navigate('HomeTab', { screen: 'ActiveWorkout' });
  }

  async function handleDuplicate(routine) {
    const newRoutine = await duplicateRoutine(routine.id, user.id, `${routine.name} (copy)`);
    await loadData();
    navigation.navigate('RoutineDetail', { routineId: newRoutine.id });
  }

  async function handleCopyFromLibrary(routine) {
    Alert.alert(
      'Copy to My Programmes',
      `Add "${routine.name}" to your workouts? You can then edit it freely.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Copy',
          onPress: async () => {
            try {
              const copy = await copyRoutineFromLibrary(routine.id, user.id);
              await loadData();
              navigation.navigate('RoutineDetail', { routineId: copy.id });
            } catch (e) {
              Alert.alert('Error', 'Could not copy workout. Please try again.');
            }
          },
        },
      ],
    );
  }

  function handleWorkoutOptions(routine) {
    Alert.alert(routine.name, undefined, [
      { text: 'Edit', onPress: () => navigation.navigate('RoutineDetail', { routineId: routine.id }) },
      { text: 'Duplicate', onPress: () => handleDuplicate(routine) },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => Alert.alert(
          'Delete workout?',
          `"${routine.name}" will be removed.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                await softDeleteRoutine(routine.id);
                await loadData();
              },
            },
          ],
        ),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  // Group library workouts by programme
  const programmeMap = Object.fromEntries(programmes.map(p => [p.id, p]));
  const grouped = {};
  const standalone = [];
  for (const r of libraryWorkouts) {
    if (r.programmeId) {
      if (!grouped[r.programmeId]) grouped[r.programmeId] = [];
      grouped[r.programmeId].push(r);
    } else {
      standalone.push(r);
    }
  }

  function renderWorkoutCard(routine, options = {}) {
    const { isLibrary, showCopy } = options;
    const count = exerciseCounts[routine.id] || 0;
    const displayName = routine.name.replace(/^\[SAMPLE\]\s*/, '');
    return (
      <View key={routine.id} style={styles.card}>
        <View style={styles.cardMain}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardName} numberOfLines={2}>{displayName}</Text>
            {isLibrary && (
              <View style={styles.libraryBadge}>
                <Text style={styles.libraryBadgeText}>Library</Text>
              </View>
            )}
          </View>
          <View style={styles.cardMeta}>
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>{count} exercise{count !== 1 ? 's' : ''}</Text>
            </View>
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.startBtn} onPress={() => handleStart(routine)}>
            <Ionicons name="play" size={14} color={colors.background} />
            <Text style={styles.startBtnText}>Start</Text>
          </TouchableOpacity>
          {showCopy ? (
            <TouchableOpacity
              style={styles.moreBtn}
              onPress={() => handleCopyFromLibrary(routine)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="copy-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.moreBtn}
              onPress={() => handleWorkoutOptions(routine)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        <Text style={styles.pageTitle}>Programmes</Text>

        <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)}>
          <Ionicons name="add-circle" size={20} color={colors.background} />
          <Text style={styles.createBtnText}>Create New Workout</Text>
        </TouchableOpacity>

        {/* My Workouts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MY WORKOUTS</Text>
          {myWorkouts.length === 0 && !loading ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>
                No workouts yet. Create one above or copy a workout from the Library below.
              </Text>
            </View>
          ) : (
            myWorkouts.map(r => (
              <View key={r.id} style={styles.cardWrap}>
                {renderWorkoutCard(r, { isLibrary: false, showCopy: false })}
              </View>
            ))
          )}
        </View>

        {/* Library */}
        {(Object.keys(grouped).length > 0 || standalone.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>LIBRARY</Text>
            <Text style={styles.sectionSubtitle}>Pre-built workouts. Copy to edit and use as your own.</Text>

            {Object.entries(grouped).map(([progId, workouts]) => {
              const prog = programmeMap[progId];
              return (
                <View key={progId} style={styles.programmeGroup}>
                  <Text style={styles.programmeName}>{prog?.name || 'Programme'}</Text>
                  {prog?.description ? (
                    <Text style={styles.programmeDesc} numberOfLines={2}>{prog.description}</Text>
                  ) : null}
                  <View style={styles.programmeWorkouts}>
                    {workouts.map(r => (
                      <View key={r.id} style={styles.cardWrap}>
                        {renderWorkoutCard(r, { isLibrary: true, showCopy: true })}
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}

            {standalone.map(r => (
              <View key={r.id} style={styles.cardWrap}>
                {renderWorkoutCard(r, { isLibrary: true, showCopy: true })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showCreate}
        animationType="slide"
        transparent
        onRequestClose={() => { setShowCreate(false); setNewName(''); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>New Workout</Text>
            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Push Day, Upper A"
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
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl },
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
  section: { gap: spacing.md },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black,
    color: colors.textMuted,
    letterSpacing: 1.5,
  },
  sectionSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: -spacing.sm,
  },
  emptySection: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptySectionText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  programmeGroup: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  programmeName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  programmeDesc: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: -spacing.sm,
  },
  programmeWorkouts: { gap: spacing.sm },
  cardWrap: { marginBottom: 0 },
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
  cardTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, flexWrap: 'wrap' },
  cardName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    flex: 1,
  },
  libraryBadge: {
    backgroundColor: colors.primaryBg,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  libraryBadgeText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
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
