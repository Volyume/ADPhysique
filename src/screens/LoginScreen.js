import { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSize, spacing, type } from '../styles/theme';
import { VolyumeMark } from '../components/BrandMark';
import OAuthButtons from '../components/auth/OAuthButtons';
import { signInWithGoogle, signInWithApple } from '../lib/supabase';
import { audit } from '../lib/observability';
import { useToast } from '../components/Toast';

export default function LoginScreen() {
  // Apple/Google only. The email + password form was removed (founder
  // 2026-07-01): email confirmation was flaky and left users stranded on the
  // "check your email" step. OAuth needs no verification round-trip. Sign-up vs
  // sign-in is not a distinction here — Apple/Google either create the account
  // or sign into the existing one, and RootNavigator's onAuthStateChange drives
  // all new-account routing (restoreSessionFromCloud + refreshTierFromCloud),
  // cross-user wipe, and the Article 9 consent gate. No anonymous mode
  // (IDENTITY_AND_OWNERSHIP_LOCKED.md rule 1).
  const toast = useToast();
  const [loading, setLoading] = useState(false);

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
      if (result?.cancelled) {
        // A7: a cancelled OAuth dialog (user backed out) used to fall into
        // the silent else below with no feedback at all.
        logInfo('LoginScreen.oauth.cancelled', `provider=${provider}`);
        toast.show('Sign-in was cancelled.', { variant: 'info' });
      } else if (result?.error) {
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
          <View style={styles.brand}>
            <VolyumeMark size={56} style={styles.brandMark} />
            <Text style={styles.brandTagline}>Less thinking. More lifting.</Text>
          </View>

          {/* Thin divider below brand */}
          <View style={styles.brandDivider} />

          {/* ── OAuth sign-in ──
              Apple on iOS, Google on Android (see OAuthButtons for the
              platform split). This is the only way into the app. */}
          <OAuthButtons
            onApple={() => handleOAuth('apple')}
            onGoogle={() => handleOAuth('google')}
            disabled={loading}
          />
          {/* A7: the only affordance while waiting was dimmed buttons — no
              indication anything is actually happening. A calm caption names
              what's in progress. */}
          {loading ? (
            <Text style={styles.oauthWaiting}>Waiting for Google or Apple…</Text>
          ) : null}

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
    letterSpacing: 0.3,
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
});
