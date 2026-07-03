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
 * Reduce-motion users get a flat behaviour (no scale, no opacity
 * change) automatically. Honour the same a11y guard the rest of the
 * app uses.
 *
 * Use anywhere you currently have a TouchableOpacity holding a styled
 * View. Pass children just like TouchableOpacity. accessibilityRole
 * defaults to 'button'.
 */

import { Pressable } from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import useAppStore from '../store/useAppStore';
import { motion } from '../styles/theme';

export default function PressableCard({
  onPress,
  onLongPress,
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
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={disabled}
      hitSlop={hitSlop}
      testID={testID}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={accessibilityState}
    >
      <Reanimated.View style={[style, animatedStyle]}>
        {children}
      </Reanimated.View>
    </Pressable>
  );
}
