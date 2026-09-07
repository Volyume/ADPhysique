/**
 * GymSummary (discovery blueprint
 * `docs/social-discovery-2026-09-06/70-DISCOVERY-BLUEPRINT.md` section 8;
 * SD-27, SD-31)
 *
 * The summary at the top of a gym page: how many lifters list it, how
 * many of them you follow, what they train, when they usually train, and
 * how many are open to training together.
 *
 * A gym page is a noticeboard, not a room (SD-27). Nothing here is live,
 * nothing is precise, and nothing says who is there now: the time line
 * reads "6 usually train evenings", which is a band about a group, never
 * an observation about a person (SD-31). The phrase itself is built
 * server-side so every surface says it the same way.
 *
 * Props:
 *   summary  the payload from `gymSummary(key)`
 *   label    fallback label when the summary has none yet
 */

import { View, Text, StyleSheet } from 'react-native';
import Card from '../Card';
import Chip from '../Chip';
import { spacing, type, colors } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';

/** "12 lifters" / "1 lifter" (blueprint section 6 wording). */
export function memberLine(count) {
  const n = Number(count) || 0;
  return n === 1 ? '1 lifter' : `${n} lifters`;
}

/**
 * The lines under the count, in the order the page reads them. Only the
 * true ones: a zero is left out rather than stated as "0 you follow".
 */
export function summaryLines(summary) {
  const out = [];
  const following = Number(summary?.following_count) || 0;
  if (following > 0) out.push(`${following} you follow`);
  for (const row of Array.isArray(summary?.by_time_band) ? summary.by_time_band : []) {
    const n = Number(row?.count) || 0;
    if (n > 0 && row?.label) out.push(`${n} ${row.label}`);
  }
  const partners = Number(summary?.open_to_partner_count) || 0;
  if (partners > 0) {
    out.push(partners === 1
      ? '1 open to training together'
      : `${partners} open to training together`);
  }
  return out;
}

export default function GymSummary({ summary, label = null }) {
  const t = useTheme();
  if (!summary) return null;

  const title = summary.label || label || 'This gym';
  const lines = summaryLines(summary);
  const styleRows = (Array.isArray(summary.by_style) ? summary.by_style : [])
    .filter((row) => row?.label && Number(row.count) > 0);

  return (
    <Card style={styles.card}>
      <Text style={[styles.title, { ...t.type.bodyStrong, color: t.colors.textPrimary }]}>
        {title}
      </Text>
      <Text style={[styles.count, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
        {memberLine(summary.count)}
      </Text>
      {lines.map((line) => (
        <Text key={line} style={[styles.line, { ...t.type.bodySm, color: t.colors.textSecondary }]}>
          {line}
        </Text>
      ))}
      {styleRows.length ? (
        <View style={styles.chips}>
          {styleRows.map((row) => (
            <Chip
              key={row.key ?? row.label}
              label={`${row.label} · ${Number(row.count)}`}
              accessibilityRole="text"
            />
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xs },
  title: { ...type.bodyStrong, color: colors.textPrimary },
  count: { ...type.bodySm, color: colors.textSecondary },
  line: { ...type.bodySm, color: colors.textSecondary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs2, marginTop: spacing.xs },
});
