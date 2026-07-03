/**
 * StartGlow (E15 element 3, approved 2026-07-02; revised STATIC-ONLY by the
 * founder on device review 2026-07-03: "2. Static only" — the breathe loop
 * is retired, do not reintroduce it). The app's ONE glow: a soft static
 * Skia radial bloom behind the Home hero "Start workout" button.
 *
 * Hard rules, all from the approved treatment:
 *   - EXACTLY ONE importer (HomeScreen's hero Start). A source guard pins
 *     it; Log set, coach Apply and the Paywall CTA are explicitly excluded.
 *   - No animation of any kind (founder 2026-07-03).
 *   - Calm mode or an open ED flag: the bloom is suppressed entirely and
 *     the button falls back to the standard flat amber fill. The check
 *     fails QUIET (no glow until the state loads cleanly).
 */
import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, Rect, RadialGradient, vec } from '@shopify/react-native-skia';
import useAppStore from '../store/useAppStore';
import { colors, withAlpha } from '../styles/theme';

const HALO = 24;

export default function StartGlow({ style, children }) {
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
        <View pointerEvents="none" style={styles.halo}>
          <Canvas style={{ width: w, height: h }}>
            <Rect x={0} y={0} width={w} height={h}>
              <RadialGradient
                c={vec(w / 2, h / 2)}
                r={Math.max(w, h) / 2}
                colors={[withAlpha(colors.primary, 0.353), withAlpha(colors.primary, 0)]}
              />
            </Rect>
          </Canvas>
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  halo: { position: 'absolute', top: -HALO, left: -HALO },
});
