/**
 * ProgressRing: the determinate ring over the frozen preview while a video
 * is being made (D229; the UX research's P6 pattern, NN/g's "percent-done
 * for anything over about ten seconds"). The track is the subtle border
 * tone, the fill the brand amber, the number in tabular numerals. Drawn
 * with Skia so it matches the card's own marks; no motion of its own
 * beyond the fill following `progress`.
 */
import { View, StyleSheet } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import Text from '../Text';
import useTheme from '../../hooks/useTheme';

export const RING_SIZE = 84;
const STROKE = 6;

/** The arc path for `progress` (0..1) on a ring of `size`, starting at the top. Pure. */
export function ringPath(size, progress, stroke = STROKE) {
  const p = Math.min(1, Math.max(0, Number(progress) || 0));
  const path = Skia.Path.Make();
  const inset = stroke / 2;
  const rect = { x: inset, y: inset, width: size - stroke, height: size - stroke };
  if (p > 0) path.addArc(rect, -90, 360 * p);
  return path;
}

export default function ProgressRing({ progress = 0, size = RING_SIZE, label = null }) {
  const t = useTheme();
  const pct = Math.round(Math.min(1, Math.max(0, Number(progress) || 0)) * 100);
  const track = Skia.Path.Make();
  track.addOval({ x: STROKE / 2, y: STROKE / 2, width: size - STROKE, height: size - STROKE });
  return (
    <View
      style={[styles.wrap, { width: size, height: size }]}
      accessibilityRole="progressbar"
      accessibilityLabel={label || 'Making your video'}
      accessibilityValue={{ min: 0, max: 100, now: pct, text: `${pct} percent` }}
    >
      <Canvas style={{ width: size, height: size }}>
        <Path path={track} style="stroke" strokeWidth={STROKE} color={t.colors.borderSubtle} />
        <Path path={ringPath(size, progress)} style="stroke" strokeWidth={STROKE} strokeCap="round" color={t.colors.primary} />
      </Canvas>
      <View style={styles.centre} pointerEvents="none">
        <Text style={[t.type.w(t.type.num('body'), 'bold'), { color: t.colors.textPrimary, fontVariant: ['tabular-nums'] }]}>{pct}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  centre: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});
