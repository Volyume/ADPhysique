import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, fontWeight, spacing, radius, withAlpha, alpha, type, fontFamily } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import InfoTooltip from './InfoTooltip';
import PressableCard from './PressableCard';
import { GLOSSARY } from '../lib/coachGlossary';

/**
 * Planned vs actual weekly volume per muscle for the current training block.
 * Used on the Progress tab to show how the current week is tracking against
 * the planned set count for each muscle in the active mesocycle.
 *
 * Props:
 *   blockProgress     [{ muscle, label, actual, planned }]
 *   currentMesoWeek   { weekIndex, plannedWeeks, isDeload, rirTarget } | null
 *   onPress           optional. When provided the card renders through the
 *                      shared PressableCard primitive (accessibilityRole
 *                      "button", a hint that it opens the volume-by-muscle
 *                      heatmap) instead of a plain View. Used on
 *                      ConsistencyScreen, which sits directly under
 *                      BlockShapeCard's "Week N of M" statement -- this
 *                      card's own header therefore no longer restates the
 *                      week, only the effort/recovery state for it.
 */
export default function BlockProgressCard({ blockProgress, currentMesoWeek, onPress }) {
  // CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
  // theme (src/hooks/useTheme.js). See buildLiveStyles' header comment
  // (defined further down this file, after the frozen `styles` block).
  const t = useTheme();
  const live = buildLiveStyles(t);
  if (!blockProgress || blockProgress.length === 0) return null;

  // The header's right-hand text used to restate "Week N/M". The screen
  // that renders this card (ConsistencyScreen) already states "Week N of
  // M · <phase>" via BlockShapeCard directly above, so this only carries
  // whatever that statement does not: the effort level, or that it's a
  // recovery week, or that the block is finished.
  const weekText = currentMesoWeek?.awaitingDecision
    ? 'Block finished'
    : currentMesoWeek?.isDeload
      ? 'Recovery week'
      : currentMesoWeek?.rirTarget != null
        ? `Effort ${5 - currentMesoWeek.rirTarget}/5`
        : null;

  const cardContent = (
    <>
      <View style={styles.header}>
        <Text style={[styles.title, live.title]}>This week's plan</Text>
        {currentMesoWeek && weekText && (
          <View style={styles.weekGroup}>
            <Text style={[styles.week, live.week]}>{weekText}</Text>
            {/* O15: GLOSSARY.effort, same term already defined for the app's
                other effort chips (pattern: HomeBlockShapeSheet.js's GLOSSARY
                use beside the block-shape chip it explains). */}
            {!currentMesoWeek.isDeload && currentMesoWeek.rirTarget != null && (
              <InfoTooltip text={GLOSSARY.effort} size={12} />
            )}
          </View>
        )}
      </View>
      {blockProgress.map(p => {
        const pct = p.planned > 0 ? Math.min(1, p.actual / p.planned) : 0;
        const fillColor =
          pct >= 1 ? t.colors.primary
          : pct >= 0.7 ? t.colors.warning
          : withAlpha(t.colors.primary, alpha.edge);
        return (
          <View
            key={p.muscle}
            style={styles.row}
            accessibilityRole="text"
            accessibilityLabel={`${p.label}: ${p.actual} of ${p.planned} sets`}
          >
            <Text style={[styles.muscle, live.muscle]} numberOfLines={1}>{p.label}</Text>
            <View style={[styles.barBg, live.barBg]}>
              <View style={[styles.barFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: fillColor }]} />
            </View>
            <Text style={[styles.sets, live.sets]}>{p.actual}/{p.planned}</Text>
          </View>
        );
      })}
    </>
  );

  if (onPress) {
    return (
      <PressableCard
        style={[styles.card, live.card]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityHint="Opens weekly volume by muscle"
      >
        {cardContent}
      </PressableCard>
    );
  }

  return (
    <View style={[styles.card, live.card]}>
      {cardContent}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  weekGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  week: {
    ...type.caption,
    color: colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  muscle: {
    width: 88,
    ...type.captionStrong,
    color: colors.textSecondary,
  },
  barBg: {
    flex: 1,
    height: 6,
    borderRadius: radius.xs,
    backgroundColor: colors.surface2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: radius.xs,
  },
  sets: {
    width: 44,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
});

// CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
// override for the frozen `styles` block above, same "frozen base + live
// override" pattern as WorkoutSummaryScreen.js's buildLiveStyles. header/row/
// barFill have no colour tokens of their own (barFill's backgroundColor is
// already resolved live via fillColor above).
function buildLiveStyles(t) {
  return {
    card: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    title: { fontSize: t.fontSize.sm, color: t.colors.textPrimary },
    week: { ...t.type.caption, color: t.colors.textMuted },
    muscle: { ...t.type.captionStrong, color: t.colors.textSecondary },
    barBg: { backgroundColor: t.colors.surface2 },
    sets: { fontSize: t.fontSize.xs, color: t.colors.textMuted },
  };
}
