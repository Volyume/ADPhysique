import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import useAppStore from '../store/useAppStore';
import { signUpWithEmail, signInWithEmail, getSupabaseClient } from '../lib/supabase';
import { syncProfile, bulkUploadLocalData, pullFromCloud } from '../lib/sync';

const PRO_PERKS = [
  { icon: 'sparkles', text: 'A plan built around your schedule and goals' },
  { icon: 'calendar-outline', text: 'Precision Coaching that adjusts training and nutrition as your body responds' },
  { icon: 'nutrition-outline', text: 'Nutrition targets and body tracking' },
  { icon: 'eye-outline', text: 'We tell you what we changed, what we held, and why' },
];

export default function ProUpgradeScreen({ navigation }) {
  const {
    user, session, userProfile, tier, setTier, refreshTierFromCloud,
  } = useAppStore();

  const hasAccount = Boolean(session?.user?.id) && !user?.isLocal;

  const [mode, setMode] = useState('signup'); // 'signup' | 'signin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function activatePro(supabaseUserId, { isNew }) {
    syncProfile(supabaseUserId, userProfile, 'pro', { isBetaTester: isNew }).catch(() => {});
    if (isNew) {
      bulkUploadLocalData(supabaseUserId, user?.id).catch(() => {});
    } else {
      pullFromCloud(supabaseUserId).catch(() => {});
    }
    await setTier('pro');
    refreshTierFromCloud(getSupabaseClient(), supabaseUserId).catch(() => {});
  }

  // Free user who already has a cloud account: just flip the tier.
  async function confirmExistingAccount() {
    if (!session?.user?.id) return;
    setBusy(true);
    try {
      await activatePro(session.user.id, { isNew: false });
      setDone(true);
    } catch (_) {
      Alert.alert('Something went wrong', 'Please try again.');
    }
    setBusy(false);
  }

  async function handleAuth() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Enter your email and a password to continue.');
      return;
    }
    if (mode === 'signup' && password.length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      const fn = mode === 'signup' ? signUpWithEmail : signInWithEmail;
      const { data, error } = await fn(email.trim(), password);
      if (error) {
        Alert.alert(mode === 'signup' ? 'Signup error' : 'Sign in error', error.message);
        setBusy(false);
        return;
      }
      if (mode === 'signup' && data.user && !data.session) {
        Alert.alert(
          'Check your email',
          'We sent a confirmation link. Confirm it, sign in here, and your Pro access activates.',
        );
        setMode('signin');
        setBusy(false);
        return;
      }
      if (data.session) {
        await activatePro(data.session.user.id, { isNew: mode === 'signup' });
        setDone(true);
      }
    } catch (_) {
      Alert.alert('Something went wrong', 'Please try again.');
    }
    setBusy(false);
  }

  // ── Success state ────────────────────────────────────────────────────────────

  if (done || tier === 'pro') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.successWrap}>
          <View style={styles.successCircle}>
            <Ionicons name="checkmark" size={40} color={colors.background} />
          </View>
          <Text style={styles.successTitle}>You're Pro.</Text>
          <Text style={styles.successBody}>
            Everything's unlocked and your data is backed up. As a beta tester you keep extended Pro free when we launch fully.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.88}
          >
            <Text style={styles.primaryBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.background} />
          </TouchableOpacity>
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
          >
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <Ionicons name="sparkles" size={30} color={colors.primary} />
          </View>
          <Text style={styles.title}>Go Pro</Text>
          <Text style={styles.subtitle}>
            Free is the logbook a coach would write in. Pro is the coach who writes back.
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

          <View style={styles.offerCard}>
            <View style={styles.offerBadge}>
              <Ionicons name="star" size={11} color={colors.background} />
              <Text style={styles.offerBadgeText}>Beta tester offer</Text>
            </View>
            <Text style={styles.offerText}>
              Pro is free during beta. Sign up now and you keep extended Pro free when we launch fully. No card, no catch.
            </Text>
            <Text style={styles.cancelNote}>Cancel anytime, two taps. No questions.</Text>
          </View>

          {hasAccount ? (
            <>
              <Text style={styles.accountNote}>
                Your account is ready. Activate Pro and everything unlocks instantly.
              </Text>
              <TouchableOpacity
                style={[styles.primaryBtn, busy && styles.btnDisabled]}
                onPress={confirmExistingAccount}
                disabled={busy}
                activeOpacity={0.88}
              >
                {busy ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={16} color={colors.background} />
                    <Text style={styles.primaryBtnText}>Activate Pro</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.accountNote}>
                Pro needs a free account so your plan and progress are backed up and your access carries over after beta.
              </Text>

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
                  />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.fieldLabel}>Password</Text>
                <View style={[styles.fieldWrap, passwordFocused && styles.fieldWrapFocused]}>
                  <TextInput
                    style={[styles.fieldInput, { paddingRight: 48 }]}
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

              <TouchableOpacity
                style={[styles.primaryBtn, busy && styles.btnDisabled]}
                onPress={handleAuth}
                disabled={busy}
                activeOpacity={0.88}
              >
                {busy ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={16} color={colors.background} />
                    <Text style={styles.primaryBtnText}>
                      {mode === 'signup' ? 'Create account and go Pro' : 'Sign in and go Pro'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchBtn}
                onPress={() => setMode(m => (m === 'signup' ? 'signin' : 'signup'))}
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

          <TouchableOpacity style={styles.laterBtn} onPress={() => navigation.goBack()}>
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

  perks: { gap: spacing.md, marginBottom: spacing.xl },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  perkIcon: {
    width: 32, height: 32, borderRadius: radius.md,
    backgroundColor: colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  perkText: { fontSize: fontSize.sm, color: colors.textSecondary, flex: 1, lineHeight: 19 },

  offerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 2, borderColor: colors.primary,
    padding: spacing.lg, marginBottom: spacing.xl, gap: spacing.sm,
  },
  offerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary, borderRadius: 4,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  offerBadgeText: {
    fontSize: 9, fontWeight: fontWeight.black,
    color: colors.background, letterSpacing: 0.8,
  },
  offerText: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  cancelNote: { fontSize: 11, color: colors.textMuted, marginTop: spacing.xs },

  accountNote: {
    fontSize: fontSize.sm, color: colors.textMuted,
    lineHeight: 19, marginBottom: spacing.lg,
  },

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
  fieldWrapFocused: { borderColor: colors.primary + '80' },
  fieldInput: {
    flex: 1, paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2, fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  eyeBtn: {
    position: 'absolute', right: spacing.md,
    top: 0, bottom: 0, justifyContent: 'center', paddingHorizontal: 4,
  },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.primary,
    borderRadius: radius.lg, paddingVertical: spacing.lg + 2,
    marginTop: spacing.sm,
  },
  btnDisabled: { opacity: 0.55 },
  primaryBtnText: {
    fontSize: fontSize.lg, fontWeight: fontWeight.bold,
    color: colors.background,
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
});
