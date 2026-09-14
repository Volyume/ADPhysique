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
 * Founder defect 2026-09-14, lead ruling CR-17: the row used to sit on a
 * `Card` (ruling V18), so the same person read as one product in the
 * Activity inbox and another on the Hub one tap away. `20-BLUEPRINT.md`
 * section 9 rule 2 bans `Card` for people and activity. It is now
 * `PersonRow`'s anatomy -- avatar 32 (was 36), one `body` line, one
 * `bodySm` `textSecondary` sub, the unread dot trailing, a `borderSubtle`
 * hairline across the row, and no gutter of its own (the screen's list
 * already pays `spacing.lg`). The first line stays `body` rather than
 * `bodyStrong`: it is a sentence about what happened ("@priya_kb
 * commented on your post"), not a name, and rule 1 puts running text at
 * `body`. It is not `PersonRow` itself because that row's first line IS a
 * name and its label is composed from one.
 *
 * Props:
 *   item        {id, kind, actor, target_kind, target_id, preview,
 *                created_at, seen}
 *   onPress     opens whatever the activity is about
 */

import { View, Text, StyleSheet } from 'react-native';
import PressableCard from '../PressableCard';
import ProfileAvatarMark from '../ProfileAvatarMark';
import { spacing, type, colors, circle } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import { calendarRelativeLabel } from '../../lib/workoutDate';

const AVATAR = 32;
const DOT = 8;

const LINES = {
  follow: 'followed you',
  follow_request: 'asked to follow you',
  follow_accepted: 'accepted your follow',
  reaction: 'gave your post respect',
  comment: 'commented on your post',
  // The connection tier (discovery blueprint `docs/social-discovery-
  // 2026-09-06/70-DISCOVERY-BLUEPRINT.md` section 1). A request is
  // ANSWERED in the "Connection requests" section at the top of the
  // screen, exactly as a follow request is; the row here is the record.
  connect_request: 'wants to connect',
  connect_accepted: 'is now connected with you',
  // Groups (recon 01 section 4; community_activity payload,
  // migrate_165_community_boards_groups.sql:974,1007,1113 via
  // `_community_add_activity`): the row carries only `target_kind: 'group'`
  // and `target_id` (the group's id) for these three kinds, never a name --
  // `community_activity` (migrate_160:3376-3431) only ever fills `preview`
  // for `target_kind = 'post'`. So the copy names the relationship, not a
  // group name the row cannot supply.
  group_request: 'asked to join your group',
  group_accepted: 'accepted you into the group',
  group_invited: 'invited you to a group',
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
    <PressableCard
      onPress={onPress}
      accessibilityLabel={when ? `${line}. ${when}` : line}
    >
      <View style={styles.row}>
        <ProfileAvatarMark
          presetKey={item.actor?.avatar_preset}
          displayName={item.actor?.display_name || item.actor?.handle}
          size={AVATAR}
        />
        <View style={styles.body}>
          <Text style={[styles.line, { color: t.colors.textPrimary }]} numberOfLines={1}>
            {line}
          </Text>
          {sub ? (
            <Text style={[styles.sub, { color: t.colors.textSecondary }]} numberOfLines={1}>
              {sub}
            </Text>
          ) : null}
        </View>
        {!item.seen ? (
          <View style={[styles.dot, { backgroundColor: t.colors.primary }]} />
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
  line: { ...type.body, color: colors.textPrimary },
  sub: { ...type.bodySm, color: colors.textSecondary },
  dot: { width: DOT, height: DOT, borderRadius: circle(DOT) },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderSubtle },
});
