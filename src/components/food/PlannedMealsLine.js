/**
 * PlannedMealsLine: the Diary's ONE planned-meals line (D231, app layout
 * rework, batch 3): "3 planned meals · Mark all eaten · Clear". It sits at the
 * top of the meals and replaces the banner that used to sit at the foot of the
 * page and the two one-time hint captions that taught it. "1 planned meal"
 * for one. The count is of planned MEALS (slots), not foods; the caller counts.
 *
 * The caller owns every action and every gate: it passes `canMarkEaten` false
 * on a future day (nothing there can have been eaten yet, so "Mark all
 * eaten" is not offered, as before), and does not render the line at all
 * while selecting or when nothing is planned. Both actions are full 48 dp
 * targets drawn in ink (one amber on the Diary). "Mark all eaten" carries
 * its own words as its spoken name, with a hint saying what it does.
 */
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Text from '../Text';
import { spacing, type } from '../../styles/theme';
import { touchTarget } from '../../styles/layout';
import useTheme from '../../hooks/useTheme';

// "3 planned meals" / "1 planned meal"
export function plannedMealsText(count) {
  const n = Number(count) || 0;
  return `${n} planned ${n === 1 ? 'meal' : 'meals'}`;
}

function Dot({ colour }) {
  // A visual separator only: the actions are separate buttons for a screen
  // reader, so the dot is not read.
  return (
    <Text
      style={[styles.dot, { color: colour }]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {'·'}
    </Text>
  );
}

export default function PlannedMealsLine({ count, canMarkEaten = true, onMarkAllEaten, onClear }) {
  const t = useTheme();
  if (!(count > 0)) return null;
  return (
    <View style={styles.row}>
      <Text style={[t.type.bodySm, { color: t.colors.textSecondary }]}>{plannedMealsText(count)}</Text>
      {canMarkEaten ? (
        <>
          <Dot colour={t.colors.textMuted} />
          <TouchableOpacity
            style={styles.action}
            onPress={onMarkAllEaten}
            hitSlop={{ left: spacing.xs, right: spacing.xs }}
            accessibilityRole="button"
            accessibilityLabel="Mark all eaten"
            accessibilityHint="Marks every planned meal on this day as eaten."
          >
            <Text style={[t.type.label, { color: t.colors.textPrimary }]}>Mark all eaten</Text>
          </TouchableOpacity>
        </>
      ) : null}
      <Dot colour={t.colors.textMuted} />
      <TouchableOpacity
        style={styles.action}
        onPress={onClear}
        hitSlop={{ left: spacing.xs, right: spacing.xs }}
        accessibilityRole="button"
        accessibilityLabel="Clear the planned meals"
      >
        <Text style={[t.type.label, { color: t.colors.textPrimary }]}>Clear</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // The line is text with two buttons in it, so it may wrap at a large text
  // size; each button keeps its own 48 dp height. The negative top margin
  // gives back the height the 48 dp buttons add above the text, so the line
  // sits close under the card it belongs to.
  row: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center',
    columnGap: spacing.xs,
    marginTop: -spacing.sm,
  },
  dot: { ...type.bodySm },
  action: {
    minHeight: touchTarget.minimum, justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
});
