import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius, type } from '../../styles/theme';
import { toEnergy, energyUnitLabel } from '../../lib/format';
import { getMealAdditionsForEntries } from '../../lib/food/mealAdditions';
import useAppStore from '../../store/useAppStore';
import { SwipeableEntryRow } from './EntryRow';

// One meal as a single contained card (diary-tab redesign 2026-06-01). Replaces
// the old containerless section (a bare uppercase label over a dashed "Add
// food" box). The card owns the border and rounded corners; items are flush
// in-card rows; the header carries the per-meal subtotal (calories AND protein,
// the number a training user defends); the add affordance is a quiet in-card
// row, not a dashed placeholder box.
export default function MealSection({
  slot, entries, onAdd, onQuickAdd, onEdit, onDelete,
  usuals = null, onLogUsual,
  selectionMode = false, selectedIds, onLongPressEntry, onToggleSelect,
}) {
  const energyUnit = useAppStore((s) => s.accessibility?.energyUnit ?? 'kcal');
  const hasEntries = entries.length > 0;
  const slotKcal = Math.round(entries.reduce((a, e) => a + (e.kcal ?? 0), 0));
  const slotProtein = Math.round(entries.reduce((a, e) => a + (e.protein_g ?? 0), 0));
  // GAP #5: one-tap "usuals". Only on an empty slot (a slot with food doesn't
  // need the prompt) and never in selection mode (the card is a target then).
  const showUsuals = !hasEntries && !selectionMode && Array.isArray(usuals) && usuals.length > 0;
  // Season to taste (founder 2026-07-01): once a curated / meal-plan meal is on
  // the day, carry its free additions into the diary too. Only shows when the
  // slot's foods resolve to a real curated meal; null (hidden) otherwise.
  const seasonAdds = hasEntries && !selectionMode ? getMealAdditionsForEntries(entries) : null;
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.mealName}>{slot.label}</Text>
        {hasEntries ? (
          <Text style={styles.subtotal}>{toEnergy(slotKcal, energyUnit)} {energyUnitLabel(energyUnit)} · {slotProtein}g P</Text>
        ) : null}
      </View>
      {showUsuals ? (
        <View style={styles.usuals}>
          {usuals.map((food) => (
            <TouchableOpacity
              key={food.food_ref}
              style={styles.usualChip}
              onPress={() => onLogUsual?.(food)}
              accessibilityRole="button"
              accessibilityLabel={`Add ${food.name ?? 'food'} to ${slot.label}`}
            >
              <Ionicons name="add" size={14} color={colors.primary} />
              <Text style={styles.usualChipText} numberOfLines={1}>{food.name ?? 'Food'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      {entries.map((e) => (
        <SwipeableEntryRow
          key={e.id}
          entry={e}
          onEdit={() => onEdit(e)}
          onDelete={onDelete}
          selectionMode={selectionMode}
          selected={!!selectedIds?.has(e.id)}
          onLongPress={() => onLongPressEntry?.(e)}
          onToggleSelect={() => onToggleSelect?.(e)}
        />
      ))}
      {seasonAdds ? (
        <View style={styles.seasonRow}>
          <Text style={styles.seasonText}>
            <Text style={styles.seasonLabel}>Season to taste: </Text>
            {seasonAdds.map((a) => a.name).join(', ')}.
          </Text>
        </View>
      ) : null}
      <TouchableOpacity
        style={[styles.addRow, hasEntries && styles.addRowDivided]}
        onPress={onAdd}
        accessibilityLabel={`Add food to ${slot.label}`}
      >
        <Ionicons name="add" size={18} color={colors.primary} />
        <Text style={styles.addLabel}>Add food</Text>
      </TouchableOpacity>
      {/* Escape hatch for meals that aren't worth a lookup (restaurant,
          estimate, retro-logging). Secondary to search by design: quieter
          colour, below the primary row. */}
      {onQuickAdd ? (
        <TouchableOpacity
          style={[styles.addRow, styles.addRowDivided]}
          onPress={onQuickAdd}
          accessibilityLabel={`Quick add to ${slot.label}`}
        >
          <Ionicons name="flash-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.quickAddLabel}>Quick add</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  mealName: { ...type.bodyStrong, color: colors.textPrimary },
  subtotal: { color: colors.textMuted, fontSize: fontSize.sm, fontVariant: ['tabular-nums'] },
  // One-tap "usuals" chips: a quiet wrap of the foods most logged into this
  // slot, sitting between the header and the Add row on an empty card.
  usuals: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs,
    paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, paddingTop: spacing.xxs,
  },
  usualChip: {
    flexDirection: 'row', alignItems: 'center', maxWidth: '100%',
    paddingVertical: spacing.xs, paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2,
  },
  usualChipText: { ...type.label, color: colors.textPrimary, marginLeft: 4, flexShrink: 1 },
  addRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    minHeight: 48,
  },
  // When the card has items, the add row sits below them with a hairline
  // divider. On an empty section it sits directly under the header with no
  // divider, so the card reads as one clean block, not a placeholder.
  addRowDivided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  seasonRow: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
  },
  seasonText: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 19 },
  seasonLabel: { color: colors.textMuted, fontWeight: fontWeight.bold },
  addLabel: { ...type.body, color: colors.primary, marginLeft: spacing.xs },
  quickAddLabel: { ...type.body, fontSize: fontSize.sm, color: colors.textSecondary, marginLeft: spacing.xs },
});
