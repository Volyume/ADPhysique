// Skeleton placeholder for loading states.
//
// Replaces full-screen ActivityIndicator spinners on data-heavy screens
// (HomeScreen, AnalyticsScreen, You etc.). Shows the structure
// of the real content using animated grey blocks so the app feels
// responsive before the data arrives.
//
// Usage:
//   <Skeleton width={120} height={18} />
//   <Skeleton width="80%" height={14} />
//   <SkeletonCard />            (preset: tall card shape)
//   <SkeletonRow />             (preset: list-row shape)
//
// Pattern: render the skeleton in place of the missing content, in
// the same layout slot, so when real data arrives there's no jump.
// The shimmer animation is paused under accessibility.reduceMotion.

import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../styles/theme';
import useAppStore from '../store/useAppStore';

export function Skeleton({ width = '100%', height = 14, style, radius: r = 6 }) {
  const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion);
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.85,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, pulse]);

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      style={[
        styles.base,
        { width, height, borderRadius: r, opacity: reduceMotion ? 0.6 : pulse },
        style,
      ]}
    />
  );
}

// Common compositions, use these where you have a known layout you're
// loading into, so the placeholder matches the real shape.
export function SkeletonCard({ height = 92, style }) {
  return (
    <View style={[styles.cardWrap, style, { minHeight: height }]}>
      <Skeleton width={120} height={12} />
      <Skeleton width="78%" height={20} style={{ marginTop: 10 }} />
      <Skeleton width="46%" height={12} style={{ marginTop: spacing.sm }} />
    </View>
  );
}

export function SkeletonRow({ style }) {
  return (
    <View style={[styles.rowWrap, style]}>
      <Skeleton width={36} height={36} r={8} />
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Skeleton width="68%" height={14} />
        <Skeleton width="42%" height={11} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: colors.surface3 },
  cardWrap: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  rowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
});
