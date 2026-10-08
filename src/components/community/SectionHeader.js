/**
 * SectionHeader (D221 visual law V2): the one section header for Community.
 * 56 dp tall, the title in `type.bodyStrong` `textPrimary`, announced as a
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
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { spacing } from '../../styles/theme';
import { touchTarget } from '../../styles/layout';
import useTheme from '../../hooks/useTheme';

export const SECTION_HEADER_HEIGHT = 56;

export default function SectionHeader({ title, trailing, flush = false }) {
  const t = useTheme();
  return (
    <View style={[styles.wrap, flush && styles.flush]}>
      <Text
        style={[styles.title, t.type.bodyStrong, { color: t.colors.textPrimary }]}
        numberOfLines={1}
        accessibilityRole="header"
      >
        {title}
      </Text>
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
