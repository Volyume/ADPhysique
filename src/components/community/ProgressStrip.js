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
 *
 * migrate_172 (blueprint section 4, CR-05): a fourth cell, "N PRs in 4
 * weeks", renders only once `counters.c_prs_4w` is a real number -- absent
 * (undefined) until the migration is applied server-side, and null for a
 * profile owner who shares consistency but not what they did (the extra
 * gate this one counter alone carries: SD rulings, "a PR is a moment,
 * never a table" -- a count only, no exercise, no weight, no reps).
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
  // migrate_172: shown only for a genuine number -- `Number.isFinite` (not
  // a truthy/`|| 0` coercion like the three cells above) so a real 0 still
  // renders as a cell, and null/undefined (not yet applied, or the owner
  // does not share what they did) renders no fourth cell at all.
  const hasPrs = Number.isFinite(counters.c_prs_4w);
  const prs = hasPrs ? counters.c_prs_4w : 0;

  // F9 fix: rendered without onPress (another person's profile has no
  // per-person board to open -- see CommunityProfileScreen.js), this is
  // presentational only. Both the role and the label's call-to-action
  // must say so, never announce a tap that does nothing.
  const suffix = onPress ? ' See boards' : '';
  const prsClause = hasPrs ? `, ${prs} PRs in the last four weeks` : '';

  return (
    <Pressable
      onPress={onPress}
      style={[styles.strip, { backgroundColor: t.colors.surface2 }]}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${sessions} sessions this week, ${streak} week streak, ${consistent} consistent weeks in the last 12${prsClause}.${suffix}`}
    >
      <View style={styles.cellsRow}>
        <Cell t={t} value={sessions} label={sessions === 1 ? 'session this week' : 'sessions this week'} />
        <Cell t={t} value={streak} label={streak === 1 ? 'week streak' : 'weeks streak'} />
        <Cell t={t} value={consistent} label="consistent (12w)" isLast={!hasPrs} />
        {hasPrs ? (
          <Cell t={t} value={prs} label={prs === 1 ? 'PR (4w)' : 'PRs (4w)'} isLast />
        ) : null}
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
