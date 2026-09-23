/**
 * HeaderAction: a small generic pressable pill for a ScreenHeader's
 * `right` slot -- a glyph plus a captionStrong label, on `surface2` with
 * a hairline border, minHeight 44 (the platform touch-target floor).
 *
 * Founder order 2026-09-22/23: the Nutrition tab's "Trends" door moves
 * out of the day-tools chip row (which read as "ugly pills... only to
 * one side") and into the header's right slot as a labelled action, so
 * it reads as header chrome, not another feature competing with the log
 * underneath. Modelled on the layout of
 * `components/community/CommunityHeaderAction.js` (box sizing, radius,
 * label type), but generic: no Community badge/dot state, just an icon,
 * a label and an onPress the caller supplies. CommunityHeaderAction
 * itself is untouched.
 */
import { Pressable, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { spacing, circle, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';

const MIN_HEIGHT = 44;
const GLYPH = 18;

export default function HeaderAction({ icon, label, onPress, accessibilityLabel }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={spacing.md}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={[
        styles.box,
        { backgroundColor: t.colors.surface2, borderColor: t.colors.border },
      ]}
    >
      <Ionicons name={icon} size={GLYPH} color={t.colors.primary} />
      <Text style={[styles.label, { color: t.colors.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    minHeight: MIN_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: circle(MIN_HEIGHT),
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    ...type.captionStrong,
  },
});
