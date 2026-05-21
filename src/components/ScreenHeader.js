/**
 * ScreenHeader
 *
 * Unified top-of-screen header used by Train, Plans, Progress and
 * Athlete Hub. Standardises the V brand mark's size and vertical
 * anchor so it lands in the same place on every tab regardless of
 * whether the header has a subtitle.
 *
 * Why this exists: previously each screen rolled its own header. The V
 * icon used size 38 on a single-line header (Plans, Progress, Hub) AND
 * on a two-line header (Train), which meant on Plans the V looked
 * taller than the title text and sat lower than the user expected. The
 * fix here:
 *   - one icon size (28) across every screen
 *   - title row is its own row so the icon aligns with the title line,
 *     not the whole header block — same vertical position with or
 *     without a subtitle.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, fontWeight, spacing } from '../styles/theme';
import { VolyumeIcon } from './BrandMark';

export default function ScreenHeader({ title, subtitle, right }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <View style={styles.right}>
          {right ?? <VolyumeIcon size={28} />}
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    flex: 1,
  },
  right: {
    marginLeft: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});
