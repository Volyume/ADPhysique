/**
 * EntryRow (D221 visual law V3): a row in a band that is a door or a line of
 * settings rather than a person. A roster row is 64 dp with two lines and
 * 56 dp with one; a large entry row (`big`, a door such as a Find people
 * option) is 88 dp with a 44 dp icon tile in `surface2` at `radius.md`, its
 * title at `type.title` and its subtitle at `type.bodySm`. A hairline spans
 * the band below it, a chevron (or the caller's `trailing`) sits at the end,
 * and the whole row is a `PressableCard`, so it has the house press feedback
 * and a 48 dp minimum target.
 *
 * The same anatomy the Hub uses for its own rows, extracted here for the
 * list and detail screens so the two do not drift.
 *
 * Props:
 *   icon        Ionicons name for the leading mark (a `surface2` tile)
 *   leading     a node used instead of the icon tile (an avatar)
 *   title       the row's name
 *   subtitle    optional second line (not truncated: a requirement is a
 *               sentence the person needs whole)
 *   trailing    a node in place of the chevron; `null` for nothing
 *   onPress, onPressWithLayout  the open handlers (the latter is D188)
 *   big         the large entry row
 *   accessibilityLabel  overrides the composed "title. subtitle"
 */
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import PressableCard from '../PressableCard';
import useTheme from '../../hooks/useTheme';
import { spacing, radius, iconSize } from '../../styles/theme';

const MARK = 32;
const MARK_BIG = 44;
const ROW_ONE_LINE = 56;
const ROW_TWO_LINES = 64;
const ROW_BIG = 88;

export default function EntryRow({
  icon, leading, title, subtitle, trailing, onPress, onPressWithLayout, big = false, accessibilityLabel,
}) {
  const t = useTheme();
  const size = big ? MARK_BIG : MARK;
  return (
    <PressableCard
      onPress={onPress}
      onPressWithLayout={onPressWithLayout}
      disabled={!onPress && !onPressWithLayout}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || [title, subtitle].filter(Boolean).join('. ')}
      style={[
        styles.row,
        {
          minHeight: big ? ROW_BIG : (subtitle ? ROW_TWO_LINES : ROW_ONE_LINE),
          borderBottomColor: t.colors.borderSubtle,
        },
      ]}
    >
      <View style={styles.inner}>
        {leading || (icon ? (
          <View style={[styles.mark, { width: size, height: size, backgroundColor: t.colors.surface2 }]}>
            <Ionicons name={icon} size={big ? iconSize.lg : iconSize.md} color={t.colors.textPrimary} />
          </View>
        ) : null)}
        <View style={styles.text}>
          <Text style={[big ? t.type.title : t.type.body, { color: t.colors.textPrimary }]}>{title}</Text>
          {subtitle ? (
            <Text style={[t.type.bodySm, { color: t.colors.textSecondary }]}>{subtitle}</Text>
          ) : null}
        </View>
        {trailing === undefined ? (
          <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
        ) : trailing}
      </View>
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, justifyContent: 'center' },
  inner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  text: { flex: 1 },
  mark: { borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
