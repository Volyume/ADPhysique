import { useState, useRef, useEffect } from 'react';
import { appAlert } from '../components/AppAlert';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform, KeyboardAvoidingView, Animated, AccessibilityInfo } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha, motion, hitSlop, shadow } from '../styles/theme';
import { VolyumeIcon } from '../components/BrandMark';
import SegmentedControl from '../components/SegmentedControl';
import Chip from '../components/Chip';
import Button from '../components/Button';
import TextField from '../components/TextField';
import InfoTooltip from '../components/InfoTooltip';
import { GLOSSARY } from '../lib/coachGlossary';
import Dropdown from '../components/Dropdown';
import OAuthButtons from '../components/auth/OAuthButtons';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import {
  logBodyMetric, logMorningWeight, saveNutritionTargets, saveUserBodyProfile,
} from '../lib/database';
import { stoneLbsToKg, ftInToCm, parseBodyWeightToKg } from '../lib/units';
import { signInWithGoogle, signInWithApple } from '../lib/supabase';
import { generateAndSavePlan, planShortfallNote } from '../lib/planAutoGen';
import {
  requestNotificationPermissions,
  scheduleMorningWeightNotification,
  scheduleEveningWeightReminder,
  scheduleCheckinReminder,
} from '../lib/notifications';
import {
  PHYSIQUE_GOALS,
  TRAINING_PHASES,
  GOALS_WITH_WEAK_POINTS,
  GOAL_LABELS,
  weakPointSetForGoal,
  phaseToNutritionKey,
  phaseToCoachingKey,
  buildNutritionEngineInputs,
} from '../lib/coachingGoals';
import { calculateNutritionTargets, PROTEIN_APPROACHES, ADVANCED_PROTEIN_GOALS } from '../lib/nutritionEngine';
import { saveDraft, loadDraft, clearDraft, DRAFT_DEBOUNCE_MS } from '../lib/proOnboardingDraft';
import { dateOfBirthFromAgeYears } from '../lib/profileAge';

const NOTIF_PREFS_KEY = '@volyume_notification_prefs';

// Plain-language one-liners for the protein tiers, kept short for the
// onboarding collapsible. The engine's own descriptions read more technical;
// these mirror the wording the plan builder uses so the two surfaces match.
const PROTEIN_SHORT = {
  standard:  'Enough for consistent training. Easy to sustain day to day.',
  optimised: 'The proven target for serious training. Best for most people.',
  advanced:  'Upper end for competitive athletes and harder cuts.',
};

const TOTAL_STEPS = 5;
const STEP_LABELS = ['Account', 'Baseline', 'Training week', 'Targets', 'Check-in rhythm'];
const STEP_OUTCOMES = {
  1: [
    { icon: 'shield-checkmark-outline', label: 'Secure sign-in' },
    { icon: 'cloud-done-outline', label: 'Account recovery' },
  ],
  2: [
    { icon: 'calculator-outline', label: 'Calorie baseline' },
    { icon: 'barbell-outline', label: 'Protein target' },
    { icon: 'trending-up-outline', label: 'Weight trend' },
  ],
  3: [
    { icon: 'calendar-outline', label: 'Training split' },
    { icon: 'time-outline', label: 'Session length' },
    { icon: 'fitness-outline', label: 'Exercise pool' },
  ],
  4: [
    { icon: 'flag-outline', label: 'Goal phase' },
    { icon: 'body-outline', label: 'Muscle priorities' },
    { icon: 'restaurant-outline', label: 'Nutrition target' },
  ],
  5: [
    { icon: 'pulse-outline', label: 'Recovery guardrails' },
    { icon: 'notifications-outline', label: 'Check-in rhythm' },
    { icon: 'heart-outline', label: 'Cardio setting' },
  ],
};

// COMP-013 plan setup sequence. Four honest stage lines, each mapped
// to a real _generatePlanInner phase, displayed for a minimum 800ms dwell while
// the real plan generation + DB writes run underneath. 3.2s total sits inside
// the evidence band (>2s informative, ~3-5s the working range of plan-build
// screens) without escalating into theatre. The sequence never completes before
// the real work does; failure aborts it instantly (no completion tick).
const STAGE_DWELL_MS = 800;
const SEQUENCE_TOTAL_MS = STAGE_DWELL_MS * 4;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Default days per week, used for nutrition calc without asking the user.
const DEFAULT_DAYS_PER_WEEK = 4;

function daysToFreqBucket(daysPerWeek) {
  if (daysPerWeek <= 3) return '2-3';
  if (daysPerWeek <= 5) return '4-5';
  return '6+';
}

// The wizard's only accepted biological-sex values. The step-2 picker and the
// draft-restore step clamp read this SAME set, so the sex gate and its UI can
// never drift apart (F11: sex drives the sacred ED calorie floor + BMR).
const SEX_OPTIONS = [{ label: 'Male', value: 'male' }, { label: 'Female', value: 'female' }];
const ACCEPTED_SEX_VALUES = SEX_OPTIONS.map((o) => o.value);
const BODY_FAT_SOURCE_OPTIONS = [
  { label: 'Best estimate', value: 'visual' },
  { label: 'BIA', value: 'bia' },
  { label: 'Caliper', value: 'caliper' },
  { label: 'DEXA', value: 'dexa' },
];
const BODY_FAT_SOURCE_VALUES = BODY_FAT_SOURCE_OPTIONS.map((o) => o.value);

function normaliseBodyFatSource(source) {
  return BODY_FAT_SOURCE_VALUES.includes(source) ? source : 'visual';
}

// ONBOARD-001: height bounds (cm) for the required-details gate. Height feeds
// BMR and the calorie / FFM targets, so the step-2 gate refuses to advance until
// the entered height parses to a realistic figure. The band is deliberately
// wide, it spans the 13-100 age range the wizard allows, while still rejecting
// typos (a single digit, or a body weight typed into the height field). The
// nutrition engine keeps its OWN [100, 250] clamp; this gate is the user-facing
// refusal so a default is never silently treated as a confirmed height.
const MIN_HEIGHT_CM = 120;
const MAX_HEIGHT_CM = 250;

// Resolve the step-2 height inputs to a single cm value, in whichever unit the
// user is using. Returns NaN when the required field is blank, so the button's
// canContinue predicate and advanceFrom2 read the SAME result and can never
// drift apart (F11 spirit, mirroring the sex gate). Imperial requires feet;
// inches default to 0 for an exact "N ft" height.
function resolveHeightCm(units, cm, ft, inches) {
  if (units === 'imperial') {
    return ft.trim() !== '' ? ftInToCm(ft, inches) : NaN;
  }
  return parseFloat(cm);
}

function isValidHeightCm(hcm) {
  return Number.isFinite(hcm) && hcm >= MIN_HEIGHT_CM && hcm <= MAX_HEIGHT_CM;
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
const HOURS = Array.from({ length: 14 }, (_, i) => i + 5); // 5am to 6pm

function fmt12(h) {
  if (h === 0) return '12 am';
  if (h < 12) return `${h} am`;
  if (h === 12) return '12 pm';
  return `${h - 12} pm`;
}

function ProOnboardingProgressBar({ step }) {
  // Endowed Progress Effect: the bar opens with a small amount already filled
  // rather than empty, so step 1 doesn't read as "0% done, long way to go".
  const BASE = 0.12;
  const advanced = TOTAL_STEPS > 1 ? (step - 1) / (TOTAL_STEPS - 1) : 1;
  const filled = Math.round((BASE + (1 - BASE) * advanced) * 100);
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${filled}%` }]} />
    </View>
  );
}

function ProOnboardingHeader({ step, title, sub, onBack }) {
  const stepLabel = STEP_LABELS[step - 1] || 'Setup';
  const outcomes = STEP_OUTCOMES[step] || [];
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
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : null}
        <VolyumeIcon size={22} />
        <View style={styles.proBadge}>
          <Text style={styles.proBadgeText}>PRO</Text>
        </View>
      </View>
      <ProOnboardingProgressBar step={step} />
      <Text style={styles.stepCount}>Step {step} of {TOTAL_STEPS} - {stepLabel}</Text>
      <Text style={styles.stepTitle}>{title}</Text>
      {sub ? <Text style={styles.stepSub}>{sub}</Text> : null}
      {outcomes.length ? (
        <View style={styles.outcomeCard}>
          <Text style={styles.outcomeEyebrow}>This step sets</Text>
          <View style={styles.outcomeGrid}>
            {outcomes.map((item) => (
              <View key={item.label} style={styles.outcomeChip}>
                <Ionicons name={item.icon} size={14} color={colors.primary} />
                <Text style={styles.outcomeChipText} numberOfLines={1}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function QuestionGroup({ icon, title, sub, children }) {
  return (
    <View style={styles.questionGroup}>
      <View style={styles.questionGroupHead}>
        <View style={styles.questionGroupIcon}>
          <Ionicons name={icon} size={18} color={colors.primary} />
        </View>
        <View style={styles.questionGroupCopy}>
          <Text style={styles.questionGroupTitle}>{title}</Text>
          {sub ? <Text style={styles.questionGroupSub}>{sub}</Text> : null}
        </View>
      </View>
      {children}
    </View>
  );
}

export default function ProOnboardingScreen({ navigation }) {
  const {
    user, setUnits, bodyWeightUnits, setBodyWeightUnits, userProfile, saveLocalProfile,
    proOnboardingAccountCreated, setProOnboardingAccountCreated,
  } = useAppStore(useShallow(s => ({
    user: s.user,
    setUnits: s.setUnits,
    bodyWeightUnits: s.bodyWeightUnits,
    setBodyWeightUnits: s.setBodyWeightUnits,
    userProfile: s.userProfile,
    saveLocalProfile: s.saveLocalProfile,
    proOnboardingAccountCreated: s.proOnboardingAccountCreated,
    setProOnboardingAccountCreated: s.setProOnboardingAccountCreated,
  })));

  const [step, setStep] = useState(1);

  // COMP-013: Reduce Motion skips the staged build sequence entirely (the button
  // spinner stays, exactly the old behaviour). Same flag ProSetupComplete reads.
  const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion);
  const [sequenceActive, setSequenceActive] = useState(false);
  // How many stage lines have entered so far (1..4). 0 = not started.
  const [sequenceStage, setSequenceStage] = useState(0);
  const stageTimersRef = useRef([]);
  const sequenceFade = useRef(new Animated.Value(0)).current;
  // Guards a synchronous double-tap on Continue: in sequence mode the button is
  // covered by the overlay rather than disabled by `busy`, so a fast second tap
  // before the overlay commits could fire two plan generations.
  const submittingRef = useRef(false);

  // Step 1, profile
  const [firstName, setFirstName] = useState(userProfile?.firstName || '');
  const localUnits = 'kg';
  const [localBWUnits, setLocalBWUnits] = useState(bodyWeightUnits || 'st');
  // OB-5 (audit 02): body weight and age start EMPTY and join sex as
  // explicit-entry fields. The old prefills (80 kg, age 30) were real editable
  // values that validated untouched, so plausible-looking calorie targets
  // could be computed on someone else's body. The example values now live in
  // the placeholders, and the step-2 Continue stays disabled (canContinue)
  // until both are genuinely entered.
  const [bodyWeightSt, setBodyWeightSt] = useState('');
  const [bodyWeightStLbs, setBodyWeightStLbs] = useState('');
  const [bodyWeight, setBodyWeight] = useState('');
  // Optional body fat, mirrors NutritionTargetsScreen. When a measured value is
  // given (not visual) the engine uses the lean-mass BMR formula, the same as
  // Nutrition Targets, so onboarding and the targets screen compute the SAME
  // maintenance. Without it, onboarding under-estimated maintenance (Mifflin
  // only) and the bulk target came out ~300 kcal too low, landing on the lean
  // bulk number.
  const [bodyFat, setBodyFat] = useState('');
  const [bfSource, setBfSource] = useState('visual');
  const [localHeightUnits, setLocalHeightUnits] = useState('imperial');
  // Biological sex has NO default (founder 2026-07-01): it drives the ED
  // calorie floor (1500 male / 1200 female) and BMR, so a silent 'male' default
  // could mis-floor a female. advanceFrom2 requires an explicit choice before
  // the profile step can complete, so sex is never unknown by the time targets
  // are computed.
  const [sex, setSex] = useState(null);
  // OB-5: age starts empty too (see the body-weight note above).
  const [age, setAge] = useState('');
  // ONBOARD-001 (audit): height starts BLANK and joins sex / body weight / age
  // as an explicit-entry field. The old '175' cm / 5 ft 9 in seed was a real,
  // plausible height that validated untouched, so calorie / FFM / BMR targets
  // could be computed on a height the user never confirmed. The example values
  // now live in the placeholders; the step-2 Continue stays disabled
  // (canContinue) and advanceFrom2 refuses until a realistic height is entered.
  const [heightCm, setHeightCm] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');

  // Step 2, training setup (all dropdowns / segments)
  const [experience, setExperience] = useState(null);
  const [sessionLengthMinutes, setSessionLengthMinutes] = useState(60);
  const [daysPerWeek, setDaysPerWeek] = useState(DEFAULT_DAYS_PER_WEEK);
  const [equipment, setEquipment] = useState(null);
  // Defaults to 'general' (not competing). Users tap into the optional
  // "Competing in a category?" dropdown to pick a physique category.
  const [trainingGoal, setTrainingGoal] = useState('general');
  // Default to lean gain (lean bulk) rather than an empty greyed picker, so
  // the screen lands on the most common phase and the user changes it only if
  // they want something else.
  const [trainingPhase, setTrainingPhase] = useState('lean_gain');
  // Weak points the user wants to bring up (UI labels, max 3). Division-scoped:
  // the options shown depend on trainingGoal. Passed into plan generation, which
  // biases volume towards these muscles within the recovery envelope.
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

  // COMP-030: prefill the training + goal steps from the pre-account quiz slice
  // (Variant B), so a quiz-first user confirms rather than re-answers. One-shot
  // on mount; no-op when the quiz wasn't run (flag off / Free path).
  const onboardingQuiz = useAppStore(s => s.onboardingQuiz);
  useEffect(() => {
    const q = onboardingQuiz;
    if (!q) return;
    if (q.experience) setExperience(q.experience);
    if (Number.isFinite(q.sessionLengthMinutes)) setSessionLengthMinutes(q.sessionLengthMinutes);
    if (Number.isFinite(q.daysPerWeek)) setDaysPerWeek(q.daysPerWeek);
    if (q.equipment) setEquipment(q.equipment);
    if (q.trainingGoal) setTrainingGoal(q.trainingGoal);
    if (q.trainingPhase) setTrainingPhase(q.trainingPhase);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  const [morningHour, setMorningHour] = useState(7);
  const [checkinDay, setCheckinDay] = useState(0);
  // Cardio available by default. On means the cardio library + logging are
  // available to the user; it does NOT allocate cardio. The coach only ever
  // brings cardio in as a lever when it is genuinely needed (a stalling cut),
  // never as a scheduled session. The user chooses what they do.
  const [cardioOn, setCardioOn] = useState(true);

  // Step 1, account. OAuth only (Apple/Google), the email + password path was
  // removed (founder 2026-07-01) because email confirmation was flaky. OAuth
  // completes the account inside handleOAuthOnboarding, which sets
  // accountCreated and advances to step 2; there is no signup/signin mode.
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
      // If this session already created (or signed into) the account,
      // resume past Step 1 no matter what. The Article 9 consent gate
      // unmounts this stack right after sign-up, wiping the local step
      // state; the persisted flag is how we get back to where the wizard
      // continues instead of stranding the user on Create your account.
      // The old userProfile guard failed here because the sign-up sync
      // hydrates a profile, so it wrongly blocked the resume (the loop).
      if (proOnboardingAccountCreated) {
        setAccountCreated(true);
        setStep(2);
        return;
      }
      // Otherwise an existing account is being restored and the
      // navigator is about to send the user to MainTabs. A hydrated
      // userProfile means don't flash Step 2 before it catches up.
      if (userProfile) return;
      setAccountCreated(true);
      setStep(2);
    }
  }, [step, user, userProfile, proOnboardingAccountCreated]);

  // ── OB-3: draft persistence across process death ─────────────────────────────
  // The wizard's answers live in screen-local state, so a process kill used to
  // lose steps 2-5. A per-uid AsyncStorage draft (lib/proOnboardingDraft)
  // restores { step, answers } on mount and is cleared when the wizard
  // completes. Restoring NEVER weakens the sex gate: a draft saved with sex
  // null restores sex null, so step 2's canContinue still blocks Continue.
  const draftRestoredRef = useRef(false);
  // Saving stays off until the restore read has settled, so a mount-time save
  // of default answers can never overwrite a further-along draft mid-load.
  const draftLoadedRef = useRef(false);
  useEffect(() => {
    if (draftRestoredRef.current) return;
    if (!user?.id || user.isLocal) return;
    draftRestoredRef.current = true;
    loadDraft(user.id).then((draft) => {
      draftLoadedRef.current = true;
      if (!draft) return;
      const a = draft.answers || {};
      const str = (v, set) => { if (typeof v === 'string') set(v); };
      const bool = (v, set) => { if (typeof v === 'boolean') set(v); };
      const num = (v, set) => { if (Number.isFinite(v)) set(v); };
      str(a.firstName, setFirstName);
      if (a.localBWUnits === 'st' || a.localBWUnits === 'kg' || a.localBWUnits === 'lbs') setLocalBWUnits(a.localBWUnits);
      str(a.bodyWeightSt, setBodyWeightSt);
      str(a.bodyWeightStLbs, setBodyWeightStLbs);
      str(a.bodyWeight, setBodyWeight);
      str(a.bodyFat, setBodyFat);
      if (typeof a.bfSource === 'string') setBfSource(normaliseBodyFatSource(a.bfSource));
      if (a.localHeightUnits === 'imperial' || a.localHeightUnits === 'metric') setLocalHeightUnits(a.localHeightUnits);
      // Sex only ever restores an explicit prior choice; anything else stays null.
      const sexValid = ACCEPTED_SEX_VALUES.includes(a.sex);
      if (sexValid) setSex(a.sex);
      str(a.age, setAge);
      str(a.heightCm, setHeightCm);
      str(a.heightFt, setHeightFt);
      str(a.heightIn, setHeightIn);
      str(a.experience, setExperience);
      num(a.sessionLengthMinutes, setSessionLengthMinutes);
      num(a.daysPerWeek, setDaysPerWeek);
      str(a.equipment, setEquipment);
      str(a.trainingGoal, setTrainingGoal);
      str(a.trainingPhase, setTrainingPhase);
      if (Array.isArray(a.planWeakPoints)) setPlanWeakPoints(a.planWeakPoints.filter((m) => typeof m === 'string').slice(0, 3));
      str(a.proteinOverride, setProteinOverride);
      str(a.recoveryRating, setRecoveryRating);
      num(a.morningHour, setMorningHour);
      num(a.checkinDay, setCheckinDay);
      bool(a.cardioOn, setCardioOn);
      // The account step is behind a restored draft by definition.
      setAccountCreated(true);
      // F11 seam: a draft persisted past step 2 whose sex is not an accepted
      // value (corrupt/hand-edited storage) must NOT restore past the sex
      // gate, sex drives the sacred ED floor, and step 2's canContinue is
      // the only thing enforcing it. Clamp the restored step to 2 until the
      // draft carries a valid explicit choice.
      setStep((s) => Math.max(s, sexValid ? draft.step : Math.min(draft.step, 2)));
    }).catch(() => { draftLoadedRef.current = true; /* fresh start, same as no draft */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Debounced draft save on any answer/step change while the wizard is live.
  // Skips step 1 (auth-owned) and the final submission (advanceFrom5 clears
  // the draft; a queued save after that would resurrect it).
  const draftTimerRef = useRef(null);
  useEffect(() => {
    if (!user?.id || user.isLocal || step < 2) return undefined;
    if (!draftLoadedRef.current || submittingRef.current) return undefined;
    const answers = {
      firstName, localBWUnits, bodyWeightSt, bodyWeightStLbs, bodyWeight,
      bodyFat, bfSource, localHeightUnits, sex, age, heightCm, heightFt,
      heightIn, experience, sessionLengthMinutes, daysPerWeek, equipment,
      trainingGoal, trainingPhase, planWeakPoints, proteinOverride,
      recoveryRating, morningHour, checkinDay,
      cardioOn,
    };
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      saveDraft(user.id, step, answers);
    }, DRAFT_DEBOUNCE_MS);
    return () => { if (draftTimerRef.current) clearTimeout(draftTimerRef.current); };
  }, [
    user, step, firstName, localBWUnits, bodyWeightSt, bodyWeightStLbs,
    bodyWeight, bodyFat, bfSource, localHeightUnits, sex, age, heightCm,
    heightFt, heightIn, experience, sessionLengthMinutes, daysPerWeek,
    equipment, trainingGoal, trainingPhase, planWeakPoints, proteinOverride,
    recoveryRating, morningHour, checkinDay,
    cardioOn,
  ]);

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
        appAlert('Sign-in failed', result.error.message);
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
      setProOnboardingAccountCreated(true);
      setAccountCreated(true);
      emitStepDone(1);
      setStep(2);
    } catch (e) {
      logError('ProOnboarding.oauth.threw', e, { provider });
    } finally {
      setBusy(false);
    }
  }


  // E7.2 activation funnel: a forward advance through the wizard. `n` is the
  // step just completed (1..4). Counts only, no answers. Lazy-required so the
  // test env that mocks the store/telemetry does not pull the supabase client.
  function emitStepDone(n) {
    if (!user?.id) return;
    try {
      // eslint-disable-next-line global-require
      const { track } = require('../lib/engineTelemetry');
      track(user.id, 'onboarding_step_completed', { step: n }).catch(() => {});
    } catch (_) { /* tolerate */ }
  }

  function advanceFrom2() {
    if (!firstName.trim()) {
      appAlert('Your name', 'Please enter your first name to continue.');
      return;
    }
    // Biological sex is REQUIRED (founder 2026-07-01): it sets the ED calorie
    // floor and BMR, and must never be left to a silent default.
    if (sex !== 'male' && sex !== 'female') {
      appAlert('Biological sex', 'Please choose your biological sex. It sets your calorie and nutrition targets.');
      return;
    }
    // Validate body weight, used downstream to compute calorie / protein
    // targets and to seed the body-metrics log. A silent 80kg fallback
    // would produce wrong macros, so refuse to advance until it's filled.
    const bwKg = localBWUnits === 'st'
      ? stoneLbsToKg(bodyWeightSt, bodyWeightStLbs || '0')
      : parseBodyWeightToKg(bodyWeight, localBWUnits);
    if (!bwKg || isNaN(bwKg) || bwKg < 30 || bwKg > 300) {
      appAlert(
        'Body weight',
        'Enter your body weight so we can calculate your calorie and protein targets.',
      );
      return;
    }
    if (!age || isNaN(parseInt(age, 10)) || parseInt(age, 10) < 13 || parseInt(age, 10) > 100) {
      appAlert('Age', 'Enter your age (13 to 100).');
      return;
    }
    // Height is REQUIRED (ONBOARD-001): it feeds BMR and the calorie / FFM
    // targets. No silent 175cm default, refuse to advance until a realistic
    // height is entered in whichever unit the user is using. This matches the
    // Continue button's canContinue exactly (both call the shared resolver).
    const enteredHeightCm = resolveHeightCm(localHeightUnits, heightCm, heightFt, heightIn);
    if (!isValidHeightCm(enteredHeightCm)) {
      appAlert('Height', 'Enter your height so we can calculate your calorie targets.');
      return;
    }
    emitStepDone(2);
    setStep(3);
  }

  function advanceFrom3() {
    // Step 3 is now logistics only (experience, session length, days, kit).
    // The goal/phase questions moved to step 4 so neither step carries more
    // than a handful of fields (the 3-5-per-step rule).
    if (!experience || !sessionLengthMinutes || !equipment) {
      appAlert('Complete all fields', 'Please fill out your training setup to continue.');
      return;
    }
    emitStepDone(3);
    setStep(4);
  }

  function advanceFrom4() {
    if (!trainingGoal || !trainingPhase) {
      appAlert('Almost there', 'Choose what you are focused on to continue.');
      return;
    }
    // The "aggressive cuts" goal-lock interstitial was removed from
    // onboarding (founder, 2026-05-29): it fired for anyone picking a
    // competition division even when they were lean-gaining, so the copy
    // was wrong, and the framing doesn't fit a science-led app. Everyone
    // now keeps the standard ED-pattern threshold (the more protective
    // 2-signal setting); the advanced opt-in still lives on the Goal lock
    // screen under Coach for anyone who wants it.
    emitStepDone(4);
    setStep(5);
  }

  // The four honest stage lines, mapped to real _generatePlanInner phases.
  // Stage 2 gains a division-priorities suffix for the physique divisions
  // (it maps to applyGoalOverlay); stage 4 names the user's actual session
  // length, the single highest-leverage word, proving the labels are real.
  function sequenceStages() {
    const divisionLabel = trainingGoal && trainingGoal !== 'general' ? GOAL_LABELS[trainingGoal] : null;
    return [
      'Balancing your week',
      divisionLabel ? `Setting your starting volume - ${divisionLabel} priorities` : 'Setting your starting volume',
      'Choosing your exercises',
      `Fitting sessions to your ${sessionLengthMinutes} minutes`,
    ];
  }

  function cancelSequenceTimers() {
    stageTimersRef.current.forEach(clearTimeout);
    stageTimersRef.current = [];
  }

  function startSequence() {
    const lines = sequenceStages();
    setSequenceActive(true);
    setSequenceStage(1);
    sequenceFade.setValue(0);
    Animated.timing(sequenceFade, {
      toValue: 1, duration: motion.enter, useNativeDriver: true,
    }).start();
    AccessibilityInfo.announceForAccessibility(lines[0]);
    cancelSequenceTimers();
    const ids = [];
    for (let i = 2; i <= lines.length; i++) {
      ids.push(setTimeout(() => {
        setSequenceStage(i);
        AccessibilityInfo.announceForAccessibility(lines[i - 1]);
      }, STAGE_DWELL_MS * (i - 1)));
    }
    stageTimersRef.current = ids;
  }

  function endSequence() {
    cancelSequenceTimers();
    setSequenceActive(false);
    setSequenceStage(0);
  }

  // Tidy the stage timers if the screen unmounts mid-sequence.
  useEffect(() => cancelSequenceTimers, []);

  async function advanceFrom5() {
    if (!recoveryRating) {
      appAlert('Recovery rating', 'Please select your recovery level to continue.');
      return;
    }
    if (submittingRef.current) return;
    submittingRef.current = true;

    // Reduce Motion keeps the plain button spinner; everyone else gets the
    // staged sequence. The real work below is identical either way.
    const useSequence = !reduceMotion;
    const startedAt = Date.now();
    if (useSequence) startSequence();
    else setBusy(true);

    let planFailed = false;
    try {
      {
        // Flat schema: CoachingReminders, WeeklyCheckIn and the Coach tab
        // all read these top-level keys. The coaching loop needs both
        // reminders, so onboarding matches Settings > Coaching reminders:
        // users pick times, not on/off switches.
        const prefs = {
          morningEnabled: true,
          checkinEnabled: true,
          morningHour,
          morningMinute: 0,
          checkinDay,
          checkinHour: 12,
          checkinMinute: 0,
        };
        // OB-2: the chosen check-in day is a preference, not a notification,
        // so it persists whatever the permission dialog returns. Denying the
        // permission used to silently discard the day picked here, then the
        // check-in gate told the user to come back on the default Sunday.
        await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs)).catch(() => {});
        const status = await requestNotificationPermissions();
        if (status === 'granted') {
          await scheduleMorningWeightNotification(morningHour, 0);
          await scheduleEveningWeightReminder();
          await scheduleCheckinReminder(checkinDay, 12, 0);
          // OPP-C03: pre-lay the missed check-in follow-up pair for the
          // first check-in cycle (reads the prefs blob just saved; the
          // helper self-guards on tier, toggle and ED flag).
          try {
            // eslint-disable-next-line global-require
            const { scheduleMissedCheckinFollowups } = require('../lib/notifications');
            // eslint-disable-next-line global-require
            const { default: store } = require('../store/useAppStore');
            await scheduleMissedCheckinFollowups(store.getState().user?.id ?? null);
          } catch (_) {}
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

      if (!ACCEPTED_SEX_VALUES.includes(sex) || !Number.isFinite(bwKg) || bwKg <= 0 || !isValidHeightCm(hcm) || !ageNum || ageNum < 13 || ageNum > 100) {
        endSequence();
        setBusy(false);
        submittingRef.current = false;
        setStep(2);
        appAlert(
          'Baseline needs checking',
          'Please confirm your sex, body weight, height and age again. Volyume will not build targets from fallback body data.',
        );
        return;
      }

      const safeWeightKg = bwKg;
      // ONBOARD-001: height is gated in step 2 (advanceFrom2 + canContinue both
      // require a realistic height), so hcm is the user's confirmed entry here.
      // No 175cm fallback, a silent default would feed BMR / calorie / FFM as if
      // the user had provided it. The nutrition engine keeps its own finite-guard
      // (safeHeight clamp) for the unreachable corrupt-draft edge; the screen
      // never fabricates a plausible height that reads as user data.
      const safeHeightCm = hcm;
      const safeAge = ageNum;
      // Parse body fat as a low-confidence baseline unless it came from a
      // measured source. It can shape the first plan, but measured-only safety
      // floors still live inside nutritionEngine.
      const bfParsed = parseFloat(bodyFat);
      const bfNum = bodyFat.trim() && Number.isFinite(bfParsed) && bfParsed > 0 && bfParsed < 60 ? bfParsed : null;
      const baselineBfSource = bfNum != null ? normaliseBodyFatSource(bfSource) : null;
      // Build inputs through the shared builder so onboarding and Update Your
      // Plan can never feed the engine different shapes (the bug that made the
      // two flows disagree). Same values as before, so onboarding output is
      // unchanged.
      const nutritionTargets = calculateNutritionTargets(buildNutritionEngineInputs({
        sex,
        age: safeAge,
        heightCm: safeHeightCm,
        weightKg: safeWeightKg,
        bodyFatPct: bfNum,
        bodyFatSource: baselineBfSource,
        daysPerWeek,
        trainingPhase,
        trainingGoal,
        proteinApproach,
        experience,
      }));

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
        cardioEnabled: cardioOn,
        trainingFreq: trainingFreqBucket,
        trainingFreqBucket,
        daysPerWeek,
        experience,
        sessionLengthMinutes,
        equipment,
        recoveryRating,
        planWeakPoints,
        proteinApproach,
        // Persist body composition so later recalcs (Update Your Plan, manual
        // Nutrition Targets) read the same BF% + method onboarding used.
        bodyFatPct: bfNum,
        bodyFatSource: baselineBfSource,
        // Store the nutrition goal key alongside the phase so surfaces that read
        // userProfile.goal (Nutrition Targets summary) show the right phase
        // instead of defaulting to lean_gain.
        goal: phaseToNutritionKey(trainingPhase),
      };

      if (user?.id) await saveLocalProfile(user.id, merged);

      // (Health Connect / Apple Health connect-on-enrolment was removed with the
      // step-target feature, founder 2026-06-30.)

      if (user?.id && !isNaN(bwKg) && bwKg > 0) {
        await logBodyMetric(user.id, {
          weightKg: bwKg,
          bodyFatPercent: bfNum,
          bodyFatSource: baselineBfSource,
          loggedAt: Date.now(),
        });
        // Also seed the morning weights series so the weekly check-in
        // gate (needs 3 readings in the last 7 days) counts enrolment
        // day. Without this, a user who enrols on their chosen check-in
        // day and tries to check in is told "0 readings this week" even
        // though they just typed a weight two screens ago.
        await logMorningWeight(user.id, { weightKg: bwKg, loggedAt: Date.now() }).catch((e) => {
          // eslint-disable-next-line global-require
          try { require('../lib/errorLog').logError('ProOnboarding.logMorningWeight', e, { uid: user?.id }); } catch (_) {}
        });
      }

      if (user?.id && (sex || hcm || ageNum)) {
        await saveUserBodyProfile(user.id, {
          sex,
          heightCm: hcm,
          dateOfBirth: dateOfBirthFromAgeYears(ageNum),
          primaryGoal: trainingGoal,
        }).catch((e) => {
          // eslint-disable-next-line global-require
          try { require('../lib/errorLog').logError('ProOnboarding.saveUserBodyProfile', e, { uid: user?.id }); } catch (_) {}
        });
      }

      const nutritionData = {
        targetKcal: nutritionTargets.targetKcal,
        proteinG: nutritionTargets.proteinG,
        fatG: nutritionTargets.fatG,
        carbsG: nutritionTargets.carbsG,
        maintenanceKcal: nutritionTargets.maintenanceKcal,
      };
      // FF-005: the AsyncStorage copy is what other screens read; the DB save is
      // now awaited (not fire-and-forget) so a failure is logged rather than
      // silently dropped. Targets stay usable from AsyncStorage and sync retries
      // the cloud write, so onboarding still completes (founder decision
      // 2026-06-08: complete + retry from Home).
      await AsyncStorage.setItem('@volyume_nutrition_targets', JSON.stringify(nutritionData)).catch((e) => {
        // eslint-disable-next-line global-require
        try { require('../lib/errorLog').logError('ProOnboarding.nutritionTargetsAsyncStorage', e, { uid: user?.id }); } catch (_) {}
      });
      if (user?.id) {
        try {
          await saveNutritionTargets(user.id, nutritionData);
        } catch (e) {
          // eslint-disable-next-line global-require
          try { require('../lib/errorLog').logError('ProOnboardingScreen.saveNutritionTargets', e, { userId: user.id }); } catch (_) {}
        }
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
          // COMP-013: a failed generation must abort the sequence, three
          // seconds of "building" followed by "didn't generate" is worse than
          // a bare spinner. Flag it; the post-try block falls back to the form
          // with this alert and never plays a completion tick.
          planFailed = true;
          appAlert(
            'Plan setup didn\'t finish',
            `Your profile is saved but your training plan didn\'t generate (${planResult.error}). Open Today and choose "Start with a plan" to retry.`,
          );
        } else if (planResult.partial) {
          // FF-003: the plan generated but couldn't fulfil every requested move
          // (typically constrained equipment). Tell the user plainly.
          appAlert('Plan ready', planShortfallNote(planResult.missedCount));
        }
      }
    } catch (e) {
      appAlert('Something went wrong', e?.message ?? 'Try again.');
      endSequence();
      setBusy(false);
      submittingRef.current = false;
      return;
    }

    // Plan generation failed, but the profile + targets are saved. Abort the
    // sequence's celebratory hold instantly (no min-display pad, no completion
    // tick) and still go to the completion screen, which handles the no-plan
    // state and whose alert ("Open Today and choose Start with a plan") then reads
    // correctly. Stranding the user on the step-5 form would not.
    // OB-3: the wizard is complete either way from here, so drop the resume
    // draft (and any queued save) before leaving the screen.
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    if (user?.id) clearDraft(user.id).catch(() => {});

    if (planFailed) {
      cancelSequenceTimers();
      setBusy(false);
      submittingRef.current = false;
      navigation.replace('ProSetupComplete');
      return;
    }

    // Success: hold the sequence on its final stage until the minimum display
    // time has elapsed, so the real work (which may finish faster) never makes
    // the sequence complete before the named labour reads as real.
    if (useSequence) {
      const elapsed = Date.now() - startedAt;
      if (elapsed < SEQUENCE_TOTAL_MS) await wait(SEQUENCE_TOTAL_MS - elapsed);
    }
    setBusy(false);
    navigation.replace('ProSetupComplete');
  }

  // ── Step 1, Create account ──────────────────────────────────────────────────

  if (step === 1) {
    return (
      <SafeAreaView key="step-1" style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <ProOnboardingHeader
              step={step}
              title="Set up your Pro account safely"
              sub="Sign in once so your plan, weight history and coaching updates can be restored if you change device."
            />

            <QuestionGroup
              icon="person-circle-outline"
              title="Your account"
              sub="This keeps your Pro plan and coaching history tied to you. The training setup comes next."
            >
              {/* OAuth only (Apple on iOS, Google on Android). The email +
                  password path was removed (founder 2026-07-01); OAuth needs no
                  verification round-trip and either creates the account or signs
                  into the existing one. handleOAuthOnboarding advances to step 2
                  on success. */}
              <OAuthButtons
                onApple={() => handleOAuthOnboarding('apple')}
                onGoogle={() => handleOAuthOnboarding('google')}
                disabled={busy}
              />

              {busy ? (
                <View style={styles.oauthBusy}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : null}
            </QuestionGroup>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Step 2, Profile ─────────────────────────────────────────────────────────

  if (step === 2) {
    // Gate the Continue button on every required field (same pattern as steps
    // 3-5), so the step visibly REFUSES to advance until they are all valid.
    // Biological sex is the critical one: it must be an explicit male/female
    // choice, a null must never progress (and must never be silently defaulted
    // downstream). Body weight and age are validated to their real ranges here
    // so the button matches advanceFrom2 exactly (no enabled-but-then-alert gap).
    const step2BwKg = localBWUnits === 'st'
      ? stoneLbsToKg(bodyWeightSt, bodyWeightStLbs || '0')
      : parseBodyWeightToKg(bodyWeight, localBWUnits);
    const step2Age = parseInt(age, 10);
    // ONBOARD-001: height is a required field too. Resolve it through the same
    // shared helper advanceFrom2 uses so the button and the gate can never drift.
    const step2HeightCm = resolveHeightCm(localHeightUnits, heightCm, heightFt, heightIn);
    const canContinue =
      !!firstName.trim()
      && (sex === 'male' || sex === 'female')
      && !!step2BwKg && !Number.isNaN(step2BwKg) && step2BwKg >= 30 && step2BwKg <= 300
      && !Number.isNaN(step2Age) && step2Age >= 13 && step2Age <= 100
      && isValidHeightCm(step2HeightCm);
    return (
      <SafeAreaView key="step-2" style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <ProOnboardingHeader
              step={step}
              title="Set your starting baseline"
              sub="These details let the app set a safe starting baseline without guessing."
            />

            <QuestionGroup
              icon="person-outline"
              title="Required details"
              sub="Name, sex, age, height and body weight are the minimum safe inputs for your first targets."
            >
              <View style={styles.section}>
                <Text style={styles.fieldLabel}>First name</Text>
                <TextField accessibilityLabel="First name"
                  ref={nameRef}
                  fieldStyle={styles.inputField}
                  inputStyle={styles.input}
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
                <Text style={styles.fieldHint}>Used by the calorie formula and safety floors. This stays private.</Text>
                <SegmentedControl
                  options={SEX_OPTIONS}
                  value={sex}
                  onChange={setSex}
                  accessibilityLabel="Biological sex"
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.fieldLabel}>Age</Text>
                <Text style={styles.fieldHint}>Used with your height and weight to set your calorie targets.</Text>
                <TextField accessibilityLabel="Age"
                  fieldStyle={styles.inputField}
                  inputStyle={styles.input}
                  value={age}
                  onChangeText={setAge}
                  placeholder="e.g. 28"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={3}
                  autoComplete="off"
                  textContentType="none"
                />
              </View>

              <View style={styles.section}>
                <View style={styles.fieldLabelRow}>
                  <Text style={[styles.fieldLabel, { marginBottom: 0 }]}>Height</Text>
                  {/* UI-3: single-select controls carry radio semantics, matching
                      the shared SegmentedControl. */}
                  <View style={styles.segmentRowSmall} accessibilityRole="radiogroup" accessibilityLabel="Height units">
                    {[{ key: 'imperial', label: 'ft + in' }, { key: 'metric', label: 'cm' }].map(u => (
                      <TouchableOpacity
                        key={u.key}
                        style={[styles.segmentSmall, localHeightUnits === u.key && styles.segmentActive]}
                        onPress={() => setLocalHeightUnits(u.key)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: localHeightUnits === u.key }}
                        accessibilityLabel={u.label}
                      >
                        <Text style={[styles.segmentTextSmall, localHeightUnits === u.key && styles.segmentTextActive]}>
                          {u.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <Text style={styles.fieldHint}>Used with your weight and age to set your calorie targets.</Text>
                {localHeightUnits === 'imperial' ? (
                  <View style={styles.heightImperialRow}>
                    <View style={styles.inputHalf}>
                      <TextField accessibilityLabel="Height feet"
                        fieldStyle={styles.inputField}
                        inputStyle={styles.input}
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
                    <View style={styles.inputHalf}>
                      <TextField accessibilityLabel="Height inches"
                        fieldStyle={styles.inputField}
                        inputStyle={styles.input}
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
                  <TextField accessibilityLabel="Height in centimetres"
                    fieldStyle={styles.inputField}
                    inputStyle={styles.input}
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
                <SegmentedControl
                  options={[
                    { label: 'Stone+lbs', value: 'st' },
                    { label: 'kg', value: 'kg' },
                    { label: 'lbs', value: 'lbs' },
                  ]}
                  value={localBWUnits}
                  onChange={setLocalBWUnits}
                  accessibilityLabel="Body weight units"
                />
              </View>

              <View style={styles.sectionLast}>
                <Text style={styles.fieldLabel}>Current body weight</Text>
                <Text style={styles.fieldHint}>
                  This sets your starting trend and first calorie target. Update it from Today once setup is complete.
                </Text>
                {localBWUnits === 'st' ? (
                  <View style={styles.heightImperialRow}>
                    <View style={styles.inputStone}>
                      <TextField accessibilityLabel="Current body weight in stones"
                        fieldStyle={styles.inputField}
                        inputStyle={styles.input}
                        value={bodyWeightSt}
                        onChangeText={setBodyWeightSt}
                        placeholder="e.g. 12 st"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="number-pad"
                        maxLength={3}
                        autoComplete="off"
                        textContentType="none"
                      />
                    </View>
                    <View style={styles.inputPounds}>
                      <TextField accessibilityLabel="Current body weight remaining pounds"
                        fieldStyle={styles.inputField}
                        inputStyle={styles.input}
                        value={bodyWeightStLbs}
                        onChangeText={setBodyWeightStLbs}
                        placeholder="e.g. 0 lbs"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="decimal-pad"
                        maxLength={4}
                        autoComplete="off"
                        textContentType="none"
                      />
                    </View>
                  </View>
                ) : (
                  <TextField accessibilityLabel={`Current body weight in ${localBWUnits}`}
                    fieldStyle={styles.inputField}
                    inputStyle={styles.input}
                    value={bodyWeight}
                    onChangeText={setBodyWeight}
                    placeholder={localBWUnits === 'kg' ? 'e.g. 80 kg' : 'e.g. 176 lbs'}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    autoComplete="off"
                    textContentType="none"
                  />
                )}
              </View>
            </QuestionGroup>

            <QuestionGroup
              icon="analytics-outline"
              title="Starting body composition"
              sub="Your best current estimate helps the first plan. Progress Photos can refine physique change later with your Volyume Score."
            >
              <View style={styles.sectionLast}>
                <Text style={styles.fieldLabel}>Body fat estimate % (optional)</Text>
                <Text style={styles.fieldHint}>
                  Enter your best current estimate or a measured value. Leave it blank only if you genuinely do not know.
                </Text>
                <TextField
                  fieldStyle={styles.inputField}
                  inputStyle={styles.input}
                  value={bodyFat}
                  onChangeText={setBodyFat}
                  placeholder="e.g. 15"
                  placeholderTextColor={colors.textDisabled}
                  keyboardType="decimal-pad"
                  maxLength={4}
                  autoComplete="off"
                  textContentType="none"
                  accessibilityLabel="Starting body fat estimate percentage, optional"
                />
                {bodyFat.trim() ? (
                  <View style={{ marginTop: spacing.sm }}>
                    {/* U-E-1: gloss the body fat method abbreviations (BIA/Caliper/DEXA). */}
                    <View style={styles.measuredRow}>
                      <Text style={styles.fieldHint}>Estimate source</Text>
                      <InfoTooltip text={GLOSSARY.bodyFatMethod} size={13} />
                    </View>
                    <SegmentedControl
                      options={BODY_FAT_SOURCE_OPTIONS}
                      value={bfSource}
                      onChange={setBfSource}
                      accessibilityLabel="Body fat estimate source"
                    />
                  </View>
                ) : null}
              </View>
            </QuestionGroup>

            {!canContinue ? (
              <Text style={styles.continueHint}>Complete your name, sex, age, height and body weight to continue.</Text>
            ) : null}

            <Button
              title="Continue"
              trailingIcon="arrow-forward"
              style={[styles.primaryBtn, !canContinue && styles.primaryBtnDisabled]}
              onPress={canContinue ? advanceFrom2 : undefined}
              disabled={!canContinue}
              textStyle={styles.primaryBtnText}
              accessibilityLabel="Continue"
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Step 3, Training setup (logistics) ──────────────────────────────────────

  if (step === 3) {
    const canContinue = !!experience && !!sessionLengthMinutes && !!equipment;

    return (
      <SafeAreaView key="step-3" style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <ProOnboardingHeader
              step={step}
              title="Shape your training week"
              sub="The plan should fit your real week, not the week you wish you had."
              onBack={goBack}
            />

            <QuestionGroup
              icon="barbell-outline"
              title="Plan fit"
              sub="These answers choose the starting split, exercise pool and weekly workload."
            >
              <View style={styles.section}>
                <Dropdown
                  label="Training experience"
                  hint="This sets your starting volume and how complex the exercises are."
                  tip={GLOSSARY.volume}
                  value={experience}
                  options={EXPERIENCE_OPTIONS}
                  onChange={setExperience}
                  placeholder="Select your experience"
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.fieldLabel}>Session length</Text>
                <Text style={styles.fieldHint}>Pick the time you can usually finish, including warm-ups.</Text>
                <SegmentedControl
                  options={SESSION_LENGTH_OPTIONS}
                  value={sessionLengthMinutes}
                  onChange={setSessionLengthMinutes}
                  accessibilityLabel="Session length"
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.fieldLabel}>Training days per week</Text>
                <Text style={styles.fieldHint}>Choose the number of days you can repeat most weeks.</Text>
                <SegmentedControl
                  options={DAYS_PER_WEEK_OPTIONS.map(d => ({ label: String(d), value: d }))}
                  value={daysPerWeek}
                  onChange={setDaysPerWeek}
                  accessibilityLabel="Training days per week"
                />
              </View>

              <View style={styles.sectionLast}>
                <Dropdown
                  label="Equipment"
                  hint="Choose what you normally have access to, so swaps and exercise choices make sense."
                  value={equipment}
                  options={EQUIPMENT_OPTIONS}
                  onChange={setEquipment}
                  placeholder="Select your equipment"
                />
              </View>
            </QuestionGroup>

            {!canContinue ? (
              <Text style={styles.continueHint}>Choose your experience and equipment to continue.</Text>
            ) : null}

            <Button
              title="Continue"
              trailingIcon="arrow-forward"
              style={[styles.primaryBtn, !canContinue && styles.primaryBtnDisabled]}
              onPress={canContinue ? advanceFrom3 : undefined}
              disabled={!canContinue}
              textStyle={styles.primaryBtnText}
              accessibilityLabel="Continue"
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Step 4, Goal ────────────────────────────────────────────────────────────

  if (step === 4) {
    const goalOptions = PHYSIQUE_GOALS.map(g => ({ value: g.value, label: g.label, sub: g.subtitle }));
    const canContinue = !!trainingGoal && !!trainingPhase;

    // A3 (audit 04 §4): the moment a focus is chosen, show the provisional
    // energy target from the SAME pure engine call the final plan uses.
    // Display only, nothing persists until the wizard completes; the copy
    // says "provisionally" because steps 5's inputs can still move it.
    let provisionalKcal = null;
    if (trainingPhase && sex) {
      try {
        const bwKg = localBWUnits === 'st'
          ? stoneLbsToKg(bodyWeightSt, bodyWeightStLbs)
          : parseBodyWeightToKg(bodyWeight, localBWUnits);
        const hcm = localHeightUnits === 'imperial'
          ? (!isNaN(parseInt(heightFt, 10)) ? ftInToCm(heightFt, heightIn) : null)
          : (parseFloat(heightCm) || null);
        const ageNum = parseInt(age, 10) || null;
        if (!isNaN(bwKg) && bwKg > 0 && hcm && ageNum) {
          const bfParsed = parseFloat(bodyFat);
          const bfNum = bodyFat.trim() && Number.isFinite(bfParsed) && bfParsed > 0 && bfParsed < 60 ? bfParsed : null;
          const t = calculateNutritionTargets(buildNutritionEngineInputs({
            sex,
            age: ageNum,
            heightCm: hcm,
            weightKg: bwKg,
            bodyFatPct: bfNum,
            bodyFatSource: bfNum != null ? normaliseBodyFatSource(bfSource) : null,
            daysPerWeek,
            trainingPhase,
            trainingGoal,
            proteinApproach,
            experience,
          }));
          provisionalKcal = t?.targetKcal ?? null;
        }
      } catch (_) { provisionalKcal = null; }
    }

    return (
      <SafeAreaView key="step-4-goal" style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <ProOnboardingHeader
              step={step}
              title="Set your training focus"
              sub="Your goal sets the calorie direction, training bias and nutrition target."
              onBack={goBack}
            />

            {/* Primary question, single source of truth for what the
                current block is doing. Drives calories, plan structure,
                weak-point spec, and strength-size emphasis. */}
            <QuestionGroup
              icon="flag-outline"
              title="Goal and targets"
              sub="Start with the broad goal. Competitive category and weak points are optional refinements."
            >
              <View style={styles.section}>
                <Dropdown
                  label="What are you focused on right now?"
                  hint="This drives your calorie target and how your plan is built."
                  tip={GLOSSARY.phase}
                  value={trainingPhase}
                  options={TRAINING_PHASES.map(p => ({ value: p.value, label: p.label, sub: p.detail }))}
                  onChange={setTrainingPhase}
                  placeholder="Choose your focus"
                />
                {provisionalKcal ? (
                  <Text style={styles.provisionalKcal}>
                    Provisionally about {provisionalKcal.toLocaleString('en-GB')} kcal a day for this focus. Your exact targets are set when your plan is built.
                  </Text>
                ) : null}
              </View>

              {/* Secondary, optional, only matters for competitive lifters
                  chasing a specific physique category. Defaults to 'general'
                  (balanced volume) for everyone else. */}
              <View style={styles.section}>
                <Dropdown
                  label="Competing in a category? (optional)"
                  hint="Only if you are chasing a competitive physique. It biases the plan towards the muscles that category is judged on."
                  tip={GLOSSARY.division}
                  value={trainingGoal}
                  options={goalOptions}
                  onChange={changeGoal}
                  placeholder="Not competing, General"
                />
              </View>

              {/* Weak points, division-scoped. The options shown are the ones
                  this division is judged on (or commonly brings up). Picking none
                  is fine, it just means a balanced plan. */}
              {GOALS_WITH_WEAK_POINTS.includes(trainingGoal) && (
                <View style={styles.wpSection}>
                  <Text style={styles.wpLabel}>
                    Anything to bring up? <Text style={styles.wpOptional}>(optional, up to 3)</Text>
                  </Text>
                  <Text style={styles.wpHint}>
                    Pick one to three muscles you want to bring up. Not sure? Leave it blank for a balanced plan.
                  </Text>
                  <View style={styles.wpGrid}>
                    {weakPointSetForGoal(trainingGoal).map(muscle => (
                      <Chip
                        key={muscle}
                        label={muscle}
                        selected={planWeakPoints.includes(muscle)}
                        onPress={() => toggleWeakPoint(muscle)}
                      />
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.sectionLast}>
              <TouchableOpacity
                style={styles.proteinHead}
                onPress={() => setProteinOpen(v => !v)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ expanded: proteinOpen }}
                accessibilityLabel={`Protein target, ${PROTEIN_APPROACHES[proteinApproach]?.label}. Tap to change.`}
              >
                <View style={styles.proteinCopy}>
                  <View style={styles.measuredRow}>
                    <Text style={styles.fieldLabel}>Protein target</Text>
                    {/* U-E-1: gloss the Standard/Optimised/Advanced protein tiers. */}
                    <InfoTooltip text={GLOSSARY.proteinTier} size={13} />
                  </View>
                  <Text style={styles.fieldHint}>
                    {PROTEIN_APPROACHES[proteinApproach]?.label} - {PROTEIN_APPROACHES[proteinApproach]?.range}. Set for you, tap to change.
                  </Text>
                </View>
                <Ionicons name={proteinOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
              </TouchableOpacity>

              {proteinOpen && (
                <View style={styles.proteinOptions} accessibilityRole="radiogroup" accessibilityLabel="Protein target">
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
                        accessibilityRole="radio"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={`${opt.label}, ${opt.range}${recommended ? ', recommended' : ''}`}
                      >
                        <View style={styles.proteinOptionCopy}>
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
            </QuestionGroup>

            <Button
              title="Continue"
              trailingIcon="arrow-forward"
              style={[styles.primaryBtn, !canContinue && styles.primaryBtnDisabled]}
              onPress={canContinue ? advanceFrom4 : undefined}
              disabled={!canContinue}
              textStyle={styles.primaryBtnText}
              accessibilityLabel="Continue"
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Step 5, Recovery & reminders ───────────────────────────────────────────

  if (step === 5) {
    const canContinue = !!recoveryRating;

    // COMP-013: the staged setup sequence replaces the dead
    // button spinner. Same header furniture (brand row + a now-full progress
    // bar), no new route, so a failure can fall back to the form below.
    if (sequenceActive) {
      const lines = sequenceStages();
      return (
        <SafeAreaView key="step-5-building" style={styles.safe}>
          <ScrollView contentContainerStyle={styles.seqScroll} keyboardShouldPersistTaps="handled">
            <Animated.View style={[styles.seqWrap, { opacity: sequenceFade }]}>
              <View style={styles.brandRow}>
                <VolyumeIcon size={22} />
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>PRO</Text>
                </View>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: '100%' }]} />
              </View>
              <View style={styles.seqPanel}>
                <View style={styles.seqHeroRow}>
                  <View style={styles.seqHeroIcon}>
                    <Ionicons name="clipboard-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.seqHeroCopy}>
                    <Text style={styles.seqHeading}>Building your first plan</Text>
                    <Text style={styles.seqSub}>
                      Using your body data, goal, training week and recovery to set a sensible starting point.
                    </Text>
                  </View>
                </View>
                <View style={styles.seqList} accessibilityLiveRegion="polite">
                  {lines.slice(0, sequenceStage).map((line, i) => {
                    const isCurrent = i === sequenceStage - 1;
                    return (
                      <View key={i} style={styles.seqRow}>
                        {isCurrent ? (
                          <ActivityIndicator size="small" color={colors.primary} style={styles.seqIcon} />
                        ) : (
                          <Ionicons name="checkmark-circle" size={20} color={colors.primary} style={styles.seqIcon} />
                        )}
                        <Text style={styles.seqLine}>{line}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView key="step-5" style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <ProOnboardingHeader
            step={step}
            title="Recovery and reminders"
            sub="Recovery affects your plan volume. Reminders keep coaching consistent."
            onBack={goBack}
          />

          <View style={styles.coachCard}>
            <View style={styles.coachCardHead}>
              <View style={styles.notifIconWrap}>
                <Ionicons name="git-branch-outline" size={18} color={colors.primary} />
              </View>
              <Text style={styles.coachCardTitle}>How your coaching works</Text>
            </View>
            <Text style={styles.coachCardBody}>
              Volyume uses your morning weigh-ins and weekly check-in to shape coaching. Food logging helps refine it, and the app stays cautious when data is missing.
            </Text>
          </View>

          <View style={styles.section}>
            {/* U-E-1/A6: glosses "volume" for both this field's hint AND the
                Header sub above ("Recovery affects your plan volume..."),
                the Header carries no field label of its own to anchor a
                tooltip to, so it shares this one on the field immediately
                below it, per the existing bodyFatMethod/phase/division/
                proteinTier pattern. */}
            <Dropdown
              label="How's your recovery?"
              hint="Be honest here. This sets how much volume your plan includes, so it can protect your recovery."
              tip={GLOSSARY.volume}
              value={recoveryRating}
              options={RECOVERY_OPTIONS}
              onChange={setRecoveryRating}
              placeholder="Select your recovery"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.fieldLabel}>Coaching reminders</Text>
            <Text style={styles.fieldHint}>Pick a morning time and weekly check-in day. Change them any time in your coaching reminder settings.</Text>

            <View style={styles.notifSection}>
              <View style={styles.notifHeader}>
                <View style={styles.notifIconWrap}>
                  <Ionicons name="scale-outline" size={18} color={colors.primary} />
                </View>
                <View style={styles.notifCopy}>
                  <Text style={styles.notifTitle}>Morning weight reminder</Text>
                  <Text style={styles.notifSub}>
                    A quick morning weigh-in gives a cleaner trend than occasional scale checks.
                  </Text>
                </View>
                <View style={styles.requiredPill} accessibilityLabel="Required coaching reminder">
                  <Text style={styles.requiredPillText}>Required</Text>
                </View>
              </View>

              <View style={styles.timeRow}>
                <Text style={styles.timeLabel}>Remind me at</Text>
                <View accessibilityRole="radiogroup" accessibilityLabel="Morning weight reminder time">
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
                      accessibilityRole="radio"
                      accessibilityState={{ checked: morningHour === h }}
                      accessibilityLabel={`Remind me at ${fmt12(h)}`}
                    >
                      <Text style={[styles.hourChipText, morningHour === h && styles.hourChipTextActive]}>
                        {fmt12(h)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                </View>
              </View>
            </View>

            <View style={styles.notifSection}>
              <View style={styles.notifHeader}>
                <View style={styles.notifIconWrap}>
                  <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                </View>
                <View style={styles.notifCopy}>
                  <Text style={styles.notifTitle}>Weekly check-in reminder</Text>
                  <Text style={styles.notifSub}>
                    Pick the day you are most likely to review training, food and recovery honestly.
                  </Text>
                </View>
                <View style={styles.requiredPill} accessibilityLabel="Required coaching reminder">
                  <Text style={styles.requiredPillText}>Required</Text>
                </View>
              </View>

              <View style={styles.timeRow}>
                <Text style={styles.timeLabel}>Check in on</Text>
                <View accessibilityRole="radiogroup" accessibilityLabel="Weekly check-in day">
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
                      accessibilityRole="radio"
                      accessibilityState={{ checked: checkinDay === i }}
                      accessibilityLabel={`Check in on ${d}`}
                    >
                      <Text style={[styles.hourChipText, checkinDay === i && styles.hourChipTextActive]}>
                        {d.slice(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.fieldLabel}>Cardio</Text>
            <Text style={styles.fieldHint}>Make cardio available as a logging option. It is not added to your plan by default.</Text>

            <View style={styles.notifSection}>
              <View style={styles.notifHeader}>
                <View style={styles.notifIconWrap}>
                  <Ionicons name="heart-outline" size={18} color={colors.primary} />
                </View>
                <View style={styles.notifCopy}>
                  <Text style={styles.notifTitle}>Cardio</Text>
                  <Text style={styles.notifSub}>
                    {cardioOn
                      ? 'On. You can log cardio if you do it. The plan only uses it when it is genuinely needed.'
                      : 'Off. No cardio logging or library. Turn it on any time in Settings.'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.toggle, cardioOn && styles.toggleOn]}
                  onPress={() => setCardioOn(v => !v)}
                  hitSlop={hitSlop}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: cardioOn }}
                  accessibilityLabel="Make cardio available"
                >
                  <View style={[styles.toggleThumb, cardioOn && styles.toggleThumbOn]} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {!canContinue ? (
            <Text style={styles.continueHint}>Choose your recovery rating to finish setup.</Text>
          ) : null}

          <Button
            title="Continue"
            trailingIcon="arrow-forward"
            style={[styles.primaryBtn, (!canContinue || busy) && styles.primaryBtnDisabled]}
            onPress={canContinue && !busy ? advanceFrom5 : undefined}
            disabled={!canContinue || busy}
            loading={busy}
            textStyle={styles.primaryBtnText}
            accessibilityLabel="Continue"
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxxl },

  // Header
  headerBlock: { marginBottom: spacing.lg },
  brandRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginBottom: spacing.md,
  },
  proBadge: {
    backgroundColor: colors.primary, borderRadius: 4,
    paddingHorizontal: 7, paddingVertical: spacing.xxs,
  },
  proBadgeText: {
    fontSize: fontSize.micro, fontWeight: fontWeight.black,
    color: colors.onPrimary,
  },

  progressTrack: {
    height: 3, borderRadius: radius.hair, backgroundColor: colors.border,
    overflow: 'hidden', marginBottom: spacing.sm,
  },
  progressFill: { height: '100%', borderRadius: radius.hair, backgroundColor: colors.primary },

  stepCount: { ...type.num('caption'), color: colors.textMuted, marginBottom: spacing.xs },
  stepTitle: {
    fontSize: fontSize.xxl, fontWeight: fontWeight.bold,
    color: colors.textPrimary, marginBottom: spacing.sm, lineHeight: 30,
  },
  stepSub: { ...type.bodySm, color: colors.textSecondary, lineHeight: 20 },
  outcomeCard: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  outcomeEyebrow: {
    ...type.caption,
    color: colors.textMuted,
    fontWeight: fontWeight.semibold,
  },
  outcomeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  outcomeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: colors.primaryBg,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    maxWidth: '100%',
  },
  outcomeChipText: { ...type.caption, color: colors.textPrimary, flexShrink: 1 },

  // COMP-013 plan setup sequence (replaces the step-5 button spinner).
  seqScroll: {
    flexGrow: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  seqWrap: { width: '100%', gap: spacing.lg },
  seqPanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  seqHeroRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  seqHeroIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seqHeroCopy: { flex: 1, minWidth: 0 },
  seqHeading: {
    ...type.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  seqSub: {
    ...type.bodySm,
    color: colors.textSecondary,
  },
  seqList: { gap: spacing.sm },
  seqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 34,
  },
  seqIcon: { width: 22, alignItems: 'center' },
  seqLine: { ...type.bodySm, flex: 1, color: colors.textPrimary },

  // Back affordance, inline at the left of the brand row so it reads as part of
  // the header chrome instead of floating above the logo. Negative left margin
  // pulls the chevron to the content edge so it lines up with the page padding.
  brandBack: { marginLeft: -spacing.xs, marginRight: spacing.xxs },

  // Sections / inputs
  section: { marginBottom: spacing.xl },
  sectionLast: { marginBottom: 0 },
  questionGroup: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  questionGroupHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  questionGroupIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  questionGroupCopy: { flex: 1, minWidth: 0 },
  questionGroupTitle: { ...type.bodyStrong, color: colors.textPrimary, marginBottom: spacing.xxs },
  questionGroupSub: { ...type.captionTight, color: colors.textSecondary },
  continueHint: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
    color: colors.textMuted, marginBottom: spacing.sm,
  },
  fieldHint: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 18, marginBottom: spacing.sm },
  // A3: provisional energy line under the focus dropdown (step 4).
  provisionalKcal: {
    fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: 18, marginTop: spacing.xs,
  },
  measuredRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  // Protein target collapsible (step 3). Collapsed by default, the header
  // shows the chosen tier; expanding reveals the three tiers to pick from.
  proteinHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48 },
  proteinCopy: { flex: 1, minWidth: 0 },
  proteinOptions: { marginTop: spacing.sm, gap: spacing.sm },
  proteinOpt: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border, padding: spacing.md,
    minHeight: 64,
  },
  proteinOptionCopy: { flex: 1, minWidth: 0 },
  proteinOptActive: { borderColor: colors.primary },
  proteinOptTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xxs, flexWrap: 'wrap' },
  proteinOptLabel: { ...type.bodyStrong, color: colors.textPrimary },
  proteinOptRange: { fontSize: fontSize.xs, color: colors.textMuted },
  proteinOptDesc: { ...type.captionTight, color: colors.textSecondary },
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
    color: colors.textMuted, marginBottom: spacing.xs,
  },
  wpOptional: { color: colors.textMuted, fontWeight: fontWeight.regular },
  wpHint: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 18, marginBottom: spacing.md },
  wpGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  inputField: { borderRadius: radius.md },
  input: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    fontSize: fontSize.md,
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

  heightImperialRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  inputHalf: { flex: 1, minWidth: 140 },
  inputStone: { flex: 2, minWidth: 120 },
  inputPounds: { flex: 3, minWidth: 120 },

  fieldLabelRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.sm,
  },
  segmentRowSmall: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, padding: spacing.xxs,
    flexShrink: 0,
  },
  segmentSmall: {
    paddingVertical: spacing.xs, paddingHorizontal: spacing.sm,
    borderRadius: radius.sm - 2, alignItems: 'center',
  },
  segmentTextSmall: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted },

  // Shared by the compact height-units toggle (ft+in / cm). The full-width
  // sex and body-weight-unit pickers now use the shared SegmentedControl.
  segmentActive: { backgroundColor: colors.primary },
  segmentTextActive: { color: colors.onPrimary },

  // Notifications
  notifSection: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.md,
  },
  notifHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  notifCopy: { flex: 1, minWidth: 0 },
  notifIconWrap: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  notifTitle: { ...type.bodyStrong, color: colors.textPrimary, marginBottom: spacing.xxs },
  notifSub: { ...type.captionTight, color: colors.textMuted },
  requiredPill: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: withAlpha(colors.primary, 0.188),
    backgroundColor: colors.primaryBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    alignSelf: 'flex-start',
  },
  requiredPillText: { ...type.caption, color: colors.primary, fontWeight: fontWeight.semibold },

  coachCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.xl,
  },
  coachCardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  coachCardTitle: { ...type.bodyStrong, color: colors.textPrimary },
  coachCardBody: { ...type.bodySm, color: colors.textSecondary },

  toggle: {
    width: 48, height: 28, borderRadius: 14,
    backgroundColor: colors.surface3, justifyContent: 'center', paddingHorizontal: 3,
  },
  toggleOn: { backgroundColor: colors.primary },
  toggleThumb: { width: 20, height: 20, borderRadius: radius.md, backgroundColor: colors.textMuted },
  toggleThumbOn: { backgroundColor: colors.background, alignSelf: 'flex-end' },

  timeRow: { marginTop: spacing.md },
  timeLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: spacing.sm },
  hourScroll: { flexGrow: 0 },
  hourScrollContent: { gap: spacing.xs, paddingRight: spacing.sm },
  hourChip: {
    minHeight: 48,
    paddingHorizontal: spacing.md + 1, paddingVertical: 8,
    borderRadius: radius.full, backgroundColor: colors.surface2,
    borderWidth: 1, borderColor: colors.border,
    justifyContent: 'center',
  },
  hourChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  hourChipText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.medium },
  hourChipTextActive: { color: colors.onPrimary, fontWeight: fontWeight.bold },

  // Beta offer card
  offerCard: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    borderWidth: 2, borderColor: colors.primary,
    padding: spacing.lg, marginBottom: spacing.xl,
    ...shadow.glow,
  },
  offerBadgeRow: { marginBottom: spacing.sm },
  offerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start', backgroundColor: colors.primary,
    borderRadius: 4, paddingHorizontal: spacing.sm, paddingVertical: 3,
  },
  offerBadgeText: { fontSize: fontSize.micro, fontWeight: fontWeight.black, color: colors.onPrimary },
  offerHeadline: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary, marginBottom: spacing.sm, lineHeight: 26 },
  offerBody: { ...type.bodySm, color: colors.textSecondary, marginBottom: spacing.md },
  offerPerks: { gap: spacing.xs },
  offerPerk: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  offerPerkText: { fontSize: fontSize.sm, color: colors.textSecondary },

  // Buttons
  primaryBtn: {
    borderRadius: radius.lg,
    paddingVertical: spacing.lg + 2,
    marginBottom: spacing.md,
  },
  primaryBtnText: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.onPrimary },
  primaryBtnDisabled: { opacity: 0.4 },
  oauthBusy: { alignItems: 'center', paddingVertical: spacing.lg },
  skipBtn: { alignItems: 'center', paddingVertical: spacing.md },
  skipBtnText: { fontSize: fontSize.sm, color: colors.textMuted },
  skipNote: {
    textAlign: 'center', fontSize: fontSize.xs,
    color: colors.textDisabled, lineHeight: 18, marginTop: spacing.xs,
  },
});
