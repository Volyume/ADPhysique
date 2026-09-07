/**
 * ConversationRow — one conversation in the Messages list (discovery
 * blueprint sections 2 and 10; SD-21, SD-31).
 *
 * The person, their handle, the first line of the last message, the day
 * it happened and an unseen dot. A day, never a clock time: a
 * conversation list that reports "14:07" is telling one person when
 * another was on their phone, which is exactly what SD-31 rules out.
 *
 * The dot is the one amber affordance a row may carry (blueprint `30`
 * section 13, ruling 1). Everything else is neutral ink.
 *
 * Props:
 *   conversation  {id, other, unread, preview, ref_kind, last_message_at,
 *                  created_at}
 *   onPress       opens the conversation
 */

import { View, Text, StyleSheet } from 'react-native';
import Card from '../Card';
import ProfileAvatarMark from '../ProfileAvatarMark';
import { spacing, type, colors, circle } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import { postDayLabel } from './PostCard';

const AVATAR = 40;

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
  if (conversation?.ref_kind === 'programme') return 'Sent a programme';
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

  return (
    <Card
      onPress={onPress}
      style={styles.card}
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
          <Text style={[styles.name, { ...t.type.body, color: t.colors.textPrimary }]} numberOfLines={1}>
            {name}
          </Text>
          {handle ? (
            <Text style={[styles.handle, { ...t.type.caption, color: t.colors.textSecondary }]} numberOfLines={1}>
              {handle}
            </Text>
          ) : null}
          <Text
            style={[styles.preview, {
              ...t.type.caption,
              color: unread ? t.colors.textPrimary : t.colors.textMuted,
            }]}
            numberOfLines={1}
          >
            {line}
          </Text>
        </View>
        <View style={styles.meta}>
          {day ? (
            <Text style={[styles.day, { ...t.type.caption, color: t.colors.textMuted }]}>{day}</Text>
          ) : null}
          {unread ? <View style={[styles.dot, { backgroundColor: t.colors.primary }]} /> : null}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  body: { flex: 1, gap: spacing.xxs },
  name: { ...type.body, color: colors.textPrimary },
  handle: { ...type.caption, color: colors.textSecondary },
  preview: { ...type.caption, color: colors.textMuted },
  meta: { alignItems: 'flex-end', gap: spacing.xs },
  day: { ...type.caption, color: colors.textMuted },
  dot: { width: 8, height: 8, borderRadius: circle(8) },
});
