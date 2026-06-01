/**
 * TierComparisonStrip
 *
 * Pricing-comparison strip used by the cascade gate, paywall, and
 * Subscription management surfaces. Two columns side-by-side: Pro on
 * the left, Complete on the right. Below each price, the three locked
 * differences from OPEN_QUESTIONS_RESOLVED.md lines 148-159.
 *
 * Three differences only, adding a fourth row was rejected at
 * design lock ("list length kills conversion").
 *
 * Pricing comes from src/lib/payments/catalogue.js so the displayed
 * numbers always match the SKU the buy CTA will purchase.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '../styles/theme';
import { skuFor } from '../lib/payments/catalogue';

// Locked three-row content. Left column = Pro, right = Complete (matches the
// render order below and the header comment).
// Wording is per OPEN_QUESTIONS_RESOLVED.md Q3 verbatim.
const COMPARISON_ROWS = [
  { complete: 'Unlimited history',           pro: '90 days' },
  { complete: 'Peak Week and block planning', pro: 'Current block only' },
  { complete: 'Photos and coach handover',   pro: 'CSV export' },
];

export default function TierComparisonStrip({
  pricingWindow = 'open_beta',
  highlighted = 'complete',   // 'complete' | 'pro', which column gets the amber outline
  onPickPro,                  // optional: makes the Pro column tappable
  onPickComplete,             // optional: makes the Complete column tappable
}) {
  const proSku = skuFor('pro', pricingWindow);
  const completeSku = skuFor('complete', pricingWindow);

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

  const CompleteColumn = (
    <Pressable
      onPress={onPickComplete}
      disabled={!onPickComplete}
      style={[
        styles.col,
        highlighted === 'complete' && styles.colHighlighted,
      ]}
    >
      <Text style={styles.colHeader}>Complete</Text>
      <Text style={styles.colPrice}>{completeSku?.priceText ?? '-'}</Text>
      {COMPARISON_ROWS.map((row, i) => (
        <Text key={`complete-${i}`} style={styles.rowText} numberOfLines={2}>
          {row.complete}
        </Text>
      ))}
    </Pressable>
  );

  return (
    <View style={styles.wrap}>
      {ProColumn}
      {CompleteColumn}
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
