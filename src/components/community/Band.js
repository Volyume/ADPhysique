/**
 * Band and BandGap (D221 visual law V1): the Community page is a stack of
 * full-bleed `surface` sections, no radius, no border, separated by a strip
 * of page colour the logger's `BAND` high. The band owns nothing but its
 * colour: the rows inside it carry the `spacing.lg` gutter themselves
 * (`inBand`), so their hairlines span the band.
 *
 * `BandLine` is the section-empty state (V10): one `bodySm` `textMuted` line
 * in a band, with at most one tertiary action beneath it.
 *
 * Props (Band): children, style.
 * Props (BandLine): text, action { label, onPress, accessibilityLabel? }.
 */
import { View, Text, StyleSheet } from 'react-native';
import Button from '../Button';
import useTheme from '../../hooks/useTheme';
import { spacing } from '../../styles/theme';
import { BAND } from '../../styles/layout';

export default function Band({ children, style }) {
  const t = useTheme();
  return <View style={[{ backgroundColor: t.colors.surface }, style]}>{children}</View>;
}

/** The strip of page colour between two bands. */
export function BandGap() {
  return <View style={styles.gap} />;
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
  gap: { height: BAND },
  line: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
});
