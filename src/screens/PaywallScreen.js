/**
 * PaywallScreen
 *
 * Modal opened from a DifferentialBadge tap (Move #4) or from any
 * other "Upgrade to Pro" surface. Lighter weight than CascadeGate —
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
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize, fontWeight, hitSlop } from '../styles/theme';
import TierComparisonStrip from '../components/TierComparisonStrip';
import * as cascade from '../lib/payments/cascade';
import * as playBilling from '../lib/payments/playBilling';
import { skuFor, priceTextFor } from '../lib/payments/catalogue';
import { track as trackEvent } from '../lib/engineTelemetry';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { logError, logInfo } from '../lib/errorLog';

export default function PaywallScreen({ navigation, route }) {
  const trigger = route?.params?.trigger ?? 'unknown';
  const ctaMode = route?.params?.ctaMode ?? 'try_pro_14d';
  const pricingWindow = route?.params?.pricingWindow ?? 'open_beta';
  const surface = `differential_${trigger}`;

  const { user } = useAppStore(useShallow((s) => ({ user: s.user })));
  const userId = user?.id;

  const [busy, setBusy] = useState(false);

  const dismiss = useCallback(() => {
    if (userId) {
      trackEvent(userId, 'paywall_tapped_cta', { surface, cta: 'dismiss' }).catch(() => {});
    }
    if (navigation?.canGoBack?.()) navigation.goBack();
  }, [navigation, userId, surface]);

  const handlePay = useCallback(async () => {
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

  const priceText = priceTextFor('pro', pricingWindow) ?? '£2.99/month';
  const ctaLabel = ctaMode === 'try_pro_14d'
    ? 'Try Pro free for 14 days'
    : `Get Pro for ${priceText}`;

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
        <Text style={styles.title}>Pro adds food data</Text>
        <Text style={styles.subtitle}>
          The engine already runs your training. Pro turns on the food layer so it can tell you what's training and what's fuel.
        </Text>

        <View style={styles.stripWrap}>
          <TierComparisonStrip
            pricingWindow={pricingWindow}
            highlighted="pro"
          />
        </View>

        <View style={styles.ctaStack}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handlePay}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={ctaLabel}
          >
            {busy ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.primaryBtnText}>{ctaLabel}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tertiaryBtn}
            onPress={dismiss}
            disabled={busy}
            accessibilityRole="button"
          >
            <Text style={styles.tertiaryBtnText}>Not now</Text>
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
  headerTitle: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
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
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: colors.background,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  tertiaryBtn: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  tertiaryBtnText: {
    color: colors.textMuted,
    fontSize: fontSize.md,
  },
});
