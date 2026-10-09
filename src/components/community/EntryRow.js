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
 *   destructive the title and icon in `error` (Leave Community, Delete)
 *   disabled    dimmed to `textMuted`, a no-op press, the accessibility state
 *               `disabled` (a row that is not available yet)
 *   accessibilityLabel  overrides the composed "title. subtitle"
 *   trailingActions  true when `trailing` holds a button (round 3R, SF2). It is
 *               detected for any trailing element that is not plain `Text`;
 *               pass it to force or to switch it off. The row is then NOT one
 *               accessible element: its text is a labelled group and each inner
 *               control carries its own label, so VoiceOver and TalkBack can
 *               reach "Accept", "Decline", "Change" and the like.
 */
import { Children, isValidElement } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '../Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import PressableCard from '../PressableCard';
import useTheme from '../../hooks/useTheme';
import { spacing, radius, iconSize } from '../../styles/theme';

const MARK = 36;
// NavRow's glyph size (components/NavRow.js: `size={18}`).
const NAV_ICON = 18;
const MARK_BIG = 36; // one size, NavRow's tile
const ROW_ONE_LINE = 56;
const ROW_TWO_LINES = 64;
const ROW_BIG = 64; // one app: a door is a NavRow, not a taller row
const NOOP = () => {};

/** True for a trailing element that is more than a line of text. */
export function hasInteractiveTrailing(trailing) {
  if (trailing === undefined || trailing === null || trailing === false) return false;
  return Children.toArray(trailing).some((c) => isValidElement(c) && c.type !== Text);
}

export default function EntryRow({
  icon, leading, title, subtitle, trailing, onPress, onPressWithLayout, big = false, destructive = false, disabled = false, accessibilityLabel, trailingActions,
}) {
  const t = useTheme();
  const size = big ? MARK_BIG : MARK;
  const actions = trailingActions ?? hasInteractiveTrailing(trailing);
  const label = accessibilityLabel || [title, subtitle].filter(Boolean).join('. ');
  const pressable = !disabled && !!(onPress || onPressWithLayout);
  const ink = disabled ? t.colors.textMuted : (destructive ? t.colors.error : t.colors.textPrimary);
  return (
    <PressableCard
      onPress={disabled ? NOOP : onPress}
      onPressWithLayout={disabled ? undefined : onPressWithLayout}
      disabled={disabled || (!onPress && !onPressWithLayout)}
      accessibilityRole="button"
      accessibilityState={disabled ? { disabled: true } : undefined}
      accessibilityLabel={label}
      accessible={actions ? false : undefined}
      style={[
        styles.row,
        {
          minHeight: big ? ROW_BIG : (subtitle ? ROW_TWO_LINES : ROW_ONE_LINE),
          borderBottomColor: t.colors.borderSubtle,
        },
      ]}
    >
      <View style={styles.inner}>
        <View
          style={styles.group}
          accessible={actions ? true : undefined}
          accessibilityRole={actions ? (pressable ? 'button' : 'text') : undefined}
          accessibilityLabel={actions ? label : undefined}
        >
          {/* Founder verdict 2026-10-08 ("one app all together"): the row is
              the house NavRow anatomy (components/NavRow.js): a 36 dp
              surface2 tile with an 18 dp textSecondary glyph, a bodyStrong
              label, a caption sub-line, the chevron. `big` no longer makes
              a larger row; a door is a NavRow like every door on Coach. */}
          {leading || (icon ? (
            <View style={[styles.mark, { width: size, height: size, backgroundColor: t.colors.surface2 }]}>
              <Ionicons name={icon} size={NAV_ICON} color={disabled || destructive ? ink : t.colors.textSecondary} />
            </View>
          ) : null)}
          <View style={styles.text}>
            <Text style={[t.type.bodyStrong, { color: ink }]}>{title}</Text>
            {subtitle ? (
              <Text style={[t.type.caption, styles.sub, { color: disabled ? t.colors.textMuted : t.colors.textSecondary }]}>{subtitle}</Text>
            ) : null}
          </View>
        </View>
        {trailing === undefined ? (
          <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
        ) : trailing}
      </View>
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: spacing.lg, borderBottomWidth: 1, justifyContent: 'center' },
  inner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
  sub: { marginTop: spacing.xxs },
  group: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1 },
  mark: { borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
