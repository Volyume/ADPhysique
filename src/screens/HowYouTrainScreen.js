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
import { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useShallow } from 'zustand/react/shallow';
import useAppStore from '../store/useAppStore';
import useTheme from '../hooks/useTheme';
import { type } from '../styles/theme';
import { useToast } from '../components/Toast';
import { appAlert } from '../components/AppAlert';
import PressableCard from '../components/PressableCard';
import * as haptics from '../lib/haptics';
import { logError } from '../lib/errorLog';
import {
  SettingsPage, SettingRow, SectionHeader,
} from '../components/SettingsPrimitives';
import {
  loadCapabilityState, createConstraint, endConstraint, endEpisode,
  extendEpisode, promoteEpisode, hasCapabilityConsent,
} from '../lib/capability/store';
import {
  grantCapabilityConsent, withdrawCapabilityConsent,
} from '../lib/consent/capabilityConsent';
import {
  DEMAND_AXES, demandLabel, CONSTRAINT_ROLE, CONSTRAINT_SOURCE,
  CONSTRAINT_RULE_KIND, EPISODE_STATUS,
} from '../lib/capability/model';
import { uid } from '../lib/database';

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
  const toast = useToast();
  const { user } = useAppStore(useShallow(s => ({ user: s.user })));
  const userId = user?.id;

  const [state, setState] = useState({ baseline: [], episodes: [], history: [], unavailable: false });
  const [consented, setConsented] = useState(false);
  // Add-flow stages: null | 'role' | 'axes' | 'dates' | 'consent' | 'readback'
  const [adding, setAdding] = useState(null);
  const [draft, setDraft] = useState(null);

  const refresh = useCallback(() => {
    if (!userId) return;
    loadCapabilityState(userId).then(setState).catch(() => {});
    hasCapabilityConsent(userId).then(setConsented).catch(() => {});
  }, [userId]);
  useFocusEffect(refresh);

  const beginAdd = () => {
    haptics.selection();
    setDraft({ role: null, axes: [], clinician: false, startDays: 0, endDays: null });
    setAdding('role');
  };

  const chooseRole = (role) => {
    haptics.selection();
    setDraft(d => ({ ...d, role }));
    setAdding('axes');
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

  const writeDraft = async () => {
    const now = Date.now();
    const isEpisode = draft.role === CONSTRAINT_ROLE.EPISODE;
    const groupId = isEpisode ? uid() : null;
    const startsAt = now - (draft.startDays ?? 0) * DAY_MS;
    const endsAt = isEpisode && draft.endDays != null ? now + draft.endDays * DAY_MS : null;
    for (const axis of draft.axes) {
      // eslint-disable-next-line no-await-in-loop
      await createConstraint(userId, {
        role: draft.role,
        source: draft.clinician ? CONSTRAINT_SOURCE.CLINICIAN_REPORTED : CONSTRAINT_SOURCE.SELF,
        ruleKind: CONSTRAINT_RULE_KIND.DEMAND,
        ruleValue: axis,
        startsAt,
        endsAt,
        episodeGroupId: groupId,
      }, { nowMs: now });
    }
    setAdding(null); setDraft(null);
    toast.show(isEpisode ? 'Saved. Volyume will treat this as temporary.' : 'Saved. This is part of how you train.');
    refresh();
  };

  const onConsent = async () => {
    haptics.selection();
    const ok = await grantCapabilityConsent(userId, {});
    if (!ok) { toast.show('That did not save - you can try again.'); return; }
    setConsented(true);
    try { await writeDraft(); } catch (e) {
      logError('HowYouTrain.consentSave', e, {});
      toast.show('Consent is recorded, but the save failed. Try again from Add.');
      setAdding(null);
    }
  };

  const confirmEndEpisode = (ep) => {
    appAlert('Has this ended?', 'Volyume will go back to treating the affected training normally. Nothing from this period is lost.', [
      { text: 'Keep it active', style: 'cancel' },
      { text: 'It has ended', onPress: async () => { await endEpisode(userId, ep.groupId); refresh(); } },
    ]);
  };

  const confirmPromote = (ep) => {
    appAlert('Make this part of how you train?', 'Volyume will treat these as your normal setup from now on, with full progression and coaching. Your history is not rewritten.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'This is how I train now', onPress: async () => { await promoteEpisode(userId, ep.groupId); refresh(); } },
    ]);
  };

  const confirmWithdraw = () => {
    appAlert('Remove your capability information?', 'This deletes everything you have told Volyume here, on all your devices, and turns the feature off. Your account, workouts and history are untouched.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete and turn off',
        style: 'destructive',
        onPress: async () => {
          await withdrawCapabilityConsent(userId, {});
          toast.show('Removed. You can set this up again any time.');
          refresh();
        },
      },
    ]);
  };

  const endBaselineRow = (row) => {
    appAlert('Remove this from your setup?', `Volyume will stop building around "${demandLabel(row.ruleValue)}".`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', onPress: async () => { await endConstraint(userId, row.id); refresh(); } },
    ]);
  };

  const renderAddFlow = () => {
    if (adding === 'role') {
      return (
        <View style={[styles.card, { backgroundColor: t.colors.card }]}>
          <Text style={[styles.q, { color: t.colors.text }]}>Is this about how you train generally, or something temporary right now?</Text>
          <Choice label="How I train generally" sub="Part of your normal setup. Full progression and coaching, no special labels."
            onPress={() => chooseRole(CONSTRAINT_ROLE.BASELINE)} t={t} />
          <Choice label="Temporary, for now" sub="Volyume treats it as a passing change and will help you step back when it ends."
            onPress={() => chooseRole(CONSTRAINT_ROLE.EPISODE)} t={t} />
        </View>
      );
    }
    if (adding === 'axes') {
      return (
        <View style={[styles.card, { backgroundColor: t.colors.card }]}>
          <Text style={[styles.q, { color: t.colors.text }]}>What should Volyume build around?</Text>
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
        <View style={[styles.card, { backgroundColor: t.colors.card }]}>
          <Text style={[styles.q, { color: t.colors.text }]}>Since when?</Text>
          {START_CHOICES.map(c => (
            <Choice key={c.key} label={c.label} selected={draft.startDays === c.days}
              onPress={() => setDraft(d => ({ ...d, startDays: c.days }))} t={t} />
          ))}
          <Text style={[styles.q, { color: t.colors.text, marginTop: 16 }]}>Roughly how long?</Text>
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
        <View style={[styles.card, { backgroundColor: t.colors.card }]}>
          <Text style={[styles.q, { color: t.colors.text }]}>One thing first</Text>
          <Text style={[styles.body, { color: t.colors.text }]}>
            To build training around your body, Volyume stores what you choose here: the training
            situations you have asked it to work around, whether each is part of your normal setup
            or temporary, and when it applies. That counts as health information, so it needs your
            explicit agreement. It is never used for anything else, never shared, and you can see,
            export or delete all of it here at any time. Deleting it does not touch your account.
          </Text>
          <Choice label="I agree - store my capability information" onPress={onConsent} t={t} primary />
          <Choice label="Not now" sub="You can still avoid specific exercises from Plan tools, and set your equipment - neither needs this agreement."
            onPress={() => { setAdding(null); setDraft(null); }} t={t} />
        </View>
      );
    }
    if (adding === 'readback') {
      const labels = draft.axes.map(demandLabel).join(', ').toLowerCase();
      const isEpisode = draft.role === CONSTRAINT_ROLE.EPISODE;
      return (
        <View style={[styles.card, { backgroundColor: t.colors.card }]}>
          <Text style={[styles.q, { color: t.colors.text }]}>
            {isEpisode
              ? `Volyume will temporarily work around: ${labels}.`
              : `Volyume will build your training around: ${labels}.`}
          </Text>
          <Choice label="Save" onPress={saveDraft} t={t} primary />
          <Choice label="Back" onPress={() => setAdding('axes')} t={t} />
        </View>
      );
    }
    return null;
  };

  const episodeSub = (ep) => {
    const names = ep.rows.filter(r => r.state === 'active').map(r => demandLabel(r.ruleValue)).join(', ');
    if (ep.status === EPISODE_STATUS.AWAITING_CONFIRMATION) {
      return `${names}. Past the time you expected - has it ended?`;
    }
    return names;
  };

  return (
    <SettingsPage title="How you train">
      {state.unavailable ? (
        <Text style={[styles.hint, { color: t.colors.textSecondary, margin: 16 }]}
          accessibilityLiveRegion="polite">
          Volyume could not read this right now. Nothing has changed; pull back in a moment.
        </Text>
      ) : null}

      <SectionHeader title="Your setup" />
      {state.baseline.length === 0 && !adding ? (
        <Text style={[styles.hint, { color: t.colors.textSecondary, marginHorizontal: 16 }]}>
          Nothing here yet. If there is anything Volyume should build your training around, add it -
          it stays part of your normal training, with full progression and coaching.
        </Text>
      ) : null}
      {state.baseline.map(row => (
        <SettingRow key={row.id} icon="body" label={demandLabel(row.ruleValue)}
          sub={row.source === CONSTRAINT_SOURCE.CLINICIAN_REPORTED ? 'You told Volyume a clinician asked for this' : 'Part of your normal training'}
          showArrow={false}
          rightElement={(
            <PressableCard onPress={() => endBaselineRow(row)} accessibilityRole="button"
              accessibilityLabel={`Remove ${demandLabel(row.ruleValue)} from your setup`}>
              <Text style={{ color: t.colors.textSecondary, padding: 8 }}>Remove</Text>
            </PressableCard>
          )} />
      ))}

      <SectionHeader title="Temporary, right now" />
      {state.episodes.length === 0 && !adding ? (
        <Text style={[styles.hint, { color: t.colors.textSecondary, marginHorizontal: 16 }]}>
          No temporary changes at the moment.
        </Text>
      ) : null}
      {state.episodes.map(ep => (
        <View key={ep.groupId}>
          <SettingRow icon="time" label="Temporary change" sub={episodeSub(ep)} showArrow={false} />
          <View style={styles.episodeActions}>
            <Choice label="It has ended" onPress={() => confirmEndEpisode(ep)} t={t} compact />
            <Choice label="A while longer" onPress={async () => { haptics.selection(); await extendEpisode(userId, ep.groupId, Date.now() + 14 * DAY_MS); toast.show('Extended by two weeks.'); refresh(); }} t={t} compact />
            <Choice label="This is how I train now" onPress={() => confirmPromote(ep)} t={t} compact />
          </View>
        </View>
      ))}

      {adding ? renderAddFlow() : (
        <View style={styles.addWrap}>
          <Choice label="Add something" onPress={beginAdd} t={t} primary />
        </View>
      )}

      {state.history.length > 0 ? (
        <>
          <SectionHeader title="Past" />
          {state.history.slice(0, 12).map(row => (
            <SettingRow key={row.id} icon="checkmark" label={demandLabel(row.ruleValue)}
              sub={row.endedReason === 'promoted' ? 'Became part of your setup' : 'Ended'} showArrow={false} />
          ))}
        </>
      ) : null}

      {consented ? (
        <>
          <SectionHeader title="Your data" />
          <SettingRow icon="trash" label="Delete capability information" destructive
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
      <Text style={[styles.choiceLabel, { color: t.colors.text }]}>{label}</Text>
      {sub ? <Text style={[styles.hint, { color: t.colors.textSecondary }]}>{sub}</Text> : null}
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, margin: 16 },
  q: { ...type.h3, marginBottom: 8 },
  body: { ...type.body, marginBottom: 12 },
  hint: { ...type.caption, marginBottom: 8 },
  choice: { borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, marginTop: 8, minHeight: 48, justifyContent: 'center' },
  choiceCompact: { flexGrow: 1, marginRight: 8 },
  choiceLabel: { ...type.label },
  episodeActions: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingBottom: 8 },
  addWrap: { paddingHorizontal: 16, paddingTop: 8 },
});
