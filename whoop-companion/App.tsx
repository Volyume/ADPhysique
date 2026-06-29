import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import {
  DiscoveredChar,
  RawFrame,
  WhoopBle,
  WhoopStatus,
} from './src/ble/whoopBle';
import { HeartRateSample } from './src/ble/heartRate';

const MAX_FRAMES_KEPT = 4000; // for export
const MAX_FRAMES_SHOWN = 40; // for the on-screen log

const STATUS_LABEL: Record<WhoopStatus, string> = {
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

export default function App() {
  const bleRef = useRef<WhoopBle | null>(null);
  const framesRef = useRef<RawFrame[]>([]);

  const [status, setStatus] = useState<WhoopStatus>('idle');
  const [detail, setDetail] = useState<string>('');
  const [device, setDevice] = useState<{ id: string; name: string } | null>(null);
  const [hr, setHr] = useState<HeartRateSample | null>(null);
  const [battery, setBattery] = useState<number | null>(null);
  const [discovered, setDiscovered] = useState<DiscoveredChar[]>([]);
  const [frameCount, setFrameCount] = useState(0);
  const [recentFrames, setRecentFrames] = useState<RawFrame[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    const ble = new WhoopBle({
      onStatus: (s, d) => {
        setStatus(s);
        setDetail(d ?? '');
      },
      onDevice: (info) => setDevice(info),
      onHeartRate: (sample) => setHr(sample),
      onBattery: (pct) => setBattery(pct),
      onDiscovered: (chars) => setDiscovered(chars),
      onError: (m) => setErrorMsg(m),
      onRawFrame: (frame) => {
        const arr = framesRef.current;
        arr.push(frame);
        if (arr.length > MAX_FRAMES_KEPT) arr.splice(0, arr.length - MAX_FRAMES_KEPT);
        setFrameCount(arr.length);
        setRecentFrames(arr.slice(-MAX_FRAMES_SHOWN).reverse());
      },
    });
    bleRef.current = ble;
    return () => ble.destroy();
  }, []);

  const connect = useCallback(() => {
    setErrorMsg('');
    void bleRef.current?.start();
  }, []);

  const disconnect = useCallback(() => {
    void bleRef.current?.stop();
    setHr(null);
  }, []);

  const exportFrames = useCallback(() => {
    const lines = framesRef.current.map(
      (f) => `${f.ts}\t${f.source}\t${f.hex}`,
    );
    const header = [
      '# WHOOP raw frame capture (Phase 1)',
      `# device: ${device?.name ?? '?'} (${device?.id ?? '?'})`,
      `# frames: ${framesRef.current.length}`,
      '# columns: epoch_ms\tsource_char\thex',
      '',
    ].join('\n');
    void Share.share({ message: header + lines.join('\n') });
  }, [device]);

  const whoopChars = useMemo(
    () => discovered.filter((d) => d.characteristic.toLowerCase().startsWith('fd4b')),
    [discovered],
  );

  const isBusy = status === 'scanning' || status === 'connecting' || status === 'discovering';
  const isConnected = status === 'connected';

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>WHOOP Companion</Text>
          <Text style={styles.subtitle}>Phase 1 · Bluetooth proof</Text>

          <View style={styles.statusRow}>
            <View
              style={[
                styles.dot,
                isConnected
                  ? styles.dotOk
                  : status === 'error'
                    ? styles.dotErr
                    : styles.dotIdle,
              ]}
            />
            <Text style={styles.statusText}>{STATUS_LABEL[status]}</Text>
          </View>
          {detail ? <Text style={styles.detail}>{detail}</Text> : null}
          {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

          {/* Live heart rate */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Live heart rate</Text>
            <Text style={styles.bigNumber}>{hr ? hr.bpm : '—'}</Text>
            <Text style={styles.unit}>bpm</Text>
            <View style={styles.metaRow}>
              <Text style={styles.meta}>
                R-R: {hr && hr.rrMs.length ? hr.rrMs.join(', ') + ' ms' : '—'}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.meta}>
                Contact: {hr ? (hr.contact === null ? 'n/a' : hr.contact ? 'yes' : 'no') : '—'}
              </Text>
              <Text style={styles.meta}>
                Battery: {battery === null ? '—' : `${battery}%`}
              </Text>
            </View>
          </View>

          {/* Device + actions */}
          {device ? (
            <Text style={styles.device}>
              {device.name} · {device.id}
            </Text>
          ) : null}

          <View style={styles.buttonRow}>
            {!isConnected ? (
              <TouchableOpacity
                style={[styles.button, isBusy && styles.buttonDisabled]}
                onPress={connect}
                disabled={isBusy}
              >
                <Text style={styles.buttonText}>
                  {isBusy ? STATUS_LABEL[status] : 'Scan & connect'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.button, styles.buttonAlt]} onPress={disconnect}>
                <Text style={styles.buttonText}>Disconnect</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Raw frame capture */}
          <View style={styles.card}>
            <View style={styles.metaRow}>
              <Text style={styles.cardLabel}>Captured frames</Text>
              <Text style={styles.cardLabel}>{frameCount}</Text>
            </View>
            <Text style={styles.hint}>
              Raw WHOOP (fd4b…) frames for building the full decoder. Share these so
              they can be decoded into history, sleep and recovery.
            </Text>
            <TouchableOpacity
              style={[styles.button, styles.buttonSmall, frameCount === 0 && styles.buttonDisabled]}
              onPress={exportFrames}
              disabled={frameCount === 0}
            >
              <Text style={styles.buttonText}>Share captured frames</Text>
            </TouchableOpacity>
            <View style={styles.log}>
              {recentFrames.map((f, i) => (
                <Text key={`${f.ts}-${i}`} style={styles.logLine} numberOfLines={1}>
                  {f.source} {f.hex}
                </Text>
              ))}
            </View>
          </View>

          {/* Discovered services */}
          {discovered.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>
                Services ({discovered.length} chars · {whoopChars.length} WHOOP)
              </Text>
              {discovered.map((d, i) => (
                <Text key={`${d.characteristic}-${i}`} style={styles.svcLine} numberOfLines={1}>
                  {d.characteristic.slice(0, 8)}
                  {d.notifiable ? ' ·N' : ''}
                  {d.writable ? ' ·W' : ''}
                </Text>
              ))}
            </View>
          ) : null}

          <Text style={styles.footer}>
            All data stays on this device. Close the official WHOOP app and put the
            strap in pairing mode before connecting.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0D0D0D' },
  scroll: { padding: 20, paddingBottom: 48 },
  title: { color: '#FFFFFF', fontSize: 26, fontWeight: '700' },
  subtitle: { color: '#00E0A4', fontSize: 14, marginTop: 2, marginBottom: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  dotOk: { backgroundColor: '#00E0A4' },
  dotErr: { backgroundColor: '#FF5252' },
  dotIdle: { backgroundColor: '#777777' },
  statusText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  detail: { color: '#AAAAAA', fontSize: 13, marginBottom: 4 },
  error: { color: '#FF5252', fontSize: 13, marginBottom: 8 },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
  },
  cardLabel: { color: '#AAAAAA', fontSize: 13, fontWeight: '600' },
  bigNumber: { color: '#FFFFFF', fontSize: 64, fontWeight: '800', textAlign: 'center' },
  unit: { color: '#AAAAAA', fontSize: 14, textAlign: 'center', marginTop: -8 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  meta: { color: '#CCCCCC', fontSize: 13 },
  device: { color: '#888888', fontSize: 12, marginTop: 16, textAlign: 'center' },
  buttonRow: { marginTop: 16 },
  button: {
    backgroundColor: '#00E0A4',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonAlt: { backgroundColor: '#333333' },
  buttonSmall: { marginTop: 12, paddingVertical: 10 },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#06231C', fontSize: 16, fontWeight: '700' },
  hint: { color: '#888888', fontSize: 12, marginTop: 8, lineHeight: 17 },
  log: { marginTop: 12 },
  logLine: { color: '#00E0A4', fontSize: 10, fontFamily: 'Courier', marginBottom: 2 },
  svcLine: { color: '#CCCCCC', fontSize: 11, fontFamily: 'Courier', marginTop: 4 },
  footer: { color: '#666666', fontSize: 11, marginTop: 24, lineHeight: 16, textAlign: 'center' },
});
