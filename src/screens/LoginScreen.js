import { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, radius, type, withAlpha } from '../styles/theme';
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

          {/* ── Heading ── */}
          <View style={styles.headingBlock}>
            <Text style={styles.formTitle}>Create your account or sign in</Text>
            <View style={styles.backupPrompt}>
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
              <Text style={styles.backupPromptText}>
                A free account keeps your training and progress backed up and synced. Change or lose your phone and everything restores instantly.
              </Text>
            </View>
          </View>

          {/* ── OAuth sign-in ──
              Apple on iOS, Google on Android (see OAuthButtons for the
              platform split). This is the only way into the app. */}
          <OAuthButtons
            onApple={() => handleOAuth('apple')}
            onGoogle={() => handleOAuth('google')}
            disabled={loading}
          />

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

  // Heading
  headingBlock: { gap: spacing.lg, marginBottom: spacing.xl },
  formTitle: {
    ...type.title,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },

  backupPrompt: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: colors.primaryBg, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: withAlpha(colors.primary, 0.251),
  },
  backupPromptText: {
    fontSize: fontSize.sm, color: colors.textSecondary, flex: 1, lineHeight: 20,
  },
});
