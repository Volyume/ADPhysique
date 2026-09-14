/**
 * JoinToInteractRow (blueprint section 6; SD-04)
 *
 * Reading Community never needs a profile. Reacting and commenting do:
 * `community_react` and `community_comment` both raise `no_profile`. A
 * reader without one used to be shown the composer and the Respect tap
 * and told "that did not send" after the fact, which is neither the
 * reason nor a route to the fix (product review 2026-09-06, item 16).
 *
 * One quiet row, in place of both, that goes to Join and comes back.
 *
 * Founder defect 2026-09-14, lead ruling CR-17: it used to be a `Card`,
 * so a quiet one-line prompt read as a boxed panel under a flat comment
 * list. It is now the house flat row -- one `bodySm` line, chevron, a
 * `borderSubtle` hairline across the row, no gutter of its own (the post
 * screen's content already pays `spacing.lg`).
 */

import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import PressableCard from '../PressableCard';
import useTheme from '../../hooks/useTheme';
import { spacing, type, colors, iconSize } from '../../styles/theme';

export const JOIN_TO_INTERACT_LINE = 'Create your Community profile to react and comment';

export default function JoinToInteractRow({ onPress }) {
  const t = useTheme();
  return (
    <PressableCard
      onPress={onPress}
      style={styles.wrap}
      accessibilityLabel={JOIN_TO_INTERACT_LINE}
    >
      <View style={styles.row}>
        <Text style={[styles.line, { color: t.colors.textSecondary }]}>
          {JOIN_TO_INTERACT_LINE}
        </Text>
        <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
      </View>
      <View style={[styles.divider, { backgroundColor: t.colors.borderSubtle }]} />
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.md },
  row: {
    flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: spacing.sm,
  },
  line: { ...type.bodySm, color: colors.textSecondary, flex: 1 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderSubtle },
});
