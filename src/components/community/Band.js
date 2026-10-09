/**
 * Band and BandGap. FOUNDER VERDICT 2026-10-08 (the first device walk of the
 * Community level-up): "NONE OF IT matches the rest of the app. It's meant
 * to be one app all together." The full-bleed band of D221 law V1 is
 * withdrawn. A Band is now exactly the house grouped container every other
 * tab root uses (`NavGroup` in components/NavRow.js, `Card` in Card.js):
 * `surface`, `radius.lg`, a 1 dp `borderSubtle` border, clipped corners,
 * inside the page's `spacing.lg` gutter. The rows inside keep the
 * `spacing.lg` gutter themselves (`inBand`), so their hairlines span the
 * group as NavRow's do. BandGap is the page rhythm the Coach tab uses
 * between blocks (`spacing.lg`), not the logger's strip.
 *
 * `BandLine` is the section-empty state (V10): one `bodySm` `textMuted` line
 * in a band, with at most one tertiary action beneath it.
 *
 * `BandBody` is the padded body of a form band: the `spacing.lg` gutter the
 * band's rows would carry, a `spacing.sm` rhythm between its fields, and a
 * `spacing.lg` foot (D221, lane 2B).
 *
 * Props (Band): children, style.
 * Props (BandBody): children, style.
 * Props (BandLine): text, action { label, onPress, accessibilityLabel? }.
 */
import { View, Text, StyleSheet } from 'react-native';
import Button from '../Button';
import useTheme from '../../hooks/useTheme';
import { spacing } from '../../styles/theme';
import { radius } from '../../styles/theme';

export default function Band({ children, style }) {
  const t = useTheme();
  return (
    <View style={[styles.group, { backgroundColor: t.colors.surface, borderColor: t.colors.borderSubtle }, style]}>
      {children}
    </View>
  );
}

/** The strip of page colour between two bands. */
export function BandGap() {
  return <View style={styles.gap} />;
}

/** The padded body of a form band: fields, hints and notes under a header. */
export function BandBody({ children, style }) {
  return <View style={[styles.body, style]}>{children}</View>;
}

/** A quiet section-empty line, with at most one tertiary action. */
export function BandLine({ text, action }) {
  const t = useTheme();
  return (
    <View style={styles.line}>
      <Text style={[t.type.bodySm, { color: t.colors.textMuted }]}>{text}</Text>
      {action ? (
        <Button
          variant="tertiary"
          size="sm"
          fullWidth={false}
          title={action.label}
          onPress={action.onPress}
          accessibilityLabel={action.accessibilityLabel || action.label}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // The house grouped container (NavRow.js `navGroup`), in the page gutter.
  group: {
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  // The Coach tab's gap between blocks (YouScreen `content`: gap spacing.lg).
  gap: { height: spacing.lg },
  body: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  line: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
});
