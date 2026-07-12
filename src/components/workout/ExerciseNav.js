/**
 * ExerciseNav (R3 logger rebuild, founder order 2026-07-12)
 *
 * The exercise switcher: one pill per exercise, current one selected, with a
 * thin done/total progress underline inside each pill (D43 blueprint section
 * 3.2) so session state is glanceable without reading badges. Renders
 * nothing for single-exercise sessions - same guarantee as the old strip.
 *
 * Pills are the house pill class: radius.full, surface/borderSubtle at
 * rest, primary tint when selected. Behaviour is the orchestrator's:
 * onSelect(index) is the only callback.
 *
 * items: [{ key, name, done, total, skipped }]
 */
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { spacing, radius, withAlpha } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import { workoutLoggerSize } from '../../styles/layout';

export default function ExerciseNav({ items, selectedIndex, onSelect }) {
  const t = useTheme();
  if (!items || items.length <= 1) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.strip, { borderBottomColor: t.colors.borderSubtle }]}
      contentContainerStyle={styles.stripContent}
      testID="volyume-exercise-nav"
    >
      {items.map((item, i) => {
        const selected = i === selectedIndex;
        const progress = item.total > 0 ? Math.min(1, item.done / item.total) : 0;
        return (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.pill,
              {
                backgroundColor: selected ? withAlpha(t.colors.primary, 0.16) : t.colors.surface,
                borderColor: selected ? t.colors.primary : t.colors.borderSubtle,
              },
              item.skipped && styles.pillSkipped,
            ]}
            onPress={() => onSelect(i)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${item.name}, ${item.done} of ${item.total} sets done${item.skipped ? ', skipped for time' : ''}`}
          >
            <Text
              numberOfLines={1}
              style={[styles.pillText, { ...t.type.label, color: selected ? t.colors.primary : t.colors.textSecondary }]}
            >
              {item.name}
            </Text>
            <View style={[styles.track, { backgroundColor: t.colors.borderSubtle }]}>
              <View
                style={[
                  styles.fill,
                  {
                    backgroundColor: selected ? t.colors.primary : t.colors.textMuted,
                    width: `${Math.round(progress * 100)}%`,
                  },
                ]}
              />
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexGrow: 0,
    borderBottomWidth: 1,
  },
  stripContent: {
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  pill: {
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    minHeight: workoutLoggerSize.primaryActionMinHeight,
    justifyContent: 'center',
    gap: spacing.xxs,
    maxWidth: 220,
  },
  pillSkipped: { opacity: 0.5 },
  pillText: {},
  track: {
    height: 2,
    borderRadius: radius.hair,
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  fill: {
    height: 2,
    borderRadius: radius.hair,
  },
});
