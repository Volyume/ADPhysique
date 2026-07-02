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
 * brand cue; no marketing chrome. NAV-4/D3: it now renders in HomeScreen's
 * banner stack, where Start is the sole filled-amber element, so the CTA is
 * the outline variant (amber border + text, no fill).
 */
import { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize, fontWeight } from '../styles/theme';

// paywall_shown impressions already sent this JS session, keyed by trigger.
// Home's banner stack remounts this component whenever a sibling banner loads
// or dismisses, so a per-mount effect flaps the SAME impression into telemetry
// several times per visit. Module-level so it survives remounts; resets with
// the JS context (one impression per session + trigger).
const impressionsSent = new Set();

export default function DifferentialBadge({
  differential,        // { shown, trigger, with_food_data_message, paywall_cta }
  pricingWindow: _pricingWindow, // legacy, unused; billing period now lives on the Paywall
  pricingPriceText,    // e.g. "£4.99/month", pre-resolved by caller for the buy_pro CTA
  onTapCta,            // (action: 'pay' | 'dismiss' | 'shown') => void ('shown' is the impression ping)
}) {
  // Fire the locked paywall_shown telemetry once per session + trigger with a
  // visible badge. Caller wires the event sender via onTapCta when
  // the user actually taps; this effect captures the impression.
  useEffect(() => {
    if (!differential?.shown) return;
    const key = differential?.trigger ?? 'unknown';
    if (impressionsSent.has(key)) return;
    impressionsSent.add(key);
    onTapCta?.('shown');
    // intentionally only on shown-change so we don't re-fire on prop noise.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [differential?.shown, differential?.trigger]);

  if (!differential?.shown) return null;

  // 14 days: the try_pro_14d CTA routes to ProUpgrade, the 14-day CARDLESS
  // trial (detectDifferentialTrigger only emits it while canStillTrial holds).
  // The previous "7 days" label was the inverted rationale — it assumed this
  // CTA led to Google's 7-day Play intro offer, which in fact only appears
  // later, on the paid purchase sheet once the cardless trial is spent
  // (the buy_pro variant below).
  //
  // PLAY-002: the buy CTA shows the live store price the caller passes, or a
  // price-free "Get Pro" until it loads. No hardcoded price fallback.
  const ctaLabel = differential.paywall_cta === 'try_pro_14d'
    ? 'Try Pro free for 14 days'
    : pricingPriceText ? `Get Pro for ${pricingPriceText}` : 'Get Pro';

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
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  ctaText: {
    color: colors.primary,
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
