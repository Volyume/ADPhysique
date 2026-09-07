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
 * PostCard, so a conversation that started from a story shows the thing
 * it started from. The tile sits outside the bubble's own press target,
 * so the two never nest.
 *
 * Session suggestions (community product audit `40-GAP-CLOSURE.md` §1,
 * "Session planning after connecting" BUILD row) render the same way,
 * ABOVE the bubble: `sessionTileLine(ref)` ("Thursday evening at PureGym
 * Motherwell"), with Accept and "Can't make it" for the recipient while
 * `ref.accepted` is unset, then `sessionStateLine(ref)` ("Accepted" /
 * "Not this time") once responded, for both parties.
 *
 * Props:
 *   message           { id, mine, body, ref_kind, ref, created_at }
 *   dayLabel          optional day heading drawn above this message
 *   onLongPress       () => void, offered for your own messages (Delete)
 *   onOpenRef         () => void, opens the referenced story
 *   onRespondSession  (accept: boolean) => void, offered to the
 *                     recipient of an unanswered session suggestion only
 */

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import PostCard from './PostCard';
import Button from '../Button';
import useTheme from '../../hooks/useTheme';
import { spacing, radius, type } from '../../styles/theme';
import { sessionTileLine, sessionStateLine, findHttpsLinks, openMessageLink } from '../../lib/community';

/**
 * Messaging links (40-GAP-CLOSURE.md §1, "Messaging links"): an
 * `https://` URL in the body renders as tappable text opening the OS
 * browser, no preview fetch. Nested `Text` carries its own `onPress` in
 * React Native without stealing the bubble's own long-press.
 */
function LinkedBody({ text, color, linkColor }) {
  const links = findHttpsLinks(text);
  if (links.length === 0) return <Text style={[styles.body, { color }]}>{text}</Text>;

  const nodes = [];
  let cursor = 0;
  links.forEach((link, i) => {
    if (link.start > cursor) nodes.push(text.slice(cursor, link.start));
    nodes.push(
      <Text
        key={`link-${i}`}
        style={{ color: linkColor, textDecorationLine: 'underline' }}
        onPress={() => openMessageLink(link.url)}
        accessibilityRole="link"
        accessibilityLabel={`Open link ${link.url}`}
      >
        {link.url}
      </Text>,
    );
    cursor = link.end;
  });
  if (cursor < text.length) nodes.push(text.slice(cursor));

  return <Text style={[styles.body, { color }]}>{nodes}</Text>;
}

function SessionTile({ sessionRef, mine, onRespondSession, t }) {
  const stateLine = sessionStateLine(sessionRef);
  return (
    <View style={[styles.sessionTile, { backgroundColor: t.colors.surface, borderColor: t.colors.borderSubtle }]}>
      <Text style={[styles.sessionLine, { color: t.colors.textPrimary }]}>
        {sessionTileLine(sessionRef)}
      </Text>
      {stateLine ? (
        <Text style={[styles.sessionState, { color: t.colors.textMuted }]}>{stateLine}</Text>
      ) : !mine && onRespondSession ? (
        <View style={styles.sessionActions}>
          <Button
            title="Accept"
            size="sm"
            fullWidth={false}
            onPress={() => onRespondSession(true)}
            accessibilityLabel="Accept this session suggestion"
          />
          <Button
            title="Can't make it"
            variant="secondary"
            size="sm"
            fullWidth={false}
            onPress={() => onRespondSession(false)}
            accessibilityLabel="Say you cannot make this session"
          />
        </View>
      ) : null}
    </View>
  );
}

export default function MessageBubble({
  message, dayLabel = null, onLongPress, onOpenRef, onRespondSession,
}) {
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
          {ref && kind === 'post' ? (
            <PostCard post={ref} author={ref.author ?? null} onPress={onOpenRef} />
          ) : null}
          {ref && kind === 'session' ? (
            <SessionTile sessionRef={ref} mine={mine} onRespondSession={onRespondSession} t={t} />
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
            <LinkedBody text={message.body ?? ''} color={t.colors.textPrimary} linkColor={t.colors.primary} />
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
  sessionTile: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sessionLine: { ...type.bodyStrong },
  sessionState: { ...type.caption },
  sessionActions: { flexDirection: 'row', gap: spacing.sm },
});
