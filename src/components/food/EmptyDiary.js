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
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius, type } from '../../styles/theme';

export const EMPTY_DIARY_COPY = 'Nothing logged yet today. Add a meal whenever you\'re ready.';

export default function EmptyDiary({ onAdd, onCopyYesterday }) {
  return (
    <View style={styles.card} accessibilityRole="summary">
      <Ionicons name="restaurant-outline" size={28} color={colors.textMuted} />
      <Text style={styles.body}>{EMPTY_DIARY_COPY}</Text>
      <View style={styles.actions}>
        {onAdd ? (
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            onPress={onAdd}
            accessibilityRole="button"
            accessibilityLabel="Add food"
          >
            <Ionicons name="add" size={18} color={colors.background} />
            <Text style={[styles.btnText, styles.btnTextPrimary]}>Add food</Text>
          </TouchableOpacity>
        ) : null}
        {onCopyYesterday ? (
          <TouchableOpacity
            style={[styles.btn, styles.btnSecondary]}
            onPress={onCopyYesterday}
            accessibilityRole="button"
            accessibilityLabel="Copy yesterday's entries"
          >
            <Ionicons name="copy-outline" size={16} color={colors.textPrimary} />
            <Text style={styles.btnText}>Copy yesterday</Text>
          </TouchableOpacity>
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
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: radius.md, minHeight: 44,
  },
  btnPrimary: { backgroundColor: colors.primary },
  btnSecondary: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  btnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  btnTextPrimary: { color: colors.background, fontWeight: fontWeight.bold },
});
