/**
 * SkeletonPersonRow: the placeholder for a `PersonRow`, in the SAME shape
 * as the row it stands in for.
 *
 * Founder defect 2026-09-14 ("it looks rubbish"): every Community list
 * used the shared `SkeletonRow`, which draws a 36 dp SQUARE at radius 6
 * behind 8 dp of its own horizontal padding, so its text column starts at
 * 56 while a real `PersonRow`'s starts at 44 and its avatar is a 32 dp
 * circle. Every Community screen therefore jumped sideways and changed
 * shape the moment data landed. The shared row is used by 40 other
 * screens whose rows are a different shape again, so this is a Community
 * row of its own rather than a change to that primitive.
 *
 * Tokens only; the two bars use the shared `Skeleton` so the shimmer and
 * the theme flip are the app's, not a second implementation.
 */

import { View, StyleSheet } from 'react-native';
import { Skeleton } from '../Skeleton';
import { spacing, circle } from '../../styles/theme';

const AVATAR = 32;

export default function SkeletonPersonRow({ style }) {
  return (
    <View style={[styles.row, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Skeleton width={AVATAR} height={AVATAR} radius={circle(AVATAR)} />
      <View style={styles.body}>
        <Skeleton width="52%" height={14} />
        <Skeleton width="34%" height={11} style={styles.second} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // No horizontal padding: the page pays the gutter, exactly as PersonRow.
  row: {
    flexDirection: 'row', alignItems: 'center', minHeight: 64, gap: spacing.md,
  },
  body: { flex: 1 },
  second: { marginTop: spacing.xs2 },
});
