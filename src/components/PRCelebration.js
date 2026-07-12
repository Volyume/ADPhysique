import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  AccessibilityInfo,
  useWindowDimensions,
} from 'react-native';
import * as haptics from '../lib/haptics';
import Ionicons from '@expo/vector-icons/Ionicons';
import useAppStore from '../store/useAppStore';
import { colors, fontSize, fontWeight, spacing, radius, motion, type } from '../styles/theme';
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

export default function PRCelebration({ pr, onDismiss, subdued = false }) {
  // R3 (remediation 2026-07-11, ruling D63): the full-screen grey overlay +
  // confetti takeover is RETIRED for in-session PRs. On the founder's device
  // walk it presented as a greyed-out screen with a stunted animation that
  // hung until tapped; and as a pattern it broke the logger's first
  // principle (never break the loop - a mid-session celebration must not
  // stand between the user and their next set; no elite logger interrupts
  // logging with a modal takeover). Every in-session celebration is now the
  // calm top toast the subdued path already proved: gold-accented for real
  // records, honest for first lifts, auto-dismissing, tappable to dismiss
  // early, never obscuring the inputs. The BIG celebratory moment
  // (MilestoneBurst above) stays on the summary screen, where the session
  // is over and nothing is interrupted. Calm-mode / reduce-motion users get
  // the identical surface, so the suppression rules are simpler and
  // strictly stronger than before.
  const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion);
  // CP-10 stage 3 (theming batch 2): live theme, same append-after pattern
  // as batch 1. `styles` stays frozen; `live` carries the colour/fontSize-
  // bearing keys only.
  const t = useTheme();
  const live = {
    toast: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    toastTitle: { ...t.type.captionStrong, color: t.colors.textMuted },
    toastValue: { fontSize: t.fontSize.md, color: t.colors.textPrimary },
  };
  // Wave A A1: a first-ever lift is an honest first, not a record, it beats
  // nothing, so it never gets record copy or the heavy haptic ladder.
  const isFirstLift = pr?.type === 'first_lift';
  // The subdued flag now gates only the HAPTIC weight (visuals are one calm
  // toast for everyone): calm / reduce-motion users and first lifts get the
  // light tick, a real record keeps the PR haptic ladder.
  const gentleHaptic = subdued || !!reduceMotion || isFirstLift;
  const toastOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // P9/E11: the celebration must be ANNOUNCED, not just shown. Spoken on
    // both paths (a subdued or calm user still gets the fact; only the
    // visual party is suppressed). No-op without a screen reader.
    try {
      if (pr?.type === 'first_lift') {
        // Never announced as a record: it is the honest first, nothing more.
        AccessibilityInfo.announceForAccessibility(
          `First lift logged${pr?.label ? `: ${pr.label}` : ''}.`,
        );
      } else {
        const spokenLabel = pr?.type === '1rm_estimate' ? 'New estimated max lift' :
          pr?.type === 'heaviest_weight' ? 'New heaviest weight' : 'Most reps at weight';
        AccessibilityInfo.announceForAccessibility(
          `Personal record. ${spokenLabel}${pr?.label ? `: ${pr.label}` : ''}.`,
        );
      }
    } catch (_) { /* best-effort */ }

    if (gentleHaptic) {
      // D2: the vocabulary call replaces raw expo-haptics, so the
      // reduce-motion gate covers this flagship moment too.
      haptics.selection();
    } else {
      // The PR ladder (Success + two heavy beats) lives in the vocabulary.
      haptics.prAchieved();
    }
    Animated.timing(toastOpacity, { toValue: 1, duration: motion.exit, useNativeDriver: true }).start();
    const timer = setTimeout(onDismiss, 2200);
    return () => clearTimeout(timer);
    // We do not depend on `pr` here because the parent (App.js) keys the
    // celebration off prCelebration; a new PR remounts the component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Defensive null guard, App.js gates this but a transient null during
  // the queue-pop tick would otherwise crash on `pr.type`.
  if (!pr) return null;

  const prIcon = pr.type === 'first_lift' ? 'barbell-outline' :
    pr.type === '1rm_estimate' ? 'trophy' :
    pr.type === 'heaviest_weight' ? 'barbell' : 'flash';

  const prLabel = pr.type === 'first_lift' ? 'First lift logged' :
    pr.type === '1rm_estimate' ? 'New estimated max lift' :
    pr.type === 'heaviest_weight' ? 'New heaviest weight' : 'Most reps at weight';

  return (
    <TouchableOpacity accessibilityRole="button"
      style={styles.toastWrap}
      activeOpacity={0.9}
      onPress={onDismiss}
    >
      <Animated.View style={[styles.toast, live.toast, { opacity: toastOpacity }]}>
        <Ionicons name={prIcon} size={20} color={isFirstLift ? t.colors.primary : t.colors.gold} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.toastTitle, live.toastTitle]}>{prLabel}</Text>
          <Text style={[styles.toastValue, live.toastValue]}>{pr.label}</Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  toastWrap: {
    position: 'absolute',
    top: spacing.xxl,
    left: spacing.lg,
    right: spacing.lg,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toastTitle: {
    ...type.captionStrong,
    color: colors.textMuted,
  },
  toastValue: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: fontWeight.bold,
    marginTop: spacing.hair,
  },
});
