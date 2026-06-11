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
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { colors, spacing, fontSize, fontWeight, radius } from '../styles/theme';
import BottomSheet from './BottomSheet';
import Button from './Button';
import ReasonPicker from './ReasonPicker';
import { captureCancelReason } from '../lib/cancelReason';
import { setStatedReturn } from '../lib/payments/winbackState';

// §4d: the optional break-window follow-up, shown only for temporary_break.
// Keys match winbackState.STATED_RETURN_DELAY_DAYS so the single win-back lands
// roughly when the user said (stored locally only, never telemetry).
const BREAK_WINDOWS = [
  { key: 'in_a_month',        label: 'In a month' },
  { key: 'two_three_months',  label: '2-3 months' },
  { key: 'not_sure',          label: 'Not sure' },
];

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
  const [breakWindow, setBreakWindow] = useState(null);

  const reset = useCallback(() => {
    setReason(null);
    setText('');
    setBreakWindow(null);
  }, []);

  const selectReason = useCallback((key) => {
    setReason(key);
    // The break-window answer only applies to temporary_break.
    if (key !== 'temporary_break') setBreakWindow(null);
  }, []);

  // Continue to the store. Capture the reason (if any) first — it is an
  // intent signal keyed to `surface`; no win-back fires unless a real lapse
  // follows. Then hand off. Answering is never required to get here.
  const handleContinue = useCallback(() => {
    captureCancelReason({ reason, text, userId, surface });
    // §4d: persist the stated break window locally so the single win-back lands
    // roughly when they said (scheduling input only, never telemetry).
    if (reason === 'temporary_break' && breakWindow) setStatedReturn(breakWindow);
    reset();
    onStoreHandoff?.();
    onClose?.();
  }, [reason, text, breakWindow, userId, surface, onStoreHandoff, onClose, reset]);

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

      {reason === 'temporary_break' ? (
        <View style={styles.breakBlock}>
          <Text style={styles.breakPrompt}>When do you think you'll be back?</Text>
          <View style={styles.chipRow}>
            {BREAK_WINDOWS.map((w) => {
              const selected = breakWindow === w.key;
              return (
                <Pressable
                  key={w.key}
                  onPress={() => setBreakWindow(selected ? null : w.key)}
                  style={({ pressed }) => [
                    styles.chip,
                    selected && styles.chipSelected,
                    pressed && { opacity: 0.7 },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={w.label}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {w.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {Platform.OS === 'android' ? (
            <Text style={styles.pauseHint}>
              Google Play also lets you pause your subscription instead, it's in
              the same settings screen.
            </Text>
          ) : null}
        </View>
      ) : null}

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
  breakBlock: {
    gap: spacing.sm,
  },
  breakPrompt: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
  },
  pauseHint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 16,
  },
});
