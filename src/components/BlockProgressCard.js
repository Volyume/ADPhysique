import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import InfoTooltip from './InfoTooltip';
import PressableCard from './PressableCard';

/**
 * "This week's plan": planned vs actual weekly sets per muscle for the current
 * training block week. Used on the Consistency screen to show how the plan week
 * is tracking against the planned set count for each muscle in the active block.
 *
 * D214 (Consistency elevation, lane 4; plan
 * `docs/audit/progress-recovery-consistency-audit-2026-10-01/
 * 00-AUDIT-AND-PLAN.md` section 7.3 item 5, CS-7, CS-8, CS-9, CS-10):
 *   - the header names what the rows count and when: "Sets done so far this
 *     plan week", with "2 of 4 sessions done" beside it when a plan position
 *     exists, and an (i) saying a plan week starts on the day the block started
 *     (CS-8: this card counts the BLOCK week, the load and the grid count
 *     Monday weeks, and the screen never said so);
 *   - "5 of 12" in words, not "5/12";
 *   - the fill is ink (`textSecondary`) at every level: the yellow at 70 to 99%
 *     and the amber at 100% contradicted the heatmap one tap away (CS-10), and a
 *     plan row is a fact, never the thing to do;
 *   - the effort line ("This week's effort: 3 of 5") moved to the block card,
 *     where the week is, so "a recovery week" is named in one place only.
 *
 * Props:
 *   blockProgress     [{ muscle, label, actual, planned }]
 *   currentMesoWeek   { awaitingDecision } | null: a finished block says so
 *   planWeek          { done, required } | null: the plan week's completed and
 *                      required sessions (planWeek.js's own summary); null with
 *                      no readable plan, and the clause is left out
 *   onPress           optional. When provided the card renders through the
 *                      shared PressableCard primitive (accessibilityRole
 *                      "button", a hint that it opens the volume-by-muscle
 *                      heatmap) instead of a plain View.
 */
export default function BlockProgressCard({ blockProgress, currentMesoWeek, planWeek = null, onPress }) {
  // CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
  // theme (src/hooks/useTheme.js). See buildLiveStyles' header comment
  // (defined further down this file, after the frozen `styles` block).
  const t = useTheme();
  const live = buildLiveStyles(t);
  if (!blockProgress || blockProgress.length === 0) return null;

  const finishedText = currentMesoWeek?.awaitingDecision ? 'Block finished' : null;
  const required = Number.isFinite(planWeek?.required) && planWeek.required > 0 ? planWeek.required : null;
  const sessionsText = required != null && Number.isFinite(planWeek?.done)
    ? `${planWeek.done} of ${required} ${required === 1 ? 'session' : 'sessions'} done`
    : null;
  const headerText = sessionsText
    ? `Sets done so far this plan week · ${sessionsText}`
    : 'Sets done so far this plan week';

  const cardContent = (
    <>
      <View style={styles.header}>
        <Text style={[styles.title, live.title]}>{headerText}</Text>
        {/* CS-8: the plan week is the BLOCK's, not Monday to Sunday. */}
        <InfoTooltip
          size={12}
          text={'A plan week starts on the day your block started and runs for seven days, so it can begin on any day of the week. These rows count the sets you have logged since that day, against the sets planned for each muscle this week.'}
        />
      </View>
      {finishedText ? <Text style={[styles.finished, live.finished]}>{finishedText}</Text> : null}
      {blockProgress.map(p => {
        const pct = p.planned > 0 ? Math.min(1, p.actual / p.planned) : 0;
        return (
          <View
            key={p.muscle}
            style={styles.row}
            accessibilityRole="text"
            accessibilityLabel={`${p.label}: ${p.actual} of ${p.planned} sets so far`}
          >
            <Text style={[styles.muscle, live.muscle]} numberOfLines={1}>{p.label}</Text>
            <View style={[styles.barBg, live.barBg]}>
              <View style={[styles.barFill, live.barFill, { width: `${Math.round(pct * 100)}%` }]} />
            </View>
            <Text style={[styles.sets, live.sets]}>{`${p.actual} of ${p.planned}`}</Text>
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
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  title: {
    ...type.label,
    flex: 1,
    color: colors.textPrimary,
  },
  finished: {
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
    height: spacing.xs2,
    borderRadius: radius.xs,
    backgroundColor: colors.surface2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: radius.xs,
    backgroundColor: colors.textSecondary,
  },
  sets: {
    width: 56,
    ...type.num('caption'),
    color: colors.textMuted,
    textAlign: 'right',
  },
});

// CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
// override for the frozen `styles` block above, same "frozen base + live
// override" pattern as WorkoutSummaryScreen.js's buildLiveStyles. header/row
// have no colour tokens of their own. The fill is ink at every level (D214,
// CS-10): no yellow, no amber.
function buildLiveStyles(t) {
  return {
    card: { backgroundColor: t.colors.surface, borderColor: t.colors.borderSubtle },
    title: { ...t.type.label, color: t.colors.textPrimary },
    finished: { ...t.type.caption, color: t.colors.textMuted },
    muscle: { ...t.type.captionStrong, color: t.colors.textSecondary },
    barBg: { backgroundColor: t.colors.surface2 },
    barFill: { backgroundColor: t.colors.textSecondary },
    sets: { ...t.type.num('caption'), color: t.colors.textMuted },
  };
}
