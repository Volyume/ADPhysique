import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Modal, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import ExerciseCard from '../components/ExerciseCard';
import { getAllExercises, getCompletedWorkoutSets, insertExercise } from '../lib/database';
import { MUSCLE_DISPLAY_NAMES } from '../lib/algorithms';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

const MUSCLES = Object.keys(MUSCLE_DISPLAY_NAMES);
const EQUIPMENT = ['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight', 'Smith Machine', 'Bands'];

export default function ExerciseLibraryScreen({ navigation, route }) {
  const { user, units } = useAppStore(useShallow(s => ({ user: s.user, units: s.units })));
  const [query, setQuery] = useState('');
  const [exercises, setExercises] = useState([]);
  const [filterMuscle, setFilterMuscle] = useState(null);
  const [filterEquipment, setFilterEquipment] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [recentSets, setRecentSets] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMuscle, setNewMuscle] = useState('');
  const [newEquipment, setNewEquipment] = useState('');
  const [newSecondaryMuscles, setNewSecondaryMuscles] = useState([]);
  const [newExerciseCategory, setNewExerciseCategory] = useState('compound');
  const [newIncrementKg, setNewIncrementKg] = useState(2.5);
  const [savingNew, setSavingNew] = useState(false);

  const addToWorkout = route.params?.onSelect;

  // Debounce search query so filtering doesn't fire on every keystroke
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceRef = useRef(null);
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    loadExercises();
  }, []);

  async function loadExercises() {
    const all = await getAllExercises();
    setExercises(all);
    if (user?.id) {
      const sets = await getCompletedWorkoutSets(user.id);
      setRecentSets(sets);
    }
  }

  function toggleSecondaryMuscle(key) {
    setNewSecondaryMuscles(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }

  async function handleSaveCustomExercise() {
    if (!newName.trim()) {
      Alert.alert('Name required', 'Please enter a name for the exercise.');
      return;
    }
    setSavingNew(true);
    try {
      await insertExercise({
        name: newName.trim(),
        primaryMuscle: newMuscle || null,
        secondaryMuscles: newSecondaryMuscles.length > 0 ? newSecondaryMuscles : null,
        equipment: newEquipment || null,
        isCustom: 1,
        exerciseCategory: newExerciseCategory,
        incrementKg: newIncrementKg,
      });
      await loadExercises();
      setShowAddModal(false);
      setNewName('');
      setNewMuscle('');
      setNewEquipment('');
      setNewSecondaryMuscles([]);
      setNewExerciseCategory('compound');
      setNewIncrementKg(2.5);
    } catch (_e) {
      Alert.alert('Error', 'Could not save exercise. Please try again.');
    } finally {
      setSavingNew(false);
    }
  }

  const filtered = useMemo(() => {
    let result = exercises;
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase();
      result = result.filter(e => e.name.toLowerCase().includes(q));
    }
    if (filterMuscle) {
      result = result.filter(e =>
        (e.primaryMuscle || '').toLowerCase() === filterMuscle.toLowerCase(),
      );
    }
    if (filterEquipment) {
      result = result.filter(e =>
        (e.equipment || '').toLowerCase().includes(filterEquipment.toLowerCase()),
      );
    }
    return result.slice(0, 100);
  }, [exercises, debouncedQuery, filterMuscle, filterEquipment]);

  // Pre-compute a map of exerciseId → last logged set so FlatList items don't do O(n) searches
  const lastLoggedMap = useMemo(() => {
    const map = new Map();
    for (const s of recentSets) {
      const id = s.exerciseId;
      const existing = map.get(id);
      if (!existing || s.createdAt > existing.createdAt) map.set(id, s);
    }
    return map;
  }, [recentSets]);

  function getLastLogged(exerciseId) {
    const last = lastLoggedMap.get(exerciseId);
    if (!last) return null;
    const daysAgo = Math.floor((Date.now() - last.createdAt) / (1000 * 60 * 60 * 24));
    return { weight: last.weight, reps: last.actualReps, daysAgo };
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Search Bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search exercises..."
            placeholderTextColor={colors.textMuted}
            clearButtonMode="while-editing"
            autoCapitalize="none"
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, (filterMuscle || filterEquipment) && styles.filterBtnActive]}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={(filterMuscle || filterEquipment) ? colors.background : colors.textSecondary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.addNewBtn}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Active Filters */}
      {(filterMuscle || filterEquipment) && (
        <View style={styles.activeFilters}>
          {filterMuscle && (
            <TouchableOpacity style={styles.filterChip} onPress={() => setFilterMuscle(null)}>
              <Text style={styles.filterChipText}>{MUSCLE_DISPLAY_NAMES[filterMuscle] || filterMuscle}</Text>
              <Ionicons name="close" size={12} color={colors.primary} />
            </TouchableOpacity>
          )}
          {filterEquipment && (
            <TouchableOpacity style={styles.filterChip} onPress={() => setFilterEquipment(null)}>
              <Text style={styles.filterChipText}>{filterEquipment}</Text>
              <Ionicons name="close" size={12} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <ExerciseCard
            exercise={item}
            lastLogged={getLastLogged(item.id)}
            units={units}
            onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: item.id })}
            onAdd={addToWorkout ? () => addToWorkout(item) : undefined}
            showAddButton={!!addToWorkout}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {exercises.length === 0 ? 'Loading exercises...' : 'No exercises found'}
            </Text>
          </View>
        }
      />

      {/* Add Custom Exercise Modal */}
      <Modal visible={showAddModal} animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <SafeAreaView style={styles.addModalSafe} edges={['top', 'bottom']}>
          <View style={styles.addModalHeader}>
            <Text style={styles.addModalTitle}>Add Exercise</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.addModalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.addFieldLabel}>Exercise name *</Text>
            <TextInput
              style={styles.addFieldInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Cable Rope Pushdown"
              placeholderTextColor={colors.textMuted}
              autoFocus
              autoCapitalize="words"
            />

            <Text style={[styles.addFieldLabel, { marginTop: spacing.xl }]}>Primary muscle</Text>
            <View style={styles.chipGrid}>
              {Object.entries(MUSCLE_DISPLAY_NAMES).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.chip, newMuscle === key && styles.chipActive]}
                  onPress={() => setNewMuscle(newMuscle === key ? '' : key)}
                >
                  <Text style={[styles.chipText, newMuscle === key && styles.chipTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.addFieldLabel, { marginTop: spacing.xl }]}>Secondary muscles (optional)</Text>
            <View style={styles.chipGrid}>
              {Object.entries(MUSCLE_DISPLAY_NAMES)
                .filter(([key]) => key !== newMuscle)
                .map(([key, label]) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.chip, newSecondaryMuscles.includes(key) && styles.chipActive]}
                    onPress={() => toggleSecondaryMuscle(key)}
                  >
                    <Text style={[styles.chipText, newSecondaryMuscles.includes(key) && styles.chipTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>

            <Text style={[styles.addFieldLabel, { marginTop: spacing.xl }]}>Equipment</Text>
            <View style={styles.chipGrid}>
              {['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight', 'Smith Machine', 'Bands', 'EZ Bar', 'Kettlebell', 'Plate', 'Other'].map(eq => (
                <TouchableOpacity
                  key={eq}
                  style={[styles.chip, newEquipment === eq && styles.chipActive]}
                  onPress={() => setNewEquipment(newEquipment === eq ? '' : eq)}
                >
                  <Text style={[styles.chipText, newEquipment === eq && styles.chipTextActive]}>{eq}</Text>
                </TouchableOpacity>
              ))}
            </View>

                {/* Exercise Category */}
                <Text style={[styles.addFieldLabel, { marginTop: spacing.xl }]}>Exercise category</Text>
                <View style={styles.chipGrid}>
                  {[
                    { label: 'Compound', value: 'compound' },
                    { label: 'Accessory', value: 'accessory' },
                    { label: 'Isolation', value: 'isolation' },
                  ].map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.chip, newExerciseCategory === opt.value && styles.chipActive]}
                      onPress={() => setNewExerciseCategory(opt.value)}
                    >
                      <Text style={[styles.chipText, newExerciseCategory === opt.value && styles.chipTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Increment */}
                <Text style={[styles.addFieldLabel, { marginTop: spacing.xl }]}>Weight increment ({units})</Text>
                <View style={styles.chipGrid}>
                  {[0.5, 1, 1.25, 2.5, 5].map(inc => (
                    <TouchableOpacity
                      key={inc}
                      style={[styles.chip, newIncrementKg === inc && styles.chipActive]}
                      onPress={() => setNewIncrementKg(inc)}
                    >
                      <Text style={[styles.chipText, newIncrementKg === inc && styles.chipTextActive]}>
                        {inc}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

            <TouchableOpacity
              style={[styles.saveCustomBtn, savingNew && { opacity: 0.6 }]}
              onPress={handleSaveCustomExercise}
              disabled={savingNew}
            >
              <Text style={styles.saveCustomBtnText}>{savingNew ? 'Saving...' : 'Save Exercise'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={showFilters} animationType="slide" transparent onRequestClose={() => setShowFilters(false)}>
        <View style={styles.filterOverlay}>
          <View style={styles.filterSheet}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Filter Exercises</Text>
              <TouchableOpacity onPress={() => { setFilterMuscle(null); setFilterEquipment(null); }}>
                <Text style={styles.clearAll}>Clear all</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.filterGroupLabel}>Muscle group</Text>
            <View style={styles.filterGrid}>
              {MUSCLES.map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.filterOption, filterMuscle === m && styles.filterOptionActive]}
                  onPress={() => setFilterMuscle(filterMuscle === m ? null : m)}
                >
                  <Text style={[styles.filterOptionText, filterMuscle === m && styles.filterOptionTextActive]}>
                    {MUSCLE_DISPLAY_NAMES[m]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.filterGroupLabel, { marginTop: spacing.lg }]}>Equipment</Text>
            <View style={styles.filterGrid}>
              {EQUIPMENT.map(eq => (
                <TouchableOpacity
                  key={eq}
                  style={[styles.filterOption, filterEquipment === eq && styles.filterOptionActive]}
                  onPress={() => setFilterEquipment(filterEquipment === eq ? null : eq)}
                >
                  <Text style={[styles.filterOptionText, filterEquipment === eq && styles.filterOptionTextActive]}>
                    {eq}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.applyBtn} onPress={() => setShowFilters(false)}>
              <Text style={styles.applyBtnText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  searchRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  filterBtn: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  activeFilters: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryBg,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xxxl,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  filterOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  filterSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  filterTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  clearAll: {
    fontSize: fontSize.sm,
    color: colors.error,
    fontWeight: fontWeight.medium,
  },
  filterGroupLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    letterSpacing: 0.2,
    marginBottom: spacing.md,
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterOptionActive: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primary,
  },
  filterOptionText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  filterOptionTextActive: {
    color: colors.primary,
  },
  applyBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  applyBtnText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.background,
  },
  addNewBtn: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '50',
  },
  addModalSafe: { flex: 1, backgroundColor: colors.background },
  addModalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  addModalTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary },
  addModalContent: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  addFieldLabel: {
    fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textSecondary,
    letterSpacing: 0.2, marginBottom: spacing.sm,
  },
  addFieldNote: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: spacing.sm, marginTop: -spacing.xs },
  addFieldInput: {
    backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md, fontSize: fontSize.md, color: colors.textPrimary,
    borderWidth: 1, borderColor: colors.border,
  },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full,
    backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  chipTextActive: { color: colors.primary },
  addCustomNote: {
    fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 18,
    marginTop: spacing.xl, marginBottom: spacing.lg,
  },
  saveCustomBtn: {
    backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: spacing.lg, alignItems: 'center',
  },
  saveCustomBtnText: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.background },
});
