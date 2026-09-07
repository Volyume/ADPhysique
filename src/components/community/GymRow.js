/**
 * GymRow (gym database blueprint `docs/gym-database-2026-09-06/
 * 20-BLUEPRINT.md`, "## App"; GD-11).
 *
 * One search result: the display name, then "town · outward · distance"
 * underneath (whichever of those the venue actually has). A venue still
 * waiting on its second independent confirmation (GD-11) carries a
 * "Pending" badge, so picking it is an informed choice, not a surprise.
 *
 * Lead visual review 2026-09-06, ruling V18: `Card padding="md"
 * radius="md"` (moved off a bare `PressableCard`), glyph 36, one-line
 * `body` title, one-line `caption` sub.
 */

import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Card from '../Card';
import { spacing, type, iconSize, radius, circle } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import { venueLine, isPendingVenue } from '../../lib/gyms';

export default function GymRow({ venue, onPress }) {
  const t = useTheme();
  const { primary, secondary } = venueLine(venue);
  const pending = isPendingVenue(venue);

  return (
    <Card
      onPress={onPress}
      padding="md"
      radius="md"
      style={styles.row}
      accessibilityLabel={pending ? `${primary}, pending confirmation` : primary}
    >
      <View style={[styles.glyph, { backgroundColor: t.colors.surface2 }]}>
        <Ionicons name="business-outline" size={iconSize.sm} color={t.colors.textSecondary} />
      </View>
      <View style={styles.body}>
        <Text
          style={[styles.name, { ...t.type.body, color: t.colors.textPrimary }]}
          numberOfLines={1}
        >
          {primary}
        </Text>
        {secondary ? (
          <Text
            style={[styles.sub, { ...t.type.caption, color: t.colors.textSecondary }]}
            numberOfLines={1}
          >
            {secondary}
          </Text>
        ) : null}
      </View>
      {pending ? (
        <View style={[styles.badge, { backgroundColor: t.colors.surface2, borderColor: t.colors.border }]}>
          <Text style={[styles.badgeText, { ...t.type.caption, color: t.colors.textSecondary }]}>
            Pending
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  glyph: {
    width: 36,
    height: 36,
    borderRadius: circle(36),
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: spacing.xxs },
  name: { ...type.body },
  sub: { ...type.caption },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  badgeText: { ...type.caption },
});
