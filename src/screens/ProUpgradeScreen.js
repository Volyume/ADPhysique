import { useState } from 'react';
import { appAlert } from '../components/AppAlert';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha } from '../styles/theme';
import Button from '../components/Button';
import useAppStore from '../store/useAppStore';
import { useToast } from '../components/Toast';
import { signUpWithEmail, signInWithEmail, signInWithGoogle, signInWithApple, getSupabaseClient } from '../lib/supabase';
import { syncProfile, bulkUploadLocalData, pullFromCloud } from '../lib/sync';
import { PRO_BETA_ACTIVE } from '../lib/proGate';
import * as cascade from '../lib/payments/cascade';
import * as playBilling from '../lib/payments/playBilling';
import { skuFor, annualSavingsPct } from '../lib/payments/catalogue';
import { usePlayPrices } from '../lib/payments/usePlayPrices';

const PRO_PERKS = [
  { icon: 'sparkles', text: 'A plan built around your schedule, goals, and experience level' },
  { icon: 'calendar-outline', text: 'Precision Coaching™ that adjusts your training and nutrition as your body responds' },
  { icon: 'nutrition-outline', text: 'Personalised calorie and protein targets, updated as your goals change' },
  { icon: 'eye-outline', text: 'After every check-in, your coach explains every decision. What changed, what was left alone, and why.' },
];

export default function ProUpgradeScreen({ navigation, route }) {
  const toast = useToast();
  const {
    user, session, userProfile, tier, setTier, refreshTierFromCloud, resetFirstRun, firstRunComplete,
  } = useAppStore();

  const hasAccount = Boolean(session?.user?.id) && !user?.isLocal;
  const canTrial = cascade.canStillTrial(userProfile);

  // C-2 / PLAY-002: localised store prices. priceFor returns null until Google
  // Play responds; we never substitute a hardcoded price. Until it loads, the
  // price chips show a short placeholder and the copy drops the figure.
  const priceFor = usePlayPrices();
  const monthlyPrice = priceFor('pro', 'monthly');
  const annualPrice = priceFor('pro', 'annual');
  const PRICE_LOADING = '…';

  const [mode, setMode] = useState('signup'); // 'signup' | 'signin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  // COMP-007: annual is the default (H&F is annual-dominant ~60-68%; the saving
  // is an honest 50%). Monthly stays visible second. Anchor, don't hide.
  const [period, setPeriod] = useState('annual'); // billing period when subscribing

  async function activatePro(supabaseUserId, { isNew }) {
    syncProfile(supabaseUserId, userProfile, 'pro', { isBetaTester: isNew }).catch(() => {});
    if (isNew) {
      bulkUploadLocalData(supabaseUserId, user?.id).catch(() => {});
    } else {
      pullFromCloud(supabaseUserId).catch(() => {});
    }
    await setTier('pro', 'ProUpgradeScreen.activatePro');
    refreshTierFromCloud(getSupabaseClient(), supabaseUserId).catch(() => {});
  }

  // Post-beta subscribe: the real Google Play purchase. Mirrors
  // PaywallScreen.handlePay so there's one purchase path. Google's offer
  // eligibility decides 7-days-free (used the in-app trial, never paid) vs
  // pay now (already used the Play trial and cancelled).
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
      // Google Play RTDN push and the next cloud refresh reconcile it. We
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
    // Never write tier from the client (syncProfile ignores it; the server
    // owns tier). Just make sure the account holds the local data.
    syncProfile(supabaseUserId, userProfile, tier, { isBetaTester: false }).catch(() => {});
    if (isNew) {
      bulkUploadLocalData(supabaseUserId, user?.id).catch(() => {});
    } else {
      pullFromCloud(supabaseUserId).catch(() => {});
    }
    if (cascade.canStillTrial(userProfile)) {
      // Entitled to the 14-day cardless trial. Start it here: a brand-new
      // account starts the trial at the Article 9 consent step, but an
      // existing user who already consented skips that gate, so without
      // this their "Start your free trial" tap reset onboarding without
      // ever starting the trial and, with the tier still 'free', dropped
      // them on the free FirstRunStack name screen instead of the Pro
      // setup. startCascade is idempotent (no-ops once started), sets the
      // server tier='pro' + trial_state, and mirrors tier='pro' locally so
      // resetFirstRun routes into ProOnboardingStack.
      try { await cascade.startCascade(); } catch (_) {}
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

  // OAuth path (Google / Apple). Sign-in completes via the deep-link
  // handler in App.js → onAuthStateChange in RootNavigator. We don't need
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
      }
    } catch (e) {
      logError('ProUpgrade.oauth.threw', e, { provider });
    } finally {
      setBusy(false);
    }
  }

  async function handleAuth() {
    if (!email.trim() || !password.trim()) {
      toast.show('Enter your email and a password to continue', { variant: 'warning' });
      return;
    }
    if (mode === 'signup' && password.length < 8) {
      toast.show('Use at least 8 characters', { variant: 'warning' });
      return;
    }
    setBusy(true);
    try {
      const fn = mode === 'signup' ? signUpWithEmail : signInWithEmail;
      const { data, error } = await fn(email.trim(), password);
      if (error) {
        toast.show(error.message || 'Authentication error', { variant: 'error' });
        setBusy(false);
        return;
      }
      if (mode === 'signup' && data.user && !data.session) {
        // Seed the per-uid first-run flag so the eventual sign-in routes to
        // the wizard, not MainTabs, no matter how long email confirmation
        // takes (A2-021).
        useAppStore.getState().noteSignupPendingOnboarding(data.user.id);
        appAlert(
          'Check your email',
          'We sent a confirmation link. Confirm it, sign in here, and your Pro access activates.',
        );
        setMode('signin');
        setBusy(false);
        return;
      }
      if (data.session) {
        await completeUpgrade(data.session.user.id, { isNew: mode === 'signup' });
      }
    } catch (_) {
      toast.show('Something went wrong, try again', { variant: 'error' });
    }
    setBusy(false);
  }

  // ── Success state ────────────────────────────────────────────────────────────
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
      <SafeAreaView style={styles.safe}>
        <View style={styles.successWrap}>
          <View style={styles.successCircle}>
            <Ionicons name="checkmark" size={40} color={colors.onPrimary} />
          </View>
          <Text style={styles.successTitle}>You're Pro.</Text>
          <Text style={styles.successBody}>
            {needsSetup
              ? "Everything's unlocked and your data is backed up. Set up your training plan and nutrition targets and the coach can start."
              : "Everything's unlocked and your data is backed up."}
          </Text>
          {needsSetup ? (
            <>
              <Button title="Set up your training" icon="sparkles" size="lg" onPress={startSetup} />
              <TouchableOpacity
                style={styles.secondaryLink}
                onPress={() => navigation.goBack()}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Skip for now"
              >
                <Text style={styles.secondaryLinkText}>Skip for now</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Button title="Done" size="lg" onPress={() => navigation.goBack()} />
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ── Pitch + action ───────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <Ionicons name="sparkles" size={30} color={colors.primary} />
          </View>
          <Text style={styles.title}>Go Pro</Text>
          <Text style={styles.subtitle}>
            Free keeps your training log. Pro reads it like a coach and adjusts your plan as you go.
          </Text>

          <View style={styles.perks}>
            {PRO_PERKS.map(p => (
              <View key={p.text} style={styles.perkRow}>
                <View style={styles.perkIcon}>
                  <Ionicons name={p.icon} size={16} color={colors.primary} />
                </View>
                <Text style={styles.perkText}>{p.text}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.credentialNote}>
            Precision Coaching™ is built from training research, your recovery, your food, and your progress.
          </Text>

          <TouchableOpacity
            style={styles.policyLink}
            onPress={() => navigation.navigate('SubscriptionPolicy')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Subscription terms"
          >
            <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
            <Text style={styles.policyLinkText}>
              What stays if you switch back to Free later
            </Text>
          </TouchableOpacity>

          {hasAccount ? (
            <>
              <Text style={styles.accountNote}>
                {PRO_BETA_ACTIVE
                  ? 'Your account is ready. Activate Pro to switch on the coaching features.'
                  : canTrial
                    ? (monthlyPrice
                        ? `You're in. Pro's free for the next 14 days, and Google Play adds another week free when you subscribe. After that, ${monthlyPrice} a month.`
                        : "You're in. Pro's free for the next 14 days, and Google Play adds another week free when you subscribe. After that, a monthly subscription.")
                    : 'Your account is ready. Subscribe to switch the coaching features on.'}
              </Text>
              {!PRO_BETA_ACTIVE && !canTrial ? (
                <View style={styles.periodRow}>
                  {/* COMP-007: annual first (left) + preselected; monthly visible second. */}
                  <TouchableOpacity
                    style={[styles.periodBtn, period === 'annual' && styles.periodBtnActive]}
                    onPress={() => setPeriod('annual')}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityState={{ selected: period === 'annual' }}
                    accessibilityLabel={annualPrice ? `Annual, ${annualPrice}, save ${annualSavingsPct()} per cent` : `Annual, save ${annualSavingsPct()} per cent`}
                  >
                    <View style={styles.saveBadge}><Text style={styles.saveBadgeText}>Save {annualSavingsPct()}%</Text></View>
                    <Text style={[styles.periodLabel, period === 'annual' && styles.periodTextActive]}>Annual</Text>
                    <Text style={[styles.periodPrice, period === 'annual' && styles.periodTextActive]}>{annualPrice ?? PRICE_LOADING}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.periodBtn, period === 'monthly' && styles.periodBtnActive]}
                    onPress={() => setPeriod('monthly')}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityState={{ selected: period === 'monthly' }}
                    accessibilityLabel={monthlyPrice ? `Monthly, ${monthlyPrice}` : 'Monthly'}
                  >
                    <Text style={[styles.periodLabel, period === 'monthly' && styles.periodTextActive]}>Monthly</Text>
                    <Text style={[styles.periodPrice, period === 'monthly' && styles.periodTextActive]}>{monthlyPrice ?? PRICE_LOADING}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              <Button
                title={PRO_BETA_ACTIVE
                  ? 'Activate Pro'
                  : canTrial ? 'Start your free trial' : 'Subscribe to Pro'}
                icon="sparkles"
                size="lg"
                loading={busy}
                onPress={confirmExistingAccount}
              />
            </>
          ) : (
            <>
              <Text style={styles.accountNote}>
                Pro needs a free account so your plan and progress are backed up and your access carries over across devices.
              </Text>

              {/* OAuth buttons, Google on both platforms, Apple on iOS only
                  (App Store policy: if any other social provider is offered,
                  Sign in with Apple must be too). Mirrors the LoginScreen and
                  ProOnboardingScreen patterns so the upgrade flow doesn't
                  feel like a downgrade. */}
              <View style={styles.oauthBlock}>
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={[styles.oauthBtnApple, busy && styles.btnDisabled]}
                    onPress={() => handleOAuth('apple')}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel="Continue with Apple"
                  >
                    <Ionicons name="logo-apple" size={18} color={colors.appleBtnText} />
                    <Text style={styles.oauthBtnAppleText}>Continue with Apple</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.oauthBtn, busy && styles.btnDisabled]}
                  onPress={() => handleOAuth('google')}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel="Continue with Google"
                >
                  <Ionicons name="logo-google" size={18} color={colors.textPrimary} />
                  <Text style={styles.oauthBtnText}>Continue with Google</Text>
                </TouchableOpacity>
                <View style={styles.oauthDivider}>
                  <View style={styles.oauthDividerLine} />
                  <Text style={styles.oauthDividerText}>or with email</Text>
                  <View style={styles.oauthDividerLine} />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.fieldLabel}>Email</Text>
                <View style={[styles.fieldWrap, emailFocused && styles.fieldWrapFocused]}>
                  <TextInput
                    style={styles.fieldInput}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor={colors.textDisabled}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    accessibilityLabel="Email"
                  />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.fieldLabel}>Password</Text>
                <View style={[styles.fieldWrap, passwordFocused && styles.fieldWrapFocused]}>
                  <TextInput
                    style={[styles.fieldInput, { paddingRight: spacing.xxxl }]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder={mode === 'signup' ? 'Min 8 characters' : 'Your password'}
                    placeholderTextColor={colors.textDisabled}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete={mode === 'signup' ? 'new-password' : 'password'}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    accessibilityLabel="Password"
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword(v => !v)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: showPassword }}
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={19}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <Button
                title={mode === 'signup' ? 'Create account and go Pro' : 'Sign in and go Pro'}
                icon="sparkles"
                size="lg"
                loading={busy}
                onPress={handleAuth}
              />

              <TouchableOpacity
                style={styles.switchBtn}
                onPress={() => setMode(m => (m === 'signup' ? 'signin' : 'signup'))}
                accessibilityRole="button"
                accessibilityLabel={mode === 'signup' ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
              >
                <Text style={styles.switchText}>
                  {mode === 'signup'
                    ? 'Already have an account? '
                    : "Don't have an account? "}
                  <Text style={styles.switchAction}>
                    {mode === 'signup' ? 'Sign in' : 'Create one'}
                  </Text>
                </Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={styles.laterBtn} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Maybe later">
            <Text style={styles.laterText}>Maybe later</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, padding: spacing.xl, paddingBottom: spacing.xxxl },

  closeBtn: { alignSelf: 'flex-end', padding: spacing.xs, marginBottom: spacing.sm },

  iconWrap: {
    width: 64, height: 64, borderRadius: 32,
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
  policyLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm, marginBottom: spacing.lg },
  policyLinkText: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.medium, textDecorationLine: 'underline' },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  perkIcon: {
    width: 32, height: 32, borderRadius: radius.md,
    backgroundColor: colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  perkText: { fontSize: fontSize.sm, color: colors.textSecondary, flex: 1, lineHeight: 19 },
  credentialNote: {
    fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 17,
    marginTop: spacing.md, paddingHorizontal: spacing.xs,
  },

  accountNote: {
    fontSize: fontSize.sm, color: colors.textMuted,
    lineHeight: 19, marginBottom: spacing.lg,
  },
  periodRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  periodBtn: {
    flex: 1, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surface, paddingVertical: spacing.md, paddingHorizontal: spacing.sm,
    alignItems: 'center', gap: 2,
  },
  periodBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryBg },
  periodLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textSecondary },
  periodPrice: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
  periodTextActive: { color: colors.primary },
  saveBadge: {
    position: 'absolute', top: -9, alignSelf: 'center',
    backgroundColor: colors.primary, borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 1,
  },
  saveBadgeText: { fontSize: fontSize.micro, fontWeight: fontWeight.black, color: colors.onPrimary, letterSpacing: 0.3 },

  section: { marginBottom: spacing.lg },
  fieldLabel: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
    color: colors.textMuted, letterSpacing: 0.3,
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

  btnDisabled: { opacity: 0.55 },

  oauthBlock: { gap: spacing.sm, marginBottom: spacing.lg },
  oauthBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  oauthBtnText: { color: colors.textPrimary, ...type.bodyStrong },
  oauthBtnApple: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.md,
    backgroundColor: colors.appleBtnBg,
  },
  oauthBtnAppleText: { color: colors.appleBtnText, ...type.bodyStrong },
  oauthDivider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  oauthDividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  oauthDividerText: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.medium },

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
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOpacity: 0.4,
    shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 12,
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
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
  },
  secondaryLinkText: {
    fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center',
  },
});
