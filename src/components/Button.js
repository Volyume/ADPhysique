/**
 * Button
 *
 * The single button primitive. One press model (the PressableCard spring),
 * one disabled treatment, one loading treatment, so every CTA in the app
 * looks and behaves the same. Replaces the 14+ hand-rolled `primaryBtn`
 * style blocks the component audit found.
 *
 * Variants (D148, founder 2026-09-04: colour is hierarchy; amber is an
 * accent, a selection and an identity, not "this is a button"):
 *   emphatic    solid amber fill, dark ink. The ONE action in a region that
 *               must be the strongest thing on screen: a final confirmation,
 *               a committing step (create the account, build the plan,
 *               agree). Normally at most one per screen.
 *   primary     the standard primary, and the default: a raised charcoal
 *               surface with a neutral border, a white semibold label and
 *               amber icons. Routine important actions (Start workout, Log
 *               set, Add food, Save, Continue) live here: obvious through
 *               position, size, contrast and the amber glyph, not fill.
 *   secondary   the quieter sibling: the base surface, the same border, a
 *               softer label. Supporting choices beside a primary.
 *   outline     alias of secondary (kept for existing callers).
 *   tertiary    quiet ghost button, amber label on a faint amber tint, for
 *               compact contextual actions.
 *   destructive solid error fill, light text
 *
 * Sizes: sm | md (default) | lg. `loading` shows an inline spinner and
 * disables the button. `icon` is a leading Ionicons name.
 *
 * The primary variant gives a selection tick as its onPress fires (audit
 * 03b M1); every other variant stays silent.
 *
 * State morphing (audit 03b §3.3b, Wave 6 M4): pass `state` to drive the
 * committing-moment morph idle → loading → success. Content cross-fades
 * inside a width-locked container (the button never resizes under the
 * finger), success shows a checkmark for a short readable beat with a
 * commit haptic, then `onSettled` fires so the caller can swap to its
 * settled rendering. Reduce-motion collapses the cross-fade to an instant
 * swap; the haptic vocabulary already no-ops there by itself. The success
 * beat still runs at full length under reduce motion: it is information
 * pacing (time to read the outcome), not decoration.
 */

import { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import Reanimated, { FadeIn, FadeOut } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import PressableCard from './PressableCard';
import useAppStore from '../store/useAppStore';
import useTheme from '../hooks/useTheme';
import * as haptics from '../lib/haptics';
import { spacing, radius, motion, withAlpha, alpha, lineHeight } from '../styles/theme';
import { fontFamily } from '../styles/fontFamily';
import { touchTarget } from '../styles/layout';

// CP-10 stage 1: VARIANTS (colour) and SIZES (fontSize) were module-scope
// consts baked at import time from the static `colors`/`fontSize` singletons
// (class 2, CP-10 plan section 1.4) — frozen until an app restart. Now built
// per-render from the live theme (src/hooks/useTheme.js) inside the
// component, below, so a Button re-renders correctly on a theme change.
function buildVariants(c) {
  return {
    // fg uses onPrimary (always-dark ink, theme.js:42), NOT `background`, which flips
    // near-white in the light theme and fails contrast on the amber fill (audit U-F-1).
    emphatic: { bg: c.primaryFill, fg: c.onPrimary, border: 'transparent', iconFg: c.onPrimary },
    // The standard primary: lifted one surface, bordered so it separates on
    // any parent (the border token clears 3:1), white label, amber glyphs.
    primary: { bg: c.surface2, fg: c.textPrimary, border: c.border, iconFg: c.primary },
    secondary: { bg: c.surface, fg: c.textSecondary, border: c.border, iconFg: c.textSecondary },
    tertiary: { bg: c.primaryBg, fg: c.primary, border: withAlpha(c.primary, alpha.edge), iconFg: c.primary },
    outline: { bg: c.surface, fg: c.textSecondary, border: c.border, iconFg: c.textSecondary },
    // fg uses onError (always-light ink, theme.js), NOT textPrimary, which flips
    // dark in the light theme and fails contrast on the dark-red fill (audit U-F-1).
    // bg uses errorFill, not error: the flat `error` ink is only 3.68:1 under
    // white in dark/CVD, while errorFill is the deeper red/magenta that clears
    // the 4.5:1 semibold-label bar (AX-06 launch accessibility audit).
    destructive: { bg: c.errorFill, fg: c.onError, border: 'transparent', iconFg: c.onError },
  };
}

function buildSizes(fs) {
  return {
    sm: { pv: spacing.sm, ph: spacing.md, font: fs.sm, icon: 16, gap: spacing.xs },
    md: { pv: spacing.md, ph: spacing.lg, font: fs.md, icon: 18, gap: spacing.sm },
    lg: { pv: spacing.lg, ph: spacing.lg, font: fs.md, icon: 20, gap: spacing.sm },
  };
}

// How long the success checkmark holds before onSettled fires. A hold time
// (like Toast's per-variant HOLD values), not a motion duration, so it is
// deliberately not a motion.* token: it paces reading the outcome, and the
// audit sized it at ~900 ms (03b §3.3b).
export const SUCCESS_HOLD_MS = 900;

const STATES = ['idle', 'loading', 'success'];

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  state,
  onSettled,
  successLabel,
  icon,
  trailingIcon,
  fullWidth = true,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityState,
  testID,
  // R9 (D70): forwarded to PressableCard so compact size="sm" buttons can
  // keep a 44pt effective touch target without visual growth (the
  // converted hand-rolled CTAs relied on TouchableOpacity hitSlop).
  hitSlop,
  // Founder defect (2026-07-13 Android walk): side-by-side CTAs ("Log set"
  // + "Finish workout" in WorkoutBottomBar) mis-sized because the longer
  // label wrapped to two lines and doubled that button's height. Opt-in:
  // the label stays on one line and scales down slightly if tight, so
  // paired buttons always match height. Off by default so no existing
  // button changes.
  singleLine = false,
  children,
}) {
  const t = useTheme();
  const VARIANTS = buildVariants(t.colors);
  const SIZES = buildSizes(t.fontSize);
  const v = VARIANTS[variant] || VARIANTS.primary;
  const s = SIZES[size] || SIZES.md;
  // `state` is the morph API; the legacy `loading` bool keeps every existing
  // caller working unchanged.
  const phase = STATES.includes(state) ? state : (loading ? 'loading' : 'idle');
  const isDisabled = disabled || phase !== 'idle';
  const mergedAccessibilityState = {
    ...(accessibilityState || {}),
    disabled: isDisabled,
    busy: phase === 'loading',
  };

  // Touch-target floor. A size="sm" Button draws at roughly
  // spacing.sm*2 + a 13px line -- about 34dp, well under the platform
  // minimum, and every compact CTA in the app is one of these. Growing the
  // box would throw away the reason `sm` exists, so the shortfall is padded
  // onto the TOUCH area instead: hitSlop is what the minimum actually
  // governs. Horizontal padding is usually generous already, so only the
  // vertical shortfall is made up. A caller that passes its own hitSlop
  // keeps it untouched.
  const drawnHeight = (s.pv * 2) + Math.round(s.font * lineHeight.snug);
  const shortfall = Math.max(0, touchTarget.minimum - drawnHeight);
  const autoHitSlop = shortfall > 0
    ? { top: Math.ceil(shortfall / 2), bottom: Math.ceil(shortfall / 2), left: 0, right: 0 }
    : undefined;
  const effectiveHitSlop = hitSlop ?? autoHitSlop;

  const reduceMotion = useAppStore(st => st.accessibility?.reduceMotion);

  // Width lock: capture the idle content size so the spinner/checkmark
  // phases never let the button shrink under the finger (min, not fixed,
  // so longer content can still grow rather than clip).
  const [idleSize, setIdleSize] = useState(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  function onContentLayout(e) {
    if (phaseRef.current !== 'idle') return;
    const { width, height } = e.nativeEvent.layout;
    if (width && height) setIdleSize({ width, height });
  }

  // Success beat: one commit haptic on entry (the vocabulary self-gates
  // under reduce motion), then onSettled after the hold. The cleanup
  // clears the timer when the phase moves on or the button unmounts, so
  // a caller navigating away mid-beat never receives a stale callback.
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;
  // Fire the haptic only on a genuine transition INTO success, never when the
  // button (re)mounts already in success. A parent that keeps the success
  // marker as its own state (CoachOutput apply rows, the check-in submit) can
  // re-mount a button straight into 'success' after a collapse/step change; a
  // remount must not replay the commit beat. The onSettled timer still runs in
  // that case, so a marker stranded by an unmount always clears on remount.
  const prevPhaseRef = useRef(phase);
  useEffect(() => {
    if (phase !== 'success') { prevPhaseRef.current = phase; return undefined; }
    const enteredNow = prevPhaseRef.current !== 'success';
    prevPhaseRef.current = 'success';
    if (enteredNow) haptics.commit();
    const timer = setTimeout(() => {
      if (onSettledRef.current) onSettledRef.current();
    }, SUCCESS_HOLD_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  // M1 (audit 03b §3.3f): the primary and emphatic CTAs tick as their action
  // fires, an outcome-adjacent beat rather than press-in. Secondary,
  // tertiary, outline and destructive stay silent. The vocabulary itself no-ops under
  // reduce motion, so no extra gating is needed here.
  const handlePress = onPress && (v === VARIANTS.primary || v === VARIANTS.emphatic)
    ? (e) => { haptics.selection(); return onPress(e); }
    : onPress;
  const iconFg = v.iconFg ?? v.fg;

  const content = phase === 'loading' ? (
    <ActivityIndicator color={v.fg} />
  ) : phase === 'success' ? (
    <>
      <Ionicons name="checkmark" size={s.icon} color={v.fg} />
      {successLabel ? (
        <Text style={[styles.label, { color: v.fg, fontSize: s.font, lineHeight: Math.round(s.font * lineHeight.snug) }, textStyle]}>
          {successLabel}
        </Text>
      ) : null}
    </>
  ) : (
    <>
      {icon ? <Ionicons name={icon} size={s.icon} color={iconFg} /> : null}
      {title != null ? (
        <Text
          numberOfLines={singleLine ? 1 : undefined}
          adjustsFontSizeToFit={singleLine}
          minimumFontScale={singleLine ? 0.8 : undefined}
          style={[styles.label, { color: v.fg, fontSize: s.font, lineHeight: Math.round(s.font * lineHeight.snug) }, textStyle]}
        >
          {title}
        </Text>
      ) : null}
      {children}
      {trailingIcon ? <Ionicons name={trailingIcon} size={s.icon} color={iconFg} /> : null}
    </>
  );

  // Cross-fade the phases inside the locked container. Same defensive shape
  // as AnimatedRow: reduce motion (or unavailable builders) falls back to an
  // instant swap rather than ever risking a render throw.
  let morphed = content;
  if (!reduceMotion) {
    try {
      morphed = (
        <Reanimated.View
          key={phase}
          entering={FadeIn.duration(motion.state)}
          exiting={FadeOut.duration(motion.state)}
          style={[styles.contentRow, { gap: s.gap }]}
        >
          {content}
        </Reanimated.View>
      );
    } catch (_) {
      morphed = content;
    }
  }

  return (
    <PressableCard
      onPress={handlePress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={mergedAccessibilityState}
      testID={testID}
      hitSlop={effectiveHitSlop}
      style={[
        styles.base,
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          borderWidth: v.border === 'transparent' ? 0 : 1,
          paddingVertical: s.pv,
          paddingHorizontal: s.ph,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        isDisabled && phase === 'idle' && styles.disabled,
        style,
      ]}
    >
      <View
        onLayout={onContentLayout}
        style={[
          styles.contentRow,
          { gap: s.gap },
          phase !== 'idle' && idleSize
            ? { minWidth: idleSize.width, minHeight: idleSize.height }
            : null,
        ]}
      >
        {morphed}
      </View>
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // One disabled treatment app-wide. Applied only in the idle phase: the
  // loading/success phases are busy states, not "unavailable" states, and
  // dimming them would read as a fault at the exact committing moment.
  disabled: { opacity: 0.5 },
  label: {
    fontFamily: fontFamily.semibold,
  },
});
