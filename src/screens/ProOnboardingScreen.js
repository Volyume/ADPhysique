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
import {
  logBodyMetric, saveNutritionTargets, saveUserBodyProfile, migrateLocalUserId,
  createProgramme, createRoutine, addExerciseToRoutine, getAllExercises, activatePlanWithBlock,
} from '../lib/database';
import { stoneLbsToKg, ftInToCm, parseBodyWeightToKg } from '../lib/units';
import { signUpWithEmail, signInWithEmail } from '../lib/supabase';
import { bulkUploadLocalData, syncProfile } from '../lib/sync';
import { generatePlan } from '../lib/planEngine';
import {
  requestNotificationPermissions,
  scheduleMorningWeightNotification,
  scheduleCheckinReminder,
} from '../lib/notifications';
import {
  PHYSIQUE_GOALS,
  TRAINING_PHASES,
  phaseToNutritionKey,
  phaseToCoachingKey,
  daysToActivityLevel,
} from '../lib/coachingGoals';
import { calculateNutritionTargets } from '../lib/nutritionEngine';

const NOTIF_PREFS_KEY = '@volyume_notification_prefs';

const TOTAL_STEPS = 4;

// Default days per week — used for nutrition calc without asking the user.
const DEFAULT_DAYS_PER_WEEK = 4;

function daysToFreqBucket(daysPerWeek) {
  if (daysPerWeek <= 3) return '2-3';
  if (daysPerWeek <= 5) return '4-5';
  return '6+';
}

const EXPERIENCE_OPTIONS = [
  { value: 'beginner',     label: 'Beginner',     sub: 'Less than 18 months of consistent training' },
  { value: 'intermediate', label: 'Intermediate', sub: '18 months to 3 years of consistent training' },
  { value: 'advanced',     label: 'Advanced',     sub: '3 to 5 years, consistently adding weight over time' },
  { value: 'competitive',  label: 'Competitive',  sub: '5+ years, training for physique or performance' },
];

const SESSION_LENGTH_OPTIONS = [
  { label: '45 min', value: 45 },
  { label: '60 min', value: 60 },
  { label: '75 min', value: 75 },
  { label: '90 min', value: 90 },
];

const EQUIPMENT_OPTIONS = [
  { value: 'full_gym',        label: 'Full Gym',          sub: 'Barbells, cables, machines, dumbbells' },
  { value: 'machines_cables', label: 'Machines & Cables', sub: 'No free barbells' },
  { value: 'dumbbells_only',  label: 'Dumbbells Only',    sub: 'Adjustable or fixed dumbbells' },
  { value: 'barbell_plates',  label: 'Barbell & Plates',  sub: 'Power rack or squat stand setup' },
  { value: 'home_gym',        label: 'Home Gym',          sub: 'Mixed equipment at home' },
  { value: 'bodyweight',      label: 'Bodyweight',        sub: 'No equipment needed' },
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

// Inline dropdown component — expands in place, no modal needed.
function Dropdown({ label, hint, value, options, onChange, placeholder = 'Select...' }) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);
  return (
    <View style={styles.dropdownWrap}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
      <TouchableOpacity
        style={[styles.dropdownTrigger, value && styles.dropdownTriggerFilled, open && styles.dropdownTriggerOpen]}
        onPress={() => setOpen(v => !v)}
        activeOpacity={0.8}
      >
        <Text style={[styles.dropdownValue, !value && styles.dropdownPlaceholder]}>
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={value ? colors.primary : colors.textMuted} />
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdownList}>
          {options.map((opt, i) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.dropdownItem,
                value === opt.value && styles.dropdownItemActive,
                i < options.length - 1 && styles.dropdownItemBorder,
              ]}
              onPress={() => { onChange(opt.value); setOpen(false); }}
              activeOpacity={0.75}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.dropdownItemLabel, value === opt.value && styles.dropdownItemLabelActive]}>
                  {opt.label}
                </Text>
                {opt.sub ? <Text style={styles.dropdownItemSub}>{opt.sub}</Text> : null}
              </View>
              {value === opt.value && <Ionicons name="checkmark" size={16} color={colors.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export default function ProOnboardingScreen({ navigation }) {
  const {
    user, units, setUnits, bodyWeightUnits, setBodyWeightUnits, userProfile, saveLocalProfile,
  } = useAppStore();

  const [step, setStep] = useState(1);

  // Step 1 — profile
  const [firstName, setFirstName] = useState(userProfile?.firstName || '');
  const localUnits = 'kg';
  const [localBWUnits, setLocalBWUnits] = useState(bodyWeightUnits || 'st');
  const [bodyWeightSt, setBodyWeightSt] = useState('');
  const [bodyWeightStLbs, setBodyWeightStLbs] = useState('0');
  const [bodyWeight, setBodyWeight] = useState('');
  const [localHeightUnits, setLocalHeightUnits] = useState('imperial');
  const [sex, setSex] = useState('male');
  const [age, setAge] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [heightFt, setHeightFt] = useState('5');
  const [heightIn, setHeightIn] = useState('9');

  // Step 2 — training setup (all dropdowns / segments)
  const [experience, setExperience] = useState(null);
  const [sessionLengthMinutes, setSessionLengthMinutes] = useState(60);
  const [equipment, setEquipment] = useState(null);
  const [trainingGoal, setTrainingGoal] = useState(null);
  const [trainingPhase, setTrainingPhase] = useState(null);

  // Step 4 — recovery + reminders
  const [recoveryRating, setRecoveryRating] = useState(null);
  const [morningEnabled, setMorningEnabled] = useState(true);
  const [morningHour, setMorningHour] = useState(7);
  const [checkinEnabled, setCheckinEnabled] = useState(true);
  const [checkinDay, setCheckinDay] = useState(0);

  // Step 1 — account
  const [authMode, setAuthMode] = useState('signup'); // 'signup' | 'signin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);

  const [busy, setBusy] = useState(false);

  const nameRef = useRef(null);
  useEffect(() => {
    if (step === 2) {
      const t = setTimeout(() => nameRef.current?.focus(), 350);
      return () => clearTimeout(t);
    }
  }, [step]);


  // ── Step transition helpers ──────────────────────────────────────────────────

  function goBack() {
    if (step === 1) return;
    if (step === 2 && accountCreated) return; // can't go back past completed registration
    setStep(s => s - 1);
  }

  async function advanceFrom1() {
    if (accountCreated) { setStep(2); return; }
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Enter your email and a password to continue.');
      return;
    }
    if (authMode === 'signup' && password.length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      const fn = authMode === 'signup' ? signUpWithEmail : signInWithEmail;
      const { data, error } = await fn(email.trim(), password);
      if (error) {
        Alert.alert(authMode === 'signup' ? 'Sign-up error' : 'Sign-in error', error.message);
        setBusy(false);
        return;
      }
      if (authMode === 'signup' && data.user && !data.session) {
        Alert.alert(
          'Check your email',
          'We sent a confirmation link. Confirm it, sign in here, then continue.',
        );
        setAuthMode('signin');
        setBusy(false);
        return;
      }
      if (data.session) {
        const supabaseUserId = data.session.user.id;
        const localUserId = user?.id;
        await migrateLocalUserId(localUserId, supabaseUserId).catch(() => {});
        syncProfile(supabaseUserId, userProfile, 'pro', { isBetaTester: true }).catch(() => {});
        if (authMode === 'signup') {
          bulkUploadLocalData(supabaseUserId, localUserId).catch(() => {});
        }
        setAccountCreated(true);
        setBusy(false);
        setStep(2);
        return;
      }
    } catch (_) {
      Alert.alert('Something went wrong', 'Please try again.');
    }
    setBusy(false);
  }

  function advanceFrom2() {
    if (!firstName.trim()) {
      Alert.alert('Your name', 'Please enter your first name to continue.');
      return;
    }
    setStep(3);
  }

  function advanceFrom3() {
    if (!experience || !sessionLengthMinutes || !equipment || !trainingGoal || !trainingPhase) {
      Alert.alert('Complete all fields', 'Please fill out your training profile to continue.');
      return;
    }
    setStep(4);
  }

  async function advanceFrom4() {
    if (!recoveryRating) {
      Alert.alert('Recovery rating', 'Please select your recovery level to continue.');
      return;
    }

    setBusy(true);
    try {
      if (morningEnabled || checkinEnabled) {
        const status = await requestNotificationPermissions();
        if (status === 'granted') {
          const prefs = {};
          if (morningEnabled) {
            await scheduleMorningWeightNotification(morningHour, 0);
            prefs.morning = { hour: morningHour, minute: 0, enabled: true };
          }
          if (checkinEnabled) {
            await scheduleCheckinReminder(checkinDay, 12, 0);
            prefs.checkin = { weekday: checkinDay, hour: 12, minute: 0, enabled: true };
          }
          await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs)).catch(() => {});
        }
      }

      if (setUnits) setUnits(localUnits);
      if (setBodyWeightUnits) setBodyWeightUnits(localBWUnits);

      const bwKg = localBWUnits === 'st'
        ? stoneLbsToKg(bodyWeightSt, bodyWeightStLbs)
        : parseBodyWeightToKg(bodyWeight, localBWUnits);
      const hcm = localHeightUnits === 'imperial'
        ? (!isNaN(parseInt(heightFt, 10)) ? ftInToCm(heightFt, heightIn) : null)
        : (parseFloat(heightCm) || null);
      const ageNum = parseInt(age, 10) || null;

      const safeWeightKg = (!isNaN(bwKg) && bwKg > 0) ? bwKg : 80;
      const safeHeightCm = hcm || 175;
      const safeAge = ageNum || 28;
      const nutritionTargets = calculateNutritionTargets({
        sex,
        ageYears: safeAge,
        heightCm: safeHeightCm,
        weightKg: safeWeightKg,
        activityLevel: daysToActivityLevel(DEFAULT_DAYS_PER_WEEK),
        goal: phaseToNutritionKey(trainingPhase),
        trainingGoal,
      });

      const goalPhase = phaseToCoachingKey(trainingPhase);
      const trainingFreqBucket = daysToFreqBucket(DEFAULT_DAYS_PER_WEEK);

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
        daysPerWeek: DEFAULT_DAYS_PER_WEEK,
        experience,
        sessionLengthMinutes,
        equipment,
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

      // Auto-generate the training plan so the user lands on a ready-to-train
      // home screen rather than a "build me a plan" empty state.
      if (user?.id) {
        try {
          const planInputs = {
            experience,
            daysPerWeek: DEFAULT_DAYS_PER_WEEK,
            sessionLengthMinutes,
            equipment,
            goal: trainingGoal,
            phase: trainingPhase,
            weakPoints: [],
            recoveryRating,
            nutritionPhase: phaseToNutritionKey(trainingPhase),
          };
          const plan = generatePlan(planInputs);
          if (plan?.workouts?.length > 0) {
            const planNameFinal = plan.name ?? 'Your plan';
            const prog = await createProgramme(user.id, planNameFinal, plan.description ?? '', 0);
            const allExercises = await getAllExercises();
            const exerciseMap = {};
            for (const ex of allExercises) exerciseMap[ex.name.toLowerCase()] = ex;
            for (const workout of plan.workouts) {
              const routine = await createRoutine(
                user.id, workout.name, null, plan.splitType, 0, null, prog.id,
              );
              for (let i = 0; i < workout.exercises.length; i++) {
                const ex = workout.exercises[i];
                const dbEx = exerciseMap[ex.exerciseName.toLowerCase()];
                if (!dbEx) continue;
                await addExerciseToRoutine(
                  routine.id, dbEx.id, i, ex.repMin, ex.repMax, ex.notes ?? null, ex.sets,
                );
              }
            }
            await activatePlanWithBlock(user.id, prog.id, planNameFinal);
          }
        } catch (planErr) {
          console.warn('Auto plan generation failed:', planErr?.message);
        }
      }
    } catch (e) {
      Alert.alert('Something went wrong', e?.message ?? 'Please try again.');
      setBusy(false);
      return;
    }
    setBusy(false);
    navigation.navigate('ProSetupComplete');
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

  // ── Step 1 — Create account ──────────────────────────────────────────────────

  if (step === 1) {
    return (
      <SafeAreaView key="step-1" style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Header
              title={authMode === 'signup' ? 'Create your account.' : 'Sign in to continue.'}
              sub="Pro needs an account so your plan, weight history, and coaching adjustments are backed up and sync across devices."
            />

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
                  textContentType="emailAddress"
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
                  placeholder={authMode === 'signup' ? 'At least 8 characters' : 'Your password'}
                  placeholderTextColor={colors.textDisabled}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete={authMode === 'signup' ? 'new-password' : 'password'}
                  textContentType={authMode === 'signup' ? 'newPassword' : 'password'}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(v => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={19} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, busy && styles.primaryBtnDisabled]}
              onPress={busy ? undefined : advanceFrom1}
              disabled={busy}
              activeOpacity={busy ? 1 : 0.88}
            >
              {busy ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>
                    {authMode === 'signup' ? 'Create account and continue' : 'Sign in and continue'}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.background} />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchAuthBtn}
              onPress={() => setAuthMode(m => (m === 'signup' ? 'signin' : 'signup'))}
            >
              <Text style={styles.switchAuthText}>
                {authMode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
                <Text style={styles.switchAuthAction}>
                  {authMode === 'signup' ? 'Sign in' : 'Create one'}
                </Text>
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Step 2 — Profile ─────────────────────────────────────────────────────────

  if (step === 2) {
    return (
      <SafeAreaView key="step-2" style={styles.safe}>
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
                autoComplete="off"
                textContentType="none"
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
                autoComplete="off"
                textContentType="none"
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
                      autoComplete="off"
                      textContentType="none"
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
                      autoComplete="off"
                      textContentType="none"
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
                  autoComplete="off"
                  textContentType="none"
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
                      autoComplete="off"
                      textContentType="none"
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
                      autoComplete="off"
                      textContentType="none"
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
                  autoComplete="off"
                  textContentType="none"
                />
              )}
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={advanceFrom2} activeOpacity={0.88}>
              <Text style={styles.primaryBtnText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.background} />
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Step 2 — Training setup ──────────────────────────────────────────────────

  if (step === 3) {
    const goalOptions = PHYSIQUE_GOALS.map(g => ({ value: g.value, label: g.label, sub: g.subtitle }));
    const phaseOptions = TRAINING_PHASES.map(p => ({ value: p.value, label: p.label, sub: p.subtitle }));
    const canContinue = !!experience && !!sessionLengthMinutes && !!equipment && !!trainingGoal && !!trainingPhase;

    return (
      <SafeAreaView key="step-3" style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <TouchableOpacity style={styles.backBtn} onPress={goBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>

            <Header
              title="Your training profile."
              sub="Takes about 30 seconds. This shapes your entire programme."
            />

            <Dropdown
              label="Training experience"
              hint="Shapes volume and exercise complexity."
              value={experience}
              options={EXPERIENCE_OPTIONS}
              onChange={setExperience}
              placeholder="How long have you been training?"
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

            <Dropdown
              label="Equipment"
              hint="What do you have access to?"
              value={equipment}
              options={EQUIPMENT_OPTIONS}
              onChange={setEquipment}
              placeholder="Select your equipment"
            />

            <Dropdown
              label="What are you training for?"
              hint="Shapes how volume is distributed across muscle groups."
              value={trainingGoal}
              options={goalOptions}
              onChange={setTrainingGoal}
              placeholder="Select your goal"
            />

            <Dropdown
              label="What is your goal?"
              hint="Sets your calorie target and plan structure."
              value={trainingPhase}
              options={phaseOptions}
              onChange={setTrainingPhase}
              placeholder="Select what fits you best"
            />

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

  // ── Step 3 — Recovery & reminders ───────────────────────────────────────────

  if (step === 4) {
    const canContinue = !!recoveryRating;

    return (
      <SafeAreaView key="step-4" style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <TouchableOpacity style={styles.backBtn} onPress={goBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>

          <Header
            title="Recovery & reminders."
            sub="Recovery affects your plan volume. Reminders keep coaching consistent."
          />

          <Dropdown
            label="How's your recovery?"
            hint="This affects how much volume your plan includes. Be honest — it adjusts to protect you."
            value={recoveryRating}
            options={RECOVERY_OPTIONS}
            onChange={setRecoveryRating}
            placeholder="Select your recovery level"
          />

          <View style={styles.section}>
            <Text style={styles.fieldLabel}>Coaching reminders</Text>
            <Text style={styles.fieldHint}>Optional notifications to keep you on track. Change them any time in Settings.</Text>

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

            <View style={styles.notifSection}>
              <View style={styles.notifHeader}>
                <View style={styles.notifIconWrap}>
                  <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifTitle}>Weekly check-in reminder</Text>
                  <Text style={styles.notifSub}>
                    Once a week you review how training went and set next week up. Pick the day that works for you.
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
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, (!canContinue || busy) && styles.primaryBtnDisabled]}
            onPress={canContinue && !busy ? advanceFrom4 : undefined}
            disabled={!canContinue || busy}
            activeOpacity={canContinue && !busy ? 0.88 : 1}
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

  return null;
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

  progressRow: { flexDirection: 'row', gap: 4, marginBottom: spacing.sm },
  progressSegment: { flex: 1, height: 3, borderRadius: 2 },
  progressDone: { backgroundColor: colors.primary },
  progressActive: { backgroundColor: colors.primary + 'CC' },
  progressPending: { backgroundColor: colors.border },

  stepCount: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: spacing.xs },
  stepTitle: {
    fontSize: fontSize.xxl, fontWeight: fontWeight.bold,
    color: colors.textPrimary, marginBottom: spacing.sm, lineHeight: 30,
  },
  stepSub: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },

  // Back button
  backBtn: {
    flexDirection: 'row', alignItems: 'center',
    gap: 4, marginBottom: spacing.lg, alignSelf: 'flex-start',
  },
  backBtnText: { fontSize: fontSize.sm, color: colors.textSecondary },

  // Sections / inputs
  section: { marginBottom: spacing.xl },
  fieldLabel: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
    color: colors.textMuted, letterSpacing: 0.3, marginBottom: spacing.sm,
  },
  fieldHint: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 18, marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 2,
    fontSize: fontSize.md, color: colors.textPrimary,
  },
  fieldWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border,
  },
  fieldWrapFocused: { borderColor: colors.primary + '80' },
  fieldInput: {
    flex: 1, paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    fontSize: fontSize.md, color: colors.textPrimary,
  },
  eyeBtn: {
    position: 'absolute', right: spacing.md,
    top: 0, bottom: 0, justifyContent: 'center', paddingHorizontal: 4,
  },

  heightImperialRow: { flexDirection: 'row', gap: spacing.md },

  fieldLabelRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing.sm,
  },
  segmentRowSmall: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, padding: 2,
  },
  segmentSmall: {
    paddingVertical: 4, paddingHorizontal: spacing.sm,
    borderRadius: radius.sm - 2, alignItems: 'center',
  },
  segmentTextSmall: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted },

  segmentRow: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, padding: 3,
  },
  segment: {
    flex: 1, paddingVertical: spacing.sm + 2,
    alignItems: 'center', borderRadius: radius.sm - 2,
  },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMuted },
  segmentTextActive: { color: colors.background },

  // Dropdown
  dropdownWrap: { marginBottom: spacing.xl },
  dropdownTrigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 2,
  },
  dropdownTriggerFilled: { borderColor: colors.primary + '60' },
  dropdownTriggerOpen: { borderColor: colors.primary, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  dropdownValue: { fontSize: fontSize.md, color: colors.textPrimary, flex: 1, marginRight: spacing.sm },
  dropdownPlaceholder: { color: colors.textDisabled },
  dropdownList: {
    backgroundColor: colors.surface, borderWidth: 1.5,
    borderColor: colors.primary, borderTopWidth: 0,
    borderBottomLeftRadius: radius.md, borderBottomRightRadius: radius.md,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  dropdownItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  dropdownItemActive: { backgroundColor: colors.primaryBg },
  dropdownItemLabel: { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: 1 },
  dropdownItemLabelActive: { color: colors.textPrimary, fontWeight: fontWeight.semibold },
  dropdownItemSub: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 16 },

  // Notifications
  notifSection: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.md,
  },
  notifHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  notifIconWrap: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  notifTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary, marginBottom: 2 },
  notifSub: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 17 },

  toggle: {
    width: 44, height: 26, borderRadius: 13,
    backgroundColor: colors.surface3, justifyContent: 'center', paddingHorizontal: 3,
  },
  toggleOn: { backgroundColor: colors.primary },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.textMuted },
  toggleThumbOn: { backgroundColor: colors.background, alignSelf: 'flex-end' },

  timeRow: { marginTop: spacing.md },
  timeLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: spacing.sm, letterSpacing: 0.5 },
  hourScroll: { flexGrow: 0 },
  hourScrollContent: { gap: spacing.xs, paddingRight: spacing.sm },
  hourChip: {
    paddingHorizontal: spacing.md, paddingVertical: 7,
    borderRadius: radius.full, backgroundColor: colors.surface2,
    borderWidth: 1, borderColor: colors.border,
  },
  hourChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  hourChipText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium },
  hourChipTextActive: { color: colors.background, fontWeight: fontWeight.bold },

  // Beta offer card
  offerCard: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    borderWidth: 2, borderColor: colors.primary,
    padding: spacing.lg, marginBottom: spacing.xl,
    shadowColor: colors.primary, shadowOpacity: 0.15,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  offerBadgeRow: { marginBottom: spacing.sm },
  offerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start', backgroundColor: colors.primary,
    borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3,
  },
  offerBadgeText: { fontSize: 9, fontWeight: fontWeight.black, color: colors.background, letterSpacing: 0.8 },
  offerHeadline: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary, marginBottom: spacing.sm, lineHeight: 26 },
  offerBody: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.md },
  offerPerks: { gap: spacing.xs },
  offerPerk: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  offerPerkText: { fontSize: fontSize.sm, color: colors.textSecondary },

  // Buttons
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.primary,
    borderRadius: radius.lg, paddingVertical: spacing.lg + 2, marginBottom: spacing.md,
  },
  btnDisabled: { opacity: 0.55 },
  primaryBtnText: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.background },
  primaryBtnDisabled: { opacity: 0.4 },
  switchAuthBtn: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.sm },
  switchAuthText: { fontSize: fontSize.sm, color: colors.textMuted },
  switchAuthAction: { color: colors.primary, fontWeight: fontWeight.semibold },
  skipBtn: { alignItems: 'center', paddingVertical: spacing.md },
  skipBtnText: { fontSize: fontSize.sm, color: colors.textMuted },
  skipNote: {
    textAlign: 'center', fontSize: fontSize.xs,
    color: colors.textDisabled, lineHeight: 18, marginTop: spacing.xs,
  },
});
