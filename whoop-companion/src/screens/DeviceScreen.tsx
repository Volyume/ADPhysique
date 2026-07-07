import { useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { Card, Empty, PrimaryButton, Screen, SecondaryButton, SectionLabel, Stat } from '../ui/components';
import { colors, radius } from '../ui/theme';
import { Nav } from '../ui/navigation';
import { clearRawFrames, countRawFrames, getRawFramesPage } from '../db/database';
import { WHOOP5_STEP_TICKS_PER_STEP } from '../metrics/bandSteps';
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

const RAW_FRAME_EXPORT_PAGE_SIZE = 100;
const MAX_SHARE_BYTES = 24 * 1024 * 1024;

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
  const strapAlarm = useStoreSelector(appStore, (s) => s.strapAlarm);
  const steps = useStoreSelector(appStore, (s) => s.steps);
  const stepSource = useStoreSelector(appStore, (s) => s.stepSource);
  const bandSteps = useStoreSelector(appStore, (s) => s.bandSteps);
  const bandStepEstimate = useStoreSelector(appStore, (s) => s.bandStepEstimate);
  const bandStepDivisor = useStoreSelector(appStore, (s) => s.bandStepDivisor);
  const [actualSteps, setActualSteps] = useState('');
  const [exportProgress, setExportProgress] = useState<{ exported: number; total: number } | null>(null);
  const [alarmBusy, setAlarmBusy] = useState<'disable' | 'stop' | 'test' | null>(null);

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
  const historyRangeText = formatHistoryRange(effectiveSync?.firstSampleTs, effectiveSync?.lastSampleTs);
  const stepRangeText = formatStepRange(bandStepEstimate?.firstTs, bandStepEstimate?.lastTs);
  const stepCalibrated = Math.abs(bandStepDivisor - WHOOP5_STEP_TICKS_PER_STEP) > 0.05;
  const stepTrust = stepCalibrated ? 'calibrated' : stepSource === 'phone' && bandSteps ? 'phone verified' : 'uncalibrated';
  const strapAlarmText =
    strapAlarm.pendingWrite === 'set'
      ? `queued for ${formatAlarmDate(strapAlarm.wakeTs)}`
      : strapAlarm.pendingWrite === 'disable'
        ? 'disable queued for next connection'
        : strapAlarm.enabled
          ? `set for ${formatAlarmDate(strapAlarm.wakeTs)}`
          : 'off in Pulse';

  const applyStepCalibration = async () => {
    const actual = Number(actualSteps.replace(/,/g, '').trim());
    if (!Number.isFinite(actual) || actual <= 0) {
      Alert.alert('Calibration needs a step count', "Enter today's actual steps for the synced WHOOP counter.");
      return;
    }
    try {
      const divisor = await appStore.calibrateBandSteps(actual);
      setActualSteps('');
      Alert.alert('Step calibration updated', `${divisor.toFixed(1)} counter units per step`);
    } catch (e) {
      Alert.alert('Calibration unavailable', String(e));
    }
  };

  const resetStepCalibration = async () => {
    const divisor = await appStore.setBandStepDivisor(WHOOP5_STEP_TICKS_PER_STEP);
    setActualSteps('');
    Alert.alert('Step calibration reset', `${divisor.toFixed(1)} counter units per step`);
  };

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

  const exportFrames = async () => {
    if (exportProgress) return;
    try {
      const totalFrames = await countRawFrames();
      if (totalFrames === 0) {
        Alert.alert(
          'Nothing to export yet',
          'No frames are saved in the database. The on-screen “Captured frames” counter climbs for every frame received, but frames are only written to the database while “Start capture” is ON. Make sure capture is on and the strap is connected, wear it a while, then export.',
        );
        return;
      }
      setExportProgress({ exported: 0, total: totalFrames });
      // Plain .txt is accepted by most Android share targets. Write page by
      // page so large captures do not allocate one enormous JS string.
      const file = new File(Paths.cache, `pulse-frames-${totalFrames}.txt`);
      file.create({ overwrite: true });
      const handle = file.open();
      let exported = 0;
      let lastRowId = 0;
      try {
        writeAscii(handle, `# VOLYUME Pulse raw frames: ${totalFrames}\n# epoch_ms\tsource\thex\n`);
        for (;;) {
          const page = await getRawFramesPage(lastRowId, RAW_FRAME_EXPORT_PAGE_SIZE);
          if (!page.length) break;
          let chunk = '';
          for (const frame of page) {
            chunk += `${frame.ts}\t${frame.source}\t${frame.hex}\n`;
          }
          writeAscii(handle, chunk);
          exported += page.length;
          lastRowId = page[page.length - 1]!.rowId;
          setExportProgress({ exported, total: totalFrames });
          await pauseForUi();
          if (page.length < RAW_FRAME_EXPORT_PAGE_SIZE) break;
        }
      } finally {
        handle.close();
      }
      const uri = file.uri;
      // Confirm the file genuinely landed on disk before we claim success.
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists) {
        Alert.alert('Export failed', 'The frames file could not be written to disk.');
        return;
      }
      const sizeKb = 'size' in info && info.size ? Math.round(info.size / 1024) : 0;
      const sizeBytes = 'size' in info && info.size ? info.size : 0;

      if (sizeBytes > MAX_SHARE_BYTES) {
        Alert.alert(
          'Large export saved',
          `${exported} frames (${sizeKb} KB) were written to:\n${uri}\n\nThe file is too large to hand to Android's share sheet safely, so Pulse skipped sharing to avoid the OutOfMemory crash.`,
        );
        return;
      }

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'text/plain',
          UTI: 'public.plain-text',
          dialogTitle: `Export ${exported} captured frames`,
        });
        // Always confirm afterwards so there's visible feedback even if the share
        // sheet is dismissed or offers no target.
        Alert.alert(
          'Frames exported',
          `${exported} frames (${sizeKb} KB) written to:\n${uri}\n\nIf the share sheet had no usable app, the file is still saved at that path — you can reach it via a file manager.`,
        );
      } else {
        Alert.alert('Saved', `${exported} frames (${sizeKb} KB) saved to:\n${uri}`);
      }
    } catch (e) {
      Alert.alert('Export failed', String(e));
    } finally {
      setExportProgress(null);
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
          <Stat label="Source" value={stepSource === 'band' ? 'band est.' : stepSource ?? '-'} />
          <Stat label="Trust" value={stepTrust} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
          <Stat label="Band estimate" value={bandSteps != null ? bandSteps.toLocaleString() : '-'} />
          <Stat label="Raw counter" value={bandStepEstimate?.rawTicks ?? '-'} />
          <Stat label="Units/step" value={bandStepDivisor.toFixed(1)} />
        </View>
        <Text style={styles.diagText}>Band confidence: {bandStepEstimate?.confidence ?? '-'}</Text>
        <Text style={styles.diagText}>Band counter range: {stepRangeText}</Text>
        <View style={styles.calibrationRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Actual steps</Text>
            <TextInput
              style={styles.input}
              value={actualSteps}
              onChangeText={setActualSteps}
              keyboardType="number-pad"
              placeholder="e.g. 200"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
          <View style={styles.calibrationActions}>
            <SecondaryButton title="Apply" onPress={() => void applyStepCalibration()} />
            <SecondaryButton title="Reset" onPress={() => void resetStepCalibration()} />
          </View>
        </View>
        <Text style={styles.hint}>
          Today uses phone steps when the uncalibrated band counter disagrees. After a known walk, enter the real step
          count to calibrate the strap counter for workouts and backfilled days.
        </Text>
      </Card>

      <SectionLabel>Sync</SectionLabel>
      <Card>
        <Text style={styles.diagText}>Last sync: {lastSyncText}</Text>
        <Text style={styles.diagText}>Raw records archived: {bufferedRecords}</Text>
        <Text style={styles.diagText}>Sync status: {effectiveSync?.status ?? 'Waiting for reconnect'}</Text>
        <Text style={styles.diagText}>Sync mode: {draining ? 'running' : effectiveSync?.mode ?? 'none'}</Text>
        <Text style={styles.diagText}>Sync finish: {effectiveSync?.reason ?? 'none yet'}</Text>
        <Text style={styles.diagText}>Decoded range: {historyRangeText}</Text>
        <Text style={styles.diagText}>Decoded records: {effectiveSync?.decodedRecords ?? 0}</Text>
        <Text style={styles.diagText}>HR samples backfilled: {effectiveSync?.hrSamples ?? 0}</Text>
        <Text style={styles.diagText}>R-R intervals backfilled: {effectiveSync?.rrSamples ?? 0}</Text>
        <Text style={styles.diagText}>Band step counters: {effectiveSync?.stepSamples ?? 0}</Text>
        <Text style={styles.diagText}>Raw sensor records: {effectiveSync?.rawSensorRecords ?? 0}</Text>
        <Text style={styles.diagText}>Raw vital candidates: {effectiveSync?.rawVitalSamples ?? 0}</Text>
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
          The strap records to its own memory. While connected, auto sync keeps requesting stored history in the
          background, backfills previous days, and recomputes sleep only from confirmed HR coverage. Use Sync now only
          as a manual nudge.
        </Text>
      </Card>

      <SectionLabel>Profile (for strain &amp; zones)</SectionLabel>
      <ProfileEditor profile={profile} />

      <SectionLabel>Background sync</SectionLabel>
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
          On by default for long WHOOP 5 syncs while the phone is locked. Android may ask for location and notification
          permission so the foreground service can keep Bluetooth alive.
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
        <SecondaryButton
          title={exportProgress ? 'Exporting...' : 'Export captured frames'}
          onPress={() => void exportFrames()}
          disabled={!!exportProgress}
        />
        {exportProgress ? (
          <Text style={styles.diagText}>
            Exported {exportProgress.exported.toLocaleString()} / {exportProgress.total.toLocaleString()} frames
          </Text>
        ) : null}
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

type WritableFileHandle = {
  writeBytes(bytes: Uint8Array): void;
  close(): void;
};

function writeAscii(handle: WritableFileHandle, text: string): void {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) {
    bytes[i] = text.charCodeAt(i) & 0x7f;
  }
  handle.writeBytes(bytes);
}

function pauseForUi(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
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

function formatStepRange(firstTs?: number, lastTs?: number): string {
  if (!firstTs || !lastTs) return 'none today';
  const lastAgeMin = Math.max(0, Math.round((Date.now() - lastTs) / 60000));
  const range = formatHistoryRange(firstTs, lastTs);
  if (lastAgeMin < 1) return `${range} (fresh)`;
  if (lastAgeMin < 60) return `${range} (${lastAgeMin}m old)`;
  return `${range} (${Math.round(lastAgeMin / 60)}h old)`;
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
  calibrationRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-end', marginTop: 12 },
  calibrationActions: { width: 118, gap: 8 },
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
