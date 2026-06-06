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
import { useState, useCallback } from 'react';
import { appAlert } from '../components/AppAlert';
import { View, Text, StyleSheet, ScrollView, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight } from '../styles/theme';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import Card from '../components/Card';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useToast } from '../components/Toast';
import { isPaidTier } from '../lib/proGate';
import * as cascade from '../lib/payments/cascade';
import { restorePurchases } from '../lib/payments/restore';
import { skuFor } from '../lib/payments/catalogue';
import { logError, logInfo } from '../lib/errorLog';
import { audit } from '../lib/observability';

const STAGE_LABEL = {
  unstarted:       'Not started',
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
  const toast = useToast();
  const { userProfile } = useAppStore(useShallow((s) => ({
    userProfile: s.userProfile,
  })));

  const tier = isPaidTier(userProfile);
  const stage = cascade.stageOf(userProfile);
  const daysLeft = cascade.daysRemaining(userProfile);
  const lockedWindow = userProfile?.lockedInPriceTier ?? userProfile?.locked_in_price_tier ?? null;

  const currentSku = tier === 'pro' && lockedWindow
    ? skuFor('pro', lockedWindow)
    : null;

  const [busy, setBusy] = useState(false);

  const handleCancel = useCallback(() => {
    appAlert(
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
              toast.show("Couldn't open subscription settings", { variant: 'error' });
            });
          },
        },
      ],
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestore = useCallback(async () => {
    audit('subscription.restore.tap');
    setBusy(true);
    try {
      const result = await restorePurchases({
        currentTrialState: userProfile?.trialState ?? userProfile?.trial_state ?? null,
      });
      if (!result.ok) {
        toast.show(
          result.error === 'no_client'
            ? 'Cloud unavailable, try again later'
            : 'Could not restore, try again',
          { variant: 'error' },
        );
      } else if (!result.tier) {
        toast.show('No active subscription on this account', { variant: 'info' });
      } else if (result.alreadyCurrent) {
        toast.show(`Your ${result.tier} subscription is already active`, { variant: 'info' });
      } else {
        logInfo('Subscription.restored', `tier=${result.tier}`);
        toast.show(`${result.tier} subscription restored`, { variant: 'success' });
      }
    } finally {
      setBusy(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile]);

  const handleUpgrade = useCallback(() => {
    audit('subscription.upgrade.tap', { from: 'subscription_screen' });
    navigation?.navigate?.('CascadeGate', { variant: 'day21', pricingWindow: lockedWindow ?? 'open_beta' });
  }, [navigation, lockedWindow]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <BackHeader title="Subscription" />

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Current state card */}
        <Card borderless style={styles.card}>
          <Text style={styles.cardLabel}>Your plan</Text>
          <Text style={styles.cardValue}>
            {tier === 'pro' ? 'Pro' : 'Free'}
          </Text>
          <Text style={styles.cardSub}>
            {STAGE_LABEL[stage] ?? '-'}
            {daysLeft != null ? ` · ${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining` : ''}
          </Text>
        </Card>

        {currentSku ? (
          <Card borderless style={styles.card}>
            <Text style={styles.cardLabel}>Price</Text>
            <Text style={styles.cardValue}>{currentSku.priceText}</Text>
            <Text style={styles.cardSub}>
              {PRICING_WINDOW_LABEL[currentSku.pricingWindow] ?? currentSku.pricingWindow}
              {' · locked for life of subscription'}
            </Text>
          </Card>
        ) : null}

        {/* Manage actions */}
        <View style={styles.actionGroup}>
          {tier === 'free' || stage === 'pro_trial' ? (
            <Button
              title={tier === 'free' ? 'Upgrade' : 'Stay on Pro'}
              size="lg"
              onPress={handleUpgrade}
            />
          ) : null}

          <Button
            title="Restore purchases"
            variant="secondary"
            loading={busy}
            onPress={handleRestore}
          />

          {tier === 'pro' ? (
            <Button
              title="Cancel subscription"
              variant="tertiary"
              textStyle={{ color: colors.error }}
              onPress={handleCancel}
            />
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
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  card: {
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
  footnote: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: spacing.xl,
    lineHeight: 18,
  },
});
