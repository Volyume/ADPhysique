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
import { colors, spacing, radius, fontSize, fontWeight } from '../styles/theme';
import { skuFor } from '../lib/payments/catalogue';

// Three-row content for the 2-tier model. Free on the left (the lesser
// tier), Pro on the right (the fuller, paid tier).
const COMPARISON_ROWS = [
  { free: '90 days of history',  pro: 'Unlimited history' },
  { free: 'Current block only',  pro: 'Peak Week and block planning' },
  { free: 'CSV export',          pro: 'Photos and coach handover' },
];

export default function TierComparisonStrip({
  pricingWindow = 'monthly',  // billing period now ('monthly' | 'annual'); legacy name
  highlighted = 'pro',   // 'free' | 'pro', which column gets the amber outline
  onPickPro,             // optional: makes the Pro column tappable
}) {
  const proSku = skuFor('pro', pricingWindow);

  const FreeColumn = (
    <View
      style={[
        styles.col,
        highlighted === 'free' && styles.colHighlighted,
      ]}
    >
      <Text style={styles.colHeader}>Free</Text>
      <Text style={styles.colPrice}>£0</Text>
      {COMPARISON_ROWS.map((row, i) => (
        <Text key={`free-${i}`} style={styles.rowText} numberOfLines={2}>
          {row.free}
        </Text>
      ))}
    </View>
  );

  const ProColumn = (
    <Pressable
      onPress={onPickPro}
      disabled={!onPickPro}
      style={[
        styles.col,
        highlighted === 'pro' && styles.colHighlighted,
      ]}
    >
      <Text style={styles.colHeader}>Pro</Text>
      <Text style={styles.colPrice}>{proSku?.priceText ?? '-'}</Text>
      {COMPARISON_ROWS.map((row, i) => (
        <Text key={`pro-${i}`} style={styles.rowText} numberOfLines={2}>
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
    marginBottom: spacing.md,
  },
  rowText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
});
