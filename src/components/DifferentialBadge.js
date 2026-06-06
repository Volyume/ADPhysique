/**
 * DifferentialBadge
 *
 * Inline card surfaced below the weekly coach output when the
 * differential paywall trigger fires (Move #4). Pure presentation:
 * consumes the `differential_output` field on the coach output and
 * renders the locked copy + CTA.
 *
 * Layout per UI_FLOWS_LOCKED.md (lines 248-269 of HeldDecisionCard
 * variant, adapted for the paywall context). Amber affordance is the
 * brand cue; no marketing chrome.
 */
import { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize, fontWeight } from '../styles/theme';

export default function DifferentialBadge({
  differential,        // { shown, trigger, with_food_data_message, paywall_cta }
  pricingWindow: _pricingWindow, // legacy, unused; billing period now lives on the Paywall
  pricingPriceText,    // e.g. "£4.99/month", pre-resolved by caller for the buy_pro CTA
  onTapCta,            // (action: 'pay' | 'dismiss' | 'shown') => void ('shown' is the impression ping)
}) {
  // Fire the locked paywall_shown telemetry once per mount with a
  // visible badge. Caller wires the event sender via onTapCta when
  // the user actually taps; this effect captures the impression.
  useEffect(() => {
    if (!differential?.shown) return;
    onTapCta?.('shown');
    // intentionally only on shown-change so we don't re-fire on prop noise.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [differential?.shown, differential?.trigger]);

  if (!differential?.shown) return null;

  // 7 days = the Play intro free trial this CTA leads to (the 14-day cardless
  // trial runs before any purchase prompt). See SUBSCRIPTION_AND_PAYMENT_LOCKED
  // 2026-06-06 override. The 'try_pro_14d' id is internal, left as-is.
  const ctaLabel = differential.paywall_cta === 'try_pro_14d'
    ? 'Try Pro free for 7 days'
    : `Get Pro for ${pricingPriceText ?? '£2.99/month'}`;

  return (
    <View style={styles.wrap} accessibilityLabel="Differential paywall">
      <View style={styles.headerRow}>
        <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
        <Text style={styles.headerText}>With Pro</Text>
      </View>
      <Text style={styles.body}>
        {differential.with_food_data_message}
      </Text>
      <TouchableOpacity
        style={styles.ctaBtn}
        onPress={() => onTapCta?.('pay')}
        accessibilityRole="button"
        accessibilityLabel={ctaLabel}
      >
        <Text style={styles.ctaText}>{ctaLabel}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.dismissBtn}
        onPress={() => onTapCta?.('dismiss')}
        accessibilityRole="button"
      >
        <Text style={styles.dismissText}>Not now</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  headerText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.5,
  },
  body: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  ctaBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  ctaText: {
    color: colors.background,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  dismissBtn: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  dismissText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
});
