/**
 * DiaryMoveSheet: the Diary's "Move to" picker for the selected entries,
 * moved out of DiaryScreen.js as a named component (D230 R4, 4.7) with the
 * same behaviour: one 48 dp row per meal on the day, a tap moves the
 * selection there. The title is a heading (D230 R16).
 */
import { TouchableOpacity, StyleSheet } from 'react-native';
import Text from '../Text';
import BottomSheet from '../BottomSheet';
import SectionLabel from '../SectionLabel';
import * as haptics from '../../lib/haptics';
import { colors, spacing, radius, type } from '../../styles/theme';
import { touchTarget } from '../../styles/layout';
import useTheme from '../../hooks/useTheme';

export default function DiaryMoveSheet({ visible, onClose, mealSlots = [], onMove }) {
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      scroll
      accessibilityLabel="Move selected foods"
    >
      <SectionLabel heading style={styles.title}>Move to</SectionLabel>
      {mealSlots.map((s) => (
        <TouchableOpacity
          key={s.key}
          style={styles.option}
          onPress={() => { haptics.selection(); onMove?.(s.key); }}
          accessibilityRole="button"
          accessibilityLabel={`Move to ${s.label}`}
        >
          <Text style={[styles.optionText, live.optionText]}>{s.label}</Text>
        </TouchableOpacity>
      ))}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    paddingHorizontal: spacing.sm, paddingTop: spacing.xs, paddingBottom: spacing.sm,
  },
  option: {
    minHeight: touchTarget.minimum, justifyContent: 'center',
    paddingHorizontal: spacing.sm, borderRadius: radius.md,
  },
  optionText: { ...type.bodyStrong, color: colors.textPrimary },
});

// The tree's frozen-plus-live pattern: colour- and type-bearing keys only.
function buildLiveStyles(t) {
  return {
    optionText: { ...t.type.bodyStrong, color: t.colors.textPrimary },
  };
}
