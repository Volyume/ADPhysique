/**
 * ReasonPicker, COMP-025-A shared reason rows
 *
 * Presentational, controlled list of the single-select churn reasons + the
 * conditional free-text field. Used by both the pre-store-handoff sheet
 * (CancelReasonSheet) and the post-lapse sheet (PostLapseSheet) so the rows,
 * radios and free-text behaviour stay identical.
 *
 * Controlled via props: the parent owns `reason` + `text` and the change
 * handlers, so it can wire capture + button-enable state however it needs.
 */

import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { colors, spacing, fontSize, fontWeight, radius, circle } from '../styles/theme';
import { selection as hapticSelection } from '../lib/haptics';
import { CANCEL_REASONS, FREE_TEXT_REASONS, FREE_TEXT_PROMPT } from '../lib/cancelReason';

export default function ReasonPicker({ reason, text, onSelectReason, onChangeText }) {
  const showFreeText = reason != null && FREE_TEXT_REASONS.has(reason);

  function select(key) {
    onSelectReason?.(key);
    try { hapticSelection(); } catch (_) {}
  }

  return (
    <>
      <View style={styles.rows}>
        {CANCEL_REASONS.map((r) => {
          const selected = reason === r.key;
          return (
            <Pressable
              key={r.key}
              onPress={() => select(r.key)}
              style={({ pressed }) => [
                styles.row,
                selected && styles.rowSelected,
                pressed && { opacity: 0.7 },
              ]}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={r.label}
            >
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected ? <View style={styles.radioDot} /> : null}
              </View>
              <Text style={[styles.rowText, selected && styles.rowTextSelected]}>
                {r.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {showFreeText ? (
        <TextInput
          style={styles.input}
          placeholder={FREE_TEXT_PROMPT[reason]}
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={onChangeText}
          maxLength={120}
          multiline
          accessibilityLabel={FREE_TEXT_PROMPT[reason]}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  rows: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowSelected: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primary,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: circle(20),
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: circle(10),
    backgroundColor: colors.primary,
  },
  rowText: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  rowTextSelected: {
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
  },
  input: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    minHeight: 56,
    textAlignVertical: 'top',
  },
});
