/**
 * CascadeGateScreen
 *
 * Modal surface a user sees at the cascade decision points:
 *   * Day 21: pro trial winding down ("Stay on Pro" vs Free)
 *   * Payment failure: 3-day grace banner overlay (Stay vs Drop)
 *
 * Layout locked in UI_FLOWS_LOCKED.md lines 229-246 +
 * SUBSCRIPTION_AND_PAYMENT_LOCKED.md lines 305-326.
 *
 * Copy variants pulled from OPEN_QUESTIONS_RESOLVED.md Q3.
 *
 * Navigation params:
 *   variant: 'day14' | 'day28' | 'payment_failure'   (required)
 *   pricingWindow: 'open_beta'|'founders'|'standard'  (defaults via
 *     getCurrentPricingWindow; may be passed for SSR / preview)
 *
 * Returns control to the previous screen on any decision tap. Closing
 * via the X surfaces a "Decide later" no-op (user remains in their
 * current trial state; the next gate fires the same screen again).
 */
import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, hitSlop, type } from '../styles/theme';
import Button from '../components/Button';
import { useToast } from '../components/Toast';
import * as cascade from '../lib/payments/cascade';
import * as playBilling from '../lib/payments/playBilling';
import { skuFor } from '../lib/payments/catalogue';
import { logError, logInfo } from '../lib/errorLog';
import { audit } from '../lib/observability';

// 2-tier model (founder override 2026-05-25): one gate at day 21,
// plus the payment-failure overlay. The legacy 'day14' variant from
// the 3-tier cascade is accepted as a synonym of 'day21' so any
// stale navigation calls don't crash; both render the same surface.

function _variantContent(variant) {
  switch (variant) {
    case 'day21':
    case 'day14':   // legacy synonym
    case 'day28':   // legacy synonym
      return {
        title: 'Your Pro trial is winding down',
        subtitle: "Pro keeps the engine and the food log. Free keeps your data and safety guardrails; some surfaces become read-only.",
        primaryCta: 'Stay on Pro',
        primaryTarget: 'pro',
        secondaryCta: null,
        secondaryTarget: null,
        tertiaryCta: 'Drop to Free',
        tertiaryTarget: 'free',
        surface: 'cascade_day21_gate',
      };
    case 'payment_failure':
      return {
        title: "We couldn't take your payment",
        subtitle: "Update your billing in Google Play within 3 days to keep your current features. After that you'll drop to Free.",
        primaryCta: 'Open billing settings',
        primaryTarget: 'billing',
        secondaryCta: null,
        secondaryTarget: null,
        tertiaryCta: 'Decide later',
        tertiaryTarget: null,
        surface: 'payment_failure_gate',
      };
    default:
      return null;
  }
}

export default function CascadeGateScreen({ navigation, route }) {
  const toast = useToast();
  const variant = route?.params?.variant ?? 'day14';
  const pricingWindow = route?.params?.pricingWindow ?? 'open_beta';
  const content = _variantContent(variant);
  const [busy, setBusy] = useState(null);  // which CTA is in-flight

  const dismiss = useCallback(() => {
    if (navigation?.canGoBack?.()) navigation.goBack();
  }, [navigation]);

  const handlePay = useCallback(async (targetTier) => {
    audit('cascade.pay.tap', { targetTier, gateDay: variant });
    setBusy(targetTier);
    const sku = skuFor(targetTier, pricingWindow);
    if (!sku) {
      logError('CascadeGate.skuMissing', new Error('sku not found'), {
        targetTier, pricingWindow,
      });
      toast.show("Couldn't load the subscription option, try again later", { variant: 'error' });
      setBusy(null);
      return;
    }
    try {
      // Initiate purchase. The webhook posts back the tier change;
      // we also call cascade.payAt optimistically so the local state
      // updates immediately (idempotent, webhook will reconcile).
      const purchaseResult = await playBilling.purchasePackage(sku.id);
      const ref = purchaseResult?.transactionId ?? `client_${Date.now()}`;
      const cascadeResult = await cascade.payAt(targetTier, ref, content.surface);
      if (!cascadeResult.ok) {
        logError('CascadeGate.payAt.failed',
          new Error(cascadeResult.error ?? 'unknown'),
          { targetTier });
      }
      logInfo('CascadeGate.paid', `tier=${targetTier} sku=${sku.id}`);
      dismiss();
    } catch (e) {
      // Purchase cancelled by user OR genuine failure. Distinguish
      // by message if possible; surface a generic friendly note.
      const msg = e?.message ?? '';
      if (/cancel|abort/i.test(msg)) {
        logInfo('CascadeGate.purchaseCancelled', `tier=${targetTier}`);
      } else {
        logError('CascadeGate.purchaseFailed', e, { targetTier });
        toast.show('Purchase did not complete. Try again or pick a different option', { variant: 'warning', duration: 5000 });
      }
    } finally {
      setBusy(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pricingWindow, content?.surface, dismiss]);

  const handleSkip = useCallback(async (targetTier) => {
    audit('cascade.skip.tap', { targetTier, gateDay: variant });
    setBusy(targetTier ?? 'skip');
    try {
      if (targetTier === 'free') {
        await cascade.skipToFree(content.surface);
      } else if (targetTier === 'pro') {
        // Day-14 "Switch to Pro", choosing Pro now skips the
        // automatic complete→pro downgrade, with locked-in pricing.
        // For day14 we use skipToPro (user_skip → pro_trial_active).
        // For day28 there is no "Switch to Pro" option (already on
        // pro trial).
        await cascade.skipToPro(content.surface);
      }
      dismiss();
    } catch (e) {
      logError('CascadeGate.skip.threw', e, { targetTier });
    } finally {
      setBusy(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content?.surface, dismiss]);

  const handleBilling = useCallback(() => {
    // Deep link to platform-managed subscription page. Apple / Google
    // both require their own UI for billing updates.
    // expo Linking can open the iOS / Android subscription URLs.
    // eslint-disable-next-line global-require
    const { Linking, Platform } = require('react-native');
    const url = Platform.OS === 'ios'
      ? 'itms-apps://apps.apple.com/account/subscriptions'
      : 'https://play.google.com/store/account/subscriptions';
    Linking.openURL(url).catch((e) => {
      logError('CascadeGate.openBilling', e);
      toast.show("Couldn't open billing settings", { variant: 'error' });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!content) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Unknown cascade variant: {variant}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={{ width: 24 }} />
        <Text style={styles.headerTitle}>Subscription</Text>
        <TouchableOpacity onPress={dismiss} hitSlop={hitSlop} accessibilityLabel="Close">
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{content.title}</Text>
        <Text style={styles.subtitle}>{content.subtitle}</Text>

        {/* TierComparisonStrip was a 3-tier Pro-vs-Complete strip;
            in the 2-tier model the gate is a single Pro / Free
            decision and the strip is dropped from this surface. */}

        <View style={styles.ctaStack}>
          {content.primaryTarget === 'billing' ? (
            <Button
              title={content.primaryCta}
              size="lg"
              disabled={busy !== null}
              onPress={handleBilling}
            />
          ) : content.primaryTarget ? (
            <Button
              title={content.primaryCta}
              size="lg"
              loading={busy === content.primaryTarget}
              disabled={busy !== null}
              onPress={() => handlePay(content.primaryTarget)}
            />
          ) : null}

          {content.secondaryCta && content.secondaryTarget === 'pro' ? (
            <Button
              title={content.secondaryCta}
              variant="secondary"
              loading={busy === 'pro'}
              disabled={busy !== null}
              onPress={() => handlePay('pro')}
            />
          ) : null}

          {content.tertiaryCta ? (
            <Button
              title={content.tertiaryCta}
              variant="tertiary"
              disabled={busy !== null}
              onPress={() => {
                if (content.tertiaryTarget === 'free') handleSkip('free');
                else dismiss();
              }}
            />
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.tabBarBorder,
  },
  headerTitle: { ...type.title, color: colors.textPrimary },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  stripWrap: {
    marginBottom: spacing.xl,
  },
  ctaStack: {
    gap: spacing.md,
  },
  errorText: { color: colors.error },
});
