import { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, radius } from '../../styles/theme';
import { toEnergy, energyUnitLabel } from '../../lib/format';
import useAppStore from '../../store/useAppStore';

export function friendlyFoodName(entry) {
  if (entry?._name && typeof entry._name === 'string') return entry._name;
  const ref = entry?.food_ref ?? '';
  if (ref.startsWith('quick:')) return 'Quick add';
  if (ref.startsWith('custom:')) return 'Custom food';
  return 'Food';
}

export function EntryRow({
  entry, onEdit,
  selectionMode = false, selected = false, onLongPress, onToggleSelect,
  readOnly = false,
  // P9 TalkBack: swipe-to-delete is a pan gesture TalkBack captures for
  // navigation, so the row exposes delete as a screen-reader custom action
  // (TalkBack actions menu) when the parent provides a delete handler.
  onAccessibilityDelete = null,
}) {
  const energyUnit = useAppStore((s) => s.accessibility?.energyUnit ?? 'kcal');
  const kcal = Math.round(entry.kcal ?? 0);
  const p = Math.round(entry.protein_g ?? 0);
  const c = Math.round(entry.carbs_g ?? 0);
  const f = Math.round(entry.fat_g ?? 0);
  const name = friendlyFoodName(entry);
  const brand = entry?._brand ?? null;
  // Quick-add entries carry macros directly with no meaningful gram weight.
  const isQuick = (entry?.food_ref ?? '').startsWith('quick:');
  // Logged time (gap #3): every entry stores logged_at; show it as a quiet 24h
  // HH:mm so the user can see WHEN they ate, like MFP/Cronometer. Display-only.
  const loggedTime = Number.isFinite(entry?.logged_at)
    ? new Date(entry.logged_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : null;
  const metaLine = [isQuick ? null : `${Math.round(entry.quantity_g)}g`, loggedTime]
    .filter(Boolean).join('  ·  ');
  return (
    <TouchableOpacity
      style={[styles.entryRow, selected && styles.entryRowSelected]}
      // E10 read-only lapse views: a view-only row carries no edit, selection
      // or long-press affordance; it is a plain fact of what was logged.
      onPress={readOnly ? undefined : (selectionMode ? onToggleSelect : onEdit)}
      onLongPress={readOnly ? undefined : onLongPress}
      delayLongPress={300}
      disabled={readOnly}
      accessibilityRole="button"
      accessibilityActions={!readOnly && onAccessibilityDelete
        ? [{ name: 'delete', label: 'Delete entry' }]
        : undefined}
      onAccessibilityAction={!readOnly && onAccessibilityDelete
        ? (e) => { if (e.nativeEvent.actionName === 'delete') onAccessibilityDelete(); }
        : undefined}
      accessibilityLabel={
        readOnly
          ? `${name}, ${toEnergy(kcal, energyUnit)} ${energyUnitLabel(energyUnit)}.`
          : selectionMode
            ? `${name}, ${toEnergy(kcal, energyUnit)} ${energyUnitLabel(energyUnit)}. ${selected ? 'Selected' : 'Not selected'}. Tap to toggle.`
            : `${name}, ${toEnergy(kcal, energyUnit)} ${energyUnitLabel(energyUnit)}. Tap to edit.`
      }
    >
      {selectionMode ? (
        <View style={[styles.checkbox, selected && styles.checkboxOn]}>
          {selected ? <Ionicons name="checkmark" size={14} color={colors.onPrimary} /> : null}
        </View>
      ) : null}
      <View style={styles.entryMain}>
        <Text style={styles.entryName} numberOfLines={1}>{name}</Text>
        {brand ? <Text style={styles.entryBrand} numberOfLines={1}>{brand}</Text> : null}
        {metaLine ? <Text style={styles.entryQuantity}>{metaLine}</Text> : null}
      </View>
      <View style={styles.entryMacros}>
        <Text style={styles.entryKcal}>{toEnergy(kcal, energyUnit)} {energyUnitLabel(energyUnit)}</Text>
        <Text style={styles.entryMacroLine}>{p}P {c}C {f}F</Text>
      </View>
    </TouchableOpacity>
  );
}

export function SwipeableEntryRow({
  entry, onEdit, onDelete,
  selectionMode = false, selected = false, onLongPress, onToggleSelect,
  readOnly = false,
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
      // E10 read-only lapse views: swipe-to-delete is a write; disabled entirely.
      enabled={!selectionMode && !readOnly}
    >
      <EntryRow
        entry={entry}
        onEdit={onEdit}
        selectionMode={selectionMode}
        selected={selected}
        onLongPress={onLongPress}
        onToggleSelect={onToggleSelect}
        readOnly={readOnly}
        onAccessibilityDelete={() => onDelete?.(entry, () => ref.current?.close?.())}
      />
    </Swipeable>
  );
}

export default EntryRow;

const styles = StyleSheet.create({
  // In-card row (diary-tab redesign 2026-06-01): the parent MealSection card
  // owns the border and rounded corners, so a row is a flush list row, not a
  // bordered card of its own. It keeps an opaque surface background so the
  // swipe-to-delete action is occluded as the row slides, and a hairline top
  // divider separates rows and the header.
  entryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
    minHeight: 48,
  },
  entryRowSelected: {
    backgroundColor: colors.surface2,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: radius.sm,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.md,
  },
  checkboxOn: {
    backgroundColor: colors.primaryFill,
    borderColor: colors.primary,
  },
  entryMain: { flex: 1 },
  entryName: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  entryBrand: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: spacing.hair },
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
