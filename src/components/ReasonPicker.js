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

import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, fontSize, fontWeight, radius, circle } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import { selection as hapticSelection } from '../lib/haptics';
import { CANCEL_REASONS, FREE_TEXT_REASONS, FREE_TEXT_PROMPT } from '../lib/cancelReason';
import TextField from './TextField';

export default function ReasonPicker({ reason, text, onSelectReason, onChangeText }) {
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
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
                live.row,
                selected && [styles.rowSelected, live.rowSelected],
                pressed && { opacity: 0.7 },
              ]}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={r.label}
            >
              <View style={[styles.radio, live.radio, selected && [styles.radioSelected, live.radioSelected]]}>
                {selected ? <View style={[styles.radioDot, live.radioDot]} /> : null}
              </View>
              <Text maxFontSizeMultiplier={1.3} style={[styles.rowText, live.rowText, selected && [styles.rowTextSelected, live.rowTextSelected]]}>
                {r.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {showFreeText ? (
        <TextField
          placeholder={FREE_TEXT_PROMPT[reason]}
          placeholderTextColor={t.colors.textMuted}
          value={text}
          onChangeText={onChangeText}
          maxLength={120}
          multiline
          accessibilityLabel={FREE_TEXT_PROMPT[reason]}
          containerStyle={styles.inputContainer}
          fieldStyle={styles.inputField}
          inputStyle={styles.inputText}
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
    backgroundColor: colors.primaryFill,
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
  inputContainer: {
    gap: 0,
  },
  inputField: {
    minHeight: 56,
    alignItems: 'flex-start',
  },
  inputText: {
    fontSize: fontSize.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 56,
    textAlignVertical: 'top',
  },
});

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BottomSheet.js's buildLiveStyles. rows/inputContainer/inputField/inputText
// have no colour tokens.
function buildLiveStyles(t) {
  return {
    row: { backgroundColor: t.colors.surface2, borderColor: t.colors.border },
    rowSelected: { backgroundColor: t.colors.primaryBg, borderColor: t.colors.primary },
    radio: { borderColor: t.colors.textMuted },
    radioSelected: { borderColor: t.colors.primary },
    radioDot: { backgroundColor: t.colors.primaryFill },
    rowText: { color: t.colors.textSecondary },
    rowTextSelected: { color: t.colors.textPrimary },
  };
}
