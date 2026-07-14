/**
 * Premium progress ring. A Skia-rendered arc with a colour gradient and a soft
 * outer glow, over the same centre label/value/sub as the SVG Ring. It is wrapped
 * in an error boundary that falls back to the plain SVG Ring, so a graphics issue
 * can never blank a hero screen — the ring simply degrades to the SVG version.
 */
import { Component, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Canvas, Path, Skia, BlurMask, LinearGradient, vec } from '@shopify/react-native-skia';

import { colors, fonts } from './theme';
import { Ring } from './components';

export type GlowRingProps = {
  value: number;
  size?: number;
  stroke?: number;
  color: string;
  centerTop?: string;
  centerMain?: string;
  centerSub?: string;
};

function isEmptyDisplay(s?: string): boolean {
  return s === '—' || s === '-' || s === '' || s == null;
}

function SkiaRing({ value, size = 200, stroke = 18, color, centerTop, centerMain, centerSub }: GlowRingProps) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - stroke) / 2;

  const track = Skia.Path.Make();
  track.addCircle(cx, cy, r);
  const arc = Skia.Path.Make();
  if (clamped > 0) arc.addArc(Skia.XYWHRect(cx - r, cy - r, r * 2, r * 2), -90, 360 * clamped);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Canvas style={{ position: 'absolute', width: size, height: size }}>
        <Path path={track} style="stroke" strokeWidth={stroke} strokeCap="round" color={colors.surface} />
        {clamped > 0 ? (
          <>
            <Path path={arc} style="stroke" strokeWidth={stroke} strokeCap="round" color={color} opacity={0.55}>
              <BlurMask blur={14} style="normal" />
            </Path>
            <Path path={arc} style="stroke" strokeWidth={stroke} strokeCap="round">
              <LinearGradient start={vec(0, 0)} end={vec(size, size)} colors={[`${color}cc`, color]} />
            </Path>
          </>
        ) : null}
      </Canvas>
      <View style={[styles.center, { maxWidth: size - stroke * 2 - 16 }]}>
        {centerTop ? <Text style={styles.top} numberOfLines={2}>{centerTop}</Text> : null}
        {centerMain ? (
          <Text style={[styles.main, { color: isEmptyDisplay(centerMain) ? colors.textTertiary : color }]}>{centerMain}</Text>
        ) : null}
        {centerSub ? <Text style={styles.sub} numberOfLines={1}>{centerSub}</Text> : null}
      </View>
    </View>
  );
}

class RingBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function GlowRing(props: GlowRingProps) {
  return (
    <RingBoundary fallback={<Ring {...props} />}>
      <SkiaRing {...props} />
    </RingBoundary>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  top: { color: colors.textSecondary, fontSize: 12, fontFamily: fonts.textBold, letterSpacing: 1, textTransform: 'uppercase', textAlign: 'center' },
  main: { fontSize: 48, fontFamily: fonts.black, marginTop: 2 },
  sub: { color: colors.textSecondary, fontSize: 13, fontFamily: fonts.text, marginTop: 2 },
});
