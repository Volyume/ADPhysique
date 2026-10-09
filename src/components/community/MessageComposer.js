/**
 * MessageComposer — the field that writes one message (discovery
 * blueprint section 2; SD-21).
 *
 * The field starts EMPTY, always. The placeholder is a prompt, not a
 * draft: opening a conversation from someone's post suggests what to
 * ask ("Say something about this session"), and the person writes their
 * own words. Nothing is ever pre-written or sent on anyone's behalf.
 *
 * The counter appears only near the ceiling. A character count sitting
 * on screen from the first letter reads as a limit being policed; at
 * 900 of 1,000 it is simply useful.
 *
 * D221 V9 (lane 2B): the field is a well on a `surface` band.
 *
 * Props:
 *   placeholder  from `placeholderFor(ref)` in the client library
 *   onSend       (body: string) => Promise<boolean>, true clears the field
 *   disabled     the thread cannot take a message just now
 *   maxLength    the ceiling; defaults to the DM ceiling, a group chat passes 500
 */

import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '../Text';
import Button from '../Button';
import ComposerInput from './ComposerInput';
import useTheme from '../../hooks/useTheme';
import { spacing, type } from '../../styles/theme';
import { touchTarget } from '../../styles/layout';
import { MESSAGE_MAX } from '../../lib/community';

/** The count appears here, and not before. */
export const MESSAGE_COUNTER_FROM = 900;

export default function MessageComposer({
  placeholder = 'Write a message', onSend, disabled = false, maxLength = MESSAGE_MAX,
}) {
  const t = useTheme();
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const trimmed = body.trim();
  const showCount = body.length >= Math.min(MESSAGE_COUNTER_FROM, Math.floor(maxLength * 0.9));

  async function send() {
    if (!trimmed || sending || disabled) return;
    setSending(true);
    let ok = false;
    try {
      ok = await onSend?.(trimmed);
    } finally {
      setSending(false);
    }
    if (ok) setBody('');
  }

  return (
    <View style={[styles.composer, {
      borderTopColor: t.colors.borderSubtle, backgroundColor: t.colors.surface,
    }]}
    >
      <View style={styles.field}>
        <ComposerInput
          well
          value={body}
          onChangeText={(v) => setBody(v.slice(0, maxLength))}
          placeholder={placeholder}
          maxLength={maxLength}
          minHeight={touchTarget.minimum}
          editable={!disabled}
          accessibilityLabel="Message"
        />
        {showCount ? (
          <Text style={[styles.count, { color: t.colors.textMuted }]}>
            {`${body.length} of ${maxLength}`}
          </Text>
        ) : null}
      </View>
      <Button
        title="Send"
        size="sm"
        fullWidth={false}
        onPress={send}
        disabled={!trimmed || disabled}
        loading={sending}
        accessibilityLabel="Send message"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  field: { flex: 1, gap: spacing.xxs },
  count: { ...type.caption, textAlign: 'right' },
});
