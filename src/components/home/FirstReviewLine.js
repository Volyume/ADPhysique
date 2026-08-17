import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, type, iconSize } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';

/**
 * FirstReviewLine — Campaign 22 Phase 2, Stage 2. Region R4 (Evidence Row).
 *
 * HOME-TODAY-UX-SPEC.md §17 R4: "One row, one line of copy. Low weight,
 * borderless." Presentation only, matching TodayLine's split: which fact (if
 * any) occupies this row is decided entirely upstream by
 * `src/lib/home/firstReviewLine.js` (a pure resolver); this component knows
 * nothing about coaching-readiness maths.
 *
 * @param {{ item: { text: string, accessibilityLabel?: string } | null,
 *   onPress: Function, testID?: string }} props
 */
function FirstReviewLine({ item, onPress, testID }) {
  const t = useTheme();
  if (!item) return null;
  const live = { text: { ...t.type.bodySm, color: t.colors.textSecondary } };

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={item.accessibilityLabel || item.text}
      testID={testID}
    >
      <Text style={[styles.text, live.text]} numberOfLines={2}>{item.text}</Text>
      <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
    </TouchableOpacity>
  );
}

export default React.memo(FirstReviewLine);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  text: { ...type.bodySm, flex: 1, color: colors.textSecondary },
});
