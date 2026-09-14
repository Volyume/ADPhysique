/**
 * ConversationRow — one conversation in the Messages list (discovery
 * blueprint sections 2 and 10, `docs/social-discovery-2026-09-06/70-DISCOVERY-BLUEPRINT.md`;
 * SD-21, SD-31).
 *
 * The person, their handle, the first line of the last message, the day
 * it happened and an unseen dot. A day, never a clock time: a
 * conversation list that reports "14:07" is telling one person when
 * another was on their phone, which is exactly what SD-31 rules out.
 *
 * The dot is the one amber affordance a row may carry (blueprint `30`
 * section 13, ruling 1). Everything else is neutral ink.
 *
 * Founder defect 2026-09-14, lead ruling CR-17: the row used to sit on a
 * `Card` (ruling V18), so a person in Messages read as a different
 * product from the same person on the Hub or a cohort page one tap away.
 * `20-BLUEPRINT.md` section 9 rule 2 bans `Card` for people. It is now
 * `PersonRow`'s anatomy exactly -- avatar 32 (was 36), `bodyStrong` name,
 * one `bodySm` line, the day and the dot trailing, a `borderSubtle`
 * hairline across the row, and no gutter of its own (the screen's list
 * already pays `spacing.lg`). It is not `PersonRow` itself because this
 * row's trailing slot is a two-part meta stack (day over dot), not the
 * single control that row takes, and because a conversation is addressed
 * by its own id, never by the person's.
 *
 * Props:
 *   conversation  {id, other, unread, preview, ref_kind, last_message_at,
 *                  created_at}
 *   onPress       opens the conversation
 */

import { View, Text, StyleSheet } from 'react-native';
import PressableCard from '../PressableCard';
import ProfileAvatarMark from '../ProfileAvatarMark';
import { spacing, type, colors, circle } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import { postDayLabel } from './PostCard';

const AVATAR = 32;
const DOT = 8;

/**
 * The line under the name: the last message, cut at its first line
 * break so a message written as a list does not push the row open.
 *
 * A message always carries text (1 to 1,000 characters, blueprint
 * section 2), so the reference lines below are the fallback for a row
 * that arrives with a reference and no preview.
 */
export function conversationLine(conversation) {
  const preview = typeof conversation?.preview === 'string' ? conversation.preview.trim() : '';
  if (preview) return preview.split('\n')[0].trim();
  if (conversation?.ref_kind === 'post') return 'Sent a session';
  return 'No messages yet';
}

export default function ConversationRow({ conversation, onPress }) {
  const t = useTheme();
  if (!conversation) return null;
  const other = conversation.other?.card ?? conversation.other ?? null;
  const name = other?.display_name || other?.handle || 'A lifter';
  const handle = other?.handle ? `@${other.handle}` : '';
  const line = conversationLine(conversation);
  const day = postDayLabel(conversation.last_message_at ?? conversation.created_at);
  const unread = Number(conversation.unread) > 0;
  const sub = [handle, line].filter(Boolean).join(' · ');

  return (
    <PressableCard
      onPress={onPress}
      accessibilityLabel={[
        `Conversation with ${name}`, handle, line, day, unread ? 'Unread' : null,
      ].filter(Boolean).join('. ')}
    >
      <View style={styles.row}>
        <ProfileAvatarMark
          presetKey={other?.avatar_preset}
          displayName={name}
          size={AVATAR}
        />
        <View style={styles.body}>
          <Text style={[styles.name, { color: t.colors.textPrimary }]} numberOfLines={1}>
            {name}
          </Text>
          <Text
            style={[styles.sub, {
              color: unread ? t.colors.textPrimary : t.colors.textSecondary,
            }]}
            numberOfLines={1}
          >
            {sub}
          </Text>
        </View>
        <View style={styles.meta}>
          {day ? (
            <Text style={[styles.day, { color: t.colors.textMuted }]}>{day}</Text>
          ) : null}
          {unread ? <View style={[styles.dot, { backgroundColor: t.colors.primary }]} /> : null}
        </View>
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
  meta: { alignItems: 'flex-end', gap: spacing.xs },
  day: { ...type.caption, color: colors.textMuted },
  dot: { width: DOT, height: DOT, borderRadius: circle(DOT) },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderSubtle },
});
