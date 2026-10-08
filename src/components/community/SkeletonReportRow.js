/**
 * SkeletonReportRow (D221 visual law V10): the placeholder for one moderation
 * item (a report or a gym submission) in the shape it stands in for: a row of
 * small pills, two lines of text and the meta line, in a `surface` band with
 * the same inline padding and hairline as the real block. Uses the shared
 * `Skeleton`, so the shimmer and the theme flip are the app's.
 */
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '../Skeleton';
import useTheme from '../../hooks/useTheme';
import { spacing, radius } from '../../styles/theme';

const PILL_HEIGHT = 24;

export default function SkeletonReportRow() {
  const t = useTheme();
  return (
    <View
      style={[styles.row, { backgroundColor: t.colors.surface, borderBottomColor: t.colors.borderSubtle }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={styles.pills}>
        <Skeleton width={72} height={PILL_HEIGHT} radius={radius.full} />
        <Skeleton width={56} height={PILL_HEIGHT} radius={radius.full} />
      </View>
      <Skeleton width="86%" height={14} style={styles.line} />
      <Skeleton width="64%" height={14} style={styles.line} />
      <Skeleton width="40%" height={12} style={styles.meta} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pills: { flexDirection: 'row', gap: spacing.xs2 },
  line: { marginTop: spacing.sm },
  meta: { marginTop: spacing.sm },
});
