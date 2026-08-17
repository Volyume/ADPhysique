import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  colors, spacing, radius, type, iconSize,
} from '../../styles/theme';
import useTheme from '../../hooks/useTheme';

/**
 * TodayLine — Campaign 22 Phase 2, Stage 1. The single P1 idiom.
 *
 * HOME-TODAY-UX-SPEC.md §16 (container findings) + §17 (region R2): "single
 * quiet tinted row, no border-in-border, one accent". This replaces FIVE
 * banner idioms (coach decision, trial value, deload/recovery, nutrition
 * phase, activation) plus the bottom check-in nudge card and the always-on
 * RecoveryStateCard row with ONE presentation. Which fact occupies the row on
 * any given render is decided entirely upstream by
 * `src/lib/home/todayLineArbiter.js` (a pure resolver); this component knows
 * nothing about coaching, trials or recovery — it renders whatever single
 * `item` it is handed, or nothing.
 *
 * Presentation only, per the build brief: no data logic here.
 *
 * @param {{ item: { key: string, text: string, onPress: Function,
 *   onDismiss?: Function|null, accessibilityLabel?: string } | null,
 *   testID?: string }} props
 */
function TodayLine({ item, testID }) {
  const t = useTheme();
  if (!item) return null;

  const { text, onPress, onDismiss, accessibilityLabel } = item;
  const live = {
    row: { backgroundColor: t.colors.primaryBg },
    accent: { backgroundColor: t.colors.primary },
    text: { ...t.type.bodySm, color: t.colors.textPrimary },
  };

  return (
    <TouchableOpacity
      style={[styles.row, live.row]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || text}
      testID={testID}
    >
      {/* The single accent: one dot, one colour. No per-occupant icon set —
          that would reintroduce the "five idioms" problem this component
          exists to close. */}
      <View style={[styles.accent, live.accent]} />
      <Text style={[styles.text, live.text]} numberOfLines={2}>{text}</Text>
      {onDismiss ? (
        <TouchableOpacity
          onPress={onDismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`Dismiss: ${accessibilityLabel || text}`}
          testID={testID ? `${testID}-dismiss` : undefined}
        >
          <Ionicons name="close" size={16} color={t.colors.textMuted} />
        </TouchableOpacity>
      ) : (
        <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.primary} />
      )}
    </TouchableOpacity>
  );
}

export default React.memo(TodayLine);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryBg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + spacing.xxs,
  },
  accent: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  text: { ...type.bodySm, flex: 1, color: colors.textPrimary },
});
