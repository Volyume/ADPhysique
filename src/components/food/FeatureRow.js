/**
 * FeatureRow: the diary's one full-width "feature door" row -- an icon
 * box on the left, a title, a one-line sub, a chevron on the right.
 *
 * Founder order 2026-09-22/23, on a live screenshot of the Nutrition tab:
 * the day-tools Chips ("Meal builder" / "Higher-calorie day") read as
 * "ugly pills... only to one side", not features in their own right. This
 * is THE shared anatomy behind that fix, first lifted from the row the
 * retired EmptyDiary card hand-rolled for its "Meal builder" promo.
 * D230 R1 retired EmptyDiary (the workspace is the same on every day), so
 * DiaryScreen.js's feature list under the log is the one caller: "Meal
 * builder", "Copy yesterday" and "Higher-calorie day" are all this row.
 *
 * D230 R2 (one amber on the Diary): the icon tile is INK, NavRow's
 * treatment (NavRow.js header, D214): a `surface2` tile behind a
 * `textSecondary` glyph, so a list of doors carries no accent of its own.
 *
 * `bordered` (default true) draws the row's own border/radius on the
 * `surface` tier, for a row standing alone. Pass `bordered={false}` when
 * the caller already wraps a short LIST of these rows in one
 * bordered/rounded surface (DiaryScreen's feature list), so the list reads
 * as one card with flush rows inside it, never cards inside a card.
 * `divider` draws a bottom hairline on a flush row that has another row
 * directly below it in that shared list -- never a full border, so the
 * list still reads as one card.
 */
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import Text from '../Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import { spacing, radius, type, hitSlop, iconSize } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';

export default function FeatureRow({
  icon,
  title,
  sub,
  onPress,
  accessibilityLabel,
  bordered = true,
  divider = false,
}) {
  const t = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.row,
        bordered && [styles.rowBordered, { borderColor: t.colors.borderSubtle, backgroundColor: t.colors.surface }],
        divider && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.colors.borderSubtle },
      ]}
      onPress={onPress}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={[styles.iconBox, { backgroundColor: t.colors.surface2 }]}>
        <Ionicons name={icon} size={18} color={t.colors.textSecondary} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: t.colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.sub, { color: t.colors.textSecondary }]}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    alignSelf: 'stretch',
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowBordered: {
    borderWidth: 1,
    borderRadius: radius.md,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  copy: { flex: 1, minWidth: 0, alignItems: 'flex-start' },
  title: { ...type.label },
  sub: { ...type.caption, marginTop: 2, textAlign: 'left' },
});
