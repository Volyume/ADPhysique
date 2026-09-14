/**
 * BigNumber — the ONE loud element on a screen (D166 law 1, design direction D
 * "Ledger, dark", `docs/design-redesign-2026-09-14/20-DIRECTION-AND-PLAN.md`
 * section 5).
 *
 * Why this exists. The redesign audit measured that 73.9% of all typed text in
 * the product sits at 11 or 13 px, and that only TWO sites in 106 screens
 * render above 24 px through a type role. Where a screen genuinely needed to be
 * loud it reached PAST the scale with a raw literal — 96 px and 44 px in
 * YearOfLifts, each carrying a source comment reading "Theme gap: no
 * display-size + black type role exists". The founder's verdict on the product
 * was that it "looks far too much like it's built by ai"; nothing ever being
 * loud is a large part of why. This component and `type.hero` are that gap.
 *
 * The law it enforces: exactly one of these per screen, and it is always the
 * thing the screen is FOR — the session on Today, the working weight in the
 * logger, the decision on Progress. It is not a stat tile. If a screen wants
 * two, the screen has not decided what it is about.
 *
 * IT DOES NOT ANIMATE, and that is deliberate.
 *
 * The first draft of this component wrapped `RollingNumber` behind an opt-in
 * `animate` prop with an `isBodyweight` refusal. `rollingNumber.guard.test.js`
 * rejected it, correctly. That guard holds a commission ALLOWLIST of exactly
 * two surfaces, because the count-up carries a hard ED rule — "the body-weight
 * number NEVER ticks anywhere, not under a flag, not under calm mode" — and an
 * allowlist is worthless the moment a component that everything uses is on it.
 * A per-caller `isBodyweight` flag is weaker than an allowlist in exactly the
 * way that matters: it relies on every future caller remembering.
 *
 * There is precedent for this being the right answer rather than merely the
 * safe one: when the Training Load hero moved to LiftProgress under Campaign
 * 23 it was deliberately NOT re-commissioned, and renders plain formatted text.
 * Law 5 agrees — no celebratory animation — and a number that counts up on
 * arrival is a celebration device, not a readability one.
 *
 * Suppression under calm mode or an open ED flag remains the CALLER's job (the
 * fail-closed chain its siblings use). This component reads no flag, because a
 * presentational primitive that also read safety state would be a second place
 * for that logic to drift.
 *
 * Theming: written to the migrated-primitive pattern (Card.js, Button.js), NOT
 * the frozen-plus-live double-write that 153 files still carry. The frozen
 * block holds only palette-invariant properties; everything that changes
 * between dark, light, higher-contrast and colour-blind-safe is read from
 * useTheme() per render and memoized on `t`.
 */
import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import useTheme from '../hooks/useTheme';
import { spacing } from '../styles/theme';

export default function BigNumber({
  value,                  // string or number — the loud thing itself
  unit = null,            // law 7: a number states what it is
  label = null,           // small caps eyebrow ABOVE the value
  caption = null,         // quiet line BELOW the value
  tone = 'ink',           // 'ink' (default) | 'now' (amber, means the live thing)
  align = 'left',
  maxFontSizeMultiplier = 1.3,
  accessibilityLabel,
  style,
  testID,
}) {
  const t = useTheme();
  const s = useMemo(() => buildStyles(t, tone, align), [t, tone, align]);

  const spoken = accessibilityLabel
    ?? [label, unit ? `${value} ${unit}` : `${value}`, caption].filter(Boolean).join(', ');

  return (
    <View style={[styles.wrap, s.wrap, style]} testID={testID}>
      {!!label && <Text style={s.label}>{label}</Text>}
      <View style={[styles.valueRow, s.valueRow]}>
        <Text
          style={s.value}
          maxFontSizeMultiplier={maxFontSizeMultiplier}
          accessibilityLabel={spoken}
        >
          {value}
        </Text>
        {!!unit && <Text style={s.unit} maxFontSizeMultiplier={maxFontSizeMultiplier}>{unit}</Text>}
      </View>
      {!!caption && <Text style={s.caption}>{caption}</Text>}
    </View>
  );
}

function buildStyles(t, tone, align) {
  const alignItems = align === 'center' ? 'center' : 'flex-start';
  return {
    wrap: { alignItems },
    valueRow: { justifyContent: align === 'center' ? 'center' : 'flex-start' },
    label: { ...t.type.overline, color: t.colors.textMuted, marginBottom: spacing.xs },
    // Tabular figures so a changing number does not shuffle its own width.
    value: {
      ...t.type.num('hero'),
      color: tone === 'now' ? t.colors.primary : t.colors.textPrimary,
    },
    // The unit sits on the value's baseline at title size: present and legible,
    // never competing with the figure it belongs to.
    unit: { ...t.type.title, color: t.colors.textSecondary, marginLeft: spacing.xs },
    caption: { ...t.type.bodySm, color: t.colors.textSecondary, marginTop: spacing.xs },
  };
}

// Palette-invariant only. Nothing here changes between themes, so there is
// nothing to mirror and no double-write.
const styles = StyleSheet.create({
  wrap: {},
  valueRow: { flexDirection: 'row', alignItems: 'baseline' },
});
