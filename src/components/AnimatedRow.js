/**
 * AnimatedRow
 *
 * The list-mutation sibling of AnimatedEntrance (D2, design audit 03 win #2):
 * a row that enters with a small fade+rise, exits with a fade, and lets its
 * SIBLINGS glide into the freed space via a layout transition — so a Diary
 * delete or a logged set appearing is no longer a jump-cut.
 *
 * Reduce-motion aware: renders a plain View when the user asked for calmer
 * motion, and falls back to a plain View if Reanimated's builders are
 * unavailable for any reason, so it can never break a screen.
 *
 * Rows MUST carry a stable key (the row's id, never the array index) or the
 * exit/layout animations will fire on the wrong rows.
 *
 * Usage:
 *   <AnimatedRow key={row.id}>…</AnimatedRow>
 *   <AnimatedRow key={row.id} index={i}>…</AnimatedRow>  // staggers entry
 */

import { View } from 'react-native';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import useAppStore from '../store/useAppStore';
import { motion } from '../styles/theme';

// Same stagger discipline as AnimatedEntrance.
const STAGGER_MS = 30;
const MAX_STAGGER_ITEMS = 8;

export default function AnimatedRow({ children, index = 0, style }) {
  const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion);

  if (reduceMotion) {
    return <View style={style}>{children}</View>;
  }

  let entering, exiting, layout;
  try {
    const stagger = Math.min(index, MAX_STAGGER_ITEMS) * STAGGER_MS;
    entering = FadeInDown.duration(motion.enter).delay(stagger);
    exiting = FadeOut.duration(motion.exit);
    layout = LinearTransition.duration(motion.state);
  } catch (_) {
    // If the layout-animation builders aren't available, fall back to no
    // motion rather than risk a render throw on the screen.
    return <View style={style}>{children}</View>;
  }

  return (
    <Animated.View entering={entering} exiting={exiting} layout={layout} style={style}>
      {children}
    </Animated.View>
  );
}
