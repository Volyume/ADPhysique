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
import { colors, spacing, radius, type, hitSlop, iconSize } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import Button from '../Button';

export const EMPTY_DIARY_COPY = 'Nothing logged for this day yet.';

export default function EmptyDiary({
  onAdd,
  onCopyYesterday,
  onPlanDay,
  addLabel = 'Add food',
  addAccessibilityLabel = 'Add food',
}) {
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <View style={[styles.card, live.card]} accessibilityRole="summary">
      <Ionicons name="restaurant-outline" size={28} color={t.colors.textMuted} />
      <Text style={[styles.body, live.body]}>{EMPTY_DIARY_COPY}</Text>
      {onPlanDay ? (
        <TouchableOpacity
          style={[styles.planRow, live.planRow]}
          onPress={onPlanDay}
          hitSlop={hitSlop}
          accessibilityRole="button"
          accessibilityLabel="Open meal builder for this day or week"
        >
          <View style={[styles.planIcon, live.planIcon]}>
            <Ionicons name="restaurant-outline" size={18} color={t.colors.textSecondary} />
          </View>
          <View style={styles.planCopy}>
            <Text style={[styles.planTitle, live.planTitle]}>Meal builder</Text>
            <Text style={[styles.planText, live.planText]}>Build a day or week from your targets. Nothing is logged until you add it.</Text>
          </View>
          <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
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
    backgroundColor: colors.surface,
    flexShrink: 0,
  },
  planCopy: { flex: 1, minWidth: 0, alignItems: 'flex-start' },
  planTitle: { ...type.label, color: colors.textPrimary },
  planText: { ...type.caption, color: colors.textSecondary, marginTop: 2, textAlign: 'left' },
  actionButton: { minHeight: 44 },
});

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BillingPeriodSelector.js's buildLiveStyles. actions/planCopy/actionButton
// have no colour tokens.
function buildLiveStyles(t) {
  return {
    card: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    body: { color: t.colors.textSecondary },
    planRow: { borderColor: t.colors.border, backgroundColor: t.colors.surface2 },
    planIcon: { backgroundColor: t.colors.surface },
    planTitle: { color: t.colors.textPrimary },
    planText: { color: t.colors.textSecondary },
  };
}
