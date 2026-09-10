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
 * Props:
 *   placeholder  from `placeholderFor(ref)` in the client library
 *   onSend       (body: string) => Promise<boolean>, true clears the field
 *   disabled     the thread cannot take a message just now
 */

import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Button from '../Button';
import ComposerInput from './ComposerInput';
import useTheme from '../../hooks/useTheme';
import { spacing, type } from '../../styles/theme';
import { touchTarget } from '../../styles/layout';
import { MESSAGE_MAX } from '../../lib/community';

/** The count appears here, and not before. */
export const MESSAGE_COUNTER_FROM = 900;

export default function MessageComposer({
  placeholder = 'Write a message', onSend, disabled = false,
}) {
  const t = useTheme();
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const trimmed = body.trim();
  const showCount = body.length >= MESSAGE_COUNTER_FROM;

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
      borderTopColor: t.colors.borderSubtle, backgroundColor: t.colors.background,
    }]}
    >
      <View style={styles.field}>
        <ComposerInput
          value={body}
          onChangeText={(v) => setBody(v.slice(0, MESSAGE_MAX))}
          placeholder={placeholder}
          maxLength={MESSAGE_MAX}
          minHeight={touchTarget.minimum}
          editable={!disabled}
          accessibilityLabel="Message"
        />
        {showCount ? (
          <Text style={[styles.count, { color: t.colors.textMuted }]}>
            {`${body.length} of ${MESSAGE_MAX}`}
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
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  field: { flex: 1, gap: spacing.xxs },
  count: { ...type.caption, textAlign: 'right' },
});
