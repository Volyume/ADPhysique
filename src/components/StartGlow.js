/**
 * StartGlow (E15 element 3, approved 2026-07-03;
 * audit/e15-signature-elements.md §3). The app's ONE glow: a soft Skia
 * radial bloom behind the Home hero "Start workout" button, with an
 * optional slow breathe (opacity 1 ↔ 0.6 over a motion-derived ~4.5s loop,
 * one glowing object in the entire app).
 *
 * Hard rules, all from the approved treatment:
 *   - EXACTLY ONE importer (HomeScreen's hero Start). A source guard pins
 *     it; Log set, coach Apply and the Paywall CTA are explicitly excluded.
 *   - Reduce Motion: static bloom, no breathe.
 *   - Calm mode or an open ED flag: the bloom is suppressed entirely and
 *     the button falls back to the standard flat amber fill. The check
 *     fails QUIET (no glow until the state loads cleanly).
 */
import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, Rect, RadialGradient, vec } from '@shopify/react-native-skia';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
} from 'react-native-reanimated';
import useAppStore from '../store/useAppStore';
import { colors, motion, withAlpha } from '../styles/theme';

const HALO = 24;

export default function StartGlow({ style, children }) {
  const reduceMotion = useAppStore((s) => !!s.accessibility?.reduceMotion);
  const userId = useAppStore((s) => s.user?.id);
  const [size, setSize] = useState(null);
  // Fail quiet: suppressed until the calm/ED read resolves cleanly.
  const [suppressed, setSuppressed] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // Lazy-required: same calm/ED sources the celebration surfaces gate on.
        // eslint-disable-next-line global-require
        const { getOpenEdPatternFlag } = require('../lib/database');
        // eslint-disable-next-line global-require
        const { getWellbeingMode, isCalm } = require('../lib/wellbeing');
        const [edFlag, wellbeing] = await Promise.all([
          userId ? getOpenEdPatternFlag(userId).catch(() => null) : Promise.resolve(null),
          getWellbeingMode().catch(() => 'unspecified'),
        ]);
        if (active) setSuppressed(!!edFlag || isCalm(wellbeing));
      } catch (_) { /* stay suppressed */ }
    })();
    return () => { active = false; };
  }, [userId]);

  const breathe = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion || suppressed) { breathe.value = 1; return; }
    // ~4.5s per direction (motion.pulse * 6): a breath, not a blink.
    breathe.value = withRepeat(withTiming(0.6, { duration: motion.pulse * 6 }), -1, true);
  }, [reduceMotion, suppressed, breathe]);
  const breatheStyle = useAnimatedStyle(() => ({ opacity: breathe.value }));

  const w = size ? size.w + HALO * 2 : 0;
  const h = size ? size.h + HALO * 2 : 0;

  return (
    <View
      style={style}
      onLayout={(e) => setSize({
        w: Math.round(e.nativeEvent.layout.width),
        h: Math.round(e.nativeEvent.layout.height),
      })}
    >
      {!suppressed && size ? (
        <Animated.View pointerEvents="none" style={[styles.halo, breatheStyle]}>
          <Canvas style={{ width: w, height: h }}>
            <Rect x={0} y={0} width={w} height={h}>
              <RadialGradient
                c={vec(w / 2, h / 2)}
                r={Math.max(w, h) / 2}
                colors={[withAlpha(colors.primary, 0.353), withAlpha(colors.primary, 0)]}
              />
            </Rect>
          </Canvas>
        </Animated.View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  halo: { position: 'absolute', top: -HALO, left: -HALO },
});
