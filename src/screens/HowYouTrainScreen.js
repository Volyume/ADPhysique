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
import { useState, useCallback, useEffect } from 'react';
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
  extendEpisode, promoteEpisode, acknowledgeEpisode, hasCapabilityConsent,
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
  CONSTRAINT_RULE_KIND, EPISODE_STATUS,
} from '../lib/capability/model';
import { subjectPhrase, draftSubjectPhrase } from '../lib/capability/phrase';
import {
  getAllExercises, uid } from '../lib/database';

const DAY_MS = 24 * 60 * 60 * 1000;

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
  // Add-flow stages (CC-D27 widened): null | 'role' | 'kind' | 'axes' |
  // 'family' | 'exercise' | 'dates' | 'consent' | 'readback'
  const [adding, setAdding] = useState(null);
  const [draft, setDraft] = useState(null);
  // CC-D27: the family list is OFFERED only for families that actually
  // exist on library exercises (section 33.3), so it is computed from the
  // library, never hardcoded. Exercise search shares the same load.
  const [library, setLibrary] = useState([]);
  const [exerciseQuery, setExerciseQuery] = useState('');

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
    }).catch(() => {});
    hasCapabilityConsent(userId).then(setConsented).catch(() => {});
    // Exercise-rule rows label by name; the library read is best-effort
    // (an id is still shown if it fails).
    getAllExercises().then(setLibrary).catch(() => {});
  }, [userId]);
  useFocusEffect(refresh);

  // CC-D27: one label for any rule row - demand axes by their labels,
  // families by the shared taxonomy's labels, exercises by name.
  const ruleLabel = (row) => {
    if (row.ruleKind === CONSTRAINT_RULE_KIND.FAMILY) return familyLabel(row.ruleValue) ?? row.ruleValue;
    if (row.ruleKind === CONSTRAINT_RULE_KIND.EXERCISE || row.ruleKind === CONSTRAINT_RULE_KIND.EXERCISE_ALLOW) {
      return library.find(e => e.id === row.ruleValue)?.name ?? 'An exercise';
    }
    return demandLabel(row.ruleValue);
  };

  // Natural coach-language order (2026-08-21): alerts and toasts name the
  // actual thing whenever the rules give it a short honest name; null
  // falls back to the generic wording. Naming only, nothing else changes.
  const nameOf = (id) => library.find(e => e.id === id)?.name ?? null;
  const groupSubject = (rows) => subjectPhrase(rows ?? [], { nameOf });

  const beginAdd = () => {
    haptics.selection();
    setDraft({
      role: null, kind: null, axes: [], families: [], exercises: [],
      clinician: false, startDays: 0, endDays: null,
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
      clinician: false, startDays: 0, endDays: null,
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
    const rows = [
      ...draft.axes.map((axis) => ({ ...base, ruleKind: CONSTRAINT_RULE_KIND.DEMAND, ruleValue: axis })),
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

  // CC29 (section 14, CAP-11): the proposed diff for a new episode against
  // the active plan, grouped per rule (slot micro-approvals avoided). The
  // cross-lane computation lives in lib/sessionEffective.js, outside both
  // lanes, so this capability surface never imports the preference lane.
  const proposeEffectiveDiff = async (createdIds, subject = null) => {
    try {
      // eslint-disable-next-line global-require
      // CC32 (section 29): recordEffectiveChoice = the same write plus its
      // aggregate counter, emitted from the neutral seam so this guarded
      // surface stays telemetry-free.
      const { computePlanEffectiveSummary, recordEffectiveChoice } = require('../lib/sessionEffective');
      const summary = await computePlanEffectiveSummary(userId, createdIds);
      if (!summary.affected) return;
      const parts = [];
      if (summary.substituted) parts.push(`${summary.substituted} exercise${summary.substituted === 1 ? '' : 's'} swapped for something that works now`);
      if (summary.omitted) parts.push(`${summary.omitted} left out with nothing forced in their place`);
      appAlert(
        'Apply this to your current plan?',
        `${subject ? `While ${subject} is out` : 'While this lasts'}, your sessions would show ${parts.join(', and ')}. Your plan itself is not changed, and everything returns when you end it.`,
        [
          {
            text: 'Not now',
            style: 'cancel',
            onPress: async () => {
              for (const id of createdIds) {
                // eslint-disable-next-line no-await-in-loop
                await recordEffectiveChoice(userId, id, 'declined').catch(() => {});
              }
              toast.show('Kept as recorded. Affected exercises will show a quiet notice with a swap shortcut.');
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
        ],
      );
    } catch (_e) { /* proposal is additive; the save already stands */ }
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
      { text: 'This is how I train now', onPress: async () => { await promoteEpisode(userId, ep.groupId); refresh(); } },
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
            await writeConstraintRows(rows, now);
            toast.show(subject
              ? `Started again from today. Volyume will keep ${subject} out until you end it here.`
              : 'Started again from today. Volyume will work around it until you end it here.');
            refresh();
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
            onPress={() => setAdding(draft.role === CONSTRAINT_ROLE.EPISODE ? 'dates' : 'readback')} t={t} primary />
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
          <Choice label="Not now" sub="You can still avoid specific exercises from Plan tools, and set your equipment - neither needs this agreement."
            onPress={() => { setAdding(null); setDraft(null); }} t={t} />
        </View>
      );
    }
    if (adding === 'readback') {
      const labels = [
        ...draft.axes.map(a => demandLabel(a).toLowerCase()),
        ...(draft.families ?? []).map(f => familyLabel(f)),
        ...(draft.exercises ?? []).map(e => e.name),
      ].join(', ');
      const isEpisode = draft.role === CONSTRAINT_ROLE.EPISODE;
      const isAllow = draft.kind === 'allow';
      const backStage = draft.kind === 'demand' ? 'axes' : draft.kind === 'family' ? 'family' : 'exercise';
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

  const episodeSub = (ep) => {
    const names = ep.rows.filter(r => r.state === 'active').map(r => ruleLabel(r)).join(', ');
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

      {/* CC28 (section 33.12): energy-limited training's honest v1 home.
          No energy axis, no pacing computation - the card maps to the two
          EXISTING deterministic levers (session length, now free-editable
          in Workout settings; the episode machinery for bad spells) and
          says so plainly. */}
      <SettingRow
        icon="battery-half-outline"
        label="My energy varies, or I keep sessions short"
        sub="Two levers help here: set a session length that actually fits under Workout and units, and add a temporary change here for a rough patch."
        onPress={() => { haptics.selection(); navigation.navigate('SettingsWorkout'); }}
      />

      {/* Gap-closure Phase D (order section 25): the optional named-
          condition and injury directory. Discovery only - selecting a
          profile stores nothing (GC-D1); its questions land back here. */}
      <SettingRow
        icon="search-outline"
        label="Looking for a specific condition or injury?"
        sub="Optional. Finding it selects better questions; you never need a name to get the same support."
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
        <SettingRow key={row.id} icon="body" label={ruleLabel(row)}
          sub={row.source === CONSTRAINT_SOURCE.CLINICIAN_REPORTED ? 'You told Volyume a clinician asked for this' : 'Part of your normal training'}
          showArrow={false}
          rightElement={(
            <PressableCard onPress={() => endBaselineRow(row)} accessibilityRole="button"
              accessibilityLabel={`Remove ${ruleLabel(row)} from your setup`}>
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
        return (
          <View key={ep.groupId}>
            <SettingRow icon="time" label="Temporary change" sub={episodeSub(ep)} showArrow={false} />
            <View style={styles.episodeActions}>
              <Choice label="Done with it" onPress={() => confirmEndEpisode(ep)} t={t} compact />
              <Choice label="A while longer" onPress={async () => { haptics.selection(); await extendEpisode(userId, ep.groupId, Date.now() + 14 * DAY_MS); toast.show(subject ? `Extended by two weeks. Volyume will check in about ${subject} around then.` : 'Extended by two weeks. Volyume will ask again around then.'); refresh(); }} t={t} compact />
              {ep.status === EPISODE_STATUS.AWAITING_CONFIRMATION ? (
                // Section 33.7's third option: an explicit continue that resets
                // the ask cadence without committing to a new end date.
                <Choice label="Still going for now" onPress={async () => { haptics.selection(); await acknowledgeEpisode(userId, ep.groupId); toast.show(subject ? `Noted. Volyume will keep ${subject} out until you end it here.` : 'Noted. Volyume will keep working around this until you end it here.'); refresh(); }} t={t} compact />
              ) : null}
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
                <SettingRow icon="checkmark" label={ruleLabel(row)}
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
      accessibilityLabel={label}
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      style={[
        styles.choice,
        compact && styles.choiceCompact,
        { borderColor: selected ? t.colors.primary : t.colors.border, backgroundColor: primary ? t.colors.primaryBg : 'transparent' },
        disabled && { opacity: 0.4 },
      ]}
    >
      <Text style={[styles.choiceLabel, { color: t.colors.textPrimary }]}>{label}</Text>
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
  choiceLabel: { ...type.label },
  episodeActions: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  addWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
});
