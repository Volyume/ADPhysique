/**
 * MessageBubble — one message in a conversation (discovery blueprint
 * section 2, `docs/social-discovery-2026-09-06/70-DISCOVERY-BLUEPRINT.md`;
 * SD-21, SD-31).
 *
 * Yours on the right, theirs on the left, in neutral ink and neutral
 * surfaces only: the lead visual review (blueprint `30` section 13,
 * ruling 1) leaves amber to glyphs on primary buttons, the selected
 * segment, the emphatic fill, the library chip and the unseen dot, so a
 * thread of your own messages never turns the screen orange.
 *
 * A message carries a day, never a clock time (SD-31: nothing finer than
 * a band, nothing that reads as surveillance of when a person was at
 * their phone). The day is drawn once, at the boundary, by the screen
 * handing `dayLabel` to the first message of that day.
 *
 * The context reference is rendered ABOVE the bubble as the existing
 * ProgrammeTile or PostCard, so a conversation that started from a
 * programme or a story shows the thing it started from. The tile sits
 * outside the bubble's own press target, so the two never nest.
 *
 * Props:
 *   message      { id, mine, body, ref_kind, ref, created_at }
 *   dayLabel     optional day heading drawn above this message
 *   onLongPress  () => void, offered for your own messages (Delete)
 *   onOpenRef    () => void, opens the referenced programme or story
 */

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import ProgrammeTile from './ProgrammeTile';
import PostCard from './PostCard';
import useTheme from '../../hooks/useTheme';
import { spacing, radius, type } from '../../styles/theme';

export default function MessageBubble({ message, dayLabel = null, onLongPress, onOpenRef }) {
  const t = useTheme();
  if (!message) return null;
  const mine = !!message.mine;
  const ref = message.ref ?? null;
  const kind = message.ref_kind ?? null;

  return (
    <View style={styles.wrap}>
      {dayLabel ? (
        <Text style={[styles.day, { color: t.colors.textMuted }]}>{dayLabel}</Text>
      ) : null}
      <View style={[styles.line, mine ? styles.lineMine : styles.lineTheirs]}>
        <View style={styles.column}>
          {ref && kind === 'programme' ? (
            <ProgrammeTile programme={ref} onPress={onOpenRef} />
          ) : null}
          {ref && kind === 'post' ? (
            <PostCard post={ref} author={ref.author ?? null} onPress={onOpenRef} />
          ) : null}
          <TouchableOpacity
            activeOpacity={onLongPress ? 0.8 : 1}
            onLongPress={onLongPress}
            disabled={!onLongPress}
            style={[styles.bubble, {
              backgroundColor: mine ? t.colors.surfaceElevated : t.colors.surface,
              borderColor: t.colors.borderSubtle,
            }]}
            accessibilityRole={onLongPress ? 'button' : 'text'}
            accessibilityLabel={`${mine ? 'You said' : 'They said'}: ${message.body ?? ''}`}
          >
            <Text style={[styles.body, { color: t.colors.textPrimary }]}>{message.body ?? ''}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  day: { ...type.caption, textAlign: 'center', paddingVertical: spacing.xs },
  line: { flexDirection: 'row' },
  lineMine: { justifyContent: 'flex-end' },
  lineTheirs: { justifyContent: 'flex-start' },
  column: { maxWidth: '82%', gap: spacing.xs },
  bubble: {
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  body: { ...type.bodySm },
});
