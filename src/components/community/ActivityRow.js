/**
 * ActivityRow (blueprint sections 3, 6; SD-15)
 *
 * One line of the Community activity inbox. In-app is the record: every
 * follow, reaction, comment and programme use lands here whether or not
 * a push was allowed to leave the server, so this row never assumes a
 * notification was seen.
 *
 * Deciding on a follow request happens in ONE place: the "Follow requests"
 * section at the top of CommunityActivityScreen. This row used to carry
 * its own Accept and Decline, which nothing ever wired up, so a request
 * row is a plain line here like every other kind (product review
 * 2026-09-06, item 27).
 *
 * Lead visual review 2026-09-06, ruling V18: `Card padding="md"
 * radius="md"`, avatar 36, one-line `body` title, one-line `caption` sub
 * (the preview and the relative time, combined), trailing unread dot.
 *
 * Props:
 *   item        {id, kind, actor, target_kind, target_id, preview,
 *                created_at, seen}
 *   onPress     opens whatever the activity is about
 */

import { View, Text, StyleSheet } from 'react-native';
import Card from '../Card';
import ProfileAvatarMark from '../ProfileAvatarMark';
import { spacing, type, colors, circle } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import { calendarRelativeLabel } from '../../lib/workoutDate';

const AVATAR = 36;

const LINES = {
  follow: 'followed you',
  follow_request: 'asked to follow you',
  follow_accepted: 'accepted your follow',
  reaction: 'gave your post respect',
  comment: 'commented on your post',
  programme_used: 'is using your programme',
  // The connection tier (discovery blueprint `docs/social-discovery-
  // 2026-09-06/70-DISCOVERY-BLUEPRINT.md` section 1). A request is
  // ANSWERED in the "Connection requests" section at the top of the
  // screen, exactly as a follow request is; the row here is the record.
  connect_request: 'wants to connect',
  connect_accepted: 'is now connected with you',
};

/** The sentence for one activity row, actor first. */
export function activityLine(item) {
  const handle = item?.actor?.handle ? `@${item.actor.handle}` : 'Someone';
  return `${handle} ${LINES[item?.kind] ?? 'did something in Community'}`;
}

function whenLabel(createdAt) {
  const ms = typeof createdAt === 'number' ? createdAt : Date.parse(createdAt);
  return Number.isFinite(ms) ? calendarRelativeLabel(ms) : '';
}

export default function ActivityRow({ item, onPress }) {
  const t = useTheme();
  if (!item) return null;
  const line = activityLine(item);
  const when = whenLabel(item.created_at);
  const sub = [item.preview, when].filter(Boolean).join(' · ');

  return (
    <Card
      onPress={onPress}
      padding="md"
      radius="md"
      style={styles.card}
      accessibilityLabel={when ? `${line}. ${when}` : line}
    >
      <View style={styles.row}>
        <ProfileAvatarMark
          presetKey={item.actor?.avatar_preset}
          displayName={item.actor?.display_name || item.actor?.handle}
          size={AVATAR}
        />
        <View style={styles.body}>
          <Text style={[styles.line, { ...t.type.body, color: t.colors.textPrimary }]} numberOfLines={1}>
            {line}
          </Text>
          {sub ? (
            <Text style={[styles.sub, { ...t.type.caption, color: t.colors.textMuted }]} numberOfLines={1}>
              {sub}
            </Text>
          ) : null}
        </View>
        {!item.seen ? (
          <View style={[styles.dot, { backgroundColor: t.colors.primary }]} />
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  body: { flex: 1, gap: spacing.xxs },
  line: { ...type.body, color: colors.textPrimary },
  sub: { ...type.caption, color: colors.textMuted },
  dot: { width: 8, height: 8, borderRadius: circle(8) },
});
