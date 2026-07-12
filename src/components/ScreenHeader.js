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
 *
 * AX-07 (launch accessibility audit, 2026-07-12): the title always carries
 * accessibilityRole="header" -- it is the screen's primary heading on every
 * tab screen that uses this chrome, so VoiceOver/TalkBack heading
 * navigation can land on it directly.
 */

import { View, Text, StyleSheet } from 'react-native';
import { spacing, circle } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import { VolyumeIcon } from './BrandMark';

const BRAND_BOX = 34;
const BRAND_ICON_HEIGHT = 19;

function HeaderBrandMark({ backgroundColor }) {
  return (
    <View style={[styles.brandMark, { backgroundColor }]}>
      <VolyumeIcon size={BRAND_ICON_HEIGHT} />
    </View>
  );
}

export default function ScreenHeader({ title, subtitle, right }) {
  // CP-10 stage 1: live theme instead of the static colors/type imports, so
  // this shared tab-screen header re-renders correctly on a theme change.
  const t = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Text
          style={[styles.title, { ...t.type.h3, color: t.colors.textPrimary }]}
          numberOfLines={1}
          accessibilityRole="header"
        >
          {title}
        </Text>
        <View style={styles.right}>
          {right ?? <HeaderBrandMark backgroundColor={t.colors.chipInk} />}
        </View>
      </View>
      {subtitle ? (
        <Text style={[styles.subtitle, { ...t.type.bodySm, color: t.colors.textMuted }]} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

// Layout-only (theme-invariant): text colour / type role / brand-mark
// backing colour now come from the live theme per-render above (CP-10
// stage 1) so ScreenHeader follows a theme flip with no restart.
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
  },
  subtitle: {},
});
