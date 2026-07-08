/**
 * ScreenHeader
 *
 * Unified top-of-screen header used by Today, Train, Eat, Progress and
 * Coach. Renders the page title on the left and the compact Volyume V on
 * the right. Full wordmarks stay reserved for splash/login/hero moments;
 * repeated app chrome uses the V so the page title remains the readable
 * anchor.
 *
 * Constants:
 *   - BRAND_BOX (34): matches the compact Eat header treatment and gives
 *     the transparent V a consistent black backing on every tab screen.
 *   - BRAND_ICON_HEIGHT (19): keeps the V optically aligned with a 24pt
 *     bold title without dominating the row.
 *   - paddingBottom keeps the same airy gap below the header that
 *     the previous design used.
 */

import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, circle, type } from '../styles/theme';
import { VolyumeIcon } from './BrandMark';

const BRAND_BOX = 34;
const BRAND_ICON_HEIGHT = 19;

function HeaderBrandMark() {
  return (
    <View style={styles.brandMark}>
      <VolyumeIcon size={BRAND_ICON_HEIGHT} />
    </View>
  );
}

export default function ScreenHeader({ title, subtitle, right }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <View style={styles.right}>
          {right ?? <HeaderBrandMark />}
        </View>
      </View>
      {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xxs,
    paddingBottom: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    // Align to title baseline rather than block centre so a header with
    // a subtitle below doesn't push the wordmark off-axis.
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  title: {
    ...type.h3,
    color: colors.textPrimary,
    flex: 1,
  },
  right: {
    marginLeft: spacing.sm,
  },
  brandMark: {
    width: BRAND_BOX,
    height: BRAND_BOX,
    borderRadius: circle(BRAND_BOX),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.camera,
  },
  subtitle: {
    ...type.bodySm,
    color: colors.textMuted,
  },
});
