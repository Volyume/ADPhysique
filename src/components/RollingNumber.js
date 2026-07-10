/**
 * RollingNumber (E15 element 4 + E9 count-ups, approved 2026-07-02; spec in
 * audit/e15-signature-elements.md §4). A count-up INTERPOLATION on the UI
 * thread: one shared value drives a non-editable TextInput's text via
 * useAnimatedProps, so no per-frame JS render happens (the pattern the two
 * retired JS-thread counters used to pay for). Deliberately not a per-digit
 * slot machine: digit columns multiply animated nodes for no legibility gain.
 *
 * Commissioned surfaces ONLY: WorkoutSummary stats (one-shot from 0),
 * Diary remaining-kcal hero, Analytics weekly volume. The body-weight
 * number NEVER ticks anywhere; that exclusion is absolute (03b hard ED
 * rule) and pinned by a source guard, not a flag.
 *
 * Reduce Motion renders the final value instantly as a plain Text.
 */
import { useEffect } from 'react';
import { TextInput, Text } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedProps, withDelay, withTiming, Easing,
} from 'react-native-reanimated';
import useAppStore from '../store/useAppStore';
import { motion } from '../styles/theme';

Animated.addWhitelistedNativeProps({ text: true });
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

// en-GB integer grouping, worklet-safe (toLocaleString is not available on
// the UI runtime). The commissioned surfaces are integer readouts.
function groupDigits(n) {
  'worklet';
  const sign = n < 0 ? '-' : '';
  let s = String(Math.abs(Math.round(n)));
  let out = '';
  while (s.length > 3) {
    out = `,${s.slice(-3)}${out}`;
    s = s.slice(0, -3);
  }
  return sign + s + out;
}

export default function RollingNumber({
  value,               // target number (integer semantics)
  from = null,         // one-shot mode: mount at this number and roll to value
  delayMs = 0,
  grouped = true,
  prefix = '',
  suffix = '',
  style,
  accessibilityLabel,
  // Optional font-scale ceiling for callers that place the numeral inside a
  // fixed-size container (e.g. the MacroRings kcal circle) where an
  // uncapped OS font scale would overflow. Left undefined (uncapped) for
  // callers sitting in a flexible card, matching prior behaviour.
  maxFontSizeMultiplier,
}) {
  const reduceMotion = useAppStore((s) => !!s.accessibility?.reduceMotion);
  const target = Math.round(Number(value) || 0);
  const n = useSharedValue(from != null && !reduceMotion ? Math.round(Number(from) || 0) : target);

  useEffect(() => {
    if (reduceMotion) { n.value = target; return; }
    n.value = withDelay(delayMs, withTiming(target, {
      duration: motion.enter,
      easing: Easing.bezier(
        motion.easeStandard[0], motion.easeStandard[1],
        motion.easeStandard[2], motion.easeStandard[3],
      ),
    }));
  }, [target, reduceMotion, delayMs, n]);

  const animatedProps = useAnimatedProps(() => ({
    text: `${prefix}${grouped ? groupDigits(n.value) : String(Math.round(n.value))}${suffix}`,
  }));

  const finalText = `${prefix}${grouped ? target.toLocaleString('en-GB') : String(target)}${suffix}`;
  if (reduceMotion) {
    return <Text style={style} accessibilityLabel={accessibilityLabel ?? finalText} maxFontSizeMultiplier={maxFontSizeMultiplier}>{finalText}</Text>;
  }
  return (
    <AnimatedTextInput
      editable={false}
      underlineColorAndroid="transparent"
      defaultValue={finalText}
      animatedProps={animatedProps}
      // TextInput carries platform padding a Text does not; strip it so the
      // numeral sits exactly where the Text it replaced sat.
      style={[{ padding: 0, margin: 0 }, style]}
      accessibilityLabel={accessibilityLabel ?? finalText}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
    />
  );
}
