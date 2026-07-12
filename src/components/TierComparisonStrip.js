/**
 * TierComparisonStrip
 *
 * Pricing-comparison strip used by the paywall and Subscription
 * management surfaces. Two columns side-by-side in the 2-tier model:
 * Free on the left, Pro on the right (Pro highlighted). Below each
 * price, the three differences that matter.
 *
 * Three differences only, adding a fourth row was rejected at
 * design lock ("list length kills conversion").
 *
 * Pricing comes from src/lib/payments/catalogue.js so the displayed
 * numbers always match the SKU the buy CTA will purchase.
 */
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import { usePlayPrices } from '../lib/payments/usePlayPrices';

// Three-row content for the 2-tier model. Free on the left (the lesser
// tier), Pro on the right (the fuller, paid tier). Each row names a real,
// shipped, Pro-gated differentiator (audit 2026-06-21: the previous rows
// promised "Peak Week and block planning" and "Photos and coach handover",
// neither of which exists, plus an unverified "90 days history" gate).
const COMPARISON_ROWS = [
  { free: 'Workout logging',      pro: 'Food diary, macros & barcode' },
  { free: 'Create your own plans', pro: 'Division-specific plans' },
  { free: 'Progress stats',       pro: 'Weekly Coach decisions' },
];

export default function TierComparisonStrip({
  pricingWindow = 'monthly',  // billing period now ('monthly' | 'annual'); legacy name
  highlighted = 'pro',   // 'free' | 'pro', which column gets the amber outline
  onPickPro,             // optional: makes the Pro column tappable
}) {
  // C-2 / PLAY-002: localised store price. priceFor returns null until the
  // active store responds; the Pro column shows a short placeholder, never a
  // hardcoded price.
  const priceFor = usePlayPrices();
  // CP-10 theming tail (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);

  const FreeColumn = (
    <View
      style={[
        styles.col,
        live.col,
        highlighted === 'free' && [styles.colHighlighted, live.colHighlighted],
      ]}
    >
      <Text style={[styles.colHeader, live.colHeader]}>Free</Text>
      <Text style={[styles.colPrice, live.colPrice]}>£0</Text>
      {/* COMP-007: empty cadence spacer keeps Free's rows aligned with Pro's
          (only Pro shows a real "per year/month" line). */}
      <Text style={[styles.colCadence, live.colCadence]}> </Text>
      {COMPARISON_ROWS.map((row, i) => (
        <Text key={`free-${i}`} style={[styles.rowText, live.rowText]} numberOfLines={2}>
          {row.free}
        </Text>
      ))}
    </View>
  );

  const ProColumn = (
    <Pressable accessibilityRole="button"
      onPress={onPickPro}
      disabled={!onPickPro}
      style={({ pressed }) => [
        styles.col,
        live.col,
        highlighted === 'pro' && [styles.colHighlighted, live.colHighlighted],
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={[styles.colHeader, live.colHeader]}>Pro</Text>
      <Text style={[styles.colPrice, live.colPrice]}>{priceFor('pro', pricingWindow) ?? '…'}</Text>
      {/* COMP-007: cadence suffix so the annual price isn't misread as monthly. */}
      <Text style={[styles.colCadence, live.colCadence]}>{pricingWindow === 'annual' ? 'per year' : 'per month'}</Text>
      {COMPARISON_ROWS.map((row, i) => (
        <Text key={`pro-${i}`} style={[styles.rowText, live.rowText]} numberOfLines={2}>
          {row.pro}
        </Text>
      ))}
    </Pressable>
  );

  return (
    <View style={styles.wrap}>
      {FreeColumn}
      {ProColumn}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  col: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
  },
  colHighlighted: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryBg,
  },
  colHeader: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  colPrice: {
    color: colors.textPrimary,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.semibold,
  },
  colCadence: {
    ...type.caption,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  rowText: {
    ...type.bodySm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
});

// CP-10 theming tail (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BillingPeriodSelector.js's buildLiveStyles. wrap has no colour tokens.
function buildLiveStyles(t) {
  return {
    col: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    colHighlighted: { borderColor: t.colors.primary, backgroundColor: t.colors.primaryBg },
    colHeader: { color: t.colors.textPrimary },
    colPrice: { color: t.colors.textPrimary },
    colCadence: { color: t.colors.textMuted },
    rowText: { color: t.colors.textSecondary },
  };
}
