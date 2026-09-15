/**
 * DimensionRow (blueprint section 6; SD-10)
 *
 * One dimension the user shares with other people: a style, a gym or an
 * area. A dimension is a page listing the people who chose it, never a
 * room with its own feed or admin, so the row states the label and the
 * count and nothing more.
 *
 * Founder defect 2026-09-14, lead ruling CR-17: the row used to sit on a
 * `Card` with its glyph in a 36 dp `circle()` chip (ruling V18), so a
 * cohort read as one product here and another as a `CohortRow` on the Hub
 * one tap away. `20-BLUEPRINT.md` section 9 rule 2 bans `Card` for
 * cohorts, and a circle that is not a person, a state or a value is
 * decoration -- the thing that reads as generic. It is now `CohortRow`'s
 * anatomy exactly: the bare glyph at `iconSize.md` in `textMuted`,
 * `bodyStrong` title, one `bodySm` `textSecondary` line, chevron, a
 * `borderSubtle` hairline across the row, and no gutter of its own (its
 * page already pays `spacing.lg`). It is not `CohortRow` itself because a
 * dimension's leading mark is its kind glyph, never an avatar stack of
 * the people behind it.
 *
 * Communities revamp (2026-09-10): the "programme" dimension and its
 * icon are retired from the client (Volyume never explains Community as
 * programme sharing). The server still resolves a stale "on my
 * programme" link to an always-empty dimension of that kind
 * (`01-recon-community-today.md` section 6), so an unrecognised kind
 * renders nothing here rather than a row with a generic icon.
 *
 * Communities revamp (2026-09-10), task 4: two more kinds, `discipline`
 * and `age_band` (`22-MIGRATION-170A-CONTRACT.md`), with glyphs in the
 * same vocabulary the other three already use -- a ribbon for a chosen
 * competitive/training identity (distinct from `style`'s barbell, which
 * is kit and method, not who someone is), a people glyph for an age
 * cohort.
 *
 * Props:
 *   dimension  {kind: 'style'|'gym'|'area'|'discipline'|'age_band', key,
 *              label, count}
 *   onPress    opens the dimension page
 */

import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import PressableCard from '../PressableCard';
import { spacing, type, colors, iconSize } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';

const GLYPH = {
  style: 'barbell-outline',
  gym: 'business-outline',
  area: 'location-outline',
  discipline: 'pricetag-outline',
  age_band: 'people-outline',
};

/** "6 lifters" / "1 lifter" (blueprint section 6). The count is other
 * people, never including you. */
export function peopleLine(count) {
  const n = Number(count) || 0;
  return n === 1 ? '1 lifter' : `${n} lifters`;
}

export default function DimensionRow({ dimension, onPress }) {
  const t = useTheme();
  // An unrecognised kind (the retired "programme" dimension, always
  // empty when the server still resolves one) renders nothing rather
  // than a row with a generic icon and no real content behind it.
  if (!dimension || !GLYPH[dimension.kind]) return null;
  const sub = peopleLine(dimension.count);

  return (
    <PressableCard
      onPress={onPress}
      accessibilityLabel={`${dimension.label}. ${sub}`}
    >
      <View style={styles.row}>
        <Ionicons
          name={GLYPH[dimension.kind]}
          size={iconSize.md}
          color={t.colors.textMuted}
        />
        <View style={styles.body}>
          <Text style={[styles.label, { color: t.colors.textPrimary }]} numberOfLines={1}>
            {dimension.label}
          </Text>
          <Text style={[styles.sub, { color: t.colors.textSecondary }]} numberOfLines={1}>
            {sub}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
      </View>
      <View style={[styles.divider, { backgroundColor: t.colors.borderSubtle }]} />
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', minHeight: 64, gap: spacing.md,
  },
  body: { flex: 1, gap: spacing.xxs },
  label: { ...type.bodyStrong, color: colors.textPrimary },
  sub: { ...type.bodySm, color: colors.textSecondary },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderSubtle },
});
