import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, type, fontWeight } from '../styles/theme';
import useTheme from '../hooks/useTheme';

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
  // CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
  // theme (src/hooks/useTheme.js). See buildLiveStyles' header comment
  // (defined further down this file, after the frozen `styles` block).
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <View style={[styles.row, style]}>
      <Text maxFontSizeMultiplier={1.3} style={[styles.text, live.text]}>{text}</Text>
      <TouchableOpacity
        onPress={onDismiss}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Got it, dismiss this hint"
      >
        <Text maxFontSizeMultiplier={1.3} style={[styles.dismiss, live.dismiss]}>Got it</Text>
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

// CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
// override for the frozen `styles` block above, same "frozen base + live
// override" pattern as WorkoutSummaryScreen.js's buildLiveStyles.
function buildLiveStyles(t) {
  return {
    text: { ...t.type.caption, color: t.colors.textMuted },
    dismiss: { ...t.type.caption, color: t.colors.primary },
  };
}
