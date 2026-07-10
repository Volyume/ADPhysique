import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, fontWeight, spacing, radius, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';

/**
 * "This week" strip (COMP-018), the first section of the Progress tab.
 * One row: sessions this week on the left, the run state on the right.
 *
 * No-shame by construction (the hard rules live in the pure streak module):
 * the word "streak" never appears (the unit is "weeks running"); there is no
 * red, no "don't break", no zero shown; recovery weeks read as the run
 * carrying on; and when the view-model is suppressed (open ED/wellbeing flag)
 * the run number is withheld and only the factual session count remains.
 *
 * Read-only v0: the tap-through to ConsistencyScreen's "Your weeks" section,
 * the pause control and the manual-goal editor are a later pass (they need a
 * synced pause/goal table and a copy review).
 */
export default function WeeklyStreakStrip({ vm }) {
  // CP-10 stage 3 (theming batch 2): live theme, same append-after pattern
  // as batch 1. `styles` stays frozen; `live` carries the colour-bearing
  // keys only. Called before the early-return below so hook order stays
  // stable across renders (vm can flip from null to populated).
  const t = useTheme();
  const live = {
    card: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    // type.num('h3') (theme.js) is { ...type.h3, fontVariant: ['tabular-nums'] }
    // bound to the frozen `type` singleton; the live equivalent spreads the
    // hook's own live t.type.h3 instead so fontSize follows Larger Text too.
    count: { ...t.type.h3, fontVariant: ['tabular-nums'], color: t.colors.textPrimary },
    countSub: { fontSize: t.fontSize.sm, color: t.colors.textMuted },
    run: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
  };

  if (!vm || !vm.render) return null;

  const { current, runLength, suppressed, hasTarget } = vm;
  const completed = current?.completed ?? 0;
  const target = current?.target ?? null;
  const isResting = current?.state === 'resting';

  // Left: factual session count. With a known target, "3 of 4 sessions this
  // week"; otherwise just the count.
  const left = hasTarget && Number.isFinite(target)
    ? `${completed} of ${target}`
    : `${completed}`;
  const leftSub = 'sessions this week';

  // Right: the run state. Withheld under suppression and in session-count mode.
  let right = null;
  if (!suppressed && hasTarget) {
    if (isResting) {
      right = 'Recovery week. Your run carries on.';
    } else if (Number.isFinite(runLength) && runLength >= 1) {
      right = `${runLength} ${runLength === 1 ? 'week' : 'weeks'} running`;
    }
  }

  const a11y = [
    `${left} ${leftSub}.`,
    right || '',
  ].filter(Boolean).join(' ');

  return (
    <View style={[styles.card, live.card]} accessible accessibilityLabel={a11y}>
      <View style={styles.left}>
        <Text maxFontSizeMultiplier={1.3} style={[styles.count, live.count]}>{left}</Text>
        <Text maxFontSizeMultiplier={1.3} style={[styles.countSub, live.countSub]}>{leftSub}</Text>
      </View>
      {right ? <Text maxFontSizeMultiplier={1.3} style={[styles.run, live.run]}>{right}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  left: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  count: { ...type.num('h3'), color: colors.textPrimary },
  countSub: { fontSize: fontSize.sm, color: colors.textMuted },
  run: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.semibold, flexShrink: 1, textAlign: 'right' },
});
