/**
 * CommentRow — one comment on a story (blueprint section 6,
 * `docs/social-discovery-2026-09-06/30-BLUEPRINT.md`).
 *
 * Author, body, day, and the two actions a reader needs: delete (their own,
 * or a comment on their own content) and report (anyone else's). Nothing
 * else, and no reaction on a comment: a comment thread on a training app is
 * a conversation, not a leaderboard.
 *
 * Props:
 *   comment       { id, body, created_at, mine }
 *   author        the author's profile card
 *   canDelete     boolean, show the delete action
 *   onDelete      () => void
 *   onOpenAuthor  () => void
 *   onReport      () => void, omit to hide reporting (your own comment)
 *
 * `CommentComposer` ships alongside it, because the field that writes a
 * comment belongs with the row that reads one.
 */

import { useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity,
} from 'react-native';
import Text from '../Text';
import TextInput from '../TextInput';
import Ionicons from '@expo/vector-icons/Ionicons';
import Button from '../Button';
import ProfileAvatarMark from '../ProfileAvatarMark';
import useTheme from '../../hooks/useTheme';
import { spacing, radius, iconSize } from '../../styles/theme';
import { touchTarget } from '../../styles/layout';
import { COMMENT_MAX } from '../../lib/community/validation';
import { postDayLabel } from './PostCard';

const WELL_HEIGHT = 44;
const WELL_MAX_HEIGHT = 120;
const AVATAR = 32;

/**
 * The comment field and its send action, docked under the thread as a well
 * (D221 law V9): `background` fill, a 1 dp `borderSubtle` edge, `radius.md`,
 * 44 dp tall, a 1 dp `primary` ring while focused. It sits in a `surface`
 * strip with a hairline above, so it reads as part of the page's chrome, not
 * as one more row.
 *
 * Props:
 *   onSubmit     (body: string) => Promise<boolean>, true clears the field
 *   placeholder  optional
 */
export function CommentComposer({ onSubmit, placeholder = 'Add a comment' }) {
  const t = useTheme();
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [focused, setFocused] = useState(false);
  const trimmed = body.trim();

  async function send() {
    if (!trimmed || sending) return;
    setSending(true);
    const ok = await onSubmit?.(trimmed);
    setSending(false);
    if (ok) setBody('');
  }

  return (
    <View
      style={[styles.composer, { backgroundColor: t.colors.surface, borderTopColor: t.colors.borderSubtle }]}
    >
      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder={placeholder}
        placeholderTextColor={t.colors.textMuted}
        maxLength={COMMENT_MAX}
        multiline
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel="Comment"
        style={[
          styles.well,
          t.type.body,
          {
            color: t.colors.textPrimary,
            backgroundColor: t.colors.background,
            borderColor: focused ? t.colors.primary : t.colors.borderSubtle,
          },
        ]}
      />
      <Button
        title="Send"
        size="sm"
        fullWidth={false}
        onPress={send}
        disabled={!trimmed || sending}
        loading={sending}
        accessibilityLabel="Send comment"
      />
    </View>
  );
}

export default function CommentRow({
  comment, author, canDelete = false, onDelete, onOpenAuthor, onReport,
}) {
  const t = useTheme();
  const handle = author?.handle ? `@${author.handle}` : '';
  const day = postDayLabel(comment?.created_at);

  return (
    <View>
    <View style={styles.row}>
      <TouchableOpacity
        onPress={onOpenAuthor}
        disabled={!onOpenAuthor}
        hitSlop={spacing.md}
        accessibilityRole="button"
        accessibilityLabel={author?.display_name ? `Open ${author.display_name}'s profile` : 'Open profile'}
      >
        <ProfileAvatarMark
          presetKey={author?.avatar_preset ?? null}
          displayName={author?.display_name ?? ''}
          size={AVATAR}
        />
      </TouchableOpacity>
      <View style={styles.main}>
        <Text style={[t.type.caption, { color: t.colors.textMuted }]} numberOfLines={1}>
          {[author?.display_name ?? 'A lifter', handle, day].filter(Boolean).join(' · ')}
        </Text>
        <Text style={[t.type.bodySm, { color: t.colors.textPrimary }]}>{comment?.body ?? ''}</Text>
      </View>
      {canDelete && onDelete ? (
        <TouchableOpacity
          onPress={onDelete}
          style={styles.action}
          accessibilityRole="button"
          accessibilityLabel="Delete this comment"
        >
          <Ionicons name="trash-outline" size={iconSize.sm} color={t.colors.textMuted} />
        </TouchableOpacity>
      ) : null}
      {onReport ? (
        <TouchableOpacity
          onPress={onReport}
          style={styles.action}
          accessibilityRole="button"
          accessibilityLabel="Report this comment"
        >
          <Ionicons name="flag-outline" size={iconSize.sm} color={t.colors.textMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
    <View style={[styles.divider, { backgroundColor: t.colors.borderSubtle }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  // A row in a `surface` band (D221 V1, V3): the row carries the gutter, a
  // hairline spans the band below it.
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  main: { flex: 1, gap: spacing.xxs },
  action: {
    minWidth: touchTarget.minimum,
    minHeight: touchTarget.minimum,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: -spacing.md,
  },
  divider: { height: StyleSheet.hairlineWidth },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  well: {
    flex: 1,
    minHeight: WELL_HEIGHT,
    maxHeight: WELL_MAX_HEIGHT,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
  },
});
