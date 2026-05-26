/**
 * EmptyDiary: the empty state for a day with no food entries.
 *
 * Spec: UI_FLOWS_LOCKED.md lines 273-276
 *   "Diary, no entries today: 'No food logged yet. Tap a meal
 *    slot above to start. Or use Scan to grab something from a
 *    barcode.'"
 *
 * Copy is verbatim from spec. Do not edit without updating the
 * acceptance check.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, fontWeight, spacing } from '../../styles/theme';

export const EMPTY_DIARY_COPY =
  "No food logged yet. Tap a meal slot above to start. Or use Scan to grab something from a barcode.";

export default function EmptyDiary() {
  return (
    <View style={styles.box} accessibilityRole="text">
      <Text style={styles.body}>{EMPTY_DIARY_COPY}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  body: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.regular,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 20,
  },
});
