/**
 * AnimatedEntrance
 *
 * A small reusable entrance animation for screen content and list items: the
 * child fades in and rises a few px, once, on mount. This is the "everyday
 * motion" the design audit calls for (Reanimated v3 layout animations on the
 * UI thread), tokenised to motion.enter and the emphasized-decelerate curve.
 *
 * Reduce-motion aware: when the user has reduce-motion on, it renders a plain
 * View with no animation (mandatory per the design standard). It also no-ops
 * the animation if Reanimated's entering API isn't available for any reason,
 * so it can never break a screen.
 *
 * Usage:
 *   <AnimatedEntrance>            // a screen's first content block
 *   <AnimatedEntrance index={i}>  // a list item; staggers by index
 */

import React from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import useAppStore from '../store/useAppStore';
import { motion } from '../styles/theme';

// Per-item stagger, capped so a long list doesn't animate forever.
const STAGGER_MS = 30;
const MAX_STAGGER_ITEMS = 8;

export default function AnimatedEntrance({ children, index = 0, style, delay = 0 }) {
  const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion);

  if (reduceMotion) {
    return <View style={style}>{children}</View>;
  }

  const stagger = Math.min(index, MAX_STAGGER_ITEMS) * STAGGER_MS;
  let entering;
  try {
    entering = FadeInDown
      .duration(motion.enter)
      .delay(delay + stagger);
  } catch (_) {
    // If the layout-animation builder isn't available, fall back to no motion
    // rather than risk a render throw on the screen.
    return <View style={style}>{children}</View>;
  }

  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
}
