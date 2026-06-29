import { useEffect, useState } from 'react';
import { Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { Card, Empty, PrimaryButton, Screen, SecondaryButton, SectionLabel, Stat } from '../ui/components';
import { colors, radius } from '../ui/theme';
import { Nav } from '../ui/navigation';
import { getAllRawFrames, clearRawFrames } from '../db/database';
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
  const lastSyncTs = useStoreSelector(appStore, (s) => s.lastSyncTs);

  const connected = status === 'connected';
  const lastSyncText = lastSyncTs
    ? new Date(lastSyncTs).toLocaleString()
    : 'Not yet — connect to sync';

  const exportFrames = async () => {
    const frames = await getAllRawFrames();
    const header = `# WHOOP raw frames: ${frames.length}\n# epoch_ms\tsource\thex\n`;
    const body = frames.map((f) => `${f.ts}\t${f.source}\t${f.hex}`).join('\n');
    await Share.share({ message: header + body });
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

      <SectionLabel>Sync</SectionLabel>
      <Card>
        <Text style={styles.diagText}>Last sync: {lastSyncText}</Text>
        <Text style={styles.diagText}>Buffered records pulled: {bufferedRecords}</Text>
        <SecondaryButton
          title={draining ? 'Syncing…' : 'Sync now'}
          onPress={() => void appStore.runHistoryDrain()}
          disabled={!connected || draining}
        />
        <Text style={styles.hint}>
          The strap records to its own memory continuously. On every connect the app automatically drains that
          buffer, so days and nights you weren't connected still fill in. Live data is captured continuously while
          connected (including in the background).
        </Text>
      </Card>

      <SectionLabel>Profile (for strain &amp; zones)</SectionLabel>
      <ProfileEditor profile={profile} />

      <SectionLabel>Diagnostics</SectionLabel>
      <Card>
        <Text style={styles.diagText}>Captured frames: {frameCount}</Text>
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
