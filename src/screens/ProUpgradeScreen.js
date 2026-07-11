import { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha, circle, shadow } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import { track as trackEvent } from '../lib/engineTelemetry';
import Button from '../components/Button';
import BillingPeriodSelector from '../components/BillingPeriodSelector';
import ModalHeader from '../components/ModalHeader';
import OAuthButtons from '../components/auth/OAuthButtons';
import TierComparisonStrip from '../components/TierComparisonStrip';
import { storeName } from '../lib/storeName';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useToast } from '../components/Toast';
import { appAlert } from '../components/AppAlert';
import { signInWithGoogle, signInWithApple, getSupabaseClient } from '../lib/supabase';
import { syncAll, bulkUploadLocalData, pullFromCloud } from '../lib/sync';
import { PRO_BETA_ACTIVE } from '../lib/proGate';
import * as haptics from '../lib/haptics';
import * as cascade from '../lib/payments/cascade';
import * as playBilling from '../lib/payments/playBilling';
import { skuFor } from '../lib/payments/catalogue';
import { restorePurchases } from '../lib/payments/restore';
import { usePlayPrices } from '../lib/payments/usePlayPrices';
import { pickPaywallExcerpt } from './paywallExcerpts';

const PRO_PERKS = [
  { icon: 'barbell-outline', text: 'A plan built around your schedule, goals, and experience level' },
  { icon: 'calendar-outline', text: 'Your training and nutrition adjust as your body responds' },
  { icon: 'nutrition-outline', text: 'Personalised calorie and protein targets, updated as your goals change' },
  { icon: 'eye-outline', text: 'After every check-in, your coach explains every decision. What changed, what was left alone, and why.' },
];

// Wave-1 A8: the honest answers a buyer weighs up at the decision point.
// Copy only. The behaviour each answer describes is owned elsewhere
// (billing in src/lib/payments/, the held-seat rule on SubscriptionPolicy);
// nothing here reads or changes billing state.
const FAQ_ITEMS = [
  {
    q: 'What happens to my logged data if I go back to Free?',
    a: 'Everything you logged is saved, and will be exactly as you left it if you come back. Your training log, plans and personal bests stay fully usable on Free.',
  },
  {
    q: 'How do I cancel?',
    a: `Through ${storeName()}, any time. You keep Pro until the end of the period you have already paid for.`,
  },
  {
    q: 'What stays free forever?',
    a: 'Workout logging, building your own plans, the exercise library, personal bests and your progress stats. None of it is ever taken away.',
  },
  {
    q: 'How does the 14-day trial work?',
    a: 'No payment card needed. New accounts get full Pro free for 14 days (one trial per account), and if you decide not to subscribe it winds down gently and nothing you logged is lost.',
  },
  {
    q: 'I subscribed before. How do I get Pro back?',
    a: `Tap Restore purchases on any Pro lock screen and we will check your subscription in ${storeName()}. Restoring never charges you.`,
  },
];

export default function ProUpgradeScreen({ navigation, route }) {
  const toast = useToast();
  // F7: subscribe to just these fields (a bare useAppStore() re-renders on every store mutation).
  const {
    user, session, userProfile, tier, setTier, refreshTierFromCloud, resetFirstRun, firstRunComplete,
  } = useAppStore(useShallow(s => ({
    user: s.user,
    session: s.session,
    userProfile: s.userProfile,
    tier: s.tier,
    setTier: s.setTier,
    refreshTierFromCloud: s.refreshTierFromCloud,
    resetFirstRun: s.resetFirstRun,
    firstRunComplete: s.firstRunComplete,
  })));

  // CP-10 batch G lane 1 (2026-07-11): live theme (src/hooks/useTheme.js).
  // Memoised: this screen renders a mapped PRO_PERKS/FAQ_ITEMS list.
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  const hasAccount = Boolean(session?.user?.id) && !user?.isLocal;
  const canTrial = cascade.canStillTrial(userProfile);

  // C-2 / PLAY-002: localised store prices. priceFor returns null until the
  // active store responds; we never substitute a hardcoded price. Until it loads, the
  // price chips show a short placeholder and the copy drops the figure.
  const priceFor = usePlayPrices();
  const monthlyPrice = priceFor('pro', 'monthly');
  const annualPrice = priceFor('pro', 'annual');

  // OAuth only (Apple/Google). The email + password upgrade path was removed
  // (founder 2026-07-01); email confirmation was flaky. handleOAuth polls for
  // the session and calls completeUpgrade itself.
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  // C3 (D71): restore is a read of an existing entitlement, not a purchase,
  // so it carries its own busy flag rather than the purchase/OAuth `busy` (a
  // quiet chrome action must not spin the primary CTA).
  const [restoring, setRestoring] = useState(false);
  // C3 (D71): one verified Google Play excerpt, ported from the deleted
  // PaywallScreen. Deterministic daily pick; null (block hidden) until the
  // honesty bar in paywallExcerpts.js is met. Static, offline, no PII.
  const excerpt = pickPaywallExcerpt();
  // Founder decision 2026-07-02 (supersedes COMP-007's annual anchor): monthly
  // is the pre-selected period on every subscribe surface, matching the
  // cascade gate, so the two revenue surfaces never disagree. Annual stays
  // visible with its honest saving; anchor, don't hide.
  const [period, setPeriod] = useState('monthly'); // billing period when subscribing

  // C2 (founder-accepted marketing sequence, 2026-07-11): the main upgrade
  // destination was the one unmeasured surface in the funnel. Reuses the
  // allow-listed paywall_shown / paywall_tapped_cta events with
  // surface: 'pro_upgrade' (no new server allow-list needed); the opt-out
  // is enforced centrally in telemetry transport (LB-9). Payloads carry
  // enums and flags only, never PII. Sheet-level events
  // (purchase_initiated/completed/failed) stay in playBilling - never
  // duplicated here.
  const shownRef = useRef(false);
  useEffect(() => {
    if (shownRef.current) return;
    shownRef.current = true;
    if (user?.id) {
      trackEvent(user.id, 'paywall_shown', {
        surface: 'pro_upgrade',
        source: route?.params?.source ?? 'unknown',
        can_trial: !!canTrial,
        has_account: !!hasAccount,
      }).catch(() => {});
    }
    // Once per mount, PaywallScreen's exact idiom: no deps so a re-render
    // never re-sends it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function trackCta(cta, extra = null) {
    if (!user?.id) return;
    trackEvent(user.id, 'paywall_tapped_cta', {
      surface: 'pro_upgrade', cta, period, ...(extra || {}),
    }).catch(() => {});
  }

  async function activatePro(supabaseUserId, { isNew }) {
    // E12 step 1: profile mirrors to cloud via the registry runner (the
    // legacy per-save syncProfile dual writer is retired; its is_beta_tester
    // soft tag went with it, the beta window is over and tier is
    // server-owned regardless).
    syncAll({ userId: supabaseUserId, localUserId: user?.id, triggeredBy: 'write' }).catch(() => {});
    if (isNew) {
      bulkUploadLocalData(supabaseUserId, user?.id).catch(() => {});
    } else {
      pullFromCloud(supabaseUserId).catch(() => {});
    }
    await setTier('pro', 'ProUpgradeScreen.activatePro');
    refreshTierFromCloud(getSupabaseClient(), supabaseUserId).catch(() => {});
  }

  // Post-beta subscribe: the real store purchase. Mirrors
  // PaywallScreen.handlePay so there's one purchase path. Store offer
  // eligibility decides 7-days-free (used the in-app trial, never paid) vs
  // pay now (already used the store trial and cancelled).
  async function subscribePro() {
    const { logError } = require('../lib/errorLog');
    // Flat pricing: subscribe at the period the user picked (monthly/annual).
    const sku = skuFor('pro', period);
    if (!sku) {
      toast.show('Subscription unavailable, try again later', { variant: 'error' });
      return;
    }
    setBusy(true);
    try {
      // COMP-025-B: prefer the win-back Play offer when the user arrived from a
      // win-back notification. Inert (normal purchase) if no offer is configured.
      const pr = await playBilling.purchasePackage(sku.id, { preferWinback: !!route?.params?.fromWinback });
      const ref = pr?.transactionId ?? `client_${Date.now()}`;
      await cascade.payAt('pro', ref, 'pro_upgrade');
      // Server-authoritative grant: verify the token with Google, write Pro
      // server-side. Awaited (not fire-and-forget) so the button stays in its
      // loading state until the server confirms, and a failed grant is seen
      // rather than swallowed. The optimistic unlock from payAt still holds, so
      // a confirm failure does not deny the access they just paid for: the
      // the store verification path and the next cloud refresh reconcile it. We
      // surface the delay rather than silently showing a Pro screen on a server
      // that never granted it.
      const confirm = await cascade.confirmPurchase({
        purchaseToken: pr?.purchaseToken, subscriptionId: sku.id,
      });
      if (!confirm.ok) {
        logError('ProUpgrade.confirmPurchase', confirm.error ?? 'confirm_failed', {});
        toast.show('Payment received. Finishing activation, this can take a moment', { variant: 'info', duration: 5000 });
      }
      setDone(true);
    } catch (e) {
      const msg = e?.message ?? '';
      if (!/cancel|abort/i.test(msg)) {
        logError('ProUpgrade.purchaseFailed', e, {});
        toast.show('Purchase did not complete, try again', { variant: 'error' });
      } else {
        // C2: a user-cancelled store sheet is funnel signal, not a failure -
        // playBilling deliberately keeps E_USER_CANCELLED out of
        // purchase_failed so failure metrics stay clean.
        trackCta('sheet_cancelled');
      }
    } finally {
      setBusy(false);
    }
  }

  // Single entry the auth paths call once a user is signed in. Beta grants
  // Pro free (the locked PRO_BETA_ACTIVE switch). Post-beta: a brand-new
  // account is entitled to the 14-day cardless trial, which onboarding's
  // Article 9 step starts, so route into setup; an existing free user who
  // has used the trial subscribes. Everyone has a real account, so there's
  // no local-only path.
  async function completeUpgrade(supabaseUserId, { isNew }) {
    if (PRO_BETA_ACTIVE) {
      await activatePro(supabaseUserId, { isNew });
      setDone(true);
      return;
    }
    // Never write tier from the client (the server owns tier; the registry
    // profiles handler never sends it). Just make sure the account holds the
    // local data. The runner's Article 9 gate can skip this for a brand-new
    // not-yet-consented account; the consent grant kicks the sync that
    // carries the profile then.
    syncAll({ userId: supabaseUserId, localUserId: user?.id, triggeredBy: 'write' }).catch(() => {});
    if (isNew) {
      bulkUploadLocalData(supabaseUserId, user?.id).catch(() => {});
    } else {
      pullFromCloud(supabaseUserId).catch(() => {});
    }
    if (cascade.canStillTrial(userProfile)) {
      // The SERVER owns trial entitlement (users_profile.trial_state); the
      // local read above can be stale, e.g. an account whose earlier
      // deletion never cleared the server row still holds a consumed trial
      // (founder repro 2026-07-02). So branch on what start_cascade actually
      // returns instead of assuming it granted one. The old code swallowed
      // the result and reset onboarding regardless, which dropped the user
      // into the free FirstRunStack name screen with no trial and no error.
      let trial = { ok: false, error: 'threw' };
      try { trial = await cascade.startCascade(); } catch (_) {}
      if (!trial.ok) {
        // A genuine RPC failure: stay put rather than resetting onboarding
        // with the tier still 'free'.
        // eslint-disable-next-line global-require
        require('../lib/errorLog').logError('ProUpgrade.startCascade', trial.error ?? 'unknown', {});
        toast.show('Could not start your trial. Try again in a moment.', { variant: 'error' });
        return;
      }
      // Fail toward the purchase sheet, never self-grant: a response with NO
      // trial_state must not read as a live trial, so missing data maps to
      // null means trialLive false, which sends the user to the honest store purchase path below.
      const ts = trial.data?.trial_state ?? null;
      const trialLive = ts === 'pro_trial_active' || ts === 'complete_trial_active';
      if (!trialLive) {
        // already_started with a consumed/expired state: this account cannot
        // trial again. Fall through to the honest path, the store purchase,
        // the store's own intro-offer eligibility still gives an eligible buyer
        // their free week. startCascade mirrored the true trial_state into
        // the local profile, so canStillTrial and the CTA label correct
        // themselves from here.
        await subscribePro();
        return;
      }
      // Trial granted (or already live). RootNavigator routes onboarding on
      // store.tier; startCascade awaits the mirror, but belt-and-braces it
      // before flipping first-run so the Pro setup is what mounts.
      if (useAppStore.getState().tier !== 'pro') {
        await setTier('pro', 'ProUpgrade.trialStart');
      }
      try {
        const result = await resetFirstRun();
        if (result && result.ok === false && result.error === 'workout_in_progress') {
          toast.show('Finish your workout in progress first, then set up Pro', { variant: 'warning', duration: 5000 });
        }
      } catch (_) {}
      return;
    }
    await subscribePro();
  }

  // Free user who already has a cloud account: just flip the tier.
  async function confirmExistingAccount() {
    if (!session?.user?.id) return;
    setBusy(true);
    try {
      await completeUpgrade(session.user.id, { isNew: false });
    } catch (_) {
      toast.show('Something went wrong, try again', { variant: 'error' });
    }
    setBusy(false);
  }

  // C3 (D71): inline restore, ported from PaywallScreen. A paid user on a
  // reinstall or new device recovers Pro here without buying again. Mirrors
  // ProGate.handleRestore / PaywallScreen.handleRestore semantics: routes
  // through the shared restore module (lib/payments/restore), which re-reads
  // the active subscription from the store and NEVER charges. restorePurchases
  // has already written the entitlement server-side on success, so we reconcile
  // tier from the cloud the same light-touch way the purchase path does
  // (refreshTierFromCloud); if that is a no-op the confirmation alone is enough.
  async function handleRestore() {
    if (restoring || busy) return;
    trackCta('restore');
    setRestoring(true);
    try {
      const result = await restorePurchases();
      if (!result.ok) {
        appAlert('Could not restore', 'Try again in a moment.');
      } else if (result.tier === 'pro') {
        if (session?.user?.id) {
          refreshTierFromCloud(getSupabaseClient(), session.user.id).catch(() => {});
        }
        appAlert('Pro restored', 'Your subscription is active again.');
      } else {
        appAlert('Nothing to restore', 'We could not find an active subscription for this store account.');
      }
    } catch (e) {
      require('../lib/errorLog').logError('ProUpgrade.restoreFailed', e, {});
      appAlert('Could not restore', 'Try again in a moment.');
    } finally {
      setRestoring(false);
    }
  }

  // OAuth path (Google / Apple). Sign-in completes via the deep-link
  // handler in App.js > onAuthStateChange in RootNavigator. We don't need
  // to call activatePro from here, the SIGNED_IN handler runs
  // restoreSessionFromCloud which sets tier from the cloud row. New users
  // (no users_profile row yet) need the tier set explicitly though, so
  // we listen briefly for the session and then activate. This mirrors
  // LoginScreen.handleOAuth + ProOnboardingScreen.handleOAuthOnboarding.
  async function handleOAuth(provider) {
    const { logInfo, logError } = require('../lib/errorLog');
    logInfo('ProUpgrade.oauth.begin', `provider=${provider}`);
    setBusy(true);
    try {
      const fn = provider === 'google' ? signInWithGoogle : signInWithApple;
      const result = await fn();
      if (result?.error) {
        logError('ProUpgrade.oauth.providerError', result.error, { provider });
        toast.show(result.error.message || 'Sign-in failed', { variant: 'error' });
        setBusy(false);
        return;
      }
      // Poll for the session for up to 3 s, usually it's there on the
      // first check because exchangeCodeForSession has already fired by
      // the time openAuthSessionAsync returns. 8 s was overkill and was
      // the source of the long spinner users complained about.
      const sb = getSupabaseClient();
      let signedInId = null;
      for (let i = 0; i < 6; i++) {
        const { data: { session: s } } = await sb.auth.getSession();
        if (s?.user?.id) { signedInId = s.user.id; break; }
        await new Promise(r => setTimeout(r, 500));
      }
      if (signedInId) {
        logInfo('ProUpgrade.oauth.success', `provider=${provider} uid=${signedInId}`);
        await completeUpgrade(signedInId, { isNew: false });
      } else {
        // Distinguishing cancel vs timeout reliably needs platform hooks
        // we don't have; both end up here. Log so we can spot patterns.
        logInfo('ProUpgrade.oauth.pollExhausted', `provider=${provider}, user cancelled or session never appeared`);
        // NAV-7 (audit 02): this is the revenue moment, so never end it in
        // silence. A cancel reads the toast as harmless; a genuine timeout
        // finally learns the spinner didn't just die.
        toast.show("Sign-in didn't finish. Try again when you're ready.", { variant: 'info' });
      }
    } catch (e) {
      logError('ProUpgrade.oauth.threw', e, { provider });
      // NAV-7: same rule for a thrown failure, surface it at the moment it
      // happened rather than leaving the button to quietly stop spinning.
      toast.show('Sign-in did not complete, try again', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  // Success state.
  //
  // Show the "You're Pro" confirmation only when EITHER (a) this screen
  // just successfully activated them in this session (`done`), OR (b) they
  // are genuinely Pro, meaning tier='pro' AND they have a cloud account.
  //
  // Without the cloud-account part of (b), a local-only Free user with a
  // stale tier='pro' value in storage (from a prior install, a bug, or
  // testing) would land here and see "You're Pro" instantly without ever
  // creating an account. Pro requires cloud sync; tier alone isn't enough.

  const trulyPro = tier === 'pro' && Boolean(session?.user?.id) && !user?.isLocal;
  if (done || trulyPro) {
    // Trigger the Pro onboarding flow: capture profile, training setup,
    // recovery, then generate a fresh plan and nutrition targets. Without
    // this the user lands back on the main app with no plan and no diet.
    // resetFirstRun flips firstRunComplete=false, which makes RootNavigator
    // mount ProOnboardingStack on next render. Returns an error if a
    // workout is in progress so we don't yank the user out mid-set.
    async function startSetup() {
      try {
        const result = await resetFirstRun();
        if (result && result.ok === false) {
          if (result.error === 'workout_in_progress') {
            toast.show('Finish your workout in progress first, then set up your Pro plan', { variant: 'warning', duration: 5000 });
          }
        }
      } catch (_) {}
    }
    // AUTH-1: only a user who hasn't finished onboarding should be sent into
    // the setup wizard. During beta every signed-in user resolves to Pro, so an
    // already-onboarded user tapping a Pro lock would otherwise be bounced
    // through resetFirstRun back into full onboarding. They just get "Done".
    const needsSetup = !firstRunComplete;
    return (
      <SafeAreaView style={[styles.safe, live.safe]}>
        <View style={styles.successWrap}>
          <View style={[styles.successCircle, live.successCircle]}>
            <Ionicons name="checkmark" size={40} color={t.colors.onPrimary} />
          </View>
          <Text maxFontSizeMultiplier={1.3} style={[styles.successTitle, live.successTitle]}>You're Pro.</Text>
          <Text maxFontSizeMultiplier={1.3} style={[styles.successBody, live.successBody]}>
            {needsSetup
              ? 'Everything is ready and your data is backed up. Set up your training plan and nutrition targets and the coach can start.'
              : 'Everything is ready and your data is backed up.'}
          </Text>
          {needsSetup ? (
            <>
              <Button title="Set up your training" icon="barbell-outline" size="lg" onPress={startSetup} />
              <Button
                title="Skip for now"
                variant="outline"
                size="sm"
                fullWidth={false}
                style={styles.secondaryLink}
                onPress={() => navigation.goBack()}
                accessibilityLabel="Skip for now"
              />
            </>
          ) : (
            <Button title="Done" size="lg" onPress={() => navigation.goBack()} />
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Pitch + action.

  return (
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
      <ModalHeader title="Upgrade" onClose={() => { trackCta('dismiss'); navigation.goBack(); }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={[styles.iconWrap, live.iconWrap]}>
            <Ionicons name="barbell-outline" size={30} color={t.colors.primary} />
          </View>
          <Text maxFontSizeMultiplier={1.3} style={[styles.title, live.title]}>Go Pro</Text>
          <Text maxFontSizeMultiplier={1.3} style={[styles.subtitle, live.subtitle]}>
            Free keeps your training log. Pro reads it like a coach and adjusts your plan as you go.
          </Text>

          <View style={styles.perks}>
            {PRO_PERKS.map(p => (
              <View key={p.text} style={styles.perkRow}>
                <View style={[styles.perkIcon, live.perkIcon]}>
                  <Ionicons name={p.icon} size={16} color={t.colors.primary} />
                </View>
                <Text maxFontSizeMultiplier={1.3} style={[styles.perkText, live.perkText]}>{p.text}</Text>
              </View>
            ))}
          </View>

          <Text maxFontSizeMultiplier={1.3} style={[styles.credentialNote, live.credentialNote]}>
            Precision Coaching follows clear training rules and explains every change. It uses your recovery, food and progress.
          </Text>

          {/* C3 (D71): one verified Google Play excerpt, ported from the
              deleted PaywallScreen so proof lands BEFORE price. Renders only
              when a curated excerpt exists (ships dark until the honesty bar
              in paywallExcerpts.js is met). */}
          {excerpt ? (
            <View style={[styles.reviewCard, live.reviewCard]} accessible accessibilityLabel={`${excerpt.stars} star review. ${excerpt.quote}. ${excerpt.name}, ${excerpt.source}, ${excerpt.date}.`}>
              <View style={styles.reviewStars} accessibilityElementsHidden importantForAccessibility="no">
                {Array.from({ length: Math.max(0, Math.min(5, excerpt.stars)) }).map((_, i) => (
                  <Ionicons key={i} name="star" size={13} color={t.colors.primary} />
                ))}
              </View>
              <Text maxFontSizeMultiplier={1.3} style={[styles.reviewQuote, live.reviewQuote]} numberOfLines={3}>{`"${excerpt.quote}"`}</Text>
              <Text maxFontSizeMultiplier={1.3} style={[styles.reviewMeta, live.reviewMeta]}>{`${excerpt.name} - ${excerpt.source} - ${excerpt.date}`}</Text>
            </View>
          ) : null}

          {/* Wave-1 A8: the same store-priced Free-vs-Pro strip the Pro locks
              use, so the decision point carries the honest side-by-side.
              Prices come from the active store via usePlayPrices inside the strip;
              nothing is hardcoded. Follows the billing period picked below. */}
          <View style={styles.compareWrap}>
            <TierComparisonStrip pricingWindow={period} highlighted="pro" />
          </View>

          {hasAccount ? (
            <>
              <Text maxFontSizeMultiplier={1.3} style={[styles.accountNote, live.accountNote]}>
                {PRO_BETA_ACTIVE
                  ? 'Your account is ready. Activate Pro to switch on the coaching features.'
                  : canTrial
                    ? (monthlyPrice
                        ? `You're in. Pro's free for the next 14 days, and ${storeName()} adds another week free when you subscribe. After that, ${monthlyPrice} a month.`
                        : `You're in. Pro's free for the next 14 days, and ${storeName()} adds another week free when you subscribe. After that, a monthly subscription.`)
                    : 'Your account is ready. Subscribe to switch the coaching features on.'}
              </Text>
              {!PRO_BETA_ACTIVE && !canTrial ? (
                <BillingPeriodSelector
                  value={period}
                  onChange={(p) => { haptics.selection(); setPeriod(p); trackCta('select_period', { period: p }); }}
                  monthlyPrice={monthlyPrice}
                  annualPrice={annualPrice}
                  disabled={busy}
                  style={styles.periodSelector}
                />
              ) : null}
              <Button
                title={PRO_BETA_ACTIVE
                  ? 'Activate Pro'
                  : canTrial ? 'Start your free trial' : 'Subscribe to Pro'}
                icon="barbell-outline"
                size="lg"
                loading={busy}
                onPress={() => {
                  trackCta(PRO_BETA_ACTIVE ? 'activate_beta' : canTrial ? 'start_trial' : 'buy_pro');
                  confirmExistingAccount();
                }}
              />
            </>
          ) : (
            <>
              <Text maxFontSizeMultiplier={1.3} style={[styles.accountNote, live.accountNote]}>
                Pro needs a free account so your plan and progress are backed up and your access carries over across devices.
              </Text>

              {/* Keep account creation in lockstep with Login and Pro onboarding.
                  OAuthButtons owns the platform policy, including hiding Google
                  on iOS until an iOS Google OAuth client is configured. */}
              <OAuthButtons
                onApple={() => { trackCta('create_account', { provider: 'apple' }); handleOAuth('apple'); }}
                onGoogle={() => { trackCta('create_account', { provider: 'google' }); handleOAuth('google'); }}
                disabled={busy}
              />
            </>
          )}

          {/* Wave-1 A8: common questions, below the comparison and above the
              legal links. Plain headings (this screen has no collapse
              pattern); each answer is one or two calm, honest sentences. */}
          <View style={styles.faqWrap}>
            <Text maxFontSizeMultiplier={1.3} style={[styles.faqTitle, live.faqTitle]}>Common questions</Text>
            {FAQ_ITEMS.map(item => (
              <View key={item.q} style={styles.faqItem}>
                <Text maxFontSizeMultiplier={1.3} style={[styles.faqQ, live.faqQ]}>{item.q}</Text>
                <Text maxFontSizeMultiplier={1.3} style={[styles.faqA, live.faqA]}>{item.a}</Text>
              </View>
            ))}
          </View>

          {/* C3 (D71): quiet inline restore, ported from PaywallScreen and
              shown only to a signed-in account (a reinstalled paid user can
              recover Pro without buying again). Text-level chrome, not a
              primary CTA. Billing-consequential, so like ProGate it carries no
              added haptic. Same read-only entitlement path (lib/payments/
              restore) as every other restore surface; no purchase is made. */}
          {hasAccount ? (
            <TouchableOpacity
              style={styles.restoreLink}
              onPress={handleRestore}
              disabled={restoring || busy}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Restore purchases"
            >
              <Ionicons name="refresh-outline" size={14} color={t.colors.textSecondary} />
              <Text maxFontSizeMultiplier={1.3} style={[styles.restoreLinkText, live.restoreLinkText]}>
                {restoring ? 'Restoring...' : 'Restore purchases'}
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[styles.policyLink, live.policyLink]}
            onPress={() => { haptics.selection(); navigation.navigate('SubscriptionPolicy'); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Subscription terms"
          >
            <Ionicons name="information-circle-outline" size={14} color={t.colors.textSecondary} />
            <Text maxFontSizeMultiplier={1.3} style={[styles.policyLinkText, live.policyLinkText]}>
              What stays if you switch back to Free later
            </Text>
          </TouchableOpacity>

          {/* Haptics completion pass (2026-07-10): "Maybe later" is neither a
              plan-comparison segment nor a navigation row (the campaign's
              allowed set for this screen family) -- left without an added
              haptic. */}
          <TouchableOpacity style={styles.laterBtn} onPress={() => { trackCta('dismiss'); navigation.goBack(); }} accessibilityRole="button" accessibilityLabel="Maybe later">
            <Text maxFontSizeMultiplier={1.3} style={[styles.laterText, live.laterText]}>Maybe later</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, padding: spacing.xl, paddingBottom: spacing.xxxl },

  iconWrap: {
    width: 64, height: 64, borderRadius: circle(64),
    backgroundColor: colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxxl, fontWeight: fontWeight.black,
    color: colors.textPrimary, textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.md, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 22, marginBottom: spacing.xl,
  },

  perks: { gap: spacing.md, marginBottom: spacing.md },
  policyLink: {
    minHeight: 40,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  policyLinkText: { ...type.caption, color: colors.textSecondary },
  // C3 (D71): quiet text-level restore action (not the contained policyLink
  // chrome) so it reads as a secondary affordance, not a second CTA.
  restoreLink: {
    minHeight: 40,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  restoreLinkText: { ...type.caption, color: colors.textSecondary },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  perkIcon: {
    width: 32, height: 32, borderRadius: radius.md,
    backgroundColor: colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  perkText: { ...type.bodySm, color: colors.textSecondary, flex: 1 },
  credentialNote: {
    ...type.captionTight, color: colors.textMuted,
    marginTop: spacing.md, paddingHorizontal: spacing.xs,
  },

  compareWrap: { marginTop: spacing.lg, marginBottom: spacing.xl },

  // C3 (D71): Play-review social-proof card, ported from PaywallScreen and
  // matched to this screen's card idiom.
  reviewCard: {
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, padding: spacing.md,
    marginTop: spacing.lg, gap: spacing.xs,
  },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewQuote: { ...type.bodySm, color: colors.textPrimary, fontStyle: 'italic' },
  reviewMeta: { ...type.caption, color: colors.textMuted },

  // Wave-1 A8 FAQ
  faqWrap: { gap: spacing.md, marginTop: spacing.xl },
  faqTitle: { ...type.label, color: colors.textSecondary },
  faqItem: { gap: spacing.xxs },
  faqQ: { ...type.bodyStrong, color: colors.textPrimary },
  faqA: { ...type.bodySm, color: colors.textSecondary },

  accountNote: {
    ...type.bodySm, color: colors.textMuted, marginBottom: spacing.lg,
  },
  periodSelector: { marginBottom: spacing.lg },

  section: { marginBottom: spacing.lg },
  fieldLabel: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  fieldWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border,
  },
  fieldWrapFocused: { borderColor: withAlpha(colors.primary, 0.502) },
  fieldInput: {
    flex: 1, paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2, fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  eyeBtn: {
    position: 'absolute', right: spacing.md,
    top: 0, bottom: 0, justifyContent: 'center', paddingHorizontal: spacing.xs,
  },

  switchBtn: { alignItems: 'center', paddingVertical: spacing.md },
  switchText: { fontSize: fontSize.sm, color: colors.textMuted },
  switchAction: { color: colors.primary, fontWeight: fontWeight.semibold },

  laterBtn: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.xs },
  laterText: { fontSize: fontSize.sm, color: colors.textMuted },

  // Success
  successWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: spacing.xl, gap: spacing.lg,
  },
  successCircle: {
    width: 80, height: 80, borderRadius: circle(80),
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...shadow.glow,
  },
  successTitle: {
    fontSize: fontSize.xxxl, fontWeight: fontWeight.black,
    color: colors.textPrimary,
  },
  successBody: {
    fontSize: fontSize.md, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 22,
  },
  secondaryLink: {
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
  },
});

// CP-10 batch G lane 1 (2026-07-11): the frozen `styles` block above stays
// byte-identical. This mirrors ONLY the colour/fontSize/type-bearing sub-
// properties of the matching frozen style, at identical rest values, so the
// screen carries no static island under a live theme toggle. Pure layout
// keys (flex/padding/gap/margin/width/height/borderRadius, no token) and
// fontWeight (not part of useTheme()'s shape) are correctly omitted. The
// dead section/fieldLabel/fieldWrap/fieldInput/eyeBtn/switchBtn/switchText/
// switchAction styles (unreferenced in this screen's JSX) are left out of
// scope, matching "touch only what the task requires". No billing/IAP flow
// or product ID touched -- colours only.
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    iconWrap: { backgroundColor: t.colors.primaryBg },
    title: { fontSize: t.fontSize.xxxl, color: t.colors.textPrimary },
    subtitle: { fontSize: t.fontSize.md, color: t.colors.textSecondary },
    policyLink: { borderColor: t.colors.border, backgroundColor: t.colors.surface2 },
    policyLinkText: { ...t.type.caption, color: t.colors.textSecondary },
    restoreLinkText: { ...t.type.caption, color: t.colors.textSecondary },
    reviewCard: { borderColor: t.colors.border, backgroundColor: t.colors.surface },
    reviewQuote: { ...t.type.bodySm, color: t.colors.textPrimary },
    reviewMeta: { ...t.type.caption, color: t.colors.textMuted },
    perkIcon: { backgroundColor: t.colors.primaryBg },
    perkText: { ...t.type.bodySm, color: t.colors.textSecondary },
    credentialNote: { ...t.type.captionTight, color: t.colors.textMuted },
    faqTitle: { ...t.type.label, color: t.colors.textSecondary },
    faqQ: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    faqA: { ...t.type.bodySm, color: t.colors.textSecondary },
    accountNote: { ...t.type.bodySm, color: t.colors.textMuted },
    laterText: { fontSize: t.fontSize.sm, color: t.colors.textMuted },
    successCircle: { backgroundColor: t.colors.primary },
    successTitle: { fontSize: t.fontSize.xxxl, color: t.colors.textPrimary },
    successBody: { fontSize: t.fontSize.md, color: t.colors.textSecondary },
  };
}
