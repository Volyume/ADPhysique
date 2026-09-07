/**
 * MessageComposer — the field that writes one message (discovery
 * blueprint section 2; SD-21).
 *
 * The field starts EMPTY, always. The placeholder is a prompt, not a
 * draft: opening a conversation from a programme or a story suggests
 * what to ask ("Ask about this programme"), and the person writes their
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
import { View, Text, StyleSheet, TextInput } from 'react-native';
import Button from '../Button';
import useTheme from '../../hooks/useTheme';
import { spacing, radius, type } from '../../styles/theme';
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
        <TextInput
          style={[styles.input, {
            backgroundColor: t.colors.inputBg,
            borderColor: t.colors.border,
            color: t.colors.textPrimary,
          }]}
          value={body}
          onChangeText={(v) => setBody(v.slice(0, MESSAGE_MAX))}
          placeholder={placeholder}
          placeholderTextColor={t.colors.textDisabled}
          maxLength={MESSAGE_MAX}
          multiline
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
  input: {
    minHeight: touchTarget.minimum,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...type.bodySm,
  },
  count: { ...type.caption, textAlign: 'right' },
});
