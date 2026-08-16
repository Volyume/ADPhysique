/**
 * WorkoutOutline (logger phase 2B, physical-device corrective redesign)
 *
 * The compact workout navigator: the whole session as a quiet vertical
 * outline directly under the header, replacing the phase-2 card-per-exercise
 * list whose completed/upcoming cards buried the rest of the workout beneath
 * the active logger on a real device (founder screenshots, failures 4/5/6).
 *
 * Design laws carried from the founder's device verdict:
 *   - completed = QUIET: a muted check, secondary-ink name, "4/4". No green
 *     progress bar, no card, no celebration panel.
 *   - current = OBVIOUS but restrained: one amber marker + strong name on a
 *     faint tint. The screen's single other amber is the Log set CTA.
 *   - upcoming = plainly TAPPABLE (primary ink, never disabled-looking):
 *     gym reality is jumping around occupied equipment.
 *   - skipped-for-time = dimmed but still tappable (unchanged law).
 *   - tap = JUMP ONLY; long-press = the ONE reorder path (the existing
 *     block-aware reorder sheet). JUMPING != REORDERING != SKIPPING.
 *   - supersets read from a small link glyph on each member row - no
 *     standalone pill/card.
 *
 * The outline is height-capped so a long session can never push the active
 * workspace off screen: beyond MAX_VISIBLE_ROWS it scrolls internally and
 * keeps the current exercise in view (one neighbour of context above). It
 * renders nothing for single-exercise sessions, the same guarantee the old
 * ExerciseNav strip and the phase-2 list both gave.
 *
 * Row height sits on the loggedSetMinHeight exception precedent (36dp visual
 * rows in an adjacent list, hitSlop-compensated) - the outline trades a
 * little target height for the founder's density law; names remain
 * full-width targets.
 */
import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { spacing } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import { workoutLoggerSize } from '../../styles/layout';

const ROW_HEIGHT = workoutLoggerSize.loggedSetMinHeight; // 36, the documented compact-row exception
const MAX_VISIBLE_ROWS = 6.5; // the half row is the "more below" cue

export default function WorkoutOutline({
  // [{ key, name, done, total, skipped, groupLabel }]
  items = [],
  currentIndex = 0,
  onSelect,
  onReorder,
}) {
  const t = useTheme();
  const scrollRef = useRef(null);

  // Keep the current exercise visible inside the capped outline, with one
  // row of context above it. Plain offset maths on fixed-height rows - a
  // navigator positioning itself, not an input-chasing scroll hack.
  useEffect(() => {
    if (items.length * ROW_HEIGHT <= MAX_VISIBLE_ROWS * ROW_HEIGHT) return;
    scrollRef.current?.scrollTo({
      y: Math.max(0, (currentIndex - 1) * ROW_HEIGHT),
      animated: false,
    });
  }, [currentIndex, items.length]);

  if (items.length <= 1) return null;

  return (
    <View style={[styles.wrap, { borderBottomColor: t.colors.borderSubtle }]}>
      <ScrollView
        ref={scrollRef}
        style={{ maxHeight: Math.round(MAX_VISIBLE_ROWS * ROW_HEIGHT) }}
        showsVerticalScrollIndicator={false}
      >
        {items.map((item, i) => {
          const isCurrent = i === currentIndex;
          const complete = !item.skipped && item.total > 0 && item.done >= item.total;
          return (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.row,
                isCurrent && { backgroundColor: t.colors.primaryBg },
                item.skipped && styles.rowSkipped,
              ]}
              onPress={() => onSelect?.(i)}
              onLongPress={onReorder}
              delayLongPress={300}
              hitSlop={{ top: 2, bottom: 2, left: 0, right: 0 }}
              accessibilityRole="button"
              accessibilityState={{ selected: isCurrent }}
              accessibilityLabel={`${item.name}, ${item.done} of ${item.total} sets done${complete ? ', complete' : ''}${isCurrent ? ', current exercise' : ''}${item.skipped ? ', skipped for time' : ''}${item.groupLabel ? `, ${item.groupLabel.toLowerCase()}` : ''}`}
              accessibilityHint={onReorder
                ? 'Switches to this exercise. Hold to reorder the workout.'
                : 'Switches to this exercise.'}
            >
              <View style={styles.marker}>
                {complete ? (
                  <Ionicons name="checkmark" size={14} color={t.colors.success} />
                ) : isCurrent ? (
                  <View style={[styles.currentDot, { backgroundColor: t.colors.primary }]} />
                ) : (
                  <View style={[styles.upcomingDot, { borderColor: t.colors.textMuted }]} />
                )}
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.name,
                  isCurrent
                    ? { ...t.type.bodyStrong, color: t.colors.textPrimary }
                    : complete
                      ? { ...t.type.bodySm, color: t.colors.textSecondary }
                      : { ...t.type.bodySm, color: t.colors.textPrimary },
                ]}
              >
                {item.name}
              </Text>
              {item.groupLabel ? (
                <Ionicons name="link" size={12} color={t.colors.textMuted} />
              ) : null}
              <Text style={[styles.count, { ...t.type.num('caption'), color: t.colors.textMuted }]}>
                {item.skipped ? '–' : `${item.done}/${item.total}`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // One hairline under the whole outline separates navigator from workspace.
  // Deliberately NO card, NO per-row borders, NO progress bars: the outline
  // is a list of lines, not a stack of containers.
  wrap: { borderBottomWidth: 1 },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  rowSkipped: { opacity: 0.5 },
  marker: { width: 16, alignItems: 'center' },
  currentDot: { width: 8, height: 8, borderRadius: 4 },
  upcomingDot: { width: 7, height: 7, borderRadius: 4, borderWidth: 1.5 },
  name: { flex: 1, minWidth: 0 },
  count: { minWidth: 30, textAlign: 'right' },
});
