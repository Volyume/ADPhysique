/**
 * SkeletonFormBand (D221 visual law V10): the placeholder for a form screen,
 * in the shape of what it stands in for: bands separated by the page strip,
 * each a header bar over wells at the field height (44 dp). Replaces the
 * square `SkeletonRow` and the tall `SkeletonCard` that stood in for a form
 * stack, so nothing shifts when the fields arrive. Uses the shared `Skeleton`.
 *
 * Props:
 *   bands   how many bands to draw (default 3)
 *   wells   how many wells in each band (default 2)
 */
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '../Skeleton';
import Band, { BandGap } from './Band';
import useTheme from '../../hooks/useTheme';
import { spacing, radius } from '../../styles/theme';

const WELL = 44;
const HEADER = 56;

export default function SkeletonFormBand({ bands = 3, wells = 2 }) {
  const t = useTheme();
  const list = Array.from({ length: bands }, (_, i) => i);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ backgroundColor: t.colors.background }}
    >
      {list.map((b) => (
        <View key={b}>
          <Band>
            <View style={styles.header}>
              <Skeleton width="34%" height={16} />
            </View>
            <View style={styles.body}>
              {Array.from({ length: wells }, (_, w) => (
                <Skeleton key={w} width="100%" height={WELL} radius={radius.md} />
              ))}
            </View>
          </Band>
          {b < bands - 1 ? <BandGap /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { height: HEADER, justifyContent: 'center', paddingHorizontal: spacing.lg },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm },
});
