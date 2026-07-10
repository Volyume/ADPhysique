import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fontSize, fontWeight, spacing, radius, type } from '../../styles/theme';
import { SwipeableEntryRow } from './EntryRow';

/**
 * One row in the flat diary timeline (Ultimate-Audit item 15, D22 15a/15b).
 * Wraps the existing SwipeableEntryRow/EntryRow primitives (reused verbatim,
 * per the scoping doc's own recommendation, item-15-timeline-scoping.md
 * Section 3 Stage 2 point 1: "reuse EntryRow/SwipeableEntryRow rather than
 * re-implementing swipe/select/edit") and adds the one piece of chrome the
 * old per-meal MealSection card is not around to provide any more: a
 * per-entry "Mark eaten" action for a still-planned row. A single tap on a
 * single food is a genuine, real-moment action (src/lib/food/db.js
 * confirmPlannedEntry stamps eaten_at = now for exactly this reason), unlike
 * the bulk "mark all meals as eaten" control at the foot of the page, which
 * intentionally leaves eaten_at NULL (D22 15b).
 *
 * No score, streak, or pass/fail colour-judgement copy here (constitution
 * ban, CLAUDE.md sec.2) -- mirrors MealSection's retired per-meal banner
 * exactly in register ("Planned" / "Mark eaten").
 */
export default function TimelineEntryRow({
  entry, mealLabel, onEdit, onDelete,
  selectionMode = false, selected = false, onLongPress, onToggleSelect,
  readOnly = false,
  // Present only when this entry can actually be confirmed right now
  // (write-capable, not mid-selection, not a future day); undefined hides
  // the mini-banner even for a planned row, same withholding convention
  // MealSection used for onConfirmPlanned.
  onConfirmPlanned,
}) {
  const showMarkEaten = !!entry?.is_planned && !selectionMode && !readOnly && typeof onConfirmPlanned === 'function';
  return (
    <View style={styles.wrap}>
      <SwipeableEntryRow
        entry={entry}
        mealLabel={mealLabel}
        onEdit={onEdit}
        onDelete={onDelete}
        selectionMode={selectionMode}
        selected={selected}
        onLongPress={onLongPress}
        onToggleSelect={onToggleSelect}
        readOnly={readOnly}
      />
      {showMarkEaten ? (
        <View style={styles.plannedRow}>
          <Text style={styles.plannedRowText}>Planned</Text>
          <TouchableOpacity
            style={styles.markEatenButton}
            onPress={onConfirmPlanned}
            accessibilityRole="button"
            accessibilityLabel={`Mark ${mealLabel ? `this ${mealLabel} food` : 'this food'} as eaten`}
          >
            <Text style={styles.markEatenText}>Mark eaten</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  // Same visual language as MealSection's retired per-meal "plannedRow": a
  // quiet caption plus a single primary-tinted button, no colour judgement,
  // no score, no streak.
  plannedRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
  },
  plannedRowText: { ...type.bodySm, color: colors.textMuted, flex: 1 },
  markEatenButton: {
    backgroundColor: colors.primaryFill, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs, minHeight: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  markEatenText: { color: colors.onPrimary, fontWeight: fontWeight.semibold, fontSize: fontSize.sm },
});
