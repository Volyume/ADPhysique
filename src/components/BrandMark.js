import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../styles/theme';

/**
 * VolumeBarsMark — abstract V formed by five vertical bars at different heights.
 * Left bars descend toward centre; right bars ascend away from centre.
 * Purely geometric, no figures or dumbbells.
 */
export default function BrandMark({ size = 28, color = colors.primary, style }) {
  const unit = size / 28;

  // Heights as fractions of full height (left → right: tall, mid, short, mid, tall)
  const barHeights = [1.0, 0.72, 0.44, 0.72, 1.0];
  const barWidth   = Math.round(4 * unit);
  const barGap     = Math.round(3 * unit);
  const totalWidth = barHeights.length * barWidth + (barHeights.length - 1) * barGap;

  return (
    <View style={[{ width: totalWidth, height: size, alignItems: 'flex-end', flexDirection: 'row' }, style]}>
      {barHeights.map((frac, i) => {
        const h = Math.round(frac * size);
        const isCenter = i === 2;
        const barColor = isCenter ? (color + 'AA') : color;
        return (
          <View
            key={i}
            style={{
              width: barWidth,
              height: h,
              borderRadius: Math.round(barWidth / 2),
              backgroundColor: barColor,
              marginLeft: i === 0 ? 0 : barGap,
            }}
          />
        );
      })}
    </View>
  );
}

export function BrandWordmark({ size = 28, color = colors.primary, style }) {
  return (
    <View style={[styles.wordmarkRow, style]}>
      <BrandMark size={size * 0.75} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  wordmarkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
