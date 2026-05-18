import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, fontWeight } from '../styles/theme';

const ICON = require('../../assets/volyume-icon.png');

/**
 * VolyumeMark — the V logo mark as a static PNG asset.
 * size controls both width and height (the asset is square).
 * color/accent props are accepted for legacy compat but are unused.
 */
export function VolyumeMark({ size = 28, color, accent, style }) {
  return (
    <Image
      source={ICON}
      style={[{ width: size, height: size, borderRadius: size * 0.1 }, style]}
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
