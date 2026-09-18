/**
 * PressableCard
 *
 * Drop-in replacement for a TouchableOpacity wrapping a card-style
 * View. Adds a subtle press-in scale animation (0.97) plus a barely-
 * visible opacity dip so a tap feels tactile, the way Apple, Linear,
 * Whoop, and Spotify treat their primary tappable surfaces.
 *
 * Wave 6 M2 (audit 03b §4 step 2): the animation runs on Reanimated's
 * UI thread via the named spring family, springs.press in (settles
 * fast, no overshoot) and springs.release out (one tiny overshoot
 * beat), the token re-expression of the shipped speed 30/18 +
 * bounciness 6 feel. This file is the canonical press physics for
 * Button, Card, Chip, Stepper and every direct consumer.
 *
 * R6 (remediation 2026-07-11, founder defect build 2608): collapsed the
 * old two-view structure (a bare Pressable wrapping an inner
 * Reanimated.View that carried the caller's style) into ONE animated
 * pressable. The old shape silently discarded every layout-in-parent
 * style a caller passed (flex, alignSelf, width, margins): the style
 * landed on the inner view while the unstyled outer Pressable, the
 * element the parent actually lays out, shrink-wrapped its content. In
 * any flex row that left `flex: 1` buttons at text width, the class
 * behind the WorkoutSummary footer's dead band beside Close and
 * ActiveWorkout's under-width Log set bar, both regressed when those
 * bars adopted <Button> (5d98870, 2026-07-09). With a single view the
 * caller's style IS the element the parent lays out, and the press hit
 * area matches the visible bounds exactly (the old outer view could
 * stretch wider than the visible button, an invisible tap zone).
 * Pinned in pressableCard.rowLayout.guard.test.js.
 *
 * Reduce-motion users get a flat behaviour (no scale, no opacity
 * change) automatically. Honour the same a11y guard the rest of the
 * app uses.
 *
 * Use anywhere you currently have a TouchableOpacity holding a styled
 * View. Pass children just like TouchableOpacity. accessibilityRole
 * defaults to 'button'.
 */

import { useRef } from 'react';
import { Pressable } from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import useAppStore from '../store/useAppStore';
import { motion } from '../styles/theme';

const AnimatedPressable = Reanimated.createAnimatedComponent(Pressable);

export default function PressableCard({
  onPress,
  onLongPress,
  // Origin-aware variants (shared-element transitions, D31): when supplied,
  // the card measures its own on-screen rect {x, y, width, height} in window
  // coordinates at press time and hands it to the callback, so a pushed
  // screen can grow FROM the tapped card instead of the screen centre. If
  // the native handle can't be measured the callback still fires with null,
  // so a tap is never lost (the destination just falls back to centre zoom).
  // Behaviour is byte-identical for every consumer that doesn't pass these.
  onPressWithLayout,
  onLongPressWithLayout,
  disabled = false,
  style,
  children,
  accessibilityRole = 'button',
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
  testID,
  hitSlop,
  // Subtle by default. Pass scale={0.94} for a more pronounced press
  // on hero CTAs; anything below 0.92 looks heavy and slow.
  scale = 0.97,
}) {
  const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion);
  const pressed = useSharedValue(0); // 0 = at rest, 1 = fully pressed
  const viewRef = useRef(null);

  // Measure this card in window coordinates, then hand the rect to the
  // origin-aware callback. Falls back to a null rect when the native handle
  // isn't measurable so the action still fires (never a lost tap).
  function measureThen(cb) {
    if (!cb) return;
    const node = viewRef.current;
    if (node && typeof node.measureInWindow === 'function') {
      node.measureInWindow((x, y, width, height) => cb({ x, y, width, height }));
    } else {
      cb(null);
    }
  }

  // Only used when the origin-aware callbacks are supplied. Consumers that pass
  // a plain onPress/onLongPress keep that exact handler identity on the
  // Pressable below (byte-compatible), so nothing about their behaviour or
  // tree shape changes.
  function handlePressWithLayout() { measureThen(onPressWithLayout); }
  function handleLongPressWithLayout() { measureThen(onLongPressWithLayout); }

  function pressIn() {
    if (reduceMotion) return;
    pressed.value = withSpring(1, motion.springs.press);
  }

  function pressOut() {
    if (reduceMotion) return;
    pressed.value = withSpring(0, motion.springs.release);
  }

  const animatedStyle = useAnimatedStyle(() => {
    if (reduceMotion) return {};
    return {
      // The release spring's small undershoot past 0 extrapolates scale a
      // touch above 1, the deliberate settle beat the old bounciness gave.
      transform: [{ scale: interpolate(pressed.value, [0, 1], [1, scale]) }],
      opacity: interpolate(pressed.value, [0, 1], [1, 0.92]),
    };
  }, [reduceMotion, scale]);

  return (
    <AnimatedPressable
      ref={viewRef}
      onPress={onPressWithLayout ? handlePressWithLayout : onPress}
      onLongPress={onLongPressWithLayout ? handleLongPressWithLayout : onLongPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={disabled}
      hitSlop={hitSlop}
      testID={testID}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={accessibilityState}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
