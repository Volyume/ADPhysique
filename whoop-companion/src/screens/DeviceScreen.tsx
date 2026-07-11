import { useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { Card, NavRow, PrimaryButton, Screen, SecondaryButton, SectionLabel, Stat } from '../ui/components';
import { colors, radius } from '../ui/theme';
import { Nav } from '../ui/navigation';
import type { UserProfile } from '../metrics/strain';

const STATUS_TEXT: Record<string, string> = {
  idle: 'Idle',
  unauthorized: 'Bluetooth permission needed',
  'bluetooth-off': 'Turn Bluetooth on',
  scanning: 'Scanning for WHOOP…',
  connecting: 'Connecting…',
  discovering: 'Reading services…',
  connected: 'Connected',
  disconnected: 'Disconnected',
  error: 'Error',
};

export function DeviceScreen({ nav }: { nav: Nav }) {
  const status = useStoreSelector(appStore, (s) => s.status);
  const detail = useStoreSelector(appStore, (s) => s.statusDetail);
  const device = useStoreSelector(appStore, (s) => s.device);
  const liveHr = useStoreSelector(appStore, (s) => s.liveHr);
  const liveRr = useStoreSelector(appStore, (s) => s.liveRr);
  const battery = useStoreSelector(appStore, (s) => s.battery);
  const draining = useStoreSelector(appStore, (s) => s.draining);
  const error = useStoreSelector(appStore, (s) => s.error);
  const profile = useStoreSelector(appStore, (s) => s.profile);
  const historySync = useStoreSelector(appStore, (s) => s.historySync);
  const lastHistorySync = useStoreSelector(appStore, (s) => s.lastHistorySync);
  const lastSyncTs = useStoreSelector(appStore, (s) => s.lastSyncTs);
  const keepAlive = useStoreSelector(appStore, (s) => s.backgroundKeepAlive);
  const keepAliveRunning = useStoreSelector(appStore, (s) => s.backgroundKeepAliveRunning);
  const strapAlarm = useStoreSelector(appStore, (s) => s.strapAlarm);
  const steps = useStoreSelector(appStore, (s) => s.steps);
  const stepSource = useStoreSelector(appStore, (s) => s.stepSource);
  const bandStepEstimate = useStoreSelector(appStore, (s) => s.bandStepEstimate);
  const [alarmBusy, setAlarmBusy] = useState<'disable' | 'stop' | 'test' | null>(null);

  const connected = status === 'connected';
  const effectiveSync = historySync ?? lastHistorySync;
  const effectiveSyncTs = effectiveSync?.finishedTs ?? lastSyncTs;
  const lastSyncText = effectiveSyncTs
    ? new Date(effectiveSyncTs).toLocaleString()
    : 'Not yet - connect to sync';
  const syncVerdict = getSyncVerdict({
    connected,
    draining,
    keepAlive,
    keepAliveRunning,
    syncStatus: effectiveSync?.status,
    rawRecords: effectiveSync?.rawRecords ?? 0,
    hrSamples: effectiveSync?.hrSamples ?? 0,
    lastSyncTs: effectiveSyncTs ?? null,
  });
  const stepTrust = !bandStepEstimate
    ? 'awaiting sync'
    : bandStepEstimate.confidence === 'low'
      ? 'diagnostic only'
      : 'band corroborated';
  const strapAlarmText =
    strapAlarm.pendingWrite === 'set'
      ? `queued for ${formatAlarmDate(strapAlarm.wakeTs)}`
      : strapAlarm.pendingWrite === 'disable'
        ? 'disable queued for next connection'
        : strapAlarm.enabled
          ? `set for ${formatAlarmDate(strapAlarm.wakeTs)}`
          : 'off in Pulse';

  const disableWakeAlarm = async () => {
    if (alarmBusy) return;
    setAlarmBusy('disable');
    try {
      const result = await appStore.disableStrapAlarm();
      Alert.alert(
        result === 'sent' ? 'Wake alarm disabled' : 'Wake alarm queued',
        result === 'sent'
          ? 'Sent the WHOOP disable-alarm command to the strap. This should clear the stored haptic alarm.'
          : 'Pulse will send the disable-alarm command automatically when the strap reconnects.',
      );
    } catch (e) {
      Alert.alert('Could not disable alarm', String(e));
    } finally {
      setAlarmBusy(null);
    }
  };

  const stopHaptics = async () => {
    if (alarmBusy) return;
    setAlarmBusy('stop');
    try {
      await appStore.stopStrapHaptics();
      Alert.alert('Haptics stopped', 'Sent the WHOOP stop-haptics command to the strap.');
    } catch (e) {
      Alert.alert('Could not stop haptics', String(e));
    } finally {
      setAlarmBusy(null);
    }
  };

  const testWakeAlarm = async () => {
    if (alarmBusy) return;
    setAlarmBusy('test');
    try {
      await appStore.testStrapAlarm();
      Alert.alert('Test buzz sent', 'The strap should buzz briefly, then stop.');
    } catch (e) {
      Alert.alert('Could not test alarm', String(e));
    } finally {
      setAlarmBusy(null);
    }
  };

  return (
    <Screen title="Device" onBack={nav.canBack ? nav.back : undefined}>
      <Card>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.dot,
              { backgroundColor: connected ? colors.recoveryGreen : status === 'error' ? colors.danger : colors.textTertiary },
            ]}
          />
          <Text style={styles.statusText}>{STATUS_TEXT[status] ?? status}</Text>
        </View>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
        {device ? <Text style={styles.detail}>{device.name} · {device.id}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!connected ? (
          <>
            <PrimaryButton title="Scan & connect" onPress={appStore.connect} />
            <SecondaryButton title="Forget strap & rescan" onPress={() => void appStore.forgetDeviceAndRescan()} />
            {status === 'unauthorized' || status === 'error' ? (
              <SecondaryButton title="Open app settings" onPress={() => void Linking.openSettings()} />
            ) : null}
          </>
        ) : (
          <SecondaryButton title="Disconnect" onPress={appStore.disconnect} />
        )}
        <Text style={styles.hint}>
          Close the official WHOOP app and put the strap in pairing mode (tap until the LED flashes) before connecting.
        </Text>
      </Card>

      {connected ? (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Stat label="Heart rate" value={liveHr ?? '—'} unit="bpm" color={colors.recoveryRed} />
            <Stat label="R-R" value={liveRr.length ? liveRr[liveRr.length - 1]! : '—'} unit="ms" />
            <Stat label="Battery" value={battery ?? '—'} unit="%" />
          </View>
        </Card>
      ) : null}

      <SectionLabel>Wake alarm</SectionLabel>
      <Card>
        <Text style={styles.diagText}>
          Strap alarm: {strapAlarmText}
        </Text>
        <SecondaryButton
          title={alarmBusy === 'disable' ? 'Disabling...' : connected ? 'Disable strap alarm' : 'Queue disable alarm'}
          onPress={() => void disableWakeAlarm()}
          disabled={!!alarmBusy}
        />
        <SecondaryButton
          title={alarmBusy === 'stop' ? 'Stopping...' : 'Stop buzzing now'}
          onPress={() => void stopHaptics()}
          disabled={!connected || !!alarmBusy}
        />
        <SecondaryButton
          title={alarmBusy === 'test' ? 'Testing...' : 'Test buzz'}
          onPress={() => void testWakeAlarm()}
          disabled={!connected || !!alarmBusy}
        />
        <SecondaryButton title="Open Sleep Coach" onPress={() => nav.navigate({ name: 'sleepCoach' })} />
        <Text style={styles.hint}>
          Sleep Coach can set the strap alarm from your wake target. Disable can queue for the next connection; Stop and
          Test buzz need the strap connected because they act immediately.
        </Text>
      </Card>

      <SectionLabel>Steps</SectionLabel>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Stat label="Today" value={steps != null ? steps.toLocaleString() : '-'} color={colors.recoveryGreen} />
          <Stat label="Source" value={stepSource === 'band' ? 'WHOOP counter' : '-'} />
          <Stat label="Trust" value={stepTrust} />
        </View>
        <Text style={styles.hint}>
          Steps come from the WHOOP history counter and update after auto-sync. Detailed counter evidence and calibration
          are available in Advanced device.
        </Text>
      </Card>

      <SectionLabel>Sync</SectionLabel>
      <Card>
        <View style={[styles.syncBanner, { borderColor: syncVerdict.color }]}>
          <View style={[styles.syncDot, { backgroundColor: syncVerdict.color }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.syncTitle}>{syncVerdict.title}</Text>
            <Text style={styles.syncBody}>{syncVerdict.body}</Text>
          </View>
        </View>
        <Text style={styles.diagText}>Last sync: {lastSyncText}</Text>
        <Text style={styles.diagText}>Sync status: {draining ? 'Syncing now' : effectiveSync?.status ?? 'Waiting for reconnect'}</Text>
        <SecondaryButton
          title={draining ? 'Syncing…' : 'Sync now'}
          onPress={() => void appStore.runHistoryDrain()}
          disabled={!connected || draining}
        />
        <Text style={styles.hint}>
          The strap records to its own memory. While connected, auto sync keeps requesting stored history in the
          background, backfills previous days, and recomputes sleep only from confirmed HR coverage. Use Sync now only
          as a manual nudge.
        </Text>
      </Card>

      <SectionLabel>Profile (for strain &amp; zones)</SectionLabel>
      <ProfileEditor profile={profile} />

      <SectionLabel>Background sync</SectionLabel>
      <Card>
        <Text style={styles.diagText}>Auto-connect: enabled for the remembered strap</Text>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Background auto-sync protection</Text>
          <Switch
            value={keepAlive}
            onValueChange={(v) => void appStore.setBackgroundKeepAlive(v)}
            trackColor={{ true: colors.recoveryGreen, false: colors.border }}
          />
        </View>
        <Text style={styles.hint}>
          Auto-connect resumes the remembered strap. The guard keeps long history syncs alive while the phone is locked;
          Android may ask for Bluetooth and notification permission.
        </Text>
        <Text style={styles.diagText}>Guard status: {keepAlive ? (keepAliveRunning ? 'running' : 'needs permission') : 'off'}</Text>
        {keepAlive && !keepAliveRunning ? (
          <View style={styles.keepAliveActions}>
            <SecondaryButton title="Retry guard" onPress={() => void appStore.setBackgroundKeepAlive(true)} />
            <SecondaryButton title="Open app settings" onPress={() => void Linking.openSettings()} />
          </View>
        ) : null}
      </Card>

      <SectionLabel>Advanced</SectionLabel>
      <Card>
        <NavRow
          label="Advanced device"
          value="Raw frames & diagnostics"
          icon="code-slash"
          iconColor={colors.textSecondary}
          onPress={() => nav.navigate({ name: 'advancedDevice' })}
          last
        />
      </Card>
    </Screen>
  );
}

function ProfileEditor({ profile }: { profile: UserProfile }) {
  const [age, setAge] = useState(String(profile.ageYears));
  const [sex, setSex] = useState<UserProfile['sex']>(profile.sex);
  const [rhr, setRhr] = useState(String(profile.restingHr));
  const [maxHr, setMaxHr] = useState(profile.maxHr ? String(profile.maxHr) : '');
  const [weight, setWeight] = useState(profile.weightKg ? String(profile.weightKg) : '');

  useEffect(() => {
    setAge(String(profile.ageYears));
    setSex(profile.sex);
    setRhr(String(profile.restingHr));
    setMaxHr(profile.maxHr ? String(profile.maxHr) : '');
    setWeight(profile.weightKg ? String(profile.weightKg) : '');
  }, [profile]);

  const save = () => {
    const next: UserProfile = {
      ageYears: parseInt(age, 10) || profile.ageYears,
      sex,
      restingHr: parseInt(rhr, 10) || profile.restingHr,
    };
    const mh = parseInt(maxHr, 10);
    if (mh) next.maxHr = mh;
    const wt = parseInt(weight, 10);
    if (wt) next.weightKg = wt;
    void appStore.updateProfile(next);
  };

  return (
    <Card>
      <View style={styles.fieldRow}>
        <Field label="Age" value={age} onChange={setAge} />
        <Field label="Resting HR" value={rhr} onChange={setRhr} />
        <Field label="Max HR (opt)" value={maxHr} onChange={setMaxHr} />
      </View>
      <View style={styles.fieldRow}>
        <Field label="Weight (kg)" value={weight} onChange={setWeight} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        {(['male', 'female'] as const).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.sexChip, sex === s && styles.sexChipOn]}
            onPress={() => setSex(s)}
          >
            <Text style={[styles.chipText, sex === s && styles.chipTextOn]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <PrimaryButton title="Save profile" onPress={save} />
    </Card>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.profileField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={onChange} keyboardType="number-pad" placeholderTextColor={colors.textTertiary} />
    </View>
  );
}

function formatAlarmDate(ts: number | null): string {
  if (!ts) return 'unknown';
  return new Date(ts).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' });
}

function formatHistoryRange(firstTs?: number, lastTs?: number): string {
  if (!firstTs || !lastTs) return 'none yet';
  const first = new Date(firstTs).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const last = new Date(lastTs).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${first} - ${last}`;
}

function getSyncVerdict(input: {
  connected: boolean;
  draining: boolean;
  keepAlive: boolean;
  keepAliveRunning: boolean;
  syncStatus?: string;
  rawRecords: number;
  hrSamples: number;
  lastSyncTs: number | null;
}): { title: string; body: string; color: string } {
  if (input.draining) {
    return {
      title: 'Sync is running',
      body: input.rawRecords > 0 ? `${input.rawRecords} history records received so far; keep the app near the strap.` : 'Waiting for stored history from the strap.',
      color: colors.strainBlue,
    };
  }
  if (input.keepAlive && !input.keepAliveRunning) {
    return {
      title: 'Background sync needs permission',
      body: 'Open settings or retry the guard so long drains can continue when the phone locks.',
      color: colors.recoveryYellow,
    };
  }
  if (!input.connected) {
    return {
      title: 'Waiting for strap',
      body: input.lastSyncTs ? `Last completed sync was ${formatHistoryRange(input.lastSyncTs, input.lastSyncTs)}.` : 'Connect once and Pulse will start auto-sync without pressing Sync now.',
      color: colors.textTertiary,
    };
  }
  if (input.hrSamples > 0) {
    return {
      title: 'Backfill available',
      body: `${input.hrSamples} HR samples decoded from stored history. Sleep and recovery will recompute from that coverage.`,
      color: colors.recoveryGreen,
    };
  }
  return {
    title: 'Connected and listening',
    body: input.syncStatus ?? 'Pulse will request stored history automatically while the strap remains connected.',
    color: colors.sleepTeal,
  };
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  statusText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  detail: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  error: { color: colors.danger, fontSize: 13, marginTop: 6 },
  hint: { color: colors.textTertiary, fontSize: 12, marginTop: 10, lineHeight: 17 },
  diagText: { color: colors.text, fontSize: 14, marginBottom: 8 },
  syncBanner: { flexDirection: 'row', gap: 10, borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 12, backgroundColor: colors.surface },
  syncDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  syncTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  syncBody: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 2 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { color: colors.text, fontSize: 15, fontWeight: '600', flex: 1, marginRight: 12 },
  keepAliveActions: { gap: 8, marginTop: 12 },
  fieldRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  profileField: { flexGrow: 1, flexBasis: 96, minWidth: 96 },
  fieldLabel: { color: colors.textSecondary, fontSize: 12, marginBottom: 4 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.button,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  sexChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radius.button,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sexChipOn: { borderColor: colors.white, backgroundColor: colors.white },
  chipText: { color: colors.textSecondary, fontSize: 13 },
  chipTextOn: { color: '#000', fontWeight: '600' },
});
