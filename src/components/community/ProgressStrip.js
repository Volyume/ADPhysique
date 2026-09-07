/**
 * ProgressStrip (design ruling
 * `docs/community-product-audit-2026-09-07/60-DESIGN-PROGRESS-COMMUNITY.md`
 * section 4, D4; presentation `52-research-community-presentation.md`
 * Part C D4)
 *
 * One horizontal strip under the caller's own profile header: sessions
 * this week, current streak, weeks consistent in the last 12, plus the
 * 8-week mini bar row underneath. No card wrapper (V19: no `h1`/`h2`,
 * `label`-weight numbers), tappable to open the Following board.
 *
 * The mini bars read `counters.c_weeks_history` (lead ruling: added to
 * the counter set alongside the other seven, computed in
 * `computeConsistency`, sent under the same `share_consistency` consent).
 * Tokens only -- no axis, no legend. Bar height is proportional to the
 * MAX of the eight values, so the tallest bar is always full height; a
 * zero week draws as a hairline rather than nothing, so eight weeks of
 * silence still reads as eight bars, not an empty strip.
 */

import { View, Text, StyleSheet, Pressable } from 'react-native';
import useTheme from '../../hooks/useTheme';
import { spacing, type, colors } from '../../styles/theme';

const BAR_MAX_HEIGHT = 24;
const BAR_MIN_HEIGHT = StyleSheet.hairlineWidth;

function Cell({ t, value, label, isLast }) {
  return (
    <View style={[styles.cell, !isLast && { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: t.colors.borderSubtle }]}>
      <Text style={[styles.value, t.type.num('label'), { color: t.colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.label, { ...t.type.caption, color: t.colors.textMuted }]}>{label}</Text>
    </View>
  );
}

function WeeksHistoryBars({ t, history }) {
  if (!Array.isArray(history) || history.length === 0) return null;
  const values = history.map((v) => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0));
  const max = Math.max(0, ...values);
  return (
    <View
      style={styles.barsRow}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {values.map((v, i) => {
        const height = max > 0 ? Math.max(BAR_MIN_HEIGHT, Math.round((v / max) * BAR_MAX_HEIGHT)) : BAR_MIN_HEIGHT;
        return (
          // eslint-disable-next-line react/no-array-index-key -- fixed-length, order-stable history, no id of its own
          <View key={i} style={styles.barCol}>
            <View style={[styles.bar, { height, backgroundColor: v > 0 ? t.colors.primary : t.colors.borderSubtle }]} />
          </View>
        );
      })}
    </View>
  );
}

export default function ProgressStrip({ counters, onPress }) {
  const t = useTheme();
  if (!counters) return null;
  const sessions = Number(counters.c_sessions_week) || 0;
  const streak = Number(counters.c_weeks_streak) || 0;
  const consistent = Number(counters.c_consistent_weeks_12w) || 0;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.strip, { backgroundColor: t.colors.surface2 }]}
      accessibilityRole="button"
      accessibilityLabel={`${sessions} sessions this week, ${streak} week streak, ${consistent} consistent weeks in the last 12. See boards`}
    >
      <View style={styles.cellsRow}>
        <Cell t={t} value={sessions} label={sessions === 1 ? 'session this week' : 'sessions this week'} />
        <Cell t={t} value={streak} label={streak === 1 ? 'week streak' : 'weeks streak'} />
        <Cell t={t} value={consistent} label="consistent (12w)" isLast />
      </View>
      <WeeksHistoryBars t={t} history={counters.c_weeks_history} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  strip: {
    borderRadius: 12,
  },
  cellsRow: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: spacing.sm },
  value: { color: colors.textPrimary },
  label: { ...type.caption, color: colors.textMuted, textAlign: 'center' },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: spacing.xs,
    height: BAR_MAX_HEIGHT,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  barCol: { alignItems: 'center', justifyContent: 'flex-end', width: 10 },
  bar: { width: 6, borderRadius: 3 },
});
