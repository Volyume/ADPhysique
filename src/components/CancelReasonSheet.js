/**
 * CancelReasonSheet — COMP-025-A
 *
 * One optional question on the way out, then a clean handoff to the store's
 * own cancellation UI. The store CTA is ALWAYS enabled and never conditional
 * on answering — answering is optional and skippable in one tap. This is a
 * deliberate anti-dark-pattern stance (DMCC 2024 / store policy: exit must be
 * "as easy as to join"); never gate the store link behind the question.
 *
 * One component, two moments (blueprint §4a):
 *   - surface 'pre_store_handoff'  — from SubscriptionScreen's Cancel button,
 *     before the Linking.openURL store handoff (this slice).
 *   - surface 'post_lapse_sheet'   — reused by the post-lapse sheet (later
 *     slice); same question, shown only if no reason was captured this episode.
 *
 * Telemetry: emits `cancel_reason_captured` { reason, surface } — enum only,
 * no PII. The optional free text (missing_feature / switching only) routes to
 * the existing user_feedback table via submitFeedback, NEVER to telemetry.
 *
 * No emotional / guilt copy anywhere; no counter-offer in the cancel path (the
 * win-back comes later via the stores' own mechanisms, §4c).
 */

import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { selection as hapticSelection } from '../lib/haptics';
import { colors, spacing, fontSize, fontWeight, radius } from '../styles/theme';
import BottomSheet from './BottomSheet';
import Button from './Button';
import { track } from '../lib/telemetry';
import { submitFeedback } from '../lib/feedback';

// Single-select reasons. Keys are the telemetry enum; the order maps onto the
// fitness-churn benchmark (motivation / alternatives / cost / personalisation),
// kept plain and shame-free.
const REASONS = [
  { key: 'price',           label: 'It costs too much' },
  { key: 'not_using',       label: "I wasn't using it enough" },
  { key: 'missing_feature', label: "It's missing something I need" },
  { key: 'switching',       label: "I'm switching to another app" },
  { key: 'temporary_break', label: "I'm taking a break from training" },
];

// Free text appears only for these two reasons (blueprint §4a).
const FREE_TEXT_REASONS = new Set(['missing_feature', 'switching']);
const FREE_TEXT_PROMPT = {
  missing_feature: 'What was missing?',
  switching: 'Which one?',
};

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

  const selectReason = useCallback((key) => {
    setReason(key);
    if (!FREE_TEXT_REASONS.has(key)) setText('');
    try { hapticSelection(); } catch (_) {}
  }, []);

  // Continue to the store. Capture the reason (if any) first — it is an
  // intent signal keyed to `surface`; no win-back fires unless a real lapse
  // follows. Then hand off. Answering is never required to get here.
  const handleContinue = useCallback(() => {
    if (reason) {
      try { track(userId, 'cancel_reason_captured', { reason, surface })?.catch?.(() => {}); } catch (_) {}
      const trimmed = text.trim();
      if (trimmed && FREE_TEXT_REASONS.has(reason)) {
        // Free text → user_feedback (never telemetry). Fire-and-forget.
        try {
          submitFeedback({
            trigger: 'cancel_reason',
            sentiment: reason,
            message: trimmed.slice(0, 120),
            userId,
          })?.catch?.(() => {});
        } catch (_) {}
      }
    }
    reset();
    onStoreHandoff?.();
    onClose?.();
  }, [reason, text, userId, surface, onStoreHandoff, onClose, reset]);

  const handleKeep = useCallback(() => {
    reset();
    onClose?.();
  }, [reset, onClose]);

  const showFreeText = reason != null && FREE_TEXT_REASONS.has(reason);

  return (
    <BottomSheet
      visible={visible}
      onClose={handleKeep}
      keyboardAvoiding
      accessibilityLabel="Before you go"
    >
      <Text style={styles.title}>Before you go: what's the main reason?</Text>
      <Text style={styles.sub}>Optional. It helps us decide what to build.</Text>

      <View style={styles.rows}>
        {REASONS.map((r) => {
          const selected = reason === r.key;
          return (
            <Pressable
              key={r.key}
              onPress={() => selectReason(r.key)}
              style={({ pressed }) => [
                styles.row,
                selected && styles.rowSelected,
                pressed && { opacity: 0.7 },
              ]}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={r.label}
            >
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected ? <View style={styles.radioDot} /> : null}
              </View>
              <Text style={[styles.rowText, selected && styles.rowTextSelected]}>
                {r.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {showFreeText ? (
        <TextInput
          style={styles.input}
          placeholder={FREE_TEXT_PROMPT[reason]}
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={setText}
          maxLength={120}
          multiline
          accessibilityLabel={FREE_TEXT_PROMPT[reason]}
        />
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
  rows: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowSelected: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primary,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  rowText: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  rowTextSelected: {
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
  },
  input: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    minHeight: 56,
    textAlignVertical: 'top',
  },
  disclosure: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
