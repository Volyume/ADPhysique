/**
 * WorkoutExerciseRow (logger redesign phase 2, founder-accepted architecture)
 *
 * One compact row per NON-CURRENT exercise in the vertical workout list that
 * replaced the horizontal ExerciseNav pill strip. The whole workout stays
 * visible and reachable on one vertical surface: completed exercises read as
 * a done summary, upcoming ones as a compact preview, and tapping any row
 * JUMPS focus to that exercise - jump only, never a skip, never a reorder,
 * never a programme mutation (permanent law: JUMPING != REORDERING !=
 * SKIPPING). Long-press opens the existing block-aware reorder sheet - the
 * ONE order-changing path (D43 S3), now one gesture closer.
 *
 * Colour invariant carried over from ExerciseNav (founder request
 * 2026-07-19): a complete exercise (every planned set logged, not skipped
 * for time) always reads GREEN - success overrides the amber/grey states so
 * "done" is glanceable whether or not the row is current. _timeCrunchSkipped
 * rows render dimmed but STAY tappable: the user may still jump onto a
 * time-crunch-dropped exercise deliberately.
 *
 * props: { name, done, total, skipped, groupLabel, onPress, onLongPress }
 * groupLabel: null | 'Superset' | 'Giant set' (the 2-vs-3+ naming the
 * heads-up modal and reorder sheet already use).
 */
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { spacing, radius } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import { workoutLoggerSize } from '../../styles/layout';

export default function WorkoutExerciseRow({
  name, done, total, skipped, groupLabel = null, onPress, onLongPress,
}) {
  const t = useTheme();
  const progress = total > 0 ? Math.min(1, done / total) : 0;
  // Complete = every planned set logged (and not skipped for time). Green
  // overrides everything so a finished exercise always reads done at a
  // glance - the same rule ExerciseNav pinned.
  const complete = !skipped && total > 0 && done >= total;
  const fillColor = complete ? t.colors.success : t.colors.textMuted;

  return (
    <TouchableOpacity
      style={[
        styles.row,
        { backgroundColor: t.colors.surface, borderColor: t.colors.borderSubtle },
        skipped && styles.rowSkipped,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${done} of ${total} sets done${complete ? ', complete' : ''}${skipped ? ', skipped for time' : ''}`}
      accessibilityHint={onLongPress
        ? 'Switches to this exercise. Hold to reorder the workout.'
        : 'Switches to this exercise.'}
    >
      <View style={styles.main}>
        <Text
          numberOfLines={1}
          style={[styles.name, { ...t.type.bodyStrong, color: complete ? t.colors.textSecondary : t.colors.textPrimary }]}
        >
          {name}
        </Text>
        {groupLabel ? (
          <View style={[styles.groupChip, { backgroundColor: t.colors.primaryBg }]}>
            <Ionicons name="link" size={11} color={t.colors.primary} />
            <Text style={[styles.groupChipText, { ...t.type.captionStrong, color: t.colors.primary }]}>{groupLabel}</Text>
          </View>
        ) : null}
        <View style={styles.metaSlot}>
          {complete ? (
            <Ionicons name="checkmark-circle" size={18} color={t.colors.success} />
          ) : (
            <Text style={[styles.meta, { ...t.type.num('caption'), color: t.colors.textMuted }]}>
              {skipped ? 'Shortened out' : `${done} of ${total}`}
            </Text>
          )}
        </View>
      </View>
      <View style={[styles.track, { backgroundColor: t.colors.borderSubtle }]}>
        <View style={[styles.fill, { backgroundColor: fillColor, width: `${Math.round(progress * 100)}%` }]} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: workoutLoggerSize.primaryActionMinHeight,
    justifyContent: 'center',
    gap: spacing.xxs,
    marginBottom: spacing.sm,
  },
  rowSkipped: { opacity: 0.5 },
  main: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flex: 1 },
  groupChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xxs,
    borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 2,
  },
  groupChipText: {},
  metaSlot: { alignItems: 'flex-end', minWidth: 44 },
  meta: {},
  track: {
    height: 2,
    borderRadius: radius.hair,
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  fill: { height: 2, borderRadius: radius.hair },
});
