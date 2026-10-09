/**
 * SectionHeader (D221 visual law V2): the one section header for Community.
 * 56 dp tall at least (it grows when the title wraps to a second line, so a
 * long heading survives the x1.2 text scale), the title in `type.bodyStrong` `textPrimary`, announced as a
 * header, and at most one trailing action at `type.label` `textSecondary`
 * with a 48 dp target. No amber, no uppercase. Replaces `Eyebrow` and
 * `SectionLabel` in Community.
 *
 * Props:
 *   title     the section's name
 *   trailing  optional { label, onPress, accessibilityLabel? }
 *   flush     drop the inline gutter, for a header inside a sheet or a body
 *             that already pays it (D221 lane 2B); additive
 */
import { View, Pressable, StyleSheet } from 'react-native';
import Text from '../Text';
import { spacing } from '../../styles/theme';
import { touchTarget } from '../../styles/layout';
import SectionLabel from '../SectionLabel';
import useTheme from '../../hooks/useTheme';

// Founder verdict 2026-10-08 ("one app all together"): the 56 dp bodyStrong
// header of D221 law V2 is withdrawn. The title is the house SectionLabel
// overline (type.overline, textSecondary, uppercase) as Today uses it for a
// card eyebrow; the optional trailing action keeps its 48 dp target.
export const SECTION_HEADER_HEIGHT = 44;

export default function SectionHeader({ title, trailing, flush = false }) {
  const t = useTheme();
  return (
    <View style={[styles.wrap, { paddingHorizontal: t.screenPadding }, flush && styles.flush]}>
      <SectionLabel style={styles.title} heading numberOfLines={2}>
        {title}
      </SectionLabel>
      {trailing ? (
        <Pressable
          onPress={trailing.onPress}
          style={styles.action}
          accessibilityRole="button"
          accessibilityLabel={trailing.accessibilityLabel || trailing.label}
        >
          <Text style={[t.type.label, { color: t.colors.textSecondary }]} numberOfLines={1}>
            {trailing.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: SECTION_HEADER_HEIGHT,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  flush: { paddingHorizontal: 0 },
  title: { flexShrink: 1 },
  action: {
    minHeight: touchTarget.minimum,
    minWidth: touchTarget.minimum,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
