/**
 * PaywallScreen
 *
 * Modal opened from a DifferentialBadge tap (Move #4) or from any
 * other "Upgrade to Pro" surface. Lighter weight than CascadeGate
 * this is a single decision: pay or dismiss. CascadeGate handles the
 * day-14 / day-28 cascade gates where the cascade decision is more
 * branched.
 *
 * Navigation params:
 *   trigger:       which of the 6 differential triggers fired (for telemetry)
 *   ctaMode:       'try_pro_14d' | 'buy_pro'  (selects copy + button)
 *   pricingWindow: 'open_beta' | 'founders' | 'standard'
 *
 * Tap "Start" initiates the IAP purchase via playBilling.purchasePackage,
 * then calls cascade.payAt to write tier_history. On dismiss we just
 * close. Either decision is logged via paywall_tapped_cta telemetry.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { appAlert } from '../components/AppAlert';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { storeName } from '../lib/storeName';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, fontSize, fontWeight, radius, hitSlop, type } from '../styles/theme';
import ModalHeader from '../components/ModalHeader';
import { LINKS } from '../lib/links';
import TierComparisonStrip from '../components/TierComparisonStrip';
import Button from '../components/Button';
import BillingPeriodSelector from '../components/BillingPeriodSelector';
import * as cascade from '../lib/payments/cascade';
import * as playBilling from '../lib/payments/playBilling';
import { restorePurchases } from '../lib/payments/restore';
import { skuFor } from '../lib/payments/catalogue';
import { pickPaywallExcerpt } from './paywallExcerpts';
import { usePlayPrices } from '../lib/payments/usePlayPrices';
import { track as trackEvent } from '../lib/engineTelemetry';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { logError, logInfo } from '../lib/errorLog';
import { audit } from '../lib/observability';
import * as haptics from '../lib/haptics';

export default function PaywallScreen({ navigation, route }) {
  const trigger = route?.params?.trigger ?? 'unknown';
  const ctaMode = route?.params?.ctaMode ?? 'try_pro_14d';
  const surface = `differential_${trigger}`;

  // Billing period the user is buying. COMP-007: annual is the default. Health
  // and fitness is the only category where annual dominates (~60-68% of
  // revenue) and the saving is honest (44%); monthly stays fully visible as the
  // escape hatch (anchor, don't hide). Caller can force monthly via param.
  const [period, setPeriod] = useState(route?.params?.period === 'monthly' ? 'monthly' : 'annual');

  const { user } = useAppStore(useShallow((s) => ({ user: s.user })));
  const userId = user?.id;

  const [busy, setBusy] = useState(false);

  // Fire the paywall_shown impression once per mount (mirrors HomeScreen's
  // call signature). The ref guards a re-render / strict-mode double-invoke
  // from flapping the same view into telemetry; only the CTA/dismiss taps emit
  // paywall_tapped_cta below, so this is the view half that makes view -> trial
  // computable.
  const shownRef = useRef(false);
  useEffect(() => {
    if (shownRef.current) return;
    shownRef.current = true;
    if (userId) {
      trackEvent(userId, 'paywall_shown', {
        surface: 'paywall_screen',
        trigger,
        user_pricing_window: route?.params?.pricingWindow ?? 'open_beta',
      }).catch(() => {});
    }
    // Once per mount: intentionally no deps so a re-render never re-sends it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = useCallback(() => {
    audit('paywall.dismiss.tap', { surface });
    if (userId) {
      trackEvent(userId, 'paywall_tapped_cta', { surface, cta: 'dismiss' }).catch(() => {});
    }
    if (navigation?.canGoBack?.()) navigation.goBack();
  }, [navigation, userId, surface]);

  const handlePay = useCallback(async () => {
    audit('paywall.upgrade.tap', { surface, target: 'pro' });
    setBusy(true);
    const sku = skuFor('pro', period);
    if (!sku) {
      appAlert('Subscription unavailable', 'Could not load the subscription option. Try again later.');
      setBusy(false);
      return;
    }
    if (userId) {
      trackEvent(userId, 'paywall_tapped_cta', { surface, cta: 'pay_pro' }).catch(() => {});
    }
    try {
      const purchaseResult = await playBilling.purchasePackage(sku.id);
      const ref = purchaseResult?.transactionId ?? `client_${Date.now()}`;
      await cascade.payAt('pro', ref, surface);
      // SUB-003: verify the purchase token with Google and write Pro
      // server-side, AWAITED (not fire-and-forget) so a failed grant is seen
      // rather than swallowed. The optimistic unlock from payAt still holds, so
      // a confirm failure never denies the access just paid for: the Play RTDN
      // push and the next cloud refresh reconcile it. We surface the delay
      // instead of silently dismissing onto a Pro screen the server never
      // granted.
      const confirm = await cascade.confirmPurchase({
        purchaseToken: purchaseResult?.purchaseToken, subscriptionId: sku.id,
      });
      if (!confirm.ok) {
        logError('Paywall.confirmPurchase', confirm.error ?? 'confirm_failed', { surface });
        appAlert('Payment received', 'Finishing activation, this can take a moment.');
      }
      logInfo('Paywall.paid', `surface=${surface} sku=${sku.id}`);
      if (navigation?.canGoBack?.()) navigation.goBack();
    } catch (e) {
      const msg = e?.message ?? '';
      if (/cancel|abort/i.test(msg)) {
        logInfo('Paywall.purchaseCancelled', `surface=${surface}`);
      } else {
        logError('Paywall.purchaseFailed', e, { surface });
        appAlert('Purchase did not complete', 'Try again or pick a different option.');
      }
    } finally {
      setBusy(false);
    }
  }, [period, userId, surface, navigation]);

  // Restore is a Play requirement: a user who already bought Pro (new
  // phone, reinstall) must be able to get their entitlement back without
  // paying twice. Re-reads the active purchase from Google and re-writes
  // tier_history through the same cascade path a fresh purchase uses.
  const handleRestore = useCallback(async () => {
    if (busy) return;
    audit('paywall.restore.tap', { surface });
    setBusy(true);
    try {
      // M-1: one restore implementation. Route through the shared restore module
      // (also used by SubscriptionScreen) instead of a second inline copy.
      const result = await restorePurchases();
      if (!result.ok) {
        logError('Paywall.restoreFailed', new Error(result.error ?? 'unknown'), { surface });
        appAlert('Could not restore', 'Try again in a moment.');
      } else if (result.tier === 'pro') {
        logInfo('Paywall.restored', `surface=${surface}`);
        appAlert('Pro restored', 'Your subscription is active again.');
        if (navigation?.canGoBack?.()) navigation.goBack();
      } else {
        appAlert('Nothing to restore', 'We could not find an active subscription for this store account.');
      }
    } catch (e) {
      logError('Paywall.restoreFailed', e, { surface });
      appAlert('Could not restore', 'Try again in a moment.');
    } finally {
      setBusy(false);
    }
  }, [busy, surface, navigation]);

  // C-2 / PLAY-002: localised store prices. priceFor returns null until the
  // active store responds; we never substitute a hardcoded price. The CTA and
  // disclosure drop the figure until it loads, and the chips show a short
  // placeholder.
  const priceFor = usePlayPrices();
  // COMP-007 Stage B: deterministic daily pick; null (block hidden) until the
  // curated list is non-empty. Static, offline, no PII.
  const excerpt = pickPaywallExcerpt();
  const priceText = priceFor('pro', period);
  const monthlyPrice = priceFor('pro', 'monthly');
  const annualPrice = priceFor('pro', 'annual');
  const renewCadence = period === 'annual' ? 'yearly' : 'monthly';
  // Trial shape (founder override 2026-06-06, SUBSCRIPTION_AND_PAYMENT_LOCKED):
  // 14 cardless days run inside the app BEFORE a purchase surface, then the
  // store subscription carries a 7-day intro free trial. This screen is a store
  // purchase surface, so its disclosure must state the 7-day store offer, not
  // the 21-day journey total. Drive this length from the SDK's reported offer +
  // eligibility when that becomes available.
  const ctaLabel = ctaMode === 'try_pro_14d'
    ? 'Try Pro free for 7 days'
    : priceText ? `Get Pro for ${priceText}` : 'Get Pro';
  // Store subscription disclosure. Auto-renew, price, billing period and
  // how to cancel must be on the purchase surface itself. Until the store
  // price loads we state the renewal cadence without a figure rather than a
  // hardcoded price (PLAY-002); the figure appears the moment the store responds.
  // Subscriptions are managed in the platform's own store.
  const storeManage = storeName();
  const termsText = ctaMode === 'try_pro_14d'
    ? (priceText
        ? `Free for 7 days, then ${priceText}. Renews ${renewCadence} until you cancel. Manage or cancel anytime in ${storeManage}.`
        : `Free for 7 days, then it renews ${renewCadence} until you cancel. Manage or cancel anytime in ${storeManage}.`)
    : (priceText
        ? `${priceText}, renewing ${renewCadence} until you cancel. Manage or cancel anytime in ${storeManage}.`
        : `Renews ${renewCadence} until you cancel. Manage or cancel anytime in ${storeManage}.`);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ModalHeader title="Upgrade" onClose={dismiss} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Start Precision Coaching</Text>
        <Text style={styles.subtitle}>
          Volyume reads your training, weight, food and check-ins together, then updates your plan and targets with a written reason for every change.
        </Text>

        {/* COMP-007 Stage B: one verified Google Play excerpt, proof BEFORE
            price. Renders only when a curated excerpt exists (ships dark until
            the honesty bar in paywallExcerpts.js is met). */}
        {excerpt ? (
          <View style={styles.reviewCard} accessible accessibilityLabel={`${excerpt.stars} star review. ${excerpt.quote}. ${excerpt.name}, ${excerpt.source}, ${excerpt.date}.`}>
            <View style={styles.reviewStars} accessibilityElementsHidden importantForAccessibility="no">
              {Array.from({ length: Math.max(0, Math.min(5, excerpt.stars)) }).map((_, i) => (
                <Ionicons key={i} name="star" size={13} color={colors.primary} />
              ))}
            </View>
            <Text style={styles.reviewQuote} numberOfLines={3}>{`"${excerpt.quote}"`}</Text>
            <Text style={styles.reviewMeta}>{`${excerpt.name} - ${excerpt.source} - ${excerpt.date}`}</Text>
          </View>
        ) : null}

        <View style={styles.stripWrap}>
          <TierComparisonStrip
            pricingWindow={period}
            highlighted="pro"
          />
        </View>

        {/* COMP-007: annual first (left) + preselected, monthly visible second. */}
        <BillingPeriodSelector
          value={period}
          onChange={(p) => { haptics.selection(); setPeriod(p); }}
          monthlyPrice={monthlyPrice}
          annualPrice={annualPrice}
          style={styles.periodSelector}
        />

        <View style={styles.ctaStack}>
          <Button title={ctaLabel} size="lg" loading={busy} onPress={handlePay} />
          <Button title="Not now" variant="tertiary" disabled={busy} onPress={dismiss} />
        </View>

        <Text style={styles.terms}>{termsText}</Text>

        <View style={styles.legalRow}>
          {/* Haptics completion pass (2026-07-10): billing-consequential
              (restore purchases), explicitly excluded -- left without an
              added haptic. */}
          <TouchableOpacity
            onPress={handleRestore}
            disabled={busy}
            hitSlop={hitSlop}
            style={[styles.legalButton, busy && styles.legalButtonDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Restore purchases"
          >
            <Ionicons name="refresh-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.legalLink}>Restore purchases</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { haptics.selection(); navigation.navigate('SubscriptionPolicy'); }}
            hitSlop={hitSlop}
            style={styles.legalButton}
            accessibilityRole="button"
            accessibilityLabel="Subscription terms"
          >
            <Ionicons name="document-text-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.legalLink}>Subscription terms</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { haptics.selection(); Linking.openURL(LINKS.privacyPolicy).catch(() => {}); }}
            hitSlop={hitSlop}
            style={styles.legalButton}
            accessibilityRole="button"
            accessibilityLabel="Privacy policy"
          >
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.legalLink}>Privacy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
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
  stripWrap: { marginBottom: spacing.lg },
  reviewCard: {
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, padding: spacing.md,
    marginBottom: spacing.xl, gap: spacing.xs,
  },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewQuote: { ...type.bodySm, color: colors.textPrimary, fontStyle: 'italic' },
  reviewMeta: { ...type.caption, color: colors.textMuted },
  periodSelector: { marginBottom: spacing.xl },
  ctaStack: { gap: spacing.md },
  terms: {
    ...type.captionTight,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  legalLink: {
    ...type.caption,
    color: colors.textSecondary,
  },
  legalButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.sm,
  },
  legalButtonDisabled: { opacity: 0.5 },
});
