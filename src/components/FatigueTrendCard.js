import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, fontWeight, spacing, radius, type } from '../styles/theme';
import SvgBarSparkline from './SvgBarSparkline';

const DAY_ABBRS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function fatigueBarColor(level) {
  if (level <= 1) return colors.success;
  if (level <= 2) return colors.success;
  if (level === 3) return colors.warning;
  return colors.error;
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
  if (!sessions || sessions.length < 2) return null;

  // Reverse so the oldest session is on the left and the newest on the right.
  const ordered = [...sessions].reverse();
  const data = ordered.map(session => {
    const level = session.fatigueLevel ?? session.fatigue_level ?? 1;
    return {
      value: level,
      label: session.startedAt ? DAY_ABBRS[new Date(session.startedAt).getDay()] : '',
      color: fatigueBarColor(level),
    };
  });

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Training trend</Text>
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
      <Text style={styles.coachLine}>{coachingLine(sessions)}</Text>
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
