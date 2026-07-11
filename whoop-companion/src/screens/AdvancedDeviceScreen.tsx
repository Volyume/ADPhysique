import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { clearRawFrames, countRawFrames, getRawFramesPage } from '../db/database';
import { WHOOP5_STEP_TICKS_PER_STEP } from '../metrics/bandSteps';
import { Card, Screen, SecondaryButton, SectionLabel } from '../ui/components';
import { colors, radius } from '../ui/theme';
import { Nav } from '../ui/navigation';

const RAW_FRAME_EXPORT_PAGE_SIZE = 25;
const MAX_SHARE_BYTES = 12 * 1024 * 1024;

export function AdvancedDeviceScreen({ nav }: { nav: Nav }) {
  const status = useStoreSelector(appStore, (s) => s.status);
  const detail = useStoreSelector(appStore, (s) => s.statusDetail);
  const device = useStoreSelector(appStore, (s) => s.device);
  const error = useStoreSelector(appStore, (s) => s.error);
  const frameCount = useStoreSelector(appStore, (s) => s.frameCount);
  const capturing = useStoreSelector(appStore, (s) => s.capturing);
  const draining = useStoreSelector(appStore, (s) => s.draining);
  const bufferedRecords = useStoreSelector(appStore, (s) => s.bufferedRecords);
  const historySync = useStoreSelector(appStore, (s) => s.historySync);
  const lastHistorySync = useStoreSelector(appStore, (s) => s.lastHistorySync);
  const bandStepEstimate = useStoreSelector(appStore, (s) => s.bandStepEstimate);
  const bandStepDivisor = useStoreSelector(appStore, (s) => s.bandStepDivisor);
  const [actualSteps, setActualSteps] = useState('');
  const [exportProgress, setExportProgress] = useState<{ exported: number; total: number } | null>(null);
  const [savedFrames, setSavedFrames] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = () => {
      void countRawFrames().then((count) => {
        if (alive) setSavedFrames(count);
      });
    };
    tick();
    const id = setInterval(tick, 3000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const effectiveSync = historySync ?? lastHistorySync;
  const connected = status === 'connected';
  const historyRangeText = formatHistoryRange(effectiveSync?.firstSampleTs, effectiveSync?.lastSampleTs);
  const stepRangeText = formatStepRange(bandStepEstimate?.firstTs, bandStepEstimate?.lastTs);

  const applyStepCalibration = async () => {
    const actual = Number(actualSteps.replace(/,/g, '').trim());
    if (!Number.isFinite(actual) || actual <= 0) {
      Alert.alert('Calibration needs a step count', 'Enter the real step count for the synced counter range shown on this screen.');
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

  const exportFrames = async () => {
    if (exportProgress) return;
    try {
      const totalFrames = await countRawFrames();
      if (totalFrames === 0) {
        Alert.alert(
          'Nothing to export yet',
          'No frames are saved in the database. Turn capture on while the strap is connected, then try again.',
        );
        return;
      }
      setExportProgress({ exported: 0, total: totalFrames });
      const file = new File(Paths.cache, `pulse-frames-${totalFrames}-${Date.now()}.txt`);
      file.create({ overwrite: true });
      const handle = file.open();
      let exported = 0;
      let lastRowId = 0;
      try {
        writeAscii(handle, `# VOLYUME Pulse raw frames: ${totalFrames}\n# epoch_ms\tsource\thex\n`);
        for (;;) {
          const page = await getRawFramesPage(lastRowId, RAW_FRAME_EXPORT_PAGE_SIZE);
          if (!page.length) break;
          for (const frame of page) writeAscii(handle, `${frame.ts}\t${frame.source}\t${frame.hex}\n`);
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
          `${exported} frames (${sizeKb} KB) were written to:\n${uri}\n\nThe file is too large for the share sheet, so sharing was skipped.`,
        );
        return;
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'text/plain',
          UTI: 'public.plain-text',
          dialogTitle: `Export ${exported} captured frames`,
        });
        Alert.alert('Frames exported', `${exported} frames (${sizeKb} KB) written to:\n${uri}`);
      } else {
        Alert.alert('Saved', `${exported} frames (${sizeKb} KB) saved to:\n${uri}`);
      }
    } catch (e) {
      Alert.alert('Export failed', String(e));
    } finally {
      setExportProgress(null);
    }
  };

  const confirmClearFrames = async () => {
    const totalFrames = await countRawFrames();
    if (totalFrames === 0) {
      Alert.alert('No saved frames', 'There are no captured frames saved in the database.');
      setSavedFrames(0);
      return;
    }
    Alert.alert(
      'Clear captured frames?',
      `${totalFrames.toLocaleString()} saved frame${totalFrames === 1 ? '' : 's'} will be deleted. Export first if these are still needed for decoder work.`,
      [
        { text: 'Keep frames', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            void clearRawFrames().then(() => setSavedFrames(0));
          },
        },
      ],
    );
  };

  return (
    <Screen title="Advanced device" onBack={nav.canBack ? nav.back : undefined}>
      <Card>
        <Text style={styles.status}>{status}</Text>
        {device ? <Text style={styles.detail}>{device.name} - {device.id}</Text> : null}
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.hint}>Raw transport, decoder, persistence, and capture tools for troubleshooting.</Text>
      </Card>

      <SectionLabel>History diagnostics</SectionLabel>
      <Card>
        <Text style={styles.diagText}>Stored history records: {bufferedRecords}</Text>
        <Text style={styles.diagText}>Sync mode: {draining ? 'running' : effectiveSync?.mode ?? 'none'}</Text>
        <Text style={styles.diagText}>Sync status: {effectiveSync?.status ?? 'Waiting for reconnect'}</Text>
        <Text style={styles.diagText}>Sync finish: {effectiveSync?.reason ?? 'none yet'}</Text>
        <Text style={styles.diagText}>
          Durable chunks: {effectiveSync?.durableChunks ?? '-'} committed / {effectiveSync?.acknowledgedChunks ?? '-'} strap-acknowledged
        </Text>
        <Text style={styles.diagText}>
          Cursor progress: {effectiveSync?.cursorAdvanced == null ? '-' : effectiveSync.cursorAdvanced ? 'new endpoint' : 'replay/no new endpoint'}
        </Text>
        <Text style={styles.diagText}>Decoded range: {historyRangeText}</Text>
        <Text style={styles.diagText}>Decoded records: {effectiveSync?.decodedRecords ?? 0}</Text>
        <Text style={styles.diagText}>HR samples backfilled: {effectiveSync?.hrSamples ?? 0}</Text>
        <Text style={styles.diagText}>R-R intervals backfilled: {effectiveSync?.rrSamples ?? 0}</Text>
        <Text style={styles.diagText}>Band step counters: {effectiveSync?.stepSamples ?? 0}</Text>
        <Text style={styles.diagText}>WHOOP IMU samples: {effectiveSync?.motionSamples ?? 0}</Text>
        <Text style={styles.diagText}>Raw sensor packets: {effectiveSync?.rawSensorRecords ?? 0}</Text>
        <Text style={styles.diagText}>Validated vital rows: {effectiveSync?.rawVitalSamples ?? 0}</Text>
        <Text style={styles.diagText}>
          Decoder layouts/versions: {effectiveSync?.versions.length ? effectiveSync.versions.join(', ') : 'none yet'}
        </Text>
        <Text style={styles.diagText}>Rejected fields/records: {effectiveSync?.rejectedRecords ?? 0}</Text>
        <SecondaryButton
          title={draining ? 'Draining...' : 'Pull history'}
          onPress={() => void appStore.runHistoryDrain()}
          disabled={!connected || draining}
        />
      </Card>

      <SectionLabel>Raw frame capture</SectionLabel>
      <Card>
        <Text style={styles.diagText}>Captured frames this session: {frameCount}</Text>
        <Text style={styles.diagText}>
          Frames saved to database: {savedFrames == null ? 'loading' : savedFrames}
          {savedFrames != null && capturing && savedFrames === 0 && frameCount > 0 ? ' - frames arriving but not saving' : ''}
        </Text>
        <SecondaryButton title={capturing ? 'Stop capture' : 'Start capture'} onPress={appStore.toggleCapture} />
        <SecondaryButton title={exportProgress ? 'Exporting...' : 'Export captured frames'} onPress={() => void exportFrames()} disabled={!!exportProgress} />
        {exportProgress ? <Text style={styles.diagText}>Exported {exportProgress.exported.toLocaleString()} / {exportProgress.total.toLocaleString()} frames</Text> : null}
        <SecondaryButton title="Clear captured frames" onPress={() => void confirmClearFrames()} />
        <Text style={styles.hint}>Capture writes proprietary strap frames to the local database so they can be exported for decoder work.</Text>
      </Card>

      <SectionLabel>Step calibration</SectionLabel>
      <Card>
        <Text style={styles.diagText}>Band confidence: {bandStepEstimate?.confidence ?? '-'}</Text>
        <Text style={styles.diagText}>Movement-linked counter: {bandStepEstimate ? `${bandStepEstimate.movementLinkedPct}%` : '-'}</Text>
        <Text style={styles.diagText}>Band counter range: {stepRangeText}</Text>
        <View style={styles.calibrationRow}>
          <View style={styles.inputCell}>
            <Text style={styles.fieldLabel}>Actual synced-range steps</Text>
            <TextInput
              style={styles.input}
              value={actualSteps}
              onChangeText={setActualSteps}
              keyboardType="number-pad"
              placeholder="e.g. 2400"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
          <View style={styles.calibrationActions}>
            <SecondaryButton title="Apply" onPress={() => void applyStepCalibration()} />
            <SecondaryButton title="Reset" onPress={() => void resetStepCalibration()} />
          </View>
        </View>
        <Text style={styles.diagText}>Units per step: {bandStepDivisor.toFixed(1)}</Text>
      </Card>
    </Screen>
  );
}

type WritableFileHandle = {
  writeBytes(bytes: Uint8Array): void;
  close(): void;
};

function writeAscii(handle: WritableFileHandle, text: string): void {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) bytes[i] = text.charCodeAt(i) & 0x7f;
  handle.writeBytes(bytes);
}

function pauseForUi(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function formatHistoryRange(firstTs?: number, lastTs?: number): string {
  if (!firstTs || !lastTs) return 'none yet';
  const first = new Date(firstTs).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const last = new Date(lastTs).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
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
  status: { color: colors.text, fontSize: 16, fontWeight: '600' },
  detail: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  error: { color: colors.danger, fontSize: 13, marginTop: 6 },
  hint: { color: colors.textTertiary, fontSize: 12, marginTop: 10, lineHeight: 17 },
  diagText: { color: colors.text, fontSize: 14, marginBottom: 8 },
  calibrationRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-end', marginTop: 4 },
  inputCell: { flex: 1 },
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
});
