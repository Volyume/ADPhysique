/**
 * ScreenHeader
 *
 * Unified top-of-screen header used by Train, Plans, Progress and
 * Athlete Hub. Renders the page title on the left and the full
 * Volyume wordmark (V + lettering, one logotype) on the right. The
 * V-only icon used previously had a long lower tail that dipped
 * below the title baseline at every size, making the right edge of
 * every screen look misaligned vs the title text — the wordmark sits
 * flush with the cap height of the title.
 *
 * Constants:
 *   - WORDMARK_HEIGHT (22): matches the cap-height of a 24pt bold
 *     title so the right edge stays optically aligned across every
 *     screen, with or without a subtitle.
 *   - paddingBottom keeps the same airy gap below the header that
 *     the previous design used.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, fontWeight, spacing } from '../styles/theme';
import { VolyumeMark } from './BrandMark';

const WORDMARK_HEIGHT = 22;

export default function ScreenHeader({ title, subtitle, right }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <View style={styles.right}>
          {right ?? <VolyumeMark size={WORDMARK_HEIGHT} />}
        </View>
      </View>
      {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 2,
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
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    flex: 1,
  },
  right: {
    marginLeft: spacing.sm,
    // Optical centring: wordmark sits a hair below the bold cap line
    // so its baseline aligns with the title baseline.
    paddingTop: 2,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});
