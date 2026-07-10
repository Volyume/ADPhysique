import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, fontWeight, spacing, radius, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import SvgBarSparkline from './SvgBarSparkline';

const DAY_ABBRS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
// variant of the frozen fatigueBarColor(level) this file used to define
// inline (module-scope, reading `colors.*` at call time), same "build"
// pattern as theme.js's buildVolumeStatusColor -- resolves off a passed-in
// colour table (t.colors) instead of the frozen module singleton. Returns a
// resolver function so it can be called as buildFatigueBarColor(t.colors)
// (level). No frozen twin kept: this helper was file-private and untested,
// so there is no unmigrated caller to preserve it for.
function buildFatigueBarColor(c) {
  return function fatigueBarColorLive(level) {
    if (level <= 1) return c.success;
    if (level <= 2) return c.success;
    if (level === 3) return c.warning;
    return c.error;
  };
}

function coachingLine(sessions) {
  if (!sessions || sessions.length < 2) return '';
  const last2 = sessions.slice(0, 2).map(s => s.fatigueLevel ?? s.fatigue_level ?? 0);
  const avg = (last2[0] + last2[1]) / 2;
  if (avg <= 1.5) return "You're fresh, so push your next session.";
  if (avg <= 2.5) return 'Fatigue is moderate, so train as normal.';
  if (avg <= 3.5) return 'Fatigue is building, so hold your weights and focus on form.';
  return 'Fatigue is high, so consider a lighter day.';
}

/**
 * Recent-session fatigue trend. Renders the last N sessions as a bar sparkline
 * with day-of-week labels and a one-line coaching read. Hides itself until at
 * least two sessions with feedback exist.
 */
export default function FatigueTrendCard({ sessions }) {
  // CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
  // theme (src/hooks/useTheme.js). See buildLiveStyles' header comment
  // (defined further down this file, after the frozen `styles` block).
  const t = useTheme();
  const live = buildLiveStyles(t);
  if (!sessions || sessions.length < 2) return null;

  const resolveFatigueBarColor = buildFatigueBarColor(t.colors);
  // Reverse so the oldest session is on the left and the newest on the right.
  const ordered = [...sessions].reverse();
  const data = ordered.map(session => {
    const level = session.fatigueLevel ?? session.fatigue_level ?? 1;
    return {
      value: level,
      label: session.startedAt ? DAY_ABBRS[new Date(session.startedAt).getDay()] : '',
      color: resolveFatigueBarColor(level),
    };
  });

  return (
    <View style={[styles.card, live.card]}>
      <Text maxFontSizeMultiplier={1.3} style={[styles.title, live.title]}>Training trend</Text>
      <View style={styles.chartWrap}>
        <SvgBarSparkline
          data={data}
          maxValue={4}
          width={240}
          height={64}
          barWidth={22}
          barGap={8}
          alignRight
          accessibilityLabel={`Training fatigue trend, oldest to newest: ${data
            .map(d => `${d.label || 'session'} level ${d.value} of 4`)
            .join(', ')}`}
        />
      </View>
      <Text maxFontSizeMultiplier={1.3} style={[styles.coachLine, live.coachLine]}>{coachingLine(sessions)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  chartWrap: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  coachLine: {
    ...type.captionTight,
    color: colors.textMuted,
  },
});

// CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
// override for the frozen `styles` block above, same "frozen base + live
// override" pattern as WorkoutSummaryScreen.js's buildLiveStyles.
// chartWrap has no colour tokens.
function buildLiveStyles(t) {
  return {
    card: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    title: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
    coachLine: { ...t.type.captionTight, color: t.colors.textMuted },
  };
}
