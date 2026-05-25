/**
 * SubscriptionScreen
 *
 * Reached from You → Subscription. Surfaces current tier + cascade
 * stage + locked-in price + days remaining + manage CTAs.
 *
 * Locked in UI_FLOWS_LOCKED.md line 195 and
 * SUBSCRIPTION_AND_PAYMENT_LOCKED.md lines 143-162 (cancellation flow)
 * and 328-333 (restore purchases).
 *
 * Reads the locally-synced users_profile mirror (trial_state,
 * locked_in_price_tier, complete_trial_ends_at, pro_trial_ends_at).
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator,
  ScrollView, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize, fontWeight, hitSlop } from '../styles/theme';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { isPaidTier } from '../lib/proGate';
import * as cascade from '../lib/payments/cascade';
import { restorePurchases } from '../lib/payments/restore';
import { skuFor } from '../lib/payments/catalogue';
import { logError, logInfo } from '../lib/errorLog';

const STAGE_LABEL = {
  unstarted:       'Not started',
  complete_trial:  'Complete trial',
  pro_trial:       'Pro trial',
  paid:            'Paid',
  free:            'Free',
};

const PRICING_WINDOW_LABEL = {
  open_beta: 'Open beta pricing',
  founders:  'Founders pricing',
  standard:  'Standard pricing',
};

export default function SubscriptionScreen({ navigation }) {
  const { userProfile } = useAppStore(useShallow((s) => ({
    userProfile: s.userProfile,
  })));

  const tier = isPaidTier(userProfile);
  const stage = cascade.stageOf(userProfile);
  const daysLeft = cascade.daysRemaining(userProfile);
  const lockedWindow = userProfile?.lockedInPriceTier ?? userProfile?.locked_in_price_tier ?? null;

  const currentSku = (tier === 'pro' || tier === 'complete') && lockedWindow
    ? skuFor(tier, lockedWindow)
    : null;

  const [busy, setBusy] = useState(false);

  const handleCancel = useCallback(() => {
    Alert.alert(
      'Cancel your Volyume subscription?',
      "You'll keep your features until the current billing period ends. After that you'll drop to Free. Your training history, food log, and check-ins all stay; some features become read-only.",
      [
        { text: 'Keep my subscription', style: 'cancel' },
        {
          text: 'Cancel anyway',
          style: 'destructive',
          onPress: () => {
            // Apple + Google both require their own UI for actual
            // cancellation. We can't cancel server-side.
            const url = Platform.OS === 'ios'
              ? 'itms-apps://apps.apple.com/account/subscriptions'
              : 'https://play.google.com/store/account/subscriptions';
            Linking.openURL(url).catch((e) => {
              logError('Subscription.openCancelUrl', e);
              Alert.alert('Could not open subscription settings');
            });
          },
        },
      ],
    );
  }, []);

  const handleRestore = useCallback(async () => {
    setBusy(true);
    try {
      const result = await restorePurchases({
        currentTrialState: userProfile?.trialState ?? userProfile?.trial_state ?? null,
      });
      if (!result.ok) {
        Alert.alert(
          'Could not restore',
          result.error === 'no_client'
            ? 'Cloud client unavailable. Try again later.'
            : 'Something went wrong. Try again.',
        );
      } else if (!result.tier) {
        Alert.alert('Nothing to restore', 'There is no active subscription on this account.');
      } else if (result.alreadyCurrent) {
        Alert.alert('Already restored', `Your ${result.tier} subscription is already active on this device.`);
      } else {
        logInfo('Subscription.restored', `tier=${result.tier}`);
        Alert.alert('Restored', `Your ${result.tier} subscription is active.`);
      }
    } finally {
      setBusy(false);
    }
  }, [userProfile]);

  const handleUpgrade = useCallback(() => {
    navigation?.navigate?.('CascadeGate', { variant: 'day14', pricingWindow: lockedWindow ?? 'open_beta' });
  }, [navigation, lockedWindow]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()} hitSlop={hitSlop}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Current state card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Your plan</Text>
          <Text style={styles.cardValue}>
            {tier === 'complete' ? 'Complete' : tier === 'pro' ? 'Pro' : 'Free'}
          </Text>
          <Text style={styles.cardSub}>
            {STAGE_LABEL[stage] ?? '—'}
            {daysLeft != null ? ` · ${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining` : ''}
          </Text>
        </View>

        {currentSku ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Price</Text>
            <Text style={styles.cardValue}>{currentSku.priceText}</Text>
            <Text style={styles.cardSub}>
              {PRICING_WINDOW_LABEL[currentSku.pricingWindow] ?? currentSku.pricingWindow}
              {' · locked for life of subscription'}
            </Text>
          </View>
        ) : null}

        {/* Manage actions */}
        <View style={styles.actionGroup}>
          {tier === 'free' || stage === 'pro_trial' ? (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleUpgrade}
              accessibilityRole="button"
            >
              <Text style={styles.primaryBtnText}>
                {tier === 'free' ? 'Upgrade' : 'Stay on Complete'}
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={handleRestore}
            disabled={busy}
            accessibilityRole="button"
          >
            {busy ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <Text style={styles.secondaryBtnText}>Restore purchases</Text>
            )}
          </TouchableOpacity>

          {tier === 'pro' || tier === 'complete' ? (
            <TouchableOpacity
              style={styles.tertiaryBtn}
              onPress={handleCancel}
              accessibilityRole="button"
            >
              <Text style={styles.tertiaryBtnText}>Cancel subscription</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={styles.footnote}>
          Subscriptions are billed by {Platform.OS === 'ios' ? 'Apple' : 'Google Play'}.
          To change your payment method or cancel, open subscription settings in
          the {Platform.OS === 'ios' ? 'App Store' : 'Play Store'}.
        </Text>
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardLabel: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  cardValue: {
    color: colors.textPrimary,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  cardSub: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  actionGroup: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
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
  secondaryBtn: {
    backgroundColor: colors.surface2,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  tertiaryBtn: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  tertiaryBtnText: {
    color: colors.error,
    fontSize: fontSize.md,
  },
  footnote: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: spacing.xl,
    lineHeight: 18,
  },
});
