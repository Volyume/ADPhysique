/**
 * WorkoutBottomBar (R3 logger rebuild, founder order 2026-07-12)
 *
 * The stable-identity action bar (D43 blueprint section 3.7): the primary is
 * ALWAYS the logging action while an exercise is active - its label may read
 * "Log set" / "Log warm-up" / "Log other side" / "Start cluster", but it
 * never swaps identity in the same pixels. When the set target is met, a
 * visually distinct advance action ("Next exercise" / "Finish workout")
 * appears BESIDE it, never replacing it, so muscle memory can never
 * navigate when it meant to log.
 *
 * testIDs are part of the behavioural contract (Maestro backgrounding flow
 * + nextExerciseButton guard): volyume-btn-complete-set on the primary,
 * volyume-btn-next-exercise / volyume-btn-finish-primary on the advance.
 *
 * Inset contract (BEHAVIOURAL-CONTRACT.md section 9): bottom padding is
 * Math.max(spacing.md, safeBottom + spacing.sm), where safeBottom floors the
 * Android inset at 48 so the bar never sits under the navigation buttons -
 * the orchestrator passes safeBottom down.
 */
import { View, StyleSheet } from 'react-native';
import Button from '../Button';
import { spacing } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';

export default function WorkoutBottomBar({
  primaryLabel,
  onPrimary,
  saving = false,
  // null, or { label, onPress, testID } - rendered BESIDE the primary.
  advance = null,
  safeBottom = 0,
}) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: t.colors.background,
          borderTopColor: t.colors.borderSubtle,
          paddingBottom: Math.max(spacing.md, safeBottom + spacing.sm),
        },
      ]}
    >
      {advance ? (
        <View style={styles.advanceSlot}>
          <Button
            title={advance.label}
            onPress={advance.onPress}
            variant="secondary"
            size="lg"
            testID={advance.testID}
            accessibilityLabel={advance.label}
          />
        </View>
      ) : null}
      <View style={styles.primarySlot}>
        <Button
          title={primaryLabel}
          onPress={onPrimary}
          variant="primary"
          size="lg"
          loading={saving}
          testID="volyume-btn-complete-set"
          accessibilityLabel={primaryLabel}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  // The logging action keeps the larger share when the advance appears so
  // the primary never shrinks into a mis-tap.
  primarySlot: { flex: 3 },
  advanceSlot: { flex: 2 },
});
