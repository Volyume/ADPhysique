import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha } from '../styles/theme';
import { VolyumeMark } from '../components/BrandMark';
import Button from '../components/Button';
import OAuthButtons from '../components/auth/OAuthButtons';
import EmailPasswordFields from '../components/auth/EmailPasswordFields';
import { signInWithEmail, signUpWithEmail, resetPassword, signInWithGoogle, signInWithApple } from '../lib/supabase';
import { syncProfile, bulkUploadLocalData, syncAll } from '../lib/sync';
import { wipeAllUserData } from '../lib/database';
import { logError } from '../lib/errorLog';
import { audit } from '../lib/observability';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useToast } from '../components/Toast';

export default function LoginScreen({ route }) {
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
  // Either an explicit promptSignup param OR a tier-choice intent from Welcome
  // (pro_signup or free_signup) lands us in the create-account tab. A new user
  // who just chose a tier means to make an account, not sign in. Returning
  // users switch to "Sign in" themselves.
  const promptSignup = route?.params?.promptSignup === true
    || /_signup$/.test(route?.params?.intent || '');
  const [mode, setMode] = useState(promptSignup ? 'signup' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleEmailAuth() {
    if (!email.trim() || !password.trim()) {
      toast.show('Enter your email and password', { variant: 'warning' });
      return;
    }
    // AUTH-6 (V1): validate before the network call so the user gets inline
    // guidance instead of a raw Supabase error. The same 8-char minimum the
    // Pro signup screen enforces, on the primary signup path too.
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      toast.show('Enter a valid email address', { variant: 'warning' });
      return;
    }
    if (mode === 'signup' && password.length < 8) {
      toast.show('Password must be at least 8 characters', { variant: 'warning' });
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
        // unknown-email, we can't disambiguate, so the prompt is
        // permissive: the user knows which they meant.
        const msg = (error.message || '').toLowerCase();
        // AUTH-6 (V3): explicit precedence. Treat as "unregistered" only on a
        // sign-in whose error looks like an unknown account AND is NOT the
        // distinct "email not confirmed" case (which needs confirmation, not a
        // new account). The old form relied on === / && / || precedence and
        // read ambiguously.
        const looksUnregistered = mode === 'signin'
          && !msg.includes('email not confirmed')
          && (
            msg.includes('invalid login')
            || msg.includes('invalid credentials')
            || msg.includes('user not found')
            || msg.includes('invalid')
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
                  // Password stays, they only need to confirm it meets
                  // the 8-char minimum.
                },
              },
            ],
          );
        } else {
          toast.show(error.message || 'Could not sign in', { variant: 'error' });
        }
      } else if (mode === 'signup' && data.user && !data.session) {
        // Seed the per-uid first-run flag so the eventual sign-in routes to
        // the wizard, not MainTabs, no matter how long email confirmation
        // takes (A2-021).
        useAppStore.getState().noteSignupPendingOnboarding(data.user.id);
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
          // New account, push local history up
          bulkUploadLocalData(supabaseUserId, localUserId)
            .catch(e => logError('LoginScreen.bulkUploadLocalData.signup', e, { supabaseUserId }));
          // Switch the navigator into ProOnboardingStack by setting the tier.
          // The previous navigation.replace('ProOnboarding') was a no-op
          // when LoginScreen was reached from WelcomeStack, that stack
          // doesn't register ProOnboarding. Tier change is the routing
          // signal RootNavigator watches.
          if (!tier) await setTier('pro', 'LoginScreen.newAccountSetup');
        } else {
          // Existing account: push any local-only edits, then pull cloud
          // data down. Routed through syncAll (not the legacy
          // bulkUploadLocalData + pullFromCloud) because the food domain
          // and the other migrated tables only sync through the
          // registry/transport path, so a plain pullFromCloud would never
          // restore the user's meals or water on a fresh sign-in.
          // RootNavigator's onAuthStateChange SIGNED_IN handler also runs
          // syncAll; the runner's lock dedupes whichever fires second.
          // firstRunComplete + tier + userProfile are restored centrally
          // by that handler.
          syncAll({ userId: supabaseUserId, localUserId: supabaseUserId, triggeredBy: 'sign_in' })
            .catch(e => logError('LoginScreen.syncAll.signin', e, { supabaseUserId }));
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
        toast.show(result.error.message || 'Sign-in failed', { variant: 'error' });
      } else {
        // Success is fully driven by onAuthStateChange, log so the
        // upstream SIGNED_IN event can be correlated to this initiation.
        logInfo('LoginScreen.oauth.dialogReturned', `provider=${provider}, awaiting SIGNED_IN`);
      }
    } catch (e) {
      logError('LoginScreen.oauth.threw', e, { provider });
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      toast.show('Enter your email address above first', { variant: 'warning' });
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
          {/* ── Brand block ── */}
          {/* The wordmark asset already contains the "Volyume" lettering,
              so we render the mark and skip the duplicate text underneath.
              Tagline stays. Size dialled back from 80→56, the previous
              scale dominated the screen above the auth form. */}
          <View style={styles.brand}>
            <VolyumeMark size={56} style={styles.brandMark} />
            <Text style={styles.brandTagline}>Less thinking. More lifting.</Text>
          </View>

          {/* Thin divider below brand */}
          <View style={styles.brandDivider} />

          {/* ── OAuth quick-sign-in ──
              Surfaced above the email form because most users prefer
              continuing with an existing account. Shared with the Pro
              onboarding account step (see OAuthButtons). */}
          <OAuthButtons
            onApple={() => handleOAuth('apple')}
            onGoogle={() => handleOAuth('google')}
            disabled={loading}
          />

          {/* ── Form block ── */}
          <View style={styles.formBlock}>
            <Text style={styles.formTitle}>
              {isSignIn ? 'Sign in to your account' : 'Create your account'}
            </Text>
            {!isSignIn && (
              <View style={styles.backupPrompt}>
                <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
                <Text style={styles.backupPromptText}>
                  A free account keeps your training and progress backed up and synced. Change or lose your phone and everything restores instantly.
                </Text>
              </View>
            )}

            <EmailPasswordFields
              mode={isSignIn ? 'signin' : 'signup'}
              email={email}
              onEmailChange={setEmail}
              password={password}
              onPasswordChange={setPassword}
              showPassword={showPassword}
              onToggleShowPassword={() => setShowPassword(v => !v)}
            />

            {/* Forgot password */}
            {isSignIn && (
              <TouchableOpacity
                onPress={handleForgotPassword}
                style={styles.forgotBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Primary CTA ── */}
          <Button
            testID={isSignIn ? 'submit-signin' : 'submit-signup'}
            accessibilityLabel={isSignIn ? 'Sign in' : 'Create account'}
            title={isSignIn ? 'Sign In' : 'Create Account'}
            size="lg"
            loading={loading}
            onPress={handleEmailAuth}
            style={styles.submitBtn}
          />

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
    // eslint-disable-next-line no-restricted-syntax -- login hero title, intentional display size
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
  formTitle: {
    ...type.title,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: -spacing.sm,
  },
  forgotText: {
    ...type.label,
    color: colors.primary,
  },

  // Primary button
  submitBtn: { marginBottom: spacing.lg },

  // Mode switch
  modeSwitch: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: spacing.sm,
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
  dividerText: { ...type.caption, color: colors.textMuted },

  backupPrompt: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: colors.primaryBg, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: withAlpha(colors.primary, 0.251),
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
});
