import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../../styles/theme';
import { SwipeableEntryRow } from './EntryRow';

export default function MealSection({ slot, entries, onAdd, onEdit, onDelete }) {
  const slotKcal = Math.round(entries.reduce((a, e) => a + (e.kcal ?? 0), 0));
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>{slot.label.toUpperCase()}</Text>
        <Text style={styles.sectionTotal}>{slotKcal} kcal</Text>
      </View>
      {entries.map((e) => (
        <SwipeableEntryRow
          key={e.id}
          entry={e}
          onEdit={() => onEdit(e)}
          onDelete={onDelete}
        />
      ))}
      <TouchableOpacity
        style={styles.addRow}
        onPress={onAdd}
        accessibilityLabel={`Add food to ${slot.label}`}
      >
        <Ionicons name="add" size={18} color={colors.primary} />
        <Text style={styles.addLabel}>Add food</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.lg },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionLabel: { color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.bold, letterSpacing: 1 },
  sectionTotal: { color: colors.textMuted, fontSize: fontSize.sm },
  addRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed',
    minHeight: 48,
  },
  addLabel: { color: colors.primary, fontSize: fontSize.md, fontWeight: fontWeight.semibold, marginLeft: spacing.xs },
});
