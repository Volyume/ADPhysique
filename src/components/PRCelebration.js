import { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  useWindowDimensions,
} from 'react-native';
import useAppStore from '../store/useAppStore';
import { colors } from '../styles/theme';
import useTheme from '../hooks/useTheme';

const NUM_PARTICLES = 40;

// Decorative confetti palette: brand tokens plus the two festive accents,
// tokenised in D0 (design audit 03) so no raw hex remains here. The gold-only
// variant dresses the big milestone rungs (D2).
//
// CP-10 stage 3 (theming batch 2): these were module-scope consts baked at
// import time from the static `colors` singleton (class 2, CP-10 plan
// section 1.4) -- frozen until an app restart. Now built per-render from the
// live theme (src/hooks/useTheme.js), same pattern as Button.js's
// buildVariants/buildSizes (CP-10 stage 1).
function buildPrPalette(c) {
  return [c.primary, c.gold, c.success, c.celebrationEmber, c.celebrationViolet];
}
function buildGoldPalette(c) {
  return [c.gold, c.celebrationEmber, c.gold];
}

// Both call sites always pass an explicit palette (buildPrPalette/
// buildGoldPalette against the live theme); the default below only exists as
// a defensive fallback and intentionally uses the static `colors` singleton
// (never reached in practice, so it does not need to be theme-reactive).
function createParticle(index, palette = buildPrPalette(colors), screenWidth, screenHeight) {
  return {
    x: new Animated.Value(screenWidth / 2),
    y: new Animated.Value(screenHeight / 2),
    opacity: new Animated.Value(1),
    scale: new Animated.Value(0),
    angle: (index / NUM_PARTICLES) * Math.PI * 2,
    distance: 80 + Math.random() * 180,
    color: palette[index % palette.length],
    size: 6 + Math.random() * 8,
  };
}

/**
 * MilestoneBurst (D2, design audit 03 win #4): the PR particle burst in an
 * all-gold dress for the big session rungs (50/100). No overlay card, the
 * summary's milestone card carries the copy; this is pure celebration on top.
 * Renders nothing under reduce-motion (callers already gate on calm/ED).
 * Non-blocking: pointerEvents none, self-dismisses via onDone.
 */
export function MilestoneBurst({ onDone }) {
  const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion);
  const t = useTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const particles = useRef(
    reduceMotion ? [] : Array.from({ length: NUM_PARTICLES }, (_, i) => createParticle(i, buildGoldPalette(t.colors), screenWidth, screenHeight)),
  ).current;

  useEffect(() => {
    if (reduceMotion) { onDone?.(); return undefined; }
    const anims = particles.map((p, i) => {
      const targetX = screenWidth / 2 + Math.cos(p.angle) * p.distance;
      const targetY = screenHeight / 2 + Math.sin(p.angle) * p.distance;
      return Animated.sequence([
        Animated.delay(i * 20),
        Animated.parallel([
          Animated.spring(p.x, { toValue: targetX, tension: 80, friction: 6, useNativeDriver: true }),
          Animated.spring(p.y, { toValue: targetY, tension: 80, friction: 6, useNativeDriver: true }),
          Animated.spring(p.scale, { toValue: 1, tension: 100, friction: 7, useNativeDriver: true }),
          Animated.sequence([
            Animated.delay(500),
            Animated.timing(p.opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
          ]),
        ]),
      ]);
    });
    const staggered = Animated.stagger(8, anims);
    staggered.start();
    const t = setTimeout(() => onDone?.(), 2400);
    return () => {
      clearTimeout(t);
      try { staggered.stop(); } catch (_) {}
    };
    // Runs once per mount; the parent keys/mounts it per milestone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (reduceMotion || particles.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.particle,
            {
              backgroundColor: p.color,
              width: p.size,
              height: p.size,
              borderRadius: p.size / 2,
              transform: [
                { translateX: p.x },
                { translateY: p.y },
                { translateX: -p.size / 2 },
                { translateY: -p.size / 2 },
                { scale: p.scale },
              ],
              opacity: p.opacity,
            },
          ]}
        />
      ))}
    </View>
  );
}

// The in-session record toast that lived here (a floating surface, bottom-
// docked from 2026-08-18) is RETIRED under D220 addendum 36: the record is a
// line of the exercise card now (src/components/workout/session/RecordLine.js).
// MilestoneBurst stays: it belongs to the summary screen, where the session
// is over and nothing is interrupted.

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
