/**
 * CancelReasonSheet — COMP-025-A Moment 1
 *
 * One optional question on the way out, then a clean handoff to the store's
 * own cancellation UI. The store CTA is ALWAYS enabled and never conditional
 * on answering — answering is optional and skippable in one tap. This is a
 * deliberate anti-dark-pattern stance (DMCC 2024 / store policy: exit must be
 * "as easy as to join"); never gate the store link behind the question.
 *
 * The reason rows + free-text and the capture side-effects are shared with the
 * post-lapse sheet via ReasonPicker + lib/cancelReason, so the two moments
 * can't drift. Telemetry: `cancel_reason_captured` { reason, surface } — enum
 * only; free text routes to user_feedback, never telemetry.
 *
 * No emotional / guilt copy anywhere; no counter-offer in the cancel path (the
 * win-back comes later via the stores' own mechanisms, §4c).
 */

import { useState, useCallback } from 'react';
import { Text, StyleSheet } from 'react-native';
import { colors, fontSize, fontWeight } from '../styles/theme';
import BottomSheet from './BottomSheet';
import Button from './Button';
import ReasonPicker from './ReasonPicker';
import { captureCancelReason } from '../lib/cancelReason';

export default function CancelReasonSheet({
  visible,
  onClose,
  onStoreHandoff,
  storeLabel,
  userId = null,
  surface = 'pre_store_handoff',
}) {
  const [reason, setReason] = useState(null);
  const [text, setText] = useState('');

  const reset = useCallback(() => {
    setReason(null);
    setText('');
  }, []);

  const selectReason = useCallback((key) => setReason(key), []);

  // Continue to the store. Capture the reason (if any) first — it is an
  // intent signal keyed to `surface`; no win-back fires unless a real lapse
  // follows. Then hand off. Answering is never required to get here.
  const handleContinue = useCallback(() => {
    captureCancelReason({ reason, text, userId, surface });
    reset();
    onStoreHandoff?.();
    onClose?.();
  }, [reason, text, userId, surface, onStoreHandoff, onClose, reset]);

  const handleKeep = useCallback(() => {
    reset();
    onClose?.();
  }, [reset, onClose]);

  return (
    <BottomSheet
      visible={visible}
      onClose={handleKeep}
      keyboardAvoiding
      accessibilityLabel="Before you go"
    >
      <Text style={styles.title}>Before you go: what's the main reason?</Text>
      <Text style={styles.sub}>Optional. It helps us decide what to build.</Text>

      <ReasonPicker
        reason={reason}
        text={text}
        onSelectReason={selectReason}
        onChangeText={setText}
      />

      <Text style={styles.disclosure}>
        You'll keep your features until the current billing period ends. Your
        training history, food log and check-ins all stay.
      </Text>

      {/* The store handoff is the primary action and is always enabled — the
          exit is never buried or gated on answering. */}
      <Button
        title={`Continue to ${storeLabel}`}
        size="lg"
        onPress={handleContinue}
      />
      <Button
        title="Keep my subscription"
        variant="secondary"
        onPress={handleKeep}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  sub: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  disclosure: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
