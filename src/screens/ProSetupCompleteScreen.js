import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Easing, ScrollView,
  TextInput, ActivityIndicator, Alert, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import { VolyumeMark } from '../components/BrandMark';
import useAppStore from '../store/useAppStore';
import { GOAL_LABELS, PHASE_LABELS } from '../lib/coachingGoals';
import { signUpWithEmail, signInWithEmail } from '../lib/supabase';
import { migrateLocalUserId } from '../lib/database';
import { bulkUploadLocalData, syncProfile } from '../lib/sync';

const WEEK_STEPS = [
  {
    icon: 'scale-outline',
    title: 'Log your weight each morning',
    body: 'Before food, after the bathroom. One number, a few seconds. Tracked in the background.',
  },
  {
    icon: 'barbell-outline',
    title: 'Train your sessions',
    body: 'Open Train, start a session, log each set as you go.',
  },
  {
    icon: 'calendar-outline',
    title: 'Check in once a week',
    body: 'At the end of your training week, review how it went. Your plan adjusts based on how your body responded.',
  },
];

export default function ProSetupCompleteScreen({ navigation }) {
  const { user, userProfile, completeFirstRun, setTier } = useAppStore();
  const firstName = userProfile?.firstName || 'there';

  const [nutritionSummary, setNutritionSummary] = useState(null);
  const [trainingOpen, setTrainingOpen] = useState(false);

  // Account creation
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [busy, setBusy] = useState(false);

  const opacity = useRef(new Animated.Value(0)).current;
  const slideY  = useRef(new Animated.Value(20)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(checkScale, {
        toValue: 1, tension: 60, friction: 6, useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1, duration: 380,
          easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }),
        Animated.timing(slideY, {
          toValue: 0, duration: 380,
          easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('@volyume_nutrition_targets')
      .then(raw => {
        if (raw) {
          const parsed = JSON.parse(raw);
          setNutritionSummary(parsed);
        }
      })
      .catch(() => {});
  }, []);

  async function handleCreateAccount() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Enter your email and a password to continue.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await signUpWithEmail(email.trim(), password);
      if (error) {
        Alert.alert('Account error', error.message);
        setBusy(false);
        return;
      }
      if (data.user && !data.session) {
        Alert.alert(
          'Check your email',
          'We sent a confirmation link. Confirm it then sign back in.',
        );
        setBusy(false);
        return;
      }
      if (data.session) {
        const supabaseUserId = data.session.user.id;
        const localUserId = user?.id;
        await migrateLocalUserId(localUserId, supabaseUserId).catch(() => {});
        syncProfile(supabaseUserId, userProfile, 'pro', { isBetaTester: true }).catch(() => {});
        bulkUploadLocalData(supabaseUserId, localUserId).catch(() => {});
      }
    } catch (_) {}
    setBusy(false);
    await completeFirstRun();
  }

  async function handleSkipAccount() {
    await setTier('free');
    await completeFirstRun();
  }

  const goalLabel = GOAL_LABELS[userProfile?.trainingGoal] ?? 'Build Muscle';
  const phaseLabel = PHASE_LABELS[userProfile?.trainingPhase] ?? null;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Check mark animation */}
          <Animated.View style={[styles.checkWrap, { transform: [{ scale: checkScale }] }]}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={40} color={colors.background} />
            </View>
          </Animated.View>

          <Animated.View style={[styles.mainBlock, { opacity, transform: [{ translateY: slideY }] }]}>
            <View style={styles.brandRow}>
              <VolyumeMark size={20} color={colors.textPrimary} accent={colors.primary} />
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
            </View>

            <Text style={styles.headline}>You're all set, {firstName}.</Text>
            <Text style={styles.sub}>
              Your targets are calculated. Here's what's ready for you.
            </Text>

            {/* Nutrition targets — prominent */}
            {nutritionSummary?.targetKcal ? (
              <View style={styles.nutritionCard}>
                <Text style={styles.cardLabel}>Your daily targets</Text>
                <View style={styles.calorieRow}>
                  <Text style={styles.calorieNum}>{nutritionSummary.targetKcal}</Text>
                  <Text style={styles.calorieUnit}>kcal / day</Text>
                </View>
                <View style={styles.macroRow}>
                  {nutritionSummary.proteinG ? (
                    <View style={styles.macroItem}>
                      <Text style={styles.macroValue}>{nutritionSummary.proteinG}g</Text>
                      <Text style={styles.macroLabel}>Protein</Text>
                    </View>
                  ) : null}
                  {nutritionSummary.carbsG ? (
                    <View style={[styles.macroItem, styles.macroItemBorder]}>
                      <Text style={styles.macroValue}>{nutritionSummary.carbsG}g</Text>
                      <Text style={styles.macroLabel}>Carbs</Text>
                    </View>
                  ) : null}
                  {nutritionSummary.fatG ? (
                    <View style={[styles.macroItem, styles.macroItemBorder]}>
                      <Text style={styles.macroValue}>{nutritionSummary.fatG}g</Text>
                      <Text style={styles.macroLabel}>Fat</Text>
                    </View>
                  ) : null}
                </View>
                {(goalLabel || phaseLabel) ? (
                  <View style={styles.goalRow}>
                    {goalLabel ? (
                      <View style={styles.goalChip}>
                        <Ionicons name="trophy-outline" size={11} color={colors.primary} />
                        <Text style={styles.goalChipText}>{goalLabel}</Text>
                      </View>
                    ) : null}
                    {phaseLabel ? (
                      <View style={styles.goalChip}>
                        <Ionicons name="layers-outline" size={11} color={colors.textMuted} />
                        <Text style={[styles.goalChipText, { color: colors.textMuted }]}>{phaseLabel}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Collapsible training rhythm */}
            <TouchableOpacity
              style={styles.trainingHeader}
              onPress={() => setTrainingOpen(v => !v)}
              activeOpacity={0.75}
            >
              <Text style={styles.trainingHeaderText}>Your weekly routine</Text>
              <Ionicons
                name={trainingOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            {trainingOpen && (
              <View style={styles.trainingBody}>
                {WEEK_STEPS.map((item, i) => (
                  <View key={i} style={[styles.weekStep, i < WEEK_STEPS.length - 1 && styles.weekStepBorder]}>
                    <View style={styles.weekIconWrap}>
                      <Ionicons name={item.icon} size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.weekStepTitle}>{item.title}</Text>
                      <Text style={styles.weekStepBody}>{item.body}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Account creation */}
            <View style={styles.accountSection}>
              <Text style={styles.accountTitle}>Save your progress</Text>
              <Text style={styles.accountSub}>
                Create a free account to back up your plan and targets. Switch phones without losing anything.
              </Text>

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
                    textContentType="emailAddress"
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Password</Text>
                <View style={[styles.fieldWrap, passwordFocused && styles.fieldWrapFocused]}>
                  <TextInput
                    style={[styles.fieldInput, { paddingRight: 48 }]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="At least 8 characters"
                    placeholderTextColor={colors.textDisabled}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                    textContentType="newPassword"
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
                onPress={handleCreateAccount}
                disabled={busy}
                activeOpacity={0.88}
              >
                {busy ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Create account and start training</Text>
                    <Ionicons name="arrow-forward" size={18} color={colors.background} />
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.skipBtn} onPress={handleSkipAccount} activeOpacity={0.7}>
                <Text style={styles.skipBtnText}>Skip for now</Text>
              </TouchableOpacity>
              <Text style={styles.skipNote}>
                You can sign up later from Settings. Without an account your data stays on this device only.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, padding: spacing.xl, paddingBottom: spacing.xxxl },

  checkWrap: { alignSelf: 'center', marginTop: spacing.xl, marginBottom: spacing.xl },
  checkCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOpacity: 0.4,
    shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 12,
  },

  mainBlock: { flex: 1 },

  brandRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg,
  },
  proBadge: {
    backgroundColor: colors.primary, borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2,
  },
  proBadgeText: { fontSize: 9, fontWeight: fontWeight.black, color: colors.background, letterSpacing: 0.8 },

  headline: {
    fontSize: fontSize.xxxl, fontWeight: fontWeight.bold,
    color: colors.textPrimary, marginBottom: spacing.sm, lineHeight: 38,
  },
  sub: {
    fontSize: fontSize.md, color: colors.textSecondary, lineHeight: 23, marginBottom: spacing.xl,
  },

  // Nutrition card
  nutritionCard: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    borderWidth: 1.5, borderColor: colors.primary + '50',
    padding: spacing.lg, marginBottom: spacing.md,
  },
  cardLabel: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
    color: colors.textMuted, letterSpacing: 0.3, marginBottom: spacing.md,
  },
  calorieRow: {
    flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginBottom: spacing.md,
  },
  calorieNum: { fontSize: 42, fontWeight: fontWeight.black, color: colors.textPrimary, lineHeight: 46 },
  calorieUnit: { fontSize: fontSize.sm, color: colors.textMuted },
  macroRow: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border,
    paddingTop: spacing.md, marginBottom: spacing.md,
  },
  macroItem: { flex: 1, alignItems: 'center', gap: 2 },
  macroItemBorder: { borderLeftWidth: 1, borderLeftColor: colors.border },
  macroValue: { fontSize: fontSize.lg, fontWeight: fontWeight.black, color: colors.textPrimary },
  macroLabel: { fontSize: fontSize.xs, color: colors.textMuted },
  goalRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  goalChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primaryBg, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs,
    borderWidth: 1, borderColor: colors.primary + '30',
  },
  goalChipText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.semibold },

  // Collapsible training section
  trainingHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg, marginBottom: 1,
  },
  trainingHeaderText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  trainingBody: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    borderTopLeftRadius: 0, borderTopRightRadius: 0,
    marginBottom: spacing.xl, overflow: 'hidden',
  },
  weekStep: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  weekStepBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  weekIconWrap: {
    width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  weekStepTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary, marginBottom: 3 },
  weekStepBody: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 17 },

  // Account section
  accountSection: {
    marginTop: spacing.xl, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.xl,
  },
  accountTitle: {
    fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary, marginBottom: spacing.sm,
  },
  accountSub: {
    fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 20, marginBottom: spacing.xl,
  },
  fieldGroup: { marginBottom: spacing.lg },
  fieldLabel: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
    color: colors.textMuted, letterSpacing: 0.3, marginBottom: spacing.sm,
  },
  fieldWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border,
  },
  fieldWrapFocused: { borderColor: colors.primary + '80' },
  fieldInput: {
    flex: 1, paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2, fontSize: fontSize.md, color: colors.textPrimary,
  },
  eyeBtn: {
    position: 'absolute', right: spacing.md,
    top: 0, bottom: 0, justifyContent: 'center', paddingHorizontal: 4,
  },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.primary,
    borderRadius: radius.lg, paddingVertical: spacing.lg + 2, marginTop: spacing.sm,
  },
  btnDisabled: { opacity: 0.55 },
  primaryBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.background },

  skipBtn: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.sm },
  skipBtnText: { fontSize: fontSize.sm, color: colors.textMuted },
  skipNote: {
    fontSize: fontSize.xs, color: colors.textDisabled,
    textAlign: 'center', lineHeight: 17, marginTop: spacing.xs,
  },
});
