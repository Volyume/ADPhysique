/**
 * ScreenHeader
 *
 * Unified top-of-screen header used by Today, Train, Eat, Progress and
 * Coach. Renders the page title on the left and the compact Volyume V on
 * the right. Full wordmarks stay reserved for splash/login/hero moments;
 * repeated app chrome uses the V so the page title remains the readable
 * anchor.
 *
 * The title is `h1` (32px InterDisplay-Bold). It had drifted to `h3` (20px
 * Inter-Medium), which left the five tab roots with no typographic anchor:
 * the page's own name rendered SMALLER than the card titles beneath it and
 * smaller than the 34px brand chip beside it, so nothing on the screen
 * ranked first. h1 is the app's existing screen-title size and sits in the
 * band Android's large top app bar (28sp) and iOS's large title (34pt) use.
 *
 * Constants:
 *   - BRAND_BOX (34): matches the compact Eat header treatment and gives
 *     the transparent V a consistent black backing on every tab screen. At
 *     h1 the chip finally reads as secondary to the title, not as the
 *     largest mark in the row.
 *   - BRAND_ICON_HEIGHT (19): keeps the V optically aligned with the title
 *     without dominating the row.
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
          style={[styles.title, { ...t.type.h1, color: t.colors.textPrimary }]}
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
    minHeight: 40,
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
