import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, radius, type, iconSize } from '../../styles/theme';
import { toEnergy, energyUnitLabel } from '../../lib/format';
import { getMealAdditionsForEntries } from '../../lib/food/mealAdditions';
import useAppStore from '../../store/useAppStore';
import { SwipeableEntryRow } from './EntryRow';
import AnimatedRow from '../AnimatedRow';

// One meal as a single contained card (diary-tab redesign 2026-06-01). Replaces
// the old containerless section (a bare uppercase label over a dashed "Add
// food" box). The card owns the border and rounded corners; items are flush
// in-card rows; the header carries the per-meal subtotal (calories AND protein,
// the number a training user defends); the add affordance is a quiet in-card
// hub, not a dashed placeholder box.
export default function MealSection({
  slot, entries, onAdd, onEdit, onDelete,
  usuals = null, onLogUsual,
  selectionMode = false, selectedIds, onLongPressEntry, onToggleSelect,
  readOnly = false,
  // Food audit item 1 ("mark planned meal eaten", one tap): confirms just
  // THIS slot's planned rows via mealPlanService's real intake write path
  // (logFoodEntry -> is_planned=1, confirmPlannedDay -> is_planned=0), never
  // a cosmetic flag. Undefined when the parent has decided a write is not
  // currently possible (read-only, a future day); the button only ever
  // renders when this slot actually holds planned rows.
  onConfirmPlanned,
}) {
  const energyUnit = useAppStore((s) => s.accessibility?.energyUnit ?? 'kcal');
  const hasEntries = entries.length > 0;
  const slotKcal = Math.round(entries.reduce((a, e) => a + (e.kcal ?? 0), 0));
  const slotProtein = Math.round(entries.reduce((a, e) => a + (e.protein_g ?? 0), 0));
  // Planned-but-unconfirmed rows in THIS meal (is_planned=1, staged by the
  // meal plan). MacroRings already shows the day-wide planned/eaten split
  // (the faded arc); this is the per-meal signal that drives the one-tap
  // confirm button below, no colour or score attached to it.
  const plannedCount = entries.reduce((n, e) => n + (e.is_planned ? 1 : 0), 0);
  const showMarkEaten = plannedCount > 0 && !selectionMode && typeof onConfirmPlanned === 'function';
  // GAP #5: one-tap "usuals". Only on an empty slot (a slot with food doesn't
  // need the prompt) and never in selection mode (the card is a target then).
  // E10 read-only lapse views: never in read-only either, logging a usual is
  // a write.
  const showUsuals = !hasEntries && !selectionMode && !readOnly && Array.isArray(usuals) && usuals.length > 0;
  const showEmptyActions = !hasEntries && !selectionMode && !readOnly;
  const showActionHub = !selectionMode && !readOnly;
  // Season to taste (founder 2026-07-01): once a curated / meal-plan meal is on
  // the day, carry its free additions into the diary too. Only shows when the
  // slot's foods resolve to a real curated meal; null (hidden) otherwise.
  const seasonAdds = hasEntries && !selectionMode ? getMealAdditionsForEntries(entries) : null;
  // L05-D1/D6 (design-usability audit 2026-07-09, founder-gated build): a
  // logged row already opens for edit on tap (EntryRow's own accessibility
  // label says "Tap to edit"), but a sighted user had no visual cue at all.
  // Same write-capability gate as the add-food hub below: a row is only
  // presented as editable when the diary can be written to and the card
  // is not currently a multi-select target.
  const showRowEditHint = !selectionMode && !readOnly;
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.mealName}>{slot.label}</Text>
        {hasEntries ? (
          <Text style={styles.subtotal}>{toEnergy(slotKcal, energyUnit)} {energyUnitLabel(energyUnit)} - {slotProtein}g P</Text>
        ) : null}
      </View>
      {showEmptyActions && showUsuals ? (
        <View style={styles.emptySlot}>
          <Text style={styles.emptySlotText}>
            Your usual foods are below. Pick something else if this meal was different.
          </Text>
        </View>
      ) : null}
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
      {/* D2: rows animate in/out and siblings glide into freed space, so a
          delete or add is no longer a jump-cut. Keys are entry ids (stable),
          which AnimatedRow requires. */}
      {entries.map((e) => (
        <AnimatedRow key={e.id} style={styles.entryRowOuter}>
          <View style={styles.entryFlex}>
            <SwipeableEntryRow
              entry={e}
              onEdit={() => onEdit(e)}
              onDelete={onDelete}
              selectionMode={selectionMode}
              selected={!!selectedIds?.has(e.id)}
              onLongPress={() => onLongPressEntry?.(e)}
              onToggleSelect={() => onToggleSelect?.(e)}
              readOnly={readOnly}
            />
          </View>
          {/* L05-D1/D6: decorative-only edit cue, matching the chevron
              idiom already used for "this opens something" rows elsewhere
              in the diary (e.g. the saved-meals sheet below). pointerEvents
              "none" so it never competes with the row's own tap, long-press
              or swipe-to-delete gesture; hidden the moment the row is not
              actually editable (selection mode, read-only lapse view). */}
          {showRowEditHint ? (
            <View style={styles.entryChevron} pointerEvents="none">
              <Ionicons name="chevron-forward" size={iconSize.sm} color={colors.textMuted} />
            </View>
          ) : null}
        </AnimatedRow>
      ))}
      {seasonAdds ? (
        <View style={styles.seasonRow}>
          {/* Founder 2026-07-09: the old label here read like an instruction
              to add ALL of the listed items. Reframed to the same pick-any
              register as ADDITIONS_INTRO/CuratedMealSheet's "Optional extras"
              heading (src/lib/food/mealAdditions.js), so this inline row can't
              be misread as a checklist. */}
          <Text style={styles.seasonText}>
            <Text style={styles.seasonLabel}>Optional extras, add any you fancy: </Text>
            {seasonAdds.map((a) => a.name).join(', ')}.
          </Text>
        </View>
      ) : null}
      {/* Food audit item 1: a planned meal stages into the diary as real rows
          (is_planned=1); one tap here confirms THIS meal eaten. Shown before
          the action hub so it reads as the meal's own next step, not a
          generic add action. Staging only, never automatic: nothing here
          runs without this explicit tap. */}
      {showMarkEaten ? (
        <View style={styles.plannedRow}>
          <Text style={styles.plannedRowText}>
            {plannedCount === 1 ? 'This meal is planned.' : `${plannedCount} foods planned in this meal.`}
          </Text>
          <TouchableOpacity
            style={styles.markEatenButton}
            onPress={onConfirmPlanned}
            accessibilityRole="button"
            accessibilityLabel={`Mark ${slot.label} as eaten`}
          >
            <Text style={styles.markEatenText}>Mark eaten</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {/* E10 read-only lapse views: no add affordances on a view-only diary. */}
      {showActionHub ? (
        <View style={[styles.actionHub, hasEntries && styles.actionHubDivided]}>
          <TouchableOpacity
            style={styles.addFoodButton}
            onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel={`Add food to ${slot.label}`}
        >
            <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.addFoodText}>Add food</Text>
          </TouchableOpacity>
        </View>
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
  emptySlot: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  emptySlotText: { ...type.bodySm, color: colors.textMuted, lineHeight: 20 },
  actionHub: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  actionHubDivided: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  addFoodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    flex: 1,
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.md,
  },
  addFoodText: { ...type.label, color: colors.textPrimary },
  // L05-D1/D6: the entry row keeps its own full-bleed background/border
  // (EntryRow.js, untouched by this fix); this outer row only adds a
  // narrow decorative lane for the edit chevron, so the row itself must be
  // wrapped with flex:1 to keep its existing full-width layout now that it
  // shares a row-direction parent with that lane.
  entryRowOuter: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  entryFlex: {
    flex: 1,
  },
  entryChevron: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  // Per-meal "mark eaten" (food audit item 1). Same visual language as the
  // day-level planned banner (DiaryScreen `plannedBtnPrimary`): a quiet
  // caption plus a single primary-tinted button, no colour judgement, no
  // score, no streak.
  plannedRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
  },
  plannedRowText: { ...type.bodySm, color: colors.textMuted, flex: 1 },
  markEatenButton: {
    backgroundColor: colors.primaryFill, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs, minHeight: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  markEatenText: { color: colors.onPrimary, fontWeight: fontWeight.semibold, fontSize: fontSize.sm },
  seasonRow: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
  },
  seasonText: { ...type.bodySm, color: colors.textSecondary },
  seasonLabel: { color: colors.textMuted, fontWeight: fontWeight.bold },
});
