import { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, radius, type } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import { toEnergy, energyUnitLabel } from '../../lib/format';
import useAppStore from '../../store/useAppStore';
import * as haptics from '../../lib/haptics';

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
  // Ultimate-Audit item 15 (D22 15a, timeline food logging): the meal name
  // as a small quiet tag on the row, replacing the old per-meal card header
  // now that the flat chronological timeline has no meal card to carry it.
  // Undefined/null when the caller has no meal context (kept optional so
  // every existing render of EntryRow that never passed this stays
  // byte-identical).
  mealLabel = null,
  // P9 TalkBack: swipe-to-delete is a pan gesture TalkBack captures for
  // navigation, so the row exposes delete as a screen-reader custom action
  // (TalkBack actions menu) when the parent provides a delete handler.
  onAccessibilityDelete = null,
}) {
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  const energyUnit = useAppStore((s) => s.accessibility?.energyUnit ?? 'kcal');
  const kcal = Math.round(entry.kcal ?? 0);
  const p = Math.round(entry.protein_g ?? 0);
  const c = Math.round(entry.carbs_g ?? 0);
  const f = Math.round(entry.fat_g ?? 0);
  const name = friendlyFoodName(entry);
  const brand = entry?._brand ?? null;
  // Quick-add entries carry macros directly with no meaningful gram weight.
  const isQuick = (entry?.food_ref ?? '').startsWith('quick:');
  // Ultimate-Audit item 15 (D22 15b): the quiet time shown is now eaten_at,
  // not logged_at ("the moment the client wrote the row" -- item-15-
  // timeline-scoping.md Stage 0). A bulk-confirmed entry carries NO eaten_at
  // and shows no time at all here -- never a false timestamp, only its meal
  // tag (below). Every pre-existing entry was backfilled eaten_at =
  // logged_at (schema v67), so this is a no-op change for history.
  const eatenTime = Number.isFinite(entry?.eaten_at)
    ? new Date(entry.eaten_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : null;
  const metaLine = [isQuick ? null : `${Math.round(entry.quantity_g)}g`, eatenTime]
    .filter(Boolean).join('  ·  ');
  // Item 9 (campaign 2026-07-10): weight_state (raw/cooked/as_weighed) only
  // showed in FoodDetailSheet's edit sheet before. A quiet inline chip on
  // the row itself surfaces the weighing basis without opening the sheet --
  // but ONLY when it was explicitly set to raw or cooked; the as_weighed
  // default (or a missing value on older rows) shows nothing, so the vast
  // majority of rows carry no extra noise. ED-safety bound: this states the
  // weighing basis only, neutral tokens (no colour-coding, no calorie/
  // portion emphasis), same idiom as the mealTag chip below.
  const weightStateLabel = entry?.weight_state === 'raw'
    ? 'Raw'
    : entry?.weight_state === 'cooked'
      ? 'Cooked'
      : null;
  return (
    <TouchableOpacity
      style={[styles.entryRow, live.entryRow, selected && [styles.entryRowSelected, live.entryRowSelected]]}
      // E10 read-only lapse views: a view-only row carries no edit, selection
      // or long-press affordance; it is a plain fact of what was logged.
      // Haptics completion pass (2026-07-10, campaign item 5): a tap either
      // opens the edit sheet or toggles multi-select, both neutral
      // "row-opens-sheet"/selection interactions, never the food-log write
      // itself.
      onPress={readOnly ? undefined : () => { haptics.selection(); (selectionMode ? onToggleSelect : onEdit)?.(); }}
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
        <View style={[styles.checkbox, live.checkbox, selected && [styles.checkboxOn, live.checkboxOn]]}>
          {selected ? <Ionicons name="checkmark" size={14} color={t.colors.onPrimary} /> : null}
        </View>
      ) : null}
      <View style={styles.entryMain}>
        <View style={styles.entryNameRow}>
          <Text maxFontSizeMultiplier={1.3} style={[styles.entryName, live.entryName]} numberOfLines={1}>{name}</Text>
          {/* Item 9: quiet weighing-basis chip, shown only for an explicit
              raw/cooked weight_state. Decorative only, same as mealTag below
              (no accessibility change to the row's own label). */}
          {weightStateLabel ? (
            <View style={[styles.weightStateTag, live.weightStateTag]}>
              <Text maxFontSizeMultiplier={1.3} style={[styles.weightStateTagText, live.weightStateTagText]} numberOfLines={1}>{weightStateLabel}</Text>
            </View>
          ) : null}
          {/* Ultimate-Audit item 15 (D22 15a): the meal name as a small quiet
              tag, all that is left of the old per-meal card identity in the
              flat timeline. Decorative only (no accessibility change; the
              row's own accessibilityLabel below is unaffected). */}
          {mealLabel ? (
            <View style={[styles.mealTag, live.mealTag]}>
              <Text maxFontSizeMultiplier={1.3} style={[styles.mealTagText, live.mealTagText]} numberOfLines={1}>{mealLabel}</Text>
            </View>
          ) : null}
        </View>
        {brand ? <Text maxFontSizeMultiplier={1.3} style={[styles.entryBrand, live.entryBrand]} numberOfLines={1}>{brand}</Text> : null}
        {metaLine ? <Text maxFontSizeMultiplier={1.3} style={[styles.entryQuantity, live.entryQuantity]}>{metaLine}</Text> : null}
      </View>
      <View style={styles.entryMacros}>
        <Text maxFontSizeMultiplier={1.3} style={[styles.entryKcal, live.entryKcal]}>{toEnergy(kcal, energyUnit)} {energyUnitLabel(energyUnit)}</Text>
        <Text maxFontSizeMultiplier={1.3} style={[styles.entryMacroLine, live.entryMacroLine]}>{p}P {c}C {f}F</Text>
      </View>
    </TouchableOpacity>
  );
}

export function SwipeableEntryRow({
  entry, onEdit, onDelete,
  selectionMode = false, selected = false, onLongPress, onToggleSelect,
  readOnly = false,
  mealLabel = null,
}) {
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  const ref = useRef(null);
  const renderRightActions = useCallback(() => (
    <TouchableOpacity
      style={[styles.swipeDelete, live.swipeDelete]}
      accessibilityRole="button"
      accessibilityLabel="Delete entry"
      onPress={() => onDelete?.(entry, () => ref.current?.close?.())}
    >
      <Ionicons name="trash-outline" size={20} color={t.colors.textPrimary} />
      <Text maxFontSizeMultiplier={1.3} style={[styles.swipeDeleteText, live.swipeDeleteText]}>Delete</Text>
    </TouchableOpacity>
  ), [entry, onDelete, live.swipeDelete, live.swipeDeleteText, t.colors.textPrimary]);
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
        mealLabel={mealLabel}
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
  // Ultimate-Audit item 15 (D22 15a): name + meal tag share a row so the tag
  // reads as a quiet label on the food, not a second heading.
  entryNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  entryName: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.medium, flexShrink: 1 },
  mealTag: {
    paddingHorizontal: spacing.xs, paddingVertical: 1,
    borderRadius: radius.full,
    backgroundColor: colors.surface2,
    borderWidth: 1, borderColor: colors.border,
    flexShrink: 0,
  },
  mealTagText: { ...type.caption, color: colors.textMuted, fontSize: fontSize.xs },
  // Item 9: same neutral chip idiom as mealTag -- no colour-coding (ED-safety
  // bound: weighing basis only, never a good/bad signal).
  weightStateTag: {
    paddingHorizontal: spacing.xs, paddingVertical: 1,
    borderRadius: radius.full,
    backgroundColor: colors.surface2,
    borderWidth: 1, borderColor: colors.border,
    flexShrink: 0,
  },
  weightStateTagText: { ...type.caption, color: colors.textMuted, fontSize: fontSize.xs },
  entryBrand: { ...type.caption, color: colors.textMuted, marginTop: spacing.hair },
  entryQuantity: { ...type.caption, color: colors.textMuted, marginTop: spacing.xxs },
  entryMacros: { alignItems: 'flex-end' },
  entryKcal: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  entryMacroLine: { ...type.caption, color: colors.textMuted, marginTop: spacing.xxs },
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
    ...type.captionStrong,
    color: colors.textPrimary,
  },
});

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BillingPeriodSelector.js's buildLiveStyles. entryMain/entryNameRow/
// entryMacros have no colour tokens.
function buildLiveStyles(t) {
  return {
    entryRow: { backgroundColor: t.colors.surface, borderTopColor: t.colors.border },
    entryRowSelected: { backgroundColor: t.colors.surface2 },
    checkbox: { borderColor: t.colors.border },
    checkboxOn: { backgroundColor: t.colors.primaryFill, borderColor: t.colors.primary },
    entryName: { color: t.colors.textPrimary },
    mealTag: { backgroundColor: t.colors.surface2, borderColor: t.colors.border },
    mealTagText: { color: t.colors.textMuted },
    weightStateTag: { backgroundColor: t.colors.surface2, borderColor: t.colors.border },
    weightStateTagText: { color: t.colors.textMuted },
    entryBrand: { color: t.colors.textMuted },
    entryQuantity: { color: t.colors.textMuted },
    entryKcal: { color: t.colors.textPrimary },
    entryMacroLine: { color: t.colors.textMuted },
    swipeDelete: { backgroundColor: t.colors.error },
    swipeDeleteText: { color: t.colors.textPrimary },
  };
}
