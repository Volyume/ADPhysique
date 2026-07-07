/**
 * EmptyDiary: the designed empty-state for a day with no food entries.
 *
 * Diary-tab redesign 2026-06-01 (supersedes the locked single-sentence copy in
 * UI_FLOWS_LOCKED.md). Instead of a bare line under six dashed boxes, an empty
 * day shows one calm card: a short factual line and the primary actions, so the
 * body of the screen is inviting rather than a wall of placeholders. The
 * training-day cue is carried by the summary card's day-type chip, so it is not
 * repeated here. Scan stays on the persistent FAB.
 */
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, radius, type, hitSlop } from '../../styles/theme';
import Button from '../Button';

export const EMPTY_DIARY_COPY = 'Nothing logged for this day yet.';

export default function EmptyDiary({
  onAdd,
  onCopyYesterday,
  onSuggested,
  onPlanDay,
  addLabel = 'Add food',
  addAccessibilityLabel = 'Add food',
}) {
  return (
    <View style={styles.card} accessibilityRole="summary">
      <Ionicons name="restaurant-outline" size={28} color={colors.textMuted} />
      <Text style={styles.body}>{EMPTY_DIARY_COPY}</Text>
      {onPlanDay ? (
        <TouchableOpacity
          style={styles.planRow}
          onPress={onPlanDay}
          hitSlop={hitSlop}
          accessibilityRole="button"
          accessibilityLabel="Build meals: choose this day or the week, review the meals, then add them to your diary"
        >
          <View style={styles.planIcon}>
            <Ionicons name="restaurant-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.planCopy}>
            <Text style={styles.planTitle}>Build meals</Text>
            <Text style={styles.planText}>Create a day or week from your targets. Nothing is logged until you add it.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      ) : null}
      <View style={styles.actions}>
        {onAdd ? (
          <Button
            title={addLabel}
            size="sm"
            icon="add"
            onPress={onAdd}
            accessibilityLabel={addAccessibilityLabel}
            fullWidth={false}
            style={styles.actionButton}
          />
        ) : null}
        {onCopyYesterday ? (
          <Button
            title="Copy yesterday"
            variant="secondary"
            size="sm"
            icon="copy-outline"
            onPress={onCopyYesterday}
            accessibilityLabel="Copy yesterday's entries"
            fullWidth={false}
            style={styles.actionButton}
          />
        ) : onSuggested ? (
          // A3 (first-week trust): a day-0 diary has no yesterday to copy, so
          // "Copy yesterday" would be a dead tap. Point at a suggested meal
          // instead, the one action that works with zero history.
          <Button
            title="Try a suggested meal"
            variant="secondary"
            size="sm"
            icon="bulb-outline"
            onPress={onSuggested}
            accessibilityLabel="Try a suggested meal"
            fullWidth={false}
            style={styles.actionButton}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    paddingVertical: spacing.xl, paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  body: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  planRow: {
    alignSelf: 'stretch',
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  planIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryBg,
    flexShrink: 0,
  },
  planCopy: { flex: 1, minWidth: 0, alignItems: 'flex-start' },
  planTitle: { ...type.label, color: colors.primary },
  planText: { ...type.caption, color: colors.textSecondary, marginTop: 2, textAlign: 'left' },
  actionButton: { minHeight: 44 },
});
