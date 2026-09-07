/**
 * CommunityHeaderAction (blueprint section 1, entry point 1)
 *
 * The Today root's header action: a 34 dp round pressable carrying the
 * `people-outline` glyph in amber on `surface2` with a hairline border,
 * matching the brand-mark box it replaces on that screen. An amber dot
 * sits at its top-right when there is unseen activity or a pending
 * follow request, read from the cached `me` payload so the header never
 * waits on the network to draw.
 *
 * Lead visual review (section 13, ruling 1): the glyph and the dot are
 * the only amber on this control, and the Today header keeps ONLY this
 * action in its `right` slot.
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
import { spacing, circle, fontSize, fontWeight } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import useCommunityMe from '../../hooks/useCommunityMe';
import { hasUnseen, hasUnreadMessages } from '../../lib/community';

// Matches ScreenHeader's BRAND_BOX so the control sits exactly where the
// brand mark used to, at the same optical weight.
const BOX = 34;
const DOT = 6;

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
      <Ionicons name="people-outline" size={18} color={t.colors.primary} />
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    width: BOX,
    height: BOX,
    borderRadius: circle(BOX),
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
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
