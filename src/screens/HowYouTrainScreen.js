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
import { View, Text, StyleSheet, AccessibilityInfo } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useShallow } from 'zustand/react/shallow';
import useAppStore from '../store/useAppStore';
import useTheme from '../hooks/useTheme';
import { type, spacing, radius } from '../styles/theme';
import { useToast } from '../components/Toast';
import { appAlert } from '../components/AppAlert';
import PressableCard from '../components/PressableCard';
import Card from '../components/Card';
import Button from '../components/Button';
import BottomSheet from '../components/BottomSheet';
import * as haptics from '../lib/haptics';
import { logError } from '../lib/errorLog';
import {
  SettingsPage, SettingRow, SectionHeader, settingsStyles, useSettingsStyles,
} from '../components/SettingsPrimitives';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  loadCapabilityState, createConstraints, endConstraint, endEpisode,
  extendEpisode, promoteEpisode, acknowledgeEpisode, setEpisodeAdaptationMode, hasCapabilityConsent,
  buildCapabilityExport,
} from '../lib/capability/store';
import {
  withdrawCapabilityConsent,
} from '../lib/consent/capabilityConsent';
// CC-D27 (CC27): family and exercise rules join the add flow, consuming
// the same taxonomy the resolver reads. movementFamily is the shared
// vocabulary module (no user data); the exercise list is the ordinary
// library read.
import { familyLabel } from '../lib/exercise/movementFamily';
import { shortDate } from '../lib/capability/addFlow';
import {
  demandLabel, CONSTRAINT_ROLE, CONSTRAINT_SOURCE,
  CONSTRAINT_RULE_KIND, CONSTRAINT_STATE, EPISODE_STATUS,
} from '../lib/capability/model';
import {
  subjectPhrase, sidedRuleLabel,
} from '../lib/capability/phrase';
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
// Past entries split into contiguous runs by whether the entry carries its
// own "Start this again" action. An entry with an action must be its own
// card - SettingRow's divider falls between the row and its button, so in a
// shared card the button reads as belonging to the row BELOW it. Plain ended
// rules have no action and group into one card like every other list.
// Chronological order is preserved: runs are formed in place, never sorted.
function groupHistory(rows) {
  const runs = [];
  rows.forEach((row) => {
    // A PROMOTED episode's rules live on as baseline now (section 24) -
    // restarting it would duplicate the user's own setup as an episode, so
    // only genuinely ended ones offer the section 21 flare re-start.
    const restartable = row.role === CONSTRAINT_ROLE.EPISODE && row.endedReason !== 'promoted';
    const last = runs[runs.length - 1];
    if (last && !last.restartable && !restartable) last.rows.push(row);
    else runs.push({ restartable, rows: [row] });
  });
  return runs;
}

// D133 helpers: dates and durations in the person's words.
function durationText(ms) {
  const days = Math.max(1, Math.round(ms / DAY_MS));
  if (days < 14) return `${days} day${days === 1 ? '' : 's'}`;
  if (days < 60) { const w = Math.round(days / 7); return `${w} week${w === 1 ? '' : 's'}`; }
  const m = Math.round(days / 30); return `${m} month${m === 1 ? '' : 's'}`;
}

// D133 (HYT-08): the plan status in the indicative. Null status means the
// read has not landed yet; an unchecked one is told, never rendered as
// "matches" (A15).
function planStatusSentence(st) {
  if (!st) return 'Checking your current plan.';
  if (!st.checked) return 'Volyume could not read your plan just now.';
  const bits = [];
  if (st.substituted) bits.push(`${st.substituted} exercise${st.substituted === 1 ? '' : 's'} swapped`);
  if (st.omitted) bits.push(`${st.omitted} left out`);
  const parts = [];
  if (bits.length) parts.push(`Right now: ${bits.join(', ')} while you work around a temporary change.`);
  if (st.rewriteCount) parts.push(`${st.rewriteCount} exercise${st.rewriteCount === 1 ? '' : 's'} in your plan sit${st.rewriteCount === 1 ? 's' : ''} outside how you train.`);
  return parts.length ? parts.join(' ') : 'Your current plan matches how you train.';
}

export default function HowYouTrainScreen() {
  const t = useTheme();
  const live = useSettingsStyles();
  const navigation = useNavigation();
  const toast = useToast();
  const { user } = useAppStore(useShallow(s => ({ user: s.user })));
  const userId = user?.id;

  const [state, setState] = useState({ baseline: [], episodes: [], history: [], unavailable: false });
  const [consented, setConsented] = useState(false);
  // Exercise-rule rows label by name; the library read is best-effort.
  const [library, setLibrary] = useState([]);
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
  // in its finally, so two taps in the same tick cannot open two
  // proposals. It never gates an explicit user action.
  const proposalPendingRef = useRef(false);
  // D133: undecided episode rule ids, shown as a "Waiting for you" card
  // rather than proposed by a focus-fired modal (HYT-14).
  const [pendingIds, setPendingIds] = useState([]);
  // D133 (HYT-08): what the current plan is doing for these rules, read
  // after every refresh and said in the indicative above the review row.
  const [planStatus, setPlanStatus] = useState(null);
  // D133 (HYT-03): the wizard returns with the id of what it made; the
  // card scrolls into view and flashes once, so the flow ends on the
  // thing it created.
  const [flashId, setFlashId] = useState(null);
  // D133 slice C (HYT-09): the episode whose options sheet is open.
  const [optionsFor, setOptionsFor] = useState(null);
  const scrollRef = useRef(null);
  const cardYRef = useRef(new Map());
  const pendingHighlightRef = useRef(null);

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
      // flow was the only place one fired. Detected here, on the screen's
      // own refresh/focus, exactly the same undecided-and-not-held episode
      // rule ids the standing revisit row below computes. D133 (flow
      // audit 2026-09-03, HYT-14): no longer PROPOSED from here - a modal
      // firing by itself on arrival is the ambush ARCHITECTURE section 22
      // forbids. SHOWN instead, as a "Waiting for you" card that stays
      // until answered; its tap runs proposeEffectiveDiff - the
      // SAME recoverability the revisit row offers on demand (T2-23).
      const undecidedIds = undecidedEpisodeRuleIds(st.episodes);
      setPendingIds(undecidedIds);
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
    // (see proposalPendingRef's comment above).
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

  // Flow audit 2026-09-03 (D133): the add flow is its own screen
  // (HowYouTrainAddScreen) with a title, a step count, Back and Cancel.
  // Training considerations (GC-D1) and Active workout (T2-11) hand a
  // SUGGESTED draft here as route.params.preselect; this consumes the
  // param exactly once and forwards it. The wizard still asks
  // permanent-or-temporary, dates, consent and readback itself.
  const route = useRoute();
  const preselect = route.params?.preselect;
  useEffect(() => {
    if (!preselect) return;
    navigation.setParams({ preselect: undefined });
    navigation.navigate('HowYouTrainAdd', { preselect });
  }, [preselect, navigation]);
  // The wizard returns with the id of what it made (`highlight`). The card
  // may not exist until the next refresh lands, so the id is parked and the
  // card's own onLayout does the scroll and flash when it appears.
  const highlight = route.params?.highlight;
  useEffect(() => {
    if (highlight == null) return;
    pendingHighlightRef.current = highlight;
    navigation.setParams({ highlight: undefined });
  }, [highlight, navigation]);

  // D133 (HYT-08): the plan status sentence. One read per refresh, outside
  // refresh() itself so that callback stays small and synchronous.
  useEffect(() => {
    if (!userId || !canRevisit) { setPlanStatus(null); return undefined; }
    let cancelled = false;
    (async () => {
      try {
        // eslint-disable-next-line global-require
        const { computePlanEffectiveLines, computeCapabilityPlanRewrite } = require('../lib/sessionEffective');
        let substituted = 0; let omitted = 0; let groups = 0; let checked = true;
        for (const ep of state.episodes ?? []) {
          const appliedIds = appliedEpisodeRuleIds([ep]);
          if (!appliedIds.length) continue;
          // eslint-disable-next-line no-await-in-loop
          const r = await computePlanEffectiveLines(userId, appliedIds, { serveGate: true }).catch(() => ({ lines: [], checked: false }));
          if (!r.checked) { checked = false; continue; }
          const sub = r.lines.filter((l) => l.to).length;
          substituted += sub; omitted += r.lines.length - sub; if (r.lines.length) groups += 1;
        }
        const rw = await computeCapabilityPlanRewrite(userId, {}).catch(() => ({ lines: [], checked: false }));
        if (!rw.checked) checked = false;
        if (!cancelled) setPlanStatus({ substituted, omitted, groups, rewriteCount: rw.lines?.length ?? 0, checked });
      } catch (_e) { if (!cancelled) setPlanStatus(null); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, userId, canRevisit]);

  // CC-D27: the ONE write door for capability rows - every path (the add
  // flow AND the section 21 flare re-start) lands through this single
  // batched call, so the consent gate and the transaction law cannot be
  // bypassed by a new surface.
  const writeConstraintRows = async (rows, nowMs) => createConstraints(userId, rows, { nowMs });

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
        // HYT-01: the cancel slot RECORDS a decline, and AppAlert runs it
        // on backdrop/Back - so this one alert answers only by a named button.
        { cancelable: false },
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

  // "Still going": the section 33.7 third option - resets the ask cadence
  // without committing to a new end date. Nothing ends.
  const stillGoing = async (ep, subject) => {
    haptics.selection();
    await acknowledgeEpisode(userId, ep.groupId);
    toast.show(subject ? `Noted. Volyume will keep ${subject} out until you end it here.` : 'Noted. Volyume will keep working around this until you end it here.');
    refresh();
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

  // D112 R4 (closes audit T2-23, §14 step 2): the "Choose per exercise"
  // review, staged inline like the add flow above (same card pattern,
  // no Modal - the R4 Modal-focus mitigation applies here too).
  const renderLineReview = () => {
    if (!lineReview) return null;
    return (
      <Card>
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
            <View style={styles.reviewActions}>
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
      </Card>
    );
  };

  // D133 (HYT-05): the card's title is what it is about; the sub says since
  // when and until when; the chip says what state it is in.
  const episodeNames = (ep) => ep.rows.filter(r => r.state === 'active')
    .map(r => (r.ruleKind === CONSTRAINT_RULE_KIND.EXERCISE_ALLOW ? `${ruleLabel(r)} (kept in)` : ruleLabel(r)))
    .join(', ');
  const episodeSub = (ep) => {
    const live0 = ep.rows.filter(r => r.state === 'active');
    const started = Math.min(...live0.map(r => r.startsAt ?? Infinity));
    const ends = live0.map(r => r.endsAt).filter(Number.isFinite);
    const until = ends.length ? Math.max(...ends) : null;
    const since = Number.isFinite(started) ? `Since ${shortDate(started)}` : null;
    const untilText = until != null ? `you said until about ${shortDate(until)}` : 'until you end it';
    const line = [since, untilText].filter(Boolean).join(' · ');
    if (ep.status === EPISODE_STATUS.AWAITING_CONFIRMATION) {
      return `${line}. You thought this would be done by about now. Still need it?`;
    }
    return line;
  };
  const episodeStateChip = (ep, held) => {
    if (ep.status === EPISODE_STATUS.AWAITING_CONFIRMATION) return { label: 'Checking with you', attention: true };
    if (held) return { label: 'On hold', attention: false };
    const rules = ep.rows.filter(r => r.state === 'active' && r.ruleKind !== CONSTRAINT_RULE_KIND.EXERCISE_ALLOW);
    if (rules.some(r => r.effectiveChoice == null)) return { label: 'Waiting for your decision', attention: true };
    if (rules.length && rules.every(r => r.effectiveChoice === 'declined')) return { label: 'Not applied to your current plan', attention: false };
    return { label: 'Working around it', attention: false };
  };
  const sinceText = (row) => (Number.isFinite(row.startsAt) ? `Since ${shortDate(row.startsAt)} · ` : '');
  const pastSub = (row) => {
    const what = row.endedReason === 'promoted' ? 'Became part of your setup' : 'Ended';
    const when = Number.isFinite(row.endedAt) ? ` ${shortDate(row.endedAt)}` : '';
    const lasted = Number.isFinite(row.endedAt) && Number.isFinite(row.startsAt) ? durationText(row.endedAt - row.startsAt) : null;
    return `${what}${when}${lasted ? ` · lasted ${lasted}` : ''}`;
  };

  const pendingSubject = pendingIds.length
    ? groupSubject(state.episodes.flatMap((ep) => ep.rows).filter((r) => pendingIds.includes(r.id)))
    : null;
  const awaiting = state.episodes.filter((ep) => ep.status === EPISODE_STATUS.AWAITING_CONFIRMATION);
  const optionsEp = optionsFor && !String(optionsFor).startsWith('row:') ? state.episodes.find((ep) => ep.groupId === optionsFor) ?? null : null;
  const optionsRow = optionsFor && String(optionsFor).startsWith('row:') ? state.baseline.find((r) => `row:${r.id}` === optionsFor) ?? null : null;
  const nothingYet = !state.baseline.length && !state.episodes.length && !state.history.length;
  const flashStyle = (id) => (flashId != null && flashId === id ? { borderColor: t.colors.primary } : null);
  const onCardLayout = (id) => (e) => {
    cardYRef.current.set(id, e.nativeEvent.layout.y);
    if (pendingHighlightRef.current === id) {
      pendingHighlightRef.current = null;
      scrollRef.current?.scrollTo?.({ y: Math.max(0, e.nativeEvent.layout.y - spacing.lg), animated: true });
      setFlashId(id);
      setTimeout(() => setFlashId(null), 2500);
    }
  };

  return (
    <SettingsPage title="How you train" scrollRef={scrollRef}>
      {state.unavailable ? (
        <Text style={[styles.hint, { color: t.colors.textSecondary, margin: spacing.lg }]}
          accessibilityLiveRegion="polite">
          Volyume could not read this right now. Nothing has changed; pull back in a moment.
        </Text>
      ) : null}

      {/* D133 (flow audit 2026-09-03): the screen says what it is in two
          sentences and then offers the ONE thing to do. The primary action
          sits here, first, on every visit - never fifth behind two empty
          cards. Banked research still holds: plain words, permission-first,
          no self-classification at the door. */}
      <View style={styles.introWrap}>
        <Text style={[styles.body, { color: t.colors.textPrimary }]}>
          If you have an injury, pain, a long-term condition or a disability, tell
          Volyume about it here. It will build your plans and your workouts around it.
        </Text>
        <Text style={[styles.hint, { color: t.colors.textSecondary, marginTop: spacing.sm }]}>
          You do not need a diagnosis, or even a name for it. Just say what you cannot
          do. Volyume leaves those movements out and trains the same muscle groups another way.
        </Text>
      </View>
      <View style={styles.addWrap}>
        <Button
          title="Add something"
          onPress={() => { haptics.selection(); navigation.navigate('HowYouTrainAdd'); }}
          accessibilityLabel="Add something Volyume should build your training around"
        />
        {nothingYet ? (
          <Text style={[styles.hint, { color: t.colors.textMuted, marginTop: spacing.sm }]}>
            Takes about a minute. Whatever you add is either part of how you train from now on, or worked around for a while, and you can change or remove it here any time.
          </Text>
        ) : null}
      </View>

      {renderLineReview()}

      {/* D133 (HYT-14): decisions that used to fire as a modal the moment
          this screen came into focus now sit here until answered. */}
      {(pendingIds.length || awaiting.length) ? (
        <>
          <SectionHeader title="Waiting for you" />
          <View style={[settingsStyles.section, live.section]}>
            {pendingIds.length ? (
              <SettingRow
                icon="help-circle-outline"
                label="Apply a change to your current plan?"
                sub={pendingSubject
                  ? `Volyume can work around ${pendingSubject} in your current plan. Tap to see what would change and decide.`
                  : 'Volyume can work around a temporary change in your current plan. Tap to see what would change and decide.'}
                onPress={() => { haptics.selection(); proposeEffectiveDiff(pendingIds, pendingSubject).catch(() => {}); }}
              />
            ) : null}
            {awaiting.map((ep) => (
              <SettingRow
                key={`await-${ep.groupId}`}
                icon="time-outline"
                label="Still need this?"
                sub={`${episodeNames(ep)}. You thought this would be done by about now. Tap to answer.`}
                onPress={() => {
                  haptics.selection();
                  const y = cardYRef.current.get(ep.groupId);
                  if (y != null) scrollRef.current?.scrollTo?.({ y: Math.max(0, y - spacing.lg), animated: true });
                  setFlashId(ep.groupId);
                  setTimeout(() => setFlashId(null), 2500);
                }}
              />
            ))}
          </View>
        </>
      ) : null}

      {/* D133 (HYT-08): what Volyume is doing to the current plan, said in
          the indicative before any question is asked. The review row
          beneath it is the D112 R4 standing revisit surface, unchanged. */}
      {canRevisit ? (
        <>
          <SectionHeader title="Your plan" />
          <View style={[settingsStyles.section, live.section]}>
            <View style={styles.statusBlock}>
              <Text style={[styles.statusText, { color: t.colors.textPrimary }]}>{planStatusSentence(planStatus)}</Text>
            </View>
          <SettingRow
            icon="list-outline"
            label="Your plan and how you train"
            sub="Review what Volyume works around in your current plan."
            accessibilityLabel="Your plan and how you train. Review what Volyume works around in your current plan."
            onPress={revisitCapabilityPlan}
          />
          </View>
        </>
      ) : null}

      {state.baseline.length > 0 ? (
        <>
          <SectionHeader title="Your setup" />
          <View style={[settingsStyles.section, live.section, flashStyle('baseline')]} onLayout={onCardLayout('baseline')}>
            {state.baseline.map(row => (
              <SettingRow key={row.id} icon={row.ruleKind === CONSTRAINT_RULE_KIND.EXERCISE_ALLOW ? 'checkmark-circle-outline' : 'body'}
                label={ruleLabel(row)}
                // F6: an allowance row means the OPPOSITE of a restriction row
                // and must never render identically - the sub carries which
                // way it cuts, and endBaselineRow's confirm matches.
                sub={`${sinceText(row)}${row.ruleKind === CONSTRAINT_RULE_KIND.EXERCISE_ALLOW
                  ? 'Kept in at your word, even where a rule would leave it out'
                  : (row.source === CONSTRAINT_SOURCE.CLINICIAN_REPORTED ? 'You told Volyume a clinician asked for this' : 'Part of your normal training')}`}
                accessibilityHint="Opens options to change or remove this"
                onPress={() => { haptics.selection(); setOptionsFor(`row:${row.id}`); }} />
            ))}
          </View>
        </>
      ) : null}

      {state.episodes.length > 0 ? <SectionHeader title="Temporary, right now" /> : null}
      {state.episodes.map(ep => {
        const subject = groupSubject(ep.rows.filter(r => r.state === 'active'));
        // D112 R8 (section 25; closes audit T2-26): the per-episode
        // "just hold my plan" valve. Held: the app proposes nothing and
        // adapts nothing for this episode - no serve-time substitution,
        // no coach holds, no excusal - while pickers and generation keep
        // honouring the rules. The card says so plainly.
        const held = ep.rows.some(r => r.state === 'active' && r.adaptationMode === 'hold');
        const chip = episodeStateChip(ep, held);
        return (
          <View key={ep.groupId} style={[settingsStyles.section, live.section, flashStyle(ep.groupId)]} onLayout={onCardLayout(ep.groupId)}>
            {/* D133 (HYT-05): the card is titled by what it is about, and
                says since when, until when, and what state it is in. */}
            <SettingRow icon="time" label={episodeNames(ep)}
              sub={episodeSub(ep)}
              showArrow={false} />
            <View style={styles.chipRow}>
              <Text style={[styles.statusPill, { backgroundColor: chip.attention ? t.colors.primaryBg : t.colors.surface2, color: chip.attention ? t.colors.primary : t.colors.textSecondary }]}>
                {chip.label}
              </Text>
              {ep.rows.some(r => r.state === 'active' && r.source === CONSTRAINT_SOURCE.CLINICIAN_REPORTED) ? (
                <Text style={[styles.statusPill, { backgroundColor: t.colors.surface2, color: t.colors.textSecondary }]}>A clinician asked for this</Text>
              ) : null}
            </View>
            {/* D112 R8: the hold explained in the lane's own plain words,
                under its chip rather than fused into the caption. */}
            {held ? (
              <Text style={[styles.hint, { color: t.colors.textSecondary, paddingHorizontal: spacing.lg }]}>
                Holding your plan as-is; adaptation is paused, not your training.
              </Text>
            ) : null}
            {/* D133 slice C (HYT-09): the card asks ONE question, as a heading,
                with two answers - not five co-equal pills answering three
                different questions. Everything else lives behind Options,
                where each row says what it does before it is tapped. */}
            {ep.status === EPISODE_STATUS.AWAITING_CONFIRMATION ? (
              <View style={styles.askBlock}>
                <Text style={[styles.askHeading, { color: t.colors.textPrimary }]}>Still need this?</Text>
                <Text style={[styles.hint, { color: t.colors.textSecondary }]}>
                  Nothing ends until you say so. Volyume keeps working around it either way.
                </Text>
                <View style={styles.askButtons}>
                  <Button title="Still going" onPress={() => stillGoing(ep, subject)} fullWidth={false} style={styles.askButton} />
                  <Button title="Done with it" variant="secondary" onPress={() => confirmEndEpisode(ep)} fullWidth={false} style={styles.askButton} />
                </View>
              </View>
            ) : null}
            <View style={[styles.optionsRowWrap, { borderTopColor: t.colors.borderSubtle }]}>
              <SettingRow
                icon="ellipsis-horizontal-circle-outline"
                label={ep.status === EPISODE_STATUS.AWAITING_CONFIRMATION ? 'More options' : 'Options'}
                sub="End it, extend it, hold your plan as it is, or make it part of how you train."
                onPress={() => { haptics.selection(); setOptionsFor(ep.groupId); }}
              />
            </View>
          </View>
        );
      })}

      <SectionHeader title="Related" />
      <View style={[settingsStyles.section, live.section]}>
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
      </View>

      {state.history.length > 0 ? (
        <>
          <SectionHeader title="Past" />
          {groupHistory(state.history.slice(0, 12)).map((run, ri) => (
            <View key={`past${ri}`} style={[settingsStyles.section, live.section]}>
              {run.rows.map(row => (
                <View key={row.id}>
                  {/* R2-9: an ended KEEP reads as what it was, never as an
                      ended restriction for the same exercise. */}
                  <SettingRow icon="checkmark"
                    label={row.ruleKind === CONSTRAINT_RULE_KIND.EXERCISE_ALLOW
                      ? `${ruleLabel(row)} (kept in)` : ruleLabel(row)}
                    sub={pastSub(row)} showArrow={false} />
                  {run.restartable ? (
                    <View style={styles.episodeActions}>
                      <Choice label="Start this again" onPress={() => confirmRestartEpisode(row)} t={t} compact />
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          ))}
        </>
      ) : null}

      {consented ? (
        <>
          <SectionHeader title="Your data" />
          <View style={[settingsStyles.section, live.section]}>
            <SettingRow icon="download" label="Export this information"
              sub="A readable file of everything you have added here"
              onPress={exportCapabilityData} showArrow={false} />
            <SettingRow icon="trash" label="Delete this information" destructive
              sub="Removes everything here on all devices and turns the feature off"
              onPress={confirmWithdraw} showArrow={false} />
          </View>
        </>
      ) : null}

      {/* D133 slice C: every episode action, each with its consequence in
          plain words, one tap away. Rows close the sheet first so a confirm
          never presents over a dismissing sheet. */}
      <BottomSheet visible={!!optionsEp || !!optionsRow} onClose={() => setOptionsFor(null)} accessibilityLabel={optionsRow ? 'Options for this part of how you train' : 'Options for this temporary change'}>
        {optionsRow ? (() => {
          const row = optionsRow;
          const after = (fn) => { setOptionsFor(null); setTimeout(fn, 260); };
          return (
            <View style={styles.sheetBody}>
              <Text style={[styles.sheetTitle, { color: t.colors.textPrimary }]}>{ruleLabel(row)}</Text>
              <Text style={[styles.hint, { color: t.colors.textSecondary }]}>Each option says what it does. Nothing here happens by itself.</Text>
              <View style={[settingsStyles.section, live.section]}>
                <SettingRow icon="create-outline" label="Change what this covers"
                  sub="Opens it with every line filled in. Saving replaces it; your history is not rewritten."
                  onPress={() => after(() => navigation.navigate('HowYouTrainAdd', { edit: { rows: [row], groupId: null } }))} />
                <SettingRow icon="trash-outline" label={row.ruleKind === CONSTRAINT_RULE_KIND.EXERCISE_ALLOW ? 'Stop keeping it in' : 'Remove'} destructive
                  sub={row.ruleKind === CONSTRAINT_RULE_KIND.EXERCISE_ALLOW
                    ? 'Rules that would leave it out apply again from now on.'
                    : 'Volyume plans and suggests it normally again from now on. Nothing in your history changes.'}
                  onPress={() => after(() => endBaselineRow(row))} />
              </View>
            </View>
          );
        })() : null}
        {optionsEp ? (() => {
          const ep = optionsEp;
          const subject = groupSubject(ep.rows.filter(r => r.state === 'active'));
          const held = ep.rows.some(r => r.state === 'active' && r.adaptationMode === 'hold');
          const awaitingNow = ep.status === EPISODE_STATUS.AWAITING_CONFIRMATION;
          const after = (fn) => { setOptionsFor(null); setTimeout(fn, 260); };
          return (
            <View style={styles.sheetBody}>
              <Text style={[styles.sheetTitle, { color: t.colors.textPrimary }]}>{episodeNames(ep)}</Text>
              <Text style={[styles.hint, { color: t.colors.textSecondary }]}>Each option says what it does. Nothing here happens by itself.</Text>
              <View style={[settingsStyles.section, live.section]}>
                <SettingRow icon="checkmark-circle-outline" label="Done with it"
                  sub="Everything comes back straight away, and training builds back up to your plan over the coming weeks."
                  onPress={() => after(() => confirmEndEpisode(ep))} />
                <SettingRow icon="time-outline" label="A while longer"
                  sub={`Adds two weeks. Volyume checks with you again around ${shortDate(Date.now() + 14 * DAY_MS)}.`}
                  onPress={() => after(async () => {
                    haptics.selection();
                    await extendEpisode(userId, ep.groupId, Date.now() + 14 * DAY_MS);
                    toast.show(subject ? `Extended by two weeks. Volyume will check in about ${subject} around then.` : 'Extended by two weeks. Volyume will ask again around then.');
                    refresh();
                  })} />
                {awaitingNow ? (
                  <SettingRow icon="play-outline" label="Still going for now"
                    sub="Keeps working around it until you end it here. Volyume stops asking for now."
                    onPress={() => after(() => stillGoing(ep, subject))} />
                ) : null}
                {held ? (
                  <SettingRow icon="refresh-outline" label="Start working around it again"
                    sub="Volyume works around this again from your next session."
                    onPress={() => after(async () => { haptics.selection(); await setEpisodeAdaptationMode(userId, ep.groupId, 'propose'); toast.show('Volyume will work around this again from your next session.'); refresh(); })} />
                ) : (
                  <SettingRow icon="pause-outline" label="Hold my plan as-is"
                    sub="Volyume changes nothing for this until you say so. Your plan runs exactly as it is."
                    onPress={() => after(async () => { haptics.selection(); await setEpisodeAdaptationMode(userId, ep.groupId, 'hold'); toast.show('Volyume is holding your plan as-is for this. Adaptation is paused, not your training.'); refresh(); })} />
                )}
                <SettingRow icon="body-outline" label="This is how I train now"
                  sub="Becomes part of your normal setup, with full progression and coaching."
                  onPress={() => after(() => confirmPromote(ep))} />
                <SettingRow icon="create-outline" label="Change what this covers"
                  sub="Opens it with every line filled in. Saving replaces it; your history is not rewritten."
                  onPress={() => after(() => navigation.navigate('HowYouTrainAdd', { edit: { rows: ep.rows.filter(r => r.state === 'active'), groupId: ep.groupId } }))} />
              </View>
            </View>
          );
        })() : null}
      </BottomSheet>
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
  // Both used to add ANOTHER spacing.lg on top of the page's own lg
  // padding, so the intro copy and the primary action stood 32dp in while
  // every card beside them stood 16dp in - a visible ragged left edge down
  // the whole screen. They sit on the page's inset now, xs to match the
  // Settings family's own copy blocks.
  introWrap: { paddingHorizontal: spacing.xs, paddingTop: spacing.sm, paddingBottom: spacing.md },
  addWrap: { paddingTop: spacing.sm, paddingBottom: spacing.sm },
  // D133: the plan status sentence and the per-card state pills.
  statusBlock: { padding: spacing.lg, paddingBottom: spacing.sm },
  statusText: { ...type.body },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, paddingHorizontal: spacing.lg, paddingBottom: spacing.xs },
  statusPill: { ...type.captionTight, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.sm, overflow: 'hidden' },
  // D133 slice C: the card's one question, two answers, and the options row.
  askBlock: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md, gap: spacing.xs },
  askHeading: { ...type.h3 },
  askButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  askButton: { flex: 1 },
  optionsRowWrap: { borderTopWidth: 1 },
  sheetBody: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm },
  sheetTitle: { ...type.h3 },
  // D112 R4 (closes audit T2-23): one row of the "Choose per exercise"
  // review - the line's own from/to text, then its Apply/Keep toggle.
  reviewLine: { marginBottom: spacing.sm },
  // The same strip as episodeActions, minus the horizontal inset: this one
  // sits inside a Card that already pads by lg, where episodeActions sits
  // inside a padding-less section whose rows pad themselves.
  reviewActions: { flexDirection: 'row', flexWrap: 'wrap' },
});
