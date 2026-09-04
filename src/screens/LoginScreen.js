import { useState, useRef } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Image, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, radius, spacing, type, withAlpha, alpha } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import { VolyumeMark } from '../components/BrandMark';
import OAuthButtons from '../components/auth/OAuthButtons';
import TextField from '../components/TextField';
import Button from '../components/Button';
import { signInWithGoogle, signInWithApple, signInWithEmail, signUpWithEmail, resetPassword } from '../lib/supabase';
import { audit } from '../lib/observability';
import { useToast } from '../components/Toast';
import { authErrorMessage, isDuplicateSignup, AUTH_COPY } from '../lib/authErrorCopy';
import { touchTarget } from '../styles/layout';

// A real capture of the Train screen (the store-listing screenshot, resized
// for the bundle), the backdrop the account step sits in front of.
const SHOT_TRAIN = require('../../assets/welcome/train.jpg');
const SHOT_ASPECT = 709 / 1388;

export default function LoginScreen({ navigation, route }) {
  // Sign in with Apple/Google, PLUS an email + password option (founder
  // 2026-07-21, for App Review demo accounts and users who prefer email). The
  // account type makes no difference downstream: any Supabase session (OAuth or
  // email) is picked up by RootNavigator's onAuthStateChange, which drives all
  // new-account routing (restoreSessionFromCloud + refreshTierFromCloud),
  // cross-user wipe, and the Article 9 consent gate identically. No anonymous
  // mode (IDENTITY_AND_OWNERSHIP_LOCKED.md rule 1).
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const oauthInFlightRef = useRef(false);
  // Email + password form state. `mode` toggles the same form between signing
  // in to an existing account and creating a new one.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // E-1 (D96): Welcome's hero CTA can open this screen straight into
  // create-account mode, passing { intent: 'pro_signup' } (the param name
  // stays; the app has no Pro tier any more, only the "open in create-account
  // mode" behaviour it carries). The form used to open in sign-in mode
  // regardless, so a brand-new user typed a new password into a button that
  // said "Sign in" and was told their details were wrong for an account that
  // did not exist yet. Reading the param makes the CTA land on the form it
  // promised; "Already have an account?" navigates without it and still
  // opens sign-in. The toggle below switches either way, as before.
  const [emailMode, setEmailMode] = useState(
    route?.params?.intent === 'pro_signup' ? 'signup' : 'signin',
  );
  // The email + password fields sit behind a "Continue with email" tertiary
  // button in create-account mode (a lightweight, OAuth-first account step);
  // sign-in mode keeps them visible immediately, since a returning user
  // already knows what they want. Switching mode re-collapses into create-
  // account's default and always re-opens for sign-in.
  const [emailFormOpen, setEmailFormOpen] = useState(emailMode !== 'signup');
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  // E-8 / E-2 / E-3 (D96): outcomes the user has to ACT on (confirm your
  // email, this address already has an account, we have sent a reset link)
  // lived in a toast that was long gone by the time they came back from
  // their inbox, leaving a bare form with no memory of what happened. They
  // persist here instead, on the form, dismissible. Transient failures keep
  // the toast.
  const [notice, setNotice] = useState(null); // { text } | null
  const [resetSubmitting, setResetSubmitting] = useState(false);
  // A5 (pre-release sweep 2026-07-27): the password field had no show/hide
  // toggle, though EmailPasswordFields.js (unused here, ruled fix-in-place
  // per the blast-radius ruling) implements exactly this. Mirrored below.
  const [showPassword, setShowPassword] = useState(false);
  const passwordRef = useRef(null);
  // CP-10 batch F (2026-07-11): live theme (src/hooks/useTheme.js). This
  // screen never renders a FlatList/FlashList/SectionList row (a single
  // ScrollView), so an unmemoised call matches AddCustomFoodScreen's own
  // precedent (batch D).
  const t = useTheme();
  const live = buildLiveStyles(t);
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  // D145 (2026-09-04): the composition. One real capture of the Train
  // screen sits top-right, turned and dimmed, receding behind a sheet that
  // holds the account step, so the screen reads as the product continuing
  // beneath the thing being asked, not as a form on a black page.
  const shotW = Math.round(windowWidth * 0.7);
  const shotH = Math.round(shotW / SHOT_ASPECT);

  async function handleOAuth(provider) {
    // VOLYUME-2B: under Fabric the native Apple button can fire onPress twice
    // per tap, so two authorization requests raced -- the second always died
    // with Apple error 1000 and logged a sign-in error against every
    // successful sign-in. A ref is synchronous where `loading` state is not,
    // so the duplicate invocation exits before it touches anything.
    if (oauthInFlightRef.current) return;
    oauthInFlightRef.current = true;
    audit('auth.signin.attempt', { method: provider });
    // Disable both buttons while the OAuth dialog is up. The actual sign-in
    // completion is handled by RootNavigator's onAuthStateChange listener
    // once the deep-link redirect comes back into App.js.
    const { logInfo, logError } = require('../lib/errorLog');
    logInfo('LoginScreen.oauth.begin', `provider=${provider}`);
    setLoading(true);
    try {
      const fn = provider === 'google' ? signInWithGoogle : signInWithApple;
      const result = await fn();
      if (result?.cancelled) {
        // A7: a cancelled OAuth dialog (user backed out) used to fall into
        // the silent else below with no feedback at all.
        logInfo('LoginScreen.oauth.cancelled', `provider=${provider}`);
        toast.show('Sign-in was cancelled.', { variant: 'info' });
      } else if (result?.error) {
        // Re-triage 2026-08-01 (VOLYUME-2B residue): apple_device_state is a
        // KNOWN device condition (iCloud not signed in / Apple ID needs
        // attention) with its own remedy toast below - the user is told exactly
        // what to do and nothing in our code failed. Logging it as an error
        // kept a diagnosed, handled state open in Sentry. Real provider
        // failures keep the error level.
        if (result.error.code === 'apple_device_state') {
          logInfo('LoginScreen.oauth.deviceState', `provider=${provider}`, { code: result.error.code });
        } else {
          logError('LoginScreen.oauth.providerError', result.error, { provider });
        }
        // FR-2: never show raw provider/SDK error text at the user's very
        // first touchpoint. The real error is already captured above by
        // logError; the user only ever sees one calm fallback sentence
        // (same fix pattern as L01-B35).
        // VOLYUME-18 (2026-07-12): Apple's error 1000 means the device
        // could not complete the request (usually iCloud sign-in state),
        // so retrying alone never helps. Show the actual remedy, still in
        // our own calm words, never the raw SDK text.
        // E-5 (D96): a connection failure is not a mystery. authErrorCopy
        // names connectivity when the provider's message is network-shaped
        // and falls back to the same calm sentence otherwise, so the raw
        // SDK text still never reaches the user.
        if (result.error.code === 'apple_device_state') {
          toast.show('Apple could not finish sign-in. Check you are signed in to iCloud in your phone Settings, then try again.', { variant: 'error' });
        } else {
          toast.show(authErrorMessage(result.error), { variant: 'error' });
        }
      } else {
        // Success is fully driven by onAuthStateChange, log so the
        // upstream SIGNED_IN event can be correlated to this initiation.
        logInfo('LoginScreen.oauth.dialogReturned', `provider=${provider}, awaiting SIGNED_IN`);
      }
    } catch (e) {
      logError('LoginScreen.oauth.threw', e, { provider });
      // EP-18/UI-07: a thrown exception (native-bridge failure, browser-
      // launch failure, malformed config) used to leave the button dimming
      // then quietly returning to idle with no explanation, at the app's
      // very first touchpoint. Show the same calm fallback sentence as the
      // resolved-error branch above (same fix pattern as ProUpgradeScreen's
      // oauth.threw catch). E-5: a thrown network error names connectivity.
      toast.show(authErrorMessage(e), { variant: 'error' });
    } finally {
      oauthInFlightRef.current = false;
      setLoading(false);
    }
  }

  async function handleEmailAuth() {
    const e = email.trim();
    if (!e || !password) {
      toast.show('Enter your email and password.', { variant: 'info' });
      return;
    }
    audit('auth.signin.attempt', { method: emailMode === 'signup' ? 'email_signup' : 'email' });
    const { logInfo, logError } = require('../lib/errorLog');
    logInfo('LoginScreen.email.begin', `mode=${emailMode}`);
    setEmailSubmitting(true);
    setNotice(null);
    try {
      const fn = emailMode === 'signup' ? signUpWithEmail : signInWithEmail;
      const { data, error } = await fn(e, password);
      if (error) {
        logError('LoginScreen.email.providerError', error, { mode: emailMode });
        // Calm, plain wording (never the raw SDK string) mapped from the
        // common Supabase auth errors; anything else gets the safe fallback.
        // The mapping moved to lib/authErrorCopy so the network case (E-5)
        // and the duplicate case (E-2) read the same everywhere.
        const msg = authErrorMessage(error);
        if (msg === AUTH_COPY.duplicate) {
          // The account exists: this is guidance to act on, not a blip, so it
          // stays on screen beside the form it applies to.
          setNotice({ text: AUTH_COPY.duplicate });
          setEmailMode('signin');
          return;
        }
        toast.show(msg, { variant: 'error' });
        return;
      }
      // Sign-up with email confirmation ON returns a user but no session yet.
      if (emailMode === 'signup' && data?.user && !data?.session) {
        // E-2 (D96): with enumeration protection on, an EXISTING address comes
        // back through this same branch (user, no session, empty identities)
        // and Supabase sends no email at all. Promising a confirmation here
        // left returning users waiting for mail that never arrives, so the
        // duplicate signal gets the honest "sign in instead" guidance.
        if (isDuplicateSignup(data)) {
          logInfo('LoginScreen.email.duplicateAddress', 'signup returned an existing identity');
          setNotice({ text: AUTH_COPY.duplicate });
          setEmailMode('signin');
          return;
        }
        setNotice({ text: AUTH_COPY.unconfirmed });
        setEmailMode('signin');
        return;
      }
      // A session is present: RootNavigator's onAuthStateChange takes over and
      // routes exactly as it does for an OAuth sign-in.
      logInfo('LoginScreen.email.sessionReturned', `mode=${emailMode}, awaiting SIGNED_IN`);
    } catch (err) {
      logError('LoginScreen.email.threw', err, { mode: emailMode });
      toast.show(authErrorMessage(err), { variant: 'error' });
    } finally {
      setEmailSubmitting(false);
    }
  }

  // E-3 (D96): there was no password reset anywhere in the app. resetPassword()
  // existed in lib/supabase and nothing called it, so an email/password user
  // who forgot their password on day 2 had no route back to the only identity
  // the app allows (no anonymous mode, IDENTITY_AND_OWNERSHIP_LOCKED.md). This
  // is the request half only: Supabase mails the recovery link, the link comes
  // back through the existing volyume:// deep-link handler in App.js, and no
  // new screen, dependency or linking config is involved.
  async function handleForgotPassword() {
    const e = email.trim();
    if (!e) {
      toast.show('Enter your email above first, then tap Forgot password.', { variant: 'info' });
      return;
    }
    const { logInfo, logError } = require('../lib/errorLog');
    logInfo('LoginScreen.reset.begin', 'password reset requested');
    setResetSubmitting(true);
    setNotice(null);
    try {
      const { error } = await resetPassword(e);
      if (error) {
        logError('LoginScreen.reset.providerError', error, {});
        toast.show(authErrorMessage(error), { variant: 'error' });
        return;
      }
      // Deliberately conditional: Supabase answers a reset for an unknown
      // address exactly as it answers a known one (enumeration protection),
      // so promising "we have sent you an email" would be a claim we cannot
      // make. Same honesty as the duplicate-signup wording above.
      setNotice({
        text: 'If that email has an account, we have sent a link to get back in. Open it on this phone, then come back here.',
      });
    } catch (err) {
      logError('LoginScreen.reset.threw', err, {});
      toast.show(authErrorMessage(err), { variant: 'error' });
    } finally {
      setResetSubmitting(false);
    }
  }

  // Switching mode also resets the collapse: signup starts collapsed behind
  // "Continue with email" every time it is entered, sign-in is always open.
  function switchEmailMode(next) {
    setEmailMode(next);
    setEmailFormOpen(next !== 'signup');
  }

  return (
    <SafeAreaView style={[styles.safe, live.safe]} edges={['left', 'right']}>
      {/* Backdrop: the capture bleeds off the top-right edge under the
          status bar; the sheet below covers its lower half. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none" importantForAccessibility="no-hide-descendants">
        <View style={[styles.shotFrame, live.shotFrame, {
          width: shotW, height: shotH, right: -Math.round(shotW * 0.2), top: insets.top + spacing.xl,
        }]}>
          <Image source={SHOT_TRAIN} style={styles.shot} resizeMode="cover" />
        </View>
      </View>

      {/* E-9 (D96): the WelcomeStack runs headerShown: false, so this screen
          had no visible back control at all, against the app's own convention
          (contrast WellbeingCheckScreen's BackHeader). Hardware back and the
          iOS edge swipe always worked, so nobody was trapped; this is the
          missing affordance. Rendered only when there is somewhere to go
          back to; on a round scrim so it reads over the capture. */}
      {navigation?.canGoBack?.() ? (
        <View style={[styles.topBar, { paddingTop: insets.top + spacing.md }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={[styles.backScrim, live.backScrim]}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={24} color={t.colors.textPrimary} />
          </TouchableOpacity>
        </View>
      ) : null}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* The capture fades out just above the sheet, whatever height the
              sheet takes in this mode. */}
          <LinearGradient
            colors={[withAlpha(t.colors.background, 0), t.colors.background]}
            style={styles.fade}
            pointerEvents="none"
          />
          <View style={[styles.sheet, live.sheet, { paddingBottom: spacing.lg + insets.bottom }]}>
            {/* ── Heading block ──
                Small mark for continuity, the mode heading one size below
                Welcome's, one line on what the account is for. E-7 (D96)
                is still honoured: the why-account line is here, on the form
                that asks; the full data story stays in the Article 9 gate. */}
            <View style={styles.brand}>
              <VolyumeMark size={18} style={styles.brandMark} />
              <Text style={[styles.heading, live.heading]} accessibilityRole="header">
                {emailMode === 'signup' ? 'Create your account' : 'Welcome back'}
              </Text>
              <Text style={[styles.whyAccount, live.whyAccount]}>
                {emailMode === 'signup'
                  ? 'Keep your training, nutrition and progress synced across devices.'
                  : 'Sign in to pick up where you left off.'}
              </Text>
            </View>

            {/* ── OAuth sign-in ──
                Apple on iOS, Google on Android (see OAuthButtons for the
                platform split). Raised one surface so it reads on the sheet. */}
            <OAuthButtons
              onApple={() => handleOAuth('apple')}
              onGoogle={() => handleOAuth('google')}
              disabled={loading}
              raised
            />
            {/* A7: the only affordance while waiting was dimmed buttons, no
                indication anything is actually happening. A calm caption names
                what's in progress.
                AX-08 (launch accessibility audit): the caption wasn't marked
                busy/live, so a screen reader never heard that sign-in was in
                progress. accessibilityLiveRegion announces it on appearance
                (polite, mirroring Toast's non-error pattern); accessibilityState
                busy reinforces the in-progress state for the duration. */}
            {loading ? (
              <Text
                style={[styles.oauthWaiting, live.oauthWaiting]}
                accessibilityLiveRegion="polite"
                accessibilityState={{ busy: true }}
              >
                Waiting for Google or Apple…
              </Text>
            ) : null}

            {/* E-8 / E-2 / E-3: the persistent outcome state. Survives leaving
                the app for the inbox and coming back, which a toast cannot. */}
            {notice ? (
              <View
                style={[styles.notice, live.notice]}
                accessibilityLiveRegion="polite"
              >
                <Ionicons name="mail-outline" size={16} color={t.colors.textSecondary} />
                <Text style={[styles.noticeText, live.noticeText]}>{notice.text}</Text>
                <TouchableOpacity
                  onPress={() => setNotice(null)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Dismiss this message"
                >
                  <Ionicons name="close" size={16} color={t.colors.textMuted} />
                </TouchableOpacity>
              </View>
            ) : null}

            {/* ── Email + password ──
                A second, equal way in (founder 2026-07-21). Any session it
                creates flows through the same onAuthStateChange path as OAuth.
                Create-account mode collapses the fields behind a primary
                "Continue with email"; sign-in keeps them visible, since a
                returning user already knows what they want. */}
            <View style={styles.emailForm}>
              {(emailMode === 'signin' || emailFormOpen) ? (
                <>
                  <TextField
                    label="Email"
                    value={email}
                    onChangeText={setEmail}
                    accessibilityLabel="Email address"
                    placeholder="you@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="emailAddress"
                    editable={!emailSubmitting}
                    // A5: email is a genuine text keyboard (Return key exists), so
                    // unlike the numeric-pad sibling pairs elsewhere in the app,
                    // returnKeyType/onSubmitEditing are live here, not dead props.
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    blurOnSubmit={false}
                  />
                  <TextField
                    ref={passwordRef}
                    label="Password"
                    value={password}
                    onChangeText={setPassword}
                    accessibilityLabel="Password"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType={emailMode === 'signup' ? 'newPassword' : 'password'}
                    returnKeyType="go"
                    onSubmitEditing={handleEmailAuth}
                    editable={!emailSubmitting}
                    // A5: show/hide toggle, mirrored from EmailPasswordFields.js
                    // (same icon, same accessibility label convention) rather than
                    // swapping LoginScreen over to that component -- primary
                    // sign-in funnel, smaller blast radius per the ruling.
                    trailing={(
                      <TouchableOpacity
                        style={styles.eyeBtn}
                        onPress={() => setShowPassword(v => !v)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityRole="button"
                        accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                      >
                        <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={19} color={t.colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  />
                  <Button
                    title={emailMode === 'signup' ? 'Create account' : 'Sign in'}
                    onPress={handleEmailAuth}
                    loading={emailSubmitting}
                    disabled={loading || emailSubmitting}
                    accessibilityLabel={emailMode === 'signup' ? 'Create account with email' : 'Sign in with email'}
                  />
                </>
              ) : (
                <Button
                  title="Continue with email"
                  onPress={() => setEmailFormOpen(true)}
                  accessibilityLabel="Continue with email"
                />
              )}
              <TouchableOpacity
                onPress={() => switchEmailMode(emailMode === 'signup' ? 'signin' : 'signup')}
                accessibilityRole="button"
                accessibilityLabel={emailMode === 'signup' ? 'Switch to signing in' : 'Switch to creating an account'}
                style={styles.textAction}
              >
                <Text style={[styles.textActionLabel, live.textActionLabel]}>
                  {emailMode === 'signup' ? 'Already have an account?' : 'New here?'}
                  <Text style={[styles.textActionAccent, live.textActionAccent]}>
                    {emailMode === 'signup' ? ' Sign in' : ' Create an account'}
                  </Text>
                </Text>
              </TouchableOpacity>
              {/* E-3: sign-in mode only. Creating an account has no password to
                  recover yet, so the link would be noise there. */}
              {emailMode === 'signin' ? (
                <TouchableOpacity
                  onPress={handleForgotPassword}
                  disabled={resetSubmitting || emailSubmitting}
                  accessibilityRole="button"
                  accessibilityLabel="Send a link to get back into your account"
                  accessibilityState={{ disabled: resetSubmitting || emailSubmitting, busy: resetSubmitting }}
                  style={styles.textAction}
                >
                  <Text style={[styles.textActionAccent, live.textActionAccent]}>
                    {resetSubmitting ? 'Sending…' : 'Forgot your password?'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* The one legal link the pre-account stack can show in-app.
                Quiet, readable, at the foot of the sheet. */}
            <TouchableOpacity
              onPress={() => navigation.navigate('PrivacyPolicy')}
              accessibilityRole="link"
              accessibilityLabel="Privacy policy"
              style={styles.legal}
            >
              <Text style={[styles.legalText, live.legalText]}>Privacy policy</Text>
            </TouchableOpacity>

            {/* "Continue without an account" removed per
                IDENTITY_AND_OWNERSHIP_LOCKED.md decision 1 (no anonymous mode). */}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  // The backdrop capture: framed like a card, turned away, dimmed.
  shotFrame: {
    position: 'absolute', borderRadius: radius.xl, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.surface,
    opacity: 0.62, transform: [{ rotate: '-7deg' }],
  },
  shot: { width: '100%', height: '100%' },

  // The sheet is pushed to the bottom; anything above it is backdrop.
  scroll: { flexGrow: 1, justifyContent: 'flex-end' },
  fade: { height: 140 },
  sheet: {
    paddingHorizontal: spacing.xl, paddingTop: spacing.xl,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    borderTopWidth: 1, borderColor: colors.borderSubtle,
  },

  // E-9 back chevron, on a round scrim over the capture.
  topBar: { position: 'absolute', top: 0, left: 0, zIndex: 2, paddingHorizontal: spacing.lg },
  backScrim: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: withAlpha(colors.background, alpha.half),
  },

  // E-8 persistent notice.
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface2,
  },
  noticeText: { ...type.bodySm, flex: 1, color: colors.textSecondary },

  // Heading block: left-aligned, like every titled screen inside the app;
  // the heading one size below Welcome's, tight to its one line.
  brand: { alignItems: 'flex-start', gap: spacing.xs, paddingBottom: spacing.xl },
  brandMark: { marginBottom: spacing.md },
  heading: { ...type.h2, fontSize: fontSize.xl, lineHeight: Math.round(fontSize.xl * 1.35), color: colors.textPrimary },
  whyAccount: { ...type.bodySm, color: colors.textSecondary },
  oauthWaiting: { ...type.caption, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.md },
  emailForm: { gap: spacing.md },
  // Text actions: no pill, a full touch target, the accent only on the verb.
  textAction: { minHeight: touchTarget.minimum, alignItems: 'center', justifyContent: 'center' },
  textActionLabel: { ...type.bodySm, color: colors.textSecondary, textAlign: 'center' },
  textActionAccent: { ...type.bodyStrong, fontSize: fontSize.sm, color: colors.primary },
  legal: { minHeight: touchTarget.minimum, alignItems: 'center', justifyContent: 'center' },
  legalText: { ...type.caption, color: colors.textMuted },
  eyeBtn: {
    minWidth: touchTarget.minimum,
    minHeight: touchTarget.minimum,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
});

// CP-10 batch F (2026-07-11): the frozen `styles` block above stays byte-
// identical. This mirrors ONLY the colour/fontSize/type-bearing sub-
// properties of the matching frozen style, at identical rest values, so the
// screen carries no static island under a live theme toggle. Pure layout
// keys (flex/gap/padding/position, no token) are correctly omitted -- there
// is nothing to unfreeze for them. Same pattern as AddCustomFoodScreen.js's
// buildLiveStyles (batch D).
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    shotFrame: { borderColor: t.colors.borderSubtle, backgroundColor: t.colors.surface },
    sheet: { backgroundColor: t.colors.surface, borderColor: t.colors.borderSubtle },
    backScrim: { backgroundColor: withAlpha(t.colors.background, alpha.half) },
    heading: { ...t.type.h2, fontSize: t.fontSize.xl, lineHeight: Math.round(t.fontSize.xl * 1.35), color: t.colors.textPrimary },
    whyAccount: { ...t.type.bodySm, color: t.colors.textSecondary },
    oauthWaiting: { ...t.type.caption, color: t.colors.textSecondary },
    textActionLabel: { ...t.type.bodySm, color: t.colors.textSecondary },
    textActionAccent: { ...t.type.bodyStrong, fontSize: t.fontSize.sm, color: t.colors.primary },
    legalText: { ...t.type.caption, color: t.colors.textMuted },
    notice: { borderColor: t.colors.border, backgroundColor: t.colors.surface2 },
    noticeText: { ...t.type.bodySm, color: t.colors.textSecondary },
  };
}
