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
import { stoneLbsToKg, ftInToCm, parseBodyWeightToKg } from '../lib/units';
import { signUpWithEmail } from '../lib/supabase';
import { bulkUploadLocalData, syncProfile } from '../lib/sync';
import {
  requestNotificationPermissions,
  scheduleMorningWeightNotification,
  scheduleCheckinReminder,
} from '../lib/notifications';
import {
  PHYSIQUE_GOALS,
  PHYSIQUE_GOAL_GROUPS,
  TRAINING_PHASES,
  GOALS_WITH_WEAK_POINTS,
  GOAL_LABELS,
  phaseToNutritionKey,
  phaseToCoachingKey,
  daysToActivityLevel,
} from '../lib/coachingGoals';
import { calculateNutritionTargets } from '../lib/nutritionEngine';

const NOTIF_PREFS_KEY = '@volyume_notification_prefs';

// Total steps in the unified onboarding flow.
const TOTAL_STEPS = 10;

const SCOFF_QUESTIONS = [
  'Have you ever made yourself sick after eating because you felt uncomfortably full?',
  'Do you worry that you have lost control over how much you eat?',
  'Have you lost a significant amount of weight in the past three months?',
  'Do you think of yourself as overweight even when others say you are not?',
  'Would you say that thoughts about food take up a large part of your day?',
];

// Boer formula — estimates lean body mass (kg) from weight, height, sex.
// More accurate for protein targeting than total bodyweight.
function estimateLBM(weightKg, heightCm, sex) {
  const lbm = sex === 'female'
    ? (0.252 * weightKg) + (0.473 * heightCm) - 48.3
    : (0.407 * weightKg) + (0.267 * heightCm) - 19.2;
  // Floor at 60% of total weight (guards against extreme inputs)
  return Math.max(lbm, weightKg * 0.6);
}

// Maps exact daysPerWeek integer to bucket string for nutrition calc.
function daysToFreqBucket(daysPerWeek) {
  if (daysPerWeek <= 3) return '2-3';
  if (daysPerWeek <= 5) return '4-5';
  return '6+';
}

const EXPERIENCE_OPTIONS = [
  { id: 'beginner',     label: 'Beginner',     sub: 'Less than 18 months of consistent training' },
  { id: 'intermediate', label: 'Intermediate', sub: '18 months to 3 years of consistent training' },
  { id: 'advanced',     label: 'Advanced',     sub: '3 to 5 years, consistently adding weight over time' },
  { id: 'competitive',  label: 'Competitive',  sub: '5+ years, training for physique or performance' },
];

// Step 3 — Plan setup options
const SESSION_LENGTH_OPTIONS = [
  { label: '45 min', value: 45 },
  { label: '60 min', value: 60 },
  { label: '75 min', value: 75 },
  { label: '90 min', value: 90 },
];

const EQUIPMENT_OPTIONS = [
  { value: 'full_gym',        label: 'Full Gym',          icon: 'barbell-outline' },
  { value: 'machines_cables', label: 'Machines & Cables', icon: 'cog-outline' },
  { value: 'dumbbells_only',  label: 'Dumbbells Only',    icon: 'fitness-outline' },
  { value: 'barbell_plates',  label: 'Barbell & Plates',  icon: 'barbell-outline' },
  { value: 'home_gym',        label: 'Home Gym',          icon: 'home-outline' },
  { value: 'bodyweight',      label: 'Bodyweight',        icon: 'body-outline' },
];

const WEAK_POINT_MUSCLES = [
  'Chest', 'Upper Chest', 'Lats / Back Width', 'Back Thickness',
  'Side Delts', 'Rear Delts', 'Front Delts',
  'Biceps', 'Triceps',
  'Quads', 'Hamstrings', 'Glutes', 'Calves',
  'Core / Abs', 'Traps',
];

const RECOVERY_OPTIONS = [
  { value: 'poor',    label: 'Poor',    sub: 'Often sore, disrupted sleep, high life stress' },
  { value: 'average', label: 'Average', sub: 'Typical recovery between sessions' },
  { value: 'good',    label: 'Good',    sub: 'Sleeping well, low stress, nutrition on point' },
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
    user, units, setUnits, bodyWeightUnits, setBodyWeightUnits, userProfile, saveLocalProfile,
  } = useAppStore();

  const [step, setStep] = useState(1);

  // Step 1 — profile
  const [firstName, setFirstName] = useState(userProfile?.firstName || '');
  const localUnits = 'kg';
  // Body weight units: 'st' (stone+lbs) | 'kg' | 'lbs'. Default 'st' for UK.
  const [localBWUnits, setLocalBWUnits] = useState(bodyWeightUnits || 'st');
  // Stone+lbs entry (used when localBWUnits === 'st')
  const [bodyWeightSt, setBodyWeightSt] = useState('');
  const [bodyWeightStLbs, setBodyWeightStLbs] = useState('0');
  // Single-field entry (kg or lbs)
  const [bodyWeight, setBodyWeight] = useState('');
  // Height units independent of body weight units — UK default is imperial (ft+in)
  const [localHeightUnits, setLocalHeightUnits] = useState('imperial');
  const [sex, setSex] = useState('male');
  const [age, setAge] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [heightFt, setHeightFt] = useState('5');
  const [heightIn, setHeightIn] = useState('9');

  // Step 2 — training experience + days per week
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [experience, setExperience] = useState(null);

  // Step 3 — session length + equipment
  const [sessionLengthMinutes, setSessionLengthMinutes] = useState(60);
  const [equipment, setEquipment] = useState(null);

  // Step 4 — physique category (trainingGoal)
  const [trainingGoal, setTrainingGoal] = useState(null);
  const [goalFilterGroup, setGoalFilterGroup] = useState('All');

  // Step 5 — training phase
  const [trainingPhase, setTrainingPhase] = useState(null);

  // Step 6 — weak points (conditional)
  const [planWeakPoints, setPlanWeakPoints] = useState([]);

  // Step 7 — recovery
  const [recoveryRating, setRecoveryRating] = useState(null);

  // Step 8 — notifications
  const [morningEnabled, setMorningEnabled] = useState(true);
  const [morningHour, setMorningHour] = useState(7);
  const [checkinEnabled, setCheckinEnabled] = useState(true);
  const [checkinDay, setCheckinDay] = useState(0); // Sunday

  // Step 9 — wellbeing check (SCOFF screening) — opt-in only
  const [scoffAnswers, setScoffAnswers] = useState([null, null, null, null, null]);
  const [scoffOptedIn, setScoffOptedIn] = useState(false);

  // Step 10 — account
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
  // If we're on the account step (step 10), auto-advance to CoachBuilder so they
  // don't have to press anything — the confirmation already proved ownership.
  useEffect(() => {
    if (user?.id && step >= 10) {
      syncProfile(user.id, userProfile, 'pro', { isBetaTester: true }).catch(() => {});
      navigation.navigate('CoachBuilder', {
        firstRun: true,
        prefilled: {
          experience,
          daysPerWeek,
          sessionLengthMinutes,
          equipment,
          goal: trainingGoal,
          phase: trainingPhase,
          weakPoints: planWeakPoints,
          recoveryRating,
          nutritionCalculated: true,
        },
      });
    }
  }, [user?.id]);

  // ── Step transition helpers ──────────────────────────────────────────────────

  function goBack() {
    if (step === 1) return;
    // When going back to step 6 (weak points), check if it should be skipped
    if (step === 7 && !GOALS_WITH_WEAK_POINTS.includes(trainingGoal)) {
      setStep(5);
      return;
    }
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
    setStep(3);
  }

  function advanceFrom3() {
    if (!equipment) {
      Alert.alert('Equipment', 'Please select your equipment to continue.');
      return;
    }
    setStep(4);
  }

  function advanceFrom4() {
    if (!trainingGoal) {
      Alert.alert('Training goal', 'Please select a physique category to continue.');
      return;
    }
    setStep(5);
  }

  function advanceFrom5() {
    if (!trainingPhase) {
      Alert.alert('Training phase', 'Please select your current phase to continue.');
      return;
    }
    // Skip weak points step if goal doesn't support them
    if (!GOALS_WITH_WEAK_POINTS.includes(trainingGoal)) {
      setPlanWeakPoints([]);
      setStep(7);
    } else {
      setStep(6);
    }
  }

  function advanceFrom6() {
    setStep(7);
  }

  async function advanceFrom7() {
    // Save everything after recovery confirmed
    setBusy(true);
    try {
      if (setUnits) setUnits(localUnits);
      if (setBodyWeightUnits) setBodyWeightUnits(localBWUnits);

      const bwKg = localBWUnits === 'st'
        ? stoneLbsToKg(bodyWeightSt, bodyWeightStLbs)
        : parseBodyWeightToKg(bodyWeight, localBWUnits);
      const hcm = localHeightUnits === 'imperial'
        ? (!isNaN(parseInt(heightFt, 10)) ? ftInToCm(heightFt, heightIn) : null)
        : (parseFloat(heightCm) || null);
      const ageNum = parseInt(age, 10) || null;

      // Compute nutrition using nutritionEngine
      const safeWeightKg = (!isNaN(bwKg) && bwKg > 0) ? bwKg : 80;
      const safeHeightCm = hcm || 175;
      const safeAge = ageNum || 28;
      const nutritionTargets = calculateNutritionTargets({
        sex,
        ageYears: safeAge,
        heightCm: safeHeightCm,
        weightKg: safeWeightKg,
        activityLevel: daysToActivityLevel(daysPerWeek),
        goal: phaseToNutritionKey(trainingPhase),
        proteinApproach: 'optimised',
      });

      const goalPhase = phaseToCoachingKey(trainingPhase);
      const trainingFreqBucket = daysToFreqBucket(daysPerWeek);

      const merged = {
        ...(userProfile || {}),
        firstName: firstName.trim(),
        units: localUnits,
        bodyWeightUnits: localBWUnits,
        sex,
        age: safeAge,
        heightCm: safeHeightCm,
        weightKg: safeWeightKg,
        trainingGoal,
        trainingPhase,
        goalPhase,
        phaseStartedAt: Date.now(),
        stepsTarget: (userProfile || {}).stepsTarget ?? 8000,
        trainingFreq: trainingFreqBucket,
        trainingFreqBucket,
        daysPerWeek,
        experience,
        sessionLengthMinutes,
        equipment,
        planWeakPoints,
        recoveryRating,
      };

      if (user?.id) await saveLocalProfile(user.id, merged);

      if (user?.id && !isNaN(bwKg) && bwKg > 0) {
        await logBodyMetric(user.id, { weightKg: bwKg, loggedAt: Date.now() });
      }

      if (user?.id && (sex || hcm || ageNum)) {
        await saveUserBodyProfile(user.id, {
          sex,
          heightCm: hcm,
          dateOfBirth: ageNum ? new Date(new Date().getFullYear() - ageNum, 6, 1).toISOString().slice(0, 10) : null,
          primaryGoal: trainingGoal,
        }).catch(() => {});
      }

      // Save nutrition targets
      const nutritionData = {
        targetKcal: nutritionTargets.targetKcal,
        proteinG: nutritionTargets.proteinG,
        fatG: nutritionTargets.fatG,
        carbsG: nutritionTargets.carbsG,
        maintenanceKcal: nutritionTargets.maintenanceKcal,
      };
      await AsyncStorage.setItem('@volyume_nutrition_targets', JSON.stringify(nutritionData)).catch(() => {});
      if (user?.id) {
        await saveNutritionTargets(user.id, nutritionData).catch(() => {});
      }
    } catch (e) {
      Alert.alert('Something went wrong', e?.message ?? 'Please try again.');
      setBusy(false);
      return;
    }
    setBusy(false);
    setStep(8);
  }

  async function advanceFrom8() {
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
    setStep(9);
  }

  async function advanceFrom9() {
    const score = scoffAnswers.filter(a => a === true).length;
    if (user?.id) {
      await saveLocalProfile(user.id, { ...(userProfile || {}), scoffScore: score });
      await saveUserBodyProfile(user.id, { scoffScore: score }).catch(() => {});
    }
    if (score >= 2) {
      Alert.alert(
        'Before you continue',
        "Some of your answers suggest it may be worth speaking to your GP or a registered dietitian alongside using this app. We've set things up to focus on supporting your training rather than calorie restriction.",
        [{ text: 'Understood', onPress: () => setStep(10) }],
      );
    } else {
      setStep(10);
    }
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
    navigation.navigate('CoachBuilder', {
      firstRun: true,
      prefilled: {
        experience,
        daysPerWeek,
        sessionLengthMinutes,
        equipment,
        goal: trainingGoal,
        phase: trainingPhase,
        weakPoints: planWeakPoints,
        recoveryRating,
        nutritionCalculated: true,
      },
    });
  }

  async function skipAccount() {
    // Declining the account during Pro onboarding downgrades to Free —
    // Pro can't be verified without an account after beta. Setting tier to
    // 'free' re-renders RootNavigator into the Free first-run path.
    const { setTier } = useAppStore.getState();
    await setTier('free');
  }

  function togglePlanWeakPoint(muscle) {
    setPlanWeakPoints(prev => {
      if (prev.includes(muscle)) return prev.filter(m => m !== muscle);
      if (prev.length >= 3) {
        Alert.alert('Max 3 muscles', 'Deselect one before adding another.');
        return prev;
      }
      return [...prev, muscle];
    });
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
              <View style={styles.fieldLabelRow}>
                <Text style={[styles.fieldLabel, { marginBottom: 0 }]}>Height</Text>
                <View style={styles.segmentRowSmall}>
                  {[{ key: 'imperial', label: 'ft + in' }, { key: 'metric', label: 'cm' }].map(u => (
                    <TouchableOpacity
                      key={u.key}
                      style={[styles.segmentSmall, localHeightUnits === u.key && styles.segmentActive]}
                      onPress={() => setLocalHeightUnits(u.key)}
                    >
                      <Text style={[styles.segmentTextSmall, localHeightUnits === u.key && styles.segmentTextActive]}>
                        {u.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {localHeightUnits === 'imperial' ? (
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
              ) : (
                <TextInput
                  style={styles.input}
                  value={heightCm}
                  onChangeText={setHeightCm}
                  placeholder="e.g. 178 cm"
                  placeholderTextColor={colors.textDisabled}
                  keyboardType="decimal-pad"
                />
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.fieldLabel}>Body weight units</Text>
              <View style={styles.segmentRow}>
                {[
                  { key: 'st', label: 'Stone+lbs' },
                  { key: 'kg', label: 'kg' },
                  { key: 'lbs', label: 'lbs' },
                ].map(u => (
                  <TouchableOpacity
                    key={u.key}
                    style={[styles.segment, localBWUnits === u.key && styles.segmentActive]}
                    onPress={() => setLocalBWUnits(u.key)}
                  >
                    <Text style={[styles.segmentText, localBWUnits === u.key && styles.segmentTextActive]}>
                      {u.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.fieldLabel}>Current body weight</Text>
              <Text style={styles.fieldHint}>
                Used with your height and age to calculate your calorie targets. Update it daily from the home screen.
              </Text>
              {localBWUnits === 'st' ? (
                <View style={styles.heightImperialRow}>
                  <View style={{ flex: 2 }}>
                    <TextInput
                      style={styles.input}
                      value={bodyWeightSt}
                      onChangeText={setBodyWeightSt}
                      placeholder="12 st"
                      placeholderTextColor={colors.textDisabled}
                      keyboardType="number-pad"
                      maxLength={3}
                    />
                  </View>
                  <View style={{ flex: 3 }}>
                    <TextInput
                      style={styles.input}
                      value={bodyWeightStLbs}
                      onChangeText={setBodyWeightStLbs}
                      placeholder="0 lbs"
                      placeholderTextColor={colors.textDisabled}
                      keyboardType="decimal-pad"
                      maxLength={4}
                    />
                  </View>
                </View>
              ) : (
                <TextInput
                  style={styles.input}
                  value={bodyWeight}
                  onChangeText={setBodyWeight}
                  placeholder={localBWUnits === 'kg' ? 'e.g. 80 kg' : 'e.g. 176 lbs'}
                  placeholderTextColor={colors.textDisabled}
                  keyboardType="decimal-pad"
                />
              )}
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

  // ── Step 2 — What brings you here? ──────────────────────────────────────────

  if (step === 2) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <TouchableOpacity style={styles.backBtn} onPress={goBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>

          <Header
            title="What brings you here?"
            sub="Your experience shapes the complexity of your programme. Days per week determines your schedule."
          />

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

          <View style={styles.section}>
            <Text style={styles.fieldLabel}>How many days a week do you train?</Text>
            <Text style={styles.fieldHint}>Used to calculate your calorie needs accurately.</Text>
            <View style={styles.segmentRow}>
              {[3, 4, 5, 6].map(d => (
                <TouchableOpacity
                  key={d}
                  style={[styles.segment, daysPerWeek === d && styles.segmentActive]}
                  onPress={() => setDaysPerWeek(d)}
                >
                  <Text style={[styles.segmentText, daysPerWeek === d && styles.segmentTextActive]}>
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={advanceFrom2} activeOpacity={0.88}>
            <Text style={styles.primaryBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.background} />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Step 3 — Your training setup ─────────────────────────────────────────────

  if (step === 3) {
    const canContinue = !!equipment;

    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <TouchableOpacity style={styles.backBtn} onPress={goBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>

            <Header
              title="Your training setup."
              sub="These choices shape your programme directly. You can update them any time."
            />

            <View style={styles.section}>
              <Text style={styles.fieldLabel}>Session length</Text>
              <Text style={styles.fieldHint}>How long is your typical training session?</Text>
              <View style={styles.segmentRow}>
                {SESSION_LENGTH_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.segment, sessionLengthMinutes === opt.value && styles.segmentActive]}
                    onPress={() => setSessionLengthMinutes(opt.value)}
                  >
                    <Text style={[styles.segmentText, sessionLengthMinutes === opt.value && styles.segmentTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.fieldLabel}>Equipment</Text>
              <Text style={styles.fieldHint}>What do you have access to at your gym or training space?</Text>
              <View style={styles.goalList}>
                {EQUIPMENT_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.goalCard, equipment === opt.value && styles.goalCardActive]}
                    onPress={() => setEquipment(opt.value)}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.goalIconWrap, equipment === opt.value && styles.goalIconWrapActive]}>
                      <Ionicons
                        name={opt.icon}
                        size={20}
                        color={equipment === opt.value ? colors.primary : colors.textSecondary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.goalLabel, equipment === opt.value && styles.goalLabelActive]}>{opt.label}</Text>
                    </View>
                    {equipment === opt.value && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, !canContinue && styles.primaryBtnDisabled]}
              onPress={canContinue ? advanceFrom3 : undefined}
              disabled={!canContinue}
              activeOpacity={canContinue ? 0.88 : 1}
            >
              <Text style={styles.primaryBtnText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.background} />
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Step 4 — What are you training for? (Physique category) ─────────────────

  if (step === 4) {
    const allGroups = ['All', ...PHYSIQUE_GOAL_GROUPS];
    const filteredGoals = goalFilterGroup === 'All'
      ? PHYSIQUE_GOALS
      : PHYSIQUE_GOALS.filter(g => g.group === goalFilterGroup);

    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <TouchableOpacity style={styles.backBtn} onPress={goBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>

          <Header
            title="What are you training for?"
            sub="This shapes how your plan distributes volume across muscle groups."
          />

          {/* Category filter tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterTabScroll}
            contentContainerStyle={styles.filterTabScrollContent}
          >
            {allGroups.map(group => (
              <TouchableOpacity
                key={group}
                style={[styles.filterTab, goalFilterGroup === group && styles.filterTabActive]}
                onPress={() => setGoalFilterGroup(group)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterTabText, goalFilterGroup === group && styles.filterTabTextActive]}>
                  {group}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.goalList}>
            {filteredGoals.map(g => (
              <TouchableOpacity
                key={g.value}
                style={[styles.goalCard, trainingGoal === g.value && styles.goalCardActive]}
                onPress={() => {
                  setTrainingGoal(g.value);
                  if (!GOALS_WITH_WEAK_POINTS.includes(g.value)) {
                    setPlanWeakPoints([]);
                  }
                }}
                activeOpacity={0.85}
              >
                <View style={[styles.goalIconWrap, trainingGoal === g.value && styles.goalIconWrapActive]}>
                  <Ionicons
                    name={g.icon}
                    size={20}
                    color={trainingGoal === g.value ? colors.primary : colors.textSecondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.goalLabel, trainingGoal === g.value && styles.goalLabelActive]}>{g.label}</Text>
                  <Text style={styles.goalSub}>{g.subtitle}</Text>
                </View>
                {trainingGoal === g.value && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, !trainingGoal && styles.primaryBtnDisabled]}
            onPress={trainingGoal ? advanceFrom4 : undefined}
            disabled={!trainingGoal}
            activeOpacity={trainingGoal ? 0.88 : 1}
          >
            <Text style={styles.primaryBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.background} />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Step 5 — What phase are you in? ─────────────────────────────────────────

  if (step === 5) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <TouchableOpacity style={styles.backBtn} onPress={goBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>

          <Header
            title="What phase are you in?"
            sub="Your phase sets your calorie target and shapes how your plan is structured."
          />

          <View style={styles.goalList}>
            {TRAINING_PHASES.map(phase => (
              <TouchableOpacity
                key={phase.value}
                style={[styles.goalCard, trainingPhase === phase.value && styles.goalCardActive]}
                onPress={() => setTrainingPhase(phase.value)}
                activeOpacity={0.85}
              >
                <View style={[styles.goalIconWrap, trainingPhase === phase.value && styles.goalIconWrapActive]}>
                  <Ionicons
                    name={phase.icon}
                    size={20}
                    color={trainingPhase === phase.value ? colors.primary : colors.textSecondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.goalLabel, trainingPhase === phase.value && styles.goalLabelActive]}>{phase.label}</Text>
                  <Text style={styles.goalSub}>{phase.subtitle}</Text>
                  <Text style={styles.phaseDetail}>{phase.detail}</Text>
                </View>
                {trainingPhase === phase.value && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, !trainingPhase && styles.primaryBtnDisabled]}
            onPress={trainingPhase ? advanceFrom5 : undefined}
            disabled={!trainingPhase}
            activeOpacity={trainingPhase ? 0.88 : 1}
          >
            <Text style={styles.primaryBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.background} />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Step 6 — Weak points (conditional) ──────────────────────────────────────

  if (step === 6) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <TouchableOpacity style={styles.backBtn} onPress={goBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>

          <Header
            title="Weak points."
            sub="Pick up to 3 muscle groups you want to bring up. We'll bias your plan towards them."
          />

          <View style={styles.section}>
            <Text style={styles.fieldLabel}>Priority muscles <Text style={styles.optionalTag}>(optional, max 3)</Text></Text>
            <View style={styles.chipGrid}>
              {WEAK_POINT_MUSCLES.map(muscle => {
                const sel = planWeakPoints.includes(muscle);
                return (
                  <TouchableOpacity
                    key={muscle}
                    style={[styles.tagChip, sel && styles.tagChipSelected]}
                    onPress={() => togglePlanWeakPoint(muscle)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.tagChipText, sel && styles.tagChipTextSelected]}>{muscle}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={advanceFrom6} activeOpacity={0.88}>
            <Text style={styles.primaryBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.background} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} onPress={advanceFrom6}>
            <Text style={styles.skipBtnText}>Skip for now</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Step 7 — How's your recovery? ────────────────────────────────────────────

  if (step === 7) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <TouchableOpacity style={styles.backBtn} onPress={goBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>

          <Header
            title="How's your recovery?"
            sub="This affects how much volume your plan includes. Be honest; it adjusts to protect you."
          />

          <View style={styles.goalList}>
            {RECOVERY_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.goalCard, recoveryRating === opt.value && styles.goalCardActive]}
                onPress={() => setRecoveryRating(opt.value)}
                activeOpacity={0.85}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.goalLabel, recoveryRating === opt.value && styles.goalLabelActive]}>{opt.label}</Text>
                  <Text style={styles.goalSub}>{opt.sub}</Text>
                </View>
                {recoveryRating === opt.value && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, (!recoveryRating || busy) && styles.primaryBtnDisabled]}
            onPress={recoveryRating && !busy ? advanceFrom7 : undefined}
            disabled={!recoveryRating || busy}
            activeOpacity={recoveryRating && !busy ? 0.88 : 1}
          >
            {busy ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <>
                <Text style={styles.primaryBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.background} />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Step 8 — Stay on track (Notifications) ───────────────────────────────────

  if (step === 8) {
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

          <TouchableOpacity style={styles.primaryBtn} onPress={advanceFrom8} activeOpacity={0.88}>
            <Text style={styles.primaryBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.background} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} onPress={() => setStep(9)}>
            <Text style={styles.skipBtnText}>Skip reminders for now</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Step 9 — A quick check (Wellbeing / SCOFF) ───────────────────────────────

  if (step === 9) {
    const allAnswered = scoffAnswers.every(a => a !== null);
    const skipAll = () => {
      setScoffAnswers([false, false, false, false, false]);
      advanceFrom9();
    };

    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <TouchableOpacity style={styles.backBtn} onPress={scoffOptedIn ? () => setScoffOptedIn(false) : goBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>

          <Header
            title={scoffOptedIn ? 'A quick health check.' : 'A quick check.'}
            sub={scoffOptedIn
              ? 'Five short questions. No wrong answers. Your answers are private and stored only on this device.'
              : 'You can answer a short wellbeing check now, or skip it and get started.'}
          />

          {!scoffOptedIn ? (
            <>
              <View style={styles.scoffOfferCard}>
                <View style={styles.scoffOfferIcon}>
                  <Ionicons name="heart-outline" size={24} color={colors.primary} />
                </View>
                <Text style={styles.scoffOfferTitle}>Optional wellbeing check</Text>
                <Text style={styles.scoffOfferBody}>
                  Five questions about your relationship with food and eating. Helps us tailor the coaching approach if needed. Takes about 30 seconds.
                </Text>
                <TouchableOpacity style={styles.scoffOfferBtn} onPress={() => setScoffOptedIn(true)} activeOpacity={0.85}>
                  <Text style={styles.scoffOfferBtnText}>Take the check</Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={skipAll} activeOpacity={0.88}>
                <Text style={styles.primaryBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.background} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.scoffList}>
                {SCOFF_QUESTIONS.map((q, i) => (
                  <View key={i} style={styles.scoffItem}>
                    <Text style={styles.scoffQ}>{q}</Text>
                    <View style={styles.scoffBtns}>
                      <TouchableOpacity
                        style={[styles.scoffBtn, scoffAnswers[i] === true && styles.scoffBtnSelected]}
                        onPress={() => { const next = [...scoffAnswers]; next[i] = true; setScoffAnswers(next); }}
                      >
                        <Text style={[styles.scoffBtnText, scoffAnswers[i] === true && styles.scoffBtnTextSelected]}>Yes</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.scoffBtn, scoffAnswers[i] === false && styles.scoffBtnSelected]}
                        onPress={() => { const next = [...scoffAnswers]; next[i] = false; setScoffAnswers(next); }}
                      >
                        <Text style={[styles.scoffBtnText, scoffAnswers[i] === false && styles.scoffBtnTextSelected]}>No</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, !allAnswered && styles.primaryBtnDisabled]}
                onPress={allAnswered ? advanceFrom9 : undefined}
                activeOpacity={allAnswered ? 0.88 : 1}
              >
                <Text style={styles.primaryBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.background} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.skipBtn} onPress={skipAll}>
                <Text style={styles.skipBtnText}>Skip for now</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Step 10 — Almost there (Account) ─────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backBtn} onPress={goBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>

          <Header
            title="Almost there."
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

  // Inline label + small toggle on same row
  fieldLabelRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing.sm,
  },
  segmentRowSmall: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border,
    padding: 2,
  },
  segmentSmall: {
    paddingVertical: 4, paddingHorizontal: spacing.sm,
    borderRadius: radius.sm - 2, alignItems: 'center',
  },
  segmentTextSmall: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted },

  // Segment control (units / days / session length)
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

  // Phase detail line (smaller, muted)
  phaseDetail: {
    fontSize: fontSize.xs, color: colors.textDisabled,
    lineHeight: 16, marginTop: 3, fontStyle: 'italic',
  },

  // Filter tabs (step 4 physique category)
  filterTabScroll: { flexGrow: 0, marginBottom: spacing.md },
  filterTabScrollContent: { gap: spacing.xs, paddingRight: spacing.sm },
  filterTab: {
    paddingHorizontal: spacing.md, paddingVertical: 7,
    borderRadius: radius.full, backgroundColor: colors.surface2,
    borderWidth: 1, borderColor: colors.border,
  },
  filterTabActive: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primary,
  },
  filterTabText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  filterTabTextActive: { color: colors.primary, fontWeight: fontWeight.bold },

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
  primaryBtnDisabled: {
    opacity: 0.4,
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

  // SCOFF opt-in offer card
  scoffOfferCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.primary + '30',
    padding: spacing.xl, gap: spacing.md, marginBottom: spacing.xl, alignItems: 'center',
  },
  scoffOfferIcon: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.primary + '40',
  },
  scoffOfferTitle: {
    fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary, textAlign: 'center',
  },
  scoffOfferBody: {
    fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20, textAlign: 'center',
  },
  scoffOfferBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.md, paddingHorizontal: spacing.xl,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary + '50',
    backgroundColor: colors.primaryBg,
  },
  scoffOfferBtnText: {
    fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary,
  },

  // SCOFF wellbeing check (step 9)
  scoffList: {
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  scoffItem: {
    gap: spacing.sm,
  },
  scoffQ: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  scoffBtns: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  scoffBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  scoffBtnSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryBg,
  },
  scoffBtnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  scoffBtnTextSelected: {
    color: colors.primary,
  },
  scoffNote: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 18,
  },

  // Weak points chip grid
  optionalTag: {
    fontWeight: fontWeight.regular ?? '400',
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tagChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full ?? 99,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2 ?? colors.surface,
  },
  tagChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryBg,
  },
  tagChipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  tagChipTextSelected: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
});
