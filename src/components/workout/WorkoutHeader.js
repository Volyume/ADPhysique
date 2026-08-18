/**
 * WorkoutHeader (R3 logger rebuild, founder order 2026-07-12)
 *
 * The logger's top chrome: close, elapsed time, finish.
 *
 * REDESIGNED 2026-08-18 (founder device order: "they look completely out of
 * place"). The two actions were 44dp bordered rounded squares filled with
 * surface2 - generic control chrome that read as heavy grey boxes against
 * the logger's near-black workspace, and matched nothing else on the screen
 * now that the outline strip, the rest bar and the Log set button all speak
 * one calm dark language with amber reserved for action.
 *
 * SECOND PASS, same day, after the founder saw the first one: "they are
 * absolutely the same look and style". A disc instead of a rounded square,
 * still filled grey, still reads as the same box. The seat itself was the
 * problem, so the seat is GONE. Both actions are now chromeless glyphs -
 * exactly the treatment the founder already approved for the "..." overflow
 * on this same screen ("the rounded-square container came OFF ... it made
 * the top-right action look almost as important as the exercise name",
 * 2026-08-17). Nothing is drawn at rest but the icon itself.
 *
 * The two keep IDENTICAL geometry (founder order 2026-07-27: the ends of
 * one bar are one control system, not two shapes doing the same job) - only
 * INK separates them, which is the grammar the rest of the logger already
 * uses: muted for "leave", brand amber for "this is the action". A full
 * 44dp target each, so nothing is harder to hit than before.
 *
 * Presentation only: both actions are owned by the orchestrator
 * (ActiveWorkoutScreen), which carries the cancel/finish behaviour contract
 * (docs/logger-rebuild-2026-07-12/BEHAVIOURAL-CONTRACT.md sections 1 and 6).
 */
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, iconSize } from '../../styles/theme';
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
          style={styles.iconBtn}
          onPress={onCancel}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Cancel workout"
        >
          <Ionicons name="close" size={iconSize.md} color={t.colors.textMuted} />
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
            style={styles.iconBtn}
            onPress={onFinish}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Finish workout"
          >
            <Ionicons name="checkmark-done" size={iconSize.md} color={t.colors.primary} />
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
  // One geometry for both ends of the bar (2026-07-27 order). CHROMELESS
  // (2026-08-18 second pass): no fill, no border, no radius to speak of -
  // the full 44dp target is there for the thumb, and nothing is painted at
  // rest but the glyph. Same treatment as the "..." overflow on this screen.
  iconBtn: {
    width: workoutLoggerSize.headerActionTarget,
    height: workoutLoggerSize.headerActionTarget,
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
