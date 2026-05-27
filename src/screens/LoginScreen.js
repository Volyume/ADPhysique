import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import { VolyumeMark } from '../components/BrandMark';
import { signInWithEmail, signUpWithEmail, resetPassword, signInWithGoogle, signInWithApple } from '../lib/supabase';
import { syncProfile, bulkUploadLocalData, pullFromCloud } from '../lib/sync';
import { wipeAllUserData } from '../lib/database';
import { logError } from '../lib/errorLog';
import { audit } from '../lib/observability';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useToast } from '../components/Toast';

const CRASH_LOG_KEY = '@volyume_crash_log';

export default function LoginScreen({ navigation, route }) {
  // No anonymous-mode action: per IDENTITY_AND_OWNERSHIP_LOCKED.md
  // rule 1 ("No anonymous mode") + rule 5 (no migrateLocalUserId) +
  // the anti-patterns list, the only path into the app is a real
  // signup or sign-in. `initLocalUser` and `handleContinueLocally`
  // were the entry points; both removed.
  const { user: localUser, userProfile, tier, setTier } = useAppStore(useShallow(s => ({
    user: s.user,
    userProfile: s.userProfile,
    tier: s.tier,
    setTier: s.setTier,
  })));
  const toast = useToast();
  // Either explicit promptSignup OR Welcome's "Go Pro" intent lands us
  // in signup tab. Returning users will switch to "Sign in" themselves.
  const promptSignup = route?.params?.promptSignup === true
    || route?.params?.intent === 'pro_signup';
  const [mode, setMode] = useState(promptSignup ? 'signup' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [crashLog, setCrashLog] = useState(null);

  React.useEffect(() => {
    AsyncStorage.getItem(CRASH_LOG_KEY).then(raw => {
      if (raw) { try { setCrashLog(JSON.parse(raw)); } catch (_) {} }
    }).catch(() => {});
  }, []);

  async function handleEmailAuth() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    audit(mode === 'signup' ? 'auth.signup.attempt' : 'auth.signin.attempt', {
      method: 'email',
    });
    setLoading(true);
    try {
      const fn = mode === 'signup' ? signUpWithEmail : signInWithEmail;
      const { data, error } = await fn(email.trim(), password);
      if (error) {
        // If a sign-in failed because the credentials don't match any
        // existing account, offer to switch to sign-up rather than just
        // bouncing the user back to the same screen. Supabase returns
        // "Invalid login credentials" for both wrong-password AND
        // unknown-email — we can't disambiguate, so the prompt is
        // permissive: the user knows which they meant.
        const msg = (error.message || '').toLowerCase();
        const looksUnregistered = mode === 'signin' && (
          msg.includes('invalid login') ||
          msg.includes('invalid credentials') ||
          msg.includes('user not found') ||
          msg.includes('email not confirmed') === false && msg.includes('invalid')
        );
        if (looksUnregistered) {
          Alert.alert(
            'No account found',
            `We couldn't sign in with that email. Want to create a new account instead?`,
            [
              { text: 'Try again', style: 'cancel' },
              {
                text: 'Create account',
                onPress: () => {
                  setMode('signup');
                  // Password stays — they only need to confirm it meets
                  // the 8-char minimum.
                },
              },
            ],
          );
        } else {
          Alert.alert('Error', error.message);
        }
      } else if (mode === 'signup' && data.user && !data.session) {
        Alert.alert(
          'Check your email',
          'We\'ve sent a confirmation link to ' + email.trim() + '.\n\nOnce you\'ve confirmed, come back here and sign in with your email and password.',
          [{ text: 'Got it', onPress: () => setMode('signin') }],
        );
      } else if (data.session) {
        const supabaseUserId = data.session.user.id;
        const localUserId = localUser?.id;
        const lastSignedInUserId = await AsyncStorage.getItem('@volyume_last_supabase_user_id').catch(() => null);

        // Cross-user safety: if a DIFFERENT user previously used this phone,
        // wipe their data from local SQLite before pulling the new user's
        // data down. Without this, two people sharing a device (or the
        // same person using multiple accounts) would see each other's
        // workouts, plans, and check-ins because SQLite persists across
        // sign-out.
        if (lastSignedInUserId && lastSignedInUserId !== supabaseUserId) {
          try {
            await wipeAllUserData(lastSignedInUserId);
            // Also remove the migrate-from-AsyncStorage flag for the
            // previous user so the next-launch migration doesn't re-run.
            await AsyncStorage.removeItem(`@volyume_body_metrics_migrated_${lastSignedInUserId}`).catch(() => {});
          } catch (e) {
            logError('LoginScreen.handleEmailAuth.crossUserWipe', e, {
              previous: lastSignedInUserId, incoming: supabaseUserId,
            });
          }
        }
        await AsyncStorage.setItem('@volyume_last_supabase_user_id', supabaseUserId).catch(() => {});

        // No anonymous-to-account migration: per
        // IDENTITY_AND_OWNERSHIP_LOCKED.md rule 5 ("Sign-in path
        // does not call migrateLocalUserId. That function is
        // deleted from database.js in this refactor."). The
        // anonymous-mode entry point is removed (rule 1 +
        // anti-patterns), so by spec the local SQLite at this
        // moment carries no rows that would need re-keying.
        // Cross-user contamination is prevented by the wipe in
        // RootNavigator.onAuthStateChange + the sign-out wipe in
        // useAppStore.clearAuthStateForSignOut.

        // Fire-and-forget but capture failures so silent network drops
        // during sign-in stop swallowing data loss.
        syncProfile(supabaseUserId, userProfile, tier)
          .catch(e => logError('LoginScreen.syncProfile', e, { supabaseUserId }));
        if (mode === 'signup') {
          // New account — push local history up
          bulkUploadLocalData(supabaseUserId, localUserId)
            .catch(e => logError('LoginScreen.bulkUploadLocalData.signup', e, { supabaseUserId }));
          // Switch the navigator into ProOnboardingStack by setting the tier.
          // The previous navigation.replace('ProOnboarding') was a no-op
          // when LoginScreen was reached from WelcomeStack — that stack
          // doesn't register ProOnboarding. Tier change is the routing
          // signal RootNavigator watches.
          if (!tier) await setTier('pro', 'LoginScreen.newAccountSetup');
        } else {
          // Existing account — push any local-only edits made while signed
          // out, then pull cloud data down (new device scenario).
          // firstRunComplete + tier + userProfile are restored centrally
          // by RootNavigator's onAuthStateChange SIGNED_IN handler.
          bulkUploadLocalData(supabaseUserId, supabaseUserId)
            .catch(e => logError('LoginScreen.bulkUploadLocalData.signin', e, { supabaseUserId }));
          pullFromCloud(supabaseUserId)
            .catch(e => logError('LoginScreen.pullFromCloud', e, { supabaseUserId }));
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider) {
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
      if (result?.error) {
        logError('LoginScreen.oauth.providerError', result.error, { provider });
        Alert.alert('Sign-in failed', result.error.message);
      } else {
        // Success is fully driven by onAuthStateChange — log so the
        // upstream SIGNED_IN event can be correlated to this initiation.
        logInfo('LoginScreen.oauth.dialogReturned', `provider=${provider} — awaiting SIGNED_IN`);
      }
    } catch (e) {
      logError('LoginScreen.oauth.threw', e, { provider });
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      Alert.alert('Enter email', 'Enter your email address above first.');
      return;
    }
    setLoading(true);
    const { error } = await resetPassword(email.trim());
    setLoading(false);
    if (error) { toast.show(error.message, { variant: 'error' }); }
    else { toast.show('Check your inbox for the reset link', { variant: 'success' }); }
  }

  const isSignIn = mode === 'signin';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
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
          {/* Crash log — shown only when a previous fatal error was stored */}
          {crashLog && (
            <View style={styles.crashBanner}>
              <Text style={styles.crashTitle}>Previous crash detected. Screenshot this:</Text>
              <Text style={styles.crashMsg}>{crashLog.message}</Text>
              <Text style={styles.crashStack}>{crashLog.stack?.slice(0, 400)}</Text>
              <TouchableOpacity onPress={() => { AsyncStorage.removeItem(CRASH_LOG_KEY); setCrashLog(null); }}>
                <Text style={styles.crashDismiss}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Brand block ── */}
          {/* The wordmark asset already contains the "Volyume" lettering,
              so we render the mark and skip the duplicate text underneath.
              Tagline stays. Size dialled back from 80→56 — the previous
              scale dominated the screen above the auth form. */}
          <View style={styles.brand}>
            <VolyumeMark size={56} style={styles.brandMark} />
            <Text style={styles.brandTagline}>Less thinking. More lifting.</Text>
          </View>

          {/* Thin divider below brand */}
          <View style={styles.brandDivider} />

          {/* ── OAuth quick-sign-in ── */}
          {/* Platform-aware: Apple on iOS (App Store requires Sign in with
              Apple when any other social provider is offered), Google on
              both. Surfaced ABOVE the email form because most users prefer
              continuing with an existing account over creating yet another
              email/password. Falls back gracefully if the user's Supabase
              project doesn't have the provider configured — the Supabase
              error is surfaced via Alert. */}
          <View style={styles.oauthBlock}>
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[styles.oauthBtnApple, loading && styles.btnDisabled]}
                onPress={() => handleOAuth('apple')}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel="Continue with Apple"
              >
                <Ionicons name="logo-apple" size={18} color="#FFFFFF" />
                <Text style={styles.oauthBtnAppleText}>Continue with Apple</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.oauthBtn, loading && styles.btnDisabled]}
              onPress={() => handleOAuth('google')}
              disabled={loading}
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

          {/* ── Form block ── */}
          <View style={styles.formBlock}>
            <Text style={styles.formTitle}>
              {isSignIn ? 'Sign in to your account' : 'Create your account'}
            </Text>
            {promptSignup && !isSignIn && (
              <View style={styles.backupPrompt}>
                <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
                <Text style={styles.backupPromptText}>
                  Create a free account to keep your plan, workouts, and progress safe. If you lose or change your phone, everything restores instantly.
                </Text>
              </View>
            )}

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email</Text>
              <View style={[styles.fieldWrap, emailFocused && styles.fieldWrapFocused]}>
                <TextInput
                  testID="email"
                  accessibilityLabel="Email"
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
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={[styles.fieldWrap, passwordFocused && styles.fieldWrapFocused]}>
                <TextInput
                  testID="password"
                  accessibilityLabel="Password"
                  style={[styles.fieldInput, styles.fieldInputPassword]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={isSignIn ? 'Your password' : 'Min 8 characters'}
                  placeholderTextColor={colors.textDisabled}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete={isSignIn ? 'password' : 'new-password'}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(v => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={19}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot password */}
            {isSignIn && (
              <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotBtn}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Primary CTA ── */}
          <TouchableOpacity
            testID={isSignIn ? 'submit-signin' : 'submit-signup'}
            accessibilityLabel={isSignIn ? 'Sign in' : 'Create account'}
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={handleEmailAuth}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.primaryBtnText}>
                {isSignIn ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Mode switch */}
          <TouchableOpacity
            testID="auth-mode-switch"
            accessibilityLabel={isSignIn ? 'Switch to create account' : 'Switch to sign in'}
            style={styles.modeSwitch}
            onPress={() => setMode(isSignIn ? 'signup' : 'signin')}
          >
            <Text style={styles.modeSwitchText}>
              {isSignIn ? "Don't have an account? " : 'Already have an account? '}
              <Text style={styles.modeSwitchAction}>
                {isSignIn ? 'Create one' : 'Sign in'}
              </Text>
            </Text>
          </TouchableOpacity>

          {/* "Continue without an account" removed per
              IDENTITY_AND_OWNERSHIP_LOCKED.md decision 1 (no
              anonymous mode). Every user has a real account from the
              first row they create; that's what makes cross-device
              sync and the cross-user wipe rule provable. */}

          <Text style={styles.betaNote}>No subscription required</Text>
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
  },

  crashBanner: {
    backgroundColor: colors.errorBg, borderWidth: 1, borderColor: colors.error,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg,
  },
  crashTitle: { color: colors.error, fontWeight: fontWeight.bold, marginBottom: spacing.xs, fontSize: fontSize.sm },
  crashMsg: { color: colors.error, fontSize: fontSize.xs },
  crashStack: { color: colors.textMuted, fontSize: 10, marginTop: spacing.xs },
  crashDismiss: { color: colors.error, fontSize: fontSize.xs, marginTop: spacing.sm },

  // Brand block
  brand: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  brandMark: {
    marginBottom: spacing.sm,
  },
  brandName: {
    fontSize: 38,
    fontWeight: fontWeight.black,
    color: colors.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 42,
  },
  brandTagline: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  brandDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.xxl,
  },

  // Form
  formBlock: { gap: spacing.lg, marginBottom: spacing.xl },
  oauthBlock: { gap: spacing.sm, marginBottom: spacing.lg },
  oauthBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  oauthBtnText: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  // Apple branding requires black background + white text (HIG)
  oauthBtnApple: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: colors.appleBtnBg },
  oauthBtnAppleText: { color: colors.appleBtnText, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  oauthDivider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  oauthDividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  oauthDividerText: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  formTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  fieldGroup: { gap: spacing.xs },
  fieldLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  fieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  fieldWrapFocused: {
    borderColor: colors.primary + '80',
    backgroundColor: colors.surface,
  },
  fieldInput: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  fieldInputPassword: { paddingRight: 48 },
  eyeBtn: {
    position: 'absolute',
    right: spacing.md,
    top: 0, bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: -spacing.sm,
  },
  forgotText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },

  // Primary button
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg + 2,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  btnDisabled: { opacity: 0.55 },
  primaryBtnText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.background,
    letterSpacing: 0.3,
  },

  // Mode switch
  modeSwitch: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
    marginBottom: spacing.xl,
  },
  modeSwitchText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  modeSwitchAction: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },

  // Divider
  divider: {
    flexDirection: 'row', alignItems: 'center',
    gap: spacing.md, marginBottom: spacing.xl,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: fontSize.xs, color: colors.textMuted },

  backupPrompt: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: colors.primaryBg, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.primary + '40',
    marginBottom: spacing.sm,
  },
  backupPromptText: {
    fontSize: fontSize.sm, color: colors.textSecondary, flex: 1, lineHeight: 20,
  },

  // Local mode
  localBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    borderWidth: 1.5, borderColor: colors.border,
    marginBottom: spacing.md,
  },
  localBtnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  localNote: {
    textAlign: 'center',
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 18,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xl,
  },
  betaNote: {
    textAlign: 'center',
    fontSize: fontSize.xs,
    color: colors.textDisabled,
  },
});
