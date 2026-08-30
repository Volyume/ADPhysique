/**
 * How you train - the capability lane's settings home (CC26;
 * ARCHITECTURE.md section 12, renamed per section 33's RT2-2 revision).
 *
 * ROLE-SCOPED PRESENTATION (CAP-1/CAP-2, RT2-1): baseline capability is
 * presented as the user's ordinary training setup - the words injury,
 * restricted and modified never appear on baseline rows. Temporary
 * framing attaches ONLY to episode entries. No diagnosis is asked
 * anywhere (CAP-3); the add flow is staged INLINE (no Modal, by
 * construction - the R4 Modal-focus mitigation in section 33.18).
 *
 * Free tier by law (CAP-19): registered unguarded; pinned by
 * capabilityGuards.test.js. Nothing here changes selection, coaching or
 * learning - those campaigns arrive later; this screen manages state.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, AccessibilityInfo, TextInput } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useShallow } from 'zustand/react/shallow';
import useAppStore from '../store/useAppStore';
import useTheme from '../hooks/useTheme';
import { type, spacing, radius } from '../styles/theme';
import { useToast } from '../components/Toast';
import { appAlert } from '../components/AppAlert';
import PressableCard from '../components/PressableCard';
import * as haptics from '../lib/haptics';
import { logError } from '../lib/errorLog';
import {
  SettingsPage, SettingRow, SectionHeader,
} from '../components/SettingsPrimitives';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  loadCapabilityState, createConstraints, endConstraint, endEpisode,
  extendEpisode, promoteEpisode, acknowledgeEpisode, setEpisodeAdaptationMode, hasCapabilityConsent,
  buildCapabilityExport,
} from '../lib/capability/store';
import {
  grantCapabilityConsent, withdrawCapabilityConsent,
} from '../lib/consent/capabilityConsent';
// CC-D27 (CC27): family and exercise rules join the add flow, consuming
// the same taxonomy the resolver reads. movementFamily is the shared
// vocabulary module (no user data); the exercise list is the ordinary
// library read.
import { movementFamily, familyLabel } from '../lib/exercise/movementFamily';
import {
  DEMAND_AXES, demandLabel, CONSTRAINT_ROLE, CONSTRAINT_SOURCE,
  CONSTRAINT_RULE_KIND, CONSTRAINT_STATE, EPISODE_STATUS, LATERALITY,
} from '../lib/capability/model';
import {
  subjectPhrase, draftSubjectPhrase, sideBodyPart, sidedRuleLabel,
} from '../lib/capability/phrase';
// The model owns which rules a side actually changes; this screen asks
// the question only where the resolver would use the answer.
import { isSideCarveable } from '../lib/capability/resolve';
import {
  getAllExercises, uid } from '../lib/database';

const DAY_MS = 24 * 60 * 60 * 1000;

// R5-9/R6-6: the one honest could-not-read line. Both terminal messages
// (the revisit row's toast and the per-line review's empty answer) share
// this constant so the two sites cannot drift - a failed read is "could
// not tell", never "nothing needs a decision" (A15).
const COULD_NOT_READ_TOAST = 'Volyume could not read your plan just now. Nothing has changed. Try again in a moment.';

// Round 8 (R8-2): the ONE fail-safe sentence, spoken wherever the
// never-served-empty fail-safe absorbs a routine - the standalone
// proposal, the mixed proposal, and the group review - so the case is
// told in the same words everywhere and no path can fall between the
// branches. Outcome-phrased on purpose: a fail-safed session's
// emptiness can be several rules' doing (round-8 probe B), so the
// sentence states what happens, never which rule "affects every
// exercise".
const failSafeSentence = (n) => (n === 1
  ? 'One of your sessions has nothing left that fits, so it runs as it is, with a quiet note on each affected exercise.'
  : 'Some of your sessions have nothing left that fits, so they run as they are, with a quiet note on each affected exercise.');

// Backdating quick-pick (ARCHITECTURE section 5.1, RT1-7).
const START_CHOICES = [
  { key: 'today', label: 'Today', days: 0 },
  { key: 'week', label: 'About a week', days: 7 },
  { key: 'fortnight', label: 'About two weeks', days: 14 },
];
const END_CHOICES = [
  { key: 'open', label: 'Until I end it', days: null },
  { key: 'week', label: 'About a week', days: 7 },
  { key: 'fortnight', label: 'Two weeks', days: 14 },
  { key: 'month', label: 'A month', days: 30 },
];

export default function HowYouTrainScreen() {
  const t = useTheme();
  const navigation = useNavigation();
  const toast = useToast();
  const { user } = useAppStore(useShallow(s => ({ user: s.user })));
  const userId = user?.id;

  const [state, setState] = useState({ baseline: [], episodes: [], history: [], unavailable: false });
  const [consented, setConsented] = useState(false);
  // Add-flow stages (CC-D27 widened; 'side' added 2026-08-21): null |
  // 'role' | 'kind' | 'axes' | 'family' | 'exercise' | 'side' | 'dates' |
  // 'consent' | 'readback'
  const [adding, setAdding] = useState(null);
  const [draft, setDraft] = useState(null);
  // CC-D27: the family list is OFFERED only for families that actually
  // exist on library exercises (section 33.3), so it is computed from the
  // library, never hardcoded. Exercise search shares the same load.
  const [library, setLibrary] = useState([]);
  const [exerciseQuery, setExerciseQuery] = useState('');
  // D112 R4 (closes audit T2-23): the per-line "Choose per exercise"
  // review - see proposeEffectiveDiff, renderLineReview and
  // saveLineReview below.
  const [lineReview, setLineReview] = useState(null);
  // D112 R4 (closes audit T2-23's recoverability half): whether the
  // standing "Your plan and how you train" row has anything to offer
  // right now. Computed on every refresh below.
  const [canRevisit, setCanRevisit] = useState(false);
  // T1-06/T2-23 shared guard: proposalPendingRef is set synchronously at
  // the top of proposeEffectiveDiff (before its first await) and cleared
  // in its finally, so any call dispatched in the same tick - the add
  // flow's own explicit call racing the refresh-time sync-arrival
  // detector below - sees it before that detector's async continuation
  // ever runs. It never gates an explicit user action (add flow, flare
  // restart, the revisit row); only the passive detector checks it.
  // lastAutoProposedKeyRef additionally stops the detector repeating the
  // identical still-undecided set on the next focus, so a user
  // backgrounding/foregrounding the app while a proposal sits unanswered
  // never accumulates duplicate alerts.
  const proposalPendingRef = useRef(false);
  const lastAutoProposedKeyRef = useRef(null);

  const refresh = useCallback(() => {
    if (!userId) return;
    loadCapabilityState(userId).then((st) => {
      setState(st);
      // accessibilityLiveRegion is Android-only; announce the fail-closed
      // notice on iOS too (ARCHITECTURE section 27 names both mechanisms).
      if (st.unavailable) {
        AccessibilityInfo.announceForAccessibility(
          'Volyume could not read this right now. Nothing has changed.',
        );
      }
      // T1-06 (closes audit): a rule that arrived by sync, or was left
      // undecided across an app relaunch, never got a proposal - the add
      // flow was the only place one fired. Detected here, on the
      // screen's own refresh/focus, exactly the same undecided-and-not-
      // held episode rule ids the standing revisit row below computes,
      // and proposed the same way (proposeEffectiveDiff). This is the
      // SAME recoverability the revisit row offers on demand (T2-23);
      // this just tries it automatically first, and the row stays as
      // the durable fallback for whatever this best-effort pass misses.
      const undecidedIds = undecidedEpisodeRuleIds(st.episodes);
      if (!proposalPendingRef.current) {
        const key = undecidedIds.slice().sort().join(',');
        if (undecidedIds.length && key !== lastAutoProposedKeyRef.current) {
          proposeEffectiveDiff(undecidedIds, null).catch(() => {});
        }
      }
      // R3-2 limb b: applied rules that currently produce lines keep the
      // revisit row alive too, so a vacuously-applied rule that later
      // bites regains its review.
      const appliedIds = appliedEpisodeRuleIds(st.episodes);
      // eslint-disable-next-line global-require
      require('../lib/sessionEffective').hasCapabilityToRevisit(userId, undecidedIds, appliedIds)
        .then(setCanRevisit).catch(() => setCanRevisit(false));
    }).catch(() => {});
    hasCapabilityConsent(userId).then(setConsented).catch(() => {});
    // Exercise-rule rows label by name; the library read is best-effort
    // (an id is still shown if it fails).
    getAllExercises().then(setLibrary).catch(() => {});
    // proposeEffectiveDiff is intentionally omitted: it is redefined every
    // render, so listing it would redefine refresh (and re-subscribe
    // useFocusEffect) on every render too. Safe to omit because
    // proposeEffectiveDiff only touches refs, state setters and userId -
    // all stable/keyed on the same [userId] this callback already carries
    // (see proposalPendingRef/lastAutoProposedKeyRef's comment above).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
  useFocusEffect(refresh);

  // CC-D27: one label for any rule row - demand axes by their labels,
  // families by the shared taxonomy's labels, exercises by name.
  const ruleLabel = (row) => {
    if (row.ruleKind === CONSTRAINT_RULE_KIND.FAMILY) return familyLabel(row.ruleValue) ?? row.ruleValue;
    if (row.ruleKind === CONSTRAINT_RULE_KIND.EXERCISE || row.ruleKind === CONSTRAINT_RULE_KIND.EXERCISE_ALLOW) {
      return library.find(e => e.id === row.ruleValue)?.name ?? 'An exercise';
    }
    return sidedRuleLabel(row) ?? demandLabel(row.ruleValue);
  };

  // Natural coach-language order (2026-08-21): alerts and toasts name the
  // actual thing whenever the rules give it a short honest name; null
  // falls back to the generic wording. Naming only, nothing else changes.
  // F6: allowance rows (a per-line Keep's "kept in") never join the
  // subject - "keep {kept-in exercise} out" would say the opposite of
  // what the row means.
  const nameOf = (id) => library.find(e => e.id === id)?.name ?? null;
  const groupSubject = (rows) => subjectPhrase(
    (rows ?? []).filter((r) => r.ruleKind !== CONSTRAINT_RULE_KIND.EXERCISE_ALLOW), { nameOf },
  );

  // D112 R4 (closes audit T2-23/T1-06): the episode rule ids still
  // waiting on an Apply/Decline choice - active, not held (a hold means
  // the user said wait, D112 R8, so it drives no proposal either).
  // Shared by the standing revisit row's visibility/tap handler and the
  // sync-arrival/relaunch detector in refresh() above.
  const undecidedEpisodeRuleIds = (episodes) => (episodes ?? []).flatMap((ep) => ep.rows
    .filter((r) => r.state === CONSTRAINT_STATE.ACTIVE && r.effectiveChoice == null
      && r.adaptationMode !== 'hold'
      // F6: an episode-scoped allowance is a decision already made (the
      // per-line Keep), never an undecided restriction to propose over.
      && r.ruleKind !== CONSTRAINT_RULE_KIND.EXERCISE_ALLOW)
    .map((r) => r.id));

  // R3-2 limb b: the APPLIED-and-not-held episode rule ids - the revisit
  // row's second reach. A rule recorded applied (vacuously or by choice)
  // stays revisitable whenever it currently produces lines.
  const appliedEpisodeRuleIds = (episodes) => (episodes ?? []).flatMap((ep) => ep.rows
    .filter((r) => r.state === CONSTRAINT_STATE.ACTIVE && r.effectiveChoice === 'applied'
      && r.adaptationMode !== 'hold'
      && r.ruleKind !== CONSTRAINT_RULE_KIND.EXERCISE_ALLOW)
    .map((r) => r.id));

  const beginAdd = () => {
    haptics.selection();
    setDraft({
      role: null, kind: null, axes: [], families: [], exercises: [],
      clinician: false, startDays: 0, endDays: null, side: null,
    });
    setAdding('role');
    if (!library.length)

      getAllExercises().then(setLibrary).catch(() => {});
  };

  // Training considerations preselect (gap-closure Phase D; GC-D1). A
  // directory question arrives as a SUGGESTED draft: rules preselected,
  // nothing written - the user still walks durability, dates, consent and
  // readback. Exercise names resolve against the library, so that kind
  // waits for the library read before consuming the param.
  const route = useRoute();
  const preselect = route.params?.preselect;
  useEffect(() => {
    if (!preselect || adding) return;
    if (preselect.kind === 'exercise' && !library.length) return;
    navigation.setParams({ preselect: undefined });
    const exercises = (preselect.exerciseNames ?? [])
      .map(n => library.find(e => e.name === n))
      .filter(Boolean)
      .map(e => ({ id: e.id, name: e.name }));
    setDraft({
      role: null,
      kind: preselect.kind ?? null,
      axes: preselect.axes ?? [],
      families: preselect.families ?? [],
      exercises,
      clinician: false, startDays: 0, endDays: null, side: null,
    });
    setAdding('role');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselect, library, adding]);

  const chooseRole = (role) => {
    haptics.selection();
    setDraft(d => ({ ...d, role }));
    // A preselected draft (Training considerations, GC-D1) already knows
    // its kind; skip straight to that kind's stage.
    setAdding(draft?.kind ? stageForKind(draft.kind) : 'kind');
  };

  const stageForKind = (kind) => (kind === 'demand' ? 'axes' : kind === 'family' ? 'family' : 'exercise');

  // The axes in this draft whose resolution a side would actually
  // change. Empty means the side question is skipped entirely: asking
  // for one on standing, floor access, spine load, impact or balance
  // would be fake precision, since the resolver ignores it there.
  const sidedAxes = (d) => (d?.axes ?? [])
    .filter(a => isSideCarveable(CONSTRAINT_RULE_KIND.DEMAND, a));

  // After the rule is chosen: ask the side when it matters, then dates
  // for a temporary change, then the readback.
  const afterRuleStage = (d) => {
    if (sidedAxes(d).length) return 'side';
    return d.role === CONSTRAINT_ROLE.EPISODE ? 'dates' : 'readback';
  };
  const afterSideStage = (d) => (d.role === CONSTRAINT_ROLE.EPISODE ? 'dates' : 'readback');

  // Worded from what the chosen axes are actually about, so the question
  // reads "Which hand?" rather than anything about sides in the
  // abstract. Mixed body parts fall back to the plain side question.
  const sideAsk = (d) => {
    const parts = [...new Set(sidedAxes(d).map(a => sideBodyPart(a)).filter(Boolean))];
    const part = parts.length === 1 ? parts[0] : null;
    return {
      question: part ? `Which ${part}?` : 'Which side?',
      left: part ? `Left ${part}` : 'Left side',
      right: part ? `Right ${part}` : 'Right side',
      both: part ? `Both ${part}s` : 'Both sides',
    };
  };

  const chooseSide = (side) => {
    haptics.selection();
    // "Both" stores no side: that is what a rule with no side has always
    // meant, and it keeps every existing row's behaviour identical.
    setDraft(d => ({ ...d, side }));
    setAdding(afterSideStage(draft));
  };

  const chooseKind = (kind) => {
    haptics.selection();
    setDraft(d => ({ ...d, kind }));
    setAdding(stageForKind(kind));
  };

  const toggleFamily = (key) => {
    haptics.selection();
    setDraft(d => ({
      ...d,
      families: d.families.includes(key) ? d.families.filter(f => f !== key) : [...d.families, key],
    }));
  };

  const toggleExercise = (ex) => {
    haptics.selection();
    setDraft(d => ({
      ...d,
      exercises: d.exercises.some(e => e.id === ex.id)
        ? d.exercises.filter(e => e.id !== ex.id)
        : [...d.exercises, { id: ex.id, name: ex.name }],
    }));
  };

  const toggleAxis = (id) => {
    haptics.selection();
    setDraft(d => ({
      ...d,
      axes: d.axes.includes(id) ? d.axes.filter(a => a !== id) : [...d.axes, id],
    }));
  };

  const saveDraft = async () => {
    try {
      if (!(await hasCapabilityConsent(userId))) { setAdding('consent'); return; }
      await writeDraft();
    } catch (e) {
      logError('HowYouTrain.save', e, {});
      toast.show('That did not save. Nothing was changed - you can try again.');
    }
  };

  // CC-D27: the ONE write door for capability rows - every path (the add
  // flow AND the section 21 flare re-start) lands through this single
  // batched call, so the consent gate and the transaction law cannot be
  // bypassed by a new surface.
  const writeConstraintRows = async (rows, nowMs) => createConstraints(userId, rows, { nowMs });

  const writeDraft = async () => {
    const now = Date.now();
    const isEpisode = draft.role === CONSTRAINT_ROLE.EPISODE;
    const groupId = isEpisode ? uid() : null;
    const startsAt = now - (draft.startDays ?? 0) * DAY_MS;
    const endsAt = isEpisode && draft.endDays != null ? now + draft.endDays * DAY_MS : null;
    // One transaction for the whole set: all axes land or none do, so the
    // save failure copy can honestly say nothing was changed.
    const source = draft.clinician ? CONSTRAINT_SOURCE.CLINICIAN_REPORTED : CONSTRAINT_SOURCE.SELF;
    const base = { role: draft.role, source, startsAt, endsAt, episodeGroupId: groupId };
    // CC-D27: one batch across every chosen kind, same transaction law.
    // A side is stored only where it changes resolution (the model's own
    // rule). Family and exercise rules, and whole-body axes, keep the
    // long-standing null: the rule applies whole, exactly as before.
    const rows = [
      ...draft.axes.map((axis) => ({
        ...base,
        ruleKind: CONSTRAINT_RULE_KIND.DEMAND,
        ruleValue: axis,
        laterality: isSideCarveable(CONSTRAINT_RULE_KIND.DEMAND, axis) ? (draft.side ?? null) : null,
      })),
      ...(draft.families ?? []).map((fam) => ({ ...base, ruleKind: CONSTRAINT_RULE_KIND.FAMILY, ruleValue: fam })),
      ...(draft.exercises ?? []).map((ex) => ({
        ...base,
        ruleKind: draft.kind === 'allow' ? CONSTRAINT_RULE_KIND.EXERCISE_ALLOW : CONSTRAINT_RULE_KIND.EXERCISE,
        ruleValue: ex.id,
        // An allowance is the user's own call, whatever prompted the rest.
        source: draft.kind === 'allow' ? CONSTRAINT_SOURCE.SELF : source,
      })),
    ];
    const createdIds = await writeConstraintRows(rows, now);
    const subject = draftSubjectPhrase(draft);
    const several = (draft.exercises ?? []).length > 1;
    setAdding(null); setDraft(null);
    toast.show(draft.kind === 'allow'
      ? (subject
        ? `Saved. Volyume will keep offering ${subject}, even where your other answers would normally leave ${several ? 'them' : 'it'} out.`
        : 'Saved. Volyume will keep offering this exercise, even where your other answers would normally leave it out.')
      : isEpisode
        ? (subject
          ? `Saved. Volyume will keep ${subject} out of your training for now. When you're ready to bring it back, end this here and training builds back to your plan.`
          : "Saved. Volyume will work around this for now. When you're done with it, end it here and training builds back to your plan.")
        : (subject
          ? `Saved. Volyume will build your training around ${subject} from now on.`
          : 'Saved. Volyume will build your training around this from now on.'));
    refresh();
    // CC29 (section 14, CAP-11): a NEW EPISODE with an installed plan
    // active proposes its effective diff - grouped, consequential, never
    // silent. Applying substitutes affected sessions at serve time
    // (derived live, base rows untouched); declining leaves the affected
    // slots visibly conflicted with swap shortcuts. The standing choice
    // lives on the rule rows (effective_choice) and is reversible from
    // the episode's own actions.
    if (isEpisode && draft.kind !== 'allow' && Array.isArray(createdIds) && createdIds.length) {
      proposeEffectiveDiff(createdIds, subject).catch(() => { /* proposal is additive */ });
    }
    // CC33 D112 R1a (closes audit T1-03): a NEW BASELINE rule with an
    // installed plan proposes the plan rewrite - permanent shapes the
    // document, so this goes through the document, not the serve-time
    // overlay. Declining leaves the affected rows quietly marked.
    if (!isEpisode && draft.kind !== 'allow' && Array.isArray(createdIds) && createdIds.length) {
      proposeCapabilityPlanRewrite(createdIds, subject).catch(() => { /* proposal is additive */ });
    }
  };

  const onConsent = async () => {
    haptics.selection();
    const ok = await grantCapabilityConsent(userId, {});
    if (!ok) { toast.show('That did not save - you can try again.'); return; }
    setConsented(true);
    try { await writeDraft(); } catch (e) {
      logError('HowYouTrain.consentSave', e, {});
      toast.show('Your consent saved, but the change did not. Tap Add something and try again.');
      setAdding(null);
    }
  };

  // D112 R6 (closes audit T1-04/T1-26): the §14 decline path used to
  // override a clinician-sourced rule exactly as silently as any
  // self-declared one, while the picker refuses an inline override for
  // the same source. Decline stays AVAILABLE here - the user's own
  // document is theirs, no coercion - but never silent: this names the
  // rule's standing before anything is recorded. "Keep it out" backs out
  // of the decline with NOTHING recorded - not even 'applied', which the
  // user never said - leaving the rule undecided and recoverable from
  // the standing revisit row below. Shared by proposeEffectiveDiff's
  // whole-group "Not now" and saveLineReview's per-line "Keep" path.
  // Round 5 (Q-2): the confirm speaks the frame it was reached from.
  // Written for the decline frame, its words ("Declining means...",
  // "Decline anyway") switched vocabulary mid-flow when reached from
  // the revisit dialogue's "Stop working around it" or the per-line
  // review's Keep - on the one gate where precision matters most, and
  // with a cancel ("Keep it out") readable as "keep the rule out".
  const CLINICIAN_CONFIRM_FRAMES = {
    decline: {
      consequence: 'Declining means your sessions keep showing it.',
      cancel: 'Keep it out',
      confirm: 'Decline anyway',
    },
    stop: {
      consequence: 'Stopping means your sessions show it again.',
      cancel: 'Keep working around it',
      confirm: 'Stop anyway',
    },
    keep: {
      consequence: 'Keeping it in means your sessions keep showing it.',
      cancel: 'Go back',
      confirm: 'Keep it in anyway',
    },
  };
  const confirmClinicianDecline = (subject, onDeclineAnyway, frame = 'decline') => {
    const words = CLINICIAN_CONFIRM_FRAMES[frame] ?? CLINICIAN_CONFIRM_FRAMES.decline;
    appAlert(
      'A clinician asked for this one',
      `You told Volyume a clinician asked you to keep ${subject ?? 'this'} out. ${words.consequence} Volyume will not suggest it elsewhere.`,
      [
        { text: words.cancel, style: 'cancel' },
        { text: words.confirm, style: 'destructive', onPress: onDeclineAnyway },
      ],
    );
  };

  // CC29 (section 14, CAP-11): the proposed diff for a new episode against
  // the active plan, grouped per rule (slot micro-approvals avoided). The
  // cross-lane computation lives in lib/sessionEffective.js, outside both
  // lanes, so this capability surface never imports the preference lane.
  // D112 R4 (closes audit T2-23): a third action opens the per-line
  // review (renderLineReview/saveLineReview below) without disturbing
  // the two-button whole-group flow, which stays the primary path.
  // D112 R6 (closes audit T1-04/T1-26): a clinician-sourced rule among
  // createdIds gates the whole-group decline behind
  // confirmClinicianDecline above - never silent, decline stays
  // available. Callers (the add flow, a flare restart, the sync-arrival
  // detector in refresh(), the revisit row below) never need to know
  // any of this; they all just call this one function.
  // Round 5 (R5-9): returns { surfaced, checked }, not a bare boolean -
  // the revisit row's terminal toast needs to know whether "nothing
  // surfaced" means "nothing affected" or "could not tell", and only
  // this function knows which branch it took.
  const proposeEffectiveDiff = async (createdIds, subject = null) => {
    proposalPendingRef.current = true;
    try {
      // eslint-disable-next-line global-require
      // CC32 (section 29): recordEffectiveChoice = the same write plus its
      // aggregate counter, emitted from the neutral seam so this guarded
      // surface stays telemetry-free.
      const {
        computePlanEffectiveSummary, computePlanEffectiveLines,
        clinicianSourcedIds, recordEffectiveChoice,
      } = require('../lib/sessionEffective');
      const [summary, clinicianIds] = await Promise.all([
        computePlanEffectiveSummary(userId, createdIds),
        clinicianSourcedIds(userId, createdIds),
      ]);
      // Round 5 (R5-9): the detector's back-off key is stamped only on a
      // COMPLETED check. Stamped before the read (as it was), a failed
      // read blocked the passive detector from ever retrying this set
      // for the life of the mounted screen - the explicit revisit row
      // was the only recovery. An unchecked set stays retryable.
      if (summary.checked) {
        lastAutoProposedKeyRef.current = (Array.isArray(createdIds) ? createdIds : []).slice().sort().join(',');
      }
      // Lead review: the boolean tells the revisit row whether anything
      // was actually offered, so its tap is never silent. Other callers
      // ignore it.
      //
      // Round 2 (R2-5): a rule that affects NOTHING in the current plan
      // (or a user with no plan at all) has no decision to make - and
      // leaving it undecided made Home's ask-row and the standing
      // revisit row permanent, promising a decision no surface could
      // offer. It is recorded 'applied' vacuously, the same default the
      // whole-group Apply gives a no-effect rule and the same promise
      // the add flow's own toast makes ("Volyume will work around it").
      // If a conflicting exercise arrives later, serve substitutes with
      // its visible notice and swap shortcut - the standing behaviour -
      // and the per-line review remains reachable from the plan surface.
      if (!summary.affected) {
        // Round 7 (R7-4): the fail-safe case is TOLD, never silent.
        // Round 6's mirror correctly stopped the alert claiming
        // reductions serve would refuse to make - but folded the case
        // into "nothing affected", so the save toast's "Volyume will
        // work around this" stood as the only thing ever said about a
        // rule the never-served-empty fail-safe means it will not
        // honour, recorded 'applied' with no proposal. The
        // informational alert states the truth before the record.
        if (summary.checked && (summary.failSafeRoutines ?? 0) > 0) {
          // Round 8 (R8-2, attribution root): outcome-phrased - a
          // fail-safed session's emptiness can be partly another
          // rule's doing, so the alert states what happens, never
          // "this affects every exercise".
          appAlert(
            'Your sessions stay as they are',
            `${subject ? `While ${subject} is out: ` : 'While this lasts: '}${failSafeSentence(summary.failSafeRoutines)}`,
            [{ text: 'OK' }],
          );
          for (const id of createdIds) {
            // eslint-disable-next-line no-await-in-loop
            await recordEffectiveChoice(userId, id, 'applied').catch(() => {});
          }
          return { surfaced: true, checked: true };
        }
        // Round 3 (R3-2): the vacuous write fires ONLY on a completed
        // check. A failed read returns the same empty lines, and
        // recording 'applied' on it would fabricate a decision on
        // nothing - the fail-open A15 forbids. Unchecked rules stay
        // undecided; the focus detector and the revisit row try again.
        if (summary.checked) {
          for (const id of createdIds) {
            // eslint-disable-next-line no-await-in-loop
            await recordEffectiveChoice(userId, id, 'applied').catch(() => {});
          }
        }
        return { surfaced: false, checked: summary.checked };
      }
      // Round 4 (Q3): a PARTIAL read never becomes a proposal either -
      // the alert states counts as fact ("2 exercises swapped..."), and
      // a plan the app failed to finish reading cannot honestly supply
      // them. Nothing is recorded, so the rule stays undecided and the
      // focus detector or the revisit row proposes again on a clean
      // read.
      if (!summary.checked) return { surfaced: false, checked: false };
      const parts = [];
      if (summary.substituted) parts.push(`${summary.substituted} exercise${summary.substituted === 1 ? '' : 's'} swapped for something that works now`);
      if (summary.omitted) parts.push(`${summary.omitted} left out with nothing forced in their place`);
      const declineNow = async () => {
        for (const id of createdIds) {
          // eslint-disable-next-line no-await-in-loop
          await recordEffectiveChoice(userId, id, 'declined').catch(() => {});
        }
        toast.show('Kept as recorded. Affected exercises will show a quiet notice with a swap shortcut.');
      };
      appAlert(
        'Apply this to your current plan?',
        // Round 8 (R8-2): the fail-safe rides the ORDINARY proposal
        // too - it used to be told only when nothing else was affected,
        // so a plan with one substitutable session and one fail-safed
        // one heard about the swap and nothing about the session that
        // would not be honoured at all.
        `${subject ? `While ${subject} is out` : 'While this lasts'}, your sessions would show ${parts.join(', and ')}. Your plan itself is not changed, and everything returns when you end it.${(summary.failSafeRoutines ?? 0) > 0 ? ` ${failSafeSentence(summary.failSafeRoutines)}` : ''}`,
        [
          {
            text: 'Not now',
            style: 'cancel',
            onPress: () => {
              if (clinicianIds.size) { confirmClinicianDecline(subject, declineNow); return; }
              declineNow();
            },
          },
          {
            text: 'Apply while it lasts',
            onPress: async () => {
              for (const id of createdIds) {
                // eslint-disable-next-line no-await-in-loop
                await recordEffectiveChoice(userId, id, 'applied').catch(() => {});
              }
              toast.show(subject
                ? `Applied. Your sessions will leave ${subject} out until you end it.`
                : 'Applied. Your sessions will work around this until you end it.');
            },
          },
          {
            // D112 R4 (closes audit T2-23, §14 step 2 "as a whole or per
            // line"): opens the per-line list below, defaulting every
            // affected line to Apply so the user only has to touch the
            // ones they want to flip.
            text: 'Choose per exercise',
            onPress: async () => {
              const { lines, checked } = await computePlanEffectiveLines(userId, createdIds).catch(() => ({ lines: [], checked: false }));
              if (!lines.length) {
                // Round 6 (R6-6): a failed read is "could not tell",
                // never "nothing to review" - one tap after the alert
                // stated two exercises are affected, that false calm
                // told the user to stop looking (A15's law, the same
                // branch R5-9 gave the revisit toast).
                toast.show(checked ? 'Nothing to review right now.' : COULD_NOT_READ_TOAST);
                return;
              }
              setLineReview({
                ruleIds: createdIds,
                subject,
                lines: lines.map((l, i) => ({
                  key: l.routineExerciseId ?? `${l.routineId}-${i}`,
                  fromName: l.from?.name ?? 'This exercise',
                  toName: l.to?.name ?? null,
                  // For the allowance mint in saveLineReview: a kept
                  // exercise stays served through a per-exercise
                  // allowance, and that write needs the id.
                  exerciseId: l.from?.id ?? null,
                  constraintIds: l.constraintIds,
                  clinician: l.constraintIds.some((id) => clinicianIds.has(id)),
                  apply: true,
                })),
                // Per-rule standing for the save's clinician branch: a
                // line's `clinician` flag says "some driver is clinician",
                // which is not enough to know whether one PARTICULAR rule
                // id is - the save needs both.
                clinicianRuleIds: [...clinicianIds],
              });
            },
          },
        ],
      );
      return { surfaced: true, checked: true };
    } catch (_e) { /* proposal is additive; the save already stands */ } finally {
      proposalPendingRef.current = false;
    }
    return { surfaced: false, checked: false };
  };

  // D112 R4 (closes audit T2-23): the per-line save, lead-ruled on the
  // REPRESENTABLE model rather than a flat AND. effective_choice lives
  // on the RULE row, and one rule can drive several lines (one axis
  // conflicting across several exercises is the common case) - a flat
  // "applied only if every line applied" would silently discard the
  // user's Apply choices whenever they kept one exercise. The landed
  // carve machinery already represents exactly that mix:
  //
  //  - a SELF-declared rule is recorded 'applied' if the user applied
  //    ANY line it drives (or drives none - vacuous, same default the
  //    whole-group Apply gives it), 'declined' only when they kept
  //    every line;
  //  - each KEPT line whose every driving rule ended 'applied' would
  //    otherwise be substituted at serve, so it mints a per-exercise
  //    ALLOWANCE - and (F6, adversarial review) an EPISODE-SCOPED one:
  //    an allow row minted INTO each driving episode's own group, so
  //    the keep lives exactly as long as the episode it answers, ends
  //    with it, restarts with a flare, and becomes permanent only if
  //    the user promotes the episode ("this is how I train now" - allow
  //    rows promote with their group). The picker's identity-level
  //    "this works for me" keeps its permanent baseline mint; a
  //    per-line Keep is an answer about THIS change, and its reach
  //    matches. While it lives, the carve speaks for the exercise
  //    everywhere non-clinician (the standing baseline conversation
  //    resumes when the episode ends);
  //  - a kept line with a DECLINED driver needs no allowance - serve
  //    already refuses to substitute it (conflicted, visible, owed);
  //  - a CLINICIAN rule stays all-or-nothing: rank 2 is never
  //    allowance-carved (CAP-7), so a kept line under an applied
  //    clinician rule is unrepresentable - keeping ANY of its lines
  //    declines the whole rule, behind the same named confirm the
  //    whole-group decline uses (D112 R6). Its kept lines then have a
  //    declined driver, so they mint nothing, consistently.
  //
  // Net effect: every per-line choice takes effect exactly as chosen,
  // and the save's toast can say so truthfully.
  const saveLineReview = async () => {
    const review = lineReview;
    if (!review) return;
    const clinicianRules = new Set(review.clinicianRuleIds ?? []);
    const keptClinician = review.lines.some((l) => !l.apply && l.clinician);
    const commit = async () => {
      try {
        // eslint-disable-next-line global-require
        const { recordEffectiveChoice } = require('../lib/sessionEffective');
        const choiceFor = new Map();
        for (const ruleId of review.ruleIds) {
          const driven = review.lines.filter((l) => l.constraintIds.includes(ruleId));
          const applied = clinicianRules.has(ruleId)
            ? driven.every((l) => l.apply)
            : (driven.length === 0 || driven.some((l) => l.apply));
          choiceFor.set(ruleId, applied ? 'applied' : 'declined');
          // eslint-disable-next-line no-await-in-loop
          await recordEffectiveChoice(userId, ruleId, applied ? 'applied' : 'declined').catch(() => {});
        }
        let allowed = 0;
        let allowFailed = 0;
        // ruleId -> its episode's group, for the episode-scoped mint.
        const groupOfRule = new Map();
        for (const ep of state.episodes ?? []) {
          for (const r of ep.rows ?? []) groupOfRule.set(r.id, ep.groupId);
        }
        const minted = new Set(); // dedupe (group, exercise) across lines
        for (const l of review.lines) {
          if (l.apply || !l.exerciseId) continue;
          const wouldSubstitute = l.constraintIds.length > 0
            && l.constraintIds.every((id) => choiceFor.get(id) === 'applied');
          if (!wouldSubstitute) continue;
          // One allow row per DRIVING group: the carve must last until
          // the last episode that could substitute this line has ended,
          // and each group's row ends/restarts/promotes with its group.
          const groups = [...new Set(l.constraintIds.map((id) => groupOfRule.get(id)).filter(Boolean))];
          if (!groups.length) { allowFailed += 1; continue; }
          for (const groupId of groups) {
            const key = `${groupId}:${l.exerciseId}`;
            if (minted.has(key)) continue;
            minted.add(key);
            // eslint-disable-next-line global-require
            const { createConstraint } = require('../lib/capability/store');
            // eslint-disable-next-line no-await-in-loop
            await createConstraint(userId, {
              role: 'episode', episodeGroupId: groupId, source: 'self',
              ruleKind: CONSTRAINT_RULE_KIND.EXERCISE_ALLOW, ruleValue: l.exerciseId,
              startsAt: Date.now(),
            }).then(() => { allowed += 1; }).catch(() => { allowFailed += 1; });
          }
        }
        setLineReview(null);
        if (allowFailed > 0) {
          // A failed mint under all-applied drivers means serve WOULD
          // still swap that exercise - say so rather than claiming the
          // keep took effect.
          toast.show('Saved, but a kept exercise could not be recorded. It may still be swapped in sessions. You can allow it from the exercise picker.', { variant: 'warning' });
        } else {
          toast.show(allowed > 0
            ? 'Saved. Exercises you kept stay in while this lasts, listed on its card here.'
            : 'Saved your choices for each exercise.');
        }
        refresh();
      } catch (e) {
        logError('HowYouTrain.saveLineReview', e, {});
        toast.show('That did not save. Try again.');
      }
    };
    if (keptClinician) { confirmClinicianDecline(review.subject, commit, 'keep'); return; }
    await commit();
  };

  // D112 R4 (closes audit T2-23's recoverability half): tapping the
  // standing row re-runs both proposal paths fresh - undecided episode
  // rules through the SAME shared proposeEffectiveDiff the add flow, a
  // flare restart and the sync-arrival detector in refresh() all use,
  // and any baseline conflict the plan rewrite has not yet resolved
  // through proposeCapabilityPlanRewrite with no ids (which already
  // judges every active baseline rule - see its own definition below).
  // This is an explicit user action, so it is never gated behind
  // proposalPendingRef; only the passive detector in refresh() backs off.
  // Round 4 (F-1): revisiting an ALREADY-APPLIED episode is its own
  // dialogue, per GROUP, never a re-run of the apply proposal. The
  // round-3 shape passed the flat union of every applied rule to
  // proposeEffectiveDiff, whose cancel-styled "Not now" wrote
  // 'declined' against ALL of them - one tap on the natural dismiss
  // stopped Volyume working around every episode the user had. Here:
  // the alert names its group's subject, the cancel is a TRUE no-op,
  // stopping is explicit and group-scoped (clinician rules keep their
  // named confirm), and "Choose per exercise" opens the same per-line
  // review.
  const reviewAppliedGroup = async (ep, appliedIds, lines, failSafeCount = 0) => {
    // Round 8 (R8-2): a group can have live lines AND a fail-safed
    // routine at once - the fail-safe sentence rides the ordinary body
    // then, and only a group with NO lines at all gets the dedicated
    // fail-safe dialogue.
    const failSafe = !lines.length && failSafeCount > 0;
    try {
      // eslint-disable-next-line global-require
      const { clinicianSourcedIds, recordEffectiveChoice } = require('../lib/sessionEffective');
      const clinicianIds = await clinicianSourcedIds(userId, appliedIds).catch(() => new Set());
      const subject = groupSubject(ep.rows.filter((r) => r.state === CONSTRAINT_STATE.ACTIVE));
      const substituted = lines.filter((l) => l.to).length;
      const omitted = lines.length - substituted;
      const parts = [];
      if (substituted) parts.push(`${substituted} exercise${substituted === 1 ? '' : 's'} swapped for something that works now`);
      if (omitted) parts.push(`${omitted} left out with nothing forced in their place`);
      const stopNow = async () => {
        for (const id of appliedIds) {
          // eslint-disable-next-line no-await-in-loop
          await recordEffectiveChoice(userId, id, 'declined').catch(() => {});
        }
        toast.show('Stopped. Affected exercises show a quiet notice with a swap shortcut.');
        refresh();
      };
      // Round 7 (R7-4): a group whose rules the never-served-empty
      // fail-safe is absorbing has no swap or omission to describe and
      // no per-line list to offer - the dialogue states the truth (the
      // sessions run as they are) and keeps stopping available, so the
      // decision recorded on the user's behalf stays revisitable.
      // Round 8 (R8-2/C1): its frame presupposes nothing false - the
      // app is not "working around" anything for a fail-safed group,
      // so the title asks about the applied RULE and the destructive
      // action names the same; and a group with lines AND a fail-safed
      // routine carries the fail-safe sentence on the ordinary body.
      appAlert(
        failSafe
          ? (subject ? `Keep ${subject} applied?` : 'Keep this applied?')
          : (subject ? `Keep working around ${subject}?` : 'Keep working around this?'),
        failSafe
          ? failSafeSentence(failSafeCount)
          : `Your sessions currently show ${parts.join(', and ')}. Your plan itself is unchanged.${failSafeCount > 0 ? ` ${failSafeSentence(failSafeCount)}` : ''}`,
        failSafe ? [
          { text: 'Leave it as it is', style: 'cancel' },
          {
            text: 'Stop applying it',
            style: 'destructive',
            onPress: () => {
              if (clinicianIds.size) { confirmClinicianDecline(subject, stopNow, 'stop'); return; }
              stopNow();
            },
          },
        ] : [
          // A true no-op: looking is not deciding.
          { text: 'Leave it as it is', style: 'cancel' },
          {
            text: 'Stop working around it',
            style: 'destructive',
            onPress: () => {
              if (clinicianIds.size) { confirmClinicianDecline(subject, stopNow, 'stop'); return; }
              stopNow();
            },
          },
          {
            text: 'Choose per exercise',
            onPress: () => {
              setLineReview({
                ruleIds: appliedIds,
                subject,
                lines: lines.map((l, i) => ({
                  key: l.routineExerciseId ?? `${l.routineId}-${i}`,
                  fromName: l.from?.name ?? 'This exercise',
                  toName: l.to?.name ?? null,
                  exerciseId: l.from?.id ?? null,
                  constraintIds: l.constraintIds,
                  clinician: l.constraintIds.some((id) => clinicianIds.has(id)),
                  apply: true,
                })),
                clinicianRuleIds: [...clinicianIds],
              });
            },
          },
        ],
      );
      return true;
    } catch (_e) { return false; }
  };

  const revisitCapabilityPlan = async () => {
    haptics.selection();
    // eslint-disable-next-line global-require
    const { computePlanEffectiveLines, computeCapabilityPlanRewrite } = require('../lib/sessionEffective');
    // Round 5 (R5-9): a failed read is "could not tell", never "nothing
    // needs a decision" - the terminal toast says which one happened.
    let couldNotRead = false;
    const ids = undecidedEpisodeRuleIds(state.episodes);
    if (ids.length) {
      const r = await proposeEffectiveDiff(ids, null)
        .catch(() => ({ surfaced: false, checked: false }));
      // One conversation per tap (Q-3/J4): the undecided proposal is the
      // highest-value one, and the row remains for everything else. Not
      // surfaced but checked means the rules touch nothing (recorded
      // applied vacuously inside) - fall through to the rest.
      if (r.surfaced) return;
      if (!r.checked) couldNotRead = true;
    }
    // Round 5 (R5-6): gather EVERY conversation this row can offer -
    // each applied episode group currently producing lines, and the
    // baseline plan rewrite - then open exactly one. Round 4's loop
    // broke on the first group, and since that group's cancel is a true
    // no-op by design, no tap sequence ever reached the second group's
    // review without first changing the first group's state.
    const groupChoices = [];
    for (const ep of state.episodes ?? []) {
      const appliedIds = ep.rows
        .filter((r) => r.state === CONSTRAINT_STATE.ACTIVE && r.effectiveChoice === 'applied'
          && r.adaptationMode !== 'hold' && r.ruleKind !== CONSTRAINT_RULE_KIND.EXERCISE_ALLOW)
        .map((r) => r.id);
      if (!appliedIds.length) continue;
      // eslint-disable-next-line no-await-in-loop
      // Round 6 (R6-3): serve-gate mode - these lines feed a dialogue
      // that speaks in the indicative ("Your sessions currently
      // show..."), so they must describe what serve is DOING, not what
      // applying would do. A group whose rows are all held in place by
      // a declined or undecided co-driver, or whose routine fail-safes,
      // produces no lines and is not offered as a conversation.
      const { lines, checked, failSafeRoutineIds } = await computePlanEffectiveLines(userId, appliedIds, { serveGate: true })
        .catch(() => ({ lines: [], checked: false, failSafeRoutineIds: [] }));
      if (!checked) { couldNotRead = true; continue; }
      // Round 7 (R7-4): a fail-safed group IS a conversation - its
      // dialogue states that the sessions run as they are and keeps
      // stopping available. Round 8 (R8-2): the fail-safe COUNT rides
      // along whether or not the group also has lines, so the mixed
      // shape is told too.
      const failSafeCount = failSafeRoutineIds?.length ?? 0;
      if (!lines.length && !failSafeCount) continue;
      groupChoices.push({ ep, appliedIds, lines, failSafeCount });
    }
    const rw = await computeCapabilityPlanRewrite(userId, {})
      .catch(() => ({ lines: [], checked: false }));
    if (!rw.checked) couldNotRead = true;
    const hasRewrite = rw.lines.length > 0;
    if (!groupChoices.length && !hasRewrite) {
      // Lead review: an explicit tap never ends in silence. Undecided
      // rules that touch nothing in the current plan, and a plan already
      // matching every baseline rule, both land on the honest quiet
      // line; a read the app could not finish says so instead.
      toast.show(couldNotRead
        ? COULD_NOT_READ_TOAST
        : 'Nothing in your current plan needs a decision right now.');
      return;
    }
    const openGroup = (g) => { reviewAppliedGroup(g.ep, g.appliedIds, g.lines, g.failSafeCount).catch(() => {}); };
    const openRewrite = () => { proposeCapabilityPlanRewrite(null, null).catch(() => {}); };
    if (groupChoices.length + (hasRewrite ? 1 : 0) === 1) {
      if (groupChoices.length) openGroup(groupChoices[0]); else openRewrite();
      return;
    }
    // More than one conversation available: a chooser, so each stays
    // reachable and only ONE dialogue opens per tap (Q-3) - the others
    // wait here, and the cancel is a true no-op.
    const buttons = groupChoices.map((g) => {
      const active = g.ep.rows.filter((r) => r.state === CONSTRAINT_STATE.ACTIVE);
      const subj = groupSubject(active);
      const firstRule = active.find((r) => r.ruleKind !== CONSTRAINT_RULE_KIND.EXERCISE_ALLOW);
      return {
        text: subj
          ? `Working around ${subj}`
          : (firstRule ? `Working around: ${ruleLabel(firstRule)}` : 'A temporary change'),
        onPress: () => openGroup(g),
      };
    });
    // Round 6 (J4): two groups can label identically (the same subject
    // phrase, or two unnameable ones). Colliding labels get the group's
    // start date - identity carried in text, so the user can tell the
    // buttons apart.
    const labelCounts = new Map();
    buttons.forEach((b) => labelCounts.set(b.text, (labelCounts.get(b.text) ?? 0) + 1));
    buttons.forEach((b, i) => {
      if ((labelCounts.get(b.text) ?? 1) < 2) return;
      const started = Math.min(
        ...groupChoices[i].ep.rows.map((r) => r.startsAt ?? Infinity),
      );
      if (Number.isFinite(started)) {
        b.text = `${b.text} (from ${new Date(started).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})`;
      }
    });
    if (hasRewrite) {
      buttons.push({ text: 'How your plan matches your permanent rules', onPress: openRewrite });
    }
    // Round 6 (C1): the F-1 no-op wording, not "Not now" - on this same
    // screen "Not now" is the apply proposal's DECLINE, which writes a
    // choice against every rule. One phrase per meaning.
    buttons.push({ text: 'Leave it as it is', style: 'cancel' });
    appAlert(
      'More than one thing to look at',
      'Each of these affects your current plan. Pick one to review. The others stay here for another time.',
      buttons,
    );
  };

  // CC33 D112 R1a/b (closes audit T1-03 and T2-01): the PLAN REWRITE
  // proposal for BASELINE rules - a new permanent rule, or a promoted
  // episode (the section 24 rebuild/adjust offer). Permanent shapes the
  // document: unlike the episode overlay, accepting changes the plan
  // itself; declining keeps it, with the affected rows quietly marked in
  // sessions. The computation lives in lib/sessionEffective.js so this
  // capability surface never imports the preference lane.
  const proposeCapabilityPlanRewrite = async (ruleIds, subject = null) => {
    try {
      // eslint-disable-next-line global-require
      const { computeCapabilityPlanRewrite, applyCapabilityPlanRewrite } = require('../lib/sessionEffective');
      const rw = await computeCapabilityPlanRewrite(userId, { ruleIds });
      const n = rw.lines.length;
      // The shape mirrors proposeEffectiveDiff's (round 5, R5-9):
      // surfaced whenever something was put in front of the user (the
      // no-match information alert included); checked=false whenever the
      // computation could not tell, so the revisit row's terminal toast
      // never reads a failed read as "nothing needs a decision".
      if (!n) return { surfaced: false, checked: rw.checked };
      const k = rw.substitutable;
      const u = rw.unsolvable;
      const plural = (c) => (c === 1 ? '' : 's');
      const sits = n === 1 ? 'sits' : 'sit';
      let body;
      if (k === 0) {
        body = `${n} exercise${plural(n)} in your current plan ${sits} outside how you train, and no close match fits right now. ${n === 1 ? 'It stays' : 'They stay'} in place with a quiet note, and you can swap ${n === 1 ? 'it' : 'them'} any time.`;
      } else if (u === 0) {
        body = `${n} exercise${plural(n)} in your current plan ${sits} outside how you train. Volyume can swap ${n === 1 ? 'it' : 'them'} for movements that fit. Your history is not rewritten.`;
      } else {
        body = `${n} exercises in your current plan sit outside how you train. Volyume can swap ${k} for movements that fit; ${u === 1 ? '1 has no close match and stays' : `${u} have no close match and stay`} in place with a quiet note. Your history is not rewritten.`;
      }
      if (k === 0) {
        appAlert('Some of your plan sits outside this', body, [{ text: 'OK' }]);
        return { surfaced: true, checked: true };
      }
      appAlert(
        'Update your plan to match?',
        body,
        [
          {
            // Round 7 (R7-5): the F-1 no-op wording here too - this
            // button writes nothing, and on this same screen 'Not now'
            // is the apply proposal's DECLINE. One phrase per meaning:
            // 'Not now' may appear only on the button that declines.
            text: 'Leave it as it is',
            style: 'cancel',
            onPress: () => {
              toast.show('Kept as it is. Affected exercises show a quiet note with a swap shortcut.');
            },
          },
          {
            text: 'Update my plan',
            onPress: async () => {
              const res = await applyCapabilityPlanRewrite(userId, rw.lines);
              if (res.applied > 0) {
                toast.show(subject
                  ? `Updated. ${res.applied} exercise${plural(res.applied)} swapped to fit how you train with ${subject}.`
                  : `Updated. ${res.applied} exercise${plural(res.applied)} swapped to fit how you train.`);
              }
              if (res.failed > 0) {
                toast.show('Some swaps did not save. The affected exercises keep their quiet note, so nothing is lost.');
              }
              refresh();
            },
          },
        ],
      );
      return { surfaced: true, checked: true };
    } catch (_e) { /* proposal is additive; the rule already stands */ }
    return { surfaced: false, checked: false };
  };

  const confirmEndEpisode = (ep) => {
    const subject = groupSubject(ep.rows.filter(r => r.state === 'active'));
    appAlert(
      subject ? `Back to ${subject}?` : 'Done with this?',
      'Everything comes back straight away, and training builds back up to your plan over the coming weeks. Nothing from this period is lost.', [
      { text: 'Not yet', style: 'cancel' },
      {
        text: subject ? 'Yes, bring it back' : 'Done with it',
        onPress: async () => {
          await endEpisode(userId, ep.groupId);
          // CC31 (section 23): apply reintroduction ramp and show toast if muscles ramped.
          try {
            // eslint-disable-next-line global-require
            const { applyReintroductionRamp, reintroductionCopy } = require('../lib/capability/reintroduction');
            const { ramped } = await applyReintroductionRamp(userId, { endedAtMs: Date.now() });
            if (ramped.length > 0) {
              const firstRamped = ramped[0];
              // Try to resolve muscle display name, fall back to raw label
              let muscleLabel = firstRamped.muscle;
              try {
                // eslint-disable-next-line global-require
                const { muscleDisplayName } = require('../lib/algorithms');
                muscleLabel = muscleDisplayName(firstRamped.muscle) ?? firstRamped.muscle;
              } catch (_) {}
              toast.show(reintroductionCopy(muscleLabel));
            }
          } catch (_) {
            // Best-effort; never blocks the end flow
          }
          refresh();
        },
      },
    ]);
  };

  const confirmPromote = (ep) => {
    const subject = groupSubject(ep.rows.filter(r => r.state === 'active'));
    appAlert('Make this part of how you train?',
      subject
        ? `Volyume will keep building your training around ${subject} from now on, with full progression and coaching. Your history is not rewritten.`
        : 'Volyume will keep these as your normal setup from now on, with full progression and coaching. Your history is not rewritten.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'This is how I train now',
        onPress: async () => {
          // CC33 D112 R1b (closes audit T2-01): promotion mints baseline
          // rows, and the serve-time overlay for the old episode stops -
          // so the section 24 rebuild offer runs IMMEDIATELY against the
          // minted rules. Accepting writes the substitutions the user was
          // already being served into the plan itself; declining keeps
          // the plan with the affected rows quietly marked. Either way,
          // nothing silently reverts to an excluded exercise.
          const promotedIds = await promoteEpisode(userId, ep.groupId);
          refresh();
          if (Array.isArray(promotedIds) && promotedIds.length) {
            proposeCapabilityPlanRewrite(promotedIds, subject).catch(() => { /* additive */ });
          }
        },
      },
    ]);
  };

  const confirmWithdraw = () => {
    appAlert('Delete everything here?', 'This deletes everything you have told Volyume here, on all your devices, and turns the feature off. Your account, workouts and history are untouched.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete and turn off',
        style: 'destructive',
        onPress: async () => {
          try {
            await withdrawCapabilityConsent(userId, {});
            toast.show('Removed. You can set this up again any time.');
          } catch (e) {
            logError('HowYouTrain.withdraw', e);
            toast.show('Could not delete right now. Nothing was removed - try again.', { variant: 'error' });
          }
          refresh();
        },
      },
    ]);
  };

  // Article 20 portability (CAP-20, R1 #22): a structured JSON file of
  // everything in this lane, via the share sheet. Not consent-gated -
  // reading your own data out is a right, not new processing. No row
  // content goes to logs on failure.
  const exportCapabilityData = async () => {
    try {
      const payload = await buildCapabilityExport(userId);
      if (!payload || (!payload.constraints.length && !payload.session_effects.length)) {
        toast.show('Nothing to export yet.');
        return;
      }
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const fileUri = `${FileSystem.cacheDirectory}volyume_capability_${date}.json`;
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(payload, null, 2), {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export this information',
        });
      } else {
        toast.show('Export saved.');
      }
    } catch (e) {
      logError('HowYouTrain.exportCapabilityData', e);
      toast.show('Could not export right now. Try again later.', { variant: 'error' });
    }
  };

  const endBaselineRow = (row) => {
    // F6: removing an ALLOWANCE means the opposite of removing a
    // restriction - rules that would leave the exercise out apply
    // again. The confirm says which way this cut goes.
    if (row.ruleKind === CONSTRAINT_RULE_KIND.EXERCISE_ALLOW) {
      appAlert(
        `Stop keeping ${ruleLabel(row)} in?`,
        'Rules that would leave it out apply again from now on. Nothing in your history changes.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', onPress: async () => { await endConstraint(userId, row.id); refresh(); } },
      ]);
      return;
    }
    // Natural coach-language order (2026-08-21): the title named nothing
    // while the body named the rule; a person names it once, up front.
    const subject = groupSubject([row]);
    appAlert(
      subject ? `Stop building around ${subject}?` : 'Remove this from your setup?',
      subject
        ? 'Volyume will plan and suggest it normally again from now on. Nothing in your history changes.'
        : `Volyume will stop building around "${ruleLabel(row)}".`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', onPress: async () => { await endConstraint(userId, row.id); refresh(); } },
    ]);
  };

  // CC31 (section 20, history restart): add a handler for "Start this again"
  // on ended episode-role rows.
  const confirmRestartEpisode = (row) => {
    // Same group filter as the write below, read-only, purely for naming.
    const subject = groupSubject(row.episodeGroupId
      ? state.history.filter((h) => h.episodeGroupId === row.episodeGroupId
        && h.role === CONSTRAINT_ROLE.EPISODE)
      : [row]);
    appAlert(
      subject ? `Keep ${subject} out again?` : 'Start this again from today?',
      subject ? 'From today, until you end it here.' : 'You can end it any time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Start again',
        onPress: async () => {
          try {
            // Consent gates every write path (CC-D27), the re-start
            // included: a withdrawn consent must not be bypassed by an
            // old episode's shortcut.
            if (!(await hasCapabilityConsent(userId))) {
              toast.show('Turn this feature back on first, under the consent section below.');
              return;
            }
            // Section 21: the re-start recreates the WHOLE saved shape -
            // every rule the ended episode's group carried - under one
            // fresh group, one confirm, no re-entry of every card.
            const now = Date.now();
            const newGroupId = uid();
            const groupRows = row.episodeGroupId
              ? state.history.filter((h) => h.episodeGroupId === row.episodeGroupId
                && h.role === CONSTRAINT_ROLE.EPISODE)
              : [row];
            const rows = (groupRows.length ? groupRows : [row]).map((h) => ({
              role: h.role,
              ruleKind: h.ruleKind,
              ruleValue: h.ruleValue,
              laterality: h.laterality ?? null,
              episodeGroupId: newGroupId,
              startsAt: now,
              endsAt: null, // stays open until the user ends it
              source: h.source,
            }));
            // T1-05 (closes audit): the restart always MINTS new rows
            // (createCapabilityConstraints - confirmed against
            // database.js:11552-11578: fresh uid() per row, never a
            // reactivation of the ended ones), so createdIds here is the
            // fresh group's own ids. Propose exactly as the add flow
            // does (writeDraft above): the flare is back, so its effect
            // on the current plan is offered again, not left silent.
            const createdIds = await writeConstraintRows(rows, now);
            toast.show(subject
              ? `Started again from today. Volyume will keep ${subject} out until you end it here.`
              : 'Started again from today. Volyume will work around it until you end it here.');
            refresh();
            if (Array.isArray(createdIds) && createdIds.length) {
              proposeEffectiveDiff(createdIds, subject).catch(() => { /* proposal is additive */ });
            }
          } catch (e) {
            logError('HowYouTrain.restartEpisode', e, {});
            toast.show('Could not start this again. Try once more.', { variant: 'error' });
          }
        },
      },
    ]);
  };

  const renderAddFlow = () => {
    if (adding === 'role') {
      return (
        <View style={[styles.card, { backgroundColor: t.colors.surface }]}>
          <Text style={[styles.q, { color: t.colors.textPrimary }]}>Is this about how you train generally, or something temporary right now?</Text>
          <Choice label="How I train generally" sub="Part of your normal setup. Full progression and coaching, no special labels."
            onPress={() => chooseRole(CONSTRAINT_ROLE.BASELINE)} t={t} />
          <Choice label="Temporary, for now" sub="Volyume takes it as a passing change and will help you build back up when it ends."
            onPress={() => chooseRole(CONSTRAINT_ROLE.EPISODE)} t={t} />
        </View>
      );
    }
    if (adding === 'kind') {
      const isBaseline = draft.role === CONSTRAINT_ROLE.BASELINE;
      return (
        <View style={[styles.card, { backgroundColor: t.colors.surface }]}>
          <Text style={[styles.q, { color: t.colors.textPrimary }]}>What kind of thing is it?</Text>
          <Choice label="A kind of movement or position" sub="Standing work, overhead positions, gripping a bar and so on."
            onPress={() => chooseKind('demand')} t={t} />
          <Choice label="A movement pattern" sub="A whole pattern, like overhead pressing or squatting."
            onPress={() => chooseKind('family')} t={t} />
          <Choice label="A specific exercise" sub="Volyume will build around that one exercise."
            onPress={() => chooseKind('exercise')} t={t} />
          {isBaseline ? (
            <Choice label="An exercise that is always fine for me" sub="Overrides the rest of your setup for that exercise."
              onPress={() => chooseKind('allow')} t={t} />
          ) : null}
        </View>
      );
    }
    if (adding === 'family') {
      // Section 33.3: family rules are OFFERED only for families that
      // exist on the library's exercises - computed, never hardcoded.
      const familyKeys = [...new Set(library
        .map(e => movementFamily(e.name, e.primaryMuscle, e.subregion))
        .filter(Boolean))].sort((a, b) => String(familyLabel(a)).localeCompare(String(familyLabel(b))));
      return (
        <View style={[styles.card, { backgroundColor: t.colors.surface }]}>
          <Text style={[styles.q, { color: t.colors.textPrimary }]}>Which movement patterns?</Text>
          <Text style={[styles.hint, { color: t.colors.textSecondary }]}>Pick anything that applies. You never need to say why.</Text>
          {familyKeys.map(key => (
            <Choice key={key} label={familyLabel(key)} selected={draft.families.includes(key)}
              onPress={() => toggleFamily(key)} t={t} />
          ))}
          <Choice label={draft.clinician ? 'A clinician asked for this: yes' : 'A clinician asked for this: no'}
            sub="Only changes how Volyume words things. It never contacts anyone."
            onPress={() => setDraft(d => ({ ...d, clinician: !d.clinician }))} t={t} />
          <Choice label="Continue" disabled={!draft.families.length}
            onPress={() => setAdding(draft.role === CONSTRAINT_ROLE.EPISODE ? 'dates' : 'readback')} t={t} primary />
        </View>
      );
    }
    if (adding === 'exercise') {
      const isAllow = draft.kind === 'allow';
      const q = exerciseQuery.trim().toLowerCase();
      const matches = q.length >= 2
        ? library.filter(e => e.name.toLowerCase().includes(q)).slice(0, 8)
        : [];
      return (
        <View style={[styles.card, { backgroundColor: t.colors.surface }]}>
          <Text style={[styles.q, { color: t.colors.textPrimary }]}>
            {isAllow ? 'Which exercise is always fine?' : 'Which exercise should Volyume build around?'}
          </Text>
          <TextInput
            accessibilityLabel="Search exercises"
            value={exerciseQuery}
            onChangeText={setExerciseQuery}
            placeholder="Search exercises"
            placeholderTextColor={t.colors.textMuted}
            style={[styles.search, { color: t.colors.textPrimary, borderColor: t.colors.borderSubtle, backgroundColor: t.colors.inputBg }]}
          />
          {draft.exercises.map(ex => (
            <Choice key={ex.id} label={ex.name} selected
              onPress={() => toggleExercise(ex)} t={t} />
          ))}
          {matches.filter(m => !draft.exercises.some(e => e.id === m.id)).map(m => (
            <Choice key={m.id} label={m.name} onPress={() => toggleExercise(m)} t={t} />
          ))}
          {!isAllow ? (
            <Choice label={draft.clinician ? 'A clinician asked for this: yes' : 'A clinician asked for this: no'}
              sub="Only changes how Volyume words things. It never contacts anyone."
              onPress={() => setDraft(d => ({ ...d, clinician: !d.clinician }))} t={t} />
          ) : null}
          <Choice label="Continue" disabled={!draft.exercises.length}
            onPress={() => setAdding(draft.role === CONSTRAINT_ROLE.EPISODE && !isAllow ? 'dates' : 'readback')} t={t} primary />
        </View>
      );
    }
    if (adding === 'axes') {
      return (
        <View style={[styles.card, { backgroundColor: t.colors.surface }]}>
          <Text style={[styles.q, { color: t.colors.textPrimary }]}>What should Volyume build around?</Text>
          <Text style={[styles.hint, { color: t.colors.textSecondary }]}>Pick anything that applies. You never need to say why.</Text>
          {DEMAND_AXES.map(a => (
            <Choice key={a.id} label={a.label} selected={draft.axes.includes(a.id)}
              onPress={() => toggleAxis(a.id)} t={t} />
          ))}
          <Choice label={draft.clinician ? 'A clinician asked for this: yes' : 'A clinician asked for this: no'}
            sub="Only changes how Volyume words things. It never contacts anyone."
            onPress={() => setDraft(d => ({ ...d, clinician: !d.clinician }))} t={t} />
          <Choice label="Continue" disabled={!draft.axes.length}
            onPress={() => setAdding(afterRuleStage(draft))} t={t} primary />
        </View>
      );
    }
    if (adding === 'side') {
      const ask = sideAsk(draft);
      return (
        <View style={[styles.card, { backgroundColor: t.colors.surface }]}>
          <Text style={[styles.q, { color: t.colors.textPrimary }]}>{ask.question}</Text>
          <Text style={[styles.hint, { color: t.colors.textSecondary }]}>
            If it is one side, Volyume can still include movements you can do one side at a
            time. It plans them as normal, and how you work them is up to you.
          </Text>
          <Choice label={ask.left} onPress={() => chooseSide(LATERALITY.LEFT)} t={t} />
          <Choice label={ask.right} onPress={() => chooseSide(LATERALITY.RIGHT)} t={t} />
          <Choice label={ask.both} onPress={() => chooseSide(null)} t={t} />
        </View>
      );
    }
    if (adding === 'dates') {
      return (
        <View style={[styles.card, { backgroundColor: t.colors.surface }]}>
          <Text style={[styles.q, { color: t.colors.textPrimary }]}>Since when?</Text>
          {START_CHOICES.map(c => (
            <Choice key={c.key} label={c.label} selected={draft.startDays === c.days}
              onPress={() => setDraft(d => ({ ...d, startDays: c.days }))} t={t} />
          ))}
          <Text style={[styles.q, { color: t.colors.textPrimary, marginTop: 16 }]}>Roughly how long?</Text>
          <Text style={[styles.hint, { color: t.colors.textSecondary }]}>A rough guess is fine. Volyume will check with you rather than assume.</Text>
          {END_CHOICES.map(c => (
            <Choice key={c.key} label={c.label} selected={draft.endDays === c.days}
              onPress={() => setDraft(d => ({ ...d, endDays: c.days }))} t={t} />
          ))}
          <Choice label="Continue" onPress={() => setAdding('readback')} t={t} primary />
        </View>
      );
    }
    if (adding === 'consent') {
      return (
        <View style={[styles.card, { backgroundColor: t.colors.surface }]}>
          <Text style={[styles.q, { color: t.colors.textPrimary }]}>One thing first</Text>
          <Text style={[styles.body, { color: t.colors.textPrimary }]}>
            To build training around your body, Volyume stores what you choose here: the training
            situations you have asked it to work around, whether each is part of your normal setup
            or temporary, and when it applies. That counts as health information, so it needs your
            explicit agreement. It is never used for anything else and never shared with anyone
            beyond the secure EU service that stores your Volyume data, and you can see, export or
            delete all of it here at any time. Deleting it does not touch your account.
          </Text>
          <Choice label="I agree - store this information" onPress={onConsent} t={t} primary />
          {/* Round 14 (R14-3): 'Not now' is this lane's decline word (it
              writes 'declined' on the apply proposal one state away),
              and this dismiss writes nothing - the D118 one-phrase-per-
              meaning blur, on the consent card itself. Action-phrased
              instead; the gate's behaviour is untouched. */}
          <Choice label="Leave it for now" sub="You can still avoid specific exercises from Plan tools, and set your equipment - neither needs this agreement."
            onPress={() => { setAdding(null); setDraft(null); }} t={t} />
        </View>
      );
    }
    if (adding === 'readback') {
      const labels = [
        ...draft.axes.map((a) => {
          const sided = draft.side && isSideCarveable(CONSTRAINT_RULE_KIND.DEMAND, a)
            ? sidedRuleLabel({ ruleValue: a, laterality: draft.side }) : null;
          return (sided ?? demandLabel(a)).toLowerCase();
        }),
        ...(draft.families ?? []).map(f => familyLabel(f)),
        ...(draft.exercises ?? []).map(e => e.name),
      ].join(', ');
      const isEpisode = draft.role === CONSTRAINT_ROLE.EPISODE;
      const isAllow = draft.kind === 'allow';
      const backStage = sidedAxes(draft).length
        ? 'side'
        : draft.kind === 'demand' ? 'axes' : draft.kind === 'family' ? 'family' : 'exercise';
      return (
        <View style={[styles.card, { backgroundColor: t.colors.surface }]}>
          <Text style={[styles.q, { color: t.colors.textPrimary }]}>
            {isAllow
              ? `Always fine for you: ${labels}.`
              : isEpisode
                ? `Volyume will temporarily work around: ${labels}.`
                : `Volyume will build your training around: ${labels}.`}
          </Text>
          <Choice label="Save" onPress={saveDraft} t={t} primary />
          <Choice label="Back" onPress={() => setAdding(backStage)} t={t} />
        </View>
      );
    }
    return null;
  };

  // D112 R4 (closes audit T2-23, §14 step 2): the "Choose per exercise"
  // review, staged inline like the add flow above (same card pattern,
  // no Modal - the R4 Modal-focus mitigation applies here too).
  const renderLineReview = () => {
    if (!lineReview) return null;
    return (
      <View style={[styles.card, { backgroundColor: t.colors.surface }]}>
        <Text style={[styles.q, { color: t.colors.textPrimary }]}>Choose per exercise</Text>
        <Text style={[styles.hint, { color: t.colors.textSecondary }]}>
          {lineReview.subject ? `While ${lineReview.subject} is out, decide each exercise on its own. ` : 'Decide each exercise on its own. '}
          Kept exercises stay in your sessions while this lasts, listed on its card here.
        </Text>
        {lineReview.lines.map((line, i) => (
          <View key={line.key} style={styles.reviewLine}>
            <Text
              style={[styles.body, { color: t.colors.textPrimary }]}
              // The arrow glyph's spoken treatment varies by screen
              // reader, so the relationship is stated in words here.
              accessibilityLabel={line.toName
                ? `${line.fromName} would be replaced by ${line.toName}`
                : `${line.fromName}: no close match, stays with a note`}
            >
              {line.toName ? `${line.fromName} → ${line.toName}` : `${line.fromName}: no close match, stays with a note`}
            </Text>
            <View style={styles.episodeActions}>
              <Choice label="Apply" selected={line.apply} compact t={t}
                onPress={() => {
                  haptics.selection();
                  setLineReview((cur) => (cur ? { ...cur, lines: cur.lines.map((l, j) => (j === i ? { ...l, apply: true } : l)) } : cur));
                }} />
              <Choice label="Keep" selected={!line.apply} compact t={t}
                onPress={() => {
                  haptics.selection();
                  setLineReview((cur) => (cur ? { ...cur, lines: cur.lines.map((l, j) => (j === i ? { ...l, apply: false } : l)) } : cur));
                }} />
            </View>
          </View>
        ))}
        <Choice label="Save my choices" onPress={saveLineReview} t={t} primary />
        <Choice label="Cancel" onPress={() => setLineReview(null)} t={t} />
      </View>
    );
  };

  const episodeSub = (ep) => {
    // F6: an allowance row on the card is the user's per-line KEEP - it
    // must never list as though it were another restriction, so it
    // carries its meaning inline.
    const names = ep.rows.filter(r => r.state === 'active')
      .map(r => (r.ruleKind === CONSTRAINT_RULE_KIND.EXERCISE_ALLOW
        ? `${ruleLabel(r)} (kept in)` : ruleLabel(r)))
      .join(', ');
    if (ep.status === EPISODE_STATUS.AWAITING_CONFIRMATION) {
      return `${names}. You thought this would be done by about now. Still need it?`;
    }
    return names;
  };

  return (
    <SettingsPage title="How you train">
      {state.unavailable ? (
        <Text style={[styles.hint, { color: t.colors.textSecondary, margin: spacing.lg }]}
          accessibilityLiveRegion="polite">
          Volyume could not read this right now. Nothing has changed; pull back in a moment.
        </Text>
      ) : null}

      {/* CC33 close-out: the screen says what it is before it asks for
          anything. Banked research: plain-language statements rather
          than diagnosis or a body map (pattern 4), permission-first tone
          (17), low cognitive load (19), and no self-classification at the
          door - the recognisable words appear, the question "are you
          disabled?" never does. */}
      <View style={styles.introWrap}>
        <Text style={[styles.body, { color: t.colors.textPrimary }]}>
          If you have an injury, pain, a long-term condition or a disability, tell
          Volyume about it here. It will build your plans and your workouts around it.
        </Text>
        <Text style={[styles.hint, { color: t.colors.textSecondary, marginTop: spacing.sm }]}>
          You do not need a diagnosis, or even a name for it. Just say what you cannot
          do. Volyume leaves those movements out and trains the same muscles another way.
        </Text>
      </View>

      {renderLineReview()}

      {/* D112 R4 (closes audit T2-23's recoverability half): the standing
          revisit row. Visible whenever there is something to revisit
          (canRevisit, computed in refresh() above from an active plan
          plus either an undecided episode rule or an un-rewritten
          baseline conflict) - undecided episodes no longer serve
          conflicted rows in silence forever with no way back. */}
      {canRevisit ? (
        <SettingRow
          icon="list-outline"
          label="Your plan and how you train"
          sub="Review what Volyume works around in your current plan."
          accessibilityLabel="Your plan and how you train. Review what Volyume works around in your current plan."
          onPress={revisitCapabilityPlan}
        />
      ) : null}

      {/* Gap-closure Phase D (order section 25): the optional named-
          condition and injury directory. Discovery only - selecting a
          profile stores nothing (GC-D1); its questions land back here. */}
      <SettingRow
        icon="search-outline"
        label="Looking for a specific condition or injury?"
        sub="Optional. Finding it selects better questions; you never need a name to get the same support."
        accessibilityLabel="Looking for a specific condition or injury? Optional. Finding it selects better questions; you never need a name to get the same support."
        onPress={() => { haptics.selection(); navigation.navigate('TrainingConsiderations'); }}
      />

      <SectionHeader title="Your setup" />
      {state.baseline.length === 0 && !adding ? (
        <Text style={[styles.hint, { color: t.colors.textSecondary, marginHorizontal: spacing.lg }]}>
          Nothing here yet. If there is anything Volyume should build your training around, add it -
          it stays part of your normal training, with full progression and coaching.
        </Text>
      ) : null}
      {state.baseline.map(row => (
        <SettingRow key={row.id} icon={row.ruleKind === CONSTRAINT_RULE_KIND.EXERCISE_ALLOW ? 'checkmark-circle-outline' : 'body'}
          label={ruleLabel(row)}
          // F6: an allowance row means the OPPOSITE of a restriction row
          // and must never render identically - the sub carries which
          // way it cuts, and endBaselineRow's confirm matches.
          sub={row.ruleKind === CONSTRAINT_RULE_KIND.EXERCISE_ALLOW
            ? 'Kept in at your word, even where a rule would leave it out'
            : (row.source === CONSTRAINT_SOURCE.CLINICIAN_REPORTED ? 'You told Volyume a clinician asked for this' : 'Part of your normal training')}
          showArrow={false}
          rightElement={(
            <PressableCard onPress={() => endBaselineRow(row)} accessibilityRole="button"
              accessibilityLabel={row.ruleKind === CONSTRAINT_RULE_KIND.EXERCISE_ALLOW
                ? `Stop keeping ${ruleLabel(row)} in`
                : `Remove ${ruleLabel(row)} from your setup`}>
              <Text style={{ ...type.label, color: t.colors.textSecondary, padding: spacing.sm }}>Remove</Text>
            </PressableCard>
          )} />
      ))}

      <SectionHeader title="Temporary, right now" />
      {state.episodes.length === 0 && !adding ? (
        <Text style={[styles.hint, { color: t.colors.textSecondary, marginHorizontal: spacing.lg }]}>
          No temporary changes at the moment.
        </Text>
      ) : null}
      {state.episodes.map(ep => {
        const subject = groupSubject(ep.rows.filter(r => r.state === 'active'));
        // D112 R8 (section 25; closes audit T2-26): the per-episode
        // "just hold my plan" valve. Held: the app proposes nothing and
        // adapts nothing for this episode - no serve-time substitution,
        // no coach holds, no excusal - while pickers and generation keep
        // honouring the rules. The card says so plainly.
        const held = ep.rows.some(r => r.state === 'active' && r.adaptationMode === 'hold');
        return (
          <View key={ep.groupId}>
            <SettingRow icon="time" label="Temporary change"
              sub={held ? `${episodeSub(ep)} · Holding your plan as-is; adaptation is paused, not your training` : episodeSub(ep)}
              showArrow={false} />
            <View style={styles.episodeActions}>
              <Choice label="Done with it" onPress={() => confirmEndEpisode(ep)} t={t} compact />
              <Choice label="A while longer" onPress={async () => { haptics.selection(); await extendEpisode(userId, ep.groupId, Date.now() + 14 * DAY_MS); toast.show(subject ? `Extended by two weeks. Volyume will check in about ${subject} around then.` : 'Extended by two weeks. Volyume will ask again around then.'); refresh(); }} t={t} compact />
              {ep.status === EPISODE_STATUS.AWAITING_CONFIRMATION ? (
                // Section 33.7's third option: an explicit continue that resets
                // the ask cadence without committing to a new end date.
                <Choice label="Still going for now" onPress={async () => { haptics.selection(); await acknowledgeEpisode(userId, ep.groupId); toast.show(subject ? `Noted. Volyume will keep ${subject} out until you end it here.` : 'Noted. Volyume will keep working around this until you end it here.'); refresh(); }} t={t} compact />
              ) : null}
              {held ? (
                <Choice label="Start working around it again" onPress={async () => { haptics.selection(); await setEpisodeAdaptationMode(userId, ep.groupId, 'propose'); toast.show('Volyume will work around this again from your next session.'); refresh(); }} t={t} compact />
              ) : (
                <Choice label="Hold my plan as-is" onPress={async () => { haptics.selection(); await setEpisodeAdaptationMode(userId, ep.groupId, 'hold'); toast.show('Volyume is holding your plan as-is for this. Adaptation is paused, not your training.'); refresh(); }} t={t} compact />
              )}
              <Choice label="This is how I train now" onPress={() => confirmPromote(ep)} t={t} compact />
            </View>
          </View>
        );
      })}

      {adding ? renderAddFlow() : (
        <View style={styles.addWrap}>
          <Choice label="Add something" onPress={beginAdd} t={t} primary />
        </View>
      )}

      {/* CC33 close-out: the cross-lane rows sat ABOVE the user's own
          setup and above "Add something", so a first-time arrival met
          four navigation rows before the thing they came to do. They are
          secondary routes, so they sit after the primary action now. */}
      <SectionHeader title="More ways in" />
      {/* CC28 (section 33.12): energy-limited training's honest v1 home.
          No energy axis, no pacing computation - the card maps to the two
          EXISTING deterministic levers (session length, now free-editable
          in Workout settings; the episode machinery for bad spells) and
          says so plainly. T2-27 (closes audit): the row used to imply the
          session-length lever takes effect straight away: it only shapes
          the NEXT plan build (planEngine consumes it at generation only -
          confirmed against S2-T2-LIVE-TRACE.md's T2-27 evidence), so the
          copy says that plainly instead of over-claiming. */}
      <SettingRow
        icon="battery-half-outline"
        label="My energy varies, or I keep sessions short"
        sub="Two levers help here: set a session length under Workout and units, which shapes your next plan build, and add a temporary change here for a rough patch."
        accessibilityLabel="My energy varies, or I keep sessions short. Two levers help here: set a session length under Workout and units, which shapes your next plan build, and add a temporary change here for a rough patch. Opens Workout and units."
        onPress={() => { haptics.selection(); navigation.navigate('SettingsWorkout'); }}
      />

      {/* CC33 D112 (closes audit T1-20, this side): the lanes name each
          other in both directions. AvoidedMovementsScreen points here for
          things the body needs training built around; this points there
          for plain preference, so neither lane quietly absorbs the
          other's entries. Registered alongside HowYouTrain in every
          stack that carries it (RootNavigator), so the tap never
          silently drops. */}
      <SettingRow
        icon="remove-circle-outline"
        label="Movements you would rather not do"
        sub="Preferences live under Avoided movements, so they never mix with what your body needs."
        accessibilityLabel="Movements you would rather not do. Preferences live under Avoided movements, so they never mix with what your body needs. Opens Avoided movements."
        onPress={() => { haptics.selection(); navigation.navigate('AvoidedMovements'); }}
      />


      {state.history.length > 0 ? (
        <>
          <SectionHeader title="Past" />
          {state.history.slice(0, 12).map(row => {
            // A PROMOTED episode's rules live on as baseline now (section
            // 24) - restarting it would duplicate the user's own setup as
            // an episode, so only genuinely ended ones offer the section
            // 21 flare re-start.
            const isEndedEpisode = row.role === CONSTRAINT_ROLE.EPISODE
              && row.endedReason !== 'promoted';
            return (
              <View key={row.id}>
                {/* R2-9: an ended KEEP reads as what it was, never as an
                    ended restriction for the same exercise. */}
                <SettingRow icon="checkmark"
                  label={row.ruleKind === CONSTRAINT_RULE_KIND.EXERCISE_ALLOW
                    ? `${ruleLabel(row)} (kept in)` : ruleLabel(row)}
                  sub={row.endedReason === 'promoted' ? 'Became part of your setup' : 'Ended'} showArrow={false} />
                {isEndedEpisode ? (
                  <View style={styles.episodeActions}>
                    <Choice label="Start this again" onPress={() => confirmRestartEpisode(row)} t={t} compact />
                  </View>
                ) : null}
              </View>
            );
          })}
        </>
      ) : null}

      {consented ? (
        <>
          <SectionHeader title="Your data" />
          <SettingRow icon="download" label="Export this information"
            sub="A readable file of everything you have added here"
            onPress={exportCapabilityData} showArrow={false} />
          <SettingRow icon="trash" label="Delete this information" destructive
            sub="Removes everything here on all devices and turns the feature off"
            onPress={confirmWithdraw} showArrow={false} />
        </>
      ) : null}
    </SettingsPage>
  );
}

function Choice({ label, sub, onPress, t, selected, primary, disabled, compact }) {
  return (
    <PressableCard
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      // R2-13: the pressable container swallows child Text from the
      // spoken output, so the sub - where an option's meaning often
      // lives ("Part of your normal setup...") - must ride the label.
      accessibilityLabel={sub ? `${label}. ${sub}` : label}
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      style={[
        styles.choice,
        compact && styles.choiceCompact,
        // CC33 adversarial review F7 (J3): selection is never colour
        // alone - the border doubles in weight and the label carries a
        // visible tick (the set-type picker's own convention), so the
        // state survives greyscale and colour-vision deficiency.
        { borderColor: selected ? t.colors.primary : t.colors.border, backgroundColor: primary ? t.colors.primaryBg : 'transparent' },
        selected && styles.choiceSelected,
        disabled && { opacity: 0.4 },
      ]}
    >
      <View style={styles.choiceLabelRow}>
        {selected ? (
          <Text style={[styles.choiceTick, { color: t.colors.primary }]} importantForAccessibility="no">✓</Text>
        ) : null}
        {/* R2-12: the label wraps inside the row (the codebase's flex:1 +
            minWidth:0 idiom, SettingsPrimitives' own note) - a long
            label at large accessibility type must never push past the
            card because the tick joined the row. */}
        <Text style={[styles.choiceLabel, styles.choiceLabelInRow, { color: t.colors.textPrimary }]}>{label}</Text>
      </View>
      {sub ? <Text style={[styles.hint, { color: t.colors.textSecondary }]}>{sub}</Text> : null}
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  search: {
    ...type.body,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  card: { borderRadius: radius.lg, padding: spacing.lg, margin: spacing.lg },
  q: { ...type.h3, marginBottom: spacing.sm },
  body: { ...type.body, marginBottom: spacing.md },
  hint: { ...type.caption, marginBottom: spacing.sm },
  choice: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    // WCAG 2.2 minimum touch target (ARCHITECTURE section 27); xxxl is the
    // scale's 48.
    minHeight: spacing.xxxl,
    justifyContent: 'center',
  },
  choiceCompact: { flexGrow: 1, marginRight: spacing.sm },
  // F7 (J3): the non-colour halves of the selected state.
  choiceSelected: { borderWidth: 2 },
  choiceLabelRow: { flexDirection: 'row', alignItems: 'center' },
  choiceTick: { ...type.label, marginRight: spacing.xs },
  // R2-12: the safe wrapping idiom inside a row.
  choiceLabelInRow: { flex: 1, minWidth: 0 },
  choiceLabel: { ...type.label },
  episodeActions: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  introWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  addWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  // D112 R4 (closes audit T2-23): one row of the "Choose per exercise"
  // review - the line's own from/to text, then its Apply/Keep toggle.
  reviewLine: { marginBottom: spacing.sm },
});
