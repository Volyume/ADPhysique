import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import useAppStore from '../store/useAppStore';
import { colors, fontSize, fontWeight, spacing, radius, withAlpha } from '../styles/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const NUM_PARTICLES = 40;

function createParticle(index) {
  return {
    x: new Animated.Value(SCREEN_WIDTH / 2),
    y: new Animated.Value(SCREEN_HEIGHT / 2),
    opacity: new Animated.Value(1),
    scale: new Animated.Value(0),
    angle: (index / NUM_PARTICLES) * Math.PI * 2,
    distance: 80 + Math.random() * 180,
    // Decorative confetti palette: brand tokens plus two festive accents
    // that intentionally sit outside the UI palette for a one-off burst.
    /* eslint-disable-next-line no-restricted-syntax */
    color: [colors.primary, colors.gold, colors.success, '#FF6B35', '#9C27B0'][index % 5],
    size: 6 + Math.random() * 8,
  };
}

export default function PRCelebration({ pr, onDismiss, subdued = false }) {
  // Honour reduce-motion: a user who asked for calmer motion gets the subdued
  // toast (no confetti burst, no heavy haptic ladder) even when the parent
  // didn't pass subdued. This keeps the app's reduce-motion discipline intact
  // at a flagship moment rather than breaking it here.
  const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion);
  const subduedMode = subdued || !!reduceMotion;
  // Allocate particles only when we'll render them, subdued mode skips
  // particles entirely. Each particle's pre-translated offsets are baked
  // into translate constants instead of allocating new Animated.Values
  // every render (was a slow memory leak on long PR streaks).
  const particles = useRef(
    subduedMode ? [] : Array.from({ length: NUM_PARTICLES }, (_, i) => createParticle(i)),
  ).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.5)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timers = [];
    if (subduedMode) {
      Haptics.selectionAsync().catch(() => {});
      Animated.timing(cardOpacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      timers.push(setTimeout(onDismiss, 2200));
      return () => timers.forEach(clearTimeout);
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    timers.push(setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 150));
    timers.push(setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 300));

    const overlay = Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 0.85, duration: 200, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]);
    overlay.start();

    const particleAnims = particles.map((p, i) => {
      const targetX = SCREEN_WIDTH / 2 + Math.cos(p.angle) * p.distance;
      const targetY = SCREEN_HEIGHT / 2 + Math.sin(p.angle) * p.distance;

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

  const prIcon = pr.type === '1rm_estimate' ? 'trophy' :
    pr.type === 'heaviest_weight' ? 'barbell' : 'flash';

  const prLabel = pr.type === '1rm_estimate' ? 'New estimated max lift' :
    pr.type === 'heaviest_weight' ? 'New heaviest weight' : 'Most reps at weight';

  if (subduedMode) {
    return (
      <TouchableOpacity
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
    <TouchableOpacity
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
          { transform: [{ scale: cardScale }], opacity: cardOpacity },
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
    top: SCREEN_HEIGHT / 2 - 160,
    left: spacing.xl,
    right: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: withAlpha(colors.gold, 0.376),
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: withAlpha(colors.gold, 0.125),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  prBadge: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black,
    color: colors.gold,
    letterSpacing: 2,
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
    marginTop: 1,
  },
});
