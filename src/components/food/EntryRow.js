import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../../styles/theme';

export function friendlyFoodName(entry) {
  if (entry?._name && typeof entry._name === 'string') return entry._name;
  return entry?.food_ref?.startsWith('custom:') ? 'Custom food' : 'Food';
}

export function EntryRow({
  entry, onEdit,
  selectionMode = false, selected = false, onLongPress, onToggleSelect,
}) {
  const kcal = Math.round(entry.kcal ?? 0);
  const p = Math.round(entry.protein_g ?? 0);
  const c = Math.round(entry.carbs_g ?? 0);
  const f = Math.round(entry.fat_g ?? 0);
  const name = friendlyFoodName(entry);
  const brand = entry?._brand ?? null;
  return (
    <TouchableOpacity
      style={[styles.entryRow, selected && styles.entryRowSelected]}
      onPress={selectionMode ? onToggleSelect : onEdit}
      onLongPress={onLongPress}
      delayLongPress={300}
      accessibilityLabel={
        selectionMode
          ? `${name}, ${kcal} kcal. ${selected ? 'Selected' : 'Not selected'}. Tap to toggle.`
          : `${name}, ${kcal} kcal. Tap to edit.`
      }
    >
      {selectionMode ? (
        <View style={[styles.checkbox, selected && styles.checkboxOn]}>
          {selected ? <Ionicons name="checkmark" size={14} color="#000" /> : null}
        </View>
      ) : null}
      <View style={styles.entryMain}>
        <Text style={styles.entryName} numberOfLines={1}>{name}</Text>
        {brand ? <Text style={styles.entryBrand} numberOfLines={1}>{brand}</Text> : null}
        <Text style={styles.entryQuantity}>{Math.round(entry.quantity_g)}g</Text>
      </View>
      <View style={styles.entryMacros}>
        <Text style={styles.entryKcal}>{kcal} kcal</Text>
        <Text style={styles.entryMacroLine}>{p}P {c}C {f}F</Text>
      </View>
    </TouchableOpacity>
  );
}

export function SwipeableEntryRow({
  entry, onEdit, onDelete,
  selectionMode = false, selected = false, onLongPress, onToggleSelect,
}) {
  const ref = useRef(null);
  const renderRightActions = useCallback(() => (
    <TouchableOpacity
      style={styles.swipeDelete}
      accessibilityRole="button"
      accessibilityLabel="Delete entry"
      onPress={() => onDelete?.(entry, () => ref.current?.close?.())}
    >
      <Ionicons name="trash-outline" size={20} color={colors.textPrimary} />
      <Text style={styles.swipeDeleteText}>Delete</Text>
    </TouchableOpacity>
  ), [entry, onDelete]);
  return (
    <Swipeable
      ref={ref}
      renderRightActions={renderRightActions}
      overshootRight={false}
      rightThreshold={48}
      enabled={!selectionMode}
    >
      <EntryRow
        entry={entry}
        onEdit={onEdit}
        selectionMode={selectionMode}
        selected={selected}
        onLongPress={onLongPress}
        onToggleSelect={onToggleSelect}
      />
    </Swipeable>
  );
}

export default EntryRow;

const styles = StyleSheet.create({
  entryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.sm,
    minHeight: 48,
  },
  entryRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surface2,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: radius.sm,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.md,
  },
  checkboxOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  entryMain: { flex: 1 },
  entryName: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  entryBrand: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 1 },
  entryQuantity: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: spacing.xxs },
  entryMacros: { alignItems: 'flex-end' },
  entryKcal: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  entryMacroLine: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: spacing.xxs },
  swipeDelete: {
    backgroundColor: colors.error,
    width: 90,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.md,
    marginVertical: spacing.xs,
    gap: spacing.xxs,
  },
  swipeDeleteText: {
    color: colors.textPrimary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
});
