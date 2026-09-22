/**
 * HomeCommunityTodayRow -- the Today root's one live Community row,
 * members only (founder order 2026-09-22, item 2 merged with item 4a;
 * audit A-03/A-04/Q1/Q5,
 * docs/audit/community-audit-2026-09-22/A-adoption-visibility-look-copy.md).
 *
 * One compact row, directly under the ScreenHeader: what is true today,
 * "{n} people you follow trained today" (singular handled), or an honest
 * zero line with a trailing Invite action that opens the native share
 * sheet with the member's own profile link (reusing the Hub's own invite
 * path -- src/lib/community/earlyDays.js's inviteMessage/inviteLabel and
 * src/lib/community/links.js's shareCommunityMessage).
 *
 * All gating (membership, calm mode, the ED flag, the 15-minute refresh)
 * lives in HomeScreen.js; this file renders only the content, on the
 * shared Card primitive with `padding="none"`, the same shape
 * HomeLastSessionCard already uses for a slim full-bleed row (no new
 * card pattern, no new amber).
 */
import { Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { spacing, type, iconSize } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import Card from './Card';
import Button from './Button';
import { friendsTrainedTodayLine } from '../lib/community/homeFriendsRow';
import { inviteLabel } from '../lib/community/earlyDays';

export default function HomeCommunityTodayRow({ count, gymLabel, onOpen, onInvite }) {
  const t = useTheme();
  const n = Math.max(0, Number(count) || 0);
  const line = friendsTrainedTodayLine(n);

  return (
    <Card
      style={styles.row}
      padding="none"
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={line}
      testID="home-community-today-row"
    >
      <Ionicons name="people-outline" size={18} color={t.colors.primary} />
      <Text style={[styles.line, { color: t.colors.textPrimary }]} numberOfLines={1}>
        {line}
      </Text>
      {n > 0 ? (
        <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
      ) : (
        <Button
          variant="tertiary"
          size="sm"
          fullWidth={false}
          title="Invite"
          hitSlop={8}
          onPress={(e) => { e?.stopPropagation?.(); onInvite(); }}
          accessibilityLabel={inviteLabel({ gymLabel })}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  line: {
    ...type.label,
    flex: 1,
    minWidth: 0,
  },
});
