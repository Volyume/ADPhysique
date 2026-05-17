import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontWeight } from '../styles/theme';

let Svg, Path;
try {
  const svgLib = require('react-native-svg');
  Svg = svgLib.default || svgLib.Svg;
  Path = svgLib.Path;
} catch (_) {}

/**
 * VolyumeMark — a clean V with a thin cyan accent stroke on the right arm.
 * Premium training-data feel. No bars, no dumbbell, no generic icons.
 *
 * V structure:
 *   Left arm:  top-left → bottom-center  (white/textPrimary, thick)
 *   Right arm: bottom-center → top-right (white/textPrimary, thick)
 *   Accent:    thin cyan stroke parallel to the right arm (inside)
 */
export function VolyumeMark({ size = 28, color, accent, style }) {
  const mainColor = color || colors.textPrimary;
  const accentColor = accent || colors.primary;

  if (Svg && Path) {
    // ViewBox 0 0 28 24, stroke-based V mark
    const sw = 3.2;   // main arm stroke width
    const saw = 1.8;  // accent stroke width
    return (
      <Svg
        width={size}
        height={size * (24 / 28)}
        viewBox="0 0 28 24"
        style={style}
      >
        {/* Left arm */}
        <Path
          d="M2 2 L14 22"
          stroke={mainColor}
          strokeWidth={sw}
          strokeLinecap="round"
          fill="none"
        />
        {/* Right arm */}
        <Path
          d="M14 22 L26 2"
          stroke={mainColor}
          strokeWidth={sw}
          strokeLinecap="round"
          fill="none"
        />
        {/* Cyan accent — shorter line inside the right arm */}
        <Path
          d="M16.5 22 L26 6"
          stroke={accentColor}
          strokeWidth={saw}
          strokeLinecap="round"
          fill="none"
          opacity={0.85}
        />
      </Svg>
    );
  }

  // Fallback — text V with accent dot
  return (
    <View style={[styles.fallback, style]}>
      <Text style={[styles.fallbackV, { fontSize: size, color: mainColor }]}>V</Text>
      <View style={[styles.fallbackAccent, { backgroundColor: accentColor, height: size * 0.6 }]} />
    </View>
  );
}

/**
 * VolyumeWordmark — the V mark + VOLYUME text together.
 */
export function VolyumeWordmark({ size = 28, color, accent, style }) {
  const textColor = color || colors.textPrimary;
  const textSize = size * 0.72;
  return (
    <View style={[styles.wordmark, style]}>
      <VolyumeMark size={size} color={color} accent={accent} />
      <Text style={[styles.wordmarkText, { fontSize: textSize, color: textColor }]}>
        VOLYUME
      </Text>
    </View>
  );
}

// Keep default export as the mark for backwards compat
export default VolyumeMark;

const styles = StyleSheet.create({
  fallback: { flexDirection: 'row', alignItems: 'flex-end' },
  fallbackV: { fontWeight: fontWeight.black, lineHeight: undefined },
  fallbackAccent: { width: 3, borderRadius: 2, marginLeft: 2 },
  wordmark: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wordmarkText: {
    fontWeight: fontWeight.black,
    letterSpacing: 2,
    includeFontPadding: false,
  },
});
