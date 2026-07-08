import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, KeyboardAvoidingView,
  Platform, TouchableOpacity, ScrollView,
} from 'react-native';
// E8 perf: the full library is ~450 rows with no render cap; FlashList
// recycles rows instead of mounting them all (audit/perf-baseline.md §2).
import { FlashList } from '@shopify/flash-list';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, radius, type } from '../styles/theme';
import { MUSCLE_DISPLAY_NAMES } from '../lib/algorithms';
import { getAllExercises, insertExercise } from '../lib/database';
import { matchesEquipmentFilter, matchesMuscleFilter } from '../lib/exerciseDisplay';
import Chip from './Chip';
import SearchBar from './SearchBar';
import TextField from './TextField';
import { useToast } from './Toast';

// Shared exercise picker: search the library and, when the exercise you want
// isn't there, create it inline as a custom exercise. Lifted out of
// ManualBuilder so the same browse-and-create flow is available everywhere an
// exercise is chosen (plan building, plan editing, in-workout swap). Custom
// exercises are written with isCustom:1 into the exercises table, the same
// path ManualBuilder already shipped, so getAllExercises() surfaces them and
// the existing syncExercises push covers them.
const PICKER_MUSCLES = Object.keys(MUSCLE_DISPLAY_NAMES);
const PICKER_EQUIPMENT = ['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight', 'Smith Machine', 'Bands'];

// saveLabel / actionLabel are aliases for the create-form's save button text
// (RoutineDetail/ManualBuilder pass saveLabel, ActiveWorkout passes
// actionLabel). Either works; saveLabel wins if both are given.
export default function ExercisePickerModal({ visible, onClose, onSelect, saveLabel, actionLabel }) {
  const toast = useToast();
  const buttonLabel = saveLabel || actionLabel || 'Add exercise';
  const [query, setQuery] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('');
  const [equipmentFilter, setEquipmentFilter] = useState('');
  const [allExercises, setAll] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createMuscle, setCreateMuscle] = useState('');
  const [createEquipment, setCreateEquipment] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    setMuscleFilter('');
    setEquipmentFilter('');
    setShowCreate(false);
    getAllExercises().then(exs => {
      setAll(exs);
      setFiltered(exs);
    }).catch(() => {});
  }, [visible]);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    setFiltered(allExercises.filter(e =>
      (!q || e.name.toLowerCase().includes(q)) &&
      matchesMuscleFilter(e, muscleFilter) &&
      matchesEquipmentFilter(e, equipmentFilter),
    ));
  }, [query, muscleFilter, equipmentFilter, allExercises]);

  async function handleCreate() {
    if (!createName.trim()) {
      toast.show('Enter a name for the exercise', { variant: 'warning' });
      return;
    }
    setCreating(true);
    try {
      const created = await insertExercise({
        name: createName.trim(),
        primaryMuscle: createMuscle || null,
        equipment: createEquipment || null,
        // SFR is left null/unknown, never a guessed midpoint: the swap and plan
        // engines treat a missing stimulus-to-fatigue ratio as "no data" and
        // skip the SFR scoring term. A hard-coded value (e.g. 3) would make a
        // brand-new custom move falsely read as a real, ranked candidate.
        stimulusToFatigueRatio: null,
        isCustom: 1,
      });
      const all = await getAllExercises();
      setAll(all);
      // WK-6: include the id from insertExercise in the fallback so onSelect
      // never hands back an id-less exercise (which would log a set against a
      // null exercise_id) if the name lookup misses.
      const newEx = all.find(e => e.name === createName.trim())
        || { id: created?.id, name: createName.trim(), primaryMuscle: createMuscle, equipment: createEquipment };
      onSelect(newEx);
      onClose();
    } catch (_e) {
      toast.show("Couldn't save exercise, try again", { variant: 'error' });
    } finally {
      setCreating(false);
    }
  }

  function openCreate() {
    setCreateName(query.trim());
    setCreateMuscle('');
    setCreateEquipment('');
    setShowCreate(true);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={showCreate ? () => setShowCreate(false) : onClose}>
      {/* A core RN <Modal> presents in its own window on iOS and does not
          inherit the root SafeAreaProvider's measured frame, so a bare
          SafeAreaView inside reads top:0 and the search field jams against the
          status bar / Dynamic Island. A nested provider makes the modal
          measure its own insets. */}
      <SafeAreaProvider>
      <SafeAreaView style={styles.pickerSafe} edges={['top', 'bottom']}>
        {showCreate ? (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity accessibilityRole="button"
                accessibilityLabel="Back to exercise search"
                onPress={() => setShowCreate(false)}
                style={styles.pickerClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="arrow-back" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.createTitle} numberOfLines={1} ellipsizeMode="tail">New Exercise</Text>
              <TouchableOpacity accessibilityRole="button"
                accessibilityLabel="Close exercise picker"
                onPress={onClose}
                style={styles.pickerClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.createContent} keyboardShouldPersistTaps="handled">
              <TextField
                accessibilityLabel="New exercise name"
                value={createName}
                onChangeText={setCreateName}
                placeholder="Exercise name"
                placeholderTextColor={colors.textMuted}
                autoFocus
                autoCapitalize="words"
                surface={colors.inputBg}
                containerStyle={styles.createNameInputContainer}
                fieldStyle={styles.createNameInputField}
                inputStyle={styles.createNameInputText}
              />
              <Text style={styles.createLabel}>Muscle Group</Text>
              <View style={styles.chipRow}>
                {PICKER_MUSCLES.map(m => (
                  <Chip
                    key={m}
                    label={MUSCLE_DISPLAY_NAMES[m]}
                    selected={createMuscle === m}
                    onPress={() => setCreateMuscle(prev => prev === m ? '' : m)}
                  />
                ))}
              </View>
              <Text style={styles.createLabel}>Equipment</Text>
              <View style={styles.chipRow}>
                {PICKER_EQUIPMENT.map(eq => (
                  <Chip
                    key={eq}
                    label={eq}
                    selected={createEquipment === eq}
                    onPress={() => setCreateEquipment(prev => prev === eq ? '' : eq)}
                  />
                ))}
              </View>
              <TouchableOpacity accessibilityRole="button"
                accessibilityLabel={buttonLabel}
                style={[styles.createSaveBtn, creating && { opacity: 0.5 }]}
                onPress={handleCreate}
                disabled={creating}
              >
                <Ionicons name="add-circle" size={20} color={colors.onPrimary} />
                <Text style={styles.createSaveBtnText} numberOfLines={1}>{buttonLabel}</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        ) : (
          <>
            <View style={styles.pickerHeader}>
              <SearchBar
                style={styles.pickerSearchBar}
                value={query}
                onChangeText={setQuery}
                placeholder="Search exercises..."
                autoFocus
              />
              <TouchableOpacity accessibilityRole="button"
                accessibilityLabel="Close exercise picker"
                onPress={onClose}
                style={styles.pickerClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Browse filters: tap a muscle and/or equipment chip to narrow the
                448-exercise library without typing. Each row is single-select
                and toggles off on a second tap; the two compose with the search
                box (see the filter effect above). */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.filterRow}
            >
              {PICKER_MUSCLES.map(m => (
                <Chip
                  key={m}
                  label={MUSCLE_DISPLAY_NAMES[m]}
                  selected={muscleFilter === m}
                  onPress={() => setMuscleFilter(prev => (prev === m ? '' : m))}
                  accessibilityLabel={`Filter by ${MUSCLE_DISPLAY_NAMES[m]}`}
                  style={styles.filterChip}
                  labelStyle={styles.filterChipText}
                  selectedLabelStyle={styles.filterChipTextActive}
                />
              ))}
            </ScrollView>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.filterRow}
            >
              {PICKER_EQUIPMENT.map(eq => (
                <Chip
                  key={eq}
                  label={eq}
                  selected={equipmentFilter === eq}
                  onPress={() => setEquipmentFilter(prev => (prev === eq ? '' : eq))}
                  accessibilityLabel={`Filter by ${eq}`}
                  style={styles.filterChip}
                  labelStyle={styles.filterChipText}
                  selectedLabelStyle={styles.filterChipTextActive}
                />
              ))}
            </ScrollView>

            <FlashList
              data={filtered}
              keyExtractor={e => String(e.id)}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.pickerList}
              renderItem={({ item }) => (
                <TouchableOpacity accessibilityRole="button"
                  accessibilityLabel={`Select ${item.name}`}
                  style={styles.pickerRow}
                  onPress={() => { onSelect(item); onClose(); }}
                >
                  <View style={styles.pickerRowContent}>
                    <Text style={styles.pickerExName}>{item.name}</Text>
                    {item.primaryMuscle ? (
                      <Text style={styles.pickerMuscle}>{item.primaryMuscle}</Text>
                    ) : null}
                  </View>
                  <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListFooterComponent={
                // Always offer "create custom", with or without a query, so the
                // option to add your own exercise is never hidden behind an
                // empty search result.
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={query.trim().length > 0
                    ? `Create ${query.trim()} as custom exercise`
                    : 'Create a custom exercise'}
                  style={[styles.createNewBtn, { marginTop: spacing.md }]}
                  onPress={openCreate}
                >
                  <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                  <Text style={styles.createNewBtnText}>
                    {query.trim().length > 0
                      ? `Create "${query.trim()}" as custom exercise`
                      : 'Create a custom exercise'}
                  </Text>
                </TouchableOpacity>
              }
              ListEmptyComponent={
                <View style={styles.pickerEmpty}>
                  <Ionicons name="search-outline" size={32} color={colors.textMuted} style={{ marginBottom: spacing.md }} />
                  <Text style={styles.pickerEmptyText}>No matches found. Try a different search.</Text>
                </View>
              }
            />
          </>
        )}
      </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pickerSafe: { flex: 1, backgroundColor: colors.background },
  pickerHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  pickerSearchBar: { flex: 1 },
  pickerClose: { padding: spacing.xs },
  pickerList: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md },
  pickerRowContent: { flex: 1, gap: spacing.xxs },
  pickerExName: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.textPrimary },
  pickerMuscle: { ...type.caption, color: colors.textMuted, textTransform: 'capitalize' },
  pickerEmpty: { alignItems: 'center', paddingTop: spacing.xxxl, gap: spacing.lg, paddingHorizontal: spacing.xl },
  pickerEmptyText: { ...type.body, color: colors.textMuted },
  separator: { height: 1, backgroundColor: colors.border },
  createNewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.primaryBg, borderRadius: radius.lg,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderWidth: 1, borderColor: colors.primary,
  },
  createNewBtnText: { ...type.label, color: colors.primary, flex: 1 },
  createTitle: { ...type.title, flex: 1, color: colors.textPrimary, textAlign: 'center' },
  createContent: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },
  createNameInputContainer: { gap: 0 },
  createNameInputField: { borderRadius: radius.md },
  createNameInputText: { ...type.bodyStrong, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  createLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 0.3 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  filterRow: {
    flexDirection: 'row', gap: spacing.sm, flexGrow: 0,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md,
  },
  filterChip: { paddingVertical: spacing.sm },
  filterChipText: { ...type.label, color: colors.textSecondary },
  filterChipTextActive: { color: colors.primary, fontWeight: fontWeight.semibold },
  createSaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.lg, marginTop: spacing.sm,
  },
  createSaveBtnText: { ...type.label, color: colors.onPrimary },
});
