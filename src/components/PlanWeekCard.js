/**
 * PlanWeekCard — "Your plan week", the first object on the Progress root and
 * on Consistency (register D214 addendum 1, Q5 = A; plan
 * `docs/audit/progress-recovery-consistency-audit-2026-10-01/00-AUDIT-AND-PLAN.md`
 * sections 7.1 item 2 and 7.3 item 2).
 *
 * One card, rendered from ONE view-model (`buildPlanWeekSummary`,
 * `src/lib/progress/planWeek.js`), so the two screens print the same count,
 * the same next session and the same seven cells:
 *
 *   2 of 4  sessions
 *   in week 2 of your plan · Upper A is next
 *   ● ○ ● ◎ ○ ○ ○
 *   M T W T F S S
 *
 * The count is the PLAN week (completed over required for the week the
 * programme is on), named as such so it is never read as Monday to Sunday;
 * the seven cells are the Monday-anchored calendar week, drawn through the
 * live Community `DayDots` in its ink tone (a trained day in `textSecondary`,
 * today ringed in `textPrimary`, no amber: a fact, never the thing to do),
 * with the weekday initials under them so the row reads as a week at a
 * glance. Without a plan the card reads "2 sessions this week" and keeps the
 * cells. No streak, no "days left", no instruction (D166, D204).
 *
 * Accessibility: the card is one group whose label is the view-model's own
 * sentence; the dots carry DayDots' spoken "Trained Mon, Wed" inside it.
 *
 * `children` (the lead's landing fix for lane 3, plan 7.1 item 2 "one
 * Card"): the Progress root renders this week's volume line and bar inside
 * the same card, under a hairline, so the week is one object as the mockup
 * draws it. The children sit OUTSIDE the accessible group (the group is the
 * inner summary view), so their own controls stay reachable by a screen
 * reader; Consistency passes no children and the card is unchanged there.
 *
 * Live theme (`useTheme`): the frozen block holds layout only.
 */
import { View, Text, StyleSheet } from 'react-native';
import Card from './Card';
import DayDots from './community/DayDots';
import { spacing } from '../styles/theme';
import useTheme from '../hooks/useTheme';

/**
 * @param {{ summary: import('../lib/progress/planWeek').PlanWeekSummary, testID?: string }} props
 */
export default function PlanWeekCard({ summary, testID = 'plan-week-card', children = null }) {
  const t = useTheme();
  if (!summary) return null;
  return (
    <Card testID={testID}>
      <View accessible accessibilityLabel={summary.accessibilityLabel} testID="plan-week-summary">
      <View style={styles.headline} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text style={[t.type.h2, { color: t.colors.textPrimary }]} testID="plan-week-number">
          {summary.headlineNumber}
        </Text>
        <Text style={[t.type.bodyStrong, { color: t.colors.textPrimary }]} testID="plan-week-words">
          {summary.headlineWords}
        </Text>
      </View>
      {summary.subline ? (
        <Text
          style={[t.type.bodySm, styles.subline, { color: t.colors.textSecondary }]}
          testID="plan-week-subline"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {summary.subline}
        </Text>
      ) : null}
      <View style={styles.cells}>
        <DayDots days={summary.trainedDays} todayKey={summary.todayKey} tone="ink" size="cell" initials />
      </View>
      </View>
      {children ? (
        <View style={[styles.under, { borderTopColor: t.colors.borderSubtle }]} testID="plan-week-under">
          {children}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  headline: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  subline: { marginTop: spacing.xxs },
  cells: { marginTop: spacing.md },
  under: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1 },
});
