import { View, Text, StyleSheet } from 'react-native';
import { spacing, radius } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import SvgBarSparkline from './SvgBarSparkline';
import { lastTwoSessionsLine } from '../lib/recovery/ratingWords';

const DAY_ABBRS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// T20 (comprehension-trust-audit-2026-08-06): fatigueLevel is rated 1-5
// (WorkoutSummaryScreen.js's RATING_LABELS.fatigueLevel: Fresh/Mild/
// Moderate/High/Exhausted), not 1-4. The sparkline's maxValue must match
// this scale or level-5 ("Exhausted") sessions render identically to
// level-4 ("High") ones.
const FATIGUE_SCALE_MAX = 5;

// D214 (Progress elevation, plan section 7.0 rule 3, "facts are ink"): the
// bars used to take a status colour per level (green, yellow, red), a
// verdict painted on a self-rating. They are one ink, `textSecondary`: the
// bar's height is the rating, the caption under the chart names the scale.

// The one-line read under the bars is `lastTwoSessionsLine`
// (lib/recovery/ratingWords.js: pure, so the D204 guard and the tests call it
// directly). D204 (founder rule 2026-09-26, "They don't choose sessions!"): the
// plan sets each session, so the line DESCRIBES what the athlete reported and
// never tells them to push, hold their weights or take a lighter day. D214
// addendum 9 (V5): it prints both ratings in the scale's own words.

/**
 * Recent-session fatigue trend. Renders the last N sessions as a bar sparkline
 * with day-of-week labels and a one-line read of what was rated. Hides itself
 * until at least two sessions with feedback exist. It lives on the Recovery
 * screen under the ratings (D214 Q3 = A); the Consistency screen still draws
 * it until its own lane removes it.
 */
export default function FatigueTrendCard({ sessions }) {
  // CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
  // theme (src/hooks/useTheme.js). See buildLiveStyles' header comment
  // (defined further down this file, after the frozen `styles` block).
  const t = useTheme();
  const live = buildLiveStyles(t);
  if (!sessions || sessions.length < 2) return null;

  // Reverse so the oldest session is on the left and the newest on the right.
  const ordered = [...sessions].reverse();
  const data = ordered.map(session => {
    const level = session.fatigueLevel ?? session.fatigue_level ?? 1;
    return {
      value: level,
      label: session.startedAt ? DAY_ABBRS[new Date(session.startedAt).getDay()] : '',
      color: t.colors.textSecondary,
    };
  });

  return (
    <View style={[styles.card, live.card]}>
      <Text style={live.title}>Fatigue trend</Text>
      <View style={styles.chartWrap}>
        <SvgBarSparkline
          data={data}
          maxValue={FATIGUE_SCALE_MAX}
          width={240}
          height={64}
          barWidth={22}
          barGap={8}
          alignRight
          accessibilityLabel={`Fatigue trend, oldest to newest: ${data
            .map(d => `${d.label || 'session'} level ${d.value} of ${FATIGUE_SCALE_MAX}`)
            .join(', ')}`}
        />
      </View>
      {/* Permanent scale caption, a plain caption and no "Got it" button
          (D214, CS-10: the dismiss had no handler, so it was a dead
          control). O23: the scale must stay visible, not exist only in the
          screen-reader label. */}
      <Text style={live.scaleCaption}>Self-rated fatigue after each session, 1 (fresh) to 5 (exhausted).</Text>
      <Text style={live.coachLine}>{lastTwoSessionsLine(sessions)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  chartWrap: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
});

// The frozen block holds layout only; every colour and type role is live
// (the frozen-plus-live pattern the tree carries).
function buildLiveStyles(t) {
  return {
    card: { backgroundColor: t.colors.surface, borderColor: t.colors.borderSubtle },
    title: { ...t.type.title, color: t.colors.textPrimary },
    scaleCaption: { ...t.type.bodySm, color: t.colors.textMuted },
    coachLine: { ...t.type.bodySm, color: t.colors.textSecondary },
  };
}
