/**
 * PressableCard
 *
 * Drop-in replacement for a TouchableOpacity wrapping a card-style
 * View. Adds a subtle press-in scale animation (0.97) plus a barely-
 * visible opacity dip so a tap feels tactile, the way Apple, Linear,
 * Whoop, and Spotify treat their primary tappable surfaces.
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
import { Animated, Pressable } from 'react-native';
import useAppStore from '../store/useAppStore';

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
  const anim = useRef(new Animated.Value(1)).current;

  function pressIn() {
    if (reduceMotion) return;
    Animated.spring(anim, {
      toValue: scale,
      useNativeDriver: true,
      speed: 30,
      bounciness: 0,
    }).start();
  }

  function pressOut() {
    if (reduceMotion) return;
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 18,
      bounciness: 6,
    }).start();
  }

  const animatedStyle = reduceMotion
    ? null
    : { transform: [{ scale: anim }], opacity: anim.interpolate({
        inputRange: [scale, 1],
        outputRange: [0.92, 1],
      }) };

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
      <Animated.View style={[style, animatedStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
