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
import { signInWithEmail, signUpWithEmail, resetPassword } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useAppStore from '../store/useAppStore';

const CRASH_LOG_KEY = '@volyume_crash_log';

export default function LoginScreen({ navigation }) {
  const { initLocalUser } = useAppStore();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [crashLog, setCrashLog] = useState(null);

  // On mount, check for a stored crash log from a previous fatal error
  React.useEffect(() => {
    AsyncStorage.getItem(CRASH_LOG_KEY).then(raw => {
      if (raw) {
        try {
          const data = JSON.parse(raw);
          setCrashLog(data);
        } catch (_) {}
      }
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
      } else if (mode === 'signup' && data.session) {
        navigation.replace('Onboarding');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      Alert.alert('Enter email', 'Enter your email address first.');
      return;
    }
    setLoading(true);
    const { error } = await resetPassword(email.trim());
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Email sent', 'Check your inbox for a password reset link.');
    }
  }

  async function handleContinueLocally() {
    setLocalLoading(true);
    await initLocalUser();
    setLocalLoading(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Crash log — only shown when a previous fatal error was stored */}
          {crashLog && (
            <View style={{ backgroundColor: '#1a0000', borderWidth: 1, borderColor: '#FF3B30', borderRadius: 8, padding: 12, margin: 8 }}>
              <Text style={{ color: '#FF3B30', fontWeight: 'bold', marginBottom: 4 }}>Previous crash detected — screenshot this:</Text>
              <Text style={{ color: '#FF8080', fontSize: 12 }}>{crashLog.message}</Text>
              <Text style={{ color: '#999', fontSize: 10, marginTop: 4 }}>{crashLog.stack?.slice(0, 400)}</Text>
              <TouchableOpacity onPress={() => { AsyncStorage.removeItem(CRASH_LOG_KEY); setCrashLog(null); }} style={{ marginTop: 8 }}>
                <Text style={{ color: '#FF3B30', fontSize: 12 }}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          )}
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoMark}>
              <Text style={styles.logoV}>V</Text>
            </View>
            <Text style={styles.appName}>VOLYUME</Text>
            <Text style={styles.tagline}>Intelligent Hypertrophy Logbook</Text>
          </View>

          {/* Mode Toggle */}
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'signin' && styles.modeBtnActive]}
              onPress={() => setMode('signin')}
            >
              <Text style={[styles.modeBtnText, mode === 'signin' && styles.modeBtnTextActive]}>
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'signup' && styles.modeBtnActive]}
              onPress={() => setMode('signup')}
            >
              <Text style={[styles.modeBtnText, mode === 'signup' && styles.modeBtnTextActive]}>
                Create Account
              </Text>
            </TouchableOpacity>
          </View>

          {/* Email Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
            />
          </View>

          {/* Password Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={password}
                onChangeText={setPassword}
                placeholder={mode === 'signup' ? 'Min 8 characters' : 'Your password'}
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete={mode === 'signup' ? 'new-password' : 'password'}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(v => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {mode === 'signin' && (
            <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          )}

          {/* Email Auth CTA */}
          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
            onPress={handleEmailAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.primaryBtnText}>
                {mode === 'signup' ? 'Create Account' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Continue Locally — primary Stage 1 path */}
          <TouchableOpacity
            style={[styles.localBtn, localLoading && styles.primaryBtnDisabled]}
            onPress={handleContinueLocally}
            disabled={localLoading}
          >
            {localLoading ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <>
                <Ionicons name="phone-portrait-outline" size={18} color={colors.textPrimary} />
                <Text style={styles.localBtnText}>Continue without an account</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.localNote}>
            Your data stays on this device. You can add an account later to sync across devices.
          </Text>

          <Text style={styles.betaNote}>Free during beta — no subscription required</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    justifyContent: 'center',
  },
  logoContainer: { alignItems: 'center', marginBottom: spacing.xxxl },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  logoV: { fontSize: 40, fontWeight: fontWeight.black, color: colors.background, lineHeight: 44 },
  appName: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.black,
    color: colors.textPrimary,
    letterSpacing: 4,
  },
  tagline: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs, letterSpacing: 0.5 },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 4,
    marginBottom: spacing.xl,
  },
  modeBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center' },
  modeBtnActive: { backgroundColor: colors.primary },
  modeBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textSecondary },
  modeBtnTextActive: { color: colors.background },
  inputGroup: { marginBottom: spacing.lg },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  passwordRow: { position: 'relative' },
  passwordInput: { paddingRight: 52 },
  eyeBtn: {
    position: 'absolute',
    right: spacing.lg,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: spacing.xl, marginTop: -spacing.sm },
  forgotText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.medium },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.background },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: fontSize.sm, color: colors.textMuted },
  localBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  localBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  localNote: {
    textAlign: 'center',
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.md,
    lineHeight: 18,
    paddingHorizontal: spacing.sm,
  },
  betaNote: {
    textAlign: 'center',
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xl,
  },
});
