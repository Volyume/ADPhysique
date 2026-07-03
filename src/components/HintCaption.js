import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, type, fontWeight } from '../styles/theme';

/**
 * A quiet, one-time caption for a long-press gesture that otherwise has no
 * visible affordance (Wave A C7, 2026-07-03). Callers own the AsyncStorage
 * "seen" flag and decide when to stop rendering this (typically: the moment
 * the user performs the gesture it's teaching, or the "Got it" tap here).
 *
 * Deliberately plain: no icon, no background, no border, a single caption
 * line so it reads as a passing tip, not another card competing for
 * attention.
 */
export default function HintCaption({ text, onDismiss, style }) {
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.text}>{text}</Text>
      <TouchableOpacity
        onPress={onDismiss}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Got it, dismiss this hint"
      >
        <Text style={styles.dismiss}>Got it</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxs,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  text: { ...type.caption, color: colors.textMuted, flex: 1 },
  dismiss: { ...type.caption, color: colors.primary, fontWeight: fontWeight.semibold },
});
