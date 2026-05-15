import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import ExerciseCard from '../components/ExerciseCard';
import { database } from '../lib/database';
import { MUSCLE_DISPLAY_NAMES } from '../lib/algorithms';
import useAppStore from '../store/useAppStore';

const MUSCLES = Object.keys(MUSCLE_DISPLAY_NAMES);
const EQUIPMENT = ['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight', 'Smith Machine', 'Bands'];

export default function ExerciseLibraryScreen({ navigation, route }) {
  const { user } = useAppStore();
  const [query, setQuery] = useState('');
  const [exercises, setExercises] = useState([]);
  const [filterMuscle, setFilterMuscle] = useState(null);
  const [filterEquipment, setFilterEquipment] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [recentSets, setRecentSets] = useState([]);

  const addToWorkout = route.params?.onSelect;

  useEffect(() => {
    loadExercises();
  }, []);

  async function loadExercises() {
    const all = await database.get('exercises').query().fetch();
    setExercises(all);
    if (user?.id) {
      const sets = await database.get('workout_sets').query().fetch();
      setRecentSets(sets.filter(s => s.userId === user.id));
    }
  }

  const filtered = useMemo(() => {
    let result = exercises;
    if (query.trim()) {
      const q = query.toLowerCase();
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
  }, [exercises, query, filterMuscle, filterEquipment]);

  function getLastLogged(exerciseId) {
    const exerciseSets = recentSets
      .filter(s => s.exerciseId === exerciseId)
      .sort((a, b) => b.createdAt - a.createdAt);
    if (exerciseSets.length === 0) return null;
    const last = exerciseSets[0];
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

            <Text style={styles.filterGroupLabel}>MUSCLE GROUP</Text>
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

            <Text style={[styles.filterGroupLabel, { marginTop: spacing.lg }]}>EQUIPMENT</Text>
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
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black,
    color: colors.textMuted,
    letterSpacing: 1.5,
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
});
