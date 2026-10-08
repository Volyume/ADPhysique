/**
 * SkeletonPostRow (D221 visual law V10): the placeholder for a `PostRow`, in
 * the same shape as the row it stands in for (identity line, achievement
 * line, stats line, reaction bar) so nothing shifts when posts arrive. It
 * sits in a `surface` band with the same inline padding as the real row.
 * Uses the shared `Skeleton`, so the shimmer and the theme flip are the
 * app's.
 */
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '../Skeleton';
import useTheme from '../../hooks/useTheme';
import { spacing, circle } from '../../styles/theme';

const AVATAR = 36;

export default function SkeletonPostRow({ style }) {
  const t = useTheme();
  return (
    <View
      style={[styles.row, { backgroundColor: t.colors.surface, borderBottomColor: t.colors.borderSubtle }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={styles.identity}>
        <Skeleton width={AVATAR} height={AVATAR} radius={circle(AVATAR)} />
        <Skeleton width="30%" height={14} />
      </View>
      <Skeleton width="58%" height={16} style={styles.achievement} />
      <Skeleton width="72%" height={12} style={styles.stats} />
      <Skeleton width="24%" height={14} style={styles.reactions} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  achievement: { marginTop: spacing.sm },
  stats: { marginTop: spacing.xs2 },
  reactions: { marginTop: spacing.lg },
});
