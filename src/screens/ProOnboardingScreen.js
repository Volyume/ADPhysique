import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import { VolyumeMark } from '../components/BrandMark';
import useAppStore from '../store/useAppStore';
import { logBodyMetric, saveNutritionTargets, saveUserBodyProfile, migrateLocalUserId } from '../lib/database';
import { signUpWithEmail } from '../lib/supabase';
import { bulkUploadLocalData, syncProfile } from '../lib/sync';
import {
  requestNotificationPermissions,
  scheduleMorningWeightNotification,
  scheduleCheckinReminder,
} from '../lib/notifications';

const NOTIF_PREFS_KEY = '@volyume_notification_prefs';

const TOTAL_STEPS = 5;

// Boer formula — estimates lean body mass (kg) from weight, height, sex.
// More accurate for protein targeting than total bodyweight.
function estimateLBM(weightKg, heightCm, sex) {
  const lbm = sex === 'female'
    ? (0.252 * weightKg) + (0.473 * heightCm) - 48.3
    : (0.407 * weightKg) + (0.267 * heightCm) - 19.2;
  // Floor at 60% of total weight (guards against extreme inputs)
  return Math.max(lbm, weightKg * 0.6);
}

// Per-frequency TDEE multipliers and protein floors (g/kg BW).
// Protein floors scale with training load: more sessions = more muscle breakdown = more needed.
const TRAINING_FREQ_CONFIG = {
  '2-3': { tdeeMultiplier: 1.375, proteinFloor: { standard: 1.6, high: 1.9, max: 2.2 } },
  '4-5': { tdeeMultiplier: 1.550, proteinFloor: { standard: 2.0, high: 2.2, max: 2.5 } },
  '6+':  { tdeeMultiplier: 1.725, proteinFloor: { standard: 2.2, high: 2.5, max: 2.8 } },
};

// Returns protein gram targets per level, scaled by training frequency.
// Takes the higher of LBM-based or the bodyweight floor so the Boer formula
// can't suppress targets for heavier/athletic individuals.
function getProteinTargets(weightKg, heightCm, sex, trainingFreq = '4-5') {
  const lbm = estimateLBM(weightKg, heightCm, sex);
  const floors = TRAINING_FREQ_CONFIG[trainingFreq]?.proteinFloor ?? TRAINING_FREQ_CONFIG['4-5'].proteinFloor;
  return {
    standard: Math.max(Math.round(lbm * 2.0), Math.round(weightKg * floors.standard)),
    high:     Math.max(Math.round(lbm * 2.4), Math.round(weightKg * floors.high)),
    max:      Math.max(Math.round(lbm * 2.7), Math.round(weightKg * floors.max)),
  };
}

// Auto-selects a protein level. Higher frequency = higher default recommendation.
function recommendProteinLevel(weightKg, heightCm, sex, trainingFreq = '4-5') {
  if (trainingFreq === '6+') return 'high';
  const lbm = estimateLBM(weightKg, heightCm, sex);
  const bfPct = ((weightKg - lbm) / weightKg) * 100;
  if (trainingFreq === '2-3') return bfPct > 25 ? 'standard' : 'high';
  // 4-5 days
  if (bfPct > 28) return 'standard';
  if (bfPct > 18) return 'high';
  return 'max';
}

function calcNutrition(weightKg, heightCm, ageYears, sex, goal, proteinG, trainingFreq = '4-5') {
  const bmr = sex === 'female'
    ? (10 * weightKg) + (6.25 * heightCm) - (5 * ageYears) - 161
    : (10 * weightKg) + (6.25 * heightCm) - (5 * ageYears) + 5;
  const multiplier = TRAINING_FREQ_CONFIG[trainingFreq]?.tdeeMultiplier ?? 1.55;
  const tdee = Math.round(bmr * multiplier);
  const adj = { cut: -400, maintain: 0, mild_bulk: 250, mod_bulk: 400 };
  const kcal = Math.max(tdee + (adj[goal] ?? 0), 1200);
  const fatG = Math.round(weightKg * 1.0);
  const carbsG = Math.max(Math.round((kcal - proteinG * 4 - fatG * 9) / 4), 50);
  return { targetKcal: kcal, proteinG, fatG, carbsG, maintenanceKcal: tdee };
}

const EXPERIENCE_OPTIONS = [
  { id: 'beginner',     label: 'Beginner',     sub: 'Less than 18 months of consistent training' },
  { id: 'intermediate', label: 'Intermediate', sub: '18 months to 3 years of consistent training' },
  { id: 'advanced',     label: 'Advanced',     sub: '3 to 5 years, consistently adding weight over time' },
  { id: 'competitive',  label: 'Competitive',  sub: '5+ years, training for physique or performance' },
];

const GOALS = [
  {
    id: 'cut',
    label: 'Lose fat',
    sub: 'Reduce body fat while holding onto your muscle. Slight calorie deficit.',
    icon: 'trending-down-outline',
  },
  {
    id: 'maintain',
    label: 'Maintain',
    sub: 'Keep your current physique. Improve strength and performance.',
    icon: 'remove-outline',
  },
  {
    id: 'mild_bulk',
    label: 'Lean gain',
    sub: 'Build muscle with minimal fat. A small surplus, slow and steady.',
    icon: 'trending-up-outline',
  },
  {
    id: 'mod_bulk',
    label: 'Build fast',
    sub: 'Prioritise muscle growth. More surplus, faster results.',
    icon: 'flash-outline',
  },
];

const PROTEIN_LEVELS = [
  {
    id: 'standard',
    label: 'Standard',
    sub: 'A solid daily target for active people. Plenty to support muscle building and recovery.',
  },
  {
    id: 'high',
    label: 'High',
    sub: 'The sweet spot for serious training. Maximises muscle growth without being excessive.',
  },
  {
    id: 'max',
    label: 'Maximum',
    sub: 'Used by competitive athletes and those cutting hard. High but sustainable for most people.',
  },
];

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const HOURS = Array.from({ length: 14 }, (_, i) => i + 5); // 5am–6pm

function fmt12(h) {
  if (h === 0) return '12 am';
  if (h < 12) return `${h} am`;
  if (h === 12) return '12 pm';
  return `${h - 12} pm`;
}

export default function ProOnboardingScreen({ navigation }) {
  const {
    user, units, setUnits, userProfile, saveLocalProfile,
  } = useAppStore();

  const [step, setStep] = useState(1);

  // Step 1 — profile
  const [firstName, setFirstName] = useState(userProfile?.firstName || '');
  const [localUnits, setLocalUnits] = useState(units || 'kg');
  const [bodyWeight, setBodyWeight] = useState('');
  const [sex, setSex] = useState('male');
  const [age, setAge] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [heightFt, setHeightFt] = useState('5');
  const [heightIn, setHeightIn] = useState('9');

  // Step 2 — goal + training frequency + experience
  const [goal, setGoal] = useState('mild_bulk');
  const [trainingFreq, setTrainingFreq] = useState('4-5');
  const [experience, setExperience] = useState(null);

  // Step 3 — nutrition (computed, editable)
  const [nutrition, setNutrition] = useState(null);
  const [kcalStr, setKcalStr] = useState('');
  const [proteinStr, setProteinStr] = useState('');
  const [proteinLevel, setProteinLevel] = useState('high');
  const [proteinTargets, setProteinTargets] = useState({ standard: 128, high: 154, max: 173 });

  // Step 4 — notifications
  const [morningEnabled, setMorningEnabled] = useState(true);
  const [morningHour, setMorningHour] = useState(7);
  const [checkinEnabled, setCheckinEnabled] = useState(true);
  const [checkinDay, setCheckinDay] = useState(0); // Sunday

  // Step 5 — account
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const [busy, setBusy] = useState(false);

  const nameRef = useRef(null);
  useEffect(() => {
    if (step === 1) {
      const t = setTimeout(() => nameRef.current?.focus(), 350);
      return () => clearTimeout(t);
    }
  }, [step]);

  // When the user confirms their email via deep link, the session arrives here.
  // If we're on the account step (step 5), auto-advance to CoachBuilder so they
  // don't have to press anything — the confirmation already proved ownership.
  useEffect(() => {
    if (user?.id && step === 5) {
      syncProfile(user.id, userProfile, 'pro', { isBetaTester: true }).catch(() => {});
      navigation.navigate('CoachBuilder', { firstRun: true });
    }
  }, [user?.id]);

  // ── Step transition helpers ──────────────────────────────────────────────────

  function goBack() {
    if (step === 1) return;
    setStep(s => s - 1);
  }

  function advanceFrom1() {
    if (!firstName.trim()) {
      Alert.alert('Your name', 'Please enter your first name to continue.');
      return;
    }
    setStep(2);
  }

  function advanceFrom2() {
    if (!experience) {
      Alert.alert('Training experience', 'Please select your experience level to continue.');
      return;
    }
    const bwRaw = parseFloat(bodyWeight) || (localUnits === 'lbs' ? 176 : 80);
    const bwKg = localUnits === 'lbs' ? bwRaw / 2.205 : bwRaw;
    const hcm = localUnits === 'kg'
      ? (parseFloat(heightCm) || 175)
      : Math.round(((parseInt(heightFt, 10) || 5) * 12 + (parseInt(heightIn, 10) || 9)) * 2.54);
    const ageNum = parseInt(age, 10) || 28;

    // Build protein targets from lean mass + training frequency, then auto-recommend a level
    const targets = getProteinTargets(bwKg, hcm, sex, trainingFreq);
    const recommended = recommendProteinLevel(bwKg, hcm, sex, trainingFreq);
    setProteinTargets(targets);
    setProteinLevel(recommended);

    const n = calcNutrition(bwKg, hcm, ageNum, sex, goal, targets[recommended], trainingFreq);
    setNutrition(n);
    setKcalStr(String(n.targetKcal));
    setProteinStr(String(targets[recommended]));
    setStep(3);
  }

  async function advanceFrom3() {
    // Save units + name + bodyweight + nutrition
    setBusy(true);
    try {
      if (setUnits) setUnits(localUnits);
      const merged = {
        ...(userProfile || {}),
        firstName: firstName.trim(),
        units: localUnits,
        goal,
        trainingFreq,
        experience,
      };
      if (user?.id) await saveLocalProfile(user.id, merged);
      const bwRaw = parseFloat(bodyWeight);
      const bwKg = localUnits === 'lbs' ? bwRaw / 2.205 : bwRaw;
      if (user?.id && !isNaN(bwKg) && bwKg > 0) {
        await logBodyMetric(user.id, { weightKg: bwKg, loggedAt: Date.now() });
      }
      const hcm = localUnits === 'kg'
        ? (parseFloat(heightCm) || null)
        : (!isNaN(parseInt(heightFt, 10)) ? Math.round(((parseInt(heightFt, 10) || 5) * 12 + (parseInt(heightIn, 10) || 9)) * 2.54) : null);
      const ageNum = parseInt(age, 10) || null;
      if (user?.id && (sex || hcm || ageNum)) {
        await saveUserBodyProfile(user.id, {
          sex,
          heightCm: hcm,
          dateOfBirth: ageNum ? new Date(new Date().getFullYear() - ageNum, 6, 1).toISOString().slice(0, 10) : null,
          primaryGoal: goal,
        }).catch(() => {});
      }
      const kcal = parseInt(kcalStr, 10);
      const protein = parseInt(proteinStr, 10);
      const fatG = nutrition?.fatG ?? Math.round((parseFloat(bodyWeight) || 80) * 1.0);
      const carbsG = Math.max(Math.round((kcal - protein * 4 - fatG * 9) / 4), 50);
      if (user?.id && !isNaN(kcal) && !isNaN(protein)) {
        await saveNutritionTargets(user.id, { targetKcal: kcal, proteinG: protein, fatG, carbsG });
      }
    } catch (e) {
      Alert.alert('Something went wrong', e?.message ?? 'Please try again.');
      setBusy(false);
      return;
    }
    setBusy(false);
    setStep(4);
  }

  async function advanceFrom4() {
    // Set up notifications
    if (morningEnabled || checkinEnabled) {
      try {
        const status = await requestNotificationPermissions();
        if (status === 'granted') {
          const prefs = {};
          if (morningEnabled) {
            await scheduleMorningWeightNotification(morningHour, 0);
            prefs.morning = { hour: morningHour, minute: 0, enabled: true };
          }
          if (checkinEnabled) {
            await scheduleCheckinReminder(checkinDay, 18, 0);
            prefs.checkin = { weekday: checkinDay, hour: 18, minute: 0, enabled: true };
          }
          await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs)).catch(() => {});
        }
      } catch (_) {}
    }
    setStep(5);
  }

  async function finishWithAccount() {
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
        Alert.alert('Signup error', error.message);
        setBusy(false);
        return;
      }
      if (data.user && !data.session) {
        // Confirmation email sent
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
        // Re-stamp local SQLite rows before uploading so the app reads them under the new ID
        await migrateLocalUserId(localUserId, supabaseUserId).catch(() => {});
        syncProfile(supabaseUserId, userProfile, 'pro', { isBetaTester: true }).catch(() => {});
        bulkUploadLocalData(supabaseUserId, localUserId).catch(() => {});
      }
    } catch (_) {}
    setBusy(false);
    // completeFirstRun is NOT called here. It fires only at the very end
    // (ProSetupComplete "Start training"). Calling it now would flip the
    // RootNavigator gate and skip CoachBuilder plus the summary entirely.
    // navigate (not replace) so Back from CoachBuilder returns here.
    navigation.navigate('CoachBuilder', { firstRun: true });
  }

  async function skipAccount() {
    // Declining the account during Pro onboarding downgrades to Free —
    // Pro can't be verified without an account after beta. Setting tier to
    // 'free' re-renders RootNavigator into the Free first-run path.
    const { setTier } = useAppStore.getState();
    await setTier('free');
  }

  function handleProteinLevel(levelId) {
    setProteinLevel(levelId);
    const grams = proteinTargets[levelId];
    if (!grams) return;
    setProteinStr(String(grams));
    // Recalculate carbs automatically when protein changes
    const kcal = parseInt(kcalStr, 10);
    const fatG = nutrition?.fatG ?? 80;
    if (!isNaN(kcal)) {
      const carbs = Math.max(Math.round((kcal - grams * 4 - fatG * 9) / 4), 50);
      setNutrition(prev => prev ? { ...prev, proteinG: grams, carbsG: carbs } : prev);
    }
  }

  // ── Progress bar ─────────────────────────────────────────────────────────────

  function ProgressBar() {
    return (
      <View style={styles.progressRow}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressSegment,
              i < step ? styles.progressDone : i === step - 1 ? styles.progressActive : styles.progressPending,
            ]}
          />
        ))}
      </View>
    );
  }

  // ── Shared header ────────────────────────────────────────────────────────────

  function Header({ title, sub }) {
    return (
      <View style={styles.headerBlock}>
        <View style={styles.brandRow}>
          <VolyumeMark size={22} color={colors.textPrimary} accent={colors.primary} />
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>PRO</Text>
          </View>
        </View>
        <ProgressBar />
        <Text style={styles.stepCount}>Step {step} of {TOTAL_STEPS}</Text>
        <Text style={styles.stepTitle}>{title}</Text>
        {sub ? <Text style={styles.stepSub}>{sub}</Text> : null}
      </View>
    );
  }

  // ── Step 1 — Profile ─────────────────────────────────────────────────────────

  if (step === 1) {
    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Header
              title="Let's get you set up."
              sub="This takes about two minutes. Everything you enter here shapes your coaching."
            />

            <View style={styles.section}>
              <Text style={styles.fieldLabel}>First name</Text>
              <TextInput
                ref={nameRef}
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Your name"
                placeholderTextColor={colors.textDisabled}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.fieldLabel}>Weight units</Text>
              <View style={styles.segmentRow}>
                {['kg', 'lbs'].map(u => (
                  <TouchableOpacity
                    key={u}
                    style={[styles.segment, localUnits === u && styles.segmentActive]}
                    onPress={() => setLocalUnits(u)}
                  >
                    <Text style={[styles.segmentText, localUnits === u && styles.segmentTextActive]}>
                      {u}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.fieldLabel}>Biological sex</Text>
              <Text style={styles.fieldHint}>Used to calculate your calorie and nutrition targets accurately.</Text>
              <View style={styles.segmentRow}>
                {[{ key: 'male', label: 'Male' }, { key: 'female', label: 'Female' }].map(s => (
                  <TouchableOpacity
                    key={s.key}
                    style={[styles.segment, sex === s.key && styles.segmentActive]}
                    onPress={() => setSex(s.key)}
                  >
                    <Text style={[styles.segmentText, sex === s.key && styles.segmentTextActive]}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.fieldLabel}>Age</Text>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={setAge}
                placeholder="e.g. 28"
                placeholderTextColor={colors.textDisabled}
                keyboardType="number-pad"
                maxLength={3}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.fieldLabel}>Height</Text>
              {localUnits === 'kg' ? (
                <TextInput
                  style={styles.input}
                  value={heightCm}
                  onChangeText={setHeightCm}
                  placeholder="e.g. 178 cm"
                  placeholderTextColor={colors.textDisabled}
                  keyboardType="decimal-pad"
                />
              ) : (
                <View style={styles.heightImperialRow}>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      style={styles.input}
                      value={heightFt}
                      onChangeText={setHeightFt}
                      placeholder="5 ft"
                      placeholderTextColor={colors.textDisabled}
                      keyboardType="number-pad"
                      maxLength={1}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      style={styles.input}
                      value={heightIn}
                      onChangeText={setHeightIn}
                      placeholder="9 in"
                      placeholderTextColor={colors.textDisabled}
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                  </View>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.fieldLabel}>Current body weight ({localUnits})</Text>
              <Text style={styles.fieldHint}>
                Used with your height and age to calculate your calorie targets. Update it daily from the home screen.
              </Text>
              <TextInput
                style={styles.input}
                value={bodyWeight}
                onChangeText={setBodyWeight}
                placeholder={localUnits === 'kg' ? 'e.g. 80' : 'e.g. 176'}
                placeholderTextColor={colors.textDisabled}
                keyboardType="decimal-pad"
              />
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={advanceFrom1} activeOpacity={0.88}>
              <Text style={styles.primaryBtnText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.background} />
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Step 2 — Goal ────────────────────────────────────────────────────────────

  if (step === 2) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <TouchableOpacity style={styles.backBtn} onPress={goBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>

          <Header
            title="What's your goal?"
            sub="This shapes your training plan and nutrition targets. You can change it at any time."
          />

          <View style={styles.goalList}>
            {GOALS.map(g => (
              <TouchableOpacity
                key={g.id}
                style={[styles.goalCard, goal === g.id && styles.goalCardActive]}
                onPress={() => setGoal(g.id)}
                activeOpacity={0.85}
              >
                <View style={[styles.goalIconWrap, goal === g.id && styles.goalIconWrapActive]}>
                  <Ionicons
                    name={g.icon}
                    size={20}
                    color={goal === g.id ? colors.primary : colors.textSecondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.goalLabel, goal === g.id && styles.goalLabelActive]}>{g.label}</Text>
                  <Text style={styles.goalSub}>{g.sub}</Text>
                </View>
                {goal === g.id && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.fieldLabel}>How many days a week do you train?</Text>
            <Text style={styles.fieldHint}>Used to calculate your calorie needs and protein targets accurately.</Text>
            <View style={styles.segmentRow}>
              {[
                { key: '2-3', label: '2–3 days' },
                { key: '4-5', label: '4–5 days' },
                { key: '6+',  label: '6+ days'  },
              ].map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.segment, trainingFreq === opt.key && styles.segmentActive]}
                  onPress={() => setTrainingFreq(opt.key)}
                >
                  <Text style={[styles.segmentText, trainingFreq === opt.key && styles.segmentTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.fieldLabel}>Training experience</Text>
            <Text style={styles.fieldHint}>Shapes the volume and exercise complexity of your plan.</Text>
            {EXPERIENCE_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.goalCard, experience === opt.id && styles.goalCardActive]}
                onPress={() => setExperience(opt.id)}
                activeOpacity={0.85}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.goalLabel, experience === opt.id && styles.goalLabelActive]}>{opt.label}</Text>
                  <Text style={styles.goalSub}>{opt.sub}</Text>
                </View>
                {experience === opt.id && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={advanceFrom2} activeOpacity={0.88}>
            <Text style={styles.primaryBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.background} />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Step 3 — Nutrition ───────────────────────────────────────────────────────

  if (step === 3) {
    const selectedGoal = GOALS.find(g => g.id === goal);
    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <TouchableOpacity style={styles.backBtn} onPress={goBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>

            <Header
              title="Your nutrition targets."
              sub="Calculated from your goal and body stats. Pick your protein level below, then adjust the numbers if you want to."
            />

            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
              <Text style={styles.infoCardText}>
                Goal: <Text style={{ color: colors.textPrimary }}>{selectedGoal?.label}</Text>
                {nutrition?.maintenanceKcal
                  ? ` · Estimated maintenance ${nutrition.maintenanceKcal} kcal`
                  : ''}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.fieldLabel}>Protein target</Text>
              <Text style={styles.fieldHint}>
                Calculated from your weight and estimated body composition. We've picked the level that best fits your stats, but you can change it.
              </Text>
              <View style={styles.goalList}>
                {PROTEIN_LEVELS.map(lvl => (
                  <TouchableOpacity
                    key={lvl.id}
                    style={[styles.goalCard, proteinLevel === lvl.id && styles.goalCardActive]}
                    onPress={() => handleProteinLevel(lvl.id)}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.goalIconWrap, proteinLevel === lvl.id && styles.goalIconWrapActive]}>
                      <Text style={{ fontSize: 15, fontWeight: fontWeight.bold, color: proteinLevel === lvl.id ? colors.primary : colors.textSecondary }}>
                        {proteinTargets[lvl.id]}g
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.goalLabel, proteinLevel === lvl.id && styles.goalLabelActive]}>{lvl.label}</Text>
                      <Text style={styles.goalSub}>{lvl.sub}</Text>
                    </View>
                    {proteinLevel === lvl.id && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.nutritionGrid}>
              <View style={styles.nutritionCard}>
                <Text style={styles.nutritionLabel}>Daily calories</Text>
                <TextInput
                  style={styles.nutritionInput}
                  value={kcalStr}
                  onChangeText={setKcalStr}
                  keyboardType="number-pad"
                  selectTextOnFocus
                />
                <Text style={styles.nutritionUnit}>kcal</Text>
              </View>

              <View style={styles.nutritionCard}>
                <Text style={styles.nutritionLabel}>Protein</Text>
                <TextInput
                  style={styles.nutritionInput}
                  value={proteinStr}
                  onChangeText={setProteinStr}
                  keyboardType="number-pad"
                  selectTextOnFocus
                />
                <Text style={styles.nutritionUnit}>g / day</Text>
              </View>
            </View>

            <Text style={styles.nutritionHint}>
              Protein and calorie targets are the two numbers that matter most. Fat and carbs fill in automatically. You can fine-tune everything later in Settings.
            </Text>

            <TouchableOpacity
              style={[styles.primaryBtn, busy && styles.btnDisabled]}
              onPress={advanceFrom3}
              disabled={busy}
              activeOpacity={0.88}
            >
              {busy ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>Looks good</Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.background} />
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Step 4 — Notifications ───────────────────────────────────────────────────

  if (step === 4) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <TouchableOpacity style={styles.backBtn} onPress={goBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>

          <Header
            title="Stay on track."
            sub="Coaching only works when it's consistent. These reminders keep you accountable without being annoying."
          />

          {/* Morning weight */}
          <View style={styles.notifSection}>
            <View style={styles.notifHeader}>
              <View style={styles.notifIconWrap}>
                <Ionicons name="scale-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.notifTitle}>Morning weight reminder</Text>
                <Text style={styles.notifSub}>
                  Log your weight first thing. Consistent daily weigh-ins are the most accurate way to track progress.
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.toggle, morningEnabled && styles.toggleOn]}
                onPress={() => setMorningEnabled(v => !v)}
              >
                <View style={[styles.toggleThumb, morningEnabled && styles.toggleThumbOn]} />
              </TouchableOpacity>
            </View>

            {morningEnabled && (
              <View style={styles.timeRow}>
                <Text style={styles.timeLabel}>Remind me at</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.hourScroll}
                  contentContainerStyle={styles.hourScrollContent}
                >
                  {HOURS.map(h => (
                    <TouchableOpacity
                      key={h}
                      style={[styles.hourChip, morningHour === h && styles.hourChipActive]}
                      onPress={() => setMorningHour(h)}
                    >
                      <Text style={[styles.hourChipText, morningHour === h && styles.hourChipTextActive]}>
                        {fmt12(h)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Weekly check-in */}
          <View style={styles.notifSection}>
            <View style={styles.notifHeader}>
              <View style={styles.notifIconWrap}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.notifTitle}>Weekly check-in reminder</Text>
                <Text style={styles.notifSub}>
                  Once a week you review how training went and set next week up. Pick the day that makes sense for your schedule.
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.toggle, checkinEnabled && styles.toggleOn]}
                onPress={() => setCheckinEnabled(v => !v)}
              >
                <View style={[styles.toggleThumb, checkinEnabled && styles.toggleThumbOn]} />
              </TouchableOpacity>
            </View>

            {checkinEnabled && (
              <View style={styles.timeRow}>
                <Text style={styles.timeLabel}>Check in on</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.hourScroll}
                  contentContainerStyle={styles.hourScrollContent}
                >
                  {DAYS.map((d, i) => (
                    <TouchableOpacity
                      key={d}
                      style={[styles.hourChip, checkinDay === i && styles.hourChipActive]}
                      onPress={() => setCheckinDay(i)}
                    >
                      <Text style={[styles.hourChipText, checkinDay === i && styles.hourChipTextActive]}>
                        {d.slice(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={advanceFrom4} activeOpacity={0.88}>
            <Text style={styles.primaryBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.background} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} onPress={() => setStep(5)}>
            <Text style={styles.skipBtnText}>Skip reminders for now</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Step 5 — Account ─────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backBtn} onPress={goBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>

          <Header
            title="One last thing."
            sub="Create your account to lock in your beta access and keep everything safe."
          />

          {/* Beta offer card */}
          <View style={styles.offerCard}>
            <View style={styles.offerBadgeRow}>
              <View style={styles.offerBadge}>
                <Ionicons name="star" size={11} color={colors.background} />
                <Text style={styles.offerBadgeText}>Beta tester offer</Text>
              </View>
            </View>
            <Text style={styles.offerHeadline}>Get extended Pro free at launch.</Text>
            <Text style={styles.offerBody}>
              Sign up now and you're locked in. When Volyume moves out of beta, everyone who tested with us gets extended Pro at no cost. No card, no catch.
            </Text>
            <View style={styles.offerPerks}>
              <View style={styles.offerPerk}>
                <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                <Text style={styles.offerPerkText}>Your data backed up securely</Text>
              </View>
              <View style={styles.offerPerk}>
                <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                <Text style={styles.offerPerkText}>Switch phones, keep everything</Text>
              </View>
              <View style={styles.offerPerk}>
                <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                <Text style={styles.offerPerkText}>Pro access continues after beta</Text>
              </View>
            </View>
          </View>

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
                placeholder="Min 8 characters"
                placeholderTextColor={colors.textDisabled}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
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
            onPress={finishWithAccount}
            disabled={busy}
            activeOpacity={0.88}
          >
            {busy ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <>
                <Text style={styles.primaryBtnText}>Create account and continue</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.background} />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} onPress={skipAccount}>
            <Text style={styles.skipBtnText}>Continue as Free instead</Text>
          </TouchableOpacity>
          <Text style={styles.skipNote}>
            Without an account, Pro features are only active on this device and can't be verified after beta ends. You can sign up later from Settings.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, padding: spacing.xl, paddingBottom: spacing.xxxl },

  // Header
  headerBlock: { marginBottom: spacing.xl },
  brandRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  proBadge: {
    backgroundColor: colors.primary, borderRadius: 4,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  proBadgeText: {
    fontSize: 9, fontWeight: fontWeight.black,
    color: colors.background, letterSpacing: 0.8,
  },

  progressRow: {
    flexDirection: 'row', gap: 4, marginBottom: spacing.sm,
  },
  progressSegment: {
    flex: 1, height: 3, borderRadius: 2,
  },
  progressDone: { backgroundColor: colors.primary },
  progressActive: { backgroundColor: colors.primary + 'CC' },
  progressPending: { backgroundColor: colors.border },

  stepCount: {
    fontSize: fontSize.xs, color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  stepTitle: {
    fontSize: fontSize.xxl, fontWeight: fontWeight.bold,
    color: colors.textPrimary, marginBottom: spacing.sm,
    lineHeight: 30,
  },
  stepSub: {
    fontSize: fontSize.sm, color: colors.textSecondary,
    lineHeight: 20,
  },

  // Back button
  backBtn: {
    flexDirection: 'row', alignItems: 'center',
    gap: 4, marginBottom: spacing.lg,
    alignSelf: 'flex-start',
  },
  backBtnText: { fontSize: fontSize.sm, color: colors.textSecondary },

  // Sections / inputs
  section: { marginBottom: spacing.xl },
  fieldLabel: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
    color: colors.textMuted, letterSpacing: 0.3,
    marginBottom: spacing.sm,
  },
  fieldHint: {
    fontSize: fontSize.xs, color: colors.textMuted,
    lineHeight: 18, marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  fieldWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  fieldWrapFocused: { borderColor: colors.primary + '80' },
  fieldInput: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  eyeBtn: {
    position: 'absolute', right: spacing.md,
    top: 0, bottom: 0, justifyContent: 'center', paddingHorizontal: 4,
  },

  heightImperialRow: { flexDirection: 'row', gap: spacing.md },

  // Segment control (units)
  segmentRow: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border,
    padding: 3,
  },
  segment: {
    flex: 1, paddingVertical: spacing.sm + 2,
    alignItems: 'center', borderRadius: radius.sm - 2,
  },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMuted },
  segmentTextActive: { color: colors.background },

  // Goal cards
  goalList: { gap: spacing.sm, marginBottom: spacing.xl },
  goalCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.border,
    padding: spacing.md,
  },
  goalCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryBg,
  },
  goalIconWrap: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  goalIconWrapActive: { backgroundColor: colors.primaryBg },
  goalLabel: {
    fontSize: fontSize.md, fontWeight: fontWeight.semibold,
    color: colors.textSecondary, marginBottom: 2,
  },
  goalLabelActive: { color: colors.textPrimary },
  goalSub: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 17 },

  // Nutrition grid
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: colors.primaryBg, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.primary + '30',
    padding: spacing.md, marginBottom: spacing.lg,
  },
  infoCardText: { fontSize: fontSize.sm, color: colors.textSecondary, flex: 1, lineHeight: 19 },

  nutritionGrid: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  nutritionCard: {
    flex: 1, backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border,
    padding: spacing.md, alignItems: 'center',
  },
  nutritionLabel: {
    fontSize: fontSize.xs, color: colors.textMuted,
    letterSpacing: 0.3, marginBottom: spacing.sm,
  },
  nutritionInput: {
    fontSize: 28, fontWeight: fontWeight.bold, color: colors.textPrimary,
    textAlign: 'center', width: '100%',
    paddingVertical: spacing.xs,
  },
  nutritionUnit: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.xs },
  nutritionHint: {
    fontSize: fontSize.xs, color: colors.textMuted,
    lineHeight: 18, marginBottom: spacing.xl,
  },

  // Notifications
  notifSection: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.md,
  },
  notifHeader: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
  },
  notifIconWrap: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  notifTitle: {
    fontSize: fontSize.md, fontWeight: fontWeight.semibold,
    color: colors.textPrimary, marginBottom: 2,
  },
  notifSub: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 17 },

  // Toggle switch
  toggle: {
    width: 44, height: 26, borderRadius: 13,
    backgroundColor: colors.surface3, justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleOn: { backgroundColor: colors.primary },
  toggleThumb: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.textMuted,
  },
  toggleThumbOn: {
    backgroundColor: colors.background,
    alignSelf: 'flex-end',
  },

  // Time / day pickers
  timeRow: { marginTop: spacing.md },
  timeLabel: {
    fontSize: fontSize.xs, color: colors.textMuted,
    marginBottom: spacing.sm, letterSpacing: 0.5,
  },
  hourScroll: { flexGrow: 0 },
  hourScrollContent: { gap: spacing.xs, paddingRight: spacing.sm },
  hourChip: {
    paddingHorizontal: spacing.md, paddingVertical: 7,
    borderRadius: radius.full, backgroundColor: colors.surface2,
    borderWidth: 1, borderColor: colors.border,
  },
  hourChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  hourChipText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium },
  hourChipTextActive: { color: colors.background, fontWeight: fontWeight.bold },

  // Beta offer card
  offerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderColor: colors.primary,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    shadowColor: colors.primary,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  offerBadgeRow: { marginBottom: spacing.sm },
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
  offerHeadline: {
    fontSize: fontSize.xl, fontWeight: fontWeight.bold,
    color: colors.textPrimary, marginBottom: spacing.sm,
    lineHeight: 26,
  },
  offerBody: {
    fontSize: fontSize.sm, color: colors.textSecondary,
    lineHeight: 20, marginBottom: spacing.md,
  },
  offerPerks: { gap: spacing.xs },
  offerPerk: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  offerPerkText: { fontSize: fontSize.sm, color: colors.textSecondary },

  // Account step (legacy — keep for potential reuse)
  shieldRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    paddingVertical: spacing.lg, marginBottom: spacing.xl,
  },
  shieldItem: { alignItems: 'center', gap: spacing.xs },
  shieldLabel: { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center' },

  // Buttons
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.primary,
    borderRadius: radius.lg, paddingVertical: spacing.lg + 2,
    marginBottom: spacing.md,
  },
  btnDisabled: { opacity: 0.55 },
  primaryBtnText: {
    fontSize: fontSize.lg, fontWeight: fontWeight.bold,
    color: colors.background,
  },
  skipBtn: {
    alignItems: 'center', paddingVertical: spacing.md,
  },
  skipBtnText: {
    fontSize: fontSize.sm, color: colors.textMuted,
  },
  skipNote: {
    textAlign: 'center', fontSize: fontSize.xs,
    color: colors.textDisabled, lineHeight: 18,
    marginTop: spacing.xs,
  },
});
