import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { Card, Empty, PrimaryButton, Screen, SecondaryButton, SectionLabel, Stat } from '../ui/components';
import { colors, radius } from '../ui/theme';
import { Nav } from '../ui/navigation';
import { getAllRawFrames, clearRawFrames, countRawFrames } from '../db/database';
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
  const frameCount = useStoreSelector(appStore, (s) => s.frameCount);
  const capturing = useStoreSelector(appStore, (s) => s.capturing);
  const draining = useStoreSelector(appStore, (s) => s.draining);
  const error = useStoreSelector(appStore, (s) => s.error);
  const profile = useStoreSelector(appStore, (s) => s.profile);
  const bufferedRecords = useStoreSelector(appStore, (s) => s.bufferedRecords);
  const historySync = useStoreSelector(appStore, (s) => s.historySync);
  const lastHistorySync = useStoreSelector(appStore, (s) => s.lastHistorySync);
  const lastSyncTs = useStoreSelector(appStore, (s) => s.lastSyncTs);
  const keepAlive = useStoreSelector(appStore, (s) => s.backgroundKeepAlive);
  const steps = useStoreSelector(appStore, (s) => s.steps);
  const stepSource = useStoreSelector(appStore, (s) => s.stepSource);
  const bandSteps = useStoreSelector(appStore, (s) => s.bandSteps);

  // Frames actually written to the database (what export reads), polled so we can
  // see whether persistence is keeping up with the live (in-memory) counter.
  const [savedFrames, setSavedFrames] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    const tick = () => {
      void countRawFrames().then((n) => {
        if (alive) setSavedFrames(n);
      });
    };
    tick();
    const id = setInterval(tick, 3000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const connected = status === 'connected';
  const effectiveSync = historySync ?? lastHistorySync;
  const effectiveSyncTs = effectiveSync?.finishedTs ?? lastSyncTs;
  const lastSyncText = effectiveSyncTs
    ? new Date(effectiveSyncTs).toLocaleString()
    : 'Not yet - connect to sync';

  const exportFrames = async () => {
    try {
      const frames = await getAllRawFrames();
      if (frames.length === 0) {
        Alert.alert(
          'Nothing to export yet',
          'No frames are saved in the database. The on-screen “Captured frames” counter climbs for every frame received, but frames are only written to the database while “Start capture” is ON. Make sure capture is on and the strap is connected, wear it a while, then export.',
        );
        return;
      }
      const header = `# VOLYUME Pulse raw frames: ${frames.length}\n# epoch_ms\tsource\thex\n`;
      const body = frames.map((f) => `${f.ts}\t${f.source}\t${f.hex}`).join('\n');
      // Plain text with a .txt extension is the most widely accepted across
      // Android share targets (Gmail, Drive, Files, messaging). The earlier
      // text/tab-separated-values + .tsv combo gave many phones an empty share
      // sheet — which looked like the button "did nothing".
      const uri = `${FileSystem.cacheDirectory}pulse-frames-${frames.length}.txt`;
      await FileSystem.writeAsStringAsync(uri, header + body);

      // Confirm the file genuinely landed on disk before we claim success.
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists) {
        Alert.alert('Export failed', 'The frames file could not be written to disk.');
        return;
      }
      const sizeKb = 'size' in info && info.size ? Math.round(info.size / 1024) : 0;

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'text/plain',
          UTI: 'public.plain-text',
          dialogTitle: `Export ${frames.length} captured frames`,
        });
        // Always confirm afterwards so there's visible feedback even if the share
        // sheet is dismissed or offers no target.
        Alert.alert(
          'Frames exported',
          `${frames.length} frames (${sizeKb} KB) written to:\n${uri}\n\nIf the share sheet had no usable app, the file is still saved at that path — you can reach it via a file manager.`,
        );
      } else {
        Alert.alert('Saved', `${frames.length} frames (${sizeKb} KB) saved to:\n${uri}`);
      }
    } catch (e) {
      Alert.alert('Export failed', String(e));
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
          <PrimaryButton title="Scan & connect" onPress={appStore.connect} />
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

      <SectionLabel>Steps</SectionLabel>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Stat label="Today" value={steps != null ? steps.toLocaleString() : '-'} color={colors.recoveryGreen} />
          <Stat label="Source" value={stepSource ?? '-'} />
          <Stat label="Band history" value={bandSteps != null ? bandSteps.toLocaleString() : '-'} />
        </View>
        <Text style={styles.hint}>
          Synced WHOOP history is preferred for backfilled daily steps and workout step counts. The phone
          pedometer is used as a live fallback for today and active workouts when band counters are not available yet.
        </Text>
      </Card>

      <SectionLabel>Sync</SectionLabel>
      <Card>
        <Text style={styles.diagText}>Last sync: {lastSyncText}</Text>
        <Text style={styles.diagText}>Raw records archived: {bufferedRecords}</Text>
        <Text style={styles.diagText}>Sync status: {effectiveSync?.status ?? 'Waiting for reconnect'}</Text>
        <Text style={styles.diagText}>Sync mode: {draining ? 'running' : effectiveSync?.mode ?? 'none'}</Text>
        <Text style={styles.diagText}>Sync finish: {effectiveSync?.reason ?? 'none yet'}</Text>
        <Text style={styles.diagText}>Decoded records: {effectiveSync?.decodedRecords ?? 0}</Text>
        <Text style={styles.diagText}>HR samples backfilled: {effectiveSync?.hrSamples ?? 0}</Text>
        <Text style={styles.diagText}>R-R intervals backfilled: {effectiveSync?.rrSamples ?? 0}</Text>
        <Text style={styles.diagText}>Band step counters: {effectiveSync?.stepSamples ?? 0}</Text>
        <Text style={styles.diagText}>Raw sensor records: {effectiveSync?.rawSensorRecords ?? 0}</Text>
        <Text style={styles.diagText}>
          History layouts: {effectiveSync?.versions.length ? effectiveSync.versions.join(', ') : 'none yet'}
        </Text>
        <Text style={styles.diagText}>Rejected records: {effectiveSync?.rejectedRecords ?? 0}</Text>
        <SecondaryButton
          title={draining ? 'Syncing…' : 'Sync now'}
          onPress={() => void appStore.runHistoryDrain()}
          disabled={!connected || draining}
        />
        <Text style={styles.hint}>
          The strap records to its own memory. On connect, reconnect and while the background protection service is
          running, auto sync requests stored history, decodes v18 HR/R-R records, recognises v20/v21/v26 sensor
          records, backfills previous days, and recomputes sleep from confirmed HR rows. Use Sync now only as a retry.
        </Text>
      </Card>

      <SectionLabel>Profile (for strain &amp; zones)</SectionLabel>
      <ProfileEditor profile={profile} />

      <SectionLabel>Live diagnostics</SectionLabel>
      <Card>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Background auto-sync protection</Text>
          <Switch
            value={keepAlive}
            onValueChange={(v) => void appStore.setBackgroundKeepAlive(v)}
            trackColor={{ true: colors.recoveryGreen, false: colors.border }}
          />
        </View>
        <Text style={styles.hint}>
          Keeps an Android foreground service running so auto-connect, reconnect retries and long stored-history
          syncs can continue after the app is backgrounded or the phone is locked. Leave this on for overnight
          sleep backfill.
        </Text>
      </Card>

      <SectionLabel>Diagnostics</SectionLabel>
      <Card>
        <Text style={styles.diagText}>Captured frames (this session): {frameCount}</Text>
        <Text style={styles.diagText}>
          Frames saved to database: {savedFrames == null ? '…' : savedFrames}
          {savedFrames != null && capturing && savedFrames === 0 && frameCount > 0
            ? '  ⚠ frames arriving but not saving'
            : ''}
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <SecondaryButton
              title={capturing ? 'Stop capture' : 'Start capture'}
              onPress={appStore.toggleCapture}
            />
          </View>
          <View style={{ flex: 1 }}>
            <SecondaryButton
              title={draining ? 'Draining…' : 'Pull history'}
              onPress={() => void appStore.runHistoryDrain()}
              disabled={!connected || draining}
            />
          </View>
        </View>
        <SecondaryButton title="Export captured frames" onPress={() => void exportFrames()} />
        <SecondaryButton title="Clear captured frames" onPress={() => void clearRawFrames()} />
        <Text style={styles.hint}>
          Capturing the strap's proprietary frames lets the history / sleep decoder be finalised. Export and share them
          to have them decoded.
        </Text>
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
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Field label="Age" value={age} onChange={setAge} />
        <Field label="Resting HR" value={rhr} onChange={setRhr} />
        <Field label="Max HR (opt)" value={maxHr} onChange={setMaxHr} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
        <Field label="Weight (kg)" value={weight} onChange={setWeight} />
        <View style={{ flex: 2 }} />
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
    <View style={{ flex: 1 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={onChange} keyboardType="number-pad" placeholderTextColor={colors.textTertiary} />
    </View>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  statusText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  detail: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  error: { color: colors.danger, fontSize: 13, marginTop: 6 },
  hint: { color: colors.textTertiary, fontSize: 12, marginTop: 10, lineHeight: 17 },
  diagText: { color: colors.text, fontSize: 14, marginBottom: 8 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { color: colors.text, fontSize: 15, fontWeight: '600', flex: 1, marginRight: 12 },
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
