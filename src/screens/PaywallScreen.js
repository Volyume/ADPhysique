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
import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, hitSlop, type } from '../styles/theme';
import { LINKS } from '../lib/links';
import TierComparisonStrip from '../components/TierComparisonStrip';
import Button from '../components/Button';
import * as cascade from '../lib/payments/cascade';
import * as playBilling from '../lib/payments/playBilling';
import { skuFor, priceTextFor } from '../lib/payments/catalogue';
import { track as trackEvent } from '../lib/engineTelemetry';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { logError, logInfo } from '../lib/errorLog';
import { audit } from '../lib/observability';

export default function PaywallScreen({ navigation, route }) {
  const trigger = route?.params?.trigger ?? 'unknown';
  const ctaMode = route?.params?.ctaMode ?? 'try_pro_14d';
  const pricingWindow = route?.params?.pricingWindow ?? 'open_beta';
  const surface = `differential_${trigger}`;

  const { user } = useAppStore(useShallow((s) => ({ user: s.user })));
  const userId = user?.id;

  const [busy, setBusy] = useState(false);

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
    const sku = skuFor('pro', pricingWindow);
    if (!sku) {
      Alert.alert('Subscription unavailable', 'Could not load the subscription option. Try again later.');
      setBusy(false);
      return;
    }
    if (userId) {
      trackEvent(userId, 'paywall_tapped_cta', { surface, cta: 'pay_pro' }).catch(() => {});
    }
    try {
      const purchaseResult = await playBilling.purchasePackage(sku.id);
      const ref = purchaseResult?.transactionId ?? `client_${Date.now()}`;
      const result = await cascade.payAt('pro', ref, surface);
      if (!result.ok) {
        logError('Paywall.payAt.failed', new Error(result.error ?? 'unknown'), { surface });
      }
      logInfo('Paywall.paid', `surface=${surface} sku=${sku.id}`);
      if (navigation?.canGoBack?.()) navigation.goBack();
    } catch (e) {
      const msg = e?.message ?? '';
      if (/cancel|abort/i.test(msg)) {
        logInfo('Paywall.purchaseCancelled', `surface=${surface}`);
      } else {
        logError('Paywall.purchaseFailed', e, { surface });
        Alert.alert('Purchase did not complete', 'Try again or pick a different option.');
      }
    } finally {
      setBusy(false);
    }
  }, [pricingWindow, userId, surface, navigation]);

  // Restore is a Play requirement: a user who already bought Pro (new
  // phone, reinstall) must be able to get their entitlement back without
  // paying twice. Re-reads the active purchase from Google and re-writes
  // tier_history through the same cascade path a fresh purchase uses.
  const handleRestore = useCallback(async () => {
    if (busy) return;
    audit('paywall.restore.tap', { surface });
    setBusy(true);
    try {
      const info = await playBilling.restorePurchases();
      const hasPro = Array.isArray(info?.activeEntitlements) && info.activeEntitlements.includes('pro');
      if (hasPro) {
        const ref = info.latestTransactionId ?? `restore_${Date.now()}`;
        await cascade.payAt('pro', ref, 'restore_purchases');
        logInfo('Paywall.restored', `surface=${surface}`);
        Alert.alert('Pro restored', 'Your subscription is active again.');
        if (navigation?.canGoBack?.()) navigation.goBack();
      } else {
        Alert.alert('Nothing to restore', 'We could not find an active subscription on this Google account.');
      }
    } catch (e) {
      logError('Paywall.restoreFailed', e, { surface });
      Alert.alert('Could not restore', 'Try again in a moment.');
    } finally {
      setBusy(false);
    }
  }, [busy, surface, navigation]);

  const priceText = priceTextFor('pro', pricingWindow) ?? priceTextFor('pro', 'open_beta') ?? '£0.99/month';
  const ctaLabel = ctaMode === 'try_pro_14d'
    ? 'Try Pro free for 21 days'
    : `Get Pro for ${priceText}`;
  // Play subscription disclosure. Auto-renew, price, billing period and
  // how to cancel must be on the purchase surface itself.
  const termsText = ctaMode === 'try_pro_14d'
    ? `Free for 21 days, then ${priceText}. Renews monthly until you cancel. Manage or cancel anytime in Google Play.`
    : `${priceText}, renewing monthly until you cancel. Manage or cancel anytime in Google Play.`;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={{ width: 24 }} />
        <Text style={styles.headerTitle}>Upgrade</Text>
        <TouchableOpacity onPress={dismiss} hitSlop={hitSlop} accessibilityLabel="Close">
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Pro is the coach</Text>
        <Text style={styles.subtitle}>
          Pro reads your training, weight, and food together and adjusts your plan and targets every week, with a written reason for every change.
        </Text>

        <View style={styles.stripWrap}>
          <TierComparisonStrip
            pricingWindow={pricingWindow}
            highlighted="pro"
          />
        </View>

        <View style={styles.ctaStack}>
          <Button title={ctaLabel} size="lg" loading={busy} onPress={handlePay} />
          <Button title="Not now" variant="tertiary" disabled={busy} onPress={dismiss} />
        </View>

        <Text style={styles.terms}>{termsText}</Text>

        <View style={styles.legalRow}>
          <TouchableOpacity
            onPress={handleRestore}
            disabled={busy}
            hitSlop={hitSlop}
            accessibilityRole="button"
            accessibilityLabel="Restore purchases"
          >
            <Text style={styles.legalLink}>Restore purchases</Text>
          </TouchableOpacity>
          <Text style={styles.legalDot}>·</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('SubscriptionPolicy')}
            hitSlop={hitSlop}
            accessibilityRole="button"
            accessibilityLabel="Subscription terms"
          >
            <Text style={styles.legalLink}>Subscription terms</Text>
          </TouchableOpacity>
          <Text style={styles.legalDot}>·</Text>
          <TouchableOpacity
            onPress={() => Linking.openURL(LINKS.privacyPolicy).catch(() => {})}
            hitSlop={hitSlop}
            accessibilityRole="button"
            accessibilityLabel="Privacy policy"
          >
            <Text style={styles.legalLink}>Privacy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
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
  stripWrap: { marginBottom: spacing.xl },
  ctaStack: { gap: spacing.md },
  terms: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    lineHeight: 17,
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
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    textDecorationLine: 'underline',
  },
  legalDot: { color: colors.textMuted, fontSize: fontSize.xs },
});
