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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as haptics from '../lib/haptics';
import Ionicons from '@expo/vector-icons/Ionicons';
import useAppStore from '../store/useAppStore';
import { colors, fontSize, fontWeight, spacing, radius, motion, type, fontFamily } from '../styles/theme';
import useTheme from '../hooks/useTheme';

export default function PRCelebration({ pr, onDismiss, subdued = false }) {
  // R3 (remediation 2026-07-11, ruling D63): the full-screen grey overlay +
  // confetti takeover is RETIRED for in-session PRs. On the founder's device
  // walk it presented as a greyed-out screen with a stunted animation that
  // hung until tapped; and as a pattern it broke the logger's first
  // principle (never break the loop - a mid-session celebration must not
  // stand between the user and their next set; no elite logger interrupts
  // logging with a modal takeover). Every in-session celebration is now the
  // calm toast (bottom-docked since 2026-08-18, just above the rest bar's
  // amber line) the subdued path already proved: amber-accented, honest for
  // first lifts, auto-dismissing, tappable to dismiss early, never obscuring
  // the inputs. Calm-mode / reduce-motion users get the identical surface, so
  // the suppression rules are simpler and strictly stronger than before.
  // D170 retired the summary screen's MilestoneBurst mount and D173 T4 then
  // deleted the particle machinery from this file: there is no confetti in
  // the product, and law 5 forbids reintroducing it.
  const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion);
  // Founder device order 2026-08-18: the toast docks at the BOTTOM, just
  // above the rest bar's amber top line, where the thumb and the eye
  // already are after logging a set - never over the header. The logger
  // publishes its measured bottom-chrome height (rest strip + bottom bar,
  // safe area included); outside the logger that reads 0 and the toast
  // falls back to the safe-area bottom offset.
  const loggerBottomInset = useAppStore(s => s.loggerBottomInset);
  const insets = useSafeAreaInsets();
  // Hard ceiling (founder device report 2026-08-18: the toast vanished
  // entirely on a second PR). Whatever the logger publishes, the toast must
  // remain on screen - so the docking offset can never exceed a fraction of
  // the window, and an out-of-range value falls back to the plain
  // safe-area position rather than putting the celebration where nobody can
  // see it. A toast in a slightly wrong place is a blemish; an invisible
  // one is a missing feature.
  const { height: windowH } = useWindowDimensions();
  const fallbackBottom = insets.bottom + spacing.xxl;
  const docked = loggerBottomInset > 0 ? loggerBottomInset + spacing.sm : 0;
  const toastBottom = (docked > 0 && docked < windowH * 0.45)
    ? docked
    : fallbackBottom + spacing.sm;
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

  // D173 T3: a personal record is stated as a fact, in words and a number.
  // The trophy is gone; the glyph slot the toast always fills is the thing
  // that actually happened.
  const prIcon = pr.type === 'first_lift' ? 'barbell-outline' :
    pr.type === '1rm_estimate' ? 'barbell-outline' :
    pr.type === 'heaviest_weight' ? 'barbell' : 'flash';

  const prLabel = pr.type === 'first_lift' ? 'First lift logged' :
    pr.type === '1rm_estimate' ? 'New estimated max lift' :
    pr.type === 'heaviest_weight' ? 'New heaviest weight' : 'Most reps at weight';

  return (
    <TouchableOpacity accessibilityRole="button"
      style={[styles.toastWrap, { bottom: toastBottom }]}
      activeOpacity={0.9}
      onPress={onDismiss}
    >
      <Animated.View style={[styles.toast, live.toast, { opacity: toastOpacity }]}>
        {/* KEEP: a personal-best mark, which discipline 1 grants by name. */}
          <Ionicons name={prIcon} size={20} color={t.colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.toastTitle, live.toastTitle]}>{prLabel}</Text>
          <Text style={[styles.toastValue, live.toastValue]}>{pr.label}</Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  toastWrap: {
    position: 'absolute',
    // `bottom` is applied inline (see render): the logger's measured
    // bottom-chrome height docks the toast just above the rest bar's amber
    // line (founder device order 2026-08-18); outside the logger it clears
    // the home indicator via the safe-area inset instead.
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
    fontFamily: fontFamily.bold, fontWeight: fontWeight.bold,
    marginTop: spacing.hair,
  },
});
