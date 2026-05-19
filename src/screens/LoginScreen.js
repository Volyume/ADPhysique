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
import { signInWithEmail, signUpWithEmail, resetPassword } from '../lib/supabase';
import { syncProfile, bulkUploadLocalData, pullFromCloud } from '../lib/sync';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useAppStore from '../store/useAppStore';

const CRASH_LOG_KEY = '@volyume_crash_log';

export default function LoginScreen({ navigation, route }) {
  const { initLocalUser, user: localUser, userProfile, tier } = useAppStore();
  const promptSignup = route?.params?.promptSignup === true;
  const [mode, setMode] = useState(promptSignup ? 'signup' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
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
    setLoading(true);
    try {
      const fn = mode === 'signup' ? signUpWithEmail : signInWithEmail;
      const { data, error } = await fn(email.trim(), password);
      if (error) {
        Alert.alert('Error', error.message);
      } else if (mode === 'signup' && data.user && !data.session) {
        Alert.alert('Check your email', 'We sent you a confirmation link. Confirm then sign in.');
        setMode('signin');
      } else if (data.session) {
        const supabaseUserId = data.session.user.id;
        const localUserId = localUser?.id;
        // Fire-and-forget: sync profile then upload local data in background
        syncProfile(supabaseUserId, userProfile, tier).catch(() => {});
        if (mode === 'signup') {
          // New account — push local history up
          bulkUploadLocalData(supabaseUserId, localUserId).catch(() => {});
          navigation.replace('Onboarding');
        } else {
          // Existing account — pull cloud data down (new device scenario)
          pullFromCloud(supabaseUserId).catch(() => {});
        }
      }
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
    if (error) { Alert.alert('Error', error.message); }
    else { Alert.alert('Email sent', 'Check your inbox for a password reset link.'); }
  }

  async function handleContinueLocally() {
    setLocalLoading(true);
    await initLocalUser();
    setLocalLoading(false);
  }

  const isSignIn = mode === 'signin';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Decorative background V mark — faint, centred */}
      <View style={styles.bgDecor} pointerEvents="none">
        <VolyumeMark size={340} color={colors.primary} accent={colors.primary} style={{ opacity: 0.028 }} />
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
          <View style={styles.brand}>
            <View style={styles.brandMark}>
              <VolyumeMark size={72} color={colors.textPrimary} accent={colors.primary} />
            </View>
            <Text style={styles.brandName}>Volyume</Text>
            <Text style={styles.brandTagline}>Less thinking. More lifting.</Text>
          </View>

          {/* Thin divider below brand */}
          <View style={styles.brandDivider} />

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

          {/* ── Divider ── */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ── Continue locally ── */}
          <TouchableOpacity
            style={[styles.localBtn, localLoading && styles.btnDisabled]}
            onPress={handleContinueLocally}
            disabled={localLoading}
            activeOpacity={0.8}
          >
            {localLoading ? (
              <ActivityIndicator color={colors.textSecondary} size="small" />
            ) : (
              <>
                <Ionicons name="phone-portrait-outline" size={17} color={colors.textSecondary} />
                <Text style={styles.localBtnText}>Continue without an account</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.localNote}>
            Your data stays on this device. You can add an account later to sync across devices and back up your history.
          </Text>

          <Text style={styles.betaNote}>Free during beta · No subscription required</Text>
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
  crashTitle: { color: colors.error, fontWeight: fontWeight.bold, marginBottom: 4, fontSize: fontSize.sm },
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
    letterSpacing: 0.8,
    textTransform: 'uppercase',
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
    paddingHorizontal: 4,
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
