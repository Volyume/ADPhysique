/**
 * ArchetypePicker: the training style cards a not-competing person chooses
 * from (founder ruling 2026-10-19). Each card is the style's name, a compact
 * muscle map filled from the rulebook's own tiers (strong for priority
 * muscles, light for maintenance), and one plain line about the training.
 * A muscle map, never a body to aim for: the cards show training emphasis
 * only. Two columns, one at large text sizes. Nothing is pre-selected; the
 * caller decides whether a choice is required.
 */
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Text from './Text';
import PressableCard from './PressableCard';
import BodyDiagramHeatmap from './BodyDiagramHeatmap';
import { spacing, radius, withAlpha } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import { ARCHETYPE_OPTIONS, archetypeEmphasis, archetypeEmphasisLabel } from '../lib/trainingArchetypes';

// The text size at which the cards stack to one column.
const ONE_COLUMN_FONT_SCALE = 1.3;

export default function ArchetypePicker({ value = null, onChange, error = null }) {
  const t = useTheme();
  const live = buildLiveStyles(t);
  const { fontScale } = useWindowDimensions();
  const oneColumn = (fontScale || 1) >= ONE_COLUMN_FONT_SCALE;

  return (
    <View style={styles.wrap} accessibilityRole="radiogroup">
      <View style={styles.grid}>
        {ARCHETYPE_OPTIONS.map((opt) => {
          const selected = value === opt.value;
          const emphasis = archetypeEmphasis(opt.value);
          const paint = Object.fromEntries(Object.entries(emphasis).map(([m, e]) => [m, {
            color: e === 'priority' ? t.colors.primary : withAlpha(t.colors.primary, 0.3),
          }]));
          return (
            <PressableCard
              key={opt.value}
              onPress={() => onChange && onChange(opt.value)}
              style={[styles.card, live.card, oneColumn ? styles.cardFull : styles.cardHalf, selected && [styles.cardSelected, live.cardSelected]]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${opt.label}. ${opt.description} ${archetypeEmphasisLabel(opt.value)}`}
              testID={`archetype-${opt.value}`}
            >
              <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                <BodyDiagramHeatmap compact volumeByMuscle={paint} />
                <Text style={[styles.name, live.name]}>{opt.label}</Text>
                <Text style={[styles.desc, live.desc]}>{opt.description}</Text>
              </View>
            </PressableCard>
          );
        })}
      </View>
      {error ? <Text style={[styles.error, live.error]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: { borderWidth: 1, borderRadius: radius.md, padding: spacing.sm, gap: spacing.xs },
  cardHalf: { width: '48%' },
  cardFull: { width: '100%' },
  cardSelected: { borderWidth: 2 },
  name: { marginTop: spacing.xs },
  desc: {},
  error: {},
});

function buildLiveStyles(t) {
  return {
    card: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    cardSelected: { borderColor: t.colors.primary, backgroundColor: withAlpha(t.colors.primary, 0.08) },
    name: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    desc: { ...t.type.caption, color: t.colors.textSecondary },
    error: { ...t.type.caption, color: t.colors.error },
  };
}
