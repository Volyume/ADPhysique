/**
 * SubscriptionScreen
 *
 * Reached from You > Subscription. Surfaces current tier + cascade
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
import { View, Text, StyleSheet, ScrollView, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, type } from '../styles/theme';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import Card from '../components/Card';
import CancelReasonSheet from '../components/CancelReasonSheet';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useToast } from '../components/Toast';
import { isPaidTier } from '../lib/proGate';
import * as cascade from '../lib/payments/cascade';
import { restorePurchases } from '../lib/payments/restore';
import { skuFor } from '../lib/payments/catalogue';
import { usePlayPrices } from '../lib/payments/usePlayPrices';
import { logError, logInfo } from '../lib/errorLog';
import { audit } from '../lib/observability';
import { storeName } from '../lib/storeName';

const STAGE_LABEL = {
  unstarted:       'Not started',
  pro_trial:       'Pro trial',
  paid:            'Paid',
  free:            'Free',
};

export default function SubscriptionScreen({ navigation, route }) {
  const toast = useToast();
  const { userProfile, billingPeriod, storeTier, userId } = useAppStore(useShallow((s) => ({
    userProfile: s.userProfile,
    billingPeriod: s.billingPeriod,
    storeTier: s.tier,
    userId: s.user?.id,
  })));

  // M-1 (audit): resolve the Pro/Free value from store.tier, the same source
  // every feature gate uses, so this screen can't disagree with the gates.
  // stage / daysRemaining stay derived from trial_state (trial-progress display,
  // not an entitlement gate). isPaidTier(userProfile) is the fallback before the
  // store tier has been hydrated.
  const tier = storeTier ?? isPaidTier(userProfile);
  const stage = cascade.stageOf(userProfile);
  const daysLeft = cascade.daysRemaining(userProfile);
  // Flat pricing (2026-06-06): no more pricing windows. The billing period
  // (monthly/annual) is set by the Play webhook on purchase and read here
  // via refreshTierFromCloud -> store.billingPeriod. Null/unknown shows the
  // monthly price. Only show a price once the user is actually paying.
  const period = billingPeriod === 'annual' ? 'annual' : 'monthly';
  const currentSku = stage === 'paid' ? skuFor('pro', period) : null;
  // C-2: localised store price, catalogue text as the pre-load fallback.
  const priceFor = usePlayPrices();
  const platformStore = storeName();

  const [busy, setBusy] = useState(false);
  const [cancelSheetVisible, setCancelSheetVisible] = useState(false);

  const handleCancel = useCallback(() => {
    // COMP-025-A: one optional reason question before the store handoff,
    // replacing the bare confirm alert. The sheet never gates the exit.
    setCancelSheetVisible(true);
  }, []);

  const handleStoreHandoff = useCallback(() => {
    // Apple + Google both require their own UI for actual cancellation.
    // We can't cancel server-side.
    const url = Platform.OS === 'ios'
      ? 'itms-apps://apps.apple.com/account/subscriptions'
      : 'https://play.google.com/store/account/subscriptions';
    Linking.openURL(url).catch((e) => {
      logError('Subscription.openCancelUrl', e);
      toast.show("Couldn't open subscription settings", { variant: 'error' });
    });
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
    // A user mid pro-trial taps "Stay on Pro" to lock in, which is the
    // day14 purchase gate. A free / never-started user is going Pro for the
    // first time: send them through ProUpgrade, which starts the 14-day
    // cardless trial and routes into the full Pro setup, rather than the
    // CascadeGate purchase sheet (which would charge them and skip setup).
    if (stage === 'pro_trial') {
      navigation?.navigate?.('CascadeGate', { variant: 'day14', period });
    } else {
      // COMP-025-B: carry the win-back arrival through so the resubscribe
      // prefers the win-back Play offer (inert when none is configured).
      navigation?.navigate?.('ProUpgrade', { fromWinback: !!route?.params?.fromWinback });
    }
  }, [navigation, period, stage, route]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <BackHeader title="Subscription" />

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Current state card */}
        <Card borderless style={styles.card}>
          <Text maxFontSizeMultiplier={1.3} style={styles.cardLabel}>Your plan</Text>
          <Text maxFontSizeMultiplier={1.3} style={styles.cardValue}>
            {tier === 'pro' ? 'Pro' : 'Free'}
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={styles.cardSub}>
            {STAGE_LABEL[stage] ?? '-'}
            {daysLeft != null ? ` - ${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining` : ''}
          </Text>
        </Card>

        {currentSku ? (
          <Card borderless style={styles.card}>
            <Text maxFontSizeMultiplier={1.3} style={styles.cardLabel}>Price</Text>
            {/* PLAY-002: the store's localised price, or a short placeholder
                until the active store responds. Never a hardcoded fallback. */}
            <Text maxFontSizeMultiplier={1.3} style={styles.cardValue}>{priceFor('pro', period) ?? '...'}</Text>
            <Text maxFontSizeMultiplier={1.3} style={styles.cardSub}>
              {period === 'annual' ? 'Billed yearly' : 'Billed monthly'}
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

        <Text maxFontSizeMultiplier={1.3} style={styles.footnote}>
          Billing is handled by {platformStore}.
          To change your payment method or cancel, open subscription settings in
          {` ${platformStore}`}.
        </Text>
      </ScrollView>

      <CancelReasonSheet
        visible={cancelSheetVisible}
        onClose={() => setCancelSheetVisible(false)}
        onStoreHandoff={handleStoreHandoff}
        storeLabel={platformStore}
        userId={userId}
        surface="pre_store_handoff"
      />
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
    ...type.bodySm,
    color: colors.textMuted,
    marginTop: spacing.xl,
  },
});
