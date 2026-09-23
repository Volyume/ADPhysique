/**
 * FeatureRow: the diary's one full-width "feature door" row -- an icon
 * box on the left, a title, a one-line sub, a chevron on the right.
 *
 * Founder order 2026-09-22/23, on a live screenshot of the Nutrition tab:
 * the day-tools Chips ("Meal builder" / "Higher-calorie day") read as
 * "ugly pills... only to one side", not features in their own right. This
 * is THE shared anatomy behind that fix -- lifted unchanged from the row
 * EmptyDiary.js used to hand-roll for its own "Meal builder" promo.
 * EmptyDiary.js (its own single row, inside the empty-day card) and
 * DiaryScreen.js (the day-with-entries feature list, directly under the
 * log) render this SAME component, never a copy, so the two can never
 * drift apart.
 *
 * `bordered` (default true) draws the row's own border/radius/surface2
 * background -- the look EmptyDiary's row always had, for a row standing
 * alone on a card. Pass `bordered={false}` when the caller already wraps
 * a short LIST of these rows in one bordered/rounded surface (DiaryScreen's
 * two-row feature list), so the list reads as one card with flush rows
 * inside it, never cards inside a card. `divider` draws a bottom hairline
 * on a flush row that has another row directly below it in that shared
 * list -- never a full border, so the list still reads as one card.
 */
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
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
        bordered && [styles.rowBordered, { borderColor: t.colors.border, backgroundColor: t.colors.surface2 }],
        divider && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.colors.borderSubtle },
      ]}
      onPress={onPress}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={[styles.iconBox, { backgroundColor: t.colors.surface }]}>
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
