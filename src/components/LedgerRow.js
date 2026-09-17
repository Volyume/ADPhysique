/**
 * LedgerRow — the second signature device of design direction D ("Ledger,
 * dark"; `docs/design-redesign-2026-09-14/20-DIRECTION-AND-PLAN.md` section 5,
 * ruled D165/D166).
 *
 * Every set, everywhere in the app, as one hairline-ruled line of tabular
 * figures: the set you are on in amber, everything behind it quiet. A training
 * log that looks like a log book. No default produces this, which is exactly
 * why it is worth building — it is the thing that will make the logger look
 * authored rather than assembled.
 *
 * WHAT IT IS NOT. It is not a card, and that is the point (law 2, as the
 * founder corrected it: "don't put everything in a card. A card should mean:
 * this thing is an object"). A set is a line in a log, not a thing you pick
 * up. `LoggedSetRow` already reached this conclusion for the logger — its own
 * comment records that "the per-set border/surface card is retired: a completed
 * set is one quiet LINE in the sequence, not a container" — and this
 * generalises that posture so Progress, history and the summary can draw the
 * same line.
 *
 * THE HAIRLINE. `borderSubtle`, spanning the full row, never inset past a
 * leading glyph and never the bright `border` grey. That is the rule Community
 * landed under CR-17/D163 after the founder reported stepped edges, and
 * `SettingsPrimitives` names the alternative in its own source: a bright rule
 * between every row "is the wireframe look".
 *
 * Amber (law 6) appears on exactly one row in a list: the current one. It is
 * spent on the figure and the index, never as a fill behind them, because a
 * tinted band would make the live row the loudest thing on a screen whose loud
 * thing is somewhere else.
 *
 * Theming: the migrated-primitive pattern (Card.js, Button.js). The frozen
 * block holds only palette-invariant properties; everything palette-dependent
 * is read from useTheme() and memoized on `t`. Not the frozen-plus-live
 * double-write — see LoggedSetRow, where the two halves silently disagreed
 * about a border colour for a month.
 */
import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import useTheme from '../hooks/useTheme';
import { spacing } from '../styles/theme';
import { touchTarget } from '../styles/layout';

export default function LedgerRow({
  index = null,          // the set number, or any short leading mark
  primary,               // the figure: "100 kg x 8"
  secondary = null,      // a quieter trailing fact: "est. 1RM 125 kg"
  state = 'done',        // 'done' | 'current' | 'upcoming'
  muted = false,         // a quieter DONE line (a warm-up): figure in textMuted
  trailing = null,       // a control belonging to this row
  first = false,         // suppress the top rule on the first row of a block
  accessible = true,     // false when a wrapping pressable owns the a11y node
  accessibilityLabel,
  style,
  testID,
}) {
  // D184 (the ledger built as specified, 2026-09-17) added two props, both
  // additive. `accessible={false}` exists because the logger wraps this row
  // in a TouchableOpacity that already carries the spoken label and the
  // button role; a nested accessible View would announce twice or swallow
  // the outer node. `muted` exists because a warm-up is a DONE line that
  // should read quieter than a working set, and the only other way to get
  // textMuted on the figure was to lie and call it "upcoming".
  const t = useTheme();
  const s = useMemo(() => buildStyles(t, state, muted), [t, state, muted]);

  return (
    <View
      style={[styles.row, s.row, !first && s.rule, style]}
      testID={testID}
      accessible={accessible}
      accessibilityLabel={accessible
        ? (accessibilityLabel ?? [index, primary, secondary].filter(Boolean).join(', '))
        : undefined}
    >
      {index != null && <Text style={s.index}>{index}</Text>}
      <Text style={s.primary} numberOfLines={1}>{primary}</Text>
      {!!secondary && <Text style={s.secondary} numberOfLines={1}>{secondary}</Text>}
      {trailing}
    </View>
  );
}

function buildStyles(t, state, muted) {
  const isCurrent = state === 'current';
  const isUpcoming = state === 'upcoming';
  return {
    row: { minHeight: touchTarget.minimum },
    rule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.colors.borderSubtle },
    index: {
      ...t.type.num('captionStrong'),
      color: isCurrent ? t.colors.primary : t.colors.textMuted,
      width: spacing.xl,
    },
    primary: {
      ...t.type.num('bodyStrong'),
      flex: 1,
      minWidth: 0,
      color: isCurrent
        ? t.colors.primary
        : (isUpcoming || muted) ? t.colors.textMuted : t.colors.textPrimary,
    },
    secondary: { ...t.type.num('bodySm'), color: t.colors.textSecondary },
  };
}

// Palette-invariant only. The row pays no horizontal gutter of its own: the
// page pays it once (the Community layout law, CR-17), so a row dropped into
// any padded container keeps the one left edge.
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
});
