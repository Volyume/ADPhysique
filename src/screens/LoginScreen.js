import { useState, useRef } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, spacing, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import { VolyumeMark } from '../components/BrandMark';
import OAuthButtons from '../components/auth/OAuthButtons';
import TextField from '../components/TextField';
import Button from '../components/Button';
import { signInWithGoogle, signInWithApple, signInWithEmail, signUpWithEmail } from '../lib/supabase';
import { audit } from '../lib/observability';
import { useToast } from '../components/Toast';

export default function LoginScreen() {
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
  const [emailMode, setEmailMode] = useState('signin'); // 'signin' | 'signup'
  const [emailSubmitting, setEmailSubmitting] = useState(false);
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
        if (result.error.code === 'apple_device_state') {
          toast.show('Apple could not finish sign-in. Check you are signed in to iCloud in your phone Settings, then try again.', { variant: 'error' });
        } else {
          toast.show("That didn't go through. Try again.", { variant: 'error' });
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
      // oauth.threw catch).
      toast.show("That didn't go through. Try again.", { variant: 'error' });
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
    try {
      const fn = emailMode === 'signup' ? signUpWithEmail : signInWithEmail;
      const { data, error } = await fn(e, password);
      if (error) {
        logError('LoginScreen.email.providerError', error, { mode: emailMode });
        // Calm, plain wording (never the raw SDK string) mapped from the
        // common Supabase auth errors; anything else gets the safe fallback.
        const raw = String(error.message || '');
        const msg = /invalid login credentials/i.test(raw)
          ? 'That email or password is not right.'
          : /already registered|already been registered|user already exists/i.test(raw)
            ? 'That email already has an account. Try signing in instead.'
            : /email not confirmed|confirm/i.test(raw)
              ? 'Check your email to confirm your account, then sign in.'
              : /password.*(6|characters|short)/i.test(raw)
                ? 'Use a password of at least 6 characters.'
                : "That didn't go through. Try again.";
        toast.show(msg, { variant: 'error' });
        return;
      }
      // Sign-up with email confirmation ON returns a user but no session yet.
      if (emailMode === 'signup' && data?.user && !data?.session) {
        toast.show('Check your email to confirm your account, then sign in.', { variant: 'info' });
        setEmailMode('signin');
        return;
      }
      // A session is present: RootNavigator's onAuthStateChange takes over and
      // routes exactly as it does for an OAuth sign-in.
      logInfo('LoginScreen.email.sessionReturned', `mode=${emailMode}, awaiting SIGNED_IN`);
    } catch (err) {
      logError('LoginScreen.email.threw', err, { mode: emailMode });
      toast.show("That didn't go through. Try again.", { variant: 'error' });
    } finally {
      setEmailSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
      {/* Decorative background wordmark, faint and centred */}
      <View style={styles.bgDecor} pointerEvents="none">
        <VolyumeMark size={120} style={{ opacity: 0.04 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Brand block ── */}
          <View style={styles.brand}>
            <VolyumeMark size={56} style={styles.brandMark} />
            <Text style={[styles.brandTagline, live.brandTagline]}>Less thinking. More lifting.</Text>
          </View>

          {/* Thin divider below brand */}
          <View style={[styles.brandDivider, live.brandDivider]} />

          {/* ── OAuth sign-in ──
              Apple on iOS, Google on Android (see OAuthButtons for the
              platform split). This is the only way into the app. */}
          <OAuthButtons
            onApple={() => handleOAuth('apple')}
            onGoogle={() => handleOAuth('google')}
            disabled={loading}
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

          {/* ── Email + password ──
              A second, equal way in (founder 2026-07-21). Any session it
              creates flows through the same onAuthStateChange path as OAuth. */}
          <View style={styles.emailDivider}>
            <View style={[styles.emailDividerLine, live.emailDividerLine]} />
            <Text style={[styles.emailDividerText, live.emailDividerText]}>or</Text>
            <View style={[styles.emailDividerLine, live.emailDividerLine]} />
          </View>

          <View style={styles.emailForm}>
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
              style={styles.emailSubmit}
              accessibilityLabel={emailMode === 'signup' ? 'Create account with email' : 'Sign in with email'}
            />
            <TouchableOpacity
              onPress={() => setEmailMode(emailMode === 'signup' ? 'signin' : 'signup')}
              accessibilityRole="button"
              accessibilityLabel={emailMode === 'signup' ? 'Switch to signing in' : 'Switch to creating an account'}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.emailToggle, live.emailToggle]}>
                {emailMode === 'signup' ? 'Have an account? Sign in' : 'New here? Create an account'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* "Continue without an account" removed per
              IDENTITY_AND_OWNERSHIP_LOCKED.md decision 1 (no anonymous mode). */}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  bgDecor: {
    position: 'absolute',
    top: '15%',
    alignSelf: 'center',
    zIndex: 0,
  },

  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxl,
    justifyContent: 'center',
  },

  // Brand block
  brand: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  brandMark: {
    marginBottom: spacing.sm,
  },
  brandTagline: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  brandDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.xxl,
  },
  oauthWaiting: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  emailDivider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg, marginBottom: spacing.md },
  emailDividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  emailDividerText: { color: colors.textMuted, fontSize: fontSize.xs },
  emailForm: { gap: spacing.md },
  emailSubmit: { marginTop: spacing.xs },
  emailToggle: { ...type.caption, color: colors.primary, textAlign: 'center', marginTop: spacing.xs },
  eyeBtn: {
    minWidth: 44,
    minHeight: 44,
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
    brandTagline: { fontSize: t.fontSize.sm, color: t.colors.textMuted },
    brandDivider: { backgroundColor: t.colors.border },
    oauthWaiting: { ...t.type.caption, color: t.colors.textSecondary },
    emailDividerLine: { backgroundColor: t.colors.border },
    emailDividerText: { color: t.colors.textMuted },
    emailToggle: { ...t.type.caption, color: t.colors.primary },
  };
}
