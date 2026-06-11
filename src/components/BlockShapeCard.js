import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, fontWeight, spacing, type, withAlpha } from '../styles/theme';

/**
 * BlockShapeCard (COMP-010) — the shape of the training block as a row of
 * week dots with a jargon-free effort arc: Ease in -> Build -> Build ->
 * Push -> Recover. Makes periodisation visible and turns the recovery week
 * into a destination ("recovery week in N"), not a dip.
 *
 * Pure render. The effort phase per week is derived structurally (first week
 * eases in, last is recovery, the one before it is the peak/push, the rest
 * build), so it matches both the 5-week and 6-week schedules without an
 * engine dependency. No RIR, no numbers on the dots; effort is the one word.
 *
 * Copy is house voice (no em dashes); the five effort words are
 * founder-approved in principle (Push chosen over Peak per the blueprint).
 */
const PHASE_WORD = (i, n) => {
  if (i === 0) return 'Ease in';
  if (i === n - 1) return 'Recover';
  if (i === n - 2) return 'Push';
  return 'Build';
};

export default function BlockShapeCard({ weekIndex, plannedWeeks, isDeload = false, compact = false }) {
  const n = Number.isFinite(plannedWeeks) && plannedWeeks >= 2 ? Math.round(plannedWeeks) : null;
  if (!n) return null;

  // Current dot: the deload always lands on the recovery (last) dot.
  const current = isDeload ? n - 1 : Math.min(Math.max((weekIndex || 1) - 1, 0), n - 1);
  const word = PHASE_WORD(current, n);
  const weeksToRecovery = (n - 1) - current; // dots from here to the recovery dot

  let line;
  if (isDeload || current === n - 1) {
    line = 'Recovery week. Lighter on purpose. This is where the work pays off, and you lose nothing by easing back.';
  } else if (current === n - 2) {
    line = `Week ${current + 1} of ${n} · Push. Your hardest week of the block. Recovery week next.`;
  } else {
    line = `Week ${current + 1} of ${n} · ${word}. Recovery week in ${weeksToRecovery}.`;
  }

  return (
    <View style={[styles.card, compact && styles.cardCompact]} accessible accessibilityLabel={line}>
      <View style={styles.dotsRow}>
        {Array.from({ length: n }).map((_, i) => {
          const isRecovery = i === n - 1;
          const isCurrent = i === current;
          const isPast = i < current;
          return (
            <View key={i} style={styles.dotCol}>
              <View
                style={[
                  styles.dot,
                  isRecovery && styles.dotRecovery,
                  isPast && styles.dotPast,
                  !isPast && !isCurrent && !isRecovery && styles.dotFuture,
                  isCurrent && styles.dotCurrent,
                ]}
              />
              {!compact && (
                <Text style={[styles.dotLabel, isCurrent && styles.dotLabelCurrent]} numberOfLines={1}>
                  {PHASE_WORD(i, n)}
                </Text>
              )}
            </View>
          );
        })}
      </View>
      <Text style={styles.line}>{line}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  cardCompact: { gap: spacing.sm },
  dotsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  dotCol: { flex: 1, alignItems: 'center', gap: spacing.xs },
  dot: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: colors.surface3, borderWidth: 1, borderColor: colors.border,
  },
  // Past weeks: quietly done. Future: outlined. Current: filled amber with a
  // ring. Recovery: a soft restful tint, a destination not a dip.
  dotPast: { backgroundColor: colors.textMuted, borderColor: colors.textMuted },
  dotFuture: { backgroundColor: 'transparent', borderColor: colors.border },
  dotCurrent: {
    backgroundColor: colors.primary, borderColor: colors.primary,
    width: 16, height: 16, borderRadius: 8,
  },
  dotRecovery: { backgroundColor: withAlpha(colors.primary, 0.22), borderColor: withAlpha(colors.primary, 0.45) },
  dotLabel: { fontSize: fontSize.micro, color: colors.textMuted },
  dotLabelCurrent: { color: colors.primary, fontWeight: fontWeight.semibold },
  line: { ...type.body, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 19 },
});
