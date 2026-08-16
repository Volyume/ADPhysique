/**
 * WorkoutOutline (logger phase 2B, physical-device corrective redesign;
 * density pass after the founder's S22 screenshots)
 *
 * The workout navigator, COLLAPSED BY DEFAULT to one 36dp strip. The first
 * 2B build kept the full exercise list permanently expanded under the
 * header; on a real S22 that fixed block consumed ~235dp before the
 * workspace began - the single biggest "does not fit" offender. The dense
 * loggers this correction studies spend ZERO permanent chrome on
 * navigation; ours spends one strip:
 *
 *   collapsed:  [v]  Exercise 2 of 8                         3/24 sets
 *   expanded:   the full quiet outline (tap = jump, collapses itself)
 *
 * Laws carried forward unchanged:
 *   - completed = QUIET (muted check + n/n; no bars, no cards);
 *   - current = one amber marker on a faint tint;
 *   - upcoming = plainly tappable; skipped-for-time dimmed but tappable;
 *   - tap = JUMP ONLY; long-press (strip or row) = the ONE reorder path;
 *   - supersets read from a small link glyph, never a pill;
 *   - height-capped, self-positioning when longer than the cap;
 *   - renders nothing for single-exercise sessions.
 *
 * The strip deliberately does NOT repeat the current exercise's name - the
 * workspace title below is the one place the name renders (the S22 shots
 * showed it twice within ~100dp).
 *
 * Row height sits on the loggedSetMinHeight exception precedent (36dp
 * visual rows in an adjacent list, hitSlop-compensated).
 */
import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { spacing } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import { workoutLoggerSize } from '../../styles/layout';
import { selection as hapticSelection } from '../../lib/haptics';

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
  // Collapsed by default; re-collapses whenever the exercise changes, so a
  // jump (from here or anywhere else) always returns the strip.
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { setExpanded(false); }, [currentIndex]);

  // Keep the current exercise visible inside the capped outline, with one
  // row of context above it. Plain offset maths on fixed-height rows - a
  // navigator positioning itself, not an input-chasing scroll hack.
  useEffect(() => {
    if (!expanded) return;
    if (items.length * ROW_HEIGHT <= MAX_VISIBLE_ROWS * ROW_HEIGHT) return;
    scrollRef.current?.scrollTo({
      y: Math.max(0, (currentIndex - 1) * ROW_HEIGHT),
      animated: false,
    });
  }, [currentIndex, items.length, expanded]);

  if (items.length <= 1) return null;

  const doneSets = items.reduce((a, it) => a + (it.done || 0), 0);
  const totalSets = items.reduce((a, it) => a + (it.total || 0), 0);

  return (
    <View style={[styles.wrap, { borderBottomColor: t.colors.borderSubtle }]}>
      <TouchableOpacity
        style={styles.strip}
        onPress={() => { hapticSelection(); setExpanded(v => !v); }}
        onLongPress={onReorder}
        delayLongPress={300}
        hitSlop={{ top: 4, bottom: 4, left: 0, right: 0 }}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`Workout outline, exercise ${currentIndex + 1} of ${items.length}, ${doneSets} of ${totalSets} sets done`}
        accessibilityHint={onReorder
          ? 'Shows every exercise in this workout. Hold to reorder.'
          : 'Shows every exercise in this workout.'}
      >
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={t.colors.textSecondary} />
        <Text style={[styles.stripText, { ...t.type.caption, color: t.colors.textSecondary }]} numberOfLines={1}>
          {`Exercise ${currentIndex + 1} of ${items.length}`}
        </Text>
        <Text style={[styles.count, { ...t.type.num('caption'), color: t.colors.textMuted }]}>
          {`${doneSets}/${totalSets} sets`}
        </Text>
      </TouchableOpacity>
      {expanded ? (
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
                onPress={() => { onSelect?.(i); setExpanded(false); }}
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
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // One hairline under the whole outline separates navigator from workspace.
  // Deliberately NO card, NO per-row borders, NO progress bars: the outline
  // is a list of lines, not a stack of containers.
  wrap: { borderBottomWidth: 1 },
  strip: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  stripText: { flex: 1, minWidth: 0 },
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
