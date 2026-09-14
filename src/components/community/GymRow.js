/**
 * GymRow (gym database blueprint `docs/gym-database-2026-09-06/
 * 20-BLUEPRINT.md`, "## App"; GD-11).
 *
 * One search result: the display name, then "town · outward · distance"
 * underneath (whichever of those the venue actually has). A venue still
 * waiting on its second independent confirmation (GD-11) carries a
 * "Pending" badge, so picking it is an informed choice, not a surprise.
 *
 * Founder defect 2026-09-14, lead ruling CR-17: the row used to sit on a
 * `Card` with its glyph in a 36 dp `circle()` chip (ruling V18), which
 * gave the gym finder a boxed look nothing else in Community has any
 * more. It is now `CohortRow`'s anatomy: the bare glyph at `iconSize.md`
 * in `textMuted`, `bodyStrong` name, one `bodySm` `textSecondary` line, a
 * `borderSubtle` hairline across the row, and no gutter of its own (every
 * screen that mounts `GymPicker` -- Join, Edit profile, Pro onboarding --
 * already pays `spacing.lg` on its own content). The "Pending" badge
 * stays a pill: it is a state, not decoration.
 */

import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import PressableCard from '../PressableCard';
import { spacing, type, iconSize, radius, colors } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import { venueLine, isPendingVenue } from '../../lib/gyms';

export default function GymRow({ venue, onPress }) {
  const t = useTheme();
  const { primary, secondary } = venueLine(venue);
  const pending = isPendingVenue(venue);

  return (
    <PressableCard
      onPress={onPress}
      accessibilityLabel={pending ? `${primary}, pending confirmation` : primary}
    >
      <View style={styles.row}>
        <Ionicons name="business-outline" size={iconSize.md} color={t.colors.textMuted} />
        <View style={styles.body}>
          <Text
            style={[styles.name, { color: t.colors.textPrimary }]}
            numberOfLines={1}
          >
            {primary}
          </Text>
          {secondary ? (
            <Text
              style={[styles.sub, { color: t.colors.textSecondary }]}
              numberOfLines={1}
            >
              {secondary}
            </Text>
          ) : null}
        </View>
        {pending ? (
          <View style={[styles.badge, { backgroundColor: t.colors.surface2, borderColor: t.colors.borderSubtle }]}>
            <Text style={[styles.badgeText, { color: t.colors.textSecondary }]}>
              Pending
            </Text>
          </View>
        ) : null}
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
  name: { ...type.bodyStrong, color: colors.textPrimary },
  sub: { ...type.bodySm, color: colors.textSecondary },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badgeText: { ...type.caption, color: colors.textSecondary },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderSubtle },
});
