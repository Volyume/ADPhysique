/**
 * HowYouTrainAddScreen - the "Add something" wizard for How you train
 * (flow audit 2026-09-03; ruling D133).
 *
 * The add flow used to be a card that replaced its own button in the
 * middle of the settings page: no title, no step count, no Back on eight
 * of nine stages, no Cancel until the consent card, a readback that
 * restated only the rule labels, and a plan decision that arrived
 * afterwards as a modal nobody had been told was coming (AUDIT.md
 * section 1.1). It is now its own screen. Every step has the same shape:
 * a title bar that says what this is ("Add something"), a progress line
 * that says where you are ("Step 2 of 5"), ONE question as the heading,
 * one line under it saying what happens next, the options, and a footer
 * with a single primary action. Back steps back; Cancel is always there;
 * the check step restates every answer with a Change link; the plan
 * question is the last step of the flow, not a surprise; and it ends on
 * a screen that says what was saved and what happens next.
 *
 * Laws kept (section 0.4 of the audit): the role is always asked (a
 * directory preselect only suggests one, GC-D1); an allowance is the
 * user's own call and always baseline; every write goes through the one
 * consent-gated door (createConstraints); nothing is applied to a plan
 * without a named answer ("Not now" is the decline word, "Leave it as it
 * is" the no-op, one phrase per meaning); failed reads are told, never
 * rendered as "nothing to decide"; no diagnosis vocabulary anywhere.
 * Free tier (CAP-19): registered unguarded beside HowYouTrain.
 */
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch, AccessibilityInfo, findNodeHandle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import useTheme from '../hooks/useTheme';
import useAppStore from '../store/useAppStore';
import { type, spacing, radius, iconSize } from '../styles/theme';
import { touchTarget } from '../styles/layout';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import OptionCard from '../components/OptionCard';
import Card from '../components/Card';
import TextField from '../components/TextField';
import PressableCard from '../components/PressableCard';
import Chip from '../components/Chip';
import { useToast } from '../components/Toast';
import { appAlert } from '../components/AppAlert';
import { SettingRow, settingsStyles, useSettingsStyles } from '../components/SettingsPrimitives';
import * as haptics from '../lib/haptics';
import { logError } from '../lib/errorLog';
import { getAllExercises, uid } from '../lib/database';
import { movementFamily, familyLabel } from '../lib/exercise/movementFamily';
import { createConstraints, createConstraint, hasCapabilityConsent } from '../lib/capability/store';
import { grantCapabilityConsent } from '../lib/consent/capabilityConsent';
import { DEMAND_AXES, CONSTRAINT_ROLE, LATERALITY } from '../lib/capability/model';
import {
  ADD_STEP, ADD_KIND, KIND_OPTIONS, ROLE_OPTIONS, START_CHOICES, END_CHOICES,
  emptyDraft, applyPreselect, planSteps, stepPosition, nextStep, prevStep, canContinue,
  draftTouched, sideQuestion, summaryLines, draftRows, draftSubject, savedSentence,
  whatHappensNext,
} from '../lib/capability/addFlow';
import { commitLineChoices, keepsClinicianLine } from '../lib/capability/lineChoices';

// One icon per demand axis, from the app's existing vocabulary, so the
// WHICH step reads at a glance rather than as ten identical rows.
const AXIS_ICONS = {
  standing: 'walk-outline',
  floor_access: 'arrow-down-outline',
  overhead_position: 'arrow-up-outline',
  grip_bar: 'hand-left-outline',
  bilateral_upper: 'body-outline',
  bilateral_lower: 'footsteps-outline',
  axial_load: 'fitness-outline',
  impact: 'flash-outline',
  balance_high: 'accessibility-outline',
  weight_bearing_hands: 'hand-right-outline',
};

// The Article 9 moment. The words are the lane's own (unchanged); only
// their position in the flow and the button labels changed: "Agree and
// save" says it saves, "Leave it for now" says the answers are not kept.
const CONSENT_BODY = 'To build training around your body, Volyume stores what you choose here: the training situations you have asked it to work around, whether each is part of your normal setup or temporary, and when it applies. That counts as health information, so it needs your explicit agreement. It is never used for anything else and never shared with anyone beyond the secure EU service that stores your Volyume data, and you can see, export or delete all of it here at any time. Deleting it does not touch your account.';

const SIDE_HELP = 'If it is one side, Volyume can still include movements you can do one side at a time. It plans them as normal, and how you work them is up to you.';

// Round 8 (R8-2) fail-safe sentence, shared with the settings home.
const failSafeSentence = (n) => (n === 1
  ? 'One of your sessions would be left with nothing to do, so Volyume keeps it as it is rather than serve an empty session.'
  : `${n} of your sessions would be left with nothing to do, so Volyume keeps them as they are rather than serve empty sessions.`);

export default function HowYouTrainAddScreen() {
  const t = useTheme();
  const live = useSettingsStyles();
  const navigation = useNavigation();
  const route = useRoute();
  const toast = useToast();
  const userId = useAppStore((s) => s.user?.id);
  const preselect = route.params?.preselect ?? null;

  const [draft, setDraft] = useState(() => emptyDraft(preselect));
  const [consented, setConsented] = useState(null);
  const [library, setLibrary] = useState([]);
  const [step, setStep] = useState(null);
  const [familyQuery, setFamilyQuery] = useState('');
  const [exerciseQuery, setExerciseQuery] = useState('');
  const [busy, setBusy] = useState(false);
  // Post-save state: what was written and what the plan step found.
  const [saved, setSaved] = useState(null);
  const [plan, setPlan] = useState(null);
  const [showLines, setShowLines] = useState(false);
  const headingRef = useRef(null);
  const scrollRef = useRef(null);
  const preselectApplied = useRef(false);

  const ctx = useMemo(() => ({ consented: consented !== false }), [consented]);

  // ── Loads ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    hasCapabilityConsent(userId).then(setConsented).catch(() => setConsented(false));
    getAllExercises().then((rows) => setLibrary(rows ?? [])).catch(() => {});
  }, [userId]);

  // A preselect with exercise names waits for the library so names resolve
  // (the contract TrainingConsiderationsScreen and ActiveWorkoutScreen
  // both rely on). Applied once.
  useEffect(() => {
    if (preselectApplied.current || !preselect) return;
    if (preselect.kind === 'exercise' && !library.length) return;
    preselectApplied.current = true;
    setDraft((d) => applyPreselect(d, preselect, library));
  }, [preselect, library]);

  // The first step, once consent is known (it decides whether the consent
  // step is on the path and therefore the total) and, for a preselect, once
  // the suggestion has been applied - otherwise an exercise preselect would
  // open on WHICH (asking what the directory already answered) and drop
  // that step from under the person the moment the library resolved.
  const [ready, setReady] = useState(!preselect);
  useEffect(() => {
    if (preselect && preselectApplied.current) setReady(true);
  }, [preselect, draft]);
  useEffect(() => {
    if (step || consented === null || !ready) return;
    setStep(planSteps(draft, ctx)[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consented, ready]);

  // ── Focus and announcement on every step ──────────────────────────────
  const stepTitle = useMemo(() => headingFor(step, draft, saved), [step, draft, saved]);
  useEffect(() => {
    if (!step) return;
    scrollRef.current?.scrollTo?.({ y: 0, animated: false });
    const pos = stepPosition(draft, step, ctx);
    const where = pos.index ? `Step ${pos.index} of ${pos.total}. ` : '';
    AccessibilityInfo.announceForAccessibility(`${where}${stepTitle}`);
    const node = headingRef.current ? findNodeHandle(headingRef.current) : null;
    if (node) {
      // Let the new content mount before moving focus.
      setTimeout(() => { try { AccessibilityInfo.setAccessibilityFocus(node); } catch (_) { /* best effort */ } }, 80);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ── Back, Cancel, hardware back ───────────────────────────────────────
  const leave = useCallback(() => {
    navigation.setParams({ preselect: undefined });
    navigation.goBack();
  }, [navigation]);

  const confirmLeave = useCallback(() => {
    if (!draftTouched(draft)) { leave(); return; }
    appAlert('Leave without saving?', 'Your answers here will not be kept.', [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: leave },
    ]);
  }, [draft, leave]);

  const leavingRef = useRef(false);
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (leavingRef.current || saved) return;
      const prev = step ? prevStep(draft, step, ctx) : null;
      e.preventDefault();
      if (prev) { setStep(prev); return; }
      if (!draftTouched(draft)) { leavingRef.current = true; navigation.dispatch(e.data.action); return; }
      appAlert('Leave without saving?', 'Your answers here will not be kept.', [
        { text: 'Keep going', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => { leavingRef.current = true; navigation.dispatch(e.data.action); } },
      ]);
    });
    return unsub;
  }, [navigation, draft, step, ctx, saved]);

  const goBackStep = () => {
    haptics.selection();
    const prev = step ? prevStep(draft, step, ctx) : null;
    if (prev) setStep(prev); else confirmLeave();
  };

  const goNext = () => {
    haptics.selection();
    const n = nextStep(draft, step, ctx);
    if (n) setStep(n);
  };

  // ── The write ─────────────────────────────────────────────────────────
  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const nowMs = Date.now();
      const groupId = uid();
      const rows = draftRows(draft, { nowMs, groupId });
      // The ONE write door (CC-D27): batched, one transaction, consent-gated
      // inside the store so no surface can bypass it.
      const createdIds = await createConstraints(userId, rows, { nowMs });
      const isEpisode = draft.role === CONSTRAINT_ROLE.EPISODE && draft.kind !== ADD_KIND.ALLOW;
      const subject = draftSubject(draft);
      setSaved({ createdIds: Array.isArray(createdIds) ? createdIds : [], groupId: isEpisode ? groupId : null, subject, nowMs, planDecision: null });
      if (draft.kind === ADD_KIND.ALLOW || !Array.isArray(createdIds) || !createdIds.length) {
        setStep(ADD_STEP.DONE);
        return;
      }
      if (isEpisode) await loadEpisodePlan(createdIds, subject);
      else await loadBaselinePlan(createdIds, subject);
    } catch (e) {
      logError('HowYouTrainAdd.save', e, {});
      toast.show('That did not save. Nothing was changed - you can try again.', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const onSave = async () => {
    haptics.selection();
    if (!(await hasCapabilityConsent(userId))) { setStep(ADD_STEP.CONSENT); return; }
    await save();
  };

  const onAgreeAndSave = async () => {
    haptics.selection();
    const ok = await grantCapabilityConsent(userId, {});
    if (!ok) { toast.show('That did not save - you can try again.', { variant: 'error' }); return; }
    setConsented(true);
    await save();
  };

  // ── The plan step (episode: the effective diff, CC29 section 14) ──────
  const loadEpisodePlan = async (createdIds, subject) => {
    // eslint-disable-next-line global-require
    const { computePlanEffectiveSummary, computePlanEffectiveLines, clinicianSourcedIds, recordEffectiveChoice } = require('../lib/sessionEffective');
    const [summary, clinicianIds] = await Promise.all([
      computePlanEffectiveSummary(userId, createdIds).catch(() => ({ checked: false, affected: 0 })),
      clinicianSourcedIds(userId, createdIds).catch(() => new Set()),
    ]);
    if (!summary.checked) {
      // Could not read the plan: the rule stays undecided and How you
      // train's own detector and revisit row offer it again (A15: never
      // "nothing to decide" off a failed read).
      setStep(ADD_STEP.DONE);
      return;
    }
    if (!summary.affected) {
      const failSafe = (summary.failSafeRoutines ?? 0) > 0;
      // Vacuous: nothing in the plan is touched, recorded 'applied' (R2-5)
      // so no surface promises a decision it cannot offer.
      for (const id of createdIds) {
        // eslint-disable-next-line no-await-in-loop
        await recordEffectiveChoice(userId, id, 'applied').catch(() => {});
      }
      if (failSafe) {
        setPlan({ mode: 'failSafe', subject, failSafeRoutines: summary.failSafeRoutines });
        setStep(ADD_STEP.PLAN);
      } else {
        setStep(ADD_STEP.DONE);
      }
      return;
    }
    const { lines, checked } = await computePlanEffectiveLines(userId, createdIds).catch(() => ({ lines: [], checked: false }));
    setPlan({
      mode: 'episode',
      subject,
      substituted: summary.substituted ?? 0,
      omitted: summary.omitted ?? 0,
      failSafeRoutines: summary.failSafeRoutines ?? 0,
      clinicianIds: [...clinicianIds],
      linesChecked: checked,
      lines: (lines ?? []).map((l, i) => ({
        key: l.routineExerciseId ?? `${l.routineId}-${i}`,
        fromName: l.from?.name ?? 'This exercise',
        toName: l.to?.name ?? null,
        exerciseId: l.from?.id ?? null,
        constraintIds: l.constraintIds ?? [],
        apply: true,
      })),
    });
    setStep(ADD_STEP.PLAN);
  };

  // ── The plan step (baseline: the plan rewrite, D112 R1a) ──────────────
  const loadBaselinePlan = async (createdIds, subject) => {
    // eslint-disable-next-line global-require
    const { computeCapabilityPlanRewrite } = require('../lib/sessionEffective');
    const rw = await computeCapabilityPlanRewrite(userId, { ruleIds: createdIds }).catch(() => ({ lines: [], checked: false }));
    if (!rw.checked || !rw.lines.length) { setStep(ADD_STEP.DONE); return; }
    setPlan({
      mode: 'baseline', subject, lines: rw.lines,
      total: rw.lines.length, substitutable: rw.substitutable ?? 0, unsolvable: rw.unsolvable ?? 0,
    });
    setStep(ADD_STEP.PLAN);
  };

  const finishPlan = (decision) => {
    setSaved((s) => (s ? { ...s, planDecision: decision } : s));
    setStep(ADD_STEP.DONE);
  };

  const recordAll = async (choice) => {
    // eslint-disable-next-line global-require
    const { recordEffectiveChoice } = require('../lib/sessionEffective');
    for (const id of saved?.createdIds ?? []) {
      // eslint-disable-next-line no-await-in-loop
      await recordEffectiveChoice(userId, id, choice).catch(() => {});
    }
  };

  const applyWhole = async () => {
    haptics.selection();
    setBusy(true);
    try {
      if (showLines && plan.lines.some((l) => !l.apply)) {
        await commitLines();
      } else {
        await recordAll('applied');
        finishPlan('applied');
      }
    } finally { setBusy(false); }
  };

  // Named declineNow on purpose: it is the same act as the settings home's
  // declineNow, and the lane's 'Not now' sweep reads the name as proof that
  // the button really declines (capabilityFlows.guard, R8-3/R9).
  const declineNow = () => {
    haptics.selection();
    const doDecline = async () => {
      setBusy(true);
      try { await recordAll('declined'); finishPlan('declined'); } finally { setBusy(false); }
    };
    if (plan?.clinicianIds?.length) {
      // D112 R6: a clinician-sourced rule is never declined silently.
      appAlert(
        'A clinician asked for this one',
        `You told Volyume a clinician asked you to keep ${plan.subject ?? 'this'} out. Declining means your sessions keep showing it. Volyume will not suggest it elsewhere.`,
        [
          { text: 'Keep it out', style: 'cancel' },
          { text: 'Decline anyway', style: 'destructive', onPress: doDecline },
        ],
      );
      return;
    }
    doDecline();
  };

  const commitLines = async () => {
    const groupOfRule = new Map();
    for (const id of saved.createdIds) groupOfRule.set(id, saved.groupId);
    const run = async () => {
      try {
        // eslint-disable-next-line global-require
        const { recordEffectiveChoice } = require('../lib/sessionEffective');
        const { allowed, allowFailed, choiceFor } = await commitLineChoices({
          ruleIds: saved.createdIds,
          lines: plan.lines,
          clinicianRuleIds: plan.clinicianIds,
          groupOfRule,
          recordChoice: (ruleId, choice) => recordEffectiveChoice(userId, ruleId, choice),
          mintAllowance: (row) => createConstraint(userId, row),
          nowMs: Date.now(),
        });
        if (allowFailed > 0) {
          toast.show('Saved, but a kept exercise could not be recorded. It may still be swapped in sessions. You can allow it from the exercise picker.', { variant: 'warning' });
        }
        const anyApplied = [...choiceFor.values()].some((c) => c === 'applied');
        finishPlan(anyApplied ? (allowed > 0 ? 'mixed' : 'applied') : 'declined');
      } catch (e) {
        logError('HowYouTrainAdd.commitLines', e, {});
        toast.show('That did not save. Try again.', { variant: 'error' });
      }
    };
    if (keepsClinicianLine(plan.lines, plan.clinicianIds)) {
      appAlert(
        'A clinician asked for this one',
        `You told Volyume a clinician asked you to keep ${plan.subject ?? 'this'} out. Keeping it in means your sessions keep showing it. Volyume will not suggest it elsewhere.`,
        [
          { text: 'Go back', style: 'cancel' },
          { text: 'Keep it in anyway', style: 'destructive', onPress: run },
        ],
      );
      return;
    }
    await run();
  };

  const applyRewrite = async () => {
    haptics.selection();
    setBusy(true);
    try {
      // eslint-disable-next-line global-require
      const { applyCapabilityPlanRewrite } = require('../lib/sessionEffective');
      const res = await applyCapabilityPlanRewrite(userId, plan.lines);
      if (res.failed > 0) toast.show('Some swaps did not save. The affected exercises keep their quiet note, so nothing is lost.', { variant: 'warning' });
      finishPlan(res.applied > 0 ? 'applied' : 'declined');
    } catch (e) {
      logError('HowYouTrainAdd.applyRewrite', e, {});
      toast.show('That did not save. Try again.', { variant: 'error' });
    } finally { setBusy(false); }
  };

  const finish = () => {
    haptics.selection();
    leavingRef.current = true;
    navigation.navigate('HowYouTrain', {
      preselect: undefined,
      highlight: saved?.groupId ?? saved?.createdIds?.[0] ?? null,
    });
  };

  // ── Derived lists ─────────────────────────────────────────────────────
  const familyKeys = useMemo(() => [...new Set(library
    .map((e) => movementFamily(e.name, e.primaryMuscle, e.subregion))
    .filter(Boolean))].sort((a, b) => String(familyLabel(a)).localeCompare(String(familyLabel(b)))), [library]);
  const familyShown = useMemo(() => {
    const q = familyQuery.trim().toLowerCase();
    return q ? familyKeys.filter((k) => String(familyLabel(k)).toLowerCase().includes(q)) : familyKeys;
  }, [familyKeys, familyQuery]);
  const exerciseMatches = useMemo(() => {
    const q = exerciseQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return library.filter((e) => e.name.toLowerCase().includes(q) && !draft.exercises.some((x) => x.id === e.id)).slice(0, 8);
  }, [library, exerciseQuery, draft.exercises]);

  const toggleIn = (key, id) => setDraft((d) => ({
    ...d, [key]: d[key].includes(id) ? d[key].filter((x) => x !== id) : [...d[key], id],
  }));
  const toggleExercise = (ex) => setDraft((d) => ({
    ...d,
    exercises: d.exercises.some((x) => x.id === ex.id) ? d.exercises.filter((x) => x.id !== ex.id) : [...d.exercises, { id: ex.id, name: ex.name }],
  }));

  if (!step) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]} edges={['top', 'bottom']}>
        <BackHeader title="Add something" onBack={confirmLeave} />
      </SafeAreaView>
    );
  }

  const pos = stepPosition(draft, step, ctx);
  const postSave = step === ADD_STEP.PLAN || step === ADD_STEP.DONE;

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]} edges={['top', 'bottom']}>
      <BackHeader
        title="Add something"
        onBack={postSave ? finish : goBackStep}
        right={postSave ? null : (
          <PressableCard onPress={confirmLeave} accessibilityRole="button" accessibilityLabel="Cancel adding this" style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: t.colors.primary }]}>Cancel</Text>
          </PressableCard>
        )}
      />

      {/* Where you are. Numbered up to the save; the two post-save steps
          are named instead, because the check step has already said they
          may come. */}
      <View style={styles.progressWrap} accessibilityRole="progressbar" accessibilityLabel={pos.index ? `Step ${pos.index} of ${pos.total}` : stepTitle}>
        {pos.index ? (
          <View style={styles.segments}>
            {Array.from({ length: pos.total }).map((_, i) => (
              <View key={i} style={[styles.segment, { backgroundColor: i < pos.index ? t.colors.primary : t.colors.borderSubtle }]} />
            ))}
          </View>
        ) : null}
        <Text style={[styles.progressText, { color: t.colors.textMuted }]}>
          {pos.index ? `Step ${pos.index} of ${pos.total}` : (step === ADD_STEP.DONE ? 'Saved' : 'One more thing')}
        </Text>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {draft.from && step === planSteps(draft, ctx)[0] ? (
          <View style={[styles.fromRow, { backgroundColor: t.colors.primaryBg }]}>
            <Ionicons name="information-circle-outline" size={iconSize.sm} color={t.colors.primary} />
            <Text style={[styles.fromText, { color: t.colors.textPrimary }]}>
              {draft.from.question ? `From ${draft.from.name}: ${draft.from.question}` : `From ${draft.from.name}`}
            </Text>
          </View>
        ) : null}

        <Text ref={headingRef} accessibilityRole="header" style={[styles.heading, { color: t.colors.textPrimary }]}>
          {stepTitle}
        </Text>
        {helpFor(step, draft, plan) ? (
          <Text style={[styles.help, { color: t.colors.textSecondary }]}>{helpFor(step, draft, plan)}</Text>
        ) : null}

        {step === ADD_STEP.WHAT ? KIND_OPTIONS.map((k) => (
          <OptionCard key={k.kind} icon={k.icon} label={k.label} detail={k.detail} active={draft.kind === k.kind}
            onPress={() => { haptics.selection(); setDraft((d) => ({ ...d, kind: k.kind, axes: [], families: [], exercises: [], side: null, role: k.kind === ADD_KIND.ALLOW ? CONSTRAINT_ROLE.BASELINE : (d.role === CONSTRAINT_ROLE.BASELINE && d.kind === ADD_KIND.ALLOW ? null : d.role) })); }} />
        )) : null}

        {step === ADD_STEP.WHICH && draft.kind === ADD_KIND.DEMAND ? DEMAND_AXES.map((a) => (
          <OptionCard key={a.id} icon={AXIS_ICONS[a.id] ?? 'body-outline'} label={a.label} active={draft.axes.includes(a.id)}
            accessibilityRole="checkbox" onPress={() => { haptics.selection(); toggleIn('axes', a.id); }} />
        )) : null}

        {step === ADD_STEP.WHICH && draft.kind === ADD_KIND.FAMILY ? (
          <>
            <View style={styles.fieldWrap}>
              <TextField value={familyQuery} onChangeText={setFamilyQuery} placeholder="Find a pattern, for example squat" accessibilityLabel="Find a movement pattern" autoCorrect={false}
                leading={<Ionicons name="search-outline" size={iconSize.md} color={t.colors.textMuted} />} />
            </View>
            {familyShown.map((key) => (
              <OptionCard key={key} icon="repeat-outline" label={familyLabel(key)} active={draft.families.includes(key)}
                accessibilityRole="checkbox" onPress={() => { haptics.selection(); toggleIn('families', key); }} />
            ))}
            {!familyShown.length ? <Text style={[styles.help, { color: t.colors.textMuted }]}>Nothing matches that. Try a different word.</Text> : null}
          </>
        ) : null}

        {step === ADD_STEP.WHICH && (draft.kind === ADD_KIND.EXERCISE || draft.kind === ADD_KIND.ALLOW) ? (
          <>
            <View style={styles.fieldWrap}>
              <TextField value={exerciseQuery} onChangeText={setExerciseQuery} placeholder="Search exercises" accessibilityLabel="Search exercises" autoCorrect={false}
                leading={<Ionicons name="search-outline" size={iconSize.md} color={t.colors.textMuted} />} />
            </View>
            {draft.exercises.map((ex) => (
              <OptionCard key={ex.id} icon="barbell-outline" label={ex.name} detail="Chosen" active accessibilityRole="checkbox"
                onPress={() => { haptics.selection(); toggleExercise(ex); }} />
            ))}
            {exerciseMatches.map((ex) => (
              <OptionCard key={ex.id} icon="barbell-outline" label={ex.name} active={false} accessibilityRole="checkbox"
                onPress={() => { haptics.selection(); toggleExercise(ex); }} />
            ))}
            {exerciseQuery.trim().length >= 2 && !exerciseMatches.length && !draft.exercises.length
              ? <Text style={[styles.help, { color: t.colors.textMuted }]}>Nothing matches that. Try a different word.</Text> : null}
          </>
        ) : null}

        {step === ADD_STEP.WHICH && draft.kind !== ADD_KIND.ALLOW ? (
          <View style={[settingsStyles.section, live.section, styles.switchSection]}>
            <SettingRow
              icon="medkit-outline"
              label="A clinician asked for this"
              sub="Only changes how Volyume words things. It never contacts anyone."
              rightElement={(
                <Switch
                  value={!!draft.clinician}
                  onValueChange={(v) => { haptics.selection(); setDraft((d) => ({ ...d, clinician: v })); }}
                  trackColor={{ false: t.colors.borderSubtle, true: t.colors.primary }}
                  thumbColor={t.colors.textPrimary}
                />
              )}
            />
          </View>
        ) : null}

        {step === ADD_STEP.SIDE ? (() => {
          const sq = sideQuestion(draft);
          return [
            { v: LATERALITY.LEFT, label: sq.left, icon: 'arrow-back-outline' },
            { v: LATERALITY.RIGHT, label: sq.right, icon: 'arrow-forward-outline' },
            { v: 'both', label: sq.both, icon: 'swap-horizontal-outline' },
          ].map((o) => (
            <OptionCard key={o.v} icon={o.icon} label={o.label} active={draft.side === o.v}
              onPress={() => { haptics.selection(); setDraft((d) => ({ ...d, side: o.v })); }} />
          ));
        })() : null}

        {step === ADD_STEP.WHEN ? ROLE_OPTIONS.map((r) => {
          const suggested = draft.from?.kind === 'injury' ? CONSTRAINT_ROLE.EPISODE : draft.from?.kind === 'long_term' ? CONSTRAINT_ROLE.BASELINE : null;
          const detail = suggested === r.role ? `Suggested for ${draft.from.name}. ${r.detail}` : r.detail;
          return (
            <OptionCard key={r.role} icon={r.icon} label={r.label} detail={detail} active={draft.role === r.role}
              onPress={() => { haptics.selection(); setDraft((d) => ({ ...d, role: r.role })); }} />
          );
        }) : null}

        {step === ADD_STEP.SINCE ? START_CHOICES.map((c) => (
          <OptionCard key={c.key} icon="calendar-outline" label={c.label} active={draft.startDays === c.days}
            onPress={() => { haptics.selection(); setDraft((d) => ({ ...d, startDays: c.days })); }} />
        )) : null}

        {step === ADD_STEP.UNTIL ? END_CHOICES.map((c) => (
          <OptionCard key={c.key} icon={c.days == null ? 'infinite-outline' : 'time-outline'} label={c.label} detail={c.detail} active={draft.endDays === c.days}
            onPress={() => { haptics.selection(); setDraft((d) => ({ ...d, endDays: c.days })); }} />
        )) : null}

        {step === ADD_STEP.CHECK ? (
          <>
            <View style={[settingsStyles.section, live.section]}>
              {summaryLines(draft, { nowMs: Date.now() }).map((l) => (
                <SettingRow
                  key={l.key}
                  icon="checkmark-outline"
                  label={l.value}
                  sub={l.label}
                  showArrow={false}
                  accessibilityLabel={`${l.label}: ${l.value}${l.step ? '. Change' : ''}`}
                  onPress={l.step ? () => { haptics.selection(); setStep(l.step); } : undefined}
                  rightElement={l.step ? <Text style={[styles.changeText, { color: t.colors.primary }]}>Change</Text> : null}
                />
              ))}
            </View>
            <Card style={styles.sentenceCard}>
              <Text style={[styles.sentence, { color: t.colors.textPrimary }]}>{savedSentence(draft)}</Text>
            </Card>
          </>
        ) : null}

        {step === ADD_STEP.CONSENT ? (
          <Card>
            <Text style={[styles.body, { color: t.colors.textPrimary }]}>{CONSENT_BODY}</Text>
          </Card>
        ) : null}

        {step === ADD_STEP.PLAN && plan?.mode === 'episode' ? (
          <>
            <Card>
              <Text style={[styles.body, { color: t.colors.textPrimary }]}>
                {planSentence(plan)}
              </Text>
            </Card>
            {plan.lines.length ? (
              <PressableCard onPress={() => { haptics.selection(); setShowLines((v) => !v); }} accessibilityRole="button"
                accessibilityState={{ expanded: showLines }} style={styles.disclosure}>
                <Text style={[styles.changeText, { color: t.colors.primary }]}>{showLines ? 'Hide each exercise' : 'Choose per exercise'}</Text>
                <Ionicons name={showLines ? 'chevron-up' : 'chevron-down'} size={iconSize.sm} color={t.colors.primary} />
              </PressableCard>
            ) : null}
            {showLines ? (
              <View style={[settingsStyles.section, live.section]}>
                {plan.lines.map((l, i) => (
                  <View key={l.key} style={[styles.lineRow, i < plan.lines.length - 1 && { borderBottomWidth: 1, borderBottomColor: t.colors.borderSubtle }]}>
                    <Text style={[styles.lineText, { color: t.colors.textPrimary }]}
                      accessibilityLabel={l.toName ? `${l.fromName} would be replaced by ${l.toName}` : `${l.fromName}: no close match, stays with a note`}>
                      {l.toName ? `${l.fromName} → ${l.toName}` : `${l.fromName}: no close match, stays with a note`}
                    </Text>
                    <View style={styles.lineChips}>
                      <Chip label="Apply" selected={l.apply} accessibilityRole="radio"
                        onPress={() => setPlan((p) => ({ ...p, lines: p.lines.map((x, j) => (j === i ? { ...x, apply: true } : x)) }))} />
                      <Chip label="Keep" selected={!l.apply} accessibilityRole="radio"
                        onPress={() => setPlan((p) => ({ ...p, lines: p.lines.map((x, j) => (j === i ? { ...x, apply: false } : x)) }))} />
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        ) : null}

        {step === ADD_STEP.PLAN && plan?.mode === 'failSafe' ? (
          <Card>
            <Text style={[styles.body, { color: t.colors.textPrimary }]}>
              {`${plan.subject ? `While ${plan.subject} is out: ` : 'While this lasts: '}${failSafeSentence(plan.failSafeRoutines)}`}
            </Text>
          </Card>
        ) : null}

        {step === ADD_STEP.PLAN && plan?.mode === 'baseline' ? (
          <Card>
            <Text style={[styles.body, { color: t.colors.textPrimary }]}>{rewriteSentence(plan)}</Text>
          </Card>
        ) : null}

        {step === ADD_STEP.DONE ? (
          <>
            <View style={styles.doneIconWrap}>
              <View style={[styles.doneIcon, { backgroundColor: t.colors.primaryBg }]}>
                <Ionicons name="checkmark" size={32} color={t.colors.primary} />
              </View>
            </View>
            <Card>
              <Text style={[styles.sentence, { color: t.colors.textPrimary }]}>{savedSentence(draft)}</Text>
            </Card>
            <Text style={[styles.subheading, { color: t.colors.textPrimary }]}>What happens next</Text>
            <View style={[settingsStyles.section, live.section]}>
              {whatHappensNext(draft, { nowMs: saved?.nowMs ?? Date.now(), planDecision: saved?.planDecision === 'mixed' ? 'applied' : saved?.planDecision }).map((s, i) => (
                <SettingRow key={i} icon="arrow-forward-outline" label={s} showArrow={false} />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* The footer: one primary action, always in the thumb zone. */}
      <View style={[styles.footer, { borderTopColor: t.colors.borderSubtle, backgroundColor: t.colors.background }]}>
        {footerFor({
          step, draft, plan, busy, showLines, t,
          onNext: goNext, onSave, onAgreeAndSave, onLeave: confirmLeave,
          onApply: applyWhole, declineNow, onApplyRewrite: applyRewrite,
          onKeepPlan: () => finishPlan('declined'), onContinue: () => finishPlan('applied'), onFinish: finish,
        })}
      </View>
    </SafeAreaView>
  );
}

// ── Copy per step ─────────────────────────────────────────────────────────

function headingFor(step, draft, saved) {
  switch (step) {
    case ADD_STEP.WHAT: return 'What is it about?';
    case ADD_STEP.WHICH:
      if (draft.kind === ADD_KIND.DEMAND) return 'Which of these?';
      if (draft.kind === ADD_KIND.FAMILY) return 'Which movement patterns?';
      if (draft.kind === ADD_KIND.ALLOW) return 'Which exercise is always fine?';
      return 'Which exercise?';
    case ADD_STEP.SIDE: return sideQuestion(draft)?.question ?? 'Which side?';
    case ADD_STEP.WHEN: return 'Is this how you train generally, or temporary?';
    case ADD_STEP.SINCE: return 'Since when?';
    case ADD_STEP.UNTIL: return 'Roughly how long?';
    case ADD_STEP.CHECK: return 'Check and save';
    case ADD_STEP.CONSENT: return 'One thing first';
    case ADD_STEP.PLAN: return 'Your current plan';
    case ADD_STEP.DONE: return saved ? 'Saved' : 'Saved';
    default: return '';
  }
}

function helpFor(step, draft, plan) {
  switch (step) {
    case ADD_STEP.WHAT: return 'Pick the closest fit. Next, you choose exactly which.';
    case ADD_STEP.WHICH:
      if (draft.kind === ADD_KIND.ALLOW) return 'Volyume keeps this in, even where your other answers would leave it out.';
      return 'Pick everything that applies. You never need to say why.';
    case ADD_STEP.SIDE: return SIDE_HELP;
    case ADD_STEP.WHEN: return 'You can change this later. Next: a quick check of everything, then save.';
    case ADD_STEP.SINCE: return 'A rough guess is fine.';
    case ADD_STEP.UNTIL: return 'A rough guess is fine. Volyume checks with you rather than assuming. Nothing ends until you say so.';
    case ADD_STEP.CHECK: return 'Tap Change on anything to go back to it. After you save, if this affects your current plan, Volyume shows you what would change and asks before doing anything.';
    case ADD_STEP.CONSENT: return 'Volyume needs your agreement to keep what you have just chosen.';
    case ADD_STEP.PLAN:
      if (plan?.mode === 'failSafe') return 'Nothing to decide here. Your plan is unchanged.';
      if (plan?.mode === 'baseline') return 'Your history is not rewritten either way.';
      return 'Your plan itself is not changed, and everything returns when you end this.';
    case ADD_STEP.DONE: return null;
    default: return null;
  }
}

function planSentence(plan) {
  const parts = [];
  if (plan.substituted) parts.push(`${plan.substituted} exercise${plan.substituted === 1 ? '' : 's'} swapped for something that works now`);
  if (plan.omitted) parts.push(`${plan.omitted} left out with nothing forced in ${plan.omitted === 1 ? 'its' : 'their'} place`);
  const head = plan.subject ? `While ${plan.subject} is out` : 'While this lasts';
  const tail = plan.failSafeRoutines > 0 ? ` ${failSafeSentence(plan.failSafeRoutines)}` : '';
  return `${head}, your sessions would show ${parts.join(', and ')}.${tail}`;
}

function rewriteSentence(plan) {
  const n = plan.total; const k = plan.substitutable; const u = plan.unsolvable;
  const plural = (c) => (c === 1 ? '' : 's');
  const sits = n === 1 ? 'sits' : 'sit';
  if (k === 0) return `${n} exercise${plural(n)} in your current plan ${sits} outside how you train, and no close match fits right now. ${n === 1 ? 'It stays' : 'They stay'} in place with a quiet note, and you can swap ${n === 1 ? 'it' : 'them'} any time.`;
  if (u === 0) return `${n} exercise${plural(n)} in your current plan ${sits} outside how you train. Volyume can swap ${n === 1 ? 'it' : 'them'} for movements that fit.`;
  return `${n} exercises in your current plan sit outside how you train. Volyume can swap ${k} for movements that fit; ${u === 1 ? '1 has no close match and stays' : `${u} have no close match and stay`} in place with a quiet note.`;
}

function footerFor({ step, draft, plan, busy, showLines, t, onNext, onSave, onAgreeAndSave, onLeave, onApply, declineNow, onApplyRewrite, onKeepPlan, onContinue, onFinish }) {
  const hint = (txt) => <Text style={[styles.footerHint, { color: t.colors.textMuted }]}>{txt}</Text>;
  switch (step) {
    case ADD_STEP.WHAT:
    case ADD_STEP.WHICH:
    case ADD_STEP.SIDE:
    case ADD_STEP.WHEN:
    case ADD_STEP.SINCE:
    case ADD_STEP.UNTIL: {
      const ok = canContinue(draft, step);
      return (
        <>
          {!ok ? hint(step === ADD_STEP.WHICH ? 'Pick at least one to continue.' : 'Pick one to continue.') : null}
          <Button title="Continue" onPress={onNext} disabled={!ok} />
        </>
      );
    }
    case ADD_STEP.CHECK:
      return <Button title="Save" onPress={onSave} loading={busy} />;
    case ADD_STEP.CONSENT:
      return (
        <>
          <Button title="Agree and save" onPress={onAgreeAndSave} loading={busy} />
          <Button title="Leave it for now" variant="secondary" onPress={onLeave} />
          {hint('Leaving means your answers here are not kept. You can still avoid specific exercises from Plan tools without this.')}
        </>
      );
    case ADD_STEP.PLAN:
      if (plan?.mode === 'failSafe') return <Button title="Continue" onPress={onContinue} />;
      if (plan?.mode === 'baseline') {
        if (plan.substitutable === 0) return <Button title="Continue" onPress={onKeepPlan} />;
        return (
          <>
            <Button title="Update my plan" onPress={onApplyRewrite} loading={busy} />
            <Button title="Leave it as it is" variant="secondary" onPress={onKeepPlan} />
            {hint('Leaving it means the affected exercises show a quiet note with a swap shortcut.')}
          </>
        );
      }
      return (
        <>
          <Button title={showLines && plan?.lines?.some((l) => !l.apply) ? 'Save my choices' : 'Apply while it lasts'} onPress={onApply} loading={busy} />
          <Button title="Not now" variant="secondary" onPress={declineNow} />
          {hint('Not now means your sessions keep showing these, each with a quiet note and a swap shortcut.')}
        </>
      );
    case ADD_STEP.DONE:
      return <Button title="Done" onPress={onFinish} />;
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.xs },
  cancelBtn: { minHeight: touchTarget.minimum, justifyContent: 'center', paddingHorizontal: spacing.sm },
  cancelText: { ...type.label },
  progressWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xs, gap: spacing.xs },
  segments: { flexDirection: 'row', gap: spacing.xs },
  segment: { flex: 1, height: 4, borderRadius: radius.hair },
  progressText: { ...type.captionTight },
  fromRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm },
  fromText: { ...type.bodySm, flex: 1, minWidth: 0 },
  heading: { ...type.h2, marginBottom: spacing.xs },
  help: { ...type.bodySm, marginBottom: spacing.md },
  fieldWrap: { marginBottom: spacing.sm },
  switchSection: { marginTop: spacing.sm },
  changeText: { ...type.label },
  sentenceCard: { marginTop: spacing.sm },
  sentence: { ...type.body },
  body: { ...type.body },
  subheading: { ...type.h3, marginTop: spacing.lg, marginBottom: spacing.sm },
  disclosure: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: touchTarget.minimum, paddingHorizontal: spacing.xs, marginTop: spacing.xs },
  lineRow: { padding: spacing.lg, gap: spacing.sm },
  lineText: { ...type.body },
  lineChips: { flexDirection: 'row', gap: spacing.sm },
  doneIconWrap: { alignItems: 'center', marginBottom: spacing.md },
  doneIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  footer: { padding: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, gap: spacing.sm },
  footerHint: { ...type.captionTight, textAlign: 'center' },
});
