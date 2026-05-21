import React from 'react';
import { View, Text, StyleSheet, Image as RNImage } from 'react-native';
import { colors, fontWeight } from '../styles/theme';

// Try expo-image first for disk cache + faster decode. Falls back to
// the RN Image if @expo-image isn't installed yet (e.g. before the
// user has run `npx expo install expo-image`). The fallback keeps the
// app building during the migration.
let ImageComp = RNImage;
try {
  // eslint-disable-next-line global-require, import/no-unresolved
  const { Image: ExpoImage } = require('expo-image');
  if (ExpoImage) ImageComp = ExpoImage;
} catch (_) { /* expo-image not installed yet, use RN Image */ }

const ICON = require('../../assets/volyume-icon.png');

/**
 * VolyumeMark — the V logo mark as a static PNG asset.
 * size controls both width and height (the asset is square).
 * color/accent props are accepted for legacy compat but are unused.
 *
 * Uses expo-image when available (disk cache, faster decode, blurhash
 * support for any future cloud-loaded images), falls back to RN
 * Image so the app keeps working pre-install.
 */
export function VolyumeMark({ size = 28, color, accent, style }) {
  return (
    <ImageComp
      source={ICON}
      style={[{ width: size, height: size, borderRadius: size * 0.1 }, style]}
      contentFit="contain"
      // RN Image uses resizeMode; expo-image uses contentFit. Pass both
      // so whichever component is mounted reads the right prop.
      resizeMode="contain"
      accessibilityLabel="Volyume"
    />
  );
}

/**
 * VolyumeWordmark — V mark + VOLYUME text side by side.
 */
export function VolyumeWordmark({ size = 28, color, accent, style }) {
  const textColor = color || colors.textPrimary;
  const textSize = size * 0.72;
  return (
    <View style={[styles.wordmark, style]}>
      <VolyumeMark size={size} />
      <Text style={[styles.wordmarkText, { fontSize: textSize, color: textColor }]}>
        VOLYUME
      </Text>
    </View>
  );
}

/**
 * BrandTag — V mark + 'olyume' flush together as one logotype.
 */
export function BrandTag({ size = 15, color, accent, style }) {
  const textColor = color || colors.textPrimary;
  const markSize = size * 1.6;
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
      <VolyumeMark size={markSize} />
      <Text
        style={{
          fontSize: size,
          fontWeight: fontWeight.bold,
          color: textColor,
          letterSpacing: 0.2,
          marginLeft: 4,
          includeFontPadding: false,
        }}
      >
        olyume
      </Text>
    </View>
  );
}

export default VolyumeMark;

const styles = StyleSheet.create({
  wordmark: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wordmarkText: {
    fontWeight: fontWeight.black,
    letterSpacing: 2,
    includeFontPadding: false,
  },
});
