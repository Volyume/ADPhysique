/**
 * WorkoutHeader (R3 logger rebuild, founder order 2026-07-12)
 *
 * The logger's top chrome: close, elapsed time, finish. Composed from the
 * house tokens only - icon buttons on the surface2/border/radius.md control
 * chrome, the elapsed readout as an overline label over a tabular title
 * numeral, so the header reads as the same system as every other screen.
 *
 * Presentation only: both actions are owned by the orchestrator
 * (ActiveWorkoutScreen), which carries the cancel/finish behaviour contract
 * (docs/logger-rebuild-2026-07-12/BEHAVIOURAL-CONTRACT.md sections 1 and 6).
 */
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, iconSize } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import { workoutLoggerSize } from '../../styles/layout';

export default function WorkoutHeader({ elapsedStr, onCancel, onFinish }) {
  const t = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: t.colors.borderSubtle }]}>
      <TouchableOpacity
        testID="volyume-workout-close"
        style={[styles.iconBtn, { backgroundColor: t.colors.surface2, borderColor: t.colors.border }]}
        onPress={onCancel}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Close workout"
      >
        <Ionicons name="close" size={iconSize.md} color={t.colors.textPrimary} />
      </TouchableOpacity>

      <View style={styles.elapsedWrap} accessible accessibilityLabel={`Elapsed ${elapsedStr}`}>
        <Text maxFontSizeMultiplier={1.3} style={[styles.elapsedLabel, { ...t.type.overline, color: t.colors.textMuted }]}>
          Elapsed
        </Text>
        <Text maxFontSizeMultiplier={1.3} style={[styles.elapsedValue, { ...t.type.num('title'), color: t.colors.textPrimary }]}>
          {elapsedStr}
        </Text>
      </View>

      <TouchableOpacity
        testID="volyume-workout-finish"
        style={[styles.finishBtn, { backgroundColor: t.colors.surface2, borderColor: t.colors.border }]}
        onPress={onFinish}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Finish workout"
      >
        <Ionicons name="checkmark-done" size={iconSize.sm} color={t.colors.textPrimary} />
        <Text maxFontSizeMultiplier={1.3} style={[styles.finishText, { ...t.type.bodyStrong, color: t.colors.textPrimary }]}>
          Finish
        </Text>
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
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  iconBtn: {
    width: workoutLoggerSize.primaryActionMinHeight,
    height: workoutLoggerSize.primaryActionMinHeight,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  elapsedWrap: { alignItems: 'center', gap: 2 },
  elapsedLabel: {},
  elapsedValue: { fontVariant: ['tabular-nums'] },
  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: workoutLoggerSize.primaryActionMinHeight,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  finishText: {},
});
