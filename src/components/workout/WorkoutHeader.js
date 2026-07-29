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

export default function WorkoutHeader({
  elapsedStr,
  onCancel,
  onFinish,
  // Warm amber timer glyph while a shortened (time-crunch) session is active.
  timeCrunchActive = false,
  // Hidden when the bottom bar itself offers "Finish workout" as the advance
  // action (last exercise, target met) so the screen never shows two finish
  // affordances at once.
  showFinish = true,
}) {
  const t = useTheme();
  // Three-slot layout (founder device note, build 2705): the side slots
  // flex equally, so the elapsed block centres on the SCREEN, not between
  // two differently-sized buttons.
  return (
    <View style={[styles.row, { borderBottomColor: t.colors.borderSubtle }]}>
      <View style={styles.side}>
        <TouchableOpacity
          testID="volyume-workout-close"
          style={[styles.iconBtn, { backgroundColor: t.colors.surface2, borderColor: t.colors.border }]}
          onPress={onCancel}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Cancel workout"
        >
          <Ionicons name="close" size={iconSize.md} color={t.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.elapsedWrap} accessible accessibilityLabel={`Elapsed ${elapsedStr}${timeCrunchActive ? ', time crunch active' : ''}`}>
        <Text style={[styles.elapsedLabel, { ...t.type.overline, color: t.colors.textMuted }]}>
          Elapsed
        </Text>
        <View style={styles.elapsedValueRow}>
          <Text style={[styles.elapsedValue, { ...t.type.num('title'), color: t.colors.textPrimary }]}>
            {elapsedStr}
          </Text>
          {timeCrunchActive ? (
            <Ionicons name="timer" size={15} color={t.colors.warning} />
          ) : null}
        </View>
      </View>

      <View style={[styles.side, styles.sideRight]}>
        {showFinish ? (
          // Icon only, on the SAME chrome as the cancel X opposite it (founder
          // order 2026-07-27). It was a labelled pill -- a smaller glyph plus
          // the word "Finish" on a padded row -- so the two ends of one bar
          // were different shapes doing the same job.
          //
          // The visible word is gone, so accessibilityLabel is now the ONLY
          // name a screen-reader user gets. It must stay "Finish workout",
          // never shortened to "Finish": it names the action, and matches how
          // the same action is spoken everywhere else (R4/D64 same-string
          // rule). Pinned by loggerHeaderFinishIconOnly.guard.test.js.
          <TouchableOpacity
            testID="volyume-workout-finish"
            style={[styles.iconBtn, { backgroundColor: t.colors.surface2, borderColor: t.colors.border }]}
            onPress={onFinish}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Finish workout"
          >
            <Ionicons name="checkmark-done" size={iconSize.md} color={t.colors.textPrimary} />
          </TouchableOpacity>
        ) : null}
      </View>
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
  // Equal flexible sides keep the centre block screen-centred whatever
  // width each side's control has (or when Finish hides entirely).
  side: { flex: 1, alignItems: 'flex-start' },
  sideRight: { alignItems: 'flex-end' },
  elapsedWrap: { alignItems: 'center', gap: 2 },
  elapsedLabel: {},
  elapsedValueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  elapsedValue: { fontVariant: ['tabular-nums'] },
  // finishBtn/finishText removed with the label: Finish now shares `iconBtn`
  // with the cancel X so the two ends of the bar are one control, not two.
});
