import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, FlatList, KeyboardAvoidingView,
  Platform, TextInput, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius, type } from '../styles/theme';
import { MUSCLE_DISPLAY_NAMES } from '../lib/algorithms';
import { getAllExercises, insertExercise } from '../lib/database';
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
    setShowCreate(false);
    getAllExercises().then(exs => {
      setAll(exs);
      setFiltered(exs);
    }).catch(() => {});
  }, [visible]);

  useEffect(() => {
    if (!query.trim()) {
      setFiltered(allExercises);
    } else {
      const q = query.toLowerCase();
      setFiltered(allExercises.filter(e => e.name.toLowerCase().includes(q)));
    }
  }, [query, allExercises]);

  async function handleCreate() {
    if (!createName.trim()) {
      toast.show('Enter a name for the exercise', { variant: 'warning' });
      return;
    }
    setCreating(true);
    try {
      await insertExercise({
        name: createName.trim(),
        primaryMuscle: createMuscle || null,
        equipment: createEquipment || null,
        isCustom: 1,
      });
      const all = await getAllExercises();
      setAll(all);
      const newEx = all.find(e => e.name === createName.trim())
        || { name: createName.trim(), primaryMuscle: createMuscle, equipment: createEquipment };
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
      <SafeAreaView style={styles.pickerSafe} edges={['top', 'bottom']}>
        {showCreate ? (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity
                onPress={() => setShowCreate(false)}
                style={styles.pickerClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="arrow-back" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.createTitle}>New Exercise</Text>
              <TouchableOpacity
                onPress={onClose}
                style={styles.pickerClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.createContent} keyboardShouldPersistTaps="handled">
              <TextInput
                style={styles.createNameInput}
                value={createName}
                onChangeText={setCreateName}
                placeholder="Exercise name"
                placeholderTextColor={colors.textMuted}
                autoFocus
                autoCapitalize="words"
              />
              <Text style={styles.createLabel}>Muscle Group</Text>
              <View style={styles.chipRow}>
                {PICKER_MUSCLES.map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.chip, createMuscle === m && styles.chipActive]}
                    onPress={() => setCreateMuscle(prev => prev === m ? '' : m)}
                  >
                    <Text style={[styles.chipText, createMuscle === m && styles.chipTextActive]}>
                      {MUSCLE_DISPLAY_NAMES[m]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.createLabel}>Equipment</Text>
              <View style={styles.chipRow}>
                {PICKER_EQUIPMENT.map(eq => (
                  <TouchableOpacity
                    key={eq}
                    style={[styles.chip, createEquipment === eq && styles.chipActive]}
                    onPress={() => setCreateEquipment(prev => prev === eq ? '' : eq)}
                  >
                    <Text style={[styles.chipText, createEquipment === eq && styles.chipTextActive]}>{eq}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.createSaveBtn, creating && { opacity: 0.5 }]}
                onPress={handleCreate}
                disabled={creating}
              >
                <Ionicons name="add-circle" size={20} color={colors.background} />
                <Text style={styles.createSaveBtnText}>{buttonLabel}</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        ) : (
          <>
            <View style={styles.pickerHeader}>
              <TextInput
                style={styles.pickerSearch}
                value={query}
                onChangeText={setQuery}
                placeholder="Search exercises…"
                placeholderTextColor={colors.textMuted}
                autoFocus
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
              <TouchableOpacity
                onPress={onClose}
                style={styles.pickerClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={filtered}
              keyExtractor={e => String(e.id)}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.pickerList}
              renderItem={({ item }) => (
                <TouchableOpacity
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
                <TouchableOpacity style={[styles.createNewBtn, { marginTop: spacing.md }]} onPress={openCreate}>
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
                  <Text style={styles.pickerEmptyText}>No exercises found</Text>
                </View>
              }
            />
          </>
        )}
      </SafeAreaView>
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
  pickerSearch: {
    ...type.body, flex: 1, backgroundColor: colors.inputBg, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.textPrimary,
    borderWidth: 1, borderColor: colors.border,
  },
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
  createNameInput: {
    ...type.title, backgroundColor: colors.inputBg, borderRadius: radius.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, color: colors.textPrimary,
    borderWidth: 1, borderColor: colors.border,
  },
  createLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 0.3 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full,
    backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
  chipText: { ...type.label, color: colors.textSecondary },
  chipTextActive: { color: colors.primary, fontWeight: fontWeight.semibold },
  createSaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.lg, marginTop: spacing.sm,
  },
  createSaveBtnText: { ...type.title, color: colors.background },
});
