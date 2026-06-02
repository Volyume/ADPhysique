import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha } from '../styles/theme';
import { VolyumeIcon } from '../components/BrandMark';
import OptionCard from '../components/OptionCard';
import SegmentedControl from '../components/SegmentedControl';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import {
  logBodyMetric, logMorningWeight, saveNutritionTargets, saveUserBodyProfile,
} from '../lib/database';
import { stoneLbsToKg, ftInToCm, parseBodyWeightToKg } from '../lib/units';
import { signUpWithEmail, signInWithEmail, signInWithGoogle, signInWithApple } from '../lib/supabase';
import { bulkUploadLocalData, syncProfile, pullFromCloud } from '../lib/sync';
import { generateAndSavePlan } from '../lib/planAutoGen';
import {
  requestNotificationPermissions,
  scheduleMorningWeightNotification,
  scheduleCheckinReminder,
} from '../lib/notifications';
import {
  PHYSIQUE_GOALS,
  TRAINING_PHASES,
  GOALS_WITH_WEAK_POINTS,
  weakPointSetForGoal,
  phaseToNutritionKey,
  phaseToCoachingKey,
  daysToActivityLevel,
} from '../lib/coachingGoals';
import { calculateNutritionTargets, PROTEIN_APPROACHES, ADVANCED_PROTEIN_GOALS } from '../lib/nutritionEngine';

const NOTIF_PREFS_KEY = '@volyume_notification_prefs';

// Plain-language one-liners for the protein tiers, kept short for the
// onboarding collapsible. The engine's own descriptions read more technical;
// these mirror the wording the plan builder uses so the two surfaces match.
const PROTEIN_SHORT = {
  standard:  'Enough for consistent training. Easy to sustain day to day.',
  optimised: 'The proven target for serious training. Best for most people.',
  advanced:  'Upper end for competitive athletes and harder cuts.',
};

const TOTAL_STEPS = 4;

// Default days per week, used for nutrition calc without asking the user.
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

const DAYS_PER_WEEK_OPTIONS = [3, 4, 5, 6];

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

// Inline dropdown component, expands in place, no modal needed.
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
  } = useAppStore(useShallow(s => ({
    user: s.user,
    units: s.units,
    setUnits: s.setUnits,
    bodyWeightUnits: s.bodyWeightUnits,
    setBodyWeightUnits: s.setBodyWeightUnits,
    userProfile: s.userProfile,
    saveLocalProfile: s.saveLocalProfile,
  })));

  const [step, setStep] = useState(1);

  // Step 1, profile
  const [firstName, setFirstName] = useState(userProfile?.firstName || '');
  const localUnits = 'kg';
  const [localBWUnits, setLocalBWUnits] = useState(bodyWeightUnits || 'st');
  // Sensible defaults so the field is never blank, leaving it empty
  // previously let a user advance with no weight set, and the downstream
  // safeWeightKg fallback (80kg) silently masked the omission. Other
  // fields (heightFt=5, heightIn=9, sessionLengthMinutes=60, sex=male,
  // trainingGoal=general) already prefill the same way.
  const [bodyWeightSt, setBodyWeightSt] = useState('12');
  const [bodyWeightStLbs, setBodyWeightStLbs] = useState('0');
  const [bodyWeight, setBodyWeight] = useState('80');
  const [localHeightUnits, setLocalHeightUnits] = useState('imperial');
  const [sex, setSex] = useState('male');
  const [age, setAge] = useState('30');
  const [heightCm, setHeightCm] = useState('175');
  const [heightFt, setHeightFt] = useState('5');
  const [heightIn, setHeightIn] = useState('9');

  // Step 2, training setup (all dropdowns / segments)
  const [experience, setExperience] = useState(null);
  const [sessionLengthMinutes, setSessionLengthMinutes] = useState(60);
  const [daysPerWeek, setDaysPerWeek] = useState(DEFAULT_DAYS_PER_WEEK);
  const [equipment, setEquipment] = useState(null);
  // Defaults to 'general' (not competing). Users tap into the optional
  // "Competing in a category?" dropdown to pick a physique category.
  const [trainingGoal, setTrainingGoal] = useState('general');
  const [trainingPhase, setTrainingPhase] = useState(null);
  // Weak points the user wants to bring up (UI labels, max 3). Division-scoped:
  // the options shown depend on trainingGoal. Passed into plan generation, which
  // biases volume toward these muscles within the recovery envelope.
  const [planWeakPoints, setPlanWeakPoints] = useState([]);

  // Protein target. Left null, the engine picks the right approach for the
  // goal (advanced for physique competitors, optimised for everyone else),
  // which is exactly what we want by default. The user only overrides it by
  // opening the collapsible and choosing, so the default path never shifts
  // anyone's targets away from the engine's recommendation.
  const [proteinOverride, setProteinOverride] = useState(null);
  const [proteinOpen, setProteinOpen] = useState(false);
  const suggestedApproach = ADVANCED_PROTEIN_GOALS.includes(trainingGoal) ? 'advanced' : 'optimised';
  const proteinApproach = proteinOverride ?? suggestedApproach;

  // Changing division re-scopes the weak-point options, so drop any selected
  // muscle that the new division does not offer.
  function changeGoal(nextGoal) {
    setTrainingGoal(nextGoal);
    const allowed = weakPointSetForGoal(nextGoal);
    setPlanWeakPoints(prev => prev.filter(m => allowed.includes(m)));
  }

  function toggleWeakPoint(muscle) {
    setPlanWeakPoints(prev => {
      if (prev.includes(muscle)) return prev.filter(m => m !== muscle);
      if (prev.length >= 3) return prev; // cap at 3; chips show the current pick
      return [...prev, muscle];
    });
  }

  // Step 4, recovery + reminders
  const [recoveryRating, setRecoveryRating] = useState(null);
  const [morningEnabled, setMorningEnabled] = useState(true);
  const [morningHour, setMorningHour] = useState(7);
  const [checkinEnabled, setCheckinEnabled] = useState(true);
  const [checkinDay, setCheckinDay] = useState(0);
  // Daily step target. On by default: the coach uses steps as its first,
  // gentlest lever. The user can opt out here or later in Settings.
  const [stepsTargetOn, setStepsTargetOn] = useState(true);

  // Step 1, account
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

  // Auto-advance past Step 1 if the user is already authenticated when the
  // screen mounts. Happens after OAuth: SIGNED_IN flips isAuthLoading true,
  // RootNavigator's splash gate unmounts ProOnboardingStack, the cloud
  // restore finishes, the stack remounts, and `step` resets to 1, dropping
  // the user back on "Create your account" even though they're signed in.
  // Without this, the OAuth flow loops: Step 1 → auth → splash → Step 1.
  // Local-only users (isLocal: true) still see Step 1 because they haven't
  // created a cloud account yet.
  useEffect(() => {
    if (step === 1 && user && !user.isLocal) {
      // Don't auto-advance if userProfile is already set, that means
      // restoreSessionFromCloud hydrated an existing account and the
      // navigator is about to unmount us. Auto-advancing here would
      // briefly flash Step 2 before the navigator catches up.
      if (userProfile) return;
      setAccountCreated(true);
      setStep(2);
    }
  }, [step, user, userProfile]);


  // ── Step transition helpers ──────────────────────────────────────────────────

  function goBack() {
    if (step === 1) return;
    if (step === 2 && accountCreated) return; // can't go back past completed registration
    setStep(s => s - 1);
  }

  async function handleOAuthOnboarding(provider) {
    // OAuth happens inside the in-app browser sheet, the Supabase session
    // callback is handled by App.js's deep-link handler. We just need to
    // wait for the result, then advance onboarding if successful.
    const { logInfo, logError } = require('../lib/errorLog');
    logInfo('ProOnboarding.oauth.begin', `provider=${provider}`);
    setBusy(true);
    try {
      const fn = provider === 'google' ? signInWithGoogle : signInWithApple;
      const result = await fn();
      if (result?.error) {
        logError('ProOnboarding.oauth.providerError', result.error, { provider });
        Alert.alert('Sign-in failed', result.error.message);
        return;
      }
      if (result?.cancelled) {
        logInfo('ProOnboarding.oauth.cancelled', `provider=${provider}`);
        return;
      }
      // OAuth doesn't pre-fill a userProfile from the provider's metadata
      // here, the onboarding wizard collects the training fields in the
      // next steps. Mark the auth step complete and advance.
      logInfo('ProOnboarding.oauth.success', `provider=${provider}, advancing to step 2`);
      setAccountCreated(true);
      setStep(2);
    } catch (e) {
      logError('ProOnboarding.oauth.threw', e, { provider });
    } finally {
      setBusy(false);
    }
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
        // Seed the per-uid first-run flag so the eventual sign-in routes to
        // the wizard, not MainTabs, no matter how long email confirmation
        // takes (A2-021).
        useAppStore.getState().noteSignupPendingOnboarding(data.user.id);
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
        const { logError } = require('../lib/errorLog');
        // No anonymous-to-account migration: per
        // IDENTITY_AND_OWNERSHIP_LOCKED.md rule 5 the function is
        // deleted. Anonymous mode entry point is removed (rule 1
        // + anti-patterns) so by spec there is no anonymous local
        // row set to re-key here.
        syncProfile(supabaseUserId, userProfile, 'pro', { isBetaTester: true })
          .catch(e => logError('ProOnboarding.syncProfile', e, { supabaseUserId }));
        if (authMode === 'signup') {
          // New account: push local pre-signup history up.
          bulkUploadLocalData(supabaseUserId, localUserId)
            .catch(e => logError('ProOnboarding.bulkUploadLocalData.signup', e, { supabaseUserId }));
        } else {
          // Existing account signing in via Pro onboarding: pull cloud
          // state down. Local pre-signin data stays untouched (the
          // sign-out wipe + cross-user safety net already guarantee
          // it belongs to this account).
          pullFromCloud(supabaseUserId)
            .catch(e => logError('ProOnboarding.pullFromCloud', e, { supabaseUserId }));
        }
        setAccountCreated(true);
        setBusy(false);
        setStep(2);
        return;
      }
    } catch (_) {
      Alert.alert('Something went wrong', 'Try again.');
    }
    setBusy(false);
  }

  function advanceFrom2() {
    if (!firstName.trim()) {
      Alert.alert('Your name', 'Please enter your first name to continue.');
      return;
    }
    // Validate body weight, used downstream to compute calorie / protein
    // targets and to seed the body-metrics log. A silent 80kg fallback
    // would produce wrong macros, so refuse to advance until it's filled.
    const bwKg = localBWUnits === 'st'
      ? stoneLbsToKg(bodyWeightSt, bodyWeightStLbs || '0')
      : parseBodyWeightToKg(bodyWeight, localBWUnits);
    if (!bwKg || isNaN(bwKg) || bwKg < 30 || bwKg > 300) {
      Alert.alert(
        'Body weight',
        'Enter your body weight so we can calculate your calorie and protein targets.',
      );
      return;
    }
    if (!age || isNaN(parseInt(age, 10)) || parseInt(age, 10) < 13 || parseInt(age, 10) > 100) {
      Alert.alert('Age', 'Enter your age (13 to 100).');
      return;
    }
    setStep(3);
  }

  function advanceFrom3() {
    if (!experience || !sessionLengthMinutes || !equipment || !trainingGoal || !trainingPhase) {
      Alert.alert('Complete all fields', 'Please fill out your training profile to continue.');
      return;
    }
    // The "aggressive cuts" goal-lock interstitial was removed from
    // onboarding (founder, 2026-05-29): it fired for anyone picking a
    // competition division even when they were lean-gaining, so the copy
    // was wrong, and the framing doesn't fit a science-led app. Everyone
    // now keeps the standard ED-pattern threshold (the more protective
    // 2-signal setting); the advanced opt-in still lives on the Goal lock
    // screen under You for anyone who wants it.
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
          // Flat schema: CoachingReminders, WeeklyCheckIn and the You tab
          // all read these top-level keys. An earlier nested shape
          // (prefs.checkin.weekday, prefs.morning.hour) was silently
          // dropped by every reader, defaulting every enrolled user to
          // a Sunday check-in regardless of the day they picked here.
          const prefs = {
            morningEnabled,
            checkinEnabled,
            morningHour,
            morningMinute: 0,
            checkinDay,
            checkinHour: 12,
            checkinMinute: 0,
          };
          if (morningEnabled) {
            await scheduleMorningWeightNotification(morningHour, 0);
          }
          if (checkinEnabled) {
            await scheduleCheckinReminder(checkinDay, 12, 0);
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
        activityLevel: daysToActivityLevel(daysPerWeek),
        goal: phaseToNutritionKey(trainingPhase),
        trainingGoal,
        proteinApproach,
      });

      const goalPhase = phaseToCoachingKey(trainingPhase);
      const trainingFreqBucket = daysToFreqBucket(daysPerWeek);

      // weeklyCoach.js reads `goalStartDate` to time diet-break suggestions
      // when the user is in a cut. Set it here if onboarding lands them in
      // a deficit; otherwise leave it null so the bulk/maintain path isn't
      // misinterpreted as a long-running cut.
      const isDeficit = trainingPhase === 'cut';
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
        goalStartDate: isDeficit ? new Date().toISOString() : null,
        stepsTarget: (userProfile || {}).stepsTarget ?? 8000,
        stepsEnabled: stepsTargetOn,
        trainingFreq: trainingFreqBucket,
        trainingFreqBucket,
        daysPerWeek,
        experience,
        sessionLengthMinutes,
        equipment,
        recoveryRating,
        planWeakPoints,
        proteinApproach,
      };

      if (user?.id) await saveLocalProfile(user.id, merged);

      // Opting into step targets is the moment to ask for health access. We
      // request steps and weight together in one sheet, so the foreground
      // auto-read can populate daily_steps and any scale or wearable weight
      // flows into the morning-weight log the check-in reads. Fire-and-forget:
      // declining is fine, the check-in falls back to a manual average.
      if (stepsTargetOn) {
        try {
          // eslint-disable-next-line global-require
          const { connectHealthStepsAndWeight } = require('../lib/activitySteps');
          connectHealthStepsAndWeight(user?.id).catch(() => {});
        } catch (_) { /* activitySteps unavailable */ }
      }

      if (user?.id && !isNaN(bwKg) && bwKg > 0) {
        await logBodyMetric(user.id, { weightKg: bwKg, loggedAt: Date.now() });
        // Also seed the morning weights series so the weekly check-in
        // gate (needs 3 readings in the last 7 days) counts enrolment
        // day. Without this, a user who enrols on their chosen check-in
        // day and tries to check in is told "0 readings this week" even
        // though they just typed a weight two screens ago.
        await logMorningWeight(user.id, { weightKg: bwKg, loggedAt: Date.now() }).catch(() => {});
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
        const planProfile = {
          experience,
          daysPerWeek,
          sessionLengthMinutes,
          equipment,
          trainingGoal,
          trainingPhase,
          planWeakPoints,
          recoveryRating,
        };
        let planResult = { ok: false, error: 'not attempted' };
        try { planResult = await generateAndSavePlan(user.id, planProfile); }
        catch (e) { planResult = { ok: false, error: e?.message ?? 'unknown' }; }
        if (!planResult.ok) {
          // eslint-disable-next-line global-require
          try { require('../lib/errorLog').logError('ProOnboardingScreen.generateAndSavePlan', planResult.error, { userId: user.id }); } catch (_) {}
          Alert.alert(
            'Plan setup didn\'t finish',
            `Your profile is saved but your training plan didn\'t generate (${planResult.error}). Open Home and tap "Build my plan" to retry.`,
          );
        }
      }
    } catch (e) {
      Alert.alert('Something went wrong', e?.message ?? 'Try again.');
      setBusy(false);
      return;
    }
    setBusy(false);
    navigation.replace('ProSetupComplete');
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

  function Header({ title, sub, onBack }) {
    return (
      <View style={styles.headerBlock}>
        <View style={styles.brandRow}>
          {onBack ? (
            <TouchableOpacity
              onPress={onBack}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.brandBack}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Ionicons name="chevron-back" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
          <VolyumeIcon size={22} />
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

  // ── Step 1, Create account ──────────────────────────────────────────────────

  if (step === 1) {
    return (
      <SafeAreaView key="step-1" style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Header
              title={authMode === 'signup' ? 'Create your account.' : 'Sign in to continue.'}
              sub="Pro needs an account so your plan, weight history, and coaching adjustments are backed up and sync across devices."
            />

            {/* Quick sign-in with Google (Apple too on iOS). Surfaced above
                the email form because most users prefer continuing with an
                existing account over creating yet another email/password.
                Disabled when the email/password flow is loading so the user
                can't fire both in parallel. */}
            <View style={styles.oauthBlock}>
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={[styles.oauthBtnApple, busy && styles.btnDisabled]}
                  onPress={() => handleOAuthOnboarding('apple')}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel="Continue with Apple"
                >
                  <Ionicons name="logo-apple" size={18} color={colors.appleBtnText} />
                  <Text style={styles.oauthBtnAppleText}>Continue with Apple</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.oauthBtn, busy && styles.btnDisabled]}
                onPress={() => handleOAuthOnboarding('google')}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Continue with Google"
              >
                <Ionicons name="logo-google" size={18} color={colors.textPrimary} />
                <Text style={styles.oauthBtnText}>Continue with Google</Text>
              </TouchableOpacity>
              <View style={styles.oauthDivider}>
                <View style={styles.oauthDividerLine} />
                <Text style={styles.oauthDividerText}>or with email</Text>
                <View style={styles.oauthDividerLine} />
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
                  style={[styles.fieldInput, { paddingRight: spacing.xxxl }]}
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

  // ── Step 2, Profile ─────────────────────────────────────────────────────────

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

  // ── Step 2, Training setup ──────────────────────────────────────────────────

  if (step === 3) {
    const goalOptions = PHYSIQUE_GOALS.map(g => ({ value: g.value, label: g.label, sub: g.subtitle }));
    const canContinue = !!experience && !!sessionLengthMinutes && !!equipment && !!trainingGoal && !!trainingPhase;

    return (
      <SafeAreaView key="step-3" style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Header
              title="Your training profile."
              sub="Takes about 30 seconds. This shapes your entire plan."
              onBack={goBack}
            />

            <View style={styles.section}>
              <Text style={styles.fieldLabel}>Training experience</Text>
              <Text style={styles.fieldHint}>Shapes volume and exercise complexity.</Text>
              {EXPERIENCE_OPTIONS.map(opt => (
                <OptionCard
                  key={opt.value}
                  icon="trophy-outline"
                  label={opt.label}
                  detail={opt.sub}
                  active={experience === opt.value}
                  onPress={() => setExperience(opt.value)}
                />
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.fieldLabel}>Session length</Text>
              <Text style={styles.fieldHint}>How long is your typical training session?</Text>
              <SegmentedControl
                options={SESSION_LENGTH_OPTIONS}
                value={sessionLengthMinutes}
                onChange={setSessionLengthMinutes}
                accessibilityLabel="Session length"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.fieldLabel}>Training days per week</Text>
              <Text style={styles.fieldHint}>How many days can you train? Your plan is built to fit this many sessions.</Text>
              <SegmentedControl
                options={DAYS_PER_WEEK_OPTIONS.map(d => ({ label: String(d), value: d }))}
                value={daysPerWeek}
                onChange={setDaysPerWeek}
                accessibilityLabel="Training days per week"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.fieldLabel}>Equipment</Text>
              <Text style={styles.fieldHint}>What do you have access to?</Text>
              {EQUIPMENT_OPTIONS.map(opt => (
                <OptionCard
                  key={opt.value}
                  icon="barbell-outline"
                  label={opt.label}
                  detail={opt.sub}
                  active={equipment === opt.value}
                  onPress={() => setEquipment(opt.value)}
                />
              ))}
            </View>

            {/* Primary question, single source of truth for what the
                current block is doing. Drives calories, plan structure,
                weak-point spec, and strength-size emphasis. */}
            <View style={styles.section}>
              <Text style={styles.fieldLabel}>What are you focused on right now?</Text>
              <Text style={styles.fieldHint}>Drives your calorie target and how your plan is built. Pick what your current block is doing.</Text>
              {TRAINING_PHASES.map(phase => (
                <OptionCard
                  key={phase.value}
                  icon={phase.icon}
                  label={phase.label}
                  detail={phase.detail}
                  active={trainingPhase === phase.value}
                  onPress={() => setTrainingPhase(phase.value)}
                />
              ))}
            </View>

            {/* Secondary, optional, only matters for competitive lifters
                chasing a specific physique category. Defaults to 'general'
                (balanced volume) for everyone else. */}
            <Dropdown
              label="Competing in a category? (optional)"
              hint="Only if you're chasing a competitive physique. Biases volume toward the muscles that category is judged on."
              value={trainingGoal}
              options={goalOptions}
              onChange={changeGoal}
              placeholder="Not competing, General"
            />

            {/* Weak points, division-scoped. The options shown are the ones
                this division is judged on (or commonly brings up). Picking none
                is fine, it just means a balanced plan. */}
            {GOALS_WITH_WEAK_POINTS.includes(trainingGoal) && (
              <View style={styles.wpSection}>
                <Text style={styles.wpLabel}>
                  Anything to bring up? <Text style={styles.wpOptional}>(optional, up to 3)</Text>
                </Text>
                <Text style={styles.wpHint}>
                  Pick a muscle or two you want to prioritise and your plan puts extra
                  work into them. Not sure? Leave it blank for a balanced plan; you can
                  set this later.
                </Text>
                <View style={styles.wpGrid}>
                  {weakPointSetForGoal(trainingGoal).map(muscle => {
                    const sel = planWeakPoints.includes(muscle);
                    return (
                      <TouchableOpacity
                        key={muscle}
                        style={[styles.wpChip, sel && styles.wpChipSelected]}
                        onPress={() => toggleWeakPoint(muscle)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.wpChipText, sel && styles.wpChipTextSelected]}>
                          {muscle}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={styles.section}>
              <TouchableOpacity
                style={styles.proteinHead}
                onPress={() => setProteinOpen(v => !v)}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Protein target</Text>
                  <Text style={styles.fieldHint}>
                    {PROTEIN_APPROACHES[proteinApproach]?.label} · {PROTEIN_APPROACHES[proteinApproach]?.range}. Set for you, tap to change.
                  </Text>
                </View>
                <Ionicons name={proteinOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
              </TouchableOpacity>

              {proteinOpen && (
                <View style={styles.proteinOptions}>
                  {['standard', 'optimised', 'advanced'].map(key => {
                    const opt = PROTEIN_APPROACHES[key];
                    const active = proteinApproach === key;
                    const recommended = key === suggestedApproach;
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[styles.proteinOpt, active && styles.proteinOptActive]}
                        onPress={() => setProteinOverride(key)}
                        activeOpacity={0.85}
                      >
                        <View style={{ flex: 1 }}>
                          <View style={styles.proteinOptTop}>
                            <Text style={styles.proteinOptLabel}>{opt.label}</Text>
                            <Text style={styles.proteinOptRange}>{opt.range}</Text>
                            {recommended ? (
                              <View style={styles.recBadge}>
                                <Text style={styles.recBadgeText}>Recommended</Text>
                              </View>
                            ) : null}
                          </View>
                          <Text style={styles.proteinOptDesc}>{PROTEIN_SHORT[key]}</Text>
                        </View>
                        {active ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
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

  // ── Step 3, Recovery & reminders ───────────────────────────────────────────

  if (step === 4) {
    const canContinue = !!recoveryRating;

    return (
      <SafeAreaView key="step-4" style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Header
            title="Recovery & reminders."
            sub="Recovery affects your plan volume. Reminders keep coaching consistent."
            onBack={goBack}
          />

          <View style={styles.coachCard}>
            <View style={styles.coachCardHead}>
              <View style={styles.notifIconWrap}>
                <Ionicons name="sync-outline" size={18} color={colors.primary} />
              </View>
              <Text style={styles.coachCardTitle}>How your coaching works</Text>
            </View>
            <Text style={styles.coachCardBody}>
              Each morning you weigh in. Once a week you check in. Your coach reads the trend and adjusts your calories and training. Logging your food in your food diary sharpens every call, and your weight trend carries the rest.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.fieldLabel}>How's your recovery?</Text>
            <Text style={styles.fieldHint}>This affects how much volume your plan includes. Be honest. It adjusts to protect you.</Text>
            {RECOVERY_OPTIONS.map(opt => (
              <OptionCard
                key={opt.value}
                icon="bed-outline"
                label={opt.label}
                detail={opt.sub}
                active={recoveryRating === opt.value}
                onPress={() => setRecoveryRating(opt.value)}
              />
            ))}
          </View>

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

          <View style={styles.section}>
            <Text style={styles.fieldLabel}>Daily movement</Text>
            <Text style={styles.fieldHint}>How much you walk each day. Steps are the first thing the coach leans on when progress slows, before it touches your food.</Text>

            <View style={styles.notifSection}>
              <View style={styles.notifHeader}>
                <View style={styles.notifIconWrap}>
                  <Ionicons name="footsteps-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifTitle}>Daily step target</Text>
                  <Text style={styles.notifSub}>
                    {stepsTargetOn
                      ? 'Starts at 8,000 a day, the same every day. Your phone fills the number in for you. Adjust it any time in Settings.'
                      : 'Off. The coach will lean on your food, and later on cardio, instead of steps. Turn this back on any time in Settings.'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.toggle, stepsTargetOn && styles.toggleOn]}
                  onPress={() => setStepsTargetOn(v => !v)}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: stepsTargetOn }}
                  accessibilityLabel="Keep a daily step target"
                >
                  <View style={[styles.toggleThumb, stepsTargetOn && styles.toggleThumbOn]} />
                </TouchableOpacity>
              </View>
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
    paddingHorizontal: 7, paddingVertical: spacing.xxs,
  },
  proBadgeText: {
    fontSize: fontSize.micro, fontWeight: fontWeight.black,
    color: colors.background, letterSpacing: 0.8,
  },

  progressRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm },
  progressSegment: { flex: 1, height: 3, borderRadius: 2 },
  progressDone: { backgroundColor: colors.primary },
  progressActive: { backgroundColor: withAlpha(colors.primary, 0.8) },
  progressPending: { backgroundColor: colors.border },

  stepCount: { ...type.num('caption'), color: colors.textMuted, marginBottom: spacing.xs },
  stepTitle: {
    fontSize: fontSize.xxl, fontWeight: fontWeight.bold,
    color: colors.textPrimary, marginBottom: spacing.sm, lineHeight: 30,
  },
  stepSub: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },

  // Back affordance, inline at the left of the brand row so it reads as part of
  // the header chrome instead of floating above the logo. Negative left margin
  // pulls the chevron to the content edge so it lines up with the page padding.
  brandBack: { marginLeft: -spacing.xs, marginRight: spacing.xxs },

  // Sections / inputs
  section: { marginBottom: spacing.xl },
  fieldLabel: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
    color: colors.textMuted, letterSpacing: 0.3, marginBottom: spacing.sm,
  },
  fieldHint: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 18, marginBottom: spacing.sm },
  // Protein target collapsible (step 3). Collapsed by default, the header
  // shows the chosen tier; expanding reveals the three tiers to pick from.
  proteinHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  proteinOptions: { marginTop: spacing.sm, gap: spacing.sm },
  proteinOpt: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border, padding: spacing.md,
  },
  proteinOptActive: { borderColor: colors.primary },
  proteinOptTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xxs, flexWrap: 'wrap' },
  proteinOptLabel: { ...type.bodyStrong, color: colors.textPrimary },
  proteinOptRange: { fontSize: fontSize.xs, color: colors.textMuted },
  proteinOptDesc: { fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: 17 },
  recBadge: {
    backgroundColor: colors.primaryBg, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 1,
    borderWidth: 1, borderColor: withAlpha(colors.primary, 0.188),
  },
  recBadgeText: { fontSize: fontSize.micro, color: colors.primary, fontWeight: fontWeight.semibold },

  // Weak-point selector (step 3). Chip grid, division-scoped options.
  wpSection: { marginTop: spacing.lg, marginBottom: spacing.sm },
  wpLabel: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
    color: colors.textMuted, letterSpacing: 0.3, marginBottom: spacing.xs,
  },
  wpOptional: { color: colors.textMuted, fontWeight: fontWeight.regular },
  wpHint: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 18, marginBottom: spacing.md },
  wpGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  wpChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, backgroundColor: colors.surface2,
    borderWidth: 1, borderColor: colors.border,
  },
  wpChipSelected: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
  wpChipText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium },
  wpChipTextSelected: { color: colors.primary, fontWeight: fontWeight.semibold },
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
  fieldWrapFocused: { borderColor: withAlpha(colors.primary, 0.502) },
  fieldInput: {
    flex: 1, paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    fontSize: fontSize.md, color: colors.textPrimary,
  },
  eyeBtn: {
    position: 'absolute', right: spacing.md,
    top: 0, bottom: 0, justifyContent: 'center', paddingHorizontal: spacing.xs,
  },

  heightImperialRow: { flexDirection: 'row', gap: spacing.md },

  fieldLabelRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing.sm,
  },
  segmentRowSmall: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, padding: spacing.xxs,
  },
  segmentSmall: {
    paddingVertical: spacing.xs, paddingHorizontal: spacing.sm,
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
  segmentText: { ...type.label, color: colors.textMuted },
  segmentTextActive: { color: colors.background },

  // Dropdown
  dropdownWrap: { marginBottom: spacing.xl },
  dropdownTrigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 2,
  },
  dropdownTriggerFilled: { borderColor: withAlpha(colors.primary, 0.376) },
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
  dropdownItemLabel: { ...type.body, color: colors.textSecondary, marginBottom: 1 },
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
  notifTitle: { ...type.bodyStrong, color: colors.textPrimary, marginBottom: spacing.xxs },
  notifSub: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 17 },

  coachCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.xl,
  },
  coachCardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  coachCardTitle: { ...type.bodyStrong, color: colors.textPrimary },
  coachCardBody: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },

  toggle: {
    width: 44, height: 26, borderRadius: 13,
    backgroundColor: colors.surface3, justifyContent: 'center', paddingHorizontal: 3,
  },
  toggleOn: { backgroundColor: colors.primary },
  toggleThumb: { width: 20, height: 20, borderRadius: radius.md, backgroundColor: colors.textMuted },
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
    borderRadius: 4, paddingHorizontal: spacing.sm, paddingVertical: 3,
  },
  offerBadgeText: { fontSize: fontSize.micro, fontWeight: fontWeight.black, color: colors.background, letterSpacing: 0.8 },
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
  oauthBlock: { gap: spacing.sm, marginBottom: spacing.lg },
  oauthBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  oauthBtnText: { color: colors.textPrimary, ...type.bodyStrong },
  oauthBtnApple: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: colors.appleBtnBg },
  oauthBtnAppleText: { color: colors.appleBtnText, ...type.bodyStrong },
  oauthDivider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  oauthDividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  oauthDividerText: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.medium },
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
