/**
 * CommunityHeaderAction (blueprint section 1, entry point 1; founder
 * order 2026-09-22 item 2, audit A-03: the glyph alone is Community's
 * one permanent entry point with no visible name anywhere near it).
 *
 * The Today root's header action: a pressable PILL carrying the
 * `people-outline` glyph in amber plus the visible word "Community", on
 * `surface2` with a hairline border. An amber dot sits at its top-right
 * when there is unseen activity or a pending follow request, read from
 * the cached `me` payload so the header never waits on the network to
 * draw. The dot and the message badge below are UNCHANGED by the label:
 * same size, colour and corner position, now on a wider pill.
 *
 * Lead visual review (section 13, ruling 1): the glyph and the dot are
 * the only amber on this control, and the Today header keeps ONLY this
 * action in its `right` slot. One pill, not a new card (founder brief
 * 2026-09-22: no card soup, no new amber).
 *
 * Message badge (community product audit `40-GAP-CLOSURE.md` §1, "Message
 * badge" BUILD row): the unread MESSAGE count reads separately from the
 * activity dot, exactly the split the Hub header carries. When there is
 * at least one unread message the control carries a small numeric badge
 * (capped "9+") instead of the plain dot, and the accessibility label
 * names the count as "N messages" rather than just "new activity", so a
 * screen reader hears the same distinction a sighted person sees.
 */

import { Pressable, Text, View, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { spacing, circle, fontSize, fontWeight, type } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import useCommunityMe from '../../hooks/useCommunityMe';
import { hasUnseen, hasUnreadMessages } from '../../lib/community';

// The pill's minimum height, at least the platform's 44dp touch target
// (was a 34dp glyph-only circle before the 2026-09-22 label). DOT is the
// unseen dot's own size, unchanged. GLYPH is the icon's own size: the dot
// and badge are pinned to a wrapper sized exactly to it (F3 fix, fresh-eyes
// review, founder order 2026-09-22 item 2), not to the whole pill.
const MIN_HEIGHT = 44;
const DOT = 6;
const GLYPH = 18;

export default function CommunityHeaderAction({ onPress }) {
  const t = useTheme();
  // useNavigation throws outside a navigator (isolated mount tests); the
  // same guard BackHeader uses, so the header degrades rather than crashes.
  let navigation = null;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  try { navigation = useNavigation(); } catch (_) { navigation = null; }
  const { me } = useCommunityMe();
  const unseen = hasUnseen(me);
  const unreadMessages = hasUnreadMessages(me);
  const messageCount = Number(me?.unseen_messages ?? 0);

  const go = onPress ?? (() => navigation?.navigate?.('Community'));

  const label = unreadMessages
    ? `Community, ${messageCount} ${messageCount === 1 ? 'message' : 'messages'}${unseen ? ' and other activity' : ''}`
    : unseen ? 'Community, new activity' : 'Community';

  return (
    <Pressable
      onPress={go}
      hitSlop={spacing.md}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.box,
        { backgroundColor: t.colors.surface2, borderColor: t.colors.border },
      ]}
    >
      {/* F3 fix (fresh-eyes review, founder order 2026-09-22 item 2): the
          dot/badge are pinned to THIS wrapper, sized to the glyph alone,
          so they sit on the glyph's own corner exactly as before the
          "Community" label was added, not past the whole pill. */}
      <View style={styles.iconWrap}>
        <Ionicons name="people-outline" size={GLYPH} color={t.colors.primary} />
        {unreadMessages ? (
          <View
            style={[
              styles.badge,
              { backgroundColor: t.colors.primary, borderColor: t.colors.background },
            ]}
          >
            <Text style={[styles.badgeText, { color: t.colors.onPrimary }]}>
              {messageCount > 9 ? '9+' : String(messageCount)}
            </Text>
          </View>
        ) : unseen ? (
          <View
            style={[
              styles.dot,
              { backgroundColor: t.colors.primary, borderColor: t.colors.background },
            ]}
          />
        ) : null}
      </View>
      <Text style={[styles.label, { color: t.colors.textPrimary }]}>Community</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    minHeight: MIN_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: circle(MIN_HEIGHT),
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    ...type.captionStrong,
  },
  iconWrap: {
    width: GLYPH,
    height: GLYPH,
    position: 'relative',
  },
  dot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: DOT + 2,
    height: DOT + 2,
    borderRadius: circle(DOT + 2),
    borderWidth: 1,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: circle(16),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: fontSize.micro, fontWeight: fontWeight.bold, lineHeight: 12 },
});
