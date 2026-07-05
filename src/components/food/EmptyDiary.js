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
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, radius, type } from '../../styles/theme';
import Button from '../Button';

export const EMPTY_DIARY_COPY = 'Nothing logged yet today. Add a meal whenever you\'re ready.';

export default function EmptyDiary({ onAdd, onCopyYesterday, onSuggested, onPlanDay }) {
  return (
    <View style={styles.card} accessibilityRole="summary">
      <Ionicons name="restaurant-outline" size={28} color={colors.textMuted} />
      <Text style={styles.body}>{EMPTY_DIARY_COPY}</Text>
      {onPlanDay ? (
        <Button
          title="Build a meal plan"
          variant="outline"
          size="sm"
          icon="sparkles-outline"
          onPress={onPlanDay}
          accessibilityLabel="Build a meal plan: a day or week of meals built to your targets"
          style={styles.planButton}
        />
      ) : null}
      <View style={styles.actions}>
        {onAdd ? (
          <Button
            title="Add food"
            size="sm"
            icon="add"
            onPress={onAdd}
            accessibilityLabel="Add food"
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
  planButton: { minHeight: 44 },
  actionButton: { minHeight: 44 },
});
