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
import { colors, fontSize, fontWeight, spacing, radius, withAlpha, circle, motion, letterSpacing, alpha } from '../styles/theme';

const NUM_PARTICLES = 40;

// Decorative confetti palette: brand tokens plus the two festive accents,
// tokenised in D0 (design audit 03) so no raw hex remains here. The gold-only
// variant dresses the big milestone rungs (D2).
const PR_PALETTE = [colors.primary, colors.gold, colors.success, colors.celebrationEmber, colors.celebrationViolet];
const GOLD_PALETTE = [colors.gold, colors.celebrationEmber, colors.gold];

function createParticle(index, palette = PR_PALETTE, screenWidth, screenHeight) {
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
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const particles = useRef(
    reduceMotion ? [] : Array.from({ length: NUM_PARTICLES }, (_, i) => createParticle(i, GOLD_PALETTE, screenWidth, screenHeight)),
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
  // Honour reduce-motion: a user who asked for calmer motion gets the subdued
  // toast (no confetti burst, no heavy haptic ladder) even when the parent
  // didn't pass subdued. This keeps the app's reduce-motion discipline intact
  // at a flagship moment rather than breaking it here.
  const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  // Wave A A1: a first-ever lift is an honest first, not a record, it beats
  // nothing, so it never gets the confetti/heavy-haptic PERSONAL RECORD
  // treatment. It always renders as the quiet toast variant below.
  const isFirstLift = pr?.type === 'first_lift';
  const subduedMode = subdued || !!reduceMotion || isFirstLift;
  // Allocate particles only when we'll render them, subdued mode skips
  // particles entirely. Each particle's pre-translated offsets are baked
  // into translate constants instead of allocating new Animated.Values
  // every render (was a slow memory leak on long PR streaks).
  const particles = useRef(
    subduedMode ? [] : Array.from({ length: NUM_PARTICLES }, (_, i) => createParticle(i, PR_PALETTE, screenWidth, screenHeight)),
  ).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.5)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timers = [];
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
    if (subduedMode) {
      // D2: the vocabulary call replaces raw expo-haptics, so the
      // reduce-motion gate covers this flagship moment too.
      haptics.selection();
      Animated.timing(cardOpacity, { toValue: 1, duration: motion.exit, useNativeDriver: true }).start();
      timers.push(setTimeout(onDismiss, 2200));
      return () => timers.forEach(clearTimeout);
    }

    // The PR ladder (Success + two heavy beats) lives in the vocabulary now.
    haptics.prAchieved();

    const overlay = Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 0.85, duration: motion.state, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]);
    overlay.start();

    const particleAnims = particles.map((p, i) => {
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

    const staggered = Animated.stagger(8, particleAnims);
    staggered.start();

    timers.push(setTimeout(onDismiss, 3000));
    return () => {
      timers.forEach(clearTimeout);
      try { staggered.stop(); overlay.stop(); } catch (_) {}
    };
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

  if (subduedMode) {
    return (
      <TouchableOpacity accessibilityRole="button"
        style={styles.toastWrap}
        activeOpacity={0.9}
        onPress={onDismiss}
      >
        <Animated.View style={[styles.toast, { opacity: cardOpacity }]}>
          <Ionicons name={prIcon} size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.toastTitle}>{prLabel}</Text>
            <Text style={styles.toastValue}>{pr.label}</Text>
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity accessibilityRole="button"
      style={StyleSheet.absoluteFillObject}
      activeOpacity={1}
      onPress={onDismiss}
    >
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />

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
              // Translate by a fixed -size/2 offset using a plain number;
              // Animated.add(value, new Animated.Value(...)) used to allocate
              // a new Animated.Value every render that was never released.
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

      <Animated.View
        style={[
          styles.card,
          { top: screenHeight / 2 - 160, transform: [{ scale: cardScale }], opacity: cardOpacity },
        ]}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={prIcon} size={48} color={colors.gold} />
        </View>
        <Text style={styles.prBadge}>PERSONAL RECORD</Text>
        <Text style={styles.prType}>{prLabel}</Text>
        <Text style={styles.prValue}>{pr.label}</Text>
        {pr.previousValue > 0 && pr.value > 0 && (() => {
          // Show "+X% over previous PR" so the user feels the magnitude.
          // Only show for meaningful improvements (>=1%); below that
          // it's float noise from the 1RM estimator.
          const pct = ((pr.value - pr.previousValue) / pr.previousValue) * 100;
          if (pct < 1) return null;
          return (
            <Text style={styles.prDelta}>
              +{pct.toFixed(pct >= 10 ? 0 : 1)}% over your previous best
            </Text>
          );
        })()}
        <Text style={styles.dismiss}>Tap to continue</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    // Near-black base; the dimming comes from the animated opacity at render.
    backgroundColor: colors.background,
  },
  particle: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  card: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: withAlpha(colors.gold, alpha.strong),
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: circle(88),
    backgroundColor: withAlpha(colors.gold, alpha.tint),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  prBadge: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black,
    color: colors.gold,
    letterSpacing: letterSpacing.wordmark,
    marginBottom: spacing.sm,
  },
  prType: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  prValue: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  prDelta: {
    fontSize: fontSize.sm,
    color: colors.gold,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  dismiss: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
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
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.semibold,
  },
  toastValue: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: fontWeight.bold,
    marginTop: spacing.hair,
  },
});
