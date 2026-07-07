import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { appStore } from '../state/appStore';
import { useStoreSelector } from '../state/store';
import { Card, PrimaryButton, Screen, SecondaryButton, SectionLabel } from '../ui/components';
import { colors, fonts } from '../ui/theme';
import { Nav } from '../ui/navigation';
import { startOfDayMs } from '../util/time';

function hmFromTs(ts: number | null, fallbackH: number, fallbackM: number): { h: number; m: number } {
  if (ts == null) return { h: fallbackH, m: fallbackM };
  const d = new Date(ts);
  return { h: d.getHours(), m: d.getMinutes() };
}

/** Build a timestamp for a bed/wake clock time relative to today. Evening times
 * (>= 12:00) are treated as last night; morning times as today. */
function tsFor(h: number, m: number, evening: boolean): number {
  const sod = startOfDayMs(Date.now());
  const mins = h * 60 + m;
  return evening ? sod - (1440 - mins) * 60000 : sod + mins * 60000;
}

export function EditSleepScreen({ nav }: { nav: Nav }) {
  const today = useStoreSelector(appStore, (s) => s.today);
  const bedInit = hmFromTs(today?.sleepStart ?? null, 23, 0);
  const wakeInit = hmFromTs(today?.sleepEnd ?? null, 7, 0);
  const [bed, setBed] = useState(bedInit);
  const [wake, setWake] = useState(wakeInit);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const bedEvening = bed.h >= 12;
    const startTs = tsFor(bed.h, bed.m, bedEvening);
    const endTs = tsFor(wake.h, wake.m, false);
    const durationMin = Math.round((endTs - startTs) / 60000);
    if (durationMin < 20 || durationMin > 18 * 60) {
      setError('Choose a sleep window between 20 minutes and 18 hours, with wake time after bed time.');
      return;
    }
    setError(null);
    void appStore.setManualSleep(startTs, endTs);
    setSaved(true);
    setTimeout(() => nav.back(), 700);
  };

  return (
    <Screen title="Log / Adjust Sleep" onBack={nav.back} tint={colors.sleepTeal}>
      <Card>
        <Text style={styles.intro}>
          Set when you went to bed and woke up. Pulse re-detects your sleep stages and recovery from
          the strap’s heart rate over exactly that window — useful if a night was missed or detected
          with the wrong times.
        </Text>
      </Card>

      <SectionLabel>Bed time (last night)</SectionLabel>
      <Card>
        <TimePicker value={bed} onChange={setBed} />
      </Card>

      <SectionLabel>Wake time (this morning)</SectionLabel>
      <Card>
        <TimePicker value={wake} onChange={setWake} />
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton title={saved ? 'Saved - re-detecting' : 'Save & re-detect'} onPress={save} />
      <SecondaryButton title="Clear manual override (auto-detect)" onPress={() => { void appStore.clearManualSleep(); nav.back(); }} />
    </Screen>
  );
}

function TimePicker({ value, onChange }: { value: { h: number; m: number }; onChange: (v: { h: number; m: number }) => void }) {
  const adjust = (dh: number, dm: number) => {
    let total = ((value.h * 60 + value.m + dh * 60 + dm) % 1440 + 1440) % 1440;
    onChange({ h: Math.floor(total / 60), m: total % 60 });
  };
  const label = `${String(value.h).padStart(2, '0')}:${String(value.m).padStart(2, '0')}`;
  return (
    <View style={styles.picker}>
      <Stepper label="Hour" onMinus={() => adjust(-1, 0)} onPlus={() => adjust(1, 0)} />
      <Text style={styles.time}>{label}</Text>
      <Stepper label="Min" onMinus={() => adjust(0, -15)} onPlus={() => adjust(0, 15)} />
    </View>
  );
}

function Stepper({ label, onMinus, onPlus }: { label: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={styles.stepperWrap}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperRow}>
        <Pressable onPress={onMinus} style={styles.stepBtn}><Ionicons name="remove" size={20} color={colors.text} /></Pressable>
        <Pressable onPress={onPlus} style={styles.stepBtn}><Ionicons name="add" size={20} color={colors.text} /></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, fontFamily: fonts.text },
  picker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  time: { color: colors.text, fontSize: 34, fontFamily: fonts.black },
  stepperWrap: { alignItems: 'center' },
  stepperLabel: { color: colors.textTertiary, fontSize: 11, marginBottom: 6, fontFamily: fonts.text },
  stepperRow: { flexDirection: 'row', gap: 8 },
  stepBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  error: { color: colors.danger, fontSize: 13, lineHeight: 18, marginBottom: 10, fontFamily: fonts.textSemibold },
});
